# Log offload: durable log writes off the shard thread (design note)

Status: built behind `serve --log-offload on` (default `off`). Code: `src/shell/logoff.zig`, hooks in `shard.zig` (`writeLog`, `syncNeed`, `syncLog`) and `server.zig` (`performBatch`, `releaseHeld`). With the flag off, the shard thread writes and syncs the log as before. The shard prints the counters when it stops.

## The problem

The shard thread is the executor. For each batch it encodes one record, copies it to the `FileLog` buffer, and calls `write` and `fsync` when a `sync`-tier action or a schedule fire is in the batch. While `fsync` runs, the shard runs nothing. The target is 100,000 workflows per second on one executor core; other cores can do storage.

## What the shard thread still does

- It encodes the record of the batch (`logfmt.encode`): a 32-byte batch header, and for each logged event a 32-byte header and the payload, padded to 8 bytes. W3 with a 1 KB body logs 1,209 bytes for each run.
- It encodes the record **in the ring** when the ring has room in one piece (about 96% of the records in the measurement). Each byte is then copied one time and read one time (the checksum). The blocking path copies each byte two times, and `write` copies it again.
- If not (the end of the ring, or a record larger than the free room), it encodes the record in the batch buffer and copies it to the ring in parts: two copies.
- It makes no `write` and no `fsync`.

## What moves, and the choice

| | Writer thread on a supporting core (chosen) | `write` + `fsync` on the shard's io_uring |
|---|---|---|
| Where the device time goes | The writer thread | A kernel worker: `IORING_OP_FSYNC` always goes to io-wq |
| System calls on the shard | 0 at load; 1 pipe write to wake a writer that sleeps | 0 more: in the batch's `io_uring_enter` |
| Group commit | One loop: write all queued bytes, sync one time | The shard must build it: a link chain syncs for each batch |
| macOS, tests, simulation | The same code; tests run the writer step by step | Linux only; a second path stays for kqueue |
| State of the base | New | `--io uring` is off by default, gave no gain, has an open error count |

`io-uring-design.md` step 4 links the write, the sync and the replies in one chain. That holds only replies on the ring. Effects go out through epoll, the fallback host and the SQL clients, so the shard needs a hold queue in both designs. The writer thread can use io_uring for its own file later; the shard does not change.

## The hand-off

- **Record ring** (`logoff.Ring`): a ring of bytes with one producer (the shard) and one consumer (the writer), 1 MB, allocated at startup. `head` and `tail` count bytes since the start, each on its own cache line. A **position** is such a count. The position of a record is the position of its end.
- **Sync request:** the shard stores the position that must be durable (`want_sync`). The writer writes all queued bytes, calls `fsync` one time, and stores `synced`: the log is durable up to that position.
- **Back-pressure:** a full ring is a limit. The shard waits for the writer, as it waits for `write` today (`ring_full_waits`). A record larger than the ring goes through it in parts.
- **Wake-ups:** two pipes (`sys.Wake`). The writer looks for work for a short time before it sleeps. The shard asks for a wake-up only before it sleeps with held outputs.
- **A writer error** stops the shard (`error.LogWrite`), as an error of `write` does today.

## Order rules

The shard decides once for each batch (`Shard.syncNeed`): `no`, `tier` (a `sync` action is in the batch) or `all` (a schedule fire, or a new block of `none`-tier ids: "reserved id block").

| Output | `none` | `batched` | `sync` |
|---|---|---|---|
| Dispatch of an effect, reply, finished, attention | Leaves at once | Leaves at once; record synced within `batched_sync_ms` | Waits for `synced` ≥ the position of its batch |
| Any output of a batch with a schedule fire | Waits | Waits | Waits |
| Any output after a new block of `none` ids, until the block is durable | Waits | Waits | Waits |

- **The floor.** The position of the last `all` batch is the floor. While `synced` is below the floor, every output of every later batch waits. An execution that started from the fire, or that uses an id of the block, can run again in a later batch (a timer, more fuel). Its outputs must not pass the fire or the block.
- **One order.** While an output waits, each later output waits behind it. So outputs leave in the order of the blocking path, for all tiers. On the blocking path the whole shard waits for the sync, so no caller waits longer than today. A finer rule (only the same execution waits) needs a lookup for each output.
- **Where outputs wait:** the hold queue (`logoff.Hold`), a FIFO of actions with copies of their payloads (4,096 entries, 1 MB, allocated at startup). A payload lives only until `endBatch`, so the copy is necessary. Each entry has the position it waits for. Positions never go down along the queue.
- **Release without a scan:** the loop reads `synced` one time for each round and takes entries from the front while their position is durable (`Runner.releaseHeld`). It looks at no other entry.
- **A full hold queue** is a limit: the shard waits for the writer (`hold_full_waits`).
- **The shard runs on.** Later batches run on state that is not durable yet. This is safe: an output that needs that state to be durable does not leave before `synced` covers it.
- **Not moved:** the event outbox of the admin API (`outbox.zig`) still writes on the shard thread. The two batches of startup (recovery and configuration) use the blocking path.

## Crash recovery and replay

- The writer appends the bytes of the ring in order to the same file. So the log is byte for byte the log of the blocking path (`logoff_test.zig` compares them), and `Shard.recover` is not changed.
- A crash loses a suffix of records: those in the ring, in the `FileLog` buffer, or written and not synced. The blocking path loses the same kind of suffix. A torn last record is cut on start, as today.
- No output that waits for a record leaves before `fsync` returned for it. So a lost record had no such output outside the process, and the effects in doubt are the same as today (`resolveInDoubt`). `logoff_test.zig` compares them after a crash between the write and the sync.
- A clean stop writes and syncs every queued record, then releases the held outputs.

## What a caller sees

- `sync` tier: the reply waits for the write and the sync of its batch, and for a sync that is in progress: between one and two sync times. One sync covers every batch that came in the meantime, so the wait does not grow with the load. Today a batch waits for the syncs of all batches before it.
- `batched` and `none` tiers: no change. After a new block of `none` ids, the outputs of the next batches wait for one sync (today the one batch waits). On a shard with `sync` work, they wait behind held outputs.

## Measurement

MacBook (not the benchmark machine, other work ran on it), release build, `wfrt serve` with one shard, `wfrt stub`, `wfrt load` with 128 connections, 5 s, W3 with a 1 KB body, 3 rounds. Ratios of the same round; the CPU is the time of the shard thread for each finished run (`--stats`). Runs without a log moved by up to 20% between rounds, so only ratios inside a round mean something.

| W3 tier | Runs per second, offload on / off | Shard CPU for each run, on / off | Blocking log / no log (runs per second) |
|---|---|---|---|
| `sync` | 1.07 (1.07, 1.08, 1.07) | 0.95 (0.95, 0.94, 0.95) | 0.93 |
| `batched` | 1.01 (1.03, 0.78, 1.01) | 0.99 (0.98, 1.27, 0.99) | 0.93 |
| `none` (the log has only id blocks) | 1.00 | 1.00 | 1.00 |

- `sync`: the offload gives 7% more runs for 5% less shard CPU. The load was a closed loop, so each batch waited for its own sync (9,750 syncs for 9,974 records): this run shows no group commit. Longest hold: 3 to 33 ms. macOS `fsync` does not wait for the device; a Linux `fdatasync` does, so measure the gain there.
- `batched`: no gain. The blocking path already makes one `write` and one `fsync` for each 5 ms. The cost that stays is the 1,209 bytes for each run (encode, checksum, memory traffic to the writer's core). To lower it, log fewer bytes: the request body is most of the record.

## Other system calls on the shard thread for each execution

- **Request receive** (`server.zig` `readConn`, `sys.readSome`): one `read` for each readable connection; a short read ends the loop, so no read returns EAGAIN. One read takes many pipelined requests. With `--io uring`, a multishot recv with provided buffers gives a completion for each arrival and no call (`ringWait`).
- **Reply send** (`replyFromCore`, `flushConns`, `flushConn`, `sys.writeSome`): the replies of a batch collect in each connection's buffer; after the batch there is one `send` for each connection with output. With `--io uring`, `ring.send` queues them and one `io_uring_enter` submits all. Possible: `sendmsg` for head and body, `SEND_ZC` for large bodies (`io-uring-design.md` steps 3 and 5).
- **Effect send** (`egress.zig` `doSend`, `sys.writevSome`; HTTP/2: `h2Flush`, `h2Fill`): HTTP/1.1 makes one `writev` for each request. HTTP/2 puts about 64 streams in one send. Egress is not on the ring. Possible: queue the sends for the batch's one `io_uring_enter` (`io-uring-design.md` step 3, points 5 to 7).
- **Effect receive** (`egress.zig` `onConn`, `readRaw`, `sys.readSome`; TLS: `tlsFill`): one `read` for each readable upstream connection. HTTP/2 reads many responses in one call. Possible: a multishot recv in an egress buffer group (`io-uring-design.md` step 3, points 2 to 4).
- **Readiness** (`sys.Poller.wait` or `uring.Ring.enter`): one call for each loop round, shared by the batch.
- **Fallback host** (`flushFallback`, `readFallback`): the frames of a batch go out in one write.
