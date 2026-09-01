# Contributing to SysSim

## Setup

Use Node `>=20 <23`, npm `>=10`, and `npm ci`. Start at `http://localhost:5173/SysSim/` with `npm run dev`. Create a focused branch from current `main`; keep generated reports and browser artifacts out of commits unless a maintainer requests them.

## Change workflow

1. Identify the numbered checklist item or issue and its acceptance evidence.
2. Add or update tests before declaring behavior complete.
3. Preserve strict persistence boundaries, deterministic seeds, and simulation limitations.
4. Run the smallest relevant tests while iterating, then `npm run release:verify` for release-affecting work.
5. Keep commits logically scoped and explain user-visible behavior, migrations, risks, and manual QA in the pull request.

Reviewers verify correctness, accessibility, security boundaries, model claims, performance budgets, migration compatibility, and documentation. New dependencies require license and security review.

## Adding a component type

Update, in order: the `ComponentType` union and configuration interface; metadata/default factory; palette/icon; properties editor; canvas rendering; connection validation and edge inference; engine execution kind and component model; metrics; schema validation/migrations; scenario references; unit/integration/E2E evidence; component semantics documentation. Search for an existing component type to find exhaustive switches and tests. A visible property must affect the engine or be explicitly labeled non-modeled.

## Adding or editing a scenario

Use the next stable ID and a unique slug. Provide constraints with units, progressive hints, discussion points, a schema-valid reference graph, approximation notes, review ownership, and at least one specific source. Prefer standards, papers, or official engineering documentation over generic home pages. Record what each source supports and its verification date. Run `npm run test:scenario-content` and `npm run check:scenario-links`; manually assess relevance even when HTTP checks pass.

See [testing](docs/testing.md), [architecture](docs/architecture.md), [scenario review](docs/scenario-content-review.md), [security](SECURITY.md), and [release process](docs/release-process.md).
