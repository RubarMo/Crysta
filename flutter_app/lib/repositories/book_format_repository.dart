import '../db_service.dart';
import '../models.dart';

class BookFormatRepository {
  Future<BookFormatConfig> getFormatConfig({required int novelId, required Novel novel}) async {
    final db = DatabaseService.database;
    final List<Map<String, dynamic>> maps = await db.query(
      'book_formatting',
      where: 'novel_id = ?',
      whereArgs: [novelId],
      limit: 1,
    );

    if (maps.isNotEmpty) {
      return BookFormatConfig.fromMap(maps.first);
    }

    final defaultConfig = BookFormatConfig.defaultForNovel(novel);
    final id = await db.insert('book_formatting', defaultConfig.toMap());
    return defaultConfig.copyWith(id: id);
  }

  Future<BookFormatConfig> saveFormatConfig({required BookFormatConfig config}) async {
    final db = DatabaseService.database;
    if (config.id != null) {
      await db.update(
        'book_formatting',
        config.toMap(),
        where: 'id = ?',
        whereArgs: [config.id],
      );
      return config;
    } else {
      final id = await db.insert('book_formatting', config.toMap());
      return config.copyWith(id: id);
    }
  }
}
