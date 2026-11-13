# io_uring for the Linux shell (design note)

Status: steps 1, 2 and 5 are built (`src/shell/uring.zig`, `serve --io uring`, default `poll`). On the pinned EPYC core (2026-11-13) they gave no gain: W2 4.19 µs against 4.15 µs with epoll, W3 10.9 µs against 10.3 µs. With 32 requests per connection, epoll already reads many requests per call. Owner of the egress side: the egress agent. Owner of the
inbound side and the shard loop: `server.zig`.

## Why

On one shard, W2 (webhook in, reply out) costs about 69,000 instructions per
request on macOS, and W3 (W2 plus one outbound call) about 139,000. Between 71
and 74% of the CPU time is in the kernel. The floor model (`docs/floor.md`)
puts the kernel floor at about 11.5 µs per request for W2 and 26 µs for W3 on
macOS. User space adds 3 to 4 µs. On Linux the system calls are cheaper, but
the shell still makes, for each request:

| Call | W2 | W3 |
|---|---|---|
| `read` of the request (no second read that returns EAGAIN since this round) | 1 | 1 |
| `send` of the response | 1 | 1 |
| `send` of the outbound request | – | 1 |
| `read` of the outbound response | – | 1 |
| `epoll_wait`, shared by the batch | 1/batch | 1/batch |

At 100,000 requests per second on one core, the budget is 10 µs per W3
request. Four system calls with their entry and exit, and the TCP work behind
them, take 3 to 5 µs on current Linux. That leaves 5 to 7 µs for the user
space and for the TCP stack itself. io_uring removes the entry and exit cost
of every call but one per batch, and it removes the readiness round trip.

## Shape

One ring per shard. It is created at startup with fixed sizes (`SQ` = 4,096,
`CQ` = 16,384) and registered buffers, so the loop allocates nothing:

1. **Inbound:** one *multishot accept* on the listening socket. For each
   connection, one *multishot recv* with a *provided buffer ring*: the kernel
   picks a buffer, fills it and posts one completion for each arrival, with
   no new submission. The buffer group has a fixed count of 16 KB buffers (the
   size of today's connection read buffer). The parser reads in place. A
   request that does not fit moves to the large-request slots, as today. When
   the group is empty, the kernel ends the multishot with `ENOBUFS`; the shell
   re-arms it when buffers come back. This is a limit, not an error.
2. **Outbound (egress):** each upstream connection gets a multishot recv in
   its own buffer group, so responses never wait for readiness.
3. **Sends:** the responses and outbound requests of one batch are submitted
   together, then one `io_uring_enter` submits all and reaps the completions.
   A response that has a head and a body goes out as one `sendmsg` with two
   iovecs: no copy into one buffer. For 4 KB or more, `IORING_OP_SEND_ZC`
   avoids the copy into the kernel. Its completion (with `IORING_CQE_F_NOTIF`)
   frees the buffer one batch later.
4. **Log:** the log write and `fdatasync` of the `sync` tier become linked
   submissions (`IOSQE_IO_LINK`), so the replies that wait for the sync are
   submitted in the same call, after the sync in the link chain.
5. **Timers:** one `IORING_OP_TIMEOUT` for the next timer or schedule slot,
   in place of the `epoll_wait` timeout.

The loop becomes: reap completions, then parse and queue events, then run one
core batch, then queue the sends, then make one `io_uring_enter` call that
submits and waits for at least one completion. With `IORING_SETUP_SINGLE_ISSUER`
and `IORING_SETUP_DEFER_TASKRUN`, completions run in the shard thread only
when it enters the kernel, so the cache stays warm. With
`IORING_SETUP_COOP_TASKRUN`, the kernel does not interrupt the thread.

## What stays the same

- The core does not change: it sees the same events and gives the same
  actions.
- macOS and older kernels keep the kqueue and epoll loop (`sys.Poller`). The
  ring is a second `Poller` implementation, chosen at startup with a fallback.
- TLS: the OpenSSL path reads and writes through memory BIOs already. With
  kTLS (`TLS_TX`/`TLS_RX` after the handshake), the ring sends and receives
  plain text, and the kernel encrypts; without kTLS, the BIO path stays.

## Expected gain

Per W3 request, about 4 system calls become about 0.02 (one `io_uring_enter`
per batch of 50 or more requests). On Linux 6.x this saves about 1 to 1.5 µs
per request. The TCP stack work stays: on loopback, a send also runs the
receiver's input path. On a real NIC, that work moves to the softirq of the
receiving core. Multishot recv also saves the readiness event and the
EAGAIN read. Taken together, the W3 floor on Linux drops from about 5 µs to
about 3 µs of kernel time per request. With the user space at 3 to 4 µs,
100,000 W3 requests per second on one core becomes possible on bare metal.

## Order of work

1. A ring `Poller` with multishot accept and recv for inbound only (W2),
   measured against epoll on the same machine.
2. Batched sends for responses (one enter per batch).
3. Egress on the ring (egress agent).
4. Linked log writes and syncs.
5. Zero-copy sends for large bodies, and kTLS.

Each step needs a Linux machine without other load, because the gain per call
is near 1 µs and noise on a shared VM hides it.

## Steps 1, 2 and 5: built and measured (2026-11-13)

What is built (`src/shell/uring.zig`, `serve --io poll|uring|auto`):

- one ring per shard, made in the shard's thread at the start of its loop
  (`SINGLE_ISSUER` and `DEFER_TASKRUN` when the kernel takes them), from
  memory reserved at startup;
- a multishot accept on the listener, and a multishot recv for each
  connection into a group of provided buffers. The shell copies the bytes
  into the connection's buffer and gives the buffer back at once; the
  parser is not changed;
- sends of replies queued per batch, one in flight per connection;
- the loop timeout is the `io_uring_enter` timeout (`IORING_ENTER_EXT_ARG`);
- the sockets that stay on epoll (egress, DNS, the fallback host, the
  admin port) reach the loop through a one-shot poll of the epoll
  descriptor. When the loop does not wait, it also polls epoll without
  waiting.

The default stays `poll`. On the pinned EPYC core (same setup as the W3
proof, 30,000 in flight, 32 requests per connection):

| Workload | epoll | io_uring |
|---|---|---|
| W2, CPU per request (core not saturated) | 4.15 µs | 4.19 µs |
| W3, CPU per workflow | 10.3 µs | 10.9 µs |

Why there is no gain:

- With 32 requests per connection, one `read` already takes many
  requests, and one `send` many replies. The system calls that the ring
  removes are already few per request.
- W3 adds one `epoll_wait` per round for the egress sockets, beside the
  `io_uring_enter`.
- The copy out of the provided buffer replaces the copy of `read`.

Open:

- The W3 run under io_uring had about 4× more errors than under epoll. In
  that window the load generator counted one error on every poll while a
  closed connection stayed open in it, so the number was inflated in
  both modes. It now reports closed connections and bad statuses apart,
  and the ring path prints its first unexpected recv errors. The next
  window must find the cause before the ring is used.
- The ring unit test (`src/shell/uring.zig`) runs only on Linux and has not
  run there yet.
- A gain needs workloads with one request per connection, or egress on the
  ring (step 3), so that the loop has one system call per round.

## Step 3: egress on the ring (plan)

Status: plan only, written without Linux access. Owner: the egress agent.

### What changes, and what does not

- **Unchanged:**
  - the egress logic: origins, limits, queues, HTTP/1.1 and HTTP/2 framing, the timer wheel, and the results to the core;
  - the `Sink` API to `server.zig`.
- **What changes:** only how bytes reach a connection and leave it. Today `egress.zig` calls `read` and `write` (or `SSL_read` and `SSL_write`) when the poller says a socket is ready. On the ring, the kernel delivers received bytes in completions, and the client queues sends that go out in the batch's single `io_uring_enter`.

### Correction to "What stays the same"

The note above says that the OpenSSL path already uses memory BIOs. It does not: `tls.zig` binds each session to its socket with `SSL_set_fd`, so OpenSSL makes its own `read` and `write` calls. Step 3 starts by changing this, and the change also helps epoll.

1. **TLS through memory BIOs.** Each session gets a `BIO_s_mem` pair (or one `BIO_new_bio_pair`) in place of the socket.
   - **Received bytes:** ciphertext from a recv completion is written into the read BIO, then `SSL_read` drains it.
   - **Sent bytes:** `SSL_write` puts ciphertext into the write BIO, and the client copies that into the connection's send buffer.
   - **Two side effects:**
     - OpenSSL makes no system calls of its own, so a read that only returns EAGAIN cannot happen.
     - "Bytes hidden in OpenSSL" (`SSL_has_pending`) becomes a plain loop condition.
   - **Ship it first, with epoll**, and measure it alone. It is a prerequisite for the ring, and it removes OpenSSL's own read calls even without one.

### Receive

2. **One buffer group for egress** (`IORING_REGISTER_PBUF_RING`), separate from the inbound group, with a fixed count of 16 KB buffers sized at startup (`--egress-ring-buffers`, default `max_conns` / 4, at least 256).
   - Each egress connection gets one multishot recv (`IORING_RECV_MULTISHOT` with `IOSQE_BUFFER_SELECT`) on that group.
   - A completion carries the buffer id. The client feeds those bytes to:
     - the TLS read BIO, or
     - the HTTP/2 frame reader or the HTTP/1.1 response parser, which both already take any split.
   - The buffer goes back to the ring at once, before the next completion is handled.
   - **The one copy that remains** is for HTTP/1.1 bodies, from the ring buffer to `rbuf` or a large buffer, as today. HTTP/2 DATA already streams into the response area.
3. **Running out of buffers is a limit, not an error.** `ENOBUFS` ends the multishot. The client re-arms it at the end of the round, after buffers come back, and counts it (`counters.recv_rearm`).
4. **EOF:** a completion with 0 bytes, or `IORING_CQE_F_MORE` cleared without an error, maps to today's `.closed` paths: `onEof`, `lostConn`, and `connFailFmt` for h2.

### Send

5. **Sends are queued, not made.** `h2Flush` and `doSend` fill the connection's `wbuf`, as `h2Fill` does now, and put the connection on a send list.
   - Once per round, the client submits one `IORING_OP_SEND` per connection (`SENDMSG` with two iovecs for HTTP/1.1 head plus large body, as `writevSome` does now).
   - All the sends of a batch go to the kernel in the round's one `io_uring_enter`. With HTTP/2 batching, about 64 streams per send.
6. **Partial sends:** the completion gives the byte count, and the rest stays in `wbuf` for the next round. This replaces EAGAIN and `armWrite`/`disarmWrite`, so egress no longer needs write readiness at all.
7. **Large request bodies:** `IORING_OP_SEND_ZC` from the request's large buffer (step 5 of the order of work). The buffer is held until the notification CQE (`IORING_CQE_F_NOTIF`).

### Connect, DNS and timers

8. **Connect:** `IORING_OP_CONNECT`, with the connect timeout kept in the timer wheel (no linked timeout), which then cancels the SQE.
   - TLS handshakes run over the memory BIOs on the same recv and send paths.
   - Address fallback (`connectNext`) is unchanged.
9. **DNS:** c-ares keeps its own sockets. Its file descriptors get `IORING_OP_POLL_ADD` (multishot) in place of `Poller.watch`, which is the smallest change. Its traffic is small.
10. **Timers:** the egress wheel stays as it is. The shard's single `IORING_OP_TIMEOUT` takes `min(next shard timer, egress.sleepMs())`.

### Order of work and measurements

1. Memory BIOs for TLS, on epoll.
   - Measure: CPU per W3 request, and the read calls per request (`counters.reads`), which should drop by the reads OpenSSL makes itself.
   - Keep the tests "egress reads follow readiness", "idle connections cost no reads" and `bench/egress/hangcheck.mjs` green.
2. The ring egress backend behind `--egress-io uring|poll`, chosen at startup with a fallback to poll when the kernel lacks `PBUF_RING`, multishot recv or `SEND_ZC`.
   - It needs the shard's ring from step 1 of the order of work.
   - The egress client then takes one more interface. In the shard loop, it queues submissions and gets completions, in place of `onConn`.
3. Measure on a pinned, unloaded Linux core, with the same proof setup (`~/wfrt-proof/proof.sh`):
   - W3 at 100 ms over h2 and TLS, before and after;
   - system calls per request (`strace -c` or `perf trace -s`).
   - **Target:** egress kernel entries per W3 request drop from about 2 (one recv, about 1/64 of a send, plus epoll's share) to about 1/64. CPU drops by the entry and exit cost of those calls.
4. Tests:
   - every egress test runs under both backends (`WFRT_EGRESS_IO=uring zig build test`, Linux only);
   - the fuzz targets don't change, because the parsers already take any split;
   - add a test that drains the buffer group (small `--egress-ring-buffers`) and checks the re-arm.

### Risks

- **Ring capacity:** the submission queue must hold one send per connection with output, plus the re-arms, in each round. Size the SQ from `max_conns`, and when it is full, keep the rest of the send list for the next round (a limit).
- **Buffer memory:** buffers in the group are pinned. The count times 16 KB has to fit the `--memory-mb` budget of the sizing.
- **kTLS** (step 5 of the order of work) would drop the BIO copies. It needs TLS 1.3 key updates handled by the kernel, and the vendors' cipher suites. Measure it after this step.
