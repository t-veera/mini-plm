<div align="center">

# Mini-PLM

**Self-hosted product lifecycle management for hardware teams.**

Built on a methodology developed over 10 years of shipping hardware products, for R&D teams,
NPD teams and hardware hobbyists working across firmware, electronics and mechanical: the ones
currently holding it together with shared drives, spreadsheets and Slack threads.
No subscriptions, no cloud lock-in, and a structure that reflects how cross-domain
hardware development actually works.

**The methodology, architecture and system design are mine. The code is written with [Claude Code](https://claude.com/claude-code).**

[![Build](https://img.shields.io/github/actions/workflow/status/t-veera/mini-plm/docker-publish.yml?branch=main&label=build&logo=github)](https://github.com/t-veera/mini-plm/actions/workflows/docker-publish.yml)
[![License](https://img.shields.io/github/license/t-veera/mini-plm?color=blue)](LICENSE)
[![Container](https://img.shields.io/badge/ghcr.io-mini--plm-2496ED?logo=docker&logoColor=white)](https://github.com/t-veera/mini-plm/pkgs/container/mini-plm)
[![Stars](https://img.shields.io/github/stars/t-veera/mini-plm?color=f5c518)](https://github.com/t-veera/mini-plm/stargazers)

**[Live Demo](https://demo.mini-plm.com)** · **[Documentation](https://github.com/t-veera/mini-plm/wiki)** · **[Methodology](https://tveera.substack.com)**

</div>

---

> ### Your data outlives the tool
>
> Your files, their revision history, and the exact folder structure you built all live on your
> own disk, as ordinary folders with the names you gave them. If Mini-PLM disappeared tomorrow,
> if this project stopped, or if you simply decided it wasn't for you, you would open the folder
> and find everything precisely where you filed it. No export to run first. No proprietary format
> to unpick. Nothing to negotiate with anyone. The tool is disposable on purpose; your work was
> never inside it.

---

## Contents

**Getting started** · [Installation](#installation) · [Opening it for the first time](#opening-it-for-the-first-time) · [Taskbar icon](#give-it-a-taskbar-icon) · [After a reboot](#after-a-reboot) · [Day to day](#day-to-day) · [Uninstalling](#uninstalling) · [Live Demo](#live-demo)

**Understanding it** · [Why this exists](#why-this-exists) · [The Integrated Innovation Lifecycle](#the-integrated-innovation-lifecycle) · [Features](#features)

**Under the hood** · [Tech stack](#tech-stack) · [How this was built](#how-this-was-built) · [Roadmap](#roadmap) · [Contributing](#contributing)

---

## Features

| | Feature | What you get |
|:--:|---|---|
| 🔒 | **Your files stay yours** | Every upload is written to a real folder on your own server, in the structure you built. Uninstalling Mini-PLM does not touch a single one of them. |
| ⛩ | **IIL project structure** | Iterations (I1, I2, I3) and stage gates (S1, S2, S3), numbered continuously. Every file sits in the iteration it was created in. |
| 👁 | **Universal file preview** | STL, STEP, DXF, KiCad boards and schematics, PDF, spreadsheets, markdown, code, images. In the browser, no downloads. |
| 🔄 | **Automatic revisions** | Upload the same filename again and it becomes v2. No more `_v2_FINAL_final.step`. |
| 🖱 | **Drag and drop** | Drop a whole folder from Explorer or Finder. Structure is recreated; a re-drop versions only what changed. |
| 💰 | **Dynamic Iterative BOM** | Cost for the iteration you are standing in, not one BOM for the whole product. |
| 🔗 | **Traceability matrix** | PRD → ARCH → RISK → SRS → VERIF → VAL, built from markdown you already write. |
| 🪟 | **One workspace** | Files, BOM and Traceability share a toolbar and panel. Expand any of them to full width. |
| 🌗 | **Light and dark themes** | One token set, instant switch, remembered. WCAG AA contrast in light mode. |
| 📁 | **Folders that behave** | Create, nest, rename, move, download as zip. Copy or move whole subtrees between iterations. |
| 🧩 | **Cross-domain by default** | Firmware, electronics, mechanical and documentation in one structure, none of them second-class. |

### A closer look at the two big ones

**💰 Dynamic Iterative BOM**

Costs are scoped to one iteration, so you can see what a design round actually cost.

* Hardware files carry their own quantity and price.
* Spreadsheets are read as they come. The parser hunts for the header row, so a real export with a title block above the table just works.
* Every line lands in Electronics, Mechanical or Misc, using the sheet's own Category column when it has one.
* Filter by category with per-table subtotals, a running count of items missing a price, and CSV export.

**🔗 Traceability matrix**

Requirements traced to tests, built by reading the markdown you already write. No new syntax, nothing to configure.

* Document type comes from the filename: `PRD.md`, `Architecture.md`, `FMEA.md`, `001_Test_Protocol.md`.
* Items are indexed from IDs at the head of a line or in the first column of a table.
* Files matching no known type are skipped, which is how README and meeting notes stay out.
* Hover a card to trace its links. Click to pin them, then scroll to wherever they land.
* **Link to…** draws a link the parser missed. Search, then click or press Enter. Hand-drawn links render dashed.
* A container shows only what was uploaded into it. An empty column is more honest than a superseded requirement shown as current.

Full rules in [AUTHORING.md](files/traceability/AUTHORING.md).

---

## Installation

### Prerequisites

| | Requirement |
|---|---|
| **Docker** | [Docker Desktop](https://docs.docker.com/get-docker/) on macOS and Windows. On a Linux server, Docker Engine with the Compose plugin is enough. Desktop is not required. |
| **Python 3** | Used by the installer to unpack the release and generate your `SECRET_KEY`. Preinstalled on macOS, most Linux distributions, and Synology DSM. On Windows, install it from [python.org](https://www.python.org/downloads/) and tick **Add python.exe to PATH**. |
| **curl** | Linux, macOS and Synology only. Preinstalled nearly everywhere. |

> **Windows note:** run `python --version` first. If it opens the Microsoft Store instead of printing a version, an App Execution Alias is shadowing a real install. Turn it off under *Settings → Apps → Advanced app settings → App execution aliases*, or the installer cannot generate a secret key.

Everything else (PostgreSQL, Nginx, and the app itself) runs in containers pulled from
[GHCR](https://github.com/t-veera/mini-plm/pkgs/container/mini-plm). Nothing is installed
system-wide, and no account or token is needed: the images are public.

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
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/mac/install.sh | bash
```

**Update:**
```bash
curl -sSL https://raw.githubusercontent.com/t-veera/mini-plm/main/install/mac/update.sh | bash
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

Each installer asks three things, then generates a fresh `SECRET_KEY`, pulls the images and starts everything:

1. **Where to keep your files.** Press Enter for the default in the table below, or type any path you like.
2. **A port**, default `8080`.
3. **The IP address** people will reach the server on, or `localhost` for this machine only.

**Choosing a location.** This directory holds every file you upload, so put it where you have room
and where your backups already run. It does not have to be on your system drive:

```
D:\mini-plm                     Windows, second drive
/mnt/storage/mini-plm           Linux, a mounted data disk
/Volumes/Work/mini-plm          macOS, an external drive
/volume2/docker/mini-plm        Synology, whichever volume has the space
```

The installer remembers where you put it, so the update script finds it later without asking. Paths
with spaces are fine, and `~` works.

**Defaults if you just press Enter:**

| Platform | Install directory | Your files |
|---|---|---|
| Linux / macOS | `~/mini-plm` | `~/mini-plm/mpp_files` |
| Windows | `%USERPROFILE%\mini-plm` | `%USERPROFILE%\mini-plm\mpp_files` |
| Synology NAS | `/volume1/docker/mini-plm` | `/volume1/docker/mini-plm/mpp_files` |

`mpp_files` is the directory to back up. It holds every uploaded file in the folder structure you
created, and it is readable with or without Mini-PLM running. The database (revision metadata,
users, BOM figures) lives in a Docker named volume. See [Self-hosting notes](#self-hosting-notes)
for how to dump it.

> **On an external drive:** mount it before Docker starts, or the containers come up with an empty
> folder. On Windows and macOS, also add the location under *Docker Desktop → Settings → Resources →
> File sharing* if Docker says the path cannot be shared.

---

### Opening it for the first time

**There is no application to launch and no icon to click.** Mini-PLM is a web app that runs in the
background as Docker containers. You use it through a browser.

1. **Open your browser** at the address the installer printed when it finished. With the defaults
   that is <http://localhost:8080>. If you gave it a server IP, use `http://YOUR-SERVER-IP:8080`
   instead, and anyone on the same network can open that same address.
2. **Create the admin account.** On the very first visit you get a setup wizard instead of a login
   screen. Fill it in and that becomes your administrator account.
3. **Log in.** From then on the same address shows the normal login screen.

If the page doesn't load, Docker is usually still starting. Give it thirty seconds and refresh.

### Give it a taskbar icon

Since Mini-PLM lives at a URL, your browser can turn it into something that looks and launches like
a normal desktop app, with the Mini-PLM icon and its own window rather than a tab.

| Browser | How |
|---|---|
| **Chrome** | Open Mini-PLM, then ⋮ menu → **Cast, save and share** → **Install page as app**. On older versions: ⋮ → **More tools** → **Create shortcut**, and tick **Open as window**. |
| **Edge** | Open Mini-PLM, then ⋯ menu → **Apps** → **Install this site as an app**. |
| **Safari** | Open Mini-PLM, then **File** → **Add to Dock**. |
| **Firefox** | No app install, so bookmark it, or right-click the tab and choose **Pin Tab**. |

Chrome and Edge then offer to pin it to the taskbar, and it appears in the Start menu or Launchpad
like any other program. Right-click the taskbar icon and choose **Pin to taskbar** if it doesn't
offer. The icon comes from the app itself, so you get the torii mark rather than a generic globe.

This only creates a shortcut. Mini-PLM is already running in the background either way, and the
shortcut does not start or stop it.

### After a reboot

**You do not install or run anything again.** All four containers use `restart: unless-stopped`, so
Docker brings them back by itself when your machine comes up. Open the same address and carry on.

The one thing it depends on is Docker itself starting. On Windows and macOS that means Docker
Desktop must be set to launch at login, which is its default: check *Settings → General → Start
Docker Desktop when you sign in*. On Linux, `sudo systemctl enable docker` does the same. Nothing
runs while Docker is closed.

If the page doesn't load after a restart, Docker is usually still coming up. Wait, refresh, and if
it still fails run `docker compose -f docker-compose-prod.yml ps` in your install directory to see
what state the containers are in.

### Day to day

To control it by hand, open a terminal in your install directory (see the table above) and use:

```bash
docker compose -f docker-compose-prod.yml ps       # is it running?
docker compose -f docker-compose-prod.yml stop     # stop it
docker compose -f docker-compose-prod.yml start    # start it again
docker compose -f docker-compose-prod.yml restart  # restart it
docker compose -f docker-compose-prod.yml logs -f  # watch the logs
```

You can also see and control the containers from the Docker Desktop dashboard, grouped under
`mini-plm`.

### Changing settings

Everything configurable lives in one file: **`docker-compose-prod.yml`, in the directory you chose
during install.** Ports, the address the app trusts, the database password, HTTPS cookies. It is
plain text, so any editor opens it.

Forgotten where you installed? The installer wrote it down:

```bash
cat ~/.config/mini-plm/location                      # Linux, macOS, Synology
```
```powershell
Get-Content "$env:APPDATA\mini-plm\location.txt"     # Windows
```

Backend settings sit under `backend:` → `environment:` as a list of `- NAME=value` lines. Keep the
indentation identical to its neighbours, since YAML is whitespace-sensitive.

After editing, run this from the same directory:

```bash
docker compose -f docker-compose-prod.yml up -d
```

Use `up -d`, **not `restart`**. Environment variables are read when a container is created, so a
restart re-runs the old values and appears to do nothing. `up -d` notices the file changed and
recreates the container, leaving your data alone.

The most common edit is `CSRF_TRUSTED_ORIGINS`, which has to list the exact address in your
browser's bar, scheme and port included, or login returns a 403. Full details, including custom
domains and HTTPS, are on the [Configuration wiki page](https://github.com/t-veera/mini-plm/wiki/Configuration).

### Uninstalling

Run these from your install directory. **Your uploaded files are never touched by any of them**,
because `mpp_files` is a plain folder on your disk rather than something Docker owns.

**1. Stop and remove the containers.** This keeps your database.

```bash
docker compose -f docker-compose-prod.yml down
```

**2. Remove the images**, if you want the disk space back.

```bash
docker rmi ghcr.io/t-veera/mini-plm:main-backend ghcr.io/t-veera/mini-plm:main-frontend
docker rmi nginx:alpine postgres:13-alpine
```

**3. Delete the database.** Only do this if you are sure. It permanently removes revision history,
users, quantities and prices.

```bash
docker compose -f docker-compose-prod.yml down -v
```

**4. Delete the install directory** once you have copied `mpp_files` somewhere safe.

> **Copy `mpp_files` out before you delete the folder.** It holds every file you ever uploaded, in
> the folder structure you built, and it opens in any file manager without Mini-PLM. Step 4 is the
> only step in this list that can lose your work.

---

### For developers

```bash
git clone https://github.com/t-veera/mini-plm.git
cd mini-plm
docker compose up --build
```

`docker-compose.yml` and `docker-compose.override.yml` are merged automatically, so there is no
`-f` flag. This builds the images locally instead of pulling them, bind-mounts the source, and puts
Nginx in front so the app is on <http://localhost>.

The React frontend hot-reloads on save. The Django backend runs under gunicorn, so Python changes
need `docker compose restart backend` to take effect.

---

## Why this exists

Hardware product development has a tool problem. Not a shortage of tools. The opposite. You've got CAD software for mechanical, KiCad for electronics, VS Code or whatever for firmware, and then a collection of shared drives, spreadsheets, and Slack threads holding it all loosely together.

That works until it doesn't. Until someone asks why a design decision was made three iterations ago and nobody remembers. Until the mechanical engineer doesn't know the firmware team already validated a constraint that would have changed the PCB layout. Until you're trying to run a stage review and the files you need are scattered across four different folder structures that three different people organised differently.

Enterprise PLM tools exist, but they're built for products that are already designed. Teamcenter and Windchill are change control systems optimised for managing released BOMs and supplier documentation. They're not built for the zero-to-production phase, and the overhead of using them during active development is brutal. Most engineering teams avoid putting anything into the system until the design is nearly final, which defeats the purpose.

I spent 10 years shipping hardware products across embedded systems and automation. I kept running into the same problems. I built the **Integrated Innovation Lifecycle (IIL)** methodology to solve them structurally, and then built Mini-PLM to implement that methodology. This is the tool I wanted and couldn't find.

**Mini-PLM is for the zero-to-production phase.** R&D teams, NPD groups, and hardware hobbyists working across firmware, electronics, and mechanical in parallel. People who don't have time to manage a formal enterprise system, and where the decisions made in the first few iterations shape everything that follows.

There is one more thing no SaaS alternative can offer. Mini-PLM runs on your own server, so your files, their revision history, and the structure you filed them into all live on your storage, as ordinary folders on an ordinary disk, named the way you named them.

That matters most on the day you stop caring about Mini-PLM. If this project shuts down tomorrow, if I lose interest, if you simply decide it isn't for you, none of it touches your work. You open the folder and everything is exactly where you put it, nested exactly as you arranged it, readable by any tool that can open a file. There is no export to run before you leave, no proprietary format to unpick, and nothing to negotiate with anyone. The tool is disposable on purpose; your data was never inside it. That is not something you can say about a cloud PLM.

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

## Live Demo

The demo is seeded with a complete e-reader product running through I1 to I7, S1 to S3. You can browse the full iteration structure, preview files, and explore the BOM view without setting anything up.

**[Try the demo at demo.mini-plm.com](https://demo.mini-plm.com)**

The demo resets hourly. Nothing you do in there persists.

---

## How this was built

The system architecture is mine. The IIL methodology, the iteration and stage gate structure, the file organisation model, and the BOM logic all come from 10 years of hands-on hardware product development.

The code is written with Claude Code. `App.js` was once 8000 lines; it is now around 1300, with the rest split across 34 components, a shared token system for theming, and a shared shell the dashboards sit in. The structure is intentional. The code is a work in progress.

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

The next five milestones, in build order.

**1. Fix Dashboard 3: Traceability Matrix**

- [ ] **Doc-type detection coverage:** filename keyword matching misses real-world document names, which then land as unmatched and never reach the matrix. Broaden the keyword set, make deliberate exclusions explicit, and surface unmatched files in the UI instead of only in the server log.
- [ ] **Edge connections and link parsing:** documents that index correctly but produce no connections between them. Improve reference detection across markdown and spreadsheets. Manual linking is the fallback and is now quick (search, then click or press Enter), so this is about the parser inferring more of them unaided.

**2. Complete Dashboard 4: Release Gate Control**

- [ ] **KPI view:** iteration-level metrics tracked across the lifecycle. Time per iteration, cost delta, defects per stage, readiness scores at gate reviews.

**3. Update Dashboard 2: BOM**

- [ ] **Editable BOM columns:** edit quantity and price inline in the BOM table, and show/hide columns. Quantity and price are currently set from the file list's right-click menu.
- [ ] **Row-level BOM overrides:** re-bin an individual spreadsheet row without changing the whole sheet. Rows currently follow the sheet's Category column, and the file-level category is editable from the BOM table.
- [ ] **Stage roll-up in the BOM:** a stage gate totalling the iterations that feed into it. The BOM is iteration-scoped today.

**4. KiCad and Fusion 360 plugins**

- [ ] **KiCad plugin (Python):** auth dialog, product and iteration picker, upload to `/api/files/`, packaged as a PCM add-on for distribution through KiCad's plugin manager.
- [ ] **Fusion 360 add-in:** auth dialog, product and iteration picker, `.f3d` and `.step` export, upload to `/api/files/`.

**5. Claude MCP server**

- [ ] **MCP server for mini-plm:** query traceability and gate status from Claude. Not started, in the backlog, design not yet scoped.

**Later / unscheduled:**

Wanted, but not blocking the sequence above.

- [ ] **File sorting:** sort controls by name, type, date, and status within folders and iterations. Folder organisation itself is already done.
- [ ] **Theme-aware 3D and CAD viewers:** the KiCad and Three.js canvases keep their own palettes and don't follow light/dark yet.
- [ ] **ARM image builds:** for Oracle Cloud Always Free and Apple Silicon dev machines.
- [ ] **Search and filtering:** search across files; filter by status, file type, or date range within a product.
- [ ] **Export and reporting:** generate PDF reports from stage gate reviews, and export BOM data to CSV/Excel.
- [ ] **Role-based access control:** finer-grained permissions beyond admin/non-admin. Read-only for stakeholders, edit access for engineers.

**Done:**

- [x] **Full-width toggle:** collapse the left panel from the top right of the Files, BOM or Traceability view so wide tables and the matrix get the whole window, and restore it in the same place.
- [x] **Manual traceability links by search:** find any item by ID or title and link it by click, or by ↑ ↓ and Enter without leaving the keyboard. Hand-drawn links stay dashed so they read differently from parsed ones.
- [x] **Readable matrix connectors:** connectors persist when a card is clicked so a link can be followed by scrolling, two documents naming each other draw one line rather than two, and links pointing back across the columns no longer loop over the canvas.
- [x] **Dynamic Iterative BOM:** iteration-scoped cost dashboard with Electronics/Mechanical/Misc bins, spreadsheet extraction that locates the header row inside real BOM exports, row-level categories read from the sheet, missing-price tally, per-table subtotals, iteration total, and CSV export.
- [x] **Traceability matrix:** PRD → architecture → risk → spec → verification → validation, indexed from the markdown you already write, scoped to the iteration or stage you're viewing.
- [x] **Light and dark themes:** switchable from the user menu, driven by one CSS-variable token set, persisted, defaulting to the OS preference, with WCAG AA contrast in light mode.
- [x] **Unified dashboard shell:** one shared toolbar and one resizable left panel across the Files, BOM and Traceability views, at a width that stays put when you switch between them.
- [x] **Copy and move across iterations and stages:** right-click a file or folder and copy or move it into another iteration or stage, including full folder subtrees.
- [x] **Drag-and-drop upload from your computer:** drop files, multiple files, or an entire folder (e.g. a cloned firmware repo) straight from the OS file manager onto an iteration, stage, or folder. Nested folder structure is recreated automatically, and re-dropping the same folder versions the changed files instead of duplicating them.
- [x] **Interactive image preview:** zoom (buttons or Ctrl/pinch), rotate, fit-to-view, actual-size, and drag-to-pan. Image zoom stays inside the preview instead of zooming the whole page.
- [x] **Folder improvements:** delete a non-empty folder (with confirmation) in one action, file counts that roll up from subfolders, and folders that stay expanded when you leave an iteration and come back.
- [x] **Nameable stages and iterations:** name a stage or iteration when you create it (or leave it blank for the auto `S#`/`I#` id), rename it later from a right-click menu, and hover to see its name.
- [x] **KiCad schematic (`.kicad_sch`) preview:** rendered in-browser from the file's embedded symbol graphics, with no server-side conversion. Pan, zoom, and fit, plus a graceful fallback for legacy `.sch` files.
- [x] **KiCad PCB (`.kicad_pcb`) preview:** in-browser top-down board render covering outline, copper zones and tracks, pads with drills, vias, and silkscreen, in the same pan/zoom canvas. No server-side conversion.
- [x] **File organisation into folders:** create, rename, move, and nest folders, drag-and-drop files and folders, and folder downloads.
- [x] **Frontend refactor:** `App.js` split from around 8000 lines into components (FileList, BOMViewer, KPI, file viewers, modals).
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
