import fs from "node:fs";
import path from "node:path";
import { readMemoryIndex, writeMemoryIndex } from "../engine/memory.js";
import { ok, info } from "../util/log.js";

/**
 * Schema migrator — additive only. Brings older index.json shapes up
 * to the latest. Never deletes user data.
 */
const TARGET_VERSION = "1.1";

export interface MigrateOpts {
  cwd: string;
  dryRun?: boolean;
}

export const cmdMigrateSchema = async (opts: MigrateOpts): Promise<void> => {
  const idxPath = path.join(opts.cwd, "docs", "agent-memory", "index.json");
  if (!fs.existsSync(idxPath)) {
    info("no index.json; nothing to migrate.");
    return;
  }
  const idx = readMemoryIndex(opts.cwd) as unknown as Record<string, unknown>;
  const currentVersion = String(idx.version ?? "1.0");
  if (currentVersion === TARGET_VERSION) {
    ok(`already at ${TARGET_VERSION}`);
    return;
  }

  // 1.0 → 1.1: add events[], archive.items[], framework{}
  if (!Array.isArray(idx.events)) idx.events = [];
  if (!idx.archive) idx.archive = { items: [] };
  if (!idx.framework)
    idx.framework = {
      version: "0.1.0-alpha.0",
      agentsRev: null,
      promptsRev: null,
      templatesRev: null,
      scaffoldsRev: null,
    };
  // Promote per-requirement owner string → object
  const items =
    (idx.requirements as { items: Array<Record<string, unknown>> }).items ?? [];
  for (const r of items) {
    if (typeof r.owner === "string") {
      r.owner = { individual: r.owner };
    }
    if (!Array.isArray(r.tags)) r.tags = [];
  }
  idx.version = TARGET_VERSION;

  if (opts.dryRun) {
    info(`would migrate ${currentVersion} → ${TARGET_VERSION}`);
    return;
  }
  writeMemoryIndex(opts.cwd, idx as never);
  ok(`migrated ${currentVersion} → ${TARGET_VERSION}`);
};
