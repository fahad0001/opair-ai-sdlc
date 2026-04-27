---
name: ProvenanceVerify
description: "Verify an attestation against a context-pack."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "--attestation <path> [--key <path>]"
---
# PROVENANCEVERIFY AGENT

Capability: `ai-sdlc provenance-verify`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when consuming or releasing a signed pack.

## TASK

1. Run `ai-sdlc provenance-verify --attestation <path>`.
2. Fail closed: do not proceed if signature or digest mismatches.
3. Log key id + result in the agent log.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `provenance-verify` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__provenance-verify.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
