# Requirement skeleton template

Source-of-truth for what a `R-XXXX/` requirement folder must contain.

The **Init** agent (and `agent-mem new`, when shipped) copy these files into a freshly
created `docs/agent-memory/02-requirements/R-XXXX/` and replace the literal `R-XXXX`
placeholder with the assigned ID.

Files in this folder:

| File                     | Purpose                                                                           |
| ------------------------ | --------------------------------------------------------------------------------- |
| `requirement.md`         | Problem statement, FR-#, scenarios                                                |
| `acceptance-criteria.md` | AC-#, EC-#, ER-#, NT-#                                                            |
| `nonfunctional.md`       | Performance, security, reliability, a11y, i18n, observability, AI-eval (per kind) |
| `constraints.md`         | Hard limits (regulatory, technical, business)                                     |
| `risks.md`               | Identified risks + mitigations                                                    |
| `traceability.md`        | FR → plan → impl → tests mapping                                                  |
| `meta.json`              | Machine-readable snapshot (validated against `02-requirements/meta.schema.json`)  |

> Do **not** edit files in this folder when working on a real requirement. Edit the copy
> under `02-requirements/<assigned-id>/` instead.
