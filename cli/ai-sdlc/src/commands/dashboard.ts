import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { info, ok, fail } from "../util/log.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DashboardOptions {
  cwd: string;
  open?: boolean;
  serve?: boolean;
  port?: number;
  host?: string;
}

function resolveTemplate(): string | null {
  const candidates = [
    path.resolve(
      __dirname,
      "..",
      "..",
      "templates",
      "framework",
      "docs",
      "agent-memory",
      "dashboard.html",
    ),
    path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "templates",
      "framework",
      "docs",
      "agent-memory",
      "dashboard.html",
    ),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

export async function cmdDashboard(opts: DashboardOptions): Promise<void> {
  const root = path.resolve(opts.cwd);
  const memDir = path.join(root, "docs", "agent-memory");
  if (!fs.existsSync(path.join(memDir, "index.json"))) {
    fail(
      `No docs/agent-memory/index.json at ${root}. Run 'ai-sdlc init' first.`,
    );
    return;
  }
  const src = resolveTemplate();
  if (!src) {
    fail(`Could not locate dashboard.html template`);
    return;
  }
  const dst = path.join(memDir, "dashboard.html");
  fs.copyFileSync(src, dst);
  ok(`Wrote ${path.relative(root, dst)}`);

  if (!opts.serve) {
    info(
      `Open it directly in a browser, or pass --serve to start a local server.`,
    );
    info(`File URL: file:///${dst.replace(/\\/g, "/")}`);
    return;
  }

  const port = opts.port ?? 4126;
  const host = opts.host ?? "127.0.0.1";

  const server = http.createServer((req, res) => {
    try {
      const reqUrl = req.url ?? "/";
      // Strict path containment: resolve and ensure result is under memDir.
      const rel =
        decodeURIComponent(reqUrl.split("?")[0]!.replace(/^\/+/, "")) ||
        "dashboard.html";
      const full = path.resolve(memDir, rel);
      if (!full.startsWith(memDir + path.sep) && full !== memDir) {
        res.writeHead(403).end("forbidden");
        return;
      }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
        res.writeHead(404).end("not found");
        return;
      }
      const ext = path.extname(full).toLowerCase();
      const type = MIME[ext] ?? "application/octet-stream";
      res.writeHead(200, {
        "content-type": type,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      fs.createReadStream(full).pipe(res);
    } catch (err) {
      res.writeHead(500).end((err as Error).message);
    }
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  ok(
    `Serving ${path.relative(root, memDir)} at http://${host}:${port}/dashboard.html`,
  );
  info(`Press Ctrl+C to stop.`);
}
