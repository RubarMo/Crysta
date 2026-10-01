import React, { useState, useEffect } from 'react';
import { Novel, StepProgress } from '../lib';
import { useLanguage } from '../LanguageContext';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { isTauri } from '../utils/platform';
import { 
  X, 
  Check, 
  Sparkles, 
  FolderKanban, 
  Languages, 
  LayoutDashboard, 
  PenTool, 
  BookOpen, 
  History,
  Menu,
  PanelLeftClose
} from 'lucide-react';

interface SidebarProps {
  novel: Novel | null;
  activeProjectPath: string | null;
  onCloseProject: () => void;
  activeStep: number;
  onSelectStep: (step: number) => void;
  stepsProgress: StepProgress[];
  isSidebarOpen?: boolean;
  onCloseSidebar?: () => void;
  onOpenSnapshots?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  novel,
  activeProjectPath,
  onCloseProject,
  activeStep,
  onSelectStep,
  stepsProgress,
  isSidebarOpen = false,
  onCloseSidebar,
  onOpenSnapshots,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [appVersion, setAppVersion] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('crysta_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('crysta_sidebar_collapsed', String(next));
      } catch {
        // Preference just isn't remembered.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isTauri()) return;
    getVersion().then(setAppVersion).catch((err) => {
      console.error("Failed to load app version", err);
    });
  }, []);

  const openGithub = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isTauri()) return;
    // Open in the system browser instead of inside the app window.
    e.preventDefault();
    openUrl(e.currentTarget.href).catch((err) => console.error('Failed to open link:', err));
  };

  // Calculate progress (completed steps out of 10)
  const completedSteps = novel 
    ? stepsProgress.filter(p => p.is_completed).length 
    : 0;

  const steps = [
    { num: 1, title: t('step1Title') },
    { num: 2, title: t('step2Title') },
    { num: 3, title: t('step3Title') },
    { num: 4, title: t('step4Title') },
    { num: 5, title: t('step5Title') },
    { num: 6, title: t('step6Title') },
    { num: 7, title: t('step7Title') },
    { num: 8, title: t('step8Title') },
    { num: 9, title: t('step9Title') },
    { num: 10, title: t('step10Title') },
  ];

  const projectFileName = activeProjectPath ? activeProjectPath.split(/[/\\]/).pop() : "";
  const isRtl = language === 'ar';
  const translateClass = isSidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full');
  const widthClass = isCollapsed ? 'w-14 sm:w-16' : 'w-72 md:w-80';

  const navItemClass = (isActive: boolean) => {
    const shape = isCollapsed
      ? 'w-9 h-9 flex items-center justify-center shrink-0'
      : 'w-full flex items-center gap-2.5 px-2.5 py-1.5 text-start';
    const state = isActive
      ? 'bg-[var(--pastel-yellow)] text-black font-black border-[var(--border-ink)] shadow-[2.5px_2.5px_0px_var(--shadow-ink)]'
      : 'border-transparent text-[var(--text-primary)] font-bold hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-subtle)]';
    return `${shape} text-xs font-heading border-2 transition-colors cursor-pointer select-none ${state}`;
  };

  return (
    <aside className={`${widthClass} border-e-3 border-[var(--border-ink)] bg-[var(--bg-surface)] flex flex-col h-full select-none shrink-0 transition-all duration-200 ease-out fixed inset-y-0 start-0 z-40 pt-[env(safe-area-inset-top,0px)] md:pt-0 pb-[env(safe-area-inset-bottom,0px)] md:pb-0 md:relative md:translate-x-0 ${translateClass}`}>
      {/* Sidebar Header */}
      <div className="h-16 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center px-2.5 sm:px-3 shrink-0">
        {isCollapsed ? (
          /* Collapsed Header: Expand Button */
          <div className="w-full flex items-center justify-center">
            <button
              onClick={handleToggleCollapse}
              className="h-8 w-8 flex items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
              title={t('expandSidebar')}
              aria-label={t('expandSidebar')}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Expanded Header */
          novel ? (
            <div className="flex items-center justify-between gap-2 w-full min-w-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-xs font-heading font-black text-[var(--text-primary)] truncate" title={novel.title}>
                  {novel.title}
                </h2>
                <p 
                  className="text-2xs font-mono text-[var(--text-muted)] truncate" 
                  title={activeProjectPath || ""}
                  dir="ltr"
                >
                  {projectFileName}
                </p>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {onOpenSnapshots && (
                  <button
                    onClick={onOpenSnapshots}
                    className="h-7 w-7 flex items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    title={t('backupsTitle')}
                    aria-label={t('backupsTitle')}
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={onCloseProject}
                  className="h-7 px-2 flex items-center justify-center text-2xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-coral)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
                  title={t('closeProjectTitle')}
                >
                  {t('close')}
                </button>

                {/* Separator Line */}
                <div className="hidden md:block h-4 w-[1.5px] bg-[var(--border-ink)] mx-0.5 shrink-0 opacity-40" />

                {/* Collapse Sidebar Button on Desktop */}
                <button
                  onClick={handleToggleCollapse}
                  className="hidden md:flex h-7 w-7 items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
                  title={t('collapseSidebar')}
                  aria-label={t('collapseSidebar')}
                >
                  <PanelLeftClose className={`w-3.5 h-3.5 ${isRtl ? 'scale-x-[-1]' : ''}`} />
                </button>

                {/* Mobile Close Button */}
                {onCloseSidebar && (
                  <button
                    onClick={onCloseSidebar}
                    className="md:hidden h-7 w-7 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black border-2 border-[var(--border-ink)] shadow-[1.5px_1.5px_0px_var(--shadow-ink)] transition-all shrink-0 cursor-pointer"
                    title={t('closeSidebar')}
                    aria-label={t('closeSidebar')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-heading font-black text-[var(--text-primary)] tracking-wide">{t('platformName')}</span>
              </div>
              {onCloseSidebar && (
                <button
                  onClick={onCloseSidebar}
                  className="md:hidden p-1 text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] transition-all shrink-0 flex items-center justify-center cursor-pointer"
                  title={t('closeSidebar')}
                  aria-label={t('closeSidebar')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        )}
      </div>

      {novel ? (
        <>
          {/* Progress Section */}
          {isCollapsed ? (
            <div
              className="py-2 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex flex-col items-center justify-center gap-2 select-none"
            >
              <span
                className="font-mono text-3xs font-black bg-[var(--pastel-yellow)] text-black px-1 py-0.5 border border-[var(--border-ink)]"
                title={`${t('completedSteps')}: ${completedSteps}/10`}
              >
                {completedSteps}/10
              </span>
              {onOpenSnapshots && (
                <button
                  onClick={onOpenSnapshots}
                  className="h-7 w-7 flex items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  title={t('backupsTitle')}
                  aria-label={t('backupsTitle')}
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] space-y-2">
              <div className="flex justify-between items-center text-2xs font-heading font-black">
                <span className="text-[var(--text-secondary)] uppercase tracking-wider">{t('completedSteps')}</span>
                <span className="font-mono bg-[var(--pastel-yellow)] text-black px-1.5 py-0.5 border border-[var(--border-ink)] font-bold text-2xs">
                  {completedSteps} / 10
                </span>
              </div>
              <div className="w-full bg-[var(--bg-surface)] h-2.5 border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden">
                <div 
                  className="bg-[var(--pastel-mint)] h-full transition-all duration-300 ease-out border-e-2 border-[var(--border-ink)]"
                  style={{ width: `${(completedSteps / 10) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Navigation: inactive items are flat rows; the current item is
              the only one with a fill, border and shadow. */}
          <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'py-2.5 px-1 space-y-1.5 flex flex-col items-center' : 'p-2.5 space-y-1'}`}>
            <button
              onClick={() => onSelectStep(0)}
              className={navItemClass(activeStep === 0)}
              title={t('dashboard')}
              aria-current={activeStep === 0 ? 'page' : undefined}
            >
              <span className={isCollapsed ? '' : 'p-1 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center'}>
                <LayoutDashboard className="w-3.5 h-3.5" />
              </span>
              {!isCollapsed && <span className="truncate">{t('dashboard')}</span>}
            </button>

            <div className={isCollapsed ? 'w-full py-1' : 'py-1'}>
              <div className="border-t-2 border-dashed border-[var(--border-subtle)]" />
            </div>

            {steps.map((step) => {
              const isStepCompleted = stepsProgress.some(p => p.step_number === step.num && p.is_completed);
              const isActive = activeStep === step.num;

              return (
                <button
                  key={step.num}
                  onClick={() => onSelectStep(step.num)}
                  className={`${navItemClass(isActive)} relative`}
                  title={`${step.num}. ${step.title}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`w-5 h-5 font-mono text-2xs font-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center ${
                    isActive
                      ? 'bg-black text-[var(--pastel-yellow)]'
                      : (isStepCompleted ? 'bg-[var(--pastel-mint)] text-black' : 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)]')
                  }`}>
                    {step.num}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate leading-tight flex-1">{step.title}</span>
                  )}
                  {isStepCompleted && !isCollapsed && (
                    <Check className="w-3.5 h-3.5 stroke-[3] shrink-0 text-[var(--text-secondary)]" aria-label={t('markStepComplete')} />
                  )}
                </button>
              );
            })}

            <div className={isCollapsed ? 'w-full py-1' : 'py-1'}>
              <div className="border-t-2 border-dashed border-[var(--border-subtle)]" />
            </div>

            <button
              onClick={() => onSelectStep(11)}
              className={navItemClass(activeStep === 11)}
              title={t('step11Title')}
              aria-current={activeStep === 11 ? 'page' : undefined}
            >
              <span className={isCollapsed ? '' : 'p-1 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center'}>
                <PenTool className="w-3.5 h-3.5" />
              </span>
              {!isCollapsed && <span className="truncate">{t('step11Title')}</span>}
            </button>

            <button
              onClick={() => onSelectStep(12)}
              className={navItemClass(activeStep === 12)}
              title={t('step12Title')}
              aria-current={activeStep === 12 ? 'page' : undefined}
            >
              <span className={isCollapsed ? '' : 'p-1 bg-[var(--pastel-lavender)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center'}>
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              {!isCollapsed && <span className="truncate">{t('step12Title')}</span>}
            </button>
          </nav>
        </>
      ) : (
        <div className={`flex-1 flex items-start p-4 text-[var(--text-secondary)] font-heading ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <span className="p-2 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shrink-0" aria-hidden="true">
            <FolderKanban className="w-4 h-4" />
          </span>
          {!isCollapsed && <p className="text-xs font-bold leading-relaxed">{t('openProjectHelp')}</p>}
        </div>
      )}

      {/* Sidebar Footer */}
      {isCollapsed ? (
        /* Collapsed Footer: Compact Language Switcher */
        <footer className="p-2 border-t-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-center shrink-0">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="h-8 w-8 flex items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-2xs font-heading font-black cursor-pointer shrink-0"
            title={t('switchLanguageTitle')}
            aria-label={t('switchLanguageTitle')}
          >
            <span>{t('switchLanguageShort')}</span>
          </button>
        </footer>
      ) : (
        /* Expanded Footer */
        <footer className="p-3 border-t-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0 select-text">
          <div className="flex items-center gap-1.5 font-heading font-bold text-2xs">
            <span>{t('builtBy')}</span>
            <a
              href="https://github.com/RubarMo"
              target="_blank"
              rel="noopener noreferrer"
              onClick={openGithub}
              className="text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none px-1 border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] transition-all font-black"
              title={t('githubProfile')}
            >
              Rubar
            </a>
            {appVersion && (
              <span className="text-3xs font-mono text-black font-bold px-1 bg-[var(--pastel-lavender)] border border-[var(--border-ink)]">
                v{appVersion}
              </span>
            )}
          </div>
          
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="inline-flex items-center gap-1 px-2 py-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-2xs font-heading font-black cursor-pointer"
            title={t('switchLanguageTitle')}
          >
            <Languages className="w-3 h-3" aria-hidden="true" />
            <span>{t('switchLanguageShort')}</span>
          </button>
        </footer>
      )}
    </aside>
  );
};
