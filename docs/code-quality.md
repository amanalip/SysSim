# Code quality workflow

Run `npm run lint`, `npm run typecheck`, and `npm run format:check` before review. `npm run lint:fix` and `npm run format` apply safe mechanical fixes. ESLint enforces TypeScript, React Hooks, React refresh, accessibility, duplicate-import, unused-code, and architectural-boundary rules. Prettier is the single source of truth for formatting; imports are grouped as platform/external dependencies, then internal modules, with type-only imports where practical.

Reusable semantic classes should replace presentation-only inline styles. Runtime geometry and data-driven chart values may remain inline because a static CSS class cannot express them.

The repository intentionally has no pre-commit hook. Fast checks already run in CI, while unit, browser, accessibility, performance, security, and bundle suites are too slow and repetitive for every commit. Contributors can run the targeted scripts locally and CI remains the authoritative gate.
