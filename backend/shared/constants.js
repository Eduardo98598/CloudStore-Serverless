/**
 * CloudStore Serverless - Constantes Compartidas del Backend
 * Alineado estrictamente con API-CONTRACT.md y DYNAMODB-DESIGN.md.
 * Moneda oficial del proyecto: Peso Mexicano (MXN).
 */

'use strict';

const TABLES = Object.freeze({
  PRODUCTS: process.env.PRODUCTS_TABLE || 'CloudStore-Products',
  CATEGORIES: process.env.CATEGORIES_TABLE || 'CloudStore-Categories',
  ORDERS: process.env.ORDERS_TABLE || 'CloudStore-Orders'
});

const INDEXES = Object.freeze({
  PRODUCTS: Object.freeze({
    STATUS: 'StatusIndex',      // PK: productStatus (S), SK: createdAt (S)
    CATEGORY: 'CategoryIndex'   // PK: categoryId (S), SK: categorySort (S)
  }),
  CATEGORIES: Object.freeze({
    STATUS: 'StatusIndex'       // PK: categoryStatus (S), SK: name (S)
  }),
  ORDERS: Object.freeze({
    STATUS_DATE: 'StatusDateIndex', // PK: status (S), SK: createdAt (S)
    DATE: 'DateIndex',              // PK: entityType (S), SK: createdAt (S)
    ORDER_NUMBER: 'OrderNumberIndex' // PK: orderNumber (S)
  })
});

const ENTITY_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

const ORDER_STATUSES = Object.freeze([
  'pendiente',
  'confirmado',
  'enviado',
  'cancelado'
]);

const CURRENCY = Object.freeze({
  CODE: 'MXN',
  SYMBOL: '$',
  LOCALE: 'es-MX'
});

/**
 * Regla explícita de envío en MXN:
 * - subtotal <= 0         -> $0.00 MXN
 * - subtotal >= $500.00   -> $0.00 MXN (Envío gratis)
 * - 0 < subtotal < $500   -> $20.00 MXN (Envío estándar)
 */
const SHIPPING = Object.freeze({
  FREE_THRESHOLD_MXN: 500.00,
  STANDARD_COST_MXN: 20.00
});

/**
 * Límites transaccionales y de contador de folios (CloudStore-Orders)
 */
const ORDER_LIMITS = Object.freeze({
  COUNTER_ID: 'COUNTER#ORDER_NUMBER',
  ORDER_ENTITY_TYPE: 'ORDER',
  ORDER_PREFIX: 'CS-2026-',
  INITIAL_SEQUENCE: 1005,           // Continúa después de CS-2026-1001..1005
  MAX_DISTINCT_ITEMS: 50,           // Máximo de negocio por pedido
  DYNAMODB_MAX_TRANSACT_ITEMS: 100, // Límite duro de acciones en TransactWriteItems
  MAX_CONCURRENCY_RETRIES: 3,       // Reintentos acotados ante colisión en el contador
  LOW_STOCK_THRESHOLD: 5
});

module.exports = {
  TABLES,
  INDEXES,
  ENTITY_STATUS,
  ORDER_STATUSES,
  CURRENCY,
  SHIPPING,
  ORDER_LIMITS
};
