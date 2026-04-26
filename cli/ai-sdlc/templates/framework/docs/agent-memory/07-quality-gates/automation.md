# Quality gates — automation / workflow

## Required (block merge)

| Gate                        | Tooling                            | Threshold                             |
| --------------------------- | ---------------------------------- | ------------------------------------- |
| Lint                        | actionlint / yamllint / shellcheck | zero errors                           |
| Unit tests on workflow code | language-native                    | ≥ 80% on changed files                |
| Webhook signature tests     | crypto unit tests                  | green                                 |
| Idempotency tests           | replay runner                      | duplicate triggers produce one effect |
| Secret scan                 | gitleaks / trufflehog              | zero hits                             |
| Pinned third-party Actions  | sha pin checker                    | 100% pinned                           |
| Audit log integrity         | signed events / hash chain         | green                                 |

## Recommended (warn)

- Chaos test: drop / duplicate / re-order events; assert invariants hold.
- Workflow timeouts < 30 min unless explicitly justified.

## Hints

- Per-integration credentials with least scope; rotated quarterly.
- Reject workflows that read user input without a schema validator.
