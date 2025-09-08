# Script PowerShell para rebuild rápido do frontend em desenvolvimento
# Uso: .\dev-rebuild.ps1

Write-Host "🔄 Rebuilding frontend for development..." -ForegroundColor Yellow

# Parar apenas o frontend
docker compose --env-file env-copia stop frontend

# Rebuild apenas o frontend (sem --no-cache para ser mais rápido)
docker compose --env-file env-copia build frontend

# Iniciar o frontend
docker compose --env-file env-copia up -d frontend

Write-Host "✅ Frontend rebuilt and started!" -ForegroundColor Green
Write-Host "🌐 Access: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tip: Use Ctrl+F5 or Cmd+Shift+R to force refresh browser cache" -ForegroundColor Magenta
