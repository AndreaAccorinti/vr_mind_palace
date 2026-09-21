# First prompt for Codex

Give Codex this prompt together with the complete build pack or the repository files. If the repository already has work, Codex should inspect it before scaffolding.

```text
Build the first milestone of my browser-based memory-palace app, working title Loci, for Meta Quest 3.

Read AGENTS.md, docs/BLUEPRINT.md, docs/WORKFLOWS.md, HANDOFF.md and the supplied schema/fixture. If I supplied the combined build pack instead of files, first materialize its explicitly marked files into a new project directory, preserving existing files and reporting conflicts. The pack is a specification, not a working application. During scaffolding, create the project skill wrappers from docs/SKILL-SETUP.md using this environment's supported skill-authoring workflow.

Use React + TypeScript + Vite, Three.js, @react-three/fiber and @react-three/xr. Select currently compatible stable versions using official documentation and package peer dependencies. Commit a reproducible lockfile in the implementation repository. Do not use forced dependency installs, assume obsolete WebXR APIs or switch the stack silently. Use a supported Node version consistently.

The deployed app must run on a free static host without a paid AI API, GPU server or always-on backend. Target Cloudflare Workers Static Assets with no Worker server script, but keep the Vite dist output portable. Claude and Codex assist development; they are not required runtime services.

Implement M0 first:
1. A polished, small desktop page with a meaningful loading state, WebXR capability status and an Enter VR button triggered by the user. Unsupported browsers get a useful desktop 3D view.
2. One lightweight, visually distinct room with three large selectable mnemonic props, stable locations and readable spatial text. Use procedural demo objects so no external asset service is required.
3. Controller ray selection, a teleport target, 30-degree snap turning, seated/standing choice, recenter and clean session exit/re-entry. Move the XR origin correctly. Keep essential controls inside the 3D scene, not only in HTML.
4. Session-error, missing-input and WebGL failure handling; no forced camera motion, continuous movement by default, heavy shadows or postprocessing.
5. A tidy project structure separating domain, scene, editor and future persistence. Do not implement sync, an AI backend, authentication, generated 3D worlds or multiplayer in M0.
6. Documented npm scripts and the supplied hosting configuration adapted to the actual project. Add a concise device-test checklist.

Run the install, typecheck, lint, relevant checks and production build available to you. Inspect the desktop flow and use development XR emulation if available. State exactly which checks ran. Do not claim Quest 3 compatibility, comfort or frame performance has been tested without physical-device evidence. Leave those checks pending with precise steps for me.

Work autonomously on authorized, reversible implementation. Preserve unrelated changes and keep one owner for shared contracts/dependencies. Update HANDOFF.md with the result, paths, decisions, checks, unresolved problems and next milestone. Finish M0 before broadening the feature set. Do not publish the website or purchase anything from this prompt alone; make the build and deployment instructions ready for review.
```

## Follow-up once M0 is tested

```text
Read the latest HANDOFF.md and my Quest 3 test observations. Fix confirmed M0 issues first, then implement M1 from docs/BLUEPRINT.md. Build one complete learning loop: validated content import, preview, stable placement in three rooms/eight loci, Dexie persistence across reload, cue/hint/reveal/rating and content export. Use the supplied v1 schema and fixture. Keep a separate review store so content reimports cannot delete progress. Test malformed-import rollback and export/import identity handling. End with an updated handoff and state all remaining hardware checks honestly.
```

## Review prompt when Claude implements

```text
Review the current diff against AGENTS.md and the active milestone. Inspect the files and reproduce relevant issues where possible. Focus on session lifecycle, input/locomotion, stable loci, import atomicity, data loss, dependency compatibility and accidental paid/public dependencies. Report actionable defects by severity with paths and evidence. Separate unverified risks from defects and optional preferences. Do not rewrite the implementation during a review task.
```
