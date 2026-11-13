# The floor: how many workflows one CPU core can run

Date: 2026-11-12. Branch: `poc/compiled-workflow-engine`. Not committed.

The goal is 100,000 workflows per second on one CPU core. This document:

- measures the smallest CPU cost of each piece of work that a workflow
  does;
- adds the pieces up with the real production mix;
- compares each piece with what `wfrt` costs today.

The benchmarks are in `bench/floor/`. The cost model and its inputs are
in `bench/floor/model.mjs`.

## Answer

The per-core floor, in workflows per second. Linux is the measured GCP
VM. "Batched" means HTTP/2-style batching: many requests in one write on
one connection, with batched submission.

| Class | Unbatched (kernel TCP, one write per message) | Batched, outbound only | Batched, inbound also multiplexed by a proxy | Kernel bypass (cited) | Bound |
|---|---|---|---|---|---|
| W2: webhook in, reply out | 92,000 | 92,000 | 435,000 | 530,000 | The inbound read and write |
| W3: W2 + 1 outbound call | 46,000 | 84,000 | 303,000 | 370,000 | Unbatched: the outbound call. Batched: the inbound request |
| Real mix, all native | 30,000 | 83,000 | 99,000 | 135,000 | Unbatched: outbound calls (75%). Batched: OpenSSL's record layer. Bypass: JSON |
| Real mix, host steps at their floor (3.1 µs each) | 28,000 | 69,000 | 80,000 | 101,000 | As above, plus 2.5 µs of host steps |
| Real mix, host steps as today (≥ 103 µs each) | ≤ 9,700 for any workflow with a host step | ≤ 9,700 | ≤ 9,700 | ≤ 9,700 | The v1 node step in the host |

Which classes can reach 100,000/s on one core:

- **W2:**
  - It reaches 100,000/s only with batching, which needs a proxy that
    multiplexes many webhook clients onto a few connections. Then the
    floor is 435,000/s.
  - Without that, each webhook client is its own connection. One read and
    one write through the kernel then cost 10.9 µs on this VM, so the
    limit is 92,000/s.
  - On bare metal (an estimate) the limit is about 112,000/s. That holds
    only at the very floor, with no thread wakeups.
- **W3:**
  - It reaches 100,000/s only when both the inbound and the outbound
    traffic are batched, or on bare metal with batched outbound traffic
    (estimate: 102,000/s).
- **The real mix, all native:**
  - It reaches 100,000/s only when all of these hold:
    1. Outbound calls go over HTTP/2, many to a write.
    2. Webhooks come in through a multiplexing proxy, or the machine is
       bare metal.
    3. JSON runs at SIMD speed.
    4. Library nodes are compiled to native code.
  - On this VM it then just reaches 99,000/s; on bare metal about
    103,000/s.
  - The term that bounds it is TLS: OpenSSL's per-record work (1.4 µs a
    call batched), not the cipher (0.5 µs). Next comes JSON (2.5–3.0 µs a
    workflow).
  - With kernel bypass the limit is 135,000/s, and JSON bounds it.
- **The real mix with host steps:**
  - Not while any v1 node runs in the host. One v1 step costs at least
    89 µs in the host and 14 µs in wfrt, so a workflow with one host step
    cannot exceed 9,700/s per core.
  - 88.9% of all workflows in the census have at least one host node.
- **Unbatched, no class except W2 reaches even 50,000/s.** On this VM
  one kernel TCP request and response costs 9.2–9.8 µs of CPU at each
  end, even when no thread sleeps or wakes. The TAS paper measured
  7.5 µs per request on bare-metal Linux. A workflow that makes 2.35
  calls cannot pass 100,000/s with one write per call.

Why the costs are high on this VM:

- the retpoline and retbleed mitigations of Zen 2 (`getppid` costs
  150–185 ns);
- the host's nf_tables NAT rules, which every loopback packet passes;
- SMT: the peer threads ran on the sibling of the measured CPU.

wfrt today:

| Workload | macOS | Linux |
|---|---|---|
| W2 | 14.5 µs, 1.3× the floor | 19.9 µs |
| W3 | 30 µs | 42 µs |
| Real mix, all native | about 67 µs per workflow, 15,000/s per core | |
| Real mix, host steps as today | 150–830 µs per workflow | |

The host steps decide today's rate. After them, the largest gap is the
interpreted library nodes (40× the hand-written cost).

## Machines and method

| | macOS | Linux |
|---|---|---|
| CPU | Apple M5 Pro (6 P, 12 E cores) | AMD EPYC 7B12 (Zen 2), GCP VM |
| Kernel | Darwin 25.6 | Linux 7.0.0-1013-gcp |
| OpenSSL | 3.5.9 | 3.0.13 |
| Clock during runs (measured) | 2.98–3.21 GHz | 3.15 GHz quiet, 2.48–2.63 GHz busy |
| Load | load average 20–30 (other agents) | a load test on other cores; nf_tables NAT; retpoline and retbleed mitigations |
| Pinning | none possible (QoS user-interactive) | measured thread on vCPU 7; peers on vCPU 15, the SMT sibling of 7 |

- Every number is CPU time of the thread or the process that does the
  work, not a rate. The sources are `CLOCK_THREAD_CPUTIME_ID`,
  `/proc/<pid>/stat` and `ps`.
- `floor freq` gives the clock: a chain of 32 dependent integer adds per
  loop iteration. Each add takes one cycle on both CPUs.
- On Linux, peers on the SMT sibling make the side-by-side CPU times a
  little higher. For the floors that must keep the two sides apart,
  `net --inline` runs both ends of each connection on one thread, so no
  thread sleeps or wakes.
- Each measurement ran 2 to 3 times. The tables give the median and, in
  brackets, the range. The machines were shared, so compare numbers from
  one session and use the ratios. On Linux, the core and JSON terms come
  from a busy period (2.5 GHz), and the inline network terms come from a
  quiet one (3.15 GHz).
- The inputs of the mix are in `bench/floor/mix/mix-sizes.json`, which
  holds aggregates only. No payload content was kept.

## The real mix

The mix inputs come from three sources:

- the 1,000 reference runs of `sets/1000` (`expected.json`);
- 333 replays traced through an HTTPS proxy that counts bytes;
- the census of 147,671 production workflows.

| Quantity per workflow run | Mean | p50 | p90 | p99 |
|---|---|---|---|---|
| Node runs | 4.52 | 3 | 7 | 26 |
| Items per node run | 1.31 | | | |
| Vendor node runs | 1.69 | 1 | 3 | 12 |
| Vendor HTTP calls | 2.35 | 1 | 5 | 13 |
| Vendor response body bytes, per call | 762 | 359 | 1,352 | 4,399 |
| Vendor request body bytes, per call | 352 | 0 | 416 | 6,430 |
| Request head bytes, per call | 473 | 441 | 538 | |
| Vendor body bytes in + out | 2,623 | 706 | 4,563 | 30,087 |
| Item JSON bytes (all node runs) | 2,226 | 543 | 3,897 | 21,585 |
| Trigger payload bytes | 228 | 181 | 285 | 1,407 |

- **Trigger classes in the sample:** webhook 22%, schedule 52%, other
  23%, app event 4%. Only a webhook execution has an inbound HTTP
  request, so the model weights the inbound term by 0.22.
- **Calls by host:** Google Sheets 57%, other Google APIs 20%, Slack 3%,
  Microsoft Graph 2%, Notion 2%.
- **Host steps:** 17.7% of node runs go to the host, which is 0.80 host
  steps per run.

Host nodes in the census (nodes in the workflow, not steps that ran):

| Trigger class | Workflows | No host node | At least one host node | Mean host nodes |
|---|---|---|---|---|
| All | 146,750 | 11.1% | 88.9% | 4.18 |
| Webhook | 17,613 | 18.3% | 81.7% | 2.98 |
| Schedule | 44,727 | 9.5% | 90.5% | 3.82 |
| App event | 2,520 | 13.0% | 87.0% | 4.43 |
| Other | 9,045 | 14.4% | 85.6% | 3.24 |

Host nodes per workflow (all classes): 0 in 11.1%, 1 in 18.8%, 2 in
17.3%, 3 in 13.0%, 4 in 9.5%, 5 or more in 30.3%.

## The floors

### 1. Inbound HTTP on loopback, keep-alive

`floor net` runs one server thread. Client threads keep one request in
flight on each connection, or `--pipeline N` requests. The request is
1,024 bytes of JSON with 6 headers, and the response is 64 bytes.

| Mode | What it does |
|---|---|
| `raw` | One read and one write per request. It parses nothing. |
| `http` | Adds a minimal HTTP/1.1 parser (request line, every header, content-length) and a formatter. |
| `uring` | Sends every send and recv of one loop in one `io_uring_enter`. |
| `uring_ms` | Also uses multishot recv into a provided buffer ring. |
| `--inline` | Plays both ends of each connection on one thread. |

Server CPU per request, µs:

| Mode | 1 connection | 64 connections | 512 connections |
|---|---|---|---|
| macOS raw (kqueue) | 12.4 (12.1–14.9) | 10.4 (10.2–11.1) | 11.6 (10.9–11.9) |
| macOS http | 14.6 | 11.0 (11.0–12.4) | 10.9 |
| Linux raw (epoll) | 26.2 (25.9–40.0) | 16.5 (15.7–24.2) | 19.3 (18.1–29.1) |
| Linux http (epoll) | 27.8 | 17.6 (17.0–24.8) | 20.1 (19.0–29.5) |
| Linux uring | 26.2 | 13.8 (13.2–19.9) | 15.8 (15.2–21.8) |
| Linux uring_ms | 26.0 | 13.3 (12.6–20.5) | 16.8 (15.6–24.7) |
| Linux inline, server side (no wakeups) | 8.8 (8.7–13.0) | 9.2 (9.1–13.6) | 10.3 (9.9–10.3; one outlier at 75) |

Where the time goes:

- **macOS, 64 connections:** `read` 4.7–5.1 µs, `write` 5.1 µs and
  `kevent` 0.4 µs. One `kevent` call returns 30 to 450 events.
- **Linux, inline:** `read` 1.9–2.1 µs and `write` 6.8–7.2 µs. A loopback
  write carries the whole TCP send path, the loopback receive path and
  the ACK.
- **Linux with real threads:** each write also wakes the peer thread, so
  the write then costs 10.3–13.3 µs.
- **The parser and formatter** cost 0.5–1 µs per request.

The kernel is 90% or more of the unbatched inbound floor.

Other kernel costs (`floor syscalls`, `floor churn`):

| Call | macOS | Linux |
|---|---|---|
| `getppid` (smallest system call) | 130–150 ns | 150 ns quiet, 185 ns busy |
| Empty poll (`kevent` / `epoll_wait`, timeout 0) | 2.9–4.3 µs | 0.18–0.22 µs |
| `clock_gettime` | 20–24 ns | 29–35 ns |
| New TCP connection and close (both ends) | 52 µs | 63 µs (60–67) |

### 2. One outbound HTTP call over a kept-alive connection

This is the client side of the same benchmark. The request has a
350-byte body, and the responses have the sizes of the real mix.

Client CPU per call, µs, one request per write:

| Response body | macOS plain | macOS TLS 1.3 | Linux plain | Linux TLS 1.3 |
|---|---|---|---|---|
| 200 B | 14.7 | 17.3–17.8 | 17.7 (16.5–17.7) | 25.1 (24.0–26.3) |
| 760 B (mean) | 14.5 | 17.2–17.9 | 17.7 (16.7–17.7) | 26.5 (24.3–27.4) |
| 4,400 B (p99) | 14.8 | 19.2 | 19.1 (18.6–19.1) | 29.4 (29.0–30.8) |
| Linux inline client side, plain, 760 B | | | 9.6 (9.3–11.4) | |

TLS:

- **Cost per call:** TLS adds about 3 µs per call on macOS and 8.5 µs
  on Linux. The setup is OpenSSL 3, TLS_AES_128_GCM_SHA256 and
  read-ahead on.
- **The cipher:** AES-128-GCM runs at 3.2 GB/s on the M5 Pro
  (`openssl speed -evp aes-128-gcm`, 1 KB blocks). One call moves about
  1.5 KB, so the cipher costs about 0.5 µs. The rest is the record layer
  and extra calls.
- **Read-ahead:** without it, OpenSSL reads each record in two `read`
  calls, the header and then the body. This costs 0.8–1.3 µs more per
  call (macOS). wfrt's egress runs without read-ahead today.
- **Handshake:** a full TLS 1.3 handshake costs 420–470 µs of client CPU
  and 265–290 µs of server CPU on macOS. On Linux it costs 545–640 µs and
  320–410 µs. The default key share of OpenSSL 3.5 includes ML-KEM-768.
  For reference: X25519 is 34 µs per operation, an ECDSA P-256 verify
  53 µs, and ML-KEM-768 keygen plus decaps 93 µs. A kept-alive connection
  pays the handshake once.

### 2b. Batching: many requests in one write

`floor net --pipeline N` sends N requests in one write on each of 16
connections. The server parses them all and answers in one write.
Pipelined HTTP/1.1 is a stand-in for many HTTP/2 streams in one write.
These runs were on macOS. On Linux they were not run, because no core
was free.

CPU per request, µs (median of 3, range in brackets):

| Requests per write | Server, plain | Client, plain | Server, TLS | Client, TLS | Kernel read + write per request, client, plain |
|---|---|---|---|---|---|
| 1 | 11.3 (10.7–11.7) | 14.9 (14.9–14.9) | 14.7 (13.5–14.7) | 17.7 (17.3–17.9) | 11.7 |
| 8 | 2.0 (1.8–2.0) | 2.1 (1.9–2.1) | 2.7 (2.4–2.8) | 2.8 (2.5–2.9) | 1.4 |
| 64 | 0.85 (0.75–0.86) | 0.60 (0.51–0.61) | 1.66 (1.54–1.70) | 1.51 (1.45–1.54) | 0.32 |
| raw, 64 (no parser) | 0.32 | 0.41 | | | 0.34 |

- The kernel cost is almost all fixed per call, and the bytes add
  little. At 64 per write, the kernel part of a call falls from 11.7 to
  0.32 µs. What is left is the HTTP parser and formatter (about 0.3–0.5
  µs) and, over TLS, the record layer (about 0.9 µs).
- **The batch size in real use:** a batch has as many calls as are ready
  for one vendor host within one loop. At 100,000 workflows/s, 2.35
  calls each, 57% of calls go to Google Sheets: 134,000 calls/s. A loop
  of 100 µs then holds about 13 calls for that host, and 64 calls need
  about 0.5 ms. Responses also come back one by one at the rate the
  vendor answers, so reads batch less well than writes. The model uses
  the 64-per-write values as the floor; 8 per write costs about 3 times
  more per call.

### 3. JSON

`floor core json` runs wfrt's own codec (`src/core/json.zig`) on files
from `gen-json.mjs`. The files have the sizes of the real mix and the
shapes of vendor APIs: nested objects, ids, numbers and escaped text.
`simd/simdjson-bench` runs simdjson on the same files. The library is
5.0.5 on macOS and the 3.12.3 single header on Linux, built with
`-march=native`.

macOS:

| Size | wfrt decode | wfrt encode | simdjson DOM parse | simdjson On-Demand walk | simdjson serialize |
|---|---|---|---|---|---|
| 298 B | 1.0 µs | 1.1 µs | 0.22 µs | 0.25 µs | 0.45 µs |
| 541 B | 1.7 µs | 1.8 µs | 0.36 µs | 0.44 µs | 0.81 µs |
| 1,237 B | 3.9 µs | 4.0 µs | 0.84 µs | 1.0 µs | 1.8 µs |
| 4,287 B | 13.1 µs | 13.4 µs | 2.9 µs | 3.6 µs | 5.9 µs |
| 66 KB | 202 µs | 209 µs | 45 µs | 56 µs | 94 µs |

Throughput:

| | wfrt decode | wfrt encode | simdjson parse | simdjson serialize |
|---|---|---|---|---|
| macOS | 295–330 MB/s | 282–320 MB/s | 1.36–1.49 GB/s | 0.66–0.73 GB/s |
| Linux (busy) | 163–243 MB/s | 157–240 MB/s | 1.02–1.33 GB/s | 0.41–0.52 GB/s |

- simdjson parses 4.5 to 6 times faster.
- Its serializer is 2.2 times faster. A serializer that writes from typed
  native data (no tagged values) can do better still.
- Published simdjson numbers are 2–3 GB/s for large documents. These
  documents are small, and the machines were loaded.
- Per workflow of the mix (1,795 B decoded, 828 B encoded): wfrt today
  costs 8.2 µs on macOS. The floor is 2.5 µs (macOS) and 3.0 µs (Linux).

### 4. Per-node work

`floor core` drives wfrt's own `Shard.tick` in process. Canned responses
answer the effects at once. Each cost per node is a difference between
two workloads: one with 40 glue nodes or 8 calls, and the same workflow
with no node. `floor native` does the same work in hand-written Zig. That
is the lower bound of an ahead-of-time compiled node.

| Work | wfrt today, macOS | wfrt today, Linux (busy) | Hand-written Zig (macOS / Linux) | Gap |
|---|---|---|---|---|
| One bytecode op (glue workloads) | 15 ns | 30 ns | — | — |
| Glue node (Set, IF, Filter, Switch, Merge in turn), 1 item | 0.94 µs | 1.87 µs | Set 0.06 / 0.07 µs | 15× |
| Glue node, 2 items | 1.61 µs | 2.95 µs | | |
| Execution with no node (start, trigger decode, reply) | 1.2 µs | 1.9 µs | about 0.1 µs (estimate) | 12× |
| Effect round trip in the core (plain `ctx.http`), no network | 3.6 µs | 4.5 µs | — | — |
| Slack library node (1 call) | 6.7 µs | 11.0 µs | — | — |
| Google Sheets append (4 calls) | 32.6 µs | 56.7 µs | 0.69 / 1.2 µs | 47× |

- The four calls of a Sheets append are the sheet list, the sheet data,
  the new row and the write.
- The hand-written IF folds to almost nothing, so its cost is below the
  Set node's.
- W1 (glue with a 1 KB trigger) costs 7.9 µs on macOS today: 138 ops.
  Most of the time is the decode of the 1 KB trigger.
- The profile (`sample`) of the effect round trip gives 54% to the
  interpreter and 23% to JSON: the encode of the request description and
  the decode of the result. The idempotency key (SHA-256) is about 1%.
- A Sheets append is 1,500 interpreted ops. The hand-written form formats
  the four requests (991 bytes) and scans the four responses (595 bytes)
  once.

### 5. Durability

`floor log` makes one `write` per batch of records, then the sync of the
tier. Each record is a 4-byte length and the body, as in wfrt's log.

CPU per execution:

| Tier, record size | Batch 1 | Batch 64 | Batch 512 |
|---|---|---|---|
| none (32 B id reservation), macOS / Linux | 2.4 / 0.9 µs | 0.07 / 0.04 µs | 0.015 / 0.023 µs |
| batched (1,072 B), macOS / Linux | 2.7 / 1.8 µs | 0.23 / 0.80 µs | 0.16 / 1.19 µs |
| sync (`fsync`), macOS / Linux | 33 / 112 µs | 1.0 / 3.1 µs | 0.25 / 0.94 µs |
| full sync (`F_FULLFSYNC`), macOS | 149 µs | 3.8 µs | 0.56 µs |

- The wall time of a synced batch is latency, not CPU:
  - `fsync`: 47 µs to 0.3 ms on macOS, 2.2 to 3.7 ms on Linux (GCP
    persistent disk);
  - `F_FULLFSYNC` on macOS: 3.6 to 3.9 ms.
- At batch 64 or more, the log costs at most about 1 µs per execution in
  every tier.
- On Linux, the batched tier costs 0.8–1.2 µs, because the copy into the
  page cache costs about 1 ns per byte. It is a small term, but not zero.

### 6. The host (a cross-process step)

| Work | macOS | Linux |
|---|---|---|
| Unix-socket round trip, 1 KB frame, unbatched: wfrt side / host side | 6.5 / 6.4 µs | 12.0 / 12.3 µs |
| The same, 16 frames per write | 0.47 / 0.45 µs per step | 0.93 / 0.94 µs |
| The same, 64 frames per write | 0.19 / 0.18 µs per step | 0.43 / 0.43 µs |
| JavaScript call (JIT, inlined) | 0.6 ns | 1.4 ns |
| Call of a function compiled in a `vm` context | 8.4–8.9 ns | 11.4–12.8 ns |
| `Script.runInContext` | 303–309 ns | 639–642 ns |
| Minimal step: `JSON.parse` of the frame, run, `JSON.stringify` | 1.07–1.09 µs | 2.2–2.8 µs |
| New `vm` context | 276–286 µs | 372–379 µs |
| v1 node step in the host (Set 3.4, native-subset expression; poc-report) | 89 µs (84–110) | not measured |
| Host CPU per host node run, warm real workflows (poc-report) | mean 940 µs, p50 433 µs | not measured |

- The floor of a host step is the batched IPC on both sides plus a
  minimal V8 step: about 1.5 µs on macOS and 3.1 µs on Linux. Unbatched,
  it is about 14 µs (macOS) and 26 µs (Linux).
- Today's v1 step costs 60 to 600 times the floor. The cost is in n8n's
  v1 node machinery (execution context, parameter resolution, expression
  evaluation), not in IPC or V8.

## The cost model

```text
cost(wf) = webhook_share × inbound
         + exec
         + glue_runs × glue
         + calls × (outbound + tls + call_work)
         + json_decode(bytes_in) + json_encode(bytes_out)
         + log
         + host_steps × host_step
```

The mix gives these inputs:

| Input | Value |
|---|---|
| Webhook share | 0.22 |
| Glue and Code runs | 4.52 − 1 trigger − 1.69 vendor node runs = 1.83 |
| Calls | 2.35 |
| Bytes in | 1,795 |
| Bytes out | 828 |
| Host steps | 0.80 |

`node bench/floor/model.mjs` holds the inputs and prints every row
below.

### Inputs per term, µs

| Term | macOS floor | macOS today | Linux VM floor | Linux VM today |
|---|---|---|---|---|
| inbound (one request, kernel + parser) | 10.7 (W2 kernel time from `sample` + 0.5) | 14.5 (W2, all of it) | 10.0 (inline 9.24 + 0.3 epoll + 0.5) | 19.9 (W2, all of it) |
| outbound (one call, kernel + parser) | 12.0 (W3 − W2 kernel time) | 11.8 (W3 − W2 − core) | 10.6 (inline 9.79 + 0.3 + 0.5) | 17.7 (W3 − W2 − core) |
| outbound, batched 64 per write | 0.6 | | 0.7 (estimate: macOS × 1.2) | |
| inbound, batched 64 per write | 0.85 | | 1.4 (estimate: macOS × 1.6) | |
| TLS per call | 0.5 (cipher) | 3.5 | 0.5 | 8.5 (floor benchmark) |
| TLS per call, batched 64 per write | 0.9 | | 1.4 (estimate: macOS × 1.5) | |
| call work (request build + response map) | 0.17 | 7.0 | 0.3 | 12.0 |
| JSON decode / encode | 1.4 / 0.7 GB/s | 0.32 / 0.32 GB/s | 1.3 / 0.5 GB/s | 0.2 / 0.2 GB/s |
| glue node | 0.06 | 0.94 | 0.07 | 1.87 |
| execution (no node) | 0.1 | 1.2 | 0.1 | 1.87 |
| log | 0.16 | 0.3 | 0.8 | 0.8 |
| host step | 1.5 | 89 + 14 (mean 940 + 14) | 3.1 | macOS values |

### Floors per workflow class

| Machine | Level | W2 | W3 | Mix, all native | Mix, host steps at floor |
|---|---|---|---|---|---|
| macOS | floor, unbatched | 11.0 µs, 91,000/s | 23.1 µs, 43,000/s | 35.0 µs, 28,500/s | 36.2 µs, 27,600/s |
| macOS | batched outbound | 11.0 µs, 91,000/s | 11.7 µs, 85,000/s | 9.2 µs, 109,000/s | 10.4 µs, 96,000/s |
| macOS | batched in and out | 1.1 µs, 900,000/s | 1.9 µs, 532,000/s | 7.0 µs, 142,000/s | 8.2 µs, 122,000/s |
| macOS | kernel bypass (cited) | 1.3 µs | 1.9 µs | 5.9 µs, 170,000/s | 7.1 µs, 141,000/s |
| macOS | wfrt today | 14.8 µs, 68,000/s | 30.3 µs, 33,000/s | 66.8 µs, 15,000/s | 149 µs, 6,700/s (v1 steps) |
| Linux VM | floor, unbatched | 10.9 µs, 92,000/s | 21.8 µs, 46,000/s | 33.1 µs, 30,000/s | 35.6 µs, 28,000/s |
| Linux VM | batched outbound | 10.9 µs, 92,000/s | 11.9 µs, 84,000/s | 12.0 µs, 83,000/s | 14.5 µs, 69,000/s |
| Linux VM | batched in and out | 2.3 µs, 435,000/s | 3.3 µs, 303,000/s | 10.1 µs, 99,000/s | 12.6 µs, 80,000/s |
| Linux VM | kernel bypass (cited) | 1.9 µs, 526,000/s | 2.7 µs, 370,000/s | 7.4 µs, 135,000/s | 9.9 µs, 101,000/s |
| Linux VM | wfrt today | 20.7 µs, 48,000/s | 42.9 µs, 23,000/s | 113 µs, 8,900/s | 195 µs, 5,100/s (v1 steps) |
| Linux bare metal (estimate) | floor, unbatched | 8.9 µs, 112,000/s | 17.7 µs, 57,000/s | 27.7 µs, 36,000/s | 30.2 µs, 33,000/s |
| Linux bare metal (estimate) | batched outbound | 8.9 µs, 112,000/s | 9.8 µs, 102,000/s | 11.2 µs, 89,000/s | 13.7 µs, 73,000/s |
| Linux bare metal (estimate) | batched in and out | 2.0 µs, 495,000/s | 2.9 µs, 347,000/s | 9.7 µs, 103,000/s | 12.2 µs, 82,000/s |

The estimates and citations behind these rows:

- **Bare metal:** the Linux VM's network terms × 0.8. TAS reports 7.5 µs
  of Linux TCP processing per request on bare metal, against 9.2–9.8 µs
  per side here.
- **Kernel bypass:** 0.5 µs per message. IX and mTCP report 10× to 25×
  the small-message throughput of Linux. IX cuts kernel time from about
  75% to under 10%. These numbers are cited from the papers, not
  measured here.

Check the W2 floor on Linux by hand:

1. Inline, server side: read 2.07 µs + write 7.17 µs = 9.24 µs.
2. Add the epoll share (0.3 µs) and the parser (0.5 µs): 10.0 µs.
3. Add the execution (0.1 µs) and the log (0.8 µs): 10.9 µs.
4. 1,000,000 / 10.9 = 92,000/s.
5. At 3.15 GHz this is 34,000 cycles per workflow. The kernel takes
   29,000 of them.

Check the batched mix on Linux by hand, in µs:

| Term | Arithmetic | µs |
|---|---|---|
| Inbound | 0.22 × 10.0 | 2.2 |
| Calls | 2.35 × (0.7 + 1.4 + 0.3) | 5.6 |
| JSON | 1,795 B / 1,300 MB/s + 828 B / 500 MB/s | 3.0 |
| Glue | 1.83 × 0.07 | 0.13 |
| Execution | | 0.1 |
| Log | | 0.8 |
| Total | | 11.9 |

That is 84,000/s; the model gives 12.0 µs because it rounds less.

### The bound of host steps, per workflow class

Today a host step costs at least 89 µs in the host and 14 µs in wfrt.

- A workflow with one or more host steps runs at most 1,000,000 / 103 =
  9,700/s per core.
- At the mean real host step (954 µs), it runs at most 1,050/s.
- So for these workflows, 100,000/s per core is impossible while the
  step stays in the host.

| Trigger class | Workflows with at least one host node | Bound today, one host step | Bound at the mean host step |
|---|---|---|---|
| All | 88.9% | ≤ 9,700/s | ≤ 1,050/s |
| Webhook | 81.7% | ≤ 9,700/s | ≤ 1,050/s |
| Schedule | 90.5% | ≤ 9,700/s | ≤ 1,050/s |
| App event | 87.0% | ≤ 9,700/s | ≤ 1,050/s |
| Other | 85.6% | ≤ 9,700/s | ≤ 1,050/s |

At the floor of a host step (1.5–3.1 µs batched), host steps add 1.2 to
2.5 µs per workflow. Then they no longer decide the rate.

## The gap table

For each term, the table gives:

- what wfrt costs today;
- the floor;
- the gap between them, and what to cut.

The numbers are from macOS, with today and the floor measured in the
same session.

| Term | wfrt today | Floor | Gap | Per mix workflow, today → floor | What to cut |
|---|---|---|---|---|---|
| Host step | 89–954 µs host + 14 µs wfrt | 1.5 µs | 60–600× | 82–760 µs → 1.2 µs | Port the v1 nodes that the census names (Code, HTTP Request, Sheets, Slack, Postgres, data tables, Set, agents, Gmail). Until this is done, no other term changes the rate |
| Outbound call: kernel + shell | 11.8 µs | 12.0 µs unbatched, 0.6 µs at 64 per write | 1× now; 20× against batching | 28 µs → 1.4 µs | HTTP/2 to vendors with many streams in one write (the egress agent is building it); batched submission |
| TLS per call | 3.5 µs | 0.5 µs cipher; 0.9 µs batched | 4–7× | 8.2 µs → 2.1 µs | OpenSSL read-ahead (−0.8 to −1.3 µs); one `SSL_write` per batch; full 16 KB records |
| Core work per vendor call | 7 µs (Slack 6.7, Sheets 8.2 per call) | 0.17 µs | 40× | 16.5 µs → 0.4 µs | Compile library nodes ahead of time, or give them native helpers for request building and response mapping |
| Effect round trip in the core | 3.6 µs | — | — | (in the line above) | Less JSON: pass the request as a native struct, not JSON text; decode the response once |
| JSON | 0.32 GB/s both ways | 1.4 GB/s parse, 0.7 GB/s write | 2.2–4.5× | 8.2 µs → 2.5 µs | A SIMD structural scan for decode; a faster number and string writer for encode. Once calls are batched, JSON and TLS are the two largest terms |
| Inbound request (W2 total) | 14.5 µs | 10.7 µs unbatched | 1.35× | 3.2 µs → 2.4 µs | 4.3 µs of user code per request: header scanning (`findPos`, `eqlBytes`), trigger JSON, `memset` of buffers in safe builds. Batching needs a multiplexing proxy in front |
| Glue node | 0.94 µs | 0.06 µs | 15× | 1.7 µs → 0.1 µs | Not a priority: 1.83 runs per workflow |
| Execution start and finish | 1.2 µs | about 0.1 µs | 12× | 1.2 µs → 0.1 µs | Not a priority |
| Log | about 0.3 µs | 0.16 µs | 2× | 0.3 µs → 0.16 µs | At the floor |

Order of work for the runtime agent:

1. **Host steps.**
   - They are 55% of today's mix cost at the cheapest v1 step, and 92% at
     the mean real one.
2. **Batched outbound calls (HTTP/2) and the library nodes.**
   - Without batching, the outbound kernel cost alone holds the mix
     below 30,000/s per core.
   - Library-node work is 16.5 µs per workflow.
3. **TLS record handling, then JSON.**
   - After batching, these are the largest terms.
4. **When to stop:**
   - On this VM, stop when the all-native mix is near 12 µs per workflow
     (83,000/s) with batched outbound calls.
   - Beyond that, only these help: a multiplexing proxy for webhooks,
     bare metal, or kernel bypass.

## In-flight executions and memory

Most of a real workflow's time is spent waiting for vendors. By
Little's law, in-flight calls = rate × calls per workflow × latency.
At 100,000/s and 2.35 calls per workflow (calls in sequence):

| Vendor latency | In-flight calls and waiting executions | With 1 call per workflow |
|---|---|---|
| 50 ms | 11,750 | 5,000 |
| 300 ms | 70,500 | 30,000 |
| 1,000 ms | 235,000 | 100,000 |

### Memory per waiting execution and per open connection

| Item | Measured | Resident per in-flight call |
|---|---|---|
| Execution region, plain HTTP or Slack workflow | 4 KB class, 2.0–3.9 KB used at the wait | 4 KB |
| Execution region, Sheets append | 64 KB class, 6.5 KB used | 8 KB (4 KB pages), 16 KB (16 KB pages, macOS) |
| Egress connection buffers (`rbuf` 16 KB + `wbuf` 16 KB, reserved) | a typical call touches one page of each | 8 KB (Linux), 32 KB (macOS) |
| OpenSSL client state, TLS 1.3, `SSL_MODE_RELEASE_BUFFERS` (wfrt's mode) | 34 KB (macOS, OpenSSL 3.5) | 34 KB |
| OpenSSL client state without released buffers | 100–108 KB (macOS); 55 KB (Linux, OpenSSL 3.0) | — |
| Kernel socket, idle (Linux slab: socket, inode, file, TCP and epoll objects) | 3.4 KB (134 MB of slab for 40,000 sockets) | 3.4 KB + data in flight |
| HTTP/2 stream instead of a connection | HPACK tables and TLS state shared by about 100 streams | about 1 KB per stream (estimate) |

Per in-flight call, today (HTTP/1.1 and TLS):

- On Linux: about 4 + 8 + 34 + 3.4 ≈ 50 KB.
- With HTTP/2 multiplexing: about 4 + 1 + (34 + 3.4) / 100 ≈ 5.4 KB.

| Latency | HTTP/1.1 + TLS, 50 KB per call | HTTP/2, 5.4 KB per call |
|---|---|---|
| 50 ms (11,750 calls) | 0.6 GB | 63 MB |
| 300 ms (70,500 calls) | 3.5 GB | 0.38 GB |
| 1,000 ms (235,000 calls) | 11.8 GB | 1.3 GB |

### CPU of keeping connections and executions alive

- **Idle descriptors in the poller cost almost nothing.**
  - macOS (kqueue): with 64 active connections, the server's CPU per
    request was 10.8 µs with 0, 1,000 and 10,000 idle connections.
  - Linux (epoll), same setup:
    - 16.5 µs with 0 idle connections;
    - 15.6 µs with 10,000;
    - 19.1 µs with 50,000. This is one sample, so cache effects are
      possible.
  - macOS has only about 16,000 ephemeral ports, so 50,000 loopback
    connections cannot be made there.
- **Timer heap:** one insert and one pop in a binary heap.
  - macOS: 41 ns at 1,000 timers, 58 ns at 10,000, 67 ns at 50,000.
  - Linux: 19, 29 and 41 ns.
- **Keep-alive churn:**
  - A new TCP connection with its close costs 52 µs (macOS) to 63 µs
    (Linux), both ends.
  - A new TLS 1.3 connection adds 420–640 µs of client CPU.
  - If 1% of calls need a new connection, each call costs 5 to 7 µs
    more on average. That is as much as the whole batched call.
  - Vendors that close idle connections quickly make this term large.
    TLS session resumption and HTTP/2 (fewer, longer-lived connections)
    both cut it.

### Do today's limits allow it?

| Limit | Default | Embedded profile (n8n) | Workflows/s per shard at 300 ms, 2.35 calls: default / embedded |
|---|---|---|---|
| `max_egress` (outbound connections and requests in flight) | 4,096 | 256 | 5,800 / 360 |
| `slots` (executions in memory) | 16,384 | 1,024 | 23,200 / 1,450 |
| Region class 64 KB entries | 1,024 | 256 | 1,450 / 360 (Sheets-sized executions) |
| `max_conns` (inbound) | 4,096 | 256 | (webhook connections only) |
| Ephemeral ports to one vendor address | about 28,000 per source address (Linux default range) | | 57% of calls go to Sheets: 40,000 connections at 300 ms, more than the range |

- At 300 ms latency, the embedded profile caps a shard at about 360
  workflows/s, and the defaults cap it at about 5,800/s. These caps come
  long before the CPU floor.
- To reach the batched CPU floor of the mix (83,000/s) at 300 ms, one
  shard needs about 58,000 calls in flight:
  - With HTTP/1.1, that is 58,000 connections (more than the ephemeral
    ports to one vendor address) and about 2.9 GB.
  - With HTTP/2, that is about 600 connections and 0.3 GB.

## Sources cited, not measured

- **TAS** (Kaufmann et al., EuroSys 2019): Linux spends about 7.5 µs per
  request in TCP processing on bare metal. TAS has up to 90% more
  throughput than IX.
  <https://courses.grainger.illinois.edu/ece598hpn/fa2023/papers/tas.pdf>
- **IX** (Belay et al., OSDI 2014): kernel time falls from about 75% of
  CPU with Linux to under 10%. On short messages, IX has up to 10× the
  throughput of Linux.
  <https://pdos.csail.mit.edu/6.S081/2018/readings/osdi14-paper-belay.pdf>
- **mTCP** (Jeong et al., NSDI 2014): 25× the small-message throughput
  of Linux on 8 cores.
  <https://courses.grainger.illinois.edu/cs598hpn/fa2019/papers/mTCP.pdf>

## How to run

```bash
cd workflow-runtime/bench/floor
zig build -Drelease=true                        # zig-out/bin/floor
./zig-out/bin/floor freq
./zig-out/bin/floor net --mode http --conns 64 --secs 3
./zig-out/bin/floor net --mode http --conns 16 --req 350 --resp 760 --pipeline 64
./zig-out/bin/floor net --inline --conns 64     # both ends on one thread (Linux)
./zig-out/bin/floor net --mode tls --conns 64 --req 350 --resp 760 --cert c.pem --key k.pem
./zig-out/bin/floor net --mode uring_ms --conns 64          # Linux
./zig-out/bin/floor ipc --frame 1024 --batch 16
./zig-out/bin/floor log --path /tmp/x.log --tier sync --batch 64
./zig-out/bin/floor churn
node workflows.mjs /tmp/wl                       # compile the core workloads
./zig-out/bin/floor core module --wfm /tmp/wl/http-n8/http-n8.wfm --trigger /tmp/wl/trigger.json --resp /tmp/wl/ok-resp.json
node gen-json.mjs data && ./zig-out/bin/floor core json --file data/p99-4400.json
./zig-out/bin/floor native
node host-v8.mjs
./wfrt-http.sh ../../zig-out/bin/wfrt 3 5 64     # wfrt W2 and W3, CPU per execution
CORE=7 PEERS=15 ./linux-run.sh /tmp/wl results.txt   # all of it, pinned (Linux)
node summarize.mjs results.txt                   # median and range per group
node model.mjs                                   # the cost model
```

`mix/` holds:

- the scripts that measured the mix (`mix-stats.mjs`,
  `sizes-replay.mjs`);
- the aggregate result (`mix-sizes.json`).

The per-bundle rows are not in the tree.
