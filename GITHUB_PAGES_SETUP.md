# 🚀 Configuración para GitHub Pages

## 📋 Pasos para Deploy en GitHub Pages

### 1. Preparar el Repositorio

#### 1.1 Subir los archivos
```bash
git add .
git commit -m "Add Supabase integration and authentication system"
git push origin main
```

#### 1.2 Habilitar GitHub Pages
1. Ve a tu repositorio en GitHub
2. Clic en **Settings** (Configuración)
3. Baja hasta **Pages** en el menú lateral
4. En **Source**, selecciona **Deploy from a branch**
5. Selecciona **main** branch y **/ (root)**
6. Clic en **Save**

### 2. Configurar Supabase para GitHub Pages

#### 2.1 Obtener la URL de GitHub Pages
Tu sitio estará disponible en:
```
https://tu-usuario.github.io/nombre-repositorio/
```

#### 2.2 Configurar CORS en Supabase
1. Ve a tu proyecto Supabase
2. **Settings** > **API** > **CORS origins**
3. Añade tu URL de GitHub Pages:
```
https://tu-usuario.github.io
```

#### 2.3 Configurar Authentication URLs
1. **Authentication** > **URL Configuration**
2. **Site URL**: `https://tu-usuario.github.io/nombre-repositorio/`
3. **Redirect URLs**: La misma URL

### 3. Actualizar Configuración

#### 3.1 Variables de entorno (Recomendado)
Crea un archivo `config.js`:

```javascript
// config.js - Configuración para producción
export const CONFIG = {
  SUPABASE_URL: 'https://tu-proyecto-id.supabase.co',
  SUPABASE_ANON_KEY: 'tu-clave-anonima-aqui',
  ENVIRONMENT: 'production',
  SITE_URL: 'https://tu-usuario.github.io/nombre-repositorio/'
};
```

#### 3.2 Actualizar database.js
```javascript
import { CONFIG } from './config.js';

// Usar configuración desde config.js
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;
```

### 4. Consideraciones Importantes

#### 4.1 HTTPS Obligatorio
- GitHub Pages usa HTTPS automáticamente
- Supabase requiere HTTPS para funcionar
- ✅ Sin problemas adicionales

#### 4.2 Módulos ES6
- GitHub Pages soporta módulos ES6 nativamente
- Asegúrate de que todos los imports usen extensión `.js`
- ✅ Ya configurado correctamente

#### 4.3 Rutas Absolutas vs Relativas
Para GitHub Pages, usa rutas relativas:
```html
<!-- ✅ Correcto para GitHub Pages -->
<link rel="stylesheet" href="./style.css" />
<script type="module" src="./script.js"></script>

<!-- ❌ Evitar rutas absolutas -->
<link rel="stylesheet" href="/style.css" />
```

### 5. Optimizaciones para Producción

#### 5.1 Añadir .gitignore
```gitignore
# Logs
*.log
npm-debug.log*

# Dependency directories
node_modules/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Local config (si usas archivos locales)
config.local.js
```

#### 5.2 Añadir robots.txt
```txt
User-agent: *
Allow: /

Sitemap: https://tu-usuario.github.io/nombre-repositorio/sitemap.xml
```

#### 5.3 Meta tags mejorados
Añade al `<head>` de index.html:
```html
<!-- Meta tags para SEO y PWA -->
<meta name="description" content="Aplicación web de supermercado con sincronización en la nube">
<meta name="keywords" content="supermercado, productos, lista compras, comparar precios">
<meta name="author" content="@ComputingVictor">

<!-- Open Graph para redes sociales -->
<meta property="og:title" content="¿Qué hay en el súper?">
<meta property="og:description" content="Explora productos, crea listas y compara precios">
<meta property="og:image" content="https://tu-usuario.github.io/nombre-repositorio/img/image.png">
<meta property="og:url" content="https://tu-usuario.github.io/nombre-repositorio/">

<!-- PWA básico -->
<meta name="theme-color" content="#22c55e">
<link rel="manifest" href="./manifest.json">
```

### 6. Troubleshooting

#### Problema: Módulos ES6 no cargan
```html
<!-- Solución: Verificar type="module" -->
<script type="module" src="./script.js"></script>
```

#### Problema: CORS Error
```javascript
// Solución: Verificar URL en Supabase CORS
// Debe coincidir exactamente con GitHub Pages URL
```

#### Problema: 404 en archivos
```bash
# Solución: Verificar rutas relativas
./style.css      # ✅ Correcto
/style.css       # ❌ Error en subdirectorios
```

### 7. Comandos Útiles

#### Deploy rápido
```bash
git add .
git commit -m "Update production build"
git push origin main
# GitHub Pages se actualiza automáticamente en ~5-10 minutos
```

#### Ver logs de build
```bash
# En GitHub: Actions tab para ver el progreso del deploy
```

### 8. Monitoreo

#### 8.1 Google Analytics (Opcional)
```html
<!-- Añadir antes de </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

#### 8.2 Console de Supabase
- Monitorea usuarios activos
- Revisa logs de API
- Supervisa uso de base de datos

### 9. Seguridad

#### 9.1 Variables Sensibles
```javascript
// ✅ Solo clave pública (anon key) en frontend
const SUPABASE_ANON_KEY = 'eyJ...'; // OK para GitHub Pages

// ❌ NUNCA subir service_role key
// const SERVICE_KEY = 'secret...'; // NO HACER ESTO!
```

#### 9.2 Configuración de Supabase RLS
- Row Level Security habilitado ✅
- Políticas configuradas ✅
- Solo datos propios del usuario ✅

### 10. Performance

#### 10.1 CDN para archivos estáticos
GitHub Pages ya usa CDN de GitHub para archivos estáticos.

#### 10.2 Compresión
GitHub Pages comprime automáticamente archivos:
- CSS, JS, HTML
- Imágenes optimizadas automáticamente

#### 10.3 Caché
Configurar headers de caché (solo con Jekyll):
```yaml
# _config.yml (si usas Jekyll)
plugins:
  - jekyll-gzip

gzip:
  extensions:
    - '.html'
    - '.css'
    - '.js'
```

---

## ✅ Checklist Final

- [ ] Código subido a GitHub
- [ ] GitHub Pages habilitado
- [ ] CORS configurado en Supabase
- [ ] URLs de autenticación actualizadas
- [ ] Rutas relativas en HTML
- [ ] Config.js creado con credenciales
- [ ] Meta tags añadidos
- [ ] Sitio funcionando en GitHub Pages

## 🔗 Enlaces Útiles

- **GitHub Pages Docs**: https://docs.github.com/en/pages
- **Supabase Docs**: https://docs.supabase.com
- **Troubleshooting**: https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites

¡Tu aplicación estará disponible globalmente en pocos minutos! 🌍