/**
 * Guards the font-coverage trap.
 *
 * Only two families are bundled. A string containing one character outside the
 * Latin subset routes the *whole* string to the 1.4 MB Japanese family, which
 * means a needless download and a label that renders blank until it lands. That
 * is exactly what happened to a "Stalls >= 100ms" label written with U+2265, so
 * the rule is written down here rather than left to be rediscovered.
 */

import { describe, expect, it } from 'vitest';
import { needsJapaneseFont, pickFont } from './fonts.ts';

describe('what the Latin subset covers', () => {
  it('covers plain ASCII', () => {
    expect(needsJapaneseFont('Stalls >= 100ms')).toBe(false);
    expect(needsJapaneseFont('Which removal order does a stack follow?')).toBe(false);
  });

  it('covers the accented Latin the interface actually uses', () => {
    expect(needsJapaneseFont('Recentre · Séance · Größe · àèìòù')).toBe(false);
  });

  it('covers the punctuation the interface actually uses', () => {
    // Middle dot, ellipsis, en and em dashes, curly quotes.
    expect(needsJapaneseFont('01 · Left plinth')).toBe(false);
    expect(needsJapaneseFont('Sampling…')).toBe(false);
    expect(needsJapaneseFont('a — b – c')).toBe(false);
    expect(needsJapaneseFont('“quoted” and ‘single’')).toBe(false);
  });

  it('does NOT cover mathematical operators, which is the trap', () => {
    // These look harmless in an editor and cost 1.4 MB at runtime.
    expect(needsJapaneseFont('>=')).toBe(false);
    expect(needsJapaneseFont('≥')).toBe(true);
    expect(needsJapaneseFont('≤')).toBe(true);
    expect(needsJapaneseFont('→')).toBe(true);
  });
});

describe('font selection', () => {
  it('keeps Latin strings on the small family', () => {
    expect(pickFont('Reveal answer')).toBe(pickFont('Show hint'));
    expect(pickFont('Reveal answer')).not.toBe(pickFont('水'));
  });

  it('moves Japanese content to the family that can render it', () => {
    expect(needsJapaneseFont('水 (みず)')).toBe(true);
    expect(pickFont('水 (みず)')).toContain('noto-sans-jp');
  });

  it('picks the requested weight within a family', () => {
    expect(pickFont('Reveal answer', 'semibold')).not.toBe(pickFont('Reveal answer', 'regular'));
    expect(pickFont('水', 'semibold')).toContain('noto-sans-jp');
  });

  it('treats empty text as Latin rather than loading a font for nothing', () => {
    expect(needsJapaneseFont('')).toBe(false);
  });
});

describe('the strings this build actually renders in the scene', () => {
  // Every label that reaches SpatialText outside of user content. If one of
  // these starts needing the Japanese font, it is a mistake, not a feature.
  const uiStrings = [
    'PAUSE. RECALL IT FIRST.',
    'HOW EASILY DID YOU RECALL IT?',
    'MOVE AND COMFORT',
    'FRAME DIAGNOSTICS',
    'Show hint',
    'Next sounds',
    'Reveal answer',
    'Again',
    'Hard',
    'Good',
    'Easy',
    'Again from cue',
    'Turn left',
    'Turn right',
    'Recentre',
    'Seated',
    'Standing',
    'Frame stats',
    'Hide stats',
    'Exit VR',
    'Restart run',
    'Save run',
    'Keep sampling…',
    'Hide',
    'Samples',
    'Mean',
    'Median',
    'p95 / p99',
    'Max',
    'Stalls >= 100ms',
    'Dropped (est.)',
    'Suspensions',
    'no target rate',
    'Sampling…',
    'Point at a plinth and select it to begin.',
    'Rated. M0 does not schedule the next review yet.',
    'Desktop: this is animation-frame cadence, not XR cadence.',
    'Dropped frames are inferred from intervals. WebXR reports no compositor count.',
    '01 · Left plinth',
  ];

  it.each(uiStrings)('%j stays on the bundled Latin font', (text) => {
    expect(needsJapaneseFont(text)).toBe(false);
  });
});
