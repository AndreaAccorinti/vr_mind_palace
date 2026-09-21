/**
 * Synthetic content for milestone M0.
 *
 * `examples/palace-example.json` belongs to M1's import path; M0 must not depend
 * on a file it cannot yet validate. This is a one-room, three-prop fixture built
 * directly in the v1 shape so the importer can replace it later without the
 * scene layer changing.
 *
 * Everything here is invented demo material (`source.kind: 'demo'`). The hooks
 * below are generic placeholders, NOT entries from anyone's personal hook
 * dictionary — per AGENTS.md, personal content is never baked into a shipped
 * bundle.
 */

import type { PalaceContent } from './palace.ts';

const PLINTH_TOP = 1.05;

export const M0_ROOM_ID = 'm0-gallery';
export const M0_PALACE_ID = 'm0-demo';

export const m0Content: PalaceContent = {
  schemaVersion: 1,
  kind: 'loci-content',
  palace: {
    id: M0_PALACE_ID,
    name: 'M0 demo gallery',
    roomOrder: [M0_ROOM_ID],
  },
  rooms: [
    {
      id: M0_ROOM_ID,
      name: 'Gallery',
      templateId: 'gallery-6x6',
      origin: [0, 0, 0],
      yawDegrees: 0,
      theme: 'warm-stone',
      locusOrder: ['left-plinth', 'centre-plinth', 'right-plinth'],
    },
  ],
  loci: [
    {
      id: 'left-plinth',
      roomId: M0_ROOM_ID,
      label: '01 · Left plinth',
      position: [-2.1, 0, -1.9],
      // Faces back towards the middle of the room, angled slightly inward.
      yawDegrees: -160,
    },
    {
      id: 'centre-plinth',
      roomId: M0_ROOM_ID,
      label: '02 · Centre plinth',
      position: [0, 0, -2.5],
      yawDegrees: 180,
    },
    {
      id: 'right-plinth',
      roomId: M0_ROOM_ID,
      label: '03 · Right plinth',
      position: [2.1, 0, -1.9],
      yawDegrees: 160,
    },
  ],
  items: [
    {
      id: 'stack-lifo',
      locusId: 'left-plinth',
      cue: 'Which removal order does a stack follow?',
      answer: 'Last in, first out (LIFO).',
      source: {
        kind: 'demo',
        excerpt: 'A stack removes the most recently added element first.',
        locator: 'M0 demo content',
      },
      mnemonic: {
        meaningScene: 'The last plate placed on the stack is the first one lifted off the top.',
        numberPeg: null,
        pronunciation: [],
        nodes: [
          {
            id: 'plates',
            assetId: 'builtin:plate-stack',
            position: [0, PLINTH_TOP, 0],
            scale: 1,
            animation: 'lift-top',
          },
        ],
      },
    },
    {
      id: 'queue-fifo',
      locusId: 'centre-plinth',
      cue: 'Which removal order does a queue follow?',
      answer: 'First in, first out (FIFO).',
      source: {
        kind: 'demo',
        excerpt: 'A queue removes the element that has waited longest.',
        locator: 'M0 demo content',
      },
      mnemonic: {
        meaningScene: 'The figure that joined the queue first walks through the gate first.',
        numberPeg: null,
        pronunciation: [],
        nodes: [
          {
            id: 'line',
            assetId: 'builtin:queue',
            position: [0, PLINTH_TOP, 0],
            scale: 1,
            animation: 'advance-front',
          },
        ],
      },
    },
    {
      id: 'water-mizu',
      locusId: 'right-plinth',
      cue: 'What does 水 (みず) mean?',
      answer: 'Water. Romaji: mizu.',
      source: {
        kind: 'demo',
        excerpt: '水 — water. Read みず (mizu).',
        locator: 'M0 demo content',
      },
      mnemonic: {
        // Two hooks exercise the chunking path without needing a long chain.
        meaningScene: 'A giant blue jug makes the meaning concrete before the sounds are added.',
        numberPeg: null,
        pronunciation: [
          { sound: 'mi', hook: 'demo hook — a mixing bowl', nodeId: 'sound-mi' },
          { sound: 'zu', hook: 'demo hook — a sugar cube', nodeId: 'sound-zu' },
        ],
        nodes: [
          {
            id: 'jug',
            assetId: 'builtin:water-jug',
            position: [0, PLINTH_TOP, 0.04],
            scale: 0.9,
            animation: 'none',
          },
          {
            id: 'sound-mi',
            assetId: 'builtin:teacup',
            position: [-0.27, PLINTH_TOP, -0.16],
            scale: 0.5,
            animation: 'bob',
          },
          {
            id: 'sound-zu',
            assetId: 'builtin:cube',
            position: [0.27, PLINTH_TOP, -0.16],
            scale: 0.42,
            animation: 'pulse',
          },
        ],
      },
    },
  ],
};
