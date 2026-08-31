import React, { useState } from 'react';
import { Scene, Character, StepProgress } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { 
  X, 
  Search, 
  Film, 
  Users, 
  FileText, 
  StickyNote, 
  CornerDownLeft, 
  Check, 
  Filter
} from 'lucide-react';

interface ReferenceDrawerPanelProps {
  scenes: Scene[];
  characters: Character[];
  stepsProgress: StepProgress[];
  onClose: () => void;
  onInsertText: (text: string) => void;
  scratchpadText: string;
  onScratchpadChange: (text: string) => void;
}

export const ReferenceDrawerPanel: React.FC<ReferenceDrawerPanelProps> = ({
  scenes,
  characters,
  stepsProgress,
  onClose,
  onInsertText,
  scratchpadText,
  onScratchpadChange,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters' | 'synopses' | 'scratchpad'>('scenes');
  
  // Scene filter & search states
  const [sceneSearch, setSceneSearch] = useState('');
  const [selectedPovId, setSelectedPovId] = useState<number | 'all'>('all');
  const [expandedSceneId, setExpandedSceneId] = useState<number | null>(null);

  // Character search state
  const [charSearch, setCharSearch] = useState('');
  const [expandedCharId, setExpandedCharId] = useState<number | null>(null);

  // Synopsis step selection
  const [selectedSynopsisStep, setSelectedSynopsisStep] = useState<1 | 2 | 4 | 6>(1);

  // Feedback on text insert
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const handleInsert = (text: string, id: string) => {
    if (!text.trim()) return;
    onInsertText(text);
    setInsertedId(id);
    setTimeout(() => setInsertedId(null), 1500);
  };

  // Filtered scenes
  const filteredScenes = scenes.filter((s) => {
    const matchesSearch = 
      s.setting.toLowerCase().includes(sceneSearch.toLowerCase()) ||
      s.what_happens.toLowerCase().includes(sceneSearch.toLowerCase()) ||
      s.plot_thread.toLowerCase().includes(sceneSearch.toLowerCase());
    const matchesPov = selectedPovId === 'all' || s.pov_character_id === selectedPovId;
    return matchesSearch && matchesPov;
  });

  // Filtered characters
  const filteredCharacters = characters.filter((c) => 
    c.name.toLowerCase().includes(charSearch.toLowerCase()) ||
    c.motivation.toLowerCase().includes(charSearch.toLowerCase()) ||
    c.goal.toLowerCase().includes(charSearch.toLowerCase())
  );

  // Helper to find synopsis content
  const getSynopsisContent = (stepNum: number) => {
    const p = stepsProgress.find((s) => s.step_number === stepNum);
    return p ? p.content_text : '';
  };

  const getCharName = (id: number | null | undefined) => {
    if (!id) return t('uncategorized');
    const c = characters.find((char) => char.id === id);
    return c ? c.name : t('uncategorized');
  };

  return (
    <div className="w-full flex flex-col h-full bg-[var(--bg-surface)] select-none min-w-0">
      {/* Header Bar */}
      <div className="h-14 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)]">
            <StickyNote className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-xs font-heading font-black text-[var(--text-primary)] truncate">
            {t('referenceDrawerTitle')}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[2px_2px_0px_var(--shadow-ink)] transition-all cursor-pointer"
          title={t('close')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="grid grid-cols-4 p-1.5 gap-1 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('scenes')}
          className={`py-1.5 px-1 text-[10px] font-heading font-bold flex flex-col items-center gap-0.5 border-2 border-[var(--border-ink)] transition-all cursor-pointer ${
            activeTab === 'scenes'
              ? 'bg-[var(--pastel-sky)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
          }`}
          title={t('tabScenes')}
        >
          <Film className="w-3.5 h-3.5" />
          <span className="truncate">{t('tabScenes')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`py-1.5 px-1 text-[10px] font-heading font-bold flex flex-col items-center gap-0.5 border-2 border-[var(--border-ink)] transition-all cursor-pointer ${
            activeTab === 'characters'
              ? 'bg-[var(--pastel-mint)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
          }`}
          title={t('tabCharacters')}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="truncate">{t('tabCharacters')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('synopses')}
          className={`py-1.5 px-1 text-[10px] font-heading font-bold flex flex-col items-center gap-0.5 border-2 border-[var(--border-ink)] transition-all cursor-pointer ${
            activeTab === 'synopses'
              ? 'bg-[var(--pastel-lavender)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
          }`}
          title={t('tabSynopses')}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate">{t('tabSynopses')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scratchpad')}
          className={`py-1.5 px-1 text-[10px] font-heading font-bold flex flex-col items-center gap-0.5 border-2 border-[var(--border-ink)] transition-all cursor-pointer ${
            activeTab === 'scratchpad'
              ? 'bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
          }`}
          title={t('tabScratchpad')}
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span className="truncate">{t('tabScratchpad')}</span>
        </button>
      </div>

      {/* Tab Contents Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: SCENES */}
        {activeTab === 'scenes' && (
          <div className="space-y-3">
            {/* Search & Filter Controls */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute start-2.5 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={sceneSearch}
                  onChange={(e) => setSceneSearch(e.target.value)}
                  placeholder={t('commandPaletteSearchPlaceholder')}
                  className="w-full ps-8 pe-3 py-1.5 text-xs font-sans border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none focus:bg-[var(--bg-surface-raised)]"
                />
              </div>

              {characters.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                  <select
                    value={selectedPovId}
                    onChange={(e) => setSelectedPovId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full text-[11px] font-heading font-bold py-1 px-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] cursor-pointer"
                  >
                    <option value="all">{t('allCharacters')}</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Scenes List */}
            {filteredScenes.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
                {scenes.length === 0 ? t('noScenesYet') : t('noRecentProjectsTitle')}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredScenes.map((scene, idx) => {
                  const isExpanded = expandedSceneId === scene.id;
                  const isInserted = insertedId === `scene-${scene.id}`;
                  return (
                    <div
                      key={scene.id || idx}
                      className="border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden"
                    >
                      <div className="p-2.5 flex items-start justify-between gap-2">
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedSceneId(isExpanded ? null : (scene.id || null))}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] font-black px-1.5 py-0.2 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)]">
                              #{idx + 1}
                            </span>
                            <span className="text-[10px] font-heading font-bold text-[var(--text-secondary)] truncate">
                              {getCharName(scene.pov_character_id)}
                            </span>
                          </div>
                          <h4 className="text-xs font-heading font-black text-[var(--text-primary)] truncate">
                            {scene.setting || t('uncategorized')}
                          </h4>
                        </div>

                        {/* 1-Click Insert Button */}
                        <button
                          type="button"
                          onClick={() => handleInsert(scene.narrative_outline || scene.what_happens || scene.setting, `scene-${scene.id}`)}
                          className={`px-2 py-1 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                            isInserted
                              ? 'bg-[var(--pastel-mint)] text-black'
                              : 'bg-[var(--pastel-yellow)] text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                          }`}
                          title={t('insertAtCursor')}
                        >
                          {isInserted ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>{t('inserted')}</span>
                            </>
                          ) : (
                            <>
                              <CornerDownLeft className="w-3 h-3 stroke-[2.5]" />
                              <span>{t('insertAtCursor')}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Expandable Scene Beats */}
                      {isExpanded && (
                        <div className="p-2.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-xs text-[var(--text-primary)] space-y-2">
                          {scene.plot_thread && (
                            <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                              <span className="font-bold">{t('scenePlotLabel')}:</span> {scene.plot_thread}
                            </div>
                          )}
                          {scene.what_happens && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-0.5">
                                {t('exportSceneWhatHappens')}
                              </span>
                              <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                {scene.what_happens}
                              </p>
                            </div>
                          )}
                          {scene.narrative_outline && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block mb-0.5">
                                {t('exportSceneOutline')}
                              </span>
                              <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                {scene.narrative_outline}
                              </p>
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-[var(--text-muted)] flex justify-between pt-1 border-t border-dashed border-[var(--border-subtle)]">
                            <span>{t('sceneExpectedWordsLabel')}: {scene.expected_word_count}</span>
                            <span>{t('sceneActualWordsLabel')}: {scene.actual_word_count}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHARACTERS */}
        {activeTab === 'characters' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={charSearch}
                onChange={(e) => setCharSearch(e.target.value)}
                placeholder={t('commandPaletteSearchPlaceholder')}
                className="w-full ps-8 pe-3 py-1.5 text-xs font-sans border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none focus:bg-[var(--bg-surface-raised)]"
              />
            </div>

            {filteredCharacters.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
                {t('noCharactersYet')}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCharacters.map((char) => {
                  const isExpanded = expandedCharId === char.id;
                  const isInserted = insertedId === `char-${char.id}`;
                  return (
                    <div
                      key={char.id}
                      className="border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden"
                    >
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedCharId(isExpanded ? null : (char.id || null))}
                        >
                          <h4 className="text-xs font-heading font-black text-[var(--text-primary)] truncate">
                            {char.name}
                          </h4>
                          {char.motivation && (
                            <p className="text-[10px] text-[var(--text-secondary)] truncate">
                              {char.motivation}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleInsert(`${char.name}: ${char.one_sentence_summary || char.motivation || char.one_paragraph_summary}`, `char-${char.id}`)}
                          className={`px-2 py-1 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                            isInserted
                              ? 'bg-[var(--pastel-mint)] text-black'
                              : 'bg-[var(--pastel-mint)] text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                          }`}
                          title={t('insertAtCursor')}
                        >
                          {isInserted ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>{t('inserted')}</span>
                            </>
                          ) : (
                            <>
                              <CornerDownLeft className="w-3 h-3 stroke-[2.5]" />
                              <span>{t('insertAtCursor')}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Expandable Character Bio Details */}
                      {isExpanded && (
                        <div className="p-2.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-xs text-[var(--text-primary)] space-y-2">
                          {char.one_sentence_summary && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                                {t('charSummaryLabel')}
                              </span>
                              <p className="text-xs font-medium">{char.one_sentence_summary}</p>
                            </div>
                          )}
                          {char.motivation && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                                {t('charMotivationLabel')}
                              </span>
                              <p className="text-xs">{char.motivation}</p>
                            </div>
                          )}
                          {char.goal && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                                {t('charGoalLabel')}
                              </span>
                              <p className="text-xs">{char.goal}</p>
                            </div>
                          )}
                          {char.conflict && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                                {t('charConflictLabel')}
                              </span>
                              <p className="text-xs">{char.conflict}</p>
                            </div>
                          )}
                          {char.epiphany && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                                {t('charEpiphanyLabel')}
                              </span>
                              <p className="text-xs">{char.epiphany}</p>
                            </div>
                          )}
                          {char.one_paragraph_summary && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                                {t('charSynopsisLabel')}
                              </span>
                              <p className="text-xs whitespace-pre-wrap leading-relaxed">{char.one_paragraph_summary}</p>
                            </div>
                          )}
                          {char.full_synopsis && (
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                                {t('fullSynopsisLabel')}
                              </span>
                              <p className="text-xs whitespace-pre-wrap leading-relaxed">{char.full_synopsis}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYNOPSES */}
        {activeTab === 'synopses' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { step: 1 as const, title: t('synopsisStep1') },
                { step: 2 as const, title: t('synopsisStep2') },
                { step: 4 as const, title: t('synopsisStep4') },
                { step: 6 as const, title: t('synopsisStep6') },
              ].map(({ step, title }) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setSelectedSynopsisStep(step)}
                  className={`py-1.5 px-2 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] transition-all cursor-pointer text-center ${
                    selectedSynopsisStep === step
                      ? 'bg-[var(--pastel-lavender)] text-black shadow-[2px_2px_0px_var(--shadow-ink)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            <div className="border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] shadow-[2px_2px_0px_var(--shadow-ink)] p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('step')} {selectedSynopsisStep}
                </span>
                <button
                  type="button"
                  onClick={() => handleInsert(getSynopsisContent(selectedSynopsisStep), `synopsis-${selectedSynopsisStep}`)}
                  disabled={!getSynopsisContent(selectedSynopsisStep)}
                  className={`px-2 py-1 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] transition-all cursor-pointer flex items-center gap-1 ${
                    insertedId === `synopsis-${selectedSynopsisStep}`
                      ? 'bg-[var(--pastel-mint)] text-black'
                      : 'bg-[var(--pastel-lavender)] text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  title={t('insertAtCursor')}
                >
                  {insertedId === `synopsis-${selectedSynopsisStep}` ? (
                    <>
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{t('inserted')}</span>
                    </>
                  ) : (
                    <>
                      <CornerDownLeft className="w-3 h-3 stroke-[2.5]" />
                      <span>{t('insertAtCursor')}</span>
                    </>
                  )}
                </button>
              </div>

              {getSynopsisContent(selectedSynopsisStep) ? (
                <p className="text-xs text-[var(--text-primary)] font-sans whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {getSynopsisContent(selectedSynopsisStep)}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic py-4 text-center">
                  {t('exportNotWritten')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SCRATCHPAD */}
        {activeTab === 'scratchpad' && (
          <div className="h-full flex flex-col space-y-2">
            <p className="text-[11px] text-[var(--text-secondary)] font-heading leading-tight">
              {t('scratchpadPlaceholder')}
            </p>
            <textarea
              value={scratchpadText}
              onChange={(e) => onScratchpadChange(e.target.value)}
              placeholder={t('scratchpadPlaceholder')}
              className="flex-1 w-full p-3 text-xs font-sans border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none focus:bg-[var(--bg-surface-raised)] resize-none min-h-[300px]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
