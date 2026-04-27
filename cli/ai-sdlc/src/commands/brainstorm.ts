import path from "node:path";
import { emitAiBrainstormPrompt, runBrainstorm } from "../engine/brainstorm.js";
import {
  detectFramework,
  findFrameworkAncestor,
} from "../engine/framework-detect.js";
import { info, ok } from "../util/log.js";

export interface BrainstormCmd {
  cwd: string;
  out?: string;
  resume?: string;
  force?: boolean;
  /** Emit an AI-assistant prompt + skeleton brief instead of running
   *  the interactive flow. */
  ai?: boolean;
}

export const cmdBrainstorm = async (opts: BrainstormCmd): Promise<void> => {
  // Duplication guard: brainstorm must NOT run inside an existing
  // framework root or a child of one. The brief is meant to feed
  // `ai-sdlc create`, which scaffolds a NEW project — running inside
  // an existing project would either nest a duplicate or pollute the
  // project root with a stray brief.
  const here = detectFramework(opts.cwd);
  if (here.present && !opts.force) {
    throw new Error(
      `An ai-sdlc framework is already present here (found: ${here.markers.join(
        ", ",
      )}). \`brainstorm\` should run in a fresh, empty directory; the brief ` +
        `then drives \`ai-sdlc create --from-brief\` to scaffold a new project. ` +
        `Use --force to override.`,
    );
  }
  const ancestor = findFrameworkAncestor(opts.cwd);
  if (ancestor && !opts.force) {
    throw new Error(
      `An ancestor (${ancestor}) already contains the ai-sdlc framework. ` +
        `Run \`brainstorm\` in a directory outside any framework root.`,
    );
  }

  if (opts.ai) {
    const { promptPath, skeletonPath } = emitAiBrainstormPrompt({
      cwd: opts.cwd,
      ...(opts.out ? { out: opts.out } : {}),
    });
    ok(`wrote ${path.relative(opts.cwd, promptPath) || promptPath}`);
    ok(`wrote ${path.relative(opts.cwd, skeletonPath) || skeletonPath}`);
    info(
      `Open the prompt in your AI assistant (Copilot / Claude / Cursor /\n` +
        `opencode / Continue / etc.). It will dialog with you and write\n` +
        `project-brief.md + project-brief.json. Then run:\n` +
        `  ai-sdlc create --from-brief project-brief.md`,
    );
    return;
  }

  const out = opts.out ? path.resolve(opts.cwd, opts.out) : undefined;
  const resume = opts.resume ? path.resolve(opts.cwd, opts.resume) : undefined;
  await runBrainstorm({
    cwd: opts.cwd,
    ...(out ? { out } : {}),
    ...(resume ? { resume } : {}),
  });
};
