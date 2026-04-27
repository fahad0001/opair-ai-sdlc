---
name: tech-debt-quantify
description: Quantify technical debt with a scoring model (0-100) and generate prioritized remediation requirements.
agent: Orchestrator
argument-hint: "depth=summary|detailed|audit; createDebtRequirements=true|false"
---

Quantify technical debt using only repository evidence.

Read:

- `docs/agent-memory/index.json`
- `docs/agent-memory/08-progress-index.md`
- `docs/agent-memory/07-quality-gates.md`
- `docs/agent-memory/06-decisions/*`
- `docs/agent-memory/02-requirements/*`
- `docs/agent-memory/04-execution/*`
- `docs/agent-memory/05-evaluation/*`
- `.github/workflows/*` (if exists)

Rules:

- No guessing: every score must have evidence references.
- Output must include a scoring breakdown and a prioritized backlog.

---

## Scoring Model (0-100)

Compute total debt score from categories:

A) Traceability Debt (0-20)

- Missing traceability mappings
- Missing requirement artifacts

B) Quality Gates Debt (0-25)

- NOT_RUN prevalence
- failing checks
- missing CI enforcement

C) Test Debt (0-20)

- requirements without tests/evaluation
- repeated fix-loops
- low coverage signals (if available)

D) Architecture Debt (0-20)

- major changes without ADRs
- boundary violations
- inconsistent patterns (e.g., multiple competing approaches)

E) Delivery/Process Debt (0-15)

- stale requirements
- blocked items piling up
- missing logs/notes

Total = A+B+C+D+E.

---

## Output

### 1) Debt Score Summary

- Total debt score:
- Category breakdown:

### 2) Evidence Table

| Category | Finding | Evidence | Impact |
| -------- | ------- | -------- | ------ |

### 3) Debt Backlog (Prioritized)

For each backlog item:

- Title
- Debt category
- Severity
- Proposed requirement ID (if createDebtRequirements=true)
- Scope / DoD
- Expected benefit

If createDebtRequirements=true:

- Create new requirements R-XXXX for top remediation items with:
  - requirement.md, acceptance-criteria.md, etc.
- Mark them Draft and tag with `tech-debt`.

If depth=summary:

- Only sections 1 and 3.

If depth=detailed:

- Include all.

If depth=audit:

- Also list each requirement missing evaluation/tests and each failed gate by requirement.
