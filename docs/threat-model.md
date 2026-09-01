# SysSim threat model — September 1, 2026

## Scope and architecture

SysSim is a public static React application built in GitHub Actions and hosted on GitHub Pages. It has no application server, account system, database, or production secret store. Simulation executes in a Web Worker with a bounded same-code fallback on the main thread. Persistent data stays in browser storage; architecture sharing encodes user-selected data in the URL hash.

## Assets and security objectives

- Preserve the integrity and availability of the deployed static application and its release artifacts.
- Prevent untrusted imports, hashes, browser storage, worker messages, and labels from becoming executable markup/code or unbounded work.
- Avoid unintended disclosure of architecture details, notes, traces, tokens, credentials, or diagnostic data.
- Preserve unrelated user work when parsing, storage, worker, or simulation operations fail.
- Keep workflow credentials and Pages deployment authority least-privileged and restricted to qualified commits.

## Threat actors and capabilities

- A remote person can craft a share URL or architecture/snapshot file and persuade a user to open it.
- Local scripts or extensions may alter localStorage; SysSim treats stored values as untrusted but cannot defend against an extension with full page privileges.
- A contributor can propose code, dependency, scenario, or workflow changes; protected review and CI are assumed for `main`.
- A compromised upstream package or GitHub Action can affect builds within its granted permissions.
- GitHub Pages and browser vendors are trusted hosting/runtime dependencies outside repository control.

## Trust boundaries and controls

| Boundary                                    | Primary risks                                                     | Controls                                                                                                                              | Residual risk                                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| URL hash/import/storage → application state | Injection, prototype pollution, oversized data, schema confusion  | Byte/depth/count bounds, unsafe-key rejection, versioned schema validation, migrations, structured errors                             | Browser memory pressure before/around platform decoding remains bounded only by browser and URL limits.         |
| Application → DOM/download/share URL        | Script/markup injection, secret disclosure, unsafe navigation     | React escaping, safe serialization, secret-like field rejection, explicit privacy warning, `noopener noreferrer`, `no-referrer`, CSP  | Users can intentionally put sensitive content in ordinary names; warnings cannot prevent deliberate disclosure. |
| UI → worker/fallback engine                 | forged messages, stale results, resource exhaustion, loss of work | Runtime protocol guards, graph revisions, bounded graph/event/history limits, fallback isolation, error states                        | Main-thread fallback can reduce responsiveness on weak devices within the published envelope.                   |
| Repository/dependencies → CI artifacts      | dependency or action compromise, malicious install/build scripts  | lockfile install, audit, license allowlist, SBOM, Dependabot, full-SHA action pins, read-only default permissions                     | Registry and pinned-action publisher compromise remain supply-chain dependencies.                               |
| CI → Pages                                  | deploying an unqualified or attacker-controlled revision          | push-main successful-CI gate, exact SHA checkout, Pages environment, minimal `pages`/OIDC permissions, manual-ref qualification check | Repository administrators can change workflows/settings; GitHub-hosted control plane is trusted.                |

## Key abuse cases and disposition

1. Crafted architecture executes JavaScript: blocked by safe-value checks, schema validation, React escaping, and CSP; regression tests cover unsafe keys and rendered content.
2. Crafted data exhausts the simulator: node/edge/zone/import/text/numeric/event/history limits and performance tests bound supported inputs.
3. Share URL leaks architecture data: warned in UI, hash is not sent as an HTTP referrer under `no-referrer`, and secret-like keys are rejected; user intent remains required.
4. Pull request gains deployment credentials: CI has read-only contents permission; Pages deployment runs only after a successful push event on `main`, not pull-request CI.
5. Manual rollback bypasses release gates: manual deployments resolve the selected ref and require a successful push-triggered CI run for that exact SHA.
6. Compromised action tag changes code: actions are pinned to full commit SHAs, the immutable form recommended by GitHub.

## Review result

No source-backed unresolved high-severity path was identified in the dependency/deployment review dated September 1, 2026. This model must be reviewed when a backend, authentication, cloud storage, collaboration service, analytics, third-party script, or configurable hosting layer is introduced.
