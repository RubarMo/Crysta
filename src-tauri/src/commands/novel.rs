use rusqlite::params;
use crate::models::{DbState, Novel, StepProgress};
use crate::db::get_db_conn;

#[tauri::command]
pub fn get_novels(state: tauri::State<'_, DbState>) -> Result<Vec<Novel>, String> {
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
pub fn create_novel(
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
pub fn update_novel(
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
pub fn delete_novel(state: tauri::State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM novels WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_steps_progress(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<StepProgress>, String> {
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
pub fn save_step_progress(state: tauri::State<'_, DbState>, progress: StepProgress) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    let is_completed_val = if progress.is_completed { 1 } else { 0 };
    
    conn.execute(
        "INSERT OR REPLACE INTO steps_progress (novel_id, step_number, content_text, is_completed) VALUES (?, ?, ?, ?)",
        params![progress.novel_id, progress.step_number, progress.content_text, is_completed_val],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
