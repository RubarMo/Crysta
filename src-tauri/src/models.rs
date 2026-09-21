use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

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
    pub cover_image: String,
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
