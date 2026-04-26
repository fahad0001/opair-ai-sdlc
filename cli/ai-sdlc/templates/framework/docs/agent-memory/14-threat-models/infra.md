# Threat model — Infrastructure / IaC

## Trust boundaries

- Cloud account ↔ IaC pipeline ↔ runtime ↔ data plane.
- Service-control policies define the outermost ring.

## STRIDE highlights

- Tampering: state-file corruption, drift outside review.
- Elevation of privilege: wildcard IAM, public buckets, exposed metadata.
- Information disclosure: secrets in tfvars, plan output in PRs.

## Required controls

- Remote, encrypted state with locking; no secrets in state diffs.
- IAM least privilege; deny `*` actions; block public access by default.
- Network: private subnets, egress allow-listed, VPC endpoints for AWS APIs.
- Drift detection on schedule; alert on out-of-band changes.
- Policy-as-code (OPA/Checkov/tfsec) gates merges.
- SBOM + provenance for any custom AMIs / images.
