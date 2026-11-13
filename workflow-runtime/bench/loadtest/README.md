# Load test: v1, engine-v2 and the compiled engine on real workflows

These scripts run real workflows from the engine test bed against the
ai-gym on one Linux VM. They ramp the number of concurrent workflows on
each engine and each CPU budget until the engine saturates. Results hold
aggregates only. The bundles (customer workflows with fake data) stay in
`~/wfrt-loadtest/data` on the VM.

## Layout on the VM (`~/wfrt-loadtest`)

| Path | What |
|---|---|
| `data/` | bundles (`certified/`, `prepared/`), workflow rows (`input/`), the pool and key lists |
| `src/` | the packed repository tree (`bench/cloud/pack.sh`), built with `bench/cloud/setup.sh` |
| `kit/` | this folder |
| `e2e-cache/` | Node.js 26.7.0 and n8n 2.42.2 (installed with `--ignore-scripts`, then the needed native modules rebuilt) |
| `tools/gym` | the gym, built from ai-gym `main` |
| `engine/` | engine state: the n8n Postgres data, the compiled-module cache, manifests |
| `results/<run>/` | `steps.jsonl`, `steps.csv`, `saturation.jsonl`, per-request and per-second files, `summary.md` |

## CPU layout (16 vCPUs, SMT pairs n and n+8)

| Part | vCPUs |
|---|---|
| system | 0 |
| load generator | 1, 9 |
| gym (and its Postgres and MySQL) | 2, 3, 10, 11, 8; at the 6-vCPU budget also 7, 15 |
| engine budget b | the first b of 4, 12, 5, 13, 6, 14, 7, 15 |

Each process runs as a transient systemd service in `lt.slice` with a CPU
set and a memory limit (`env.sh` `unit`). The Docker containers (n8n
Postgres, Redis) get the same CPU set with `--cpuset-cpus`. CPU time and
RSS come from the cgroups.

## Scripts

| Script | What it does |
|---|---|
| `env.sh` | paths, ports, CPU layout, the `unit` helper |
| `bed.sh` | the gym and its database servers |
| `ref.sh`, `n8n.sh` | reference n8n instances; any n8n process as a unit |
| `prepare-vm.sh` | grows the pool with the harness `prepare.mjs` (one reference run each) |
| `pool.mjs` | the pool: runnable bundles and their trigger items |
| `lib/transform.mjs` | the load-test form of a bundle: a Webhook that responds at the end in place of the trigger |
| `pick-keys.mjs`, `subset-v2.mjs` | key lists: a seeded random order; the subset engine-v2 can run |
| `n8n-load.mjs`, `load-n8n.sh` | loads keys into v1 and v2 (Postgres) |
| `n8n-refresh.mjs` | refreshes OAuth2 tokens in n8n after each tenant restore |
| `build-cache.mjs`, `compiled.mjs` | converts and compiles once; starts wfrt, the host and `services.mjs`, and loads the keys |
| `services.mjs` | answers the `ctx.service` calls of wfrt (Data Table, deduplication) on the host's file stores, as the engine-test adapter does; a unit on the engine CPUs |
| `native26.sh` | rebuilds isolated-vm for Node 26 after `setup.sh`; `compiled.mjs` stops when Node 26 cannot load it |
| `engine.sh` | starts one engine setup on a budget and lists its cgroups |
| `drive.mjs` | the closed-loop driver with the ramp and the sampling |
| `ramp.sh`, `full.sh` | one ramp; every ramp of the test |
| `summarize.mjs` | `summary.md` of a run |
| `profile/` | the deep profile of the compiled engine (perf, V8 profile, step profile, per-workflow attribution, step cost, native classes) |

## Preparing a tree

1. `bench/cloud/pack.sh` on the Mac; copy the tarball to the VM and unpack it in `src<N>`.
2. `bench/cloud/setup.sh` in that tree. It builds with the system Node.js.
3. `kit/native26.sh <tree>`. The host runs on Node 26, and `setup.sh` builds
   isolated-vm for the system Node. Without this step every host expression
   fails ("IsolatePool failed to create any bridges").
4. Point `src` at the tree, and write the pack name, its SHA-256 and the gym
   build to `BUILD_ID`. `ramp.sh` puts it on every step.

## Method

- **Same input for all engines.** Each bundle's start trigger becomes a
  Webhook node (POST, responds when the last node ends). The trigger node
  becomes an Edit Fields (Set) node with the same name that returns the
  request body (a Split Out node for more than one item), so expressions
  that read the trigger do not change. The body is the bundle's pinned
  trigger data, or the items the live trigger gave in one reference run.
  Respond to Webhook nodes become No Op nodes; other triggers are disabled.
- **Workload.** One sequence of keys from a seeded PRNG, the same for every
  engine. Workflows repeat. A key an engine could not load counts as a
  failure.
- **Gym state.** Each workflow has its own tenant. Before each step the
  driver restores the tenants of the keys that the previous step ran, then
  refreshes OAuth2 tokens for all engines (wfrt and engine-v2 cannot).
- **Ramp.** Closed loop. Concurrency starts at 1 and grows by 1.5×. Each
  step warms up for 15 s and measures for 60 s. The ramp stops when the
  successful rate gains less than 3% and p99 grows by half, or after two
  steps without gain, or when success falls 10 points under the first step.
