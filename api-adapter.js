/**
 * API ADAPTER
 * Adaptador para consumir la API backend en lugar del CSV estático
 * Mantiene compatibilidad con el código existente
 */

class MercadonaAPIAdapter {
  constructor(config = {}) {
    this.apiBaseURL = config.apiBaseURL || 'http://localhost:8000/api';
    this.useAPI = config.useAPI !== false; // Por defecto usa API
    this.fallbackToCSV = config.fallbackToCSV !== false; // Fallback a CSV si falla
    this.cache = {
      products: null,
      categories: null,
      lastUpdate: null
    };
    this.cacheTimeout = config.cacheTimeout || 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Carga productos (desde API o CSV como fallback)
   */
  async loadProducts() {
    if (this.useAPI) {
      try {
        return await this.loadFromAPI();
      } catch (error) {
        console.warn('Error cargando desde API, usando fallback a CSV:', error);

        if (this.fallbackToCSV) {
          return await this.loadFromCSV();
        }

        throw error;
      }
    } else {
      return await this.loadFromCSV();
    }
  }

  /**
   * Carga productos desde la API backend
   */
  async loadFromAPI() {
    // Verificar cache
    if (this.cache.products && this.isCacheValid()) {
      console.log('Usando datos cacheados');
      return this.cache.products;
    }

    console.log('Cargando productos desde API...');

    const response = await fetch(`${this.apiBaseURL}/products?limit=10000`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Transformar al formato esperado por la app
    const products = data.products.map(p => this.transformProduct(p));

    // Cachear
    this.cache.products = products;
    this.cache.lastUpdate = Date.now();

    console.log(`✓ Cargados ${products.length} productos desde API`);

    return products;
  }

  /**
   * Carga productos desde CSV (modo legacy)
   */
  async loadFromCSV() {
    console.log('Cargando productos desde CSV...');

    const csvPaths = [
      'data/processed/products_macro.csv',
      './data/processed/products_macro.csv',
      '../data/processed/products_macro.csv'
    ];

    for (const path of csvPaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const csvText = await response.text();
          return await this.parseCSV(csvText);
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('No se pudo cargar el archivo CSV');
  }

  /**
   * Parsea CSV usando PapaParse
   */
  parseCSV(csvText) {
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Errores al parsear CSV:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => reject(error)
      });
    });
  }

  /**
   * Transforma producto de API al formato CSV esperado por processProductData()
   *
   * IMPORTANTE: processProductData() espera el formato del CSV original:
   * - name: string
   * - Category: string (con C mayúscula)
   * - price: string (no número)
   * - image_url: string
   * - novedad: boolean/string
   * - discount_price: string (opcional)
   */
  transformProduct(apiProduct) {
    return {
      // ID debe ser el ID de Mercadona (string)
      id: apiProduct.id,

      // Nombre
      name: apiProduct.display_name || '',
      subtitle: apiProduct.packaging || '',

      // Categoría (con C mayúscula como espera el CSV)
      Category: apiProduct.category_name || 'Sin categoría',

      // Precio como STRING (como en CSV)
      price: apiProduct.unit_price ? apiProduct.unit_price.toString() : '0',

      // Descuento (si el precio anterior existe y es diferente)
      discount_price: apiProduct.previous_unit_price && apiProduct.previous_unit_price !== apiProduct.unit_price
        ? apiProduct.previous_unit_price.toString()
        : '',

      // Imágenes
      image_url: apiProduct.thumbnail || '',
      main_image_url: apiProduct.thumbnail || '',
      secondary_image_url: '',

      // Flags
      novedad: apiProduct.is_new || false,

      // Info adicional
      nutritional_info: '',

      // Datos extra de la API (para referencia)
      slug: apiProduct.slug,
      share_url: apiProduct.share_url,
      packaging: apiProduct.packaging,
      bulk_price: apiProduct.bulk_price,
      reference_price: apiProduct.reference_price,
      unit_size: apiProduct.unit_size,
      size_format: apiProduct.size_format,
      reference_format: apiProduct.reference_format,
      parent_category: apiProduct.parent_category,
      is_pack: apiProduct.is_pack,
      price_decreased: apiProduct.price_decreased,
      updated_at: apiProduct.updated_at
    };
  }

  /**
   * Busca productos (con API es más eficiente)
   */
  async searchProducts(query) {
    if (!this.useAPI) {
      // Si no usa API, que la app haga la búsqueda local
      return null;
    }

    try {
      const response = await fetch(
        `${this.apiBaseURL}/search?q=${encodeURIComponent(query)}&limit=100`
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.products.map(p => this.transformProduct(p));
    } catch (error) {
      console.warn('Error en búsqueda por API:', error);
      return null;
    }
  }

  /**
   * Obtiene categorías
   */
  async getCategories() {
    if (!this.useAPI) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiBaseURL}/categories`);

      if (!response.ok) return null;

      const data = await response.json();
      return data.categories;
    } catch (error) {
      console.warn('Error obteniendo categorías:', error);
      return null;
    }
  }

  /**
   * Obtiene detalle de producto
   */
  async getProductDetail(productId) {
    if (!this.useAPI) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiBaseURL}/products/${productId}`);

      if (!response.ok) return null;

      const product = await response.json();
      return this.transformProduct(product);
    } catch (error) {
      console.warn('Error obteniendo detalle de producto:', error);
      return null;
    }
  }

  /**
   * Obtiene histórico de precios
   */
  async getPriceHistory(productId, days = 30) {
    if (!this.useAPI) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.apiBaseURL}/products/${productId}/history?days=${days}`
      );

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.warn('Error obteniendo histórico de precios:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas
   */
  async getStats() {
    if (!this.useAPI) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiBaseURL}/stats`);

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.warn('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Dispara actualización de datos
   */
  async triggerUpdate() {
    if (!this.useAPI) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiBaseURL}/update`, {
        method: 'POST'
      });

      return response.ok;
    } catch (error) {
      console.warn('Error disparando actualización:', error);
      return false;
    }
  }

  /**
   * Verifica si el cache es válido
   */
  isCacheValid() {
    if (!this.cache.lastUpdate) return false;
    return (Date.now() - this.cache.lastUpdate) < this.cacheTimeout;
  }

  /**
   * Invalida cache
   */
  invalidateCache() {
    this.cache.products = null;
    this.cache.categories = null;
    this.cache.lastUpdate = null;
  }
}

// Exportar para uso global
window.MercadonaAPIAdapter = MercadonaAPIAdapter;
