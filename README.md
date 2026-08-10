<p align="center">
  <h1 align="center">❄️ Crysta — Novel Studio</h1>
  <p align="center">
    <strong>A local-first, cross-platform novel writing studio based on the Snowflake Method.</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Flutter-3.41%2B-02569B?logo=flutter&logoColor=white" alt="Flutter" />
    <img src="https://img.shields.io/badge/Dart-3.11%2B-0175C2?logo=dart&logoColor=white" alt="Dart" />
    <img src="https://img.shields.io/badge/SQLite-Local--First-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/Platforms-Android%20%7C%20Windows%20%7C%20iOS%20%7C%20macOS%20%7C%20Linux-brightgreen" alt="Platforms" />
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
  </p>
</p>

---

## 📖 About Crysta

**Crysta** is an offline-first, privacy-respecting novel studio designed to guide writers through structuring and drafting novels using **Randy Ingermanson's 10-Step Snowflake Method**.

Built 100% in **Flutter & Dart**, Crysta delivers a fast, responsive experience on both mobile touchscreens (Android & iOS) and desktop monitors (Windows, macOS, & Linux).

---

## ✨ Key Features

- **❄️ 10-Step Snowflake Workflow**: Structured progression from a 15-word hook all the way to complete scene-by-scene narrative drafting.
- **📱💻 Responsive Master-Detail Design**:
  - **Mobile**: Touch-optimized layout featuring an adaptive Navigation Drawer, stacked metrics, and full-screen drill-down editors with back-button navigation.
  - **Desktop**: Multi-pane desktop workspace with drag-to-resize sidebars and split master-detail views.
- **💾 Local-First & Private**: Stories are saved in standalone SQLite files (`.crysta`). No accounts, no cloud lock-in, no telemetry.
- **🌐 Dynamic Bilingual UI (RTL & LTR)**: Native support for Arabic (RTL) and English (LTR) with instant, real-time layout flipping and RTL arrow key navigation.
- **✏️ Native Text Editor & Live Metrics**: Built-in native editor with live word count tracking, automatic synchronization, and goal progress bars.
- **📄 Exporting**: Export your novel and structured outlines directly to **`.txt`** and **`.docx`** (Microsoft Word) documents or copy complete Markdown summaries.
- **🎨 Material 3 Theming**: Built-in Light/Dark themes and dynamic seed color customization.

---

## 🏗️ Architecture

Crysta uses a clean, modular Flutter architecture:

```
Crysta/
├── GEMINI.md                  # Developer guidelines & AI assistant instructions
├── README.md                  # Project overview & documentation
└── flutter_app/               # Main Flutter application package
    ├── lib/
    │   ├── main.dart          # App entry point & root MaterialApp (~80 LOC)
    │   ├── models.dart        # Data Models (Novel, Character, Scene, Chapter, StepProgress)
    │   ├── db_service.dart    # Native SQLite Engine (sqflite & sqflite_common_ffi)
    │   ├── locales.dart       # Bilingual i18n dictionaries (Arabic RTL & English LTR)
    │   │
    │   ├── widgets/           # Shared reusable components
    │   │   ├── native_text_editor.dart    # Native rich text editor with live word count
    │   │   └── theme_settings_dialog.dart # Theme customizer modal
    │   │
    │   └── views/             # Screen layouts and Snowflake views
    │       ├── project_manager_page.dart  # Project manager & recent files view
    │       └── workspace/
    │           ├── workspace_page.dart    # Workspace shell, drawer, & sidebar navigation
    │           └── tabs/                  # Focused Snowflake step builder tabs
    │               ├── dashboard_tab.dart
    │               ├── step_editor_tab.dart
    │               ├── character_bios_tab.dart
    │               ├── scene_matrix_tab.dart
    │               ├── export_tab.dart
    │               └── write_novel_tab.dart
    ├── android/               # Android Platform Target
    ├── windows/               # Windows Platform Target
    └── pubspec.yaml           # Project Dependencies
```

- **Frontend**: Flutter Material 3 with adaptive layouts and modular tabs.
- **Database Engine**: `sqflite` (Android/iOS) and `sqflite_common_ffi` (Desktop).

---

## 🚀 Getting Started

### Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (3.41+ recommended)
- [Dart SDK](https://dart.dev/get-dart) (3.11+ included with Flutter)

### Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RubarMo/Crysta.git
   cd Crysta/flutter_app
   ```

2. **Fetch dependencies:**
   ```bash
   flutter pub get
   ```

3. **Run locally:**
   - **Windows Desktop:**
     ```bash
     flutter run -d windows
     ```
   - **Android Mobile:**
     ```bash
     flutter run -d android
     ```

### Production Build

- **Windows Executable:**
  ```bash
  flutter build windows --release
  ```
  *Output:* `flutter_app/build/windows/x64/runner/Release/crysta.exe`

- **Android Release APK:**
  ```bash
  flutter build apk --release
  ```
  *Output:* `flutter_app/build/app/outputs/flutter-apk/app-release.apk`

---

## 📖 The 10-Step Snowflake Method

1. **Step 1 — One-Sentence Summary**: Craft a 15-word story hook.
2. **Step 2 — One-Paragraph Summary**: Expand into a 5-sentence narrative arc (setup, 3 disasters, resolution).
3. **Step 3 — Character Bios**: Define character motivations, goals, conflicts, and epiphany moments.
4. **Step 4 — One-Page Synopsis**: Expand each sentence of Step 2 into a full paragraph.
5. **Step 5 — Character POV Synopses**: Write a 1-page story narrative from the perspective of each major character.
6. **Step 6 — Four-Page Synopsis**: Develop a comprehensive plot structure.
7. **Step 7 — Character Profile Charts**: Detailed character attribute charts and growth trajectories.
8. **Step 8 — Scene List**: Map out all novel scenes, POV assignments, and target word counts.
9. **Step 9 — Scene Outlines**: Write detailed narrative action descriptions for each planned scene.
10. **Step 10 — Write Novel**: Author final novel chapters with real-time target word count progress.

---

## 📄 License & Credits

- Developed by **RubarMo**.
- Released under the [MIT License](LICENSE).
