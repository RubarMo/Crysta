use serde::{Deserialize, Serialize};
use tauri::Manager;
use rusqlite::{params, Connection};
use std::fs;
use tauri_plugin_sql::{Migration, MigrationKind};

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

// Helper to get SQLite connection
fn get_db_conn(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
    // 1. Try current working directory first (ideal for OneDrive sync & portability)
    let mut db_path = std::env::current_dir().unwrap_or_default();
    db_path.push("snowflake_data.db");
    
    println!("[SQL] Attempting to open database in project folder: {:?}", db_path);
    
    let conn = match Connection::open(&db_path) {
        Ok(c) => {
            println!("[SQL] Successfully connected to database in project folder.");
            c
        }
        Err(e) => {
            println!("[SQL] Failed to open in current directory: {:?}. Falling back to AppData.", e);
            // 2. Fallback to AppData directory if current folder has write locks
            let mut appdata_path = match app_handle.path().app_config_dir() {
                Ok(dir) => {
                    let _ = fs::create_dir_all(&dir);
                    dir
                }
                Err(_) => std::env::current_dir().unwrap_or_default(),
            };
            appdata_path.push("snowflake_data.db");
            println!("[SQL] AppData fallback path: {:?}", appdata_path);
            Connection::open(appdata_path).map_err(|err| err.to_string())?
        }
    };
    
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

// NOVELS CRUD COMMANDS
#[tauri::command]
fn get_novels(app: tauri::AppHandle) -> Result<Vec<Novel>, String> {
    let conn = get_db_conn(&app)?;
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
    app: tauri::AppHandle,
    title: String,
    genre: String,
    target_audience: String,
    target_word_count: i64,
) -> Result<i64, String> {
    let conn = get_db_conn(&app)?;
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
    app: tauri::AppHandle,
    id: i64,
    title: String,
    genre: String,
    target_audience: String,
    target_word_count: i64,
) -> Result<(), String> {
    let conn = get_db_conn(&app)?;
    conn.execute(
        "UPDATE novels SET title = ?, genre = ?, target_audience = ?, target_word_count = ? WHERE id = ?",
        params![title, genre, target_audience, target_word_count, id],
    )
    .map_err(|e| e.to_string())?;
    
    // Trigger recalculation just in case
    let _ = update_novel_word_count(&conn, id);
    Ok(())
}

#[tauri::command]
fn delete_novel(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = get_db_conn(&app)?;
    conn.execute("DELETE FROM novels WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// STEPS PROGRESS CRUD COMMANDS
#[tauri::command]
fn get_steps_progress(app: tauri::AppHandle, novel_id: i64) -> Result<Vec<StepProgress>, String> {
    let conn = get_db_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, step_number, content_text, is_completed FROM steps_progress WHERE novel_id = ?")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt
        .query_map(params![novel_id], |row| {
            let is_completed_int: i32 = row.get(4)?;
            Ok(StepProgress {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                step_number: row.get(2)?,
                content_text: row.get(3)?,
                is_completed: is_completed_int != 0,
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
fn save_step_progress(
    app: tauri::AppHandle,
    novel_id: i64,
    step_number: i64,
    content_text: String,
    is_completed: bool,
) -> Result<(), String> {
    let conn = get_db_conn(&app)?;
    let is_completed_int = if is_completed { 1 } else { 0 };
    
    conn.execute(
        "INSERT INTO steps_progress (novel_id, step_number, content_text, is_completed)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(novel_id, step_number) 
         DO UPDATE SET content_text = excluded.content_text, is_completed = excluded.is_completed",
        params![novel_id, step_number, content_text, is_completed_int],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

// CHARACTERS CRUD COMMANDS
#[tauri::command]
fn get_characters(app: tauri::AppHandle, novel_id: i64) -> Result<Vec<Character>, String> {
    let conn = get_db_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, name, motivation, goal, conflict, epiphany, one_paragraph_summary, full_synopsis FROM characters WHERE novel_id = ?")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt
        .query_map(params![novel_id], |row| {
            Ok(Character {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                name: row.get(2)?,
                motivation: row.get(3)?,
                goal: row.get(4)?,
                conflict: row.get(5)?,
                epiphany: row.get(6)?,
                one_paragraph_summary: row.get(7)?,
                full_synopsis: row.get(8)?,
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
fn save_character(app: tauri::AppHandle, character: Character) -> Result<i64, String> {
    let conn = get_db_conn(&app)?;
    if let Some(id) = character.id {
        conn.execute(
            "UPDATE characters SET name = ?, motivation = ?, goal = ?, conflict = ?, epiphany = ?, one_paragraph_summary = ?, full_synopsis = ? WHERE id = ?",
            params![
                character.name,
                character.motivation,
                character.goal,
                character.conflict,
                character.epiphany,
                character.one_paragraph_summary,
                character.full_synopsis,
                id
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
fn delete_character(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = get_db_conn(&app)?;
    conn.execute("DELETE FROM characters WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// SCENES CRUD COMMANDS
#[tauri::command]
fn get_scenes(app: tauri::AppHandle, novel_id: i64) -> Result<Vec<Scene>, String> {
    let conn = get_db_conn(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, pov_character_id, setting, plot_thread, what_happens, expected_word_count, actual_word_count FROM scenes WHERE novel_id = ? ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt
        .query_map(params![novel_id], |row| {
            Ok(Scene {
                id: Some(row.get(0)?),
                novel_id: row.get(1)?,
                pov_character_id: row.get(2)?,
                setting: row.get(3)?,
                plot_thread: row.get(4)?,
                what_happens: row.get(5)?,
                expected_word_count: row.get(6)?,
                actual_word_count: row.get(7)?,
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
fn save_scene(app: tauri::AppHandle, scene: Scene) -> Result<i64, String> {
    let conn = get_db_conn(&app)?;
    let id = if let Some(id) = scene.id {
        conn.execute(
            "UPDATE scenes SET pov_character_id = ?, setting = ?, plot_thread = ?, what_happens = ?, expected_word_count = ?, actual_word_count = ? WHERE id = ?",
            params![
                scene.pov_character_id,
                scene.setting,
                scene.plot_thread,
                scene.what_happens,
                scene.expected_word_count,
                scene.actual_word_count,
                id
            ],
        )
        .map_err(|e| e.to_string())?;
        id
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
    
    // Sync the novel's total word count
    let _ = update_novel_word_count(&conn, scene.novel_id);
    
    Ok(id)
}

#[tauri::command]
fn delete_scene(app: tauri::AppHandle, id: i64, novel_id: i64) -> Result<(), String> {
    let conn = get_db_conn(&app)?;
    conn.execute("DELETE FROM scenes WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
        
    // Sync the novel's total word count
    let _ = update_novel_word_count(&conn, novel_id);
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
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
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:snowflake_data.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
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
