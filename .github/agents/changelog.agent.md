---
name: Changelog
description: "Append a CHANGELOG entry from the latest evaluation."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--requirement R-XXXX]"
---
# CHANGELOG AGENT

Capability: `ai-sdlc changelog`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when a requirement transitions to Done.

## TASK

1. Run `ai-sdlc changelog --requirement R-XXXX`.
2. Verify the entry references the right ADRs and AC IDs.
3. Commit the CHANGELOG separately for review.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `changelog` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__changelog.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
