import { useEffect, useState, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { ThemeToggle } from "./components/ThemeToggle";
import { useLanguage } from "./LanguageContext";
import { SnapshotsModal } from "./components/workspace/SnapshotsModal";
import { CommandPaletteDialog } from "./components/workspace/CommandPaletteDialog";
import { HelpDialog, ProjectPickerDialog, UpdateDialog, UpdateState } from "./components/AppDialogs";
import { errorMessage, useToast } from "./components/Toast";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch, exit } from "@tauri-apps/plugin-process";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  SlidersHorizontal,
  AlertTriangle
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
import { flushAllAutosaves } from "./utils/autosave";
import { isMobileDevice, isTauri } from "./utils/platform";
import { isAnyDialogOpen } from "./hooks/useModal";
import { sendWriteCommand } from "./utils/writeCommands";

interface RecentProject {
  path: string;
  title: string;
  lastOpened: string;
  /** Set when the file couldn't be found the last time it was opened. */
  missing?: boolean;
}

const RECENT_KEY = "recent_projects";

function loadRecentProjects(): RecentProject[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeRecentProjects(projects: RecentProject[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(projects));
  } catch {
    // The list just isn't remembered.
  }
}

function isMissingFileError(err: unknown): boolean {
  return /not found|no such file|cannot find/i.test(String(err));
}

function App() {
  const { language, t } = useLanguage();
  const { notify } = useToast();
  const [activeNovel, setActiveNovel] = useState<Novel | null>(null);
  const [activeProjectPath, setActiveProjectPath] = useState<string | null>(null);
  // Changes on every (re)open so the workspace remounts with fresh data,
  // e.g. after restoring a snapshot of the same project.
  const [sessionKey, setSessionKey] = useState(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [stepsProgress, setStepsProgress] = useState<StepProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [mobileProjects, setMobileProjects] = useState<string[]>([]);
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(loadRecentProjects);

  const [updateInfo, setUpdateInfo] = useState<UpdateState | null>(null);
  const pendingUpdate = useRef<Update | null>(null);

  const reportError = useCallback((prefix: string, err: unknown) => {
    console.error(prefix, err);
    notify(`${prefix}: ${errorMessage(err)}`);
  }, [notify]);

  // Ctrl+K opens the command palette.
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

  // Write pending autosaves before the window closes.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onCloseRequested(async () => {
        await flushAllAutosaves();
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => console.warn("Close handler unavailable:", err));
    return () => unlisten?.();
  }, []);

  const updateRecentProjects = (update: (prev: RecentProject[]) => RecentProject[]) => {
    setRecentProjects((prev) => {
      const next = update(prev);
      storeRecentProjects(next);
      return next;
    });
  };

  const addRecentProject = (path: string, title: string) => {
    updateRecentProjects((prev) =>
      [{ path, title, lastOpened: new Date().toISOString() }, ...prev.filter((p) => p.path !== path)].slice(0, 10)
    );
  };

  const removeRecentProject = (path: string) => {
    updateRecentProjects((prev) => prev.filter((p) => p.path !== path));
  };

  const markRecentProjectMissing = (path: string) => {
    updateRecentProjects((prev) => prev.map((p) => (p.path === path ? { ...p, missing: true } : p)));
  };

  const handleOpenProjectPath = async (path: string, create = false) => {
    setLoading(true);
    try {
      // Anything still pending belongs to the project that is open now.
      await flushAllAutosaves();
      const novel = await openProject(path, create);
      const progress = novel.id ? await getStepsProgress(novel.id) : [];
      setActiveNovel(novel);
      setStepsProgress(progress);
      setActiveProjectPath(path);
      setActiveStep(0);
      setSessionKey((key) => key + 1);
      addRecentProject(path, novel.title);

      // Automatic snapshot on open (old automatic snapshots are pruned).
      takeSnapshot(undefined, false).catch((e) => {
        console.warn("Auto-snapshot on open failed:", e);
      });
    } catch (err) {
      if (isMissingFileError(err)) {
        markRecentProjectMissing(path);
        notify(`${t('projectMissing')}: ${t('projectMissingHint')}`);
      } else {
        reportError(t("failedToOpenProject"), err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFileDialog = async () => {
    try {
      const path = await selectProjectFile();
      if (path) {
        await handleOpenProjectPath(path);
        return;
      }
      if (isMobileDevice()) {
        const files = await listProjectFiles();
        if (files.length > 0) {
          setMobileProjects(files);
          setShowPickerModal(true);
        } else {
          notify(t('noLocalProjects'), 'info');
        }
      }
    } catch (err) {
      reportError(t("error"), err);
    }
  };

  const handleCreateFileDialog = async () => {
    try {
      let filename = t("newNovelFilename");

      if (isMobileDevice()) {
        const name = prompt(t('enterProjectName'), t('defaultProjectName'));
        if (name === null) return;
        const cleanedName = name.trim().replace(/[/\\?%*:|"<>\s]/g, '_');
        if (!cleanedName) return;
        filename = `${cleanedName}.crysta`;
      }

      const path = await createProjectFile(filename);
      if (path) {
        await handleOpenProjectPath(path, true);
      }
    } catch (err) {
      reportError(t("error"), err);
    }
  };

  const handleCloseProject = async () => {
    try {
      // Save pending edits while the project is still open.
      await flushAllAutosaves();
      await closeProject();
    } catch (err) {
      reportError(t("error"), err);
    } finally {
      setActiveNovel(null);
      setActiveProjectPath(null);
      setStepsProgress([]);
      setActiveStep(0);
    }
  };

  const handleUpdateNovelLocally = (updated: Novel) => {
    setActiveNovel(updated);
    if (activeProjectPath) addRecentProject(activeProjectPath, updated.title);
  };

  const handleStepSaved = useCallback((progress: StepProgress) => {
    setStepsProgress((prev) => {
      const others = prev.filter((p) => p.step_number !== progress.step_number);
      return [...others, progress];
    });
  }, []);

  const handleTakeSnapshot = async () => {
    try {
      await flushAllAutosaves();
      await takeSnapshot(undefined, true);
      notify(t('snapshotCreatedSuccess'), 'success');
    } catch (err) {
      reportError(t("error"), err);
    }
  };

  // Android back button: close the top dialog, then the sidebar, then go
  // back to the dashboard, then close the project, then exit.
  const navStateRef = useRef({ isSidebarOpen, activeNovel, activeStep });
  useEffect(() => {
    navStateRef.current = { isSidebarOpen, activeNovel, activeStep };
  }, [isSidebarOpen, activeNovel, activeStep]);

  useEffect(() => {
    let listener: { unregister: () => Promise<void> } | null = null;

    onBackButtonPress(() => {
      const { isSidebarOpen: sidebarOpen, activeNovel: novel, activeStep: step } = navStateRef.current;
      if (isAnyDialogOpen()) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      } else if (sidebarOpen) {
        setIsSidebarOpen(false);
      } else if (novel !== null) {
        if (step > 0) {
          setActiveStep(0);
        } else {
          handleCloseProject();
        }
      } else {
        exit(0).catch((err) => console.error("Failed to exit app:", err));
      }
    })
      .then((l) => {
        listener = l;
      })
      .catch((err) => console.warn("Back button listener unavailable:", err));

    return () => {
      listener?.unregister().catch((err) => console.error("Failed to unregister back button listener:", err));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for updates shortly after startup.
  useEffect(() => {
    if (!isTauri() || isMobileDevice()) return;
    const timer = setTimeout(async () => {
      try {
        const update = await check();
        if (update) {
          pendingUpdate.current = update;
          setUpdateInfo({ version: update.version, body: update.body || '', downloading: false, progress: 0, error: null });
        }
      } catch (err) {
        console.warn("Failed checking for updates:", err);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handlePerformUpdate = async () => {
    const update = pendingUpdate.current;
    if (!update) return;
    setUpdateInfo((prev) => (prev ? { ...prev, downloading: true, progress: 0, error: null } : null));
    try {
      await flushAllAutosaves();
      let downloaded = 0;
      let contentLength = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          const pct = contentLength ? Math.round((downloaded / contentLength) * 100) : 0;
          setUpdateInfo((prev) => (prev ? { ...prev, progress: pct } : null));
        }
      });
      await relaunch();
    } catch (err) {
      console.error("Update failed:", err);
      setUpdateInfo((prev) => (prev ? { ...prev, downloading: false, error: errorMessage(err) } : null));
    }
  };

  const goToStep = (step: number) => {
    setActiveStep(step);
    setIsSidebarOpen(false);
  };

  const headerButtonClass =
    "h-8 inline-flex items-center gap-1.5 text-xs px-2.5 sm:px-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all font-heading font-black cursor-pointer shrink-0 box-border";

  return (
    <div className="flex h-screen app-container bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden select-none">
      <Sidebar
        novel={activeNovel}
        activeProjectPath={activeProjectPath}
        onCloseProject={handleCloseProject}
        activeStep={activeStep}
        onSelectStep={goToStep}
        stepsProgress={stepsProgress}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 border-b-3 border-[var(--border-ink)] bg-[var(--bg-surface)] px-3 sm:px-6 flex items-center justify-between shrink-0 z-10 min-w-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden h-8 w-8 text-[var(--text-primary)] border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--pastel-yellow)] hover:text-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0 box-border"
              title={t("openSidebar")}
              aria-label={t("openSidebar")}
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 select-none shrink-0">
              <span className="h-8 w-8 bg-[var(--pastel-yellow)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] flex items-center justify-center shrink-0 box-border" aria-hidden="true">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
                {t("appName")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ms-auto">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className={headerButtonClass}
              title={`${t('commandPaletteTitle')} (Ctrl+K)`}
              aria-label={t('commandPaletteTitle')}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px]">Ctrl+K</span>
            </button>
            <button onClick={() => setShowHelpModal(true)} className={`${headerButtonClass} whitespace-nowrap`} aria-label={t("helpGuideBtn")}>
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t("helpGuideBtn")}</span>
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-[var(--bg-canvas)] flex flex-col min-h-0 nb-dots">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-xs font-heading font-bold text-[var(--text-secondary)]" role="status">
              <div className="p-3 bg-[var(--pastel-yellow)] text-black border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)]">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <p>{t("loadingProjectFile")}</p>
            </div>
          ) : activeNovel ? (
            <Workspace
              key={sessionKey}
              activeNovel={activeNovel}
              onUpdateNovel={handleUpdateNovelLocally}
              stepsProgress={stepsProgress}
              onStepSaved={handleStepSaved}
              activeStep={activeStep}
            />
          ) : (
            <div className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto p-6 sm:p-8 space-y-8 select-text">
              <div className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-4xl font-display font-black text-[var(--text-primary)] leading-tight">
                    {t("appName")}
                  </h1>
                  <p className="text-xs sm:text-sm font-body font-medium text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    {t("appTagline")}
                  </p>
                </div>

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

              <section className="space-y-4" aria-labelledby="recent-projects-title">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-subtle)] pb-2">
                  <h2 id="recent-projects-title" className="text-xs font-heading font-black uppercase tracking-wider text-[var(--text-secondary)]">
                    {t("recentProjectsTitle")}
                  </h2>
                  <span className="font-mono text-[11px] font-bold text-[var(--text-muted)]">
                    {t('projectsCount', { count: String(recentProjects.length) })}
                  </span>
                </div>

                {recentProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 border-3 border-dashed border-[var(--border-ink)] bg-[var(--bg-surface)] p-6">
                    <div className="p-3 bg-[var(--pastel-sky)] text-black border-2 border-[var(--border-ink)] shadow-[3px_3px_0px_var(--shadow-ink)]">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">
                      {t("noRecentProjectsTitle")}
                    </h3>
                    <p className="text-xs font-body text-[var(--text-secondary)] max-w-sm leading-relaxed">
                      {t("noRecentProjectsDesc")}
                    </p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 gap-3.5">
                    {recentProjects.map((project) => (
                      <li
                        key={project.path}
                        className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[4px_4px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_var(--shadow-ink)] transition-all flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 group"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenProjectPath(project.path)}
                          className="space-y-1.5 min-w-0 flex-1 text-start p-4 sm:p-5 sm:pe-0 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span className="p-1 bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] shrink-0">
                              <FileCode className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-sm font-heading font-black text-[var(--text-primary)] truncate">
                              {project.title}
                            </span>
                            {project.missing && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-heading font-black bg-[var(--pastel-coral)] text-black border border-[var(--border-ink)] shrink-0" title={t('projectMissingHint')}>
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                {t('projectMissing')}
                              </span>
                            )}
                          </span>
                          <span className="block text-[10px] text-[var(--text-muted)] font-mono truncate w-full" dir="ltr" title={project.path}>
                            {project.path}
                          </span>
                        </button>

                        <div className="flex items-center gap-3 shrink-0 sm:self-center self-end px-4 pb-4 sm:p-0 sm:pe-5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] border border-[var(--border-ink)] px-2 py-1">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            <span>{new Date(project.lastOpened).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </span>
                          <button
                            onClick={() => removeRecentProject(project.path)}
                            className="p-1.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center"
                            title={t("removeFromList")}
                            aria-label={`${t("removeFromList")}: ${project.title}`}
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

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

      <CommandPaletteDialog
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        hasProject={activeNovel !== null}
        onSelectStep={goToStep}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
        onTakeSnapshot={handleTakeSnapshot}
        onToggleZenMode={() => {
          goToStep(11);
          sendWriteCommand('toggle-zen');
        }}
        onToggleReferenceDrawer={() => {
          goToStep(11);
          sendWriteCommand('toggle-reference');
        }}
        onOpenProject={handleOpenFileDialog}
        onCreateProject={handleCreateFileDialog}
      />

      {showHelpModal && <HelpDialog onClose={() => setShowHelpModal(false)} />}

      {showPickerModal && (
        <ProjectPickerDialog
          files={mobileProjects}
          onClose={() => setShowPickerModal(false)}
          onPick={(file) => {
            setShowPickerModal(false);
            handleOpenProjectPath(file);
          }}
        />
      )}

      {updateInfo && (
        <UpdateDialog
          update={updateInfo}
          onInstall={handlePerformUpdate}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}
    </div>
  );
}

export default App;
