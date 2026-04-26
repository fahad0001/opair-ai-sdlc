import {
  readLock,
  writeLock,
  unlock as doUnlock,
} from "../engine/bootstrap-lock.js";
import { ok, info, fail } from "../util/log.js";

export interface UnlockOpts {
  cwd: string;
  reason?: string;
  force?: boolean;
}

export const cmdUnlockBootstrap = async (opts: UnlockOpts): Promise<void> => {
  const lk = readLock(opts.cwd);
  if (!lk) {
    info("no bootstrap.lock present; nothing to unlock.");
    return;
  }
  if (lk.unlocked) {
    info("already unlocked.");
    return;
  }
  if (!opts.force) {
    const unanswered = lk.items.filter((i) => i.required && !i.answered);
    if (unanswered.length > 0) {
      fail(
        `${unanswered.length} required item(s) unanswered. Use --force to bypass (logged + ADR required):\n  ${unanswered
          .map((u) => `${u.id}: ${u.prompt}`)
          .join("\n  ")}`,
      );
    }
  }
  doUnlock(opts.cwd, opts.reason ?? (opts.force ? "force" : "ready"));
  ok("bootstrap unlocked.");
};

export interface AnswerOpts {
  cwd: string;
  id: string;
  evidence?: string;
}

export const cmdAnswerBootstrap = async (opts: AnswerOpts): Promise<void> => {
  const lk = readLock(opts.cwd);
  if (!lk) fail("no bootstrap.lock present.");
  const item = lk!.items.find((i) => i.id === opts.id);
  if (!item) fail(`bootstrap item ${opts.id} not found.`);
  item!.answered = true;
  if (opts.evidence) item!.evidencePath = opts.evidence;
  writeLock(opts.cwd, lk!);
  ok(`marked '${opts.id}' as answered.`);
};
