# Release management

## Cadence

- Trunk-based development. Every merged PR is a release candidate.
- Production releases gated by:
  - Green CI (lint, types, tests, AHC, hashes, drift, guard).
  - SBOM published + provenance attached.
  - DORA + SLO dashboards within thresholds.

## Versioning

- Semantic versioning per package.
- Pre-release tags: `-alpha.N`, `-beta.N`, `-rc.N`.

## Release checklist

1. Update CHANGELOG.
2. Tag with `vX.Y.Z`.
3. Build + sign artifacts; attach SBOM (`sbom.cdx.json`).
4. Generate release notes (auto via `softprops/action-gh-release`).
5. Verify provenance attestation on the published asset.

## Rollback

- Tag-based: re-deploy the previous `vX.Y.(Z-1)`.
- Document the trigger and decision in the incident ticket.
