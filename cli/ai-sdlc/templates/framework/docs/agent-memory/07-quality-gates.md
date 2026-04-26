# Quality Gates (Stack-aware, Extensible)

Purpose:

- Deterministic pass/fail checks for Evaluation.
- Support multiple stacks via profiles.
- Separate universal policy from framework-specific commands.

---

## 0) Universal Policy (applies to all profiles)

### U0. No Hallucination

- If uncertain, inspect code or run commands.
- Any claim must be backed by evidence.

### U1. Traceability

- Every change must map back to:
  - `docs/agent-memory/02-requirements/R-XXXX/*`
  - acceptance criteria
  - traceability matrix updated

### U2. Build Health

- Build must succeed for impacted apps/packages.

### U3. Static Quality

- Lint must pass.
- Type checking must pass.

### U4. Test Quality

- Tests for impacted areas must pass.
- New behavior requires tests unless explicitly justified.

### U5. Security Basics

- No secrets in repo.
- Validate input at boundaries.
- New risky dependencies require ADR.

### U6. Performance Basics

- Avoid heavy computation in hot paths (render loops, request loops).
- If performance is claimed, measurements must be included.

---

## 1) Profiles

Profiles define expectations and use commands from `docs/agent-memory/index.json`.

### 1A) Frontend Profile: TanStack Start (apps/web)

#### Expected capabilities

- TypeScript
- Route-based architecture (Start routes/actions/loaders)
- SSR boundary awareness
- Bundling/build step

#### Required checks

- install
- typecheck
- lint
- test (if configured)
- build

#### Optional checks

- e2e (if exists)
- analyze (bundle analysis)

#### TanStack Start-specific expectations

- Validate inputs at route/action boundaries.
- No browser-only APIs in server contexts.
- Error handling covers expected failures.
- Avoid obvious rerender and bundle bloat.

### 1B) Backend Profile: Generic (apps/api)

Backend is framework-agnostic for now.

#### Required checks (once configured)

- typecheck/build
- lint
- test
- build

#### Additional expectations

- Boundary input validation
- Explicit auth/authz (when applicable)
- Contract stability (OpenAPI/spec if present)

---

## 2) Command Registry (source of truth)

Commands are defined in:

- `docs/agent-memory/index.json` → `profiles.frontend.commands` / `profiles.backend.commands`

If commands fail due to missing scaffold, mark NOT_RUN with reason (do not mark Done unless user accepts).

---

## 3) Evidence Requirements (Evaluation must include)

Every evaluation must include:

- Commands attempted + results
- Links to artifacts:
  - requirement docs
  - plan docs
  - implementation notes
  - evaluation criteria + report
- Explicit NOT_RUN sections if anything is missing
