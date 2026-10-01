import React from 'react';
import { Novel, StepProgress, saveExportFile } from '../lib';
import { WordCounter } from './WordCounter';
import { useLanguage } from '../LanguageContext';
import { StepReferenceCard } from './workspace/StepReferenceCard';
import { SceneMatrixView } from './workspace/SceneMatrixView';
import { WriteNovelTab } from './workspace/WriteNovelTab';
import { BookStudioTab } from './workspace/BookStudioTab';
import { CharacterEditModal } from './workspace/CharacterEditModal';
import { SaveStatusBadge } from './SaveStatusBadge';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { countWords, sanitizeFilename, utf8ToBase64 } from '../utils/text';
import { isUnsupportedOnMobile } from '../utils/platform';
import { useToast } from './Toast';
import {
  Plus,
  Check,
  Copy,
  Download,
  Edit3,
  Trash2
} from 'lucide-react';

interface WorkspaceProps {
  activeNovel: Novel;
  onUpdateNovel: (novel: Novel) => void;
  stepsProgress: StepProgress[];
  onStepSaved: (progress: StepProgress) => void;
  activeStep: number;
}

const fieldClass =
  'w-full text-xs p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)]';
const editorClass =
  'w-full p-4 text-xs font-sans border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] leading-relaxed';
const selectClass =
  'text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer';
const emptyStateClass =
  'p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs';

export const Workspace: React.FC<WorkspaceProps> = ({
  activeNovel,
  onUpdateNovel,
  stepsProgress,
  onStepSaved,
  activeStep,
}) => {
  const { t } = useLanguage();
  const { notify } = useToast();
  const [copied, setCopied] = React.useState(false);

  const data = useWorkspaceData({
    activeNovel,
    onUpdateNovel,
    stepsProgress,
    onStepSaved,
    activeStep,
  });

  const {
    novelDraft,
    updateNovelDraft,
    stepText,
    setStepText,
    stepCompleted,
    setStepCompleted,
    getStepContent,
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
    scenes,
    selectedSceneIdStep9,
    setSelectedSceneIdStep9,
    updateSceneLocal,
    chapters,
    saveIndicator,
  } = data;

  const renderStepHeader = (title: string, desc: string) => (
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
        <SaveStatusBadge state={saveIndicator} />

        {activeStep >= 1 && activeStep <= 10 && (
          <label className="flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stepCompleted}
              onChange={(e) => setStepCompleted(e.target.checked)}
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

  const renderCharacterReference = (char: (typeof characters)[number]) => (
    <div className="p-3.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] text-xs space-y-1.5">
      <span className="font-heading font-black text-xs block">
        {t('charRefBioLabel')} {char.name}
      </span>
      {char.one_sentence_summary && (
        <p className="font-medium">
          <strong>{t('charRefStoryline')}</strong> {char.one_sentence_summary}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] border-t border-black/15">
        {char.motivation && <div><strong>{t('charMotivationLabel')}:</strong> {char.motivation}</div>}
        {char.goal && <div><strong>{t('charGoalLabel')}:</strong> {char.goal}</div>}
        {char.conflict && <div><strong>{t('charConflictLabel')}:</strong> {char.conflict}</div>}
        {char.epiphany && <div><strong>{t('charEpiphanyLabel')}:</strong> {char.epiphany}</div>}
      </div>
    </div>
  );

  // ----------------------------------------------------
  // TAB 11: WRITE NOVEL & CHAPTER DRAFTING
  // ----------------------------------------------------
  if (activeStep === 11) {
    return (
      <WriteNovelTab
        activeNovel={activeNovel}
        data={data}
        stepsProgress={stepsProgress}
      />
    );
  }

  // ----------------------------------------------------
  // TAB 12: BOOK STUDIO PUBLISHING SUITE
  // ----------------------------------------------------
  if (activeStep === 12) {
    return (
      <BookStudioTab
        activeNovel={{ ...activeNovel, title: novelDraft.title }}
        chapters={chapters}
        isChaptersLoaded={data.isLoaded}
        onSaveStatus={data.reportSaveStatus}
      />
    );
  }

  // ----------------------------------------------------
  // STEP 0: DASHBOARD
  // ----------------------------------------------------
  if (activeStep === 0) {
    const totalWordsCount = chapters.reduce((acc, c) => acc + countWords(c.content), 0);

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
            <span className="text-lg font-mono font-black">{novelDraft.target_word_count.toLocaleString()}</span>
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

        {/* Novel Metadata Form (autosaved) */}
        <div className="p-5 border-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[4px_4px_0px_var(--shadow-ink)] space-y-4">
          <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase tracking-wider pb-2 border-b-2 border-[var(--border-ink)]">
            {t('novelInfoTitle')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="novel-title" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelTitleLabel')}
              </label>
              <input
                id="novel-title"
                type="text"
                value={novelDraft.title}
                onChange={(e) => updateNovelDraft({ title: e.target.value })}
                placeholder={t('novelTitlePlaceholder')}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="novel-genre" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelGenreLabel')}
              </label>
              <input
                id="novel-genre"
                type="text"
                value={novelDraft.genre}
                onChange={(e) => updateNovelDraft({ genre: e.target.value })}
                placeholder={t('novelGenrePlaceholder')}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="novel-audience" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelAudienceLabel')}
              </label>
              <input
                id="novel-audience"
                type="text"
                value={novelDraft.target_audience}
                onChange={(e) => updateNovelDraft({ target_audience: e.target.value })}
                placeholder={t('novelAudiencePlaceholder')}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="novel-target" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('novelTargetWordsLabel')}
              </label>
              <input
                id="novel-target"
                type="number"
                min={0}
                value={novelDraft.target_word_count}
                onChange={(e) => updateNovelDraft({ target_word_count: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className={`${fieldClass} font-mono`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEPS 1, 2, 4, 6: FREE-TEXT SYNOPSIS STEPS
  // ----------------------------------------------------
  const renderTextStep = (
    title: string,
    desc: string,
    placeholder: string,
    rows: number,
    extras?: React.ReactNode
  ) => (
    <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
      {renderStepHeader(title, desc)}
      {extras}
      <div className="space-y-2">
        <textarea
          key={`step-${activeStep}`}
          value={stepText}
          onChange={(e) => setStepText(e.target.value)}
          placeholder={placeholder}
          aria-label={title}
          rows={rows}
          className={editorClass}
        />
        <div className="flex justify-end">
          <WordCounter text={stepText} />
        </div>
      </div>
    </div>
  );

  if (activeStep === 1) {
    return renderTextStep(
      t('step1HeadTitle'),
      t('step1HeadDesc'),
      t('step1Placeholder'),
      4,
      <div className="p-3 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] text-xs font-sans space-y-1">
        <span className="font-heading font-black block">{t('step1RuleTitle')}</span>
        <p>• {t('step1Rule1')}</p>
        <p>• {t('step1Rule2')}</p>
        <p>• {t('step1Rule3')}</p>
      </div>
    );
  }

  if (activeStep === 2) {
    return renderTextStep(
      t('step2HeadTitle'),
      t('step2HeadDesc'),
      t('step2Placeholder'),
      6,
      <>
        <StepReferenceCard stepNumber={1} stepTitle={t('step1Title')} contentText={getStepContent(1)} />
        <div className="p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] text-xs font-sans space-y-1">
          <span className="font-heading font-black block">{t('step2RuleTitle')}</span>
          <p>1. {t('step2Rule1')}</p>
          <p>2. {t('step2Rule2')}</p>
          <p>3. {t('step2Rule3')}</p>
          <p>4. {t('step2Rule4')}</p>
          <p>5. {t('step2Rule5')}</p>
        </div>
      </>
    );
  }

  if (activeStep === 4) {
    return renderTextStep(
      t('step4HeadTitle'),
      t('step4HeadDesc'),
      t('step4Placeholder'),
      12,
      <StepReferenceCard stepNumber={2} stepTitle={t('step2Title')} contentText={getStepContent(2)} />
    );
  }

  if (activeStep === 6) {
    return renderTextStep(
      t('step6HeadTitle'),
      t('step6HeadDesc'),
      t('step6Placeholder'),
      16,
      <StepReferenceCard stepNumber={4} stepTitle={t('step4Title')} contentText={getStepContent(4)} />
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
          <div className={emptyStateClass}>
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
                    title={t('edit')}
                    aria-label={`${t('edit')}: ${char.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => char.id && handleDeleteCharacter(char.id)}
                    className="p-1.5 border border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    title={t('delete')}
                    aria-label={`${t('delete')}: ${char.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingCharacter && (
          <CharacterEditModal
            character={editingCharacter}
            onChange={setEditingCharacter}
            onSave={() => handleSaveCharacter(editingCharacter)}
            onClose={() => setEditingCharacter(null)}
          />
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEPS 5 & 7: PER-CHARACTER SYNOPSES (autosaved)
  // ----------------------------------------------------
  const renderCharacterStep = (
    stepNumber: 5 | 7,
    selectedId: number | null,
    setSelectedId: (id: number) => void,
    field: 'one_paragraph_summary' | 'full_synopsis',
    labels: { title: string; desc: string; select: string; field: string; placeholder: string },
    rows: number
  ) => {
    const selectedChar = characters.find((c) => c.id === selectedId) ?? characters[0] ?? null;

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(labels.title, labels.desc)}

        {stepNumber === 5 && (
          <StepReferenceCard
            stepNumber={4}
            stepTitle={t('step4Title')}
            contentText={getStepContent(4)}
            characterNames={characters.map((c) => c.name)}
          />
        )}

        {characters.length === 0 || !selectedChar ? (
          <div className={emptyStateClass}>{t('pleaseAddCharsFirst')}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label htmlFor={`step${stepNumber}-character`} className="text-xs font-heading font-black text-[var(--text-primary)]">
                {labels.select}
              </label>
              <select
                id={`step${stepNumber}-character`}
                value={selectedChar.id ?? ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className={selectClass}
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {renderCharacterReference(selectedChar)}

              <div className="space-y-2">
                <label htmlFor={`step${stepNumber}-text`} className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {labels.field}
                </label>
                <textarea
                  key={`step${stepNumber}-char-${selectedChar.id}`}
                  id={`step${stepNumber}-text`}
                  value={selectedChar[field] || ''}
                  onChange={(e) => {
                    if (!selectedChar.id) return;
                    const value = e.target.value;
                    updateCharacterLocal(
                      selectedChar.id,
                      field === 'full_synopsis' ? { full_synopsis: value } : { one_paragraph_summary: value }
                    );
                  }}
                  placeholder={labels.placeholder}
                  rows={rows}
                  className={editorClass}
                />
                <div className="flex justify-end">
                  <WordCounter text={selectedChar[field] || ''} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (activeStep === 5) {
    return renderCharacterStep(5, selectedCharIdStep5, setSelectedCharIdStep5, 'one_paragraph_summary', {
      title: t('step5HeadTitle'),
      desc: t('step5HeadDesc'),
      select: t('selectCharForPov'),
      field: t('charSynopsisLabel'),
      placeholder: t('charPovPlaceholder'),
    }, 10);
  }

  if (activeStep === 7) {
    return renderCharacterStep(7, selectedCharIdStep7, setSelectedCharIdStep7, 'full_synopsis', {
      title: t('step7HeadTitle'),
      desc: t('step7HeadDesc'),
      select: t('selectCharForDetails'),
      field: t('fullSynopsisLabel'),
      placeholder: t('fullSynopsisPlaceholder'),
    }, 12);
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
          onSaveScene={data.handleSaveScene}
          onDeleteScene={data.handleDeleteScene}
          onMoveScene={data.moveScene}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 9: SCENE OUTLINES (autosaved)
  // ----------------------------------------------------
  if (activeStep === 9) {
    const selectedScene = scenes.find((s) => s.id === selectedSceneIdStep9) ?? scenes[0] ?? null;
    const povChar = selectedScene?.pov_character_id ? characters.find((c) => c.id === selectedScene.pov_character_id) : null;

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step9HeadTitle'), t('step9HeadDesc'))}

        {!selectedScene ? (
          <div className={emptyStateClass}>{t('pleaseAddScenesFirst')}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label htmlFor="step9-scene" className="text-xs font-heading font-black text-[var(--text-primary)]">
                {t('scenesListLabel')}:
              </label>
              <select
                id="step9-scene"
                value={selectedScene.id ?? ''}
                onChange={(e) => setSelectedSceneIdStep9(Number(e.target.value))}
                className={selectClass}
              >
                {scenes.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    #{idx + 1}: {s.setting || t('uncategorized')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] text-xs space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-heading font-black text-xs">
                    {t('sceneNumber')} {scenes.findIndex((s) => s.id === selectedScene.id) + 1}: {selectedScene.setting || t('uncategorized')}
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
                <label htmlFor="step9-outline" className="block text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('sceneNarrativeTextareaLabel')}
                </label>
                <textarea
                  key={`scene-${selectedScene.id}`}
                  id="step9-outline"
                  value={selectedScene.narrative_outline || ''}
                  onChange={(e) => selectedScene.id && updateSceneLocal(selectedScene.id, { narrative_outline: e.target.value })}
                  placeholder={t('sceneNarrativePlaceholder')}
                  rows={12}
                  className={editorClass}
                />
                <div className="flex justify-end">
                  <WordCounter text={selectedScene.narrative_outline || ''} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 10: DRAFT & EXPORT
  // ----------------------------------------------------
  if (activeStep === 10) {
    const charName = (id: number | null) => characters.find((c) => c.id === id)?.name || t('unassignedPOV');
    const mdExport = [
      `# ${novelDraft.title}`,
      '',
      `**${t('exportGenreLabel')}:** ${novelDraft.genre} | **${t('exportAudienceLabel')}:** ${novelDraft.target_audience}`,
      '',
      `## 1. ${t('step1Title')}`,
      getStepContent(1) || t('exportNotWritten'),
      '',
      `## 2. ${t('step2Title')}`,
      getStepContent(2) || t('exportNotWritten'),
      '',
      `## 3. ${t('step3Title')}`,
      characters.length === 0
        ? t('exportNoChars')
        : characters.map((c) => [
            `### ${c.name}`,
            c.one_sentence_summary ? `- **${t('exportCharOneSentence')}:** ${c.one_sentence_summary}` : '',
            `- **${t('exportCharMotivation')}:** ${c.motivation}`,
            `- **${t('exportCharGoal')}:** ${c.goal}`,
            `- **${t('exportCharConflict')}:** ${c.conflict}`,
            `- **${t('exportCharEpiphany')}:** ${c.epiphany}`,
          ].filter(Boolean).join('\n')).join('\n\n'),
      '',
      `## 4. ${t('step4Title')}`,
      getStepContent(4) || t('exportNotWritten'),
      '',
      `## 5. ${t('step5Title')}`,
      characters.filter((c) => c.one_paragraph_summary).map((c) => `### ${c.name}\n${c.one_paragraph_summary}`).join('\n\n') || t('exportNotWritten'),
      '',
      `## 6. ${t('step6Title')}`,
      getStepContent(6) || t('exportNotWritten'),
      '',
      `## 7. ${t('step7Title')}`,
      characters.filter((c) => c.full_synopsis).map((c) => `### ${c.name}\n${c.full_synopsis}`).join('\n\n') || t('exportNotWritten'),
      '',
      `## 8–9. ${t('step8Title')}`,
      scenes.length === 0
        ? t('exportNoScenes')
        : scenes.map((s, i) => [
            `### ${t('sceneNumber')} ${i + 1}: ${s.setting || t('uncategorized')}`,
            s.pov_character_id ? `- **${t('exportScenePOV')}:** ${charName(s.pov_character_id)}` : '',
            s.plot_thread ? `- **${t('exportScenePlot')}:** ${s.plot_thread}` : '',
            `- **${t('exportSceneWhatHappens')}:** ${s.what_happens}`,
            `- **${t('exportSceneWords')}:** ${s.expected_word_count}`,
            s.narrative_outline ? `\n${s.narrative_outline}` : '',
          ].filter(Boolean).join('\n')).join('\n\n'),
      '',
    ].join('\n');

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(mdExport);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        data.reportError(err);
      }
    };

    const handleSaveMarkdown = async () => {
      try {
        const path = await saveExportFile(
          `${sanitizeFilename(novelDraft.title)}.md`,
          'Markdown (*.md)',
          'md',
          utf8ToBase64(mdExport)
        );
        if (path) notify(`${t('exportSavedTo')} ${path}`, 'success');
      } catch (err) {
        if (isUnsupportedOnMobile(err)) {
          notify(t('featureUnsupportedMobile'), 'info');
        } else {
          data.reportError(err);
        }
      }
    };

    const buttonClass =
      'px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5';

    return (
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        {renderStepHeader(t('step10HeadTitle'), t('step10HeadDesc'))}

        <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b-2 border-[var(--border-subtle)]">
          <h3 className="text-xs font-heading font-black text-[var(--text-primary)] uppercase">
            {t('exportConfirmLabel')}
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSaveMarkdown} className={`${buttonClass} bg-[var(--pastel-sky)]`}>
              <Download className="w-3.5 h-3.5" />
              <span>{t('saveAsMarkdown')}</span>
            </button>
            <button type="button" onClick={handleCopy} className={`${buttonClass} bg-[var(--pastel-yellow)]`}>
              {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('exportCopied') : t('exportCopyBtn')}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 bg-[var(--bg-surface-raised)] border-3 border-[var(--border-ink)] text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-[4px_4px_0px_var(--shadow-ink)] text-[var(--text-primary)] select-text">
          {mdExport}
        </pre>
      </div>
    );
  }

  return null;
};
