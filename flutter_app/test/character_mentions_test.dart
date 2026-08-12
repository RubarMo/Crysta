import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:crysta/models.dart';
import 'package:crysta/widgets/entity_inspector_dialog.dart';

void main() {
  testWidgets('EntityInspectorDialog renders character details and handles profile jump', (tester) async {
    const character = Character(
      id: 5,
      novelId: 1,
      name: 'سيف الدين',
      motivation: 'السعي لتحقيق العدالة',
      goal: 'تحرير المدينة من قبضة الطاغية',
      conflict: 'الخوف من فقدان عائلته',
      epiphany: 'القوة الحقيقية تكمن في مساندة الآخرين',
      oneParagraphSummary: 'فارس شجاع يقود المقاومة الشعبية.',
      fullSynopsis: 'يبدأ سيف الدين رحلته بالبحث عن الحلفاء...',
    );

    bool openedBio = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => EntityInspectorDialog(
                    character: character,
                    language: 'ar',
                    onOpenFullProfile: () => openedBio = true,
                  ),
                );
              },
              child: const Text('Inspect Character'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Inspect Character'));
    await tester.pumpAndSettle();

    expect(find.text('سيف الدين'), findsOneWidget);
    expect(find.text('السعي لتحقيق العدالة'), findsOneWidget);
    expect(find.text('تحرير المدينة من قبضة الطاغية'), findsOneWidget);
    expect(find.text('فتح بطاقة الشخصية'), findsOneWidget);

    await tester.tap(find.text('فتح بطاقة الشخصية'));
    await tester.pumpAndSettle();

    expect(openedBio, isTrue);
  });
}
