import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

function initialIsDark(): boolean {
  // public/theme-init.js already applied the class before React loaded.
  if (document.documentElement.classList.contains('dark')) return true;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
  } catch {
    // Fall through to the system preference.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const ThemeToggle: React.FC = () => {
  const { t } = useLanguage();
  const [isDark, setIsDark] = useState(initialIsDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // Theme just isn't remembered.
    }
  }, [isDark]);

  const optionClass = (active: boolean) =>
    `h-full inline-flex items-center gap-1 px-2 text-xs cursor-pointer transition-all box-border active:translate-y-[1px] ${
      active
        ? 'bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] font-black'
        : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-2 border-transparent font-bold'
    }`;

  return (
    <div
      className="h-8 inline-flex items-center p-0.5 bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] gap-0.5 select-none font-heading shrink-0 box-border"
      role="group"
      aria-label={t('themeSelector')}
    >
      <button onClick={() => setIsDark(false)} className={optionClass(!isDark)} title={t('themeLightTitle')} aria-pressed={!isDark}>
        <Sun className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
        <span className="text-[11px] hidden sm:inline leading-none">{t('themeLight')}</span>
      </button>
      <button onClick={() => setIsDark(true)} className={optionClass(isDark)} title={t('themeDarkTitle')} aria-pressed={isDark}>
        <Moon className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
        <span className="text-[11px] hidden sm:inline leading-none">{t('themeDark')}</span>
      </button>
    </div>
  );
};
