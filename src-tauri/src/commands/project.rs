use rusqlite::params;
#[cfg(any(target_os = "android", target_os = "ios"))]
use tauri::Manager;
use crate::models::{DbState, Novel};
use crate::db::get_db_conn;

#[tauri::command]
pub fn select_project_file() -> Result<Option<String>, String> {
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
pub fn create_project_file(default_name: String) -> Result<Option<String>, String> {
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
pub fn list_project_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
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
pub fn open_project(app: tauri::AppHandle, state: tauri::State<'_, DbState>, path: String) -> Result<Novel, String> {
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
pub fn close_project(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut path_guard = state.current_db_path.lock().map_err(|e| e.to_string())?;
    *path_guard = None;
    Ok(())
}
