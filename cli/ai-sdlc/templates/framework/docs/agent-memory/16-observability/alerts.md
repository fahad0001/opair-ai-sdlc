# Alerts

## Severities

- SEV1: customer-facing outage. Page on-call. Ack ≤ 5 min.
- SEV2: degraded experience. Page on-call. Ack ≤ 15 min.
- SEV3: internal-only or imminent risk. Ticket; addressed next business day.

## Required alerts

- 5xx rate burn (2% in 1h, 14% in 1h).
- Latency p95 over SLO for 10 minutes.
- Job failure rate > 5% over 15 minutes.
- Saturation: queue depth > X for 10 minutes.
- Security: new admin role grant; key rotation overdue.

## Routing

- SEV1/SEV2 → on-call paging channel.
- SEV3 → team triage queue.
- All alerts include a runbook link.
