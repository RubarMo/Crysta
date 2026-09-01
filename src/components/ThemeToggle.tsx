import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export const ThemeToggle: React.FC = () => {
  const { language } = useLanguage();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div 
      className="h-8 inline-flex items-center p-0.5 bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] gap-0.5 select-none font-heading shrink-0 box-border"
      role="group"
      aria-label="Theme selector"
    >
      {/* Light Mode Option */}
      <button
        onClick={() => setIsDark(false)}
        className={`h-full inline-flex items-center gap-1 px-2 text-xs cursor-pointer transition-all box-border active:translate-y-[1px] ${
          !isDark
            ? 'bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] font-black'
            : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-2 border-transparent font-bold'
        }`}
        title={language === 'ar' ? 'الوضع المضيء' : 'Light Mode'}
      >
        <Sun className="w-3.5 h-3.5 stroke-[2.5]" />
        <span className="text-[11px] hidden sm:inline leading-none">{language === 'ar' ? 'مضيء' : 'Light'}</span>
      </button>

      {/* Dark Mode Option */}
      <button
        onClick={() => setIsDark(true)}
        className={`h-full inline-flex items-center gap-1 px-2 text-xs cursor-pointer transition-all box-border active:translate-y-[1px] ${
          isDark
            ? 'bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] font-black'
            : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-2 border-transparent font-bold'
        }`}
        title={language === 'ar' ? 'الوضع المظلم' : 'Dark Mode'}
      >
        <Moon className="w-3.5 h-3.5 stroke-[2.5]" />
        <span className="text-[11px] hidden sm:inline leading-none">{language === 'ar' ? 'مظلم' : 'Dark'}</span>
      </button>
    </div>
  );
};
