import 'dart:io';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'models.dart';

class DatabaseService {
  static Database? _db;

  static void init() {
    if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }
  }

  static Future<Novel> openProject({required String path}) async {
    init();
    if (_db != null) {
      await _db!.close();
      _db = null;
    }

    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE IF NOT EXISTS novels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            genre TEXT NOT NULL,
            target_audience TEXT NOT NULL,
            target_word_count INTEGER NOT NULL,
            current_word_count INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        ''');

        await db.execute('''
          CREATE TABLE IF NOT EXISTS steps_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            step_number INTEGER NOT NULL,
            content_text TEXT NOT NULL,
            is_completed INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
            UNIQUE(novel_id, step_number)
          )
        ''');

        await db.execute('''
          CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            motivation TEXT NOT NULL,
            goal TEXT NOT NULL,
            conflict TEXT NOT NULL,
            epiphany TEXT NOT NULL,
            one_paragraph_summary TEXT NOT NULL,
            full_synopsis TEXT NOT NULL,
            FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
          )
        ''');

        await db.execute('''
          CREATE TABLE IF NOT EXISTS scenes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            pov_character_id INTEGER,
            setting TEXT NOT NULL,
            plot_thread TEXT NOT NULL,
            what_happens TEXT NOT NULL,
            expected_word_count INTEGER NOT NULL,
            actual_word_count INTEGER NOT NULL,
            FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
          )
        ''');

        await db.execute('''
          CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
          )
        ''');
      },
    );

    await _db!.execute('PRAGMA foreign_keys = ON;');

    final novelsMaps = await _db!.query('novels', orderBy: 'id ASC');
    if (novelsMaps.isEmpty) {
      final id = await _db!.insert('novels', {
        'title': 'New Novel',
        'genre': 'Fiction',
        'target_audience': 'General',
        'target_word_count': 50000,
        'current_word_count': 0,
      });

      final newNovelMap = await _db!.query('novels', where: 'id = ?', whereArgs: [id]);
      return Novel.fromMap(newNovelMap.first);
    }

    final novel = Novel.fromMap(novelsMaps.first);

    // Recalculate word count from chapters
    final chapterMaps = await _db!.query('chapters', where: 'novel_id = ?', whereArgs: [novel.id]);
    int totalWords = 0;
    for (var c in chapterMaps) {
      final content = c['content'] as String? ?? '';
      totalWords += _countWords(content);
    }

    await _db!.update(
      'novels',
      {'current_word_count': totalWords},
      where: 'id = ?',
      whereArgs: [novel.id],
    );

    return Novel(
      id: novel.id,
      title: novel.title,
      genre: novel.genre,
      targetAudience: novel.targetAudience,
      targetWordCount: novel.targetWordCount,
      currentWordCount: totalWords,
      createdAt: novel.createdAt,
    );
  }

  static Future<void> closeProject() async {
    if (_db != null) {
      await _db!.close();
      _db = null;
    }
  }

  static Future<List<Novel>> getNovels() async {
    if (_db == null) return [];
    final maps = await _db!.query('novels', orderBy: 'id ASC');
    return maps.map((m) => Novel.fromMap(m)).toList();
  }

  static Future<int> createNovel({
    required String title,
    required String genre,
    required String targetAudience,
    required int targetWordCount,
  }) async {
    if (_db == null) return 0;
    return await _db!.insert('novels', {
      'title': title,
      'genre': genre,
      'target_audience': targetAudience,
      'target_word_count': targetWordCount,
      'current_word_count': 0,
    });
  }

  static Future<void> updateNovel({
    required int id,
    required String title,
    required String genre,
    required String targetAudience,
    required int targetWordCount,
  }) async {
    if (_db == null) return;
    await _db!.update(
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

  static Future<void> deleteNovel({required int id}) async {
    if (_db == null) return;
    await _db!.delete('novels', where: 'id = ?', whereArgs: [id]);
  }

  static Future<List<StepProgress>> getStepsProgress({required int novelId}) async {
    if (_db == null) return [];
    final maps = await _db!.query('steps_progress', where: 'novel_id = ?', whereArgs: [novelId], orderBy: 'step_number ASC');
    return maps.map((m) => StepProgress.fromMap(m)).toList();
  }

  static Future<void> saveStepProgress({required StepProgress progress}) async {
    if (_db == null) return;
    final existing = await _db!.query(
      'steps_progress',
      where: 'novel_id = ? AND step_number = ?',
      whereArgs: [progress.novelId, progress.stepNumber],
    );

    if (existing.isNotEmpty) {
      await _db!.update(
        'steps_progress',
        {
          'content_text': progress.contentText,
          'is_completed': progress.isCompleted ? 1 : 0,
        },
        where: 'novel_id = ? AND step_number = ?',
        whereArgs: [progress.novelId, progress.stepNumber],
      );
    } else {
      await _db!.insert('steps_progress', progress.toMap());
    }
  }

  static Future<List<Character>> getCharacters({required int novelId}) async {
    if (_db == null) return [];
    final maps = await _db!.query('characters', where: 'novel_id = ?', whereArgs: [novelId], orderBy: 'id ASC');
    return maps.map((m) => Character.fromMap(m)).toList();
  }

  static Future<int> saveCharacter({required Character character}) async {
    if (_db == null) return 0;
    if (character.id != null) {
      await _db!.update(
        'characters',
        character.toMap(),
        where: 'id = ?',
        whereArgs: [character.id],
      );
      return character.id!;
    } else {
      return await _db!.insert('characters', character.toMap());
    }
  }

  static Future<void> deleteCharacter({required int id}) async {
    if (_db == null) return;
    await _db!.delete('characters', where: 'id = ?', whereArgs: [id]);
  }

  static Future<List<Scene>> getScenes({required int novelId}) async {
    if (_db == null) return [];
    final maps = await _db!.query('scenes', where: 'novel_id = ?', whereArgs: [novelId], orderBy: 'id ASC');
    return maps.map((m) => Scene.fromMap(m)).toList();
  }

  static Future<int> saveScene({required Scene scene}) async {
    if (_db == null) return 0;
    if (scene.id != null) {
      await _db!.update(
        'scenes',
        scene.toMap(),
        where: 'id = ?',
        whereArgs: [scene.id],
      );
      return scene.id!;
    } else {
      return await _db!.insert('scenes', scene.toMap());
    }
  }

  static Future<void> deleteScene({required int id, required int novelId}) async {
    if (_db == null) return;
    await _db!.delete('scenes', where: 'id = ? AND novel_id = ?', whereArgs: [id, novelId]);
  }

  static Future<List<Chapter>> getChapters({required int novelId}) async {
    if (_db == null) return [];
    final maps = await _db!.query('chapters', where: 'novel_id = ?', whereArgs: [novelId], orderBy: 'sort_order ASC');
    return maps.map((m) => Chapter.fromMap(m)).toList();
  }

  static Future<int> saveChapter({required Chapter chapter}) async {
    if (_db == null) return 0;
    if (chapter.id != null) {
      await _db!.update(
        'chapters',
        chapter.toMap(),
        where: 'id = ?',
        whereArgs: [chapter.id],
      );
      return chapter.id!;
    } else {
      return await _db!.insert('chapters', chapter.toMap());
    }
  }

  static Future<void> deleteChapter({required int id}) async {
    if (_db == null) return;
    await _db!.delete('chapters', where: 'id = ?', whereArgs: [id]);
  }

  static Future<String> exportToTxt({required List<String> titles, required List<String> contents}) async {
    final StringBuffer sb = StringBuffer();
    for (int i = 0; i < titles.length; i++) {
      sb.writeln('=== ${titles[i]} ===\n');
      sb.writeln('${contents[i]}\n\n');
    }
    return sb.toString();
  }

  static Future<void> exportToDocx({required String path, required List<String> titles, required List<String> contents}) async {
    final txtContent = await exportToTxt(titles: titles, contents: contents);
    final file = File(path);
    await file.writeAsString(txtContent);
  }

  static int _countWords(String text) {
    final clean = text.trim();
    if (clean.isEmpty) return 0;
    return clean.split(RegExp(r'\s+')).length;
  }
}
