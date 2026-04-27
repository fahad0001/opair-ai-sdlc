---
name: audit-undocumented
description: Run AuditMeta to detect undocumented features/decisions and propose/auto-create requirements and ADRs.
agent: AuditMeta
argument-hint: "scope=web|api|all; maxFindings=20"
---

Run the AuditMeta agent over scope=${input:scope} and produce:

- `docs/agent-memory/09-audits/YYYY-MM-DD__audit-meta.md`

Rules:

- Every finding must include evidence file paths.
- Do not fabricate.
- Recommend requirements/ADRs to close gaps.
