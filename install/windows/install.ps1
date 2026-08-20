# Mini-PLM Install Script for Windows
# Usage: Right-click and "Run with PowerShell", or run: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$DEFAULT_DIR = "$HOME\mini-plm"
# Remembered so update.ps1 can find a non-default install without asking again.
$LOCATION_FILE = "$env:APPDATA\mini-plm\location.txt"

Write-Host "=== Mini-PLM Installer ===" -ForegroundColor Cyan
Write-Host ""

# Choose where everything lives. This directory holds your uploaded files, so it
# does not have to sit on C: -- point it at D:\mini-plm or any other drive with room.
Write-Host "[1/4] Choosing install location..."
$INSTALL_DIR = Read-Host "    Where should Mini-PLM keep its files? (default: $DEFAULT_DIR)"
if (-not $INSTALL_DIR) { $INSTALL_DIR = $DEFAULT_DIR }
$INSTALL_DIR = $INSTALL_DIR.Trim('"').Trim()

try {
    New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\mpp_files" -ErrorAction Stop | Out-Null
    New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\nginx\conf" -ErrorAction Stop | Out-Null
} catch {
    Write-Host "    Cannot create $INSTALL_DIR. Check the path and your permissions." -ForegroundColor Red
    Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Set-Location $INSTALL_DIR
$INSTALL_DIR = (Get-Location).Path   # store the absolute path, not whatever was typed
New-Item -ItemType Directory -Force -Path (Split-Path $LOCATION_FILE) | Out-Null
Set-Content -Path $LOCATION_FILE -Value $INSTALL_DIR -Encoding utf8
Write-Host "    Installing to $INSTALL_DIR"

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

# Generate SECRET_KEY
$SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(50))"
$content = Get-Content "docker-compose-prod.yml" -Raw
$content = $content -replace "SECRET_KEY=change-me", "SECRET_KEY=$SECRET_KEY"
Set-Content "docker-compose-prod.yml" $content

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
Write-Host ""
Write-Host "There is no app to launch. Mini-PLM runs in the background and you use it"
Write-Host "in a browser."
Write-Host ""
Write-Host "    Open:  http://$SERVER_IP`:$PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "The first visit shows a setup wizard for creating your admin account."
Write-Host "It restarts with your machine, so you do not need to run this again."
Write-Host "(Docker Desktop must be set to start at login.)"
Write-Host ""
Write-Host "Your files:  $INSTALL_DIR\mpp_files    (this is the directory to back up)"
Write-Host "To stop:     cd `"$INSTALL_DIR`"; docker compose -f docker-compose-prod.yml stop"
Write-Host "To start:    cd `"$INSTALL_DIR`"; docker compose -f docker-compose-prod.yml start"

