import React, { useState, useEffect, useRef } from 'react';
import { Novel, Chapter, Scene, Character, StepProgress, getChapters, saveChapter, deleteChapter, reorderChapters } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { WordCounter } from '../WordCounter';
import { ReferenceDrawerPanel } from './ReferenceDrawerPanel';
import { ZenModeView } from './ZenModeView';
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
  onUpdateNovel?: (novel: Novel) => void;
  scenes: Scene[];
  characters: Character[];
  stepsProgress: StepProgress[];
  onAutoSaveStatus?: (isSaving: boolean) => void;
}

export const WriteNovelTab: React.FC<WriteNovelTabProps> = ({
  activeNovel,
  onUpdateNovel,
  scenes,
  characters,
  stepsProgress,
  onAutoSaveStatus,
}) => {
  const { t } = useLanguage();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  
  // Unified studio side panel: 'chapters' | 'reference' | null
  const [activeSidePanel, setActiveSidePanel] = useState<'chapters' | 'reference' | null>('chapters');
  
  // Active drafting chapter fields
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');

  const [scratchpadText, setScratchpadText] = useState(() => {
    return localStorage.getItem(`crysta_scratchpad_${activeNovel.id}`) || '';
  });

  // Zen Mode state
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load chapters on mount
  const loadChapters = async () => {
    if (!activeNovel.id) return;
    try {
      const list = await getChapters(activeNovel.id);
      setChapters(list);
      if (list.length > 0 && selectedChapterId === null) {
        setSelectedChapterId(list[0].id || null);
        setActiveTitle(list[0].title);
        setActiveContent(list[0].content);
      }
    } catch (err) {
      console.error('Failed to load chapters:', err);
    }
  };

  useEffect(() => {
    loadChapters();
  }, [activeNovel.id]);

  // Sync active fields when selected chapter changes
  useEffect(() => {
    if (selectedChapterId !== null) {
      const ch = chapters.find((c) => c.id === selectedChapterId);
      if (ch) {
        setActiveTitle(ch.title);
        setActiveContent(ch.content);
      }
    }
  }, [selectedChapterId]);

  // Keyboard shortcut: Ctrl+Shift+R to toggle Reference Drawer
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

  // Save scratchpad
  const handleScratchpadChange = (text: string) => {
    setScratchpadText(text);
    if (activeNovel.id) {
      localStorage.setItem(`crysta_scratchpad_${activeNovel.id}`, text);
    }
  };

  // Debounced auto-save for the active chapter
  useEffect(() => {
    if (selectedChapterId === null || !activeNovel.id) return;

    onAutoSaveStatus?.(true);
    const timer = setTimeout(async () => {
      const ch = chapters.find((c) => c.id === selectedChapterId);
      if (!ch) return;

      const updated: Chapter = {
        ...ch,
        title: activeTitle,
        content: activeContent,
      };

      try {
        await saveChapter(updated);
        setChapters((prev) => {
          const next = prev.map((c) => (c.id === selectedChapterId ? updated : c));
          const totalWords = next.reduce((sum, chap) => sum + (chap.content.trim() ? chap.content.trim().split(/\s+/).length : 0), 0);
          onUpdateNovel?.({ ...activeNovel, current_word_count: totalWords });
          return next;
        });
        onAutoSaveStatus?.(false);
      } catch (err) {
        onAutoSaveStatus?.(false);
        console.error('Failed to auto-save chapter:', err);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [activeTitle, activeContent, selectedChapterId, activeNovel.id]);

  // Create Chapter
  const handleAddChapter = async () => {
    if (!activeNovel.id) return;
    const newSortOrder = chapters.length;
    const newCh: Chapter = {
      novel_id: activeNovel.id,
      title: `${t('chapter')} ${chapters.length + 1}`,
      content: '',
      sort_order: newSortOrder,
    };

    try {
      const id = await saveChapter(newCh);
      const created = { ...newCh, id };
      const updatedList = [...chapters, created];
      setChapters(updatedList);
      setSelectedChapterId(id);
      setActiveTitle(created.title);
      setActiveContent('');
    } catch (err) {
      console.error('Failed to create chapter:', err);
      alert(`${t('error')}: ${err}`);
    }
  };

  // Delete Chapter
  const handleDeleteChapter = async (id: number) => {
    if (!activeNovel.id) return;
    if (!window.confirm(t('deleteChapterConfirm'))) return;

    try {
      await deleteChapter(id, activeNovel.id);
      const remaining = chapters.filter((c) => c.id !== id);
      setChapters(remaining);
      if (selectedChapterId === id) {
        if (remaining.length > 0) {
          setSelectedChapterId(remaining[0].id || null);
          setActiveTitle(remaining[0].title);
          setActiveContent(remaining[0].content);
        } else {
          setSelectedChapterId(null);
          setActiveTitle('');
          setActiveContent('');
        }
      }
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      alert(`${t('error')}: ${err}`);
    }
  };

  // Reorder Chapter Up/Down
  const handleMoveChapter = async (index: number, direction: 'up' | 'down') => {
    if (!activeNovel.id) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const newList = [...chapters];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    setChapters(newList);
    try {
      const ids = newList.map((c) => c.id!).filter(Boolean);
      await reorderChapters(activeNovel.id, ids);
    } catch (err) {
      console.error('Failed to reorder chapters:', err);
    }
  };

  // 1-Click Caret Insertion Bridge from Reference Drawer
  const handleInsertAtCursor = (textToInsert: string) => {
    const textarea = editorRef.current;
    if (!textarea) {
      setActiveContent((prev) => (prev ? `${prev}\n\n${textToInsert}` : textToInsert));
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = activeContent.substring(0, start);
    const after = activeContent.substring(end);
    
    // Add clean paragraph spacing if inserting in middle
    const formattedInsert = (before && !before.endsWith('\n\n') ? '\n\n' : '') + textToInsert + (after && !after.startsWith('\n\n') ? '\n\n' : '');
    const newContent = before + formattedInsert + after;
    setActiveContent(newContent);

    // Reposition cursor right after inserted text
    setTimeout(() => {
      textarea.focus();
      const newPos = start + formattedInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // Total Word Counts
  const totalNovelWords = chapters.reduce((acc, c) => {
    const text = c.id === selectedChapterId ? activeContent : c.content;
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    return acc + count;
  }, 0);

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[var(--bg-canvas)] nb-dots relative">
      {/* 1. UNIFIED STUDIO SIDE PANEL: Chapters OR Reference Companion */}
      {activeSidePanel && (
        <div className="w-80 border-e-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex flex-col h-full select-none shrink-0 z-10 overflow-hidden">
          {/* Top Header Bar: Segmented Switcher for Chapters & Reference */}
          <div className="h-14 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between px-2.5 shrink-0 gap-1.5">
            {/* Tab Switcher Buttons */}
            <div className="flex items-center gap-1 min-w-0">
              {/* Chapters Tab Button */}
              <button
                type="button"
                onClick={() => setActiveSidePanel('chapters')}
                className={`px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeSidePanel === 'chapters'
                    ? 'bg-[var(--pastel-sky)] text-black shadow-[2px_2px_0px_var(--shadow-ink)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                }`}
                title={t('chapters')}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('chapters')}</span>
                <span className="font-mono text-[9px] bg-black text-white px-1 font-bold shrink-0">
                  {chapters.length}
                </span>
              </button>

              {/* Reference Tab Button */}
              <button
                type="button"
                onClick={() => setActiveSidePanel('reference')}
                className={`px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeSidePanel === 'reference'
                    ? 'bg-[var(--pastel-mint)] text-black shadow-[2px_2px_0px_var(--shadow-ink)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                }`}
                title={t('referenceDrawerTitle')}
              >
                <StickyNote className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('referenceShort')}</span>
              </button>
            </div>

            {/* Action Buttons: Add Chapter (if in chapters mode) & Close Sidebar */}
            <div className="flex items-center gap-1 shrink-0">
              {activeSidePanel === 'chapters' && (
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="p-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center"
                  title={t('addChapter')}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSidePanel(null)}
                className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                title={t('close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body Content Under Header */}
          {activeSidePanel === 'chapters' ? (
            <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-surface-raised)] overflow-hidden">
              {/* Aggregate Word Count Metrics */}
              <div className="p-2.5 border-b-2 border-[var(--border-ink)] bg-[var(--bg-surface)] space-y-1 shrink-0">
                <div className="flex justify-between items-center text-[10px] font-heading font-bold text-[var(--text-secondary)]">
                  <span>{t('totalNovelWords')}</span>
                  <span className="font-mono font-black text-[var(--text-primary)]">
                    {totalNovelWords.toLocaleString()} / {activeNovel.target_word_count.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-surface-raised)] h-2 border border-[var(--border-ink)] overflow-hidden">
                  <div
                    className="bg-[var(--pastel-mint)] h-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, activeNovel.target_word_count > 0 ? (totalNovelWords / activeNovel.target_word_count) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Chapters Navigation List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 pb-16">
                {chapters.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs mt-2">
                    {t('noChaptersYet')}
                  </div>
                ) : (
                  chapters.map((ch, idx) => {
                    const isSelected = ch.id === selectedChapterId;
                    const chWords = (ch.id === selectedChapterId ? activeContent : ch.content)
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length;

                    return (
                      <div
                        key={ch.id || idx}
                        className={`group flex items-center justify-between gap-1.5 p-2 border-2 border-[var(--border-ink)] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[3px_3px_0px_var(--shadow-ink)] translate-x-0.5'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                        onClick={() => setSelectedChapterId(ch.id || null)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-[9px] px-1 bg-black text-white font-bold">
                              #{idx + 1}
                            </span>
                            <h4 className="text-xs font-heading truncate">
                              {ch.id === selectedChapterId ? activeTitle : ch.title}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                            {chWords} {t('words')}
                          </span>
                        </div>

                        {/* Move Up/Down & Delete Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveChapter(idx, 'up');
                            }}
                            className="p-1 hover:bg-black hover:text-white transition-colors disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === chapters.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveChapter(idx, 'down');
                            }}
                            className="p-1 hover:bg-black hover:text-white transition-colors disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              ch.id && handleDeleteChapter(ch.id);
                            }}
                            className="p-1 hover:bg-[var(--pastel-coral)] hover:text-black transition-colors"
                            title={t('delete')}
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
              onClose={() => setActiveSidePanel(null)}
              onInsertText={handleInsertAtCursor}
              scratchpadText={scratchpadText}
              onScratchpadChange={handleScratchpadChange}
              hideHeader={true}
            />
          )}
        </div>
      )}

      {/* 2. MAIN PANE: Chapter Drafting Workspace */}
      <div className="flex-1 flex flex-col h-full bg-[var(--bg-canvas)] overflow-hidden min-w-0">
        {selectedChapter ? (
          <>
            {/* Top Action Toolbar */}
            <div className="h-14 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between px-3 shrink-0 min-w-0 gap-2 select-none">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {!activeSidePanel && (
                  <>
                    {/* Toggle Chapters Panel Button */}
                    <button
                      type="button"
                      onClick={() => setActiveSidePanel('chapters')}
                      className="px-2 sm:px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title={t('chapters')}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t('chapters')}</span>
                      <span className="font-mono text-[9px] bg-black text-white px-1 font-bold">
                        {chapters.length}
                      </span>
                    </button>

                    {/* Toggle Reference Companion Button */}
                    <button
                      type="button"
                      onClick={() => setActiveSidePanel('reference')}
                      className="px-2 sm:px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-mint)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title={t('referenceDrawerTitle')}
                    >
                      <StickyNote className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t('referenceShort')}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Zen Mode Button */}
                <button
                  type="button"
                  onClick={() => setIsZenModeOpen(true)}
                  className="px-2 sm:px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  title={t('zenModeBtn')}
                >
                  <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('zenModeShort')}</span>
                </button>
              </div>
            </div>

            {/* Prose Editor Manuscript Page */}
            <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-hidden flex justify-center bg-[var(--bg-canvas)] nb-dots min-w-0">
              <div className="w-full max-w-4xl flex flex-col h-full min-w-0 border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] shadow-[4px_4px_0px_var(--shadow-ink)] overflow-hidden">
                {/* Manuscript Header with Chapter Title */}
                <div className="p-4 sm:p-5 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] space-y-2.5 shrink-0">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--text-secondary)]">
                    <span className="bg-black text-white px-2.5 py-1 font-heading text-[11px] font-black">
                      {t('chapter')} #{chapters.findIndex((c) => c.id === selectedChapter.id) + 1}
                    </span>
                    <WordCounter text={activeContent} />
                  </div>
                  <input
                    type="text"
                    value={activeTitle}
                    onChange={(e) => setActiveTitle(e.target.value)}
                    placeholder={t('chapterTitlePlaceholder')}
                    className="w-full px-3.5 py-2 text-sm sm:text-base md:text-lg font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none focus:bg-[var(--bg-surface-raised)] placeholder:text-[var(--text-muted)] transition-all"
                  />
                </div>

                {/* Manuscript Text Body */}
                <div className="flex-1 min-h-0 flex flex-col relative bg-[var(--bg-surface)]">
                  <textarea
                    ref={editorRef}
                    value={activeContent}
                    onChange={(e) => setActiveContent(e.target.value)}
                    placeholder={t('chapterContentPlaceholder')}
                    className="w-full h-full flex-1 p-4 sm:p-6 md:p-8 text-sm sm:text-base font-serif leading-loose bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-0 resize-none overflow-y-auto border-none"
                    style={{ lineHeight: 1.9 }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--text-secondary)] font-heading space-y-3">
            <div className="p-4 bg-[var(--pastel-yellow)] text-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)]">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-black text-[var(--text-primary)]">{t('noChaptersYet')}</h3>
            <p className="text-xs max-w-sm">{t('noChaptersDesc')}</p>
            <button
              type="button"
              onClick={handleAddChapter}
              className="px-4 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-sky)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('addChapter')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Zen Mode Overlay (takes over full app window) */}
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
