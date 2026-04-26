import { runAutopilot } from "../engine/autopilot.js";
import type { AutopilotConfig } from "../types.js";

export interface AutopilotCmdOpts {
  cwd: string;
  requirement?: string; // single id or "all"
  maxParallel?: number;
  budgetMinutes?: number;
  stopOnFail?: boolean;
  dryRun?: boolean;
}

export const cmdAutopilot = async (opts: AutopilotCmdOpts): Promise<void> => {
  const cfg: AutopilotConfig = {
    requirementIds:
      !opts.requirement || opts.requirement === "all"
        ? "all"
        : [opts.requirement],
    maxParallel: opts.maxParallel ?? 3,
    budgetMinutes: opts.budgetMinutes ?? 60,
    stopOnFail: opts.stopOnFail ?? false,
    dryRun: opts.dryRun ?? false,
  };
  await runAutopilot(opts.cwd, cfg);
};
