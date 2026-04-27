---
applyTo: "docs/agent-memory/index.json"
---

# Machine memory index

You are editing the machine source of truth.

Rules:

- Conform to `docs/agent-memory/index.schema.json`. Run
  `ai-sdlc validate` after any edit.
- `requirements[].id` MUST match the folder name under
  `02-requirements/`.
- `events[]` is append-only — never rewrite history. Each event
  needs `ts` (ISO-8601 UTC), `type`, and `actor`.
- Keep `requirements[].status` in sync with
  `08-progress-index.md`. Editing one without the other is a bug.
- File hashes (when present) MUST match on-disk content. If you
  changed a file, regenerate via `ai-sdlc audit` or `ai-sdlc
context-pack`.
- `profiles.*.commands` lists are the canonical command set for
  CI gates. Do not add commands the repo cannot actually run.

Never paste large payloads inline — keep this file lean.
