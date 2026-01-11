# Deployment en Railway - Actualización Automática Semanal

Este documento explica cómo desplegar el scraper de Mercadona en Railway para que actualice automáticamente la base de datos de productos cada semana.

## Arquitectura

El sistema desplegado en Railway incluye:
- **Scraper automatizado**: Se ejecuta semanalmente para obtener productos actualizados
- **Procesamiento de datos**: Ejecuta los notebooks de análisis automáticamente
- **Actualización de GitHub Pages**: Actualiza el CSV para la aplicación web

## Prerrequisitos

1. **Cuenta en Railway**: Crear cuenta en [railway.app](https://railway.app)
2. **Repositorio GitHub**: Tu proyecto debe estar en GitHub
3. **GitHub Personal Access Token**: Para poder hacer push automático

## Configuración Inicial

### 1. Crear GitHub Personal Access Token

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con permisos:
   - `repo` (acceso completo a repositorios)
   - `workflow` (si usas GitHub Actions)
3. Guarda el token, lo necesitarás en Railway

### 2. Desplegar en Railway

#### Opción A: Desde GitHub (Recomendado)

1. Accede a [railway.app](https://railway.app)
2. Click en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Autoriza Railway para acceder a tu repositorio
5. Selecciona el repositorio `Mercadona_Agent`
6. Railway detectará automáticamente el `Dockerfile`

#### Opción B: Desde Railway CLI

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login en Railway
railway login

# Inicializar proyecto
railway init

# Desplegar
railway up
```

### 3. Configurar Variables de Entorno

En el dashboard de Railway, ve a tu proyecto → Variables y añade:

```bash
# REQUERIDO: Token de GitHub para hacer push automático
GITHUB_TOKEN=tu_github_personal_access_token

# OPCIONAL: Ejecutar inmediatamente al iniciar (útil para testing)
RUN_IMMEDIATELY=false

# OPCIONAL: Configuración de Chrome headless
CHROME_BIN=/usr/bin/google-chrome
CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
DISPLAY=:99
```

### 4. Configurar el Volumen Persistente (Opcional)

Si quieres mantener los datos entre deployments:

1. En Railway → Settings → Volumes
2. Crea un nuevo volumen montado en `/app/data`
3. Esto permitirá que los datos persistan entre actualizaciones

## Funcionamiento

### Scheduler Automático

El script `scheduler.py` ejecuta las siguientes tareas:

1. **Cada domingo a las 2:00 AM**:
   - Ejecuta el scraper paralelo de Mercadona (`src/scraper_parallel.py`)
     - Scraping paralelo con 10 workers para mayor velocidad
     - Extracción de información nutricional
     - Detección automática de novedades
     - Generación directa del CSV `products_macro.csv`
   - Verifica la integridad del CSV generado
   - Hace commit y push a GitHub
   - Actualiza automáticamente GitHub Pages

### Logs y Monitoreo

Los logs están disponibles en:
- **Railway Dashboard**: Ver logs en tiempo real
- **Archivo local**: `scheduler.log` (dentro del contenedor)

Para ver logs en tiempo real:
```bash
railway logs
```

## Testing Local

Antes de desplegar, puedes probar el sistema localmente con Docker:

```bash
# Construir la imagen
docker build -t mercadona-scraper .

# Ejecutar con variables de entorno
docker run -e GITHUB_TOKEN=tu_token \
           -e RUN_IMMEDIATELY=true \
           mercadona-scraper
```

## Personalización del Horario

Para cambiar el horario de ejecución, edita `scheduler.py`:

```python
# Cambiar de domingo a otro día
schedule.every().monday.at("02:00").do(weekly_update_job)

# Ejecutar diariamente
schedule.every().day.at("02:00").do(weekly_update_job)

# Ejecutar cada 12 horas
schedule.every(12).hours.do(weekly_update_job)
```

## Solución de Problemas

### El scraper no se ejecuta

1. **Verificar logs**: `railway logs`
2. **Comprobar variables de entorno**: Asegúrate de que `GITHUB_TOKEN` esté configurado
3. **Verificar horario**: El schedule por defecto es los domingos a las 2 AM

### Error de Chrome/ChromeDriver

Si ves errores relacionados con Chrome:
- Asegúrate de que el Dockerfile incluye todas las dependencias de Chrome
- Verifica que las variables de entorno `CHROME_BIN` y `DISPLAY` estén configuradas

### No se actualiza GitHub Pages

1. **Verificar permisos del token**: Debe tener permisos `repo`
2. **Comprobar nombre del branch**: Por defecto usa `main`, cámbialo en `scheduler.py` si usas otro
3. **Ver logs de git**: Los errores de push aparecerán en los logs

### Out of Memory (OOM)

Si el contenedor se queda sin memoria:
1. Reduce el rango de páginas en `scrape_mercadona(start_page=0, end_page=300)`
2. En Railway → Settings → Resources, aumenta la memoria asignada

## Monitoreo y Mantenimiento

### Healthchecks (Opcional)

Puedes añadir un healthcheck endpoint para monitorear el estado:

```python
# En scheduler.py, añadir un servidor HTTP simple
from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

# Ejecutar en un thread separado
import threading
server = HTTPServer(('0.0.0.0', 8080), HealthCheckHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
```

### Notificaciones

Para recibir notificaciones cuando el scraper termine, puedes integrar:
- **Email**: Usando `smtplib`
- **Slack**: Usando webhooks
- **Discord**: Usando webhooks
- **Telegram**: Usando el bot API

Ejemplo para Slack:

```python
import requests

def send_slack_notification(message):
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    if webhook_url:
        requests.post(webhook_url, json={'text': message})

# En weekly_update_job()
send_slack_notification("✅ Database updated successfully!")
```

## Costos Estimados

Railway ofrece:
- **Plan gratuito**: $5 de crédito mensual
- **Plan Pro**: $20/mes con $10 de crédito incluido

Para este proyecto (ejecutándose semanalmente):
- **Uso estimado**: ~$2-5/mes
- **El plan gratuito debería ser suficiente**

## Alternativas a Railway

Si prefieres otras plataformas:
- **Render**: Similar a Railway, plan gratuito disponible
- **Fly.io**: Excelente para contenedores, plan gratuito
- **Google Cloud Run**: Pay-per-use, muy económico para workloads esporádicas
- **AWS ECS + CloudWatch Events**: Más complejo pero más control

## Recursos Adicionales

- [Railway Docs](https://docs.railway.app)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Schedule Library Docs](https://schedule.readthedocs.io)

## Soporte

Si encuentras problemas:
1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Prueba localmente con Docker
4. Abre un issue en el repositorio
