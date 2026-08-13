import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:crysta/models.dart';
import 'package:crysta/locales.dart';
import 'package:crysta/widgets/reference_drawer_panel.dart';
import 'package:crysta/views/workspace/tabs/write_novel_tab.dart';

void main() {
  final testNovel = const Novel(
    id: 1,
    title: 'Test Novel',
    genre: 'Fantasy',
    targetAudience: 'General',
    targetWordCount: 50000,
    currentWordCount: 1200,
  );

  final testCharacters = [
    const Character(
      id: 1,
      novelId: 1,
      name: 'Sarah the Archer',
      motivation: 'Protect her village',
      goal: 'Find the crystal',
      conflict: 'Guards are hunting her',
      epiphany: 'She cannot do it alone',
      oneParagraphSummary: 'A skilled archer who must face her past.',
      fullSynopsis: 'Sarah grows from a loner to a true leader.',
    ),
    const Character(
      id: 2,
      novelId: 1,
      name: 'Lord Vane',
      motivation: 'Power and control',
      goal: 'Rule the valley',
      conflict: 'The rebellion',
      epiphany: 'Power is lonely',
      oneParagraphSummary: 'The ambitious ruler of the valley.',
      fullSynopsis: 'Lord Vane plots his ascension.',
    ),
  ];

  final testScenes = [
    const Scene(
      id: 101,
      novelId: 1,
      povCharacterId: 1,
      setting: 'North Watchtower',
      plotThread: 'Main Quest',
      whatHappens: 'Sarah sneaks into the tower and steals the key.',
      expectedWordCount: 1500,
      actualWordCount: 1200,
      sortOrder: 0,
    ),
    const Scene(
      id: 102,
      novelId: 1,
      povCharacterId: 2,
      setting: 'Castle Dungeon',
      plotThread: 'Vane Subplot',
      whatHappens: 'Lord Vane interrogates the captive rebel.',
      expectedWordCount: 2000,
      actualWordCount: 800,
      sortOrder: 1,
    ),
  ];

  final testStepsProgress = [
    const StepProgress(novelId: 1, stepNumber: 1, contentText: 'A rogue archer must steal a sacred relic to save her village.', isCompleted: true),
    const StepProgress(novelId: 1, stepNumber: 2, contentText: 'Setup: Sarah lives in peace. Disaster 1: Soldiers arrive. Disaster 2: Relic stolen. Disaster 3: Captured. Resolution: Victorious.', isCompleted: true),
    const StepProgress(novelId: 1, stepNumber: 4, contentText: 'Full one-page synopsis explaining the five stages in depth.', isCompleted: true),
    const StepProgress(novelId: 1, stepNumber: 6, contentText: 'Comprehensive four-page synopsis detailing every major twist.', isCompleted: true),
  ];

  String getStepContent(int step) {
    final match = testStepsProgress.where((s) => s.stepNumber == step);
    return match.isNotEmpty ? match.first.contentText : '';
  }

  String t(String key) => Locales.t(key, 'en');

  testWidgets('ReferenceDrawerPanel renders all 4 tabs and switches between them', (WidgetTester tester) async {
    final scratchpadCtrl = TextEditingController();
    String? insertedText;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ReferenceDrawerPanel(
            scenes: testScenes,
            characters: testCharacters,
            allStepsProgress: testStepsProgress,
            getStepContentText: getStepContent,
            t: t,
            language: 'en',
            onClose: () {},
            onInsertText: (txt) => insertedText = txt,
            scratchpadController: scratchpadCtrl,
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Tab headers
    expect(find.text('Scenes'), findsOneWidget);
    expect(find.text('Characters'), findsOneWidget);
    expect(find.text('Synopses'), findsOneWidget);
    expect(find.text('Scratchpad'), findsOneWidget);

    // Initial Tab: Scenes (finds scene titles & POV)
    expect(find.text('North Watchtower'), findsOneWidget);
    expect(find.text('👤 Sarah the Archer'), findsOneWidget);

    // Test Scene expansion and Insert Into Draft button
    expect(find.text('Insert into Draft'), findsOneWidget);
    await tester.tap(find.text('Insert into Draft').first);
    await tester.pumpAndSettle();

    expect(insertedText, contains('Sarah sneaks into the tower'));

    // Switch to Characters Tab
    await tester.tap(find.text('Characters'));
    await tester.pumpAndSettle();

    expect(find.text('Sarah the Archer'), findsWidgets);
    expect(find.text('🎯 Motivation'), findsOneWidget);
    expect(find.text('Protect her village'), findsOneWidget);

    // Switch to Synopses Tab
    await tester.tap(find.text('Synopses'));
    await tester.pumpAndSettle();

    expect(find.textContaining('A rogue archer must steal'), findsOneWidget);

    // Switch to Scratchpad Tab
    await tester.tap(find.text('Scratchpad'));
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Check armor details');
    await tester.pumpAndSettle();
    expect(scratchpadCtrl.text, equals('Check armor details'));
  });

  testWidgets('WriteNovelTab toggles Reference Drawer via button and inserts text', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final chapterTitleCtrl = TextEditingController(text: 'Chapter 1: Arrival');
    final chapterCtrl = TextEditingController(text: 'Initial draft content.');
    final testChapter = Chapter(
      id: 1,
      novelId: 1,
      title: 'Chapter 1: Arrival',
      content: 'Initial draft content.',
      sortOrder: 0,
    );

    Chapter? savedChapter;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: WriteNovelTab(
            activeNovel: testNovel,
            chapters: [testChapter],
            selectedChapter: testChapter,
            chapterTitleCtrl: chapterTitleCtrl,
            chapterCtrl: chapterCtrl,
            listPaneWidth: 260.0,
            onSaveChapter: (chap) async {
              savedChapter = chap;
            },
            onDeleteChapter: (_) {},
            onSelectChapter: (_) {},
            onListPaneDrag: (_) {},
            onSaveActiveContent: () async {},
            onExportDocument: (_) {},
            t: t,
            language: 'en',
            isMobile: false,
            cleanText: (s) => s,
            characters: testCharacters,
            scenes: testScenes,
            allStepsProgress: testStepsProgress,
            getStepContentText: getStepContent,
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Reference drawer is initially closed
    expect(find.text('Reference Companion'), findsOneWidget); // Toggle button
    expect(find.text('Scenes'), findsNothing); // Drawer tab not visible yet

    // Click Reference Companion button to open drawer
    await tester.tap(find.text('Reference Companion'));
    await tester.pumpAndSettle();

    // Reference drawer is now open
    expect(find.text('Scenes'), findsOneWidget);
    expect(find.text('North Watchtower'), findsOneWidget);

    // Click "Insert into Draft" from scene card
    await tester.tap(find.text('Insert into Draft').first);
    await tester.pumpAndSettle();

    // Verify text was inserted into chapterCtrl and chapter was saved
    expect(chapterCtrl.text, contains('Sarah sneaks into the tower and steals the key.'));
    expect(savedChapter?.content, contains('Sarah sneaks into the tower and steals the key.'));
  });
}
