import 'package:flutter/material.dart';
import '../../../models.dart';
import '../../../widgets/native_text_editor.dart';
import 'step_editor_tab.dart';

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
  final ValueChanged<double> onListPaneWidthChanged;
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
    required this.onListPaneWidthChanged,
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
  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final isMobile = widget.isMobile;

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
                  onPressed: () => widget.onOpenSceneMetadataDialog(),
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary),
                  tooltip: t('addSceneBtn'),
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
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: widget.scenes.length,
                    itemBuilder: (context, index) {
                      final scn = widget.scenes[index];
                      final isSelected = widget.selectedScene?.id == scn.id;
                      final povChar = widget.characters.firstWhere(
                        (c) => c.id == scn.povCharacterId,
                        orElse: () => Character(
                          novelId: 0,
                          name: t('sceneNotPlanned'),
                          motivation: '',
                          goal: '',
                          conflict: '',
                          epiphany: '',
                          oneParagraphSummary: '',
                          fullSynopsis: '',
                        ),
                      );

                      return ListTile(
                        title: Text('${t('sceneNumber')} #${index + 1}: ${scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned')}', overflow: TextOverflow.ellipsis),
                        subtitle: Text('${povChar.name} | ${scn.plotThread}', maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        trailing: IconButton(
                          icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 18),
                          onPressed: () => widget.onDeleteScene(scn),
                        ),
                        onTap: () => widget.onSelectScene(scn),
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
                  onPressed: () => widget.onSelectScene(null),
                ),
              Expanded(
                child: Text(
                  t('step8Title'),
                  style: (isMobile ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
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
          widget.selectedScene == null
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
                              '${t('sceneNumber')} - ${widget.selectedScene!.setting}',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => widget.onOpenSceneMetadataDialog(widget.selectedScene),
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
                                      '${t('scenePovCol')}: ${widget.characters.firstWhere((c) => c.id == widget.selectedScene!.povCharacterId, orElse: () => Character(novelId: 0, name: t('sceneNotPlanned'), motivation: '', goal: '', conflict: '', epiphany: '', oneParagraphSummary: '', fullSynopsis: '')).name}',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text('${t('sceneWordsCol')}: ${widget.selectedScene!.expectedWordCount} / ${widget.selectedScene!.actualWordCount}'),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text('${t('scenePlotCol')}: ${widget.selectedScene!.plotThread}'),
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
                            controller: widget.step8SceneCtrl,
                            wordCountLabel: t('words'),
                            isRtl: widget.language == 'ar',
                            onChanged: widget.onChanged,
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
      return widget.selectedScene == null ? listPane : detailPane;
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(width: widget.listPaneWidth, child: listPane),
        GestureDetector(
          behavior: HitTestBehavior.translucent,
          onHorizontalDragUpdate: (details) {
            final delta = widget.language == 'ar' ? -details.delta.dx : details.delta.dx;
            widget.onListPaneWidthChanged((widget.listPaneWidth + delta).clamp(200.0, 360.0));
          },
          child: MouseRegion(
            cursor: SystemMouseCursors.resizeColumn,
            child: Container(
              width: 12,
              color: Colors.transparent,
              child: Center(
                child: Container(
                  width: 2,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Theme.of(context).dividerColor,
                    borderRadius: BorderRadius.circular(1),
                  ),
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
  final ValueChanged<double> onListPaneWidthChanged;
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
    required this.onListPaneWidthChanged,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.cleanText,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
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
            child: scenes.isEmpty
                ? Center(
                    child: Text(
                      t('pleaseAddScenesFirst'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: scenes.length,
                    itemBuilder: (context, index) {
                      final scn = scenes[index];
                      final isSelected = selectedScene?.id == scn.id;
                      return ListTile(
                        title: Text('${t('sceneNumber')} #${index + 1}: ${scn.setting.isNotEmpty ? scn.setting : t('sceneNotPlanned')}', overflow: TextOverflow.ellipsis),
                        subtitle: Text(scn.plotThread, maxLines: 1, overflow: TextOverflow.ellipsis),
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
                      Text(
                        '${t('sceneNumber')} - ${selectedScene!.setting}',
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
                                    '${t('scenePovCol')}: ${characters.firstWhere((c) => c.id == selectedScene!.povCharacterId, orElse: () => Character(novelId: 0, name: t('sceneNotPlanned'), motivation: '', goal: '', conflict: '', epiphany: '', oneParagraphSummary: '', fullSynopsis: '')).name}',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  Text('${t('scenePlotCol')}: ${selectedScene!.plotThread}'),
                                  const SizedBox(height: 6),
                                  Text('${t('sceneWhatHappensLabel')}: ${cleanText(selectedScene!.whatHappens)}'),
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
                            controller: step9SceneCtrl,
                            wordCountLabel: t('words'),
                            isRtl: language == 'ar',
                            onChanged: onChanged,
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
        GestureDetector(
          behavior: HitTestBehavior.translucent,
          onHorizontalDragUpdate: (details) {
            final delta = language == 'ar' ? -details.delta.dx : details.delta.dx;
            onListPaneWidthChanged((listPaneWidth + delta).clamp(200.0, 360.0));
          },
          child: MouseRegion(
            cursor: SystemMouseCursors.resizeColumn,
            child: Container(
              width: 12,
              color: Colors.transparent,
              child: Center(
                child: Container(
                  width: 2,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Theme.of(context).dividerColor,
                    borderRadius: BorderRadius.circular(1),
                  ),
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
