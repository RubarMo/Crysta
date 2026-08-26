# Neubrutalism UI Design Rules

Follow these design rules whenever creating, modifying, or reviewing user interfaces:

## 1. 0px Border Radius Invariant
- Every button, card, modal, dropdown, input, select, textarea, badge, tag, slider thumb, square pip, toast, tooltip, tab, and scrollbar MUST have `border-radius: 0px`.
- Never use any `rounded*` Tailwind class.

## 2. Ink Borders & Hard Offset Shadows
- **Standard Controls & Cards**: `border-3 border-[var(--border-ink)]` (or `border-2 border-[var(--border-ink)]` for compact dividers/badges).
- **Hero Cards & Modals**: `border-4 border-[var(--border-ink)]`.
- **Offset Shadows (0 Blur Always)**:
  - Pills / Badges / Sub-controls: `shadow-[2.5px_2.5px_0px_var(--shadow-ink)]`
  - Standard Cards & Buttons: `shadow-[5px_5px_0px_var(--shadow-ink)]`
  - Modals / Hero Cards: `shadow-[8px_8px_0px_var(--shadow-ink)]` or `shadow-[12px_12px_0px_var(--shadow-ink)]`
- **Shadow Colors**:
  - Light mode: `--shadow-ink: #000000;`
  - Dark mode: `--shadow-ink: rgba(255, 255, 255, 0.14);` (light tactile offset shadow for physical depth against dark surfaces).

## 3. Strict High-Contrast Color Rule
- **Solid Black Text Invariant**: Any element with a colored background fill (**Bold Yellow `#FFD23F`**, **Coral Pink `#FF6B6B`**, **Sky Blue `#74B9FF`**, **Soft Mint `#88D498`**, **Lavender `#B8A9FA`**, **Orange `#FFA552`**) MUST HAVE **SOLID BLACK TEXT & ICONS (`text-black font-bold` or `text-black font-black`)**.
- **No Monochromatic Hue-on-Hue**: Never use dark text on matching light colored background.
- **Solid Fills in Dark Mode**: Stat cards and action pills remain solid and vibrant in both light and dark mode (no muddy/translucent dark fills).

## 4. Typography Quad-Stack
- **Display**: `font-display` (`Syne 800`) for hero headlines and poster statements.
- **Heading**: `font-heading` (`Space Grotesk 700/600`) for section headers, card titles, navigation, and badges.
- **Body**: `font-body` (`Inter 400/500`) for operational body reading copy.
- **Mono**: `font-mono` (`Space Mono` / `JetBrains Mono`) for numbers, code, counters, and tokens.
- **Arabic**: `font-arabic` (`'Dubai', 'Cairo', 'Amiri'`) for Arabic typography.

## 5. Neutral Dark Mode Canvas
- Dark mode canvas and surfaces must use neutral graphite/zinc tones (`#1E1E22` canvas, `#26262B` surface, `#2D2D33` raised surface) with zero blue hue.

## 6. Dotted Canvas Isolation
- Dotted paper grid (`.dotted-canvas`) is strictly isolated to the main scrollable content area. Top navigation header and sidebar chrome remain solid (`bg-[var(--bg-surface)]`) with clean 3px ink borders.

## 7. Tactile Micro-Interactions
- On hover: subtle lift (`hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_var(--shadow-ink)]`).
- On press: physical depress (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`).
- Focus visible: `focus-visible:outline-3 focus-visible:outline-[var(--pastel-sky)] focus-visible:outline-offset-2`.

## 8. Cohesive Card Headers & Standard Sizing (Anti-AI-Slop Rule)
- **Never stack an isolated icon box floating vertically above a card title** (a common AI-slop pattern that creates visual disconnect).
- **Always integrate icon badges horizontally beside the title/header** in a cohesive, structured unit (`flex items-center gap-3 pb-3 border-b-2 border-[var(--border-subtle)]`), keeping visual weight grounded and intentional.
- **Canonical Card Header Sizing**:
  - Icon badge container: `p-2.5 bg-[var(--pastel-sky-bg)] text-black border-2 border-[var(--border-ink)] shadow-[2px_2px_0px_var(--shadow-ink)] shrink-0 flex items-center justify-center` with `w-5 h-5` icon.
  - Card title: `text-[16px] sm:text-[17px] font-heading font-black text-[var(--text-primary)] leading-tight`.

## 9. No Redundant / Decorative Filler Badges (Anti-Filler Rule)
- **Never insert fake or decorative filler badges** (e.g. `EST. 2026`, `AI POWERED STUDIO`, `AWESOME APP V1.0`, or decorative marketing pills floating above headings).
- Badges must **strictly represent real, operational application state** (e.g. `Completed`, `Processing`, `Failed`, `Page 14/120`, `3 Chunks`). Avoid all purely decorative filler badges that waste screen real estate.

## 10. Direct, Human Copywriting (No Robotic Marketing Jargon)
- **Titles**: Keep screen and card titles ultra-concise (1–3 words max), e.g. `Batch Setup`, `Processing Queue`, `Export Book`, `Editor`, `API Keys & Models`. Never use robotic, over-engineered titles like *"Virtual PDF Chunking & Batch Setup"* or *"Chapter Proofreading & BiDi Studio"*.
- **Subtitles & Descriptions**: Keep descriptions to a single, natural, human sentence. Explain what the user does simply (e.g. *"Export your transcribed book to Word or EPUB"*), never stuffed with technical buzzword-soup (e.g. *"Compile your proofread book into clean OpenXML (.docx) or validated EPUB3 with embedded Arabic typography"*).
- **Cards & Controls**: Use concise, functional labels (e.g. *"Clean Word document with headings and tables"* instead of *"Clean document with standard heading styles, tables, and BiDi alignment"*).

## 11. No Static Feature Pills in Application Workspaces
- **Never insert un-clickable feature pills or marketing buzzword badges** (e.g. `[✨ Multi-Model AI]`, `[💾 Offline SQLite]`, `[📖 DOCX Export]`) on workspace screens.
- Keep application screens focused strictly on primary actionable controls. Decorative feature pills belong on static marketing websites, never inside functional application workflows.

## 12. Global Reactive BiDi (RTL/LTR) Synchronization
- **Centralized Event Listener**: In multilingual applications supporting RTL languages (e.g. Arabic), `document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr')` and `lang` must be synchronized reactively via a global listener on the i18n instance (`i18n.on('languageChanged')`). Never rely exclusively on local click callbacks that might be missed on mobile menus or modal pickers.
- **Unified Switcher Handlers**: All language switchers (desktop headers, mobile draw menus, settings selects) must invoke the centralized app language setter so all stores, document attributes, and active indicators remain in lockstep.
- **Directional Icon Flipping**: Ensure directional navigational icons (e.g. back/forward chevrons, page turns, logout arrows) include `rtl:rotate-180` to respect visual layout inversion.
