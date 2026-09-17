import React, { useState, useEffect, useMemo } from 'react';
import { Novel, Chapter, BookFormatConfig, getBookFormatting, saveBookFormatting } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import type { LocaleKeys } from '../../locales';
import {
  BookExportService,
  paginateBook,
  paginateBookAsync,
  BookPage,
  TRIM_SIZES,
  BOOK_THEMES,
  applyBookTheme,
  detectBookTheme,
  buildBookPrintCss,
  renderBookPageContent,
  getBookPageHeaderText,
  getPagePaddings,
  detectBookRtl,
  resolveBookRtl,
} from '../../services/bookExportService';
import { 
  BookOpen, 
  FileText, 
  Download, 
  Layers, 
  Type, 
  Check, 
  FileCode, 
  Printer,
  Eye,
  ChevronLeft,
  ChevronRight,
  BookCopy,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';

interface BookStudioTabProps {
  activeNovel: Novel;
  chapters: Chapter[];
  onAutoSaveStatus?: (isSaving: boolean) => void;
}

export const BookStudioTab: React.FC<BookStudioTabProps> = ({
  activeNovel,
  chapters,
  onAutoSaveStatus,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'metadata' | 'backmatter' | 'typography' | 'preview' | 'export'>('metadata');
  const [config, setConfig] = useState<BookFormatConfig | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // BOOK direction follows the book's own language — never the app UI language.
  // An Arabic novel edited with an English UI must still bind/print as RTL.
  const detectedBookRtl = useMemo(() => {
    if (!config) return isRtl;
    return detectBookRtl(activeNovel, chapters, config);
  }, [config, activeNovel, chapters, isRtl]);
  const bookRtl = useMemo(() => {
    if (!config) return isRtl;
    return resolveBookRtl(activeNovel, chapters, config);
  }, [config, activeNovel, chapters, isRtl]);

  // Preview State
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [isSpreadView, setIsSpreadView] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

  // Export wizard state (Reedsy-style: format → size → style → export)
  const [exportFormat, setExportFormat] = useState<'epub' | 'pdf' | 'docx'>('pdf');

  // Load config on mount
  useEffect(() => {
    if (!activeNovel.id) return;
    getBookFormatting(activeNovel.id)
      .then((cfg) => {
        setConfig(cfg);
      })
      .catch((err) => {
        console.error('Failed to load book format config:', err);
      });
  }, [activeNovel.id]);

  // Debounced auto-save config whenever it changes
  useEffect(() => {
    if (!config || !activeNovel.id) return;

    onAutoSaveStatus?.(true);
    const timer = setTimeout(() => {
      saveBookFormatting(config)
        .then(() => {
          onAutoSaveStatus?.(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        })
        .catch((err) => {
          onAutoSaveStatus?.(false);
          console.error('Failed to save formatting config:', err);
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [config, activeNovel.id]);

  const updateConfig = (updates: Partial<BookFormatConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  const handleExport = async (format: 'pdf' | 'epub' | 'docx' | 'html') => {
    if (!config) return;
    setIsExporting(format);
    try {
      if (format === 'epub') {
        await BookExportService.exportEpub(activeNovel, chapters, config, bookRtl);
      } else if (format === 'docx') {
        await BookExportService.exportDocx(activeNovel, chapters, config, bookRtl);
      } else if (format === 'pdf') {
        await BookExportService.exportPrintPdf(activeNovel, chapters, config, bookRtl);
      } else if (format === 'html') {
        await BookExportService.downloadPrintHtml(activeNovel, chapters, config, bookRtl);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert(`${t('error')}: ${err}`);
    } finally {
      setIsExporting(null);
    }
  };

  // Instant estimate for first paint; replaced by measured pages below.
  const previewPages: BookPage[] = useMemo(() => {
    if (!config) return [];
    return paginateBook(activeNovel, chapters, config, bookRtl);
  }, [config, activeNovel, chapters, bookRtl]);

  // Measured pages: real browser line boxes (fonts, shaping, headings).
  // This is the same pagination the PDF export prints — preview === PDF.
  const [measuredPages, setMeasuredPages] = useState<BookPage[] | null>(null);
  useEffect(() => {
    if (!config) {
      setMeasuredPages(null);
      return;
    }
    setMeasuredPages(null);
    let cancelled = false;
    const timer = setTimeout(() => {
      paginateBookAsync(activeNovel, chapters, config, bookRtl)
        .then((pages) => {
          if (!cancelled) setMeasuredPages(pages);
        })
        .catch((err) => {
          console.warn('Preview measurement failed:', err);
          if (!cancelled) setMeasuredPages(null);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config, activeNovel, chapters, bookRtl]);

  const displayPages: BookPage[] = measuredPages ?? previewPages;

  // Single shared print stylesheet — the preview injects the exact CSS the PDF uses.
  const printCss = useMemo(() => {
    if (!config) return '';
    return buildBookPrintCss(config, bookRtl);
  }, [config, bookRtl]);

  const trimInfo = useMemo(() => {
    if (!config) return TRIM_SIZES.us_trade_6x9;
    return TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;
  }, [config]);

  // Chapter-start index for quick navigation.
  const chapterStartPages = useMemo(() => {
    return displayPages
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p.isChapterStart && (p.type === 'chapter' || p.type === 'foreword' || p.type === 'epilogue'));
  }, [displayPages]);

  // Proper book spreads: page 1 stands alone (front cover side), then verso+recto pairs.
  // [0] , [1,2] , [3,4] , ... (0-based indices). RTL mirrors the visual order.
  const spreadStartIndex = useMemo(() => {
    if (!isSpreadView) return previewPageIndex;
    if (previewPageIndex === 0) return 0;
    return previewPageIndex % 2 === 1 ? previewPageIndex : previewPageIndex - 1;
  }, [previewPageIndex, isSpreadView]);

  const visiblePages: BookPage[] = useMemo(() => {
    if (displayPages.length === 0) return [];
    if (!isSpreadView) return displayPages[previewPageIndex] ? [displayPages[previewPageIndex]] : [];
    if (spreadStartIndex === 0) return [displayPages[0]];
    const pair = [displayPages[spreadStartIndex], displayPages[spreadStartIndex + 1]].filter(Boolean) as BookPage[];
    return bookRtl ? [...pair].reverse() : pair;
  }, [displayPages, previewPageIndex, isSpreadView, spreadStartIndex, bookRtl]);

  const goPrevPage = () => {
    setPreviewPageIndex((prev) => Math.max(0, prev - (isSpreadView ? (prev <= 1 ? 1 : 2) : 1)));
  };
  const goNextPage = () => {
    setPreviewPageIndex((prev) => {
      const step = isSpreadView ? 2 : 1;
      // From the lone opening page, a spread step lands on the first full spread.
      if (isSpreadView && prev === 0) return Math.min(displayPages.length - 1, 1);
      return Math.min(displayPages.length - 1, prev + step);
    });
  };
  const toggleSpreadView = () => {
    if (!isSpreadView) {
      // Snap to the start of the current spread when entering spread mode.
      setPreviewPageIndex((prev) => (prev === 0 ? 0 : prev % 2 === 1 ? prev : Math.max(1, prev - 1)));
      setIsSpreadView(true);
    } else {
      setIsSpreadView(false);
    }
  };

  // Keep preview page index within valid bounds
  useEffect(() => {
    if (previewPageIndex >= displayPages.length && displayPages.length > 0) {
      setPreviewPageIndex(displayPages.length - 1);
    }
  }, [displayPages.length, previewPageIndex]);

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-xs font-mono text-[var(--text-muted)]">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-canvas)] nb-dots overflow-y-auto select-none">
      {/* Header Banner */}
      <div className="p-4 md:p-6 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[var(--pastel-lavender)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-base md:text-lg font-heading font-black text-[var(--text-primary)]">
              {t('bookStudioHeader')}
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans mt-1">
            {t('bookStudioSubtitle')}
          </p>
        </div>

        {saveSuccess && (
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[var(--pastel-mint)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] flex items-center gap-1">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            {t('statusSaved')}
          </span>
        )}
      </div>

      {/* Sub-Navigation Bar */}
      <div className="border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex overflow-x-auto p-2 gap-1.5 shrink-0">
        {[
          { key: 'metadata' as const, label: t('tabMetadata'), icon: FileText, color: 'var(--pastel-sky)' },
          { key: 'backmatter' as const, label: t('tabBackMatter'), icon: Layers, color: 'var(--pastel-mint)' },
          { key: 'typography' as const, label: t('tabFormatting'), icon: Type, color: 'var(--pastel-lavender)' },
          { key: 'preview' as const, label: t('tabPreview'), icon: Eye, color: 'var(--pastel-coral)' },
          { key: 'export' as const, label: t('tabExport'), icon: Download, color: 'var(--pastel-yellow)' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSubTab(key)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === key
                ? `bg-[${color}] text-black shadow-[3px_3px_0px_var(--shadow-ink)] -translate-y-0.5`
                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
            }`}
            style={{ backgroundColor: activeSubTab === key ? color : undefined }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content Form Container */}
      <div className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* TAB 1: METADATA & FRONT MATTER */}
        {activeSubTab === 'metadata' && (
          <div className="space-y-4">
            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.has_title_page}
                  onChange={(e) => updateConfig({ has_title_page: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('hasTitlePage')}
                </span>
              </label>

              {config.has_title_page && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-heading font-bold text-[var(--text-secondary)] block mb-1">
                      {t('subtitleLabel')}
                    </label>
                    <input
                      type="text"
                      value={config.subtitle}
                      onChange={(e) => updateConfig({ subtitle: e.target.value })}
                      placeholder="e.g., A Historical Saga"
                      className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-heading font-bold text-[var(--text-secondary)] block mb-1">
                      {t('authorNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={config.author_name}
                      onChange={(e) => updateConfig({ author_name: e.target.value })}
                      placeholder="e.g., Jane Doe"
                      className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-heading font-bold text-[var(--text-secondary)] block mb-1">
                      {t('publisherLabel')}
                    </label>
                    <input
                      type="text"
                      value={config.publisher_name}
                      onChange={(e) => updateConfig({ publisher_name: e.target.value })}
                      placeholder="e.g., Crysta Publishing House"
                      className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.has_copyright_page}
                  onChange={(e) => updateConfig({ has_copyright_page: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('hasCopyrightPage')}
                </span>
              </label>

              {config.has_copyright_page && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-heading font-bold text-[var(--text-secondary)] block mb-1">
                      {t('copyrightYearLabel')}
                    </label>
                    <input
                      type="text"
                      value={config.copyright_year}
                      onChange={(e) => updateConfig({ copyright_year: e.target.value })}
                      placeholder="2026"
                      className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-heading font-bold text-[var(--text-secondary)] block mb-1">
                      {t('isbnLabel')}
                    </label>
                    <input
                      type="text"
                      value={config.isbn}
                      onChange={(e) => updateConfig({ isbn: e.target.value })}
                      placeholder="978-3-16-148410-0"
                      className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-heading font-bold text-[var(--text-secondary)] block mb-1">
                      {t('editionNoticeLabel')}
                    </label>
                    <input
                      type="text"
                      value={config.edition_notice}
                      onChange={(e) => updateConfig({ edition_notice: e.target.value })}
                      placeholder="First Edition"
                      className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BACK MATTER & INTERIOR */}
        {activeSubTab === 'backmatter' && (
          <div className="space-y-4">
            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={config.has_dedication}
                  onChange={(e) => updateConfig({ has_dedication: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('hasDedication')}
                </span>
              </label>
              {config.has_dedication && (
                <div>
                  <textarea
                    value={config.dedication_text}
                    onChange={(e) => updateConfig({ dedication_text: e.target.value })}
                    placeholder={t('dedicationLabel')}
                    rows={4}
                    className="w-full text-xs p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none font-serif leading-relaxed"
                  />
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {isRtl ? '💡 يمكنك كتابة الإهداء في عدة أسطر مستقلة؛ سيتم حفظ التنسيق والمسافات بدقة.' : '💡 Supports multiple lines; line breaks and indentation will be preserved in print.'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={config.has_epigraph}
                  onChange={(e) => updateConfig({ has_epigraph: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('hasEpigraph')}
                </span>
              </label>
              {config.has_epigraph && (
                <div className="space-y-2">
                  <textarea
                    value={config.epigraph_quote}
                    onChange={(e) => updateConfig({ epigraph_quote: e.target.value })}
                    placeholder={t('epigraphQuoteLabel')}
                    rows={2}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={config.epigraph_author}
                    onChange={(e) => updateConfig({ epigraph_author: e.target.value })}
                    placeholder={t('epigraphAuthorLabel')}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={config.has_foreword}
                  onChange={(e) => updateConfig({ has_foreword: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('hasForeword')}
                </span>
              </label>
              {config.has_foreword && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={config.foreword_title}
                    onChange={(e) => updateConfig({ foreword_title: e.target.value })}
                    placeholder={t('forewordTitleLabel')}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none font-heading font-black"
                  />
                  <textarea
                    value={config.foreword_content}
                    onChange={(e) => updateConfig({ foreword_content: e.target.value })}
                    placeholder={t('forewordContentLabel')}
                    rows={4}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TYPOGRAPHY & LAYOUT */}
        {activeSubTab === 'typography' && (
          <div className="space-y-4">
            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('readingDirectionLabel')}
                </label>
                <select
                  value={config.reading_direction || 'auto'}
                  onChange={(e) => updateConfig({ reading_direction: e.target.value })}
                  className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer"
                >
                  <option value="auto">{t('readingDirectionAuto')} ({detectedBookRtl ? (isRtl ? 'يمين ← يسار' : 'RTL') : (isRtl ? 'يسار ← يمين' : 'LTR')})</option>
                  <option value="rtl">{t('readingDirectionRtl')}</option>
                  <option value="ltr">{t('readingDirectionLtr')}</option>
                </select>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  {t('readingDirectionHint')}
                </p>
              </div>

              <div>
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('trimSizeLabel')}
                </label>
                <select
                  value={config.trim_size}
                  onChange={(e) => updateConfig({ trim_size: e.target.value })}
                  className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer"
                >
                  <option value="us_trade_6x9">US Trade (6" x 9" / 152 x 229 mm)</option>
                  <option value="digest_5_5x8_5">Digest (5.5" x 8.5" / 140 x 216 mm)</option>
                  <option value="pocket_5x8">Pocket Book (5" x 8" / 127 x 203 mm)</option>
                  <option value="mass_market">Mass Market (4.25" x 6.87")</option>
                  <option value="a5">A5 International (148 x 210 mm)</option>
                  <option value="letter">Standard Letter (8.5" x 11")</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('fontFamilyLabel')}
                </label>
                <select
                  value={config.font_family}
                  onChange={(e) => updateConfig({ font_family: e.target.value })}
                  className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer"
                >
                  <optgroup label={isRtl ? 'الخطوط العربية' : 'Arabic Book Fonts'}>
                    <option value="Dubai">دبي (Dubai - خط عصري للنشر)</option>
                    <option value="Amiri">أميري (Amiri - نسخ أدبي كلاسيكي)</option>
                    <option value="Cairo">القاهرة (Cairo - خط صحفي معاصر)</option>
                    <option value="Scheherazade New">شهرزاد (Scheherazade - خط تراثي جميل)</option>
                    <option value="Noto Naskh Arabic">نوتو نسخ (Noto Naskh - خط موحد واضح)</option>
                    <option value="Almarai">المراعي (Almarai - خط هندسي أنيق)</option>
                    <option value="Readex Pro">ريديكس (Readex Pro - مقروئية عالية)</option>
                  </optgroup>
                  <optgroup label={isRtl ? 'الخطوط اللاتينية والروايات' : 'Latin & Western Fonts'}>
                    <option value="EB Garamond">EB Garamond (Classic Literature Serif)</option>
                    <option value="Lora">Lora (Contemporary Editorial)</option>
                    <option value="Cinzel">Cinzel (Cinematic Display)</option>
                    <option value="Merriweather">Merriweather (Readable Serif)</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('fontSizeLabel')}: {config.font_size}pt
                </label>
                <input
                  type="range"
                  min="9"
                  max="16"
                  step="0.5"
                  value={config.font_size}
                  onChange={(e) => updateConfig({ font_size: parseFloat(e.target.value) })}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('lineSpacingLabel')}: {config.line_spacing}x
                </label>
                <input
                  type="range"
                  min="1.1"
                  max="2.0"
                  step="0.05"
                  value={config.line_spacing}
                  onChange={(e) => updateConfig({ line_spacing: parseFloat(e.target.value) })}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.first_line_indent}
                  onChange={(e) => updateConfig({ first_line_indent: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-bold text-[var(--text-primary)]">
                  {t('firstLineIndentLabel')}
                </span>
              </label>

              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.include_page_numbers}
                    onChange={(e) => updateConfig({ include_page_numbers: e.target.checked })}
                    className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                  />
                  <span className="text-xs font-heading font-bold text-[var(--text-primary)]">
                    {t('includePageNumbersLabel')}
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('sceneBreakLabel')}
                </label>
                <input
                  type="text"
                  value={config.scene_break_ornament}
                  onChange={(e) => updateConfig({ scene_break_ornament: e.target.value })}
                  placeholder="* * *"
                  className="w-32 text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none text-center font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE BOOK PREVIEW — renders the exact print HTML/CSS the PDF exports */}
        {activeSubTab === 'preview' && (
          <div className="space-y-4">
            <style>{printCss}</style>
            <div className="p-3 border-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevPage}
                  disabled={previewPageIndex === 0}
                  className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title={t('prevPage')}
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                </button>
                <span className="text-xs font-heading font-black px-2 py-1 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] whitespace-nowrap">
                  {isSpreadView && spreadStartIndex > 0
                    ? `${spreadStartIndex + 1}–${Math.min(displayPages.length, spreadStartIndex + 2)} / ${displayPages.length}`
                    : `${previewPageIndex + 1} / ${displayPages.length}`}
                </span>
                <button
                  type="button"
                  onClick={goNextPage}
                  disabled={previewPageIndex >= displayPages.length - 1}
                  className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title={t('nextPage')}
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, displayPages.length - 1)}
                  value={previewPageIndex}
                  onChange={(e) => setPreviewPageIndex(Number(e.target.value))}
                  className="w-24 md:w-36 accent-black cursor-pointer"
                  title={`${previewPageIndex + 1} / ${displayPages.length}`}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {chapterStartPages.length > 0 && (
                  <select
                    value={previewPageIndex}
                    onChange={(e) => setPreviewPageIndex(Number(e.target.value))}
                    className="text-xs px-2 py-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer max-w-[180px]"
                    title={isRtl ? 'انتقال إلى فصل' : 'Jump to section'}
                  >
                    {chapterStartPages.map(({ p, idx }) => (
                      <option key={p.id} value={idx}>
                        {(p.chapterTitle || p.type).slice(0, 32)} — {idx + 1}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-1 px-1.5 py-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] shadow-[2px_2px_0px_var(--shadow-ink)]">
                  <button type="button" onClick={() => setPreviewZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="p-1 hover:bg-[var(--pastel-yellow)] cursor-pointer" title="Zoom out">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold min-w-[44px] text-center">{Math.round(previewZoom * 100)}%</span>
                  <button type="button" onClick={() => setPreviewZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))} className="p-1 hover:bg-[var(--pastel-yellow)] cursor-pointer" title="Zoom in">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setPreviewZoom(1)} className="p-1 hover:bg-[var(--pastel-yellow)] cursor-pointer" title="Reset zoom">
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={toggleSpreadView}
                  className={`px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSpreadView ? 'bg-[var(--pastel-yellow)] text-black' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  <BookCopy className="w-3.5 h-3.5" />
                  <span>{isSpreadView ? t('pageSpreadView') : t('singlePageView')}</span>
                </button>
              </div>
            </div>

            <div className="px-3 py-1 text-[11px] font-mono text-[var(--text-secondary)] flex flex-wrap gap-x-4 gap-y-1">
              <span>{trimInfo.name} — {trimInfo.width} × {trimInfo.height}</span>
              <span>{displayPages.length} {isRtl ? 'صفحة' : 'pages'}</span>
              <span>
                {measuredPages
                  ? (isRtl ? 'قياس دقيق للصفحات ✓' : 'precise layout ✓')
                  : (isRtl ? 'جارٍ قياس الصفحات…' : 'measuring layout…')}
              </span>
              <span>
                {bookRtl
                  ? (isRtl ? 'اتجاه الكتاب: يمين ← يسار (تجليد يمين)' : 'Book: RTL (binds right)')
                  : (isRtl ? 'اتجاه الكتاب: يسار ← يمين (تجليد يسار)' : 'Book: LTR (binds left)')}
              </span>
              <span>{isRtl ? 'الهامش الداخلي 0.85in / الخارجي 0.65in' : 'Inside 0.85in / Outside 0.65in'}</span>
              <span className="opacity-80">{isRtl ? 'المعاينة مطابقة لملف PDF' : 'Preview = PDF output'}</span>
            </div>

            <div className="flex justify-center items-start p-4 md:p-8 bg-[#2A2B2E] border-3 border-[var(--border-ink)] shadow-[5px_5px_0px_var(--shadow-ink)] overflow-auto min-h-[600px]">
              <div className="flex gap-4 md:gap-8 justify-center items-start max-w-full">
                {visiblePages.map((page) => (
                  <RenderPreviewPaperPage
                    key={page.id}
                    page={page}
                    config={config}
                    novel={activeNovel}
                    isRtl={bookRtl}
                    zoom={previewZoom}
                  />
                ))}
                {visiblePages.length === 0 && (
                  <div className="text-gray-300 text-xs font-mono p-8">
                    {isRtl ? 'لا توجد صفحات للمعاينة بعد.' : 'No pages to preview yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EXPORT WIZARD (format → size → style → export) */}
        {activeSubTab === 'export' && (
          <ExportWizard
            t={t}
            isRtl={isRtl}
            bookRtl={bookRtl}
            config={config}
            chapters={chapters}
            displayPages={displayPages}
            measured={measuredPages !== null}
            isExporting={isExporting}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            updateConfig={updateConfig}
            handleExport={handleExport}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Reedsy-style export wizard: 1 format → 2 size → 3 style → 4 export.
 * Neubrutalist cards, same design language as the rest of the app.
 */
const ExportWizard: React.FC<{
  t: (key: LocaleKeys) => string;
  isRtl: boolean;
  bookRtl: boolean;
  config: BookFormatConfig;
  chapters: Chapter[];
  displayPages: BookPage[];
  measured: boolean;
  isExporting: string | null;
  exportFormat: 'epub' | 'pdf' | 'docx';
  setExportFormat: (f: 'epub' | 'pdf' | 'docx') => void;
  updateConfig: (updates: Partial<BookFormatConfig>) => void;
  handleExport: (format: 'pdf' | 'epub' | 'docx' | 'html') => void;
}> = ({
  t, isRtl, bookRtl, config, chapters, displayPages, measured,
  isExporting, exportFormat, setExportFormat, updateConfig, handleExport,
}) => {
  const activeThemeId = detectBookTheme(config);
  const totalWords = chapters.reduce(
    (n, ch) => n + (ch.content ? ch.content.split(/\s+/).filter(Boolean).length : 0),
    0
  );
  const trim = TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;

  const stepBadge = (n: number) => (
    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-heading font-black bg-black text-white border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] shrink-0">
      {n}
    </span>
  );
  const stepTitle = (n: number, label: string) => (
    <div className="flex items-center gap-2 mb-3">
      {stepBadge(n)}
      <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">{label}</h3>
    </div>
  );

  const formats = [
    { id: 'epub' as const, icon: FileCode, color: 'var(--pastel-sky)', title: t('wizardFormatEpubTitle'), desc: t('wizardFormatEpubDesc') },
    { id: 'pdf' as const, icon: Printer, color: 'var(--pastel-mint)', title: t('wizardFormatPdfTitle'), desc: t('wizardFormatPdfDesc') },
    { id: 'docx' as const, icon: FileText, color: 'var(--pastel-lavender)', title: t('wizardFormatDocxTitle'), desc: t('wizardFormatDocxDesc') },
  ];

  return (
    <div className="space-y-4">
      {/* STEP 1 — format */}
      <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)]">
        {stepTitle(1, t('wizardStepFormat'))}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {formats.map(({ id, icon: Icon, color, title, desc }) => {
            const active = exportFormat === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setExportFormat(id)}
                className="p-3 border-3 border-[var(--border-ink)] text-black text-start cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                style={{ backgroundColor: color, boxShadow: active ? '5px 5px 0px var(--shadow-ink)' : '2px 2px 0px var(--shadow-ink)', transform: active ? 'translate(-1px, -1px)' : undefined, outline: active ? '3px solid black' : undefined, outlineOffset: active ? '2px' : undefined }}
              >
                <span className="p-1.5 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)] inline-block shadow-[2px_2px_0px_var(--shadow-ink)] mb-2">
                  <Icon className="w-5 h-5 text-black" />
                </span>
                <span className="text-sm font-heading font-black block">{title}</span>
                <span className="text-[11px] font-sans block mt-1 leading-snug">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2 — size (print only; ebooks reflow) */}
      <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)]">
        {stepTitle(2, t('wizardStepSize'))}
        {exportFormat === 'pdf' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(TRIM_SIZES).map(([id, info]) => {
              const active = (config.trim_size || 'us_trade_6x9') === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateConfig({ trim_size: id })}
                  className={`p-2.5 border-2 border-[var(--border-ink)] text-start cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                    active ? 'bg-[var(--pastel-yellow)] text-black shadow-[3px_3px_0px_var(--shadow-ink)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                  }`}
                >
                  <span className="text-xs font-heading font-black block">{info.name}</span>
                  <span className="text-[10px] font-mono opacity-70 block">{info.width} × {info.height}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-secondary)] font-sans">
            {exportFormat === 'epub' ? t('wizardSizeEpubNote') : t('wizardSizeDocxNote')}
          </p>
        )}
      </div>

      {/* STEP 3 — theme + options */}
      <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)]">
        {stepTitle(3, t('wizardStepStyle'))}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BOOK_THEMES.map((theme) => {
            const active = activeThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => updateConfig(applyBookTheme(config, theme.id))}
                className={`p-3 border-3 border-[var(--border-ink)] bg-[#FFFFFC] text-[#111] text-start cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  active ? 'shadow-[5px_5px_0px_var(--shadow-ink)]' : 'shadow-[2px_2px_0px_var(--shadow-ink)]'
                }`}
                style={{ outline: active ? '3px solid black' : undefined, outlineOffset: active ? '2px' : undefined, transform: active ? 'translate(-1px, -1px)' : undefined }}
              >
                <span className="text-sm font-black block" style={{ fontFamily: `'${theme.font_family}', serif` }}>
                  {(t as (k: string) => string)(`wizardTheme_${theme.id}_name`)}
                </span>
                <span className="text-[11px] block mt-0.5 opacity-70" style={{ fontFamily: `'${theme.font_family}', serif` }}>
                  {(t as (k: string) => string)(`wizardTheme_${theme.id}_desc`)}
                </span>
                <span className="text-base block mt-2 leading-relaxed" style={{ fontFamily: `'${theme.font_family}', serif` }} dir={bookRtl ? 'rtl' : 'ltr'}>
                  {bookRtl ? 'كان يا ما كان في قديم الزمان' : 'It was a bright cold day in April'}
                </span>
                <span className="text-[10px] font-mono block mt-1 opacity-60" dir="ltr">
                  {theme.font_family} · {theme.font_size}pt · {theme.line_spacing}x
                </span>
              </button>
            );
          })}
        </div>
        {!activeThemeId && (
          <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-2">
            {t('wizardThemeCustom')}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-heading font-bold text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={config.include_page_numbers}
              onChange={(e) => updateConfig({ include_page_numbers: e.target.checked })}
              className="w-4 h-4 accent-black cursor-pointer"
            />
            {t('includePageNumbersLabel')}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-bold text-[var(--text-primary)]">{t('sceneBreakLabel')}</span>
            <input
              type="text"
              value={config.scene_break_ornament}
              onChange={(e) => updateConfig({ scene_break_ornament: e.target.value })}
              className="w-28 text-xs p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-center font-mono focus:outline-none"
            />
          </div>
          <div className="text-xs font-mono text-[var(--text-secondary)] flex items-center">
            {bookRtl ? t('wizardBookRtl') : t('wizardBookLtr')}
          </div>
        </div>
      </div>

      {/* STEP 4 — review + export */}
      <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[4px_4px_0px_var(--shadow-ink)]">
        {stepTitle(4, t('wizardStepExport'))}
        <div className="text-xs font-sans leading-relaxed mb-3" dir={isRtl ? 'rtl' : 'ltr'}>
          <span className="font-bold">{t('wizardSummaryFormat')}: </span>
          {exportFormat === 'pdf' ? t('wizardFormatPdfTitle') : exportFormat === 'epub' ? t('wizardFormatEpubTitle') : t('wizardFormatDocxTitle')}
          {exportFormat === 'pdf' && (<><span className="font-bold"> · {t('wizardSummarySize')}: </span>{trim.name}</>)}
          <span className="font-bold"> · {t('wizardSummaryStyle')}: </span>
          {activeThemeId ? (t as (k: string) => string)(`wizardTheme_${activeThemeId}_name`) : t('wizardThemeCustomShort')}
          <span className="font-bold"> · {t('wizardSummaryContent')}: </span>
          {chapters.length} {t('chapters')} · {totalWords.toLocaleString()} {t('zenWords')} · {displayPages.length} {t('wizardSummaryPages')}
          {!measured && exportFormat === 'pdf' && <span className="opacity-70"> ({t('wizardMeasuring')})</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport(exportFormat)}
            disabled={isExporting !== null}
            className="px-5 py-2.5 text-sm font-heading font-black border-2 border-[var(--border-ink)] bg-black text-white shadow-[3px_3px_0px_rgba(0,0,0,0.4)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? t('exporting') : t('wizardExportBtn')}
          </button>
          {exportFormat === 'pdf' && (
            <button
              type="button"
              onClick={() => handleExport('html')}
              disabled={isExporting !== null}
              className="px-4 py-2.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-black hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title={t('downloadHtmlBtn')}
            >
              {t('downloadHtmlBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Single paper page for the live preview. Uses the EXACT same HTML builders as
 * the PDF export (renderBookPageContent + header helpers) and the shared print
 * CSS injected by the parent, so preview === PDF by construction.
 */
const RenderPreviewPaperPage: React.FC<{
  page: BookPage;
  config: BookFormatConfig;
  novel: Novel;
  isRtl: boolean;
  zoom?: number;
}> = ({ page, config, novel, isRtl, zoom = 1 }) => {
  const trim = TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;
  const pageHeightPx = Math.round(trim.heightIn * 96);
  const pageWidthPx = Math.round(trim.widthIn * 96);
  const baseHeight = 580;
  const scale = (baseHeight / pageHeightPx) * zoom;
  const scaledWidth = Math.round(pageWidthPx * scale);
  const scaledHeight = Math.round(pageHeightPx * scale);
  const paddings = getPagePaddings(page.side, isRtl);
  const headerText = getBookPageHeaderText(page, novel.title);
  const bodyHtml = React.useMemo(
    () => renderBookPageContent(page, novel, config, isRtl),
    [page, novel, config, isRtl]
  );

  const pageLabel = page.isChapterStart && page.chapterTitle
    ? page.chapterTitle
    : `${page.type} · ${page.side}${page.pageNumber !== null ? ` · ${page.pageNumber}` : ''}`;

  // Overflow guard: if the browser lays this page out taller than the fixed
  // trim box (fractional line rounding, tall Arabic diacritics), flag it instead
  // of silently clipping the last line like before.
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => {
      try {
        setHasOverflow(el.scrollHeight > el.clientHeight + 2);
      } catch {
        /* ignore */
      }
    };
    check();
    const raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [bodyHtml, pageWidthPx, pageHeightPx, scale]);

  return (
    <div className="shrink-0 flex flex-col items-center gap-2 select-text">
      <div
        className="relative"
        style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
      >
        <div
          className="book-page absolute top-0 left-0 overflow-hidden"
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            width: `${pageWidthPx}px`,
            height: `${pageHeightPx}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            paddingTop: '0.75in',
            paddingBottom: '0.75in',
            paddingLeft: paddings.left,
            paddingRight: paddings.right,
            boxSizing: 'border-box',
            background: '#FFFFFC',
            color: '#111111',
            boxShadow: '6px 6px 0px rgba(0,0,0,0.6)',
            border: hasOverflow ? '2px solid #DC2626' : '2px solid #000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div className="page-header" style={{ height: '24pt', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{headerText}</div>
          <div ref={bodyRef} className="page-body" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          <div className="page-footer" style={{ height: '24pt', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{page.pageNumber !== null ? <span>{page.pageNumber}</span> : <span style={{ opacity: 0 }}>–</span>}</div>
        </div>
      </div>
      <div className="text-[10px] font-mono text-gray-400 max-w-[220px] truncate" title={pageLabel}>
        {pageLabel}
      </div>
      {hasOverflow && (
        <div className="text-[10px] font-bold px-2 py-0.5 bg-red-600 text-white border border-black" title={isRtl ? 'النص أطول من الصفحة — قد يُقص السطر الأخير في PDF' : 'Text overflows this page — last line may clip in PDF'}>
          {isRtl ? '⚠ تجاوز النص حد الصفحة' : '⚠ Text overflow'}
        </div>
      )}
    </div>
  );
};
