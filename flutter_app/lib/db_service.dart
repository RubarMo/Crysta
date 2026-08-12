import 'dart:io';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'models.dart';
import 'repositories/novel_repository.dart';
import 'repositories/step_repository.dart';
import 'repositories/character_repository.dart';
import 'repositories/scene_repository.dart';
import 'repositories/chapter_repository.dart';
import 'repositories/book_format_repository.dart';

class DatabaseService {
  static Database? _db;

  static Database get database {
    if (_db == null) {
      throw StateError('Database is not initialized. Call DatabaseService.openProject() first.');
    }
    return _db!;
  }

  static Database? get db => _db;

  // Domain Repositories
  static final NovelRepository novelRepository = NovelRepository();
  static final StepRepository stepRepository = StepRepository();
  static final CharacterRepository characterRepository = CharacterRepository();
  static final SceneRepository sceneRepository = SceneRepository();
  static final ChapterRepository chapterRepository = ChapterRepository();
  static final BookFormatRepository bookFormatRepository = BookFormatRepository();

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
            sort_order INTEGER NOT NULL DEFAULT 0,
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

        await db.execute('''
          CREATE TABLE IF NOT EXISTS book_formatting (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            has_title_page INTEGER NOT NULL DEFAULT 1,
            subtitle TEXT NOT NULL DEFAULT '',
            author_name TEXT NOT NULL DEFAULT '',
            publisher_name TEXT NOT NULL DEFAULT '',
            has_copyright_page INTEGER NOT NULL DEFAULT 1,
            copyright_year TEXT NOT NULL DEFAULT '',
            isbn TEXT NOT NULL DEFAULT '',
            edition_notice TEXT NOT NULL DEFAULT 'First Edition',
            has_dedication INTEGER NOT NULL DEFAULT 0,
            dedication_text TEXT NOT NULL DEFAULT '',
            has_epigraph INTEGER NOT NULL DEFAULT 0,
            epigraph_quote TEXT NOT NULL DEFAULT '',
            epigraph_author TEXT NOT NULL DEFAULT '',
            has_table_of_contents INTEGER NOT NULL DEFAULT 1,
            has_foreword INTEGER NOT NULL DEFAULT 0,
            foreword_title TEXT NOT NULL DEFAULT 'Foreword',
            foreword_content TEXT NOT NULL DEFAULT '',
            has_epilogue INTEGER NOT NULL DEFAULT 0,
            epilogue_title TEXT NOT NULL DEFAULT 'Epilogue',
            epilogue_content TEXT NOT NULL DEFAULT '',
            has_acknowledgments INTEGER NOT NULL DEFAULT 0,
            acknowledgments_content TEXT NOT NULL DEFAULT '',
            has_about_author INTEGER NOT NULL DEFAULT 0,
            about_author_bio TEXT NOT NULL DEFAULT '',
            preset_theme TEXT NOT NULL DEFAULT 'classic',
            trim_size TEXT NOT NULL DEFAULT 'us_trade_6x9',
            font_family TEXT NOT NULL DEFAULT 'Garamond',
            font_size REAL NOT NULL DEFAULT 11.0,
            line_spacing REAL NOT NULL DEFAULT 1.3,
            first_line_indent INTEGER NOT NULL DEFAULT 1,
            first_paragraph_drop_cap INTEGER NOT NULL DEFAULT 0,
            chapter_numbering_style TEXT NOT NULL DEFAULT 'number_title',
            scene_break_ornament TEXT NOT NULL DEFAULT '* * *',
            header_verso TEXT NOT NULL DEFAULT 'title',
            header_recto TEXT NOT NULL DEFAULT 'chapter',
            include_page_numbers INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
          )
        ''');
      },
    );

    await _db!.execute('PRAGMA foreign_keys = ON;');

    // Non-destructive schema migration for existing project databases
    try {
      await _db!.execute('ALTER TABLE scenes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;');
    } catch (_) {}
    try {
      await _db!.execute('''
        CREATE TABLE IF NOT EXISTS book_formatting (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          novel_id INTEGER NOT NULL,
          has_title_page INTEGER NOT NULL DEFAULT 1,
          subtitle TEXT NOT NULL DEFAULT '',
          author_name TEXT NOT NULL DEFAULT '',
          publisher_name TEXT NOT NULL DEFAULT '',
          has_copyright_page INTEGER NOT NULL DEFAULT 1,
          copyright_year TEXT NOT NULL DEFAULT '',
          isbn TEXT NOT NULL DEFAULT '',
          edition_notice TEXT NOT NULL DEFAULT 'First Edition',
          has_dedication INTEGER NOT NULL DEFAULT 0,
          dedication_text TEXT NOT NULL DEFAULT '',
          has_epigraph INTEGER NOT NULL DEFAULT 0,
          epigraph_quote TEXT NOT NULL DEFAULT '',
          epigraph_author TEXT NOT NULL DEFAULT '',
          has_table_of_contents INTEGER NOT NULL DEFAULT 1,
          has_foreword INTEGER NOT NULL DEFAULT 0,
          foreword_title TEXT NOT NULL DEFAULT 'Foreword',
          foreword_content TEXT NOT NULL DEFAULT '',
          has_epilogue INTEGER NOT NULL DEFAULT 0,
          epilogue_title TEXT NOT NULL DEFAULT 'Epilogue',
          epilogue_content TEXT NOT NULL DEFAULT '',
          has_acknowledgments INTEGER NOT NULL DEFAULT 0,
          acknowledgments_content TEXT NOT NULL DEFAULT '',
          has_about_author INTEGER NOT NULL DEFAULT 0,
          about_author_bio TEXT NOT NULL DEFAULT '',
          preset_theme TEXT NOT NULL DEFAULT 'classic',
          trim_size TEXT NOT NULL DEFAULT 'us_trade_6x9',
          font_family TEXT NOT NULL DEFAULT 'Garamond',
          font_size REAL NOT NULL DEFAULT 11.0,
          line_spacing REAL NOT NULL DEFAULT 1.3,
          first_line_indent INTEGER NOT NULL DEFAULT 1,
          first_paragraph_drop_cap INTEGER NOT NULL DEFAULT 0,
          chapter_numbering_style TEXT NOT NULL DEFAULT 'number_title',
          scene_break_ornament TEXT NOT NULL DEFAULT '* * *',
          header_verso TEXT NOT NULL DEFAULT 'title',
          header_recto TEXT NOT NULL DEFAULT 'chapter',
          include_page_numbers INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
        );
      ''');
    } catch (_) {}

    final novels = await novelRepository.getNovels();
    if (novels.isEmpty) {
      final id = await novelRepository.createNovel(
        title: 'New Novel',
        genre: 'Fiction',
        targetAudience: 'General',
        targetWordCount: 50000,
      );
      final newNovel = await novelRepository.getNovelById(id);
      return newNovel!;
    }

    final novel = novels.first;

    // Recalculate word count from chapters using ChapterRepository
    final totalWords = await chapterRepository.calculateTotalWordCount(novelId: novel.id!);
    await novelRepository.updateWordCount(novel.id!, totalWords);

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

  // Delegated static helpers for seamless backward compatibility
  static Future<List<Novel>> getNovels() => novelRepository.getNovels();
  static Future<int> createNovel({
    required String title,
    required String genre,
    required String targetAudience,
    required int targetWordCount,
  }) => novelRepository.createNovel(
    title: title,
    genre: genre,
    targetAudience: targetAudience,
    targetWordCount: targetWordCount,
  );
  static Future<void> updateNovel({
    required int id,
    required String title,
    required String genre,
    required String targetAudience,
    required int targetWordCount,
  }) => novelRepository.updateNovel(
    id: id,
    title: title,
    genre: genre,
    targetAudience: targetAudience,
    targetWordCount: targetWordCount,
  );
  static Future<void> deleteNovel({required int id}) => novelRepository.deleteNovel(id);

  static Future<List<StepProgress>> getStepsProgress({required int novelId}) =>
      stepRepository.getStepsProgress(novelId: novelId);
  static Future<void> saveStepProgress({required StepProgress progress}) =>
      stepRepository.saveStepProgress(progress: progress);

  static Future<List<Character>> getCharacters({required int novelId}) =>
      characterRepository.getCharacters(novelId: novelId);
  static Future<int> saveCharacter({required Character character}) =>
      characterRepository.saveCharacter(character: character);
  static Future<void> deleteCharacter({required int id}) =>
      characterRepository.deleteCharacter(id: id);

  static Future<List<Scene>> getScenes({required int novelId}) =>
      sceneRepository.getScenes(novelId: novelId);
  static Future<int> saveScene({required Scene scene}) =>
      sceneRepository.saveScene(scene: scene);
  static Future<void> deleteScene({required int id, required int novelId}) =>
      sceneRepository.deleteScene(id: id, novelId: novelId);

  static Future<List<Chapter>> getChapters({required int novelId}) =>
      chapterRepository.getChapters(novelId: novelId);
  static Future<int> saveChapter({required Chapter chapter}) =>
      chapterRepository.saveChapter(chapter: chapter);
  static Future<void> deleteChapter({required int id}) =>
      chapterRepository.deleteChapter(id: id);

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
}
