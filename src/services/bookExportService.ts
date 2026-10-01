import JSZip from 'jszip';
import { Novel, Chapter, BookFormatConfig, saveExportFile } from '../lib';
import {
  detectLanguage,
  escapeXml,
  inlineToHtml,
  isSceneBreak,
  parseInline,
  sanitizeFilename,
  splitParagraphs,
} from '../utils/text';
import { isMobileDevice, isTauri, UNSUPPORTED_ON_MOBILE } from '../utils/platform';

export type BookLang = 'ar' | 'en';

export interface ExportBook {
  novel: Novel;
  chapters: Chapter[];
  config: BookFormatConfig;
  /** Cover as a data URL, or '' for none. */
  coverImage: string;
}

/** Text that appears inside the exported book, in the book's language. */
const BOOK_STRINGS: Record<BookLang, Record<string, string>> = {
  ar: {
    chapter: 'الفصل',
    cover: 'الغلاف',
    titlePage: 'صفحة العنوان',
    copyright: 'حقوق النشر',
    allRightsReserved: 'جميع الحقوق محفوظة. لا يجوز نسخ أو إعادة إنتاج أي جزء من هذا الكتاب بأي شكل دون إذن مسبق من المؤلف.',
    dedication: 'الإهداء',
    epigraph: 'تصدير',
    foreword: 'مقدمة',
    contents: 'المحتويات',
    epilogue: 'خاتمة',
    acknowledgments: 'شكر وتقدير',
    aboutAuthor: 'عن المؤلف',
    author: 'المؤلف',
  },
  en: {
    chapter: 'Chapter',
    cover: 'Cover',
    titlePage: 'Title Page',
    copyright: 'Copyright',
    allRightsReserved: 'All rights reserved. No part of this book may be reproduced in any form without prior written permission from the author.',
    dedication: 'Dedication',
    epigraph: 'Epigraph',
    foreword: 'Foreword',
    contents: 'Contents',
    epilogue: 'Epilogue',
    acknowledgments: 'Acknowledgments',
    aboutAuthor: 'About the Author',
    author: 'Author',
  },
};

/** Page sizes for print/DOCX, in inches. */
const TRIM_SIZES: Record<string, { width: number; height: number }> = {
  us_trade_6x9: { width: 6, height: 9 },
  digest_5_5x8_5: { width: 5.5, height: 8.5 },
  pocket_4_25x6_87: { width: 4.25, height: 6.87 },
  a5: { width: 5.83, height: 8.27 },
  a4: { width: 8.27, height: 11.69 },
  us_letter: { width: 8.5, height: 11 },
};

function trimSize(config: BookFormatConfig) {
  return TRIM_SIZES[config.trim_size] ?? TRIM_SIZES.us_trade_6x9;
}

/** The book's language: the explicit setting, or detected from the text. */
export function resolveBookLanguage(config: BookFormatConfig, chapters: Chapter[], novelTitle = ''): BookLang {
  if (config.book_language === 'ar' || config.book_language === 'en') {
    return config.book_language;
  }
  const detected = detectLanguage([
    novelTitle,
    config.subtitle,
    ...chapters.map((c) => `${c.title}\n${c.content}`),
  ]);
  if (detected) return detected;
  const uiLang = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
  return uiLang === 'en' ? 'en' : 'ar';
}

interface ChapterHeading {
  /** "Chapter 3" line, when numbering is shown. */
  label?: string;
  /** Chapter's own title, when shown. */
  title?: string;
  /** Single-line text for tables of contents. */
  tocText: string;
}

const DEFAULT_TITLE = /^\s*(chapter|فصل|الفصل)\s*[#]?\s*\d+\s*$/i;

export function chapterHeading(chapter: Chapter, index: number, style: string, lang: BookLang): ChapterHeading {
  const S = BOOK_STRINGS[lang];
  const label = `${S.chapter} ${index + 1}`;
  const ownTitle = chapter.title.trim();
  const hasRealTitle = ownTitle !== '' && !DEFAULT_TITLE.test(ownTitle);

  if (style === 'title_only') {
    const title = ownTitle || label;
    return { title, tocText: title };
  }
  if (style === 'number_only' || !hasRealTitle) {
    return { label, tocText: label };
  }
  return { label, title: ownTitle, tocText: `${label}: ${ownTitle}` };
}

interface BookContext {
  book: ExportBook;
  lang: BookLang;
  S: Record<string, string>;
  dir: 'rtl' | 'ltr';
}

function contextFor(book: ExportBook): BookContext {
  const lang = resolveBookLanguage(book.config, book.chapters, book.novel.title);
  return { book, lang, S: BOOK_STRINGS[lang], dir: lang === 'ar' ? 'rtl' : 'ltr' };
}

function copyrightYear(config: BookFormatConfig): string {
  return config.copyright_year.trim() || String(new Date().getFullYear());
}

function parseCover(dataUrl: string): { mime: string; ext: string; base64: string } | null {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  let subtype = match[1].toLowerCase();
  if (subtype === 'jpg') subtype = 'jpeg';
  if (!['jpeg', 'png', 'webp', 'gif'].includes(subtype)) return null;
  return { mime: `image/${subtype}`, ext: subtype === 'jpeg' ? 'jpg' : subtype, base64: match[2] };
}

/**
 * HTML for body text: paragraphs (one per line), scene breaks and inline
 * formatting. The first paragraph after a heading or scene break isn't
 * indented.
 */
function proseToHtml(text: string, ornament: string, breakClass: string): string {
  let afterBreak = true;
  return splitParagraphs(text)
    .map((p) => {
      if (isSceneBreak(p, ornament)) {
        afterBreak = true;
        return `<div class="${breakClass}">${escapeXml(ornament || '* * *')}</div>`;
      }
      const cls = afterBreak ? ' class="first-paragraph"' : '';
      afterBreak = false;
      return `<p${cls}>${inlineToHtml(p)}</p>`;
    })
    .join('\n');
}

function lineBreaksToHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p class="centered-line">${inlineToHtml(line)}</p>`)
    .join('\n');
}

function headingHtml(heading: ChapterHeading, tag: 'h1' | 'h2', cls: string): string {
  return `<${tag} class="${cls}">${
    heading.label ? `<span class="chapter-label">${escapeXml(heading.label)}</span>` : ''
  }${heading.title ? `<span class="chapter-title">${escapeXml(heading.title)}</span>` : ''}</${tag}>`;
}

function fontStack(font: string): string {
  switch (font) {
    case 'Dubai':
      return "'Dubai', 'Segoe UI', 'Cairo', sans-serif";
    case 'Amiri':
      return "'Amiri', 'Traditional Arabic', serif";
    case 'Cairo':
      return "'Cairo', 'IBM Plex Sans Arabic', sans-serif";
    case 'Scheherazade New':
      return "'Scheherazade New', 'Amiri', serif";
    case 'Noto Naskh Arabic':
      return "'Noto Naskh Arabic', 'Amiri', serif";
    case 'Almarai':
      return "'Almarai', 'Cairo', sans-serif";
    case 'Readex Pro':
      return "'Readex Pro', 'Cairo', sans-serif";
    case 'Garamond':
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
      return 'Georgia, serif';
    default:
      return "'Amiri', 'EB Garamond', serif";
  }
}

/** Word font name for the DOCX (Word can't use a CSS fallback stack). */
function docxFont(font: string): string {
  return font === 'Garamond' ? 'EB Garamond' : font || 'Amiri';
}

// ---------------------------------------------------------------------------
// EPUB
// ---------------------------------------------------------------------------

export async function buildEpub(book: ExportBook): Promise<JSZip> {
  const { config, novel, chapters } = book;
  const { lang, S, dir } = contextFor(book);
  const ornament = config.scene_break_ornament || '* * *';
  const zip = new JSZip();

  // The mimetype entry must come first and be stored uncompressed.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  zip.file('OEBPS/styles.css', `@charset "utf-8";
body {
  font-family: ${fontStack(config.font_family)};
  font-size: ${config.font_size || 11}pt;
  line-height: ${config.line_spacing || 1.4};
  direction: ${dir};
  text-align: justify;
  margin: 5%;
}
h1, h2 { text-align: center; font-weight: bold; margin: 1.5em 0 1em; }
.chapter-label { display: block; font-size: 0.7em; letter-spacing: 0.08em; margin-bottom: 0.4em; }
.chapter-title { display: block; }
p { margin: 0; text-indent: ${config.first_line_indent ? '1.5em' : '0'}; }
p.first-paragraph { text-indent: 0; }
p.centered-line { text-align: center; text-indent: 0; margin: 0.3em 0; }
.title-page { text-align: center; margin-top: 25%; }
.title-page h1 { font-size: 2.2em; margin-bottom: 0.2em; }
.title-page .subtitle { font-size: 1.3em; margin-bottom: 2em; text-indent: 0; }
.title-page .author { font-size: 1.4em; font-weight: bold; text-indent: 0; }
.copyright-page { font-size: 0.85em; margin-top: 40%; text-align: center; line-height: 1.6; }
.copyright-page p { text-indent: 0; }
.dedication { font-style: italic; margin-top: 30%; }
.scene-break { text-align: center; margin: 1.5em 0; font-weight: bold; }
nav ol { list-style: none; padding: 0; }
nav li { margin: 0.4em 0; }
`);

  const manifest: string[] = [
    '<item id="css" href="styles.css" media-type="text/css"/>',
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
  ];
  const spine: string[] = [];
  const navItems: { title: string; href: string }[] = [];

  const xhtml = (title: string, body: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}" dir="${dir}">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${body}
</body>
</html>`;

  const addSection = (id: string, title: string, body: string, inToc = true) => {
    const href = `${id}.xhtml`;
    zip.file(`OEBPS/${href}`, xhtml(title, body));
    manifest.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="${id}"/>`);
    if (inToc) navItems.push({ title, href });
  };

  // Cover
  const cover = book.coverImage ? parseCover(book.coverImage) : null;
  if (cover) {
    zip.file(`OEBPS/images/cover.${cover.ext}`, cover.base64, { base64: true });
    manifest.push(`<item id="cover-image" href="images/cover.${cover.ext}" media-type="${cover.mime}" properties="cover-image"/>`);
    zip.file('OEBPS/cover.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}" dir="${dir}">
<head>
  <title>${escapeXml(S.cover)}</title>
  <style>body { margin: 0; padding: 0; text-align: center; } img { max-width: 100%; max-height: 100vh; height: auto; }</style>
</head>
<body epub:type="cover">
  <img src="images/cover.${cover.ext}" alt="${escapeXml(novel.title)}"/>
</body>
</html>`);
    manifest.push('<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
    spine.push('<itemref idref="cover" linear="no"/>');
  }

  // Front matter
  if (config.has_title_page) {
    addSection('titlepage', S.titlePage, `<div class="title-page">
  <h1>${escapeXml(novel.title)}</h1>
  ${config.subtitle ? `<p class="subtitle">${escapeXml(config.subtitle)}</p>` : ''}
  ${config.author_name ? `<p class="author">${escapeXml(config.author_name)}</p>` : ''}
  ${config.publisher_name ? `<p class="subtitle" style="margin-top: 3em; font-size: 0.9em;">${escapeXml(config.publisher_name)}</p>` : ''}
</div>`, false);
  }

  if (config.has_copyright_page) {
    addSection('copyright', S.copyright, `<div class="copyright-page">
  <p><strong>${escapeXml(novel.title)}</strong></p>
  <p>© ${escapeXml(copyrightYear(config))} ${escapeXml(config.author_name)}</p>
  ${config.edition_notice ? `<p>${escapeXml(config.edition_notice)}</p>` : ''}
  ${config.isbn ? `<p>ISBN: ${escapeXml(config.isbn)}</p>` : ''}
  ${config.publisher_name ? `<p>${escapeXml(config.publisher_name)}</p>` : ''}
  <p style="margin-top: 1.5em; font-size: 0.85em;">${escapeXml(S.allRightsReserved)}</p>
</div>`, false);
  }

  if (config.has_dedication && config.dedication_text.trim()) {
    addSection('dedication', S.dedication, `<div class="dedication">${lineBreaksToHtml(config.dedication_text)}</div>`, false);
  }

  if (config.has_epigraph && config.epigraph_quote.trim()) {
    addSection('epigraph', S.epigraph, `<div class="dedication">
${lineBreaksToHtml(config.epigraph_quote)}
${config.epigraph_author ? `<p class="centered-line" style="margin-top: 1em; font-style: normal;">— ${escapeXml(config.epigraph_author)}</p>` : ''}
</div>`, false);
  }

  // A visible table of contents page goes after the front matter.
  const tocSpineIndex = spine.length;

  if (config.has_foreword && config.foreword_content.trim()) {
    const title = config.foreword_title.trim() || S.foreword;
    addSection('foreword', title, `<h2>${escapeXml(title)}</h2>\n${proseToHtml(config.foreword_content, ornament, 'scene-break')}`);
  }

  chapters.forEach((chapter, index) => {
    const heading = chapterHeading(chapter, index, config.chapter_numbering_style, lang);
    addSection(
      `chapter_${index + 1}`,
      heading.tocText,
      `<section epub:type="chapter">\n${headingHtml(heading, 'h1', 'chapter-heading')}\n${proseToHtml(chapter.content, ornament, 'scene-break')}\n</section>`
    );
  });

  // Back matter
  if (config.has_epilogue && config.epilogue_content.trim()) {
    const title = config.epilogue_title.trim() || S.epilogue;
    addSection('epilogue', title, `<h2>${escapeXml(title)}</h2>\n${proseToHtml(config.epilogue_content, ornament, 'scene-break')}`);
  }
  if (config.has_acknowledgments && config.acknowledgments_content.trim()) {
    addSection('acknowledgments', S.acknowledgments, `<h2>${escapeXml(S.acknowledgments)}</h2>\n${proseToHtml(config.acknowledgments_content, ornament, 'scene-break')}`);
  }
  if (config.has_about_author && config.about_author_bio.trim()) {
    addSection('about_author', S.aboutAuthor, `<h2>${escapeXml(S.aboutAuthor)}</h2>\n${proseToHtml(config.about_author_bio, ornament, 'scene-break')}`);
  }

  // Navigation document (required by EPUB 3); shown in the reading order only
  // when the table of contents is enabled.
  const navList = navItems.map((item) => `      <li><a href="${item.href}">${escapeXml(item.title)}</a></li>`).join('\n');
  zip.file('OEBPS/nav.xhtml', xhtml(S.contents, `<nav epub:type="toc" id="toc">
    <h1>${escapeXml(S.contents)}</h1>
    <ol>
${navList}
    </ol>
  </nav>`));
  if (config.has_table_of_contents) {
    spine.splice(tocSpineIndex, 0, '<itemref idref="nav"/>');
  }

  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const identifier = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${lang}" dir="${dir}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${config.isbn.trim() ? `urn:isbn:${escapeXml(config.isbn.trim())}` : `urn:uuid:${identifier}`}</dc:identifier>
    <dc:title>${escapeXml(novel.title)}</dc:title>
    ${config.author_name ? `<dc:creator>${escapeXml(config.author_name)}</dc:creator>` : ''}
    ${config.publisher_name ? `<dc:publisher>${escapeXml(config.publisher_name)}</dc:publisher>` : ''}
    <dc:language>${lang}</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
    ${cover ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
    ${manifest.join('\n    ')}
  </manifest>
  <spine page-progression-direction="${dir}">
    ${spine.join('\n    ')}
  </spine>
</package>`);

  return zip;
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

const INCH = 1440; // twips per inch

function docxRuns(text: string, rtl: boolean): string {
  return parseInline(text)
    .filter((seg) => seg.text)
    .map((seg) => {
      const props = `${seg.bold ? '<w:b/><w:bCs/>' : ''}${seg.italic ? '<w:i/><w:iCs/>' : ''}${rtl ? '<w:rtl/>' : ''}`;
      return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(seg.text)}</w:t></w:r>`;
    })
    .join('');
}

export async function buildDocx(book: ExportBook): Promise<JSZip> {
  const { config, novel, chapters } = book;
  const { S, dir, lang } = contextFor(book);
  const rtl = dir === 'rtl';
  const ornament = config.scene_break_ornament || '* * *';
  const font = docxFont(config.font_family);
  const halfPoints = Math.round((config.font_size || 11) * 2);
  const lineSpacing = Math.round((config.line_spacing || 1.4) * 240);
  const size = trimSize(config);
  const bidi = rtl ? '<w:bidi/>' : '';
  const rtlRun = rtl ? '<w:rtl/>' : '';

  const body: string[] = [];
  let newPage = false;

  // `extraPPr` may only hold <w:spacing>; OOXML requires pPr children in
  // schema order (pStyle, pageBreakBefore, bidi, spacing, ...).
  const para = (runs: string, style: string, extraPPr = '') => {
    const pageBreak = newPage && body.length > 0 ? '<w:pageBreakBefore/>' : '';
    newPage = false;
    body.push(`<w:p><w:pPr><w:pStyle w:val="${style}"/>${pageBreak}${bidi}${extraPPr}</w:pPr>${runs}</w:p>`);
  };
  const text = (value: string, style: string, extraPPr = '') => para(docxRuns(value, rtl), style, extraPPr);
  const startPage = () => {
    newPage = true;
  };
  const prose = (value: string) => {
    let afterBreak = true;
    for (const p of splitParagraphs(value)) {
      if (isSceneBreak(p, ornament)) {
        para(`<w:r><w:rPr>${rtlRun}</w:rPr><w:t xml:space="preserve">${escapeXml(ornament)}</w:t></w:r>`, 'SceneBreak');
        afterBreak = true;
      } else {
        text(p, afterBreak ? 'FirstParagraph' : 'BodyText');
        afterBreak = false;
      }
    }
  };
  const heading = (value: string) => {
    // Heading 1 starts a new page through its style.
    newPage = false;
    text(value, 'Heading1');
  };

  // Title page
  if (config.has_title_page) {
    text(novel.title, 'Title');
    if (config.subtitle) text(config.subtitle, 'Subtitle');
    if (config.author_name) text(config.author_name, 'Author');
    if (config.publisher_name) text(config.publisher_name, 'Centered');
  }

  if (config.has_copyright_page) {
    startPage();
    text(novel.title, 'Centered', '<w:spacing w:before="2400"/>');
    text(`© ${copyrightYear(config)} ${config.author_name}`.trim(), 'Centered');
    if (config.edition_notice) text(config.edition_notice, 'Centered');
    if (config.isbn) text(`ISBN: ${config.isbn}`, 'Centered');
    if (config.publisher_name) text(config.publisher_name, 'Centered');
    text(S.allRightsReserved, 'Centered', '<w:spacing w:before="360"/>');
  }

  if (config.has_dedication && config.dedication_text.trim()) {
    startPage();
    splitParagraphs(config.dedication_text).forEach((line, i) =>
      text(line, 'Dedication', i === 0 ? '<w:spacing w:before="2400"/>' : '')
    );
  }

  if (config.has_epigraph && config.epigraph_quote.trim()) {
    startPage();
    splitParagraphs(config.epigraph_quote).forEach((line, i) =>
      text(line, 'Dedication', i === 0 ? '<w:spacing w:before="2400"/>' : '')
    );
    if (config.epigraph_author) text(`— ${config.epigraph_author}`, 'Centered');
  }

  if (config.has_table_of_contents) {
    startPage();
    text(S.contents, 'TOCHeading');
    para(
      `<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>` +
      `<w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z \\u </w:instrText></w:r>` +
      `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
      chapters.map((ch, i) => `<w:r><w:t xml:space="preserve">${escapeXml(chapterHeading(ch, i, config.chapter_numbering_style, lang).tocText)}</w:t></w:r><w:r><w:br/></w:r>`).join('') +
      `<w:r><w:fldChar w:fldCharType="end"/></w:r>`,
      'Normal'
    );
  }

  if (config.has_foreword && config.foreword_content.trim()) {
    heading(config.foreword_title.trim() || S.foreword);
    prose(config.foreword_content);
  }

  chapters.forEach((chapter, index) => {
    heading(chapterHeading(chapter, index, config.chapter_numbering_style, lang).tocText);
    prose(chapter.content);
  });

  if (config.has_epilogue && config.epilogue_content.trim()) {
    heading(config.epilogue_title.trim() || S.epilogue);
    prose(config.epilogue_content);
  }
  if (config.has_acknowledgments && config.acknowledgments_content.trim()) {
    heading(S.acknowledgments);
    prose(config.acknowledgments_content);
  }
  if (config.has_about_author && config.about_author_bio.trim()) {
    heading(S.aboutAuthor);
    prose(config.about_author_bio);
  }

  const zip = new JSZip();
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`);

  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(novel.title)}</dc:title>
  <dc:creator>${escapeXml(config.author_name)}</dc:creator>
  <dc:language>${lang}</dc:language>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</dcterms:created>
</cp:coreProperties>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`);

  zip.file('word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings ${W}>
  <w:mirrorMargins/>
  ${config.has_table_of_contents ? '<w:updateFields w:val="true"/>' : ''}
</w:settings>`);

  const indent = config.first_line_indent ? '<w:ind w:firstLine="360"/>' : '';
  // pPr strings below follow OOXML order: keepNext, pageBreakBefore, spacing, ind, jc, outlineLvl.
  const style = (id: string, name: string, pPr: string, rPr = '', extra = '') =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="BodyText"/>${extra}<w:pPr>${pPr}</w:pPr>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}</w:style>`;

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W}>
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${escapeXml(font)}" w:hAnsi="${escapeXml(font)}" w:cs="${escapeXml(font)}" w:eastAsia="${escapeXml(font)}"/>
        <w:sz w:val="${halfPoints}"/>
        <w:szCs w:val="${halfPoints}"/>
        <w:lang w:val="en-US" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:after="0" w:line="${lineSpacing}" w:lineRule="auto"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  ${style('BodyText', 'Body Text', `${indent}<w:jc w:val="both"/>`)}
  ${style('FirstParagraph', 'First Paragraph', '<w:jc w:val="both"/>')}
  ${style('Heading1', 'heading 1', '<w:keepNext/><w:pageBreakBefore/><w:spacing w:before="1440" w:after="480"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/>', '<w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/>', '<w:qFormat/>')}
  ${style('Title', 'Title', '<w:spacing w:before="2880" w:after="240"/><w:jc w:val="center"/>', '<w:b/><w:bCs/><w:sz w:val="56"/><w:szCs w:val="56"/>', '<w:qFormat/>')}
  ${style('Subtitle', 'Subtitle', '<w:spacing w:after="720"/><w:jc w:val="center"/>', '<w:sz w:val="32"/><w:szCs w:val="32"/>', '<w:qFormat/>')}
  ${style('Author', 'Author', '<w:spacing w:after="240"/><w:jc w:val="center"/>', '<w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/>')}
  ${style('Centered', 'Centered', '<w:spacing w:after="120"/><w:jc w:val="center"/>')}
  ${style('Dedication', 'Dedication', '<w:spacing w:after="120"/><w:jc w:val="center"/>', '<w:i/><w:iCs/>')}
  ${style('SceneBreak', 'Scene Break', '<w:spacing w:before="240" w:after="240"/><w:jc w:val="center"/>')}
  ${style('TOCHeading', 'TOC Heading', '<w:spacing w:before="1440" w:after="480"/><w:jc w:val="center"/>', '<w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/>')}
</w:styles>`);

  zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${W}>
  <w:p>
    <w:pPr>${bidi}<w:jc w:val="center"/></w:pPr>
    ${config.include_page_numbers ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>' : ''}
  </w:p>
</w:ftr>`);

  const marginTop = Math.round(0.8 * INCH);
  const marginInner = Math.round(0.85 * INCH);
  const marginOuter = Math.round(0.65 * INCH);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W} ${R}>
  <w:body>
    ${body.join('\n    ')}
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rId3"/>
      <w:pgSz w:w="${Math.round(size.width * INCH)}" w:h="${Math.round(size.height * INCH)}"/>
      <w:pgMar w:top="${marginTop}" w:right="${rtl ? marginInner : marginOuter}" w:bottom="${marginTop}" w:left="${rtl ? marginOuter : marginInner}" w:header="720" w:footer="432" w:gutter="0"/>
      ${config.has_title_page ? '<w:titlePg/>' : ''}
      ${rtl ? '<w:bidi/>' : ''}
    </w:sectPr>
  </w:body>
</w:document>`);

  return zip;
}

// ---------------------------------------------------------------------------
// Print / PDF
// ---------------------------------------------------------------------------

/** @font-face rules of the app's bundled fonts, so the print frame can use them offline. */
function collectFontFaceCss(): string {
  if (typeof document === 'undefined') return '';
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(cssRules)) {
      if (rule.constructor.name === 'CSSFontFaceRule' || rule.cssText.startsWith('@font-face')) {
        rules.push(rule.cssText);
      }
    }
  }
  return rules.join('\n');
}

export function generatePrintHtml(book: ExportBook): string {
  const { config, novel, chapters } = book;
  const { lang, S, dir } = contextFor(book);
  const rtl = dir === 'rtl';
  const font = fontStack(config.font_family);
  const ornament = config.scene_break_ornament || '* * *';
  const size = trimSize(config);
  const inner = '0.85in';
  const outer = '0.65in';
  const cover = book.coverImage && parseCover(book.coverImage) ? book.coverImage : '';

  const tocEntries = [
    ...(config.has_foreword && config.foreword_content.trim() ? [config.foreword_title.trim() || S.foreword] : []),
    ...chapters.map((ch, i) => chapterHeading(ch, i, config.chapter_numbering_style, lang).tocText),
    ...(config.has_epilogue && config.epilogue_content.trim() ? [config.epilogue_title.trim() || S.epilogue] : []),
    ...(config.has_acknowledgments && config.acknowledgments_content.trim() ? [S.acknowledgments] : []),
    ...(config.has_about_author && config.about_author_bio.trim() ? [S.aboutAuthor] : []),
  ];

  const section = (title: string, content: string) => `
  <section class="chapter-start">
    <h2 class="chapter-heading"><span class="chapter-title">${escapeXml(title)}</span></h2>
    ${proseToHtml(content, ornament, 'scene-ornament')}
  </section>`;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(novel.title)}</title>
  <style>
    ${collectFontFaceCss()}

    @page {
      size: ${size.width}in ${size.height}in;
      margin: 0.8in ${rtl ? inner : outer} 0.8in ${rtl ? outer : inner};
    }
    @page :left { margin-left: ${rtl ? inner : outer}; margin-right: ${rtl ? outer : inner}; }
    @page :right { margin-left: ${rtl ? outer : inner}; margin-right: ${rtl ? inner : outer}; }
    @page cover-page { margin: 0; }
    @page chapter-page {
      ${config.include_page_numbers ? `@bottom-center { content: counter(page); font-family: ${font}; font-size: 9pt; color: #333; }` : ''}
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; }
    body {
      font-family: ${font};
      font-size: ${config.font_size || 11}pt;
      line-height: ${config.line_spacing || 1.4};
      direction: ${dir};
      text-align: justify;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .front-matter { break-after: page; }
    .chapter-start { page: chapter-page; break-before: page; }
    .cover-page {
      page: cover-page;
      break-after: page;
      height: ${size.height}in;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .cover-page img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
    .title-page { text-align: center; padding-top: 30%; }
    .novel-title { font-size: 2.4em; margin: 0 0 0.25em; font-weight: 800; line-height: 1.2; }
    .subtitle { font-size: 1.2em; color: #444; margin-bottom: 3em; }
    .author-name { font-size: 1.5em; font-weight: 700; }
    .copyright-box { font-size: 0.85em; text-align: center; padding-top: 45%; line-height: 1.7; }
    .copyright-box p, .centered-line { text-indent: 0; text-align: center; }
    .dedication-page { text-align: center; padding-top: 35%; font-style: italic; }
    .centered-line { margin: 0.5em 0; font-size: 1.1em; }
    .toc { padding-top: 10%; }
    .toc h2 { text-align: center; font-size: 1.6em; margin-bottom: 1.5em; }
    .toc ol { list-style: none; padding: 0; margin: 0; }
    .toc li { padding: 0.35em 0; border-bottom: 1px dotted #999; text-align: start; }
    .chapter-heading { text-align: center; font-size: 1.6em; font-weight: 800; margin: 2.5em 0 1.8em; line-height: 1.3; }
    .chapter-label { display: block; font-size: 0.6em; font-weight: 600; letter-spacing: 0.08em; margin-bottom: 0.5em; color: #444; }
    .chapter-title { display: block; }
    p { margin: 0; text-indent: ${config.first_line_indent ? '1.5em' : '0'}; orphans: 2; widows: 2; }
    p.first-paragraph { text-indent: 0; }
    .scene-ornament { text-align: center; margin: 1.8em 0; font-weight: bold; letter-spacing: 0.3em; }
  </style>
</head>
<body>
  ${cover ? `<div class="cover-page"><img src="${cover}" alt="${escapeXml(novel.title)}"/></div>` : ''}

  ${config.has_title_page ? `
  <div class="front-matter title-page">
    <h1 class="novel-title">${escapeXml(novel.title)}</h1>
    ${config.subtitle ? `<div class="subtitle">${escapeXml(config.subtitle)}</div>` : ''}
    ${config.author_name ? `<div class="author-name">${escapeXml(config.author_name)}</div>` : ''}
    ${config.publisher_name ? `<div style="font-size: 0.9em; margin-top: 2em;">${escapeXml(config.publisher_name)}</div>` : ''}
  </div>` : ''}

  ${config.has_copyright_page ? `
  <div class="front-matter copyright-box">
    <p><strong>${escapeXml(novel.title)}</strong></p>
    <p>© ${escapeXml(copyrightYear(config))} ${escapeXml(config.author_name)}</p>
    ${config.edition_notice ? `<p>${escapeXml(config.edition_notice)}</p>` : ''}
    ${config.isbn ? `<p>ISBN: ${escapeXml(config.isbn)}</p>` : ''}
    ${config.publisher_name ? `<p>${escapeXml(config.publisher_name)}</p>` : ''}
    <p style="margin-top: 2em; font-size: 0.9em;">${escapeXml(S.allRightsReserved)}</p>
  </div>` : ''}

  ${config.has_dedication && config.dedication_text.trim() ? `
  <div class="front-matter dedication-page">${lineBreaksToHtml(config.dedication_text)}</div>` : ''}

  ${config.has_epigraph && config.epigraph_quote.trim() ? `
  <div class="front-matter dedication-page">
    ${lineBreaksToHtml(config.epigraph_quote)}
    ${config.epigraph_author ? `<p class="centered-line" style="font-style: normal; font-weight: bold;">— ${escapeXml(config.epigraph_author)}</p>` : ''}
  </div>` : ''}

  ${config.has_table_of_contents && tocEntries.length > 0 ? `
  <nav class="front-matter toc">
    <h2>${escapeXml(S.contents)}</h2>
    <ol>${tocEntries.map((entry) => `<li>${escapeXml(entry)}</li>`).join('')}</ol>
  </nav>` : ''}

  ${config.has_foreword && config.foreword_content.trim() ? section(config.foreword_title.trim() || S.foreword, config.foreword_content) : ''}

  ${chapters.map((ch, idx) => `
  <section class="chapter-start">
    ${headingHtml(chapterHeading(ch, idx, config.chapter_numbering_style, lang), 'h2', 'chapter-heading')}
    ${proseToHtml(ch.content, ornament, 'scene-ornament')}
  </section>`).join('\n')}

  ${config.has_epilogue && config.epilogue_content.trim() ? section(config.epilogue_title.trim() || S.epilogue, config.epilogue_content) : ''}
  ${config.has_acknowledgments && config.acknowledgments_content.trim() ? section(S.acknowledgments, config.acknowledgments_content) : ''}
  ${config.has_about_author && config.about_author_bio.trim() ? section(S.aboutAuthor, config.about_author_bio) : ''}
</body>
</html>`;
}

async function waitForFrameAssets(doc: Document): Promise<void> {
  const images = Array.from(doc.images).map((img) =>
    img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    })
  );
  const fonts = doc.fonts ? doc.fonts.ready.then(() => undefined) : Promise.resolve();
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 8000));
  await Promise.race([Promise.all([fonts, ...images]).then(() => undefined), timeout]);
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

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

/** Saves through the native dialog; in a plain browser it downloads instead. */
async function saveOrDownload(
  zip: JSZip,
  defaultFilename: string,
  filterName: string,
  filterExt: string,
  mimeType: string
): Promise<string | null> {
  if (!isTauri()) {
    downloadBlob(await zip.generateAsync({ type: 'blob', mimeType, compression: 'DEFLATE' }), defaultFilename);
    return defaultFilename;
  }
  const base64Data = await zip.generateAsync({ type: 'base64', mimeType, compression: 'DEFLATE' });
  return saveExportFile(defaultFilename, filterName, filterExt, base64Data);
}

export const BookExportService = {
  async exportEpub(book: ExportBook): Promise<string | null> {
    const zip = await buildEpub(book);
    return saveOrDownload(zip, `${sanitizeFilename(book.novel.title)}.epub`, 'EPUB eBook (*.epub)', 'epub', 'application/epub+zip');
  },

  async exportDocx(book: ExportBook): Promise<string | null> {
    const zip = await buildDocx(book);
    return saveOrDownload(
      zip,
      `${sanitizeFilename(book.novel.title)}.docx`,
      'Word Document (*.docx)',
      'docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  },

  /** Opens the system print dialog (Save as PDF) for a print-ready layout. */
  async exportPrintPdf(book: ExportBook): Promise<void> {
    if (isMobileDevice()) {
      throw new Error(UNSUPPORTED_ON_MOBILE);
    }
    const html = generatePrintHtml(book);

    // A hidden iframe avoids popup blockers in the webview.
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;z-index:-1;';
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDoc = frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      iframe.remove();
      throw new Error('Print preview is not available');
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    await waitForFrameAssets(frameDoc);

    const cleanup = () => iframe.remove();
    frameWindow.addEventListener('afterprint', () => setTimeout(cleanup, 500), { once: true });
    // Fallback for webviews that never fire afterprint.
    setTimeout(cleanup, 10 * 60 * 1000);

    frameWindow.focus();
    frameWindow.print();
  },
};
