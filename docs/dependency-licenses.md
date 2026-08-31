# Dependency license policy

SysSim is licensed `GPL-3.0-only`. The locked dependency set was reviewed on 2026-08-31. Runtime packages use MIT or ISC licenses, both compatible with distribution in this GPL application. Development dependencies additionally use Apache-2.0, BSD, BlueOak, CC0, CC BY 4.0, MPL-2.0, Python-2.0, MIT-0, and combined MIT/ISC terms. These tools and datasets are not relicensed as SysSim source.

`npm run check:licenses` fails when a locked package omits a license or introduces an SPDX expression that has not been reviewed. This is an allowlist review, not legal advice. Dependency upgrades require checking the package's actual license file when its SPDX identifier changes. Attribution details are in [NOTICE.md](../NOTICE.md), and the generated SBOM records versions used for releases.
