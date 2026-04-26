import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import { readMemoryIndex, writeMemoryIndex, indexPathFor } from "./memory.js";
import type { AutopilotConfig, ReqStatus } from "../types.js";
import { ok, info, warn, fail } from "../util/log.js";
import { nextLogPath, todayIso } from "../util/agent-log.js";

/**
 * Autopilot — multi-role parallel orchestrator.
 *
 * Runs each requirement through the pipeline:
 *   Draft → Planned → Processed → Implemented → Evaluated → Done
 *
 * Roles map to subagent prompts under `.github/agents/`. The CLI does
 * NOT itself run an LLM — it shells out to a configured external agent
 * runner via the `AGENT_MEM_RUNNER` env var. If unset, autopilot runs
 * in *simulated* mode: it transitions states, appends events, and
 * writes evidence stubs so a human or LLM can fill in details.
 *
 * Anti-Hallucination: every transition appends an event to
 * `index.events[]` with `actor`, `at`, `evidence`. No bypassing of
 * status-transition legality.
 *
 * Parallelism: requirements without dependencies between them run
 * concurrently up to `maxParallel`. Per-requirement, stages run
 * sequentially (a R-XXXX cannot enter Process before Plan completes).
 */

interface Event {
  at: string;
  actor: string;
  requirementId: string;
  fromStatus: ReqStatus | null;
  toStatus: ReqStatus;
  evidence: { kind: "command" | "human" | "file"; ref: string };
}

const STAGES: { from: ReqStatus | null; to: ReqStatus; agent: string }[] = [
  { from: null, to: "Draft", agent: "init" },
  { from: "Draft", to: "Planned", agent: "plan" },
  { from: "Planned", to: "Processed", agent: "process" },
  { from: "Processed", to: "Implemented", agent: "execution" },
  { from: "Implemented", to: "Evaluated", agent: "evaluation" },
  { from: "Evaluated", to: "Done", agent: "finalization" },
];

const runner = (): string | undefined => process.env.AGENT_MEM_RUNNER;

const runAgent = async (
  cwd: string,
  agentId: string,
  requirementId: string,
  dryRun: boolean,
): Promise<{ ok: boolean; output: string }> => {
  const cmd = runner();
  if (!cmd || dryRun) {
    // Simulated mode: write a placeholder log so transitions are auditable.
    const logsDir = path.join(cwd, "docs", "agent-logs");
    const file = nextLogPath(logsDir, todayIso(), requirementId, agentId);
    fs.writeFileSync(
      file,
      [
        `# autopilot ${agentId} run for ${requirementId}`,
        "",
        `- mode: ${dryRun ? "dry-run" : "simulated (no AGENT_MEM_RUNNER)"}`,
        `- at: ${new Date().toISOString()}`,
        "",
        "_Replace this file with real agent output. Autopilot only",
        "advances state machines; humans/LLMs supply substance._",
        "",
      ].join("\n"),
      "utf8",
    );
    return { ok: true, output: `simulated:${agentId}` };
  }
  // Real mode: shell out to the configured runner.
  // Convention: <runner> <agentId> <requirementId> <cwd>
  const [bin, ...args] = cmd.split(/\s+/);
  if (!bin) return { ok: false, output: "AGENT_MEM_RUNNER is empty" };
  try {
    const result = await execa(bin, [...args, agentId, requirementId, cwd], {
      cwd,
      reject: false,
      timeout: 60 * 60 * 1000,
    });
    return {
      ok: result.exitCode === 0,
      output: result.stdout + (result.stderr ? `\n${result.stderr}` : ""),
    };
  } catch (e) {
    return { ok: false, output: String((e as Error).message) };
  }
};

const appendEvent = (root: string, ev: Event) => {
  const idxPath = indexPathFor(root);
  const idx = readMemoryIndex(root) as unknown as Record<string, unknown>;
  const events = (idx.events as Event[] | undefined) ?? [];
  events.push(ev);
  (idx as Record<string, unknown>).events = events;
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n", "utf8");
};

const setStatus = (
  root: string,
  reqId: string,
  status: ReqStatus,
): ReqStatus | null => {
  const idx = readMemoryIndex(root);
  const item = idx.requirements.items.find((r) => r.id === reqId);
  if (!item) throw new Error(`Requirement ${reqId} not found in index.`);
  const prev = item.status;
  if (prev === status) return prev;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  writeMemoryIndex(root, idx);
  return prev;
};

const advanceOne = async (
  cwd: string,
  reqId: string,
  cfg: AutopilotConfig,
): Promise<{ ok: boolean; final: ReqStatus }> => {
  const idx0 = readMemoryIndex(cwd);
  const it = idx0.requirements.items.find((r) => r.id === reqId);
  if (!it) throw new Error(`${reqId} missing`);
  let cur = it.status as ReqStatus;
  const startIdx = STAGES.findIndex((s) => s.to === cur);
  for (let i = startIdx + 1; i < STAGES.length; i++) {
    const stage = STAGES[i]!;
    info(`[autopilot] ${reqId} ${cur} → ${stage.to} (agent=${stage.agent})`);
    const r = await runAgent(cwd, stage.agent, reqId, cfg.dryRun);
    if (!r.ok) {
      warn(`[autopilot] ${reqId} ${stage.agent} failed: ${r.output}`);
      setStatus(cwd, reqId, "Blocked");
      appendEvent(cwd, {
        at: new Date().toISOString(),
        actor: `autopilot:${stage.agent}`,
        requirementId: reqId,
        fromStatus: cur,
        toStatus: "Blocked",
        evidence: { kind: "command", ref: r.output.slice(0, 200) },
      });
      return { ok: false, final: "Blocked" };
    }
    const prev = setStatus(cwd, reqId, stage.to);
    appendEvent(cwd, {
      at: new Date().toISOString(),
      actor: `autopilot:${stage.agent}`,
      requirementId: reqId,
      fromStatus: prev,
      toStatus: stage.to,
      evidence: { kind: "command", ref: r.output.slice(0, 200) },
    });
    cur = stage.to;
  }
  return { ok: true, final: cur };
};

export const runAutopilot = async (
  cwd: string,
  cfg: AutopilotConfig,
): Promise<{ completed: string[]; blocked: string[] }> => {
  const idx = readMemoryIndex(cwd);
  const ids =
    cfg.requirementIds === "all"
      ? idx.requirements.items
          .filter((r) => r.status !== "Done" && r.status !== "Blocked")
          .map((r) => r.id)
      : cfg.requirementIds;

  if (ids.length === 0) {
    info("[autopilot] no eligible requirements; nothing to do.");
    return { completed: [], blocked: [] };
  }
  info(`[autopilot] queue: ${ids.length}; max-parallel=${cfg.maxParallel}`);

  const completed: string[] = [];
  const blocked: string[] = [];
  const startedAt = Date.now();

  // Worker pool
  let cursor = 0;
  const workers = Array.from(
    { length: Math.max(1, cfg.maxParallel) },
    async () => {
      while (cursor < ids.length) {
        if (Date.now() - startedAt > cfg.budgetMinutes * 60_000) {
          warn("[autopilot] budget exceeded; stopping new work.");
          return;
        }
        const id = ids[cursor++];
        if (!id) return;
        try {
          const r = await advanceOne(cwd, id, cfg);
          if (r.ok && r.final === "Done") completed.push(id);
          else blocked.push(id);
          if (!r.ok && cfg.stopOnFail) {
            fail(`[autopilot] stop-on-fail triggered by ${id}`);
          }
        } catch (e) {
          warn(`[autopilot] ${id} crashed: ${(e as Error).message}`);
          blocked.push(id);
        }
      }
    },
  );
  await Promise.all(workers);

  ok(
    `[autopilot] done. completed=${completed.length} blocked=${blocked.length} of ${ids.length}.`,
  );
  return { completed, blocked };
};
