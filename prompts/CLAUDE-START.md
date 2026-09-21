# First prompt for Claude

For **free Claude chat**, attach the blueprint, shared rules, workflows and current handoff. Attach the relevant source files or diff for a code review. Ordinary chat does not automatically read a local repository. For **Claude Code**, put the files in the repository and start there; `CLAUDE.md` imports `AGENTS.md`. Claude Code requires eligible paid access or API billing under the currently published plans.

```text
Act as the product/design partner and code reviewer for Loci, my free browser-based memory-palace application for Meta Quest 3. Codex will implement the first milestone. Use the attached files or actual repository as the shared source of truth.

Read AGENTS.md, docs/BLUEPRINT.md, docs/WORKFLOWS.md and HANDOFF.md. If a referenced file is missing, state the gap and continue with the supplied material; never claim to have inspected it. The initial delivery is a specification pack, not an implemented app.

The chosen baseline is React + TypeScript + Vite, Three.js, React Three Fiber, React Three XR and eventually Dexie + Zod + an FSRS adapter. Hosting is Cloudflare Workers Static Assets Free without a server Worker. AI API calls, a paid backend and text-to-3D generation are not baseline dependencies. Meta IWSDK was considered; propose a stack change only with a concrete blocker and a small comparison experiment.

The learning workflow is source -> atomic objective -> reviewed mnemonic -> fixed locus -> rehearsal -> recall before reveal -> rating and scheduling. Preserve the exact answer separately from the mnemonic. Support an optional number peg, one coherent meaning scene and an ordered pronunciation chain with the user's persistent hook dictionary. Keep scenes clear and memorable; no tiny object clutter or automatic relocation of learned items.

For this first task, produce an implementation-ready review of M0, not another whole-app rewrite:
- Identify any material gaps in the one-room/three-prop XR milestone.
- Specify the desktop entry page and spatial cue/controls, including loading, unsupported browser, denied session and return-from-VR states.
- Give precise controller/comfort acceptance criteria and a short Quest 3 test script.
- Explain how to keep the scene renderer separate from the learning-data model.
- Return a bounded task list for Codex and at most five prioritized risks that actually affect M0.

Do not invent measurements, claim tests you cannot run or silently add accounts, APIs, paid subscriptions or a backend. If using ordinary chat, output concrete decisions, file-targeted edits or review findings; do not pretend you executed terminal commands. If you have actual repository tools, inspect current state before proposing changes.

When I provide Codex's diff, review it for reproducible bugs, XR input/session mistakes, comfort, text visibility, data boundaries and dependency issues. Label findings as confirmed defect, needs verification or optional improvement. Give the smallest useful fix and state what evidence would close each finding.
```

## If Claude Code will implement a bounded task

```text
Take ownership of the task named in HANDOFF.md, after confirming Codex is not editing the same paths. Follow CLAUDE.md and the imported AGENTS.md. Use a separate worktree if both tools are active. Implement only the assigned scope, verify it with the relevant checks, and update the handoff. Coordinate changes to schemas, package manifests and lockfiles. Never use the presence of a second assistant as evidence that a test or deployment was completed.
```

## Handoff back to Codex

```text
Use the latest repository state and handoff. Review these Claude findings against the actual files, reproduce relevant issues and fix confirmed problems. Preserve unrelated changes. Explain any rejected suggestion with evidence, run the affected checks and update HANDOFF.md. Findings follow:

[Paste Claude's findings here.]
```
