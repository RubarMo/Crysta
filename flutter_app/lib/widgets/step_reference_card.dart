import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A modern, prominent, and clearly expandable reference card component
/// used in Snowflake step editors and character sheets to display context
/// from preceding steps.
class StepReferenceCard extends StatefulWidget {
  final String title;
  final String? subtitle;
  final String? referenceText;
  final Widget? child;
  final IconData leadingIcon;
  final bool isInitiallyExpanded;
  final String language;
  final String Function(String) t;

  const StepReferenceCard({
    super.key,
    required this.title,
    this.subtitle,
    this.referenceText,
    this.child,
    this.leadingIcon = Icons.auto_stories,
    this.isInitiallyExpanded = false,
    required this.language,
    required this.t,
  });

  static String stripHtml(String html) {
    return html
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'</li>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll(RegExp(r'&nbsp;', caseSensitive: false), ' ')
        .replaceAll(RegExp(r'&amp;', caseSensitive: false), '&')
        .replaceAll(RegExp(r'&lt;', caseSensitive: false), '<')
        .replaceAll(RegExp(r'&gt;', caseSensitive: false), '>')
        .trim();
  }

  static TextSpan parseHtmlToTextSpan(String htmlText, TextStyle baseStyle) {
    if (!htmlText.contains('<') || !htmlText.contains('>')) {
      return TextSpan(text: htmlText, style: baseStyle);
    }

    String normalized = htmlText
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'</li>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<li[^>]*>', caseSensitive: false), '• ')
        .replaceAll(RegExp(r'<blockquote[^>]*>', caseSensitive: false), '“ ')
        .replaceAll(RegExp(r'</blockquote>', caseSensitive: false), ' ”\n')
        .replaceAll(RegExp(r'&nbsp;', caseSensitive: false), ' ')
        .replaceAll(RegExp(r'&amp;', caseSensitive: false), '&')
        .replaceAll(RegExp(r'&lt;', caseSensitive: false), '<')
        .replaceAll(RegExp(r'&gt;', caseSensitive: false), '>');

    final List<InlineSpan> spans = [];
    final tagRegex = RegExp(r'<(/?[a-zA-Z0-9]+)[^>]*>');
    int lastIndex = 0;

    bool isBold = false;
    bool isItalic = false;
    bool isUnderline = false;
    bool isStrike = false;
    bool isH1 = false;
    bool isH2 = false;

    for (final match in tagRegex.allMatches(normalized)) {
      if (match.start > lastIndex) {
        final text = normalized.substring(lastIndex, match.start);
        if (text.isNotEmpty) {
          TextStyle currentStyle = baseStyle;
          if (isBold) currentStyle = currentStyle.copyWith(fontWeight: FontWeight.bold);
          if (isItalic) currentStyle = currentStyle.copyWith(fontStyle: FontStyle.italic);
          if (isH1) currentStyle = currentStyle.copyWith(fontSize: (baseStyle.fontSize ?? 13) * 1.3, fontWeight: FontWeight.bold);
          if (isH2) currentStyle = currentStyle.copyWith(fontSize: (baseStyle.fontSize ?? 13) * 1.15, fontWeight: FontWeight.bold);

          TextDecoration decoration = TextDecoration.none;
          if (isUnderline && isStrike) {
            decoration = TextDecoration.combine([TextDecoration.underline, TextDecoration.lineThrough]);
          } else if (isUnderline) {
            decoration = TextDecoration.underline;
          } else if (isStrike) {
            decoration = TextDecoration.lineThrough;
          }
          currentStyle = currentStyle.copyWith(decoration: decoration);

          spans.add(TextSpan(text: text, style: currentStyle));
        }
      }

      final tag = match.group(1)?.toLowerCase() ?? '';
      switch (tag) {
        case 'b':
        case 'strong':
          isBold = true;
          break;
        case '/b':
        case '/strong':
          isBold = false;
          break;
        case 'i':
        case 'em':
          isItalic = true;
          break;
        case '/i':
        case '/em':
          isItalic = false;
          break;
        case 'u':
          isUnderline = true;
          break;
        case '/u':
          isUnderline = false;
          break;
        case 's':
        case 'strike':
          isStrike = true;
          break;
        case '/s':
        case '/strike':
          isStrike = false;
          break;
        case 'h1':
          isH1 = true;
          break;
        case '/h1':
          isH1 = false;
          break;
        case 'h2':
          isH2 = true;
          break;
        case '/h2':
          isH2 = false;
          break;
      }
      lastIndex = match.end;
    }

    if (lastIndex < normalized.length) {
      final text = normalized.substring(lastIndex);
      if (text.isNotEmpty) {
        spans.add(TextSpan(text: text, style: baseStyle));
      }
    }

    return TextSpan(children: spans, style: baseStyle);
  }

  @override
  State<StepReferenceCard> createState() => _StepReferenceCardState();
}

class _StepReferenceCardState extends State<StepReferenceCard> with SingleTickerProviderStateMixin {
  late bool _isExpanded;
  bool _isHovered = false;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.isInitiallyExpanded;
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
  }

  void _copyToClipboard() {
    final textToCopy = widget.referenceText;
    if (textToCopy != null && textToCopy.trim().isNotEmpty) {
      Clipboard.setData(ClipboardData(text: StepReferenceCard.stripHtml(textToCopy)));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text(widget.t('referenceCopied')),
            ],
          ),
          backgroundColor: Colors.teal,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasText = widget.referenceText != null && StepReferenceCard.stripHtml(widget.referenceText!).isNotEmpty;
    final hasChild = widget.child != null;
    final hasContent = hasText || hasChild;

    return Container(
      decoration: BoxDecoration(
        color: _isHovered
            ? colorScheme.surfaceContainerHighest.withValues(alpha: 0.6)
            : colorScheme.surfaceContainerHigh.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isExpanded
              ? colorScheme.primary.withValues(alpha: 0.5)
              : colorScheme.outlineVariant.withValues(alpha: 0.4),
          width: _isExpanded ? 1.5 : 1.0,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(11),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Interactive Header Bar
            MouseRegion(
              cursor: SystemMouseCursors.click,
              onEnter: (_) => setState(() => _isHovered = true),
              onExit: (_) => setState(() => _isHovered = false),
              child: InkWell(
                onTap: _toggleExpanded,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      // Badge Icon
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: colorScheme.primaryContainer,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          widget.leadingIcon,
                          size: 18,
                          color: colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Title & Subtitle
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: colorScheme.onSurface,
                              ),
                            ),
                            if (widget.subtitle != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                widget.subtitle!,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      // Copy Button (only visible when expanded and text is available)
                      if (_isExpanded && hasText) ...[
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 17),
                          tooltip: widget.t('copyReference'),
                          visualDensity: VisualDensity.compact,
                          color: colorScheme.onSurfaceVariant,
                          onPressed: _copyToClipboard,
                        ),
                        const SizedBox(width: 6),
                      ],

                      // Prominent Expand / Collapse Pill Button
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: _isExpanded
                              ? colorScheme.primary
                              : colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: _isExpanded
                                ? colorScheme.primary
                                : colorScheme.outlineVariant.withValues(alpha: 0.6),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _isExpanded
                                  ? widget.t('clickToCollapse')
                                  : widget.t('clickToExpand'),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: _isExpanded
                                    ? colorScheme.onPrimary
                                    : colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(width: 4),
                            AnimatedRotation(
                              turns: _isExpanded ? 0.5 : 0.0,
                              duration: const Duration(milliseconds: 200),
                              child: Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 16,
                                color: _isExpanded
                                    ? colorScheme.onPrimary
                                    : colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Animated Expandable Content Area
            AnimatedCrossFade(
              firstChild: const SizedBox.shrink(),
              secondChild: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Divider(height: 1, color: colorScheme.outlineVariant.withValues(alpha: 0.5)),
                  Container(
                    color: colorScheme.surface.withValues(alpha: 0.5),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 180),
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(14),
                        child: hasContent
                            ? (widget.child ??
                                SelectableText.rich(
                                  StepReferenceCard.parseHtmlToTextSpan(
                                    widget.referenceText!,
                                    TextStyle(
                                      fontSize: 13,
                                      height: 1.55,
                                      fontFamily: widget.language == 'ar' ? 'Cairo' : 'Segoe UI',
                                      color: colorScheme.onSurface,
                                    ),
                                  ),
                                ))
                            : Text(
                                widget.t('referenceEmpty'),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontStyle: FontStyle.italic,
                                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                                ),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
              crossFadeState: _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 220),
            ),
          ],
        ),
      ),
    );
  }
}
