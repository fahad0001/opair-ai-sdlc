# Threat model — Web

## Trust boundaries

- Browser ↔ CDN/edge ↔ origin app ↔ datastore.
- Third-party scripts and tag managers cross the browser boundary.

## STRIDE

- Spoofing: session fixation, OAuth callback abuse, sub-domain takeover.
- Tampering: CSRF, parameter tampering, prototype pollution.
- Repudiation: missing audit trail of state-changing actions.
- Information disclosure: open redirects, IDOR, leaky error pages, mixed content.
- Denial of service: form/login flood, expensive queries, bot scraping.
- Elevation of privilege: cookie-flag downgrades, weak SameSite, JWT confusion.

## OWASP Top 10 mapping

A01 BAC, A02 Crypto, A03 Injection, A04 Insecure design, A05 Misconfig,
A06 Vulnerable deps, A07 AuthN, A08 Integrity, A09 Logging, A10 SSRF.

## Required controls

- CSP (default-src 'self'), HSTS preload, secure + HttpOnly + SameSite=Lax cookies.
- CSRF tokens on every state-changing form; origin-bound double-submit OK.
- Subresource Integrity for any externally-hosted asset.
- Authenticated rate limits + bot defense at the edge.
- Strict input validation + output encoding per context (HTML/JS/CSS/URL).
