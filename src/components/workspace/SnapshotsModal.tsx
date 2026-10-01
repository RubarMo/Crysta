import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SnapshotInfo, listSnapshots, takeSnapshot, restoreSnapshot, deleteSnapshot, openBackupsDirectory } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { useModal } from '../../hooks/useModal';
import { flushAllAutosaves } from '../../utils/autosave';
import { isUnsupportedOnMobile } from '../../utils/platform';
import { errorMessage, useToast } from '../Toast';
import {
  X,
  History,
  Camera,
  RotateCcw,
  Trash2,
  FolderOpen,
  Tag
} from 'lucide-react';

interface SnapshotsModalProps {
  onClose: () => void;
  /** Called after a restore so the app reloads the project from disk. */
  onRestored: () => void;
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({
  onClose,
  onRestored,
}) => {
  const { t, language } = useLanguage();
  const { notify } = useToast();
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onClose);

  const reportError = (err: unknown) => notify(`${t('error')}: ${errorMessage(err)}`);

  const loadList = async () => {
    try {
      setSnapshots(await listSnapshots());
    } catch (err) {
      reportError(err);
    }
  };

  useEffect(() => {
    loadList();
    // Load once when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTakeSnapshot = async () => {
    setIsLoading(true);
    try {
      // Include edits that are still waiting to be autosaved.
      await flushAllAutosaves();
      await takeSnapshot(customLabel || undefined, true);
      setCustomLabel('');
      notify(t('snapshotCreatedSuccess'), 'success');
      await loadList();
    } catch (err) {
      reportError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (snap: SnapshotInfo) => {
    if (!window.confirm(t('restoreConfirmDesc'))) return;

    setIsLoading(true);
    try {
      // Pending edits are written first so they are part of the automatic
      // "before restore" snapshot and can't overwrite the restored data later.
      await flushAllAutosaves();
      await restoreSnapshot(snap.file_path);
      notify(t('backupRestoredSuccess'), 'success');
      onClose();
      onRestored();
    } catch (err) {
      reportError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (snap: SnapshotInfo) => {
    if (!window.confirm(t('deleteSnapshotConfirm'))) return;
    try {
      await deleteSnapshot(snap.file_path);
      await loadList();
    } catch (err) {
      reportError(err);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openBackupsDirectory();
    } catch (err) {
      if (isUnsupportedOnMobile(err)) {
        notify(t('featureUnsupportedMobile'), 'info');
      } else {
        reportError(err);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (ts: string) => {
    const num = Number(ts);
    if (!num) return ts;
    return new Date(num * 1000).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshots-dialog-title"
        tabIndex={-1}
        className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-2xl p-5 space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--border-ink)] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[var(--pastel-lavender)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
              <History className="w-4 h-4" />
            </span>
            <h3 id="snapshots-dialog-title" className="text-sm font-heading font-black text-[var(--text-primary)]">
              {t('backupsTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            title={t('close')}
            aria-label={t('closeDialog')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form
          className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] flex flex-wrap items-center gap-2 shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            handleTakeSnapshot();
          }}
        >
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder={t('snapshotLabelHint')}
            aria-label={t('snapshotLabelHint')}
            maxLength={60}
            className="flex-1 min-w-[200px] text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('takeSnapshotBtn')}</span>
          </button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-2 pe-1 select-text">
          {snapshots.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
              {t('noBackupsFound')}
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.file_path}
                className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-[9px] font-mono font-black px-1.5 border border-[var(--border-ink)] text-black ${
                        snap.is_manual ? 'bg-[var(--pastel-yellow)]' : 'bg-[var(--pastel-sky)]'
                      }`}
                    >
                      {snap.is_manual ? t('manualSnapshotTag') : t('autoSnapshotTag')}
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                      {formatTimestamp(snap.timestamp)}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      ({formatFileSize(snap.file_size_bytes)})
                    </span>
                  </div>

                  {snap.custom_label && (
                    <div className="text-xs font-heading font-bold text-[var(--text-primary)] flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[var(--text-muted)]" aria-hidden="true" />
                      <span>{snap.custom_label}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleRestore(snap)}
                    className="px-2.5 py-1 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                    <span>{t('restoreBackupBtn')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDelete(snap)}
                    className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                    title={t('delete')}
                    aria-label={t('delete')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t-2 border-[var(--border-ink)] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleOpenFolder}
            className="px-3 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{t('openBackupsFolder')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-coral)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
