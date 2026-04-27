---
name: system-progress-report
description: Generate a full SDLC state report (requirements, execution, evaluation, ADRs, quality gates, risks).
agent: Orchestrator
argument-hint: "depth=summary|detailed|audit"
---

Generate a complete system progress report based ONLY on repository artifacts.

Do NOT rely on chat memory.

You must read:

- `docs/agent-memory/index.json`
- `docs/agent-memory/08-progress-index.md`
- `docs/agent-memory/02-requirements/*`
- `docs/agent-memory/03-plans/*`
- `docs/agent-memory/04-execution/*`
- `docs/agent-memory/05-evaluation/*`
- `docs/agent-memory/06-decisions/*`
- `docs/agent-logs/*`
- `docs/agent-memory/07-quality-gates.md`

---

## Section 1 — Executive Summary

- Total requirements
- Status distribution:
  - Draft:
  - Planned:
  - Processed:
  - Implemented:
  - Evaluated:
  - Done:
  - Blocked:
- % Done
- % Verified (Evaluated + Done)
- % Not yet verified
- Risk summary

---

## Section 2 — Requirement Matrix

For each R-XXXX:

| R-ID | Title | Status | Last Agent | Last Updated | Has Plan | Has Execution | Has Evaluation | Quality Gates Status |
| ---- | ----- | ------ | ---------- | ------------ | -------- | ------------- | -------------- | -------------------- |

Highlight:

- Missing artifacts
- Stale requirements (no update in long time)
- Blocked requirements

---

## Section 3 — Quality Gate Health

From index.json checks and evaluation artifacts:

- Typecheck health:
- Lint health:
- Test health:
- Build health:
- E2E health:
- NOT_RUN occurrences:

If depth=audit:

- List specific failing requirements and evidence links.

---

## Section 4 — Architectural Decisions

- Total ADRs
- Accepted:
- Proposed:
- Superseded:
- Areas with no ADR but architectural changes detected

---

## Section 5 — Coverage & Maturity

Evaluate:

- Are all implemented features mapped to requirements?
- Are all requirements mapped to plans?
- Are all plans mapped to execution?
- Are all execution artifacts evaluated?
- Traceability completeness % estimate

---

## Section 6 — Risk & Gaps

Identify:

- Requirements without evaluation
- Requirements without tests
- Missing quality gate executions
- Security gaps (based on docs)
- Performance gaps
- Architectural drift signals

---

## Section 7 — Technical Debt Overview

- Open fix-loop reports
- Follow-up-fixes.md occurrences
- ADR debt
- TODO density (if visible in repo)

---

## Section 8 — Improvement Recommendations

Provide prioritized recommendations:

P0 (critical)
P1 (important)
P2 (nice to have)

---

## Output Rules

If depth=summary:

- Executive summary + high-level metrics only.

If depth=detailed:

- All sections.

If depth=audit:

- Full report + detailed evidence links + quality gate outputs.

---

Return:

- Structured markdown report
- Maturity rating (1-5)
- Readiness for production (Low/Medium/High)
