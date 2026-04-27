import { runWizard } from "../engine/wizard.js";
import { scaffoldProject } from "../engine/scaffold-engine.js";
import {
  detectFramework,
  findFrameworkAncestor,
} from "../engine/framework-detect.js";
import { log } from "../util/log.js";
import { execa } from "execa";
import { loadBrief } from "../engine/brainstorm.js";
import { writeLock, defaultLock } from "../engine/bootstrap-lock.js";
import path from "node:path";

/**
 * `ai-sdlc create [name]` — greenfield interactive scaffolder.
 * Runs the 13-step wizard, scaffolds the chosen stack + framework,
 * renders vendor agent files, optionally inits git and installs deps.
 *
 * If `--from-brief <path>` is given, the brief's recommended kind /
 * stack / architecture pre-fill the wizard, and the brief is copied
 * into the new project as `docs/agent-memory/00-brief.md`.
 */
export interface CreateOptions {
  cwd: string;
  name?: string;
  yes?: boolean;
  fromBrief?: string;
  force?: boolean;
  preset?: Partial<import("../types.js").WizardAnswers>;
}

export const cmdCreate = async (opts: CreateOptions): Promise<void> => {
  let briefPreset: Partial<import("../types.js").WizardAnswers> = {};
  if (opts.fromBrief) {
    const b = loadBrief(opts.fromBrief);
    log.info(`using brief: ${b.title}`);
    briefPreset = {
      projectName: opts.preset?.projectName ?? slugify(b.title),
      ...(b.recommendedKind ? { projectKind: b.recommendedKind } : {}),
      ...(b.recommendedStack ? { stackId: b.recommendedStack } : {}),
      ...(b.recommendedArchitecture
        ? { architecture: b.recommendedArchitecture }
        : {}),
      brief: b,
    };
  }
  const answers = await runWizard({
    cwd: opts.cwd,
    yes: opts.yes,
    preset: {
      ...briefPreset,
      ...(opts.preset ?? {}),
      ...(opts.name ? { projectName: opts.name } : {}),
    },
  });

  // Duplication guards (see framework-detect.ts).
  // Allow scaffolding into an empty/new dir, but refuse if it already
  // has the framework, or if any ancestor does (would nest a duplicate).
  const targetPresence = detectFramework(answers.targetDir);
  if (targetPresence.present && !opts.force) {
    throw new Error(
      `Target directory ${answers.targetDir} already contains the ai-sdlc framework ` +
        `(found: ${targetPresence.markers.join(", ")}). ` +
        `Use --force to overwrite, or pick a different target.`,
    );
  }
  const ancestor = findFrameworkAncestor(answers.targetDir);
  if (ancestor && !opts.force) {
    throw new Error(
      `An ancestor directory (${ancestor}) already contains the ai-sdlc framework. ` +
        `Creating a project here would produce a duplicate memory pack at two levels. ` +
        `Move the new project outside of ${ancestor}, or pass --force to override.`,
    );
  }

  log.banner(`Scaffolding ${answers.projectName} → ${answers.targetDir}`);
  const result = await scaffoldProject(answers);
  log.ok(
    `wrote ${result.written.length} file(s); skipped ${result.skipped.length}`,
  );
  log.ok(`vendor renderers: ${result.vendors.join(", ") || "(none)"}`);

  // Bootstrap lock (DoR gate before R-0001).
  writeLock(answers.targetDir, defaultLock(answers.projectKind));
  log.ok("bootstrap.lock written (Definition-of-Ready gate)");

  // Persist brief inside project for traceability, then clean up the
  // brief artifacts at the brainstorm location (parent of the new
  // project) so the framework lives only inside `targetDir`.
  if (answers.brief) {
    const fs = await import("node:fs");
    const target = path.join(
      answers.targetDir,
      "docs/agent-memory/00-brief.md",
    );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const { briefToMarkdown } = await import("../engine/brainstorm.js");
    fs.writeFileSync(target, briefToMarkdown(answers.brief), "utf8");
    log.ok("project brief copied to docs/agent-memory/00-brief.md");

    if (opts.fromBrief) {
      const briefPath = path.resolve(opts.cwd, opts.fromBrief);
      const briefJson = briefPath.replace(/\.md$/i, ".json");
      // Only remove if outside the new project (to avoid deleting
      // the just-written 00-brief.md inside it).
      const inside = path
        .resolve(briefPath)
        .startsWith(path.resolve(answers.targetDir) + path.sep);
      if (!inside) {
        for (const p of [briefPath, briefJson]) {
          try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          } catch {
            /* ignore */
          }
        }
        log.dim(
          `removed brief at ${path.relative(opts.cwd, briefPath)} ` +
            `(now lives inside the new project).`,
        );
      }
    }
  }

  if (answers.initGit) {
    try {
      await execa("git", ["init"], { cwd: answers.targetDir });
      log.ok("git initialized");
    } catch {
      log.warn("git not available — skipped init");
    }
  }
  if (answers.installDeps) {
    log.warn(
      "--install-deps requested — install per-stack manually for now (Phase 1 stub).",
    );
  }
  log.info("");
  log.info(`Done. Next:  cd ${answers.targetDir}  &&  ai-sdlc status`);
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";
