---
name: Process
description: Convert plan into executable work order + evaluation criteria; generate strategy docs from templates; update indices.
tools:
  [
    "edit/editFiles",
    "search/codebase",
    "search/usages",
    "execute/runInTerminal",
  ]
handoffs:
  - label: Go to Execution
    agent: Execution
    prompt: "Run PRE+POST for requirementId=${input:requirementId}. Implement following execution strategy and quality gates."
    send: false
argument-hint: "requirementId=R-XXXX"
---

# PROCESS AGENT

## PRE (mandatory)

Read:

- `AGENTS.md`
- `docs/agent-memory/index.rules.md`
- `docs/agent-memory/index.json`
- `docs/agent-memory/07-quality-gates.md`
- `docs/agent-memory/03-plans/<requirementId>/plan.md`
- Requirement folder: `docs/agent-memory/02-requirements/<requirementId>/*`

Read templates:

- `docs/agent-memory/03-plans/_templates/*`
- `docs/agent-memory/05-evaluation/_templates/*` (for shaping criteria)

## TASK

Create an execution-ready strategy and a deterministic evaluation contract.

### A) Generate execution strategy artifacts

Create/overwrite in `docs/agent-memory/03-plans/<requirementId>/`:

- `execution-strategy.md`
- `implementation-order.md`
- `validation-plan.md`
- `rollback-plan.md`
- `work-breakdown.md` (if not already created or refine it)

### B) Generate evaluation criteria

Create/overwrite in `docs/agent-memory/05-evaluation/<requirementId>/`:

- `evaluation-criteria.md`
  This must map directly to:
- acceptance-criteria.md AC/EC/ER/NT
- nonfunctional requirements
- quality gates

### C) Update traceability skeleton

Update:

- `docs/agent-memory/02-requirements/<requirementId>/traceability.md`
  Add:
- Plan links (plan.md + strategy docs)
- Initial mapping FR-\* → plan/strategy sections

## POST (mandatory)

Update:

1. `docs/agent-memory/08-progress-index.md`
   - status=Processed
   - last agent=Process
   - updated date
2. `docs/agent-memory/index.json`
   - status=Processed
   - latest.plan.file can remain plan.md (or set to execution-strategy.md if you prefer; but keep plan.md referenced in plan.latest doc)
   - latest.evaluation.file may point to `evaluation-criteria.md` (optional, but recommended)
   - generatedAt updated
   - requirements.sequence++

Write log:

- `docs/agent-logs/YYYY-MM-DD__<requirementId>__process.md`

Return:

- step list summary
- evaluation criteria summary
- “Next step: Execution” instruction

### Index update protocol (mandatory)

When editing `docs/agent-memory/index.json`:

- Update `generatedAt` to now (ISO).
- Update the specific requirement’s `updatedAt` to now.
- Increment `requirements.sequence` by 1.
- Never delete entries.
- All file paths must exist in repo.

---

<!-- AHC:BEGIN -->` and `<!-- AHC:END -->
