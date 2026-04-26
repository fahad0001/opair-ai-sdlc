import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { info, ok, fail } from "../util/log.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface McpOptions {
  cwd: string;
  print?: boolean;
  writable?: boolean;
}

/**
 * Resolve the bundled mcp-server entry point. The CLI ships sibling-package
 * `@opair/mcp-server`; in a workspace install we look upward from this
 * file. In a global install both packages are siblings under the same
 * registry namespace, so we also try `node_modules/@opair/mcp-server/`.
 */
function resolveMcpEntry(): string | null {
  const candidates = [
    // Bundled CLI: cli/ai-sdlc/dist → cli/mcp-server/dist/server.js
    path.resolve(__dirname, "..", "..", "mcp-server", "dist", "server.js"),
    // Non-bundled: cli/ai-sdlc/dist/commands → cli/mcp-server/dist/server.js
    path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "mcp-server",
      "dist",
      "server.js",
    ),
    // Source dev: cli/ai-sdlc/src/commands → cli/mcp-server/dist/server.js
    path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "mcp-server",
      "dist",
      "server.js",
    ),
    // Global install: peer @opair/mcp-server alongside @opair/ai-sdlc
    path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "@opair",
      "mcp-server",
      "dist",
      "server.js",
    ),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

export async function cmdMcp(opts: McpOptions): Promise<void> {
  const entry = resolveMcpEntry();
  if (!entry) {
    fail(
      "Could not locate the @opair/mcp-server build. Run `npm --prefix cli/mcp-server build`.",
    );
    return;
  }

  if (opts.print) {
    const args = [
      entry,
      "--cwd",
      opts.cwd,
      ...(opts.writable ? ["--writable"] : []),
    ];
    const cfg = {
      mcpServers: {
        "ai-sdlc": {
          command: process.execPath,
          args,
        },
      },
    };
    process.stdout.write(JSON.stringify(cfg, null, 2) + "\n");
    return;
  }

  ok(
    `Launching ai-sdlc MCP server (cwd=${opts.cwd}${opts.writable ? ", writable" : ", read-only"})`,
  );
  info(`Entry: ${entry}`);
  info(`Reads stdin / writes stdout as JSON-RPC. Press Ctrl+C to stop.`);

  const args = [
    entry,
    "--cwd",
    opts.cwd,
    ...(opts.writable ? ["--writable"] : []),
  ];
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
  });
  await new Promise<void>((resolve, reject) => {
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`exit ${code}`)),
    );
    child.on("error", reject);
  });
}
