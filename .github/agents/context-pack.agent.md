---
name: ContextPack
description: "Bundle the memory pack as sha256-pinned JSONL for LLM consumption."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--requirement R-XXXX...] [--exclude-bodies] [--out path]"
---
# CONTEXTPACK AGENT

Capability: `ai-sdlc context-pack`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when another agent needs a deterministic, hashed snapshot of memory.

## TASK

1. Run `ai-sdlc context-pack --out docs/agent-memory/context-pack.jsonl`.
2. Record the resulting file's sha256 in the agent log.
3. Pass the path (not the content) to downstream consumers.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `context-pack` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__context-pack.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
