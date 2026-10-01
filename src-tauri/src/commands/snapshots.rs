use std::path::{Path, PathBuf};
use rusqlite::{Connection, DatabaseName, OpenFlags};
use crate::db::{get_db_conn, migrate, unix_now};
use crate::models::{DbState, SnapshotInfo};

/// Automatic snapshots beyond this count are pruned (oldest first).
/// Manual snapshots are never pruned.
const MAX_AUTO_SNAPSHOTS: usize = 10;
const SNAPSHOT_SUFFIX: &str = ".crysta.bak";

pub fn get_backup_dir(db_path: &Path) -> PathBuf {
    let parent = db_path.parent().unwrap_or(Path::new("."));
    let stem = db_path.file_stem().and_then(|s| s.to_str()).unwrap_or("project");
    parent.join(format!("{}_backups", stem))
}

/// Keeps letters (any script), digits and dashes; everything else becomes `_`.
fn sanitize_label(label: &str) -> String {
    let mut out = String::new();
    for c in label.trim().chars().take(60) {
        let mapped = if c.is_alphanumeric() || c == '-' { c } else { '_' };
        if mapped == '_' && out.ends_with('_') {
            continue;
        }
        out.push(mapped);
    }
    out.trim_matches('_').to_string()
}

/// Resolves a snapshot path coming from the UI and makes sure it is a
/// snapshot file inside this project's backup folder.
fn resolve_snapshot_path(db_path: &Path, snapshot_path: &str) -> Result<PathBuf, String> {
    let invalid = || "Invalid snapshot path".to_string();
    let backup_dir = get_backup_dir(db_path).canonicalize().map_err(|_| invalid())?;
    let snap = PathBuf::from(snapshot_path).canonicalize().map_err(|_| "Snapshot file does not exist".to_string())?;
    let is_snapshot_file = snap
        .file_name()
        .and_then(|n| n.to_str())
        .is_some_and(|n| n.starts_with("snapshot_") && n.ends_with(SNAPSHOT_SUFFIX));
    if snap.parent() != Some(backup_dir.as_path()) || !is_snapshot_file || !snap.is_file() {
        return Err(invalid());
    }
    Ok(snap)
}

fn parse_snapshot_name(file_name: &str) -> Option<(u64, bool, Option<String>)> {
    let rest = file_name.strip_prefix("snapshot_")?.strip_suffix(SNAPSHOT_SUFFIX)?;
    // The timestamp segment is "<secs>" or "<secs>-<n>" when two snapshots
    // were taken within the same second.
    let (ts, rest) = rest.split_once('_')?;
    let ts: u64 = ts.split('-').next()?.parse().ok()?;
    let (kind, label) = match rest.split_once('_') {
        Some((kind, label)) => (kind, Some(label)),
        None => (rest, None),
    };
    let is_manual = kind == "manual";
    let label = label
        .map(|l| l.replace('_', " ").trim().to_string())
        .filter(|l| !l.is_empty());
    Some((ts, is_manual, label))
}

fn snapshot_info(path: &Path) -> Option<SnapshotInfo> {
    let file_name = path.file_name()?.to_str()?.to_string();
    let (ts, is_manual, label) = parse_snapshot_name(&file_name)?;
    let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    Some(SnapshotInfo {
        file_path: path.to_string_lossy().to_string(),
        file_name,
        timestamp: ts.to_string(),
        file_size_bytes: size,
        custom_label: label,
        is_manual,
    })
}

fn read_snapshots(backup_dir: &Path) -> Result<Vec<SnapshotInfo>, String> {
    if !backup_dir.exists() {
        return Ok(vec![]);
    }
    let mut snapshots = Vec::new();
    for entry in std::fs::read_dir(backup_dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_file() {
            if let Some(info) = snapshot_info(&path) {
                snapshots.push(info);
            }
        }
    }
    snapshots.sort_by_key(|s| std::cmp::Reverse(s.timestamp.parse::<u64>().unwrap_or(0)));
    Ok(snapshots)
}

fn prune_auto_snapshots(backup_dir: &Path) {
    if let Ok(snapshots) = read_snapshots(backup_dir) {
        for old in snapshots.iter().filter(|s| !s.is_manual).skip(MAX_AUTO_SNAPSHOTS) {
            let _ = std::fs::remove_file(&old.file_path);
        }
    }
}

/// Writes a consistent copy of the open database into the backup folder.
fn write_snapshot(conn: &Connection, db_path: &Path, label: Option<&str>, is_manual: bool) -> Result<SnapshotInfo, String> {
    let backup_dir = get_backup_dir(db_path);
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let tag = if is_manual { "manual" } else { "auto" };
    let safe_label = label.map(sanitize_label).filter(|l| !l.is_empty()).map(|l| format!("_{}", l)).unwrap_or_default();
    let now = unix_now();

    let mut target = backup_dir.join(format!("snapshot_{}_{}{}{}", now, tag, safe_label, SNAPSHOT_SUFFIX));
    let mut counter = 2;
    while target.exists() {
        target = backup_dir.join(format!("snapshot_{}-{}_{}{}{}", now, counter, tag, safe_label, SNAPSHOT_SUFFIX));
        counter += 1;
    }

    // VACUUM INTO produces a consistent, compacted copy even while the
    // connection is open, unlike copying the file on disk.
    conn.execute("VACUUM INTO ?1", [target.to_string_lossy().to_string()])
        .map_err(|e| e.to_string())?;

    snapshot_info(&target).ok_or_else(|| "Failed to read snapshot".to_string())
}

#[tauri::command]
pub fn take_snapshot(state: tauri::State<'_, DbState>, custom_label: Option<String>, is_manual: bool) -> Result<SnapshotInfo, String> {
    let conn = get_db_conn(&state)?;
    let db_path = conn.path().to_path_buf();
    let info = write_snapshot(&conn, &db_path, custom_label.as_deref(), is_manual)?;
    if !is_manual {
        prune_auto_snapshots(&get_backup_dir(&db_path));
    }
    Ok(info)
}

#[tauri::command]
pub fn list_snapshots(state: tauri::State<'_, DbState>) -> Result<Vec<SnapshotInfo>, String> {
    let conn = get_db_conn(&state)?;
    read_snapshots(&get_backup_dir(conn.path()))
}

#[tauri::command]
pub fn restore_snapshot(state: tauri::State<'_, DbState>, snapshot_path: String) -> Result<(), String> {
    let mut conn = get_db_conn(&state)?;
    let db_path = conn.path().to_path_buf();
    let snap = resolve_snapshot_path(&db_path, &snapshot_path)?;

    // Make sure the snapshot is a readable Crysta database before touching anything.
    {
        let check = Connection::open_with_flags(&snap, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|e| format!("Snapshot can't be opened: {}", e))?;
        let has_novels: i64 = check
            .query_row("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'novels'", [], |row| row.get(0))
            .map_err(|e| format!("Snapshot is damaged: {}", e))?;
        if has_novels == 0 {
            return Err("This snapshot is not a Crysta project".into());
        }
    }

    // Keep the current state as a manual snapshot so a restore can be undone.
    write_snapshot(&conn, &db_path, Some("before-restore"), true)?;

    conn.restore(DatabaseName::Main, &snap, None::<fn(rusqlite::backup::Progress)>)
        .map_err(|e| e.to_string())?;
    migrate(&conn)
}

#[tauri::command]
pub fn delete_snapshot(state: tauri::State<'_, DbState>, snapshot_path: String) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    let snap = resolve_snapshot_path(conn.path(), &snapshot_path)?;
    std::fs::remove_file(snap).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_backups_directory(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let conn = get_db_conn(&state)?;
    let backup_dir = get_backup_dir(conn.path());
    drop(conn);
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
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        return Err("UNSUPPORTED_ON_MOBILE".into());
    }
    #[allow(unreachable_code)]
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_labels() {
        assert_eq!(sanitize_label("Before chapter 3"), "Before_chapter_3");
        assert_eq!(sanitize_label("a/b\\c:d*e?f\"g<h>i|j"), "a_b_c_d_e_f_g_h_i_j");
        assert_eq!(sanitize_label("قبل الفصل"), "قبل_الفصل");
        assert_eq!(sanitize_label("  ...  "), "");
    }

    #[test]
    fn parses_snapshot_names() {
        assert_eq!(parse_snapshot_name("snapshot_100_auto.crysta.bak"), Some((100, false, None)));
        assert_eq!(
            parse_snapshot_name("snapshot_200_manual_Before_chapter.crysta.bak"),
            Some((200, true, Some("Before chapter".to_string())))
        );
        assert_eq!(
            parse_snapshot_name("snapshot_300-2_manual_Chapter_3.crysta.bak"),
            Some((300, true, Some("Chapter 3".to_string())))
        );
        assert_eq!(parse_snapshot_name("random.txt"), None);
    }

    #[test]
    fn rejects_paths_outside_backup_dir() {
        let dir = std::env::temp_dir().join(format!("crysta_test_{}", unix_now()));
        let db_path = dir.join("novel.crysta");
        let backups = get_backup_dir(&db_path);
        std::fs::create_dir_all(&backups).unwrap();

        let inside = backups.join("snapshot_1_auto.crysta.bak");
        std::fs::write(&inside, b"x").unwrap();
        let outside = dir.join("snapshot_1_auto.crysta.bak");
        std::fs::write(&outside, b"x").unwrap();
        let wrong_name = backups.join("notes.txt");
        std::fs::write(&wrong_name, b"x").unwrap();

        assert!(resolve_snapshot_path(&db_path, inside.to_str().unwrap()).is_ok());
        assert!(resolve_snapshot_path(&db_path, outside.to_str().unwrap()).is_err());
        assert!(resolve_snapshot_path(&db_path, wrong_name.to_str().unwrap()).is_err());
        let traversal = backups.join("..").join("snapshot_1_auto.crysta.bak");
        assert!(resolve_snapshot_path(&db_path, traversal.to_str().unwrap()).is_err());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn snapshot_and_restore_round_trip() {
        let dir = std::env::temp_dir().join(format!("crysta_restore_test_{}", unix_now()));
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("novel.crysta");
        let mut conn = crate::db::open_project_db(&db_path, true).unwrap();
        conn.execute("INSERT INTO novels (title, genre) VALUES ('Original', '')", []).unwrap();

        let snap = write_snapshot(&conn, &db_path, Some("first"), true).unwrap();
        conn.execute("UPDATE novels SET title = 'Changed'", []).unwrap();

        let resolved = resolve_snapshot_path(&db_path, &snap.file_path).unwrap();
        conn.restore(DatabaseName::Main, &resolved, None::<fn(rusqlite::backup::Progress)>).unwrap();
        let title: String = conn.query_row("SELECT title FROM novels", [], |r| r.get(0)).unwrap();
        assert_eq!(title, "Original");

        drop(conn);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
