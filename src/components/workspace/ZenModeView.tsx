import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../LanguageContext';
import { WordCounter } from '../WordCounter';
import { 
  Minimize2
} from 'lucide-react';

interface ZenModeViewProps {
  title: string;
  content: string;
  onContentChange: (newContent: string) => void;
  onClose: () => void;
}

type ZenTheme = 'crysta' | 'obsidian' | 'sepia' | 'light' | 'navy';
type ZenWidth = 'narrow' | 'medium' | 'wide' | 'full';

export const ZenModeView: React.FC<ZenModeViewProps> = ({
  title,
  content,
  onContentChange,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const [theme, setTheme] = useState<ZenTheme>('crysta');
  const [width, setWidth] = useState<ZenWidth>('medium');
  const [fontSize, setFontSize] = useState<number>(18);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Keyboard shortcut: Esc to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Theme style configurations
  const themeStyles: Record<ZenTheme, { bg: string; text: string; subtext: string; toolbarBg: string; border: string }> = {
    crysta: {
      bg: '#1E1E22',
      text: '#FFFFFF',
      subtext: '#A1A1AA',
      toolbarBg: '#26262B',
      border: '#3D3D44',
    },
    obsidian: {
      bg: '#121214',
      text: '#E4E4E7',
      subtext: '#71717A',
      toolbarBg: '#18181B',
      border: '#27272A',
    },
    sepia: {
      bg: '#FBF0D9',
      text: '#433422',
      subtext: '#8F7D6B',
      toolbarBg: '#F4E4C1',
      border: '#D8C39D',
    },
    light: {
      bg: '#FFFDF5',
      text: '#000000',
      subtext: '#4B5563',
      toolbarBg: '#F4F0E8',
      border: '#000000',
    },
    navy: {
      bg: '#0F172A',
      text: '#E2E8F0',
      subtext: '#64748B',
      toolbarBg: '#1E293B',
      border: '#334155',
    },
  };

  // Width configurations
  const widthClasses: Record<ZenWidth, string> = {
    narrow: 'max-w-2xl',
    medium: 'max-w-3xl',
    wide: 'max-w-5xl',
    full: 'max-w-full px-8',
  };

  // Render visual line graphic for each width setting
  const renderWidthLines = (w: ZenWidth) => {
    switch (w) {
      case 'narrow':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="stroke-current pointer-events-none">
            <line x1="6" y1="3" x2="14" y2="3" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="7" x2="14" y2="7" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="11" x2="14" y2="11" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'medium':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="stroke-current pointer-events-none">
            <line x1="4" y1="3" x2="16" y2="3" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="7" x2="16" y2="7" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="11" x2="16" y2="11" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'wide':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="stroke-current pointer-events-none">
            <line x1="2" y1="3" x2="18" y2="3" strokeWidth="2" strokeLinecap="round" />
            <line x1="2" y1="7" x2="18" y2="7" strokeWidth="2" strokeLinecap="round" />
            <line x1="2" y1="11" x2="18" y2="11" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'full':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="stroke-current pointer-events-none">
            <line x1="1" y1="2" x2="1" y2="12" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="19" y1="2" x2="19" y2="12" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="3" y1="3" x2="17" y2="3" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="7" x2="17" y2="7" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="11" x2="17" y2="11" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
    }
  };

  const currentStyle = themeStyles[theme];

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col transition-colors duration-200 select-text overflow-hidden"
      style={{ backgroundColor: currentStyle.bg, color: currentStyle.text }}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Floating Control Bar */}
      <div 
        className="h-14 border-b flex items-center justify-between px-6 shrink-0 transition-opacity duration-200"
        style={{ 
          backgroundColor: currentStyle.toolbarBg, 
          borderColor: currentStyle.border, 
          color: currentStyle.text 
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-xs font-heading font-black truncate max-w-xs sm:max-w-md">
            {title}
          </h2>
          <WordCounter text={content} />
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <div className="flex items-center border p-0.5 gap-0.5" style={{ borderColor: currentStyle.border }}>
            {(['crysta', 'obsidian', 'sepia', 'light', 'navy'] as ZenTheme[]).map((tName) => (
              <button
                key={tName}
                type="button"
                onClick={() => setTheme(tName)}
                className={`px-2 py-1 text-[10px] font-heading font-bold transition-all cursor-pointer ${
                  theme === tName ? 'font-black underline' : 'opacity-70 hover:opacity-100'
                }`}
                title={tName}
              >
                {tName === 'crysta' ? t('zenThemeCrysta') :
                 tName === 'obsidian' ? t('zenThemeObsidian') :
                 tName === 'sepia' ? t('zenThemeSepia') :
                 tName === 'light' ? t('zenThemeLight') : t('zenThemeNavy')}
              </button>
            ))}
          </div>

          {/* Width Selector */}
          <div className="hidden sm:flex items-center border p-0.5 gap-0.5" style={{ borderColor: currentStyle.border }}>
            {(['narrow', 'medium', 'wide', 'full'] as ZenWidth[]).map((wName) => {
              const isSelected = width === wName;
              const titleMap: Record<ZenWidth, string> = {
                narrow: t('zenWidthNarrow') || 'Narrow',
                medium: t('zenWidthMedium') || 'Medium',
                wide: t('zenWidthWide') || 'Wide',
                full: t('zenWidthFull') || 'Full Width',
              };

              return (
                <button
                  key={wName}
                  type="button"
                  onClick={() => setWidth(wName)}
                  className={`px-1.5 py-1 flex items-center justify-center transition-all cursor-pointer ${
                    isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${currentStyle.text}20` : 'transparent',
                    border: isSelected ? `1px solid ${currentStyle.border}` : '1px solid transparent',
                  }}
                  title={titleMap[wName]}
                  aria-label={titleMap[wName]}
                >
                  {renderWidthLines(wName)}
                </button>
              );
            })}
          </div>

          {/* Font Size Adjusters */}
          <div className="flex items-center border p-0.5 gap-1" style={{ borderColor: currentStyle.border }}>
            <button
              type="button"
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="px-1.5 py-0.5 text-xs font-mono font-bold hover:opacity-100 opacity-70 cursor-pointer"
              title="Decrease Font"
            >
              A-
            </button>
            <span className="text-[10px] font-mono opacity-80">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize(Math.min(32, fontSize + 2))}
              className="px-1.5 py-0.5 text-xs font-mono font-bold hover:opacity-100 opacity-70 cursor-pointer"
              title="Increase Font"
            >
              A+
            </button>
          </div>

          {/* Exit Zen Mode Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-heading font-black border transition-all cursor-pointer ms-2 hover:opacity-80 active:translate-y-0.5"
            style={{ 
              borderColor: currentStyle.text, 
              backgroundColor: currentStyle.text, 
              color: currentStyle.bg 
            }}
            title={t('exitZenMode')}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('exitZenMode')}</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Editor Canvas */}
      <div className="flex-1 overflow-y-auto flex justify-center p-6 md:p-12">
        <div className={`w-full ${widthClasses[width]} flex flex-col`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={t('chapterContentPlaceholder')}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.8,
              backgroundColor: 'transparent',
              color: currentStyle.text,
            }}
            className="w-full flex-1 resize-none border-none outline-none font-serif tracking-normal focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
