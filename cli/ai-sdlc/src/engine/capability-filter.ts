/**
 * cli/ai-sdlc/src/engine/capability-filter.ts
 *
 * Post-scaffold filter: removes capability files that the user did
 * NOT select. The full set of capability `.agent.md`/`.prompt.md`
 * files is always copied first (so the templates folder is a
 * complete catalog), then this function deletes the ones not in the
 * selected set. This keeps the scaffold engine simple and means
 * `ai-sdlc add <category>` later can re-add files from the same
 * shipped templates.
 */

import fs from "node:fs";
import path from "node:path";
import {
  ALL_CAPABILITY_IDS,
  CAPABILITY_CATEGORIES,
  CORE_WORKFLOWS,
  type CategoryId,
} from "./capabilities.js";

const safeUnlink = (p: string): boolean => {
  try {
    if (!fs.existsSync(p)) return false;
    fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
};

/**
 * Remove every capability file (agent, prompt, vendor renderings)
 * whose id is not in `keepCapabilities`. Workflows pinned to a
 * non-selected category are also removed.
 *
 * @returns list of removed paths (relative to `targetDir`).
 */
export const filterCapabilities = (
  targetDir: string,
  keepCapabilities: ReadonlySet<string>,
  keepCategories: ReadonlySet<CategoryId>,
): string[] => {
  const removed: string[] = [];

  // 1) Markdown sources under .github/agents and .github/prompts.
  const baseAgentsDir = path.join(targetDir, ".github", "agents");
  const basePromptsDir = path.join(targetDir, ".github", "prompts");

  for (const cap of ALL_CAPABILITY_IDS) {
    if (keepCapabilities.has(cap)) continue;
    const targets = [
      path.join(baseAgentsDir, `${cap}.agent.md`),
      path.join(basePromptsDir, `${cap}.prompt.md`),
      // Vendor renderings produced by renderers.ts.
      path.join(targetDir, ".cursor", "rules", `${cap}.mdc`),
      path.join(targetDir, ".claude", "agents", `${cap}.md`),
      path.join(targetDir, ".aider", "agents", `${cap}.md`),
      path.join(targetDir, ".continue", "agents", `${cap}.md`),
      path.join(targetDir, ".opencode", "agents", `${cap}.md`),
      path.join(targetDir, "AGENTS", `${cap}.md`),
    ];
    for (const t of targets) {
      if (safeUnlink(t)) removed.push(path.relative(targetDir, t));
    }
  }

  // 2) Workflows: drop any workflow pinned to a non-selected
  //    category. Preserve core workflows + any workflow not pinned
  //    to any category (those are SDLC-core).
  const wfDir = path.join(targetDir, ".github", "workflows");
  if (fs.existsSync(wfDir)) {
    const pinned = new Map<string, CategoryId>();
    for (const c of CAPABILITY_CATEGORIES) {
      for (const wf of c.workflows ?? []) pinned.set(wf, c.id);
    }
    for (const wf of fs.readdirSync(wfDir)) {
      if ((CORE_WORKFLOWS as readonly string[]).includes(wf)) continue;
      const cat = pinned.get(wf);
      if (!cat) continue; // not pinned to a category → keep
      if (keepCategories.has(cat)) continue;
      if (safeUnlink(path.join(wfDir, wf))) {
        removed.push(path.relative(targetDir, path.join(wfDir, wf)));
      }
    }
  }

  return removed;
};
