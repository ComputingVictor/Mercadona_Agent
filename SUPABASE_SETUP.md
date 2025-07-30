# Guía de Configuración de Supabase

Esta guía te ayudará a configurar Supabase para tu aplicación web de supermercado.

## 1. Crear una cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project" o "Sign up"
3. Crea una cuenta con tu email o usando GitHub

## 2. Crear un nuevo proyecto

1. Una vez logueado, haz clic en "New Project"
2. Elige tu organización (o crea una nueva)
3. Completa los detalles del proyecto:
   - **Name**: `mercadona-agent` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (¡guárdala!)
   - **Region**: Selecciona la región más cercana a tus usuarios
4. Haz clic en "Create new project"

## 3. Configurar la base de datos

### 3.1 Ejecutar el script SQL

1. En el dashboard de Supabase, ve a la sección **SQL Editor**
2. Copia todo el contenido del archivo `supabase-setup.sql`
3. Pega el código en el editor SQL
4. Haz clic en **Run** para ejecutar el script

Esto creará todas las tablas necesarias:
- `favorites` - Para productos favoritos del usuario
- `shopping_list` - Para la lista de la compra
- `recently_viewed` - Para productos vistos recientemente
- `user_preferences` - Para configuraciones del usuario
- `products` - Para productos (uso futuro)

### 3.2 Verificar las tablas

1. Ve a **Table Editor** en el dashboard
2. Deberías ver todas las tablas creadas
3. Verifica que las políticas RLS (Row Level Security) estén habilitadas

## 4. Obtener las credenciales del proyecto

1. Ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL** (ej: `https://abcdefgh.supabase.co`)
   - **anon public** key (una clave larga que empieza con `eyJ...`)

## 5. Configurar el código

### 5.1 Actualizar database.js

Abre el archivo `database.js` y actualiza las siguientes líneas con tus credenciales:

```javascript
// Supabase configuration
const SUPABASE_URL = 'https://tu-proyecto-id.supabase.co'; // ← Tu Project URL
const SUPABASE_ANON_KEY = 'tu-clave-anonima-aqui'; // ← Tu anon public key
```

### 5.2 Ejemplo de configuración

```javascript
// Supabase configuration
const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5...';
```

## 6. Configurar la autenticación (opcional pero recomendado)

### 6.1 Configurar proveedores de autenticación

1. Ve a **Authentication** > **Settings**
2. En **Auth Providers**, puedes habilitar:
   - Email (ya habilitado por defecto)
   - Google, GitHub, Discord, etc. (opcional)

### 6.2 Configurar URLs de redirección

1. En **Authentication** > **URL Configuration**
2. Añade tus URLs:
   - **Site URL**: `http://localhost:3000` (para desarrollo) o tu dominio
   - **Redirect URLs**: Las mismas URLs donde funciona tu aplicación

## 7. Probar la aplicación

1. Abre tu aplicación web
2. Intenta registrarte con un email nuevo
3. Revisa tu email para confirmar la cuenta
4. Inicia sesión y prueba las funcionalidades:
   - Añadir productos a favoritos
   - Crear una lista de compras
   - Cambiar configuraciones (tema, vista, etc.)

## 8. Monitorear el uso

### 8.1 Dashboard de uso

1. Ve a **Settings** > **Usage**
2. Monitorea:
   - Database size
   - Auth users
   - Realtime connections
   - Edge functions invocations

### 8.2 Límites del plan gratuito

- **Database**: 500 MB
- **Auth users**: 50,000 monthly active users
- **Edge Functions**: 500,000 invocations
- **Realtime**: 200 concurrent connections

## 9. Solución de problemas comunes

### Error: "Invalid JWT"

- Verifica que hayas copiado correctamente la `anon public` key
- Asegúrate de no haber copiado espacios extra

### Error: "Failed to fetch"

- Verifica que la URL del proyecto sea correcta
- Comprueba tu conexión a internet
- Revisa la consola del navegador para más detalles

### Los datos no se guardan

- Verifica que las políticas RLS estén configuradas correctamente
- Comprueba que el usuario esté autenticado
- Revisa los logs en **Logs** > **API** en Supabase

### Error de CORS

- Añade tu dominio en **Settings** > **API** > **CORS origins**
- Para desarrollo local, añade `http://localhost:3000` o el puerto que uses

## 10. Seguridad y mejores prácticas

### 10.1 Row Level Security (RLS)

- **NUNCA** deshabilites RLS en producción
- Las políticas ya están configuradas en el script SQL
- Cada usuario solo puede acceder a sus propios datos

### 10.2 Claves de API

- **NUNCA** compartas tu `service_role` key públicamente
- Solo usa la `anon public` key en el frontend
- Guarda las claves sensibles en variables de entorno

### 10.3 Backups

- Supabase hace backups automáticos
- Para datos críticos, considera hacer backups manuales
- Ve a **Settings** > **Database** > **Backups**

## 11. Escalabilidad

Cuando tu aplicación crezca, considera:

- **Upgrade a Pro plan** ($25/mes) para más recursos
- **Implementar caché** para reducir consultas a la DB
- **Optimizar consultas** usando índices
- **Implementar paginación** para listas grandes

## 12. Soporte y recursos

- **Documentación oficial**: [docs.supabase.com](https://docs.supabase.com)
- **Discord de la comunidad**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub**: [github.com/supabase/supabase](https://github.com/supabase/supabase)
- **Tutoriales**: [youtube.com/supabase](https://youtube.com/supabase)

---

¡Ya tienes tu aplicación web conectada a una base de datos en la nube completamente gratis! 🎉

Los usuarios podrán:
- Registrarse e iniciar sesión
- Sincronizar sus datos entre dispositivos
- Mantener sus favoritos y listas de compra
- Personalizar sus preferencias

La aplicación funciona tanto con usuarios registrados como invitados, pero solo los usuarios registrados tendrán sincronización en la nube.