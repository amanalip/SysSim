# License and citation review — September 1, 2026

## License

Project metadata, `LICENSE`, README, and notices consistently identify `GPL-3.0-only`. Runtime dependency metadata currently reports permissive MIT/ISC licenses; development-tool identifiers are restricted to the reviewed allowlist documented in `dependency-licenses.md`. The generated CycloneDX SBOM records the exact lockfile versions. GNU's compatibility guide includes common permissive licenses and Apache 2.0 as compatible inputs to GPLv3 distribution: [GNU GPLv3 guide](https://www.gnu.org/licenses/quick-guide-gplv3.pdf).

The automated check validates SPDX metadata against a reviewed allowlist; it does not replace reading changed license texts or legal advice. Any new or changed identifier requires human review.

## Citations

The catalog requires source type, a claim-specific `supports` note, review ownership, and verification dates. The structural audit checks those fields; the scheduled live-link job checks reachability and retains a dated JSON artifact. Access-restricted hosts are explicit. Reachability is not truth certification, so README and UI wording now say “source-reviewed” and “dated citations” instead of “factchecked” or “verified citations.”

The distributed-systems fact-check separately read primary standards and authoritative engineering guidance for the quantitative assumptions it reviewed. Remaining scenario content continues to depend on category-owner review under `scenario-content-review.md`.

## Decision

No unresolved material license contradiction or known dead citation remains after the current automated gates pass. Task 721 can close for this dated revision; future dependency and content changes require the same checks again.
