use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection};
use std::sync::Mutex;
use std::path::PathBuf;

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
    pub expected_word_count: i64,
    pub actual_word_count: i64,
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
    ").map_err(|e| e.to_string())?;
    
    Ok(conn)
}

// Helper to update novel word count based on scene sums
fn update_novel_word_count(conn: &Connection, novel_id: i64) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE novels SET current_word_count = COALESCE((SELECT SUM(actual_word_count) FROM scenes WHERE novel_id = ?), 0) WHERE id = ?;",
        params![novel_id, novel_id],
    )?;
    Ok(())
}

// Native Dialog and Project Lifecycle Commands
#[tauri::command]
fn select_project_file() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Crysta Project (*.crysta)", &["crysta"])
        .add_filter("Snowflake Project (*.snowflake)", &["snowflake"])
        .add_filter("SQLite Database (*.db)", &["db"])
        .pick_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn create_project_file(default_name: String) -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Crysta Project (*.crysta)", &["crysta"])
        .add_filter("Snowflake Project (*.snowflake)", &["snowflake"])
        .add_filter("SQLite Database (*.db)", &["db"])
        .set_file_name(&default_name)
        .save_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn open_project(state: tauri::State<'_, DbState>, path: String) -> Result<Novel, String> {
    let path_buf = std::path::PathBuf::from(path);
    
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
        // Insert default novel
        conn.execute(
            "INSERT INTO novels (title, genre, target_audience, target_word_count, current_word_count) VALUES (?, ?, ?, ?, ?)",
            params!["رواية جديدة", "عام", "كافة القراء", 50000, 0],
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

#[tauri::command]
fn save_character(state: tauri::State<'_, DbState>, character: Character) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;
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

#[tauri::command]
fn save_scene(state: tauri::State<'_, DbState>, scene: Scene) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState {
            current_db_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            select_project_file,
            create_project_file,
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
            delete_scene
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
