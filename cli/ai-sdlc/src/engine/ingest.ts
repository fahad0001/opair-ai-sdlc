import fs from "node:fs";
import path from "node:path";
import {
  readMemoryIndex,
  writeMemoryIndex,
  nextRequirementId,
} from "./memory.js";
import { sha256OfString } from "./hashes.js";
import type { Severity } from "../types.js";

/**
 * Ingest adapters — convert external requirement sources into normalized
 * R-XXXX entries. Adapters are deterministic transforms; they do NOT
 * call LLMs (Anti-Hallucination Charter pillar 3). Dedup is based on a
 * sha256 of the canonicalized title+description.
 *
 * Built-in adapters: markdown-prd, csv, notion, asana, clickup, jira, linear, github-issues, plain-text.
 * Each implements `parse(input) → NormalizedRequirement[]`.
 */

export interface NormalizedRequirement {
  title: string;
  description?: string;
  severity?: Severity;
  source: string;
  externalId?: string;
  tags?: string[];
}

export interface IngestAdapter {
  name: string;
  detect(input: string): boolean;
  parse(input: string): NormalizedRequirement[];
}

/* --- markdown-prd: a Markdown file with H2 sections per requirement --- */
const markdownPrd: IngestAdapter = {
  name: "markdown-prd",
  detect: (s) => /^#\s+/m.test(s) && /^##\s+/m.test(s),
  parse(s) {
    const out: NormalizedRequirement[] = [];
    const sections = s.split(/^##\s+/m).slice(1);
    for (const sec of sections) {
      const [titleLine, ...rest] = sec.split(/\r?\n/);
      const title = (titleLine ?? "").trim();
      if (!title) continue;
      const description = rest.join("\n").trim();
      out.push({ title, description, source: "markdown-prd" });
    }
    return out;
  },
};

/* --- csv: title,description[,severity[,externalId]] (RFC 4180-ish) --- */
const splitCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else cur += c;
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
};

const csvAdapter: IngestAdapter = {
  name: "csv",
  detect: (s) => /(^|\n)title\s*,/i.test(s.split(/\r?\n/)[0] ?? ""),
  parse(s) {
    const lines = s.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const out: NormalizedRequirement[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitCsvLine(lines[i]!);
      const title = (cells[idx("title")] ?? "").trim();
      if (!title) continue;
      const description = (cells[idx("description")] ?? "").trim() || undefined;
      const severityRaw = (cells[idx("severity")] ?? "").trim().toLowerCase();
      const severity = (
        ["info", "low", "medium", "high", "critical"] as Severity[]
      ).includes(severityRaw as Severity)
        ? (severityRaw as Severity)
        : undefined;
      const externalId =
        (cells[idx("externalid")] ?? cells[idx("id")] ?? "").trim() ||
        undefined;
      out.push({
        title,
        ...(description ? { description } : {}),
        ...(severity ? { severity } : {}),
        source: "csv",
        ...(externalId ? { externalId } : {}),
      });
    }
    return out;
  },
};

/* --- github-issues: JSON array from `gh issue list --json` --- */
const githubIssues: IngestAdapter = {
  name: "github-issues",
  detect: (s) =>
    /^\s*\[/.test(s) && /"number"\s*:/.test(s) && !/"fields"\s*:/.test(s),
  parse(s) {
    const arr = JSON.parse(s) as Array<Record<string, unknown>>;
    return arr.map((it) => ({
      title: String(it.title ?? "untitled"),
      description: typeof it.body === "string" ? it.body : undefined,
      source: "github-issues",
      externalId: typeof it.number === "number" ? `#${it.number}` : undefined,
      tags: Array.isArray(it.labels)
        ? (it.labels as Array<{ name?: string } | string>)
            .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
            .filter(Boolean)
        : undefined,
    }));
  },
};

/* --- jira: JSON from Jira REST search ({ issues: [...] }) or array of issues --- */
const jiraIssues: IngestAdapter = {
  name: "jira",
  detect: (s) =>
    (/"fields"\s*:/.test(s) && /"summary"\s*:/.test(s)) ||
    /"key"\s*:\s*"[A-Z][A-Z0-9_]+-\d+"/.test(s),
  parse(s) {
    const root = JSON.parse(s) as unknown;
    const arr: Array<Record<string, unknown>> = Array.isArray(root)
      ? (root as Array<Record<string, unknown>>)
      : Array.isArray((root as { issues?: unknown }).issues)
        ? (root as { issues: Array<Record<string, unknown>> }).issues
        : [];
    return arr.map((it) => {
      const fields = (it.fields ?? {}) as Record<string, unknown>;
      const summary = String(fields.summary ?? it.summary ?? "untitled");
      const description =
        typeof fields.description === "string"
          ? (fields.description as string)
          : typeof it.description === "string"
            ? (it.description as string)
            : undefined;
      const labels = Array.isArray(fields.labels)
        ? (fields.labels as unknown[]).map((l) => String(l)).filter(Boolean)
        : undefined;
      const key = typeof it.key === "string" ? (it.key as string) : undefined;
      return {
        title: summary,
        description,
        source: "jira",
        ...(key ? { externalId: key } : {}),
        ...(labels ? { tags: labels } : {}),
      };
    });
  },
};

/* --- linear: GraphQL export ({ data: { issues: { nodes: [...] } } } or { nodes: [...] } or array) --- */
const linearIssues: IngestAdapter = {
  name: "linear",
  detect: (s) =>
    /"identifier"\s*:\s*"[A-Z]+-\d+"/.test(s) ||
    (/"nodes"\s*:\s*\[/.test(s) &&
      /"title"\s*:/.test(s) &&
      /"identifier"/.test(s)),
  parse(s) {
    const root = JSON.parse(s) as
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
    let arr: Array<Record<string, unknown>> = [];
    if (Array.isArray(root)) {
      arr = root;
    } else if (Array.isArray((root as { nodes?: unknown }).nodes)) {
      arr = (root as { nodes: Array<Record<string, unknown>> }).nodes;
    } else {
      const data = (root as { data?: { issues?: { nodes?: unknown } } }).data;
      const nodes = data?.issues?.nodes;
      if (Array.isArray(nodes)) arr = nodes as Array<Record<string, unknown>>;
    }
    return arr.map((it) => {
      const labelsRoot = (it.labels ?? {}) as {
        nodes?: Array<{ name?: string }>;
      };
      const labels = Array.isArray(labelsRoot.nodes)
        ? labelsRoot.nodes.map((l) => l?.name ?? "").filter(Boolean)
        : undefined;
      const identifier =
        typeof it.identifier === "string"
          ? (it.identifier as string)
          : undefined;
      return {
        title: String(it.title ?? "untitled"),
        description:
          typeof it.description === "string"
            ? (it.description as string)
            : undefined,
        source: "linear",
        ...(identifier ? { externalId: identifier } : {}),
        ...(labels && labels.length ? { tags: labels } : {}),
      };
    });
  },
};

/* --- notion: database query export ({ results: [{ properties: {...} }] }) --- */
const notionAdapter: IngestAdapter = {
  name: "notion",
  detect: (s) => /"object"\s*:\s*"page"/.test(s) && /"properties"\s*:/.test(s),
  parse(s) {
    const root = JSON.parse(s) as
      | { results?: Array<Record<string, unknown>> }
      | Array<Record<string, unknown>>;
    const arr: Array<Record<string, unknown>> = Array.isArray(root)
      ? (root as Array<Record<string, unknown>>)
      : Array.isArray((root as { results?: unknown }).results)
        ? (root as { results: Array<Record<string, unknown>> }).results
        : [];
    const extractText = (prop: unknown): string | undefined => {
      if (!prop || typeof prop !== "object") return undefined;
      const p = prop as Record<string, unknown>;
      const rich = (p.title ?? p.rich_text) as
        | Array<{ plain_text?: string }>
        | undefined;
      if (Array.isArray(rich))
        return (
          rich
            .map((r) => r?.plain_text ?? "")
            .join("")
            .trim() || undefined
        );
      return undefined;
    };
    return arr.map((it) => {
      const props = (it.properties ?? {}) as Record<string, unknown>;
      // Title is whichever property has type "title"; pick the first text-bearing prop named "Name"/"Title" else fallback.
      let title: string | undefined;
      for (const key of ["Name", "Title", "name", "title"]) {
        const t = extractText(props[key]);
        if (t) {
          title = t;
          break;
        }
      }
      if (!title) {
        for (const v of Object.values(props)) {
          const t = extractText(v);
          if (t) {
            title = t;
            break;
          }
        }
      }
      // Multi-select tags from any property typed multi_select.
      const tags: string[] = [];
      for (const v of Object.values(props)) {
        const ms = (v as { multi_select?: Array<{ name?: string }> })
          .multi_select;
        if (Array.isArray(ms))
          for (const opt of ms) if (opt?.name) tags.push(opt.name);
      }
      const id = typeof it.id === "string" ? (it.id as string) : undefined;
      return {
        title: title ?? "untitled",
        source: "notion",
        ...(id ? { externalId: id } : {}),
        ...(tags.length ? { tags } : {}),
      };
    });
  },
};

/* --- asana: tasks export ({ data: [...] } or array) --- */
const asanaAdapter: IngestAdapter = {
  name: "asana",
  detect: (s) =>
    /"resource_type"\s*:\s*"task"/.test(s) ||
    (/"data"\s*:\s*\[/.test(s) &&
      /"gid"\s*:/.test(s) &&
      /"name"\s*:/.test(s) &&
      /"notes"\s*:/.test(s)),
  parse(s) {
    const root = JSON.parse(s) as unknown;
    const arr: Array<Record<string, unknown>> = Array.isArray(root)
      ? (root as Array<Record<string, unknown>>)
      : Array.isArray((root as { data?: unknown }).data)
        ? (root as { data: Array<Record<string, unknown>> }).data
        : [];
    return arr.map((it) => {
      const tagsArr = Array.isArray(it.tags)
        ? (it.tags as Array<{ name?: string } | string>)
            .map((t) => (typeof t === "string" ? t : (t.name ?? "")))
            .filter(Boolean)
        : [];
      const gid = typeof it.gid === "string" ? (it.gid as string) : undefined;
      return {
        title: String(it.name ?? "untitled"),
        description:
          typeof it.notes === "string" ? (it.notes as string) : undefined,
        source: "asana",
        ...(gid ? { externalId: gid } : {}),
        ...(tagsArr.length ? { tags: tagsArr } : {}),
      };
    });
  },
};

/* --- clickup: tasks export ({ tasks: [...] } or array) --- */
const clickupAdapter: IngestAdapter = {
  name: "clickup",
  detect: (s) =>
    (/"tasks"\s*:\s*\[/.test(s) && /"custom_id"\s*:/.test(s)) ||
    (/"id"\s*:\s*"[a-z0-9]{6,}"/.test(s) && /"text_content"\s*:/.test(s)),
  parse(s) {
    const root = JSON.parse(s) as unknown;
    const arr: Array<Record<string, unknown>> = Array.isArray(root)
      ? (root as Array<Record<string, unknown>>)
      : Array.isArray((root as { tasks?: unknown }).tasks)
        ? (root as { tasks: Array<Record<string, unknown>> }).tasks
        : [];
    return arr.map((it) => {
      const tagsArr = Array.isArray(it.tags)
        ? (it.tags as Array<{ name?: string } | string>)
            .map((t) => (typeof t === "string" ? t : (t.name ?? "")))
            .filter(Boolean)
        : [];
      const id =
        typeof it.custom_id === "string" && it.custom_id
          ? (it.custom_id as string)
          : typeof it.id === "string"
            ? (it.id as string)
            : undefined;
      const desc =
        typeof it.text_content === "string"
          ? (it.text_content as string)
          : typeof it.description === "string"
            ? (it.description as string)
            : undefined;
      return {
        title: String(it.name ?? "untitled"),
        description: desc,
        source: "clickup",
        ...(id ? { externalId: id } : {}),
        ...(tagsArr.length ? { tags: tagsArr } : {}),
      };
    });
  },
};

/* --- plain-text: one requirement per line --- */
const plainText: IngestAdapter = {
  name: "plain-text",
  detect: () => true, // fallback
  parse(s) {
    return s
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
      .filter(Boolean)
      .map((title) => ({ title, source: "plain-text" }));
  },
};

const ADAPTERS: IngestAdapter[] = [
  markdownPrd,
  csvAdapter,
  notionAdapter,
  asanaAdapter,
  clickupAdapter,
  jiraIssues,
  linearIssues,
  githubIssues,
  plainText,
];

export const detectAdapter = (input: string): IngestAdapter => {
  for (const a of ADAPTERS) if (a.detect(input)) return a;
  return plainText;
};

export const getAdapter = (name: string): IngestAdapter | undefined =>
  ADAPTERS.find((a) => a.name === name);

export interface IngestReport {
  imported: string[];
  duplicates: string[];
  source: string;
  adapter: string;
}

export const ingestFile = (
  cwd: string,
  filePath: string,
  adapterName?: string,
): IngestReport => {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const adapter = adapterName
    ? (getAdapter(adapterName) ?? detectAdapter(raw))
    : detectAdapter(raw);
  const items = adapter.parse(raw);

  const idx = readMemoryIndex(cwd);
  const seen = new Set(
    idx.requirements.items.map((r) =>
      sha256OfString(r.title.trim().toLowerCase()),
    ),
  );
  const imported: string[] = [];
  const duplicates: string[] = [];
  for (const it of items) {
    const fp = sha256OfString(it.title.trim().toLowerCase());
    if (seen.has(fp)) {
      duplicates.push(it.title);
      continue;
    }
    const id = nextRequirementId(idx);
    const folder = path.join(cwd, "docs/agent-memory/02-requirements", id);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(
      path.join(folder, "requirement.md"),
      [
        `# ${id} — ${it.title}`,
        "",
        `_Imported via \`${adapter.name}\` from \`${path.basename(filePath)}\`._`,
        ...(it.externalId ? [`> External Ref: **${it.externalId}**`] : []),
        ...(it.tags && it.tags.length > 0
          ? [`> Tags: ${it.tags.map((t) => `\`${t}\``).join(", ")}`]
          : []),
        "",
        it.description ?? "_No description supplied._",
        "",
      ].join("\n"),
      "utf8",
    );
    idx.requirements.items.push({
      id,
      title: it.title,
      status: "Draft",
      artifacts: [],
      tags: it.tags ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    imported.push(id);
    seen.add(fp);
  }
  writeMemoryIndex(cwd, idx);
  return { imported, duplicates, source: filePath, adapter: adapter.name };
};
