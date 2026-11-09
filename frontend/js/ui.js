/**
 * CloudStore Serverless - Utilidades de Interfaz de Usuario (UI)
 * Centraliza notificaciones, formateadores, insignias y modales.
 */

const UI = {
  /**
   * Muestra una notificación Toast flotante y moderna
   * @param {string} message Mensaje a mostrar
   * @param {'success'|'danger'|'warning'|'info'} type Tipo de alerta
   * @param {number} duration Duración en ms
   */
  showToast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('cs-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cs-toast-container';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const icons = {
      success: 'bi-check-circle-fill text-success',
      danger: 'bi-x-circle-fill text-danger',
      warning: 'bi-exclamation-triangle-fill text-warning',
      info: 'bi-info-circle-fill text-info'
    };

    const iconClass = icons[type] || icons.info;

    const toastHtml = `
      <div id="${toastId}" class="toast align-items-center shadow-lg border-0 mb-2 modern-toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center py-3">
            <i class="bi ${iconClass} fs-5 me-2"></i>
            <div>${message}</div>
          </div>
          <button type="button" class="btn-close btn-close-white me-3 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    
    // Inicializar con Bootstrap Toast si está disponible
    if (window.bootstrap && window.bootstrap.Toast) {
      const bsToast = new window.bootstrap.Toast(toastElement, { delay: duration });
      bsToast.show();
      toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
      });
    } else {
      // Fallback si bootstrap JS aún no carga
      setTimeout(() => {
        toastElement.remove();
      }, duration);
    }
  },

  /**
   * Formatea un número como moneda según la configuración
   * @param {number} amount 
   * @returns {string}
   */
  formatCurrency(amount) {
    const val = Number(amount) || 0;
    try {
      return new Intl.NumberFormat(CONFIG.CURRENCY.LOCALE, {
        style: 'currency',
        currency: CONFIG.CURRENCY.CODE,
        minimumFractionDigits: 2
      }).format(val);
    } catch (e) {
      return `${CONFIG.CURRENCY.SYMBOL}${val.toFixed(2)}`;
    }
  },

  /**
   * Formatea una fecha ISO a formato local legible
   * @param {string} isoString 
   * @returns {string}
   */
  formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(CONFIG.CURRENCY.LOCALE, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  },

  /**
   * Devuelve una insignia HTML coloreada para el estado de un pedido
   * @param {'pendiente'|'confirmado'|'enviado'|'cancelado'} status 
   */
  renderStatusBadge(status) {
    const statusMap = {
      pendiente: { label: 'Pendiente', class: 'badge-status-pendiente', icon: 'bi-clock' },
      confirmado: { label: 'Confirmado', class: 'badge-status-confirmado', icon: 'bi-check-circle' },
      enviado: { label: 'Enviado', class: 'badge-status-enviado', icon: 'bi-truck' },
      cancelado: { label: 'Cancelado', class: 'badge-status-cancelado', icon: 'bi-x-circle' }
    };

    const info = statusMap[status] || { label: status, class: 'bg-secondary', icon: 'bi-dot' };
    return `<span class="badge ${info.class} d-inline-flex align-items-center gap-1 px-2.5 py-1.5"><i class="bi ${info.icon}"></i> ${info.label}</span>`;
  },

  /**
   * Actualiza todos los contadores de carrito en la barra de navegación
   */
  updateNavbarCartCount() {
    const count = window.Cart ? window.Cart.getTotalItemsCount() : 0;
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    });
  },

  /**
   * Extrae los parámetros de la URL actual
   * @returns {Object}
   */
  getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  },

  /**
   * Muestra un modal de confirmación dinámico
   */
  confirm(title, message, confirmBtnText = 'Confirmar', isDanger = false) {
    return new Promise((resolve) => {
      let modalEl = document.getElementById('cs-dynamic-confirm-modal');
      if (!modalEl) {
        const modalHtml = `
          <div class="modal fade" id="cs-dynamic-confirm-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content border shadow-lg" style="background: var(--surface); color: var(--text-primary); border-color: var(--border) !important;">
                <div class="modal-header border-bottom" style="background: #F8FAFC; border-color: var(--border) !important;">
                  <h5 class="modal-title fw-bold text-dark" id="cs-confirm-title">Confirmar acción</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body py-4 text-secondary" id="cs-confirm-body">
                  ¿Está seguro de continuar?
                </div>
                <div class="modal-footer border-top" style="background: #F8FAFC; border-color: var(--border) !important;">
                  <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="cs-confirm-cancel">Cancelar</button>
                  <button type="button" class="btn btn-primary" id="cs-confirm-ok">Aceptar</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('cs-dynamic-confirm-modal');
      }

      document.getElementById('cs-confirm-title').textContent = title;
      document.getElementById('cs-confirm-body').innerHTML = message;
      
      const okBtn = document.getElementById('cs-confirm-ok');
      okBtn.textContent = confirmBtnText;
      okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

      const bsModal = new window.bootstrap.Modal(modalEl);
      
      const cleanup = () => {
        okBtn.onclick = null;
      };

      okBtn.onclick = () => {
        cleanup();
        bsModal.hide();
        resolve(true);
      };

      modalEl.addEventListener('hidden.bs.modal', () => {
        cleanup();
        resolve(false);
      }, { once: true });

      bsModal.show();
    });
  },

  /**
   * Helper de estado de carga para botones
   */
  setLoading(button, isLoading, originalHtml = '') {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Procesando...
      `;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalHtml || originalHtml || 'Aceptar';
    }
  },

  /**
   * Aplica automáticamente la identidad comercial definida en frontend/config/store.config.js
   * a la navegación, panel administrativo, página principal, formularios y footer.
   */
  applyStoreConfig() {
    const cfg = window.STORE_CONFIG;
    if (!cfg || typeof document === 'undefined') return;

    const isAdminPage = window.location.pathname.includes('/admin/');
    const assetPrefix = isAdminPage ? '../' : '';
    const resolveAsset = (relPath) => {
      if (!relPath) return '';
      if (/^(https?:|data:|\/)/i.test(relPath)) return relPath;
      return assetPrefix + relPath.replace(/^\.?\//, '');
    };

    const storeName = cfg.storeName || 'CloudStore';
    const storeBadge = cfg.storeBadge !== undefined ? cfg.storeBadge : 'Serverless';
    const logoIcon = (cfg.branding && cfg.branding.logoIcon) || 'bi-cloud-check-fill';
    const useLogoImg = Boolean(cfg.branding && cfg.branding.useLogoImage && cfg.branding.logoImage);
    const logoImgUrl = useLogoImg ? resolveAsset(cfg.branding.logoImage) : '';

    // 1. Título de la pestaña y Favicon
    if (document.title && storeName !== 'CloudStore') {
      document.title = document.title.replace(/CloudStore/g, storeName);
    }
    if (cfg.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && !isAdminPage && window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        metaDesc.setAttribute('content', cfg.description);
      }
    }
    if (cfg.branding && cfg.branding.favicon) {
      let favEl = document.querySelector('link[rel="icon"]');
      if (!favEl) {
        favEl = document.createElement('link');
        favEl.rel = 'icon';
        document.head.appendChild(favEl);
      }
      favEl.href = resolveAsset(cfg.branding.favicon);
    }

    // 2. Logotipo y nombre en Navbar principal (Tienda)
    document.querySelectorAll('.navbar-brand').forEach(brandEl => {
      const visualHtml = useLogoImg
        ? `<img src="${logoImgUrl}" alt="${storeName}" class="brand-logo-img" onerror="this.outerHTML='<i class=\\'bi ${logoIcon} text-primary fs-3\\'></i>'">`
        : `<i class="bi ${logoIcon} text-primary fs-3"></i>`;
      const badgeHtml = storeBadge
        ? `<span class="badge brand-badge text-uppercase ms-1">${storeBadge}</span>`
        : '';
      brandEl.innerHTML = `
        ${visualHtml}
        <span class="brand-gradient fs-4">${storeName}</span>
        ${badgeHtml}
      `;
    });

    // 3. Logotipo y nombre en Sidebar (Panel Administrativo)
    document.querySelectorAll('.sidebar-brand a').forEach(sideEl => {
      const visualHtml = useLogoImg
        ? `<img src="${logoImgUrl}" alt="${storeName}" class="brand-logo-img" style="width:28px;height:28px;" onerror="this.outerHTML='<i class=\\'bi ${logoIcon} text-primary fs-4\\'></i>'">`
        : `<i class="bi ${logoIcon} text-primary fs-4"></i>`;
      sideEl.innerHTML = `
        ${visualHtml}
        <div>
          <div class="brand-gradient fw-bold">${storeName}</div>
          <div class="text-secondary small" style="font-size: 0.65rem;">PANEL DE CONTROL</div>
        </div>
      `;
    });

    // 4. Hero Section, Beneficios y Banner WhatsApp en la Página Principal (index.html)
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
      const heroTitle = heroSection.querySelector('h1');
      const heroDesc = heroSection.querySelector('p.lead');
      const heroBadge = heroSection.querySelector('.badge.bg-primary');
      const heroWelcomeMsg = heroBadge ? heroBadge.nextElementSibling : null;

      if (heroTitle && cfg.slogan) heroTitle.textContent = cfg.slogan;
      if (heroDesc && cfg.description) heroDesc.textContent = cfg.description;
      if (heroBadge && cfg.hero && cfg.hero.welcomeBadge !== undefined) {
        heroBadge.textContent = cfg.hero.welcomeBadge;
      }
      if (heroWelcomeMsg && cfg.hero && cfg.hero.welcomeMessage !== undefined) {
        heroWelcomeMsg.textContent = cfg.hero.welcomeMessage;
      }

      const heroButtons = heroSection.querySelectorAll('.btn');
      if (heroButtons[0] && cfg.hero && cfg.hero.primaryButtonText) {
        heroButtons[0].innerHTML = `<i class="bi bi-grid-fill me-2"></i> ${cfg.hero.primaryButtonText}`;
      }
      if (heroButtons[1] && cfg.hero && cfg.hero.secondaryButtonText) {
        heroButtons[1].innerHTML = `${cfg.hero.secondaryButtonText} <i class="bi bi-arrow-down-short ms-1"></i>`;
      }

      if (cfg.hero && cfg.hero.showBannerImage && cfg.hero.bannerImage) {
        let bannerWrapper = heroSection.querySelector('.hero-banner-wrapper');
        if (!bannerWrapper) {
          bannerWrapper = document.createElement('div');
          bannerWrapper.className = 'hero-banner-wrapper mt-4';
          bannerWrapper.innerHTML = `<img src="${resolveAsset(cfg.hero.bannerImage)}" alt="${cfg.hero.bannerAlt || storeName}" class="hero-banner-img img-fluid" onerror="this.parentElement.style.display='none'">`;
          const col = heroSection.querySelector('.col-lg-9, .col-xl-8');
          if (col) col.appendChild(bannerWrapper);
        }
      }
    }

    // Beneficios comerciales en index.html
    if (Array.isArray(cfg.benefits) && cfg.benefits.length === 3 && heroSection) {
      const benefitsSection = document.querySelector('main > section.bg-surface');
      if (benefitsSection) {
        const cols = benefitsSection.querySelectorAll('.col-md-4');
        cfg.benefits.forEach((b, idx) => {
          if (!cols[idx]) return;
          const iconEl = cols[idx].querySelector('i.bi');
          const titleEl = cols[idx].querySelector('h6');
          const descEl = cols[idx].querySelector('p');
          if (iconEl && b.icon) iconEl.className = `bi ${b.icon}`;
          if (titleEl && b.title) titleEl.textContent = b.title;
          if (descEl && b.description) descEl.textContent = b.description;
        });
      }
    }

    // Banner inferior de WhatsApp en index.html
    if (cfg.whatsappCta && heroSection) {
      const ctaSection = document.querySelector('.btn-whatsapp')?.closest('section');
      if (ctaSection) {
        const badgeEl = ctaSection.querySelector('.badge.bg-success');
        const titleEl = ctaSection.querySelector('h3');
        const descEl = ctaSection.querySelector('p');
        const btnEl = ctaSection.querySelector('.btn-whatsapp');
        if (badgeEl && cfg.whatsappCta.badge) {
          badgeEl.innerHTML = `<i class="bi bi-chat-dots-fill me-1"></i> ${cfg.whatsappCta.badge}`;
        }
        if (titleEl && cfg.whatsappCta.title) titleEl.textContent = cfg.whatsappCta.title;
        if (descEl && cfg.whatsappCta.description) descEl.textContent = cfg.whatsappCta.description;
        if (btnEl && cfg.whatsappCta.buttonText) {
          btnEl.innerHTML = `<i class="bi bi-whatsapp me-2"></i> ${cfg.whatsappCta.buttonText}`;
        }
      }
    }

    // 5. Footer en todas las páginas públicas
    document.querySelectorAll('.cs-footer').forEach(footerEl => {
      // Marca en el footer
      const footerBrandContainer = footerEl.querySelector('.brand-gradient')?.parentElement;
      if (footerBrandContainer) {
        const visualHtml = useLogoImg
          ? `<img src="${logoImgUrl}" alt="${storeName}" class="brand-logo-img" onerror="this.outerHTML='<i class=\\'bi ${logoIcon} text-primary fs-3\\'></i>'">`
          : `<i class="bi ${logoIcon} text-primary fs-3"></i>`;
        footerBrandContainer.innerHTML = `
          ${visualHtml}
          <span class="brand-gradient fs-4">${storeName}</span>
        `;
      }

      // Descripción del footer
      const firstColDesc = footerEl.querySelector('.col-lg-4 > p.text-secondary');
      if (firstColDesc && cfg.footerDescription) {
        firstColDesc.textContent = cfg.footerDescription;
      }

      // Contacto (Email, WhatsApp y Redes Sociales)
      const emailIcon = footerEl.querySelector('.bi-envelope');
      if (emailIcon && emailIcon.parentElement && cfg.contact?.email) {
        emailIcon.parentElement.innerHTML = `<i class="bi bi-envelope me-2"></i>${cfg.contact.email}`;
      }
      const waIcon = footerEl.querySelector('.bi-whatsapp');
      if (waIcon && waIcon.parentElement && cfg.contact?.whatsappDisplay) {
        waIcon.parentElement.innerHTML = `<i class="bi bi-whatsapp me-2"></i>${cfg.contact.whatsappDisplay}`;
      }

      if (cfg.social) {
        const socialLinks = [
          { key: 'facebook', icon: 'bi-facebook', label: 'Facebook', url: cfg.social.facebook },
          { key: 'instagram', icon: 'bi-instagram', label: 'Instagram', url: cfg.social.instagram },
          { key: 'tiktok', icon: 'bi-tiktok', label: 'TikTok', url: cfg.social.tiktok },
          { key: 'github', icon: 'bi-github', label: 'GitHub', url: cfg.social.github }
        ].filter(s => s.url && String(s.url).trim());

        const contactCol = waIcon ? waIcon.closest('[class*="col-"]') : null;
        if (contactCol && socialLinks.length > 0 && !contactCol.querySelector('.cs-social-links')) {
          const socialDiv = document.createElement('div');
          socialDiv.className = 'cs-social-links d-flex align-items-center gap-3 mt-3';
          socialDiv.innerHTML = socialLinks.map(s =>
            `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="footer-link fs-5" title="${s.label}"><i class="bi ${s.icon}"></i></a>`
          ).join('');
          contactCol.appendChild(socialDiv);
        }
      }

      // Copyright y créditos
      const bottomBar = footerEl.querySelector('.border-top');
      if (bottomBar) {
        const paragraphs = bottomBar.querySelectorAll('p');
        if (paragraphs[0] && cfg.copyrightText) {
          paragraphs[0].textContent = cfg.copyrightText;
        }
        if (paragraphs[1] && cfg.footerCredits) {
          paragraphs[1].textContent = cfg.footerCredits;
        }
      } else {
        const singleCopy = footerEl.querySelector('p.mb-0');
        if (singleCopy && cfg.copyrightText) {
          singleCopy.textContent = cfg.copyrightText;
        }
      }
    });
  }
};

// Exponer globalmente
window.UI = UI;

// Escuchar cambios de carrito, aplicar configuración de tienda y actualizar badge
window.addEventListener('DOMContentLoaded', () => {
  UI.applyStoreConfig();
  UI.updateNavbarCartCount();
});
window.addEventListener('cloudstore:cart-updated', () => {
  UI.updateNavbarCartCount();
});
