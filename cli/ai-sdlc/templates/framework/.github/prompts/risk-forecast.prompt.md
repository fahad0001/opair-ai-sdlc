---
name: risk-forecast
description: Forecast architectural and delivery risks from requirements/plans/execution/evaluation artifacts + repo signals.
agent: Orchestrator
argument-hint: "horizon=2w|1m|3m; depth=summary|detailed"
---

Generate a forward-looking risk forecast using only repository evidence.

Read:

- `docs/agent-memory/index.json`
- `docs/agent-memory/08-progress-index.md`
- `docs/agent-memory/07-quality-gates.md`
- `docs/agent-memory/06-decisions/*`
- `docs/agent-memory/02-requirements/*`
- `docs/agent-memory/03-plans/*`
- `docs/agent-memory/04-execution/*`
- `docs/agent-memory/05-evaluation/*`
- `docs/agent-logs/*`

Optional signals if present:

- CI configs under `.github/workflows/*`
- package manager configs (pnpm/yarn/npm)
- test configs
- lint/tsconfig

Rules:

- No guessing: every risk must cite at least one concrete repository signal.
- Output must include mitigation steps that fit the agent pipeline.

---

## Report Structure

### 1) Executive Risk Summary

- Top 5 risks ranked by severity
- Short reasoning for each

### 2) Risk Matrix

For each risk:

- Risk ID (RF-001...)
- Category:
  - Architecture, Security, Performance, Reliability, Delivery, Testing, Observability, Dependency, Process
- Severity: S1 (critical) – S4 (low)
- Likelihood: L1 – L4
- Evidence:
  - file paths + brief explanation
- Mitigation:
  - required ADR? required new requirement? required refactor?

### 3) Hotspots

Identify hotspots (evidence-based):

- Many requirements touching same area
- Many failures in evaluation/fix-loop
- Missing quality gate execution
- High churn modules (from logs/execution notes references)
- Untested critical flows

### 4) Horizon Forecast (horizon=${input:horizon})

- What is likely to break soon
- What will slow delivery
- What will increase defect rate

### 5) Recommendations (Pipeline-friendly)

- P0 (must do now)
- P1 (next)
- P2 (later)

If depth=summary:

- Sections 1 + 5 only.

If depth=detailed:

- All sections.
