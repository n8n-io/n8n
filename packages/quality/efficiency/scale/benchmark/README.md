# n8n benchmarking tool

Tool for executing benchmarks against an n8n instance.

Run the `pnpm --filter @n8n/n8n-benchmark` commands below from the repository root. pnpm runs each script in the benchmark package directory.

## Directory structure

```text
packages/quality/efficiency/scale/benchmark
├── scenarios        Benchmark scenarios
├── src              Source code for the n8n-benchmark cli
├── Dockerfile       Dockerfile for the n8n-benchmark cli
├── infra            Terraform code for the cloud benchmark environment
├── scripts          Orchestration scripts
```

## Benchmarking an existing n8n instance

The easiest way to run the existing benchmark scenarios is to use the benchmark docker image:

```sh
docker pull ghcr.io/n8n-io/n8n-benchmark:latest
# Print the help to list all available flags
docker run ghcr.io/n8n-io/n8n-benchmark:latest run --help
# Run all available benchmark scenarios for 1 minute with 5 concurrent requests
docker run ghcr.io/n8n-io/n8n-benchmark:latest run \
	--n8nBaseUrl=https://instance.url \
	--n8nUserEmail=InstanceOwner@email.com \
	--n8nUserPassword=InstanceOwnerPassword \
	--vus=5 \
	--duration=1m \
	--scenarioFilter=single-webhook
```

### Using custom scenarios with the Docker image

It is also possible to create your own [benchmark scenarios](#benchmark-scenarios) and load them using the `--testScenariosPath` flag:

```sh
# Assuming your scenarios are located in `./scenarios`, mount them into `/scenarios` in the container
docker run -v ./scenarios:/scenarios ghcr.io/n8n-io/n8n-benchmark:latest run \
	--n8nBaseUrl=https://instance.url \
	--n8nUserEmail=InstanceOwner@email.com \
	--n8nUserPassword=InstanceOwnerPassword \
	--vus=5 \
	--duration=1m \
	--testScenariosPath=/scenarios
```

## Running the entire benchmark suite

The benchmark suite consists of [benchmark scenarios](#benchmark-scenarios) and different [n8n setups](#n8n-setups).

### Locally

```sh
pnpm --filter @n8n/n8n-benchmark benchmark-locally
```

You can filter to a specific scenario and setup:

```sh
# Run only the http-node scenario with the sqlite setup
pnpm --filter @n8n/n8n-benchmark benchmark-locally --runDir /tmp/n8n-data --scenarioFilter http-node sqlite
```

### In the cloud

The cloud environment is a dedicated Azure VM. [`./infra`](./infra/) holds the
Terraform code that creates it.

Create the environment, run the benchmarks, then delete the environment:

```sh
pnpm --filter @n8n/n8n-benchmark provision-cloud-env
pnpm --filter @n8n/n8n-benchmark benchmark-in-cloud
pnpm --filter @n8n/n8n-benchmark destroy-cloud-env
```

## Running the `n8n-benchmark` cli

The `n8n-benchmark` cli is a node.js program that runs one or more scenarios against a single n8n instance.

### Locally with Docker

Build the Docker image:

```sh
# Must be run in the repository root
# k6 doesn't have an arm64 build available for linux, we need to build against amd64
docker build --platform linux/amd64 -t n8n-benchmark -f packages/quality/efficiency/scale/benchmark/Dockerfile .
```

Run the image

```sh
docker run \
  -e N8N_USER_EMAIL=user@n8n.io \
  -e N8N_USER_PASSWORD=password \
  # For macos, n8n running outside docker
  -e N8N_BASE_URL=http://host.docker.internal:5678 \
  n8n-benchmark
```

### Locally without Docker

Requirements:

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- Node.js v24 or higher

Set `N8N_USER_EMAIL` and `N8N_USER_PASSWORD` in your environment before you run the CLI.

```sh
pnpm --filter @n8n/n8n-benchmark build > benchmark-build.log 2>&1

# Run tests against http://localhost:5678 with specified email and password
pnpm --filter @n8n/n8n-benchmark exec ./bin/n8n-benchmark run
```

## Benchmark scenarios

A benchmark scenario defines one or multiple steps to execute and measure. It consists of:

- Manifest file which describes and configures the scenario
- Any test data that is imported before the scenario is run
- A [`k6`](https://grafana.com/docs/k6/latest/using-k6/http-requests/) script which executes the steps and receives `API_BASE_URL` environment variable in runtime.

Available scenarios are located in [`./scenarios`](./scenarios/).

## n8n setups

An n8n setup defines one n8n runtime configuration with Docker Compose. The setups are in [`scripts/n8n-setups`](scripts/n8n-setups/).

| Setup | Description |
| --- | --- |
| `sqlite` | Single main with SQLite |
| `postgres` | Single main with PostgreSQL |
| `scaling-single-main` | Queue mode with one main and two workers |
| `scaling-multi-main` | Queue mode with two mains behind a load balancer and two workers. Needs an n8n license |
| `engine-v2` | One main (control plane) and two engine v2 data planes behind a load balancer. Does not run task runners |

All setups except `engine-v2` run task runners in external mode.

### Engine v2 setup

The `engine-v2` setup runs the main in remote engine mode. The main sends the executions to two `n8n engine` containers through an nginx load balancer. The engines keep their data in the `n8n_engine` database on the same PostgreSQL server as the main. The main and the engines share one binary data directory.

The setup tells the benchmark CLI to:

- Set `settings.engineType` to `v2` on every imported workflow (`BENCHMARK_ENGINE_TYPE=v2`).
- Skip the scenarios that do not list `v2` in `supportedEngines` in their manifest. Engine v2 cannot run these scenarios yet:
  - `js-code-node` and `py-code-node`: the engine does not run task runners.
  - `data-table-node`: the Data table node is not available on the engine.

Each scenario manifest must set `supportedEngines`. If a scenario does not list `v2`, the engine-v2 benchmark skips it; add `v2` only after you confirm that engine v2 runs all of its workflows.

The `n8n engine` command must be in the n8n image that you test.
