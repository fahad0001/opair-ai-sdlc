/**
 * Closed-set domain types used across the CLI.
 * These mirror the JSON-Schema enums under docs/agent-memory/*.schema.json.
 * Widening any of them requires an ADR (per the Anti-Hallucination Charter).
 */

export const PROJECT_KINDS = [
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "desktop",
  "cli",
  "library",
  "monorepo",
  "ai",
  "data",
  "automation",
  "infra",
  "docs",
] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const VENDORS = [
  "copilot",
  "claude-code",
  "cursor",
  "aider",
  "continue",
  "opencode",
  "generic-mcp",
] as const;
export type Vendor = (typeof VENDORS)[number];

export const COMPLIANCE = [
  "none",
  "soc2",
  "iso27001",
  "hipaa",
  "pci-dss",
  "gdpr",
  "fedramp",
  "owasp-asvs",
] as const;
export type Compliance = (typeof COMPLIANCE)[number];

export const TEAM_MODES = ["solo", "team"] as const;
export type TeamMode = (typeof TEAM_MODES)[number];

export const REQ_STATUS = [
  "Draft",
  "Planned",
  "Processed",
  "Implemented",
  "Evaluated",
  "Done",
  "Blocked",
] as const;
export type ReqStatus = (typeof REQ_STATUS)[number];

export const SEVERITY = ["info", "low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITY)[number];

export const EVIDENCE_KINDS = [
  "file",
  "command",
  "test",
  "web",
  "human",
  "prior-artifact",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const ARCHITECTURES = [
  "monolith",
  "modular-monolith",
  "hexagonal",
  "layered",
  "microservices",
  "event-driven",
  "serverless",
  "agent-based",
] as const;
export type Architecture = (typeof ARCHITECTURES)[number];

export const DATA_CLASS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;
export type DataClass = (typeof DATA_CLASS)[number];

export const CI_PROVIDERS = [
  "github-actions",
  "gitlab-ci",
  "azure-devops",
  "circleci",
  "jenkins",
  "buildkite",
] as const;
export type CiProvider = (typeof CI_PROVIDERS)[number];

export const INTERACTIVITY = ["auto", "minimal", "full"] as const;
export type Interactivity = (typeof INTERACTIVITY)[number];

export interface WizardAnswers {
  projectName: string;
  projectKind: ProjectKind;
  stackId: string;
  architecture: Architecture;
  teamMode: TeamMode;
  vendors: Vendor[];
  compliance: Compliance[];
  qualityGates: string[];
  dataClass: DataClass;
  ciProvider: CiProvider;
  bulkRequirements: {
    source: "none" | "csv" | "jira" | "github";
    ref?: string;
  };
  targetDir: string;
  initGit: boolean;
  installDeps: boolean;
  addCi: boolean;
  addMcpServer: boolean;
  license: "MIT" | "Apache-2.0" | "GPL-3.0" | "BSL-1.1" | "proprietary";
  /** Optional brief produced by `ai-sdlc brainstorm`. */
  brief?: BrainstormBrief;
}

export interface BrainstormBrief {
  schemaVersion: "1.0";
  title: string;
  problemStatement: string;
  targetUsers: string[];
  personas: { name: string; description: string }[];
  jobsToBeDone: string[];
  successMetrics: { name: string; target: string }[];
  constraints: string[];
  nonFunctional: { name: string; budget: string }[];
  risks: { description: string; severity: Severity }[];
  mvpScope: string[];
  outOfScope: string[];
  recommendedKind?: ProjectKind;
  recommendedStack?: string;
  recommendedArchitecture?: Architecture;
  rationale?: string;
  generatedAt: string;
}

export interface AutopilotConfig {
  requirementIds: string[] | "all";
  maxParallel: number;
  budgetMinutes: number;
  stopOnFail: boolean;
  dryRun: boolean;
}
