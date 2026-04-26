# AGENTS.md — Agent Operating Contract (AOC)

## 0) Purpose

This repository is operated using a deterministic multi-agent SDLC pipeline:

Init → Plan → Process → Execution → Evaluation → Finalization

Agents MUST rely on file-based memory and artifacts so work is reproducible even when chat context is not shared.

---

## 1) Non-Negotiable Rules

1. **No hallucination**
   - If unsure, inspect repo files and/or run commands.
   - Any claim about behavior must be backed by evidence (file path, command output, or test result).

2. **Single Source of Truth**
   - The canonical memory lives in `docs/agent-memory/`.
   - The canonical machine index is `docs/agent-memory/index.json`.

3. **PRE + POST is mandatory for every agent**
   - PRE: read required memory files before acting.
   - POST: write outputs to the correct folders, update indices, write logs.

4. **Traceability is mandatory**
   - Every change must map back to a requirement `R-XXXX`.
   - Keep `traceability.md` updated per requirement.

5. **No silent architectural drift**
   - Any major change requires an ADR in `docs/agent-memory/06-decisions/`.

---

## 2) Memory Pack (must read before acting)

All agents must read:

- `docs/agent-memory/index.rules.md`
- `docs/agent-memory/index.json`
- `docs/agent-memory/00-project-context.md`
- `docs/agent-memory/01-architecture.md`
- `docs/agent-memory/07-quality-gates.md`
- `docs/agent-memory/08-progress-index.md`

And requirement-specific:

- `docs/agent-memory/02-requirements/R-XXXX/*`
- `docs/agent-memory/03-plans/R-XXXX/*` (when relevant)
- `docs/agent-memory/04-execution/R-XXXX/*` (when relevant)
- `docs/agent-memory/05-evaluation/R-XXXX/*` (when relevant)

---

## 3) Directory & Artifact Contract

### 3.1 Requirements

Location: `docs/agent-memory/02-requirements/R-XXXX/`
Must contain:

- `requirement.md`
- `acceptance-criteria.md`
- `nonfunctional.md`
- `constraints.md`
- `risks.md`
- `traceability.md`
  Optional:
- `meta.json` (snapshot)

### 3.2 Plans

Location: `docs/agent-memory/03-plans/R-XXXX/`
Must contain (once Process completes):

- `plan.md`
- `execution-strategy.md`
- `implementation-order.md`
- `validation-plan.md`
- `rollback-plan.md`
  Optional:
- `work-breakdown.md`
- `open-questions.md`

### 3.3 Execution

Location: `docs/agent-memory/04-execution/R-XXXX/`
Must contain:

- `implementation-notes.md`
  Optional:
- `change-summary.md`
- `dev-notes.md`
- `follow-up-fixes.md`
- `final-summary.md`

### 3.4 Evaluation

Location: `docs/agent-memory/05-evaluation/R-XXXX/`
Must contain after evaluation:

- `evaluation-criteria.md` (from Process)
- `evaluation-report.md`
- `metrics-report.md`
- `compliance-checklist.md`
  Conditional:
- `fix-loop-report.md` (if FAIL)
- `final-approval-report.md` (if PASS)

### 3.5 Decisions (ADRs)

Location: `docs/agent-memory/06-decisions/`

- `README.md` (ADR index)
- `ADR-template.md`
- `ADR-####-*.md`

### 3.6 Logs

Location: `docs/agent-logs/`
Naming convention:

- `YYYY-MM-DD__R-XXXX__<agent>.md`

Every agent run must append a log file.

---

## 4) Machine Memory Index Contract

The machine-readable source of truth is:

- `docs/agent-memory/index.json`

Update rules are defined in:

- `docs/agent-memory/index.rules.md`

Any agent modifying requirement state MUST update:

1. `docs/agent-memory/08-progress-index.md` (human)
2. `docs/agent-memory/index.json` (machine)

---

## 5) Status Transitions

Allowed:

- Draft → Planned → Processed → Implemented → Evaluated → Done
- Any state → Blocked
- Blocked → Implemented (after fixes) → Evaluated → Done

---

## 6) Command Execution Policy

Agents should run commands defined in:

- `docs/agent-memory/index.json` → `profiles.*.commands`

If a command is not available yet (repo not scaffolded), mark the check as:

- `NOT_RUN` with reason in logs and evaluation artifacts.

---

## 7) Definition of Done (DoD)

A requirement is **Done** only when:

- Acceptance criteria PASS with evidence
- Quality gates satisfied (or explicitly marked NOT_RUN with justified reason if system is not ready, but then requirement cannot be marked Done unless user explicitly accepts)
- Tests exist for new behavior (unless explicitly justified)
- Evaluation artifacts are written
- Traceability updated
- Progress index + machine index updated
- Final summary written

---

## 8) Nested Rules

If a folder contains a nested `AGENTS.md` (e.g. `apps/web/AGENTS.md`), those constraints apply in addition to this root contract.
