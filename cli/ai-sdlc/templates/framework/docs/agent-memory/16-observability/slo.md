# SLOs

| SLO                               | Target  | Window      | Notes                         |
| --------------------------------- | ------- | ----------- | ----------------------------- |
| Availability (HTTP 5xx rate < 1%) | 99.5%   | 30d rolling | gateway-level                 |
| Latency p95                       | < 500ms | 7d rolling  | per critical endpoint         |
| Background job success            | 99.0%   | 7d rolling  | excludes user-induced retries |

## Error budget policy

- Burn rate alerts at 2% and 14% of monthly budget over 1h windows.
- When 50% of monthly budget is consumed: freeze risky changes; require
  on-call sign-off for production deploys.
- When budget exhausted: only reliability + security fixes ship.
