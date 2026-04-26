# Quality gates — monorepo

Per-package gates apply (the relevant `*.md` overlay for each package's kind).
This file lists gates that exist _because_ the repo is a monorepo.

## Required (block merge)

| Gate                          | Tooling                                   | Threshold                            |
| ----------------------------- | ----------------------------------------- | ------------------------------------ |
| Path-scoped CI                | turbo / nx / changed-since                | only changed packages run            |
| Cross-package import boundary | eslint-plugin-import / dependency-cruiser | no private internals across packages |
| CODEOWNERS                    | github                                    | each package path has an owner       |
| Pinned actions                | review or dependabot                      | every Action pinned by SHA           |
| Per-package SBOM              | cyclonedx                                 | one SBOM per published package       |
| Lockfile audit                | npm/pnpm/yarn audit                       | no high+ unfixed                     |

## Recommended (warn)

- Affected-only test runs respect explicit `--all` for release branches.
- Cache-poisoning defenses: signed lockfile + verify-on-restore.

## Hints

- Build graph reproducible across machines (no host-path leakage).
- Release pipeline tags packages independently.
