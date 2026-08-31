# Dependency and release-tooling policy

- Clean environments and CI use `npm ci`; `package-lock.json` is authoritative and committed.
- Production and development dependencies are audited on every CI run. A CycloneDX SBOM is retained
  as the `release-sbom` artifact for each qualified run.
- Dependabot proposes weekly npm updates and monthly GitHub Actions updates. Minor and patch
  development-tool updates may be grouped; major versions are intentionally ignored by automation
  and require a dedicated review of migration notes, bundle impact, browser behavior, and rollback.
- GitHub Actions are pinned to full commit SHAs. Human-readable comments record the intended major
  release without weakening reproducibility.
- Direct runtime dependencies are intentionally high level: React/React DOM render the UI, Zustand
  owns client state, React Flow renders diagrams, Lucide supplies icons, Recharts supplies advanced
  metrics, `lz-string` encodes share URLs, and `html-to-image` is dynamically loaded for PNG export.
  No internal/transitive package is declared directly.
- Unused dependencies are removed after import and build verification. Type-only packages are kept
  only when the runtime package does not provide suitable declarations.
