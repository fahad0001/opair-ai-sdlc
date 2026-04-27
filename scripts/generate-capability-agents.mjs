#!/usr/bin/env node
/**
 * scripts/generate-capability-agents.mjs
 *
 * One-shot generator that emits `.github/agents/<id>.agent.md` and
 * `.github/prompts/<id>.prompt.md` for every CLI capability that
 * doesn't already have a hand-authored counterpart. Idempotent:
 * skips any file that already exists (so SDLC pipeline agents are
 * preserved).
 *
 * Run with:  node scripts/generate-capability-agents.mjs
 *
 * The committed .md files are the source of truth. The
 * `cli/ai-sdlc/scripts/sync-framework.mjs` script auto-derives
 * neutral YAMLs from them at build time.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const AGENTS_DIR = path.join(REPO_ROOT, ".github", "agents");
const PROMPTS_DIR = path.join(REPO_ROOT, ".github", "prompts");

fs.mkdirSync(AGENTS_DIR, { recursive: true });
fs.mkdirSync(PROMPTS_DIR, { recursive: true });

/**
 * Capability registry: each entry maps a CLI command to an agent +
 * prompt definition. Bodies are concise, deterministic, AHC-aligned.
 */
const CAPS = [
  // Diagnostics
  {
    id: "audit",
    name: "Audit",
    description:
      "Audit memory + requirements + ADRs + KIs and write a dated report.",
    cmd: "ai-sdlc audit",
    argHint: "[--out path] [--fix]",
    role: "diagnostic",
    when: "memory health is in question, before a release, or on demand.",
    steps: [
      "Run `ai-sdlc audit` (use `--fix` only when a self-heal is desired).",
      "Read the dated report under `docs/agent-memory/09-audits/`.",
      "Summarize highest-severity findings and propose fixes (one per finding).",
    ],
  },
  {
    id: "doctor",
    name: "Doctor",
    description:
      "Diagnose memory layout, AHC overlays, CI scaffolding, and vendor surfaces.",
    cmd: "ai-sdlc doctor",
    argHint: "[--json]",
    role: "diagnostic",
    when: "the framework feels broken or after major edits to .github/ or docs/.",
    steps: [
      "Run `ai-sdlc doctor --json` and parse the structured output.",
      "List each FAIL/WARN with the exact file path involved.",
      "Recommend `ai-sdlc repair` only for items it can safely fix.",
    ],
  },
  {
    id: "repair",
    name: "Repair",
    description: "Idempotent repair of memory pack overlays + scaffolding.",
    cmd: "ai-sdlc repair",
    argHint: "",
    role: "diagnostic",
    when: "Doctor reports missing overlays or hash drift.",
    steps: [
      "Run `ai-sdlc repair` and capture stdout.",
      "Re-run `ai-sdlc doctor --json` to confirm the fix.",
      "Open an ADR if any architectural file was reset.",
    ],
  },
  {
    id: "validate",
    name: "Validate",
    description:
      "Run schema + AHC + hash + guard checks against the memory pack.",
    cmd: "ai-sdlc validate",
    argHint: "",
    role: "diagnostic",
    when: "before each commit, after editing index.json, or on CI failure.",
    steps: [
      "Run `ai-sdlc validate`.",
      "On failure, identify the exact rule (schema/AHC/hash/guard).",
      "Fix in source files; never edit generated outputs to silence checks.",
    ],
  },
  {
    id: "status",
    name: "Status",
    description: "Show current memory state: project, requirements, decisions.",
    cmd: "ai-sdlc status",
    argHint: "",
    role: "diagnostic",
    when: "the user asks 'where are we', or before picking the next task.",
    steps: [
      "Run `ai-sdlc status`.",
      "Surface in-flight requirements (status != Done) and any blockers.",
      "Suggest the next agent to run per the pipeline state machine.",
    ],
  },

  // Visibility
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Emit/serve a zero-build dashboard.html next to index.json.",
    cmd: "ai-sdlc dashboard",
    argHint: "[--serve] [--port n] [--host h]",
    role: "visibility",
    when: "stakeholders need a snapshot or a live view.",
    steps: [
      "Run `ai-sdlc dashboard` (or `--serve` for live).",
      "Confirm `docs/agent-memory/dashboard.html` exists.",
      "Provide the file:// or http:// URL for the user.",
    ],
  },
  {
    id: "graph",
    name: "Graph",
    description:
      "Render a Mermaid/DOT dependency graph of requirements + ADRs.",
    cmd: "ai-sdlc graph",
    argHint: "[--out path] [--format mermaid|dot] [--include-adrs]",
    role: "visibility",
    when: "the user needs to see requirement relationships.",
    steps: [
      "Run `ai-sdlc graph --include-adrs --out docs/agent-memory/graph.mmd`.",
      "Cite the file path in the response; never inline-render the graph.",
      "Suggest `--format dot` for Graphviz consumers.",
    ],
  },
  {
    id: "report",
    name: "Report",
    description:
      "Compose a per-requirement report from memory + execution + evaluation.",
    cmd: "ai-sdlc report",
    argHint: "--requirement R-XXXX [--out path]",
    role: "visibility",
    when: "a requirement reaches Evaluated/Done and needs a stakeholder summary.",
    steps: [
      "Run `ai-sdlc report --requirement R-XXXX`.",
      "Cross-link plan, execution, evaluation artifacts in the response.",
      "Flag any missing post-conditions per AGENTS.md §3.",
    ],
  },

  // Provenance
  {
    id: "context-pack",
    name: "ContextPack",
    description:
      "Bundle the memory pack as sha256-pinned JSONL for LLM consumption.",
    cmd: "ai-sdlc context-pack",
    argHint: "[--requirement R-XXXX...] [--exclude-bodies] [--out path]",
    role: "provenance",
    when: "another agent needs a deterministic, hashed snapshot of memory.",
    steps: [
      "Run `ai-sdlc context-pack --out docs/agent-memory/context-pack.jsonl`.",
      "Record the resulting file's sha256 in the agent log.",
      "Pass the path (not the content) to downstream consumers.",
    ],
  },
  {
    id: "verify-pack",
    name: "VerifyPack",
    description: "Re-hash on-disk memory and compare to a context-pack JSONL.",
    cmd: "ai-sdlc verify-pack",
    argHint: "--pack <path> [--strict] [--json]",
    role: "provenance",
    when: "before consuming a context-pack from another run, or in CI.",
    steps: [
      "Run `ai-sdlc verify-pack --pack <path> --json`.",
      "Treat any non-empty `drift` array as a hard failure.",
      "Re-emit the pack via `ai-sdlc context-pack` if drift is expected.",
    ],
  },
  {
    id: "attest-pack",
    name: "AttestPack",
    description:
      "Produce a signed attestation over a context-pack (in-toto style).",
    cmd: "ai-sdlc attest-pack",
    argHint: "--pack <path> [--key <path>]",
    role: "provenance",
    when: "the team requires signed provenance for shipped artifacts.",
    steps: [
      "Run `ai-sdlc attest-pack --pack <path>`.",
      "Store the resulting `.att.json` next to the pack.",
      "Verify locally with `ai-sdlc provenance-verify` before publishing.",
    ],
  },
  {
    id: "provenance-verify",
    name: "ProvenanceVerify",
    description: "Verify an attestation against a context-pack.",
    cmd: "ai-sdlc provenance-verify",
    argHint: "--attestation <path> [--key <path>]",
    role: "provenance",
    when: "consuming or releasing a signed pack.",
    steps: [
      "Run `ai-sdlc provenance-verify --attestation <path>`.",
      "Fail closed: do not proceed if signature or digest mismatches.",
      "Log key id + result in the agent log.",
    ],
  },

  // Security
  {
    id: "sbom-check",
    name: "SbomCheck",
    description:
      "Validate an SBOM against the project's license + advisory policy.",
    cmd: "ai-sdlc sbom-check",
    argHint: "--sbom <path>",
    role: "security",
    when: "after `npm install` lockfile changes or before a release.",
    steps: [
      "Generate or pass an SBOM (SPDX/CycloneDX).",
      "Run `ai-sdlc sbom-check --sbom <path>`.",
      "Open an ADR for any banned license; never silently waive.",
    ],
  },
  {
    id: "sbom-diff",
    name: "SbomDiff",
    description: "Diff two SBOMs and surface added/removed/upgraded packages.",
    cmd: "ai-sdlc sbom-diff",
    argHint: "--from <path> --to <path>",
    role: "security",
    when: "evaluating a dependency upgrade PR.",
    steps: [
      "Run `ai-sdlc sbom-diff --from old.json --to new.json`.",
      "Highlight new transitive dependencies and version bumps.",
      "Cross-reference with `sbom-check` to flag policy violations.",
    ],
  },
  {
    id: "threat-coverage",
    name: "ThreatCoverage",
    description:
      "Check coverage of the threat model matrix against requirements.",
    cmd: "ai-sdlc threat-coverage",
    argHint: "[--kind ai|api|web|...]",
    role: "security",
    when: "during planning of security-sensitive requirements.",
    steps: [
      "Run `ai-sdlc threat-coverage`.",
      "Map missing kinds to STRIDE/LINDDUN categories.",
      "Open a follow-up requirement for any gap that is in scope.",
    ],
  },

  // Release ops
  {
    id: "dora-export",
    name: "DoraExport",
    description:
      "Export DORA metrics (lead time, deploy freq, MTTR, change-fail) from events.",
    cmd: "ai-sdlc dora-export",
    argHint: "[--since <date>] [--out path]",
    role: "release",
    when: "the team reviews delivery health.",
    steps: [
      "Run `ai-sdlc dora-export --out docs/agent-memory/metrics/dora.json`.",
      "Render trends in the dashboard or a separate report.",
      "Note any anomaly that warrants a postmortem.",
    ],
  },
  {
    id: "release-notes",
    name: "ReleaseNotes",
    description: "Compose release notes from completed requirements + ADRs.",
    cmd: "ai-sdlc release-notes",
    argHint: "[--from <ref>] [--to <ref>]",
    role: "release",
    when: "tagging a release.",
    steps: [
      "Run `ai-sdlc release-notes`.",
      "Group by requirement + ADR, never by raw commit.",
      "Ask the user to confirm tone and scope before publishing.",
    ],
  },
  {
    id: "changelog",
    name: "Changelog",
    description: "Append a CHANGELOG entry from the latest evaluation.",
    cmd: "ai-sdlc changelog",
    argHint: "[--requirement R-XXXX]",
    role: "release",
    when: "a requirement transitions to Done.",
    steps: [
      "Run `ai-sdlc changelog --requirement R-XXXX`.",
      "Verify the entry references the right ADRs and AC IDs.",
      "Commit the CHANGELOG separately for review.",
    ],
  },
  {
    id: "msrd",
    name: "MSRD",
    description:
      "Render the Most-Significant-Requirements digest from index.json.",
    cmd: "ai-sdlc msrd",
    argHint: "[--top n] [--out path]",
    role: "release",
    when: "weekly review or release-readiness check.",
    steps: [
      "Run `ai-sdlc msrd --top 20 --out docs/agent-memory/msrd.md`.",
      "Highlight blocked or stalled requirements.",
      "Link the digest from the dashboard.",
    ],
  },

  // Memory ops
  {
    id: "ki",
    name: "KnownIssues",
    description: "Manage known-issues.md entries (list/add/resolve).",
    cmd: "ai-sdlc ki",
    argHint: "list|add|resolve",
    role: "memory",
    when: "an issue is discovered that doesn't yet warrant a full requirement.",
    steps: [
      "List with `ai-sdlc ki list --json` to inspect.",
      'Add with `ai-sdlc ki add "title" --severity low|medium|high`.',
      'Resolve with `ai-sdlc ki resolve KI-XXXX --note "..."`.',
    ],
  },
  {
    id: "ingest",
    name: "Ingest",
    description:
      "Ingest external artifacts (issues, ADRs, threat models) into memory.",
    cmd: "ai-sdlc ingest",
    argHint: "--from <path> [--kind issue|adr|threat]",
    role: "memory",
    when: "migrating from another tracker or importing prior decisions.",
    steps: [
      "Run `ai-sdlc ingest --from <path>`.",
      "Spot-check the resulting requirement/ADR/KI for fidelity.",
      "Open an ADR if a translation rule is non-obvious.",
    ],
  },
  {
    id: "promote",
    name: "Promote",
    description:
      "Promote a known-issue or audit finding into a full requirement.",
    cmd: "ai-sdlc promote",
    argHint: "--ki KI-XXXX | --finding <id>",
    role: "memory",
    when: "a recurring KI now warrants planning effort.",
    steps: [
      "Run `ai-sdlc promote --ki KI-XXXX`.",
      "Hand off to the Plan agent for the new R-XXXX.",
      "Mark the source KI as RESOLVED with reference to the new R-id.",
    ],
  },
  {
    id: "archive",
    name: "Archive",
    description:
      "Archive completed/cancelled requirements and prune empty folders.",
    cmd: "ai-sdlc archive",
    argHint: "--requirement R-XXXX [--reason <text>]",
    role: "memory",
    when: "a requirement is Done or Cancelled and no longer needs surfacing.",
    steps: [
      "Run `ai-sdlc archive --requirement R-XXXX`.",
      "Confirm the requirement is moved under `02-requirements/_archive/`.",
      "Update progress index and emit an event.",
    ],
  },

  // Workflows
  {
    id: "adopt",
    name: "Adopt",
    description:
      "Brownfield: install the framework into an existing repo (no scaffolding).",
    cmd: "ai-sdlc adopt",
    argHint: "[path] [--vendors copilot,cursor,...] [--deep] [--apply-fixes]",
    role: "workflow",
    when: "the user has an existing project that needs the SDLC framework added.",
    steps: [
      "Run `ai-sdlc adopt --vendors copilot --deep` from the target repo root.",
      "Review the deep-detection report before `--apply-fixes`.",
      "Commit the new memory pack as a separate PR.",
    ],
  },
  {
    id: "autopilot",
    name: "Autopilot",
    description:
      "Run requirements through the full SDLC pipeline autonomously.",
    cmd: "ai-sdlc autopilot",
    argHint: "[--requirement id|all] [--max-parallel n] [--budget-minutes m]",
    role: "workflow",
    when: "many requirements are queued and ready for unattended execution.",
    steps: [
      "Run `ai-sdlc autopilot --requirement all --dry-run` first.",
      "Confirm the plan, then re-run without `--dry-run`.",
      "Watch `docs/agent-logs/` for per-requirement results.",
    ],
  },
];

const renderAgent = (c) => {
  const tools = ["edit/editFiles", "search/codebase", "execute/runInTerminal"];
  const fm = [
    "---",
    `name: ${c.name}`,
    `description: ${JSON.stringify(c.description)}`,
    `tools: ${JSON.stringify(tools)}`,
    `argument-hint: ${JSON.stringify(c.argHint)}`,
    "---",
    "",
  ].join("\n");
  const body = [
    `# ${c.name.toUpperCase()} AGENT`,
    "",
    `Capability: \`${c.cmd}\``,
    "",
    "## PRE (mandatory)",
    "",
    "Read:",
    "",
    "- `AGENTS.md`",
    "- `docs/agent-memory/00-anti-hallucination-charter.md`",
    "- `docs/agent-memory/index.json`",
    "",
    "## WHEN to use",
    "",
    `Use when ${c.when}`,
    "",
    "## TASK",
    "",
    ...c.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Quote any output you cite (paths, hashes, exit codes). Do not",
    "summarize without reading the actual artifact.",
    "",
    "## POST (mandatory)",
    "",
    `- Append an event of type \`${c.id}\` to \`docs/agent-memory/index.json\`.`,
    `- Write a run log under \`docs/agent-logs/YYYY-MM-DD__${c.id}.md\`.`,
    "- If the run produced a new file, record its sha256 in the log.",
    "",
    "---",
    "",
    "`<!-- AHC:BEGIN -->` and `<!-- AHC:END -->`",
    "",
  ].join("\n");
  return fm + body;
};

const renderPrompt = (c) => {
  const fm = [
    "---",
    `name: ${c.id}`,
    `description: ${JSON.stringify(c.description)}`,
    `argument-hint: ${JSON.stringify(c.argHint)}`,
    "---",
    "",
  ].join("\n");
  const body = [
    `You are running the \`${c.cmd}\` capability.`,
    "",
    "Inputs:",
    "${input}",
    "",
    "Rules:",
    "",
    "- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.",
    "- Run the CLI command exactly; do not paraphrase its output.",
    "- Cite any file paths or hashes you produce.",
    "",
    "Steps:",
    "",
    ...c.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `When to invoke: ${c.when}`,
    "",
  ].join("\n");
  return fm + body;
};

let agentCount = 0;
let promptCount = 0;
for (const c of CAPS) {
  const ap = path.join(AGENTS_DIR, `${c.id}.agent.md`);
  if (!fs.existsSync(ap)) {
    fs.writeFileSync(ap, renderAgent(c), "utf8");
    agentCount++;
  }
  const pp = path.join(PROMPTS_DIR, `${c.id}.prompt.md`);
  if (!fs.existsSync(pp)) {
    fs.writeFileSync(pp, renderPrompt(pp ? c : c), "utf8");
    promptCount++;
  }
}
console.log(
  `[generate-capability-agents] wrote ${agentCount} agent(s) + ${promptCount} prompt(s).`,
);
