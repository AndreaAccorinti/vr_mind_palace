# Handoff

- Current state: **M0 implemented and passing its automated checks, now with
  device-test instrumentation. No Quest 3 hardware test has been run.** The
  specification pack has been materialised and a working React/WebXR application
  scaffolded on top of it.
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
  `docs/DEPLOY.md`, `docs/QUEST-TEST.md`, `schemas/palace.schema.json`.

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
  - `npm run build` — pass. (Figures superseded by the next task entry after the
    WOFF switch changed the font sizes.)
  - `npx wrangler deploy --dry-run` — config valid, no bindings, no Worker
    script. **Nothing was deployed.**
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
- **Next concrete task and file ownership:** see the entry below.

## Task: device-test instrumentation and deploy runbook

- **Task / owner / base revision:** make the M0 device gate executable / Claude
  Code / `85b81bd`.
- **Outcome and changed paths:**
  - `src/domain/frameStats.ts` — frame-interval statistics: histogram
    percentiles, mean, max, stalls, and an estimate of dropped frames against a
    target rate. Pure, no renderer, no browser API.
  - `src/scene/FrameSampler.tsx` — reports frames to the recorder from
    `useFrame`. No allocation, no React setter, no DOM access in that path.
  - `src/scene/DiagnosticsPanel.tsx` — the in-scene readout, plus a Frame stats
    toggle on the control row.
  - `src/app/useDiagnostics.ts` — turns the recorder into React state on a 2 Hz
    timer rather than per frame.
  - `src/persistence/diagnosticsRepository.ts` — stores the last run so it can
    be read after the headset is off.
  - `src/app/EntryPage.tsx` — "Last recorded run" as selectable text, with a
    copy button, shown on the 2D page.
  - `docs/DEPLOY.md` — the Cloudflare runbook, including the publication
    checklist and the one-origin rule.
  - Tests: `src/domain/frameStats.test.ts`, `src/scene/fonts.test.ts`,
    `src/persistence/diagnosticsRepository.test.ts`, `e2e/diagnostics.spec.ts`.
- **Decisions and reason:**
  - **Dropped frames are inferred, and labelled as such** on the panel, in the
    report and in the code. WebXR exposes no compositor dropped-frame counter,
    so the figure is derived from intervals; presenting it as a measurement
    would be the kind of claim AGENTS.md rules out.
  - **A suspended session is not a stall.** Taking the headset off produces one
    enormous interval; counting it as hundreds of dropped frames would turn a
    normal event into an alarming number. Intervals over 1 s are counted
    separately and excluded from every other statistic.
  - **The recorder owns the run, not a shared mutable prop.** The first design
    passed a mutable buffer into the sampler; the React Compiler lint rejected
    it, correctly, and moving that state into the recorder removed the shared
    mutable object and all the refs along with it. No lint suppressions were
    added.
  - **The run is persisted, not just displayed.** Reading numbers through a
    headset and retyping them is how an acceptance record becomes approximate.
  - **The histogram tracks up to 250 ms**, not 80 ms. At 80 ms every percentile
    collapsed onto the maximum as soon as the renderer was slow, which reads as
    a catastrophe rather than as "this machine has no GPU".
- **Exact checks run and their results** (Node v22.22.2):
  - `npm run typecheck` — pass (4 projects).
  - `npm run lint` — pass, 0 errors, 0 warnings.
  - `npm test` — **170 passed / 170**, 11 files.
  - `npm run test:e2e` — **9 passed / 9**.
  - `npm run build` — pass. Clean `dist/` = **22 files, 4.8 MB** (Wrangler's own
    output says 26, counting directories); largest asset
    1.39 MB (a Japanese font). Initial load is ~1.4 MB of JS/CSS (~390 KB
    gzipped) plus 62 KB of Latin fonts; the 2.8 MB of Japanese fonts is fetched
    only when a string needs it.
  - `npx wrangler deploy --dry-run` — config valid, no bindings, no Worker
    script. **Nothing was deployed.**
  - `npx wrangler deployments --help` / `rollback --help` — confirmed the
    rollback commands quoted in `docs/DEPLOY.md` exist in the pinned Wrangler.
  - Browser inspection via Playwright: the panel renders, the figures update,
    Save run produces the report, and it survives a reload.
- **Checks not run and why:** everything requiring the headset, unchanged. The
  instrumentation has never seen an XR frame — on desktop it samples
  `requestAnimationFrame`, which is why the panel and the report both say so.
- **Outstanding defects or uncertainties:**
  - Two bugs were found by looking at the rendered panel rather than by a test,
    and both are now covered: a `>=` written as U+2265 fell outside the bundled
    Latin subset, so the label routed to the 1.4 MB Japanese font and rendered
    blank; and the 80 ms histogram ceiling collapsed the percentiles. The first
    is risk R3 from `docs/M0-REVIEW.md` occurring in our own UI, which is worth
    noting when M1 adds content validation.
  - Time-to-first-frame is measured from the Enter VR click, so it includes the
    permission prompt if one appears. That is the number a user experiences, but
    it is not purely the runtime's.
- **Quest/browser/device evidence:** Chromium (Playwright, SwiftShader) only.
  **No Quest 3, no headset, no deployment.** A later check against `npm run dev`
  on localhost established that the bundled IWER emulator stands down whenever a
  native `navigator.xr` exists, which is every desktop Chrome — so no immersive
  session has ever been opened by anything, emulated or real.
- **Next concrete task and file ownership:** Andrea deploys per `docs/DEPLOY.md`,
  runs the device script in `docs/M0-REVIEW.md` §3, saves a run and pastes it
  into `docs/QUEST-TEST.md`. Fix whatever it finds before starting M1. Ownership
  of `src/domain` and `schemas/` should stay with one writer while M1's
  validator is built.

## Copy for each completed task

- Task / owner / base revision:
- Outcome and changed paths:
- Decisions and reason:
- Exact checks run and their results:
- Checks not run and why:
- Outstanding defects or uncertainties:
- Quest/browser/device evidence:
- Next concrete task and file ownership:
