# September 7 improvements

## Scope and acceptance criteria

1. **Workspace recovery:** automatically save architecture and traffic locally; restore on reload, including an intentionally empty canvas. Shared URLs take priority. Show save failures without claiming success.
2. **Run history:** retain stopped-run summaries for the current session, including elapsed modeled time, completed throughput, drops, p95, and workload context.
3. **Run comparison:** pin a baseline and compare results; identify differences in workload, duration, engine, or mid-run changes that make comparisons less controlled.
4. **Simpler controls:** keep Simulate, QPS, and core feedback visible; disclose advanced traffic, seed, speed, and chaos settings on demand.
5. **Guided first experiment:** offer a dismissible, replayable run → inspect → adjust → rerun guide using the existing starter design.
6. **QPS correctness:** use the supported interactive 1–50,000 integer range consistently and provide inline validation.
7. **Honest heuristic feedback:** say “No issues found by current checks” when no rules match.
8. **Verification:** exercise persistence and comparison edge cases, run automated checks, and inspect desktop/mobile browser flows.

## Delivery

Changes will be recorded in focused commits with explanatory messages. Run history is session-local; architecture autosave is browser-local. Simulation outputs remain illustrative.

## Validation results

Implemented all seven product improvements. Additional reliability work confirms final worker metrics before saving a run, guards restarts while finishing, preserves unreadable drafts where storage permits, removes stale share hashes after edits, and fixes header/mobile control overflow.

Initial automated verification: 105 test files / 562 tests passed, followed by focused tests for the finalization and input-validation changes. Browser checks verified the four-step guide, two saved runs with a pinned baseline and duration caveat, Escape dismissal, and recovery of edited QPS (1,234) after reload at 390 × 844.

Completed final checks:

- Formatting, lint, TypeScript, and duplicate-code checks passed.
- Production bundle budget passed: largest chunk 487,038 bytes against the unchanged 500,000-byte limit. Calculator and run history load on demand.
- All 35 Chromium browser tests passed with reviewed, updated visual baselines.
- Both production deployment tests passed on the final build.
- Focused accessibility and product-label checks passed (14 tests).

The broader coverage run encountered timing failures while concurrent browser checks were running. Those focused checks subsequently passed; a coverage rerun was underway when the user requested stopping. Full coverage completion and remote CI success are not claimed.

All implementation, regression tests, visual baselines, and the two reported GitHub CI fixes are committed and pushed. Further verification stopped at the user's request.
