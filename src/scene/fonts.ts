/**
 * Spatial text fonts.
 *
 * Fonts are bundled and imported as URLs so Vite fingerprints them into
 * `dist/`. Nothing fetches a font from a CDN at runtime: troika's own fallback
 * would reach for a remote unicode font, and AGENTS.md forbids that — a headset
 * on a flaky connection must not lose its cue text.
 *
 * Two families are shipped:
 *  - Inter (Latin) for the interface and most content. Small, always loaded.
 *  - Noto Sans JP for Japanese content. ~1 MB, so it is referenced only by text
 *    that actually needs it; the browser never requests it for a Latin-only
 *    palace. Both are SIL Open Font License 1.1, with the licence travelling in
 *    each package under `node_modules/@fontsource/<name>/LICENSE`.
 */

// WOFF, not WOFF2: troika's font parser converts `wOFF` but throws outright on
// `wOF2` ("woff2 fonts not supported"), which silently leaves every spatial
// label blank. The files are larger, and that is the correct trade here.
import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import interSemiBold from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import notoJpRegular from '@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff?url';
import notoJpSemiBold from '@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-600-normal.woff?url';

export type FontWeight = 'regular' | 'semibold';

/**
 * Whether the bundled Latin subset can render every character of `text`.
 *
 * Covered: Basic Latin, Latin-1 Supplement, Latin Extended-A and -B, plus the
 * general punctuation, currency and letterlike blocks the interface uses.
 * Anything else needs the Japanese family, and any script beyond those two is a
 * known gap recorded in HANDOFF.md rather than a silent box of tofu.
 */
function isLatinCovered(text: string): boolean {
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint <= 0x024f) continue;
    if (codePoint >= 0x2000 && codePoint <= 0x206f) continue;
    if (codePoint >= 0x20a0 && codePoint <= 0x20bf) continue;
    if (codePoint >= 0x2100 && codePoint <= 0x214f) continue;
    return false;
  }
  return true;
}

export function needsJapaneseFont(text: string): boolean {
  return !isLatinCovered(text);
}

/** Picks the smallest bundled font that can render `text`. */
export function pickFont(text: string, weight: FontWeight = 'regular'): string {
  if (needsJapaneseFont(text)) {
    return weight === 'semibold' ? notoJpSemiBold : notoJpRegular;
  }
  return weight === 'semibold' ? interSemiBold : interRegular;
}

export const fonts = {
  interRegular,
  interSemiBold,
  notoJpRegular,
  notoJpSemiBold,
} as const;
