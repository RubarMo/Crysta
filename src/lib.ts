import { invoke } from "@tauri-apps/api/core";

export interface Novel {
  id?: number;
  title: string;
  genre: string;
  target_audience: string;
  target_word_count: number;
  current_word_count: number;
  created_at?: string;
}

export interface StepProgress {
  id?: number;
  novel_id: number;
  step_number: number;
  content_text: string;
  is_completed: boolean;
}

export interface Character {
  id?: number;
  novel_id: number;
  name: string;
  one_sentence_summary?: string;
  motivation: string;
  goal: string;
  conflict: string;
  epiphany: string;
  one_paragraph_summary: string;
  full_synopsis: string;
}

export interface Scene {
  id?: number;
  novel_id: number;
  pov_character_id: number | null;
  setting: string;
  plot_thread: string;
  what_happens: string;
  narrative_outline?: string;
  expected_word_count: number;
  actual_word_count: number;
  sort_order?: number;
}

export interface Chapter {
  id?: number;
  novel_id: number;
  title: string;
  content: string;
  sort_order: number;
}

export interface BookFormatConfig {
  id?: number;
  novel_id: number;
  has_title_page: boolean;
  subtitle: string;
  author_name: string;
  publisher_name: string;
  has_copyright_page: boolean;
  copyright_year: string;
  isbn: string;
  edition_notice: string;
  has_dedication: boolean;
  dedication_text: string;
  has_epigraph: boolean;
  epigraph_quote: string;
  epigraph_author: string;
  has_table_of_contents: boolean;
  has_foreword: boolean;
  foreword_title: string;
  foreword_content: string;
  has_epilogue: boolean;
  epilogue_title: string;
  epilogue_content: string;
  has_acknowledgments: boolean;
  acknowledgments_content: string;
  has_about_author: boolean;
  about_author_bio: string;
  preset_theme: string;
  trim_size: string;
  font_family: string;
  font_size: number;
  line_spacing: number;
  first_line_indent: boolean;
  first_paragraph_drop_cap: boolean;
  chapter_numbering_style: string;
  scene_break_ornament: string;
  header_verso: string;
  header_recto: string;
  include_page_numbers: boolean;
}

export interface SnapshotInfo {
  file_path: string;
  file_name: string;
  timestamp: string;
  file_size_bytes: number;
  custom_label: string | null;
  is_manual: boolean;
}

// Commands Wrapper
export async function getNovels(): Promise<Novel[]> {
  return invoke<Novel[]>("get_novels");
}

export async function createNovel(
  title: string,
  genre: string,
  targetAudience: string,
  targetWordCount: number
): Promise<number> {
  return invoke<number>("create_novel", {
    title,
    genre,
    targetAudience,
    targetWordCount,
  });
}

export async function updateNovel(
  id: number,
  title: string,
  genre: string,
  targetAudience: string,
  targetWordCount: number
): Promise<void> {
  return invoke<void>("update_novel", {
    id,
    title,
    genre,
    targetAudience,
    targetWordCount,
  });
}

export async function deleteNovel(id: number): Promise<void> {
  return invoke<void>("delete_novel", { id });
}

export async function getStepsProgress(novelId: number): Promise<StepProgress[]> {
  return invoke<StepProgress[]>("get_steps_progress", { novelId });
}

export async function saveStepProgress(
  novelId: number,
  stepNumber: number,
  contentText: string,
  isCompleted: boolean
): Promise<void> {
  return invoke<void>("save_step_progress", {
    progress: {
      novel_id: novelId,
      step_number: stepNumber,
      content_text: contentText,
      is_completed: isCompleted,
    }
  });
}

export async function getCharacters(novelId: number): Promise<Character[]> {
  return invoke<Character[]>("get_characters", { novelId });
}

export async function saveCharacter(character: Character): Promise<number> {
  return invoke<number>("save_character", { character });
}

export async function deleteCharacter(id: number): Promise<void> {
  return invoke<void>("delete_character", { id });
}

export async function getScenes(novelId: number): Promise<Scene[]> {
  return invoke<Scene[]>("get_scenes", { novelId });
}

export async function saveScene(scene: Scene): Promise<number> {
  return invoke<number>("save_scene", { scene });
}

export async function deleteScene(id: number, novelId: number): Promise<void> {
  return invoke<void>("delete_scene", { id, novelId });
}

export async function reorderScenes(novelId: number, sceneIds: number[]): Promise<void> {
  return invoke<void>("reorder_scenes", { novelId, sceneIds });
}

// Chapters CRUD
export async function getChapters(novelId: number): Promise<Chapter[]> {
  return invoke<Chapter[]>("get_chapters", { novelId });
}

export async function saveChapter(chapter: Chapter): Promise<number> {
  return invoke<number>("save_chapter", { chapter });
}

export async function deleteChapter(id: number, novelId: number): Promise<void> {
  return invoke<void>("delete_chapter", { id, novelId });
}

export async function reorderChapters(novelId: number, chapterIds: number[]): Promise<void> {
  return invoke<void>("reorder_chapters", { novelId, chapterIds });
}

// Book Formatting Config
export async function getBookFormatting(novelId: number): Promise<BookFormatConfig> {
  return invoke<BookFormatConfig>("get_book_formatting", { novelId });
}

export async function saveBookFormatting(config: BookFormatConfig): Promise<number> {
  return invoke<number>("save_book_formatting", { config });
}

// Snapshots & Backups
export async function takeSnapshot(customLabel?: string, isManual = false): Promise<SnapshotInfo> {
  return invoke<SnapshotInfo>("take_snapshot", { customLabel: customLabel || null, isManual });
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
  return invoke<SnapshotInfo[]>("list_snapshots");
}

export async function restoreSnapshot(snapshotPath: string): Promise<void> {
  return invoke<void>("restore_snapshot", { snapshotPath });
}

export async function deleteSnapshot(snapshotPath: string): Promise<void> {
  return invoke<void>("delete_snapshot", { snapshotPath });
}

export async function openBackupsDirectory(): Promise<void> {
  return invoke<void>("open_backups_directory");
}

// Project Lifecycle API Bindings
export async function selectProjectFile(): Promise<string | null> {
  return invoke<string | null>("select_project_file");
}

export async function createProjectFile(defaultName: string): Promise<string | null> {
  return invoke<string | null>("create_project_file", { defaultName });
}

export async function listProjectFiles(): Promise<string[]> {
  return invoke<string[]>("list_project_files");
}

export async function openProject(path: string): Promise<Novel> {
  return invoke<Novel>("open_project", { path });
}

export async function closeProject(): Promise<void> {
  return invoke<void>("close_project");
}
