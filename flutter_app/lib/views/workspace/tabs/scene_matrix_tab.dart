import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../../../models.dart';
import '../../../widgets/native_text_editor.dart';
import '../zen_mode_view.dart';
import 'step_editor_tab.dart';

enum SceneMatrixViewMode { list, kanban, table }
enum KanbanGroupBy { pov, plot }

class SceneListMasterDetailTab extends StatefulWidget {
  final List<Scene> scenes;
  final List<Character> characters;
  final Scene? selectedScene;
  final TextEditingController step8SceneCtrl;
  final double listPaneWidth;
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final ValueChanged<Scene?> onSelectScene;
  final ValueChanged<Scene> onDeleteScene;
  final Function([Scene?]) onOpenSceneMetadataDialog;
  final ValueChanged<DragUpdateDetails> onListPaneDrag;
  final Future<void> Function(List<Scene>) onReorderScenes;
  final Future<void> Function(Scene) onSaveScene;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;
  final ValueChanged<String>? onChanged;

  const SceneListMasterDetailTab({
    super.key,
    required this.scenes,
    required this.characters,
    required this.selectedScene,
    required this.step8SceneCtrl,
    required this.listPaneWidth,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    required this.onSelectScene,
    required this.onDeleteScene,
    required this.onOpenSceneMetadataDialog,
    required this.onListPaneDrag,
    required this.onReorderScenes,
    required this.onSaveScene,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.cleanText,
    this.onChanged,
  });

  @override
  State<SceneListMasterDetailTab> createState() => _SceneListMasterDetailTabState();
}

class _SceneListMasterDetailTabState extends State<SceneListMasterDetailTab> {
  SceneMatrixViewMode _viewMode = SceneMatrixViewMode.list;
  KanbanGroupBy _kanbanGroupBy = KanbanGroupBy.pov;
  final ScrollController _kanbanHorizontalCtrl = ScrollController();
  final ScrollController _tableHorizontalCtrl = ScrollController();
  final ScrollController _tableVerticalCtrl = ScrollController();

  @override
  void dispose() {
    _kanbanHorizontalCtrl.dispose();
    _tableHorizontalCtrl.dispose();
    _tableVerticalCtrl.dispose();
    super.dispose();
  }

  Character _getPovCharacter(int? povId) {
    return widget.characters.firstWhere(
      (c) => c.id == povId,
      orElse: () => Character(
        novelId: 0,
        name: widget.t('uncategorized'),
        motivation: '',
        goal: '',
        conflict: '',
        epiphany: '',
        oneParagraphSummary: '',
        fullSynopsis: '',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final isMobile = widget.isMobile;

    return Padding(
      padding: EdgeInsets.all(isMobile ? 12 : 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar with Title, View Mode Switcher, and Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (isMobile && widget.selectedScene != null && _viewMode == SceneMatrixViewMode.list)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => widget.onSelectScene(null),
                ),
              Expanded(
                child: Text(
                  t('step8Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)
                      ?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              // View Mode Selector (Segmented Button)
              if (!isMobile)
                SegmentedButton<SceneMatrixViewMode>(
                  showSelectedIcon: false,
                  segments: [
                    ButtonSegment<SceneMatrixViewMode>(
                      value: SceneMatrixViewMode.list,
                      icon: const Icon(Icons.view_sidebar_outlined, size: 18),
                      label: Text(t('viewList'), style: const TextStyle(fontSize: 12)),
                    ),
                    ButtonSegment<SceneMatrixViewMode>(
                      value: SceneMatrixViewMode.kanban,
                      icon: const Icon(Icons.view_kanban_outlined, size: 18),
                      label: Text(t('viewKanban'), style: const TextStyle(fontSize: 12)),
                    ),
                    ButtonSegment<SceneMatrixViewMode>(
                      value: SceneMatrixViewMode.table,
                      icon: const Icon(Icons.table_chart_outlined, size: 18),
                      label: Text(t('viewGrid'), style: const TextStyle(fontSize: 12)),
                    ),
                  ],
                  selected: {_viewMode},
                  onSelectionChanged: (Set<SceneMatrixViewMode> newSelection) {
                    setState(() {
                      _viewMode = newSelection.first;
                    });
                  },
                ),
              const SizedBox(width: 8),
              StepHeaderActions(
                isDone: widget.isDone,
                onToggleDone: widget.onToggleDone,
                onSave: widget.onSave,
                t: t,
                isMobile: isMobile,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Main View Mode Content
          Expanded(
            child: _buildCurrentViewContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentViewContent() {
    switch (_viewMode) {
      case SceneMatrixViewMode.kanban:
        return _buildKanbanBoardView();
      case SceneMatrixViewMode.table:
        return _buildSpreadsheetMatrixView();
      case SceneMatrixViewMode.list:
        return _buildReorderableMasterDetailView();
    }
  }

  // ==========================================
  // VIEW MODE 1: REORDERABLE MASTER-DETAIL LIST
  // ==========================================
  Widget _buildReorderableMasterDetailView() {
    final t = widget.t;
    final isMobile = widget.isMobile;

    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(8),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${t('scenesTitle')} (${widget.scenes.length})',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        t('dragToReorderHint'),
                        style: TextStyle(fontSize: 10, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => widget.onOpenSceneMetadataDialog(),
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary, size: 20),
                  tooltip: t('addSceneBtn'),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: widget.scenes.isEmpty
                ? Center(
                    child: Text(
                      t('noScenesYet'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ReorderableListView.builder(
                    buildDefaultDragHandles: true,
                    itemCount: widget.scenes.length,
                    onReorder: (oldIndex, newIndex) {
                      if (newIndex > oldIndex) newIndex -= 1;
                      final reordered = List<Scene>.from(widget.scenes);
                      final item = reordered.removeAt(oldIndex);
                      reordered.insert(newIndex, item);
                      widget.onReorderScenes(reordered);
                    },
                    itemBuilder: (context, index) {
                      final scn = widget.scenes[index];
                      final isSelected = widget.selectedScene?.id == scn.id;
                      final povChar = _getPovCharacter(scn.povCharacterId);

                      return ListTile(
                        key: ValueKey(scn.id ?? index),
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        selected: isSelected,
                        leading: CircleAvatar(
                          radius: 12,
                          backgroundColor: isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.surfaceContainerHighest,
                          child: Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        title: Text(
                          scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned'),
                          style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.w600, fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          '${povChar.name} • ${scn.plotThread.isNotEmpty ? scn.plotThread : t('uncategorized')}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11),
                        ),
                        trailing: IconButton(
                          icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 16),
                          onPressed: () => widget.onDeleteScene(scn),
                          visualDensity: VisualDensity.compact,
                        ),
                        onTap: () => widget.onSelectScene(scn),
                      );
                    },
                  ),
          ),
        ],
      ),
    );

    Widget detailPane = widget.selectedScene == null
        ? Center(child: Text(t('selectScenePlaceholder')))
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Text(
                      '${t('sceneNumber')} #${widget.scenes.indexOf(widget.selectedScene!) + 1} — ${widget.selectedScene!.setting.isNotEmpty ? widget.selectedScene!.setting : t('sceneNotPlanned')}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => widget.onOpenSceneMetadataDialog(widget.selectedScene),
                    icon: const Icon(Icons.edit, size: 15),
                    label: Text(t('edit')),
                  ),
                ],
              ),
              const SizedBox(height: 8),
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
                            child: Row(
                              children: [
                                Icon(Icons.person_pin, size: 16, color: Theme.of(context).colorScheme.primary),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    '${t('scenePovCol')}: ${_getPovCharacter(widget.selectedScene!.povCharacterId).name}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Chip(
                            label: Text(
                              '${widget.selectedScene!.expectedWordCount} / ${widget.selectedScene!.actualWordCount} ${t('words')}',
                              style: const TextStyle(fontSize: 11),
                            ),
                            padding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${t('scenePlotCol')}: ${widget.selectedScene!.plotThread.isNotEmpty ? widget.selectedScene!.plotThread : t('uncategorized')}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(t('sceneWhatHappensLabel'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 6),
              Expanded(
                child: Card(
                  margin: EdgeInsets.zero,
                  child: NativeTextEditor(
                    controller: widget.step8SceneCtrl,
                    wordCountLabel: t('words'),
                    isRtl: widget.language == 'ar',
                    onChanged: widget.onChanged,
                    onOpenZenMode: () {
                      final sceneTitle = widget.selectedScene != null && widget.selectedScene!.setting.isNotEmpty
                          ? widget.selectedScene!.setting
                          : widget.t('step8Title');
                      ZenModeView.show(
                        context,
                        title: sceneTitle,
                        controller: widget.step8SceneCtrl,
                        t: widget.t,
                        language: widget.language,
                        onChanged: widget.onChanged,
                        onSave: widget.onSave,
                      );
                    },
                    zenModeTooltip: t('zenModeBtn'),
                  ),
                ),
              ),
            ],
          );

    if (isMobile) {
      return widget.selectedScene == null ? listPane : detailPane;
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(width: widget.listPaneWidth, child: listPane),
        MouseRegion(
          cursor: SystemMouseCursors.resizeColumn,
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onHorizontalDragUpdate: widget.onListPaneDrag,
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
        ),
        Expanded(child: ClipRect(child: detailPane)),
      ],
    );
  }

  // ==========================================
  // VIEW MODE 2: KANBAN BOARD VIEW (SMOOTH DRAG + PROPER BILINGUAL AUTO-SCROLL)
  // ==========================================
  Widget _buildKanbanBoardView() {
    final t = widget.t;
    final isRtl = widget.language == 'ar';
    final deltaLeft = isRtl ? 25.0 : -25.0;
    final deltaRight = isRtl ? -25.0 : 25.0;

    // Build Column Groups
    final Map<String, List<Scene>> groupedScenes = {};

    if (_kanbanGroupBy == KanbanGroupBy.pov) {
      for (final c in widget.characters) {
        groupedScenes[c.name] = [];
      }
      groupedScenes[t('uncategorized')] = [];

      for (final scn in widget.scenes) {
        final char = _getPovCharacter(scn.povCharacterId);
        groupedScenes.putIfAbsent(char.name, () => []).add(scn);
      }
    } else {
      for (final scn in widget.scenes) {
        final thread = scn.plotThread.trim().isEmpty ? t('uncategorized') : scn.plotThread.trim();
        groupedScenes.putIfAbsent(thread, () => []).add(scn);
      }
      if (groupedScenes.isEmpty) {
        groupedScenes[t('uncategorized')] = [];
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Sub-toolbar for Kanban controls
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    SegmentedButton<KanbanGroupBy>(
                      showSelectedIcon: false,
                      segments: [
                        ButtonSegment<KanbanGroupBy>(
                          value: KanbanGroupBy.pov,
                          label: Text(t('groupByPov'), style: const TextStyle(fontSize: 12)),
                        ),
                        ButtonSegment<KanbanGroupBy>(
                          value: KanbanGroupBy.plot,
                          label: Text(t('groupByPlot'), style: const TextStyle(fontSize: 12)),
                        ),
                      ],
                      selected: {_kanbanGroupBy},
                      onSelectionChanged: (newVal) => setState(() => _kanbanGroupBy = newVal.first),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _kanbanGroupBy == KanbanGroupBy.plot ? t('scenePlotHelper') : '',
                      style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => widget.onOpenSceneMetadataDialog(),
                  icon: const Icon(Icons.add, size: 16),
                  label: Text(t('addSceneBtn')),
                ),
              ],
            ),
          ),
        ),

        // Kanban Board with Edge Auto-Scroll & Smooth Mouse-Drag Scroll
        Expanded(
          child: Stack(
            children: [
              ScrollConfiguration(
                behavior: const MaterialScrollBehavior().copyWith(
                  dragDevices: {
                    PointerDeviceKind.touch,
                    PointerDeviceKind.mouse,
                    PointerDeviceKind.trackpad,
                    PointerDeviceKind.stylus,
                  },
                ),
                child: Scrollbar(
                  controller: _kanbanHorizontalCtrl,
                  thumbVisibility: true,
                  trackVisibility: true,
                  child: ListView(
                    controller: _kanbanHorizontalCtrl,
                    scrollDirection: Axis.horizontal,
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: 14, left: 8, right: 8),
                    children: groupedScenes.entries.map((entry) {
                      final groupTitle = entry.key;
                      final scenesInGroup = entry.value;

                      return Container(
                        width: 300,
                        margin: const EdgeInsetsDirectional.only(end: 14),
                        child: DragTarget<Scene>(
                          onWillAcceptWithDetails: (details) => true,
                          onAcceptWithDetails: (details) async {
                            final dragged = details.data;
                            if (_kanbanGroupBy == KanbanGroupBy.pov) {
                              final targetChar = widget.characters.firstWhere(
                                (c) => c.name == groupTitle,
                                orElse: () => Character(novelId: 0, name: '', motivation: '', goal: '', conflict: '', epiphany: '', oneParagraphSummary: '', fullSynopsis: ''),
                              );
                              final updated = dragged.copyWith(povCharacterId: targetChar.id == 0 ? null : targetChar.id);
                              await widget.onSaveScene(updated);
                            } else {
                              final updated = dragged.copyWith(plotThread: groupTitle == t('uncategorized') ? '' : groupTitle);
                              await widget.onSaveScene(updated);
                            }
                          },
                          builder: (context, candidateData, rejectedData) {
                            final isHighlighted = candidateData.isNotEmpty;

                            return Card(
                              color: isHighlighted
                                  ? Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.35)
                                  : Theme.of(context).colorScheme.surfaceContainerLow,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                  color: isHighlighted ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor,
                                  width: isHighlighted ? 2.0 : 0.5,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Column Header
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Row(
                                            children: [
                                              Icon(
                                                _kanbanGroupBy == KanbanGroupBy.pov ? Icons.account_circle : Icons.alt_route,
                                                size: 18,
                                                color: Theme.of(context).colorScheme.primary,
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  groupTitle,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        CircleAvatar(
                                          radius: 11,
                                          backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                                          child: Text(
                                            '${scenesInGroup.length}',
                                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Divider(height: 1),

                                  // Column Card List
                                  Expanded(
                                    child: scenesInGroup.isEmpty
                                        ? Center(
                                            child: Text(
                                              t('noScenesInGroup'),
                                              style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                                            ),
                                          )
                                        : ListView.builder(
                                            padding: const EdgeInsets.all(8),
                                            itemCount: scenesInGroup.length,
                                            itemBuilder: (context, index) {
                                              final scn = scenesInGroup[index];
                                              final sceneIndex = widget.scenes.indexOf(scn) + 1;
                                              return _buildKanbanCard(scn, sceneIndex);
                                            },
                                          ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),

              // Visual Left Edge Zone during Card Drag
              Positioned(
                left: 0,
                top: 0,
                bottom: 14,
                width: 50,
                child: DragTarget<Scene>(
                  onMove: (details) {
                    if (_kanbanHorizontalCtrl.hasClients) {
                      final targetOffset = (_kanbanHorizontalCtrl.offset + deltaLeft).clamp(0.0, _kanbanHorizontalCtrl.position.maxScrollExtent);
                      _kanbanHorizontalCtrl.jumpTo(targetOffset);
                    }
                  },
                  builder: (context, candidate, rejected) {
                    if (candidate.isEmpty) return const SizedBox.shrink();
                    return Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            Theme.of(context).colorScheme.primary.withValues(alpha: 0.35),
                            Colors.transparent,
                          ],
                        ),
                      ),
                      child: Center(
                        child: Icon(Icons.arrow_back_ios, color: Theme.of(context).colorScheme.primary, size: 20),
                      ),
                    );
                  },
                ),
              ),

              // Visual Right Edge Zone during Card Drag
              Positioned(
                right: 0,
                top: 0,
                bottom: 14,
                width: 50,
                child: DragTarget<Scene>(
                  onMove: (details) {
                    if (_kanbanHorizontalCtrl.hasClients) {
                      final targetOffset = (_kanbanHorizontalCtrl.offset + deltaRight).clamp(0.0, _kanbanHorizontalCtrl.position.maxScrollExtent);
                      _kanbanHorizontalCtrl.jumpTo(targetOffset);
                    }
                  },
                  builder: (context, candidate, rejected) {
                    if (candidate.isEmpty) return const SizedBox.shrink();
                    return Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerRight,
                          end: Alignment.centerLeft,
                          colors: [
                            Theme.of(context).colorScheme.primary.withValues(alpha: 0.35),
                            Colors.transparent,
                          ],
                        ),
                      ),
                      child: Center(
                        child: Icon(Icons.arrow_forward_ios, color: Theme.of(context).colorScheme.primary, size: 20),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildKanbanCard(Scene scn, int sceneIndex, {bool isDragging = false}) {
    final t = widget.t;
    final povChar = _getPovCharacter(scn.povCharacterId);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: isDragging ? 8 : 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () {
          widget.onSelectScene(scn);
          setState(() => _viewMode = SceneMatrixViewMode.list);
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '#$sceneIndex: ${scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned')}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.edit, size: 15),
                    tooltip: t('edit'),
                    onPressed: () => widget.onOpenSceneMetadataDialog(scn),
                  ),
                  const SizedBox(width: 4),
                  // Dedicated 4-Way Arrow Move Handle (Only dragging this initiates card drag)
                  if (!isDragging)
                    Draggable<Scene>(
                      data: scn,
                      feedback: Material(
                        elevation: 12,
                        borderRadius: BorderRadius.circular(10),
                        child: SizedBox(
                          width: 280,
                          child: _buildKanbanCard(scn, sceneIndex, isDragging: true),
                        ),
                      ),
                      childWhenDragging: Opacity(
                        opacity: 0.3,
                        child: _buildMoveHandleIcon(),
                      ),
                      child: _buildMoveHandleIcon(),
                    ),
                ],
              ),
              if (scn.whatHappens.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  widget.cleanText(scn.whatHappens),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ],
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (_kanbanGroupBy != KanbanGroupBy.pov)
                    Chip(
                      avatar: const Icon(Icons.person, size: 12),
                      label: Text(povChar.name, style: const TextStyle(fontSize: 10)),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                  if (_kanbanGroupBy != KanbanGroupBy.plot && scn.plotThread.isNotEmpty)
                    Chip(
                      avatar: const Icon(Icons.alt_route, size: 12),
                      label: Text(scn.plotThread, style: const TextStyle(fontSize: 10)),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                  Chip(
                    label: Text('${scn.actualWordCount} / ${scn.expectedWordCount} ${t('words')}', style: const TextStyle(fontSize: 10)),
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMoveHandleIcon() {
    return MouseRegion(
      cursor: SystemMouseCursors.grab,
      child: Tooltip(
        message: widget.t('dragToReorderHint'),
        child: Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.6),
              width: 1,
            ),
          ),
          child: Icon(
            Icons.open_with,
            size: 15,
            color: Theme.of(context).colorScheme.onPrimaryContainer,
          ),
        ),
      ),
    );
  }

  // ==========================================
  // VIEW MODE 3: SPREADSHEET MATRIX TABLE VIEW (RESPONSIVE & SMOOTH DUAL-AXIS SCROLL)
  // ==========================================
  Widget _buildSpreadsheetMatrixView() {
    final t = widget.t;

    int totalExpected = 0;
    int totalActual = 0;
    for (var s in widget.scenes) {
      totalExpected += s.expectedWordCount;
      totalActual += s.actualWordCount;
    }

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Table Toolbar
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      '${t('scenesTitle')} (${widget.scenes.length})',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(width: 14),
                    Chip(
                      label: Text('$totalActual / $totalExpected ${t('words')}'),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => widget.onOpenSceneMetadataDialog(),
                  icon: const Icon(Icons.add, size: 16),
                  label: Text(t('addSceneBtn')),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Scrollable Data Table with Visible Horizontal & Vertical Scrollbars
          Expanded(
            child: widget.scenes.isEmpty
                ? Center(
                    child: Text(
                      t('noScenesYet'),
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : LayoutBuilder(
                    builder: (context, constraints) {
                      return ScrollConfiguration(
                        behavior: const MaterialScrollBehavior().copyWith(
                          dragDevices: {
                            PointerDeviceKind.touch,
                            PointerDeviceKind.mouse,
                            PointerDeviceKind.trackpad,
                            PointerDeviceKind.stylus,
                          },
                        ),
                        child: Scrollbar(
                          controller: _tableHorizontalCtrl,
                          thumbVisibility: true,
                          trackVisibility: true,
                          child: SingleChildScrollView(
                            controller: _tableHorizontalCtrl,
                            scrollDirection: Axis.horizontal,
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Scrollbar(
                              controller: _tableVerticalCtrl,
                              thumbVisibility: true,
                              trackVisibility: true,
                              child: SingleChildScrollView(
                                controller: _tableVerticalCtrl,
                                scrollDirection: Axis.vertical,
                                child: ConstrainedBox(
                                  constraints: BoxConstraints(
                                    minWidth: constraints.maxWidth > 800 ? constraints.maxWidth : 800,
                                  ),
                                  child: DataTable(
                                    columnSpacing: 18,
                                    horizontalMargin: 16,
                                    headingRowColor: WidgetStateProperty.all(Theme.of(context).colorScheme.surfaceContainerHighest),
                                    columns: [
                                      DataColumn(label: Text('#', style: const TextStyle(fontWeight: FontWeight.bold))),
                                      DataColumn(label: Text(t('sceneSettingCol'), style: const TextStyle(fontWeight: FontWeight.bold))),
                                      DataColumn(label: Text(t('scenePovCol'), style: const TextStyle(fontWeight: FontWeight.bold))),
                                      DataColumn(label: Text(t('scenePlotCol'), style: const TextStyle(fontWeight: FontWeight.bold))),
                                      DataColumn(label: Text(t('sceneWordsCol'), style: const TextStyle(fontWeight: FontWeight.bold))),
                                      DataColumn(label: Text(t('sceneWhatHappensCol'), style: const TextStyle(fontWeight: FontWeight.bold))),
                                      DataColumn(label: Text(t('actions'), style: const TextStyle(fontWeight: FontWeight.bold))),
                                    ],
                                    rows: widget.scenes.asMap().entries.map((entry) {
                                      final index = entry.key;
                                      final scn = entry.value;
                                      final povChar = _getPovCharacter(scn.povCharacterId);

                                      return DataRow(
                                        cells: [
                                          DataCell(Text('${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold))),
                                          DataCell(
                                            ConstrainedBox(
                                              constraints: const BoxConstraints(maxWidth: 140),
                                              child: Text(
                                                scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned'),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ),
                                          DataCell(
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                CircleAvatar(
                                                  radius: 10,
                                                  child: Text(povChar.name.isNotEmpty ? povChar.name[0] : '?', style: const TextStyle(fontSize: 10)),
                                                ),
                                                const SizedBox(width: 6),
                                                ConstrainedBox(
                                                  constraints: const BoxConstraints(maxWidth: 110),
                                                  child: Text(povChar.name, overflow: TextOverflow.ellipsis),
                                                ),
                                              ],
                                            ),
                                          ),
                                          DataCell(
                                            ConstrainedBox(
                                              constraints: const BoxConstraints(maxWidth: 120),
                                              child: Text(scn.plotThread.isNotEmpty ? scn.plotThread : t('uncategorized'), overflow: TextOverflow.ellipsis),
                                            ),
                                          ),
                                          DataCell(Text('${scn.actualWordCount} / ${scn.expectedWordCount}')),
                                          DataCell(
                                            ConstrainedBox(
                                              constraints: const BoxConstraints(maxWidth: 200),
                                              child: Text(
                                                scn.whatHappens.isNotEmpty ? widget.cleanText(scn.whatHappens) : '-',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ),
                                          DataCell(
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                IconButton(
                                                  icon: const Icon(Icons.edit_note, size: 18),
                                                  tooltip: t('viewList'),
                                                  onPressed: () {
                                                    widget.onSelectScene(scn);
                                                    setState(() => _viewMode = SceneMatrixViewMode.list);
                                                  },
                                                ),
                                                IconButton(
                                                  icon: const Icon(Icons.tune, size: 18),
                                                  tooltip: t('edit'),
                                                  onPressed: () => widget.onOpenSceneMetadataDialog(scn),
                                                ),
                                                IconButton(
                                                  icon: Icon(Icons.delete_outline, size: 18, color: Theme.of(context).colorScheme.error),
                                                  tooltip: t('delete'),
                                                  onPressed: () => widget.onDeleteScene(scn),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      );
                                    }).toList(),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class SceneNarrativeOutlinesTab extends StatelessWidget {
  final List<Scene> scenes;
  final List<Character> characters;
  final Scene? selectedScene;
  final TextEditingController step9SceneCtrl;
  final double listPaneWidth;
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final ValueChanged<Scene?> onSelectScene;
  final ValueChanged<DragUpdateDetails> onListPaneDrag;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;
  final ValueChanged<String>? onChanged;

  const SceneNarrativeOutlinesTab({
    super.key,
    required this.scenes,
    required this.characters,
    required this.selectedScene,
    required this.step9SceneCtrl,
    required this.listPaneWidth,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    required this.onSelectScene,
    required this.onListPaneDrag,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.cleanText,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(8),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              t('scenesListLabel'),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: scenes.isEmpty
                ? Center(
                    child: Text(
                      t('pleaseAddScenesFirst'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: scenes.length,
                    itemBuilder: (context, index) {
                      final scn = scenes[index];
                      final isSelected = selectedScene?.id == scn.id;
                      return ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        leading: CircleAvatar(
                          radius: 12,
                          backgroundColor: isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.surfaceContainerHighest,
                          child: Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        title: Text(
                          '${t('sceneNumber')} #${index + 1}: ${scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned')}',
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          scn.plotThread.isNotEmpty ? scn.plotThread : t('uncategorized'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11),
                        ),
                        selected: isSelected,
                        onTap: () => onSelectScene(scn),
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
                  onPressed: () => onSelectScene(null),
                ),
              Expanded(
                child: Text(
                  t('step9Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              StepHeaderActions(
                isDone: isDone,
                onToggleDone: onToggleDone,
                onSave: onSave,
                onOpenZenMode: selectedScene != null
                    ? () {
                        final sceneTitle = selectedScene!.setting.isNotEmpty
                            ? selectedScene!.setting
                            : t('step9Title');
                        ZenModeView.show(
                          context,
                          title: sceneTitle,
                          controller: step9SceneCtrl,
                          t: t,
                          language: language,
                          onChanged: onChanged,
                          onSave: onSave,
                        );
                      }
                    : null,
                t: t,
                isMobile: isMobile,
              ),
            ],
          ),
          const SizedBox(height: 12),
          selectedScene == null
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
                              '${t('sceneNumber')} - ${selectedScene!.setting}',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
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
                              Text('${t('scenePovCol')}: ${characters.firstWhere((c) => c.id == selectedScene!.povCharacterId, orElse: () => Character(novelId: 0, name: t('sceneNotPlanned'), motivation: '', goal: '', conflict: '', epiphany: '', oneParagraphSummary: '', fullSynopsis: '')).name}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text('${t('scenePlotCol')}: ${selectedScene!.plotThread}'),
                              const SizedBox(height: 4),
                              Text('${t('sceneWhatHappensCol')}: ${cleanText(selectedScene!.whatHappens)}', maxLines: 2, overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(t('sceneNarrativeTextareaLabel'), style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Card(
                          margin: EdgeInsets.zero,
                          child: NativeTextEditor(
                            controller: step9SceneCtrl,
                            wordCountLabel: t('words'),
                            isRtl: language == 'ar',
                            onChanged: onChanged,
                            onOpenZenMode: () {
                              final sceneTitle = selectedScene != null && selectedScene!.setting.isNotEmpty
                                  ? selectedScene!.setting
                                  : t('step9Title');
                              ZenModeView.show(
                                context,
                                title: sceneTitle,
                                controller: step9SceneCtrl,
                                t: t,
                                language: language,
                                onChanged: onChanged,
                                onSave: onSave,
                              );
                            },
                            zenModeTooltip: t('zenModeBtn'),
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
      return selectedScene == null ? listPane : detailPane;
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(width: listPaneWidth, child: listPane),
        MouseRegion(
          cursor: SystemMouseCursors.resizeColumn,
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onHorizontalDragUpdate: onListPaneDrag,
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
        ),
        Expanded(child: ClipRect(child: detailPane)),
      ],
    );
  }
}
