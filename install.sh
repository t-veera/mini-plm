#!/bin/bash

# Mini-PLM Installation Script
# Usage: curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ASCII Art Banner
print_banner() {
    echo -e "${BLUE}"
    echo "  __  __ _       _       ____  _     __  __ "
    echo " |  \/  (_)_ __ (_)     |  _ \| |   |  \/  |"
    echo " | |\/| | | '_ \| |_____| |_) | |   | |\/| |"
    echo " | |  | | | | | | |_____|  __/| |___| |  | |"
    echo " |_|  |_|_|_| |_|_|     |_|   |_____|_|  |_|"
    echo -e "${NC}"
    echo "🚀 Installing Mini-PLM - Your Local PLM Solution"
    echo "================================================"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first:"
        echo "  Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose first:"
        echo "  Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "All requirements met!"
}

# Get Docker Compose command (docker-compose or docker compose)
get_compose_cmd() {
    if command_exists docker-compose; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Check if port 80 is available
check_port() {
    if command_exists lsof && lsof -i :80 >/dev/null 2>&1; then
        print_warning "Port 80 is in use. Mini-PLM will try to start anyway."
        print_warning "If installation fails, stop other services using port 80."
    fi
}

# Download docker-compose file
download_compose_file() {
    print_status "Downloading Mini-PLM configuration..."
    
    # Create mini-plm directory
    mkdir -p mini-plm
    cd mini-plm
    
    # Download the simplified docker-compose file
    if command_exists curl; then
        curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/docker-compose.simple.yml -o docker-compose.yml
    elif command_exists wget; then
        wget -q https://raw.githubusercontent.com/t-veera/mini-plm/main/docker-compose.simple.yml -O docker-compose.yml
    else
        print_error "Neither curl nor wget is available. Please install one of them."
        exit 1
    fi
    
    if [ ! -f docker-compose.yml ]; then
        print_error "Failed to download configuration file."
        exit 1
    fi
    
    print_success "Configuration downloaded!"
}

# Start Mini-PLM
start_mini_plm() {
    print_status "Starting Mini-PLM containers..."
    
    COMPOSE_CMD=$(get_compose_cmd)
    
    # Pull latest images
    print_status "Pulling latest images from registry..."
    $COMPOSE_CMD pull
    
    # Start containers
    $COMPOSE_CMD up -d
    
    if [ $? -eq 0 ]; then
        print_success "Mini-PLM started successfully!"
    else
        print_error "Failed to start Mini-PLM. Check the logs with:"
        echo "  cd mini-plm && $COMPOSE_CMD logs"
        exit 1
    fi
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait up to 60 seconds for the service to respond
    for i in {1..30}; do
        if curl -sSf http://localhost >/dev/null 2>&1; then
            print_success "Mini-PLM is ready!"
            return 0
        fi
        sleep 2
        echo -n "."
    done
    
    echo ""
    print_warning "Services may still be starting. Check status with:"
    echo "  cd mini-plm && $(get_compose_cmd) ps"
}

# Print completion message
print_completion() {
    echo ""
    echo "🎉 Mini-PLM Installation Complete!"
    echo "=================================="
    echo ""
    echo "🌐 Access your Mini-PLM at:"
    echo "   http://localhost"
    echo "   http://$(hostname -I | cut -d' ' -f1) (from other devices)"
    echo ""
    echo "📁 Your files will be stored in Docker volumes"
    echo "🔧 Manage your installation:"
    echo "   cd mini-plm"
    echo "   $(get_compose_cmd) ps          # Check status"
    echo "   $(get_compose_cmd) logs        # View logs"
    echo "   $(get_compose_cmd) down        # Stop Mini-PLM"
    echo "   $(get_compose_cmd) up -d       # Start Mini-PLM"
    echo ""
    echo "📚 Need help? Visit: https://github.com/t-veera/mini-plm"
    echo ""
}

# Main installation function
main() {
    print_banner
    check_requirements
    check_port
    download_compose_file
    start_mini_plm
    wait_for_services
    print_completion
}

# Error handling
trap 'print_error "Installation failed. Check the output above for details."' ERR

# Run main function
main