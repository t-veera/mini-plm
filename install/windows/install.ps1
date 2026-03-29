# Mini-PLM Install Script for Windows
# Usage: Right-click and "Run with PowerShell", or run: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$INSTALL_DIR = "$HOME\mini-plm"

Write-Host "=== Mini-PLM Installer ===" -ForegroundColor Cyan
Write-Host ""

# Create directory structure
Write-Host "[1/4] Creating directories..."
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\mpp_files" | Out-Null
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\nginx\conf" | Out-Null

Set-Location $INSTALL_DIR

# Download repo
Write-Host "[2/4] Downloading Mini-PLM..."
Invoke-WebRequest -Uri "https://github.com/t-veera/mini-plm/archive/refs/heads/main.zip" -OutFile "main.zip"
Expand-Archive -Path "main.zip" -DestinationPath "." -Force

# Copy files
Copy-Item "mini-plm-main\nginx\conf\nginx.conf" "nginx\conf\nginx.conf" -Force
Copy-Item "mini-plm-main\nginx\conf\default.conf" "nginx\conf\default.conf" -Force
Copy-Item "mini-plm-main\docker-compose-prod.yml" "docker-compose-prod.yml" -Force

# Cleanup
Remove-Item -Recurse -Force "mini-plm-main"
Remove-Item -Force "main.zip"

# Configure port
Write-Host ""
Write-Host "[3/4] Configuring port..."
$PORT = Read-Host "    Enter port to run Mini-PLM on (default: 8080)"
if (-not $PORT) { $PORT = "8080" }

$SERVER_IP = Read-Host "    Enter your server IP address (or press Enter for localhost)"
if (-not $SERVER_IP) { $SERVER_IP = "localhost" }

# Update port and CSRF origins in compose file
$content = Get-Content "docker-compose-prod.yml" -Raw
$content = $content -replace '- "80:80"', "- `"$PORT`:80`""
$content = $content -replace 'CSRF_TRUSTED_ORIGINS=http://localhost,http://127.0.0.1', "CSRF_TRUSTED_ORIGINS=http://localhost,http://127.0.0.1,http://$SERVER_IP`:$PORT"
Set-Content "docker-compose-prod.yml" $content

# Pull and start
Write-Host ""
Write-Host "[4/4] Pulling images and starting containers..."
docker pull ghcr.io/t-veera/mini-plm:main-backend
docker pull ghcr.io/t-veera/mini-plm:main-frontend
docker compose -f docker-compose-prod.yml up -d

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Open your browser and go to: http://$SERVER_IP`:$PORT"
Write-Host "The setup wizard will guide you through creating your admin account."
