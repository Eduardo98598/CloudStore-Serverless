/**
 * CloudStore Serverless - Servicio de Productos (DynamoDB)
 * Tabla: CloudStore-Products
 * Índices:
 *   - StatusIndex (PK: productStatus, SK: createdAt)
 *   - CategoryIndex (PK: categoryId, SK: categorySort)
 * Ninguna operación utiliza Scan.
 */

'use strict';

const crypto = require('crypto');
const { getDocClient } = require('../shared/db');
const { TABLES, INDEXES, ENTITY_STATUS } = require('../shared/constants');
const {
  roundMxn,
  slugify,
  deriveProductGsiAttributes,
  toPublicProduct
} = require('../shared/validators');

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
 * Consulta productos usando StatusIndex o CategoryIndex según los filtros.
 * @param {Object} filters { categoryId, search, sort, onlyFeatured, includeInactive, status }
 */
async function listProducts(filters = {}) {
  const includeInactive =
    filters.includeInactive === true || filters.includeInactive === 'true';
  const onlyFeatured =
    filters.onlyFeatured === true || filters.onlyFeatured === 'true';
  const categoryId =
    filters.categoryId && filters.categoryId !== 'all'
      ? String(filters.categoryId).trim()
      : null;

  let rawItems = [];

  if (categoryId) {
    // Patrón P3 / P5: Query por CategoryIndex
    if (!includeInactive) {
      rawItems = await queryAll({
        TableName: TABLES.PRODUCTS,
        IndexName: INDEXES.PRODUCTS.CATEGORY,
        KeyConditionExpression:
          'categoryId = :catId AND begins_with(categorySort, :activePrefix)',
        ExpressionAttributeValues: {
          ':catId': categoryId,
          ':activePrefix': `${ENTITY_STATUS.ACTIVE}#`
        },
        ScanIndexForward: false
      });
    } else {
      rawItems = await queryAll({
        TableName: TABLES.PRODUCTS,
        IndexName: INDEXES.PRODUCTS.CATEGORY,
        KeyConditionExpression: 'categoryId = :catId',
        ExpressionAttributeValues: {
          ':catId': categoryId
        },
        ScanIndexForward: false
      });
    }
  } else {
    // Patrón P1 / P4: Query por StatusIndex
    const activeItems = await queryAll({
      TableName: TABLES.PRODUCTS,
      IndexName: INDEXES.PRODUCTS.STATUS,
      KeyConditionExpression: 'productStatus = :status',
      ExpressionAttributeValues: {
        ':status': ENTITY_STATUS.ACTIVE
      },
      ScanIndexForward: false
    });

    if (!includeInactive) {
      rawItems = activeItems;
    } else {
      const inactiveItems = await queryAll({
        TableName: TABLES.PRODUCTS,
        IndexName: INDEXES.PRODUCTS.STATUS,
        KeyConditionExpression: 'productStatus = :status',
        ExpressionAttributeValues: {
          ':status': ENTITY_STATUS.INACTIVE
        },
        ScanIndexForward: false
      });
      rawItems = [...activeItems, ...inactiveItems];
    }
  }

  let products = rawItems.map(toPublicProduct);

  // Filtro opcional de estado en vista admin (active / inactive)
  if (includeInactive && filters.status && filters.status !== 'all') {
    const wantActive = filters.status === 'active';
    products = products.filter(p => Boolean(p.active) === wantActive);
  }

  // Filtro de destacados (P2)
  if (onlyFeatured) {
    products = products.filter(p => p.featured === true);
  }

  // Búsqueda por texto en memoria (nombre, descripción, categoría o ID)
  if (filters.search && String(filters.search).trim()) {
    const q = String(filters.search).toLowerCase().trim();
    products = products.filter(
      p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
        (includeInactive && p.id && p.id.toLowerCase().includes(q))
    );
  }

  // Ordenamiento
  const sort = filters.sort || 'newest';
  switch (sort) {
    case 'price-asc':
      products.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      products.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      products.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      break;
    case 'name-desc':
      products.sort((a, b) => String(b.name).localeCompare(String(a.name)));
      break;
    case 'newest':
    default:
      products.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      break;
  }

  return products;
}

/**
 * Patrón P6: Obtiene un producto por su ID primario.
 * @param {string} id
 */
async function getProductById(id) {
  const docClient = getDocClient();
  const { GetCommand } = require('@aws-sdk/lib-dynamodb');

  const res = await docClient.send(
    new GetCommand({
      TableName: TABLES.PRODUCTS,
      Key: { id: String(id) }
    })
  );

  return res.Item ? toPublicProduct(res.Item) : null;
}

/**
 * Patrón P7: Crea un nuevo producto en CloudStore-Products.
 * @param {Object} payload
 */
async function createProduct(payload = {}) {
  const name = String(payload.name || '').trim();
  if (!name) {
    return { status: 400, error: "El campo 'name' es obligatorio" };
  }

  const price = Number(payload.price);
  if (Number.isNaN(price) || price <= 0) {
    return { status: 400, error: "El campo 'price' debe ser un número positivo" };
  }

  const categoryId = String(payload.categoryId || '').trim();
  if (!categoryId) {
    return { status: 400, error: "El campo 'categoryId' es obligatorio" };
  }

  const description = String(payload.description || '').trim();
  if (!description) {
    return { status: 400, error: "El campo 'description' es obligatorio" };
  }

  const image = String(payload.image || '').trim();
  if (!image) {
    return { status: 400, error: "El campo 'image' es obligatorio" };
  }

  const stock =
    payload.stock !== undefined ? parseInt(payload.stock, 10) : 0;
  if (Number.isNaN(stock) || stock < 0) {
    return { status: 400, error: "El campo 'stock' debe ser un entero mayor o igual a 0" };
  }

  const nowIso = new Date().toISOString();
  const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
  // Slug generado desde name si no se envía; no exige unicidad (Decisión #1 aprobada)
  const slug =
    (payload.slug && String(payload.slug).trim()) ||
    slugify(name) ||
    id;

  const gsiAttrs = deriveProductGsiAttributes(payload.active, nowIso);

  const item = {
    id,
    name,
    slug,
    categoryId,
    categoryName: String(payload.categoryName || '').trim(),
    description,
    features: Array.isArray(payload.features)
      ? payload.features.map(f => String(f).trim()).filter(Boolean)
      : [],
    price: roundMxn(price),
    stock,
    image,
    featured: Boolean(payload.featured),
    active: gsiAttrs.active,
    productStatus: gsiAttrs.productStatus,
    categorySort: gsiAttrs.categorySort,
    rating: 5.0,
    reviewsCount: 0,
    createdAt: nowIso
  };

  if (payload.comparePrice !== undefined && payload.comparePrice !== null && payload.comparePrice !== '') {
    const comparePrice = Number(payload.comparePrice);
    if (!Number.isNaN(comparePrice) && comparePrice > 0) {
      item.comparePrice = roundMxn(comparePrice);
    }
  }

  const docClient = getDocClient();
  const { PutCommand } = require('@aws-sdk/lib-dynamodb');

  await docClient.send(
    new PutCommand({
      TableName: TABLES.PRODUCTS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id)'
    })
  );

  return { status: 201, data: toPublicProduct(item) };
}

/**
 * Patrón P8 / P9: Actualiza o desactiva un producto existente.
 * Mantiene sincronizados productStatus y categorySort.
 * @param {string} id
 * @param {Object} patch
 */
async function updateProduct(id, patch = {}) {
  const docClient = getDocClient();
  const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

  const existingRes = await docClient.send(
    new GetCommand({
      TableName: TABLES.PRODUCTS,
      Key: { id: String(id) },
      ConsistentRead: true
    })
  );

  if (!existingRes.Item) {
    return { status: 404, error: 'Producto no encontrado para actualizar' };
  }

  const existing = existingRes.Item;
  const nowIso = new Date().toISOString();

  if (patch.price !== undefined) {
    const parsedPrice = Number(patch.price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return { status: 400, error: 'El precio debe ser un número positivo' };
    }
  }

  if (patch.stock !== undefined) {
    const parsedStock = parseInt(patch.stock, 10);
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      return { status: 400, error: 'El stock debe ser un entero mayor o igual a 0' };
    }
  }

  const nextActive =
    patch.active !== undefined ? Boolean(patch.active) : existing.active !== false;
  const gsiAttrs = deriveProductGsiAttributes(nextActive, existing.createdAt || nowIso);

  const setExpressions = [
    '#active = :active',
    'productStatus = :productStatus',
    'categorySort = :categorySort',
    'updatedAt = :updatedAt'
  ];
  const removeExpressions = [];
  const names = { '#active': 'active' };
  const values = {
    ':active': gsiAttrs.active,
    ':productStatus': gsiAttrs.productStatus,
    ':categorySort': gsiAttrs.categorySort,
    ':updatedAt': nowIso
  };

  if (patch.name !== undefined) {
    names['#name'] = 'name';
    values[':name'] = String(patch.name).trim();
    setExpressions.push('#name = :name');
  }
  if (patch.slug !== undefined) {
    values[':slug'] = String(patch.slug).trim() || existing.slug;
    setExpressions.push('slug = :slug');
  }
  if (patch.categoryId !== undefined) {
    values[':categoryId'] = String(patch.categoryId).trim();
    setExpressions.push('categoryId = :categoryId');
  }
  if (patch.categoryName !== undefined) {
    values[':categoryName'] = String(patch.categoryName).trim();
    setExpressions.push('categoryName = :categoryName');
  }
  if (patch.description !== undefined) {
    values[':description'] = String(patch.description).trim();
    setExpressions.push('description = :description');
  }
  if (patch.features !== undefined && Array.isArray(patch.features)) {
    values[':features'] = patch.features.map(f => String(f).trim()).filter(Boolean);
    setExpressions.push('features = :features');
  }
  if (patch.price !== undefined) {
    values[':price'] = roundMxn(patch.price);
    setExpressions.push('price = :price');
  }
  if (patch.comparePrice !== undefined) {
    if (patch.comparePrice === null || patch.comparePrice === '') {
      removeExpressions.push('comparePrice');
    } else {
      values[':comparePrice'] = roundMxn(patch.comparePrice);
      setExpressions.push('comparePrice = :comparePrice');
    }
  }
  if (patch.stock !== undefined) {
    values[':stock'] = parseInt(patch.stock, 10);
    setExpressions.push('stock = :stock');
  }
  if (patch.image !== undefined) {
    values[':image'] = String(patch.image).trim();
    setExpressions.push('image = :image');
  }
  if (patch.featured !== undefined) {
    values[':featured'] = Boolean(patch.featured);
    setExpressions.push('featured = :featured');
  }

  let updateExpr = `SET ${setExpressions.join(', ')}`;
  if (removeExpressions.length > 0) {
    updateExpr += ` REMOVE ${removeExpressions.join(', ')}`;
  }

  const res = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.PRODUCTS,
      Key: { id: String(id) },
      UpdateExpression: updateExpr,
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    })
  );

  return { status: 200, data: toPublicProduct(res.Attributes) };
}

/**
 * Patrón P10: Elimina un producto por su ID.
 * @param {string} id
 */
async function deleteProduct(id) {
  const docClient = getDocClient();
  const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.PRODUCTS,
        Key: { id: String(id) },
        ConditionExpression: 'attribute_exists(id)'
      })
    );
    return { status: 200 };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { status: 404, error: 'Producto no encontrado para eliminar' };
    }
    throw err;
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
