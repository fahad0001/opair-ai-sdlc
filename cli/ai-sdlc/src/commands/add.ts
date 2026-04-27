import fs from "node:fs";
import path from "node:path";
import { templatesRoot } from "../engine/template-fs.js";
import { detectFramework } from "../engine/framework-detect.js";
import {
  resolveCapabilities,
  ALL_CAPABILITY_IDS,
  CAPABILITY_CATEGORIES,
  CATEGORY_IDS,
  findCategoryForCapability,
} from "../engine/capabilities.js";
import { loadAllAgents } from "../engine/agent-yaml.js";
import { renderAgents, readAhcBlock } from "../engine/renderers.js";
import { renderPrompts, loadPrompts } from "../engine/prompt-renderers.js";
import { log } from "../util/log.js";
import type { Vendor } from "../types.js";

/**
 * `ai-sdlc add <selector...>` — add capability agents/prompts to an
 * existing framework root after `init`/`create`.
 *
 * A "selector" is either:
 *   - a category id (e.g. `security`)
 *   - a capability id (e.g. `sbom-check`)
 *   - the literal `all` (every capability)
 *
 * Idempotent: existing files are not overwritten unless `--force`.
 */
export interface AddOptions {
  cwd: string;
  selectors: string[];
  force?: boolean;
  /** Override the vendor list (defaults to ai-sdlc.config.json). */
  vendors?: Vendor[];
  /** When true, only print what would be added. */
  dryRun?: boolean;
}

export const cmdAdd = async (opts: AddOptions): Promise<void> => {
  const root = path.resolve(opts.cwd);
  const present = detectFramework(root);
  if (!present.present) {
    throw new Error(
      `No ai-sdlc framework found at ${root}. Run \`ai-sdlc init\` or ` +
        `\`ai-sdlc create\` first.`,
    );
  }
  if (!opts.selectors || opts.selectors.length === 0) {
    log.info("Available categories:");
    for (const c of CAPABILITY_CATEGORIES) {
      log.info(`  ${c.id.padEnd(12)} ${c.label} — ${c.description}`);
      log.dim(`              capabilities: ${c.capabilities.join(", ")}`);
    }
    log.info("");
    log.info("Usage:  ai-sdlc add <category|id> [more...]   (or `all`)");
    return;
  }

  const { capabilities } = resolveCapabilities(opts.selectors);
  if (capabilities.size === 0) {
    log.warn("No capabilities resolved from the given selectors.");
    return;
  }

  const tplFrameworkGithub = path.join(templatesRoot(), "framework", ".github");
  const agentsSrc = path.join(tplFrameworkGithub, "agents");
  const promptsSrc = path.join(tplFrameworkGithub, "prompts");

  const written: string[] = [];
  const skipped: string[] = [];

  for (const cap of capabilities) {
    if (!ALL_CAPABILITY_IDS.includes(cap)) continue;
    const pairs = [
      {
        from: path.join(agentsSrc, `${cap}.agent.md`),
        to: path.join(root, ".github", "agents", `${cap}.agent.md`),
      },
      {
        from: path.join(promptsSrc, `${cap}.prompt.md`),
        to: path.join(root, ".github", "prompts", `${cap}.prompt.md`),
      },
    ];
    for (const { from, to } of pairs) {
      if (!fs.existsSync(from)) {
        log.warn(`source missing: ${path.relative(root, from)}`);
        continue;
      }
      if (fs.existsSync(to) && !opts.force) {
        skipped.push(path.relative(root, to));
        continue;
      }
      if (opts.dryRun) {
        written.push(`(dry) ${path.relative(root, to)}`);
        continue;
      }
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      written.push(path.relative(root, to));
    }
  }

  // Re-render vendor agents/prompts so non-Copilot tools see the
  // newly added items. Read vendor list from ai-sdlc.config.json.
  if (!opts.dryRun) {
    const vendors = opts.vendors ?? readVendors(root);
    if (vendors.length > 0) {
      const allAgents = loadAllAgents(path.join(templatesRoot(), "agents"));
      const wantAgents = allAgents.filter((a) => capabilities.has(a.id));
      if (wantAgents.length > 0) {
        const ahc = readAhcBlock(root);
        const r = renderAgents(wantAgents, vendors, {
          targetRoot: root,
          ahcBlock: ahc,
        });
        for (const x of r) written.push(...x.files);
      }
      const allPrompts = loadPrompts(path.join(templatesRoot(), "prompts"));
      const wantPrompts = allPrompts.filter((p) => capabilities.has(p.id));
      if (wantPrompts.length > 0) {
        const r = renderPrompts(wantPrompts, vendors, root);
        for (const x of r) written.push(...x.files);
      }
    }
  }

  log.ok(
    `add: ${capabilities.size} capability(ies); ` +
      `wrote ${written.length} file(s); skipped ${skipped.length}.`,
  );
  if (skipped.length && !opts.force) {
    log.dim("(use --force to overwrite existing files)");
  }
};

const readVendors = (root: string): Vendor[] => {
  const cfg = path.join(root, "ai-sdlc.config.json");
  if (!fs.existsSync(cfg)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(cfg, "utf8").replace(/^\uFEFF/, ""));
    const v = j?.vendors;
    if (Array.isArray(v)) return v as Vendor[];
  } catch {
    /* ignore */
  }
  return [];
};

/** Exposed for the CLI help screen. */
export const listCategoriesAndIds = (): string =>
  [
    "Categories: " + CATEGORY_IDS.join(", "),
    "Capabilities: " + ALL_CAPABILITY_IDS.join(", "),
  ].join("\n");

export const _findCategoryForCapability = findCategoryForCapability;
