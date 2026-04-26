#!/usr/bin/env node
/**
 * .github/scripts/agent-memory-evidence-check.mjs
 *
 * Anti-Hallucination Charter (AHC) enforcement linter.
 *
 * Two modes (run independently in CI):
 *
 *   --forbidden    Scans canonical artifacts for hedging/speculative
 *                  language outside permitted zones. Exits 1 on hits.
 *   --citations    Scans canonical artifacts for [evidence: ...] /
 *                  inline citation tokens that reference files; verifies
 *                  the cited paths exist and (when sha256 is present)
 *                  that hashes match.
 *   --ahc-block    Verifies every .github/agents/*.agent.md contains
 *                  an unmodified anti-hallucination block.
 *
 * Default (no flag): runs all three.
 *
 * Exit codes: 0 = clean, 1 = violation(s) found.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const args = new Set(process.argv.slice(2));
const runAll = args.size === 0;
const runForbidden = runAll || args.has("--forbidden");
const runCitations = runAll || args.has("--citations");
const runAhcBlock = runAll || args.has("--ahc-block");

let violations = 0;
const log = (msg) => console.log(msg);
const violate = (msg) => {
  console.error(`${RED}✗${RESET} ${msg}`);
  violations++;
};
const ok = (msg) => console.log(`${GREEN}✓${RESET} ${msg}`);
const note = (msg) => console.log(`${DIM}  ${msg}${RESET}`);

const sha256 = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");

const readUtf8 = (p) => fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

const walk = (dir, filter) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        // skip vendored / generated trees
        if (
          ["node_modules", "dist", "build", ".git", "coverage"].includes(e.name)
        )
          continue;
        stack.push(p);
      } else if (filter(p)) out.push(p);
    }
  }
  return out;
};

/* -------------------- 1. Forbidden phrases -------------------- */

// Regex list — case-insensitive, word-boundary where useful.
const FORBIDDEN = [
  { re: /\bI think\b/i, label: "hedging: 'I think'" },
  { re: /\bI believe\b/i, label: "hedging: 'I believe'" },
  { re: /\bprobably\b/i, label: "hedging: 'probably'" },
  { re: /\bshould work\b/i, label: "hedging: 'should work'" },
  { re: /\blikely\b/i, label: "hedging: 'likely'" },
  { re: /\bin most cases\b/i, label: "hedging: 'in most cases'" },
  { re: /\bmodern best practice\b/i, label: "hedging: 'modern best practice'" },
  { re: /\bapproximately\s+\d/i, label: "vague metric: 'approximately N'" },
  { re: /\baround\s+\d/i, label: "vague metric: 'around N'" },
  { re: /\bas an AI\b/i, label: "AI self-reference leakage" },
  {
    re: /\bas a (large )?language model\b/i,
    label: "AI self-reference leakage",
  },
  { re: /\bI cannot\b/i, label: "AI refusal leakage in canonical doc" },
];

// Files allowed to contain hedging (speculative zones):
const HEDGE_ALLOWLIST = [
  /\brisks\.md$/,
  /\bopen-questions\.md$/,
  /docs[\/\\]agent-memory[\/\\]00-anti-hallucination-charter\.md$/,
  /docs[\/\\]agent-memory[\/\\]anti-hallucination-block\.md$/,
  /docs[\/\\]agent-memory[\/\\]00-templates[\/\\]/,
  /docs[\/\\]agent-memory[\/\\]05-evaluation[\/\\]_templates[\/\\]/,
  /docs[\/\\]agent-memory[\/\\]03-plans[\/\\]_templates[\/\\]/,
  /docs[\/\\]agent-memory[\/\\]06-decisions[\/\\]ADR-template\.md$/,
  /[\/\\]README\.md$/,
];

const isAllowlisted = (p) => HEDGE_ALLOWLIST.some((re) => re.test(p));

if (runForbidden) {
  log(`${YELLOW}— Forbidden-phrases scan —${RESET}`);
  const targets = walk("docs/agent-memory", (p) => p.endsWith(".md"));
  let hits = 0;
  for (const file of targets) {
    if (isAllowlisted(file)) continue;
    const content = readUtf8(file);
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const { re, label } of FORBIDDEN) {
        if (re.test(line)) {
          violate(`${file}:${i + 1}  ${label}`);
          note(`     ${line.trim().slice(0, 120)}`);
          hits++;
        }
      }
    });
  }
  if (hits === 0) ok("no forbidden phrases in canonical docs");
}

/* -------------------- 2. Citation existence + sha256 ----------- */

// Match [evidence: <path>[#L<a>-L<b>]?[@sha256:<hex>]?] tokens.
// Permissive: accepts any of those modifiers in any order separated by
// '|' or ',' or '@'. Designed to be future-extensible.
//
// Example accepted:
//   [evidence: docs/agent-memory/index.json @sha256:abc..def]
//   [evidence: src/foo.ts#L10-L20]
//
const EV_RE = /\[evidence:\s*([^\]\s]+)((?:\s*[#@,|][^\]]+)?)\]/g;

const parseEvidenceAttrs = (rest) => {
  const attrs = {};
  // line range
  const lr = rest.match(/#L(\d+)-L(\d+)/);
  if (lr) attrs.lineRange = [Number(lr[1]), Number(lr[2])];
  // sha256
  const h = rest.match(/sha256:([a-f0-9]{64})/i);
  if (h) attrs.sha256 = h[1].toLowerCase();
  return attrs;
};

if (runCitations) {
  log(`${YELLOW}— Citation existence + sha256 scan —${RESET}`);
  const targets = walk("docs/agent-memory", (p) => p.endsWith(".md"));
  let hits = 0;
  let cited = 0;
  for (const file of targets) {
    const content = readUtf8(file);
    let m;
    EV_RE.lastIndex = 0;
    while ((m = EV_RE.exec(content)) !== null) {
      cited++;
      const ref = m[1].trim();
      const rest = m[2] || "";
      const attrs = parseEvidenceAttrs(rest);
      const lineNo = content.slice(0, m.index).split(/\r?\n/).length;
      // skip remote/web refs
      if (/^https?:\/\//i.test(ref)) continue;
      const target = path.resolve(ref.replace(/^\.?[\/\\]/, ""));
      if (!fs.existsSync(target)) {
        violate(`${file}:${lineNo}  cited path missing: ${ref}`);
        hits++;
        continue;
      }
      if (attrs.sha256) {
        const buf = fs.readFileSync(target);
        const have = crypto.createHash("sha256").update(buf).digest("hex");
        if (have !== attrs.sha256) {
          violate(
            `${file}:${lineNo}  sha256 drift on ${ref}: cited ${attrs.sha256.slice(0, 12)}…, have ${have.slice(0, 12)}…`,
          );
          hits++;
        }
      }
    }
  }
  if (hits === 0)
    ok(
      `citation scan clean (${cited} citation token${cited === 1 ? "" : "s"} verified)`,
    );
}

/* -------------------- 3. AHC block presence in agent prompts ---- */

if (runAhcBlock) {
  log(`${YELLOW}— AHC-block presence scan in .github/agents/ —${RESET}`);
  const dir = ".github/agents";
  if (!fs.existsSync(dir)) {
    ok("no .github/agents/ directory yet — skipping");
  } else {
    const agents = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".agent.md"))
      .map((f) => path.join(dir, f));
    let hits = 0;
    for (const file of agents) {
      const content = readUtf8(file);
      const begin = content.indexOf("<!-- AHC:BEGIN -->");
      const end = content.indexOf("<!-- AHC:END -->");
      if (begin === -1 || end === -1 || end < begin) {
        violate(`${file}  missing or malformed AHC block markers`);
        hits++;
        continue;
      }
    }
    if (hits === 0)
      ok(
        `AHC block present in ${agents.length} agent prompt${agents.length === 1 ? "" : "s"}`,
      );
  }
}

/* -------------------- summary ---------------------------------- */

if (violations > 0) {
  console.error(
    `\n${RED}AHC linter: ${violations} violation${violations === 1 ? "" : "s"}${RESET}`,
  );
  process.exit(1);
}
log(`\n${GREEN}AHC linter: clean${RESET}`);
