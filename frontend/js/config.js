/**
 * CloudStore Serverless - Configuración General
 * Este archivo centraliza los parámetros de conexión y comportamiento de la aplicación.
 * Para conectar a AWS en producción:
 *   1. Cambiar USE_MOCK_API a false
 *   2. Asignar la URL generada por Amazon API Gateway en API_BASE_URL
 */

const _storeCfg = (typeof window !== 'undefined' && window.STORE_CONFIG) ? window.STORE_CONFIG : null;

const CONFIG = {
  APP_NAME: (_storeCfg && _storeCfg.fullStoreName) || 'CloudStore Serverless',
  VERSION: '1.0.0',
  
  // ========================================================
  // Conmutador Serverless AWS / Mock API
  // ========================================================
  USE_MOCK_API: true,
  
  // URL base de Amazon API Gateway (Ejemplo: https://xyz123.execute-api.us-east-1.amazonaws.com/prod)
  API_BASE_URL: '',
  
  // Configuración de WhatsApp para pedidos (sincronizada con frontend/config/store.config.js)
  // Número con código de país (ejemplo: 5219991234567 para México)
  WHATSAPP_PHONE: (_storeCfg && _storeCfg.contact && _storeCfg.contact.whatsappPhone) || '5219991234567',
  WHATSAPP_MESSAGE_HEADER: (_storeCfg && _storeCfg.contact && _storeCfg.contact.whatsappGreeting) || '¡Hola CloudStore! Acabo de realizar el siguiente pedido:',
  
  // Configuración de Moneda y Formato
  CURRENCY: {
    CODE: 'MXN',
    SYMBOL: '$',
    LOCALE: 'es-MX'
  },
  
  // Llaves de persistencia en localStorage para modo simulado
  STORAGE_KEYS: {
    PRODUCTS: 'cloudstore_products_v1',
    CATEGORIES: 'cloudstore_categories_v1',
    ORDERS: 'cloudstore_orders_v1',
    CART: 'cloudstore_cart_v1',
    INITIALIZED: 'cloudstore_seeded_v1'
  },
  
  // Paginación y límites por defecto
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 9,
    ADMIN_PAGE_SIZE: 10
  },

  // Regla explícita de cálculo de envío (compartida entre Carrito, Mock API y Backend AWS)
  SHIPPING: {
    FREE_THRESHOLD: 500.00, // Envío gratis cuando subtotal >= $500.00 MXN
    STANDARD_COST: 20.00    // Costo fijo estándar cuando 0 < subtotal < $500.00 MXN
  },

  // Límites transaccionales y de pedidos (alineados con TransactWriteItems de DynamoDB)
  ORDER_LIMITS: {
    MAX_DISTINCT_ITEMS: 50,         // Máximo razonable de productos distintos por pedido
    DYNAMODB_MAX_TRANSACT_ITEMS: 100, // Límite duro de acciones en TransactWriteItems (1 contador + 1 pedido + hasta 98 productos)
    COUNTER_ID: 'COUNTER#ORDER_NUMBER',
    INITIAL_SEQUENCE: 1005,
    MAX_CONCURRENCY_RETRIES: 3
  },

  // Simulación de latencia de red en modo mock (milisegundos)
  MOCK_DELAY_MS: 150
};

// Congelar objeto para evitar mutaciones accidentales
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
  Object.freeze(CONFIG.CURRENCY);
  Object.freeze(CONFIG.STORAGE_KEYS);
  Object.freeze(CONFIG.PAGINATION);
  Object.freeze(CONFIG.SHIPPING);
  Object.freeze(CONFIG.ORDER_LIMITS);
}

// Exportar globalmente para scripts Vanilla
window.CONFIG = CONFIG;
