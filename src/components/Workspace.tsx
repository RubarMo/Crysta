import React, { useEffect, useState } from 'react';
import { Novel, StepProgress, Character, Scene, saveStepProgress, saveCharacter, deleteCharacter, saveScene, deleteScene } from '../lib';
import { WordCounter } from './WordCounter';
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
      <div className="flex-1 overflow-y-auto w-full p-8 max-w-3xl mx-auto space-y-8 fade-in font-cairo">
        <header className="border-b border-m3-outline-variant pb-4">
          <h1 className="text-xl font-bold text-m3-on-surface">{t('novelDashboardTitle')}</h1>
          <p className="text-m3-on-surface-variant text-xs mt-1">{t('novelDashboardDesc')}</p>
        </header>

        {/* Word Count Progress (M3 Elevated container) */}
        <div className="bg-m3-surface p-5 border border-m3-outline-variant rounded-2xl space-y-2.5 shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-m3-on-surface-variant">{t('writingProgress')}</span>
            <span className="text-m3-on-surface font-bold">{activeNovel.current_word_count} / {activeNovel.target_word_count} {t('words')} ({progressPercent})%</span>
          </div>
          <div className="w-full bg-m3-surface-variant h-2 rounded-full overflow-hidden">
            <div 
              className="bg-m3-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Form Fields (M3 Surface card) */}
        <div className="bg-m3-surface p-5 border border-m3-outline-variant rounded-2xl space-y-5 shadow-sm">
          <h2 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider pb-1">{t('novelInfoTitle')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="font-cairo">
              <md-outlined-text-field
                label={t('novelTitleLabel')}
                value={novelTitle}
                onChange={(e: any) => setNovelTitle(e.target.value)}
                onBlur={triggerSaveNovel}
                placeholder={t('novelTitlePlaceholder')}
                className="w-full"
              />
            </div>

            <div className="font-cairo">
              <md-outlined-text-field
                label={t('novelGenreLabel')}
                value={novelGenre}
                onChange={(e: any) => setNovelGenre(e.target.value)}
                onBlur={triggerSaveNovel}
                placeholder={t('novelGenrePlaceholder')}
                className="w-full"
              />
            </div>

            <div className="font-cairo">
              <md-outlined-text-field
                label={t('novelAudienceLabel')}
                value={novelAudience}
                onChange={(e: any) => setNovelAudience(e.target.value)}
                onBlur={triggerSaveNovel}
                placeholder={t('novelAudiencePlaceholder')}
                className="w-full"
              />
            </div>

            <div className="font-cairo">
              <md-outlined-text-field
                label={t('novelTargetWordsLabel')}
                type="number"
                value={String(novelTargetWords || '')}
                onChange={(e: any) => setNovelTargetWords(Number(e.target.value) || 0)}
                onBlur={triggerSaveNovel}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Aggregate Stats (M3 Stats containers) */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface-variant">{t('statsTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-m3-surface p-4 border border-m3-outline-variant rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-m3-on-surface-variant block">{t('statsCharactersCount')}</span>
              <p className="text-2xl font-black text-m3-on-surface mt-1">{characters.length}</p>
            </div>

            <div className="bg-m3-surface p-4 border border-m3-outline-variant rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-m3-on-surface-variant block">{t('statsScenesPlanned')}</span>
              <p className="text-2xl font-black text-m3-on-surface mt-1">{scenes.length}</p>
            </div>

            <div className="bg-m3-surface p-4 border border-m3-outline-variant rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-m3-on-surface-variant block">{t('statsScenesDone')}</span>
              <p className="text-2xl font-black text-m3-on-surface mt-1">
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
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-m3-on-surface-variant select-none">
          <md-checkbox
            checked={stepCompleted}
            onChange={(e: any) => {
              const check = e.target.checked;
              setStepCompleted(check);
              const isWritingStep = activeStep === 1 || activeStep === 2 || activeStep === 4 || activeStep === 6;
              triggerSaveStepProgress(isWritingStep ? stepText : '', check);
            }}
            className="cursor-pointer"
          />
          <span>{t('markAsCompleted')}</span>
        </label>

        {/* Step-specific buttons (M3 Outlined/Filled Buttons: rounded-full) */}
        {activeStep === 3 && !editingCharacter && (
          <button
            onClick={() => setEditingCharacter({ name: '', motivation: '', goal: '', conflict: '', epiphany: '', one_paragraph_summary: '', full_synopsis: '' })}
            className="relative overflow-hidden flex items-center gap-1.5 text-xs px-4 py-1.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 transition-colors font-bold rounded-full cursor-pointer font-cairo"
          >
            <span className="material-symbols-rounded text-sm">add</span>
            <span>{t('addCharacterBtn')}</span>
            <md-ripple></md-ripple>
          </button>
        )}

        {activeStep === 8 && !editingScene && (
          <button
            onClick={() => setEditingScene({ pov_character_id: null, setting: '', plot_thread: '', what_happens: '', expected_word_count: 500, actual_word_count: 0 })}
            className="relative overflow-hidden flex items-center gap-1.5 text-xs px-4 py-1.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 transition-colors font-bold rounded-full cursor-pointer font-cairo"
          >
            <span className="material-symbols-rounded text-sm">add</span>
            <span>{t('addSceneBtn')}</span>
            <md-ripple></md-ripple>
          </button>
        )}

        {activeStep === 10 && (
          <button
            onClick={() => handleCopyMarkdown(getExportMarkdown())}
            className="relative overflow-hidden flex items-center gap-1.5 text-xs px-4 py-1.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 transition-colors font-bold rounded-full cursor-pointer font-cairo"
          >
            {copied ? (
              <span className="text-emerald-500">{t('copied')}</span>
            ) : (
              <span>{t('copyMarkdown')}</span>
            )}
            <md-ripple></md-ripple>
          </button>
        )}
      </div>
    );
  };

  const renderStepHeader = () => {
    if (!meta) return null;
    return (
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-m3-outline-variant pb-3 shrink-0">
        <div>
          <h1 className="text-lg font-black text-m3-on-surface">{t(meta.titleKey)}</h1>
          <p className="text-m3-on-surface-variant text-xs mt-0.5">{t(meta.descKey)}</p>
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
      <div className="flex-1 overflow-y-auto w-full p-8 max-w-3xl mx-auto space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {meta.hasRef && (
          <div className="bg-m3-primary-container/20 border border-m3-outline-variant p-4 rounded-2xl text-xs leading-relaxed text-m3-on-surface-variant whitespace-pre-line text-start shadow-sm">
            <span className="font-bold text-m3-on-surface block mb-1">{t('referenceToStep')} {meta.hasRef}:</span>
            {getStepText(meta.hasRef) || t('noReferenceYet')}
          </div>
        )}

        {/* Paper Sheet look-alike writing space */}
        <div className="space-y-2">
          <md-outlined-text-field
            type="textarea"
            rows={12}
            value={stepText}
            onChange={(e: any) => setStepText(e.target.value)}
            onBlur={() => triggerSaveStepProgress(stepText, stepCompleted)}
            placeholder={t('writeHerePlaceholder')}
            className="w-full min-h-[350px]"
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
      <div className="flex-1 overflow-y-auto w-full p-8 max-w-3xl mx-auto space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {editingCharacter ? (
          <div className="bg-m3-surface p-5 border border-m3-outline-variant rounded-2xl space-y-4 text-start shadow-sm">
            <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider">
              {editingCharacter.id ? t('editCharacterTitle') : t('addCharacterTitle')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="font-cairo">
                <md-outlined-text-field
                  label={t('charNameLabel')}
                  value={editingCharacter.name || ''}
                  onChange={(e: any) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="font-cairo">
                <md-outlined-text-field
                  label={t('charMotivationLabel')}
                  value={editingCharacter.motivation || ''}
                  onChange={(e: any) => setEditingCharacter({ ...editingCharacter, motivation: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="font-cairo">
                <md-outlined-text-field
                  label={t('charGoalLabel')}
                  value={editingCharacter.goal || ''}
                  onChange={(e: any) => setEditingCharacter({ ...editingCharacter, goal: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="font-cairo">
                <md-outlined-text-field
                  label={t('charConflictLabel')}
                  value={editingCharacter.conflict || ''}
                  onChange={(e: any) => setEditingCharacter({ ...editingCharacter, conflict: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2 font-cairo">
                <md-outlined-text-field
                  label={t('charEpiphanyLabel')}
                  value={editingCharacter.epiphany || ''}
                  onChange={(e: any) => setEditingCharacter({ ...editingCharacter, epiphany: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2 font-cairo">
                <md-outlined-text-field
                  type="textarea"
                  rows={4}
                  label={t('charSummaryLabel')}
                  value={editingCharacter.one_paragraph_summary || ''}
                  onChange={(e: any) => setEditingCharacter({ ...editingCharacter, one_paragraph_summary: e.target.value })}
                  className="w-full"
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
                className="relative overflow-hidden px-4 py-1.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 text-xs rounded-full transition-colors cursor-pointer font-cairo font-bold"
              >
                {t('cancel')}
                <md-ripple></md-ripple>
              </button>
              <button
                onClick={() => handleSaveCharacter(editingCharacter)}
                className="relative overflow-hidden flex items-center gap-1.5 px-4 py-1.5 bg-m3-primary hover:opacity-90 text-m3-on-primary text-xs rounded-full transition-all font-bold cursor-pointer font-cairo shadow-sm"
              >
                <span className="material-symbols-rounded text-sm">save</span>
                <span>{t('save')}</span>
                <md-ripple></md-ripple>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 font-cairo">
            {characters.length === 0 ? (
              <div className="text-center py-10 bg-m3-surface border border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs leading-relaxed font-semibold">
                {t('noCharactersYet')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
                {characters.map((char) => (
                  <div key={char.id} className="relative overflow-hidden bg-m3-surface p-4 border border-m3-outline-variant rounded-2xl flex flex-col justify-between group shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-m3-on-surface">{char.name}</h3>
                        <div className="flex gap-2.5 opacity-100">
                          <button
                            onClick={() => setEditingCharacter(char)}
                            className="relative overflow-hidden p-1.5 text-m3-on-surface-variant hover:text-m3-primary rounded-full cursor-pointer flex items-center justify-center"
                            title={t('edit')}
                          >
                            <span className="material-symbols-rounded text-sm">edit</span>
                            <md-ripple></md-ripple>
                          </button>
                          <button
                            onClick={() => handleDeleteCharacter(char.id!)}
                            className="relative overflow-hidden p-1.5 text-rose-500 hover:text-rose-600 rounded-full cursor-pointer flex items-center justify-center"
                            title={t('delete')}
                          >
                            <span className="material-symbols-rounded text-sm">delete</span>
                            <md-ripple></md-ripple>
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed text-m3-on-surface-variant line-clamp-3 font-medium">
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
      <div className="flex-1 h-full flex flex-col overflow-hidden w-full p-8 max-w-4xl mx-auto space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {characters.length === 0 ? (
          <div className="text-center py-10 bg-m3-surface border border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs">
            {t('pleaseAddCharsFirst')}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 text-start overflow-y-auto md:overflow-hidden min-h-0">
            <div className={`md:col-span-1 flex flex-col md:overflow-hidden h-auto md:h-full ${language === 'ar' ? 'border-l pl-2' : 'border-r pr-2'} border-m3-outline-variant/35`}>
              <span className="text-[10px] font-bold text-m3-on-surface-variant block pb-2 shrink-0">{t('charsSelectorLabel')}</span>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-[150px] md:min-h-0">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharIdStep5(char.id!)}
                    className={`relative overflow-hidden w-full text-start p-2.5 rounded-xl text-xs transition-all cursor-pointer font-cairo ${
                      selectedCharIdStep5 === char.id
                        ? 'bg-m3-primary-container text-m3-on-primary-container font-bold shadow-sm'
                        : 'hover:bg-m3-surface-variant/45 text-m3-on-surface-variant'
                    }`}
                    title={char.name}
                  >
                    <span className="block truncate">{char.name}</span>
                    <md-ripple></md-ripple>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 md:overflow-y-auto h-auto md:h-full space-y-4 pr-1 min-h-0">
              {selectedChar ? (
                <>
                  <div className="bg-m3-primary-container/20 border border-m3-outline-variant p-4 rounded-2xl text-xs leading-relaxed text-m3-on-surface-variant shadow-sm">
                    <span className="font-bold text-m3-on-surface block mb-1">{t('charRefBioLabel')} {selectedChar.name}:</span>
                    {selectedChar.one_paragraph_summary || t('charNoRefBio')}
                  </div>

                  <div className="font-cairo">
                    <md-outlined-text-field
                      type="textarea"
                      rows={10}
                      label={t('charExtendedSynopsisLabel')}
                      value={selectedChar.full_synopsis || ''}
                      onChange={(e: any) => {
                        const updated = characters.map(c => c.id === selectedChar.id ? { ...c, full_synopsis: e.target.value } : c);
                        setCharacters(updated);
                      }}
                      onBlur={(e: any) => handleSaveSynopsis(e.target.value)}
                      className="w-full min-h-[300px]"
                      placeholder={t('charExtendedSynopsisPlaceholder', { name: selectedChar.name })}
                    />
                    <div className="flex justify-end mt-1">
                      <WordCounter text={selectedChar.full_synopsis || ''} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs bg-m3-surface/30">
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
      <div className="flex-1 h-full flex flex-col overflow-hidden w-full p-8 max-w-4xl mx-auto space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {characters.length === 0 ? (
          <div className="text-center py-10 bg-m3-surface border border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs">
            {t('pleaseAddCharsFirst')}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 text-start overflow-y-auto md:overflow-hidden min-h-0">
            <div className={`md:col-span-1 flex flex-col md:overflow-hidden h-auto md:h-full ${language === 'ar' ? 'border-l pl-2' : 'border-r pr-2'} border-m3-outline-variant/35`}>
              <span className="text-[10px] font-bold text-m3-on-surface-variant block pb-2 shrink-0">{t('charsSelectorLabel')}</span>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-[150px] md:min-h-0">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharIdStep7(char.id!)}
                    className={`relative overflow-hidden w-full text-start p-2.5 rounded-xl text-xs transition-all cursor-pointer font-cairo ${
                      selectedCharIdStep7 === char.id
                        ? 'bg-m3-primary-container text-m3-on-primary-container font-bold shadow-sm'
                        : 'hover:bg-m3-surface-variant/45 text-m3-on-surface-variant'
                    }`}
                    title={char.name}
                  >
                    <span className="block truncate">{char.name}</span>
                    <md-ripple></md-ripple>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 md:overflow-y-auto h-auto md:h-full pr-1 min-h-0">
              {selectedChar ? (
                <div className="bg-m3-surface p-5 border border-m3-outline-variant rounded-2xl space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider pb-1">{t('editCharacterTitle')}: {selectedChar.name}</h3>

                  <div className="space-y-4">
                    <div className="font-cairo">
                      <md-outlined-text-field
                        label={t('charNameLabel')}
                        value={selectedChar.name}
                        onChange={(e: any) => {
                          const updated = characters.map(c => c.id === selectedChar.id ? { ...c, name: e.target.value } : c);
                          setCharacters(updated);
                        }}
                        onBlur={() => handleSaveChart(selectedChar)}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="font-cairo">
                        <md-outlined-text-field
                          type="textarea"
                          rows={3}
                          label={t('charMotivationLabel')}
                          value={selectedChar.motivation}
                          onChange={(e: any) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, motivation: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full"
                        />
                      </div>

                      <div className="font-cairo">
                        <md-outlined-text-field
                          type="textarea"
                          rows={3}
                          label={t('charGoalLabel')}
                          value={selectedChar.goal}
                          onChange={(e: any) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, goal: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full"
                        />
                      </div>

                      <div className="font-cairo">
                        <md-outlined-text-field
                          type="textarea"
                          rows={3}
                          label={t('charConflictLabel')}
                          value={selectedChar.conflict}
                          onChange={(e: any) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, conflict: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full"
                        />
                      </div>

                      <div className="font-cairo">
                        <md-outlined-text-field
                          type="textarea"
                          rows={3}
                          label={t('charEpiphanyLabel')}
                          value={selectedChar.epiphany}
                          onChange={(e: any) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, epiphany: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs bg-m3-surface/30">
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
      <div className="flex-1 overflow-y-auto w-full p-8 max-w-3xl mx-auto space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {editingScene ? (
          <div className="bg-m3-surface p-5 border border-m3-outline-variant rounded-2xl space-y-4 text-start shadow-sm">
            <h3 className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider pb-1">
              {editingScene.id ? t('editSceneTitle') : t('addSceneTitle')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="font-cairo">
                <label className="text-[11px] font-bold text-m3-on-surface-variant block mb-1">{t('scenePovLabel')}</label>
                {characters.length === 0 ? (
                  <div className="text-[10px] text-rose-500 p-2 bg-rose-50 dark:bg-rose-950/10 rounded-xl">
                    {t('pleaseAddCharsWarning')}
                  </div>
                ) : (
                  <select
                    value={editingScene.pov_character_id || ''}
                    onChange={(e) => setEditingScene({ ...editingScene, pov_character_id: Number(e.target.value) || null })}
                    className="w-full text-xs rounded-xl border border-m3-outline bg-m3-background p-3 focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary cursor-pointer text-m3-on-surface transition-all"
                  >
                    <option value="">{t('selectPovPlaceholder')}</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id!}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="font-cairo mt-5 md:mt-0">
                <md-outlined-text-field
                  label={t('sceneSettingLabel')}
                  value={editingScene.setting || ''}
                  onChange={(e: any) => setEditingScene({ ...editingScene, setting: e.target.value })}
                  placeholder={t('sceneSettingCol')}
                  className="w-full"
                />
              </div>

              <div className="font-cairo">
                <md-outlined-text-field
                  label={t('scenePlotLabel')}
                  value={editingScene.plot_thread || ''}
                  onChange={(e: any) => setEditingScene({ ...editingScene, plot_thread: e.target.value })}
                  placeholder={t('scenePlotCol')}
                  className="w-full"
                />
              </div>

              <div className="font-cairo">
                <md-outlined-text-field
                  type="number"
                  label={t('sceneExpectedWordsLabel')}
                  value={String(editingScene.expected_word_count || '')}
                  onChange={(e: any) => setEditingScene({ ...editingScene, expected_word_count: Number(e.target.value) || 0 })}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2 font-cairo">
                <md-outlined-text-field
                  type="textarea"
                  rows={4}
                  label={t('sceneWhatHappensLabel')}
                  value={editingScene.what_happens || ''}
                  onChange={(e: any) => setEditingScene({ ...editingScene, what_happens: e.target.value })}
                  placeholder={t('sceneWhatHappensLabel')}
                  className="w-full"
                />
                <div className="flex justify-end mt-1">
                  <WordCounter text={editingScene.what_happens || ''} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingScene(null)}
                className="relative overflow-hidden px-4 py-1.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 text-xs rounded-full transition-colors cursor-pointer font-cairo font-bold"
              >
                {t('cancel')}
                <md-ripple></md-ripple>
              </button>
              <button
                onClick={() => handleSaveScene(editingScene)}
                className="relative overflow-hidden flex items-center gap-1.5 px-4 py-1.5 bg-m3-primary hover:opacity-90 text-m3-on-primary text-xs rounded-full transition-all font-bold cursor-pointer font-cairo shadow-sm"
              >
                <span className="material-symbols-rounded text-sm">save</span>
                <span>{t('save')}</span>
                <md-ripple></md-ripple>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {scenes.length === 0 ? (
              <div className="text-center py-10 bg-m3-surface border border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs font-semibold">
                {t('noScenesYet')}
              </div>
            ) : (
              <div className="bg-m3-surface rounded-2xl border border-m3-outline-variant overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <thead className="text-m3-on-surface-variant uppercase bg-m3-surface-variant/40 border-b border-m3-outline-variant">
                      <tr>
                        <th className="px-4 py-3 text-start font-bold">#</th>
                        <th className="px-4 py-3 text-start font-bold">{t('scenePovCol')}</th>
                        <th className="px-4 py-3 text-start font-bold">{t('sceneSettingCol')}</th>
                        <th className="px-4 py-3 text-start font-bold">{t('scenePlotCol')}</th>
                        <th className="px-4 py-3 text-start font-bold">{t('sceneWordsCol')}</th>
                        <th className="px-4 py-3 text-start font-bold">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-m3-outline-variant text-start">
                      {scenes.map((scn, idx) => {
                        const povName = characters.find(c => c.id === scn.pov_character_id)?.name || t('sceneNotPlanned');
                        return (
                          <tr key={scn.id} className="hover:bg-m3-surface-variant/20 transition-all">
                            <td className="px-4 py-3.5 font-bold text-m3-on-surface">{idx + 1}</td>
                            <td className="px-4 py-3.5 text-m3-on-surface-variant font-medium">{povName}</td>
                            <td className="px-4 py-3.5 text-m3-on-surface-variant font-medium truncate max-w-[120px]">{scn.setting || '_'}</td>
                            <td className="px-4 py-3.5 text-m3-on-surface-variant font-medium">{scn.plot_thread || '_'}</td>
                            <td className="px-4 py-3.5 text-m3-on-surface-variant font-medium font-mono">{scn.expected_word_count} / {scn.actual_word_count || 0}</td>
                            <td className="px-4 py-3.5 flex gap-2 font-cairo">
                              <button
                                onClick={() => setEditingScene(scn)}
                                className="relative overflow-hidden p-1.5 text-m3-on-surface-variant hover:text-m3-primary rounded-full cursor-pointer flex items-center justify-center"
                                title={t('edit')}
                              >
                                <span className="material-symbols-rounded text-sm">edit</span>
                                <md-ripple></md-ripple>
                              </button>
                              <button
                                onClick={() => handleDeleteScene(scn.id!)}
                                className="relative overflow-hidden p-1.5 text-rose-500 hover:text-rose-600 rounded-full cursor-pointer flex items-center justify-center"
                                title={t('delete')}
                              >
                                <span className="material-symbols-rounded text-sm">delete</span>
                                <md-ripple></md-ripple>
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
      <div className="flex-1 h-full flex flex-col overflow-hidden w-full p-8 max-w-4xl mx-auto space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        {scenes.length === 0 ? (
          <div className="text-center py-10 bg-m3-surface border border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs">
            {t('pleaseAddScenesFirst')}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 text-start overflow-y-auto md:overflow-hidden min-h-0">
            <div className={`md:col-span-1 flex flex-col md:overflow-hidden h-auto md:h-full ${language === 'ar' ? 'border-l pl-2' : 'border-r pr-2'} border-m3-outline-variant/35`}>
              <span className="text-[10px] font-bold text-m3-on-surface-variant block pb-2 shrink-0">{t('scenesListLabel')}</span>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-[150px] md:min-h-0">
                {scenes.map((scn, idx) => (
                  <button
                    key={scn.id}
                    onClick={() => setSelectedSceneIdStep9(scn.id!)}
                    className={`relative overflow-hidden w-full text-start p-2.5 rounded-xl text-xs transition-all cursor-pointer font-cairo ${
                      selectedSceneIdStep9 === scn.id
                        ? 'bg-m3-primary-container text-m3-on-primary-container font-bold shadow-sm'
                        : 'hover:bg-m3-surface-variant/45 text-m3-on-surface-variant'
                    }`}
                    title={`${t('sceneNumber')} ${idx + 1}: ${scn.setting || t('sceneNotPlanned')}`}
                  >
                    <span className="block truncate">{t('sceneNumber')} {idx + 1}: {scn.setting || t('sceneNotPlanned')}</span>
                    <md-ripple></md-ripple>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 md:overflow-y-auto h-auto md:h-full space-y-4 pr-1 min-h-0">
              {selectedScene ? (
                <>
                  <div className="bg-m3-primary-container/20 border border-m3-outline-variant p-4 rounded-2xl text-xs leading-relaxed text-m3-on-surface-variant shadow-sm">
                    <div className="grid grid-cols-2 gap-2 font-medium">
                      <div><span className="font-bold">{t('scenePovCol')}:</span> {characters.find(c => c.id === selectedScene.pov_character_id)?.name || t('sceneNotPlanned')}</div>
                      <div><span className="font-bold">{t('scenePlotCol')}:</span> {selectedScene.plot_thread || t('sceneNotPlanned')}</div>
                      <div className="col-span-2"><span className="font-bold">{t('sceneSettingCol')}:</span> {selectedScene.setting || t('sceneNotPlanned')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 font-cairo">
                      <span className="text-[10px] font-bold text-m3-on-surface-variant">{t('sceneExpectedWordsLabel')}</span>
                      <div className="bg-m3-surface-variant text-m3-on-surface text-xs px-3 py-2.5 rounded-xl font-bold">
                        {selectedScene.expected_word_count} {t('words')}
                      </div>
                    </div>
                    <div className="font-cairo">
                      <md-outlined-text-field
                        type="number"
                        label={t('sceneActualWordsLabel')}
                        value={String(selectedScene.actual_word_count || '')}
                        onChange={(e: any) => {
                          const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, actual_word_count: Number(e.target.value) || 0 } : s);
                          setScenes(updated);
                        }}
                        onBlur={(e: any) => handleSaveNarrative(selectedScene.what_happens, Number(e.target.value) || 0)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="font-cairo">
                    <md-outlined-text-field
                      type="textarea"
                      rows={10}
                      label={t('sceneNarrativeTextareaLabel')}
                      value={selectedScene.what_happens}
                      onChange={(e: any) => {
                        const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, what_happens: e.target.value } : s);
                        setScenes(updated);
                      }}
                      onBlur={(e: any) => handleSaveNarrative(e.target.value, selectedScene.actual_word_count)}
                      className="w-full min-h-[300px]"
                      placeholder={t('sceneNarrativePlaceholder')}
                    />
                    <div className="flex justify-end mt-1">
                      <WordCounter text={selectedScene.what_happens} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-m3-outline-variant rounded-2xl text-m3-on-surface-variant text-xs bg-m3-surface/30">
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
      <div className="flex-1 overflow-y-auto w-full p-8 max-w-3xl mx-auto space-y-6 fade-in font-cairo">
        {renderStepHeader()}

        <div className="bg-m3-surface p-5 border border-m3-outline-variant rounded-2xl max-h-[500px] overflow-y-auto text-start select-text shadow-sm">
          <pre className="text-xs font-cairo whitespace-pre-wrap leading-relaxed text-m3-on-surface font-semibold">
            {mdContent}
          </pre>
        </div>
      </div>
    );
  }

  return null;
};
