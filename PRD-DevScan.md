# Product Requirements Document (PRD)

## DevScan — Development Project Health Scanner & Cleanup Assistant

| Field | Value |
|---|---|
| **Product Name** | DevScan |
| **Version** | 1.0 (MVP) |
| **Author** | Santhosh J |
| **Date** | 2026-03-08 |
| **Status** | Draft |
| **Platform** | macOS |
| **Architecture** | Node.js CLI + Local Web Dashboard, powered by Filesystem MCP Server |
| **Delivery** | CLI scans & generates JSON data → opens local web dashboard in browser |

---

## 1. Problem Statement

Developers accumulate dozens — sometimes hundreds — of software projects on their local machines over the years. Android apps, Node.js services, Python experiments, Docker setups, and one-off prototypes pile up across `~/Documents`, `~/Projects`, `~/Desktop`, and other directories.

**The pain points:**
- No easy way to see which projects are still active vs. abandoned
- Stale projects silently consume tens of GBs (`node_modules`, `.gradle/`, `build/`, `venv/`)
- Fear of deleting projects that might have uncommitted or unpushed work
- No overview of git status across all projects at once
- Docker images, stopped containers, and build caches bloat the system over time

**Current workaround:** Manually `cd`-ing into each folder, running `git status`, checking dates — tedious and error-prone.

---

## 2. Product Vision

A **macOS-native CLI + Web Dashboard tool** powered by **MCP (Model Context Protocol) filesystem server** that automatically discovers all development projects on the local machine, analyzes their health, classifies them by activity status, and provides a guided cleanup workflow — ensuring nothing important is lost before reclaiming disk space.

### One-liner
> "Find every dev project on your Mac, know what's stale, safely clean up, reclaim your disk."

### How It Works
1. **CLI** scans the filesystem and collects project data into a JSON report
2. **Local web server** starts and opens a **browser dashboard** showing all projects with filters, sorting, and action buttons
3. User reviews projects visually → clicks actions (Move to Trash, Clean Artifacts, Push to Git)
4. Dashboard sends action requests to the local CLI server → CLI executes safely

---

## 3. Target Users

| User Type | Description |
|---|---|
| **Primary** | Individual developers on macOS with 10+ projects accumulated over time |
| **Secondary** | Students/learners who create many practice projects and need periodic cleanup |

### User Persona
**Santhosh** — a developer with 3+ years of projects scattered across his Mac. He has Android projects from 2023, Node apps from a hackathon, Python scripts for automation, and Docker experiments. His disk is 80% full. He wants to clean up but is afraid of losing uncommitted work.

---

## 4. Goals & Success Metrics

### Goals
1. Automatically discover all development projects under specified scan directories
2. Classify each project's activity status (active / idle / stale / abandoned)
3. Identify uncommitted and unpushed git work before any cleanup
4. Guide users to safely commit/push before deletion
5. Reclaim disk space by removing build artifacts and stale projects
6. Scan system-wide development bloat (Docker, caches, node_modules)

### Success Metrics (MVP)
| Metric | Target |
|---|---|
| Project detection accuracy | Detects 95%+ of dev projects in scanned directories |
| Scan speed | Full scan of ~100 projects completes in < 60 seconds |
| Disk recovery identified | Accurately estimates reclaimable space within 5% |
| Zero data loss | Never deletes a project with uncommitted/unpushed work without explicit user confirmation |

---

## 5. Functional Requirements

### 5.1 Project Discovery

**FR-1:** Scan one or more root directories recursively and detect development projects by their marker files.

| Project Type | Detection Markers |
|---|---|
| Android | `build.gradle`, `settings.gradle`, `AndroidManifest.xml` |
| Node.js | `package.json` |
| Python | `requirements.txt`, `pyproject.toml`, `setup.py` |
| Rust | `Cargo.toml` |
| Go | `go.mod` |
| Java/Kotlin | `pom.xml`, `build.gradle.kts` |
| Docker | `Dockerfile`, `docker-compose.yml` |
| Flutter/Dart | `pubspec.yaml` |
| iOS/Swift | `*.xcodeproj`, `*.xcworkspace`, `Podfile` |
| Ruby | `Gemfile` |
| Generic Git | Any folder with `.git/` |

**FR-2:** Avoid scanning inside nested dependencies (`node_modules/`, `vendor/`, `.venv/`, `target/`, `build/`).

**FR-3:** Configurable scan paths with sensible defaults:
- Default paths: `~/Documents`, `~/Projects`, `~/Desktop`, `~/Developer`, `~/repos`, `~/workspace`
- User can add/remove paths via config file (`~/.devscan/config.json`) or CLI flags
- First run: prompt user to confirm or customize default paths

**FR-4:** Allow exclude patterns (e.g., skip `~/Documents/Personal`). Configurable via config file.

### 5.2 Per-Project Health Analysis

For each discovered project, gather:

| Data Point | Source | Method |
|---|---|---|
| **Project name** | Folder name | Filesystem MCP |
| **Project type** | Marker file detected | Filesystem MCP |
| **Absolute path** | Directory path | Filesystem MCP |
| **Last modified** | Most recent file change (excluding dependencies) | Filesystem MCP |
| **Total disk usage** | Recursive size calculation | `du -sh` via system call |
| **Bloat size** | Size of `node_modules/`, `build/`, `.gradle/`, `venv/`, `target/`, etc. | Filesystem MCP + system call |
| **Git initialized** | `.git/` exists | Filesystem MCP |
| **Git remote** | Has remote configured | `git remote -v` |
| **Uncommitted changes** | Dirty working tree | `git status --porcelain` |
| **Unpushed commits** | Local commits not on remote | `git log origin/main..HEAD` |
| **Last commit date** | Most recent commit timestamp | `git log -1 --format=%ci` |
| **First commit date** | Project age | `git log --reverse --format=%ci | head -1` |
| **Has README** | README.md exists | Filesystem MCP |
| **Has tests** | Test directory or test files exist | Filesystem MCP |

### 5.3 Smart Classification

| Status | Criteria | Color Code |
|---|---|---|
| **Active** | Last modified within 30 days | Green |
| **Idle** | Last modified 1–6 months ago | Yellow |
| **Stale** | Last modified 6–12 months ago | Orange |
| **Abandoned** | Last modified 12+ months ago | Red |

**Safety Classification (overlay):**

| Safety | Criteria |
|---|---|
| **Safe to Delete** | Stale/Abandoned + no uncommitted changes + all pushed to remote |
| **Clean Artifacts Only** | Any status + has large build artifacts that can be removed |
| **Needs Attention** | Has uncommitted changes OR no git remote (work could be lost) |
| **Keep** | Active project, no action needed |

### 5.4 Guided Cleanup Workflow

**FR-5: Automated Git Push (for uncommitted/unpushed projects)**
For projects marked "Needs Attention":
1. Show list of uncommitted files and unpushed commits in the dashboard
2. **One-click "Push to Git" action** that automates:
   - If no git repo: `git init` → `git add .` → `git commit -m "DevScan: archive commit"` → prompt for remote URL → `git push`
   - If no remote: prompt for remote URL → `git remote add origin <url>` → `git push -u origin main`
   - If uncommitted changes: `git add .` → `git commit -m "DevScan: save uncommitted work"` → `git push`
   - If unpushed commits: `git push`
3. Re-classify project as "Safe to Delete" after successful push
4. Show success/failure status in dashboard

**FR-6: Suggestion-Based Cleanup Actions**
DevScan suggests the best action for each project. User approves/modifies the suggestion.

| Suggestion | When | What It Does |
|---|---|---|
| **"Move to Trash"** | Stale/Abandoned + all pushed to remote | Moves entire project to macOS Trash (`~/.Trash/`) — recoverable via Finder |
| **"Clean Artifacts"** | Any status + large build artifacts | Deletes `node_modules/`, `build/`, `.gradle/`, `venv/`, `target/`, `.dart_tool/`, `Pods/` — keeps source code |
| **"Push to Git First"** | Has uncommitted/unpushed work | Automates git commit + push (FR-5), then re-suggests Move to Trash |
| **"Prune Docker"** | Unused Docker images/containers/volumes | Runs `docker system prune`, removes stopped containers, dangling images |
| **"Keep"** | Active project | No action needed, shown for completeness |
| **"Skip"** | User override | Leave project untouched |

**FR-7:** Always show disk space that will be recovered before executing any action.

**FR-8:** All deletions use **macOS Trash** (`mv` to `~/.Trash/`), NOT hard delete. User can recover from Trash if needed.

**FR-9:** Require explicit confirmation before any action. Dashboard shows a confirmation modal with project path, size, and action details.

### 5.5 System-Wide Scans

| Target | What It Scans | Command |
|---|---|---|
| **Docker Images** | Dangling/unused images | `docker images`, `docker system df` |
| **Docker Containers** | Stopped containers | `docker ps -a --filter status=exited` |
| **Docker Volumes** | Unused volumes | `docker volume ls -f dangling=true` |
| **Homebrew** | Outdated packages, cache | `brew cleanup --dry-run` |
| **Xcode** | Derived data, archives, simulators | Check `~/Library/Developer/` |
| **Gradle Cache** | Global gradle cache | `~/.gradle/caches/` size |
| **Maven Cache** | Local maven repo | `~/.m2/repository/` size |
| **CocoaPods Cache** | Pod cache | `~/Library/Caches/CocoaPods/` size |
| **npm Cache** | Global npm cache | `~/.npm/` size |

### 5.6 Web Dashboard (Primary UI)

**FR-10: Dashboard Layout**
The web dashboard is the primary interface. Opens in browser at `http://localhost:3847` after scan completes.

**Header Section:**
- Summary stats cards: Total Projects, Active, Stale, Abandoned, Reclaimable Space
- Disk usage donut chart
- "Rescan" button

**Main Table:**
- Sortable, filterable table of all discovered projects
- Columns: Name, Type, Size, Bloat, Last Activity, Git Status, Status, Suggested Action
- Color-coded rows by status (green/yellow/orange/red)
- Filter by: status, project type, git status
- Search bar for project names

**Project Detail Panel (click to expand):**
- Full path, disk breakdown, git details
- File list for uncommitted changes
- Action buttons: Move to Trash, Clean Artifacts, Push to Git, Skip

**System Cleanup Tab:**
- Docker section: images, containers, volumes with prune button
- Caches section: Gradle, Maven, npm, CocoaPods, Xcode derived data
- Each item shows size and cleanup action

**FR-11: CLI Output (Secondary)**
CLI also prints a terminal summary after scanning:
```
DevScan Report — 2026-03-08
═══════════════════════════════════════════════
 Projects found:     47
 Active:             12
 Idle:                8
 Stale:              15
 Abandoned:          12
 Needs Attention:     5  (uncommitted work!)
 Safe to Delete:      9
 Total disk usage:   84.3 GB
 Reclaimable space:  34.7 GB
═══════════════════════════════════════════════
Dashboard: http://localhost:3847
```

---

## 6. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| **Platform** | macOS only (uses macOS filesystem paths, `du`, Xcode paths) |
| **Architecture** | Node.js CLI + Express server + Browser dashboard, using MCP Filesystem Server |
| **Performance** | Scan 100+ projects in < 60 seconds |
| **Safety** | NEVER auto-delete. Always require explicit user confirmation. Use macOS Trash for all deletions. |
| **Privacy** | 100% local. No data leaves the machine. No analytics. No network calls (except git remote checks) |
| **Idempotent** | Running scan multiple times produces consistent results |
| **Disk impact** | Tool itself should be lightweight (< 10 MB installed) |

---

## 7. Technical Architecture

### Tech Stack
| Layer | Technology | Rationale |
|---|---|---|
| **CLI Scanner** | Node.js + TypeScript | Rich ecosystem, good for filesystem ops, async scanning |
| **Web Dashboard** | React (Vite) or plain HTML + vanilla JS | Lightweight local dashboard, no heavy framework needed |
| **Local Server** | Express.js | Serves dashboard + handles action API calls |
| **Filesystem Access** | MCP Filesystem Server | Standardized file operations via MCP protocol |
| **Git Analysis** | `child_process` → git CLI | Shell out to git commands per project |
| **Styling** | Tailwind CSS | Fast, utility-first styling for dashboard |

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│                    CLI (devscan)                     │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Scanner  │  │ Analyzer │  │ Action Executor  │  │
│  │          │  │          │  │                  │  │
│  │ MCP FS   │→ │ Git CLI  │→ │ Trash / Prune /  │  │
│  │ Discovery│  │ du -sh   │  │ Git Push         │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│        ↓              ↓               ↑             │
│  ┌─────────────────────────────────────────────┐    │
│  │           scan-results.json                 │    │
│  └─────────────────────────────────────────────┘    │
│        ↓                                            │
│  ┌─────────────────────────────────────────────┐    │
│  │     Express Server (localhost:3847)          │    │
│  │     GET /api/projects → scan data           │    │
│  │     POST /api/action → execute cleanup      │    │
│  │     GET / → serve dashboard HTML            │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│              Browser Dashboard                       │
│  Summary Cards │ Project Table │ System Cleanup Tab  │
│  Filters/Sort  │ Action Buttons │ Confirmation Modal │
└─────────────────────────────────────────────────────┘
```

### API Endpoints (Local Express Server)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | Return all scanned projects as JSON |
| `GET` | `/api/system` | Return system-wide scan (Docker, caches) |
| `POST` | `/api/action/trash` | Move project to macOS Trash |
| `POST` | `/api/action/clean` | Remove build artifacts from project |
| `POST` | `/api/action/git-push` | Auto commit + push project to git |
| `POST` | `/api/action/docker-prune` | Prune Docker images/containers/volumes |
| `POST` | `/api/rescan` | Re-run the scan and return updated results |

### Data Flow
```
[User runs `devscan`]
        ↓
[Load config: ~/.devscan/config.json]
        ↓
[MCP Filesystem: Discover projects in configured paths]
        ↓
[For each project: Analyze in parallel]
├── MCP: Check marker files → determine project type
├── Shell: git status/log/remote → git health
├── Shell: du -sh → disk usage
└── MCP: Check for build artifact dirs → bloat size
        ↓
[Classify: Active/Idle/Stale/Abandoned]
        ↓
[Safety overlay: Safe to Delete / Needs Attention / Keep]
        ↓
[Generate suggestion per project]
        ↓
[Write scan-results.json]
        ↓
[Start Express server → Open browser dashboard]
        ↓
[User reviews + takes actions via dashboard]
        ↓
[Actions execute via API → move to Trash / clean / git push]
```

---

## 8. Project Structure

```
devscan/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # CLI entry point
│   ├── config.ts                 # Load/save ~/.devscan/config.json
│   ├── scanner/
│   │   ├── discovery.ts          # Find projects via MCP filesystem
│   │   ├── analyzer.ts           # Analyze each project (git, disk, type)
│   │   ├── classifier.ts         # Classify status + safety
│   │   └── project-types.ts      # Marker file definitions per project type
│   ├── actions/
│   │   ├── trash.ts              # Move to macOS Trash
│   │   ├── clean-artifacts.ts    # Remove build artifacts
│   │   ├── git-push.ts           # Auto commit + push
│   │   └── docker-prune.ts       # Docker cleanup
│   ├── system/
│   │   ├── docker.ts             # Docker system scan
│   │   └── caches.ts             # Gradle, Maven, npm, Xcode caches
│   ├── server/
│   │   ├── app.ts                # Express server setup
│   │   └── routes.ts             # API route handlers
│   └── utils/
│       ├── git.ts                # Git command helpers
│       ├── disk.ts               # Disk usage helpers (du)
│       └── format.ts             # Size formatting, date helpers
├── dashboard/
│   ├── index.html                # Single-page dashboard
│   ├── styles.css                # Tailwind or vanilla CSS
│   └── app.js                    # Dashboard JavaScript (fetch API, render table)
└── tests/
    ├── scanner.test.ts
    ├── classifier.test.ts
    └── actions.test.ts
```

---

## 9. MVP Scope (v1.0)

### In Scope
- [x] Scan configurable directories for dev projects
- [x] Detect 10+ project types by marker files
- [x] Git health analysis (committed? pushed? remote?)
- [x] Activity classification (active/idle/stale/abandoned)
- [x] Safety classification (safe to delete / needs attention)
- [x] Disk usage and bloat calculation
- [x] Automated git commit/push for uncommitted projects
- [x] Clean build artifacts action
- [x] Move to Trash action (not hard delete)
- [x] CLI summary report in terminal
- [x] Web dashboard in browser with sortable/filterable table
- [x] Docker system scan + prune
- [x] Suggestion-based actions per project

### Out of Scope (Future)
- [ ] Archive to .tar.gz
- [ ] Scheduled periodic scans (cron-based)
- [ ] Integration with cloud storage (backup to Google Drive, etc.)
- [ ] Dependency vulnerability scanning
- [ ] Multi-platform support (Linux, Windows)
- [ ] Electron/Tauri desktop app
- [ ] GitHub API integration (auto-create repos for untracked projects)

---

## 10. User Flows

### Flow 1: First Scan
1. User runs `devscan` (or `npx devscan`)
2. Tool discovers all dev projects in configured directories
3. Tool analyzes each project (git, disk, activity)
4. CLI prints summary report
5. Browser opens with full dashboard at `http://localhost:3847`
6. User reviews all projects sorted by status (abandoned first)

### Flow 2: Cleanup — Safe Project
1. User clicks a project marked "Safe to Delete" in the dashboard
2. Detail panel shows: path, size, last activity, git status (all clean)
3. DevScan suggests: "Move to Trash" with estimated disk recovery
4. User clicks "Move to Trash" → confirmation modal appears
5. User confirms → project moved to macOS Trash
6. Dashboard updates with new totals

### Flow 3: Cleanup — Uncommitted Project
1. User clicks a project marked "Needs Attention"
2. Detail panel shows: uncommitted files list, unpushed commits count
3. DevScan suggests: "Push to Git First"
4. User clicks "Push to Git" → tool auto-commits and pushes
5. On success: project reclassified as "Safe to Delete"
6. User can now Move to Trash

### Flow 4: System Cleanup
1. User clicks "System Cleanup" tab in dashboard
2. Dashboard shows: Docker images/containers/volumes, cache sizes (Gradle, npm, Xcode, etc.)
3. User clicks "Prune Docker" → confirmation modal → prune executes
4. User clicks "Clean Gradle Cache" → confirmation → cache deleted
5. Dashboard shows total space recovered

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Accidental deletion of important project | **Critical** | All deletions go to macOS Trash (recoverable). Double confirmation modal. Safety classification must verify git status. |
| Incorrect stale classification | Medium | Use both file modification time AND git commit date. Allow user override. |
| Auto git push to wrong remote | Medium | Show remote URL before pushing. Require confirmation. |
| Slow scan on large filesystems | Medium | Skip known non-project dirs (node_modules, etc.). Parallelize analysis. Show progress indicator. |
| Git commands fail (corrupt repo) | Low | Graceful error handling. Mark as "Unknown" status, flag for manual review. |
| Docker not installed | Low | Check for Docker availability before scanning. Skip gracefully with info message. |

---

## 12. Open Questions

1. **Scan depth limit** — Should we limit recursion depth (e.g., max 5 levels deep) to avoid scanning into deeply nested project structures?
2. **Monorepo handling** — How should we handle monorepos with multiple sub-projects?
3. **Symlink handling** — Follow symlinks or skip them?
4. **Minimum project size** — Should we ignore projects below a certain size threshold (e.g., < 1 MB)?

---

*End of PRD v1.0*
