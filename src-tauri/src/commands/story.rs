use rusqlite::params;
use crate::models::{DbState, Character, Scene, Chapter};
use crate::db::{get_db_conn, update_novel_word_count};

// CHARACTERS CRUD COMMANDS
#[tauri::command]
pub fn get_characters(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<Character>, String> {
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
pub fn save_character(state: tauri::State<'_, DbState>, character: Character) -> Result<i64, String> {
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
pub fn delete_character(state: tauri::State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM characters WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// SCENES CRUD COMMANDS
#[tauri::command]
pub fn get_scenes(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<Scene>, String> {
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
pub fn save_scene(state: tauri::State<'_, DbState>, scene: Scene) -> Result<i64, String> {
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
pub fn delete_scene(state: tauri::State<'_, DbState>, id: i64, novel_id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM scenes WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
        
    // Recalculate and update the main novel's aggregate word count
    let _ = update_novel_word_count(&conn, novel_id);
    Ok(())
}

#[tauri::command]
pub fn reorder_scenes(state: tauri::State<'_, DbState>, novel_id: i64, scene_ids: Vec<i64>) -> Result<(), String> {
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
pub fn get_chapters(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<Vec<Chapter>, String> {
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
pub fn save_chapter(state: tauri::State<'_, DbState>, chapter: Chapter) -> Result<i64, String> {
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
pub fn delete_chapter(state: tauri::State<'_, DbState>, id: i64, novel_id: i64) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    conn.execute("DELETE FROM chapters WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    let _ = update_novel_word_count(&conn, novel_id);
    Ok(())
}

#[tauri::command]
pub fn reorder_chapters(state: tauri::State<'_, DbState>, novel_id: i64, chapter_ids: Vec<i64>) -> Result<(), String> {
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
