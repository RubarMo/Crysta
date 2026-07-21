import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge_for_generated.dart';
import 'package:dynamic_color/dynamic_color.dart';

import 'locales.dart';
import 'src/rust/api.dart' as rust;
import 'src/rust/frb_generated.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    print('Before RustLib.init');
    await RustLib.init();
    print('After RustLib.init');
    runApp(const CrystaApp());
  } catch (e, st) {
    runApp(MaterialApp(
      home: Scaffold(
        body: Center(
          child: Text('Failed to initialize: $e\n$st', style: const TextStyle(color: Colors.red)),
        ),
      ),
    ));
  }
}

class CrystaApp extends StatefulWidget {
  const CrystaApp({super.key});

  @override
  State<CrystaApp> createState() => _CrystaAppState();
}

class _CrystaAppState extends State<CrystaApp> {
  ThemeMode _themeMode = ThemeMode.dark;
  String _language = 'ar';
  Color _seedColor = Colors.teal;
  bool _useDynamicColor = false;

  void updateTheme(ThemeMode mode, Color color, bool useDynamicColor) {
    setState(() {
      _themeMode = mode;
      _seedColor = color;
      _useDynamicColor = useDynamicColor;
    });
  }

  void toggleLanguage() {
    setState(() {
      _language = _language == 'ar' ? 'en' : 'ar';
    });
  }

  @override
  Widget build(BuildContext context) {
    return DynamicColorBuilder(
      builder: (ColorScheme? lightDynamic, ColorScheme? darkDynamic) {
        ColorScheme lightScheme;
        ColorScheme darkScheme;

        if (_useDynamicColor && lightDynamic != null && darkDynamic != null) {
          lightScheme = lightDynamic.harmonized();
          darkScheme = darkDynamic.harmonized();
        } else {
          lightScheme = ColorScheme.fromSeed(seedColor: _seedColor, brightness: Brightness.light);
          darkScheme = ColorScheme.fromSeed(seedColor: _seedColor, brightness: Brightness.dark);
        }

        return MaterialApp(
          title: 'Crysta Novel Studio',
          debugShowCheckedModeBanner: false,
          themeMode: _themeMode,
          localizationsDelegates: FlutterQuillLocalizations.localizationsDelegates,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: lightScheme,
            fontFamily: _language == 'ar' ? 'Cairo' : null,
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            colorScheme: darkScheme,
            fontFamily: _language == 'ar' ? 'Cairo' : null,
          ),
          home: ProjectManagerPage(
            onThemeSettingsChanged: updateTheme,
            currentThemeMode: _themeMode,
            currentSeedColor: _seedColor,
            useDynamicColor: _useDynamicColor,
            onLanguageToggle: toggleLanguage,
            language: _language,
          ),
        );
      },
    );
  }
}

class NativeTextEditor extends StatefulWidget {
  final TextEditingController controller;
  final String wordCountLabel;
  final String placeholder;
  final ValueChanged<String>? onChanged;

  const NativeTextEditor({
    super.key,
    required this.controller,
    required this.wordCountLabel,
    this.placeholder = '',
    this.onChanged,
  });

  @override
  State<NativeTextEditor> createState() => _NativeTextEditorState();
}

class _NativeTextEditorState extends State<NativeTextEditor> {
  late QuillController _quillController;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _initQuillController();
    widget.controller.addListener(_onTextControllerChanged);
  }

  void _onTextControllerChanged() {
    if (_isSyncing) return;
    final currentDeltaJson = jsonEncode(_quillController.document.toDelta().toJson());
    if (widget.controller.text != currentDeltaJson) {
      _quillController.removeListener(_onQuillChanged);
      _quillController.dispose();
      _initQuillController();
      setState(() {});
    }
  }

  void _initQuillController() {
    Document doc;
    final text = widget.controller.text;
    if (text.trim().isEmpty) {
      doc = Document();
    } else {
      try {
        final parsed = jsonDecode(text);
        if (parsed is List) {
          doc = Document.fromJson(parsed);
        } else {
          doc = Document()..insert(0, text);
        }
      } catch (_) {
        doc = Document()..insert(0, text);
      }
    }

    _quillController = QuillController(
      document: doc,
      selection: const TextSelection.collapsed(offset: 0),
    );

    _quillController.addListener(_onQuillChanged);
  }

  void _onQuillChanged() {
    _isSyncing = true;
    final deltaJson = jsonEncode(_quillController.document.toDelta().toJson());
    if (widget.controller.text != deltaJson) {
      widget.controller.text = deltaJson;
      if (widget.onChanged != null) {
        widget.onChanged!(deltaJson);
      }
    }
    _isSyncing = false;
  }

  @override
  void didUpdateWidget(NativeTextEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onTextControllerChanged);
      _quillController.removeListener(_onQuillChanged);
      _quillController.dispose();
      _initQuillController();
      widget.controller.addListener(_onTextControllerChanged);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextControllerChanged);
    _quillController.removeListener(_onQuillChanged);
    _quillController.dispose();
    super.dispose();
  }

  int countWords() {
    final text = _quillController.document.toPlainText().trim();
    if (text.isEmpty) return 0;
    return text.split(RegExp(r'\s+')).length;
  }

  @override
  Widget build(BuildContext context) {
    final wordCount = countWords();

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.4),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          ),
          child: Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: QuillSimpleToolbar(
                    controller: _quillController,
                    config: const QuillSimpleToolbarConfig(
                      showFontFamily: false,
                      showFontSize: false,
                      showSearchButton: false,
                      showSubscript: false,
                      showSuperscript: false,
                      showInlineCode: false,
                      showCodeBlock: false,
                      showIndent: false,
                      showLink: false,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Chip(
                avatar: Icon(Icons.description, size: 14, color: Theme.of(context).colorScheme.primary),
                label: Text('$wordCount ${widget.wordCountLabel}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: QuillEditor.basic(
              controller: _quillController,
              config: QuillEditorConfig(
                placeholder: widget.placeholder.isNotEmpty ? widget.placeholder : 'Type your text here...',
              ),
            ),
          ),
        ),
      ],
    );
  }
}

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
  rust.Novel? _currentNovel;
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
        final novel = await rust.openProject(path: path);
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
        final novel = await rust.openProject(path: path);
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
          rust.closeProject();
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
              onPressed: () => _showThemeSettingsDialog(context, widget.currentThemeMode, widget.currentSeedColor, widget.useDynamicColor, widget.onThemeSettingsChanged, t),
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

class WorkspacePage extends StatefulWidget {
  final rust.Novel novel;
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
  late rust.Novel _activeNovel;

  // Interactive Resizable Panes State
  double _sidebarWidth = 260.0;
  double _listPaneWidth = 300.0;

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

  List<rust.StepProgress> _allStepsProgress = [];

  List<rust.Character> _characters = [];
  rust.Character? _selectedCharacter;

  List<rust.Scene> _scenes = [];
  rust.Scene? _selectedScene;

  List<rust.Chapter> _chapters = [];
  rust.Chapter? _selectedChapter;

  String t(String key) => Locales.t(key, widget.language);

  @override
  void initState() {
    super.initState();
    _activeNovel = widget.novel;
    _refreshAllData();
  }

  @override
  void dispose() {
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

  Future<void> _refreshAllData() async {
    await _loadStepsProgress();
    await _loadCharacters();
    await _loadScenes();
    await _loadChapters();
    await _loadTabContent(_selectedTabIndex);
  }

  Future<void> _loadStepsProgress() async {
    try {
      final list = await rust.getStepsProgress(novelId: _activeNovel.id!);
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
      orElse: () => rust.StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
    );
    return s.isCompleted;
  }

  Future<void> _toggleStepCompleted(int stepNum, bool isCompleted) async {
    try {
      final existing = _allStepsProgress.firstWhere(
        (sp) => sp.stepNumber == stepNum,
        orElse: () => rust.StepProgress(novelId: _activeNovel.id!, stepNumber: stepNum, contentText: '', isCompleted: isCompleted),
      );
      final updated = rust.StepProgress(
        id: existing.id,
        novelId: _activeNovel.id!,
        stepNumber: stepNum,
        contentText: existing.contentText,
        isCompleted: isCompleted,
      );
      await rust.saveStepProgress(progress: updated);
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
        orElse: () => rust.StepProgress(
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
        final updated = rust.Chapter(
          id: _selectedChapter!.id,
          novelId: _selectedChapter!.novelId,
          title: _chapterTitleCtrl.text,
          content: _chapterCtrl.text,
          sortOrder: _selectedChapter!.sortOrder,
        );
        await rust.saveChapter(chapter: updated);
        await _loadChapters();

        int totalWords = 0;
        for (var c in _chapters) {
          totalWords += _countWordsFromText(c.content);
        }
        _activeNovel = rust.Novel(
          id: _activeNovel.id,
          title: _activeNovel.title,
          genre: _activeNovel.genre,
          targetAudience: _activeNovel.targetAudience,
          targetWordCount: _activeNovel.targetWordCount,
          currentWordCount: totalWords,
          createdAt: _activeNovel.createdAt,
        );
        await rust.updateNovel(
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
          await rust.saveStepProgress(
            progress: rust.StepProgress(novelId: _activeNovel.id!, stepNumber: 1, contentText: _step1Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 2) {
          await rust.saveStepProgress(
            progress: rust.StepProgress(novelId: _activeNovel.id!, stepNumber: 2, contentText: _step2Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 3 && _selectedCharacter != null) {
          final updated = rust.Character(
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
          await rust.saveCharacter(character: updated);
          await _loadCharacters();
        } else if (stepNum == 4) {
          await rust.saveStepProgress(
            progress: rust.StepProgress(novelId: _activeNovel.id!, stepNumber: 4, contentText: _step4Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 5 && _selectedCharacter != null) {
          final updated = rust.Character(
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
          await rust.saveCharacter(character: updated);
          await _loadCharacters();
        } else if (stepNum == 6) {
          await rust.saveStepProgress(
            progress: rust.StepProgress(novelId: _activeNovel.id!, stepNumber: 6, contentText: _step6Ctrl.text, isCompleted: currentDone),
          );
          await _loadStepsProgress();
        } else if (stepNum == 7 && _selectedCharacter != null) {
          await rust.saveStepProgress(
            progress: rust.StepProgress(
              novelId: _activeNovel.id!,
              stepNumber: 7000 + _selectedCharacter!.id!.toInt(),
              contentText: _step7ChartCtrl.text,
              isCompleted: true,
            ),
          );
          await _loadStepsProgress();
        } else if (stepNum == 8 && _selectedScene != null) {
          final text = _step8SceneCtrl.text;
          final actualWords = _countWordsFromText(text);
          final updated = rust.Scene(
            id: _selectedScene!.id,
            novelId: _selectedScene!.novelId,
            povCharacterId: _selectedScene!.povCharacterId,
            setting: _selectedScene!.setting,
            plotThread: _selectedScene!.plotThread,
            whatHappens: text,
            expectedWordCount: _selectedScene!.expectedWordCount,
            actualWordCount: actualWords,
          );
          await rust.saveScene(scene: updated);
          await _loadScenes();
        } else if (stepNum == 9 && _selectedScene != null) {
          final text = _step9SceneCtrl.text;
          await rust.saveStepProgress(
            progress: rust.StepProgress(
              novelId: _activeNovel.id!,
              stepNumber: 9000 + _selectedScene!.id!.toInt(),
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
    } catch (e) {
      if (showToast && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Save error: $e'), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    }
  }

  void _confirmDeleteDialog({
    required String title,
    required String itemName,
    required VoidCallback onConfirm,
  }) {
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
                foregroundColor: Colors.white,
              ),
              child: Text(widget.language == 'ar' ? 'حذف' : 'Delete'),
            ),
          ],
        ),
      ),
    );
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
      orElse: () => rust.StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
    );
    return _cleanText(step.contentText);
  }

  Future<void> _loadCharacters() async {
    try {
      final list = await rust.getCharacters(novelId: _activeNovel.id!);
      setState(() {
        _characters = list;
      });
    } catch (_) {}
  }

  Future<void> _saveCharacter(rust.Character char) async {
    try {
      await rust.saveCharacter(character: char);
      await _loadCharacters();
    } catch (_) {}
  }

  Future<void> _deleteCharacter(rust.Character char) async {
    _confirmDeleteDialog(
      title: widget.language == 'ar' ? 'حذف الشخصية' : 'Delete Character',
      itemName: char.name,
      onConfirm: () async {
        try {
          await rust.deleteCharacter(id: char.id!.toInt());
          await _loadCharacters();
          setState(() {
            _selectedCharacter = null;
          });
        } catch (_) {}
      },
    );
  }

  Future<void> _loadScenes() async {
    try {
      final list = await rust.getScenes(novelId: _activeNovel.id!);
      setState(() {
        _scenes = list;
      });
    } catch (_) {}
  }

  Future<void> _saveScene(rust.Scene scene) async {
    try {
      await rust.saveScene(scene: scene);
      await _loadScenes();
    } catch (_) {}
  }

  Future<void> _deleteScene(rust.Scene scn) async {
    _confirmDeleteDialog(
      title: widget.language == 'ar' ? 'حذف المشهد' : 'Delete Scene',
      itemName: scn.setting.isNotEmpty ? scn.setting : 'Scene #${scn.id}',
      onConfirm: () async {
        try {
          await rust.deleteScene(id: scn.id!.toInt(), novelId: _activeNovel.id!);
          await _loadScenes();
          setState(() {
            _selectedScene = null;
          });
        } catch (_) {}
      },
    );
  }

  Future<void> _loadChapters() async {
    try {
      final list = await rust.getChapters(novelId: _activeNovel.id!);
      setState(() {
        _chapters = list;
      });
    } catch (_) {}
  }

  Future<void> _saveChapter(rust.Chapter chap) async {
    try {
      await rust.saveChapter(chapter: chap);
      await _loadChapters();
    } catch (_) {}
  }

  Future<void> _deleteChapter(rust.Chapter chap) async {
    _confirmDeleteDialog(
      title: widget.language == 'ar' ? 'حذف الفصل' : 'Delete Chapter',
      itemName: chap.title,
      onConfirm: () async {
        try {
          await rust.deleteChapter(id: chap.id!.toInt());
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('selectChapterPlaceholder')), backgroundColor: Theme.of(context).colorScheme.tertiary),
      );
      return;
    }

    if (format == 'txt') {
      try {
        final textOut = await rust.exportToTxt(titles: titles, contents: contents);
        final path = await FilePicker.platform.saveFile(
          dialogTitle: t('exportTxtBtn'),
          fileName: '${_activeNovel.title}.txt',
          type: FileType.custom,
          allowedExtensions: ['txt'],
        );
        if (path != null) {
          await File(path).writeAsString(textOut);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
          );
        }
      } catch (e) {
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
          await rust.exportToDocx(path: path, titles: titles, contents: contents);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    }
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

  Widget _buildStepHeaderActions(int stepNum, {required bool isMobile}) {
    final isDone = _isStepDone(stepNum);
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      alignment: WrapAlignment.end,
      spacing: 8,
      runSpacing: 4,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(t('markAsCompleted'), style: TextStyle(fontSize: isMobile ? 12 : 14)),
            Checkbox(
              value: isDone,
              onChanged: (val) => _toggleStepCompleted(stepNum, val ?? false),
              visualDensity: isMobile ? VisualDensity.compact : null,
            ),
          ],
        ),
        ElevatedButton.icon(
          onPressed: () => _saveActiveContent(showToast: true),
          icon: const Icon(Icons.save, size: 16),
          label: Text(t('save')),
          style: ElevatedButton.styleFrom(
            padding: isMobile ? const EdgeInsets.symmetric(horizontal: 12, vertical: 8) : null,
          ),
        ),
      ],
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
              color: Theme.of(context).dividerColor.withOpacity(0.5),
            ),
          ),
        ),
      ),
    );
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

  @override
  Widget build(BuildContext context) {
    final textDir = widget.language == 'ar' ? TextDirection.rtl : TextDirection.ltr;
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Directionality(
      textDirection: textDir,
      child: Scaffold(
        drawer: isMobile ? Drawer(child: SafeArea(child: _buildSidebarContent(isMobile: true))) : null,
        appBar: AppBar(
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
              if (!isMobile) ...[
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
              onPressed: () => _showThemeSettingsDialog(context, widget.currentThemeMode, widget.currentSeedColor, widget.useDynamicColor, widget.onThemeSettingsChanged, t),
              icon: const Icon(Icons.palette),
            ),
            IconButton(
              onPressed: () async {
                await _saveActiveContent(showToast: false);
                widget.onClose();
              },
              icon: const Icon(Icons.close),
              color: Theme.of(context).colorScheme.error,
              tooltip: t('close'),
            ),
            const SizedBox(width: 4),
          ],
        ),
        body: isMobile
            ? (_isLoadingStep
                ? const Center(child: CircularProgressIndicator())
                : _buildTabContent(isMobile: true))
            : Row(
                children: [
                  SizedBox(
                    width: _sidebarWidth,
                    child: _buildSidebarContent(isMobile: false),
                  ),
                  _buildResizeDivider(
                    onDrag: (details) {
                      setState(() {
                        final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
                        _sidebarWidth = (_sidebarWidth + delta).clamp(200.0, 500.0);
                      });
                    },
                  ),
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
      onTap: () async {
        if (isMobile) {
          Navigator.pop(context);
        }
        await _saveActiveContent(showToast: false);
        setState(() {
          _selectedTabIndex = index;
        });
        _loadTabContent(index);
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
      onTap: () async {
        if (isMobile) {
          Navigator.pop(context);
        }
        await _saveActiveContent(showToast: false);
        setState(() {
          _selectedTabIndex = index;
        });
        _loadTabContent(index);
      },
    );
  }

  Widget _buildTabContent({required bool isMobile}) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildDashboardTab(isMobile: isMobile);
      case 1:
        return _buildStepEditorTab(t('step1Title'), t('step1Desc'), 0, _step1Ctrl, 1, isMobile: isMobile);
      case 2:
        return _buildStepEditorTab(t('step2Title'), t('step2Desc'), 1, _step2Ctrl, 2, isMobile: isMobile);
      case 3:
        return _buildCharacterBiosTab(isMobile: isMobile);
      case 4:
        return _buildStepEditorTab(t('step4Title'), t('step4Desc'), 2, _step4Ctrl, 4, isMobile: isMobile);
      case 5:
        return _buildCharacterPovSynopsesTab(isMobile: isMobile);
      case 6:
        return _buildStepEditorTab(t('step6Title'), t('step6Desc'), 4, _step6Ctrl, 6, isMobile: isMobile);
      case 7:
        return _buildDetailedCharacterChartsTab(isMobile: isMobile);
      case 8:
        return _buildSceneListMasterDetailTab(isMobile: isMobile);
      case 9:
        return _buildSceneNarrativeOutlinesTab(isMobile: isMobile);
      case 10:
        return _buildExportTab(isMobile: isMobile);
      case 11:
        return _buildWriteNovelTab(isMobile: isMobile);
      default:
        return const Center(child: Text('Unknown tab'));
    }
  }

  Widget _buildDashboardTab({required bool isMobile}) {
    final targetWords = _activeNovel.targetWordCount > 0 ? _activeNovel.targetWordCount : 50000;
    final currentWords = _activeNovel.currentWordCount;
    final progress = (currentWords / targetWords).clamp(0.0, 1.0);

    return SingleChildScrollView(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t('novelDashboardTitle'), style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold)),
          Text(t('novelDashboardDesc'), style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 16),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 12 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  isMobile
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t('writingProgress'), style: const TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text('$currentWords / $targetWords ${t('words')} (${(progress * 100).toStringAsFixed(1)}%)', style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary, fontSize: 12)),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(t('writingProgress'), style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('$currentWords / $targetWords ${t('words')} (${(progress * 100).toStringAsFixed(1)}%)', style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
                          ],
                        ),
                  const SizedBox(height: 12),
                  LinearProgressIndicator(
                    value: progress,
                    minHeight: 10,
                    color: Theme.of(context).colorScheme.primary,
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(5),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          isMobile
              ? Column(
                  children: [
                    _buildStatCard(t('statsCharactersCount'), '${_characters.length}', Icons.people, Theme.of(context).colorScheme.secondary),
                    const SizedBox(height: 8),
                    _buildStatCard(t('statsScenesPlanned'), '${_scenes.length}', Icons.table_chart, Theme.of(context).colorScheme.tertiary),
                    const SizedBox(height: 8),
                    _buildStatCard(t('statsScenesDone'), '${_scenes.where((s) => s.actualWordCount > 0).length}', Icons.check_circle, Colors.teal),
                  ],
                )
              : Row(
                  children: [
                    Expanded(child: _buildStatCard(t('statsCharactersCount'), '${_characters.length}', Icons.people, Theme.of(context).colorScheme.secondary)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildStatCard(t('statsScenesPlanned'), '${_scenes.length}', Icons.table_chart, Theme.of(context).colorScheme.tertiary)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildStatCard(t('statsScenesDone'), '${_scenes.where((s) => s.actualWordCount > 0).length}', Icons.check_circle, Colors.teal)),
                  ],
                ),
          const SizedBox(height: 16),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 12 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t('novelInfoTitle'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  TextFormField(
                    initialValue: _activeNovel.title,
                    decoration: InputDecoration(labelText: t('novelTitleLabel'), border: const OutlineInputBorder()),
                    onChanged: (val) {
                      _activeNovel = rust.Novel(
                        id: _activeNovel.id,
                        title: val,
                        genre: _activeNovel.genre,
                        targetAudience: _activeNovel.targetAudience,
                        targetWordCount: _activeNovel.targetWordCount,
                        currentWordCount: _activeNovel.currentWordCount,
                        createdAt: _activeNovel.createdAt,
                      );
                      rust.updateNovel(
                        id: _activeNovel.id!,
                        title: _activeNovel.title,
                        genre: _activeNovel.genre,
                        targetAudience: _activeNovel.targetAudience,
                        targetWordCount: _activeNovel.targetWordCount,
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  isMobile
                      ? Column(
                          children: [
                            TextFormField(
                              initialValue: _activeNovel.genre,
                              decoration: InputDecoration(labelText: t('novelGenreLabel'), border: const OutlineInputBorder()),
                              onChanged: (val) {
                                _activeNovel = rust.Novel(
                                  id: _activeNovel.id,
                                  title: _activeNovel.title,
                                  genre: val,
                                  targetAudience: _activeNovel.targetAudience,
                                  targetWordCount: _activeNovel.targetWordCount,
                                  currentWordCount: _activeNovel.currentWordCount,
                                  createdAt: _activeNovel.createdAt,
                                );
                                rust.updateNovel(
                                  id: _activeNovel.id!,
                                  title: _activeNovel.title,
                                  genre: _activeNovel.genre,
                                  targetAudience: _activeNovel.targetAudience,
                                  targetWordCount: _activeNovel.targetWordCount,
                                );
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              initialValue: _activeNovel.targetAudience,
                              decoration: InputDecoration(labelText: t('novelAudienceLabel'), border: const OutlineInputBorder()),
                              onChanged: (val) {
                                _activeNovel = rust.Novel(
                                  id: _activeNovel.id,
                                  title: _activeNovel.title,
                                  genre: _activeNovel.genre,
                                  targetAudience: val,
                                  targetWordCount: _activeNovel.targetWordCount,
                                  currentWordCount: _activeNovel.currentWordCount,
                                  createdAt: _activeNovel.createdAt,
                                );
                                rust.updateNovel(
                                  id: _activeNovel.id!,
                                  title: _activeNovel.title,
                                  genre: _activeNovel.genre,
                                  targetAudience: _activeNovel.targetAudience,
                                  targetWordCount: _activeNovel.targetWordCount,
                                );
                              },
                            ),
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: _activeNovel.genre,
                                decoration: InputDecoration(labelText: t('novelGenreLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) {
                                  _activeNovel = rust.Novel(
                                    id: _activeNovel.id,
                                    title: _activeNovel.title,
                                    genre: val,
                                    targetAudience: _activeNovel.targetAudience,
                                    targetWordCount: _activeNovel.targetWordCount,
                                    currentWordCount: _activeNovel.currentWordCount,
                                    createdAt: _activeNovel.createdAt,
                                  );
                                  rust.updateNovel(
                                    id: _activeNovel.id!,
                                    title: _activeNovel.title,
                                    genre: _activeNovel.genre,
                                    targetAudience: _activeNovel.targetAudience,
                                    targetWordCount: _activeNovel.targetWordCount,
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: TextFormField(
                                initialValue: _activeNovel.targetAudience,
                                decoration: InputDecoration(labelText: t('novelAudienceLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) {
                                  _activeNovel = rust.Novel(
                                    id: _activeNovel.id,
                                    title: _activeNovel.title,
                                    genre: _activeNovel.genre,
                                    targetAudience: val,
                                    targetWordCount: _activeNovel.targetWordCount,
                                    currentWordCount: _activeNovel.currentWordCount,
                                    createdAt: _activeNovel.createdAt,
                                  );
                                  rust.updateNovel(
                                    id: _activeNovel.id!,
                                    title: _activeNovel.title,
                                    genre: _activeNovel.genre,
                                    targetAudience: _activeNovel.targetAudience,
                                    targetWordCount: _activeNovel.targetWordCount,
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                  const SizedBox(height: 16),
                  TextFormField(
                    initialValue: '${_activeNovel.targetWordCount}',
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: t('novelTargetWordsLabel'), border: const OutlineInputBorder()),
                    onChanged: (val) {
                      _activeNovel = rust.Novel(
                        id: _activeNovel.id,
                        title: _activeNovel.title,
                        genre: _activeNovel.genre,
                        targetAudience: _activeNovel.targetAudience,
                        targetWordCount: int.tryParse(val) ?? 0,
                        currentWordCount: _activeNovel.currentWordCount,
                        createdAt: _activeNovel.createdAt,
                      );
                      rust.updateNovel(
                        id: _activeNovel.id!,
                        title: _activeNovel.title,
                        genre: _activeNovel.genre,
                        targetAudience: _activeNovel.targetAudience,
                        targetWordCount: _activeNovel.targetWordCount,
                      );
                    },
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: () async {
                      await rust.updateNovel(
                        id: _activeNovel.id!,
                        title: _activeNovel.title,
                        genre: _activeNovel.genre,
                        targetAudience: _activeNovel.targetAudience,
                        targetWordCount: _activeNovel.targetWordCount,
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(widget.language == 'ar' ? 'تم الحفظ بنجاح!' : 'Saved successfully!'), backgroundColor: Theme.of(context).colorScheme.primary),
                      );
                    },
                    icon: const Icon(Icons.save),
                    label: Text(t('save')),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.15),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant), overflow: TextOverflow.ellipsis),
                  Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepEditorTab(String title, String instruction, int referenceStepNum, TextEditingController controller, int stepNum, {required bool isMobile}) {
    final refText = referenceStepNum > 0 ? _getStepContentText(referenceStepNum) : '';

    return Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isMobile) ...[
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _buildStepHeaderActions(stepNum, isMobile: true),
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                _buildStepHeaderActions(stepNum, isMobile: false),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Text(instruction, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 12),
          if (referenceStepNum > 0) ...[
            ExpansionTile(
              leading: Icon(Icons.auto_stories, color: Theme.of(context).colorScheme.primary),
              title: Text('${t('referenceToStep')} $referenceStepNum', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 140),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Text(refText, style: const TextStyle(fontSize: 12, height: 1.5)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          Expanded(
            child: Card(
              margin: EdgeInsets.zero,
              child: NativeTextEditor(
                controller: controller,
                wordCountLabel: t('words'),
              ),
            ),
          )
        ],
      ),
    );
  }

  // STEP 3: Major Character Bios Setup Sheet
  Widget _buildCharacterBiosTab({required bool isMobile}) {
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(16),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    t('charactersTitle'),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  onPressed: () => _openCharacterDialog(),
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary),
                  tooltip: t('addCharacterBtn'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _characters.isEmpty
                ? Center(child: Text(t('noCharactersYet'), textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)))
                : ListView.builder(
                    itemCount: _characters.length,
                    itemBuilder: (context, index) {
                      final char = _characters[index];
                      final isSelected = _selectedCharacter?.id == char.id;
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(char.name.isNotEmpty ? char.name[0].toUpperCase() : '?'),
                        ),
                        title: Text(char.name, style: const TextStyle(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                        subtitle: Text(char.motivation, maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        trailing: IconButton(
                          icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 18),
                          onPressed: () => _deleteCharacter(char),
                        ),
                        onTap: () async {
                          await _saveActiveContent(showToast: false);
                          setState(() {
                            _selectedCharacter = char;
                            _step3SummaryCtrl.text = _cleanText(char.oneParagraphSummary);
                          });
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );

    Widget detailPane = Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (isMobile)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() => _selectedCharacter = null),
                ),
              Expanded(
                child: Text(
                  t('step3Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepHeaderActions(3, isMobile: isMobile),
            ],
          ),
          const SizedBox(height: 12),
          _selectedCharacter == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectCharPlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              _selectedCharacter!.name,
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => _openCharacterDialog(_selectedCharacter),
                            icon: const Icon(Icons.edit, size: 16),
                            label: Text(t('edit')),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Card(
                        margin: EdgeInsets.zero,
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${t('charMotivationLabel')}: ${_selectedCharacter!.motivation}'),
                              const SizedBox(height: 4),
                              Text('${t('charGoalLabel')}: ${_selectedCharacter!.goal}'),
                              const SizedBox(height: 4),
                              Text('${t('charConflictLabel')}: ${_selectedCharacter!.conflict}'),
                              const SizedBox(height: 4),
                              Text('${t('charEpiphanyLabel')}: ${_selectedCharacter!.epiphany}'),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(t('charSummaryLabel'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: NativeTextEditor(
                            controller: _step3SummaryCtrl,
                            wordCountLabel: t('words'),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        ],
      ),
    );

    if (isMobile) {
      return _selectedCharacter == null ? listPane : detailPane;
    }

    return Row(
      children: [
        SizedBox(width: _listPaneWidth, child: listPane),
        _buildResizeDivider(
          onDrag: (details) {
            setState(() {
              final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
              _listPaneWidth = (_listPaneWidth + delta).clamp(200.0, 550.0);
            });
          },
        ),
        Expanded(child: detailPane),
      ],
    );
  }

  void _openCharacterDialog([rust.Character? existing]) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final motCtrl = TextEditingController(text: existing?.motivation ?? '');
    final goalCtrl = TextEditingController(text: existing?.goal ?? '');
    final conflictCtrl = TextEditingController(text: existing?.conflict ?? '');
    final epiphanyCtrl = TextEditingController(text: existing?.epiphany ?? '');

    showDialog(
      context: context,
      builder: (context) => Directionality(
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
            TextButton(onPressed: () => Navigator.pop(context), child: Text(t('cancel'))),
            ElevatedButton(
              onPressed: () async {
                final char = rust.Character(
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
                if (mounted) Navigator.pop(context);
              },
              child: Text(t('save')),
            ),
          ],
        ),
      ),
    );
  }

  // STEP 5: Character POV Synopses (1 page story narrative from character's POV)
  Widget _buildCharacterPovSynopsesTab({required bool isMobile}) {
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(16),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              t('charSynopsesTitle'),
              style: const TextStyle(fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _characters.isEmpty
                ? Center(child: Text(t('pleaseAddCharsFirst'), textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)))
                : ListView.builder(
                    itemCount: _characters.length,
                    itemBuilder: (context, index) {
                      final char = _characters[index];
                      final isSelected = _selectedCharacter?.id == char.id;
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(char.name.isNotEmpty ? char.name[0].toUpperCase() : '?'),
                        ),
                        title: Text(char.name, style: const TextStyle(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                        subtitle: Text(char.motivation, maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        onTap: () async {
                          await _saveActiveContent(showToast: false);
                          setState(() {
                            _selectedCharacter = char;
                            _step5SynopsisCtrl.text = _cleanText(char.fullSynopsis);
                          });
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );

    Widget detailPane = Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (isMobile)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() => _selectedCharacter = null),
                ),
              Expanded(
                child: Text(
                  t('step5Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepHeaderActions(5, isMobile: isMobile),
            ],
          ),
          const SizedBox(height: 12),
          _selectedCharacter == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectCharPlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${_selectedCharacter!.name} - ${t('charExtendedSynopsisLabel')}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ExpansionTile(
                        leading: Icon(Icons.person, color: Theme.of(context).colorScheme.primary),
                        title: Text('${_selectedCharacter!.name} (${t('charRefBioLabel')} Step 3)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 140),
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${t('charMotivationLabel')}: ${_selectedCharacter!.motivation}'),
                                  Text('${t('charGoalLabel')}: ${_selectedCharacter!.goal}'),
                                  Text('${t('charConflictLabel')}: ${_selectedCharacter!.conflict}'),
                                  Text('${t('charEpiphanyLabel')}: ${_selectedCharacter!.epiphany}'),
                                  const SizedBox(height: 4),
                                  Text('${t('charSummaryLabel')}: ${_cleanText(_selectedCharacter!.oneParagraphSummary)}'),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Expanded(
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: NativeTextEditor(
                            controller: _step5SynopsisCtrl,
                            wordCountLabel: t('words'),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        ],
      ),
    );

    if (isMobile) {
      return _selectedCharacter == null ? listPane : detailPane;
    }

    return Row(
      children: [
        SizedBox(width: _listPaneWidth, child: listPane),
        _buildResizeDivider(
          onDrag: (details) {
            setState(() {
              final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
              _listPaneWidth = (_listPaneWidth + delta).clamp(200.0, 550.0);
            });
          },
        ),
        Expanded(child: detailPane),
      ],
    );
  }

  // STEP 7: Detailed Character Charts (Independent per-character chart notes)
  Widget _buildDetailedCharacterChartsTab({required bool isMobile}) {
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(16),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              t('charChartsTitle'),
              style: const TextStyle(fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _characters.isEmpty
                ? Center(child: Text(t('pleaseAddCharsFirst'), textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)))
                : ListView.builder(
                    itemCount: _characters.length,
                    itemBuilder: (context, index) {
                      final char = _characters[index];
                      final isSelected = _selectedCharacter?.id == char.id;
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(char.name.isNotEmpty ? char.name[0].toUpperCase() : '?'),
                        ),
                        title: Text(char.name, style: const TextStyle(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                        subtitle: Text(char.motivation, maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        onTap: () async {
                          await _saveActiveContent(showToast: false);
                          setState(() {
                            _selectedCharacter = char;
                          });
                          final chartStep = _allStepsProgress.firstWhere(
                            (s) => s.stepNumber == (7000 + char.id!.toInt()),
                            orElse: () => rust.StepProgress(novelId: _activeNovel.id!, stepNumber: 7000 + char.id!.toInt(), contentText: '', isCompleted: false),
                          );
                          _step7ChartCtrl.text = _cleanText(chartStep.contentText);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );

    Widget detailPane = Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (isMobile)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() => _selectedCharacter = null),
                ),
              Expanded(
                child: Text(
                  t('step7Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepHeaderActions(7, isMobile: isMobile),
            ],
          ),
          const SizedBox(height: 12),
          _selectedCharacter == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectCharPlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${_selectedCharacter!.name} - ${t('charChartsTitle')}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ExpansionTile(
                        leading: Icon(Icons.badge, color: Theme.of(context).colorScheme.primary),
                        title: Text('${_selectedCharacter!.name} (${t('charRefBioLabel')} Step 3)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 140),
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${t('charMotivationLabel')}: ${_selectedCharacter!.motivation}'),
                                  Text('${t('charGoalLabel')}: ${_selectedCharacter!.goal}'),
                                  Text('${t('charConflictLabel')}: ${_selectedCharacter!.conflict}'),
                                  Text('${t('charEpiphanyLabel')}: ${_selectedCharacter!.epiphany}'),
                                  const SizedBox(height: 4),
                                  Text('${t('charSummaryLabel')}: ${_cleanText(_selectedCharacter!.oneParagraphSummary)}'),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Expanded(
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: NativeTextEditor(
                            controller: _step7ChartCtrl,
                            wordCountLabel: t('words'),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        ],
      ),
    );

    if (isMobile) {
      return _selectedCharacter == null ? listPane : detailPane;
    }

    return Row(
      children: [
        SizedBox(width: _listPaneWidth, child: listPane),
        _buildResizeDivider(
          onDrag: (details) {
            setState(() {
              final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
              _listPaneWidth = (_listPaneWidth + delta).clamp(200.0, 550.0);
            });
          },
        ),
        Expanded(child: detailPane),
      ],
    );
  }

  // STEP 8: Scene List Spreadsheet (Master-Detail Split Editor)
  Widget _buildSceneListMasterDetailTab({required bool isMobile}) {
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(16),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    t('scenesTitle'),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  onPressed: () => _openSceneMetadataDialog(),
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary),
                  tooltip: t('addSceneBtn'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _scenes.isEmpty
                ? Center(child: Text(t('noScenesYet'), textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)))
                : ListView.builder(
                    itemCount: _scenes.length,
                    itemBuilder: (context, index) {
                      final scn = _scenes[index];
                      final isSelected = _selectedScene?.id == scn.id;
                      final povChar = _characters.firstWhere(
                        (c) => c.id == scn.povCharacterId,
                        orElse: () => rust.Character(novelId: 0, name: t('sceneNotPlanned'), motivation: '', goal: '', conflict: '', epiphany: '', oneParagraphSummary: '', fullSynopsis: ''),
                      );

                      return ListTile(
                        title: Text('${t('sceneNumber')} #${index + 1}: ${scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned')}', overflow: TextOverflow.ellipsis),
                        subtitle: Text('${povChar.name} | ${scn.plotThread}', maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        trailing: IconButton(
                          icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 18),
                          onPressed: () => _deleteScene(scn),
                        ),
                        onTap: () async {
                          await _saveActiveContent(showToast: false);
                          setState(() {
                            _selectedScene = scn;
                            _step8SceneCtrl.text = _cleanText(scn.whatHappens);
                          });
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );

    Widget detailPane = Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (isMobile)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() => _selectedScene = null),
                ),
              Expanded(
                child: Text(
                  t('step8Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepHeaderActions(8, isMobile: isMobile),
            ],
          ),
          const SizedBox(height: 12),
          _selectedScene == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectScenePlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              '${t('sceneNumber')} - ${_selectedScene!.setting}',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => _openSceneMetadataDialog(_selectedScene),
                            icon: const Icon(Icons.edit, size: 16),
                            label: Text(t('edit')),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Card(
                        margin: EdgeInsets.zero,
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Flexible(
                                    child: Text(
                                      '${t('scenePovCol')}: ${_characters.firstWhere((c) => c.id == _selectedScene!.povCharacterId, orElse: () => rust.Character(novelId: 0, name: t('sceneNotPlanned'), motivation: '', goal: '', conflict: '', epiphany: '', oneParagraphSummary: '', fullSynopsis: '')).name}',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text('${t('sceneWordsCol')}: ${_selectedScene!.expectedWordCount} / ${_selectedScene!.actualWordCount}'),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text('${t('scenePlotCol')}: ${_selectedScene!.plotThread}'),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(t('sceneWhatHappensLabel'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: NativeTextEditor(
                            controller: _step8SceneCtrl,
                            wordCountLabel: t('words'),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        ],
      ),
    );

    if (isMobile) {
      return _selectedScene == null ? listPane : detailPane;
    }

    return Row(
      children: [
        SizedBox(width: _listPaneWidth, child: listPane),
        _buildResizeDivider(
          onDrag: (details) {
            setState(() {
              final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
              _listPaneWidth = (_listPaneWidth + delta).clamp(200.0, 550.0);
            });
          },
        ),
        Expanded(child: detailPane),
      ],
    );
  }

  void _openSceneMetadataDialog([rust.Scene? existing]) {
    int? selectedPovId = existing?.povCharacterId;
    final settingCtrl = TextEditingController(text: existing?.setting ?? '');
    final plotCtrl = TextEditingController(text: existing?.plotThread ?? '');
    final expWordsCtrl = TextEditingController(text: '${existing?.expectedWordCount ?? 1000}');

    showDialog(
      context: context,
      builder: (context) => Directionality(
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
                      value: selectedPovId,
                      decoration: InputDecoration(labelText: t('scenePovLabel')),
                      items: _characters.map((c) => DropdownMenuItem<int>(value: c.id?.toInt(), child: Text(c.name, overflow: TextOverflow.ellipsis))).toList(),
                      onChanged: (val) => setDialogState(() => selectedPovId = val),
                    ),
                    TextField(controller: settingCtrl, decoration: InputDecoration(labelText: t('sceneSettingLabel'))),
                    TextField(controller: plotCtrl, decoration: InputDecoration(labelText: t('scenePlotLabel'))),
                    TextField(controller: expWordsCtrl, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: t('sceneExpectedWordsLabel'))),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: Text(t('cancel'))),
              ElevatedButton(
                onPressed: () async {
                  final scn = rust.Scene(
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
                  if (mounted) Navigator.pop(context);
                },
                child: Text(t('save')),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // STEP 9: Scene Narrative Outlines
  Widget _buildSceneNarrativeOutlinesTab({required bool isMobile}) {
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(16),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              t('scenesListLabel'),
              style: const TextStyle(fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _scenes.isEmpty
                ? Center(child: Text(t('pleaseAddScenesFirst'), textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)))
                : ListView.builder(
                    itemCount: _scenes.length,
                    itemBuilder: (context, index) {
                      final scn = _scenes[index];
                      final isSelected = _selectedScene?.id == scn.id;
                      return ListTile(
                        title: Text('${t('sceneNumber')} #${index + 1}: ${scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned')}', overflow: TextOverflow.ellipsis),
                        subtitle: Text(scn.plotThread, maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        onTap: () async {
                          await _saveActiveContent(showToast: false);
                          setState(() {
                            _selectedScene = scn;
                          });
                          final step9Prog = _allStepsProgress.firstWhere(
                            (s) => s.stepNumber == (9000 + scn.id!.toInt()),
                            orElse: () => rust.StepProgress(novelId: _activeNovel.id!, stepNumber: 9000 + scn.id!.toInt(), contentText: '', isCompleted: false),
                          );
                          _step9SceneCtrl.text = _cleanText(step9Prog.contentText);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );

    Widget detailPane = Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (isMobile)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() => _selectedScene = null),
                ),
              Expanded(
                child: Text(
                  t('step9Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepHeaderActions(9, isMobile: isMobile),
            ],
          ),
          const SizedBox(height: 12),
          _selectedScene == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectScenePlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${t('sceneNumber')} - ${_selectedScene!.setting}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ExpansionTile(
                        leading: Icon(Icons.table_chart, color: Theme.of(context).colorScheme.primary),
                        title: Text('${t('sceneSummaryLabel')} - ${t('referenceToStep')} 8', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 140),
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${t('scenePovCol')}: ${_characters.firstWhere((c) => c.id == _selectedScene!.povCharacterId, orElse: () => rust.Character(novelId: 0, name: t('sceneNotPlanned'), motivation: '', goal: '', conflict: '', epiphany: '', oneParagraphSummary: '', fullSynopsis: '')).name}',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  Text('${t('scenePlotCol')}: ${_selectedScene!.plotThread}'),
                                  const SizedBox(height: 6),
                                  Text('${t('sceneWhatHappensLabel')}: ${_cleanText(_selectedScene!.whatHappens)}'),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(t('sceneNarrativeTextareaLabel'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: NativeTextEditor(
                            controller: _step9SceneCtrl,
                            wordCountLabel: t('words'),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        ],
      ),
    );

    if (isMobile) {
      return _selectedScene == null ? listPane : detailPane;
    }

    return Row(
      children: [
        SizedBox(width: _listPaneWidth, child: listPane),
        _buildResizeDivider(
          onDrag: (details) {
            setState(() {
              final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
              _listPaneWidth = (_listPaneWidth + delta).clamp(200.0, 550.0);
            });
          },
        ),
        Expanded(child: detailPane),
      ],
    );
  }

  // STEP 10: Complete Novel Overview & Export
  Widget _buildExportTab({required bool isMobile}) {
    final StringBuffer sb = StringBuffer();
    sb.writeln('# ${_activeNovel.title}\n');
    sb.writeln('**${t('novelGenreLabel')}**: ${_activeNovel.genre}');
    sb.writeln('**${t('novelAudienceLabel')}**: ${_activeNovel.targetAudience}');
    sb.writeln('**${t('novelTargetWordsLabel')}**: ${_activeNovel.targetWordCount}');
    sb.writeln('\n---\n');

    sb.writeln('## Step 1: ${t('step1Title')}');
    sb.writeln('${_getStepContentText(1)}\n');

    sb.writeln('## Step 2: ${t('step2Title')}');
    sb.writeln('${_getStepContentText(2)}\n');

    sb.writeln('## Step 3: ${t('step3Title')}');
    for (var c in _characters) {
      sb.writeln('### ${c.name}');
      sb.writeln('- **Motivation**: ${c.motivation}');
      sb.writeln('- **Goal**: ${c.goal}');
      sb.writeln('- **Conflict**: ${c.conflict}');
      sb.writeln('- **Epiphany**: ${c.epiphany}');
      sb.writeln('- **Summary**: ${_cleanText(c.oneParagraphSummary)}\n');
    }

    sb.writeln('## Step 4: ${t('step4Title')}');
    sb.writeln('${_getStepContentText(4)}\n');

    sb.writeln('## Step 5: ${t('step5Title')}');
    for (var c in _characters) {
      sb.writeln('### ${c.name} POV Synopsis');
      sb.writeln('${_cleanText(c.fullSynopsis)}\n');
    }

    sb.writeln('## Step 6: ${t('step6Title')}');
    sb.writeln('${_getStepContentText(6)}\n');

    sb.writeln('## Step 7: ${t('step7Title')}');
    for (var c in _characters) {
      final chart = _allStepsProgress.firstWhere(
        (s) => s.stepNumber == (7000 + c.id!.toInt()),
        orElse: () => rust.StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
      );
      sb.writeln('### ${c.name} Detailed Chart');
      sb.writeln('${_cleanText(chart.contentText)}\n');
    }

    sb.writeln('## Step 8 & 9: Scenes Narrative');
    for (int i = 0; i < _scenes.length; i++) {
      final scn = _scenes[i];
      final step9Prog = _allStepsProgress.firstWhere(
        (s) => s.stepNumber == (9000 + scn.id!.toInt()),
        orElse: () => rust.StepProgress(novelId: 0, stepNumber: 0, contentText: '', isCompleted: false),
      );
      sb.writeln('### Scene #${i + 1}: ${scn.setting}');
      sb.writeln('- **Plot Thread**: ${scn.plotThread}');
      sb.writeln('- **Summary**: ${_cleanText(scn.whatHappens)}');
      sb.writeln('- **Detailed Outline**:\n${_cleanText(step9Prog.contentText)}\n');
    }

    if (_chapters.isNotEmpty) {
      sb.writeln('## Novel Chapters');
      for (var chap in _chapters) {
        sb.writeln('### ${chap.title}');
        sb.writeln('${_cleanText(chap.content)}\n');
      }
    }

    final mdContent = sb.toString();

    return Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          isMobile
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t('step10Title'),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: mdContent));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
                            );
                          },
                          icon: const Icon(Icons.copy, size: 16),
                          label: Text(t('exportCopyBtn')),
                        ),
                        _buildStepHeaderActions(10, isMobile: true),
                      ],
                    ),
                  ],
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        t('step10Title'),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: mdContent));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(t('exportCopied')), backgroundColor: Theme.of(context).colorScheme.primary),
                            );
                          },
                          icon: const Icon(Icons.copy),
                          label: Text(t('exportCopyBtn')),
                        ),
                        const SizedBox(width: 8),
                        _buildStepHeaderActions(10, isMobile: false),
                      ],
                    ),
                  ],
                ),
          const SizedBox(height: 12),
          Expanded(
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SingleChildScrollView(
                  child: SelectableText(mdContent, style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.5)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWriteNovelTab({required bool isMobile}) {
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(16),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t('chaptersSidebarTitle'), style: const TextStyle(fontWeight: FontWeight.bold)),
                IconButton(
                  onPressed: () async {
                    final newChap = rust.Chapter(
                      novelId: _activeNovel.id!,
                      title: 'Chapter ${_chapters.length + 1}',
                      content: '',
                      sortOrder: _chapters.length.toInt(),
                    );
                    await _saveChapter(newChap);
                  },
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              itemCount: _chapters.length,
              itemBuilder: (context, index) {
                final chap = _chapters[index];
                final isSelected = _selectedChapter?.id == chap.id;
                return ListTile(
                  title: Text(chap.title, overflow: TextOverflow.ellipsis),
                  selected: isSelected,
                  trailing: IconButton(
                    icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 18),
                    onPressed: () => _deleteChapter(chap),
                  ),
                  onTap: () async {
                    await _saveActiveContent(showToast: false);
                    setState(() {
                      _selectedChapter = chap;
                      _chapterTitleCtrl.text = chap.title;
                      _chapterCtrl.text = _cleanText(chap.content);
                    });
                  },
                );
              },
            ),
          )
        ],
      ),
    );

    Widget detailPane = _selectedChapter == null
        ? Center(child: Text(t('selectChapterPlaceholder')))
        : Padding(
            padding: EdgeInsets.all(isMobile ? 12 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isMobile) ...[
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back),
                        onPressed: () => setState(() => _selectedChapter = null),
                      ),
                      Expanded(
                        child: TextFormField(
                          key: ValueKey(_selectedChapter?.id),
                          controller: _chapterTitleCtrl,
                          decoration: InputDecoration(labelText: t('chapterTitleLabel')),
                          onChanged: (val) {
                            _selectedChapter = rust.Chapter(
                              id: _selectedChapter!.id,
                              novelId: _selectedChapter!.novelId,
                              title: val,
                              content: _chapterCtrl.text,
                              sortOrder: _selectedChapter!.sortOrder,
                            );
                            rust.saveChapter(chapter: _selectedChapter!);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => _exportDocument('txt'),
                        icon: const Icon(Icons.article, size: 14),
                        label: Text(t('exportTxtBtn'), style: const TextStyle(fontSize: 11)),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => _exportDocument('docx'),
                        icon: const Icon(Icons.description, size: 14),
                        label: Text(t('exportDocxBtn'), style: const TextStyle(fontSize: 11)),
                      ),
                      IconButton(
                        onPressed: () => _deleteChapter(_selectedChapter!),
                        icon: Icon(Icons.delete, color: Theme.of(context).colorScheme.error, size: 20),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => _saveActiveContent(showToast: true),
                        icon: const Icon(Icons.save, size: 16),
                        label: Text(t('save')),
                      ),
                    ],
                  ),
                ] else ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: TextFormField(
                          key: ValueKey(_selectedChapter?.id),
                          controller: _chapterTitleCtrl,
                          decoration: InputDecoration(labelText: t('chapterTitleLabel')),
                          onChanged: (val) {
                            _selectedChapter = rust.Chapter(
                              id: _selectedChapter!.id,
                              novelId: _selectedChapter!.novelId,
                              title: val,
                              content: _chapterCtrl.text,
                              sortOrder: _selectedChapter!.sortOrder,
                            );
                            rust.saveChapter(chapter: _selectedChapter!);
                          },
                        ),
                      ),
                      const SizedBox(width: 16),
                      Row(
                        children: [
                          OutlinedButton.icon(
                            onPressed: () => _exportDocument('txt'),
                            icon: const Icon(Icons.article),
                            label: Text(t('exportTxtBtn')),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            onPressed: () => _exportDocument('docx'),
                            icon: const Icon(Icons.description),
                            label: Text(t('exportDocxBtn')),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: () => _deleteChapter(_selectedChapter!),
                            icon: Icon(Icons.delete, color: Theme.of(context).colorScheme.error),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: () => _saveActiveContent(showToast: true),
                            icon: const Icon(Icons.save),
                            label: Text(t('save')),
                          ),
                        ],
                      )
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Expanded(
                  child: Card(
                    margin: EdgeInsets.zero,
                    child: NativeTextEditor(
                      controller: _chapterCtrl,
                      wordCountLabel: t('words'),
                    ),
                  ),
                )
              ],
            ),
          );

    if (isMobile) {
      return _selectedChapter == null ? listPane : detailPane;
    }

    return Row(
      children: [
        SizedBox(width: _listPaneWidth, child: listPane),
        _buildResizeDivider(
          onDrag: (details) {
            setState(() {
              final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
              _listPaneWidth = (_listPaneWidth + delta).clamp(200.0, 550.0);
            });
          },
        ),
        Expanded(child: detailPane),
      ],
    );
  }
}

void _showThemeSettingsDialog(BuildContext context, ThemeMode currentMode, Color currentColor, bool useDynamicColor, Function(ThemeMode, Color, bool) onChanged, String Function(String) t) {
  showDialog(
    context: context,
    builder: (ctx) {
      return ThemeSettingsDialog(
        initialMode: currentMode,
        initialColor: currentColor,
        initialDynamicColor: useDynamicColor,
        onChanged: onChanged,
        t: t,
      );
    },
  );
}

class ThemeSettingsDialog extends StatefulWidget {
  final ThemeMode initialMode;
  final Color initialColor;
  final bool initialDynamicColor;
  final Function(ThemeMode, Color, bool) onChanged;
  final String Function(String) t;

  const ThemeSettingsDialog({
    super.key,
    required this.initialMode,
    required this.initialColor,
    required this.initialDynamicColor,
    required this.onChanged,
    required this.t,
  });

  @override
  State<ThemeSettingsDialog> createState() => _ThemeSettingsDialogState();
}

class _ThemeSettingsDialogState extends State<ThemeSettingsDialog> {
  late ThemeMode _mode;
  late Color _color;
  late bool _useDynamic;

  final List<Color> _seedColors = [
    Colors.teal,
    Colors.blue,
    Colors.indigo,
    Colors.deepPurple,
    Colors.pink,
    Colors.red,
    Colors.orange,
    Colors.green,
    Colors.blueGrey,
  ];

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
    _color = widget.initialColor;
    _useDynamic = widget.initialDynamicColor;
  }

  void _apply() {
    widget.onChanged(_mode, _color, _useDynamic);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.t('themeSettings') == 'themeSettings' ? 'Theme Settings' : widget.t('themeSettings')),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.t('appearance') == 'appearance' ? 'Appearance' : widget.t('appearance'), style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode), label: Text('Light')),
                ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode), label: Text('Dark')),
                ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto), label: Text('System')),
              ],
              selected: {_mode},
              onSelectionChanged: (set) {
                setState(() => _mode = set.first);
                _apply();
              },
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(widget.t('useSystemTheme') == 'useSystemTheme' ? 'Use System Theme Color' : widget.t('useSystemTheme'), style: const TextStyle(fontWeight: FontWeight.bold)),
                Switch(
                  value: _useDynamic,
                  onChanged: (val) {
                    setState(() => _useDynamic = val);
                    _apply();
                  },
                ),
              ],
            ),
            if (!_useDynamic) ...[
              const SizedBox(height: 16),
              Text(widget.t('seedColor') == 'seedColor' ? 'Seed Color' : widget.t('seedColor'), style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _seedColors.map((c) {
                  final isSelected = c.value == _color.value;
                  return GestureDetector(
                    onTap: () {
                      setState(() => _color = c);
                      _apply();
                    },
                    child: CircleAvatar(
                      backgroundColor: c,
                      radius: 20,
                      child: isSelected ? const Icon(Icons.check, color: Colors.white) : null,
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(widget.t('close'))),
      ],
    );
  }
}
