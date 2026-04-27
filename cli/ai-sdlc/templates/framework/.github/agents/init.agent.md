---
name: Init
description: Bootstrap memory system + requirement folder; enforce PRE/POST; initialize machine index and templates.
tools: ["edit/editFiles", "search/codebase"]
handoffs:
  - label: Go to Plan
    agent: Plan
    prompt: "Use the requirementId produced by Init. Run PRE+POST. Fill requirement templates and create plan.md."
    send: false
argument-hint: "requirementId=R-XXXX (or omit to create next available R-XXXX)"
---

# INIT AGENT

## PRE (mandatory)

Read these files if they exist; if missing, create them from templates in POST:

- `AGENTS.md`
- `docs/agent-memory/index.rules.md`
- `docs/agent-memory/index.schema.json`
- `docs/agent-memory/index.json`
- `docs/agent-memory/00-project-context.md`
- `docs/agent-memory/01-architecture.md`
- `docs/agent-memory/06-decisions/README.md`
- `docs/agent-memory/06-decisions/ADR-template.md`
- `docs/agent-memory/07-quality-gates.md`
- `docs/agent-memory/08-progress-index.md`
- `docs/agent-logs/README.md`

Also check for nested guardrails (do not create unless folders exist):

- `apps/web/AGENTS.md`
- `apps/api/AGENTS.md`

## TASK

You must ensure the repository has a complete “agent memory” foundation.

### A) Ensure folders exist

Create if missing:

- `docs/agent-memory/`
- `docs/agent-memory/02-requirements/`
- `docs/agent-memory/03-plans/`
- `docs/agent-memory/04-execution/`
- `docs/agent-memory/05-evaluation/`
- `docs/agent-memory/06-decisions/`
- `docs/agent-logs/`
- `docs/agent-memory/03-plans/_templates/`
- `docs/agent-memory/05-evaluation/_templates/`

### B) Ensure core docs exist (create if missing)

Create these (if missing) using your project templates:

- `docs/agent-memory/00-project-context.md`
- `docs/agent-memory/01-architecture.md`
- `docs/agent-memory/06-decisions/README.md`
- `docs/agent-memory/06-decisions/ADR-template.md`
- `docs/agent-memory/07-quality-gates.md`
- `docs/agent-memory/08-progress-index.md`
- `docs/agent-memory/index.rules.md`
- `docs/agent-memory/index.schema.json`
- `docs/agent-memory/index.json`
- `docs/agent-logs/README.md`

### C) Ensure subfolder READMEs exist (create if missing)

- `docs/agent-memory/02-requirements/README.md`
- `docs/agent-memory/03-plans/README.md`
- `docs/agent-memory/04-execution/README.md`
- `docs/agent-memory/05-evaluation/README.md`

### D) Ensure template packs exist (create if missing)

#### Requirements templates (for new R-XXXX folders)

Source-of-truth templates live at `docs/agent-memory/00-templates/requirement-skeleton/`.
Init copies these into a new `02-requirements/<requirementId>/` folder, replacing the literal
`R-XXXX` placeholder with the assigned ID:

- `requirement.md`
- `acceptance-criteria.md`
- `nonfunctional.md`
- `constraints.md`
- `risks.md`
- `traceability.md`
  And optional:
- `meta.json` (per-requirement snapshot)

#### Execution strategy templates (global)

Create in `docs/agent-memory/03-plans/_templates/`:

- `execution-strategy.md`
- `work-breakdown.md`
- `implementation-order.md`
- `validation-plan.md`
- `rollback-plan.md`

#### Evaluation templates (global)

Create in `docs/agent-memory/05-evaluation/_templates/`:

- `evaluation-criteria.md` (consumed by Process when authoring criteria; consumed by Evaluation when verifying)
- `evaluation-report.md`
- `metrics-report.md`
- `compliance-checklist.md`
- `fix-loop-report.md`
- `final-approval-report.md`

### E) Determine requirementId

If the user did not provide a requirementId:

- Determine the next available ID by scanning existing `docs/agent-memory/02-requirements/R-????/` folders.
- Choose next R-XXXX.

### F) Create requirement folder if missing

Ensure folder exists:

- `docs/agent-memory/02-requirements/<requirementId>/`
  If missing, create it and add all requirement templates listed above.
  Also create:
- `docs/agent-memory/03-plans/<requirementId>/`
- `docs/agent-memory/04-execution/<requirementId>/`
- `docs/agent-memory/05-evaluation/<requirementId>/`

### G) Update indices

You must update BOTH:

1. `docs/agent-memory/08-progress-index.md` (add/update row)
2. `docs/agent-memory/index.json` (machine index)
   - Add requirement entry if missing
   - Set status=Draft
   - Set paths to the four roots
   - Update generatedAt
   - Increment requirements.sequence

## POST (mandatory)

Write a log:

- `docs/agent-logs/YYYY-MM-DD__<requirementId>__init.md`
  Include:
- Files read
- Folders/files created
- requirementId chosen
- What’s still missing / open questions

Return:

- requirementId
- paths to created/updated files
- “Next step: Plan” instruction

### Index update protocol (mandatory)

When editing `docs/agent-memory/index.json`:

- Update `generatedAt` to now (ISO).
- Update the specific requirement’s `updatedAt` to now.
- Increment `requirements.sequence` by 1.
- Never delete entries.
- All file paths must exist in repo.

---

<!-- AHC:BEGIN -->` and `<!-- AHC:END -->
