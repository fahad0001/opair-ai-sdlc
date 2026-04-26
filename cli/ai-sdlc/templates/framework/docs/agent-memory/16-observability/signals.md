# Signals

## RED (per request flow)

- Rate: requests / second per route + caller.
- Errors: 5xx + classified domain errors.
- Duration: p50 / p95 / p99 latency.

## USE (per resource)

- Utilization: CPU, memory, disk, network.
- Saturation: queue depth, GC pressure, IO wait.
- Errors: hardware/runtime errors.

## Logs

- Structured JSON only; required fields: ts, level, msg, request_id, principal.
- PII / secrets must be redacted at the source.

## Traces

- Every external entry point starts a trace; W3C `traceparent` propagated.
- Sampling: 100% on errors, 1% on success (tunable).
