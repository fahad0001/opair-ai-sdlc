---
name: ki
description: "Manage known-issues.md entries (list/add/resolve)."
argument-hint: "list|add|resolve"
---
You are running the `ai-sdlc ki` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. List with `ai-sdlc ki list --json` to inspect.
2. Add with `ai-sdlc ki add "title" --severity low|medium|high`.
3. Resolve with `ai-sdlc ki resolve KI-XXXX --note "..."`.

When to invoke: an issue is discovered that doesn't yet warrant a full requirement.
