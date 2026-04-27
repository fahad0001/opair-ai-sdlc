---
applyTo: "docs/agent-memory/03-plans/**"
---

# Plan files

You are editing the planning layer.

Required artifacts (per `AGENTS.md` §3.2):

- `plan.md`, `execution-strategy.md`, `implementation-order.md`,
  `validation-plan.md`, `rollback-plan.md`.

Rules:

- Plans MUST trace to the requirement's acceptance criteria
  (`AC-XXXX-N`). Each AC needs at least one validation step.
- `implementation-order.md` is a topological order — list
  dependencies explicitly.
- `rollback-plan.md` MUST describe how to undo each step; do not
  skip with "no rollback needed" unless the change is read-only.
- Open questions go in `open-questions.md`, not in the plan body.
- Performance + security NFRs from `nonfunctional.md` MUST be
  reflected in `validation-plan.md`.

Do not start implementation work in this layer; that belongs in
`04-execution/`.
