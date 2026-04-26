#!/usr/bin/env node
/**
 * Agent Memory CI drift detector.
 *
 * Goals:
 *  1. Every `npm run <script>` referenced in .github/workflows/*.yml MUST exist
 *     in the root package.json (or in a workspace package.json that the workflow
 *     scopes to).
 *  2. Every command listed under `profiles.*.commands` in
 *     docs/agent-memory/index.json (when present) MUST exist as an npm script.
 *  3. Every npm script with a name matching `ci:*` or `gate:*` MUST be invoked
 *     by at least one workflow (otherwise it has rotted).
 *
 * Exits 1 on drift; prints a structured report.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const repoRoot = process.cwd();

const readJson = (p) => {
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
};

const listFiles = (dir, exts) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => exts.some((e) => f.endsWith(e)))
    .map((f) => path.join(dir, f));
};

const collectWorkflowScripts = () => {
  const wfDir = path.join(repoRoot, ".github", "workflows");
  const files = listFiles(wfDir, [".yml", ".yaml"]);
  const refs = new Set();
  const re = /\bnpm\s+(?:run|run-script)\s+([\w:.\-]+)/g;
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    let m;
    while ((m = re.exec(txt)) !== null) refs.add(m[1]);
  }
  return refs;
};

const collectPackageScripts = () => {
  const scripts = new Set();
  const visit = (pj) => {
    const j = readJson(pj);
    if (j && j.scripts) for (const k of Object.keys(j.scripts)) scripts.add(k);
  };
  visit(path.join(repoRoot, "package.json"));
  // workspaces (best-effort: cli/* and apps/* and packages/*)
  for (const dir of ["cli", "apps", "packages"]) {
    const root = path.join(repoRoot, dir);
    if (!fs.existsSync(root)) continue;
    for (const child of fs.readdirSync(root)) {
      visit(path.join(root, child, "package.json"));
    }
  }
  return scripts;
};

const collectIndexCommands = () => {
  const idx = readJson(
    path.join(repoRoot, "docs", "agent-memory", "index.json"),
  );
  if (!idx || !idx.profiles) return [];
  const cmds = [];
  for (const [name, prof] of Object.entries(idx.profiles)) {
    if (prof && Array.isArray(prof.commands)) {
      for (const c of prof.commands) cmds.push({ profile: name, command: c });
    }
  }
  return cmds;
};

const main = () => {
  const wfRefs = collectWorkflowScripts();
  const pkgScripts = collectPackageScripts();
  const idxCmds = collectIndexCommands();

  const missingFromPkg = [...wfRefs].filter((r) => !pkgScripts.has(r));
  const idxMissing = idxCmds.filter((c) => !pkgScripts.has(c.command));
  const gateScripts = [...pkgScripts].filter((s) => /^(ci|gate):/.test(s));
  const orphanedGates = gateScripts.filter((s) => !wfRefs.has(s));

  const drift =
    missingFromPkg.length > 0 ||
    idxMissing.length > 0 ||
    orphanedGates.length > 0;

  console.log("Agent Memory — CI drift detector\n");
  console.log(`Workflow npm-run refs: ${wfRefs.size}`);
  console.log(`Package scripts:       ${pkgScripts.size}`);
  console.log(`Index profile cmds:    ${idxCmds.length}\n`);

  if (missingFromPkg.length) {
    console.log("✗ Workflow references missing from package.json scripts:");
    for (const m of missingFromPkg) console.log(`  - npm run ${m}`);
  }
  if (idxMissing.length) {
    console.log("✗ Index profile commands missing from package.json scripts:");
    for (const m of idxMissing) console.log(`  - [${m.profile}] ${m.command}`);
  }
  if (orphanedGates.length) {
    console.log(
      "✗ Gate-like scripts not invoked by any workflow (rot suspected):",
    );
    for (const m of orphanedGates) console.log(`  - npm run ${m}`);
  }

  if (drift) {
    console.log("\nResult: DRIFT");
    process.exit(1);
  }
  console.log("✔ no drift");
};

if (
  import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
  process.argv[1] === url.fileURLToPath(import.meta.url)
) {
  main();
}
