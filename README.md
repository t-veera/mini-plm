# Mini-PLM

A lightweight, self-hosted Product Lifecycle Management (PLM) system designed for small to medium product development teams. Built with Django (backend) and React (frontend), Mini-PLM helps you organize product development stages, manage design files with automatic revision control, and track your development process from concept to production.

![Mini-PLM Banner](docs/mini-plm-banner.png)

## 🎯 Why Mini-PLM?

**Your Data Stays Local** - Unlike cloud-based PLM solutions, all your files and data remain on your own server. No vendor lock-in, no monthly subscriptions, no data privacy concerns.

**Universal File Viewer** - Preview multiple file formats directly in your browser without downloading or installing specialized software.

**Integrated Development Process** - Organize your product development using stages and iterations with built-in file revision control.

---

## Table of Contents

1. [Installation](#-installation)
2. [Current Features](#-current-features)
3. [How to Use](#-how-to-use)
4. [File Organization](#-file-organization)
5. [Technical Stack](#-technical-stack)
6. [Coming in Next Update](#-coming-in-next-update)
7. [Use Cases](#-use-cases)
8. [Troubleshooting](#-troubleshooting)
9. [Why Choose Mini-PLM](#-why-choose-mini-plm)
10. [License](#-license)

---

## 🚀 Installation

### Method 1: One-Command Install (Recommended)

**Linux/macOS/WSL:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install.sh | bash
```

**Windows PowerShell:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/t-veera/mini-plm/main/install.sh" -OutFile "install.sh"; bash install.sh
```

The installer will:
- Check system requirements (Docker, Docker Compose)
- Download configuration files
- Pull pre-built images from GitHub Container Registry
- Start all services
- Verify installation

**Access:** Open `http://localhost` in your browser

---

### Method 2: Manual Docker Installation

```bash
# Download configuration
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/docker-compose.simple.yml -o docker-compose.yml

# Start Mini-PLM
docker-compose up -d

# Check status
docker-compose ps
```

---

### Method 3: Portainer (Docker GUI)

1. Open Portainer web interface
2. Go to **Stacks** → **Add stack**
3. Name: `mini-plm`
4. Paste the contents from: `https://raw.githubusercontent.com/t-veera/mini-plm/main/docker-compose.simple.yml`
5. Click **Deploy the stack**
6. Access at `http://your-server-ip`

---

### Method 4: Synology NAS

**Container Manager:**
1. Open **Container Manager** in DSM
2. Go to **Project** → **Create**
3. Choose **Create docker-compose.yml**
4. Paste URL: `https://raw.githubusercontent.com/t-veera/mini-plm/main/docker-compose.simple.yml`
5. Click **Next** → **Done**
6. Access at `http://synology-ip`

---

### Method 5: For Developers

If you want to modify the source code:

```bash
git clone https://github.com/t-veera/mini-plm.git
cd mini-plm
docker-compose -f docker-compose.prod.yml up -d
```

---

### System Requirements

- **Docker** and **Docker Compose** installed
- **2GB RAM** minimum, 4GB recommended  
- **Port 80** available
- Any system: Linux, Windows, macOS, ARM devices

### Data Storage

- **Database**: Stored in Docker volume `postgres_data`
- **Files**: Stored in Docker volume `mini_plm_files`  
- **Data persists** across container restarts and system reboots
- **Backup**: Use `docker volume` commands to backup your data

---

## ✨ Current Features

### 🗂️ File Management & Universal Preview
- **Upload & Store**: All files stored locally on your server (no cloud dependency)
- **Automatic Revision Control**: When you upload the same filename, it creates a new revision with date stamps
- **Universal File Preview**: View files directly in browser without external software:
  - **3D Models**: STL files with interactive 3D viewer
  - **Documents**: PDF, Excel (.xlsx, .xls), Markdown (.md)
  - **Images**: PNG, JPG, GIF with full preview
  - **Code**: Python (.py), C, JavaScript, HTML with syntax highlighting
  - **CAD**: DXF files
  - **Support for .kicad_sch, .kicad_pcb, STP, and DOCX coming in next update**

### 📊 Product Development Structure
- **Create Products**: Organize your development projects
- **Flexible Stages & Iterations**: 
  - Add stages (⛩️ FaToriiGate) for major milestones and reviews
  - Add iterations (🥁 FaDrumSteelpan) for development cycles
  - Customize your process - one product might have 2 iterations → 1 stage → 4 iterations, another might follow a different pattern
- **Click-to-Upload**: Click on any stage/iteration icon to upload files for that phase

### 💰 File Metadata & Tracking
- **Cost Tracking**: Right-click on any file to add price and quantity information
- **Change Documentation**: Add change descriptions when uploading files
- **Revision History**: Full history of all file changes with dates and descriptions

### 🎨 User Interface
- **Flexible Split Layout**: Adjustable panels for file browsing and preview
- **Right-Click Controls**: 
  - Delete stages/iterations by right-clicking on ⛩️ FaToriiGate or 🥁 FaDrumSteelpan icons
  - Add file metadata by right-clicking on files
- **No User Management**: Open access system (user-specific features coming in next update)

---

## 💡 How to Use

### Creating Your First Product
1. Click "New Product" to create a product
2. Add stages (⛩️ FaToriiGate) for major milestones (concept, prototype, testing, production)
3. Add iterations (🥁 FaDrumSteelpan) for development cycles within each stage
4. Click on any stage/iteration to upload relevant files

### File Management
- **Upload**: Click stage/iteration icon → upload files
- **Preview**: Click any file to preview in the right panel
- **Add Metadata**: Right-click file → enter price, quantity
- **Revisions**: Upload same filename to create new revision automatically
- **Delete**: Right-click stage/iteration → delete (removes all associated files)

### Organizing Your Development Process
Mini-PLM is flexible to match your workflow:
- **Hardware Projects**: Concept → Schematic → PCB → Prototype → Testing → Production
- **Software Projects**: Requirements → Design → Development → Testing → Release
- **Mixed Projects**: Research → Proof of Concept → Development → Integration → Validation → Launch

---

## 📁 File Organization

Files are automatically organized by stage/iteration with automatic revision tracking:

```
mpp_files/
├── iteration_1/
│   ├── schematic_v1.pdf
│   ├── firmware_code.py (Revision 1)
│   ├── firmware_code.py (Revision 2)
│   └── test_results.xlsx
├── stage_1/
│   ├── requirements.docx
│   └── concept_design.stl
├── iteration_2/
│   ├── pcb_layout.kicad_pcb
│   └── assembly_guide.pdf
└── stage_2/
    └── final_prototype.stl
```

---

## 🛠️ Technical Stack

- **Backend**: Django + Django REST Framework
- **Frontend**: React with React Bootstrap
- **Database**: PostgreSQL
- **File Preview**: 
  - React Three Fiber (3D models)
  - React Syntax Highlighter (code)
  - React Markdown (markdown)
  - Native browser viewers (PDF, images, Excel)
- **Deployment**: Docker Compose with Nginx reverse proxy

---

## 🔄 Coming in Next Update

The following features are currently in development:

- **📊 BOM Dashboard**: Dedicated Bill of Materials view with component cost tracking and purchasing management
- **⬇️ Download Options**: Bulk download of files, export project data
- **👥 User Management**: User-specific file access, permissions, and collaboration features
- **📈 Enhanced Analytics**: Project cost analysis, timeline tracking, and development metrics
- **🔧 Additional File Support**: .kicad_sch, .kicad_pcb, STP, and DOCX preview capabilities

---

## 🤝 Use Cases

Mini-PLM is perfect for:

- **Hardware Development Teams**: Managing schematics, PCB files, firmware, and test data
- **IoT Product Development**: Organizing hardware, software, and integration files
- **Small Manufacturing**: Tracking product development from concept to production
- **Engineering Consulting**: Managing multiple client projects with full file history
- **R&D Teams**: Documenting research, prototyping, and validation processes
- **Maker Spaces & Startups**: Affordable PLM without enterprise complexity

---

## 🏗️ System Requirements

- **Server**: Any system capable of running Docker (Linux, Windows, macOS)
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: Depends on your file storage needs
- **Network**: Local network access for team collaboration

---

## 🔧 Troubleshooting

### Application Won't Start
- Ensure Docker and Docker Compose are installed and running
- Check that port 80 is not in use by another application
- Run `docker-compose logs` to see error messages

### Cannot Access from Other Devices
- Check firewall settings on the host machine
- Ensure other devices are on the same network
- Try accessing via the host machine's IP address instead of localhost

### Files Not Uploading
- Check available disk space on the host system
- Verify Docker volumes have proper write permissions

### Database Issues
- Database data persists in Docker volume `postgres_data`
- To reset database: `docker-compose down -v` (⚠️ This deletes all data)

---

## 🌟 Why Choose Mini-PLM?

**All-in-One File Management Tool** - Not just file viewing, but complete version control, metadata tracking, and development process organization for multiple file types - all stored locally on your infrastructure.

**Key Benefits:**
- **Your Data, Your Server**: All files stored locally, no cloud dependencies
- **Universal File Management**: Handle STL, PDF, code, CAD, images, and more in one system
- **Automatic Version Control**: Track file revisions with dates and change descriptions
- **Integrated Metadata**: Add quantity, pricing, and other metadata directly to files
- **Development Process Tracking**: Organize stages and iterations with complete file history
- **No External Dependencies**: One tool replaces multiple file viewers and version control systems

---

## 📄 License

[MIT License](LICENSE)

Free to use, modify, and distribute. Contributions welcome!

---

Perfect for teams who need more structure than shared folders but want a simple, powerful, locally-hosted solution for managing their product development lifecycle.