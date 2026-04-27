---
name: run-pipeline
description: Run the full pipeline for a requirementId with strict PRE/POST, indices updates, and fix-loop on failures.
agent: Orchestrator
argument-hint: "requirementId=R-XXXX"
---

Run the SDLC pipeline for:
requirementId=${input:requirementId}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/index.rules.md`.
- Every phase must perform PRE+POST and write artifacts to docs/agent-memory.
- Update BOTH:
  - `docs/agent-memory/08-progress-index.md`
  - `docs/agent-memory/index.json`
- No hallucination: verify via repo files and/or commands where applicable.

Steps:

1. Delegate to **Init** for requirementId. If artifacts are missing, Init must create them.
2. Delegate to **Plan** to ensure requirement templates are complete and plan.md exists.
3. Delegate to **Process** to generate:
   - execution strategy docs (from templates)
   - evaluation-criteria.md
4. Delegate to **Execution** to implement and record implementation-notes.md.
   - Run checks using commands in index.json profiles if possible.
5. Delegate to **Evaluation** to generate:
   - evaluation-report.md, metrics-report.md, compliance-checklist.md
   - If FAIL, also fix-loop-report.md and set status Blocked.
6. If FAIL:
   - Delegate back to **Execution** to apply fixes from fix-loop-report.md.
   - Delegate again to **Evaluation**.
   - Repeat until PASS or user stops.
7. If PASS:
   - Delegate to **Finalization** to create final-approval-report.md and final-summary.md and mark Done.

Output:

- Final status (Done/Blocked)
- Links to final artifacts (evaluation + final summary)
