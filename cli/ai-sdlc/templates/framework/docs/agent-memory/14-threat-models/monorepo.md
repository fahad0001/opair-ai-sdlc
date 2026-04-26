# Threat model — Monorepo

## Trust boundaries

- Each package is a separable trust zone within a single repo.
- CI runners are shared infrastructure with escalation potential.

## STRIDE highlights

- Tampering: cross-package import of internal modules; unpinned actions.
- Elevation of privilege: shared CI secrets reachable from any package.
- Information disclosure: build artifacts leaking source from another package.

## Required controls

- CODEOWNERS per package; required reviews on the package path.
- Path-scoped CI workflows; secrets scoped per package job.
- Pin third-party Actions by SHA, not tag.
- Per-package ESLint/import boundaries; deny cross-package private imports.
- Per-package SBOMs published independently.
- Cache poisoning defenses (signed lockfiles, verify-on-restore).
