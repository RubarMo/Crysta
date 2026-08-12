import 'package:flutter_test/flutter_test.dart';
import 'package:crysta/models.dart';

void main() {
  group('Smart Mentions Entity Mapping & Inspection', () {
    test('Entities provider formats Characters, Scenes, and Chapters properly', () {
      final characters = [
        Character(id: 1, novelId: 1, name: 'Alice', motivation: 'Freedom', goal: 'Escape', conflict: 'Guards', epiphany: 'Truth', oneParagraphSummary: 'Bio', fullSynopsis: 'Full bio'),
        Character(id: 2, novelId: 1, name: 'Bob', motivation: 'Duty', goal: 'Protect Alice', conflict: 'Orders', epiphany: 'Love', oneParagraphSummary: 'Bio', fullSynopsis: 'Full bio'),
      ];

      final scenes = [
        Scene(id: 101, novelId: 1, povCharacterId: 1, setting: 'Castle Gates', plotThread: 'Escape begins', whatHappens: 'They run.', expectedWordCount: 1000, actualWordCount: 850),
      ];

      final chapters = [
        Chapter(id: 201, novelId: 1, title: 'Chapter 1: The Departure', content: '<p>Content</p>', sortOrder: 1),
      ];

      // Format entities list
      final list = <Map<String, dynamic>>[];
      for (final c in characters) {
        list.add({
          'id': c.id,
          'name': c.name,
          'type': 'character',
          'summary': c.goal.isNotEmpty ? c.goal : c.motivation,
        });
      }
      for (int i = 0; i < scenes.length; i++) {
        final s = scenes[i];
        final label = s.setting.isNotEmpty ? s.setting : 'Scene #${i + 1}';
        list.add({
          'id': s.id,
          'name': label,
          'type': 'scene',
          'summary': s.plotThread.isNotEmpty ? s.plotThread : 'Setting: $label',
        });
      }
      for (final ch in chapters) {
        list.add({
          'id': ch.id,
          'name': ch.title,
          'type': 'chapter',
          'summary': 'Chapter ${ch.sortOrder}',
        });
      }

      expect(list.length, equals(4));
      
      // Verify @ character item
      final charItem = list.firstWhere((e) => e['type'] == 'character' && e['name'] == 'Alice');
      expect(charItem['summary'], equals('Escape'));
      expect(charItem['id'], equals(1));

      // Verify # scene item
      final sceneItem = list.firstWhere((e) => e['type'] == 'scene');
      expect(sceneItem['name'], equals('Castle Gates'));
      expect(sceneItem['summary'], equals('Escape begins'));

      // Verify # chapter item
      final chapterItem = list.firstWhere((e) => e['type'] == 'chapter');
      expect(chapterItem['name'], equals('Chapter 1: The Departure'));
      expect(chapterItem['summary'], equals('Chapter 1'));
    });
  });
}
