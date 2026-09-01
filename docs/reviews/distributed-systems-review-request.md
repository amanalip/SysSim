# Distributed-systems assumptions review request

## Reviewer qualification

Please assign an engineer with practical experience designing, operating, or reviewing distributed systems. The reviewer should be independent of the implementation work.

## Material to review

- `docs/scientific-validation.md`
- `docs/advanced-modeling.md`
- `docs/reference-systems.md`
- `src/engine/network-model.ts`
- `src/engine/workload-model.ts`
- `src/engine/resilience-model.ts`
- `src/__tests__/advanced-simulation-credibility.test.ts`

## Review questions

1. Are the equations and deterministic reference cases applied correctly?
2. Are the published tolerances defensible for an educational simulator?
3. Are demand, acceptance, completion, and dropping distinguished clearly?
4. Could any protocol label imply a guarantee the implementation does not provide?
5. Are payload, loss, retry, connection, and zone assumptions discoverable and internally consistent?
6. Do the resilience experiments demonstrate retry amplification, isolation, quorum loss, and recovery without overstating realism?
7. Which assumptions would most likely teach a misleading intuition?

## Sign-off record

- Reviewer:
- Relevant experience:
- Date:
- Commit reviewed:
- Decision: approve / approve with follow-up / reject
- Required corrections:
- Optional recommendations:

Checklist item 683 remains incomplete until this record is completed by an independent qualified reviewer and any required corrections are resolved.
