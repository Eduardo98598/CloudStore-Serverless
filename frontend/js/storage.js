/**
 * CloudStore Serverless - Capa de Almacenamiento Local (Storage)
 * Simula una base de datos documental (DynamoDB) en localStorage del navegador.
 * Garantiza persistencia completa de las operaciones CRUD durante la demo.
 */

const Storage = {
  /**
   * Inicializa la base de datos local con datos semilla si es la primera vez
   */
  init() {
    try {
      const isSeeded = localStorage.getItem(CONFIG.STORAGE_KEYS.INITIALIZED);
      
      if (!isSeeded) {
        this.resetToDefaults();
      }
    } catch (e) {
      console.error('Error al inicializar Storage:', e);
    }
  },

  /**
   * Restablece los datos a su estado semilla inicial
   */
  resetToDefaults() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.CATEGORIES, JSON.stringify(window.MOCK_CATEGORIES || []));
      localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTS, JSON.stringify(window.MOCK_PRODUCTS || []));
      localStorage.setItem(CONFIG.STORAGE_KEYS.ORDERS, JSON.stringify(window.MOCK_ORDERS || []));
      
      if (!localStorage.getItem(CONFIG.STORAGE_KEYS.CART)) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify([]));
      }
      
      localStorage.setItem(CONFIG.STORAGE_KEYS.INITIALIZED, 'true');
      console.log('✅ Base de datos local inicializada con datos semilla.');
    } catch (e) {
      console.error('Error al restablecer Storage:', e);
    }
  },

  /**
   * Obtiene todos los elementos de una colección
   * @param {string} key 
   * @returns {Array}
   */
  getAll(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error(`Error leyendo colección ${key}:`, e);
      return [];
    }
  },

  /**
   * Obtiene un registro por su ID
   * @param {string} key 
   * @param {string} id 
   * @returns {Object|null}
   */
  getById(key, id) {
    const list = this.getAll(key);
    return list.find(item => String(item.id) === String(id)) || null;
  },

  /**
   * Inserta un nuevo elemento en la colección
   * @param {string} key 
   * @param {Object} item 
   * @returns {Object} item insertado
   */
  insert(key, item) {
    const list = this.getAll(key);
    
    // Asignar ID si no viene provisto
    if (!item.id) {
      item.id = 'gen-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    }
    
    // Asignar fecha de creación si no tiene
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }

    list.unshift(item);
    localStorage.setItem(key, JSON.stringify(list));
    return item;
  },

  /**
   * Actualiza un registro existente por ID
   * @param {string} key 
   * @param {string} id 
   * @param {Object} patchData 
   * @returns {Object|null}
   */
  update(key, id, patchData) {
    const list = this.getAll(key);
    const index = list.findIndex(item => String(item.id) === String(id));
    
    if (index === -1) {
      return null;
    }

    const updated = {
      ...list[index],
      ...patchData,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    localStorage.setItem(key, JSON.stringify(list));
    return updated;
  },

  /**
   * Elimina un registro por ID
   * @param {string} key 
   * @param {string} id 
   * @returns {boolean}
   */
  delete(key, id) {
    const list = this.getAll(key);
    const initialLen = list.length;
    const filtered = list.filter(item => String(item.id) !== String(id));
    
    if (filtered.length !== initialLen) {
      localStorage.setItem(key, JSON.stringify(filtered));
      return true;
    }
    return false;
  },

  /**
   * Guarda directamente un valor en localStorage
   */
  setRaw(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.error(`Error guardando en ${key}:`, e);
    }
  },

  /**
   * Obtiene directamente un valor parseado de localStorage
   */
  getRaw(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error(`Error obteniendo ${key}:`, e);
      return defaultValue;
    }
  }
};

// Auto-inicializar almacenamiento
Storage.init();

// Exportar globalmente
window.Storage = Storage;
