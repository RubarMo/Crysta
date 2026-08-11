import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models.dart';

enum CommandCategory {
  navigation,
  actions,
  characters,
  scenes,
  chapters,
}

class CommandPaletteItem {
  final String title;
  final String? subtitle;
  final CommandCategory category;
  final IconData icon;
  final String? shortcutHint;
  final VoidCallback onExecute;

  const CommandPaletteItem({
    required this.title,
    this.subtitle,
    required this.category,
    required this.icon,
    this.shortcutHint,
    required this.onExecute,
  });
}

class CommandPaletteDialog extends StatefulWidget {
  final String language;
  final String Function(String) t;
  final List<Character> characters;
  final List<Scene> scenes;
  final List<Chapter> chapters;
  final void Function(int tabIndex, {Character? character, Scene? scene, Chapter? chapter}) onNavigate;
  final void Function(String actionId) onTriggerAction;

  const CommandPaletteDialog({
    super.key,
    required this.language,
    required this.t,
    required this.characters,
    required this.scenes,
    required this.chapters,
    required this.onNavigate,
    required this.onTriggerAction,
  });

  static Future<void> show({
    required BuildContext context,
    required String language,
    required String Function(String) t,
    required List<Character> characters,
    required List<Scene> scenes,
    required List<Chapter> chapters,
    required void Function(int tabIndex, {Character? character, Scene? scene, Chapter? chapter}) onNavigate,
    required void Function(String actionId) onTriggerAction,
  }) {
    return showDialog(
      context: context,
      barrierColor: Colors.black54,
      builder: (context) => CommandPaletteDialog(
        language: language,
        t: t,
        characters: characters,
        scenes: scenes,
        chapters: chapters,
        onNavigate: onNavigate,
        onTriggerAction: onTriggerAction,
      ),
    );
  }

  @override
  State<CommandPaletteDialog> createState() => _CommandPaletteDialogState();
}

class _CommandPaletteDialogState extends State<CommandPaletteDialog> {
  final TextEditingController _searchCtrl = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  final ScrollController _scrollCtrl = ScrollController();

  List<CommandPaletteItem> _allItems = [];
  List<CommandPaletteItem> _filteredItems = [];
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _buildAllItems();
    _filteredItems = List.from(_allItems);
    _searchCtrl.addListener(_onSearchChanged);
    _searchFocusNode.onKeyEvent = (node, event) {
      if (event is! KeyDownEvent) return KeyEventResult.ignored;

      if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
        if (_filteredItems.isNotEmpty) {
          setState(() {
            _selectedIndex = (_selectedIndex + 1) % _filteredItems.length;
          });
          _scrollToSelected();
          return KeyEventResult.handled;
        }
      } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
        if (_filteredItems.isNotEmpty) {
          setState(() {
            _selectedIndex = (_selectedIndex - 1 + _filteredItems.length) % _filteredItems.length;
          });
          _scrollToSelected();
          return KeyEventResult.handled;
        }
      } else if (event.logicalKey == LogicalKeyboardKey.enter) {
        _executeSelected();
        return KeyEventResult.handled;
      } else if (event.logicalKey == LogicalKeyboardKey.escape) {
        Navigator.of(context).pop();
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void dispose() {
    _searchCtrl.removeListener(_onSearchChanged);
    _searchCtrl.dispose();
    _searchFocusNode.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _buildAllItems() {
    final t = widget.t;
    final items = <CommandPaletteItem>[];

    // Navigation & Steps
    items.add(CommandPaletteItem(
      title: t('step0Title'),
      subtitle: t('dashboard'),
      category: CommandCategory.navigation,
      icon: Icons.dashboard,
      shortcutHint: 'Ctrl+0',
      onExecute: () => widget.onNavigate(0),
    ));

    for (int i = 1; i <= 10; i++) {
      items.add(CommandPaletteItem(
        title: t('step${i}Title'),
        subtitle: '${t('referenceToStep')} $i',
        category: CommandCategory.navigation,
        icon: Icons.format_list_numbered,
        shortcutHint: i <= 9 ? 'Ctrl+$i' : 'Ctrl+Shift+E',
        onExecute: () => widget.onNavigate(i),
      ));
    }

    items.add(CommandPaletteItem(
      title: t('writeNovelTitle'),
      subtitle: t('chaptersSidebarTitle'),
      category: CommandCategory.navigation,
      icon: Icons.edit_note,
      shortcutHint: 'Ctrl+Shift+W',
      onExecute: () => widget.onNavigate(11),
    ));

    // Actions & Tools
    items.add(CommandPaletteItem(
      title: t('cmdForceSave'),
      subtitle: t('statusSaved'),
      category: CommandCategory.actions,
      icon: Icons.save,
      shortcutHint: 'Ctrl+S',
      onExecute: () => widget.onTriggerAction('save'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdOpenSnapshots'),
      subtitle: t('backupsTitle'),
      category: CommandCategory.actions,
      icon: Icons.history,
      shortcutHint: 'Ctrl+B',
      onExecute: () => widget.onTriggerAction('snapshots'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdToggleSidebar'),
      subtitle: t('closeSidebar'),
      category: CommandCategory.actions,
      icon: Icons.view_sidebar_outlined,
      shortcutHint: 'Ctrl+J',
      onExecute: () => widget.onTriggerAction('toggle_sidebar'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdOpenZenMode'),
      subtitle: 'Zen Mode',
      category: CommandCategory.actions,
      icon: Icons.fullscreen,
      shortcutHint: 'F11',
      onExecute: () => widget.onTriggerAction('zen_mode'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdNewCharacter'),
      subtitle: t('step3Title'),
      category: CommandCategory.actions,
      icon: Icons.person_add,
      shortcutHint: 'Ctrl+N',
      onExecute: () => widget.onTriggerAction('new_character'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdNewScene'),
      subtitle: t('step8Title'),
      category: CommandCategory.actions,
      icon: Icons.add_to_photos,
      shortcutHint: 'Ctrl+N',
      onExecute: () => widget.onTriggerAction('new_scene'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdNewChapter'),
      subtitle: t('writeNovelTitle'),
      category: CommandCategory.actions,
      icon: Icons.note_add,
      shortcutHint: 'Ctrl+N',
      onExecute: () => widget.onTriggerAction('new_chapter'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdToggleTheme'),
      subtitle: t('appearance'),
      category: CommandCategory.actions,
      icon: Icons.palette_outlined,
      onExecute: () => widget.onTriggerAction('theme'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdToggleLanguage'),
      subtitle: widget.language == 'ar' ? 'English (LTR)' : 'العربية (RTL)',
      category: CommandCategory.actions,
      icon: Icons.language,
      onExecute: () => widget.onTriggerAction('language'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdExportDocx'),
      subtitle: 'Microsoft Word (.docx)',
      category: CommandCategory.actions,
      icon: Icons.description_outlined,
      onExecute: () => widget.onTriggerAction('export_docx'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdExportTxt'),
      subtitle: 'Plain Text (.txt)',
      category: CommandCategory.actions,
      icon: Icons.text_snippet_outlined,
      onExecute: () => widget.onTriggerAction('export_txt'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdOpenHelp'),
      subtitle: t('helpModalTitle'),
      category: CommandCategory.actions,
      icon: Icons.help_outline,
      shortcutHint: 'F1',
      onExecute: () => widget.onTriggerAction('help'),
    ));

    items.add(CommandPaletteItem(
      title: t('cmdOpenShortcuts'),
      subtitle: t('shortcutsTitle'),
      category: CommandCategory.actions,
      icon: Icons.keyboard_outlined,
      shortcutHint: 'Ctrl+/',
      onExecute: () => widget.onTriggerAction('shortcuts'),
    ));

    // Dynamic Story Items: Characters
    for (final char in widget.characters) {
      items.add(CommandPaletteItem(
        title: char.name,
        subtitle: char.motivation.isNotEmpty ? char.motivation : t('categoryCharacters'),
        category: CommandCategory.characters,
        icon: Icons.person,
        onExecute: () => widget.onNavigate(3, character: char),
      ));
    }

    // Dynamic Story Items: Scenes
    for (int i = 0; i < widget.scenes.length; i++) {
      final scn = widget.scenes[i];
      final title = scn.setting.isNotEmpty ? scn.setting : '${t('sceneNumber')} #${i + 1}';
      items.add(CommandPaletteItem(
        title: title,
        subtitle: scn.plotThread.isNotEmpty ? scn.plotThread : t('categoryScenes'),
        category: CommandCategory.scenes,
        icon: Icons.movie_creation_outlined,
        onExecute: () => widget.onNavigate(8, scene: scn),
      ));
    }

    // Dynamic Story Items: Chapters
    for (int i = 0; i < widget.chapters.length; i++) {
      final chap = widget.chapters[i];
      final title = chap.title.isNotEmpty ? chap.title : '${t('chapterTitleLabel')} #${i + 1}';
      items.add(CommandPaletteItem(
        title: title,
        subtitle: t('categoryChapters'),
        category: CommandCategory.chapters,
        icon: Icons.menu_book_outlined,
        onExecute: () => widget.onNavigate(11, chapter: chap),
      ));
    }

    _allItems = items;
  }

  void _onSearchChanged() {
    final query = _searchCtrl.text.trim().toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredItems = List.from(_allItems);
      } else {
        _filteredItems = _allItems.where((item) {
          final title = item.title.toLowerCase();
          final subtitle = (item.subtitle ?? '').toLowerCase();
          final hint = (item.shortcutHint ?? '').toLowerCase();
          return title.contains(query) || subtitle.contains(query) || hint.contains(query);
        }).toList();
      }
      _selectedIndex = 0;
    });
  }

  void _scrollToSelected() {
    if (!_scrollCtrl.hasClients) return;
    const itemHeight = 56.0;
    final targetOffset = _selectedIndex * itemHeight;
    final maxScroll = _scrollCtrl.position.maxScrollExtent;
    final minScroll = _scrollCtrl.position.minScrollExtent;
    final clamped = targetOffset.clamp(minScroll, maxScroll);
    _scrollCtrl.animateTo(
      clamped,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
    );
  }

  void _executeSelected() {
    if (_filteredItems.isEmpty || _selectedIndex >= _filteredItems.length) return;
    final item = _filteredItems[_selectedIndex];
    Navigator.of(context).pop();
    item.onExecute();
  }

  String _getCategoryName(CommandCategory category) {
    switch (category) {
      case CommandCategory.navigation:
        return widget.t('categoryNavigation');
      case CommandCategory.actions:
        return widget.t('categoryActions');
      case CommandCategory.characters:
        return widget.t('categoryCharacters');
      case CommandCategory.scenes:
        return widget.t('categoryScenes');
      case CommandCategory.chapters:
        return widget.t('categoryChapters');
    }
  }

  Color _getCategoryColor(CommandCategory category, BuildContext context) {
    final theme = Theme.of(context);
    switch (category) {
      case CommandCategory.navigation:
        return Colors.teal;
      case CommandCategory.actions:
        return theme.colorScheme.primary;
      case CommandCategory.characters:
        return Colors.amber.shade700;
      case CommandCategory.scenes:
        return Colors.deepPurple;
      case CommandCategory.chapters:
        return Colors.indigo;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRtl = widget.language == 'ar';
    final theme = Theme.of(context);

    return Directionality(
      textDirection: isRtl ? TextDirection.rtl : TextDirection.ltr,
      child: Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        alignment: Alignment.topCenter,
        backgroundColor: theme.colorScheme.surface,
        elevation: 12,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
        ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: 680,
              maxHeight: 520,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Search Bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                  child: Row(
                    children: [
                      Icon(Icons.search, color: theme.colorScheme.primary, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _searchCtrl,
                          focusNode: _searchFocusNode,
                          autofocus: true,
                          decoration: InputDecoration(
                            hintText: widget.t('commandPaletteHint'),
                            hintStyle: TextStyle(fontSize: 14, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.7)),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                        ),
                      ),
                      if (_searchCtrl.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () => _searchCtrl.clear(),
                          tooltip: widget.t('cancel'),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: theme.colorScheme.outlineVariant),
                        ),
                        child: Text(
                          'ESC',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurfaceVariant),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // List of filtered commands / items
                Expanded(
                  child: _filteredItems.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.search_off, size: 40, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
                                const SizedBox(height: 12),
                                Text(
                                  widget.t('noCommandsFound'),
                                  style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollCtrl,
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          itemCount: _filteredItems.length,
                          itemBuilder: (context, index) {
                            final item = _filteredItems[index];
                            final isSelected = index == _selectedIndex;
                            final catColor = _getCategoryColor(item.category, context);

                            return InkWell(
                              onTap: () {
                                setState(() => _selectedIndex = index);
                                _executeSelected();
                              },
                              onHover: (hovering) {
                                if (hovering && _selectedIndex != index) {
                                  setState(() => _selectedIndex = index);
                                }
                              },
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? theme.colorScheme.primaryContainer.withValues(alpha: 0.6)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: catColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Icon(item.icon, size: 18, color: catColor),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            item.title,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          if (item.subtitle != null && item.subtitle!.isNotEmpty) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              item.subtitle!,
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: theme.colorScheme.onSurfaceVariant,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: catColor.withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        _getCategoryName(item.category),
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: catColor),
                                      ),
                                    ),
                                    if (item.shortcutHint != null) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: theme.colorScheme.surfaceContainerHighest,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
                                        ),
                                        child: Text(
                                          item.shortcutHint!,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: theme.colorScheme.onSurfaceVariant,
                                            fontFamily: 'monospace',
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // Footer with keyboard navigation cues
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Wrap(
                        spacing: 12,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          _buildKeyCue('↑↓', isRtl ? 'للتنقل' : 'Navigate', theme),
                          _buildKeyCue('↵', isRtl ? 'للتنفيذ' : 'Execute', theme),
                          _buildKeyCue('ESC', isRtl ? 'للإغلاق' : 'Close', theme),
                        ],
                      ),
                      Text(
                        '${_filteredItems.length} ${isRtl ? 'نتيجة' : 'results'}',
                        style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
  }

  Widget _buildKeyCue(String key, String label, ThemeData theme) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
          ),
          child: Text(
            key,
            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
      ],
    );
  }
}

/// Standalone Cheat Sheet dialog for keyboard shortcuts
class KeyboardShortcutsHelpDialog extends StatelessWidget {
  final String language;
  final String Function(String) t;

  const KeyboardShortcutsHelpDialog({
    super.key,
    required this.language,
    required this.t,
  });

  static Future<void> show(BuildContext context, String language, String Function(String) t) {
    return showDialog(
      context: context,
      builder: (context) => KeyboardShortcutsHelpDialog(language: language, t: t),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isRtl = language == 'ar';
    final theme = Theme.of(context);

    final shortcuts = [
      _ShortcutGroup(
        title: isRtl ? 'التحكم العام ولوحة الأوامر' : 'General & Command Palette',
        items: [
          _ShortcutEntry(['Ctrl', 'K'], isRtl ? 'فتح لوحة الأوامر والبحث السريع' : 'Open Command Palette & Quick Search'),
          _ShortcutEntry(['Ctrl', 'P'], isRtl ? 'فتح لوحة الأوامر (بديل)' : 'Open Command Palette (Alternative)'),
          _ShortcutEntry(['Ctrl', 'S'], isRtl ? 'حفظ فوري للمشروع والمسودة' : 'Force Save Project & Flush Debouncer'),
          _ShortcutEntry(['Ctrl', 'B'], isRtl ? 'فتح مدير النسخ واللقطات التاريخية' : 'Open Snapshots & Backup Manager'),
          _ShortcutEntry(['Ctrl', 'J'], isRtl ? 'إظهار / إخفاء القائمة الجانبية' : 'Toggle / Collapse Sidebar'),
          _ShortcutEntry(['F11'], isRtl ? 'فتح وضع التركيز التام (Zen Mode)' : 'Open Distraction-Free Zen Mode'),
          _ShortcutEntry(['Ctrl', '/'], isRtl ? 'عرض اختصارات لوحة المفاتيح' : 'Show Keyboard Shortcuts Reference'),
          _ShortcutEntry(['F1'], isRtl ? 'فتح دليل طريقة ندفة الثلج' : 'Open Snowflake Method Guide'),
        ],
      ),
      _ShortcutGroup(
        title: isRtl ? 'التنقل بين خطوات ندفة الثلج' : 'Snowflake Steps Navigation',
        items: [
          _ShortcutEntry(['Ctrl', '0'], isRtl ? 'لوحة قياسات الرواية (Step 0)' : 'Novel Metrics Dashboard (Step 0)'),
          _ShortcutEntry(['Ctrl', '1'], isRtl ? 'الخطوة 1 (جملة الملخص)' : 'Step 1 (One-Sentence Summary)'),
          _ShortcutEntry(['Ctrl', '2'], isRtl ? 'الخطوة 2 (فقرة الملخص)' : 'Step 2 (One-Paragraph Summary)'),
          _ShortcutEntry(['Ctrl', '3'], isRtl ? 'الخطوة 3 (السير الذاتية)' : 'Step 3 (Character Bios)'),
          _ShortcutEntry(['Ctrl', '4'], isRtl ? 'الخطوة 4 (صفحة السرد)' : 'Step 4 (One-Page Synopsis)'),
          _ShortcutEntry(['Ctrl', '5'], isRtl ? 'الخطوة 5 (منظور الشخصيات)' : 'Step 5 (Character POV Synopses)'),
          _ShortcutEntry(['Ctrl', '6'], isRtl ? 'الخطوة 6 (ملخص 4 صفحات)' : 'Step 6 (Four-Page Synopsis)'),
          _ShortcutEntry(['Ctrl', '7'], isRtl ? 'الخطوة 7 (أوراق الشخصيات)' : 'Step 7 (Detailed Character Charts)'),
          _ShortcutEntry(['Ctrl', '8'], isRtl ? 'الخطوة 8 (مصفوفة المشاهد)' : 'Step 8 (Scene Matrix & Kanban)'),
          _ShortcutEntry(['Ctrl', '9'], isRtl ? 'الخطوة 9 (تفاصيل المشاهد)' : 'Step 9 (Scene Narrative Outlines)'),
          _ShortcutEntry(['Ctrl', 'Shift', 'E'], isRtl ? 'الخطوة 10 (تجميع وتصدير)' : 'Step 10 (Assemble & Export)'),
          _ShortcutEntry(['Ctrl', 'Shift', 'W'], isRtl ? 'كتابة الفصول والمسودة' : 'Write Novel Chapters Workspace'),
        ],
      ),
      _ShortcutGroup(
        title: isRtl ? 'الإجراءات السريعة والتحرير' : 'Quick Creation & Editing',
        items: [
          _ShortcutEntry(['Ctrl', 'N'], isRtl ? 'إضافة عنصر سياقي (فصل/مشهد/شخصية)' : 'Context-Aware New (Chapter/Scene/Char)'),
          _ShortcutEntry(['Esc'], isRtl ? 'الخروج من النوافذ ولوحة الأوامر' : 'Exit dialogs, palette, or Zen Mode'),
        ],
      ),
    ];

    return Directionality(
      textDirection: isRtl ? TextDirection.rtl : TextDirection.ltr,
      child: AlertDialog(
        title: Row(
          children: [
            Icon(Icons.keyboard_outlined, color: theme.colorScheme.primary),
            const SizedBox(width: 10),
            Text(t('shortcutsTitle'), style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: SizedBox(
          width: 720,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('shortcutsDesc'), style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurfaceVariant)),
                const Divider(height: 24),
                for (final group in shortcuts) ...[
                  Padding(
                    padding: const EdgeInsets.only(top: 8, bottom: 10),
                    child: Text(
                      group.title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                  for (final item in group.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Wrap(
                            spacing: 4,
                            children: [
                              for (final k in item.keys)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(5),
                                    border: Border.all(color: theme.colorScheme.outlineVariant),
                                  ),
                                  child: Text(
                                    k,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: theme.colorScheme.onSurfaceVariant,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              item.description,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                ],
              ],
            ),
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t('close')),
          ),
        ],
      ),
    );
  }
}

class _ShortcutGroup {
  final String title;
  final List<_ShortcutEntry> items;

  const _ShortcutGroup({required this.title, required this.items});
}

class _ShortcutEntry {
  final List<String> keys;
  final String description;

  const _ShortcutEntry(this.keys, this.description);
}
