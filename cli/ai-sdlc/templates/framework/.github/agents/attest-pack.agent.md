---
name: AttestPack
description: "Produce a signed attestation over a context-pack (in-toto style)."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "--pack <path> [--key <path>]"
---
# ATTESTPACK AGENT

Capability: `ai-sdlc attest-pack`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when the team requires signed provenance for shipped artifacts.

## TASK

1. Run `ai-sdlc attest-pack --pack <path>`.
2. Store the resulting `.att.json` next to the pack.
3. Verify locally with `ai-sdlc provenance-verify` before publishing.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `attest-pack` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__attest-pack.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
