import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { ok, info, warn, fail } from "../util/log.js";

export interface SbomCheckOptions {
  cwd: string;
  sbom?: string;
  policy?: string;
  json?: boolean;
}

interface PolicyShape {
  allow?: string[];
  deny?: string[];
  exemptions?: Array<{ purl?: string; reason?: string }>;
}

interface CycloneDxComponent {
  type?: string;
  name?: string;
  version?: string;
  purl?: string;
  licenses?: Array<{
    license?: { id?: string; name?: string };
    expression?: string;
  }>;
}

interface CycloneDxBom {
  components?: CycloneDxComponent[];
}

interface Finding {
  purl: string;
  name: string;
  version: string;
  license: string;
  verdict: "allow" | "deny" | "unknown" | "exempt";
}

const readJson = <T>(p: string): T =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as T;

const collectLicenses = (c: CycloneDxComponent): string[] => {
  const out: string[] = [];
  for (const lic of c.licenses ?? []) {
    if (lic.license?.id) out.push(lic.license.id);
    else if (lic.license?.name) out.push(lic.license.name);
    else if (lic.expression) out.push(lic.expression);
  }
  return out.length ? out : ["UNKNOWN"];
};

const classify = (
  license: string,
  policy: PolicyShape,
): "allow" | "deny" | "unknown" => {
  const allow = new Set((policy.allow ?? []).map((s) => s.toLowerCase()));
  const deny = new Set((policy.deny ?? []).map((s) => s.toLowerCase()));
  const lc = license.toLowerCase();
  // Naive expression handling: split on OR/AND.
  const parts = lc.split(/\s+(?:or|and)\s+/);
  // If any part is denied → deny.
  if (parts.some((p) => deny.has(p))) return "deny";
  // If all parts are allowed → allow.
  if (parts.every((p) => allow.has(p))) return "allow";
  return "unknown";
};

export async function cmdSbomCheck(opts: SbomCheckOptions): Promise<void> {
  const root = path.resolve(opts.cwd);
  const sbomPath = path.resolve(opts.sbom ?? path.join(root, "sbom.cdx.json"));
  const policyPath = path.resolve(
    opts.policy ??
      path.join(root, "docs/agent-memory/17-release/licenses.allowlist.yml"),
  );
  if (!fs.existsSync(sbomPath)) {
    fail(
      `SBOM not found at ${sbomPath} (generate via the sbom workflow or 'cyclonedx-npm').`,
    );
    return;
  }
  if (!fs.existsSync(policyPath)) {
    fail(`Policy not found at ${policyPath}.`);
    return;
  }

  const bom = readJson<CycloneDxBom>(sbomPath);
  const policy =
    (yaml.load(fs.readFileSync(policyPath, "utf8")) as PolicyShape) ?? {};
  const exemptPurls = new Set(
    (policy.exemptions ?? [])
      .map((e) => e.purl)
      .filter((x): x is string => Boolean(x)),
  );

  const findings: Finding[] = [];
  for (const c of bom.components ?? []) {
    const purl = c.purl ?? `${c.name ?? "?"}@${c.version ?? "?"}`;
    const lics = collectLicenses(c);
    const license = lics.join(" OR ");
    let verdict: Finding["verdict"];
    if (exemptPurls.has(purl)) verdict = "exempt";
    else verdict = classify(license, policy);
    findings.push({
      purl,
      name: c.name ?? "?",
      version: c.version ?? "?",
      license,
      verdict,
    });
  }

  const denied = findings.filter((f) => f.verdict === "deny");
  const unknown = findings.filter((f) => f.verdict === "unknown");

  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        {
          sbom: path.relative(root, sbomPath),
          policy: path.relative(root, policyPath),
          totals: {
            components: findings.length,
            allow: findings.filter((f) => f.verdict === "allow").length,
            deny: denied.length,
            unknown: unknown.length,
            exempt: findings.filter((f) => f.verdict === "exempt").length,
          },
          denied,
          unknown,
        },
        null,
        2,
      ) + "\n",
    );
  } else {
    info(
      `Components: ${findings.length} · denied: ${denied.length} · unknown: ${unknown.length}`,
    );
    for (const f of denied) warn(`DENY  ${f.purl}  (${f.license})`);
    for (const f of unknown) info(`?     ${f.purl}  (${f.license})`);
  }

  if (denied.length > 0) {
    fail(`License policy violation: ${denied.length} denied component(s).`);
    return;
  }
  ok(`License policy OK (${findings.length} components scanned).`);
}
