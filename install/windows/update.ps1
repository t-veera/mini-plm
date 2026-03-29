# Mini-PLM Update Script for Windows
# Usage: Right-click and "Run with PowerShell", or run: powershell -ExecutionPolicy Bypass -File update.ps1

$ErrorActionPreference = "Stop"

$INSTALL_DIR = "$HOME\mini-plm"

Write-Host "=== Mini-PLM Updater ===" -ForegroundColor Cyan
Write-Host ""

Set-Location $INSTALL_DIR

Write-Host "[1/3] Stopping containers..."
docker compose -f docker-compose-prod.yml down

Write-Host "[2/3] Pulling latest images..."
docker rmi ghcr.io/t-veera/mini-plm:main-backend 2>$null
docker rmi ghcr.io/t-veera/mini-plm:main-frontend 2>$null
docker pull ghcr.io/t-veera/mini-plm:main-backend
docker pull ghcr.io/t-veera/mini-plm:main-frontend

Write-Host "[3/3] Starting containers..."
docker compose -f docker-compose-prod.yml up -d

Write-Host ""
Write-Host "=== Done! Mini-PLM is up to date ===" -ForegroundColor Green
