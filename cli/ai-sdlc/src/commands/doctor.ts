import fs from "node:fs";
import path from "node:path";
import { ok, info, warn, fail } from "../util/log.js";

export interface DoctorOptions {
  cwd: string;
  json?: boolean;
}

interface Check {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
}

const exists = (p: string) => fs.existsSync(p);
const readJsonSafe = <T>(p: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as T;
  } catch {
    return null;
  }
};

export async function cmdDoctor(opts: DoctorOptions): Promise<void> {
  const root = path.resolve(opts.cwd);
  const checks: Check[] = [];
  const push = (
    id: string,
    label: string,
    status: Check["status"],
    detail?: string,
  ) =>
    checks.push(detail ? { id, label, status, detail } : { id, label, status });

  // Core memory layout
  push(
    "memory.root",
    "docs/agent-memory exists",
    exists(path.join(root, "docs", "agent-memory")) ? "pass" : "fail",
  );
  push(
    "memory.index",
    "index.json present + parseable",
    readJsonSafe(path.join(root, "docs", "agent-memory", "index.json"))
      ? "pass"
      : "fail",
  );
  push(
    "memory.schema",
    "index.schema.json present",
    exists(path.join(root, "docs", "agent-memory", "index.schema.json"))
      ? "pass"
      : "fail",
  );
  push(
    "memory.rules",
    "index.rules.md present",
    exists(path.join(root, "docs", "agent-memory", "index.rules.md"))
      ? "pass"
      : "fail",
  );
  push(
    "memory.agents",
    "AGENTS.md present",
    exists(path.join(root, "AGENTS.md")) ? "pass" : "fail",
  );
  push(
    "memory.context",
    "00-project-context.md present",
    exists(path.join(root, "docs", "agent-memory", "00-project-context.md"))
      ? "pass"
      : "fail",
  );
  push(
    "memory.gates",
    "07-quality-gates.md present",
    exists(path.join(root, "docs", "agent-memory", "07-quality-gates.md"))
      ? "pass"
      : "fail",
  );

  // Kind-aware quality-gate overlay (warn-only — falls back to the global file).
  try {
    const cfgPath = path.join(root, "ai-sdlc.config.json");
    if (exists(cfgPath)) {
      const cfg = JSON.parse(
        fs.readFileSync(cfgPath, "utf8").replace(/^\uFEFF/, ""),
      ) as { project?: { kind?: string } };
      const kind = cfg.project?.kind;
      if (kind) {
        const overlay = path.join(
          root,
          "docs",
          "agent-memory",
          "07-quality-gates",
          `${kind}.md`,
        );
        push(
          "memory.gates.kind",
          `07-quality-gates/${kind}.md overlay`,
          exists(overlay) ? "pass" : "warn",
        );
      }
    }
  } catch {
    // ignore: doctor is non-fatal on config parse errors here
  }

  // AHC overlays
  for (const [id, rel] of [
    ["ahc.patterns", "docs/agent-memory/13-architecture-patterns"],
    ["ahc.threats", "docs/agent-memory/14-threat-models"],
    ["ahc.evals", "docs/agent-memory/15-ai-evals"],
    ["ahc.observability", "docs/agent-memory/16-observability"],
    ["ahc.release", "docs/agent-memory/17-release"],
  ] as const) {
    push(id, `${rel} present`, exists(path.join(root, rel)) ? "pass" : "warn");
  }

  // CI / hooks
  push(
    "ci.workflows",
    ".github/workflows present",
    exists(path.join(root, ".github", "workflows")) ? "pass" : "warn",
  );
  push(
    "ci.codeowners",
    ".github/CODEOWNERS present",
    exists(path.join(root, ".github", "CODEOWNERS")) ? "pass" : "warn",
  );
  push(
    "ci.prtemplate",
    ".github/PULL_REQUEST_TEMPLATE.md present",
    exists(path.join(root, ".github", "PULL_REQUEST_TEMPLATE.md"))
      ? "pass"
      : "warn",
  );

  // AI vendor surfaces
  const vendors: Array<{ id: string; label: string; check: () => boolean }> = [
    {
      id: "ai.copilot",
      label: ".github/copilot-instructions.md",
      check: () =>
        exists(path.join(root, ".github", "copilot-instructions.md")),
    },
    {
      id: "ai.cursor",
      label: ".cursorrules or .cursor/rules",
      check: () =>
        exists(path.join(root, ".cursorrules")) ||
        exists(path.join(root, ".cursor", "rules")),
    },
    {
      id: "ai.claude",
      label: "CLAUDE.md",
      check: () => exists(path.join(root, "CLAUDE.md")),
    },
    {
      id: "ai.windsurf",
      label: ".windsurfrules",
      check: () => exists(path.join(root, ".windsurfrules")),
    },
    {
      id: "ai.cline",
      label: ".clinerules",
      check: () => exists(path.join(root, ".clinerules")),
    },
    {
      id: "ai.opencode",
      label: "opencode.json or .opencode/",
      check: () =>
        exists(path.join(root, "opencode.json")) ||
        exists(path.join(root, ".opencode")),
    },
    {
      id: "ai.aider",
      label: "AIDER_CONVENTIONS.md or .aider.conf.yml",
      check: () =>
        exists(path.join(root, "AIDER_CONVENTIONS.md")) ||
        exists(path.join(root, ".aider.conf.yml")),
    },
    {
      id: "ai.continue",
      label: ".continue/config.yaml",
      check: () => exists(path.join(root, ".continue", "config.yaml")),
    },
    {
      id: "ai.mcp",
      label: ".mcp/agents.json",
      check: () => exists(path.join(root, ".mcp", "agents.json")),
    },
  ];
  let aiCount = 0;
  for (const v of vendors) {
    const has = v.check();
    if (has) aiCount++;
    push(v.id, v.label, has ? "pass" : "warn");
  }
  push(
    "ai.any",
    "at least one AI vendor surface configured",
    aiCount > 0 ? "pass" : "fail",
    `${aiCount} configured`,
  );

  // Output
  if (opts.json) {
    process.stdout.write(JSON.stringify({ root, checks }, null, 2) + "\n");
    if (checks.some((c) => c.status === "fail")) process.exit(1);
    return;
  }
  for (const c of checks) {
    const line = `${c.label}${c.detail ? ` (${c.detail})` : ""}`;
    if (c.status === "pass") ok(line);
    else if (c.status === "warn") warn(line);
    else fail(line, 0); // avoid exiting mid-loop
  }
  const fails = checks.filter((c) => c.status === "fail");
  if (fails.length > 0) process.exit(1);
}
