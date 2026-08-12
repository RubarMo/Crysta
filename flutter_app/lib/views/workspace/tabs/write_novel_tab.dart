import 'package:flutter/material.dart';
import '../../../models.dart';
import '../../../widgets/native_text_editor.dart';
import '../zen_mode_view.dart';

class WriteNovelTab extends StatefulWidget {
  final Novel activeNovel;
  final List<Chapter> chapters;
  final Chapter? selectedChapter;
  final TextEditingController chapterTitleCtrl;
  final TextEditingController chapterCtrl;
  final double listPaneWidth;
  final Future<void> Function(Chapter) onSaveChapter;
  final ValueChanged<Chapter> onDeleteChapter;
  final ValueChanged<Chapter?> onSelectChapter;
  final ValueChanged<DragUpdateDetails> onListPaneDrag;
  final Future<void> Function() onSaveActiveContent;
  final Function(String format) onExportDocument;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;
  final ValueChanged<String>? onChanged;
  final List<Map<String, dynamic>>? entities;
  final void Function(int? id, String type, String name)? onInspectEntity;

  const WriteNovelTab({
    super.key,
    required this.activeNovel,
    required this.chapters,
    required this.selectedChapter,
    required this.chapterTitleCtrl,
    required this.chapterCtrl,
    required this.listPaneWidth,
    required this.onSaveChapter,
    required this.onDeleteChapter,
    required this.onSelectChapter,
    required this.onListPaneDrag,
    required this.onSaveActiveContent,
    required this.onExportDocument,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.cleanText,
    this.onChanged,
    this.entities,
    this.onInspectEntity,
  });

  @override
  State<WriteNovelTab> createState() => _WriteNovelTabState();
}

class _WriteNovelTabState extends State<WriteNovelTab> {
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t('chaptersSidebarTitle'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                IconButton(
                  onPressed: () async {
                    final newChap = Chapter(
                      novelId: widget.activeNovel.id!,
                      title: 'Chapter ${widget.chapters.length + 1}',
                      content: '',
                      sortOrder: widget.chapters.length.toInt(),
                    );
                    await widget.onSaveChapter(newChap);
                  },
                  icon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.primary, size: 20),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              itemCount: widget.chapters.length,
              itemBuilder: (context, index) {
                final chap = widget.chapters[index];
                final isSelected = widget.selectedChapter?.id == chap.id;
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
                    chap.title,
                    style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                  selected: isSelected,
                  trailing: IconButton(
                    icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 16),
                    onPressed: () => widget.onDeleteChapter(chap),
                    visualDensity: VisualDensity.compact,
                  ),
                  onTap: () => widget.onSelectChapter(chap),
                );
              },
            ),
          )
        ],
      ),
    );

    Widget detailPane = widget.selectedChapter == null
        ? Center(child: Text(t('selectChapterPlaceholder')))
        : Padding(
            padding: EdgeInsets.all(isMobile ? 12 : 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    if (isMobile)
                      IconButton(
                        icon: const Icon(Icons.arrow_back),
                        onPressed: () => widget.onSelectChapter(null),
                      ),
                    Expanded(
                      child: TextFormField(
                        key: ValueKey(widget.selectedChapter?.id),
                        controller: widget.chapterTitleCtrl,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        decoration: InputDecoration(
                          labelText: t('chapterTitleLabel'),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          border: const OutlineInputBorder(),
                        ),
                        onChanged: (val) {
                          final updated = Chapter(
                            id: widget.selectedChapter!.id,
                            novelId: widget.selectedChapter!.novelId,
                            title: val,
                            content: widget.chapterCtrl.text,
                            sortOrder: widget.selectedChapter!.sortOrder,
                          );
                          widget.onSaveChapter(updated);
                          widget.onChanged?.call(val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: AlignmentDirectional.centerEnd,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.self_improvement, size: 20),
                          tooltip: t('zenModeBtn'),
                          onPressed: () {
                            ZenModeView.show(
                              context,
                              title: widget.chapterTitleCtrl.text.isNotEmpty
                                  ? widget.chapterTitleCtrl.text
                                  : t('writeNovelTitle'),
                              controller: widget.chapterCtrl,
                              t: t,
                              language: widget.language,
                              onChanged: widget.onChanged,
                              onSave: widget.onSaveActiveContent,
                              entities: widget.entities,
                              onInspectEntity: widget.onInspectEntity,
                            );
                          },
                        ),
                        const SizedBox(width: 4),
                        ElevatedButton.icon(
                          onPressed: () => widget.onSaveActiveContent(),
                          icon: const Icon(Icons.save, size: 16),
                          label: Text(t('save')),
                        ),
                        const SizedBox(width: 6),
                        OutlinedButton.icon(
                          onPressed: () => widget.onExportDocument('txt'),
                          icon: const Icon(Icons.article, size: 16),
                          label: Text(t('exportTxtBtn')),
                        ),
                        const SizedBox(width: 6),
                        OutlinedButton.icon(
                          onPressed: () => widget.onExportDocument('docx'),
                          icon: const Icon(Icons.description, size: 16),
                          label: Text(t('exportDocxBtn')),
                        ),
                        const SizedBox(width: 4),
                        IconButton(
                          onPressed: () => widget.onDeleteChapter(widget.selectedChapter!),
                          icon: Icon(Icons.delete, color: Theme.of(context).colorScheme.error),
                          tooltip: t('delete'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: Card(
                    margin: EdgeInsets.zero,
                    child: NativeTextEditor(
                      controller: widget.chapterCtrl,
                      wordCountLabel: t('words'),
                      isRtl: widget.language == 'ar',
                      onChanged: widget.onChanged,
                      entities: widget.entities,
                      onInspectEntity: widget.onInspectEntity,
                      onOpenZenMode: () {
                        ZenModeView.show(
                          context,
                          title: widget.chapterTitleCtrl.text.isNotEmpty
                              ? widget.chapterTitleCtrl.text
                              : t('writeNovelTitle'),
                          controller: widget.chapterCtrl,
                          t: t,
                          language: widget.language,
                          onChanged: widget.onChanged,
                          onSave: widget.onSaveActiveContent,
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
          );

    if (isMobile) {
      return widget.selectedChapter == null ? listPane : detailPane;
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxListWidth = (constraints.maxWidth - 460.0).clamp(200.0, 360.0);
        final effectiveListWidth = widget.listPaneWidth.clamp(200.0, maxListWidth);

        return Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(width: effectiveListWidth, child: listPane),
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
            Expanded(
              child: ClipRect(
                child: detailPane,
              ),
            ),
          ],
        );
      },
    );
  }
}
