# ADR 0002: Worker runtime with bounded fallback

- Status: Accepted
- Date: 2026-08-31

## Decision

Run the engine in a module Web Worker and communicate through a validated, revisioned protocol. If worker startup or execution fails, activate the same bounded engine on the main thread and disclose fallback mode.

## Consequences

The UI remains responsive under normal load; stale worker results cannot overwrite a newer graph. The fallback favors availability but may reduce UI responsiveness, so runtime mode is included in diagnostics.
