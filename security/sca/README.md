# Software Composition Analysis (SCA)

## Posture

Every component in the enriched release SBOM carries a valid SPDX license
identifier. The two dual-licensed packages in the tree (`jszip`, `mailsplit`)
offer MIT as an alternative to their copyleft option; n8n elects MIT for both,
recorded as `cdx:license:elected` in the SBOM. No copyleft license is in force.

---

## License picture

| Scope | License | Notes |
|---|---|---|
| `@n8n/*`, `n8n`, `n8n-core`, `n8n-nodes-base`, `n8n-workflow`, `n8n-editor-ui` | `LicenseRef-n8n-sustainable-use` | Full text at https://docs.n8n.io/sustainable-use-license/ |
| Community tooling, codemirror extensions | `MIT` / `Apache-2.0` / `ISC` | Intentionally OSI-licensed |
| `@n8n_io/license-sdk`, `@n8n_io/ai-assistant-sdk` | `LicenseRef-n8n-enterprise` | EE-only runtime components; require enterprise contract |
| All third-party npm dependencies | Permissive OSI | No copyleft; dual-licensed packages elect MIT |

A human-readable rendering is at `/rest/third-party-licenses` on any running
n8n instance and as `THIRD_PARTY_LICENSES.md` attached to each GitHub release.

---

## SBOM pipelines

### Release SBOM (authoritative)

Produced by `sbom-generation-callable.yml` on every release. This is the
artifact to use for compliance review.

```
pnpm build:deploy (N8N_GENERATE_LICENSES=true)
  └─ cdxgen          →  sbom-source.cdx.json
  └─ enrich-sbom.mjs →  resolves first-party + override licenses
  └─ check-sbom-licenses.mjs  →  SPDX gate (release-blocking)
  └─ actions/attest  →  signed attestation against package.json
  └─ gh release upload
```

### Docker image SBOM

Produced by the `sbom-attestation` job in `docker-build-push.yml` on
`stable`/`rc`/`nightly` builds.

```
docker push
  └─ cdxgen -t docker  →  OS + npm scan of the pushed image
  └─ enrich-sbom.mjs   →  resolves licenses
  └─ check-sbom-licenses.mjs  →  SPDX gate (npm only)
  └─ cosign attest     →  attested to image digest
```

---

## Verifying the SBOM

The enriched, attested SBOM is attached to every published Docker image via
cosign. Pull it once and run all checks against the file — this gives the
enriched picture with 0 unlicensed and 0 license failures.

```bash
# Pull the attested SBOM from any published image
cosign download attestation ghcr.io/n8n-io/n8n:<version> \
  --predicate-type https://cyclonedx.org/bom \
  | jq -r '.payload' | base64 -d | jq '.predicate' > sbom.cdx.json

# Verify it was produced by n8n's CI (not tampered with)
cosign verify-attestation ghcr.io/n8n-io/n8n:<version> \
  --type cyclonedx \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "https://github.com/n8n-io/n8n/.github/workflows/"

# Check for unlicensed packages — expect 0
grant check --unlicensed sbom.cdx.json

# Full license list
grant list sbom.cdx.json

# n8n's SPDX gate — expect 0 failures
node scripts/licenses/check-sbom-licenses.mjs sbom.cdx.json \
  --allow-ref=LicenseRef-n8n-sustainable-use \
  --allow-ref=LicenseRef-n8n-enterprise \
  --enforce-prefix=pkg:npm/

# Vulnerability scan
grype sbom:sbom.cdx.json

# Full audit — vulnerabilities + licenses
trivy sbom sbom.cdx.json
```

Replace `<version>` with `nightly`, `latest`, or a specific version tag
(e.g. `n8n@2.25.0`). The same image is available on both
`ghcr.io/n8n-io/n8n` and `docker.io/n8nio/n8n`.

---

## Copyleft explainer

The Docker image SBOM will show GPL/LGPL entries in `grant list`. These come
entirely from Alpine OS system packages (`busybox`, `git`, `libgcc`,
`libstdc++`, etc.). GPL in an OS binary has no effect on n8n's licensing
obligations or your use of n8n; they are inventoried in the SBOM for
completeness but are not gated by the license pipeline.

The npm layer contains no copyleft in force. The two dual-licensed packages
(`jszip`: MIT OR GPL-3.0-or-later, `mailsplit`: MIT OR EUPL-1.1+) elect MIT;
this election is recorded as `cdx:license:elected` in the SBOM.

---

## Release SBOM

For source-level compliance review, download from the GitHub release page:

```bash
gh release download n8n@<version> \
  --repo n8n-io/n8n \
  --pattern sbom-source.cdx.json

gh attestation verify sbom-source.cdx.json \
  --repo n8n-io/n8n \
  --owner n8n-io
```

---

## Tooling

| Tool | Role |
|---|---|
| cdxgen | SBOM generation (CycloneDX 1.6) |
| enrich-sbom.mjs | License enrichment (`scripts/licenses/`) |
| check-sbom-licenses.mjs | SPDX compliance gate (`scripts/licenses/`) |
| grant | License listing and unlicensed check |
| grype | Vulnerability scanning against SBOM |
| trivy | Full audit — vulnerabilities + licenses |
| cosign / actions/attest | SBOM attestation |

See `security/vex.openvex.json` for the VEX document attested alongside the image.
