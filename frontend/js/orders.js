/**
 * CloudStore Serverless - Módulo de Pedidos (Orders)
 * Administra la creación de pedidos, integración con WhatsApp y control de estados.
 */

const Orders = {
  /**
   * Construye el enlace directo a la API de WhatsApp con el resumen formateado del pedido
   * @param {Object} order 
   * @param {string|null} targetPhone Teléfono destino específico (opcional)
   * @param {boolean} isAdmin Si es mensaje del administrador hacia el cliente
   * @returns {string} Enlace wa.me
   */
  generateWhatsAppUrl(order, targetPhone = null, isAdmin = false) {
    const storeCfg = (typeof window !== 'undefined' && window.STORE_CONFIG) ? window.STORE_CONFIG : null;
    const storeName = (storeCfg && storeCfg.storeName) || 'CloudStore';
    const configuredPhone = (storeCfg && storeCfg.contact && storeCfg.contact.whatsappPhone) || CONFIG.WHATSAPP_PHONE;
    const rawPhone = targetPhone || (isAdmin ? order.customer?.phone : configuredPhone) || '';
    const phone = rawPhone.replace(/[^0-9]/g, '');
    
    // Formatear items del pedido
    let itemsText = '';
    (order.items || []).forEach((item, index) => {
      itemsText += `  ${index + 1}. *${item.name}*\n     ${item.quantity} x ${UI.formatCurrency(item.price)} = *${UI.formatCurrency(item.subtotal)}*\n`;
    });

    const greeting = isAdmin
      ? `👋 *¡Hola ${order.customer?.name}!* Te contactamos de *${storeName}* con relación a tu pedido:`
      : `🛒 *PEDIDO ${order.orderNumber} (${storeName})*`;

    const lines = [
      greeting,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Folio:* ${order.orderNumber}`,
      `📌 *Estado actual:* ${order.status.toUpperCase()}`,
      order.trackingNumber ? `🚚 *Guía de rastreo:* ${order.trackingNumber}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Cliente:* ${order.customer?.name || 'Cliente'}`,
      `📞 *Teléfono:* ${order.customer?.phone || 'N/A'}`,
      order.customer?.email ? `✉️ *Email:* ${order.customer.email}` : null,
      `📍 *Dirección de Entrega:*\n${order.customer?.address || 'No especificada'}`,
      order.customer?.notes ? `📝 *Notas:* ${order.customer.notes}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🛍️ *DETALLE DE ARTÍCULOS:*`,
      itemsText.trimEnd(),
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `💵 *Subtotal:* ${UI.formatCurrency(order.subtotal)}`,
      `🚚 *Envío:* ${order.shipping > 0 ? UI.formatCurrency(order.shipping) : '¡Gratis!'}`,
      `💰 *TOTAL:* ${UI.formatCurrency(order.total)}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 *Fecha:* ${UI.formatDate(order.createdAt)}`,
      ``,
      isAdmin 
        ? `_¿Tienes alguna duda o confirmación adicional? Estamos a tus órdenes._`
        : `_Por favor confirma la recepción de mi pedido para coordinar la entrega. ¡Muchas gracias!_`
    ].filter(line => line !== null);

    const message = lines.join('\n');
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  },

  /**
   * Abre directamente la ventana de WhatsApp Web o App
   * @param {Object} order 
   * @param {string|null} targetPhone
   * @param {boolean} isAdmin
   */
  openWhatsApp(order, targetPhone = null, isAdmin = false) {
    const url = this.generateWhatsAppUrl(order, targetPhone, isAdmin);
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Valida y procesa un nuevo pedido desde el formulario de checkout
   * @param {Object} customerData { name, phone, email, address, notes }
   * @returns {Promise<{ success: boolean, order?: Object, error?: string }>}
   */
  async submitOrder(customerData) {
    const summary = Cart.getSummary();

    if (!summary.items || summary.items.length === 0) {
      return { success: false, error: 'El carrito de compras está vacío' };
    }

    if (!customerData.name || !customerData.name.trim()) {
      return { success: false, error: 'El nombre completo del cliente es obligatorio' };
    }

    if (!customerData.phone || !customerData.phone.trim()) {
      return { success: false, error: 'El número de teléfono es obligatorio para la coordinación por WhatsApp' };
    }

    if (!customerData.address || !customerData.address.trim()) {
      return { success: false, error: 'La dirección de entrega es obligatoria' };
    }

    const orderPayload = {
      customer: {
        name: customerData.name.trim(),
        phone: customerData.phone.trim(),
        email: customerData.email ? customerData.email.trim() : '',
        address: customerData.address.trim(),
        notes: customerData.notes ? customerData.notes.trim() : ''
      },
      items: summary.items,
      subtotal: summary.subtotal,
      shipping: summary.shipping,
      total: summary.total
    };

    const res = await API.createOrder(orderPayload);
    if (res.success) {
      // Limpiar el carrito tras registrar la orden
      Cart.clear();
      return { success: true, order: res.data };
    } else {
      return { success: false, error: res.error || 'Error al guardar el pedido' };
    }
  }
};

window.Orders = Orders;
