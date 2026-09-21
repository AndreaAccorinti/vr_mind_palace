# M0 review — XR viability

Reviewer/implementer: Claude Code. Date: 21 September 2026.
Scope: milestone M0 from `docs/BLUEPRINT.md`, as implemented in this repository.

This is a review of code that now exists, not of a proposal. Every claim below
is either something a listed check actually exercised, or is marked as
unverified. **No Quest 3 hardware test has been run.**

---

## 1. What M0 asked for, and where it stands

| M0 requirement (`prompts/CODEX-START.md`) | State | Where |
| --- | --- | --- |
| Desktop page with loading state, capability status, user-triggered Enter VR | Done | `src/app/EntryPage.tsx` |
| Unsupported browsers get a useful desktop 3D view | Done | `src/scene/DesktopCamera.tsx`, same scene tree |
| One distinct room, three large selectable props, stable loci, readable spatial text | Done | `src/scene/RoomShell.tsx`, `LocusStation.tsx`, `SpatialText.tsx` |
| Controller ray selection, teleport target, 30° snap turn, seated/standing, recentre, clean exit/re-entry | Implemented, **unverified on device** | `src/scene/Locomotion.tsx`, `TeleportFloor.tsx`, `NavigationControls.tsx` |
| XR origin moved correctly (not the headset pose) | Done by construction | `src/domain/viewer.ts` → `<XROrigin>` |
| Essential controls inside the 3D scene | Done | `SpatialButton.tsx`, `NavigationControls.tsx`, `ReviewPanel.tsx` |
| Session error, missing input and WebGL failure handling | Done | `src/app/App.tsx`, `xrCapability.ts` |
| No forced camera motion, no continuous locomotion, no shadows/postprocessing | Done | translation disabled; `shadows={false}` |
| Domain / scene / editor / persistence separation | Done and enforced | `src/domain`, `src/scene`, `src/app`, `src/persistence` |
| Documented npm scripts, hosting config, device checklist | Done | `package.json`, `wrangler.jsonc`, `docs/QUEST-TEST.md` |

### Gaps that remain in M0

1. **No physical-device evidence of anything.** Controller mapping, comfort,
   optical text readability and frame cadence are all untested. This is the
   whole point of the milestone gate and it is still open.
2. **Snap turn needs two controllers.** `useXRControllerLocomotion` returns
   early unless both a translation and a rotation controller are present
   (`@pmndrs/xr/dist/controller-locomotion.js`). With one controller, or with
   hand tracking only, stick turning silently does nothing. Mitigated by
   in-scene Turn left / Turn right buttons, but the stick behaviour itself is
   still one-controller-dependent and should be confirmed on device.
3. **Only one room template.** `gallery-6x6` is the sole shell, and
   `floorBoundsOf` is only correct for an axis-aligned room. `hasAxisAlignedBounds`
   makes that explicit and a test asserts the fixture satisfies it; a rotated
   room in M1 needs bounds expressed in room-local space.
4. **The seated offset is a guess.** `SEATED_EYE_OFFSET_METRES = 0.45` is a
   starting value, not an anthropometric measurement. It needs a seated device
   pass to tune.
5. **Scripts beyond Latin and Japanese render as tofu.** Two font families are
   bundled. A Korean or Devanagari item would have no glyph coverage. See risk 3.

---

## 2. The desktop entry surface and its states

`detectXrCapability()` deliberately distinguishes five states rather than
collapsing to a boolean, because the advice differs in each case:

| State | Trigger | What the page says |
| --- | --- | --- |
| `checking` | Before `isSessionSupported` resolves | "Checking headset support" |
| `supported` | `immersive-vr` supported | Enter VR enabled |
| `no-immersive-vr` | `navigator.xr` exists, no VR device | Points at the desktop view. **This is what a desktop Chrome gets** — it is not the same as "no WebXR" |
| `no-webxr` + secure | No `navigator.xr` on HTTPS | "Open this page in Meta Quest Browser" |
| `no-webxr` + insecure | No `navigator.xr`, `isSecureContext` false | "WebXR is only offered over HTTPS" — the single most likely first-run failure |
| `check-failed` | `isSessionSupported` threw / blocked by permissions policy | Surfaces the error, still offers the desktop view |

Session phases are separate from capability: `idle → requesting → active → ended`,
plus `denied`. Two denial paths are handled distinctly, because they look the
same to a user and have different causes:

- the promise **rejects** (`NotAllowedError` → "accept the permission prompt");
- the promise **resolves with no session** — what happens when another immersive
  app holds the headset — → "close any other immersive app".

Returning from VR lands in `ended`, not `idle`, and the page acknowledges it and
states that the viewer's place in the room was kept.

WebGL2 is probed once before mount (`detectWebGl`); if it fails, the app renders
an explanation instead of an empty canvas. The probe context is released with
`WEBGL_lose_context` so it does not count against the browser's context limit.

Storage failures are surfaced, never swallowed: `createLocalPreferencesRepository`
returns typed failures for unavailable / denied / quota-exceeded / corrupt, and
the entry page shows the message.

---

## 3. Controller and comfort acceptance criteria

These are the criteria to test against on the headset. They are **pending**, not
passed.

**Selection**
- C1 Pointing at a plinth shows hover feedback (ring changes colour) before any
  button press, at a range of at least 3 m.
- C2 One trigger press performs exactly one selection. No double-fire.
- C3 Selecting a different plinth re-hides the previously revealed answer.
- C4 Selecting a plinth does **not** move the viewer.

**Teleport**
- C5 The teleport ray shows a landing point only on the teal floor pad.
- C6 Landing is inside the pad in every case, including a ray aimed past a wall
  (the domain clamps into bounds rather than rejecting).
- C7 Height after landing is floor height, never the height of whatever the ray hit.
- C8 Teleporting does not change facing.

**Turning**
- C9 A full stick push turns exactly 30°, once, and requires a return to centre
  before turning again (the library's `canRotate` latch, dead zone 0.5).
- C10 Turning pivots about the user, with no translation and no head movement.
- C11 Turning works after the user has physically walked away from the origin.
- C12 In-scene Turn left / Turn right produce the same 30° step.

**Seated, recentre, lifecycle**
- C13 Switching to Seated raises the room without moving the user horizontally.
- C14 Recentre restores both position and facing to the room entry pose.
- C15 The posture choice survives a page reload.
- C16 Exit VR from the in-scene button ends the session cleanly.
- C17 Three enter/exit cycles leave no duplicate input listeners, stale
  controllers or lost selection state.
- C18 Removing and re-wearing the headset does not lose the review stage.

**Readability and comfort**
- C19 Cue and answer are readable at the panel's resting distance without
  leaning in.
- C20 The Japanese item (水) renders real glyphs, not boxes.
- C21 Nothing moves the camera that the user did not initiate.
- C22 Five minutes of rehearsal produces no reported discomfort; record the
  trigger if it does.

**Measurements to record (not to assume)**
- M1 `session.frameRate` and the supported frame rates array.
- M2 Delivered cadence and missed frames over a five-minute rehearsal.
- M3 Time from Enter VR to first rendered frame.

**The app now records all three.** Open **Frame stats** on the control row, leave
it running through the rehearsal, press **Save run**, then exit VR: the 2D page
shows the figures as selectable text with a copy button, ready to paste into
`docs/QUEST-TEST.md`. Add the headset model, Horizon OS version and browser
version by hand — the app cannot know those.

Two cautions about those numbers. Dropped frames are *inferred* from frame
intervals, because WebXR exposes no compositor dropped-frame counter; the panel
and the report both say so, and neither should be quoted as a compositor
measurement. And time-to-first-frame is measured from the Enter VR click, so it
includes the permission prompt if one appears — that is what the user waits
through, but it is not purely the runtime's.

### Short Quest 3 test script

1. `npm run build`, then serve `dist/` over **HTTPS** (a deployed `workers.dev`
   URL, or a tunnel). An `http://` LAN address will not offer WebXR — this is
   the most common false "unsupported" report.
2. Open the top-level URL in Meta Quest Browser. Confirm the capability line
   reads "Immersive VR available" and Enter VR is enabled.
3. Enter VR. Walk C1–C4, then C5–C8, then C9–C12.
4. Switch to Seated, recentre, repeat C1–C3 seated (C13–C15).
5. Exit and re-enter three times (C16–C18).
6. Select the 水 item, ask for the hint, cycle the sound chunks, reveal, rate
   (C19, C20).
7. Rehearse for five minutes; record M1–M3 and anything under C21–C22.

---

## 4. Keeping the renderer out of the learning model

The rule is that `src/domain` describes what a palace *is*, and `src/scene`
decides how it looks. It is enforced three ways rather than by convention:

1. **An ESLint rule.** `eslint.config.js` adds `no-restricted-imports` scoped to
   `src/domain/**`, banning `react`, `react-dom`, `three`, `three/*`,
   `@react-three/*`, and the sibling `scene`/`app`/`persistence` layers.
2. **A test.** `src/architecture.test.ts` greps every domain source for those
   imports and for browser globals (`document`, `window`, `localStorage`,
   `navigator`), so the boundary fails a normal `npm test` run.
3. **Plain data at the seam.** The domain speaks in `Vec3` tuples and
   `Transform` records, never `Vector3` or `Object3D`. `compose()` produces a
   transform; `PalaceScene` converts it to a group's `position`/`rotation` at
   the last moment.

Consequences worth keeping:

- Every spatial rule — snap turn, teleport clamping, the seated lift, recentre,
  the room entry pose — is a pure function, so it is unit-tested in Node with no
  headset and no canvas (`src/domain/viewer.test.ts`, 19 tests).
- Content selects a renderer node by `AssetId` from a closed union. Imported
  data can name a prop; it can never supply geometry, a URL or code. A schema
  test asserts that a URL in `assetId` is rejected.
- The desktop camera and the XR origin consume the *same* `originTransform()`,
  so the desktop fallback exercises the production rules rather than a parallel
  implementation.

---

## 5. Prioritised risks that actually affect M0

**R1 — No device evidence exists (highest), and desktop emulation will not
substitute.**
Everything under §3 is untested. Worse than expected: the IWER emulator that
`@pmndrs/xr` injects on localhost calls `installRuntime()` without
`forceInstall`, and IWER deliberately refuses to replace an existing
`navigator.xr`. Every desktop Chrome ships one — present, offering no device —
so on a normal development machine the emulator is constructed and then stands
down, and Enter VR stays disabled. Verified in this repo against
`npm run dev` on localhost.

This means **there is no way to exercise an immersive session without a
headset**, short of forcing the install (a `@pmndrs/xr` option that does not
exist today) or a browser extension. The entry page now says so explicitly
rather than showing an "emulator active" badge that is not true. *Close by:*
running the §3 script on the Quest 3 and recording results in
`docs/QUEST-TEST.md`.

**R2 — WebXR needs HTTPS, and the first device test usually will not have it.**
A `npm run dev` LAN address is not a secure context, so `navigator.xr` is absent
and the page correctly reports "no WebXR" — which reads like a broken app.
*Mitigated:* the entry page distinguishes the insecure-origin case and names the
fix. *Close by:* testing against a deployed HTTPS origin, per the script.

**R3 — Font coverage is limited to Latin and Japanese.**
troika's own fallback for uncovered glyphs fetches from a jsdelivr CDN, which
would be both a remote runtime dependency and a privacy leak of the text being
rendered. `pickFont()` routes each string to a bundled family, so the covered
scripts never reach for it — but an uncovered script (Korean, Devanagari, emoji)
still would.

This has already happened once, in our own interface rather than in user
content: a `>=` written as U+2265 fell outside the Latin subset, so the whole
label routed to the 1.4 MB Japanese family and rendered blank until it arrived.
`src/scene/fonts.test.ts` now pins every interface string, but user content has
no such guard. *Close by:* adding a coverage assertion at import time in M1 that
rejects or flags content the bundled fonts cannot render, before it reaches a
locus.

**R4 — The Japanese font is 1.4 MB and loads on demand.**
It is only requested when a string needs it, so a Latin-only palace never pays
for it. But the first Japanese item in a session triggers a 1.4 MB fetch, and on
a headset on a weak connection that is a visible stall with no progress
indicator. *Close by:* measuring it on device (M3), and if it matters,
pre-warming the font during the entry screen rather than at first glance.

**R5 — Snap turn depends on two connected controllers.**
See gap 2. A user who puts one controller down loses stick turning with no
feedback. *Mitigated:* in-scene turn buttons exist. *Close by:* confirming the
behaviour on device (C9, C12) and, if it is confusing, detecting the
single-controller case and saying so in the scene.

Two further items are deliberately **not** on this list because they were found
and fixed rather than deferred: troika silently refusing WOFF2 (all spatial text
was blank), and ~4.6 MB of IWER emulator room models shipping in `dist/`. Both
are covered by regression tests.

---

## 6. Bounded next tasks

Ordered. Each is small enough to own and verify.

1. **Deploy** per `docs/DEPLOY.md` to get an HTTPS origin.
2. **Run the device script.** Use Frame stats / Save run for M1–M3, then fill in
   `docs/QUEST-TEST.md`. This gates M1.
3. **Fix whatever the device pass finds**, before adding features.
4. **Font coverage validation** (R3) — a domain-level check that an item's text
   is renderable by a bundled family, surfaced in the editor.
5. **M1: Zod schema + transactional import.** The contract and the semantic
   rules already exist as tests in `src/domain/m0Content.test.ts`; promote them
   into a validator that runs over imported content.
6. **M1: Dexie behind `ContentRepository`.** The interface and its in-memory
   implementation are already the only way the app reaches content.
7. **M1: three rooms, eight loci.** Needs room-local teleport bounds first
   (gap 3) if any room is rotated.
8. **M1: review store separate from content store**, so a content re-import
   cannot erase scheduling history.
