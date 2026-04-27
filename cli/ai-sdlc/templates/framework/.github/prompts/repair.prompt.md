---
name: repair
description: "Idempotent repair of memory pack overlays + scaffolding."
argument-hint: ""
---
You are running the `ai-sdlc repair` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc repair` and capture stdout.
2. Re-run `ai-sdlc doctor --json` to confirm the fix.
3. Open an ADR if any architectural file was reset.

When to invoke: Doctor reports missing overlays or hash drift.
