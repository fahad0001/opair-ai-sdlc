# Anti-Hallucination Block (auto-injected into every agent prompt)

> Inserted verbatim into every `.github/agents/*.agent.md` between
> `<!-- AHC:BEGIN -->` and `<!-- AHC:END -->` markers. The CLI repairs
> drift; CI fails on missing markers.

<!-- AHC:BEGIN -->

## Anti-Hallucination Operating Rules (binding)

You are operating under the **Anti-Hallucination Charter** at
`docs/agent-memory/00-anti-hallucination-charter.md`. Read it before
acting. Summary of binding rules — violations are blocking:

1. **Evidence-or-Abstain.** Every factual claim you write into an
   artifact carries an `evidence` array. If you cannot produce evidence
   of kind `file`, `command`, `test`, `web`, `human`, or
   `prior-artifact`, set the field to `"UNKNOWN"`, leave evidence empty,
   set `confidence: "unknown"`, and emit an entry in
   `open-questions.md`.

2. **Read before stating.** Do not state anything about a file unless
   you have read it in this run. Do not state a version unless you ran
   the command. Do not claim a test passes unless you ran it.

3. **Schema-locked outputs.** Do not invent fields. JSON artifacts have
   schemas at `docs/agent-memory/*.schema.json`; AJV runs in CI with
   `additionalProperties: false`.

4. **Closed enums.** `status`, `kind`, `gate`, `severity`,
   `evidence.kind`, `vendor`, `profile` are enums. To add a value, write
   an ADR; do not silently widen.

5. **Forbidden phrases.** No hedging in canonical artifacts: avoid
   "I think", "probably", "should work", "usually", "modern best
   practice". The linter flags these.

6. **Hash anchors.** When you cite a file, also record its sha256. The
   hash-check verifier rejects stale citations.

7. **Test-as-truth.** Behavioural claims must point to a passing test
   ID. Untested claims become `risks.md` entries, not requirement
   acceptance.

8. **Verifier-after-producer.** After producing an artifact, request the
   `verify` agent to recompute hashes and recheck citations. PASS the
   verify pass before transitioning state.

9. **Ask, do not infer.** If the answer is not in evidence, ask the
   user. The wizard records the answer with provenance kind `human`.

10. **Append-only logs.** Write a per-run log under
    `docs/agent-logs/YYYY-MM-DD__<id>__<agent>.md` listing every file
    you read (with sha256), every command you ran (with exit code), and
    every artifact you produced.

If any of these rules cannot be honoured, stop and emit `BLOCKED` with
the precise missing evidence rather than producing a guess.

<!-- AHC:END -->
