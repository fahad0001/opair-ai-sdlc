# Quality gates — desktop

## Required (block merge)

| Gate                 | Tooling                                     | Threshold              |
| -------------------- | ------------------------------------------- | ---------------------- |
| Lint + types         | per-language linter + compiler              | zero errors            |
| Unit tests           | vitest / pytest / xctest                    | ≥ 70% on changed files |
| UI smoke             | spectron / playwright (Electron) / xcuitest | green                  |
| Code signing         | platform signing tools                      | always on release      |
| Notarization (macOS) | notarytool                                  | passes                 |
| Auto-update channel  | signed manifest + pinned endpoint           | tested in CI           |
| Security: deps       | npm audit + native scan                     | no high+ unfixed       |

## Recommended (warn)

- For Electron: ensure `contextIsolation=true`, `nodeIntegration=false`,
  `sandbox=true` enforced via test.
- Crash reporter PII scrubber unit-tested.
- Installer integrity test (checksum + signature).

## Hints

- Refuse to ship binaries with debug symbols stripped in release.
- Test silent-update path on a clean VM image.
