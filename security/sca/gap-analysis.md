# SBOM License Gap Analysis

**Date:** 2026-06-07  
**Image tested:** `docker.io/n8nio/n8n:latest` (v2.23.4) + local dev build (v2.25.1)  
**Tool:** syft 1.44.0 with `--enforce-prefix=pkg:npm/` (OS packages excluded)  
**Baseline:** 62 failures on production image before any fixes

---

## Starting point (v2.23.4 production image, raw syft)

```
totalComponents: 4424
enforced (npm): 1730
failures: 62
warnings: 2 (dual-licensed with copyleft alternative — non-blocking)
```

---

## Category A — First-party packages with no `license` field

**Count:** 30 (production) / 34 (dev build)  
**Status:** ✅ Fixed (committed to branch)

All `@n8n/*` and `n8n-*` packages had either no `license` field or
inconsistent free-text strings (`"See LICENSE.md file in the root of the
repository"`, `"https://docs.n8n.io/sustainable-use-license/"`, `"none"`).

**Fix:** Updated 58 package.json files to `"LicenseRef-n8n-sustainable-use"`.

Note: `"SEE LICENSE IN LICENSE.md"` (npm convention) was considered but
rejected — syft outputs it as `license.name` (free-text), not `license.id`,
and it still fails SPDX validation. `LicenseRef-n8n-sustainable-use` is proper
SPDX LicenseRef syntax and is output by syft as `license.id`.

**Packages fixed:**

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

## Category B — Test/example dirs in production packages

**Count:** 7 phantom packages  
**Status:** ✅ Fixed (committed to branch)

Production npm packages with no `files` field publish their entire directory
tree, including test fixtures. syft inventories each subdirectory with a
`package.json` as a separate package with no license data.

**Fix:** `scripts/build-n8n.mjs` now strips these directories from the
production deployment closure after `pnpm deploy`:

| Phantom packages removed | Source package | Directory |
|---|---|---|
| `baz`, `false_main`, `invalid_main`, `browser_field` | `resolve@1.22.11` | `test/resolver/` |
| `test-fixtures` | `import-in-the-middle@1.15.0` | `test/fixtures/` |
| `beep-boop` | `github-from-package@0.0.0` | `example/` |
| `tedious-benchmarks` | `tedious@16.7.1` | `benchmarks/` |

---

## Remaining failures after fixes (28 on dev build v2.25.1)

### Group 1 — Subpath export phantoms (13, `@UNKNOWN` version)

Syft mis-identifies npm subpath export stub `package.json` files as separate
packages. These have no npm registry entry and no license data.

`@google/genai/node@UNKNOWN`, `@google/genai/web@UNKNOWN`,
`@google/generative-ai-server@UNKNOWN`, `@linear/sdk/webhooks@UNKNOWN`,
`chart.js-auto@UNKNOWN`, `chart.js-helpers@UNKNOWN`,
`web-streams-polyfill@UNKNOWN` (×3), `web-streams-polyfill-es2018@UNKNOWN`,
`web-streams-polyfill-es6@UNKNOWN`, `web-streams-ponyfill@UNKNOWN`,
`web-streams-ponyfill-es2018@UNKNOWN`, `web-streams-ponyfill-es6@UNKNOWN`

**Options:**
- `.syftignore` in the Docker image targeting `**/es2018/package.json` patterns
- `enrich-sbom.mjs` phantom detection extended for syft format
- Accept as known false positives (they have `@UNKNOWN` version — easily
  identifiable as non-real packages)

### Group 2 — Third-party free-text strings (7)

Valid licenses written in non-SPDX format. Already handled in the enriched
release SBOM via `scripts/licenses/license-overrides.json`. Raw syft cannot
resolve these without enrichment.

| Package | Raw value | Correct SPDX |
|---|---|---|
| `@ewoudenberg/difflib@0.1.0` | `PSF` | `Python-2.0` |
| `amqplib-tutorials@0.0.1` | `MPL 2.0` | `MPL-2.0` |
| `duck@0.1.12` | `BSD` | `BSD-2-Clause` |
| `nub@0.0.0` | `MIT/X11` | `MIT` |
| `qrcode-terminal@0.12.0` | `Apache 2.0` | `Apache-2.0` |
| `utf7@1.0.2` | `BSD` | `BSD-2-Clause` |
| `xml-escape@1.1.0` | `MIT License` | `MIT` |

### Group 3 — Third-party genuinely missing license field (3)

Packages published to npm without a `license` field. Not resolvable by syft
even with remote enrichment enabled.

| Package | Notes |
|---|---|
| `@getzep/zep-cloud@1.0.6` | Zep AI SDK — Apache-2.0 per GitHub repo |
| `dreamopt@0.8.0` | CLI parser — MIT per GitHub repo |
| `js-nacl@1.4.0` | NaCl bindings — MIT per LICENSE file |

These can be added to `license-overrides.json` for the enriched pipeline.
For raw syft, the only fix is the upstream maintainer publishing a `license`
field.

### Group 4 — Private SDKs (2, intentional)

| Package | Value | Notes |
|---|---|---|
| `@n8n_io/ai-assistant-sdk@1.21.0` | `UNLICENSED` | Closed-source internal SDK |
| `@n8n_io/license-sdk@2.25.0` | `UNLICENSED` | Closed-source internal SDK |

These are correct and intentional. Enterprise customers asking about these
should be directed to their n8n account team for contractual context.

### Group 5 — Untracked first-party package (1)

| Package | Notes |
|---|---|
| `@n8n/sandbox-client@0.0.4` | Not in the monorepo `packages/` tree — likely a separately published package. Needs `LicenseRef-n8n-sustainable-use` added at its source. |

---

## Summary

| Category | Before | After | Method |
|---|---|---|---|
| First-party missing/inconsistent | 30 | 0 | Added `LicenseRef-n8n-sustainable-use` to 58 package.json files |
| Test fixture phantoms | 7 | 0 | Strip dirs in `build-n8n.mjs` post-deploy |
| Subpath export phantoms | 13 | 13 | Open — `.syftignore` or accept as known |
| Third-party free-text strings | 7 | 7 | In `license-overrides.json` for enriched pipeline; raw syft gap |
| Third-party missing field | 3 | 3 | Upstream fix needed; can add to overrides |
| Private SDKs | 2 | 2 | Intentional — not a gap |
| Untracked first-party | 1 | 1 | Needs fix at source |
| **Total** | **62** | **26** | |

---

## Notes on enrichment pipeline

Running `enrich-sbom.mjs` against a raw syft SBOM resolves Categories A and B
(first-party + overrides), taking 62 → 23 in testing. The phantom detector
in `enrich-sbom.mjs` is calibrated for cdxgen output format and does not
currently handle syft's format for subpath phantoms.
