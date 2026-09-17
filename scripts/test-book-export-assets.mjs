import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the offline font pipeline: every file referenced by the EPUB/print
// font-embedding map and by book-fonts.css must exist in public/fonts, and
// every curated theme must use an embeddable family. Embedding fails silently
// (try/catch with fallback), so this test is the tripwire.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serviceSrc = readFileSync(join(root, 'src/services/bookExportService.ts'), 'utf-8');
const fontsCss = readFileSync(join(root, 'src/book-fonts.css'), 'utf-8');

// 1. EMBEDDABLE_FONTS entries → files on disk
const embedBlock = serviceSrc.match(/EMBEDDABLE_FONTS[^=]*=\s*\{([\s\S]*?)\n\};/);
assert(embedBlock, 'EMBEDDABLE_FONTS map must exist in bookExportService.ts');
const referenced = [...embedBlock[1].matchAll(/file:\s*'([^']+)'/g)].map((m) => m[1]);
assert(referenced.length >= 6, `expected at least 6 embeddable font files, found ${referenced.length}`);
for (const f of referenced) {
  assert(
    existsSync(join(root, 'public/fonts', f)),
    `embedded font missing on disk: public/fonts/${f}`
  );
}
console.log(`✓ ${referenced.length} embedded font files present in public/fonts`);

// 2. book-fonts.css urls → files on disk
const cssRefs = [...fontsCss.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
assert(cssRefs.length >= 6, `expected at least 6 @font-face urls, found ${cssRefs.length}`);
for (const f of cssRefs) {
  assert(existsSync(join(root, 'public/fonts', f)), `book-fonts.css references missing file: ${f}`);
}
console.log(`✓ ${cssRefs.length} @font-face urls resolve to real files`);

// 3. Every curated theme family must be embeddable (else exports degrade)
const themeFamilies = [...serviceSrc.matchAll(/font_family:\s*'([^']+)'/g)].map((m) => m[1]);
const embedFamilies = [...embedBlock[1].matchAll(/^\s*'?([^':\]]+)'?\s*:\s*\[/gm)].map((m) => m[1].trim());
const themeBlock = serviceSrc.match(/BOOK_THEMES[^=]*=\s*\[([\s\S]*?)\n\];/);
assert(themeBlock, 'BOOK_THEMES must exist');
const themeIds = [...themeBlock[1].matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
assert.strictEqual(themeIds.length, 3, `expected 3 curated themes, found ${themeIds.length}`);
const themeFonts = [...themeBlock[1].matchAll(/font_family:\s*'([^']+)'/g)].map((m) => m[1]);
for (const fam of themeFonts) {
  assert(
    embedFamilies.includes(fam),
    `theme font family '${fam}' is not embeddable — exports would silently fall back`
  );
}
console.log(`✓ themes [${themeIds.join(', ')}] all use embeddable families [${themeFonts.join(', ')}]`);

console.log('✓ All book export asset assertions passed!');
