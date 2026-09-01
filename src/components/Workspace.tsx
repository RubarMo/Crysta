import React, { useEffect, useState } from 'react';
import { Novel, StepProgress, Character, Scene, Chapter, saveStepProgress, saveCharacter, deleteCharacter, saveScene, deleteScene, getChapters } from '../lib';
import { WordCounter } from './WordCounter';
import { useLanguage } from '../LanguageContext';
import { StepReferenceCard } from './workspace/StepReferenceCard';
import { SceneMatrixView } from './workspace/SceneMatrixView';
import { WriteNovelTab } from './workspace/WriteNovelTab';
import { BookStudioTab } from './workspace/BookStudioTab';
import { 
  X,
  Plus, 
  Save, 
  Check, 
  Copy, 
  Edit3, 
  Trash2
} from 'lucide-react';

interface WorkspaceProps {
  activeNovel: Novel;
  onUpdateNovel: (novel: Novel) => void;
  stepsProgress: StepProgress[];
  onReloadSteps: () => void;
  activeStep: number;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  activeNovel,
  onUpdateNovel,
  stepsProgress,
  onReloadSteps,
  activeStep,
}) => {
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
      const { getCharacters: apiGetCharacters, getScenes: apiGetScenes } = await import('../lib');
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
    if (!activeNovel.id || activeStep === 0 || activeStep >= 11 || activeStep === 3 || activeStep === 5 || activeStep === 7 || activeStep === 8 || activeStep === 9 || activeStep === 10) return;

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
      const { updateNovel: apiUpdateNovel } = await import('../lib');
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

  // Render header with auto-save badge
  const renderStepHeader = (title: string, desc: string) => {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-3 border-[var(--border-ink)] mb-4 shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-heading font-black text-[var(--text-primary)]">
            {title}
          </h2>
          <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">
            {desc}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSaving ? (
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] animate-pulse">
              {t('statusSaving')}
            </span>
          ) : savedBadge ? (
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[var(--pastel-mint)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              {t('statusSaved')}
            </span>
          ) : null}

          {activeStep >= 1 && activeStep <= 10 && (
            <label className="flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stepCompleted}
                onChange={(e) => {
                  setStepCompleted(e.target.checked);
                  triggerSaveStepProgress(stepText, e.target.checked);
                }}
                className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
              />
              <span className="text-xs font-heading font-bold text-[var(--text-primary)]">
                {t('confirm')}
              </span>
            </label>
          )}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // TAB 11: WRITE NOVEL & CHAPTER DRAFTING
  // ----------------------------------------------------
  if (activeStep === 11) {
    return (
      <WriteNovelTab
        activeNovel={activeNovel}
        onUpdateNovel={onUpdateNovel}
        scenes={scenes}
        characters={characters}
        stepsProgress={stepsProgress}
        onAutoSaveStatus={(saving) => {
          setIsSaving(saving);
          if (!saving) {
            setSavedBadge(true);
            setTimeout(() => setSavedBadge(false), 2000);
          }
        }}
      />
    );
  }

  // ----------------------------------------------------
  // TAB 12: BOOK STUDIO PUBLISHING SUITE
  // ----------------------------------------------------
  if (activeStep === 12) {
    return (
      <BookStudioTab
        activeNovel={activeNovel}
        chapters={chapters}
        onAutoSaveStatus={(saving) => {
          setIsSaving(saving);
          if (!saving) {
            setSavedBadge(true);
            setTimeout(() => setSavedBadge(false), 2000);
          }
        }}
      />
    );
  }

  // ----------------------------------------------------
  // STEP 0: DASHBOARD
  // ----------------------------------------------------
  if (activeStep === 0) {
    const totalWordsCount = chapters.length > 0
      ? chapters.reduce((acc, c) => acc + (c.content.trim() ? c.content.trim().split(/\s+/).length : 0), 0)
      : scenes.reduce((acc, s) => acc + (s.actual_word_count || 0), 0);

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-6 select-text">
        {renderStepHeader(t('novelDashboardTitle'), t('novelDashboardDesc'))}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 border-3 border-[var(--border-ink)] bg-[var(--pastel-sky)] text-black shadow-[3px_3px_0px_var(--shadow-ink)]">
            <span className="text-[10px] font-heading font-black uppercase block">{t('statsActualWords')}</span>
            <span className="text-lg font-mono font-black">{totalWordsCount.toLocaleString()}</span>
          </div>

          <div className="p-3.5 border-3 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[3px_3px_0px_var(--shadow-ink)]">
            <span className="text-[10px] font-heading font-black uppercase block">{t('statsTargetWords')}</span>
            <span className="text-lg font-mono font-black">{novelTargetWords.toLocaleString()}</span>
          </div>

          <div className="p-3.5 border-3 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[3px_3px_0px_var(--shadow-ink)]">
            <span className="text-[10px] font-heading font-black uppercase block">{t('statsCharactersCount')}</span>
            <span className="text-lg font-mono font-black">{characters.length}</span>
          </div>

          <div className="p-3.5 border-3 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[3px_3px_0px_var(--shadow-ink)]">
            <span className="text-[10px] font-heading font-black uppercase block">{t('statsChaptersCount')}</span>
            <span className="text-lg font-mono font-black">{chapters.length}</span>
          </div>
        </div>

        {/* Novel Metadata Form */}
        <div className="p-5 border-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[4px_4px_0px_var(--shadow-ink)] space-y-4">
          <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase tracking-wider pb-2 border-b-2 border-[var(--border-ink)]">
            {t('novelInfoTitle')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelTitleLabel')}
              </label>
              <input
                type="text"
                value={novelTitle}
                onChange={(e) => setNovelTitle(e.target.value)}
                placeholder={t('novelTitlePlaceholder')}
                className="w-full text-xs p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelGenreLabel')}
              </label>
              <input
                type="text"
                value={novelGenre}
                onChange={(e) => setNovelGenre(e.target.value)}
                placeholder={t('novelGenrePlaceholder')}
                className="w-full text-xs p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelAudienceLabel')}
              </label>
              <input
                type="text"
                value={novelAudience}
                onChange={(e) => setNovelAudience(e.target.value)}
                placeholder={t('novelAudiencePlaceholder')}
                className="w-full text-xs p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelTargetWordsLabel')}
              </label>
              <input
                type="number"
                value={novelTargetWords}
                onChange={(e) => setNovelTargetWords(Number(e.target.value))}
                className="w-full text-xs p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t-2 border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={triggerSaveNovel}
              className="px-5 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('save')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 1: ONE-SENTENCE SUMMARY
  // ----------------------------------------------------
  if (activeStep === 1) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step1HeadTitle'), t('step1HeadDesc'))}

        <div className="p-3 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] text-xs font-sans space-y-1">
          <span className="font-heading font-black block">{t('step1RuleTitle')}</span>
          <p>• {t('step1Rule1')}</p>
          <p>• {t('step1Rule2')}</p>
          <p>• {t('step1Rule3')}</p>
        </div>

        <div className="space-y-2">
          <textarea
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            placeholder={t('step1Placeholder')}
            rows={4}
            className="w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] focus:outline-none"
          />
          <div className="flex justify-end">
            <WordCounter text={stepText} />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 2: ONE-PARAGRAPH SUMMARY
  // ----------------------------------------------------
  if (activeStep === 2) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step2HeadTitle'), t('step2HeadDesc'))}

        <StepReferenceCard
          stepNumber={1}
          stepTitle={t('step1Title')}
          contentText={getStepContent(1)}
        />

        <div className="p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] text-xs font-sans space-y-1">
          <span className="font-heading font-black block">{t('step2RuleTitle')}</span>
          <p>1. {t('step2Rule1')}</p>
          <p>2. {t('step2Rule2')}</p>
          <p>3. {t('step2Rule3')}</p>
          <p>4. {t('step2Rule4')}</p>
          <p>5. {t('step2Rule5')}</p>
        </div>

        <div className="space-y-2">
          <textarea
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            placeholder={t('step2Placeholder')}
            rows={6}
            className="w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] focus:outline-none"
          />
          <div className="flex justify-end">
            <WordCounter text={stepText} />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 3: CHARACTER SHEETS
  // ----------------------------------------------------
  if (activeStep === 3) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step3HeadTitle'), t('step3HeadDesc'))}

        <StepReferenceCard
          stepNumber={2}
          stepTitle={t('step2Title')}
          contentText={getStepContent(2)}
        />

        <div className="flex justify-between items-center pb-2 border-b-2 border-[var(--border-subtle)]">
          <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase">
            {t('charactersListTitle')} ({characters.length})
          </h3>
          <button
            type="button"
            onClick={() => setEditingCharacter({ novel_id: activeNovel.id, name: '', one_sentence_summary: '', motivation: '', goal: '', conflict: '', epiphany: '', one_paragraph_summary: '', full_synopsis: '' })}
            className="px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t('addCharacterBtn')}</span>
          </button>
        </div>

        {characters.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
            {t('noCharactersYet')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {characters.map((char) => (
              <div
                key={char.id}
                className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-sm font-heading font-black text-[var(--text-primary)] mb-1">
                    {char.name}
                  </h4>
                  {char.one_sentence_summary && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-1.5 font-medium">
                      <strong className="text-[var(--text-primary)]">{t('charSummaryLabel')}:</strong> {char.one_sentence_summary}
                    </p>
                  )}
                  {char.motivation && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      <strong className="text-[var(--text-primary)]">{t('charMotivationLabel')}:</strong> {char.motivation}
                    </p>
                  )}
                  {char.goal && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">
                      <strong className="text-[var(--text-primary)]">{t('charGoalLabel')}:</strong> {char.goal}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setEditingCharacter(char)}
                    className="p-1.5 border border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--pastel-yellow)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => char.id && handleDeleteCharacter(char.id)}
                    className="p-1.5 border border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Character Edit Modal */}
        {editingCharacter && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setEditingCharacter(null)}
          >
            <div 
              className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b-2 border-[var(--border-ink)] pb-2">
                <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">
                  {editingCharacter.id ? t('edit') : t('addCharacterBtn')}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCharacter(null)}
                  className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] transition-all cursor-pointer"
                  title={t('close')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('charNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={editingCharacter.name || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                    placeholder={t('charNamePlaceholder')}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('charSummaryLabel')}
                  </label>
                  <input
                    type="text"
                    value={editingCharacter.one_sentence_summary || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, one_sentence_summary: e.target.value })}
                    placeholder={t('charSummaryPlaceholder')}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('charMotivationLabel')}
                  </label>
                  <textarea
                    value={editingCharacter.motivation || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, motivation: e.target.value })}
                    placeholder={t('charMotivationPlaceholder')}
                    rows={2}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('charGoalLabel')}
                  </label>
                  <textarea
                    value={editingCharacter.goal || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, goal: e.target.value })}
                    placeholder={t('charGoalPlaceholder')}
                    rows={2}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('charConflictLabel')}
                  </label>
                  <textarea
                    value={editingCharacter.conflict || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, conflict: e.target.value })}
                    placeholder={t('charConflictPlaceholder')}
                    rows={2}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('charEpiphanyLabel')}
                  </label>
                  <textarea
                    value={editingCharacter.epiphany || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, epiphany: e.target.value })}
                    placeholder={t('charEpiphanyPlaceholder')}
                    rows={2}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-[var(--border-ink)]">
                <button
                  type="button"
                  onClick={() => setEditingCharacter(null)}
                  className="px-3 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCharacter(editingCharacter)}
                  className="px-4 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 4: ONE-PAGE SYNOPSIS
  // ----------------------------------------------------
  if (activeStep === 4) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step4HeadTitle'), t('step4HeadDesc'))}

        <StepReferenceCard
          stepNumber={2}
          stepTitle={t('step2Title')}
          contentText={getStepContent(2)}
        />

        <div className="space-y-2">
          <textarea
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            placeholder={t('step4Placeholder')}
            rows={12}
            className="w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] focus:outline-none"
          />
          <div className="flex justify-end">
            <WordCounter text={stepText} />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 5: CHARACTER SYNOPSES
  // ----------------------------------------------------
  if (activeStep === 5) {
    const selectedChar = characters.find(c => c.id === selectedCharIdStep5) || null;

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step5HeadTitle'), t('step5HeadDesc'))}

        <StepReferenceCard
          stepNumber={4}
          stepTitle={t('step4Title')}
          contentText={getStepContent(4)}
          characterNames={characters.map(c => c.name)}
        />

        {characters.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
            {t('pleaseAddCharsFirst')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-heading font-black text-[var(--text-primary)]">
                {t('selectCharForPov')}
              </label>
              <select
                value={selectedCharIdStep5 || ''}
                onChange={(e) => setSelectedCharIdStep5(Number(e.target.value))}
                className="text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedChar && (
              <div className="space-y-3">
                {/* Character Step 3 Context Reference Box */}
                <div className="p-3.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] text-xs space-y-1.5">
                  <span className="font-heading font-black text-xs block">
                    {t('charRefBioLabel')} {selectedChar.name}
                  </span>
                  {selectedChar.one_sentence_summary && (
                    <p className="font-medium">
                      <strong>{t('charRefStoryline')}</strong> {selectedChar.one_sentence_summary}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] border-t border-black/15">
                    {selectedChar.motivation && (
                      <div><strong>{t('charMotivationLabel')}:</strong> {selectedChar.motivation}</div>
                    )}
                    {selectedChar.goal && (
                      <div><strong>{t('charGoalLabel')}:</strong> {selectedChar.goal}</div>
                    )}
                    {selectedChar.conflict && (
                      <div><strong>{t('charConflictLabel')}:</strong> {selectedChar.conflict}</div>
                    )}
                    {selectedChar.epiphany && (
                      <div><strong>{t('charEpiphanyLabel')}:</strong> {selectedChar.epiphany}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                    {t('charSynopsisLabel')}
                  </label>
                  <textarea
                    value={selectedChar.one_paragraph_summary || ''}
                    onChange={(e) => {
                      const updated = characters.map(c => c.id === selectedChar.id ? { ...c, one_paragraph_summary: e.target.value } : c);
                      setCharacters(updated);
                    }}
                    onBlur={() => handleSaveCharacter(selectedChar)}
                    placeholder={t('charPovPlaceholder')}
                    rows={10}
                    className="w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] focus:outline-none leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <WordCounter text={selectedChar.one_paragraph_summary || ''} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 6: FOUR-PAGE SYNOPSIS
  // ----------------------------------------------------
  if (activeStep === 6) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step6HeadTitle'), t('step6HeadDesc'))}

        <StepReferenceCard
          stepNumber={4}
          stepTitle={t('step4Title')}
          contentText={getStepContent(4)}
        />

        <div className="space-y-2">
          <textarea
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            placeholder={t('step6Placeholder')}
            rows={16}
            className="w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] focus:outline-none"
          />
          <div className="flex justify-end">
            <WordCounter text={stepText} />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 7: DETAILED CHARACTER CHARTS
  // ----------------------------------------------------
  if (activeStep === 7) {
    const activeCharId = selectedCharIdStep7 || (characters.length > 0 ? characters[0].id : null);
    const selectedChar = characters.find(c => c.id === activeCharId) || (characters.length > 0 ? characters[0] : null);

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step7HeadTitle'), t('step7HeadDesc'))}

        {characters.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
            {t('pleaseAddCharsFirst')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-heading font-black text-[var(--text-primary)]">
                {t('selectCharForDetails')}
              </label>
              <select
                value={selectedChar?.id || ''}
                onChange={(e) => setSelectedCharIdStep7(Number(e.target.value))}
                className="text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedChar && (
              <div className="space-y-3">
                {/* Character Step 3 Context Reference Box */}
                <div className="p-3.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] text-xs space-y-1.5">
                  <span className="font-heading font-black text-xs block">
                    {t('charRefBioLabel')} {selectedChar.name}
                  </span>
                  {selectedChar.one_sentence_summary && (
                    <p className="font-medium">
                      <strong>{t('charRefStoryline')}</strong> {selectedChar.one_sentence_summary}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] border-t border-black/15">
                    {selectedChar.motivation && (
                      <div><strong>{t('charMotivationLabel')}:</strong> {selectedChar.motivation}</div>
                    )}
                    {selectedChar.goal && (
                      <div><strong>{t('charGoalLabel')}:</strong> {selectedChar.goal}</div>
                    )}
                    {selectedChar.conflict && (
                      <div><strong>{t('charConflictLabel')}:</strong> {selectedChar.conflict}</div>
                    )}
                    {selectedChar.epiphany && (
                      <div><strong>{t('charEpiphanyLabel')}:</strong> {selectedChar.epiphany}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                    {t('fullSynopsisLabel')}
                  </label>
                  <textarea
                    value={selectedChar.full_synopsis || ''}
                    onChange={(e) => {
                      const updated = characters.map(c => c.id === selectedChar.id ? { ...c, full_synopsis: e.target.value } : c);
                      setCharacters(updated);
                    }}
                    onBlur={() => handleSaveCharacter(selectedChar)}
                    placeholder={t('fullSynopsisPlaceholder')}
                    rows={12}
                    className="w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] focus:outline-none leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <WordCounter text={selectedChar.full_synopsis || ''} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 8: SCENE MATRIX, KANBAN & LIST
  // ----------------------------------------------------
  if (activeStep === 8) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step8HeadTitle'), t('step8HeadDesc'))}

        <StepReferenceCard
          stepNumber={6}
          stepTitle={t('step6Title')}
          contentText={getStepContent(6)}
        />

        <SceneMatrixView
          novelId={activeNovel.id!}
          scenes={scenes}
          characters={characters}
          onSaveScene={handleSaveScene}
          onDeleteScene={handleDeleteScene}
          onReload={loadData}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 9: SCENE OUTLINES
  // ----------------------------------------------------
  if (activeStep === 9) {
    const activeSceneId = selectedSceneIdStep9 || (scenes.length > 0 ? scenes[0].id : null);
    const selectedScene = scenes.find(s => s.id === activeSceneId) || (scenes.length > 0 ? scenes[0] : null);
    const povChar = selectedScene?.pov_character_id ? characters.find(c => c.id === selectedScene.pov_character_id) : null;

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step9HeadTitle'), t('step9HeadDesc'))}

        {scenes.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
            {t('pleaseAddScenesFirst')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-heading font-black text-[var(--text-primary)]">
                {t('scenesListLabel')}:
              </label>
              <select
                value={selectedScene?.id || ''}
                onChange={(e) => setSelectedSceneIdStep9(Number(e.target.value))}
                className="text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer"
              >
                {scenes.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    #{idx + 1}: {s.setting || t('uncategorized')}
                  </option>
                ))}
              </select>
            </div>

            {selectedScene && (
              <div className="space-y-3">
                {/* Step 8 Scene Reference Context Box */}
                <div className="p-3.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-black text-xs">
                      {t('sceneNumber')} {scenes.findIndex(s => s.id === selectedScene.id) + 1}: {selectedScene.setting || t('uncategorized')}
                    </span>
                    {povChar && (
                      <span className="px-2 py-0.5 font-heading font-bold text-[10px] bg-black text-white border border-black">
                        {t('scenePovLabel')}: {povChar.name}
                      </span>
                    )}
                  </div>
                  {selectedScene.what_happens && (
                    <p className="font-medium text-xs leading-relaxed">
                      <strong>{t('sceneRefSummaryLabel')}</strong> {selectedScene.what_happens}
                    </p>
                  )}
                  <div className="flex gap-4 pt-1 text-[11px] border-t border-black/15">
                    {selectedScene.plot_thread && (
                      <div><strong>{t('scenePlotLabel')}:</strong> {selectedScene.plot_thread}</div>
                    )}
                    <div><strong>{t('sceneExpectedWordsLabel')}:</strong> {selectedScene.expected_word_count}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                    {t('sceneNarrativeTextareaLabel')}
                  </label>
                  <textarea
                    value={selectedScene.narrative_outline || ''}
                    onChange={(e) => {
                      const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, narrative_outline: e.target.value } : s);
                      setScenes(updated);
                    }}
                    onBlur={() => handleSaveScene(selectedScene)}
                    placeholder={t('sceneNarrativePlaceholder')}
                    rows={12}
                    className="w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] focus:outline-none leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <WordCounter text={selectedScene.narrative_outline || ''} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 10: DRAFT & EXPORT
  // ----------------------------------------------------
  if (activeStep === 10) {
    const mdExport = `# ${activeNovel.title}\n\n` +
      `**${t('exportGenreLabel')}:** ${activeNovel.genre} | **${t('exportAudienceLabel')}:** ${activeNovel.target_audience}\n\n` +
      `## 1. ${t('step1Title')}\n${getStepContent(1) || t('exportNotWritten')}\n\n` +
      `## 2. ${t('step2Title')}\n${getStepContent(2) || t('exportNotWritten')}\n\n` +
      `## 3. ${t('step3Title')}\n` +
      characters.map(c => `### ${c.name}\n` +
        (c.one_sentence_summary ? `- **${t('exportCharOneSentence')}:** ${c.one_sentence_summary}\n` : '') +
        `- **${t('exportCharMotivation')}:** ${c.motivation}\n` +
        `- **${t('exportCharGoal')}:** ${c.goal}\n` +
        `- **${t('exportCharConflict')}:** ${c.conflict}\n` +
        `- **${t('exportCharEpiphany')}:** ${c.epiphany}\n` +
        (c.one_paragraph_summary ? `- **${t('exportCharOneParagraph')}:** ${c.one_paragraph_summary}\n` : '')
      ).join('\n') +
      `\n## 4. ${t('step4Title')}\n${getStepContent(4) || t('exportNotWritten')}\n\n` +
      `## 6. ${t('step6Title')}\n${getStepContent(6) || t('exportNotWritten')}\n\n` +
      `## 8. ${t('step8Title')}\n` +
      scenes.map((s, i) => `### ${t('sceneNumber')} ${i + 1}: ${s.setting}\n` +
        (s.pov_character_id ? `- **${t('exportScenePOV')}:** ${characters.find(c => c.id === s.pov_character_id)?.name || t('unassignedPOV')}\n` : '') +
        (s.plot_thread ? `- **${t('exportScenePlot')}:** ${s.plot_thread}\n` : '') +
        `- **${t('exportSceneWhatHappens')}:** ${s.what_happens}\n` +
        (s.narrative_outline ? `- **${t('exportSceneOutline')}:** ${s.narrative_outline}\n` : '') +
        `- **${t('exportSceneWords')}:** ${s.expected_word_count}\n`
      ).join('\n');

    const handleCopy = () => {
      navigator.clipboard.writeText(mdExport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step10HeadTitle'), t('step10HeadDesc'))}

        <div className="flex justify-between items-center pb-2 border-b-2 border-[var(--border-subtle)]">
          <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase">
            {t('exportConfirmLabel')}
          </h3>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('exportCopied') : t('exportCopyBtn')}</span>
          </button>
        </div>

        <pre className="p-4 bg-[var(--bg-surface-raised)] border-3 border-[var(--border-ink)] text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-[4px_4px_0px_var(--shadow-ink)] text-[var(--text-primary)]">
          {mdExport}
        </pre>
      </div>
    );
  }

  return null;
};
