---
name: audit
description: "Audit memory + requirements + ADRs + KIs and write a dated report."
argument-hint: "[--out path] [--fix]"
---
You are running the `ai-sdlc audit` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc audit` (use `--fix` only when a self-heal is desired).
2. Read the dated report under `docs/agent-memory/09-audits/`.
3. Summarize highest-severity findings and propose fixes (one per finding).

When to invoke: memory health is in question, before a release, or on demand.
