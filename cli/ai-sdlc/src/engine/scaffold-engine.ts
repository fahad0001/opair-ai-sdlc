import fs from "node:fs";
import path from "node:path";
import { copyTemplate, templatesRoot } from "./template-fs.js";
import { loadAllAgents } from "./agent-yaml.js";
import { renderAgents, readAhcBlock } from "./renderers.js";
import { renderPrompts, loadPrompts } from "./prompt-renderers.js";
import type { WizardAnswers } from "../types.js";
import { writeMemoryIndex } from "./memory.js";
import { sha256OfFile } from "./hashes.js";

/**
 * High-level scaffold orchestrator.
 *
 * Steps (each independently logged):
 *  1. Copy the agent-memory framework skeleton into target.
 *  2. Copy the chosen stack template (if any).
 *  3. Render vendor-specific agent files from neutral YAML.
 *  4. Write meta.json + initialize index.json with project metadata,
 *     team mode, vendors, compliance.
 *  5. Generate hash anchors for the AHC artifacts.
 */
export interface ScaffoldResult {
  written: string[];
  skipped: string[];
  vendors: string[];
}

export const scaffoldProject = async (
  answers: WizardAnswers,
): Promise<ScaffoldResult> => {
  fs.mkdirSync(answers.targetDir, { recursive: true });

  const tplRoot = templatesRoot();
  const written: string[] = [];
  const skipped: string[] = [];

  // 1. Framework skeleton (docs/agent-memory + AGENTS.md + scripts + workflows)
  const frameworkSrc = path.join(tplRoot, "framework");
  if (fs.existsSync(frameworkSrc)) {
    const r = copyTemplate(frameworkSrc, answers.targetDir, {
      vars: substVars(answers),
      skipExisting: true,
    });
    written.push(...r.written);
    skipped.push(...r.skipped);
  }

  // 2. Stack template
  const stackSrc = path.join(tplRoot, "stacks", answers.stackId);
  if (fs.existsSync(stackSrc)) {
    const r = copyTemplate(stackSrc, answers.targetDir, {
      vars: substVars(answers),
      skipExisting: true,
    });
    written.push(...r.written);
    skipped.push(...r.skipped);
  }

  // 3. Render vendor agents from neutral YAML.
  //    Neutral YAMLs ship under templates/agents/.
  const agentsDir = path.join(tplRoot, "agents");
  const agents = loadAllAgents(agentsDir);
  if (agents.length > 0 && answers.vendors.length > 0) {
    const ahcBlock = readAhcBlock(answers.targetDir);
    const results = renderAgents(agents, answers.vendors, {
      targetRoot: answers.targetDir,
      ahcBlock,
    });
    for (const r of results) written.push(...r.files);
  }

  // 3b. Render vendor PROMPT files (slash-commands).
  const promptsDir = path.join(tplRoot, "prompts");
  const prompts = loadPrompts(promptsDir);
  if (prompts.length > 0 && answers.vendors.length > 0) {
    const presults = renderPrompts(prompts, answers.vendors, answers.targetDir);
    for (const r of presults) written.push(...r.files);
  }

  // 4. Write meta.json reflecting the wizard answers.
  const meta = {
    schemaVersion: "1.0",
    project: {
      name: answers.projectName,
      kind: answers.projectKind,
      stack: answers.stackId,
      teamMode: answers.teamMode,
      license: answers.license,
    },
    vendors: answers.vendors,
    compliance: answers.compliance,
    qualityGates: answers.qualityGates,
    addCi: answers.addCi,
    addMcpServer: answers.addMcpServer,
    bulkRequirements: answers.bulkRequirements,
    generatedBy: "ai-sdlc",
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(answers.targetDir, "ai-sdlc.config.json"),
    JSON.stringify(meta, null, 2) + "\n",
    "utf8",
  );
  written.push("ai-sdlc.config.json");

  // 5. Initialize/refresh index.json with project info + hash anchors
  const indexPath = path.join(
    answers.targetDir,
    "docs",
    "agent-memory",
    "index.json",
  );
  if (fs.existsSync(indexPath)) {
    const raw = fs.readFileSync(indexPath, "utf8").replace(/^\uFEFF/, "");
    const idx = JSON.parse(raw);
    idx.project = idx.project || {};
    idx.project.name = answers.projectName;
    idx.project.kind = answers.projectKind;
    idx.project.teamMode = answers.teamMode;
    idx.generatedAt = new Date().toISOString();
    // Hash-anchor the AHC artifacts so drift is detectable.
    const anchorPaths = [
      "docs/agent-memory/00-anti-hallucination-charter.md",
      "docs/agent-memory/anti-hallucination-block.md",
      "docs/agent-memory/evidence.schema.json",
      "docs/agent-memory/index.schema.json",
    ];
    idx.foundationArtifacts = anchorPaths
      .filter((rel) => fs.existsSync(path.join(answers.targetDir, rel)))
      .map((rel) => ({
        path: rel,
        sha256: sha256OfFile(path.join(answers.targetDir, rel)),
      }));
    writeMemoryIndex(answers.targetDir, idx);
  }

  // 6. Emit polish/quality-of-life files (idempotent; skip if exists).
  writePolishFiles(answers.targetDir, written, skipped);

  return { written, skipped, vendors: answers.vendors };
};

const POLISH_FILES: Record<string, string> = {
  ".editorconfig": `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
`,
  ".markdownlint.json":
    JSON.stringify(
      {
        default: true,
        MD013: false,
        MD033: false,
        MD041: false,
      },
      null,
      2,
    ) + "\n",
  ".cspell.json":
    JSON.stringify(
      {
        version: "0.2",
        language: "en",
        words: ["agentmem", "AHC", "tsup", "vitest", "kleur", "execa", "clack"],
        ignorePaths: ["node_modules/**", "dist/**", "**/*.min.*"],
      },
      null,
      2,
    ) + "\n",
  ".gitleaks.toml": `# gitleaks config (default rules + custom additions)
title = "ai-sdlc default"

[allowlist]
description = "Skip generated dirs"
paths = [
  '''node_modules''',
  '''dist''',
  '''docs/agent-memory/index\\.json''',
]
`,
  ".lychee.toml": `# lychee link checker
exclude_all_private = true
accept = [200, 206, 429]
timeout = 20
`,
  ".github/CODEOWNERS": `# Default owner: keep one team listed so reviews never stall.
# Adjust ownership as the repo grows.
*                                @${"OWNER_PLACEHOLDER"}
/docs/agent-memory/              @${"OWNER_PLACEHOLDER"}
/.github/                        @${"OWNER_PLACEHOLDER"}
`,
  ".github/PULL_REQUEST_TEMPLATE.md": `## Summary

<!-- What changed and why? -->

## Linked requirement(s)
- R-XXXX

## AHC compliance checklist
- [ ] Pillar 1 — Evidence: every claim cites a file/test/log
- [ ] Pillar 2 — Schema-locked: outputs validated by JSON schemas
- [ ] Pillar 3 — Tool-only facts: no invented file contents/URLs
- [ ] Pillar 4 — Test-as-truth: tests added/updated; CI green
- [ ] Pillar 5 — Verifier: separate verifier agent (or reviewer) signed off

## Traceability
- [ ] \`docs/agent-memory/02-requirements/R-XXXX/traceability.md\` updated
- [ ] \`docs/agent-memory/08-progress-index.md\` updated
- [ ] \`docs/agent-memory/index.json\` updated

## Quality gates
- [ ] Unit + integration tests pass
- [ ] Lint, type, format clean
- [ ] Security scans clean (or waived in ADR)
- [ ] Coverage threshold met (if applicable)

## Risk / rollback
<!-- Blast radius, rollback steps, feature flag, etc. -->
`,
  ".github/ISSUE_TEMPLATE/requirement.md": `---
name: New requirement (R-XXXX)
about: Capture a new requirement to be planned, processed, executed, evaluated.
labels: [requirement]
---

## Title
<!-- Short, action-oriented -->

## User story
As a **<role>**, I want **<capability>** so that **<outcome>**.

## Acceptance criteria
- [ ] Given …, when …, then …

## Non-functional
- Performance:
- Security:
- Privacy:
- Accessibility:

## Constraints
- 

## Open questions
- 
`,
};

const writePolishFiles = (
  root: string,
  written: string[],
  skipped: string[],
) => {
  for (const [rel, content] of Object.entries(POLISH_FILES)) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) {
      skipped.push(rel);
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
    written.push(rel);
  }
};

const substVars = (a: WizardAnswers): Record<string, string> => ({
  projectName: a.projectName,
  projectKind: a.projectKind,
  stackId: a.stackId,
  teamMode: a.teamMode,
  license: a.license,
  year: String(new Date().getFullYear()),
});
