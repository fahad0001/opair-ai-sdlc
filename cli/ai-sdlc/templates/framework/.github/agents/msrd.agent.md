---
name: MSRD
description: "Render the Most-Significant-Requirements digest from index.json."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--top n] [--out path]"
---
# MSRD AGENT

Capability: `ai-sdlc msrd`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when weekly review or release-readiness check.

## TASK

1. Run `ai-sdlc msrd --top 20 --out docs/agent-memory/msrd.md`.
2. Highlight blocked or stalled requirements.
3. Link the digest from the dashboard.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `msrd` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__msrd.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
