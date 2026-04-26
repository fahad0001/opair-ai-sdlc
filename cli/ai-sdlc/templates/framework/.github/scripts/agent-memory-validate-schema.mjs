#!/usr/bin/env node
/**
 * .github/scripts/agent-memory-validate-schema.mjs
 *
 * Strict JSON-Schema validation for the Agent Memory system.
 *
 * Validates:
 *  - docs/agent-memory/index.json against docs/agent-memory/index.schema.json
 *  - docs/agent-memory/02-requirements/R-XXXX/meta.json against
 *    docs/agent-memory/02-requirements/meta.schema.json (when present)
 *
 * Requires `ajv` and `ajv-formats` installed (declared in root package.json devDeps).
 * Run `npm install` once before invoking locally; CI installs via `npm ci`.
 */

import fs from "node:fs";
import path from "node:path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const fail = (msg) => {
  console.error(`${RED}\u274c Schema validation failed:${RESET} ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`${GREEN}\u2705${RESET} ${msg}`);
const warn = (msg) => console.warn(`${YELLOW}\u26a0\ufe0f${RESET}  ${msg}`);

const exists = (p) => fs.existsSync(p);
const readJson = (p) => {
  // Strip BOM defensively — Windows tooling sometimes adds one.
  const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
};

let Ajv2020, addFormats;
try {
  Ajv2020 = (await import("ajv/dist/2020.js")).default;
  addFormats = (await import("ajv-formats")).default;
} catch (e) {
  fail(
    "AJV not installed. Run `npm install` at the repository root (root package.json declares ajv + ajv-formats as devDependencies).",
  );
}

const validateAgainst = (ajv, schema, data, label) => {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    const errs = (validate.errors || [])
      .map(
        (e) =>
          `  \u2022 ${e.instancePath || "/"} ${e.message} ${JSON.stringify(e.params)}`,
      )
      .join("\n");
    fail(`${label} does not match schema:\n${errs}`);
  }
  ok(`${label} matches schema`);
};

const indexPath = "docs/agent-memory/index.json";
const indexSchemaPath = "docs/agent-memory/index.schema.json";
const metaSchemaPath = "docs/agent-memory/02-requirements/meta.schema.json";
const reqRoot = "docs/agent-memory/02-requirements";

if (!exists(indexPath)) fail(`Missing ${indexPath}`);
if (!exists(indexSchemaPath)) fail(`Missing ${indexSchemaPath}`);

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

// 1) index.json
const indexSchema = readJson(indexSchemaPath);
const index = readJson(indexPath);
validateAgainst(ajv, indexSchema, index, indexPath);

// 2) per-requirement meta.json (when meta schema exists)
if (exists(metaSchemaPath)) {
  const metaSchema = readJson(metaSchemaPath);
  const dirs = exists(reqRoot)
    ? fs
        .readdirSync(reqRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^R-\d{4}$/.test(d.name))
        .map((d) => d.name)
    : [];
  if (dirs.length === 0) {
    warn("No R-XXXX requirement folders to validate yet (clean template).");
  }
  for (const id of dirs) {
    const metaFile = path.join(reqRoot, id, "meta.json");
    if (!exists(metaFile)) {
      warn(`${id}: no meta.json (optional)`);
      continue;
    }
    const meta = readJson(metaFile);
    validateAgainst(ajv, metaSchema, meta, metaFile);
  }
} else {
  warn(`No ${metaSchemaPath} — skipping per-requirement meta validation.`);
}

ok("All schema checks passed.");
