# SBOM License Gap Analysis

**Date:** 2026-06-07
**Baseline image:** `docker.io/n8nio/n8n:latest` (v2.23.4)
**Tool:** syft 1.44.0, `--enforce-prefix=pkg:npm/` (OS packages excluded from gate)
**Enriched SBOM result:** 1525/1525 components licensed, 0 failures

This document records what gaps existed in raw syft output, what was fixed at
source, and what remains as a structural syft limitation (not an n8n gap).

---

## Enriched SBOM status

**Fully clean.** The enriched release SBOM (`sbom-source.cdx.json`) produced
by `sbom-generation-callable.yml` passes the SPDX gate with zero failures.

```
totalComponents: 1525
enforced: 1525
failures: 0
warnings: 2  (dual-licensed; MIT elected for both — non-blocking)
```

The rest of this document covers the raw syft picture and what was done to
close the gaps.

---

## Fixed: Category A — First-party packages missing `license` field

**Raw syft baseline:** 30 failures (production) / 34 (dev)
**Status:** ✅ Resolved

All `@n8n/*` and `n8n-*` packages had either no `license` field or
inconsistent free-text strings (`"See LICENSE.md file in the root of the
repository"`, `"https://docs.n8n.io/sustainable-use-license/"`, `"none"`).

**Fix:** Updated 58 `package.json` files to `"LicenseRef-n8n-sustainable-use"`.

`"SEE LICENSE IN LICENSE.md"` (npm convention) was considered and rejected —
syft outputs it as `license.name` (free-text), not `license.id`, and it fails
SPDX validation. `LicenseRef-n8n-sustainable-use` is proper SPDX LicenseRef
syntax and is output by syft as `license.id`.

**Packages updated:**

`@n8n/agents`, `@n8n/ai-node-sdk`, `@n8n/ai-utilities`, `@n8n/ai-workflow-builder`,
`@n8n/api-types`, `@n8n/backend-common`, `@n8n/backend-test-utils`, `@n8n/chat`,
`@n8n/chat-hub`, `@n8n/client-oauth2`, `@n8n/composables`, `@n8n/computer-use`,
`@n8n/config`, `@n8n/constants`, `@n8n/crdt`, `@n8n/create-node`, `@n8n/db`,
`@n8n/decorators`, `@n8n/design-system`, `@n8n/di`, `@n8n/engine`, `@n8n/errors`,
`@n8n/eslint-config`, `@n8n/eslint-plugin-community-nodes`, `@n8n/expression-runtime`,
`@n8n/extension-sdk`, `@n8n/i18n`, `@n8n/imap`, `@n8n/instance-ai`,
`@n8n/local-gateway`, `@n8n/mcp-apps`, `@n8n/mcp-browser`, `@n8n/mcp-browser-extension`,
`@n8n/n8n-benchmark`, `@n8n/n8n-extension-insights`, `@n8n/n8n-nodes-langchain`,
`@n8n/node-cli`, `@n8n/performance`, `@n8n/permissions`, `@n8n/rest-api-client`,
`@n8n/scan-community-package`, `@n8n/stores`, `@n8n/storybook`, `@n8n/stylelint-config`,
`@n8n/syslog-client`, `@n8n/task-runner`, `@n8n/typescript-config`, `@n8n/utils`,
`@n8n/vitest-config`, `@n8n/workflow-sdk`, `n8n`, `n8n-core`, `n8n-editor-ui`,
`n8n-node-dev`, `n8n-nodes-base`, `n8n-playwright`, `n8n-workflow`, `@n8n/cli`

---

## Fixed: Category B — Test/example dirs in production packages

**Raw syft baseline:** 7 phantom packages
**Status:** ✅ Resolved

Production packages with no `files` field publish their full source tree.
Syft inventories each subdirectory containing a `package.json` as a separate
package with no license data.

**Fix:** `scripts/build-n8n.mjs` strips these directories from the production
closure after `pnpm deploy`.

| Phantoms removed | Source package | Subdirectory |
|---|---|---|
| `baz`, `false_main`, `invalid_main`, `browser_field` | `resolve@1.22.11` | `test/resolver/` |
| `test-fixtures` | `import-in-the-middle@1.15.0` | `test/fixtures/` |
| `beep-boop` | `github-from-package@0.0.0` | `example/` |
| `tedious-benchmarks` | `tedious@16.7.1` | `benchmarks/` |

---

## Fixed: EE SDK license misclassification

**Status:** ✅ Resolved

`@n8n_io/license-sdk` and `@n8n_io/ai-assistant-sdk` were being stamped
`LicenseRef-n8n-sustainable-use` by the first-party enrichment path because
`FIRST_PARTY_PATTERNS` matches `pkg:npm/%40n8n_io/`. Both packages ship
`LICENSE_EE.md` (n8n Enterprise License) and are not covered by the Sustainable
Use License.

**Fix:** PURL-pinned overrides in `license-overrides.json` set both to
`LicenseRef-n8n-enterprise`, which takes precedence over the first-party
stamping path (`wasOverridden` check).

---

## Remaining: Structural syft limitations (not n8n gaps)

These appear in raw syft scans but are **not present in the enriched release
SBOM**. They reflect how syft scans Docker image filesystems, not gaps in
n8n's licensing.

### Subpath export phantoms

Syft's `**/package.json` glob picks up stub package.json files inside npm
subpath export directories as separate packages (`@UNKNOWN` version).

`@google/genai/node@UNKNOWN`, `@google/genai/web@UNKNOWN`,
`@google/generative-ai-server@UNKNOWN`, `@linear/sdk/webhooks@UNKNOWN`,
`chart.js-auto@UNKNOWN`, `chart.js-helpers@UNKNOWN`,
`web-streams-polyfill@UNKNOWN` (×3), `web-streams-polyfill-es2018@UNKNOWN`,
`web-streams-polyfill-es6@UNKNOWN`, `web-streams-ponyfill@UNKNOWN`,
`web-streams-ponyfill-es2018@UNKNOWN`, `web-streams-ponyfill-es6@UNKNOWN`

None have npm registry entries. Identifiable by `@UNKNOWN` version.

### Third-party non-SPDX strings

Valid licenses in free-text format that syft passes through without
normalisation. Covered by `license-overrides.json` in the enriched pipeline.

| Package | Raw value | Resolved SPDX |
|---|---|---|
| `@ewoudenberg/difflib@0.1.0` | `PSF` | `Python-2.0` |
| `amqplib-tutorials@0.0.1` | `MPL 2.0` | `MPL-2.0` |
| `duck@0.1.12` | `BSD` | `BSD-2-Clause` |
| `nub@0.0.0` | `MIT/X11` | `MIT` |
| `qrcode-terminal@0.12.0` | `Apache 2.0` | `Apache-2.0` |
| `utf7@1.0.2` | `BSD` | `BSD-2-Clause` |
| `xml-escape@1.1.0` | `MIT License` | `MIT` |

### Third-party missing `license` field

Packages published to npm without a `license` field. Covered by
`license-overrides.json` in the enriched pipeline.

| Package | Actual license | Source |
|---|---|---|
| `@getzep/zep-cloud@1.0.6` | Apache-2.0 | GitHub repo |
| `dreamopt@0.8.0` | MIT | GitHub repo |
| `js-nacl@1.4.0` | MIT | LICENSE file in package |
| `wa-sqlite@1.0.9` | MIT | LICENSE file in tarball (GitHub install) |

### `@n8n/sandbox-client`

Not in this monorepo's `packages/` tree. Needs `"license": "LicenseRef-n8n-sustainable-use"` added at its source.

---

## Summary

| Category | Raw syft baseline | Raw syft now | Enriched SBOM |
|---|---|---|---|
| First-party missing/inconsistent | 30 | 0 | 0 ✅ |
| Test fixture phantoms | 7 | 0 | 0 ✅ |
| EE SDK misclassified | 2 | 0 | 0 ✅ |
| Subpath export phantoms | 13 | 13 | 0 ✅ |
| Third-party non-SPDX strings | 7 | 7 | 0 ✅ |
| Third-party missing field | 4 | 4 | 0 ✅ |
| Untracked first-party (`sandbox-client`) | 1 | 1 | 0 ✅ |
| **Total** | **62** | **25** | **0** |
