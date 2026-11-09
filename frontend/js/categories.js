/**
 * CloudStore Serverless - Módulo de Categorías (Categories)
 * Operaciones CRUD y administración de categorías de catálogo.
 */

const Categories = {
  /**
   * Carga y renderiza el listado de categorías en la tabla de administración
   */
  async loadAdminCategoriesTable(tableBodyId) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-5 text-secondary">
          <div class="spinner-border spinner-border-sm text-primary me-2"></div> Cargando categorías...
        </td>
      </tr>
    `;

    // Vista admin: incluir categorías desactivadas
    const res = await API.getCategories({ includeInactive: true });
    if (!res.success || !res.data) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5 text-danger">
            <i class="bi bi-exclamation-triangle fs-4 d-block mb-2"></i>
            Error al cargar categorías: ${res.error || 'Error desconocido'}
          </td>
        </tr>
      `;
      return;
    }

    const categories = res.data;
    if (categories.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5 text-secondary">
            No se han registrado categorías aún.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = categories.map(cat => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div class="rounded-3 p-2 bg-light border text-primary">
              <i class="bi ${cat.icon || 'bi-tag'} fs-5"></i>
            </div>
            <div>
              <div class="fw-bold text-dark">${cat.name}</div>
              <div class="text-secondary small font-monospace">${cat.id}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-secondary border px-2 py-1 font-monospace">/${cat.slug}</span>
        </td>
        <td class="text-secondary small" style="max-width: 280px;">
          ${cat.description || 'Sin descripción'}
        </td>
        <td>
          <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1">
            ${cat.productCount || 0} producto(s)
          </span>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary btn-edit-category" data-id="${cat.id}" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-delete-category" data-id="${cat.id}" data-name="${cat.name}" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    this.attachAdminEvents(tbody);
  },

  /**
   * Asocia eventos de edición y eliminación
   */
  attachAdminEvents(container) {
    // Editar
    container.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const res = await API.getCategories({ includeInactive: true });
        if (!res.success) return;
        const cat = res.data.find(c => c.id === id);
        if (!cat) return;

        // Abrir modal con datos cargados
        const modalEl = document.getElementById('categoryModal');
        if (!modalEl) return;

        document.getElementById('catModalTitle').textContent = 'Editar Categoría';
        document.getElementById('catId').value = cat.id;
        document.getElementById('catName').value = cat.name;
        document.getElementById('catSlug').value = cat.slug;
        document.getElementById('catIcon').value = cat.icon || 'bi-tag';
        document.getElementById('catDesc').value = cat.description || '';

        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
      });
    });

    // Eliminar
    container.querySelectorAll('.btn-delete-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;

        const confirmed = await UI.confirm(
          'Eliminar Categoría',
          `¿Estás seguro de que deseas eliminar la categoría <strong>"${name}"</strong>?<br><small class="text-secondary">Solo se puede eliminar si no tiene productos asociados.</small>`,
          'Eliminar Categoría',
          true
        );

        if (confirmed) {
          const res = await API.deleteCategory(id);
          if (res.success) {
            UI.showToast(res.message, 'success');
            Categories.loadAdminCategoriesTable('categoriesTableBody');
          } else {
            UI.showToast(res.error, 'danger');
          }
        }
      });
    });
  }
};

window.Categories = Categories;
