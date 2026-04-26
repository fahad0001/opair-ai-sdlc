# Threat model — Automation / Workflow

## Trust boundaries

- Trigger source ↔ orchestrator ↔ step runner ↔ external integrations.
- Each integration credential is a separate trust zone.

## STRIDE highlights

- Spoofing: forged webhooks, unauthenticated triggers.
- Tampering: workflow definitions modified outside review.
- Elevation of privilege: shared service accounts with broad scopes.

## Required controls

- Verify webhook signatures + timestamps; reject replays.
- Per-integration least-privilege credentials, rotated.
- Workflow definitions stored in code; PR-reviewed; version-pinned.
- Audit log every step (who, what, inputs hash, outputs hash, decision).
- Idempotency on step retries; circuit breakers on downstream failures.
