# Helm Chart E2E Testing

Test n8n Helm chart deployments using K3s (lightweight Kubernetes) inside Docker, powered by `@testcontainers/k3s`.

## Scope

The chart lives in [`n8n-io/n8n-hosting`](https://github.com/n8n-io/n8n-hosting). Its CI and this stack test different things.

| Check | Owner |
|---|---|
| Chart lint, unit tests, schema, and Kubernetes resource checks | Chart CI |
| Every chart example installs on released n8n | Chart CI |
| Chart upgrade from the previous major | Chart CI |
| An unreleased n8n build works on the released chart | This stack |
| n8n behaves correctly in the chart topology (worker, runner sidecar) | This stack |

Do not add chart-only checks here. Add them to the chart CI.

The stack reuses the chart CI inputs, so that the two do not drift:

- **Values:** `charts/n8n/examples/<example>.yaml`, then the overlay `charts/n8n/ci/install/<example>.yaml`.
- **Secrets and fixtures:** `charts/n8n/ci/prepare-cluster.sh` creates the Secrets and starts Postgres and Redis.

The chart ref is pinned to a tag in `helm-stack.ts`. The stack needs chart 2.0 or later.

## Prerequisites

### Required

- **Docker Desktop** (macOS/Windows) or **Docker Engine** (Linux)
- **Privileged container support** — K3s runs as a privileged container
- **helm** CLI — runs on your host machine ([install](https://helm.sh/docs/intro/install/))
- **kubectl** CLI — runs on your host machine ([install](https://kubernetes.io/docs/tasks/tools/))
- **n8n and runner Docker images** — built locally (`pnpm build:docker`) or pulled from Docker Hub. The chart starts a runner sidecar by default. The runner image must have the same tag as the n8n image.

### Not Required

- Kind, Minikube, or any other K8s distribution
- Kubernetes cluster access
- Any K8s tooling beyond helm + kubectl

### Privileged Container Compatibility

| Environment | Supported | Notes |
|---|---|---|
| Docker Desktop (macOS/Windows) | Yes | Privileged enabled by default |
| Docker Engine (Linux) | Yes | Standard daemon supports it |
| GitHub Actions (ubuntu runners) | Yes | Docker socket available |
| Blacksmith runners | Yes | Standard Docker-capable VMs |
| Rootless Docker | **No** | K3s requires privileged mode |
| Docker-in-Docker | Depends | Outer container needs `--privileged` |
| Podman | **No** | K3s requires Docker-compatible runtime |

## How It Works

```
Host Machine (helm, kubectl)
├── KUBECONFIG=~/.kube/n8n-helm-<example>.yaml
└── Docker
    └── K3s Container (privileged, NodePort 30080 → host random port)
        ├── containerd (K3s runtime)
        │   └── n8n and runner images (preloaded from host Docker)
        └── Kubernetes control plane
            ├── n8n Pods (Helm-deployed, with the runner sidecar)
            ├── Postgres and Redis (chart CI fixtures)
            └── Service (NodePort 30080 → Pod 5678)

Playwright ──── http://localhost:<host-port> ──→ NodePort ──→ n8n Pod
```

1. The chart is downloaded at the pinned ref. An unknown example fails here.
2. `@testcontainers/k3s` starts K3s inside a Docker container with NodePort 30080 exposed
3. The n8n and runner images are pulled into K3s's containerd, or imported from host Docker
4. The chart's `prepare-cluster.sh` creates the Secrets and starts the Postgres and Redis fixtures
5. Host `helm` installs the chart with the example and its overlay
6. The n8n service is patched to NodePort, routing traffic through K3s's exposed port
7. Playwright tests connect via `N8N_BASE_URL=http://localhost:<host-port>`

## Local Usage

```bash
# 1. Build the n8n and runner Docker images (or use Docker Hub images)
pnpm build:docker

# 2. Start the Helm stack (takes ~60-120s)
cd packages/quality/environments/containers
pnpm stack:helm --env E2E_TESTS=true --env NODE_ENV=development

# 3. In another terminal, debug with kubectl (the stack activates its context)
kubectl get pods
kubectl logs -l app.kubernetes.io/name=n8n --all-containers

# 4. Run tests
N8N_BASE_URL=http://localhost:<port> RESET_E2E_DB=true \
  pnpm --filter n8n-playwright exec playwright test --project=e2e tests/e2e/nodes/code-node-api.spec.ts --workers=1

# 5. Cleanup
pnpm stack:helm:clean
```

The stack passes `N8N_LICENSE_ACTIVATION_KEY`, `N8N_LICENSE_TENANT_ID`, and `N8N_LICENSE_CERT` from the host environment to the n8n pods. An `--env` value overrides the host value.

### Test a Specific Version Matrix

```bash
# Test a published n8n version against the chart main branch
pnpm stack:helm --image n8nio/n8n:nightly --chart-ref main

# Test the local n8n image against a chart PR branch
pnpm stack:helm --chart-ref fix/pvc-permissions

# Test a GHCR image (e.g., from CI)
pnpm stack:helm --image ghcr.io/n8n-io/n8n:ci-12345
```

### CLI Options

```
--example <name>      Chart example to install (default: standalone). `minimal` is queue
                      mode: PostgreSQL + Redis + one worker.
--image <image>       n8n Docker image (default: n8nio/n8n:local). The runner image is the
                      same name with `runners` as the last path segment.
--chart-ref <ref>     Git branch/tag for n8n-hosting (default: the tag pinned in helm-stack.ts)
--chart-repo <url>    Git repo URL (default: https://github.com/n8n-io/n8n-hosting.git)
--k3s-image <image>   K3s image (default: rancher/k3s:v1.32.2-k3s1)
--env <KEY=VALUE>     Set an environment variable in the n8n pods (repeatable)
--url-file <path>     Write URL to file when ready (for CI automation)
--help                Show help
```

## CI Usage

The `test-e2e-helm.yml` workflow handles everything:

- **Trigger:** Nightly, a pull request that changes the harness, or manual dispatch
- **Build:** Creates the n8n and runner Docker images, pushes to GHCR
- **Test:** For the `standalone` and `minimal` examples, starts K3s, installs the chart, and runs a Code node execution
- **Cleanup:** Removes the ephemeral GHCR images
- **Alert:** A nightly failure posts to Slack

Manual dispatch accepts `branch` and `helm-chart-ref`. Use `branch` to test `3.x`.

To add a profile, add the chart example name to the workflow matrix. The stack does not run the chart's `ci/install/<example>.pre.sh` hooks, so examples that have one are not supported.

### Why a Code node execution

The chart runs n8n with external task runners. In queue mode, the chart also sends manual executions to the worker, and only the worker pod has the runner sidecar. A Code node execution passes only when main, Redis, the worker, and the sidecar work together.

## Troubleshooting

### K3s won't start

Check that Docker supports privileged containers:
```bash
docker run --rm --privileged alpine echo "privileged works"
```

### Image not found in K3s

Ensure the n8n Docker image exists locally:
```bash
docker images | grep n8nio/n8n
```

If empty, run `pnpm build:docker` first.

### Helm install times out

Use kubectl to inspect the cluster:
```bash
export KUBECONFIG=~/.kube/n8n-helm-<example>.yaml
kubectl get pods -o wide
kubectl describe pod -l app.kubernetes.io/name=n8n
kubectl get events --sort-by=.lastTimestamp
```

### Port not accessible

NodePort routing is stateless (kube-proxy), so connectivity issues typically indicate the pod is unhealthy. Check pod status:
```bash
export KUBECONFIG=~/.kube/n8n-helm-<example>.yaml
kubectl get pods -o wide
kubectl describe pod -l app.kubernetes.io/name=n8n
kubectl version --client
helm version
```

### Slow startup

First run is slower due to K3s image pull. Typical timings:

| Phase | First Run | Subsequent |
|---|---|---|
| K3s start | ~15-30s | ~5s (reuse) |
| Image preload | ~10-20s | ~10-20s |
| Helm install | ~5-10s | ~5-10s |
| n8n boot | ~15-30s | ~15-30s |
| **Total** | **~60-120s** | **~40-80s** |

## Comparison: Testcontainers vs K3s + Helm

| | Testcontainers (Stream 1) | K3s + Helm (Stream 2) |
|---|---|---|
| **Purpose** | Feature testing | Deployment validation |
| **Speed** | 5-15s startup | 60-120s startup |
| **K8s features** | None | PVC, RBAC, securityContext, NetworkPolicy |
| **Custom services** | Kafka, Mailpit, OIDC, etc. | Only what the Helm chart defines |
| **What it proves** | "n8n works with X" | "this chart config deploys correctly" |
| **When to run** | Every PR | On demand, nightly, pre-release |
| **Prerequisites** | Docker | Docker + helm + kubectl |
