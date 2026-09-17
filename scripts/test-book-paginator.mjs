import assert from 'node:assert';

// Verification test for Book Studio Paged Layout Engine
// Based on algorithms in src/services/bookExportService.ts

const TRIM_SIZES = {
  us_trade_6x9: { name: 'US Trade 6"x9"', width: '6in', height: '9in', widthIn: 6, heightIn: 9, aspectRatio: 6 / 9 },
  digest_5_5x8_5: { name: 'Digest 5.5"x8.5"', width: '5.5in', height: '8.5in', widthIn: 5.5, heightIn: 8.5, aspectRatio: 5.5 / 8.5 },
  pocket_5x8: { name: 'Pocket Book 5"x8"', width: '5in', height: '8in', widthIn: 5, heightIn: 8, aspectRatio: 5 / 8 },
  mass_market: { name: 'Mass Market 4.25"x6.87"', width: '4.25in', height: '6.87in', widthIn: 4.25, heightIn: 6.87, aspectRatio: 4.25 / 6.87 },
  a5: { name: 'A5 International (148 x 210 mm)', width: '5.83in', height: '8.27in', widthIn: 5.83, heightIn: 8.27, aspectRatio: 5.83 / 8.27 },
  letter: { name: 'Standard Letter (8.5" x 11")', width: '8.5in', height: '11in', widthIn: 8.5, heightIn: 11, aspectRatio: 8.5 / 11 },
};

function wrapTextToLines(text, charsPerLine, firstLineIndentChars = 0) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let currentLine = '';
  let maxLen = Math.max(15, charsPerLine - firstLineIndentChars);

  for (const word of words) {
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

function getPagePaddings(side, isRtl) {
  const inside = '0.85in';
  const outside = '0.65in';
  if (!isRtl) {
    return side === 'recto' ? { left: inside, right: outside } : { left: outside, right: inside };
  }
  return side === 'recto' ? { left: outside, right: inside } : { left: inside, right: outside };
}

const BODY_PAGE_TYPES = new Set(['chapter', 'foreword', 'epilogue', 'acknowledgments', 'about_author']);
function shouldShowBookPageHeader(page) {
  return !page.isChapterStart && BODY_PAGE_TYPES.has(page.type);
}

function paginateBook(novel, chapters, config, isRtl = false) {
  const trim = TRIM_SIZES[config.trim_size || 'us_trade_6x9'] || TRIM_SIZES.us_trade_6x9;
  const heightPx = trim.heightIn * 96;
  const widthPx = trim.widthIn * 96;
  const headerFooterPx = (24 + 24) * (96 / 72);
  const printableHeightPx = heightPx - (0.75 + 0.75) * 96 - headerFooterPx;
  const fontSizePx = (config.font_size || 11) * (96 / 72);
  const lineSpacing = config.line_spacing || 1.45;
  const singleLineHeightPx = fontSizePx * lineSpacing;
  const linesPerPage = Math.max(10, Math.floor(printableHeightPx / singleLineHeightPx) - 1);
  const firstPageLines = Math.max(8, linesPerPage - (5 + (isRtl ? 1 : 0)));
  const printableWidthPx = widthPx - (0.85 + 0.65) * 96;
  const avgCharWidthPx = fontSizePx * 0.5;
  const charsPerLine = Math.max(25, Math.floor(printableWidthPx / avgCharWidthPx));

  const pages = [];
  let physicalPageCount = 0;
  let bodyPageNumber = 1;

  const addFrontMatterPage = (type, paragraphs, chapterTitle) => {
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

  if (config.has_title_page) {
    addFrontMatterPage('title', [{ text: novel.title }]);
  }
  if (config.has_copyright_page) {
    addFrontMatterPage('copyright', [{ text: novel.title }]);
  }
  if (config.has_dedication && config.dedication_text) {
    const lines = config.dedication_text.split('\n').map((l) => l.trim()).filter(Boolean);
    const perPage = Math.max(8, linesPerPage - 6);
    for (let i = 0; i < lines.length; i += perPage) {
      addFrontMatterPage('dedication', lines.slice(i, i + perPage).map((l) => ({ text: l })));
    }
    if (lines.length === 0) addFrontMatterPage('dedication', []);
  }
  if (config.has_epigraph && config.epigraph_quote) {
    addFrontMatterPage('epigraph', [
      { text: `«${config.epigraph_quote}»` },
      ...(config.epigraph_author ? [{ text: `— ${config.epigraph_author}` }] : []),
    ]);
  }

  function paginateTextSection(title, rawParas, pageType, isNumbered = true) {
    let isCurrentFirstPage = true;
    let linesRemaining = isCurrentFirstPage ? firstPageLines : linesPerPage;
    let pageParagraphs = [];

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
      const indentChars = (config.first_line_indent && !isFirstInCh) ? 3 : 0;
      let lines = wrapTextToLines(rawP, charsPerLine, indentChars);
      let isContinuedFromPrev = false;

      if (lines.length > linesRemaining && linesRemaining < 2 && pageParagraphs.length > 0) {
        flushPage();
      }

      while (lines.length > 0) {
        if (linesRemaining <= 0) {
          flushPage();
        }

        if (lines.length <= linesRemaining) {
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

  chapters.forEach((ch, chIdx) => {
    const chTitle = ch.title || `${isRtl ? 'الفصل' : 'Chapter'} ${chIdx + 1}`;
    const rawParas = ch.content.trim() ? ch.content.split(/\n\n+/).filter(Boolean) : [];
    paginateTextSection(chTitle, rawParas, 'chapter', true);
  });

  return pages;
}

// 1. Basic pagination check
const novel = { title: 'The Silent Hour' };
const chapters = [
  {
    title: 'Chapter 1: Arrival',
    content: Array(15).fill('The morning sun filtered through the dense fog, illuminating the ancient cobbled streets of the forgotten harbor town. Ships swayed gently at the docks, their wooden masts creaking against the rhythmic salt tides. In the distance, the tower bell chimed seven times, signaling the start of another long trading day.').join('\n\n'),
  },
  {
    title: 'Chapter 2: Departure',
    content: Array(10).fill('Night fell quickly upon the valley, casting long blue shadows over the winding mountain pass. A lone traveler hurried toward the warm lantern light of the distant tavern, shivering in the biting alpine wind.').join('\n\n'),
  }
];

const config = {
  has_title_page: true,
  has_copyright_page: true,
  has_dedication: true,
  dedication_text: 'For all the dreamers and storytellers.',
  trim_size: 'us_trade_6x9',
  font_size: 11,
  line_spacing: 1.45,
  first_line_indent: true,
  include_page_numbers: true,
  scene_break_ornament: '* * *',
};

const pages = paginateBook(novel, chapters, config, false);
console.log(`Paginator generated ${pages.length} total pages.`);

// Verify front matter
assert.strictEqual(pages[0].type, 'title', 'Page 1 must be Title Page');
assert.strictEqual(pages[0].pageNumber, null, 'Title page must omit page number');
assert.strictEqual(pages[0].side, 'recto', 'Page 1 must be recto');

assert.strictEqual(pages[1].type, 'copyright', 'Page 2 must be Copyright Page');
assert.strictEqual(pages[1].pageNumber, null, 'Copyright page must omit page number');
assert.strictEqual(pages[1].side, 'verso', 'Page 2 must be verso');

assert.strictEqual(pages[2].type, 'dedication', 'Page 3 must be Dedication Page');
assert.strictEqual(pages[2].pageNumber, null, 'Dedication page must omit page number');

// Verify chapter 1 start
const ch1Page = pages[3];
assert.strictEqual(ch1Page.type, 'chapter', 'Page 4 must be Chapter');
assert.strictEqual(ch1Page.isChapterStart, true, 'Chapter 1 first page must be chapter start');
assert.strictEqual(ch1Page.chapterTitle, 'Chapter 1: Arrival', 'Chapter 1 title must match');
assert.strictEqual(ch1Page.pageNumber, 1, 'Body text starts sequential numbering at 1');

// Verify consecutive page numbering in body
const bodyPages = pages.filter(p => p.type === 'chapter');
for (let i = 0; i < bodyPages.length; i++) {
  assert.strictEqual(bodyPages[i].pageNumber, i + 1, `Body page ${i} must have sequential number ${i + 1}`);
}

// Verify trim size scaling (Pocket has smaller page, so should yield more pages)
const pocketConfig = { ...config, trim_size: 'pocket_5x8' };
const pocketPages = paginateBook(novel, chapters, pocketConfig, false);
console.log(`Pocket trim generated ${pocketPages.length} pages (vs ${pages.length} for US Trade).`);
assert(pocketPages.length > pages.length, 'Pocket trim must produce more pages than US Trade due to smaller trim size');

// Running headers: continuation pages keep the chapter title (header source),
// only the opening page is marked as chapter start.
const ch1Continuation = bodyPages.find(p => !p.isChapterStart);
assert(ch1Continuation, 'Long chapter must produce continuation pages');
assert.strictEqual(ch1Continuation.chapterTitle, 'Chapter 1: Arrival', 'Continuation pages must retain chapter title for running headers');
assert.strictEqual(shouldShowBookPageHeader(ch1Continuation), true, 'Continuation body pages must show running header');
assert.strictEqual(shouldShowBookPageHeader(ch1Page), false, 'Chapter opening pages must suppress running header');

// Gutters: inside margin (binding side) must be the larger 0.85in.
assert.deepStrictEqual(getPagePaddings('recto', false), { left: '0.85in', right: '0.65in' }, 'LTR recto binds on the left');
assert.deepStrictEqual(getPagePaddings('verso', false), { left: '0.65in', right: '0.85in' }, 'LTR verso binds on the right');
assert.deepStrictEqual(getPagePaddings('recto', true), { left: '0.65in', right: '0.85in' }, 'RTL recto binds on the right');
assert.deepStrictEqual(getPagePaddings('verso', true), { left: '0.85in', right: '0.65in' }, 'RTL verso binds on the left');

// Long dedication must paginate instead of clipping on one page.
const longDedicationConfig = { ...config, dedication_text: Array(40).fill('For all the dreamers who read past midnight.').join('\n') };
const dedicationPages = paginateBook(novel, [], longDedicationConfig, false).filter(p => p.type === 'dedication');
assert(dedicationPages.length > 1, 'Long dedication must span multiple pages instead of clipping');

// Verify Arabic RTL pagination
const arNovel = { title: 'الساعة الصامتة' };
const arChapters = [
  {
    title: 'الفصل الأول: الوصول',
    content: Array(10).fill('كانت الشمس تشرق رويداً رويداً فوق المدينة القديمة، لتكشف عن ملامح أزقتها الضيقة ومبانيها العتيقة. وقف يوسف عند مدخل الميناء يراقب السفن الراسية في صمت، بينما كانت أمواج البحر تلامس الصخور بإيقاع متكرر. تذكر رحلته الطويلة التي قطعها للوصول إلى هذا المكان المجهول.').join('\n\n'),
  }
];
const arPages = paginateBook(arNovel, arChapters, config, true);
console.log(`Arabic RTL generated ${arPages.length} pages.`);
assert(arPages.length > 0, 'Arabic RTL must generate pages');
assert.strictEqual(arPages[3].chapterTitle, 'الفصل الأول: الوصول');

// Book-language detection follows content, not UI language.
const RTL_CHAR_RE = /[\u0591-\u07FF\u08A0-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g;
function detectRtlForTest(novel, chapters, cfg) {
  const samples = [novel.title || '', cfg.dedication_text || ''];
  for (const ch of chapters.slice(0, 8)) {
    samples.push(ch.title || '');
    if (ch.content) samples.push(ch.content.slice(0, 2000));
  }
  let rtl = 0, letters = 0;
  for (const s of samples) {
    rtl += (s.match(RTL_CHAR_RE) || []).length;
    for (const c of s) { if (/[\p{L}\p{N}]/u.test(c)) letters++; }
  }
  if (letters === 0) return false;
  return rtl / letters > 0.2;
}
assert.strictEqual(detectRtlForTest(arNovel, arChapters, config), true, 'Arabic content must detect as RTL even with an English UI');
assert.strictEqual(detectRtlForTest(novel, chapters, config), false, 'English content must detect as LTR');
assert.strictEqual(detectRtlForTest({ title: '' }, [], config), false, 'Empty book must default to LTR');

console.log('✓ All Book Paginator self-check assertions passed successfully!');
