/**
 * CloudStore Serverless - Capa de API Centralizada (Data Access Layer)
 * Intermedia todas las llamadas de datos de la aplicación.
 * 
 * Contrato de respuesta estándar:
 *   Promise<{
 *     success: boolean,
 *     data?: any,
 *     error?: string,
 *     message?: string
 *   }>
 * 
 * Cuando USE_MOCK_API = true:
 *   Resuelve contra el almacenamiento local persistido (localStorage).
 * Cuando USE_MOCK_API = false:
 *   Realiza peticiones HTTP estándar mediante fetch hacia Amazon API Gateway.
 */

const API = {
  /**
   * Helper genérico para peticiones HTTP reales a AWS API Gateway
   */
  async _fetch(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL.replace(/\/$/, '')}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      });

      const contentType = response.headers.get('content-type');
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || data?.error || `Error del servidor HTTP ${response.status}`,
          status: response.status
        };
      }

      return {
        success: true,
        data: data.data !== undefined ? data.data : data,
        message: data?.message
      };
    } catch (err) {
      console.error(`[API Network Error] ${options.method || 'GET'} ${url}:`, err);
      return {
        success: false,
        error: 'No se pudo conectar con el servicio de API. Verifique su conexión de red o la configuración del endpoint.'
      };
    }
  },

  /**
   * Helper para simular latencia asíncrona en modo Mock
   */
  async _mockDelay() {
    if (CONFIG.MOCK_DELAY_MS > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.MOCK_DELAY_MS));
    }
  },

  // =========================================================================
  // SERVICIOS DE PRODUCTOS
  // =========================================================================

  /**
   * Consulta productos para la tienda pública con filtros y búsqueda
   * @param {Object} filters { categoryId, search, sort, onlyFeatured }
   */
  async getProducts(filters = {}) {
    if (!CONFIG.USE_MOCK_API) {
      const query = new URLSearchParams(filters).toString();
      return this._fetch(`/products${query ? '?' + query : ''}`);
    }

    await this._mockDelay();
    try {
      let products = Storage.getAll(CONFIG.STORAGE_KEYS.PRODUCTS);

      // Solo productos activos en la tienda pública
      products = products.filter(p => p.active !== false);

      // Filtrar por categoría
      if (filters.categoryId && filters.categoryId !== 'all') {
        products = products.filter(p => p.categoryId === filters.categoryId);
      }

      // Filtrar por búsqueda de texto
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        products = products.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.description.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
        );
      }

      // Filtrar destacados
      if (filters.onlyFeatured) {
        products = products.filter(p => p.featured === true);
      }

      // Ordenamiento
      if (filters.sort) {
        switch (filters.sort) {
          case 'price-asc':
            products.sort((a, b) => a.price - b.price);
            break;
          case 'price-desc':
            products.sort((a, b) => b.price - a.price);
            break;
          case 'name-asc':
            products.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'name-desc':
            products.sort((a, b) => b.name.localeCompare(a.name));
            break;
          case 'newest':
          default:
            products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        }
      }

      return { success: true, data: products };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Consulta todos los productos para el panel de administración
   */
  async getAdminProducts(filters = {}) {
    if (!CONFIG.USE_MOCK_API) {
      // includeInactive=true indica al backend que devuelva también productos inactivos (vista admin)
      const query = new URLSearchParams({ ...filters, includeInactive: 'true' }).toString();
      return this._fetch(`/products?${query}`);
    }

    await this._mockDelay();
    try {
      let products = Storage.getAll(CONFIG.STORAGE_KEYS.PRODUCTS);

      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        products = products.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.id.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
        );
      }

      if (filters.categoryId && filters.categoryId !== 'all') {
        products = products.filter(p => p.categoryId === filters.categoryId);
      }

      if (filters.status && filters.status !== 'all') {
        const isActive = filters.status === 'active';
        products = products.filter(p => p.active === isActive);
      }

      // Más recientes primero
      products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      return { success: true, data: products };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Obtiene un producto por su ID
   */
  async getProductById(id) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/products/${id}`);
    }

    await this._mockDelay();
    const product = Storage.getById(CONFIG.STORAGE_KEYS.PRODUCTS, id);
    if (!product) {
      return { success: false, error: 'Producto no encontrado' };
    }
    return { success: true, data: product };
  },

  /**
   * Crea un nuevo producto (Admin)
   */
  async createProduct(productData) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
    }

    await this._mockDelay();
    try {
      const newProduct = {
        ...productData,
        id: 'prod-' + Date.now().toString(36),
        slug: productData.slug || (productData.name ? productData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') : 'prod-' + Date.now()),
        price: parseFloat(productData.price) || 0,
        comparePrice: productData.comparePrice ? parseFloat(productData.comparePrice) : null,
        stock: parseInt(productData.stock, 10) || 0,
        features: Array.isArray(productData.features) ? productData.features : [],
        active: productData.active !== undefined ? Boolean(productData.active) : true,
        featured: Boolean(productData.featured),
        rating: 5.0,
        reviewsCount: 0,
        createdAt: new Date().toISOString()
      };

      const saved = Storage.insert(CONFIG.STORAGE_KEYS.PRODUCTS, newProduct);
      return { success: true, data: saved, message: 'Producto creado exitosamente' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Actualiza un producto existente (Admin)
   */
  async updateProduct(id, productData) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
      });
    }

    await this._mockDelay();
    try {
      const cleanData = { ...productData };
      if (cleanData.price !== undefined) cleanData.price = parseFloat(cleanData.price);
      if (cleanData.comparePrice !== undefined) {
        cleanData.comparePrice = cleanData.comparePrice ? parseFloat(cleanData.comparePrice) : null;
      }
      if (cleanData.stock !== undefined) cleanData.stock = parseInt(cleanData.stock, 10);
      if (cleanData.active !== undefined) cleanData.active = Boolean(cleanData.active);
      if (cleanData.featured !== undefined) cleanData.featured = Boolean(cleanData.featured);

      const updated = Storage.update(CONFIG.STORAGE_KEYS.PRODUCTS, id, cleanData);
      if (!updated) {
        return { success: false, error: 'Producto no encontrado para actualizar' };
      }
      return { success: true, data: updated, message: 'Producto actualizado exitosamente' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Elimina un producto (Admin)
   */
  async deleteProduct(id) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/products/${id}`, {
        method: 'DELETE'
      });
    }

    await this._mockDelay();
    const ok = Storage.delete(CONFIG.STORAGE_KEYS.PRODUCTS, id);
    if (!ok) {
      return { success: false, error: 'Producto no encontrado para eliminar' };
    }
    return { success: true, message: 'Producto eliminado correctamente' };
  },

  /**
   * Alterna el estado activo/inactivo de un producto
   */
  async toggleProductStatus(id) {
    const res = await this.getProductById(id);
    if (!res.success) return res;
    return this.updateProduct(id, { active: !res.data.active });
  },

  // =========================================================================
  // SERVICIOS DE CATEGORÍAS
  // =========================================================================

  /**
   * Obtiene la lista de categorías
   * @param {Object} filters { includeInactive }
   *   - Por defecto devuelve solo categorías activas (tienda pública).
   *   - includeInactive = true devuelve todas, incluidas las desactivadas (panel admin).
   */
  async getCategories(filters = {}) {
    const includeInactive = filters.includeInactive === true || filters.includeInactive === 'true';

    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/categories${includeInactive ? '?includeInactive=true' : ''}`);
    }

    await this._mockDelay();
    try {
      let categories = Storage.getAll(CONFIG.STORAGE_KEYS.CATEGORIES);
      const products = Storage.getAll(CONFIG.STORAGE_KEYS.PRODUCTS);

      // Solo activas, salvo que se soliciten explícitamente las inactivas
      if (!includeInactive) {
        categories = categories.filter(cat => cat.active !== false);
      }

      // Calcular cantidad de productos actuales por categoría
      const enriched = categories.map(cat => ({
        ...cat,
        productCount: products.filter(p => p.categoryId === cat.id && p.active !== false).length
      }));

      return { success: true, data: enriched };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Crea una categoría (Admin)
   */
  async createCategory(catData) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch('/categories', {
        method: 'POST',
        body: JSON.stringify(catData)
      });
    }

    await this._mockDelay();
    try {
      const newCat = {
        ...catData,
        id: 'cat-' + (catData.slug || Date.now().toString(36)),
        active: catData.active !== undefined ? Boolean(catData.active) : true,
        productCount: 0,
        createdAt: new Date().toISOString()
      };
      const saved = Storage.insert(CONFIG.STORAGE_KEYS.CATEGORIES, newCat);
      return { success: true, data: saved, message: 'Categoría creada con éxito' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Actualiza una categoría (Admin)
   */
  async updateCategory(id, catData) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(catData)
      });
    }

    await this._mockDelay();
    const updated = Storage.update(CONFIG.STORAGE_KEYS.CATEGORIES, id, catData);
    if (!updated) {
      return { success: false, error: 'Categoría no encontrada' };
    }
    return { success: true, data: updated, message: 'Categoría actualizada con éxito' };
  },

  /**
   * Elimina una categoría (Admin)
   */
  async deleteCategory(id) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/categories/${id}`, {
        method: 'DELETE'
      });
    }

    await this._mockDelay();
    // Verificar si hay productos asignados
    const products = Storage.getAll(CONFIG.STORAGE_KEYS.PRODUCTS);
    const hasProducts = products.some(p => p.categoryId === id);
    if (hasProducts) {
      return {
        success: false,
        error: 'No se puede eliminar la categoría porque tiene productos asignados. Reasigna o elimina los productos primero.'
      };
    }

    const ok = Storage.delete(CONFIG.STORAGE_KEYS.CATEGORIES, id);
    if (!ok) {
      return { success: false, error: 'Categoría no encontrada' };
    }
    return { success: true, message: 'Categoría eliminada con éxito' };
  },

  // =========================================================================
  // SERVICIOS DE PEDIDOS (ORDERS)
  // =========================================================================

  /**
   * Obtiene todos los pedidos con filtros opcionales (Admin)
   */
  async getOrders(filters = {}) {
    if (!CONFIG.USE_MOCK_API) {
      const query = new URLSearchParams(filters).toString();
      return this._fetch(`/orders${query ? '?' + query : ''}`);
    }

    await this._mockDelay();
    try {
      const counterId = CONFIG.ORDER_LIMITS?.COUNTER_ID || 'COUNTER#ORDER_NUMBER';
      let orders = Storage.getAll(CONFIG.STORAGE_KEYS.ORDERS).filter(o => o.id !== counterId);

      // Filtrar por estado
      if (filters.status && filters.status !== 'all') {
        orders = orders.filter(o => o.status === filters.status);
      }

      // Filtrar por término de búsqueda (número de orden, cliente, teléfono, email)
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        orders = orders.filter(o =>
          (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
          (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
          (o.customer?.phone && o.customer.phone.toLowerCase().includes(q)) ||
          (o.customer?.email && o.customer.email.toLowerCase().includes(q))
        );
      }

      // Ordenar por fecha descendente
      orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      return { success: true, data: orders };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Obtiene el detalle de un pedido por ID o Número de Orden
   */
  async getOrderById(idOrNumber) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/orders/${idOrNumber}`);
    }

    await this._mockDelay();
    const counterId = CONFIG.ORDER_LIMITS?.COUNTER_ID || 'COUNTER#ORDER_NUMBER';
    const orders = Storage.getAll(CONFIG.STORAGE_KEYS.ORDERS).filter(o => o.id !== counterId);
    const order = orders.find(o => 
      String(o.id) === String(idOrNumber) || 
      String(o.orderNumber).toLowerCase() === String(idOrNumber).toLowerCase()
    );

    if (!order) {
      return { success: false, error: 'Pedido no encontrado' };
    }
    return { success: true, data: order };
  },

  /**
   * Crea y registra un nuevo pedido
   */
  async createOrder(orderPayload) {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });
    }

    await this._mockDelay();
    try {
      const rawItems = Array.isArray(orderPayload?.items) ? orderPayload.items : [];
      if (rawItems.length === 0) {
        return { success: false, status: 400, error: 'El carrito está vacío' };
      }

      // 1. Agrupar productos repetidos por productId (garantiza 1 sola operación por elemento en TransactWriteItems)
      const groupedMap = new Map();
      for (const raw of rawItems) {
        const pid = raw.productId || raw.id;
        const qty = parseInt(raw.quantity, 10);
        const rawPrice = Number(raw.price);
        if (!pid || !Number.isInteger(qty) || qty < 1) {
          return { success: false, status: 400, error: `Cantidad inválida para el producto ${pid || 'desconocido'}` };
        }
        if (raw.price === undefined || raw.price === null || Number.isNaN(rawPrice) || rawPrice < 0) {
          return { success: false, status: 400, error: `Precio inválido para el producto ${pid}` };
        }
        const existing = groupedMap.get(pid);
        if (existing && Math.abs(existing.clientPrice - rawPrice) > 0.001) {
          return {
            success: false,
            status: 409,
            error: `El precio enviado para el producto ${pid} es inconsistente. Por favor actualiza tu carrito.`
          };
        }
        groupedMap.set(pid, {
          quantity: (existing ? existing.quantity : 0) + qty,
          clientPrice: rawPrice
        });
      }

      // 2. Comprobar límite de productos distintos y límite de 100 acciones de TransactWriteItems
      const maxDistinct = CONFIG.ORDER_LIMITS?.MAX_DISTINCT_ITEMS || 50;
      const maxTransactActions = CONFIG.ORDER_LIMITS?.DYNAMODB_MAX_TRANSACT_ITEMS || 100;
      const totalTransactActions = 2 + groupedMap.size; // 1 Update contador + 1 Put pedido + N Update productos

      if (groupedMap.size > maxDistinct || totalTransactActions > maxTransactActions) {
        return {
          success: false,
          status: 400,
          error: `El pedido supera el máximo permitido de ${maxDistinct} productos distintos por transacción`
        };
      }

      // 3. Consultar catálogo y verificar consistencia de productos (activo, precio igual al de DynamoDB y stock suficiente)
      const products = Storage.getAll(CONFIG.STORAGE_KEYS.PRODUCTS);
      const snapshotItems = [];

      for (const [productId, entry] of groupedMap.entries()) {
        const { quantity, clientPrice } = entry;
        const product = products.find(p => p.id === productId);

        if (!product || product.active === false) {
          return {
            success: false,
            status: 409,
            error: `El producto ${productId} no está disponible o fue desactivado`
          };
        }

        const unitPrice = Number(product.price) || 0;
        // Comparar el precio enviado al confirmar el pedido contra el precio actual en la base de datos
        if (Math.abs(clientPrice - unitPrice) > 0.001) {
          return {
            success: false,
            status: 409,
            error: `El precio del producto "${product.name}" (${productId}) cambió recientemente. Por favor actualiza tu carrito e intenta nuevamente.`
          };
        }

        const availableStock = Number(product.stock) || 0;
        if (availableStock < quantity) {
          return {
            success: false,
            status: 409,
            error: `Stock insuficiente para el producto ${productId}. Disponible: ${availableStock}`
          };
        }

        snapshotItems.push({
          productId: product.id,
          name: product.name,
          price: unitPrice,
          quantity,
          subtotal: Number((unitPrice * quantity).toFixed(2)),
          image: product.image || ''
        });
      }

      // 4. Recalcular subtotal, envío (regla explícita) y total en el backend
      const subtotal = Number(snapshotItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));
      const freeThreshold = CONFIG.SHIPPING?.FREE_THRESHOLD ?? 500.00;
      const standardShipping = CONFIG.SHIPPING?.STANDARD_COST ?? 20.00;
      const shipping = subtotal <= 0 ? 0 : (subtotal >= freeThreshold ? 0 : standardShipping);
      const total = Number((subtotal + shipping).toFixed(2));

      // 5. Lectura consistente de COUNTER#ORDER_NUMBER y transacción atómica simulada (contador + pedido + stock)
      const counterId = CONFIG.ORDER_LIMITS?.COUNTER_ID || 'COUNTER#ORDER_NUMBER';
      const initialSeq = CONFIG.ORDER_LIMITS?.INITIAL_SEQUENCE || 1005;
      const allOrderRecords = Storage.getAll(CONFIG.STORAGE_KEYS.ORDERS);
      const counterIdx = allOrderRecords.findIndex(o => o.id === counterId);
      const realOrdersCount = allOrderRecords.filter(o => o.id !== counterId).length;
      const currentSeq = counterIdx !== -1
        ? Number(allOrderRecords[counterIdx].seq)
        : Math.max(initialSeq, 1000 + realOrdersCount);
      const nextSequence = currentSeq + 1;
      const orderNumber = `CS-2026-${nextSequence}`;
      const nowIso = new Date().toISOString();

      // Descontar inventario
      for (const item of snapshotItems) {
        const productIndex = products.findIndex(p => p.id === item.productId);
        products[productIndex].stock = (Number(products[productIndex].stock) || 0) - item.quantity;
        products[productIndex].updatedAt = nowIso;
      }

      // Actualizar elemento contador COUNTER#ORDER_NUMBER
      const updatedCounter = {
        id: counterId,
        seq: nextSequence,
        updatedAt: nowIso
      };
      if (counterIdx !== -1) {
        allOrderRecords[counterIdx] = updatedCounter;
      } else {
        allOrderRecords.push(updatedCounter);
      }

      const newOrder = {
        id: 'ord-' + Date.now().toString(36),
        orderNumber,
        entityType: 'ORDER',
        customer: {
          name: orderPayload.customer.name,
          phone: orderPayload.customer.phone,
          email: orderPayload.customer.email || '',
          address: orderPayload.customer.address,
          notes: orderPayload.customer.notes || ''
        },
        items: snapshotItems,
        subtotal,
        shipping,
        total,
        status: 'pendiente', // pendiente -> confirmado -> enviado -> cancelado
        createdAt: nowIso,
        whatsappSent: false
      };

      allOrderRecords.unshift(newOrder);
      Storage.setRaw(CONFIG.STORAGE_KEYS.PRODUCTS, products);
      Storage.setRaw(CONFIG.STORAGE_KEYS.ORDERS, allOrderRecords);

      return { success: true, data: newOrder, message: 'Pedido registrado con éxito' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Actualiza el estado de un pedido (Admin)
   * Estados permitidos: 'pendiente' | 'confirmado' | 'enviado' | 'cancelado'
   */
  async updateOrderStatus(id, newStatus, trackingNumber = '') {
    const validStatuses = ['pendiente', 'confirmado', 'enviado', 'cancelado'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}` };
    }

    if (!CONFIG.USE_MOCK_API) {
      return this._fetch(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, trackingNumber })
      });
    }

    await this._mockDelay();
    const patch = { status: newStatus };
    if (trackingNumber) {
      patch.trackingNumber = trackingNumber;
    }

    const updated = Storage.update(CONFIG.STORAGE_KEYS.ORDERS, id, patch);
    if (!updated) {
      return { success: false, error: 'Pedido no encontrado para actualizar' };
    }
    return { success: true, data: updated, message: `Estado actualizado a "${newStatus}"` };
  },

  // =========================================================================
  // SERVICIOS DE DASHBOARD ADMINISTRATIVO
  // =========================================================================

  /**
   * Obtiene métricas e indicadores de rendimiento para el dashboard
   */
  async getDashboardMetrics() {
    if (!CONFIG.USE_MOCK_API) {
      return this._fetch('/dashboard/metrics');
    }

    await this._mockDelay();
    try {
      const counterId = CONFIG.ORDER_LIMITS?.COUNTER_ID || 'COUNTER#ORDER_NUMBER';
      const orders = Storage.getAll(CONFIG.STORAGE_KEYS.ORDERS).filter(o => o.id !== counterId);
      const products = Storage.getAll(CONFIG.STORAGE_KEYS.PRODUCTS);
      const categories = Storage.getAll(CONFIG.STORAGE_KEYS.CATEGORIES);

      // Calcular ventas totales (excluyendo cancelados)
      const validOrders = orders.filter(o => o.status !== 'cancelado');
      const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      // Pedidos por estado
      const ordersPending = orders.filter(o => o.status === 'pendiente').length;
      const ordersConfirmed = orders.filter(o => o.status === 'confirmado').length;
      const ordersShipped = orders.filter(o => o.status === 'enviado').length;
      const ordersCancelled = orders.filter(o => o.status === 'cancelado').length;

      // Productos con stock bajo (menor o igual a 5 unidades)
      const lowStockProducts = products.filter(p => p.stock <= 5 && p.active !== false);

      // Pedidos recientes (últimos 5)
      const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);

      return {
        success: true,
        data: {
          totalRevenue,
          totalOrders: orders.length,
          totalProducts: products.length,
          totalCategories: categories.length,
          ordersPending,
          ordersConfirmed,
          ordersShipped,
          ordersCancelled,
          lowStockCount: lowStockProducts.length,
          lowStockProducts,
          recentOrders
        }
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

// Exponer a nivel global
window.API = API;
