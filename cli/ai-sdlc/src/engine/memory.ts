import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { stripBom } from "./hashes.js";

/**
 * Minimal Zod mirror of docs/agent-memory/index.schema.json — kept in
 * sync via the `ai-sdlc migrate-schema` command. AJV remains the
 * authoritative validator at CI; this is a runtime guard for the CLI.
 */
const ArtifactRef = z
  .object({
    path: z.string(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();

const RequirementItem = z
  .object({
    id: z.string().regex(/^R-\d{4}$/),
    title: z.string(),
    status: z.enum([
      "Draft",
      "Planned",
      "Processed",
      "Implemented",
      "Evaluated",
      "Done",
      "Blocked",
    ]),
    owner: z.string().optional(),
    profile: z.string().optional(),
    artifacts: z.array(ArtifactRef).default([]),
    tags: z.array(z.string()).default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const DecisionItem = z
  .object({
    id: z.string().regex(/^ADR-\d{4}$/),
    title: z.string(),
    status: z.enum(["Proposed", "Accepted", "Superseded", "Rejected"]),
    path: z.string().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .passthrough();

export const MemoryIndexSchema = z
  .object({
    version: z.string(),
    generatedAt: z.string(),
    project: z
      .object({
        name: z.string(),
        kind: z.string().optional(),
        teamMode: z.enum(["solo", "team"]).optional(),
      })
      .passthrough(),
    profiles: z.record(z.string(), z.unknown()).default({}),
    requirements: z
      .object({
        items: z.array(RequirementItem).default([]),
      })
      .default({ items: [] }),
    decisions: z
      .object({
        items: z.array(DecisionItem).default([]),
      })
      .default({ items: [] }),
  })
  .passthrough();

export type MemoryIndex = z.infer<typeof MemoryIndexSchema>;

const indexRel = "docs/agent-memory/index.json";

export const indexPathFor = (root: string): string => path.join(root, indexRel);

export const readMemoryIndex = (root: string): MemoryIndex => {
  const p = indexPathFor(root);
  if (!fs.existsSync(p)) {
    throw new Error(
      `Memory index not found at ${p}. Run 'ai-sdlc init' first.`,
    );
  }
  const raw = stripBom(fs.readFileSync(p, "utf8"));
  return MemoryIndexSchema.parse(JSON.parse(raw));
};

export const writeMemoryIndex = (root: string, idx: MemoryIndex): void => {
  // Validate before writing — never persist a structurally-bad index.
  const safe = MemoryIndexSchema.parse(idx);
  fs.writeFileSync(
    indexPathFor(root),
    JSON.stringify(safe, null, 2) + "\n",
    "utf8",
  );
};

export const nextRequirementId = (idx: MemoryIndex): string => {
  let max = 0;
  for (const r of idx.requirements.items) {
    const m = r.id.match(/^R-(\d{4})$/);
    if (m && m[1]) max = Math.max(max, Number(m[1]));
  }
  return `R-${String(max + 1).padStart(4, "0")}`;
};

/**
 * Append a single event into `index.json.events[]` without re-validating
 * the entire schema (events are passthrough-friendly). Safe no-op if the
 * index file is missing. Used by mutating commands to feed
 * `ai-sdlc changelog` / `dora-export`.
 */
export const appendEvent = (
  root: string,
  ev: { type: string; at?: string; payload?: Record<string, unknown> },
): void => {
  const p = indexPathFor(root);
  if (!fs.existsSync(p)) return;
  const raw = stripBom(fs.readFileSync(p, "utf8"));
  const obj = JSON.parse(raw) as Record<string, unknown>;
  const events =
    (obj.events as Array<Record<string, unknown>> | undefined) ?? [];
  events.push({
    type: ev.type,
    at: ev.at ?? new Date().toISOString(),
    payload: ev.payload ?? {},
  });
  obj.events = events;
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
};
