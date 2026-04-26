import fs from "node:fs";
import path from "node:path";

/**
 * Return a fresh log path for an agent run, applying a collision suffix
 * `__<n>` (n>=2) when a path with the same date+requirement+agent already
 * exists. Honors the convention from AGENTS.md §3.6.
 */
export const nextLogPath = (
  logsRoot: string,
  date: string,
  requirementId: string,
  agentId: string,
): string => {
  fs.mkdirSync(logsRoot, { recursive: true });
  const base = `${date}__${requirementId}__${agentId}`;
  const first = path.join(logsRoot, `${base}.md`);
  if (!fs.existsSync(first)) return first;
  for (let i = 2; i < 1000; i++) {
    const candidate = path.join(logsRoot, `${base}__${i}.md`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  // Pathological fallback — caller should rotate logs at this point.
  return path.join(logsRoot, `${base}__${Date.now()}.md`);
};

export const todayIso = (): string => new Date().toISOString().slice(0, 10);
