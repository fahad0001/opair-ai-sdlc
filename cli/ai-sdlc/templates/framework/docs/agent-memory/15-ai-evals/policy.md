# Eval policy

## Thresholds

- Hard gate: `exact` and `json-deep-equal` cases must be 100% pass on main.
- Soft gate: `rubric` cases must score ≥ 0.80 on the configured judge.
- Regression budget: any single PR may not reduce the rolling pass rate by
  more than 2 percentage points.

## Quarantine

- A failing case may be quarantined for ≤ 14 days with an open issue link.
- Quarantined cases do not count toward the hard gate but DO count toward
  the rolling pass rate.

## Adding cases

- Every behavioural change to an AI feature must add or update at least one
  case before the change merges.

## Privacy

- Fixtures and expecteds must contain only synthetic or anonymized data.
- Do not commit user prompts unless they have been scrubbed.
