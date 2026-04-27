---
name: release-notes
description: "Compose release notes from completed requirements + ADRs."
argument-hint: "[--from <ref>] [--to <ref>]"
---
You are running the `ai-sdlc release-notes` capability.

Inputs:
${input}

Rules:

- Follow `AGENTS.md` and `docs/agent-memory/00-anti-hallucination-charter.md`.
- Run the CLI command exactly; do not paraphrase its output.
- Cite any file paths or hashes you produce.

Steps:

1. Run `ai-sdlc release-notes`.
2. Group by requirement + ADR, never by raw commit.
3. Ask the user to confirm tone and scope before publishing.

When to invoke: tagging a release.
