# ⏰ Configuración de Actualizaciones Automáticas

## 📅 Frecuencia de Actualización

### Actualización DIARIA (3:00 AM)
El sistema está configurado para ejecutar actualizaciones **todos los días a las 3:00 AM** (hora del servidor).

**Archivo:** `src/scheduler.py` línea 53
```python
schedule.every().day.at("03:00").do(self.run_scheduled_update)
```

### ¿Qué se actualiza diariamente?

1. **Productos** - Información completa de todos los productos activos
2. **Novedades** - Marca de productos nuevos (`is_new`)
3. **Bajadas de precio** - Marca de productos rebajados (`price_decreased`)
4. **Histórico de precios** - Solo si hay cambios significativos

---

## 💰 Sistema de Histórico de Precios

### Lógica de Acumulación Inteligente

El histórico de precios **NO se guarda en cada actualización**, solo cuando hay cambios reales.

**Archivo:** `src/database.py` línea 161-162

```python
if old_price and new_price and abs(old_price - new_price) > 0.01:
    self._record_price_change(session, existing, old_price, new_price)
```

### Criterios para guardar histórico:

✅ **SÍ se guarda** cuando:
- El precio cambió más de **0.01€** (1 céntimo)
- Es un producto nuevo (primera vez que se detecta)
- Hay un cambio de precio oficial detectado por Mercadona

❌ **NO se guarda** cuando:
- El precio es exactamente igual
- La diferencia es menor a 0.01€ (ignorar fluctuaciones mínimas)
- Solo cambió información no-precio (nombre, categoría, etc.)

### Tabla PriceHistory

Cada registro guardado incluye:

```python
class PriceHistory:
    product_id: str           # ID del producto
    unit_price: float         # Precio actual
    bulk_price: float         # Precio al por mayor (si aplica)
    reference_price: float    # Precio por unidad de referencia (€/kg)
    price_change: float       # Cambio absoluto (€)
    price_change_percent: float  # Cambio porcentual (%)
    is_new: bool              # Si era novedad en ese momento
    is_promotion: bool        # Si era una bajada (change < 0)
    recorded_at: datetime     # Timestamp del cambio
```

---

## 📊 Análisis del Histórico

### Rankings Disponibles

1. **Subidas de Precio** - `/api/rankings/price-increases?days=30`
   - Top productos con mayor incremento
   - Configurable: 7, 30, 90, 365 días
   - Muestra: % de subida, precio min/max, cantidad de cambios

2. **Bajadas de Precio** - `/api/rankings/price-decreases?days=30`
   - Top productos con mayor descuento
   - Mismo formato que subidas
   - Útil para identificar mejores ofertas

3. **Histórico Individual** - `/api/products/{id}/history?days=30`
   - Todos los cambios de un producto específico
   - Incluye gráficos en frontend (modal de producto)
   - Stats: min, max, promedio

---

## 🔄 Flujo de Actualización Diaria

### Paso a paso:

```
03:00 AM - Inicia actualización automática
    ↓
1. Cargar categorías desde API Mercadona
    ↓
2. Para cada categoría:
   - Obtener productos activos
   - Comparar con BD local
    ↓
3. Para cada producto:
   - Verificar si existe
   - Si NO existe → Crear + Guardar precio inicial
   - Si existe:
     - Comparar precio actual vs anterior
     - Si cambió > 0.01€ → Guardar en PriceHistory
     - Actualizar campos del producto
    ↓
4. Actualizar flags especiales:
   - Novedades oficiales (API /home/new-arrivals/)
   - Bajadas de precio (API /home/price-drops/)
    ↓
5. Registrar log de actualización
    ↓
03:15 AM (aprox.) - Finaliza actualización
```

**Duración típica:** 10-15 minutos para ~12,000 productos

---

## 📈 Beneficios del Sistema Diario

### Ventajas:

1. **Detección rápida de cambios**
   - Subidas/bajadas detectadas en 24h máximo
   - Usuarios ven tendencias actualizadas

2. **Histórico completo**
   - Datos acumulados día a día
   - Permite análisis de tendencias semanales/mensuales

3. **Alertas oportunas**
   - Sistema de alertas de precio funciona mejor
   - Notificaciones más frecuentes

4. **Analytics precisos**
   - Ranking de precios más actualizado
   - Gráficos con datos diarios

### Almacenamiento eficiente:

- **Con cambios diarios:** ~200-500 registros/día
- **Sin cambios:** 0 registros/día
- **Promedio:** ~300 registros/día = 9,000/mes
- **Tamaño BD:** ~5-10 MB/mes de histórico

---

## ⚙️ Configuración Manual

### Cambiar frecuencia de actualización

**Archivo:** `src/scheduler.py` línea 53

```python
# Opciones disponibles:

# Cada hora
schedule.every().hour.at(":00").do(self.run_scheduled_update)

# Diario (actual)
schedule.every().day.at("03:00").do(self.run_scheduled_update)

# Semanal (lunes)
schedule.every().monday.at("03:00").do(self.run_scheduled_update)

# Múltiples días
schedule.every().day.at("03:00").do(self.run_scheduled_update)  # Todos los días
schedule.every().day.at("15:00").do(self.run_scheduled_update)  # Dos veces al día
```

### Cambiar umbral de cambio de precio

**Archivo:** `src/database.py` línea 161

```python
# Actual: 0.01€ (1 céntimo)
if abs(old_price - new_price) > 0.01:

# Más sensible (cualquier cambio)
if abs(old_price - new_price) > 0.001:

# Menos sensible (solo cambios >5 céntimos)
if abs(old_price - new_price) > 0.05:
```

---

## 🚀 Ejecución Manual

### Desde Railway Dashboard

```bash
# Disparar actualización inmediata (sin esperar a las 3 AM)
curl -X POST https://web-production-babbe.up.railway.app/api/update
```

### Desde línea de comandos local

```bash
# Actualización completa
python -c "from src.updater import ProductUpdater; from src.database import Database; updater = ProductUpdater(Database()); updater.run_update()"

# Solo novedades
curl -X POST http://localhost:8000/api/update/new-arrivals

# Solo bajadas de precio
curl -X POST http://localhost:8000/api/update/price-drops
```

### Verificar estado de última actualización

```bash
curl https://web-production-babbe.up.railway.app/api/update/status | jq
```

**Respuesta:**
```json
{
  "status": "completed",
  "started_at": "2026-03-22T03:00:05",
  "completed_at": "2026-03-22T03:12:18",
  "duration_seconds": 733,
  "products_found": 12450,
  "products_new": 12,
  "products_updated": 145,
  "price_changes": 287,
  "error_message": null
}
```

---

## 📊 Monitoreo

### Logs importantes

Railway logs mostrará:
```
2026-03-22 03:00:00 - INFO - Scheduler iniciado
2026-03-22 03:00:00 - INFO - Próximas actualizaciones: DIARIAMENTE a las 03:00 AM
...
2026-03-22 03:00:05 - INFO - INICIANDO ACTUALIZACIÓN PROGRAMADA
2026-03-22 03:12:18 - INFO - ACTUALIZACIÓN PROGRAMADA COMPLETADA
2026-03-22 03:12:18 - INFO - Registrados 287 cambios de precio
```

### Métricas clave a monitorear

1. **Duración:** Debe ser < 20 minutos
2. **Price changes:** Típicamente 200-500/día
3. **Errors:** Debe ser 0
4. **Products found:** Debe ser ~12,000-13,000

---

## 🔍 Troubleshooting

### Problema: Actualización no se ejecuta

**Verificar:**
1. Scheduler está corriendo: `railway logs | grep "Scheduler iniciado"`
2. Hora del servidor: Puede diferir de tu zona horaria
3. Railway no está en sleep: Plan hobby duerme después de inactividad

**Solución:**
- Configurar Railway para no dormir (plan pro)
- O ejecutar manualmente cuando sea necesario

### Problema: Demasiados registros en PriceHistory

**Verificar:**
```sql
SELECT COUNT(*) FROM price_history;
SELECT COUNT(*) FROM price_history WHERE recorded_at > NOW() - INTERVAL '7 days';
```

**Solución:**
- Aumentar umbral de cambio de 0.01 a 0.05
- Implementar limpieza de registros antiguos (>1 año)

### Problema: No se detectan cambios de precio

**Verificar:**
```python
# En database.py, añadir log:
logger.info(f"Precio anterior: {old_price}, nuevo: {new_price}, diferencia: {abs(old_price - new_price)}")
```

**Posibles causas:**
- Mercadona no cambió precios
- Umbral muy alto (>0.01)
- Producto no está en BD

---

## 📝 Notas Importantes

### Zona Horaria

- Scheduler usa hora UTC
- 03:00 UTC = 04:00 CET (invierno) / 05:00 CEST (verano)
- Ajustar según necesidad regional

### Warehouse

- Por defecto: `mad1` (Madrid)
- Cambiar en `src/updater.py` para otras ciudades
- Posibles: `mad1`, `bcn1`, `vlc1`, `svq1`, etc.

### Caché de Categorías

- Se usa `CategoryCache` para evitar escanear todas las categorías
- Cache válido por 7 días
- Forzar rescan: `use_cache=False`

---

## 🎯 Recomendaciones

### Optimización

1. **Horario ideal:** 03:00-05:00 AM (menos tráfico)
2. **Frecuencia:** Diaria es óptimo (balance actualidad/almacenamiento)
3. **Umbral:** 0.01€ es adecuado (ignora fluctuaciones menores)
4. **Retención:** Mantener histórico de 1 año, archivar lo anterior

### Escalabilidad

Si la BD crece mucho:
```python
# Añadir índices en PriceHistory
CREATE INDEX idx_price_history_product_date
ON price_history(product_id, recorded_at DESC);

# Particionar tabla por fecha
# O implementar archivado mensual
```

---

**Última actualización:** 22 de Marzo de 2026
**Versión:** 3.0.0
