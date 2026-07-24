import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class NativeTextEditor extends StatefulWidget {
  final TextEditingController controller;
  final String wordCountLabel;
  final String placeholder;
  final bool isRtl;
  final ValueChanged<String>? onChanged;

  const NativeTextEditor({
    super.key,
    required this.controller,
    required this.wordCountLabel,
    this.placeholder = '',
    this.isRtl = false,
    this.onChanged,
  });

  @override
  State<NativeTextEditor> createState() => _NativeTextEditorState();
}

class _NativeTextEditorState extends State<NativeTextEditor> {
  // ponytail: Flutter uses logical arrow keys (Left=backward, Right=forward)
  // which inverts visually in RTL. We swap them so arrows match native Windows
  // visual behavior. Ceiling: doesn't handle mixed bidi runs per-character.
  KeyEventResult _handleRtlArrowKeys(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) return KeyEventResult.ignored;

    final key = event.logicalKey;
    if (key != LogicalKeyboardKey.arrowLeft && key != LogicalKeyboardKey.arrowRight) {
      return KeyEventResult.ignored;
    }

    final ctrl = widget.controller;
    final sel = ctrl.selection;
    if (!sel.isValid) return KeyEventResult.ignored;

    final text = ctrl.text;
    final shift = HardwareKeyboard.instance.isShiftPressed;
    final isCtrl = HardwareKeyboard.instance.isControlPressed;
    final bool visualLeft = key == LogicalKeyboardKey.arrowLeft;

    int newOffset;
    if (isCtrl) {
      newOffset = visualLeft
          ? _nextWordBoundary(text, sel.extentOffset, forward: true)
          : _nextWordBoundary(text, sel.extentOffset, forward: false);
    } else {
      newOffset = visualLeft
          ? (sel.extentOffset + 1).clamp(0, text.length)
          : (sel.extentOffset - 1).clamp(0, text.length);
    }

    if (shift) {
      ctrl.selection = sel.copyWith(extentOffset: newOffset);
    } else {
      if (!sel.isCollapsed) {
        ctrl.selection = TextSelection.collapsed(
          offset: visualLeft ? sel.end : sel.start,
        );
      } else {
        ctrl.selection = TextSelection.collapsed(offset: newOffset);
      }
    }

    return KeyEventResult.handled;
  }

  static int _nextWordBoundary(String text, int offset, {required bool forward}) {
    if (forward) {
      int i = offset;
      while (i < text.length && !_isWordBreak(text[i])) {
        i++;
      }
      while (i < text.length && _isWordBreak(text[i])) {
        i++;
      }
      return i;
    } else {
      int i = offset;
      while (i > 0 && _isWordBreak(text[i - 1])) {
        i--;
      }
      while (i > 0 && !_isWordBreak(text[i - 1])) {
        i--;
      }
      return i;
    }
  }

  static bool _isWordBreak(String ch) => ch == ' ' || ch == '\n' || ch == '\t';

  int _countWords(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return 0;
    return trimmed.split(RegExp(r'\s+')).length;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final onSurfaceColor = theme.colorScheme.onSurface;

    Widget textField = TextField(
      controller: widget.controller,
      maxLines: null,
      expands: true,
      textAlignVertical: TextAlignVertical.top,
      textDirection: widget.isRtl ? TextDirection.rtl : TextDirection.ltr,
      textAlign: widget.isRtl ? TextAlign.right : TextAlign.left,
      onChanged: widget.onChanged,
      style: TextStyle(
        color: onSurfaceColor,
        fontSize: 15.0,
        fontFamily: widget.isRtl ? 'Cairo' : 'Segoe UI',
        height: 1.6,
      ),
      decoration: InputDecoration(
        hintText: widget.placeholder,
        contentPadding: const EdgeInsets.all(16),
        border: InputBorder.none,
        enabledBorder: InputBorder.none,
        focusedBorder: InputBorder.none,
      ),
    );

    if (widget.isRtl) {
      textField = Focus(
        onKeyEvent: _handleRtlArrowKeys,
        child: textField,
      );
    }

    return Column(
      children: [
        Expanded(child: textField),
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
                mainAxisAlignment: MainAxisAlignment.end,
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
            );
          },
        ),
      ],
    );
  }
}
