# Quality gates — fullstack

Combines backend + frontend gates. Where they overlap, the stricter threshold wins.

## Required (block merge)

- Backend: see `backend.md` (lint, types, unit, integration, contract, deps, SAST, container, migrations).
- Frontend: see `frontend.md` (lint, types, unit, component, E2E smoke, bundle size, a11y, deps).
- End-to-end: at least one happy-path E2E that crosses both layers.
- Schema parity: client + server validate the same shapes (shared zod / openapi).

## Recommended (warn)

- Contract tests (Pact) between client and server.
- Synthetic monitor for the cross-layer happy path in staging.

## Hints

- Run frontend + backend tests in parallel CI jobs; the E2E job depends on both.
- CSP + auth flow regression should be a single E2E case touching both.
