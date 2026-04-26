import fs from "node:fs";
import path from "node:path";
import { ok, info, fail } from "../util/log.js";

export interface SbomDiffOptions {
  cwd: string;
  before: string;
  after: string;
  json?: boolean;
  out?: string;
}

interface CycloneDxComponent {
  name?: string;
  version?: string;
  purl?: string;
}
interface CycloneDxBom {
  components?: CycloneDxComponent[];
}

const readJson = <T>(p: string): T =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as T;

const keyOf = (c: CycloneDxComponent): string =>
  c.purl ?? `${c.name ?? "?"}@${c.version ?? "?"}`;

export async function cmdSbomDiff(opts: SbomDiffOptions): Promise<void> {
  const before = path.resolve(opts.before);
  const after = path.resolve(opts.after);
  if (!fs.existsSync(before)) {
    fail(`Before SBOM not found: ${before}`);
    return;
  }
  if (!fs.existsSync(after)) {
    fail(`After SBOM not found: ${after}`);
    return;
  }
  const a = readJson<CycloneDxBom>(before);
  const b = readJson<CycloneDxBom>(after);
  const aMap = new Map<string, CycloneDxComponent>();
  const bMap = new Map<string, CycloneDxComponent>();
  for (const c of a.components ?? []) aMap.set(`${c.name ?? "?"}`, c);
  for (const c of b.components ?? []) bMap.set(`${c.name ?? "?"}`, c);

  const added: CycloneDxComponent[] = [];
  const removed: CycloneDxComponent[] = [];
  const changed: Array<{ name: string; from: string; to: string }> = [];

  for (const [name, c] of bMap) {
    if (!aMap.has(name)) added.push(c);
    else {
      const prev = aMap.get(name)!;
      if (prev.version !== c.version) {
        changed.push({ name, from: prev.version ?? "?", to: c.version ?? "?" });
      }
    }
  }
  for (const [name, c] of aMap) {
    if (!bMap.has(name)) removed.push(c);
  }

  const summary = {
    before: path.relative(opts.cwd, before),
    after: path.relative(opts.cwd, after),
    totals: {
      beforeCount: aMap.size,
      afterCount: bMap.size,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
    },
    added: added.map(keyOf),
    removed: removed.map(keyOf),
    changed,
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    info(
      `before=${aMap.size} after=${bMap.size} | +${added.length} -${removed.length} ~${changed.length}`,
    );
    for (const c of added) info(`+ ${keyOf(c)}`);
    for (const c of removed) info(`- ${keyOf(c)}`);
    for (const c of changed) info(`~ ${c.name} ${c.from} → ${c.to}`);
  }

  if (opts.out) {
    fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
    fs.writeFileSync(
      path.resolve(opts.out),
      JSON.stringify(summary, null, 2) + "\n",
      "utf8",
    );
    ok(`Wrote ${opts.out}`);
  }
}
