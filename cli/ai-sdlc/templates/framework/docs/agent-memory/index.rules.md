# Agent Memory Index — Update Rules

This document defines deterministic rules for updating:

- `docs/agent-memory/index.json`

It complements the human index:

- `docs/agent-memory/08-progress-index.md`

---

## 1) Ownership (Who updates what)

### Init agent

- Creates `index.json`, `index.schema.json`, `index.rules.md` if missing
- Adds new requirement entries (status=Draft)
- Sets correct folder paths for the requirement
- Increments `requirements.sequence`

### Plan agent

- Updates requirement title if refined
- Sets status to Planned
- Updates `latest.plan` reference
- Increments `requirements.sequence`

### Process agent

- Sets status to Processed
- Writes strategy docs
- Writes evaluation criteria (in evaluation folder)
- May set `latest.evaluation` to `evaluation-criteria.md` (recommended)
- Increments `requirements.sequence`

### Execution agent

- Sets status to Implemented
- Updates `latest.execution` reference
- Updates `checks.*` if it ran them
- Increments `requirements.sequence`

### Evaluation agent

- If PASS:
  - Sets status to Evaluated
  - Sets `latest.evaluation` to `evaluation-report.md`
- If FAIL:
  - Sets status to Blocked
  - Sets `latest.evaluation` to `fix-loop-report.md`
- Updates `checks.*` evidence if commands ran
- Increments `requirements.sequence`

### Finalization agent

- If PASS and approved:
  - Sets status to Done
  - Sets `latest.evaluation` to `final-approval-report.md`
  - Recommended: set `latest.execution` to `final-summary.md`
- If FAIL / unresolved:
  - Sets status to Blocked
- Increments `requirements.sequence`

---

## 2) Index Consistency Rules (Non-negotiable)

1. `generatedAt` must be updated for any change (ISO date-time).
2. The modified requirement’s `updatedAt` must match the agent update time.
3. `requirements.sequence` increments by 1 for any change to any requirement entry.
4. Paths in `latest.*.file` must exist in repo. No imaginary paths.
5. If status=Done:
   - Must have `final-approval-report.md` in evaluation folder
   - Must have `final-summary.md` in execution folder (recommended)
6. If status=Blocked:
   - Must have a fail artifact in evaluation folder: `fix-loop-report.md` or `evaluation-report.md` (FAIL)
7. Do not delete entries. Ever.

---

## 3) Status Transitions (Allowed)

Draft → Planned → Processed → Implemented → Evaluated → Done
Any state → Blocked
Blocked → Implemented → Evaluated → Done

---

## 4) Evidence Linking

When setting `checks.*.evidence`, use a short pointer such as:

- `docs/agent-logs/2026-02-12__R-0007__execution.md#commands`
  or
- `docs/agent-memory/05-evaluation/R-0007/evaluation-report.md#quality-gates-results`

---

## 5) Command Sources

Agents must prefer commands from:

- `docs/agent-memory/index.json` → `profiles.frontend.commands` / `profiles.backend.commands`

If a command cannot be run (repo not scaffolded), set:

- status = NOT_RUN
- evidence = reason and link to the log entry
