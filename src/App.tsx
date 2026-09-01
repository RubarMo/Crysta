import { useEffect, useState, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { ThemeToggle } from "./components/ThemeToggle";
import { useLanguage } from "./LanguageContext";
import { SnapshotsModal } from "./components/workspace/SnapshotsModal";
import { CommandPaletteDialog } from "./components/workspace/CommandPaletteDialog";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch, exit } from "@tauri-apps/plugin-process";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { 
  Menu, 
  Sparkles, 
  FolderOpen, 
  Plus, 
  HelpCircle, 
  X, 
  BookOpen, 
  RefreshCw, 
  FileCode,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import { 
  Novel, 
  StepProgress, 
  getStepsProgress,
  selectProjectFile,
  createProjectFile,
  listProjectFiles,
  openProject,
  closeProject,
  takeSnapshot
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

  // New Modals: Snapshots and Command Palette
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean;
    version: string;
    body: string;
    downloading: boolean;
    progress: number;
    error: string | null;
  } | null>(null);

  // Global Keyboard Shortcuts (Ctrl+K for Command Palette)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Back button navigation state ref
  const navStateRef = useRef({
    showHelpModal,
    showPickerModal,
    isSidebarOpen,
    isSnapshotsOpen,
    isCommandPaletteOpen,
    activeNovelId,
    activeStep,
  });

  // Sync ref with state updates
  useEffect(() => {
    navStateRef.current = {
      showHelpModal,
      showPickerModal,
      isSidebarOpen,
      isSnapshotsOpen,
      isCommandPaletteOpen,
      activeNovelId,
      activeStep,
    };
  }, [showHelpModal, showPickerModal, isSidebarOpen, isSnapshotsOpen, isCommandPaletteOpen, activeNovelId, activeStep]);

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
            isSnapshotsOpen: snapshotsOpen,
            isCommandPaletteOpen: cmdOpen,
            activeNovelId: novelId,
            activeStep: step,
          } = navStateRef.current;

          if (cmdOpen) {
            setIsCommandPaletteOpen(false);
          } else if (snapshotsOpen) {
            setIsSnapshotsOpen(false);
          } else if (helpOpen) {
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

      // Trigger automatic snapshot in background (smart backup)
      takeSnapshot(undefined, false).catch((e) => {
        console.warn("Auto-snapshot on session open skipped/failed:", e);
      });
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
    <div className="flex h-screen app-container bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <Sidebar
        novel={activeNovel}
        activeProjectPath={activeProjectPath}
        onCloseProject={handleCloseProject}
        activeStep={activeStep}
        onSelectStep={(step) => {
          setActiveStep(step);
          setIsSidebarOpen(false);
        }}
        stepsProgress={stepsProgress}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
      />

      {/* Backdrop Dimming on Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header App Bar */}
        <header className="h-16 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface)] px-3 sm:px-6 flex items-center justify-between shrink-0 z-10 min-w-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden h-8 w-8 text-[var(--text-primary)] border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0 box-border"
              title={t("openSidebar")}
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Brand Title */}
            <div className="flex items-center gap-2 select-none shrink-0">
              <span className="h-8 w-8 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] flex items-center justify-center shrink-0 box-border">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
                {t("appName")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ms-auto">
            {/* Quick Command Palette Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="h-8 inline-flex items-center gap-1.5 text-xs px-2.5 sm:px-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all font-heading font-black cursor-pointer shrink-0 box-border"
              title="Command Palette (Ctrl+K)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px]">Ctrl+K</span>
            </button>

            {errorMessage && (
              <span className="h-8 inline-flex items-center text-[11px] font-bold text-black bg-[var(--pastel-coral)] border-2 border-[var(--border-ink)] px-2.5 shadow-[2px_2px_0px_var(--shadow-ink)] truncate max-w-[160px] shrink-0 box-border">
                {errorMessage}
              </span>
            )}
            <button
              onClick={() => setShowHelpModal(true)}
              className="h-8 inline-flex items-center gap-1.5 text-xs px-2.5 sm:px-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all font-heading font-black cursor-pointer whitespace-nowrap shrink-0 box-border"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t("helpGuideBtn")}</span>
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Workspace or Projects Launcher */}
        <main className="flex-1 overflow-hidden bg-[var(--bg-canvas)] flex flex-col min-h-0 nb-dots">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-xs font-heading font-bold text-[var(--text-secondary)]">
              <div className="p-3 bg-[var(--pastel-yellow)] text-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] animate-bounce">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <p>{t("loadingProjectFile")}</p>
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
            <div className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto p-6 sm:p-8 space-y-8 select-text">
              {/* Hero Banner */}
              <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-4xl font-display font-black text-[var(--text-primary)] leading-tight">
                    {t("appName")}
                  </h1>
                  <p className="text-xs sm:text-sm font-body font-medium text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    {t("appTagline")}
                  </p>
                </div>
                
                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={handleOpenFileDialog}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-heading font-black border-3 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[4px_4px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_var(--shadow-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer select-none"
                  >
                    <FolderOpen className="w-4 h-4 stroke-[2.5]" />
                    <span>{t("openProjectBtn")}</span>
                  </button>
                  <button
                    onClick={handleCreateFileDialog}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-heading font-black border-3 border-[var(--border-ink)] bg-[var(--accent)] text-black shadow-[4px_4px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_var(--shadow-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer select-none"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{t("createProjectBtn")}</span>
                  </button>
                </div>
              </div>

              {/* Recent Projects List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-subtle)] pb-2">
                  <h3 className="text-xs font-heading font-black uppercase tracking-wider text-[var(--text-secondary)]">
                    {t("recentProjectsTitle")}
                  </h3>
                  <span className="font-mono text-[11px] font-bold text-[var(--text-muted)]">
                    {recentProjects.length} {language === 'ar' ? 'مشاريع' : 'projects'}
                  </span>
                </div>

                {recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 border-3 border-dashed border-[var(--border-ink)] bg-[var(--bg-surface)] p-6">
                    <div className="p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)]">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h2 className="text-sm font-heading font-black text-[var(--text-primary)]">
                      {t("noRecentProjectsTitle")}
                    </h2>
                    <p className="text-xs font-body text-[var(--text-secondary)] max-w-sm leading-relaxed">
                      {t("noRecentProjectsDesc")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {recentProjects.map((project) => (
                      <div 
                        key={project.path}
                        onClick={() => handleOpenProjectPath(project.path)}
                        className="bg-[var(--bg-surface)] p-4 sm:p-5 border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_var(--shadow-ink)] cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 select-text group"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1 pe-4 text-start">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] shrink-0">
                              <FileCode className="w-3.5 h-3.5" />
                            </span>
                            <h4 className="text-sm font-heading font-black text-[var(--text-primary)] group-hover:text-[var(--pastel-yellow)] transition-colors truncate">
                              {project.title}
                            </h4>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono truncate w-full select-all" dir="ltr" title={project.path}>
                            {project.path}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0 sm:self-center self-end">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] border border-[var(--border-ink)] px-2 py-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(project.lastOpened).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentProject(project.path);
                            }}
                            className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center"
                            title={t("removeFromList")}
                            aria-label="Remove recent project"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
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

      {/* Snapshots & Backups Modal */}
      {isSnapshotsOpen && (
        <SnapshotsModal
          onClose={() => setIsSnapshotsOpen(false)}
          onRestored={() => {
            if (activeProjectPath) {
              handleOpenProjectPath(activeProjectPath);
            }
          }}
        />
      )}

      {/* Command Palette Dialog (Ctrl+K) */}
      <CommandPaletteDialog
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectStep={(step) => {
          setActiveStep(step);
          setIsSidebarOpen(false);
        }}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
      />

      {/* Help Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-text"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-[var(--bg-surface)] border-4 border-[var(--border-ink)] shadow-[12px_12px_0px_var(--shadow-ink)] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b-3 border-[var(--border-ink)] pb-3 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)]">
                  <HelpCircle className="w-4 h-4 stroke-[2.5]" />
                </span>
                <h2 className="text-base sm:text-lg font-heading font-black text-[var(--text-primary)]">
                  {t("helpModalTitle")}
                </h2>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center"
                title={t("close")}
                aria-label="Close dialog"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs font-body leading-relaxed text-[var(--text-secondary)] text-start">
              <div className="p-3 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] font-bold">
                {t("helpModalDesc")}
              </div>
              
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const titleKey = `helpStep${num}Title` as any;
                  const descKey = `helpStep${num}Desc` as any;
                  return (
                    <div key={num} className="p-3.5 bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 font-mono text-[10px] font-black bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] flex items-center justify-center shrink-0">
                          {num}
                        </span>
                        <h4 className="font-heading font-black text-[var(--text-primary)] text-xs">
                          {t(titleKey)}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed ps-7">
                        {t(descKey)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t-3 border-[var(--border-ink)] pt-4">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2.5 bg-[var(--accent)] text-black font-heading font-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs transition-all cursor-pointer"
              >
                {t("helpModalCloseBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Picker Modal for Mobile */}
      {showPickerModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowPickerModal(false)}
        >
          <div 
            className="bg-[var(--bg-surface)] border-4 border-[var(--border-ink)] shadow-[12px_12px_0px_var(--shadow-ink)] w-full max-w-sm p-6 space-y-4 text-start"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-2 border-[var(--border-subtle)] pb-2">
              <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">
                {language === 'ar' ? 'اختر ملف المشروع' : 'Select Project File'}
              </h3>
              <p className="text-[10px] font-body text-[var(--text-muted)] mt-0.5">
                {language === 'ar' ? 'اختر أحد الملفات المخزنة محلياً لفتحه:' : 'Select a locally stored file to open:'}
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y-2 divide-[var(--border-subtle)] border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)]">
              {mobileProjects.map((file) => (
                <button
                  key={file}
                  onClick={async () => {
                    setShowPickerModal(false);
                    await handleOpenProjectPath(file);
                  }}
                  className="w-full text-start px-3.5 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] hover:bg-[var(--pastel-yellow)] hover:text-black cursor-pointer truncate transition-colors"
                  title={file}
                >
                  {file}
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPickerModal(false)}
                className="px-5 py-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-heading font-bold shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updater Modal */}
      {updateInfo && updateInfo.available && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border-4 border-[var(--border-ink)] shadow-[12px_12px_0px_var(--shadow-ink)] max-w-sm w-full p-6 flex flex-col gap-4 text-[var(--text-primary)]">
            <div className="border-b-2 border-[var(--border-subtle)] pb-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--pastel-mint)] text-black border border-[var(--border-ink)] font-heading font-black text-[10px] uppercase mb-1">
                🚀 {language === 'ar' ? 'تحديث متوفر' : 'Update Available'}
              </div>
              <h3 className="text-sm font-heading font-black text-[var(--text-primary)] mt-1">
                {language === 'ar' 
                  ? `إصدار جديد للتطبيق: v${updateInfo.version}`
                  : `New Crysta release: v${updateInfo.version}`}
              </h3>
            </div>

            {updateInfo.body && (
              <div className="bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] p-3 text-[10px] font-mono max-h-32 overflow-y-auto select-text">
                {updateInfo.body}
              </div>
            )}

            {updateInfo.error && (
              <div className="text-[10px] text-black bg-[var(--pastel-coral)] border-2 border-[var(--border-ink)] p-2 font-mono font-bold">
                {updateInfo.error}
              </div>
            )}

            {updateInfo.downloading ? (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between text-[10px] font-mono font-bold text-[var(--text-secondary)] select-none">
                  <span>{language === 'ar' ? 'جاري التحميل والتثبيت...' : 'Downloading & installing...'}</span>
                  <span>{updateInfo.progress}%</span>
                </div>
                <div className="w-full bg-[var(--bg-surface-raised)] border-2 border-[var(--border-ink)] h-3 overflow-hidden">
                  <div 
                    className="bg-[var(--pastel-mint)] h-full transition-all duration-300 border-e-2 border-[var(--border-ink)]" 
                    style={{ width: `${updateInfo.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5 justify-end mt-2 select-none items-center">
                <button
                  onClick={() => setUpdateInfo(null)}
                  className="px-3.5 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                >
                  {language === 'ar' ? 'تخطي' : 'Remind Me Later'}
                </button>
                <button
                  onClick={handlePerformUpdate}
                  className="px-4 py-1.5 bg-[var(--pastel-yellow)] text-black font-heading font-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)] hover:bg-[var(--accent-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs transition-all cursor-pointer"
                >
                  {language === 'ar' ? 'تحديث وإعادة تشغيل' : 'Update & Restart'}
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
