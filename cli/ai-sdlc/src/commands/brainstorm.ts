import path from "node:path";
import { runBrainstorm } from "../engine/brainstorm.js";

export interface BrainstormCmd {
  cwd: string;
  out?: string;
  resume?: string;
}

export const cmdBrainstorm = async (opts: BrainstormCmd): Promise<void> => {
  const out = opts.out ? path.resolve(opts.cwd, opts.out) : undefined;
  const resume = opts.resume ? path.resolve(opts.cwd, opts.resume) : undefined;
  await runBrainstorm({
    cwd: opts.cwd,
    ...(out ? { out } : {}),
    ...(resume ? { resume } : {}),
  });
};
