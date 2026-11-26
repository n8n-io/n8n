# Deployment compatibility cells

API-only Playwright tests (project `deployment`, no browser, no e2e controller, 0 retries) that verify published n8n and task-runner images against real containers.

## Run locally

Set `TEST_IMAGE_N8N` and `TEST_IMAGE_TASK_RUNNER` for the cell you run. Without these variables, `n8n-containers` falls back to `n8nio/n8n:local` and `n8nio/runners:local`, which fail the distroless runner and `-pc` pointer-compression checks. Always set both variables explicitly when you pin images by `@sha256:` digest.

Run commands from the repository root with Docker running:

```bash
# IMG-01/IMG-05 (amd64) or IMG-02/IMG-06 (arm64): standard n8n + standard task runner
TEST_IMAGE_N8N=ghcr.io/n8n-io/n8n:nightly \
TEST_IMAGE_TASK_RUNNER=ghcr.io/n8n-io/runners:nightly \
pnpm --filter n8n-playwright test:deployment tests/deployment/standard-image-pair.spec.ts

# IMG-07: standard n8n + distroless task runner
TEST_IMAGE_N8N=ghcr.io/n8n-io/n8n:nightly \
TEST_IMAGE_TASK_RUNNER=ghcr.io/n8n-io/runners:nightly-distroless \
pnpm --filter n8n-playwright test:deployment tests/deployment/task-runner-distroless.spec.ts

# CRT-01 (amd64) or CRT-01/IMG-04/IMG-08 (arm64): -pc n8n + distroless task runner
TEST_IMAGE_N8N=ghcr.io/n8n-io/n8n:nightly-pc \
TEST_IMAGE_TASK_RUNNER=ghcr.io/n8n-io/runners:nightly-distroless \
pnpm --filter n8n-playwright test:deployment tests/deployment/cloud-image-pair.spec.ts
```

To test the `3.x` channel, replace `nightly` with `v3-nightly` (`v3-nightly`, `v3-nightly-pc`, `v3-nightly-distroless`).

## Cells

| Cell | Spec | `TEST_IMAGE_N8N` | `TEST_IMAGE_TASK_RUNNER` | Checks |
| --- | --- | --- | --- | --- |
| `IMG-01`/`IMG-05` (`amd64`), `IMG-02`/`IMG-06` (`arm64`) | `standard-image-pair.spec.ts` | Standard image (for example `ghcr.io/n8n-io/n8n:nightly`) | Standard runner (for example `ghcr.io/n8n-io/runners:nightly`) | `runCodeNodes({ python: true })` (JS + Python Code nodes), n8n and runner image refs and architecture, standard runner label and user `runner` |
| `IMG-07` | `task-runner-distroless.spec.ts` | Standard image (for example `ghcr.io/n8n-io/n8n:nightly`) | Distroless runner (for example `ghcr.io/n8n-io/runners:nightly-distroless`) | `runCodeNodes({ python: true })` (JS + Python Code nodes), n8n image ref and architecture, distroless runner label, architecture, and nonroot user `65532:65532` |
| `CRT-01` (`amd64`), `CRT-01`/`IMG-04`/`IMG-08` (`arm64`) | `cloud-image-pair.spec.ts` | Pointer-compressed `-pc` image (for example `ghcr.io/n8n-io/n8n:nightly-pc`) | Distroless runner (for example `ghcr.io/n8n-io/runners:nightly-distroless`) | `runCodeNodes({ python: true })` (JS + Python Code nodes), distroless runner, image architecture, V8 pointer compression enabled |

## Parameters

| Env | Default | Meaning |
| --- | --- | --- |
| `TEST_IMAGE_N8N` | `n8nio/n8n:local` | Published n8n image reference (tag or `@sha256:` digest) |
| `TEST_IMAGE_TASK_RUNNER` | Derived from `TEST_IMAGE_N8N` | Published task-runner image reference (set explicitly for distroless or digest-pinned images) |
| `DEPLOYMENT_CHANNEL` | `local` | Channel annotation (`master` or `3.x` in CI) |
| `DEPLOYMENT_ARCH` | Host arch (`amd64` on `x64`, `arm64` on `arm64`) | Expected container image architecture, annotation, and Currents group suffix |

## Layout

| File | Responsibility |
| --- | --- |
| `probe.ts` | Relative-path REST probe (`signIn`, `runWebhook`, `runCodeNodes`, `readExecution`, `roundTripBinary`), image, architecture, and runtime assertions, and the shared `runDeploymentCell()` runner |
| `standard-image-pair.spec.ts` | `@cell:IMG-01`/`@cell:IMG-05` (`amd64`) and `@cell:IMG-02`/`@cell:IMG-06` (`arm64`) spec for standard n8n with the standard task runner |
| `task-runner-distroless.spec.ts` | `@cell:IMG-07` spec for standard n8n with the distroless task runner |
| `cloud-image-pair.spec.ts` | `@cell:CRT-01` (`amd64`) and `@cell:CRT-01`/`@cell:IMG-04`/`@cell:IMG-08` (`arm64`) spec for `-pc` n8n with the distroless task runner |

## CI

`.github/workflows/test-deployment-cells.yml` ("Test: Deployment cells") runs nightly after `Docker: Build and Push` (`master`) and `Build: v3 Nightly Docker Images` (`3.x`), and supports manual `workflow_dispatch`. It resolves and pins the GHCR image digests, runs each matrix group with 0 retries, and reports to the `n8n-nightly-compatibility` Currents project (`tlfUav`).
