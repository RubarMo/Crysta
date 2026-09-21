<<<<<<< HEAD
# Graph Report - Crysta  (2026-09-21)

## Corpus Check
- 46 files · ~65,829 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 14, (none) 7, .properties 2)

## Summary
- 379 nodes · 778 edges · 26 communities (16 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `077893ce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.ts
- lib.rs
- package.json
- tauri.conf.json
- BookStudioTab.tsx
- Neubrutalism UI — The Definitive Design System Guide & Skill
- BuildTask.kt
- compilerOptions
- Crysta
- Neubrutalism UI Design Rules
- devDependencies
- compilerOptions
- update-updater.cjs
- .onCreate
- default.json
- gradlew
- Neubrutalism UI for AI Coding Assistants
- properties
- crysta

## God Nodes (most connected - your core abstractions)
1. `DbState` - 30 edges
2. `useLanguage()` - 27 edges
3. `get_db_conn()` - 26 edges
4. `react` - 16 edges
5. `Novel` - 16 edges
6. `compilerOptions` - 16 edges
7. `lucide-react` - 13 edges
8. `Neubrutalism UI Design Rules` - 13 edges
9. `Chapter` - 11 edges
10. `App()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `BookStudioTab()` --calls--> `useLanguage()`  [EXTRACTED]
  src/components/workspace/BookStudioTab.tsx → src/LanguageContext.tsx
- `SidebarProps` --references--> `Novel`  [EXTRACTED]
  src/components/Sidebar.tsx → src/lib.ts
- `WorkspaceProps` --references--> `Novel`  [EXTRACTED]
  src/components/Workspace.tsx → src/lib.ts
- `WriteNovelTabProps` --references--> `Novel`  [EXTRACTED]
  src/components/workspace/WriteNovelTab.tsx → src/lib.ts
- `App()` --calls--> `useLanguage()`  [EXTRACTED]
  src/App.tsx → src/LanguageContext.tsx
=======
# Graph Report - Crysta  (2026-09-18)

## Corpus Check
- Corpus is ~35,750 words - fits in a single context window. You may not need a graph.

## Summary
- 204 nodes · 507 edges · 12 communities (8 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Snowflake Story Domain
- Database & Connection Management
- Snowflake Story Domain
- Snowflake Story Domain
- Snowflake Story Domain
- Project File & Lifecycle
- Database & Connection Management
- Subsystem (ref_tailwindcss_vite)
- Subsystem (Graphify Knowledge Rules)
- Architecture & Design Guidelines

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 29 edges
2. `DbState` - 28 edges
3. `get_db_conn()` - 22 edges
4. `Novel` - 17 edges
5. `useWorkspaceData()` - 13 edges
6. `StepProgress` - 12 edges
7. `App()` - 10 edges
8. `Chapter` - 10 edges
9. `BookStudioTab()` - 9 edges
10. `SnapshotsModal()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Release CI Pipeline` --references--> `Crysta Novelist Workspace`  [INFERRED]
  .github/workflows/release.yml → README.md
- `restore_snapshot()` --references--> `DbState`  [EXTRACTED]
  src-tauri/src/commands/snapshots.rs → src-tauri/src/models.rs
- `get_book_formatting()` --calls--> `get_db_conn()`  [INFERRED]
  src-tauri/src/commands/export.rs → src-tauri/src/db.rs
- `save_book_formatting()` --calls--> `get_db_conn()`  [INFERRED]
  src-tauri/src/commands/export.rs → src-tauri/src/db.rs
- `get_novels()` --calls--> `get_db_conn()`  [INFERRED]
  src-tauri/src/commands/novel.rs → src-tauri/src/db.rs
>>>>>>> removing-the-book-preview-in-the-book-studio-tab

## Import Cycles
- None detected.

<<<<<<< HEAD
## Communities (26 total, 10 thin omitted)

### Community 0 - "lib.ts"
Cohesion: 0.06
Nodes (66): lucide-react, react, react-dom, ref_react_dom_client, ref_tauri_apps_api_app, ref_tauri_apps_api_core, App(), RecentProject (+58 more)

### Community 1 - "lib.rs"
Cohesion: 0.15
Nodes (55): AppHandle, Connection, Error, manager, Mutex, Option, Path, PathBuf (+47 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (38): dependencies, jszip, lucide-react, @material/web, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-opener (+30 more)

### Community 3 - "tauri.conf.json"
Cohesion: 0.09
Nodes (22): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+14 more)

### Community 4 - "BookStudioTab.tsx"
Cohesion: 0.26
Nodes (14): BookPreviewPage, BookStudioTab(), BookStudioTabProps, BookFormatConfig, Chapter, getBookFormatting(), Novel, saveBookFormatting() (+6 more)

### Community 5 - "Neubrutalism UI — The Definitive Design System Guide & Skill"
Cohesion: 0.10
Nodes (19): 1. Core Philosophy & "The One Rule", 1. The Canonical Button, 2. The 6 Non-Negotiable Invariants, 2. The Canonical Card, 3. Form Input Pattern, 3. The 4-Tier Typography System, 4. Design Tokens Specification, 4. Saturated Stat Box (+11 more)

### Community 6 - "BuildTask.kt"
Cohesion: 0.13
Nodes (15): applicationextension, configure, DefaultTask, file, get, gradleexception, input, loglevel (+7 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 8 - "Crysta"
Cohesion: 0.12
Nodes (16): Android, 🛠️ Architecture & Core Features, Crysta, Development Build, 🚀 Getting Started, 📥 Installation, 📄 License, Linux (+8 more)

### Community 9 - "Neubrutalism UI Design Rules"
Cohesion: 0.14
Nodes (13): 10. Direct, Human Copywriting (No Robotic Marketing Jargon), 11. No Static Feature Pills in Application Workspaces, 12. Global Reactive BiDi (RTL/LTR) Synchronization, 1. 0px Border Radius Invariant, 2. Ink Borders & Hard Offset Shadows, 3. Strict High-Contrast Color Rule, 4. Typography Quad-Stack, 5. Neutral Dark Mode Canvas (+5 more)

### Community 10 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, postcss, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, @types/jszip, @types/react (+4 more)

### Community 11 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 12 - "update-updater.cjs"
Cohesion: 0.29
Nodes (5): ref_fs, ref_path, fs, path, version

### Community 13 - ".onCreate"
Cohesion: 0.40
Nodes (4): Bundle, enableedgetoedge, MainActivity, TauriActivity

### Community 14 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 15 - "gradlew"
Cohesion: 0.70
Nodes (4): gradlew script, die(), save(), warn()

## Knowledge Gaps
- **143 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
=======
## Communities (12 total, 4 thin omitted)

### Community 0 - "Snowflake Story Domain"
Cohesion: 0.10
Nodes (38): Neubrutalism UI System, ref_lucide_react, ref_react, ref_react_dom, ref_tauri_apps_api_app, Sidebar(), SidebarProps, ThemeToggle() (+30 more)

### Community 1 - "Database & Connection Management"
Cohesion: 0.09
Nodes (40): AppHandle, BookFormatConfig, Chapter, Character, get_db_conn, params, rusqlite, Scene (+32 more)

### Community 2 - "Snowflake Story Domain"
Cohesion: 0.15
Nodes (23): ref_tauri_apps_api_core, SnapshotsModal(), SnapshotsModalProps, WriteNovelTab(), useWorkspaceData(), deleteChapter(), deleteCharacter(), deleteScene() (+15 more)

### Community 3 - "Snowflake Story Domain"
Cohesion: 0.23
Nodes (17): ref_jszip, BookStudioTab(), BookStudioTabProps, BookFormatConfig, Chapter, getBookFormatting(), Novel, saveBookFormatting() (+9 more)

### Community 4 - "Snowflake Story Domain"
Cohesion: 0.14
Nodes (15): Path, serde, SnapshotInfo, get_backup_dir(), list_snapshots(), open_backups_directory(), restore_snapshot(), take_snapshot() (+7 more)

### Community 5 - "Project File & Lifecycle"
Cohesion: 0.20
Nodes (13): ref_react_dom_client, ref_tauri_apps_plugin_process, ref_tauri_apps_plugin_updater, App(), RecentProject, src_index, LanguageProvider(), closeProject() (+5 more)

### Community 6 - "Database & Connection Management"
Cohesion: 0.22
Nodes (7): commands, dbstate, Release CI Pipeline, manager, Crysta Novelist Workspace, Snowflake Method, Tauri SQLite Architecture

### Community 7 - "Subsystem (ref_tailwindcss_vite)"
Cohesion: 0.50
Nodes (3): ref_tailwindcss_vite, ref_vite, ref_vitejs_plugin_react

## Knowledge Gaps
- **23 isolated node(s):** `crysta`, `Novel`, `StepProgress`, `Character`, `Scene` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 52 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
>>>>>>> removing-the-book-preview-in-the-book-studio-tab

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

<<<<<<< HEAD
- **Why does `react` connect `lib.ts` to `package.json`, `BookStudioTab.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lib.ts` to `package.json`, `BookStudioTab.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06426332288401254 - nodes in this community are weakly interconnected._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.14912280701754385 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.052564102564102565 - nodes in this community are weakly interconnected._
=======
- **Why does `Crysta Novelist Workspace` connect `Database & Connection Management` to `Project File & Lifecycle`?**
  _High betweenness centrality (0.441) - this node is a cross-community bridge._
- **Why does `DbState` connect `Database & Connection Management` to `Snowflake Story Domain`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `get_db_conn()` (e.g. with `get_book_formatting()` and `save_book_formatting()`) actually correct?**
  _`get_db_conn()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `crysta`, `Novel`, `StepProgress` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Snowflake Story Domain` be split into smaller, more focused modules?**
  _Cohesion score 0.10122448979591837 - nodes in this community are weakly interconnected._
- **Should `Database & Connection Management` be split into smaller, more focused modules?**
  _Cohesion score 0.08816326530612245 - nodes in this community are weakly interconnected._
- **Should `Snowflake Story Domain` be split into smaller, more focused modules?**
  _Cohesion score 0.1477832512315271 - nodes in this community are weakly interconnected._
>>>>>>> removing-the-book-preview-in-the-book-studio-tab
