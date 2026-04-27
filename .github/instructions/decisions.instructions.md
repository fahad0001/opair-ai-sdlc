---
applyTo: "docs/agent-memory/06-decisions/**"
---

# Architecture Decision Records

You are editing ADRs.

Rules:

- New ADRs MUST start from `ADR-template.md` and use the next
  available `ADR-####` id (zero-padded, monotonic).
- Required sections: Context, Decision, Consequences, Alternatives
  Considered.
- An ADR is required whenever:
  - A new dependency is introduced
  - A public interface is broken
  - A security control is changed
  - A non-trivial architectural pattern is adopted or replaced
- Update the ADR index in `06-decisions/README.md`.
- Once an ADR is `Accepted`, do not edit its body — supersede it
  with a new ADR that links back via `Supersedes: ADR-####`.

Anti-hallucination: cite the requirement (`R-XXXX`) and the code
locations affected. Do not author hypothetical decisions.
