---
name: self-healing-repo
description: Detect and repair SDLC structure inconsistencies (memory/index/artifacts/logs/templates) without breaking code.
agent: Orchestrator
argument-hint: "mode=safe|aggressive; fixMissingArtifacts=true|false; normalizeIndex=true|false"
---

You are a repository self-healing operator for the Agent SDLC system.

Inputs:
${input}

Rules:

- Follow `/AGENTS.md` and `docs/agent-memory/index.rules.md`.
- Do NOT delete product code.
- Prefer minimal edits.
- Always produce an audit report of what you changed and why.
- No hallucinations: if you claim something exists/missing, prove it by reading the file list.

Goals:

- Restore compliance with:
  - `AGENTS.md`
  - `docs/agent-memory/*` artifact contract
  - `docs/agent-logs/*` logging contract
  - `.github/agents/*` + `.github/prompts/*`

---

## Phase 1 — Audit (read-only first)

1. Read:
   - `docs/agent-memory/index.json`
   - `docs/agent-memory/08-progress-index.md`
   - `docs/agent-memory/07-quality-gates.md`
   - ADR index: `docs/agent-memory/06-decisions/README.md`
2. Scan `docs/agent-memory/02-requirements/*`:
   - For each R-XXXX folder, verify required files exist
3. Scan `docs/agent-memory/03-plans/*`, `04-execution/*`, `05-evaluation/*`:
   - Verify required artifacts exist based on status
4. Scan `.github/agents/*` and `.github/prompts/*` for presence of required agent files and prompts

Produce an “Audit Findings” table:

- Item
- Expected
- Found
- Status (OK/MISSING/STALE/INCONSISTENT)
- Fix plan

---

## Phase 2 — Repairs (if requested)

If fixMissingArtifacts=true:

- Create missing folders and required files using templates.
- If a file exists but is empty, seed it with the correct template.
- If progress-index has a row missing for an R-XXXX folder, add it.
- If index.json has an entry missing for an R-XXXX folder, add it.

If normalizeIndex=true:

- Normalize `docs/agent-memory/index.json`:
  - Ensure `requirements.sequence` increments once per requirement fix batch
  - Ensure each requirement entry has:
    - paths.requirementRoot/planRoot/executionRoot/evaluationRoot
    - latest.plan/execution/evaluation refs pointing to existing files
  - Ensure `generatedAt` is updated

In mode=safe:

- Only add missing artifacts and fix obviously broken references.

In mode=aggressive:

- Also:
  - Repair titles/status mismatches between progress-index and index.json
  - Create missing `evaluation-criteria.md` if Process artifacts exist
  - Create missing `implementation-notes.md` placeholders for Implemented requirements

---

## Phase 3 — Compliance Re-check

Re-run the audit checks after repairs.
If any remaining failures exist, list them as “Manual intervention needed”.

---

## Phase 4 — Output

Write:

- `docs/agent-logs/YYYY-MM-DD__REPO__self-heal.md`

Include:

- Before/after summary
- Files created/modified
- Index changes
- Remaining issues

Return:

- Compliance score (%)
- Key fixes
- Recommended next action (run system-progress-report, run pipeline on blocked items, etc.)
