import { useEffect, useState, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { ThemeToggle } from "./components/ThemeToggle";
import { useLanguage } from "./LanguageContext";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch, exit } from "@tauri-apps/plugin-process";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { 
  Novel, 
  StepProgress, 
  getStepsProgress,
  selectProjectFile,
  createProjectFile,
  listProjectFiles,
  openProject,
  closeProject
} from "./lib";


interface RecentProject {
  path: string;
  title: string;
  lastOpened: string;
}

function App() {
  const { language, t } = useLanguage();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [activeNovelId, setActiveNovelId] = useState<number | null>(null);
  const [activeProjectPath, setActiveProjectPath] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [stepsProgress, setStepsProgress] = useState<StepProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [mobileProjects, setMobileProjects] = useState<string[]>([]);
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean;
    version: string;
    body: string;
    downloading: boolean;
    progress: number;
    error: string | null;
  } | null>(null);

  // Back button navigation state ref
  const navStateRef = useRef({
    showHelpModal,
    showPickerModal,
    isSidebarOpen,
    activeNovelId,
    activeStep,
  });

  // Sync ref with state updates
  useEffect(() => {
    navStateRef.current = {
      showHelpModal,
      showPickerModal,
      isSidebarOpen,
      activeNovelId,
      activeStep,
    };
  }, [showHelpModal, showPickerModal, isSidebarOpen, activeNovelId, activeStep]);

  // Handle Android back button
  useEffect(() => {
    let listener: any = null;

    const setupBackButtonListener = async () => {
      try {
        listener = await onBackButtonPress(() => {
          const {
            showHelpModal: helpOpen,
            showPickerModal: pickerOpen,
            isSidebarOpen: sidebarOpen,
            activeNovelId: novelId,
            activeStep: step,
          } = navStateRef.current;

          if (helpOpen) {
            setShowHelpModal(false);
          } else if (pickerOpen) {
            setShowPickerModal(false);
          } else if (sidebarOpen) {
            setIsSidebarOpen(false);
          } else if (novelId !== null) {
            if (step > 0) {
              setActiveStep(0);
            } else {
              handleCloseProject();
            }
          } else {
            exit(0).catch((err) => {
              console.error("Failed to exit app:", err);
            });
          }
        });
      } catch (err) {
        console.warn("Failed to register back button listener:", err);
      }
    };

    setupBackButtonListener();

    return () => {
      if (listener) {
        listener.unregister().catch((err: any) => {
          console.error("Failed to unregister back button listener:", err);
        });
      }
    };
  }, []);


  // Check for updates on startup
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update && update.available) {
          setUpdateInfo({
            available: true,
            version: update.version,
            body: update.body || '',
            downloading: false,
            progress: 0,
            error: null
          });
        }
      } catch (err) {
        console.warn("Failed checking for updates:", err);
      }
    };
    
    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handlePerformUpdate = async () => {
    try {
      const update = await check();
      if (!update) return;
      
      setUpdateInfo(prev => prev ? { ...prev, downloading: true, progress: 0 } : null);
      
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const pct = contentLength ? Math.round((downloaded / contentLength) * 100) : 0;
            setUpdateInfo(prev => prev ? { ...prev, progress: pct } : null);
            break;
          case 'Finished':
            break;
        }
      });

      await relaunch();
    } catch (err: any) {
      console.error("Update failed:", err);
      setUpdateInfo(prev => prev ? { ...prev, downloading: false, error: err?.message || String(err) } : null);
    }
  };

  // Load recent projects from local storage
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("recent_projects") || "[]");
    } catch {
      return [];
    }
  });

  const addRecentProject = (path: string, title: string) => {
    setRecentProjects(prev => {
      const filtered = prev.filter(p => p.path !== path);
      const updated = [{ path, title, lastOpened: new Date().toISOString() }, ...filtered].slice(0, 10);
      localStorage.setItem("recent_projects", JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecentProject = (path: string) => {
    setRecentProjects(prev => {
      const updated = prev.filter(p => p.path !== path);
      localStorage.setItem("recent_projects", JSON.stringify(updated));
      return updated;
    });
  };

  // Load steps progress for the active novel
  const loadStepsProgress = async () => {
    if (activeNovelId === null) {
      setStepsProgress([]);
      return;
    }
    try {
      const progress = await getStepsProgress(activeNovelId);
      setStepsProgress(progress);
    } catch (err) {
      console.error("Failed to load steps progress", err);
    }
  };

  useEffect(() => {
    loadStepsProgress();
  }, [activeNovelId]);

  const handleOpenProjectPath = async (path: string) => {
    setLoading(true);
    try {
      const novel = await openProject(path);
      setNovels([novel]);
      setActiveNovelId(novel.id || null);
      setActiveProjectPath(path);
      setActiveStep(0);
      addRecentProject(path, novel.title);
      setErrorMessage(null);
    } catch (err: any) {
      console.error("Failed to open project path", err);
      setErrorMessage(`${t("failedToOpenProject")}: ${err}`);
      removeRecentProject(path);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFileDialog = async () => {
    try {
      const path = await selectProjectFile();
      if (path) {
        await handleOpenProjectPath(path);
      } else {
        const files = await listProjectFiles();
        if (files && files.length > 0) {
          setMobileProjects(files);
          setShowPickerModal(true);
        } else {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            alert(language === 'ar' ? 'لم يتم العثور على ملفات مشاريع محفوظة محلياً.' : 'No saved project files found.');
          }
        }
      }
    } catch (err: any) {
      console.error("File open error", err);
      alert(`${t("error")}: ${err}`);
    }
  };

  const handleCreateFileDialog = async () => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      let filename = t("newNovelFilename");
      
      if (isMobile) {
        const name = prompt(
          language === 'ar' ? 'أدخل اسم المشروع الجديد:' : 'Enter new project name:',
          language === 'ar' ? 'مشروع جديد' : 'New Project'
        );
        if (name === null) return; // User cancelled
        const cleanedName = name.trim().replace(/[/\\?%*:|"<>\s]/g, '_');
        if (!cleanedName) return;
        filename = `${cleanedName}.crysta`;
      }

      const path = await createProjectFile(filename);
      if (path) {
        setLoading(true);
        const novel = await openProject(path);
        setNovels([novel]);
        setActiveNovelId(novel.id || null);
        setActiveProjectPath(path);
        setActiveStep(0);
        addRecentProject(path, novel.title);
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error("File create error", err);
      alert(`${t("error")}: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProject = async () => {
    try {
      await closeProject();
      setActiveNovelId(null);
      setActiveProjectPath(null);
      setNovels([]);
      setStepsProgress([]);
    } catch (err) {
      console.error("Close project error", err);
    }
  };

  const handleUpdateNovelLocally = (updated: Novel) => {
    setNovels([updated]);
    if (activeProjectPath) {
      addRecentProject(activeProjectPath, updated.title);
    }
  };

  const activeNovel = novels.find(n => n.id === activeNovelId) || null;

  return (
    <div className="flex h-screen app-container bg-m3-background text-m3-on-surface overflow-hidden font-cairo select-none">
      {/* Sidebar (Navigation) */}
      <Sidebar
        novel={activeNovel}
        activeProjectPath={activeProjectPath}
        onCloseProject={handleCloseProject}
        activeStep={activeStep}
        onSelectStep={(step) => {
          setActiveStep(step);
          setIsSidebarOpen(false); // Close drawer on step select on mobile
        }}
        stepsProgress={stepsProgress}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
      />

      {/* Backdrop dimming overlay on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar with Toggle / Logo (M3 Top App Bar: subtle elevation / outline variant) */}
        <header className="h-16 border-b border-m3-outline-variant bg-m3-background px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="relative overflow-hidden md:hidden p-1.5 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-variant/40 rounded-full cursor-pointer transition-colors flex items-center justify-center"
              title={t("openSidebar")}
            >
              <span className="material-symbols-rounded text-sm block">menu</span>
              <md-ripple></md-ripple>
            </button>
            <span 
              onClick={handleCloseProject}
              className="font-bold text-base tracking-wide text-m3-on-surface cursor-pointer hover:opacity-80 transition-opacity font-cairo"
            >
              {t("appName")}
            </span>
            {activeNovelId !== null && (
              <button
                onClick={handleCloseProject}
                className="relative overflow-hidden text-[10px] px-3 py-1 border border-m3-outline-variant hover:bg-m3-surface-variant/40 text-m3-on-surface-variant rounded-full transition-colors cursor-pointer font-cairo font-semibold whitespace-nowrap shrink-0"
              >
                {t("projectsBtn")}
                <md-ripple></md-ripple>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {errorMessage && (
              <span className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3 py-1 rounded-full">
                {t("error")}: {errorMessage}
              </span>
            )}
            <button
              onClick={() => setShowHelpModal(true)}
              className="relative overflow-hidden text-xs px-4 py-1.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 transition-colors font-bold rounded-full cursor-pointer font-cairo whitespace-nowrap shrink-0"
            >
              {t("helpGuideBtn")}
              <md-ripple></md-ripple>
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-hidden bg-m3-background flex flex-col min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-m3-on-surface-variant">
              {t("loadingProjectFile")}
            </div>
          ) : activeNovel ? (
            <Workspace
              activeNovel={activeNovel}
              onUpdateNovel={handleUpdateNovelLocally}
              stepsProgress={stepsProgress}
              onReloadSteps={loadStepsProgress}
              activeStep={activeStep}
            />
          ) : (
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-8 space-y-8 fade-in font-cairo select-text">
              {/* Header */}
              <div className="border-b border-m3-outline-variant pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="min-w-0 pr-4">
                  <h1 className="text-2xl font-black text-m3-on-surface font-cairo">{t("appName")}</h1>
                  <p className="text-m3-on-surface-variant text-xs mt-1 font-cairo font-medium truncate" title={t("appTagline")}>{t("appTagline")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleOpenFileDialog}
                    className="relative overflow-hidden flex items-center justify-center text-xs px-6 py-2.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 font-bold rounded-full cursor-pointer transition-colors font-cairo whitespace-nowrap shrink-0"
                  >
                    <span>{t("openProjectBtn")}</span>
                    <md-ripple></md-ripple>
                  </button>
                  <button
                    onClick={handleCreateFileDialog}
                    className="relative overflow-hidden flex items-center justify-center gap-2 text-xs px-6 py-2.5 bg-m3-primary hover:opacity-90 text-m3-on-primary font-bold rounded-full cursor-pointer transition-all font-cairo shadow-sm whitespace-nowrap shrink-0"
                  >
                    <span className="material-symbols-rounded text-[18px]">add</span>
                    <span>{t("createProjectBtn")}</span>
                    <md-ripple></md-ripple>
                  </button>
                </div>
              </div>

              {/* Recent Projects List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface-variant">{t("recentProjectsTitle")}</h3>
                {recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-m3-outline-variant rounded-2xl bg-m3-surface/50">
                    <span className="material-symbols-rounded text-4xl text-m3-on-surface-variant/40">library_books</span>
                    <h2 className="text-sm font-bold text-m3-on-surface font-cairo">{t("noRecentProjectsTitle")}</h2>
                    <p className="text-xs text-m3-on-surface-variant max-w-xs leading-relaxed font-cairo font-semibold text-center">
                      {t("noRecentProjectsDesc")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {recentProjects.map((project) => (
                      <div 
                        key={project.path}
                        onClick={() => handleOpenProjectPath(project.path)}
                        className="bg-m3-surface p-4 border border-m3-outline-variant hover:border-m3-primary rounded-2xl cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 group relative select-text"
                      >
                        <div className="space-y-1 min-w-0 flex-1 pe-4 text-start">
                          <h4 className="text-sm font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors font-cairo">
                            {project.title}
                          </h4>
                          <p className="text-[10px] text-m3-on-surface-variant font-mono truncate w-full select-all" dir="ltr" title={project.path}>
                            {project.path}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0 sm:self-center self-end">
                          <span className="text-[10px] text-m3-on-surface-variant font-semibold">
                            {t("openedLabel")} {new Date(project.lastOpened).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentProject(project.path);
                            }}
                            className="relative overflow-hidden p-1.5 text-m3-on-surface-variant hover:text-rose-500 opacity-100 rounded-full cursor-pointer flex items-center justify-center"
                            title={t("removeFromList")}
                          >
                            <span className="material-symbols-rounded text-sm">close</span>
                            <md-ripple></md-ripple>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Help Modal (M3 dialog: rounded-3xl and bg-m3-surface) */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-cairo select-text"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-m3-surface border border-m3-outline-variant rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-m3-outline-variant pb-3 mb-4">
              <h2 className="text-base font-bold text-m3-on-surface">{t("helpModalTitle")}</h2>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="relative overflow-hidden p-1 text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-variant/40 rounded-full cursor-pointer flex items-center justify-center"
                title={t("close")}
              >
                <span className="material-symbols-rounded text-sm">close</span>
                <md-ripple></md-ripple>
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-m3-on-surface-variant text-start">
              <p className="font-semibold text-m3-on-surface">{t("helpModalDesc")}</p>
              
              <div className="space-y-3 pt-2">
                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep1Title")}</h4>
                  <p>{t("helpStep1Desc")}</p>
                </div>
                
                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep2Title")}</h4>
                  <p>{t("helpStep2Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep3Title")}</h4>
                  <p>{t("helpStep3Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep4Title")}</h4>
                  <p>{t("helpStep4Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep5Title")}</h4>
                  <p>{t("helpStep5Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep6Title")}</h4>
                  <p>{t("helpStep6Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep7Title")}</h4>
                  <p>{t("helpStep7Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep8Title")}</h4>
                  <p>{t("helpStep8Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep9Title")}</h4>
                  <p>{t("helpStep9Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-m3-on-surface">{t("helpStep10Title")}</h4>
                  <p>{t("helpStep10Desc")}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-m3-outline-variant pt-4">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="relative overflow-hidden px-6 py-2.5 bg-m3-primary hover:opacity-90 text-m3-on-primary font-bold rounded-full text-xs transition-colors cursor-pointer font-cairo shadow-sm"
              >
                <span>{t("helpModalCloseBtn")}</span>
                <md-ripple></md-ripple>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Picker Modal for Mobile */}
      {showPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-m3-surface border border-m3-outline-variant w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-xl text-start font-cairo">
            <div>
              <h3 className="text-sm font-bold text-m3-on-surface">
                {language === 'ar' ? 'اختر ملف المشروع' : 'Select Project File'}
              </h3>
              <p className="text-[10px] text-m3-on-surface-variant mt-1">
                {language === 'ar' ? 'اختر أحد الملفات المخزنة محلياً لفتحه:' : 'Select a locally stored file to open:'}
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-m3-outline-variant/30 border border-m3-outline-variant/40 rounded-2xl bg-m3-background">
              {mobileProjects.map((file) => (
                <button
                  key={file}
                  onClick={async () => {
                    setShowPickerModal(false);
                    await handleOpenProjectPath(file);
                  }}
                  className="w-full text-start px-4 py-3 text-xs text-m3-on-surface hover:bg-m3-surface-variant/40 font-semibold cursor-pointer truncate transition-colors"
                  title={file}
                >
                  {file}
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPickerModal(false)}
                className="relative overflow-hidden px-6 py-2.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 font-bold rounded-full text-xs transition-colors cursor-pointer font-cairo"
              >
                <span>{t("cancel")}</span>
                <md-ripple></md-ripple>
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Updater Modal */}
        {updateInfo && updateInfo.available && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-m3-surface border border-m3-outline-variant max-w-sm w-full rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col gap-4 text-m3-on-surface">
              <div>
                <h3 className="text-sm font-bold font-cairo flex items-center gap-2">
                  🚀 {language === 'ar' ? 'تحديث جديد متوفر' : 'Update Available'}
                </h3>
                <p className="text-[10px] text-m3-on-surface-variant mt-1 font-cairo">
                  {language === 'ar' 
                    ? `إصدار جديد متوفر للتطبيق: v${updateInfo.version}`
                    : `A new version of Crysta is available: v${updateInfo.version}`}
                </p>
              </div>

              {updateInfo.body && (
                <div className="bg-m3-surface-variant/40 rounded-xl p-3 text-[10px] font-mono max-h-32 overflow-y-auto border border-m3-outline-variant/30 select-text">
                  {updateInfo.body}
                </div>
              )}

              {updateInfo.error && (
                <div className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded-lg font-mono">
                  {updateInfo.error}
                </div>
              )}

              {updateInfo.downloading ? (
                <div className="flex flex-col gap-2 mt-2 font-cairo">
                  <div className="flex justify-between text-[10px] text-m3-on-surface-variant select-none">
                    <span>{language === 'ar' ? 'جاري التحميل والتثبيت...' : 'Downloading & installing...'}</span>
                    <span>{updateInfo.progress}%</span>
                  </div>
                  <div className="w-full bg-m3-surface-variant rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-m3-primary h-full transition-all duration-300 rounded-full" 
                      style={{ width: `${updateInfo.progress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 justify-end mt-4 select-none font-cairo items-center">
                  <button
                    onClick={() => setUpdateInfo(null)}
                    className="relative overflow-hidden px-4 py-2 text-xs font-bold text-m3-on-surface-variant hover:bg-m3-surface-variant/40 rounded-full transition-colors cursor-pointer"
                  >
                    {language === 'ar' ? 'تخطي' : 'Remind Me Later'}
                    <md-ripple></md-ripple>
                  </button>
                  <button
                    onClick={handlePerformUpdate}
                    className="relative overflow-hidden px-6 py-2.5 bg-m3-primary hover:opacity-90 text-m3-on-primary font-bold rounded-full text-xs transition-colors cursor-pointer font-cairo shadow-sm"
                  >
                    <span>{language === 'ar' ? 'تحديث وإعادة تشغيل' : 'Update & Restart'}</span>
                    <md-ripple></md-ripple>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}

export default App;
