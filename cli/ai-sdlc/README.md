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

## Quick start

### New project (interactive)

```bash
npx @opair/ai-sdlc init
```

`init` asks for your project name, kind, and stack, then scaffolds everything.

### Adopt an existing project

```bash
npx @opair/ai-sdlc adopt
```

Inspects existing code (PRs, issues, READMEs, ADRs) and imports them as requirements without touching your source.

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

If you don't yet know what you're building, start with brainstorm:

```bash
ai-sdlc brainstorm                        # interactive intake
ai-sdlc brainstorm --resume brief.json    # resume a saved brief
ai-sdlc create --from-brief brief.json    # scaffold requirements from the brief
```

Outputs are AHC-compliant — every answer is recorded as `evidence.kind=human`.

---

## Day-to-day commands

```text
ai-sdlc init                        scaffold a project
ai-sdlc brainstorm                  interactive intake → project-brief.{md,json}
ai-sdlc create [--from-brief ...]   create a requirement folder + meta
ai-sdlc adopt [--deep]              import an existing project
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
