#!/bin/bash
# Mini-PLM Install Script for Linux
# Usage: bash install.sh

set -e

INSTALL_DIR="$HOME/mini-plm"

echo "=== Mini-PLM Installer ==="
echo ""

# Create directory structure
echo "[1/4] Creating directories..."
mkdir -p "$INSTALL_DIR/mpp_files"
mkdir -p "$INSTALL_DIR/nginx/conf"

cd "$INSTALL_DIR"

# Download repo
echo "[2/4] Downloading Mini-PLM..."
curl -L https://github.com/t-veera/mini-plm/archive/refs/heads/main.zip -o main.zip
python3 -c "import zipfile; zipfile.ZipFile('main.zip').extractall('.')"

# Copy files
cp -r mini-plm-main/nginx/conf/nginx.conf nginx/conf/nginx.conf
cp -r mini-plm-main/nginx/conf/default.conf nginx/conf/default.conf
cp mini-plm-main/docker-compose-prod.yml docker-compose-prod.yml

# Cleanup
rm -rf mini-plm-main main.zip

# Configure port
echo ""
echo "[3/4] Configuring port..."
read -p "    Enter port to run Mini-PLM on (default: 8080): " PORT
PORT=${PORT:-8080}
sed -i "s/- \"80:80\"/- \"$PORT:80\"/" docker-compose-prod.yml

# Generate SECRET_KEY
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
sed -i "s|SECRET_KEY=change-me|SECRET_KEY=$SECRET_KEY|" docker-compose-prod.yml

# Update CSRF origins
echo ""
read -p "    Enter your server IP address (or localhost): " SERVER_IP
SERVER_IP=${SERVER_IP:-localhost}
sed -i "s|CSRF_TRUSTED_ORIGINS=http://localhost,http://127.0.0.1|CSRF_TRUSTED_ORIGINS=http://localhost,http://127.0.0.1,http://$SERVER_IP:$PORT|" docker-compose-prod.yml

# Pull and start
echo ""
echo "[4/4] Pulling images and starting containers..."
docker pull ghcr.io/t-veera/mini-plm:main-backend
docker pull ghcr.io/t-veera/mini-plm:main-frontend
docker compose -f docker-compose-prod.yml up -d

echo ""
echo "=== Done! ==="
echo "Open your browser and go to: http://$SERVER_IP:$PORT"
echo "The setup wizard will guide you through creating your admin account."

