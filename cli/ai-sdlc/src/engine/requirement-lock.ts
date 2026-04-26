import fs from "node:fs";
import path from "node:path";

/**
 * Per-requirement lock — concurrency guard.
 *
 * Stored at `.ai-sdlc/locks/<R-XXXX>.lock` so two agents/operators do not
 * work the same requirement at the same time. The lock is advisory: agents
 * MUST acquire before mutating requirement artifacts and release on exit.
 *
 * Stale locks: if `expiresAt` is in the past, `acquire()` will steal and
 * record the prior holder in `previousHolder`.
 */

export interface RequirementLock {
  schemaVersion: "1.0";
  requirementId: string;
  holder: string; // agent name or operator id
  acquiredAt: string;
  expiresAt: string;
  previousHolder?: string;
  note?: string;
}

const locksDir = (root: string) => path.join(root, ".ai-sdlc", "locks");
const lockFile = (root: string, id: string) =>
  path.join(locksDir(root), `${id}.lock`);

const isStale = (lk: RequirementLock): boolean =>
  Date.parse(lk.expiresAt) < Date.now();

export const readRequirementLock = (
  root: string,
  id: string,
): RequirementLock | undefined => {
  const p = lockFile(root, id);
  if (!fs.existsSync(p)) return undefined;
  return JSON.parse(
    fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""),
  ) as RequirementLock;
};

export interface AcquireOptions {
  ttlMinutes?: number; // default 30
  force?: boolean;
  note?: string;
}

export interface AcquireResult {
  ok: boolean;
  lock?: RequirementLock;
  reason?: "held-by-other" | "stolen-stale" | "stolen-forced";
}

export const acquireRequirementLock = (
  root: string,
  id: string,
  holder: string,
  opts: AcquireOptions = {},
): AcquireResult => {
  fs.mkdirSync(locksDir(root), { recursive: true });
  const ttl = (opts.ttlMinutes ?? 30) * 60_000;
  const existing = readRequirementLock(root, id);
  let previousHolder: string | undefined;
  let reason: AcquireResult["reason"];
  if (existing) {
    if (existing.holder === holder) {
      // Refresh own lock.
      previousHolder = undefined;
    } else if (isStale(existing)) {
      previousHolder = existing.holder;
      reason = "stolen-stale";
    } else if (opts.force) {
      previousHolder = existing.holder;
      reason = "stolen-forced";
    } else {
      return { ok: false, reason: "held-by-other", lock: existing };
    }
  }
  const lk: RequirementLock = {
    schemaVersion: "1.0",
    requirementId: id,
    holder,
    acquiredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl).toISOString(),
    ...(previousHolder ? { previousHolder } : {}),
    ...(opts.note ? { note: opts.note } : {}),
  };
  fs.writeFileSync(
    lockFile(root, id),
    JSON.stringify(lk, null, 2) + "\n",
    "utf8",
  );
  return { ok: true, lock: lk, reason };
};

export const releaseRequirementLock = (
  root: string,
  id: string,
  holder: string,
): boolean => {
  const lk = readRequirementLock(root, id);
  if (!lk) return false;
  if (lk.holder !== holder) return false;
  fs.unlinkSync(lockFile(root, id));
  return true;
};

export const listRequirementLocks = (root: string): RequirementLock[] => {
  const dir = locksDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".lock"))
    .map(
      (f) =>
        JSON.parse(
          fs.readFileSync(path.join(dir, f), "utf8").replace(/^\uFEFF/, ""),
        ) as RequirementLock,
    );
};
