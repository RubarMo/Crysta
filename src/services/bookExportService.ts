import JSZip from 'jszip';
import { Novel, Chapter, BookFormatConfig } from '../lib';

export interface BookParagraph {
  text: string;
  isContinuation?: boolean;
  isSceneBreak?: boolean;
  isFirstParagraph?: boolean;
}

export interface BookPage {
  id: string;
  pageNumber: number | null;
  side: 'recto' | 'verso';
  type: 'title' | 'copyright' | 'dedication' | 'epigraph' | 'foreword' | 'chapter' | 'epilogue' | 'acknowledgments' | 'about_author';
  chapterTitle?: string;
  isChapterStart?: boolean;
  paragraphs?: BookParagraph[];
}

export interface TrimSizeInfo {
  name: string;
  width: string;
  height: string;
  widthIn: number;
  heightIn: number;
  aspectRatio: number;
}

export const TRIM_SIZES: Record<string, TrimSizeInfo> = {
  us_trade_6x9: { name: 'US Trade 6"x9"', width: '6in', height: '9in', widthIn: 6, heightIn: 9, aspectRatio: 6 / 9 },
  digest_5_5x8_5: { name: 'Digest 5.5"x8.5"', width: '5.5in', height: '8.5in', widthIn: 5.5, heightIn: 8.5, aspectRatio: 5.5 / 8.5 },
  pocket_5x8: { name: 'Pocket Book 5"x8"', width: '5in', height: '8in', widthIn: 5, heightIn: 8, aspectRatio: 5 / 8 },
  mass_market: { name: 'Mass Market 4.25"x6.87"', width: '4.25in', height: '6.87in', widthIn: 4.25, heightIn: 6.87, aspectRatio: 4.25 / 6.87 },
  a5: { name: 'A5 International (148 x 210 mm)', width: '5.83in', height: '8.27in', widthIn: 5.83, heightIn: 8.27, aspectRatio: 5.83 / 8.27 },
  letter: { name: 'Standard Letter (8.5" x 11")', width: '8.5in', height: '11in', widthIn: 8.5, heightIn: 11, aspectRatio: 8.5 / 11 },
};

/* ------------------------------------------------------------------ */
/* Curated export themes (Reedsy-style "pick a template"). Each theme  */
/* is a professionally-paired bundle of Arabic-first typography: one   */
/* click sets font, size, spacing, and ornament together. Advanced     */
/* users can still fine-tune every value afterwards (→ custom theme).  */
/* ------------------------------------------------------------------ */

export interface BookTheme {
  id: string;
  /** Resolved via locales in the UI; kept here as fallback. */
  name: string;
  tagline: string;
  font_family: string;
  font_size: number;
  line_spacing: number;
  scene_break_ornament: string;
  first_line_indent: boolean;
}

export const BOOK_THEMES: BookTheme[] = [
  {
    id: 'turath',
    name: 'Turath · تراث',
    tagline: 'Heritage naskh for novels — Amiri with generous air',
    font_family: 'Amiri',
    font_size: 12,
    line_spacing: 1.75,
    scene_break_ornament: '* * *',
    first_line_indent: true,
  },
  {
    id: 'hadatha',
    name: 'Hadatha · حداثة',
    tagline: 'Modern and crisp — Cairo for contemporary prose',
    font_family: 'Cairo',
    font_size: 11,
    line_spacing: 1.65,
    scene_break_ornament: '· · ·',
    first_line_indent: true,
  },
  {
    id: 'diwan',
    name: 'Diwan · ديوان',
    tagline: 'Literary clarity — Noto Naskh for long reads',
    font_family: 'Noto Naskh Arabic',
    font_size: 11.5,
    line_spacing: 1.7,
    scene_break_ornament: '• • •',
    first_line_indent: true,
  },
];

/** One-click theme application. Unknown ids leave the config untouched. */
export function applyBookTheme(
  config: BookFormatConfig,
  themeId: string
): BookFormatConfig {
  const theme = BOOK_THEMES.find((t) => t.id === themeId);
  if (!theme) return config;
  return {
    ...config,
    font_family: theme.font_family,
    font_size: theme.font_size,
    line_spacing: theme.line_spacing,
    scene_break_ornament: theme.scene_break_ornament,
    first_line_indent: theme.first_line_indent,
  };
}

/** Which curated theme (if any) the current config matches. */
export function detectBookTheme(config: BookFormatConfig): string | null {
  for (const t of BOOK_THEMES) {
    if (
      config.font_family === t.font_family &&
      Number(config.font_size) === t.font_size &&
      Number(config.line_spacing) === t.line_spacing &&
      config.scene_break_ornament === t.scene_break_ornament
    ) {
      return t.id;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Offline font embedding. The woff files in public/fonts (SIL OFL)    */
/* are fetched at export time and either embedded as base64 @font-face */
/* (print HTML → PDF) or packed into the EPUB archive — so exports     */
/* look identical on any machine, online or offline.                   */
/* ------------------------------------------------------------------ */

export interface EmbeddedFontFile {
  /** e.g. 'amiri-regular.woff' */
  filename: string;
  weight: string;
  style: string;
  mime: string;
  dataUrl: string;
  bytes: Uint8Array;
}

const EMBEDDABLE_FONTS: Record<string, { file: string; weight: string; style: string }[]> = {
  Amiri: [
    { file: 'amiri-regular.woff', weight: '400', style: 'normal' },
    { file: 'amiri-italic.woff', weight: '400', style: 'italic' },
    { file: 'amiri-bold.woff', weight: '700', style: 'normal' },
    { file: 'amiri-bolditalic.woff', weight: '700', style: 'italic' },
  ],
  'Noto Naskh Arabic': [
    { file: 'noto-naskh-arabic-regular.woff', weight: '400', style: 'normal' },
    { file: 'noto-naskh-arabic-bold.woff', weight: '700', style: 'normal' },
  ],
  Cairo: [
    { file: 'cairo-regular.woff', weight: '400', style: 'normal' },
    { file: 'cairo-bold.woff', weight: '700', style: 'normal' },
  ],
};

const embeddedFontCache = new Map<string, EmbeddedFontFile[]>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    } catch (err) {
      reject(err);
    }
  });
}

/** Fetch + cache the embeddable files for a family. Empty array = not bundled. */
export async function getEmbeddedFontFiles(fontFamily: string): Promise<EmbeddedFontFile[]> {
  const cached = embeddedFontCache.get(fontFamily);
  if (cached) return cached;
  const spec = EMBEDDABLE_FONTS[fontFamily];
  if (!spec) {
    embeddedFontCache.set(fontFamily, []);
    return [];
  }
  const out: EmbeddedFontFile[] = [];
  for (const entry of spec) {
    try {
      const res = await fetch(`fonts/${entry.file}`);
      if (!res.ok) continue;
      const blob = await res.blob();
      const [dataUrl, buffer] = await Promise.all([blobToDataUrl(blob), blob.arrayBuffer()]);
      if (!dataUrl.startsWith('data:')) continue;
      out.push({
        filename: entry.file,
        weight: entry.weight,
        style: entry.style,
        mime: 'font/woff',
        dataUrl,
        bytes: new Uint8Array(buffer),
      });
    } catch {
      // Offline oddity or missing file: skip this variant, keep the rest.
    }
  }
  embeddedFontCache.set(fontFamily, out);
  return out;
}

/** Base64 @font-face block for print HTML (self-contained, offline-safe). */
export async function buildEmbeddedFontCss(fontFamily: string): Promise<string> {
  const files = await getEmbeddedFontFiles(fontFamily);
  if (files.length === 0) return '';
  return files
    .map(
      (f) => `@font-face {\n  font-family: '${fontFamily}';\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url(${f.dataUrl}) format('woff');\n}`
    )
    .join('\n');
}

export const BOOK_LAYOUT = {
  marginTopIn: 0.75,
  marginBottomIn: 0.75,
  headerPt: 24,
  footerPt: 24,
  insideMarginIn: 0.85,
  outsideMarginIn: 0.65,
  headingReserveLines: 5,
} as const;

/**
 * Correct binding-aware margins.
 * LTR: recto (odd, right-hand page) binds on the LEFT, so left is the inside margin.
 * RTL: binding is mirrored — recto binds on the RIGHT.
 */
export function getPagePaddings(side: 'recto' | 'verso', isRtl: boolean): { left: string; right: string } {
  const inside = `${BOOK_LAYOUT.insideMarginIn}in`;
  const outside = `${BOOK_LAYOUT.outsideMarginIn}in`;
  if (!isRtl) {
    return side === 'recto'
      ? { left: inside, right: outside }
      : { left: outside, right: inside };
  }
  return side === 'recto'
    ? { left: outside, right: inside }
    : { left: inside, right: outside };
}

export type ReadingDirectionSetting = 'auto' | 'rtl' | 'ltr';

/** Strong-RTL scripts: Arabic, Hebrew, Syriac, Thaana, N'Ko, etc. */
const RTL_CHAR_RE = /[\u0591-\u07FF\u08A0-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g;
const LETTER_RE = /[\p{L}\p{N}]/u;

function countRtlLetters(text: string): { rtl: number; letters: number } {
  if (!text) return { rtl: 0, letters: 0 };
  const rtl = (text.match(RTL_CHAR_RE) || []).length;
  let letters = 0;
  for (const ch of text) {
    if (LETTER_RE.test(ch)) letters++;
  }
  return { rtl, letters };
}

/**
 * Detects the BOOK's own reading direction from its content (title, chapters,
 * front/back matter) — independent of the app UI language. An English UI can
 * still own an Arabic book and vice versa.
 */
export function detectBookRtl(
  novel: Novel,
  chapters: Chapter[],
  config: BookFormatConfig
): boolean {
  const samples: string[] = [
    novel.title || '',
    config.subtitle || '',
    config.author_name || '',
    config.dedication_text || '',
    config.epigraph_quote || '',
    config.foreword_title || '',
    config.foreword_content || '',
    config.epilogue_title || '',
    config.epilogue_content || '',
    config.acknowledgments_content || '',
    config.about_author_bio || '',
  ];
  const chapterSamples = chapters.slice(0, 8);
  for (const ch of chapterSamples) {
    samples.push(ch.title || '');
    if (ch.content) samples.push(ch.content.slice(0, 2000));
  }
  let rtl = 0;
  let letters = 0;
  for (const s of samples) {
    const c = countRtlLetters(s);
    rtl += c.rtl;
    letters += c.letters;
  }
  if (letters === 0) return false;
  // Arabic-script books typically show a high RTL ratio; 20% tolerates mixed
  // Arabic/English prose while English books with a few Arabic words stay LTR.
  return rtl / letters > 0.2;
}

/** Manual override wins; 'auto' (or legacy configs) falls back to detection. */
export function resolveBookRtl(
  novel: Novel,
  chapters: Chapter[],
  config: BookFormatConfig
): boolean {
  const setting = (config as { reading_direction?: string }).reading_direction;
  if (setting === 'rtl') return true;
  if (setting === 'ltr') return false;
  return detectBookRtl(novel, chapters, config);
}

export type TextMeasurer = (text: string) => number;

let sharedCanvasCtx: CanvasRenderingContext2D | null | undefined;
function getCanvasMeasurer(fontCss: string, fontSizePx: number): TextMeasurer | null {
  try {
    if (typeof document === 'undefined') return null;
    if (sharedCanvasCtx === undefined) {
      const canvas = document.createElement('canvas');
      sharedCanvasCtx = canvas.getContext('2d');
    }
    if (!sharedCanvasCtx) return null;
    const ctx = sharedCanvasCtx;
    ctx.font = `${fontSizePx}px ${fontCss}`;
    return (text: string) => {
      try {
        return ctx.measureText(text).width;
      } catch {
        return text.length * fontSizePx * 0.5;
      }
    };
  } catch {
    return null;
  }
}

// Character-count fallback (used in Node/tests where canvas is unavailable).
export function wrapTextToLines(text: string, charsPerLine: number, firstLineIndentChars = 0): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let currentLine = '';
  let maxLen = Math.max(15, charsPerLine - firstLineIndentChars);

  for (const word of words) {
    // A single word longer than a line gets its own line (avoids infinite loops;
    // browsers will break/overflow it, export CSS has overflow-wrap: break-word).
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxLen) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
      maxLen = charsPerLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/** Width-based wrapping using real font metrics when available. */
function wrapTextToLinesMeasured(
  text: string,
  maxWidthPx: number,
  measure: TextMeasurer,
  firstLineIndentPx = 0
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const spaceW = measure(' ');
  const lines: string[] = [];
  let currentLine = '';
  let currentWidth = 0;
  let limit = Math.max(40, maxWidthPx - firstLineIndentPx);
  for (const word of words) {
    const w = measure(word);
    if (!currentLine) {
      currentLine = word;
      currentWidth = w;
    } else if (currentWidth + spaceW + w <= limit) {
      currentLine += ' ' + word;
      currentWidth += spaceW + w;
    } else {
      lines.push(currentLine);
      currentLine = word;
      currentWidth = w;
      limit = maxWidthPx;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Paginates complete book structure into individual physical pages matching print trim specifications.
 */
export function paginateBook(
  novel: Novel,
  chapters: Chapter[],
  config: BookFormatConfig,
  isRtl = false
): BookPage[] {
  const trim = TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;
  const heightPx = trim.heightIn * 96;
  const widthPx = trim.widthIn * 96;
  const headerFooterPx = (BOOK_LAYOUT.headerPt + BOOK_LAYOUT.footerPt) * (96 / 72);
  const printableHeightPx =
    heightPx - (BOOK_LAYOUT.marginTopIn + BOOK_LAYOUT.marginBottomIn) * 96 - headerFooterPx;
  const fontSizePx = (config.font_size || 11) * (96 / 72);
  const lineSpacing = config.line_spacing || 1.45;
  const singleLineHeightPx = fontSizePx * lineSpacing;
  // Safety buffer: browsers round fractional line boxes up and Arabic book fonts
  // (Amiri, Scheherazade, Naskh) have tall ascenders/diacritics, so filling the
  // last fractional line clips descenders (see clipped-last-line report). One
  // spare line costs little and guarantees the final line is fully visible.
  const linesPerPage = Math.max(10, Math.floor(printableHeightPx / singleLineHeightPx) - 1);
  // Arabic heading glyphs need more vertical room than Latin at the same pt size.
  const headingReserve = BOOK_LAYOUT.headingReserveLines + (isRtl ? 1 : 0);
  // Reserve space for the chapter heading block (1.6x heading + top/bottom margins).
  const firstPageLines = Math.max(8, linesPerPage - headingReserve);
  const printableWidthPx = widthPx - (BOOK_LAYOUT.insideMarginIn + BOOK_LAYOUT.outsideMarginIn) * 96;
  const fontCss = getFontFamilyCss(config.font_family || 'Amiri');
  const canvasMeasure = getCanvasMeasurer(fontCss, fontSizePx);
  // Fallback estimate keeps Node/test environments working without a canvas.
  const avgCharWidthPx = fontSizePx * (isRtl ? 0.5 : 0.5);
  const charsPerLine = Math.max(25, Math.floor(printableWidthPx / avgCharWidthPx));
  const firstLineIndentPx = config.first_line_indent ? fontSizePx * 1.5 : 0;

  const wrapParagraph = (rawP: string, isFirstInChapter: boolean): string[] => {
    const indentPx = isFirstInChapter ? 0 : firstLineIndentPx;
    if (canvasMeasure) {
      return wrapTextToLinesMeasured(rawP, printableWidthPx, canvasMeasure, indentPx);
    }
    const indentChars = config.first_line_indent && !isFirstInChapter ? 3 : 0;
    return wrapTextToLines(rawP, charsPerLine, indentChars);
  };

  const pages: BookPage[] = [];
  let physicalPageCount = 0;
  let bodyPageNumber = 1;

  const addFrontMatterPage = (
    type: BookPage['type'],
    paragraphs: BookParagraph[],
    chapterTitle?: string
  ) => {
    physicalPageCount++;
    pages.push({
      id: `${type}_page_${physicalPageCount}`,
      pageNumber: null,
      side: physicalPageCount % 2 === 1 ? 'recto' : 'verso',
      type,
      chapterTitle,
      isChapterStart: true,
      paragraphs,
    });
  };

  // 1. Title Page (Recto, Page 1)
  if (config.has_title_page) {
    addFrontMatterPage('title', [{ text: novel.title }]);
  }

  // 2. Copyright Page (Verso, Page 2)
  if (config.has_copyright_page) {
    addFrontMatterPage('copyright', [{ text: novel.title }]);
  }

  // 3. Dedication (may span multiple pages instead of clipping)
  if (config.has_dedication && config.dedication_text) {
    const lines = config.dedication_text.split('\n').map((l) => l.trim()).filter(Boolean);
    const perPage = Math.max(8, linesPerPage - 6);
    for (let i = 0; i < lines.length; i += perPage) {
      addFrontMatterPage(
        'dedication',
        lines.slice(i, i + perPage).map((l) => ({ text: l }))
      );
    }
    if (lines.length === 0) addFrontMatterPage('dedication', []);
  }

  // 4. Epigraph (wrapped + paginated instead of clipping)
  if (config.has_epigraph && config.epigraph_quote) {
    const quoteLines = wrapParagraph(config.epigraph_quote, true);
    const quoteParas = quoteLines.length > 0
      ? [{ text: `«${quoteLines.join(' ')}»` }]
      : [{ text: `«${config.epigraph_quote}»` }];
    if (config.epigraph_author) quoteParas.push({ text: `— ${config.epigraph_author}` });
    addFrontMatterPage('epigraph', quoteParas);
  }

  // Helper to paginate body text. chapterTitle is kept on EVERY page of the
  // section so running headers work; isChapterStart marks only the first page
  // (which shows the heading and suppresses the header).
  function paginateTextSection(
    title: string,
    rawParas: string[],
    pageType: BookPage['type'],
    isNumbered = true
  ) {
    let isCurrentFirstPage = true;
    let linesRemaining = isCurrentFirstPage ? firstPageLines : linesPerPage;
    let pageParagraphs: BookParagraph[] = [];

    const flushPage = () => {
      if (pageParagraphs.length === 0) return;
      physicalPageCount++;
      const currentNum = isNumbered
        ? (config.include_page_numbers ? bodyPageNumber++ : null)
        : null;

      pages.push({
        id: `${pageType}_page_${physicalPageCount}`,
        pageNumber: currentNum,
        side: physicalPageCount % 2 === 1 ? 'recto' : 'verso',
        type: pageType,
        chapterTitle: title,
        isChapterStart: isCurrentFirstPage,
        paragraphs: pageParagraphs,
      });

      pageParagraphs = [];
      isCurrentFirstPage = false;
      linesRemaining = linesPerPage;
    };

    if (rawParas.length === 0) {
      rawParas = [isRtl ? '(محتوى الفصل فارغ حالياً...)' : '(Chapter content is currently empty...)'];
    }

    for (let pIdx = 0; pIdx < rawParas.length; pIdx++) {
      const rawP = rawParas[pIdx].trim();
      if (!rawP) continue;

      if (rawP === '* * *' || (config.scene_break_ornament && rawP === config.scene_break_ornament)) {
        if (linesRemaining < 3) {
          flushPage();
        }
        pageParagraphs.push({
          text: config.scene_break_ornament || '* * *',
          isSceneBreak: true,
        });
        linesRemaining -= 2;
        continue;
      }

      const isFirstInCh = isCurrentFirstPage && pageParagraphs.length === 0;
      let lines = wrapParagraph(rawP, isFirstInCh);
      let isContinuedFromPrev = false;

      // Orphan control: don't start a paragraph with < 2 lines left (unless it's the whole para).
      if (lines.length > linesRemaining && linesRemaining < 2 && pageParagraphs.length > 0) {
        flushPage();
      }

      while (lines.length > 0) {
        if (linesRemaining <= 0) {
          flushPage();
        }

        if (lines.length <= linesRemaining) {
          // Widow control: avoid leaving a single line for the next page when splitting
          // across pages is unavoidable — handled by keeping >= 2 lines together below.
          pageParagraphs.push({
            text: lines.join(' '),
            isFirstParagraph: isFirstInCh && !isContinuedFromPrev && linesRemaining === firstPageLines,
            isContinuation: isContinuedFromPrev,
          });
          linesRemaining -= lines.length;
          lines = [];
          isContinuedFromPrev = false;
        } else {
          if (linesRemaining >= 2) {
            let take = linesRemaining;
            // Avoid leaving a single widow line: if the remainder would be 1 line,
            // take one fewer line now (when possible).
            if (lines.length - take === 1 && take > 2) take -= 1;
            const fitLines = lines.slice(0, take);
            const remainderLines = lines.slice(take);
            pageParagraphs.push({
              text: fitLines.join(' '),
              isFirstParagraph: isFirstInCh && !isContinuedFromPrev && linesRemaining === firstPageLines,
              isContinuation: isContinuedFromPrev,
            });
            flushPage();
            lines = remainderLines;
            isContinuedFromPrev = true;
          } else {
            flushPage();
          }
        }
      }
    }

    if (pageParagraphs.length > 0) {
      flushPage();
    }
  }

  // 5. Foreword
  if (config.has_foreword && config.foreword_content) {
    const rawParas = config.foreword_content.split(/\n\n+/).filter(Boolean);
    paginateTextSection(
      config.foreword_title || (isRtl ? 'مقدمة' : 'Foreword'),
      rawParas,
      'foreword',
      false
    );
  }

  // 6. Chapters
  chapters.forEach((ch, chIdx) => {
    const chTitle = ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${chIdx + 1}`;
    const rawParas = ch.content.trim() ? ch.content.split(/\n\n+/).filter(Boolean) : [];
    paginateTextSection(chTitle, rawParas, 'chapter', true);
  });

  // 7. Epilogue
  if (config.has_epilogue && config.epilogue_content) {
    const rawParas = config.epilogue_content.split(/\n\n+/).filter(Boolean);
    paginateTextSection(
      config.epilogue_title || (isRtl ? 'خاتمة' : 'Epilogue'),
      rawParas,
      'epilogue',
      true
    );
  }

  // 8. Acknowledgments
  if (config.has_acknowledgments && config.acknowledgments_content) {
    const rawParas = config.acknowledgments_content.split(/\n\n+/).filter(Boolean);
    paginateTextSection(
      isRtl ? 'شكر وتقدير' : 'Acknowledgments',
      rawParas,
      'acknowledgments',
      true
    );
  }

  // 9. About Author
  if (config.has_about_author && config.about_author_bio) {
    const rawParas = config.about_author_bio.split(/\n\n+/).filter(Boolean);
    paginateTextSection(
      isRtl ? 'عن المؤلف' : 'About the Author',
      rawParas,
      'about_author',
      true
    );
  }

  return pages;
}

export class BookExportService {
  static paginateBook = paginateBook;
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

    // 3. Bundled fonts (offline-safe, store-proof: no remote resources).
    const fontFamily = config.font_family || 'Amiri';
    let embeddedFonts: EmbeddedFontFile[] = [];
    try {
      embeddedFonts = await getEmbeddedFontFiles(fontFamily);
    } catch {
      embeddedFonts = [];
    }
    const manifestItems: string[] = [
      '<item id="css" href="styles.css" media-type="text/css"/>',
      '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    ];
    const fontFaceCss = embeddedFonts
      .map(
        (f, i) => {
          const fontId = `font${i}`;
          manifestItems.push(
            `<item id="${fontId}" href="fonts/${f.filename}" media-type="${f.mime}"/>`
          );
          zip.file(`OEBPS/fonts/${f.filename}`, f.bytes);
          return `@font-face {\n  font-family: '${fontFamily}';\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  src: url('fonts/${f.filename}');\n}`;
        }
      )
      .join('\n');

    // 4. CSS Stylesheet
    const css = `
@charset "utf-8";
${fontFaceCss}
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
   * This is the SINGLE source of truth for print layout — the in-app preview
   * renders the same per-page HTML + CSS (see renderBookPageDiv / buildBookPrintCss).
   */
  static generatePrintHtml(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): string {
    const pages = paginateBook(novel, chapters, config, isRtl);
    return BookExportService.generatePrintHtmlFromPages(novel, pages, config, isRtl);
  }

  /** Pure HTML builder from an explicit page list (sync estimator or measured). */
  static generatePrintHtmlFromPages(
    novel: Novel,
    pages: BookPage[],
    config: BookFormatConfig,
    isRtl = true
  ): string {
    const pagesHtml = pages.map((page) => renderBookPageDiv(page, novel, config, isRtl)).join('\n');
    const css = buildBookPrintCss(config, isRtl);

    return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(novel.title)} - Print Edition</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  }

  /**
   * Measured variant: lays the book out with the browser's real line boxes
   * (after webfonts load) and prints THOSE pages — the same pages the preview
   * shows. This is what makes preview === PDF.
   */
  static async generatePrintHtmlAsync(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): Promise<string> {
    const pages = await paginateBookAsync(novel, chapters, config, isRtl);
    return BookExportService.generatePrintHtmlFromPagesAsync(novel, pages, config, isRtl);
  }

  /** Async variant that embeds the bundled book fonts (offline-safe output). */
  static async generatePrintHtmlFromPagesAsync(
    novel: Novel,
    pages: BookPage[],
    config: BookFormatConfig,
    isRtl = true
  ): Promise<string> {
    const base = BookExportService.generatePrintHtmlFromPages(novel, pages, config, isRtl);
    try {
      const embedded = await buildEmbeddedFontCss(config.font_family || 'Amiri');
      if (embedded) return base.replace('<style>', `<style>\n    ${embedded}`);
    } catch {
      /* fall through to the Google-Fonts fallback already in the stylesheet */
    }
    return base;
  }

  /**
   * Generates a Print-Ready PDF via the browser print pipeline using the EXACT
   * same HTML the preview renders. Waits for fonts + iframe load so the PDF
   * matches what was previewed instead of racing a fixed timeout.
   */
  static async exportPrintPdf(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): Promise<void> {
    const html = await BookExportService.generatePrintHtmlAsync(novel, chapters, config, isRtl);

    // Hidden iframe so Tauri/WebView2 doesn't trip popup blockers.
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

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 3000);
    };

    const doPrint = async () => {
      try {
        const win = iframe.contentWindow;
        const doc = win?.document as Document | undefined;
        // Wait for the iframe document + webfonts so metrics match the preview.
        try {
          if (doc?.fonts?.ready) {
            await Promise.race([
              doc.fonts.ready,
              new Promise((r) => setTimeout(r, 2500)),
            ]);
          } else if (document.fonts?.ready) {
            await Promise.race([
              document.fonts.ready,
              new Promise((r) => setTimeout(r, 2500)),
            ]);
          }
        } catch {
          /* fall through to print anyway */
        }
        // Extra frame so layout settles before the print snapshot.
        await new Promise((r) => setTimeout(r, 120));
        win?.focus();
        win?.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.print();
      } finally {
        cleanup();
      }
    };

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      if (iframe.parentNode) document.body.removeChild(iframe);
      window.print();
      return;
    }

    // Print on iframe load (reliable) with a fallback timer.
    let printed = false;
    const printOnce = () => {
      if (printed) return;
      printed = true;
      void doPrint();
    };
    iframe.onload = printOnce;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    setTimeout(printOnce, 1500);
  }

  /**
   * Downloads the standalone print-ready HTML document (measured pages).
   */
  static async downloadPrintHtml(
    novel: Novel,
    chapters: Chapter[],
    config: BookFormatConfig,
    isRtl = true
  ): Promise<void> {
    const html = await BookExportService.generatePrintHtmlAsync(novel, chapters, config, isRtl);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFilename(novel.title)}_PrintEdition.html`);
  }
}

/**
 * Shared print stylesheet — used by BOTH the PDF/print export document and the
 * in-app preview. Keeping one builder here is what guarantees WYSIWYG.
 */
export function buildBookPrintCss(config: BookFormatConfig, isRtl: boolean): string {
  const trim = TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;
  const fontCss = getFontFamilyCss(config.font_family || 'Amiri');
  const recto = getPagePaddings('recto', isRtl);
  const verso = getPagePaddings('verso', isRtl);
  return `
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@400;600;700;800;900&family=Cinzel:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Naskh+Arabic:wght@400;700&family=Readex+Pro:wght@400;600;700&family=Scheherazade+New:wght@400;700&display=swap');

    @page {
      size: ${trim.width} ${trim.height};
      margin: 0;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: #FFF;
      color: #111;
      font-family: ${fontCss};
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    .book-page {
      width: ${trim.width};
      height: ${trim.height};
      page-break-after: always;
      break-after: page;
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: #FFFFFC;
      color: #111111;
      font-family: ${fontCss};
      padding-top: ${BOOK_LAYOUT.marginTopIn}in;
      padding-bottom: ${BOOK_LAYOUT.marginBottomIn}in;
    }

    .book-page.recto { padding-left: ${recto.left}; padding-right: ${recto.right}; }
    .book-page.verso { padding-left: ${verso.left}; padding-right: ${verso.right}; }

    .page-header {
      height: ${BOOK_LAYOUT.headerPt}pt;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5pt;
      letter-spacing: 0.06em;
      opacity: 0.65;
      text-transform: uppercase;
      font-family: ${fontCss};
      flex-shrink: 0;
    }

    .page-body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      font-size: ${config.font_size || 11}pt;
      line-height: ${config.line_spacing || 1.45};
      direction: ${isRtl ? 'rtl' : 'ltr'};
      text-align: justify;
      overflow: hidden;
      overflow-wrap: break-word;
      hyphens: auto;
      /* Keep descenders/diacritics of the final line off the footer edge. */
      padding-bottom: 0.12em;
    }

    .page-footer {
      height: ${BOOK_LAYOUT.footerPt}pt;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: bold;
      font-family: ${fontCss};
      flex-shrink: 0;
    }

    .page-body p {
      margin: 0;
      text-indent: ${config.first_line_indent ? '1.5em' : '0'};
    }
    .page-body p.no-indent { text-indent: 0 !important; }

    .title-page-box {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      padding: 10% 0;
    }
    .novel-title { font-size: 2.3em; font-weight: 900; margin: 0 0 0.3em 0; line-height: 1.2; }
    .novel-subtitle { font-size: 1.15em; color: #555; font-style: italic; }
    .author-name { font-size: 1.4em; font-weight: bold; margin-bottom: 0.5em; }
    .publisher-name { font-size: 0.9em; color: #666; }

    .copyright-box {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      text-align: center;
      font-size: 0.85em;
      line-height: 1.7;
      padding-bottom: 10%;
    }
    .rights-notice { margin-top: 1.5em !important; font-size: 0.8em; opacity: 0.8; text-indent: 0 !important; }

    .dedication-box, .epigraph-box {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      font-style: italic;
      padding: 0 10%;
    }
    .dedication-line { margin: 0.5em 0; text-indent: 0 !important; font-size: 1.15em; }
    .epigraph-quote { font-size: 1.15em; text-indent: 0 !important; }
    .epigraph-author { margin-top: 1.2em; font-weight: bold; font-style: normal; text-indent: 0 !important; }

    .chapter-heading {
      text-align: center;
      font-size: 1.6em;
      font-weight: 800;
      margin-top: 1.2em;
      margin-bottom: 1.5em;
      line-height: 1.25;
      text-indent: 0 !important;
    }
    .scene-ornament {
      text-align: center;
      margin: 1.2em 0;
      letter-spacing: 0.25em;
      font-weight: bold;
      font-family: monospace;
      text-indent: 0 !important;
    }
    .chapter-body { height: 100%; }

    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  `;
}

const BODY_PAGE_TYPES: ReadonlySet<BookPage['type']> = new Set([
  'chapter', 'foreword', 'epilogue', 'acknowledgments', 'about_author',
]);

/** Running header is shown on body continuation pages (never on chapter openings). */
export function shouldShowBookPageHeader(page: BookPage): boolean {
  return !page.isChapterStart && BODY_PAGE_TYPES.has(page.type);
}

export function getBookPageHeaderText(page: BookPage, novelTitle: string): string {
  if (!shouldShowBookPageHeader(page)) return '';
  return page.side === 'verso' ? novelTitle : (page.chapterTitle || '');
}

/** Inner body HTML shared by export + preview. */
export function renderBookPageContent(
  page: BookPage,
  novel: Novel,
  config: BookFormatConfig,
  isRtl: boolean
): string {
  if (page.type === 'title') {
    return `
        <div class="title-page-box">
          <div class="title-top">
            <h1 class="novel-title">${escapeXml(novel.title)}</h1>
            ${config.subtitle ? `<div class="novel-subtitle">${escapeXml(config.subtitle)}</div>` : ''}
          </div>
          <div class="title-bottom">
            <div class="author-name">${escapeXml(config.author_name || (isRtl ? 'المؤلف' : 'Author'))}</div>
            ${config.publisher_name ? `<div class="publisher-name">${escapeXml(config.publisher_name)}</div>` : ''}
          </div>
        </div>`;
  }
  if (page.type === 'copyright') {
    return `
        <div class="copyright-box">
          <p><strong>${escapeXml(novel.title)}</strong></p>
          <p>© ${escapeXml(config.copyright_year || '2026')} ${escapeXml(config.author_name || '')}</p>
          ${config.edition_notice ? `<p>${escapeXml(config.edition_notice)}</p>` : ''}
          ${config.isbn ? `<p>ISBN: ${escapeXml(config.isbn)}</p>` : ''}
          ${config.publisher_name ? `<p>${escapeXml(config.publisher_name)}</p>` : ''}
          <p class="rights-notice">${
            isRtl
              ? 'جميع الحقوق محفوظة. لا يجوز إعادة إنتاج أي جزء من هذا العمل بأي شكل دون إذن مسبق.'
              : 'All rights reserved. No part of this book may be reproduced without written permission.'
          }</p>
        </div>`;
  }
  if (page.type === 'dedication') {
    return `
        <div class="dedication-box">
          ${page.paragraphs?.map((p) => `<p class="dedication-line">${escapeXml(p.text)}</p>`).join('\n') || ''}
        </div>`;
  }
  if (page.type === 'epigraph') {
    return `
        <div class="epigraph-box">
          ${page.paragraphs?.map((p, i) => `<p class="${i === 0 ? 'epigraph-quote' : 'epigraph-author'}">${escapeXml(p.text)}</p>`).join('\n') || ''}
        </div>`;
  }
  const headingHtml = page.isChapterStart && page.chapterTitle
    ? `<h2 class="chapter-heading">${escapeXml(page.chapterTitle)}</h2>`
    : '';
  const parasHtml = page.paragraphs?.map((p) => {
    if (p.isSceneBreak) return `<div class="scene-ornament">${escapeXml(p.text)}</div>`;
    const indentClass = (config.first_line_indent && !p.isFirstParagraph && !p.isContinuation) ? '' : 'no-indent';
    return `<p class="${indentClass}">${escapeXml(p.text)}</p>`;
  }).join('\n') || '';
  return `
        <div class="chapter-body">
          ${headingHtml}
          ${parasHtml}
        </div>`;
}

/** Full single-page div — identical markup for export and preview. */
export function renderBookPageDiv(
  page: BookPage,
  novel: Novel,
  config: BookFormatConfig,
  isRtl: boolean
): string {
  const trim = TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;
  const fontCss = getFontFamilyCss(config.font_family || 'Amiri');
  const pad = getPagePaddings(page.side, isRtl);
  const headerText = getBookPageHeaderText(page, novel.title);
  const footerNumber = page.pageNumber !== null ? `<span>${page.pageNumber}</span>` : '';
  // Structural layout is inlined (not only in the stylesheet) so the page keeps
  // its shape — footer pinned to the bottom edge — even if a stylesheet fails
  // to load or apply. The stylesheet still owns typography.
  return `
      <div class="book-page ${page.side} ${page.type}" style="display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative;box-sizing:border-box;width:${trim.width};height:${trim.height};padding-top:${BOOK_LAYOUT.marginTopIn}in;padding-bottom:${BOOK_LAYOUT.marginBottomIn}in;padding-left:${pad.left};padding-right:${pad.right};background:#FFFFFC;color:#111111;font-family:${fontCss};">
        <div class="page-header" style="height:${BOOK_LAYOUT.headerPt}pt;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${headerText ? escapeXml(headerText) : ''}</div>
        <div class="page-body" style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden;">${renderBookPageContent(page, novel, config, isRtl)}</div>
        <div class="page-footer" style="height:${BOOK_LAYOUT.footerPt}pt;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${footerNumber}</div>
      </div>`;
}

/* ------------------------------------------------------------------ */
/* DOM-measured pagination (browser only)                              */
/*                                                                     */
/* The estimator above guesses line breaks from average character      */
/* widths. For Arabic book fonts (tall diacritics, complex shaping)    */
/* those guesses drift from reality: pages come out half-empty while   */
/* the footer floats mid-page, or the last line clips. This engine     */
/* instead lays the real paragraphs out in a hidden measurer that uses */
/* the exact print width, font, and inline styles, then reads the      */
/* browser's actual line boxes (Range.getClientRects) and packs pages  */
/* to the real content height. Preview and PDF share these pages, so   */
/* what you see is what prints. Falls back to the estimator when no    */
/* DOM exists (Node/tests) or measurement throws.                      */
/* ------------------------------------------------------------------ */

function waitForBookFonts(timeoutMs = 3000): Promise<void> {
  try {
    const fonts = (document as Document).fonts;
    if (!fonts || !fonts.ready) return Promise.resolve();
    return Promise.race([
      fonts.ready.then(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    return Promise.resolve();
  }
}

/** Number of rendered line boxes + representative line height for an element. */
function measureTextBlock(el: HTMLElement, fallbackLh: number): { lines: number; lh: number } {
  const node = el.firstChild;
  if (!node || !node.textContent || !node.textContent.trim()) {
    return { lines: 0, lh: fallbackLh };
  }
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = Array.from(range.getClientRects());
  if (rects.length === 0) return { lines: 0, lh: fallbackLh };
  const tops: number[] = [];
  for (const r of rects) {
    if (tops.length === 0 || r.top - tops[tops.length - 1] > 1) tops.push(r.top);
  }
  const lh = tops.length > 1 ? tops[1] - tops[0] : rects[0].height || fallbackLh;
  return { lines: tops.length, lh: lh > 0 ? lh : fallbackLh };
}

export async function paginateBookAsync(
  novel: Novel,
  chapters: Chapter[],
  config: BookFormatConfig,
  isRtl = false
): Promise<BookPage[]> {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return paginateBook(novel, chapters, config, isRtl);
    }
    await waitForBookFonts();
    const pages = measureBookPages(novel, chapters, config, isRtl);
    if (!pages || pages.length === 0) {
      return paginateBook(novel, chapters, config, isRtl);
    }
    return pages;
  } catch (err) {
    console.warn('Measured pagination unavailable, using estimate:', err);
    return paginateBook(novel, chapters, config, isRtl);
  }
}

interface MeasuredQueuePara {
  w: 'p';
  words: string[];
  /** First paragraph of its section (no indent on its opening slice). */
  first: boolean;
  /** Slice continued from a previous page (no indent, mid-sentence). */
  continued: boolean;
  /** Representative line height in px. */
  lh: number;
  /** As-built line count; valid only while `pristine` (untouched slice). */
  lines: number;
  pristine: boolean;
}

interface MeasuredQueueOrnament {
  w: 'o';
  text: string;
  height: number;
}

type MeasuredQueueItem = MeasuredQueuePara | MeasuredQueueOrnament;

function measureBookPages(
  novel: Novel,
  chapters: Chapter[],
  config: BookFormatConfig,
  isRtl: boolean
): BookPage[] {
  const trim = TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;
  const fontCss = getFontFamilyCss(config.font_family || 'Amiri');
  const fontSizePx = (config.font_size || 11) * (96 / 72);
  const lineSpacing = config.line_spacing || 1.45;
  const fallbackLh = fontSizePx * lineSpacing;
  const contentW =
    trim.widthIn * 96 - (BOOK_LAYOUT.insideMarginIn + BOOK_LAYOUT.outsideMarginIn) * 96;
  const rawContentH =
    trim.heightIn * 96 -
    (BOOK_LAYOUT.marginTopIn + BOOK_LAYOUT.marginBottomIn) * 96 -
    (BOOK_LAYOUT.headerPt + BOOK_LAYOUT.footerPt) * (96 / 72);
  // Tiny epsilon only: measurement is exact, so unlike the estimator this does
  // not need a spare-line buffer — pages stay full AND unclipped.
  const budgetFull = Math.max(200, rawContentH - 4);
  const headingPx = fontSizePx * 1.6;
  const headingMarginTop = 1.2 * headingPx;
  const headingMarginBottom = 1.5 * headingPx;
  const headingLineHeight = 1.25 * headingPx;
  const ornamentMarginV = 1.2 * fontSizePx;

  const pages: BookPage[] = [];
  let physicalPageCount = 0;
  let bodyPageNumber = 1;

  const pushPage = (
    type: BookPage['type'],
    chapterTitle: string | undefined,
    isChapterStart: boolean,
    paragraphs: BookParagraph[],
    numbered: boolean
  ) => {
    if (paragraphs.length === 0) return;
    physicalPageCount++;
    pages.push({
      id: `${type}_page_${physicalPageCount}`,
      pageNumber: numbered ? (config.include_page_numbers ? bodyPageNumber++ : null) : null,
      side: physicalPageCount % 2 === 1 ? 'recto' : 'verso',
      type,
      chapterTitle,
      isChapterStart,
      paragraphs,
    });
  };

  const pushFrontMatter = (
    type: BookPage['type'],
    paragraphs: BookParagraph[],
    chapterTitle?: string
  ) => {
    physicalPageCount++;
    pages.push({
      id: `${type}_page_${physicalPageCount}`,
      pageNumber: null,
      side: physicalPageCount % 2 === 1 ? 'recto' : 'verso',
      type,
      chapterTitle,
      isChapterStart: true,
      paragraphs,
    });
  };

  // ---- front matter: fixed boxes (same rules as the estimator)
  if (config.has_title_page) {
    pushFrontMatter('title', [{ text: novel.title }]);
  }
  if (config.has_copyright_page) {
    pushFrontMatter('copyright', [{ text: novel.title }]);
  }
  if (config.has_dedication && config.dedication_text) {
    const lines = config.dedication_text.split('\n').map((l) => l.trim()).filter(Boolean);
    const estLines = Math.max(10, Math.floor(rawContentH / fallbackLh) - 1);
    const perPage = Math.max(8, estLines - 6);
    for (let i = 0; i < lines.length; i += perPage) {
      pushFrontMatter('dedication', lines.slice(i, i + perPage).map((l) => ({ text: l })));
    }
    if (lines.length === 0) pushFrontMatter('dedication', []);
  }
  if (config.has_epigraph && config.epigraph_quote) {
    const paras: BookParagraph[] = [{ text: `«${config.epigraph_quote}»` }];
    if (config.epigraph_author) paras.push({ text: `— ${config.epigraph_author}` });
    pushFrontMatter('epigraph', paras);
  }

  // ---- hidden measurer: exact print width + typography, inline styles only
  // (immune to whatever stylesheets the host page does or doesn't apply).
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed!important;top:0;left:-30000px;width:10px;height:10px;' +
    'overflow:hidden!important;visibility:hidden;pointer-events:none;';
  const baseCss =
    `width:${contentW}px;margin:0;padding:0;font-family:${fontCss};` +
    `font-size:${fontSizePx}px;line-height:${lineSpacing};text-align:justify;overflow-wrap:break-word;`;
  const flow = document.createElement('div');
  flow.dir = isRtl ? 'rtl' : 'ltr';
  flow.lang = isRtl ? 'ar' : 'en';
  flow.style.cssText = baseCss;
  flow.style.hyphens = 'auto';
  const splitBox = document.createElement('div');
  splitBox.dir = flow.dir;
  splitBox.lang = flow.lang;
  splitBox.style.cssText = baseCss;
  splitBox.style.hyphens = 'auto';
  host.appendChild(flow);
  host.appendChild(splitBox);
  document.body.appendChild(host);

  const mkPara = (text: string, indent: boolean): HTMLParagraphElement => {
    const p = document.createElement('p');
    p.style.margin = '0';
    p.style.padding = '0';
    p.style.textIndent = indent ? `${fontSizePx * 1.5}px` : '0';
    p.textContent = text;
    return p;
  };
  const mkHeading = (text: string): HTMLElement => {
    const h = document.createElement('h2');
    h.style.margin = `${headingMarginTop}px 0 ${headingMarginBottom}px 0`;
    h.style.padding = '0';
    h.style.textAlign = 'center';
    h.style.fontWeight = '800';
    h.style.fontSize = `${headingPx}px`;
    h.style.lineHeight = '1.25';
    h.style.textIndent = '0';
    h.textContent = text;
    return h;
  };
  const mkOrnament = (text: string): HTMLElement => {
    const d = document.createElement('div');
    d.style.textAlign = 'center';
    d.style.margin = `${ornamentMarginV}px 0`;
    d.style.padding = '0';
    d.style.letterSpacing = '0.25em';
    d.style.fontWeight = 'bold';
    d.style.fontFamily = 'monospace';
    d.style.textIndent = '0';
    d.textContent = text;
    return d;
  };
  /** Rendered line count of these words in the exact body style. */
  const linesOfWords = (words: string[], indent: boolean): number => {
    if (words.length === 0) return 0;
    splitBox.innerHTML = '';
    const p = mkPara(words.join(' '), indent);
    splitBox.appendChild(p);
    return measureTextBlock(p, fallbackLh).lines;
  };
  /** Largest word-prefix whose rendered lines fit within maxLines. */
  const maxWordsFit = (words: string[], maxLines: number, indent: boolean): number => {
    let lo = 0;
    let hi = words.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (linesOfWords(words.slice(0, mid), indent) <= maxLines) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  try {
    // ---- collect body sections (same order + titles as the estimator)
    const sections: { title: string; rawParas: string[]; type: BookPage['type']; numbered: boolean }[] = [];
    if (config.has_foreword && config.foreword_content) {
      sections.push({
        title: config.foreword_title || (isRtl ? 'مقدمة' : 'Foreword'),
        rawParas: config.foreword_content.split(/\n\n+/).filter(Boolean),
        type: 'foreword',
        numbered: false,
      });
    }
    chapters.forEach((ch, chIdx) => {
      sections.push({
        title: ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${chIdx + 1}`,
        rawParas: ch.content.trim() ? ch.content.split(/\n\n+/).filter(Boolean) : [],
        type: 'chapter',
        numbered: true,
      });
    });
    if (config.has_epilogue && config.epilogue_content) {
      sections.push({
        title: config.epilogue_title || (isRtl ? 'خاتمة' : 'Epilogue'),
        rawParas: config.epilogue_content.split(/\n\n+/).filter(Boolean),
        type: 'epilogue',
        numbered: true,
      });
    }
    if (config.has_acknowledgments && config.acknowledgments_content) {
      sections.push({
        title: isRtl ? 'شكر وتقدير' : 'Acknowledgments',
        rawParas: config.acknowledgments_content.split(/\n\n+/).filter(Boolean),
        type: 'acknowledgments',
        numbered: true,
      });
    }
    if (config.has_about_author && config.about_author_bio) {
      sections.push({
        title: isRtl ? 'عن المؤلف' : 'About the Author',
        rawParas: config.about_author_bio.split(/\n\n+/).filter(Boolean),
        type: 'about_author',
        numbered: true,
      });
    }

    // ---- Phase A: build every block (no measurement yet)
    interface BuiltBlock {
      sectionIdx: number;
      kind: 'heading' | 'para' | 'ornament';
      el: HTMLElement;
      text: string;
      words: string[];
      first: boolean;
    }
    const built: BuiltBlock[][] = sections.map((sec, sectionIdx) => {
      const list: BuiltBlock[] = [];
      const headingEl = mkHeading(sec.title);
      flow.appendChild(headingEl);
      list.push({ sectionIdx, kind: 'heading', el: headingEl, text: sec.title, words: [], first: true });

      let paras = sec.rawParas.map((p) => p.trim()).filter(Boolean);
      if (paras.length === 0) {
        paras = [isRtl ? '(محتوى الفصل فارغ حالياً...)' : '(Chapter content is currently empty...)'];
      }
      let seenFirstPara = false;
      for (const rawP of paras) {
        if (rawP === '* * *' || (config.scene_break_ornament && rawP === config.scene_break_ornament)) {
          const oEl = mkOrnament(config.scene_break_ornament || '* * *');
          flow.appendChild(oEl);
          list.push({ sectionIdx, kind: 'ornament', el: oEl, text: config.scene_break_ornament || '* * *', words: [], first: false });
          continue;
        }
        const isFirst = !seenFirstPara;
        seenFirstPara = true;
        const indent = !!config.first_line_indent && !isFirst;
        const pEl = mkPara(rawP, indent);
        flow.appendChild(pEl);
        list.push({
          sectionIdx, kind: 'para', el: pEl, text: rawP,
          words: rawP.split(/\s+/).filter(Boolean), first: isFirst,
        });
      }
      return list;
    });

    // ---- Phase B: measure everything in one layout pass (no DOM writes here)
    interface MeasuredItem {
      kind: 'heading' | 'para' | 'ornament';
      height: number;
      el?: HTMLParagraphElement;
      words?: string[];
      lines?: number;
      lh?: number;
      first?: boolean;
      text?: string;
    }
    const measured: MeasuredItem[][] = built.map((blocks) =>
      blocks.map((b) => {
        if (b.kind === 'heading') {
          return {
            kind: 'heading' as const,
            height: (b.el as HTMLElement).offsetHeight + headingMarginTop + headingMarginBottom,
          };
        }
        if (b.kind === 'ornament') {
          return {
            kind: 'ornament' as const,
            height: (b.el as HTMLElement).offsetHeight + ornamentMarginV * 2,
            text: b.text,
          };
        }
        const m = measureTextBlock(b.el as HTMLParagraphElement, fallbackLh);
        return {
          kind: 'para' as const,
          height: 0,
          el: b.el as HTMLParagraphElement,
          words: b.words,
          lines: m.lines,
          lh: m.lh,
          first: b.first,
        };
      })
    );

    // ---- Phase C: pack sections into pages (each section starts a fresh page)
    sections.forEach((sec, sIdx) => {
      const items = measured[sIdx];
      const heading = items[0];
      const headingH = heading.kind === 'heading' ? heading.height : headingLineHeight + headingMarginTop + headingMarginBottom;

      let firstPage = true;
      let remaining = Math.max(120, budgetFull - headingH);
      let cur: BookParagraph[] = [];
      const flush = () => {
        if (cur.length === 0) return;
        pushPage(sec.type, sec.title, firstPage, cur, sec.numbered);
        cur = [];
        firstPage = false;
        remaining = budgetFull;
      };

      // Queue of splittable content (heading is implicit on the first page).
      const queue: MeasuredQueueItem[] = [];
      for (let i = 1; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'ornament') {
          queue.push({ w: 'o', text: it.text || '', height: it.height });
        } else if (it.kind === 'para') {
          queue.push({
            w: 'p',
            words: [...(it.words || [])],
            first: !!it.first,
            continued: false,
            lh: it.lh || fallbackLh,
            // As-built rendered line count (exact while the slice is untouched
            // and keeps its original indent style).
            lines: it.lines ?? 0,
            pristine: true,
          });
        }
      }

      const minHeightOf = (it: MeasuredQueueItem): number => {
        if (it.w === 'o') return it.height;
        return Math.min(2 * it.lh, Math.max(it.lh, it.words.length > 0 ? it.lh : 0));
      };

      let guard = 0;
      while (queue.length > 0) {
        if (++guard > 20000) break; // absolute safety against infinite loops
        const head = queue[0];

        if (head.w === 'o') {
          if (head.height > remaining + 0.5) {
            flush();
            continue;
          }
          // Keep ornaments with the text that follows them.
          if (queue.length > 1 && remaining - head.height < minHeightOf(queue[1]) - 0.5) {
            flush();
            continue;
          }
          cur.push({ text: head.text, isSceneBreak: true });
          remaining -= head.height;
          queue.shift();
          continue;
        }

        // Paragraph head: the opening slice of a section's first paragraph and
        // all continuation slices render WITHOUT first-line indent (exactly
        // like the renderer); everything else keeps the indent.
        const isOpeningSlice =
          head.first && firstPage && cur.length === 0 && !head.continued;
        const sliceIndent = !!config.first_line_indent && !isOpeningSlice && !head.continued;
        // Untouched slices reuse the as-built measurement ONLY when the indent
        // style matches (e.g. a section opening with an ornament pushes its
        // first paragraph off the opening slice, changing its indent).
        const asBuiltIndent = !!config.first_line_indent && !head.first;
        const totalLines = (head.pristine && sliceIndent === asBuiltIndent)
          ? head.lines
          : linesOfWords(head.words, sliceIndent);
        const lh = head.lh;

        if (totalLines <= 0) {
          queue.shift();
          continue;
        }
        if (totalLines * lh <= remaining + 0.5) {
          cur.push({
            text: head.words.join(' '),
            isFirstParagraph: isOpeningSlice,
            isContinuation: head.continued,
          });
          remaining -= totalLines * lh;
          queue.shift();
          continue;
        }
        // Needs a split.
        if (remaining < 2 * lh - 0.5) {
          flush();
          continue;
        }
        const maxFit = Math.max(1, Math.floor((remaining + 0.5) / lh));
        let n = maxWordsFit(head.words, maxFit, sliceIndent);
        if (n <= 0) n = 1; // degenerate (e.g. one giant unbreakable word): force progress
        if (n >= head.words.length) {
          // Measurement says it fits after all (rounding): place whole.
          cur.push({
            text: head.words.join(' '),
            isFirstParagraph: isOpeningSlice,
            isContinuation: head.continued,
          });
          remaining -= linesOfWords(head.words, sliceIndent) * lh;
          queue.shift();
          continue;
        }
        let fitLines = linesOfWords(head.words.slice(0, n), sliceIndent);
        let restWords = head.words.slice(n);
        let restLines = linesOfWords(restWords, false);
        if (restLines === 1 && fitLines > 2) {
          // Widow control: don't strand a single line on the next page.
          const n2 = maxWordsFit(head.words, fitLines - 1, sliceIndent);
          if (n2 > 0 && n2 < head.words.length) {
            n = n2;
            fitLines = linesOfWords(head.words.slice(0, n), sliceIndent);
            restWords = head.words.slice(n);
            restLines = linesOfWords(restWords, false);
          }
        }
        void restLines;
        cur.push({
          text: head.words.slice(0, n).join(' '),
          isFirstParagraph: isOpeningSlice,
          isContinuation: head.continued,
        });
        remaining -= Math.max(1, fitLines) * lh;
        flush();
        queue[0] = { w: 'p', words: restWords, first: false, continued: true, lh, lines: 0, pristine: false };
      }

      flush();
    });
  } finally {
    host.remove();
  }

  return pages;
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
