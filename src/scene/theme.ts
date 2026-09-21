/**
 * Scene palette.
 *
 * The blueprint's visual direction: a quiet architectural palace in warm stone
 * and ink blue, with a small teal accent reserved for navigation affordances.
 * Mnemonic props are allowed to be much louder than the room they stand in.
 */

export const palette = {
  floor: '#cdc2ad',
  floorLine: '#b3a68e',
  wall: '#ded3bd',
  wallTrim: '#c2b59a',
  ceiling: '#e7dfcd',
  plinth: '#c8bda8',
  plinthTop: '#e3d9c4',

  /** Navigation and selection accent. */
  accent: '#2f7d6d',
  accentBright: '#4bb39c',
  /** Highlight for the prop currently under a pointer. */
  hover: '#d99b45',

  panel: '#f3f1e7',
  panelEdge: '#cfd3c4',
  ink: '#16302f',
  inkSoft: '#5a6f6a',
  answer: '#1d5c4c',

  propWarm: '#dfa967',
  propGreen: '#3b8a7a',
  propStone: '#a8b6a0',
  propBlue: '#4b8d99',
  propBlueLight: '#8cb9bd',
} as const;

/** Room-theme overrides. M0 ships one room, but the hook is where it belongs. */
export const themeColors = {
  'warm-stone': { wall: palette.wall, floor: palette.floor },
  'ink-blue': { wall: '#43566b', floor: '#3b4a5a' },
  garden: { wall: '#c9d4bd', floor: '#b7c3a6' },
} as const;
