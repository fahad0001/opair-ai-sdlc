# Requirements

This folder contains the source-of-truth requirement artifacts.

Each requirement is stored under:

`docs/agent-memory/02-requirements/R-XXXX/`

## Required files per requirement

- `requirement.md`
  - Problem statement
  - Goal/objective
  - Scope (in/out/future)
  - User scenarios
  - Functional requirements (FR-\*)
  - Inputs/outputs
  - Dependencies
  - Assumptions
  - Open questions

- `acceptance-criteria.md`
  - Functional acceptance criteria (AC-\*)
  - Edge cases (EC-\*)
  - Error handling criteria (ER-\*)
  - Negative tests (NT-\*)
  - Completion criteria

- `nonfunctional.md`
  - Performance, security, reliability, scalability, usability, maintainability, observability

- `constraints.md`
  - Technical, dependency, performance, security, operational constraints

- `risks.md`
  - Risk register with mitigation

- `traceability.md`
  - Maps FR-\* → plan → implementation → evaluation/tests

## Optional files per requirement

- `meta.json`
  - Small snapshot of key metadata (can reduce merge conflicts and speed context loading)

## Conventions

- IDs must follow: `R-0001`, `R-0002`, etc.
- Requirements should be clear and testable.
- If anything is ambiguous, write it in `open questions` and/or create an ADR if it affects architecture.

## Source of truth

These documents define “what we are building”. Planning, implementation, and evaluation must trace back here.
