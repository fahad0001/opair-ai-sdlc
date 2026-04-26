import fs from "node:fs";
import path from "node:path";
import { ok, info, fail } from "../util/log.js";

export interface EventsOptions {
  cwd: string;
  json?: boolean;
}

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");
const readJsonSafe = <T>(p: string, fallback: T): T => {
  try {
    return JSON.parse(stripBom(fs.readFileSync(p, "utf8"))) as T;
  } catch {
    return fallback;
  }
};

interface EventRec {
  type: string;
  at: string;
  payload?: Record<string, unknown>;
}

export async function cmdEvents(opts: EventsOptions): Promise<EventRec[]> {
  const p = path.join(
    path.resolve(opts.cwd),
    "docs",
    "agent-memory",
    "index.json",
  );
  if (!fs.existsSync(p)) {
    if (opts.json) process.stdout.write("[]\n");
    else fail("index.json not found");
    return [];
  }
  const idx = readJsonSafe<{ events?: EventRec[] }>(p, {});
  const events = idx.events ?? [];
  if (opts.json) {
    process.stdout.write(JSON.stringify(events, null, 2) + "\n");
    return events;
  }
  if (events.length === 0) {
    info("(no events recorded)");
    return [];
  }
  for (const e of events) {
    let line = `${e.at.slice(0, 19).replace("T", " ")} [${e.type}]`;
    if (e.payload) line += `  ${JSON.stringify(e.payload)}`;
    info(line);
  }
  return events;
}
