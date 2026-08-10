import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../db_service.dart';
import '../models.dart';

class CharacterRepository {
  final Database Function() _getDb;

  CharacterRepository({Database Function()? getDb})
      : _getDb = getDb ?? (() => DatabaseService.database);

  Database get _db => _getDb();

  Future<List<Character>> getCharacters({required int novelId}) async {
    final maps = await _db.query(
      'characters',
      where: 'novel_id = ?',
      whereArgs: [novelId],
      orderBy: 'id ASC',
    );
    return maps.map((m) => Character.fromMap(m)).toList();
  }

  Future<int> saveCharacter({required Character character}) async {
    if (character.id != null) {
      await _db.update(
        'characters',
        character.toMap(),
        where: 'id = ?',
        whereArgs: [character.id],
      );
      return character.id!;
    } else {
      return await _db.insert('characters', character.toMap());
    }
  }

  Future<void> deleteCharacter({required int id}) async {
    await _db.delete('characters', where: 'id = ?', whereArgs: [id]);
  }
}
