# Quality gates — library / SDK

## Required (block merge)

| Gate                   | Tooling                                          | Threshold                             |
| ---------------------- | ------------------------------------------------ | ------------------------------------- |
| Lint + types           | per-language                                     | zero errors                           |
| Unit tests             | vitest / pytest / cargo test                     | ≥ 90% on changed files                |
| Public API surface     | api-extractor / cargo-public-api / mypy --strict | drift gated by CHANGELOG entry        |
| Compat tests           | matrix of supported runtimes                     | green                                 |
| Tree-shake / dead-code | rollup / webpack stats                           | size reported, unused exports flagged |
| Provenance             | SLSA build + signed publish                      | attached on release                   |
| Security: deps         | npm audit / cargo audit                          | no high+ unfixed                      |

## Recommended (warn)

- Mutation tests on parsing / encoding modules.
- Doc-tests for every public symbol.
- Benchmarks vs previous tag in CI; warn on > 10% regression.

## Hints

- Semver enforced via api-extractor / cargo-public-api report.
- No telemetry by default; opt-in flag documented.
