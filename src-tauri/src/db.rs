use rusqlite::{params, Connection};
use std::ops::{Deref, DerefMut};
use std::path::Path;
use std::sync::MutexGuard;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::models::{DbState, OpenProject};

/// Bump this and add a step to `migrate` whenever the schema changes.
pub const SCHEMA_VERSION: i64 = 2;

/// Exclusive access to the open project for the duration of one command.
/// Derefs to the project's `Connection`.
pub struct ProjectGuard<'a>(MutexGuard<'a, Option<OpenProject>>);

impl ProjectGuard<'_> {
    pub fn path(&self) -> &Path {
        &self.0.as_ref().expect("guard always holds a project").path
    }
}

impl Deref for ProjectGuard<'_> {
    type Target = Connection;
    fn deref(&self) -> &Connection {
        &self.0.as_ref().expect("guard always holds a project").conn
    }
}

impl DerefMut for ProjectGuard<'_> {
    fn deref_mut(&mut self) -> &mut Connection {
        &mut self.0.as_mut().expect("guard always holds a project").conn
    }
}

pub fn get_db_conn(state: &DbState) -> Result<ProjectGuard<'_>, String> {
    let guard = state.project.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        return Err("No active project loaded".into());
    }
    Ok(ProjectGuard(guard))
}

/// Opens a project file and brings its schema up to date.
/// When `create` is false the file must already exist, so a moved or deleted
/// project is reported instead of silently replaced by an empty one.
pub fn open_project_db(path: &Path, create: bool) -> Result<Connection, String> {
    if !create && !path.exists() {
        return Err(format!("Project file not found: {}", path.display()));
    }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.pragma_update(None, "foreign_keys", "ON").map_err(|e| e.to_string())?;
    conn.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e| e.to_string())?;
    migrate(&conn)?;
    Ok(conn)
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, rusqlite::Error> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let names = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for name in names {
        if name? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn add_column_if_missing(conn: &Connection, table: &str, column: &str, definition: &str) -> Result<(), rusqlite::Error> {
    if !column_exists(conn, table, column)? {
        conn.execute(&format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, definition), [])?;
    }
    Ok(())
}

pub fn migrate(conn: &Connection) -> Result<(), String> {
    let version: i64 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if version > SCHEMA_VERSION {
        return Err("This project was saved by a newer version of Crysta. Please update the app to open it.".into());
    }

    if version == 0 {
        // Refuse to add Crysta tables to an unrelated SQLite database.
        let table_count: i64 = conn
            .query_row("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let has_novels: i64 = conn
            .query_row("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'novels'", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        if table_count > 0 && has_novels == 0 {
            return Err("This file is not a Crysta project.".into());
        }
    }

    let run = |sql_version: i64, step: &dyn Fn(&Connection) -> Result<(), rusqlite::Error>| -> Result<(), String> {
        if version >= sql_version {
            return Ok(());
        }
        conn.execute_batch("BEGIN").map_err(|e| e.to_string())?;
        let result = step(conn).and_then(|_| conn.pragma_update(None, "user_version", sql_version));
        match result {
            Ok(()) => conn.execute_batch("COMMIT").map_err(|e| e.to_string()),
            Err(e) => {
                let _ = conn.execute_batch("ROLLBACK");
                Err(format!("Failed to upgrade project file: {}", e))
            }
        }
    };

    // v1: base schema. Older (unversioned) projects already have some of these
    // tables, so everything is idempotent and missing columns are added.
    run(1, &|conn| {
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS novels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                genre TEXT NOT NULL,
                target_audience TEXT,
                target_word_count INTEGER DEFAULT 0,
                current_word_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS steps_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                step_number INTEGER NOT NULL,
                content_text TEXT NOT NULL,
                is_completed INTEGER DEFAULT 0,
                FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE,
                UNIQUE(novel_id, step_number)
            );
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                one_sentence_summary TEXT DEFAULT '',
                motivation TEXT,
                goal TEXT,
                conflict TEXT,
                epiphany TEXT,
                one_paragraph_summary TEXT,
                full_synopsis TEXT,
                FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS scenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                pov_character_id INTEGER,
                setting TEXT,
                plot_thread TEXT,
                what_happens TEXT,
                narrative_outline TEXT DEFAULT '',
                expected_word_count INTEGER DEFAULT 0,
                actual_word_count INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE,
                FOREIGN KEY (pov_character_id) REFERENCES characters (id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS chapters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS book_formatting (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                has_title_page INTEGER NOT NULL DEFAULT 1,
                subtitle TEXT NOT NULL DEFAULT '',
                author_name TEXT NOT NULL DEFAULT '',
                publisher_name TEXT NOT NULL DEFAULT '',
                has_copyright_page INTEGER NOT NULL DEFAULT 1,
                copyright_year TEXT NOT NULL DEFAULT '',
                isbn TEXT NOT NULL DEFAULT '',
                edition_notice TEXT NOT NULL DEFAULT 'First Edition',
                has_dedication INTEGER NOT NULL DEFAULT 0,
                dedication_text TEXT NOT NULL DEFAULT '',
                has_epigraph INTEGER NOT NULL DEFAULT 0,
                epigraph_quote TEXT NOT NULL DEFAULT '',
                epigraph_author TEXT NOT NULL DEFAULT '',
                has_table_of_contents INTEGER NOT NULL DEFAULT 1,
                has_foreword INTEGER NOT NULL DEFAULT 0,
                foreword_title TEXT NOT NULL DEFAULT 'Foreword',
                foreword_content TEXT NOT NULL DEFAULT '',
                has_epilogue INTEGER NOT NULL DEFAULT 0,
                epilogue_title TEXT NOT NULL DEFAULT 'Epilogue',
                epilogue_content TEXT NOT NULL DEFAULT '',
                has_acknowledgments INTEGER NOT NULL DEFAULT 0,
                acknowledgments_content TEXT NOT NULL DEFAULT '',
                has_about_author INTEGER NOT NULL DEFAULT 0,
                about_author_bio TEXT NOT NULL DEFAULT '',
                preset_theme TEXT NOT NULL DEFAULT 'classic',
                trim_size TEXT NOT NULL DEFAULT 'us_trade_6x9',
                font_family TEXT NOT NULL DEFAULT 'Garamond',
                font_size REAL NOT NULL DEFAULT 11.0,
                line_spacing REAL NOT NULL DEFAULT 1.3,
                first_line_indent INTEGER NOT NULL DEFAULT 1,
                first_paragraph_drop_cap INTEGER NOT NULL DEFAULT 0,
                chapter_numbering_style TEXT NOT NULL DEFAULT 'number_title',
                scene_break_ornament TEXT NOT NULL DEFAULT '* * *',
                header_verso TEXT NOT NULL DEFAULT 'title',
                header_recto TEXT NOT NULL DEFAULT 'chapter',
                include_page_numbers INTEGER NOT NULL DEFAULT 1,
                cover_image TEXT DEFAULT '',
                FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
            );
        ")?;
        add_column_if_missing(conn, "scenes", "sort_order", "INTEGER DEFAULT 0")?;
        add_column_if_missing(conn, "scenes", "narrative_outline", "TEXT DEFAULT ''")?;
        add_column_if_missing(conn, "characters", "one_sentence_summary", "TEXT DEFAULT ''")?;
        add_column_if_missing(conn, "book_formatting", "cover_image", "TEXT DEFAULT ''")?;
        Ok(())
    })?;

    // v2: per-book language, which decides the text direction of exports.
    run(2, &|conn| add_column_if_missing(conn, "book_formatting", "book_language", "TEXT NOT NULL DEFAULT ''"))?;

    Ok(())
}

pub fn count_words(text: &str) -> i64 {
    text.split_whitespace().count() as i64
}

/// Recalculates the novel's stored word count from its chapters.
pub fn update_novel_word_count(conn: &Connection, novel_id: i64) -> Result<(), rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT content FROM chapters WHERE novel_id = ?")?;
    let rows = stmt.query_map(params![novel_id], |row| row.get::<_, String>(0))?;
    let mut total_words = 0;
    for content in rows {
        total_words += count_words(&content?);
    }

    conn.execute(
        "UPDATE novels SET current_word_count = ? WHERE id = ?;",
        params![total_words, novel_id],
    )?;
    Ok(())
}

pub fn unix_now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

/// Gregorian year for a count of days since 1970-01-01 (Howard Hinnant's civil_from_days).
pub fn year_from_days(days: i64) -> i64 {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400;
    if month <= 2 { year + 1 } else { year }
}

pub fn current_year() -> i64 {
    year_from_days((unix_now() / 86_400) as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_words() {
        assert_eq!(count_words(""), 0);
        assert_eq!(count_words("hello world"), 2);
        assert_eq!(count_words("   one   two   three   "), 3);
        assert_eq!(count_words("مرحبا بك في كريستا"), 4);
    }

    #[test]
    fn test_year_from_days() {
        assert_eq!(year_from_days(0), 1970);
        assert_eq!(year_from_days(364), 1970);
        assert_eq!(year_from_days(365), 1971);
        assert_eq!(year_from_days(19_723), 2024);
        assert_eq!(year_from_days(19_722), 2023);
    }

    #[test]
    fn test_migrate_fresh_database() {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        let version: i64 = conn.pragma_query_value(None, "user_version", |r| r.get(0)).unwrap();
        assert_eq!(version, SCHEMA_VERSION);
        assert!(column_exists(&conn, "book_formatting", "book_language").unwrap());
        // Running again is a no-op.
        migrate(&conn).unwrap();
    }

    #[test]
    fn test_migrate_legacy_database_adds_missing_columns() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("
            CREATE TABLE novels (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, genre TEXT NOT NULL, target_audience TEXT, target_word_count INTEGER DEFAULT 0, current_word_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE scenes (id INTEGER PRIMARY KEY AUTOINCREMENT, novel_id INTEGER NOT NULL, pov_character_id INTEGER, setting TEXT, plot_thread TEXT, what_happens TEXT, expected_word_count INTEGER DEFAULT 0, actual_word_count INTEGER DEFAULT 0);
        ").unwrap();
        migrate(&conn).unwrap();
        assert!(column_exists(&conn, "scenes", "sort_order").unwrap());
        assert!(column_exists(&conn, "scenes", "narrative_outline").unwrap());
    }

    #[test]
    fn test_migrate_rejects_foreign_database() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE TABLE invoices (id INTEGER PRIMARY KEY);").unwrap();
        assert!(migrate(&conn).is_err());
    }

    #[test]
    fn test_migrate_rejects_newer_schema() {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "user_version", SCHEMA_VERSION + 1).unwrap();
        assert!(migrate(&conn).is_err());
    }
}
