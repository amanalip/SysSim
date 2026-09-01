# SysSim Quality Report — September 1, 2026

**Rubric:** [SysSim Quality Scoring Rubric 1.0](quality-rubric.md)  
**Scored commit:** `79f0cb2` (`docs(quality): retain final qualification evidence`)  
**GitHub CI:** [run 33565823019](https://github.com/amanalip/SysSim/actions/runs/33565823019)  
**Evidence subtotal:** **82/100**  
**Automatic deductions:** **None**  
**Final score:** **82/100**  
**Release status:** **Not production-ready**

This score applies the frozen all-or-nothing rubric to an immutable, clean commit. It does not award points for implementation when required independent review, branch protection, or a newcomer walkthrough is absent.

## Verification evidence

| Gate                           | Result                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub aggregate release gate  | Passed on `79f0cb2`; all required upstream jobs succeeded                                                                                                 |
| Formatting, lint, strict types | Passed locally and in CI                                                                                                                                  |
| Unit/integration and coverage  | 100 files and 544 tests passed locally; thresholds and artifacts passed in CI                                                                             |
| Accessibility                  | 23 focused tests passed locally; accessibility job passed in CI                                                                                           |
| Performance/endurance          | 27 focused tests passed; CI budget job passed                                                                                                             |
| Production build and bundle    | Passed; entry JS gzip 146,734 bytes, entry CSS 57,517 bytes, largest JS chunk 492,808 bytes                                                               |
| Duplication budget             | Passed at 0.65% duplicated lines, below the 6% threshold                                                                                                  |
| Dependency security            | `npm audit --audit-level=high` reported 0 vulnerabilities locally and in CI                                                                               |
| Licenses and SBOM              | 541 locked entries passed policy; CycloneDX SBOM generated and retained by CI                                                                             |
| Scenario content and citations | 3 content tests passed; 164 unique external links checked with 0 failures after refreshing the unavailable Kamailio URL                                   |
| Chromium, Firefox, WebKit      | All three CI jobs passed with artifacts; Chromium/Firefox focused keyboard checks also passed locally                                                     |
| Production base path           | 2/2 tests passed locally and in CI under `/SysSim/`                                                                                                       |
| Manual browser QA              | Development app checked at 1440×900 and 390×844; page identity, nonblank UI, console, screenshots, component addition, telemetry, and mobile tools passed |
| Branch protection              | Failed evidence check: GitHub reports `main` is not protected                                                                                             |

The local CachyOS/Arch host cannot launch Playwright's Ubuntu-linked WebKit bundle because its required `libicu74`, WebKitGTK, Flite, JXL, and backtrace ABI libraries are unavailable. This is recorded as a local-environment limitation, not a scored E2E failure, because the exact scored commit's clean Ubuntu WebKit CI job passed.

## Rubric evidence — every item

| ID      | Result | Points | Evidence or reason for failure                                                                                                       |
| ------- | ------ | -----: | ------------------------------------------------------------------------------------------------------------------------------------ |
| SIM-1   | Pass   |    4/4 | Product contract, edge semantics, failure taxonomy, model documentation, and behavior-matrix tests reconcile supported outcomes.     |
| SIM-2   | Pass   |    6/6 | Seed reproducibility, independent reference calculations, queue/rate/cache fixtures, and published tolerances pass.                  |
| SIM-3   | Pass   |    6/6 | Parameterized component and configuration tests cover supported fields, boundaries, and failure cases.                               |
| SIM-4   | Pass   |    4/4 | Metrics, component outcomes, traces, exports, and visible labels have reconciliation and product-contract tests.                     |
| TRUST-1 | Fail   |    0/4 | A dated source-backed claim audit exists, but it lacks independent reviewer sign-off.                                                |
| TRUST-2 | Pass   |    3/3 | Committed Chromium baselines cover real-time charts/table, bottlenecks, health radar, distributed traces, and cloud cost analysis.   |
| TRUST-3 | Pass   |    3/3 | Operating limits and unsupported production/accuracy uses are documented, tested, and verified across the deployment/browser matrix. |
| DATA-1  | Pass   |    5/5 | Imports, hashes, storage, and worker boundaries are bounded, versioned, schema-validated, migrated, and adversarially tested.        |
| DATA-2  | Pass   |    4/4 | JSON, sharing, snapshots, undo, and redo have representative and maximum-bound round-trip/invariant tests.                           |
| DATA-3  | Pass   |    3/3 | Storage, import/export, worker, and simulation failure injection preserves unrelated work and exposes actionable states.             |
| TEST-1  | Pass   |    4/4 | The clean CI coverage job passed its enforced engine/store/validation/calculation thresholds.                                        |
| TEST-2  | Pass   |    3/3 | Production-worker protocol, lifecycle, error, race, revision, cleanup, and fallback coverage passes.                                 |
| TEST-3  | Pass   |    3/3 | Critical flows and failure states passed Chromium, Firefox, and WebKit CI jobs with failure artifacts configured.                    |
| TEST-4  | Fail   |    0/4 | CI contains all required gates and is green, but `main` has no protected-branch configuration to enforce them before merge.          |
| SEC-1   | Pass   |    3/3 | Runtime schemas, unsafe-key rejection, bounds, React escaping, CSP, and security fixtures cover untrusted input/render paths.        |
| SEC-2   | Pass   |    2/2 | Share privacy, secret-like fields, downloads, navigation, referrer behavior, and recovery controls are tested and documented.        |
| SEC-3   | Pass   |    2/2 | The scored commit's clean CI dependency audit reports no high or critical vulnerability.                                             |
| SEC-4   | Pass   |    3/3 | `SECURITY.md`, the dated threat model, deployment review, and corrected medium deployment-bypass finding leave no known high path.   |
| A11Y-1  | Pass   |    3/3 | Keyboard selection/movement, dialogs, tabs, shortcuts, focus restoration, and cross-browser keyboard flows pass.                     |
| A11Y-2  | Fail   |    0/3 | Component tests exist, but no qualified manual screen-reader/accessibility-tree review has signed off.                               |
| A11Y-3  | Pass   |    2/2 | Themes, contrast contracts, reduced motion, zoom, forced colors where supported, and responsive reflow checks pass.                  |
| A11Y-4  | Pass   |    2/2 | Axe scans and critical-state accessibility tests pass in the CI gate with no serious/critical violation.                             |
| UX-1    | Fail   |    0/3 | Scenario-based browser flows pass, but an unfamiliar expert usability reviewer has not approved them.                                |
| UX-2    | Pass   |    2/2 | Seven viewport baselines and mobile/tablet property-sheet/navigation interactions pass.                                              |
| UX-3    | Pass   |    2/2 | The dated Chromium, Firefox, WebKit, keyboard, pointer, and touch-oriented critical-flow evidence is green.                          |
| UX-4    | Pass   |    1/1 | Loading, invalid, error, destructive, and success feedback states have component/browser coverage.                                   |
| PERF-1  | Pass   |    2/2 | Versioned responsiveness and maximum-envelope benchmarks pass locally and in the CI budget job.                                      |
| PERF-2  | Pass   |    2/2 | Long-run tests enforce bounds on events, traces, requests, samples, histories, and time series.                                      |
| PERF-3  | Pass   |    2/2 | Bundle, render/update, code-splitting, and duplication budgets pass and are CI-enforced.                                             |
| MAINT-1 | Pass   |    2/2 | Strict typecheck, runtime contracts, source review, and security tests leave no known high-risk unsafe boundary.                     |
| MAINT-2 | Pass   |    1/1 | Locked installation, format, lint, typecheck, test, build, and startup commands are documented and reproduced by clean CI jobs.      |
| MAINT-3 | Fail   |    0/2 | Architecture and modeling rationale exist, but the required independent reviewer sign-off is absent.                                 |
| DOC-1   | Fail   |    0/2 | The documentation set is broad, but no recorded newcomer walkthrough verifies setup and cross-link accuracy.                         |
| DOC-2   | Pass   |    2/2 | GPL metadata, dependency obligations, attribution, SBOM, scenario structure, and live-link checks pass.                              |
| DOC-3   | Pass   |    1/1 | Versioning, changelog, rollback, qualification, and Pages release procedures have successful scored-commit CI/deployment evidence.   |

## Score calculation

| Category                                     | Earned | Available |
| -------------------------------------------- | -----: | --------: |
| Simulation semantics and core correctness    |     20 |        20 |
| Product trust and scope accuracy             |      6 |        10 |
| Reliability and data integrity               |     12 |        12 |
| Testing and continuous integration           |     10 |        14 |
| Security and privacy                         |     10 |        10 |
| Accessibility                                |      7 |        10 |
| User experience and platform support         |      5 |         8 |
| Performance and bounded resource use         |      6 |         6 |
| Maintainability and developer experience     |      3 |         5 |
| Documentation, legal, and release governance |      3 |         5 |
| **Evidence subtotal / final score**          | **82** |   **100** |

No automatic deduction or cap applies: the scored remote commit is clean and all required CI, build, test, browser, accessibility, security, and performance jobs passed. `82 + 0 = 82`.

## Remaining 18 points

1. Obtain independent claim and distributed-systems sign-off (TRUST-1).
2. Protect `main` and require the aggregate release gate before merge (TEST-4).
3. Complete the qualified accessibility/screen-reader review (A11Y-2).
4. Complete the unfamiliar expert usability review (UX-1).
5. Obtain independent architecture/rationale sign-off (MAINT-3).
6. Record a clean newcomer documentation walkthrough (DOC-1).

The project improved from 52/100 on August 31 to 82/100 on September 1. It is a strong educational application, but the missing independent evidence and branch enforcement prevent a production-ready claim.
