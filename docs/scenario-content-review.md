# Scenario Content Review Standard

SysSim scenarios are teaching prompts, not production capacity plans or canonical architecture answers. Each scenario is reviewed against this standard before catalog publication and is rechecked when a source, constraint, or reference design changes.

## Ownership and review cadence

Every category has a named review owner in `src/scenarios/index.ts`. Every normalized scenario records `contentReviewedOn`, and every source records `lastVerifiedOn`. The weekly link workflow checks that cited pages still respond; a passing link check establishes reachability, not the truth of every claim on the page.

## Constraint and unit review

- QPS means aggregate requests per second at the system boundary.
- Storage is expressed in decimal gigabytes and represents retained application data before provider-specific overhead.
- Latency targets are end-to-end p99 milliseconds.
- Availability is a percentage target, not a simulator guarantee.
- Read/write ratios use `reads:writes` notation.
- Retention periods are explanatory text and must agree with the storage narrative.
- Catalog QPS values may describe a real-world design envelope above the simulator's safe 50,000 QPS ceiling. In that case the traffic preset is explicitly scaled and the approximation note discloses it.

The catalog audit enforces numeric plausibility, supported protocols, valid graph references, unique IDs, source metadata, review ownership, and simulator-safe presets. Reviewers additionally compare the written constraints with the cited material and remove claims that are not supported or clearly mark them as illustrative assumptions.

## Source taxonomy

Sources are classified as primary documentation, engineering publication, research paper, book, or secondary reference. Prefer product documentation, engineering teams describing their own systems, peer-reviewed papers, and stable DOI or publisher pages. Each citation includes a short `supports` note so readers know which statement it is intended to support.

Links must use HTTPS and open in a new tab with `noopener noreferrer`. Access-restricted hosts may be accepted by the automated checker only for an explicit authorization or bot-protection response; missing pages and server failures still fail the job.

The weekly report classifies `403` and `406` responses separately from missing pages because a browser-accessible primary source may intentionally reject automated clients. DNS failures and timeouts are retried on the next scheduled run and must be replaced when repeated. A successful status is only reachability evidence: the category owner still reads the source, confirms that the specific `supports` claim is relevant, prefers a DOI/RFC/stable official document over a home page, and updates `lastVerifiedOn` during content review.

The August 2026 audit's historical nine 404s and five DNS/timeout failures were reconciled against the current catalog. On 2026-08-31, 162 of 164 unique URLs passed or were explicitly access-restricted; the two remaining endpoints were replaced with a stable KIT research page and a specific Enterprise Integration Patterns document. Verification dates are normalized into every source and enforced by the catalog audit.

## Reference-design limitations

A reference design is one defensible decomposition of responsibilities. It is not an answer key, a deployable bill of materials, proof of an SLA, or a claim that a named company uses that exact graph. The simulator is deterministic and useful for relative experiments, but its output is illustrative. Learners should compare behaviors, failure paths, and tradeoffs rather than matching component counts.

## Manual review checklist

1. Read the problem, constraints, hints, discussion points, and reference graph as one narrative.
2. Confirm each quantitative claim has an explicit unit and a plausible order of magnitude.
3. Confirm the traffic preset preserves the intended workload shape within runtime limits.
4. Validate every node configuration and every edge protocol/purpose against the architecture schema.
5. Confirm hints progress from requirements to tradeoffs and do not reveal the full design immediately.
6. Confirm experiments have an observable before/after metric or failure behavior.
7. Open each source, classify it, record what it supports, and update the verification date.
8. Ensure company-specific wording is supported by a primary source or rewritten as an illustrative design.
9. Confirm the approximation disclosure matches every simplification introduced by normalization.
10. Run `npm run test:scenario-content` and `npm run check:scenario-links`.
