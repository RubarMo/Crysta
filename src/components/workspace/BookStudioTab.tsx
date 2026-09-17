import React, { useState, useEffect, useRef } from 'react';
import { Novel, Chapter, BookFormatConfig, getBookFormatting, saveBookFormatting, showInFolder } from '../../lib';
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
  onAutoSaveStatus?: (isSaving: boolean) => void;
}

export const BookStudioTab: React.FC<BookStudioTabProps> = ({
  activeNovel,
  chapters,
  onAutoSaveStatus,
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'metadata' | 'backmatter' | 'typography' | 'export'>('metadata');
  const [config, setConfig] = useState<BookFormatConfig | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportedResult, setExportedResult] = useState<{ format: string; path: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'ar' ? 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت' : 'Image is too large. Please select an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateConfig({ cover_image: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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

  const handleExport = async (format: 'pdf' | 'epub' | 'docx') => {
    if (!config) return;
    setIsExporting(format);
    setExportedResult(null);
    try {
      if (format === 'epub') {
        const path = await BookExportService.exportEpub(activeNovel, chapters, config, isRtl);
        if (path) {
          setExportedResult({ format: 'EPUB 3', path });
        }
      } else if (format === 'docx') {
        const path = await BookExportService.exportDocx(activeNovel, chapters, config, isRtl);
        if (path) {
          setExportedResult({ format: 'Word (DOCX)', path });
        }
      } else if (format === 'pdf') {
        BookExportService.exportPrintPdf(activeNovel, chapters, config, isRtl);
        setExportedResult({ format: 'PDF', path: '' });
      }
    } catch (err) {
      console.error('Export error:', err);
      alert(`${t('error')}: ${err}`);
    } finally {
      setIsExporting(null);
    }
  };

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
          { key: 'export' as const, label: t('tabExport'), icon: Download, color: 'var(--pastel-yellow)' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSubTab(key)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === key
                ? `text-black shadow-[3px_3px_0px_#000000] -translate-y-0.5`
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
            {/* Book Cover Card */}
            <div className="p-4 md:p-5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-4">
              <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border-ink)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)]">
                    <ImageIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-xs font-heading font-black text-[var(--text-primary)]">
                      {t('coverSectionTitle')}
                    </h2>
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                      {t('coverDimensionsHint')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverUpload}
                className="hidden"
              />

              {config.cover_image ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-3 bg-[var(--bg-surface)] border-2 border-[var(--border-ink)]">
                  {/* Cover Preview */}
                  <div className="relative shrink-0 w-32 sm:w-36 aspect-[2/3] bg-black/5 border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden flex items-center justify-center">
                    <img
                      src={config.cover_image}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Actions & details */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-[var(--pastel-mint)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] mb-1">
                        {language === 'ar' ? 'تم تعيين الغلاف' : 'Cover Set'}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {language === 'ar' 
                          ? 'سيتم تضمين هذا الغلاف في مقدمة الكتاب وتصدير ملفات EPUB و PDF.' 
                          : 'This cover will be included at the front of the book and embedded in EPUB and PDF exports.'}
                      </p>
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
                        onClick={() => updateConfig({ cover_image: '' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black bg-[var(--pastel-coral)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('coverRemoveBtn')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Upload Dropzone */
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] p-6 sm:p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-[2px_2px_0px_var(--shadow-ink)] group"
                >
                  <div className="p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] group-hover:-translate-y-0.5 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-heading font-black text-[var(--text-primary)] mt-1">
                    {t('coverUploadBtn')}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] text-center">
                    {t('noCoverPlaceholder')}
                  </span>
                </div>
              )}
            </div>
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

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={config.has_epilogue}
                  onChange={(e) => updateConfig({ has_epilogue: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('hasEpilogue')}
                </span>
              </label>
              {config.has_epilogue && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={config.epilogue_title}
                    onChange={(e) => updateConfig({ epilogue_title: e.target.value })}
                    placeholder={t('epilogueTitleLabel')}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none font-heading font-black"
                  />
                  <textarea
                    value={config.epilogue_content}
                    onChange={(e) => updateConfig({ epilogue_content: e.target.value })}
                    placeholder={t('epilogueContentLabel')}
                    rows={4}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={config.has_about_author}
                  onChange={(e) => updateConfig({ has_about_author: e.target.checked })}
                  className="w-4 h-4 accent-black border-2 border-[var(--border-ink)] cursor-pointer"
                />
                <span className="text-xs font-heading font-black text-[var(--text-primary)]">
                  {t('hasAboutAuthor')}
                </span>
              </label>
              {config.has_about_author && (
                <textarea
                  value={config.about_author_bio}
                  onChange={(e) => updateConfig({ about_author_bio: e.target.value })}
                  placeholder={t('aboutAuthorBioLabel')}
                  rows={4}
                  className="w-full text-xs p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TYPOGRAPHY & STYLING */}
        {activeSubTab === 'typography' && (
          <div className="space-y-4">
            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
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
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1.5">
                  {t('fontSizeLabel')}: {config.font_size}pt
                </label>
                <input
                  type="range"
                  min="9"
                  max="16"
                  step="0.5"
                  value={config.font_size}
                  onChange={(e) => updateConfig({ font_size: parseFloat(e.target.value) })}
                  className="nb-range"
                  style={{
                    '--slider-fill': `${Math.min(100, Math.max(0, (((config.font_size ?? 11) - 9) / (16 - 9)) * 100))}%`
                  } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="text-xs font-heading font-black text-[var(--text-primary)] block mb-1.5">
                  {t('lineSpacingLabel')}: {config.line_spacing}x
                </label>
                <input
                  type="range"
                  min="1.1"
                  max="2.0"
                  step="0.05"
                  value={config.line_spacing}
                  onChange={(e) => updateConfig({ line_spacing: parseFloat(e.target.value) })}
                  className="nb-range"
                  style={{
                    '--slider-fill': `${Math.min(100, Math.max(0, (((config.line_spacing ?? 1.4) - 1.1) / (2.0 - 1.1)) * 100))}%`
                  } as React.CSSProperties}
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
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT & DOWNLOAD */}
        {activeSubTab === 'export' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-sky)] text-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-ink)] inline-block shadow-[2px_2px_0px_#000000] mb-2">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-heading font-black">EPUB 3 eBook</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('epub')}
                  disabled={isExporting !== null}
                  className="w-full py-2 px-3 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_#000000] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting === 'epub' ? t('exporting') : t('exportEpubBtn')}
                </button>
              </div>

              <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-ink)] inline-block shadow-[2px_2px_0px_#000000] mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-heading font-black">Word Manuscript (DOCX)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('docx')}
                  disabled={isExporting !== null}
                  className="w-full py-2 px-3 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_#000000] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting === 'docx' ? t('exporting') : t('exportDocxBtn')}
                </button>
              </div>

              <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between space-y-4">
                <div>
                  <div className="p-2 bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-ink)] inline-block shadow-[2px_2px_0px_#000000] mb-2">
                    <Printer className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-heading font-black">Print-Ready PDF</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting !== null}
                  className="w-full py-2 px-3 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_#000000] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting === 'pdf' ? t('exporting') : t('exportPdfBtn')}
                </button>
              </div>
            </div>

            {exportedResult && (
              <div className="p-4 border-3 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[4px_4px_0px_#000000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="p-1.5 bg-black text-white border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_#000000] shrink-0 mt-0.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-heading font-black">
                      {t('exportSuccess')} ({exportedResult.format})
                    </h4>
                    {exportedResult.path ? (
                      <p className="text-[11px] font-mono text-neutral-800 break-all mt-0.5 select-text">
                        {t('exportSavedTo')}{' '}
                        <span className="font-bold underline">{exportedResult.path}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-800 mt-0.5">
                        {language === 'ar' ? 'تم فتح نافذة الطباعة لاختيار الحفظ كـ PDF أو الطابعة.' : 'Print dialog opened to save as PDF or print.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {exportedResult.path && (
                    <button
                      type="button"
                      onClick={() => showInFolder(exportedResult.path)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{t('openFolderBtn')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExportedResult(null)}
                    aria-label="Close"
                    className="p-1 text-black hover:bg-black/10 border-2 border-transparent hover:border-[var(--border-ink)] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_#000000] text-xs text-[var(--text-secondary)]">
              <span className="font-heading font-black text-[var(--text-primary)] block mb-1">
                {t('statsChaptersCount')}: {chapters.length} {t('chapters')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
