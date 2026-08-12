import 'package:flutter/material.dart';
import '../../../models.dart';
import '../../../services/book_export_service.dart';

class BookStudioTab extends StatefulWidget {
  final Novel activeNovel;
  final List<Chapter> chapters;
  final BookFormatConfig config;
  final ValueChanged<BookFormatConfig> onConfigChanged;
  final VoidCallback onSave;
  final String Function(String) t;
  final String language;
  final bool isMobile;
  final String Function(String) cleanText;

  const BookStudioTab({
    super.key,
    required this.activeNovel,
    required this.chapters,
    required this.config,
    required this.onConfigChanged,
    required this.onSave,
    required this.t,
    required this.language,
    required this.isMobile,
    required this.cleanText,
  });

  @override
  State<BookStudioTab> createState() => _BookStudioTabState();
}

class _BookStudioTabState extends State<BookStudioTab> {
  int _activeViewIndex = 0; // 0: Settings, 1: Live Preview
  int _previewPage = 0;
  bool _isExporting = false;

  late BookFormatConfig _config;

  @override
  void initState() {
    super.initState();
    _config = widget.config;
  }

  @override
  void didUpdateWidget(covariant BookStudioTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.config != widget.config) {
      _config = widget.config;
    }
  }

  void _updateConfig(BookFormatConfig updated) {
    setState(() {
      _config = updated;
    });
    widget.onConfigChanged(updated);
  }

  Future<void> _exportEpub() async {
    if (widget.chapters.isEmpty) {
      _showNoChaptersWarning();
      return;
    }
    setState(() => _isExporting = true);
    try {
      final path = await BookExportService.exportEpub(
        context: context,
        novel: widget.activeNovel,
        chapters: widget.chapters,
        config: _config,
        isRtl: widget.language == 'ar',
        cleanText: widget.cleanText,
      );
      if (mounted && path != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.t('exportSuccess')),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  Future<void> _exportPdf() async {
    if (widget.chapters.isEmpty) {
      _showNoChaptersWarning();
      return;
    }
    setState(() => _isExporting = true);
    try {
      final path = await BookExportService.exportPdf(
        context: context,
        novel: widget.activeNovel,
        chapters: widget.chapters,
        config: _config,
        isRtl: widget.language == 'ar',
        cleanText: widget.cleanText,
      );
      if (mounted && path != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.t('exportSuccess')),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  Future<void> _exportDocx() async {
    if (widget.chapters.isEmpty) {
      _showNoChaptersWarning();
      return;
    }
    setState(() => _isExporting = true);
    try {
      final path = await BookExportService.exportDocx(
        context: context,
        novel: widget.activeNovel,
        chapters: widget.chapters,
        config: _config,
        isRtl: widget.language == 'ar',
        cleanText: widget.cleanText,
      );
      if (mounted && path != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.t('exportSuccess')),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  Future<void> _exportMarkdown() async {
    if (widget.chapters.isEmpty) {
      _showNoChaptersWarning();
      return;
    }
    setState(() => _isExporting = true);
    try {
      final path = await BookExportService.exportMarkdown(
        context: context,
        novel: widget.activeNovel,
        chapters: widget.chapters,
        config: _config,
        isRtl: widget.language == 'ar',
        cleanText: widget.cleanText,
      );
      if (mounted && path != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.t('exportSuccess')),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  void _showNoChaptersWarning() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(widget.t('exportNoChapters')),
        backgroundColor: Theme.of(context).colorScheme.error,
      ),
    );
  }

  void _applyPreset(String preset) {
    switch (preset) {
      case 'classic':
        _updateConfig(_config.copyWith(
          presetTheme: 'classic',
          fontFamily: widget.language == 'ar' ? 'Amiri' : 'Garamond',
          fontSize: 11.0,
          lineSpacing: 1.3,
          firstLineIndent: true,
          firstParagraphDropCap: true,
          sceneBreakOrnament: '* * *',
          chapterNumberingStyle: 'number_title',
        ));
        break;
      case 'modern':
        _updateConfig(_config.copyWith(
          presetTheme: 'modern',
          fontFamily: widget.language == 'ar' ? 'Cairo' : 'Arial',
          fontSize: 10.5,
          lineSpacing: 1.4,
          firstLineIndent: false,
          firstParagraphDropCap: false,
          sceneBreakOrnament: '— • —',
          chapterNumberingStyle: 'title_only',
        ));
        break;
      case 'epic':
        _updateConfig(_config.copyWith(
          presetTheme: 'epic',
          fontFamily: widget.language == 'ar' ? 'Amiri' : 'Georgia',
          fontSize: 11.5,
          lineSpacing: 1.35,
          firstLineIndent: true,
          firstParagraphDropCap: true,
          sceneBreakOrnament: '❖ ❖ ❖',
          chapterNumberingStyle: 'chapter_words',
        ));
        break;
      case 'romance':
        _updateConfig(_config.copyWith(
          presetTheme: 'romance',
          fontFamily: widget.language == 'ar' ? 'Amiri' : 'Georgia',
          fontSize: 11.0,
          lineSpacing: 1.4,
          firstLineIndent: true,
          firstParagraphDropCap: false,
          sceneBreakOrnament: '✦ ✦ ✦',
          chapterNumberingStyle: 'number_title',
        ));
        break;
      case 'minimalist':
        _updateConfig(_config.copyWith(
          presetTheme: 'minimalist',
          fontFamily: widget.language == 'ar' ? 'Cairo' : 'Georgia',
          fontSize: 10.5,
          lineSpacing: 1.25,
          firstLineIndent: true,
          firstParagraphDropCap: false,
          sceneBreakOrnament: '♦ ♦ ♦',
          chapterNumberingStyle: 'numbers_only',
        ));
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRtl = widget.language == 'ar';
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 650;
        return Scaffold(
          backgroundColor: Colors.transparent,
          body: Padding(
            padding: EdgeInsets.all(isCompact ? 10 : 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Header Bar
                _buildHeader(theme: theme, isRtl: isRtl, isCompact: isCompact, maxWidth: constraints.maxWidth),
                const SizedBox(height: 12),

                // View Selector Tabs
                _buildViewSelector(theme: theme),
                const SizedBox(height: 12),

                // Main Content Area
                Expanded(
                  child: _activeViewIndex == 0
                      ? _buildSettingsView(theme: theme, isRtl: isRtl)
                      : _buildPreviewView(theme: theme, isRtl: isRtl, isCompact: isCompact),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader({required ThemeData theme, required bool isRtl, required bool isCompact, required double maxWidth}) {
    final exportButtons = Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        if (_isExporting)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
          )
        else ...[
          ElevatedButton.icon(
            onPressed: _exportEpub,
            icon: const Icon(Icons.book, size: 16),
            label: Text(widget.t('exportEpubBtn')),
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: theme.colorScheme.onPrimary,
            ),
          ),
          OutlinedButton.icon(
            onPressed: _exportPdf,
            icon: const Icon(Icons.picture_as_pdf, size: 16),
            label: Text(widget.t('exportPdfBtn')),
          ),
          OutlinedButton.icon(
            onPressed: _exportDocx,
            icon: const Icon(Icons.description, size: 16),
            label: Text(widget.t('exportDocxBookBtn')),
          ),
          TextButton.icon(
            onPressed: _exportMarkdown,
            icon: const Icon(Icons.article, size: 16),
            label: Text(widget.t('exportMarkdownBookBtn')),
          ),
        ],
      ],
    );

    final titleColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.t('bookStudioTitle'),
          style: (isCompact ? theme.textTheme.titleLarge : theme.textTheme.headlineSmall)?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 2),
        Text(
          widget.t('bookStudioDesc'),
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      ],
    );

    // Stacking header vertically when width is less than 950px ensures zero horizontal overflow
    if (maxWidth < 950) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          titleColumn,
          const SizedBox(height: 12),
          exportButtons,
        ],
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(child: titleColumn),
        const SizedBox(width: 16),
        Flexible(
          child: Align(
            alignment: AlignmentDirectional.centerEnd,
            child: exportButtons,
          ),
        ),
      ],
    );
  }

  Widget _buildViewSelector({required ThemeData theme}) {
    return SegmentedButton<int>(
      segments: [
        ButtonSegment<int>(
          value: 0,
          icon: const Icon(Icons.tune, size: 16),
          label: Text(widget.t('studioTabSettings')),
        ),
        ButtonSegment<int>(
          value: 1,
          icon: const Icon(Icons.menu_book, size: 16),
          label: Text(widget.t('studioTabPreview')),
        ),
      ],
      selected: {_activeViewIndex},
      onSelectionChanged: (set) {
        setState(() {
          _activeViewIndex = set.first;
        });
      },
    );
  }

  Widget _buildSettingsView({required ThemeData theme, required bool isRtl}) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // 1. Typography & Theme Presets
        _buildTypographyCard(theme: theme, isRtl: isRtl),
        const SizedBox(height: 16),

        // 2. Front Matter Card
        _buildFrontMatterCard(theme: theme, isRtl: isRtl),
        const SizedBox(height: 16),

        // 3. Body Matter & Chapter Settings Card
        _buildBodyMatterCard(theme: theme, isRtl: isRtl),
        const SizedBox(height: 16),

        // 4. Back Matter Card
        _buildBackMatterCard(theme: theme, isRtl: isRtl),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildTypographyCard({required ThemeData theme, required bool isRtl}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.palette, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  widget.t('layoutAndTypography'),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Preset Theme Chips
            Text(widget.t('presetThemeLabel'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _presetChip('classic', widget.t('themeClassic')),
                _presetChip('modern', widget.t('themeModern')),
                _presetChip('epic', widget.t('themeEpic')),
                _presetChip('romance', widget.t('themeRomance')),
                _presetChip('minimalist', widget.t('themeMinimalist')),
              ],
            ),
            const Divider(height: 28),

            // Trim Size & Font Row
            LayoutBuilder(
              builder: (context, constraints) {
                final w = constraints.maxWidth;
                final double itemWidth = w < 500 ? double.infinity : (w < 820 ? (w - 16) / 2 : (w - 32) / 3);
                return Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: [
                    // Trim Size
                    SizedBox(
                      width: itemWidth,
                      child: DropdownButtonFormField<String>(
                        isExpanded: true,
                        initialValue: _config.trimSize,
                        decoration: InputDecoration(
                          labelText: widget.t('trimSizeLabel'),
                          border: const OutlineInputBorder(),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        items: [
                          DropdownMenuItem(value: 'us_trade_6x9', child: Text(widget.t('trimSizeUsTrade6x9'), overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'trade_5x8', child: Text(widget.t('trimSizeTrade5x8'), overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'standard_55x85', child: Text(widget.t('trimSizeStandard55x85'), overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'mass_market_425x687', child: Text(widget.t('trimSizeMassMarket'), overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'large_85x11', child: Text(widget.t('trimSizeLarge'), overflow: TextOverflow.ellipsis)),
                        ],
                        onChanged: (val) {
                          if (val != null) _updateConfig(_config.copyWith(trimSize: val));
                        },
                      ),
                    ),

                    // Font Family
                    SizedBox(
                      width: itemWidth,
                      child: DropdownButtonFormField<String>(
                        isExpanded: true,
                        initialValue: _config.fontFamily,
                        decoration: InputDecoration(
                          labelText: widget.t('fontFamilyLabel'),
                          border: const OutlineInputBorder(),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Garamond', child: Text('Garamond (Serif)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'Georgia', child: Text('Georgia (Serif)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'Amiri', child: Text('Amiri (Arabic Serif)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'Cairo', child: Text('Cairo (Arabic Sans)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: 'Arial', child: Text('Arial (Sans)', overflow: TextOverflow.ellipsis)),
                        ],
                        onChanged: (val) {
                          if (val != null) _updateConfig(_config.copyWith(fontFamily: val));
                        },
                      ),
                    ),

                    // Scene Break Ornament
                    SizedBox(
                      width: itemWidth,
                      child: DropdownButtonFormField<String>(
                        isExpanded: true,
                        initialValue: _config.sceneBreakOrnament,
                        decoration: InputDecoration(
                          labelText: widget.t('sceneBreakOrnamentLabel'),
                          border: const OutlineInputBorder(),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        items: const [
                          DropdownMenuItem(value: '* * *', child: Text('* * *  (Asterisks)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: '♦ ♦ ♦', child: Text('♦ ♦ ♦  (Diamonds)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: '✦ ✦ ✦', child: Text('✦ ✦ ✦  (Stars)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: '❖ ❖ ❖', child: Text('❖ ❖ ❖  (Florets)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: '— • —', child: Text('— • —  (Minimal Bar)', overflow: TextOverflow.ellipsis)),
                          DropdownMenuItem(value: '~ ~ ~', child: Text('~ ~ ~  (Waves)', overflow: TextOverflow.ellipsis)),
                        ],
                        onChanged: (val) {
                          if (val != null) _updateConfig(_config.copyWith(sceneBreakOrnament: val));
                        },
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),

            // Toggles
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                FilterChip(
                  label: Text(widget.t('firstLineIndentLabel')),
                  selected: _config.firstLineIndent,
                  onSelected: (val) => _updateConfig(_config.copyWith(firstLineIndent: val)),
                ),
                FilterChip(
                  label: Text(widget.t('dropCapLabel')),
                  selected: _config.firstParagraphDropCap,
                  onSelected: (val) => _updateConfig(_config.copyWith(firstParagraphDropCap: val)),
                ),
                FilterChip(
                  label: Text(widget.t('includePageNumbersLabel')),
                  selected: _config.includePageNumbers,
                  onSelected: (val) => _updateConfig(_config.copyWith(includePageNumbers: val)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _presetChip(String value, String label) {
    final isSelected = _config.presetTheme == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) _applyPreset(value);
      },
    );
  }

  Widget _buildFrontMatterCard({required ThemeData theme, required bool isRtl}) {
    return Card(
      child: ExpansionTile(
        initiallyExpanded: true,
        leading: Icon(Icons.first_page, color: theme.colorScheme.primary),
        title: Text(widget.t('frontMatterSection'), style: const TextStyle(fontWeight: FontWeight.bold)),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                // Title Page Group
                SwitchListTile(
                  title: Text(widget.t('titlePageLabel')),
                  value: _config.hasTitlePage,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasTitlePage: val)),
                ),
                if (_config.hasTitlePage)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 520;
                        if (isNarrow) {
                          return Column(
                            children: [
                              TextFormField(
                                initialValue: _config.subtitle,
                                decoration: InputDecoration(labelText: widget.t('subtitleLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(subtitle: val)),
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                initialValue: _config.authorName,
                                decoration: InputDecoration(labelText: widget.t('authorNameLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(authorName: val)),
                              ),
                            ],
                          );
                        }
                        return Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: _config.subtitle,
                                decoration: InputDecoration(labelText: widget.t('subtitleLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(subtitle: val)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                initialValue: _config.authorName,
                                decoration: InputDecoration(labelText: widget.t('authorNameLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(authorName: val)),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),

                const Divider(),

                // Copyright Group
                SwitchListTile(
                  title: Text(widget.t('copyrightSection')),
                  value: _config.hasCopyrightPage,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasCopyrightPage: val)),
                ),
                if (_config.hasCopyrightPage)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 520;
                        if (isNarrow) {
                          return Column(
                            children: [
                              TextFormField(
                                initialValue: _config.copyrightYear,
                                decoration: InputDecoration(labelText: widget.t('copyrightYearLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(copyrightYear: val)),
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                initialValue: _config.isbn,
                                decoration: InputDecoration(labelText: widget.t('isbnLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(isbn: val)),
                              ),
                            ],
                          );
                        }
                        return Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: _config.copyrightYear,
                                decoration: InputDecoration(labelText: widget.t('copyrightYearLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(copyrightYear: val)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                initialValue: _config.isbn,
                                decoration: InputDecoration(labelText: widget.t('isbnLabel'), border: const OutlineInputBorder()),
                                onChanged: (val) => _updateConfig(_config.copyWith(isbn: val)),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),

                const Divider(),

                // Dedication Group
                SwitchListTile(
                  title: Text(widget.t('dedicationSection')),
                  value: _config.hasDedication,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasDedication: val)),
                ),
                if (_config.hasDedication)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: TextFormField(
                      initialValue: _config.dedicationText,
                      maxLines: 3,
                      decoration: InputDecoration(hintText: widget.t('dedicationHint'), border: const OutlineInputBorder()),
                      onChanged: (val) => _updateConfig(_config.copyWith(dedicationText: val)),
                    ),
                  ),

                const Divider(),

                // Epigraph Group
                SwitchListTile(
                  title: Text(widget.t('epigraphSection')),
                  value: _config.hasEpigraph,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasEpigraph: val)),
                ),
                if (_config.hasEpigraph)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: Column(
                      children: [
                        TextFormField(
                          initialValue: _config.epigraphQuote,
                          maxLines: 2,
                          decoration: InputDecoration(labelText: widget.t('epigraphQuoteLabel'), border: const OutlineInputBorder()),
                          onChanged: (val) => _updateConfig(_config.copyWith(epigraphQuote: val)),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: _config.epigraphAuthor,
                          decoration: InputDecoration(labelText: widget.t('epigraphAuthorLabel'), border: const OutlineInputBorder()),
                          onChanged: (val) => _updateConfig(_config.copyWith(epigraphAuthor: val)),
                        ),
                      ],
                    ),
                  ),

                const Divider(),

                // Foreword Group
                SwitchListTile(
                  title: Text(widget.t('forewordSection')),
                  value: _config.hasForeword,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasForeword: val)),
                ),
                if (_config.hasForeword)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: Column(
                      children: [
                        TextFormField(
                          initialValue: _config.forewordTitle,
                          decoration: InputDecoration(labelText: widget.t('forewordTitleLabel'), border: const OutlineInputBorder()),
                          onChanged: (val) => _updateConfig(_config.copyWith(forewordTitle: val)),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: _config.forewordContent,
                          maxLines: 4,
                          decoration: InputDecoration(hintText: widget.t('forewordContentHint'), border: const OutlineInputBorder()),
                          onChanged: (val) => _updateConfig(_config.copyWith(forewordContent: val)),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBodyMatterCard({required ThemeData theme, required bool isRtl}) {
    final totalWords = widget.chapters.fold<int>(0, (sum, ch) => sum + ch.content.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.auto_stories, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  '${widget.t('writeNovelTitle')} (${widget.chapters.length} ${widget.chapters.length == 1 ? 'Chapter' : 'Chapters'} · $totalWords ${widget.t('words')})',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Chapter Numbering Style
            LayoutBuilder(
              builder: (context, constraints) {
                final w = constraints.maxWidth;
                final double itemWidth = w < 500 ? double.infinity : 320.0;
                return SizedBox(
                  width: itemWidth,
                  child: DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _config.chapterNumberingStyle,
                    decoration: InputDecoration(
                      labelText: widget.t('chapterNumberingLabel'),
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    items: [
                      DropdownMenuItem(value: 'number_title', child: Text(widget.t('numberingNumberTitle'), overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'chapter_words', child: Text(widget.t('numberingWords'), overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'numbers_only', child: Text(widget.t('numberingNumbersOnly'), overflow: TextOverflow.ellipsis)),
                      DropdownMenuItem(value: 'title_only', child: Text(widget.t('numberingTitleOnly'), overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (val) {
                      if (val != null) _updateConfig(_config.copyWith(chapterNumberingStyle: val));
                    },
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBackMatterCard({required ThemeData theme, required bool isRtl}) {
    return Card(
      child: ExpansionTile(
        initiallyExpanded: false,
        leading: Icon(Icons.last_page, color: theme.colorScheme.primary),
        title: Text(widget.t('backMatterSection'), style: const TextStyle(fontWeight: FontWeight.bold)),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                // Epilogue Group
                SwitchListTile(
                  title: Text(widget.t('epilogueSection')),
                  value: _config.hasEpilogue,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasEpilogue: val)),
                ),
                if (_config.hasEpilogue)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: Column(
                      children: [
                        TextFormField(
                          initialValue: _config.epilogueTitle,
                          decoration: InputDecoration(labelText: widget.t('epilogueTitleLabel'), border: const OutlineInputBorder()),
                          onChanged: (val) => _updateConfig(_config.copyWith(epilogueTitle: val)),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: _config.epilogueContent,
                          maxLines: 4,
                          decoration: InputDecoration(hintText: widget.t('epilogueContentHint'), border: const OutlineInputBorder()),
                          onChanged: (val) => _updateConfig(_config.copyWith(epilogueContent: val)),
                        ),
                      ],
                    ),
                  ),

                const Divider(),

                // Acknowledgments Group
                SwitchListTile(
                  title: Text(widget.t('acknowledgmentsSection')),
                  value: _config.hasAcknowledgments,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasAcknowledgments: val)),
                ),
                if (_config.hasAcknowledgments)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: TextFormField(
                      initialValue: _config.acknowledgmentsContent,
                      maxLines: 4,
                      decoration: InputDecoration(hintText: widget.t('acknowledgmentsHint'), border: const OutlineInputBorder()),
                      onChanged: (val) => _updateConfig(_config.copyWith(acknowledgmentsContent: val)),
                    ),
                  ),

                const Divider(),

                // About Author Group
                SwitchListTile(
                  title: Text(widget.t('aboutAuthorSection')),
                  value: _config.hasAboutAuthor,
                  onChanged: (val) => _updateConfig(_config.copyWith(hasAboutAuthor: val)),
                ),
                if (_config.hasAboutAuthor)
                  Padding(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                    child: TextFormField(
                      initialValue: _config.aboutAuthorBio,
                      maxLines: 4,
                      decoration: InputDecoration(hintText: widget.t('aboutAuthorBioHint'), border: const OutlineInputBorder()),
                      onChanged: (val) => _updateConfig(_config.copyWith(aboutAuthorBio: val)),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewView({required ThemeData theme, required bool isRtl, required bool isCompact}) {
    if (widget.chapters.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Text(widget.t('exportNoChapters')),
        ),
      );
    }

    final currentChapter = widget.chapters[_previewPage.clamp(0, widget.chapters.length - 1)];
    final chapterHeading = _formatChapterHeading(
      index: _previewPage + 1,
      title: currentChapter.title,
      style: _config.chapterNumberingStyle,
      isRtl: isRtl,
    );

    return Column(
      children: [
        // Preview Navigator Bar
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: _previewPage > 0 ? () => setState(() => _previewPage--) : null,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  '${_previewPage + 1} / ${widget.chapters.length}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: _previewPage < widget.chapters.length - 1 ? () => setState(() => _previewPage++) : null,
              ),
            ],
          ),
        ),

        // Simulated Book Page
        Expanded(
          child: Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 520),
              margin: EdgeInsets.symmetric(horizontal: isCompact ? 6 : 16),
              decoration: BoxDecoration(
                color: theme.brightness == Brightness.dark ? const Color(0xFF1E2128) : const Color(0xFFFFFDF9),
                borderRadius: BorderRadius.circular(4),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.18),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(color: theme.dividerColor.withValues(alpha: 0.3)),
              ),
              padding: EdgeInsets.symmetric(
                horizontal: isCompact ? 18 : 36,
                vertical: isCompact ? 18 : 32,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Running Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          widget.activeNovel.title,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10,
                            letterSpacing: 1,
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          currentChapter.title,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10,
                            letterSpacing: 1,
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 16),

                  // Page Content
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 20),
                          Center(
                            child: Text(
                              chapterHeading,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                fontFamily: _config.fontFamily,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            widget.cleanText(currentChapter.content),
                            textAlign: isRtl ? TextAlign.right : TextAlign.justify,
                            style: TextStyle(
                              fontSize: _config.fontSize,
                              height: _config.lineSpacing,
                              fontFamily: _config.fontFamily,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Footer Page Number
                  if (_config.includePageNumbers)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '${_previewPage + 1}',
                          style: TextStyle(
                            fontSize: 11,
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _formatChapterHeading({required int index, required String title, required String style, required bool isRtl}) {
    final cleanTitle = title.trim();
    switch (style) {
      case 'numbers_only':
        return '$index';
      case 'title_only':
        return cleanTitle.isNotEmpty ? cleanTitle : (isRtl ? 'الفصل $index' : 'Chapter $index');
      case 'chapter_words':
        return isRtl ? 'الفصل ${_arabicWordNumber(index)}: $cleanTitle' : 'Chapter ${_wordNumber(index)}: $cleanTitle';
      case 'number_title':
      default:
        if (cleanTitle.isEmpty) {
          return isRtl ? 'الفصل $index' : 'Chapter $index';
        }
        return isRtl ? 'الفصل $index: $cleanTitle' : 'Chapter $index: $cleanTitle';
    }
  }

  String _wordNumber(int n) {
    const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
    if (n >= 1 && n <= words.length) return words[n - 1];
    return '$n';
  }

  String _arabicWordNumber(int n) {
    const words = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
      'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون'];
    if (n >= 1 && n <= words.length) return words[n - 1];
    return '$n';
  }
}
