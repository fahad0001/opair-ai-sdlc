import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import { log, fail } from "../util/log.js";

/**
 * `ai-sdlc validate` — runs the full anti-hallucination check pipeline
 * against the current project. Delegates to the scripts shipped under
 * `.github/scripts/`. Each step is independent; we report all failures
 * before exiting non-zero.
 */
export const cmdValidate = async (opts: { cwd: string }): Promise<void> => {
  const steps: { name: string; script: string; args: string[] }[] = [
    {
      name: "schema",
      script: ".github/scripts/agent-memory-validate-schema.mjs",
      args: [],
    },
    {
      name: "ahc",
      script: ".github/scripts/agent-memory-evidence-check.mjs",
      args: [],
    },
    {
      name: "hashes",
      script: ".github/scripts/agent-memory-hash-check.mjs",
      args: [],
    },
    {
      name: "guard",
      script: ".github/scripts/agent-memory-guard.mjs",
      args: [],
    },
  ];

  let failed = 0;
  for (const s of steps) {
    const abs = path.join(opts.cwd, s.script);
    if (!fs.existsSync(abs)) {
      log.warn(`${s.name}: script missing (${s.script}) — skipped`);
      continue;
    }
    try {
      log.step(`validate · ${s.name}`);
      const { stdout, stderr } = await execa("node", [abs, ...s.args], {
        cwd: opts.cwd,
        reject: true,
      });
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      log.ok(`${s.name}: pass`);
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      if (err.stdout) console.log(err.stdout);
      if (err.stderr) console.error(err.stderr);
      log.err(`${s.name}: FAIL`);
      failed++;
    }
  }
  if (failed > 0) fail(`${failed} validation step(s) failed.`);
  log.ok("validate: all clean");
};
