import React, { useState, useEffect, useRef } from 'react';
import { Novel, StepProgress } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { WordCounter } from '../WordCounter';
import { SaveStatusBadge } from '../SaveStatusBadge';
import { ReferenceDrawerPanel } from './ReferenceDrawerPanel';
import { ZenModeView } from './ZenModeView';
import { WorkspaceData } from '../../hooks/useWorkspaceData';
import { countWords } from '../../utils/text';
import { listenForWriteCommands } from '../../utils/writeCommands';
import {
  Plus,
  Trash2,
  Maximize2,
  BookOpen,
  ArrowUp,
  ArrowDown,
  StickyNote,
  FileText,
  X
} from 'lucide-react';

interface WriteNovelTabProps {
  activeNovel: Novel;
  data: WorkspaceData;
  stepsProgress: StepProgress[];
}

type SidePanel = 'chapters' | 'reference' | null;

function readScratchpad(novelId: number | undefined): string {
  try {
    return localStorage.getItem(`crysta_scratchpad_${novelId}`) || '';
  } catch {
    return '';
  }
}

export const WriteNovelTab: React.FC<WriteNovelTabProps> = ({
  activeNovel,
  data,
  stepsProgress,
}) => {
  const { t } = useLanguage();
  const { chapters, scenes, characters, updateChapterLocal, addChapter, deleteChapter, moveChapter, saveIndicator } = data;

  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanel>('chapters');
  const [scratchpadText, setScratchpadText] = useState(() => readScratchpad(activeNovel.id));
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fall back to the first chapter until the user picks one.
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) ?? chapters[0] ?? null;
  const activeTitle = selectedChapter?.title ?? '';
  const activeContent = selectedChapter?.content ?? '';

  const setActiveTitle = (title: string) => {
    if (selectedChapter?.id) updateChapterLocal(selectedChapter.id, { title });
  };
  const setActiveContent = (content: string) => {
    if (selectedChapter?.id) updateChapterLocal(selectedChapter.id, { content });
  };

  // Ctrl+Shift+R toggles the reference drawer.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        setActiveSidePanel((prev) => (prev === 'reference' ? 'chapters' : 'reference'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Commands from the command palette.
  useEffect(() => {
    return listenForWriteCommands((command) => {
      if (command === 'toggle-zen') {
        setIsZenModeOpen((open) => !open);
      } else if (command === 'toggle-reference') {
        setActiveSidePanel((prev) => (prev === 'reference' ? 'chapters' : 'reference'));
      }
    });
  }, []);

  const handleScratchpadChange = (text: string) => {
    setScratchpadText(text);
    try {
      localStorage.setItem(`crysta_scratchpad_${activeNovel.id}`, text);
    } catch {
      // Storage can be unavailable; the note just isn't remembered.
    }
  };

  const handleAddChapter = async () => {
    const id = await addChapter(`${t('chapter')} ${chapters.length + 1}`);
    if (id !== null) setSelectedChapterId(id);
  };

  const handleDeleteChapter = async (id: number) => {
    if (!window.confirm(t('deleteChapterConfirm'))) return;
    const index = chapters.findIndex((c) => c.id === id);
    const deleted = await deleteChapter(id);
    if (deleted && selectedChapter?.id === id) {
      const remaining = chapters.filter((c) => c.id !== id);
      const next = remaining[Math.min(index, remaining.length - 1)];
      setSelectedChapterId(next?.id ?? null);
    }
  };

  // Inserts reference text at the caret with paragraph spacing.
  const handleInsertAtCursor = (textToInsert: string) => {
    const textarea = editorRef.current;
    if (!textarea || !selectedChapter) {
      setActiveContent(activeContent ? `${activeContent}\n\n${textToInsert}` : textToInsert);
      return;
    }

    const start = textarea.selectionStart ?? activeContent.length;
    const end = textarea.selectionEnd ?? activeContent.length;
    const before = activeContent.substring(0, start);
    const after = activeContent.substring(end);
    const formattedInsert =
      (before && !before.endsWith('\n') ? '\n\n' : '') + textToInsert + (after && !after.startsWith('\n') ? '\n\n' : '');
    setActiveContent(before + formattedInsert + after);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + formattedInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const totalNovelWords = chapters.reduce((acc, c) => acc + countWords(c.content), 0);
  const targetWords = activeNovel.target_word_count;

  const panelTabClass = (active: boolean, activeBg: string) =>
    `px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
      active
        ? `${activeBg} text-black shadow-[2px_2px_0px_var(--shadow-ink)]`
        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
    }`;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[var(--bg-canvas)] relative">
      {/* 1. SIDE PANEL: Chapters OR Reference Companion */}
      {activeSidePanel && (
        <div className="w-80 border-e-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex flex-col h-full select-none shrink-0 z-10 overflow-hidden">
          <div className="h-14 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between px-2.5 shrink-0 gap-1.5">
            <div className="flex items-center gap-1 min-w-0" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeSidePanel === 'chapters'}
                onClick={() => setActiveSidePanel('chapters')}
                className={panelTabClass(activeSidePanel === 'chapters', 'bg-[var(--pastel-sky)]')}
                title={t('chapters')}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('chapters')}</span>
                <span className="font-mono text-3xs bg-black text-white px-1 font-bold shrink-0">
                  {chapters.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeSidePanel === 'reference'}
                onClick={() => setActiveSidePanel('reference')}
                className={panelTabClass(activeSidePanel === 'reference', 'bg-[var(--pastel-mint)]')}
                title={t('toggleReferenceDrawer')}
              >
                <StickyNote className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('referenceShort')}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {activeSidePanel === 'chapters' && (
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="p-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center"
                  title={t('addChapter')}
                  aria-label={t('addChapter')}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSidePanel(null)}
                className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                title={t('close')}
                aria-label={t('close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {activeSidePanel === 'chapters' ? (
            <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-surface-raised)] overflow-hidden">
              <div className="p-2.5 border-b-2 border-[var(--border-ink)] bg-[var(--bg-surface)] space-y-1 shrink-0">
                <div className="flex justify-between items-center text-2xs font-heading font-bold text-[var(--text-secondary)]">
                  <span>{t('totalNovelWords')}</span>
                  <span className="font-mono font-black text-[var(--text-primary)]">
                    {totalNovelWords.toLocaleString()} / {targetWords.toLocaleString()}
                  </span>
                </div>
                <div
                  className="w-full bg-[var(--bg-surface-raised)] h-2 border border-[var(--border-ink)] overflow-hidden"
                  role="progressbar"
                  aria-label={t('totalNovelWords')}
                  aria-valuemin={0}
                  aria-valuemax={targetWords}
                  aria-valuenow={Math.min(totalNovelWords, targetWords)}
                >
                  <div
                    className="bg-[var(--pastel-mint)] h-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, targetWords > 0 ? (totalNovelWords / targetWords) * 100 : 0)}%` }}
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 pb-16">
                {chapters.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs mt-2">
                    {t('noChaptersYet')}
                  </div>
                ) : (
                  chapters.map((ch, idx) => {
                    const isSelected = ch.id === selectedChapter?.id;
                    return (
                      <div
                        key={ch.id ?? idx}
                        className={`nb-row group flex items-center justify-between gap-1.5 p-2 border-2 transition-colors ${
                          isSelected
                            ? 'bg-[var(--pastel-yellow)] text-black font-black border-[var(--border-ink)] shadow-[2.5px_2.5px_0px_var(--shadow-ink)]'
                            : 'border-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-subtle)]'
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-start cursor-pointer"
                          onClick={() => setSelectedChapterId(ch.id ?? null)}
                          aria-current={isSelected ? 'true' : undefined}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-3xs px-1 bg-black text-white font-bold">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-heading truncate">{ch.title}</span>
                          </div>
                          <span className={`text-2xs font-mono block ${isSelected ? 'text-black/70' : 'text-[var(--text-muted)]'}`}>
                            {countWords(ch.content)} {t('words')}
                          </span>
                        </button>

                        <div className={`nb-row-actions flex items-center gap-0.5 ${isSelected ? 'nb-row-actions-visible' : ''}`}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveChapter(idx, 'up')}
                            className="p-1 hover:bg-black hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                            title={t('moveUp')}
                            aria-label={`${t('moveUp')}: ${ch.title}`}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === chapters.length - 1}
                            onClick={() => moveChapter(idx, 'down')}
                            className="p-1 hover:bg-black hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                            title={t('moveDown')}
                            aria-label={`${t('moveDown')}: ${ch.title}`}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => ch.id && handleDeleteChapter(ch.id)}
                            className="p-1 hover:bg-[var(--pastel-coral)] hover:text-black transition-colors cursor-pointer"
                            title={t('delete')}
                            aria-label={`${t('delete')}: ${ch.title}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <ReferenceDrawerPanel
              scenes={scenes}
              characters={characters}
              stepsProgress={stepsProgress}
              getStepContent={data.getStepContent}
              onInsertText={handleInsertAtCursor}
              scratchpadText={scratchpadText}
              onScratchpadChange={handleScratchpadChange}
              hideHeader={true}
            />
          )}
        </div>
      )}

      {/* 2. MAIN PANE: Chapter editor */}
      <div className="flex-1 flex flex-col h-full bg-[var(--bg-canvas)] overflow-hidden min-w-0">
        {selectedChapter ? (
          <>
            <div className="h-14 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between px-3 shrink-0 min-w-0 gap-2 select-none">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {!activeSidePanel && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveSidePanel('chapters')}
                      className="px-2 sm:px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title={t('chapters')}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t('chapters')}</span>
                      <span className="font-mono text-3xs bg-black text-white px-1 font-bold">
                        {chapters.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSidePanel('reference')}
                      className="px-2 sm:px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-mint)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title={t('toggleReferenceDrawer')}
                    >
                      <StickyNote className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t('referenceShort')}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <SaveStatusBadge state={saveIndicator} />
                <button
                  type="button"
                  onClick={() => setIsZenModeOpen(true)}
                  className="px-2 sm:px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  title={t('zenModeBtn')}
                >
                  <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('zenModeShort')}</span>
                </button>
              </div>
            </div>

            {/* Manuscript page: no frame, no dots, just a centred text column. */}
            <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-surface)] min-w-0">
              <div className="nb-manuscript-column shrink-0 pt-6 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xs font-heading font-black uppercase tracking-wider text-[var(--text-muted)]">
                    {t('chapter')} {chapters.findIndex((c) => c.id === selectedChapter.id) + 1}
                  </span>
                  <WordCounter text={activeContent} />
                </div>
                <input
                  key={`title-${selectedChapter.id}`}
                  dir="auto"
                  type="text"
                  value={activeTitle}
                  onChange={(e) => setActiveTitle(e.target.value)}
                  placeholder={t('chapterTitlePlaceholder')}
                  aria-label={t('chapterTitlePlaceholder')}
                  className="nb-no-focus-ring w-full mt-2 px-0 py-1.5 bg-transparent border-0 border-b-2 border-[var(--border-subtle)] focus:border-[var(--border-ink)] text-2xl font-prose font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal transition-colors"
                />
              </div>

              <textarea
                // One element per chapter, so undo history never crosses chapters.
                key={`chapter-${selectedChapter.id}`}
                dir="auto"
                ref={editorRef}
                value={activeContent}
                onChange={(e) => setActiveContent(e.target.value)}
                placeholder={t('chapterContentPlaceholder')}
                aria-label={activeTitle || t('chapter')}
                className="nb-no-focus-ring nb-manuscript w-full flex-1 min-h-0 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none overflow-y-auto border-none"
              />

              <div className="nb-manuscript-column py-2 border-t border-[var(--border-subtle)] shrink-0 select-none">
                <p className="text-2xs font-mono text-[var(--text-muted)]">{t('editorFormattingHint')}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-start justify-center p-8 bg-[var(--bg-surface)]">
            <div className="flex items-start gap-4 max-w-md mt-[12vh]">
              <span className="p-2.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shrink-0" aria-hidden="true">
                <BookOpen className="w-5 h-5" />
              </span>
              <div className="space-y-2">
                <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">{t('noChaptersYet')}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t('noChaptersDesc')}</p>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="px-4 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5 mt-1"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{t('addChapter')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isZenModeOpen && selectedChapter && (
        <ZenModeView
          title={activeTitle || selectedChapter.title}
          content={activeContent}
          onContentChange={setActiveContent}
          onClose={() => setIsZenModeOpen(false)}
        />
      )}
    </div>
  );
};
