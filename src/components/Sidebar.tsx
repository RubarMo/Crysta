import React from 'react';
import { Novel, StepProgress } from '../lib';
import { useLanguage } from '../LanguageContext';

interface SidebarProps {
  novel: Novel | null;
  activeProjectPath: string | null;
  onCloseProject: () => void;
  activeStep: number;
  onSelectStep: (step: number) => void;
  stepsProgress: StepProgress[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  novel,
  activeProjectPath,
  onCloseProject,
  activeStep,
  onSelectStep,
  stepsProgress,
}) => {
  const { language, setLanguage, t } = useLanguage();

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

  return (
    <aside className="w-72 border-e border-zinc-200 dark:border-zinc-800 bg-[#f8f6f4] dark:bg-[#161616] flex flex-col h-screen select-none font-cairo shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-2 bg-white/30 dark:bg-black/10">
        {novel ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate" title={novel.title}>
                {novel.title}
              </h2>
              <p 
                className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 truncate" 
                title={activeProjectPath || ""}
                dir="ltr"
              >
                {projectFileName}
              </p>
            </div>
            <button
              onClick={onCloseProject}
              className="text-[10px] px-2 py-1 shrink-0 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-450 hover:border-rose-200 dark:hover:border-rose-800 transition-colors font-semibold rounded cursor-pointer"
              title={t('closeProjectTitle')}
            >
              {t('close')}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{t('platformName')}</span>
          </div>
        )}
      </div>

      {novel ? (
        <>
          {/* Progress */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-black/5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-1">
              <span>{t('completedSteps')}</span>
              <span>{completedSteps} / 10</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded overflow-hidden">
              <div 
                className="bg-zinc-800 dark:bg-zinc-200 h-full transition-all duration-300 ease-out"
                style={{ width: `${(completedSteps / 10) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <button
              onClick={() => onSelectStep(0)}
              className={`w-full text-start text-xs p-2 rounded transition-colors ${
                activeStep === 0
                  ? 'bg-zinc-800 text-white font-bold dark:bg-zinc-200 dark:text-zinc-900'
                  : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {t('dashboard')}
            </button>

            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800/80 mx-1" />

            {steps.map((step) => {
              const isStepCompleted = stepsProgress.some(p => p.step_number === step.num && p.is_completed);
              return (
                <button
                  key={step.num}
                  onClick={() => onSelectStep(step.num)}
                  className={`w-full flex items-center justify-between text-xs p-2 rounded transition-colors ${
                    activeStep === step.num
                      ? 'bg-zinc-800 text-white font-bold dark:bg-zinc-200 dark:text-zinc-900'
                      : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center font-bold">
                      {step.num}
                    </span>
                    <span className="truncate max-w-[170px]">{step.title}</span>
                  </div>

                  {isStepCompleted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={t('markAsCompleted')} />
                  )}
                </button>
              );
            })}
          </nav>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-650 font-semibold">
          <p className="text-[11px] leading-relaxed">{t('openProjectHelp')}</p>
        </div>
      )}

      {/* Footer */}
      <footer className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-600 shrink-0 select-text">
        <div className="flex items-center gap-1.5">
          <span>{t('builtBy')} Rubar</span>
          <a 
            href="https://github.com/RubarMo" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-zinc-600 dark:hover:text-zinc-350 transition-colors flex items-center gap-1 font-semibold"
            title="GitHub Profile"
          >
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
        
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 hover:dark:bg-zinc-900 transition-colors text-[9px] font-bold tracking-wider"
          title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
        >
          {language === 'ar' ? 'English' : 'العربية'}
        </button>
      </footer>
    </aside>
  );
};

