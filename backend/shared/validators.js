/**
 * CloudStore Serverless - Utilidades de Validación, Moneda (MXN) y Transformación
 * Garantiza que los atributos internos de DynamoDB no se filtren fuera del contrato.
 */

'use strict';

const crypto = require('crypto');
const { ENTITY_STATUS, SHIPPING } = require('./constants');

/**
 * Redondea un importe monetario en MXN a 2 decimales exactos.
 * @param {number} amount
 * @returns {number}
 */
function roundMxn(amount) {
  return Number((Math.round((Number(amount) + Number.EPSILON) * 100) / 100).toFixed(2));
}

/**
 * Calcula el costo de envío en MXN según la regla explícita de negocio:
 * - subtotal <= 0        -> $0.00 MXN
 * - subtotal >= $500.00  -> $0.00 MXN (Envío gratis)
 * - 0 < subtotal < $500  -> $20.00 MXN (Envío estándar)
 * @param {number} subtotalMxn
 * @returns {number}
 */
function calculateShippingMxn(subtotalMxn) {
  const sub = roundMxn(subtotalMxn);
  if (sub <= 0) return 0;
  return sub >= SHIPPING.FREE_THRESHOLD_MXN ? 0 : SHIPPING.STANDARD_COST_MXN;
}

/**
 * Genera un slug amigable para URL a partir de un nombre.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Construye los atributos derivados internos de un producto para los GSIs de DynamoDB.
 * - productStatus: "ACTIVE" | "INACTIVE"
 * - categorySort: "<productStatus>#<createdAt>" (Sort Key del GSI CategoryIndex)
 */
function deriveProductGsiAttributes(active, createdAt) {
  const isActive = active !== false;
  const productStatus = isActive ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE;
  const isoDate = createdAt || new Date().toISOString();
  return {
    active: isActive,
    productStatus,
    categorySort: `${productStatus}#${isoDate}`
  };
}

/**
 * Elimina los atributos internos de DynamoDB de un documento de producto
 * antes de enviarlo en la respuesta JSON de API-CONTRACT.md.
 */
function toPublicProduct(item) {
  if (!item) return null;
  const { productStatus, categorySort, categoryStatusDate, ...publicProduct } = item;
  if (publicProduct.comparePrice === undefined) {
    publicProduct.comparePrice = null;
  }
  if (!Array.isArray(publicProduct.features)) {
    publicProduct.features = [];
  }
  return publicProduct;
}

/**
 * Elimina los atributos internos de DynamoDB de una categoría.
 */
function toPublicCategory(item, productCount = 0) {
  if (!item) return null;
  const { categoryStatus, ...publicCategory } = item;
  return {
    ...publicCategory,
    productCount: typeof productCount === 'number' ? productCount : (publicCategory.productCount || 0)
  };
}

/**
 * Elimina los atributos internos de DynamoDB de un pedido (entityType, requestHash).
 */
function toPublicOrder(item) {
  if (!item) return null;
  const { entityType, requestHash, idempotencyKey, ...publicOrder } = item;
  return publicOrder;
}

/**
 * Calcula un hash SHA-256 canónico del payload de creación de pedido
 * para validar idempotencia en POST /orders.
 * @param {Object} customer
 * @param {Map<string, { quantity: number, clientPrice: number }>} groupedItems
 */
function computeOrderRequestHash(customer, groupedItems) {
  const sortedItems = Array.from(groupedItems.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([productId, entry]) => ({
      productId,
      quantity: entry.quantity,
      price: roundMxn(entry.clientPrice)
    }));

  const canonical = JSON.stringify({
    customer: {
      name: String(customer.name || '').trim(),
      phone: String(customer.phone || '').trim(),
      email: String(customer.email || '').trim(),
      address: String(customer.address || '').trim(),
      notes: String(customer.notes || '').trim()
    },
    items: sortedItems
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9._:-]{8,128}$/;

/**
 * Valida y normaliza una llave de idempotencia para construir:
 * - orderId determinista ("ord-...") sin colisiones por truncamiento.
 * - clientTokenBase de 32 caracteres ASCII hexadecimales para que
 *   ClientRequestToken ("<clientTokenBase>-<attempt>", 34 chars) cumpla
 *   estrictamente la restricción de DynamoDB (1 a 36 caracteres ASCII).
 *
 * @param {string|null|undefined} rawKey
 * @returns {{ provided: boolean, valid: boolean, error?: string, rawKey?: string, orderId?: string, clientTokenBase?: string } | null}
 */
function normalizeIdempotencyKey(rawKey) {
  if (rawKey === null || rawKey === undefined) {
    return null;
  }
  if (typeof rawKey !== 'string') {
    return {
      provided: true,
      valid: false,
      error: 'Idempotency-Key inválida: debe ser una cadena de entre 8 y 128 caracteres ASCII ([a-zA-Z0-9._:-])'
    };
  }
  const trimmed = rawKey.trim();
  if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
    return {
      provided: true,
      valid: false,
      error: 'Idempotency-Key inválida: debe tener entre 8 y 128 caracteres ASCII permitidos ([a-zA-Z0-9._:-])'
    };
  }

  const keyHash = crypto.createHash('sha256').update(trimmed).digest('hex');

  return {
    provided: true,
    valid: true,
    rawKey: trimmed,
    orderId: `ord-${keyHash.slice(0, 24)}`,
    clientTokenBase: keyHash.slice(0, 32)
  };
}

module.exports = {
  roundMxn,
  calculateShippingMxn,
  slugify,
  deriveProductGsiAttributes,
  toPublicProduct,
  toPublicCategory,
  toPublicOrder,
  computeOrderRequestHash,
  normalizeIdempotencyKey
};
