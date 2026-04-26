import {
  readMemoryIndex,
  writeMemoryIndex,
  appendEvent,
} from "../engine/memory.js";
import { ok, info } from "../util/log.js";

interface ArchiveItem {
  id: string;
  archivedAt: string;
}

export interface ArchiveOpts {
  cwd: string;
  olderThanDays?: number;
  dryRun?: boolean;
}

export const cmdArchive = async (opts: ArchiveOpts): Promise<void> => {
  const cutoff = Date.now() - (opts.olderThanDays ?? 90) * 86_400_000;
  const idx = readMemoryIndex(opts.cwd) as unknown as Record<
    string,
    unknown
  > & {
    requirements: {
      items: Array<{ id: string; status: string; updatedAt?: string }>;
    };
    archive?: { items: ArchiveItem[] };
  };
  idx.archive = idx.archive ?? { items: [] };
  const keep: typeof idx.requirements.items = [];
  const moved: ArchiveItem[] = [];
  for (const r of idx.requirements.items) {
    const ts = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    if (r.status === "Done" && ts && ts < cutoff) {
      moved.push({ id: r.id, archivedAt: new Date().toISOString() });
    } else {
      keep.push(r);
    }
  }
  if (opts.dryRun) {
    info(
      `would archive ${moved.length} requirement(s): ${moved.map((m) => m.id).join(", ")}`,
    );
    return;
  }
  idx.requirements.items = keep;
  idx.archive.items.push(...moved);
  writeMemoryIndex(opts.cwd, idx as never);
  if (moved.length > 0) {
    appendEvent(opts.cwd, {
      type: "requirements-archived",
      payload: { ids: moved.map((m) => m.id), count: moved.length },
    });
  }
  ok(`archived ${moved.length} requirement(s).`);
};
