import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../LanguageContext';
import { 
  X,
  Search, 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  History, 
  Maximize2, 
  StickyNote, 
  ArrowRight
} from 'lucide-react';

interface CommandPaletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStep: (stepNumber: number) => void;
  onOpenSnapshots: () => void;
  onToggleZenMode?: () => void;
  onToggleReferenceDrawer?: () => void;
}

export const CommandPaletteDialog: React.FC<CommandPaletteDialogProps> = ({
  isOpen,
  onClose,
  onSelectStep,
  onOpenSnapshots,
  onToggleZenMode,
  onToggleReferenceDrawer,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Command items catalog
  const commands = [
    { id: 'dash', title: t('dashboard'), step: 0, icon: LayoutDashboard, category: 'navigation' },
    { id: 's1', title: t('step1Title'), step: 1, icon: FileText, category: 'step' },
    { id: 's2', title: t('step2Title'), step: 2, icon: FileText, category: 'step' },
    { id: 's3', title: t('step3Title'), step: 3, icon: FileText, category: 'step' },
    { id: 's4', title: t('step4Title'), step: 4, icon: FileText, category: 'step' },
    { id: 's5', title: t('step5Title'), step: 5, icon: FileText, category: 'step' },
    { id: 's6', title: t('step6Title'), step: 6, icon: FileText, category: 'step' },
    { id: 's7', title: t('step7Title'), step: 7, icon: FileText, category: 'step' },
    { id: 's8', title: t('step8Title'), step: 8, icon: FileText, category: 'step' },
    { id: 's9', title: t('step9Title'), step: 9, icon: FileText, category: 'step' },
    { id: 's10', title: t('step10Title'), step: 10, icon: FileText, category: 'step' },
    { id: 'write', title: t('step11Title'), step: 11, icon: BookOpen, category: 'writing' },
    { id: 'studio', title: t('step12Title'), step: 12, icon: BookOpen, category: 'publishing' },
    { id: 'snapshots', title: t('backupsTitle'), action: onOpenSnapshots, icon: History, category: 'action' },
    ...(onToggleZenMode ? [{ id: 'zen', title: t('toggleZenModeCmd'), action: onToggleZenMode, icon: Maximize2, category: 'action' }] : []),
    ...(onToggleReferenceDrawer ? [{ id: 'drawer', title: t('toggleReferenceDrawerCmd'), action: onToggleReferenceDrawer, icon: StickyNote, category: 'action' }] : []),
  ];

  // Filter commands by search query
  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase())
  );

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global escape key handler when dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      executeCommand(filtered[selectedIndex]);
    }
  };

  const executeCommand = (cmd: typeof commands[0]) => {
    onClose();
    if (cmd.step !== undefined) {
      onSelectStep(cmd.step);
    } else if (cmd.action) {
      cmd.action();
    }
  };

  if (!isOpen) return null;

  const content = (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="p-3 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('commandPaletteSearchPlaceholder')}
            className="w-full text-xs font-heading font-black bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:font-sans placeholder:font-normal"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[var(--bg-surface)] border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)]">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
            title={t('close')}
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Commands List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1 select-none">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)] font-mono">
              No matching commands
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  className={`flex items-center justify-between p-2.5 border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[2px_2px_0px_var(--shadow-ink)] translate-x-0.5'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1 bg-[var(--bg-surface-raised)] border border-[var(--border-ink)] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-heading truncate">{cmd.title}</span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
