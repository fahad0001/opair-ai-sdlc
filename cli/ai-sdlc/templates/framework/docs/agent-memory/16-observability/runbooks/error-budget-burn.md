# Runbook — Error-budget burn

## When fired

A burn-rate alert fires when current error rate would consume the monthly
budget faster than the configured threshold (2% in 1h or 14% in 1h).

## Diagnose (5 min)

1. Open the latency / 5xx dashboard for the last 1h.
2. Check recent deploys (`agent-mem` ledger + release pipeline).
3. Check upstream provider status pages.
4. Sample 5 failing traces; identify the dominant error class.

## Mitigate

- If a recent deploy correlates: roll back via the documented procedure in
  `17-release/release-management.md`.
- If a downstream provider is degraded: enable circuit breaker / serve cached.
- If unknown: scale out, raise SEV2, page secondary.

## Recover

- Confirm error rate < 1% for 15 minutes.
- Resolve alert.
- Schedule postmortem within 5 business days; link from incident ticket.
