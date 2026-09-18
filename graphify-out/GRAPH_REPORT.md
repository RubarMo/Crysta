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

## Import Cycles
- None detected.

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

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

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