# ADR 0001: Deterministic illustrative simulation

- Status: Accepted
- Date: 2026-08-31

## Decision

SysSim uses a seeded, bounded discrete-event model intended for comparative learning. It does not attempt wall-clock load generation or claim production prediction.

## Consequences

Identical supported inputs and engine versions should produce identical outcomes. Configuration must either affect the model or be disclosed as non-modeled. Scientific reference cases and performance bounds are release evidence. Vendor-specific distributed protocols remain outside scope unless explicitly implemented and validated.
