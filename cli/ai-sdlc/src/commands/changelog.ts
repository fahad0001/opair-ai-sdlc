import fs from "node:fs";
import path from "node:path";
import { ok, fail } from "../util/log.js";

/**
 * `ai-sdlc changelog` — derives a human-readable changelog from index.json
 * (events[] + requirements completed in window). Pure read; no side-effects
 * unless --out is provided.
 */
export interface ChangelogOptions {
  cwd: string;
  out?: string;
  windowDays?: number;
  groupBy?: "status" | "tag" | "none";
  format?: "md" | "json";
}

interface IndexItem {
  id: string;
  title?: string;
  status?: string;
  doneAt?: string;
  updatedAt?: string;
  tags?: string[];
}

interface IndexShape {
  project?: { name?: string };
  requirements?: { items?: IndexItem[] };
  decisions?: {
    items?: Array<{ id: string; title?: string; status?: string }>;
  };
  events?: Array<{
    type: string;
    at: string;
    payload?: Record<string, unknown>;
  }>;
}

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");
const readJson = <T>(p: string): T =>
  JSON.parse(stripBom(fs.readFileSync(p, "utf8"))) as T;

const inWindow = (
  iso: string | undefined,
  days: number,
  nowMs: number,
): boolean => {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return nowMs - t <= days * 86_400_000;
};

export async function cmdChangelog(opts: ChangelogOptions): Promise<string> {
  const root = path.resolve(opts.cwd);
  const idxPath = path.join(root, "docs", "agent-memory", "index.json");
  if (!fs.existsSync(idxPath)) {
    fail(`No index.json at ${idxPath}`);
    throw new Error("missing-index");
  }
  const idx = readJson<IndexShape>(idxPath);
  const days = Math.max(1, opts.windowDays ?? 30);
  const groupBy = opts.groupBy ?? "status";
  const fmt = opts.format ?? "md";
  const now = Date.now();

  const items = idx.requirements?.items ?? [];
  const completed = items.filter(
    (r) =>
      (r.status === "Done" || r.status === "Evaluated") &&
      inWindow(r.doneAt ?? r.updatedAt, days, now),
  );
  const adrs = (idx.decisions?.items ?? []).filter(
    (a) => a.status === "Accepted",
  );
  const events = (idx.events ?? []).filter((e) => inWindow(e.at, days, now));

  if (fmt === "json") {
    const body = JSON.stringify(
      {
        project: idx.project?.name ?? "(unnamed)",
        windowDays: days,
        generatedAt: new Date().toISOString(),
        completed,
        adrs,
        events,
      },
      null,
      2,
    );
    return write(opts, root, body);
  }

  const lines: string[] = [];
  lines.push(`# Changelog — ${idx.project?.name ?? "(unnamed)"}`);
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
    const buckets = new Map<string, IndexItem[]>();
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
      for (const r of buckets.get(t)!) lines.push(formatItem(r));
      lines.push("");
    }
  } else if (groupBy === "status") {
    const byStatus = new Map<string, IndexItem[]>();
    for (const r of completed) {
      const s = r.status ?? "Done";
      if (!byStatus.has(s)) byStatus.set(s, []);
      byStatus.get(s)!.push(r);
    }
    for (const s of [...byStatus.keys()].sort()) {
      lines.push(`### ${s}`);
      lines.push("");
      for (const r of byStatus.get(s)!) lines.push(formatItem(r));
      lines.push("");
    }
  } else {
    for (const r of completed) lines.push(formatItem(r));
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
    for (const e of events) byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
    lines.push("| Event | Count |");
    lines.push("|---|---|");
    for (const t of [...byType.keys()].sort())
      lines.push(`| ${t} | ${byType.get(t)} |`);
  }
  lines.push("");

  return write(opts, root, lines.join("\n"));
}

const formatItem = (r: IndexItem): string => {
  const at = (r.doneAt ?? r.updatedAt ?? "").slice(0, 10);
  const tag =
    r.tags && r.tags.length > 0 ? ` _(\`${r.tags.join("`, `")}\`)_` : "";
  return `- **${r.id}** — ${r.title ?? "(untitled)"} · ${at}${tag}`;
};

const write = (opts: ChangelogOptions, root: string, body: string): string => {
  if (opts.out) {
    const outPath = path.resolve(root, opts.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, body.endsWith("\n") ? body : body + "\n", "utf8");
    ok(`Wrote ${path.relative(root, outPath)}`);
  } else {
    process.stdout.write(body.endsWith("\n") ? body : body + "\n");
  }
  return body;
};
