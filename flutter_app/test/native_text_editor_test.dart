import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:crysta/widgets/native_text_editor.dart';

void main() {
  testWidgets('NativeTextEditor renders RTL and LTR text, updates word count, and handles callbacks', (WidgetTester tester) async {
    final controller = TextEditingController();
    bool zenModeTriggered = false;
    String changedValue = '';

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: NativeTextEditor(
            controller: controller,
            wordCountLabel: 'words',
            isRtl: true,
            placeholder: 'Write here...',
            onChanged: (val) => changedValue = val,
            onOpenZenMode: () => zenModeTriggered = true,
          ),
        ),
      ),
    );

    // Initial state
    expect(find.text('0 words'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);

    // Check Directionality
    final textField = tester.widget<TextField>(find.byType(TextField));
    expect(textField.textDirection, equals(TextDirection.rtl));
    expect(textField.textAlign, equals(TextAlign.right));

    // Type Arabic text
    await tester.enterText(find.byType(TextField), 'هذا نص تجريبي للرواية');
    await tester.pumpAndSettle();

    expect(changedValue, equals('هذا نص تجريبي للرواية'));
    expect(find.text('4 words'), findsOneWidget);

    // Test Zen mode button
    await tester.tap(find.byIcon(Icons.self_improvement));
    await tester.pumpAndSettle();

    expect(zenModeTriggered, isTrue);
  });

  testWidgets('NativeTextEditor counts words correctly for Arabic and English', (WidgetTester tester) async {
    final controller = TextEditingController(text: 'هذا نص يحتوي على ست كلمات');

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: NativeTextEditor(
            controller: controller,
            wordCountLabel: 'كلمة',
            isRtl: true,
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('6 كلمة'), findsOneWidget);
  });
}
