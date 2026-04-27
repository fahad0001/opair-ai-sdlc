# Copilot Instructions (Workspace)

You MUST follow `AGENTS.md` (Agent Operating Contract) and any nested `AGENTS.md` in subfolders.

## Default behavior

- Prefer reading existing code/docs over guessing.
- Produce changes in small, reviewable steps.
- Every output must be written to `docs/agent-memory/*` as defined in `AGENTS.md`.
- Maintain the Agent Memory Index in `docs/agent-memory/index.json` per `docs/agent-memory/index.rules.md`.

## Traceability

- Every requirement has ID: R-XXXX.
- Every change references R-XXXX in docs and work artifacts.
- When updating a requirement, update:
  - `docs/agent-memory/08-progress-index.md` (human table)
  - `docs/agent-memory/index.json` (machine index)

## Quality

- No hallucination: if unsure, inspect files or run commands and cite evidence.
- Don’t add dependencies without an ADR in `docs/agent-memory/06-decisions/`.
- Keep performance in mind (avoid heavy operations and unnecessary rerenders).

## Communication

- Be explicit about what you read and what you wrote.
- If blocked, write exactly what is missing and where.
