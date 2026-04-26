import type { ProjectKind, Architecture } from "../types.js";

/**
 * Heuristic classifier for free-text "describe your project" input.
 * Returns a recommended (kind, stackId, architecture) tuple plus a
 * confidence score in [0,1] and a rationale string. The wizard uses
 * this to pre-fill defaults; the user can override every field.
 *
 * Implementation: keyword scoring with weighted patterns. No LLM call;
 * deterministic and offline. (Anti-Hallucination Charter pillar 3:
 * tool-only facts — heuristic is the tool here.)
 */

interface KindScore {
  kind: ProjectKind;
  score: number;
  hits: string[];
}

const KEYWORDS: Record<ProjectKind, string[]> = {
  backend: [
    "api",
    "rest",
    "graphql",
    "grpc",
    "service",
    "server",
    "endpoint",
    "fastify",
    "express",
    "spring",
    "fastapi",
  ],
  frontend: [
    "website",
    "web app",
    "spa",
    "react",
    "vue",
    "svelte",
    "next",
    "ui",
    "dashboard",
  ],
  fullstack: ["full stack", "fullstack", "saas", "web app with backend"],
  mobile: [
    "ios",
    "android",
    "mobile",
    "expo",
    "flutter",
    "react native",
    "swift",
    "kotlin app",
  ],
  desktop: ["desktop", "electron", "tauri", "wpf", "cocoa", "gtk", "qt"],
  cli: ["cli", "command line", "command-line", "terminal tool"],
  library: ["library", "sdk", "package", "module to publish"],
  monorepo: ["monorepo", "many packages", "turborepo", "nx", "lerna"],
  ai: [
    "agent",
    "llm",
    "rag",
    "embedding",
    "fine-tune",
    "langchain",
    "langgraph",
    "openai",
    "anthropic",
    "claude",
    "vector store",
  ],
  data: [
    "etl",
    "elt",
    "pipeline",
    "warehouse",
    "dbt",
    "airflow",
    "snowflake",
    "spark",
    "lakehouse",
  ],
  automation: [
    "automation",
    "scraping",
    "crawler",
    "playwright",
    "rpa",
    "scheduled job",
  ],
  infra: [
    "terraform",
    "pulumi",
    "kubernetes",
    "k8s",
    "infrastructure",
    "iac",
    "helm",
    "crossplane",
  ],
  docs: [
    "docs site",
    "documentation site",
    "docusaurus",
    "mkdocs",
    "vitepress",
  ],
};

const KIND_TO_DEFAULT_STACK: Record<ProjectKind, string> = {
  backend: "node-fastify-ts",
  frontend: "next-app-router-ts",
  fullstack: "next-app-router-ts",
  mobile: "expo-router",
  desktop: "tauri-ts",
  cli: "node-commander-ts",
  library: "tsup-changesets-ts",
  monorepo: "turborepo-pnpm",
  ai: "python-langgraph",
  data: "python-dlt-dbt",
  automation: "playwright-ts",
  infra: "terraform-cdktf-ts",
  docs: "docusaurus-ts",
};

export interface ClassificationResult {
  kind: ProjectKind;
  stack: string;
  architecture: Architecture;
  confidence: number;
  rationale: string;
}

export const classifyText = (text: string): ClassificationResult => {
  const t = text.toLowerCase();
  const scores: KindScore[] = [];
  for (const [k, words] of Object.entries(KEYWORDS) as [
    ProjectKind,
    string[],
  ][]) {
    let score = 0;
    const hits: string[] = [];
    for (const w of words) {
      if (t.includes(w)) {
        score += w.includes(" ") ? 2 : 1;
        hits.push(w);
      }
    }
    scores.push({ kind: k, score, hits });
  }
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0]!;
  const total = scores.reduce((s, x) => s + x.score, 0) || 1;
  const confidence = total === 0 ? 0 : top.score / total;
  const kind = top.score > 0 ? top.kind : "library";
  const arch: Architecture =
    kind === "ai"
      ? "agent-based"
      : kind === "data"
        ? "event-driven"
        : kind === "infra"
          ? "serverless"
          : "modular-monolith";
  return {
    kind,
    stack: KIND_TO_DEFAULT_STACK[kind],
    architecture: arch,
    confidence: Math.min(1, confidence),
    rationale:
      top.score > 0
        ? `Matched ${top.hits.length} keyword(s) for ${kind}: ${top.hits.join(", ")}`
        : "No strong keyword signal; defaulted to library.",
  };
};
