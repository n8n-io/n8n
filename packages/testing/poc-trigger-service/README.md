# Trigger-service PoC harness (branch-only)

Local fleet for the trigger-service PoC (Milestone 0): compose provides
postgres (5433) / redis (6380) / rabbitmq (5672, UI 15672); mains and the
queue worker run as **local processes** for fast iteration and easy
`kill -9` / `SIGSTOP` chaos demos.

## One-time setup

1. `cp .env.local.example .env.local` and set `N8N_LICENSE_ACTIVATION_KEY`
   (enterprise key with `feat:multipleMainInstances`; same key as your
   `~/n8n-multi-main` stack works).
2. `pnpm build` at the repo root (local mains run from `dist`).

## Boot

```bash
docker compose up -d --wait          # infrastructure
./run-main.sh 1                      # http://localhost:5678 (runs migrations)
./run-main.sh 2                      # http://localhost:5679
./run-main.sh 3                      # http://localhost:5680
./run-worker.sh                      # queue-mode executions
./watch.sh                           # live lease/worker/outbox view
```

Start main 1 first on a fresh volume (DB migrations + license activation);
2 and 3 can start once it is up. After changing code: rebuild the touched
packages (e.g. `pnpm --filter n8n-workflow --filter @n8n/db --filter n8n build`)
and restart the mains.

## Chaos demo cheatsheet

- kill a holder: `kill -9 <pid of run-main.sh N>` → lease reclaimed ≤ TTL+grace
- wedge a holder: `kill -STOP <pid>` (resume: `kill -CONT <pid>`)
- watch the barrier: publish a new version while a holder is stopped;
  `watch.sh` shows the outbox record polling in `in_progress` until the
  holder's heartbeat expires.

Note: ports are offset to coexist with `~/n8n-multi-main` (which keeps its
postgres/redis unexposed); don't run that stack's mains at the same time —
they'd collide on 5678/5679.
