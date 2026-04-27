---
name: threat-coverage
description: "Check coverage of the threat model matrix against requirements."
argument-hint: "[--kind ai|api|web|...]"
---
You are running the `ai-sdlc threat-coverage` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc threat-coverage`.
2. Map missing kinds to STRIDE/LINDDUN categories.
3. Open a follow-up requirement for any gap that is in scope.

When to invoke: during planning of security-sensitive requirements.
