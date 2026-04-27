---
name: SbomDiff
description: "Diff two SBOMs and surface added/removed/upgraded packages."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "--from <path> --to <path>"
---
# SBOMDIFF AGENT

Capability: `ai-sdlc sbom-diff`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when evaluating a dependency upgrade PR.

## TASK

1. Run `ai-sdlc sbom-diff --from old.json --to new.json`.
2. Highlight new transitive dependencies and version bumps.
3. Cross-reference with `sbom-check` to flag policy violations.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `sbom-diff` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__sbom-diff.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
