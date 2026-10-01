/** Counts whitespace-separated words, matching the Rust `count_words`. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Splits manuscript text into paragraphs. Every non-empty line is a
 * paragraph, since writers usually press Enter once between paragraphs.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const DEFAULT_SCENE_BREAKS = ['***', '* * *', '#', '—', '~'];

/** True when a paragraph is a scene break marker such as `***` or `* * *`. */
export function isSceneBreak(paragraph: string, ornament?: string): boolean {
  const p = paragraph.trim();
  if (!p) return false;
  if (ornament && p === ornament.trim()) return true;
  return DEFAULT_SCENE_BREAKS.includes(p);
}

export interface InlineSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

/**
 * Parses the light formatting the editor supports: `**bold**` and `*italic*`.
 * Unmatched asterisks are kept as literal text.
 */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Italic text must start and end with a non-space character, so "a * b * c"
  // stays literal. (No lookbehind: older macOS WebKit doesn't support it.)
  const pattern = /\*\*(\S(?:.*?\S)?)\*\*|\*([^\s*](?:[^*]*[^\s*])?)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ text: text.slice(last, match.index), bold: false, italic: false });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: false });
    } else {
      segments.push({ text: match[2], bold: false, italic: true });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last), bold: false, italic: false });
  }
  return segments.length ? segments : [{ text: '', bold: false, italic: false }];
}

/** Escapes text for XML/HTML and drops control characters XML can't contain. */
export function escapeXml(str: string): string {
  return str
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Escaped HTML/XHTML for a paragraph, with `**bold**` / `*italic*` applied. */
export function inlineToHtml(text: string): string {
  return parseInline(text)
    .map((seg) => {
      const escaped = escapeXml(seg.text);
      if (seg.bold) return `<strong>${escaped}</strong>`;
      if (seg.italic) return `<em>${escaped}</em>`;
      return escaped;
    })
    .join('');
}

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_SCRIPT = /[A-Za-z\u00C0-\u024F]/g;

/**
 * Guesses the manuscript language from its letters: 'ar' or 'en', or null
 * when there are no Arabic or Latin letters to go by.
 */
export function detectLanguage(texts: string[]): 'ar' | 'en' | null {
  let arabic = 0;
  let latin = 0;
  for (const text of texts) {
    arabic += (text.match(ARABIC_SCRIPT) || []).length;
    latin += (text.match(LATIN_SCRIPT) || []).length;
  }
  if (arabic === 0 && latin === 0) return null;
  return arabic >= latin ? 'ar' : 'en';
}

/** Safe file name for exports; keeps letters of any script. */
export function sanitizeFilename(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '').replace(/\s+/g, ' ').trim() || 'Novel';
}

/** Base64-encodes a UTF-8 string. */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
