import fs from "node:fs";
import path from "node:path";
import { ok, info, warn, fail } from "../util/log.js";

export interface CoverageOptions {
  cwd: string;
  out?: string;
  json?: boolean;
}

const KINDS = [
  "web",
  "api",
  "ai",
  "mobile",
  "desktop",
  "cli",
  "library",
  "monorepo",
  "data",
  "automation",
  "infra",
  "docs",
  "generic",
];

const STRIDE = [
  "Spoofing",
  "Tampering",
  "Repudiation",
  "InfoDisclosure",
  "DoS",
  "Elevation",
];

interface Row {
  kind: string;
  file: string;
  exists: boolean;
  hasStride: boolean;
  strideMissing: string[];
  hasLinddun: boolean;
  hasMitigations: boolean;
  bytes: number;
}

const stripBom = (s: string): string => s.replace(/^\uFEFF/, "");

export async function cmdThreatCoverage(opts: CoverageOptions): Promise<void> {
  const root = path.resolve(opts.cwd);
  const tmDir = path.join(root, "docs", "agent-memory", "14-threat-models");
  if (!fs.existsSync(tmDir)) {
    fail(`No 14-threat-models/ directory at ${tmDir}. Scaffold first.`);
    return;
  }

  const rows: Row[] = [];
  for (const k of KINDS) {
    const file = path.join(tmDir, `${k}.md`);
    const exists = fs.existsSync(file);
    if (!exists) {
      rows.push({
        kind: k,
        file: path.relative(root, file),
        exists: false,
        hasStride: false,
        strideMissing: [...STRIDE],
        hasLinddun: false,
        hasMitigations: false,
        bytes: 0,
      });
      continue;
    }
    const txt = stripBom(fs.readFileSync(file, "utf8"));
    const lc = txt.toLowerCase();
    const strideMissing = STRIDE.filter(
      (s) => !lc.includes(s.toLowerCase().replace(/disclosure$/, "")),
    );
    rows.push({
      kind: k,
      file: path.relative(root, file),
      exists: true,
      hasStride: strideMissing.length === 0,
      strideMissing,
      hasLinddun:
        lc.includes("linddun") ||
        lc.includes("linkability") ||
        lc.includes("identifiability"),
      hasMitigations: lc.includes("mitigation"),
      bytes: txt.length,
    });
  }

  const present = rows.filter((r) => r.exists).length;
  const fullStride = rows.filter((r) => r.hasStride).length;
  const fullLinddun = rows.filter((r) => r.hasLinddun).length;
  const fullMit = rows.filter((r) => r.hasMitigations).length;

  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        {
          root,
          totals: {
            kinds: KINDS.length,
            present,
            fullStride,
            fullLinddun,
            fullMit,
          },
          rows,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  const lines: string[] = [];
  lines.push(`# Threat-model coverage matrix`);
  lines.push("");
  lines.push(`- Kinds covered: **${present}/${KINDS.length}**`);
  lines.push(`- Full STRIDE: **${fullStride}/${KINDS.length}**`);
  lines.push(`- LINDDUN present: **${fullLinddun}/${KINDS.length}**`);
  lines.push(`- Mitigations referenced: **${fullMit}/${KINDS.length}**`);
  lines.push("");
  lines.push(`| Kind | File | STRIDE | LINDDUN | Mitigations | Bytes |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of rows) {
    if (!r.exists) {
      lines.push(`| \`${r.kind}\` | _missing_ | ❌ | ❌ | ❌ | 0 |`);
    } else {
      const strideCell = r.hasStride
        ? "✅"
        : `⚠ missing: ${r.strideMissing.join(", ")}`;
      lines.push(
        `| \`${r.kind}\` | [${r.file}](${r.file.replace(/\\/g, "/")}) | ${strideCell} | ${r.hasLinddun ? "✅" : "—"} | ${r.hasMitigations ? "✅" : "—"} | ${r.bytes} |`,
      );
    }
  }

  const out = path.resolve(
    opts.out ??
      path.join(
        root,
        "docs",
        "agent-memory",
        "14-threat-models",
        "coverage.md",
      ),
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  ok(`Wrote ${path.relative(root, out)}`);
  info(
    `coverage: ${present}/${KINDS.length} kinds · STRIDE ${fullStride}/${KINDS.length}`,
  );
  if (present < KINDS.length)
    warn(
      `${KINDS.length - present} kind(s) missing — Run 'ai-sdlc repair' to restore.`,
    );
}
