# Shared instructions — Loci

Build a free browser memory-palace app for Meta Quest 3. Read `docs/BLUEPRINT.md`, the active task and the latest `HANDOFF.md` before changing code. The repository is authoritative; verify actual files and diffs. This pack initially contains specifications and configuration templates, not a running application.

## Architecture and cost

- Default: React + TypeScript + Vite; Three.js + React Three Fiber + React Three XR; Dexie; Zod; a scheduler adapter for ts-fsrs. Use compatible stable dependencies and a committed lockfile. Verify current APIs against official documentation and installed types.
- Initial deployment: Cloudflare Workers Static Assets Free, with no server Worker script. Preserve portability of `dist/` to other static hosts.
- Make the complete baseline useful without accounts, backend services or AI API keys. Add Supabase sync only in its designated task. A request to implement the application does not imply a purchase or permission to publish personal content.
- Keep learning data and scheduling independent of React/Three.js. Use typed, validated data to select allowed scene assets/actions. Never evaluate imported code.

## Product invariants

- Exact answer and source excerpt are separate from the mnemonic. Unknown facts remain unresolved drafts.
- Preserve stable room, locus and item IDs and saved placements. Sorting, new imports, due dates and theme changes cannot silently remap an existing palace.
- Keep the user's saved pronunciation hooks unchanged unless the user edits or accepts replacements. Sound approximations are not phonetic truth.
- One learning objective per item and one active item per locus in v1. Use a clear, large mnemonic scene and an uncluttered route.
- Persist only through the repository layer. Handle quota failures visibly. Distinguish content import/export from a complete backup with review state and media.
- Imported content must pass structural AND semantic validation before a transaction writes it. Failed imports leave the prior database unchanged. Import-as-copy remaps references consistently; content reimports cannot erase scheduling history.

## XR and accessibility

- Use `immersive-vr`, HTTPS and feature detection; handle session failure. Always offer a usable desktop mode.
- Controller selection, teleport and snap turn come before hand tracking. Move the XR origin; leave tracked headset pose under the runtime's control. Provide seated mode, recenter and an exit action.
- Render essential controls and text inside the 3D scene. Do not depend on normal DOM overlays being visible in VR.
- Keep camera motion voluntary, the horizon stable and scene loading bounded. Treat budgets in the blueprint as initial engineering targets, not verified headset limits.
- Bundle necessary models/fonts locally; inspect licensing and remove accidental remote dependencies. No paid image or 3D-generation API is required.
- Keep keyboard, touch and non-drag editing available in the 2D interface. Do not autoplay audio.

## Workflow and ownership

- Complete a bounded milestone with useful verification. Start with M0 before building advanced editors or sync.
- Claude and Codex share these instructions. Prefer one writer and one reviewer. When working concurrently, use distinct worktrees and file ownership. Coordinate changes to schema, migrations, package manifests and lockfiles.
- Read existing changes; preserve unrelated work. Do not “fix” uncertainty by replacing the stack or rewriting the repository.
- Keep a short task entry and handoff with base revision, touched paths, decisions, checks actually run, limitations and the next concrete task. Never claim a tool, command or device check ran when it did not.
- Act on authorized implementation work. Ask only when a missing decision materially changes scope or when an external action lacks authorization. This file does not add approval requirements to actions already authorized by the user.

## Checks

After scaffolding, provide documented npm scripts: `dev`, `build`, `typecheck`, `lint`, `test` and `test:e2e`. Use `npm ci` when a lockfile exists. Use focused tests for domain rules, persistence, import/export and critical interactions. Do not add snapshot tests for decorative layout or tests that only mirror implementation.

Meaningful gates: invalid import rollback; identity/reference integrity; export/reimport; review idempotence; placement stability; reload persistence; desktop fallback; enter/exit session cleanup. Add backup/media and two-user isolation tests when those features exist.

Run the build and inspect the relevant browser flow. Use IWER only as development evidence. Report Quest 3 hardware validation as **pending** until Andrea or a real-device session has verified it. Distinguish app timings from actual XR frame cadence.

## Data and publication

- No secrets in client code, `VITE_*` variables, logs or bundles. A designated Supabase browser publishable key is intentionally public; service-role credentials are not.
- Keep personal exports and learning material out of public assets and Git by default. Use clearly synthetic public demo content.
- A production deployment is public application delivery, not a content synchronization mechanism. Confirm the current task authorizes publication and inspect what will be published.
- Do not introduce telemetry, paid add-ons or API calls merely to complete the baseline. Diagnose actual errors rather than disabling TLS, access controls or tests.

For task-specific procedures read `docs/WORKFLOWS.md`. Keep this instruction file compact; detailed decisions belong in the blueprint or an ADR.
