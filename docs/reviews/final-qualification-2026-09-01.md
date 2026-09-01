# Final qualification record — September 1, 2026

This record qualifies commit `4ee6fd6` against the repository's automated release matrix and the
acceptance evidence required by tasks 756 and 765. It is a dated engineering record, not a claim of
permanent correctness or independent expert approval.

## Environment

- Local host: CachyOS/Arch, Node.js 24.20.0 and npm 12.0.2.
- Supported release host: GitHub `ubuntu-latest`, Node.js 20, with Playwright-managed Chromium,
  Firefox, and WebKit.
- The local Node version is newer than the declared `>=20 <23` support range, so local results are
  supplemental. The linked Node 20 CI run is authoritative.
- Local WebKit remains unavailable because Playwright's Ubuntu-linked bundle requires ABI libraries
  not provided by this host. WebKit qualification therefore comes from the clean Ubuntu CI job.

## Reproducible installation and static gates

| Gate                       | Result                                                |
| -------------------------- | ----------------------------------------------------- |
| `npm ci`                   | Passed; 484 packages installed from the lockfile      |
| `npm run format:check`     | Passed                                                |
| `npm run lint`             | Passed                                                |
| `npm run typecheck`        | Passed                                                |
| `npm run check:duplicates` | Passed at 0.65% duplicated lines, below the 6% budget |

The clean install emitted expected notices for the unsupported local Node 24 host and upstream
deprecations. These are not hidden; dependency advisories and licenses were checked separately.

## Correctness, accessibility, and performance

| Gate                         | Result                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `npm run test:coverage`      | 100 files and 544 tests passed; enforced coverage thresholds passed             |
| `npm run test:accessibility` | 2 files and 23 tests passed, including idle-state axe analysis                  |
| `npm run test:performance`   | 5 files and 27 tests passed                                                     |
| `npm run check:bundle`       | Passed: entry JS gzip 146,734 B; entry CSS 57,517 B; largest JS chunk 492,808 B |

One axe test exceeded its five-second timeout while four CPU-heavy suites ran concurrently. The same
complete coverage suite passed 544/544 when rerun alone, and the focused accessibility command then
passed 23/23. This is recorded as harness contention, not silently discarded or classified as a
product failure.

## Browser and viewport qualification

| Surface                              | Result                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Chromium and Firefox development E2E | 58 passed; 12 intentional non-Chromium visual-baseline skips                                                                      |
| Production `/SysSim/` path E2E       | 2 passed                                                                                                                          |
| Chromium visual viewports            | 360×800, 390×844, 768×1024, 1024×768, 1280×720, 1440×900, and 1920×1080 passed                                                    |
| Keyboard/assistive workflows         | Node focus, selection, movement, 200% zoom, reduced motion, forced colors, dialogs, tabs, forms, and live-region contracts passed |
| Retained analysis evidence           | Charts, metrics table, bottlenecks, health radar, distributed traces, and cloud cost views matched committed desktop baselines    |

Manual in-app browser QA at 1440×900 and 390×844 confirmed the expected page title and base path,
a nonblank canvas, no framework error overlay, and no console warning or error. Adding a Client
changed the rendered node count from five to six and opened its named property editor. The health
radar rendered after opening telemetry. At mobile size, the design-tools control opened the named
drawer while the canvas remained present.

This automated and manual evidence closes task 756's repository-controlled viewport and core
assistive-technology checks. It does not replace the qualified external accessibility review in
tasks 719 and 766.

## Security, licensing, and content

| Gate                            | Result                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm audit --audit-level=high`  | 0 vulnerabilities                                                                                                            |
| `npm run check:licenses`        | 541 locked entries passed policy                                                                                             |
| `npm run generate:sbom`         | CycloneDX SBOM generated                                                                                                     |
| `npm run test:scenario-content` | 3 tests passed                                                                                                               |
| `npm run check:scenario-links`  | 164 unique links checked; 0 failures after replacing the unavailable Kamailio feature URL with its official project overview |

## Remaining qualification boundaries

- Independent distributed-systems, accessibility, architecture, usability, and newcomer reviews
  remain open and must be completed by people who meet the review criteria.
- Recurring controls in tasks 724–733 remain open by design and must run whenever their trigger
  occurs.
- Branch protection is repository state rather than source code. Its status is recorded separately
  in `docs/branch-protection.md` and the dated quality report.
