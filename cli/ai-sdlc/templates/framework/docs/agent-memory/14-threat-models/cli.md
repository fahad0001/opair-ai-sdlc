# Threat model — CLI

## Trust boundaries

- Invoking shell ↔ CLI process ↔ filesystem / network / child processes.
- Plugins (if any) are a separate trust zone.

## STRIDE highlights

- Spoofing: typosquatted package, compromised install script.
- Tampering: unpinned dependencies, race-condition writes.
- Information disclosure: secrets in flags, unredacted logs, telemetry.
- Elevation of privilege: arbitrary command construction from user input.

## Required controls

- Distribute via signed registry artifacts; publish provenance (SLSA).
- Refuse to run as root unless explicitly required and documented.
- Never pass user input through `shell:true`; use argv arrays.
- Secrets only via env or stdin; redact in `--debug` output.
- Strict argument parsing (commander/clap); reject unknown flags.
- Telemetry opt-in, anonymized, documented in privacy section.
