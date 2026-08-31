import JSZip from 'jszip';
import { Novel, Chapter, BookFormatConfig } from '../lib';

export class BookExportService {
  /**
   * Generates and downloads an EPUB 3 archive with full RTL metadata.
   */
  static async exportEpub(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
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

    // 3. CSS Stylesheet
    const css = `
@charset "utf-8";
body {
  font-family: ${config.font_family || 'sans-serif'}, serif;
  font-size: ${config.font_size || 11}pt;
  line-height: ${config.line_spacing || 1.3};
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
  margin: 0;
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

    const manifestItems: string[] = [
      '<item id="css" href="styles.css" media-type="text/css"/>',
      '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    ];
    const spineItems: string[] = [];
    const tocItems: { title: string; href: string }[] = [];

    // Helper to add XHTML section
    const addXhtml = (id: string, filename: string, title: string, bodyContent: string) => {
      const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
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
  <p style="margin-top: 1.5em; font-size: 0.8em; opacity: 0.8;">
    ${isRtl 
      ? 'جميع الحقوق محفوظة. لا يجوز نسخ أو إعادة إنتاج أي جزء من هذا الكتاب دون إذن مسبق.'
      : 'All rights reserved. No part of this publication may be reproduced without prior permission.'}
  </p>
</div>`;
      addXhtml('copyright', 'copyright.xhtml', isRtl ? 'حقوق النشر' : 'Copyright', content);
    }

    // Front Matter: Dedication
    if (config.has_dedication && config.dedication_text) {
      const content = `
<div class="dedication">
  <p>${escapeXml(config.dedication_text)}</p>
</div>`;
      addXhtml('dedication', 'dedication.xhtml', isRtl ? 'الإهداء' : 'Dedication', content);
    }

    // Front Matter: Epigraph
    if (config.has_epigraph && config.epigraph_quote) {
      const content = `
<div class="dedication">
  <p>«${escapeXml(config.epigraph_quote)}»</p>
  ${config.epigraph_author ? `<p style="margin-top: 1em; font-weight: bold;">— ${escapeXml(config.epigraph_author)}</p>` : ''}
</div>`;
      addXhtml('epigraph', 'epigraph.xhtml', isRtl ? 'تصدير' : 'Epigraph', content);
    }

    // Front Matter: Foreword
    if (config.has_foreword && config.foreword_content) {
      const paras = config.foreword_content.split('\n\n').filter(Boolean).map(p => `<p>${escapeXml(p)}</p>`).join('\n');
      const content = `
<h1>${escapeXml(config.foreword_title || 'Foreword')}</h1>
${paras}`;
      addXhtml('foreword', 'foreword.xhtml', config.foreword_title || 'Foreword', content);
    }

    // Chapters
    chapters.forEach((chapter, index) => {
      const chNum = index + 1;
      const chTitle = chapter.title || `${isRtl ? 'الفصل' : 'Chapter'} ${chNum}`;
      const paras = chapter.content
        .split('\n\n')
        .filter(Boolean)
        .map((p, pIdx) => {
          if (p.trim() === config.scene_break_ornament || p.trim() === '* * *') {
            return `<div class="scene-break">${escapeXml(config.scene_break_ornament || '* * *')}</div>`;
          }
          return `<p class="${pIdx === 0 ? 'first-paragraph' : ''}">${escapeXml(p)}</p>`;
        })
        .join('\n');

      const content = `
<h1>${escapeXml(chTitle)}</h1>
${paras}`;
      addXhtml(`chapter_${chNum}`, `chapter_${chNum}.xhtml`, chTitle, content);
    });

    // Back Matter: Epilogue
    if (config.has_epilogue && config.epilogue_content) {
      const paras = config.epilogue_content.split('\n\n').filter(Boolean).map(p => `<p>${escapeXml(p)}</p>`).join('\n');
      const content = `
<h1>${escapeXml(config.epilogue_title || 'Epilogue')}</h1>
${paras}`;
      addXhtml('epilogue', 'epilogue.xhtml', config.epilogue_title || 'Epilogue', content);
    }

    // Back Matter: Acknowledgments
    if (config.has_acknowledgments && config.acknowledgments_content) {
      const paras = config.acknowledgments_content.split('\n\n').filter(Boolean).map(p => `<p>${escapeXml(p)}</p>`).join('\n');
      const content = `
<h1>${isRtl ? 'شكر وتقدير' : 'Acknowledgments'}</h1>
${paras}`;
      addXhtml('acknowledgments', 'acknowledgments.xhtml', isRtl ? 'شكر وتقدير' : 'Acknowledgments', content);
    }

    // Back Matter: About the Author
    if (config.has_about_author && config.about_author_bio) {
      const paras = config.about_author_bio.split('\n\n').filter(Boolean).map(p => `<p>${escapeXml(p)}</p>`).join('\n');
      const content = `
<h1>${isRtl ? 'عن المؤلف' : 'About the Author'}</h1>
${paras}`;
      addXhtml('about_author', 'about_author.xhtml', isRtl ? 'عن المؤلف' : 'About the Author', content);
    }

    // Navigation Document (toc.xhtml)
    const navList = tocItems.map(item => `    <li><a href="${item.href}">${escapeXml(item.title)}</a></li>`).join('\n');
    const tocXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <title>${isRtl ? 'الفهرس' : 'Table of Contents'}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${isRtl ? 'جدول المحتويات' : 'Table of Contents'}</h1>
    <ol>
${navList}
    </ol>
  </nav>
</body>
</html>`;
    zip.file('OEBPS/toc.xhtml', tocXhtml);

    // Package Document (OEBPS/content.opf)
    const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" prefix="rendition: http://www.idpf.org/vocab/rendition/#" dir="${isRtl ? 'rtl' : 'ltr'}" xml:lang="${isRtl ? 'ar' : 'en'}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:${generateUuid()}</dc:identifier>
    <dc:title>${escapeXml(novel.title)}</dc:title>
    <dc:creator>${escapeXml(config.author_name || 'Author')}</dc:creator>
    <dc:language>${isRtl ? 'ar' : 'en'}</dc:language>
    <dc:date>${new Date().toISOString()}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\\.[0-9]{3}/, '')}</meta>
    ${isRtl ? '<meta property="page-progression-direction">rtl</meta>' : ''}
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine ${isRtl ? 'page-progression-direction="rtl"' : ''}>
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
    zip.file('OEBPS/content.opf', contentOpf);

    // Generate Blob & Trigger Download
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    downloadBlob(blob, `${sanitizeFilename(novel.title)}.epub`);
  }

  /**
   * Generates and downloads a Word DOCX OpenXML manuscript document.
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
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

    // Styles XML
    zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${config.font_family || 'Garamond'}" w:hAnsi="${config.font_family || 'Garamond'}" w:cs="${config.font_family || 'Amiri'}"/>
        <w:sz w:val="${Math.round((config.font_size || 11) * 2)}"/>
        <w:szCs w:val="${Math.round((config.font_size || 11) * 2)}"/>
        ${isRtl ? '<w:rtl/>' : ''}
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

    // Build paragraphs for Document.xml
    const docParagraphs: string[] = [];

    const addHeading = (text: string) => {
      docParagraphs.push(`
<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="400" w:after="240"/>
    ${isRtl ? '<w:bidi/>' : ''}
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/>${isRtl ? '<w:rtl/>' : ''}</w:rPr>
    <w:t>${escapeXml(text)}</w:t>
  </w:r>
</w:p>`);
    };

    const addParagraph = (text: string, isFirst = false) => {
      docParagraphs.push(`
<w:p>
  <w:pPr>
    <w:jc w:val="both"/>
    <w:spacing w:line="${Math.round((config.line_spacing || 1.3) * 240)}" w:lineRule="auto"/>
    ${config.first_line_indent && !isFirst ? '<w:ind w:firstLine="400"/>' : ''}
    ${isRtl ? '<w:bidi/>' : ''}
  </w:pPr>
  <w:r>
    <w:rPr>${isRtl ? '<w:rtl/>' : ''}</w:rPr>
    <w:t xml:space="preserve">${escapeXml(text)}</w:t>
  </w:r>
</w:p>`);
    };

    // Title Page
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
   * Generates standalone Print-Ready HTML with exact CSS @page trim sizes, typography, and page breaks.
   */
  static generatePrintHtml(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): string {
    const trimSizes: Record<string, { width: string; height: string; name: string }> = {
      us_trade_6x9: { width: '6in', height: '9in', name: 'US Trade 6"x9"' },
      digest_5_5x8_5: { width: '5.5in', height: '8.5in', name: 'Digest 5.5"x8.5"' },
      pocket_5x8: { width: '5in', height: '8in', name: 'Pocket 5"x8"' },
      mass_market: { width: '4.25in', height: '6.87in', name: 'Mass Market' },
      a5: { width: '5.83in', height: '8.27in', name: 'A5 Standard' },
      letter: { width: '8.5in', height: '11in', name: 'Standard Letter' },
    };

    const trim = trimSizes[config.trim_size || 'us_trade_6x9'] || trimSizes.us_trade_6x9;
    const fontCss = getFontFamilyCss(config.font_family || 'Amiri');

    const dedicationLines = config.has_dedication && config.dedication_text
      ? config.dedication_text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => `<p class="dedication-line">${escapeXml(line)}</p>`)
          .join('\n')
      : '';

    return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(novel.title)} - Print Edition</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@400;600;700;800;900&family=Cinzel:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Naskh+Arabic:wght@400;700&family=Readex+Pro:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap');
    
    @page {
      size: ${trim.width} ${trim.height};
      margin-top: 0.8in;
      margin-bottom: 0.8in;
      margin-left: ${isRtl ? '0.85in' : '0.65in'};
      margin-right: ${isRtl ? '0.65in' : '0.85in'};
    }

    /* Mirrored Gutter Margins */
    @page :left {
      margin-left: ${isRtl ? '0.85in' : '0.65in'};
      margin-right: ${isRtl ? '0.65in' : '0.85in'};
    }

    @page :right {
      margin-left: ${isRtl ? '0.65in' : '0.85in'};
      margin-right: ${isRtl ? '0.85in' : '0.65in'};
    }

    /* All front-matter pages (Title, Copyright, Dedication, Epigraph, Foreword) omit page numbers */
    @page front-matter {
      @bottom-center { content: none !important; }
      @bottom-left { content: none !important; }
      @bottom-right { content: none !important; }
      @top-left { content: none !important; }
      @top-right { content: none !important; }
    }

    /* Main body chapters display page numbers */
    @page chapter-page {
      ${config.include_page_numbers ? `
      @bottom-center {
        content: counter(page);
        font-family: ${fontCss};
        font-size: 9pt;
        color: #333;
      }` : ''}
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: ${fontCss};
      font-size: ${config.font_size || 11}pt;
      line-height: ${config.line_spacing || 1.45};
      direction: ${isRtl ? 'rtl' : 'ltr'};
      text-align: justify;
      color: #111;
      background: #FFF;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .front-matter {
      page: front-matter;
      page-break-after: always;
      break-after: page;
    }

    .first-chapter {
      page: chapter-page;
      page-break-before: always;
      break-before: page;
    }

    .chapter-start {
      page: chapter-page;
      page-break-before: always;
      break-before: page;
    }

    /* Title Page */
    .title-page {
      text-align: center;
      padding-top: 30%;
      height: 75vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    h1.novel-title {
      font-size: 2.4em;
      margin-bottom: 0.25em;
      font-weight: 800;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 1.2em;
      color: #444;
      margin-bottom: 3em;
    }

    .author-name {
      font-size: 1.5em;
      font-weight: 700;
    }

    /* Copyright Page */
    .copyright-box {
      font-size: 0.85em;
      text-align: center;
      padding-top: 45%;
      line-height: 1.7;
    }

    /* Dedication Page */
    .dedication-page {
      text-align: center;
      padding-top: 35%;
      font-style: italic;
    }

    .dedication-line {
      margin: 0.5em 0 !important;
      text-indent: 0 !important;
      font-size: 1.15em;
    }

    /* Chapter Headings */
    .chapter-heading {
      text-align: center;
      font-size: 1.6em;
      font-weight: 800;
      margin-top: 2.5em;
      margin-bottom: 1.8em;
      line-height: 1.3;
    }

    p {
      margin: 0 0 0 0;
      text-indent: ${config.first_line_indent ? '1.5em' : '0'};
    }

    p.no-indent {
      text-indent: 0;
    }

    .first-paragraph {
      text-indent: 0 !important;
    }

    .scene-ornament {
      text-align: center;
      margin: 1.8em 0;
      font-weight: bold;
      letter-spacing: 0.3em;
      font-size: 1.1em;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${config.has_title_page ? `
  <div class="front-matter title-page">
    <div>
      <h1 class="novel-title">${escapeXml(novel.title)}</h1>
      ${config.subtitle ? `<div class="subtitle">${escapeXml(config.subtitle)}</div>` : ''}
    </div>
    <div class="author-name">${escapeXml(config.author_name || 'Author')}</div>
    ${config.publisher_name ? `<div style="font-size: 0.9em; margin-top: 2em;">${escapeXml(config.publisher_name)}</div>` : ''}
  </div>` : ''}

  ${config.has_copyright_page ? `
  <div class="front-matter copyright-box">
    <p><strong>${escapeXml(novel.title)}</strong></p>
    <p>© ${escapeXml(config.copyright_year || '2026')} ${escapeXml(config.author_name || '')}</p>
    ${config.edition_notice ? `<p>${escapeXml(config.edition_notice)}</p>` : ''}
    ${config.isbn ? `<p>ISBN: ${escapeXml(config.isbn)}</p>` : ''}
    ${config.publisher_name ? `<p>${escapeXml(config.publisher_name)}</p>` : ''}
    <p style="margin-top: 2em; font-size: 0.85em; opacity: 0.85;">
      ${isRtl ? 'جميع الحقوق محفوظة. لا يجوز إعادة إنتاج أي جزء من هذا العمل بأي شكل دون إذن مسبق.' : 'All rights reserved. No part of this book may be reproduced without written permission.'}
    </p>
  </div>` : ''}

  ${config.has_dedication && config.dedication_text ? `
  <div class="front-matter dedication-page">
    ${dedicationLines}
  </div>` : ''}

  ${config.has_epigraph && config.epigraph_quote ? `
  <div class="front-matter" style="text-align: center; padding-top: 35%; font-style: italic;">
    <p style="font-size: 1.15em;">«${escapeXml(config.epigraph_quote)}»</p>
    ${config.epigraph_author ? `<p style="margin-top: 1.5em; font-weight: bold; font-style: normal;">— ${escapeXml(config.epigraph_author)}</p>` : ''}
  </div>` : ''}

  ${config.has_foreword && config.foreword_content ? `
  <div class="front-matter">
    <h2 class="chapter-heading">${escapeXml(config.foreword_title || (isRtl ? 'مقدمة' : 'Foreword'))}</h2>
    ${config.foreword_content.split('\n\n').filter(Boolean).map((p, i) => `<p class="${i === 0 ? 'no-indent' : ''}">${escapeXml(p)}</p>`).join('\n')}
  </div>` : ''}

  ${chapters.map((ch, idx) => {
    const chTitle = ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${idx + 1}`;
    const paras = ch.content.split('\n\n').filter(Boolean).map((p, pIdx) => {
      if (p.trim() === '* * *' || p.trim() === config.scene_break_ornament) {
        return `<div class="scene-ornament">${escapeXml(config.scene_break_ornament || '* * *')}</div>`;
      }
      return `<p class="${pIdx === 0 ? 'first-paragraph' : ''}">${escapeXml(p)}</p>`;
    }).join('\n');

    const isFirstChapter = idx === 0;
    return `
    <div class="${isFirstChapter ? 'first-chapter' : 'chapter-start'} ${idx < chapters.length - 1 ? 'page-break' : ''}">
      <h2 class="chapter-heading">${escapeXml(chTitle)}</h2>
      ${paras}
    </div>`;
  }).join('\n')}

  ${config.has_epilogue && config.epilogue_content ? `
  <div class="chapter-start ${config.has_about_author && config.about_author_bio ? 'page-break' : ''}">
    <h2 class="chapter-heading">${escapeXml(config.epilogue_title || (isRtl ? 'خاتمة' : 'Epilogue'))}</h2>
    ${config.epilogue_content.split('\n\n').filter(Boolean).map((p, i) => `<p class="${i === 0 ? 'no-indent' : ''}">${escapeXml(p)}</p>`).join('\n')}
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
   * Generates a Print-Ready PDF / Printable Window with alternating binding gutters (RTL/LTR mirrored margins).
   */
  static exportPrintPdf(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): void {
    const html = BookExportService.generatePrintHtml(novel, chapters, config, isRtl);

    // Create an invisible iframe to print without triggering popup blockers in Tauri / WebView2
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
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

  /**
   * Downloads the standalone print-ready HTML document.
   */
  static downloadPrintHtml(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): void {
    const html = BookExportService.generatePrintHtml(novel, chapters, config, isRtl);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFilename(novel.title)}_PrintEdition.html`);
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
