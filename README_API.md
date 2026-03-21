# Mercadona Agent - API Backend v2.0

Sistema completo con backend FastAPI que consume la API de Mercadona, almacena productos en base de datos SQLite con histórico de precios, y sirve datos al frontend vía API REST.

## 🎯 Características Principales

- ✅ **API REST moderna** con FastAPI
- ✅ **Base de datos SQLite** con histórico de precios
- ✅ **Cliente API optimizado** para Mercadona
- ✅ **Actualización automática** de productos
- ✅ **Frontend compatible** - funciona con/sin backend
- ✅ **Histórico de precios** y detección de cambios
- ✅ **Sin Selenium** - 10x más rápido que scraping

## 📁 Estructura del Proyecto

```
Mercadona_Agent/
├── src/
│   ├── api_client.py      # Cliente API de Mercadona
│   ├── models.py          # Modelos SQLAlchemy
│   ├── database.py        # Operaciones de BD
│   ├── api.py             # Backend FastAPI
│   └── updater.py         # Servicio de actualización
├── data/
│   └── mercadona.db       # Base de datos SQLite (auto-creada)
├── index.html             # Frontend
├── script.js              # Lógica frontend
├── api-adapter.js         # Adaptador API/CSV
├── api-integration-patch.js  # Integración con frontend
├── config.js              # Configuración frontend
├── run_backend.py         # Script para iniciar API
└── run_update.py          # Script para actualizar productos
```

## 🚀 Instalación y Uso

### 1. Instalar Dependencias

```bash
# Con uv (recomendado)
uv sync

# O con pip
pip install -e .
```

### 2. Primera Carga de Datos

```bash
# Escanear categorías y cargar todos los productos
# Esto puede tardar ~10-15 minutos la primera vez
python run_update.py
```

Salida esperada:
```
🚀 Iniciando actualización de productos...
Escaneadas 1500 categorías...
✓ Categorías válidas encontradas: 120
Extrayendo productos...
[1/120] Aceite de oliva virgen extra: 87 productos
...
✓ Total productos únicos: 12,545
Guardando en base de datos...
✅ Actualización completada exitosamente
```

### 3. Iniciar Backend

```bash
python run_backend.py
```

El servidor estará disponible en:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc

### 4. Abrir Frontend

```bash
# Servidor simple con Python
python -m http.server 8080

# O con Node.js
npx serve . -p 8080
```

Abre http://localhost:8080 en tu navegador.

## 📡 Endpoints de la API

### Productos

```bash
# Listar productos
GET /api/products?category=Aceite&limit=100&offset=0

# Detalle de producto
GET /api/products/12345

# Buscar productos
GET /api/search?q=aceite

# Histórico de precios
GET /api/products/12345/history?days=30
```

### Categorías

```bash
# Listar categorías
GET /api/categories
```

### Estadísticas

```bash
# Stats generales
GET /api/stats

# Estado de última actualización
GET /api/update/status
```

### Actualización

```bash
# Disparar actualización (background)
POST /api/update
```

## 🔧 Configuración

### Frontend (config.js)

```javascript
const AppConfig = {
  api: {
    baseURL: 'http://localhost:8000/api',
    enabled: true,           // Usar API
    fallbackToCSV: true,    // Fallback a CSV si falla
  },
  features: {
    priceHistory: true,     // Mostrar histórico
    liveUpdates: false,     // Polling en tiempo real
  }
};
```

### Backend

Edita `src/database.py` para cambiar la URL de base de datos:

```python
# SQLite (por defecto)
Database(database_url="sqlite:///data/mercadona.db")

# PostgreSQL (producción)
Database(database_url="postgresql://user:pass@localhost/mercadona")
```

## 🎨 Modos de Operación

### Modo 1: Con Backend (Recomendado)

1. Ejecutar `python run_update.py` (periódicamente)
2. Ejecutar `python run_backend.py`
3. Abrir frontend

**Ventajas:**
- Datos en tiempo real
- Histórico de precios
- Detección de cambios
- Búsqueda rápida

### Modo 2: Solo Frontend (GitHub Pages)

1. El frontend detecta automáticamente que no hay backend
2. Carga datos desde `data/processed/products_macro.csv`
3. Funcionalidad completa excepto histórico

**Ventajas:**
- No requiere servidor
- Compatible con GitHub Pages
- Más simple

## 📊 Base de Datos

### Tablas Principales

1. **products**: Productos actuales
   - Información completa del producto
   - Precios actuales
   - Categorías
   - Timestamps

2. **price_history**: Histórico de precios
   - Registro de cada cambio de precio
   - Cálculo automático de variaciones
   - Detección de promociones

3. **update_logs**: Registro de actualizaciones
   - Estadísticas de cada sync
   - Duración, productos nuevos/actualizados
   - Errores

4. **category_cache**: Cache de categorías válidas
   - IDs de categorías
   - Última verificación

### Consultas Útiles

```sql
-- Top 10 productos con más cambios de precio
SELECT p.display_name, COUNT(ph.id) as changes
FROM products p
JOIN price_history ph ON p.id = ph.product_id
GROUP BY p.id
ORDER BY changes DESC
LIMIT 10;

-- Productos con mayor bajada de precio (últimos 7 días)
SELECT p.display_name, ph.price_change, ph.price_change_percent
FROM products p
JOIN price_history ph ON p.id = ph.product_id
WHERE ph.recorded_at >= datetime('now', '-7 days')
  AND ph.price_change < 0
ORDER BY ph.price_change ASC
LIMIT 20;
```

## 🔄 Actualización Automática

### Opción 1: Cron (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Actualizar cada 6 horas
0 */6 * * * cd /path/to/Mercadona_Agent && /path/to/python run_update.py >> logs/update.log 2>&1
```

### Opción 2: Systemd Timer (Linux)

```ini
# /etc/systemd/system/mercadona-update.timer
[Unit]
Description=Actualizar productos Mercadona cada 6h

[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Opción 3: Scheduler Python

Crear `scheduler.py`:

```python
import schedule
import time
from src.database import Database
from src.updater import ProductUpdater

db = Database()
updater = ProductUpdater(db)

# Actualizar cada 6 horas
schedule.every(6).hours.do(updater.run_update)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## 🐛 Troubleshooting

### Error: "No se pudo cargar productos"

```bash
# Verificar que existen productos en BD
sqlite3 data/mercadona.db "SELECT COUNT(*) FROM products;"

# Si está vacía, cargar datos
python run_update.py
```

### Error: "API not responding"

```bash
# Verificar que el backend está corriendo
curl http://localhost:8000/api/stats

# Ver logs del servidor
# (salida en consola donde ejecutaste run_backend.py)
```

### Frontend no usa la API

1. Abrir DevTools → Console
2. Verificar mensajes:
   - `"Cargando productos desde API..."` ✅
   - `"Cargando productos desde CSV..."` ⚠️ (no encuentra API)

3. Verificar config.js:
   ```javascript
   api: {
     enabled: true,  // Debe ser true
     baseURL: 'http://localhost:8000/api'  // URL correcta
   }
   ```

## 📈 Performance

### Comparativa Scraping vs API

| Métrica | Scraping (Selenium) | API Backend |
|---------|---------------------|-------------|
| Tiempo total | ~45-60 minutos | ~10-15 minutos |
| Recursos CPU | Alto (Chrome) | Bajo |
| Memoria RAM | 2-4 GB | 200-500 MB |
| Fiabilidad | Media (HTML changes) | Alta (API estable) |
| Rate limiting | Alto riesgo | Bajo riesgo |

### Base de Datos

- **Tamaño**: ~50-80 MB con 12k productos + 1 mes de histórico
- **Queries**: <10ms para búsquedas simples
- **Inserts**: ~2000 productos/segundo

## 🚢 Deploy a Producción

### Railway / Render

1. Crear `Procfile`:
```
web: uvicorn src.api:app --host 0.0.0.0 --port $PORT
```

2. Variables de entorno:
```
DATABASE_URL=postgresql://...
WAREHOUSE=mad1
```

3. Configurar update periódico vía cron job o worker

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -e .
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📝 Notas

- La primera actualización escanea 1500 IDs de categorías (tarda ~2 min)
- Actualizaciones subsecuentes usan cache y son más rápidas
- El histórico se almacena indefinidamente (considera limpiar datos antiguos)
- La API de Mercadona no requiere autenticación pero tiene rate limits implícitos

## 📄 Licencia

MIT - Ver LICENSE para más detalles
