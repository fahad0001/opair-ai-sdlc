---
name: graph
description: "Render a Mermaid/DOT dependency graph of requirements + ADRs."
argument-hint: "[--out path] [--format mermaid|dot] [--include-adrs]"
---
You are running the `ai-sdlc graph` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc graph --include-adrs --out docs/agent-memory/graph.mmd`.
2. Cite the file path in the response; never inline-render the graph.
3. Suggest `--format dot` for Graphviz consumers.

When to invoke: the user needs to see requirement relationships.
