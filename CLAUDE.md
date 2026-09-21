@AGENTS.md

# Claude handoff

Use `docs/BLUEPRINT.md` as the product/architecture brief and `docs/WORKFLOWS.md` for the relevant task workflow. Read `HANDOFF.md` and inspect the repository before acting. The import above is for Claude Code; in ordinary Claude chat, the user must attach or paste these files.

When acting as reviewer, distinguish a reproducible defect, an unverified risk and an optional improvement. Include the affected path, evidence and a concrete next action. Do not imply access to repository files, terminal execution or a Quest headset that this session does not have.

When implementing, use the same bounded milestones, compatibility checks, file ownership and verification rules as Codex. Update the handoff after the task. Do not start a second implementation of the same milestone without coordinating ownership.
