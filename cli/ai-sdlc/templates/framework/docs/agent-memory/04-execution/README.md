# Execution

This folder contains implementation evidence and notes produced during code changes.

Each requirement has its own folder:

`docs/agent-memory/04-execution/R-XXXX/`

## Required file

- `implementation-notes.md`
  - What changed and why (traceable to requirement)
  - Files touched list
  - Commands run + outcomes (typecheck/lint/test/build/e2e if applicable)
  - Deviations from plan (must link ADR if significant)
  - Known limitations and follow-ups

## Optional files (recommended depending on complexity)

- `change-summary.md`
  - High-level diff summary and migration notes

- `dev-notes.md`
  - Debugging notes, repro steps, short logs (text only)

- `follow-up-fixes.md`
  - Created when Evaluation FAILs or flags issues

- `final-summary.md`
  - Created by Finalization when requirement is DONE
  - Contains “what was delivered” + “how to verify quickly” + “future improvements”

## Rules

- Do not store large logs or binaries here.
- Keep it factual and evidence-based.
- Every note must reference R-XXXX and ideally specific acceptance criteria.

## Source of truth

Code is the actual artifact; this folder stores “why, what, evidence, and traceability” for future agents.
