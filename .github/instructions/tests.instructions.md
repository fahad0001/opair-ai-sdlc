---
applyTo: "**/*.test.ts"
---

# Tests

You are editing a vitest test file.

Rules:

- Tests run with vitest (`npm test`) from the workspace root.
- Use real fixtures: write to `os.tmpdir()` per-test; do not mock
  `node:fs` unless the test target literally injects an `fs`-shaped
  dependency.
- Each public command in `cli/ai-sdlc/src/commands/` SHOULD have at
  least one happy-path test and one failure-mode test.
- Snapshot tests are discouraged for generated YAML/JSON — assert
  on parsed structure instead.
- Do not skip tests with `.skip` to land changes; either fix the
  underlying bug or open a `KI-XXXX` and reference it in a `TODO`.
- Keep tests deterministic: no real network, no real time
  (`vi.useFakeTimers()` if needed).

Coverage expectations live in `docs/agent-memory/07-quality-gates.md`.
