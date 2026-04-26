# Quality gates — AI / LLM systems

## Required (block merge)

| Gate                              | Tooling                     | Threshold                 |
| --------------------------------- | --------------------------- | ------------------------- |
| Lint + types                      | per-language                | zero errors               |
| Unit tests                        | vitest / pytest             | ≥ 80% on changed files    |
| Eval harness                      | `scripts/ai-evals.mjs`      | hard-gate cases 100% pass |
| Eval rolling pass rate            | dashboard                   | within 2pp of baseline    |
| Prompt-injection regression suite | dedicated cases             | green                     |
| Output-validator tests            | guardrails / pydantic / zod | green on shape contracts  |
| Cost / token budget               | scripted check              | within budget per request |
| Security: deps                    | npm audit / pip-audit       | no high+ unfixed          |

## Recommended (warn)

- Red-team evals (jailbreaks, harmful content) run weekly; failures filed as KIs.
- Drift monitor: production prompt + model id hash vs. evaluated baseline.
- PII scanner on prompts + completions in non-prod.

## Hints

- Treat every model output as untrusted input.
- Tool-call allow-list per agent role; explicit consent for destructive tools.
- Provenance log includes model id + prompt hash + tool calls + decision.
