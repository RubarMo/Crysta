import React, { useState, useEffect } from 'react';
import { Novel, StepProgress } from '../lib';
import { useLanguage } from '../LanguageContext';
import { getVersion } from '@tauri-apps/api/app';
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
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      getVersion().then(setAppVersion).catch((err) => {
        console.error("Failed to load app version", err);
      });
    } catch (e) {
      console.warn("Tauri getVersion not available:", e);
    }
  }, []);

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

  return (
    <aside className={`${widthClass} border-e-3 border-[var(--border-ink)] bg-[var(--bg-surface)] flex flex-col h-full select-none shrink-0 transition-all duration-200 ease-out fixed inset-y-0 start-0 z-40 pt-[env(safe-area-inset-top,0px)] md:pt-0 pb-[env(safe-area-inset-bottom,0px)] md:pb-0 md:relative md:translate-x-0 ${translateClass}`}>
      {/* Sidebar Header */}
      <div className="h-16 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center px-2.5 sm:px-3 shrink-0">
        {isCollapsed ? (
          /* Collapsed Header: Hamburger / Expand Button */
          <div className="w-full flex items-center justify-center">
            <button
              onClick={handleToggleCollapse}
              className="h-8 w-8 flex items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
              title={t('expandSidebar')}
              aria-label="Expand sidebar"
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
                  className="text-[10px] font-mono text-[var(--text-muted)] truncate" 
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
                    className="h-7 w-7 flex items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--pastel-lavender)] text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    title={t('backupsTitle')}
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={onCloseProject}
                  className="h-7 px-2 flex items-center justify-center text-[10px] font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-coral)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
                  title={t('closeProjectTitle')}
                >
                  {t('close')}
                </button>

                {/* Separator Line */}
                <div className="hidden md:block h-4 w-[1.5px] bg-[var(--border-ink)] mx-0.5 shrink-0 opacity-40" />

                {/* Collapse Sidebar Button on Desktop */}
                <button
                  onClick={handleToggleCollapse}
                  className="hidden md:flex h-7 w-7 items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1.5px_1.5px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
                  title={t('collapseSidebar')}
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className={`w-3.5 h-3.5 ${isRtl ? 'scale-x-[-1]' : ''}`} />
                </button>

                {/* Mobile Close Button */}
                {onCloseSidebar && (
                  <button
                    onClick={onCloseSidebar}
                    className="md:hidden h-7 w-7 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black border-2 border-[var(--border-ink)] shadow-[1.5px_1.5px_0px_var(--shadow-ink)] transition-all shrink-0 cursor-pointer"
                    title={t('closeSidebar')}
                    aria-label="Close sidebar"
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
                  aria-label="Close sidebar"
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
              className="py-2 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-center select-none" 
              title={`${t('completedSteps')}: ${completedSteps}/10`}
            >
              <span className="font-mono text-[9px] font-black bg-[var(--pastel-yellow)] text-black px-1 py-0.5 border border-[var(--border-ink)]">
                {completedSteps}/10
              </span>
            </div>
          ) : (
            <div className="p-3 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] space-y-2">
              <div className="flex justify-between items-center text-[11px] font-heading font-black">
                <span className="text-[var(--text-secondary)] uppercase tracking-wider">{t('completedSteps')}</span>
                <span className="font-mono bg-[var(--pastel-yellow)] text-black px-1.5 py-0.5 border border-[var(--border-ink)] font-bold text-[10px]">
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

          {/* Navigation Steps List */}
          <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'py-2.5 px-1 space-y-2 flex flex-col items-center' : 'p-2.5 space-y-1.5'}`}>
            {/* Dashboard Step 0 */}
            <button
              onClick={() => onSelectStep(0)}
              className={
                isCollapsed
                  ? `w-9 h-9 flex items-center justify-center border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0 ${
                      activeStep === 0
                        ? 'bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                    }`
                  : `w-full flex items-center gap-2.5 px-3 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-start select-none ${
                      activeStep === 0
                        ? 'bg-[var(--pastel-yellow)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] translate-x-0.5'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                    }`
              }
              title={t('dashboard')}
            >
              <span className={isCollapsed ? '' : 'p-1 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center'}>
                <LayoutDashboard className="w-3.5 h-3.5" />
              </span>
              {!isCollapsed && <span className="truncate">{t('dashboard')}</span>}
            </button>

            <div className={isCollapsed ? 'w-full py-0.5' : 'py-0.5'}>
              <div className="border-t-2 border-dashed border-[var(--border-subtle)]" />
            </div>

            {/* Steps 1 to 10 */}
            {steps.map((step) => {
              const isStepCompleted = stepsProgress.some(p => p.step_number === step.num && p.is_completed);
              const isActive = activeStep === step.num;

              if (isCollapsed) {
                return (
                  <button
                    key={step.num}
                    onClick={() => onSelectStep(step.num)}
                    className={`w-9 h-9 flex items-center justify-center border-2 border-[var(--border-ink)] relative hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
                        : (isStepCompleted ? 'bg-[var(--pastel-mint)] text-black font-bold shadow-[1px_1px_0px_var(--shadow-ink)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]')
                    }`}
                    title={`${step.num}. ${step.title}`}
                  >
                    <span className="font-mono text-xs font-black">
                      {step.num}
                    </span>
                    {isStepCompleted && !isActive && (
                      <span className="absolute -top-1 -end-1 w-2.5 h-2.5 bg-black text-white flex items-center justify-center border border-black">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={step.num}
                  onClick={() => onSelectStep(step.num)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-start select-none ${
                    isActive
                      ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[3px_3px_0px_var(--shadow-ink)] translate-x-0.5'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 font-mono text-[10px] font-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center ${
                      isActive 
                        ? 'bg-black text-[var(--pastel-yellow)]' 
                        : (isStepCompleted ? 'bg-[var(--pastel-mint)] text-black' : 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)]')
                    }`}>
                      {step.num}
                    </span>
                    <span className="truncate text-[11px] leading-tight">{step.title}</span>
                  </div>

                  {isStepCompleted && (
                    <span 
                      className="p-0.5 bg-[var(--pastel-mint)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] shrink-0" 
                      title={t('confirm')}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}

            <div className={isCollapsed ? 'w-full py-0.5' : 'py-1'}>
              <div className="border-t-2 border-dashed border-[var(--border-subtle)]" />
            </div>

            {/* TAB 11: Write Novel */}
            <button
              onClick={() => onSelectStep(11)}
              className={
                isCollapsed
                  ? `w-9 h-9 flex items-center justify-center border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0 ${
                      activeStep === 11
                        ? 'bg-[var(--pastel-sky)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                    }`
                  : `w-full flex items-center gap-2.5 px-3 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-start select-none ${
                      activeStep === 11
                        ? 'bg-[var(--pastel-sky)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] translate-x-0.5'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                    }`
              }
              title={t('step11Title')}
            >
              <span className={isCollapsed ? '' : 'p-1 bg-[var(--pastel-yellow)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center'}>
                <PenTool className="w-3.5 h-3.5" />
              </span>
              {!isCollapsed && <span className="truncate">{t('step11Title')}</span>}
            </button>

            {/* TAB 12: Book Studio */}
            <button
              onClick={() => onSelectStep(12)}
              className={
                isCollapsed
                  ? `w-9 h-9 flex items-center justify-center border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0 ${
                      activeStep === 12
                        ? 'bg-[var(--pastel-mint)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] font-black'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
                    }`
                  : `w-full flex items-center gap-2.5 px-3 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-start select-none ${
                      activeStep === 12
                        ? 'bg-[var(--pastel-mint)] text-black shadow-[3px_3px_0px_var(--shadow-ink)] translate-x-0.5'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)]'
                    }`
              }
              title={t('step12Title')}
            >
              <span className={isCollapsed ? '' : 'p-1 bg-[var(--pastel-lavender)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center'}>
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              {!isCollapsed && <span className="truncate">{t('step12Title')}</span>}
            </button>
          </nav>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[var(--text-secondary)] font-heading">
          <div className="p-2.5 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] mb-2">
            <FolderKanban className="w-5 h-5" />
          </div>
          {!isCollapsed && <p className="text-xs font-bold leading-relaxed">{t('openProjectHelp')}</p>}
        </div>
      )}

      {/* Sidebar Footer */}
      {isCollapsed ? (
        /* Collapsed Footer: Compact Language Switcher */
        <footer className="p-2 border-t-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-center shrink-0">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="h-8 w-8 flex items-center justify-center border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-[10px] font-heading font-black cursor-pointer shrink-0"
            title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
          >
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
        </footer>
      ) : (
        /* Expanded Footer */
        <footer className="p-3 border-t-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0 select-text">
          <div className="flex items-center gap-1.5 font-heading font-bold text-[11px]">
            <span>{t('builtBy')}</span>
            <a 
              href="https://github.com/RubarMo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--text-primary)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none px-1 border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] transition-all font-black"
              title="GitHub Profile"
            >
              Rubar
            </a>
            {appVersion && (
              <span className="text-[9px] font-mono text-black font-bold px-1 bg-[var(--pastel-lavender)] border border-[var(--border-ink)]">
                v{appVersion}
              </span>
            )}
          </div>
          
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="inline-flex items-center gap-1 px-2 py-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-[10px] font-heading font-black cursor-pointer"
            title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Languages className="w-3 h-3" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
        </footer>
      )}
    </aside>
  );
};
