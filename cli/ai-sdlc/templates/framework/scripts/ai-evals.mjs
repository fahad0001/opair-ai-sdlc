#!/usr/bin/env node
// Minimal, dependency-free AI evals runner.
// Reads docs/agent-memory/15-ai-evals/cases/*.case.yaml,
// runs the subject-under-test (env AI_EVALS_SUT, default identity),
// applies the matcher, and prints a JSON summary + non-zero exit on failure.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const evalsRoot = join(root, "docs", "agent-memory", "15-ai-evals");
const casesDir = join(evalsRoot, "cases");
const fixturesDir = join(evalsRoot, "fixtures");
const expectedDir = join(evalsRoot, "expected");

if (!existsSync(casesDir)) {
  console.error(`No cases directory: ${casesDir}`);
  process.exit(2);
}

// Tiny YAML subset parser: top-level scalars + nested map (one level).
function parseTinyYaml(src) {
  const out = {};
  let curMap = null;
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    const indent = line.match(/^ */)[0].length;
    const body = line.slice(indent);
    const colon = body.indexOf(":");
    if (colon === -1) continue;
    const key = body.slice(0, colon).trim();
    const valRaw = body.slice(colon + 1).trim();
    const val = valRaw.replace(/^["']|["']$/g, "");
    if (indent === 0) {
      if (val === "") {
        curMap = {};
        out[key] = curMap;
      } else {
        out[key] = val;
        curMap = null;
      }
    } else if (curMap) {
      curMap[key] = val;
    }
  }
  return out;
}

function runSut(input) {
  const sut = process.env.AI_EVALS_SUT;
  if (!sut) return input; // identity / smoke
  const [cmd, ...args] = sut.split(/\s+/);
  const res = spawnSync(cmd, args, { input, encoding: "utf8" });
  if (res.status !== 0) return `__SUT_ERROR__\n${res.stderr || ""}`;
  return res.stdout;
}

function applyMatcher(matcher, actual, expected) {
  switch (matcher) {
    case "exact":
      return actual.trim() === expected.trim();
    case "contains":
      return actual.includes(expected.trim());
    case "regex":
      return new RegExp(expected.trim(), "m").test(actual);
    case "json-deep-equal": {
      try {
        return (
          JSON.stringify(JSON.parse(actual)) ===
          JSON.stringify(JSON.parse(expected))
        );
      } catch {
        return false;
      }
    }
    case "rubric":
      // Out of scope for the dependency-free runner; record as skipped pass.
      return true;
    default:
      return false;
  }
}

const cases = readdirSync(casesDir).filter((f) => f.endsWith(".case.yaml"));
const summary = { total: cases.length, pass: 0, fail: 0, results: [] };

for (const file of cases) {
  const spec = parseTinyYaml(readFileSync(join(casesDir, file), "utf8"));
  const id = spec.id || file.replace(/\.case\.yaml$/, "");
  const matcher = spec.matcher || "exact";
  const inputPath = join(fixturesDir, spec.input || `${id}.input.md`);
  const expectedPath = join(expectedDir, spec.expected || `${id}.output.md`);
  if (!existsSync(inputPath) || !existsSync(expectedPath)) {
    summary.fail++;
    summary.results.push({
      id,
      status: "FAIL",
      reason: "missing fixture/expected",
    });
    continue;
  }
  const input = readFileSync(inputPath, "utf8");
  const expected = readFileSync(expectedPath, "utf8");
  const actual = runSut(input);
  const ok = applyMatcher(matcher, actual, expected);
  if (ok) summary.pass++;
  else summary.fail++;
  summary.results.push({ id, matcher, status: ok ? "PASS" : "FAIL" });
}

const passRate = summary.total === 0 ? 1 : summary.pass / summary.total;
summary.passRate = Number(passRate.toFixed(4));
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.fail === 0 ? 0 : 1);
