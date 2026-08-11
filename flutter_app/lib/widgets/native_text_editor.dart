import 'package:flutter/material.dart';
import 'package:crysta/widgets/web_editor/universal_web_editor.dart';

class NativeTextEditor extends StatefulWidget {
  final TextEditingController controller;
  final String wordCountLabel;
  final String placeholder;
  final bool isRtl;
  final bool showToolbar;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onOpenZenMode;
  final String? zenModeTooltip;

  const NativeTextEditor({
    super.key,
    required this.controller,
    required this.wordCountLabel,
    this.placeholder = '',
    this.isRtl = false,
    this.showToolbar = true,
    this.onChanged,
    this.onOpenZenMode,
    this.zenModeTooltip,
  });

  @override
  State<NativeTextEditor> createState() => _NativeTextEditorState();
}

class _NativeTextEditorState extends State<NativeTextEditor> {
  int _countWords(String text) {
    final plain = text.replaceAll(RegExp(r'<[^>]*>'), ' ').trim();
    if (plain.isEmpty) return 0;
    return plain.split(RegExp(r'\s+')).length;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Expanded(
          child: UniversalWebEditor(
            controller: widget.controller,
            placeholder: widget.placeholder,
            isRtl: widget.isRtl,
            showToolbar: widget.showToolbar,
            onChanged: widget.onChanged,
          ),
        ),
        AnimatedBuilder(
          animation: widget.controller,
          builder: (context, _) {
            final wordCount = _countWords(widget.controller.text);
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                border: Border(
                  top: BorderSide(
                    color: theme.dividerColor.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (widget.onOpenZenMode != null)
                    IconButton(
                      icon: const Icon(Icons.self_improvement, size: 16),
                      tooltip: widget.zenModeTooltip ?? 'Zen Mode',
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      onPressed: widget.onOpenZenMode,
                    )
                  else
                    const SizedBox.shrink(),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.text_snippet_outlined, size: 14, color: theme.colorScheme.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Text(
                        '$wordCount ${widget.wordCountLabel}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
