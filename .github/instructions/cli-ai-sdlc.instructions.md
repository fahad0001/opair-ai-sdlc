---
applyTo: "cli/ai-sdlc/**"
---

# `@opair/ai-sdlc` CLI package

You are editing the published CLI.

Build + sync:

- The package's `npm run build` runs `node scripts/sync-framework.mjs`
  first. The sync copies the repo's canonical
  `docs/agent-memory/`, `AGENTS.md`, `.github/agents/`,
  `.github/prompts/`, `.github/copilot-instructions.md`, and (if
  present) `.github/instructions/` into `templates/framework/`.
- It also auto-derives neutral YAMLs into `templates/agents/` and
  `templates/prompts/` from the Markdown sources. Do NOT hand-edit
  those YAMLs — edit the `.agent.md` / `.prompt.md` source.

Rendering:

- Vendor renderers in `src/engine/renderers.ts` and
  `prompt-renderers.ts` MUST be additive when writing to a target
  file that may have been provided by the synced framework
  templates (use `writeFileIfMissing`). Never clobber.

Commands:

- New CLI subcommands MUST be wired in `src/cli.ts` with a
  matching `commands/<name>.ts` and a unit test under `test/`.
- Keep error handling at the boundary in `guard()`; commands throw
  rich errors.

Tests + types:

- `npm test` runs vitest at workspace root. Keep the suite green.
- `tsc --noEmit` must pass — no `any` leaks.

Versioning:

- Bump the package's `version` in lockstep with the root package
  when shipping framework changes.
