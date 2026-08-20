#!/bin/bash
# Mini-PLM Update Script for macOS
# Usage: bash update.sh

set -e

LOCATION_FILE="$HOME/.config/mini-plm/location"

echo "=== Mini-PLM Updater ==="
echo ""

# Read where install.sh put things. Installs from before the location prompt have
# no marker file, so fall back to the old fixed default.
if [ -f "$LOCATION_FILE" ]; then
    INSTALL_DIR="$(cat "$LOCATION_FILE")"
else
    INSTALL_DIR="$HOME/mini-plm"
fi

if [ ! -f "$INSTALL_DIR/docker-compose-prod.yml" ]; then
    echo "No Mini-PLM install found at $INSTALL_DIR"
    read -p "    Enter your Mini-PLM directory: " INSTALL_DIR </dev/tty
    INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"
    if [ ! -f "$INSTALL_DIR/docker-compose-prod.yml" ]; then
        echo "    Still no docker-compose-prod.yml there. Stopping."
        exit 1
    fi
    mkdir -p "$(dirname "$LOCATION_FILE")"
    printf '%s\n' "$INSTALL_DIR" > "$LOCATION_FILE"
fi

echo "Updating the install at $INSTALL_DIR"
cd "$INSTALL_DIR"

echo "[1/3] Stopping containers..."
docker compose -f docker-compose-prod.yml down

echo "[2/3] Pulling latest images..."
docker rmi ghcr.io/t-veera/mini-plm:main-backend 2>/dev/null || true
docker rmi ghcr.io/t-veera/mini-plm:main-frontend 2>/dev/null || true
docker pull ghcr.io/t-veera/mini-plm:main-backend
docker pull ghcr.io/t-veera/mini-plm:main-frontend

echo "[3/3] Starting containers..."
docker compose -f docker-compose-prod.yml up -d

echo ""
echo "=== Done! Mini-PLM is up to date ==="
