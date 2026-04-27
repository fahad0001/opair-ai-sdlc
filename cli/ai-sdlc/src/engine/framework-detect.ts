import fs from "node:fs";
import path from "node:path";

/**
 * Detect whether a directory already contains the ai-sdlc framework.
 *
 * Heuristic: presence of `docs/agent-memory/` or `AGENTS.md` at the
 * given root. Used by `init` and `create` to prevent silent
 * duplication when run inside (or as a child of) an existing project.
 */
export interface FrameworkPresence {
  present: boolean;
  /** Which marker(s) were found (relative to `root`). */
  markers: string[];
}

export const detectFramework = (root: string): FrameworkPresence => {
  const markers: string[] = [];
  const candidates = ["docs/agent-memory", "AGENTS.md"];
  for (const c of candidates) {
    if (fs.existsSync(path.join(root, c))) markers.push(c);
  }
  return { present: markers.length > 0, markers };
};

/**
 * Walk up from `start` toward the filesystem root and return the
 * first ancestor (excluding `start` itself) that already has the
 * framework, or `null` if none is found. Used to detect that the
 * caller is about to nest a new project inside an existing one.
 */
export const findFrameworkAncestor = (start: string): string | null => {
  let cur = path.resolve(start);
  // Stop at filesystem root.
  while (true) {
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    const presence = detectFramework(parent);
    if (presence.present) return parent;
    cur = parent;
  }
};
