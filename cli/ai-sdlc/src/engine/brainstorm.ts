import * as p from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import { classifyText } from "./classifier.js";
import type { BrainstormBrief, Severity } from "../types.js";

/**
 * Brainstorm engine — iterative ideation flow that produces a
 * `project-brief.md` (+ `project-brief.json`) before any scaffolding
 * happens. The user can save and resume; the brief feeds directly into
 * `ai-sdlc create --from-brief`.
 *
 * Anti-Hallucination compliance:
 *   - Every answer is recorded with `evidence.kind=human`.
 *   - Recommendations from the classifier are surfaced with confidence
 *     and rationale (no fake authority).
 *   - The brief is written deterministically; no LLM call here.
 */

const cancel = (): never => {
  p.cancel("Brainstorm aborted (no brief saved).");
  process.exit(130);
};

const must = <T>(v: T | symbol): T => {
  if (p.isCancel(v)) cancel();
  return v as T;
};

/**
 * Soft variant: returns `undefined` when the user cancels (Esc/Ctrl+C
 * on a single prompt), instead of aborting the whole brainstorm. Used
 * for OPTIONAL fields and for collection-loop confirms — pressing Esc
 * means "skip this field" / "no more entries", not "throw away the
 * whole session".
 */
const soft = <T>(v: T | symbol): T | undefined => {
  if (p.isCancel(v)) return undefined;
  return v as T;
};

/** Soft text input. Empty/cancel → undefined (caller treats as skip). */
const softText = async (
  args: Parameters<typeof p.text>[0],
): Promise<string | undefined> => {
  const v = soft(await p.text(args));
  if (v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
};

const splitLines = (s: string): string[] =>
  s
    .split(/\r?\n|;|,\s*(?=\w)/)
    .map((x) => x.trim())
    .filter(Boolean);

export interface BrainstormOptions {
  cwd: string;
  out?: string; // path to save (default project-brief.md)
  resume?: string; // optional path to existing brief.json to resume
}

export const runBrainstorm = async (
  opts: BrainstormOptions,
): Promise<BrainstormBrief> => {
  p.intro("ai-sdlc · brainstorm");
  p.note(
    "We'll iteratively shape the project before any code is written.\nAt the end you get project-brief.md (+ .json) feedable to `ai-sdlc create --from-brief`.",
    "How this works",
  );

  const initial =
    opts.resume && fs.existsSync(opts.resume)
      ? (JSON.parse(
          fs.readFileSync(opts.resume, "utf8").replace(/^\uFEFF/, ""),
        ) as BrainstormBrief)
      : undefined;

  const title = must(
    await p.text({
      message: "One-line working title?",
      placeholder: "e.g. Realtime support copilot for SaaS dashboards",
      ...(initial?.title ? { initialValue: initial.title } : {}),
      validate: (x) => (!x ? "Required" : undefined),
    }),
  );

  const problemStatement = must(
    await p.text({
      message: "Problem statement (what hurts today, for whom, why now)?",
      placeholder: "Describe the pain in 2-3 sentences.",
      ...(initial?.problemStatement
        ? { initialValue: initial.problemStatement }
        : {}),
      validate: (x) => (!x ? "Required" : undefined),
    }),
  );

  const targetUsersText =
    (await softText({
      message: "Target users (comma-separated roles)? [Esc to skip]",
      placeholder: "e.g. ops engineers, support managers",
      ...(initial?.targetUsers
        ? { initialValue: initial.targetUsers.join(", ") }
        : {}),
    })) ?? "";
  const targetUsers = splitLines(targetUsersText);

  // Personas — collect 0..N. Esc on the confirm or on either text
  // input means "stop collecting", not "abort the whole session".
  const personas: { name: string; description: string }[] =
    initial?.personas ?? [];
  while (true) {
    const more = soft(
      await p.confirm({
        message:
          personas.length === 0
            ? "Add a persona? [Esc to skip]"
            : `Add another persona? (${personas.length} so far)`,
        initialValue: personas.length < 2,
      }),
    );
    if (more !== true) break;
    const name = await softText({ message: "Persona name/role?" });
    if (!name) break;
    const description =
      (await softText({
        message: `Describe ${name} (goals, frustrations)? [Esc to skip]`,
      })) ?? "";
    personas.push({ name, description });
  }

  const jobsText =
    (await softText({
      message: "Jobs-to-be-done (semicolon-separated)? [Esc to skip]",
      placeholder:
        "e.g. triage incoming tickets; draft replies; escalate edge cases",
      ...(initial?.jobsToBeDone
        ? { initialValue: initial.jobsToBeDone.join("; ") }
        : {}),
    })) ?? "";
  const jobsToBeDone = splitLines(jobsText);

  const metricsText =
    (await softText({
      message: "Success metrics (name=target, comma-sep)? [Esc to skip]",
      placeholder: "MTTR < 10min, deflection >= 30%",
      ...(initial?.successMetrics
        ? {
            initialValue: initial.successMetrics
              .map((m) => `${m.name}=${m.target}`)
              .join(", "),
          }
        : {}),
    })) ?? "";
  const successMetrics = splitLines(metricsText).map((line) => {
    const [name, target] = line.split(/[=:]/);
    return { name: (name ?? line).trim(), target: (target ?? "TBD").trim() };
  });

  const constraintsText =
    (await softText({
      message:
        "Hard constraints (budget, timeline, tech, regulatory)? [Esc to skip]",
      placeholder: "must run on-prem; ship MVP in 6 weeks; HIPAA scope",
      ...(initial?.constraints
        ? { initialValue: initial.constraints.join("; ") }
        : {}),
    })) ?? "";
  const constraints = splitLines(constraintsText);

  const nfText =
    (await softText({
      message: "Non-functional budgets (name=budget, comma-sep)? [Esc to skip]",
      placeholder: "p95 < 200ms, availability >= 99.9%, monthly cost <= $500",
      ...(initial?.nonFunctional
        ? {
            initialValue: initial.nonFunctional
              .map((n) => `${n.name}=${n.budget}`)
              .join(", "),
          }
        : {}),
    })) ?? "";
  const nonFunctional = splitLines(nfText).map((line) => {
    const [name, budget] = line.split(/[=:]/);
    return { name: (name ?? line).trim(), budget: (budget ?? "TBD").trim() };
  });

  // Risks — collect 0..N. Same soft-cancel semantics as personas.
  const risks: { description: string; severity: Severity }[] =
    initial?.risks ?? [];
  while (true) {
    const more = soft(
      await p.confirm({
        message:
          risks.length === 0
            ? "Capture a top risk? [Esc to skip]"
            : `Add another risk? (${risks.length} so far)`,
        initialValue: risks.length < 3,
      }),
    );
    if (more !== true) break;
    const description = await softText({ message: "Risk description?" });
    if (!description) break;
    const severityRaw = await p.select({
      message: "Severity?",
      options: [
        { value: "low", label: "low" },
        { value: "medium", label: "medium" },
        { value: "high", label: "high" },
        { value: "critical", label: "critical" },
      ] as Array<{ value: Severity; label: string }>,
      initialValue: "medium" as Severity,
    });
    const severity = (soft(severityRaw) as Severity | undefined) ?? "medium";
    risks.push({ description, severity });
  }

  const mvpText =
    (await softText({
      message: "MVP scope (semicolon-separated bullets)? [Esc to skip]",
      placeholder: "single tenant; English only; 5 supported integrations",
      ...(initial?.mvpScope
        ? { initialValue: initial.mvpScope.join("; ") }
        : {}),
    })) ?? "";
  const mvpScope = splitLines(mvpText);

  const oosText =
    (await softText({
      message: "Explicitly out-of-scope (semicolon-separated)? [Esc to skip]",
      placeholder: "no mobile app in v1; no on-prem deploy",
      ...(initial?.outOfScope
        ? { initialValue: initial.outOfScope.join("; ") }
        : {}),
    })) ?? "";
  const outOfScope = splitLines(oosText);

  // Auto-classify from accumulated text
  const corpus = [title, problemStatement, jobsText, mvpText].join(" \n ");
  const cls = classifyText(corpus);
  p.note(
    `kind=${cls.kind}\nstack=${cls.stack}\narchitecture=${cls.architecture}\nconfidence=${(cls.confidence * 100).toFixed(0)}%\n— ${cls.rationale}`,
    "Heuristic classifier suggests",
  );

  const accept =
    soft(
      await p.confirm({
        message: "Use these recommendations as defaults in the brief?",
        initialValue: cls.confidence >= 0.4,
      }),
    ) === true;

  const brief: BrainstormBrief = {
    schemaVersion: "1.0",
    title,
    problemStatement,
    targetUsers,
    personas,
    jobsToBeDone,
    successMetrics,
    constraints,
    nonFunctional,
    risks,
    mvpScope,
    outOfScope,
    ...(accept
      ? {
          recommendedKind: cls.kind,
          recommendedStack: cls.stack,
          recommendedArchitecture: cls.architecture,
          rationale: cls.rationale,
        }
      : {}),
    generatedAt: new Date().toISOString(),
  };

  const outBase = opts.out ?? path.join(opts.cwd, "project-brief");
  const mdPath = outBase.endsWith(".md") ? outBase : `${outBase}.md`;
  const jsonPath = mdPath.replace(/\.md$/, ".json");
  fs.writeFileSync(mdPath, briefToMarkdown(brief), "utf8");
  fs.writeFileSync(jsonPath, JSON.stringify(brief, null, 2) + "\n", "utf8");

  p.note(
    `Want to enrich this brief with an AI assistant?\n` +
      `  ai-sdlc brainstorm --ai\n` +
      `That writes brainstorm.prompt.md you can run inside Copilot, Claude,\n` +
      `Cursor, opencode, or Continue. The agent will dialog with you and\n` +
      `produce a richer project-brief.md, then you run:\n` +
      `  ai-sdlc create --from-brief project-brief.md`,
    "AI-assisted brainstorm (optional)",
  );
  p.outro(`Saved: ${path.basename(mdPath)} + ${path.basename(jsonPath)}`);
  return brief;
};

/**
 * Emit an AI-assisted brainstorm prompt + skeleton brief, instead of
 * running the interactive flow. The user opens `brainstorm.prompt.md`
 * inside their AI assistant (Copilot, Claude, Cursor, opencode,
 * Continue, etc.); the agent dialogs with them and writes the final
 * `project-brief.md` + `project-brief.json`. Then `ai-sdlc create
 * --from-brief project-brief.md` consumes the result.
 */
export const emitAiBrainstormPrompt = (opts: {
  cwd: string;
  out?: string;
}): { promptPath: string; skeletonPath: string } => {
  const promptPath = path.resolve(opts.cwd, opts.out ?? "brainstorm.prompt.md");
  const skeletonPath = path.resolve(opts.cwd, "project-brief.template.json");

  fs.writeFileSync(promptPath, AI_BRAINSTORM_PROMPT, "utf8");
  fs.writeFileSync(
    skeletonPath,
    JSON.stringify(AI_BRAINSTORM_SKELETON, null, 2) + "\n",
    "utf8",
  );

  return { promptPath, skeletonPath };
};

const AI_BRAINSTORM_SKELETON = {
  schemaVersion: "1.0",
  title: "",
  problemStatement: "",
  targetUsers: [],
  personas: [],
  jobsToBeDone: [],
  successMetrics: [],
  constraints: [],
  nonFunctional: [],
  risks: [],
  mvpScope: [],
  outOfScope: [],
  recommendedKind: "",
  recommendedStack: "",
  recommendedArchitecture: "",
  rationale: "",
  generatedAt: "",
};

const AI_BRAINSTORM_PROMPT = `# ai-sdlc · AI-assisted brainstorm

You are an AI assistant helping the user shape a brand-new project.
Your job is to **dialog** with the user — back and forth, one focused
question at a time — until you have a complete project brief, then
write two files alongside this prompt:

- \`project-brief.md\`   (human-readable)
- \`project-brief.json\` (machine-readable, schema below)

The user will then run:

\`\`\`bash
ai-sdlc create --from-brief project-brief.md
\`\`\`

to scaffold the project. **Brief quality directly determines scaffold
quality.**

## Rules

- **Dialog, don't dump.** One focused question at a time. Reflect back
  what you hear. Push for specifics when answers are vague
  ("fast" → "p95 latency target?").
- **No invention.** Never fabricate metrics, personas, constraints, or
  scope. If the user has no answer, write \`TBD\` — never invent a
  number.
- **Surface tradeoffs.** When the user proposes something risky,
  expensive, or contradictory, name it and let them decide.
- **Iterate to convergence.** When the brief feels complete, summarize
  it and ask: _"ready to finalize?"_. Only write the files after
  explicit confirmation.

## Discovery topics (cover all)

1. **Working title** — one line.
2. **Problem statement** — what hurts today, for whom, why now.
3. **Target users** — roles.
4. **Personas** — 1..N, each with name + goals + frustrations.
5. **Jobs to be done** — what the user is trying to accomplish.
6. **Success metrics** — measurable (\`MTTR < 10min\`, \`deflection >= 30%\`).
7. **Constraints** — hard limits (budget, timeline, tech, regulatory).
8. **Non-functional budgets** — perf, availability, cost, security.
9. **Risks** — top items with severity (\`low|medium|high|critical\`).
10. **MVP scope** — what's IN for v1.
11. **Out of scope** — what's explicitly OUT.
12. **Recommended kind / stack / architecture** — propose values from
    the closed sets below; ask the user to confirm or override.

## Closed sets (use these EXACT strings in JSON)

- \`recommendedKind\`: \`backend\` | \`frontend\` | \`fullstack\` |
  \`mobile\` | \`desktop\` | \`cli\` | \`library\` | \`monorepo\` |
  \`ai\` | \`data\` | \`automation\` | \`infra\` | \`docs\`
- \`recommendedArchitecture\`: \`monolith\` | \`modular-monolith\` |
  \`hexagonal\` | \`layered\` | \`microservices\` | \`event-driven\` |
  \`serverless\` | \`agent-based\`
- \`severity\`: \`low\` | \`medium\` | \`high\` | \`critical\`
- \`recommendedStack\`: a stable id like \`next-app-router-ts\`,
  \`node-fastify-ts\`, \`python-langgraph\`, \`tauri-ts\`,
  \`expo-router\`, \`python-dlt-dbt\`, \`node-commander-ts\`,
  \`terraform-cdktf-ts\`, \`playwright-ts\`, \`docusaurus-ts\`,
  \`tsup-changesets-ts\`, \`turborepo-pnpm\`, or \`generic\`.

## Output: project-brief.json

A skeleton has been written next to this prompt as
\`project-brief.template.json\`. Fill every field. Schema:

\`\`\`json
{
  "schemaVersion": "1.0",
  "title": "string",
  "problemStatement": "string",
  "targetUsers": ["string"],
  "personas": [{ "name": "string", "description": "string" }],
  "jobsToBeDone": ["string"],
  "successMetrics": [{ "name": "string", "target": "string" }],
  "constraints": ["string"],
  "nonFunctional": [{ "name": "string", "budget": "string" }],
  "risks": [{ "description": "string", "severity": "low|medium|high|critical" }],
  "mvpScope": ["string"],
  "outOfScope": ["string"],
  "recommendedKind": "<one of the kind enum>",
  "recommendedStack": "<stack id>",
  "recommendedArchitecture": "<one of the architecture enum>",
  "rationale": "1-2 sentences explaining the recommendation",
  "generatedAt": "<ISO-8601 timestamp>"
}
\`\`\`

## Output: project-brief.md

Mirror the JSON sections under headings: \`## Problem statement\`,
\`## Target users\`, \`## Personas\`, \`## Jobs to be done\`,
\`## Success metrics\`, \`## Constraints\`, \`## Non-functional budgets\`,
\`## Risks\`, \`## MVP scope\`, \`## Out of scope\`,
\`## Heuristic recommendation\`. Use bullet lists.

Top heading: \`# Project Brief — <title>\`. Add
\`_Generated by AI brainstorm at <ISO timestamp>._\` under the H1.

## When done

After writing both files, tell the user:

> Brief saved to \`project-brief.md\` + \`project-brief.json\`.
> Run \`ai-sdlc create --from-brief project-brief.md\` to scaffold.

Now start the dialog. Open with the working title.
`;

export const briefToMarkdown = (b: BrainstormBrief): string => {
  const lines: string[] = [];
  lines.push(`# Project Brief — ${b.title}`);
  lines.push("");
  lines.push(`_Generated by \`ai-sdlc brainstorm\` at ${b.generatedAt}._`);
  lines.push("");
  lines.push("## Problem statement");
  lines.push(b.problemStatement);
  lines.push("");
  lines.push("## Target users");
  for (const u of b.targetUsers) lines.push(`- ${u}`);
  lines.push("");
  lines.push("## Personas");
  for (const p of b.personas) lines.push(`- **${p.name}** — ${p.description}`);
  lines.push("");
  lines.push("## Jobs to be done");
  for (const j of b.jobsToBeDone) lines.push(`- ${j}`);
  lines.push("");
  lines.push("## Success metrics");
  for (const m of b.successMetrics) lines.push(`- ${m.name} → ${m.target}`);
  lines.push("");
  lines.push("## Constraints");
  for (const c of b.constraints) lines.push(`- ${c}`);
  lines.push("");
  lines.push("## Non-functional budgets");
  for (const n of b.nonFunctional) lines.push(`- ${n.name} → ${n.budget}`);
  lines.push("");
  lines.push("## Risks");
  for (const r of b.risks) lines.push(`- (${r.severity}) ${r.description}`);
  lines.push("");
  lines.push("## MVP scope");
  for (const s of b.mvpScope) lines.push(`- ${s}`);
  lines.push("");
  lines.push("## Out of scope");
  for (const s of b.outOfScope) lines.push(`- ${s}`);
  lines.push("");
  if (b.recommendedKind) {
    lines.push("## Heuristic recommendation");
    lines.push(`- kind: \`${b.recommendedKind}\``);
    lines.push(`- stack: \`${b.recommendedStack}\``);
    lines.push(`- architecture: \`${b.recommendedArchitecture}\``);
    if (b.rationale) lines.push(`- rationale: ${b.rationale}`);
    lines.push("");
  }
  return lines.join("\n");
};

export const loadBrief = (file: string): BrainstormBrief => {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as BrainstormBrief;
};
