import React, { useEffect, useState } from 'react';
import { Novel, StepProgress, Character, Scene, saveStepProgress, saveCharacter, deleteCharacter, saveScene, deleteScene } from '../lib';
import { WordCounter } from './WordCounter';
import { useLanguage } from '../LanguageContext';
import { LocaleKeys } from '../locales';
import { 
  Plus, 
  Save, 
  Check, 
  Copy, 
  Edit3, 
  Trash2, 
  User, 
  Layers, 
  Film, 
  BookOpen
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
  const { language, t } = useLanguage();

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

  // Characters and Scenes State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [editingCharacter, setEditingCharacter] = useState<Partial<Character> | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [editingScene, setEditingScene] = useState<Partial<Scene> | null>(null);

  // Top-level states for Step 5, 7, and 9
  const [selectedCharIdStep5, setSelectedCharIdStep5] = useState<number | null>(null);
  const [selectedCharIdStep7, setSelectedCharIdStep7] = useState<number | null>(null);
  const [selectedSceneIdStep9, setSelectedSceneIdStep9] = useState<number | null>(null);

  // Copy Clipboard State
  const [copied, setCopied] = useState(false);
  const [isNovelSaved, setIsNovelSaved] = useState(false);

  // Sync step local state on tab switch
  useEffect(() => {
    const current = stepsProgress.find(p => p.step_number === activeStep);
    setStepText(current ? current.content_text : '');
    setStepCompleted(current ? current.is_completed : false);
  }, [activeStep, stepsProgress]);

  const loadCharactersAndScenes = async () => {
    if (!activeNovel.id) return;
    try {
      const { getCharacters: apiGetCharacters, getScenes: apiGetScenes } = await import('../lib');
      const chars = await apiGetCharacters(activeNovel.id);
      const scns = await apiGetScenes(activeNovel.id);
      setCharacters(chars);
      setScenes(scns);
    } catch (err) {
      console.error('Error loading characters or scenes', err);
    }
  };

  useEffect(() => {
    loadCharactersAndScenes();
  }, [activeNovel.id]);

  // Save Step Progress handler
  const triggerSaveStepProgress = async (text: string, completed: boolean) => {
    if (!activeNovel.id) return;
    try {
      await saveStepProgress(activeNovel.id, activeStep, text, completed);
      onReloadSteps();
    } catch (err: any) {
      if (err && String(err).includes("No active project loaded")) {
        console.warn('Ignored step progress save: project is closed');
        return;
      }
      console.error('Failed to save step progress', err);
      alert(`${t('error')}: ${err}`);
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
      setIsNovelSaved(true);
      setTimeout(() => setIsNovelSaved(false), 2000);
    } catch (err: any) {
      if (err && String(err).includes("No active project loaded")) {
        console.warn('Ignored novel save: project is closed');
        return;
      }
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
        name: char.name || (language === 'ar' ? 'شخصية جديدة' : 'New Character'),
        motivation: char.motivation || '',
        goal: char.goal || '',
        conflict: char.conflict || '',
        epiphany: char.epiphany || '',
        one_paragraph_summary: char.one_paragraph_summary || '',
        full_synopsis: char.full_synopsis || '',
      };
      await saveCharacter(charToSave);
      setEditingCharacter(null);
      loadCharactersAndScenes();
    } catch (err) {
      console.error('Failed to save character', err);
    }
  };

  const handleDeleteCharacter = async (id: number) => {
    if (confirm(t('deleteCharConfirm'))) {
      try {
        await deleteCharacter(id);
        loadCharactersAndScenes();
      } catch (err) {
        console.error('Failed to delete character', err);
      }
    }
  };

  // Scene Handlers
  const handleSaveScene = async (scn: Partial<Scene>) => {
    if (!activeNovel.id) return;
    try {
      const scnToSave: Scene = {
        id: scn.id,
        novel_id: activeNovel.id,
        pov_character_id: scn.pov_character_id || null,
        setting: scn.setting || '',
        plot_thread: scn.plot_thread || '',
        what_happens: scn.what_happens || '',
        expected_word_count: scn.expected_word_count || 0,
        actual_word_count: scn.actual_word_count || 0,
      };
      await saveScene(scnToSave);
      setEditingScene(null);
      loadCharactersAndScenes();
      
      const updatedScenes = scenes.map(s => s.id === scn.id ? { ...s, ...scnToSave } : s);
      const totalWords = updatedScenes.reduce((sum, s) => sum + (s.actual_word_count || 0), 0);
      onUpdateNovel({
        ...activeNovel,
        current_word_count: totalWords
      });
    } catch (err) {
      console.error('Failed to save scene', err);
    }
  };

  const handleDeleteScene = async (id: number) => {
    if (confirm(t('deleteSceneConfirm'))) {
      try {
        await deleteScene(id, activeNovel.id!);
        loadCharactersAndScenes();
        
        const totalWords = scenes.filter(s => s.id !== id).reduce((sum, s) => sum + (s.actual_word_count || 0), 0);
        onUpdateNovel({
          ...activeNovel,
          current_word_count: totalWords
        });
      } catch (err) {
        console.error('Failed to delete scene', err);
      }
    }
  };

  const getStepText = (stepNum: number) => {
    const step = stepsProgress.find(p => p.step_number === stepNum);
    return step ? step.content_text : '';
  };

  const handleCopyMarkdown = (markdown: string) => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExportMarkdown = () => {
    let md = `# ${t('exportNovelLabel')}: ${activeNovel.title}\n`;
    md += `**${t('exportGenreLabel')}:** ${activeNovel.genre}\n`;
    md += `**${t('exportAudienceLabel')}:** ${activeNovel.target_audience}\n`;
    md += `**${t('exportTargetWordsLabel')}:** ${activeNovel.target_word_count} ${t('words')}\n`;
    md += `**${t('exportActualWordsLabel')}:** ${activeNovel.current_word_count} ${t('words')}\n\n`;

    md += `## ${t('step')} 1: ${t('step1Title')}\n`;
    md += `${getStepText(1) || `_${t('exportNotWritten')}_`}\n\n`;

    md += `## ${t('step')} 2: ${t('step2Title')}\n`;
    md += `${getStepText(2) || `_${t('exportNotWritten')}_`}\n\n`;

    md += `## ${t('step')} 4: ${t('step4Title')}\n`;
    md += `${getStepText(4) || `_${t('exportNotWritten')}_`}\n\n`;

    md += `## ${t('step')} 6: ${t('step6Title')}\n`;
    md += `${getStepText(6) || `_${t('exportNotWritten')}_`}\n\n`;

    md += `## ${t('step3Title')} & ${t('charChartsTitle')} (${t('step')} 3, 5, 7)\n`;
    if (characters.length === 0) {
      md += `_${t('exportNoChars')}_\n\n`;
    } else {
      characters.forEach((char) => {
        md += `### ${char.name}\n`;
        md += `- **${t('exportCharMotivation')}:** ${char.motivation || '_'}\n`;
        md += `- **${t('exportCharGoal')}:** ${char.goal || '_'}\n`;
        md += `- **${t('exportCharConflict')}:** ${char.conflict || '_'}\n`;
        md += `- **${t('exportCharEpiphany')}:** ${char.epiphany || '_'}\n`;
        md += `- **${t('exportCharOneParagraph')}:**\n${char.one_paragraph_summary || '_'}\n`;
        md += `- **${t('exportCharFullSynopsis')}:**\n${char.full_synopsis || '_'}\n\n`;
      });
    }

    md += `## ${t('step8Title')} & ${t('step9Title')} (${t('step')} 8, 9)\n`;
    if (scenes.length === 0) {
      md += `_${t('exportNoScenes')}_\n\n`;
    } else {
      scenes.forEach((scn, idx) => {
        const povName = characters.find(c => c.id === scn.pov_character_id)?.name || t('sceneNotPlanned');
        md += `### ${t('sceneNumber')} ${idx + 1}: ${scn.setting || t('sceneNotPlanned')}\n`;
        md += `- **${t('exportScenePOV')}:** ${povName}\n`;
        md += `- **${t('exportScenePlot')}:** ${scn.plot_thread || '_'}\n`;
        md += `- **${t('exportSceneWords')}:** ${scn.expected_word_count} | **${t('exportSceneActual')}:** ${scn.actual_word_count}\n`;
        md += `- **${t('exportSceneWhatHappens')}:**\n${scn.what_happens || '_'}\n\n`;
      });
    }

    return md;
  };

  // ----------------------------------------------------
  // STEP 0: NOVEL DASHBOARD
  // ----------------------------------------------------
  if (activeStep === 0) {
    const progressPercent = activeNovel.target_word_count > 0 
      ? Math.min(Math.round((activeNovel.current_word_count / activeNovel.target_word_count) * 100), 100) 
      : 0;

    return (
      <div className="flex-1 overflow-y-auto w-full p-6 sm:p-8 max-w-4xl mx-auto space-y-6 nb-dots">
        {/* Header */}
        <header className="border-b-3 border-[var(--border-ink)] pb-4">
          <h1 className="text-xl sm:text-2xl font-heading font-black text-[var(--text-primary)]">
            {t('novelDashboardTitle')}
          </h1>
          <p className="text-xs font-body font-medium text-[var(--text-secondary)] mt-1">
            {t('novelDashboardDesc')}
          </p>
        </header>

        {/* Word Count Progress Box */}
        <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[5px_5px_0px_var(--shadow-ink)] p-5 space-y-3">
          <div className="flex justify-between items-center text-xs font-heading font-black">
            <span className="text-[var(--text-secondary)] uppercase tracking-wider">{t('writingProgress')}</span>
            <span className="font-mono bg-[var(--pastel-yellow)] text-black px-2 py-0.5 border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
              {activeNovel.current_word_count} / {activeNovel.target_word_count} {t('words')} ({progressPercent}%)
            </span>
          </div>
          {/* Saturated Progress Bar */}
          <div className="w-full bg-[var(--bg-surface-raised)] h-4 border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden">
            <div 
              className="bg-[var(--pastel-mint)] h-full transition-all duration-300 border-e-2 border-[var(--border-ink)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Novel Info Form Card */}
        <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[5px_5px_0px_var(--shadow-ink)] p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-[var(--border-subtle)]">
            <span className="p-1.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
              <BookOpen className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-heading font-black text-[var(--text-primary)] uppercase tracking-wider">
              {t('novelInfoTitle')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                {t('novelTitleLabel')}
              </label>
              <input
                type="text"
                value={novelTitle}
                onChange={(e) => setNovelTitle(e.target.value)}
                onBlur={triggerSaveNovel}
                placeholder={t('novelTitlePlaceholder')}
                className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                {t('novelGenreLabel')}
              </label>
              <input
                type="text"
                value={novelGenre}
                onChange={(e) => setNovelGenre(e.target.value)}
                onBlur={triggerSaveNovel}
                placeholder={t('novelGenrePlaceholder')}
                className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                {t('novelAudienceLabel')}
              </label>
              <input
                type="text"
                value={novelAudience}
                onChange={(e) => setNovelAudience(e.target.value)}
                onBlur={triggerSaveNovel}
                placeholder={t('novelAudiencePlaceholder')}
                className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                {t('novelTargetWordsLabel')}
              </label>
              <input
                type="number"
                value={novelTargetWords || ''}
                onChange={(e) => setNovelTargetWords(Number(e.target.value) || 0)}
                onBlur={triggerSaveNovel}
                className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-mono font-bold shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t-2 border-[var(--border-subtle)]">
            <button
              onClick={triggerSaveNovel}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-heading font-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_var(--shadow-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer select-none ${
                isNovelSaved 
                  ? 'bg-[var(--pastel-mint)] text-black' 
                  : 'bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]'
              }`}
            >
              {isNovelSaved ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{language === 'ar' ? 'تم الحفظ!' : 'Saved!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>{language === 'ar' ? 'حفظ معلومات الرواية' : 'Save Novel Info'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Saturated Stat Boxes (Strict solid black text invariant) */}
        <div className="space-y-3">
          <h3 className="text-xs font-heading font-black uppercase tracking-wider text-[var(--text-secondary)]">
            {t('statsTitle')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Characters Count Stat */}
            <div className="p-4 border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] bg-[var(--pastel-sky)] transition-transform hover:-translate-y-0.5 select-none">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-heading font-black text-black uppercase tracking-wider truncate">
                  {t('statsCharactersCount')}
                </span>
                <User className="w-4 h-4 text-black shrink-0" />
              </div>
              <p className="text-3xl font-mono font-black text-black mt-2">{characters.length}</p>
            </div>

            {/* Scenes Planned Stat */}
            <div className="p-4 border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] bg-[var(--pastel-lavender)] transition-transform hover:-translate-y-0.5 select-none">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-heading font-black text-black uppercase tracking-wider truncate">
                  {t('statsScenesPlanned')}
                </span>
                <Layers className="w-4 h-4 text-black shrink-0" />
              </div>
              <p className="text-3xl font-mono font-black text-black mt-2">{scenes.length}</p>
            </div>

            {/* Scenes Completed Stat */}
            <div className="p-4 border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] bg-[var(--pastel-mint)] transition-transform hover:-translate-y-0.5 select-none">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-heading font-black text-black uppercase tracking-wider truncate">
                  {t('statsScenesDone')}
                </span>
                <Film className="w-4 h-4 text-black shrink-0" />
              </div>
              <p className="text-3xl font-mono font-black text-black mt-2">
                {scenes.filter(s => s.actual_word_count > 0).length} / {scenes.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // UNIFIED HEADER FOR STEPS 1-10
  // ----------------------------------------------------
  const stepTitlesMap: Record<number, { titleKey: LocaleKeys; descKey: LocaleKeys; limit?: number; hasRef?: number }> = {
    1: { titleKey: 'step1Title', descKey: 'step1Desc', limit: 50 },
    2: { titleKey: 'step2Title', descKey: 'step2Desc', hasRef: 1 },
    3: { titleKey: 'step3Title', descKey: 'charactersDesc' },
    4: { titleKey: 'step4Title', descKey: 'step4Desc', hasRef: 2 },
    5: { titleKey: 'step5Title', descKey: 'charSynopsesDesc' },
    6: { titleKey: 'step6Title', descKey: 'step6Desc', hasRef: 4 },
    7: { titleKey: 'step7Title', descKey: 'charChartsDesc' },
    8: { titleKey: 'step8Title', descKey: 'scenesDesc' },
    9: { titleKey: 'step9Title', descKey: 'sceneNarrativesDesc' },
    10: { titleKey: 'step10Title', descKey: 'exportDesc' },
  };

  const meta = stepTitlesMap[activeStep];

  const renderHeaderActions = () => {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Neubrutalist Checkbox */}
        <button
          onClick={() => {
            const nextVal = !stepCompleted;
            setStepCompleted(nextVal);
            const isWritingStep = activeStep === 1 || activeStep === 2 || activeStep === 4 || activeStep === 6;
            triggerSaveStepProgress(isWritingStep ? stepText : '', nextVal);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none text-xs font-heading font-bold"
        >
          <span className={`w-4 h-4 border-2 border-[var(--border-ink)] flex items-center justify-center ${
            stepCompleted ? 'bg-[var(--pastel-mint)] text-black' : 'bg-[var(--bg-surface)]'
          }`}>
            {stepCompleted && <Check className="w-3 h-3 stroke-[3]" />}
          </span>
          <span>{t('markAsCompleted')}</span>
        </button>

        {/* Step 3: Add Character Action */}
        {activeStep === 3 && !editingCharacter && (
          <button
            onClick={() => setEditingCharacter({ name: '', motivation: '', goal: '', conflict: '', epiphany: '', one_paragraph_summary: '', full_synopsis: '' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-sky)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_var(--shadow-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t('addCharacterBtn')}</span>
          </button>
        )}

        {/* Step 8: Add Scene Action */}
        {activeStep === 8 && !editingScene && (
          <button
            onClick={() => setEditingScene({ pov_character_id: null, setting: '', plot_thread: '', what_happens: '', expected_word_count: 500, actual_word_count: 0 })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_var(--shadow-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t('addSceneBtn')}</span>
          </button>
        )}

        {/* Step 10: Copy Markdown Action */}
        {activeStep === 10 && (
          <button
            onClick={() => handleCopyMarkdown(getExportMarkdown())}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_var(--shadow-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('copyMarkdown')}</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  const renderStepHeader = () => {
    if (!meta) return null;
    return (
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-3 border-[var(--border-ink)] pb-3.5 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-heading font-black text-[var(--text-primary)]">
            {t(meta.titleKey)}
          </h1>
          <p className="text-xs font-body font-medium text-[var(--text-secondary)] mt-0.5">
            {t(meta.descKey)}
          </p>
        </div>
        <div className="shrink-0">
          {renderHeaderActions()}
        </div>
      </header>
    );
  };

  // ----------------------------------------------------
  // WRITING STEPS (1, 2, 4, 6)
  // ----------------------------------------------------
  if (activeStep === 1 || activeStep === 2 || activeStep === 4 || activeStep === 6) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-6 sm:p-8 max-w-4xl mx-auto space-y-5 nb-dots">
        {renderStepHeader()}

        {meta.hasRef && (
          <div className="bg-[var(--pastel-yellow)] text-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] p-4 text-xs font-bold leading-relaxed text-start select-text">
            <span className="font-heading font-black block pb-1 border-b-2 border-black/20 mb-1.5">
              {t('referenceToStep')} {meta.hasRef}:
            </span>
            <p className="whitespace-pre-line font-medium text-black">
              {getStepText(meta.hasRef) || t('noReferenceYet')}
            </p>
          </div>
        )}

        {/* Paper Sheet Writing Space */}
        <div className="space-y-3">
          <textarea
            rows={14}
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            onBlur={() => triggerSaveStepProgress(stepText, stepCompleted)}
            placeholder={t('writeHerePlaceholder')}
            className="w-full p-4 sm:p-5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-sm font-body shadow-[5px_5px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[7px_7px_0px_var(--shadow-ink)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-all min-h-[350px] leading-relaxed"
          />
          <div className="flex justify-end">
            <WordCounter text={stepText} maxWords={meta.limit} />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 3: CHARACTER BIOS (CRUD)
  // ----------------------------------------------------
  if (activeStep === 3) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-6 sm:p-8 max-w-4xl mx-auto space-y-6 nb-dots">
        {renderStepHeader()}

        {editingCharacter ? (
          <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] p-5 sm:p-6 space-y-4 text-start">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-[var(--border-subtle)]">
              <span className="p-1.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
                <User className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase tracking-wider">
                {editingCharacter.id ? t('editCharacterTitle') : t('addCharacterTitle')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('charNameLabel')}
                </label>
                <input
                  type="text"
                  value={editingCharacter.name || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('charMotivationLabel')}
                </label>
                <input
                  type="text"
                  value={editingCharacter.motivation || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, motivation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('charGoalLabel')}
                </label>
                <input
                  type="text"
                  value={editingCharacter.goal || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, goal: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('charConflictLabel')}
                </label>
                <input
                  type="text"
                  value={editingCharacter.conflict || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, conflict: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('charEpiphanyLabel')}
                </label>
                <input
                  type="text"
                  value={editingCharacter.epiphany || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, epiphany: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('charSummaryLabel')}
                </label>
                <textarea
                  rows={4}
                  value={editingCharacter.one_paragraph_summary || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, one_paragraph_summary: e.target.value })}
                  placeholder={t('charSummaryPlaceholder')}
                  className="w-full p-3.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
                <div className="flex justify-end mt-1">
                  <WordCounter text={editingCharacter.one_paragraph_summary || ''} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t-2 border-[var(--border-subtle)]">
              <button
                onClick={() => setEditingCharacter(null)}
                className="px-4 py-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleSaveCharacter(editingCharacter)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--pastel-sky)] text-black text-xs font-heading font-black border-3 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--shadow-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer select-none"
              >
                <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {characters.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-surface)] border-3 border-dashed border-[var(--border-ink)] p-6 space-y-3">
                <div className="inline-flex p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)]">
                  <User className="w-6 h-6" />
                </div>
                <p className="text-xs font-heading font-bold text-[var(--text-secondary)]">{t('noCharactersYet')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
                {characters.map((char) => (
                  <div 
                    key={char.id} 
                    className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] p-4 flex flex-col justify-between hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_var(--shadow-ink)] transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start gap-2 border-b-2 border-[var(--border-subtle)] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)]">
                            <User className="w-3.5 h-3.5" />
                          </span>
                          <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">{char.name}</h3>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditingCharacter(char)}
                            className="p-1 border border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-yellow)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] transition-all cursor-pointer"
                            title={t('edit')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCharacter(char.id!)}
                            className="p-1 border border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] transition-all cursor-pointer"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-body font-medium text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                        {char.one_paragraph_summary || t('noCharSummary')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 5: CHARACTER SYNOPSES
  // ----------------------------------------------------
  if (activeStep === 5) {
    const selectedChar = characters.find(c => c.id === selectedCharIdStep5) || null;

    const handleSaveSynopsis = async (text: string) => {
      if (!selectedChar) return;
      try {
        await saveCharacter({
          ...selectedChar,
          full_synopsis: text
        });
        loadCharactersAndScenes();
      } catch (err) {
        console.error('Failed to save character synopsis', err);
      }
    };

    return (
      <div className="flex-1 h-full flex flex-col overflow-hidden w-full p-6 sm:p-8 max-w-5xl mx-auto space-y-5 nb-dots">
        {renderStepHeader()}

        {characters.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-surface)] border-3 border-dashed border-[var(--border-ink)] p-6">
            <p className="text-xs font-heading font-bold text-[var(--text-secondary)]">{t('pleaseAddCharsFirst')}</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-5 text-start overflow-y-auto md:overflow-hidden min-h-0">
            {/* Character Selector Column */}
            <div className={`md:col-span-1 flex flex-col md:overflow-hidden h-auto md:h-full ${language === 'ar' ? 'border-l-2' : 'border-r-2'} border-[var(--border-subtle)] pe-2`}>
              <span className="text-xs font-heading font-black uppercase tracking-wider text-[var(--text-secondary)] pb-2 shrink-0">
                {t('charsSelectorLabel')}
              </span>
              <div className="flex-1 overflow-y-auto space-y-1.5 pe-1">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharIdStep5(char.id!)}
                    className={`w-full text-start p-2.5 border-2 border-[var(--border-ink)] text-xs font-heading font-bold transition-all cursor-pointer truncate select-none ${
                      selectedCharIdStep5 === char.id
                        ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[3px_3px_0px_var(--shadow-ink)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                    title={char.name}
                  >
                    {char.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Synopsis Editor Column */}
            <div className="md:col-span-3 md:overflow-y-auto h-auto md:h-full space-y-4 pe-1 min-h-0">
              {selectedChar ? (
                <>
                  <div className="bg-[var(--pastel-sky)] text-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] p-4 text-xs font-medium leading-relaxed">
                    <span className="font-heading font-black block pb-1 border-b border-black/20 mb-1">
                      {t('charRefBioLabel')} {selectedChar.name}:
                    </span>
                    <p className="text-black">{selectedChar.one_paragraph_summary || t('charNoRefBio')}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                      {t('charExtendedSynopsisLabel')}
                    </label>
                    <textarea
                      rows={12}
                      value={selectedChar.full_synopsis || ''}
                      onChange={(e) => {
                        const updated = characters.map(c => c.id === selectedChar.id ? { ...c, full_synopsis: e.target.value } : c);
                        setCharacters(updated);
                      }}
                      onBlur={(e) => handleSaveSynopsis(e.target.value)}
                      placeholder={t('charExtendedSynopsisPlaceholder', { name: selectedChar.name })}
                      className="w-full p-4 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-sm font-body shadow-[5px_5px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[7px_7px_0px_var(--shadow-ink)] transition-all min-h-[300px] leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <WordCounter text={selectedChar.full_synopsis || ''} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[240px] flex items-center justify-center border-3 border-dashed border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs font-heading font-bold">
                  {t('selectCharPlaceholder')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 7: CHARACTER CHARTS
  // ----------------------------------------------------
  if (activeStep === 7) {
    const selectedChar = characters.find(c => c.id === selectedCharIdStep7) || null;

    const handleSaveChart = async (char: Character) => {
      try {
        await saveCharacter(char);
        loadCharactersAndScenes();
      } catch (err) {
        console.error('Failed to save character chart', err);
      }
    };

    return (
      <div className="flex-1 h-full flex flex-col overflow-hidden w-full p-6 sm:p-8 max-w-5xl mx-auto space-y-5 nb-dots">
        {renderStepHeader()}

        {characters.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-surface)] border-3 border-dashed border-[var(--border-ink)] p-6">
            <p className="text-xs font-heading font-bold text-[var(--text-secondary)]">{t('pleaseAddCharsFirst')}</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-5 text-start overflow-y-auto md:overflow-hidden min-h-0">
            {/* Character Selector Column */}
            <div className={`md:col-span-1 flex flex-col md:overflow-hidden h-auto md:h-full ${language === 'ar' ? 'border-l-2' : 'border-r-2'} border-[var(--border-subtle)] pe-2`}>
              <span className="text-xs font-heading font-black uppercase tracking-wider text-[var(--text-secondary)] pb-2 shrink-0">
                {t('charsSelectorLabel')}
              </span>
              <div className="flex-1 overflow-y-auto space-y-1.5 pe-1">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharIdStep7(char.id!)}
                    className={`w-full text-start p-2.5 border-2 border-[var(--border-ink)] text-xs font-heading font-bold transition-all cursor-pointer truncate select-none ${
                      selectedCharIdStep7 === char.id
                        ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[3px_3px_0px_var(--shadow-ink)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                    title={char.name}
                  >
                    {char.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Fields Column */}
            <div className="md:col-span-3 md:overflow-y-auto h-auto md:h-full space-y-4 pe-1 min-h-0">
              {selectedChar ? (
                <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-[var(--border-subtle)]">
                    <span className="p-1.5 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
                      <User className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase tracking-wider">
                      {t('editCharacterTitle')}: {selectedChar.name}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                        {t('charNameLabel')}
                      </label>
                      <input
                        type="text"
                        value={selectedChar.name}
                        onChange={(e) => {
                          const updated = characters.map(c => c.id === selectedChar.id ? { ...c, name: e.target.value } : c);
                          setCharacters(updated);
                        }}
                        onBlur={() => handleSaveChart(selectedChar)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                          {t('charMotivationLabel')}
                        </label>
                        <textarea
                          rows={3}
                          value={selectedChar.motivation}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, motivation: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full p-3 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                          {t('charGoalLabel')}
                        </label>
                        <textarea
                          rows={3}
                          value={selectedChar.goal}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, goal: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full p-3 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                          {t('charConflictLabel')}
                        </label>
                        <textarea
                          rows={3}
                          value={selectedChar.conflict}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, conflict: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full p-3 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                          {t('charEpiphanyLabel')}
                        </label>
                        <textarea
                          rows={3}
                          value={selectedChar.epiphany}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, epiphany: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full p-3 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[240px] flex items-center justify-center border-3 border-dashed border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs font-heading font-bold">
                  {t('selectCharPlaceholder')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 8: SCENE LIST SPREADSHEET (Table Grid)
  // ----------------------------------------------------
  if (activeStep === 8) {
    return (
      <div className="flex-1 overflow-y-auto w-full p-6 sm:p-8 max-w-5xl mx-auto space-y-6 nb-dots">
        {renderStepHeader()}

        {editingScene ? (
          <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] p-5 sm:p-6 space-y-4 text-start">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-[var(--border-subtle)]">
              <span className="p-1.5 bg-[var(--pastel-lavender)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
                <Film className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase tracking-wider">
                {editingScene.id ? t('editSceneTitle') : t('addSceneTitle')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">{t('scenePovLabel')}</label>
                {characters.length === 0 ? (
                  <div className="text-xs text-black font-bold p-2.5 bg-[var(--pastel-coral)] border-2 border-[var(--border-ink)]">
                    {t('pleaseAddCharsWarning')}
                  </div>
                ) : (
                  <select
                    value={editingScene.pov_character_id || ''}
                    onChange={(e) => setEditingScene({ ...editingScene, pov_character_id: Number(e.target.value) || null })}
                    className="w-full text-xs font-medium border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2.5 shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none cursor-pointer transition-all"
                  >
                    <option value="">{t('selectPovPlaceholder')}</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id!}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('sceneSettingLabel')}
                </label>
                <input
                  type="text"
                  value={editingScene.setting || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, setting: e.target.value })}
                  placeholder={t('sceneSettingCol')}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('scenePlotLabel')}
                </label>
                <input
                  type="text"
                  value={editingScene.plot_thread || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, plot_thread: e.target.value })}
                  placeholder={t('scenePlotCol')}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('sceneExpectedWordsLabel')}
                </label>
                <input
                  type="number"
                  value={editingScene.expected_word_count || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, expected_word_count: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-mono font-bold shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('sceneWhatHappensLabel')}
                </label>
                <textarea
                  rows={4}
                  value={editingScene.what_happens || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, what_happens: e.target.value })}
                  placeholder={t('sceneWhatHappensLabel')}
                  className="w-full p-3.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-medium shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                />
                <div className="flex justify-end mt-1">
                  <WordCounter text={editingScene.what_happens || ''} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t-2 border-[var(--border-subtle)]">
              <button
                onClick={() => setEditingScene(null)}
                className="px-4 py-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleSaveScene(editingScene)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--pastel-lavender)] text-black text-xs font-heading font-black border-3 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--shadow-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer select-none"
              >
                <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {scenes.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-surface)] border-3 border-dashed border-[var(--border-ink)] p-6 space-y-3">
                <div className="inline-flex p-3 bg-[var(--pastel-lavender)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)]">
                  <Film className="w-6 h-6" />
                </div>
                <p className="text-xs font-heading font-bold text-[var(--text-secondary)]">{t('noScenesYet')}</p>
              </div>
            ) : (
              <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <thead className="bg-[var(--pastel-yellow)] text-black uppercase font-heading font-black border-b-3 border-[var(--border-ink)]">
                      <tr>
                        <th className="px-4 py-3 text-start">#</th>
                        <th className="px-4 py-3 text-start">{t('scenePovCol')}</th>
                        <th className="px-4 py-3 text-start">{t('sceneSettingCol')}</th>
                        <th className="px-4 py-3 text-start">{t('scenePlotCol')}</th>
                        <th className="px-4 py-3 text-start">{t('sceneWordsCol')}</th>
                        <th className="px-4 py-3 text-start">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-[var(--border-subtle)] text-start font-body">
                      {scenes.map((scn, idx) => {
                        const povName = characters.find(c => c.id === scn.pov_character_id)?.name || t('sceneNotPlanned');
                        return (
                          <tr key={scn.id} className="hover:bg-[var(--bg-surface-hover)] transition-all">
                            <td className="px-4 py-3 font-mono font-black text-[var(--text-primary)]">{idx + 1}</td>
                            <td className="px-4 py-3 font-heading font-bold text-[var(--text-primary)]">{povName}</td>
                            <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[130px] font-medium">{scn.setting || '_'}</td>
                            <td className="px-4 py-3 text-[var(--text-secondary)] font-medium">{scn.plot_thread || '_'}</td>
                            <td className="px-4 py-3 font-mono font-bold text-[var(--text-primary)]">{scn.expected_word_count} / {scn.actual_word_count || 0}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setEditingScene(scn)}
                                  className="p-1 border border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-yellow)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] transition-all cursor-pointer"
                                  title={t('edit')}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteScene(scn.id!)}
                                  className="p-1 border border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] transition-all cursor-pointer"
                                  title={t('delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 9: SCENE NARRATIVE
  // ----------------------------------------------------
  if (activeStep === 9) {
    const selectedScene = scenes.find(s => s.id === selectedSceneIdStep9) || null;

    const handleSaveNarrative = async (whatHappensText: string, actualWords: number) => {
      if (!selectedScene) return;
      try {
        const scnToSave = {
          ...selectedScene,
          what_happens: whatHappensText,
          actual_word_count: actualWords
        };
        await saveScene(scnToSave);
        loadCharactersAndScenes();
        
        const updatedScenes = scenes.map(s => s.id === selectedScene.id ? scnToSave : s);
        const totalWords = updatedScenes.reduce((sum, s) => sum + (s.actual_word_count || 0), 0);
        onUpdateNovel({
          ...activeNovel,
          current_word_count: totalWords
        });
      } catch (err) {
        console.error('Failed to save scene narrative', err);
      }
    };

    return (
      <div className="flex-1 h-full flex flex-col overflow-hidden w-full p-6 sm:p-8 max-w-5xl mx-auto space-y-5 nb-dots">
        {renderStepHeader()}

        {scenes.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-surface)] border-3 border-dashed border-[var(--border-ink)] p-6">
            <p className="text-xs font-heading font-bold text-[var(--text-secondary)]">{t('pleaseAddScenesFirst')}</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-5 text-start overflow-y-auto md:overflow-hidden min-h-0">
            {/* Scene Selector Column */}
            <div className={`md:col-span-1 flex flex-col md:overflow-hidden h-auto md:h-full ${language === 'ar' ? 'border-l-2' : 'border-r-2'} border-[var(--border-subtle)] pe-2`}>
              <span className="text-xs font-heading font-black uppercase tracking-wider text-[var(--text-secondary)] pb-2 shrink-0">
                {t('scenesListLabel')}
              </span>
              <div className="flex-1 overflow-y-auto space-y-1.5 pe-1">
                {scenes.map((scn, idx) => (
                  <button
                    key={scn.id}
                    onClick={() => setSelectedSceneIdStep9(scn.id!)}
                    className={`w-full text-start p-2.5 border-2 border-[var(--border-ink)] text-xs font-heading font-bold transition-all cursor-pointer truncate select-none ${
                      selectedSceneIdStep9 === scn.id
                        ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[3px_3px_0px_var(--shadow-ink)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                    title={`${t('sceneNumber')} ${idx + 1}: ${scn.setting || t('sceneNotPlanned')}`}
                  >
                    {t('sceneNumber')} {idx + 1}: {scn.setting || t('sceneNotPlanned')}
                  </button>
                ))}
              </div>
            </div>

            {/* Narrative Column */}
            <div className="md:col-span-3 md:overflow-y-auto h-auto md:h-full space-y-4 pe-1 min-h-0">
              {selectedScene ? (
                <>
                  <div className="bg-[var(--pastel-lavender)] text-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] p-4 text-xs font-medium leading-relaxed">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-heading font-black">{t('scenePovCol')}:</span> {characters.find(c => c.id === selectedScene.pov_character_id)?.name || t('sceneNotPlanned')}</div>
                      <div><span className="font-heading font-black">{t('scenePlotCol')}:</span> {selectedScene.plot_thread || t('sceneNotPlanned')}</div>
                      <div className="col-span-2"><span className="font-heading font-black">{t('sceneSettingCol')}:</span> {selectedScene.setting || t('sceneNotPlanned')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                        {t('sceneExpectedWordsLabel')}
                      </label>
                      <div className="bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs px-3.5 py-2.5 border-3 border-[var(--border-ink)] font-mono font-black shadow-[2px_2px_0px_var(--shadow-ink)]">
                        {selectedScene.expected_word_count} {t('words')}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                        {t('sceneActualWordsLabel')}
                      </label>
                      <input
                        type="number"
                        value={selectedScene.actual_word_count || ''}
                        onChange={(e) => {
                          const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, actual_word_count: Number(e.target.value) || 0 } : s);
                          setScenes(updated);
                        }}
                        onBlur={(e) => handleSaveNarrative(selectedScene.what_happens, Number(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-xs font-mono font-bold shadow-[3px_3px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[5px_5px_0px_var(--shadow-ink)] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                      {t('sceneNarrativeTextareaLabel')}
                    </label>
                    <textarea
                      rows={10}
                      value={selectedScene.what_happens}
                      onChange={(e) => {
                        const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, what_happens: e.target.value } : s);
                        setScenes(updated);
                      }}
                      onBlur={(e) => handleSaveNarrative(e.target.value, selectedScene.actual_word_count)}
                      placeholder={t('sceneNarrativePlaceholder')}
                      className="w-full p-4 bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] text-[var(--text-primary)] text-sm font-body shadow-[5px_5px_0px_var(--shadow-ink)] focus:outline-none focus:shadow-[7px_7px_0px_var(--shadow-ink)] transition-all min-h-[280px] leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <WordCounter text={selectedScene.what_happens} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[240px] flex items-center justify-center border-3 border-dashed border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs font-heading font-bold">
                  {t('selectScenePlaceholder')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 10: FIRST DRAFT & EXPORT
  // ----------------------------------------------------
  if (activeStep === 10) {
    const mdContent = getExportMarkdown();

    return (
      <div className="flex-1 overflow-y-auto w-full p-6 sm:p-8 max-w-4xl mx-auto space-y-5 nb-dots">
        {renderStepHeader()}

        <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] p-5 max-h-[520px] overflow-y-auto text-start select-text">
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-[var(--text-primary)] font-medium">
            {mdContent}
          </pre>
        </div>
      </div>
    );
  }

  return null;
};
