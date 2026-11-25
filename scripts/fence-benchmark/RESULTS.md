# T-6: fence benchmark (ADR-43)

Draft for review. Ticket: https://linear.app/n8n/issue/CAP-797

## Recommendation

Use option (a): keep the locking fence, and bound it.

- Speed: (a) and (b) have the same throughput and latency at every point we measured. The difference is smaller than the noise between runs.
- Safety: (b) broke guarantee 3 in 50 of 52 rounds where the holder froze past its session expiry. (a) broke it in 0 rounds.
- Port: (a) keeps `isHeld(ctx)` in `@n8n/leases` as it is. (b) changes that published contract.
- Cost of (a): MultiXact growth on a busy lease. Autovacuum must keep up with it. This is a monitoring item, not a blocker.

On Postgres 17 and later, bound the transaction with `SET LOCAL transaction_timeout`. On older versions, use `statement_timeout` and `idle_in_transaction_session_timeout`. Both bounds worked in the freeze test.

ADR-41 (a removed lease is claimed again) still needs its own fix with option (a). The proposed `removed` flag is enough.

## Setup

- Script: `scripts/fence-benchmark/bench.mjs` on branch `cap-797-t-6-fence-benchmark`. This branch is never merged.
- Postgres 17.12 and 16.14 in Docker on a MacBook. The tables are copied from ADR-27, plus an `execution` table for the fenced insert, with a 1 KB payload.
- Fence (a), in one `READ COMMITTED` transaction: the timeout, `FOR KEY SHARE` on the lease row, the session check with `clock_timestamp()`, the insert, then commit. This is 6 round trips.
- Fence (b), in one `READ COMMITTED` transaction: one `INSERT ... SELECT ... WHERE EXISTS`, then commit. This is 3 round trips.
- Each load point ran for 15 s after a 2 s warm-up. Each point ran once.
- Latency includes the wait for a connection from the pool. This is the time the consumer sees.
- Lock waits are sampled from `pg_stat_activity` every 50 ms. MultiXact growth is read from `pg_control_checkpoint()` after a `CHECKPOINT`.

## Load results

Writes per second and latency in ms. W is the number of concurrent writers, P is the pool size.

### Postgres 17

| Leases | W | P | (a) writes/s | (a) p50 | (a) p99 | (b) writes/s | (b) p50 | (b) p99 | (a) MultiXact ids | (a) MultiXact members |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 50 | 2 | 1,057 | 28 | 138 | 854 | 60 | 143 | 15,988 | 31,976 |
| 1 | 50 | 10 | 3,628 | 13 | 69 | 3,600 | 12 | 71 | 54,701 | 409,106 |
| 1 | 100 | 2 | 968 | 110 | 226 | 849 | 114 | 252 | 14,657 | 29,314 |
| 1 | 100 | 10 | 3,178 | 29 | 91 | 3,365 | 27 | 101 | 48,037 | 341,863 |
| 300 | 300 | 2 | 949 | 342 | 596 | 765 | 398 | 591 | 0 | 0 |
| 300 | 300 | 10 | 3,921 | 75 | 166 | 3,930 | 71 | 155 | 0 | 0 |

### Postgres 16

| Leases | W | P | (a) writes/s | (a) p50 | (a) p99 | (b) writes/s | (b) p50 | (b) p99 | (a) MultiXact ids | (a) MultiXact members |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 50 | 2 | 930 | 56 | 131 | 797 | 62 | 123 | 14,067 | 28,134 |
| 1 | 50 | 10 | 3,188 | 15 | 78 | 4,004 | 12 | 70 | 48,061 | 339,193 |
| 1 | 100 | 2 | 801 | 120 | 261 | 1,696 | 59 | 72 | 12,149 | 24,298 |
| 1 | 100 | 10 | 3,091 | 31 | 95 | 5,251 | 15 | 76 | 46,642 | 330,222 |
| 300 | 300 | 2 | 814 | 361 | 740 | 836 | 356 | 457 | 0 | 0 |
| 300 | 300 | 10 | 3,200 | 90 | 160 | 4,495 | 67 | 143 | 0 | 0 |

(b) made no MultiXacts in any run.

### What the load results show

1. Throughput and latency are the same for (a) and (b) within the noise. On Postgres 16, (b) was faster at some points. But the same point on Postgres 17 does not show it, and each point ran once. The pool and the round trips limit both fences, not the lease row.
2. Neither fence made lock waits. `FOR KEY SHARE` lockers do not block each other, so 100 writers on one lease do not wait on the row.
3. No sample caught a wait on a MultiXact lightweight lock. The contention in ADR-43, row 4, did not show at 100 concurrent writers.
4. (a) makes MultiXacts only when more than one transaction locks the same lease at the same time. With one writer for each lease, it made none. That case is the chaos-run pattern, so the cost there is zero.
5. On one busy lease at pool size 10, (a) made about 3,200 MultiXact ids and 23,000 to 27,000 members each second. Autovacuum must freeze and truncate them. At that rate, the member space wraps in about 2 days without vacuum. A real trigger does not write thousands of executions each second on one lease, so the real rate is much lower. But a high-rate kind on one lease needs this checked.

## Freeze results

There is one lease in each round. The holder passes the fence and inserts its row, then freezes for 0 to 2 s before it commits. Its session expires 1 s after the check. A second instance tries to claim the lease every 50 ms. There were 40 rounds for each setup.

A round "straddles" when the freeze is longer than the time to session expiry. A violation is a write with an older token that commits after a newer claim commits (guarantee 3). The script checks this with commit timestamps (`track_commit_timestamp`).

| Postgres | Fence | Bound | Straddling rounds | Violations | Aborted by the bound | Claim delay after expiry, p50 / max |
|---|---|---|---|---|---|---|
| 17 | (a) | 15 s | 22 | 0 | 0 | 128 / 1,030 ms |
| 17 | (a) | 1 s | 23 | 0 | 24 | 29 / 37 ms |
| 17 | (b) | none | 26 | 24 | 0 | 29 / 36 ms |
| 16 | (a) | 15 s | 20 | 0 | 0 | 29 / 995 ms |
| 16 | (a) | 1 s | 18 | 0 | 18 | 29 / 36 ms |
| 16 | (b) | none | 26 | 26 | 0 | 30 / 44 ms |

### What the freeze results show

1. (b) gives up guarantee 3 in almost every round where a freeze outlasts the session. The 2 rounds without a violation on Postgres 17 had a freeze that ended within one claim poll after the expiry. Deduplication (ADR-40) would have to catch every one of these writes. T-1 is still open, and some trigger types may have no usable key.
2. (a) had 0 violations. Without a tight bound, the claim waits until the frozen holder commits. That is up to 1 s here, and up to the bound in production.
3. A bound shorter than the freeze aborts the frozen transaction, and the claim goes through without a wait. `transaction_timeout` on Postgres 17 ended the connection. On Postgres 16, the timeouts ended the transaction. Both work as ADR-43 (a) describes.
4. Postgres 16 has a gap that this test does not show. `statement_timeout` and `idle_in_transaction_session_timeout` do not bound a transaction that stays busy with many short statements. ADR-43 already says this.

## Effect on ADR-41 and on the port

- (a): ADR-41 stays open. Sync still meets locked rows on remove, so the `removed` flag is still needed. `isHeld(ctx)` does not change.
- (b): ADR-41 and the bound go away, because there is no row lock. But `isHeld(ctx)` must become a condition that the consumer puts in its own insert, or an insert that the provider builds. `@n8n/leases` has been a published package since B1, so this changes a public contract. Guarantee 3 in Part 2 would also change to "deduplicated at execution".
- (c), a choice for each kind: the numbers do not support it. (b) is not faster, so a high-rate kind gains nothing from it, and there would be 2 code paths to test.

## SQLite

Not benchmarked. The choice makes no difference on SQLite. n8n opens write transactions with `BEGIN IMMEDIATE`, so the consumer holds the only write lock until commit, and no claim can commit in between. Both fences keep guarantee 3. Neither can be bounded by the database, because SQLite has no transaction timeout.

## Limits of this benchmark

- One machine, Docker on macOS, and one run for each point. Absolute numbers will differ on server hardware. The comparison between (a) and (b) should carry over.
- The fenced write is one insert. A real execution writes more rows, which makes the fence a smaller share of the cost.
- A 50 ms sampler can miss short lock waits.
