# Threat model — AI / LLM systems

## Trust boundaries

- User ↔ orchestrator ↔ model provider ↔ tools/retrieval ↔ datastore.
- Each tool call is a privilege boundary.

## OWASP LLM Top 10

LLM01 Prompt injection, LLM02 Insecure output handling, LLM03 Training-data
poisoning, LLM04 Model DoS, LLM05 Supply-chain, LLM06 Sensitive info
disclosure, LLM07 Insecure plugin design, LLM08 Excessive agency, LLM09
Overreliance, LLM10 Model theft.

## Required controls

- Treat every model output as untrusted input; validate before use.
- Tool allow-list per agent; least-privilege scopes; explicit user consent
  for destructive actions.
- Output filters for PII, secrets, jailbreak indicators, denied URLs.
- Retrieval isolation: per-tenant indexes, signed source attribution.
- Cost + token caps; abuse detection on prompt entropy and rate.
- Eval harness (`docs/agent-memory/15-ai-evals/`) gating regressions.
- Provenance: log model id, prompt hash, tool calls, decision rationale.
