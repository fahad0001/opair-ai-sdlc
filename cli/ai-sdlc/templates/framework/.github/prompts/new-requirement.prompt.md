---
name: new-requirement
description: Create a new R-XXXX requirement with full templates, update human+machine indices, and prepare for planning.
agent: Orchestrator
argument-hint: "title=...; description=...; priority=P0|P1|P2|P3; tags=a,b,c"
---

You are running the SDLC pipeline bootstrap for a NEW requirement.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/index.rules.md`.
- Use file-based memory only; no reliance on chat memory.
- Do NOT implement code. Only initialize requirement artifacts and indices.

Steps:

1. Determine the next available requirement ID (R-XXXX).
2. Delegate to **Init** with that requirementId and ensure it creates:
   - requirement folder + all requirement templates
   - plan/execution/evaluation folders
   - template packs under docs/agent-memory/\*/\_templates
   - index.json + schema + rules (if missing)
   - progress-index.md updated
3. After Init, delegate to **Plan** to populate:
   - requirement.md, acceptance-criteria.md, nonfunctional.md, constraints.md, risks.md, traceability.md
   - create `docs/agent-memory/03-plans/R-XXXX/plan.md`
4. Ensure machine index is updated:
   - status must be Planned
   - latest.plan.file points to plan.md
   - requirements.sequence incremented
5. Output the requirementId and the key artifact paths.
