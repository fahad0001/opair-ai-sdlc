---
name: dora-export
description: "Export DORA metrics (lead time, deploy freq, MTTR, change-fail) from events."
argument-hint: "[--since <date>] [--out path]"
---
You are running the `ai-sdlc dora-export` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc dora-export --out docs/agent-memory/metrics/dora.json`.
2. Render trends in the dashboard or a separate report.
3. Note any anomaly that warrants a postmortem.

When to invoke: the team reviews delivery health.
