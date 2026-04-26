# Threat model — Mobile

## Trust boundaries

- Device ↔ app sandbox ↔ network ↔ backend.
- Biometric / secure enclave is a separate trust zone.

## OWASP MASVS / Mobile Top 10 mapping

M1 Improper credential usage, M2 Inadequate supply chain, M3 Insecure authn/z,
M4 Insufficient input/output validation, M5 Insecure communication, M6
Inadequate privacy controls, M7 Insufficient binary protections, M8 Security
misconfig, M9 Insecure data storage, M10 Insufficient cryptography.

## Required controls

- Certificate pinning for all backend traffic; reject user-installed CAs.
- Secure storage (Keychain / Keystore) for tokens; never plaintext prefs.
- Root/jailbreak + tamper detection with proportionate response.
- Code obfuscation only as defense in depth, never sole control.
- Push tokens treated as PII; rotated on logout/uninstall.
- App-attest / Play Integrity for high-value calls.
