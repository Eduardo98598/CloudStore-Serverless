/**
 * CloudStore Serverless - Servicio de Pedidos y Transacciones (DynamoDB)
 * Tabla principal: CloudStore-Orders
 * Índices:
 *   - StatusDateIndex (PK: status, SK: createdAt)
 *   - DateIndex (PK: entityType = "ORDER", SK: createdAt)
 *   - OrderNumberIndex (PK: orderNumber)
 *
 * Implementa:
 *   - Creación atómica de pedido con TransactWriteItems (contador + pedido + inventario).
 *   - Contador de folios en CloudStore-Orders (id = "COUNTER#ORDER_NUMBER") con lectura consistente
 *     y actualización condicional (hasta 3 reintentos por concurrencia).
 *   - Comparación obligatoria de precio contra DynamoDB (HTTP 409 si cambió).
 *   - Idempotencia mediante Idempotency-Key (id determinista + requestHash + ClientRequestToken).
 *   - Regla explícita de envío en MXN ($0 si subtotal >= $500 MXN; $20 MXN si < $500 MXN).
 */

'use strict';

const crypto = require('crypto');
const { getDocClient } = require('../shared/db');
const {
  TABLES,
  INDEXES,
  ENTITY_STATUS,
  ORDER_STATUSES,
  ORDER_LIMITS
} = require('../shared/constants');
const {
  roundMxn,
  calculateShippingMxn,
  toPublicProduct,
  toPublicOrder,
  computeOrderRequestHash,
  normalizeIdempotencyKey
} = require('../shared/validators');

/**
 * Espera asíncrona con backoff exponencial + jitter para reintentos de concurrencia.
 * @param {number} attempt 1..N
 */
async function backoffDelay(attempt) {
  if (process.env.NODE_ENV === 'test') return;
  const baseMs = Math.pow(2, attempt - 1) * 50; // 50ms, 100ms, 200ms
  const jitterMs = Math.floor(Math.random() * 25);
  await new Promise(resolve => setTimeout(resolve, baseMs + jitterMs));
}

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
 * Patrones O4, O5 y O6: Lista pedidos usando DateIndex o StatusDateIndex (sin Scan).
 * @param {Object} filters { status, search }
 */
async function listOrders(filters = {}) {
  const statusFilter =
    filters.status && filters.status !== 'all'
      ? String(filters.status).trim().toLowerCase()
      : null;

  let rawOrders = [];

  if (statusFilter) {
    // Patrón O5: Query por StatusDateIndex
    rawOrders = await queryAll({
      TableName: TABLES.ORDERS,
      IndexName: INDEXES.ORDERS.STATUS_DATE,
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': statusFilter },
      ScanIndexForward: false
    });
  } else {
    // Patrón O4: Query por DateIndex (entityType = "ORDER")
    rawOrders = await queryAll({
      TableName: TABLES.ORDERS,
      IndexName: INDEXES.ORDERS.DATE,
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': ORDER_LIMITS.ORDER_ENTITY_TYPE
      },
      ScanIndexForward: false
    });
  }

  let orders = rawOrders
    .filter(o => o.id !== ORDER_LIMITS.COUNTER_ID)
    .map(toPublicOrder);

  // Patrón O6: Búsqueda por número de orden, nombre, teléfono o email
  if (filters.search && String(filters.search).trim()) {
    const q = String(filters.search).toLowerCase().trim();
    orders = orders.filter(
      o =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.phone && o.customer.phone.toLowerCase().includes(q)) ||
        (o.customer?.email && o.customer.email.toLowerCase().includes(q))
    );
  }

  return orders;
}

/**
 * Patrones O2 y O3: Obtiene un pedido por su ID interno ("ord-...") o por su folio ("CS-2026-...").
 * @param {string} idOrNumber
 */
async function getOrderByIdOrNumber(idOrNumber) {
  const cleanParam = String(idOrNumber || '').trim();
  if (!cleanParam || cleanParam === ORDER_LIMITS.COUNTER_ID) {
    return null;
  }

  const docClient = getDocClient();
  const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

  // Patrón O3: Si empieza con CS-, buscar en el GSI OrderNumberIndex
  if (cleanParam.toUpperCase().startsWith('CS-')) {
    const res = await docClient.send(
      new QueryCommand({
        TableName: TABLES.ORDERS,
        IndexName: INDEXES.ORDERS.ORDER_NUMBER,
        KeyConditionExpression: 'orderNumber = :orderNum',
        ExpressionAttributeValues: {
          ':orderNum': cleanParam.toUpperCase()
        },
        Limit: 1
      })
    );
    const found = Array.isArray(res.Items) && res.Items[0];
    return found ? toPublicOrder(found) : null;
  }

  // Patrón O2: GetItem por clave primaria id
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLES.ORDERS,
      Key: { id: cleanParam }
    })
  );

  if (!res.Item || res.Item.id === ORDER_LIMITS.COUNTER_ID) {
    return null;
  }

  return toPublicOrder(res.Item);
}

/**
 * Inspecciona el estado actual de un producto tras un fallo en TransactWriteItems
 * para devolver el mensaje de error 409 exacto (inactivo, cambio de precio o falta de stock).
 */
async function diagnoseProductFailure(productId, expectedPrice, requestedQty) {
  const docClient = getDocClient();
  const { GetCommand } = require('@aws-sdk/lib-dynamodb');

  const res = await docClient.send(
    new GetCommand({
      TableName: TABLES.PRODUCTS,
      Key: { id: productId },
      ConsistentRead: true
    })
  );

  const product = res.Item;
  if (
    !product ||
    product.active === false ||
    product.productStatus !== ENTITY_STATUS.ACTIVE
  ) {
    return {
      status: 409,
      error: `El producto ${productId} no está disponible o fue desactivado`
    };
  }

  const currentPrice = roundMxn(product.price);
  if (Math.abs(currentPrice - expectedPrice) > 0.001) {
    return {
      status: 409,
      error: `El precio del producto "${product.name}" (${productId}) cambió recientemente. Por favor actualiza tu carrito e intenta nuevamente.`
    };
  }

  const availableStock = Number(product.stock) || 0;
  return {
    status: 409,
    error: `Stock insuficiente para el producto ${productId}. Disponible: ${availableStock}`
  };
}

/**
 * Patrón O1: Crea un pedido de forma atómica con TransactWriteItems.
 * Incluye:
 *   1. Validación de cliente y agrupación de artículos repetidos por productId.
 *   2. Verificación de límites (MAX_DISTINCT_ITEMS = 50, máx 100 acciones en TransactWriteItems).
 *   3. Verificación previa de idempotencia (Idempotency-Key -> id determinista + requestHash).
 *   4. Lectura consistente (BatchGetItem) de productos y comparación obligatoria de precio (409 si cambió).
 *   5. Cálculo de snapshot y envío en MXN ($0 si subtotal >= $500 MXN; $20 MXN si < $500 MXN).
 *   6. Lectura consistente de COUNTER#ORDER_NUMBER + TransactWriteItems condicional con hasta 3 reintentos.
 *
 * @param {Object} payload
 * @param {string} [idempotencyHeader]
 */
async function createOrder(payload = {}, idempotencyHeader = null) {
  const customer = payload.customer || {};
  const name = String(customer.name || '').trim();
  const phone = String(customer.phone || '').trim();
  const address = String(customer.address || '').trim();
  const email = String(customer.email || '').trim();
  const notes = String(customer.notes || '').trim();

  if (!name) {
    return { status: 400, error: 'El campo customer.name es obligatorio' };
  }
  if (!phone) {
    return { status: 400, error: 'El campo customer.phone es obligatorio' };
  }
  if (!address) {
    return { status: 400, error: 'El campo customer.address es obligatorio' };
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (rawItems.length === 0) {
    return { status: 400, error: 'El carrito está vacío' };
  }

  // 1. Agrupar productos repetidos por productId (prohibido operar 2 veces sobre el mismo ítem en TransactWriteItems)
  const groupedMap = new Map();
  for (const raw of rawItems) {
    const pid = String(raw.productId || raw.id || '').trim();
    const qty = parseInt(raw.quantity, 10);
    const rawPrice = Number(raw.price);

    if (!pid || !Number.isInteger(qty) || qty < 1) {
      return {
        status: 400,
        error: `Cantidad inválida para el producto ${pid || 'desconocido'}`
      };
    }
    if (
      raw.price === undefined ||
      raw.price === null ||
      Number.isNaN(rawPrice) ||
      rawPrice < 0
    ) {
      return {
        status: 400,
        error: `Precio inválido para el producto ${pid}`
      };
    }

    const existing = groupedMap.get(pid);
    if (existing && Math.abs(existing.clientPrice - rawPrice) > 0.001) {
      return {
        status: 409,
        error: `El precio enviado para el producto ${pid} es inconsistente. Por favor actualiza tu carrito.`
      };
    }

    groupedMap.set(pid, {
      quantity: (existing ? existing.quantity : 0) + qty,
      clientPrice: roundMxn(rawPrice)
    });
  }

  // 2. Comprobar límite de 50 productos distintos y límite duro de 100 acciones en TransactWriteItems
  const distinctCount = groupedMap.size;
  const totalTransactActions = 2 + distinctCount; // 1 Update contador + 1 Put pedido + N Update productos
  if (
    distinctCount > ORDER_LIMITS.MAX_DISTINCT_ITEMS ||
    totalTransactActions > ORDER_LIMITS.DYNAMODB_MAX_TRANSACT_ITEMS
  ) {
    return {
      status: 400,
      error: `El pedido supera el máximo permitido de ${ORDER_LIMITS.MAX_DISTINCT_ITEMS} productos distintos por transacción`
    };
  }

  const docClient = getDocClient();
  const {
    GetCommand,
    BatchGetCommand,
    TransactWriteCommand
  } = require('@aws-sdk/lib-dynamodb');

  // 3. Control de Idempotencia (DYNAMODB-DESIGN.md §4.7)
  const rawIdempotencyKey =
    idempotencyHeader !== null && idempotencyHeader !== undefined
      ? idempotencyHeader
      : payload.idempotencyKey !== undefined
      ? payload.idempotencyKey
      : null;
  const idempotencyInfo = normalizeIdempotencyKey(rawIdempotencyKey);
  if (idempotencyInfo && !idempotencyInfo.valid) {
    return {
      status: 400,
      error: idempotencyInfo.error
    };
  }

  const requestHash = computeOrderRequestHash(
    { name, phone, email, address, notes },
    groupedMap
  );

  if (idempotencyInfo) {
    const existingOrderRes = await docClient.send(
      new GetCommand({
        TableName: TABLES.ORDERS,
        Key: { id: idempotencyInfo.orderId },
        ConsistentRead: true
      })
    );

    if (existingOrderRes.Item) {
      if (existingOrderRes.Item.requestHash === requestHash) {
        return {
          status: 200,
          idempotentReplay: true,
          data: toPublicOrder(existingOrderRes.Item)
        };
      }
      return {
        status: 409,
        error: 'Idempotency-Key ya utilizada con un payload diferente'
      };
    }
  }

  // 4. Lectura consistente de productos (BatchGetItem con ConsistentRead: true)
  const productIds = Array.from(groupedMap.keys());
  const batchRes = await docClient.send(
    new BatchGetCommand({
      RequestItems: {
        [TABLES.PRODUCTS]: {
          Keys: productIds.map(id => ({ id })),
          ConsistentRead: true
        }
      }
    })
  );

  const fetchedProducts = batchRes.Responses?.[TABLES.PRODUCTS] || [];
  const productsById = new Map(fetchedProducts.map(p => [p.id, p]));

  const snapshotItems = [];
  for (const [productId, entry] of groupedMap.entries()) {
    const product = productsById.get(productId);

    if (
      !product ||
      product.active === false ||
      product.productStatus !== ENTITY_STATUS.ACTIVE
    ) {
      return {
        status: 409,
        error: `El producto ${productId} no está disponible o fue desactivado`
      };
    }

    const dbPrice = roundMxn(product.price);
    // Comparar el precio enviado al confirmar contra el precio actual en DynamoDB
    if (Math.abs(entry.clientPrice - dbPrice) > 0.001) {
      return {
        status: 409,
        error: `El precio del producto "${product.name}" (${productId}) cambió recientemente. Por favor actualiza tu carrito e intenta nuevamente.`
      };
    }

    const availableStock = Number(product.stock) || 0;
    if (availableStock < entry.quantity) {
      return {
        status: 409,
        error: `Stock insuficiente para el producto ${productId}. Disponible: ${availableStock}`
      };
    }

    snapshotItems.push({
      productId: product.id,
      name: product.name,
      price: dbPrice,
      quantity: entry.quantity,
      subtotal: roundMxn(dbPrice * entry.quantity),
      image: product.image || ''
    });
  }

  // 5. Recalcular subtotal, envío en MXN y total en el backend
  const subtotal = roundMxn(
    snapshotItems.reduce((sum, item) => sum + item.subtotal, 0)
  );
  const shipping = calculateShippingMxn(subtotal);
  const total = roundMxn(subtotal + shipping);

  const orderId = idempotencyInfo
    ? idempotencyInfo.orderId
    : `ord-${crypto.randomUUID().slice(0, 8)}`;

  // 6. Ciclo de lectura consistente del contador + TransactWriteItems (hasta 3 intentos)
  const maxRetries = ORDER_LIMITS.MAX_CONCURRENCY_RETRIES;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Paso 6a: Lectura consistente del contador COUNTER#ORDER_NUMBER
    const counterRes = await docClient.send(
      new GetCommand({
        TableName: TABLES.ORDERS,
        Key: { id: ORDER_LIMITS.COUNTER_ID },
        ConsistentRead: true
      })
    );

    const currentSeq = counterRes.Item
      ? Number(counterRes.Item.seq)
      : ORDER_LIMITS.INITIAL_SEQUENCE;
    const nextSeq = currentSeq + 1;
    const orderNumber = `${ORDER_LIMITS.ORDER_PREFIX}${nextSeq}`;
    const nowIso = new Date().toISOString();

    const orderItem = {
      id: orderId,
      orderNumber,
      entityType: ORDER_LIMITS.ORDER_ENTITY_TYPE,
      customer: {
        name,
        phone,
        email,
        address,
        notes
      },
      items: snapshotItems,
      subtotal,
      shipping,
      total,
      status: 'pendiente',
      whatsappSent: false,
      createdAt: nowIso,
      requestHash
    };

    const transactItems = [
      // Acción [0]: Actualización condicional del contador comprobando que conserva el valor leído
      {
        Update: {
          TableName: TABLES.ORDERS,
          Key: { id: ORDER_LIMITS.COUNTER_ID },
          UpdateExpression: 'SET seq = :nextSeq, updatedAt = :now',
          ConditionExpression:
            '(attribute_not_exists(seq) AND :currentSeq = :seedSeq) OR seq = :currentSeq',
          ExpressionAttributeValues: {
            ':currentSeq': currentSeq,
            ':seedSeq': ORDER_LIMITS.INITIAL_SEQUENCE,
            ':nextSeq': nextSeq,
            ':now': nowIso
          }
        }
      },
      // Acción [1]: Inserción del pedido con ese folio y condición de no duplicidad
      {
        Put: {
          TableName: TABLES.ORDERS,
          Item: orderItem,
          ConditionExpression: 'attribute_not_exists(id)'
        }
      },
      // Acciones [2..N+1]: 1 Update por cada producto único comprobando activo, precio sin cambios y stock
      ...snapshotItems.map(item => ({
        Update: {
          TableName: TABLES.PRODUCTS,
          Key: { id: item.productId },
          UpdateExpression: 'SET stock = stock - :qty, updatedAt = :now',
          ConditionExpression:
            'attribute_exists(id) AND #active = :true AND productStatus = :activeStatus AND price = :snapshotPrice AND stock >= :qty',
          ExpressionAttributeNames: {
            '#active': 'active'
          },
          ExpressionAttributeValues: {
            ':true': true,
            ':activeStatus': ENTITY_STATUS.ACTIVE,
            ':snapshotPrice': item.price,
            ':qty': item.quantity,
            ':now': nowIso
          }
        }
      }))
    ];

    const transactParams = {
      TransactItems: transactItems
    };
    if (idempotencyInfo) {
      transactParams.ClientRequestToken = `${idempotencyInfo.clientTokenBase}-${attempt}`.slice(0, 36);
    }

    try {
      await docClient.send(new TransactWriteCommand(transactParams));
      return { status: 201, data: toPublicOrder(orderItem) };
    } catch (err) {
      // Si falló por IdempotentParameterMismatchException o por colisión en el Put del pedido [1],
      // consultar el pedido existente con lectura consistente para resolver concurrencia idempotente.
      if (err.name === 'IdempotentParameterMismatchException' && idempotencyInfo) {
        const existingRes = await docClient.send(
          new GetCommand({
            TableName: TABLES.ORDERS,
            Key: { id: orderId },
            ConsistentRead: true
          })
        );
        if (existingRes.Item && existingRes.Item.requestHash === requestHash) {
          return {
            status: 200,
            idempotentReplay: true,
            data: toPublicOrder(existingRes.Item)
          };
        }
        return {
          status: 409,
          error: 'Idempotency-Key ya utilizada con un payload diferente'
        };
      }

      if (err.name === 'TransactionCanceledException') {
        const reasons = err.CancellationReasons || [];

        // Caso A: El Put del pedido [1] falló (o ya fue insertado en paralelo con el mismo Idempotency-Key)
        if (reasons[1] && reasons[1].Code === 'ConditionalCheckFailed') {
          const existingRes = await docClient.send(
            new GetCommand({
              TableName: TABLES.ORDERS,
              Key: { id: orderId },
              ConsistentRead: true
            })
          );
          if (existingRes.Item && existingRes.Item.requestHash === requestHash) {
            return {
              status: 200,
              idempotentReplay: true,
              data: toPublicOrder(existingRes.Item)
            };
          }
          return {
            status: 409,
            error: 'Idempotency-Key ya utilizada con un payload diferente'
          };
        }

        // Si había Idempotency-Key y otra ejecución paralela acaba de insertar el pedido
        // al mismo tiempo que incrementó el contador (reasons[0] === ConditionalCheckFailed):
        if (idempotencyInfo && reasons[0] && reasons[0].Code === 'ConditionalCheckFailed') {
          const existingRes = await docClient.send(
            new GetCommand({
              TableName: TABLES.ORDERS,
              Key: { id: orderId },
              ConsistentRead: true
            })
          );
          if (existingRes.Item) {
            if (existingRes.Item.requestHash === requestHash) {
              return {
                status: 200,
                idempotentReplay: true,
                data: toPublicOrder(existingRes.Item)
              };
            }
            return {
              status: 409,
              error: 'Idempotency-Key ya utilizada con un payload diferente'
            };
          }
        }

        // Caso B: Algún producto [2..N+1] falló su condición (inactivo, cambio de precio o stock insuficiente) -> NO reintentar
        for (let i = 0; i < snapshotItems.length; i++) {
          const prodReason = reasons[2 + i];
          if (prodReason && prodReason.Code === 'ConditionalCheckFailed') {
            const failedItem = snapshotItems[i];
            return diagnoseProductFailure(
              failedItem.productId,
              failedItem.price,
              failedItem.quantity
            );
          }
        }

        // Caso C: Colisión concurrente en el contador [0] -> reintentar hasta MAX_CONCURRENCY_RETRIES
        if (reasons[0] && reasons[0].Code === 'ConditionalCheckFailed') {
          if (attempt < maxRetries) {
            await backoffDelay(attempt);
            continue;
          }
          return {
            status: 503,
            error:
              'No se pudo asignar el folio del pedido por alta concurrencia. Por favor intenta confirmar nuevamente.'
          };
        }
      }

      if (
        err.name === 'TransactionConflictException' ||
        err.name === 'ProvisionedThroughputExceededException'
      ) {
        if (attempt < maxRetries) {
          await backoffDelay(attempt);
          continue;
        }
        return {
          status: 503,
          error:
            'No se pudo asignar el folio del pedido por alta concurrencia. Por favor intenta confirmar nuevamente.'
        };
      }

      throw err;
    }
  }

  return {
    status: 503,
    error:
      'No se pudo asignar el folio del pedido por alta concurrencia. Por favor intenta confirmar nuevamente.'
  };
}

/**
 * Patrón O7: Actualiza el estado de un pedido y opcionalmente su número de guía.
 * @param {string} id
 * @param {string} newStatus
 * @param {string} [trackingNumber]
 */
async function updateOrderStatus(id, newStatus, trackingNumber = '') {
  const cleanId = String(id || '').trim();
  if (!cleanId || cleanId === ORDER_LIMITS.COUNTER_ID) {
    return { status: 404, error: 'Pedido no encontrado para actualizar' };
  }

  const normalizedStatus = String(newStatus || '').trim().toLowerCase();
  if (!ORDER_STATUSES.includes(normalizedStatus)) {
    return {
      status: 400,
      error: `Estado inválido. Valores permitidos: ${ORDER_STATUSES.join(', ')}`
    };
  }

  const nowIso = new Date().toISOString();
  const cleanTracking = String(trackingNumber || '').trim();

  const names = { '#status': 'status' };
  const values = {
    ':status': normalizedStatus,
    ':updatedAt': nowIso,
    ':orderType': ORDER_LIMITS.ORDER_ENTITY_TYPE
  };

  let updateExpr = 'SET #status = :status, updatedAt = :updatedAt';
  if (cleanTracking) {
    values[':tracking'] = cleanTracking;
    updateExpr += ', trackingNumber = :tracking';
  }

  const docClient = getDocClient();
  const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');

  try {
    const res = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.ORDERS,
        Key: { id: cleanId },
        UpdateExpression: updateExpr,
        ConditionExpression: 'attribute_exists(id) AND entityType = :orderType',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW'
      })
    );

    return {
      status: 200,
      data: toPublicOrder(res.Attributes),
      message: `Estado actualizado a "${normalizedStatus}"`
    };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { status: 404, error: 'Pedido no encontrado para actualizar' };
    }
    throw err;
  }
}

/**
 * Patrones O8 y P12: Calcula las métricas del Dashboard Administrativo (API-CONTRACT.md §4)
 * usando Query sobre los GSIs de las 3 tablas (sin Scan).
 */
async function getDashboardMetrics() {
  // 1. Consultar pedidos ordenados por fecha (DateIndex)
  const rawOrders = await queryAll({
    TableName: TABLES.ORDERS,
    IndexName: INDEXES.ORDERS.DATE,
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': ORDER_LIMITS.ORDER_ENTITY_TYPE
    },
    ScanIndexForward: false
  });
  const orders = rawOrders
    .filter(o => o.id !== ORDER_LIMITS.COUNTER_ID)
    .map(toPublicOrder);

  // 2. Consultar productos activos e inactivos (StatusIndex)
  const [activeProducts, inactiveProducts] = await Promise.all([
    queryAll({
      TableName: TABLES.PRODUCTS,
      IndexName: INDEXES.PRODUCTS.STATUS,
      KeyConditionExpression: 'productStatus = :status',
      ExpressionAttributeValues: { ':status': ENTITY_STATUS.ACTIVE }
    }),
    queryAll({
      TableName: TABLES.PRODUCTS,
      IndexName: INDEXES.PRODUCTS.STATUS,
      KeyConditionExpression: 'productStatus = :status',
      ExpressionAttributeValues: { ':status': ENTITY_STATUS.INACTIVE },
      ProjectionExpression: 'id'
    })
  ]);

  // 3. Consultar categorías activas e inactivas (StatusIndex)
  const [activeCategories, inactiveCategories] = await Promise.all([
    queryAll({
      TableName: TABLES.CATEGORIES,
      IndexName: INDEXES.CATEGORIES.STATUS,
      KeyConditionExpression: 'categoryStatus = :status',
      ExpressionAttributeValues: { ':status': ENTITY_STATUS.ACTIVE },
      ProjectionExpression: 'id'
    }),
    queryAll({
      TableName: TABLES.CATEGORIES,
      IndexName: INDEXES.CATEGORIES.STATUS,
      KeyConditionExpression: 'categoryStatus = :status',
      ExpressionAttributeValues: { ':status': ENTITY_STATUS.INACTIVE },
      ProjectionExpression: 'id'
    })
  ]);

  const validOrders = orders.filter(o => o.status !== 'cancelado');
  const totalRevenue = roundMxn(
    validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  );

  const ordersPending = orders.filter(o => o.status === 'pendiente').length;
  const ordersConfirmed = orders.filter(o => o.status === 'confirmado').length;
  const ordersShipped = orders.filter(o => o.status === 'enviado').length;
  const ordersCancelled = orders.filter(o => o.status === 'cancelado').length;

  const lowStockProducts = activeProducts
    .filter(p => Number(p.stock) <= ORDER_LIMITS.LOW_STOCK_THRESHOLD)
    .map(toPublicProduct);

  const recentOrders = orders.slice(0, 5);

  return {
    totalRevenue,
    totalOrders: orders.length,
    totalProducts: activeProducts.length + inactiveProducts.length,
    totalCategories: activeCategories.length + inactiveCategories.length,
    ordersPending,
    ordersConfirmed,
    ordersShipped,
    ordersCancelled,
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
    recentOrders
  };
}

module.exports = {
  listOrders,
  getOrderByIdOrNumber,
  createOrder,
  updateOrderStatus,
  getDashboardMetrics
};
