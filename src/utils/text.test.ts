import { describe, expect, it } from 'vitest';
import {
  countWords,
  detectLanguage,
  escapeXml,
  inlineToHtml,
  isSceneBreak,
  parseInline,
  sanitizeFilename,
  splitParagraphs,
  utf8ToBase64,
} from './text';

describe('countWords', () => {
  it('counts whitespace-separated words like the Rust side', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  one\n two\tthree ')).toBe(3);
    expect(countWords('مرحبا بك في كريستا')).toBe(4);
  });
});

describe('splitParagraphs', () => {
  it('treats every non-empty line as a paragraph', () => {
    expect(splitParagraphs('First line.\nSecond line.')).toEqual(['First line.', 'Second line.']);
  });

  it('ignores blank lines and CRLF', () => {
    expect(splitParagraphs('A\r\n\r\n\r\nB\n   \nC')).toEqual(['A', 'B', 'C']);
  });
});

describe('isSceneBreak', () => {
  it('recognizes common markers and the configured ornament', () => {
    expect(isSceneBreak('***')).toBe(true);
    expect(isSceneBreak(' * * * ')).toBe(true);
    expect(isSceneBreak('❦', '❦')).toBe(true);
    expect(isSceneBreak('A sentence with *** in it')).toBe(false);
  });
});

describe('parseInline', () => {
  it('parses bold and italic', () => {
    expect(parseInline('a **b** *c* d')).toEqual([
      { text: 'a ', bold: false, italic: false },
      { text: 'b', bold: true, italic: false },
      { text: ' ', bold: false, italic: false },
      { text: 'c', bold: false, italic: true },
      { text: ' d', bold: false, italic: false },
    ]);
  });

  it('leaves lone or spaced asterisks alone', () => {
    expect(parseInline('5 * 3 * 2')).toEqual([{ text: '5 * 3 * 2', bold: false, italic: false }]);
    expect(parseInline('a*')).toEqual([{ text: 'a*', bold: false, italic: false }]);
  });

  it('handles Arabic text', () => {
    expect(parseInline('قال *بهدوء* ثم مضى')[1]).toEqual({ text: 'بهدوء', bold: false, italic: true });
  });
});

describe('inlineToHtml / escapeXml', () => {
  it('escapes markup before applying formatting', () => {
    expect(inlineToHtml('<b> & **"x"**')).toBe('&lt;b&gt; &amp; <strong>&quot;x&quot;</strong>');
  });

  it('drops characters that are invalid in XML', () => {
    expect(escapeXml('a\u0000b\u0008c\td')).toBe('abc\td');
  });
});

describe('detectLanguage', () => {
  it('picks the dominant script', () => {
    expect(detectLanguage(['كان يا ما كان في قديم الزمان'])).toBe('ar');
    expect(detectLanguage(['Once upon a time'])).toBe('en');
    expect(detectLanguage(['', '12345'])).toBeNull();
  });
});

describe('sanitizeFilename', () => {
  it('keeps letters of any script and removes reserved characters', () => {
    expect(sanitizeFilename('My: Novel?')).toBe('My Novel');
    expect(sanitizeFilename('رواية/جديدة')).toBe('روايةجديدة');
    expect(sanitizeFilename('???')).toBe('Novel');
  });
});

describe('utf8ToBase64', () => {
  it('encodes non-ASCII text', () => {
    const bytes = Uint8Array.from(atob(utf8ToBase64('مرحبا ✓')), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe('مرحبا ✓');
  });
});
