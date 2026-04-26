import fs from "node:fs";
import path from "node:path";
import { copyTemplate, templatesRoot } from "../engine/template-fs.js";
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
}

export const cmdInit = async (opts: InitOptions): Promise<void> => {
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
  log.ok(
    `init: wrote ${r.written.length} file(s); skipped ${r.skipped.length} existing.`,
  );
  if (r.skipped.length && !opts.force) {
    log.dim("(use --force to overwrite existing files)");
  }
};
