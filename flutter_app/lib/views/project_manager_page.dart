import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../locales.dart';
import '../models.dart';
import '../db_service.dart';
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
        setState(() {
          _currentNovel = novel;
          _projectPath = path;
        });
      } catch (e) {
        _showError('${t('failedToOpenProject')}: $e');
      }
    }
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
