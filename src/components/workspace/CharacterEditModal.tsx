import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Character } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { useModal } from '../../hooks/useModal';

interface CharacterEditModalProps {
  character: Partial<Character>;
  onChange: (character: Partial<Character>) => void;
  onSave: () => void;
  onClose: () => void;
}

const inputClass =
  'w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)]';

export const CharacterEditModal: React.FC<CharacterEditModalProps> = ({ character, onChange, onSave, onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onClose);

  const textFields: { key: keyof Character; label: string; placeholder: string }[] = [
    { key: 'motivation', label: t('charMotivationLabel'), placeholder: t('charMotivationPlaceholder') },
    { key: 'goal', label: t('charGoalLabel'), placeholder: t('charGoalPlaceholder') },
    { key: 'conflict', label: t('charConflictLabel'), placeholder: t('charConflictPlaceholder') },
    { key: 'epiphany', label: t('charEpiphanyLabel'), placeholder: t('charEpiphanyPlaceholder') },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-dialog-title"
        tabIndex={-1}
        className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--border-ink)] pb-2">
          <h3 id="character-dialog-title" className="text-sm font-heading font-black text-[var(--text-primary)]">
            {character.id ? t('edit') : t('addCharacterBtn')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] transition-all cursor-pointer"
            title={t('close')}
            aria-label={t('closeDialog')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div>
            <label htmlFor="char-name" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
              {t('charNameLabel')}
            </label>
            <input
              id="char-name"
              type="text"
              value={character.name || ''}
              onChange={(e) => onChange({ ...character, name: e.target.value })}
              placeholder={t('charNamePlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="char-summary" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
              {t('charSummaryLabel')}
            </label>
            <input
              id="char-summary"
              type="text"
              value={character.one_sentence_summary || ''}
              onChange={(e) => onChange({ ...character, one_sentence_summary: e.target.value })}
              placeholder={t('charSummaryPlaceholder')}
              className={inputClass}
            />
          </div>

          {textFields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={`char-${key}`} className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {label}
              </label>
              <textarea
                id={`char-${key}`}
                value={(character[key] as string) || ''}
                onChange={(e) => onChange({ ...character, [key]: e.target.value })}
                placeholder={placeholder}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-[var(--border-ink)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
