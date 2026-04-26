#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PATCH_FILE = "agent-memory-fix.patch";

const nowIso = () => new Date().toISOString();

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

const exists = (p) => fs.existsSync(p);

const writeIfMissing = (p, content) => {
  if (!exists(p)) {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, content, "utf8");
  }
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, obj) =>
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");

const listDirs = (root) => {
  if (!exists(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
};

const safeExec = (cmd) =>
  execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8");

const REQUIREMENT_FILES = [
  "requirement.md",
  "acceptance-criteria.md",
  "nonfunctional.md",
  "constraints.md",
  "risks.md",
  "traceability.md",
];

const CORE_PLACEHOLDERS = {
  "AGENTS.md": `# AGENTS.md\n\nMissing in repo. Please restore your full AGENTS.md.\n`,
  "docs/agent-memory/index.rules.md": `# Agent Memory Index — Update Rules\n\nMissing in repo. Please restore your full index.rules.md.\n`,
  "docs/agent-memory/index.schema.json": `{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "title": "Placeholder schema (restore full schema)",\n  "type": "object"\n}\n`,
  "docs/agent-memory/index.json":
    JSON.stringify(
      {
        version: "1.0.0",
        generatedAt: nowIso(),
        project: {
          name: "Your Project Name",
          repoRoot: ".",
          memoryRoot: "docs/agent-memory",
          timezone: "Asia/Karachi",
        },
        profiles: {
          frontend: {
            name: "TanStack Start",
            location: "apps/web",
            commands: {
              install: "pnpm install",
              typecheck: "pnpm -C apps/web typecheck",
              lint: "pnpm -C apps/web lint",
              test: "pnpm -C apps/web test",
              build: "pnpm -C apps/web build",
            },
          },
          backend: {
            name: "TBD",
            location: "apps/api",
            commands: {
              install: "pnpm install",
              typecheck: "pnpm -C apps/api typecheck",
              lint: "pnpm -C apps/api lint",
              test: "pnpm -C apps/api test",
              build: "pnpm -C apps/api build",
            },
          },
          shared: { locations: ["packages/shared", "packages/config"] },
        },
        requirements: { sequence: 0, items: [] },
        decisions: { sequence: 0, items: [] },
        qualityGates: {
          file: "docs/agent-memory/07-quality-gates.md",
          profiles: ["frontend", "backend"],
        },
        logs: {
          root: "docs/agent-logs",
          convention: "YYYY-MM-DD__R-XXXX__<agent>.md",
        },
      },
      null,
      2,
    ) + "\n",
  "docs/agent-memory/00-project-context.md": `# Project Context\n\n(Placeholder created by CI self-heal suggestion. Replace with full content.)\n`,
  "docs/agent-memory/01-architecture.md": `# Architecture\n\n(Placeholder created by CI self-heal suggestion. Replace with full content.)\n`,
  "docs/agent-memory/07-quality-gates.md": `# Quality Gates\n\n(Placeholder created by CI self-heal suggestion. Replace with full content.)\n`,
  "docs/agent-memory/08-progress-index.md": `# Progress Index\n\n| Requirement | Title | Status | Priority | Last Agent | Last Updated | Links |\n|---|---|---|---|---|---|---|\n`,
  "docs/agent-memory/06-decisions/README.md": `# Architecture Decision Records (ADR)\n\n(Placeholder created by CI self-heal suggestion. Replace with full content.)\n`,
  "docs/agent-memory/06-decisions/ADR-template.md": `# ADR-XXXX: <Title>\n\n(Placeholder created by CI self-heal suggestion. Replace with full content.)\n`,
  "docs/agent-logs/README.md": `# Agent Logs\n\n(Placeholder created by CI self-heal suggestion. Replace with full content.)\n`,
  "docs/agent-memory/13-architecture-patterns/README.md": `# Architecture Patterns\n\n(Placeholder — restore from cli/agent-mem/templates/framework.)\n`,
  "docs/agent-memory/14-threat-models/README.md": `# Threat Models\n\n(Placeholder — restore from cli/agent-mem/templates/framework.)\n`,
  "docs/agent-memory/15-ai-evals/README.md": `# AI Eval Harness\n\n(Placeholder — restore from cli/agent-mem/templates/framework.)\n`,
  "docs/agent-memory/16-observability/README.md": `# Observability\n\n(Placeholder — restore from cli/agent-mem/templates/framework.)\n`,
  "docs/agent-memory/17-release/release-management.md": `# Release Management\n\n(Placeholder — restore from cli/agent-mem/templates/framework.)\n`,
  ".github/CODEOWNERS": `*  @OWNER_PLACEHOLDER\n`,
  ".github/PULL_REQUEST_TEMPLATE.md": `## Summary\n\n## Linked requirement(s)\n- R-XXXX\n\n## AHC compliance checklist\n- [ ] Pillar 1 — Evidence\n- [ ] Pillar 2 — Schema-locked\n- [ ] Pillar 3 — Tool-only facts\n- [ ] Pillar 4 — Test-as-truth\n- [ ] Pillar 5 — Verifier\n`,
};

const requirementFileTemplate = (id, fileName) => {
  const title = `<Title>`;
  switch (fileName) {
    case "requirement.md":
      return `# Requirement: ${id} — ${title}\n\n(Placeholder created by CI self-heal suggestion.)\n`;
    case "acceptance-criteria.md":
      return `# Acceptance Criteria — ${id}\n\n(Placeholder created by CI self-heal suggestion.)\n`;
    case "nonfunctional.md":
      return `# Nonfunctional Requirements — ${id}\n\n(Placeholder created by CI self-heal suggestion.)\n`;
    case "constraints.md":
      return `# Constraints — ${id}\n\n(Placeholder created by CI self-heal suggestion.)\n`;
    case "risks.md":
      return `# Risks — ${id}\n\n(Placeholder created by CI self-heal suggestion.)\n`;
    case "traceability.md":
      return `# Traceability Matrix — ${id}\n\n(Placeholder created by CI self-heal suggestion.)\n`;
    default:
      return `# ${fileName} — ${id}\n\n(Placeholder)\n`;
  }
};

const main = () => {
  // Ensure git is available
  try {
    safeExec("git rev-parse --is-inside-work-tree");
  } catch {
    console.error("❌ Not a git repo; cannot produce a patch.");
    process.exit(1);
  }

  // 1) Ensure baseline directories
  ensureDir("docs/agent-memory");
  ensureDir("docs/agent-logs");
  ensureDir("docs/agent-memory/02-requirements");
  ensureDir("docs/agent-memory/03-plans");
  ensureDir("docs/agent-memory/04-execution");
  ensureDir("docs/agent-memory/05-evaluation");
  ensureDir("docs/agent-memory/06-decisions");
  ensureDir("docs/agent-memory/13-architecture-patterns");
  ensureDir("docs/agent-memory/14-threat-models");
  ensureDir("docs/agent-memory/15-ai-evals");
  ensureDir("docs/agent-memory/16-observability");
  ensureDir("docs/agent-memory/16-observability/runbooks");
  ensureDir("docs/agent-memory/17-release");
  ensureDir(".github");

  // 2) Create missing core files as placeholders
  for (const [p, content] of Object.entries(CORE_PLACEHOLDERS)) {
    writeIfMissing(p, content);
  }

  // 3) Ensure templates folders exist (won't populate full templates here)
  ensureDir("docs/agent-memory/03-plans/_templates");
  ensureDir("docs/agent-memory/05-evaluation/_templates");

  // 4) Ensure each requirement folder has required files
  const reqFolders = listDirs("docs/agent-memory/02-requirements").filter((n) =>
    /^R-\d{4}$/.test(n),
  );
  for (const rf of reqFolders) {
    const root = path.join("docs/agent-memory/02-requirements", rf);
    for (const f of REQUIREMENT_FILES) {
      writeIfMissing(path.join(root, f), requirementFileTemplate(rf, f));
    }
    // Ensure sibling stage folders exist
    ensureDir(path.join("docs/agent-memory/03-plans", rf));
    ensureDir(path.join("docs/agent-memory/04-execution", rf));
    ensureDir(path.join("docs/agent-memory/05-evaluation", rf));
  }

  // 5) Ensure index.json has entries for discovered R-XXXX folders
  let index = readJson("docs/agent-memory/index.json");
  if (!index.requirements) index.requirements = { sequence: 0, items: [] };
  if (!Array.isArray(index.requirements.items)) index.requirements.items = [];

  const existingIds = new Set(index.requirements.items.map((x) => x.id));

  const addRequirementEntry = (id) => {
    const dt = nowIso();
    return {
      id,
      title: "<Title>",
      status: "Draft",
      priority: "P2",
      tags: ["auto-heal-suggested"],
      createdAt: dt,
      updatedAt: dt,
      owner: { agent: "CI-SelfHeal", human: "" },
      paths: {
        requirementRoot: `docs/agent-memory/02-requirements/${id}`,
        planRoot: `docs/agent-memory/03-plans/${id}`,
        executionRoot: `docs/agent-memory/04-execution/${id}`,
        evaluationRoot: `docs/agent-memory/05-evaluation/${id}`,
      },
      latest: {
        plan: {
          file: `docs/agent-memory/03-plans/${id}/plan.md`,
          updatedAt: dt,
        },
        execution: {
          file: `docs/agent-memory/04-execution/${id}/implementation-notes.md`,
          updatedAt: dt,
        },
        evaluation: {
          file: `docs/agent-memory/05-evaluation/${id}/evaluation-report.md`,
          updatedAt: dt,
        },
      },
      links: {
        progressIndexRowHint: `Row contains ${id}`,
        relatedAdrs: [],
        dependsOn: [],
        blocks: [],
      },
    };
  };

  let addedAny = false;
  for (const id of reqFolders) {
    if (!existingIds.has(id)) {
      index.requirements.items.push(addRequirementEntry(id));
      addedAny = true;
    }
  }

  // 6) Ensure latest.* refs exist if they point to missing files, fallback to safe existing placeholders
  const ensureLatest = (entry) => {
    const dt = nowIso();
    const { planRoot, executionRoot, evaluationRoot } = entry.paths;

    const planCandidates = [
      "plan.md",
      "execution-strategy.md",
      "implementation-order.md",
    ].map((f) => path.join(planRoot, f));
    const execCandidates = ["implementation-notes.md", "final-summary.md"].map(
      (f) => path.join(executionRoot, f),
    );
    const evalCandidates = [
      "evaluation-report.md",
      "fix-loop-report.md",
      "final-approval-report.md",
    ].map((f) => path.join(evaluationRoot, f));

    const pickFirstExistingOrFirst = (cands) => cands.find(exists) || cands[0];

    entry.latest.plan.file = pickFirstExistingOrFirst(planCandidates);
    entry.latest.execution.file = pickFirstExistingOrFirst(execCandidates);
    entry.latest.evaluation.file = pickFirstExistingOrFirst(evalCandidates);

    entry.latest.plan.updatedAt = dt;
    entry.latest.execution.updatedAt = dt;
    entry.latest.evaluation.updatedAt = dt;
  };

  for (const entry of index.requirements.items) {
    if (entry?.paths?.planRoot && entry?.latest?.plan?.file) {
      ensureLatest(entry);
    }
  }

  // 7) Update index metadata
  index.generatedAt = nowIso();
  if (typeof index.requirements.sequence !== "number")
    index.requirements.sequence = 0;
  if (addedAny) index.requirements.sequence += 1;

  writeJson("docs/agent-memory/index.json", index);

  // 8) Produce patch
  const diff = safeExec("git diff");
  fs.writeFileSync(PATCH_FILE, diff, "utf8");

  const changed = diff.trim().length > 0;
  if (!changed) {
    // still write an empty patch file so artifact exists
    console.log("✅ No changes needed; patch is empty.");
  } else {
    console.log(`✅ Patch suggestion written to ${PATCH_FILE}`);
    console.log("Apply locally with: git apply agent-memory-fix.patch");
  }
};

main();
