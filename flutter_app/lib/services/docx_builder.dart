import 'dart:convert';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import '../models.dart';

class DocxBuilder {
  static Uint8List buildDocx({
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) {
    final archive = Archive();

    // 1. [Content_Types].xml
    final contentTypes = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>''';
    _addTextFile(archive, '[Content_Types].xml', contentTypes);

    // 2. _rels/.rels
    final rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>''';
    _addTextFile(archive, '_rels/.rels', rels);

    // 3. word/_rels/document.xml.rels
    final docRels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>''';
    _addTextFile(archive, 'word/_rels/document.xml.rels', docRels);

    // 4. word/styles.xml
    final styles = _buildStylesXml(fontFamily: config.fontFamily);
    _addTextFile(archive, 'word/styles.xml', styles);

    // 5. word/document.xml
    final docXml = _buildDocumentXml(
      novel: novel,
      chapters: chapters,
      config: config,
      isRtl: isRtl,
      cleanText: cleanText,
    );
    _addTextFile(archive, 'word/document.xml', docXml);

    final zipEncoder = ZipEncoder();
    final bytes = zipEncoder.encode(archive);
    return Uint8List.fromList(bytes!);
  }

  static void _addTextFile(Archive archive, String path, String content) {
    final bytes = utf8.encode(content);
    archive.addFile(ArchiveFile(path, bytes.length, bytes));
  }

  static String _buildStylesXml({required String fontFamily}) {
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="$fontFamily" w:hAnsi="$fontFamily" w:cs="$fontFamily"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="en-US" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="720" w:after="360"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="480" w:after="240"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
</w:styles>''';
  }

  static String _buildDocumentXml({
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) {
    final sb = StringBuffer();
    sb.writeln('''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>''');

    // Title Page
    if (config.hasTitlePage) {
      sb.writeln(_paragraph(text: novel.title, style: 'Heading1', isRtl: isRtl, center: true, sizeHalfPoints: 48, bold: true));
      if (config.subtitle.isNotEmpty) {
        sb.writeln(_paragraph(text: config.subtitle, isRtl: isRtl, center: true, sizeHalfPoints: 28));
      }
      final author = config.authorName.isNotEmpty ? config.authorName : 'Author';
      sb.writeln(_paragraph(text: '\n\n$author', isRtl: isRtl, center: true, sizeHalfPoints: 32, bold: true));
      if (config.publisherName.isNotEmpty) {
        sb.writeln(_paragraph(text: '\n${config.publisherName}', isRtl: isRtl, center: true, sizeHalfPoints: 24));
      }
      sb.writeln(_pageBreak());
    }

    // Copyright Page
    if (config.hasCopyrightPage) {
      final author = config.authorName.isNotEmpty ? config.authorName : (isRtl ? 'المؤلف' : 'Author');
      final year = config.copyrightYear.isNotEmpty ? config.copyrightYear : DateTime.now().year.toString();
      sb.writeln(_paragraph(text: novel.title, bold: true, isRtl: isRtl));
      sb.writeln(_paragraph(text: isRtl ? 'حقوق النشر © $year لـ $author' : 'Copyright © $year by $author', isRtl: isRtl));
      sb.writeln(_paragraph(
        text: isRtl
            ? 'جميع الحقوق محفوظة. لا يجوز إعادة إنتاج أي جزء من هذا الكتاب أو تخزينه أو نقله بأي شكل أو بأي وسيلة دون إذن كتابي مسبق من المؤلف.'
            : 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form without prior written permission.',
        isRtl: isRtl,
      ));
      if (config.editionNotice.isNotEmpty) sb.writeln(_paragraph(text: config.editionNotice, isRtl: isRtl));
      if (config.isbn.isNotEmpty) sb.writeln(_paragraph(text: 'ISBN: ${config.isbn}', isRtl: isRtl));
      sb.writeln(_pageBreak());
    }

    // Dedication
    if (config.hasDedication && config.dedicationText.trim().isNotEmpty) {
      sb.writeln(_paragraph(text: config.dedicationText, italic: true, center: true, isRtl: isRtl));
      sb.writeln(_pageBreak());
    }

    // Epigraph
    if (config.hasEpigraph && config.epigraphQuote.trim().isNotEmpty) {
      sb.writeln(_paragraph(text: '“${config.epigraphQuote}”', italic: true, center: true, isRtl: isRtl));
      if (config.epigraphAuthor.isNotEmpty) {
        sb.writeln(_paragraph(text: '— ${config.epigraphAuthor}', center: true, isRtl: isRtl, bold: true));
      }
      sb.writeln(_pageBreak());
    }

    // Foreword
    if (config.hasForeword && config.forewordContent.trim().isNotEmpty) {
      final title = config.forewordTitle.isNotEmpty ? config.forewordTitle : (isRtl ? 'تصدير' : 'Foreword');
      sb.writeln(_paragraph(text: title, style: 'Heading1', center: true, isRtl: isRtl));
      _appendBodyText(sb, config.forewordContent, config: config, isRtl: isRtl, cleanText: cleanText);
      sb.writeln(_pageBreak());
    }

    // Chapters
    for (int i = 0; i < chapters.length; i++) {
      final ch = chapters[i];
      final chapterHeading = _formatChapterHeading(index: i + 1, title: ch.title, style: config.chapterNumberingStyle, isRtl: isRtl);
      sb.writeln(_paragraph(text: chapterHeading, style: 'Heading1', center: true, isRtl: isRtl));
      _appendBodyText(sb, ch.content, config: config, isRtl: isRtl, cleanText: cleanText);
      if (i < chapters.length - 1 || config.hasEpilogue || config.hasAcknowledgments || config.hasAboutAuthor) {
        sb.writeln(_pageBreak());
      }
    }

    // Epilogue
    if (config.hasEpilogue && config.epilogueContent.trim().isNotEmpty) {
      final title = config.epilogueTitle.isNotEmpty ? config.epilogueTitle : (isRtl ? 'خاتمة' : 'Epilogue');
      sb.writeln(_pageBreak());
      sb.writeln(_paragraph(text: title, style: 'Heading1', center: true, isRtl: isRtl));
      _appendBodyText(sb, config.epilogueContent, config: config, isRtl: isRtl, cleanText: cleanText);
    }

    // Acknowledgments
    if (config.hasAcknowledgments && config.acknowledgmentsContent.trim().isNotEmpty) {
      sb.writeln(_pageBreak());
      sb.writeln(_paragraph(text: isRtl ? 'شكر وتقدير' : 'Acknowledgments', style: 'Heading1', center: true, isRtl: isRtl));
      _appendBodyText(sb, config.acknowledgmentsContent, config: config, isRtl: isRtl, cleanText: cleanText);
    }

    // About Author
    if (config.hasAboutAuthor && config.aboutAuthorBio.trim().isNotEmpty) {
      sb.writeln(_pageBreak());
      sb.writeln(_paragraph(text: isRtl ? 'عن المؤلف' : 'About the Author', style: 'Heading1', center: true, isRtl: isRtl));
      _appendBodyText(sb, config.aboutAuthorBio, config: config, isRtl: isRtl, cleanText: cleanText);
    }

    sb.writeln('''  </w:body>
</w:document>''');
    return sb.toString();
  }

  static void _appendBodyText(
    StringBuffer sb,
    String content, {
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) {
    final raw = cleanText != null ? cleanText(content) : content;
    final lines = raw.split('\n');
    bool isFirst = true;

    for (final rawLine in lines) {
      final line = rawLine.trim();
      if (line.isEmpty) continue;

      if (line == '***' || line == '* * *' || line == '---' || line == '###') {
        sb.writeln(_paragraph(text: config.sceneBreakOrnament, center: true, isRtl: isRtl));
        isFirst = true;
        continue;
      }

      final indentDxa = (config.firstLineIndent && !isFirst) ? 360 : 0; // 0.25" = 360 dxa
      sb.writeln(_paragraph(text: line, isRtl: isRtl, firstLineIndentDxa: indentDxa));
      isFirst = false;
    }
  }

  static String _paragraph({
    required String text,
    String? style,
    bool isRtl = false,
    bool center = false,
    bool bold = false,
    bool italic = false,
    int? sizeHalfPoints,
    int firstLineIndentDxa = 0,
  }) {
    final escaped = _escapeXml(text);
    final jc = center ? 'center' : (isRtl ? 'right' : 'both');
    final pPr = StringBuffer('<w:pPr>');
    if (style != null) pPr.write('<w:pStyle w:val="$style"/>');
    pPr.write('<w:jc w:val="$jc"/>');
    if (isRtl) pPr.write('<w:bidi/>');
    if (firstLineIndentDxa > 0) pPr.write('<w:ind w:firstLine="$firstLineIndentDxa"/>');
    pPr.write('</w:pPr>');

    final rPr = StringBuffer('<w:rPr>');
    if (bold) rPr.write('<w:b/><w:bCs/>');
    if (italic) rPr.write('<w:i/><w:iCs/>');
    if (sizeHalfPoints != null) rPr.write('<w:sz w:val="$sizeHalfPoints"/><w:szCs w:val="$sizeHalfPoints"/>');
    if (isRtl) rPr.write('<w:rtl/>');
    rPr.write('</w:rPr>');

    return '<w:p>$pPr<w:r>$rPr<w:t xml:space="preserve">$escaped</w:t></w:r></w:p>';
  }

  static String _pageBreak() {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
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
