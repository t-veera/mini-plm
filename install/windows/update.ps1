# Mini-PLM Update Script for Windows
# Usage: Right-click and "Run with PowerShell", or run: powershell -ExecutionPolicy Bypass -File update.ps1

$ErrorActionPreference = "Stop"

$LOCATION_FILE = "$env:APPDATA\mini-plm\location.txt"

Write-Host "=== Mini-PLM Updater ===" -ForegroundColor Cyan
Write-Host ""

# Read where install.ps1 put things. Installs from before the location prompt have
# no marker file, so fall back to the old fixed default.
if (Test-Path $LOCATION_FILE) {
    $INSTALL_DIR = (Get-Content $LOCATION_FILE -Raw).Trim()
} else {
    $INSTALL_DIR = "$HOME\mini-plm"
}

if (-not (Test-Path "$INSTALL_DIR\docker-compose-prod.yml")) {
    Write-Host "No Mini-PLM install found at $INSTALL_DIR" -ForegroundColor Yellow
    $INSTALL_DIR = (Read-Host "    Enter your Mini-PLM directory").Trim('"').Trim()
    if (-not (Test-Path "$INSTALL_DIR\docker-compose-prod.yml")) {
        Write-Host "    Still no docker-compose-prod.yml there. Stopping." -ForegroundColor Red
        exit 1
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $LOCATION_FILE) | Out-Null
    Set-Content -Path $LOCATION_FILE -Value $INSTALL_DIR -Encoding utf8
}

Write-Host "Updating the install at $INSTALL_DIR"
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
