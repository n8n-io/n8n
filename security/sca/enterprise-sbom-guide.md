# Enterprise SBOM Compliance Guide

This document is intended for enterprise customers and their security/procurement
teams who need to perform SBOM-based license compliance reviews of n8n.

---

## TL;DR

Do not run `syft docker.io/n8nio/n8n` and use the raw output as a compliance
gate. Use n8n's **published, enriched, and signed SBOM** attached to each
GitHub release instead.

---

## The right artifact: n8n's release SBOM

Every n8n release publishes a `sbom-source.cdx.json` to the GitHub release
page. This artifact:

- **Covers the full npm production closure** — every package shipped in the
  deployment bundle
- **Has resolved SPDX licenses** for every component — including n8n's own
  packages (via `LicenseRef-n8n-sustainable-use`) and third-party packages
  with non-standard license strings (via `scripts/licenses/license-overrides.json`)
- **Passes the SPDX gate** — `check-sbom-licenses.mjs` runs as a release-blocking
  step; the SBOM is only attached if every npm component has a valid SPDX
  identifier
- **Is cryptographically signed** — attested via GitHub's `actions/attest`
  (SLSA-compatible sigstore attestation), verifiable with `gh attestation verify`

### Downloading and verifying

```bash
# Download the SBOM for a specific release
gh release download n8n@2.25.0 \
  --repo n8n-io/n8n \
  --pattern sbom-source.cdx.json

# Verify the attestation (confirms it was produced by n8n's CI, not tampered)
gh attestation verify sbom-source.cdx.json \
  --repo n8n-io/n8n \
  --owner n8n-io

# Inspect component count and spot-check licenses
jq '.components | length' sbom-source.cdx.json
jq -r '.components[] | "\(.name)@\(.version) — \((.licenses[0].expression // .licenses[0].license.id // "?"))"' \
  sbom-source.cdx.json | head -20
```

---

## Why raw syft output is not the right artifact

Syft is an SBOM **generator** — its role is to inventory what is present in an
image or directory. It is not a compliance tool. Anchore (syft's author) built
a separate tool (**Grant**) for license policy enforcement because raw SBOM
output always has gaps that require policy interpretation.

When an enterprise security scanner runs `syft docker.io/n8nio/n8n`, it will
encounter several categories of entries that appear as "no license declared"
or "non-SPDX license" in the raw output:

| Category | Example | Reality |
|---|---|---|
| First-party packages | `@n8n/config`, `n8n-workflow` | Licensed under n8n Sustainable Use License — `LicenseRef-n8n-sustainable-use` |
| Subpath export stubs | `@google/genai/node@UNKNOWN` | Not a real package — a filesystem artefact of npm subpath exports |
| Free-text license strings | `"Apache 2.0"` in `qrcode-terminal` | Valid Apache-2.0 license, non-standard string format |
| Third-party missing fields | `@getzep/zep-cloud` | Published without a `license` field — resolvable from LICENSE file |

None of these represent actual license gaps. They are artifacts of how npm
packages are published combined with syft's filesystem-level scanning approach.

n8n's release SBOM pipeline resolves all of these before the SBOM is published.

---

## n8n's license picture

### First-party packages

All n8n-owned packages (`@n8n/*`, `n8n`, `n8n-core`, `n8n-nodes-base`,
`n8n-workflow`, `n8n-editor-ui`) are published under the
**n8n Sustainable Use License** — `LicenseRef-n8n-sustainable-use` in SPDX
LicenseRef notation. The full license text is at
https://docs.n8n.io/sustainable-use-license/ and in `LICENSE.md` at the root
of the repository.

Packages intentionally under different OSI licenses (community tooling,
codemirror extensions) carry their own identifiers (`MIT`, `Apache-2.0`, `ISC`).

### Private SDKs

`@n8n_io/license-sdk` and `@n8n_io/ai-assistant-sdk` are closed-source
internal SDKs not distributed to end-users. They appear in the Docker image
as runtime dependencies but are not part of the open-source distribution.
Their `UNLICENSED` status in raw scans is correct and intentional.

### Third-party dependencies

All third-party npm dependencies are OSI-licensed. The resolved license for
each is recorded in the SBOM. A rendered human-readable version is available
at `/rest/third-party-licenses` on any running n8n instance, and as
`THIRD_PARTY_LICENSES.md` attached to each GitHub release.

---

## For procurement / contract review

If you need n8n to provide an SBOM as part of a contract or procurement
process:

1. **Point your team at the GitHub release page** for the version under review.
   The `sbom-source.cdx.json` and `THIRD_PARTY_LICENSES.md` artifacts are
   attached to every release.

2. **Verify the attestation** to confirm the SBOM was produced by n8n's
   official CI pipeline and has not been modified.

3. **For questions about specific packages**, the `THIRD_PARTY_LICENSES.md`
   rendered document is more human-readable than the raw CycloneDX JSON and
   covers the same set of components.

4. **For Docker image scanning specifically**, note that syft is designed as a
   generation tool — the recommended compliance workflow is:
   `syft (generate) → Grant/FOSSA/Snyk (apply policy)`. If your scanner is
   using raw syft output as a compliance gate, ask your security vendor about
   integrating with Anchore Grant or a commercial equivalent for the policy
   enforcement layer.

---

## Contacts

For SBOM and license compliance questions, contact n8n's security team via the
channels listed in `SECURITY.md` at the root of the repository.
