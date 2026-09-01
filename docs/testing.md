# Testing Strategy

SysSim uses layered evidence. A build or a single browser smoke test is never treated as complete release evidence.

| Layer                 | Command                                                     | Contract                                                      |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Formatting/lint/types | `npm run format:check`, `npm run lint`, `npm run typecheck` | Static correctness and dependency boundaries                  |
| Unit/integration      | `npm run test:coverage`                                     | Models, store, schemas, worker bridge, calculations           |
| Accessibility         | `npm run test:accessibility`                                | Keyboard, names, dialogs, status, responsive contracts        |
| Performance/bundle    | `npm run test:performance`, `npm run check:bundle`          | Bounded runtime and shipped asset budgets                     |
| Security/supply chain | `npm run check:security`, `check:licenses`, `generate:sbom` | Advisory and licensing gates                                  |
| Scenario content      | `test:scenario-content`, `check:scenario-links`             | Catalog structure, provenance, citation reachability          |
| Development E2E       | `npm run test:e2e:release`                                  | Critical workflows in Chromium, Firefox, WebKit               |
| Production E2E        | `npm run test:e2e:production`                               | Built assets at `/SysSim/`, chunks, worker, 404/hash behavior |

Manual exploratory release testing covers create → connect → configure → simulate → inspect → snapshot → export/import → share, keyboard-only navigation, reduced motion, light/dark themes, 200% zoom, mobile/tablet/desktop layouts, and recovery from invalid input. Evidence and remaining risks belong in release notes.
