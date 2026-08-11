import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:webview_flutter/webview_flutter.dart' as mobile;
import 'package:webview_windows/webview_windows.dart' as win;

class UniversalWebEditor extends StatefulWidget {
  final TextEditingController controller;
  final String placeholder;
  final bool isRtl;
  final Color? backgroundColor;
  final Color? textColor;
  final double? fontSize;
  final bool showToolbar;
  final ValueChanged<String>? onChanged;

  const UniversalWebEditor({
    super.key,
    required this.controller,
    this.placeholder = '',
    this.isRtl = false,
    this.backgroundColor,
    this.textColor,
    this.fontSize,
    this.showToolbar = true,
    this.onChanged,
  });

  @override
  State<UniversalWebEditor> createState() => _UniversalWebEditorState();
}

class _UniversalWebEditorState extends State<UniversalWebEditor> with SingleTickerProviderStateMixin {
  // Windows Controller
  win.WebviewController? _winController;
  // Mobile Controller
  mobile.WebViewController? _mobileController;

  Ticker? _momentumTicker;
  VelocityTracker? _velocityTracker;
  double _momentumVelocityY = 0.0;
  double _momentumVelocityX = 0.0;
  Duration _lastTickTime = Duration.zero;
  bool _isPinching = false;

  bool _isInitialized = false;
  bool _isEditorReady = false;
  bool _isDisposed = false;
  bool _hasInitError = false;
  String _lastKnownText = '';

  void _scrollBy(double dy, [double dx = 0.0]) {
    if (_winController == null || !_isEditorReady || _isDisposed) return;
    _winController!.executeScript(
      'if (window.scrollEditor) { window.scrollEditor($dy, $dx); } else { const el = document.getElementById("editor-container"); if (el) { el.scrollTop += $dy; el.scrollLeft += $dx; } }',
    );
  }

  void _startMomentumGlide() {
    _momentumTicker?.stop();
    _lastTickTime = Duration.zero;
    _momentumTicker = createTicker((elapsed) {
      if (_isDisposed) return;
      if (_lastTickTime == Duration.zero) {
        _lastTickTime = elapsed;
        return;
      }
      final double dt = (elapsed - _lastTickTime).inMicroseconds / 1000000.0;
      _lastTickTime = elapsed;
      if (dt <= 0.0 || dt > 0.1) return;

      // Invert pan velocity: upward finger flick (negative velocity) scrolls content downward (positive dy)
      final double dy = -_momentumVelocityY * dt;
      final double dx = -_momentumVelocityX * dt;
      _scrollBy(dy, dx);

      // Smooth Windows/Flutter friction deceleration
      _momentumVelocityY *= 0.92;
      _momentumVelocityX *= 0.92;

      if (_momentumVelocityY.abs() < 15.0 && _momentumVelocityX.abs() < 15.0) {
        _momentumTicker?.stop();
      }
    });
    _momentumTicker?.start();
  }

  bool get _isTestEnvironment =>
      kIsWeb || (WidgetsBinding.instance.runtimeType.toString().contains('Test'));

  @override
  void initState() {
    super.initState();
    _lastKnownText = widget.controller.text;
    widget.controller.addListener(_onControllerChanged);
    if (!_isTestEnvironment) {
      _initWebView();
    }
  }

  ThemeData? _lastThemeData;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final theme = Theme.of(context);
    if (_lastThemeData != theme) {
      _lastThemeData = theme;
      _syncThemeToWeb();
    }
  }

  @override
  void didUpdateWidget(covariant UniversalWebEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onControllerChanged);
      widget.controller.addListener(_onControllerChanged);
      _lastKnownText = widget.controller.text;
      _syncContentToWeb();
    }
    if (oldWidget.isRtl != widget.isRtl ||
        oldWidget.placeholder != widget.placeholder ||
        oldWidget.backgroundColor != widget.backgroundColor ||
        oldWidget.textColor != widget.textColor ||
        oldWidget.fontSize != widget.fontSize ||
        oldWidget.showToolbar != widget.showToolbar) {
      _syncThemeToWeb();
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _momentumTicker?.dispose();
    widget.controller.removeListener(_onControllerChanged);
    _winController?.dispose();
    super.dispose();
  }

  void _onControllerChanged() {
    if (widget.controller.text != _lastKnownText) {
      _lastKnownText = widget.controller.text;
      _syncContentToWeb();
    }
  }

  Future<void> _initWebView() async {
    try {
      final fullHtml = await _loadBundledHtml();

      if (Platform.isWindows) {
        final controller = win.WebviewController();
        await controller.initialize();
        if (_isDisposed) {
          controller.dispose();
          return;
        }
        await controller.setBackgroundColor(Colors.transparent);
        _winController = controller;

        controller.webMessage.listen((dynamic message) {
          if (!_isDisposed) {
            _handleWebMessage(message);
          }
        });

        await controller.loadStringContent(fullHtml);
      } else if (Platform.isAndroid || Platform.isIOS || Platform.isMacOS) {
        final controller = mobile.WebViewController()
          ..setJavaScriptMode(mobile.JavaScriptMode.unrestricted)
          ..setBackgroundColor(Colors.transparent)
          ..addJavaScriptChannel(
            'FlutterBridge',
            onMessageReceived: (mobile.JavaScriptMessage msg) {
              if (!_isDisposed) {
                _handleWebMessage(msg.message);
              }
            },
          )
          ..loadHtmlString(fullHtml);

        _mobileController = controller;
      }

      if (mounted && !_isDisposed) {
        setState(() {
          _isInitialized = true;
        });
      }
    } catch (e) {
      debugPrint('UniversalWebEditor initialization error: $e');
      if (mounted && !_isDisposed) {
        setState(() {
          _hasInitError = true;
          _isInitialized = true;
        });
      }
    }
  }

  Future<String> _loadBundledHtml() async {
    final htmlContent = await rootBundle.loadString('assets/editor/index.html');
    final cssContent = await rootBundle.loadString('assets/editor/editor.css');
    final jsContent = await rootBundle.loadString('assets/editor/editor.js');

    return htmlContent
        .replaceFirst('<link rel="stylesheet" href="editor.css">', '<style>\n$cssContent\n</style>')
        .replaceFirst('<script src="editor.js"></script>', '<script>\n$jsContent\n</script>');
  }

  void _handleWebMessage(dynamic rawMsg) {
    if (_isDisposed) return;
    try {
      final Map<String, dynamic> data = rawMsg is String ? jsonDecode(rawMsg) : Map<String, dynamic>.from(rawMsg as Map);
      final type = data['type'];

      if (type == 'ready') {
        _isEditorReady = true;
        _syncThemeToWeb();
        _syncContentToWeb();
      } else if (type == 'content_changed') {
        final html = data['html'] as String? ?? '';
        final text = data['text'] as String? ?? '';
        final content = (html.isNotEmpty && (html.contains('<') && html.contains('>'))) ? html : text;

        if (content != _lastKnownText) {
          _lastKnownText = content;
          scheduleMicrotask(() {
            if (_isDisposed || !mounted) return;
            if (widget.controller.text != content) {
              widget.controller.value = widget.controller.value.copyWith(
                text: content,
                selection: TextSelection.collapsed(offset: content.length),
              );
            }
            widget.onChanged?.call(content);
          });
        }
      }
    } catch (e) {
      debugPrint('Error handling web message: $e');
    }
  }

  void _syncContentToWeb() {
    if (_isDisposed || !_isInitialized || !_isEditorReady) return;
    final text = widget.controller.text;
    _runJs('window.setContent(${jsonEncode(text)});');
  }

  void _syncThemeToWeb() {
    if (_isDisposed || !_isInitialized || !_isEditorReady || !mounted) return;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bg = widget.backgroundColor ?? theme.colorScheme.surface;
    final text = widget.textColor ?? theme.colorScheme.onSurface;
    final primary = theme.colorScheme.primary;

    final bgColor = '#${bg.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}';
    final textColor = '#${text.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}';
    final primaryColor = '#${primary.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}';

    final config = {
      'isDark': isDark,
      'isRtl': widget.isRtl,
      'bgColor': bgColor,
      'textColor': textColor,
      'primaryColor': primaryColor,
      'fontSize': widget.fontSize ?? 15.0,
      'lineHeight': 1.75,
    };

    _runJs('window.setTheme(${jsonEncode(config)});');
    _runJs('window.setPlaceholder(${jsonEncode(widget.placeholder)});');
    _runJs('window.setToolbarVisible(${widget.showToolbar});');
  }

  void _runJs(String script) {
    if (_isDisposed || !_isInitialized) return;
    try {
      if (Platform.isWindows && _winController != null) {
        _winController!.executeScript(script);
      } else if (_mobileController != null) {
        _mobileController!.runJavaScript(script);
      }
    } catch (e) {
      debugPrint('UniversalWebEditor _runJs error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isTestEnvironment || _hasInitError) {
      return TextField(
        controller: widget.controller,
        maxLines: null,
        expands: true,
        textDirection: widget.isRtl ? TextDirection.rtl : TextDirection.ltr,
        textAlign: widget.isRtl ? TextAlign.right : TextAlign.left,
        onChanged: widget.onChanged,
        decoration: InputDecoration(
          hintText: widget.placeholder,
          border: InputBorder.none,
        ),
      );
    }

    if (!_isInitialized) {
      return const Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    if (Platform.isWindows && _winController != null) {
      return Listener(
        onPointerPanZoomStart: (event) {
          _isPinching = false;
          _momentumTicker?.stop();
          _velocityTracker = VelocityTracker.withKind(PointerDeviceKind.trackpad);
          _velocityTracker?.addPosition(event.timeStamp, Offset.zero);
        },
        onPointerPanZoomUpdate: (event) {
          // If scale is actively changing (pinch-to-zoom), do NOT scroll
          if ((event.scale - 1.0).abs() > 0.05) {
            _isPinching = true;
            _momentumTicker?.stop();
          }
          if (_isPinching) return;

          _velocityTracker?.addPosition(event.timeStamp, event.pan);
          _scrollBy(-event.panDelta.dy, -event.panDelta.dx);
        },
        onPointerPanZoomEnd: (event) {
          if (_isPinching) {
            _isPinching = false;
            return;
          }
          final estimate = _velocityTracker?.getVelocityEstimate();
          if (estimate != null &&
              (estimate.pixelsPerSecond.dy.abs() > 50 ||
                  estimate.pixelsPerSecond.dx.abs() > 50)) {
            _momentumVelocityY = estimate.pixelsPerSecond.dy;
            _momentumVelocityX = estimate.pixelsPerSecond.dx;
            _startMomentumGlide();
          }
        },
        child: win.Webview(
          _winController!,
          permissionRequested: (url, kind, isUserInitiated) =>
              Future.value(win.WebviewPermissionDecision.allow),
        ),
      );
    } else if (_mobileController != null) {
      return mobile.WebViewWidget(controller: _mobileController!);
    }

    return const SizedBox.shrink();
  }
}
