import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge_for_generated.dart';

import 'src/rust/api.dart' as rust;
import 'src/rust/frb_generated.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await RustLib.init();
  runApp(const CrystaApp());
}

class CrystaApp extends StatefulWidget {
  const CrystaApp({super.key});

  @override
  State<CrystaApp> createState() => _CrystaAppState();
}

class _CrystaAppState extends State<CrystaApp> {
  ThemeMode _themeMode = ThemeMode.dark;

  void toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Crysta Novel Studio',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.teal,
          brightness: Brightness.light,
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.teal,
          brightness: Brightness.dark,
        ),
      ),
      home: ProjectManagerPage(onThemeToggle: toggleTheme),
    );
  }
}

class ProjectManagerPage extends StatefulWidget {
  final VoidCallback onThemeToggle;
  const ProjectManagerPage({super.key, required this.onThemeToggle});

  @override
  State<ProjectManagerPage> createState() => _ProjectManagerPageState();
}

class _ProjectManagerPageState extends State<ProjectManagerPage> {
  rust.Novel? _currentNovel;
  String? _projectPath;
  List<String> _recentProjects = [];

  @override
  void initState() {
    super.initState();
    _loadRecentProjects();
  }

  Future<void> _loadRecentProjects() async {
    if (Platform.isAndroid || Platform.isIOS) {
      try {
        final dir = await getApplicationDocumentsDirectory();
        final List<String> files = [];
        await for (var entity in dir.list()) {
          if (entity is File && entity.path.endsWith('.crysta')) {
            files.add(entity.path);
          }
        }
        setState(() {
          _recentProjects = files;
        });
      } catch (_) {}
    }
  }

  Future<void> _createNewProject() async {
    String? path;
    if (Platform.isAndroid || Platform.isIOS) {
      final dir = await getApplicationDocumentsDirectory();
      path = '${dir.path}/novel_${DateTime.now().millisecondsSinceEpoch}.crysta';
    } else {
      path = await FilePicker.platform.saveFile(
        dialogTitle: 'Create New Novel Project',
        fileName: 'my_novel.crysta',
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
        setState(() {
          _currentNovel = novel;
          _projectPath = path;
        });
      } catch (e) {
        _showError('Error creating project: $e');
      }
    }
  }

  Future<void> _openProjectFile([String? path]) async {
    path ??= await FilePicker.platform.pickFiles(
      dialogTitle: 'Open Crysta Novel Project',
      type: FileType.custom,
      allowedExtensions: ['crysta'],
    ).then((result) => result?.files.single.path);

    if (path != null) {
      try {
        final novel = await rust.openProject(path: path);
        setState(() {
          _currentNovel = novel;
          _projectPath = path;
        });
      } catch (e) {
        _showError('Error opening project: $e');
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_currentNovel != null && _projectPath != null) {
      return WorkspacePage(
        novel: _currentNovel!,
        projectPath: _projectPath!,
        onClose: () {
          rust.closeProject();
          setState(() {
            _currentNovel = null;
            _projectPath = null;
          });
          _loadRecentProjects();
        },
        onThemeToggle: widget.onThemeToggle,
      );
    }

    return Scaffold(
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600),
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(
                Icons.menu_book,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                'Crysta Novel Studio',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
              Text(
                'Snowflake Outlining & Creative Writing Workspace',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 48),
              ElevatedButton.icon(
                onPressed: _createNewProject,
                icon: const Icon(Icons.create_new_folder),
                label: const Text('Create New Novel (.crysta)'),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => _openProjectFile(),
                icon: const Icon(Icons.file_open),
                label: const Text('Open Existing Project'),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Themes & Settings',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  IconButton(
                    onPressed: widget.onThemeToggle,
                    icon: Icon(
                      Theme.of(context).brightness == Brightness.dark
                          ? Icons.light_mode
                          : Icons.dark_mode,
                    ),
                  ),
                ],
              ),
              if (_recentProjects.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Recent Projects',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    itemCount: _recentProjects.length,
                    itemBuilder: (context, index) {
                      final p = _recentProjects[index];
                      return ListTile(
                        leading: const Icon(Icons.insert_drive_file),
                        title: Text(p.split('/').last),
                        subtitle: Text(p),
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
  }
}

class WorkspacePage extends StatefulWidget {
  final rust.Novel novel;
  final String projectPath;
  final VoidCallback onClose;
  final VoidCallback onThemeToggle;

  const WorkspacePage({
    super.key,
    required this.novel,
    required this.projectPath,
    required this.onClose,
    required this.onThemeToggle,
  });

  @override
  State<WorkspacePage> createState() => _WorkspacePageState();
}

class _WorkspacePageState extends State<WorkspacePage> {
  int _selectedTabIndex = 0;
  late rust.Novel _activeNovel;

  quill.QuillController _quillController = quill.QuillController.basic();
  bool _isLoadingStep = false;
  bool _isStepCompleted = false;

  List<rust.Character> _characters = [];
  rust.Character? _selectedCharacter;

  List<rust.Scene> _scenes = [];
  rust.Scene? _selectedScene;

  List<rust.Chapter> _chapters = [];
  rust.Chapter? _selectedChapter;

  @override
  void initState() {
    super.initState();
    _activeNovel = widget.novel;
    _loadTabContent(_selectedTabIndex);
  }

  Future<void> _loadTabContent(int tabIndex) async {
    setState(() {
      _isLoadingStep = true;
      _selectedCharacter = null;
      _selectedScene = null;
      _selectedChapter = null;
    });

    final int stepNum = _getStepNumberForTab(tabIndex);

    if (stepNum > 0) {
      try {
        final progressList = await rust.getStepsProgress(novelId: _activeNovel.id!);
        final step = progressList.firstWhere(
          (s) => s.stepNumber == stepNum,
          orElse: () => rust.StepProgress(
            novelId: _activeNovel.id!,
            stepNumber: stepNum,
            contentText: '',
            isCompleted: false,
          ),
        );

        _isStepCompleted = step.isCompleted;
        _initQuill(step.contentText);
      } catch (e) {
        _initQuill('');
      }
    } else if (tabIndex == 3 || tabIndex == 5) {
      await _loadCharacters();
    } else if (tabIndex == 7 || tabIndex == 8) {
      await _loadScenes();
      await _loadCharacters();
    } else if (tabIndex == 10) {
      await _loadChapters();
    }

    setState(() {
      _isLoadingStep = false;
    });
  }

  void _initQuill(String content) {
    if (content.isNotEmpty) {
      try {
        final doc = quill.Document.fromJson(jsonDecode(content));
        _quillController = quill.QuillController(
          document: doc,
          selection: const TextSelection.collapsed(offset: 0),
        );
      } catch (_) {
        final doc = quill.Document()..insert(0, content);
        _quillController = quill.QuillController(
          document: doc,
          selection: const TextSelection.collapsed(offset: 0),
        );
      }
    } else {
      _quillController = quill.QuillController.basic();
    }
  }

  int _getStepNumberForTab(int tabIndex) {
    switch (tabIndex) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 6:
        return 6;
      case 9:
        return 9;
      default:
        return 0;
    }
  }

  Future<void> _saveCurrentStep() async {
    final stepNum = _getStepNumberForTab(_selectedTabIndex);
    if (stepNum == 0) return;

    final content = jsonEncode(_quillController.document.toDelta().toJson());
    try {
      await rust.saveStepProgress(
        progress: rust.StepProgress(
          novelId: _activeNovel.id!,
          stepNumber: stepNum,
          contentText: content,
          isCompleted: _isStepCompleted,
        ),
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Changes saved successfully!'), backgroundColor: Colors.teal),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving changes: $e'), backgroundColor: Colors.redAccent),
      );
    }
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
      setState(() {
        _selectedCharacter = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Character saved!'), backgroundColor: Colors.teal),
      );
    } catch (_) {}
  }

  Future<void> _deleteCharacter(int id) async {
    try {
      await rust.deleteCharacter(id: id);
      await _loadCharacters();
      setState(() {
        _selectedCharacter = null;
      });
    } catch (_) {}
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
      setState(() {
        _selectedScene = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Scene saved!'), backgroundColor: Colors.teal),
      );
    } catch (_) {}
  }

  Future<void> _deleteScene(int id) async {
    try {
      await rust.deleteScene(id: id, novelId: _activeNovel.id!);
      await _loadScenes();
      setState(() {
        _selectedScene = null;
      });
    } catch (_) {}
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
      setState(() {
        _selectedChapter = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chapter saved!'), backgroundColor: Colors.teal),
      );
    } catch (_) {}
  }

  Future<void> _deleteChapter(int id) async {
    try {
      await rust.deleteChapter(id: id);
      await _loadChapters();
      setState(() {
        _selectedChapter = null;
      });
    } catch (_) {}
  }

  Future<void> _exportDocument(String format) async {
    final List<String> titles = [];
    final List<String> contents = [];

    for (var chap in _chapters) {
      titles.add(chap.title);
      try {
        final doc = quill.Document.fromJson(jsonDecode(chap.content));
        contents.add(doc.toPlainText());
      } catch (_) {
        contents.add(chap.content);
      }
    }

    if (titles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No content found to export!'), backgroundColor: Colors.orangeAccent),
      );
      return;
    }

    if (format == 'txt') {
      try {
        final textOut = await rust.exportToTxt(titles: titles, contents: contents);
        final path = await FilePicker.platform.saveFile(
          dialogTitle: 'Export Novel to Plain Text',
          fileName: '${_activeNovel.title}.txt',
          type: FileType.custom,
          allowedExtensions: ['txt'],
        );
        if (path != null) {
          await File(path).writeAsString(textOut);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Exported successfully!'), backgroundColor: Colors.teal),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } else if (format == 'docx') {
      try {
        final path = await FilePicker.platform.saveFile(
          dialogTitle: 'Export Novel to Word Document (.docx)',
          fileName: '${_activeNovel.title}.docx',
          type: FileType.custom,
          allowedExtensions: ['docx'],
        );
        if (path != null) {
          await rust.exportToDocx(path: path, titles: titles, contents: contents);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Word Document exported successfully!'), backgroundColor: Colors.teal),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${_activeNovel.title} - Crysta Outliner'),
        actions: [
          IconButton(
            onPressed: widget.onThemeToggle,
            icon: Icon(
              Theme.of(context).brightness == Brightness.dark ? Icons.light_mode : Icons.dark_mode,
            ),
          ),
          ElevatedButton.icon(
            onPressed: widget.onClose,
            icon: const Icon(Icons.close),
            label: const Text('Close Project'),
            style: ElevatedButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.onError,
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Row(
        children: [
          NavigationRail(
            labelType: NavigationRailLabelType.all,
            selectedIndex: _selectedTabIndex,
            onDestinationSelected: (index) {
              setState(() {
                _selectedTabIndex = index;
              });
              _loadTabContent(index);
            },
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.info_outline),
                label: Text('Welcome'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.looks_one),
                label: Text('Step 1'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.looks_two),
                label: Text('Step 2'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.people),
                label: Text('Step 3'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.looks_4),
                label: Text('Step 4'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.assignment_ind),
                label: Text('Step 5'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.looks_6),
                label: Text('Step 6'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.list_alt),
                label: Text('Step 7'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.segment),
                label: Text('Step 8'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.table_rows),
                label: Text('Step 9'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.edit_note),
                label: Text('Write Novel'),
              ),
            ],
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(
            child: _isLoadingStep
                ? const Center(child: CircularProgressIndicator())
                : _buildTabContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    switch (_selectedTabIndex) {
      case 0:
        return _buildWelcomeTab();
      case 1:
        return _buildStepEditorTab(
          'Step 1: One-Sentence Summary',
          'Write a one-sentence summary of your novel. This is your hook (under 15 words if possible), naming the protagonist, conflict, and goal.',
        );
      case 2:
        return _buildStepEditorTab(
          'Step 2: One-Paragraph Summary',
          'Expand your sentence into a full paragraph. Detail the setup, the major conflicts, the crisis, and the ending.',
        );
      case 3:
        return _buildCharacterBiosTab();
      case 4:
        return _buildStepEditorTab(
          'Step 4: One-Page Synopsis',
          'Expand your summary paragraph into a full one-page synopsis. Walk through each major plot point and chapter structure details.',
        );
      case 5:
        return _buildDetailedCharacterSheetsTab();
      case 6:
        return _buildStepEditorTab(
          'Step 6: Four-Page Synopsis',
          'Expand your synopsis to a full four-page story overview, outlining all critical arcs, motivations, and scene directions.',
        );
      case 7:
        return _buildScenesTab();
      case 8:
        return _buildSceneDescriptionsTab();
      case 9:
        return _buildStepEditorTab(
          'Step 9: General Scene Outline',
          'Write down your list of scenes, scene orders, or compile outline notes.',
        );
      case 10:
        return _buildWriteNovelTab();
      default:
        return const Center(child: Text('Unknown tab'));
    }
  }

  Widget _buildWelcomeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome to Crysta',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Active File: ${widget.projectPath}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 24),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'The Snowflake Method',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Crysta guides you through the Snowflake Method of writing a novel. Start with a tiny design concept (Step 1) and slowly grow it, adding characters, scenes, and structures until you have a solid outline ready for writing.',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text('Novel Metadata', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: _activeNovel.title,
            decoration: const InputDecoration(labelText: 'Title'),
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
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            initialValue: _activeNovel.genre,
            decoration: const InputDecoration(labelText: 'Genre'),
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
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            initialValue: _activeNovel.targetAudience,
            decoration: const InputDecoration(labelText: 'Target Audience'),
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
            },
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () async {
              try {
                await rust.updateNovel(
                  id: _activeNovel.id!,
                  title: _activeNovel.title,
                  genre: _activeNovel.genre,
                  targetAudience: _activeNovel.targetAudience,
                  targetWordCount: _activeNovel.targetWordCount,
                );
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Metadata saved!'), backgroundColor: Colors.teal),
                );
              } catch (_) {}
            },
            icon: const Icon(Icons.save),
            label: const Text('Save Metadata'),
          ),
        ],
      ),
    );
  }

  Widget _buildStepEditorTab(String title, String instruction) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              Row(
                children: [
                  const Text('Mark as Completed'),
                  Checkbox(
                    value: _isStepCompleted,
                    onChanged: (val) {
                      setState(() {
                        _isStepCompleted = val ?? false;
                      });
                    },
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: _saveCurrentStep,
                    icon: const Icon(Icons.save),
                    label: const Text('Save'),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 8),
          Text(
            instruction,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    quill.QuillToolbar.simple(
                      configurations: quill.QuillSimpleToolbarConfigurations(
                        controller: _quillController,
                        showAlignmentButtons: false,
                        showCenterAlignment: false,
                        showFontFamily: false,
                        showFontSize: false,
                      ),
                    ),
                    const Divider(height: 1),
                    Expanded(
                      child: quill.QuillEditor.basic(
                        configurations: quill.QuillEditorConfigurations(
                          controller: _quillController,
                          readOnly: false,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildCharacterBiosTab() {
    return Row(
      children: [
        SizedBox(
          width: 250,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      _selectedCharacter = rust.Character(
                        novelId: _activeNovel.id!,
                        name: 'New Character',
                        motivation: '',
                        goal: '',
                        conflict: '',
                        epiphany: '',
                        oneParagraphSummary: '',
                        fullSynopsis: '',
                      );
                    });
                  },
                  icon: const Icon(Icons.person_add),
                  label: const Text('Add Character'),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _characters.length,
                  itemBuilder: (context, index) {
                    final char = _characters[index];
                    return ListTile(
                      title: Text(char.name),
                      selected: _selectedCharacter?.id == char.id,
                      onTap: () {
                        setState(() {
                          _selectedCharacter = char;
                        });
                      },
                    );
                  },
                ),
              )
            ],
          ),
        ),
        const VerticalDivider(width: 1),
        Expanded(
          child: _selectedCharacter == null
              ? const Center(child: Text('Select or create a character to edit.'))
              : _buildCharacterForm(),
        )
      ],
    );
  }

  Widget _buildCharacterForm() {
    final nameCtrl = TextEditingController(text: _selectedCharacter!.name);
    final motCtrl = TextEditingController(text: _selectedCharacter!.motivation);
    final goalCtrl = TextEditingController(text: _selectedCharacter!.goal);
    final confCtrl = TextEditingController(text: _selectedCharacter!.conflict);
    final epCtrl = TextEditingController(text: _selectedCharacter!.epiphany);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Edit Character Profile',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Row(
                children: [
                  if (_selectedCharacter!.id != null)
                    IconButton(
                      onPressed: () => _deleteCharacter(_selectedCharacter!.id!.toInt()),
                      icon: const Icon(Icons.delete, color: Colors.redAccent),
                    ),
                  ElevatedButton(
                    onPressed: () {
                      final updated = rust.Character(
                        id: _selectedCharacter!.id,
                        novelId: _selectedCharacter!.novelId,
                        name: nameCtrl.text,
                        motivation: motCtrl.text,
                        goal: goalCtrl.text,
                        conflict: confCtrl.text,
                        epiphany: epCtrl.text,
                        oneParagraphSummary: _selectedCharacter!.oneParagraphSummary,
                        fullSynopsis: _selectedCharacter!.fullSynopsis,
                      );
                      _saveCharacter(updated);
                    },
                    child: const Text('Save Profile'),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: nameCtrl,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: motCtrl,
            decoration: const InputDecoration(labelText: 'Motivation'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: goalCtrl,
            decoration: const InputDecoration(labelText: 'Goal'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: confCtrl,
            decoration: const InputDecoration(labelText: 'Conflict'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: epCtrl,
            decoration: const InputDecoration(labelText: 'Epiphany'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailedCharacterSheetsTab() {
    return Row(
      children: [
        SizedBox(
          width: 250,
          child: ListView.builder(
            itemCount: _characters.length,
            itemBuilder: (context, index) {
              final char = _characters[index];
              return ListTile(
                title: Text(char.name),
                selected: _selectedCharacter?.id == char.id,
                onTap: () {
                  setState(() {
                    _selectedCharacter = char;
                    _initQuill(char.fullSynopsis);
                  });
                },
              );
            },
          ),
        ),
        const VerticalDivider(width: 1),
        Expanded(
          child: _selectedCharacter == null
              ? const Center(child: Text('Select a character to edit their detailed sheet.'))
              : Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${_selectedCharacter!.name} - Character Sheet',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          ElevatedButton.icon(
                            onPressed: () async {
                              final content = jsonEncode(_quillController.document.toDelta().toJson());
                              final updated = rust.Character(
                                id: _selectedCharacter!.id,
                                novelId: _selectedCharacter!.novelId,
                                name: _selectedCharacter!.name,
                                motivation: _selectedCharacter!.motivation,
                                goal: _selectedCharacter!.goal,
                                conflict: _selectedCharacter!.conflict,
                                epiphany: _selectedCharacter!.epiphany,
                                oneParagraphSummary: _selectedCharacter!.oneParagraphSummary,
                                fullSynopsis: content,
                              );
                              await _saveCharacter(updated);
                            },
                            icon: const Icon(Icons.save),
                            label: const Text('Save Sheet'),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              children: [
                                quill.QuillToolbar.simple(
                                  configurations: quill.QuillSimpleToolbarConfigurations(
                                    controller: _quillController,
                                    showAlignmentButtons: false,
                                    showCenterAlignment: false,
                                  ),
                                ),
                                const Divider(height: 1),
                                Expanded(
                                  child: quill.QuillEditor.basic(
                                    configurations: quill.QuillEditorConfigurations(
                                      controller: _quillController,
                                      readOnly: false,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        )
      ],
    );
  }

  Widget _buildScenesTab() {
    return Row(
      children: [
        SizedBox(
          width: 250,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      _selectedScene = rust.Scene(
                        novelId: _activeNovel.id!,
                        povCharacterId: _characters.isNotEmpty ? _characters.first.id : null,
                        setting: 'New Setting',
                        plotThread: '',
                        whatHappens: '',
                        expectedWordCount: 1500,
                        actualWordCount: 0,
                      );
                    });
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Add Scene'),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _scenes.length,
                  itemBuilder: (context, index) {
                    final scene = _scenes[index];
                    return ListTile(
                      title: Text('Scene ${index + 1}: ${scene.setting}'),
                      selected: _selectedScene?.id == scene.id,
                      onTap: () {
                        setState(() {
                          _selectedScene = scene;
                        });
                      },
                    );
                  },
                ),
              )
            ],
          ),
        ),
        const VerticalDivider(width: 1),
        Expanded(
          child: _selectedScene == null
              ? const Center(child: Text('Select or create a scene.'))
              : _buildSceneForm(),
        )
      ],
    );
  }

  Widget _buildSceneForm() {
    final setCtrl = TextEditingController(text: _selectedScene!.setting);
    final plotCtrl = TextEditingController(text: _selectedScene!.plotThread);
    final expCtrl = TextEditingController(text: _selectedScene!.expectedWordCount.toString());
    final actCtrl = TextEditingController(text: _selectedScene!.actualWordCount.toString());
    PlatformInt64? povId = _selectedScene!.povCharacterId;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Edit Scene details',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Row(
                children: [
                  if (_selectedScene!.id != null)
                    IconButton(
                      onPressed: () => _deleteScene(_selectedScene!.id!.toInt()),
                      icon: const Icon(Icons.delete, color: Colors.redAccent),
                    ),
                  ElevatedButton(
                    onPressed: () {
                      final updated = rust.Scene(
                        id: _selectedScene!.id,
                        novelId: _selectedScene!.novelId,
                        povCharacterId: povId,
                        setting: setCtrl.text,
                        plotThread: plotCtrl.text,
                        whatHappens: _selectedScene!.whatHappens,
                        expectedWordCount: int.tryParse(expCtrl.text) ?? 1500,
                        actualWordCount: int.tryParse(actCtrl.text) ?? 0,
                      );
                      _saveScene(updated);
                    },
                    child: const Text('Save Scene'),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: setCtrl,
            decoration: const InputDecoration(labelText: 'Setting'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: plotCtrl,
            decoration: const InputDecoration(labelText: 'Plot Thread'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<PlatformInt64>(
            value: povId,
            decoration: const InputDecoration(labelText: 'POV Character'),
            items: _characters.map((c) {
              return DropdownMenuItem<PlatformInt64>(
                value: c.id,
                child: Text(c.name),
              );
            }).toList(),
            onChanged: (val) {
              povId = val;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: expCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Expected Word Count'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: actCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Actual Word Count'),
          ),
        ],
      ),
    );
  }

  Widget _buildSceneDescriptionsTab() {
    return Row(
      children: [
        SizedBox(
          width: 250,
          child: ListView.builder(
            itemCount: _scenes.length,
            itemBuilder: (context, index) {
              final scene = _scenes[index];
              return ListTile(
                title: Text('Scene ${index + 1}: ${scene.setting}'),
                selected: _selectedScene?.id == scene.id,
                onTap: () {
                  setState(() {
                    _selectedScene = scene;
                    _initQuill(scene.whatHappens);
                  });
                },
              );
            },
          ),
        ),
        const VerticalDivider(width: 1),
        Expanded(
          child: _selectedScene == null
              ? const Center(child: Text('Select a scene to write its description.'))
              : Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Scene Description - ${_selectedScene!.setting}',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          ElevatedButton.icon(
                            onPressed: () async {
                              final content = jsonEncode(_quillController.document.toDelta().toJson());
                              final updated = rust.Scene(
                                id: _selectedScene!.id,
                                novelId: _selectedScene!.novelId,
                                povCharacterId: _selectedScene!.povCharacterId,
                                setting: _selectedScene!.setting,
                                plotThread: _selectedScene!.plotThread,
                                whatHappens: content,
                                expectedWordCount: _selectedScene!.expectedWordCount,
                                actualWordCount: _selectedScene!.actualWordCount,
                              );
                              await _saveScene(updated);
                            },
                            icon: const Icon(Icons.save),
                            label: const Text('Save Description'),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              children: [
                                quill.QuillToolbar.simple(
                                  configurations: quill.QuillSimpleToolbarConfigurations(
                                    controller: _quillController,
                                    showAlignmentButtons: false,
                                    showCenterAlignment: false,
                                  ),
                                ),
                                const Divider(height: 1),
                                Expanded(
                                  child: quill.QuillEditor.basic(
                                    configurations: quill.QuillEditorConfigurations(
                                      controller: _quillController,
                                      readOnly: false,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        )
      ],
    );
  }

  Widget _buildWriteNovelTab() {
    return Row(
      children: [
        SizedBox(
          width: 250,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _selectedChapter = rust.Chapter(
                            novelId: _activeNovel.id!,
                            title: 'Chapter ${_chapters.length + 1}',
                            content: '',
                            sortOrder: _chapters.length,
                          );
                          _initQuill('');
                        });
                      },
                      icon: const Icon(Icons.library_add),
                      label: const Text('New Chapter'),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        OutlinedButton(
                          onPressed: () => _exportDocument('txt'),
                          child: const Text('Export .txt'),
                        ),
                        OutlinedButton(
                          onPressed: () => _exportDocument('docx'),
                          child: const Text('Export .docx'),
                        ),
                      ],
                    )
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _chapters.length,
                  itemBuilder: (context, index) {
                    final chap = _chapters[index];
                    return ListTile(
                      title: Text(chap.title),
                      selected: _selectedChapter?.id == chap.id,
                      onTap: () {
                        setState(() {
                          _selectedChapter = chap;
                          _initQuill(chap.content);
                        });
                      },
                    );
                  },
                ),
              )
            ],
          ),
        ),
        const VerticalDivider(width: 1),
        Expanded(
          child: _selectedChapter == null
              ? const Center(child: Text('Add a chapter or select one to begin writing your novel.'))
              : Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: _selectedChapter!.title,
                              decoration: const InputDecoration(labelText: 'Chapter Title'),
                              onChanged: (val) {
                                _selectedChapter = rust.Chapter(
                                  id: _selectedChapter!.id,
                                  novelId: _selectedChapter!.novelId,
                                  title: val,
                                  content: _selectedChapter!.content,
                                  sortOrder: _selectedChapter!.sortOrder,
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Row(
                            children: [
                              IconButton(
                                onPressed: () => _deleteChapter(_selectedChapter!.id!.toInt()),
                                icon: const Icon(Icons.delete, color: Colors.redAccent),
                              ),
                              ElevatedButton.icon(
                                onPressed: () async {
                                  final content = jsonEncode(_quillController.document.toDelta().toJson());
                                  final updated = rust.Chapter(
                                    id: _selectedChapter!.id,
                                    novelId: _selectedChapter!.novelId,
                                    title: _selectedChapter!.title,
                                    content: content,
                                    sortOrder: _selectedChapter!.sortOrder,
                                  );
                                  await _saveChapter(updated);
                                },
                                icon: const Icon(Icons.save),
                                label: const Text('Save Chapter'),
                              ),
                            ],
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                quill.QuillToolbar.simple(
                                  configurations: quill.QuillSimpleToolbarConfigurations(
                                    controller: _quillController,
                                    showAlignmentButtons: false,
                                    showCenterAlignment: false,
                                  ),
                                ),
                                const Divider(height: 1),
                                Expanded(
                                  child: quill.QuillEditor.basic(
                                    configurations: quill.QuillEditorConfigurations(
                                      controller: _quillController,
                                      readOnly: false,
                                      autoFocus: true,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
        )
      ],
    );
  }
}
