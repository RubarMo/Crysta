# Graph Report - Crysta  (2026-09-18)

## Corpus Check
- 117 files · ~65,506 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: .xml 14, (none) 7, .properties 2)

## Summary
- 339 nodes · 749 edges · 31 communities (20 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Rust Tauri Backend & SQLite
- Frontend Package Dependencies
- Tauri Desktop & Security Config
- Book Studio & EPUB Export
- Android Gradle Build Plugins
- Theme & Word Count Components
- TypeScript Client Configuration
- App Shell & Neubrutalism Design
- Workspace State & IPC Bridge
- Workspace Panes & Matrix Props
- Build Tooling & Tailwind Config
- Internationalization & Language Context
- Project Snapshots & Backups
- Node TypeScript Config
- Updater Script & Distribution
- Android Activity & Lifecycle
- Tauri Capabilities & Permissions
- Scene Matrix & Reordering
- Gradle Wrapper Scripts
- Crysta Architecture & Release Pipeline
- Graphify Knowledge Graph Integration
- Android Build Properties
- Git Workflow Guidelines
- Native Cargo Crate

## God Nodes (most connected - your core abstractions)
1. `DbState` - 30 edges
2. `useLanguage()` - 27 edges
3. `get_db_conn()` - 26 edges
4. `react` - 16 edges
5. `compilerOptions` - 16 edges
6. `Novel` - 15 edges
7. `lucide-react` - 13 edges
8. `App()` - 10 edges
9. `Workspace()` - 10 edges
10. `StepProgress` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Multiplatform Release CI Pipeline` --references--> `Crysta Novelist Workspace`  [INFERRED]
  .github/workflows/release.yml → README.md
- `App()` --calls--> `useLanguage()`  [EXTRACTED]
  src/App.tsx → src/LanguageContext.tsx
- `App()` --calls--> `takeSnapshot()`  [EXTRACTED]
  src/App.tsx → src/lib.ts
- `Sidebar()` --calls--> `useLanguage()`  [EXTRACTED]
  src/components/Sidebar.tsx → src/LanguageContext.tsx
- `BookStudioTab()` --calls--> `useLanguage()`  [EXTRACTED]
  src/components/workspace/BookStudioTab.tsx → src/LanguageContext.tsx

## Import Cycles
- None detected.

## Communities (31 total, 11 thin omitted)

### Community 0 - "Rust Tauri Backend & SQLite"
Cohesion: 0.14
Nodes (58): AppHandle, Connection, Error, manager, Mutex, Option, Path, PathBuf (+50 more)

### Community 1 - "Frontend Package Dependencies"
Cohesion: 0.05
Nodes (37): dependencies, jszip, lucide-react, @material/web, react, react-dom, @tauri-apps/api, @tauri-apps/plugin-opener (+29 more)

### Community 2 - "Tauri Desktop & Security Config"
Cohesion: 0.09
Nodes (22): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+14 more)

### Community 3 - "Book Studio & EPUB Export"
Cohesion: 0.22
Nodes (16): jszip, BookStudioTab(), BookStudioTabProps, BookFormatConfig, Chapter, getBookFormatting(), saveBookFormatting(), saveExportFile() (+8 more)

### Community 4 - "Android Gradle Build Plugins"
Cohesion: 0.13
Nodes (15): applicationextension, configure, DefaultTask, file, get, gradleexception, input, loglevel (+7 more)

### Community 5 - "Theme & Word Count Components"
Cohesion: 0.17
Nodes (15): lucide-react, react, react-dom, ThemeToggle(), WordCounter(), WordCounterProps, CommandPaletteDialog(), CommandPaletteDialogProps (+7 more)

### Community 6 - "TypeScript Client Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 7 - "App Shell & Neubrutalism Design"
Cohesion: 0.19
Nodes (14): Agent Customizations System, Neubrutalism UI System, Neubrutalism UI Skill, Vite & React Web Shell, ref_tauri_apps_api_app, App(), RecentProject, Sidebar() (+6 more)

### Community 8 - "Workspace State & IPC Bridge"
Cohesion: 0.23
Nodes (8): ref_tauri_apps_api_core, Workspace(), deleteCharacter(), deleteScene(), getChapters(), saveCharacter(), saveScene(), saveStepProgress()

### Community 9 - "Workspace Panes & Matrix Props"
Cohesion: 0.27
Nodes (14): SidebarProps, ReferenceDrawerPanel(), ReferenceDrawerPanelProps, SceneMatrixViewProps, WorkspaceProps, WriteNovelTab(), WriteNovelTabProps, Character (+6 more)

### Community 10 - "Build Tooling & Tailwind Config"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, postcss, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, @types/jszip, @types/react (+4 more)

### Community 11 - "Internationalization & Language Context"
Cohesion: 0.25
Nodes (8): ref_react_dom_client, src_index, Language, LanguageContext, LanguageContextType, LanguageProvider(), LocaleKeys, translations

### Community 12 - "Project Snapshots & Backups"
Cohesion: 0.36
Nodes (8): SnapshotsModal(), SnapshotsModalProps, deleteSnapshot(), listSnapshots(), openBackupsDirectory(), restoreSnapshot(), SnapshotInfo, takeSnapshot()

### Community 13 - "Node TypeScript Config"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 14 - "Updater Script & Distribution"
Cohesion: 0.29
Nodes (5): ref_fs, ref_path, fs, path, version

### Community 15 - "Android Activity & Lifecycle"
Cohesion: 0.40
Nodes (4): Bundle, enableedgetoedge, MainActivity, TauriActivity

### Community 16 - "Tauri Capabilities & Permissions"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 17 - "Scene Matrix & Reordering"
Cohesion: 0.50
Nodes (4): GroupBy, SceneMatrixView(), ViewMode, reorderScenes()

### Community 18 - "Gradle Wrapper Scripts"
Cohesion: 0.70
Nodes (4): gradlew script, die(), save(), warn()

### Community 19 - "Crysta Architecture & Release Pipeline"
Cohesion: 0.50
Nodes (4): Multiplatform Release CI Pipeline, Crysta Novelist Workspace, Snowflake Method, Tauri SQLite Local-First Architecture

## Knowledge Gaps
- **109 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 149 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Crysta Novelist Workspace` connect `Crysta Architecture & Release Pipeline` to `App Shell & Neubrutalism Design`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `Tauri SQLite Local-First Architecture` connect `Crysta Architecture & Release Pipeline` to `Rust Tauri Backend & SQLite`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `react` connect `Theme & Word Count Components` to `Frontend Package Dependencies`, `Book Studio & EPUB Export`, `App Shell & Neubrutalism Design`, `Workspace State & IPC Bridge`, `Workspace Panes & Matrix Props`, `Internationalization & Language Context`, `Project Snapshots & Backups`, `Scene Matrix & Reordering`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rust Tauri Backend & SQLite` be split into smaller, more focused modules?**
  _Cohesion score 0.14124293785310735 - nodes in this community are weakly interconnected._
- **Should `Frontend Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._
- **Should `Tauri Desktop & Security Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._