---
name: transform-repo-structure
description: Transform existing repository into deterministic Agent SDLC structure (memory-first, indexed, traceable, quality-gated).
agent: Orchestrator
argument-hint: "mode=full|safe; includeExistingCodeAudit=true|false"
---

You are tasked with transforming the CURRENT repository into the full Agent-based deterministic SDLC structure.

This repository may:

- Already contain code
- Already contain partial documentation
- Have no memory system
- Have no requirement structure
- Have no ADR system
- Have no evaluation structure

You must convert it into the expected structure defined by:

- `AGENTS.md`
- `docs/agent-memory/*`
- `docs/agent-logs/*`
- `.github/agents/*`
- `.github/prompts/*`

Follow these strict rules:

1. Do NOT delete working code.
2. Do NOT break build unless unavoidable.
3. Preserve history as much as possible.
4. Do NOT hallucinate missing architecture — inspect actual codebase.

---

## Phase 1 — Inspect Repository

Perform analysis:

- Identify:
  - apps/ folders
  - frontend/backend boundaries
  - frameworks used
  - test setup
  - lint/typecheck setup
  - CI configuration
  - existing docs
  - existing architecture patterns

- Identify:
  - implicit requirements in code
  - major architectural decisions
  - external integrations

Produce a summary of:

- Current structure
- Gaps vs expected structure

---

## Phase 2 — Bootstrap Agent Memory System

If missing, create:

- `AGENTS.md`
- `.github/agents/*` (all agents)
- `.github/prompts/*`
- `docs/agent-memory/`
- `docs/agent-logs/`

Ensure all core docs exist:

- 00-project-context.md
- 01-architecture.md
- 06-decisions/\*
- 07-quality-gates.md
- 08-progress-index.md
- index.schema.json
- index.rules.md
- index.json

If mode=full:

- Fully populate context and architecture docs using real repo analysis.
  If mode=safe:
- Create placeholders with TODO markers.

---

## Phase 3 — Reverse Engineer Existing Work Into Requirements

For existing major features:

1. Identify logical feature groupings.
2. Create synthetic requirements R-XXXX for:
   - Major implemented features
   - Core architecture patterns
   - Significant modules
3. For each:
   - Create requirement folder
   - Write requirement.md summarizing inferred functionality
   - Write acceptance criteria based on observed behavior
   - Mark status appropriately:
     If already implemented → status=Implemented
     If partially verified → status=Processed
     If fully tested & verified → status=Evaluated

Update:

- progress-index.md
- index.json (machine index)

---

## Phase 4 — Reconstruct Planning & Evaluation

For each inferred requirement:

- Generate:
  - plan.md (retrospective plan)
  - execution-strategy.md (retrospective)
  - validation-plan.md
  - evaluation-criteria.md

If includeExistingCodeAudit=true:

- Run available quality gates
- Produce evaluation-report.md
- Produce metrics-report.md
- Produce compliance-checklist.md

---

## Phase 5 — ADR Reconstruction

Identify:

- Major dependencies
- Architectural patterns
- Boundary rules
- Security decisions
- Performance tradeoffs

For each major decision:

- Create ADR-XXXX file
- Add to ADR index
- Update index.json decisions list

---

## Phase 6 — Final Summary

Produce:

1. Transformation summary:
   - What was created
   - What was inferred
   - What remains unknown

2. Updated repository structure overview

3. Current maturity state:
   - % of repo covered by requirements
   - Quality gate readiness
   - Risk areas

4. Recommended next steps

---

Output:

- Summary report
- List of new files created
- Any risks identified
