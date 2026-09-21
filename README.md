# Loci — Quest 3 memory palace

A free, static, browser-based memory palace for Meta Quest 3. Author learning
items on a normal screen; walk the palace and rehearse them in VR.

**Status: milestone M0 (XR viability) is implemented and passes its automated
checks. It has NOT been tested on a Quest 3.** Hosting and tool-plan facts in
`docs/BLUEPRINT.md` were checked on 16 September 2026.

## Run it

```bash
npm ci          # Node 22 (see .nvmrc)
npm run dev     # desktop dev server
npm run build   # production build into dist/
npm run preview # serve the built output
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. Copies controller assets first. |
| `npm run build` | Typechecks all three TS projects, then builds `dist/`. |
| `npm run preview` | Serves the built `dist/` locally. |
| `npm run typecheck` | `tsc -b --noEmit` across app, node and e2e projects. |
| `npm run lint` | ESLint, including the domain-layer import boundary rule. |
| `npm test` | Vitest: domain, persistence, schema conformance, architecture. |
| `npm run test:e2e` | Playwright desktop checks against the production build. |
| `npm run assets` | Copies bundled WebXR controller profiles into `public/`. |
| `npm run deploy` | `wrangler deploy`. **Publishes.** Read `docs/BLUEPRINT.md` first. |

### Testing on the headset

WebXR needs a secure context, so a `npm run dev` LAN address will **not** offer
VR — the page will correctly say there is no WebXR and that is not a bug. Serve
the built output over HTTPS (a deployed `workers.dev` URL or a tunnel), open the
top-level URL in Meta Quest Browser, then follow the script in
`docs/M0-REVIEW.md` §3 and record results in `docs/QUEST-TEST.md`.

## Layout

```
src/domain/       What a palace IS. No React, no Three.js, no browser globals.
src/persistence/  Repository interfaces + M0 adapters. Dexie arrives in M1.
src/scene/        How it looks. Three.js / React Three Fiber.
src/app/          Entry page, capability detection, XR session, state wiring.
build/            Build-time steps (controller assets, emulator stub).
e2e/              Playwright desktop checks.
```

The domain boundary is enforced by an ESLint rule and by
`src/architecture.test.ts`, not just by convention.

## Start here

1. Read `HANDOFF.md` for the current state, the decisions taken and the checks actually run.
2. Read `docs/M0-REVIEW.md` for what M0 delivers, what is still missing, the controller/comfort acceptance criteria and the device test script.
3. Read `docs/BLUEPRINT.md` for the recommendation, cost boundaries, screen design, architecture and milestones.
4. Run `docs/QUEST-TEST.md` on the physical headset. Record the result there and in `HANDOFF.md`. **M0 is not finished until this happens.**
5. `prompts/CODEX-START.md` and `prompts/CLAUDE-START.md` hold the implementer and reviewer briefs for the next milestone.

## Files

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Shared architecture, product, collaboration and verification rules |
| `docs/M0-REVIEW.md` | M0 state, gaps, acceptance criteria, risks and next tasks |
| `CLAUDE.md` | Explicit import of the shared rules for Claude Code |
| `HANDOFF.md` | Current state and a handoff template |
| `docs/BLUEPRINT.md` | Full sourced design and hosting comparison |
| `docs/WORKFLOWS.md` | Shared procedures for XR, mnemonic conversion and data/deployment checks |
| `docs/SKILL-SETUP.md` | Project-scoped skill wrapper instructions for both tools |
| `docs/QUEST-TEST.md` | Physical Quest acceptance checklist |
| `docs/ASSET-CATALOG.json` | Initial procedural asset recipes; models are not supplied |
| `schemas/palace.schema.json` | Small v1 content interchange contract |
| `examples/palace-example.json` | Three rooms, eight loci, three demo learning items |
| `prompts/CODEX-START.md` | Implementer, continuation and review prompts |
| `prompts/CLAUDE-START.md` | Designer/reviewer and optional implementer prompts |
| `prompts/CONTENT-TO-PALACE.md` | Manual AI-to-JSON content workflow |
| `wrangler.jsonc` | Assets-only Cloudflare configuration template |
| `public/_headers` | Basic production headers including WebXR permission policy |

## Two important boundaries

The v1 content file contains built-in scene recipes only. It does not contain custom media, review history or scheduler state. Introduce a versioned extension and a complete backup format before image/audio import and full restoration.

The application can run without a paid API. That does not make coding-assistant subscriptions or unlimited automated AI generation free. Use the free chat/manual workflow or access you already have.

Dependencies are installed and locked (`package-lock.json`), and the automated
checks listed in `HANDOFF.md` pass. **No website has been deployed and no
physical-headset test has been performed.**
