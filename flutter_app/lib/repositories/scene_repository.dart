import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../db_service.dart';
import '../models.dart';

class SceneRepository {
  final Database Function() _getDb;

  SceneRepository({Database Function()? getDb})
      : _getDb = getDb ?? (() => DatabaseService.database);

  Database get _db => _getDb();

  Future<List<Scene>> getScenes({required int novelId}) async {
    final maps = await _db.query(
      'scenes',
      where: 'novel_id = ?',
      whereArgs: [novelId],
      orderBy: 'id ASC',
    );
    return maps.map((m) => Scene.fromMap(m)).toList();
  }

  Future<int> saveScene({required Scene scene}) async {
    if (scene.id != null) {
      await _db.update(
        'scenes',
        scene.toMap(),
        where: 'id = ?',
        whereArgs: [scene.id],
      );
      return scene.id!;
    } else {
      return await _db.insert('scenes', scene.toMap());
    }
  }

  Future<void> deleteScene({required int id, required int novelId}) async {
    await _db.delete(
      'scenes',
      where: 'id = ? AND novel_id = ?',
      whereArgs: [id, novelId],
    );
  }
}
