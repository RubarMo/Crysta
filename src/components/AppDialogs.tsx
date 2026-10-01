import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useModal } from '../hooks/useModal';
import { LocaleKeys } from '../locales';

const closeButtonClass =
  'p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center';

export const HelpDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onClose);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-text" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        tabIndex={-1}
        className="bg-[var(--bg-surface)] border-4 border-[var(--border-ink)] shadow-[12px_12px_0px_var(--shadow-ink)] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start border-b-3 border-[var(--border-ink)] pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
              <HelpCircle className="w-4 h-4 stroke-[2.5]" />
            </span>
            <h2 id="help-dialog-title" className="text-base sm:text-lg font-heading font-black text-[var(--text-primary)]">
              {t('helpModalTitle')}
            </h2>
          </div>
          <button onClick={onClose} className={closeButtonClass} title={t('close')} aria-label={t('closeDialog')}>
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-body leading-relaxed text-[var(--text-secondary)] text-start">
          <div className="p-3 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] font-bold">
            {t('helpModalDesc')}
          </div>

          <ol className="space-y-3 pt-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <li key={num} className="p-3.5 bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 font-mono text-[10px] font-black bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] flex items-center justify-center shrink-0">
                    {num}
                  </span>
                  <h3 className="font-heading font-black text-[var(--text-primary)] text-xs">
                    {t(`helpStep${num}Title` as LocaleKeys)}
                  </h3>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed ps-7">
                  {t(`helpStep${num}Desc` as LocaleKeys)}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 flex justify-end border-t-3 border-[var(--border-ink)] pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[var(--accent)] text-black font-heading font-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs transition-all cursor-pointer"
          >
            {t('helpModalCloseBtn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const ProjectPickerDialog: React.FC<{
  files: string[];
  onPick: (file: string) => void;
  onClose: () => void;
}> = ({ files, onPick, onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-dialog-title"
        tabIndex={-1}
        className="bg-[var(--bg-surface)] border-4 border-[var(--border-ink)] shadow-[12px_12px_0px_var(--shadow-ink)] w-full max-w-sm p-6 space-y-4 text-start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-[var(--border-subtle)] pb-2">
          <h3 id="picker-dialog-title" className="text-sm font-heading font-black text-[var(--text-primary)]">
            {t('selectProjectFile')}
          </h3>
          <p className="text-[10px] font-body text-[var(--text-muted)] mt-0.5">{t('selectProjectFileDesc')}</p>
        </div>

        <div className="max-h-60 overflow-y-auto divide-y-2 divide-[var(--border-subtle)] border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)]">
          {files.map((file) => (
            <button
              key={file}
              onClick={() => onPick(file)}
              className="w-full text-start px-3.5 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] hover:bg-[var(--pastel-yellow)] hover:text-black cursor-pointer truncate transition-colors"
              title={file}
            >
              {file}
            </button>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export interface UpdateState {
  version: string;
  body: string;
  downloading: boolean;
  progress: number;
  error: string | null;
}

export const UpdateDialog: React.FC<{
  update: UpdateState;
  onInstall: () => void;
  onDismiss: () => void;
}> = ({ update, onInstall, onDismiss }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Can't be dismissed while the update is downloading.
  useModal(dialogRef, () => {
    if (!update.downloading) onDismiss();
  });

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-dialog-title"
        tabIndex={-1}
        className="bg-[var(--bg-surface)] border-4 border-[var(--border-ink)] shadow-[12px_12px_0px_var(--shadow-ink)] max-w-sm w-full p-6 flex flex-col gap-4 text-[var(--text-primary)]"
      >
        <div className="border-b-2 border-[var(--border-subtle)] pb-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--pastel-mint)] text-black border border-[var(--border-ink)] font-heading font-black text-[10px] uppercase mb-1">
            {t('updateAvailable')}
          </div>
          <h3 id="update-dialog-title" className="text-sm font-heading font-black text-[var(--text-primary)] mt-1">
            {t('updateNewVersion', { version: update.version })}
          </h3>
        </div>

        {update.body && (
          <div className="bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] p-3 text-[10px] font-mono max-h-32 overflow-y-auto select-text whitespace-pre-wrap">
            {update.body}
          </div>
        )}

        {update.error && (
          <div role="alert" className="text-[10px] text-black bg-[var(--pastel-coral)] border-2 border-[var(--border-ink)] p-2 font-mono font-bold">
            {update.error}
          </div>
        )}

        {update.downloading ? (
          <div className="flex flex-col gap-2 mt-2" role="status">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[var(--text-secondary)] select-none">
              <span>{t('updateDownloading')}</span>
              <span>{update.progress}%</span>
            </div>
            <div
              className="w-full bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] h-3 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={update.progress}
            >
              <div className="bg-[var(--pastel-mint)] h-full transition-all duration-300 border-e-2 border-[var(--border-ink)]" style={{ width: `${update.progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2.5 justify-end mt-2 select-none items-center">
            <button
              onClick={onDismiss}
              className="px-3.5 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {t('updateLater')}
            </button>
            <button
              onClick={onInstall}
              className="px-4 py-1.5 bg-[var(--pastel-yellow)] text-black font-heading font-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs transition-all cursor-pointer"
            >
              {t('updateNow')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
