import * as p from "@clack/prompts";
import path from "node:path";
import fs from "node:fs";
import {
  PROJECT_KINDS,
  VENDORS,
  COMPLIANCE,
  TEAM_MODES,
  ARCHITECTURES,
  DATA_CLASS,
  CI_PROVIDERS,
  type WizardAnswers,
  type ProjectKind,
  type Vendor,
  type Compliance,
  type TeamMode,
  type Architecture,
  type DataClass,
  type CiProvider,
} from "../types.js";
import { STACKS, recommendedStackFor, stacksFor } from "./registry.js";
import { CAPABILITY_CATEGORIES, DEFAULT_CATEGORIES } from "./capabilities.js";

/**
 * 13-step interactive wizard. Each prompt has a documented best-practice
 * default per the Anti-Hallucination Charter §4. The user's answer is
 * recorded with `evidence.kind=human` in ai-sdlc.config.json.
 */

export interface WizardOptions {
  cwd: string;
  preset?: Partial<WizardAnswers>;
  yes?: boolean;
}

const cancel = (): never => {
  p.cancel("Aborted.");
  process.exit(130);
};

const must = <T>(v: T | symbol): T => {
  if (p.isCancel(v)) cancel();
  return v as T;
};

export const runWizard = async (
  opts: WizardOptions,
): Promise<WizardAnswers> => {
  const preset = opts.preset ?? {};
  const yes = opts.yes ?? false;

  if (!yes) p.intro("ai-sdlc · interactive wizard");

  const answers: WizardAnswers = {
    projectName: preset.projectName ?? "",
    projectKind: preset.projectKind ?? "backend",
    stackId: preset.stackId ?? "node-fastify-ts",
    architecture: preset.architecture ?? "modular-monolith",
    teamMode: preset.teamMode ?? "solo",
    vendors: preset.vendors ?? ["copilot"],
    compliance: preset.compliance ?? ["none"],
    qualityGates: preset.qualityGates ?? [],
    dataClass: preset.dataClass ?? "internal",
    ciProvider: preset.ciProvider ?? "github-actions",
    bulkRequirements:
      preset.bulkRequirements ??
      ({ source: "none" } as WizardAnswers["bulkRequirements"]),
    targetDir: preset.targetDir ?? opts.cwd,
    initGit: preset.initGit ?? true,
    installDeps: preset.installDeps ?? false,
    addCi: preset.addCi ?? true,
    addMcpServer: preset.addMcpServer ?? false,
    license: preset.license ?? "MIT",
    ...(preset.brief ? { brief: preset.brief } : {}),
    capabilities: preset.capabilities ?? [...DEFAULT_CATEGORIES],
  };

  if (!answers.projectName && !yes) {
    answers.projectName = must(
      await p.text({
        message: "Project name?",
        placeholder: "my-project",
        validate: (x) =>
          !x
            ? "Required"
            : /^[a-z0-9._-]+$/i.test(x)
              ? undefined
              : "letters/digits/._- only",
      }),
    );
  }
  if (!answers.projectName && yes) answers.projectName = "my-project";

  if (!preset.targetDir && !yes) {
    const v = must(
      await p.text({
        message: "Target directory?",
        placeholder: `./${answers.projectName}`,
        initialValue: `./${answers.projectName}`,
      }),
    );
    answers.targetDir = path.resolve(opts.cwd, v);
  } else if (!preset.targetDir) {
    answers.targetDir = path.resolve(opts.cwd, answers.projectName);
  }

  if (!preset.projectKind && !yes) {
    const v = must(
      await p.select({
        message: "Project kind?",
        options: PROJECT_KINDS.map((k) => ({
          value: k,
          label: k,
          hint: kindHint(k),
        })),
        initialValue: "backend",
      }),
    );
    answers.projectKind = v as ProjectKind;
  }

  if (!preset.stackId) {
    const choices = stacksFor(answers.projectKind);
    if (choices.length === 0) {
      answers.stackId = "generic";
    } else if (yes || choices.length === 1) {
      answers.stackId = recommendedStackFor(answers.projectKind).id;
    } else {
      const v = must(
        await p.select({
          message: "Stack?",
          options: choices.map((s) => ({
            value: s.id,
            label: s.label,
            hint: s.description,
          })),
          initialValue: choices[0]!.id,
        }),
      );
      answers.stackId = v as string;
    }
  }

  if (!preset.teamMode && !yes) {
    const v = must(
      await p.select({
        message: "Team mode?",
        options: TEAM_MODES.map((m) => ({
          value: m,
          label: m,
          hint:
            m === "team"
              ? "ownership/locking, CODEOWNERS, claim/release"
              : "single-developer flow, no locking",
        })),
        initialValue: "solo",
      }),
    );
    answers.teamMode = v as TeamMode;
  }

  if (!preset.vendors && !yes) {
    const v = must(
      await p.multiselect({
        message: "Which AI coding assistants will you use?",
        options: VENDORS.map((vd) => ({ value: vd, label: vd })),
        initialValues: ["copilot"],
        required: true,
      }),
    );
    answers.vendors = v as Vendor[];
  }

  if (!preset.compliance && !yes) {
    const v = must(
      await p.multiselect({
        message: "Compliance frameworks (choose 'none' if not regulated)?",
        options: COMPLIANCE.map((c) => ({ value: c, label: c })),
        initialValues: ["none"],
        required: true,
      }),
    );
    answers.compliance = v as Compliance[];
  }

  if (answers.qualityGates.length === 0) {
    answers.qualityGates = STACKS.find((s) => s.id === answers.stackId)
      ?.recommendedGates ?? ["lint", "test:unit"];
  }

  if (!preset.bulkRequirements && !yes) {
    type BulkSrc = "none" | "csv" | "jira" | "github";
    const src = must(
      await p.select({
        message: "Import existing requirements from where?",
        options: [
          { value: "none" as BulkSrc, label: "none — start clean" },
          { value: "csv" as BulkSrc, label: "CSV file" },
          { value: "jira" as BulkSrc, label: "Jira (later)" },
          { value: "github" as BulkSrc, label: "GitHub Issues (later)" },
        ],
        initialValue: "none" as BulkSrc,
      }),
    ) as BulkSrc;
    answers.bulkRequirements = { source: src };
    if (src === "csv") {
      const ref = must(
        await p.text({
          message: "Path to CSV?",
          placeholder: "./requirements.csv",
        }),
      );
      answers.bulkRequirements.ref = ref;
    }
  }

  if (preset.initGit === undefined && !yes) {
    answers.initGit = must(
      await p.confirm({
        message: "Initialize git repository?",
        initialValue: true,
      }),
    );
  }
  if (preset.installDeps === undefined && !yes) {
    answers.installDeps = must(
      await p.confirm({
        message: "Install dependencies after scaffolding?",
        initialValue: false,
      }),
    );
  }
  if (preset.addCi === undefined && !yes) {
    answers.addCi = must(
      await p.confirm({
        message: "Add CI workflow (GitHub Actions)?",
        initialValue: true,
      }),
    );
  }
  if (preset.addMcpServer === undefined && !yes) {
    answers.addMcpServer = must(
      await p.confirm({
        message: "Bundle a stdio MCP server stub for AI assistants?",
        initialValue: false,
      }),
    );
  }

  if (!preset.license && !yes) {
    const v = must(
      await p.select({
        message: "License?",
        options: [
          { value: "MIT", label: "MIT" },
          { value: "Apache-2.0", label: "Apache-2.0" },
          { value: "GPL-3.0", label: "GPL-3.0" },
          { value: "BSL-1.1", label: "BSL-1.1" },
          { value: "proprietary", label: "proprietary (no license file)" },
        ],
        initialValue: "MIT",
      }),
    );
    answers.license = v as WizardAnswers["license"];
  }

  if (!preset.architecture && !yes) {
    const v = must(
      await p.select({
        message: "Architecture pattern?",
        options: ARCHITECTURES.map((a) => ({ value: a, label: a })),
        initialValue: recommendArchitecture(
          answers.projectKind,
          answers.teamMode,
        ),
      }),
    );
    answers.architecture = v as Architecture;
  } else if (!preset.architecture) {
    answers.architecture = recommendArchitecture(
      answers.projectKind,
      answers.teamMode,
    );
  }

  if (!preset.dataClass && !yes) {
    const v = must(
      await p.select({
        message: "Data classification?",
        options: DATA_CLASS.map((d) => ({ value: d, label: d })),
        initialValue: "internal",
      }),
    );
    answers.dataClass = v as DataClass;
  }

  if (!preset.ciProvider && !yes) {
    const v = must(
      await p.select({
        message: "CI provider?",
        options: CI_PROVIDERS.map((c) => ({ value: c, label: c })),
        initialValue: "github-actions",
      }),
    );
    answers.ciProvider = v as CiProvider;
  }

  // Capability categories — opt-in groups of agents/prompts/workflows
  // beyond the SDLC core. Default = ["diagnostics"]. The user can add
  // more later with `ai-sdlc add <category|id>`.
  if (!preset.capabilities && !yes) {
    const v = must(
      await p.multiselect({
        message:
          "Capability categories (in addition to the SDLC core)? Space to toggle, Enter to confirm.",
        options: CAPABILITY_CATEGORIES.map((c) => ({
          value: c.id,
          label: c.label,
          hint: c.description,
        })),
        initialValues: [...DEFAULT_CATEGORIES],
        required: false,
      }),
    );
    answers.capabilities = (v as string[]) ?? [];
  } else if (!preset.capabilities) {
    answers.capabilities = [...DEFAULT_CATEGORIES];
  }

  if (!yes) p.outro(`Scaffolding ${answers.projectName} (${answers.stackId})…`);
  return answers;
};

const recommendArchitecture = (
  kind: ProjectKind,
  team: TeamMode,
): Architecture => {
  if (kind === "ai") return "agent-based";
  if (kind === "infra") return "serverless";
  if (kind === "data") return "event-driven";
  if (kind === "monorepo") return "modular-monolith";
  if (team === "team" && (kind === "backend" || kind === "fullstack"))
    return "hexagonal";
  return "modular-monolith";
};

const kindHint = (k: ProjectKind): string => {
  switch (k) {
    case "backend":
      return "HTTP/RPC server";
    case "frontend":
      return "browser UI";
    case "fullstack":
      return "frontend + backend together";
    case "mobile":
      return "iOS/Android";
    case "desktop":
      return "Windows/macOS/Linux GUI";
    case "cli":
      return "command-line tool";
    case "library":
      return "reusable package/SDK";
    case "monorepo":
      return "many packages in one repo";
    case "ai":
      return "agent / model app";
    case "data":
      return "ETL / pipelines / analytics";
    case "automation":
      return "scripts / RPA / scheduled jobs";
    case "infra":
      return "Terraform / Pulumi / k8s";
    case "docs":
      return "documentation site only";
    default:
      return "";
  }
};

export const ensureExists = (dir: string) =>
  fs.mkdirSync(dir, { recursive: true });
