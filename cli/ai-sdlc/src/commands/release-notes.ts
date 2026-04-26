import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ok, log, warn } from "../util/log.js";

/**
 * `ai-sdlc release-notes` — produces a changelog-style release notes
 * document scoped to a git-tag (or ISO) range. Resolves a tag to its
 * commit timestamp via `git log -1 --format=%cI <ref>`; if git is not
 * available or the ref is invalid, falls back to ISO parsing.
 *
 * Inputs are filtered against `index.json`:
 *   - completed requirements (Done/Evaluated) by `doneAt|updatedAt`
 *   - accepted ADRs (no time filter — ADRs are always Accepted-as-of-now)
 *   - events whose `at` falls within [since, until]
 */
export interface ReleaseNotesOptions {
  cwd: string;
  since?: string; // tag or ISO; required
  until?: string; // tag or ISO; defaults to now
  version?: string; // label for the release section header
  format?: "md" | "json";
  out?: string;
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

/**
 * Resolve a ref string to a millisecond timestamp.
 * - If the ref parses as ISO (`Date.parse`), use that.
 * - Otherwise call `git log -1 --format=%cI <ref>` and parse the output.
 * Returns NaN if neither approach yields a valid time.
 */
export const resolveRef = (ref: string, cwd: string): number => {
  const direct = Date.parse(ref);
  if (!Number.isNaN(direct)) return direct;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", ref], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const t = Date.parse(out);
    return Number.isNaN(t) ? NaN : t;
  } catch {
    return NaN;
  }
};

const formatItem = (r: IndexItem): string => {
  const at = (r.doneAt ?? r.updatedAt ?? "").slice(0, 10);
  const tag =
    r.tags && r.tags.length > 0 ? ` _(\`${r.tags.join("`, `")}\`)_` : "";
  return `- **${r.id}** — ${r.title ?? "(untitled)"} · ${at}${tag}`;
};

export async function cmdReleaseNotes(
  opts: ReleaseNotesOptions,
): Promise<string> {
  const root = path.resolve(opts.cwd);
  if (!opts.since) {
    log.err("--since is required (git tag or ISO date).");
    throw new Error("missing-since");
  }
  const idxPath = path.join(root, "docs", "agent-memory", "index.json");
  if (!fs.existsSync(idxPath)) {
    log.err(`No index.json at ${idxPath}`);
    throw new Error("missing-index");
  }
  const sinceMs = resolveRef(opts.since, root);
  if (Number.isNaN(sinceMs)) {
    log.err(
      `Could not resolve --since "${opts.since}" (not ISO and not a git ref reachable from ${root}).`,
    );
    throw new Error("bad-since");
  }
  const untilMs = opts.until ? resolveRef(opts.until, root) : Date.now();
  if (Number.isNaN(untilMs)) {
    log.err(`Could not resolve --until "${opts.until}".`);
    throw new Error("bad-until");
  }
  if (untilMs < sinceMs) {
    warn(`--until is before --since; range is empty.`);
  }
  const idx = readJson<IndexShape>(idxPath);
  const project = idx.project?.name ?? "(unnamed)";
  const inWin = (iso: string | undefined): boolean => {
    if (!iso) return false;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return false;
    return t >= sinceMs && t <= untilMs;
  };
  const items = idx.requirements?.items ?? [];
  const completed = items.filter(
    (r) =>
      (r.status === "Done" || r.status === "Evaluated") &&
      inWin(r.doneAt ?? r.updatedAt),
  );
  const adrs = (idx.decisions?.items ?? []).filter(
    (a) => a.status === "Accepted",
  );
  const events = (idx.events ?? []).filter((e) => inWin(e.at));
  const fmt = opts.format ?? "md";
  const version = opts.version ?? opts.until ?? "Unreleased";
  const sinceISO = new Date(sinceMs).toISOString();
  const untilISO = new Date(untilMs).toISOString();

  if (fmt === "json") {
    const body = JSON.stringify(
      {
        project,
        version,
        since: { ref: opts.since, at: sinceISO },
        until: { ref: opts.until ?? null, at: untilISO },
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
  lines.push(`# Release Notes — ${project} \`${version}\``);
  lines.push("");
  lines.push(
    `> Range: \`${opts.since}\` (${sinceISO.slice(0, 10)}) → \`${opts.until ?? "now"}\` (${untilISO.slice(0, 10)})`,
  );
  lines.push("");
  lines.push(`## Completed (${completed.length})`);
  lines.push("");
  if (completed.length === 0) lines.push("_None._");
  else for (const r of completed) lines.push(formatItem(r));
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
    for (const e of events) byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
    lines.push("| Event | Count |");
    lines.push("|---|---|");
    for (const t of [...byType.keys()].sort())
      lines.push(`| ${t} | ${byType.get(t)} |`);
  }
  lines.push("");
  return write(opts, root, lines.join("\n"));
}

const write = (
  opts: ReleaseNotesOptions,
  root: string,
  body: string,
): string => {
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
