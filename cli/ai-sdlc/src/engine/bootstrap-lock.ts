import fs from "node:fs";
import path from "node:path";

/**
 * bootstrap.lock — Definition-of-Ready gate.
 *
 * The CLI emits this lock file on `create` / `adopt` listing the
 * "agent-owned" questions that need answering before R-0001 can be
 * created (personas, KPIs, NFRs, threat surface, eval baselines for
 * AI projects). The Init agent must refuse to create R-0001 while
 * this lock exists with unanswered items.
 *
 * Override: user runs `ai-sdlc unlock-bootstrap --force` (logged +
 * ADR required per the Charter §6).
 */

export interface BootstrapItem {
  id: string;
  prompt: string;
  area:
    | "personas"
    | "kpis"
    | "nfr"
    | "threat-surface"
    | "data-inventory"
    | "ai-evals"
    | "compliance-scope"
    | "architecture-diagrams"
    | "risk-register";
  required: boolean;
  answered: boolean;
  evidencePath?: string;
}

export interface BootstrapLock {
  schemaVersion: "1.0";
  createdAt: string;
  unlocked: boolean;
  unlockedAt?: string;
  unlockReason?: string;
  items: BootstrapItem[];
}

const lockRel = ".ai-sdlc/bootstrap.lock";

export const lockPath = (root: string) => path.join(root, lockRel);

export const defaultLock = (kind: string): BootstrapLock => {
  const items: BootstrapItem[] = [
    {
      id: "personas",
      prompt: "Define personas and target users with goals and frustrations.",
      area: "personas",
      required: true,
      answered: false,
    },
    {
      id: "kpis",
      prompt:
        "Define success metrics and business goals with measurable targets.",
      area: "kpis",
      required: true,
      answered: false,
    },
    {
      id: "nfr",
      prompt:
        "Define non-functional budgets (perf, a11y, i18n, cost, availability).",
      area: "nfr",
      required: true,
      answered: false,
    },
    {
      id: "threat-surface",
      prompt: "Map threat surface, data inventory, and PII flows.",
      area: "threat-surface",
      required: true,
      answered: false,
    },
    {
      id: "compliance-scope",
      prompt:
        "Identify which subsystems and data flows are in-scope per active compliance frameworks.",
      area: "compliance-scope",
      required: true,
      answered: false,
    },
    {
      id: "risk-register",
      prompt: "Seed the initial risk register with at least 3 risks.",
      area: "risk-register",
      required: true,
      answered: false,
    },
  ];
  if (kind === "ai") {
    items.push({
      id: "ai-evals",
      prompt:
        "Define AI eval baselines + golden set + jailbreak/red-team checklist.",
      area: "ai-evals",
      required: true,
      answered: false,
    });
  }
  return {
    schemaVersion: "1.0",
    createdAt: new Date().toISOString(),
    unlocked: false,
    items,
  };
};

export const writeLock = (root: string, lock: BootstrapLock) => {
  fs.mkdirSync(path.dirname(lockPath(root)), { recursive: true });
  fs.writeFileSync(
    lockPath(root),
    JSON.stringify(lock, null, 2) + "\n",
    "utf8",
  );
};

export const readLock = (root: string): BootstrapLock | undefined => {
  const p = lockPath(root);
  if (!fs.existsSync(p)) return undefined;
  return JSON.parse(
    fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""),
  ) as BootstrapLock;
};

export const isReady = (root: string): boolean => {
  const lk = readLock(root);
  if (!lk) return true; // no lock = ready
  if (lk.unlocked) return true;
  return lk.items.filter((i) => i.required).every((i) => i.answered);
};

export const unlock = (root: string, reason: string) => {
  const lk = readLock(root);
  if (!lk) return;
  lk.unlocked = true;
  lk.unlockedAt = new Date().toISOString();
  lk.unlockReason = reason;
  writeLock(root, lk);
};
