# Evaluation Criteria — R-XXXX

> Authored by the **Process** agent. Consumed by the **Evaluation** agent.
> This file defines _what PASS looks like_ before any code is written.

## Requirement

- **ID:** R-XXXX
- **Title:** [Title]
- **Authored:** [YYYY-MM-DD]
- **Author:** Process

---

## 1) Functional Pass Criteria (from `acceptance-criteria.md`)

| AC ID | Criterion | Evaluation method                 | Evidence required       |
| ----- | --------- | --------------------------------- | ----------------------- |
| AC-1  |           | unit / integration / e2e / manual | test path or screenshot |
| AC-2  |           |                                   |                         |

## 2) Edge-Case Pass Criteria

| EC ID | Condition | Evaluation method | Evidence required |
| ----- | --------- | ----------------- | ----------------- |
| EC-1  |           |                   |                   |

## 3) Error-Handling Pass Criteria

| ER ID | Failure scenario | Expected behavior | Evidence required |
| ----- | ---------------- | ----------------- | ----------------- |
| ER-1  |                  |                   |                   |

## 4) Negative-Test Pass Criteria

| NT ID | Invalid input | Expected rejection | Evidence required |
| ----- | ------------- | ------------------ | ----------------- |
| NT-1  |               |                    |                   |

## 5) Nonfunctional Pass Criteria (from `nonfunctional.md`)

### Performance budgets

| Metric | Threshold (PASS if ≤) | How measured |
| ------ | --------------------- | ------------ |
|        |                       |              |

### Security requirements

| Requirement | Evaluation method |
| ----------- | ----------------- |
|             |                   |

### Reliability / availability

| Requirement | Evaluation method |
| ----------- | ----------------- |
|             |                   |

### Accessibility (if applicable)

| WCAG criterion | Tool | Threshold |
| -------------- | ---- | --------- |
|                |      |           |

### Internationalization (if applicable)

| Requirement | Evaluation method |
| ----------- | ----------------- |
|             |                   |

### Observability

| Signal  | Required instrumentation |
| ------- | ------------------------ |
| logs    |                          |
| metrics |                          |
| traces  |                          |

## 6) Quality Gates That Must Pass

| Gate      | Command | Pass condition           |
| --------- | ------- | ------------------------ |
| typecheck |         | exit 0                   |
| lint      |         | exit 0; 0 errors         |
| test      |         | all green; coverage ≥ X% |
| build     |         | exit 0                   |
| security  |         | 0 critical, 0 high       |
| sbom      |         | generated, signed        |
| e2e       |         | exit 0 (if applicable)   |

## 7) Architectural / Compliance Constraints

- ADRs that must remain valid after this change:
- Boundaries that must not be violated:
- Compliance controls that must remain satisfied (per active framework):

## 8) Out of scope (will NOT be evaluated)

- [ ]

## 9) Decision rule

- **PASS** = every required row above is PASS or NOT_RUN-with-justified-reason.
- **FAIL** = any required row is FAIL.
- **PARTIAL PASS** = all required rows PASS but recommended rows have issues.

## 10) Re-evaluation triggers

- A new fix-loop iteration must re-run the gates listed in §6 plus any AC/EC/ER/NT directly touched.
