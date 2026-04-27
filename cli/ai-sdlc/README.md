# @opair/ai-sdlc

> A universal, AI-assisted SDLC framework and CLI that bootstraps any project with a deterministic, multi-agent, anti-hallucination memory system.

[![npm](https://img.shields.io/npm/v/@opair/ai-sdlc?label=%40opair%2Fai-sdlc&color=blue)](https://www.npmjs.com/package/@opair/ai-sdlc)
[![node](https://img.shields.io/node/v/@opair/ai-sdlc)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@opair/ai-sdlc)](./LICENSE)

---

## What it does

`ai-sdlc` scaffolds a `docs/agent-memory/` knowledge base inside any project and drives requirements through a tracked state machine:

```
Draft → Planned → Processed → Implemented → Evaluated → Done
```

It generates per-vendor AI rule files out of the box:

| Vendor         | File                              |
| -------------- | --------------------------------- |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor         | `.cursorrules`                    |
| Claude         | `CLAUDE.md`                       |
| Windsurf       | `.windsurfrules`                  |
| Cline          | `.clinerules`                     |
| Aider          | `AIDER_CONVENTIONS.md`            |
| Continue       | `.continue/config.yaml`           |
| opencode       | `opencode.json`                   |
| Generic MCP    | `.mcp/agents.json`                |

Every claim in memory is backed by evidence (file, command, or human input). Context packs are sha256-pinned. No hallucinations fly under the radar.

---

## Requirements

- **Node.js ≥ 20**
- npm, pnpm, or bun

---

## Pick exactly one entry flow

The framework supports three mutually exclusive entry points. Running more than
one in the same directory tree creates duplicate memory packs and is now
hard-blocked (use `--force` to override). Pick the one that matches your
situation:

| Flow                        | When to use it                                                            | Command                                                                  |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **`init`**                  | You already have an empty/new repo and know roughly what you're building. | `ai-sdlc init`                                                           |
| **`brainstorm` → `create`** | You don't yet know what to build — start from a problem statement.        | `ai-sdlc brainstorm` then `ai-sdlc create --from-brief project-brief.md` |
| **`adopt`**                 | You have an existing repo with code and want to retrofit the framework.   | `ai-sdlc adopt --deep`                                                   |

After any of these, run more capabilities later with `ai-sdlc add` (see below).

---

## Quick start

### New project (interactive)

```bash
npx @opair/ai-sdlc init
```

`init` asks for the project name, kind, stack, vendors, and which **capability
categories** to include. The default ships only the SDLC core + diagnostics —
small and focused. Add more later with `ai-sdlc add <category|id>`.

### Adopt an existing project

```bash
npx @opair/ai-sdlc adopt
```

Inspects existing code (PRs, issues, READMEs, ADRs) and imports them as requirements without touching your source.

---

## Capability categories

To keep new projects from drowning in prompts, the framework splits non-core
agents/prompts/workflows into opt-in categories:

| Category      | What it adds                                                                 | Capabilities                                                      |
| ------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `diagnostics` | Health-check + repair the memory pack                                        | `audit`, `doctor`, `repair`, `validate`, `status`                 |
| `visibility`  | Dashboards, dependency graph, per-requirement reports                        | `dashboard`, `graph`, `report`                                    |
| `provenance`  | Hash-pinned context packs + signed attestations                              | `context-pack`, `verify-pack`, `attest-pack`, `provenance-verify` |
| `security`    | SBOM checks, threat-coverage gates, license policy (+ `sbom.yml` workflow)   | `sbom-check`, `sbom-diff`, `threat-coverage`                      |
| `release`     | DORA, release notes, changelog, MSRD (+ `release.yml`, `msrd.yml` workflows) | `dora-export`, `release-notes`, `changelog`, `msrd`               |
| `memory`      | Known-issues, ingestion, promotion, archival                                 | `ki`, `ingest`, `promote`, `archive`                              |
| `workflows`   | Brownfield + autonomous orchestrator agents                                  | `adopt`, `autopilot`                                              |

The SDLC pipeline (10 agents, 8 prompts, scoped instructions) is **always
included** — categories are additive on top.

```bash
ai-sdlc init --capabilities security,release        # at scaffold time
ai-sdlc init --capabilities all                     # ship everything

ai-sdlc add security                                 # later: add a category
ai-sdlc add sbom-check threat-coverage               # or pick individual ids
ai-sdlc add                                          # no args → list catalog
```

### Brainstorm → create flow

```bash
mkdir my-thing && cd my-thing            # fresh, EMPTY directory
ai-sdlc brainstorm                       # writes project-brief.{md,json} here
ai-sdlc create --from-brief project-brief.md
# → scaffolds the project under ./<project-name>/
# → moves the brief into <project-name>/docs/agent-memory/00-brief.md
# → cleans up project-brief.{md,json} from the parent
```

After `create` finishes, `cd <project-name>` — **that** is your framework root.
The original directory is now empty (or holds whatever else you put there).

`brainstorm` refuses to run inside an existing framework root or any descendant
of one, so you can't accidentally nest projects.

**Esc-to-skip.** Inside the wizard, only `title` and `problem statement` are
required. Pressing `Esc` (or empty-Enter) on any other prompt skips that field
instead of aborting the session. Persona/risk loops stop the same way.

### AI-assisted brainstorm (`--ai`)

For a richer back-and-forth than a one-shot wizard, run:

```bash
mkdir my-thing && cd my-thing
ai-sdlc brainstorm --ai
# writes:
#   brainstorm.prompt.md          (the dialog instructions)
#   project-brief.template.json   (the schema skeleton)
```

Open `brainstorm.prompt.md` inside Copilot, Claude Code, Cursor, opencode,
Continue, Aider, or any agent that can read local files. The agent then
**dialogs** with you — one focused question at a time, no invention, surfacing
tradeoffs — until you confirm. It writes the final `project-brief.md` +
`project-brief.json` for you. Then:

```bash
ai-sdlc create --from-brief project-brief.md
```

This is the recommended path when the project is fuzzy or when you want the
agent to challenge weak metrics, missing personas, or contradictory scope.

### Global install

```bash
npm i -g @opair/ai-sdlc
ai-sdlc --help
```

### Pick a stack overlay

```bash
ai-sdlc init --stack next-app-router-ts
```

Available stacks: `next-app-router-ts`, `expo-router`, `node-fastify-ts`, `node-commander-ts`, `tsup-changesets-ts`, `turborepo-pnpm`, `docusaurus-ts`, `terraform-cdktf-ts`, `tauri-ts`, `playwright-ts`, `python-dlt-dbt`, `python-langgraph`, `generic`

---

## Brainstorm → create → ship

If you don't yet know what you're building, start with brainstorm in a fresh
empty directory (see [Brainstorm → create flow](#brainstorm--create-flow)
above). Outputs are AHC-compliant — every answer is recorded as
`evidence.kind=human`.

---

## Day-to-day commands

```text
ai-sdlc init [--capabilities ...]   scaffold a project (default: diagnostics)
ai-sdlc brainstorm                  interactive intake → project-brief.{md,json}
ai-sdlc create [--from-brief ...]   scaffold a project from a brief
ai-sdlc adopt [--deep]              import an existing project
ai-sdlc add <category|id> [...]     add capabilities to an existing root
ai-sdlc autopilot [...]             autonomous SDLC orchestrator

ai-sdlc status                      quick state of all requirements
ai-sdlc doctor [--json]             health check
ai-sdlc validate                    validate index.json + AHC rules
ai-sdlc repair                      self-heal common drift
ai-sdlc audit [--fix]               dated audit report

ai-sdlc new requirement             template-driven requirement scaffold
ai-sdlc promote  <R-XXXX> <stage>   advance a requirement
ai-sdlc archive  <R-XXXX>           archive a requirement
ai-sdlc claim    <R-XXXX> <agent>   take an exclusive lock
ai-sdlc release  <R-XXXX>           drop the lock

ai-sdlc adr new "<title>"           ADR scaffold
ai-sdlc ki list|add|resolve         known-issues helpers
ai-sdlc events                      recent events from index.json

ai-sdlc graph         [--format mermaid|dot] [--out FILE]
ai-sdlc context-pack  [--requirement R-XXXX] [--exclude-bodies] [--out FILE]
ai-sdlc verify-pack   <pack.jsonl>
ai-sdlc changelog     [--format md|json]
ai-sdlc release-notes [--since <tag>] [--until HEAD]
ai-sdlc msrd                        Memory-State Readiness Document
ai-sdlc report                      roll-up progress report

ai-sdlc attest-pack                 produce a signed attestation bundle
ai-sdlc verify-attest               verify a bundle
ai-sdlc sbom-check                  CycloneDX/SPDX SBOM license gate
ai-sdlc threat-coverage             threat model coverage gate
ai-sdlc dora-export                 export DORA metrics

ai-sdlc mcp [--writable]            expose memory as a stdio MCP server
```

Run any command with `--help` for full options.

---

## Autopilot

Runs requirements through every SDLC stage autonomously (Init → Plan → Process → Execution → Evaluation → Finalization), in parallel where dependencies allow.

```bash
ai-sdlc autopilot --dry-run                          # simulate — no writes
ai-sdlc autopilot --requirement R-0007               # run one requirement
ai-sdlc autopilot --requirement all --stop-on-fail   # run everything
```

By default autopilot runs in simulated mode. To plug in a real LLM runner:

```bash
AGENT_MEM_RUNNER=my-runner ai-sdlc autopilot --requirement R-0007
```

---

## MCP server

Expose your project memory as tools for any MCP-compatible AI client (Copilot, Claude Desktop, Cursor, etc.):

```bash
# Add to your MCP client config:
ai-sdlc mcp            # read-only
ai-sdlc mcp --writable # also enables mutating tools
```

Read-only tools: `am.status`, `am.list_requirements`, `am.context_pack`, `am.graph`

Writable tools (requires `--writable`): `am.create_requirement`, `am.update_status`, `am.append_event`, `am.ki_add`, `am.create_adr`

---

## Quality gates

Inside a scaffolded project, run:

```bash
npm run check
```

This validates (in order):

1. JSON-schema validation of `index.json`
2. Anti-Hallucination Charter linter (every claim needs evidence)
3. sha256 hash pins for memory artifacts
4. Workflow ↔ package.json drift detection
5. Policy guard (status transitions, traceability, log naming)

---

## Troubleshooting

| Symptom                                 | Fix                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `verify:hashes` fails                   | Run `npm run rebuild:hashes` after intentional edits, then re-commit     |
| `ci:drift` reports drift                | Add missing script to `package.json` or update `index.profiles.commands` |
| `doctor` warns about missing AI surface | Re-run `ai-sdlc init` or scaffold the vendor file manually               |
| Autopilot does nothing useful           | Set `AGENT_MEM_RUNNER` to a real agent runner                            |
| MCP write tools missing                 | Pass `--writable` to `ai-sdlc mcp`                                       |

Full diagnostics:

```bash
ai-sdlc doctor --json
```

---

## Source & issues

- **GitHub:** [fahad0001/opair-ai-sdlc](https://github.com/fahad0001/opair-ai-sdlc)
- **Issues:** [github.com/fahad0001/opair-ai-sdlc/issues](https://github.com/fahad0001/opair-ai-sdlc/issues)

---

## License

MIT
