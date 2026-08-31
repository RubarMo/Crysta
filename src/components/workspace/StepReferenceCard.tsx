import React, { useState } from 'react';
import { useLanguage } from '../../LanguageContext';
import { ChevronDown, ChevronUp, BookMarked, Sparkles } from 'lucide-react';

interface StepReferenceCardProps {
  stepNumber: number;
  stepTitle: string;
  contentText: string;
  characterNames?: string[];
}

export const StepReferenceCard: React.FC<StepReferenceCardProps> = ({
  stepNumber,
  stepTitle,
  contentText,
  characterNames,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!contentText && (!characterNames || characterNames.length === 0)) {
    return null;
  }

  return (
    <div className="mb-4 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden transition-all">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-[var(--bg-surface-raised)] hover:bg-[var(--pastel-yellow)] hover:text-black transition-colors cursor-pointer text-start select-none border-b-2 border-[var(--border-ink)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1 bg-[var(--pastel-lavender)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center shadow-[1px_1px_0px_var(--shadow-ink)]">
            <BookMarked className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-black uppercase text-[var(--text-muted)] tracking-wider block">
              {t('step')} {stepNumber}
            </span>
            <h4 className="text-xs font-heading font-black text-[var(--text-primary)] truncate">
              {stepTitle}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] hidden sm:inline">
            {isExpanded ? t('collapseReference') : t('expandReference')}
          </span>
          <span className="p-1 border border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)]">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-3 bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] leading-relaxed space-y-2 border-t border-[var(--border-subtle)] max-h-60 overflow-y-auto">
          {contentText ? (
            <p className="whitespace-pre-wrap font-sans text-xs">{contentText}</p>
          ) : (
            <p className="text-[var(--text-muted)] italic text-xs">{t('noContentInPrevStep')}</p>
          )}

          {characterNames && characterNames.length > 0 && (
            <div className="pt-2 border-t border-dashed border-[var(--border-subtle)] flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {t('tabCharacters')}:
              </span>
              {characterNames.map((name, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[10px] font-heading font-bold bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)]"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
