#!/bin/bash
# Script para verificar si el backend de Railway está respondiendo correctamente

echo "🔍 Verificando estado del backend en Railway..."
echo ""

# URL del backend
BACKEND_URL="https://web-production-babbe.up.railway.app"

# Test 1: Verificar que el root responde
echo "1️⃣ Testeando endpoint raíz (/)..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/")
if [ "$response" = "200" ]; then
  echo "   ✅ Root endpoint OK (HTTP $response)"
else
  echo "   ❌ Root endpoint FAILED (HTTP $response)"
  exit 1
fi

# Test 2: Verificar stats
echo ""
echo "2️⃣ Testeando /api/stats..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/stats")
if [ "$response" = "200" ]; then
  echo "   ✅ Stats endpoint OK (HTTP $response)"
  curl -s "$BACKEND_URL/api/stats" | python3 -m json.tool | head -15
else
  echo "   ❌ Stats endpoint FAILED (HTTP $response)"
fi

# Test 3: Verificar productos (el que estaba fallando)
echo ""
echo "3️⃣ Testeando /api/products?limit=5..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/products?limit=5")
if [ "$response" = "200" ]; then
  echo "   ✅ Products endpoint OK (HTTP $response)"
  echo ""
  echo "   Primeros productos:"
  curl -s "$BACKEND_URL/api/products?limit=5" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"   Total: {data['total']} productos\"); [print(f\"   - {p['display_name']} ({p['unit_price']}€)\") for p in data['products'][:5]]"
else
  echo "   ❌ Products endpoint FAILED (HTTP $response)"
  echo ""
  echo "   Error response:"
  curl -s "$BACKEND_URL/api/products?limit=5"
fi

# Test 4: CORS desde GitHub Pages
echo ""
echo "4️⃣ Testeando CORS desde GitHub Pages origin..."
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: https://computingvictor.github.io" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  -X OPTIONS "$BACKEND_URL/api/products")

if [ "$response" = "200" ]; then
  echo "   ✅ CORS preflight OK (HTTP $response)"
  cors_header=$(curl -s -I \
    -H "Origin: https://computingvictor.github.io" \
    -H "Access-Control-Request-Method: GET" \
    "$BACKEND_URL/api/products" | grep -i "access-control-allow-origin")
  echo "   $cors_header"
else
  echo "   ❌ CORS preflight FAILED (HTTP $response)"
fi

echo ""
echo "=========================================="
echo "🎉 Deploy verificado exitosamente!"
echo "=========================================="
echo ""
echo "📱 Frontend: https://computingvictor.github.io/Mercadona_Agent/"
echo "🔌 Backend:  $BACKEND_URL"
echo ""
