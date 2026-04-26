# Framework Development Quarantine

This folder tracks the **framework's own** upgrade work, completely separate from the
consumer-facing `docs/agent-memory/` template that this repository ships.

## Why a separate namespace?

The repository at its root IS the framework template. When a downstream user runs
`ai-sdlc create` or `ai-sdlc adopt`, they get the consumer template (a clean
`docs/agent-memory/` with **no requirements yet**, ready for their R-0001).

If we tracked our own upgrade work as `R-0001`, `R-0002`, ... inside
`docs/agent-memory/02-requirements/`, every consumer project would inherit those
entries. That would be wrong.

So framework-development uses an isolated, mirrored memory layout under `framework-dev/`
with **`F-XXXX` IDs** (instead of `R-XXXX`). This namespace is:

- **Excluded** from `ai-sdlc create` and `ai-sdlc adopt` scaffolding.
- **Included** in distribution as documentation / dogfood evidence only.
- **Validated** by a sibling guard (forthcoming) that mirrors the rules of the consumer
  guard but operates on `F-XXXX` IDs.

## Layout (mirrors `docs/agent-memory/`)

```
framework-dev/
├── README.md                      ← this file
├── index.json                     ← machine index for F-XXXX work (created on demand)
├── progress-index.md              ← human progress index (created on demand)
├── requirements/F-XXXX/           ← same 6 files as consumer R-XXXX
├── plans/F-XXXX/                  ← plan + strategy + validation + rollback
├── execution/F-XXXX/              ← implementation notes
├── evaluation/F-XXXX/             ← evaluation reports
├── decisions/                     ← framework-level ADRs (about the framework itself)
└── logs/                          ← YYYY-MM-DD__F-XXXX__<agent>.md
```

## Roadmap (planned `F-XXXX` requirements)

Tracked via the framework upgrade plan in `/memories/session/plan.md` (during active
development) and persisted here once requirements are formalized.

| ID      | Phase | Title                                                          | Status                |
| ------- | ----- | -------------------------------------------------------------- | --------------------- |
| F-0001  | 0     | Seed clean `index.json` for the framework template             | Done (in this commit) |
| F-0002  | 0     | Collapse duplicate evaluation `_template`/`_templates` folders | Done                  |
| F-0003  | 0     | Add missing `evaluation-criteria.md` template                  | Done                  |
| F-0004  | 0     | Fix YAML `tools` arrays in plan/process agents                 | Done                  |
| F-0005  | 0     | Remove ghost ADR rows                                          | Done                  |
| F-0006  | 0     | Move sample requirement skeleton into `00-templates/`          | Done                  |
| F-0007  | 0     | Add AJV-based schema validator and CI integration              | Done                  |
| F-0008  | 0     | Establish this `framework-dev/` quarantine                     | Done                  |
| F-0010+ | 1     | CLI core + interactive wizard + scaffolds                      | Not started           |
| F-0020+ | 2     | Team-readiness, ingest adapters, Architect agent               | Not started           |
| F-0030+ | 3     | Project-type breadth, per-kind quality gates                   | Not started           |
| F-0040+ | 4     | Industry alignment, compliance, AI evals, observability        | Not started           |
| F-0050+ | 5     | MCP server, UI dashboard, brownfield (`adopt`) mode            | Not started           |
| F-0060+ | 6     | Self-healing, archive, polish                                  | Not started           |

Detailed `F-XXXX/requirement.md` files will be authored when each phase begins.

## Guard contract

The consumer guard (`.github/scripts/agent-memory-guard.mjs`) **must ignore** this folder
entirely. The forthcoming framework-dev guard validates only `framework-dev/`. Both run in
the same workflow.
