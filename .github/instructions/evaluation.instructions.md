---
applyTo: "docs/agent-memory/05-evaluation/**"
---

# Evaluation files

You are editing the evaluation layer.

Required artifacts (per `AGENTS.md` §3.4):

- `evaluation-criteria.md` (carried forward from Process)
- `evaluation-report.md`
- `metrics-report.md`
- `compliance-checklist.md`

Rules:

- Each acceptance criterion (`AC-XXXX-N`) gets PASS / FAIL with
  evidence (file path, command output, or screenshot).
- A FAIL triggers `fix-loop-report.md`, not a state regression.
- `compliance-checklist.md` MUST run the quality gates declared in
  `07-quality-gates.md` and `index.json → profiles.*.commands`.
- If a gate is unavailable, mark `NOT_RUN` with reason — never
  silently skip.
- Final approval (`final-approval-report.md`) is written only when
  all ACs PASS and all gates are green or NOT_RUN-justified.
