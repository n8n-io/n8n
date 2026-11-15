# Agent benchmark

Runs the same agent chat turns against a real model on several n8n topologies,
and compares latency, throughput and where each turn ran.

For each topology the script:

1. Starts a fresh stack with `createN8NStack()` (Postgres for every topology).
2. Creates the owner, a model credential, a tool workflow and an agent.
3. Runs warmup turns, then the measured turns with a fixed concurrency.
4. Joins each turn to its `agent_execution` row for server-side timings.
5. Stops the stack.

Then it prints one table and writes a JSON file with every turn.

## Run

```bash
export ANTHROPIC_API_KEY=...   # or OPENAI_API_KEY with --model openai/<model>

# Main only against queue mode, mixed workload
pnpm --filter n8n-playwright bench:agents -- --topology main,queue --turns 30 --concurrency 5

# From a config file, flags override it
pnpm --filter n8n-playwright bench:agents -- --config scripts/agent-bench/example.config.json

pnpm --filter n8n-playwright bench:agents -- --help
```

Pass API keys only through the environment, never as flags.

The stack uses `TEST_IMAGE_N8N`, or `n8nio/n8n:local` by default. Build it with
`pnpm build:docker` to test local changes.

## Cockpit

Each run serves a live page at http://localhost:4790. It shows progress,
latency, turns in flight, the agent turn queue, CPU and memory for each
process, where turns ran, and recent errors. It updates while turns run. The
page stays open with the final results until you press Ctrl+C.

The "Try it in n8n" bar shows the n8n URL, a link to the benchmarked agent,
and the owner login. The last stack stays up after the run so you can try it.
Ctrl+C tears it down.

- `--cockpit <port>` picks another port. `--cockpit off` disables the page.
- `--observability` also starts VictoriaMetrics and VictoriaLogs. They scrape
  every n8n process and collect container logs. The cockpit links to their
  UIs while the stack runs.

## Topologies

| Preset | Mains | Workers | Agent turns run on |
|---|---|---|---|
| `main` | 1 | 0 | main |
| `queue` | 1 | `workers` | workers |
| `queue-agents-off` | 1 | `workers` | main (workflows still queue) |
| `queue-no-agent-workers` | 1 | `workers` | main, under `N8N_AGENTS_MAIN_MAX_TURNS` (agent queue mode on, no agent worker) |
| `multi-main` | `mains` | `workers` | workers. Needs `N8N_LICENSE_ACTIVATION_KEY` or `N8N_LICENSE_CERT` |

A config file can also list custom topologies as objects:
`{ "name": "big", "mains": 1, "workers": 4, "agentQueue": true, "env": {} }`.

## Memory limits

- `--main-memory <MB>` gives each main container a memory limit. Node sizes
  its heap from this limit, and the main holds agent work above
  `N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL` of it.
- `--worker-memory <MB>` does the same for workers. The default is 4096 when
  `--main-memory` is set.

The resource table shows `main heap MB` next to `main mem MB`. Heap is the
live JavaScript objects. When memory is far above heap, the difference is
mostly memory that Node did not collect yet.

A main with high memory accepts a chat message but opens no live stream. The
run then waits for the execution in the database and logs how many turns ran
this way.

## Workloads

| Name | Turns |
|---|---|
| `plain` | Short questions, no tools |
| `tool` | The agent calls a workflow tool (Set + Respond to Webhook) |
| `long` | About 600 words of output |
| `webhook` | The Responses API (`/agent-webhook/:agentId/responses`), half of them ask for an order lookup |
| `workflow` | A production webhook runs a workflow with Message an Agent, half of them ask for an order lookup |
| `chat` | Editor chat only: plain 5 : tool 3 : long 2 |
| `mixed` (default) | plain, tool, long, webhook and workflow, 20% each |

Every topology gets the same turn sequence. Each turn opens a new session.
`plain`, `tool` and `long` use the preview chat, so workflow tools run in
`manual` mode. `webhook` and `workflow` run the published agent, so its
workflow tools run in `integrated` mode. When a run includes them, the bench
connects the webhook integration, publishes the agent and activates the
caller workflow first.

These two paths do not stream, so `start` and `1st token` are empty for them.
Use `db queued` and `db run` instead.

## Columns

Times are p50 / p95 in ms.

| Column | Meaning |
|---|---|
| `start` | Send until `execution-started`: queue wait and dispatch, as the user sees it |
| `1st token` | Send until the first text token |
| `total` | Send until the stream ends |
| `db queued` | `startedAt - createdAt` of the `agent_execution` row |
| `db run` | `stoppedAt - startedAt` of the row |
| `ran on` | Process type of `ownerKey`, from the instance registry |
| `turns/min` | Successful turns per minute of wall time |

The model dominates `total` and `1st token`, so compare `start` and `db queued`
between topologies, and run enough turns to smooth out model variance.

If a run is interrupted hard, clean up with
`pnpm --filter n8n-containers stack:clean:all`.
