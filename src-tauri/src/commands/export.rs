use rusqlite::params;
use crate::models::{DbState, BookFormatConfig};
use crate::db::get_db_conn;

#[tauri::command]
pub fn get_book_formatting(state: tauri::State<'_, DbState>, novel_id: i64) -> Result<BookFormatConfig, String> {
    let conn = get_db_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, novel_id, has_title_page, subtitle, author_name, publisher_name, has_copyright_page, copyright_year, isbn, edition_notice, has_dedication, dedication_text, has_epigraph, epigraph_quote, epigraph_author, has_table_of_contents, has_foreword, foreword_title, foreword_content, has_epilogue, epilogue_title, epilogue_content, has_acknowledgments, acknowledgments_content, has_about_author, about_author_bio, preset_theme, trim_size, font_family, font_size, line_spacing, first_line_indent, first_paragraph_drop_cap, chapter_numbering_style, scene_break_ornament, header_verso, header_recto, include_page_numbers, cover_image FROM book_formatting WHERE novel_id = ? LIMIT 1")
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
            cover_image: row.get(38).unwrap_or_default(),
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
                cover_image: "".into(),
            })
        }
    }
}

#[tauri::command]
pub fn save_book_formatting(state: tauri::State<'_, DbState>, config: BookFormatConfig) -> Result<i64, String> {
    let conn = get_db_conn(&state)?;
    
    let existing_id: Option<i64> = conn.query_row(
        "SELECT id FROM book_formatting WHERE novel_id = ?",
        params![config.novel_id],
        |row| row.get(0),
    ).ok();

    if let Some(id) = existing_id {
        conn.execute(
            "UPDATE book_formatting SET has_title_page = ?, subtitle = ?, author_name = ?, publisher_name = ?, has_copyright_page = ?, copyright_year = ?, isbn = ?, edition_notice = ?, has_dedication = ?, dedication_text = ?, has_epigraph = ?, epigraph_quote = ?, epigraph_author = ?, has_table_of_contents = ?, has_foreword = ?, foreword_title = ?, foreword_content = ?, has_epilogue = ?, epilogue_title = ?, epilogue_content = ?, has_acknowledgments = ?, acknowledgments_content = ?, has_about_author = ?, about_author_bio = ?, preset_theme = ?, trim_size = ?, font_family = ?, font_size = ?, line_spacing = ?, first_line_indent = ?, first_paragraph_drop_cap = ?, chapter_numbering_style = ?, scene_break_ornament = ?, header_verso = ?, header_recto = ?, include_page_numbers = ?, cover_image = ? WHERE id = ?",
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
                config.cover_image,
                id
            ],
        ).map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO book_formatting (novel_id, has_title_page, subtitle, author_name, publisher_name, has_copyright_page, copyright_year, isbn, edition_notice, has_dedication, dedication_text, has_epigraph, epigraph_quote, epigraph_author, has_table_of_contents, has_foreword, foreword_title, foreword_content, has_epilogue, epilogue_title, epilogue_content, has_acknowledgments, acknowledgments_content, has_about_author, about_author_bio, preset_theme, trim_size, font_family, font_size, line_spacing, first_line_indent, first_paragraph_drop_cap, chapter_numbering_style, scene_break_ornament, header_verso, header_recto, include_page_numbers, cover_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
                if config.include_page_numbers { 1 } else { 0 },
                config.cover_image
            ],
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }
}

pub fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut lookup = [255u8; 256];
    for (i, &b) in TABLE.iter().enumerate() {
        lookup[b as usize] = i as u8;
    }
    let raw = if let Some(idx) = input.find(',') {
        &input[idx + 1..]
    } else {
        input
    };
    let bytes = raw.trim().as_bytes();
    let mut out = Vec::with_capacity((bytes.len() * 3) / 4);
    let mut buf = 0u32;
    let mut bits = 0;
    for &b in bytes {
        if b == b'=' {
            break;
        }
        let val = lookup[b as usize];
        if val == 255 {
            continue;
        }
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn save_export_file(
    default_name: String,
    filter_name: String,
    filter_ext: String,
    base64_data: String,
) -> Result<Option<String>, String> {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let file = rfd::FileDialog::new()
            .add_filter(&filter_name, &[filter_ext.as_str()])
            .set_file_name(&default_name)
            .save_file();

        if let Some(mut path) = file {
            if path.extension().is_none() {
                path.set_extension(&filter_ext);
            }
            let bytes = decode_base64(&base64_data)?;
            std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
            Ok(Some(path.to_string_lossy().to_string()))
        } else {
            Ok(None)
        }
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = (default_name, filter_name, filter_ext, base64_data);
        Ok(None)
    }
}

#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let clean_path = path.replace('/', "\\");
        let mut cmd = std::process::Command::new("explorer.exe");
        if p.is_file() {
            cmd.raw_arg(format!("/select,\"{}\"", clean_path));
        } else if p.is_dir() {
            cmd.raw_arg(format!("\"{}\"", clean_path));
        } else if let Some(parent) = p.parent() {
            let clean_parent = parent.to_string_lossy().replace('/', "\\");
            cmd.raw_arg(format!("\"{}\"", clean_parent));
        } else {
            cmd.raw_arg(format!("\"{}\"", clean_path));
        }
        cmd.spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        if p.is_file() {
            std::process::Command::new("open")
                .arg("-R")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            std::process::Command::new("open")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "linux")]
    {
        let target = if p.is_dir() {
            p
        } else {
            p.parent().unwrap_or(p)
        };
        std::process::Command::new("xdg-open")
            .arg(target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = path;
    }
    Ok(())
}
