---
name: sbom-diff
description: "Diff two SBOMs and surface added/removed/upgraded packages."
argument-hint: "--from <path> --to <path>"
---
You are running the `ai-sdlc sbom-diff` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc sbom-diff --from old.json --to new.json`.
2. Highlight new transitive dependencies and version bumps.
3. Cross-reference with `sbom-check` to flag policy violations.

When to invoke: evaluating a dependency upgrade PR.
