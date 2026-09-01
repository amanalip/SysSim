# Documentation walkthrough rehearsal — September 1, 2026

This is a maintainer-run clean-install rehearsal for a future newcomer review. It reduces mechanical
risk but deliberately does not claim the independent newcomer evidence required by rubric item
DOC-1.

## Rehearsed path

1. Read the README product scope, educational-use boundary, system requirements, and installation
   commands without relying on unpublished setup knowledge.
2. Installed the exact lockfile with `npm ci`.
3. Ran formatting, lint, standalone type checking, coverage, focused accessibility, performance,
   bundle, dependency-audit, license, scenario-content, and citation checks using documented npm
   scripts.
4. Built the production application and exercised its `/SysSim/` base path, dynamic chunks, worker,
   favicon, CSS, shared URL hash, and Pages recovery document.
5. Followed the create → inspect → telemetry workflow at desktop and mobile sizes in the rendered
   application.
6. Followed links from the README to the product contract, architecture/schema, edge semantics,
   accessibility, testing, security, contribution, release, licensing, and quality documents.

## Outcome

The documented commands and navigation path were sufficient for a clean maintainer rehearsal. The
host's Node 24 version correctly produced an engine-range warning because the supported range is
Node 20–22; authoritative release qualification runs on Node 20 in CI. No undocumented secret,
service, or local configuration was required.

## Independent completion criterion

Give a clean clone and only the README to a person unfamiliar with SysSim. Record whether they can
install, start, build, run tests, understand the educational modeling boundary, locate contribution
and security guidance, and complete one scenario workflow. Capture every ambiguity before asking
for sign-off. Only that independent record may close DOC-1.
