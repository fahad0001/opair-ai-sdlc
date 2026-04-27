---
name: sbom-check
description: "Validate an SBOM against the project's license + advisory policy."
argument-hint: "--sbom <path>"
---
You are running the `ai-sdlc sbom-check` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Generate or pass an SBOM (SPDX/CycloneDX).
2. Run `ai-sdlc sbom-check --sbom <path>`.
3. Open an ADR for any banned license; never silently waive.

When to invoke: after `npm install` lockfile changes or before a release.
