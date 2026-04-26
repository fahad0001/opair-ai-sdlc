# Quality gates — infrastructure / IaC

## Required (block merge)

| Gate            | Tooling                                | Threshold                             |
| --------------- | -------------------------------------- | ------------------------------------- |
| Format + lint   | terraform fmt / tflint / pulumi-policy | zero errors                           |
| Static analysis | tfsec / checkov / kics                 | zero high findings                    |
| Plan diff       | terraform plan / pulumi preview        | reviewed in PR                        |
| Policy as code  | OPA / sentinel / cnspec                | green                                 |
| Cost diff       | infracost                              | within budget; warn on > 10% increase |
| Drift detection | scheduled job                          | zero un-reviewed drift                |
| State backend   | encrypted + locked + versioned         | verified                              |
| Secrets scan    | gitleaks                               | zero hits                             |

## Recommended (warn)

- Network: deny-by-default egress; explicit allow-list reviewed.
- IAM: deny `*:*`; principal of least privilege gate.
- Image SBOM for any custom AMIs / OCI images.

## Hints

- Atlantis / spacelift PR comments are the source of truth for plans.
- Apply only via CI; refuse local `terraform apply` against shared envs.
