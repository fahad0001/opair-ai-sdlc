# Quality gates — backend

## Required (block merge)

| Gate              | Tooling                             | Threshold                            |
| ----------------- | ----------------------------------- | ------------------------------------ |
| Lint              | eslint / ruff / golangci-lint       | zero errors                          |
| Types             | tsc --noEmit / mypy --strict        | zero errors                          |
| Unit tests        | vitest / pytest / go test           | ≥ 80% line coverage on changed files |
| Integration tests | testcontainers / docker-compose     | green                                |
| API contract      | OpenAPI / proto lint + diff         | no breaking changes without ADR      |
| Security: deps    | npm audit / pip-audit / govulncheck | no high+ unfixed                     |
| Security: SAST    | semgrep / codeql                    | zero high findings                   |
| Container build   | docker buildx                       | reproducible, non-root user          |
| Migrations        | dry-run + reversibility check       | passes                               |

## Recommended (warn)

- Mutation tests on critical paths (Stryker / mutmut).
- Load-test smoke for new hot endpoints.
- DAST against staging on a schedule.

## Hints

- Lock dependency versions; refuse build on lockfile drift.
- Reject endpoints lacking authn/authz tests.
- All public DTOs validated by schema (zod / pydantic / proto) at the boundary.
