import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:crysta/views/workspace/zen_mode_view.dart';
import 'package:crysta/locales.dart';

void main() {
  testWidgets('ZenModeView opens, shows title and controller text, and exits on button click', (WidgetTester tester) async {
    final controller = TextEditingController(text: 'Chapter 1 deep draft content');
    String t(String key) => Locales.t(key, 'en');

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => ElevatedButton(
            onPressed: () => ZenModeView.show(
              context,
              title: 'Chapter 1: The Beginning',
              controller: controller,
              t: t,
              language: 'en',
            ),
            child: const Text('Launch Zen'),
          ),
        ),
      ),
    );

    // Tap button to launch Zen Mode
    await tester.tap(find.text('Launch Zen'));
    await tester.pumpAndSettle();

    // Verify Zen Mode content is visible
    expect(find.text('Chapter 1: The Beginning'), findsOneWidget);
    expect(find.text('Chapter 1 deep draft content'), findsOneWidget);
    expect(find.text('5 words'), findsOneWidget);

    // Tap Exit button
    await tester.tap(find.text('Exit Zen Mode (Esc)'));
    await tester.pumpAndSettle();

    // Verify Zen Mode dismissed
    expect(find.text('Launch Zen'), findsOneWidget);
    expect(find.text('Chapter 1: The Beginning'), findsNothing);
  });
}
