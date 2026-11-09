/**
 * CloudStore Serverless - Gestor de Carrito de Compras (Cart)
 * Maneja el estado local del carrito con persistencia en localStorage,
 * control de stock en tiempo real y cálculo de importes.
 */

const Cart = {
  /**
   * Obtiene la lista actual de items en el carrito
   * @returns {Array}
   */
  getItems() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error al recuperar items del carrito:', e);
      return [];
    }
  },

  /**
   * Guarda los items en localStorage y notifica a la UI
   * @param {Array} items 
   */
  _save(items) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('cloudstore:cart-updated', { detail: { items } }));
    } catch (e) {
      console.error('Error al guardar carrito:', e);
    }
  },

  /**
   * Agrega un producto al carrito
   * @param {Object} product 
   * @param {number} quantity 
   * @returns {{ success: boolean, message: string }}
   */
  addItem(product, quantity = 1) {
    const qtyToAdd = parseInt(quantity, 10) || 1;
    if (qtyToAdd <= 0) {
      return { success: false, message: 'La cantidad debe ser mayor a cero' };
    }

    const items = this.getItems();
    const index = items.findIndex(item => item.productId === product.id);

    const currentQtyInCart = index !== -1 ? items[index].quantity : 0;
    const maxStock = product.stock !== undefined ? product.stock : 999;

    if (currentQtyInCart + qtyToAdd > maxStock) {
      const availableToAdd = maxStock - currentQtyInCart;
      return {
        success: false,
        message: availableToAdd > 0
          ? `Solo puedes agregar ${availableToAdd} unidad(es) más. Stock disponible: ${maxStock}`
          : `Ya tienes el máximo disponible en stock (${maxStock}) en tu carrito`
      };
    }

    if (index !== -1) {
      items[index].quantity += qtyToAdd;
      items[index].subtotal = items[index].quantity * items[index].price;
    } else {
      items.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80',
        stock: maxStock,
        categoryName: product.categoryName || '',
        quantity: qtyToAdd,
        subtotal: qtyToAdd * (Number(product.price) || 0)
      });
    }

    this._save(items);
    return {
      success: true,
      message: `"${product.name}" agregado al carrito (${qtyToAdd} unid.)`
    };
  },

  /**
   * Actualiza la cantidad exacta de un item
   * @param {string} productId 
   * @param {number} newQuantity 
   */
  updateQuantity(productId, newQuantity) {
    const qty = parseInt(newQuantity, 10);
    const items = this.getItems();
    const index = items.findIndex(item => item.productId === productId);

    if (index === -1) {
      return { success: false, message: 'Producto no encontrado en el carrito' };
    }

    if (qty <= 0) {
      return this.removeItem(productId);
    }

    const item = items[index];
    if (qty > item.stock) {
      return {
        success: false,
        message: `No hay suficiente stock. Máximo disponible: ${item.stock}`
      };
    }

    item.quantity = qty;
    item.subtotal = qty * item.price;
    this._save(items);
    return { success: true, message: 'Cantidad actualizada' };
  },

  /**
   * Elimina un producto del carrito
   * @param {string} productId 
   */
  removeItem(productId) {
    let items = this.getItems();
    const initialLen = items.length;
    items = items.filter(item => item.productId !== productId);

    if (items.length !== initialLen) {
      this._save(items);
      return { success: true, message: 'Producto removido del carrito' };
    }
    return { success: false, message: 'El producto no estaba en el carrito' };
  },

  /**
   * Vacía completamente el carrito
   */
  clear() {
    this._save([]);
    return { success: true, message: 'Carrito vaciado' };
  },

  /**
   * Obtiene la cantidad total de unidades en el carrito
   */
  getTotalItemsCount() {
    const items = this.getItems();
    return items.reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 0), 0);
  },

  /**
   * Obtiene el subtotal acumulado
   */
  getSubtotal() {
    const items = this.getItems();
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  },

  /**
   * Calcula el costo de envío según la regla explícita de negocio:
   * - Subtotal == 0        -> $0.00
   * - Subtotal >= $500.00  -> $0.00 (Envío gratis)
   * - 0 < Subtotal < $500  -> $20.00 (Envío estándar)
   */
  getShipping() {
    const subtotal = this.getSubtotal();
    if (subtotal <= 0) return 0;
    const threshold = CONFIG.SHIPPING?.FREE_THRESHOLD ?? 500.00;
    const standardCost = CONFIG.SHIPPING?.STANDARD_COST ?? 20.00;
    return subtotal >= threshold ? 0 : standardCost;
  },

  /**
   * Calcula el gran total
   */
  getTotal() {
    return this.getSubtotal() + this.getShipping();
  },

  /**
   * Devuelve un resumen completo de los cálculos
   */
  getSummary() {
    const subtotal = this.getSubtotal();
    const shipping = this.getShipping();
    const total = subtotal + shipping;
    const itemsCount = this.getTotalItemsCount();

    return {
      items: this.getItems(),
      itemsCount,
      subtotal,
      shipping,
      isFreeShipping: shipping === 0 && subtotal > 0,
      total
    };
  }
};

// Exponer globalmente
window.Cart = Cart;
