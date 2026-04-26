import fs from "node:fs";
import path from "node:path";
import { detectPm, type PackageManager } from "./pm-detect.js";

/**
 * Brownfield-deep adoption helpers.
 *
 * Phases:
 *   1. Detection — locate existing tests, lint, types, CI, IaC, secrets-scan,
 *      coverage, license, README, CHANGELOG, codeowners.
 *   2. Capture   — snapshot the current state to docs/agent-memory/09-audits/<date>/
 *      so future audits can compare.
 *   3. Audit     — gap-analysis vs. AHC pillars + project-kind quality gates.
 *   4. Safe-fix  — apply ONLY idempotent, non-destructive fixes (create
 *      missing files, never modify existing).
 *   5. Findings  — write findings.md.
 *   6. Adoption-report — top-level summary.
 *
 * Hard rule: this module never deletes or rewrites files the user authored.
 */

export interface DetectionReport {
  hasTests: { unit: boolean; integration: boolean; e2e: boolean };
  hasLint: boolean;
  hasFormat: boolean;
  hasTypeCheck: boolean;
  hasCI: { provider: string | null };
  hasCodeowners: boolean;
  hasPRTemplate: boolean;
  hasReadme: boolean;
  hasChangelog: boolean;
  hasLicense: boolean;
  hasSecretsScan: boolean;
  hasIaC: boolean;
  pm: { manager: PackageManager; reason: string };
  signals: { kind: string; file: string }[];
}

export interface AuditFinding {
  severity: "low" | "medium" | "high" | "critical";
  area:
    | "tests"
    | "lint"
    | "ci"
    | "secrets"
    | "ahc"
    | "ownership"
    | "docs"
    | "license";
  message: string;
  fix?: string;
}

const exists = (root: string, rel: string) =>
  fs.existsSync(path.join(root, rel));

const anyMatch = (root: string, globs: string[]) =>
  globs.some((g) => exists(root, g));

const detectCI = (root: string): { provider: string | null } => {
  if (
    fs.existsSync(path.join(root, ".github", "workflows")) &&
    fs.readdirSync(path.join(root, ".github", "workflows")).length > 0
  ) {
    return { provider: "github-actions" };
  }
  if (exists(root, ".gitlab-ci.yml")) return { provider: "gitlab-ci" };
  if (exists(root, ".circleci/config.yml")) return { provider: "circleci" };
  if (exists(root, "azure-pipelines.yml")) return { provider: "azure-devops" };
  if (exists(root, "Jenkinsfile")) return { provider: "jenkins" };
  if (exists(root, ".travis.yml")) return { provider: "travis" };
  return { provider: null };
};

export const detectExisting = (root: string): DetectionReport => {
  const signals: DetectionReport["signals"] = [];
  const note = (kind: string, file: string) => signals.push({ kind, file });

  const hasUnit = anyMatch(root, [
    "vitest.config.ts",
    "vitest.config.js",
    "jest.config.ts",
    "jest.config.js",
    "pytest.ini",
    "pyproject.toml",
  ]);
  if (hasUnit) note("unit-tests", "config present");

  const hasIntegration = anyMatch(root, [
    "test/integration",
    "tests/integration",
    "integration",
  ]);
  const hasE2E = anyMatch(root, [
    "playwright.config.ts",
    "cypress.config.ts",
    "e2e",
    "tests/e2e",
  ]);
  const hasLint = anyMatch(root, [
    ".eslintrc",
    ".eslintrc.cjs",
    ".eslintrc.json",
    "eslint.config.js",
    "eslint.config.mjs",
    ".ruff.toml",
    "ruff.toml",
  ]);
  if (hasLint) note("lint", "config present");

  const hasFormat = anyMatch(root, [
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.cjs",
    "prettier.config.js",
    "biome.json",
  ]);
  const hasTypeCheck =
    exists(root, "tsconfig.json") ||
    exists(root, "pyproject.toml"); /* mypy/pyright likely */
  const ci = detectCI(root);
  if (ci.provider) note("ci", ci.provider);

  const hasCodeowners =
    exists(root, "CODEOWNERS") ||
    exists(root, ".github/CODEOWNERS") ||
    exists(root, "docs/CODEOWNERS");
  const hasPRTemplate =
    exists(root, ".github/PULL_REQUEST_TEMPLATE.md") ||
    exists(root, ".github/pull_request_template.md");
  const hasReadme = anyMatch(root, ["README.md", "Readme.md", "readme.md"]);
  const hasChangelog = anyMatch(root, ["CHANGELOG.md", "Changelog.md"]);
  const hasLicense = anyMatch(root, ["LICENSE", "LICENSE.md", "LICENSE.txt"]);
  const hasSecretsScan = anyMatch(root, [
    ".gitleaks.toml",
    ".trufflehog",
    ".pre-commit-config.yaml",
  ]);
  const hasIaC = anyMatch(root, [
    "main.tf",
    "infrastructure",
    "pulumi.yaml",
    "cdk.json",
    "serverless.yml",
  ]);

  return {
    hasTests: { unit: hasUnit, integration: hasIntegration, e2e: hasE2E },
    hasLint,
    hasFormat,
    hasTypeCheck,
    hasCI: ci,
    hasCodeowners,
    hasPRTemplate,
    hasReadme,
    hasChangelog,
    hasLicense,
    hasSecretsScan,
    hasIaC,
    pm: { manager: detectPm(root).pm, reason: detectPm(root).reason },
    signals,
  };
};

export const audit = (det: DetectionReport): AuditFinding[] => {
  const out: AuditFinding[] = [];
  if (!det.hasTests.unit) {
    out.push({
      severity: "high",
      area: "tests",
      message: "No unit-test config detected.",
      fix: "Add vitest/jest/pytest and a smoke test.",
    });
  }
  if (!det.hasTests.e2e) {
    out.push({
      severity: "medium",
      area: "tests",
      message: "No e2e test config detected.",
      fix: "Add Playwright/Cypress or document why e2e is out of scope.",
    });
  }
  if (!det.hasLint) {
    out.push({
      severity: "medium",
      area: "lint",
      message: "No linter config detected.",
      fix: "Add eslint/biome/ruff config.",
    });
  }
  if (!det.hasCI.provider) {
    out.push({
      severity: "high",
      area: "ci",
      message: "No CI provider configuration detected.",
      fix: "Add a CI workflow that runs lint/test/build.",
    });
  }
  if (!det.hasCodeowners) {
    out.push({
      severity: "medium",
      area: "ownership",
      message: "No CODEOWNERS file.",
      fix: "Add .github/CODEOWNERS.",
    });
  }
  if (!det.hasPRTemplate) {
    out.push({
      severity: "low",
      area: "ownership",
      message: "No PR template.",
      fix: "Add .github/PULL_REQUEST_TEMPLATE.md (AHC checklist).",
    });
  }
  if (!det.hasSecretsScan) {
    out.push({
      severity: "medium",
      area: "secrets",
      message: "No secrets-scan configuration detected.",
      fix: "Add gitleaks/trufflehog config + pre-commit hook.",
    });
  }
  if (!det.hasReadme) {
    out.push({
      severity: "low",
      area: "docs",
      message: "No README.md.",
      fix: "Generate a README.md from agent-memory.",
    });
  }
  if (!det.hasLicense) {
    out.push({
      severity: "medium",
      area: "license",
      message: "No LICENSE file.",
      fix: "Pick a license; add LICENSE at repo root.",
    });
  }
  return out;
};

export const captureSnapshot = (root: string, det: DetectionReport): string => {
  const dir = path.join(
    root,
    "docs",
    "agent-memory",
    "09-audits",
    new Date().toISOString().slice(0, 10),
  );
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "detection.json");
  fs.writeFileSync(out, JSON.stringify(det, null, 2) + "\n", "utf8");
  return out;
};

export const writeFindings = (
  root: string,
  findings: AuditFinding[],
): string => {
  const dir = path.join(
    root,
    "docs",
    "agent-memory",
    "09-audits",
    new Date().toISOString().slice(0, 10),
  );
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "findings.md");
  const lines: string[] = [
    "# Brownfield audit findings",
    "",
    `Generated at ${new Date().toISOString()}`,
    "",
    "| Severity | Area | Finding | Suggested fix |",
    "|----------|------|---------|----------------|",
  ];
  for (const f of findings) {
    lines.push(`| ${f.severity} | ${f.area} | ${f.message} | ${f.fix ?? ""} |`);
  }
  if (findings.length === 0) lines.push("| - | - | No findings | - |");
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  return out;
};

export const writeAdoptionReport = (
  root: string,
  det: DetectionReport,
  findings: AuditFinding[],
  applied: SafeFixResult[] = [],
): string => {
  const dir = path.join(
    root,
    "docs",
    "agent-memory",
    "09-audits",
    new Date().toISOString().slice(0, 10),
  );
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "adoption-report.md");
  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});
  const lines: string[] = [
    "# Adoption report",
    "",
    `Generated at ${new Date().toISOString()}`,
    "",
    "## Detection summary",
    "",
    "```json",
    JSON.stringify(det, null, 2),
    "```",
    "",
    "## Findings totals",
    "",
    `- critical: ${counts.critical ?? 0}`,
    `- high:     ${counts.high ?? 0}`,
    `- medium:   ${counts.medium ?? 0}`,
    `- low:      ${counts.low ?? 0}`,
    "",
  ];
  if (applied.length > 0) {
    lines.push("## Safe-fix actions", "");
    lines.push("| Status | Fix | File |", "|--------|-----|------|");
    for (const a of applied) {
      lines.push(`| ${a.status} | ${a.id} | ${a.file ?? ""} |`);
    }
    lines.push("");
  }
  lines.push(
    "## Next actions",
    "",
    "1. Triage findings.md and create requirements (R-XXXX) for each `high`/`critical`.",
    "2. Run `ai-sdlc validate` and `npm run check` to baseline AHC compliance.",
    "3. Add quality gates referenced in docs/agent-memory/07-quality-gates.md.",
    "",
  );
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  return out;
};

export interface SafeFixResult {
  id: string;
  status: "written" | "skipped-exists" | "skipped-not-applicable";
  file?: string;
}

/**
 * Idempotent safe fixes — only create files that do not already exist; never
 * modify or delete existing user files. Returns one result per attempted fix.
 */
export const applySafeFixes = (
  root: string,
  det: DetectionReport,
): SafeFixResult[] => {
  const out: SafeFixResult[] = [];
  const writeIfMissing = (id: string, rel: string, content: string) => {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) {
      out.push({ id, status: "skipped-exists", file: rel });
      return;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
    out.push({ id, status: "written", file: rel });
  };

  if (!det.hasCodeowners) {
    writeIfMissing(
      "codeowners",
      ".github/CODEOWNERS",
      "# Default ownership — adjust as the repo grows.\n*  @OWNER_PLACEHOLDER\n",
    );
  } else {
    out.push({ id: "codeowners", status: "skipped-exists" });
  }

  if (!det.hasPRTemplate) {
    writeIfMissing(
      "pr-template",
      ".github/PULL_REQUEST_TEMPLATE.md",
      [
        "## Summary",
        "",
        "## Linked requirement(s)",
        "- R-XXXX",
        "",
        "## AHC compliance checklist",
        "- [ ] Pillar 1 — Evidence",
        "- [ ] Pillar 2 — Schema-locked",
        "- [ ] Pillar 3 — Tool-only facts",
        "- [ ] Pillar 4 — Test-as-truth",
        "- [ ] Pillar 5 — Verifier",
        "",
        "## Quality gates",
        "- [ ] Lint / type / tests pass",
        "- [ ] Security scans clean",
        "",
      ].join("\n"),
    );
  } else {
    out.push({ id: "pr-template", status: "skipped-exists" });
  }

  if (!det.hasSecretsScan) {
    writeIfMissing(
      "gitleaks",
      ".gitleaks.toml",
      `title = "default"\n[allowlist]\npaths = ['''node_modules''', '''dist''']\n`,
    );
  } else {
    out.push({ id: "gitleaks", status: "skipped-exists" });
  }

  if (!det.hasReadme) {
    writeIfMissing(
      "readme",
      "README.md",
      `# ${path.basename(root)}\n\nGenerated by \`ai-sdlc adopt --deep\`. Replace with project description.\n`,
    );
  } else {
    out.push({ id: "readme", status: "skipped-exists" });
  }

  if (!det.hasChangelog) {
    writeIfMissing(
      "changelog",
      "CHANGELOG.md",
      `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n## [Unreleased]\n`,
    );
  } else {
    out.push({ id: "changelog", status: "skipped-exists" });
  }

  // .editorconfig is universally safe.
  writeIfMissing(
    "editorconfig",
    ".editorconfig",
    "root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\ninsert_final_newline = true\nindent_style = space\nindent_size = 2\ntrim_trailing_whitespace = true\n",
  );

  return out;
};
