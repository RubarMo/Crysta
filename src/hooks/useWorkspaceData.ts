import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Novel,
  StepProgress,
  Character,
  Scene,
  Chapter,
  saveStepProgress,
  saveCharacter,
  deleteCharacter as apiDeleteCharacter,
  saveScene,
  deleteScene as apiDeleteScene,
  reorderScenes,
  getChapters,
  saveChapter,
  deleteChapter as apiDeleteChapter,
  reorderChapters,
  getCharacters as apiGetCharacters,
  getScenes as apiGetScenes,
  updateNovel as apiUpdateNovel,
} from '../lib';
import { useLanguage } from '../LanguageContext';
import { useKeyedAutosave } from './useKeyedAutosave';
import { SaveStatus } from '../utils/autosave';
import { errorMessage, useToast } from '../components/Toast';

export interface UseWorkspaceDataProps {
  activeNovel: Novel;
  onUpdateNovel: (novel: Novel) => void;
  stepsProgress: StepProgress[];
  /** Called after a step was saved so the app can update its copy. */
  onStepSaved: (progress: StepProgress) => void;
  activeStep: number;
}

export type SaveIndicator = 'idle' | 'saving' | 'saved' | 'error';

interface NovelDraft {
  title: string;
  genre: string;
  target_audience: string;
  target_word_count: number;
}

interface StepDraft {
  step_number: number;
  content_text: string;
  is_completed: boolean;
}

const AUTOSAVE_DELAY = 700;

export function useWorkspaceData({
  activeNovel,
  onUpdateNovel,
  stepsProgress,
  onStepSaved,
  activeStep,
}: UseWorkspaceDataProps) {
  const { t } = useLanguage();
  const { notify } = useToast();
  const novelId = activeNovel.id!;

  // ---------------------------------------------------------------------
  // Save indicator shared by every autosave in the workspace
  // ---------------------------------------------------------------------
  const [saveIndicator, setSaveIndicator] = useState<SaveIndicator>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportSaveStatus = useCallback((status: SaveStatus, error?: unknown) => {
    if (savedTimer.current) {
      clearTimeout(savedTimer.current);
      savedTimer.current = null;
    }
    if (status === 'pending' || status === 'saving') {
      setSaveIndicator('saving');
    } else if (status === 'saved') {
      setSaveIndicator('saved');
      savedTimer.current = setTimeout(() => setSaveIndicator('idle'), 2000);
    } else if (status === 'error') {
      setSaveIndicator('error');
      notify(t('saveFailedDetail', { error: errorMessage(error) }));
    }
  }, [notify, t]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const reportError = useCallback((err: unknown) => {
    console.error(err);
    notify(`${t('error')}: ${errorMessage(err)}`);
  }, [notify, t]);

  // ---------------------------------------------------------------------
  // Novel metadata (autosaved)
  // ---------------------------------------------------------------------
  const [novelDraft, setNovelDraft] = useState<NovelDraft>(() => ({
    title: activeNovel.title,
    genre: activeNovel.genre,
    target_audience: activeNovel.target_audience,
    target_word_count: activeNovel.target_word_count,
  }));

  const novelSaver = useKeyedAutosave<NovelDraft>({
    delay: AUTOSAVE_DELAY,
    onStatus: reportSaveStatus,
    save: async (draft) => {
      await apiUpdateNovel(novelId, draft.title, draft.genre, draft.target_audience, draft.target_word_count);
      onUpdateNovel({ ...activeNovel, ...draft });
    },
  });

  const updateNovelDraft = (patch: Partial<NovelDraft>) => {
    const next = { ...novelDraft, ...patch };
    setNovelDraft(next);
    novelSaver.schedule('novel', next);
  };

  // ---------------------------------------------------------------------
  // Snowflake steps. Local drafts take precedence over the saved progress so
  // a save round-trip never overwrites what the user is typing.
  // ---------------------------------------------------------------------
  const [stepDrafts, setStepDrafts] = useState<Record<number, StepDraft>>({});

  const getStep = (stepNumber: number): StepDraft => {
    const draft = stepDrafts[stepNumber];
    if (draft) return draft;
    const saved = stepsProgress.find((p) => p.step_number === stepNumber);
    return {
      step_number: stepNumber,
      content_text: saved?.content_text ?? '',
      is_completed: saved?.is_completed ?? false,
    };
  };

  const stepSaver = useKeyedAutosave<StepDraft>({
    delay: AUTOSAVE_DELAY,
    onStatus: reportSaveStatus,
    save: async (draft) => {
      await saveStepProgress(novelId, draft.step_number, draft.content_text, draft.is_completed);
      onStepSaved({ novel_id: novelId, ...draft });
    },
  });

  const updateStep = (stepNumber: number, patch: Partial<StepDraft>, immediate = false) => {
    const next = { ...getStep(stepNumber), ...patch };
    setStepDrafts((prev) => ({ ...prev, [stepNumber]: next }));
    stepSaver.schedule(stepNumber, next);
    if (immediate) void stepSaver.flush().catch(() => undefined);
  };

  const activeStepDraft = getStep(activeStep);
  const setStepText = (text: string) => updateStep(activeStep, { content_text: text });
  const setStepCompleted = (completed: boolean) => updateStep(activeStep, { is_completed: completed }, true);
  const getStepContent = (stepNum: number) => getStep(stepNum).content_text;

  // ---------------------------------------------------------------------
  // Characters, scenes and chapters
  // ---------------------------------------------------------------------
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Partial<Character> | null>(null);

  const [selectedCharIdStep5, setSelectedCharIdStep5] = useState<number | null>(null);
  const [selectedCharIdStep7, setSelectedCharIdStep7] = useState<number | null>(null);
  const [selectedSceneIdStep9, setSelectedSceneIdStep9] = useState<number | null>(null);

  const characterSaver = useKeyedAutosave<Character>({
    delay: AUTOSAVE_DELAY,
    onStatus: reportSaveStatus,
    save: (character) => saveCharacter(character),
  });
  const sceneSaver = useKeyedAutosave<Scene>({
    delay: AUTOSAVE_DELAY,
    onStatus: reportSaveStatus,
    save: (scene) => saveScene(scene),
  });
  const chapterSaver = useKeyedAutosave<Chapter>({
    delay: AUTOSAVE_DELAY,
    onStatus: reportSaveStatus,
    save: (chapter) => saveChapter(chapter),
  });

  const reloadCharacters = async () => {
    await characterSaver.flush();
    setCharacters(await apiGetCharacters(novelId));
  };

  const reloadScenes = async () => {
    await sceneSaver.flush();
    setScenes(await apiGetScenes(novelId));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiGetCharacters(novelId), apiGetScenes(novelId), getChapters(novelId)])
      .then(([chars, scns, chaps]) => {
        if (cancelled) return;
        setCharacters(chars);
        setScenes(scns);
        setChapters(chaps);
        setIsLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) reportError(err);
      });
    return () => {
      cancelled = true;
    };
    // The workspace is remounted for every project open, so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId]);

  // Characters ---------------------------------------------------------
  const updateCharacterLocal = (id: number, patch: Partial<Character>) => {
    const current = characters.find((c) => c.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
    characterSaver.schedule(id, updated);
  };

  const handleSaveCharacter = async (char: Partial<Character>) => {
    try {
      const charToSave: Character = {
        id: char.id,
        novel_id: novelId,
        name: char.name?.trim() || t('newCharacterName'),
        one_sentence_summary: char.one_sentence_summary || '',
        motivation: char.motivation || '',
        goal: char.goal || '',
        conflict: char.conflict || '',
        epiphany: char.epiphany || '',
        one_paragraph_summary: char.one_paragraph_summary || '',
        full_synopsis: char.full_synopsis || '',
      };
      // Write pending inline edits first so they can't land after this save.
      await characterSaver.flush();
      await saveCharacter(charToSave);
      setEditingCharacter(null);
      await reloadCharacters();
    } catch (err) {
      reportError(err);
    }
  };

  const handleDeleteCharacter = async (id: number) => {
    if (!window.confirm(t('deleteCharConfirm'))) return;
    try {
      characterSaver.cancel(id);
      await apiDeleteCharacter(id);
      await Promise.all([reloadCharacters(), reloadScenes()]);
    } catch (err) {
      reportError(err);
    }
  };

  // Scenes -------------------------------------------------------------
  const updateSceneLocal = (id: number, patch: Partial<Scene>) => {
    const current = scenes.find((s) => s.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setScenes((prev) => prev.map((s) => (s.id === id ? updated : s)));
    sceneSaver.schedule(id, updated);
  };

  const handleSaveScene = async (scene: Partial<Scene>) => {
    try {
      const scnToSave: Scene = {
        id: scene.id,
        novel_id: novelId,
        pov_character_id: scene.pov_character_id ?? null,
        setting: scene.setting || '',
        plot_thread: scene.plot_thread || '',
        what_happens: scene.what_happens || '',
        narrative_outline: scene.narrative_outline || '',
        expected_word_count: scene.expected_word_count ?? 1000,
        actual_word_count: scene.actual_word_count ?? 0,
        sort_order: scene.sort_order,
      };
      await sceneSaver.flush();
      await saveScene(scnToSave);
      await reloadScenes();
    } catch (err) {
      reportError(err);
    }
  };

  const handleDeleteScene = async (id: number) => {
    if (!window.confirm(t('deleteSceneConfirm'))) return;
    try {
      sceneSaver.cancel(id);
      await apiDeleteScene(id, novelId);
      await reloadScenes();
    } catch (err) {
      reportError(err);
    }
  };

  const moveScene = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= scenes.length) return;
    const reordered = [...scenes];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setScenes(reordered.map((s, i) => ({ ...s, sort_order: i })));
    try {
      await reorderScenes(novelId, reordered.map((s) => s.id!).filter(Boolean));
    } catch (err) {
      reportError(err);
      await reloadScenes();
    }
  };

  // Chapters -----------------------------------------------------------
  const updateChapterLocal = (id: number, patch: Partial<Pick<Chapter, 'title' | 'content'>>) => {
    const current = chapters.find((c) => c.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setChapters((prev) => prev.map((c) => (c.id === id ? updated : c)));
    chapterSaver.schedule(id, updated);
  };

  const addChapter = async (title: string): Promise<number | null> => {
    try {
      const draft: Chapter = { novel_id: novelId, title, content: '', sort_order: chapters.length };
      const id = await saveChapter(draft);
      setChapters((prev) => [...prev, { ...draft, id }]);
      return id;
    } catch (err) {
      reportError(err);
      return null;
    }
  };

  const deleteChapter = async (id: number): Promise<boolean> => {
    try {
      chapterSaver.cancel(id);
      await apiDeleteChapter(id, novelId);
      setChapters((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      reportError(err);
      return false;
    }
  };

  const moveChapter = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= chapters.length) return;
    const reordered = [...chapters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setChapters(reordered.map((c, i) => ({ ...c, sort_order: i })));
    try {
      await reorderChapters(novelId, reordered.map((c) => c.id!).filter(Boolean));
    } catch (err) {
      reportError(err);
      setChapters(await getChapters(novelId));
    }
  };

  return {
    isLoaded,
    reportSaveStatus,
    reportError,
    saveIndicator,

    // Novel metadata
    novelDraft,
    updateNovelDraft,

    // Steps
    stepText: activeStepDraft.content_text,
    stepCompleted: activeStepDraft.is_completed,
    setStepText,
    setStepCompleted,
    getStepContent,

    // Characters
    characters,
    editingCharacter,
    setEditingCharacter,
    selectedCharIdStep5,
    setSelectedCharIdStep5,
    selectedCharIdStep7,
    setSelectedCharIdStep7,
    updateCharacterLocal,
    handleSaveCharacter,
    handleDeleteCharacter,

    // Scenes
    scenes,
    selectedSceneIdStep9,
    setSelectedSceneIdStep9,
    updateSceneLocal,
    handleSaveScene,
    handleDeleteScene,
    moveScene,

    // Chapters
    chapters,
    updateChapterLocal,
    addChapter,
    deleteChapter,
    moveChapter,
  };
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;
