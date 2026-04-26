# Quality gates — data / ETL

## Required (block merge)

| Gate            | Tooling                                       | Threshold                      |
| --------------- | --------------------------------------------- | ------------------------------ |
| Lint + types    | sqlfluff / ruff / dbt-checkpoint              | zero errors                    |
| Unit tests      | pytest / dbt tests                            | green                          |
| Schema contract | great_expectations / dbt source freshness     | green on every PR              |
| Data quality    | dbt tests (unique, not_null, accepted_values) | zero failures                  |
| Lineage         | OpenLineage / dbt artifacts                   | published per run              |
| PII scan        | DLP / detect-secrets / pii-detector           | zero hits in non-prod extracts |
| Backups         | restore-test job                              | green on schedule              |
| Security: deps  | pip-audit                                     | no high+ unfixed               |

## Recommended (warn)

- Cost guardrail: scan + warn on queries > $X / row scan > Y rows.
- Row/column-level security policy lint (e.g. Snowflake `SHOW POLICIES`).
- Anomaly detector on key metrics; alert on > 3σ drift.

## Hints

- Reject schema drift unless approved in an ADR.
- Mask PII in non-prod warehouses; gate access via groups, not users.
