#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { cmdInit } from "./commands/init.js";
import { cmdStatus } from "./commands/status.js";
import { cmdValidate } from "./commands/validate.js";
import { cmdRepair } from "./commands/repair.js";
import { cmdNewRequirement } from "./commands/new.js";
import { cmdClaim, cmdRelease } from "./commands/claim.js";
import { cmdReport } from "./commands/report.js";
import { cmdCreate } from "./commands/create.js";
import { cmdAdopt } from "./commands/adopt.js";
import { cmdDashboard } from "./commands/dashboard.js";
import { cmdDoctor } from "./commands/doctor.js";
import { cmdMsrd } from "./commands/msrd.js";
import { cmdGraph } from "./commands/graph.js";
import { cmdContextPack } from "./commands/context-pack.js";
import { cmdVerifyPack } from "./commands/verify-pack.js";
import { cmdChangelog } from "./commands/changelog.js";
import { cmdReleaseNotes } from "./commands/release-notes.js";
import { cmdAttestPack, cmdVerifyAttest } from "./commands/attest-pack.js";
import { cmdSbomCheck } from "./commands/sbom-check.js";
import { cmdSbomDiff } from "./commands/sbom-diff.js";
import { cmdThreatCoverage } from "./commands/threat-coverage.js";
import { cmdProvenanceVerify } from "./commands/provenance-verify.js";
import { cmdAdrNew } from "./commands/adr.js";
import { cmdDoraExport } from "./commands/dora-export.js";
import { cmdMcp } from "./commands/mcp.js";
import { cmdAudit } from "./commands/audit.js";
import { cmdKiAdd, cmdKiList, cmdKiResolve } from "./commands/ki.js";
import { cmdEvents } from "./commands/events.js";
import { cmdBrainstorm } from "./commands/brainstorm.js";
import { cmdAutopilot } from "./commands/autopilot.js";
import { cmdIngest } from "./commands/ingest.js";
import { cmdPromote } from "./commands/promote.js";
import { cmdArchive } from "./commands/archive.js";
import { cmdMigrateSchema } from "./commands/migrate-schema.js";
import {
  cmdUnlockBootstrap,
  cmdAnswerBootstrap,
} from "./commands/bootstrap.js";
import { fail } from "./util/log.js";

const program = new Command();
program
  .name("ai-sdlc")
  .description(
    "Universal AI-assisted project bootstrapper and SDLC framework — anti-hallucination by construction.",
  )
  .version("0.1.0-alpha.0")
  .option("--interactive <mode>", "auto|minimal|full", "auto")
  .option("--config <path>", "use a config file")
  .option("--dry-run", "show what would happen, change nothing")
  .option("--verbose", "extra logging");

const cwd = () => process.cwd();
const rp = (p: string) => path.resolve(cwd(), p);
const guard = async (fn: () => Promise<void> | void) => {
  try {
    await fn();
  } catch (e) {
    fail(String((e as Error)?.message ?? e));
  }
};

program
  .command("brainstorm")
  .description(
    "Iterative ideation flow → produces project-brief.md before scaffolding.",
  )
  .option("--out <path>", "output path (default ./project-brief.md)")
  .option("--resume <path>", "resume from existing brief.json")
  .action(async (o: { out?: string; resume?: string }) => {
    await guard(() =>
      cmdBrainstorm({
        cwd: cwd(),
        ...(o.out ? { out: o.out } : {}),
        ...(o.resume ? { resume: o.resume } : {}),
      }),
    );
  });

program
  .command("create")
  .description(
    "Greenfield: interactive wizard scaffolds a new project from zero.",
  )
  .argument("[name]", "project name")
  .option("-y, --yes", "non-interactive (use all defaults)")
  .option("--kind <kind>", "project kind")
  .option("--stack <id>", "stack id")
  .option("--vendors <csv>", "AI vendors")
  .option(
    "--from-brief <path>",
    "use a project-brief.json from `ai-sdlc brainstorm`",
  )
  .action(
    async (
      name: string | undefined,
      o: {
        yes?: boolean;
        kind?: string;
        stack?: string;
        vendors?: string;
        fromBrief?: string;
      },
    ) => {
      await guard(() =>
        cmdCreate({
          cwd: cwd(),
          ...(name ? { name } : {}),
          yes: o.yes,
          ...(o.fromBrief ? { fromBrief: rp(o.fromBrief) } : {}),
          preset: {
            ...(o.kind ? { projectKind: o.kind as never } : {}),
            ...(o.stack ? { stackId: o.stack } : {}),
            ...(o.vendors
              ? { vendors: o.vendors.split(",").map((s) => s.trim()) as never }
              : {}),
          },
        }),
      );
    },
  );

program
  .command("adopt")
  .description("Brownfield: adopt an existing repo (no framework yet).")
  .argument("[path]", "target repo path", ".")
  .option("--vendors <csv>", "AI vendors", "copilot")
  .option("--deep", "run deep detection + audit + findings report")
  .option("--apply-fixes", "apply idempotent safe fixes (only with --deep)")
  .action(
    async (
      p: string,
      o: { vendors: string; deep?: boolean; applyFixes?: boolean },
    ) => {
      await guard(() =>
        cmdAdopt({
          cwd: rp(p),
          vendors: o.vendors.split(",").map((s) => s.trim()) as never,
          deep: o.deep,
          applyFixes: o.applyFixes,
        }),
      );
    },
  );

program
  .command("autopilot")
  .description(
    "Run requirements through the full SDLC pipeline autonomously (multi-agent, parallel).",
  )
  .option("--requirement <id>", "single R-XXXX or 'all'", "all")
  .option("--max-parallel <n>", "max parallel requirements", "3")
  .option("--budget-minutes <m>", "wall-clock budget", "60")
  .option("--stop-on-fail", "stop the queue on first failure")
  .option("--dry-run", "simulate transitions without invoking external runner")
  .action(
    async (o: {
      requirement: string;
      maxParallel: string;
      budgetMinutes: string;
      stopOnFail?: boolean;
      dryRun?: boolean;
    }) => {
      await guard(() =>
        cmdAutopilot({
          cwd: cwd(),
          requirement: o.requirement,
          maxParallel: Number(o.maxParallel),
          budgetMinutes: Number(o.budgetMinutes),
          ...(o.stopOnFail ? { stopOnFail: true } : {}),
          ...(o.dryRun ? { dryRun: true } : {}),
        }),
      );
    },
  );

program
  .command("init")
  .description("Drop the agent-memory framework into the current directory.")
  .option("--force", "overwrite existing framework files")
  .option("--name <projectName>", "project name (default: directory name)")
  .action(async (o: { force?: boolean; name?: string }) => {
    await guard(() =>
      cmdInit({ cwd: cwd(), force: o.force, projectName: o.name }),
    );
  });

program
  .command("status")
  .description("Show memory state: project, requirements, decisions.")
  .action(async () => guard(() => cmdStatus({ cwd: cwd() })));

program
  .command("validate")
  .description("Run schema + AHC + hash + guard checks.")
  .action(async () => guard(() => cmdValidate({ cwd: cwd() })));

program
  .command("repair")
  .description("Auto-heal AHC block + hash anchors.")
  .option("--no-ahc", "skip AHC block re-injection")
  .option("--no-hashes", "skip hash anchor rebuild")
  .action(async (o: { ahc?: boolean; hashes?: boolean }) =>
    guard(() => cmdRepair({ cwd: cwd(), ahc: o.ahc, hashes: o.hashes })),
  );

const newCmd = program
  .command("new")
  .description("Create a new memory artifact.");
newCmd
  .command("requirement")
  .description("Add a new R-XXXX requirement folder + index entry.")
  .option("--title <title>", "requirement title")
  .option("--id <id>", "explicit R-XXXX id (default: next available)")
  .option("--owner <owner>", "owner handle")
  .action(async (o: { title?: string; id?: string; owner?: string }) =>
    guard(() => cmdNewRequirement({ cwd: cwd(), ...o })),
  );

program
  .command("claim")
  .description("Claim a requirement (team mode).")
  .argument("<id>", "requirement id (R-XXXX)")
  .option("--owner <owner>", "owner handle (required)")
  .option("--force", "override an existing claim")
  .action(async (id: string, o: { owner?: string; force?: boolean }) => {
    if (!o.owner) fail("--owner is required");
    await guard(() =>
      cmdClaim({ cwd: cwd(), id, owner: o.owner!, force: o.force }),
    );
  });

program
  .command("release")
  .description("Release a claimed requirement.")
  .argument("<id>")
  .action(async (id: string) => guard(() => cmdRelease({ cwd: cwd(), id })));

program
  .command("promote")
  .description("Advance a requirement's status (gate-checked).")
  .argument("<id>")
  .option("--to <status>", "target status (default: next legal)")
  .option("--force", "bypass transition legality (logged)")
  .action(async (id: string, o: { to?: string; force?: boolean }) =>
    guard(() => cmdPromote({ cwd: cwd(), id, to: o.to, force: o.force })),
  );

program
  .command("archive")
  .description(
    "Move 'Done' requirements older than N days into archive.items[].",
  )
  .option("--older-than <days>", "default 90", "90")
  .option("--dry-run")
  .action(async (o: { olderThan: string; dryRun?: boolean }) =>
    guard(() =>
      cmdArchive({
        cwd: cwd(),
        olderThanDays: Number(o.olderThan),
        dryRun: o.dryRun,
      }),
    ),
  );

program
  .command("migrate-schema")
  .description("Migrate index.json to the latest schema version (additive).")
  .option("--dry-run")
  .action(async (o: { dryRun?: boolean }) =>
    guard(() => cmdMigrateSchema({ cwd: cwd(), dryRun: o.dryRun })),
  );

program
  .command("ingest")
  .description(
    "Bulk-import requirements via an adapter (csv|markdown-prd|github-issues|plain-text).",
  )
  .option("--source <path>", "input file")
  .option("--adapter <name>", "force a specific adapter")
  .action(async (o: { source?: string; adapter?: string }) => {
    if (!o.source) fail("--source <path> is required");
    await guard(() =>
      cmdIngest({
        cwd: cwd(),
        source: o.source!,
        ...(o.adapter ? { adapter: o.adapter } : {}),
      }),
    );
  });

program
  .command("report")
  .description("Emit a progress report.")
  .option("--format <md|json>", "output format", "md")
  .option("--out <path>", "write to file instead of stdout")
  .action(async (o: { format?: "md" | "json"; out?: string }) =>
    guard(() => cmdReport({ cwd: cwd(), format: o.format, out: o.out })),
  );

const bootstrapCmd = program
  .command("bootstrap")
  .description("Manage the bootstrap.lock gate.");
bootstrapCmd
  .command("answer")
  .description("Mark a bootstrap item as answered.")
  .option("--id <id>", "item id")
  .option("--evidence <path>", "evidence reference")
  .action(async (o: { id?: string; evidence?: string }) => {
    if (!o.id) fail("--id is required");
    await guard(() =>
      cmdAnswerBootstrap({
        cwd: cwd(),
        id: o.id!,
        ...(o.evidence ? { evidence: o.evidence } : {}),
      }),
    );
  });
bootstrapCmd
  .command("unlock")
  .description(
    "Unlock the bootstrap gate after all items are answered (or --force to bypass).",
  )
  .option("--reason <text>")
  .option("--force")
  .action(async (o: { reason?: string; force?: boolean }) =>
    guard(() =>
      cmdUnlockBootstrap({
        cwd: cwd(),
        ...(o.reason ? { reason: o.reason } : {}),
        force: o.force,
      }),
    ),
  );

program
  .command("dashboard")
  .description(
    "Emit a zero-build dashboard.html next to docs/agent-memory/index.json.",
  )
  .option("--serve", "start a local HTTP server for the dashboard")
  .option("--port <n>", "port for --serve", "4126")
  .option("--host <h>", "host for --serve", "127.0.0.1")
  .action(async (o: { serve?: boolean; port?: string; host?: string }) =>
    guard(() =>
      cmdDashboard({
        cwd: cwd(),
        ...(o.serve ? { serve: true } : {}),
        ...(o.port ? { port: Number.parseInt(o.port, 10) } : {}),
        ...(o.host ? { host: o.host } : {}),
      }),
    ),
  );

program
  .command("mcp")
  .description(
    "Run the ai-sdlc MCP server (stdio JSON-RPC) or print MCP client config.",
  )
  .option(
    "--print",
    "print MCP client config snippet instead of launching the server",
  )
  .option(
    "--writable",
    "expose mutating tools (am.create_requirement, am.update_status, am.append_event, am.ki_add)",
  )
  .action(async (o: { print?: boolean; writable?: boolean }) =>
    guard(() =>
      cmdMcp({
        cwd: cwd(),
        ...(o.print ? { print: true } : {}),
        ...(o.writable ? { writable: true } : {}),
      }),
    ),
  );

program
  .command("audit")
  .description(
    "Audit memory + requirements + ADRs + KIs; write a dated report to 09-audits/.",
  )
  .option("--out <path>", "override default report path")
  .option("--json", "emit machine-readable JSON to stdout")
  .option(
    "--fix",
    "non-destructively self-heal: create skeleton AC/traceability files and 06-decisions/ if missing",
  )
  .action(async (o: { out?: string; json?: boolean; fix?: boolean }) =>
    guard(async () => {
      await cmdAudit({
        cwd: cwd(),
        ...(o.out ? { out: o.out } : {}),
        ...(o.json ? { json: true } : {}),
        ...(o.fix ? { fix: true } : {}),
      });
    }),
  );

program
  .command("audit-gate")
  .description(
    "CI gate: compute audit report and exit non-zero if any finding meets/exceeds the threshold.",
  )
  .option(
    "--severity <level>",
    "minimum failing severity: info|low|medium|high",
    "high",
  )
  .action(async (o: { severity?: string }) =>
    guard(async () => {
      const { computeAuditReport } = await import("./commands/audit.js");
      const memDir = path.join(path.resolve(cwd()), "docs", "agent-memory");
      const report = computeAuditReport(memDir);
      const order = { info: 0, low: 1, medium: 2, high: 3 } as const;
      const min = (o.severity ?? "high") as keyof typeof order;
      const threshold = order[min] ?? order.high;
      const blocking = report.findings.filter(
        (f) => order[f.severity] >= threshold,
      );
      process.stdout.write(
        JSON.stringify(
          {
            severityThreshold: min,
            findings: report.findings.length,
            blocking: blocking.length,
            blockingFindings: blocking,
          },
          null,
          2,
        ) + "\n",
      );
      if (blocking.length > 0) process.exit(1);
    }),
  );

const ki = program.command("ki").description("Manage known-issues.md entries");
ki.command("list")
  .description("List known-issues entries")
  .option("--state <state>", "OPEN | RESOLVED | all", "OPEN")
  .option("--json", "emit JSON to stdout")
  .action(async (o: { state?: string; json?: boolean }) =>
    guard(async () => {
      const state =
        o.state === "RESOLVED" || o.state === "all" ? o.state : "OPEN";
      await cmdKiList({
        cwd: cwd(),
        state: state as "OPEN" | "RESOLVED" | "all",
        ...(o.json ? { json: true } : {}),
      });
    }),
  );
ki.command("add <title...>")
  .description("Add a new known-issues entry")
  .option("--severity <sev>", "low | medium | high", "low")
  .option("--scope <scope>", "area / package / file path")
  .option("--repro <repro>", "one-line reproduction recipe")
  .action(
    async (
      titleParts: string[],
      o: { severity?: string; scope?: string; repro?: string },
    ) =>
      guard(async () => {
        const sev = (
          o.severity === "medium" || o.severity === "high" ? o.severity : "low"
        ) as "low" | "medium" | "high";
        await cmdKiAdd({
          cwd: cwd(),
          title: titleParts.join(" "),
          severity: sev,
          ...(o.scope ? { scope: o.scope } : {}),
          ...(o.repro ? { repro: o.repro } : {}),
        });
      }),
  );
ki.command("resolve <id>")
  .description("Mark a known-issues entry as RESOLVED")
  .option("--note <text>", "resolution note")
  .action(async (id: string, o: { note?: string }) =>
    guard(async () => {
      await cmdKiResolve({
        cwd: cwd(),
        id,
        ...(o.note ? { note: o.note } : {}),
      });
    }),
  );

program
  .command("doctor")
  .description(
    "Diagnose memory layout, AHC overlays, CI scaffolding, and AI vendor surfaces.",
  )
  .option("--json", "emit machine-readable JSON")
  .action(async (o: { json?: boolean }) =>
    guard(() => cmdDoctor({ cwd: cwd(), json: o.json })),
  );

program
  .command("events")
  .description("List the events[] stream from index.json.")
  .option("--json", "emit JSON to stdout")
  .action(async (o: { json?: boolean }) =>
    guard(async () => {
      await cmdEvents({ cwd: cwd(), ...(o.json ? { json: true } : {}) });
    }),
  );

program
  .command("msrd")
  .description(
    "Render the Most-Significant-Requirements digest from index.json.",
  )
  .option("--out <path>", "output path (default docs/agent-memory/msrd.md)")
  .option("--top <n>", "top N requirements", "20")
  .action(async (o: { out?: string; top?: string }) =>
    guard(() =>
      cmdMsrd({
        cwd: cwd(),
        ...(o.out ? { out: o.out } : {}),
        top: Number(o.top ?? "20"),
      }),
    ),
  );

program
  .command("graph")
  .description(
    "Render a Mermaid (or DOT) dependency graph of all requirements.",
  )
  .option("--out <path>", "output path (default stdout)")
  .option("--format <fmt>", "mermaid|dot", "mermaid")
  .option("--include-adrs", "include ADR nodes and links", false)
  .action(async (o: { out?: string; format?: string; includeAdrs?: boolean }) =>
    guard(async () => {
      await cmdGraph({
        cwd: cwd(),
        ...(o.out ? { out: o.out } : {}),
        format: o.format === "dot" ? "dot" : "mermaid",
        ...(o.includeAdrs ? { includeAdrs: true } : {}),
      });
    }),
  );

program
  .command("context-pack")
  .description(
    "Bundle the entire memory pack as JSONL for LLM/agent consumption (with sha256 pinning).",
  )
  .option(
    "--out <path>",
    "output path (default docs/agent-memory/context-pack.jsonl)",
  )
  .option(
    "--requirement <id...>",
    "only include the listed R-XXXX requirements",
  )
  .option("--exclude-bodies", "emit metadata + hashes only (no body)", false)
  .option("--pretty", "emit pretty JSON when --out ends with .json", false)
  .action(
    async (o: {
      out?: string;
      requirement?: string[];
      excludeBodies?: boolean;
      pretty?: boolean;
    }) =>
      guard(async () => {
        await cmdContextPack({
          cwd: cwd(),
          ...(o.out
            ? { out: o.out }
            : { out: "docs/agent-memory/context-pack.jsonl" }),
          ...(o.requirement && o.requirement.length > 0
            ? { requirements: o.requirement }
            : {}),
          ...(o.excludeBodies ? { excludeBodies: true } : {}),
          ...(o.pretty ? { pretty: true } : {}),
        });
      }),
  );

program
  .command("verify-pack")
  .description(
    "Re-hash on-disk memory and compare to a context-pack JSONL. Fails on drift.",
  )
  .requiredOption("--pack <path>", "path to context-pack JSONL")
  .option("--json", "emit JSON drift report")
  .option(
    "--strict",
    "also fail when on-disk has files not present in pack",
    false,
  )
  .action(async (o: { pack: string; json?: boolean; strict?: boolean }) =>
    guard(async () => {
      await cmdVerifyPack({
        cwd: cwd(),
        pack: o.pack,
        ...(o.json ? { json: true } : {}),
        ...(o.strict ? { strict: true } : {}),
      });
    }),
  );

program
  .command("changelog")
  .description(
    "Render a changelog from index.json (Done/Evaluated requirements + ADRs + events).",
  )
  .option("--out <path>", "output path (default stdout)")
  .option("--window-days <n>", "window in days", "30")
  .option("--group-by <mode>", "status|tag|none", "status")
  .option("--format <fmt>", "md|json", "md")
  .action(
    async (o: {
      out?: string;
      windowDays?: string;
      groupBy?: string;
      format?: string;
    }) =>
      guard(async () => {
        await cmdChangelog({
          cwd: cwd(),
          ...(o.out ? { out: o.out } : {}),
          windowDays: Number(o.windowDays ?? "30"),
          groupBy: (o.groupBy === "tag" || o.groupBy === "none"
            ? o.groupBy
            : "status") as "status" | "tag" | "none",
          format: (o.format === "json" ? "json" : "md") as "md" | "json",
        });
      }),
  );

program
  .command("release-notes")
  .description(
    "Render release notes between a git tag (or ISO date) and HEAD/now.",
  )
  .requiredOption(
    "--since <ref>",
    "git tag or ISO date marking the start of the range",
  )
  .option(
    "--until <ref>",
    "git tag or ISO date marking the end of the range (default: now)",
  )
  .option(
    "--version <label>",
    "version label for the header (default: --until or 'Unreleased')",
  )
  .option("--format <fmt>", "md|json", "md")
  .option("--out <path>", "output path (default stdout)")
  .action(
    async (o: {
      since: string;
      until?: string;
      version?: string;
      format?: string;
      out?: string;
    }) =>
      guard(async () => {
        await cmdReleaseNotes({
          cwd: cwd(),
          since: o.since,
          ...(o.until ? { until: o.until } : {}),
          ...(o.version ? { version: o.version } : {}),
          ...(o.out ? { out: o.out } : {}),
          format: (o.format === "json" ? "json" : "md") as "md" | "json",
        });
      }),
  );

program
  .command("attest-pack")
  .description(
    "HMAC-SHA256-sign a JSONL context-pack and write a sidecar .attest.json.",
  )
  .requiredOption("--pack <path>", "path to the context-pack JSONL")
  .option(
    "--out <path>",
    "attestation output path (default <pack>.attest.json)",
  )
  .option("--key-file <path>", "path to raw HMAC key bytes")
  .option(
    "--key-env <name>",
    "env var holding the HMAC key (default AGENT_MEM_ATTEST_KEY)",
  )
  .option("--json", "machine-readable output")
  .action(
    async (o: {
      pack: string;
      out?: string;
      keyFile?: string;
      keyEnv?: string;
      json?: boolean;
    }) =>
      guard(async () => {
        await cmdAttestPack({
          cwd: cwd(),
          pack: o.pack,
          ...(o.out ? { out: o.out } : {}),
          ...(o.keyFile ? { keyFile: o.keyFile } : {}),
          ...(o.keyEnv ? { keyEnv: o.keyEnv } : {}),
          ...(o.json ? { json: true } : {}),
        });
      }),
  );

program
  .command("verify-attest")
  .description(
    "Verify a JSONL context-pack against its sidecar HMAC attestation.",
  )
  .requiredOption("--pack <path>", "path to the context-pack JSONL")
  .option("--attest <path>", "attestation path (default <pack>.attest.json)")
  .option("--key-file <path>", "path to raw HMAC key bytes")
  .option(
    "--key-env <name>",
    "env var holding the HMAC key (default AGENT_MEM_ATTEST_KEY)",
  )
  .option("--json", "machine-readable output")
  .action(
    async (o: {
      pack: string;
      attest?: string;
      keyFile?: string;
      keyEnv?: string;
      json?: boolean;
    }) =>
      guard(async () => {
        await cmdVerifyAttest({
          cwd: cwd(),
          pack: o.pack,
          ...(o.attest ? { attest: o.attest } : {}),
          ...(o.keyFile ? { keyFile: o.keyFile } : {}),
          ...(o.keyEnv ? { keyEnv: o.keyEnv } : {}),
          ...(o.json ? { json: true } : {}),
        });
      }),
  );

program
  .command("sbom-check")
  .description("Verify a CycloneDX SBOM against the license allowlist policy.")
  .option("--sbom <path>", "SBOM path (default ./sbom.cdx.json)")
  .option(
    "--policy <path>",
    "policy path (default docs/agent-memory/17-release/licenses.allowlist.yml)",
  )
  .option("--json", "machine-readable output")
  .action(async (o: { sbom?: string; policy?: string; json?: boolean }) =>
    guard(() =>
      cmdSbomCheck({
        cwd: cwd(),
        ...(o.sbom ? { sbom: o.sbom } : {}),
        ...(o.policy ? { policy: o.policy } : {}),
        json: o.json,
      }),
    ),
  );

program
  .command("sbom-diff")
  .description("Diff two CycloneDX SBOMs (added / removed / version changes).")
  .requiredOption("--before <path>", "baseline SBOM")
  .requiredOption("--after <path>", "new SBOM")
  .option("--out <path>", "write JSON summary to this path")
  .option("--json", "emit JSON to stdout")
  .action(
    async (o: {
      before: string;
      after: string;
      out?: string;
      json?: boolean;
    }) =>
      guard(() =>
        cmdSbomDiff({
          cwd: cwd(),
          before: o.before,
          after: o.after,
          ...(o.out ? { out: o.out } : {}),
          json: o.json,
        }),
      ),
  );

program
  .command("threat-coverage")
  .description(
    "Render a threat-model coverage matrix across all 13 project kinds.",
  )
  .option(
    "--out <path>",
    "output path (default docs/agent-memory/14-threat-models/coverage.md)",
  )
  .option("--json", "emit JSON to stdout")
  .action(async (o: { out?: string; json?: boolean }) =>
    guard(() =>
      cmdThreatCoverage({
        cwd: cwd(),
        ...(o.out ? { out: o.out } : {}),
        json: o.json,
      }),
    ),
  );

program
  .command("provenance-verify")
  .description(
    "Verify SLSA provenance for an artifact via 'gh attestation verify' or cosign.",
  )
  .requiredOption("--artifact <path>", "artifact to verify")
  .option("--repo <owner/name>", "GitHub repo (for 'gh attestation verify')")
  .option("--json", "machine-readable output")
  .action(async (o: { artifact: string; repo?: string; json?: boolean }) =>
    guard(() =>
      cmdProvenanceVerify({
        cwd: cwd(),
        artifact: o.artifact,
        ...(o.repo ? { repo: o.repo } : {}),
        json: o.json,
      }),
    ),
  );

const adr = program
  .command("adr")
  .description("Architecture Decision Record helpers.");
adr
  .command("new")
  .description("Scaffold a new ADR file under docs/agent-memory/06-decisions/.")
  .requiredOption("--title <text>", "ADR title")
  .option(
    "--status <status>",
    "Proposed | Accepted | Deprecated | Superseded",
    "Proposed",
  )
  .option("--requirement <id>", "Linked requirement (e.g. R-0001)")
  .option("--json", "emit JSON")
  .action(
    async (o: {
      title: string;
      status?: string;
      requirement?: string;
      json?: boolean;
    }) =>
      guard(async () => {
        await cmdAdrNew({
          cwd: cwd(),
          title: o.title,
          ...(o.status
            ? {
                status: o.status as
                  | "Proposed"
                  | "Accepted"
                  | "Deprecated"
                  | "Superseded",
              }
            : {}),
          ...(o.requirement ? { requirement: o.requirement } : {}),
          json: o.json,
        });
      }),
  );

program
  .command("dora-export")
  .description(
    "Compute DORA + framework metrics from index.json → docs/agent-memory/metrics/dora.json.",
  )
  .option("--out <path>", "output path")
  .option("--window <days>", "rolling window in days", "30")
  .option("--json", "emit JSON to stdout")
  .action(async (o: { out?: string; window?: string; json?: boolean }) =>
    guard(async () => {
      await cmdDoraExport({
        cwd: cwd(),
        ...(o.out ? { out: o.out } : {}),
        windowDays: o.window ? Number.parseInt(o.window, 10) : 30,
        json: o.json,
      });
    }),
  );

program
  .parseAsync(process.argv)
  .catch((e) => fail(String((e as Error)?.message ?? e)));
