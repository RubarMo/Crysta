import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../db_service.dart';
import '../models.dart';

class ChapterRepository {
  final Database Function() _getDb;

  ChapterRepository({Database Function()? getDb})
      : _getDb = getDb ?? (() => DatabaseService.database);

  Database get _db => _getDb();

  Future<List<Chapter>> getChapters({required int novelId}) async {
    final maps = await _db.query(
      'chapters',
      where: 'novel_id = ?',
      whereArgs: [novelId],
      orderBy: 'sort_order ASC',
    );
    return maps.map((m) => Chapter.fromMap(m)).toList();
  }

  Future<int> saveChapter({required Chapter chapter}) async {
    if (chapter.id != null) {
      await _db.update(
        'chapters',
        chapter.toMap(),
        where: 'id = ?',
        whereArgs: [chapter.id],
      );
      return chapter.id!;
    } else {
      return await _db.insert('chapters', chapter.toMap());
    }
  }

  Future<void> deleteChapter({required int id}) async {
    await _db.delete('chapters', where: 'id = ?', whereArgs: [id]);
  }

  Future<int> calculateTotalWordCount({required int novelId}) async {
    final chapterMaps = await _db.query(
      'chapters',
      where: 'novel_id = ?',
      whereArgs: [novelId],
    );
    int totalWords = 0;
    for (var c in chapterMaps) {
      final content = c['content'] as String? ?? '';
      totalWords += countWords(content);
    }
    return totalWords;
  }

  static int countWords(String text) {
    final clean = text.trim();
    if (clean.isEmpty) return 0;
    return clean.split(RegExp(r'\s+')).length;
  }
}
