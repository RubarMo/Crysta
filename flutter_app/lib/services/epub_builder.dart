import 'dart:convert';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import '../models.dart';

class EpubBuilder {
  static Uint8List buildEpub({
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) {
    final archive = Archive();

    // 1. mimetype (MUST be first, uncompressed, without extra fields)
    final mimetypeBytes = utf8.encode('application/epub+zip');
    archive.addFile(ArchiveFile('mimetype', mimetypeBytes.length, mimetypeBytes)..compress = false);

    // 2. META-INF/container.xml
    final containerXml = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>''';
    _addTextFile(archive, 'META-INF/container.xml', containerXml);

    // 3. CSS Stylesheet
    final css = _buildCss(config: config, isRtl: isRtl);
    _addTextFile(archive, 'OEBPS/styles.css', css);

    // Prepare sections
    final manifestItems = <String>[];
    final spineItems = <String>[];
    final tocNavItems = <Map<String, String>>[];
    int fileIndex = 1;

    // Front Matter: Title Page
    if (config.hasTitlePage) {
      final id = 'titlepage';
      final filename = 'titlepage.xhtml';
      final content = _buildTitlePageXhtml(novel: novel, config: config, isRtl: isRtl);
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': isRtl ? 'صفحة العنوان' : 'Title Page', 'href': filename});
    }

    // Front Matter: Copyright Page
    if (config.hasCopyrightPage) {
      final id = 'copyright';
      final filename = 'copyright.xhtml';
      final content = _buildCopyrightXhtml(novel: novel, config: config, isRtl: isRtl);
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': isRtl ? 'حقوق النشر' : 'Copyright', 'href': filename});
    }

    // Front Matter: Dedication
    if (config.hasDedication && config.dedicationText.trim().isNotEmpty) {
      final id = 'dedication';
      final filename = 'dedication.xhtml';
      final content = _buildDedicationXhtml(config: config, isRtl: isRtl);
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': isRtl ? 'الإهداء' : 'Dedication', 'href': filename});
    }

    // Front Matter: Epigraph
    if (config.hasEpigraph && config.epigraphQuote.trim().isNotEmpty) {
      final id = 'epigraph';
      final filename = 'epigraph.xhtml';
      final content = _buildEpigraphXhtml(config: config, isRtl: isRtl);
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': isRtl ? 'الاقتباس الافتتاحي' : 'Epigraph', 'href': filename});
    }

    // Front Matter: Foreword
    if (config.hasForeword && config.forewordContent.trim().isNotEmpty) {
      final id = 'foreword';
      final filename = 'foreword.xhtml';
      final title = config.forewordTitle.isNotEmpty ? config.forewordTitle : (isRtl ? 'تصدير' : 'Foreword');
      final content = _buildGenericSectionXhtml(
        title: title,
        bodyHtml: _textToHtml(config.forewordContent),
        config: config,
        isRtl: isRtl,
      );
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': title, 'href': filename});
    }

    // Body Matter: Chapters
    for (int i = 0; i < chapters.length; i++) {
      final ch = chapters[i];
      final id = 'chapter_$fileIndex';
      final filename = 'chapter_$fileIndex.xhtml';
      fileIndex++;

      final chapterTitle = _formatChapterHeading(index: i + 1, title: ch.title, style: config.chapterNumberingStyle, isRtl: isRtl);
      final bodyHtml = _textToHtml(ch.content, ornament: config.sceneBreakOrnament, dropCap: config.firstParagraphDropCap);

      final content = _buildGenericSectionXhtml(
        title: chapterTitle,
        bodyHtml: bodyHtml,
        config: config,
        isRtl: isRtl,
      );
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': chapterTitle, 'href': filename});
    }

    // Back Matter: Epilogue
    if (config.hasEpilogue && config.epilogueContent.trim().isNotEmpty) {
      final id = 'epilogue';
      final filename = 'epilogue.xhtml';
      final title = config.epilogueTitle.isNotEmpty ? config.epilogueTitle : (isRtl ? 'خاتمة' : 'Epilogue');
      final content = _buildGenericSectionXhtml(
        title: title,
        bodyHtml: _textToHtml(config.epilogueContent),
        config: config,
        isRtl: isRtl,
      );
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': title, 'href': filename});
    }

    // Back Matter: Acknowledgments
    if (config.hasAcknowledgments && config.acknowledgmentsContent.trim().isNotEmpty) {
      final id = 'acknowledgments';
      final filename = 'acknowledgments.xhtml';
      final title = isRtl ? 'شكر وتقدير' : 'Acknowledgments';
      final content = _buildGenericSectionXhtml(
        title: title,
        bodyHtml: _textToHtml(config.acknowledgmentsContent),
        config: config,
        isRtl: isRtl,
      );
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': title, 'href': filename});
    }

    // Back Matter: About Author
    if (config.hasAboutAuthor && config.aboutAuthorBio.trim().isNotEmpty) {
      final id = 'about_author';
      final filename = 'about_author.xhtml';
      final title = isRtl ? 'عن المؤلف' : 'About the Author';
      final content = _buildGenericSectionXhtml(
        title: title,
        bodyHtml: _textToHtml(config.aboutAuthorBio),
        config: config,
        isRtl: isRtl,
      );
      _addTextFile(archive, 'OEBPS/$filename', content);
      manifestItems.add('<item id="$id" href="$filename" media-type="application/xhtml+xml"/>');
      spineItems.add('<itemref idref="$id"/>');
      tocNavItems.add({'title': title, 'href': filename});
    }

    // 4. OEBPS/nav.xhtml (EPUB 3 Navigation)
    final navXhtml = _buildNavXhtml(novel: novel, tocItems: tocNavItems, isRtl: isRtl);
    _addTextFile(archive, 'OEBPS/nav.xhtml', navXhtml);
    manifestItems.add('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');

    // 5. OEBPS/toc.ncx (EPUB 2 compatibility)
    final tocNcx = _buildTocNcx(novel: novel, tocItems: tocNavItems);
    _addTextFile(archive, 'OEBPS/toc.ncx', tocNcx);
    manifestItems.add('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');

    // 6. OEBPS/content.opf
    manifestItems.add('<item id="css" href="styles.css" media-type="text/css"/>');
    final contentOpf = _buildContentOpf(
      novel: novel,
      config: config,
      manifestItems: manifestItems,
      spineItems: spineItems,
      isRtl: isRtl,
    );
    _addTextFile(archive, 'OEBPS/content.opf', contentOpf);

    // Encode to ZIP
    final zipEncoder = ZipEncoder();
    final bytes = zipEncoder.encode(archive);
    return Uint8List.fromList(bytes!);
  }

  static void _addTextFile(Archive archive, String path, String content) {
    final bytes = utf8.encode(content);
    archive.addFile(ArchiveFile(path, bytes.length, bytes));
  }

  static String _buildCss({required BookFormatConfig config, required bool isRtl}) {
    final font = config.fontFamily;
    final align = isRtl ? 'right' : 'justify';
    final indent = config.firstLineIndent ? '1.8em' : '0';

    return '''
@charset "utf-8";

body {
  font-family: "$font", Georgia, serif;
  font-size: 1.05em;
  line-height: ${config.lineSpacing};
  text-align: $align;
  margin: 5% 7%;
  padding: 0;
  color: #1a1a1a;
  background-color: transparent;
}

h1, h2, h3, h4 {
  text-align: center;
  font-weight: 700;
  margin: 1.8em 0 1em 0;
  page-break-inside: avoid;
}

h1.chapter-title {
  font-size: 1.6em;
  letter-spacing: 0.05em;
  margin-top: 25%;
  margin-bottom: 1.5em;
}

p {
  margin: 0;
  padding: 0;
  text-indent: $indent;
  margin-bottom: ${config.firstLineIndent ? '0' : '0.75em'};
}

p.first-paragraph {
  text-indent: 0 !important;
}

.drop-cap {
  float: ${isRtl ? 'right' : 'left'};
  font-size: 3.2em;
  line-height: 0.85;
  padding-top: 4px;
  padding-right: ${isRtl ? '0' : '8px'};
  padding-left: ${isRtl ? '8px' : '0'};
  font-weight: 700;
}

.scene-break {
  text-align: center;
  margin: 1.8em 0;
  letter-spacing: 0.35em;
  font-size: 1.1em;
  opacity: 0.85;
}

.title-page {
  text-align: center;
  margin-top: 30%;
}

.title-page h1 {
  font-size: 2.2em;
  margin-bottom: 0.3em;
}

.title-page h2 {
  font-size: 1.2em;
  font-weight: normal;
  margin-bottom: 2em;
  opacity: 0.8;
}

.title-page .author {
  font-size: 1.4em;
  font-weight: 600;
  margin-top: 3em;
}

.title-page .publisher {
  font-size: 1em;
  margin-top: 4em;
  opacity: 0.7;
}

.copyright-page {
  font-size: 0.9em;
  line-height: 1.6;
  margin-top: 40%;
  text-align: ${isRtl ? 'right' : 'left'};
}

.dedication {
  text-align: center;
  font-style: italic;
  margin-top: 35%;
  font-size: 1.1em;
}

.epigraph {
  margin-top: 30%;
  text-align: center;
  font-style: italic;
}

.epigraph .author {
  margin-top: 1em;
  font-style: normal;
  font-weight: 600;
}

nav#toc ol {
  list-style-type: none;
  padding: 0;
}

nav#toc li {
  margin-bottom: 0.6em;
}

nav#toc a {
  text-decoration: none;
  color: inherit;
}
''';
  }

  static String _buildTitlePageXhtml({required Novel novel, required BookFormatConfig config, required bool isRtl}) {
    final title = _escapeXml(novel.title);
    final subtitle = _escapeXml(config.subtitle);
    final author = _escapeXml(config.authorName.isNotEmpty ? config.authorName : 'Author');
    final publisher = _escapeXml(config.publisherName);

    return '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>$title</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="frontmatter titlepage">
  <section class="title-page">
    <h1>$title</h1>
    ${subtitle.isNotEmpty ? '<h2>$subtitle</h2>' : ''}
    <div class="author">$author</div>
    ${publisher.isNotEmpty ? '<div class="publisher">$publisher</div>' : ''}
  </section>
</body>
</html>''';
  }

  static String _buildCopyrightXhtml({required Novel novel, required BookFormatConfig config, required bool isRtl}) {
    final title = _escapeXml(novel.title);
    final author = _escapeXml(config.authorName.isNotEmpty ? config.authorName : 'Author');
    final year = _escapeXml(config.copyrightYear.isNotEmpty ? config.copyrightYear : DateTime.now().year.toString());
    final isbn = _escapeXml(config.isbn);
    final edition = _escapeXml(config.editionNotice);

    final copyrightNotice = isRtl ? 'حقوق النشر © $year لـ $author' : 'Copyright © $year by $author';
    final rightsNotice = isRtl
        ? 'جميع الحقوق محفوظة. لا يجوز إعادة إنتاج أي جزء من هذا الكتاب أو تخزينه أو نقله بأي شكل أو بأي وسيلة دون إذن كتابي مسبق من المؤلف.'
        : 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the author.';

    return '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${isRtl ? 'حقوق النشر' : 'Copyright'}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="frontmatter copyright-page">
  <section class="copyright-page">
    <p><strong>$title</strong></p>
    <p>$copyrightNotice</p>
    <p>$rightsNotice</p>
    ${edition.isNotEmpty ? '<p>$edition</p>' : ''}
    ${isbn.isNotEmpty ? '<p>ISBN: $isbn</p>' : ''}
  </section>
</body>
</html>''';
  }

  static String _buildDedicationXhtml({required BookFormatConfig config, required bool isRtl}) {
    final text = _escapeXml(config.dedicationText);
    return '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${isRtl ? 'الإهداء' : 'Dedication'}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="frontmatter dedication">
  <section class="dedication">
    <p>$text</p>
  </section>
</body>
</html>''';
  }

  static String _buildEpigraphXhtml({required BookFormatConfig config, required bool isRtl}) {
    final quote = _escapeXml(config.epigraphQuote);
    final author = _escapeXml(config.epigraphAuthor);
    return '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${isRtl ? 'الاقتباس' : 'Epigraph'}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="frontmatter epigraph">
  <section class="epigraph">
    <blockquote><p>“$quote”</p></blockquote>
    ${author.isNotEmpty ? '<div class="author">— $author</div>' : ''}
  </section>
</body>
</html>''';
  }

  static String _buildGenericSectionXhtml({
    required String title,
    required String bodyHtml,
    required BookFormatConfig config,
    required bool isRtl,
  }) {
    return '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${_escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body epub:type="bodymatter chapter">
  <section>
    <h1 class="chapter-title">${_escapeXml(title)}</h1>
    $bodyHtml
  </section>
</body>
</html>''';
  }

  static String _buildNavXhtml({required Novel novel, required List<Map<String, String>> tocItems, required bool isRtl}) {
    final sb = StringBuffer();
    sb.writeln('''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${isRtl ? 'فهرس المحتويات' : 'Table of Contents'}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${isRtl ? 'فهرس المحتويات' : 'Table of Contents'}</h1>
    <ol>''');

    for (final item in tocItems) {
      sb.writeln('      <li><a href="${item['href']}">${_escapeXml(item['title']!)}</a></li>');
    }

    sb.writeln('''    </ol>
  </nav>
</body>
</html>''');
    return sb.toString();
  }

  static String _buildTocNcx({required Novel novel, required List<Map<String, String>> tocItems}) {
    final sb = StringBuffer();
    sb.writeln('''<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:crysta-novel-${novel.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${_escapeXml(novel.title)}</text></docTitle>
  <navMap>''');

    for (int i = 0; i < tocItems.length; i++) {
      final item = tocItems[i];
      sb.writeln('''    <navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${_escapeXml(item['title']!)}</text></navLabel>
      <content src="${item['href']}"/>
    </navPoint>''');
    }

    sb.writeln('''  </navMap>
</ncx>''');
    return sb.toString();
  }

  static String _buildContentOpf({
    required Novel novel,
    required BookFormatConfig config,
    required List<String> manifestItems,
    required List<String> spineItems,
    required bool isRtl,
  }) {
    final author = config.authorName.isNotEmpty ? config.authorName : 'Author';
    final lang = isRtl ? 'ar' : 'en';
    final now = DateTime.now().toUtc().toIso8601String();

    return '''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" dir="${isRtl ? 'rtl' : 'ltr'}" xml:lang="$lang">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:crysta-novel-${novel.id}</dc:identifier>
    <dc:title>${_escapeXml(novel.title)}</dc:title>
    <dc:creator>${_escapeXml(author)}</dc:creator>
    <dc:language>$lang</dc:language>
    <meta property="dcterms:modified">$now</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx" ${isRtl ? 'page-progression-direction="rtl"' : ''}>
    ${spineItems.join('\n    ')}
  </spine>
</package>''';
  }

  static String _formatChapterHeading({required int index, required String title, required String style, required bool isRtl}) {
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

  static String _textToHtml(String text, {String? ornament, bool dropCap = false}) {
    if (text.isEmpty) return '<p></p>';

    // If it already has rich HTML paragraph tags
    if (text.contains('<p>') || text.contains('<div>')) {
      return text
          .replaceAll('<br>', '<br/>')
          .replaceAll('&nbsp;', '&#160;')
          .replaceAll(RegExp(r'<hr\s*/?>'), '<div class="scene-break">${_escapeXml(ornament ?? '* * *')}</div>');
    }

    final lines = text.split('\n');
    final sb = StringBuffer();
    bool isFirst = true;

    for (final rawLine in lines) {
      final line = rawLine.trim();
      if (line.isEmpty) continue;

      if (line == '***' || line == '* * *' || line == '---' || line == '###') {
        sb.writeln('<div class="scene-break">${_escapeXml(ornament ?? '* * *')}</div>');
        isFirst = true;
        continue;
      }

      if (isFirst) {
        if (dropCap && line.length > 1) {
          final firstLetter = line.substring(0, 1);
          final rest = line.substring(1);
          sb.writeln('<p class="first-paragraph"><span class="drop-cap">${_escapeXml(firstLetter)}</span>${_escapeXml(rest)}</p>');
        } else {
          sb.writeln('<p class="first-paragraph">${_escapeXml(line)}</p>');
        }
        isFirst = false;
      } else {
        sb.writeln('<p>${_escapeXml(line)}</p>');
      }
    }

    return sb.toString();
  }

  static String _wordNumber(int n) {
    const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
    if (n >= 1 && n <= words.length) return words[n - 1];
    return '$n';
  }

  static String _arabicWordNumber(int n) {
    const words = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
      'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون'];
    if (n >= 1 && n <= words.length) return words[n - 1];
    return '$n';
  }

  static String _escapeXml(String input) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
  }
}
