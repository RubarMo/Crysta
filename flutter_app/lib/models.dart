class Novel {
  final int? id;
  final String title;
  final String genre;
  final String targetAudience;
  final int targetWordCount;
  final int currentWordCount;
  final String? createdAt;

  const Novel({
    this.id,
    required this.title,
    required this.genre,
    required this.targetAudience,
    required this.targetWordCount,
    required this.currentWordCount,
    this.createdAt,
  });

  factory Novel.fromMap(Map<String, dynamic> map) {
    return Novel(
      id: map['id'] as int?,
      title: map['title'] as String? ?? '',
      genre: map['genre'] as String? ?? '',
      targetAudience: map['target_audience'] as String? ?? '',
      targetWordCount: map['target_word_count'] as int? ?? 0,
      currentWordCount: map['current_word_count'] as int? ?? 0,
      createdAt: map['created_at'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'title': title,
      'genre': genre,
      'target_audience': targetAudience,
      'target_word_count': targetWordCount,
      'current_word_count': currentWordCount,
    };
  }
}

class StepProgress {
  final int? id;
  final int novelId;
  final int stepNumber;
  final String contentText;
  final bool isCompleted;

  const StepProgress({
    this.id,
    required this.novelId,
    required this.stepNumber,
    required this.contentText,
    required this.isCompleted,
  });

  factory StepProgress.fromMap(Map<String, dynamic> map) {
    return StepProgress(
      id: map['id'] as int?,
      novelId: map['novel_id'] as int? ?? 0,
      stepNumber: map['step_number'] as int? ?? 0,
      contentText: map['content_text'] as String? ?? '',
      isCompleted: (map['is_completed'] as int? ?? 0) == 1,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'novel_id': novelId,
      'step_number': stepNumber,
      'content_text': contentText,
      'is_completed': isCompleted ? 1 : 0,
    };
  }
}

class Character {
  final int? id;
  final int novelId;
  final String name;
  final String motivation;
  final String goal;
  final String conflict;
  final String epiphany;
  final String oneParagraphSummary;
  final String fullSynopsis;

  const Character({
    this.id,
    required this.novelId,
    required this.name,
    required this.motivation,
    required this.goal,
    required this.conflict,
    required this.epiphany,
    required this.oneParagraphSummary,
    required this.fullSynopsis,
  });

  factory Character.fromMap(Map<String, dynamic> map) {
    return Character(
      id: map['id'] as int?,
      novelId: map['novel_id'] as int? ?? 0,
      name: map['name'] as String? ?? '',
      motivation: map['motivation'] as String? ?? '',
      goal: map['goal'] as String? ?? '',
      conflict: map['conflict'] as String? ?? '',
      epiphany: map['epiphany'] as String? ?? '',
      oneParagraphSummary: map['one_paragraph_summary'] as String? ?? '',
      fullSynopsis: map['full_synopsis'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'novel_id': novelId,
      'name': name,
      'motivation': motivation,
      'goal': goal,
      'conflict': conflict,
      'epiphany': epiphany,
      'one_paragraph_summary': oneParagraphSummary,
      'full_synopsis': fullSynopsis,
    };
  }
}

class Scene {
  final int? id;
  final int novelId;
  final int? povCharacterId;
  final String setting;
  final String plotThread;
  final String whatHappens;
  final int expectedWordCount;
  final int actualWordCount;

  const Scene({
    this.id,
    required this.novelId,
    this.povCharacterId,
    required this.setting,
    required this.plotThread,
    required this.whatHappens,
    required this.expectedWordCount,
    required this.actualWordCount,
  });

  factory Scene.fromMap(Map<String, dynamic> map) {
    return Scene(
      id: map['id'] as int?,
      novelId: map['novel_id'] as int? ?? 0,
      povCharacterId: map['pov_character_id'] as int?,
      setting: map['setting'] as String? ?? '',
      plotThread: map['plot_thread'] as String? ?? '',
      whatHappens: map['what_happens'] as String? ?? '',
      expectedWordCount: map['expected_word_count'] as int? ?? 0,
      actualWordCount: map['actual_word_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'novel_id': novelId,
      'pov_character_id': povCharacterId,
      'setting': setting,
      'plot_thread': plotThread,
      'what_happens': whatHappens,
      'expected_word_count': expectedWordCount,
      'actual_word_count': actualWordCount,
    };
  }
}

class Chapter {
  final int? id;
  final int novelId;
  final String title;
  final String content;
  final int sortOrder;

  const Chapter({
    this.id,
    required this.novelId,
    required this.title,
    required this.content,
    required this.sortOrder,
  });

  factory Chapter.fromMap(Map<String, dynamic> map) {
    return Chapter(
      id: map['id'] as int?,
      novelId: map['novel_id'] as int? ?? 0,
      title: map['title'] as String? ?? '',
      content: map['content'] as String? ?? '',
      sortOrder: map['sort_order'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'novel_id': novelId,
      'title': title,
      'content': content,
      'sort_order': sortOrder,
    };
  }
}
