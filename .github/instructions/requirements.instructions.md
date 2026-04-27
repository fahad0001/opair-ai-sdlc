---
applyTo: "docs/agent-memory/02-requirements/**"
---

# Requirement files

You are editing the requirement layer of the memory pack.

Rules (per `AGENTS.md` §3.1):

- Each requirement folder MUST contain: `requirement.md`,
  `acceptance-criteria.md`, `nonfunctional.md`, `constraints.md`,
  `risks.md`, `traceability.md`.
- Acceptance criteria use stable IDs (`AC-XXXX-N`) — never renumber.
- Every change must reference the `R-XXXX` id in commit + log.
- Update `docs/agent-memory/08-progress-index.md` (human) AND
  `docs/agent-memory/index.json` (machine) on any state transition.
- Allowed transitions: Draft → Planned → Processed → Implemented →
  Evaluated → Done. Any state → Blocked.
- Do NOT mark a requirement Done unless the Definition of Done
  (`AGENTS.md` §7) is satisfied with evidence.

Anti-hallucination:

- Cite file paths or commit SHAs when claiming behavior.
- Quote exact strings; do not paraphrase acceptance criteria.
