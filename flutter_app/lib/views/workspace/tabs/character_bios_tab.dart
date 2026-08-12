import 'package:flutter/material.dart';
import '../../../models.dart';
import '../../../widgets/native_text_editor.dart';
import '../../../widgets/step_reference_card.dart';
import '../zen_mode_view.dart';
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
  final ValueChanged<DragUpdateDetails> onListPaneDrag;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final ValueChanged<String>? onChanged;
  final List<Map<String, dynamic>>? entities;
  final void Function(int? id, String type, String name)? onInspectEntity;

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
    required this.onListPaneDrag,
    required this.t,
    required this.language,
    required this.isMobile,
    this.onChanged,
    this.entities,
    this.onInspectEntity,
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
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(8),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    t('charactersTitle'),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  onPressed: () => widget.onOpenCharacterDialog(),
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary, size: 20),
                  tooltip: t('addCharacterBtn'),
                  visualDensity: VisualDensity.compact,
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
                      style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: widget.characters.length,
                    itemBuilder: (context, index) {
                      final char = widget.characters[index];
                      final isSelected = widget.selectedCharacter?.id == char.id;
                      return ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        leading: CircleAvatar(
                          radius: 12,
                          backgroundColor: isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            char.name.isNotEmpty ? char.name[0].toUpperCase() : '?',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                        title: Text(
                          char.name,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: char.motivation.isNotEmpty
                            ? Text(char.motivation, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))
                            : null,
                        selected: isSelected,
                        trailing: IconButton(
                          icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 16),
                          onPressed: () => widget.onDeleteCharacter(char),
                          visualDensity: VisualDensity.compact,
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
                onOpenZenMode: widget.selectedCharacter != null
                    ? () {
                        ZenModeView.show(
                          context,
                          title: '${widget.selectedCharacter!.name} (${widget.t('step3Title')})',
                          controller: widget.summaryCtrl,
                          t: widget.t,
                          language: widget.language,
                          onChanged: widget.onChanged,
                          onSave: widget.onSave,
                          entities: widget.entities,
                          onInspectEntity: widget.onInspectEntity,
                        );
                      }
                    : null,
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
                            entities: widget.entities,
                            onInspectEntity: widget.onInspectEntity,
                            onOpenZenMode: () {
                              ZenModeView.show(
                                context,
                                title: '${widget.selectedCharacter!.name} (${widget.t('step3Title')})',
                                controller: widget.summaryCtrl,
                                t: widget.t,
                                language: widget.language,
                                onChanged: widget.onChanged,
                                onSave: widget.onSave,
                                entities: widget.entities,
                                onInspectEntity: widget.onInspectEntity,
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
      return widget.selectedCharacter == null ? listPane : detailPane;
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
  final ValueChanged<DragUpdateDetails> onListPaneDrag;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;
  final ValueChanged<String>? onChanged;
  final List<Map<String, dynamic>>? entities;
  final void Function(int? id, String type, String name)? onInspectEntity;

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
    required this.onListPaneDrag,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.cleanText,
    this.onChanged,
    this.entities,
    this.onInspectEntity,
  });

  @override
  Widget build(BuildContext context) {
    final char = selectedCharacter;
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(8),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              t('charSynopsesTitle'),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
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
                      style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: characters.length,
                    itemBuilder: (context, index) {
                      final c = characters[index];
                      final isSelected = char?.id == c.id;
                      return ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        leading: CircleAvatar(
                          radius: 12,
                          backgroundColor: isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            c.name.isNotEmpty ? c.name[0].toUpperCase() : '?',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                        title: Text(
                          c.name,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: c.motivation.isNotEmpty
                            ? Text(c.motivation, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))
                            : null,
                        selected: isSelected,
                        onTap: () => onSelectCharacter(c),
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
                onOpenZenMode: char != null
                    ? () {
                        ZenModeView.show(
                          context,
                          title: '${char.name} (${t('step5Title')})',
                          controller: synopsisCtrl,
                          t: t,
                          language: language,
                          onChanged: onChanged,
                          onSave: onSave,
                          entities: entities,
                          onInspectEntity: onInspectEntity,
                        );
                      }
                    : null,
                t: t,
                isMobile: isMobile,
              ),
            ],
          ),
          const SizedBox(height: 12),
          char == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectCharPlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${char.name} - ${t('charExtendedSynopsisLabel')}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      StepReferenceCard(
                        leadingIcon: Icons.person,
                        title: '${char.name} (${t('charRefBioLabel')} Step 3)',
                        language: language,
                        t: t,
                        child: _buildCharacterBioPreviewContent(char: char, theme: Theme.of(context), t: t, cleanText: cleanText),
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
                            entities: entities,
                            onInspectEntity: onInspectEntity,
                            onOpenZenMode: () {
                              ZenModeView.show(
                                context,
                                title: '${char.name} (${t('step5Title')})',
                                controller: synopsisCtrl,
                                t: t,
                                language: language,
                                onChanged: onChanged,
                                onSave: onSave,
                                entities: entities,
                                onInspectEntity: onInspectEntity,
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
      return char == null ? listPane : detailPane;
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
        Expanded(child: detailPane),
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
  final ValueChanged<DragUpdateDetails> onListPaneDrag;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;
  final ValueChanged<String>? onChanged;
  final List<Map<String, dynamic>>? entities;
  final void Function(int? id, String type, String name)? onInspectEntity;

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
    required this.onListPaneDrag,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.cleanText,
    this.onChanged,
    this.entities,
    this.onInspectEntity,
  });

  @override
  Widget build(BuildContext context) {
    final char = selectedCharacter;
    Widget listPane = Card(
      margin: isMobile ? EdgeInsets.zero : const EdgeInsets.all(8),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              t('charChartsTitle'),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
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
                      style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    itemCount: characters.length,
                    itemBuilder: (context, index) {
                      final c = characters[index];
                      final isSelected = char?.id == c.id;
                      return ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        leading: CircleAvatar(
                          radius: 12,
                          backgroundColor: isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            c.name.isNotEmpty ? c.name[0].toUpperCase() : '?',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                        title: Text(
                          c.name,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: c.motivation.isNotEmpty
                            ? Text(c.motivation, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11))
                            : null,
                        selected: isSelected,
                        onTap: () => onSelectCharacter(c),
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
                onOpenZenMode: char != null
                    ? () {
                        ZenModeView.show(
                          context,
                          title: '${char.name} (${t('step7Title')})',
                          controller: chartCtrl,
                          t: t,
                          language: language,
                          onChanged: onChanged,
                          onSave: onSave,
                          entities: entities,
                          onInspectEntity: onInspectEntity,
                        );
                      }
                    : null,
                t: t,
                isMobile: isMobile,
              ),
            ],
          ),
          const SizedBox(height: 12),
          char == null
              ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(t('selectCharPlaceholder'))))
              : Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${char.name} - ${t('charChartsTitle')}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      StepReferenceCard(
                        leadingIcon: Icons.badge,
                        title: '${char.name} (${t('charRefBioLabel')} Step 3)',
                        language: language,
                        t: t,
                        child: _buildCharacterBioPreviewContent(char: char, theme: Theme.of(context), t: t, cleanText: cleanText),
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
                            entities: entities,
                            onInspectEntity: onInspectEntity,
                            onOpenZenMode: () {
                              ZenModeView.show(
                                context,
                                title: '${char.name} (${t('step7Title')})',
                                controller: chartCtrl,
                                t: t,
                                language: language,
                                onChanged: onChanged,
                                onSave: onSave,
                                entities: entities,
                                onInspectEntity: onInspectEntity,
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
      return char == null ? listPane : detailPane;
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
        Expanded(child: detailPane),
      ],
    );
  }
}

Widget _buildCharacterBioPreviewContent({
  required Character char,
  required ThemeData theme,
  required String Function(String) t,
  required String Function(String) cleanText,
}) {
  final rows = <Widget>[];
  if (char.motivation.isNotEmpty) {
    rows.add(_buildBioFieldRow(t('charMotivationLabel'), char.motivation, theme));
  }
  if (char.goal.isNotEmpty) {
    rows.add(_buildBioFieldRow(t('charGoalLabel'), char.goal, theme));
  }
  if (char.conflict.isNotEmpty) {
    rows.add(_buildBioFieldRow(t('charConflictLabel'), char.conflict, theme));
  }
  if (char.epiphany.isNotEmpty) {
    rows.add(_buildBioFieldRow(t('charEpiphanyLabel'), char.epiphany, theme));
  }
  if (char.oneParagraphSummary.isNotEmpty) {
    rows.add(const SizedBox(height: 4));
    rows.add(_buildBioFieldRow(t('charSummaryLabel'), cleanText(char.oneParagraphSummary), theme));
  }

  if (rows.isEmpty) {
    return Text(
      t('referenceEmpty'),
      style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.7)),
    );
  }

  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: rows,
  );
}

Widget _buildBioFieldRow(String label, String value, ThemeData theme) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: RichText(
      text: TextSpan(
        style: TextStyle(fontSize: 12, height: 1.5, color: theme.colorScheme.onSurface),
        children: [
          TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.bold)),
          TextSpan(text: value),
        ],
      ),
    ),
  );
}
