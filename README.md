<div align="center">

# Mini-PLM

**Self-hosted product lifecycle management for hardware teams.**

Built on a methodology developed over 10 years of shipping hardware products, for R&D teams,
NPD teams and hardware hobbyists working across firmware, electronics and mechanical — the ones
currently holding it together with shared drives, spreadsheets and Slack threads.
No subscriptions, no cloud lock-in, and a structure that reflects how cross-domain
hardware development actually works.

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
> own disk, as ordinary folders with the names you gave them. If Mini-PLM disappeared tomorrow —
> if this project stopped, or you simply decided it wasn't for you — you would open the folder and
> find everything precisely where you filed it. No export to run first, no proprietary format to
> unpick, nothing to negotiate with anyone. The tool is disposable on purpose; your work was never
> inside it.

---

## Contents

**Getting started** — [Installation](#installation) · [Live Demo](#live-demo) · [Self-hosting notes](#self-hosting-notes)

**Understanding it** — [Why this exists](#why-this-exists) · [The Integrated Innovation Lifecycle](#the-integrated-innovation-lifecycle) · [Features](#features)

**Under the hood** — [Tech stack](#tech-stack) · [How this was built](#a-note-on-how-this-was-built) · [Roadmap](#roadmap) · [Contributing](#contributing)

---

## Installation

### Prerequisites

| | Requirement |
|---|---|
| **Docker** | [Docker Desktop](https://docs.docker.com/get-docker/) on macOS and Windows. On a Linux server, Docker Engine with the Compose plugin is enough — Desktop is not required. |
| **Python 3** | Used by the installer to unpack the release and generate your `SECRET_KEY`. Preinstalled on macOS, most Linux distributions, and Synology DSM. On Windows, install it from [python.org](https://www.python.org/downloads/) and tick **Add python.exe to PATH**. |
| **curl** | Linux, macOS and Synology only. Preinstalled nearly everywhere. |

> **Windows note:** run `python --version` first. If it opens the Microsoft Store instead of printing a version, the App Execution Alias is shadowing a real install — turn it off under *Settings → Apps → Advanced app settings → App execution aliases*, or the installer cannot generate a secret key.

Everything else — PostgreSQL, Nginx, and the app itself — runs in containers pulled from
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

Each installer asks for a port (default `8080`) and the IP address people will reach the server on, generates a fresh `SECRET_KEY`, pulls the images and starts everything. When it finishes, open that address and the setup wizard walks you through creating the admin account.

**Where it lands:**

| Platform | Install directory | Your files |
|---|---|---|
| Linux / macOS | `~/mini-plm` | `~/mini-plm/mpp_files` |
| Windows | `%USERPROFILE%\mini-plm` | `%USERPROFILE%\mini-plm\mpp_files` |
| Synology NAS | `/volume1/docker/mini-plm` | `/volume1/docker/mini-plm/mpp_files` |

`mpp_files` is the directory to back up. It holds every uploaded file in the folder structure you
created, and it is readable with or without Mini-PLM running. The database (revision metadata,
users, BOM figures) lives in a Docker named volume — see [Self-hosting notes](#self-hosting-notes)
for how to dump it.

---

### For developers

```bash
git clone https://github.com/t-veera/mini-plm.git
cd mini-plm
docker compose up --build
```

`docker-compose.yml` and `docker-compose.override.yml` are merged automatically — no `-f` flag
needed. This builds the images locally instead of pulling them, bind-mounts the source, and puts
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

There is one more thing no SaaS alternative can offer. Mini-PLM runs on your own server, so your files, their revision history, and the structure you filed them into all live on your storage — as ordinary folders on an ordinary disk, named the way you named them.

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

## Features

**Universal file preview**

Preview engineering files directly in the browser. No downloads, no switching tools. Supports `.stl`, `.step`, `.dxf`, `.pdf`, `.xlsx`, `.csv`, `.md`, `.py`, `.cpp`, `.ino`, `.js`, `.png`, `.jpg`, KiCad schematics and boards (`.kicad_sch`, `.kicad_pcb`), and more.

**Automatic revision control**

Every file upload creates a new revision automatically. Revisions are timestamped and selectable from the preview panel. No manual naming conventions, no `_v2_FINAL_final.step`.

**Drag-and-drop from your file manager**

Drop a single file, a selection of files, or an entire folder — like a cloned firmware repo — straight from Windows Explorer or Finder onto an iteration, stage, or folder. The folder structure is recreated as you had it, and re-dropping the same folder later versions the files that changed instead of making duplicates.

**IIL-structured project organisation**

Products are organised by iterations (I1, I2, I3...) and stage gates (S1, S2, S3). Files live under the iteration they were created in, so when you're looking at a `.kicad_pcb` uploaded in I4, you know exactly where it sits in the development timeline and what decisions were active at that point.

**Dynamic Iterative BOM**

A cost view scoped to the iteration you're standing in, so you can see what a given iteration actually costs rather than one BOM for the whole product. Hardware files carry their own quantity and price; BOM spreadsheets are read directly — the parser finds the header row wherever it sits, so a real export with a title block, document number and project metadata above the table works untouched. Every line is binned into Electronics, Mechanical or Misc, using the sheet's own Category column when it has one, so fasteners and sheet metal land under Mechanical even when the rest of the sheet is electronics. Filter to one category or view them combined, with per-table subtotals, a running count of items still missing a price, an iteration total that ignores the filter, and CSV export.

**Traceability matrix**

Requirements traced from PRD through architecture, risk, specification, verification and validation — built by reading the markdown you already write. Document type comes from the filename (`PRD.md`, `Architecture.md`, `FMEA.md`, `001_Requirements.md`, `001_Test_Protocol.md`), and items are indexed from IDs written at the head of a line or in the first column of a table. Nothing to configure and no new syntax; a file matching none of the known types is skipped, which is how README and meeting notes stay out of the matrix. A container shows only what was uploaded into it — there is deliberately no inheritance from earlier containers, because an iteration's scope diverges from the one before it and showing superseded requirements as current is a worse failure than an empty column. See [AUTHORING.md](files/traceability/AUTHORING.md) for the rules the parser follows.

Hover a card to trace its connectors, or click to pin them so you can scroll to where a link lands without the lines disappearing under the pointer. Clicking opens an inspector with the item's lineage, source excerpt and full document; Escape or a click on empty canvas closes it. Where the parser genuinely can't infer a link, **Link to…** finds any other item by ID or title — click a result or drive the list with ↑ ↓ and Enter — and hand-drawn links render dashed so they stay distinguishable from the ones your documents declare.

**One workspace, three dashboards**

Files, BOM and Traceability share a toolbar and a resizable left panel that stays the width you left it when you switch between them. When the panel is in the way — a wide BOM table, a matrix running off the edge — the expand control in the top right of any of the three hands the whole window to the content, and gives the panel back when you're done.

**Light and dark themes**

Switch from the user menu. The whole UI is driven by one set of design tokens exposed as CSS variables, so the change is instant and consistent across every view, and the choice persists. First-time users get whatever their OS prefers. Light-theme colours are contrast-checked against WCAG AA.

**Cross-domain file organisation**

Firmware (`.ino`, `.py`, `.cpp`), electronics (`.kicad_pcb`, `.kicad_sch`), mechanical (`.step`, `.stl`, `.dxf`), and documentation (`.pdf`, `.md`) in the same place, under the same iteration structure, without forcing any domain into a workflow designed for another.

---

## Live Demo

The demo is seeded with a complete e-reader product running through I1 to I7, S1 to S3. You can browse the full iteration structure, preview files, and explore the BOM view without setting anything up.

**[Try the demo at demo.mini-plm.com](https://demo.mini-plm.com)**

The demo resets hourly. Nothing you do in there persists.

---

## A note on how this was built

The system architecture is designed by me: the IIL methodology, the iteration and stage gate structure, the file organisation model, and the BOM logic all come from 10 years of hands-on hardware product development. The implementation was vibe coded. I used AI tooling heavily to write the actual code. `App.js` was once 8000 lines; it is now ~1300, with the rest split across 34 components, a shared token system for theming, and a shared shell the dashboards sit in. The structure is intentional. The code is a work in progress.

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

**1. Fix Dashboard 3 — Traceability Matrix**

- [ ] **Doc-type detection coverage:** filename keyword matching misses real-world document names, which then land as unmatched and never reach the matrix. Broaden the keyword set, make deliberate exclusions explicit, and surface unmatched files in the UI instead of only in the server log.
- [ ] **Edge connections and link parsing:** documents that index correctly but produce no connections between them. Improve reference detection across markdown and spreadsheets. Manual linking is the fallback and is now quick — search, then click or press Enter — so this is about the parser inferring more of them unaided.

**2. Complete Dashboard 4 — Release Gate Control**

- [ ] **KPI view:** iteration-level metrics tracked across the lifecycle. Time per iteration, cost delta, defects per stage, readiness scores at gate reviews.

**3. Update Dashboard 2 — BOM**

- [ ] **Editable BOM columns:** edit quantity and price inline in the BOM table, and show/hide columns. Quantity and price are currently set from the file list's right-click menu.
- [ ] **Row-level BOM overrides:** re-bin an individual spreadsheet row without changing the whole sheet. Rows currently follow the sheet's Category column, and the file-level category is editable from the BOM table.
- [ ] **Stage roll-up in the BOM:** a stage gate totalling the iterations that feed into it. The BOM is iteration-scoped today.

**4. KiCad and Fusion 360 plugins**

- [ ] **KiCad plugin (Python):** auth dialog, product and iteration picker, upload to `/api/files/`, packaged as a PCM add-on for distribution through KiCad's plugin manager.
- [ ] **Fusion 360 add-in:** auth dialog, product and iteration picker, `.f3d` and `.step` export, upload to `/api/files/`.

**5. Claude MCP server**

- [ ] **MCP server for mini-plm:** query traceability and gate status from Claude. Not started — in the backlog, design not yet scoped.

**Later / unscheduled:**

Wanted, but not blocking the sequence above.

- [ ] **File sorting:** sort controls by name, type, date, and status within folders and iterations. Folder organisation itself is already done.
- [ ] **Theme-aware 3D and CAD viewers:** the KiCad and Three.js canvases keep their own palettes and don't follow light/dark yet.
- [ ] **ARM image builds:** for Oracle Cloud Always Free and Apple Silicon dev machines
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
- [x] **Interactive image preview:** zoom (buttons or Ctrl/pinch), rotate, fit-to-view, actual-size, and drag-to-pan — image zoom stays inside the preview instead of zooming the whole page.
- [x] **Folder improvements:** delete a non-empty folder (with confirmation) in one action, file counts that roll up from subfolders, and folders that stay expanded when you leave an iteration and come back.
- [x] **Nameable stages and iterations:** name a stage or iteration when you create it (or leave it blank for the auto `S#`/`I#` id), rename it later from a right-click menu, and hover to see its name.
- [x] **KiCad schematic (`.kicad_sch`) preview:** rendered in-browser from the file's embedded symbol graphics, with no server-side conversion. Pan, zoom, and fit, plus a graceful fallback for legacy `.sch` files.
- [x] **KiCad PCB (`.kicad_pcb`) preview:** in-browser top-down board render — outline, copper zones and tracks, pads with drills, vias, and silkscreen — in the same pan/zoom canvas. No server-side conversion.
- [x] **File organisation into folders:** create, rename, move, and nest folders, drag-and-drop files and folders, and folder downloads.
- [x] **Frontend refactor:** `App.js` split from ~8000 lines into components (FileList, BOMViewer, KPI, file viewers, modals).
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