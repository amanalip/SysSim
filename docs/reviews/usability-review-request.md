# Independent core-workflow usability review request

## Reviewer qualification

Use a reviewer unfamiliar with SysSim's implementation and checklist history. Product, UX, developer-tools, or system-design teaching experience is useful; the reviewer must not be coached through the expected path.

## Environment and workflows

Record browser, viewport, input method, commit, and date. Starting from the deployed home page, ask the reviewer to:

1. Understand the product's scope and limitations.
2. Add, connect, move, and configure components.
3. start, pause, step, reset, and inspect a simulation.
4. Identify offered demand, completed throughput, failures, latency, and a bottleneck prompt.
5. Save and restore a snapshot, undo and redo a change, and export an architecture.
6. Create and reopen a share URL without placing private information in it.
7. Open a scenario, use progressive hints, and explain why its output is illustrative.
8. Recover from one invalid import and one unavailable-worker error state.

Do not explain control locations unless the reviewer is blocked; record every prompt as an observation.

## Severity and sign-off

- P0: data loss, unsafe behavior, or core workflow impossible.
- P1: a core workflow is effectively blocked or materially misleading.
- P2: substantial friction with a discoverable workaround.
- P3: polish or preference.

- Reviewer:
- Relevant experience:
- Date:
- Commit/deployment:
- Result: approve / approve with follow-up / reject
- Findings and severity:
- Evidence links:

Tasks 717 and the independent portion of UX-1 remain incomplete until this record is completed and P0/P1 findings are resolved.
