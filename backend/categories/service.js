/**
 * CloudStore Serverless - Servicio de Categorías (DynamoDB)
 * Tabla principal: CloudStore-Categories
 * Índice: StatusIndex (PK: categoryStatus, SK: name)
 * Relación con CloudStore-Products:
 *   - Consulta CategoryIndex (Select: COUNT) para calcular productCount de productos activos.
 *   - Verifica existencia de productos antes de DELETE /categories/{id} (Patrón P13 / C7).
 *   - Propaga cambios de nombre (categoryName) a productos de la categoría en PUT /categories/{id}.
 */

'use strict';

const { getDocClient } = require('../shared/db');
const { TABLES, INDEXES, ENTITY_STATUS } = require('../shared/constants');
const { slugify, toPublicCategory } = require('../shared/validators');

/**
 * Ejecuta un Query paginado en DynamoDB.
 */
async function queryAll(params) {
  const docClient = getDocClient();
  const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
  const items = [];
  let lastEvaluatedKey;

  do {
    const res = await docClient.send(
      new QueryCommand({
        ...params,
        ExclusiveStartKey: lastEvaluatedKey
      })
    );
    if (Array.isArray(res.Items)) {
      items.push(...res.Items);
    }
    lastEvaluatedKey = res.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

/**
 * Cuenta los productos activos asociados a una categoría usando CategoryIndex (Select: COUNT).
 * @param {string} categoryId
 * @returns {Promise<number>}
 */
async function countActiveProductsInCategory(categoryId) {
  const docClient = getDocClient();
  const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
  let total = 0;
  let lastEvaluatedKey;

  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: TABLES.PRODUCTS,
        IndexName: INDEXES.PRODUCTS.CATEGORY,
        KeyConditionExpression:
          'categoryId = :catId AND begins_with(categorySort, :activePrefix)',
        ExpressionAttributeValues: {
          ':catId': categoryId,
          ':activePrefix': `${ENTITY_STATUS.ACTIVE}#`
        },
        Select: 'COUNT',
        ExclusiveStartKey: lastEvaluatedKey
      })
    );
    total += Number(res.Count || 0);
    lastEvaluatedKey = res.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return total;
}

/**
 * Patrones C1 y C2: Lista categorías desde StatusIndex sin usar Scan.
 * - Por defecto: solo categorías activas (categoryStatus = "ACTIVE").
 * - Con includeInactive = true: activas + inactivas.
 * @param {Object} filters { includeInactive }
 */
async function listCategories(filters = {}) {
  const includeInactive =
    filters.includeInactive === true || filters.includeInactive === 'true';

  const activeItems = await queryAll({
    TableName: TABLES.CATEGORIES,
    IndexName: INDEXES.CATEGORIES.STATUS,
    KeyConditionExpression: 'categoryStatus = :status',
    ExpressionAttributeValues: {
      ':status': ENTITY_STATUS.ACTIVE
    },
    ScanIndexForward: true // Orden alfabético por Sort Key (name)
  });

  let rawCategories = activeItems;

  if (includeInactive) {
    const inactiveItems = await queryAll({
      TableName: TABLES.CATEGORIES,
      IndexName: INDEXES.CATEGORIES.STATUS,
      KeyConditionExpression: 'categoryStatus = :status',
      ExpressionAttributeValues: {
        ':status': ENTITY_STATUS.INACTIVE
      },
      ScanIndexForward: true
    });
    rawCategories = [...activeItems, ...inactiveItems];
  }

  const enriched = await Promise.all(
    rawCategories.map(async (cat) => {
      const count = await countActiveProductsInCategory(cat.id);
      return toPublicCategory(cat, count);
    })
  );

  return enriched;
}

/**
 * Patrón C3: Obtiene una categoría por su ID.
 * @param {string} id
 */
async function getCategoryById(id) {
  const docClient = getDocClient();
  const { GetCommand } = require('@aws-sdk/lib-dynamodb');

  const res = await docClient.send(
    new GetCommand({
      TableName: TABLES.CATEGORIES,
      Key: { id: String(id) }
    })
  );

  if (!res.Item) return null;
  const count = await countActiveProductsInCategory(res.Item.id);
  return toPublicCategory(res.Item, count);
}

/**
 * Patrón C4: Crea una nueva categoría con id = "cat-" + slug.
 * Garantiza unicidad de slug mediante ConditionExpression attribute_not_exists(id).
 * @param {Object} payload
 */
async function createCategory(payload = {}) {
  const name = String(payload.name || '').trim();
  if (!name) {
    return { status: 400, error: "El campo 'name' es obligatorio" };
  }

  const rawSlug = payload.slug !== undefined ? String(payload.slug).trim() : slugify(name);
  const cleanSlug = slugify(rawSlug);
  if (!cleanSlug) {
    return { status: 400, error: "El campo 'slug' es obligatorio" };
  }

  const id = cleanSlug.startsWith('cat-') ? cleanSlug : `cat-${cleanSlug}`;
  const isActive = payload.active !== undefined ? Boolean(payload.active) : true;
  const nowIso = new Date().toISOString();

  const item = {
    id,
    name,
    slug: cleanSlug,
    description: String(payload.description || '').trim(),
    icon: String(payload.icon || '').trim() || 'bi-tag',
    active: isActive,
    categoryStatus: isActive ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE,
    createdAt: nowIso
  };

  const docClient = getDocClient();
  const { PutCommand } = require('@aws-sdk/lib-dynamodb');

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLES.CATEGORIES,
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)'
      })
    );
    return { status: 201, data: toPublicCategory(item, 0) };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { status: 409, error: 'Ya existe una categoría con ese slug' };
    }
    throw err;
  }
}

/**
 * Patrones C5 y C6: Actualiza o desactiva una categoría existente.
 * El atributo slug es inmutable porque forma parte de la clave primaria id.
 * Si cambia el nombre, propaga categoryName a los productos de la categoría.
 * @param {string} id
 * @param {Object} patch
 */
async function updateCategory(id, patch = {}) {
  const docClient = getDocClient();
  const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

  const existingRes = await docClient.send(
    new GetCommand({
      TableName: TABLES.CATEGORIES,
      Key: { id: String(id) },
      ConsistentRead: true
    })
  );

  if (!existingRes.Item) {
    return { status: 404, error: 'Categoría no encontrada' };
  }

  const existing = existingRes.Item;
  const nowIso = new Date().toISOString();
  const nextActive =
    patch.active !== undefined ? Boolean(patch.active) : existing.active !== false;
  const nextStatus = nextActive ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE;

  const setExpressions = [
    '#active = :active',
    'categoryStatus = :categoryStatus',
    'updatedAt = :updatedAt'
  ];
  const names = { '#active': 'active' };
  const values = {
    ':active': nextActive,
    ':categoryStatus': nextStatus,
    ':updatedAt': nowIso
  };

  let newName = null;
  if (patch.name !== undefined) {
    newName = String(patch.name).trim();
    if (!newName) {
      return { status: 400, error: "El campo 'name' no puede estar vacío" };
    }
    names['#name'] = 'name';
    values[':name'] = newName;
    setExpressions.push('#name = :name');
  }

  if (patch.description !== undefined) {
    values[':description'] = String(patch.description).trim();
    setExpressions.push('description = :description');
  }

  if (patch.icon !== undefined) {
    values[':icon'] = String(patch.icon).trim() || 'bi-tag';
    setExpressions.push('icon = :icon');
  }

  const res = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.CATEGORIES,
      Key: { id: String(id) },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    })
  );

  // Propagar cambio de categoryName a los productos asociados (DYNAMODB-DESIGN.md §6.12)
  if (newName && newName !== existing.name) {
    const productsInCat = await queryAll({
      TableName: TABLES.PRODUCTS,
      IndexName: INDEXES.PRODUCTS.CATEGORY,
      KeyConditionExpression: 'categoryId = :catId',
      ExpressionAttributeValues: { ':catId': String(id) },
      ProjectionExpression: 'id'
    });

    await Promise.all(
      productsInCat.map(prod =>
        docClient.send(
          new UpdateCommand({
            TableName: TABLES.PRODUCTS,
            Key: { id: prod.id },
            UpdateExpression: 'SET categoryName = :catName, updatedAt = :now',
            ExpressionAttributeValues: {
              ':catName': newName,
              ':now': nowIso
            }
          })
        )
      )
    );
  }

  const count = await countActiveProductsInCategory(String(id));
  return { status: 200, data: toPublicCategory(res.Attributes, count) };
}

/**
 * Patrón C7 + P13: Elimina una categoría solo si no tiene productos asociados.
 * @param {string} id
 */
async function deleteCategory(id) {
  const docClient = getDocClient();
  const { QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

  // Patrón P13: comprobar si existe al menos 1 producto en CategoryIndex (Limit: 1)
  const prodCheck = await docClient.send(
    new QueryCommand({
      TableName: TABLES.PRODUCTS,
      IndexName: INDEXES.PRODUCTS.CATEGORY,
      KeyConditionExpression: 'categoryId = :catId',
      ExpressionAttributeValues: {
        ':catId': String(id)
      },
      Limit: 1,
      ProjectionExpression: 'id'
    })
  );

  if (Array.isArray(prodCheck.Items) && prodCheck.Items.length > 0) {
    return {
      status: 409,
      error:
        'No se puede eliminar la categoría porque tiene productos asignados. Reasigna o elimina los productos primero.'
    };
  }

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.CATEGORIES,
        Key: { id: String(id) },
        ConditionExpression: 'attribute_exists(id)'
      })
    );
    return { status: 200 };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { status: 404, error: 'Categoría no encontrada' };
    }
    throw err;
  }
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
