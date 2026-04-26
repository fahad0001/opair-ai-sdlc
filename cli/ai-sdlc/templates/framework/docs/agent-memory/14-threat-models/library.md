# Threat model — Library / SDK

## Trust boundaries

- Consumer code ↔ library ↔ downstream services / native bindings.
- Malicious updates are the dominant risk.

## Required controls

- Signed releases + provenance (SLSA build, SBOM attached).
- Pinned, minimal dependency tree; deny postinstall scripts in CI.
- No telemetry by default; opt-in only with documented data flow.
- Public surface documented; deprecations in CHANGELOG with semver discipline.
- Inputs validated even at internal boundaries (defense in depth).
- Reproducible builds where the ecosystem supports it.
- 2FA / signed commits required for maintainers.
