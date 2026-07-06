import React, { useEffect, useState } from 'react';
import { Novel, StepProgress, Character, Scene, saveStepProgress, saveCharacter, deleteCharacter, saveScene, deleteScene } from '../lib';
import { WordCounter } from './WordCounter';
import { Save, Plus } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { LocaleKeys } from '../locales';

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

  // Top-level states for Step 5, 7, and 9 to follow React Rules of Hooks
  const [selectedCharIdStep5, setSelectedCharIdStep5] = useState<number | null>(null);
  const [selectedCharIdStep7, setSelectedCharIdStep7] = useState<number | null>(null);
  const [selectedSceneIdStep9, setSelectedSceneIdStep9] = useState<number | null>(null);

  // Copy Clipboard State
  const [copied, setCopied] = useState(false);

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
  // DASHBOARD VIEW (STEP 0)
  // ----------------------------------------------------
  if (activeStep === 0) {
    const progressPercent = activeNovel.target_word_count > 0 
      ? Math.min(Math.round((activeNovel.current_word_count / activeNovel.target_word_count) * 100), 100) 
      : 0;

    return (
      <div className="max-w-3xl mx-auto p-8 space-y-8 fade-in font-cairo">
        <header className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t('novelDashboardTitle')}</h1>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">{t('novelDashboardDesc')}</p>
        </header>

        {/* Word Count Progress */}
        <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-zinc-400">{t('writingProgress')}</span>
            <span className="text-zinc-900 dark:text-zinc-100">{activeNovel.current_word_count} / {activeNovel.target_word_count} {t('words')} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1.5 rounded overflow-hidden">
            <div 
              className="bg-zinc-800 dark:bg-zinc-200 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-5">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1">{t('novelInfoTitle')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">{t('novelTitleLabel')}</label>
              <input
                type="text"
                value={novelTitle}
                onChange={(e) => setNovelTitle(e.target.value)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                placeholder={t('novelTitlePlaceholder')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">{t('novelGenreLabel')}</label>
              <input
                type="text"
                value={novelGenre}
                onChange={(e) => setNovelGenre(e.target.value)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                placeholder={t('novelGenrePlaceholder')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">{t('novelAudienceLabel')}</label>
              <input
                type="text"
                value={novelAudience}
                onChange={(e) => setNovelAudience(e.target.value)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                placeholder={t('novelAudiencePlaceholder')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">{t('novelTargetWordsLabel')}</label>
              <input
                type="number"
                value={novelTargetWords || ''}
                onChange={(e) => setNovelTargetWords(Number(e.target.value) || 0)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('statsTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
              <span className="text-[10px] font-bold text-zinc-400 block">{t('statsCharactersCount')}</span>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{characters.length}</p>
            </div>

            <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
              <span className="text-[10px] font-bold text-zinc-400 block">{t('statsScenesPlanned')}</span>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{scenes.length}</p>
            </div>

            <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
              <span className="text-[10px] font-bold text-zinc-400 block">{t('statsScenesDone')}</span>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
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
      <div className="flex flex-wrap items-center gap-4">
        {/* Unified Checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500 select-none">
          <input
            type="checkbox"
            checked={stepCompleted}
            onChange={(e) => {
              const check = e.target.checked;
              setStepCompleted(check);
              const isWritingStep = activeStep === 1 || activeStep === 2 || activeStep === 4 || activeStep === 6;
              triggerSaveStepProgress(isWritingStep ? stepText : '', check);
            }}
            className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
          />
          <span>{t('markAsCompleted')}</span>
        </label>

        {/* Step-specific buttons */}
        {activeStep === 3 && !editingCharacter && (
          <button
            onClick={() => setEditingCharacter({ name: '', motivation: '', goal: '', conflict: '', epiphany: '', one_paragraph_summary: '', full_synopsis: '' })}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>{t('addCharacterBtn')}</span>
          </button>
        )}

        {activeStep === 8 && !editingScene && (
          <button
            onClick={() => setEditingScene({ pov_character_id: null, setting: '', plot_thread: '', what_happens: '', expected_word_count: 500, actual_word_count: 0 })}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>{t('addSceneBtn')}</span>
          </button>
        )}

        {activeStep === 10 && (
          <button
            onClick={() => handleCopyMarkdown(getExportMarkdown())}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded cursor-pointer"
          >
            {copied ? (
              <span className="text-emerald-500">{t('copied')}</span>
            ) : (
              <span>{t('copyMarkdown')}</span>
            )}
          </button>
        )}
      </div>
    );
  };

  const renderStepHeader = () => {
    if (!meta) return null;
    return (
      <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t(meta.titleKey)}</h1>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">{t(meta.descKey)}</p>
        </div>
        {renderHeaderActions()}
      </header>
    );
  };

  // ----------------------------------------------------
  // WRITING STEPS (1, 2, 4, 6)
  // ----------------------------------------------------
  if (activeStep === 1 || activeStep === 2 || activeStep === 4 || activeStep === 6) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {meta.hasRef && (
          <div className="bg-[#fcfbfa] dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-4 rounded text-xs leading-relaxed text-zinc-500 whitespace-pre-line text-start">
            <span className="font-bold text-zinc-400 block mb-1">{t('referenceToStep')} {meta.hasRef}:</span>
            {getStepText(meta.hasRef) || t('noReferenceYet')}
          </div>
        )}

        {/* Paper Sheet look-alike writing space */}
        <div className="space-y-2">
          <textarea
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            onBlur={() => triggerSaveStepProgress(stepText, stepCompleted)}
            className="w-full min-h-[350px] text-sm leading-loose bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 p-4 rounded focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y placeholder:text-zinc-300 text-start"
            placeholder={t('writeHerePlaceholder')}
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
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {editingCharacter ? (
          <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-4 text-start">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {editingCharacter.id ? t('editCharacterTitle') : t('addCharacterTitle')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">{t('charNameLabel')}</label>
                <input
                  type="text"
                  value={editingCharacter.name || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">{t('charMotivationLabel')}</label>
                <input
                  type="text"
                  value={editingCharacter.motivation || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, motivation: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">{t('charGoalLabel')}</label>
                <input
                  type="text"
                  value={editingCharacter.goal || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, goal: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">{t('charConflictLabel')}</label>
                <input
                  type="text"
                  value={editingCharacter.conflict || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, conflict: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] text-zinc-500 font-bold">{t('charEpiphanyLabel')}</label>
                <input
                  type="text"
                  value={editingCharacter.epiphany || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, epiphany: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1 md:col-span-2 relative">
                <label className="text-[11px] text-zinc-500 font-bold">{t('charSummaryLabel')}</label>
                <textarea
                  value={editingCharacter.one_paragraph_summary || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, one_paragraph_summary: e.target.value })}
                  className="w-full min-h-[100px] text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                  placeholder={t('charSummaryPlaceholder')}
                />
                <div className="flex justify-end mt-1">
                  <WordCounter text={editingCharacter.one_paragraph_summary || ''} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingCharacter(null)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-xs rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleSaveCharacter(editingCharacter)}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 text-xs rounded transition-colors font-bold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {characters.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs leading-relaxed font-semibold">
                {t('noCharactersYet')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
                {characters.map((char) => (
                  <div key={char.id} className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded flex flex-col justify-between group">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{char.name}</h3>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingCharacter(char)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold cursor-pointer"
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteCharacter(char.id!)}
                            className="text-[10px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-3">
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
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {characters.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
            {t('pleaseAddCharsFirst')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-start">
            <div className={`md:col-span-1 space-y-1 ${language === 'ar' ? 'border-l pl-2' : 'border-r pr-2'} border-zinc-200/30 dark:border-zinc-800/30`}>
              <span className="text-[10px] font-bold text-zinc-400 block pb-1.5">{t('charsSelectorLabel')}</span>
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharIdStep5(char.id!)}
                  className={`w-full text-start p-2 rounded text-xs transition-colors cursor-pointer ${
                    selectedCharIdStep5 === char.id
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 font-bold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {char.name}
                </button>
              ))}
            </div>

            <div className="md:col-span-3 space-y-4">
              {selectedChar ? (
                <>
                  <div className="bg-[#fcfbfa] dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-4 rounded text-xs leading-relaxed text-zinc-500 whitespace-pre-line">
                    <span className="font-bold text-zinc-400 block mb-1">{t('charRefBioLabel')} {selectedChar.name}:</span>
                    {selectedChar.one_paragraph_summary || t('charNoRefBio')}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 block">{t('charExtendedSynopsisLabel')}</label>
                    <textarea
                      value={selectedChar.full_synopsis || ''}
                      onChange={(e) => {
                        const updated = characters.map(c => c.id === selectedChar.id ? { ...c, full_synopsis: e.target.value } : c);
                        setCharacters(updated);
                      }}
                      onBlur={(e) => handleSaveSynopsis(e.target.value)}
                      className="w-full min-h-[300px] text-xs leading-loose bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 p-3 rounded focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                      placeholder={t('charExtendedSynopsisPlaceholder', { name: selectedChar.name })}
                    />
                    <div className="flex justify-end">
                      <WordCounter text={selectedChar.full_synopsis || ''} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
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
  // STEP 7: CHARACTER CHARTS (Detailed CRUD)
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
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {characters.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
            {t('pleaseAddCharsFirst')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-start">
            <div className={`md:col-span-1 space-y-1 ${language === 'ar' ? 'border-l pl-2' : 'border-r pr-2'} border-zinc-200/30 dark:border-zinc-800/30`}>
              <span className="text-[10px] font-bold text-zinc-400 block pb-1.5">{t('charsSelectorLabel')}</span>
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharIdStep7(char.id!)}
                  className={`w-full text-start p-2 rounded text-xs transition-colors cursor-pointer ${
                    selectedCharIdStep7 === char.id
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 font-bold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {char.name}
                </button>
              ))}
            </div>

            <div className="md:col-span-3">
              {selectedChar ? (
                <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1">{t('editCharacterTitle')}: {selectedChar.name}</h3>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-500">{t('charNameLabel')}</label>
                      <input
                        type="text"
                        value={selectedChar.name}
                        onChange={(e) => {
                          const updated = characters.map(c => c.id === selectedChar.id ? { ...c, name: e.target.value } : c);
                          setCharacters(updated);
                        }}
                        onBlur={() => handleSaveChart(selectedChar)}
                        className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">{t('charMotivationLabel')}</label>
                        <textarea
                          value={selectedChar.motivation}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, motivation: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">{t('charGoalLabel')}</label>
                        <textarea
                          value={selectedChar.goal}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, goal: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">{t('charConflictLabel')}</label>
                        <textarea
                          value={selectedChar.conflict}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, conflict: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">{t('charEpiphanyLabel')}</label>
                        <textarea
                          value={selectedChar.epiphany}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, epiphany: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
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
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {editingScene ? (
          <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-4 text-start">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1">
              {editingScene.id ? t('editSceneTitle') : t('addSceneTitle')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">{t('scenePovLabel')}</label>
                {characters.length === 0 ? (
                  <div className="text-[10px] text-rose-500 p-2 bg-rose-50 dark:bg-rose-950/20 rounded">
                    {t('pleaseAddCharsWarning')}
                  </div>
                ) : (
                  <select
                    value={editingScene.pov_character_id || ''}
                    onChange={(e) => setEditingScene({ ...editingScene, pov_character_id: Number(e.target.value) || null })}
                    className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0 cursor-pointer"
                  >
                    <option value="">{t('selectPovPlaceholder')}</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id!}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">{t('sceneSettingLabel')}</label>
                <input
                  type="text"
                  value={editingScene.setting || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, setting: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                  placeholder={t('sceneSettingCol')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">{t('scenePlotLabel')}</label>
                <input
                  type="text"
                  value={editingScene.plot_thread || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, plot_thread: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                  placeholder={t('scenePlotCol')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">{t('sceneExpectedWordsLabel')}</label>
                <input
                  type="number"
                  value={editingScene.expected_word_count || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, expected_word_count: Number(e.target.value) || 0 })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1 md:col-span-2 relative">
                <label className="text-[11px] font-bold text-zinc-500">{t('sceneWhatHappensLabel')}</label>
                <textarea
                  value={editingScene.what_happens || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, what_happens: e.target.value })}
                  className="w-full min-h-[100px] text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                  placeholder={t('sceneWhatHappensLabel')}
                />
                <div className="flex justify-end mt-1">
                  <WordCounter text={editingScene.what_happens || ''} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingScene(null)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-xs rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleSaveScene(editingScene)}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 text-xs rounded transition-colors font-bold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {scenes.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs font-semibold">
                {t('noScenesYet')}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#181818] rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <thead className="text-zinc-400 uppercase bg-[#fbfbfa] dark:bg-[#151515] border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-3 py-2 text-start font-bold">#</th>
                        <th className="px-3 py-2 text-start font-bold">{t('scenePovCol')}</th>
                        <th className="px-3 py-2 text-start font-bold">{t('sceneSettingCol')}</th>
                        <th className="px-3 py-2 text-start font-bold">{t('scenePlotCol')}</th>
                        <th className="px-3 py-2 text-start font-bold">{t('sceneWordsCol')}</th>
                        <th className="px-3 py-2 text-start font-bold">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-start">
                      {scenes.map((scn, idx) => {
                        const povName = characters.find(c => c.id === scn.pov_character_id)?.name || t('sceneNotPlanned');
                        return (
                          <tr key={scn.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">{idx + 1}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{povName}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">{scn.setting || '_'}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{scn.plot_thread || '_'}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{scn.expected_word_count} / {scn.actual_word_count || 0}</td>
                            <td className="px-3 py-2 flex gap-3">
                              <button
                                onClick={() => setEditingScene(scn)}
                                className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold cursor-pointer"
                              >
                                {t('edit')}
                              </button>
                              <button
                                onClick={() => handleDeleteScene(scn.id!)}
                                className="text-[10px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                              >
                                {t('delete')}
                              </button>
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
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {scenes.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
            {t('pleaseAddScenesFirst')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-start">
            <div className={`md:col-span-1 space-y-1 ${language === 'ar' ? 'border-l pl-2' : 'border-r pr-2'} border-zinc-200/30 dark:border-zinc-800/30`}>
              <span className="text-[10px] font-bold text-zinc-400 block pb-1.5">{t('scenesListLabel')}</span>
              {scenes.map((scn, idx) => (
                <button
                  key={scn.id}
                  onClick={() => setSelectedSceneIdStep9(scn.id!)}
                  className={`w-full text-start p-2 rounded text-xs transition-colors cursor-pointer ${
                    selectedSceneIdStep9 === scn.id
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 font-bold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {t('sceneNumber')} {idx + 1}: {scn.setting || t('sceneNotPlanned')}
                </button>
              ))}
            </div>

            <div className="md:col-span-3 space-y-4">
              {selectedScene ? (
                <>
                  <div className="bg-[#fcfbfa] dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-4 rounded text-xs leading-relaxed text-zinc-500">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-bold">{t('scenePovCol')}:</span> {characters.find(c => c.id === selectedScene.pov_character_id)?.name || t('sceneNotPlanned')}</div>
                      <div><span className="font-bold">{t('scenePlotCol')}:</span> {selectedScene.plot_thread || t('sceneNotPlanned')}</div>
                      <div className="col-span-2"><span className="font-bold">{t('sceneSettingCol')}:</span> {selectedScene.setting || t('sceneNotPlanned')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400">{t('sceneExpectedWordsLabel')}</span>
                      <div className="bg-zinc-100 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 text-xs px-3 py-2 rounded">
                        {selectedScene.expected_word_count} {t('words')}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400">{t('sceneActualWordsLabel')}</span>
                      <input
                        type="number"
                        value={selectedScene.actual_word_count || ''}
                        onChange={(e) => {
                          const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, actual_word_count: Number(e.target.value) || 0 } : s);
                          setScenes(updated);
                        }}
                        onBlur={(e) => handleSaveNarrative(selectedScene.what_happens, Number(e.target.value) || 0)}
                        className="w-full text-xs font-bold rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 block">{t('sceneNarrativeTextareaLabel')}</label>
                    <textarea
                      value={selectedScene.what_happens}
                      onChange={(e) => {
                        const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, what_happens: e.target.value } : s);
                        setScenes(updated);
                      }}
                      onBlur={(e) => handleSaveNarrative(e.target.value, selectedScene.actual_word_count)}
                      className="w-full min-h-[300px] text-xs leading-loose bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 p-3 rounded focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                      placeholder={t('sceneNarrativePlaceholder')}
                    />
                    <div className="flex justify-end">
                      <WordCounter text={selectedScene.what_happens} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
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
  // STEP 10: GENERATE EXPORT VIEW
  // ----------------------------------------------------
  if (activeStep === 10) {
    const mdContent = getExportMarkdown();

    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        <div className="bg-[#fdfdfd] dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded max-h-[500px] overflow-y-auto text-start select-text">
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-zinc-800 dark:text-zinc-200 font-medium">
            {mdContent}
          </pre>
        </div>
      </div>
    );
  }

  return null;
};
