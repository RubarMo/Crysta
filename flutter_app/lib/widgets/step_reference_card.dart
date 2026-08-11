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
      Clipboard.setData(ClipboardData(text: textToCopy));
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
    final hasText = widget.referenceText != null && widget.referenceText!.trim().isNotEmpty;
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
                                SelectableText(
                                  widget.referenceText!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    height: 1.55,
                                    color: colorScheme.onSurface,
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
