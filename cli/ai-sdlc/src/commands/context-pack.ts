import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ok, fail } from "../util/log.js";

/**
 * `ai-sdlc context-pack` — emits a single self-contained JSON document that
 * any external LLM/agent can ingest as deterministic memory.
 *
 * The pack contains:
 *   - project metadata + index summary
 *   - the canonical memory pack files (00-project-context, 01-architecture, …)
 *   - per-requirement bundles (requirement.md, acceptance, traceability, …)
 *   - ADR list with body
 *   - sha256 hash of every file embedded so the AHC verifier can pin them
 *
 * Output is JSON Lines with a header object first, then one record per
 * artifact. This makes it easy to stream and verify deterministically.
 */
export interface ContextPackOptions {
  cwd: string;
  out?: string;
  requirements?: string[]; // optional R-XXXX subset
  excludeBodies?: boolean; // metadata only
  pretty?: boolean;
}

interface IndexShape {
  project?: { name?: string; repoRoot?: string };
  requirements?: {
    items?: Array<{
      id: string;
      title?: string;
      status?: string;
      paths?: { requirementRoot?: string };
      tags?: string[];
    }>;
  };
  decisions?: {
    items?: Array<{
      id: string;
      title?: string;
      status?: string;
      file?: string;
    }>;
  };
}

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");
const sha256 = (s: string) =>
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

interface PackRecord {
  kind: "memory" | "requirement" | "adr";
  path: string;
  bytes: number;
  sha256: string;
  body?: string;
  meta?: Record<string, unknown>;
}

export async function cmdContextPack(opts: ContextPackOptions): Promise<{
  records: PackRecord[];
  out?: string;
}> {
  const root = path.resolve(opts.cwd);
  const memDir = path.join(root, "docs", "agent-memory");
  const idxPath = path.join(memDir, "index.json");
  if (!fs.existsSync(idxPath)) {
    fail(`No index.json at ${idxPath}`);
    throw new Error("missing-index");
  }
  const idx = JSON.parse(
    stripBom(fs.readFileSync(idxPath, "utf8")),
  ) as IndexShape;
  const records: PackRecord[] = [];

  // Canonical memory files
  for (const rel of CANON) {
    const full = path.join(memDir, rel);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    const body = stripBom(fs.readFileSync(full, "utf8"));
    records.push({
      kind: "memory",
      path: `docs/agent-memory/${rel}`,
      bytes: Buffer.byteLength(body, "utf8"),
      sha256: sha256(body),
      ...(opts.excludeBodies ? {} : { body }),
    });
  }

  // Requirements
  const items = idx.requirements?.items ?? [];
  const filter = new Set(opts.requirements ?? []);
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
        bytes: Buffer.byteLength(body, "utf8"),
        sha256: sha256(body),
        meta: { requirementId: r.id, status: r.status ?? "Draft" },
        ...(opts.excludeBodies ? {} : { body }),
      });
    }
  }

  // ADRs
  const decDir = path.join(memDir, "06-decisions");
  if (fs.existsSync(decDir)) {
    for (const f of fs.readdirSync(decDir).sort()) {
      if (!/^ADR-\d{4}-/.test(f) || !f.endsWith(".md")) continue;
      const full = path.join(decDir, f);
      const body = stripBom(fs.readFileSync(full, "utf8"));
      records.push({
        kind: "adr",
        path: `docs/agent-memory/06-decisions/${f}`,
        bytes: Buffer.byteLength(body, "utf8"),
        sha256: sha256(body),
        ...(opts.excludeBodies ? {} : { body }),
      });
    }
  }

  const header = {
    kind: "context-pack-header" as const,
    version: 1,
    generatedAt: new Date().toISOString(),
    project: idx.project ?? {},
    counts: {
      memory: records.filter((r) => r.kind === "memory").length,
      requirements: records.filter((r) => r.kind === "requirement").length,
      adrs: records.filter((r) => r.kind === "adr").length,
    },
    requirementsIncluded:
      filter.size > 0 ? Array.from(filter) : items.map((r) => r.id),
    excludeBodies: Boolean(opts.excludeBodies),
  };

  const lines: string[] = [];
  lines.push(JSON.stringify(header));
  for (const r of records) lines.push(JSON.stringify(r));
  const body = lines.join("\n") + "\n";

  if (opts.out) {
    const outPath = path.resolve(root, opts.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (opts.pretty && outPath.endsWith(".json")) {
      fs.writeFileSync(
        outPath,
        JSON.stringify({ header, records }, null, 2) + "\n",
        "utf8",
      );
    } else {
      fs.writeFileSync(outPath, body, "utf8");
    }
    ok(
      `Wrote ${path.relative(root, outPath)} — ${records.length} record(s) (memory=${header.counts.memory} req=${header.counts.requirements} adr=${header.counts.adrs})`,
    );
    return { records, out: outPath };
  }
  process.stdout.write(body);
  return { records };
}
