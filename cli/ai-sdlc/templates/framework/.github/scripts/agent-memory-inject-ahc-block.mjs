#!/usr/bin/env node
/**
 * .github/scripts/agent-memory-inject-ahc-block.mjs
 *
 * Idempotently injects the Anti-Hallucination Charter block into every
 * .github/agents/*.agent.md file between
 *   <!-- AHC:BEGIN --> ... <!-- AHC:END -->
 * markers. The block content is sourced from
 * docs/agent-memory/anti-hallucination-block.md (between the same
 * markers in that file).
 *
 * Behaviour:
 *  - If markers are absent, appends the block at the end of the agent
 *    file under a "## Anti-Hallucination Operating Rules" section.
 *  - If markers are present, replaces the body between them.
 *
 * The CLI's `agent-mem repair` will call this. CI's AHC linter detects
 * drift; this script fixes it.
 */

import fs from "node:fs";
import path from "node:path";

const SOURCE = "docs/agent-memory/anti-hallucination-block.md";
const AGENTS_DIR = ".github/agents";
const BEGIN = "<!-- AHC:BEGIN -->";
const END = "<!-- AHC:END -->";

const stripBom = (s) => s.replace(/^\uFEFF/, "");

if (!fs.existsSync(SOURCE)) {
  console.error(`✗ source not found: ${SOURCE}`);
  process.exit(1);
}

const src = stripBom(fs.readFileSync(SOURCE, "utf8"));
const b = src.indexOf(BEGIN);
const e = src.indexOf(END);
if (b === -1 || e === -1 || e < b) {
  console.error(`✗ source ${SOURCE} has no AHC:BEGIN/END markers`);
  process.exit(1);
}
// Include the markers themselves.
const block = src.slice(b, e + END.length);

if (!fs.existsSync(AGENTS_DIR)) {
  console.log(`(no ${AGENTS_DIR} — nothing to do)`);
  process.exit(0);
}

let changed = 0;
const files = fs
  .readdirSync(AGENTS_DIR)
  .filter((f) => f.endsWith(".agent.md"))
  .map((f) => path.join(AGENTS_DIR, f));

for (const f of files) {
  const before = stripBom(fs.readFileSync(f, "utf8"));
  let after;
  const hasBegin = before.indexOf(BEGIN) !== -1;
  const hasEnd = before.indexOf(END) !== -1;
  if (hasBegin && hasEnd && before.indexOf(END) > before.indexOf(BEGIN)) {
    const i = before.indexOf(BEGIN);
    const j = before.indexOf(END) + END.length;
    after = before.slice(0, i) + block + before.slice(j);
  } else {
    const sep = before.endsWith("\n") ? "" : "\n";
    after = `${before}${sep}\n---\n\n${block}\n`;
  }
  if (after !== before) {
    fs.writeFileSync(f, after, "utf8");
    console.log(`✓ injected AHC block: ${f}`);
    changed++;
  } else {
    console.log(`= already current: ${f}`);
  }
}

console.log(`done. ${changed} file${changed === 1 ? "" : "s"} updated.`);
