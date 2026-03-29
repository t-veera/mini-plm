# Mini-PLM

**Self-hosted product lifecycle management built on a methodology I developed over 10 years of shipping hardware products. Built for R&D teams, NPD teams, and hardware hobbyists working across firmware, electronics, and mechanical. The ones currently holding everything together with shared drives, spreadsheets, and Slack threads. No subscriptions, no cloud lock-in, and a structure that actually reflects how cross-domain hardware development works. If Mini-PLM disappears tomorrow, your files, your revision history, and your entire iteration structure are still sitting exactly where you put them on your own storage.**

**[Live Demo](https://demo.mini-plm.com)** · **[Documentation](https://github.com/t-veera/mini-plm/wiki)** · **[Substack](https://tveera.substack.com)**

---

## Table of Contents

1. [Installation](#installation)
2. [Why this exists](#why-this-exists)
3. [The Integrated Innovation Lifecycle](#the-integrated-innovation-lifecycle)
4. [Features](#features)
5. [Live Demo](#live-demo)
6. [A note on how this was built](#a-note-on-how-this-was-built)
7. [Tech stack](#tech-stack)
8. [Roadmap](#roadmap)
9. [Self-hosting notes](#self-hosting-notes)
10. [Contributing](#contributing)

---

## Installation

### Prerequisites

[Docker Desktop](https://docs.docker.com/get-docker/) must be installed before running any of the scripts below. That link will take you to the installer for your operating system.

---

### Linux

**Install:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/linux/install.sh | bash
```

**Update:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/linux/update.sh | bash
```

---

### macOS

**Install:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/macos/install.sh | bash
```

**Update:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/macos/update.sh | bash
```

---

### Windows

Open PowerShell and run:

**Install:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/t-veera/mini-plm/main/install/windows/install.ps1" -OutFile "install.ps1"; powershell -ExecutionPolicy Bypass -File install.ps1
```

**Update:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/t-veera/mini-plm/main/install/windows/update.ps1" -OutFile "update.ps1"; powershell -ExecutionPolicy Bypass -File update.ps1
```

---

### Synology NAS

SSH into your NAS and run:

**Install:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/synology-nas/install.sh | bash
```

**Update:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/synology-nas/update.sh | bash
```

> Make sure SSH is enabled on your NAS before running. Go to **DSM > Control Panel > Terminal & SNMP > Terminal** and enable SSH.

---

Each installer will ask for a port number and your server's IP address, then handle the rest. Once it finishes, open the address in your browser and the setup wizard will walk you through creating your admin account.

---

### For developers

```bash
git clone https://github.com/t-veera/mini-plm.git
cd mini-plm
docker compose -f docker-compose-dev.yml up --build
```

The dev compose uses bind mounts and runs Django with `runserver`. Changes reload without rebuilding.

---

## Why this exists

Hardware product development has a tool problem. Not a shortage of tools. The opposite. You've got CAD software for mechanical, KiCad for electronics, VS Code or whatever for firmware, and then a collection of shared drives, spreadsheets, and Slack threads holding it all loosely together.

That works until it doesn't. Until someone asks why a design decision was made three iterations ago and nobody remembers. Until the mechanical engineer doesn't know the firmware team already validated a constraint that would have changed the PCB layout. Until you're trying to run a stage review and the files you need are scattered across four different folder structures that three different people organised differently.

Enterprise PLM tools exist, but they're built for products that are already designed. Teamcenter and Windchill are change control systems optimised for managing released BOMs and supplier documentation. They're not built for the zero-to-production phase, and the overhead of using them during active development is brutal. Most engineering teams avoid putting anything into the system until the design is nearly final, which defeats the purpose.

I spent 10 years shipping hardware products across embedded systems and automation. I kept running into the same problems. I built the **Integrated Innovation Lifecycle (IIL)** methodology to solve them structurally, and then built Mini-PLM to implement that methodology. This is the tool I wanted and couldn't find.

**Mini-PLM is for the zero-to-production phase.** R&D teams, NPD groups, and hardware hobbyists working across firmware, electronics, and mechanical in parallel. People who don't have time to manage a formal enterprise system, and where the decisions made in the first few iterations shape everything that follows.

There is one more thing that none of the SaaS alternatives can offer. Because Mini-PLM runs on your own server, your files live on your storage. Your revision history lives on your storage. Your entire iteration structure lives on your storage. If Mini-PLM shuts down tomorrow, if the company behind it pivots, if you just decide to stop using it, nothing is lost. You open the folder and everything is still there. That is not something you can say about any cloud PLM tool.

---

## The Integrated Innovation Lifecycle

Before getting into the tool, it helps to understand the methodology it implements. The structure of Mini-PLM maps directly to IIL.

IIL combines agile iteration with structured stage gates. Iterations (I1, I2, I3...) are numbered **continuously** across the entire product lifecycle. Every few iterations, you hit a Stage Gate (S1, S2, S3). A stage gate is a formal decision point where you review what was built, assess whether the product is ready to advance, and make a go/no-go call. After S3 clears, you cut a production release.

```
I1  →  I2  →  I3  →  ⛩ S1
                           ↓
               I4  →  I5  →  ⛩ S2
                                  ↓
                      I6  →  I7  →  ⛩ S3
                                         ↓
                                    🏭 Pv1
```

Iterations are cheap. Stage gates are consequential. The methodology is designed so that teams can move fast inside iterations and make deliberate decisions at gates. Rather than iterating indefinitely with no checkpoints, or running a rigid waterfall process that collapses when hardware reality doesn't match the plan.

The methodology is covered in depth on the [wiki](https://github.com/t-veera/mini-plm/wiki) and on [Substack](https://tveera.substack.com).

---

## Features

**Universal file preview**

Preview engineering files directly in the browser. No downloads, no switching tools. Supports `.stl`, `.step`, `.dxf`, `.pdf`, `.xlsx`, `.csv`, `.md`, `.py`, `.cpp`, `.ino`, `.js`, `.png`, `.jpg`, and more. KiCad `.kicad_pcb` and `.kicad_sch` preview is in development.

**Automatic revision control**

Every file upload creates a new revision automatically. Revisions are timestamped and selectable from the preview panel. No manual naming conventions, no `_v2_FINAL_final.step`.

**IIL-structured project organisation**

Products are organised by iterations (I1, I2, I3...) and stage gates (S1, S2, S3). Files live under the iteration they were created in, so when you're looking at a `.kicad_pcb` uploaded in I4, you know exactly where it sits in the development timeline and what decisions were active at that point.

**BOM and cost tracking**

Attach cost data to files and track it at the BOM level. DXF files link to child files (for example, a laser-cut part linked to its material specification). Spreadsheets render inline alongside the associated hardware files.

**Cross-domain file organisation**

Firmware (`.ino`, `.py`, `.cpp`), electronics (`.kicad_pcb`, `.kicad_sch`), mechanical (`.step`, `.stl`, `.dxf`), and documentation (`.pdf`, `.md`) in the same place, under the same iteration structure, without forcing any domain into a workflow designed for another.

---

## Live Demo

The demo is seeded with a complete e-reader product running through I1 to I7, S1 to S3. You can browse the full iteration structure, preview files, and explore the BOM view without setting anything up.

**[Try the demo at demo.mini-plm.com](https://demo.mini-plm.com)**

The demo resets hourly. Nothing you do in there persists.

---

## A note on how this was built

The system architecture is designed by me: the IIL methodology, the iteration and stage gate structure, the file organisation model, and the BOM logic all come from 10 years of hands-on hardware product development. The implementation was vibe coded. I used AI tooling heavily to write the actual code. If you're looking at the frontend and wondering why `App.js` is 8000 lines, that's why. The structure is intentional. The code is a work in progress.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Django (Python) |
| Frontend | React, Bootstrap |
| Database | PostgreSQL |
| Reverse proxy | Nginx |
| Container runtime | Docker, Docker Compose |
| CI/CD | GitHub Actions to GHCR |
| Image registry | `ghcr.io/t-veera/mini-plm` |
| 3D preview | Three.js |
| Markdown rendering | ReactMarkdown |

Images are built for **amd64**. ARM support (Oracle Cloud Always Free, Apple Silicon) requires a separate build and is on the roadmap.

---

## Roadmap

**In progress:**

- [ ] **KiCad preview:** server-side `kicad-cli` conversion to PDF via a sidecar microservice container. Engineers upload `.kicad_pcb` as the source file and a STEP export as a child file for 3D preview. Conversion happens automatically on upload.
- [ ] **File grouping and sorting:** organise files within an iteration into folders, with sort controls by name, type, date, and status.
- [ ] **Frontend refactor:** `App.js` is a monolith at around 8000 lines. Breaking it into components once auth and demo work stabilises.

**Next:**

- [ ] **BOM view improvements:** richer cost rollup, better component linking, editable fields inline
- [ ] **KPI view:** iteration-level metrics tracked across the lifecycle. Time per iteration, cost delta, defects per stage, readiness scores at gate reviews.
- [ ] **ARM image builds:** for Oracle Cloud Always Free and Apple Silicon dev machines

**Done:**

- [x] Automatic revision control
- [x] BOM view with DXF and child file linking
- [x] Markdown preview with revision switching
- [x] 3D preview for STL, STEP, DXF
- [x] Demo environment with seeded e-reader project running I1 through S3

---

## Self-hosting notes

**Synology NAS:** Use named Docker volumes rather than bind mounts to Synology-managed folders to avoid permission issues.

**Render free tier:** The demo runs on Render's free tier, kept warm by UptimeRobot pings every 5 minutes. Render's free PostgreSQL has a 90-day expiry. Set a calendar reminder to recreate the database before it drops.

**Oracle Cloud Always Free:** The strongest free option for a persistent always-on deployment, but it requires ARM image builds which are not currently supported out of the box.

---

## Contributing

This is early stage. If you're running a hardware team or NPD group and something doesn't work the way you need it to, open an issue. I'm more interested in understanding real workflow problems than in collecting feature requests.

Pull requests are welcome. For larger changes, open an issue first so we can align on the approach.

---

**Methodology and process writing:** [tveera.substack.com](https://tveera.substack.com) · **Landing page:** [mini-plm.com](https://mini-plm.com) · **Personal site:** [twishaveera.com](https://twishaveera.com) · **Docs:** [wiki](https://github.com/t-veera/mini-plm/wiki)