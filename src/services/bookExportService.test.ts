import { describe, expect, it } from 'vitest';
import { BookFormatConfig, Chapter, Novel } from '../lib';
import { buildDocx, buildEpub, chapterHeading, generatePrintHtml, resolveBookLanguage, ExportBook } from './bookExportService';

const novel: Novel = {
  id: 1,
  title: 'The Glass River',
  genre: '',
  target_audience: '',
  target_word_count: 50000,
  current_word_count: 0,
};

function makeConfig(overrides: Partial<BookFormatConfig> = {}): BookFormatConfig {
  return {
    novel_id: 1,
    has_title_page: true,
    subtitle: '',
    author_name: 'Jane Doe',
    publisher_name: '',
    has_copyright_page: true,
    copyright_year: '2026',
    isbn: '',
    edition_notice: '',
    has_dedication: false,
    dedication_text: '',
    has_epigraph: false,
    epigraph_quote: '',
    epigraph_author: '',
    has_table_of_contents: true,
    has_foreword: false,
    foreword_title: '',
    foreword_content: '',
    has_epilogue: false,
    epilogue_title: '',
    epilogue_content: '',
    has_acknowledgments: true,
    acknowledgments_content: 'Thanks to everyone.',
    has_about_author: false,
    about_author_bio: '',
    preset_theme: 'classic',
    trim_size: 'us_trade_6x9',
    font_family: 'EB Garamond',
    font_size: 11,
    line_spacing: 1.4,
    first_line_indent: true,
    first_paragraph_drop_cap: false,
    chapter_numbering_style: 'number_title',
    scene_break_ornament: '* * *',
    header_verso: 'title',
    header_recto: 'chapter',
    include_page_numbers: true,
    book_language: '',
    ...overrides,
  };
}

const chapters: Chapter[] = [
  { id: 1, novel_id: 1, title: 'Arrival', content: 'She came at dawn.\nThe river was *glass*.\n***\nLater, **night** fell.', sort_order: 0 },
  { id: 2, novel_id: 1, title: 'Chapter 2', content: 'Second chapter text.', sort_order: 1 },
];

function book(overrides: Partial<ExportBook> = {}): ExportBook {
  return { novel, chapters, config: makeConfig(), coverImage: '', ...overrides };
}

describe('resolveBookLanguage', () => {
  it('uses the explicit setting', () => {
    expect(resolveBookLanguage(makeConfig({ book_language: 'ar' }), chapters)).toBe('ar');
  });

  it('detects the language from the manuscript', () => {
    expect(resolveBookLanguage(makeConfig(), chapters)).toBe('en');
    const arabic: Chapter[] = [{ ...chapters[0], title: 'الوصول', content: 'جاءت مع الفجر.' }];
    expect(resolveBookLanguage(makeConfig(), arabic)).toBe('ar');
  });
});

describe('chapterHeading', () => {
  it('combines number and title, but not for default "Chapter N" titles', () => {
    expect(chapterHeading(chapters[0], 0, 'number_title', 'en')).toEqual({ label: 'Chapter 1', title: 'Arrival', tocText: 'Chapter 1: Arrival' });
    expect(chapterHeading(chapters[1], 1, 'number_title', 'en')).toEqual({ label: 'Chapter 2', tocText: 'Chapter 2' });
    expect(chapterHeading(chapters[0], 0, 'title_only', 'en').tocText).toBe('Arrival');
    expect(chapterHeading(chapters[0], 0, 'number_only', 'ar').tocText).toBe('الفصل 1');
  });
});

describe('buildEpub', () => {
  it('stores mimetype first and uncompressed', async () => {
    const zip = await buildEpub(book());
    const names = Object.keys(zip.files);
    expect(names[0]).toBe('mimetype');
    expect(await zip.file('mimetype')!.async('string')).toBe('application/epub+zip');
  });

  it('turns every line into a paragraph and handles scene breaks and formatting', async () => {
    const zip = await buildEpub(book());
    const html = await zip.file('OEBPS/chapter_1.xhtml')!.async('string');
    expect(html).toContain('<p class="first-paragraph">She came at dawn.</p>');
    expect(html).toContain('<p>The river was <em>glass</em>.</p>');
    expect(html).toContain('<div class="scene-break">* * *</div>');
    expect(html).toContain('<p class="first-paragraph">Later, <strong>night</strong> fell.</p>');
  });

  it('puts the table of contents in the reading order only when enabled', async () => {
    const withToc = await (await buildEpub(book())).file('OEBPS/content.opf')!.async('string');
    expect(withToc).toContain('<itemref idref="nav"/>');
    const withoutToc = await (await buildEpub(book({ config: makeConfig({ has_table_of_contents: false }) }))).file('OEBPS/content.opf')!.async('string');
    expect(withoutToc).not.toContain('<itemref idref="nav"/>');
  });

  it('includes acknowledgments and the cover', async () => {
    const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const zip = await buildEpub(book({ coverImage: pixel }));
    expect(zip.file('OEBPS/acknowledgments.xhtml')).not.toBeNull();
    expect(zip.file('OEBPS/images/cover.png')).not.toBeNull();
    const opf = await zip.file('OEBPS/content.opf')!.async('string');
    expect(opf).toContain('properties="cover-image"');
    expect(opf).toContain('<dc:language>en</dc:language>');
  });

  it('escapes user text', async () => {
    const zip = await buildEpub(book({ novel: { ...novel, title: 'A <Tale> & "More"' } }));
    const opf = await zip.file('OEBPS/content.opf')!.async('string');
    expect(opf).toContain('<dc:title>A &lt;Tale&gt; &amp; &quot;More&quot;</dc:title>');
  });
});

describe('buildDocx', () => {
  it('uses Heading 1 for chapters and back matter, without a trailing page break', async () => {
    const zip = await buildDocx(book());
    const doc = await zip.file('word/document.xml')!.async('string');
    expect(doc.match(/w:val="Heading1"/g)?.length).toBe(3); // 2 chapters + acknowledgments
    expect(doc).toContain('Chapter 1: Arrival');
    expect(doc).not.toContain('<w:br w:type="page"/>');
    expect(doc).toContain('<w:i/><w:iCs/>');
    expect(doc).toContain('w:w="8640" w:h="12960"'); // 6 x 9 in
  });

  it('includes front matter and a TOC field when enabled', async () => {
    const zip = await buildDocx(book({ config: makeConfig({ has_dedication: true, dedication_text: 'For M.\nAnd T.' }) }));
    const doc = await zip.file('word/document.xml')!.async('string');
    expect(doc).toContain('For M.');
    expect(doc).toContain('© 2026 Jane Doe');
    expect(doc).toContain('TOC \\o');
    const settings = await zip.file('word/settings.xml')!.async('string');
    expect(settings).toContain('<w:updateFields w:val="true"/>');
  });

  it('marks RTL books as bidi', async () => {
    const zip = await buildDocx(book({ config: makeConfig({ book_language: 'ar' }) }));
    const doc = await zip.file('word/document.xml')!.async('string');
    expect(doc).toContain('<w:bidi/>');
    expect(doc).toContain('الفصل 1: Arrival');
  });
});

describe('generatePrintHtml', () => {
  it('uses the trim size and book direction', () => {
    const html = generatePrintHtml(book({ config: makeConfig({ trim_size: 'a5', book_language: 'ar' }) }));
    expect(html).toContain('size: 5.83in 8.27in');
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('fonts.googleapis.com');
  });
});
