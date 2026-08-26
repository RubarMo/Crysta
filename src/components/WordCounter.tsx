import React from 'react';
import { useLanguage } from '../LanguageContext';

interface WordCounterProps {
  text: string;
  maxWords?: number;
}

export const WordCounter: React.FC<WordCounterProps> = ({ text, maxWords }) => {
  const { language } = useLanguage();
  const cleanText = text.trim();
  const wordCount = cleanText === "" ? 0 : cleanText.split(/\s+/).length;
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
        {language === 'ar' 
          ? (wordCount === 1 ? 'كلمة' : 'كلمات') 
          : (wordCount === 1 ? 'word' : 'words')}
      </span>
    </div>
  );
};
