# SysSim Quality Report — August 31, 2026

**Rubric:** [SysSim Quality Scoring Rubric 1.0](quality-rubric.md)  
**Scored commit:** `877b021` (`test: stabilize deployed and cross-browser workflows`)  
**Evidence subtotal:** **67/100**  
**Automatic deduction:** **−15** for the required local WebKit run being unable to launch  
**Final score:** **52/100**  
**Release status:** **Not production-ready**

This deliberately strict score uses the rubric's all-or-nothing items. It does not convert implementation volume into credit when required independent review, retained evidence, or a supported-browser result is missing.

## Verification evidence

| Gate                           | Result                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting, lint, strict types | Passed                                                                                                                                         |
| Unit and integration           | 99 files, 539 tests passed                                                                                                                     |
| Accessibility                  | 2 files, 23 tests passed                                                                                                                       |
| Performance/endurance          | 5 files, 27 tests passed                                                                                                                       |
| Production build and bundle    | Passed; entry JS gzip 146,685 bytes, entry CSS 57,517 bytes, largest JS chunk 492,260 bytes                                                    |
| Duplication budget             | Passed at 0.65% duplicated lines, below the 6% threshold                                                                                       |
| Dependency licenses            | 541 locked entries verified                                                                                                                    |
| Dependency security            | `npm audit --audit-level=high` reported 0 vulnerabilities                                                                                      |
| Scenario content               | 3 tests passed                                                                                                                                 |
| Citation audit                 | 164 unique links checked, 0 failed; dated JSON report written                                                                                  |
| Production-path E2E            | 2/2 passed under `/SysSim/`                                                                                                                    |
| Chromium and Firefox E2E       | 53 passed, 7 configured Firefox visual skips                                                                                                   |
| WebKit E2E                     | Browser launch blocked by missing host `libicu74` and `libflite1`; installation requires the machine owner's sudo password                     |
| Manual browser QA              | Desktop and 390×844 production preview; theme, simulation, diagnostics trigger, navigation, and responsive layout exercised; no console errors |

## Rubric result

| Category                                     | Earned | Available | Key reason for remaining loss                                                                                              |
| -------------------------------------------- | -----: | --------: | -------------------------------------------------------------------------------------------------------------------------- |
| Simulation semantics and correctness         |     20 |        20 | Reference, seeded, component-matrix, and metric reconciliation evidence is present.                                        |
| Product trust and scope accuracy             |      0 |        10 | Independent claim review and retained screenshots for every analysis surface remain absent; WebKit evidence is incomplete. |
| Reliability and data integrity               |     12 |        12 | Bounded validation, migrations, round trips, history, and failure recovery are covered.                                    |
| Testing and continuous integration           |      7 |        14 | Coverage thresholds and worker tests pass, but WebKit and a green CI run for this commit are not available locally.        |
| Security and privacy                         |      7 |        10 | Input/browser safeguards and dependency audit pass; a dated threat model review remains absent.                            |
| Accessibility                                |      7 |        10 | Keyboard, contrast/motion/zoom, and axe gates pass; qualified manual screen-reader sign-off remains absent.                |
| User experience and platform support         |      3 |         8 | Responsive matrix and feedback states pass; expert usability and complete WebKit/input matrix evidence remain absent.      |
| Performance and bounded resource use         |      6 |         6 | Versioned runtime, endurance, duplication, render, and bundle budgets pass.                                                |
| Maintainability and developer experience     |      3 |         5 | Strict boundaries and reproducible commands pass; architecture documentation lacks independent reviewer sign-off.          |
| Documentation, legal, and release governance |      2 |         5 | License/citation evidence passes; newcomer and actual release-candidate approval evidence remain absent.                   |
| **Evidence subtotal**                        | **67** |   **100** |                                                                                                                            |

The required supported-browser test command returned a WebKit launch failure, so rubric 1.0 applies the −15 E2E deduction and 69-point cap. `67 − 15 = 52`.

## Remaining deductions and fastest score gains

1. Install the two WebKit host libraries and obtain a green WebKit run, preferably also from CI. This removes the automatic −15 deduction and unlocks browser-matrix rubric items.
2. Complete the prepared distributed-systems assumptions review in `docs/reviews/distributed-systems-review-request.md`.
3. Obtain qualified screen-reader and usability reviews with retained evidence.
4. Create and review a dated threat model.
5. Run the committed CI/release candidate on an immutable remote commit and retain its artifacts and approvals.
6. Perform a newcomer documentation walkthrough and capture screenshots for every analysis surface.

Compared with the August 27 report, the verified score rises from 0 to 52. The remaining gap is now dominated by independent review and release evidence rather than known build, unit, accessibility, performance, dependency, or citation failures.
