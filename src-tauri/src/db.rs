use rusqlite::{params, Connection};
use crate::models::DbState;

pub fn get_db_conn(state: &tauri::State<'_, DbState>) -> Result<Connection, String> {
    let path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    let db_path = path_guard.as_ref().ok_or("No active project loaded")?;
    
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("PRAGMA foreign_keys = ON;", []).map_err(|e| e.to_string())?;
    
    // Ensure all tables exist immediately when connection is opened
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
            FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
        );
    ").map_err(|e| e.to_string())?;

    // Migration for scenes table if sort_order column does not exist
    let _ = conn.execute("ALTER TABLE scenes ADD COLUMN sort_order INTEGER DEFAULT 0;", []);
    // Migration for scenes table if narrative_outline column does not exist
    let _ = conn.execute("ALTER TABLE scenes ADD COLUMN narrative_outline TEXT DEFAULT '';", []);
    // Migration for characters table if one_sentence_summary column does not exist
    let _ = conn.execute("ALTER TABLE characters ADD COLUMN one_sentence_summary TEXT DEFAULT '';", []);
    // Migration for book_formatting table if cover_image column does not exist
    let _ = conn.execute("ALTER TABLE book_formatting ADD COLUMN cover_image TEXT DEFAULT '';", []);
    
    Ok(conn)
}

pub fn count_words(text: &str) -> i64 {
    text.split_whitespace().count() as i64
}

// Helper to update novel word count based on chapters or scene sums
pub fn update_novel_word_count(conn: &Connection, novel_id: i64) -> Result<(), rusqlite::Error> {
    let chapter_count: i64 = conn.query_row(
        "SELECT count(*) FROM chapters WHERE novel_id = ?",
        params![novel_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_words = if chapter_count > 0 {
        let mut stmt = conn.prepare("SELECT content FROM chapters WHERE novel_id = ?")?;
        let rows = stmt.query_map(params![novel_id], |row| row.get::<_, String>(0))?;
        let mut sum = 0;
        for r in rows.flatten() {
            sum += count_words(&r);
        }
        sum
    } else {
        conn.query_row(
            "SELECT COALESCE(SUM(actual_word_count), 0) FROM scenes WHERE novel_id = ?",
            params![novel_id],
            |row| row.get(0),
        ).unwrap_or(0)
    };

    conn.execute(
        "UPDATE novels SET current_word_count = ? WHERE id = ?;",
        params![total_words, novel_id],
    )?;
    Ok(())
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
}
