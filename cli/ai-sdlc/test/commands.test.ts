import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ingestFile } from "../src/engine/ingest.js";
import { runWizard } from "../src/engine/wizard.js";
import { scaffoldProject } from "../src/engine/scaffold-engine.js";
import { cmdPromote } from "../src/commands/promote.js";
import { cmdArchive } from "../src/commands/archive.js";
import { cmdMigrateSchema } from "../src/commands/migrate-schema.js";
import { runAutopilot } from "../src/engine/autopilot.js";
import { classifyText } from "../src/engine/classifier.js";
import {
  defaultLock,
  writeLock,
  readLock,
  isReady,
  unlock,
} from "../src/engine/bootstrap-lock.js";
import {
  acquireRequirementLock,
  readRequirementLock,
  releaseRequirementLock,
} from "../src/engine/requirement-lock.js";
import { detectExisting, audit } from "../src/engine/adopt-deep.js";
import { applySafeFixes } from "../src/engine/adopt-deep.js";
import { cmdMsrd } from "../src/commands/msrd.js";
import { cmdGraph } from "../src/commands/graph.js";
import { cmdContextPack } from "../src/commands/context-pack.js";
import { cmdVerifyPack } from "../src/commands/verify-pack.js";
import { cmdChangelog } from "../src/commands/changelog.js";
import { cmdReleaseNotes } from "../src/commands/release-notes.js";
import { cmdAttestPack, cmdVerifyAttest } from "../src/commands/attest-pack.js";
import { cmdSbomCheck } from "../src/commands/sbom-check.js";
import { cmdThreatCoverage } from "../src/commands/threat-coverage.js";
import {
  detectPm,
  ciInstallCmd,
  runScriptCmd,
} from "../src/engine/pm-detect.js";
import { cmdAdrNew } from "../src/commands/adr.js";
import {
  cmdDoraExport,
  computeDoraReport,
} from "../src/commands/dora-export.js";
import { computeAuditReport, cmdAudit } from "../src/commands/audit.js";
import {
  cmdKiAdd,
  cmdKiList,
  cmdKiResolve,
  parseKi,
} from "../src/commands/ki.js";
import { nextLogPath } from "../src/util/agent-log.js";
import { briefToMarkdown } from "../src/engine/brainstorm.js";

const mkProj = async (name: string) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `am-${name}-`));
  const targetDir = path.join(tmp, name);
  const answers = await runWizard({
    cwd: tmp,
    yes: true,
    preset: {
      projectName: name,
      projectKind: "library",
      stackId: "generic",
      teamMode: "solo",
      vendors: ["copilot"],
      compliance: ["none"],
      targetDir,
      initGit: false,
      installDeps: false,
      addCi: false,
      addMcpServer: false,
      license: "MIT",
      bulkRequirements: { source: "none" },
    },
  });
  await scaffoldProject(answers);
  return targetDir;
};

describe("classifier", () => {
  it("identifies AI projects", () => {
    const r = classifyText("Build a langgraph agent with RAG over our docs");
    expect(r.kind).toBe("ai");
    expect(r.architecture).toBe("agent-based");
    expect(r.confidence).toBeGreaterThan(0);
  });
  it("falls back to library on no signal", () => {
    const r = classifyText("xxx yyy zzz");
    expect(r.kind).toBe("library");
  });
});

describe("ingest adapters", () => {
  it("imports a CSV file as R-XXXX entries", async () => {
    const root = await mkProj("ingest1");
    const csv = path.join(root, "reqs.csv");
    fs.writeFileSync(
      csv,
      "title,description\nAdd login,SSO + MFA\nAdd logout,session kill\n",
      "utf8",
    );
    const r = ingestFile(root, csv);
    expect(r.imported.length).toBe(2);
    expect(r.duplicates.length).toBe(0);
    // dedup on second run
    const r2 = ingestFile(root, csv);
    expect(r2.imported.length).toBe(0);
    expect(r2.duplicates.length).toBe(2);
  });
  it("parses markdown PRDs", async () => {
    const root = await mkProj("ingest2");
    const md = path.join(root, "prd.md");
    fs.writeFileSync(
      md,
      "# PRD\n\n## Feature A\nDescription A\n\n## Feature B\nDescription B\n",
      "utf8",
    );
    const r = ingestFile(root, md, "markdown-prd");
    expect(r.imported.length).toBe(2);
  });
  it("parses Jira REST search exports", async () => {
    const root = await mkProj("ingest-jira");
    const file = path.join(root, "jira.json");
    const payload = {
      issues: [
        {
          key: "PROJ-101",
          fields: {
            summary: "Add SSO",
            description: "OIDC + SAML",
            labels: ["security", "sso"],
          },
        },
        {
          key: "PROJ-102",
          fields: {
            summary: "Rate limit login",
            description: "10/min/IP",
            labels: [],
          },
        },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(payload), "utf8");
    const r = ingestFile(root, file);
    expect(r.adapter).toBe("jira");
    expect(r.imported.length).toBe(2);
  });
  it("parses Linear GraphQL exports", async () => {
    const root = await mkProj("ingest-linear");
    const file = path.join(root, "linear.json");
    const payload = {
      data: {
        issues: {
          nodes: [
            {
              identifier: "ENG-7",
              title: "Audit log retention",
              description: "Keep 1y",
              labels: { nodes: [{ name: "compliance" }] },
            },
            {
              identifier: "ENG-8",
              title: "Webhook signing",
              description: "HMAC + timestamp",
              labels: { nodes: [{ name: "security" }] },
            },
          ],
        },
      },
    };
    fs.writeFileSync(file, JSON.stringify(payload), "utf8");
    const r = ingestFile(root, file);
    expect(r.adapter).toBe("linear");
    expect(r.imported.length).toBe(2);
  });
  it("parses Notion database exports", async () => {
    const root = await mkProj("ingest-notion");
    const file = path.join(root, "notion.json");
    const payload = {
      results: [
        {
          object: "page",
          id: "abc-123",
          properties: {
            Name: { title: [{ plain_text: "Add 2FA" }] },
            Tags: { multi_select: [{ name: "security" }, { name: "auth" }] },
          },
        },
        {
          object: "page",
          id: "abc-124",
          properties: {
            Name: { title: [{ plain_text: "Backup encryption" }] },
            Tags: { multi_select: [{ name: "data" }] },
          },
        },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(payload), "utf8");
    const r = ingestFile(root, file);
    expect(r.adapter).toBe("notion");
    expect(r.imported.length).toBe(2);
  });
  it("parses Asana tasks", async () => {
    const root = await mkProj("ingest-asana");
    const file = path.join(root, "asana.json");
    const payload = {
      data: [
        {
          gid: "1001",
          resource_type: "task",
          name: "Add audit log",
          notes: "ship in v1",
          tags: [{ name: "compliance" }],
        },
        {
          gid: "1002",
          resource_type: "task",
          name: "Email digest",
          notes: "weekly",
        },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(payload), "utf8");
    const r = ingestFile(root, file);
    expect(r.adapter).toBe("asana");
    expect(r.imported.length).toBe(2);
  });
  it("parses ClickUp tasks", async () => {
    const root = await mkProj("ingest-clickup");
    const file = path.join(root, "clickup.json");
    const payload = {
      tasks: [
        {
          id: "abc123",
          custom_id: "CU-7",
          name: "Onboard wizard",
          text_content: "step 1..3",
          tags: [{ name: "ux" }],
        },
        { id: "abc124", custom_id: "CU-8", name: "Stripe webhook" },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(payload), "utf8");
    const r = ingestFile(root, file);
    expect(r.adapter).toBe("clickup");
    expect(r.imported.length).toBe(2);
  });
});

describe("promote + archive + migrate", () => {
  it("promotes legally and refuses illegal jumps without --force", async () => {
    const root = await mkProj("promote1");
    // seed a Draft via ingest
    const csv = path.join(root, "r.csv");
    fs.writeFileSync(csv, "title,description\nFoo,desc\n", "utf8");
    const ing = ingestFile(root, csv, "csv");
    const id = ing.imported[0]!;
    await cmdPromote({ cwd: root, id });
    const idxRaw = fs.readFileSync(
      path.join(root, "docs/agent-memory/index.json"),
      "utf8",
    );
    expect(idxRaw).toContain('"status": "Planned"');
    await expect(
      cmdPromote({ cwd: root, id, to: "Done" }),
    ).rejects.toBeDefined();
  }, 15_000);
  it("emits events for status-change and requirements-archived", async () => {
    const root = await mkProj("events-emit");
    const csv = path.join(root, "r.csv");
    fs.writeFileSync(csv, "title,description\nFoo,desc\n", "utf8");
    const ing = ingestFile(root, csv, "csv");
    const id = ing.imported[0]!;
    await cmdPromote({ cwd: root, id });
    const idxPath = path.join(root, "docs/agent-memory/index.json");
    const idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
    expect(Array.isArray(idx.events)).toBe(true);
    const sc = idx.events.find(
      (e: { type: string }) => e.type === "status-change",
    );
    expect(sc).toBeDefined();
    expect(sc.payload.id).toBe(id);
    expect(sc.payload.from).toBe("Draft");
    expect(sc.payload.to).toBe("Planned");
    // Force-promote to Done so we can archive
    await cmdPromote({ cwd: root, id, to: "Done", force: true });
    // Backdate updatedAt to ensure archive cutoff matches
    const idx2 = JSON.parse(fs.readFileSync(idxPath, "utf8"));
    idx2.requirements.items[0].updatedAt = new Date(
      Date.now() - 200 * 86_400_000,
    ).toISOString();
    fs.writeFileSync(idxPath, JSON.stringify(idx2, null, 2), "utf8");
    await cmdArchive({ cwd: root, olderThanDays: 90, dryRun: false });
    const idx3 = JSON.parse(fs.readFileSync(idxPath, "utf8"));
    const ar = idx3.events.find(
      (e: { type: string }) => e.type === "requirements-archived",
    );
    expect(ar).toBeDefined();
    expect(ar.payload.ids).toContain(id);
  }, 15_000);
  it("archive --dry-run does nothing", async () => {
    const root = await mkProj("arch1");
    await cmdArchive({ cwd: root, olderThanDays: 1, dryRun: true });
    expect(fs.existsSync(path.join(root, "docs/agent-memory/index.json"))).toBe(
      true,
    );
  });
  it("migrate-schema is idempotent", async () => {
    const root = await mkProj("migrate1");
    await cmdMigrateSchema({ cwd: root });
    await cmdMigrateSchema({ cwd: root }); // no-op the second time
  });
});

describe("autopilot dry-run", () => {
  it("advances a Draft through to Done in simulated mode", async () => {
    const root = await mkProj("ap1");
    const csv = path.join(root, "r.csv");
    fs.writeFileSync(csv, "title,description\nFoo,desc\n", "utf8");
    ingestFile(root, csv, "csv");
    const r = await runAutopilot(root, {
      requirementIds: "all",
      maxParallel: 1,
      budgetMinutes: 5,
      stopOnFail: false,
      dryRun: true,
    });
    expect(r.completed.length).toBe(1);
    expect(r.blocked.length).toBe(0);
    const idx = JSON.parse(
      fs.readFileSync(path.join(root, "docs/agent-memory/index.json"), "utf8"),
    );
    expect(idx.requirements.items[0].status).toBe("Done");
    expect(idx.events.length).toBeGreaterThan(0);
  }, 15_000);
});

describe("bootstrap lock", () => {
  it("blocks readiness until items are answered", async () => {
    const root = await mkProj("boot1");
    writeLock(root, defaultLock("ai"));
    expect(isReady(root)).toBe(false);
    const lk = readLock(root)!;
    for (const it of lk.items) it.answered = true;
    writeLock(root, lk);
    expect(isReady(root)).toBe(true);
  });
  it("force-unlock works", async () => {
    const root = await mkProj("boot2");
    writeLock(root, defaultLock("backend"));
    unlock(root, "manual");
    expect(isReady(root)).toBe(true);
  });
});

describe("brainstorm helpers", () => {
  it("renders a brief to markdown", () => {
    const md = briefToMarkdown({
      schemaVersion: "1.0",
      title: "Demo",
      problemStatement: "P",
      targetUsers: ["U"],
      personas: [{ name: "A", description: "B" }],
      jobsToBeDone: ["J"],
      successMetrics: [{ name: "m", target: "t" }],
      constraints: ["C"],
      nonFunctional: [{ name: "p95", budget: "<200ms" }],
      risks: [{ description: "R", severity: "low" }],
      mvpScope: ["X"],
      outOfScope: ["Y"],
      generatedAt: new Date().toISOString(),
    });
    expect(md).toContain("# Project Brief — Demo");
    expect(md).toContain("- p95 → <200ms");
  });
});

describe("requirement lock", () => {
  it("prevents concurrent acquire by different holders", async () => {
    const root = await mkProj("rlock1");
    const a = acquireRequirementLock(root, "R-0001", "alice");
    expect(a.ok).toBe(true);
    const b = acquireRequirementLock(root, "R-0001", "bob");
    expect(b.ok).toBe(false);
    expect(b.reason).toBe("held-by-other");
    const c = acquireRequirementLock(root, "R-0001", "bob", { force: true });
    expect(c.ok).toBe(true);
    expect(c.reason).toBe("stolen-forced");
    expect(readRequirementLock(root, "R-0001")?.holder).toBe("bob");
    expect(releaseRequirementLock(root, "R-0001", "bob")).toBe(true);
    expect(readRequirementLock(root, "R-0001")).toBeUndefined();
  });
});

describe("adopt-deep", () => {
  it("detects missing tooling and produces findings", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-adopt-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "x" }),
      "utf8",
    );
    const det = detectExisting(tmp);
    expect(det.hasCI.provider).toBeNull();
    const findings = audit(det);
    expect(findings.some((f) => f.area === "ci")).toBe(true);
    expect(findings.some((f) => f.area === "tests")).toBe(true);
  });
  it("safe-fix is idempotent and never overwrites", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-safefix-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "x" }),
      "utf8",
    );
    fs.writeFileSync(path.join(tmp, "README.md"), "# pre-existing", "utf8");
    const det = detectExisting(tmp);
    const r1 = applySafeFixes(tmp, det);
    expect(
      r1.some((x) => x.id === "codeowners" && x.status === "written"),
    ).toBe(true);
    expect(
      r1.some((x) => x.id === "readme" && x.status === "skipped-exists"),
    ).toBe(true);
    expect(fs.readFileSync(path.join(tmp, "README.md"), "utf8")).toBe(
      "# pre-existing",
    );
    // Second run = no new writes for things just created.
    const det2 = detectExisting(tmp);
    const r2 = applySafeFixes(tmp, det2);
    expect(r2.every((x) => x.status !== "written")).toBe(true);
  });
});

describe("agent-log collision suffix", () => {
  it("appends __2, __3 suffixes when files collide", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "am-log-"));
    const a = nextLogPath(dir, "2026-04-25", "R-0001", "plan");
    fs.writeFileSync(a, "x", "utf8");
    const b = nextLogPath(dir, "2026-04-25", "R-0001", "plan");
    fs.writeFileSync(b, "x", "utf8");
    const c = nextLogPath(dir, "2026-04-25", "R-0001", "plan");
    expect(a).toMatch(/2026-04-25__R-0001__plan\.md$/);
    expect(b).toMatch(/__2\.md$/);
    expect(c).toMatch(/__3\.md$/);
  });
});

describe("msrd", () => {
  it("renders a digest from index.json", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-msrd-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    const idx = {
      project: { name: "X" },
      generatedAt: "2026-04-26T00:00:00Z",
      requirements: {
        items: [
          {
            id: "R-0001",
            title: "alpha",
            status: "Done",
            priority: "P2",
            updatedAt: "2026-04-25",
          },
          {
            id: "R-0002",
            title: "beta",
            status: "Blocked",
            priority: "P0",
            updatedAt: "2026-04-26",
          },
          {
            id: "R-0003",
            title: "gamma",
            status: "Planned",
            priority: "P1",
            updatedAt: "2026-04-25",
          },
        ],
      },
    };
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify(idx),
      "utf8",
    );
    await cmdMsrd({ cwd: tmp, top: 5 });
    const out = fs.readFileSync(path.join(memDir, "msrd.md"), "utf8");
    expect(out).toContain("Most-Significant Requirements Digest");
    // P0 should come before P1/P2.
    const r2 = out.indexOf("R-0002");
    const r3 = out.indexOf("R-0003");
    const r1 = out.indexOf("R-0001");
    expect(r2).toBeGreaterThan(0);
    expect(r2).toBeLessThan(r3);
    expect(r3).toBeLessThan(r1);
    expect(out).toContain("## Blocked (1)");
  });
});

describe("graph", () => {
  it("renders a Mermaid graph with status classes and dependency edges", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-graph-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    const idx = {
      project: { name: "GraphProj" },
      requirements: {
        items: [
          { id: "R-0001", title: "core", status: "Done" },
          {
            id: "R-0002",
            title: "follow-up",
            status: "Planned",
            links: { dependsOn: ["R-0001"] },
          },
          {
            id: "R-0003",
            title: "blocker",
            status: "Blocked",
            links: { blocks: ["R-0002"] },
          },
        ],
      },
      decisions: {
        items: [{ id: "ADR-0001", title: "Use SQLite", status: "Accepted" }],
      },
    };
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify(idx),
      "utf8",
    );

    const body = await cmdGraph({
      cwd: tmp,
      format: "mermaid",
      out: "docs/agent-memory/graph.md",
      includeAdrs: true,
    });
    expect(body).toContain("flowchart LR");
    expect(body).toContain("R-0001");
    expect(body).toContain("R-0002 --> R-0001");
    expect(body).toContain("R-0003 -. blocks .-> R-0002");
    expect(body).toContain("ADR-0001");
    expect(body).toContain(":::done");
    expect(body).toContain(":::blocked");
    const written = fs.readFileSync(path.join(memDir, "graph.md"), "utf8");
    expect(written).toBe(body);
  });

  it("renders DOT format when requested", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-graph-dot-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({
        requirements: { items: [{ id: "R-0001", title: "x", status: "Done" }] },
      }),
      "utf8",
    );
    const body = await cmdGraph({
      cwd: tmp,
      format: "dot",
      out: "docs/agent-memory/graph.dot",
    });
    expect(body).toContain("digraph G {");
    expect(body).toContain('"R-0001"');
    expect(body).toContain('rankdir="LR"');
  });
});

describe("context-pack", () => {
  it("bundles canonical memory + requirements + ADRs into JSONL with sha256 pins", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-pack-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    const reqDir = path.join(memDir, "02-requirements", "R-0001");
    const decDir = path.join(memDir, "06-decisions");
    fs.mkdirSync(reqDir, { recursive: true });
    fs.mkdirSync(decDir, { recursive: true });

    fs.writeFileSync(
      path.join(memDir, "00-project-context.md"),
      "# project context\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "07-quality-gates.md"),
      "# gates\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(reqDir, "requirement.md"),
      "# R-0001 — alpha\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(reqDir, "acceptance-criteria.md"),
      "# AC\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(decDir, "ADR-0001-use-sqlite.md"),
      "# ADR-0001\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({
        project: { name: "Pack" },
        requirements: {
          items: [{ id: "R-0001", title: "alpha", status: "Draft" }],
        },
      }),
      "utf8",
    );

    const { records, out } = await cmdContextPack({
      cwd: tmp,
      out: "docs/agent-memory/ctx.jsonl",
    });
    expect(out).toBeTruthy();
    expect(fs.existsSync(out!)).toBe(true);
    const body = fs.readFileSync(out!, "utf8");
    const lines = body
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines[0].kind).toBe("context-pack-header");
    expect(lines[0].counts.memory).toBeGreaterThan(0);
    expect(lines[0].counts.requirements).toBe(2); // requirement.md + acceptance-criteria.md
    expect(lines[0].counts.adrs).toBe(1);
    const adr = records.find((r) => r.kind === "adr");
    expect(adr).toBeTruthy();
    expect(adr!.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(adr!.body).toContain("ADR-0001");
  });

  it("respects --requirement filter and --exclude-bodies", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-pack2-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(path.join(memDir, "02-requirements", "R-0001"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(memDir, "02-requirements", "R-0002"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(memDir, "02-requirements", "R-0001", "requirement.md"),
      "alpha\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "02-requirements", "R-0002", "requirement.md"),
      "beta\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({
        requirements: {
          items: [
            { id: "R-0001", title: "a", status: "Draft" },
            { id: "R-0002", title: "b", status: "Draft" },
          ],
        },
      }),
      "utf8",
    );
    const { records } = await cmdContextPack({
      cwd: tmp,
      out: "docs/agent-memory/ctx2.jsonl",
      requirements: ["R-0002"],
      excludeBodies: true,
    });
    const reqRecs = records.filter((r) => r.kind === "requirement");
    expect(reqRecs).toHaveLength(1);
    expect(reqRecs[0]!.path).toContain("R-0002");
    expect(reqRecs[0]!.body).toBeUndefined();
    expect(reqRecs[0]!.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("verify-pack", () => {
  const seedProject = (): string => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-verify-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(path.join(memDir, "02-requirements", "R-0001"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(memDir, "06-decisions"), { recursive: true });
    fs.writeFileSync(
      path.join(memDir, "00-project-context.md"),
      "# ctx\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "02-requirements", "R-0001", "requirement.md"),
      "alpha\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "06-decisions", "ADR-0001-x.md"),
      "# ADR\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({
        requirements: {
          items: [{ id: "R-0001", title: "alpha", status: "Draft" }],
        },
      }),
      "utf8",
    );
    return tmp;
  };

  it("passes when nothing has drifted", async () => {
    const tmp = seedProject();
    await cmdContextPack({ cwd: tmp, out: "docs/agent-memory/pack.jsonl" });
    const exitWas = process.exitCode;
    process.exitCode = 0;
    const report = await cmdVerifyPack({
      cwd: tmp,
      pack: "docs/agent-memory/pack.jsonl",
    });
    expect(report.totals.changed).toBe(0);
    expect(report.totals.removed).toBe(0);
    expect(process.exitCode).toBe(0);
    process.exitCode = exitWas;
  });

  it("flags changed/removed/added paths", async () => {
    const tmp = seedProject();
    await cmdContextPack({ cwd: tmp, out: "docs/agent-memory/pack.jsonl" });

    // mutate one file (changed), delete another (removed), add one (added)
    fs.writeFileSync(
      path.join(tmp, "docs", "agent-memory", "00-project-context.md"),
      "# changed\n",
      "utf8",
    );
    fs.unlinkSync(
      path.join(tmp, "docs", "agent-memory", "06-decisions", "ADR-0001-x.md"),
    );
    fs.writeFileSync(
      path.join(
        tmp,
        "docs",
        "agent-memory",
        "02-requirements",
        "R-0001",
        "acceptance-criteria.md",
      ),
      "# AC\n",
      "utf8",
    );

    const exitWas = process.exitCode;
    process.exitCode = 0;
    const report = await cmdVerifyPack({
      cwd: tmp,
      pack: "docs/agent-memory/pack.jsonl",
    });
    expect(report.totals.changed).toBe(1);
    expect(report.totals.removed).toBe(1);
    expect(report.totals.added).toBe(1);
    expect(report.changed[0]!.path).toContain("00-project-context.md");
    expect(report.removed[0]).toContain("ADR-0001-x.md");
    expect(report.added[0]).toContain("acceptance-criteria.md");
    expect(process.exitCode).toBe(1);
    process.exitCode = exitWas;
  });
});

describe("changelog", () => {
  const seedRoot = (): string => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-cl-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    const now = Date.now();
    const recent = new Date(now - 2 * 86_400_000).toISOString();
    const stale = new Date(now - 90 * 86_400_000).toISOString();
    const idx = {
      project: { name: "demo" },
      requirements: {
        items: [
          {
            id: "R-0001",
            title: "Recent done",
            status: "Done",
            doneAt: recent,
            tags: ["api"],
          },
          {
            id: "R-0002",
            title: "Old done",
            status: "Done",
            doneAt: stale,
            tags: ["api"],
          },
          {
            id: "R-0003",
            title: "Evaluated recent",
            status: "Evaluated",
            updatedAt: recent,
            tags: ["ui"],
          },
          {
            id: "R-0004",
            title: "In progress",
            status: "Implemented",
            updatedAt: recent,
          },
        ],
      },
      decisions: {
        items: [
          { id: "ADR-0001", title: "Use sqlite", status: "Accepted" },
          { id: "ADR-0002", title: "Rejected idea", status: "Rejected" },
        ],
      },
      events: [
        { type: "status-change", at: recent, payload: { id: "R-0001" } },
        { type: "requirement-created", at: recent, payload: { id: "R-0004" } },
        { type: "status-change", at: stale, payload: { id: "R-0002" } },
      ],
    };
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify(idx, null, 2),
      "utf8",
    );
    return tmp;
  };

  it("renders an MD changelog with completed Done items, ADRs, and events", async () => {
    const tmp = seedRoot();
    const out = "docs/agent-memory/CHANGELOG.md";
    const body = await cmdChangelog({ cwd: tmp, windowDays: 30, out });
    expect(body).toContain("# Changelog — demo");
    expect(body).toContain("## Completed requirements (2)");
    expect(body).toContain("R-0001");
    expect(body).toContain("R-0003");
    expect(body).not.toContain("R-0002");
    expect(body).not.toContain("R-0004");
    expect(body).toContain("## ADRs accepted (1)");
    expect(body).toContain("ADR-0001");
    expect(body).not.toContain("ADR-0002");
    expect(body).toContain("## Events (2)");
    expect(body).toContain("| status-change | 1 |");
    expect(body).toContain("| requirement-created | 1 |");
    const written = fs.readFileSync(path.join(tmp, out), "utf8");
    expect(written).toContain("# Changelog — demo");
  });

  it("emits JSON when format=json", async () => {
    const tmp = seedRoot();
    const out = "docs/agent-memory/changelog.json";
    const body = await cmdChangelog({
      cwd: tmp,
      windowDays: 30,
      format: "json",
      out,
    });
    const parsed = JSON.parse(body) as {
      project: string;
      windowDays: number;
      completed: Array<{ id: string }>;
      adrs: Array<{ id: string }>;
      events: Array<{ type: string }>;
    };
    expect(parsed.project).toBe("demo");
    expect(parsed.windowDays).toBe(30);
    expect(parsed.completed.map((r) => r.id).sort()).toEqual([
      "R-0001",
      "R-0003",
    ]);
    expect(parsed.adrs.map((a) => a.id)).toEqual(["ADR-0001"]);
    expect(parsed.events).toHaveLength(2);
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, out), "utf8"));
    expect(onDisk.project).toBe("demo");
  });
});

describe("release-notes", () => {
  const seedRoot = (): string => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-rn-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    const t1 = new Date("2026-01-15T00:00:00Z").toISOString(); // in range
    const t2 = new Date("2026-03-15T00:00:00Z").toISOString(); // in range
    const tEarly = new Date("2025-12-01T00:00:00Z").toISOString(); // pre-range
    const tLate = new Date("2026-06-01T00:00:00Z").toISOString(); // post-range
    const idx = {
      project: { name: "demo" },
      requirements: {
        items: [
          {
            id: "R-0001",
            title: "In range A",
            status: "Done",
            doneAt: t1,
            tags: ["api"],
          },
          {
            id: "R-0002",
            title: "In range B",
            status: "Evaluated",
            updatedAt: t2,
          },
          { id: "R-0003", title: "Pre-range", status: "Done", doneAt: tEarly },
          { id: "R-0004", title: "Post-range", status: "Done", doneAt: tLate },
        ],
      },
      decisions: {
        items: [
          { id: "ADR-0001", title: "Pick sqlite", status: "Accepted" },
          { id: "ADR-0002", title: "Rejected", status: "Rejected" },
        ],
      },
      events: [
        { type: "status-change", at: t1, payload: { id: "R-0001" } },
        { type: "requirement-created", at: t2, payload: { id: "R-0002" } },
        { type: "status-change", at: tEarly, payload: { id: "R-0003" } },
      ],
    };
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify(idx, null, 2),
      "utf8",
    );
    return tmp;
  };

  it("renders MD release notes for an ISO --since/--until range", async () => {
    const tmp = seedRoot();
    const body = await cmdReleaseNotes({
      cwd: tmp,
      since: "2026-01-01T00:00:00Z",
      until: "2026-04-01T00:00:00Z",
      version: "v1.0.0",
    });
    expect(body).toContain("# Release Notes — demo `v1.0.0`");
    expect(body).toContain("## Completed (2)");
    expect(body).toContain("R-0001");
    expect(body).toContain("R-0002");
    expect(body).not.toContain("R-0003");
    expect(body).not.toContain("R-0004");
    expect(body).toContain("ADR-0001");
    expect(body).not.toContain("ADR-0002");
    expect(body).toContain("| status-change | 1 |");
    expect(body).toContain("| requirement-created | 1 |");
  });

  it("emits JSON when format=json", async () => {
    const tmp = seedRoot();
    const body = await cmdReleaseNotes({
      cwd: tmp,
      since: "2026-01-01T00:00:00Z",
      until: "2026-04-01T00:00:00Z",
      version: "v1.0.0",
      format: "json",
    });
    const parsed = JSON.parse(body) as {
      version: string;
      since: { ref: string; at: string };
      until: { ref: string | null; at: string };
      completed: Array<{ id: string }>;
      adrs: Array<{ id: string }>;
    };
    expect(parsed.version).toBe("v1.0.0");
    expect(parsed.since.at).toBe("2026-01-01T00:00:00.000Z");
    expect(parsed.until.at).toBe("2026-04-01T00:00:00.000Z");
    expect(parsed.completed.map((r) => r.id).sort()).toEqual([
      "R-0001",
      "R-0002",
    ]);
    expect(parsed.adrs.map((a) => a.id)).toEqual(["ADR-0001"]);
  });

  it("rejects unresolvable refs", async () => {
    const tmp = seedRoot();
    await expect(
      cmdReleaseNotes({ cwd: tmp, since: "not-a-tag-or-iso-xyz" }),
    ).rejects.toBeDefined();
  });
});

describe("attest-pack + verify-attest", () => {
  const seedPack = (): { tmp: string; pack: string } => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-attest-"));
    const pack = path.join(tmp, "pack.jsonl");
    fs.writeFileSync(
      pack,
      '{"kind":"memory","path":"x","sha256":"abc"}\n',
      "utf8",
    );
    return { tmp, pack };
  };

  it("attests then verifies a pack with the same env key", async () => {
    const { tmp, pack } = seedPack();
    const prevKey = process.env.AGENT_MEM_ATTEST_KEY;
    process.env.AGENT_MEM_ATTEST_KEY = "test-secret-key-1234567890";
    try {
      const att = await cmdAttestPack({ cwd: tmp, pack: "pack.jsonl" });
      expect(att.alg).toBe("HMAC-SHA256");
      expect(att.signature).toMatch(/^[a-f0-9]{64}$/);
      expect(att.packSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(fs.existsSync(pack + ".attest.json")).toBe(true);
      const r = await cmdVerifyAttest({ cwd: tmp, pack: "pack.jsonl" });
      expect(r.ok).toBe(true);
      expect(r.reasons).toEqual([]);
    } finally {
      if (prevKey === undefined) delete process.env.AGENT_MEM_ATTEST_KEY;
      else process.env.AGENT_MEM_ATTEST_KEY = prevKey;
    }
  });

  it("flags pack-sha-mismatch and signature-mismatch on tamper", async () => {
    const { tmp, pack } = seedPack();
    const prevKey = process.env.AGENT_MEM_ATTEST_KEY;
    process.env.AGENT_MEM_ATTEST_KEY = "tamper-key-aaaaaaaaaaaa";
    try {
      await cmdAttestPack({ cwd: tmp, pack: "pack.jsonl" });
      // tamper the pack
      fs.appendFileSync(pack, '{"kind":"memory","path":"y","sha256":"def"}\n');
      const exitWas = process.exitCode;
      const r = await cmdVerifyAttest({
        cwd: tmp,
        pack: "pack.jsonl",
        json: true,
      });
      expect(r.ok).toBe(false);
      expect(r.reasons).toContain("pack-sha-mismatch");
      expect(r.reasons).toContain("signature-mismatch");
      expect(process.exitCode).toBe(1);
      process.exitCode = exitWas;
    } finally {
      if (prevKey === undefined) delete process.env.AGENT_MEM_ATTEST_KEY;
      else process.env.AGENT_MEM_ATTEST_KEY = prevKey;
    }
  });

  it("flags key-id-mismatch when verifying with a different key", async () => {
    const { tmp } = seedPack();
    const prevKey = process.env.AGENT_MEM_ATTEST_KEY;
    process.env.AGENT_MEM_ATTEST_KEY = "signing-key-xxxxxxxxxxxxx";
    try {
      await cmdAttestPack({ cwd: tmp, pack: "pack.jsonl" });
      process.env.AGENT_MEM_ATTEST_KEY = "wrong-key-yyyyyyyyyyyyyyyy";
      const exitWas = process.exitCode;
      const r = await cmdVerifyAttest({
        cwd: tmp,
        pack: "pack.jsonl",
        json: true,
      });
      expect(r.ok).toBe(false);
      expect(r.reasons).toContain("key-id-mismatch");
      expect(r.reasons).toContain("signature-mismatch");
      expect(process.exitCode).toBe(1);
      process.exitCode = exitWas;
    } finally {
      if (prevKey === undefined) delete process.env.AGENT_MEM_ATTEST_KEY;
      else process.env.AGENT_MEM_ATTEST_KEY = prevKey;
    }
  });

  it("supports --key-file as an alternative to env", async () => {
    const { tmp } = seedPack();
    const keyPath = path.join(tmp, "secret.key");
    fs.writeFileSync(keyPath, "filesystem-key-zzzzzzzzzzz", "utf8");
    const prevKey = process.env.AGENT_MEM_ATTEST_KEY;
    delete process.env.AGENT_MEM_ATTEST_KEY;
    try {
      await cmdAttestPack({
        cwd: tmp,
        pack: "pack.jsonl",
        keyFile: "secret.key",
      });
      const r = await cmdVerifyAttest({
        cwd: tmp,
        pack: "pack.jsonl",
        keyFile: "secret.key",
      });
      expect(r.ok).toBe(true);
    } finally {
      if (prevKey !== undefined) process.env.AGENT_MEM_ATTEST_KEY = prevKey;
    }
  });
});

describe("sbom-check", () => {
  it("passes for allowed licenses, fails for denied", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-sbom-"));
    const policy = `allow: [MIT, Apache-2.0]\ndeny: [GPL-3.0-only]\nexemptions: []\n`;
    const policyPath = path.join(tmp, "policy.yml");
    fs.writeFileSync(policyPath, policy, "utf8");
    const okBom = {
      components: [
        {
          name: "a",
          version: "1",
          purl: "pkg:npm/a@1",
          licenses: [{ license: { id: "MIT" } }],
        },
        {
          name: "b",
          version: "2",
          purl: "pkg:npm/b@2",
          licenses: [{ license: { id: "Apache-2.0" } }],
        },
      ],
    };
    const okPath = path.join(tmp, "ok.cdx.json");
    fs.writeFileSync(okPath, JSON.stringify(okBom), "utf8");
    await expect(
      cmdSbomCheck({ cwd: tmp, sbom: okPath, policy: policyPath, json: true }),
    ).resolves.toBeUndefined();

    const badBom = {
      components: [
        {
          name: "c",
          version: "3",
          purl: "pkg:npm/c@3",
          licenses: [{ license: { id: "GPL-3.0-only" } }],
        },
      ],
    };
    const badPath = path.join(tmp, "bad.cdx.json");
    fs.writeFileSync(badPath, JSON.stringify(badBom), "utf8");
    let exitCode: number | undefined;
    const realExit = process.exit;
    // @ts-expect-error mock
    process.exit = (c?: number) => {
      exitCode = c;
      throw new Error("__exit__");
    };
    try {
      await cmdSbomCheck({
        cwd: tmp,
        sbom: badPath,
        policy: policyPath,
        json: true,
      });
    } catch (e) {
      expect((e as Error).message).toBe("__exit__");
    } finally {
      process.exit = realExit;
    }
    expect(exitCode).toBe(1);
  });
});

describe("threat-coverage", () => {
  it("renders matrix and reports missing kinds", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-tc-"));
    const tmDir = path.join(tmp, "docs", "agent-memory", "14-threat-models");
    fs.mkdirSync(tmDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmDir, "web.md"),
      `# Web threat model\n\n## STRIDE\nSpoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of privilege.\n\n## LINDDUN\nLinkability and identifiability considerations.\n\n## Mitigations\n...\n`,
      "utf8",
    );
    await cmdThreatCoverage({ cwd: tmp });
    const out = fs.readFileSync(path.join(tmDir, "coverage.md"), "utf8");
    expect(out).toContain("Threat-model coverage matrix");
    expect(out).toContain("`web`");
    expect(out).toContain("_missing_");
  });
});

describe("pm-detect", () => {
  it("detects bun lockfile", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-pm-"));
    fs.writeFileSync(path.join(tmp, "bun.lockb"), "");
    const d = detectPm(tmp);
    expect(d.pm).toBe("bun");
    expect(ciInstallCmd("bun")).toContain("bun install");
    expect(runScriptCmd("bun", "test")).toBe("bun run test");
  });
  it("detects pnpm lockfile", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-pm-"));
    fs.writeFileSync(path.join(tmp, "pnpm-lock.yaml"), "");
    expect(detectPm(tmp).pm).toBe("pnpm");
  });
  it("falls back to npm without signals", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-pm-"));
    expect(detectPm(tmp).pm).toBe("npm");
  });
  it("respects packageManager field", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-pm-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ packageManager: "pnpm@9" }),
    );
    expect(detectPm(tmp).pm).toBe("pnpm");
  });
});

describe("adr new", () => {
  it("scaffolds ADR-0001 then ADR-0002 with auto-numbering", async () => {
    const root = await mkProj("adr1");
    const f1 = await cmdAdrNew({ cwd: root, title: "Use JSON Lines logs" });
    expect(fs.existsSync(f1)).toBe(true);
    expect(path.basename(f1)).toMatch(/^ADR-0001-use-json-lines-logs\.md$/);
    const body1 = fs.readFileSync(f1, "utf8");
    expect(body1).toContain("ADR-0001");
    expect(body1).toContain("Use JSON Lines logs");

    const f2 = await cmdAdrNew({
      cwd: root,
      title: "Adopt pnpm",
      status: "Accepted",
      requirement: "R-0042",
    });
    expect(path.basename(f2)).toMatch(/^ADR-0002-adopt-pnpm\.md$/);
    const body2 = fs.readFileSync(f2, "utf8");
    expect(body2).toMatch(/Status:\s*Accepted/i);
    expect(body2).toContain("R-0042");
  });
});

describe("dora-export", () => {
  it("computes framework metrics in-memory", () => {
    const now = Date.parse("2026-04-26T12:00:00Z");
    const dayMs = 24 * 60 * 60 * 1000;
    const idx = {
      requirements: {
        items: [
          {
            id: "R-0001",
            status: "Done",
            doneAt: new Date(now - 2 * dayMs).toISOString(),
            evaluation: { firstTryPass: true },
          },
          {
            id: "R-0002",
            status: "Done",
            doneAt: new Date(now - 40 * dayMs).toISOString(),
            evaluation: { firstTryPass: false, fixLoopIterations: 2 },
          },
          {
            id: "R-0003",
            status: "Implemented",
            evaluation: { firstTryPass: true, fixLoopIterations: 0 },
          },
          { id: "R-0004", status: "Draft" },
        ],
      },
      events: [
        { type: "status-change", at: new Date(now - 1 * dayMs).toISOString() },
        {
          type: "status-change",
          at: new Date(now - 100 * dayMs).toISOString(),
        },
      ],
    };
    const r = computeDoraReport(idx, 30, now);
    expect(r.totals.requirements).toBe(4);
    expect(r.totals.byStatus.Done).toBe(2);
    expect(r.framework.throughputDoneInWindow).toBe(1);
    // 2 evaluated, 1 first-try pass and 1 not, but R-0003 is true; so 2/3 = 0.6667
    expect(r.framework.firstTryPassRate).toBeGreaterThan(0.66);
    expect(r.framework.averageFixLoopIterations).toBe(1);
    expect(r.framework.statusTransitionsInWindow).toBe(1);
  });

  it("writes dora.json under metrics/", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-dora-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({
        requirements: {
          items: [
            { id: "R-0001", status: "Done", doneAt: new Date().toISOString() },
            { id: "R-0002", status: "Draft" },
          ],
        },
      }),
      "utf8",
    );
    const out = await cmdDoraExport({ cwd: tmp, windowDays: 7, json: true });
    const written = path.join(memDir, "metrics", "dora.json");
    expect(fs.existsSync(written)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(written, "utf8"));
    expect(parsed.windowDays).toBe(7);
    expect(parsed.totals.requirements).toBe(2);
    expect(out.windowDays).toBe(7);
  });
});

describe("audit", () => {
  it("flags missing memory files and unresolved KIs", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-audit-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({
        requirements: {
          items: [
            { id: "R-0001", status: "Done" }, // missing AC + traceability + evaluation
          ],
        },
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(memDir, "known-issues.md"),
      "## KI-0001 — open thing\nbody\n\n## KI-0002 — closed *(RESOLVED)*\nbody\n",
      "utf8",
    );
    const r = computeAuditReport(memDir);
    expect(r.totals.requirements).toBe(1);
    expect(r.totals.knownIssuesOpen).toBe(1);
    expect(r.findings.some((f) => f.id === "MISSING_AC_R-0001")).toBe(true);
    expect(r.findings.some((f) => f.id === "DONE_NO_EVAL_R-0001")).toBe(true);
    expect(
      r.findings.some((f) => f.id === "MEMORY_MISSING_07-quality-gates.md"),
    ).toBe(true);
  });

  it("writes a dated audit report file", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-audit2-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({ requirements: { items: [] } }),
      "utf8",
    );
    const r = await cmdAudit({ cwd: tmp });
    expect(r.totals.requirements).toBe(0);
    const auditDir = path.join(memDir, "09-audits");
    expect(fs.existsSync(auditDir)).toBe(true);
    const written = fs
      .readdirSync(auditDir)
      .filter((f) => f.endsWith("__audit.md"));
    expect(written.length).toBe(1);
    const body = fs.readFileSync(path.join(auditDir, written[0]!), "utf8");
    expect(body).toContain("# Audit");
    expect(body).toContain("Findings");
  });

  it("--fix creates skeleton AC + traceability for requirements missing them", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-audit-fix-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(path.join(memDir, "02-requirements", "R-0001"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(memDir, "index.json"),
      JSON.stringify({
        requirements: { items: [{ id: "R-0001", status: "Draft" }] },
      }),
      "utf8",
    );
    const before = computeAuditReport(memDir);
    expect(before.findings.some((f) => f.id === "MISSING_AC_R-0001")).toBe(
      true,
    );
    await cmdAudit({ cwd: tmp, fix: true });
    expect(
      fs.existsSync(
        path.join(
          memDir,
          "02-requirements",
          "R-0001",
          "acceptance-criteria.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(memDir, "02-requirements", "R-0001", "traceability.md"),
      ),
    ).toBe(true);
    const after = computeAuditReport(memDir);
    expect(after.findings.some((f) => f.id === "MISSING_AC_R-0001")).toBe(
      false,
    );
  });
});

describe("ki", () => {
  it("parses entries with state and adds + resolves", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "am-ki-"));
    const memDir = path.join(tmp, "docs", "agent-memory");
    fs.mkdirSync(memDir, { recursive: true });
    const a = await cmdKiAdd({
      cwd: tmp,
      title: "First issue",
      severity: "medium",
      scope: "cli",
      repro: "run x",
    });
    expect(a.id).toBe("KI-0001");
    const b = await cmdKiAdd({ cwd: tmp, title: "Second issue" });
    expect(b.id).toBe("KI-0002");
    const list1 = await cmdKiList({ cwd: tmp, state: "OPEN" });
    expect(list1.length).toBe(2);
    await cmdKiResolve({ cwd: tmp, id: "KI-0001", note: "fixed in pass-9" });
    const list2 = await cmdKiList({ cwd: tmp, state: "OPEN" });
    expect(list2.length).toBe(1);
    expect(list2[0]!.id).toBe("KI-0002");
    const all = parseKi(
      fs.readFileSync(path.join(memDir, "known-issues.md"), "utf8"),
    );
    expect(all.find((e) => e.id === "KI-0001")!.state).toBe("RESOLVED");
  });
});
