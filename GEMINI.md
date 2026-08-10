# GEMINI.md — Project Guidelines & Developer Instructions

## 1. Project Philosophy

**Crysta** is an offline-first, local-first, privacy-respecting novel studio designed to guide writers through structuring and drafting novels using **Randy Ingermanson's 10-Step Snowflake Method**.

### Core Philosophy & Principles:
- **Local-First & Data Ownership**: User data is saved directly in standalone SQLite files (`.crysta` / `.db`). No mandatory cloud services, no external accounts, no telemetry, no tracking, and zero cloud lock-in.
- **Structured Creative Workflow**: The software guides authors systematically from a 15-word hook to a full 4-page synopsis and scene-by-scene drafting.
- **Cross-Platform Parity**: Clean, fast, and responsive user experience on mobile (Android & iOS) and desktop (Windows, macOS, Linux).
- **Native Internationalization**: Dynamic bilingual UI with real-time switching between Right-to-Left (Arabic) and Left-to-Right (English) layouts.

---

## 2. Architecture & Codebase Design

Crysta is built using **Flutter & Dart** with a clean, domain-driven modular architecture:

```
Crysta/
├── GEMINI.md                  # Project instructions & guidelines for AI assistants
├── README.md                  # Project overview and build instructions
└── flutter_app/               # Main Flutter application package
    ├── lib/
    │   ├── main.dart          # App entry point, MaterialApp, Theme & Locale state (~80 LOC)
    │   ├── db_service.dart    # Local SQLite database service (sqflite on mobile, sqflite_common_ffi on desktop)
    │   ├── models.dart        # Core data structures (Novel, Character, Scene, Chapter, StepProgress)
    │   ├── locales.dart       # Bilingual localization dictionary (Arabic RTL & English LTR)
    │   │
    │   ├── widgets/           # Reusable UI components
    │   │   ├── native_text_editor.dart    # Native rich text editor with live word count & RTL arrow key handling
    │   │   └── theme_settings_dialog.dart # Theme customization dialog & helper
    │   │
    │   └── views/             # Screen views and workspace tab builders
    │       ├── project_manager_page.dart  # Project creation, opening, and recent files list
    │       └── workspace/
    │           ├── workspace_page.dart    # Main workspace shell, drawer, sidebar, and DB synchronization
    │           └── tabs/                  # Focused Snowflake step builder tabs
    │               ├── dashboard_tab.dart         # Novel metrics dashboard (Step 0)
    │               ├── step_editor_tab.dart       # Generic text step editor & StepHeaderActions (Steps 1, 2, 4, 6)
    │               ├── character_bios_tab.dart    # Character sheets (Steps 3, 5, 7)
    │               ├── scene_matrix_tab.dart      # Scene list & outlines (Steps 8, 9)
    │               ├── export_tab.dart            # Complete outline export view (Step 10)
    │               └── write_novel_tab.dart       # Full chapter drafting and export view
    ├── android/               # Android platform target
    ├── windows/               # Windows platform target
    └── pubspec.yaml           # Dependencies & Flutter configuration
```

### Technical Design Patterns:
- **Responsive Layout Engine**: Master-Detail pattern adapted per screen form factor:
  - **Mobile**: Touch-optimized adaptive Navigation Drawer, stacked metrics, drill-down editors with back-navigation.
  - **Desktop**: Multi-pane split workspace with resizable sidebars.
- **Database Architecture**: `db_service.dart` handles database initialization and schema migration, utilizing `sqflite` on mobile devices and `sqflite_common_ffi` on desktop OS targets.
- **Native Text Editing & Metrics**: Integrated native text editor with real-time word counting, responsive toolbar/footer, and goal progress bars.

---

## 3. Git & Branch Management Rules

> [!IMPORTANT]
> **Branch Context**: The default development branch is **`development`**.
> - **Main Branch Protection**: NEVER edit or commit to the `main` branch directly.
> - **No Git Command Execution**: AI assistants are **STRICTLY FORBIDDEN** from running git commands (`git commit`, `git push`, `git checkout`, `git branch`, `git merge`, opening PRs, etc.). All git operations are strictly user-managed.
> - **Branch Verification**: Always verify the active branch (by reading `.git/HEAD` or checking project metadata) and confirm branch target in implementation plans.

---

## 4. AI Developer Instructions & Operational Rules

When working on this repository, AI agents must strictly follow these mandatory rules:

### A. Lazy Senior Developer Mode (Ponytail Principle)
- **Minimal Code Principle**: The best code is code never written. Before writing code, evaluate:
  1. Does this need to be built at all? (YAGNI)
  2. Does it already exist in the codebase? Reuse existing helpers/models in `lib/`.
  3. Does Flutter/Dart standard library already cover it?
- **Root-Cause Fixes over Symptom Patching**: Fix underlying logic bugs at the source; update all call sites rather than wrapping failures in silent try/catches.
- **Deletion over Addition**: Prefer concise, readable single-line implementations over boilerplate.

### B. Planning & User Clarification Protocol
- **Never Edit Before Clarifying**: Understand the request and trace the complete flow end-to-end before touching code.
- **Mandatory Implementation Plan**: Before performing any file edits, present a clear, sectioned implementation plan. Wait for explicit user review and approval before executing edits.
- **No Hallucinations**: Base all diagnoses strictly on empirical evidence, actual source code, and log outputs. Never invent non-existent APIs, files, or facts.
- **Error Diagnostics**: If an unexpected error occurs, **STOP immediately**, display the exact error details, diagnose the root cause, and present findings before suggesting a fix.

---

## 5. Development & Build Commands

All application commands must be run from inside the `flutter_app/` directory:

- **Install Dependencies**:
  ```bash
  cd flutter_app
  flutter pub get
  ```

- **Run Locally**:
  ```bash
  # Windows
  flutter run -d windows

  # Android
  flutter run -d android
  ```

- **Build Release Packages**:
  ```bash
  # Windows Executable
  flutter build windows --release

  # Android APK
  flutter build apk --release
  ```
