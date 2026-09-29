# Encryption-cycle tests

Repeatable end-to-end tests for the encryption-key rollout: an API-only
Playwright suite (project `encryption:infrastructure`, no browser) on the
`n8n-containers` Testcontainers stack. Both modes run on both supported
databases: sqlite and postgres.

```bash
pnpm build:docker                # builds n8nio/n8n:local — the image under test
pnpm test:encryption:upgrade     # full upgrade cycle (old release + the local image)
pnpm test:encryption:rotation    # standalone rotation test (the local image only)
```

## Layout

| File | Responsibility |
|---|---|
| `upgrade-cycle.spec.ts` / `rotation-cycle.spec.ts` | one test per backend; phases render as `test.step()` |
| `spec-helpers.ts` | env parameters, docker/image skip gate, the loud FAIL path, attachments |
| `harness.ts` | phase/step logging, metrics + summary, failure type |
| `instances.ts` | stack boot and per-phase image swaps; log capture |
| `api.ts` | REST client and the encryption assertions (`assertDecrypts`, `rotateKey`, …) |
| `db.ts` | raw DB access: `node:sqlite` on the mounted file / `psql` in the postgres container |
| `journeys.ts` | seed + per-boot checks: an active scheduled workflow bound to the credential |
| `cycles.ts` | the two scenarios: `runUpgradeCycle` (P1–P4), `runRotationCycle` (R1–R3) |

The stack capabilities this test leans on: `createN8NStack` accepts an
`image`, a `userHomeHostDir` bind mount (the user folder — settings file and
sqlite database — outlives the container), a `user` override so the mounted
files stay host-owned, and a `startupTimeoutMs` for old-release migrations;
`stack.replaceN8N({ image, env })` then swaps the running n8n main for a
different image while the database service, network, user folder, and host
port stay alive. One stack lives through every phase; only the image changes.

## Upgrade mode (`MODE=upgrade`, the default)

Proves that an upgrade keeps existing data readable, that a rollback stays
safe while the rotation flag is off, and that flipping the flag switches new
writes to the new `keyId:`-prefixed format without breaking anything written
before.

| Phase | Image | Checks |
|---|---|---|
| P1 seed | `FROM_IMAGE` (pinned `n8nio/n8n:2.37.10`; bump deliberately) | owner + credential created, decrypt round-trip, scheduled workflow seeded and executing |
| P2 upgrade | `TO_IMAGE`, rotation flag **off** | old credential decrypts; a new write is byte-compatible legacy format (`U2FsdGVkX1…`); key store seeded with exactly 2 rows; the newer release re-activates and executes the workflow the old release wrote |
| P3 downgrade | `FROM_IMAGE` again, same data | the value written by the **newer** instance decrypts on the **older** one; the old release still activates and executes on the migrated-forward database |
| P4 write-on | `TO_IMAGE`, flag **on** | mixed data decrypts; new write is `<activeKeyId>:…`; rotation via `POST /rest/encryption/keys` moves the write key immediately; all four data generations decrypt |

## Rotation mode (`MODE=rotation`)

The standalone test of DB-stored key rotation. Boots only the image under
test on a fresh database with the flag on.

| Phase | Checks |
|---|---|
| R1 seed | fresh boot seeds exactly 2 `deployment_key` rows; a write is prefixed with the active key id |
| R2 rotate | two rotations via `POST /rest/encryption/keys`; a write after each one uses the newest key id; 4 key rows kept, exactly 1 active |
| R3 restart | a fresh process on the same data: keys reload from the database, a new write keeps the active key id, every generation decrypts |

## Data journeys

Each cycle seeds and keeps re-checking on every boot:

- **A static credential** (`httpHeaderAuth`) — the encrypted payload. The
  unique secret lives in the non-password `name` field, so the REST
  round-trip (`GET /rest/credentials/:id?includeData=true`) proves the
  stored blob decrypts; the raw column is also byte-asserted
  (legacy prefix / `keyId:` prefix).
- **An active scheduled workflow** (Schedule Trigger → HTTP Request bound to
  the credential, against the instance's own `/healthz`). Every boot must
  re-activate it and produce a fresh successful execution — that decrypts
  the credential inside the execution engine, so a read-path regression
  fails the run even when the credentials endpoint still works.

Not covered here (license-gated on the published images, and the e2e feature
stub does not ship in the docker dist — tracked separately): variables, SSO
settings (SAML/OIDC secrets in `settings.value`), and end-user (dynamic)
credentials.

## Metrics

Every run prints a summary table per backend: per-phase duration, number of
decrypt round-trips, and their average/max end-to-end latency. Runs that
rotate also print a `rotate api:` line with the count and average/max latency
of the rotation call itself, and every run prints a `scheduled executions:`
line — how many boots produced a fresh successful execution and how long the
wait was (activation + schedule fire + engine decrypt, end to end). Raw
samples land in `<work root>/<backend>/metrics.csv`.

## Failure behavior

Any failed check throws and fails the Playwright test: a loud block prints
the `FAIL` line with the expected/actual details, the current container's
docker log is appended to `<backend>/n8n.log`, the last 40 log lines print
inline, and the stack (n8n, database, network) is torn down. The log and
`metrics.csv` are attached to the test. In CI the job summary shows
**Result: FAIL** with the last 80 run-log lines, the artifacts still upload,
and a failed scheduled run notifies Slack. Without docker (or without the
locally built image) the tests skip — except in the encryption CI workflow,
where `ENCRYPTION_CYCLE_REQUIRED=true` turns that into a failure.

## Parameters

| Env | Default | Meaning |
|---|---|---|
| `MODE` | `upgrade` | `upgrade` (full cycle) or `rotation` (standalone rotation test) |
| `DB` | `both` | database backends to run: `sqlite`, `postgres`, or `both` |
| `FROM_IMAGE` | `n8nio/n8n:2.37.10` (pinned) | the "old" release to seed on and downgrade to (upgrade mode only) |
| `TO_IMAGE` | `n8nio/n8n:local` | the image under test (`pnpm build:docker` output) |
| `TEST_IMAGE_POSTGRES` | stack default | the postgres container image |
| `WORK_ROOT` | `mktemp -d` | where the home dirs, logs, and metrics land |

## CI

`.github/workflows/encryption-upgrade-test.yml` ("Test: Encryption Rollout")
runs the upgrade cycle on a twice-daily cron and notifies Slack when a
scheduled run fails. A manual `workflow_dispatch` run has a `test` select
(`upgrade` | `rotation`) plus `db` and `from-image` inputs. A PR that touches
the tests or the stack pieces they lean on runs the full matrix — both modes
x both databases, four parallel jobs — with the workflow file taken from the
PR branch. The run summary
carries the result and the metrics; the run log plus `metrics.csv` and
`n8n.log` are uploaded as an artifact per job (mode x database).
