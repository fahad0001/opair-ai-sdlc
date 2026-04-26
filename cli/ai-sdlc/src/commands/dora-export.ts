import fs from "node:fs";
import path from "node:path";
import { ok, fail } from "../util/log.js";

export interface DoraExportOptions {
  cwd: string;
  out?: string;
  windowDays?: number;
  json?: boolean;
}

interface IndexEntry {
  id: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  doneAt?: string;
  evaluation?: { firstTryPass?: boolean; fixLoopIterations?: number };
}

interface IndexEvent {
  id?: number;
  at?: string;
  type?: string;
  requirementId?: string;
  from?: string;
  to?: string;
}

interface IndexShape {
  project?: { name?: string };
  generatedAt?: string;
  requirements?: { items?: IndexEntry[] };
  events?: IndexEvent[];
}

const readJson = <T>(p: string): T =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as T;

function withinDays(
  iso: string | undefined,
  days: number,
  nowMs: number,
): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return nowMs - t <= days * 24 * 60 * 60 * 1000;
}

export interface DoraReport {
  generatedAt: string;
  windowDays: number;
  totals: {
    requirements: number;
    byStatus: Record<string, number>;
    decisions?: number;
  };
  framework: {
    throughputDoneInWindow: number;
    firstTryPassRate: number | null;
    averageFixLoopIterations: number | null;
    statusTransitionsInWindow: number;
  };
  // DORA-4 are populated from external CI signals when present; placeholders here.
  dora: {
    deploymentFrequency: number | null;
    leadTimeForChangesHours: number | null;
    changeFailureRate: number | null;
    meanTimeToRestoreHours: number | null;
  };
}

export function computeDoraReport(
  idx: IndexShape,
  windowDays: number,
  now = Date.now(),
): DoraReport {
  const items = idx.requirements?.items ?? [];
  const events = idx.events ?? [];

  const byStatus: Record<string, number> = {};
  for (const r of items) {
    const s = r.status ?? "Unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const doneInWindow = items.filter(
    (r) =>
      r.status === "Done" &&
      withinDays(r.doneAt ?? r.updatedAt, windowDays, now),
  ).length;

  const evaluated = items.filter(
    (r) => typeof r.evaluation?.firstTryPass === "boolean",
  );
  const firstTryPasses = evaluated.filter(
    (r) => r.evaluation?.firstTryPass === true,
  ).length;
  const firstTryPassRate =
    evaluated.length === 0 ? null : firstTryPasses / evaluated.length;

  const fixLoops = items
    .map((r) => r.evaluation?.fixLoopIterations)
    .filter((n): n is number => typeof n === "number");
  const averageFixLoopIterations =
    fixLoops.length === 0
      ? null
      : fixLoops.reduce((a, b) => a + b, 0) / fixLoops.length;

  const statusTransitionsInWindow = events.filter(
    (e) => e.type === "status-change" && withinDays(e.at, windowDays, now),
  ).length;

  return {
    generatedAt: new Date(now).toISOString(),
    windowDays,
    totals: {
      requirements: items.length,
      byStatus,
    },
    framework: {
      throughputDoneInWindow: doneInWindow,
      firstTryPassRate:
        firstTryPassRate === null ? null : Number(firstTryPassRate.toFixed(4)),
      averageFixLoopIterations:
        averageFixLoopIterations === null
          ? null
          : Number(averageFixLoopIterations.toFixed(2)),
      statusTransitionsInWindow,
    },
    dora: {
      deploymentFrequency: null,
      leadTimeForChangesHours: null,
      changeFailureRate: null,
      meanTimeToRestoreHours: null,
    },
  };
}

export async function cmdDoraExport(
  opts: DoraExportOptions,
): Promise<DoraReport> {
  const root = path.resolve(opts.cwd);
  const idxPath = path.join(root, "docs", "agent-memory", "index.json");
  if (!fs.existsSync(idxPath)) {
    fail(`No index.json at ${idxPath}`);
    return {
      generatedAt: "",
      windowDays: 0,
      totals: { requirements: 0, byStatus: {} },
      framework: {
        throughputDoneInWindow: 0,
        firstTryPassRate: null,
        averageFixLoopIterations: null,
        statusTransitionsInWindow: 0,
      },
      dora: {
        deploymentFrequency: null,
        leadTimeForChangesHours: null,
        changeFailureRate: null,
        meanTimeToRestoreHours: null,
      },
    };
  }
  const idx = readJson<IndexShape>(idxPath);
  const windowDays = opts.windowDays ?? 30;
  const report = computeDoraReport(idx, windowDays);

  const outPath = path.resolve(
    root,
    opts.out ?? path.join("docs", "agent-memory", "metrics", "dora.json"),
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  if (opts.json) {
    process.stdout.write(JSON.stringify(report) + "\n");
  } else {
    ok(
      `DORA + framework metrics → ${path.relative(root, outPath)} (window=${windowDays}d, reqs=${report.totals.requirements}, doneInWindow=${report.framework.throughputDoneInWindow})`,
    );
  }
  return report;
}
