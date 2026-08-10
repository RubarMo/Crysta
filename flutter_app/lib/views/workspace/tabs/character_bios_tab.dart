import 'package:flutter/material.dart';
import '../../../models.dart';
import '../../../widgets/native_text_editor.dart';
import 'step_editor_tab.dart';

class CharacterBiosTab extends StatefulWidget {
  final List<Character> characters;
  final Character? selectedCharacter;
  final TextEditingController summaryCtrl;
  final double listPaneWidth;
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final ValueChanged<Character?> onSelectCharacter;
  final ValueChanged<Character> onDeleteCharacter;
  final Function([Character?]) onOpenCharacterDialog;
  final ValueChanged<double> onListPaneWidthChanged;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final ValueChanged<String>? onChanged;

  const CharacterBiosTab({
    super.key,
    required this.characters,
    required this.selectedCharacter,
    required this.summaryCtrl,
    required this.listPaneWidth,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    required this.onSelectCharacter,
    required this.onDeleteCharacter,
    required this.onOpenCharacterDialog,
    required this.onListPaneWidthChanged,
    required this.t,
    required this.language,
    required this.isMobile,
    this.onChanged,
  });

  @override
  State<CharacterBiosTab> createState() => _CharacterBiosTabState();
}

class _CharacterBiosTabState extends State<CharacterBiosTab> {
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
                    t('charactersTitle'),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  onPressed: () => widget.onOpenCharacterDialog(),
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary),
                  tooltip: t('addCharacterBtn'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: widget.characters.isEmpty
                ? Center(
                    child: Text(
                      t('noCharactersYet'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: widget.characters.length,
                    itemBuilder: (context, index) {
                      final char = widget.characters[index];
                      final isSelected = widget.selectedCharacter?.id == char.id;
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
                          onPressed: () => widget.onDeleteCharacter(char),
                        ),
                        onTap: () => widget.onSelectCharacter(char),
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
                  onPressed: () => widget.onSelectCharacter(null),
                ),
              Expanded(
                child: Text(
                  t('step3Title'),
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
          widget.selectedCharacter == null
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
                              widget.selectedCharacter!.name,
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => widget.onOpenCharacterDialog(widget.selectedCharacter),
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
                              Text('${t('charMotivationLabel')}: ${widget.selectedCharacter!.motivation}'),
                              const SizedBox(height: 4),
                              Text('${t('charGoalLabel')}: ${widget.selectedCharacter!.goal}'),
                              const SizedBox(height: 4),
                              Text('${t('charConflictLabel')}: ${widget.selectedCharacter!.conflict}'),
                              const SizedBox(height: 4),
                              Text('${t('charEpiphanyLabel')}: ${widget.selectedCharacter!.epiphany}'),
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
                            controller: widget.summaryCtrl,
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
      return widget.selectedCharacter == null ? listPane : detailPane;
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

class CharacterPovSynopsesTab extends StatelessWidget {
  final List<Character> characters;
  final Character? selectedCharacter;
  final TextEditingController synopsisCtrl;
  final double listPaneWidth;
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final ValueChanged<Character?> onSelectCharacter;
  final ValueChanged<double> onListPaneWidthChanged;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;
  final ValueChanged<String>? onChanged;

  const CharacterPovSynopsesTab({
    super.key,
    required this.characters,
    required this.selectedCharacter,
    required this.synopsisCtrl,
    required this.listPaneWidth,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    required this.onSelectCharacter,
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
              t('charSynopsesTitle'),
              style: const TextStyle(fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: characters.isEmpty
                ? Center(
                    child: Text(
                      t('pleaseAddCharsFirst'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: characters.length,
                    itemBuilder: (context, index) {
                      final char = characters[index];
                      final isSelected = selectedCharacter?.id == char.id;
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(char.name.isNotEmpty ? char.name[0].toUpperCase() : '?'),
                        ),
                        title: Text(char.name, style: const TextStyle(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                        subtitle: Text(char.motivation, maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        onTap: () => onSelectCharacter(char),
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
                  onPressed: () => onSelectCharacter(null),
                ),
              Expanded(
                child: Text(
                  t('step5Title'),
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
          selectedCharacter == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectCharPlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${selectedCharacter!.name} - ${t('charExtendedSynopsisLabel')}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ExpansionTile(
                        leading: Icon(Icons.person, color: Theme.of(context).colorScheme.primary),
                        title: Text('${selectedCharacter!.name} (${t('charRefBioLabel')} Step 3)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 140),
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${t('charMotivationLabel')}: ${selectedCharacter!.motivation}'),
                                  Text('${t('charGoalLabel')}: ${selectedCharacter!.goal}'),
                                  Text('${t('charConflictLabel')}: ${selectedCharacter!.conflict}'),
                                  Text('${t('charEpiphanyLabel')}: ${selectedCharacter!.epiphany}'),
                                  const SizedBox(height: 4),
                                  Text('${t('charSummaryLabel')}: ${cleanText(selectedCharacter!.oneParagraphSummary)}'),
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
                            controller: synopsisCtrl,
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
      return selectedCharacter == null ? listPane : detailPane;
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

class DetailedCharacterChartsTab extends StatelessWidget {
  final List<Character> characters;
  final Character? selectedCharacter;
  final TextEditingController chartCtrl;
  final double listPaneWidth;
  final bool isDone;
  final ValueChanged<bool> onToggleDone;
  final VoidCallback onSave;
  final ValueChanged<Character?> onSelectCharacter;
  final ValueChanged<double> onListPaneWidthChanged;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;
  final ValueChanged<String>? onChanged;

  const DetailedCharacterChartsTab({
    super.key,
    required this.characters,
    required this.selectedCharacter,
    required this.chartCtrl,
    required this.listPaneWidth,
    required this.isDone,
    required this.onToggleDone,
    required this.onSave,
    required this.onSelectCharacter,
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
              t('charChartsTitle'),
              style: const TextStyle(fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: characters.isEmpty
                ? Center(
                    child: Text(
                      t('pleaseAddCharsFirst'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: characters.length,
                    itemBuilder: (context, index) {
                      final char = characters[index];
                      final isSelected = selectedCharacter?.id == char.id;
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(char.name.isNotEmpty ? char.name[0].toUpperCase() : '?'),
                        ),
                        title: Text(char.name, style: const TextStyle(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                        subtitle: Text(char.motivation, maxLines: 1, overflow: TextOverflow.ellipsis),
                        selected: isSelected,
                        onTap: () => onSelectCharacter(char),
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
                  onPressed: () => onSelectCharacter(null),
                ),
              Expanded(
                child: Text(
                  t('step7Title'),
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
          selectedCharacter == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectCharPlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${selectedCharacter!.name} - ${t('charChartsTitle')}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ExpansionTile(
                        leading: Icon(Icons.badge, color: Theme.of(context).colorScheme.primary),
                        title: Text('${selectedCharacter!.name} (${t('charRefBioLabel')} Step 3)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 140),
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${t('charMotivationLabel')}: ${selectedCharacter!.motivation}'),
                                  Text('${t('charGoalLabel')}: ${selectedCharacter!.goal}'),
                                  Text('${t('charConflictLabel')}: ${selectedCharacter!.conflict}'),
                                  Text('${t('charEpiphanyLabel')}: ${selectedCharacter!.epiphany}'),
                                  const SizedBox(height: 4),
                                  Text('${t('charSummaryLabel')}: ${cleanText(selectedCharacter!.oneParagraphSummary)}'),
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
                            controller: chartCtrl,
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
      return selectedCharacter == null ? listPane : detailPane;
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
