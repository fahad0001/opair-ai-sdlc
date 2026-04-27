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
import yaml from "js-yaml";

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
  // Real SDLC agents/prompts/instructions used by AI tools in scaffolded
  // projects. These live in the repo root .github/ and must be shipped
  // verbatim so consumers get the same agents this repo dogfoods.
  { from: ".github/agents", to: ".github/agents" },
  { from: ".github/prompts", to: ".github/prompts" },
  {
    from: ".github/copilot-instructions.md",
    to: ".github/copilot-instructions.md",
  },
  // Optional: scoped instructions (Copilot-style) if present.
  {
    from: ".github/instructions",
    to: ".github/instructions",
    optional: true,
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
    if (s.optional) continue;
    console.warn(`[sync-framework] missing: ${s.from}`);
    continue;
  }
  copyRecursive(src, dst, s.filter);
  console.log(`[sync-framework] ${s.from}  →  templates/framework/${s.to}`);
}

// Strip framework-dev quarantine if it leaked into docs/agent-memory copies
// (defensive — the source of truth never contains framework-dev there).

// ---------------------------------------------------------------------------
// Auto-derive neutral agent YAMLs from `.github/agents/*.agent.md`.
//
// The Markdown agents are the canonical source of truth (used by Copilot
// directly). Vendor renderers (Cursor, Claude, Aider, Continue, opencode,
// MCP) consume the neutral YAML form. Rather than hand-maintaining both,
// we generate the neutrals here so they never drift.
// ---------------------------------------------------------------------------

const AGENT_MD_DIR = path.join(REPO_ROOT, ".github", "agents");
const AGENT_YAML_DIR = path.resolve(HERE, "..", "templates", "agents");

// Map filename id → allowed neutral schema role. Unmapped ids fall back
// to "custom".
const ROLE_MAP = {
  init: "init",
  plan: "plan",
  process: "process",
  execution: "execution",
  evaluation: "evaluation",
  finalization: "finalization",
  verify: "verify",
  orchestrator: "orchestrator",
  "audit-meta": "audit",
  architect: "architect",
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
// Strip the literal trailing AHC marker comment that source agent
// .md files leave at the bottom (renderers inject the real block).
// Matches both the actual AHC block AND the placeholder marker line.
const AHC_BLOCK_RE =
  /\r?\n---\r?\n+(?:<!-- AHC:BEGIN -->[\s\S]*?<!-- AHC:END -->|`?<!-- AHC:BEGIN -->`?[^\n]*`?<!-- AHC:END -->`?)\r?\n*$/;

const normalizeNewlines = (s) => s.replace(/\r\n/g, "\n");

const deriveNeutralYamls = () => {
  if (!fs.existsSync(AGENT_MD_DIR)) {
    console.warn(`[sync-framework] no .github/agents/ in repo; skip derive`);
    return;
  }
  fs.mkdirSync(AGENT_YAML_DIR, { recursive: true });
  for (const f of fs.readdirSync(AGENT_MD_DIR)) {
    if (!f.endsWith(".agent.md")) continue;
    const id = f.replace(/\.agent\.md$/, "");
    const raw = fs.readFileSync(path.join(AGENT_MD_DIR, f), "utf8");
    const m = raw.match(FRONTMATTER_RE);
    if (!m) {
      console.warn(`[sync-framework] no frontmatter in ${f}; skip`);
      continue;
    }
    const fm = yaml.load(m[1]) ?? {};
    const body = normalizeNewlines(m[2]).replace(AHC_BLOCK_RE, "").trimEnd();
    const neutral = {
      id,
      name: fm.name ?? id,
      role: ROLE_MAP[id] ?? "custom",
      description: fm.description ?? "",
      ...(fm["argument-hint"] ? { argumentHint: fm["argument-hint"] } : {}),
      tools: Array.isArray(fm.tools) ? fm.tools : [],
      handoffs: Array.isArray(fm.handoffs)
        ? fm.handoffs.map((h) => ({
            label: h.label ?? "",
            agent: h.agent ?? "",
            prompt: h.prompt ?? "",
            send: h.send === true,
          }))
        : [],
      ahcBlock: true,
      body,
    };
    const out = yaml.dump(neutral, { lineWidth: 120, noRefs: true });
    const dst = path.join(AGENT_YAML_DIR, `${id}.agent.yaml`);
    fs.writeFileSync(dst, out, "utf8");
    console.log(
      `[sync-framework] derive .github/agents/${f}  →  templates/agents/${id}.agent.yaml`,
    );
  }
};

deriveNeutralYamls();

// ---------------------------------------------------------------------------
// Auto-derive neutral prompt YAMLs from `.github/prompts/*.prompt.md`.
//
// Prompts are simpler: name, description, optional argument-hint,
// optional agent target, plus a Markdown body.
// ---------------------------------------------------------------------------

const PROMPT_MD_DIR = path.join(REPO_ROOT, ".github", "prompts");
const PROMPT_YAML_DIR = path.resolve(HERE, "..", "templates", "prompts");

const derivePromptYamls = () => {
  if (!fs.existsSync(PROMPT_MD_DIR)) return;
  fs.mkdirSync(PROMPT_YAML_DIR, { recursive: true });
  // Remove generic stub prompts (explain-code/review-pr/write-test) that
  // are not part of the SDLC pipeline. Keep prompt.schema.json.
  for (const f of fs.readdirSync(PROMPT_YAML_DIR)) {
    if (
      [
        "explain-code.prompt.yaml",
        "review-pr.prompt.yaml",
        "write-test.prompt.yaml",
      ].includes(f)
    ) {
      fs.unlinkSync(path.join(PROMPT_YAML_DIR, f));
      console.log(
        `[sync-framework] removed stub prompt templates/prompts/${f}`,
      );
    }
  }
  for (const f of fs.readdirSync(PROMPT_MD_DIR)) {
    if (!f.endsWith(".prompt.md")) continue;
    const id = f.replace(/\.prompt\.md$/, "");
    const raw = fs.readFileSync(path.join(PROMPT_MD_DIR, f), "utf8");
    const m = raw.match(FRONTMATTER_RE);
    if (!m) continue;
    const fm = yaml.load(m[1]) ?? {};
    const body = normalizeNewlines(m[2]).trimEnd();
    const obj = {
      id,
      title: fm.name ?? id,
      description: fm.description ?? "",
      category: "sdlc",
      body,
      ...(fm.tags ? { tags: Array.isArray(fm.tags) ? fm.tags : [] } : {}),
    };
    const out = yaml.dump(obj, { lineWidth: 120, noRefs: true });
    const dst = path.join(PROMPT_YAML_DIR, `${id}.prompt.yaml`);
    fs.writeFileSync(dst, out, "utf8");
    console.log(
      `[sync-framework] derive .github/prompts/${f}  →  templates/prompts/${id}.prompt.yaml`,
    );
  }
};

derivePromptYamls();

console.log(`[sync-framework] done.`);
