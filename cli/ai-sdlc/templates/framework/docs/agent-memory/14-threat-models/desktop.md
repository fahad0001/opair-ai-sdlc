# Threat model — Desktop

## Trust boundaries

- Local user ↔ app process ↔ OS APIs ↔ filesystem ↔ network.
- Auto-update channel is a high-value boundary.

## STRIDE highlights

- Spoofing: malicious updates, IPC impersonation.
- Tampering: dylib/DLL hijacking, plugin sideloading.
- Information disclosure: world-readable config, swap-file residue.
- Elevation of privilege: setuid helpers, IPC misuse, browser shells (Electron).

## Required controls

- Code-signed binaries + notarized installers; pinned update endpoints.
- Sandbox where possible (App Sandbox, AppContainer, Snap, Flatpak).
- For Electron: contextIsolation=true, nodeIntegration=false, sandbox=true,
  strict CSP, validated `webContents` navigation handlers.
- OS keychain for secrets; never plaintext on disk.
- Crash reporters scrub PII before upload.
