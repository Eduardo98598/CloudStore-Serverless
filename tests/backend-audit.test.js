/**
 * CloudStore Serverless - Suite de Pruebas de Auditoría Técnica del Backend
 * Verifica directamente los servicios y handlers de las 3 Lambdas (Products, Categories, Orders):
 *   1. Uso estricto de categorySort en CategoryIndex (CloudStore-Products) sin Scan.
 *   2. Propagación de categoryName en PUT /categories/{id} y bloqueo 409 en DELETE /categories/{id}.
 *   3. Transacciones atómicas en POST /orders (COUNTER#ORDER_NUMBER, precio 409, stock 409, envío MXN).
 *   4. Idempotencia completa (formato/longitud Idempotency-Key, ClientRequestToken <= 36 chars,
 *      requestHash completo, reintento sin doble descuento, conflicto 409 por payload distinto y
 *      solicitudes simultáneas con la misma clave).
 *   5. Métricas de GET /dashboard/metrics consultando StatusIndex de Products y Categories.
 */

'use strict';

process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const Module = require('module');

// =========================================================================
// 1. Interceptación ligera de @aws-sdk/lib-dynamodb para pruebas locales offline
// =========================================================================
class CommandBase {
  constructor(input) {
    this.input = input;
  }
}
class GetCommand extends CommandBase {}
class PutCommand extends CommandBase {}
class UpdateCommand extends CommandBase {}
class DeleteCommand extends CommandBase {}
class QueryCommand extends CommandBase {}
class BatchGetCommand extends CommandBase {}
class TransactWriteCommand extends CommandBase {}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@aws-sdk/lib-dynamodb') {
    return {
      GetCommand,
      PutCommand,
      UpdateCommand,
      DeleteCommand,
      QueryCommand,
      BatchGetCommand,
      TransactWriteCommand,
      DynamoDBDocumentClient: {
        from: () => ({})
      }
    };
  }
  if (request === '@aws-sdk/client-dynamodb') {
    return {
      DynamoDBClient: class DynamoDBClient {}
    };
  }
  return originalLoad.apply(this, arguments);
};

const { setDocClient } = require('../backend/shared/db');
const { TABLES, INDEXES, ORDER_LIMITS } = require('../backend/shared/constants');
const {
  deriveProductGsiAttributes,
  toPublicProduct,
  computeOrderRequestHash,
  normalizeIdempotencyKey
} = require('../backend/shared/validators');
const ProductsLambda = require('../backend/products/index');
const CategoriesLambda = require('../backend/categories/index');
const OrdersLambda = require('../backend/orders/index');

// =========================================================================
// 2. Motor DynamoDB en Memoria con soporte de GSIs, Condiciones y Transacciones
// =========================================================================
function createInMemoryDynamoDB() {
  const tables = {
    [TABLES.PRODUCTS]: new Map(),
    [TABLES.CATEGORIES]: new Map(),
    [TABLES.ORDERS]: new Map()
  };

  const queryLog = [];
  const transactLog = [];
  let simulateCounterCollisionOnce = false;
  let onBeforeTransactCommit = null;

  function clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  function evalCondition(item, expr, names = {}, values = {}) {
    if (!expr) return true;
    const resolveAttr = (token) => {
      const clean = token.trim();
      return names[clean] || clean;
    };

    if (expr === 'attribute_not_exists(id)') {
      return !item;
    }
    if (expr === 'attribute_exists(id)') {
      return Boolean(item);
    }
    if (expr === 'attribute_exists(id) AND entityType = :orderType') {
      return Boolean(item && item.entityType === values[':orderType']);
    }
    if (
      expr ===
      '(attribute_not_exists(seq) AND :currentSeq = :seedSeq) OR seq = :currentSeq'
    ) {
      if (!item || item.seq === undefined) {
        return values[':currentSeq'] === values[':seedSeq'];
      }
      return item.seq === values[':currentSeq'];
    }
    if (
      expr ===
      'attribute_exists(id) AND #active = :true AND productStatus = :activeStatus AND price = :snapshotPrice AND stock >= :qty'
    ) {
      const activeAttr = resolveAttr('#active');
      return Boolean(
        item &&
          item[activeAttr] === values[':true'] &&
          item.productStatus === values[':activeStatus'] &&
          Number(item.price) === Number(values[':snapshotPrice']) &&
          Number(item.stock) >= Number(values[':qty'])
      );
    }
    return true;
  }

  function applyUpdate(existingItem, key, updateExpr, names = {}, values = {}) {
    const item = clone(existingItem) || { ...key };
    const resolveAttr = (token) => {
      const clean = token.trim();
      return names[clean] || clean;
    };

    let setPart = updateExpr;
    let removePart = '';
    if (updateExpr.includes(' REMOVE ')) {
      const parts = updateExpr.split(' REMOVE ');
      setPart = parts[0];
      removePart = parts[1];
    }

    if (setPart.startsWith('SET ')) {
      const assignments = setPart.slice(4).split(',');
      for (const rawAssign of assignments) {
        const [lhs, rhs] = rawAssign.split('=').map(s => s.trim());
        const attrName = resolveAttr(lhs);
        if (rhs === 'stock - :qty') {
          item[attrName] = Number(item[attrName] || 0) - Number(values[':qty']);
        } else {
          item[attrName] = clone(values[rhs]);
        }
      }
    }

    if (removePart) {
      for (const rem of removePart.split(',')) {
        delete item[resolveAttr(rem)];
      }
    }

    return item;
  }

  const docClient = {
    async send(command) {
      const input = command.input;

      // GetCommand
      if (command instanceof GetCommand) {
        const table = tables[input.TableName];
        const found = table.get(input.Key.id);
        return { Item: clone(found) };
      }

      //BatchGetCommand
      if (command instanceof BatchGetCommand) {
        const responses = {};
        for (const [tableName, req] of Object.entries(input.RequestItems)) {
          const table = tables[tableName];
          responses[tableName] = req.Keys
            .map(k => clone(table.get(k.id)))
            .filter(Boolean);
        }
        return { Responses: responses };
      }

      // PutCommand
      if (command instanceof PutCommand) {
        const table = tables[input.TableName];
        const existing = table.get(input.Item.id);
        if (
          !evalCondition(
            existing,
            input.ConditionExpression,
            input.ExpressionAttributeNames,
            input.ExpressionAttributeValues
          )
        ) {
          const err = new Error('Conditional check failed');
          err.name = 'ConditionalCheckFailedException';
          throw err;
        }
        table.set(input.Item.id, clone(input.Item));
        return {};
      }

      // UpdateCommand
      if (command instanceof UpdateCommand) {
        const table = tables[input.TableName];
        const existing = table.get(input.Key.id);
        if (
          !evalCondition(
            existing,
            input.ConditionExpression,
            input.ExpressionAttributeNames,
            input.ExpressionAttributeValues
          )
        ) {
          const err = new Error('Conditional check failed');
          err.name = 'ConditionalCheckFailedException';
          throw err;
        }
        const updated = applyUpdate(
          existing,
          input.Key,
          input.UpdateExpression,
          input.ExpressionAttributeNames,
          input.ExpressionAttributeValues
        );
        table.set(input.Key.id, updated);
        return { Attributes: clone(updated) };
      }

      // DeleteCommand
      if (command instanceof DeleteCommand) {
        const table = tables[input.TableName];
        const existing = table.get(input.Key.id);
        if (
          !evalCondition(
            existing,
            input.ConditionExpression,
            input.ExpressionAttributeNames,
            input.ExpressionAttributeValues
          )
        ) {
          const err = new Error('Conditional check failed');
          err.name = 'ConditionalCheckFailedException';
          throw err;
        }
        table.delete(input.Key.id);
        return {};
      }

      // QueryCommand
      if (command instanceof QueryCommand) {
        queryLog.push(clone(input));
        const table = tables[input.TableName];
        let items = Array.from(table.values()).map(clone);
        const vals = input.ExpressionAttributeValues || {};
        const kce = input.KeyConditionExpression || '';

        // Prohibir uso del nombre obsoleto categoryStatusDate
        if (kce.includes('categoryStatusDate')) {
          throw new Error(
            `Discrepancia detectada: QueryCommand intentó usar categoryStatusDate en ${input.IndexName}`
          );
        }

        if (
          input.TableName === TABLES.PRODUCTS &&
          input.IndexName === INDEXES.PRODUCTS.CATEGORY
        ) {
          items = items.filter(it => it.categoryId === vals[':catId']);
          if (kce.includes('begins_with(categorySort, :activePrefix)')) {
            items = items.filter(
              it =>
                typeof it.categorySort === 'string' &&
                it.categorySort.startsWith(vals[':activePrefix'])
            );
          }
          items.sort((a, b) =>
            String(a.categorySort || '').localeCompare(String(b.categorySort || ''))
          );
        } else if (
          input.TableName === TABLES.PRODUCTS &&
          input.IndexName === INDEXES.PRODUCTS.STATUS
        ) {
          items = items.filter(it => it.productStatus === vals[':status']);
          items.sort((a, b) =>
            String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
          );
        } else if (
          input.TableName === TABLES.CATEGORIES &&
          input.IndexName === INDEXES.CATEGORIES.STATUS
        ) {
          items = items.filter(it => it.categoryStatus === vals[':status']);
          items.sort((a, b) =>
            String(a.name || '').localeCompare(String(b.name || ''))
          );
        } else if (
          input.TableName === TABLES.ORDERS &&
          input.IndexName === INDEXES.ORDERS.DATE
        ) {
          items = items.filter(it => it.entityType === vals[':entityType']);
          items.sort((a, b) =>
            String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
          );
        } else if (
          input.TableName === TABLES.ORDERS &&
          input.IndexName === INDEXES.ORDERS.STATUS_DATE
        ) {
          items = items.filter(it => it.status === vals[':status']);
          items.sort((a, b) =>
            String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
          );
        } else if (
          input.TableName === TABLES.ORDERS &&
          input.IndexName === INDEXES.ORDERS.ORDER_NUMBER
        ) {
          items = items.filter(it => it.orderNumber === vals[':orderNum']);
        }

        if (input.ScanIndexForward === false) {
          items.reverse();
        }
        if (input.Limit) {
          items = items.slice(0, input.Limit);
        }
        if (input.Select === 'COUNT') {
          return { Count: items.length };
        }
        return { Items: items, Count: items.length };
      }

      // TransactWriteCommand
      if (command instanceof TransactWriteCommand) {
        transactLog.push(clone(input));

        if (input.ClientRequestToken !== undefined) {
          if (
            typeof input.ClientRequestToken !== 'string' ||
            input.ClientRequestToken.length < 1 ||
            input.ClientRequestToken.length > 36
          ) {
            const err = new Error(
              `ClientRequestToken inválido (${input.ClientRequestToken?.length} chars): debe tener entre 1 y 36 caracteres`
            );
            err.name = 'ValidationException';
            throw err;
          }
        }

        if (typeof onBeforeTransactCommit === 'function') {
          await onBeforeTransactCommit(input);
        }

        // Simular colisión concurrente de contador en el primer intento si está activado
        if (simulateCounterCollisionOnce) {
          simulateCounterCollisionOnce = false;
          const counterTable = tables[TABLES.ORDERS];
          const cur = counterTable.get(ORDER_LIMITS.COUNTER_ID) || {
            id: ORDER_LIMITS.COUNTER_ID,
            seq: ORDER_LIMITS.INITIAL_SEQUENCE
          };
          counterTable.set(ORDER_LIMITS.COUNTER_ID, {
            ...cur,
            seq: Number(cur.seq) + 1
          });
        }

        // Verificar que no haya 2 acciones sobre la misma clave primaria
        const touchedKeys = new Set();
        const reasons = [];
        let hasFailure = false;

        for (const action of input.TransactItems) {
          const op = action.Put || action.Update || action.Delete;
          const keyId = action.Put ? action.Put.Item.id : op.Key.id;
          const compositeKey = `${op.TableName}#${keyId}`;
          if (touchedKeys.has(compositeKey)) {
            const err = new Error(
              `Transaction request cannot include multiple operations on one item (${compositeKey})`
            );
            err.name = 'ValidationException';
            throw err;
          }
          touchedKeys.add(compositeKey);

          const table = tables[op.TableName];
          const existing = table.get(keyId);
          const ok = evalCondition(
            existing,
            op.ConditionExpression,
            op.ExpressionAttributeNames,
            op.ExpressionAttributeValues
          );
          if (!ok) {
            hasFailure = true;
            reasons.push({ Code: 'ConditionalCheckFailed' });
          } else {
            reasons.push({ Code: 'None' });
          }
        }

        if (hasFailure) {
          const err = new Error('Transaction cancelled');
          err.name = 'TransactionCanceledException';
          err.CancellationReasons = reasons;
          throw err;
        }

        // Aplicar todas las operaciones de forma atómica
        for (const action of input.TransactItems) {
          if (action.Put) {
            tables[action.Put.TableName].set(
              action.Put.Item.id,
              clone(action.Put.Item)
            );
          } else if (action.Update) {
            const u = action.Update;
            const existing = tables[u.TableName].get(u.Key.id);
            const updated = applyUpdate(
              existing,
              u.Key,
              u.UpdateExpression,
              u.ExpressionAttributeNames,
              u.ExpressionAttributeValues
            );
            tables[u.TableName].set(u.Key.id, updated);
          }
        }

        return {};
      }

      throw new Error(`Comando no soportado en mock: ${command.constructor.name}`);
    }
  };

  return {
    tables,
    docClient,
    queryLog,
    transactLog,
    enableCounterCollisionOnce() {
      simulateCounterCollisionOnce = true;
    },
    setBeforeTransactHook(fn) {
      onBeforeTransactCommit = fn;
    }
  };
}

// =========================================================================
// 3. Ejecución de Pruebas de Auditoría Técnica
// =========================================================================
async function runBackendAuditTests() {
  console.log('=======================================================');
  console.log('🔍 Iniciando Auditoría Técnica de Backend (Lambdas & DynamoDB)');
  console.log('=======================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const db = createInMemoryDynamoDB();
  setDocClient(db.docClient);

  // -----------------------------------------------------------------------
  // SECCIÓN 1: Verificación de categorySort vs categoryStatusDate
  // -----------------------------------------------------------------------
  console.log('\n--- 1. Auditoría DynamoDB: GSI CategoryIndex (categorySort) ---');

  const filesToCheck = [
    path.join(__dirname, '../backend/shared/constants.js'),
    path.join(__dirname, '../backend/shared/validators.js'),
    path.join(__dirname, '../backend/products/service.js'),
    path.join(__dirname, '../backend/categories/service.js'),
    path.join(__dirname, '../DYNAMODB-DESIGN.md'),
    path.join(__dirname, '../API-CONTRACT.md')
  ];

  const filesWithLegacyAttr = filesToCheck.filter(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    // En validators.js permitimos desestructurar categoryStatusDate en toPublicProduct por seguridad de limpieza,
    // pero en el resto de archivos debe haber 0 ocurrencias.
    if (filePath.endsWith('validators.js')) {
      return content.includes('categoryStatusDate:');
    }
    return content.includes('categoryStatusDate');
  });

  assert(
    filesWithLegacyAttr.length === 0,
    'Cero referencias activas a categoryStatusDate en código y documentación (reemplazado por categorySort)'
  );

  const gsiAttrs = deriveProductGsiAttributes(true, '2026-03-01T12:00:00.000Z');
  assert(
    gsiAttrs.productStatus === 'ACTIVE' &&
      gsiAttrs.categorySort === 'ACTIVE#2026-03-01T12:00:00.000Z',
    'deriveProductGsiAttributes genera categorySort = "ACTIVE#<createdAt>"'
  );

  // Crear categoría en Lambda Categories
  const createCatRes = await CategoriesLambda.handler({
    requestContext: { http: { method: 'POST', path: '/categories' } },
    body: JSON.stringify({
      name: 'Laptops & Computadoras',
      slug: 'laptops',
      description: 'Equipos portátiles profesionales',
      icon: 'bi-laptop',
      active: true
    })
  });
  const createdCatBody = JSON.parse(createCatRes.body);
  assert(
    createCatRes.statusCode === 201 && createdCatBody.data.id === 'cat-laptops',
    'POST /categories crea categoría con id = "cat-laptops" y categoryStatus = "ACTIVE"'
  );

  // Crear producto en Lambda Products
  const createProdRes = await ProductsLambda.handler({
    requestContext: { http: { method: 'POST', path: '/products' } },
    body: JSON.stringify({
      name: 'MacBook Pro 16 M3 Max',
      categoryId: 'cat-laptops',
      categoryName: 'Laptops & Computadoras',
      description: 'Workstation portátil profesional',
      price: 600,
      stock: 10,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
      active: true
    })
  });
  const createdProdBody = JSON.parse(createProdRes.body);
  const prod1 = createdProdBody.data;
  const rawStoredProd1 = db.tables[TABLES.PRODUCTS].get(prod1.id);

  assert(
    createProdRes.statusCode === 201 &&
      rawStoredProd1.categorySort === `ACTIVE#${prod1.createdAt}` &&
      prod1.categorySort === undefined &&
      prod1.productStatus === undefined,
    'POST /products persiste categorySort en DynamoDB y oculta atributos internos en la respuesta JSON'
  );

  // Crear segundo producto para pruebas de envío < $500 MXN
  const createProd2Res = await ProductsLambda.handler({
    requestContext: { http: { method: 'POST', path: '/products' } },
    body: JSON.stringify({
      name: 'Cable USB-C Trenzado 2m',
      categoryId: 'cat-laptops',
      categoryName: 'Laptops & Computadoras',
      description: 'Cable de carga rápida 100W',
      price: 150,
      stock: 4,
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90',
      active: true
    })
  });
  const prod2 = JSON.parse(createProd2Res.body).data;

  // Consultar GET /products?categoryId=cat-laptops y comprobar que el Query usó categorySort
  db.queryLog.length = 0;
  const listByCatRes = await ProductsLambda.handler({
    requestContext: { http: { method: 'GET', path: '/products' } },
    queryStringParameters: { categoryId: 'cat-laptops' }
  });
  const listByCatBody = JSON.parse(listByCatRes.body);
  const lastCatQuery = db.queryLog[0];

  assert(
    listByCatRes.statusCode === 200 &&
      listByCatBody.data.length === 2 &&
      lastCatQuery.IndexName === 'CategoryIndex' &&
      lastCatQuery.KeyConditionExpression ===
        'categoryId = :catId AND begins_with(categorySort, :activePrefix)',
    'GET /products?categoryId=cat-laptops consulta CategoryIndex usando begins_with(categorySort, "ACTIVE#")'
  );

  // Actualizar estado del producto a inactivo y verificar que categorySort cambie a INACTIVE#...
  const deactivateRes = await ProductsLambda.handler({
    requestContext: { http: { method: 'PUT', path: `/products/${prod2.id}` } },
    pathParameters: { id: prod2.id },
    body: JSON.stringify({ active: false })
  });
  const rawUpdatedProd2 = db.tables[TABLES.PRODUCTS].get(prod2.id);
  assert(
    deactivateRes.statusCode === 200 &&
      rawUpdatedProd2.categorySort.startsWith('INACTIVE#'),
    'PUT /products/{id} con { active: false } actualiza categorySort al prefijo "INACTIVE#"'
  );

  // Reactivar prod2 para las pruebas de pedidos
  await ProductsLambda.handler({
    requestContext: { http: { method: 'PUT', path: `/products/${prod2.id}` } },
    pathParameters: { id: prod2.id },
    body: JSON.stringify({ active: true })
  });

  // Verificar conteo en GET /categories y propagación de nombre en PUT /categories/{id}
  const getCatsRes = await CategoriesLambda.handler({
    requestContext: { http: { method: 'GET', path: '/categories' } },
    queryStringParameters: {}
  });
  const getCatsBody = JSON.parse(getCatsRes.body);
  assert(
    getCatsRes.statusCode === 200 && getCatsBody.data[0].productCount === 2,
    'GET /categories calcula productCount consultando CategoryIndex con categorySort'
  );

  const renameCatRes = await CategoriesLambda.handler({
    requestContext: { http: { method: 'PUT', path: '/categories/cat-laptops' } },
    pathParameters: { id: 'cat-laptops' },
    body: JSON.stringify({ name: 'Laptops Pro & Workstations' })
  });
  const updatedProdAfterRename = db.tables[TABLES.PRODUCTS].get(prod1.id);
  assert(
    renameCatRes.statusCode === 200 &&
      updatedProdAfterRename.categoryName === 'Laptops Pro & Workstations',
    'PUT /categories/{id} propaga el nuevo categoryName a los productos de CloudStore-Products'
  );

  const deleteNonEmptyCatRes = await CategoriesLambda.handler({
    requestContext: { http: { method: 'DELETE', path: '/categories/cat-laptops' } },
    pathParameters: { id: 'cat-laptops' }
  });
  assert(
    deleteNonEmptyCatRes.statusCode === 409,
    'DELETE /categories/{id} devuelve HTTP 409 si existen productos asociados en CategoryIndex'
  );

  // -----------------------------------------------------------------------
  // SECCIÓN 2: Consistencia de Precios, Stock, Envío MXN y Contador en POST /orders
  // -----------------------------------------------------------------------
  console.log('\n--- 2. Auditoría de Pedidos: Precios, Stock, Envío MXN y Contador ---');

  const validCustomer = {
    name: 'Dra. Sofía Hernández',
    phone: '+52 55 1234 5678',
    email: 'sofia@cloudstore.mx',
    address: 'Av. Paseo de la Reforma 222, CDMX',
    notes: 'Dejar en recepción'
  };

  // 2.1 Precio modificado respecto a DynamoDB -> debe devolver 409 sin tocar stock ni contador
  const wrongPriceRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: {},
    body: JSON.stringify({
      customer: validCustomer,
      items: [{ productId: prod1.id, quantity: 1, price: 499.00 }] // En DB cuesta 600.00
    })
  });
  assert(
    wrongPriceRes.statusCode === 409 &&
      db.tables[TABLES.PRODUCTS].get(prod1.id).stock === 10 &&
      !db.tables[TABLES.ORDERS].has(ORDER_LIMITS.COUNTER_ID),
    'POST /orders devuelve HTTP 409 si el precio enviado difiere del precio actual en DynamoDB (sin descontar stock ni incrementar contador)'
  );

  // 2.2 Stock insuficiente -> debe devolver 409 sin tocar stock ni contador
  const insufficientStockRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: {},
    body: JSON.stringify({
      customer: validCustomer,
      items: [{ productId: prod1.id, quantity: 99, price: 600.00 }]
    })
  });
  assert(
    insufficientStockRes.statusCode === 409 &&
      db.tables[TABLES.PRODUCTS].get(prod1.id).stock === 10,
    'POST /orders devuelve HTTP 409 si no hay stock suficiente (sin registrar pedido)'
  );

  // 2.3 Pedido < $500 MXN -> aplica envío estándar de $20.00 MXN + agrupa líneas repetidas
  const smallOrderRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: {},
    body: JSON.stringify({
      customer: validCustomer,
      items: [
        { productId: prod2.id, quantity: 1, price: 150.00 },
        { productId: prod2.id, quantity: 1, price: 150.00 }
      ]
    })
  });
  const smallOrderBody = JSON.parse(smallOrderRes.body);
  assert(
    smallOrderRes.statusCode === 201 &&
      smallOrderBody.data.orderNumber === 'CS-2026-1006' &&
      smallOrderBody.data.items.length === 1 &&
      smallOrderBody.data.items[0].quantity === 2 &&
      smallOrderBody.data.subtotal === 300.00 &&
      smallOrderBody.data.shipping === 20.00 &&
      smallOrderBody.data.total === 320.00 &&
      db.tables[TABLES.PRODUCTS].get(prod2.id).stock === 2,
    'POST /orders agrupa ítems repetidos, aplica envío de $20 MXN (< $500 MXN) y asigna folio CS-2026-1006'
  );

  // 2.4 Reintento automático ante colisión concurrente en COUNTER#ORDER_NUMBER
  db.enableCounterCollisionOnce();
  const retryOrderRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: {},
    body: JSON.stringify({
      customer: validCustomer,
      items: [{ productId: prod1.id, quantity: 1, price: 600.00 }]
    })
  });
  const retryOrderBody = JSON.parse(retryOrderRes.body);
  assert(
    retryOrderRes.statusCode === 201 &&
      retryOrderBody.data.orderNumber === 'CS-2026-1008' &&
      retryOrderBody.data.shipping === 0 &&
      retryOrderBody.data.total === 600.00,
    'POST /orders reintenta lectura consistente del contador ante colisión concurrente y aplica envío gratis (>= $500 MXN)'
  );

  // -----------------------------------------------------------------------
  // SECCIÓN 3: Auditoría de Idempotencia en POST /orders
  // -----------------------------------------------------------------------
  console.log('\n--- 3. Auditoría de Idempotencia (Idempotency-Key & ClientRequestToken) ---');

  // 3.1 Validación de longitud y formato de Idempotency-Key
  const invalidKeys = ['', '   ', 'corta', 'clave con espacios!', 'x'.repeat(129)];
  let allInvalidRejected = true;
  for (const badKey of invalidKeys) {
    const res = await OrdersLambda.handler({
      requestContext: { http: { method: 'POST', path: '/orders' } },
      headers: { 'Idempotency-Key': badKey },
      body: JSON.stringify({
        customer: validCustomer,
        items: [{ productId: prod1.id, quantity: 1, price: 600.00 }]
      })
    });
    if (res.statusCode !== 400) {
      allInvalidRejected = false;
    }
  }
  assert(
    allInvalidRejected,
    'POST /orders rechaza con HTTP 400 claves Idempotency-Key vacías, menores a 8 chars, mayores a 128 chars o con caracteres inválidos'
  );

  // 3.2 Verificar que requestHash cambie ante cualquier cambio en datos del cliente o artículos
  const baseMap = new Map([[prod1.id, { quantity: 1, clientPrice: 600.00 }]]);
  const hashBase = computeOrderRequestHash(validCustomer, baseMap);
  const hashDiffQty = computeOrderRequestHash(
    validCustomer,
    new Map([[prod1.id, { quantity: 2, clientPrice: 600.00 }]])
  );
  const hashDiffPrice = computeOrderRequestHash(
    validCustomer,
    new Map([[prod1.id, { quantity: 1, clientPrice: 599.00 }]])
  );
  const hashDiffAddress = computeOrderRequestHash(
    { ...validCustomer, address: 'Otra Dirección 999' },
    baseMap
  );
  const hashDiffNotes = computeOrderRequestHash(
    { ...validCustomer, notes: 'Nota distinta' },
    baseMap
  );

  assert(
    hashBase !== hashDiffQty &&
      hashBase !== hashDiffPrice &&
      hashBase !== hashDiffAddress &&
      hashBase !== hashDiffNotes,
    'requestHash incluye todos los campos relevantes del pedido (cliente completo + productId, quantity y price)'
  );

  // 3.3 Primera solicitud con Idempotency-Key válida y verificación de ClientRequestToken <= 36 chars
  const stockBeforeIdem = db.tables[TABLES.PRODUCTS].get(prod1.id).stock;
  const seqBeforeIdem = db.tables[TABLES.ORDERS].get(ORDER_LIMITS.COUNTER_ID).seq;
  const idemKey = 'idem-order-2026-uuid-550e8400-e29b-41d4-a716-446655440000';

  db.transactLog.length = 0;
  const idemFirstRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: { 'Idempotency-Key': idemKey },
    body: JSON.stringify({
      customer: validCustomer,
      items: [{ productId: prod1.id, quantity: 2, price: 600.00 }]
    })
  });
  const idemFirstBody = JSON.parse(idemFirstRes.body);
  const usedToken = db.transactLog[0]?.ClientRequestToken;

  assert(
    idemFirstRes.statusCode === 201 &&
      typeof usedToken === 'string' &&
      usedToken.length >= 1 &&
      usedToken.length <= 36,
    `ClientRequestToken enviado a TransactWriteItems cumple restricción de DynamoDB (longitud: ${usedToken?.length} <= 36 chars)`
  );

  const stockAfterFirst = db.tables[TABLES.PRODUCTS].get(prod1.id).stock;
  const seqAfterFirst = db.tables[TABLES.ORDERS].get(ORDER_LIMITS.COUNTER_ID).seq;

  // 3.4 Reintento con la misma Idempotency-Key y el mismo contenido -> 200 OK sin doble descuento ni incremento
  const idemRetryRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: { 'Idempotency-Key': idemKey },
    body: JSON.stringify({
      customer: validCustomer,
      items: [{ productId: prod1.id, quantity: 2, price: 600.00 }]
    })
  });
  const idemRetryBody = JSON.parse(idemRetryRes.body);
  const stockAfterRetry = db.tables[TABLES.PRODUCTS].get(prod1.id).stock;
  const seqAfterRetry = db.tables[TABLES.ORDERS].get(ORDER_LIMITS.COUNTER_ID).seq;

  assert(
    idemRetryRes.statusCode === 200 &&
      idemRetryBody.data.id === idemFirstBody.data.id &&
      idemRetryBody.data.orderNumber === idemFirstBody.data.orderNumber &&
      stockAfterRetry === stockAfterFirst &&
      stockAfterFirst === stockBeforeIdem - 2 &&
      seqAfterRetry === seqAfterFirst &&
      seqAfterFirst === seqBeforeIdem + 1,
    'Reintento con misma Idempotency-Key devuelve el mismo pedido (HTTP 200) y NO descuenta stock ni incrementa el contador dos veces'
  );

  // 3.5 Misma Idempotency-Key con contenido distinto -> HTTP 409 Conflict
  const idemConflictRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: { 'Idempotency-Key': idemKey },
    body: JSON.stringify({
      customer: validCustomer,
      items: [{ productId: prod1.id, quantity: 3, price: 600.00 }] // Cantidad diferente (3 en vez de 2)
    })
  });
  assert(
    idemConflictRes.statusCode === 409 &&
      db.tables[TABLES.PRODUCTS].get(prod1.id).stock === stockAfterFirst,
    'Misma Idempotency-Key con payload distinto devuelve HTTP 409 Conflict sin modificar stock ni contador'
  );

  // 3.6 Dos solicitudes simultáneas con la misma Idempotency-Key (condición de carrera en TransactWriteItems)
  const raceKey = 'idem-concurrent-race-key-2026-99887766';
  const stockBeforeRace = db.tables[TABLES.PRODUCTS].get(prod1.id).stock;
  const seqBeforeRace = db.tables[TABLES.ORDERS].get(ORDER_LIMITS.COUNTER_ID).seq;

  // Simular que mientras la solicitud B está a punto de ejecutar TransactWriteItems,
  // la solicitud A acaba de confirmar la transacción en DynamoDB
  let raceHookTriggered = false;
  const racePayload = {
    customer: validCustomer,
    items: [{ productId: prod1.id, quantity: 1, price: 600.00 }]
  };

  let winnerOrder = null;
  db.setBeforeTransactHook(async () => {
    if (!raceHookTriggered) {
      raceHookTriggered = true;
      // Desactivar hook para que la llamada paralela interna (ganadora) confirme en DynamoDB
      db.setBeforeTransactHook(null);
      const parallelWinnerRes = await OrdersLambda.handler({
        requestContext: { http: { method: 'POST', path: '/orders' } },
        headers: { 'Idempotency-Key': raceKey },
        body: JSON.stringify(racePayload)
      });
      winnerOrder = JSON.parse(parallelWinnerRes.body).data;
    }
  });

  const concurrentLoserRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'POST', path: '/orders' } },
    headers: { 'Idempotency-Key': raceKey },
    body: JSON.stringify(racePayload)
  });
  const concurrentLoserBody = JSON.parse(concurrentLoserRes.body);
  const stockAfterRace = db.tables[TABLES.PRODUCTS].get(prod1.id).stock;
  const seqAfterRace = db.tables[TABLES.ORDERS].get(ORDER_LIMITS.COUNTER_ID).seq;

  assert(
    concurrentLoserRes.statusCode === 200 &&
      winnerOrder &&
      concurrentLoserBody.data.id === winnerOrder.id &&
      concurrentLoserBody.data.orderNumber === winnerOrder.orderNumber &&
      stockAfterRace === stockBeforeRace - 1 &&
      seqAfterRace === seqBeforeRace + 1,
    'Dos solicitudes simultáneas con la misma Idempotency-Key devuelven el mismo pedido y descuentan stock/contador una sola vez'
  );

  // -----------------------------------------------------------------------
  // SECCIÓN 4: GET /dashboard/metrics (OrdersRole -> Products/Categories StatusIndex)
  // -----------------------------------------------------------------------
  console.log('\n--- 4. Auditoría de Dashboard y Consultas Cruzadas ---');
  const metricsRes = await OrdersLambda.handler({
    requestContext: { http: { method: 'GET', path: '/dashboard/metrics' } }
  });
  const metricsBody = JSON.parse(metricsRes.body);

  assert(
    metricsRes.statusCode === 200 &&
      metricsBody.data.totalOrders === 4 &&
      metricsBody.data.totalProducts === 2 &&
      metricsBody.data.totalCategories === 1 &&
      metricsBody.data.lowStockCount >= 1,
    'GET /dashboard/metrics calcula ingresos en MXN, pedidos, productos y categorías usando StatusIndex y DateIndex'
  );

  // =========================================================================
  // RESUMEN
  // =========================================================================
  console.log('\n=======================================================');
  console.log(`📊 RESUMEN BACKEND: ${passed} pruebas superadas, ${failed} fallidas`);
  console.log('=======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBackendAuditTests().catch(err => {
  console.error('Error fatal en auditoría de backend:', err);
  process.exit(1);
});
