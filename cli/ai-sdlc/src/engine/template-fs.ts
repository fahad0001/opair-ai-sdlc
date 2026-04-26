import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Locate the templates directory shipped with this CLI.
 *
 * - When running from source: `cli/ai-sdlc/templates/`
 * - When running from dist:   `<package-root>/templates/`
 *
 * `import.meta.url` resolves to the executing file. The templates
 * folder is published as a sibling of `dist/` per package.json#files.
 */
export const templatesRoot = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Walk up until we find a `templates/` sibling. Bounded to 5 hops.
  let dir = here;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "templates");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`templates/ directory not found relative to ${here}`);
};

/**
 * Recursively copy a template directory into a target, never
 * overwriting existing files unless `overwrite` is true. Returns the
 * list of paths actually written (relative to target).
 *
 * Treats files containing `__name__`, `__projectName__`, or
 * `__projectKind__` placeholders in their *contents* and substitutes
 * them. Directory/file *name* placeholders use the same tokens.
 */
export interface CopyOptions {
  overwrite?: boolean;
  vars: Record<string, string>;
  /** When true, skip files whose target already exists. */
  skipExisting?: boolean;
}

const PLACEHOLDER_RE = /__([a-zA-Z0-9]+)__/g;

const subst = (s: string, vars: Record<string, string>): string =>
  s.replace(PLACEHOLDER_RE, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : `__${key}__`,
  );

export interface CopyResult {
  written: string[];
  skipped: string[];
}

export const copyTemplate = (
  source: string,
  target: string,
  opts: CopyOptions,
): CopyResult => {
  const written: string[] = [];
  const skipped: string[] = [];
  const walk = (srcDir: string, dstDir: string) => {
    fs.mkdirSync(dstDir, { recursive: true });
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const renamedName = subst(entry.name, opts.vars);
      const srcPath = path.join(srcDir, entry.name);
      const dstPath = path.join(dstDir, renamedName);
      if (entry.isDirectory()) {
        walk(srcPath, dstPath);
        continue;
      }
      if (fs.existsSync(dstPath) && opts.skipExisting && !opts.overwrite) {
        skipped.push(path.relative(target, dstPath));
        continue;
      }
      const isText = isProbablyText(srcPath);
      if (isText) {
        const content = fs.readFileSync(srcPath, "utf8");
        fs.writeFileSync(dstPath, subst(content, opts.vars), "utf8");
      } else {
        fs.copyFileSync(srcPath, dstPath);
      }
      written.push(path.relative(target, dstPath));
    }
  };
  walk(source, target);
  return { written, skipped };
};

const TEXT_EXT = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".jsonc",
  ".yml",
  ".yaml",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".py",
  ".toml",
  ".cfg",
  ".ini",
  ".env",
  ".sh",
  ".ps1",
  ".dockerfile",
  ".gitignore",
  ".editorconfig",
  ".prettierrc",
  ".html",
  ".css",
]);

const isProbablyText = (p: string): boolean => {
  const ext = path.extname(p).toLowerCase();
  if (TEXT_EXT.has(ext)) return true;
  // Files without extension that we treat as text
  const base = path.basename(p);
  if (
    [
      "Dockerfile",
      "Makefile",
      ".gitignore",
      ".dockerignore",
      ".editorconfig",
      "AGENTS.md",
      "README",
    ].includes(base)
  )
    return true;
  return false;
};
