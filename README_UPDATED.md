# 🛒 Mercadona Agent - Aplicación Web de Supermercado

Una aplicación web moderna para explorar productos de supermercado, crear listas de compras y comparar productos. Ahora con **sincronización en la nube** y **base de datos online gratuita**.

## ✨ Características Principales

### 🔍 Exploración de Productos
- **Búsqueda inteligente** con filtros avanzados
- **Categorías organizadas** para fácil navegación
- **Vista de grid y lista** intercambiables
- **Información nutricional** detallada
- **Imágenes de alta calidad** de productos

### 👤 Sistema de Usuarios
- **Registro e inicio de sesión** seguro
- **Sincronización automática** entre dispositivos
- **Modo invitado** para usar sin registro
- **Gestión de preferencias** personalizada

### ❤️ Gestión Personal
- **Productos favoritos** sincronizados
- **Lista de compras** inteligente con cantidades
- **Productos vistos recientemente**
- **Comparación de productos** (hasta 3)
- **Exportación de listas** a CSV

### 📱 Optimización Móvil
- **Diseño responsive** para todos los dispositivos
- **Barra de acciones inferior** en móviles
- **Pull-to-refresh** para actualizar
- **Indicador de conexión** en tiempo real
- **Navegación por gestos**

### 🎨 Personalización
- **Tema claro y oscuro**
- **Configuración de productos por página**
- **Ordenación personalizable**
- **Filtros avanzados de precio**

## 🚀 Tecnologías Utilizadas

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos con variables CSS
- **JavaScript ES6+** - Lógica de la aplicación
- **FontAwesome** - Iconografía
- **Papa Parse** - Procesamiento de CSV

### Backend y Base de Datos
- **Supabase** - Base de datos PostgreSQL en la nube
- **Row Level Security (RLS)** - Seguridad a nivel de filas
- **Autenticación JWT** - Sistema de autenticación seguro
- **API REST automática** - Generada por Supabase

### Características Técnicas
- **Módulos ES6** - Código modular y mantenible
- **Async/Await** - Manejo asíncrono moderno
- **LocalStorage + Cloud** - Sincronización híbrida
- **PWA Ready** - Preparado para Progressive Web App

## 📁 Estructura del Proyecto

```
Mercadona_Agent/
├── index.html              # Página principal
├── script.js              # Lógica principal de la aplicación
├── style.css              # Estilos principales
├── auth.css               # Estilos del sistema de autenticación
├── database.js            # Utilidades de base de datos
├── auth.js               # Sistema de autenticación
├── supabase-setup.sql    # Script de configuración de BD
├── SUPABASE_SETUP.md     # Guía de configuración
├── data/
│   └── processed/
│       └── products_macro.csv  # Datos de productos
├── img/
│   └── image.png         # Logo de la aplicación
└── notebooks/            # Análisis de datos (Jupyter)
```

## 🛠️ Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <tu-repositorio>
cd Mercadona_Agent
```

### 2. Configurar Supabase
1. Sigue la guía detallada en [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)
2. Crea tu proyecto en [supabase.com](https://supabase.com)
3. Ejecuta el script SQL de configuración
4. Actualiza las credenciales en `database.js`

### 3. Servir la Aplicación
La aplicación usa módulos ES6, por lo que necesitas servirla desde un servidor web:

```bash
# Opción 1: Python (si tienes Python instalado)
python -m http.server 3000

# Opción 2: Node.js (si tienes Node.js instalado)
npx serve .

# Opción 3: PHP (si tienes PHP instalado)
php -S localhost:3000
```

### 4. Abrir la Aplicación
Visita `http://localhost:3000` en tu navegador.

## 🔧 Configuración de Supabase

### Variables a Configurar
En `database.js`, actualiza estas líneas:

```javascript
const SUPABASE_URL = 'https://tu-proyecto-id.supabase.co';
const SUPABASE_ANON_KEY = 'tu-clave-anonima-aqui';
```

### Tablas Creadas
- `favorites` - Productos favoritos por usuario
- `shopping_list` - Listas de compra con cantidades
- `recently_viewed` - Productos vistos recientemente
- `user_preferences` - Configuraciones del usuario
- `products` - Catálogo de productos (futuro)

## 🎯 Características Destacadas

### Sincronización Inteligente
- **Automática**: Los datos se sincronizan al iniciar sesión
- **Híbrida**: Funciona offline con localStorage
- **Migración**: Los datos locales se migran a la nube
- **Tiempo real**: Cambios instantáneos entre dispositivos

### Seguridad
- **Row Level Security**: Cada usuario solo ve sus datos
- **JWT Authentication**: Tokens seguros de Supabase
- **Políticas automáticas**: Configuradas en el script SQL
- **Sin claves sensibles**: Solo clave pública en frontend

### Experiencia de Usuario
- **Modo invitado**: Usar sin registrarse
- **Feedback visual**: Notificaciones y estados de carga
- **Accesibilidad**: Soporte para lectores de pantalla
- **Responsive**: Optimizado para todos los tamaños

### Performance
- **Lazy loading**: Carga perezosa de imágenes
- **Paginación**: Control de productos por página
- **Caché inteligente**: Reduce consultas redundantes
- **Índices de BD**: Consultas rápidas en Supabase

## 📱 Uso de la Aplicación

### Para Usuarios Invitados
1. Navega y explora productos libremente
2. Usa favoritos y listas (guardadas localmente)
3. Ve el banner para registrarte y sincronizar

### Para Usuarios Registrados
1. **Regístrate** con tu email
2. **Confirma** tu cuenta por email
3. **Inicia sesión** y disfruta de:
   - Sincronización entre dispositivos
   - Backup automático en la nube
   - Acceso desde cualquier lugar

### Funcionalidades Principales
- **Buscar productos** con filtros inteligentes
- **Añadir a favoritos** con el ❤️
- **Crear listas de compra** con cantidades
- **Comparar productos** (máximo 3)
- **Ver información nutricional** de productos
- **Cambiar tema** (claro/oscuro)
- **Exportar listas** a CSV

## 🔍 Datos de Productos

La aplicación incluye un catálogo de productos con:
- **Nombre** y subtítulo del producto
- **Categoría** de clasificación
- **Precio** actualizado
- **Imagen principal** del producto
- **Información nutricional** (cuando está disponible)

Los datos se cargan desde `data/processed/products_macro.csv` usando Papa Parse.

## 🌐 Deploy en Producción

### Consideraciones
1. **Dominio personalizado**: Añade tu dominio en Supabase
2. **HTTPS obligatorio**: Para PWA y geolocalización
3. **Variables de entorno**: Para claves sensibles
4. **CDN**: Para servir imágenes rápidamente

### Plataformas Recomendadas
- **Netlify**: Deploy automático desde Git
- **Vercel**: Optimizado para frontend
- **GitHub Pages**: Gratis para proyectos públicos
- **Surge.sh**: Deploy simple y rápido

## 📊 Monitoreo y Analytics

### Dashboard de Supabase
- **Usuarios activos**: Estadísticas en tiempo real
- **Uso de base de datos**: Consultas y almacenamiento
- **Performance**: Tiempos de respuesta
- **Logs**: Errores y eventos del sistema

### Límites del Plan Gratuito
- **Base de datos**: 500 MB
- **Usuarios**: 50,000 mensuales activos
- **Transferencia**: 5 GB mensual
- **Realtime**: 200 conexiones concurrentes

## 🐛 Solución de Problemas

### Errores Comunes
1. **"Invalid JWT"**: Verifica las credenciales de Supabase
2. **"Failed to fetch"**: Comprueba la URL del proyecto
3. **CORS Error**: Añade tu dominio en la configuración
4. **Datos no se guardan**: Verifica RLS y autenticación

### Debug
- Abre las **DevTools** del navegador
- Revisa la **Consola** para errores JavaScript
- Verifica **Network** para fallos de API
- Consulta **Application > Local Storage** para datos locales

## 🤝 Contribuir

### Desarrollo Local
1. Fork el proyecto
2. Crea una rama para tu feature
3. Desarrolla y prueba localmente
4. Envía un Pull Request

### Areas de Mejora
- **Búsqueda avanzada** con filtros nutricionales
- **Recomendaciones** basadas en IA
- **Modo offline** completo (PWA)
- **Notificaciones push**
- **Integración con APIs** de supermercados

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

## 👨‍💻 Autor

**@ComputingVictor**
- GitHub: [ComputingVictor](https://github.com/ComputingVictor)
- Email: [contacto]

## 🙏 Agradecimientos

- **Supabase** por la infraestructura gratuita
- **FontAwesome** por los iconos
- **Papa Parse** por el procesamiento CSV
- **Comunidad Open Source** por las herramientas

---

## 🆕 Changelog v2.0

### ✅ Nuevas Características
- Sistema de autenticación completo
- Base de datos en la nube con Supabase
- Sincronización entre dispositivos
- Optimización móvil avanzada
- Indicadores de conexión
- Pull-to-refresh en móviles
- Barra de acciones inferior en móviles
- Notificaciones mejoradas con acciones

### 🔧 Mejoras Técnicas
- Migración a módulos ES6
- Funciones asíncronas en toda la app
- Row Level Security implementado
- Caché inteligente de datos
- Performance optimizada

### 🎨 Mejoras de UI/UX
- Temas mejorados (claro/oscuro)
- Animaciones más fluidas
- Feedback visual mejorado
- Navegación móvil optimizada
- Estados de carga mejorados

¡Disfruta de tu nueva aplicación web de supermercado con sincronización en la nube! 🎉