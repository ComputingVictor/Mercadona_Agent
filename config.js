/**
 * CONFIGURACIÓN DE LA APLICACIÓN
 * Centraliza configuración para desarrollo y producción
 */

const AppConfig = {
  // Modo de la aplicación
  mode: 'development', // 'development' o 'production'

  // Configuración de API
  api: {
    // URL base del backend
    baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000/api'
      : 'https://web-production-babbe.up.railway.app/api',

    // Usar API siempre (tanto en local como en producción)
    enabled: true,

    // Fallback a CSV solo si la API falla
    fallbackToCSV: true,

    // Timeout de cache (5 minutos)
    cacheTimeout: 5 * 60 * 1000,

    // Reintentos en caso de error
    retries: 3,
    retryDelay: 1000
  },

  // Rutas de archivos estáticos (fallback)
  staticFiles: {
    csvPaths: [
      'data/processed/products_macro.csv',
      './data/processed/products_macro.csv',
      '../data/processed/products_macro.csv'
    ]
  },

  // Feature flags
  features: {
    priceHistory: true,  // Mostrar histórico de precios
    liveUpdates: false,  // Polling de actualizaciones en tiempo real
    notifications: true, // Notificaciones de cambios de precio
    comparison: true     // Comparación de productos
  },

  // Configuración de UI
  ui: {
    itemsPerPage: 24,
    theme: 'light',
    animations: true
  },

  // Polling para actualizaciones (si liveUpdates está activo)
  polling: {
    enabled: false,
    interval: 60000 // 1 minuto
  }
};

// Auto-detectar modo según hostname
if (window.location.hostname.includes('github.io')) {
  AppConfig.mode = 'production';
  // En GitHub Pages, usar API de Railway (no CSV)
  AppConfig.api.enabled = true;
}

// Exportar
window.AppConfig = AppConfig;
