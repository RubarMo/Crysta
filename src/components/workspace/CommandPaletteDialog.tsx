import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../LanguageContext';
import { useModal } from '../../hooks/useModal';
import {
  X,
  Search,
  LayoutDashboard,
  FileText,
  BookOpen,
  History,
  Camera,
  Maximize2,
  StickyNote,
  ArrowRight,
  FolderOpen,
  Plus,
} from 'lucide-react';

interface CommandPaletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whether a project is open; step navigation only makes sense then. */
  hasProject: boolean;
  onSelectStep: (stepNumber: number) => void;
  onOpenSnapshots: () => void;
  onTakeSnapshot: () => void;
  onToggleZenMode: () => void;
  onToggleReferenceDrawer: () => void;
  onOpenProject: () => void;
  onCreateProject: () => void;
}

interface Command {
  id: string;
  title: string;
  icon: typeof FileText;
  run: () => void;
}

export const CommandPaletteDialog: React.FC<CommandPaletteDialogProps> = (props) => {
  if (!props.isOpen) return null;
  return <CommandPalette {...props} />;
};

const CommandPalette: React.FC<CommandPaletteDialogProps> = ({
  onClose,
  hasProject,
  onSelectStep,
  onOpenSnapshots,
  onTakeSnapshot,
  onToggleZenMode,
  onToggleReferenceDrawer,
  onOpenProject,
  onCreateProject,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onClose);

  const stepCommand = (id: string, title: string, step: number, icon: typeof FileText): Command => ({
    id,
    title,
    icon,
    run: () => onSelectStep(step),
  });

  const commands: Command[] = hasProject
    ? [
        stepCommand('dash', t('dashboard'), 0, LayoutDashboard),
        ...Array.from({ length: 10 }, (_, i) =>
          stepCommand(`s${i + 1}`, `${i + 1}. ${t(`step${i + 1}Title` as 'step1Title')}`, i + 1, FileText)
        ),
        stepCommand('write', t('step11Title'), 11, BookOpen),
        stepCommand('studio', t('step12Title'), 12, BookOpen),
        { id: 'zen', title: t('toggleZenModeCmd'), icon: Maximize2, run: onToggleZenMode },
        { id: 'drawer', title: t('toggleReferenceDrawerCmd'), icon: StickyNote, run: onToggleReferenceDrawer },
        { id: 'take-snapshot', title: t('takeSnapshotCmd'), icon: Camera, run: onTakeSnapshot },
        { id: 'snapshots', title: t('backupsTitle'), icon: History, run: onOpenSnapshots },
      ]
    : [
        { id: 'open', title: t('openProjectBtn'), icon: FolderOpen, run: onOpenProject },
        { id: 'create', title: t('createProjectBtn'), icon: Plus, run: onCreateProject },
      ];

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = commands.filter((cmd) => cmd.title.toLowerCase().includes(normalizedQuery));
  const activeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const executeCommand = (cmd: Command) => {
    onClose();
    cmd.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((activeIndex + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((activeIndex - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      executeCommand(filtered[activeIndex]);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('commandPaletteTitle')}
        className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('commandPaletteSearchPlaceholder')}
            aria-label={t('commandPaletteSearchPlaceholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined}
            className="nb-no-focus-ring w-full text-xs font-heading font-black bg-transparent text-[var(--text-primary)] placeholder:font-sans placeholder:font-normal"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[var(--bg-surface)] border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)]">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
            title={t('close')}
            aria-label={t('closeDialog')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div id="command-palette-list" role="listbox" className="max-h-72 overflow-y-auto p-2 space-y-1 select-none">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)] font-mono">
              {t('noMatchingCommands')}
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = activeIndex === idx;
              return (
                <div
                  key={cmd.id}
                  id={`cmd-${cmd.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 border-2 border-[var(--border-ink)] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[2px_2px_0px_var(--shadow-ink)] translate-x-0.5'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1 bg-[var(--bg-surface-raised)] text-[var(--text-primary)] border border-[var(--border-ink)] shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-heading truncate">{cmd.title}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
