---
name: Autopilot
description: "Run requirements through the full SDLC pipeline autonomously."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--requirement id|all] [--max-parallel n] [--budget-minutes m]"
---
# AUTOPILOT AGENT

Capability: `ai-sdlc autopilot`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when many requirements are queued and ready for unattended execution.

## TASK

1. Run `ai-sdlc autopilot --requirement all --dry-run` first.
2. Confirm the plan, then re-run without `--dry-run`.
3. Watch `docs/agent-logs/` for per-requirement results.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `autopilot` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__autopilot.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
