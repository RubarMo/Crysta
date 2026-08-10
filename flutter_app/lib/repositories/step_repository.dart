import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../db_service.dart';
import '../models.dart';

class StepRepository {
  final Database Function() _getDb;

  StepRepository({Database Function()? getDb})
      : _getDb = getDb ?? (() => DatabaseService.database);

  Database get _db => _getDb();

  Future<List<StepProgress>> getStepsProgress({required int novelId}) async {
    final maps = await _db.query(
      'steps_progress',
      where: 'novel_id = ?',
      whereArgs: [novelId],
      orderBy: 'step_number ASC',
    );
    return maps.map((m) => StepProgress.fromMap(m)).toList();
  }

  Future<void> saveStepProgress({required StepProgress progress}) async {
    final existing = await _db.query(
      'steps_progress',
      where: 'novel_id = ? AND step_number = ?',
      whereArgs: [progress.novelId, progress.stepNumber],
    );

    if (existing.isNotEmpty) {
      await _db.update(
        'steps_progress',
        {
          'content_text': progress.contentText,
          'is_completed': progress.isCompleted ? 1 : 0,
        },
        where: 'novel_id = ? AND step_number = ?',
        whereArgs: [progress.novelId, progress.stepNumber],
      );
    } else {
      await _db.insert('steps_progress', progress.toMap());
    }
  }

  Future<void> toggleStepCompletion({
    required int novelId,
    required int stepNumber,
    required bool isCompleted,
  }) async {
    await _db.update(
      'steps_progress',
      {'is_completed': isCompleted ? 1 : 0},
      where: 'novel_id = ? AND step_number = ?',
      whereArgs: [novelId, stepNumber],
    );
  }
}
