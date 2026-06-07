# SBOM Compliance Guide

This document describes the artifacts n8n produces for SBOM-based license
compliance review and how to verify them.

---

## TL;DR

Use n8n's **published, enriched, and signed SBOM** attached to each GitHub
release. Do not use a raw syft scan of the Docker image as a compliance
artifact — see `syft-research.md` for why raw syft output is not designed
to serve that role.

---

## The authoritative artifact: n8n's release SBOM

Every n8n release publishes `sbom-source.cdx.json` to the GitHub release page.
This artifact:

- **Covers the full npm production closure** — every package shipped in the
  deployment bundle, resolved from the actual compiled output
- **Has resolved SPDX licenses for every component** — first-party packages
  carry `LicenseRef-n8n-sustainable-use` or `LicenseRef-n8n-enterprise`;
  third-party packages with non-standard license strings are normalised via
  `scripts/licenses/license-overrides.json`
- **Passes the SPDX gate** — `check-sbom-licenses.mjs` runs as a
  release-blocking step; the SBOM is only attached if every npm component has
  a valid SPDX identifier or allowed LicenseRef
- **Is cryptographically signed** — attested via GitHub's `actions/attest`
  (SLSA-compatible sigstore attestation)

### Downloading and verifying

```bash
# Download the SBOM for a specific release
gh release download n8n@2.25.0 \
  --repo n8n-io/n8n \
  --pattern sbom-source.cdx.json

# Verify the attestation (confirms it was produced by n8n's CI, not tampered with)
gh attestation verify sbom-source.cdx.json \
  --repo n8n-io/n8n \
  --owner n8n-io

# Inspect component count and spot-check licenses
jq '.components | length' sbom-source.cdx.json
jq -r '.components[] | "\(.name)@\(.version) — \((.licenses[0].expression // .licenses[0].license.id // "?"))"' \
  sbom-source.cdx.json | head -20
```

---

## n8n's license picture

### Third-party dependencies

All third-party npm dependencies are OSI-licensed. The two dual-licensed
packages in the tree (`jszip`, `mailsplit`) offer MIT as an alternative to
their copyleft option; n8n elects MIT for both, recorded as
`cdx:license:elected` in the SBOM. **There is no copyleft license in force
anywhere in the dependency tree.**

A human-readable rendering is available at `/rest/third-party-licenses` on any
running n8n instance and as `THIRD_PARTY_LICENSES.md` attached to each GitHub
release.

### First-party packages

All `@n8n/*`, `n8n`, `n8n-core`, `n8n-nodes-base`, `n8n-workflow`, and
`n8n-editor-ui` packages are under the **n8n Sustainable Use License**
(`LicenseRef-n8n-sustainable-use`). The full license text is at
https://docs.n8n.io/sustainable-use-license/ and in `LICENSE.md` at the root
of the repository.

Packages intentionally under a different OSI license (community tooling,
codemirror extensions) carry their own identifiers (`MIT`, `Apache-2.0`, `ISC`).

### Enterprise SDK components

`@n8n_io/license-sdk` and `@n8n_io/ai-assistant-sdk` are closed-source
components present in the Docker image as runtime dependencies. They are
licensed under the **n8n Enterprise License** (`LicenseRef-n8n-enterprise`),
which requires a valid n8n Enterprise contract. Their presence in the SBOM is
correct and intentional.

---

## Why raw syft output differs from the release SBOM

Syft is designed as an SBOM generator, not a compliance tool. When run against
the Docker image directly, it produces a raw inventory that includes:

| What syft reports | What it actually is |
|---|---|
| `@n8n/config — no license` | Licensed under `LicenseRef-n8n-sustainable-use`; syft reads the npm registry which has the old metadata |
| `@google/genai/node@UNKNOWN` | A subpath export stub, not a real package |
| `"Apache 2.0"` on `qrcode-terminal` | Valid Apache-2.0, non-SPDX string format |
| `@n8n_io/license-sdk — UNLICENSED` | Licensed under `LicenseRef-n8n-enterprise`; `UNLICENSED` was the old `package.json` value |

The release SBOM resolves all of these. Raw syft output should be fed into a
policy tool (Anchore Grant, FOSSA, Snyk) rather than used directly as a
compliance gate — see `syft-research.md` for the full explanation.

---

## For contract or procurement review

1. Download `sbom-source.cdx.json` from the GitHub release for the version
   under review.

2. Verify the attestation to confirm the SBOM was produced by n8n's official
   CI pipeline.

3. Use `THIRD_PARTY_LICENSES.md` for a human-readable rendering of the same
   component set.

4. For questions, contact n8n's security team via the channels in `SECURITY.md`.
