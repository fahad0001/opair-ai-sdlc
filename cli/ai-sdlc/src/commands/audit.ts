import fs from "node:fs";
import path from "node:path";
import { ok, info, warn } from "../util/log.js";
import { appendEvent } from "../engine/memory.js";

export interface AuditOptions {
  cwd: string;
  json?: boolean;
  out?: string;
  fix?: boolean;
}

interface Finding {
  id: string;
  severity: "info" | "low" | "medium" | "high";
  area: "requirements" | "adr" | "evaluation" | "ki" | "memory" | "ahc";
  message: string;
}

interface AuditReport {
  generatedAt: string;
  totals: {
    requirements: number;
    adrs: number;
    knownIssuesOpen: number;
    findings: number;
  };
  findings: Finding[];
}

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");

const safeJson = <T>(p: string, fallback: T): T => {
  try {
    return JSON.parse(stripBom(fs.readFileSync(p, "utf8"))) as T;
  } catch {
    return fallback;
  }
};

interface IndexItem {
  id: string;
  status: string;
  title?: string;
  artifacts?: Array<{ kind?: string; file?: string }>;
  evaluation?: { firstTryPass?: boolean };
}
interface IndexShape {
  requirements?: { items?: IndexItem[] };
}

export function computeAuditReport(memDir: string): AuditReport {
  const findings: Finding[] = [];
  const idx = safeJson<IndexShape>(path.join(memDir, "index.json"), {});
  const items = idx.requirements?.items ?? [];

  // Requirements without acceptance criteria.
  for (const r of items) {
    const ac = path.join(
      memDir,
      "02-requirements",
      r.id,
      "acceptance-criteria.md",
    );
    if (!fs.existsSync(ac)) {
      findings.push({
        id: `MISSING_AC_${r.id}`,
        severity: "high",
        area: "requirements",
        message: `${r.id} has no acceptance-criteria.md`,
      });
    }
    const trace = path.join(memDir, "02-requirements", r.id, "traceability.md");
    if (!fs.existsSync(trace)) {
      findings.push({
        id: `MISSING_TRACE_${r.id}`,
        severity: "medium",
        area: "requirements",
        message: `${r.id} has no traceability.md`,
      });
    }
    if (r.status === "Done" && r.evaluation?.firstTryPass === undefined) {
      findings.push({
        id: `DONE_NO_EVAL_${r.id}`,
        severity: "medium",
        area: "evaluation",
        message: `${r.id} is Done but has no evaluation.firstTryPass record`,
      });
    }
  }

  // ADRs sanity.
  const adrDir = path.join(memDir, "06-decisions");
  let adrCount = 0;
  if (fs.existsSync(adrDir)) {
    for (const f of fs.readdirSync(adrDir)) {
      if (!/^ADR-\d{4}-.+\.md$/.test(f)) continue;
      adrCount += 1;
      const body = stripBom(fs.readFileSync(path.join(adrDir, f), "utf8"));
      if (!/Status:\s*\S+/i.test(body)) {
        findings.push({
          id: `ADR_NO_STATUS_${f}`,
          severity: "low",
          area: "adr",
          message: `${f} has no Status: line`,
        });
      }
    }
  } else {
    findings.push({
      id: "ADR_DIR_MISSING",
      severity: "medium",
      area: "adr",
      message: "06-decisions/ folder missing",
    });
  }

  // Known issues — open count.
  let knownIssuesOpen = 0;
  const kiPath = path.join(memDir, "known-issues.md");
  if (fs.existsSync(kiPath)) {
    const body = stripBom(fs.readFileSync(kiPath, "utf8"));
    const sections = body.split(/^## /m).slice(1);
    for (const s of sections) {
      const head = s.split("\n", 1)[0] ?? "";
      if (/^KI-\d{4}/.test(head) && !/RESOLVED/i.test(head))
        knownIssuesOpen += 1;
    }
  }

  // Memory hygiene.
  for (const f of [
    "00-project-context.md",
    "01-architecture.md",
    "07-quality-gates.md",
    "08-progress-index.md",
    "index.json",
    "index.rules.md",
  ]) {
    if (!fs.existsSync(path.join(memDir, f))) {
      findings.push({
        id: `MEMORY_MISSING_${f}`,
        severity: "high",
        area: "memory",
        message: `docs/agent-memory/${f} is missing`,
      });
    }
  }

  // AHC overlays presence (warn-only).
  for (const dir of [
    "13-architecture-patterns",
    "14-threat-models",
    "15-ai-evals",
    "16-observability",
    "17-release",
  ]) {
    if (!fs.existsSync(path.join(memDir, dir))) {
      findings.push({
        id: `AHC_OVERLAY_${dir}`,
        severity: "low",
        area: "ahc",
        message: `${dir}/ overlay not present`,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      requirements: items.length,
      adrs: adrCount,
      knownIssuesOpen,
      findings: findings.length,
    },
    findings,
  };
}

/**
 * Apply non-destructive fixes for high-confidence findings:
 * - Create skeleton acceptance-criteria.md / traceability.md for any requirement that is missing them.
 * - Create empty 06-decisions/ if absent.
 * Never overwrites existing files.
 */
export function applyAuditFixes(memDir: string): string[] {
  const created: string[] = [];
  const idx = safeJson<IndexShape>(path.join(memDir, "index.json"), {});
  const items = idx.requirements?.items ?? [];
  for (const r of items) {
    const reqDir = path.join(memDir, "02-requirements", r.id);
    if (!fs.existsSync(reqDir)) continue;
    const ac = path.join(reqDir, "acceptance-criteria.md");
    if (!fs.existsSync(ac)) {
      fs.writeFileSync(
        ac,
        [
          `# Acceptance Criteria — ${r.id}`,
          "",
          "> Auto-generated skeleton. Replace placeholders with verifiable criteria before marking the requirement Implemented.",
          "",
          "## Functional",
          "",
          "- [ ] _criterion 1_",
          "- [ ] _criterion 2_",
          "",
          "## Nonfunctional",
          "",
          "- [ ] _performance / security / reliability target_",
          "",
          "## Out-of-scope",
          "",
          "- _list excluded behaviors_",
          "",
        ].join("\n"),
        "utf8",
      );
      created.push(path.relative(memDir, ac));
    }
    const trace = path.join(reqDir, "traceability.md");
    if (!fs.existsSync(trace)) {
      fs.writeFileSync(
        trace,
        [
          `# Traceability — ${r.id}`,
          "",
          "> Auto-generated skeleton. Maintain links from criteria to code, tests, and ADRs.",
          "",
          "| Criterion | Code | Test | ADR |",
          "| --------- | ---- | ---- | --- |",
          "| _criterion 1_ | _path_ | _path_ | _ADR-####_ |",
          "",
        ].join("\n"),
        "utf8",
      );
      created.push(path.relative(memDir, trace));
    }
  }
  const adrDir = path.join(memDir, "06-decisions");
  if (!fs.existsSync(adrDir)) {
    fs.mkdirSync(adrDir, { recursive: true });
    const readme = path.join(adrDir, "README.md");
    if (!fs.existsSync(readme)) {
      fs.writeFileSync(
        readme,
        "# Architectural Decision Records\n\nIndex of ADRs.\n",
        "utf8",
      );
      created.push(path.relative(memDir, readme));
    }
  }
  return created;
}

export async function cmdAudit(opts: AuditOptions): Promise<AuditReport> {
  const memDir = path.join(path.resolve(opts.cwd), "docs", "agent-memory");
  if (opts.fix) {
    const fixed = applyAuditFixes(memDir);
    if (fixed.length > 0) {
      ok(`Self-heal created ${fixed.length} skeleton file(s)`);
      appendEvent(opts.cwd, {
        type: "audit-fix",
        payload: { count: fixed.length, files: fixed },
      });
    } else info("Self-heal had nothing to fix");
  }
  const report = computeAuditReport(memDir);

  if (opts.json) {
    process.stdout.write(JSON.stringify(report) + "\n");
    return report;
  }

  const stamp = report.generatedAt.slice(0, 10);
  const outDir = path.join(memDir, "09-audits");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = opts.out
    ? path.resolve(opts.cwd, opts.out)
    : path.join(outDir, `${stamp}__audit.md`);

  const sevOrder: Record<Finding["severity"], number> = {
    high: 0,
    medium: 1,
    low: 2,
    info: 3,
  };
  const sorted = [...report.findings].sort(
    (a, b) => sevOrder[a.severity] - sevOrder[b.severity],
  );
  const lines: string[] = [
    `# Audit — ${stamp}`,
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Totals",
    "",
    `- Requirements: ${report.totals.requirements}`,
    `- ADRs: ${report.totals.adrs}`,
    `- Known issues (open): ${report.totals.knownIssuesOpen}`,
    `- Findings: ${report.totals.findings}`,
    "",
    "## Findings",
    "",
    "| Severity | Area | ID | Message |",
    "| -------- | ---- | -- | ------- |",
  ];
  for (const f of sorted) {
    lines.push(`| ${f.severity} | ${f.area} | ${f.id} | ${f.message} |`);
  }
  if (sorted.length === 0) lines.push("| info | memory | NONE | clean |");
  lines.push("");
  fs.writeFileSync(outFile, lines.join("\n"), "utf8");

  ok(`Wrote ${path.relative(opts.cwd, outFile)}`);
  info(
    `requirements=${report.totals.requirements}  adrs=${report.totals.adrs}  KIs=${report.totals.knownIssuesOpen}  findings=${report.totals.findings}`,
  );
  if (report.totals.findings > 0) {
    warn(`Highest severity: ${sorted[0]!.severity} (${sorted[0]!.id})`);
  }
  return report;
}
