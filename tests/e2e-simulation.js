/**
 * CloudStore Serverless - Suite de Pruebas de Integración y Simulación E2E
 * Ejecuta validaciones completas sobre la capa de datos, carrito, pedidos y administración.
 */

// Simulación de entorno de navegador (Window & LocalStorage)
const localStorageData = {};
global.localStorage = {
  getItem: (k) => localStorageData[k] !== undefined ? localStorageData[k] : null,
  setItem: (k, v) => { localStorageData[k] = String(v); },
  removeItem: (k) => { delete localStorageData[k]; },
  clear: () => { for (const k in localStorageData) delete localStorageData[k]; }
};

const eventListeners = {};
global.window = {
  dispatchEvent: (event) => {
    if (eventListeners[event.type]) {
      eventListeners[event.type].forEach(cb => cb(event));
    }
  },
  addEventListener: (type, cb) => {
    if (!eventListeners[type]) eventListeners[type] = [];
    eventListeners[type].push(cb);
  }
};
global.CustomEvent = class CustomEvent {
  constructor(type, params) {
    this.type = type;
    this.detail = params?.detail;
  }
};

// Cargar scripts del frontend
require('../frontend/js/config.js');
global.CONFIG = window.CONFIG;

require('../frontend/js/mock-data.js');
global.MOCK_CATEGORIES = window.MOCK_CATEGORIES;
global.MOCK_PRODUCTS = window.MOCK_PRODUCTS;
global.MOCK_ORDERS = window.MOCK_ORDERS;

require('../frontend/js/storage.js');
global.Storage = window.Storage;

require('../frontend/js/api.js');
global.API = window.API;

require('../frontend/js/cart.js');
global.Cart = window.Cart;

// Mock de UI necesario para órdenes y formato
global.UI = {
  formatCurrency: (amount) => `$${Number(amount).toFixed(2)}`,
  formatDate: (iso) => new Date(iso).toLocaleDateString('es-MX'),
  showToast: (msg, type) => console.log(`   [Toast ${type || 'info'}]: ${msg}`)
};

require('../frontend/js/orders.js');
global.Orders = window.Orders;

// =========================================================================
// EJECUCIÓN DE PRUEBAS
// =========================================================================

async function runTests() {
  console.log('=======================================================');
  console.log('🧪 Iniciando Suite de Pruebas CloudStore Serverless');
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

  // TEST 1: Inicialización y persistencia
  console.log('\n--- 1. Pruebas de Almacenamiento & Semilla Inicial ---');
  Storage.init();
  const initProducts = Storage.getAll(CONFIG.STORAGE_KEYS.PRODUCTS);
  const initCategories = Storage.getAll(CONFIG.STORAGE_KEYS.CATEGORIES);
  const initOrders = Storage.getAll(CONFIG.STORAGE_KEYS.ORDERS);

  assert(initProducts.length >= 12, `Se cargaron al menos 12 productos iniciales (actual: ${initProducts.length})`);
  assert(initCategories.length >= 4, `Se cargaron al menos 4 categorías iniciales (actual: ${initCategories.length})`);
  assert(initOrders.length >= 5, `Se cargaron al menos 5 pedidos iniciales (actual: ${initOrders.length})`);

  // TEST 2: Consultas y filtros de catálogo (API)
  console.log('\n--- 2. Pruebas de Consulta de Productos & Filtros (API) ---');
  const allActive = await API.getProducts();
  assert(allActive.success && allActive.data.length > 0, 'Consulta de productos activos exitosa');

  const laptops = await API.getProducts({ categoryId: 'cat-laptops' });
  assert(laptops.success && laptops.data.every(p => p.categoryId === 'cat-laptops'), 'Filtro por categoría funciona correctamente');

  const searchResult = await API.getProducts({ search: 'Sony' });
  assert(searchResult.success && searchResult.data.some(p => p.name.includes('Sony')), 'Búsqueda por texto "Sony" encuentra resultados');

  const sortedPrice = await API.getProducts({ sort: 'price-asc' });
  let isAsc = true;
  for (let i = 0; i < sortedPrice.data.length - 1; i++) {
    if (sortedPrice.data[i].price > sortedPrice.data[i + 1].price) {
      isAsc = false;
      break;
    }
  }
  assert(isAsc, 'Ordenamiento por precio ascendente verificado');

  // TEST 3: Lógica del Carrito de Compras
  console.log('\n--- 3. Pruebas del Carrito de Compras (Cart) ---');
  Cart.clear();
  assert(Cart.getItems().length === 0, 'Carrito se vacía correctamente');

  const testProduct = initProducts[0]; // Ej. MacBook Pro
  const addRes1 = Cart.addItem(testProduct, 2);
  assert(addRes1.success && Cart.getTotalItemsCount() === 2, 'Se agregaron 2 unidades al carrito');

  const overStockRes = Cart.addItem(testProduct, 9999);
  assert(!overStockRes.success, 'Validación de límite de stock en carrito rechaza cantidades excesivas');

  const updateRes = Cart.updateQuantity(testProduct.id, 1);
  assert(updateRes.success && Cart.getTotalItemsCount() === 1, 'Actualización de cantidad a 1 unidad exitosa');

  // Regla de envío: si subtotal >= 500, envío es gratis
  const summary = Cart.getSummary();
  if (summary.subtotal >= 500) {
    assert(summary.shipping === 0 && summary.isFreeShipping, 'Envío gratis aplicado para compras >= $500');
  }

  // TEST 4: Generación de Pedidos & WhatsApp
  console.log('\n--- 4. Pruebas de Registro de Pedidos & Enlace WhatsApp ---');
  const initialStock = testProduct.stock;
  
  const orderRes = await Orders.submitOrder({
    name: 'Prueba de Automatización E2E',
    phone: '+52 999 000 1122',
    email: 'qa@cloudstore.dev',
    address: 'Calle 60 #100 x 21 y 23, Mérida, Yucatán',
    notes: 'Entregar antes de las 5pm'
  });

  assert(orderRes.success && orderRes.order && orderRes.order.orderNumber.startsWith('CS-2026-'), 'Pedido creado y registrado con folio amigable');
  assert(Cart.getItems().length === 0, 'El carrito se limpió automáticamente tras crear la orden');

  // Comprobar decremento de stock
  const updatedProduct = Storage.getById(CONFIG.STORAGE_KEYS.PRODUCTS, testProduct.id);
  assert(updatedProduct.stock === initialStock - 1, `Stock decrementado correctamente (antes: ${initialStock}, ahora: ${updatedProduct.stock})`);

  // Comprobar formato de WhatsApp
  const waUrl = Orders.generateWhatsAppUrl(orderRes.order);
  assert(waUrl.includes('wa.me') && waUrl.includes(encodeURIComponent(orderRes.order.orderNumber)), 'Enlace de WhatsApp generado con número de orden codificado');

  // TEST 5: Panel Administrativo y Métricas
  console.log('\n--- 5. Pruebas del Panel Administrativo (KPIs & CRUD) ---');
  const metricsRes = await API.getDashboardMetrics();
  assert(metricsRes.success && metricsRes.data.totalOrders > 0, 'Cálculo de métricas del Dashboard exitoso');
  assert(metricsRes.data.totalRevenue > 0, `Total de ventas acumuladas válido: $${metricsRes.data.totalRevenue}`);

  // CRUD de Producto
  const newProductRes = await API.createProduct({
    name: 'Mousepad Gamer RGB CloudStore',
    categoryId: 'cat-perifericos',
    categoryName: 'Periféricos & Accesorios',
    price: 35.00,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7',
    description: 'Mousepad extendido con iluminación LED RGB para pruebas.',
    active: true
  });
  assert(newProductRes.success && newProductRes.data.id, 'Creación de producto desde Admin exitosa');

  const prodId = newProductRes.data.id;
  const updateProdRes = await API.updateProduct(prodId, { price: 39.99 });
  assert(updateProdRes.success && updateProdRes.data.price === 39.99, 'Actualización de precio de producto exitosa');

  const toggleRes = await API.toggleProductStatus(prodId);
  assert(toggleRes.success && toggleRes.data.active === false, 'Alternancia de estado (desactivación) exitosa');

  const deleteProdRes = await API.deleteProduct(prodId);
  assert(deleteProdRes.success, 'Eliminación de producto exitosa');

  // Actualización de estado de pedido
  const statusUpdateRes = await API.updateOrderStatus(orderRes.order.id, 'enviado', 'GUIA-TEST-998877');
  assert(statusUpdateRes.success && statusUpdateRes.data.status === 'enviado', 'Actualización de estado de pedido a "enviado" con número de guía');

  // =========================================================================
  // RESULTADOS
  // =========================================================================
  console.log('\n=======================================================');
  console.log(`📊 RESUMEN: ${passed} pruebas superadas, ${failed} fallidas`);
  console.log('=======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✨ Todas las capas y operaciones han sido verificadas exitosamente.\n');
  }
}

runTests().catch(err => {
  console.error('Error fatal durante la prueba:', err);
  process.exit(1);
});
