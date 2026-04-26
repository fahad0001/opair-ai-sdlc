# Quality gates — per-kind overlays

Each file in this folder is a kind-specific overlay layered on top of the
project-wide gates in `../07-quality-gates.md`. The doctor command + scaffold
choose the matching file based on `agent-mem.config.json`'s `project.kind`.

Files:

- `backend.md`, `frontend.md`, `fullstack.md`, `mobile.md`, `desktop.md`,
  `cli.md`, `library.md`, `monorepo.md`, `ai.md`, `data.md`,
  `automation.md`, `infra.md`, `docs.md`.

Each overlay defines:

- Required gates (block merge)
- Recommended gates (warn)
- Tooling hints (concrete commands or libraries)
- Coverage thresholds where applicable
