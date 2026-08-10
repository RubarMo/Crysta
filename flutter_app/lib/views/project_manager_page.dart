import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../locales.dart';
import '../models.dart';
import '../db_service.dart';
import '../services/backup_service.dart';
import '../widgets/theme_settings_dialog.dart';
import 'workspace/workspace_page.dart';

class ProjectManagerPage extends StatefulWidget {
  final void Function(ThemeMode, Color, bool) onThemeSettingsChanged;
  final ThemeMode currentThemeMode;
  final Color currentSeedColor;
  final bool useDynamicColor;
  final VoidCallback onLanguageToggle;
  final String language;

  const ProjectManagerPage({
    super.key,
    required this.onThemeSettingsChanged,
    required this.currentThemeMode,
    required this.currentSeedColor,
    required this.useDynamicColor,
    required this.onLanguageToggle,
    required this.language,
  });

  @override
  State<ProjectManagerPage> createState() => _ProjectManagerPageState();
}

class _ProjectManagerPageState extends State<ProjectManagerPage> {
  Novel? _currentNovel;
  String? _projectPath;
  List<String> _recentProjects = [];

  String t(String key) => Locales.t(key, widget.language);

  @override
  void initState() {
    super.initState();
    _loadRecentProjects();
  }

  Future<File> _getRecentConfigFile() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/recent_projects.json');
  }

  Future<void> _loadRecentProjects() async {
    try {
      final file = await _getRecentConfigFile();
      if (await file.exists()) {
        final content = await file.readAsString();
        final List<dynamic> list = jsonDecode(content);
        final validPaths = <String>[];
        for (var path in list) {
          if (path is String && File(path).existsSync()) {
            validPaths.add(path);
          }
        }
        setState(() {
          _recentProjects = validPaths;
        });
      }
    } catch (_) {}
  }

  Future<void> _addRecentProject(String path) async {
    try {
      _recentProjects.remove(path);
      _recentProjects.insert(0, path);
      if (_recentProjects.length > 10) {
        _recentProjects = _recentProjects.sublist(0, 10);
      }
      final file = await _getRecentConfigFile();
      await file.writeAsString(jsonEncode(_recentProjects));
      setState(() {});
    } catch (_) {}
  }

  Future<void> _createNewProject() async {
    String? path;
    if (Platform.isAndroid || Platform.isIOS) {
      final dir = await getApplicationDocumentsDirectory();
      path = '${dir.path}/novel_${DateTime.now().millisecondsSinceEpoch}.crysta';
    } else {
      path = await FilePicker.platform.saveFile(
        dialogTitle: t('createProjectBtn'),
        fileName: t('newNovelFilename'),
        type: FileType.custom,
        allowedExtensions: ['crysta'],
      );
    }

    if (path != null) {
      if (!path.endsWith('.crysta')) {
        path = '$path.crysta';
      }
      try {
        final novel = await DatabaseService.openProject(path: path);
        await _addRecentProject(path);
        setState(() {
          _currentNovel = novel;
          _projectPath = path;
        });
      } catch (e) {
        _showError('${t('failedToOpenProject')}: $e');
      }
    }
  }

  Future<void> _openProjectFile([String? path]) async {
    path ??= await FilePicker.platform.pickFiles(
      dialogTitle: t('openProjectBtn'),
      type: FileType.custom,
      allowedExtensions: ['crysta'],
    ).then((result) => result?.files.single.path);

    if (path != null) {
      try {
        final novel = await DatabaseService.openProject(path: path);
        await _addRecentProject(path);

        // Auto-create session start snapshot (throttled to 30 mins)
        await BackupService.createSnapshot(
          projectPath: path,
          novelTitle: novel.title,
          throttle: true,
        );

        setState(() {
          _currentNovel = novel;
          _projectPath = path;
        });
      } catch (e) {
        _showError('${t('failedToOpenProject')}: $e');
      }
    }
  }

  Future<void> _removeRecentProject(String path) async {
    _recentProjects.remove(path);
    try {
      final file = await _getRecentConfigFile();
      await file.writeAsString(jsonEncode(_recentProjects));
    } catch (_) {}
    setState(() {});
  }

  String _formatDateTime(DateTime dt) {
    final y = dt.year;
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    final h = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    return '$y-$m-$d $h:$min';
  }

  Future<void> _showSnapshotsDialog(String projectPath) async {
    final snapshots = await BackupService.listSnapshots(projectPath);
    final projectName = projectPath.split(Platform.pathSeparator).last;

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Directionality(
          textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
          child: AlertDialog(
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '${t('backupsTitle')} — $projectName',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.folder_open),
                  tooltip: t('openBackupsFolder'),
                  onPressed: () => BackupService.openBackupsFolder(projectPath),
                ),
              ],
            ),
            content: SizedBox(
              width: 580,
              height: 380,
              child: snapshots.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.history_toggle_off, size: 48, color: Theme.of(context).colorScheme.outline),
                          const SizedBox(height: 12),
                          Text(
                            t('noBackupsFound'),
                            style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      itemCount: snapshots.length,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final s = snapshots[index];
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          leading: CircleAvatar(
                            radius: 16,
                            backgroundColor: s.isManual
                                ? Theme.of(context).colorScheme.primaryContainer
                                : Theme.of(context).colorScheme.surfaceContainerHighest,
                            child: Icon(
                              s.isManual ? Icons.camera_alt : Icons.history,
                              size: 16,
                              color: s.isManual
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          title: Text(
                            s.customLabel != null && s.customLabel!.isNotEmpty
                                ? '${s.customLabel} (${_formatDateTime(s.timestamp)})'
                                : _formatDateTime(s.timestamp),
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            '${s.formattedSize} • ${s.isManual ? t('manualSnapshotTag') : t('autoSnapshotTag')}',
                            style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  visualDensity: VisualDensity.compact,
                                ),
                                icon: const Icon(Icons.restore, size: 14),
                                label: Text(t('restoreBackupBtn'), style: const TextStyle(fontSize: 11)),
                                onPressed: () => _confirmRestore(s.filePath, projectPath),
                              ),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: Icon(Icons.delete_outline, size: 18, color: Theme.of(context).colorScheme.error),
                                onPressed: () async {
                                  await BackupService.deleteSnapshot(s.filePath);
                                  final updated = await BackupService.listSnapshots(projectPath);
                                  setDialogState(() {
                                    snapshots.clear();
                                    snapshots.addAll(updated);
                                  });
                                },
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(t('close')),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmRestore(String backupPath, String targetProjectPath) {
    showDialog(
      context: context,
      builder: (context) => Directionality(
        textDirection: widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
        child: AlertDialog(
          title: Text(t('restoreConfirmTitle'), style: const TextStyle(fontWeight: FontWeight.bold)),
          content: Text(t('restoreConfirmDesc')),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(t('cancel')),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Theme.of(context).colorScheme.onPrimary,
              ),
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(context); // Close confirm dialog
                Navigator.pop(context); // Close snapshots dialog

                final success = await BackupService.restoreSnapshot(
                  backupPath: backupPath,
                  targetProjectPath: targetProjectPath,
                );

                if (success) {
                  messenger.showSnackBar(
                    SnackBar(content: Text(t('backupRestoredSuccess')), backgroundColor: Colors.green),
                  );
                  await _openProjectFile(targetProjectPath);
                }
              },
              child: Text(t('restoreBackupBtn')),
            ),
          ],
        ),
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Theme.of(context).colorScheme.error),
    );
  }

  void _showHelpModal() {
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
    );
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

  @override
  Widget build(BuildContext context) {
    final textDir = widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr;

    if (_currentNovel != null && _projectPath != null) {
      return WorkspacePage(
        novel: _currentNovel!,
        projectPath: _projectPath!,
        language: widget.language,
        onClose: () {
          DatabaseService.closeProject();
          setState(() {
            _currentNovel = null;
            _projectPath = null;
          });
          _loadRecentProjects();
        },
        onThemeSettingsChanged: widget.onThemeSettingsChanged,
        currentThemeMode: widget.currentThemeMode,
        currentSeedColor: widget.currentSeedColor,
        useDynamicColor: widget.useDynamicColor,
        onLanguageToggle: widget.onLanguageToggle,
      );
    }

    return Directionality(
      textDirection: textDir,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('appName')),
          actions: [
            IconButton(
              onPressed: _showHelpModal,
              icon: const Icon(Icons.help_outline),
              tooltip: t('helpGuideBtn'),
            ),
            IconButton(
              onPressed: widget.onLanguageToggle,
              icon: const Icon(Icons.language),
              tooltip: widget.language == 'ar' ? 'English' : 'العربية',
            ),
            IconButton(
              onPressed: () => showThemeSettingsDialog(context, widget.currentThemeMode, widget.currentSeedColor, widget.useDynamicColor, widget.onThemeSettingsChanged, t),
              icon: const Icon(Icons.palette),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isSmall = constraints.maxWidth < 450;
              return Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(isSmall ? 16 : 32),
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 650),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Icon(
                          Icons.menu_book,
                          size: isSmall ? 60 : 80,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          t('appName'),
                          textAlign: TextAlign.center,
                          style: (isSmall ? Theme.of(context).textTheme.headlineMedium : Theme.of(context).textTheme.headlineLarge)?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          t('appTagline'),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                        const SizedBox(height: 28),
                        if (isSmall) ...[
                          ElevatedButton.icon(
                            onPressed: _createNewProject,
                            icon: const Icon(Icons.create_new_folder),
                            label: Text(t('createProjectBtn')),
                            style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: () => _openProjectFile(),
                            icon: const Icon(Icons.file_open),
                            label: Text(t('openProjectBtn')),
                            style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
                          ),
                        ] else ...[
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _createNewProject,
                                  icon: const Icon(Icons.create_new_folder),
                                  label: Text(t('createProjectBtn')),
                                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _openProjectFile(),
                                  icon: const Icon(Icons.file_open),
                                  label: Text(t('openProjectBtn')),
                                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (_recentProjects.isNotEmpty) ...[
                          const SizedBox(height: 32),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                t('recentProjectsTitle'),
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              TextButton(
                                onPressed: () async {
                                  _recentProjects.clear();
                                  final file = await _getRecentConfigFile();
                                  if (await file.exists()) await file.delete();
                                  setState(() {});
                                },
                                child: Text(widget.language == 'ar' ? 'مسح القائمة' : 'Clear List', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Card(
                            child: ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _recentProjects.length,
                              itemBuilder: (context, index) {
                                final p = _recentProjects[index];
                                return ListTile(
                                  leading: Icon(Icons.insert_drive_file, color: Theme.of(context).colorScheme.primary),
                                  title: Text(
                                    p.split(Platform.pathSeparator).last,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  subtitle: Text(p, style: const TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.history, size: 20),
                                        tooltip: t('backupsTitle'),
                                        onPressed: () => _showSnapshotsDialog(p),
                                      ),
                                      IconButton(
                                        icon: Icon(Icons.close, size: 18, color: Theme.of(context).colorScheme.onSurfaceVariant),
                                        tooltip: t('delete'),
                                        onPressed: () => _removeRecentProject(p),
                                      ),
                                    ],
                                  ),
                                  onTap: () => _openProjectFile(p),
                                );
                              },
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
