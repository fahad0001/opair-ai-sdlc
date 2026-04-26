#!/usr/bin/env node
/**
 * .github/scripts/agent-memory-guard.mjs
 *
 * Purpose:
 *  - Enforce presence + consistency of the Agent Memory system.
 *  - Validate index.json shape and requirement artifact expectations.
 *  - Fail CI on missing critical artifacts or broken references.
 *
 * Notes:
 *  - Zero external deps (no AJV). This is a pragmatic guard.
 *  - Pairs well with agent-memory-suggest-fix.mjs (patch suggestions on failure).
 */

import fs from "node:fs";
import path from "node:path";

const fail = (msg) => {
  console.error(`❌ Agent Memory Guard failed: ${msg}`);
  console.error(
    "Hint: CI may upload a fix patch artifact named 'agent-memory-fix-patch'. Apply with: git apply agent-memory-fix.patch",
  );
  process.exit(1);
};

const warn = (msg) => console.warn(`⚠️ ${msg}`);

const exists = (p) => fs.existsSync(p);
const readText = (p) => fs.readFileSync(p, "utf8");

const CORE_FILES = [
  "AGENTS.md",
  "docs/agent-memory/index.rules.md",
  "docs/agent-memory/index.schema.json",
  "docs/agent-memory/index.json",
  "docs/agent-memory/00-project-context.md",
  "docs/agent-memory/01-architecture.md",
  "docs/agent-memory/07-quality-gates.md",
  "docs/agent-memory/08-progress-index.md",
  "docs/agent-memory/06-decisions/README.md",
  "docs/agent-memory/06-decisions/ADR-template.md",
  "docs/agent-logs/README.md",
];

for (const f of CORE_FILES) {
  if (!exists(f)) fail(`Missing core file: ${f}`);
}

// ---- Read + validate index.json basic structure
let index;
try {
  index = JSON.parse(readText("docs/agent-memory/index.json"));
} catch (e) {
  fail(`index.json is not valid JSON: ${e.message}`);
}

const reqs = index?.requirements?.items;
if (!Array.isArray(reqs)) fail(`index.json missing requirements.items array`);

const requiredReqFiles = [
  "requirement.md",
  "acceptance-criteria.md",
  "nonfunctional.md",
  "constraints.md",
  "risks.md",
  "traceability.md",
];

const requiredPlanFilesAfterProcessed = [
  "plan.md",
  "execution-strategy.md",
  "implementation-order.md",
  "validation-plan.md",
  "rollback-plan.md",
];

const requiredEvalFilesAfterEvaluated = [
  "evaluation-report.md",
  "metrics-report.md",
  "compliance-checklist.md",
];

let progressIndex = "";
try {
  progressIndex = readText("docs/agent-memory/08-progress-index.md");
} catch {
  // already checked existence; but keep safe
  progressIndex = "";
}

// Helper to ensure a path is within repo and not obviously malicious.
// This is not a sandbox; it's just a guardrail for accidental bad paths.
const isSafePath = (p) => {
  if (!p || typeof p !== "string") return false;
  if (p.includes("\0")) return false;
  // Disallow absolute paths to avoid referencing outside repo
  if (path.isAbsolute(p)) return false;
  // Disallow parent traversal at start (best-effort)
  if (p.startsWith("..")) return false;
  return true;
};

for (const r of reqs) {
  const id = r?.id;
  if (!id || !/^R-\d{4}$/.test(id)) {
    fail(`Invalid requirement id in index: ${JSON.stringify(r?.id)}`);
  }

  const roots = r?.paths;
  if (
    !roots?.requirementRoot ||
    !roots?.planRoot ||
    !roots?.executionRoot ||
    !roots?.evaluationRoot
  ) {
    fail(
      `${id}: Missing paths.requirementRoot/planRoot/executionRoot/evaluationRoot`,
    );
  }

  // Safety check paths
  for (const k of [
    "requirementRoot",
    "planRoot",
    "executionRoot",
    "evaluationRoot",
  ]) {
    const p = roots[k];
    if (!isSafePath(p)) fail(`${id}: Unsafe path in paths.${k}: ${p}`);
  }

  // Required requirement folder files
  for (const rf of requiredReqFiles) {
    const p = path.join(roots.requirementRoot, rf);
    if (!exists(p)) fail(`${id}: Missing required requirement file: ${p}`);
  }

  const status = r?.status;
  const knownStatuses = [
    "Draft",
    "Planned",
    "Processed",
    "Implemented",
    "Evaluated",
    "Done",
    "Blocked",
  ];
  if (!knownStatuses.includes(status)) {
    fail(
      `${id}: Unknown status '${status}'. Must be one of ${knownStatuses.join(", ")}`,
    );
  }

  // Status-based expectations:
  // Once Processed or beyond, plan artifacts + evaluation criteria must exist.
  if (
    ["Processed", "Implemented", "Evaluated", "Done", "Blocked"].includes(
      status,
    )
  ) {
    for (const pf of requiredPlanFilesAfterProcessed) {
      const p = path.join(roots.planRoot, pf);
      if (!exists(p))
        fail(`${id}: Missing required plan file for status=${status}: ${p}`);
    }
    const criteria = path.join(roots.evaluationRoot, "evaluation-criteria.md");
    if (!exists(criteria))
      fail(
        `${id}: Missing evaluation criteria for status=${status}: ${criteria}`,
      );
  }

  // Once Implemented or beyond, execution notes must exist.
  if (["Implemented", "Evaluated", "Done", "Blocked"].includes(status)) {
    const implNotes = path.join(roots.executionRoot, "implementation-notes.md");
    if (!exists(implNotes))
      fail(
        `${id}: Missing implementation notes for status=${status}: ${implNotes}`,
      );
  }

  // Once Evaluated or beyond, evaluation artifacts should exist.
  // For Blocked, we accept fix-loop in place of full set, but at least one must exist.
  if (["Evaluated", "Done", "Blocked"].includes(status)) {
    const evalReport = path.join(roots.evaluationRoot, "evaluation-report.md");
    const fixLoop = path.join(roots.evaluationRoot, "fix-loop-report.md");

    if (status === "Blocked") {
      if (!exists(evalReport) && !exists(fixLoop)) {
        fail(
          `${id}: Blocked but missing both evaluation-report.md and fix-loop-report.md`,
        );
      }
      // Other eval artifacts are warnings in Blocked state
      for (const ef of requiredEvalFilesAfterEvaluated) {
        const p = path.join(roots.evaluationRoot, ef);
        if (!exists(p))
          warn(
            `${id}: Missing evaluation artifact (recommended even if Blocked): ${p}`,
          );
      }
    } else {
      // Evaluated/Done should have the full set
      for (const ef of requiredEvalFilesAfterEvaluated) {
        const p = path.join(roots.evaluationRoot, ef);
        if (!exists(p))
          fail(`${id}: Missing evaluation artifact for status=${status}: ${p}`);
      }
    }

    if (status === "Done") {
      const finalApproval = path.join(
        roots.evaluationRoot,
        "final-approval-report.md",
      );
      if (!exists(finalApproval)) {
        warn(
          `${id}: Done but missing final-approval-report.md (recommended). Expected: ${finalApproval}`,
        );
      }
      const finalSummary = path.join(roots.executionRoot, "final-summary.md");
      if (!exists(finalSummary)) {
        warn(
          `${id}: Done but missing final-summary.md (recommended). Expected: ${finalSummary}`,
        );
      }
    }
  }

  // latest.* references should exist if present (these are full repo-relative paths)
  for (const k of ["plan", "execution", "evaluation"]) {
    const ref = r?.latest?.[k]?.file;
    if (ref) {
      if (!isSafePath(ref))
        fail(`${id}: Unsafe path in latest.${k}.file: ${ref}`);
      if (!exists(ref))
        fail(`${id}: latest.${k}.file references missing path: ${ref}`);
    } else {
      // Not strictly required by the guard; schema requires it, but we don't fully schema-validate here.
      warn(`${id}: latest.${k}.file is missing (schema expects it).`);
    }
  }

  // progress-index best-effort check
  if (!progressIndex.includes(id)) {
    warn(
      `${id}: Not found in docs/agent-memory/08-progress-index.md (best-effort check)`,
    );
  }
}

console.log("✅ Agent Memory Guard passed");
