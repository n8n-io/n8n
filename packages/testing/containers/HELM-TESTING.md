# Helm Chart E2E Testing

Test n8n Helm chart deployments using K3s (lightweight Kubernetes) inside Docker, powered by `@testcontainers/k3s`.

## Prerequisites

### Required

- **Docker Desktop** (macOS/Windows) or **Docker Engine** (Linux)
- **Privileged container support** — K3s runs as a privileged container
- **helm** CLI — runs on your host machine ([install](https://helm.sh/docs/intro/install/))
- **kubectl** CLI — runs on your host machine ([install](https://kubernetes.io/docs/tasks/tools/))
- **n8n Docker image** — built locally (`pnpm build:docker`) or pulled from Docker Hub

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
├── KUBECONFIG=/tmp/helm-kubeconfig-*.yaml
└── Docker
    └── K3s Container (privileged, NodePort 30080 → host random port)
        ├── containerd (K3s runtime)
        │   └── n8n image (preloaded from host Docker)
        └── Kubernetes control plane
            ├── n8n Pod (Helm-deployed)
            └── Service (NodePort 30080 → Pod 5678)

Playwright ──── http://localhost:<host-port> ──→ NodePort ──→ n8n Pod
```

1. `@testcontainers/k3s` starts K3s inside a Docker container with NodePort 30080 exposed
2. The n8n Docker image is exported from host Docker and imported into K3s's containerd
3. Host `helm` installs the n8n chart using a kubeconfig pointing at the K3s API
4. The n8n service is patched to NodePort, routing traffic through K3s's exposed port
5. Playwright tests connect via `N8N_BASE_URL=http://localhost:<host-port>`

## Local Usage

```bash
# 1. Build the n8n Docker image (or use a Docker Hub image)
pnpm build:docker

# 2. Start the Helm stack (takes ~60-120s)
cd packages/testing/containers
pnpm stack:helm

# 3. In another terminal, use the printed KUBECONFIG for debugging
export KUBECONFIG=/tmp/helm-kubeconfig-*.yaml
kubectl get pods
kubectl logs -l app.kubernetes.io/name=n8n

# 4. Run tests
N8N_BASE_URL=http://localhost:<port> RESET_E2E_DB=true \
  npx playwright test tests/e2e/building-blocks/ --workers=1

# 5. Cleanup
pnpm stack:helm:clean
```

### Test a Specific Version Matrix

```bash
# Test n8n 1.80.0 against chart version v1.2.0
pnpm stack:helm --image n8nio/n8n:1.80.0 --chart-ref v1.2.0

# Test latest n8n against a chart PR branch
pnpm stack:helm --chart-ref fix/pvc-permissions

# Test a GHCR image (e.g., from CI)
pnpm stack:helm --image ghcr.io/n8n-io/n8n:ci-12345
```

### CLI Options

```
--mode <mode>         standalone (SQLite, default) or queue (PostgreSQL + Redis + workers)
--image <image>       n8n Docker image (default: n8nio/n8n:local)
--chart-ref <ref>     Git branch/tag for n8n-hosting (default: main)
--chart-repo <url>    Git repo URL (default: https://github.com/n8n-io/n8n-hosting.git)
--k3s-image <image>   K3s image (default: rancher/k3s:v1.32.2-k3s1)
--url-file <path>     Write URL to file when ready (for CI automation)
--help                Show help
```

## CI Usage

The `test-e2e-helm.yml` workflow handles everything:

- **Trigger:** Push to `helm-container-test` branch, or manual dispatch
- **Build:** Creates n8n Docker image, pushes to GHCR
- **Test:** Starts K3s, installs Helm chart, runs building-blocks E2E tests
- **Cleanup:** Removes ephemeral GHCR image

Manual dispatch also accepts `helm-chart-ref` to test a specific chart version.

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
export KUBECONFIG=/tmp/helm-kubeconfig-*.yaml
kubectl get pods -o wide
kubectl describe pod -l app.kubernetes.io/name=n8n
kubectl get events --sort-by=.lastTimestamp
```

### Port not accessible

NodePort routing is stateless (kube-proxy), so connectivity issues typically indicate the pod is unhealthy. Check pod status:
```bash
export KUBECONFIG=/tmp/helm-kubeconfig-*.yaml
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
