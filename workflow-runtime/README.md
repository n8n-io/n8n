# workflow-runtime (PoC)

The Zig runtime for the compiled workflow engine proof of concept. It runs
bytecode modules from `packages/@n8n/workflow-lang` start to finish in one
process: webhooks come in, steps run, replies go out, and n8n is not on the
request path. The contract with the compiler is
`packages/@n8n/workflow-lang/docs/spec.md`. Results are in
[docs/poc-report.md](docs/poc-report.md).

Zig 0.17.0 exactly. The shell links libc, OpenSSL 3 (outbound TLS) and
c-ares (DNS). On macOS: `brew install openssl@3 c-ares`; the build reads them
from `$HOMEBREW_PREFIX/opt`. On Linux: `libssl-dev` and `libc-ares-dev`.
`zig build -Dnet=false` builds without them, for example to cross-compile;
`https://` URLs and DNS names then fail with a clear effect error.

## Layout

| Path | What it is |
|---|---|
| `src/core/` | The deterministic core: module verifier, interpreter, region heap and compaction, JSON codec, standard library, the shard `step` function, log record format. No I/O, clock or threads. |
| `src/shell/` | The platform shell: the shard pipeline (log, sync tiers, snapshots, recovery), HTTP server and client, fallback host link, crash simulation, benchmarks. |
| `bench/run.sh` | The HTTP workloads W2, W3, W4 and W7, and W3 over TLS (`ONLY=w3tls`). |
| `bench/egress-test.sh` | Integration test of outbound HTTP: TLS, DNS, bodies, redirects, credentials, over HTTP/1.1 and HTTP/2 (Node.js `http2`, and Go's `net/http` when Go is installed). Needs Node.js. |
| `bench/egress-load.sh` | W3 at vendor latency (100 ms, 300 ms) with 1,000 to 30,000 requests in flight, over HTTP/1.1, h2c, and TLS with and without h2. Prints the rate, CPU time per request and peak RSS. |
| `bench/gym-test.sh` | Integration test of `--gym-env` and `--ca-file` against the real ai-gym (`../ai-gym`). Needs Go and Node.js; skips without them. |
| `bench/admin-test.sh` | Integration test of the admin API and event stream: load, replace and unload workflows, manual runs with trace, webhooks, approvals, per-workflow credentials, restart. Needs Node.js. |
| `ci.sh` | The checks from the Zig coding standards. |

## Commands

```bash
zig build -Drelease=true                       # ReleaseSafe build
./ci.sh                                        # fmt, tests, sim, counts, corpus, rules
./zig-out/bin/wfrt corpus ../packages/@n8n/workflow-lang/corpus
./zig-out/bin/wfrt run module.wfm fixture.json # one differential run
./zig-out/bin/wfrt sim --seeds 10000 --crash 30
./zig-out/bin/wfrt serve --port 8080 --log-dir /tmp/wf \
    --module orders.wfm --route "POST /orders" --rate 1000 --burst 100 \
    [--fallback /tmp/wf.sock] [--shards N] [--stats] \
    [--credentials creds.json] [--egress-max-body-mb 16] [--egress-big-slots 8]
WFRT_ADMIN_SECRET=… ./zig-out/bin/wfrt serve --profile embedded --port 8080 --log-dir /tmp/wf \
    --admin-port 8081 --admin-secret-env WFRT_ADMIN_SECRET   # n8n drives this (spec 9)
    [--max-conns N] [--max-request-mb 32] [--request-big-slots 2] [--rbuf-kb 16]
    [--max-modules 1024] [--module-store-mb 256]             # loaded workflow versions
    [--max-zones 640] [--step-events-sample N]              # time zones; sampled step events
    [--max-static-data 1024] [--static-data-kb 64]           # workflow static data (spec 9.7)
    [--ca-file gym-ca.pem] [--gym-env]                       # outbound rules of the ai-gym
./zig-out/bin/wfrt bench-w1 --threads 8        # glue only, in process
./zig-out/bin/wfrt bench-w5 1000000            # park and resume approvals
./zig-out/bin/wfrt bench-w6                    # loop of 100 effects
./zig-out/bin/wfrt bench-counts                # batch of 1 vs 1,000
./zig-out/bin/wfrt cron-next cases.json        # next schedule slots (differential test)
./bench/run.sh                                 # HTTP workloads
./zig-out/bin/wfrt load --host 10.0.0.11 --port 8080 --path /w2   # load from another machine
./bench/cloud/run.sh                           # the cloud benchmark kit (bench/cloud/README.md)
```

Compile a workflow with
`node packages/@n8n/workflow-lang/src/cli.ts compile wf.ts -o out/`. Start the
fallback host with
`node packages/@n8n/workflow-fallback-host/dist/main.js --socket /tmp/wf.sock`.

Each loaded workflow version takes one entry of the module table
(`--max-modules`, default 1024, 256 with `--profile embedded`) and its bytes
in the module store (`--module-store-mb`, default 256, 64 embedded). An old
version stays loaded while an execution uses it, also an execution that waits
or needs attention. When the table or the store is full, a load answers 507
and names the limit. End the old executions
(`DELETE /_admin/executions/<id>`) or raise the limit.

Each shard keeps the time zones of schedules and `Date.zoneOffset` in a
table of `--max-zones` entries (default 640: the whole IANA database). A
zone that does not fit is not dropped silently: the shell prints a warning,
and `Date.zoneOffset` with a zone that is missing throws a `RangeError` that
names the zone and `--max-zones`.

Each shard keeps the static data of its workflows (n8n's
`$getWorkflowStaticData`, spec 9.7) in a table of `--max-static-data`
entries, each at most `--static-data-kb` KB, reserved at startup. Production
runs that end `ok` or `error` commit their changes; manual runs do not. A
commit goes to the log and to the event stream (`staticData`), and n8n
stores it in the workflow. A load with a document that is too large answers
413, a new workflow when the table is full answers 507, and a commit that
does not fit is reported on the event stream with the flag that raises the
limit.

An approval waits for `POST /resume/<executionId>/<effectSeq>` with a JSON
body such as `{"approved":true}`. Execution ids are `wfrt-<n>` for ids that
`wfrt` makes and the decimal n8n id for manual runs (spec 9.1).

## Admin API (n8n integration)

With `--admin-port`, `wfrt` serves the admin API of spec 9.1 on
127.0.0.1, with a bearer secret read from the environment variable that
`--admin-secret-env` names. n8n uses it to load, replace and unload
workflows at run time, set credentials, start manual runs (with `trace` for
`ctx.trace`), resume approvals and read the event stream
(`GET /_admin/events`, spec 9.2). Loads and unloads are logged events, so a
restart with the same `--log-dir` restores the workflow set; parked
executions keep the version they started on. Credentials stay in memory
only. Variables (`PUT /_admin/variables`) are logged and captured when an
execution starts; `ctx.execution()` gives the resume URL, which
`POST /resume/<executionId>` answers. The admin port needs one shard. curl sends `Expect: 100-continue` for
bodies over 1 KB, which the admin port does not answer: add `-H 'Expect:'`.

## Memory

Large buffers (execution regions, connection buffers, batch and scratch
memory, egress and request buffers) are reserved at start but not touched,
so a page is resident only once it is used. Before this, safe builds filled
each new buffer with 0xAA (Zig's `Allocator.alloc`) and made all of it
resident: 1.2 GB RSS at idle with the default sizes. Now idle RSS is about
32 MB with either profile; a 16 MB upload in flight takes it to about
160 MB. `--profile embedded` (put it first; later flags override it) sets
1,024 connections, 4,096 execution slots, 4,096 outbound requests (about
5,800 workflows/s at 300 ms vendor latency), smaller tables and fewer large
buffers, which caps growth for a wfrt beside one n8n instance. A request
larger than the 16 KB connection buffer moves to one of
`--request-big-slots` large buffers of `--max-request-mb`; their pages go
back to the system after the request.

## Fuzzing and memory checks

Fuzz targets are tests whose names start with "fuzz" in
`src/core/fuzz_test.zig` and `src/shell/fuzz_test.zig`: the module verifier
and interpreter (mutated corpus modules), the JSON codec, the HTTP request
and response parsers, the chunked decoder (every split position), the
multipart parser and webhook bodies, the URL parser and query encoder, the
log reader and recovery (truncated, bit-flipped, reordered logs), admin
request bodies, TZif and cron parsing, credential templates, and the core
as a state machine (random events, crashes and replay). Each checks its
own invariants.

```bash
zig build fuzz                                   # seeds only, as unit tests
zig build fuzz -Drelease=true --fuzz=3K          # what ci.sh runs
SECS=600 PAR=5 bench/fuzz-long.sh                # each target for 10 minutes
bench/linux-sanitizers.sh                        # Linux: Valgrind, TSan, UBSan builds
```

Safe builds (Debug and ReleaseSafe) fill memory that goes back to a pool
with 0xAA: execution regions, arenas, connection buffers and large-buffer
slots. Region pool entries carry an owner mark, and `checkInvariants`
(run after every batch by the sim and the fuzzers) fails when a live
execution points into a released region, a parked execution's module is
gone, or a pending row has no execution. `ci.sh` also stops a Debug `serve`
with SIGTERM and fails on any leak the process allocator reports.

## ai-gym

`--gym-env` reads `GYM_ADDR`, `GYM_HOSTS`, `GYM_DNS` and `GYM_PORT_MAP` and
applies the rules of the gym's `deploy/e2e/host/resolve.cjs` to outbound
HTTP: vendor host names that match `GYM_HOSTS` resolve to `GYM_ADDR`, other
names go to the gym's resolver, and connections to `GYM_ADDR` or to
loopback on a mapped port go to `127.0.0.1:<mapped port>`. TLS SNI and the
certificate check keep the vendor host name. `--ca-file` adds the gym's CA
to the trust store. There is no limit on the number of `GYM_HOSTS` patterns.
See `src/shell/gym.zig`.

## Triggers

`wfrt serve --module x.wfm` reads the triggers in the module's META. It
needs no other flag:

- A schedule trigger (`schedule({ cron | every, timezone })`) starts an
  execution at each slot, with trigger `{"scheduledAt":<ms>}`. The shell
  reads the zone from `$TZDIR` (default `/usr/share/zoneinfo`). It prints
  one `schedule:` line for each fire.
- A webhook trigger gets the route `<method> /<path>` when no `--route`
  flag names the module. `--route` still works. Workflows loaded through
  the admin API get `<method> <webhookPrefix>/<path>`, with n8n's rules for
  `:param` segments (spec 9.1), and only when active.

A slot fires once, also across crashes and restarts. After downtime, a
schedule fires once, for the latest missed slot. Spec section 8 gives the
rules, DST included. The differential test against the `cron` npm package
is `node packages/@n8n/workflow-lang/scripts/cron-diff.ts`.

```text
$ wfrt serve --port 18431 --log-dir logs --module tick.wfm --module ping.wfm
wfrt serving on :18431 with 1 shard(s), 0 route(s)
schedule: module 0 trigger 0 slot 1794471504000
schedule: module 0 trigger 0 slot 1794471505000
schedule: module 0 trigger 0 slot 1794471506000
(stopped for 4 s, then started again)
shard 0: recovered 5 batches, 0 live, 0 parked
schedule: module 0 trigger 0 slot 1794471511000    <- one fire for 4 missed slots
schedule: module 0 trigger 0 slot 1794471512000
```

`tick.wfm` has `schedule({ cron: '* * * * * *', timezone: 'Europe/Berlin' })`;
`ping.wfm` has `webhook({ path: 'ping', method: 'POST' })` and answers
`POST /ping` with no `--route` flag.

## Outbound HTTP at scale

Most executions of a busy instance wait on vendor APIs. By Little's law the
requests in flight are rate times latency: 100,000 workflows/s at 300 ms is
30,000 requests in flight on one core. Every table is sized at startup:

```bash
wfrt serve --target-rate 20000 --vendor-latency-ms 300 [--memory-mb 512] ...
# sizing for 20000/s at 300 ms: 6000 in flight; --slots 16384 --max-conns 7500
#   --egress-max-requests 9000 --egress-max-conns 7500
```

`--target-rate` sets `--slots`, `--max-conns`, `--egress-max-requests` and
`--egress-max-conns` from rate × latency (1.25 to 1.5 times as headroom);
`--memory-mb` caps the outbound buffers. A flag given by name wins.

| Flag | Default (embedded) | What it limits |
|---|---|---|
| `--egress-max-requests` | 16384 (4096) | outbound requests in flight, waiting ones included; each has an 8 KB buffer and one event of room |
| `--egress-max-conns` | 8192 (1024) | outbound connections |
| `--egress-max-origins` | 1024 | distinct (scheme, host, port) |
| `--egress-origin-conns` | 0 (none) | connections to one origin |
| `--egress-origin-inflight` | 0 (none) | requests on the wire to one origin |
| `--egress-origin-queue` | 0 (none) | requests that wait for one origin |
| `--egress-origin-rate`, `--egress-origin-burst` | 0 (none) | requests per second to one origin (token bucket; burst default rate/10) |
| `--egress-connect-timeout-ms` | 10000 | TCP connect and TLS handshake |
| `--egress-read-timeout-ms` | 0 (none) | the wait for the next byte of a response |
| `--egress-timeout-ms` | 300000 | the whole request when the step has no `timeoutMs` |
| `--egress-h2` | on | offer `h2` with ALPN to https origins |
| `--egress-h2-conns` | 256 (64) | connections that speak HTTP/2 at once (each has its HPACK table and frame buffers) |
| `--egress-h2-streams` | 256 | our cap of streams on one connection (the server's SETTINGS can lower it) |
| `--egress-aimd` | on | halve an origin's requests on the wire after a 429 or 503 |
| `--egress-retry-after-max-ms` | 60000 | the longest `Retry-After` hold |
| `--egress-pool` | shared | which requests share connections: `shared`, `workflow` or `credential` (spec 7.2) |
| `--io` | poll | Linux, inbound side: `poll` uses epoll; `uring` uses io_uring and fails without it; `auto` tries io_uring and keeps epoll (`docs/io-uring-design.md`) |
| `--ring-buffers` | 1024 | io_uring buffers for received bytes, a power of two, each `rbuf` bytes |
| `--egress-origin "<rule>"` | | limits for matching origins, repeatable |

A rule is `<host>[:port]` (a name, `*.<suffix>` or `*`) and then
`key=value` parts, separated by spaces or commas: `conns`, `inflight`,
`queue`, `rate`, `burst`, `connect-ms`, `read-ms`, `timeout-ms`, `h2`
(`on`, `off`, `prior` for h2c without TLS) and `aimd` (`on`, `off`). The
first matching rule wins; its unset keys take the defaults above.

```bash
--egress-origin "api.example.com conns=16 rate=50 timeout-ms=30000" --egress-origin "*.slack.com,inflight=20"
```

Behaviour:

- A request over an origin's limits waits in the origin's queue; it never
  fails because of a limit, unless the queue is full (`queue=`) or every
  request slot is used (`--egress-max-requests`). Then the step gets an
  effect error that names the flag (a limit, so the step's retry applies).
- A queued request keeps its deadline: one that waits past its timeout
  fails with the timeout message.
- 429 and 503 are results, as in v1: the step sees the status and the
  node decides. They are never sent again here. They do cut the origin's
  requests on the wire in half (AIMD; one cut per 100 ms), and each other
  answer raises the limit by 1/limit, until it is back at the cap.
- `Retry-After` (seconds or an HTTP date, at most
  `--egress-retry-after-max-ms`) holds the retries of failed steps
  (attempt > 0) to that origin until it passes. First attempts are not held.
- HTTP/2: the first connection to an https origin finds out with ALPN
  whether the server speaks h2; meanwhile other requests to the origin
  wait. An h2 origin then gets few connections: new streams go to an open
  connection with room (at most the server's
  SETTINGS_MAX_CONCURRENT_STREAMS and `--egress-h2-streams`; one stream
  until the server's SETTINGS arrive), and a new connection opens only when
  all are full. HPACK, flow control (WINDOW_UPDATE, both windows), PING,
  GOAWAY (streams above the last id go to another connection; the rest
  finish), RST_STREAM (REFUSED_STREAM is sent again, others fail the step),
  CONTINUATION, interim 1xx and trailers (dropped) follow RFC 9113. The
  result has the same shape as over HTTP/1.1. See `src/shell/http2.zig` and
  `src/shell/hpack.zig`.

## Limits of the PoC shell

- Outbound HTTP is HTTP/1.1 or HTTP/2 over `http://` or `https://` (OpenSSL 3, peer
  verification with the default trust store, SNI, host name check). See
  "Outbound HTTP at scale" below. Names
  resolve with c-ares (IPv4 and IPv6) and stay in a 256-entry cache for
  their TTL, at most one hour. Numeric hosts and `localhost` skip DNS.
  Connections are pooled per (scheme, host, port) and kept alive. A request
  on a reused connection that closes before any response byte is sent once
  more if the method is idempotent or the step has an idempotency key.
- Outbound requests take `method`, `url`, `qs` (URL-encoded and appended;
  arrays repeat the key), `headers`, `body` (object or array as JSON with
  `content-type: application/json` unless a content type is given; a string
  as it is), `credential` and `timeoutMs`. The client sends
  `accept-encoding: identity` and does not decompress.
- Outbound responses: Content-Length, chunked and close-delimited bodies up
  to 16 MB (`--egress-max-body-mb`). `headers` is an object with lower-case
  names, as in Node.js. A JSON body that does not parse comes back as a
  string. GET and HEAD follow up to 5 redirects. Timeouts: connect 10 s,
  total 300 s or `timeoutMs`, both also per origin. There is no proxy
  support, no decompression, no TLS session resumption and no h2c upgrade
  (only h2c with prior knowledge, `h2=prior`).
- Credentials (`--credentials`, spec section 7): `inject` headers, query
  parameters and basic auth, and `{{$credentials.<path>}}` in the URL,
  headers, query and string values of the body. OAuth2 tokens are not
  refreshed. `--insecure-tls` skips certificate checks; use it only in tests.
- Inbound TLS needs a proxy in front. Inbound requests use Content-Length;
  chunked request bodies are rejected.
- Snapshots of parked executions are kept in process memory. The log is
  durable; the snapshots are rebuilt by replaying it.
- A resume request must reach the shard that owns the execution. With more
  than one shard there is no forwarding between shards yet.
- On macOS, `SO_REUSEPORT` does not spread connections over shards, and
  `fsync` does not flush the drive cache. Measure shards and the sync tier
  on Linux.
