#!/usr/bin/env node
/**
 * .github/scripts/agent-memory-hash-check.mjs
 *
 * Verifies (and with --rebuild updates) the per-artifact sha256 anchors
 * recorded in docs/agent-memory/index.json under
 * `requirements.items[].artifacts[]` and `decisions.items[]`.
 *
 * The shape it expects on each artifact entry is:
 *   { "path": "docs/agent-memory/...", "sha256": "<64hex>" }
 *
 * Modes:
 *   default       Read-only; fail with diff on drift.
 *   --rebuild     Recompute all hashes and overwrite index.json
 *                 (preserves field order via JSON parse + stable stringify).
 *   --json        Emit JSON drift report on stdout.
 *
 * This is a Pillar-5 (hash-anchored memory) enforcement.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = new Set(process.argv.slice(2));
const REBUILD = args.has("--rebuild");
const JSON_OUT = args.has("--json");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const indexPath = "docs/agent-memory/index.json";
if (!fs.existsSync(indexPath)) {
  console.error(`${RED}✗${RESET} ${indexPath} missing`);
  process.exit(1);
}

const stripBom = (s) => s.replace(/^\uFEFF/, "");
const sha256OfFile = (p) =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const idx = JSON.parse(stripBom(fs.readFileSync(indexPath, "utf8")));

const drift = [];
const visit = (entry, owner) => {
  if (!entry || typeof entry !== "object") return;
  if (typeof entry.path === "string" && /sha256/i.test(JSON.stringify(entry))) {
    if (!fs.existsSync(entry.path)) {
      drift.push({
        owner,
        path: entry.path,
        reason: "MISSING",
        recorded: entry.sha256,
        actual: null,
      });
      return;
    }
    const have = sha256OfFile(entry.path);
    if (entry.sha256 && entry.sha256 !== have) {
      drift.push({
        owner,
        path: entry.path,
        reason: "DRIFT",
        recorded: entry.sha256,
        actual: have,
      });
    }
    if (REBUILD) entry.sha256 = have;
  }
};

const reqs = idx?.requirements?.items || [];
for (const r of reqs) {
  const owner = r.id || "(req)";
  for (const a of r.artifacts || []) visit(a, owner);
}
const decs = idx?.decisions?.items || [];
for (const d of decs) visit(d, d.id || "(adr)");

if (REBUILD) {
  fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2) + "\n", "utf8");
  console.log(`${GREEN}✓${RESET} rebuilt sha256 anchors in ${indexPath}`);
  process.exit(0);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ drift }, null, 2));
  process.exit(drift.length === 0 ? 0 : 1);
}

if (drift.length === 0) {
  console.log(`${GREEN}✓${RESET} hash anchors clean`);
  process.exit(0);
}

console.error(
  `${RED}✗${RESET} ${drift.length} hash anchor drift${drift.length === 1 ? "" : "s"}:\n`,
);
for (const d of drift) {
  console.error(
    `  ${YELLOW}${d.owner}${RESET}  ${d.path}  ${d.reason}` +
      (d.recorded ? `  recorded=${d.recorded.slice(0, 12)}…` : "") +
      (d.actual ? `  actual=${d.actual.slice(0, 12)}…` : ""),
  );
}
console.error(
  `\nHint: run \`node ${path.basename(process.argv[1])} --rebuild\` after human review, or fix the artifact contents.`,
);
process.exit(1);
