import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum ZenTheme { dark, sepia, light, navy }
enum ZenWidth { narrow, medium, wide, full }

class ZenModeView extends StatefulWidget {
  final String title;
  final TextEditingController controller;
  final String Function(String) t;
  final String language;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onSave;

  const ZenModeView({
    super.key,
    required this.title,
    required this.controller,
    required this.t,
    required this.language,
    this.onChanged,
    this.onSave,
  });

  static Future<void> show(
    BuildContext context, {
    required String title,
    required TextEditingController controller,
    required String Function(String) t,
    required String language,
    ValueChanged<String>? onChanged,
    VoidCallback? onSave,
  }) {
    return Navigator.of(context, rootNavigator: true).push(
      PageRouteBuilder(
        opaque: true,
        transitionDuration: const Duration(milliseconds: 300),
        reverseTransitionDuration: const Duration(milliseconds: 250),
        pageBuilder: (context, animation, secondaryAnimation) {
          return FadeTransition(
            opacity: animation,
            child: ZenModeView(
              title: title,
              controller: controller,
              t: t,
              language: language,
              onChanged: onChanged,
              onSave: onSave,
            ),
          );
        },
      ),
    );
  }

  @override
  State<ZenModeView> createState() => _ZenModeViewState();
}

class _ZenModeViewState extends State<ZenModeView> {
  ZenTheme _selectedTheme = ZenTheme.dark;
  ZenWidth _selectedWidth = ZenWidth.medium;
  double _fontSize = 18.0;
  bool _isHudVisible = true;
  Timer? _hideHudTimer;
  int _wordCount = 0;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _calculateWordCount();
    widget.controller.addListener(_calculateWordCount);
    _startHideHudTimer();
  }

  @override
  void dispose() {
    _hideHudTimer?.cancel();
    _focusNode.dispose();
    widget.controller.removeListener(_calculateWordCount);
    super.dispose();
  }

  void _calculateWordCount() {
    final text = widget.controller.text.trim();
    if (text.isEmpty) {
      if (_wordCount != 0) setState(() => _wordCount = 0);
      return;
    }
    final words = text.split(RegExp(r'\s+')).where((s) => s.isNotEmpty).length;
    if (_wordCount != words) {
      setState(() => _wordCount = words);
    }
  }

  void _startHideHudTimer() {
    _hideHudTimer?.cancel();
    _hideHudTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _isHudVisible) {
        setState(() => _isHudVisible = false);
      }
    });
  }

  void _onUserActivity() {
    if (!_isHudVisible) {
      setState(() => _isHudVisible = true);
    }
    _startHideHudTimer();
  }

  Color _getBackgroundColor() {
    switch (_selectedTheme) {
      case ZenTheme.dark:
        return const Color(0xFF141416);
      case ZenTheme.sepia:
        return const Color(0xFFFBF0D9);
      case ZenTheme.light:
        return const Color(0xFFFAFAFC);
      case ZenTheme.navy:
        return const Color(0xFF0F172A);
    }
  }

  Color _getTextColor() {
    switch (_selectedTheme) {
      case ZenTheme.dark:
        return const Color(0xFFE4E4E7);
      case ZenTheme.sepia:
        return const Color(0xFF3D2F1D);
      case ZenTheme.light:
        return const Color(0xFF18181B);
      case ZenTheme.navy:
        return const Color(0xFFE2E8F0);
    }
  }

  Color _getHudColor() {
    switch (_selectedTheme) {
      case ZenTheme.dark:
        return const Color(0xFF202024).withValues(alpha: 0.85);
      case ZenTheme.sepia:
        return const Color(0xFFEFE2C3).withValues(alpha: 0.9);
      case ZenTheme.light:
        return const Color(0xFFEDEDF2).withValues(alpha: 0.9);
      case ZenTheme.navy:
        return const Color(0xFF1E293B).withValues(alpha: 0.85);
    }
  }

  double _getMaxWidth() {
    switch (_selectedWidth) {
      case ZenWidth.narrow:
        return 650;
      case ZenWidth.medium:
        return 820;
      case ZenWidth.wide:
        return 1020;
      case ZenWidth.full:
        return double.infinity;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final isRtl = widget.language == 'ar';
    final bgColor = _getBackgroundColor();
    final textColor = _getTextColor();
    final hudBg = _getHudColor();

    return Focus(
      autofocus: true,
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent) {
          if (event.logicalKey == LogicalKeyboardKey.escape ||
              event.logicalKey == LogicalKeyboardKey.f11) {
            Navigator.of(context).pop();
            return KeyEventResult.handled;
          }
        }
        return KeyEventResult.ignored;
      },
      child: MouseRegion(
        onHover: (_) => _onUserActivity(),
        child: Scaffold(
          backgroundColor: bgColor,
          body: Directionality(
            textDirection: isRtl ? TextDirection.rtl : TextDirection.ltr,
            child: Stack(
              children: [
                // Centered Manuscript Writing Area
                Positioned.fill(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: _getMaxWidth()),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 80),
                        child: TextField(
                          controller: widget.controller,
                          focusNode: _focusNode,
                          maxLines: null,
                          expands: true,
                          keyboardType: TextInputType.multiline,
                          textAlign: isRtl ? TextAlign.right : TextAlign.left,
                          textDirection: isRtl ? TextDirection.rtl : TextDirection.ltr,
                          style: TextStyle(
                            color: textColor,
                            fontSize: _fontSize,
                            height: 1.8,
                            fontFamily: isRtl ? 'Cairo' : 'Segoe UI',
                          ),
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            hintText: '...',
                            hintStyle: TextStyle(
                              color: textColor.withValues(alpha: 0.3),
                              fontSize: _fontSize,
                            ),
                          ),
                          onChanged: (val) {
                            _onUserActivity();
                            widget.onChanged?.call(val);
                          },
                        ),
                      ),
                    ),
                  ),
                ),

                // Floating Top HUD Toolbar (Auto-Hiding)
                Positioned(
                  top: 16,
                  left: 20,
                  right: 20,
                  child: AnimatedOpacity(
                    opacity: _isHudVisible ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 250),
                    child: IgnorePointer(
                      ignoring: !_isHudVisible,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          decoration: BoxDecoration(
                            color: hudBg,
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Document Title
                                Icon(Icons.self_improvement, color: textColor.withValues(alpha: 0.8), size: 18),
                                const SizedBox(width: 8),
                                ConstrainedBox(
                                  constraints: const BoxConstraints(maxWidth: 160),
                                  child: Text(
                                    widget.title,
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(height: 16, width: 1, color: textColor.withValues(alpha: 0.2)),
                                const SizedBox(width: 8),

                                // Theme Popup
                                PopupMenuButton<ZenTheme>(
                                  initialValue: _selectedTheme,
                                  tooltip: 'Theme',
                                  icon: Icon(Icons.palette_outlined, color: textColor.withValues(alpha: 0.8), size: 18),
                                  onSelected: (theme) => setState(() => _selectedTheme = theme),
                                  itemBuilder: (context) => [
                                    PopupMenuItem(value: ZenTheme.dark, child: Text(t('zenThemeDark'))),
                                    PopupMenuItem(value: ZenTheme.sepia, child: Text(t('zenThemeSepia'))),
                                    PopupMenuItem(value: ZenTheme.light, child: Text(t('zenThemeLight'))),
                                    PopupMenuItem(value: ZenTheme.navy, child: Text(t('zenThemeNavy'))),
                                  ],
                                ),

                                // Width Popup
                                PopupMenuButton<ZenWidth>(
                                  initialValue: _selectedWidth,
                                  tooltip: 'Width',
                                  icon: Icon(Icons.aspect_ratio, color: textColor.withValues(alpha: 0.8), size: 18),
                                  onSelected: (w) => setState(() => _selectedWidth = w),
                                  itemBuilder: (context) => [
                                    PopupMenuItem(value: ZenWidth.narrow, child: Text(t('zenWidthNarrow'))),
                                    PopupMenuItem(value: ZenWidth.medium, child: Text(t('zenWidthMedium'))),
                                    PopupMenuItem(value: ZenWidth.wide, child: Text(t('zenWidthWide'))),
                                    PopupMenuItem(value: ZenWidth.full, child: Text(t('zenWidthFull'))),
                                  ],
                                ),

                                // Font Size Controls
                                IconButton(
                                  icon: Icon(Icons.remove, color: textColor.withValues(alpha: 0.8), size: 16),
                                  tooltip: 'Decrease font',
                                  onPressed: () {
                                    if (_fontSize > 14) setState(() => _fontSize -= 1.5);
                                  },
                                ),
                                Text(
                                  '${_fontSize.toInt()}',
                                  style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                IconButton(
                                  icon: Icon(Icons.add, color: textColor.withValues(alpha: 0.8), size: 16),
                                  tooltip: 'Increase font',
                                  onPressed: () {
                                    if (_fontSize < 32) setState(() => _fontSize += 1.5);
                                  },
                                ),

                                const SizedBox(width: 8),
                                Container(height: 16, width: 1, color: textColor.withValues(alpha: 0.2)),
                                const SizedBox(width: 8),

                                // Exit Zen Mode Button
                                TextButton.icon(
                                  onPressed: () => Navigator.of(context).pop(),
                                  icon: Icon(Icons.fullscreen_exit, color: textColor, size: 18),
                                  label: Text(
                                    t('exitZenMode'),
                                    style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                // Floating Bottom Word Count & Auto-Save Badge (Auto-Hiding)
                Positioned(
                  bottom: 16,
                  left: 20,
                  right: 20,
                  child: AnimatedOpacity(
                    opacity: _isHudVisible ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 250),
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: hudBg,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$_wordCount ${t('words')}',
                              style: TextStyle(
                                color: textColor.withValues(alpha: 0.8),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              '•',
                              style: TextStyle(color: textColor.withValues(alpha: 0.4), fontSize: 12),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              t('statusSaved'),
                              style: TextStyle(
                                color: textColor.withValues(alpha: 0.8),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
