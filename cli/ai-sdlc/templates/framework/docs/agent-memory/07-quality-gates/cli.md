# Quality gates — CLI

## Required (block merge)

| Gate             | Tooling                             | Threshold                          |
| ---------------- | ----------------------------------- | ---------------------------------- |
| Lint + types     | eslint / clippy / mypy              | zero errors                        |
| Unit tests       | vitest / cargo test / pytest        | ≥ 80% on changed files             |
| Smoke tests      | execa / assert_cmd                  | each command exits 0 with `--help` |
| Argument parsing | snapshot of `--help` output         | drift requires review              |
| Cross-platform   | linux + macos + windows matrix      | green                              |
| Provenance       | SLSA build attestation              | attached on release                |
| Security: deps   | npm audit / cargo audit / pip-audit | no high+ unfixed                   |

## Recommended (warn)

- Telemetry opt-in test: by default, no network calls.
- Refuse `shell:true` execs in code review.
- Reproducible build: same inputs produce same artifact hash.

## Hints

- Validate stdin / argv at boundary; reject unknown flags.
- Pin transitive native deps; CI checks lockfile + checksum.
