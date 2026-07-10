import React, { useState, useEffect } from 'react';
import { Novel, StepProgress } from '../lib';
import { useLanguage } from '../LanguageContext';
import { getVersion } from '@tauri-apps/api/app';

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
    <aside className={`w-72 border-e border-m3-outline-variant bg-m3-surface flex flex-col h-full select-none font-cairo shrink-0 transition-transform duration-300 ease-in-out fixed inset-y-0 start-0 z-40 pt-[env(safe-area-inset-top,0px)] md:pt-0 pb-[env(safe-area-inset-bottom,0px)] md:pb-0 md:relative md:translate-x-0 ${translateClass}`}>
      {/* Header (M3 Drawer Header aligned to top bar height) */}
      <div className="h-16 border-b border-m3-outline-variant bg-m3-surface-variant/30 flex items-center px-4 shrink-0">
        {novel ? (
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-m3-on-surface truncate" title={novel.title}>
                {novel.title}
              </h2>
              <p 
                className="text-[9px] font-mono text-m3-on-surface-variant truncate" 
                title={activeProjectPath || ""}
                dir="ltr"
              >
                {projectFileName}
              </p>
            </div>
            <button
              onClick={onCloseProject}
              className="relative overflow-hidden text-[10px] px-3 py-1 shrink-0 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 transition-colors font-bold rounded-full cursor-pointer font-cairo"
              title={t('closeProjectTitle')}
            >
              {t('close')}
              <md-ripple></md-ripple>
            </button>
            {onCloseSidebar && (
              <button
                onClick={onCloseSidebar}
                className="relative overflow-hidden md:hidden p-1 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-variant/40 rounded-full cursor-pointer transition-colors shrink-0 flex items-center justify-center"
                title={t('closeSidebar')}
              >
                <span className="material-symbols-rounded text-sm block">close</span>
                <md-ripple></md-ripple>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-m3-on-surface-variant">{t('platformName')}</span>
            {onCloseSidebar && (
              <button
                onClick={onCloseSidebar}
                className="relative overflow-hidden md:hidden p-1 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-variant/40 rounded-full cursor-pointer transition-colors shrink-0 flex items-center justify-center"
                title={t('closeSidebar')}
              >
                <span className="material-symbols-rounded text-sm block">close</span>
                <md-ripple></md-ripple>
              </button>
            )}
          </div>
        )}
      </div>

      {novel ? (
        <>
          {/* Progress (M3 Progress Indicator) */}
          <div className="px-4 py-3 border-b border-m3-outline-variant bg-m3-surface-variant/20">
            <div className="flex justify-between items-center text-[10px] font-bold text-m3-on-surface-variant mb-1.5">
              <span>{t('completedSteps')}</span>
              <span>{completedSteps} / 10</span>
            </div>
            <div className="w-full bg-m3-surface-variant h-2 rounded-full overflow-hidden">
              <div 
                className="bg-m3-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${(completedSteps / 10) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation (M3 Pill Navigation Items) */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <button
              onClick={() => onSelectStep(0)}
              className={`relative overflow-hidden w-full text-start text-xs py-2.5 px-4 rounded-full transition-all cursor-pointer font-cairo ${
                activeStep === 0
                  ? 'bg-m3-primary-container text-m3-on-primary-container font-bold shadow-sm'
                  : 'hover:bg-m3-surface-variant/45 text-m3-on-surface-variant hover:text-m3-on-surface'
              }`}
            >
              {t('dashboard')}
              <md-ripple></md-ripple>
            </button>

            <div className="my-2 border-t border-m3-outline-variant/60 mx-2" />

            {steps.map((step) => {
              const isStepCompleted = stepsProgress.some(p => p.step_number === step.num && p.is_completed);
              return (
                <button
                  key={step.num}
                  onClick={() => onSelectStep(step.num)}
                  className={`relative overflow-hidden w-full flex items-center justify-between text-xs py-2.5 px-4 rounded-full transition-all cursor-pointer font-cairo ${
                    activeStep === step.num
                      ? 'bg-m3-primary-container text-m3-on-primary-container font-bold shadow-sm'
                      : 'hover:bg-m3-surface-variant/45 text-m3-on-surface-variant hover:text-m3-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold transition-colors ${
                      activeStep === step.num
                        ? 'bg-m3-primary text-m3-on-primary'
                        : 'bg-m3-surface-variant text-m3-on-surface-variant'
                    }`}>
                      {step.num}
                    </span>
                    <span className="truncate max-w-[150px]">{step.title}</span>
                  </div>

                  {isStepCompleted && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title={t('markAsCompleted')} />
                  )}
                  <md-ripple></md-ripple>
                </button>
              );
            })}
          </nav>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-m3-on-surface-variant font-semibold">
          <p className="text-[11px] leading-relaxed">{t('openProjectHelp')}</p>
        </div>
      )}

      {/* Footer (M3 Sidebar Footer) */}
      <footer className="p-3 border-t border-m3-outline-variant flex items-center justify-between text-[10px] text-m3-on-surface-variant shrink-0 select-text">
        <div className="flex items-center gap-1.5 font-cairo">
          <span>{t('builtBy')} Rubar</span>
          <a 
            href="https://github.com/RubarMo" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-m3-primary transition-colors flex items-center gap-1 font-semibold"
            title="GitHub Profile"
          >
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          {appVersion && (
            <span className="text-[9px] font-mono text-m3-on-surface-variant/40 select-none px-1 bg-m3-surface-variant/20 rounded border border-m3-outline-variant/30">
              v{appVersion}
            </span>
          )}
        </div>
        
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="relative overflow-hidden px-3 py-1 rounded-full border border-m3-outline text-m3-primary hover:bg-m3-primary/10 transition-colors text-[9px] font-bold tracking-wider cursor-pointer font-cairo"
          title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
        >
          {language === 'ar' ? 'English' : 'العربية'}
          <md-ripple></md-ripple>
        </button>
      </footer>
    </aside>
  );
};
