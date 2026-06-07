# Syft: Design Philosophy and Known Limitations

**Last updated:** 2026-06-07
**Syft version tested:** 1.44.0 (darwin/arm64)
**Image tested:** `docker.io/n8nio/n8n:latest` (v2.23.4)

---

## What syft is designed for

Syft (by Anchore) is an SBOM **generator** — not a compliance enforcer. Anchore
explicitly separates the toolchain into three concerns:

| Layer | Tool | Role |
|---|---|---|
| Generation | **Syft** | Inventory what's in an image or directory |
| Vulnerability matching | **Grype** | Match inventory against CVE databases |
| License compliance | **Grant** | Apply allow/deny policy rules against the SBOM |

Using raw syft output as a compliance pass/fail gate skips the policy layer.
Anchore built Grant as a separate tool specifically because syft's raw output
always has gaps that require policy interpretation — not a binary fail.

---

## Is a clean raw syft scan a realistic bar?

No. **Earthly Lunar** (a major syft integration for CI pipelines) defaults its
`min_license_coverage` threshold to **50%** — explicitly acknowledging that
half of packages missing license data is considered a passing scan on a
typical project.

A raw syft scan of a production Docker image will always have:
- Packages where the `license` field is absent from `package.json`
- Packages where the license is written in free-text rather than SPDX format
- Phantom entries from subpath export stubs or bundled test fixtures
- OS packages with upstream-distro license strings

None of these are defects in the scanned project. They are expected artifacts
of how npm packages are published and how syft scans filesystems.

The recommended workflow is: **syft generates the SBOM → Grant/FOSSA/Snyk
applies policy**. n8n's release SBOM is the enriched output of that pipeline,
not the raw syft scan.

---

## npm-specific limitations (documented issues)

### License detection is local-only by default

Syft reads the `license` field from `package.json` files found on disk. It
does not query the npm registry unless explicitly configured:

```bash
SYFT_JAVASCRIPT_SEARCH_REMOTE_LICENSES=true syft <image> --enrich javascript
```

This is **disabled by default**. Anchore's docs acknowledge: "enables Syft to
use the network to fill in more detailed license information" — confirming that
local-only scanning produces less complete data.

**Tested finding:** Running `--enrich javascript` against `n8nio/n8n:latest`
produced identical results to the default scan — zero additional licenses
resolved. For packages without a `license` field, the npm registry returns the
same missing data that the on-disk scan found.

### Remote enrichment has known parse failures (issue #2611)

When `SYFT_JAVASCRIPT_SEARCH_REMOTE_LICENSES=true`, syft silently drops license
data for packages where the npm registry returns the license field as an object
(`{type: "MIT", url: "..."}`) rather than a string. Enabling remote enrichment
can make results *worse* for affected packages with no workaround.

### pnpm dev dependencies included by default (issue #3914)

For pnpm lock files, dev dependencies are included in the SBOM by default.
This inconsistency with how `package-lock.json` is handled is an open issue as
of 2025. Scanning a pnpm image will include test/dev packages that would be
excluded from an npm scan.

### Subpath export stubs inventoried as phantom packages

Syft uses `**/package.json` glob matching. When a package uses npm subpath
exports, some distributions include stub `package.json` files inside
subdirectories for tooling compatibility. Syft inventories each of these as a
separate package entry with `@UNKNOWN` version and no license data.

Examples present in `n8nio/n8n`:
- `@google/genai/node@UNKNOWN`, `@google/genai/web@UNKNOWN`
- `@linear/sdk/webhooks@UNKNOWN`
- `chart.js-auto@UNKNOWN`, `chart.js-helpers@UNKNOWN`
- `web-streams-polyfill-es2018@UNKNOWN`, `web-streams-ponyfill*@UNKNOWN`

These are not real packages. They cannot be resolved by any enrichment
approach. n8n's enrichment pipeline handles them via cdxgen (which avoids
this class of false positive); they appear only in raw syft image scans.

### Test fixtures shipped inside production packages

Some production npm packages publish their full source tree (no `files` field
in `package.json`) including `test/`, `example/`, and `benchmarks/`
directories. Each directory containing a `package.json` is inventoried by syft
as a separate package with no license data.

Examples previously present in `n8nio/n8n` (now resolved):

| Phantom package | Source | Directory |
|---|---|---|
| `baz`, `false_main`, `invalid_main` | `resolve@1.22.11` | `test/resolver/` |
| `test-fixtures` | `import-in-the-middle@1.15.0` | `test/fixtures/` |
| `beep-boop` | `github-from-package@0.0.0` | `example/` |
| `tedious-benchmarks` | `tedious@16.7.1` | `benchmarks/` |

**Fix:** `scripts/build-n8n.mjs` strips these directories from the production
closure after `pnpm deploy`.

### Non-SPDX license strings passed through without normalisation

Syft does not normalise free-text license names to SPDX identifiers. A
`package.json` with `"license": "Apache 2.0"` produces a CycloneDX
`license.name` entry (free-text), not `license.id: "Apache-2.0"` (SPDX).

Examples present in the dependency tree and their SPDX equivalents:
- `"BSD"` → `BSD-2-Clause`
- `"MIT/X11"` → `MIT`
- `"Apache 2.0"` → `Apache-2.0`
- `"MIT License"` → `MIT`
- `"MPL 2.0"` → `MPL-2.0`
- `"PSF"` → `Python-2.0`

These are covered by `scripts/licenses/license-overrides.json` in n8n's
enriched SBOM pipeline and do not appear as failures in the release SBOM.

---

## The right artifact for compliance review

A raw syft scan generates an inventory. n8n's enriched release SBOM is the
compliance artifact:

```bash
# Use n8n's published SBOM rather than re-generating
gh release download n8n@<version> --repo n8n-io/n8n --pattern sbom-source.cdx.json
gh attestation verify sbom-source.cdx.json --repo n8n-io/n8n --owner n8n-io
```

See `enterprise-sbom-guide.md` for the full recommended workflow.

---

## References

- [anchore/syft GitHub](https://github.com/anchore/syft)
- [Syft 1.20: Smarter License Detection](https://anchore.com/blog/syft-1-20-faster-scans-smarter-license-detection-and-enhanced-bitnami-support/)
- [Anchore: Introducing Grant](https://anchore.com/blog/introducing-grant-a-new-oss-project-from-anchore/)
- [Earthly Lunar: has-licenses guardrail](https://earthly.dev/lunar/guardrails/sbom/has-licenses/syft/)
- [Issue #2611: Remote license enrichment parse failures](https://github.com/anchore/syft/issues/2611)
- [Issue #3914: pnpm devDependencies included by default](https://github.com/anchore/syft/issues/3914)
- [Issue #1479: Zero npm deps on array license field](https://github.com/anchore/syft/issues/1479)
