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
  LayoutDashboard
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
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [appVersion, setAppVersion] = useState<string>('');

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

  return (
    <aside className={`w-72 md:w-80 border-e-3 border-[var(--border-ink)] bg-[var(--bg-surface)] flex flex-col h-full select-none shrink-0 transition-transform duration-200 ease-out fixed inset-y-0 start-0 z-40 pt-[env(safe-area-inset-top,0px)] md:pt-0 pb-[env(safe-area-inset-bottom,0px)] md:pb-0 md:relative md:translate-x-0 ${translateClass}`}>
      {/* Sidebar Header */}
      <div className="h-16 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center px-4 shrink-0">
        {novel ? (
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
            <button
              onClick={onCloseProject}
              className="px-2.5 py-1 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-coral)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap shrink-0"
              title={t('closeProjectTitle')}
            >
              {t('close')}
            </button>
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
        )}
      </div>

      {novel ? (
        <>
          {/* Progress Section */}
          <div className="p-3.5 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] space-y-2">
            <div className="flex justify-between items-center text-[11px] font-heading font-black">
              <span className="text-[var(--text-secondary)] uppercase tracking-wider">{t('completedSteps')}</span>
              <span className="font-mono bg-[var(--pastel-yellow)] text-black px-1.5 py-0.5 border border-[var(--border-ink)] font-bold text-[10px]">
                {completedSteps} / 10
              </span>
            </div>
            {/* Tactile Neubrutalist Progress Bar */}
            <div className="w-full bg-[var(--bg-surface)] h-3 border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] overflow-hidden">
              <div 
                className="bg-[var(--pastel-mint)] h-full transition-all duration-300 ease-out border-e-2 border-[var(--border-ink)]"
                style={{ width: `${(completedSteps / 10) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation Steps List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {/* Dashboard Step 0 */}
            <button
              onClick={() => onSelectStep(0)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-heading font-black border-2 border-[var(--border-ink)] transition-all cursor-pointer text-start select-none ${
                activeStep === 0
                  ? 'bg-[var(--pastel-yellow)] text-black shadow-[4px_4px_0px_var(--shadow-ink)] translate-x-0.5'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_var(--shadow-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
              }`}
            >
              <span className="p-1 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shrink-0 flex items-center justify-center">
                <LayoutDashboard className="w-3.5 h-3.5" />
              </span>
              <span className="truncate">{t('dashboard')}</span>
            </button>

            <div className="py-1">
              <div className="border-t-2 border-dashed border-[var(--border-subtle)]" />
            </div>

            {/* Steps 1 to 10 */}
            {steps.map((step) => {
              const isStepCompleted = stepsProgress.some(p => p.step_number === step.num && p.is_completed);
              const isActive = activeStep === step.num;

              return (
                <button
                  key={step.num}
                  onClick={() => onSelectStep(step.num)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-heading font-bold border-2 border-[var(--border-ink)] transition-all cursor-pointer text-start select-none ${
                    isActive
                      ? 'bg-[var(--pastel-yellow)] text-black font-black shadow-[4px_4px_0px_var(--shadow-ink)] translate-x-0.5'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_var(--shadow-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
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
                      title={t('markAsCompleted')}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] font-heading">
          <div className="p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold leading-relaxed">{t('openProjectHelp')}</p>
        </div>
      )}

      {/* Sidebar Footer */}
      <footer className="p-3 border-t-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0 select-text">
        <div className="flex items-center gap-2 font-heading font-bold text-[11px]">
          <span>{t('builtBy')}</span>
          <a 
            href="https://github.com/RubarMo" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--text-primary)] hover:bg-[var(--pastel-yellow)] hover:text-black px-1 border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] transition-all font-black flex items-center gap-1"
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
          className="inline-flex items-center gap-1 px-2.5 py-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-sky)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-[10px] font-heading font-black tracking-wider cursor-pointer"
          title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
        >
          <Languages className="w-3 h-3" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </footer>
    </aside>
  );
};
