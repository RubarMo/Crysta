import JSZip from 'jszip';
import { Novel, Chapter, BookFormatConfig } from '../lib';

export class BookExportService {
  /**
   * Generates and downloads an EPUB 3 archive with full RTL metadata and optional cover image.
   */
  static async exportEpub(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true,
    coverImageDataUrl?: string | null
  ): Promise<void> {
    const zip = new JSZip();

    // 1. mimetype (Must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    zip.file('META-INF/container.xml', containerXml);

    const manifestItems: string[] = [
      '<item id="css" href="styles.css" media-type="text/css"/>',
      '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    ];
    const spineItems: string[] = [];
    const tocItems: { title: string; href: string }[] = [];

    // Cover Image processing if available
    if (coverImageDataUrl && coverImageDataUrl.startsWith('data:image/')) {
      const match = coverImageDataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        const rawExt = match[1].toLowerCase();
        const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
        const mime = `image/${match[1]}`;
        const base64Data = match[2];
        zip.file(`OEBPS/cover.${ext}`, base64Data, { base64: true });
        zip.file(
          'OEBPS/cover.xhtml',
          `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <title>${escapeXml(novel.title)}</title>
  <style>body { margin: 0; padding: 0; text-align: center; background-color: #000; } img { max-width: 100%; max-height: 100vh; height: auto; object-fit: contain; }</style>
</head>
<body>
  <img src="cover.${ext}" alt="Cover"/>
</body>
</html>`
        );
        manifestItems.unshift(`<item id="cover-image" href="cover.${ext}" media-type="${mime}" properties="cover-image"/>`);
        manifestItems.unshift('<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>');
        spineItems.unshift('<itemref idref="cover-page"/>');
      }
    }

    // 3. CSS Stylesheet
    const css = `
@charset "utf-8";
body {
  font-family: ${config.font_family || 'sans-serif'}, serif;
  font-size: ${config.font_size || 11}pt;
  line-height: ${config.line_spacing || 1.45};
  direction: ${isRtl ? 'rtl' : 'ltr'};
  text-align: justify;
  margin: 5%;
}
h1, h2, h3 {
  text-align: center;
  font-weight: bold;
  margin-top: 1.5em;
  margin-bottom: 0.8em;
}
p {
  margin: 0 0 0.5em 0;
  text-indent: ${config.first_line_indent ? '1.5em' : '0'};
}
.first-paragraph {
  text-indent: 0;
}
.title-page {
  text-align: center;
  margin-top: 25%;
}
.title-page h1 {
  font-size: 2.2em;
  margin-bottom: 0.2em;
}
.title-page .subtitle {
  font-size: 1.3em;
  color: #555;
  margin-bottom: 2em;
}
.title-page .author {
  font-size: 1.4em;
  font-weight: bold;
}
.copyright-page {
  font-size: 0.85em;
  margin-top: 40%;
  text-align: center;
  line-height: 1.6;
}
.dedication {
  text-align: center;
  font-style: italic;
  margin-top: 30%;
}
.scene-break {
  text-align: center;
  margin: 1.5em 0;
  font-weight: bold;
}
`;
    zip.file('OEBPS/styles.css', css);

    // Helper to add XHTML section
    const addXhtml = (id: string, filename: string, title: string, bodyContent: string) => {
      const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
      zip.file(`OEBPS/${filename}`, xhtml);
      manifestItems.push(`<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${id}"/>`);
      tocItems.push({ title, href: filename });
    };

    // Front Matter: Title Page
    if (config.has_title_page) {
      const content = `
<div class="title-page">
  <h1>${escapeXml(novel.title)}</h1>
  ${config.subtitle ? `<p class="subtitle">${escapeXml(config.subtitle)}</p>` : ''}
  <p class="author">${escapeXml(config.author_name || 'Author')}</p>
  ${config.publisher_name ? `<p class="publisher" style="margin-top: 3em; font-size: 0.9em;">${escapeXml(config.publisher_name)}</p>` : ''}
</div>`;
      addXhtml('titlepage', 'titlepage.xhtml', isRtl ? 'صفحة العنوان' : 'Title Page', content);
    }

    // Front Matter: Copyright
    if (config.has_copyright_page) {
      const content = `
<div class="copyright-page">
  <p><strong>${escapeXml(novel.title)}</strong></p>
  ${config.subtitle ? `<p>${escapeXml(config.subtitle)}</p>` : ''}
  <p>© ${escapeXml(config.copyright_year || '2026')} ${escapeXml(config.author_name || '')}</p>
  ${config.edition_notice ? `<p>${escapeXml(config.edition_notice)}</p>` : ''}
  ${config.isbn ? `<p>ISBN: ${escapeXml(config.isbn)}</p>` : ''}
  ${config.publisher_name ? `<p>${escapeXml(config.publisher_name)}</p>` : ''}
  <p style="margin-top: 2em; font-size: 0.9em;">${isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
</div>`;
      addXhtml('copyright', 'copyright.xhtml', isRtl ? 'حقوق النشر' : 'Copyright', content);
    }

    // Front Matter: Dedication
    if (config.has_dedication && config.dedication_text) {
      const content = `
<div class="dedication">
  ${config.dedication_text
    .split('\n')
    .map((l) => `<p>${escapeXml(l)}</p>`)
    .join('\n')}
</div>`;
      addXhtml('dedication', 'dedication.xhtml', isRtl ? 'إهداء' : 'Dedication', content);
    }

    // Front Matter: Epigraph
    if (config.has_epigraph && config.epigraph_quote) {
      const content = `
<div class="dedication">
  <p style="font-size: 1.1em; font-style: italic;">«${escapeXml(config.epigraph_quote)}»</p>
  ${config.epigraph_author ? `<p style="margin-top: 1.5em; font-style: normal; font-weight: bold;">— ${escapeXml(config.epigraph_author)}</p>` : ''}
</div>`;
      addXhtml('epigraph', 'epigraph.xhtml', isRtl ? 'تصدير' : 'Epigraph', content);
    }

    // Front Matter: Foreword
    if (config.has_foreword && config.foreword_content) {
      const content = `
<h2>${escapeXml(config.foreword_title || (isRtl ? 'مقدمة' : 'Foreword'))}</h2>
${config.foreword_content
  .split('\n\n')
  .map((p) => `<p>${escapeXml(p)}</p>`)
  .join('\n')}`;
      addXhtml('foreword', 'foreword.xhtml', config.foreword_title || 'Foreword', content);
    }

    // Chapters
    chapters.forEach((chapter, index) => {
      const chTitle = chapter.title || `${isRtl ? 'الفصل' : 'Chapter'} ${index + 1}`;
      const paras = chapter.content
        .split('\n\n')
        .map((p, idx) => {
          if (p.trim() === '* * *' || p.trim() === config.scene_break_ornament) {
            return `<p class="scene-break">${escapeXml(config.scene_break_ornament || '* * *')}</p>`;
          }
          const cls = idx === 0 ? 'class="first-paragraph"' : '';
          return `<p ${cls}>${escapeXml(p)}</p>`;
        })
        .join('\n');

      const content = `
<h2>${escapeXml(chTitle)}</h2>
${paras}`;
      addXhtml(`chapter_${index + 1}`, `chapter_${index + 1}.xhtml`, chTitle, content);
    });

    // Back Matter: Epilogue
    if (config.has_epilogue && config.epilogue_content) {
      const content = `
<h2>${escapeXml(config.epilogue_title || (isRtl ? 'خاتمة' : 'Epilogue'))}</h2>
${config.epilogue_content
  .split('\n\n')
  .map((p) => `<p>${escapeXml(p)}</p>`)
  .join('\n')}`;
      addXhtml('epilogue', 'epilogue.xhtml', config.epilogue_title || 'Epilogue', content);
    }

    // Back Matter: Acknowledgments
    if (config.has_acknowledgments && config.acknowledgments_content) {
      const content = `
<h2>${isRtl ? 'شكر وتقدير' : 'Acknowledgments'}</h2>
${config.acknowledgments_content
  .split('\n\n')
  .map((p) => `<p>${escapeXml(p)}</p>`)
  .join('\n')}`;
      addXhtml('acknowledgments', 'acknowledgments.xhtml', isRtl ? 'شكر وتقدير' : 'Acknowledgments', content);
    }

    // Back Matter: About Author
    if (config.has_about_author && config.about_author_bio) {
      const content = `
<h2>${isRtl ? 'عن المؤلف' : 'About the Author'}</h2>
<p>${escapeXml(config.about_author_bio)}</p>`;
      addXhtml('about_author', 'about_author.xhtml', isRtl ? 'عن المؤلف' : 'About the Author', content);
    }

    // 4. Navigation Document (toc.xhtml)
    const tocNav = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <title>${escapeXml(novel.title)} - Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${isRtl ? 'فهرس المحتويات' : 'Table of Contents'}</h1>
    <ol>
      ${tocItems.map((item) => `<li><a href="${item.href}">${escapeXml(item.title)}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
    zip.file('OEBPS/toc.xhtml', tocNav);

    // 5. Package Document (content.opf)
    const bookId = generateUuid();
    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" dir="${isRtl ? 'rtl' : 'ltr'}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${bookId}</dc:identifier>
    <dc:title>${escapeXml(novel.title)}</dc:title>
    <dc:language>${isRtl ? 'ar' : 'en'}</dc:language>
    <dc:creator>${escapeXml(config.author_name || 'Author')}</dc:creator>
    <dc:publisher>${escapeXml(config.publisher_name || 'Crysta')}</dc:publisher>
    <dc:date>${new Date().toISOString()}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\\.[0-9]+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine page-progression-direction="${isRtl ? 'rtl' : 'ltr'}">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
    zip.file('OEBPS/content.opf', opf);

    // Generate and trigger download
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    downloadBlob(blob, `${sanitizeFilename(novel.title)}.epub`);
  }

  /**
   * Generates and downloads a clean Word Manuscript (.docx) file.
   */
  static async exportDocx(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): Promise<void> {
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    const docParagraphs: string[] = [];

    const addParagraph = (text: string, isFirst = false) => {
      docParagraphs.push(`
<w:p>
  <w:pPr>
    <w:bidi w:val="${isRtl ? '1' : '0'}"/>
    <w:jc w:val="both"/>
    <w:spacing w:line="360" w:lineRule="auto" w:after="120"/>
    ${isFirst || !config.first_line_indent ? '' : '<w:ind w:firstLine="720"/>'}
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="${config.font_family || 'Arial'}" w:hAnsi="${config.font_family || 'Arial'}" w:cs="${config.font_family || 'Arial'}"/>
      <w:sz w:val="${Math.round((config.font_size || 12) * 2)}"/>
    </w:rPr>
    <w:t xml:space="preserve">${escapeXml(text)}</w:t>
  </w:r>
</w:p>`);
    };

    const addHeading = (text: string) => {
      docParagraphs.push(`
<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="480" w:after="240"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:b/>
      <w:sz w:val="${Math.round((config.font_size || 12) * 2.8)}"/>
    </w:rPr>
    <w:t>${escapeXml(text)}</w:t>
  </w:r>
</w:p>`);
    };

    // Title page
    if (config.has_title_page) {
      addHeading(novel.title);
      if (config.subtitle) addParagraph(config.subtitle, true);
      addParagraph(config.author_name || 'Author', true);
      docParagraphs.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }

    // Chapters
    chapters.forEach((chapter, index) => {
      const chTitle = chapter.title || `Chapter ${index + 1}`;
      addHeading(chTitle);
      const paras = chapter.content.split('\n\n').filter(Boolean);
      paras.forEach((p, idx) => {
        if (p.trim() === '* * *' || p.trim() === config.scene_break_ornament) {
          docParagraphs.push(`
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr>
  <w:r><w:t>${escapeXml(config.scene_break_ornament || '* * *')}</w:t></w:r>
</w:p>`);
        } else {
          addParagraph(p, idx === 0);
        }
      });
      docParagraphs.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    });

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docParagraphs.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    zip.file('word/document.xml', documentXml);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    downloadBlob(blob, `${sanitizeFilename(novel.title)}.docx`);
  }

  /**
   * Generates clean, professional standard Print-Ready HTML with standard @page dimensions and margins.
   */
  static generatePrintHtml(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true,
    coverImageDataUrl?: string | null,
    tocEntries?: { title: string; pageNumber: number }[]
  ): string {
    const trimSizes: Record<string, { width: string; height: string }> = {
      us_trade_6x9: { width: '6in', height: '9in' },
      digest_5_5x8_5: { width: '5.5in', height: '8.5in' },
      pocket_5x8: { width: '5in', height: '8in' },
      mass_market: { width: '4.25in', height: '6.87in' },
      a5: { width: '5.83in', height: '8.27in' },
      letter: { width: '8.5in', height: '11in' },
    };

    const trim = trimSizes[config.trim_size || 'us_trade_6x9'] || trimSizes.us_trade_6x9;
    const fontCss = getFontFamilyCss(config.font_family || 'Amiri');

    return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(novel.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@400;600;700;800;900&family=Cinzel:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Naskh+Arabic:wght@400;700&family=Readex+Pro:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap');
    
    @page {
      size: ${trim.width} ${trim.height};
      margin: 20mm;
    }

    *, *:before, *:after {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #FFF;
      color: #000;
      font-family: ${fontCss};
      font-size: ${config.font_size || 11}pt;
      line-height: ${config.line_spacing || 1.45};
      direction: ${isRtl ? 'rtl' : 'ltr'};
      text-align: justify;
      width: 100%;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .chapter-start {
      page-break-before: always;
      break-before: page;
      width: 100%;
    }

    /* Cover Page */
    .cover-page {
      width: 100%;
      height: 100%;
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      page-break-after: always;
      break-after: page;
    }
    .cover-img {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
    }

    /* Title Page */
    .title-page {
      text-align: center;
      padding-top: 20%;
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
    }
    h1.novel-title {
      font-size: 2.2em;
      margin-bottom: 0.3em;
      font-weight: 800;
      line-height: 1.2;
    }
    .subtitle {
      font-size: 1.15em;
      color: #444;
      margin-bottom: 2em;
    }
    .author-name {
      font-size: 1.4em;
      font-weight: bold;
    }

    /* Copyright Page */
    .copyright-box {
      font-size: 0.85em;
      text-align: center;
      padding-top: 40%;
      line-height: 1.7;
      page-break-after: always;
      break-after: page;
    }

    /* Dedication Page */
    .dedication-page {
      text-align: center;
      padding-top: 35%;
      font-style: italic;
      page-break-after: always;
      break-after: page;
    }

    /* Headings */
    h2.chapter-heading {
      text-align: center;
      font-size: 1.6em;
      font-weight: 800;
      margin-top: 2em;
      margin-bottom: 1.5em;
      line-height: 1.3;
    }

    p {
      margin: 0 0 1em 0;
      text-indent: ${config.first_line_indent ? '1.5em' : '0'};
      orphans: 2;
      widows: 2;
    }

    p.no-indent {
      text-indent: 0 !important;
    }

    .first-paragraph {
      text-indent: 0 !important;
    }

    ${config.first_paragraph_drop_cap ? `
    .first-paragraph::first-letter {
      font-size: 3em;
      float: ${isRtl ? 'right' : 'left'};
      line-height: 0.8;
      padding-top: 4px;
      padding-${isRtl ? 'left' : 'right'}: 8px;
      font-family: serif;
      font-weight: bold;
    }` : ''}

    .scene-ornament {
      text-align: center;
      margin: 1.5em 0;
      font-family: monospace;
      font-weight: bold;
      letter-spacing: 0.2em;
    }

    /* Table of Contents */
    .toc-container {
      padding-top: 15%;
      page-break-after: always;
      break-after: page;
    }
    .toc-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 0.8em;
      line-height: 2;
    }
    .toc-title { font-weight: bold; font-size: 1.05em; }
    .toc-dots { flex: 1; border-bottom: 1px dotted #888; margin: 0 0.6em; min-width: 20px; }
    .toc-num { font-family: monospace; font-weight: bold; font-size: 1.05em; }
  </style>
</head>
<body>
  ${coverImageDataUrl ? `
  <div class="cover-page">
    <img src="${coverImageDataUrl}" class="cover-img" alt="Cover" />
  </div>` : ''}

  ${config.has_title_page ? `
  <div class="title-page">
    <div>
      <h1 class="novel-title">${escapeXml(novel.title)}</h1>
      ${config.subtitle ? `<div class="subtitle">${escapeXml(config.subtitle)}</div>` : ''}
    </div>
    <div class="author-name">${escapeXml(config.author_name || 'Author')}</div>
    ${config.publisher_name ? `<div style="font-size: 0.9em; margin-top: 2em;">${escapeXml(config.publisher_name)}</div>` : ''}
  </div>` : ''}

  ${config.has_copyright_page ? `
  <div class="copyright-box">
    <p><strong>${escapeXml(novel.title)}</strong></p>
    <p>© ${escapeXml(config.copyright_year || '2026')} ${escapeXml(config.author_name || '')}</p>
    ${config.edition_notice ? `<p>${escapeXml(config.edition_notice)}</p>` : ''}
    ${config.isbn ? `<p>ISBN: ${escapeXml(config.isbn)}</p>` : ''}
    ${config.publisher_name ? `<p>${escapeXml(config.publisher_name)}</p>` : ''}
    <p style="margin-top: 2em; font-size: 0.85em; opacity: 0.85;">
      ${isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
    </p>
  </div>` : ''}

  ${config.has_dedication && config.dedication_text ? `
  <div class="dedication-page">
    ${config.dedication_text.split('\n').filter(Boolean).map((line) => `<p style="margin: 0.5em 0;">${escapeXml(line)}</p>`).join('\n')}
  </div>` : ''}

  ${config.has_epigraph && config.epigraph_quote ? `
  <div class="dedication-page">
    <p style="font-size: 1.15em;">«${escapeXml(config.epigraph_quote)}»</p>
    ${config.epigraph_author ? `<p style="margin-top: 1.5em; font-weight: bold; font-style: normal;">— ${escapeXml(config.epigraph_author)}</p>` : ''}
  </div>` : ''}

  ${config.has_foreword && config.foreword_content ? `
  <div class="page-break">
    <h2 class="chapter-heading">${escapeXml(config.foreword_title || (isRtl ? 'مقدمة' : 'Foreword'))}</h2>
    ${config.foreword_content.split('\n\n').filter(Boolean).map((p, i) => `<p class="${i === 0 ? 'no-indent' : ''}">${escapeXml(p)}</p>`).join('\n')}
  </div>` : ''}

  ${config.has_table_of_contents ? `
  <div class="toc-container">
    <h2 class="chapter-heading">${isRtl ? 'فهرس المحتويات' : 'Table of Contents'}</h2>
    <div style="margin-top: 2em;">
      ${(tocEntries && tocEntries.length > 0 ? tocEntries : chapters.map((ch, idx) => ({
        title: ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${idx + 1}`,
        pageNumber: idx + 1
      }))).map((entry) => `
        <div class="toc-row">
          <span class="toc-title">${escapeXml(entry.title)}</span>
          <span class="toc-dots"></span>
          <span class="toc-num">${entry.pageNumber}</span>
        </div>
      `).join('\n')}
    </div>
  </div>` : ''}

  ${chapters.map((ch, idx) => {
    const chTitle = ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${idx + 1}`;
    const paras = ch.content.split('\n\n').filter(Boolean).map((p, pIdx) => {
      if (p.trim() === '* * *' || p.trim() === config.scene_break_ornament) {
        return `<div class="scene-ornament">${escapeXml(config.scene_break_ornament || '* * *')}</div>`;
      }
      return `<p class="${pIdx === 0 ? 'first-paragraph' : ''}">${escapeXml(p)}</p>`;
    }).join('\n');

    return `
    <div class="chapter-start">
      <h2 class="chapter-heading">${escapeXml(chTitle)}</h2>
      ${paras}
    </div>`;
  }).join('\n')}

  ${config.has_epilogue && config.epilogue_content ? `
  <div class="chapter-start">
    <h2 class="chapter-heading">${escapeXml(config.epilogue_title || (isRtl ? 'خاتمة' : 'Epilogue'))}</h2>
    ${config.epilogue_content.split('\n\n').filter(Boolean).map((p, i) => `<p class="${i === 0 ? 'no-indent' : ''}">${escapeXml(p)}</p>`).join('\n')}
  </div>` : ''}

  ${config.has_acknowledgments && config.acknowledgments_content ? `
  <div class="chapter-start">
    <h2 class="chapter-heading">${isRtl ? 'شكر وتقدير' : 'Acknowledgments'}</h2>
    ${config.acknowledgments_content.split('\n\n').filter(Boolean).map((p, i) => `<p class="${i === 0 ? 'no-indent' : ''}">${escapeXml(p)}</p>`).join('\n')}
  </div>` : ''}

  ${config.has_about_author && config.about_author_bio ? `
  <div class="chapter-start">
    <h2 class="chapter-heading">${isRtl ? 'عن المؤلف' : 'About the Author'}</h2>
    <p class="no-indent">${escapeXml(config.about_author_bio)}</p>
  </div>` : ''}
</body>
</html>`;
  }

  /**
   * Triggers the native browser print / save-as-PDF dialog.
   */
  static exportPrintPdf(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true,
    coverImageDataUrl?: string | null,
    tocEntries?: { title: string; pageNumber: number }[]
  ): void {
    const html = BookExportService.generatePrintHtml(novel, chapters, config, isRtl, coverImageDataUrl, tocEntries);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error:', err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 400);
  }
}

function getFontFamilyCss(font: string): string {
  switch (font) {
    case 'Dubai':
      return "'Dubai', 'Segoe UI', 'Amiri', sans-serif";
    case 'Amiri':
      return "'Amiri', 'Traditional Arabic', serif";
    case 'Cairo':
      return "'Cairo', 'IBM Plex Sans Arabic', sans-serif";
    case 'Scheherazade New':
      return "'Scheherazade New', 'Amiri', serif";
    case 'Noto Naskh Arabic':
      return "'Noto Naskh Arabic', 'Amiri', serif";
    case 'Almarai':
      return "'Almarai', sans-serif";
    case 'Readex Pro':
      return "'Readex Pro', sans-serif";
    case 'EB Garamond':
      return "'EB Garamond', Garamond, Georgia, serif";
    case 'Lora':
      return "'Lora', Georgia, serif";
    case 'Cinzel':
      return "'Cinzel', Georgia, serif";
    case 'Merriweather':
      return "'Merriweather', Georgia, serif";
    case 'Times New Roman':
      return "'Times New Roman', Times, serif";
    case 'Georgia':
      return "Georgia, serif";
    default:
      return "'Amiri', 'EB Garamond', serif";
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '').trim() || 'Novel';
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
