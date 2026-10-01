import React, { useState, useEffect, useRef } from 'react';
import {
  Novel,
  Chapter,
  BookFormatConfig,
  BookLanguage,
  getBookFormatting,
  saveBookFormatting,
  getCoverImage,
  saveCoverImage,
  showInFolder,
} from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { BookExportService, resolveBookLanguage } from '../../services/bookExportService';
import { useKeyedAutosave } from '../../hooks/useKeyedAutosave';
import { SaveStatus } from '../../utils/autosave';
import { isUnsupportedOnMobile } from '../../utils/platform';
import { errorMessage, useToast } from '../Toast';
import {
  BookOpen,
  FileText,
  Download,
  Layers,
  Type,
  Check,
  FileCode,
  Printer,
  Image as ImageIcon,
  Upload,
  Trash2,
  RefreshCw,
  FolderOpen,
  X
} from 'lucide-react';

interface BookStudioTabProps {
  activeNovel: Novel;
  chapters: Chapter[];
  isChaptersLoaded: boolean;
  onSaveStatus: (status: SaveStatus, error?: unknown) => void;
}

type SubTab = 'metadata' | 'backmatter' | 'typography' | 'export';

const MAX_COVER_BYTES = 5 * 1024 * 1024;

const fieldClass =
  'w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)]';
const cardClass =
  'p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-3';
const labelClass = 'text-2xs font-heading font-bold text-[var(--text-secondary)] block mb-1';

export const BookStudioTab: React.FC<BookStudioTabProps> = ({
  activeNovel,
  chapters,
  isChaptersLoaded,
  onSaveStatus,
}) => {
  const { t } = useLanguage();
  const { notify } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('metadata');
  const [config, setConfig] = useState<BookFormatConfig | null>(null);
  const [coverImage, setCoverImage] = useState('');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportedResult, setExportedResult] = useState<{ format: string; path: string } | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const configSaver = useKeyedAutosave<BookFormatConfig>({
    delay: 600,
    onStatus: onSaveStatus,
    save: async (cfg) => {
      const id = await saveBookFormatting(cfg);
      if (cfg.id === undefined || cfg.id === null) {
        setConfig((prev) => (prev && !prev.id ? { ...prev, id } : prev));
      }
    },
  });

  useEffect(() => {
    if (!activeNovel.id) return;
    let cancelled = false;
    Promise.all([getBookFormatting(activeNovel.id), getCoverImage(activeNovel.id)])
      .then(([cfg, cover]) => {
        if (cancelled) return;
        // Older projects stored "Garamond", which maps to the bundled EB Garamond.
        setConfig(cfg.font_family === 'Garamond' ? { ...cfg, font_family: 'EB Garamond' } : cfg);
        setCoverImage(cover);
      })
      .catch((err) => notify(`${t('error')}: ${errorMessage(err)}`));
    return () => {
      cancelled = true;
    };
    // Loaded once per open of the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNovel.id]);

  const updateConfig = (updates: Partial<BookFormatConfig>) => {
    if (!config) return;
    const next = { ...config, ...updates };
    setConfig(next);
    configSaver.schedule('config', next);
  };

  const updateCover = async (dataUrl: string) => {
    if (!activeNovel.id) return;
    const previous = coverImage;
    setCoverImage(dataUrl);
    onSaveStatus('saving');
    try {
      await saveCoverImage(activeNovel.id, dataUrl);
      onSaveStatus('saved');
    } catch (err) {
      setCoverImage(previous);
      onSaveStatus('error', err);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_COVER_BYTES) {
      notify(t('coverTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        void updateCover(reader.result);
      }
    };
    reader.onerror = () => notify(`${t('error')}: ${errorMessage(reader.error)}`);
    reader.readAsDataURL(file);
  };

  const handleExport = async (format: 'pdf' | 'epub' | 'docx') => {
    if (!config) return;
    setIsExporting(format);
    setExportedResult(null);
    const book = { novel: activeNovel, chapters, config, coverImage };
    try {
      if (format === 'epub') {
        const path = await BookExportService.exportEpub(book);
        if (path) setExportedResult({ format: 'EPUB 3', path });
      } else if (format === 'docx') {
        const path = await BookExportService.exportDocx(book);
        if (path) setExportedResult({ format: 'Word (DOCX)', path });
      } else {
        await BookExportService.exportPrintPdf(book);
        setExportedResult({ format: 'PDF', path: '' });
      }
    } catch (err) {
      if (isUnsupportedOnMobile(err)) {
        notify(t('featureUnsupportedMobile'), 'info');
      } else {
        console.error('Export error:', err);
        notify(`${t('error')}: ${errorMessage(err)}`);
      }
    } finally {
      setIsExporting(null);
    }
  };

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-xs font-mono text-[var(--text-muted)]" role="status">
        {t('loading')}
      </div>
    );
  }

  const resolvedLanguage = resolveBookLanguage(config, chapters, activeNovel.title);

  const checkbox = (key: keyof BookFormatConfig, label: string) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean(config[key])}
        onChange={(e) => updateConfig({ [key]: e.target.checked } as Partial<BookFormatConfig>)}
        className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
      />
      <span className="text-xs font-heading font-black text-[var(--text-primary)]">{label}</span>
    </label>
  );

  const exportCard = (
    format: 'epub' | 'docx' | 'pdf',
    title: string,
    buttonLabel: string,
    Icon: typeof FileCode,
    bg: string
  ) => (
    <div className={`p-4 border-3 border-[var(--border-ink)] ${bg} text-black shadow-[4px_4px_0px_var(--shadow-ink)] flex flex-col justify-between space-y-4`}>
      <div className="flex items-center gap-2.5">
        <span className="p-2 bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000000] shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <h3 className="text-sm font-heading font-black">{title}</h3>
      </div>
      <button
        type="button"
        onClick={() => handleExport(format)}
        disabled={isExporting !== null || !isChaptersLoaded}
        className="w-full py-2 px-3 text-xs font-heading font-black border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting === format ? t('exporting') : buttonLabel}
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-canvas)] nb-dots overflow-y-auto select-none">
      {/* Header */}
      <div className="p-4 md:p-6 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-[var(--pastel-lavender)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] shrink-0">
            <BookOpen className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-base md:text-lg font-heading font-black text-[var(--text-primary)] leading-tight">
              {t('bookStudioHeader')}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
              {t('bookStudioSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex overflow-x-auto p-2 gap-1.5 shrink-0" role="tablist">
        {[
          { key: 'metadata' as const, label: t('tabMetadata'), icon: FileText, color: 'var(--pastel-sky)' },
          { key: 'backmatter' as const, label: t('tabBackMatter'), icon: Layers, color: 'var(--pastel-mint)' },
          { key: 'typography' as const, label: t('tabFormatting'), icon: Type, color: 'var(--pastel-lavender)' },
          { key: 'export' as const, label: t('tabExport'), icon: Download, color: 'var(--pastel-yellow)' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeSubTab === key}
            onClick={() => setActiveSubTab(key)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === key
                ? 'text-black shadow-[3px_3px_0px_var(--shadow-ink)] -translate-y-0.5'
                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
            }`}
            style={{ backgroundColor: activeSubTab === key ? color : undefined }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto space-y-6 select-text">
        {/* TAB 1: METADATA & FRONT MATTER */}
        {activeSubTab === 'metadata' && (
          <div className="space-y-4">
            {/* Cover */}
            <div className="p-4 md:p-5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-[var(--border-ink)] pb-3">
                <span className="p-2 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-xs font-heading font-black text-[var(--text-primary)]">
                    {t('coverSectionTitle')}
                  </h2>
                  <p className="text-2xs text-[var(--text-secondary)] font-mono mt-0.5">
                    {t('coverDimensionsHint')}
                  </p>
                </div>
              </div>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverUpload}
                className="hidden"
                aria-label={t('coverUploadBtn')}
              />

              {coverImage ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-3 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)]">
                  <div className="relative shrink-0 w-32 sm:w-36 aspect-[2/3] bg-black/5 border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden flex items-center justify-center">
                    <img src={coverImage} alt={t('coverSectionTitle')} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-2xs font-mono font-bold bg-[var(--pastel-mint)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] mb-1">
                        {t('coverSet')}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)]">{t('coverSetDesc')}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{t('coverReplaceBtn')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCover('')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black bg-[var(--pastel-coral)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('coverRemoveBtn')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] p-6 sm:p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-[2px_2px_0px_var(--shadow-ink)] group"
                >
                  <span className="p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] group-hover:-translate-y-0.5 transition-transform">
                    <Upload className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-heading font-black text-[var(--text-primary)] mt-1">{t('coverUploadBtn')}</span>
                  <span className="text-2xs font-mono text-[var(--text-muted)] text-center">{t('noCoverPlaceholder')}</span>
                </button>
              )}
            </div>

            {/* Book language */}
            <div className={cardClass}>
              <label htmlFor="book-language" className="text-xs font-heading font-black text-[var(--text-primary)] block">
                {t('bookLanguageLabel')}
              </label>
              <select
                id="book-language"
                value={config.book_language}
                onChange={(e) => updateConfig({ book_language: e.target.value as BookLanguage })}
                className={`${fieldClass} cursor-pointer`}
              >
                <option value="">{t('bookLanguageAuto')} — {resolvedLanguage === 'ar' ? t('bookLanguageAr') : t('bookLanguageEn')}</option>
                <option value="ar">{t('bookLanguageAr')}</option>
                <option value="en">{t('bookLanguageEn')}</option>
              </select>
            </div>

            {/* Title page */}
            <div className={cardClass}>
              {checkbox('has_title_page', t('hasTitlePage'))}
              {config.has_title_page && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label htmlFor="book-subtitle" className={labelClass}>{t('subtitleLabel')}</label>
                    <input id="book-subtitle" type="text" value={config.subtitle} onChange={(e) => updateConfig({ subtitle: e.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="book-author" className={labelClass}>{t('authorNameLabel')}</label>
                    <input id="book-author" type="text" value={config.author_name} onChange={(e) => updateConfig({ author_name: e.target.value })} className={fieldClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="book-publisher" className={labelClass}>{t('publisherLabel')}</label>
                    <input id="book-publisher" type="text" value={config.publisher_name} onChange={(e) => updateConfig({ publisher_name: e.target.value })} className={fieldClass} />
                  </div>
                </div>
              )}
            </div>

            {/* Copyright */}
            <div className={cardClass}>
              {checkbox('has_copyright_page', t('hasCopyrightPage'))}
              {config.has_copyright_page && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label htmlFor="book-year" className={labelClass}>{t('copyrightYearLabel')}</label>
                    <input id="book-year" type="text" value={config.copyright_year} onChange={(e) => updateConfig({ copyright_year: e.target.value })} placeholder={String(new Date().getFullYear())} className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="book-isbn" className={labelClass}>{t('isbnLabel')}</label>
                    <input id="book-isbn" type="text" value={config.isbn} onChange={(e) => updateConfig({ isbn: e.target.value })} placeholder="978-3-16-148410-0" className={fieldClass} dir="ltr" />
                  </div>
                  <div>
                    <label htmlFor="book-edition" className={labelClass}>{t('editionNoticeLabel')}</label>
                    <input id="book-edition" type="text" value={config.edition_notice} onChange={(e) => updateConfig({ edition_notice: e.target.value })} className={fieldClass} />
                  </div>
                </div>
              )}
            </div>

            {/* Dedication, epigraph, foreword, TOC */}
            <div className={cardClass}>
              {checkbox('has_dedication', t('hasDedication'))}
              {config.has_dedication && (
                <div>
                  <textarea
                    value={config.dedication_text}
                    onChange={(e) => updateConfig({ dedication_text: e.target.value })}
                    placeholder={t('dedicationLabel')}
                    aria-label={t('dedicationLabel')}
                    rows={4}
                    className={`${fieldClass} font-prose leading-relaxed`}
                  />
                  <p className="text-2xs text-[var(--text-secondary)] mt-1">{t('dedicationHint')}</p>
                </div>
              )}
            </div>

            <div className={cardClass}>
              {checkbox('has_epigraph', t('hasEpigraph'))}
              {config.has_epigraph && (
                <div className="space-y-2">
                  <textarea value={config.epigraph_quote} onChange={(e) => updateConfig({ epigraph_quote: e.target.value })} placeholder={t('epigraphQuoteLabel')} aria-label={t('epigraphQuoteLabel')} rows={2} className={fieldClass} />
                  <input type="text" value={config.epigraph_author} onChange={(e) => updateConfig({ epigraph_author: e.target.value })} placeholder={t('epigraphAuthorLabel')} aria-label={t('epigraphAuthorLabel')} className={fieldClass} />
                </div>
              )}
            </div>

            <div className={cardClass}>
              {checkbox('has_foreword', t('hasForeword'))}
              {config.has_foreword && (
                <div className="space-y-2">
                  <input type="text" value={config.foreword_title} onChange={(e) => updateConfig({ foreword_title: e.target.value })} placeholder={t('forewordTitleLabel')} aria-label={t('forewordTitleLabel')} className={`${fieldClass} font-heading font-black`} />
                  <textarea value={config.foreword_content} onChange={(e) => updateConfig({ foreword_content: e.target.value })} placeholder={t('forewordContentLabel')} aria-label={t('forewordContentLabel')} rows={5} className={fieldClass} />
                </div>
              )}
            </div>

            <div className={cardClass}>
              {checkbox('has_table_of_contents', t('hasTableOfContents'))}
            </div>
          </div>
        )}

        {/* TAB 2: BACK MATTER */}
        {activeSubTab === 'backmatter' && (
          <div className="space-y-4">
            <div className={cardClass}>
              {checkbox('has_epilogue', t('hasEpilogue'))}
              {config.has_epilogue && (
                <div className="space-y-2">
                  <input type="text" value={config.epilogue_title} onChange={(e) => updateConfig({ epilogue_title: e.target.value })} placeholder={t('epilogueTitleLabel')} aria-label={t('epilogueTitleLabel')} className={`${fieldClass} font-heading font-black`} />
                  <textarea value={config.epilogue_content} onChange={(e) => updateConfig({ epilogue_content: e.target.value })} placeholder={t('epilogueContentLabel')} aria-label={t('epilogueContentLabel')} rows={5} className={fieldClass} />
                </div>
              )}
            </div>

            <div className={cardClass}>
              {checkbox('has_acknowledgments', t('hasAcknowledgments'))}
              {config.has_acknowledgments && (
                <textarea value={config.acknowledgments_content} onChange={(e) => updateConfig({ acknowledgments_content: e.target.value })} placeholder={t('acknowledgmentsLabel')} aria-label={t('acknowledgmentsLabel')} rows={5} className={fieldClass} />
              )}
            </div>

            <div className={cardClass}>
              {checkbox('has_about_author', t('hasAboutAuthor'))}
              {config.has_about_author && (
                <textarea value={config.about_author_bio} onChange={(e) => updateConfig({ about_author_bio: e.target.value })} placeholder={t('aboutAuthorBioLabel')} aria-label={t('aboutAuthorBioLabel')} rows={5} className={fieldClass} />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TYPOGRAPHY & LAYOUT */}
        {activeSubTab === 'typography' && (
          <div className="space-y-4">
            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="book-font" className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('fontFamilyLabel')}
                </label>
                <select id="book-font" value={config.font_family} onChange={(e) => updateConfig({ font_family: e.target.value })} className={`${fieldClass} cursor-pointer`}>
                  <optgroup label={t('bookLanguageAr')}>
                    <option value="Amiri">Amiri — أميري</option>
                    <option value="Scheherazade New">Scheherazade New — شهرزاد</option>
                    <option value="Noto Naskh Arabic">Noto Naskh Arabic — نوتو نسخ</option>
                    <option value="Cairo">Cairo — القاهرة</option>
                    <option value="Almarai">Almarai — المراعي</option>
                    <option value="Readex Pro">Readex Pro — ريديكس</option>
                    <option value="Dubai">Dubai — دبي</option>
                  </optgroup>
                  <optgroup label={t('bookLanguageEn')}>
                    <option value="EB Garamond">EB Garamond</option>
                    <option value="Lora">Lora</option>
                    <option value="Merriweather">Merriweather</option>
                    <option value="Cinzel">Cinzel</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label htmlFor="book-font-size" className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1.5">
                  {t('fontSizeLabel')}: {config.font_size}pt
                </label>
                <input
                  id="book-font-size"
                  type="range"
                  min="9"
                  max="16"
                  step="0.5"
                  value={config.font_size}
                  onChange={(e) => updateConfig({ font_size: parseFloat(e.target.value) })}
                  className="nb-range"
                  style={{ '--slider-fill': `${Math.min(100, Math.max(0, ((config.font_size - 9) / 7) * 100))}%` } as React.CSSProperties}
                />
              </div>

              <div>
                <label htmlFor="book-line-spacing" className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1.5">
                  {t('lineSpacingLabel')}: {config.line_spacing}x
                </label>
                <input
                  id="book-line-spacing"
                  type="range"
                  min="1.1"
                  max="2.0"
                  step="0.05"
                  value={config.line_spacing}
                  onChange={(e) => updateConfig({ line_spacing: parseFloat(e.target.value) })}
                  className="nb-range"
                  style={{ '--slider-fill': `${Math.min(100, Math.max(0, ((config.line_spacing - 1.1) / 0.9) * 100))}%` } as React.CSSProperties}
                />
              </div>

              <div>
                <label htmlFor="book-trim" className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('trimSizeLabel')}
                </label>
                <select id="book-trim" value={config.trim_size} onChange={(e) => updateConfig({ trim_size: e.target.value })} className={`${fieldClass} cursor-pointer`}>
                  <option value="us_trade_6x9">{t('trimUsTrade')}</option>
                  <option value="digest_5_5x8_5">{t('trimDigest')}</option>
                  <option value="pocket_4_25x6_87">{t('trimPocket')}</option>
                  <option value="a5">{t('trimA5')}</option>
                  <option value="a4">{t('trimA4')}</option>
                  <option value="us_letter">{t('trimLetter')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="book-numbering" className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('chapterNumberingLabel')}
                </label>
                <select id="book-numbering" value={config.chapter_numbering_style} onChange={(e) => updateConfig({ chapter_numbering_style: e.target.value })} className={`${fieldClass} cursor-pointer`}>
                  <option value="number_title">{t('chapterNumberingNumberTitle')}</option>
                  <option value="title_only">{t('chapterNumberingTitleOnly')}</option>
                  <option value="number_only">{t('chapterNumberingNumberOnly')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="book-scene-break" className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1">
                  {t('sceneBreakLabel')}
                </label>
                <input id="book-scene-break" type="text" value={config.scene_break_ornament} onChange={(e) => updateConfig({ scene_break_ornament: e.target.value })} placeholder="* * *" className={`${fieldClass} font-mono max-w-xs`} />
                <p className="text-2xs text-[var(--text-secondary)] mt-1">{t('sceneBreakHint')}</p>
              </div>
            </div>

            <div className={cardClass}>
              {checkbox('first_line_indent', t('firstLineIndentLabel'))}
              {checkbox('include_page_numbers', t('includePageNumbersLabel'))}
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT */}
        {activeSubTab === 'export' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exportCard('epub', 'EPUB 3', t('exportEpubBtn'), FileCode, 'bg-[var(--pastel-sky)]')}
              {exportCard('docx', 'Word (DOCX)', t('exportDocxBtn'), FileText, 'bg-[var(--pastel-lavender)]')}
              {exportCard('pdf', 'PDF', t('exportPdfBtn'), Printer, 'bg-[var(--pastel-mint)]')}
            </div>

            {exportedResult && (
              <div role="status" className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[4px_4px_0px_var(--shadow-ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="p-1.5 bg-black text-white border-2 border-black shrink-0 mt-0.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-heading font-black">
                      {t('exportSuccess')} ({exportedResult.format})
                    </h4>
                    {exportedResult.path ? (
                      <p className="text-2xs font-mono text-neutral-800 break-all mt-0.5 select-text">
                        {t('exportSavedTo')} <span className="font-bold underline">{exportedResult.path}</span>
                      </p>
                    ) : (
                      <p className="text-2xs text-neutral-800 mt-0.5">{t('printDialogOpened')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {exportedResult.path && (
                    <button
                      type="button"
                      onClick={() => showInFolder(exportedResult.path).catch((err) => notify(`${t('error')}: ${errorMessage(err)}`))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{t('openFolderBtn')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExportedResult(null)}
                    aria-label={t('dismiss')}
                    title={t('dismiss')}
                    className="p-1 text-black hover:bg-black/10 border-2 border-transparent hover:border-black transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] text-xs text-[var(--text-secondary)] flex flex-wrap gap-x-6 gap-y-1">
              <span className="font-heading font-black text-[var(--text-primary)]">
                {t('statsChaptersCount')}: {chapters.length}
              </span>
              <span className="font-heading font-bold">
                {t('bookLanguageLabel')}: {resolvedLanguage === 'ar' ? t('bookLanguageAr') : t('bookLanguageEn')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
