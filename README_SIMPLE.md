# Mercadona API Backend

Backend FastAPI que consume la API de Mercadona y sirve datos vía REST.

## 🚀 Deploy a Railway

1. **Fork/Clone este repo**

2. **Ir a Railway**: https://railway.app/new

3. **Deploy from GitHub**
   - Seleccionar repositorio
   - Branch: `main`

4. **Añadir PostgreSQL**
   - Click "+ New"
   - Database → PostgreSQL

5. **Railway desplegará automáticamente**

6. **Obtener URL**
   - Settings → Networking → Generate Domain
   - Ejemplo: `your-app.up.railway.app`

7. **Actualizar `config.js`** con la URL de Railway

## 📡 Uso Local

```bash
# Instalar
uv sync

# Iniciar
uvicorn src.api:app --reload

# Abrir
http://localhost:8000/docs
```

## 🔄 Cargar Datos

Una vez desplegado:

```bash
curl -X POST https://your-app.up.railway.app/api/update
```

Esto cargará productos desde la API de Mercadona automáticamente.

## 📊 Endpoints

- `GET /api/products` - Lista de productos
- `GET /api/products/{id}` - Detalle
- `GET /api/search?q=...` - Búsqueda
- `GET /api/categories` - Categorías
- `GET /api/stats` - Estadísticas
- `POST /api/update` - Actualizar datos

Ver docs completas en `/docs`

## ⚙️ Variables de Entorno

Railway las configura automáticamente:
- `DATABASE_URL` - PostgreSQL (auto)
- `PORT` - Puerto (auto)

## 📚 Más Info

- [README_API.md](README_API.md) - Documentación completa
- [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) - Guía detallada
