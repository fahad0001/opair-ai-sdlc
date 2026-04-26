import fs from "node:fs";
import path from "node:path";
import { ok, info, fail } from "../util/log.js";

export interface AdrNewOptions {
  cwd: string;
  title: string;
  status?: "Proposed" | "Accepted" | "Deprecated" | "Superseded";
  requirement?: string;
  json?: boolean;
}

const stripBom = (s: string): string => s.replace(/^\uFEFF/, "");

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "adr";

const nextNumber = (dir: string): number => {
  if (!fs.existsSync(dir)) return 1;
  const nums = fs
    .readdirSync(dir)
    .map((f) => f.match(/^ADR-(\d{4})-/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => parseInt(m[1]!, 10));
  return (nums.length ? Math.max(...nums) : 0) + 1;
};

export async function cmdAdrNew(opts: AdrNewOptions): Promise<string> {
  const root = path.resolve(opts.cwd);
  const dir = path.join(root, "docs", "agent-memory", "06-decisions");
  if (!fs.existsSync(dir)) {
    fail(`No 06-decisions/ directory at ${dir}. Run 'ai-sdlc repair' first.`);
    throw new Error("missing-decisions-dir");
  }

  const num = nextNumber(dir).toString().padStart(4, "0");
  const slug = slugify(opts.title);
  const file = path.join(dir, `ADR-${num}-${slug}.md`);

  if (fs.existsSync(file)) {
    fail(`ADR already exists: ${file}`);
    throw new Error("adr-exists");
  }

  const tmplPath = path.join(dir, "ADR-template.md");
  let template = "";
  if (fs.existsSync(tmplPath)) {
    template = stripBom(fs.readFileSync(tmplPath, "utf8"));
  }

  const date = new Date().toISOString().slice(0, 10);
  const status = opts.status ?? "Proposed";
  const reqLine = opts.requirement
    ? `- Linked requirement: ${opts.requirement}`
    : "- Linked requirement: R-XXXX";

  let body: string;
  if (template) {
    body = template
      .replace(/^# .*$/m, `# ADR-${num}: ${opts.title}`)
      .replace(/Status:\s*.*/i, `Status: ${status}`)
      .replace(/Date:\s*.*/i, `Date: ${date}`);
    // Template variant: "## Status\n\n- Proposed | Accepted | ..."
    body = body.replace(
      /(##\s+Status\s*\n+)-\s*Proposed[^\n]*/i,
      `$1- Status: ${status}`,
    );
    body = body.replace(/(##\s+Date\s*\n+)-\s*YYYY-MM-DD/i, `$1- ${date}`);
    if (!/Linked requirement/i.test(body)) {
      body += `\n\n## Traceability\n${reqLine}\n`;
    }
  } else {
    body = [
      `# ADR-${num}: ${opts.title}`,
      "",
      `- Status: ${status}`,
      `- Date: ${date}`,
      reqLine,
      "",
      "## Context",
      "<!-- What is the issue we're seeing that motivates this decision? -->",
      "",
      "## Decision",
      "<!-- What is the change we're proposing/doing? -->",
      "",
      "## Consequences",
      "<!-- What becomes easier or harder because of this change? -->",
      "",
    ].join("\n");
  }

  fs.writeFileSync(file, body, "utf8");

  if (opts.json) {
    process.stdout.write(
      JSON.stringify({ file, number: num, status }, null, 2) + "\n",
    );
  } else {
    ok(`Created ADR-${num}: ${opts.title}`);
    info(file);
  }
  return file;
}
