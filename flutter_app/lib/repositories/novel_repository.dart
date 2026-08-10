import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../db_service.dart';
import '../models.dart';

class NovelRepository {
  final Database Function() _getDb;

  NovelRepository({Database Function()? getDb})
      : _getDb = getDb ?? (() => DatabaseService.database);

  Database get _db => _getDb();

  Future<List<Novel>> getNovels() async {
    final maps = await _db.query('novels', orderBy: 'id ASC');
    return maps.map((m) => Novel.fromMap(m)).toList();
  }

  Future<Novel?> getNovelById(int id) async {
    final maps = await _db.query('novels', where: 'id = ?', whereArgs: [id]);
    if (maps.isEmpty) return null;
    return Novel.fromMap(maps.first);
  }

  Future<int> createNovel({
    required String title,
    required String genre,
    required String targetAudience,
    required int targetWordCount,
  }) async {
    return await _db.insert('novels', {
      'title': title,
      'genre': genre,
      'target_audience': targetAudience,
      'target_word_count': targetWordCount,
      'current_word_count': 0,
    });
  }

  Future<void> updateNovel({
    required int id,
    required String title,
    required String genre,
    required String targetAudience,
    required int targetWordCount,
  }) async {
    await _db.update(
      'novels',
      {
        'title': title,
        'genre': genre,
        'target_audience': targetAudience,
        'target_word_count': targetWordCount,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> updateWordCount(int id, int totalWords) async {
    await _db.update(
      'novels',
      {'current_word_count': totalWords},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> deleteNovel(int id) async {
    await _db.delete('novels', where: 'id = ?', whereArgs: [id]);
  }
}
