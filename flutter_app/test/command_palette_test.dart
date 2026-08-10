import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:crysta/locales.dart';
import 'package:crysta/models.dart';
import 'package:crysta/widgets/command_palette_dialog.dart';

void main() {
  testWidgets('CommandPaletteDialog shows items, filters by query, and executes on tap', (WidgetTester tester) async {
    final characters = [
      Character(
        id: 1,
        novelId: 1,
        name: 'Sherlock Holmes',
        motivation: 'Solve impossible puzzles',
        goal: 'Catch Moriarty',
        conflict: 'Boredom and dangerous enemies',
        epiphany: 'Needs companions',
        oneParagraphSummary: 'A brilliant detective...',
        fullSynopsis: 'Full story of Sherlock...',
      ),
    ];

    final scenes = [
      Scene(
        id: 1,
        novelId: 1,
        povCharacterId: 1,
        setting: 'Baker Street Flat',
        plotThread: 'Main Mystery',
        whatHappens: 'A letter arrives with a mysterious stamp.',
        expectedWordCount: 1500,
        actualWordCount: 850,
      ),
    ];

    final chapters = [
      Chapter(
        id: 1,
        novelId: 1,
        title: 'The Enigmatic Letter',
        content: 'It was a cold morning in London...',
        sortOrder: 1,
      ),
    ];

    int? navigatedTab;
    Character? navigatedChar;
    Scene? navigatedScene;
    String? triggeredAction;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                CommandPaletteDialog.show(
                  context: context,
                  language: 'en',
                  t: (k) => Locales.t(k, 'en'),
                  characters: characters,
                  scenes: scenes,
                  chapters: chapters,
                  onNavigate: (tabIndex, {character, scene, chapter}) {
                    navigatedTab = tabIndex;
                    navigatedChar = character;
                    navigatedScene = scene;
                  },
                  onTriggerAction: (actionId) {
                    triggeredAction = actionId;
                  },
                );
              },
              child: const Text('Open Palette'),
            ),
          ),
        ),
      ),
    );

    // Open the palette
    await tester.tap(find.text('Open Palette'));
    await tester.pumpAndSettle();

    // Verify search field and default items appear
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Dashboard'), findsWidgets);

    // Filter by character name
    await tester.enterText(find.byType(TextField), 'Sherlock');
    await tester.pumpAndSettle();

    expect(find.text('Sherlock Holmes'), findsOneWidget);

    // Tap on Sherlock Holmes
    await tester.tap(find.text('Sherlock Holmes'));
    await tester.pumpAndSettle();

    // Verify navigation was triggered
    expect(navigatedTab, equals(3));
    expect(navigatedChar?.name, equals('Sherlock Holmes'));

    // Reopen palette and test action trigger
    await tester.tap(find.text('Open Palette'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Force Save');
    await tester.pumpAndSettle();

    final saveItem = find.text('Force Save Project & Flush Debouncer');
    expect(saveItem, findsOneWidget);

    await tester.tap(saveItem);
    await tester.pumpAndSettle();

    expect(triggeredAction, equals('save'));

    // Reopen palette and test scene navigation
    await tester.tap(find.text('Open Palette'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Baker Street');
    await tester.pumpAndSettle();

    final sceneItem = find.text('Baker Street Flat');
    expect(sceneItem, findsOneWidget);

    await tester.tap(sceneItem);
    await tester.pumpAndSettle();

    expect(navigatedTab, equals(8));
    expect(navigatedScene?.setting, equals('Baker Street Flat'));
  });

  testWidgets('KeyboardShortcutsHelpDialog renders shortcut cheat sheet', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                KeyboardShortcutsHelpDialog.show(
                  context,
                  'en',
                  (k) => Locales.t(k, 'en'),
                );
              },
              child: const Text('Open Shortcuts'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Shortcuts'));
    await tester.pumpAndSettle();

    expect(find.text('Keyboard Shortcuts'), findsWidgets);
    expect(find.text('Ctrl'), findsWidgets);
    expect(find.text('K'), findsWidgets);
  });
}
