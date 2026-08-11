import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';

import '../../locales.dart';
import '../../models.dart';
import '../../db_service.dart';
import '../../repositories/novel_repository.dart';
import '../../repositories/step_repository.dart';
import '../../repositories/character_repository.dart';
import '../../repositories/scene_repository.dart';
import '../../repositories/chapter_repository.dart';
import '../../services/backup_service.dart';
import '../../widgets/command_palette_dialog.dart';
import '../../widgets/theme_settings_dialog.dart';

import 'tabs/dashboard_tab.dart';
import 'tabs/step_editor_tab.dart';
import 'tabs/character_bios_tab.dart';
import 'tabs/scene_matrix_tab.dart';
import 'tabs/export_tab.dart';
import 'tabs/write_novel_tab.dart';
import 'zen_mode_view.dart';

enum SaveStatus { idle, saving, saved, error }

class WorkspacePage extends StatefulWidget {
  final Novel novel;
  final String projectPath;
  final String language;
  final VoidCallback onClose;
  final void Function(ThemeMode, Color, bool) onThemeSettingsChanged;
  final ThemeMode currentThemeMode;
  final Color currentSeedColor;
  final bool useDynamicColor;
  final VoidCallback onLanguageToggle;

  const WorkspacePage({
    super.key,
    required this.novel,
    required this.projectPath,
    required this.language,
    required this.onClose,
    required this.onThemeSettingsChanged,
    required this.currentThemeMode,
    required this.currentSeedColor,
    required this.useDynamicColor,
    required this.onLanguageToggle,
  });

  @override
  State<WorkspacePage> createState() => _WorkspacePageState();
}

class _WorkspacePageState extends State<WorkspacePage> {
  int _selectedTabIndex = 0;
  late Novel _activeNovel;

  // Domain Repositories
  final NovelRepository _novelRepo = DatabaseService.novelRepository;
  final StepRepository _stepRepo = DatabaseService.stepRepository;
  final CharacterRepository _characterRepo = DatabaseService.characterRepository;
  final SceneRepository _sceneRepo = DatabaseService.sceneRepository;
  final ChapterRepository _chapterRepo = DatabaseService.chapterRepository;

  // Interactive Resizable Panes State
  double _sidebarWidth = 260.0;
  double _listPaneWidth = 300.0;

  // Auto-Save State
  Timer? _autoSaveDebounceTimer;
  SaveStatus _saveStatus = SaveStatus.idle;

  // Dedicated controllers for every single step and view
  final TextEditingController _step1Ctrl = TextEditingController();
  final TextEditingController _step2Ctrl = TextEditingController();
  final TextEditingController _step3SummaryCtrl = TextEditingController();
  final TextEditingController _step4Ctrl = TextEditingController();
  final TextEditingController _step5SynopsisCtrl = TextEditingController();
  final TextEditingController _step6Ctrl = TextEditingController();
  final TextEditingController _step7ChartCtrl = TextEditingController();
  final TextEditingController _step8SceneCtrl = TextEditingController();
  final TextEditingController _step9SceneCtrl = TextEditingController();
  final TextEditingController _chapterCtrl = TextEditingController();
  final TextEditingController _chapterTitleCtrl = TextEditingController();

  bool _isLoadingStep = false;

  List<StepProgress> _allStepsProgress = [];

  List<Character> _characters = [];
  Character? _selectedCharacter;

  List<Scene> _scenes = [];
  Scene? _selectedScene;

  List<Chapter> _chapters = [];
  Chapter? _selectedChapter;
  bool _isModalDialogOpen = false;

  String t(String key) => Locales.t(key, widget.language);

  @override
  void initState() {
    super.initState();
    _activeNovel = widget.novel;
    _refreshAllData();
    HardwareKeyboard.instance.addHandler(_handleGlobalHardwareKey);
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_handleGlobalHardwareKey);
    _autoSaveDebounceTimer?.cancel();
    _step1Ctrl.dispose();
    _step2Ctrl.dispose();
    _step3SummaryCtrl.dispose();
    _step4Ctrl.dispose();
    _step5SynopsisCtrl.dispose();
    _step6Ctrl.dispose();
    _step7ChartCtrl.dispose();
    _step8SceneCtrl.dispose();
    _step9SceneCtrl.dispose();
    _chapterCtrl.dispose();
    _chapterTitleCtrl.dispose();
    super.dispose();
  }

  bool _handleGlobalHardwareKey(KeyEvent event) {
    if (event is! KeyDownEvent) return false;
    if (_isModalDialogOpen) return false;

    final isCtrl = HardwareKeyboard.instance.isControlPressed;
    final isMeta = HardwareKeyboard.instance.isMetaPressed;
    final isControlOrMeta = isCtrl || isMeta;
    final isShift = HardwareKeyboard.instance.isShiftPressed;
    final key = event.logicalKey;

    // Ctrl+K or Ctrl+P -> Open Command Palette
    if (isControlOrMeta && !isShift && (key == LogicalKeyboardKey.keyK || key == LogicalKeyboardKey.keyP)) {
      _openCommandPalette();
      return true;
    }

    // Ctrl+S -> Force Save
    if (isControlOrMeta && !isShift && key == LogicalKeyboardKey.keyS) {
      _saveActiveContent(showToast: true);
      return true;
    }

    // Ctrl+B -> Snapshots
    if (isControlOrMeta && !isShift && key == LogicalKeyboardKey.keyB) {
      _showBackupsHistoryDialog();
      return true;
    }

    // Ctrl+J -> Toggle Sidebar
    if (isControlOrMeta && !isShift && key == LogicalKeyboardKey.keyJ) {
      _toggleSidebar();
      return true;
    }

    // Ctrl+N -> Context-Aware New
    if (isControlOrMeta && !isShift && key == LogicalKeyboardKey.keyN) {
      _handleContextAwareNew();
      return true;
    }

    // Ctrl+/ or Ctrl+Shift+Slash -> Shortcuts Sheet
    if (isControlOrMeta && (key == LogicalKeyboardKey.slash || key == LogicalKeyboardKey.question)) {
      _showShortcutsModal();
      return true;
    }

    // F1 -> Help Guide
    if (key == LogicalKeyboardKey.f1) {
      _showHelpModal();
      return true;
    }

    // F11 -> Zen Mode on Active Step
    if (key == LogicalKeyboardKey.f11) {
      _openActiveZenMode();
      return true;
    }

    // Ctrl+0 -> Step 0 (Dashboard)
    if (isControlOrMeta && !isShift && key == LogicalKeyboardKey.digit0) {
      _navigateToTab(0);
      return true;
    }

    // Ctrl+1 through Ctrl+9 -> Steps 1-9
    if (isControlOrMeta && !isShift) {
      if (key == LogicalKeyboardKey.digit1) { _navigateToTab(1); return true; }
      if (key == LogicalKeyboardKey.digit2) { _navigateToTab(2); return true; }
      if (key == LogicalKeyboardKey.digit3) { _navigateToTab(3); return true; }
      if (key == LogicalKeyboardKey.digit4) { _navigateToTab(4); return true; }
      if (key == LogicalKeyboardKey.digit5) { _navigateToTab(5); return true; }
      if (key == LogicalKeyboardKey.digit6) { _navigateToTab(6); return true; }
      if (key == LogicalKeyboardKey.digit7) { _navigateToTab(7); return true; }
      if (key == LogicalKeyboardKey.digit8) { _navigateToTab(8); return true; }
      if (key == LogicalKeyboardKey.digit9) { _navigateToTab(9); return true; }
    }

    // Ctrl+Shift+E -> Export (Step 10)
    if (isControlOrMeta && isShift && key == LogicalKeyboardKey.keyE) {
      _navigateToTab(10);
      return true;
    }

    // Ctrl+Shift+W -> Write Novel (Step 11)
    if (isControlOrMeta && isShift && key == LogicalKeyboardKey.keyW) {
      _navigateToTab(11);
      return true;
    }

    return false;
  }

  Future<void> _refreshAllData() async {
    await _loadStepsProgress();
    await _loadCharacters();
    await _loadScenes();
    await _loadChapters();
    await _loadTabContent(_selectedTabIndex);
  }

  Future<void> _loadStepsProgress() async {
    try {
      final list = await _stepRepo.getStepsProgress(novelId: _activeNovel.id!);
      setState(() {
        _allStepsProgress = list;
      });
    } catch (_) {}
  }

  int _countCompletedSteps() {
    return _allStepsProgress.where((s) => s.stepNumber >= 1 && s.stepNumber <= 10 && s.isCompleted).length;
  }

  bool _isStepDone(int stepNum) {
    final s = _allStepsProgress.firstWhere(
      (sp) => sp.stepNumber == stepNum,
      orElse: () => StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
    );
    return s.isCompleted;
  }

  Future<void> _toggleStepCompleted(int stepNum, bool isCompleted) async {
    try {
      final existing = _allStepsProgress.firstWhere(
        (sp) => sp.stepNumber == stepNum,
        orElse: () => StepProgress(novelId: _activeNovel.id!, stepNumber: stepNum, contentText: '', isCompleted: isCompleted),
      );
      final updated = StepProgress(
        id: existing.id,
        novelId: _activeNovel.id!,
        stepNumber: stepNum,
        contentText: existing.contentText,
        isCompleted: isCompleted,
      );
      await _stepRepo.saveStepProgress(progress: updated);
      await _loadStepsProgress();
    } catch (_) {}
  }

  String _cleanText(String jsonOrRaw) {
    if (jsonOrRaw.trim().isEmpty) return '';
    try {
      final parsed = jsonDecode(jsonOrRaw);
      if (parsed is List) {
        final StringBuffer sb = StringBuffer();
        for (var op in parsed) {
          if (op is Map && op.containsKey('insert')) {
            sb.write(op['insert']);
          }
        }
        return sb.toString().trim();
      }
    } catch (_) {}
    return jsonOrRaw.trim();
  }

  int _countWordsFromText(String rawText) {
    final text = _cleanText(rawText);
    if (text.isEmpty) return 0;
    return text.split(RegExp(r'\s+')).length;
  }

  Future<void> _loadTabContent(int tabIndex) async {
    setState(() {
      _isLoadingStep = true;
      _selectedCharacter = null;
      _selectedScene = null;
      _selectedChapter = null;
    });

    final int stepNum = _getStepNumberForTab(tabIndex);

    if (stepNum > 0 && stepNum != 3 && stepNum != 5 && stepNum != 7 && stepNum != 8 && stepNum != 9) {
      final step = _allStepsProgress.firstWhere(
        (s) => s.stepNumber == stepNum,
        orElse: () => StepProgress(
          novelId: _activeNovel.id!,
          stepNumber: stepNum,
          contentText: '',
          isCompleted: false,
        ),
      );

      final text = _cleanText(step.contentText);

      if (stepNum == 1) _step1Ctrl.text = text;
      if (stepNum == 2) _step2Ctrl.text = text;
      if (stepNum == 4) _step4Ctrl.text = text;
      if (stepNum == 6) _step6Ctrl.text = text;
    } else if (tabIndex == 3 || tabIndex == 5 || tabIndex == 7) {
      await _loadCharacters();
    } else if (tabIndex == 8 || tabIndex == 9) {
      await _loadScenes();
      await _loadCharacters();
    } else if (tabIndex == 10) {
      await _loadChapters();
    }

    setState(() {
      _isLoadingStep = false;
    });
  }

  Future<void> _saveActiveContent({bool showToast = true}) async {
    try {
      if (_selectedTabIndex == 11 && _selectedChapter != null) {
        final updated = Chapter(
          id: _selectedChapter!.id,
          novelId: _selectedChapter!.novelId,
          title: _chapterTitleCtrl.text,
          content: _chapterCtrl.text,
          sortOrder: _selectedChapter!.sortOrder,
        );
        await _chapterRepo.saveChapter(chapter: updated);
        await _loadChapters();

        final totalWords = await _chapterRepo.calculateTotalWordCount(novelId: _activeNovel.id!);
        _activeNovel = Novel(
          id: _activeNovel.id,
          title: _activeNovel.title,
          genre: _activeNovel.genre,
          targetAudience: _activeNovel.targetAudience,
          targetWordCount: _activeNovel.targetWordCount,
          currentWordCount: totalWords,
          createdAt: _activeNovel.createdAt,
        );
        await _novelRepo.updateNovel(
          id: _activeNovel.id!,
          title: _activeNovel.title,
          genre: _activeNovel.genre,
          targetAudience: _activeNovel.targetAudience,
          targetWordCount: _activeNovel.targetWordCount,
        );
      } else {
        final stepNum = _getStepNumberForTab(_selectedTabIndex);
        final currentDone = _isStepDone(stepNum);

        if (stepNum == 1) {
          await _stepRepo.saveStepProgress(
            progress: StepProgress(novelId: _activeNovel.id!, stepNumber: 1, contentText: _step1Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 2) {
          await _stepRepo.saveStepProgress(
            progress: StepProgress(novelId: _activeNovel.id!, stepNumber: 2, contentText: _step2Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 3 && _selectedCharacter != null) {
          final updated = Character(
            id: _selectedCharacter!.id,
            novelId: _selectedCharacter!.novelId,
            name: _selectedCharacter!.name,
            motivation: _selectedCharacter!.motivation,
            goal: _selectedCharacter!.goal,
            conflict: _selectedCharacter!.conflict,
            epiphany: _selectedCharacter!.epiphany,
            oneParagraphSummary: _step3SummaryCtrl.text,
            fullSynopsis: _selectedCharacter!.fullSynopsis,
          );
          await _characterRepo.saveCharacter(character: updated);
          await _loadCharacters();
        } else if (stepNum == 4) {
          await _stepRepo.saveStepProgress(
            progress: StepProgress(novelId: _activeNovel.id!, stepNumber: 4, contentText: _step4Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 5 && _selectedCharacter != null) {
          final updated = Character(
            id: _selectedCharacter!.id,
            novelId: _selectedCharacter!.novelId,
            name: _selectedCharacter!.name,
            motivation: _selectedCharacter!.motivation,
            goal: _selectedCharacter!.goal,
            conflict: _selectedCharacter!.conflict,
            epiphany: _selectedCharacter!.epiphany,
            oneParagraphSummary: _selectedCharacter!.oneParagraphSummary,
            fullSynopsis: _step5SynopsisCtrl.text,
          );
          await _characterRepo.saveCharacter(character: updated);
          await _loadCharacters();
        } else if (stepNum == 6) {
          await _stepRepo.saveStepProgress(
            progress: StepProgress(novelId: _activeNovel.id!, stepNumber: 6, contentText: _step6Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 7 && _selectedCharacter != null) {
          await _stepRepo.saveStepProgress(
            progress: StepProgress(
              novelId: _activeNovel.id!,
              stepNumber: 7000 + _selectedCharacter!.id!,
              contentText: _step7ChartCtrl.text,
              isCompleted: true,
            ),
          );
          await _loadStepsProgress();
        } else if (stepNum == 8 && _selectedScene != null) {
          final text = _step8SceneCtrl.text;
          final actualWords = _countWordsFromText(text);
          final updated = Scene(
            id: _selectedScene!.id,
            novelId: _selectedScene!.novelId,
            povCharacterId: _selectedScene!.povCharacterId,
            setting: _selectedScene!.setting,
            plotThread: _selectedScene!.plotThread,
            whatHappens: text,
            expectedWordCount: _selectedScene!.expectedWordCount,
            actualWordCount: actualWords,
          );
          await _sceneRepo.saveScene(scene: updated);
          await _loadScenes();
        } else if (stepNum == 9 && _selectedScene != null) {
          final text = _step9SceneCtrl.text;
          await _stepRepo.saveStepProgress(
            progress: StepProgress(
              novelId: _activeNovel.id!,
              stepNumber: 9000 + _selectedScene!.id!,
              contentText: text,
              isCompleted: true,
            ),
          );
          await _loadStepsProgress();
        }
      }

      if (showToast && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Theme.of(context).colorScheme.onPrimary, size: 18),
                const SizedBox(width: 8),
                Text(widget.language == 'ar' ? 'تم الحفظ بنجاح!' : 'Saved successfully!'),
              ],
            ),
            backgroundColor: Theme.of(context).colorScheme.primary,
            duration: const Duration(seconds: 2),
          ),
        );
      }

      if (mounted) {
        setState(() {
          _saveStatus = SaveStatus.saved;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _saveStatus = SaveStatus.error;
        });
      }
      if (showToast && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Save error: $e'), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    }
  }

  void _handleContentChanged() {
    if (_saveStatus != SaveStatus.saving) {
      setState(() {
        _saveStatus = SaveStatus.saving;
      });
    }
    _autoSaveDebounceTimer?.cancel();
    _autoSaveDebounceTimer = Timer(const Duration(milliseconds: 700), () async {
      await _saveActiveContent(showToast: false);
    });
  }
  Future<void> _flushPendingAutoSave() async {
    if (_autoSaveDebounceTimer?.isActive ?? false) {
      _autoSaveDebounceTimer?.cancel();
      await _saveActiveContent(showToast: false);
    }
  }

  void _showBackupsHistoryDialog() {
    if (_isModalDialogOpen) return;
    _isModalDialogOpen = true;
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return Directionality(
            textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
            child: AlertDialog(
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.history, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(t('backupsTitle'), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  TextButton.icon(
                    icon: const Icon(Icons.folder_open, size: 16),
                    label: Text(t('openBackupsFolder')),
                    onPressed: () => BackupService.openBackupsFolder(widget.projectPath),
                  ),
                ],
              ),
              content: SizedBox(
                width: 600,
                height: 420,
                child: FutureBuilder<List<SnapshotInfo>>(
                  future: BackupService.listSnapshots(widget.projectPath),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final list = snapshot.data ?? [];
                    if (list.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.history_toggle_off, size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            Text(t('noBackupsFound')),
                          ],
                        ),
                      );
                    }
                    return ListView.separated(
                      itemCount: list.length,
                      separatorBuilder: (ctx, i) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final item = list[index];
                        return ListTile(
                          dense: true,
                          leading: Icon(
                            item.isManual ? Icons.bookmark : Icons.schedule,
                            color: item.isManual ? Colors.amber.shade700 : Colors.teal,
                          ),
                          title: Text(item.customLabel?.isNotEmpty == true ? item.customLabel! : item.fileName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          subtitle: Text('${item.timestamp.toLocal().toString().split('.').first} • ${item.formattedSize}'),
                          trailing: ElevatedButton(
                            child: Text(t('restoreBackupBtn')),
                            onPressed: () async {
                              final nav = Navigator.of(context);
                              final messenger = ScaffoldMessenger.of(context);
                              final confirm = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => Directionality(
                                  textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
                                  child: AlertDialog(
                                    title: Text(t('restoreConfirmTitle')),
                                    content: Text(t('restoreConfirmDesc')),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(t('cancel'))),
                                      ElevatedButton(
                                        onPressed: () => Navigator.pop(ctx, true),
                                        style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error, foregroundColor: Colors.white),
                                        child: Text(t('restoreBackupBtn')),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                              if (confirm == true) {
                                await BackupService.restoreSnapshot(backupPath: item.filePath, targetProjectPath: widget.projectPath);
                                nav.pop();
                                _refreshAllData();
                                messenger.showSnackBar(
                                  SnackBar(content: Text(t('backupRestoredSuccess')), backgroundColor: Colors.teal),
                                );
                              }
                            },
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(t('close')),
                ),
                ElevatedButton.icon(
                  icon: const Icon(Icons.camera_alt, size: 16),
                  label: Text(t('takeSnapshotBtn')),
                  onPressed: () {
                    Navigator.pop(context);
                    _showTakeSnapshotDialog();
                  },
                ),
              ],
            ),
          );
        },
      ),
    ).then((_) {
      _isModalDialogOpen = false;
    });
  }

  void _showTakeSnapshotDialog() {
    final labelCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => Directionality(
        textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
        child: AlertDialog(
          title: Text(t('takeSnapshotBtn'), style: const TextStyle(fontWeight: FontWeight.bold)),
          content: SizedBox(
            width: 480,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: labelCtrl,
                  decoration: InputDecoration(
                    labelText: t('snapshotLabelHint'),
                    border: const OutlineInputBorder(),
                    isDense: false,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(t('cancel')),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.camera_alt, size: 16),
              label: Text(t('takeSnapshotBtn')),
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(context);
                await _flushPendingAutoSave();
                await _saveActiveContent(showToast: false);
                final snapshot = await BackupService.createSnapshot(
                  projectPath: widget.projectPath,
                  novelTitle: _activeNovel.title,
                  customLabel: labelCtrl.text.trim(),
                  isManual: true,
                );
                if (snapshot != null) {
                  messenger.showSnackBar(
                    SnackBar(
                      content: Row(
                        children: [
                          const Icon(Icons.check_circle, color: Colors.white, size: 18),
                          const SizedBox(width: 8),
                          Text(t('snapshotCreatedSuccess')),
                        ],
                      ),
                      backgroundColor: Colors.teal,
                      duration: const Duration(seconds: 2),
                    ),
                  );
                }
              },
            ),
          ],
        ),
      ),
    ).then((_) {
      _isModalDialogOpen = false;
    });
  }

  void _confirmDeleteDialog({
    required String title,
    required String itemName,
    required VoidCallback onConfirm,
  }) {
    if (_isModalDialogOpen) return;
    _isModalDialogOpen = true;
    showDialog(
      context: context,
      builder: (context) => Directionality(
        textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
        child: AlertDialog(
          title: Row(
            children: [
              Icon(Icons.warning, color: Theme.of(context).colorScheme.error),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(
            widget.language == 'ar'
                ? 'هل أنت تأكد من حذف "$itemName"؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete "$itemName"? This action cannot be undone.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(t('cancel')),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                onConfirm();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
                foregroundColor: Theme.of(context).colorScheme.onError,
              ),
              child: Text(widget.language == 'ar' ? 'حذف' : 'Delete'),
            ),
          ],
        ),
      ),
    ).then((_) {
      _isModalDialogOpen = false;
    });
  }

  int _getStepNumberForTab(int tabIndex) {
    switch (tabIndex) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 3:
        return 3;
      case 4:
        return 4;
      case 5:
        return 5;
      case 6:
        return 6;
      case 7:
        return 7;
      case 8:
        return 8;
      case 9:
        return 9;
      case 10:
        return 10;
      default:
        return 0;
    }
  }

  String _getStepContentText(int stepNum) {
    final step = _allStepsProgress.firstWhere(
      (s) => s.stepNumber == stepNum,
      orElse: () => StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
    );
    return _cleanText(step.contentText);
  }

  Future<void> _loadCharacters() async {
    try {
      final list = await _characterRepo.getCharacters(novelId: _activeNovel.id!);
      setState(() {
        _characters = list;
      });
    } catch (_) {}
  }

  Future<void> _saveCharacter(Character char) async {
    try {
      await _characterRepo.saveCharacter(character: char);
      await _loadCharacters();
    } catch (_) {}
  }

  Future<void> _deleteCharacter(Character char) async {
    _confirmDeleteDialog(
      title: widget.language == 'ar' ? 'حذف الشخصية' : 'Delete Character',
      itemName: char.name,
      onConfirm: () async {
        try {
          await _characterRepo.deleteCharacter(id: char.id!);
          await _loadCharacters();
          setState(() {
            _selectedCharacter = null;
          });
        } catch (_) {}
      },
    );
  }

  void _openCharacterDialog([Character? existing]) {
    if (_isModalDialogOpen) return;
    _isModalDialogOpen = true;
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final motCtrl = TextEditingController(text: existing?.motivation ?? '');
    final goalCtrl = TextEditingController(text: existing?.goal ?? '');
    final conflictCtrl = TextEditingController(text: existing?.conflict ?? '');
    final epiphanyCtrl = TextEditingController(text: existing?.epiphany ?? '');

    showDialog(
      context: context,
      builder: (context) {
        final nav = Navigator.of(context);
        return Directionality(
          textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
          child: AlertDialog(
            title: Text(existing == null ? t('addCharacterTitle') : t('editCharacterTitle')),
            content: SizedBox(
              width: 500,
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    TextField(controller: nameCtrl, decoration: InputDecoration(labelText: t('charNameLabel'))),
                    TextField(controller: motCtrl, decoration: InputDecoration(labelText: t('charMotivationLabel'))),
                    TextField(controller: goalCtrl, decoration: InputDecoration(labelText: t('charGoalLabel'))),
                    TextField(controller: conflictCtrl, decoration: InputDecoration(labelText: t('charConflictLabel'))),
                    TextField(controller: epiphanyCtrl, decoration: InputDecoration(labelText: t('charEpiphanyLabel'))),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => nav.pop(), child: Text(t('cancel'))),
              ElevatedButton(
                onPressed: () async {
                  final char = Character(
                    id: existing?.id,
                    novelId: _activeNovel.id!,
                    name: nameCtrl.text,
                    motivation: motCtrl.text,
                    goal: goalCtrl.text,
                    conflict: conflictCtrl.text,
                    epiphany: epiphanyCtrl.text,
                    oneParagraphSummary: existing?.oneParagraphSummary ?? '',
                    fullSynopsis: existing?.fullSynopsis ?? '',
                  );
                  await _saveCharacter(char);
                  nav.pop();
                },
                child: Text(t('save')),
              ),
            ],
          ),
        );
      },
    ).then((_) {
      _isModalDialogOpen = false;
    });
  }

  Future<void> _loadScenes() async {
    try {
      final list = await _sceneRepo.getScenes(novelId: _activeNovel.id!);
      setState(() {
        _scenes = list;
      });
    } catch (_) {}
  }

  Future<void> _saveScene(Scene scene) async {
    try {
      await _sceneRepo.saveScene(scene: scene);
      await _loadScenes();
    } catch (_) {}
  }

  Future<void> _deleteScene(Scene scn) async {
    _confirmDeleteDialog(
      title: widget.language == 'ar' ? 'حذف المشهد' : 'Delete Scene',
      itemName: scn.setting.isNotEmpty ? scn.setting : 'Scene #${scn.id}',
      onConfirm: () async {
        try {
          await _sceneRepo.deleteScene(id: scn.id!, novelId: _activeNovel.id!);
          await _loadScenes();
          setState(() {
            _selectedScene = null;
          });
        } catch (_) {}
      },
    );
  }

  void _openSceneMetadataDialog([Scene? existing]) {
    if (_isModalDialogOpen) return;
    _isModalDialogOpen = true;
    int? selectedPovId = existing?.povCharacterId;
    final settingCtrl = TextEditingController(text: existing?.setting ?? '');
    final plotCtrl = TextEditingController(text: existing?.plotThread ?? '');
    final expWordsCtrl = TextEditingController(text: '${existing?.expectedWordCount ?? 1000}');

    showDialog(
      context: context,
      builder: (context) {
        final nav = Navigator.of(context);
        return Directionality(
          textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
          child: StatefulBuilder(
            builder: (context, setDialogState) => AlertDialog(
              title: Text(existing == null ? t('addSceneTitle') : t('editSceneTitle')),
              content: SizedBox(
                width: 450,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonFormField<int>(
                        initialValue: selectedPovId,
                        decoration: InputDecoration(labelText: t('scenePovLabel')),
                        items: _characters.map((c) => DropdownMenuItem<int>(value: c.id?.toInt(), child: Text(c.name, overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (val) => setDialogState(() => selectedPovId = val),
                      ),
                      TextField(controller: settingCtrl, decoration: InputDecoration(labelText: t('sceneSettingLabel'))),
                      TextField(
                        controller: plotCtrl,
                        decoration: InputDecoration(
                          labelText: t('scenePlotLabel'),
                          helperText: t('scenePlotHelper'),
                          helperMaxLines: 2,
                        ),
                      ),
                      TextField(controller: expWordsCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: t('sceneExpectedWordsLabel'))),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(onPressed: () => nav.pop(), child: Text(t('cancel'))),
                ElevatedButton(
                  onPressed: () async {
                    final scn = Scene(
                      id: existing?.id,
                      novelId: _activeNovel.id!,
                      povCharacterId: selectedPovId,
                      setting: settingCtrl.text,
                      plotThread: plotCtrl.text,
                      whatHappens: existing?.whatHappens ?? '',
                      expectedWordCount: int.tryParse(expWordsCtrl.text) ?? 0,
                      actualWordCount: existing?.actualWordCount ?? 0,
                    );
                    await _saveScene(scn);
                    nav.pop();
                  },
                  child: Text(t('save')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _loadChapters() async {
    try {
      final list = await _chapterRepo.getChapters(novelId: _activeNovel.id!);
      setState(() {
        _chapters = list;
      });
    } catch (_) {}
  }

  Future<void> _saveChapter(Chapter chap) async {
    try {
      await _chapterRepo.saveChapter(chapter: chap);
      await _loadChapters();
    } catch (_) {}
  }

  Future<void> _deleteChapter(Chapter chap) async {
    _confirmDeleteDialog(
      title: widget.language == 'ar' ? 'حذف الفصل' : 'Delete Chapter',
      itemName: chap.title,
      onConfirm: () async {
        try {
          await _chapterRepo.deleteChapter(id: chap.id!);
          await _loadChapters();
          setState(() {
            _selectedChapter = null;
          });
        } catch (_) {}
      },
    );
  }

  Future<void> _exportDocument(String format) async {
    final List<String> titles = [];
    final List<String> contents = [];

    for (var chap in _chapters) {
      titles.add(chap.title);
      contents.add(_cleanText(chap.content));
    }

    if (titles.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('selectChapterPlaceholder')), backgroundColor: Theme.of(context).colorScheme.tertiary),
      );
      return;
    }

    if (format == 'txt') {
      try {
        final textOut = await DatabaseService.exportToTxt(titles: titles, contents: contents);
        final path = await FilePicker.platform.saveFile(
          dialogTitle: t('exportTxtBtn'),
          fileName: '${_activeNovel.title}.txt',
          type: FileType.custom,
          allowedExtensions: ['txt'],
        );
        if (path != null) {
          await File(path).writeAsString(textOut);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
          );
        }
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    } else if (format == 'docx') {
      try {
        final path = await FilePicker.platform.saveFile(
          dialogTitle: t('exportDocxBtn'),
          fileName: '${_activeNovel.title}.docx',
          type: FileType.custom,
          allowedExtensions: ['docx'],
        );
        if (path != null) {
          await DatabaseService.exportToDocx(path: path, titles: titles, contents: contents);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
          );
        }
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    }
  }

  void _showHelpModal() {
    if (_isModalDialogOpen) return;
    _isModalDialogOpen = true;
    showDialog(
      context: context,
      builder: (context) => Directionality(
        textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
        child: AlertDialog(
          title: Text(t('helpModalTitle'), style: const TextStyle(fontWeight: FontWeight.bold)),
          content: SizedBox(
            width: 650,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t('helpModalDesc'), style: const TextStyle(fontSize: 13, height: 1.5)),
                  const Divider(height: 24),
                  _buildHelpStepItem('helpStep1Title', 'helpStep1Desc'),
                  _buildHelpStepItem('helpStep2Title', 'helpStep2Desc'),
                  _buildHelpStepItem('helpStep3Title', 'helpStep3Desc'),
                  _buildHelpStepItem('helpStep4Title', 'helpStep4Desc'),
                  _buildHelpStepItem('helpStep5Title', 'helpStep5Desc'),
                  _buildHelpStepItem('helpStep6Title', 'helpStep6Desc'),
                  _buildHelpStepItem('helpStep7Title', 'helpStep7Desc'),
                  _buildHelpStepItem('helpStep8Title', 'helpStep8Desc'),
                  _buildHelpStepItem('helpStep9Title', 'helpStep9Desc'),
                  _buildHelpStepItem('helpStep10Title', 'helpStep10Desc'),
                ],
              ),
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: Text(t('helpModalCloseBtn')),
            ),
          ],
        ),
      ),
    ).then((_) {
      _isModalDialogOpen = false;
    });
  }

  Widget _buildHelpStepItem(String titleKey, String descKey) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t(titleKey), style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
          const SizedBox(height: 2),
          Text(t(descKey), style: const TextStyle(fontSize: 12, height: 1.4)),
        ],
      ),
    );
  }

  Widget _buildResizeDivider({
    required ValueChanged<DragUpdateDetails> onDrag,
  }) {
    return MouseRegion(
      cursor: SystemMouseCursors.resizeColumn,
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onHorizontalDragUpdate: onDrag,
        child: Container(
          width: 8,
          color: Colors.transparent,
          child: Center(
            child: Container(
              width: 2,
              color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
            ),
          ),
        ),
      ),
    );
  }

  void _handleListPaneDrag(DragUpdateDetails details, {double max = 500.0}) {
    setState(() {
      final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
      _listPaneWidth = (_listPaneWidth + delta).clamp(180.0, max);
    });
  }

  Widget _buildSidebarContent({required bool isMobile}) {
    final completedSteps = _countCompletedSteps();
    return Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(8),
      elevation: isMobile ? 0 : null,
      shape: isMobile ? const RoundedRectangleBorder() : null,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(t('completedSteps'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    Text('$completedSteps / 10', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
                  ],
                ),
                const SizedBox(height: 6),
                LinearProgressIndicator(
                  value: completedSteps / 10,
                  color: Theme.of(context).colorScheme.primary,
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 4),
              children: [
                _buildSidebarTile(0, t('step0Title'), Icons.dashboard, isMobile: isMobile),
                const Divider(height: 1),
                _buildSidebarStepTile(1, t('step1Title'), 1, isMobile: isMobile),
                _buildSidebarStepTile(2, t('step2Title'), 2, isMobile: isMobile),
                _buildSidebarStepTile(3, t('step3Title'), 3, isMobile: isMobile),
                _buildSidebarStepTile(4, t('step4Title'), 4, isMobile: isMobile),
                _buildSidebarStepTile(5, t('step5Title'), 5, isMobile: isMobile),
                _buildSidebarStepTile(6, t('step6Title'), 6, isMobile: isMobile),
                _buildSidebarStepTile(7, t('step7Title'), 7, isMobile: isMobile),
                _buildSidebarStepTile(8, t('step8Title'), 8, isMobile: isMobile),
                _buildSidebarStepTile(9, t('step9Title'), 9, isMobile: isMobile),
                _buildSidebarStepTile(10, t('step10Title'), 10, isMobile: isMobile),
                const Divider(height: 1),
                _buildSidebarTile(11, t('writeNovelTitle'), Icons.edit_note, color: Theme.of(context).colorScheme.primary, isMobile: isMobile),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${t('builtBy')} Rubar', style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                const Chip(
                  label: Text('v3.0.0', style: TextStyle(fontSize: 9)),
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _navigateToTab(int index, {Character? character, Scene? scene, Chapter? chapter}) async {
    await _flushPendingAutoSave();
    await _saveActiveContent(showToast: false);
    setState(() {
      _selectedTabIndex = index;
      if (character != null) {
        _selectedCharacter = character;
        if (index == 3) {
          _step3SummaryCtrl.text = _cleanText(character.oneParagraphSummary);
        } else if (index == 5) {
          _step5SynopsisCtrl.text = _cleanText(character.fullSynopsis);
        }
      }
      if (scene != null) {
        _selectedScene = scene;
        if (index == 8) {
          _step8SceneCtrl.text = _cleanText(scene.whatHappens);
        }
      }
      if (chapter != null) {
        _selectedChapter = chapter;
        if (index == 11) {
          _chapterTitleCtrl.text = chapter.title;
          _chapterCtrl.text = _cleanText(chapter.content);
        }
      }
    });
    _loadTabContent(index);
  }

  void _openCommandPalette() {
    if (_isModalDialogOpen) return;
    _isModalDialogOpen = true;
    CommandPaletteDialog.show(
      context: context,
      language: widget.language,
      t: t,
      characters: _characters,
      scenes: _scenes,
      chapters: _chapters,
      onNavigate: (tabIndex, {character, scene, chapter}) {
        _navigateToTab(tabIndex, character: character, scene: scene, chapter: chapter);
      },
      onTriggerAction: (actionId) {
        _handlePaletteAction(actionId);
      },
    ).then((_) {
      _isModalDialogOpen = false;
    });
  }

  void _showShortcutsModal() {
    if (_isModalDialogOpen) return;
    _isModalDialogOpen = true;
    KeyboardShortcutsHelpDialog.show(context, widget.language, t).then((_) {
      _isModalDialogOpen = false;
    });
  }

  void _handlePaletteAction(String actionId) {
    switch (actionId) {
      case 'save':
        _saveActiveContent(showToast: true);
        break;
      case 'snapshots':
        _showBackupsHistoryDialog();
        break;
      case 'toggle_sidebar':
        _toggleSidebar();
        break;
      case 'zen_mode':
        _openActiveZenMode();
        break;
      case 'theme':
        if (_isModalDialogOpen) return;
        _isModalDialogOpen = true;
        showThemeSettingsDialog(context, widget.currentThemeMode, widget.currentSeedColor, widget.useDynamicColor, widget.onThemeSettingsChanged, t).then((_) {
          _isModalDialogOpen = false;
        });
        break;
      case 'language':
        widget.onLanguageToggle();
        break;
      case 'export_docx':
        _exportDocument('docx');
        break;
      case 'export_txt':
        _exportDocument('txt');
        break;
      case 'help':
        _showHelpModal();
        break;
      case 'shortcuts':
        _showShortcutsModal();
        break;
      case 'new_character':
        _openCharacterDialog();
        break;
      case 'new_scene':
        _openSceneMetadataDialog();
        break;
      case 'new_chapter':
        _addNewChapterQuick();
        break;
    }
  }

  void _toggleSidebar() {
    setState(() {
      _sidebarWidth = _sidebarWidth > 0 ? 0.0 : 260.0;
    });
  }

  void _handleContextAwareNew() {
    if (_selectedTabIndex == 3 || _selectedTabIndex == 5 || _selectedTabIndex == 7) {
      _openCharacterDialog();
    } else if (_selectedTabIndex == 8 || _selectedTabIndex == 9) {
      _openSceneMetadataDialog();
    } else if (_selectedTabIndex == 11) {
      _addNewChapterQuick();
    } else {
      _openCommandPalette();
    }
  }

  Future<void> _addNewChapterQuick() async {
    final nextNum = _chapters.length + 1;
    final newChap = Chapter(
      novelId: _activeNovel.id!,
      title: '${t('chapterTitleLabel')} $nextNum',
      content: '',
      sortOrder: nextNum,
    );
    await _saveChapter(newChap);
    _navigateToTab(11, chapter: newChap);
  }

  void _openActiveZenMode() {
    TextEditingController? ctrl;
    String title = _activeNovel.title;

    switch (_selectedTabIndex) {
      case 1:
        ctrl = _step1Ctrl;
        title = t('step1Title');
        break;
      case 2:
        ctrl = _step2Ctrl;
        title = t('step2Title');
        break;
      case 3:
        if (_selectedCharacter != null) {
          ctrl = _step3SummaryCtrl;
          title = '${_selectedCharacter!.name} (${t('step3Title')})';
        }
        break;
      case 4:
        ctrl = _step4Ctrl;
        title = t('step4Title');
        break;
      case 5:
        if (_selectedCharacter != null) {
          ctrl = _step5SynopsisCtrl;
          title = '${_selectedCharacter!.name} (${t('step5Title')})';
        }
        break;
      case 6:
        ctrl = _step6Ctrl;
        title = t('step6Title');
        break;
      case 7:
        if (_selectedCharacter != null) {
          ctrl = _step7ChartCtrl;
          title = '${_selectedCharacter!.name} (${t('step7Title')})';
        }
        break;
      case 8:
        if (_selectedScene != null) {
          ctrl = _step8SceneCtrl;
          title = _selectedScene!.setting.isNotEmpty ? _selectedScene!.setting : t('step8Title');
        }
        break;
      case 9:
        if (_selectedScene != null) {
          ctrl = _step9SceneCtrl;
          title = _selectedScene!.setting.isNotEmpty ? _selectedScene!.setting : t('step9Title');
        }
        break;
      case 11:
        ctrl = _chapterCtrl;
        title = _selectedChapter?.title.isNotEmpty == true ? _selectedChapter!.title : t('writeNovelTitle');
        break;
    }

    if (ctrl != null) {
      if (_isModalDialogOpen) return;
      _isModalDialogOpen = true;
      ZenModeView.show(
        context,
        title: title,
        controller: ctrl,
        t: t,
        language: widget.language,
        onChanged: (val) => _handleContentChanged(),
        onSave: () => _saveActiveContent(showToast: true),
      ).then((_) {
        _isModalDialogOpen = false;
      });
    }
  }

  Widget _buildSidebarTile(int index, String title, IconData icon, {Color? color, bool isMobile = false}) {
    final isSelected = _selectedTabIndex == index;
    return ListTile(
      dense: true,
      selected: isSelected,
      leading: Icon(icon, color: isSelected ? Colors.teal : color),
      title: Text(
        title,
        style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, fontSize: 12),
        overflow: TextOverflow.visible,
      ),
      onTap: () {
        if (isMobile) {
          Navigator.pop(context);
        }
        _navigateToTab(index);
      },
    );
  }

  Widget _buildSidebarStepTile(int index, String title, int stepNum, {bool isMobile = false}) {
    final isSelected = _selectedTabIndex == index;
    final isDone = _isStepDone(stepNum);

    return ListTile(
      dense: true,
      selected: isSelected,
      leading: CircleAvatar(
        radius: 10,
        backgroundColor: isSelected ? Colors.teal : Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Text('$stepNum', style: const TextStyle(fontSize: 10, color: Colors.white)),
      ),
      title: Text(
        title,
        style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, fontSize: 12),
        overflow: TextOverflow.visible,
      ),
      trailing: isDone ? Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary, size: 16) : null,
      onTap: () {
        if (isMobile) {
          Navigator.pop(context);
        }
        _navigateToTab(index);
      },
    );
  }

  Widget _buildSaveStatusIndicator({required bool isCompact}) {
    if (_saveStatus == SaveStatus.idle) return const SizedBox.shrink();

    final isSaving = _saveStatus == SaveStatus.saving;
    final isError = _saveStatus == SaveStatus.error;
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isSaving
            ? colorScheme.primaryContainer.withValues(alpha: 0.6)
            : isError
                ? colorScheme.errorContainer.withValues(alpha: 0.6)
                : colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isSaving)
            SizedBox(
              width: 11,
              height: 11,
              child: CircularProgressIndicator(
                strokeWidth: 1.5,
                color: colorScheme.primary,
              ),
            )
          else if (isError)
            Icon(Icons.error_outline, size: 13, color: colorScheme.error)
          else
            Icon(Icons.check_circle_outline, size: 13, color: colorScheme.primary),
          const SizedBox(width: 5),
          Text(
            isSaving
                ? t('statusSaving')
                : isError
                    ? 'Save error'
                    : t('statusSaved'),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isSaving
                  ? colorScheme.primary
                  : isError
                      ? colorScheme.error
                      : colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent({required bool isMobile}) {
    switch (_selectedTabIndex) {
      case 0:
        return DashboardTab(
          activeNovel: _activeNovel,
          characters: _characters,
          scenes: _scenes,
          t: t,
          language: widget.language,
          isMobile: isMobile,
          onNovelUpdated: (updated) => setState(() => _activeNovel = updated),
        );
      case 1:
        return StepEditorTab(
          title: t('step1Title'),
          instruction: t('step1Desc'),
          referenceStepNum: 0,
          referenceText: '',
          controller: _step1Ctrl,
          stepNum: 1,
          isDone: _isStepDone(1),
          onToggleDone: (val) => _toggleStepCompleted(1, val),
          onSave: () => _saveActiveContent(showToast: true),
          t: t,
          language: widget.language,
          isMobile: isMobile,
          onChanged: (val) => _handleContentChanged(),
        );
      case 2:
        return StepEditorTab(
          title: t('step2Title'),
          instruction: t('step2Desc'),
          referenceStepNum: 1,
          referenceText: _getStepContentText(1),
          controller: _step2Ctrl,
          stepNum: 2,
          isDone: _isStepDone(2),
          onToggleDone: (val) => _toggleStepCompleted(2, val),
          onSave: () => _saveActiveContent(showToast: true),
          t: t,
          language: widget.language,
          isMobile: isMobile,
          onChanged: (val) => _handleContentChanged(),
        );
      case 3:
        return CharacterBiosTab(
          characters: _characters,
          selectedCharacter: _selectedCharacter,
          summaryCtrl: _step3SummaryCtrl,
          listPaneWidth: _listPaneWidth,
          isDone: _isStepDone(3),
          onToggleDone: (val) => _toggleStepCompleted(3, val),
          onSave: () => _saveActiveContent(showToast: true),
          onSelectCharacter: (char) async {
            await _flushPendingAutoSave();
            await _saveActiveContent(showToast: false);
            setState(() {
              _selectedCharacter = char;
              if (char != null) {
                _step3SummaryCtrl.text = _cleanText(char.oneParagraphSummary);
              }
            });
          },
          onDeleteCharacter: _deleteCharacter,
          onOpenCharacterDialog: _openCharacterDialog,
          onListPaneDrag: _handleListPaneDrag,
          t: t,
          language: widget.language,
          isMobile: isMobile,
          onChanged: (val) => _handleContentChanged(),
        );
      case 4:
        return StepEditorTab(
          title: t('step4Title'),
          instruction: t('step4Desc'),
          referenceStepNum: 2,
          referenceText: _getStepContentText(2),
          controller: _step4Ctrl,
          stepNum: 4,
          isDone: _isStepDone(4),
          onToggleDone: (val) => _toggleStepCompleted(4, val),
          onSave: () => _saveActiveContent(showToast: true),
          t: t,
          language: widget.language,
          isMobile: isMobile,
          onChanged: (val) => _handleContentChanged(),
        );
      case 5:
        return CharacterPovSynopsesTab(
          characters: _characters,
          selectedCharacter: _selectedCharacter,
          synopsisCtrl: _step5SynopsisCtrl,
          listPaneWidth: _listPaneWidth,
          isDone: _isStepDone(5),
          onToggleDone: (val) => _toggleStepCompleted(5, val),
          onSave: () => _saveActiveContent(showToast: true),
          onSelectCharacter: (char) async {
            await _flushPendingAutoSave();
            await _saveActiveContent(showToast: false);
            setState(() {
              _selectedCharacter = char;
              if (char != null) {
                _step5SynopsisCtrl.text = _cleanText(char.fullSynopsis);
              }
            });
          },
          onListPaneDrag: _handleListPaneDrag,
          t: t,
          language: widget.language,
          isMobile: isMobile,
          cleanText: _cleanText,
          onChanged: (val) => _handleContentChanged(),
        );
      case 6:
        return StepEditorTab(
          title: t('step6Title'),
          instruction: t('step6Desc'),
          referenceStepNum: 4,
          referenceText: _getStepContentText(4),
          controller: _step6Ctrl,
          stepNum: 6,
          isDone: _isStepDone(6),
          onToggleDone: (val) => _toggleStepCompleted(6, val),
          onSave: () => _saveActiveContent(showToast: true),
          t: t,
          language: widget.language,
          isMobile: isMobile,
          onChanged: (val) => _handleContentChanged(),
        );
      case 7:
        return DetailedCharacterChartsTab(
          characters: _characters,
          selectedCharacter: _selectedCharacter,
          chartCtrl: _step7ChartCtrl,
          listPaneWidth: _listPaneWidth,
          isDone: _isStepDone(7),
          onToggleDone: (val) => _toggleStepCompleted(7, val),
          onSave: () => _saveActiveContent(showToast: true),
          onSelectCharacter: (char) async {
            await _flushPendingAutoSave();
            await _saveActiveContent(showToast: false);
            setState(() {
              _selectedCharacter = char;
            });
            if (char != null) {
              final chartStep = _allStepsProgress.firstWhere(
                (s) => s.stepNumber == (7000 + char.id!),
                orElse: () => StepProgress(novelId: _activeNovel.id!, stepNumber: 7000 + char.id!, contentText: '', isCompleted: false),
              );
              _step7ChartCtrl.text = _cleanText(chartStep.contentText);
            }
          },
          onListPaneDrag: _handleListPaneDrag,
          t: t,
          language: widget.language,
          isMobile: isMobile,
          cleanText: _cleanText,
          onChanged: (val) => _handleContentChanged(),
        );
      case 8:
        return SceneListMasterDetailTab(
          scenes: _scenes,
          characters: _characters,
          selectedScene: _selectedScene,
          step8SceneCtrl: _step8SceneCtrl,
          listPaneWidth: _listPaneWidth,
          isDone: _isStepDone(8),
          onToggleDone: (val) => _toggleStepCompleted(8, val),
          onSave: () => _saveActiveContent(showToast: true),
          onSelectScene: (scn) async {
            await _flushPendingAutoSave();
            await _saveActiveContent(showToast: false);
            setState(() {
              _selectedScene = scn;
              if (scn != null) {
                _step8SceneCtrl.text = _cleanText(scn.whatHappens);
              }
            });
          },
          onDeleteScene: _deleteScene,
          onOpenSceneMetadataDialog: _openSceneMetadataDialog,
          onListPaneDrag: _handleListPaneDrag,
          onReorderScenes: (reordered) async {
            setState(() {
              _scenes = reordered;
            });
            await _sceneRepo.reorderScenes(reordered);
          },
          onSaveScene: (scn) async {
            await _saveScene(scn);
          },
          t: t,
          language: widget.language,
          isMobile: isMobile,
          cleanText: _cleanText,
          onChanged: (val) => _handleContentChanged(),
        );
      case 9:
        return SceneNarrativeOutlinesTab(
          scenes: _scenes,
          characters: _characters,
          selectedScene: _selectedScene,
          step9SceneCtrl: _step9SceneCtrl,
          listPaneWidth: _listPaneWidth,
          isDone: _isStepDone(9),
          onToggleDone: (val) => _toggleStepCompleted(9, val),
          onSave: () => _saveActiveContent(showToast: true),
          onSelectScene: (scn) async {
            await _flushPendingAutoSave();
            await _saveActiveContent(showToast: false);
            setState(() {
              _selectedScene = scn;
            });
            if (scn != null) {
              final step9Prog = _allStepsProgress.firstWhere(
                (s) => s.stepNumber == (9000 + scn.id!),
                orElse: () => StepProgress(novelId: _activeNovel.id!, stepNumber: 9000 + scn.id!, contentText: '', isCompleted: false),
              );
              _step9SceneCtrl.text = _cleanText(step9Prog.contentText);
            }
          },
          onListPaneDrag: _handleListPaneDrag,
          t: t,
          language: widget.language,
          isMobile: isMobile,
          cleanText: _cleanText,
          onChanged: (val) => _handleContentChanged(),
        );
      case 10:
        return ExportTab(
          activeNovel: _activeNovel,
          characters: _characters,
          scenes: _scenes,
          chapters: _chapters,
          allStepsProgress: _allStepsProgress,
          getStepContentText: _getStepContentText,
          cleanText: _cleanText,
          isDone: _isStepDone(10),
          onToggleDone: (val) => _toggleStepCompleted(10, val),
          onSave: () => _saveActiveContent(showToast: true),
          t: t,
          isMobile: isMobile,
        );
      case 11:
        return WriteNovelTab(
          activeNovel: _activeNovel,
          chapters: _chapters,
          selectedChapter: _selectedChapter,
          chapterTitleCtrl: _chapterTitleCtrl,
          chapterCtrl: _chapterCtrl,
          listPaneWidth: _listPaneWidth,
          onSaveChapter: _saveChapter,
          onDeleteChapter: _deleteChapter,
          onSelectChapter: (chap) async {
            await _flushPendingAutoSave();
            await _saveActiveContent(showToast: false);
            setState(() {
              _selectedChapter = chap;
              if (chap != null) {
                _chapterTitleCtrl.text = chap.title;
                _chapterCtrl.text = _cleanText(chap.content);
              }
            });
          },
          onListPaneDrag: _handleListPaneDrag,
          onSaveActiveContent: () => _saveActiveContent(showToast: true),
          onExportDocument: _exportDocument,
          t: t,
          language: widget.language,
          isMobile: isMobile,
          cleanText: _cleanText,
          onChanged: (val) => _handleContentChanged(),
        );
      default:
        return const Center(child: Text('Unknown tab'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final textDir = widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr;
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 700;
    final isExpanded = screenWidth >= 1150;

    return Directionality(
      textDirection: textDir,
      child: Scaffold(
        drawer: !isExpanded ? Drawer(child: SafeArea(child: _buildSidebarContent(isMobile: true))) : null,
        appBar: AppBar(
          leading: !isExpanded
              ? Builder(
                  builder: (ctx) => IconButton(
                    icon: const Icon(Icons.menu),
                    tooltip: t('completedSteps'),
                    onPressed: () => Scaffold.of(ctx).openDrawer(),
                  ),
                )
              : null,
          title: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  _activeNovel.title,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              _buildSaveStatusIndicator(isCompact: isCompact),
              if (!isCompact) ...[
                const SizedBox(width: 8),
                Chip(
                  label: Text(
                    widget.projectPath.split(Platform.pathSeparator).last,
                    style: const TextStyle(fontSize: 10),
                    overflow: TextOverflow.ellipsis,
                  ),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ],
          ),
          actions: [
            IconButton(
              onPressed: _openCommandPalette,
              icon: const Icon(Icons.search),
              tooltip: '${t('commandPaletteTitle')} (Ctrl+K)',
            ),
            IconButton(
              onPressed: _showBackupsHistoryDialog,
              icon: const Icon(Icons.history),
              tooltip: '${t('backupsTitle')} (Ctrl+B)',
            ),
            IconButton(
              onPressed: _showShortcutsModal,
              icon: const Icon(Icons.keyboard_outlined),
              tooltip: '${t('shortcutsTitle')} (Ctrl+/)',
            ),
            IconButton(
              onPressed: _showHelpModal,
              icon: const Icon(Icons.help_outline),
              tooltip: '${t('helpModalTitle')} (F1)',
            ),
            IconButton(
              onPressed: widget.onLanguageToggle,
              icon: const Icon(Icons.language),
              tooltip: widget.language == 'ar' ? 'English' : 'العربية',
            ),
            IconButton(
              onPressed: () {
                if (_isModalDialogOpen) return;
                _isModalDialogOpen = true;
                showThemeSettingsDialog(context, widget.currentThemeMode, widget.currentSeedColor, widget.useDynamicColor, widget.onThemeSettingsChanged, t).then((_) {
                  _isModalDialogOpen = false;
                });
              },
              icon: const Icon(Icons.palette),
              tooltip: t('appearance'),
            ),
            IconButton(
              onPressed: () async {
                await _flushPendingAutoSave();
                await _saveActiveContent(showToast: false);
                // Create session end backup
                await BackupService.createSnapshot(
                  projectPath: widget.projectPath,
                  novelTitle: _activeNovel.title,
                  isManual: false,
                );
                widget.onClose();
              },
              icon: const Icon(Icons.close),
              color: Theme.of(context).colorScheme.error,
              tooltip: t('close'),
            ),
            const SizedBox(width: 4),
          ],
        ),
        body: isCompact
            ? (_isLoadingStep
                ? const Center(child: CircularProgressIndicator())
                : _buildTabContent(isMobile: true))
            : Row(
                children: [
                  if (isExpanded && _sidebarWidth > 0) ...[
                    SizedBox(
                      width: _sidebarWidth,
                      child: _buildSidebarContent(isMobile: false),
                    ),
                    _buildResizeDivider(
                      onDrag: (details) {
                        setState(() {
                          final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
                          _sidebarWidth = (_sidebarWidth + delta).clamp(180.0, 380.0);
                        });
                      },
                    ),
                  ],
                  Expanded(
                    child: _isLoadingStep
                        ? const Center(child: CircularProgressIndicator())
                        : _buildTabContent(isMobile: false),
                  ),
                ],
              ),
      ),
    );
  }
}
