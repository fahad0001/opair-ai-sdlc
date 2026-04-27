---
applyTo: "docs/agent-memory/04-execution/**"
---

# Execution notes

You are editing the execution layer.

Required artifacts (per `AGENTS.md` §3.3):

- `implementation-notes.md`.

Rules:

- Implementation notes MUST cite the exact files changed (with
  workspace-relative paths) and the AC ids they satisfy.
- Every command run MUST be reproducible: capture flags, env, and
  exit code.
- Do not invent test results — paste real output or link to CI.
- If a deviation from the plan was required, record it here AND
  open or update the relevant ADR in `06-decisions/`.
- `final-summary.md` is written only after evaluation passes.

Anti-hallucination: never claim a feature works without quoting
the test output or screenshot path that proves it.
