import { useEffect, useState } from 'react';
import {
  Novel,
  StepProgress,
  Character,
  Scene,
  Chapter,
  saveStepProgress,
  saveCharacter,
  deleteCharacter,
  saveScene,
  deleteScene,
  getChapters,
  getCharacters as apiGetCharacters,
  getScenes as apiGetScenes,
  updateNovel as apiUpdateNovel,
} from '../lib';
import { useLanguage } from '../LanguageContext';

export interface UseWorkspaceDataProps {
  activeNovel: Novel;
  onUpdateNovel: (novel: Novel) => void;
  stepsProgress: StepProgress[];
  onReloadSteps: () => void;
  activeStep: number;
}

export function useWorkspaceData({
  activeNovel,
  onUpdateNovel,
  stepsProgress,
  onReloadSteps,
  activeStep,
}: UseWorkspaceDataProps) {
  const { t } = useLanguage();

  // Local states for novel attributes
  const [novelTitle, setNovelTitle] = useState(activeNovel.title);
  const [novelGenre, setNovelGenre] = useState(activeNovel.genre);
  const [novelAudience, setNovelAudience] = useState(activeNovel.target_audience);
  const [novelTargetWords, setNovelTargetWords] = useState(activeNovel.target_word_count);

  // Sync state with activeNovel changes
  useEffect(() => {
    setNovelTitle(activeNovel.title);
    setNovelGenre(activeNovel.genre);
    setNovelAudience(activeNovel.target_audience);
    setNovelTargetWords(activeNovel.target_word_count);
  }, [activeNovel]);

  const activeStepProgress = stepsProgress.find(p => p.step_number === activeStep) || {
    novel_id: activeNovel.id!,
    step_number: activeStep,
    content_text: '',
    is_completed: false,
  };

  const [stepText, setStepText] = useState(activeStepProgress.content_text);
  const [stepCompleted, setStepCompleted] = useState(activeStepProgress.is_completed);

  // Characters, Scenes, and Chapters State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [editingCharacter, setEditingCharacter] = useState<Partial<Character> | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Top-level states for Step 5, 7, and 9
  const [selectedCharIdStep5, setSelectedCharIdStep5] = useState<number | null>(null);
  const [selectedCharIdStep7, setSelectedCharIdStep7] = useState<number | null>(null);
  const [selectedSceneIdStep9, setSelectedSceneIdStep9] = useState<number | null>(null);

  // Copy Clipboard State & Auto-Save status
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  // Sync step local state on tab switch
  useEffect(() => {
    const current = stepsProgress.find(p => p.step_number === activeStep);
    setStepText(current ? current.content_text : '');
    setStepCompleted(current ? current.is_completed : false);
  }, [activeStep, stepsProgress]);

  const loadData = async () => {
    if (!activeNovel.id) return;
    try {
      const chars = await apiGetCharacters(activeNovel.id);
      const scns = await apiGetScenes(activeNovel.id);
      const chaps = await getChapters(activeNovel.id);
      setCharacters(chars);
      setScenes(scns);
      setChapters(chaps);
      if (chars.length > 0) {
        if (!selectedCharIdStep5) setSelectedCharIdStep5(chars[0].id || null);
        if (!selectedCharIdStep7) setSelectedCharIdStep7(chars[0].id || null);
      }
      if (scns.length > 0 && !selectedSceneIdStep9) {
        setSelectedSceneIdStep9(scns[0].id || null);
      }
    } catch (err) {
      console.error('Error loading workspace data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeNovel.id]);

  // Debounced auto-save step progress for simple text steps (1, 2, 4, 6)
  useEffect(() => {
    if (
      !activeNovel.id ||
      activeStep === 0 ||
      activeStep >= 11 ||
      activeStep === 3 ||
      activeStep === 5 ||
      activeStep === 7 ||
      activeStep === 8 ||
      activeStep === 9 ||
      activeStep === 10
    ) {
      return;
    }

    setIsSaving(true);
    const timer = setTimeout(async () => {
      try {
        await saveStepProgress(activeNovel.id!, activeStep, stepText, stepCompleted);
        setIsSaving(false);
        setSavedBadge(true);
        setTimeout(() => setSavedBadge(false), 1800);
        onReloadSteps();
      } catch (err) {
        setIsSaving(false);
        console.error('Failed to auto-save step progress:', err);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [stepText, stepCompleted, activeStep, activeNovel.id]);

  // Save Step Progress manually / immediate
  const triggerSaveStepProgress = async (text: string, completed: boolean) => {
    if (!activeNovel.id) return;
    try {
      setIsSaving(true);
      await saveStepProgress(activeNovel.id, activeStep, text, completed);
      setIsSaving(false);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
      onReloadSteps();
    } catch (err: any) {
      setIsSaving(false);
      console.error('Failed to save step progress', err);
    }
  };

  // Save Novel info handler
  const triggerSaveNovel = async () => {
    if (!activeNovel.id) return;
    try {
      await apiUpdateNovel(
        activeNovel.id,
        novelTitle,
        novelGenre,
        novelAudience,
        novelTargetWords
      );
      onUpdateNovel({
        ...activeNovel,
        title: novelTitle,
        genre: novelGenre,
        target_audience: novelAudience,
        target_word_count: novelTargetWords,
      });
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    } catch (err: any) {
      console.error('Failed to update novel', err);
      alert(`${t('error')}: ${err}`);
    }
  };

  // Character Handlers
  const handleSaveCharacter = async (char: Partial<Character>) => {
    if (!activeNovel.id) return;
    try {
      const charToSave: Character = {
        id: char.id,
        novel_id: activeNovel.id,
        name: char.name || 'شخصية جديدة',
        one_sentence_summary: char.one_sentence_summary || '',
        motivation: char.motivation || '',
        goal: char.goal || '',
        conflict: char.conflict || '',
        epiphany: char.epiphany || '',
        one_paragraph_summary: char.one_paragraph_summary || '',
        full_synopsis: char.full_synopsis || '',
      };
      await saveCharacter(charToSave);
      setEditingCharacter(null);
      await loadData();
    } catch (err) {
      console.error('Failed to save character', err);
    }
  };

  const handleDeleteCharacter = async (id: number) => {
    if (!window.confirm(t('deleteCharConfirm'))) return;
    try {
      await deleteCharacter(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete character', err);
    }
  };

  // Scene Handlers
  const handleSaveScene = async (scene: Partial<Scene>) => {
    if (!activeNovel.id) return;
    try {
      const scnToSave: Scene = {
        id: scene.id,
        novel_id: activeNovel.id,
        pov_character_id: scene.pov_character_id || null,
        setting: scene.setting || '',
        plot_thread: scene.plot_thread || '',
        what_happens: scene.what_happens || '',
        narrative_outline: scene.narrative_outline || '',
        expected_word_count: scene.expected_word_count || 1000,
        actual_word_count: scene.actual_word_count || 0,
        sort_order: scene.sort_order,
      };
      await saveScene(scnToSave);
      await loadData();
    } catch (err) {
      console.error('Failed to save scene', err);
    }
  };

  const handleDeleteScene = async (id: number) => {
    if (!activeNovel.id) return;
    if (!window.confirm(t('deleteSceneConfirm'))) return;
    try {
      await deleteScene(id, activeNovel.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete scene', err);
    }
  };

  // Helper for previous step content
  const getStepContent = (stepNum: number) => {
    const p = stepsProgress.find(s => s.step_number === stepNum);
    return p ? p.content_text : '';
  };

  const handleAutoSaveStatus = (saving: boolean) => {
    setIsSaving(saving);
    if (!saving) {
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    }
  };

  return {
    // Novel metadata
    novelTitle,
    setNovelTitle,
    novelGenre,
    setNovelGenre,
    novelAudience,
    setNovelAudience,
    novelTargetWords,
    setNovelTargetWords,
    triggerSaveNovel,

    // Step state
    stepText,
    setStepText,
    stepCompleted,
    setStepCompleted,
    triggerSaveStepProgress,
    getStepContent,

    // Characters
    characters,
    setCharacters,
    editingCharacter,
    setEditingCharacter,
    selectedCharIdStep5,
    setSelectedCharIdStep5,
    selectedCharIdStep7,
    setSelectedCharIdStep7,
    handleSaveCharacter,
    handleDeleteCharacter,

    // Scenes
    scenes,
    setScenes,
    selectedSceneIdStep9,
    setSelectedSceneIdStep9,
    handleSaveScene,
    handleDeleteScene,

    // Chapters
    chapters,

    // Utilities & status
    loadData,
    copied,
    setCopied,
    isSaving,
    savedBadge,
    handleAutoSaveStatus,
  };
}
