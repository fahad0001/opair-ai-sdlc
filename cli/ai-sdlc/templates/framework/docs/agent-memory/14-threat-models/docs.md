# Threat model — Documentation site

## Trust boundaries

- Author ↔ build pipeline ↔ static host ↔ reader.
- External link targets are out of trust.

## STRIDE highlights

- Tampering: unreviewed merges, search-index poisoning.
- Information disclosure: accidental publish of internal-only pages.
- Spoofing: typosquatted custom domains.

## Required controls

- PR review + branch protection on the docs branch.
- CSP on the published site; SRI on third-party scripts.
- Link checker + dead-link CI gate.
- DNS + TLS managed; HSTS preload after stabilization.
- No PII in analytics; cookieless or consent-gated as applicable.
- Visible "report a security issue" path.
