# Cloud benchmark kit

These scripts measure `wfrt` and the fallback host on a fresh Linux VM.
They record the machine, pin the processes to cores, and write a results
CSV and a short markdown summary.

| File | What it does |
|---|---|
| `pack.sh` | On the development machine: packs the working tree into one tarball. It leaves out the files that hold customer data (warm results and replay lists). |
| `setup.sh` | On the VM: downloads Zig 0.17.0 and checks its SHA-256. Builds `wfrt` (ReleaseSafe), installs the workspace, and builds the fallback host with its n8n packages. Downloads Node.js 24 when the system Node.js is older than 22.18. With `--with-gym`, it also builds the gym. |
| `run.sh` | Runs the benchmark: machine facts, W1 to W7, the synthetic warm and mix runs, and optionally the real bundles. |
| `micro.sh` | W1 to W7 across shard counts (`run.sh` calls it). |
| `synth/` | The synthetic mode: workflows, the vendor stub, the engine starter and the load driver. |
| `gym.sh` | Starts the gym for `--bundles`. |
| `sysinfo.sh` | Records the CPU model, kernel, governor, memory, load and CPU lists as JSON. |
| `summarize.mjs` | Joins the results into `results.csv` and `summary.md`. |

## Steps

1. On the development machine, pack the source:

   ```bash
   workflow-runtime/bench/cloud/pack.sh /tmp/wfrt-bench-src.tar.gz
   ```

2. Create the VM. Use Ubuntu 24.04 or Debian 12, x86_64 or arm64, with at
   least 8 vCPUs and 16 GB of memory. Use a dedicated host type (no shared
   cores) if the cloud has one.
3. Copy the tarball to the VM, then unpack it:

   ```bash
   mkdir -p ~/wfrt && tar -C ~/wfrt -xzf wfrt-bench-src.tar.gz
   ```

4. Build everything. This takes 10 to 20 minutes, because it builds
   `n8n-nodes-base` and the LangChain nodes for the host:

   ```bash
   cd ~/wfrt
   workflow-runtime/bench/cloud/setup.sh --install-deps
   ```

   `--install-deps` uses `sudo apt-get` to install build tools,
   pkg-config, the OpenSSL 3 and c-ares headers, git, curl and xz. Leave it
   out when these packages are already on the VM. The tools go to
   `~/.cache/wfrt-bench` (`TOOLS`), and the logs go to `$TOOLS/logs`.

5. Do a short dry run first. It takes about 5 minutes:

   ```bash
   workflow-runtime/bench/cloud/run.sh --quick
   ```

6. Do the full run. It takes 40 to 60 minutes on 16 cores:

   ```bash
   workflow-runtime/bench/cloud/run.sh
   ```

7. Copy the result folder `workflow-runtime/bench/cloud/results/<time>/`
   off the VM. Read `summary.md` first.

## What it measures

- **Machine facts** (`sysinfo-before.json`, `sysinfo-after.json`): the
  CPU model, core count, SMT, NUMA, virtualization, kernel, frequency
  governor, memory, the load average before and after, and the CPU lists.
- **W1 to W7** (`micro.csv`): the runtime workloads of
  `docs/poc-report.md` for each shard count:
  - W1: glue in process.
  - W2: webhook in, reply out.
  - W3: W2 plus one stub call.
  - W4: the call as a code step in the host.
  - W5: park and resume.
  - W6: a loop of effects.
  - W7: 100 KB bodies.
- **Synthetic warm** (`warm-synth-<code>.json`): the CPU per run of each
  synthetic workflow, run alone, as `bench/warm/warm.ts` measures real
  workflows. It runs once with Code steps in the host and once with native
  Code steps.
- **Synthetic mix** (`mix.jsonl`): all workflows at once, picked by their
  weights. It runs for each combination of shard count (`SHARDS_LIST`,
  default 1, 2, 4, 8 and all server cores) and host worker count
  (`WORKERS_LIST`, default 1, 2, 4, 8). Each run records the rate, the
  p50, p90 and p99 latency, CPU per run, and the cores used by `wfrt`, the
  host and the stub.

CPU time comes from `/proc/<pid>/stat` for each process tree. It is not
derived from the request rate.

### CPU layout

On one VM, the last quarter of the cores (at least 2, set with `AUX`) runs
the load generator, the stub and the engine starter. The other cores are
the server cores. `wfrt` with S shards is pinned to the first S server
cores (`taskset`). The host goes on the next W + 1 cores when they fit,
otherwise on all server cores.

With a second VM for the load generator, set these variables:

```bash
LOADGEN_SSH=user@10.0.0.12 SERVER_IP=10.0.0.11 workflow-runtime/bench/cloud/run.sh
```

`run.sh` copies `wfrt` and `drive.mjs` to the second VM, so that VM needs
only Node.js and the OpenSSL and c-ares runtime libraries. The webhook
port (18080) and the control API (18099) then listen on all interfaces.
The control API has no authentication, so keep both VMs on a private
network. The stub stays on the server VM, on the aux cores.

## The synthetic mode

The real-workflow bundles come from customer workflows. Do not copy them
to a cloud VM unless the user allows it. The synthetic mode does not need
them. `synth/workflows.mjs` has 15 hand-written workflows. Their weights
follow the node mix of the gym sample `sets/1000`:

- about 3.3 node runs per run;
- these node types: Code, IF, Google Sheets (append, upsert and read),
  Gmail (send, and list with full messages), HTTP Request, RSS, Set, Slack,
  Filter, Outlook, Drive, Switch, Google Calendar and Telegram;
- payloads of typical size: a 600-byte request body, and list responses of
  5 to 20 items with 4 to 12 keys.

As in the sample, some nodes have parameters that run as library nodes in
`wfrt`, and some run in the fallback host. Every workflow is a webhook
that responds with its last node. `synth/upstream.mjs` answers every
vendor call over HTTPS with a CA of its own. `wfrt` reaches it through
`--gym-env`. The host reaches it through `synth/resolve.cjs`.

To check that the synthetic numbers are realistic, compare them with the
real workflows on the Mac (M5 Pro, 2026-11-12, high load). Both runs were
on the same machine:

| Code steps | Set | CPU per run, µs: p50 / p90 / p99 / mean | wfrt mean | Host mean |
|---|---|---|---|---|
| In host | Real (sets/1000 sample) | 1,800 / 8,950 / 25,650 / 3,537 | 312 | 3,225 |
| In host | Synthetic | 1,281 / 13,103 / 16,749 / 3,226 | 369 | 2,857 |
| Native | Real | 600 / 8,750 / 21,875 / 2,883 | 289 | 2,594 |
| Native | Synthetic | 148 / 14,089 / 15,813 / 2,381 | 307 | 2,074 |

The means are within 10% (Code steps in the host) and 17% (native Code)
of the real ones. The synthetic set has fewer distinct shapes, so its
distribution has steps: its p90 is higher than the real p90, and its p99
is lower.

To run the synthetic engine by hand:

```bash
node workflow-runtime/bench/cloud/synth/engine.ts --work /tmp/wfrt-synth --shards 2 --workers 2 &
node workflow-runtime/bench/cloud/synth/drive.mjs --mode warm --out /tmp/wfrt-synth/warm.json
node workflow-runtime/bench/warm/report.mjs /tmp/wfrt-synth/warm.json
curl -X POST localhost:18099/stop
```

## Real bundles (`--bundles DIR`, off by default)

Turn on this mode only when the user allows the bundles on the machine.
It needs four things:

- the engine-test folder (`ENGINE_TEST_DIR`, with `harness/` and the set);
- a replay list (`REPLAY`: JSONL rows with `match: "exact"`, from
  `bench/mix/replay-cpu.mjs`);
- the ai-gym repository (`GYM_REPO`, default `~/work/ai-gym`);
- the gym binary, built with `setup.sh --with-gym`.

```bash
ENGINE_TEST_DIR=~/engine-test REPLAY=~/replay.jsonl GYM_REPO=~/ai-gym \
  workflow-runtime/bench/cloud/run.sh --bundles ~/engine-test/sets/1000
```

`gym.sh` starts the gym on the aux cores. `bench/warm/warm.ts` then runs
pinned to the server cores, once for each value of `CODE_MODES`.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `OUT` | `bench/cloud/results/<UTC time>` | Result folder |
| `SECS` | 20 (`--quick`: 5) | Seconds for each measured load run |
| `WARM_RUNS` | 200 (60) | Runs per workflow in warm mode |
| `CODE_MODES` | `host native` (`host`) | Code steps in the host, native, or both |
| `SHARDS_LIST` | `1 2 4 8 <server cores>` (`1 2`) | Shard counts |
| `WORKERS_LIST` | `1 2 4 8` (`1 2`) | Host worker counts |
| `AUX` | a quarter of the cores, at least 2 | Cores for the load generator and the stubs |
| `LOADGEN_SSH`, `SERVER_IP` | unset | Put the load generator on a second VM |
| `TOOLS` | `~/.cache/wfrt-bench` | Tools and build logs |
| `PNPM_STORE` | pnpm's default | pnpm store for `setup.sh` |

## Limits

- The synthetic workflows imitate the mix, not every workflow. Use the
  real bundles for a final comparison when the user allows it.
- The stub uses CPU (about 0.7 cores at 800 workflows/s). It runs on the
  aux cores, so this CPU is not in the server figures.
- A VM without `cpufreq` reports the governor as "none". The hypervisor
  sets the clock.
- `gym.sh` and `--bundles` were not tested on a VM: the dry-run machine
  has no ai-gym checkout.
