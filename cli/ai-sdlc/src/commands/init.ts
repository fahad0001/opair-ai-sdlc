import fs from "node:fs";
import path from "node:path";
import { copyTemplate, templatesRoot } from "../engine/template-fs.js";
import {
  detectFramework,
  findFrameworkAncestor,
} from "../engine/framework-detect.js";
import {
  resolveCapabilities,
  DEFAULT_CATEGORIES,
} from "../engine/capabilities.js";
import { filterCapabilities } from "../engine/capability-filter.js";
import { log } from "../util/log.js";

/**
 * `ai-sdlc init` — drop the agent-memory framework into the CWD.
 * Used inside an existing project that doesn't yet have the framework
 * (lighter than `adopt`, which also performs reverse-engineering).
 */
export interface InitOptions {
  cwd: string;
  force?: boolean;
  projectName?: string;
  /** Capability selectors (categories or capability ids).
   *  Default = ["diagnostics"]. Use ["all"] to ship everything. */
  capabilities?: string[];
}

export const cmdInit = async (opts: InitOptions): Promise<void> => {
  // Guard 1: framework already present in cwd.
  const here = detectFramework(opts.cwd);
  if (here.present && !opts.force) {
    throw new Error(
      `Framework already present in this directory (found: ${here.markers.join(
        ", ",
      )}). ` +
        `Use --force to overwrite, or run \`ai-sdlc status\` to inspect existing state.`,
    );
  }

  // Guard 2: an ancestor already has the framework — initializing here
  // would create a nested duplicate (root cause of the easy-property bug).
  const ancestor = findFrameworkAncestor(opts.cwd);
  if (ancestor && !opts.force) {
    throw new Error(
      `An ancestor directory (${ancestor}) already contains the ai-sdlc framework. ` +
        `Initializing here would create a duplicate memory pack. ` +
        `Either work in the ancestor, or pass --force to override (not recommended).`,
    );
  }

  const tpl = path.join(templatesRoot(), "framework");
  if (!fs.existsSync(tpl)) {
    throw new Error(`templates/framework not found at ${tpl}`);
  }
  const r = copyTemplate(tpl, opts.cwd, {
    vars: {
      projectName: opts.projectName ?? path.basename(opts.cwd),
      year: String(new Date().getFullYear()),
    },
    skipExisting: !opts.force,
    overwrite: opts.force,
  });

  // Filter capability files per --capabilities (default: diagnostics only).
  const selectors =
    opts.capabilities && opts.capabilities.length > 0
      ? opts.capabilities
      : (DEFAULT_CATEGORIES as readonly string[]);
  const { capabilities, categories } = resolveCapabilities(selectors);
  const removed = filterCapabilities(opts.cwd, capabilities, categories);

  log.ok(
    `init: wrote ${r.written.length} file(s); skipped ${r.skipped.length} existing; ` +
      `pruned ${removed.length} non-selected capability file(s).`,
  );
  log.dim(
    `capabilities included: ${[...capabilities].sort().join(", ") || "(sdlc core only)"}`,
  );
  log.dim(
    `add more later: ai-sdlc add <category|id>  (e.g. ai-sdlc add security)`,
  );
  if (r.skipped.length && !opts.force) {
    log.dim("(use --force to overwrite existing files)");
  }
};
