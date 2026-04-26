import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ok, info, warn, fail } from "../util/log.js";

export interface ProvenanceVerifyOptions {
  cwd: string;
  artifact: string;
  repo?: string;
  json?: boolean;
}

interface VerifyResult {
  artifact: string;
  available: boolean;
  verified: boolean;
  tool: "gh" | "cosign" | null;
  raw: string;
  reason?: string;
}

const which = (cmd: string): string | null => {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], {
    encoding: "utf8",
  });
  if (r.status === 0 && r.stdout)
    return r.stdout.split(/\r?\n/)[0]?.trim() || null;
  return null;
};

export async function cmdProvenanceVerify(
  opts: ProvenanceVerifyOptions,
): Promise<void> {
  const artifact = path.resolve(opts.cwd, opts.artifact);
  const result: VerifyResult = {
    artifact: path.relative(opts.cwd, artifact),
    available: false,
    verified: false,
    tool: null,
    raw: "",
  };

  if (!fs.existsSync(artifact)) {
    result.reason = "artifact-missing";
    if (opts.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    fail(`Artifact not found: ${artifact}`);
    return;
  }

  const gh = which("gh");
  const cosign = which("cosign");
  if (!gh && !cosign) {
    result.reason = "no-verifier";
    if (opts.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    warn(
      "Neither 'gh' nor 'cosign' is installed; skipping provenance verify (non-fatal).",
    );
    return;
  }

  if (gh) {
    result.available = true;
    result.tool = "gh";
    const args = ["attestation", "verify", artifact];
    if (opts.repo) args.push("--repo", opts.repo);
    const r = spawnSync("gh", args, { encoding: "utf8" });
    result.raw = (r.stdout || "") + (r.stderr || "");
    result.verified = r.status === 0;
  } else if (cosign) {
    result.available = true;
    result.tool = "cosign";
    const r = spawnSync("cosign", ["verify-blob-attestation", artifact], {
      encoding: "utf8",
    });
    result.raw = (r.stdout || "") + (r.stderr || "");
    result.verified = r.status === 0;
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    info(
      `tool=${result.tool ?? "?"} available=${result.available} verified=${result.verified}`,
    );
    if (result.raw.trim()) info(result.raw.trim());
  }
  if (!result.verified) {
    fail(
      `Provenance verification failed for ${path.relative(opts.cwd, artifact)} (tool=${result.tool ?? "none"}).`,
    );
    return;
  }
  ok(
    `Provenance verified for ${path.relative(opts.cwd, artifact)} via ${result.tool}.`,
  );
}
