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
    <div className="flex h-screen bg-[#fcfbfa] text-[#1c1917] dark:bg-[#121212] dark:text-[#e7e5e4] overflow-hidden font-cairo select-none">
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
        {/* Top bar with Toggle / Logo */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181818] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span 
              onClick={handleCloseProject}
              className="font-bold text-sm tracking-wide text-zinc-900 dark:text-zinc-50 cursor-pointer hover:opacity-85 transition-opacity font-cairo"
            >
              {t("appName")}
            </span>
            {activeNovelId !== null && (
              <button
                onClick={handleCloseProject}
                className="text-[10px] px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded transition-colors cursor-pointer"
              >
                {t("projectsBtn")}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {errorMessage && (
              <span className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded">
                {t("error")}: {errorMessage}
              </span>
            )}
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-xs px-2.5 py-1.5 border border-zinc-350 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              {t("helpGuideBtn")}
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-[#0c0c0c]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
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
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-cairo">{t("appName")}</h1>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1 font-cairo">{t("appTagline")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenFileDialog}
                    className="flex items-center gap-1.5 text-xs px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-[#252525] text-zinc-700 dark:text-zinc-300 font-semibold rounded cursor-pointer transition-colors"
                  >
                    <span>{t("openProjectBtn")}</span>
                  </button>
                  <button
                    onClick={handleCreateFileDialog}
                    className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold rounded cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("createProjectBtn")}</span>
                  </button>
                </div>
              </div>

              {/* Recent Projects List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t("recentProjectsTitle")}</h3>
                {recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-[#181818]">
                    <BookOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-700 stroke-[1.2]" />
                    <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-cairo">{t("noRecentProjectsTitle")}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-cairo font-semibold">
                      {t("noRecentProjectsDesc")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {recentProjects.map((project) => (
                      <div 
                        key={project.path}
                        onClick={() => handleOpenProjectPath(project.path)}
                        className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 rounded cursor-pointer transition-all flex justify-between items-center group relative select-text"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 group-hover:text-zinc-650 dark:group-hover:text-white transition-colors font-cairo">
                            {project.title}
                          </h4>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate max-w-lg select-all" dir="ltr" title={project.path}>
                            {project.path}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-zinc-400">
                            {t("openedLabel")} {new Date(project.lastOpened).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentProject(project.path);
                            }}
                            className="p-1.5 text-zinc-300 hover:text-rose-500 dark:text-zinc-700 dark:hover:text-rose-450 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
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

      {/* Help Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 font-cairo select-text"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#181818] border border-zinc-250 dark:border-zinc-800 rounded max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{t("helpModalTitle")}</h2>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-zinc-400 hover:text-zinc-750 dark:hover:text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                {t("close")}
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 text-start">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t("helpModalDesc")}</p>
              
              <div className="space-y-3 pt-2">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep1Title")}</h4>
                  <p>{t("helpStep1Desc")}</p>
                </div>
                
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep2Title")}</h4>
                  <p>{t("helpStep2Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep3Title")}</h4>
                  <p>{t("helpStep3Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep4Title")}</h4>
                  <p>{t("helpStep4Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep5Title")}</h4>
                  <p>{t("helpStep5Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep6Title")}</h4>
                  <p>{t("helpStep6Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep7Title")}</h4>
                  <p>{t("helpStep7Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep8Title")}</h4>
                  <p>{t("helpStep8Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep9Title")}</h4>
                  <p>{t("helpStep9Desc")}</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{t("helpStep10Title")}</h4>
                  <p>{t("helpStep10Desc")}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold rounded text-xs transition-colors cursor-pointer"
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
