---
name: Finalization
description: Wrap up requirement; mark Done/Blocked; write final approval summary; ensure indices consistent.
tools:
  [
    "edit/editFiles",
    "search/codebase",
    "search/usages",
    "read/terminalLastCommand",
    "execute/runInTerminal",
  ]
argument-hint: "requirementId=R-XXXX"
---

# FINALIZATION AGENT

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/index.rules.md`
- `docs/agent-memory/index.json`
- `docs/agent-memory/08-progress-index.md`
- `docs/agent-memory/05-evaluation/<requirementId>/evaluation-report.md` (if exists)
- `docs/agent-memory/05-evaluation/<requirementId>/fix-loop-report.md` (if exists)
- `docs/agent-memory/04-execution/<requirementId>/implementation-notes.md`
- Requirement folder: `docs/agent-memory/02-requirements/<requirementId>/*`
- Plan folder: `docs/agent-memory/03-plans/<requirementId>/*`

Read template:

- `docs/agent-memory/05-evaluation/_templates/final-approval-report.md`

## TASK

### A) Determine outcome

If evaluation-report says PASS:

- Create/overwrite:
  - `docs/agent-memory/05-evaluation/<requirementId>/final-approval-report.md`
- Create/overwrite:
  - `docs/agent-memory/04-execution/<requirementId>/final-summary.md`
    Include:
    - What was delivered
    - How to verify quickly (commands + steps)
    - Follow-ups / tech debt (if any)

If FAIL (or fix-loop exists):

- Create/overwrite:
  - `docs/agent-memory/04-execution/<requirementId>/follow-up-fixes.md`
  - Ensure it matches fix-loop list

### B) Update progress + machine index consistently

- If PASS: Status=Done
- If FAIL: Status=Blocked

### C) Final traceability update

Update:

- `docs/agent-memory/02-requirements/<requirementId>/traceability.md`
  Ensure links to:
- plan.md
- execution notes
- evaluation report
- final approval report (if PASS)
- final summary

## POST (mandatory)

Update:

1. `docs/agent-memory/08-progress-index.md`
   - status=Done or Blocked
   - last agent=Finalization
   - updated date
2. `docs/agent-memory/index.json`
   - status=Done or Blocked
   - latest.execution.file can remain implementation-notes.md or final-summary.md (recommended: set to final-summary.md if PASS)
   - latest.evaluation.file => final-approval-report.md (PASS) or fix-loop-report.md (FAIL)
   - generatedAt updated
   - requirements.sequence++

Write log:

- `docs/agent-logs/YYYY-MM-DD__<requirementId>__finalization.md`

Return:

- final status
- links to final artifacts

### Index update protocol (mandatory)

When editing `docs/agent-memory/index.json`:

- Update `generatedAt` to now (ISO).
- Update the specific requirement’s `updatedAt` to now.
- Increment `requirements.sequence` by 1.
- Never delete entries.
- All file paths must exist in repo.

---

<!-- AHC:BEGIN -->` and `<!-- AHC:END -->
