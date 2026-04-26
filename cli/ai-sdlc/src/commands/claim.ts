import { readMemoryIndex, writeMemoryIndex } from "../engine/memory.js";
import {
  acquireRequirementLock,
  releaseRequirementLock,
} from "../engine/requirement-lock.js";
import { log, fail } from "../util/log.js";

/**
 * `ai-sdlc claim R-XXXX --owner <id>` and `ai-sdlc release R-XXXX`
 *
 * Lightweight team-mode locking: stores the owner string on the
 * requirement entry AND writes a per-requirement file lock under
 * `.ai-sdlc/locks/R-XXXX.lock` to prevent concurrent agent edits.
 */
export const cmdClaim = async (opts: {
  cwd: string;
  id: string;
  owner: string;
  force?: boolean;
  ttlMinutes?: number;
}): Promise<void> => {
  const idx = readMemoryIndex(opts.cwd);
  const r = idx.requirements.items.find((x) => x.id === opts.id);
  if (!r) fail(`Requirement ${opts.id} not found.`);
  if (r!.owner && r!.owner !== opts.owner && !opts.force) {
    fail(
      `${opts.id} is claimed by ${r!.owner}. Use --force to override (will be logged).`,
    );
  }
  const result = acquireRequirementLock(opts.cwd, opts.id, opts.owner, {
    force: opts.force,
    ttlMinutes: opts.ttlMinutes,
  });
  if (!result.ok) {
    fail(
      `${opts.id} is locked by ${result.lock?.holder ?? "unknown"} until ${result.lock?.expiresAt}. Use --force.`,
    );
  }
  r!.owner = opts.owner;
  r!.updatedAt = new Date().toISOString();
  writeMemoryIndex(opts.cwd, idx);
  if (result.reason === "stolen-stale") {
    log.warn(`Stale lock from ${result.lock?.previousHolder} taken over.`);
  } else if (result.reason === "stolen-forced") {
    log.warn(`Force-stole lock from ${result.lock?.previousHolder}.`);
  }
  log.ok(
    `${opts.id} claimed by ${opts.owner} (lock until ${result.lock?.expiresAt}).`,
  );
};

export const cmdRelease = async (opts: {
  cwd: string;
  id: string;
  owner?: string;
}): Promise<void> => {
  const idx = readMemoryIndex(opts.cwd);
  const r = idx.requirements.items.find((x) => x.id === opts.id);
  if (!r) fail(`Requirement ${opts.id} not found.`);
  const owner = opts.owner ?? r!.owner;
  if (owner) {
    releaseRequirementLock(opts.cwd, opts.id, owner);
  }
  delete r!.owner;
  r!.updatedAt = new Date().toISOString();
  writeMemoryIndex(opts.cwd, idx);
  log.ok(`${opts.id} released.`);
};
