---
name: Dashboard
description: "Emit/serve a zero-build dashboard.html next to index.json."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--serve] [--port n] [--host h]"
---
# DASHBOARD AGENT

Capability: `ai-sdlc dashboard`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when stakeholders need a snapshot or a live view.

## TASK

1. Run `ai-sdlc dashboard` (or `--serve` for live).
2. Confirm `docs/agent-memory/dashboard.html` exists.
3. Provide the file:// or http:// URL for the user.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `dashboard` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__dashboard.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
