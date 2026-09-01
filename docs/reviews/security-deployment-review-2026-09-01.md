# Dependency and deployment security review — September 1, 2026

**Scope:** package lock and policy, CI workflows, Pages workflow, deployment scripts, document security controls, and public Pages configuration  
**Method:** manual source review plus automated audit/license/SBOM gates; the dedicated scan launcher rejected a mixed-file scope, so this is not represented as a completed Codex Security scan.

## Standards and platform guidance

GitHub recommends explicit least-privilege workflow permissions and full-length commit SHA action pins, and identifies full SHA pinning as the immutable action reference. GitHub Pages custom deployments require `pages: write`, `id-token: write`, and a protected `github-pages` environment. See [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) and [Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Results

- All third-party Actions are pinned to full commit SHAs.
- CI declares `contents: read`; the Pages workflow adds only `actions: read`, `pages: write`, and `id-token: write` for qualification and deployment.
- Pull-request runs cannot trigger Pages: deployment requires the completed CI event to be a successful `push` on `main`.
- Checkout uses the CI-qualified `workflow_run.head_sha`, preventing a later moving branch from changing the artifact source.
- Manual rollback previously bypassed CI qualification. The workflow now resolves the requested ref and checks GitHub's Actions API for a successful push-triggered CI run on that exact SHA before deployment.
- Dependencies install from the committed lockfile. High/critical advisories, reviewed SPDX identifiers, and CycloneDX SBOM generation are release gates; Dependabot covers npm weekly and Actions monthly.
- The static document CSP blocks foreign scripts/plugins/fonts and limits workers and connections. `no-referrer` reduces share-hash disclosure. GitHub Pages cannot supply every desirable response header, which remains documented.
- The public Pages API reports HTTPS enforcement and workflow-based publishing. The latest main CI and Pages runs were successful before this review; the final report records the new revision after its run completes.

## Finding disposition

`DEPLOY-01` (medium before correction): manual `workflow_dispatch` could publish a revision that had not passed the complete CI release gate. Corrected with exact-SHA CI qualification and regression tests. No other high- or medium-severity dependency/deployment finding remains open from this review.

## Limitations

Repository administrators, GitHub's control plane, npm registry integrity, and the correctness of pinned action commits are trusted. License allowlisting and `npm audit` are useful gates but are not legal advice or a guarantee that every supply-chain compromise is detectable.
