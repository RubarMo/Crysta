import React from 'react';
import { useLanguage } from '../LanguageContext';
import { countWords } from '../utils/text';

interface WordCounterProps {
  text: string;
  maxWords?: number;
}

export const WordCounter: React.FC<WordCounterProps> = ({ text, maxWords }) => {
  const { t } = useLanguage();
  const wordCount = countWords(text);
  const isOverLimit = maxWords ? wordCount > maxWords : false;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] select-none transition-all ${
        isOverLimit
          ? 'bg-[var(--pastel-coral)] text-black font-black'
          : 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-bold'
      }`}
    >
      <span>{wordCount}</span>
      {maxWords && (
        <span className="opacity-80">/ {maxWords}</span>
      )}
      <span className="font-heading text-[10px] uppercase tracking-wider">
        {wordCount === 1 ? t('word') : t('words')}
      </span>
    </div>
  );
};
