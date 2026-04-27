import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runWizard } from "../src/engine/wizard.js";
import { scaffoldProject } from "../src/engine/scaffold-engine.js";

describe("scaffold smoke", () => {
  it("scaffolds a generic project end-to-end (non-interactive)", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-test-"));
    const projectName = "smoke-app";
    const targetDir = path.join(tmp, projectName);

    const answers = await runWizard({
      cwd: tmp,
      yes: true,
      preset: {
        projectName,
        projectKind: "library",
        stackId: "generic",
        teamMode: "solo",
        vendors: ["copilot"],
        compliance: ["none"],
        targetDir,
        initGit: false,
        installDeps: false,
        addCi: false,
        addMcpServer: false,
        license: "MIT",
        bulkRequirements: { source: "none" },
      },
    });

    const result = await scaffoldProject(answers);
    expect(result.written.length).toBeGreaterThan(0);
    // Framework artifact landed
    expect(
      fs.existsSync(
        path.join(
          targetDir,
          "docs/agent-memory/00-anti-hallucination-charter.md",
        ),
      ),
    ).toBe(true);
    // Vendor render landed
    expect(
      fs.existsSync(path.join(targetDir, ".github/copilot-instructions.md")),
    ).toBe(true);
    // Stack template landed
    expect(fs.existsSync(path.join(targetDir, "README.md"))).toBe(true);
    // ai-sdlc.config.json written
    expect(fs.existsSync(path.join(targetDir, "ai-sdlc.config.json"))).toBe(
      true,
    );
  }, 30_000);

  it("emits opencode vendor surface when selected", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-oc-"));
    const targetDir = path.join(tmp, "oc-app");
    const answers = await runWizard({
      cwd: tmp,
      yes: true,
      preset: {
        projectName: "oc-app",
        projectKind: "library",
        stackId: "generic",
        teamMode: "solo",
        vendors: ["opencode"],
        compliance: ["none"],
        targetDir,
        initGit: false,
        installDeps: false,
        addCi: false,
        addMcpServer: false,
        license: "MIT",
        bulkRequirements: { source: "none" },
      },
    });
    await scaffoldProject(answers);
    expect(fs.existsSync(path.join(targetDir, "opencode.json"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".opencode", "agent"))).toBe(
      true,
    );
    const ocCfg = JSON.parse(
      fs.readFileSync(path.join(targetDir, "opencode.json"), "utf8"),
    );
    expect(ocCfg.instructions).toContain("AGENTS.md");
  }, 30_000);

  it("emits restored framework overlays (KI-0002 closure)", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-overlays-"));
    const targetDir = path.join(tmp, "overlays-app");
    const answers = await runWizard({
      cwd: tmp,
      yes: true,
      preset: {
        projectName: "overlays-app",
        projectKind: "library",
        stackId: "generic",
        teamMode: "solo",
        vendors: ["copilot"],
        compliance: ["none"],
        targetDir,
        initGit: false,
        installDeps: false,
        addCi: false,
        addMcpServer: false,
        license: "MIT",
        bulkRequirements: { source: "none" },
        capabilities: ["all"],
      },
    });
    await scaffoldProject(answers);
    const must = [
      ".github/workflows/release.yml",
      ".github/workflows/sbom.yml",
      ".github/workflows/msrd.yml",
      ".github/workflows/agent-memory-release-notes.yml",
      "scripts/ai-evals.mjs",
      "docs/agent-memory/15-ai-evals/README.md",
      "docs/agent-memory/15-ai-evals/policy.md",
      "docs/agent-memory/15-ai-evals/cases/EV-0001.case.yaml",
      "docs/agent-memory/16-observability/README.md",
      "docs/agent-memory/16-observability/slo.md",
      "docs/agent-memory/16-observability/runbooks/error-budget-burn.md",
      "docs/agent-memory/17-release/release-management.md",
      "docs/agent-memory/17-release/supply-chain.md",
      "docs/agent-memory/17-release/licenses.allowlist.yml",
      "docs/agent-memory/14-threat-models/web.md",
      "docs/agent-memory/14-threat-models/ai.md",
      "docs/agent-memory/dashboard.html",
    ];
    for (const rel of must) {
      expect(
        fs.existsSync(path.join(targetDir, rel)),
        `missing overlay: ${rel}`,
      ).toBe(true);
    }
  }, 30_000);

  it("ships full SDLC agents + prompts for Copilot", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-agents-"));
    const targetDir = path.join(tmp, "agents-app");
    const answers = await runWizard({
      cwd: tmp,
      yes: true,
      preset: {
        projectName: "agents-app",
        projectKind: "library",
        stackId: "generic",
        teamMode: "solo",
        vendors: ["copilot"],
        compliance: ["none"],
        targetDir,
        initGit: false,
        installDeps: false,
        addCi: false,
        addMcpServer: false,
        license: "MIT",
        bulkRequirements: { source: "none" },
        capabilities: ["all"],
      },
    });
    await scaffoldProject(answers);

    // All 10 SDLC agents must be present (synced from .github/agents/).
    const expectedAgents = [
      "init",
      "plan",
      "process",
      "execution",
      "evaluation",
      "finalization",
      "orchestrator",
      "architect",
      "audit-meta",
      "verify",
    ];
    for (const id of expectedAgents) {
      const p = path.join(targetDir, ".github/agents", `${id}.agent.md`);
      expect(fs.existsSync(p), `missing agent: ${id}`).toBe(true);
      const body = fs.readFileSync(p, "utf8");
      expect(body.length, `agent ${id} too short`).toBeGreaterThan(200);
      expect(body.startsWith("---"), `agent ${id} missing frontmatter`).toBe(
        true,
      );
    }

    // All 8 SDLC prompts must be present.
    const expectedPrompts = [
      "new-requirement",
      "run-pipeline",
      "audit-undocumented",
      "risk-forecast",
      "system-progress-report",
      "tech-debt-quantify",
      "self-healing-repo",
      "transform-repo-structure",
    ];
    for (const id of expectedPrompts) {
      const p = path.join(targetDir, ".github/prompts", `${id}.prompt.md`);
      expect(fs.existsSync(p), `missing prompt: ${id}`).toBe(true);
    }

    // The real workspace copilot-instructions.md (not the renderer stub)
    // must be shipped — detect by checking for AGENTS.md reference.
    const ci = fs.readFileSync(
      path.join(targetDir, ".github/copilot-instructions.md"),
      "utf8",
    );
    expect(ci).toContain("AGENTS.md");

    // 25 capability agents + prompts must ship (Phase C).
    const expectedCapabilities = [
      "audit",
      "doctor",
      "repair",
      "validate",
      "status",
      "dashboard",
      "graph",
      "report",
      "context-pack",
      "verify-pack",
      "attest-pack",
      "provenance-verify",
      "sbom-check",
      "sbom-diff",
      "threat-coverage",
      "dora-export",
      "release-notes",
      "changelog",
      "msrd",
      "ki",
      "ingest",
      "promote",
      "archive",
      "adopt",
      "autopilot",
    ];
    for (const id of expectedCapabilities) {
      expect(
        fs.existsSync(path.join(targetDir, ".github/agents", `${id}.agent.md`)),
        `missing capability agent: ${id}`,
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(targetDir, ".github/prompts", `${id}.prompt.md`),
        ),
        `missing capability prompt: ${id}`,
      ).toBe(true);
    }

    // Phase D: scoped instructions ship under .github/instructions/.
    const expectedScoped = [
      "requirements",
      "plans",
      "execution",
      "evaluation",
      "decisions",
      "index-json",
      "cli-ai-sdlc",
      "tests",
    ];
    for (const id of expectedScoped) {
      const p = path.join(
        targetDir,
        ".github/instructions",
        `${id}.instructions.md`,
      );
      expect(fs.existsSync(p), `missing scoped instructions: ${id}`).toBe(true);
      const body = fs.readFileSync(p, "utf8");
      expect(body, `${id} missing applyTo`).toMatch(/applyTo:/);
    }
  }, 30_000);
});

import { cmdInit } from "../src/commands/init.js";
import { cmdCreate } from "../src/commands/create.js";

describe("duplication guard", () => {
  it("init refuses when framework already present in cwd", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-dup-init-"));
    fs.mkdirSync(path.join(tmp, "docs/agent-memory"), { recursive: true });
    await expect(cmdInit({ cwd: tmp })).rejects.toThrow(
      /already present in this directory/i,
    );
  });

  it("init refuses when an ancestor has the framework", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-dup-anc-"));
    fs.mkdirSync(path.join(tmp, "docs/agent-memory"), { recursive: true });
    const child = path.join(tmp, "child");
    fs.mkdirSync(child, { recursive: true });
    await expect(cmdInit({ cwd: child })).rejects.toThrow(
      /ancestor directory.*ai-sdlc framework/i,
    );
  });

  it("create refuses when target ancestor already has the framework", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-dup-create-"));
    fs.mkdirSync(path.join(tmp, "docs/agent-memory"), { recursive: true });
    await expect(
      cmdCreate({
        cwd: tmp,
        yes: true,
        preset: {
          projectName: "child-app",
          projectKind: "library",
          stackId: "generic",
          teamMode: "solo",
          vendors: ["copilot"],
          compliance: ["none"],
          targetDir: path.join(tmp, "child-app"),
          initGit: false,
          installDeps: false,
          addCi: false,
          addMcpServer: false,
          license: "MIT",
          bulkRequirements: { source: "none" },
        },
      }),
    ).rejects.toThrow(/ancestor directory.*ai-sdlc framework/i);
  }, 30_000);
});

import { cmdAdd } from "../src/commands/add.js";

describe("capability categories", () => {
  const baseAnswers = (
    targetDir: string,
    capabilities: string[],
  ): Parameters<typeof runWizard>[0]["preset"] => ({
    projectName: "cap-app",
    projectKind: "library",
    stackId: "generic",
    teamMode: "solo",
    vendors: ["copilot"],
    compliance: ["none"],
    targetDir,
    initGit: false,
    installDeps: false,
    addCi: false,
    addMcpServer: false,
    license: "MIT",
    bulkRequirements: { source: "none" },
    capabilities,
  });

  it("default (diagnostics) ships only diagnostics capability files", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-caps-min-"));
    const targetDir = path.join(tmp, "min-app");
    const answers = await runWizard({
      cwd: tmp,
      yes: true,
      preset: baseAnswers(targetDir, ["diagnostics"]),
    });
    await scaffoldProject(answers);

    // Diagnostics caps present.
    for (const id of ["audit", "doctor", "repair", "validate", "status"]) {
      expect(
        fs.existsSync(path.join(targetDir, ".github/agents", `${id}.agent.md`)),
        `expected ${id} present`,
      ).toBe(true);
    }
    // Capabilities from other categories MUST be pruned.
    for (const id of [
      "sbom-check",
      "release-notes",
      "context-pack",
      "graph",
      "ki",
      "adopt",
    ]) {
      expect(
        fs.existsSync(path.join(targetDir, ".github/agents", `${id}.agent.md`)),
        `expected ${id} pruned`,
      ).toBe(false);
      expect(
        fs.existsSync(
          path.join(targetDir, ".github/prompts", `${id}.prompt.md`),
        ),
      ).toBe(false);
    }
    // SDLC core agents must always remain.
    for (const id of ["init", "plan", "process", "execution", "evaluation"]) {
      expect(
        fs.existsSync(path.join(targetDir, ".github/agents", `${id}.agent.md`)),
      ).toBe(true);
    }
    // Workflows: sbom.yml/release.yml pruned, agent-memory-guard.yml kept.
    expect(
      fs.existsSync(path.join(targetDir, ".github/workflows/sbom.yml")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(targetDir, ".github/workflows/release.yml")),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(targetDir, ".github/workflows/agent-memory-guard.yml"),
      ),
    ).toBe(true);
  }, 30_000);

  it("`ai-sdlc add security` adds only security capabilities", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-add-"));
    const targetDir = path.join(tmp, "add-app");
    const answers = await runWizard({
      cwd: tmp,
      yes: true,
      preset: baseAnswers(targetDir, ["diagnostics"]),
    });
    await scaffoldProject(answers);
    // Pre-condition: sbom-check absent.
    expect(
      fs.existsSync(path.join(targetDir, ".github/agents/sbom-check.agent.md")),
    ).toBe(false);

    await cmdAdd({ cwd: targetDir, selectors: ["security"] });

    for (const id of ["sbom-check", "sbom-diff", "threat-coverage"]) {
      expect(
        fs.existsSync(path.join(targetDir, ".github/agents", `${id}.agent.md`)),
        `expected ${id} added`,
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(targetDir, ".github/prompts", `${id}.prompt.md`),
        ),
      ).toBe(true);
    }
    // Untouched: a release capability must still be absent.
    expect(
      fs.existsSync(
        path.join(targetDir, ".github/agents/release-notes.agent.md"),
      ),
    ).toBe(false);
  }, 30_000);

  it("`ai-sdlc add` refuses outside a framework root", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-add-bare-"));
    await expect(cmdAdd({ cwd: tmp, selectors: ["security"] })).rejects.toThrow(
      /No ai-sdlc framework found/i,
    );
  });
});

import { cmdBrainstorm } from "../src/commands/brainstorm.js";

describe("brainstorm guard", () => {
  it("refuses inside an existing framework root", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-brain-dup-"));
    fs.mkdirSync(path.join(tmp, "docs/agent-memory"), { recursive: true });
    await expect(cmdBrainstorm({ cwd: tmp })).rejects.toThrow(
      /already present/i,
    );
  });

  it("refuses inside an ancestor framework", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-sdlc-brain-anc-"));
    fs.mkdirSync(path.join(tmp, "docs/agent-memory"), { recursive: true });
    const child = path.join(tmp, "child");
    fs.mkdirSync(child, { recursive: true });
    await expect(cmdBrainstorm({ cwd: child })).rejects.toThrow(
      /ancestor.*ai-sdlc framework/i,
    );
  });
});
