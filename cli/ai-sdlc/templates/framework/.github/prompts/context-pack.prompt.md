---
name: context-pack
description: "Bundle the memory pack as sha256-pinned JSONL for LLM consumption."
argument-hint: "[--requirement R-XXXX...] [--exclude-bodies] [--out path]"
---
You are running the `ai-sdlc context-pack` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc context-pack --out docs/agent-memory/context-pack.jsonl`.
2. Record the resulting file's sha256 in the agent log.
3. Pass the path (not the content) to downstream consumers.

When to invoke: another agent needs a deterministic, hashed snapshot of memory.
