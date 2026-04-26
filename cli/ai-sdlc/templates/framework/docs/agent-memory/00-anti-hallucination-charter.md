# Anti-Hallucination Charter (AHC)

> **Status**: Normative. Every agent, prompt, scaffold, and CI gate in this
> framework MUST conform to this charter. Violations are blocking.

This charter defines the **operating rules that prevent AI hallucinations**
in this repository and in every project produced by the `agent-mem` CLI.
Hallucination here means: any agent output (text, code, claim, decision,
status change, ADR, evaluation result, requirement statement, test, plan
step) that is not **(a) grounded in cited evidence**, **(b) verifiable by
re-running a deterministic command**, or **(c) explicitly marked as
`UNKNOWN` / `ASSUMPTION`**.

Hallucinations are treated as defects of the _highest_ severity — equal to a
production security bug — because the framework is used to drive automated
SDLC actions.

---

## 1. Five Pillars

### Pillar 1 — Evidence-or-Abstain

> No claim without evidence. No evidence → return `UNKNOWN`, never guess.

Every structured agent output (artifact, JSON record, table row) that
contains a factual claim about code, files, behaviour, versions,
environments, dependencies, ownership, status, or test results MUST attach
an `evidence` field. The schema is defined in
[evidence.schema.json](evidence.schema.json).

Allowed evidence kinds (closed set):

| Kind             | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `file`           | Path + line range + sha256 of the cited content           |
| `command`        | Exact command, working dir, exit code, stdout/stderr hash |
| `test`           | Test ID + framework + last result + run id                |
| `web`            | URL + retrieved-at timestamp + content hash               |
| `human`          | User confirmation (recorded prompt + answer)              |
| `prior-artifact` | Path of a memory artifact + sha256                        |

**If none of these can be produced, the agent MUST output `"evidence":
[]` and `"confidence": "unknown"` AND set the surrounding field value to
`"UNKNOWN"`.** It MUST NOT invent a plausible value.

### Pillar 2 — Schema-Locked Outputs

> The agent cannot invent fields. Every machine-readable artifact is
> JSON-Schema validated in CI, with `additionalProperties: false`.

- All artifacts under `docs/agent-memory/` that are JSON have a schema.
- The CLI emits artifacts only via typed builders that import the schema.
- CI runs AJV strict mode on every push (see
  [.github/scripts/agent-memory-validate-schema.mjs](../../.github/scripts/agent-memory-validate-schema.mjs)).
- Closed-set vocabularies (status, kind, gate-name, severity, evidence
  kind, profile, vendor) are enumerated in schemas — agents cannot widen
  them at will. Widening requires an ADR.

### Pillar 3 — Tool-Only Facts

> Code/version/path/test facts come from tool outputs, not from the
> model's training memory.

Concretely:

1. Before stating anything about a file, the agent MUST `read` it in the
   current run.
2. Before stating a version, the agent MUST run the package manager
   command (e.g. `npm view`, `pip show`) or read the manifest.
3. Before claiming a test passes, the agent MUST run the test and capture
   the run id.
4. Before claiming a behaviour is implemented, the agent MUST cite the
   file:lineRange.
5. Reads are tracked in a per-run **Grounding Log** (`docs/agent-logs/<run>.md`)
   with sha256 of every consulted file. Outputs that cite a file not in
   the log fail CI.

### Pillar 4 — Test-as-Truth

> Behavioural claims must point to a passing test.

- Every requirement (`R-XXXX`) has at least one acceptance test linked in
  `acceptance-criteria.md` via a stable `AC-XXXX-NN` ID.
- Each AC ID maps 1:1 to one or more test IDs in `traceability.md`.
- The Evaluation agent does not mark `PASS` unless the test ID is found in
  the most recent test run report and exit status is success.
- Untested behaviour is admissible only when annotated `ASSUMPTION` and
  recorded in `risks.md`.

### Pillar 5 — Verifier-After-Producer (two-pass)

> Every produced artifact is checked by an independent verifier pass
> before it is committed.

- **Producer** agent: writes the artifact.
- **Verifier** agent (`verify` agent under `.github/agents/verify.agent.md`):
  - Recomputes evidence hashes.
  - Confirms each cited line range still says what was claimed.
  - Cross-checks the artifact against `index.json`, `traceability.md`,
    related ADRs.
  - Runs the forbidden-phrases linter.
  - Emits `verify-report.md` next to the artifact.
- A failing verify pass blocks the SDLC state transition.

---

## 2. Forbidden Phrases (linter-enforced)

The agent SHOULD NOT use hedging or speculative language inside artifacts
in a way that would let an unverified claim slip into the canonical
record. The linter (`agent-memory-evidence-check.mjs --forbidden`) flags:

- "I think", "I believe", "probably", "should work", "likely"
- "in most cases", "usually", "typically" (without citation)
- "this is a standard practice" (without ADR or external citation)
- "the framework supports" (without code reference)
- "modern best practice is" (without citation)
- "approximately N", "around N" for any measurable metric

Hedging is allowed only inside `risks.md`, `open-questions.md`, or fields
explicitly typed as `Speculation` in their schema.

---

## 3. Confidence Levels

Every agent output records a `confidence` field with one of:

| Level        | Required preconditions                                  |
| ------------ | ------------------------------------------------------- |
| `verified`   | Producer + Verifier both PASS, evidence sha256 stable   |
| `produced`   | Producer PASS, Verifier not yet run                     |
| `assumption` | No evidence; tracked in `risks.md` and surfaced         |
| `unknown`    | Could not establish; downstream agents must not consume |

Downstream consumers (Plan, Execution, Evaluation) MUST refuse to operate
on `unknown` inputs and instead emit a `BLOCKED` status with the missing
evidence list.

---

## 4. Decision Rule for Ambiguous Inputs

When an agent encounters a question whose answer is not derivable from
cited evidence:

1. Ask the user via the wizard / `vscode_askQuestions` channel.
2. If interactive channel unavailable, emit `open-questions.md` entry
   with severity `BLOCK` and stop.
3. Never proceed by inferring "reasonable defaults" silently. The CLI's
   wizard is allowed to suggest a default but must accept user override
   and record the choice in `meta.json`.

---

## 5. Hash-Anchored Memory

Each memory artifact carries a content hash anchor recorded in
`index.json` under `requirements.items[].artifacts[].sha256`. A later
agent that claims to have "read" an artifact cites the sha256; if the
file has drifted, CI fails. This prevents:

- Stale citations (artifact moved or rewritten).
- Forged citations (agent makes up a path that does not exist).
- Silent drift between `index.json` and disk.

The CLI's `agent-mem repair` rebuilds hashes from current disk content
and prints a diff for human approval.

---

## 6. Closed-World Generation

Project-kind, profile, vendor, gate name, status, severity, evidence
kind, ADR status — all enums. The CLI cannot scaffold a value outside
the enum. To add a new value, an ADR is required.

This pattern collapses the surface area where a model could invent
plausible-but-wrong tokens.

---

## 7. CI Enforcement Map

| Mechanism                | Script                                             | Triggered       |
| ------------------------ | -------------------------------------------------- | --------------- |
| Schema validation        | `.github/scripts/agent-memory-validate-schema.mjs` | every push/PR   |
| Guard (memory shape)     | `.github/scripts/agent-memory-guard.mjs`           | every push/PR   |
| Evidence/citation linter | `.github/scripts/agent-memory-evidence-check.mjs`  | every push/PR   |
| Hash-anchor verifier     | `.github/scripts/agent-memory-hash-check.mjs`      | every push/PR   |
| Forbidden phrases linter | `agent-memory-evidence-check.mjs --forbidden`      | every push/PR   |
| Verifier-after-producer  | `.github/agents/verify.agent.md` workflow          | per artifact    |
| Test-as-truth check      | Evaluation agent + traceability table              | per requirement |

A failure in any of the above fails the workflow.

---

## 8. Author-Time Reminders Embedded in Every Agent Prompt

Every `.github/agents/*.agent.md` file MUST inherit the snippet
[anti-hallucination-block.md](anti-hallucination-block.md) — the CLI
asserts this on `agent-mem validate` and `agent-mem repair` will splice
it back if missing.

---

## 9. Out-of-Scope (deliberately)

This charter is about correctness of **structured outputs**. Pure
brainstorm or natural-language conversation with the user is not
constrained — but anything captured into `docs/agent-memory/` becomes
canonical and falls under this charter.

---

## 10. Change Procedure

This charter changes only via an ADR with status `Accepted`, signed off
by a code owner of `docs/agent-memory/`. Drift detection is performed by
the `verify` agent and the AHC linter.
