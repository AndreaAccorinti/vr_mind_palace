# Handoff

- Current state: **M0 implemented and passing its automated checks. No Quest 3
  hardware test has been run.** The specification pack has been materialised and
  a working React/WebXR application scaffolded on top of it.
- Active milestone: M0 — XR viability. Awaiting physical-device verification
  before M1 starts.
- Current writer: Claude Code (this session).
- Current reviewer: unassigned. `docs/M0-REVIEW.md` is the implementer's own
  review; an independent pass is still worth having.
- Base revision/branch: `claude/new-session-leurfc`, branched from an empty
  repository.
- Shared decisions: static React/WebXR app, Cloudflare assets-only hosting, no
  paid runtime AI, stable loci, local persistence first. Unchanged.
- Files to read: `AGENTS.md`, `docs/BLUEPRINT.md`, `docs/M0-REVIEW.md`,
  `docs/QUEST-TEST.md`, `schemas/palace.schema.json`.

## Task: scaffold and implement M0

- **Task / owner / base revision:** M0 — XR viability / Claude Code / empty
  repository.
- **Outcome and changed paths:**
  - Materialised all 17 specification files from the build pack at their stated
    destinations (`README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `schemas/`,
    `examples/`, `prompts/`, `wrangler.jsonc`, `public/_headers`).
  - Created the project skill wrappers from `docs/SKILL-SETUP.md` at
    `.claude/skills/loci-workflows/SKILL.md` and
    `.agents/skills/loci-workflows/SKILL.md` (identical, as specified).
  - `src/domain/` — renderer-independent model: geometry and transform
    composition, palace content types matching the v1 schema, the closed asset
    catalogue, viewer/comfort rules, the review state machine, room templates,
    and the synthetic M0 fixture.
  - `src/persistence/` — repository interfaces, an in-memory content source and
    a localStorage preferences adapter with typed failures.
  - `src/scene/` — room shell, locus stations, procedural props, spatial text
    and buttons, the review panel, locomotion, teleport floor, desktop camera.
  - `src/app/` — entry page, capability detection, XR store, session controller.
  - `build/copyControllerAssets.mjs`, `build/xrEmulatorStub.js` — build steps
    described under Decisions.
  - Tests: `src/**/*.test.ts` (93 unit tests), `e2e/desktop.spec.ts` (7 browser
    tests).
- **Decisions and reason:**
  - **React pinned to 19.2.8, not 19.3.0.** `@react-three/fiber@9.7.0` declares
    `react: ">=19 <19.3"`. Installing the newest React would have been a peer
    violation papered over with a force flag.
  - **TypeScript 5.9.3, not 7.0.2.** `typescript-eslint@8.70.0` supports
    `>=4.8.4 <6.1.0`.
  - **Spatial fonts are WOFF, not WOFF2.** troika's parser converts `wOFF` but
    throws on `wOF2` ("woff2 fonts not supported"), which left every spatial
    label blank while the page otherwise looked healthy. Found via a browser
    console error, now covered by an e2e regression test.
  - **Controller and hand models are served from this origin.**
    `@react-three/xr` otherwise fetches them from `cdn.jsdelivr.net` at session
    start. `build/copyControllerAssets.mjs` copies the Quest 3 and generic-hand
    profiles (MIT, ~660 KB) into `public/webxr-profiles/`, and the store sets
    `baseAssetPath`. An e2e test asserts no third-party request is made.
  - **The IWER emulator is aliased out of production builds.**
    `@pmndrs/xr/dist/emulate.js` statically imports IWER's synthetic rooms,
    putting ~4.6 MB of never-executed JavaScript into `dist/`. A Vite plugin
    redirects it to a stub for builds only; localhost emulation still works and
    the UI labels it.
  - **A Japanese font is bundled and loaded on demand.** `pickFont()` picks per
    string, so a Latin-only palace never fetches the 1.4 MB family, and 水
    renders real glyphs rather than boxes.
  - **The domain boundary is enforced, not just documented** — an ESLint
    `no-restricted-imports` rule plus `src/architecture.test.ts`.
  - **Dexie, Zod and ts-fsrs are not yet installed.** They belong to M1; adding
    them now would be unused dependency surface. The repository interfaces they
    will sit behind already exist.
- **Exact checks run and their results** (all on this container, Node v22.22.2):
  - `npm install` — clean, no peer warnings, no `--force` / `--legacy-peer-deps`.
    `package-lock.json` committed.
  - `npm run typecheck` (`tsc -b --noEmit`, 3 projects) — pass.
  - `npm run lint` (`eslint .`) — pass, 0 errors, 0 warnings.
  - `npm test` (`vitest run`) — **93 passed / 93**, 7 files.
  - `npm run test:e2e` (`playwright test`, Chromium + SwiftShader) — **7 passed / 7**.
  - `npm run build` — pass. `dist/` = 26 files, 4.0 MB total; largest asset
    1.39 MB (the Japanese font), well inside Cloudflare's 20,000-file and
    25 MiB-per-asset free limits.
  - `npx wrangler deploy --dry-run` — config valid, 26 assets read, no bindings,
    no Worker script. **Nothing was deployed.**
  - Manual browser inspection via Playwright screenshots: the room, three
    plinths, spatial text, selection ring, and the full cue → hint → reveal →
    rate loop were confirmed rendering and responding to pointer input.
- **Checks not run and why:**
  - **Every Quest 3 hardware check.** No headset is attached to this
    environment. `docs/QUEST-TEST.md` remains entirely **Not run**.
  - Frame cadence, comfort, optical readability, controller input mapping — all
    require the device. A desktop frame counter is not evidence of headset
    performance.
  - WebXR session entry itself was never executed: headless Chromium reports
    `immersive-vr` unsupported, so the Enter VR path is exercised only by its
    error handling, not by a real session.
  - No deployment. No Cloudflare account was contacted beyond the local dry run.
- **Outstanding defects or uncertainties:** see `docs/M0-REVIEW.md` §1 (gaps)
  and §5 (risks). In short: no device evidence; snap turn needs two controllers;
  one axis-aligned room template only; the seated offset is a guess; font
  coverage is Latin + Japanese only.
- **Quest/browser/device evidence:** Chromium (Playwright, SwiftShader) only.
  **No Quest 3, no headset, no HTTPS deployment.**
- **Next concrete task and file ownership:** Andrea runs the device script in
  `docs/M0-REVIEW.md` §3 against an HTTPS origin and records results in
  `docs/QUEST-TEST.md`. Fix whatever it finds before starting M1. Ownership of
  `src/domain` and `schemas/` should stay with one writer while M1's validator
  is built.

## Copy for each completed task

- Task / owner / base revision:
- Outcome and changed paths:
- Decisions and reason:
- Exact checks run and their results:
- Checks not run and why:
- Outstanding defects or uncertainties:
- Quest/browser/device evidence:
- Next concrete task and file ownership:
