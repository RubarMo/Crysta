use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::Manager;

pub struct DbState {
    pub current_db_path: Mutex<Option<PathBuf>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Novel {
    pub id: Option<i64>,
    pub title: String,
    pub genre: String,
    pub target_audience: String,
    pub target_word_count: i64,
    pub current_word_count: i64,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StepProgress {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub step_number: i64,
    pub content_text: String,
    pub is_completed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Character {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub name: String,
    #[serde(default)]
    pub one_sentence_summary: String,
    pub motivation: String,
    pub goal: String,
    pub conflict: String,
    pub epiphany: String,
    pub one_paragraph_summary: String,
    pub full_synopsis: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Scene {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub pov_character_id: Option<i64>,
    pub setting: String,
    pub plot_thread: String,
    pub what_happens: String,
    #[serde(default)]
    pub narrative_outline: String,
    pub expected_word_count: i64,
    pub actual_word_count: i64,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub title: String,
    pub content: String,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BookFormatConfig {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub has_title_page: bool,
    pub subtitle: String,
    pub author_name: String,
    pub publisher_name: String,
    pub has_copyright_page: bool,
    pub copyright_year: String,
    pub isbn: String,
    pub edition_notice: String,
    pub has_dedication: bool,
    pub dedication_text: String,
    pub has_epigraph: bool,
    pub epigraph_quote: String,
    pub epigraph_author: String,
    pub has_table_of_contents: bool,
    pub has_foreword: bool,
    pub foreword_title: String,
    pub foreword_content: String,
    pub has_epilogue: bool,
    pub epilogue_title: String,
    pub epilogue_content: String,
    pub has_acknowledgments: bool,
    pub acknowledgments_content: String,
    pub has_about_author: bool,
    pub about_author_bio: String,
    pub preset_theme: String,
    pub trim_size: String,
    pub font_family: String,
    pub font_size: f64,
    pub line_spacing: f64,
    pub first_line_indent: bool,
    pub first_paragraph_drop_cap: bool,
    pub chapter_numbering_style: String,
    pub scene_break_ornament: String,
    pub header_verso: String,
    pub header_recto: String,
    pub include_page_numbers: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SnapshotInfo {
    pub file_path: String,
    pub file_name: String,
    pub timestamp: String,
    pub file_size_bytes: u64,
    pub custom_label: Option<String>,
    pub is_manual: bool,
}

// Helper to get SQLite connection from state
fn get_db_conn(state: &tauri::State<'_, DbState>) -> Result<Connection, String> {
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
    
    Ok(conn)
}

fn count_words(text: &str) -> i64 {
    text.split_whitespace().count() as i64
}

// Helper to update novel word count based on chapters or scene sums
fn update_novel_word_count(conn: &Connection, novel_id: i64) -> Result<(), rusqlite::Error> {
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

// Native Dialog and Project Lifecycle Commands
#[tauri::command]
fn select_project_file() -> Result<Option<String>, String> {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let file = rfd::FileDialog::new()
            .add_filter("Crysta Project (*.crysta)", &["crysta"])
            .add_filter("Snowflake Project (*.snowflake)", &["snowflake"])
            .add_filter("SQLite Database (*.db)", &["db"])
            .pick_file();
        Ok(file.map(|p| p.to_string_lossy().to_string()))
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        Ok(None)
    }
}

#[tauri::command]
fn create_project_file(default_name: String) -> Result<Option<String>, String> {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let file = rfd::FileDialog::new()
            .add_filter("Crysta Project (*.crysta)", &["crysta"])
            .add_filter("Snowflake Project (*.snowflake)", &["snowflake"])
            .add_filter("SQLite Database (*.db)", &["db"])
            .set_file_name(&default_name)
            .save_file();
        Ok(file.map(|p| p.to_string_lossy().to_string()))
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        Ok(Some(default_name))
    }
}

#[tauri::command]
fn list_project_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        if !app_dir.exists() {
            return Ok(vec![]);
        }
        let mut files = vec![];
        for entry in std::fs::read_dir(app_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if ext_str == "crysta" || ext_str == "snowflake" || ext_str == "db" {
                        if let Some(name) = path.file_name() {
                            files.push(name.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
        Ok(files)
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _app = app;
        Ok(vec![])
    }
}

#[tauri::command]
#[allow(unused_variables, unused_mut)]
fn open_project(app: tauri::AppHandle, state: tauri::State<'_, DbState>, path: String) -> Result<Novel, String> {
    let mut path_buf = std::path::PathBuf::from(&path);
    
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        if !path_buf.is_absolute() {
            let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
            path_buf = app_dir.join(path_buf);
        }
    }
    
    // Set the path in state
    {
        let mut path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
        *path_guard = Some(path_buf.clone());
    }
    
    // Open connection to test and migrate
    let conn = get_db_conn(&state)?;
    
    // Check if a novel record exists. If not, create a default one!
    let mut stmt = conn.prepare("SELECT count(*) FROM novels").map_err(|e| e.to_string())?;
    let count: i64 = stmt.query_row([], |row| row.get(0)).map_err(|e| e.to_string())?;
    
    if count == 0 {
        let default_title = path_buf
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("رواية جديدة");
        // Insert default novel
        conn.execute(
            "INSERT INTO novels (title, genre, target_audience, target_word_count, current_word_count) VALUES (?, ?, ?, ?, ?)",
            params![default_title, "عام", "كافة القراء", 50000, 0],
        ).map_err(|e| e.to_string())?;
    }
    
    // Load the active novel (there should only be one in the project database)
    let mut stmt = conn.prepare("SELECT id, title, genre, target_audience, target_word_count, current_word_count, created_at FROM novels LIMIT 1")
        .map_err(|e| e.to_string())?;
        
    let novel = stmt.query_row([], |row| {
        Ok(Novel {
            id: Some(row.get(0)?),
            title: row.get(1)?,
            genre: row.get(2)?,
            target_audience: row.get(3)?,
            target_word_count: row.get(4)?,
            current_word_count: row.get(5)?,
            created_at: Some(row.get(6)?),
        })
    }).map_err(|e| e.to_string())?;
    
    Ok(novel)
}

#[tauri::command]
fn close_project(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    *path_guard = None;
    Ok(())
}

// NOVELS CRUD COMMANDS
#[tauri::command]
fn get_novels(state: tauri::State<'_, DbState>) -> Result<Vec<Novel>, String> {
    let conn = get_db_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, title, genre, target_audience, target_word_count, current_word_count, created_at FROM novels ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
        
    let novel_iter = stmt
        .query_map([], |row| {
            Ok(Novel {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                genre: row.get(2)?,
                target_audience: row.get(3)?,
                target_word_count: row.get(4)?,
                current_word_count: row.get(5)?,
                created_at: Some(row.get(6)?),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut novels = Vec::new();
    for novel in novel_iter {
        novels.push(novel.map_err(|e| e.to_string())?);
    }
    Ok(novels)
}

#[tauri::command]
fn create_novel(
    state: tauri::State<'_, DbState>,
    title: String,
    genre: String,
    target_audience: String,
    target_word_count: i64,
) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;
    conn.execute(
        "INSERT INTO novels (title, genre, target_audience, target_word_count, current_word_count) VALUES (?, ?, ?, ?, 0)",
        params![title, genre, target_audience, target_word_count],
    )
    .map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    Ok(id)
}

#[tauri::command]
fn update_novel(
    state: tauri::State<'_, DbState>,
    id: i64,
    title: String,
    genre: String,
    target_audience: String,
    target_word_count: i64,
) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute(
        "UPDATE novels SET title = ?, genre = ?, target_audience = ?, target_word_count = ? WHERE id = ?",
        params![title, genre, target_audience, target_word_count, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_novel(state: tauri::State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM novels WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// STEPS PROGRESS CRUD COMMANDS
#[tauri::command]
fn get_steps_progress(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<StepProgress>, String> {
    let conn = get_db_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, step_number, content_text, is_completed FROM steps_progress WHERE novel_id = ?")
        .map_err(|e| e.to_string())?;
        
    let step_iter = stmt
        .query_map(params![novel_id], |row| {
            let is_comp_val: i64 = row.get(4)?;
            Ok(StepProgress {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                step_number: row.get(2)?,
                content_text: row.get(3)?,
                is_completed: is_comp_val != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for step in step_iter {
        list.push(step.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
fn save_step_progress(state: tauri::State<'_, DbState>, progress: StepProgress) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    let is_completed_val = if progress.is_completed { 1 } else { 0 };
    
    conn.execute(
        "INSERT OR REPLACE INTO steps_progress (novel_id, step_number, content_text, is_completed) VALUES (?, ?, ?, ?)",
        params![progress.novel_id, progress.step_number, progress.content_text, is_completed_val],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// CHARACTERS CRUD COMMANDS
#[tauri::command]
fn get_characters(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<Character>, String> {
    let conn = get_db_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, name, one_sentence_summary, motivation, goal, conflict, epiphany, one_paragraph_summary, full_synopsis FROM characters WHERE novel_id = ?")
        .map_err(|e| e.to_string())?;
        
    let char_iter = stmt
        .query_map(params![novel_id], |row| {
            Ok(Character {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                name: row.get(2)?,
                one_sentence_summary: row.get(3).unwrap_or_default(),
                motivation: row.get(4).unwrap_or_default(),
                goal: row.get(5).unwrap_or_default(),
                conflict: row.get(6).unwrap_or_default(),
                epiphany: row.get(7).unwrap_or_default(),
                one_paragraph_summary: row.get(8).unwrap_or_default(),
                full_synopsis: row.get(9).unwrap_or_default(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for character in char_iter {
        list.push(character.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
fn save_character(state: tauri::State<'_, DbState>, character: Character) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;
    if let Some(id) = character.id {
        conn.execute(
            "UPDATE characters SET name = ?, one_sentence_summary = ?, motivation = ?, goal = ?, conflict = ?, epiphany = ?, one_paragraph_summary = ?, full_synopsis = ? WHERE id = ? AND novel_id = ?",
            params![
                character.name,
                character.one_sentence_summary,
                character.motivation,
                character.goal,
                character.conflict,
                character.epiphany,
                character.one_paragraph_summary,
                character.full_synopsis,
                id,
                character.novel_id
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO characters (novel_id, name, one_sentence_summary, motivation, goal, conflict, epiphany, one_paragraph_summary, full_synopsis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                character.novel_id,
                character.name,
                character.one_sentence_summary,
                character.motivation,
                character.goal,
                character.conflict,
                character.epiphany,
                character.one_paragraph_summary,
                character.full_synopsis
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }
}

#[tauri::command]
fn delete_character(state: tauri::State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM characters WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// SCENES CRUD COMMANDS
#[tauri::command]
fn get_scenes(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<Scene>, String> {
    let conn = get_db_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, pov_character_id, setting, plot_thread, what_happens, narrative_outline, expected_word_count, actual_word_count, sort_order FROM scenes WHERE novel_id = ? ORDER BY sort_order ASC, id ASC")
        .map_err(|e| e.to_string())?;
        
    let scene_iter = stmt
        .query_map(params![novel_id], |row| {
            Ok(Scene {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                pov_character_id: row.get(2).ok(),
                setting: row.get(3).unwrap_or_default(),
                plot_thread: row.get(4).unwrap_or_default(),
                what_happens: row.get(5).unwrap_or_default(),
                narrative_outline: row.get(6).unwrap_or_default(),
                expected_word_count: row.get(7)?,
                actual_word_count: row.get(8)?,
                sort_order: row.get(9).ok(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for scene in scene_iter {
        list.push(scene.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
fn save_scene(state: tauri::State<'_, DbState>, scene: Scene) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;

    let id = if let Some(sid) = scene.id {
        let sort_order_val = scene.sort_order.unwrap_or(0);
        conn.execute(
            "UPDATE scenes SET pov_character_id = ?, setting = ?, plot_thread = ?, what_happens = ?, narrative_outline = ?, expected_word_count = ?, actual_word_count = ?, sort_order = ? WHERE id = ? AND novel_id = ?",
            params![
                scene.pov_character_id,
                scene.setting,
                scene.plot_thread,
                scene.what_happens,
                scene.narrative_outline,
                scene.expected_word_count,
                scene.actual_word_count,
                sort_order_val,
                sid,
                scene.novel_id
            ],
        )
        .map_err(|e| e.to_string())?;
        sid
    } else {
        let sort_order_val = match scene.sort_order {
            Some(s) if s > 0 => s,
            _ => {
                let max_order: i64 = conn.query_row(
                    "SELECT COALESCE(MAX(sort_order), -1) FROM scenes WHERE novel_id = ?",
                    params![scene.novel_id],
                    |row| row.get(0),
                ).unwrap_or(-1);
                max_order + 1
            }
        };
        conn.execute(
            "INSERT INTO scenes (novel_id, pov_character_id, setting, plot_thread, what_happens, narrative_outline, expected_word_count, actual_word_count, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                scene.novel_id,
                scene.pov_character_id,
                scene.setting,
                scene.plot_thread,
                scene.what_happens,
                scene.narrative_outline,
                scene.expected_word_count,
                scene.actual_word_count,
                sort_order_val
            ],
        )
        .map_err(|e| e.to_string())?;
        conn.last_insert_rowid()
    };
    
    // Recalculate and update the main novel's aggregate word count
    let _ = update_novel_word_count(&conn, scene.novel_id);
    
    Ok(id)
}

#[tauri::command]
fn delete_scene(state: tauri::State<'_, DbState>, id: i64, novel_id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM scenes WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
        
    // Recalculate and update the main novel's aggregate word count
    let _ = update_novel_word_count(&conn, novel_id);
    Ok(())
}

#[tauri::command]
fn reorder_scenes(state: tauri::State<'_, DbState>, novel_id: i64, scene_ids: Vec<i64>) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    for (index, id) in scene_ids.iter().enumerate() {
        conn.execute(
            "UPDATE scenes SET sort_order = ? WHERE id = ? AND novel_id = ?",
            params![index as i64, id, novel_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// CHAPTERS CRUD COMMANDS
#[tauri::command]
fn get_chapters(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<Chapter>, String> {
    let conn = get_db_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, title, content, sort_order FROM chapters WHERE novel_id = ? ORDER BY sort_order ASC, id ASC")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt
        .query_map(params![novel_id], |row| {
            Ok(Chapter {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                sort_order: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for item in iter {
        list.push(item.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
fn save_chapter(state: tauri::State<'_, DbState>, chapter: Chapter) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;
    let id = if let Some(cid) = chapter.id {
        conn.execute(
            "UPDATE chapters SET title = ?, content = ?, sort_order = ? WHERE id = ? AND novel_id = ?",
            params![chapter.title, chapter.content, chapter.sort_order, cid, chapter.novel_id],
        )
        .map_err(|e| e.to_string())?;
        cid
    } else {
        let next_order: i64 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM chapters WHERE novel_id = ?",
            params![chapter.novel_id],
            |row| row.get(0),
        ).unwrap_or(0);
        let sort_order = if chapter.sort_order == 0 { next_order } else { chapter.sort_order };

        conn.execute(
            "INSERT INTO chapters (novel_id, title, content, sort_order) VALUES (?, ?, ?, ?)",
            params![chapter.novel_id, chapter.title, chapter.content, sort_order],
        )
        .map_err(|e| e.to_string())?;
        conn.last_insert_rowid()
    };

    let _ = update_novel_word_count(&conn, chapter.novel_id);
    Ok(id)
}

#[tauri::command]
fn delete_chapter(state: tauri::State<'_, DbState>, id: i64, novel_id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM chapters WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    let _ = update_novel_word_count(&conn, novel_id);
    Ok(())
}

#[tauri::command]
fn reorder_chapters(state: tauri::State<'_, DbState>, novel_id: i64, chapter_ids: Vec<i64>) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    for (index, id) in chapter_ids.iter().enumerate() {
        conn.execute(
            "UPDATE chapters SET sort_order = ? WHERE id = ? AND novel_id = ?",
            params![index as i64, id, novel_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// BOOK FORMATTING CRUD
#[tauri::command]
fn get_book_formatting(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<BookFormatConfig, String> {
    let conn = get_db_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, has_title_page, subtitle, author_name, publisher_name, has_copyright_page, copyright_year, isbn, edition_notice, has_dedication, dedication_text, has_epigraph, epigraph_quote, epigraph_author, has_table_of_contents, has_foreword, foreword_title, foreword_content, has_epilogue, epilogue_title, epilogue_content, has_acknowledgments, acknowledgments_content, has_about_author, about_author_bio, preset_theme, trim_size, font_family, font_size, line_spacing, first_line_indent, first_paragraph_drop_cap, chapter_numbering_style, scene_break_ornament, header_verso, header_recto, include_page_numbers FROM book_formatting WHERE novel_id = ? LIMIT 1")
        .map_err(|e| e.to_string())?;

    let res = stmt.query_row(params![novel_id], |row| {
        Ok(BookFormatConfig {
            id: Some(row.get(0)?),
            novel_id: row.get(1)?,
            has_title_page: row.get::<_, i64>(2)? != 0,
            subtitle: row.get(3)?,
            author_name: row.get(4)?,
            publisher_name: row.get(5)?,
            has_copyright_page: row.get::<_, i64>(6)? != 0,
            copyright_year: row.get(7)?,
            isbn: row.get(8)?,
            edition_notice: row.get(9)?,
            has_dedication: row.get::<_, i64>(10)? != 0,
            dedication_text: row.get(11)?,
            has_epigraph: row.get::<_, i64>(12)? != 0,
            epigraph_quote: row.get(13)?,
            epigraph_author: row.get(14)?,
            has_table_of_contents: row.get::<_, i64>(15)? != 0,
            has_foreword: row.get::<_, i64>(16)? != 0,
            foreword_title: row.get(17)?,
            foreword_content: row.get(18)?,
            has_epilogue: row.get::<_, i64>(19)? != 0,
            epilogue_title: row.get(20)?,
            epilogue_content: row.get(21)?,
            has_acknowledgments: row.get::<_, i64>(22)? != 0,
            acknowledgments_content: row.get(23)?,
            has_about_author: row.get::<_, i64>(24)? != 0,
            about_author_bio: row.get(25)?,
            preset_theme: row.get(26)?,
            trim_size: row.get(27)?,
            font_family: row.get(28)?,
            font_size: row.get(29)?,
            line_spacing: row.get(30)?,
            first_line_indent: row.get::<_, i64>(31)? != 0,
            first_paragraph_drop_cap: row.get::<_, i64>(32)? != 0,
            chapter_numbering_style: row.get(33)?,
            scene_break_ornament: row.get(34)?,
            header_verso: row.get(35)?,
            header_recto: row.get(36)?,
            include_page_numbers: row.get::<_, i64>(37)? != 0,
        })
    });

    match res {
        Ok(cfg) => Ok(cfg),
        Err(_) => {
            Ok(BookFormatConfig {
                id: None,
                novel_id,
                has_title_page: true,
                subtitle: "".into(),
                author_name: "".into(),
                publisher_name: "".into(),
                has_copyright_page: true,
                copyright_year: "2026".into(),
                isbn: "".into(),
                edition_notice: "First Edition".into(),
                has_dedication: false,
                dedication_text: "".into(),
                has_epigraph: false,
                epigraph_quote: "".into(),
                epigraph_author: "".into(),
                has_table_of_contents: true,
                has_foreword: false,
                foreword_title: "Foreword".into(),
                foreword_content: "".into(),
                has_epilogue: false,
                epilogue_title: "Epilogue".into(),
                epilogue_content: "".into(),
                has_acknowledgments: false,
                acknowledgments_content: "".into(),
                has_about_author: false,
                about_author_bio: "".into(),
                preset_theme: "classic".into(),
                trim_size: "us_trade_6x9".into(),
                font_family: "Garamond".into(),
                font_size: 11.0,
                line_spacing: 1.3,
                first_line_indent: true,
                first_paragraph_drop_cap: false,
                chapter_numbering_style: "number_title".into(),
                scene_break_ornament: "* * *".into(),
                header_verso: "title".into(),
                header_recto: "chapter".into(),
                include_page_numbers: true,
            })
        }
    }
}

#[tauri::command]
fn save_book_formatting(state: tauri::State<'_, DbState>, config: BookFormatConfig) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;
    
    let existing_id: Option<i64> = conn.query_row(
        "SELECT id FROM book_formatting WHERE novel_id = ?",
        params![config.novel_id],
        |row| row.get(0),
    ).ok();

    if let Some(id) = existing_id {
        conn.execute(
            "UPDATE book_formatting SET has_title_page = ?, subtitle = ?, author_name = ?, publisher_name = ?, has_copyright_page = ?, copyright_year = ?, isbn = ?, edition_notice = ?, has_dedication = ?, dedication_text = ?, has_epigraph = ?, epigraph_quote = ?, epigraph_author = ?, has_table_of_contents = ?, has_foreword = ?, foreword_title = ?, foreword_content = ?, has_epilogue = ?, epilogue_title = ?, epilogue_content = ?, has_acknowledgments = ?, acknowledgments_content = ?, has_about_author = ?, about_author_bio = ?, preset_theme = ?, trim_size = ?, font_family = ?, font_size = ?, line_spacing = ?, first_line_indent = ?, first_paragraph_drop_cap = ?, chapter_numbering_style = ?, scene_break_ornament = ?, header_verso = ?, header_recto = ?, include_page_numbers = ? WHERE id = ?",
            params![
                if config.has_title_page { 1 } else { 0 },
                config.subtitle,
                config.author_name,
                config.publisher_name,
                if config.has_copyright_page { 1 } else { 0 },
                config.copyright_year,
                config.isbn,
                config.edition_notice,
                if config.has_dedication { 1 } else { 0 },
                config.dedication_text,
                if config.has_epigraph { 1 } else { 0 },
                config.epigraph_quote,
                config.epigraph_author,
                if config.has_table_of_contents { 1 } else { 0 },
                if config.has_foreword { 1 } else { 0 },
                config.foreword_title,
                config.foreword_content,
                if config.has_epilogue { 1 } else { 0 },
                config.epilogue_title,
                config.epilogue_content,
                if config.has_acknowledgments { 1 } else { 0 },
                config.acknowledgments_content,
                if config.has_about_author { 1 } else { 0 },
                config.about_author_bio,
                config.preset_theme,
                config.trim_size,
                config.font_family,
                config.font_size,
                config.line_spacing,
                if config.first_line_indent { 1 } else { 0 },
                if config.first_paragraph_drop_cap { 1 } else { 0 },
                config.chapter_numbering_style,
                config.scene_break_ornament,
                config.header_verso,
                config.header_recto,
                if config.include_page_numbers { 1 } else { 0 },
                id
            ],
        ).map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO book_formatting (novel_id, has_title_page, subtitle, author_name, publisher_name, has_copyright_page, copyright_year, isbn, edition_notice, has_dedication, dedication_text, has_epigraph, epigraph_quote, epigraph_author, has_table_of_contents, has_foreword, foreword_title, foreword_content, has_epilogue, epilogue_title, epilogue_content, has_acknowledgments, acknowledgments_content, has_about_author, about_author_bio, preset_theme, trim_size, font_family, font_size, line_spacing, first_line_indent, first_paragraph_drop_cap, chapter_numbering_style, scene_break_ornament, header_verso, header_recto, include_page_numbers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                config.novel_id,
                if config.has_title_page { 1 } else { 0 },
                config.subtitle,
                config.author_name,
                config.publisher_name,
                if config.has_copyright_page { 1 } else { 0 },
                config.copyright_year,
                config.isbn,
                config.edition_notice,
                if config.has_dedication { 1 } else { 0 },
                config.dedication_text,
                if config.has_epigraph { 1 } else { 0 },
                config.epigraph_quote,
                config.epigraph_author,
                if config.has_table_of_contents { 1 } else { 0 },
                if config.has_foreword { 1 } else { 0 },
                config.foreword_title,
                config.foreword_content,
                if config.has_epilogue { 1 } else { 0 },
                config.epilogue_title,
                config.epilogue_content,
                if config.has_acknowledgments { 1 } else { 0 },
                config.acknowledgments_content,
                if config.has_about_author { 1 } else { 0 },
                config.about_author_bio,
                config.preset_theme,
                config.trim_size,
                config.font_family,
                config.font_size,
                config.line_spacing,
                if config.first_line_indent { 1 } else { 0 },
                if config.first_paragraph_drop_cap { 1 } else { 0 },
                config.chapter_numbering_style,
                config.scene_break_ornament,
                config.header_verso,
                config.header_recto,
                if config.include_page_numbers { 1 } else { 0 }
            ],
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }
}

// BACKUPS & SNAPSHOT COMMANDS
fn get_backup_dir(db_path: &std::path::Path) -> std::path::PathBuf {
    let parent = db_path.parent().unwrap_or(std::path::Path::new("."));
    let stem = db_path.file_stem().and_then(|s| s.to_str()).unwrap_or("project");
    parent.join(format!("{}_backups", stem))
}

#[tauri::command]
fn take_snapshot(state: tauri::State<'_, DbState>, custom_label: Option<String>, is_manual: bool) -> Result<SnapshotInfo, String> {
    let path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    let db_path = path_guard.as_ref().ok_or("No active project loaded")?;
    
    let backup_dir = get_backup_dir(db_path);
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    
    let now = std::time::SystemTime::now();
    let since_epoch = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
    let tag = if is_manual { "manual" } else { "auto" };
    let safe_label = match &custom_label {
        Some(lbl) if !lbl.trim().is_empty() => format!("_{}", lbl.trim().replace([' ', '/', '\\', ':'], "_")),
        _ => "".to_string(),
    };
    
    let file_name = format!("snapshot_{}_{}{}.crysta.bak", since_epoch, tag, safe_label);
    let target_path = backup_dir.join(&file_name);
    
    std::fs::copy(db_path, &target_path).map_err(|e| e.to_string())?;
    let metadata = std::fs::metadata(&target_path).map_err(|e| e.to_string())?;
    
    Ok(SnapshotInfo {
        file_path: target_path.to_string_lossy().to_string(),
        file_name,
        timestamp: since_epoch.to_string(),
        file_size_bytes: metadata.len(),
        custom_label,
        is_manual,
    })
}

#[tauri::command]
fn list_snapshots(state: tauri::State<'_, DbState>) -> Result<Vec<SnapshotInfo>, String> {
    let path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    let db_path = path_guard.as_ref().ok_or("No active project loaded")?;
    
    let backup_dir = get_backup_dir(db_path);
    if !backup_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut snapshots = Vec::new();
    for entry in std::fs::read_dir(&backup_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "bak") {
            let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let is_manual = file_name.contains("_manual");
            
            let label = if is_manual {
                if let Some(idx) = file_name.find("_manual_") {
                    let rest = &file_name[idx + 8..];
                    Some(rest.trim_end_matches(".crysta.bak").replace('_', " "))
                } else {
                    None
                }
            } else {
                None
            };
            
            let modified = metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            let ts = modified.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
            
            snapshots.push(SnapshotInfo {
                file_path: path.to_string_lossy().to_string(),
                file_name,
                timestamp: ts.to_string(),
                file_size_bytes: metadata.len(),
                custom_label: label,
                is_manual,
            });
        }
    }
    
    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(snapshots)
}

#[tauri::command]
fn restore_snapshot(state: tauri::State<'_, DbState>, snapshot_path: String) -> Result<(), String> {
    let path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    let db_path = path_guard.as_ref().ok_or("No active project loaded")?;
    
    let snap = PathBuf::from(&snapshot_path);
    if !snap.exists() {
        return Err("Snapshot file does not exist".into());
    }
    
    let safety_path = format!("{}.pre_restore_bak", db_path.to_string_lossy());
    let _ = std::fs::copy(db_path, safety_path);
    
    std::fs::copy(&snap, db_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_snapshot(snapshot_path: String) -> Result<(), String> {
    let snap = PathBuf::from(&snapshot_path);
    if snap.exists() {
        std::fs::remove_file(snap).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_backups_directory(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    let db_path = path_guard.as_ref().ok_or("No active project loaded")?;
    
    let backup_dir = get_backup_dir(db_path);
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(&backup_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&backup_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&backup_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(DbState {
            current_db_path: Mutex::new(None),
        })
        .setup(|app| {
            #[cfg(desktop)]
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.set_min_size(Some(tauri::LogicalSize::new(1080.0, 650.0)));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_project_file,
            create_project_file,
            list_project_files,
            open_project,
            close_project,
            get_novels,
            create_novel,
            update_novel,
            delete_novel,
            get_steps_progress,
            save_step_progress,
            get_characters,
            save_character,
            delete_character,
            get_scenes,
            save_scene,
            delete_scene,
            reorder_scenes,
            get_chapters,
            save_chapter,
            delete_chapter,
            reorder_chapters,
            get_book_formatting,
            save_book_formatting,
            take_snapshot,
            list_snapshots,
            restore_snapshot,
            delete_snapshot,
            open_backups_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
