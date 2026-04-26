# Evaluation

This folder contains the verification artifacts for each requirement.

Each requirement has its own folder:

`docs/agent-memory/05-evaluation/R-XXXX/`

## Required files

- `evaluation-criteria.md` (created in Process)
  - Contract for what must be verified
  - Maps to acceptance criteria + nonfunctional requirements + quality gates
  - Defines stop/fail conditions

- `evaluation-report.md` (created in Evaluation)
  - PASS/FAIL per criterion with evidence
  - Command results (typecheck/lint/test/build/e2e)
  - Traceability verification result
  - Final verdict + confidence

- `metrics-report.md`
  - Performance and quality metrics (measured where possible)
  - Baseline comparison if available
  - Risk level reasoning

- `compliance-checklist.md`
  - Architecture/security/performance/documentation compliance

## Conditional files

- `fix-loop-report.md`
  - Created when evaluation FAILs
  - Contains ordered fix list + re-evaluation plan

- `final-approval-report.md`
  - Created by Finalization when PASS and approved
  - Confirms closure and links evidence

## Templates

Global templates live in:
`docs/agent-memory/05-evaluation/_templates/`

## Rules

- No “vibes”: PASS must be backed by evidence.
- If a check wasn’t run, mark it as NOT_RUN and explain why.
- If NOT_RUN affects confidence, do not mark requirement DONE unless user explicitly accepts.

## Source of truth

Evaluation is the “proof”. A requirement is DONE only when evaluation evidence exists and quality gates are satisfied (or explicitly accepted as exceptions).
