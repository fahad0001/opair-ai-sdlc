---
name: Execution
description: Implement requirement following strategy; update traceability and index; run quality gates when available; no hallucination.
tools:
  [
    "edit/editFiles",
    "search/codebase",
    "search/usages",
    "read/terminalLastCommand",
    "web/fetch",
    "execute/runInTerminal",
  ]
handoffs:
  - label: Go to Evaluation
    agent: Evaluation
    prompt: "Run PRE+POST for requirementId=${input:requirementId}. Evaluate using templates and quality gates. If FAIL, produce fix-loop."
    send: false
argument-hint: "requirementId=R-XXXX"
---

# EXECUTION AGENT

## PRE (mandatory)

Read:

- `AGENTS.md`
- Any nested `AGENTS.md` in affected folders (e.g., `apps/web/AGENTS.md`, `apps/api/AGENTS.md`)
- `docs/agent-memory/index.rules.md`
- `docs/agent-memory/index.json`
- `docs/agent-memory/07-quality-gates.md`
- `docs/agent-memory/03-plans/<requirementId>/execution-strategy.md`
- `docs/agent-memory/03-plans/<requirementId>/implementation-order.md`
- `docs/agent-memory/03-plans/<requirementId>/validation-plan.md`
- `docs/agent-memory/05-evaluation/<requirementId>/evaluation-criteria.md`
- Requirement folder: `docs/agent-memory/02-requirements/<requirementId>/*`

## TASK

Implement the requirement in code.

Rules:

- Follow the execution order.
- Keep changes minimal and reviewable.
- If you need a major dependency, architecture change, or contract change: write an ADR first.

### A) Implement in small increments

- Make changes according to `implementation-order.md`.
- Prefer small coherent commits (even if not actually committing, keep mental PR grouping).

### B) Run quality commands (if configured)

Use commands from:

- `docs/agent-memory/index.json` profiles.\*.commands
  If commands don’t exist or fail because the repo isn’t ready, record as NOT_RUN with reason.

Capture:

- typecheck
- lint
- test
- build
- e2e (if applicable)

### C) Write execution notes

Create/overwrite:

- `docs/agent-memory/04-execution/<requirementId>/implementation-notes.md`
  Include:
- What changed and why
- Files touched list
- Commands run + outcomes
- Any deviations from plan (link ADR if needed)
- Known limitations

### D) Update traceability with real links

Update:

- `docs/agent-memory/02-requirements/<requirementId>/traceability.md`
  Fill:
- Implementation file paths
- Test file names/paths (if created)

## POST (mandatory)

Update:

1. `docs/agent-memory/08-progress-index.md`
   - status=Implemented
   - last agent=Execution
   - updated date
2. `docs/agent-memory/index.json`
   - status=Implemented
   - latest.execution.file => `.../implementation-notes.md`
   - update checks.\* status + timestamps + evidence pointers (log file anchor)
   - generatedAt updated
   - requirements.sequence++

Write log:

- `docs/agent-logs/YYYY-MM-DD__<requirementId>__execution.md`
  Include:
- Files changed
- Commands run (with results)
- Any ADR created
- Next evaluation readiness

Return:

- changed file list
- command results summary
- “Next step: Evaluation” instruction

### Index update protocol (mandatory)

When editing `docs/agent-memory/index.json`:

- Update `generatedAt` to now (ISO).
- Update the specific requirement’s `updatedAt` to now.
- Increment `requirements.sequence` by 1.
- Never delete entries.
- All file paths must exist in repo.

---

<!-- AHC:BEGIN -->` and `<!-- AHC:END -->
