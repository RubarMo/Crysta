import React, { useState, useEffect } from 'react';
import { SnapshotInfo, listSnapshots, takeSnapshot, restoreSnapshot, deleteSnapshot, openBackupsDirectory } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { 
  X, 
  History, 
  Camera, 
  RotateCcw, 
  Trash2, 
  FolderOpen, 
  Check, 
  Tag
} from 'lucide-react';

interface SnapshotsModalProps {
  onClose: () => void;
  onRestored: () => void;
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({
  onClose,
  onRestored,
}) => {
  const { t } = useLanguage();
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadList = async () => {
    try {
      const list = await listSnapshots();
      setSnapshots(list);
    } catch (err) {
      console.error('Failed to list snapshots:', err);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleTakeSnapshot = async () => {
    setIsLoading(true);
    try {
      await takeSnapshot(customLabel || undefined, true);
      setCustomLabel('');
      setSuccessMessage(t('snapshotCreatedSuccess'));
      await loadList();
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      alert(`${t('error')}: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (snap: SnapshotInfo) => {
    if (!window.confirm(t('restoreConfirmDesc'))) return;

    setIsLoading(true);
    try {
      await restoreSnapshot(snap.file_path);
      setSuccessMessage(t('backupRestoredSuccess'));
      onRestored();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      alert(`${t('error')}: ${err}`);
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
      alert(`${t('error')}: ${err}`);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openBackupsDirectory();
    } catch (err) {
      console.error('Failed to open backups folder:', err);
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
    const date = new Date(num * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[var(--border-ink)] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[var(--pastel-lavender)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
              <History className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">
              {t('backupsTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[2px_2px_0px_var(--shadow-ink)] transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {successMessage && (
          <div className="p-2.5 bg-[var(--pastel-mint)] text-black border-2 border-[var(--border-ink)] font-heading font-bold text-xs flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Create Manual Snapshot Box */}
        <div className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] flex flex-wrap items-center gap-2 shrink-0">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder={t('snapshotLabelHint')}
            className="flex-1 min-w-[200px] text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
          />
          <button
            type="button"
            disabled={isLoading}
            onClick={handleTakeSnapshot}
            className="px-3 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('takeSnapshotBtn')}</span>
          </button>
        </div>

        {/* Snapshots List */}
        <div className="flex-1 overflow-y-auto space-y-2 pe-1">
          {snapshots.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
              {t('noBackupsFound')}
            </div>
          ) : (
            snapshots.map((snap, idx) => (
              <div
                key={snap.file_path || idx}
                className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[9px] font-mono font-black px-1.5 py-0.2 border border-[var(--border-ink)] ${
                        snap.is_manual
                          ? 'bg-[var(--pastel-yellow)] text-black'
                          : 'bg-[var(--pastel-sky)] text-black'
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
                      <Tag className="w-3 h-3 text-[var(--text-muted)]" />
                      <span>{snap.custom_label}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(snap)}
                    className="px-2.5 py-1 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-mint)] text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                    title={t('restoreBackupBtn')}
                  >
                    <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                    <span>{t('restoreBackupBtn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(snap)}
                    className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] transition-all cursor-pointer"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-[var(--border-ink)] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleOpenFolder}
            className="px-3 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-sky)] hover:text-black transition-all cursor-pointer flex items-center gap-1.5"
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
    </div>
  );
};
