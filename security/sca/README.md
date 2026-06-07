# Software Composition Analysis (SCA)

This folder documents n8n's SBOM and SCA approach, including tooling research,
known limitations, and guidance for enterprise customers.

## Contents

| File | Purpose |
|---|---|
| `README.md` | This file — architecture, tooling, pipeline overview |
| `syft-research.md` | Syft design philosophy, known npm limitations, and why raw syft output is not a compliance gate |
| `enterprise-sbom-guide.md` | What enterprise customers should use for SBOM compliance review |
| `gap-analysis.md` | Categorised inventory of raw syft failures, what was fixed, and what remains |

---

## SBOM Pipelines

n8n runs two distinct SBOM pipelines:

### 1. Release SBOM (source-level)

Triggered by `sbom-generation-callable.yml` on every release.

```
pnpm build:deploy (N8N_GENERATE_LICENSES=true)
  └─ cdxgen  →  sbom-source.cdx.json
  └─ enrich-sbom.mjs  →  resolves first-party + override licenses
  └─ check-sbom-licenses.mjs  →  SPDX gate (blocks release on failure)
  └─ actions/attest  →  signed attestation against package.json
  └─ gh release upload  →  attached to GitHub release
```

This is the **authoritative compliance artifact**. It is enriched, fully
licensed, SPDX-gated, and cryptographically attested. Enterprise customers
should use this, not generate their own scan.

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
See `security/vex.openvex.json` for the VEX (Vulnerability Exploitability
eXchange) document attested alongside the image.

---

## Key Scripts

```bash
# Gate a CycloneDX SBOM on SPDX licenses (npm components only)
node scripts/licenses/check-sbom-licenses.mjs <sbom.json> \
  --allow-ref=LicenseRef-n8n-sustainable-use \
  --enforce-prefix=pkg:npm/

# Enrich a syft-generated SBOM (resolves overrides + first-party)
node scripts/licenses/enrich-sbom.mjs <sbom.json> --drop-phantom-npm

# Run syft against the published production image
syft registry:docker.io/n8nio/n8n:latest \
  --output cyclonedx-json=sbom-out.cdx.json

# Run syft with npm remote license fetching (slower, marginal benefit)
SYFT_JAVASCRIPT_SEARCH_REMOTE_LICENSES=true \
  syft <image> --enrich javascript \
  --output cyclonedx-json=sbom-out.cdx.json
```
