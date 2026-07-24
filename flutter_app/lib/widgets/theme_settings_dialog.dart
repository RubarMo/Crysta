import 'package:flutter/material.dart';

void showThemeSettingsDialog(
  BuildContext context,
  ThemeMode currentMode,
  Color currentColor,
  bool useDynamicColor,
  Function(ThemeMode, Color, bool) onChanged,
  String Function(String) t,
) {
  showDialog(
    context: context,
    builder: (context) {
      return ThemeSettingsDialog(
        initialMode: currentMode,
        initialColor: currentColor,
        initialDynamicColor: useDynamicColor,
        onChanged: onChanged,
        t: t,
      );
    },
  );
}

class ThemeSettingsDialog extends StatefulWidget {
  final ThemeMode initialMode;
  final Color initialColor;
  final bool initialDynamicColor;
  final Function(ThemeMode, Color, bool) onChanged;
  final String Function(String) t;

  const ThemeSettingsDialog({
    super.key,
    required this.initialMode,
    required this.initialColor,
    required this.initialDynamicColor,
    required this.onChanged,
    required this.t,
  });

  @override
  State<ThemeSettingsDialog> createState() => _ThemeSettingsDialogState();
}

class _ThemeSettingsDialogState extends State<ThemeSettingsDialog> {
  late ThemeMode _mode;
  late Color _color;
  late bool _useDynamic;

  final List<Color> _seedColors = [
    Colors.teal,
    Colors.blue,
    Colors.indigo,
    Colors.deepPurple,
    Colors.pink,
    Colors.red,
    Colors.orange,
    Colors.green,
    Colors.blueGrey,
  ];

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
    _color = widget.initialColor;
    _useDynamic = widget.initialDynamicColor;
  }

  void _apply() {
    widget.onChanged(_mode, _color, _useDynamic);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.t('themeSettings') == 'themeSettings' ? 'Theme Settings' : widget.t('themeSettings')),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.t('appearance') == 'appearance' ? 'Appearance' : widget.t('appearance'), style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode), label: Text('Light')),
                ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode), label: Text('Dark')),
                ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto), label: Text('System')),
              ],
              selected: {_mode},
              onSelectionChanged: (set) {
                setState(() => _mode = set.first);
                _apply();
              },
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(widget.t('useSystemTheme') == 'useSystemTheme' ? 'Use System Theme Color' : widget.t('useSystemTheme'), style: const TextStyle(fontWeight: FontWeight.bold)),
                Switch(
                  value: _useDynamic,
                  onChanged: (val) {
                    setState(() => _useDynamic = val);
                    _apply();
                  },
                ),
              ],
            ),
            if (!_useDynamic) ...[
              const SizedBox(height: 16),
              Text(widget.t('seedColor') == 'seedColor' ? 'Seed Color' : widget.t('seedColor'), style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _seedColors.map((c) {
                  final isSelected = c == _color;
                  return GestureDetector(
                    onTap: () {
                      setState(() => _color = c);
                      _apply();
                    },
                    child: CircleAvatar(
                      backgroundColor: c,
                      radius: 20,
                      child: isSelected ? const Icon(Icons.check, color: Colors.white) : null,
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(widget.t('close'))),
      ],
    );
  }
}
