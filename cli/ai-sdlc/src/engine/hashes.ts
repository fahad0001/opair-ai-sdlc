import crypto from "node:crypto";
import fs from "node:fs";

export const sha256OfString = (s: string): string =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");

export const sha256OfFile = (p: string): string =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

export const stripBom = (s: string): string => s.replace(/^\uFEFF/, "");
