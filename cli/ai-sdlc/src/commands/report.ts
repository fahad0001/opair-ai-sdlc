import fs from "node:fs";
import path from "node:path";
import { readMemoryIndex } from "../engine/memory.js";
import { log } from "../util/log.js";

/**
 * `ai-sdlc report [--format md|json]` — emits a progress report
 * summarising memory state. Pure read-only.
 */
export const cmdReport = async (opts: {
  cwd: string;
  format?: "md" | "json";
  out?: string;
}): Promise<void> => {
  const idx = readMemoryIndex(opts.cwd);
  const fmt = opts.format ?? "md";
  let content = "";
  if (fmt === "json") {
    content = JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        project: idx.project,
        counts: {
          requirements: idx.requirements.items.length,
          decisions: idx.decisions.items.length,
        },
        byStatus: groupByStatus(idx.requirements.items),
      },
      null,
      2,
    );
  } else {
    const lines: string[] = [];
    lines.push(`# ${idx.project.name} — ai-sdlc report`);
    lines.push("");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("## Requirements");
    lines.push("");
    if (idx.requirements.items.length === 0) {
      lines.push("(none)");
    } else {
      lines.push("| ID | Title | Status | Owner |");
      lines.push("|----|-------|--------|-------|");
      for (const r of idx.requirements.items) {
        lines.push(`| ${r.id} | ${r.title} | ${r.status} | ${r.owner ?? ""} |`);
      }
    }
    lines.push("");
    lines.push("## Decisions (ADRs)");
    lines.push("");
    if (idx.decisions.items.length === 0) {
      lines.push("(none)");
    } else {
      lines.push("| ID | Title | Status |");
      lines.push("|----|-------|--------|");
      for (const d of idx.decisions.items) {
        lines.push(`| ${d.id} | ${d.title} | ${d.status} |`);
      }
    }
    content = lines.join("\n") + "\n";
  }

  if (opts.out) {
    fs.mkdirSync(path.dirname(path.resolve(opts.cwd, opts.out)), {
      recursive: true,
    });
    fs.writeFileSync(path.resolve(opts.cwd, opts.out), content, "utf8");
    log.ok(`report written to ${opts.out}`);
  } else {
    console.log(content);
  }
};

const groupByStatus = (items: { status: string }[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const r of items) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
};
