# 🚀 Deploy Guide - GitHub Pages + Railway

## Arquitectura

```
┌─────────────────────┐
│  GitHub Pages       │  Frontend estático
│  (computingvictor.  │  HTML + JS + CSS
│   github.io)        │
└──────────┬──────────┘
           │ API REST
           ↓
┌─────────────────────┐
│  Railway            │  Backend API
│  - FastAPI          │  - Actualización diaria
│  - PostgreSQL       │  - Histórico precios
└─────────────────────┘
           ↑
           │ Consume API Mercadona
           ↓
┌─────────────────────┐
│  Mercadona API      │
│  tienda.mercadona.es│
└─────────────────────┘
```

## Paso 1: Deploy Backend a Railway

### 1.1 Crear Proyecto en Railway

1. Ve a https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Selecciona `Mercadona_Agent`
4. Branch: `main`

### 1.2 Añadir PostgreSQL

1. En tu proyecto Railway, click "+ New"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará la BD y configurará `DATABASE_URL` automáticamente

### 1.3 Esperar Deploy

- Primera vez: ~3-5 minutos
- Railway ejecuta: `uvicorn src.api:app --host 0.0.0.0 --port $PORT`

### 1.4 Obtener URL Pública

1. En Railway, ve a tu servicio
2. Settings → Networking
3. Click "Generate Domain"
4. **Copia la URL** (ejemplo: `mercadona-agent-production.up.railway.app`)

### 1.5 Cargar Datos Iniciales

```bash
# Reemplaza TU-URL con la URL de Railway
curl -X POST https://TU-URL.up.railway.app/api/update
```

Esto tardará ~10-15 minutos y cargará todos los productos.

### 1.6 Verificar que Funciona

```bash
# Ver estadísticas
curl https://TU-URL.up.railway.app/api/stats

# Debería mostrar:
# {"total_products": 12000+, "total_categories": 120+, ...}
```

## Paso 2: Configurar Actualización Diaria

### Opción A: Railway Cron Job (Recomendado)

1. En Railway, click "+ New" → "Cron Job"
2. Repository: Same as API service
3. Branch: `main`
4. Schedule: `0 3 * * *` (3 AM diario)
5. Command: `python cron_update.py`
6. Environment: Compartir variables con el servicio principal

### Opción B: GitHub Actions

Crear `.github/workflows/daily-update.yml`:

```yaml
name: Daily Product Update

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM UTC diario
  workflow_dispatch:  # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Railway Update
        run: |
          curl -X POST https://TU-URL.up.railway.app/api/update
```

## Paso 3: Actualizar Frontend (GitHub Pages)

### 3.1 Actualizar config.js

Edita `config.js` línea 15:

```javascript
baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api'
  : 'https://TU-URL.up.railway.app/api',  // ⚠️ PEGAR TU URL AQUÍ
```

### 3.2 Commit y Push

```bash
git add config.js
git commit -m "feat: Connect to Railway API backend"
git push origin main
```

### 3.3 GitHub Pages se Actualiza Automáticamente

- GitHub Actions desplegará automáticamente
- En ~2-3 minutos estará live
- Frontend: https://computingvictor.github.io/Mercadona_Agent/

## Paso 4: Verificar Todo Funciona

### 4.1 Abrir Frontend

https://computingvictor.github.io/Mercadona_Agent/

### 4.2 Abrir DevTools

- F12 → Console
- Deberías ver: `"📡 Cargando productos mediante adaptador API..."`
- Y luego: `"✅ Datos cargados: 12000+"`

### 4.3 Probar Búsqueda

- Buscar "aceite"
- Deberían aparecer productos
- Los datos vienen de Railway (no CSV)

## Mantenimiento

### Ver Logs

Railway Dashboard → Deployments → View Logs

### Forzar Actualización Manual

```bash
curl -X POST https://TU-URL.up.railway.app/api/update
```

### Ver Estado de Última Actualización

```bash
curl https://TU-URL.up.railway.app/api/update/status
```

### Conectar a PostgreSQL

```bash
# Desde Railway CLI
railway login
railway connect postgres
```

## Troubleshooting

### Frontend muestra "No se pudo cargar productos"

1. Abrir DevTools → Console
2. Buscar errores de CORS o 404
3. Verificar que la URL en `config.js` es correcta
4. Verificar que Railway API responde: `curl https://TU-URL/api/stats`

### Backend en Railway no responde

1. Ver logs en Railway Dashboard
2. Verificar que PostgreSQL está añadido
3. Verificar variable `DATABASE_URL` existe

### Cron job no ejecuta

1. Verificar schedule en Railway
2. Ver logs del cron job
3. Probar manual: `railway run python cron_update.py`

## Costos

### Railway (Plan Gratuito)
- ✅ 500 horas/mes de servidor (suficiente)
- ✅ 1GB PostgreSQL (suficiente para 10k+ productos)
- ✅ 100GB egress (más que suficiente)

### GitHub Pages (Gratis)
- ✅ Ilimitado para repos públicos
- ✅ Despliegue automático

## Resumen

Una vez configurado:

1. **Frontend**: GitHub Pages (automático con cada push)
2. **Backend**: Railway (siempre corriendo)
3. **Datos**: Se actualizan diariamente automáticamente
4. **Costo**: $0 (planes gratuitos)

🎉 ¡Todo funcionando en producción con datos en tiempo real!
