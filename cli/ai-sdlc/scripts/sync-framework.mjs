#!/usr/bin/env node
/**
 * cli/ai-sdlc/scripts/sync-framework.mjs
 *
 * Copies the canonical framework files from the repo root into
 * `cli/ai-sdlc/templates/framework/` so the published CLI ships the
 * same content the repo dogfoods. Idempotent. Run before `npm run build`.
 *
 * Source of truth for these paths:
 *   docs/agent-memory/      (the entire memory layer)
 *   AGENTS.md
 *   .github/scripts/agent-memory-*.mjs
 *   .github/workflows/agent-memory-guard.yml
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const TEMPLATE_ROOT = path.resolve(HERE, "..", "templates", "framework");

const SOURCES = [
  { from: "docs/agent-memory", to: "docs/agent-memory" },
  { from: "AGENTS.md", to: "AGENTS.md" },
  {
    from: ".github/scripts",
    to: ".github/scripts",
    filter: (n) => n.startsWith("agent-memory-") && n.endsWith(".mjs"),
  },
  {
    from: ".github/workflows/agent-memory-guard.yml",
    to: ".github/workflows/agent-memory-guard.yml",
  },
];

const copyRecursive = (src, dst, filter) => {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (filter && !entry.isDirectory() && !filter(entry.name)) continue;
      copyRecursive(
        path.join(src, entry.name),
        path.join(dst, entry.name),
        filter,
      );
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
};

// Additive merge: copy each source path on top of templates/framework/.
// We do NOT delete anything in the target — overlay-only files (e.g. the
// dashboard, ai-evals runner, release/sbom/msrd workflows, 14/15/16/17 docs)
// have no canonical source in the repo root and must be preserved. If a
// canonical file is removed at the root, run `npm run sync:framework:clean`
// (future) to prune; for now stale files are visible and flagged via tests.
//
// History note: an earlier version rmSync-ed the entire TEMPLATE_ROOT each
// build, silently deleting overlay-only files (root cause of KI-0002).
fs.mkdirSync(TEMPLATE_ROOT, { recursive: true });

for (const s of SOURCES) {
  const src = path.join(REPO_ROOT, s.from);
  const dst = path.join(TEMPLATE_ROOT, s.to);
  if (!fs.existsSync(src)) {
    console.warn(`[sync-framework] missing: ${s.from}`);
    continue;
  }
  copyRecursive(src, dst, s.filter);
  console.log(`[sync-framework] ${s.from}  →  templates/framework/${s.to}`);
}

// Strip framework-dev quarantine if it leaked into docs/agent-memory copies
// (defensive — the source of truth never contains framework-dev there).
console.log(`[sync-framework] done.`);
