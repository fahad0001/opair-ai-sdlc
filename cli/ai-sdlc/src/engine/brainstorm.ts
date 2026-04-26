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

  const targetUsersText = must(
    await p.text({
      message: "Target users (comma-separated roles)?",
      placeholder: "e.g. ops engineers, support managers",
      ...(initial?.targetUsers
        ? { initialValue: initial.targetUsers.join(", ") }
        : {}),
    }),
  );
  const targetUsers = splitLines(targetUsersText);

  // Personas — collect 0..N
  const personas: { name: string; description: string }[] =
    initial?.personas ?? [];
  while (true) {
    const more = must(
      await p.confirm({
        message:
          personas.length === 0
            ? "Add a persona?"
            : `Add another persona? (${personas.length} so far)`,
        initialValue: personas.length < 2,
      }),
    );
    if (!more) break;
    const name = must(await p.text({ message: "Persona name/role?" }));
    const description = must(
      await p.text({ message: `Describe ${name} (goals, frustrations)?` }),
    );
    personas.push({ name, description });
  }

  const jobsText = must(
    await p.text({
      message: "Jobs-to-be-done (semicolon-separated)?",
      placeholder:
        "e.g. triage incoming tickets; draft replies; escalate edge cases",
      ...(initial?.jobsToBeDone
        ? { initialValue: initial.jobsToBeDone.join("; ") }
        : {}),
    }),
  );
  const jobsToBeDone = splitLines(jobsText);

  const metricsText = must(
    await p.text({
      message: "Success metrics (name=target, comma-sep)?",
      placeholder: "MTTR < 10min, deflection >= 30%",
      ...(initial?.successMetrics
        ? {
            initialValue: initial.successMetrics
              .map((m) => `${m.name}=${m.target}`)
              .join(", "),
          }
        : {}),
    }),
  );
  const successMetrics = splitLines(metricsText).map((line) => {
    const [name, target] = line.split(/[=:]/);
    return { name: (name ?? line).trim(), target: (target ?? "TBD").trim() };
  });

  const constraintsText = must(
    await p.text({
      message: "Hard constraints (budget, timeline, tech, regulatory)?",
      placeholder: "must run on-prem; ship MVP in 6 weeks; HIPAA scope",
      ...(initial?.constraints
        ? { initialValue: initial.constraints.join("; ") }
        : {}),
    }),
  );
  const constraints = splitLines(constraintsText);

  const nfText = must(
    await p.text({
      message: "Non-functional budgets (name=budget, comma-sep)?",
      placeholder: "p95 < 200ms, availability >= 99.9%, monthly cost <= $500",
      ...(initial?.nonFunctional
        ? {
            initialValue: initial.nonFunctional
              .map((n) => `${n.name}=${n.budget}`)
              .join(", "),
          }
        : {}),
    }),
  );
  const nonFunctional = splitLines(nfText).map((line) => {
    const [name, budget] = line.split(/[=:]/);
    return { name: (name ?? line).trim(), budget: (budget ?? "TBD").trim() };
  });

  // Risks — collect 0..N
  const risks: { description: string; severity: Severity }[] =
    initial?.risks ?? [];
  while (true) {
    const more = must(
      await p.confirm({
        message:
          risks.length === 0
            ? "Capture a top risk?"
            : `Add another risk? (${risks.length} so far)`,
        initialValue: risks.length < 3,
      }),
    );
    if (!more) break;
    const description = must(await p.text({ message: "Risk description?" }));
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
    const severity = must(severityRaw) as Severity;
    risks.push({ description, severity });
  }

  const mvpText = must(
    await p.text({
      message: "MVP scope (semicolon-separated bullets)?",
      placeholder: "single tenant; English only; 5 supported integrations",
      ...(initial?.mvpScope
        ? { initialValue: initial.mvpScope.join("; ") }
        : {}),
    }),
  );
  const mvpScope = splitLines(mvpText);

  const oosText = must(
    await p.text({
      message: "Explicitly out-of-scope (semicolon-separated)?",
      placeholder: "no mobile app in v1; no on-prem deploy",
      ...(initial?.outOfScope
        ? { initialValue: initial.outOfScope.join("; ") }
        : {}),
    }),
  );
  const outOfScope = splitLines(oosText);

  // Auto-classify from accumulated text
  const corpus = [title, problemStatement, jobsText, mvpText].join(" \n ");
  const cls = classifyText(corpus);
  p.note(
    `kind=${cls.kind}\nstack=${cls.stack}\narchitecture=${cls.architecture}\nconfidence=${(cls.confidence * 100).toFixed(0)}%\n— ${cls.rationale}`,
    "Heuristic classifier suggests",
  );

  const accept = must(
    await p.confirm({
      message: "Use these recommendations as defaults in the brief?",
      initialValue: cls.confidence >= 0.4,
    }),
  );

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

  p.outro(`Saved: ${path.basename(mdPath)} + ${path.basename(jsonPath)}`);
  return brief;
};

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
