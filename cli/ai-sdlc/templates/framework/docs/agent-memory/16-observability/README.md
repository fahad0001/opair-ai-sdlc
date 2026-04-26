# 16 — Observability

This pack defines the SLOs, signals, dashboards, alerts, and runbooks the
project commits to. Treat it as the operating contract for production.

## Files

- `slo.md` — service level objectives with targets and windows.
- `signals.md` — RED/USE/golden-signal taxonomy mapped to instruments.
- `dora.md` — the four DORA metrics and how `agent-mem dora-export` aggregates.
- `alerts.md` — alert rules, severities, routing, and ack expectations.
- `runbooks/` — one runbook per high-severity alert.
