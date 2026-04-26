# 15 — AI evals

A repeatable harness that scores AI behaviour against versioned cases.

## Layout

- `cases/EV-####.case.yaml` — one case per file. References fixture + expected.
- `fixtures/EV-####.input.md` — inputs the SUT (system under test) will receive.
- `expected/EV-####.output.md` — expected output (matcher-dependent).
- `policy.md` — pass/fail thresholds and deferral rules.

## Running

`scripts/ai-evals.mjs` is dependency-free Node; it parses the cases, runs the
SUT (default: a stubbed echo for dry-runs), and scores with one of these
matchers: `exact`, `contains`, `regex`, `json-deep-equal`, `rubric`.

## Hooking up a real SUT

Replace `runSut` in `scripts/ai-evals.mjs` with a call to your model adapter.
The harness expects a `string` output; structured outputs should be JSON-
stringified before scoring with `json-deep-equal`.
