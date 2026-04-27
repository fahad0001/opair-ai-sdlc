---
name: SbomCheck
description: "Validate an SBOM against the project's license + advisory policy."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "--sbom <path>"
---
# SBOMCHECK AGENT

Capability: `ai-sdlc sbom-check`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when after `npm install` lockfile changes or before a release.

## TASK

1. Generate or pass an SBOM (SPDX/CycloneDX).
2. Run `ai-sdlc sbom-check --sbom <path>`.
3. Open an ADR for any banned license; never silently waive.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `sbom-check` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__sbom-check.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
