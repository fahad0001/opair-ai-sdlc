import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import { log } from "../util/log.js";

/**
 * `ai-sdlc repair` — auto-heals known framework drift:
 *  - re-injects the AHC block into agent prompts
 *  - rebuilds sha256 hash anchors in index.json
 *
 * Each repair step is opt-out via flags so users can preview safely.
 */
export interface RepairOptions {
  cwd: string;
  ahc?: boolean; // default true
  hashes?: boolean; // default true
}

export const cmdRepair = async (opts: RepairOptions): Promise<void> => {
  const ahc = opts.ahc !== false;
  const hashes = opts.hashes !== false;

  if (ahc) {
    const script = path.join(
      opts.cwd,
      ".github/scripts/agent-memory-inject-ahc-block.mjs",
    );
    if (fs.existsSync(script)) {
      log.step("repair · inject AHC block");
      const { stdout, stderr } = await execa("node", [script], {
        cwd: opts.cwd,
        reject: false,
      });
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } else {
      log.warn("AHC inject script missing — skipped");
    }
  }

  if (hashes) {
    const script = path.join(
      opts.cwd,
      ".github/scripts/agent-memory-hash-check.mjs",
    );
    if (fs.existsSync(script)) {
      log.step("repair · rebuild hash anchors");
      const { stdout, stderr } = await execa("node", [script, "--rebuild"], {
        cwd: opts.cwd,
        reject: false,
      });
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } else {
      log.warn("hash-check script missing — skipped");
    }
  }

  log.ok("repair complete. Re-run `ai-sdlc validate` to verify.");
};
