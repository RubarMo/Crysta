import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/widgets.dart' show Matrix4;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../models.dart';

class PdfBookBuilder {
  static Future<pw.ThemeData> _loadTheme({required String fontFamily, required bool isRtl}) async {
    pw.Font? baseFont;
    pw.Font? boldFont;
    pw.Font? italicFont;
    pw.Font? boldItalicFont;
    final List<pw.Font> fallbacks = [];

    Future<pw.Font?> tryLoadFont(String assetPath, List<String> filePaths) async {
      try {
        final data = await rootBundle.load(assetPath);
        return pw.Font.ttf(data);
      } catch (_) {}

      for (final path in filePaths) {
        try {
          final f = File(path);
          if (f.existsSync()) {
            return pw.Font.ttf(ByteData.view(f.readAsBytesSync().buffer));
          }
        } catch (_) {}
      }
      return null;
    }

    String exeDir = '';
    try {
      exeDir = File(Platform.resolvedExecutable).parent.path;
    } catch (_) {}

    final amiriRegPaths = [
      'assets/fonts/Amiri-Regular.ttf',
      if (exeDir.isNotEmpty) '$exeDir/data/flutter_assets/assets/fonts/Amiri-Regular.ttf',
      'c:/Coding Projects/Crysta/flutter_app/assets/fonts/Amiri-Regular.ttf',
    ];
    final amiriBoldPaths = [
      'assets/fonts/Amiri-Bold.ttf',
      if (exeDir.isNotEmpty) '$exeDir/data/flutter_assets/assets/fonts/Amiri-Bold.ttf',
      'c:/Coding Projects/Crysta/flutter_app/assets/fonts/Amiri-Bold.ttf',
    ];
    final amiriItalicPaths = [
      'assets/fonts/Amiri-Italic.ttf',
      if (exeDir.isNotEmpty) '$exeDir/data/flutter_assets/assets/fonts/Amiri-Italic.ttf',
      'c:/Coding Projects/Crysta/flutter_app/assets/fonts/Amiri-Italic.ttf',
    ];
    final amiriBoldItalicPaths = [
      'assets/fonts/Amiri-BoldItalic.ttf',
      if (exeDir.isNotEmpty) '$exeDir/data/flutter_assets/assets/fonts/Amiri-BoldItalic.ttf',
      'c:/Coding Projects/Crysta/flutter_app/assets/fonts/Amiri-BoldItalic.ttf',
    ];

    baseFont = await tryLoadFont('assets/fonts/Amiri-Regular.ttf', amiriRegPaths);
    boldFont = await tryLoadFont('assets/fonts/Amiri-Bold.ttf', amiriBoldPaths);
    italicFont = await tryLoadFont('assets/fonts/Amiri-Italic.ttf', amiriItalicPaths);
    boldItalicFont = await tryLoadFont('assets/fonts/Amiri-BoldItalic.ttf', amiriBoldItalicPaths);

    // Fallback: Windows system fonts (Arial, Segoe UI, Tahoma)
    if (Platform.isWindows) {
      for (final sysFont in ['C:\\Windows\\Fonts\\arial.ttf', 'C:\\Windows\\Fonts\\segoeui.ttf', 'C:\\Windows\\Fonts\\tahoma.ttf']) {
        try {
          final f = File(sysFont);
          if (f.existsSync()) {
            final font = pw.Font.ttf(ByteData.view(f.readAsBytesSync().buffer));
            baseFont ??= font;
            fallbacks.add(font);
          }
        } catch (_) {}
      }
    }

    if (baseFont != null) {
      if (!fallbacks.contains(baseFont)) {
        fallbacks.insert(0, baseFont);
      }
      return pw.ThemeData.withFont(
        base: baseFont,
        bold: boldFont ?? baseFont,
        italic: italicFont ?? baseFont,
        boldItalic: boldItalicFont ?? boldFont ?? baseFont,
        fontFallback: fallbacks,
      );
    }

    return pw.ThemeData.base();
  }

  static PdfPageFormat getPageFormat(String trimSize, {bool? isOdd, bool isRtl = false}) {
    double width;
    double height;
    double marginTop;
    double marginBottom;
    double innerMargin; // Binding spine gutter
    double outerMargin; // Trim outer edge

    switch (trimSize) {
      case 'trade_5x8':
        width = 5.0 * PdfPageFormat.inch;
        height = 8.0 * PdfPageFormat.inch;
        marginTop = 0.6 * PdfPageFormat.inch;
        marginBottom = 0.6 * PdfPageFormat.inch;
        innerMargin = 0.75 * PdfPageFormat.inch;
        outerMargin = 0.45 * PdfPageFormat.inch;
        break;
      case 'standard_55x85':
        width = 5.5 * PdfPageFormat.inch;
        height = 8.5 * PdfPageFormat.inch;
        marginTop = 0.65 * PdfPageFormat.inch;
        marginBottom = 0.65 * PdfPageFormat.inch;
        innerMargin = 0.8 * PdfPageFormat.inch;
        outerMargin = 0.5 * PdfPageFormat.inch;
        break;
      case 'mass_market_425x687':
        width = 4.25 * PdfPageFormat.inch;
        height = 6.87 * PdfPageFormat.inch;
        marginTop = 0.5 * PdfPageFormat.inch;
        marginBottom = 0.5 * PdfPageFormat.inch;
        innerMargin = 0.65 * PdfPageFormat.inch;
        outerMargin = 0.4 * PdfPageFormat.inch;
        break;
      case 'large_85x11':
        width = 8.5 * PdfPageFormat.inch;
        height = 11.0 * PdfPageFormat.inch;
        marginTop = 0.8 * PdfPageFormat.inch;
        marginBottom = 0.8 * PdfPageFormat.inch;
        innerMargin = 0.9 * PdfPageFormat.inch;
        outerMargin = 0.6 * PdfPageFormat.inch;
        break;
      case 'us_trade_6x9':
      default:
        width = 6.0 * PdfPageFormat.inch;
        height = 9.0 * PdfPageFormat.inch;
        marginTop = 0.7 * PdfPageFormat.inch;
        marginBottom = 0.7 * PdfPageFormat.inch;
        innerMargin = 0.85 * PdfPageFormat.inch;
        outerMargin = 0.55 * PdfPageFormat.inch;
        break;
    }

    double marginLeft;
    double marginRight;

    if (isOdd == null) {
      marginLeft = (innerMargin + outerMargin) / 2;
      marginRight = (innerMargin + outerMargin) / 2;
    } else if (isRtl) {
      // Arabic RTL:
      // Odd pages (Recto / right page): spine is on the RIGHT -> wider right margin
      // Even pages (Verso / left page): spine is on the LEFT -> wider left margin
      if (isOdd) {
        marginRight = innerMargin;
        marginLeft = outerMargin;
      } else {
        marginLeft = innerMargin;
        marginRight = outerMargin;
      }
    } else {
      // English LTR:
      // Odd pages (Recto / right page): spine is on the LEFT -> wider left margin
      // Even pages (Verso / left page): spine is on the RIGHT -> wider right margin
      if (isOdd) {
        marginLeft = innerMargin;
        marginRight = outerMargin;
      } else {
        marginRight = innerMargin;
        marginLeft = outerMargin;
      }
    }

    return PdfPageFormat(
      width,
      height,
      marginTop: marginTop,
      marginBottom: marginBottom,
      marginLeft: marginLeft,
      marginRight: marginRight,
    );
  }

  static Future<Uint8List> buildPdf({
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) async {
    final theme = await _loadTheme(fontFamily: config.fontFamily, isRtl: isRtl);
    final pdf = pw.Document(theme: theme);
    final textDirection = isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr;

    // Title Page (Page 1 - Odd)
    if (config.hasTitlePage) {
      pdf.addPage(
        pw.Page(
          pageFormat: getPageFormat(config.trimSize, isOdd: true, isRtl: isRtl),
          textDirection: textDirection,
          build: (context) {
            return pw.Center(
              child: pw.Column(
                mainAxisAlignment: pw.MainAxisAlignment.center,
                crossAxisAlignment: pw.CrossAxisAlignment.center,
                children: [
                  pw.SizedBox(height: 60),
                  pw.Text(
                    novel.title,
                    textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
                  ),
                  if (config.subtitle.isNotEmpty) ...[
                    pw.SizedBox(height: 12),
                    pw.Text(
                      config.subtitle,
                      textAlign: pw.TextAlign.center,
                      style: const pw.TextStyle(fontSize: 14, color: PdfColors.grey700),
                    ),
                  ],
                  pw.Spacer(),
                  pw.Text(
                    config.authorName.isNotEmpty ? config.authorName : 'Author',
                    textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
                  ),
                  if (config.publisherName.isNotEmpty) ...[
                    pw.SizedBox(height: 16),
                    pw.Text(
                      config.publisherName,
                      textAlign: pw.TextAlign.center,
                      style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey600),
                    ),
                  ],
                  pw.SizedBox(height: 40),
                ],
              ),
            );
          },
        ),
      );
    }

    // Copyright Page (Page 2 - Even)
    if (config.hasCopyrightPage) {
      final author = config.authorName.isNotEmpty ? config.authorName : (isRtl ? 'المؤلف' : 'Author');
      final year = config.copyrightYear.isNotEmpty ? config.copyrightYear : DateTime.now().year.toString();
      final copyrightNotice = isRtl
          ? 'حقوق الطبع والنشر © $year محفوظة لـ $author'
          : 'Copyright © $year by $author';
      final rightsDisclaimer = isRtl
          ? 'جميع الحقوق محفوظة. لا يجوز إعادة إنتاج أي جزء من هذا الكتاب أو تخزينه أو نقله بأي شكل أو بأي وسيلة دون إذن كتابي مسبق من المؤلف.'
          : 'All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form without prior written permission.';
      final editionNotice = (isRtl && config.editionNotice == 'First Edition')
          ? 'الطبعة الأولى'
          : config.editionNotice;

      pdf.addPage(
        pw.Page(
          pageFormat: getPageFormat(config.trimSize, isOdd: false, isRtl: isRtl),
          textDirection: textDirection,
          build: (context) {
            return pw.Align(
              alignment: isRtl ? pw.Alignment.bottomRight : pw.Alignment.bottomLeft,
              child: pw.Container(
                width: double.infinity,
                child: pw.Column(
                  mainAxisAlignment: pw.MainAxisAlignment.end,
                  crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                  children: [
                    pw.Text(
                      novel.title,
                      textDirection: textDirection,
                      textAlign: isRtl ? pw.TextAlign.right : pw.TextAlign.left,
                      style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
                    ),
                    pw.SizedBox(height: 6),
                    pw.Text(
                      copyrightNotice,
                      textDirection: textDirection,
                      textAlign: isRtl ? pw.TextAlign.right : pw.TextAlign.left,
                      style: const pw.TextStyle(fontSize: 9),
                    ),
                    pw.SizedBox(height: 6),
                    pw.Text(
                      rightsDisclaimer,
                      textDirection: textDirection,
                      textAlign: isRtl ? pw.TextAlign.right : pw.TextAlign.left,
                      style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
                    ),
                    if (editionNotice.isNotEmpty) ...[
                      pw.SizedBox(height: 6),
                      pw.Text(
                        editionNotice,
                        textDirection: textDirection,
                        textAlign: isRtl ? pw.TextAlign.right : pw.TextAlign.left,
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                    if (config.isbn.isNotEmpty) ...[
                      pw.SizedBox(height: 6),
                      pw.Text(
                        isRtl ? 'ردمك: ${config.isbn}' : 'ISBN: ${config.isbn}',
                        textDirection: textDirection,
                        textAlign: isRtl ? pw.TextAlign.right : pw.TextAlign.left,
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                    pw.SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        ),
      );
    }

    // Dedication (Odd)
    if (config.hasDedication && config.dedicationText.trim().isNotEmpty) {
      pdf.addPage(
        pw.Page(
          pageFormat: getPageFormat(config.trimSize, isOdd: true, isRtl: isRtl),
          textDirection: textDirection,
          build: (context) {
            return pw.Center(
              child: pw.Text(
                config.dedicationText,
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(fontSize: 12, fontStyle: pw.FontStyle.italic),
              ),
            );
          },
        ),
      );
    }

    // Epigraph (Even)
    if (config.hasEpigraph && config.epigraphQuote.trim().isNotEmpty) {
      pdf.addPage(
        pw.Page(
          pageFormat: getPageFormat(config.trimSize, isOdd: false, isRtl: isRtl),
          textDirection: textDirection,
          build: (context) {
            return pw.Center(
              child: pw.Column(
                mainAxisSize: pw.MainAxisSize.min,
                children: [
                  pw.Text(
                    '“${config.epigraphQuote}”',
                    textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(fontSize: 12, fontStyle: pw.FontStyle.italic),
                  ),
                  if (config.epigraphAuthor.isNotEmpty) ...[
                    pw.SizedBox(height: 10),
                    pw.Text(
                      '— ${config.epigraphAuthor}',
                      style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      );
    }

    // Foreword
    if (config.hasForeword && config.forewordContent.trim().isNotEmpty) {
      final title = config.forewordTitle.isNotEmpty ? config.forewordTitle : (isRtl ? 'تصدير' : 'Foreword');
      _addMultiPageSection(
        pdf: pdf,
        trimSize: config.trimSize,
        title: title,
        content: config.forewordContent,
        config: config,
        isRtl: isRtl,
        cleanText: cleanText,
      );
    }

    // Body Chapters
    for (int i = 0; i < chapters.length; i++) {
      final ch = chapters[i];
      final chapterHeading = _formatChapterHeading(
        index: i + 1,
        title: ch.title,
        style: config.chapterNumberingStyle,
        isRtl: isRtl,
      );

      _addMultiPageSection(
        pdf: pdf,
        trimSize: config.trimSize,
        title: chapterHeading,
        content: ch.content,
        config: config,
        isRtl: isRtl,
        novelTitle: novel.title,
        cleanText: cleanText,
      );
    }

    // Epilogue
    if (config.hasEpilogue && config.epilogueContent.trim().isNotEmpty) {
      final title = config.epilogueTitle.isNotEmpty ? config.epilogueTitle : (isRtl ? 'خاتمة' : 'Epilogue');
      _addMultiPageSection(
        pdf: pdf,
        trimSize: config.trimSize,
        title: title,
        content: config.epilogueContent,
        config: config,
        isRtl: isRtl,
        cleanText: cleanText,
      );
    }

    // Acknowledgments
    if (config.hasAcknowledgments && config.acknowledgmentsContent.trim().isNotEmpty) {
      final title = isRtl ? 'شكر وتقدير' : 'Acknowledgments';
      _addMultiPageSection(
        pdf: pdf,
        trimSize: config.trimSize,
        title: title,
        content: config.acknowledgmentsContent,
        config: config,
        isRtl: isRtl,
        cleanText: cleanText,
      );
    }

    // About Author
    if (config.hasAboutAuthor && config.aboutAuthorBio.trim().isNotEmpty) {
      final title = isRtl ? 'عن المؤلف' : 'About the Author';
      _addMultiPageSection(
        pdf: pdf,
        trimSize: config.trimSize,
        title: title,
        content: config.aboutAuthorBio,
        config: config,
        isRtl: isRtl,
        cleanText: cleanText,
      );
    }

    final margins = getMargins(config.trimSize);
    final delta = margins.innerMargin - margins.outerMargin;

    // Apply alternating binding gutter shift across all generated pages:
    // Base layout was laid out with Left = outerMargin, Right = innerMargin.
    // Arabic RTL:
    // - Odd pages (1, 3, 5...): Right margin is innerMargin (wider), Left is outerMargin -> shift = 0.
    // - Even pages (2, 4, 6...): Left margin is innerMargin (wider), Right is outerMargin -> shift = +delta.
    // English LTR:
    // - Odd pages (1, 3, 5...): Left margin is innerMargin (wider), Right is outerMargin -> shift = +delta.
    // - Even pages (2, 4, 6...): Right margin is innerMargin (wider), Left is outerMargin -> shift = 0.
    final pages = pdf.document.pdfPageList.pages;
    for (int i = 0; i < pages.length; i++) {
      final pageNumber = i + 1;
      final isEven = pageNumber % 2 == 0;
      final shift = isRtl
          ? (isEven ? delta : 0.0)
          : (isEven ? 0.0 : delta);

      if (shift.abs() > 0.001) {
        final g = pages[i].getGraphics();
        g.setTransform(Matrix4.translationValues(shift, 0.0, 0.0));
        final shiftStream = pages[i].contents.removeLast();
        pages[i].contents.insert(0, shiftStream);
      }
    }

    return pdf.save();
  }

  static ({double innerMargin, double outerMargin}) getMargins(String trimSize) {
    switch (trimSize) {
      case 'trade_5x8':
        return (innerMargin: 0.75 * PdfPageFormat.inch, outerMargin: 0.45 * PdfPageFormat.inch);
      case 'standard_55x85':
        return (innerMargin: 0.8 * PdfPageFormat.inch, outerMargin: 0.5 * PdfPageFormat.inch);
      case 'mass_market_425x687':
        return (innerMargin: 0.65 * PdfPageFormat.inch, outerMargin: 0.4 * PdfPageFormat.inch);
      case 'large_85x11':
        return (innerMargin: 0.9 * PdfPageFormat.inch, outerMargin: 0.6 * PdfPageFormat.inch);
      case 'us_trade_6x9':
      default:
        return (innerMargin: 0.85 * PdfPageFormat.inch, outerMargin: 0.55 * PdfPageFormat.inch);
    }
  }

  static void _addMultiPageSection({
    required pw.Document pdf,
    required String trimSize,
    required String title,
    required String content,
    required BookFormatConfig config,
    required bool isRtl,
    String? novelTitle,
    String Function(String)? cleanText,
  }) {
    final pageFormat = getPageFormat(trimSize, isOdd: true, isRtl: isRtl);
    final rawText = cleanText != null ? cleanText(content) : content;
    final lines = rawText.split('\n');
    final widgets = <pw.Widget>[];

    // Chapter Header
    widgets.add(
      pw.Header(
        level: 1,
        child: pw.Center(
          child: pw.Text(
            title,
            textAlign: pw.TextAlign.center,
            style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
          ),
        ),
        margin: const pw.EdgeInsets.only(top: 24, bottom: 20),
      ),
    );

    bool isFirst = true;
    for (final rawLine in lines) {
      final line = rawLine.trim();
      if (line.isEmpty) continue;

      if (line == '***' || line == '* * *' || line == '---' || line == '###') {
        widgets.add(
          pw.Paragraph(
            text: config.sceneBreakOrnament,
            textAlign: pw.TextAlign.center,
            style: const pw.TextStyle(fontSize: 11, letterSpacing: 3),
            margin: const pw.EdgeInsets.symmetric(vertical: 14),
          ),
        );
        isFirst = true;
        continue;
      }

      final indent = (config.firstLineIndent && !isFirst) ? 14.0 : 0.0;

      widgets.add(
        pw.Paragraph(
          text: (isRtl || indent == 0) ? line : '   $line',
          textAlign: pw.TextAlign.justify,
          style: pw.TextStyle(
            fontSize: config.fontSize,
            lineSpacing: config.lineSpacing,
          ),
          margin: pw.EdgeInsets.only(
            bottom: config.firstLineIndent ? 2 : 8,
          ),
        ),
      );
      isFirst = false;
    }

    pdf.addPage(
      pw.MultiPage(
        pageFormat: pageFormat,
        textDirection: isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr,
        header: (context) {
          if (context.pageNumber == 1) return pw.SizedBox.shrink();
          final isEven = context.pageNumber % 2 == 0;
          final headerText = isEven ? (novelTitle ?? '') : title;
          final headerAlign = isEven
              ? (isRtl ? pw.Alignment.centerRight : pw.Alignment.centerLeft)
              : (isRtl ? pw.Alignment.centerLeft : pw.Alignment.centerRight);
          return pw.Container(
            alignment: headerAlign,
            margin: const pw.EdgeInsets.only(bottom: 12),
            child: pw.Text(
              headerText,
              textDirection: isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr,
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
            ),
          );
        },
        footer: (context) {
          if (!config.includePageNumbers) return pw.SizedBox.shrink();
          return pw.Container(
            alignment: pw.Alignment.center,
            margin: const pw.EdgeInsets.only(top: 12),
            child: pw.Text(
              '${context.pageNumber}',
              style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800),
            ),
          );
        },
        build: (context) => widgets,
      ),
    );
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
}
