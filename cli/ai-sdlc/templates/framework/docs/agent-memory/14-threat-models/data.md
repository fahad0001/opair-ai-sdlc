# Threat model — Data / ETL

## Trust boundaries

- Source systems ↔ ingest ↔ transform ↔ warehouse ↔ consumers / BI.
- PII zones are an explicit boundary.

## STRIDE highlights

- Tampering: untrusted source schemas, silent drift.
- Information disclosure: over-broad warehouse grants, BI extracts to laptops.
- Repudiation: transformations without lineage.
- Denial of service: runaway queries, unbounded backfills.

## Required controls

- Schema contracts at every hop; reject on drift.
- Row/column-level security in the warehouse; mask PII in non-prod.
- Lineage captured (OpenLineage / dbt artifacts); retained per policy.
- Access via groups, never per-user; reviewed quarterly.
- Backups encrypted, restore tested, retention codified.
- DLP scans on extracts and shared dashboards.
