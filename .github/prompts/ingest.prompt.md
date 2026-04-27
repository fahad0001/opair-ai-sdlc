---
name: ingest
description: "Ingest external artifacts (issues, ADRs, threat models) into memory."
argument-hint: "--from <path> [--kind issue|adr|threat]"
---
You are running the `ai-sdlc ingest` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc ingest --from <path>`.
2. Spot-check the resulting requirement/ADR/KI for fidelity.
3. Open an ADR if a translation rule is non-obvious.

When to invoke: migrating from another tracker or importing prior decisions.
