# Alpha 5 Release Preparation Audit

## Scope

Prepared `@opair/ai-sdlc` for `0.1.0-alpha.5` publishing after the script-backed skill-suite upgrade.

## Changes

- Bumped root/private package metadata to `0.1.0-alpha.5`.
- Bumped `@opair/ai-sdlc` package metadata to `0.1.0-alpha.5`.
- Regenerated `package-lock.json` with `npm install --package-lock-only`.
- Changed CLI version reporting to read from the workspace package metadata instead of a hard-coded version string.

## Validation Evidence

- `runTests` for `cli/ai-sdlc/test`: PASS, 76 passed and 0 failed.
- `npm run typecheck -w @opair/ai-sdlc`: PASS.
- `npm run cli:build`: PASS.
- `npm run smoke -w @opair/ai-sdlc`: PASS, output `0.1.0-alpha.5`.
- `npm run check`: PASS.
- `npm pack --dry-run -w @opair/ai-sdlc --json`: PASS, package id `@opair/ai-sdlc@0.1.0-alpha.5`.

## Publish Status

Publishing requires npm registry authentication. `npm whoami` returned `E401 Unauthorized` before publish.
`npm login --auth-type=web` opened a CLI login flow, but the browser page could not complete in this environment and the terminal login process was stopped.

Publish retry on 2026-05-04:

- `npm whoami --loglevel=error`: PASS, authenticated as `fahadmir0001`.
- `npm publish -w @opair/ai-sdlc --tag alpha`: BLOCKED before completion by npm publish-time browser authentication challenge (`Authenticate your account at: https://www.npmjs.com/auth/cli/...`; `Press ENTER to open in the browser...`).
- `npm view @opair/ai-sdlc dist-tags --json`: PASS, registry still reports `alpha` as `0.1.0-alpha.4` and `latest` as `0.1.0-alpha.0`.
- `npm view @opair/ai-sdlc@0.1.0-alpha.5 version --json`: FAIL, registry returned `E404 No match found for version 0.1.0-alpha.5`.
- `npm run build:memory-indexes`: PASS, refreshed memory folder indexes after evidence updates.
- `npm run check`: PASS.
