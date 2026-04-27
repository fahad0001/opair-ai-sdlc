---
name: AuditMeta
description: Detect undocumented features/decisions from existing code + docs and generate requirements/ADRs to close gaps.
tools: ["edit/editFiles", "search/codebase", "search/usages"]
handoffs:
  - label: Create Requirements via Init+Plan
    agent: Orchestrator
    prompt: "Use findings to create new requirements and ADRs. Start with Init then Plan. Tag inferred items as inferred-from-code."
    send: false
argument-hint: "scope=web|api|all; maxFindings=20"
---

# AUDIT META-AGENT

## PRE

Read:

- `AGENTS.md`
- `docs/agent-memory/index.json`
- `docs/agent-memory/08-progress-index.md`
- `docs/agent-memory/01-architecture.md`
- `docs/agent-memory/06-decisions/*`

## TASK

Goal: discover gaps between code reality and documented memory.

### A) Feature Discovery (Evidence-based)

Scan the repo (per scope):

- Routes/endpoints, main modules, major pages, domain services, integrations, auth, persistence, background jobs, etc.

For each discovered feature, determine:

- Is there an existing requirement R-XXXX that covers it?
- Is there an ADR that explains key design choices?
- Is there evaluation evidence?

### B) Output Findings List

Create:

- `docs/agent-memory/09-audits/`
- `docs/agent-memory/09-audits/YYYY-MM-DD__audit-meta.md`

Report format:

- Finding ID (AM-001...)
- Feature summary
- Evidence: file paths
- Coverage status:
  - requirement? yes/no (which R-XXXX)
  - ADR? yes/no (which ADR)
  - evaluation? yes/no (which R-XXXX evaluation)
- Recommended action:
  - Create requirement
  - Create ADR
  - Create tests/evaluation
  - Create plan artifacts

### C) Optionally auto-create work items

If user requests, delegate to Orchestrator to create:

- new requirements via `new-requirement` flow (Init+Plan)
- ADRs for major decisions

## POST

Update:

- If new audit folder was created, link it from architecture doc (optional)
  Write log:
- `docs/agent-logs/YYYY-MM-DD__REPO__audit-meta.md`
  Return:
- Top findings
- Recommended next action button (handoff)

---

<!-- AHC:BEGIN -->` and `<!-- AHC:END -->
