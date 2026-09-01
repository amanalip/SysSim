# ADR 0003: Strict canonical persistence

- Status: Accepted
- Date: 2026-08-31

## Decision

Persist domain data rather than React Flow presentation objects. Treat every file, hash, and localStorage value as untrusted; bound, migrate, and strictly validate it before state application.

## Consequences

Exports are stable and portable, unknown fields fail closed, snapshots cannot retain measured presentation data, and migrations require tests for all supported schema versions.
