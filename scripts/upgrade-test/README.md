# Upgrade-cycle test

Repeatable end-to-end test for the encryption-key rollout: it proves that an
upgrade keeps existing data readable, that a rollback stays safe while the
rotation flag is off, and that flipping the flag switches new writes to the
new `keyId:`-prefixed format without breaking anything written before.

```bash
pnpm build            # the checkout under test must be built
pnpm test:upgrade     # one command, loud failure, cleans up after itself
```

## What it does

One sqlite data folder travels through four phases:

| Phase | Instance | Checks |
|---|---|---|
| P1 seed | `FROM_IMAGE` (docker, default `n8nio/n8n:latest`) | owner + credential created, decrypt round-trip |
| P2 upgrade | this checkout, rotation flag **off** | old credential decrypts; a new write is byte-compatible legacy format (`U2FsdGVkX1…`); key store seeded with exactly 2 rows |
| P3 downgrade | `FROM_IMAGE` again, same folder | the value written by the **newer** instance decrypts on the **older** one |
| P4 write-on | this checkout, flag **on** | mixed data decrypts; new write is `<activeKeyId>:…`; rotation via `POST /rest/encryption/keys` moves the write key immediately; all four data generations decrypt |

Decryption is proven through the REST API: the unique seeded secret lives in a
non-password credential field, so `GET /rest/credentials/:id?includeData=true`
returning it verbatim means the stored blob decrypted.

## Metrics

Every run prints a summary table: per-phase duration, number of decrypt
round-trips, and their average/max end-to-end latency (curl `time_total`).
Raw samples are written to `<work root>/metrics.csv`.

## Parameters

| Env | Default | Meaning |
|---|---|---|
| `FROM_IMAGE` | `n8nio/n8n:latest` | the "old" release to seed on and downgrade to |
| `N8N_REPO` | this repo | the built checkout that plays the "new" version |
| `N8N_PORT` | `5714` | port shared by all phases (sequential) |
| `WORK_ROOT` | `mktemp -d` | where the data folder, logs, and metrics land |

Exit codes: `0` pass, `1` fail (prints the failing check and the instance log
tail), `77` skip (docker unavailable).
