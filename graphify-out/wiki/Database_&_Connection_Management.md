# Database & Connection Management

> 50 nodes

## Key Concepts

- **DbState** (28 connections) — `src-tauri/src/models.rs`
- **get_db_conn()** (22 connections) — `src-tauri/src/db.rs`
- **story.rs** (15 connections) — `src-tauri/src/commands/story.rs`
- **novel.rs** (10 connections) — `src-tauri/src/commands/novel.rs`
- **project.rs** (10 connections) — `src-tauri/src/commands/project.rs`
- **export.rs** (9 connections) — `src-tauri/src/commands/export.rs`
- **db.rs** (8 connections) — `src-tauri/src/db.rs`
- **update_novel_word_count()** (6 connections) — `src-tauri/src/db.rs`
- **mod.rs** (5 connections) — `src-tauri/src/commands/mod.rs`
- **open_project()** (5 connections) — `src-tauri/src/commands/project.rs`
- **save_chapter()** (5 connections) — `src-tauri/src/commands/story.rs`
- **save_scene()** (5 connections) — `src-tauri/src/commands/story.rs`
- **get_book_formatting()** (4 connections) — `src-tauri/src/commands/export.rs`
- **save_book_formatting()** (4 connections) — `src-tauri/src/commands/export.rs`
- **get_novels()** (4 connections) — `src-tauri/src/commands/novel.rs`
- **get_steps_progress()** (4 connections) — `src-tauri/src/commands/novel.rs`
- **save_step_progress()** (4 connections) — `src-tauri/src/commands/novel.rs`
- **delete_chapter()** (4 connections) — `src-tauri/src/commands/story.rs`
- **delete_scene()** (4 connections) — `src-tauri/src/commands/story.rs`
- **get_chapters()** (4 connections) — `src-tauri/src/commands/story.rs`
- **get_characters()** (4 connections) — `src-tauri/src/commands/story.rs`
- **get_scenes()** (4 connections) — `src-tauri/src/commands/story.rs`
- **save_character()** (4 connections) — `src-tauri/src/commands/story.rs`
- **params** (4 connections)
- **create_novel()** (3 connections) — `src-tauri/src/commands/novel.rs`
- *... and 25 more nodes in this community*

## Relationships

- [Snowflake Story Domain](Snowflake_Story_Domain.md) (10 shared connections)
- [Database & Connection Management](Database_&_Connection_Management.md) (1 shared connections)

## Source Files

- `src-tauri/src/commands/export.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/novel.rs`
- `src-tauri/src/commands/project.rs`
- `src-tauri/src/commands/story.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/models.rs`

## Audit Trail

- EXTRACTED: 95 (80%)
- INFERRED: 24 (20%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*