import React from 'react';

interface WordCounterProps {
  text: string;
  maxWords?: number;
}

export const WordCounter: React.FC<WordCounterProps> = ({ text, maxWords }) => {
  const cleanText = text.trim();
  const wordCount = cleanText === "" ? 0 : cleanText.split(/\s+/).length;
  const isOverLimit = maxWords ? wordCount > maxWords : false;

  return (
    <div className={`text-xs select-none transition-colors ${isOverLimit ? 'text-rose-500 font-bold animate-pulse' : 'text-zinc-400 dark:text-zinc-500'}`}>
      {wordCount} {maxWords ? `/ الحد الأقصى ${maxWords}` : ''} {wordCount === 1 ? 'كلمة' : 'كلمة'}
    </div>
  );
};
