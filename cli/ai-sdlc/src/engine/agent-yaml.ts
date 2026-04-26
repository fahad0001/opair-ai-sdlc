import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

/**
 * Neutral agent definition (vendor-agnostic).
 *
 * Authored under `templates/agents/<id>.agent.yaml`. Vendor renderers
 * (renderers.ts) translate this single source into Copilot/Claude-Code/
 * Cursor/Aider/Continue/MCP files. This is how we satisfy the
 * "AI-assistant-agnostic" promise of the framework.
 */

const HandoffSchema = z
  .object({
    label: z.string(),
    agent: z.string(),
    prompt: z.string(),
    send: z.boolean().default(false),
  })
  .strict();

export const NeutralAgentSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string(),
    description: z.string(),
    role: z.enum([
      "init",
      "plan",
      "process",
      "execution",
      "evaluation",
      "finalization",
      "verify",
      "orchestrator",
      "audit",
      "explore",
      "architect",
      "custom",
    ]),
    tools: z.array(z.string()).default([]),
    handoffs: z.array(HandoffSchema).default([]),
    argumentHint: z.string().optional(),
    body: z.string().describe("Markdown body of the agent prompt."),
    /**
     * AHC compliance: if true (default), renderers will inject the
     * Anti-Hallucination Operating Rules block at the bottom.
     */
    ahcBlock: z.boolean().default(true),
  })
  .strict();

export type NeutralAgent = z.infer<typeof NeutralAgentSchema>;

export const loadAgentYaml = (filePath: string): NeutralAgent => {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = yaml.load(raw) as unknown;
  return NeutralAgentSchema.parse(parsed);
};

export const loadAllAgents = (dir: string): NeutralAgent[] => {
  if (!fs.existsSync(dir)) return [];
  const out: NeutralAgent[] = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".agent.yaml") && !f.endsWith(".agent.yml")) continue;
    out.push(loadAgentYaml(path.join(dir, f)));
  }
  return out;
};
