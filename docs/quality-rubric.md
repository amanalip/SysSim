# SysSim Quality Scoring Rubric

**Rubric version:** 1.0

**Frozen for final review:** September 1, 2026. Version 1.0 weights, pass conditions, deductions, and caps must not change during the final-review cycle. Any future rubric change requires version 1.1 or later, a dated rationale, and a new score; historical scores remain evaluated against their recorded version.

This rubric defines a reproducible score out of 100 for SysSim. It measures verified repository quality at a specific revision and date; it does not permanently certify the project or replace the release gates below.

## Scoring method

1. Evaluate every rubric item as **Pass** or **Fail** against the stated evidence.
2. Award the item's full weight only when all pass conditions are met. Otherwise award zero; do not award subjective partial credit.
3. Sum passed weights to obtain the evidence subtotal, with a maximum of 100.
4. Apply automatic deductions and score caps after the subtotal. Clamp the final score to 0–100.
5. Record the commit, commands, artifacts, reviewer, failures, deductions, and final score in the score history or a linked dated report.
6. Treat missing, stale, inaccessible, or unverifiable evidence as a failure.

## Weighted rubric

### Simulation semantics and core correctness — 20 points

| ID    | Weight | Pass condition                                                                                                                            | Required objective evidence                                                                       |
| ----- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| SIM-1 |      4 | Request, status, replica, edge, time, and routing semantics are documented and match implementation.                                      | Product-contract review plus source-linked semantic tests for every supported outcome.            |
| SIM-2 |      6 | Identical graph, configuration, seed, and steps produce identical results; reference workloads match independently calculated tolerances. | Seeded reproducibility tests and checked-in reference fixtures/calculations.                      |
| SIM-3 |      6 | Every user-configurable behavior claimed as modeled affects the relevant component model correctly.                                       | Parameterized component tests covering supported configuration fields and boundary/failure cases. |
| SIM-4 |      4 | Overall metrics, component metrics, traces, exports, and UI labels agree for the same run.                                                | Cross-surface reconciliation tests covering success and every failure outcome.                    |

### Product trust and scope accuracy — 10 points

| ID      | Weight | Pass condition                                                                                                                    | Required objective evidence                                                  |
| ------- | -----: | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| TRUST-1 |      4 | README, product contract, UI, examples, and release copy make no unsupported behavior or accuracy claims.                         | Dated claim audit with source/UI search results and reviewer sign-off.       |
| TRUST-2 |      3 | Every simulated, heuristic, and estimated output is visibly classified and points to its assumptions.                             | Component tests plus desktop browser screenshots for every analysis surface. |
| TRUST-3 |      3 | Supported environments, operating limits, and unsupported use cases are documented and enforced or explicitly labeled unenforced. | Contract review, boundary tests, and deployment/browser matrix evidence.     |

### Reliability and data integrity — 12 points

| ID     | Weight | Pass condition                                                                                       | Required objective evidence                                                        |
| ------ | -----: | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| DATA-1 |      5 | Imported, shared, and persisted data is bounded, schema-validated, versioned, and safely migrated.   | Malformed/adversarial fixture tests, size-limit tests, and migration tests.        |
| DATA-2 |      4 | JSON, URL sharing, snapshots, undo, and redo preserve all supported fields without corruption.       | Round-trip and history invariant tests for representative and maximum-size graphs. |
| DATA-3 |      3 | Worker, storage, import, export, and simulation failures recover without losing unrelated user work. | Failure-injection integration tests and verified user-facing error states.         |

### Testing and continuous integration — 14 points

| ID     | Weight | Pass condition                                                                                                              | Required objective evidence                                                                     |
| ------ | -----: | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| TEST-1 |      4 | Unit and integration suites cover critical engine, store, validation, and calculation paths with enforced thresholds.       | Green clean-run test report and CI-enforced statement/branch/function/line coverage thresholds. |
| TEST-2 |      3 | The production Web Worker path has protocol, lifecycle, error, race, and cleanup coverage.                                  | Green worker integration tests using the production worker boundary.                            |
| TEST-3 |      3 | Critical user journeys and failure states pass in every supported browser.                                                  | Green Playwright report for the declared browser matrix with failure artifacts enabled.         |
| TEST-4 |      4 | CI blocks merges on formatting, lint, types, tests, build, coverage, E2E, accessibility, security, and performance budgets. | Protected-branch configuration and a green CI run showing each required job.                    |

### Security and privacy — 10 points

| ID    | Weight | Pass condition                                                                                                                   | Required objective evidence                                                     |
| ----- | -----: | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| SEC-1 |      3 | All imported, URL, storage, and rendered user-controlled data is validated and handled without executable injection.             | Security-focused validation tests and static review of every input/render sink. |
| SEC-2 |      2 | Browser persistence/sharing risks, external navigation, downloads, and generated files have appropriate safeguards and warnings. | Browser-security tests and UI evidence for warnings/controls.                   |
| SEC-3 |      2 | Production and development dependency audits contain no unresolved high or critical vulnerabilities.                             | Dated clean-install audit output tied to the scored commit.                     |
| SEC-4 |      3 | SECURITY.md defines reporting and scope; a current threat model has no unresolved high-severity path.                            | Policy review, dated threat model, and tracked remediation evidence.            |

### Accessibility — 10 points

| ID     | Weight | Pass condition                                                                                                                                       | Required objective evidence                                                       |
| ------ | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A11Y-1 |      3 | All core workflows are keyboard operable with visible focus and logical focus order.                                                                 | Keyboard-only walkthrough evidence and regression tests.                          |
| A11Y-2 |      3 | Controls, canvas objects, dialogs, status, charts, and validation messages expose correct accessible names, roles, relationships, and announcements. | Accessibility-tree/manual screen-reader review plus component tests.              |
| A11Y-3 |      2 | Supported themes meet WCAG 2.2 AA contrast, motion, zoom, and non-color-only requirements.                                                           | Automated contrast results and manual checks at 200% zoom/reduced motion.         |
| A11Y-4 |      2 | Automated accessibility scans pass on every critical page and modal state, with no serious or critical violations.                                   | CI artifacts from axe or an equivalent scanner plus documented manual exceptions. |

### User experience and platform support — 8 points

| ID   | Weight | Pass condition                                                                                                            | Required objective evidence                                                              |
| ---- | -----: | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| UX-1 |      3 | Create, connect, configure, simulate, inspect, save/share, restore, and export workflows are understandable and complete. | Scenario-based browser tests and an expert usability review with no unresolved P1 issue. |
| UX-2 |      2 | Declared desktop, tablet, and mobile layouts avoid clipping, overlap, inaccessible controls, and scroll traps.            | Screenshot matrix and interaction tests at documented breakpoints.                       |
| UX-3 |      2 | Every supported browser and input method passes the critical-flow matrix.                                                 | Dated cross-browser/device test report.                                                  |
| UX-4 |      1 | Loading, empty, invalid, error, destructive, and success states provide timely and actionable feedback.                   | State-focused component/browser tests and screenshots.                                   |

### Performance and bounded resource use — 6 points

| ID     | Weight | Pass condition                                                                                                                    | Required objective evidence                                                   |
| ------ | -----: | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| PERF-1 |      2 | Startup, interaction latency, frame rate, and memory budgets are defined and pass at representative and maximum supported graphs. | Repeatable benchmark report with hardware/browser metadata and CI thresholds. |
| PERF-2 |      2 | Simulation histories, traces, samples, events, and per-node statistics remain explicitly bounded during maximum supported runs.   | Long-run stress tests proving stable bounds.                                  |
| PERF-3 |      2 | Bundle size and render/update costs remain within versioned budgets without avoidable duplicate or eagerly loaded heavy code.     | Bundle report, profiler evidence, and enforced size budget.                   |

### Maintainability and developer experience — 5 points

| ID      | Weight | Pass condition                                                                                                    | Required objective evidence                                                     |
| ------- | -----: | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| MAINT-1 |      2 | Core boundaries use strict types, validated contracts, cohesive modules, and no unjustified unsafe casts.         | Typecheck plus documented static review with zero unresolved high-risk finding. |
| MAINT-2 |      1 | Formatting, linting, dependency installation, tests, and local startup are reproducible from documented commands. | Clean-clone command transcript and CI enforcement.                              |
| MAINT-3 |      2 | Architecture decisions, ownership, extension points, and complex model rationale are documented and kept current. | Architecture/decision documents mapped to source modules and reviewer sign-off. |

### Documentation, legal, and release governance — 5 points

| ID    | Weight | Pass condition                                                                                                                | Required objective evidence                                        |
| ----- | -----: | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| DOC-1 |      2 | Setup, usage, architecture, testing, limitations, contribution, security, and changelog documentation is accurate and linked. | Documentation link/command audit and newcomer walkthrough.         |
| DOC-2 |      2 | License metadata, dependency obligations, attribution, and scenario citations are accurate and verifiable.                    | License/dependency review and automated citation/link report.      |
| DOC-3 |      1 | Releases use documented versioning, changelog, rollback, quality-gate, and approval procedures.                               | Release checklist plus evidence from the latest release candidate. |

**Total possible weight: 100 points.**

## Automatic deductions and caps

Apply every applicable deduction after calculating the evidence subtotal. Multiple deductions accumulate; the final score cannot be negative. A cap limits the final score even when the arithmetic result is higher.

| Trigger at the scored commit                                          |            Deduction | Maximum final score |
| --------------------------------------------------------------------- | -------------------: | ------------------: |
| Production build or strict typecheck fails                            |                  −20 |                  59 |
| Any unit or integration test fails                                    |                  −15 |                  69 |
| Any required browser/E2E test fails                                   |                  −15 |                  69 |
| Required CI job is missing, skipped, or failing                       |                  −10 |                  79 |
| Unresolved critical security vulnerability                            |             −30 each |                  39 |
| Unresolved high security vulnerability                                |             −20 each |                  49 |
| Unresolved P0 correctness, corruption, or materially misleading claim |             −20 each |                  49 |
| Serious/critical accessibility violation in a core workflow           |             −10 each |                  79 |
| Accessibility gate is absent or not run                               |                   −8 |                  84 |
| Defined performance or bundle budget fails                            | −5 per failed budget |                  89 |
| Performance budgets are absent or not measured                        |                   −5 |                  89 |
| Scored working tree is dirty or evidence does not identify a commit   |                   −5 |                  89 |

## Production-ready threshold

A release may be called **production-ready** only when all of the following are true:

- final rubric score is at least **95/100**;
- production build, strict types, unit/integration, supported-browser E2E, accessibility, security, and performance gates all pass;
- no unresolved P0 or P1 checklist item affects a supported workflow;
- no unresolved critical, high, or medium security finding remains;
- no known UI or documentation claim exceeds implemented behavior;
- the score is tied to an immutable commit and evidence bundle;
- an independent reviewer has approved the dated quality report.

A score below 95 may still describe a useful educational project, but it must not be represented as production-ready. A 100/100 score is a dated result against this rubric, not a permanent guarantee.

## Score history

| Date       | Commit    | Evidence subtotal | Deductions/caps | Final score | Status                                                   | Evidence                                                                       |
| ---------- | --------- | ----------------: | --------------- | ----------: | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 2026-08-27 | `042d627` |        Not scored | Not evaluated   |           — | Rubric established; verified rescore deferred to task 21 | Tasks 16–20 definition work; no score inferred from implementation confidence. |
| 2026-08-27 | `438a79d` |                 6 | −43; cap 49     |           0 | Not production-ready                                     | [Dated quality report](quality-report-2026-08-27.md)                           |
| 2026-08-31 | `877b021` |                67 | −15; cap 69     |          52 | Not production-ready; WebKit host dependencies missing   | [Dated quality report](quality-report-2026-08-31.md)                           |
| 2026-09-01 | `466ce66` |                79 | None            |          79 | Not production-ready; independent evidence remains       | [Dated quality report](quality-report-2026-09-01.md)                           |

Future entries must preserve earlier rows. Corrections should be appended with an explanation rather than silently rewriting historical results.
