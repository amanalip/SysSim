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

Final suite and visual-baseline verification in progress. Existing browser tests are being updated to navigate the responsive actions menu and reflect the intentionally changed layout.
