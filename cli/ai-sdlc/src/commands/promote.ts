import {
  readMemoryIndex,
  writeMemoryIndex,
  appendEvent,
} from "../engine/memory.js";
import { REQ_STATUS, type ReqStatus } from "../types.js";
import { ok, fail } from "../util/log.js";

const ORDER: ReqStatus[] = [
  "Draft",
  "Planned",
  "Processed",
  "Implemented",
  "Evaluated",
  "Done",
];

export interface PromoteOpts {
  cwd: string;
  id: string;
  to?: string;
  force?: boolean;
}

export const cmdPromote = async (opts: PromoteOpts): Promise<void> => {
  const idx = readMemoryIndex(opts.cwd);
  const it = idx.requirements.items.find((r) => r.id === opts.id);
  if (!it) fail(`Requirement ${opts.id} not found.`);
  const cur = it!.status;
  let next: ReqStatus | undefined;
  if (opts.to) {
    if (!REQ_STATUS.includes(opts.to as ReqStatus))
      fail(`Unknown status: ${opts.to} (allowed: ${REQ_STATUS.join(", ")})`);
    next = opts.to as ReqStatus;
  } else {
    const ix = ORDER.indexOf(cur);
    if (ix < 0 || ix >= ORDER.length - 1)
      fail(`No next status from ${cur}; specify --to.`);
    next = ORDER[ix + 1]!;
  }
  if (!opts.force && cur !== "Blocked") {
    const fromIx = ORDER.indexOf(cur);
    const toIx = ORDER.indexOf(next!);
    if (fromIx < 0 || toIx < 0 || toIx !== fromIx + 1) {
      fail(
        `Illegal transition ${cur} → ${next}. Use --force to override (logged as policy bypass).`,
      );
    }
  }
  it!.status = next!;
  it!.updatedAt = new Date().toISOString();
  if (next === "Done") it!.doneAt = it!.updatedAt;
  writeMemoryIndex(opts.cwd, idx);
  appendEvent(opts.cwd, {
    type: "status-change",
    payload: { id: opts.id, from: cur, to: next, forced: Boolean(opts.force) },
  });
  ok(`promoted ${opts.id}: ${cur} → ${next}`);
};
