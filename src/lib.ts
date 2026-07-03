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
  expected_word_count: number;
  actual_word_count: number;
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

// Project Lifecycle API Bindings
export async function selectProjectFile(): Promise<string | null> {
  return invoke<string | null>("select_project_file");
}

export async function createProjectFile(defaultName: string): Promise<string | null> {
  return invoke<string | null>("create_project_file", { defaultName });
}

export async function openProject(path: string): Promise<Novel> {
  return invoke<Novel>("open_project", { path });
}

export async function closeProject(): Promise<void> {
  return invoke<void>("close_project");
}
