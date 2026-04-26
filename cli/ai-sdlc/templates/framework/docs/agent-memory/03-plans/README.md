# Plans

This folder contains planning and strategy artifacts derived from requirements.

Each requirement has its own folder:

`docs/agent-memory/03-plans/R-XXXX/`

## Required files (after Process)

- `plan.md`
  - Overview and scope interpretation
  - Assumptions
  - Interfaces/APIs
  - Data model impacts
  - High-level plan
  - Test strategy outline
  - Planning-level risks

- `execution-strategy.md`
  - Execution philosophy
  - Phases
  - Dependencies
  - Risks and mitigations
  - Deliverables
  - Stop conditions

- `implementation-order.md`
  - Ordered implementation steps
  - “Files to touch” per step
  - Validation commands per step
  - PR chunking strategy
  - Checkpoints

- `validation-plan.md`
  - Maps acceptance criteria to tests
  - Nonfunctional validation approach
  - Quality gates command plan
  - Evidence requirements

- `rollback-plan.md`
  - Rollback triggers and steps
  - Data safety considerations
  - Post-rollback actions

## Optional files

- `work-breakdown.md`
  - Task list (T-\*) with dependencies
- `open-questions.md`
  - Unknowns and decisions required before execution

## Templates

Global templates live in:
`docs/agent-memory/03-plans/_templates/`

Agents should use these templates when creating new plan artifacts.

## Source of truth

Plans interpret requirements and define the “how”. Execution must follow these artifacts unless an ADR is created to justify deviation.
