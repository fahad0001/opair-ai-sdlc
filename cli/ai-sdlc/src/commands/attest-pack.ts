import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ok, log } from "../util/log.js";

/**
 * `ai-sdlc attest-pack` — produces a sidecar HMAC-SHA256 attestation
 * for a JSONL context-pack so downstream consumers can detect tampering
 * even when transport-level signing (cosign/gh attestation) isn't
 * available.
 *
 * The key is read from one of (in priority order):
 *   1. `--key-file <path>` — raw bytes of the HMAC key
 *   2. `--key-env <NAME>` — env var holds the key (utf8/base64 auto-detected)
 *   3. `AGENT_MEM_ATTEST_KEY` env var (default fallback)
 *
 * Output sidecar shape (`<pack>.attest.json`):
 *   {
 *     "version": 1,
 *     "alg": "HMAC-SHA256",
 *     "pack": "<basename>",
 *     "packSha256": "<hex>",
 *     "packBytes": <int>,
 *     "signedAt": "<iso>",
 *     "keyId": "<sha256-prefix>",
 *     "signature": "<hex>"
 *   }
 *
 * `keyId` is the first 16 hex chars of `sha256(key)` so consumers can tell
 * which key signed without leaking the key itself. The signature itself is
 * `HMAC-SHA256(key, packBytes)` — i.e., over the raw file content.
 */
export interface AttestPackOptions {
  cwd: string;
  pack: string;
  out?: string;
  keyFile?: string;
  keyEnv?: string;
  json?: boolean;
}

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");

export const loadKey = (opts: {
  cwd: string;
  keyFile?: string;
  keyEnv?: string;
}): { key: Buffer; source: string } => {
  if (opts.keyFile) {
    const p = path.resolve(opts.cwd, opts.keyFile);
    if (!fs.existsSync(p))
      throw new Error(`--key-file not found: ${opts.keyFile}`);
    return { key: fs.readFileSync(p), source: `file:${opts.keyFile}` };
  }
  const envName = opts.keyEnv ?? "AGENT_MEM_ATTEST_KEY";
  const raw = process.env[envName];
  if (!raw || raw.length === 0) {
    throw new Error(
      `No HMAC key available (env ${envName} unset and no --key-file).`,
    );
  }
  // Accept either base64 (when it parses cleanly + is reasonable length) or raw utf8.
  const looksB64 =
    /^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0 && raw.length >= 16;
  const key = looksB64 ? Buffer.from(raw, "base64") : Buffer.from(raw, "utf8");
  if (key.length === 0)
    throw new Error(`Decoded key from env ${envName} is empty.`);
  return { key, source: `env:${envName}` };
};

const hex = (buf: Buffer | string) =>
  (typeof buf === "string" ? Buffer.from(buf, "utf8") : buf).toString("hex");

export interface Attestation {
  version: 1;
  alg: "HMAC-SHA256";
  pack: string;
  packSha256: string;
  packBytes: number;
  signedAt: string;
  keyId: string;
  signature: string;
}

export async function cmdAttestPack(
  opts: AttestPackOptions,
): Promise<Attestation> {
  const root = path.resolve(opts.cwd);
  const packPath = path.resolve(root, opts.pack);
  if (!fs.existsSync(packPath) || !fs.statSync(packPath).isFile()) {
    log.err(`Pack not found: ${opts.pack}`);
    throw new Error("pack-missing");
  }
  const { key, source } = loadKey(opts);
  const bytes = fs.readFileSync(packPath);
  const packSha = crypto.createHash("sha256").update(bytes).digest("hex");
  const sig = crypto.createHmac("sha256", key).update(bytes).digest("hex");
  const keyId = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex")
    .slice(0, 16);
  const att: Attestation = {
    version: 1,
    alg: "HMAC-SHA256",
    pack: path.basename(packPath),
    packSha256: packSha,
    packBytes: bytes.length,
    signedAt: new Date().toISOString(),
    keyId,
    signature: sig,
  };
  const outPath = opts.out
    ? path.resolve(root, opts.out)
    : packPath + ".attest.json";
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(att, null, 2) + "\n", "utf8");
  if (opts.json) {
    process.stdout.write(JSON.stringify(att, null, 2) + "\n");
  } else {
    ok(
      `Attested ${path.relative(root, packPath)} → ${path.relative(root, outPath)} (key=${source}, keyId=${keyId})`,
    );
  }
  return att;
}

export interface VerifyAttestOptions {
  cwd: string;
  pack: string;
  attest?: string;
  keyFile?: string;
  keyEnv?: string;
  json?: boolean;
}

export interface VerifyResult {
  ok: boolean;
  pack: string;
  attest: string;
  reasons: string[];
  expectedKeyId?: string;
  actualKeyId?: string;
}

export async function cmdVerifyAttest(
  opts: VerifyAttestOptions,
): Promise<VerifyResult> {
  const root = path.resolve(opts.cwd);
  const packPath = path.resolve(root, opts.pack);
  const attestPath = opts.attest
    ? path.resolve(root, opts.attest)
    : packPath + ".attest.json";
  const result: VerifyResult = {
    ok: false,
    pack: path.relative(root, packPath),
    attest: path.relative(root, attestPath),
    reasons: [],
  };
  if (!fs.existsSync(packPath)) {
    result.reasons.push("pack-missing");
  }
  if (!fs.existsSync(attestPath)) {
    result.reasons.push("attest-missing");
  }
  if (result.reasons.length > 0) {
    return finalize(result, opts);
  }
  let att: Attestation;
  try {
    att = JSON.parse(
      stripBom(fs.readFileSync(attestPath, "utf8")),
    ) as Attestation;
  } catch {
    result.reasons.push("attest-malformed");
    return finalize(result, opts);
  }
  if (att.alg !== "HMAC-SHA256" || att.version !== 1) {
    result.reasons.push("unsupported-alg-or-version");
    return finalize(result, opts);
  }
  const bytes = fs.readFileSync(packPath);
  const actualSha = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualSha !== att.packSha256) result.reasons.push("pack-sha-mismatch");
  if (bytes.length !== att.packBytes)
    result.reasons.push("pack-bytes-mismatch");
  let key: Buffer;
  try {
    key = loadKey(opts).key;
  } catch (e) {
    result.reasons.push(`key-load-failed:${(e as Error).message}`);
    return finalize(result, opts);
  }
  const actualKeyId = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex")
    .slice(0, 16);
  result.expectedKeyId = att.keyId;
  result.actualKeyId = actualKeyId;
  if (actualKeyId !== att.keyId) result.reasons.push("key-id-mismatch");
  const expectedSig = crypto
    .createHmac("sha256", key)
    .update(bytes)
    .digest("hex");
  // Constant-time compare via crypto.timingSafeEqual on equal-length buffers.
  const a = Buffer.from(expectedSig, "hex");
  const b = Buffer.from(att.signature, "hex");
  const sigOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!sigOk) result.reasons.push("signature-mismatch");
  result.ok = result.reasons.length === 0;
  return finalize(result, opts);
}

const finalize = (
  result: VerifyResult,
  opts: VerifyAttestOptions,
): VerifyResult => {
  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (result.ok) {
    ok(
      `attest-ok pack=${result.pack} attest=${result.attest} keyId=${result.actualKeyId}`,
    );
  } else {
    log.err(`attest-fail pack=${result.pack}: ${result.reasons.join(", ")}`);
  }
  if (!result.ok) process.exitCode = 1;
  return result;
};

// Re-export `hex` as a tiny utility for tests that want to avoid pulling node:crypto.
export const __test = { hex };
