# Quality gates — frontend

## Required (block merge)

| Gate            | Tooling                            | Threshold                             |
| --------------- | ---------------------------------- | ------------------------------------- |
| Lint            | eslint + stylelint                 | zero errors                           |
| Types           | tsc --noEmit                       | zero errors                           |
| Unit tests      | vitest / jest                      | ≥ 70% line coverage on changed files  |
| Component tests | testing-library                    | green                                 |
| E2E smoke       | playwright                         | green on critical flows               |
| Bundle size     | size-limit / @next/bundle-analyzer | within budget set in repo             |
| Accessibility   | axe / pa11y                        | zero serious violations on key routes |
| Security: deps  | npm audit                          | no high+ unfixed                      |

## Recommended (warn)

- Visual regression on shared UI (Chromatic / Loki).
- Lighthouse CI: perf ≥ 80, a11y ≥ 95, best-practices ≥ 95.
- Cross-browser smoke (firefox + webkit).

## Hints

- CSP header tested in E2E; report-only in dev.
- All forms have client + server validation.
- Third-party scripts SRI-pinned and CSP-allowed explicitly.
