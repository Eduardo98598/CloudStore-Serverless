/**
 * CloudStore Serverless - Módulo de Productos (Products)
 * Maneja la presentación y acciones de catálogo, detalle y administración de productos.
 */

const Products = {
  /**
   * Genera el HTML de una tarjeta de producto moderna
   * @param {Object} product 
   * @param {boolean} showCategory 
   * @returns {string}
   */
  renderCard(product, showCategory = true) {
    const hasDiscount = product.comparePrice && product.comparePrice > product.price;
    const discountPct = hasDiscount 
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) 
      : 0;

    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 3;

    return `
      <div class="col-12 col-sm-6 col-lg-4 mb-4">
        <div class="card h-100 product-card shadow-sm border-0 position-relative">
          ${product.featured ? '<span class="badge badge-featured position-absolute top-0 start-0 m-3 z-1">Destacado</span>' : ''}
          ${hasDiscount ? `<span class="badge badge-discount position-absolute top-0 end-0 m-3 z-1">-${discountPct}%</span>` : ''}
          
          <div class="product-image-container overflow-hidden position-relative">
            <a href="product.html?id=${product.id}">
              <img 
                src="${product.image}" 
                alt="${product.name}" 
                class="card-img-top product-img"
                loading="lazy"
                onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80';"
              >
            </a>
            <div class="quick-actions">
              <a href="product.html?id=${product.id}" class="btn btn-sm btn-light shadow-sm" title="Ver detalle">
                <i class="bi bi-eye"></i> Detalle
              </a>
            </div>
          </div>

          <div class="card-body d-flex flex-column p-4">
            ${showCategory && product.categoryName ? `
              <div class="text-uppercase text-primary small fw-semibold mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">
                ${product.categoryName}
              </div>
            ` : ''}

            <h5 class="card-title product-title mb-2">
              <a href="product.html?id=${product.id}" class="text-decoration-none text-dark stretched-link-fallback">
                ${product.name}
              </a>
            </h5>

            <p class="card-text text-secondary small product-description flex-grow-1">
              ${product.description ? (product.description.length > 95 ? product.description.substring(0, 95) + '...' : product.description) : ''}
            </p>

            <div class="d-flex align-items-center mb-3">
              <div class="text-warning me-2 small">
                ${this._renderStars(product.rating || 5.0)}
              </div>
              <span class="text-secondary small">(${product.reviewsCount || 12})</span>
            </div>

            <div class="pt-2 border-top mt-auto" style="border-color: var(--border) !important;">
              <div class="d-flex align-items-baseline gap-2 mb-2">
                <span class="fs-4 fw-bold text-dark">${UI.formatCurrency(product.price)}</span>
                ${hasDiscount ? `<span class="text-decoration-line-through text-muted small">${UI.formatCurrency(product.comparePrice)}</span>` : ''}
              </div>

              <div class="d-flex justify-content-between align-items-center">
                <span class="small ${isOutOfStock ? 'text-danger' : isLowStock ? 'text-warning' : 'text-success'}">
                  <i class="bi ${isOutOfStock ? 'bi-x-circle' : isLowStock ? 'bi-exclamation-circle' : 'bi-check2-circle'}"></i>
                  ${isOutOfStock ? 'Agotado' : isLowStock ? `¡Solo ${product.stock} restantes!` : 'Disponible'}
                </span>

                <button 
                  type="button" 
                  class="btn btn-primary btn-sm px-3 rounded-pill add-to-cart-btn" 
                  data-product-id="${product.id}"
                  ${isOutOfStock ? 'disabled' : ''}
                  title="Añadir al carrito"
                >
                  <i class="bi bi-cart-plus me-1"></i> Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Helper privado para estrellas de calificación
   */
  _renderStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars += '<i class="bi bi-star-fill"></i>';
      } else if (i === fullStars + 1 && hasHalf) {
        stars += '<i class="bi bi-star-half"></i>';
      } else {
        stars += '<i class="bi bi-star"></i>';
      }
    }
    return stars;
  },

  /**
   * Adjunta escuchadores de eventos para botones "Agregar al Carrito" en tarjetas
   * @param {HTMLElement} container 
   */
  attachCardEvents(container = document) {
    container.querySelectorAll('.add-to-cart-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const productId = button.dataset.productId;
        const res = await API.getProductById(productId);
        if (!res.success) {
          UI.showToast('No se pudo obtener información del producto', 'danger');
          return;
        }

        const addRes = Cart.addItem(res.data, 1);
        if (addRes.success) {
          UI.showToast(addRes.message, 'success');
          // Pequeña animación de feedback en el botón
          button.classList.add('btn-success');
          button.classList.remove('btn-primary');
          button.innerHTML = '<i class="bi bi-check2"></i> Agregado';
          setTimeout(() => {
            button.classList.remove('btn-success');
            button.classList.add('btn-primary');
            button.innerHTML = '<i class="bi bi-cart-plus me-1"></i> Agregar';
          }, 1500);
        } else {
          UI.showToast(addRes.message, 'warning');
        }
      });
    });
  }
};

window.Products = Products;
