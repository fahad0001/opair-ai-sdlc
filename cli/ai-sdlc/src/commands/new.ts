import fs from "node:fs";
import path from "node:path";
import {
  readMemoryIndex,
  writeMemoryIndex,
  nextRequirementId,
  appendEvent,
} from "../engine/memory.js";
import { templatesRoot, copyTemplate } from "../engine/template-fs.js";
import { log } from "../util/log.js";

/**
 * `ai-sdlc new requirement [--title "..."] [--id R-XXXX]` — adds a
 * new requirement folder using the requirement-skeleton template and
 * registers it in the memory index in `Draft` status.
 */
export interface NewReqOptions {
  cwd: string;
  title?: string;
  id?: string;
  owner?: string;
}

export const cmdNewRequirement = async (opts: NewReqOptions): Promise<void> => {
  const idx = readMemoryIndex(opts.cwd);
  const id = opts.id ?? nextRequirementId(idx);
  if (!/^R-\d{4}$/.test(id)) {
    throw new Error(`Invalid requirement id ${id}. Expected R-XXXX.`);
  }
  if (idx.requirements.items.some((r) => r.id === id)) {
    throw new Error(`Requirement ${id} already exists.`);
  }
  const target = path.join(opts.cwd, "docs/agent-memory/02-requirements", id);
  if (fs.existsSync(target)) {
    throw new Error(`Folder already exists: ${target}`);
  }
  const skel = path.join(
    templatesRoot(),
    "framework/docs/agent-memory/00-templates/requirement-skeleton",
  );
  let usedSkel = skel;
  if (!fs.existsSync(skel)) {
    // Fallback: use the skeleton in the consumer project itself.
    usedSkel = path.join(
      opts.cwd,
      "docs/agent-memory/00-templates/requirement-skeleton",
    );
  }
  if (!fs.existsSync(usedSkel)) {
    throw new Error(`requirement-skeleton template not found.`);
  }
  copyTemplate(usedSkel, target, {
    vars: {
      requirementId: id,
      requirementTitle: opts.title ?? "(set me)",
      year: String(new Date().getFullYear()),
    },
  });

  idx.requirements.items.push({
    id,
    title: opts.title ?? "(untitled)",
    status: "Draft",
    owner: opts.owner,
    artifacts: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  writeMemoryIndex(opts.cwd, idx);
  appendEvent(opts.cwd, {
    type: "requirement-created",
    payload: { id, title: opts.title ?? null },
  });
  log.ok(`Created ${id} at ${path.relative(opts.cwd, target)}.`);
};
