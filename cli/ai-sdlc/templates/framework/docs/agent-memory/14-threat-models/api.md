# Threat model — API

## Trust boundaries

- Caller ↔ gateway ↔ service ↔ datastore / downstream services.
- Service-to-service identity must be explicit (mTLS or signed tokens).

## STRIDE

- Spoofing: token replay, key leakage, missing audience checks.
- Tampering: mass assignment, unsigned webhooks, race conditions.
- Repudiation: missing per-call structured logs with caller identity.
- Information disclosure: verbose errors, BOLA/IDOR, over-fetching.
- Denial of service: unbounded queries, missing pagination, fan-out storms.
- Elevation of privilege: scope confusion, broken function-level authz.

## OWASP API Top 10 (2023)

API1 BOLA, API2 broken authn, API3 broken object property, API4 unrestricted
resource consumption, API5 broken function-level authz, API6 unrestricted
business flows, API7 SSRF, API8 misconfig, API9 inventory, API10 unsafe
consumption of 3rd-party APIs.

## Required controls

- AuthN every endpoint; coarse + fine authz checks at the object level.
- Schema validation (zod / OpenAPI) at the boundary; reject unknown fields.
- Rate limits + quotas per principal; circuit breakers downstream.
- Idempotency keys on POST; signed webhooks (HMAC + timestamp).
- Structured logs: request id, principal, decision, latency.
