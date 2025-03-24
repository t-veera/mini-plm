# Product Decision Framework

A comprehensive application for managing product decisions, featuring frameworks for pivot/hold decisions, resource allocation, and team collaboration.

## Installation and Setup

### Using Docker (Recommended)

The easiest way to run this application is using Docker.

#### Prerequisites

- Docker installed on your system
- Docker Compose (included with Docker Desktop for Windows/Mac)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/product-decision-framework.git
cd product-decision-framework

# Start the application
docker-compose up -d
```

The application will be available at http://localhost:3000

### Synology NAS Installation

To install on a Synology NAS:

1. Open your Synology DSM interface
2. Open Docker from the main menu
3. In the Registry tab, search for "ghcr.io/yourusername/product-decision-framework"
4. Download the latest tag
5. Once downloaded, go to the Image tab and select the image
6. Click Launch and follow the wizard:
   - Set a container name (e.g., product-decision-framework)
   - Check "Enable auto-restart"
   - In the Advanced Settings > Volume tab, add a volume mapping for data persistence if needed
   - In the Advanced Settings > Port settings, map port 3000 to your desired port
7. Click Apply and then Next to start the container

### Updating

#### For Docker Compose users:

```bash
# Pull the latest version
docker-compose pull

# Restart the containers with the new image
docker-compose up -d
```

#### For Synology users:

1. Go to the Registry tab in Docker
2. Search for your image again and download the latest
3. Go to the Container tab
4. Stop the existing container
5. Clear the container (this removes the container but keeps your data if you set up volume mapping)
6. Go to the Image tab and launch the new version
7. Use the same settings as before

## Features

- Decision frameworks for product pivots
- Resource allocation tools
- Team collaboration enhancements
- Cross-functional alignment tools
- Pattern recognition for product decisions

## License

[Your License Here]

## Contact

[Your Contact Information]
