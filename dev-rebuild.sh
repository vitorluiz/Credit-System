#!/bin/bash

# Script para rebuild rápido do frontend em desenvolvimento
# Uso: ./dev-rebuild.sh

echo "🔄 Rebuilding frontend for development..."

# Parar apenas o frontend
docker compose --env-file env-copia stop frontend

# Rebuild apenas o frontend (sem --no-cache para ser mais rápido)
docker compose --env-file env-copia build frontend

# Iniciar o frontend
docker compose --env-file env-copia up -d frontend

echo "✅ Frontend rebuilt and started!"
echo "🌐 Access: http://localhost:3000"
echo ""
echo "💡 Tip: Use Ctrl+F5 or Cmd+Shift+R to force refresh browser cache"
