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

## Consuming the release SBOM

```bash
# Download
gh release download n8n@<version> \
  --repo n8n-io/n8n \
  --pattern sbom-source.cdx.json

# Verify the attestation
gh attestation verify sbom-source.cdx.json \
  --repo n8n-io/n8n \
  --owner n8n-io

# Inspect
jq '.components | length' sbom-source.cdx.json
```

---

## Tooling

| Tool | Role |
|---|---|
| cdxgen | SBOM generation |
| enrich-sbom.mjs | License enrichment (`scripts/licenses/`) |
| check-sbom-licenses.mjs | SPDX compliance gate (`scripts/licenses/`) |
| cosign / actions/attest | SBOM attestation |

See `security/vex.openvex.json` for the VEX document attested alongside the image.
