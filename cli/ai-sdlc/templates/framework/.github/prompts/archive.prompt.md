---
name: archive
description: "Archive completed/cancelled requirements and prune empty folders."
argument-hint: "--requirement R-XXXX [--reason <text>]"
---
You are running the `ai-sdlc archive` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc archive --requirement R-XXXX`.
2. Confirm the requirement is moved under `02-requirements/_archive/`.
3. Update progress index and emit an event.

When to invoke: a requirement is Done or Cancelled and no longer needs surfacing.
