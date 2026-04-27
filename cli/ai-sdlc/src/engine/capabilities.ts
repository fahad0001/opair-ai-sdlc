/**
 * cli/ai-sdlc/src/engine/capabilities.ts
 *
 * Single source of truth for the capability catalog.
 *
 * The framework is split into:
 *   - **core** (the SDLC pipeline): always shipped on init/create.
 *   - **capability categories**: opt-in groups the user can include
 *     at scaffold time, or add later via `ai-sdlc add <category|id>`.
 *
 * Each capability id maps to:
 *   - one `.github/agents/<id>.agent.md`
 *   - one `.github/prompts/<id>.prompt.md`
 * Some categories also pin extra workflows or scoped instructions.
 *
 * When you add a new capability:
 *   1. Add a `.agent.md` and `.prompt.md` in the repo root `.github/`.
 *   2. Register it here under the right category.
 *   3. Run `node scripts/sync-framework.mjs` so neutral YAMLs and
 *      template copies pick it up.
 */

export interface CapabilityCategory {
  /** Stable id used in CLI flags and registry lookups. */
  id: CategoryId;
  /** Short human label shown in the wizard. */
  label: string;
  /** One-line description shown in the wizard. */
  description: string;
  /** Capability ids in this category (filename stem of .agent.md). */
  capabilities: readonly string[];
  /** Workflow file names under `.github/workflows/` to keep when this
   *  category is selected. Workflows not pinned to any selected
   *  category are removed (except `agent-memory-guard.yml`, which is
   *  core and always kept). */
  workflows?: readonly string[];
}

export const CATEGORY_IDS = [
  "diagnostics",
  "visibility",
  "provenance",
  "security",
  "release",
  "memory",
  "workflows",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const CAPABILITY_CATEGORIES: readonly CapabilityCategory[] = [
  {
    id: "diagnostics",
    label: "Diagnostics",
    description:
      "Health-check the memory pack, validate AHC overlays, repair drift.",
    capabilities: ["audit", "doctor", "repair", "validate", "status"],
  },
  {
    id: "visibility",
    label: "Visibility & reporting",
    description: "Dashboard, dependency graph, per-requirement reports.",
    capabilities: ["dashboard", "graph", "report"],
  },
  {
    id: "provenance",
    label: "Provenance",
    description:
      "Hash-pinned context packs and signed attestations for shipped artifacts.",
    capabilities: [
      "context-pack",
      "verify-pack",
      "attest-pack",
      "provenance-verify",
    ],
  },
  {
    id: "security",
    label: "Security & compliance",
    description: "SBOM checks, threat-coverage, policy enforcement.",
    capabilities: ["sbom-check", "sbom-diff", "threat-coverage"],
    workflows: ["sbom.yml"],
  },
  {
    id: "release",
    label: "Release operations",
    description:
      "DORA metrics, release notes, changelog, most-significant-requirements digest.",
    capabilities: ["dora-export", "release-notes", "changelog", "msrd"],
    workflows: ["release.yml", "msrd.yml", "agent-memory-release-notes.yml"],
  },
  {
    id: "memory",
    label: "Memory operations",
    description:
      "Manage known-issues, ingest external artifacts, promote, archive.",
    capabilities: ["ki", "ingest", "promote", "archive"],
  },
  {
    id: "workflows",
    label: "Workflow agents",
    description: "Brownfield adopt + autonomous autopilot pipeline.",
    capabilities: ["adopt", "autopilot"],
  },
] as const;

/** Scoped instructions that belong to the SDLC core (always kept). */
export const CORE_SCOPED_INSTRUCTIONS = [
  "requirements",
  "plans",
  "execution",
  "evaluation",
  "decisions",
  "index-json",
  "cli-ai-sdlc",
  "tests",
] as const;

/** SDLC-core agents — always included, never filtered. */
export const CORE_AGENT_IDS = [
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
] as const;

/** SDLC-core prompts — always included, never filtered. */
export const CORE_PROMPT_IDS = [
  "new-requirement",
  "run-pipeline",
  "audit-undocumented",
  "risk-forecast",
  "system-progress-report",
  "tech-debt-quantify",
  "self-healing-repo",
  "transform-repo-structure",
  "brainstorm",
] as const;

/** Workflows kept regardless of category selection. */
export const CORE_WORKFLOWS = ["agent-memory-guard.yml"] as const;

/** Fast lookup: capability id → its category. */
const CAP_TO_CATEGORY = new Map<string, CategoryId>();
for (const c of CAPABILITY_CATEGORIES) {
  for (const cap of c.capabilities) CAP_TO_CATEGORY.set(cap, c.id);
}

export const findCategoryForCapability = (
  capId: string,
): CategoryId | undefined => CAP_TO_CATEGORY.get(capId);

/** All capability ids across all categories. */
export const ALL_CAPABILITY_IDS: readonly string[] =
  CAPABILITY_CATEGORIES.flatMap((c) => c.capabilities);

/**
 * Resolve a user-provided list of selectors to a concrete set of
 * capability ids. Selectors may be:
 *   - "all" → every capability
 *   - a category id (e.g. "diagnostics")
 *   - a capability id (e.g. "audit")
 * Throws on unknown selector.
 */
export const resolveCapabilities = (
  selectors: readonly string[],
): { capabilities: Set<string>; categories: Set<CategoryId> } => {
  const caps = new Set<string>();
  const cats = new Set<CategoryId>();
  for (const raw of selectors) {
    const s = raw.trim();
    if (!s) continue;
    if (s === "all") {
      for (const c of CAPABILITY_CATEGORIES) {
        cats.add(c.id);
        for (const cap of c.capabilities) caps.add(cap);
      }
      continue;
    }
    const cat = CAPABILITY_CATEGORIES.find((c) => c.id === s);
    if (cat) {
      cats.add(cat.id);
      for (const cap of cat.capabilities) caps.add(cap);
      continue;
    }
    if (CAP_TO_CATEGORY.has(s)) {
      caps.add(s);
      cats.add(CAP_TO_CATEGORY.get(s)!);
      continue;
    }
    throw new Error(
      `Unknown capability selector: "${s}". ` +
        `Expected "all", a category (${CATEGORY_IDS.join("|")}), ` +
        `or a capability id (e.g. ${ALL_CAPABILITY_IDS.slice(0, 4).join(", ")}, ...).`,
    );
  }
  return { capabilities: caps, categories: cats };
};

/** Default selector set when the user accepts the wizard default. */
export const DEFAULT_CATEGORIES: readonly CategoryId[] = ["diagnostics"];
