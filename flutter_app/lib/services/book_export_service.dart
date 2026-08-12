import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import '../models.dart';
import 'epub_builder.dart';
import 'docx_builder.dart';
import 'pdf_book_builder.dart';

class BookExportService {
  static Future<String?> exportEpub({
    required BuildContext context,
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) async {
    final bytes = EpubBuilder.buildEpub(
      novel: novel,
      chapters: chapters,
      config: config,
      isRtl: isRtl,
      cleanText: cleanText,
    );

    final defaultFileName = '${_sanitizeFileName(novel.title)}.epub';
    return _saveFile(
      bytes: bytes,
      defaultFileName: defaultFileName,
      allowedExtensions: ['epub'],
      dialogTitle: isRtl ? 'حفظ الكتاب بصيغة EPUB' : 'Save EPUB eBook',
    );
  }

  static Future<String?> exportPdf({
    required BuildContext context,
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) async {
    final bytes = await PdfBookBuilder.buildPdf(
      novel: novel,
      chapters: chapters,
      config: config,
      isRtl: isRtl,
      cleanText: cleanText,
    );

    final defaultFileName = '${_sanitizeFileName(novel.title)}.pdf';
    return _saveFile(
      bytes: bytes,
      defaultFileName: defaultFileName,
      allowedExtensions: ['pdf'],
      dialogTitle: isRtl ? 'حفظ الكتاب بصيغة PDF للطباعة' : 'Save Print-Ready PDF',
    );
  }

  static Future<String?> exportDocx({
    required BuildContext context,
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) async {
    final bytes = DocxBuilder.buildDocx(
      novel: novel,
      chapters: chapters,
      config: config,
      isRtl: isRtl,
      cleanText: cleanText,
    );

    final defaultFileName = '${_sanitizeFileName(novel.title)}.docx';
    return _saveFile(
      bytes: bytes,
      defaultFileName: defaultFileName,
      allowedExtensions: ['docx'],
      dialogTitle: isRtl ? 'حفظ المسودة بصيغة Word DOCX' : 'Save Word Manuscript (DOCX)',
    );
  }

  static Future<String?> exportMarkdown({
    required BuildContext context,
    required Novel novel,
    required List<Chapter> chapters,
    required BookFormatConfig config,
    required bool isRtl,
    String Function(String)? cleanText,
  }) async {
    final sb = StringBuffer();
    sb.writeln('# ${novel.title}\n');
    if (config.subtitle.isNotEmpty) sb.writeln('### ${config.subtitle}\n');
    if (config.authorName.isNotEmpty) sb.writeln('**Author**: ${config.authorName}\n');
    sb.writeln('---\n');

    for (int i = 0; i < chapters.length; i++) {
      final ch = chapters[i];
      sb.writeln('## ${ch.title}\n');
      final text = cleanText != null ? cleanText(ch.content) : ch.content;
      sb.writeln('$text\n\n---\n');
    }

    final bytes = Uint8List.fromList(sb.toString().codeUnits);
    final defaultFileName = '${_sanitizeFileName(novel.title)}.md';
    return _saveFile(
      bytes: bytes,
      defaultFileName: defaultFileName,
      allowedExtensions: ['md', 'txt'],
      dialogTitle: isRtl ? 'حفظ الرواية كملف نصي Markdown' : 'Save Novel Markdown',
    );
  }

  static Future<String?> _saveFile({
    required Uint8List bytes,
    required String defaultFileName,
    required List<String> allowedExtensions,
    required String dialogTitle,
  }) async {
    final result = await FilePicker.platform.saveFile(
      dialogTitle: dialogTitle,
      fileName: defaultFileName,
      type: FileType.custom,
      allowedExtensions: allowedExtensions,
    );

    if (result != null && result.isNotEmpty) {
      final file = File(result);
      await file.writeAsBytes(bytes);
      return result;
    }
    return null;
  }

  static String _sanitizeFileName(String title) {
    final clean = title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_').trim();
    return clean.isNotEmpty ? clean : 'novel';
  }
}
