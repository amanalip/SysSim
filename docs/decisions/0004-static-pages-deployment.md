# ADR 0004: Static GitHub Pages deployment

- Status: Accepted
- Date: 2026-08-31

## Decision

Ship a client-only build under `/SysSim/` through GitHub Pages after CI succeeds. Recover direct routes through the static 404 redirect while preserving URL fragments.

## Consequences

There is no application backend or server-side secret boundary. All assets, worker URLs, dynamic chunks, CSP behavior, direct navigation, and hashes must be tested under the production base path. Some response headers require a different hosting layer.
