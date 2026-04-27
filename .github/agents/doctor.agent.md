---
name: Doctor
description: "Diagnose memory layout, AHC overlays, CI scaffolding, and vendor surfaces."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--json]"
---
# DOCTOR AGENT

Capability: `ai-sdlc doctor`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when the framework feels broken or after major edits to .github/ or docs/.

## TASK

1. Run `ai-sdlc doctor --json` and parse the structured output.
2. List each FAIL/WARN with the exact file path involved.
3. Recommend `ai-sdlc repair` only for items it can safely fix.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `doctor` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__doctor.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
