import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models.dart';
import 'step_reference_card.dart';

/// A sleek, comprehensive reference drawer component embedded in the
/// novel drafting workspace. Allows writers to consult scene beats,
/// character sheets, synopsis milestones, and scratchpad notes side-by-side.
class ReferenceDrawerPanel extends StatefulWidget {
  final List<Scene> scenes;
  final List<Character> characters;
  final List<StepProgress> allStepsProgress;
  final String Function(int) getStepContentText;
  final String Function(String) t;
  final String language;
  final VoidCallback onClose;
  final void Function(String textToInsert)? onInsertText;
  final TextEditingController scratchpadController;
  final ValueChanged<String>? onScratchpadChanged;

  const ReferenceDrawerPanel({
    super.key,
    required this.scenes,
    required this.characters,
    required this.allStepsProgress,
    required this.getStepContentText,
    required this.t,
    required this.language,
    required this.onClose,
    this.onInsertText,
    required this.scratchpadController,
    this.onScratchpadChanged,
  });

  @override
  State<ReferenceDrawerPanel> createState() => _ReferenceDrawerPanelState();
}

class _ReferenceDrawerPanelState extends State<ReferenceDrawerPanel> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _sceneSearchQuery = '';
  String _characterSearchQuery = '';
  int _selectedSynopsisStep = 1;
  int? _selectedCharacterId;
  int? _expandedSceneId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    if (widget.characters.isNotEmpty) {
      _selectedCharacterId = widget.characters.first.id;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _getCharacterName(int? charId) {
    if (charId == null) return widget.t('uncategorized');
    final match = widget.characters.where((c) => c.id == charId);
    return match.isNotEmpty ? match.first.name : widget.t('uncategorized');
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final theme = Theme.of(context);
    final isRtl = widget.language == 'ar';

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          left: isRtl ? BorderSide.none : BorderSide(color: theme.dividerColor.withValues(alpha: 0.4)),
          right: isRtl ? BorderSide(color: theme.dividerColor.withValues(alpha: 0.4)) : BorderSide.none,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsetsDirectional.fromSTEB(12, 8, 4, 8),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerLow,
              border: Border(
                bottom: BorderSide(color: theme.dividerColor.withValues(alpha: 0.4)),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.auto_stories, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    t('referenceDrawerTitle'),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  tooltip: t('close'),
                  visualDensity: VisualDensity.compact,
                  onPressed: widget.onClose,
                ),
              ],
            ),
          ),

          // Segmented Tabs
          Container(
            color: theme.colorScheme.surfaceContainerLowest,
            child: TabBar(
              controller: _tabController,
              isScrollable: false,
              labelPadding: const EdgeInsets.symmetric(horizontal: 4),
              indicatorSize: TabBarIndicatorSize.tab,
              labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              unselectedLabelStyle: const TextStyle(fontSize: 11),
              tabs: [
                Tab(
                  icon: const Icon(Icons.movie_creation_outlined, size: 16),
                  text: t('refTabScenes'),
                ),
                Tab(
                  icon: const Icon(Icons.person_outline, size: 16),
                  text: t('refTabCharacters'),
                ),
                Tab(
                  icon: const Icon(Icons.menu_book_outlined, size: 16),
                  text: t('refTabSynopsis'),
                ),
                Tab(
                  icon: const Icon(Icons.note_alt_outlined, size: 16),
                  text: t('refTabNotes'),
                ),
              ],
            ),
          ),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildScenesTab(theme),
                _buildCharactersTab(theme),
                _buildSynopsisTab(theme),
                _buildScratchpadTab(theme),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // 1. SCENES TAB
  // ===========================================================================
  Widget _buildScenesTab(ThemeData theme) {
    final t = widget.t;
    final filteredScenes = widget.scenes.where((s) {
      if (_sceneSearchQuery.isEmpty) return true;
      final query = _sceneSearchQuery.toLowerCase();
      final charName = _getCharacterName(s.povCharacterId).toLowerCase();
      return s.setting.toLowerCase().contains(query) ||
          s.plotThread.toLowerCase().contains(query) ||
          s.whatHappens.toLowerCase().contains(query) ||
          charName.contains(query);
    }).toList();

    return Column(
      children: [
        // Search filter
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
          child: TextField(
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              hintText: t('refSearchHint'),
              prefixIcon: const Icon(Icons.search, size: 16),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onChanged: (val) => setState(() => _sceneSearchQuery = val),
          ),
        ),

        if (widget.scenes.isEmpty)
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.movie_filter_outlined, size: 40, color: theme.colorScheme.outline),
                    const SizedBox(height: 10),
                    Text(
                      t('refNoScenes'),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              itemCount: filteredScenes.length,
              itemBuilder: (context, idx) {
                final scene = filteredScenes[idx];
                final isExpanded = _expandedSceneId == scene.id || (_expandedSceneId == null && idx == 0);
                final povName = _getCharacterName(scene.povCharacterId);

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  elevation: isExpanded ? 1.5 : 0.5,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(
                      color: isExpanded ? theme.colorScheme.primary.withValues(alpha: 0.5) : theme.dividerColor.withValues(alpha: 0.2),
                    ),
                  ),
                  child: ExpansionTile(
                    key: Key('scene_${scene.id}'),
                    initiallyExpanded: isExpanded,
                    onExpansionChanged: (expanded) {
                      setState(() {
                        _expandedSceneId = expanded ? scene.id : null;
                      });
                    },
                    tilePadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                    childrenPadding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                    dense: true,
                    leading: CircleAvatar(
                      radius: 12,
                      backgroundColor: theme.colorScheme.primaryContainer,
                      child: Text(
                        '${scene.sortOrder + 1}',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onPrimaryContainer),
                      ),
                    ),
                    title: Text(
                      scene.setting.isNotEmpty ? scene.setting : '${t('sceneNumber')} ${scene.sortOrder + 1}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Wrap(
                      spacing: 4,
                      children: [
                        if (povName.isNotEmpty && povName != t('uncategorized'))
                          Text('👤 $povName', style: TextStyle(fontSize: 10, color: theme.colorScheme.primary)),
                        if (scene.plotThread.isNotEmpty)
                          Text('• ${scene.plotThread}', style: TextStyle(fontSize: 10, color: theme.colorScheme.secondary)),
                      ],
                    ),
                    children: [
                      const Divider(height: 12),
                      if (scene.whatHappens.isNotEmpty) ...[
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: Text(
                            t('refWhatHappens'),
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerLowest,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: SelectableText(
                            scene.whatHappens,
                            style: const TextStyle(fontSize: 11.5, height: 1.4),
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          Text(
                            '${scene.actualWordCount} / ${scene.expectedWordCount} ${t('words')}',
                            style: TextStyle(fontSize: 10, color: theme.colorScheme.outline),
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.copy, size: 15),
                                tooltip: t('exportCopyBtn'),
                                visualDensity: VisualDensity.compact,
                                onPressed: () {
                                  Clipboard.setData(ClipboardData(text: scene.whatHappens));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(t('exportCopied')), duration: const Duration(seconds: 2)),
                                  );
                                },
                              ),
                              if (widget.onInsertText != null && scene.whatHappens.isNotEmpty)
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    visualDensity: VisualDensity.compact,
                                    textStyle: const TextStyle(fontSize: 10.5),
                                  ),
                                  icon: const Icon(Icons.add, size: 14),
                                  label: Text(t('refInsertIntoDraft')),
                                  onPressed: () {
                                    widget.onInsertText!('\n\n${scene.whatHappens}\n\n');
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(t('refInsertSuccess')), duration: const Duration(seconds: 2)),
                                    );
                                  },
                                ),
                            ],
                          )
                        ],
                      )
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  // ===========================================================================
  // 2. CHARACTERS TAB
  // ===========================================================================
  Widget _buildCharactersTab(ThemeData theme) {
    final t = widget.t;
    if (widget.characters.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.people_outline, size: 40, color: theme.colorScheme.outline),
              const SizedBox(height: 10),
              Text(
                t('refNoCharacters'),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      );
    }

    final filteredChars = widget.characters.where((c) {
      if (_characterSearchQuery.isEmpty) return true;
      final q = _characterSearchQuery.toLowerCase();
      return c.name.toLowerCase().contains(q) ||
          c.goal.toLowerCase().contains(q) ||
          c.motivation.toLowerCase().contains(q) ||
          c.conflict.toLowerCase().contains(q);
    }).toList();

    Character? activeChar;
    if (_selectedCharacterId != null) {
      final matches = widget.characters.where((c) => c.id == _selectedCharacterId);
      if (matches.isNotEmpty) activeChar = matches.first;
    }
    activeChar ??= widget.characters.first;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
          child: TextField(
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              hintText: t('refSearchHint'),
              prefixIcon: const Icon(Icons.search, size: 16),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onChanged: (val) => setState(() => _characterSearchQuery = val),
          ),
        ),
        // Dropdown Character Selector (Accessible & Scrollable for All Characters)
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: theme.dividerColor.withValues(alpha: 0.3)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              isExpanded: true,
              value: filteredChars.any((c) => c.id == activeChar?.id) ? activeChar?.id : (filteredChars.isNotEmpty ? filteredChars.first.id : null),
              icon: const Icon(Icons.arrow_drop_down, size: 20),
              items: filteredChars.map((c) {
                return DropdownMenuItem<int>(
                  value: c.id,
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 11,
                        backgroundColor: theme.colorScheme.secondaryContainer,
                        child: Text(
                          c.name.isNotEmpty ? c.name.characters.first.toUpperCase() : '?',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onSecondaryContainer),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          c.name,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (id) {
                if (id != null) {
                  setState(() => _selectedCharacterId = id);
                }
              },
            ),
          ),
        ),
        // Quick Wrap Chip Selector
        if (filteredChars.length > 1)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            child: Wrap(
              spacing: 4,
              runSpacing: 4,
              children: filteredChars.map((c) {
                final isSelected = c.id == activeChar?.id;
                return ChoiceChip(
                  label: Text(c.name, style: const TextStyle(fontSize: 11)),
                  selected: isSelected,
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _selectedCharacterId = c.id);
                    }
                  },
                );
              }).toList(),
            ),
          ),
        const Divider(height: 12),
        // Active Character Sheet
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: theme.colorScheme.secondaryContainer,
                      child: Text(
                        activeChar.name.isNotEmpty ? activeChar.name.characters.first.toUpperCase() : '?',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.colorScheme.onSecondaryContainer),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        activeChar.name,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (activeChar.motivation.isNotEmpty)
                  _buildCharTraitCard(theme, '🎯 ${t('refMotivation')}', activeChar.motivation),
                if (activeChar.goal.isNotEmpty)
                  _buildCharTraitCard(theme, '🏆 ${t('refGoal')}', activeChar.goal),
                if (activeChar.conflict.isNotEmpty)
                  _buildCharTraitCard(theme, '⚡ ${t('refConflict')}', activeChar.conflict),
                if (activeChar.epiphany.isNotEmpty)
                  _buildCharTraitCard(theme, '💡 ${t('refEpiphany')}', activeChar.epiphany),
                if (activeChar.oneParagraphSummary.isNotEmpty)
                  _buildCharTraitCard(theme, '📜 ${t('refSummary')}', activeChar.oneParagraphSummary),
                if (activeChar.fullSynopsis.isNotEmpty)
                  _buildCharTraitCard(theme, '📖 ${t('step7Title')}', activeChar.fullSynopsis),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCharTraitCard(ThemeData theme, String title, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
          const SizedBox(height: 3),
          SelectableText(
            StepReferenceCard.stripHtml(value),
            style: const TextStyle(fontSize: 11.5, height: 1.4),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // 3. SYNOPSIS TAB
  // ===========================================================================
  Widget _buildSynopsisTab(ThemeData theme) {
    final t = widget.t;
    final stepContent = widget.getStepContentText(_selectedSynopsisStep);
    final cleanContent = StepReferenceCard.stripHtml(stepContent);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: SegmentedButton<int>(
            segments: [
              ButtonSegment<int>(value: 1, label: Text(t('step1Title').split(':').first, style: const TextStyle(fontSize: 10))),
              ButtonSegment<int>(value: 2, label: Text(t('step2Title').split(':').first, style: const TextStyle(fontSize: 10))),
              ButtonSegment<int>(value: 4, label: Text(t('step4Title').split(':').first, style: const TextStyle(fontSize: 10))),
              ButtonSegment<int>(value: 6, label: Text(t('step6Title').split(':').first, style: const TextStyle(fontSize: 10))),
            ],
            selected: {_selectedSynopsisStep},
            onSelectionChanged: (set) {
              if (set.isNotEmpty) {
                setState(() => _selectedSynopsisStep = set.first);
              }
            },
            showSelectedIcon: false,
            style: const ButtonStyle(
              visualDensity: VisualDensity.compact,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ),
        Expanded(
          child: cleanContent.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      t('refNoSynopsis'),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(12),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerLowest,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: theme.dividerColor.withValues(alpha: 0.2)),
                    ),
                    child: SelectableText(
                      cleanContent,
                      style: const TextStyle(fontSize: 12, height: 1.5),
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  // ===========================================================================
  // 4. SCRATCHPAD TAB
  // ===========================================================================
  Widget _buildScratchpadTab(ThemeData theme) {
    final t = widget.t;
    return Padding(
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                t('refTabNotes'),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.copy, size: 16),
                tooltip: t('exportCopyBtn'),
                visualDensity: VisualDensity.compact,
                onPressed: () {
                  if (widget.scratchpadController.text.isNotEmpty) {
                    Clipboard.setData(ClipboardData(text: widget.scratchpadController.text));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(t('exportCopied')), duration: const Duration(seconds: 2)),
                    );
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 6),
          Expanded(
            child: TextField(
              controller: widget.scratchpadController,
              onChanged: widget.onScratchpadChanged,
              maxLines: null,
              expands: true,
              style: const TextStyle(fontSize: 12, height: 1.4),
              textAlignVertical: TextAlignVertical.top,
              decoration: InputDecoration(
                hintText: t('refChapterNotesHint'),
                hintStyle: TextStyle(fontSize: 11.5, color: theme.colorScheme.outline),
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerLowest,
                contentPadding: const EdgeInsets.all(12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
