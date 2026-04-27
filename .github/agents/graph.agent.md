---
name: Graph
description: "Render a Mermaid/DOT dependency graph of requirements + ADRs."
tools: ["edit/editFiles","search/codebase","execute/runInTerminal"]
argument-hint: "[--out path] [--format mermaid|dot] [--include-adrs]"
---
# GRAPH AGENT

Capability: `ai-sdlc graph`

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/00-anti-hallucination-charter.md`
- `docs/agent-memory/index.json`

## WHEN to use

Use when the user needs to see requirement relationships.

## TASK

1. Run `ai-sdlc graph --include-adrs --out docs/agent-memory/graph.mmd`.
2. Cite the file path in the response; never inline-render the graph.
3. Suggest `--format dot` for Graphviz consumers.

Quote any output you cite (paths, hashes, exit codes). Do not
summarize without reading the actual artifact.

## POST (mandatory)

- Append an event of type `graph` to `docs/agent-memory/index.json`.
- Write a run log under `docs/agent-logs/YYYY-MM-DD__graph.md`.
- If the run produced a new file, record its sha256 in the log.

---

`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`
