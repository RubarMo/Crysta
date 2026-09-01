import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Novel, Chapter, BookFormatConfig, getBookFormatting, saveBookFormatting } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { BookExportService } from '../../services/bookExportService';
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
  BookCopy
} from 'lucide-react';

interface BookStudioTabProps {
  activeNovel: Novel;
  chapters: Chapter[];
  onAutoSaveStatus?: (isSaving: boolean) => void;
}

const PREVIEW_PAGE_WIDTH = 380;
const PREVIEW_PAGE_HEIGHT = 580;
const PREVIEW_CONTENT_WIDTH = 324;
const PREVIEW_CONTENT_HEIGHT = 480;
const PREVIEW_COLUMN_GAP = 40;

interface BookPreviewPage {
  id: string;
  type: 'title' | 'copyright' | 'dedication' | 'epigraph' | 'foreword' | 'chapter' | 'epilogue' | 'about_author';
  title?: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  paragraphs?: string[];
  pageNumber: number | null;
  side: 'recto' | 'verso';
  pageInChapter: number;
  totalChapterPages?: number;
  chapterIndex?: number;
  isChapterStart?: boolean;
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

  // Preview State
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [isSpreadView, setIsSpreadView] = useState(false);
  const [chapterPageCounts, setChapterPageCounts] = useState<Record<string, number>>({});
  const measureRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
        await BookExportService.exportEpub(activeNovel, chapters, config, isRtl);
      } else if (format === 'docx') {
        await BookExportService.exportDocx(activeNovel, chapters, config, isRtl);
      } else if (format === 'pdf') {
        BookExportService.exportPrintPdf(activeNovel, chapters, config, isRtl);
      } else if (format === 'html') {
        BookExportService.downloadPrintHtml(activeNovel, chapters, config, isRtl);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert(`${t('error')}: ${err}`);
    } finally {
      setIsExporting(null);
    }
  };

  // Measure exact column pages using native CSS multi-column engine
  const updateMeasurements = () => {
    const newCounts: Record<string, number> = {};
    let changed = false;

    Object.entries(measureRefs.current).forEach(([key, el]) => {
      if (el) {
        const scrollW = el.scrollWidth;
        const count = Math.max(1, Math.round((scrollW + PREVIEW_COLUMN_GAP) / (PREVIEW_CONTENT_WIDTH + PREVIEW_COLUMN_GAP)));
        newCounts[key] = count;
        if (chapterPageCounts[key] !== count) {
          changed = true;
        }
      }
    });

    if (changed || Object.keys(newCounts).length !== Object.keys(chapterPageCounts).length) {
      setChapterPageCounts(newCounts);
    }
  };

  useLayoutEffect(() => {
    updateMeasurements();
  });

  useEffect(() => {
    // Re-measure when web fonts finish downloading
    if (document.fonts) {
      document.fonts.ready.then(() => {
        updateMeasurements();
      });
    }
  }, [config?.font_family]);

  // Compile full paginated list of pages for live preview
  const previewPages: BookPreviewPage[] = useMemo(() => {
    if (!config) return [];
    const pages: BookPreviewPage[] = [];
    let pageCount = 0;

    // 1. Title Page (Front matter: page 1, hidden number)
    if (config.has_title_page) {
      pageCount++;
      pages.push({
        id: 'title_page',
        type: 'title',
        title: activeNovel.title,
        subtitle: config.subtitle,
        author: config.author_name || (isRtl ? 'المؤلف' : 'Author'),
        publisher: config.publisher_name,
        pageNumber: null,
        side: pageCount % 2 === 1 ? 'recto' : 'verso',
        pageInChapter: 0,
      });
    }

    // 2. Copyright Page (Front matter: page 2, hidden number)
    if (config.has_copyright_page) {
      pageCount++;
      pages.push({
        id: 'copyright_page',
        type: 'copyright',
        title: activeNovel.title,
        author: config.author_name || '',
        pageNumber: null,
        side: pageCount % 2 === 1 ? 'recto' : 'verso',
        pageInChapter: 0,
      });
    }

    // 3. Dedication Page (Front matter: hidden number)
    if (config.has_dedication && config.dedication_text) {
      pageCount++;
      pages.push({
        id: 'dedication_page',
        type: 'dedication',
        paragraphs: config.dedication_text.split('\n').filter(Boolean),
        pageNumber: null,
        side: pageCount % 2 === 1 ? 'recto' : 'verso',
        pageInChapter: 0,
      });
    }

    // 4. Epigraph Page (Front matter: hidden number)
    if (config.has_epigraph && config.epigraph_quote) {
      pageCount++;
      pages.push({
        id: 'epigraph_page',
        type: 'epigraph',
        title: config.epigraph_quote,
        author: config.epigraph_author,
        pageNumber: null,
        side: pageCount % 2 === 1 ? 'recto' : 'verso',
        pageInChapter: 0,
      });
    }

    // 5. Foreword Page (Front matter: hidden number)
    if (config.has_foreword && config.foreword_content) {
      const fCount = chapterPageCounts['foreword'] || 1;
      const paras = config.foreword_content.split('\n\n').filter(Boolean);
      for (let pIdx = 0; pIdx < fCount; pIdx++) {
        pageCount++;
        pages.push({
          id: `foreword_page_${pIdx + 1}`,
          type: 'foreword',
          title: config.foreword_title || (isRtl ? 'مقدمة' : 'Foreword'),
          paragraphs: paras,
          pageNumber: null,
          side: pageCount % 2 === 1 ? 'recto' : 'verso',
          pageInChapter: pIdx,
          totalChapterPages: fCount,
          isChapterStart: pIdx === 0,
        });
      }
    }

    // 6. Chapters (Continues sequential physical page numbering starting where front matter ended)
    chapters.forEach((ch, chIdx) => {
      const chTitle = ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${chIdx + 1}`;
      const rawContent = ch.content.trim();
      const paras = rawContent ? rawContent.split('\n\n').filter(Boolean) : [isRtl ? '(محتوى الفصل فارغ حالياً...)' : '(Chapter content is currently empty...)'];
      const chCount = chapterPageCounts[`ch_${chIdx}`] || 1;

      for (let pIdx = 0; pIdx < chCount; pIdx++) {
        pageCount++;
        pages.push({
          id: `ch_${ch.id || chIdx}_page_${pIdx + 1}`,
          type: 'chapter',
          title: chTitle,
          paragraphs: paras,
          pageNumber: config.include_page_numbers ? pageCount : null,
          side: pageCount % 2 === 1 ? 'recto' : 'verso',
          pageInChapter: pIdx,
          totalChapterPages: chCount,
          chapterIndex: chIdx,
          isChapterStart: pIdx === 0,
        });
      }
    });

    // 7. Epilogue
    if (config.has_epilogue && config.epilogue_content) {
      const epiCount = chapterPageCounts['epilogue'] || 1;
      const paras = config.epilogue_content.split('\n\n').filter(Boolean);
      for (let pIdx = 0; pIdx < epiCount; pIdx++) {
        pageCount++;
        pages.push({
          id: `epilogue_page_${pIdx + 1}`,
          type: 'epilogue',
          title: config.epilogue_title || (isRtl ? 'خاتمة' : 'Epilogue'),
          paragraphs: paras,
          pageNumber: config.include_page_numbers ? pageCount : null,
          side: pageCount % 2 === 1 ? 'recto' : 'verso',
          pageInChapter: pIdx,
          totalChapterPages: epiCount,
          isChapterStart: pIdx === 0,
        });
      }
    }

    // 8. About the Author
    if (config.has_about_author && config.about_author_bio) {
      pageCount++;
      pages.push({
        id: 'about_author_page',
        type: 'about_author',
        title: isRtl ? 'عن المؤلف' : 'About the Author',
        paragraphs: config.about_author_bio.split('\n\n').filter(Boolean),
        pageNumber: config.include_page_numbers ? pageCount : null,
        side: pageCount % 2 === 1 ? 'recto' : 'verso',
        pageInChapter: 0,
        isChapterStart: true,
      });
    }

    return pages;
  }, [config, activeNovel, chapters, isRtl, chapterPageCounts]);

  // Keep preview page index within valid bounds
  useEffect(() => {
    if (previewPageIndex >= previewPages.length && previewPages.length > 0) {
      setPreviewPageIndex(previewPages.length - 1);
    }
  }, [previewPages.length, previewPageIndex]);

  // Get active font family style
  const getFontFamilyStyle = (font: string) => {
    switch (font) {
      case 'Dubai': return "'Dubai', 'Segoe UI', 'Amiri', sans-serif";
      case 'Amiri': return "'Amiri', 'Traditional Arabic', serif";
      case 'Cairo': return "'Cairo', sans-serif";
      case 'Scheherazade New': return "'Scheherazade New', 'Amiri', serif";
      case 'Noto Naskh Arabic': return "'Noto Naskh Arabic', 'Amiri', serif";
      case 'Almarai': return "'Almarai', sans-serif";
      case 'Readex Pro': return "'Readex Pro', sans-serif";
      case 'EB Garamond': return "'EB Garamond', Garamond, Georgia, serif";
      case 'Lora': return "'Lora', Georgia, serif";
      case 'Cinzel': return "'Cinzel', Georgia, serif";
      case 'Merriweather': return "'Merriweather', Georgia, serif";
      case 'Times New Roman': return "'Times New Roman', Times, serif";
      case 'Georgia': return "Georgia, serif";
      default: return "'Amiri', 'EB Garamond', serif";
    }
  };

  const currentFontFamily = getFontFamilyStyle(config?.font_family || 'Amiri');

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

        {/* TAB 4: LIVE BOOK PREVIEW */}
        {activeSubTab === 'preview' && (
          <div className="space-y-4">
            <div className="p-3 border-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPageIndex((prev) => Math.max(0, prev - (isSpreadView ? 2 : 1)))}
                  disabled={previewPageIndex === 0}
                  className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title={t('prevPage')}
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                </button>
                <span className="text-xs font-heading font-black px-2 py-1 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)]">
                  {isSpreadView
                    ? `${previewPageIndex + 1} - ${Math.min(previewPages.length, previewPageIndex + 2)} / ${previewPages.length}`
                    : `${previewPageIndex + 1} / ${previewPages.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPageIndex((prev) => Math.min(previewPages.length - 1, prev + (isSpreadView ? 2 : 1)))}
                  disabled={isSpreadView ? previewPageIndex >= previewPages.length - 2 : previewPageIndex >= previewPages.length - 1}
                  className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title={t('nextPage')}
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpreadView(!isSpreadView)}
                  className={`px-2.5 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSpreadView ? 'bg-[var(--pastel-yellow)] text-black' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  <BookCopy className="w-3.5 h-3.5" />
                  <span>{isSpreadView ? t('pageSpreadView') : t('singlePageView')}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-center items-center p-4 md:p-8 bg-[#2A2B2E] border-3 border-[var(--border-ink)] shadow-[5px_5px_0px_var(--shadow-ink)] overflow-x-auto min-h-[600px]">
              <div className="flex gap-4 md:gap-8 justify-center items-stretch max-w-full">
                {previewPages[previewPageIndex] && (
                  <RenderPreviewPaperPage
                    page={previewPages[previewPageIndex]}
                    config={config}
                    fontFamily={currentFontFamily}
                    isRtl={isRtl}
                  />
                )}
                {isSpreadView && previewPages[previewPageIndex + 1] && (
                  <RenderPreviewPaperPage
                    page={previewPages[previewPageIndex + 1]}
                    config={config}
                    fontFamily={currentFontFamily}
                    isRtl={isRtl}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EXPORT & DOWNLOAD */}
        {activeSubTab === 'export' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-sky)] text-black shadow-[4px_4px_0px_var(--shadow-ink)] flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)] inline-block shadow-[2px_2px_0px_var(--shadow-ink)] mb-2">
                    <FileCode className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="text-sm font-heading font-black">EPUB 3 eBook</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('epub')}
                  disabled={isExporting !== null}
                  className="w-full py-2 px-3 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting === 'epub' ? t('exporting') : t('exportEpubBtn')}
                </button>
              </div>

              <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[4px_4px_0px_var(--shadow-ink)] flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)] inline-block shadow-[2px_2px_0px_var(--shadow-ink)] mb-2">
                    <FileText className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="text-sm font-heading font-black">Word Manuscript (DOCX)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('docx')}
                  disabled={isExporting !== null}
                  className="w-full py-2 px-3 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting === 'docx' ? t('exporting') : t('exportDocxBtn')}
                </button>
              </div>

              <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[4px_4px_0px_var(--shadow-ink)] flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)] inline-block shadow-[2px_2px_0px_var(--shadow-ink)] mb-2">
                    <Printer className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="text-sm font-heading font-black">Print-Ready PDF</h3>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting !== null}
                    className="w-full py-2 px-3 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExporting === 'pdf' ? t('exporting') : t('exportPdfBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('html')}
                    disabled={isExporting !== null}
                    className="w-full py-1.5 px-3 text-[11px] font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] hover:bg-black hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                    title={t('downloadHtmlBtn')}
                  >
                    {t('downloadHtmlBtn')}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] text-xs text-[var(--text-secondary)]">
              <span className="font-heading font-black text-[var(--text-primary)] block mb-1">
                {t('statsChaptersCount')}: {chapters.length} {t('chapters')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Offscreen Measurement DOM: Used by CSS multi-column engine to measure exact page counts */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-99999px',
          left: '-99999px',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -9999,
        }}
      >
        {/* Measure Foreword */}
        {config.has_foreword && config.foreword_content && (
          <div
            ref={(el) => { measureRefs.current['foreword'] = el; }}
            style={{
              width: `${PREVIEW_CONTENT_WIDTH}px`,
              height: `${PREVIEW_CONTENT_HEIGHT}px`,
              columnWidth: `${PREVIEW_CONTENT_WIDTH}px`,
              columnGap: `${PREVIEW_COLUMN_GAP}px`,
              columnFill: 'auto',
              direction: isRtl ? 'rtl' : 'ltr',
              fontFamily: currentFontFamily,
              fontSize: `${config.font_size || 11}pt`,
              lineHeight: config.line_spacing || 1.45,
              textAlign: 'justify',
            }}
          >
            <h2 className="font-black text-center mb-6 mt-1 leading-snug" style={{ fontSize: `${(config.font_size || 11) * 1.5}pt` }}>
              {config.foreword_title || (isRtl ? 'مقدمة' : 'Foreword')}
            </h2>
            <div>
              {config.foreword_content.split('\n\n').filter(Boolean).map((p, i) => (
                <p key={i} className="leading-relaxed" style={{ margin: 0, textIndent: i === 0 ? '0' : config.first_line_indent ? '1.5em' : '0' }}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Measure Chapters */}
        {chapters.map((ch, idx) => {
          const chTitle = ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${idx + 1}`;
          const rawContent = ch.content.trim();
          const paras = rawContent ? rawContent.split('\n\n').filter(Boolean) : [isRtl ? '(محتوى الفصل فارغ حالياً...)' : '(Chapter content is currently empty...)'];

          return (
            <div
              key={`measure_ch_${ch.id || idx}`}
              ref={(el) => { measureRefs.current[`ch_${idx}`] = el; }}
              style={{
                width: `${PREVIEW_CONTENT_WIDTH}px`,
                height: `${PREVIEW_CONTENT_HEIGHT}px`,
                columnWidth: `${PREVIEW_CONTENT_WIDTH}px`,
                columnGap: `${PREVIEW_COLUMN_GAP}px`,
                columnFill: 'auto',
                direction: isRtl ? 'rtl' : 'ltr',
                fontFamily: currentFontFamily,
                fontSize: `${config.font_size || 11}pt`,
                lineHeight: config.line_spacing || 1.45,
                textAlign: 'justify',
              }}
            >
              <h2 className="font-black text-center mb-6 mt-1 leading-snug" style={{ fontSize: `${(config.font_size || 11) * 1.5}pt` }}>
                {chTitle}
              </h2>
              <div>
                {paras.map((p, pIdx) => {
                  if (p.trim() === '* * *' || p.trim() === config.scene_break_ornament) {
                    return (
                      <div key={pIdx} className="text-center font-mono font-bold my-4 text-xs tracking-widest" style={{ breakInside: 'avoid' }}>
                        {config.scene_break_ornament || '* * *'}
                      </div>
                    );
                  }
                  return (
                    <p key={pIdx} className="leading-relaxed" style={{ margin: 0, textIndent: pIdx === 0 ? '0' : config.first_line_indent ? '1.5em' : '0' }}>
                      {p}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Measure Epilogue */}
        {config.has_epilogue && config.epilogue_content && (
          <div
            ref={(el) => { measureRefs.current['epilogue'] = el; }}
            style={{
              width: `${PREVIEW_CONTENT_WIDTH}px`,
              height: `${PREVIEW_CONTENT_HEIGHT}px`,
              columnWidth: `${PREVIEW_CONTENT_WIDTH}px`,
              columnGap: `${PREVIEW_COLUMN_GAP}px`,
              columnFill: 'auto',
              direction: isRtl ? 'rtl' : 'ltr',
              fontFamily: currentFontFamily,
              fontSize: `${config.font_size || 11}pt`,
              lineHeight: config.line_spacing || 1.45,
              textAlign: 'justify',
            }}
          >
            <h2 className="font-black text-center mb-6 mt-1 leading-snug" style={{ fontSize: `${(config.font_size || 11) * 1.5}pt` }}>
              {config.epilogue_title || (isRtl ? 'خاتمة' : 'Epilogue')}
            </h2>
            <div>
              {config.epilogue_content.split('\n\n').filter(Boolean).map((p, i) => (
                <p key={i} className="leading-relaxed" style={{ margin: 0, textIndent: i === 0 ? '0' : config.first_line_indent ? '1.5em' : '0' }}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual Page Paper Component for Live WYSIWYG Book Preview
 */
const RenderPreviewPaperPage: React.FC<{
  page: BookPreviewPage;
  config: BookFormatConfig;
  fontFamily: string;
  isRtl: boolean;
}> = ({ page, config, fontFamily, isRtl }) => {
  return (
    <div
      className="bg-[#FFFFFC] text-[#111111] border-2 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.6)] flex flex-col justify-between shrink-0 select-text transition-all relative overflow-hidden"
      style={{
        width: `${PREVIEW_PAGE_WIDTH}px`,
        height: `${PREVIEW_PAGE_HEIGHT}px`,
        padding: '24px 28px 16px 28px',
      }}
    >
      {/* 1. Title Page */}
      {page.type === 'title' && (
        <div className="flex-1 flex flex-col justify-between text-center py-8">
          <div className="space-y-3 mt-8">
            <h1 className="text-2xl sm:text-3xl font-black leading-tight">{page.title}</h1>
            {page.subtitle && <p className="text-sm text-gray-600 font-serif">{page.subtitle}</p>}
          </div>
          <div className="space-y-3 mb-4">
            <p className="text-base font-bold">{page.author}</p>
            {page.publisher && <p className="text-xs text-gray-500">{page.publisher}</p>}
          </div>
        </div>
      )}

      {/* 2. Copyright Page */}
      {page.type === 'copyright' && (
        <div className="flex-1 flex flex-col justify-end text-center text-[11px] space-y-2 pb-6 leading-relaxed text-gray-700">
          <p className="font-bold text-xs text-black">{page.title}</p>
          <p>© {config.copyright_year || '2026'} {page.author}</p>
          {config.edition_notice && <p>{config.edition_notice}</p>}
          {config.isbn && <p>ISBN: {config.isbn}</p>}
          <p className="text-[10px] text-gray-500 pt-3">
            {isRtl
              ? 'جميع الحقوق محفوظة. لا يجوز نسخ أو إعادة إنتاج أي جزء من هذا الكتاب دون إذن مسبق.'
              : 'All rights reserved. No part of this publication may be reproduced without prior permission.'}
          </p>
        </div>
      )}

      {/* 3. Dedication Page */}
      {page.type === 'dedication' && (
        <div className="flex-1 flex flex-col justify-center text-center italic space-y-3 px-6">
          {page.paragraphs?.map((line, i) => (
            <p key={i} className="font-serif text-[12pt] leading-relaxed m-0">{line}</p>
          ))}
        </div>
      )}

      {/* 4. Epigraph Page */}
      {page.type === 'epigraph' && (
        <div className="flex-1 flex flex-col justify-center text-center italic space-y-4 px-6">
          <p className="text-sm font-serif leading-relaxed">«{page.title}»</p>
          {page.author && <p className="text-xs font-bold not-italic text-gray-700">— {page.author}</p>}
        </div>
      )}

      {/* 5. Chapters, Foreword, Epilogue, About Author (CSS Multi-column flow) */}
      {(page.type === 'chapter' || page.type === 'foreword' || page.type === 'epilogue' || page.type === 'about_author') && (
        <div
          className="w-full flex-1 overflow-hidden relative"
          style={{
            height: `${PREVIEW_CONTENT_HEIGHT}px`,
            width: `${PREVIEW_CONTENT_WIDTH}px`,
          }}
        >
          <div
            style={{
              width: `${PREVIEW_CONTENT_WIDTH}px`,
              height: `${PREVIEW_CONTENT_HEIGHT}px`,
              columnWidth: `${PREVIEW_CONTENT_WIDTH}px`,
              columnGap: `${PREVIEW_COLUMN_GAP}px`,
              columnFill: 'auto',
              direction: isRtl ? 'rtl' : 'ltr',
              fontFamily,
              fontSize: `${config.font_size || 11}pt`,
              lineHeight: config.line_spacing || 1.45,
              textAlign: 'justify',
              transform: isRtl
                ? `translateX(${page.pageInChapter * (PREVIEW_CONTENT_WIDTH + PREVIEW_COLUMN_GAP)}px)`
                : `translateX(-${page.pageInChapter * (PREVIEW_CONTENT_WIDTH + PREVIEW_COLUMN_GAP)}px)`,
            }}
          >
            {page.title && (
              <h2
                className="font-black text-center mb-6 mt-1 leading-snug"
                style={{ fontSize: `${(config.font_size || 11) * 1.5}pt` }}
              >
                {page.title}
              </h2>
            )}
            <div>
              {page.paragraphs?.map((p, idx) => {
                if (p.trim() === '* * *' || p.trim() === config.scene_break_ornament) {
                  return (
                    <div
                      key={idx}
                      className="text-center font-mono font-bold my-4 text-xs tracking-widest"
                      style={{ breakInside: 'avoid' }}
                    >
                      {config.scene_break_ornament || '* * *'}
                    </div>
                  );
                }
                return (
                  <p
                    key={idx}
                    className="leading-relaxed"
                    style={{
                      margin: 0,
                      textIndent:
                        idx === 0
                          ? '0'
                          : config.first_line_indent
                          ? '1.5em'
                          : '0',
                    }}
                  >
                    {p}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Running Footer with Page Number */}
      <div className="h-7 flex items-center justify-center font-serif font-bold text-gray-800 shrink-0 select-none text-[10.5pt]">
        {page.pageNumber !== null ? (
          <span>{page.pageNumber}</span>
        ) : (
          <span className="opacity-0">-</span>
        )}
      </div>
    </div>
  );
};
