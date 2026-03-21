#!/bin/bash
# Script para ejecutar migración y actualización en Railway

set -e

API_URL="https://web-production-babbe.up.railway.app"

echo "======================================"
echo "RAILWAY DEPLOYMENT UPDATE SCRIPT"
echo "======================================"
echo ""

# 1. Verificar que la API esté disponible
echo "1️⃣  Verificando que Railway API esté disponible..."
if curl -s -f -o /dev/null "${API_URL}/"; then
    echo "✅ API disponible"
else
    echo "❌ API no disponible. Espera a que Railway termine de redesplegar."
    exit 1
fi
echo ""

# 2. Ejecutar migración
echo "2️⃣  Ejecutando migración (agregar columna 'photos')..."
MIGRATION_RESULT=$(curl -s -X POST "${API_URL}/api/migrate/add-photos")
echo "$MIGRATION_RESULT" | python3 -m json.tool
echo ""

# 3. Esperar un poco antes de actualizar
echo "3️⃣  Esperando 5 segundos antes de actualizar productos..."
sleep 5
echo ""

# 4. Disparar actualización
echo "4️⃣  Disparando actualización de productos (esto tardará ~10-15 minutos)..."
UPDATE_RESULT=$(curl -s -X POST "${API_URL}/api/update")
echo "$UPDATE_RESULT" | python3 -m json.tool
echo ""

echo "======================================"
echo "✅ PROCESO COMPLETADO"
echo "======================================"
echo ""
echo "Próximos pasos:"
echo "- Espera ~10-15 minutos a que se complete la actualización"
echo "- Verifica el estado: curl ${API_URL}/api/update/status | python3 -m json.tool"
echo "- Verifica stats: curl ${API_URL}/api/stats | python3 -m json.tool"
echo "- Abre el frontend: https://computingvictor.github.io/Mercadona_Agent/"
echo ""
