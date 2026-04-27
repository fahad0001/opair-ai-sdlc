---
name: ReleaseNotes
description: "Compose release notes from completed requirements + ADRs."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--from <ref>] [--to <ref>]"
---
# RELEASENOTES AGENT

Capability: `ai-sdlc release-notes`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when tagging a release.

## TASK

1. Run `ai-sdlc release-notes`.
2. Group by requirement + ADR, never by raw commit.
3. Ask the user to confirm tone and scope before publishing.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `release-notes` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__release-notes.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
