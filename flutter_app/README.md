# Crysta Flutter Application

This directory contains the main **Flutter & Dart** application package for Crysta.

## Quick Links

- [Root Documentation](../README.md)
- [App Entry Point](lib/main.dart)
- [Database Service (SQLite)](lib/db_service.dart)
- [Data Models](lib/models.dart)
- [Bilingual Locales](lib/locales.dart)
- [Reusable Widgets](lib/widgets/)
  - [Native Text Editor](lib/widgets/native_text_editor.dart)
  - [Theme Settings Dialog](lib/widgets/theme_settings_dialog.dart)
- [Views & Tabs](lib/views/)
  - [Project Manager Page](lib/views/project_manager_page.dart)
  - [Workspace Page](lib/views/workspace/workspace_page.dart)
  - [Snowflake Step Tabs](lib/views/workspace/tabs/)

## Build Commands

```bash
# Fetch dependencies
flutter pub get

# Run on Desktop (Windows)
flutter run -d windows

# Run on Mobile (Android)
flutter run -d android

# Build Windows Release Executable
flutter build windows --release

# Build Android Release APK
flutter build apk --release
```
