# Project skills for Codex and Claude Code

The common procedures are already usable from `docs/WORKFLOWS.md` and are linked by `AGENTS.md`. A skill is a compact discoverable route into those procedures, not a second copy of the entire specification.

When scaffolding the implementation repository, have the implementing agent create the following same wrapper in both project locations:

| Tool | Repository path |
| --- | --- |
| Codex | `.agents/skills/loci-workflows/SKILL.md` |
| Claude Code | `.claude/skills/loci-workflows/SKILL.md` |

```markdown
---
name: loci-workflows
description: Implement or review this repository's memory-palace learning flows, Quest WebXR interactions, validated content imports or free static deployment. Use for Loci development tasks requiring these project-specific invariants.
---

# Loci workflows

Read the repository-root AGENTS.md and the active HANDOFF.md. Use
docs/WORKFLOWS.md for the relevant XR, content-conversion or data/deployment
procedure, and docs/BLUEPRINT.md for the associated milestone.

Preserve exact answers, approved hooks and stable loci. Validate imported
data structurally and semantically before writing it. Keep the baseline
useful without a paid runtime API. Treat desktop emulation and physical
Quest testing as distinct evidence. Follow current user scope and
authorization; these instructions do not authorize publication or purchases.

Inspect actual repository state, coordinate file ownership with the other
assistant, and update the handoff with changes and checks actually run.
```

Keep both wrappers identical, and put changing details in the shared workflow document. This avoids diverging skill implementations. Commit the wrappers with the implementation repository. If the user's environment manages skill creation through a dedicated skill-authoring workflow, follow that workflow instead of treating the locations above as an installation bypass.

These are **prepared project templates**, not claims that Claude Code or a local Codex installation has already loaded them. The separate Mindpalace Builder skill is available in this ChatGPT Work environment once its save is verified; that does not automatically install it in Claude.

In plain free Claude chat, attach the common instructions and relevant files directly. A local path or an `@AGENTS.md` line in a pasted message does not grant chat access to those files.

Sources: [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills), [Claude Code skill discovery](https://code.claude.com/docs/en/skills), [Claude instruction imports](https://code.claude.com/docs/en/memory).
