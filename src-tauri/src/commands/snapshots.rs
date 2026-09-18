use std::path::{Path, PathBuf};
use crate::models::{DbState, SnapshotInfo};

pub fn get_backup_dir(db_path: &Path) -> PathBuf {
    let parent = db_path.parent().unwrap_or(Path::new("."));
    let stem = db_path.file_stem().and_then(|s| s.to_str()).unwrap_or("project");
    parent.join(format!("{}_backups", stem))
}

#[tauri::command]
pub fn take_snapshot(state: tauri::State<'_, DbState>, custom_label: Option<String>, is_manual: bool) -> Result<SnapshotInfo, String> {
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
pub fn list_snapshots(state: tauri::State<'_, DbState>) -> Result<Vec<SnapshotInfo>, String> {
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
pub fn restore_snapshot(state: tauri::State<'_, DbState>, snapshot_path: String) -> Result<(), String> {
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
pub fn delete_snapshot(snapshot_path: String) -> Result<(), String> {
    let snap = PathBuf::from(&snapshot_path);
    if snap.exists() {
        std::fs::remove_file(snap).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_backups_directory(state: tauri::State<'_, DbState>) -> Result<(), String> {
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
