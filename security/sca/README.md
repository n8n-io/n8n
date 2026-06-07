# Software Composition Analysis (SCA)

This folder documents n8n's SCA posture: how we generate, enrich, and attest
SBOMs, what tooling we use, and where to find the authoritative compliance
artifacts.

## Contents

| File | Purpose |
|---|---|
| `README.md` | This file — pipeline overview, tooling, key scripts |
| `syft-research.md` | Syft design philosophy, known npm limitations, and why raw syft output is not a compliance gate |
| `enterprise-sbom-guide.md` | The right artifacts for SBOM compliance review and how to verify them |
| `gap-analysis.md` | Historical inventory of SBOM license gaps, what was fixed, and what remains in raw syft scans |

---

## SCA posture summary

**1525 components. 0 license failures. No copyleft in force.**

Every component in the enriched release SBOM carries a valid SPDX license
identifier. The two dual-licensed packages (`jszip`, `mailsplit`) elect MIT
over their copyleft alternatives; that election is recorded in the SBOM.

---

## SBOM Pipelines

n8n runs two distinct SBOM pipelines:

### 1. Release SBOM (source-level)

Triggered by `sbom-generation-callable.yml` on every release.

```
pnpm build:deploy (N8N_GENERATE_LICENSES=true)
  └─ cdxgen  →  sbom-source.cdx.json
  └─ enrich-sbom.mjs  →  resolves first-party + override licenses
  └─ check-sbom-licenses.mjs  →  SPDX gate (release-blocking)
  └─ actions/attest  →  signed attestation against package.json
  └─ gh release upload  →  attached to GitHub release
```

This is the **authoritative compliance artifact**. It is enriched, fully
licensed, SPDX-gated, and cryptographically attested.

### 2. Docker Image SBOM (image-level)

Triggered by `docker-build-push.yml` → `sbom-attestation` job on
`stable`/`rc`/`nightly` builds.

```
docker push  →  image in GHCR
  └─ cdxgen -t docker  →  OS + npm scan of the pushed image
  └─ enrich-sbom.mjs  →  resolves licenses, drops phantom npm
  └─ check-sbom-licenses.mjs  →  SPDX gate (npm only)
  └─ cosign attest  →  attested to image digest
```

---

## Tooling

| Tool | Role | Where used |
|---|---|---|
| cdxgen | SBOM generation (source + image) | CI pipelines |
| syft | SBOM generation (local dev / ad-hoc) | Local investigation |
| enrich-sbom.mjs | License enrichment | `scripts/licenses/` |
| check-sbom-licenses.mjs | SPDX compliance gate | CI + local |
| cosign | SBOM attestation to image digest | CI |
| actions/attest | SBOM attestation to release artifact | CI |

See `scripts/licenses/` for the enrichment and gate scripts.
See `security/vex.openvex.json` for the VEX document attested alongside the image.

---

## Key Scripts

```bash
# Gate a CycloneDX SBOM on SPDX licenses
node scripts/licenses/check-sbom-licenses.mjs <sbom.json> \
  --allow-ref=LicenseRef-n8n-sustainable-use \
  --allow-ref=LicenseRef-n8n-enterprise \
  --enforce-prefix=pkg:npm/

# Enrich a raw SBOM (resolves overrides + first-party)
node scripts/licenses/enrich-sbom.mjs <sbom.json>

# Run syft against the published production image (local investigation)
syft registry:docker.io/n8nio/n8n:latest \
  --output cyclonedx-json=sbom-out.cdx.json
```
