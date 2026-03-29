#!/bin/bash
# Mini-PLM Update Script for Synology NAS
# Usage: bash update.sh

set -e

INSTALL_DIR="/volume1/docker/mini-plm"

echo "=== Mini-PLM Updater ==="
echo ""

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
