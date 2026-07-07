import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { ThemeToggle } from "./components/ThemeToggle";
import { useLanguage } from "./LanguageContext";
import { 
  Novel, 
  StepProgress, 
  getStepsProgress,
  selectProjectFile,
  createProjectFile,
  openProject,
  closeProject
} from "./lib";
import { BookOpen, Plus } from "lucide-react";

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
      }
    } catch (err: any) {
      console.error("File open error", err);
      alert(`${t("error")}: ${err}`);
    }
  };

  const handleCreateFileDialog = async () => {
    try {
      const path = await createProjectFile(t("newNovelFilename"));
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
    <div className="flex h-screen bg-m3-background text-m3-on-surface overflow-hidden font-cairo select-none">
      {/* Sidebar (Navigation) */}
      <Sidebar
        novel={activeNovel}
        activeProjectPath={activeProjectPath}
        onCloseProject={handleCloseProject}
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        stepsProgress={stepsProgress}
      />

      {/* Main workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar with Toggle / Logo (M3 Top App Bar: subtle elevation / outline variant) */}
        <header className="h-16 border-b border-m3-outline-variant bg-m3-background px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span 
              onClick={handleCloseProject}
              className="font-bold text-base tracking-wide text-m3-on-surface cursor-pointer hover:opacity-80 transition-opacity font-cairo"
            >
              {t("appName")}
            </span>
            {activeNovelId !== null && (
              <button
                onClick={handleCloseProject}
                className="text-[10px] px-3 py-1 border border-m3-outline-variant hover:bg-m3-surface-variant/40 text-m3-on-surface-variant rounded-full transition-colors cursor-pointer font-cairo font-semibold"
              >
                {t("projectsBtn")}
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
              className="text-xs px-4 py-1.5 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 transition-colors font-bold rounded-full cursor-pointer font-cairo"
            >
              {t("helpGuideBtn")}
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
            <div className="max-w-4xl mx-auto p-8 space-y-8 fade-in font-cairo select-text">
              {/* Header */}
              <div className="border-b border-m3-outline-variant pb-6 flex justify-between items-center">
                <div className="min-w-0 pr-4">
                  <h1 className="text-2xl font-black text-m3-on-surface font-cairo">{t("appName")}</h1>
                  <p className="text-m3-on-surface-variant text-xs mt-1 font-cairo font-medium truncate" title={t("appTagline")}>{t("appTagline")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleOpenFileDialog}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 border border-m3-outline text-m3-primary hover:bg-m3-primary/10 font-bold rounded-full cursor-pointer transition-colors font-cairo whitespace-nowrap shrink-0"
                  >
                    <span className="whitespace-nowrap shrink-0">{t("openProjectBtn")}</span>
                  </button>
                  <button
                    onClick={handleCreateFileDialog}
                    className="flex items-center gap-1.5 text-xs px-5 py-2 bg-m3-primary hover:opacity-90 text-m3-on-primary font-bold rounded-full cursor-pointer transition-all font-cairo shadow-sm whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap shrink-0">{t("createProjectBtn")}</span>
                  </button>
                </div>
              </div>

              {/* Recent Projects List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface-variant">{t("recentProjectsTitle")}</h3>
                {recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-m3-outline-variant rounded-2xl bg-m3-surface/50">
                    <BookOpen className="w-10 h-10 text-m3-on-surface-variant/40 stroke-[1.2]" />
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
                        className="bg-m3-surface p-4 border border-m3-outline-variant hover:border-m3-primary rounded-2xl cursor-pointer transition-all flex justify-between items-center group relative select-text"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors font-cairo">
                            {project.title}
                          </h4>
                          <p className="text-[10px] text-m3-on-surface-variant font-mono truncate max-w-lg select-all" dir="ltr" title={project.path}>
                            {project.path}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-m3-on-surface-variant font-semibold">
                            {t("openedLabel")} {new Date(project.lastOpened).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentProject(project.path);
                            }}
                            className="p-1.5 text-m3-on-surface-variant hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                            title={t("removeFromList")}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
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
                className="text-m3-on-surface-variant hover:text-m3-on-surface text-xs font-semibold cursor-pointer"
              >
                {t("close")}
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
                className="px-5 py-2 bg-m3-primary hover:opacity-90 text-m3-on-primary font-bold rounded-full text-xs transition-colors cursor-pointer font-cairo shadow-sm"
              >
                {t("helpModalCloseBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
