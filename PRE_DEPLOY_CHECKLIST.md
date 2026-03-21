# ✅ Checklist Pre-Deploy a Railway

## 📦 Archivos de Configuración

- [x] `Procfile` - Comando de inicio de servidor
- [x] `railway.json` - Configuración de build y deploy
- [x] `pyproject.toml` - Incluye `psycopg2-binary>=2.9.9`
- [x] `init_db.py` - Script de inicialización de BD
- [x] `.env.example` - Ejemplo de variables de entorno
- [x] `.gitignore` - Actualizado para no subir `.env` ni `.db`

## 🔧 Código Actualizado

- [x] `src/database.py` - Auto-detecta PostgreSQL vs SQLite
- [x] `config.js` - Configurado para Railway (sin fallback a CSV)
- [x] `api-adapter.js` - Listo para consumir API remota

## 🧪 Tests Locales Pasados

Verificar que todo funciona en local:

```bash
# 1. Backend responde
curl http://localhost:8000/api/stats

# 2. Frontend carga (abrir navegador)
open http://localhost:8080

# 3. Base de datos tiene datos
sqlite3 data/mercadona.db "SELECT COUNT(*) FROM products;"
```

## 📝 Pasos para Deploy

### 1. Commit y Push

```bash
git add .
git commit -m "feat: Deploy a Railway con PostgreSQL"
git push origin main
```

### 2. Railway Setup

1. Ir a https://railway.app/new
2. "Deploy from GitHub repo"
3. Seleccionar repositorio
4. Añadir PostgreSQL:
   - Click "+ New"
   - "Database" → "PostgreSQL"
5. Esperar a que despliegue (~10-15 min primera vez)

### 3. Obtener URL

1. Settings → Networking
2. "Generate Domain"
3. Copiar URL (ej: `your-app.up.railway.app`)

### 4. Actualizar Frontend

En `config.js`:

```javascript
baseURL: ... ? 'http://localhost:8000/api' : 'https://YOUR-APP.up.railway.app/api'
```

```bash
git add config.js
git commit -m "feat: Añadir URL de Railway"
git push
```

### 5. Verificar Deployment

```bash
# Test API
curl https://YOUR-APP.up.railway.app/api/stats

# Test búsqueda
curl https://YOUR-APP.up.railway.app/api/search?q=aceite

# Ver docs
open https://YOUR-APP.up.railway.app/docs
```

## ⚙️ Configuración Opcional

### Variables de Entorno (Railway Dashboard)

```bash
WAREHOUSE=mad1
PYTHONUNBUFFERED=1
WEB_CONCURRENCY=3
```

### Cron Job para Actualizaciones

Crear GitHub Action en `.github/workflows/update-data.yml`:

```yaml
name: Update Data
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://YOUR-APP.up.railway.app/api/update
```

## 🐛 Troubleshooting

### Si el build falla:

1. **Error de timeout**: Reducir categorías en `init_db.py`
2. **Out of memory**: Reducir workers a 1 en `railway.json`
3. **Database error**: Verificar que PostgreSQL está añadido

### Si la API no responde:

1. Ver logs en Railway Dashboard
2. Verificar que `DATABASE_URL` existe en Variables
3. Verificar que el puerto es `$PORT` en el startCommand

### Si el frontend no carga datos:

1. Abrir DevTools → Console
2. Verificar que `config.js` tiene la URL correcta
3. Verificar CORS (debería funcionar, está en `*`)

## 📊 Después del Deploy

### Monitorear

- Railway Dashboard → Ver logs
- `/api/stats` → Verificar número de productos
- `/api/update/status` → Ver última actualización

### Optimizar

1. **Reducir tamaño de respuestas**:
   - Añadir límites por defecto
   - Implementar paginación en frontend

2. **Cache**:
   - Redis para cache de búsquedas frecuentes
   - CDN para imágenes

3. **Monitoreo**:
   - Sentry para errores
   - Uptime Robot para disponibilidad

## ✅ Success Criteria

Deploy exitoso cuando:

- ✅ API responde en https://your-app.up.railway.app
- ✅ `/api/stats` muestra productos > 0
- ✅ `/api/search?q=test` devuelve resultados
- ✅ `/docs` muestra Swagger UI
- ✅ Frontend carga y muestra productos
- ✅ No hay errores en Railway logs
- ✅ PostgreSQL conectado y funcionando

## 🎉 Post-Deploy

Una vez desplegado:

1. **Configurar dominio custom** (opcional)
   - Railway Settings → Domains
   - Añadir tu dominio

2. **Configurar actualizaciones automáticas**
   - Cron job o GitHub Actions

3. **Monitoreo**
   - Configurar alertas en Railway

4. **Backup**
   - Railway hace backups automáticos de PostgreSQL

5. **Documentación**
   - Actualizar README con nueva URL
   - Compartir con equipo

## 📚 Recursos

- [Railway Docs](https://docs.railway.app)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL en Railway](https://docs.railway.app/databases/postgresql)
- [Guía completa](RAILWAY_DEPLOY.md)

---

**¿Listo para deployar?** ✈️

```bash
git add . && git commit -m "feat: Ready for Railway deploy" && git push
```

Luego sigue los pasos en [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md)
