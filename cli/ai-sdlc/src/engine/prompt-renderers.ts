import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { Vendor } from "../types.js";

/**
 * Vendor-neutral PROMPT renderers.
 *
 * Source format: `templates/prompts/<id>.prompt.yaml` validated against
 * `templates/prompts/prompt.schema.json`. This loader translates each
 * neutral prompt into the vendor's slash-command/prompt convention.
 */

export interface NeutralPrompt {
  id: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  body: string;
  model_hint?: string;
  tools?: string[];
}

const stripBom = (s: string): string => s.replace(/^\uFEFF/, "");

export const loadPrompts = (templatesDir: string): NeutralPrompt[] => {
  if (!fs.existsSync(templatesDir)) return [];
  const out: NeutralPrompt[] = [];
  for (const f of fs.readdirSync(templatesDir)) {
    if (!f.endsWith(".prompt.yaml")) continue;
    const raw = stripBom(fs.readFileSync(path.join(templatesDir, f), "utf8"));
    const obj = yaml.load(raw) as NeutralPrompt;
    if (!obj?.id || !obj?.title || !obj?.body) continue;
    out.push(obj);
  }
  return out;
};

const writeFile = (root: string, rel: string, content: string): string => {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return rel;
};

interface PromptRenderer {
  vendor: Vendor;
  render(prompts: NeutralPrompt[], targetRoot: string): string[];
}

/* Copilot: .github/prompts/<id>.prompt.md with frontmatter */
const copilot: PromptRenderer = {
  vendor: "copilot",
  render(prompts, root) {
    const written: string[] = [];
    for (const p of prompts) {
      const fm = yaml
        .dump({ description: p.description }, { lineWidth: 120 })
        .trimEnd();
      const out = `---\n${fm}\n---\n\n# ${p.title}\n\n${p.body.trimEnd()}\n`;
      written.push(writeFile(root, `.github/prompts/${p.id}.prompt.md`, out));
    }
    return written;
  },
};

/* Claude Code: .claude/commands/<id>.md */
const claude: PromptRenderer = {
  vendor: "claude-code",
  render(prompts, root) {
    const written: string[] = [];
    for (const p of prompts) {
      const out = `# ${p.title}\n\n${p.description}\n\n${p.body.trimEnd()}\n`;
      written.push(writeFile(root, `.claude/commands/${p.id}.md`, out));
    }
    return written;
  },
};

/* Cursor: .cursor/commands/<id>.md (community convention) */
const cursor: PromptRenderer = {
  vendor: "cursor",
  render(prompts, root) {
    const written: string[] = [];
    for (const p of prompts) {
      const out = `# ${p.title}\n\n${p.description}\n\n${p.body.trimEnd()}\n`;
      written.push(writeFile(root, `.cursor/commands/${p.id}.md`, out));
    }
    return written;
  },
};

/* Aider: append to AIDER_CONVENTIONS.md as labeled sections */
const aider: PromptRenderer = {
  vendor: "aider",
  render(prompts, root) {
    if (!prompts.length) return [];
    const sections = prompts
      .map(
        (p) =>
          `## /${p.id} — ${p.title}\n\n${p.description}\n\n${p.body.trim()}\n`,
      )
      .join("\n");
    const file = path.join(root, "AIDER_CONVENTIONS.md");
    const prev = fs.existsSync(file)
      ? stripBom(fs.readFileSync(file, "utf8"))
      : "";
    const next =
      prev + (prev ? "\n" : "") + "# Prompts (ai-sdlc)\n\n" + sections;
    fs.writeFileSync(file, next, "utf8");
    return ["AIDER_CONVENTIONS.md"];
  },
};

/* Continue: extend slashCommands in .continue/config.yaml */
const continueR: PromptRenderer = {
  vendor: "continue",
  render(prompts, root) {
    if (!prompts.length) return [];
    const file = path.join(root, ".continue/config.yaml");
    let cfg: Record<string, unknown> = {};
    if (fs.existsSync(file)) {
      cfg =
        (yaml.load(stripBom(fs.readFileSync(file, "utf8"))) as Record<
          string,
          unknown
        >) ?? {};
    }
    const existing = Array.isArray(cfg.slashCommands)
      ? (cfg.slashCommands as unknown[])
      : [];
    const additions = prompts.map((p) => ({
      name: p.id,
      description: p.description,
      prompt: p.body,
    }));
    cfg.slashCommands = [...existing, ...additions];
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, yaml.dump(cfg, { lineWidth: 120 }), "utf8");
    return [".continue/config.yaml"];
  },
};

/* opencode: .opencode/command/<id>.md */
const opencode: PromptRenderer = {
  vendor: "opencode",
  render(prompts, root) {
    const written: string[] = [];
    for (const p of prompts) {
      const fm = yaml
        .dump({ description: p.description }, { lineWidth: 120 })
        .trimEnd();
      const out = `---\n${fm}\n---\n\n# ${p.title}\n\n${p.body.trimEnd()}\n`;
      written.push(writeFile(root, `.opencode/command/${p.id}.md`, out));
    }
    return written;
  },
};

/* Generic MCP: dump as prompts.json */
const genericMcp: PromptRenderer = {
  vendor: "generic-mcp",
  render(prompts, root) {
    if (!prompts.length) return [];
    const file = ".mcp/prompts.json";
    fs.mkdirSync(path.join(root, ".mcp"), { recursive: true });
    fs.writeFileSync(
      path.join(root, file),
      JSON.stringify({ schemaVersion: "1.0", prompts }, null, 2) + "\n",
      "utf8",
    );
    return [file];
  },
};

const RENDERERS: Record<Vendor, PromptRenderer> = {
  copilot,
  "claude-code": claude,
  cursor,
  aider,
  continue: continueR,
  opencode,
  "generic-mcp": genericMcp,
};

export interface PromptRenderResult {
  vendor: Vendor;
  files: string[];
}

export const renderPrompts = (
  prompts: NeutralPrompt[],
  vendors: Vendor[],
  targetRoot: string,
): PromptRenderResult[] =>
  vendors.map((v) => {
    const r = RENDERERS[v];
    if (!r) throw new Error(`Unknown vendor: ${v}`);
    return { vendor: v, files: r.render(prompts, targetRoot) };
  });
