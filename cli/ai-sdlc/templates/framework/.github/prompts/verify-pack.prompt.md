---
name: verify-pack
description: "Re-hash on-disk memory and compare to a context-pack JSONL."
argument-hint: "--pack <path> [--strict] [--json]"
---
You are running the `ai-sdlc verify-pack` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc verify-pack --pack <path> --json`.
2. Treat any non-empty `drift` array as a hard failure.
3. Re-emit the pack via `ai-sdlc context-pack` if drift is expected.

When to invoke: before consuming a context-pack from another run, or in CI.
