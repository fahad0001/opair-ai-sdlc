# Quality gates — documentation site

## Required (block merge)

| Gate                        | Tooling                       | Threshold          |
| --------------------------- | ----------------------------- | ------------------ |
| Spell + style               | cspell + vale + markdownlint  | zero errors        |
| Link check                  | lychee / lychee-action        | zero broken links  |
| Build                       | docusaurus / mkdocs / hugo    | clean              |
| A11y                        | pa11y / axe on rendered pages | zero serious       |
| Visual regression on layout | percy / loki                  | green on key pages |
| Search index integrity      | site search smoke             | green              |

## Recommended (warn)

- Lighthouse: perf ≥ 90, a11y ≥ 95, best-practices ≥ 95.
- Stale-content audit: warn on docs not edited in N months.
- "Edit this page" link present on every page.

## Hints

- All external scripts SRI-pinned and CSP-allowed.
- Cookie banner only if analytics configured; default is none.
