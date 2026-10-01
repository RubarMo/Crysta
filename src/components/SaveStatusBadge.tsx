import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { SaveIndicator } from '../hooks/useWorkspaceData';

/** "Saving…" / "Saved" / "Save failed" badge for the autosave state. */
export const SaveStatusBadge: React.FC<{ state: SaveIndicator }> = ({ state }) => {
  const { t } = useLanguage();

  if (state === 'saving') {
    return (
      <span role="status" className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] animate-pulse whitespace-nowrap">
        {t('statusSaving')}
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span role="status" className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[var(--pastel-mint)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] flex items-center gap-1 whitespace-nowrap">
        <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
        {t('statusSaved')}
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span role="alert" className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[var(--pastel-coral)] text-black border-2 border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] flex items-center gap-1 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
        {t('statusSaveFailed')}
      </span>
    );
  }
  return null;
};
