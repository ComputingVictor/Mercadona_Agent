// Configuration file for production deployment
export const CONFIG = {
  // Supabase configuration - Replace with your actual values
  SUPABASE_URL: 'https://vhbioxkokvffptidmzge.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYmlveGtva3ZmZnB0aWRtemdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjYxOTMsImV4cCI6MjA2OTQ0MjE5M30.yZCJWC5jHJQ7X6yiIaZJzp2KSQOxCOFNOIMntlotKkk',
  
  // Environment
  ENVIRONMENT: 'production',
  
  // Site configuration - GitHub Pages URL
  SITE_URL: 'https://computingvictor.github.io/Mercadona_Agent/',
  
  // App configuration
  APP_NAME: '¿Qué hay en el súper?',
  APP_VERSION: '2.0.0',
  
  // Features flags
  FEATURES: {
    OFFLINE_MODE: true,
    PUSH_NOTIFICATIONS: false,
    ANALYTICS: false
  }
};