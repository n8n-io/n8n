# Trigger Seats PoC harness (branch-only)

Multi-instance harness for the leaderless-triggering PoC: in-memory triggers
(Kafka) served by many mains via leased, epoch+version-fenced **seats**.
Design notes: `trigger-service-poc-design.md` at the repo root.

Mains and the worker run as **local processes** (fast iteration, easy
`kill -9` / `SIGSTOP` chaos); compose provides postgres (5433), redis (6380),
rabbitmq (5672) and Kafka (host `localhost:9094`).

## Boot

```bash
pnpm build                                   # once, from the repo root
cd packages/testing/poc-trigger-service
docker compose up -d --wait

# Terminal A / B / C (worker required: queue mode)
./run-main.sh 1
./run-main.sh 2
./run-worker.sh

# Terminal D
./seed.sh 2          # owner + kafka credential + demo workflow (seatCount=2), published
./watch.sh           # live seats/runners/executions view
```

Multi-main is enabled only when `.env.local` provides
`N8N_LICENSE_ACTIVATION_KEY`; without it the fleet runs without multi-main,
which the seats flags are fine with (there is no leader to need).

Flags under test (set in `lib.sh`): `N8N_USE_WORKFLOW_PUBLICATION_SERVICE`,
`N8N_USE_TRIGGER_SEATS`, 2s reconcile ticks, 10s seat leases.

## Demo scenarios

Expect `watch.sh` to show both seats held (one per main) before starting.

| # | Script | Shows |
|---|--------|-------|
| 1 | `./scenario-1-scale-out.sh [1000]` | Two replicas share one consumer group; executions == messages, zero duplicates. |
| 2 | `./scenario-2-failover.sh <main#> [600]` | `kill -9` a holder mid-stream; Kafka redelivers, the seat is reclaimed, nothing lost. |
| 3 | `./scenario-3-zombie.sh <main#> [400] [25]` | **The fencing money-shot**: SIGSTOP a holder past its lease, another main reclaims (epoch bump), SIGCONT — the zombie's emissions are fenced at execution insert. Zero double executions. |
| 4 | `./scenario-4-rebalance.sh` | Start main-1 alone (holds all seats), then start main-2: vacancy claims + rate-limited handoffs; counts Kafka group rebalances to show churn is bounded. |

Steady-state check: leave the fleet idle-consuming for 10 minutes —
`scenario-4`'s rebalance counter must not move (leases renew in place, no
membership changes).

## Reset

```bash
docker compose down -v && rm -rf .poc-data
```
