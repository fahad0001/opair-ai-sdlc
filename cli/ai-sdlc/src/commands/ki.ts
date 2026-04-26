import fs from "node:fs";
import path from "node:path";
import { ok, info, fail } from "../util/log.js";

export interface KiEntry {
  id: string;
  title: string;
  state: "OPEN" | "RESOLVED";
  body: string;
}

export interface KiOptions {
  cwd: string;
}
export interface KiAddOptions extends KiOptions {
  title: string;
  severity?: "low" | "medium" | "high";
  scope?: string;
  repro?: string;
}
export interface KiResolveOptions extends KiOptions {
  id: string;
  note?: string;
}
export interface KiListOptions extends KiOptions {
  json?: boolean;
  state?: "OPEN" | "RESOLVED" | "all";
}

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");

function kiPath(cwd: string): string {
  return path.join(
    path.resolve(cwd),
    "docs",
    "agent-memory",
    "known-issues.md",
  );
}

function ensureFile(p: string): void {
  if (fs.existsSync(p)) return;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(
    p,
    [
      "# Known issues / deferred bugs",
      "",
      "> Backlog of non-blocking issues. Revisit in dedicated maintenance passes.",
      "> Add new entries at the top. Each entry MUST include: ID, date, severity, scope, repro, suspected cause, deferred-because.",
      "",
      "---",
      "",
    ].join("\n"),
    "utf8",
  );
}

export function parseKi(body: string): KiEntry[] {
  const sections = body.split(/^## /m).slice(1);
  const out: KiEntry[] = [];
  for (const s of sections) {
    const head = s.split("\n", 1)[0] ?? "";
    const m = head.match(
      /^(KI-\d{4})\s*—\s*(.+?)(?:\s*\*\((RESOLVED|OPEN)\)\*)?\s*$/,
    );
    if (!m) continue;
    out.push({
      id: m[1]!,
      title: m[2]!.trim(),
      state: m[3] === "RESOLVED" ? "RESOLVED" : "OPEN",
      body: "## " + s,
    });
  }
  return out;
}

function nextKiId(entries: KiEntry[]): string {
  let max = 0;
  for (const e of entries) {
    const n = Number.parseInt(e.id.replace(/^KI-/, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `KI-${String(max + 1).padStart(4, "0")}`;
}

export async function cmdKiList(opts: KiListOptions): Promise<KiEntry[]> {
  const p = kiPath(opts.cwd);
  if (!fs.existsSync(p)) {
    if (opts.json) process.stdout.write("[]\n");
    else info("known-issues.md not present");
    return [];
  }
  const entries = parseKi(stripBom(fs.readFileSync(p, "utf8")));
  const filtered = entries.filter((e) =>
    !opts.state || opts.state === "all" ? true : e.state === opts.state,
  );
  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        filtered.map(({ body, ...rest }) => rest),
        null,
        2,
      ) + "\n",
    );
    return filtered;
  }
  for (const e of filtered) info(`${e.id} [${e.state}] ${e.title}`);
  if (filtered.length === 0) info("(no entries)");
  return filtered;
}

export async function cmdKiAdd(opts: KiAddOptions): Promise<KiEntry> {
  const p = kiPath(opts.cwd);
  ensureFile(p);
  const body = stripBom(fs.readFileSync(p, "utf8"));
  const entries = parseKi(body);
  const id = nextKiId(entries);
  const date = new Date().toISOString().slice(0, 10);
  const block = [
    `## ${id} — ${opts.title}`,
    "",
    `- **Date opened:** ${date}`,
    `- **Severity:** ${opts.severity ?? "low"}`,
    `- **Scope:** ${opts.scope ?? "unspecified"}`,
    `- **Repro:** ${opts.repro ?? "_describe_"}`,
    `- **Probable cause:** _to investigate_`,
    `- **Deferred-because:** _not blocking current work_`,
    "",
    "---",
    "",
  ].join("\n");
  // Insert after the first horizontal-rule divider line. Match the exact
  // divider line plus its trailing newline(s) so the new block lands on its
  // own line without splitting any adjacent header markers.
  const dividerRe = /^---\s*$\r?\n+/m;
  const m = dividerRe.exec(body);
  let updated: string;
  if (m && m.index !== undefined) {
    const insertAt = m.index + m[0].length;
    updated = body.slice(0, insertAt) + block + "\n" + body.slice(insertAt);
  } else {
    updated = body + (body.endsWith("\n") ? "" : "\n") + "\n" + block + "\n";
  }
  fs.writeFileSync(p, updated, "utf8");
  ok(`Added ${id}: ${opts.title}`);
  return { id, title: opts.title, state: "OPEN", body: block };
}

export async function cmdKiResolve(opts: KiResolveOptions): Promise<void> {
  const p = kiPath(opts.cwd);
  if (!fs.existsSync(p)) {
    fail("known-issues.md not present");
    return;
  }
  const body = stripBom(fs.readFileSync(p, "utf8"));
  const entries = parseKi(body);
  const target = entries.find((e) => e.id === opts.id);
  if (!target) {
    fail(`${opts.id} not found`);
    return;
  }
  if (target.state === "RESOLVED") {
    info(`${opts.id} already resolved`);
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  const oldHead = `## ${target.id} — ${target.title}`;
  const newHead = `## ${target.id} — ${target.title} *(RESOLVED)*`;
  let updated = body.replace(oldHead, newHead);
  // Append a Date resolved line under the entry, if a Date opened line exists.
  if (/Date opened:\*\*\s*\d{4}-\d{2}-\d{2}/.test(updated)) {
    updated = updated.replace(
      new RegExp(
        `(${escapeRe(newHead)}[\\s\\S]*?Date opened:\\*\\*\\s*\\d{4}-\\d{2}-\\d{2})`,
      ),
      `$1\n- **Date resolved:** ${date}` +
        (opts.note ? `\n- **Resolution note:** ${opts.note}` : ""),
    );
  }
  fs.writeFileSync(p, updated, "utf8");
  ok(`Resolved ${opts.id}`);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
