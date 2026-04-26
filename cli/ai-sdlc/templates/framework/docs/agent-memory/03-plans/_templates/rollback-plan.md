# Rollback Plan — R-XXXX

## Date

- YYYY-MM-DD

---

## 1) Rollback Philosophy

When to rollback vs fix-forward.

## 2) Rollback Triggers

- Build fails unexpectedly
- Tests regress
- Critical performance degradation
- Security risk introduced
- User-facing breakage

## 3) Rollback Steps

1. Identify offending change set (files/commit/PR chunk).
2. Revert to last passing checkpoint.
3. Re-run quality gates.
4. Record rollback in logs and update fix-loop if needed.

## 4) Data Safety Measures

- Migration reversibility notes:
- Feature flags (if used):

## 5) Post-Rollback Actions

- Root cause note:
- Plan adjustment:
- ADR if the rollback was due to a decision/architecture issue
