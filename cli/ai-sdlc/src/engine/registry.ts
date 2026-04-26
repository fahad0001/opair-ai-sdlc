import type { ProjectKind } from "../types.js";

/**
 * Stack registry — closed-set listing of curated stacks per project kind.
 * Adding a new stack requires an ADR (Anti-Hallucination Charter §6).
 *
 * Each stack id maps to a folder under `templates/stacks/<id>/` shipped
 * with this CLI. The wizard exposes recommended stacks per kind; users
 * can override via `--stack <id>`.
 */

export interface StackDef {
  id: string;
  kind: ProjectKind;
  label: string;
  description: string;
  /** Programming language(s), informational. */
  languages: string[];
  /** Recommended quality gates by id. Render to docs/agent-memory/07-quality-gates.md. */
  recommendedGates: string[];
  /** Whether this stack ships its own runnable code under templates/stacks/<id>. */
  hasRunnableTemplate: boolean;
}

export const STACKS: StackDef[] = [
  {
    id: "node-fastify-ts",
    kind: "backend",
    label: "Node 20 · Fastify · TypeScript",
    description:
      "ESM TypeScript backend on Fastify with Zod validation, vitest, pino logging, OpenAPI generation, and a Dockerfile.",
    languages: ["typescript"],
    recommendedGates: [
      "lint",
      "typecheck",
      "test:unit",
      "test:integration",
      "build",
      "audit",
    ],
    hasRunnableTemplate: true,
  },
  {
    id: "python-langgraph",
    kind: "ai",
    label: "Python 3.12 · LangGraph · uv",
    description:
      "AI agent project using LangGraph + uv-managed deps, ruff, mypy, pytest, and a runnable graph entrypoint.",
    languages: ["python"],
    recommendedGates: ["lint", "typecheck", "test:unit", "build"],
    hasRunnableTemplate: true,
  },
  {
    id: "generic",
    kind: "library",
    label: "Generic skeleton (no opinionated stack)",
    description:
      "Bare-minimum project with only the agent-memory framework wired up. Use when you want to add a stack later or your stack isn't curated yet.",
    languages: [],
    recommendedGates: ["lint", "test:unit"],
    hasRunnableTemplate: true,
  },
  {
    id: "next-app-router-ts",
    kind: "frontend",
    label: "Next.js 15 · App Router · TypeScript",
    description: "React 18 + Next.js App Router with vitest and ESLint.",
    languages: ["typescript"],
    recommendedGates: ["lint", "typecheck", "test:unit", "build"],
    hasRunnableTemplate: true,
  },
  {
    id: "expo-router",
    kind: "mobile",
    label: "Expo · expo-router · React Native",
    description: "Cross-platform mobile app with file-based routing.",
    languages: ["typescript"],
    recommendedGates: ["lint", "typecheck", "test:unit", "build"],
    hasRunnableTemplate: true,
  },
  {
    id: "tauri-ts",
    kind: "desktop",
    label: "Tauri 2 · Vite · TypeScript",
    description: "Cross-platform desktop with a Rust core and TS frontend.",
    languages: ["typescript", "rust"],
    recommendedGates: ["lint", "typecheck", "test:unit", "build"],
    hasRunnableTemplate: true,
  },
  {
    id: "node-commander-ts",
    kind: "cli",
    label: "Node · Commander · TypeScript",
    description: "Production-grade CLI with tsup bundling.",
    languages: ["typescript"],
    recommendedGates: ["lint", "typecheck", "test:unit", "build"],
    hasRunnableTemplate: true,
  },
  {
    id: "tsup-changesets-ts",
    kind: "library",
    label: "tsup · Changesets · TypeScript",
    description: "Publishable TS library with changesets-based releases.",
    languages: ["typescript"],
    recommendedGates: ["lint", "typecheck", "test:unit", "build"],
    hasRunnableTemplate: true,
  },
  {
    id: "turborepo-pnpm",
    kind: "monorepo",
    label: "Turborepo · pnpm",
    description: "Polyglot monorepo with Turbo task orchestration.",
    languages: ["typescript"],
    recommendedGates: ["lint", "typecheck", "test:unit", "build"],
    hasRunnableTemplate: true,
  },
  {
    id: "python-dlt-dbt",
    kind: "data",
    label: "Python · dlt · dbt",
    description: "Data pipeline (dlt for ingestion, dbt for transforms).",
    languages: ["python", "sql"],
    recommendedGates: ["lint", "test:unit", "data:contract"],
    hasRunnableTemplate: true,
  },
  {
    id: "playwright-ts",
    kind: "automation",
    label: "Playwright · TypeScript",
    description: "Browser automation / E2E test suite.",
    languages: ["typescript"],
    recommendedGates: ["lint", "typecheck", "test:e2e"],
    hasRunnableTemplate: true,
  },
  {
    id: "terraform-cdktf-ts",
    kind: "infra",
    label: "Terraform · CDKTF · TypeScript",
    description: "Infra-as-code via CDKTF synthesizing to Terraform.",
    languages: ["typescript"],
    recommendedGates: ["lint", "typecheck", "test:unit", "policy:check"],
    hasRunnableTemplate: true,
  },
  {
    id: "docusaurus-ts",
    kind: "docs",
    label: "Docusaurus · TypeScript",
    description: "Documentation site with MDX support.",
    languages: ["typescript", "markdown"],
    recommendedGates: ["lint", "build", "links:check"],
    hasRunnableTemplate: true,
  },
];

export type StackId = string;

export const listProjectKinds = (): readonly ProjectKind[] =>
  Array.from(new Set(STACKS.map((s) => s.kind))).sort();

export const stacksFor = (kind: ProjectKind): StackDef[] =>
  STACKS.filter((s) => s.kind === kind);

export const getStack = (id: StackId): StackDef | undefined =>
  STACKS.find((s) => s.id === id);

export const recommendedStackFor = (kind: ProjectKind): StackDef => {
  const s = stacksFor(kind)[0];
  return s ?? STACKS.find((x) => x.id === "generic")!;
};
