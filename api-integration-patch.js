/**
 * PARCHE DE INTEGRACIÓN API
 * Integra el adaptador API con la aplicación existente
 *
 * Este archivo parchea el método loadData() de MercadonaApp
 * para usar el adaptador API en lugar de cargar directamente el CSV.
 */

// Esperar a que MercadonaApp esté cargado
document.addEventListener('DOMContentLoaded', function() {
  // Pequeño delay para asegurar que todo esté inicializado
  setTimeout(function() {
    if (typeof MercadonaApp === 'undefined' || typeof MercadonaAPIAdapter === 'undefined') {
      console.warn('MercadonaApp o MercadonaAPIAdapter no encontrados');
      return;
    }

    // Inicializar el adaptador API
    const apiAdapter = new MercadonaAPIAdapter({
      apiBaseURL: window.AppConfig?.api?.baseURL || 'http://localhost:8000/api',
      useAPI: window.AppConfig?.api?.enabled !== false,
      fallbackToCSV: window.AppConfig?.api?.fallbackToCSV !== false,
      cacheTimeout: window.AppConfig?.api?.cacheTimeout || 5 * 60 * 1000
    });

    // Guardar referencia global para debugging
    window.apiAdapter = apiAdapter;

    // Parchear el prototipo de MercadonaApp
    const originalLoadData = MercadonaApp.prototype.loadData;

    MercadonaApp.prototype.loadData = async function() {
      try {
        this.setLoading(true);

        // Usar el adaptador para cargar productos
        console.log('📡 Cargando productos mediante adaptador API...');
        const data = await apiAdapter.loadProducts();

        console.log(`✅ Productos cargados: ${data.length}`);

        // Procesar datos como siempre
        this.processProductData(data);
        this.setLoading(false);

      } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        this.utils.showToast('Error al cargar los productos', 'error');
        this.setLoading(false);
      }
    };

    // Extender con métodos adicionales para funcionalidades de API

    /**
     * Obtiene histórico de precios de un producto
     */
    MercadonaApp.prototype.getPriceHistory = async function(productId) {
      try {
        const history = await apiAdapter.getPriceHistory(productId, 30);
        return history;
      } catch (error) {
        console.error('Error obteniendo histórico:', error);
        return null;
      }
    };

    /**
     * Obtiene estadísticas de la app
     */
    MercadonaApp.prototype.getStats = async function() {
      try {
        const stats = await apiAdapter.getStats();
        return stats;
      } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return null;
      }
    };

    /**
     * Refresca los datos desde la API
     */
    MercadonaApp.prototype.refreshData = async function() {
      apiAdapter.invalidateCache();
      this.utils.showToast('Actualizando productos...', 'info');
      await this.loadData();
      this.utils.showToast('Productos actualizados', 'success');
    };

    /**
     * Dispara actualización en el backend
     */
    MercadonaApp.prototype.triggerBackendUpdate = async function() {
      try {
        const success = await apiAdapter.triggerUpdate();

        if (success) {
          this.utils.showToast('Actualización iniciada en el servidor', 'success');
          return true;
        } else {
          this.utils.showToast('No se pudo iniciar la actualización', 'error');
          return false;
        }
      } catch (error) {
        console.error('Error disparando actualización:', error);
        this.utils.showToast('Error al comunicarse con el servidor', 'error');
        return false;
      }
    };

    console.log('✅ Parche de integración API aplicado correctamente');

  }, 100);
});
