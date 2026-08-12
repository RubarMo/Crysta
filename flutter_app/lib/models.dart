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
  final int sortOrder;

  const Scene({
    this.id,
    required this.novelId,
    this.povCharacterId,
    required this.setting,
    required this.plotThread,
    required this.whatHappens,
    required this.expectedWordCount,
    required this.actualWordCount,
    this.sortOrder = 0,
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
      sortOrder: map['sort_order'] as int? ?? 0,
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
      'sort_order': sortOrder,
    };
  }

  Scene copyWith({
    int? id,
    int? novelId,
    int? povCharacterId,
    String? setting,
    String? plotThread,
    String? whatHappens,
    int? expectedWordCount,
    int? actualWordCount,
    int? sortOrder,
  }) {
    return Scene(
      id: id ?? this.id,
      novelId: novelId ?? this.novelId,
      povCharacterId: povCharacterId ?? this.povCharacterId,
      setting: setting ?? this.setting,
      plotThread: plotThread ?? this.plotThread,
      whatHappens: whatHappens ?? this.whatHappens,
      expectedWordCount: expectedWordCount ?? this.expectedWordCount,
      actualWordCount: actualWordCount ?? this.actualWordCount,
      sortOrder: sortOrder ?? this.sortOrder,
    );
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

  Chapter copyWith({
    int? id,
    int? novelId,
    String? title,
    String? content,
    int? sortOrder,
  }) {
    return Chapter(
      id: id ?? this.id,
      novelId: novelId ?? this.novelId,
      title: title ?? this.title,
      content: content ?? this.content,
      sortOrder: sortOrder ?? this.sortOrder,
    );
  }
}

class BookFormatConfig {
  final int? id;
  final int novelId;

  // Front Matter
  final bool hasTitlePage;
  final String subtitle;
  final String authorName;
  final String publisherName;
  final bool hasCopyrightPage;
  final String copyrightYear;
  final String isbn;
  final String editionNotice;
  final bool hasDedication;
  final String dedicationText;
  final bool hasEpigraph;
  final String epigraphQuote;
  final String epigraphAuthor;
  final bool hasTableOfContents;
  final bool hasForeword;
  final String forewordTitle;
  final String forewordContent;

  // Back Matter
  final bool hasEpilogue;
  final String epilogueTitle;
  final String epilogueContent;
  final bool hasAcknowledgments;
  final String acknowledgmentsContent;
  final bool hasAboutAuthor;
  final String aboutAuthorBio;

  // Typography & Layout
  final String presetTheme; // 'classic', 'modern', 'epic', 'romance', 'minimalist'
  final String trimSize; // 'trade_5x8', 'standard_55x85', 'us_trade_6x9', 'mass_market_425x687', 'large_85x11'
  final String fontFamily; // 'Garamond', 'Georgia', 'Amiri', 'Cairo', 'Times New Roman', 'Arial'
  final double fontSize;
  final double lineSpacing;
  final bool firstLineIndent;
  final bool firstParagraphDropCap;
  final String chapterNumberingStyle; // 'number_title', 'chapter_words', 'numbers_only', 'title_only'
  final String sceneBreakOrnament; // '* * *', '♦ ♦ ♦', '✦ ✦ ✦', '❖ ❖ ❖', '— • —', '~ ~ ~'
  final String headerVerso; // 'title', 'author', 'none'
  final String headerRecto; // 'chapter', 'title', 'none'
  final bool includePageNumbers;

  const BookFormatConfig({
    this.id,
    required this.novelId,
    this.hasTitlePage = true,
    this.subtitle = '',
    this.authorName = '',
    this.publisherName = '',
    this.hasCopyrightPage = true,
    this.copyrightYear = '',
    this.isbn = '',
    this.editionNotice = 'First Edition',
    this.hasDedication = false,
    this.dedicationText = '',
    this.hasEpigraph = false,
    this.epigraphQuote = '',
    this.epigraphAuthor = '',
    this.hasTableOfContents = true,
    this.hasForeword = false,
    this.forewordTitle = 'Foreword',
    this.forewordContent = '',
    this.hasEpilogue = false,
    this.epilogueTitle = 'Epilogue',
    this.epilogueContent = '',
    this.hasAcknowledgments = false,
    this.acknowledgmentsContent = '',
    this.hasAboutAuthor = false,
    this.aboutAuthorBio = '',
    this.presetTheme = 'classic',
    this.trimSize = 'us_trade_6x9',
    this.fontFamily = 'Garamond',
    this.fontSize = 11.0,
    this.lineSpacing = 1.3,
    this.firstLineIndent = true,
    this.firstParagraphDropCap = false,
    this.chapterNumberingStyle = 'number_title',
    this.sceneBreakOrnament = '* * *',
    this.headerVerso = 'title',
    this.headerRecto = 'chapter',
    this.includePageNumbers = true,
  });

  factory BookFormatConfig.defaultForNovel(Novel novel) {
    return BookFormatConfig(
      novelId: novel.id ?? 0,
      authorName: '',
      copyrightYear: DateTime.now().year.toString(),
    );
  }

  factory BookFormatConfig.fromMap(Map<String, dynamic> map) {
    return BookFormatConfig(
      id: map['id'] as int?,
      novelId: map['novel_id'] as int? ?? 0,
      hasTitlePage: (map['has_title_page'] as int? ?? 1) == 1,
      subtitle: map['subtitle'] as String? ?? '',
      authorName: map['author_name'] as String? ?? '',
      publisherName: map['publisher_name'] as String? ?? '',
      hasCopyrightPage: (map['has_copyright_page'] as int? ?? 1) == 1,
      copyrightYear: map['copyright_year'] as String? ?? '',
      isbn: map['isbn'] as String? ?? '',
      editionNotice: map['edition_notice'] as String? ?? 'First Edition',
      hasDedication: (map['has_dedication'] as int? ?? 0) == 1,
      dedicationText: map['dedication_text'] as String? ?? '',
      hasEpigraph: (map['has_epigraph'] as int? ?? 0) == 1,
      epigraphQuote: map['epigraph_quote'] as String? ?? '',
      epigraphAuthor: map['epigraph_author'] as String? ?? '',
      hasTableOfContents: (map['has_table_of_contents'] as int? ?? 1) == 1,
      hasForeword: (map['has_foreword'] as int? ?? 0) == 1,
      forewordTitle: map['foreword_title'] as String? ?? 'Foreword',
      forewordContent: map['foreword_content'] as String? ?? '',
      hasEpilogue: (map['has_epilogue'] as int? ?? 0) == 1,
      epilogueTitle: map['epilogue_title'] as String? ?? 'Epilogue',
      epilogueContent: map['epilogue_content'] as String? ?? '',
      hasAcknowledgments: (map['has_acknowledgments'] as int? ?? 0) == 1,
      acknowledgmentsContent: map['acknowledgments_content'] as String? ?? '',
      hasAboutAuthor: (map['has_about_author'] as int? ?? 0) == 1,
      aboutAuthorBio: map['about_author_bio'] as String? ?? '',
      presetTheme: map['preset_theme'] as String? ?? 'classic',
      trimSize: map['trim_size'] as String? ?? 'us_trade_6x9',
      fontFamily: map['font_family'] as String? ?? 'Garamond',
      fontSize: (map['font_size'] as num?)?.toDouble() ?? 11.0,
      lineSpacing: (map['line_spacing'] as num?)?.toDouble() ?? 1.3,
      firstLineIndent: (map['first_line_indent'] as int? ?? 1) == 1,
      firstParagraphDropCap: (map['first_paragraph_drop_cap'] as int? ?? 0) == 1,
      chapterNumberingStyle: map['chapter_numbering_style'] as String? ?? 'number_title',
      sceneBreakOrnament: map['scene_break_ornament'] as String? ?? '* * *',
      headerVerso: map['header_verso'] as String? ?? 'title',
      headerRecto: map['header_recto'] as String? ?? 'chapter',
      includePageNumbers: (map['include_page_numbers'] as int? ?? 1) == 1,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'novel_id': novelId,
      'has_title_page': hasTitlePage ? 1 : 0,
      'subtitle': subtitle,
      'author_name': authorName,
      'publisher_name': publisherName,
      'has_copyright_page': hasCopyrightPage ? 1 : 0,
      'copyright_year': copyrightYear,
      'isbn': isbn,
      'edition_notice': editionNotice,
      'has_dedication': hasDedication ? 1 : 0,
      'dedication_text': dedicationText,
      'has_epigraph': hasEpigraph ? 1 : 0,
      'epigraph_quote': epigraphQuote,
      'epigraph_author': epigraphAuthor,
      'has_table_of_contents': hasTableOfContents ? 1 : 0,
      'has_foreword': hasForeword ? 1 : 0,
      'foreword_title': forewordTitle,
      'foreword_content': forewordContent,
      'has_epilogue': hasEpilogue ? 1 : 0,
      'epilogue_title': epilogueTitle,
      'epilogue_content': epilogueContent,
      'has_acknowledgments': hasAcknowledgments ? 1 : 0,
      'acknowledgments_content': acknowledgmentsContent,
      'has_about_author': hasAboutAuthor ? 1 : 0,
      'about_author_bio': aboutAuthorBio,
      'preset_theme': presetTheme,
      'trim_size': trimSize,
      'font_family': fontFamily,
      'font_size': fontSize,
      'line_spacing': lineSpacing,
      'first_line_indent': firstLineIndent ? 1 : 0,
      'first_paragraph_drop_cap': firstParagraphDropCap ? 1 : 0,
      'chapter_numbering_style': chapterNumberingStyle,
      'scene_break_ornament': sceneBreakOrnament,
      'header_verso': headerVerso,
      'header_recto': headerRecto,
      'include_page_numbers': includePageNumbers ? 1 : 0,
    };
  }

  BookFormatConfig copyWith({
    int? id,
    int? novelId,
    bool? hasTitlePage,
    String? subtitle,
    String? authorName,
    String? publisherName,
    bool? hasCopyrightPage,
    String? copyrightYear,
    String? isbn,
    String? editionNotice,
    bool? hasDedication,
    String? dedicationText,
    bool? hasEpigraph,
    String? epigraphQuote,
    String? epigraphAuthor,
    bool? hasTableOfContents,
    bool? hasForeword,
    String? forewordTitle,
    String? forewordContent,
    bool? hasEpilogue,
    String? epilogueTitle,
    String? epilogueContent,
    bool? hasAcknowledgments,
    String? acknowledgmentsContent,
    bool? hasAboutAuthor,
    String? aboutAuthorBio,
    String? presetTheme,
    String? trimSize,
    String? fontFamily,
    double? fontSize,
    double? lineSpacing,
    bool? firstLineIndent,
    bool? firstParagraphDropCap,
    String? chapterNumberingStyle,
    String? sceneBreakOrnament,
    String? headerVerso,
    String? headerRecto,
    bool? includePageNumbers,
  }) {
    return BookFormatConfig(
      id: id ?? this.id,
      novelId: novelId ?? this.novelId,
      hasTitlePage: hasTitlePage ?? this.hasTitlePage,
      subtitle: subtitle ?? this.subtitle,
      authorName: authorName ?? this.authorName,
      publisherName: publisherName ?? this.publisherName,
      hasCopyrightPage: hasCopyrightPage ?? this.hasCopyrightPage,
      copyrightYear: copyrightYear ?? this.copyrightYear,
      isbn: isbn ?? this.isbn,
      editionNotice: editionNotice ?? this.editionNotice,
      hasDedication: hasDedication ?? this.hasDedication,
      dedicationText: dedicationText ?? this.dedicationText,
      hasEpigraph: hasEpigraph ?? this.hasEpigraph,
      epigraphQuote: epigraphQuote ?? this.epigraphQuote,
      epigraphAuthor: epigraphAuthor ?? this.epigraphAuthor,
      hasTableOfContents: hasTableOfContents ?? this.hasTableOfContents,
      hasForeword: hasForeword ?? this.hasForeword,
      forewordTitle: forewordTitle ?? this.forewordTitle,
      forewordContent: forewordContent ?? this.forewordContent,
      hasEpilogue: hasEpilogue ?? this.hasEpilogue,
      epilogueTitle: epilogueTitle ?? this.epilogueTitle,
      epilogueContent: epilogueContent ?? this.epilogueContent,
      hasAcknowledgments: hasAcknowledgments ?? this.hasAcknowledgments,
      acknowledgmentsContent: acknowledgmentsContent ?? this.acknowledgmentsContent,
      hasAboutAuthor: hasAboutAuthor ?? this.hasAboutAuthor,
      aboutAuthorBio: aboutAuthorBio ?? this.aboutAuthorBio,
      presetTheme: presetTheme ?? this.presetTheme,
      trimSize: trimSize ?? this.trimSize,
      fontFamily: fontFamily ?? this.fontFamily,
      fontSize: fontSize ?? this.fontSize,
      lineSpacing: lineSpacing ?? this.lineSpacing,
      firstLineIndent: firstLineIndent ?? this.firstLineIndent,
      firstParagraphDropCap: firstParagraphDropCap ?? this.firstParagraphDropCap,
      chapterNumberingStyle: chapterNumberingStyle ?? this.chapterNumberingStyle,
      sceneBreakOrnament: sceneBreakOrnament ?? this.sceneBreakOrnament,
      headerVerso: headerVerso ?? this.headerVerso,
      headerRecto: headerRecto ?? this.headerRecto,
      includePageNumbers: includePageNumbers ?? this.includePageNumbers,
    );
  }
}
