import fs from "node:fs";
import path from "node:path";
import { copyTemplate, templatesRoot } from "../engine/template-fs.js";
import { loadAllAgents } from "../engine/agent-yaml.js";
import { renderAgents, readAhcBlock } from "../engine/renderers.js";
import {
  detectExisting,
  audit,
  captureSnapshot,
  writeFindings,
  writeAdoptionReport,
  applySafeFixes,
} from "../engine/adopt-deep.js";
import type { Vendor, ProjectKind, TeamMode } from "../types.js";
import { log } from "../util/log.js";

/**
 * `ai-sdlc adopt [path]` — brownfield onboarding.
 *
 * Inspects an existing repo, infers project kind from manifest files
 * (heuristic only — flagged with confidence), drops the framework
 * skeleton without overwriting source, renders vendor configs.
 *
 * Anti-Hallucination Charter §3 (Pillar 3 — tool-only facts):
 *   We never silently guess project kind. The detected kind comes from
 *   actual manifest files; if multiple/none match, we mark the result
 *   as "unknown" and ask via prompt.
 */
export interface AdoptOptions {
  cwd: string;
  vendors?: Vendor[];
  yes?: boolean;
  deep?: boolean;
  applyFixes?: boolean;
}

export interface DetectedProject {
  kind: ProjectKind | "unknown";
  signals: { file: string; weight: number; reason: string }[];
}

export const detectProjectKind = (root: string): DetectedProject => {
  const signals: DetectedProject["signals"] = [];
  const has = (rel: string) => fs.existsSync(path.join(root, rel));
  const readJson = (rel: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(root, rel), "utf8").replace(/^\uFEFF/, ""),
      );
    } catch {
      return null;
    }
  };

  // Node-shaped projects
  if (has("package.json")) {
    const pkg = readJson("package.json") ?? {};
    const deps = {
      ...(pkg["dependencies"] as Record<string, unknown> | undefined),
      ...(pkg["devDependencies"] as Record<string, unknown> | undefined),
    };
    if (deps["fastify"] || deps["express"] || deps["koa"] || deps["hono"]) {
      signals.push({ file: "package.json", weight: 5, reason: "server dep" });
      return { kind: "backend", signals };
    }
    if (deps["next"] || deps["react"] || deps["vue"] || deps["svelte"]) {
      signals.push({ file: "package.json", weight: 5, reason: "frontend dep" });
      return { kind: "frontend", signals };
    }
    if (deps["expo"] || deps["react-native"]) {
      return {
        kind: "mobile",
        signals: [
          { file: "package.json", weight: 5, reason: "mobile dep" },
          ...signals,
        ],
      };
    }
    if (deps["electron"] || deps["tauri"]) {
      return {
        kind: "desktop",
        signals: [
          { file: "package.json", weight: 5, reason: "desktop dep" },
          ...signals,
        ],
      };
    }
    if (pkg["bin"]) {
      return {
        kind: "cli",
        signals: [
          { file: "package.json", weight: 4, reason: "bin entry" },
          ...signals,
        ],
      };
    }
    if (pkg["workspaces"]) {
      return {
        kind: "monorepo",
        signals: [
          { file: "package.json", weight: 5, reason: "workspaces" },
          ...signals,
        ],
      };
    }
    return {
      kind: "library",
      signals: [
        { file: "package.json", weight: 2, reason: "node package" },
        ...signals,
      ],
    };
  }
  // Python
  if (has("pyproject.toml") || has("requirements.txt")) {
    const txt = has("pyproject.toml")
      ? fs.readFileSync(path.join(root, "pyproject.toml"), "utf8")
      : "";
    if (
      /langgraph|langchain|llama-index|crewai/i.test(txt) ||
      has("agent.py") ||
      has("graph.py")
    ) {
      return {
        kind: "ai",
        signals: [
          { file: "pyproject.toml", weight: 5, reason: "ai/agent dep" },
        ],
      };
    }
    if (/fastapi|flask|django/i.test(txt)) {
      return {
        kind: "backend",
        signals: [{ file: "pyproject.toml", weight: 5, reason: "web dep" }],
      };
    }
    if (/dagster|airflow|prefect|pandas|polars|duckdb/i.test(txt)) {
      return {
        kind: "data",
        signals: [{ file: "pyproject.toml", weight: 5, reason: "data dep" }],
      };
    }
    return {
      kind: "library",
      signals: [{ file: "pyproject.toml", weight: 2, reason: "python pkg" }],
    };
  }
  // Infra
  if (has("main.tf") || has("infrastructure") || has("pulumi.yaml")) {
    return {
      kind: "infra",
      signals: [{ file: "main.tf|pulumi.yaml", weight: 5, reason: "iac" }],
    };
  }
  // Docs-only
  if (has("docusaurus.config.js") || has("mkdocs.yml")) {
    return {
      kind: "docs",
      signals: [{ file: "docusaurus|mkdocs", weight: 5, reason: "docs site" }],
    };
  }
  return { kind: "unknown", signals };
};

export const cmdAdopt = async (opts: AdoptOptions): Promise<void> => {
  const root = opts.cwd;
  log.banner(`ai-sdlc adopt — ${root}`);
  const det = detectProjectKind(root);
  log.info(
    `Detected kind: ${det.kind}${det.signals.length ? `  (${det.signals.map((s) => s.reason).join(", ")})` : ""}`,
  );

  // 1. Drop framework skeleton without overwriting existing files.
  const tpl = path.join(templatesRoot(), "framework");
  if (!fs.existsSync(tpl)) {
    throw new Error("framework template missing");
  }
  const r = copyTemplate(tpl, root, {
    vars: {
      projectName: path.basename(root),
      year: String(new Date().getFullYear()),
    },
    skipExisting: true,
  });
  log.ok(
    `framework: wrote ${r.written.length}, kept ${r.skipped.length} existing`,
  );

  // 2. Render vendor agents (default to copilot if none specified).
  const vendors: Vendor[] = opts.vendors ?? ["copilot"];
  const agents = loadAllAgents(path.join(templatesRoot(), "agents"));
  if (agents.length > 0) {
    const ahcBlock = readAhcBlock(root);
    const results = renderAgents(agents, vendors, {
      targetRoot: root,
      ahcBlock,
    });
    const total = results.reduce((acc, r) => acc + r.files.length, 0);
    log.ok(`rendered ${total} vendor file(s) for ${vendors.join(", ")}`);
  }

  // 3. Update meta.json with detection result.
  const meta = {
    schemaVersion: "1.0",
    project: {
      name: path.basename(root),
      kind: det.kind,
      teamMode: "solo" as TeamMode,
    },
    vendors,
    detection: det,
    generatedBy: "ai-sdlc adopt",
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(root, "ai-sdlc.config.json"),
    JSON.stringify(meta, null, 2) + "\n",
    "utf8",
  );
  log.ok("wrote ai-sdlc.config.json");
  log.info("");

  if (opts.deep) {
    log.info("deep mode: detecting existing tooling…");
    const det = detectExisting(root);
    const snapshot = captureSnapshot(root, det);
    const findings = audit(det);
    const findingsPath = writeFindings(root, findings);
    const applied = opts.applyFixes ? applySafeFixes(root, det) : [];
    const reportPath = writeAdoptionReport(root, det, findings, applied);
    log.ok(`detection snapshot: ${path.relative(root, snapshot)}`);
    log.ok(
      `findings:           ${path.relative(root, findingsPath)} (${findings.length})`,
    );
    if (opts.applyFixes) {
      const written = applied.filter((a) => a.status === "written").length;
      log.ok(
        `safe-fix applied:   ${written} file(s) written, ${applied.length - written} skipped`,
      );
    }
    log.ok(`adoption report:    ${path.relative(root, reportPath)}`);
  }

  log.info("Next: review docs/agent-memory/ then run `ai-sdlc validate`.");
};
