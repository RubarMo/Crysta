import 'package:flutter_test/flutter_test.dart';
import 'package:crysta/models.dart';
import 'package:crysta/services/epub_builder.dart';
import 'package:crysta/services/docx_builder.dart';
import 'package:crysta/services/pdf_book_builder.dart';
import 'package:archive/archive.dart';

void main() {
  group('Book Studio & Publishing Formatting Tests', () {
    const testNovel = Novel(
      id: 1,
      title: 'The Crystal Kingdom',
      genre: 'Fantasy',
      targetAudience: 'Young Adult',
      targetWordCount: 75000,
      currentWordCount: 12000,
    );

    final testChapters = [
      const Chapter(id: 1, novelId: 1, title: 'The Awakening', content: 'The dawn rose over the glass spires.\n\n***\n\nFar below, the river sparkled.', sortOrder: 1),
      const Chapter(id: 2, novelId: 1, title: 'The Hidden Chamber', content: 'Beneath the ancient library lay the secret gate.', sortOrder: 2),
    ];

    test('BookFormatConfig serialization and defaults work properly', () {
      final config = BookFormatConfig.defaultForNovel(testNovel);
      expect(config.novelId, 1);
      expect(config.hasTitlePage, isTrue);
      expect(config.hasCopyrightPage, isTrue);
      expect(config.hasTableOfContents, isTrue);
      expect(config.trimSize, 'us_trade_6x9');
      expect(config.fontFamily, 'Garamond');

      final map = config.toMap();
      expect(map['novel_id'], 1);
      expect(map['trim_size'], 'us_trade_6x9');

      final deserialized = BookFormatConfig.fromMap(map);
      expect(deserialized.novelId, config.novelId);
      expect(deserialized.trimSize, config.trimSize);
      expect(deserialized.fontFamily, config.fontFamily);
    });

    test('EpubBuilder generates valid EPUB 3 ZIP archive with standard structure', () {
      final config = BookFormatConfig(
        novelId: 1,
        authorName: 'Alex Rivers',
        subtitle: 'A Tale of Shadows',
        hasTitlePage: true,
        hasCopyrightPage: true,
        hasDedication: true,
        dedicationText: 'For dreamers everywhere',
        hasEpigraph: true,
        epigraphQuote: 'Magic is believing in yourself.',
        epigraphAuthor: 'Ancient Proverb',
        firstParagraphDropCap: true,
        sceneBreakOrnament: '♦ ♦ ♦',
      );

      final bytes = EpubBuilder.buildEpub(
        novel: testNovel,
        chapters: testChapters,
        config: config,
        isRtl: false,
      );

      expect(bytes, isNotEmpty);

      // Verify ZIP archive contents
      final archive = ZipDecoder().decodeBytes(bytes);
      final filenames = archive.files.map((f) => f.name).toList();

      expect(filenames, contains('mimetype'));
      expect(filenames, contains('META-INF/container.xml'));
      expect(filenames, contains('OEBPS/content.opf'));
      expect(filenames, contains('OEBPS/nav.xhtml'));
      expect(filenames, contains('OEBPS/toc.ncx'));
      expect(filenames, contains('OEBPS/styles.css'));
      expect(filenames, contains('OEBPS/titlepage.xhtml'));
      expect(filenames, contains('OEBPS/copyright.xhtml'));
      expect(filenames, contains('OEBPS/dedication.xhtml'));
      expect(filenames, contains('OEBPS/epigraph.xhtml'));
      expect(filenames, contains('OEBPS/chapter_1.xhtml'));
      expect(filenames, contains('OEBPS/chapter_2.xhtml'));

      // Check mimetype is uncompressed
      final mimetypeFile = archive.findFile('mimetype');
      expect(mimetypeFile, isNotNull);
      expect(String.fromCharCodes(mimetypeFile!.content as List<int>), 'application/epub+zip');
    });

    test('EpubBuilder supports Arabic RTL configuration', () {
      final config = const BookFormatConfig(
        novelId: 1,
        authorName: 'أحمد محمود',
        hasTitlePage: true,
        hasCopyrightPage: true,
      );

      final arabicNovel = const Novel(
        id: 1,
        title: 'مملكة الكريستال',
        genre: 'فانتازيا',
        targetAudience: 'عام',
        targetWordCount: 50000,
        currentWordCount: 5000,
      );

      final arabicChapters = [
        const Chapter(id: 1, novelId: 1, title: 'البداية', content: 'أشرقت الشمس فوق الأبراج الزجاجية.', sortOrder: 1),
      ];

      final bytes = EpubBuilder.buildEpub(
        novel: arabicNovel,
        chapters: arabicChapters,
        config: config,
        isRtl: true,
      );

      expect(bytes, isNotEmpty);

      final archive = ZipDecoder().decodeBytes(bytes);
      final opfFile = archive.findFile('OEBPS/content.opf')!;
      final opfContent = String.fromCharCodes(opfFile.content as List<int>);
      expect(opfContent, contains('dir="rtl"'));
      expect(opfContent, contains('xml:lang="ar"'));
      expect(opfContent, contains('page-progression-direction="rtl"'));
    });

    test('DocxBuilder generates valid OpenXML manuscript archive', () {
      final config = const BookFormatConfig(
        novelId: 1,
        authorName: 'Alex Rivers',
        hasTitlePage: true,
        hasCopyrightPage: true,
      );

      final bytes = DocxBuilder.buildDocx(
        novel: testNovel,
        chapters: testChapters,
        config: config,
        isRtl: false,
      );

      expect(bytes, isNotEmpty);

      final archive = ZipDecoder().decodeBytes(bytes);
      final filenames = archive.files.map((f) => f.name).toList();

      expect(filenames, contains('[Content_Types].xml'));
      expect(filenames, contains('_rels/.rels'));
      expect(filenames, contains('word/_rels/document.xml.rels'));
      expect(filenames, contains('word/styles.xml'));
      expect(filenames, contains('word/document.xml'));

      final docFile = archive.findFile('word/document.xml')!;
      final docContent = String.fromCharCodes(docFile.content as List<int>);
      expect(docContent, contains('The Crystal Kingdom'));
      expect(docContent, contains('The Awakening'));
    });

    test('PdfBookBuilder generates valid PDF byte stream with custom trim sizes', () async {
      final config = const BookFormatConfig(
        novelId: 1,
        authorName: 'Alex Rivers',
        trimSize: 'us_trade_6x9',
        hasTitlePage: true,
        hasCopyrightPage: true,
      );

      final bytes = await PdfBookBuilder.buildPdf(
        novel: testNovel,
        chapters: testChapters,
        config: config,
        isRtl: false,
      );

      expect(bytes, isNotEmpty);
      // PDF files start with %PDF
      final header = String.fromCharCodes(bytes.sublist(0, 5));
      expect(header, '%PDF-');
    });

    test('PdfBookBuilder handles Arabic Unicode text with embedded Amiri font', () async {
      final config = const BookFormatConfig(
        novelId: 1,
        authorName: 'أحمد محمود',
        trimSize: 'trade_5x8',
        hasTitlePage: true,
        hasCopyrightPage: true,
        hasDedication: true,
        dedicationText: 'إلى كل الحالمين',
      );

      final arabicNovel = const Novel(
        id: 1,
        title: 'مملكة الكريستال',
        genre: 'فانتازيا',
        targetAudience: 'عام',
        targetWordCount: 50000,
        currentWordCount: 5000,
      );

      final arabicChapters = [
        const Chapter(id: 1, novelId: 1, title: 'البداية', content: 'أشرقت الشمس فوق الأبراج الزجاجية في صباح مشرق.', sortOrder: 1),
      ];

      final bytes = await PdfBookBuilder.buildPdf(
        novel: arabicNovel,
        chapters: arabicChapters,
        config: config,
        isRtl: true,
      );

      expect(bytes, isNotEmpty);
      final header = String.fromCharCodes(bytes.sublist(0, 5));
      expect(header, '%PDF-');
    });

    test('PdfBookBuilder handles multi-page long chapter content spanning across pages', () async {
      final config = const BookFormatConfig(
        novelId: 1,
        authorName: 'Alex Rivers',
        trimSize: 'trade_5x8',
      );

      // Generate long chapter text (100 paragraphs) that spans multiple pages (>3000px height)
      final longText = List.generate(100, (i) => 'هذه فقرة طويلة رقم $i تحتوي على نص سردي يمتد عبر عدة أسطر ليتجاوز ارتفاع الصفحة الواحدة.').join('\n\n');

      final novel = const Novel(
        id: 1,
        title: 'رواية طويلة',
        genre: 'دراما',
        targetAudience: 'عام',
        targetWordCount: 50000,
        currentWordCount: 5000,
      );

      final chapters = [
        Chapter(id: 1, novelId: 1, title: 'الفصل الأول', content: longText, sortOrder: 1),
      ];

      final bytes = await PdfBookBuilder.buildPdf(
        novel: novel,
        chapters: chapters,
        config: config,
        isRtl: true,
      );

      expect(bytes, isNotEmpty);
      final header = String.fromCharCodes(bytes.sublist(0, 5));
      expect(header, '%PDF-');
    });

    test('PdfBookBuilder calculates alternating odd and even page margins correctly', () {
      final margins5x8 = PdfBookBuilder.getMargins('trade_5x8');
      expect(margins5x8.innerMargin, greaterThan(margins5x8.outerMargin));

      final rtlOdd = PdfBookBuilder.getPageFormat('trade_5x8', isOdd: true, isRtl: true);
      final rtlEven = PdfBookBuilder.getPageFormat('trade_5x8', isOdd: false, isRtl: true);

      // In Arabic RTL:
      // Odd pages: right margin is wider (spine on right)
      expect(rtlOdd.marginRight, equals(margins5x8.innerMargin));
      expect(rtlOdd.marginLeft, equals(margins5x8.outerMargin));
      // Even pages: left margin is wider (spine on left)
      expect(rtlEven.marginLeft, equals(margins5x8.innerMargin));
      expect(rtlEven.marginRight, equals(margins5x8.outerMargin));

      final ltrOdd = PdfBookBuilder.getPageFormat('trade_5x8', isOdd: true, isRtl: false);
      final ltrEven = PdfBookBuilder.getPageFormat('trade_5x8', isOdd: false, isRtl: false);

      // In English LTR:
      // Odd pages: left margin is wider (spine on left)
      expect(ltrOdd.marginLeft, equals(margins5x8.innerMargin));
      expect(ltrOdd.marginRight, equals(margins5x8.outerMargin));
      // Even pages: right margin is wider (spine on right)
      expect(ltrEven.marginRight, equals(margins5x8.innerMargin));
      expect(ltrEven.marginLeft, equals(margins5x8.outerMargin));
    });
  });
}
