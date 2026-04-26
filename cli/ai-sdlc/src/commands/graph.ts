import fs from "node:fs";
import path from "node:path";
import { ok, fail } from "../util/log.js";

export interface GraphOptions {
  cwd: string;
  out?: string;
  format?: "mermaid" | "dot";
  includeAdrs?: boolean;
}

interface IndexEntry {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  links?: { dependsOn?: string[]; blocks?: string[]; adrs?: string[] };
}

interface IndexShape {
  project?: { name?: string };
  requirements?: { items?: IndexEntry[] };
  decisions?: {
    items?: Array<{ id: string; title?: string; status?: string }>;
  };
}

const STATUS_CLASS: Record<string, string> = {
  Draft: "draft",
  Planned: "planned",
  Processed: "processed",
  Implemented: "implemented",
  Evaluated: "evaluated",
  Done: "done",
  Blocked: "blocked",
};

const readJson = <T>(p: string): T =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as T;

const escape = (s: string): string =>
  s.replace(/"/g, '\\"').replace(/\n/g, " ");

export async function cmdGraph(opts: GraphOptions): Promise<string> {
  const root = path.resolve(opts.cwd);
  const idxPath = path.join(root, "docs", "agent-memory", "index.json");
  if (!fs.existsSync(idxPath)) {
    fail(`No index.json at ${idxPath}`);
    throw new Error("missing-index");
  }
  const idx = readJson<IndexShape>(idxPath);
  const items = idx.requirements?.items ?? [];
  const adrs = idx.decisions?.items ?? [];
  const fmt = opts.format ?? "mermaid";

  let body: string;
  if (fmt === "dot") {
    const lines: string[] = [
      "digraph G {",
      '  rankdir="LR";',
      '  node [shape=box, style="rounded,filled", fontname="Inter"];',
    ];
    for (const r of items) {
      lines.push(
        `  "${r.id}" [label="${escape(r.id + " — " + (r.title ?? ""))}", fillcolor="${pickColor(r.status)}"];`,
      );
    }
    if (opts.includeAdrs) {
      for (const a of adrs) {
        lines.push(
          `  "${a.id}" [label="${escape(a.id + ": " + (a.title ?? ""))}", shape=note, fillcolor="#fff7d6"];`,
        );
      }
    }
    for (const r of items) {
      for (const dep of r.links?.dependsOn ?? [])
        lines.push(`  "${r.id}" -> "${dep}" [label="depends"];`);
      for (const b of r.links?.blocks ?? [])
        lines.push(`  "${r.id}" -> "${b}" [label="blocks", color="red"];`);
      if (opts.includeAdrs) {
        for (const a of r.links?.adrs ?? [])
          lines.push(`  "${r.id}" -> "${a}" [style="dashed"];`);
      }
    }
    lines.push("}");
    body = lines.join("\n") + "\n";
  } else {
    const lines: string[] = ["```mermaid", "flowchart LR"];
    for (const r of items) {
      const cls = STATUS_CLASS[r.status ?? "Draft"] ?? "draft";
      lines.push(
        `  ${r.id}["${escape(r.id + " — " + (r.title ?? ""))}"]:::${cls}`,
      );
    }
    if (opts.includeAdrs) {
      for (const a of adrs) {
        lines.push(
          `  ${a.id}{{"${escape(a.id + ": " + (a.title ?? ""))}"}}:::adr`,
        );
      }
    }
    for (const r of items) {
      for (const dep of r.links?.dependsOn ?? [])
        lines.push(`  ${r.id} --> ${dep}`);
      for (const b of r.links?.blocks ?? [])
        lines.push(`  ${r.id} -. blocks .-> ${b}`);
      if (opts.includeAdrs) {
        for (const a of r.links?.adrs ?? []) lines.push(`  ${r.id} -.-> ${a}`);
      }
    }
    lines.push("  classDef draft fill:#eee,stroke:#999,color:#333");
    lines.push("  classDef planned fill:#dbe9ff,stroke:#3b82f6,color:#1e3a8a");
    lines.push(
      "  classDef processed fill:#e0e7ff,stroke:#6366f1,color:#312e81",
    );
    lines.push(
      "  classDef implemented fill:#fef3c7,stroke:#d97706,color:#78350f",
    );
    lines.push(
      "  classDef evaluated fill:#dcfce7,stroke:#16a34a,color:#14532d",
    );
    lines.push("  classDef done fill:#bbf7d0,stroke:#15803d,color:#052e16");
    lines.push("  classDef blocked fill:#fee2e2,stroke:#dc2626,color:#7f1d1d");
    lines.push("  classDef adr fill:#fff7d6,stroke:#a16207,color:#713f12");
    lines.push("```");
    body = lines.join("\n") + "\n";
  }

  if (opts.out) {
    const outPath = path.resolve(root, opts.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, body, "utf8");
    ok(
      `Wrote ${path.relative(root, outPath)} (${items.length} requirements${opts.includeAdrs ? `, ${adrs.length} ADRs` : ""})`,
    );
  } else {
    process.stdout.write(body);
  }
  return body;
}

function pickColor(status: string | undefined): string {
  switch (status) {
    case "Done":
      return "#bbf7d0";
    case "Evaluated":
      return "#dcfce7";
    case "Implemented":
      return "#fef3c7";
    case "Processed":
      return "#e0e7ff";
    case "Planned":
      return "#dbe9ff";
    case "Blocked":
      return "#fee2e2";
    default:
      return "#eeeeee";
  }
}
