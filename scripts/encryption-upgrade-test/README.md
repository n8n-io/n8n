# Encryption-cycle tests

Repeatable end-to-end tests for the encryption-key rollout, in one script
(`encryption-cycle.sh`) with two modes. Both run on both supported databases:
sqlite and postgres.

```bash
pnpm build                       # the checkout under test must be built
pnpm test:encryption:upgrade     # full upgrade cycle (docker old release + this checkout)
pnpm test:encryption:rotation    # standalone rotation test (this checkout only)
```

## Upgrade mode (`MODE=upgrade`, the default)

Proves that an upgrade keeps existing data readable, that a rollback stays
safe while the rotation flag is off, and that flipping the flag switches new
writes to the new `keyId:`-prefixed format without breaking anything written
before. For each backend, one instance travels through four phases:

| Phase | Instance | Checks |
|---|---|---|
| P1 seed | `FROM_IMAGE` (docker, default `n8nio/n8n:2.37.10` (pinned; bump deliberately)) | owner + credential created, decrypt round-trip |
| P2 upgrade | this checkout, rotation flag **off** | old credential decrypts; a new write is byte-compatible legacy format (`U2FsdGVkX1…`); key store seeded with exactly 2 rows |
| P3 downgrade | `FROM_IMAGE` again, same folder | the value written by the **newer** instance decrypts on the **older** one |
| P4 write-on | this checkout, flag **on** | mixed data decrypts; new write is `<activeKeyId>:…`; rotation via `POST /rest/encryption/keys` moves the write key immediately; all four data generations decrypt |

## Rotation mode (`MODE=rotation`)

The standalone test of DB-stored key rotation. It boots only this checkout on
a fresh database with the rotation flag on — no old-release image, so it is
much faster and needs docker only for the postgres backend.

| Phase | Checks |
|---|---|
| R1 seed | fresh boot seeds exactly 2 `deployment_key` rows; a write is prefixed with the active key id |
| R2 rotate | two rotations via `POST /rest/encryption/keys`; a write after each one uses the newest key id; 4 key rows kept, exactly 1 active |
| R3 restart | the instance restarts: keys reload from the database, a new write keeps the active key id, every generation decrypts |

Decryption is proven through the REST API: the unique seeded secret lives in a
non-password credential field, so `GET /rest/credentials/:id?includeData=true`
returning it verbatim means the stored blob decrypted.

## Metrics

Every run prints a summary table: per-phase duration, number of decrypt
round-trips, and their average/max end-to-end latency (curl `time_total`).
Runs that rotate also print a `rotate api:` line with the count and
average/max latency of the rotation call itself. Raw samples are written to
`<work root>/metrics.csv`.

## Parameters

| Env | Default | Meaning |
|---|---|---|
| `MODE` | `upgrade` | `upgrade` (full cycle) or `rotation` (standalone rotation test) |
| `DB` | `both` | database backends to run: `sqlite`, `postgres`, or `both` |
| `FROM_IMAGE` | `n8nio/n8n:2.37.10` (pinned; bump deliberately) | the "old" release to seed on and downgrade to (upgrade mode only) |
| `PG_IMAGE` | `postgres:16` | the postgres container image for `DB=postgres` |
| `N8N_REPO` | this repo | the built checkout under test |
| `N8N_PORT` | `5714` | port shared by all phases (sequential) |
| `WORK_ROOT` | `mktemp -d` | where the data folder, logs, and metrics land |

Exit codes: `0` pass, `1` fail (prints the failing check and the instance log
tail), `77` skip (docker needed but unavailable).

## CI

`.github/workflows/encryption-upgrade-test.yml` ("Encryption Test") runs the
upgrade cycle on a twice-daily cron. A manual `workflow_dispatch` run has a
`test` select (`upgrade` | `rotation`) plus `db` and `from-image` inputs. A PR
that touches the tests or the workflow runs **both** modes as parallel jobs,
with the workflow file taken from the PR branch. The run summary carries the
result and the metrics; the run log and per-backend `metrics.csv`/`n8n.log`
are uploaded as an artifact per mode.
