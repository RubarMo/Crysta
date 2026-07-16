use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection};
use std::sync::{Mutex, OnceLock};
use std::path::PathBuf;
use docx_rs::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Novel {
    pub id: Option<i64>,
    pub title: String,
    pub genre: String,
    pub target_audience: String,
    pub target_word_count: i64,
    pub current_word_count: i64,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepProgress {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub step_number: i64,
    pub content_text: String,
    pub is_completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub name: String,
    pub motivation: String,
    pub goal: String,
    pub conflict: String,
    pub epiphany: String,
    pub one_paragraph_summary: String,
    pub full_synopsis: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub pov_character_id: Option<i64>,
    pub setting: String,
    pub plot_thread: String,
    pub what_happens: String,
    pub expected_word_count: i64,
    pub actual_word_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub id: Option<i64>,
    pub novel_id: i64,
    pub title: String,
    pub content: String,
    pub sort_order: i64,
}

struct DbState {
    current_db_path: Mutex<Option<PathBuf>>,
}

static DB_STATE: OnceLock<DbState> = OnceLock::new();

fn get_state() -> &'static DbState {
    DB_STATE.get_or_init(|| DbState {
        current_db_path: Mutex::new(None),
    })
}

fn get_db_conn() -> Result<Connection, String> {
    let state = get_state();
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
            expected_word_count INTEGER DEFAULT 0,
            actual_word_count INTEGER DEFAULT 0,
            FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE,
            FOREIGN KEY (pov_character_id) REFERENCES characters (id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS novel_chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (novel_id) REFERENCES novels (id) ON DELETE CASCADE
        );
    ").map_err(|e| e.to_string())?;
    
    Ok(conn)
}

pub fn open_project(path: String) -> Result<Novel, String> {
    let path_buf = std::path::PathBuf::from(&path);
    
    // Ensure only .crysta files are supported
    if path_buf.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase() != "crysta" {
        return Err("Only .crysta files are supported".to_string());
    }
    
    // Set the path in state
    {
        let state = get_state();
        let mut path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
        *path_guard = Some(path_buf.clone());
    }
    
    // Open connection to test and migrate
    let conn = get_db_conn()?;
    
    // Check if a novel record exists. If not, create a default one!
    let mut stmt = conn.prepare("SELECT count(*) FROM novels").map_err(|e| e.to_string())?;
    let count: i64 = stmt.query_row([], |row| row.get(0)).map_err(|e| e.to_string())?;
    
    if count == 0 {
        let default_title = path_buf
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Novel");
        // Insert default novel
        conn.execute(
            "INSERT INTO novels (title, genre, target_audience, target_word_count, current_word_count) VALUES (?, ?, ?, ?, ?)",
            params![default_title, "General", "All Readers", 50000_i64, 0_i64],
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

pub fn close_project() -> Result<(), String> {
    let state = get_state();
    let mut path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    *path_guard = None;
    Ok(())
}

pub fn get_novels() -> Result<Vec<Novel>, String> {
    let conn = get_db_conn()?;
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

pub fn create_novel(
    title: String,
    genre: String,
    target_audience: String,
    target_word_count: i64,
) -> Result<i64, String> {
    let conn = get_db_conn()?;
    conn.execute(
        "INSERT INTO novels (title, genre, target_audience, target_word_count, current_word_count) VALUES (?, ?, ?, ?, 0)",
        params![title, genre, target_audience, target_word_count],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid())
}

pub fn update_novel(
    id: i64,
    title: String,
    genre: String,
    target_audience: String,
    target_word_count: i64,
) -> Result<(), String> {
    let conn = get_db_conn()?;
    conn.execute(
        "UPDATE novels SET title = ?, genre = ?, target_audience = ?, target_word_count = ? WHERE id = ?",
        params![title, genre, target_audience, target_word_count, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_novel(id: i64) -> Result<(), String> {
    let conn = get_db_conn()?;
    conn.execute("DELETE FROM novels WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_steps_progress(novel_id: i64) -> Result<Vec<StepProgress>, String> {
    let conn = get_db_conn()?;
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

pub fn save_step_progress(progress: StepProgress) -> Result<(), String> {
    let conn = get_db_conn()?;
    let is_completed_val = if progress.is_completed { 1 } else { 0 };
    
    conn.execute(
        "INSERT OR REPLACE INTO steps_progress (novel_id, step_number, content_text, is_completed) VALUES (?, ?, ?, ?)",
        params![progress.novel_id, progress.step_number, progress.content_text, is_completed_val],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_characters(novel_id: i64) -> Result<Vec<Character>, String> {
    let conn = get_db_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, name, motivation, goal, conflict, epiphany, one_paragraph_summary, full_synopsis FROM characters WHERE novel_id = ?")
        .map_err(|e| e.to_string())?;
        
    let char_iter = stmt
        .query_map(params![novel_id], |row| {
            Ok(Character {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                name: row.get(2)?,
                motivation: row.get(3).unwrap_or_default(),
                goal: row.get(4).unwrap_or_default(),
                conflict: row.get(5).unwrap_or_default(),
                epiphany: row.get(6).unwrap_or_default(),
                one_paragraph_summary: row.get(7).unwrap_or_default(),
                full_synopsis: row.get(8).unwrap_or_default(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for character in char_iter {
        list.push(character.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

pub fn save_character(character: Character) -> Result<i64, String> {
    let conn = get_db_conn()?;
    if let Some(id) = character.id {
        conn.execute(
            "UPDATE characters SET name = ?, motivation = ?, goal = ?, conflict = ?, epiphany = ?, one_paragraph_summary = ?, full_synopsis = ? WHERE id = ? AND novel_id = ?",
            params![
                character.name,
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
            "INSERT INTO characters (novel_id, name, motivation, goal, conflict, epiphany, one_paragraph_summary, full_synopsis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                character.novel_id,
                character.name,
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

pub fn delete_character(id: i64) -> Result<(), String> {
    let conn = get_db_conn()?;
    conn.execute("DELETE FROM characters WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_scenes(novel_id: i64) -> Result<Vec<Scene>, String> {
    let conn = get_db_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, pov_character_id, setting, plot_thread, what_happens, expected_word_count, actual_word_count FROM scenes WHERE novel_id = ?")
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
                expected_word_count: row.get(6)?,
                actual_word_count: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for scene in scene_iter {
        list.push(scene.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

fn update_novel_word_count(conn: &Connection, novel_id: i64) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE novels SET current_word_count = COALESCE((SELECT SUM(actual_word_count) FROM scenes WHERE novel_id = ?), 0) WHERE id = ?;",
        params![novel_id, novel_id],
    )?;
    Ok(())
}

pub fn save_scene(scene: Scene) -> Result<i64, String> {
    let conn = get_db_conn()?;
    let id = if let Some(sid) = scene.id {
        conn.execute(
            "UPDATE scenes SET pov_character_id = ?, setting = ?, plot_thread = ?, what_happens = ?, expected_word_count = ?, actual_word_count = ? WHERE id = ? AND novel_id = ?",
            params![
                scene.pov_character_id,
                scene.setting,
                scene.plot_thread,
                scene.what_happens,
                scene.expected_word_count,
                scene.actual_word_count,
                sid,
                scene.novel_id
            ],
        )
        .map_err(|e| e.to_string())?;
        sid
    } else {
        conn.execute(
            "INSERT INTO scenes (novel_id, pov_character_id, setting, plot_thread, what_happens, expected_word_count, actual_word_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                scene.novel_id,
                scene.pov_character_id,
                scene.setting,
                scene.plot_thread,
                scene.what_happens,
                scene.expected_word_count,
                scene.actual_word_count
            ],
        )
        .map_err(|e| e.to_string())?;
        conn.last_insert_rowid()
    };
    
    let _ = update_novel_word_count(&conn, scene.novel_id);
    Ok(id)
}

pub fn delete_scene(id: i64, novel_id: i64) -> Result<(), String> {
    let conn = get_db_conn()?;
    conn.execute("DELETE FROM scenes WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
        
    let _ = update_novel_word_count(&conn, novel_id);
    Ok(())
}

pub fn get_chapters(novel_id: i64) -> Result<Vec<Chapter>, String> {
    let conn = get_db_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, title, content, sort_order FROM novel_chapters WHERE novel_id = ? ORDER BY sort_order ASC, id ASC")
        .map_err(|e| e.to_string())?;
        
    let chap_iter = stmt
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
    for chap in chap_iter {
        list.push(chap.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

pub fn save_chapter(chapter: Chapter) -> Result<i64, String> {
    let conn = get_db_conn()?;
    if let Some(id) = chapter.id {
        conn.execute(
            "UPDATE novel_chapters SET title = ?, content = ?, sort_order = ? WHERE id = ? AND novel_id = ?",
            params![chapter.title, chapter.content, chapter.sort_order, id, chapter.novel_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO novel_chapters (novel_id, title, content, sort_order) VALUES (?, ?, ?, ?)",
            params![chapter.novel_id, chapter.title, chapter.content, chapter.sort_order],
        )
        .map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }
}

pub fn delete_chapter(id: i64) -> Result<(), String> {
    let conn = get_db_conn()?;
    conn.execute("DELETE FROM novel_chapters WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn export_to_txt(titles: Vec<String>, contents: Vec<String>) -> Result<String, String> {
    let mut output = String::new();
    for (title, content) in titles.into_iter().zip(contents.into_iter()) {
        output.push_str(&title);
        output.push_str("\n\n");
        output.push_str(&content);
        output.push_str("\n\n---\n\n");
    }
    Ok(output)
}

pub fn export_to_docx(path: String, titles: Vec<String>, contents: Vec<String>) -> Result<(), String> {
    let mut doc = Docx::new();
    for (title, content) in titles.into_iter().zip(contents.into_iter()) {
        doc = doc.add_paragraph(Paragraph::new().add_run(Run::new().add_text(&title).bold().size(28)));
        doc = doc.add_paragraph(Paragraph::new()); // blank line
        
        let lines = content.split('\n');
        for line in lines {
            let clean_line = line.trim();
            if !clean_line.is_empty() {
                doc = doc.add_paragraph(Paragraph::new().add_run(Run::new().add_text(clean_line)));
            }
        }
        
        doc = doc.add_paragraph(Paragraph::new().add_run(Run::new().add_break(BreakType::Page)));
    }
    
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    doc.build().pack(file).map_err(|e| e.to_string())?;
    Ok(())
}
