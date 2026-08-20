#!/bin/bash
# Mini-PLM Install Script for Linux
# Usage: bash install.sh

set -e

DEFAULT_DIR="$HOME/mini-plm"
# Remembered so update.sh can find a non-default install without asking again.
LOCATION_FILE="$HOME/.config/mini-plm/location"

echo "=== Mini-PLM Installer ==="
echo ""

# Choose where everything lives. This directory holds your uploaded files, so it
# wants to be somewhere with room and somewhere you back up.
echo "[1/4] Choosing install location..."
read -p "    Where should Mini-PLM keep its files? (default: $DEFAULT_DIR): " INSTALL_DIR </dev/tty
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_DIR}"
INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"   # a typed ~ is literal, expand it

if ! mkdir -p "$INSTALL_DIR/mpp_files" "$INSTALL_DIR/nginx/conf" 2>/dev/null; then
    echo "    Cannot create $INSTALL_DIR. Check the path and your permissions."
    exit 1
fi
if [ ! -w "$INSTALL_DIR" ]; then
    echo "    $INSTALL_DIR is not writable by $(whoami)."
    exit 1
fi

cd "$INSTALL_DIR"
INSTALL_DIR="$(pwd)"   # store the absolute path, not whatever was typed
mkdir -p "$(dirname "$LOCATION_FILE")"
printf '%s\n' "$INSTALL_DIR" > "$LOCATION_FILE"
echo "    Installing to $INSTALL_DIR"

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
read -p "    Enter port to run Mini-PLM on (default: 8080): " PORT </dev/tty
PORT=${PORT:-8080}
sed -i "s/- \"80:80\"/- \"$PORT:80\"/" docker-compose-prod.yml

# Generate SECRET_KEY
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
sed -i "s|SECRET_KEY=change-me|SECRET_KEY=$SECRET_KEY|" docker-compose-prod.yml

# Update CSRF origins
echo ""
read -p "    Enter your server IP address (or localhost): " SERVER_IP </dev/tty
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
echo ""
echo "There is no app to launch. Mini-PLM runs in the background and you use it"
echo "in a browser."
echo ""
echo "    Open:  http://$SERVER_IP:$PORT"
echo ""
echo "The first visit shows a setup wizard for creating your admin account."
echo "It restarts with your machine, so you do not need to run this again."
echo ""
echo "Your files:  $INSTALL_DIR/mpp_files    (this is the directory to back up)"
echo "To stop:     cd \"$INSTALL_DIR\" && docker compose -f docker-compose-prod.yml stop"
echo "To start:    cd \"$INSTALL_DIR\" && docker compose -f docker-compose-prod.yml start"


