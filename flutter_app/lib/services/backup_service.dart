import 'dart:io';

class SnapshotInfo {
  final String filePath;
  final String fileName;
  final DateTime timestamp;
  final int fileSizeBytes;
  final String? customLabel;
  final bool isManual;

  SnapshotInfo({
    required this.filePath,
    required this.fileName,
    required this.timestamp,
    required this.fileSizeBytes,
    this.customLabel,
    required this.isManual,
  });

  String get formattedSize {
    if (fileSizeBytes < 1024) return '$fileSizeBytes B';
    if (fileSizeBytes < 1024 * 1024) {
      return '${(fileSizeBytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(fileSizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class BackupService {
  static const int maxAutoSnapshots = 50;
  static const Duration throttleWindow = Duration(minutes: 30);

  /// Resolves the dedicated backup directory: `<project_dir>/<filename_without_ext>_backups/`
  static Directory getBackupDirectory(String projectPath) {
    final projectFile = File(projectPath);
    final parentDir = projectFile.parent.path;
    final baseName = projectFile.uri.pathSegments.last.replaceAll('.crysta', '');
    return Directory('$parentDir/${baseName}_backups');
  }

  /// Creates a timestamped snapshot of the current .crysta project file.
  static Future<SnapshotInfo?> createSnapshot({
    required String projectPath,
    required String novelTitle,
    String? customLabel,
    bool isManual = false,
    bool throttle = false,
  }) async {
    final sourceFile = File(projectPath);
    if (!await sourceFile.exists()) return null;

    final backupDir = getBackupDirectory(projectPath);
    if (!await backupDir.exists()) {
      await backupDir.create(recursive: true);
    }

    final now = DateTime.now();

    if (throttle && !isManual) {
      final existing = await listSnapshots(projectPath);
      if (existing.isNotEmpty) {
        final lastSnapshot = existing.first;
        if (now.difference(lastSnapshot.timestamp) < throttleWindow) {
          return null; // Throttled: recently backed up
        }
      }
    }

    // Format: YYYY-MM-DD_HH-mm-ss
    final dateStr = '${now.year.toString().padLeft(4, '0')}-'
        '${now.month.toString().padLeft(2, '0')}-'
        '${now.day.toString().padLeft(2, '0')}_'
        '${now.hour.toString().padLeft(2, '0')}-'
        '${now.minute.toString().padLeft(2, '0')}-'
        '${now.second.toString().padLeft(2, '0')}';

    final tag = isManual ? 'manual' : 'auto';
    final safeLabel = customLabel != null && customLabel.trim().isNotEmpty
        ? '_${customLabel.trim().replaceAll(RegExp(r'[^\w\u0600-\u06FF\-]'), '_')}'
        : '';

    // Start with LTR prefix 'snapshot_' to ensure chronological sorting and prevent Windows Explorer BiDi scrambling with RTL text
    final backupFileName = 'snapshot_${dateStr}_$tag$safeLabel.crysta.bak';
    final targetBackupPath = '${backupDir.path}/$backupFileName';

    final backupFile = await sourceFile.copy(targetBackupPath);
    final stat = await backupFile.stat();

    // Auto-prune older automatic snapshots beyond the 50 limit
    if (!isManual) {
      await _pruneAutoSnapshots(backupDir);
    }

    return SnapshotInfo(
      filePath: targetBackupPath,
      fileName: backupFileName,
      timestamp: now,
      fileSizeBytes: stat.size,
      customLabel: customLabel,
      isManual: isManual,
    );
  }

  /// Lists all snapshots in the project's backup folder, sorted newest to oldest.
  static Future<List<SnapshotInfo>> listSnapshots(String projectPath) async {
    final backupDir = getBackupDirectory(projectPath);
    if (!await backupDir.exists()) return [];

    final list = <SnapshotInfo>[];
    final files = backupDir.listSync();

    for (final entity in files) {
      if (entity is File && entity.path.endsWith('.crysta.bak')) {
        final stat = entity.statSync();
        final name = entity.uri.pathSegments.last;
        final isManual = name.contains('_manual');

        // Extract custom label if present
        String? label;
        final manualMatch = RegExp(r'_manual_(.+)\.crysta\.bak$').firstMatch(name);
        if (manualMatch != null) {
          label = manualMatch.group(1)?.replaceAll('_', ' ');
        }

        list.add(SnapshotInfo(
          filePath: entity.path,
          fileName: name,
          timestamp: stat.modified,
          fileSizeBytes: stat.size,
          customLabel: label,
          isManual: isManual,
        ));
      }
    }

    list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return list;
  }

  /// Overwrites the target .crysta project file with the selected backup.
  static Future<bool> restoreSnapshot({
    required String backupPath,
    required String targetProjectPath,
  }) async {
    final backupFile = File(backupPath);
    if (!await backupFile.exists()) return false;

    // Create a safety copy of current target before overwriting
    final targetFile = File(targetProjectPath);
    if (await targetFile.exists()) {
      try {
        await targetFile.copy('$targetProjectPath.pre_restore_bak');
      } catch (_) {}
    }

    await backupFile.copy(targetProjectPath);
    return true;
  }

  /// Deletes a specific snapshot file.
  static Future<void> deleteSnapshot(String backupPath) async {
    final file = File(backupPath);
    if (await file.exists()) {
      await file.delete();
    }
  }

  /// Opens the backup directory in the OS File Explorer.
  static Future<void> openBackupsFolder(String projectPath) async {
    final backupDir = getBackupDirectory(projectPath);
    if (!await backupDir.exists()) {
      await backupDir.create(recursive: true);
    }

    if (Platform.isWindows) {
      await Process.run('explorer.exe', [backupDir.path.replaceAll('/', '\\')]);
    } else if (Platform.isMacOS) {
      await Process.run('open', [backupDir.path]);
    } else if (Platform.isLinux) {
      await Process.run('xdg-open', [backupDir.path]);
    }
  }

  static Future<void> _pruneAutoSnapshots(Directory backupDir) async {
    try {
      final autoSnapshots = <File>[];
      for (final entity in backupDir.listSync()) {
        if (entity is File && entity.path.endsWith('.crysta.bak') && !entity.path.contains('_manual')) {
          autoSnapshots.add(entity);
        }
      }

      if (autoSnapshots.length > maxAutoSnapshots) {
        autoSnapshots.sort((a, b) => a.statSync().modified.compareTo(b.statSync().modified));
        final toDeleteCount = autoSnapshots.length - maxAutoSnapshots;
        for (int i = 0; i < toDeleteCount; i++) {
          try {
            await autoSnapshots[i].delete();
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
}
