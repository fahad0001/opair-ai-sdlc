import fs from "node:fs";
import path from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface PmDetection {
  pm: PackageManager;
  reason: string;
}

const exists = (p: string): boolean => fs.existsSync(p);

/**
 * Detect the package manager preferred by a project root.
 * Order: lockfile → packageManager field → user agent env → npm fallback.
 */
export const detectPm = (root: string): PmDetection => {
  if (
    exists(path.join(root, "bun.lockb")) ||
    exists(path.join(root, "bun.lock"))
  ) {
    return { pm: "bun", reason: "bun.lockb/bun.lock present" };
  }
  if (exists(path.join(root, "pnpm-lock.yaml"))) {
    return { pm: "pnpm", reason: "pnpm-lock.yaml present" };
  }
  if (exists(path.join(root, "yarn.lock"))) {
    return { pm: "yarn", reason: "yarn.lock present" };
  }
  if (exists(path.join(root, "package-lock.json"))) {
    return { pm: "npm", reason: "package-lock.json present" };
  }
  const pkgPath = path.join(root, "package.json");
  if (exists(pkgPath)) {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(pkgPath, "utf8").replace(/^\uFEFF/, ""),
      ) as {
        packageManager?: string;
      };
      if (pkg.packageManager) {
        const name = pkg.packageManager.split("@")[0] as PackageManager;
        if (["npm", "pnpm", "yarn", "bun"].includes(name)) {
          return {
            pm: name,
            reason: `package.json#packageManager=${pkg.packageManager}`,
          };
        }
      }
    } catch {
      /* ignore */
    }
  }
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm"))
    return { pm: "pnpm", reason: "npm_config_user_agent=pnpm" };
  if (ua.startsWith("yarn"))
    return { pm: "yarn", reason: "npm_config_user_agent=yarn" };
  if (ua.startsWith("bun"))
    return { pm: "bun", reason: "npm_config_user_agent=bun" };
  return { pm: "npm", reason: "default" };
};

export const installCmd = (pm: PackageManager): string => {
  switch (pm) {
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn install";
    case "bun":
      return "bun install";
    default:
      return "npm install";
  }
};

export const ciInstallCmd = (pm: PackageManager): string => {
  switch (pm) {
    case "pnpm":
      return "pnpm install --frozen-lockfile";
    case "yarn":
      return "yarn install --immutable";
    case "bun":
      return "bun install --frozen-lockfile";
    default:
      return "npm ci --no-audit --no-fund";
  }
};

export const runScriptCmd = (pm: PackageManager, script: string): string => {
  switch (pm) {
    case "pnpm":
      return `pnpm run ${script}`;
    case "yarn":
      return `yarn ${script}`;
    case "bun":
      return `bun run ${script}`;
    default:
      return `npm run ${script}`;
  }
};
