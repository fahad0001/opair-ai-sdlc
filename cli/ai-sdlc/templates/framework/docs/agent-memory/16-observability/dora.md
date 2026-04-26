# DORA — agent-memory variant

We track DORA-4 plus framework-internal metrics that approximate them while
real CI/CD telemetry is absent.

## DORA-4

| Metric                | Definition                       | Source                           |
| --------------------- | -------------------------------- | -------------------------------- |
| Deployment frequency  | Successful prod deploys / day    | release pipeline (planned)       |
| Lead time for changes | Commit → prod in hours           | git + release pipeline (planned) |
| Change failure rate   | Deploys causing incident / total | incident tracker (planned)       |
| Mean time to restore  | Incident open → mitigated        | incident tracker (planned)       |

## Framework-internal proxies

- Throughput (Done in window): count of requirements moved to Done in the
  last N days.
- First-try pass rate: requirements where evaluation passed without entering
  the fix loop.
- Average fix-loop iterations: mean iterations across all evaluated reqs.
- Status transitions in window: count of `status-change` events in the last
  N days.

Aggregation: `agent-mem dora-export` writes JSON to `docs/agent-memory/metrics/dora.json`.
