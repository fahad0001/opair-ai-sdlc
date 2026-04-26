import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ok, info, warn, fail, log } from "../util/log.js";

/**
 * `ai-sdlc verify-pack` — re-hashes the memory pack on disk and compares it
 * to a previously-emitted context-pack JSONL. Reports drift (added, removed,
 * changed, unchanged) and exits non-zero if anything drifted.
 *
 * This closes the loop on the Anti-Hallucination Charter: external agents can
 * pin to the pack's sha256 manifest and the project itself can detect when
 * memory drifted out from under them.
 */
export interface VerifyPackOptions {
  cwd: string;
  pack: string;
  json?: boolean;
  strict?: boolean; // also fail on `added` records (default: only fail on changed/removed)
}

interface PackRecord {
  kind: "memory" | "requirement" | "adr";
  path: string;
  sha256: string;
  bytes: number;
}

interface PackHeader {
  kind: "context-pack-header";
  version: number;
  generatedAt: string;
}

interface DriftReport {
  pack: string;
  generatedAt?: string;
  totals: {
    unchanged: number;
    changed: number;
    removed: number;
    added: number;
  };
  changed: Array<{ path: string; expected: string; actual: string }>;
  removed: string[];
  added: string[];
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

const enumerateOnDisk = (memDir: string): Map<string, string> => {
  const map = new Map<string, string>();
  for (const rel of CANON) {
    const full = path.join(memDir, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      map.set(
        `docs/agent-memory/${rel}`,
        sha256(stripBom(fs.readFileSync(full, "utf8"))),
      );
    }
  }
  const reqRoot = path.join(memDir, "02-requirements");
  if (fs.existsSync(reqRoot)) {
    for (const id of fs.readdirSync(reqRoot)) {
      if (!/^R-\d{4}$/.test(id)) continue;
      for (const f of REQ_FILES) {
        const full = path.join(reqRoot, id, f);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          map.set(
            `docs/agent-memory/02-requirements/${id}/${f}`,
            sha256(stripBom(fs.readFileSync(full, "utf8"))),
          );
        }
      }
    }
  }
  const decDir = path.join(memDir, "06-decisions");
  if (fs.existsSync(decDir)) {
    for (const f of fs.readdirSync(decDir)) {
      if (!/^ADR-\d{4}-/.test(f) || !f.endsWith(".md")) continue;
      const full = path.join(decDir, f);
      map.set(
        `docs/agent-memory/06-decisions/${f}`,
        sha256(stripBom(fs.readFileSync(full, "utf8"))),
      );
    }
  }
  return map;
};

export async function cmdVerifyPack(
  opts: VerifyPackOptions,
): Promise<DriftReport> {
  const root = path.resolve(opts.cwd);
  const packPath = path.resolve(root, opts.pack);
  if (!fs.existsSync(packPath)) {
    fail(`pack not found: ${packPath}`);
    throw new Error("pack-not-found");
  }
  const memDir = path.join(root, "docs", "agent-memory");
  const raw = stripBom(fs.readFileSync(packPath, "utf8"));
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = JSON.parse(lines[0]!) as PackHeader & { generatedAt?: string };
  if (header.kind !== "context-pack-header") {
    fail(`not a context-pack JSONL: ${packPath}`);
    throw new Error("not-a-pack");
  }
  const expected = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const rec = JSON.parse(line) as PackRecord;
    if (typeof rec.path === "string" && typeof rec.sha256 === "string") {
      expected.set(rec.path, rec.sha256);
    }
  }

  const actual = enumerateOnDisk(memDir);
  const report: DriftReport = {
    pack: path.relative(root, packPath).replace(/\\/g, "/"),
    ...(header.generatedAt ? { generatedAt: header.generatedAt } : {}),
    totals: { unchanged: 0, changed: 0, removed: 0, added: 0 },
    changed: [],
    removed: [],
    added: [],
  };
  for (const [p, hash] of expected) {
    const a = actual.get(p);
    if (!a) {
      report.removed.push(p);
      report.totals.removed += 1;
    } else if (a !== hash) {
      report.changed.push({ path: p, expected: hash, actual: a });
      report.totals.changed += 1;
    } else {
      report.totals.unchanged += 1;
    }
  }
  for (const p of actual.keys()) {
    if (!expected.has(p)) {
      report.added.push(p);
      report.totals.added += 1;
    }
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    info(
      `verify-pack: unchanged=${report.totals.unchanged} changed=${report.totals.changed} removed=${report.totals.removed} added=${report.totals.added}`,
    );
    for (const c of report.changed) info(`  ~ ${c.path}`);
    for (const r of report.removed) info(`  - ${r}`);
    for (const a of report.added) info(`  + ${a}`);
    if (
      report.totals.changed === 0 &&
      report.totals.removed === 0 &&
      (!opts.strict || report.totals.added === 0)
    ) {
      ok("pack matches on-disk memory");
    } else {
      log.err("pack drift detected");
      warn("Run 'ai-sdlc context-pack' to refresh after intentional updates");
    }
  }
  if (
    report.totals.changed > 0 ||
    report.totals.removed > 0 ||
    (opts.strict && report.totals.added > 0)
  ) {
    process.exitCode = 1;
  }
  return report;
}
