#!/usr/bin/env node
/**
 * ai-sdlc MCP server (skeleton).
 *
 * Exposes tools over stdio so any MCP-compatible client
 * (Claude Desktop, Continue, etc.) can query the agent-memory of a
 * project without invoking the CLI. Mutating tools are gated behind
 * `--writable`; without that flag the server is strictly read-only.
 *
 * Tools (read-only by default):
 *   - `am.status`               → JSON status of index.json
 *   - `am.get_requirement`      → full requirement folder bundle
 *   - `am.list_decisions`       → ADR index
 *   - `am.list_quality_gates`   → per-kind gate file
 *   - `am.list_compliance`      → compliance YAMLs in scope
 *
 * Pass `--writable` to additionally expose mutating tools:
 *   - `am.create_requirement`, `am.update_status`, `am.append_event`, `am.ki_add`
 *
 * Run: `ai-sdlc-mcp [--cwd <repo>] [--writable]`
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

const cwdArgIdx = process.argv.indexOf("--cwd");
const repoRoot =
  cwdArgIdx >= 0 ? path.resolve(process.argv[cwdArgIdx + 1]!) : process.cwd();
const writable = process.argv.includes("--writable");

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");
const readJson = <T>(p: string): T =>
  JSON.parse(stripBom(fs.readFileSync(p, "utf8"))) as T;
const writeJson = (p: string, v: unknown) =>
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n", "utf8");
const nextRequirementId = (items: { id: string }[]): string => {
  let max = 0;
  for (const it of items) {
    const n = Number.parseInt((it.id ?? "").replace(/^R-/, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `R-${String(max + 1).padStart(4, "0")}`;
};

const listTools = () => ({
  tools: [
    {
      name: "am.status",
      description: "Return the agent-memory index.json contents.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "am.list_requirements",
      description: "List all requirements with id, title, status, owner.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Optional status filter (Draft, Planned, ...).",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "am.get_requirement",
      description:
        "Return the bundle of files for a single R-XXXX requirement.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", pattern: "^R-\\d{4}$" } },
        additionalProperties: false,
      },
    },
    {
      name: "am.search",
      description:
        "Case-insensitive substring search across requirement titles and descriptions.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: { query: { type: "string", minLength: 1 } },
        additionalProperties: false,
      },
    },
    {
      name: "am.list_decisions",
      description: "List ADRs (id, title, status).",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "am.list_quality_gates",
      description: "Return the quality-gates file for the project's kind.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "am.list_compliance",
      description: "List compliance YAMLs in scope and return their contents.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "am.list_threat_models",
      description: "Return all threat-model overlays (one .md per kind).",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "am.known_issues",
      description: "Return the parsed known-issues ledger.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "am.dora_metrics",
      description:
        "Compute DORA + framework metrics from index.json over a window.",
      inputSchema: {
        type: "object",
        properties: {
          windowDays: {
            type: "integer",
            minimum: 1,
            maximum: 365,
            default: 30,
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "am.read_memory_file",
      description:
        "Read any file under docs/agent-memory/ by relative path (read-only, path-confined).",
      inputSchema: {
        type: "object",
        required: ["path"],
        properties: { path: { type: "string", minLength: 1 } },
        additionalProperties: false,
      },
    },
    {
      name: "am.context_pack",
      description:
        "Compute a deterministic JSONL context-pack manifest (memory + requirements + ADRs) with sha256 pins.",
      inputSchema: {
        type: "object",
        properties: {
          requirements: {
            type: "array",
            items: { type: "string", pattern: "^R-\\d{4}$" },
          },
          excludeBodies: { type: "boolean", default: false },
        },
        additionalProperties: false,
      },
    },
    {
      name: "am.graph",
      description:
        "Render a Mermaid (or DOT) dependency graph string for all requirements.",
      inputSchema: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["mermaid", "dot"],
            default: "mermaid",
          },
          includeAdrs: { type: "boolean", default: false },
        },
        additionalProperties: false,
      },
    },
    {
      name: "am.changelog",
      description:
        "Render a changelog (MD or JSON) of completed requirements, accepted ADRs, and events in a window.",
      inputSchema: {
        type: "object",
        properties: {
          windowDays: { type: "integer", minimum: 1, default: 30 },
          groupBy: {
            type: "string",
            enum: ["status", "tag", "none"],
            default: "status",
          },
          format: { type: "string", enum: ["md", "json"], default: "md" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "am.release_notes",
      description:
        "Render release notes between two ISO dates (inclusive). Tag resolution is CLI-only.",
      inputSchema: {
        type: "object",
        required: ["since"],
        properties: {
          since: {
            type: "string",
            description: "ISO datetime (start of range).",
          },
          until: {
            type: "string",
            description: "ISO datetime (end of range, default now).",
          },
          version: { type: "string" },
          format: { type: "string", enum: ["md", "json"], default: "md" },
        },
        additionalProperties: false,
      },
    },
    ...(writable
      ? [
          {
            name: "am.create_requirement",
            description:
              "Create a new R-XXXX requirement entry in index.json and seed its folder with a requirement.md skeleton.",
            inputSchema: {
              type: "object",
              required: ["title"],
              properties: {
                id: { type: "string", pattern: "^R-\\d{4}$" },
                title: { type: "string", minLength: 1 },
                status: { type: "string", default: "Draft" },
              },
              additionalProperties: false,
            },
          },
          {
            name: "am.update_status",
            description:
              "Update an existing requirement's status and append a status-change event.",
            inputSchema: {
              type: "object",
              required: ["id", "status"],
              properties: {
                id: { type: "string", pattern: "^R-\\d{4}$" },
                status: { type: "string", minLength: 1 },
              },
              additionalProperties: false,
            },
          },
          {
            name: "am.append_event",
            description:
              "Append an event to index.json events[] (type, at, payload).",
            inputSchema: {
              type: "object",
              required: ["type"],
              properties: {
                type: { type: "string", minLength: 1 },
                at: { type: "string" },
                payload: { type: "object" },
              },
              additionalProperties: false,
            },
          },
          {
            name: "am.ki_add",
            description:
              "Add a new known-issues entry; returns the assigned KI-XXXX id.",
            inputSchema: {
              type: "object",
              required: ["title"],
              properties: {
                title: { type: "string", minLength: 1 },
                severity: { type: "string", enum: ["low", "medium", "high"] },
                scope: { type: "string" },
                repro: { type: "string" },
              },
              additionalProperties: false,
            },
          },
          {
            name: "am.create_adr",
            description:
              "Create a new ADR-#### file under 06-decisions/ and return its path.",
            inputSchema: {
              type: "object",
              required: ["title"],
              properties: {
                title: { type: "string", minLength: 1 },
                status: {
                  type: "string",
                  enum: ["Proposed", "Accepted", "Deprecated", "Superseded"],
                },
                requirement: { type: "string", pattern: "^R-\\d{4}$" },
              },
              additionalProperties: false,
            },
          },
        ]
      : []),
  ],
});

interface IndexItem {
  id: string;
  title: string;
  status: string;
  owner?: { individual?: string; team?: string };
  doneAt?: string;
  updatedAt?: string;
  evaluation?: { firstTryPass?: boolean; fixLoopIterations?: number };
}
interface IndexShape {
  requirements?: { items?: IndexItem[] };
  events?: Array<{ type: string; at: string }>;
}

const withinDays = (
  iso: string | undefined,
  days: number,
  nowMs: number,
): boolean => {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return nowMs - t <= days * 24 * 60 * 60 * 1000;
};

const callTool = (
  name: string,
  args: Record<string, unknown> = {},
): unknown => {
  const memDir = path.join(repoRoot, "docs", "agent-memory");
  switch (name) {
    case "am.status":
      return readJson(path.join(memDir, "index.json"));
    case "am.list_requirements": {
      const idx = readJson<IndexShape>(path.join(memDir, "index.json"));
      const items = idx.requirements?.items ?? [];
      const status = typeof args.status === "string" ? args.status : undefined;
      return items
        .filter((r) => (status ? r.status === status : true))
        .map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          owner: r.owner,
        }));
    }
    case "am.search": {
      const q = String(args.query ?? "").toLowerCase();
      if (!q) return [];
      const idx = readJson<IndexShape>(path.join(memDir, "index.json"));
      const out: Array<{
        id: string;
        title: string;
        match: "title" | "description";
      }> = [];
      for (const r of idx.requirements?.items ?? []) {
        if (r.title.toLowerCase().includes(q)) {
          out.push({ id: r.id, title: r.title, match: "title" });
          continue;
        }
        const reqMd = path.join(
          memDir,
          "02-requirements",
          r.id,
          "requirement.md",
        );
        if (fs.existsSync(reqMd)) {
          const body = stripBom(fs.readFileSync(reqMd, "utf8")).toLowerCase();
          if (body.includes(q))
            out.push({ id: r.id, title: r.title, match: "description" });
        }
      }
      return out;
    }
    case "am.get_requirement": {
      const id = String(args.id ?? "");
      const dir = path.join(memDir, "02-requirements", id);
      if (!fs.existsSync(dir)) throw new Error(`requirement ${id} not found`);
      const out: Record<string, string> = {};
      for (const f of fs.readdirSync(dir)) {
        const abs = path.join(dir, f);
        if (fs.statSync(abs).isFile())
          out[f] = stripBom(fs.readFileSync(abs, "utf8"));
      }
      return out;
    }
    case "am.list_decisions": {
      const dir = path.join(memDir, "06-decisions");
      if (!fs.existsSync(dir)) return [];
      return fs
        .readdirSync(dir)
        .filter((f) => f.startsWith("ADR-") && f.endsWith(".md"))
        .map((f) => {
          const body = stripBom(fs.readFileSync(path.join(dir, f), "utf8"));
          const titleMatch = body.match(/^#\s+(.+)$/m);
          const statusMatch = body.match(/Status:\s*(.+)$/m);
          return {
            id: f.replace(/\.md$/, ""),
            title: titleMatch?.[1] ?? f,
            status: statusMatch?.[1]?.trim() ?? "unknown",
          };
        });
    }
    case "am.list_quality_gates": {
      const cfg = readJson<{ project?: { kind?: string } }>(
        path.join(repoRoot, "ai-sdlc.config.json"),
      );
      const kind = cfg.project?.kind ?? "library";
      const file = path.join(memDir, "07-quality-gates", `${kind}.md`);
      if (fs.existsSync(file))
        return { kind, body: stripBom(fs.readFileSync(file, "utf8")) };
      const fallback = path.join(memDir, "07-quality-gates.md");
      return { kind, body: stripBom(fs.readFileSync(fallback, "utf8")) };
    }
    case "am.list_compliance": {
      const idx = readJson<{ project?: { compliance?: string[] } }>(
        path.join(memDir, "index.json"),
      );
      const list = idx.project?.compliance ?? [];
      const out: Record<string, string> = {};
      for (const p of list) {
        const file = path.join(memDir, "12-compliance", `${p}.yaml`);
        if (fs.existsSync(file))
          out[p] = stripBom(fs.readFileSync(file, "utf8"));
      }
      return out;
    }
    case "am.list_threat_models": {
      const dir = path.join(memDir, "14-threat-models");
      if (!fs.existsSync(dir)) return {};
      const out: Record<string, string> = {};
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".md")) continue;
        out[f.replace(/\.md$/, "")] = stripBom(
          fs.readFileSync(path.join(dir, f), "utf8"),
        );
      }
      return out;
    }
    case "am.known_issues": {
      const file = path.join(memDir, "known-issues.md");
      if (!fs.existsSync(file)) return [];
      const body = stripBom(fs.readFileSync(file, "utf8"));
      const sections = body.split(/^## /m).slice(1);
      return sections
        .map((s) => {
          const headLine = s.split("\n", 1)[0] ?? "";
          const m = headLine.match(
            /^(KI-\d{4})\s*—\s*(.+?)(?:\s*\*\((RESOLVED|OPEN)\)\*)?\s*$/,
          );
          if (!m) return null;
          return {
            id: m[1],
            title: m[2],
            state: m[3] ?? "OPEN",
          };
        })
        .filter(Boolean);
    }
    case "am.dora_metrics": {
      const idx = readJson<IndexShape>(path.join(memDir, "index.json"));
      const items = idx.requirements?.items ?? [];
      const events = idx.events ?? [];
      const days =
        typeof args.windowDays === "number" ? (args.windowDays as number) : 30;
      const now = Date.now();
      const byStatus: Record<string, number> = {};
      let firstTryPassNum = 0,
        firstTryDenom = 0,
        fixLoopNum = 0,
        fixLoopDenom = 0,
        throughputDoneInWindow = 0;
      for (const r of items) {
        byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        if (r.evaluation && typeof r.evaluation.firstTryPass === "boolean") {
          firstTryDenom += 1;
          if (r.evaluation.firstTryPass) firstTryPassNum += 1;
        }
        if (
          r.evaluation &&
          typeof r.evaluation.fixLoopIterations === "number"
        ) {
          fixLoopNum += r.evaluation.fixLoopIterations;
          fixLoopDenom += 1;
        }
        if (
          r.status === "Done" &&
          withinDays(r.doneAt ?? r.updatedAt, days, now)
        ) {
          throughputDoneInWindow += 1;
        }
      }
      const statusTransitionsInWindow = events.filter(
        (e) => e.type === "status-change" && withinDays(e.at, days, now),
      ).length;
      return {
        generatedAt: new Date(now).toISOString(),
        windowDays: days,
        totals: { requirements: items.length, byStatus },
        framework: {
          throughputDoneInWindow,
          firstTryPassRate: firstTryDenom
            ? firstTryPassNum / firstTryDenom
            : null,
          averageFixLoopIterations: fixLoopDenom
            ? fixLoopNum / fixLoopDenom
            : null,
          statusTransitionsInWindow,
        },
      };
    }
    case "am.read_memory_file": {
      const rel = String(args.path ?? "");
      const full = path.resolve(memDir, rel);
      if (!full.startsWith(memDir + path.sep) && full !== memDir) {
        throw new Error("path must be inside docs/agent-memory/");
      }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
        throw new Error(`not found: ${rel}`);
      }
      return { path: rel, body: stripBom(fs.readFileSync(full, "utf8")) };
    }
    case "am.context_pack": {
      const filter = new Set<string>(
        Array.isArray(args.requirements) ? (args.requirements as string[]) : [],
      );
      const excludeBodies = Boolean(args.excludeBodies);
      const sha = (s: string) =>
        crypto.createHash("sha256").update(s, "utf8").digest("hex");
      const CANON = [
        "00-project-context.md",
        "01-architecture.md",
        "07-quality-gates.md",
        "08-progress-index.md",
        "index.json",
        "index.rules.md",
        "known-issues.md",
      ];
      const REQ_FILES = [
        "requirement.md",
        "acceptance-criteria.md",
        "nonfunctional.md",
        "constraints.md",
        "risks.md",
        "traceability.md",
      ];
      type Rec = {
        kind: string;
        path: string;
        sha256: string;
        bytes: number;
        body?: string;
        meta?: Record<string, unknown>;
      };
      const records: Rec[] = [];
      for (const rel of CANON) {
        const full = path.join(memDir, rel);
        if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
        const body = stripBom(fs.readFileSync(full, "utf8"));
        records.push({
          kind: "memory",
          path: `docs/agent-memory/${rel}`,
          sha256: sha(body),
          bytes: Buffer.byteLength(body, "utf8"),
          ...(excludeBodies ? {} : { body }),
        });
      }
      const idxPath = path.join(memDir, "index.json");
      const idx = fs.existsSync(idxPath)
        ? readJson<IndexShape>(idxPath)
        : ({} as IndexShape);
      const items = idx.requirements?.items ?? [];
      for (const r of items) {
        if (filter.size > 0 && !filter.has(r.id)) continue;
        const reqDir = path.join(memDir, "02-requirements", r.id);
        if (!fs.existsSync(reqDir)) continue;
        for (const f of REQ_FILES) {
          const full = path.join(reqDir, f);
          if (!fs.existsSync(full)) continue;
          const body = stripBom(fs.readFileSync(full, "utf8"));
          records.push({
            kind: "requirement",
            path: `docs/agent-memory/02-requirements/${r.id}/${f}`,
            sha256: sha(body),
            bytes: Buffer.byteLength(body, "utf8"),
            meta: { requirementId: r.id, status: r.status ?? "Draft" },
            ...(excludeBodies ? {} : { body }),
          });
        }
      }
      const decDir = path.join(memDir, "06-decisions");
      if (fs.existsSync(decDir)) {
        for (const f of fs.readdirSync(decDir).sort()) {
          if (!/^ADR-\d{4}-/.test(f) || !f.endsWith(".md")) continue;
          const full = path.join(decDir, f);
          const body = stripBom(fs.readFileSync(full, "utf8"));
          records.push({
            kind: "adr",
            path: `docs/agent-memory/06-decisions/${f}`,
            sha256: sha(body),
            bytes: Buffer.byteLength(body, "utf8"),
            ...(excludeBodies ? {} : { body }),
          });
        }
      }
      return {
        version: 1,
        generatedAt: new Date().toISOString(),
        counts: {
          memory: records.filter((r) => r.kind === "memory").length,
          requirements: records.filter((r) => r.kind === "requirement").length,
          adrs: records.filter((r) => r.kind === "adr").length,
        },
        records,
      };
    }
    case "am.graph": {
      const fmt = (args.format === "dot" ? "dot" : "mermaid") as
        | "mermaid"
        | "dot";
      const includeAdrs = Boolean(args.includeAdrs);
      const idxPath = path.join(memDir, "index.json");
      const idx = fs.existsSync(idxPath)
        ? readJson<IndexShape>(idxPath)
        : ({} as IndexShape);
      const items = idx.requirements?.items ?? [];
      const decisions =
        (
          idx as {
            decisions?: { items?: Array<{ id: string; title?: string }> };
          }
        ).decisions?.items ?? [];
      type ItemX = {
        id: string;
        title?: string;
        status?: string;
        links?: { dependsOn?: string[]; blocks?: string[]; adrs?: string[] };
      };
      const xitems = items as ItemX[];
      const esc = (s: string) => s.replace(/"/g, '\\"');
      const STATUS_CLASS: Record<string, string> = {
        Draft: "draft",
        Planned: "planned",
        Processed: "processed",
        Implemented: "implemented",
        Evaluated: "evaluated",
        Done: "done",
        Blocked: "blocked",
      };
      let body: string;
      if (fmt === "dot") {
        const lines = [
          "digraph G {",
          '  rankdir="LR";',
          '  node [shape=box, style="rounded,filled"];',
        ];
        for (const r of xitems)
          lines.push(
            `  "${r.id}" [label="${esc(r.id + " — " + (r.title ?? ""))}"];`,
          );
        if (includeAdrs)
          for (const a of decisions)
            lines.push(
              `  "${a.id}" [label="${esc(a.id + ": " + (a.title ?? ""))}", shape=note];`,
            );
        for (const r of xitems) {
          for (const dep of r.links?.dependsOn ?? [])
            lines.push(`  "${r.id}" -> "${dep}";`);
          for (const b of r.links?.blocks ?? [])
            lines.push(`  "${r.id}" -> "${b}" [label="blocks", color="red"];`);
          if (includeAdrs)
            for (const a of r.links?.adrs ?? [])
              lines.push(`  "${r.id}" -> "${a}" [style="dashed"];`);
        }
        lines.push("}");
        body = lines.join("\n") + "\n";
      } else {
        const lines = ["```mermaid", "flowchart LR"];
        for (const r of xitems) {
          const cls = STATUS_CLASS[r.status ?? "Draft"] ?? "draft";
          lines.push(
            `  ${r.id}["${esc(r.id + " — " + (r.title ?? ""))}"]:::${cls}`,
          );
        }
        if (includeAdrs)
          for (const a of decisions)
            lines.push(
              `  ${a.id}{{"${esc(a.id + ": " + (a.title ?? ""))}"}}:::adr`,
            );
        for (const r of xitems) {
          for (const dep of r.links?.dependsOn ?? [])
            lines.push(`  ${r.id} --> ${dep}`);
          for (const b of r.links?.blocks ?? [])
            lines.push(`  ${r.id} -. blocks .-> ${b}`);
          if (includeAdrs)
            for (const a of r.links?.adrs ?? [])
              lines.push(`  ${r.id} -.-> ${a}`);
        }
        lines.push("```");
        body = lines.join("\n") + "\n";
      }
      return { format: fmt, requirements: items.length, body };
    }
    case "am.changelog": {
      const days = Math.max(
        1,
        Number.isFinite(args.windowDays as number)
          ? Number(args.windowDays)
          : 30,
      );
      const groupBy = (
        args.groupBy === "tag" || args.groupBy === "none"
          ? args.groupBy
          : "status"
      ) as "status" | "tag" | "none";
      const fmt = (args.format === "json" ? "json" : "md") as "md" | "json";
      const idxPath = path.join(memDir, "index.json");
      const idx = fs.existsSync(idxPath)
        ? readJson<IndexShape>(idxPath)
        : ({} as IndexShape);
      const now = Date.now();
      const inWin = (iso: string | undefined): boolean => {
        if (!iso) return false;
        const t = Date.parse(iso);
        return !Number.isNaN(t) && now - t <= days * 86_400_000;
      };
      type Item = {
        id: string;
        title?: string;
        status?: string;
        doneAt?: string;
        updatedAt?: string;
        tags?: string[];
      };
      const items = (idx.requirements?.items ?? []) as Item[];
      const completed = items.filter(
        (r) =>
          (r.status === "Done" || r.status === "Evaluated") &&
          inWin(r.doneAt ?? r.updatedAt),
      );
      const adrs = (
        (
          idx as {
            decisions?: {
              items?: Array<{ id: string; title?: string; status?: string }>;
            };
          }
        ).decisions?.items ?? []
      ).filter((a) => a.status === "Accepted");
      const events = (
        (idx as { events?: Array<{ type: string; at: string }> }).events ?? []
      ).filter((e) => inWin(e.at));
      const project =
        (idx as { project?: { name?: string } }).project?.name ?? "(unnamed)";
      if (fmt === "json") {
        return {
          format: "json",
          body: JSON.stringify(
            {
              project,
              windowDays: days,
              generatedAt: new Date().toISOString(),
              completed,
              adrs,
              events,
            },
            null,
            2,
          ),
        };
      }
      const fmtItem = (r: Item) => {
        const at = (r.doneAt ?? r.updatedAt ?? "").slice(0, 10);
        const tag =
          r.tags && r.tags.length > 0 ? ` _(\`${r.tags.join("`, `")}\`)_` : "";
        return `- **${r.id}** — ${r.title ?? "(untitled)"} · ${at}${tag}`;
      };
      const lines: string[] = [];
      lines.push(`# Changelog — ${project}`);
      lines.push("");
      lines.push(
        `> Window: last **${days}** days · Generated \`${new Date().toISOString()}\``,
      );
      lines.push("");
      lines.push(`## Completed requirements (${completed.length})`);
      lines.push("");
      if (completed.length === 0) {
        lines.push("_None._");
      } else if (groupBy === "tag") {
        const buckets = new Map<string, Item[]>();
        for (const r of completed) {
          const tags = r.tags && r.tags.length > 0 ? r.tags : ["(untagged)"];
          for (const t of tags) {
            if (!buckets.has(t)) buckets.set(t, []);
            buckets.get(t)!.push(r);
          }
        }
        for (const t of [...buckets.keys()].sort()) {
          lines.push(`### \`${t}\``);
          lines.push("");
          for (const r of buckets.get(t)!) lines.push(fmtItem(r));
          lines.push("");
        }
      } else if (groupBy === "status") {
        const byStatus = new Map<string, Item[]>();
        for (const r of completed) {
          const s = r.status ?? "Done";
          if (!byStatus.has(s)) byStatus.set(s, []);
          byStatus.get(s)!.push(r);
        }
        for (const s of [...byStatus.keys()].sort()) {
          lines.push(`### ${s}`);
          lines.push("");
          for (const r of byStatus.get(s)!) lines.push(fmtItem(r));
          lines.push("");
        }
      } else {
        for (const r of completed) lines.push(fmtItem(r));
        lines.push("");
      }
      lines.push(`## ADRs accepted (${adrs.length})`);
      lines.push("");
      if (adrs.length === 0) lines.push("_None._");
      else for (const a of adrs) lines.push(`- **${a.id}** — ${a.title ?? ""}`);
      lines.push("");
      lines.push(`## Events (${events.length})`);
      lines.push("");
      if (events.length === 0) {
        lines.push("_None._");
      } else {
        const byType = new Map<string, number>();
        for (const e of events)
          byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
        lines.push("| Event | Count |");
        lines.push("|---|---|");
        for (const t of [...byType.keys()].sort())
          lines.push(`| ${t} | ${byType.get(t)} |`);
      }
      lines.push("");
      return {
        format: "md",
        windowDays: days,
        counts: {
          completed: completed.length,
          adrs: adrs.length,
          events: events.length,
        },
        body: lines.join("\n"),
      };
    }
    case "am.release_notes": {
      const since = String(args.since ?? "");
      if (!since) throw new Error("`since` is required (ISO datetime).");
      const sinceMs = Date.parse(since);
      if (Number.isNaN(sinceMs)) throw new Error(`bad ISO --since: ${since}`);
      const until = typeof args.until === "string" ? args.until : undefined;
      const untilMs = until ? Date.parse(until) : Date.now();
      if (Number.isNaN(untilMs)) throw new Error(`bad ISO --until: ${until}`);
      const fmt = (args.format === "json" ? "json" : "md") as "md" | "json";
      const version =
        (typeof args.version === "string" ? args.version : undefined) ??
        until ??
        "Unreleased";
      const idxPath = path.join(memDir, "index.json");
      const idx = fs.existsSync(idxPath)
        ? readJson<IndexShape>(idxPath)
        : ({} as IndexShape);
      const inWin = (iso: string | undefined) => {
        if (!iso) return false;
        const t = Date.parse(iso);
        return !Number.isNaN(t) && t >= sinceMs && t <= untilMs;
      };
      type Item = {
        id: string;
        title?: string;
        status?: string;
        doneAt?: string;
        updatedAt?: string;
        tags?: string[];
      };
      const items = (idx.requirements?.items ?? []) as Item[];
      const completed = items.filter(
        (r) =>
          (r.status === "Done" || r.status === "Evaluated") &&
          inWin(r.doneAt ?? r.updatedAt),
      );
      const adrs = (
        (
          idx as {
            decisions?: {
              items?: Array<{ id: string; title?: string; status?: string }>;
            };
          }
        ).decisions?.items ?? []
      ).filter((a) => a.status === "Accepted");
      const events = (
        (idx as { events?: Array<{ type: string; at: string }> }).events ?? []
      ).filter((e) => inWin(e.at));
      const project =
        (idx as { project?: { name?: string } }).project?.name ?? "(unnamed)";
      const sinceISO = new Date(sinceMs).toISOString();
      const untilISO = new Date(untilMs).toISOString();
      if (fmt === "json") {
        return {
          format: "json",
          body: JSON.stringify(
            {
              project,
              version,
              since: { ref: since, at: sinceISO },
              until: { ref: until ?? null, at: untilISO },
              generatedAt: new Date().toISOString(),
              completed,
              adrs,
              events,
            },
            null,
            2,
          ),
        };
      }
      const fmtItem = (r: Item) => {
        const at = (r.doneAt ?? r.updatedAt ?? "").slice(0, 10);
        const tag =
          r.tags && r.tags.length > 0 ? ` _(\`${r.tags.join("`, `")}\`)_` : "";
        return `- **${r.id}** — ${r.title ?? "(untitled)"} · ${at}${tag}`;
      };
      const lines: string[] = [];
      lines.push(`# Release Notes — ${project} \`${version}\``);
      lines.push("");
      lines.push(
        `> Range: \`${since}\` (${sinceISO.slice(0, 10)}) → \`${until ?? "now"}\` (${untilISO.slice(0, 10)})`,
      );
      lines.push("");
      lines.push(`## Completed (${completed.length})`);
      lines.push("");
      if (completed.length === 0) lines.push("_None._");
      else for (const r of completed) lines.push(fmtItem(r));
      lines.push("");
      lines.push(`## ADRs accepted (${adrs.length})`);
      lines.push("");
      if (adrs.length === 0) lines.push("_None._");
      else for (const a of adrs) lines.push(`- **${a.id}** — ${a.title ?? ""}`);
      lines.push("");
      lines.push(`## Events (${events.length})`);
      lines.push("");
      if (events.length === 0) {
        lines.push("_None._");
      } else {
        const byType = new Map<string, number>();
        for (const e of events)
          byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
        lines.push("| Event | Count |");
        lines.push("|---|---|");
        for (const t of [...byType.keys()].sort())
          lines.push(`| ${t} | ${byType.get(t)} |`);
      }
      lines.push("");
      return {
        format: "md",
        version,
        counts: {
          completed: completed.length,
          adrs: adrs.length,
          events: events.length,
        },
        body: lines.join("\n"),
      };
    }
    case "am.create_requirement": {
      if (!writable)
        throw new Error(
          "server is read-only; start with --writable to enable mutations",
        );
      const idxPath = path.join(memDir, "index.json");
      const idx = readJson<
        IndexShape & { requirements?: { items?: IndexItem[] } }
      >(idxPath);
      idx.requirements = idx.requirements ?? { items: [] };
      idx.requirements.items = idx.requirements.items ?? [];
      const items = idx.requirements.items;
      const requestedId =
        typeof args.id === "string" ? (args.id as string) : undefined;
      if (requestedId && items.some((r) => r.id === requestedId)) {
        throw new Error(`requirement ${requestedId} already exists`);
      }
      const id = requestedId ?? nextRequirementId(items);
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title is required");
      const status =
        typeof args.status === "string" ? (args.status as string) : "Draft";
      const now = new Date().toISOString();
      const item: IndexItem = { id, title, status, updatedAt: now };
      items.push(item);
      idx.events = idx.events ?? [];
      idx.events.push({ type: "requirement-created", at: now });
      writeJson(idxPath, idx);
      const reqDir = path.join(memDir, "02-requirements", id);
      fs.mkdirSync(reqDir, { recursive: true });
      const reqMd = path.join(reqDir, "requirement.md");
      if (!fs.existsSync(reqMd)) {
        fs.writeFileSync(
          reqMd,
          [
            `# ${id} — ${title}`,
            "",
            "> Auto-generated via MCP. Fill out below.",
            "",
            "## Summary",
            "",
            "_describe_",
            "",
          ].join("\n"),
          "utf8",
        );
      }
      return { id, title, status };
    }
    case "am.update_status": {
      if (!writable)
        throw new Error(
          "server is read-only; start with --writable to enable mutations",
        );
      const idxPath = path.join(memDir, "index.json");
      const idx = readJson<IndexShape>(idxPath);
      const items = idx.requirements?.items ?? [];
      const id = String(args.id ?? "");
      const status = String(args.status ?? "");
      const it = items.find((r) => r.id === id);
      if (!it) throw new Error(`requirement ${id} not found`);
      const prev = it.status;
      it.status = status;
      const now = new Date().toISOString();
      it.updatedAt = now;
      if (status === "Done") it.doneAt = now;
      idx.events = idx.events ?? [];
      idx.events.push({ type: "status-change", at: now } as {
        type: string;
        at: string;
      });
      writeJson(idxPath, idx);
      return { id, from: prev, to: status, at: now };
    }
    case "am.append_event": {
      if (!writable)
        throw new Error(
          "server is read-only; start with --writable to enable mutations",
        );
      const idxPath = path.join(memDir, "index.json");
      const idx = readJson<IndexShape>(idxPath);
      idx.events = idx.events ?? [];
      const at =
        typeof args.at === "string"
          ? (args.at as string)
          : new Date().toISOString();
      const ev = { type: String(args.type ?? "event"), at } as {
        type: string;
        at: string;
      };
      idx.events.push(ev);
      writeJson(idxPath, idx);
      return ev;
    }
    case "am.ki_add": {
      if (!writable)
        throw new Error(
          "server is read-only; start with --writable to enable mutations",
        );
      const kiFile = path.join(memDir, "known-issues.md");
      let body = "";
      if (fs.existsSync(kiFile)) {
        body = stripBom(fs.readFileSync(kiFile, "utf8"));
      } else {
        body = [
          "# Known issues / deferred bugs",
          "",
          "> Backlog of non-blocking issues. Revisit in dedicated maintenance passes.",
          "",
          "---",
          "",
        ].join("\n");
        fs.mkdirSync(memDir, { recursive: true });
      }
      const sections = body.split(/^## /m).slice(1);
      let max = 0;
      for (const s of sections) {
        const m = (s.split("\n", 1)[0] ?? "").match(/^KI-(\d{4})/);
        if (m) {
          const n = Number.parseInt(m[1]!, 10);
          if (n > max) max = n;
        }
      }
      const id = `KI-${String(max + 1).padStart(4, "0")}`;
      const date = new Date().toISOString().slice(0, 10);
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title is required");
      const sev = (
        args.severity === "medium" || args.severity === "high"
          ? args.severity
          : "low"
      ) as string;
      const block = [
        `## ${id} — ${title}`,
        "",
        `- **Date opened:** ${date}`,
        `- **Severity:** ${sev}`,
        `- **Scope:** ${typeof args.scope === "string" ? args.scope : "unspecified"}`,
        `- **Repro:** ${typeof args.repro === "string" ? args.repro : "_describe_"}`,
        `- **Probable cause:** _to investigate_`,
        `- **Deferred-because:** _not blocking current work_`,
        "",
        "---",
        "",
      ].join("\n");
      const dividerRe = /^---\s*$\r?\n+/m;
      const m = dividerRe.exec(body);
      let updated: string;
      if (m && m.index !== undefined) {
        const insertAt = m.index + m[0].length;
        updated = body.slice(0, insertAt) + block + "\n" + body.slice(insertAt);
      } else {
        updated =
          body + (body.endsWith("\n") ? "" : "\n") + "\n" + block + "\n";
      }
      fs.writeFileSync(kiFile, updated, "utf8");
      return { id, title, severity: sev };
    }
    case "am.create_adr": {
      if (!writable)
        throw new Error(
          "server is read-only; start with --writable to enable mutations",
        );
      const decDir = path.join(memDir, "06-decisions");
      if (!fs.existsSync(decDir)) fs.mkdirSync(decDir, { recursive: true });
      const title = String(args.title ?? "").trim();
      if (!title) throw new Error("title is required");
      const status = (
        typeof args.status === "string" ? args.status : "Proposed"
      ) as string;
      const requirement =
        typeof args.requirement === "string" ? args.requirement : "R-XXXX";
      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || "adr";
      const nums = fs
        .readdirSync(decDir)
        .map((f) => f.match(/^ADR-(\d{4})-/))
        .filter((m): m is RegExpMatchArray => Boolean(m))
        .map((m) => Number.parseInt(m[1]!, 10));
      const num = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(
        4,
        "0",
      );
      const file = path.join(decDir, `ADR-${num}-${slug}.md`);
      if (fs.existsSync(file))
        throw new Error(`ADR already exists: ADR-${num}-${slug}.md`);
      const date = new Date().toISOString().slice(0, 10);
      const body = [
        `# ADR-${num}: ${title}`,
        "",
        `- Status: ${status}`,
        `- Date: ${date}`,
        `- Linked requirement: ${requirement}`,
        "",
        "## Context",
        "<!-- What is the issue we're seeing that motivates this decision? -->",
        "",
        "## Decision",
        "<!-- What is the change we're proposing/doing? -->",
        "",
        "## Consequences",
        "<!-- What becomes easier or harder because of this change? -->",
        "",
      ].join("\n");
      fs.writeFileSync(file, body, "utf8");
      return {
        number: num,
        status,
        file: path.relative(repoRoot, file).replace(/\\/g, "/"),
      };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
};

const handle = (req: JsonRpcRequest): JsonRpcResponse => {
  try {
    if (req.method === "initialize") {
      return {
        jsonrpc: "2.0",
        id: req.id ?? null,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "ai-sdlc", version: "0.1.0-alpha.0" },
        },
      };
    }
    if (req.method === "tools/list") {
      return { jsonrpc: "2.0", id: req.id ?? null, result: listTools() };
    }
    if (req.method === "tools/call") {
      const params = req.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments as Record<string, unknown>) ?? {};
      const result = callTool(name, args);
      return {
        jsonrpc: "2.0",
        id: req.id ?? null,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      };
    }
    return {
      jsonrpc: "2.0",
      id: req.id ?? null,
      error: { code: -32601, message: "Method not found" },
    };
  } catch (e) {
    return {
      jsonrpc: "2.0",
      id: req.id ?? null,
      error: { code: -32000, message: String((e as Error).message) },
    };
  }
};

// Stdio JSON-RPC framing: line-delimited JSON.
let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  for (;;) {
    const nl = buf.indexOf("\n");
    if (nl < 0) break;
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      const req = JSON.parse(line) as JsonRpcRequest;
      const res = handle(req);
      process.stdout.write(JSON.stringify(res) + "\n");
    } catch {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        }) + "\n",
      );
    }
  }
});

process.stdin.on("end", () => process.exit(0));
