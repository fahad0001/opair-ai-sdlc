import fs from "node:fs";
import path from "node:path";
import { ok, fail } from "../util/log.js";

export interface MsrdOptions {
  cwd: string;
  out?: string;
  top?: number;
}

interface IndexEntry {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  updatedAt?: string;
  tags?: string[];
  paths?: {
    requirementRoot?: string;
    planRoot?: string;
    executionRoot?: string;
    evaluationRoot?: string;
  };
  links?: { dependsOn?: string[]; blocks?: string[] };
}

interface IndexShape {
  project?: { name?: string; repoRoot?: string };
  generatedAt?: string;
  requirements?: { items?: IndexEntry[] };
  decisions?: {
    items?: Array<{ id: string; title?: string; status?: string }>;
  };
}

const PRI_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
const STATUS_RANK: Record<string, number> = {
  Blocked: 0,
  Implemented: 1,
  Processed: 2,
  Planned: 3,
  Draft: 4,
  Evaluated: 5,
  Done: 6,
};

const readJson = <T>(p: string): T =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as T;

export async function cmdMsrd(opts: MsrdOptions): Promise<void> {
  const root = path.resolve(opts.cwd);
  const idxPath = path.join(root, "docs", "agent-memory", "index.json");
  if (!fs.existsSync(idxPath)) {
    fail(`No index.json at ${idxPath}`);
    return;
  }
  const idx = readJson<IndexShape>(idxPath);
  const items = idx.requirements?.items ?? [];
  const top = Math.max(1, opts.top ?? 20);

  const ranked = [...items].sort((a, b) => {
    const pa = PRI_RANK[a.priority ?? "P2"] ?? 9;
    const pb = PRI_RANK[b.priority ?? "P2"] ?? 9;
    if (pa !== pb) return pa - pb;
    const sa = STATUS_RANK[a.status ?? "Draft"] ?? 9;
    const sb = STATUS_RANK[b.status ?? "Draft"] ?? 9;
    if (sa !== sb) return sa - sb;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });

  const lines: string[] = [];
  lines.push(`# Most-Significant Requirements Digest`);
  lines.push("");
  lines.push(`- Project: **${idx.project?.name ?? "(unnamed)"}**`);
  lines.push(`- Generated at: \`${new Date().toISOString()}\``);
  lines.push(`- Index timestamp: \`${idx.generatedAt ?? "(unknown)"}\``);
  lines.push(
    `- Total requirements: **${items.length}** · Showing top **${Math.min(top, ranked.length)}**`,
  );
  lines.push("");

  // Counts by status
  const counts: Record<string, number> = {};
  for (const r of items)
    counts[r.status ?? "Draft"] = (counts[r.status ?? "Draft"] ?? 0) + 1;
  lines.push(`## Status distribution`);
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("|---|---|");
  for (const k of Object.keys(counts).sort())
    lines.push(`| ${k} | ${counts[k]} |`);
  lines.push("");

  lines.push(`## Top ${Math.min(top, ranked.length)} by priority then urgency`);
  lines.push("");
  lines.push("| Rank | ID | Title | Priority | Status | Updated |");
  lines.push("|---|---|---|---|---|---|");
  ranked.slice(0, top).forEach((r, i) => {
    lines.push(
      `| ${i + 1} | \`${r.id}\` | ${(r.title ?? "").replace(/\|/g, "\\|")} | ${r.priority ?? "?"} | ${r.status ?? "?"} | ${r.updatedAt ?? ""} |`,
    );
  });
  lines.push("");

  const blocked = items.filter((r) => r.status === "Blocked");
  if (blocked.length) {
    lines.push(`## Blocked (${blocked.length})`);
    lines.push("");
    for (const r of blocked) {
      lines.push(`- \`${r.id}\` — ${r.title ?? ""} (${r.priority ?? "?"})`);
    }
    lines.push("");
  }

  const adrs = idx.decisions?.items ?? [];
  if (adrs.length) {
    lines.push(`## Architecture decisions (${adrs.length})`);
    lines.push("");
    for (const a of adrs.slice(0, 25)) {
      lines.push(`- \`${a.id}\` — ${a.title ?? ""} (${a.status ?? ""})`);
    }
    lines.push("");
  }

  const out = path.resolve(
    opts.out ?? path.join(root, "docs", "agent-memory", "msrd.md"),
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  ok(
    `Wrote ${path.relative(root, out)} (${ranked.slice(0, top).length} requirements)`,
  );
}
