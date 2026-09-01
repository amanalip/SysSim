# Release and Rollback Process

## Release gates

A release candidate requires a clean lockfile install; format, lint, type, unit/integration/coverage, accessibility, scenario, security, license, SBOM, performance, bundle, development E2E, and production-path E2E gates. There must be no open P0 or P1 issue assigned to the release milestone. Persistence changes require every-version migration and representative round-trip tests.

A maintainer performs and records the exploratory workflow in [testing](testing.md). Release notes must identify user-visible changes, fixed defects, known limitations, breaking behavior, architecture schema changes, engine-version compatibility, and any user action required.

## Publishing

1. Confirm the CI workflow is green on the exact `main` commit.
2. Complete the pull-request release checklist and verify the release milestone has no open P0/P1 issues.
3. Move Unreleased changelog entries into the dated semantic version and update `package.json`.
4. Tag the qualified commit as `vX.Y.Z` and create GitHub release notes from the changelog.
5. Let the Pages workflow deploy that exact CI-qualified SHA.
6. Run the post-deployment smoke check against the emitted Pages URL and manually open one shared hash.

## Rollback

Locate the last green deployed SHA in the Pages environment history. Prefer `git revert` of the offending commit(s), merge the revert through normal CI, and allow Pages to deploy the new qualified head. For an urgent static-site rollback, a maintainer may re-run the Pages workflow against the last known-good tag, then must open a follow-up issue and restore `main` to a deployable state. Never rewrite published `main` history.

After rollback, verify the root, `/SysSim/`, worker and dynamic assets, `404.html`, a shared hash, and the diagnostic build SHA. Record the rollback reason and affected versions in the changelog/release notes.
