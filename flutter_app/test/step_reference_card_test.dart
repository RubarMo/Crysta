import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:crysta/locales.dart';
import 'package:crysta/widgets/step_reference_card.dart';

void main() {
  testWidgets('StepReferenceCard expands, displays text, copies, and collapses on tap', (WidgetTester tester) async {
    const sampleText = 'A young archaeologist finds an ancient astrolabe buried deep under Cairo.';

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: StepReferenceCard(
              title: 'Reference to Step 1: One-Sentence Hook',
              referenceText: sampleText,
              language: 'en',
              t: (k) => Locales.t(k, 'en'),
            ),
          ),
        ),
      ),
    );

    // Initial state: Header visible, "Click to view reference" pill visible, copy button hidden
    expect(find.text('Reference to Step 1: One-Sentence Hook'), findsOneWidget);
    expect(find.text('Click to view reference'), findsOneWidget);
    expect(find.byIcon(Icons.copy_rounded), findsNothing);

    // Tap to expand
    await tester.tap(find.text('Reference to Step 1: One-Sentence Hook'));
    await tester.pumpAndSettle();

    // Expanded state: "Click to hide reference" pill visible, copy button visible and content rendered
    expect(find.text('Click to hide reference'), findsOneWidget);
    expect(find.byIcon(Icons.copy_rounded), findsOneWidget);
    expect(find.text(sampleText), findsOneWidget);

    // Tap copy button
    await tester.tap(find.byIcon(Icons.copy_rounded));
    await tester.pumpAndSettle();

    expect(find.text('Reference copied to clipboard!'), findsOneWidget);

    // Tap again to collapse
    await tester.tap(find.text('Reference to Step 1: One-Sentence Hook'));
    await tester.pumpAndSettle();

    expect(find.text('Click to view reference'), findsOneWidget);
    expect(find.byIcon(Icons.copy_rounded), findsNothing);
  });

  testWidgets('StepReferenceCard displays fallback when content is empty', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: StepReferenceCard(
              title: 'Reference to Step 1',
              referenceText: '',
              isInitiallyExpanded: true,
              language: 'en',
              t: (k) => Locales.t(k, 'en'),
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('No content written in this step yet.'), findsOneWidget);
    expect(find.byIcon(Icons.copy_rounded), findsNothing);
  });

  testWidgets('StepReferenceCard renders custom child widget correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: StepReferenceCard(
              title: 'Character Reference',
              isInitiallyExpanded: true,
              language: 'en',
              t: (k) => Locales.t(k, 'en'),
              child: const Text('Custom Character Details Widget'),
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Character Reference'), findsOneWidget);
    expect(find.text('Custom Character Details Widget'), findsOneWidget);
  });
}
