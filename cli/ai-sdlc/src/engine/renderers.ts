import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { NeutralAgent } from "./agent-yaml.js";
import type { Vendor } from "../types.js";

/**
 * Vendor renderers — translate a NeutralAgent into a vendor-specific
 * file format. New vendors are added by registering a renderer here;
 * this is the canonical extension point.
 *
 * Outputs land under `<targetRoot>/<renderer.outputDir>/...`.
 *
 * AHC block: every renderer MUST include the Anti-Hallucination block
 * verbatim from `docs/agent-memory/anti-hallucination-block.md` when
 * the neutral agent has `ahcBlock: true` (the default).
 */

export interface RenderContext {
  /** Project root being scaffolded into. */
  targetRoot: string;
  /** Verbatim AHC block (between markers, inclusive). */
  ahcBlock: string;
}

export interface RenderResult {
  vendor: Vendor;
  files: string[];
}

interface VendorRenderer {
  vendor: Vendor;
  /** Render and write all files for this vendor; return paths written (relative to targetRoot). */
  render(agents: NeutralAgent[], ctx: RenderContext): string[];
}

const ensureDir = (p: string) => fs.mkdirSync(p, { recursive: true });

const writeFile = (root: string, rel: string, content: string): string => {
  const abs = path.join(root, rel);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, content, "utf8");
  return rel;
};

/**
 * Additive write: only emit if the file does not already exist in the
 * target. Used so that vendor renderers do not clobber files copied
 * verbatim from `templates/framework/` (e.g. the real SDLC agents
 * synced from the source repo). Returns the rel path if written, or
 * `null` if the file already existed.
 */
const writeFileIfMissing = (
  root: string,
  rel: string,
  content: string,
): string | null => {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) return null;
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, content, "utf8");
  return rel;
};

/* ------------------------- Copilot ----------------------------- */
/**
 * GitHub Copilot ingests:
 *  - .github/copilot-instructions.md (workspace-wide)
 *  - .github/agents/<id>.agent.md (agent-mode subagents w/ frontmatter)
 *  - .github/instructions/*.instructions.md (scoped, with applyTo)
 *
 * We emit the per-agent files with YAML frontmatter and the Markdown
 * body, then a top-level copilot-instructions.md with framework rules.
 *
 * IMPORTANT: This renderer is ADDITIVE — it never overwrites a file
 * that already exists in the target. The canonical agents+instructions
 * are shipped via `templates/framework/.github/` (synced from the
 * source repo) and copied first by the scaffolder. The renderer fills
 * gaps for agents/prompts that have no canonical Markdown shipped.
 */
const copilotRenderer: VendorRenderer = {
  vendor: "copilot",
  render(agents, ctx) {
    const written: string[] = [];
    for (const a of agents) {
      const fm: Record<string, unknown> = {
        name: a.name,
        description: a.description,
        tools: a.tools,
      };
      if (a.handoffs.length) fm.handoffs = a.handoffs;
      if (a.argumentHint) fm["argument-hint"] = a.argumentHint;
      const frontmatter = yaml.dump(fm, { lineWidth: 120 }).trimEnd();
      const body = a.ahcBlock
        ? `${a.body.trimEnd()}\n\n---\n\n${ctx.ahcBlock}\n`
        : `${a.body.trimEnd()}\n`;
      const out = `---\n${frontmatter}\n---\n\n${body}`;
      const rel = writeFileIfMissing(
        ctx.targetRoot,
        `.github/agents/${a.id}.agent.md`,
        out,
      );
      if (rel) written.push(rel);
    }
    // Workspace-wide Copilot instructions: only write if a canonical
    // copilot-instructions.md was not already shipped via the framework
    // template (the real one in the repo is fuller than this stub).
    const ci = [
      "# Copilot Instructions (Workspace)",
      "",
      "You MUST follow `AGENTS.md` (Agent Operating Contract) and",
      "`docs/agent-memory/00-anti-hallucination-charter.md` (binding).",
      "",
      "Use the agents under `.github/agents/` to drive the SDLC pipeline.",
    ].join("\n");
    const ciRel = writeFileIfMissing(
      ctx.targetRoot,
      ".github/copilot-instructions.md",
      ci + "\n",
    );
    if (ciRel) written.push(ciRel);
    return written;
  },
};

/* ------------------------- Claude Code ------------------------- */
/**
 * Claude Code reads:
 *  - CLAUDE.md (system instructions for the workspace)
 *  - .claude/agents/<id>.md (sub-agents with `name`, `description`)
 *  - .claude/commands/*.md (slash commands, optional)
 */
const claudeCodeRenderer: VendorRenderer = {
  vendor: "claude-code",
  render(agents, ctx) {
    const written: string[] = [];
    for (const a of agents) {
      const body = a.ahcBlock
        ? `${a.body.trimEnd()}\n\n---\n\n${ctx.ahcBlock}\n`
        : `${a.body.trimEnd()}\n`;
      const out = [
        "---",
        `name: ${a.name}`,
        `description: ${JSON.stringify(a.description)}`,
        "---",
        "",
        body,
      ].join("\n");
      written.push(writeFile(ctx.targetRoot, `.claude/agents/${a.id}.md`, out));
    }
    const claudeMd = [
      "# Workspace Instructions",
      "",
      "Follow `AGENTS.md` and",
      "`docs/agent-memory/00-anti-hallucination-charter.md` strictly.",
      "Sub-agents live under `.claude/agents/`.",
      "",
    ].join("\n");
    written.push(writeFile(ctx.targetRoot, "CLAUDE.md", claudeMd));
    return written;
  },
};

/* ------------------------- Cursor ------------------------------ */
/**
 * Cursor reads .cursor/rules/*.mdc with frontmatter (`description`,
 * `globs`, `alwaysApply`). One rule per neutral agent + one master
 * rule for the AHC.
 */
const cursorRenderer: VendorRenderer = {
  vendor: "cursor",
  render(agents, ctx) {
    const written: string[] = [];
    for (const a of agents) {
      const body = a.ahcBlock
        ? `${a.body.trimEnd()}\n\n---\n\n${ctx.ahcBlock}\n`
        : `${a.body.trimEnd()}\n`;
      const out = [
        "---",
        `description: ${JSON.stringify(a.description)}`,
        "alwaysApply: false",
        "---",
        "",
        body,
      ].join("\n");
      written.push(writeFile(ctx.targetRoot, `.cursor/rules/${a.id}.mdc`, out));
    }
    const ahc = [
      "---",
      'description: "Anti-Hallucination Charter binding rules"',
      "alwaysApply: true",
      "---",
      "",
      ctx.ahcBlock,
      "",
    ].join("\n");
    written.push(
      writeFile(ctx.targetRoot, ".cursor/rules/00-anti-hallucination.mdc", ahc),
    );
    return written;
  },
};

/* ------------------------- Aider ------------------------------- */
/**
 * Aider reads `.aider.conf.yml` and a project conventions file
 * (.aider.context.md by convention). We emit a combined CONVENTIONS.md
 * referenced from the conf.
 */
const aiderRenderer: VendorRenderer = {
  vendor: "aider",
  render(agents, ctx) {
    const written: string[] = [];
    const sections = agents.map(
      (a) => `## ${a.name}\n\n${a.description}\n\n${a.body.trimEnd()}`,
    );
    const md = [
      "# Aider Conventions (auto-generated by ai-sdlc)",
      "",
      "This file aggregates the ai-sdlc framework's neutral agent",
      "definitions for the Aider AI coding assistant. Do not edit by hand;",
      "regenerate via `ai-sdlc repair`.",
      "",
      ctx.ahcBlock,
      "",
      ...sections,
      "",
    ].join("\n");
    written.push(writeFile(ctx.targetRoot, "AIDER_CONVENTIONS.md", md));
    const conf = yaml.dump(
      {
        read: ["AIDER_CONVENTIONS.md", "AGENTS.md"],
        "auto-commits": false,
      },
      { lineWidth: 120 },
    );
    written.push(writeFile(ctx.targetRoot, ".aider.conf.yml", conf));
    return written;
  },
};

/* ------------------------- Continue ---------------------------- */
/**
 * Continue reads `.continue/config.yaml` and supports custom slash
 * commands + system messages. We emit a config that pins the AHC and
 * registers each agent as a system-prompt-style entry.
 */
const continueRenderer: VendorRenderer = {
  vendor: "continue",
  render(agents, ctx) {
    const config = {
      name: "ai-sdlc workspace",
      systemMessage:
        "Follow AGENTS.md and docs/agent-memory/00-anti-hallucination-charter.md.",
      contextProviders: [
        { name: "file" },
        { name: "code" },
        { name: "diff" },
        { name: "terminal" },
      ],
      slashCommands: agents.map((a) => ({
        name: a.id,
        description: a.description,
        prompt: `${a.body.trim()}\n\n${ctx.ahcBlock}`,
      })),
    };
    return [
      writeFile(
        ctx.targetRoot,
        ".continue/config.yaml",
        yaml.dump(config, { lineWidth: 120 }),
      ),
    ];
  },
};

/* ------------------------- opencode ---------------------------- */
/**
 * opencode (sst.dev/opencode-ai) reads:
 *  - `opencode.json` for project config (mode, agents reference)
 *  - `.opencode/agent/<id>.md` markdown agent definitions with
 *    YAML frontmatter (`description`, `tools`, `mode`)
 *  - `.opencode/command/<id>.md` for slash commands
 *  - `AGENTS.md` is also natively respected.
 */
const opencodeRenderer: VendorRenderer = {
  vendor: "opencode",
  render(agents, ctx) {
    const written: string[] = [];
    for (const a of agents) {
      const fm: Record<string, unknown> = {
        description: a.description,
        mode: "subagent",
      };
      if (a.tools && a.tools.length) fm.tools = a.tools;
      const frontmatter = yaml.dump(fm, { lineWidth: 120 }).trimEnd();
      const body = a.ahcBlock
        ? `${a.body.trimEnd()}\n\n---\n\n${ctx.ahcBlock}\n`
        : `${a.body.trimEnd()}\n`;
      const out = `---\n${frontmatter}\n---\n\n# ${a.name}\n\n${body}`;
      written.push(
        writeFile(ctx.targetRoot, `.opencode/agent/${a.id}.md`, out),
      );
    }
    const cfg = {
      $schema: "https://opencode.ai/config.json",
      instructions: [
        "AGENTS.md",
        "docs/agent-memory/00-anti-hallucination-charter.md",
      ],
    };
    written.push(
      writeFile(
        ctx.targetRoot,
        "opencode.json",
        JSON.stringify(cfg, null, 2) + "\n",
      ),
    );
    return written;
  },
};

/* ------------------------- Generic MCP ------------------------- */
/**
 * Vendor-neutral output: emits one `agents.json` consumable by any MCP
 * client and a stdio MCP server stub script reference.
 */
const genericMcpRenderer: VendorRenderer = {
  vendor: "generic-mcp",
  render(agents, ctx) {
    const out = {
      schemaVersion: "1.0",
      generatedBy: "ai-sdlc",
      ahc: ctx.ahcBlock,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        role: a.role,
        tools: a.tools,
        body: a.body,
      })),
    };
    return [
      writeFile(
        ctx.targetRoot,
        ".mcp/agents.json",
        JSON.stringify(out, null, 2) + "\n",
      ),
    ];
  },
};

const ALL_RENDERERS: Record<Vendor, VendorRenderer> = {
  copilot: copilotRenderer,
  "claude-code": claudeCodeRenderer,
  cursor: cursorRenderer,
  aider: aiderRenderer,
  continue: continueRenderer,
  opencode: opencodeRenderer,
  "generic-mcp": genericMcpRenderer,
};

export const renderAgents = (
  agents: NeutralAgent[],
  vendors: Vendor[],
  ctx: RenderContext,
): RenderResult[] => {
  return vendors.map((v) => {
    const r = ALL_RENDERERS[v];
    if (!r) throw new Error(`Unknown vendor: ${v}`);
    return { vendor: v, files: r.render(agents, ctx) };
  });
};

/** Read the AHC block from the framework template that was scaffolded. */
export const readAhcBlock = (targetRoot: string): string => {
  const p = path.join(
    targetRoot,
    "docs",
    "agent-memory",
    "anti-hallucination-block.md",
  );
  if (!fs.existsSync(p)) {
    throw new Error(
      `AHC block not found at ${p}. Scaffold the framework template first.`,
    );
  }
  const src = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  const b = src.indexOf("<!-- AHC:BEGIN -->");
  const e = src.indexOf("<!-- AHC:END -->");
  if (b === -1 || e === -1)
    throw new Error("AHC markers missing in source block file.");
  return src.slice(b, e + "<!-- AHC:END -->".length);
};
