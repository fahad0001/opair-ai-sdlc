---
name: Validate
description: "Run schema + AHC + hash + guard checks against the memory pack."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: ""
---
# VALIDATE AGENT

Capability: `ai-sdlc validate`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when before each commit, after editing index.json, or on CI failure.

## TASK

1. Run `ai-sdlc validate`.
2. On failure, identify the exact rule (schema/AHC/hash/guard).
3. Fix in source files; never edit generated outputs to silence checks.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `validate` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__validate.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
