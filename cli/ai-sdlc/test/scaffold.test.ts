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
});
