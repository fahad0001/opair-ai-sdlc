# Quality gates — mobile

## Required (block merge)

| Gate                     | Tooling                                  | Threshold              |
| ------------------------ | ---------------------------------------- | ---------------------- |
| Lint                     | eslint + ktlint / swiftlint              | zero errors            |
| Types                    | tsc / kotlin / swift compiler            | zero errors            |
| Unit tests               | jest / junit / xctest                    | ≥ 70% on changed files |
| UI tests                 | detox / espresso / xcuitest              | green on key flows     |
| Accessibility            | axe-mobile / Accessibility Inspector     | zero serious           |
| Crash-free rate (canary) | Crashlytics / App Center                 | ≥ 99% in last 7d       |
| Security: deps           | npm audit + gradle scan + cocoapods-keys | no high+ unfixed       |
| Pinning + storage tests  | unit + integration                       | green                  |

## Recommended (warn)

- Bundle / IPA size tracked vs baseline; warn on > 5% growth.
- Performance smoke (TTI / cold start) within budget.
- Privacy-policy diff requires legal review.

## Hints

- Refuse builds without provisioning + signing config in CI secrets.
- Block raw `Log.d` / `print` in release; require structured logger.
