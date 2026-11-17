//! `wfrt serve`: one thread per shard. Each shard owns a listener, its
//! connections, an outbound HTTP pool, a link to the fallback host, a log
//! file and one core. A webhook is accepted, run and answered inside one
//! shard; n8n is not on the request path.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const Arena = core_lib.arena.Arena;
const uring = @import("uring.zig");
const reserve = core_lib.arena.reserve;
const shard_mod = @import("shard.zig");
const sys = @import("sys.zig");
const http = @import("http.zig");
const egress = @import("egress.zig");
const pg = @import("pg.zig");
const my = @import("my.zig");
const my_call = @import("my_call.zig");
const creds = @import("creds.zig");
const admin = @import("admin.zig");
const renew = @import("renew.zig");
const triggers = @import("triggers.zig");
const binary_store = @import("binary_store.zig");
const blob_store = @import("blob_store.zig");
const fbf = @import("fallback_frames.zig");
const outbox = @import("outbox.zig");
const programs = @import("programs.zig");

/// The largest stored file that a binary reply reads.
const binary_reply_limit: usize = 64 << 20;
const heap = core_lib.heap;
const Shard = shard_mod.Shard;

pub const RouteArg = struct {
    module: u32,
    method: []const u8,
    path: []const u8,
    rate: u32 = 0,
    burst: u32 = 0,
    concurrency: u32 = 0,
};

pub const IoMode = enum { poll, uring, auto };

pub const Options = struct {
    port: u16 = 8080,
    /// `--host`: the IPv4 address of the webhook port. The default is every
    /// address of the machine.
    host: [4]u8 = .{ 0, 0, 0, 0 },
    shards: u32 = 1,
    log_dir: ?[]const u8 = null,
    fallback: ?[]const u8 = null,
    /// `--fallback-wait-ms`: how long a step waits for a host connection
    /// while no connection is usable (spec 9.1). 0 fails the step at once.
    fallback_wait_ms: i64 = 30_000,
    /// `--fallback-steps-per-worker`: the host steps that a shard keeps in
    /// flight for each host worker. A step beyond the total waits.
    fallback_steps_per_worker: u32 = 256,
    /// `--fallback-workflow-steps`: the host steps that one workflow keeps
    /// in flight in a shard. 0: a quarter of the total, at least 1. A step
    /// beyond it waits and takes no place of another workflow.
    fallback_workflow_steps: u32 = 0,
    modules: []const []const u8 = &.{},
    routes: []const RouteArg = &.{},
    max_conns: u32 = 4096,
    rbuf: u32 = 16 << 10,
    wbuf: u32 = 64 << 10,
    /// `--io`: how the inbound side does its I/O on Linux. `poll` is epoll;
    /// `uring` is io_uring and fails when the kernel lacks it; `auto` tries
    /// io_uring and keeps epoll when it is not there.
    io: IoMode = .poll,
    /// `--ring-buffers`: received-bytes buffers of the io_uring (a power of
    /// two), each `rbuf` bytes.
    ring_buffers: u16 = 1024,
    /// `--egress-max-requests`: outbound requests in flight, waiting
    /// ones included. Each has a request buffer and one event of room.
    max_egress: u32 = 16384,
    /// The other outbound settings (`--egress-*` flags): connections,
    /// origin limits and rules, timeouts, HTTP/2. `serve` fills the fields
    /// that have their own options below.
    egress: egress.Config = .{ .max_conns = 8192 },
    /// The PostgreSQL client of the `sql` effect (`--sql-*` flags): calls,
    /// connections, and the sizes of a call and of a result (`pg.Config`).
    sql: pg.Config = .{},
    /// Calls with the dialect `mysql` go to the native MySQL client (`my.zig`). Off until the
    /// client is verified against a real server: such a call then runs in the fallback host.
    sql_mysql: bool = false,
    /// Largest outbound response or request body.
    egress_max_body: u32 = 16 << 20,
    /// Large buffers for bodies over 16 KB, reserved at start.
    egress_big_slots: u32 = 8,
    /// `--binary-max-file-mb`, `--binary-buffer-mb`, `--binary-max-transfers`:
    /// the limits of the binary data store (`blob_store.Config`). The store
    /// exists when n8n's storage path is set (`startBlobs`).
    binary_max_file: u64 = 16 << 20,
    binary_buffer: u64 = 32 << 20,
    binary_max_transfers: u16 = 64,
    /// Tests only: skip the TLS certificate check.
    insecure_tls: bool = false,
    credentials: ?*const creds.Store = null,
    batched_sync_ms: i64 = 5,
    slots: u32 = 16384,
    stats: bool = false,
    /// Print one line for each schedule fire (a write to stderr each).
    log_fires: bool = false,
    /// The admin API (spec 9.1) on 127.0.0.1. Needs one shard.
    admin_port: ?u16 = null,
    admin_secret: []const u8 = "",
    /// Bound of the event stream queue while no client reads it.
    event_queue_bytes: usize = 64 << 20,
    /// `--max-outbox-mb`: bytes of durable events that one shard keeps in its
    /// outbox until n8n acks them (spec 9.2). While it is full, new work is
    /// refused: webhooks and manual runs answer 503, and a due schedule is
    /// skipped. Running executions and resumes go on.
    max_outbox_mb: u32 = 1024,
    /// Batch memory: request payloads of one batch.
    batch_bytes: usize = 64 << 20,
    /// Snapshots of executions that wait (approvals, long waits). When it
    /// is full, waiting executions stay in memory.
    snap_bytes: u64 = 512 << 20,
    /// Largest inbound request, headers included. A request larger than
    /// `rbuf` moves to a buffer from a pool of `request_big_slots`.
    max_request: usize = 32 << 20,
    request_big_slots: u32 = 2,
    /// Smaller tables for a wfrt that n8n starts beside itself.
    embedded: bool = false,
    /// `--max-zones`: time zones each shard keeps (the IANA database has about 600).
    max_zones: u32 = 640,
    /// Workflows with static data, and the largest document (spec 9.7).
    max_static_data: u32 = 1024,
    static_data_kb: u32 = 64,
    /// Service calls (spec 9.9) that wait for an answer, the room for the
    /// event line of each, and how long a call waits. Needs the admin API.
    max_service_calls: u32 = 256,
    service_call_kb: u32 = 1024,
    service_timeout_ms: i64 = 300_000,
    /// Requests that can wait for a credential renewal, or go again after
    /// one, at one time, and the room for the names of each (`renew.zig`).
    max_renewals: u32 = 256,
    renewal_kb: u32 = 1,
    /// `--step-events-sample`: step events of unwatched executions for 1 in N
    /// executions (0: none, spec 9.2).
    step_event_sample: u32 = 0,
    /// `--test-clock`: `POST /_admin/executions` accepts `clockOffsetMs`
    /// (CLOCK-OFFSET). Only a test bed sets this flag.
    test_clock: bool = false,
    /// `--max-modules`: loaded modules of one shard. Each workflow version
    /// takes one while it is current or an execution uses it, also an
    /// execution that waits or needs attention.
    max_modules: u32 = 1024,
    /// `--max-routes`: webhook routes of one shard. 0 gives two for each
    /// module, so every loaded workflow can have its webhook triggers.
    max_routes: u32 = 0,
    /// `--max-schedules`: schedule and poll triggers of one shard. 0 gives
    /// four for each module (a schedule node can have several rules).
    max_schedules: u32 = 0,
    /// `--module-store-mb`: bytes of those modules (virtual memory, used as
    /// modules load).
    module_bytes: u32 = 256 << 20,
    /// `--ca-file`: more trusted CA certificates for outbound TLS.
    ca_file: ?[:0]const u8 = null,
    /// `--gym-env`: outbound rules of the ai-gym (`gym.zig`).
    gym: ?*const @import("gym.zig").Gym = null,
    gym_dns: ?[:0]const u8 = null,

    /// `--profile embedded`: sizes for one n8n instance, not a benchmark.
    pub fn applyEmbedded(o: *Options) void {
        o.embedded = true;
        // At 300 ms vendor latency and 2.35 calls per workflow, 4,096
        // outbound requests carry about 5,800 workflows/s (docs/floor.md);
        // with HTTP/2 a call holds about 5.4 KB, so 4,096 cost about 22 MB.
        o.max_conns = 1024;
        o.slots = 4096;
        o.max_egress = 4096;
        o.egress.max_conns = 1024;
        o.egress.h2_conns = 64;
        o.egress_big_slots = 2;
        o.event_queue_bytes = 32 << 20;
        o.snap_bytes = 128 << 20;
        o.max_modules = 256;
        o.module_bytes = 64 << 20;
    }
};

/// A JSON string into a list with a fixed capacity (the host write buffer).
fn appendJsonStringBounded(w: *std.ArrayList(u8), s: []const u8) error{OutOfMemory}!void {
    try w.appendBounded('"');
    for (s) |c| {
        switch (c) {
            '"' => try w.appendSliceBounded("\\\""),
            '\\' => try w.appendSliceBounded("\\\\"),
            0...0x1F => try w.printBounded("\\u{x:0>4}", .{c}),
            else => try w.appendBounded(c),
        }
    }
    try w.appendBounded('"');
}

/// A host frame: the effect it runs, and whether it is the message of an approval.
const FbKey = struct { exec_id: u64, seq: u32, send: bool };
/// An effect error that waits for room. `msg` is a static text.
const EgressLost = struct { exec_id: u64, seq: u32, msg: []const u8 };
const renew_resend_msg = "credentials: the request could not go again after the credential renewal; the step can run again (retryable)";
const egress_lost_msg = "http: the result found no room in the event queue; the step can run again (retryable)";
/// A host step that failed in the shell, with a static message. `lost`: the
/// connection whose `worker_lost` message replaces `msg` (`no_lost`: none).
const FbFail = struct { key: FbKey, msg: []const u8, lost: u8 = no_lost };
const no_lost: u8 = 0xFF;
/// A host frame in flight: its connection, and where its copy is in the
/// journal (`jlen` 0: no copy, so it cannot be sent again).
const FbEntry = struct {
    conn: u8,
    alone: bool = false,
    joff: u32 = 0,
    jlen: u32 = 0,
    /// The step, for the events of its service calls (spec 9.9).
    module: u16 = 0,
    step: u32 = 0,
    attempt: u32 = 0,
    /// Service calls that this run of the step made: the next is `calls + 1`.
    calls: u32 = 0,
    /// A frame that waits for a host connection: when its wait ends.
    wait_till: i64 = 0,
    /// The frame went again as a new step after `worker_lost` with `again`.
    again: bool = false,

    /// True when the frame can go again as a new step after `worker_lost`
    /// with `again`: it has a copy, and it was not sent again before.
    fn canGoAgain(e: *const FbEntry) bool {
        return e.jlen > 0 and !e.again and !e.alone;
    }
};
/// `FbEntry.conn` of a frame that waits to be sent again alone.
const fb_queued: u8 = 0xFF;
/// `FbEntry.conn` of a frame that waits for a host connection.
const fb_waiting: u8 = 0xFE;
/// The state of one host connection.
const FbState = enum(u8) {
    closed,
    /// The hello went out; only it is written until the answer.
    hello,
    ready,
    /// The worker sent `goaway`: no new steps, close when the last one ends.
    draining,
};
/// One connection to the host. With a v2 host each one goes to one worker
/// process (`fallback_frames.zig`).
const FbConn = struct {
    fd: c_int = -1,
    gen: u32 = 0,
    state: FbState = .closed,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    wbuf: std.ArrayList(u8) = .empty,
    /// Bytes of the hello at the start of `wbuf` that are not written yet.
    hello_left: usize = 0,
    /// Frames sent on this connection and not answered.
    inflight: u32 = 0,
    /// The connection runs one step that is sent again alone; it takes no other.
    alone: bool = false,
    /// A step waits to go again alone and no connection is idle: this one
    /// takes no new steps, so it becomes idle.
    reserved: bool = false,
    /// Since when queued frames could not be written (0: no stall).
    stall_since: i64 = 0,
    next_connect_ms: i64 = 0,
    /// When the hello went out: a host that does not answer it in
    /// `fb_hello_ms` gets a new connection.
    hello_since: i64 = 0,
    /// The host sent `worker_lost`: the worker of this connection stopped.
    /// Only then is a step alone on it to blame.
    lost_seen: bool = false,
    /// The `worker_lost` frame said `again`: the host runs the cause in its
    /// slow lane the next time, so each step goes again once as a new step.
    lost_again: bool = false,
    /// The error for a step alone on this connection when its worker
    /// stopped, with the reason of `worker_lost` (`lost_ready`). It stays
    /// until each failure that refers to it (`lost_refs`) is in the event
    /// queue, so a new loss on the connection uses the static text meanwhile.
    stopped_msg: [fbf.max_stopped_msg]u8 = undefined,
    stopped_len: u16 = 0,
    lost_ready: bool = false,
    lost_refs: u32 = 0,
};

comptime {
    std.debug.assert(fbf.max_stopped_msg <= std.math.maxInt(u16));
    std.debug.assert(fbf.max_conns < no_lost);
}
/// The read and write buffers of the host connection: the largest frame.
/// Results carry binary data up to 32 MiB in base64 (host limit).
const fb_buf_bytes = 64 << 20;
/// How often the shell tries to connect to the host again.
const fb_reconnect_ms = 500;
/// A host that reads nothing for this long counts as lost.
const fb_stall_ms = 30_000;
/// A connection whose hello has no answer for this long closes, and the
/// shell connects again. The steps queued behind the hello go again.
const fb_hello_ms = 15_000;
const fb_lost = "the fallback host connection closed before the step ended; the step can run again (retryable)";
const fb_down = "no fallback host is connected; the step can run again when it is back (retryable)";
const fb_full = "too many fallback host steps are in flight (limit); the step can run again (retryable)";
const fb_busy = "the step waited too long for a free place in the fallback host (limit); the step can run again (retryable)";
const fb_wfull = "the frames to the fallback host fill its write buffer (limit); the step can run again (retryable)";
const fb_name = "the step name is too long for a fallback host frame (limit)";
const fb_big = "the fallback host result is larger than the batch memory (limit)";
/// A step that was alone in its host worker when the host reported that the
/// worker stopped (`worker_lost`: crash, memory limit, a loop that blocks
/// it): the step caused it. Not retryable. Without `worker_lost` (the whole
/// host stopped, or its server process), the step gets `fb_lost`.
const fb_stopped = "The step stopped its host worker: the worker process ended while the step ran alone in it";
/// Host frames in flight at one time, for each shard.
const fb_max_inflight = 1 << 16;
/// Steps that wait for a host connection at one time. A step beyond it fails
/// with `fb_full`.
const fb_max_wait = 1 << 10;
/// Steps of one workflow that wait at one time: half of the queue, so one
/// workflow cannot fill it.
const fb_max_wait_workflow = fb_max_wait / 2;
/// Passes over the wait queue in one call of `sendWaiting`.
const fb_wait_rounds = 8;

const Kind = enum(u8) {
    listener = 1,
    conn = 2,
    egress = 3,
    fallback = 4,
    dns = 5,
    admin_listener = 6,
    admin = 7,
    // io_uring completions (`uring.zig`).
    ring_accept = 8,
    ring_recv = 9,
    ring_send = 10,
    ring_epoll = 11,
    /// A file operation of the binary data store (`blob_store.zig`).
    ring_file = 12,
    /// A connection and a name lookup of the PostgreSQL client (`pg.zig`).
    sql = 13,
    sql_dns = 14,
    /// A connection and a name lookup of the MySQL client (`my.zig`).
    mysql = 16,
    mysql_dns = 17,
};

/// A connection to the admin port. Its buffers are reserved at startup. A
/// body larger than `rbuf` (a whole module) moves to the one large admin
/// buffer; while another request holds it, the answer is 503.
const AdminConn = struct {
    fd: c_int = -1,
    gen: u32 = 0,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    /// The request is read into `Runner.admin_big`.
    big: bool = false,
    wbuf: []u8 = &.{},
    wlen: usize = 0,
    wsent: usize = 0,
    close_after: bool = false,
    /// This connection reads the event stream.
    streaming: bool = false,
};

const max_admin_conns = 16;
const max_admin_request = 128 << 20;
const admin_rbuf_bytes = 64 << 10;
const admin_wbuf_bytes = 1 << 20;
/// Credential documents of the admin API: the global one (two slots, so a
/// new one is parsed before the old one goes) and one per workflow.
const global_creds_bytes = 16 << 20;
const workflow_creds_bytes = 256 << 10;

/// The credentials document of one workflow.
const WfCreds = struct {
    id: [core.max_id]u8 = undefined,
    id_len: u8 = 0,
    store: ?*creds.Store = null,
    /// The core has credential flags from this document (`queueCredFlags`).
    has_flags: bool = false,
};

fn token(kind: Kind, gen: u32, idx: u32) u64 {
    return (@as(u64, @backingInt(kind)) << 56) | (@as(u64, gen & 0xFFFFFF) << 32) | idx;
}

const Conn = struct {
    fd: c_int = -1,
    gen: u32 = 0,
    rbuf: []u8,
    rlen: usize = 0,
    wbuf: []u8,
    wlen: usize = 0,
    wsent: usize = 0,
    dirty: bool = false,
    close_after: bool = false,
    /// A reply larger than `wbuf` goes out from a large egress buffer.
    big: u32 = no_big,
    /// A request larger than `rbuf` is read into a large request buffer.
    rbig: u32 = no_big,
    /// Bytes of the large buffer that were used, for poisoning.
    rbig_high: usize = 0,
    /// Write interest is set in the poller (after a write returned EAGAIN).
    write_armed: bool = false,
    /// io_uring: a send of `wbuf[wsent..]` is in flight; `wbuf` before
    /// `wlen` must not change until it completes.
    send_busy: bool = false,
    /// io_uring: the multishot recv of this connection is armed.
    recv_armed: bool = false,
};

const no_big = std.math.maxInt(u32);

/// Counters shared with the stats printer. Each shard writes only its own.
pub const Stats = struct {
    requests: std.atomic.Value(u64) = .init(0),
    replies: std.atomic.Value(u64) = .init(0),
    egress: std.atomic.Value(u64) = .init(0),
    batches: std.atomic.Value(u64) = .init(0),
    log_bytes: std.atomic.Value(u64) = .init(0),
    finished: std.atomic.Value(u64) = .init(0),
    rejected: std.atomic.Value(u64) = .init(0),
    syscalls_write: std.atomic.Value(u64) = .init(0),
    /// Host steps that have a place in the fallback host now.
    host_inflight: std.atomic.Value(u64) = .init(0),
    /// Host steps that wait for a place or for a connection now.
    host_waiting: std.atomic.Value(u64) = .init(0),
    /// Host steps that waited at least once.
    host_waited: std.atomic.Value(u64) = .init(0),
    /// Host steps that failed at a limit: a full wait queue or a wait that ended.
    host_refused: std.atomic.Value(u64) = .init(0),
};

/// Adds `by` (1 or -1) to a counter of `Stats`.
fn gauge(v: *std.atomic.Value(u64), by: i2) void {
    std.debug.assert(by == 1 or by == -1);
    const before = if (by == 1) v.fetchAdd(1, .monotonic) else v.fetchSub(1, .monotonic);
    std.debug.assert(by == 1 or before > 0);
}

/// The log file. Records collect in a buffer (reserved at startup) and go
/// to the file in one write when the shard syncs: at once for the `sync`
/// tier, every `batched_sync_ms` for the `batched` tier. One write for many
/// batches costs far less than one write for each batch; a crash of the
/// process then loses what a crash of the machine loses anyway, the records
/// since the last sync.
const FileLog = struct {
    fd: c_int,
    buf: []u8,
    len: usize = 0,

    fn append(ctx: *anyopaque, b: []const u8) anyerror!void {
        const l: *FileLog = @ptrCast(@alignCast(ctx));
        if (l.len + b.len > l.buf.len) try l.flush();
        if (b.len > l.buf.len) return writeAll(l.fd, b);
        @memcpy(l.buf[l.len..][0..b.len], b);
        l.len += b.len;
    }
    fn sync(ctx: *anyopaque) anyerror!void {
        const l: *FileLog = @ptrCast(@alignCast(ctx));
        try l.flush();
        if (std.c.fsync(l.fd) != 0) return error.LogSync;
    }
    fn flush(l: *FileLog) !void {
        if (l.len == 0) return;
        try writeAll(l.fd, l.buf[0..l.len]);
        l.len = 0;
    }
    fn writeAll(fd: c_int, b: []const u8) !void {
        var off: usize = 0;
        while (off < b.len) {
            const n = std.c.write(fd, b[off..].ptr, b.len - off);
            if (n <= 0) return error.LogWrite;
            off += @intCast(n);
        }
    }
};

/// The answer of new work while the outbox is full (spec 9.2).
const outbox_full_body = "{\"error\":\"the event outbox is full\"}";
/// The `after` query of the event stream is `[<shard>:<seq>,...]`.
const after_body = "{\"error\":\"the after query takes <shard>:<seq>[,<shard>:<seq>...]\"}";
const ack_body = "{\"error\":\"the body is {\\\"acks\\\":[{\\\"shard\\\":0,\\\"seq\\\":1}]}\"}";
const ack_beyond_body = "{\"error\":\"ack beyond the last event\"}";

/// The log dir and the files of a shard hold lifecycle events: the dir is
/// 0700 and each file that wfrt creates is 0600.
fn makeDirMode(path: []const u8, mode: u16) !void {
    if (path.len >= 512) return error.LogDirPath;
    var buf: [512]u8 = undefined;
    @memcpy(buf[0..path.len], path);
    buf[path.len] = 0;
    const z = buf[0..path.len :0];
    if (std.c.mkdir(z, @as(std.c.mode_t, @intCast(mode))) == 0) return;
    if (std.c.errno(@as(c_int, -1)) != .EXIST) return error.LogDir;
}

pub const Runner = struct {
    gpa: std.mem.Allocator,
    id: u32,
    opts: Options,
    sh: Shard,
    poller: sys.Poller,
    /// The io_uring of the inbound side, when it started (`startRing`).
    ring: ?*uring.Ring = null,
    /// The binary data store, when n8n's storage path is set (`startBlobs`).
    blobs: ?*blob_store.Store = null,
    /// Reserved at startup: the ring and the memory of its buffers. The
    /// ring is made in the shard's thread, which alone submits to it.
    ring_store: ?*uring.Ring = null,
    ring_fba: std.heap.FixedBufferAllocator = undefined,
    /// The poll of the epoll descriptor is armed / has fired.
    ring_epoll_armed: bool = false,
    ring_epoll_ready: bool = false,
    /// Multishot recvs armed again after they ended (ENOBUFS and the like).
    ring_rearms: u64 = 0,
    /// Recvs that ended with an error other than a reset.
    ring_recv_errors: u64 = 0,
    lfd: c_int,
    conns: []Conn,
    free_conns: std.ArrayList(u32),
    dirty: std.ArrayList(u32),
    egress: *egress.Client,
    sql: *pg.Client,
    /// The MySQL client of the `sql` effect (`dialect: mysql`). It has the limits of `opts.sql`.
    mysql: *my.Client,
    /// Effect errors raised while actions run outlive the batch arena:
    /// they go to the next batch. Two arenas take turns.
    carry: [2]Arena,
    carry_cur: u1 = 0,
    in_perform: bool = false,
    /// The output of the configure batch, where `loop` starts.
    start_out: core.Output = .{ .has_ready = false, .next_timer_ms = null },
    /// Connections to the host: one per worker with a v2 host, else one.
    fb_conns: []FbConn,
    /// The host's protocol: 0 until the first hello answer, then 1 or 2.
    fb_version: u8 = 0,
    /// Connections to keep open.
    fb_target: u32 = 1,
    /// Host frames sent and not answered. When the connection goes, each one
    /// fails with a retryable error or, with a v2 host, is sent again alone.
    fb_inflight: std.AutoHashMapUnmanaged(FbKey, FbEntry),
    /// Copies of the frames in flight (v2), to send a frame again after its
    /// worker stopped. Two buffers take turns when the live copies move down.
    fb_journal: [2][]u8,
    fb_jcur: u1 = 0,
    fb_jlen: usize = 0,
    /// Frames that wait to be sent again, each alone on an idle connection.
    fb_aloneq: std.ArrayList(FbKey),
    /// Steps that found no usable connection, in arrival order. Their frames
    /// wait in the journal, and go out when a connection is usable.
    fb_waitq: std.ArrayList(FbKey),
    /// Host steps with a place (on a connection or in `fb_aloneq`), and
    /// those of each workflow, by module slot.
    fb_admitted: u32,
    fb_wf_inflight: []u32,
    /// Host steps in `fb_waitq`, those of each workflow, and the number of
    /// workflows with a step that waits.
    fb_waiting_n: u32,
    fb_wf_waiting: []u32,
    fb_wf_waiters: u32,
    /// The pass over `fb_waitq` in which a workflow last sent a step, and
    /// how many it sent in that pass.
    fb_turn: u32,
    fb_wf_turn: []u32,
    fb_wf_sent: []u32,
    /// The number of the last step that each workflow sent to the host
    /// (`fb_serve` counts them). The workflow with the smallest number
    /// waited longest for its turn.
    fb_serve: u64,
    fb_wf_last: []u64,
    /// Room for one number of each workflow, to find the workflows whose turn it is.
    fb_wf_order: []u64,
    /// A place or a connection became free, or a step started to wait:
    /// `sendWaiting` has work.
    fb_wait_dirty: bool,
    /// Keys to remove after a pass over `fb_inflight`.
    fb_scratch: std.ArrayList(FbKey),
    /// Host steps that failed in the shell (lost connection, no host, a
    /// full buffer), until the event queue has room for them.
    fb_failq: std.ArrayList(FbFail),
    events: std.ArrayList(core.Event),
    /// HTTP results that found no room in `events`: requests that fail at
    /// once while a batch acts can outnumber the reserve. Each becomes a
    /// retryable effect error when there is room. Bounded by the actions
    /// of a batch plus the requests in flight.
    egress_lost: []EgressLost = &.{},
    nlost: usize = 0,
    batch: Arena,
    flog: ?*FileLog = null,
    last_sync_ms: i64 = 0,
    stats: *Stats,
    stop: *std.atomic.Value(bool),
    admin_lfd: c_int = -1,
    admin_conns: []AdminConn = &.{},
    /// The admin connection that reads the event stream.
    stream: ?u32 = null,
    queue: admin.Queue,
    /// The durable outbox of this shard (spec 9.2); null without a log dir.
    ob: ?outbox.Outbox = null,
    /// The seq of the durable events when there is no outbox: the line is
    /// numbered in memory and kept in the ring.
    seq_mem: u64 = 0,
    acked_mem: u64 = 0,
    /// The seq of the last durable event published: the floor of the
    /// best-effort lines that follow it (spec 9.2).
    dur_seq: u64 = 0,
    /// The stream has more durable lines than one pass sent: the loop does
    /// not wait.
    stream_more: bool = false,
    /// The large admin request buffer and the connection that holds it.
    admin_big: []u8 = &.{},
    admin_big_user: ?u32 = null,
    /// Large request buffers: `request_big_slots` of `req_big_size` bytes.
    req_big_mem: []u8 = &.{},
    req_big_size: usize = 0,
    req_big_free: std.ArrayList(u32) = .empty,
    /// Credentials of each workflow, by workflow id. In memory only: they
    /// never go into a load event, so never into the log.
    wf_creds: []WfCreds = &.{},
    wf_pool: ?creds.Pool = null,
    global_pool: ?creds.Pool = null,
    /// Requests that can get a credential renewal (with the admin API).
    renewals: ?renew.Table = null,
    /// A response with a status below this is not "the value expired" for
    /// any credentials document that this shard got: the one comparison of
    /// a response to a request with a valid value. It only goes down.
    min_expiry_status: u32 = 400,
    /// Service calls that wait for the admin client's answer (spec 9.9).
    svc: ?admin.ServiceCalls = null,

    pub fn init(gpa: std.mem.Allocator, id: u32, opts: Options, stats: *Stats, stop: *std.atomic.Value(bool)) !*Runner {
        const r = try gpa.create(Runner);
        r.gpa = gpa;
        r.id = id;
        r.opts = opts;
        r.stats = stats;
        r.stop = stop;
        const small = opts.embedded;
        const cfg: core.Config = .{
            .shard_id = @intCast(id),
            .slots = opts.slots,
            // The largest class holds a trigger with a 16 MB upload in base64.
            .region_sizes = .{ 4 << 10, 64 << 10, 1 << 20, 32 << 20 },
            .region_counts = if (small) .{ opts.slots, 256, 16, 2 } else .{ opts.slots, 1024, 64, 4 },
            .max_pending = if (small) 1 << 14 else 1 << 17,
            .max_actions = if (small) 1 << 15 else 1 << 17,
            // Room for the result of every outbound request in flight, twice.
            .max_batch_events = @max(@as(u32, if (small) 1 << 13 else 1 << 15), std.math.ceilPowerOfTwoAssert(u32, 2 * @max(opts.max_egress, 1))),
            .max_timers = if (small) 1 << 14 else 1 << 17,
            .max_parked = if (small) 1 << 16 else 1 << 18,
            .max_zones = opts.max_zones,
            .max_static_data = opts.max_static_data,
            .static_data_bytes = opts.static_data_kb << 10,
            .snap_bytes = opts.snap_bytes,
            .max_modules = opts.max_modules,
            .max_routes = if (opts.max_routes > 0) opts.max_routes else @max(256, 2 * opts.max_modules),
            .max_schedules = if (opts.max_schedules > 0) opts.max_schedules else @max(64, 4 * opts.max_modules),
            .module_bytes = opts.module_bytes,
            // Interned strings: about one for each 64 bytes of module.
            .natives_total = @max(1 << 20, opts.module_bytes / 64),
            .lifecycle = opts.admin_port != null,
            .step_event_sample = opts.step_event_sample,
        };
        // `create` does not apply field defaults: set each one used before
        // it is assigned.
        r.flog = null;
        r.ob = null;
        r.seq_mem = 0;
        r.acked_mem = 0;
        r.dur_seq = 0;
        r.stream_more = false;
        var log: ?shard_mod.LogSink = null;
        var existing: []u8 = &.{};
        if (opts.log_dir) |dir| {
            // The log dir is 0700 and its files are 0600: they hold the
            // lifecycle events of the workflows.
            try makeDirMode(dir, 0o700);
            var path_buf: [512]u8 = undefined;
            const path = try std.fmt.bufPrintSentinel(&path_buf, "{s}/shard-{d}.log", .{ dir, id }, 0);
            existing = readAll(gpa, path) catch &.{};
            const O = std.c.O{ .ACCMODE = .WRONLY, .CREAT = true, .APPEND = true };
            const fd = std.c.open(path, O, @as(std.c.mode_t, 0o600));
            if (fd < 0) return error.LogOpen;
            _ = std.c.fchmod(fd, @as(std.c.mode_t, 0o600));
            r.flog = try gpa.create(FileLog);
            r.flog.?.* = .{ .fd = fd, .buf = try reserve(gpa, u8, 4 << 20) };
            log = .{ .ctx = r.flog.?, .appendFn = FileLog.append, .syncFn = FileLog.sync };
            // Durable events are kept until n8n acks them. The outbox needs
            // the admin API, which is the only reader of the stream.
            if (opts.admin_port != null) {
                if (opts.max_outbox_mb == 0) return error.InvalidOutboxSize;
                r.ob = try outbox.Outbox.init(gpa, .{ .dir = dir, .shard = id, .max_bytes = @as(u64, opts.max_outbox_mb) << 20 });
            }
        }
        // Scratch holds a large trigger twice (the trigger and the started
        // action) and the results of one batch. Pages are touched on use.
        r.sh = try Shard.init(gpa, cfg, log, 128 << 20, 96 << 20);
        r.req_big_size = opts.max_request + (64 << 10);
        r.req_big_mem = try reserve(gpa, u8, r.req_big_size * opts.request_big_slots);
        r.req_big_free = .empty;
        try r.req_big_free.ensureTotalCapacity(gpa, opts.request_big_slots);
        var bi: u32 = opts.request_big_slots;
        while (bi > 0) : (bi -= 1) r.req_big_free.appendAssumeCapacity(bi - 1);
        r.events = .empty;
        try r.events.ensureTotalCapacity(gpa, cfg.max_batch_events);
        // The results of outbound requests in flight always have room.
        if (opts.max_egress > cfg.max_batch_events / 2) return error.MaxEgressTooLarge;
        r.egress_lost = try gpa.alloc(EgressLost, cfg.max_actions + opts.max_egress);
        r.nlost = 0;
        r.batch = Arena.init(try reserve(gpa, u8, opts.batch_bytes));
        r.poller = try sys.Poller.init();
        r.lfd = try sys.listenTcp(opts.host, opts.port, true);
        try r.poller.addRead(r.lfd, token(.listener, 0, 0));
        r.ring = null;
        r.ring_store = null;
        r.ring_epoll_armed = false;
        r.ring_epoll_ready = false;
        r.ring_rearms = 0;
        r.ring_recv_errors = 0;
        if (uring.supported and opts.io != .poll) {
            if (!std.math.isPowerOfTwo(opts.ring_buffers)) return error.RingBuffersNotPowerOfTwo;
            r.ring_store = try gpa.create(uring.Ring);
            // The buffers, their heads, and room for alignment.
            const bytes = @as(usize, opts.ring_buffers) * (opts.rbuf + @sizeOf(u32)) + (64 << 10);
            r.ring_fba = .init(try reserve(gpa, u8, bytes));
        }
        r.conns = try gpa.alloc(Conn, opts.max_conns);
        r.free_conns = .empty;
        try r.free_conns.ensureTotalCapacity(gpa, opts.max_conns);
        r.dirty = .empty;
        try r.dirty.ensureTotalCapacity(gpa, opts.max_conns);
        for (r.conns, 0..) |*cn, i| {
            cn.* = .{ .rbuf = try reserve(gpa, u8, opts.rbuf), .wbuf = try reserve(gpa, u8, opts.wbuf) };
            r.free_conns.appendAssumeCapacity(@intCast(opts.max_conns - 1 - i));
        }
        r.start_out = .{ .has_ready = false, .next_timer_ms = null };
        r.carry_cur = 0;
        r.in_perform = false;
        r.carry = .{ Arena.init(try gpa.alloc(u8, 256 << 10)), Arena.init(try gpa.alloc(u8, 256 << 10)) };
        r.egress = try gpa.create(egress.Client);
        var ecfg = opts.egress;
        ecfg.max_reqs = opts.max_egress;
        ecfg.max_body = opts.egress_max_body;
        ecfg.big_slots = opts.egress_big_slots;
        ecfg.insecure_tls = opts.insecure_tls;
        ecfg.credentials = opts.credentials;
        if (opts.credentials) |s| r.noteStore(s);
        ecfg.ca_file = opts.ca_file;
        ecfg.gym = opts.gym;
        ecfg.dns_servers = opts.gym_dns;
        try r.startBlobs(gpa, opts);
        ecfg.blobs = r.blobs;
        ecfg.max_uploads = opts.binary_max_transfers;
        try r.egress.init(gpa, ecfg, .{ .ctx = r, .done = egressDone, .stored = egressStored }, &r.poller, @backingInt(Kind.egress), @backingInt(Kind.dns));
        r.sql = try gpa.create(pg.Client);
        var scfg = opts.sql;
        scfg.insecure_tls = opts.insecure_tls;
        scfg.ca_file = opts.ca_file;
        scfg.dns_servers = opts.gym_dns;
        try r.sql.init(gpa, scfg, &r.poller, @backingInt(Kind.sql), @backingInt(Kind.sql_dns));
        try r.startMysql(gpa, scfg);
        // Virtual memory: pages are used only as large frames come and go.
        // Without --fallback the shard keeps no host buffers.
        r.fb_conns = try gpa.alloc(FbConn, if (opts.fallback != null) fbf.max_conns else 0);
        for (r.fb_conns) |*c| {
            c.* = .{};
            c.rbuf = try reserve(gpa, u8, fb_buf_bytes);
            c.wbuf = .initBuffer(try reserve(gpa, u8, fb_buf_bytes));
        }
        r.fb_version = 0;
        r.fb_target = 1;
        r.fb_journal = .{ &.{}, &.{} };
        if (opts.fallback != null) r.fb_journal = .{ try reserve(gpa, u8, fb_buf_bytes), try reserve(gpa, u8, fb_buf_bytes) };
        r.fb_jcur = 0;
        r.fb_jlen = 0;
        // Sized once: a full table is a limit (`fb_full`), not an allocation.
        r.fb_inflight = .empty;
        try r.fb_inflight.ensureTotalCapacity(gpa, fb_max_inflight);
        r.fb_aloneq = try std.ArrayList(FbKey).initCapacity(gpa, fb_max_inflight);
        r.fb_waitq = try std.ArrayList(FbKey).initCapacity(gpa, fb_max_wait);
        r.fb_admitted = 0;
        r.fb_waiting_n = 0;
        r.fb_wf_waiters = 0;
        r.fb_turn = 0;
        r.fb_wait_dirty = false;
        r.fb_wf_inflight = try gpa.alloc(u32, r.sh.st.modules.len);
        r.fb_wf_waiting = try gpa.alloc(u32, r.sh.st.modules.len);
        r.fb_wf_turn = try gpa.alloc(u32, r.sh.st.modules.len);
        r.fb_wf_sent = try gpa.alloc(u32, r.sh.st.modules.len);
        r.fb_serve = 0;
        r.fb_wf_last = try gpa.alloc(u64, r.sh.st.modules.len);
        r.fb_wf_order = try gpa.alloc(u64, r.sh.st.modules.len);
        @memset(r.fb_wf_last, 0);
        @memset(r.fb_wf_order, 0);
        @memset(r.fb_wf_inflight, 0);
        @memset(r.fb_wf_waiting, 0);
        @memset(r.fb_wf_turn, 0);
        @memset(r.fb_wf_sent, 0);
        r.fb_scratch = try std.ArrayList(FbKey).initCapacity(gpa, fb_max_inflight);
        // Room for every frame in flight, plus the failures of one batch of actions.
        r.fb_failq = try std.ArrayList(FbFail).initCapacity(gpa, 2 * fb_max_inflight);
        if (opts.fallback != null) r.connectFallback(sys.nowMs());
        r.queue = try admin.Queue.init(gpa, opts.event_queue_bytes, 1 << 20);
        r.wf_creds = &.{};
        r.wf_pool = null;
        r.global_pool = null;
        r.svc = null;
        r.admin_big = &.{};
        r.admin_big_user = null;
        r.stream = null;
        r.admin_lfd = -1;
        r.admin_conns = &.{};
        if (opts.admin_port) |port| {
            r.admin_lfd = try sys.listenTcp(.{ 127, 0, 0, 1 }, port, false);
            try r.poller.addRead(r.admin_lfd, token(.admin_listener, 0, 0));
            r.admin_conns = try gpa.alloc(AdminConn, max_admin_conns);
            for (r.admin_conns) |*c| c.* = .{ .rbuf = try reserve(gpa, u8, admin_rbuf_bytes), .wbuf = try reserve(gpa, u8, admin_wbuf_bytes) };
            r.admin_big = try reserve(gpa, u8, max_admin_request + (64 << 10));
            r.wf_creds = try gpa.alloc(WfCreds, opts.max_modules);
            for (r.wf_creds) |*w| w.* = .{};
            r.wf_pool = try creds.Pool.init(gpa, opts.max_modules + 1, workflow_creds_bytes);
            r.global_pool = try creds.Pool.init(gpa, 2, global_creds_bytes);
            r.svc = try admin.ServiceCalls.init(gpa, opts.max_service_calls, @as(usize, opts.service_call_kb) << 10);
            r.renewals = try renew.Table.init(gpa, opts.max_renewals, @as(usize, opts.renewal_kb) << 10);
        }
        r.last_sync_ms = sys.nowMs();
        try r.recoverAndConfigure(existing);
        return r;
    }

    fn readAll(gpa: std.mem.Allocator, path: [*:0]const u8) ![]u8 {
        const fd = std.c.open(path, .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
        if (fd < 0) return error.NotFound;
        defer _ = std.c.close(fd);
        var out: std.ArrayList(u8) = .empty;
        var buf: [1 << 16]u8 = undefined;
        while (true) {
            const n = std.c.read(fd, &buf, buf.len);
            if (n <= 0) break;
            try out.appendSlice(gpa, buf[0..@intCast(n)]);
        }
        return out.toOwnedSlice(gpa);
    }

    /// Replay the shard's log, resolve effects in doubt, then load the
    /// modules and routes this process was started with.
    fn recoverAndConfigure(r: *Runner, existing: []u8) !void {
        const now = sys.nowMs();
        if (existing.len > 0) {
            const stats = try r.sh.recover(existing);
            if (stats.valid_bytes < existing.len and r.flog != null) {
                // Drop a torn tail so new records follow valid ones.
                _ = std.c.ftruncate(r.flog.?.fd, @intCast(stats.valid_bytes));
            }
            const tk = try r.sh.resolveInDoubt(now);
            try r.perform(tk.actions);
            r.sh.endBatch();
            std.debug.print("shard {d}: recovered {d} batches, {d} live, {d} parked\n", .{ r.id, stats.batches, r.sh.st.liveExecutions(), r.sh.st.parkedCount() });
        }
        var evs: std.ArrayList(core.Event) = .empty;
        defer evs.deinit(r.gpa);
        // The resume secret (spec 9.4): made once, then kept by the log.
        var secret: [32]u8 = undefined;
        if (!r.sh.st.has_secret) {
            sys.randomBytes(&secret);
            try evs.append(r.gpa, .{ .kind = .secret, .payload = &secret });
        }
        // META triggers: zones for schedules, and routes for the webhooks of
        // a module that has no --route flag (on a fresh log only).
        // `--log-fires` prints a line for each schedule fire.
        r.sh.log_fires = r.opts.log_fires;
        for (r.opts.modules, 0..) |m, mi| {
            const flagged = for (r.opts.routes) |rt| {
                if (rt.module == mi) break true;
            } else false;
            try @import("triggers.zig").moduleEvents(r.gpa, &evs, m, .{ .index = @intCast(mi), .meta_routes = r.sh.st.nroutes == 0 and !flagged });
        }
        // Startup: the batch memory is free, and resets when the loop starts.
        const specs = try r.batch.push(u8, r.opts.routes.len * 160);
        defer r.batch.reset();
        if (r.sh.st.nroutes == 0) {
            for (r.opts.routes, 0..) |rt, i| {
                var spec: core.RouteSpec = .{ .module = rt.module, .rate_per_s = rt.rate, .burst = rt.burst, .concurrency = rt.concurrency, .method = @splat(0) };
                @memcpy(spec.method[0..@min(8, rt.method.len)], rt.method[0..@min(8, rt.method.len)]);
                const dst = specs[i * 160 ..][0..160];
                @memcpy(dst[0..@sizeOf(core.RouteSpec)], std.mem.asBytes(&spec));
                @memcpy(dst[@sizeOf(core.RouteSpec)..][0..rt.path.len], rt.path);
                try evs.append(r.gpa, .{ .kind = .add_route, .payload = dst[0 .. @sizeOf(core.RouteSpec) + rt.path.len] });
            }
        }
        const tk = try r.sh.tick(now, evs.items);
        // The loop starts from this batch's output, so the first schedule
        // slot fires without waiting for a request.
        r.start_out = tk.out;
        try r.perform(tk.actions);
        r.sh.endBatch();
    }

    /// Close what the shard holds outside its memory: sockets and files.
    /// Its memory goes with the arena that `init` got.
    pub fn deinit(r: *Runner) void {
        for (r.conns) |c| if (c.fd >= 0) sys.close(c.fd);
        for (r.admin_conns) |c| if (c.fd >= 0) sys.close(c.fd);
        if (r.admin_lfd >= 0) sys.close(r.admin_lfd);
        sys.close(r.lfd);
        for (r.fb_conns) |c| if (c.fd >= 0) sys.close(c.fd);
        r.fb_inflight.deinit(r.gpa);
        r.fb_aloneq.deinit(r.gpa);
        r.fb_waitq.deinit(r.gpa);
        r.gpa.free(r.fb_wf_inflight);
        r.gpa.free(r.fb_wf_waiting);
        r.gpa.free(r.fb_wf_turn);
        r.gpa.free(r.fb_wf_sent);
        r.gpa.free(r.fb_wf_last);
        r.gpa.free(r.fb_wf_order);
        r.fb_scratch.deinit(r.gpa);
        r.fb_failq.deinit(r.gpa);
        if (r.flog) |l| {
            // Records since the last sync.
            l.flush() catch {};
            _ = std.c.close(l.fd);
        }
        r.queue.deinit();
        if (r.ob) |*ob| ob.deinit();
        if (r.svc) |*t| t.deinit();
        if (r.renewals) |*t| t.deinit();
        r.egress.deinit();
        r.sql.deinit();
        r.mysql.deinit();
        if (r.blobs) |b| b.deinit();
        if (r.ring) |ring| ring.deinit(r.ring_fba.allocator());
        r.poller.deinit();
    }

    pub fn run(r: *Runner) void {
        r.loop() catch |err| std.debug.print("shard {d} stopped: {s}\n", .{ r.id, @errorName(err) });
    }

    fn loop(r: *Runner) !void {
        var ready: [1024]sys.Ready = undefined;
        try r.startRing();
        var has_ready = r.start_out.has_ready;
        var next_timer: ?i64 = r.start_out.next_timer_ms;
        while (!r.stop.load(.monotonic)) {
            var timeout: i32 = 50;
            if (has_ready or r.events.items.len > 0 or r.sh.wakes.items.len > 0 or r.nlost > 0 or r.egress.hasWork() or r.sql.hasWork() or r.mysql.hasWork()) timeout = 0;
            // The stream has durable lines that one pass did not send.
            if (r.stream_more or r.renewalsPending()) timeout = 0;
            // A stored response has a result that found no room.
            if (r.blobs) |b| if (b.nextDone() != null) {
                timeout = 0;
            };
            if (next_timer) |t| timeout = @min(timeout, @as(i32, @intCast(std.math.clamp(t - sys.nowMs(), 0, 50))));
            if (r.sh.unsynced) timeout = @min(timeout, @as(i32, @intCast(r.opts.batched_sync_ms)));
            // Outbound requests that wait for an origin's rate or Retry-After.
            if (r.egress.sleepMs(sys.nowMs())) |ms| timeout = @min(timeout, @as(i32, @intCast(@min(ms, 50))));
            const n = if (r.ring) |ring| r.ringWait(ring, &ready, timeout) else r.poller.wait(&ready, timeout);
            for (ready[0..n]) |ev| try r.onReady(ev);
            // Replies made while reading (400, 413, 503) go out now, not
            // only when a batch runs.
            if (r.dirty.items.len > 0) r.flushConns();
            if (r.stream != null and (r.stream_more or r.queue.bytes > 0 or r.queue.notice_len > 0)) r.flushStream();
            const now = sys.nowMs();
            r.egress.afterEvents(now);
            r.sql.afterEvents(now);
            r.mysql.afterEvents(now);
            r.drainSql();
            r.drainEgressLost();
            r.drainStored(now);
            r.serviceFallback(now);
            r.expireServiceCalls(now);
            r.resumeRenewed(now);
            const timer_due = if (next_timer) |t| t <= now else false;
            // A full outbox refuses new work: the shard skips due schedules
            // and the loop refuses webhooks and manual runs (spec 9.2).
            r.sh.outbox_full = r.outboxFull();
            // Woken executions whose restores did not fit wait in `wakes`.
            if (r.events.items.len > 0 or has_ready or timer_due or r.sh.wakes.items.len > 0) {
                // A full batch takes a prefix; the rest waits (a limit).
                const tk = try r.sh.tickSome(now, r.events.items);
                const consumed = tk.consumed;
                const deferred = consumed < r.events.items.len;
                has_ready = tk.out.has_ready;
                next_timer = tk.out.next_timer_ms;
                try r.perform(tk.actions);
                // The host frames of the batch go out in one write.
                r.flushFallback();
                r.flushConns();
                r.sh.endBatch();
                // Events raised while acting (effect errors with static
                // messages) wait for the next batch.
                const rest = r.events.items.len - consumed;
                std.mem.copyForwards(core.Event, r.events.items[0..rest], r.events.items[consumed..]);
                r.events.shrinkRetainingCapacity(rest);
                r.flushStream();
                // Events that wait keep their payloads: batch and carry
                // memory reset only when every event was taken.
                if (!deferred) {
                    r.batch.reset();
                    // The other carry arena held errors that this batch consumed.
                    r.carry_cur ^= 1;
                    r.carry[r.carry_cur].reset();
                }
                _ = r.stats.batches.fetchAdd(1, .monotonic);
                r.stats.log_bytes.store(r.sh.counters.log_bytes, .monotonic);
            }
            // Batched tier: sync the log every few milliseconds.
            if (r.sh.unsynced and now - r.last_sync_ms >= r.opts.batched_sync_ms) {
                try r.sh.syncLog();
                r.last_sync_ms = now;
            }
            // The outbox of the `batched` tier follows the same beat.
            if (r.ob) |*ob| ob.flushSync();
        }
    }

    fn onReady(r: *Runner, ev: sys.Ready) !void {
        const kind: Kind = @fromBackingInt(@intCast(@as(u8, @intCast(ev.token >> 56))));
        const idx: u32 = @truncate(ev.token);
        const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
        switch (kind) {
            .listener => r.acceptAll(),
            .conn => {
                const cn = &r.conns[idx];
                if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
                if (ev.writable) r.flushConn(idx);
                if (ev.readable) try r.readConn(idx);
            },
            .egress => r.egress.onConn(idx, gen, ev, sys.nowMs()),
            .dns => r.egress.onDns(@intCast(idx), ev),
            .sql => r.sql.onConn(idx, gen, ev, sys.nowMs()),
            .sql_dns => r.sql.onDns(@intCast(idx), ev),
            .mysql => r.mysql.onConn(idx, gen, ev, sys.nowMs()),
            .mysql_dns => r.mysql.onDns(@intCast(idx), ev),
            .fallback => {
                if (idx >= r.fb_conns.len) return;
                const c = &r.fb_conns[idx];
                if (c.fd < 0 or (c.gen & 0xFFFFFF) != gen) return;
                r.readFallback(@intCast(idx));
            },
            .admin_listener => r.acceptAdmin(),
            .admin => {
                if (idx >= r.admin_conns.len) return;
                const cn = &r.admin_conns[idx];
                if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
                if (ev.writable) r.flushAdmin(idx);
                if (ev.readable) r.readAdmin(idx);
            }, // Ring completions never come through epoll.
            .ring_accept, .ring_recv, .ring_send, .ring_epoll, .ring_file => unreachable,
        }
    }

    // ---- inbound ----------------------------------------------------------

    // ---- io_uring (uring.zig) --------------------------------------------

    /// Start the ring in this thread, which alone submits to it. The
    /// listener moves from epoll to a multishot accept. `--io auto` keeps
    /// epoll when the kernel refuses the ring; `--io uring` stops.
    fn startRing(r: *Runner) !void {
        const store = r.ring_store orelse return;
        r.ring_fba.reset();
        store.init(r.ring_fba.allocator(), .{ .buffers = r.opts.ring_buffers, .buffer_size = r.opts.rbuf }) catch |e| {
            std.debug.print("shard {d}: io_uring is not available ({s}); using epoll\n", .{ r.id, @errorName(e) });
            if (r.opts.io == .uring) return error.IoUringUnavailable;
            return;
        };
        r.ring = store;
        if (r.blobs) |b| b.useRing(store);
        r.poller.remove(r.lfd);
        store.acceptMultishot(token(.ring_accept, 0, 0), r.lfd);
        r.ring_epoll_armed = store.pollIn(token(.ring_epoll, 0, 0), r.poller.fd);
    }

    /// One `io_uring_enter`: submit the queued sends and re-arms, and wait
    /// up to `timeout_ms` for a completion. Then handle the completions.
    /// Returns the epoll events when the epoll descriptor was ready.
    fn ringWait(r: *Runner, ring: *uring.Ring, out: []sys.Ready, timeout_ms: i32) usize {
        // A poll that could not be queued would leave the sockets on epoll
        // unserved: the loop never waits without it.
        if (!r.ring_epoll_armed) r.ring_epoll_armed = ring.pollIn(token(.ring_epoll, 0, 0), r.poller.fd);
        const wait_ms = if (r.ring_epoll_armed) timeout_ms else 0;
        ring.enter(wait_ms);
        // Bounded by what one enter can post: the completion queue, twice
        // over for the completions that handlers make room for.
        var guard: u32 = 0;
        while (guard < 1 << 16) : (guard += 1) {
            const c = ring.next() orelse break;
            r.onCompletion(ring, c);
        }
        // A loop that did not wait is busy: epoll may have events that came
        // while the poll was being re-armed. One call per round, no wait.
        if (!r.ring_epoll_ready and wait_ms > 0) return 0;
        r.ring_epoll_ready = false;
        return r.poller.wait(out, 0);
    }

    fn onCompletion(r: *Runner, ring: *uring.Ring, c: uring.Completion) void {
        if (c.user == uring.ignore) return;
        const kind: Kind = @fromBackingInt(@intCast(c.user >> 56));
        const idx: u32 = @truncate(c.user);
        const gen: u32 = @truncate((c.user >> 32) & 0xFFFFFF);
        switch (kind) {
            .ring_epoll => {
                r.ring_epoll_armed = false;
                r.ring_epoll_ready = true;
            },
            .ring_accept => {
                if (c.res >= 0) {
                    sys.setNoDelay(c.res);
                    _ = r.adoptConn(c.res);
                }
                // Ended (an error such as EMFILE, or the kernel's own end):
                // arm it again; the next enter submits it.
                if (!c.more) ring.acceptMultishot(token(.ring_accept, 0, 0), r.lfd);
            },
            .ring_recv => r.onRecv(ring, idx, gen, c),
            .ring_send => r.onSent(idx, gen, c),
            // The result of the step goes out in `drainStored`.
            .ring_file => if (r.blobs) |b| b.onCompletion(c.user, c.res),
            else => unreachable, // Only ring kinds are submitted.
        }
    }

    fn onRecv(r: *Runner, ring: *uring.Ring, idx: u32, gen: u32, c: uring.Completion) void {
        defer ring.giveBack(c);
        if (idx >= r.conns.len) return;
        const cn = &r.conns[idx];
        // A completion of a closed connection (its recv was cancelled).
        if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
        if (!c.more) cn.recv_armed = false;
        if (c.res > 0) {
            r.takeBytes(idx, ring.bytes(c));
        } else if (c.res == -@as(i32, @backingInt(std.posix.E.NOBUFS))) {
            // No free buffer: a limit. The buffers of this round come back
            // before the next enter, which submits the re-arm.
        } else {
            // The peer closed, or an error: send what is queued, then close.
            // Errors other than a reset are unexpected: name the first ones.
            if (c.res < 0 and c.res != -@as(i32, @backingInt(std.posix.E.CONNRESET))) {
                r.ring_recv_errors += 1;
                if (r.ring_recv_errors <= 8) std.debug.print("shard {d}: io_uring recv ended with errno {d}\n", .{ r.id, -c.res });
            }
            cn.close_after = true;
            if (!cn.send_busy and cn.wsent >= cn.wlen) r.closeConn(idx);
            return;
        }
        if (cn.fd >= 0 and (cn.gen & 0xFFFFFF) == gen and !cn.recv_armed and !cn.close_after) {
            r.ring_rearms += 1;
            cn.recv_armed = ring.recvMultishot(token(.ring_recv, cn.gen, idx), cn.fd);
            if (!cn.recv_armed) r.closeConn(idx);
        }
    }

    /// Received bytes into the connection's buffer, as `readConn` reads
    /// them: parse as the buffer fills, move a large request to a large
    /// buffer, refuse what does not fit.
    fn takeBytes(r: *Runner, idx: u32, data: []const u8) void {
        var rest = data;
        // Each round copies at least one byte, or ends the connection's
        // reading (a full buffer is refused in `settle`).
        var guard: usize = 0;
        while (rest.len > 0 and guard <= data.len + 1) : (guard += 1) {
            const cn = &r.conns[idx];
            if (cn.fd < 0 or cn.close_after) return;
            const buf = r.inBuf(idx);
            const k = @min(buf.len - cn.rlen, rest.len);
            @memcpy(buf[cn.rlen..][0..k], rest[0..k]);
            cn.rlen += k;
            cn.rbig_high = @max(cn.rbig_high, cn.rlen);
            rest = rest[k..];
            _ = r.settle(idx);
        }
    }

    fn onSent(r: *Runner, idx: u32, gen: u32, c: uring.Completion) void {
        if (idx >= r.conns.len) return;
        const cn = &r.conns[idx];
        if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
        std.debug.assert(cn.send_busy);
        cn.send_busy = false;
        if (c.res < 0) {
            cn.close_after = true;
            cn.wsent = cn.wlen;
        } else {
            cn.wsent += @intCast(c.res);
            std.debug.assert(cn.wsent <= cn.wlen);
        }
        // The rest, or the end of the write and the close after it.
        r.flushConn(idx);
        if (cn.fd >= 0 and cn.close_after and !cn.send_busy and cn.wsent >= cn.wlen) r.closeConn(idx);
    }

    fn acceptAll(r: *Runner) void {
        while (true) {
            const fd = sys.acceptOne(r.lfd) orelse return;
            if (!r.adoptConn(fd)) return;
        }
    }

    /// Take a new connection. False when every connection slot is in use:
    /// the connection is closed (a limit).
    fn adoptConn(r: *Runner, fd: c_int) bool {
        const idx = r.free_conns.pop() orelse {
            sys.close(fd);
            return false;
        };
        const cn = &r.conns[idx];
        cn.fd = fd;
        cn.gen +%= 1;
        cn.rlen = 0;
        cn.wlen = 0;
        cn.wsent = 0;
        cn.dirty = false;
        cn.write_armed = false;
        cn.close_after = false;
        cn.send_busy = false;
        cn.recv_armed = false;
        if (r.ring) |ring| {
            cn.recv_armed = ring.recvMultishot(token(.ring_recv, cn.gen, idx), fd);
            if (!cn.recv_armed) r.closeConn(idx);
            return true;
        }
        r.poller.addRead(fd, token(.conn, cn.gen, idx)) catch {
            r.closeConn(idx);
        };
        return true;
    }

    fn closeConn(r: *Runner, idx: u32) void {
        const cn = &r.conns[idx];
        if (cn.fd < 0) return;
        if (r.ring) |ring| {
            if (cn.recv_armed) {
                ring.cancel(token(.ring_recv, cn.gen, idx));
                cn.recv_armed = false;
            }
            // The kernel still reads `wbuf`: close when the send completes.
            if (cn.send_busy) {
                cn.close_after = true;
                return;
            }
        } else r.poller.remove(cn.fd);
        r.dropBig(idx);
        r.releaseReqBig(idx);
        sys.close(cn.fd);
        cn.fd = -1;
        cn.gen +%= 1;
        sys.poison(cn.rbuf);
        sys.poison(cn.wbuf);
        r.free_conns.appendAssumeCapacity(idx);
    }

    fn inBuf(r: *Runner, idx: u32) []u8 {
        const cn = &r.conns[idx];
        if (cn.rbig == no_big) return cn.rbuf;
        return r.req_big_mem[@as(usize, cn.rbig) * r.req_big_size ..][0..r.req_big_size];
    }

    fn readConn(r: *Runner, idx: u32) !void {
        const cn = &r.conns[idx];
        while (true) {
            const buf = r.inBuf(idx);
            while (cn.rlen < buf.len) {
                const space = buf.len - cn.rlen;
                switch (sys.readSome(cn.fd, buf[cn.rlen..])) {
                    .n => |k| {
                        cn.rlen += k;
                        cn.rbig_high = @max(cn.rbig_high, cn.rlen);
                        // A short read took all that was there: the poller is
                        // level-triggered and reports more data, so a second
                        // read that returns EAGAIN would be a wasted system call.
                        if (k < space) break;
                    },
                    .again => break,
                    .closed => return r.closeConn(idx),
                }
            }
            if (r.settle(idx)) continue;
            return;
        }
    }

    /// Parse and queue the complete requests in the connection's buffer.
    /// True when the request at the front moved to a large buffer, so more
    /// of it can be read there.
    fn settle(r: *Runner, idx: u32) bool {
        const cn = &r.conns[idx];
        const buf = r.inBuf(idx);
        const off = r.parseRequests(idx, buf);
        if (off > 0) {
            std.mem.copyForwards(u8, buf[0 .. cn.rlen - off], buf[off..cn.rlen]);
            cn.rlen -= off;
        }
        // A request whose body does not fit the small buffer moves to a
        // large one, and reading goes on there.
        if (cn.rbig == no_big and cn.rlen > 0 and !cn.close_after) {
            switch (r.needLarge(idx)) {
                .no => {},
                .moved => return true,
                .too_large => r.refuseRequest(idx, 413, "{\"error\":\"request too large\"}"),
                .busy => r.refuseRequest(idx, 503, "{\"error\":\"no buffer for a large request; try again\"}"),
            }
        }
        if (cn.rbig != no_big and cn.rlen == 0) r.releaseReqBig(idx);
        if (cn.rlen == r.inBuf(idx).len) r.refuseRequest(idx, 413, "{\"error\":\"request too large\"}");
        return false;
    }

    /// Parse and queue the complete requests in `buf`. Returns the bytes used.
    fn parseRequests(r: *Runner, idx: u32, buf: []u8) usize {
        const cn = &r.conns[idx];
        var off: usize = 0;
        while (!cn.close_after) {
            const req = http.parseRequest(buf[off..cn.rlen], r.opts.max_request) catch |e| {
                if (e == error.TooLarge) r.refuseRequest(idx, 413, "{\"error\":\"request too large\"}") else r.refuseRequest(idx, 400, "{\"error\":\"bad request\"}");
                return 0;
            } orelse break;
            off += req.consumed;
            if (!req.keep_alive) cn.close_after = true;
            // New work waits while the outbox is full; a resume still goes on
            // (the events of a running execution must reach the outbox).
            if (r.outboxFull() and !std.mem.startsWith(u8, req.target, "/resume/")) {
                r.replyRaw(idx, 503, outbox_full_body);
                continue;
            }
            // "METHOD TARGET\n", the headers as JSON, "\n", then the body,
            // copied into batch memory.
            const p = requestPayload(&r.batch, req) catch {
                r.replyRaw(idx, 503, "{\"error\":\"busy\"}");
                continue;
            };
            // New work leaves room for the results of work in flight.
            if (r.events.items.len + r.resultReserve() >= r.events.capacity) {
                r.replyRaw(idx, 503, "{\"error\":\"busy\"}");
                continue;
            }
            r.events.appendAssumeCapacity(.{ .kind = .http_request, .conn = token(.conn, cn.gen, idx) + 0, .payload = p });
            _ = r.stats.requests.fetchAdd(1, .monotonic);
        }
        return off;
    }

    /// Answer and close after the reply; drop what was read.
    fn refuseRequest(r: *Runner, idx: u32, status: u32, body: []const u8) void {
        const cn = &r.conns[idx];
        r.replyRaw(idx, status, body);
        cn.close_after = true;
        cn.rlen = 0;
    }

    /// The request at the front of the small buffer: does its body need a
    /// large buffer? Moves it there when one is free.
    fn needLarge(r: *Runner, idx: u32) enum { no, moved, too_large, busy } {
        const cn = &r.conns[idx];
        const head_end = std.mem.indexOf(u8, cn.rbuf[0..cn.rlen], "\r\n\r\n") orelse return .no;
        const len = http.contentLength(cn.rbuf[0..head_end]) orelse return .no;
        const total = head_end + 4 + len;
        if (total <= cn.rbuf.len) return .no;
        if (total > r.opts.max_request) return .too_large;
        const b = r.req_big_free.pop() orelse return .busy;
        cn.rbig = b;
        @memcpy(r.inBuf(idx)[0..cn.rlen], cn.rbuf[0..cn.rlen]);
        return .moved;
    }

    /// Give the large request buffer back and return its pages to the OS.
    fn releaseReqBig(r: *Runner, idx: u32) void {
        const cn = &r.conns[idx];
        if (cn.rbig == no_big) return;
        for (r.req_big_free.items) |f| std.debug.assert(f != cn.rbig); // A double release.
        sys.poison(r.inBuf(idx)[0..@min(cn.rbig_high, r.req_big_size)]);
        sys.releasePages(r.inBuf(idx));
        cn.rbig_high = 0;
        r.req_big_free.appendAssumeCapacity(cn.rbig);
        cn.rbig = no_big;
    }

    fn requestPayload(arena: *Arena, req: http.Request) error{ArenaFull}![]const u8 {
        var b = arena.builder();
        errdefer b.abandon();
        try b.append(req.method);
        try b.byte(' ');
        try b.append(req.target);
        try b.byte('\n');
        try http.writeHeadersJson(&b, req.head);
        try b.byte('\n');
        try b.append(req.body);
        return b.finish();
    }

    /// A reply action: JSON or binary body, with the headers of ctx.respond.
    /// The header lines and a decoded binary body are built in the free
    /// part of the batch arena and copied to the connection buffer.
    /// The body that n8n sends when a run that a webhook started fails.
    const webhook_failed_body = "{\"message\":\"Error in workflow\"}";

    fn replyFromCore(r: *Runner, idx: u32, a: core.Action) void {
        std.debug.assert(r.in_perform);
        // A run that failed: the caller of a webhook gets the answer of n8n. The reason
        // goes to n8n with the `finished` event, not to the caller.
        if (a.seq & core.reply_failed != 0) return r.replyRaw(idx, 500, webhook_failed_body);
        var fba = r.batchFba();
        const scratch = fba.allocator();
        var body = a.payload;
        var hdr: http.UserHeaders = .{ .lines = &.{} };
        if (a.seq & core.reply_headers != 0) {
            body = std.mem.trim(u8, http.member(a.payload, "body") orelse "", " ");
            hdr = http.userHeaders(scratch, http.member(a.payload, "headers") orelse "{}") catch return r.replyRaw(idx, 503, "{\"error\":\"busy\"}");
            // Values can be secrets: the log names only the count.
            if (hdr.dropped > 0) std.debug.print("respond: dropped {d} header(s) with a bad name or value\n", .{hdr.dropped});
        }
        if (a.seq & core.reply_binary != 0) return r.replyBinary(idx, a.aux, body, hdr, scratch);
        r.replyTyped(idx, a.aux, hdr.content_type orelse "application/json", hdr.lines, body);
    }

    /// Respond to Webhook in binary mode: decode `data` (base64) and send
    /// it with the user's content type, else `mimeType`, else
    /// `application/octet-stream`.
    fn replyBinary(r: *Runner, idx: u32, status: u32, payload: []const u8, hdr: http.UserHeaders, scratch: std.mem.Allocator) void {
        const data = if (http.member(payload, "data")) |raw| http.plainString(std.mem.trim(u8, raw, " ")) else null;
        const b64 = data orelse return r.replyRaw(idx, 500, "{\"error\":\"the binary response has no base64 data\"}");
        const mime_raw = if (http.member(payload, "mimeType")) |raw| http.plainString(std.mem.trim(u8, raw, " ")) else null;
        const mime = if (mime_raw) |m| (if (m.len > 0 and m.len < 128 and std.mem.indexOfAny(u8, m, "\r\n") == null) m else null) else null;
        const content_type = hdr.content_type orelse mime orelse "application/octet-stream";
        // A reference to n8n's binary data store: read the file (binary_store.zig).
        if (binary_store.isStoredMarker(b64)) {
            const id_raw = if (http.member(payload, "id")) |raw| http.plainString(std.mem.trim(u8, raw, " ")) else null;
            const id = id_raw orelse return r.replyRaw(idx, 500, "{\"error\":\"the binary response has no data and no id\"}");
            const storage = binary_store.storagePath() orelse return r.replyRaw(idx, 500, "{\"error\":\"no binary data storage path is set\"}");
            const stored = binary_store.read(scratch, storage, id, binary_reply_limit) catch |e| return r.replyRaw(idx, switch (e) {
                error.OutOfMemory => 503,
                else => 500,
            }, switch (e) {
                error.NotFound => "{\"error\":\"the binary data file is missing\"}",
                error.TooLarge => "{\"error\":\"the binary data file is too large\"}",
                error.OutOfMemory => "{\"error\":\"busy\"}",
                else => "{\"error\":\"the binary data id is not valid\"}",
            });
            return r.replyTyped(idx, status, content_type, hdr.lines, stored);
        }
        const dec = std.base64.standard.Decoder;
        const n = dec.calcSizeForSlice(b64) catch return r.replyRaw(idx, 500, "{\"error\":\"the binary response data is not base64\"}");
        const bytes = scratch.alloc(u8, n) catch return r.replyRaw(idx, 503, "{\"error\":\"busy\"}");
        dec.decode(bytes, b64) catch return r.replyRaw(idx, 500, "{\"error\":\"the binary response data is not base64\"}");
        r.replyTyped(idx, status, content_type, hdr.lines, bytes);
    }

    fn replyRaw(r: *Runner, idx: u32, status: u32, body: []const u8) void {
        r.replyTyped(idx, status, "application/json", "", body);
    }

    fn replyTyped(r: *Runner, idx: u32, status: u32, content_type: []const u8, extra: []const u8, body: []const u8) void {
        const cn = &r.conns[idx];
        const used = http.writeResponseTyped(r.outBuf(idx)[cn.wlen..], status, content_type, extra, body) orelse blk: {
            // Too large for the connection buffer: move to a large buffer.
            if (cn.big == no_big) if (r.egress.bigAcquire()) |b| {
                const big = r.egress.bigSlice(b);
                @memcpy(big[0..cn.wlen], cn.wbuf[0..cn.wlen]);
                cn.big = b;
                break :blk http.writeResponseTyped(big[cn.wlen..], status, content_type, extra, body);
            };
            break :blk null;
        } orelse http.writeResponse(r.outBuf(idx)[cn.wlen..], 500, "{\"error\":\"the reply is too large\"}") orelse {
            cn.close_after = true;
            return;
        };
        cn.wlen += used;
        if (!cn.dirty) {
            cn.dirty = true;
            r.dirty.appendAssumeCapacity(idx);
        }
        _ = r.stats.replies.fetchAdd(1, .monotonic);
    }

    /// One write per connection per batch, whatever number of replies.
    fn flushConns(r: *Runner) void {
        for (r.dirty.items) |i| {
            r.conns[i].dirty = false;
            r.flushConn(i);
        }
        r.dirty.clearRetainingCapacity();
    }

    fn flushConn(r: *Runner, idx: u32) void {
        const cn = &r.conns[idx];
        if (cn.fd < 0) return;
        if (r.ring) |ring| {
            // One send in flight per connection; the rest goes when it ends.
            if (cn.send_busy) return;
            if (cn.wsent < cn.wlen) {
                cn.send_busy = ring.send(token(.ring_send, cn.gen, idx), cn.fd, r.outBuf(idx)[cn.wsent..cn.wlen]);
                // No room to queue the send: a limit; the connection goes.
                if (!cn.send_busy) r.closeConn(idx);
                return;
            }
        }
        while (cn.wsent < cn.wlen) {
            _ = r.stats.syscalls_write.fetchAdd(1, .monotonic);
            switch (sys.writeSome(cn.fd, r.outBuf(idx)[cn.wsent..cn.wlen])) {
                .n => |k| cn.wsent += k,
                .again => {
                    cn.write_armed = true;
                    r.poller.wantWrite(cn.fd, token(.conn, cn.gen, idx)) catch r.closeConn(idx);
                    return;
                },
                .closed => {
                    r.closeConn(idx);
                    return;
                },
            }
        }
        r.dropBig(idx);
        cn.wlen = 0;
        cn.wsent = 0;
        // Clear write interest only when it was set: on Linux that is a
        // system call, which most replies do not need.
        if (cn.write_armed) {
            r.poller.doneWrite(cn.fd, token(.conn, cn.gen, idx));
            cn.write_armed = false;
        }
        if (cn.close_after) r.closeConn(idx);
    }

    fn outBuf(r: *Runner, idx: u32) []u8 {
        const cn = &r.conns[idx];
        return if (cn.big != no_big) r.egress.bigSlice(cn.big) else cn.wbuf;
    }

    fn dropBig(r: *Runner, idx: u32) void {
        const cn = &r.conns[idx];
        if (cn.big == no_big) return;
        r.egress.bigRelease(cn.big, cn.wlen);
        cn.big = no_big;
    }

    // ---- actions ------------------------------------------------------------

    fn perform(r: *Runner, actions: []const core.Action) !void {
        r.in_perform = true;
        defer r.in_perform = false;
        for (actions) |a| {
            switch (a.kind) {
                .reply => {
                    const idx: u32 = @truncate(a.conn);
                    const gen: u32 = @truncate((a.conn >> 32) & 0xFFFFFF);
                    if (a.conn >> 56 == @backingInt(Kind.admin)) {
                        r.adminReplyTo(idx, gen, a.aux, a.payload);
                        continue;
                    }
                    if (a.conn == 0 or idx >= r.conns.len) continue;
                    const cn = &r.conns[idx];
                    if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) continue;
                    r.replyFromCore(idx, a);
                },
                .dispatch => try r.dispatch(a),
                .finished => {
                    _ = r.stats.finished.fetchAdd(1, .monotonic);
                    r.dropServiceCalls(a.exec_id);
                },
                else => {},
            }
            if (r.opts.admin_port != null) try r.publishAction(a);
        }
    }

    /// `msg` must be a static text: it can wait for room past the batch.
    fn effectError(r: *Runner, exec_id: u64, seq: u32, msg: []const u8) void {
        if (r.events.items.len + r.resultReserve() >= r.events.capacity) return r.waitForRoom(exec_id, seq, msg);
        r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = exec_id, .seq = seq, .payload = msg });
    }

    fn waitForRoom(r: *Runner, exec_id: u64, seq: u32, msg: []const u8) void {
        // The actions of a batch and the requests in flight bound the list.
        std.debug.assert(r.nlost < r.egress_lost.len);
        if (r.nlost == r.egress_lost.len) {
            std.debug.print("shard {d}: no room for the result of {d}/{d}\n", .{ r.id, exec_id, seq });
            return;
        }
        r.egress_lost[r.nlost] = .{ .exec_id = exec_id, .seq = seq, .msg = msg };
        r.nlost += 1;
    }

    fn dispatch(r: *Runner, a: core.Action) !void {
        switch (a.effect_kind) {
            .http => r.startEgress(a),
            .node, .code => r.sendFallback(a),
            .service => r.startService(a),
            .sql => r.startSql(a),
            // A person answers through POST /resume/<exec>/<seq>. The PoC
            // does not send the notification itself.
            .approval => {
                // Send-and-wait: the host sends the message; the execution
                // waits for the resume either way.
                if (http.member(a.payload, "node")) |node| return r.sendFrame(a, std.mem.trim(u8, node, " "), true);
                var idb: [32]u8 = undefined;
                std.debug.print("approval waiting: POST /resume/{s}/{d}\n", .{ core.formatExecId(a.exec_id, &idb), a.seq });
            },
            else => {},
        }
    }

    // ---- PostgreSQL and MySQL (pg.zig, my.zig, spec 9.10) ---------------------------

    /// The MySQL client has the limits of the PostgreSQL client (the `--sql-*` flags).
    fn startMysql(r: *Runner, gpa: std.mem.Allocator, scfg: pg.Config) !void {
        r.mysql = try gpa.create(my.Client);
        const mcfg: my.Config = .{
            .max_reqs = scfg.max_reqs,
            .max_conns = scfg.max_conns,
            .pool_conns = scfg.pool_conns,
            .max_pools = scfg.max_pools,
            .max_result = scfg.max_result,
            .max_request = scfg.max_request,
            .max_statements = scfg.max_statements,
            .idle_ms = scfg.idle_ms,
            .total_ms = scfg.total_ms,
            .insecure_tls = scfg.insecure_tls,
            .ca_file = scfg.ca_file,
            .dns_servers = scfg.dns_servers,
            .credentials = scfg.credentials,
        };
        try r.mysql.init(gpa, mcfg, &r.poller, @backingInt(Kind.mysql), @backingInt(Kind.mysql_dns));
    }

    /// The `dialect` of the call selects the client.
    fn startSql(r: *Runner, a: core.Action) void {
        const store = r.credsFor(a.module);
        const now = sys.nowMs();
        const mysql = my_call.isMysql(a.payload);
        if (mysql and !r.opts.sql_mysql) return r.effectError(a.exec_id, a.seq, "sql: the native MySQL client is not on in this build (limit: sql-host)");
        const answer = if (mysql) r.mysql.start(a.exec_id, a.seq, a.payload, store, now) else r.sql.start(a.exec_id, a.seq, a.payload, store, now);
        r.effectError(a.exec_id, a.seq, answer orelse return);
    }

    fn drainSql(r: *Runner) void {
        r.drainSqlOf(r.sql);
        r.drainSqlOf(r.mysql);
    }

    /// Hand the results of finished `sql` calls to the core, oldest first,
    /// as the events of the batch have room. A call keeps its slot and its
    /// result until then, so results that wait hold back new calls.
    fn drainSqlOf(r: *Runner, client: anytype) void {
        // Each pass frees one call slot.
        for (0..r.opts.sql.max_reqs) |_| {
            const d = client.nextDone() orelse return;
            if (r.events.items.len + r.resultReserve() >= r.events.capacity) return;
            const kind: core.EventKind = if (d.ok) .effect_ok else .effect_err;
            if (r.batch.dupe(d.payload)) |p| {
                r.events.appendAssumeCapacity(.{ .kind = kind, .exec_id = d.exec_id, .seq = d.seq, .payload = p });
            } else |_| {
                // The batch memory is full of other results: they go first.
                if (r.events.items.len > 0) return;
                r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = d.exec_id, .seq = d.seq, .payload = "sql: the result does not fit in the batch memory (limit)" });
            }
            client.release(d.req);
        }
    }

    // ---- outbound HTTP --------------------------------------------------------

    fn startEgress(r: *Runner, a: core.Action) void {
        _ = r.stats.egress.fetchAdd(1, .monotonic);
        const store = r.credsFor(a.module);
        const now = sys.nowMs();
        // The one comparison of a request whose credential values are
        // valid: the clock against the first expiry of the document, which
        // is maxInt when no value has one. The request has no row and no
        // copy of its args (`renew.zig`).
        if (store) |s| if (now >= s.renew_at_ms and r.renewBeforeStart(a, s, now)) return;
        r.egress.start(a.exec_id, a.seq, a.payload, if (a.idempotent) &a.key else null, store, a.attempt, r.workflowKey(a.module), now);
    }

    // ---- credential renewal (renew.zig) ---------------------------------------

    /// What the args of a request say about its renewal.
    const Renewable = struct {
        /// The slot name, a part of the args.
        slot: []const u8,
        info: renew.Info,
        single_use: bool,
    };

    /// The slot of a request when n8n can renew it, with the options that
    /// the node gave (`skipTokenRefresh`, `tokenExpiredStatusCode`). A
    /// request that does not carry the values of its slot (`inject: false`,
    /// a plain request helper of v1) has no renewal, as in v1.
    fn renewableOf(args: []const u8, s: *const creds.Store) ?Renewable {
        const raw = http.member(args, "credential") orelse return null;
        if (raw.len < 3 or raw[0] != '"' or raw[raw.len - 1] != '"') return null;
        const slot = raw[1 .. raw.len - 1];
        const info = s.renewal(slot) orelse return null;
        if (isJson(http.member(args, "inject"), "false")) return null;
        const multipart = http.member(args, "multipart");
        return .{
            .slot = slot,
            .info = info.withRequest(isJson(http.member(args, "skipTokenRefresh"), "true"), http.member(args, "tokenExpiredStatusCode")),
            .single_use = multipart != null and !isJson(multipart, "null"),
        };
    }

    fn isJson(raw: ?[]const u8, text: []const u8) bool {
        return std.mem.eql(u8, std.mem.trim(u8, raw orelse return false, " \t\r\n"), text);
    }

    /// A request starts when a value of its document is about to expire.
    /// True when the request waits for a renewal first: the value of its
    /// own slot expires within the margin. False: the caller starts the
    /// request now.
    fn renewBeforeStart(r: *Runner, a: core.Action, s: *const creds.Store, now: i64) bool {
        std.debug.assert(now >= s.renew_at_ms);
        const t = if (r.renewals) |*t| t else return false;
        const want = renewableOf(a.payload, s) orelse return false;
        if (now < want.info.expires_at_ms -| creds.renew_margin_ms) return false;
        const m = r.sh.st.moduleAt(a.module);
        // No row: the request goes with the value that it has, which is
        // valid until the expiry. A response that refuses it is handled then.
        const i = t.add(.{ .exec_id = a.exec_id, .seq = a.seq, .attempt = a.attempt, .single_use = want.single_use }, r.sh.st.modules[a.module].workflowId(), m.str(m.steps[a.step].name), want.slot, want.info) orelse return false;
        r.askRenewal(t, i);
        return true;
    }

    /// Row `i` needs a renewal: send the `credentials.renew` service call,
    /// unless another request waits already for the same slot.
    fn askRenewal(r: *Runner, t: *renew.Table, i: u32) void {
        if (t.want(i) == .follow) return;
        const req = t.entries[i].req;
        const calls = if (r.svc) |*c| c else return t.answered(i, false, svc_no_admin);
        var buf: [256]u8 = @splat(0);
        const payload = std.fmt.bufPrint(&buf, "{{\"service\":\"credentials\",\"op\":\"renew\",\"args\":{{\"credentialId\":\"{s}\"}}}}", .{t.slot(i)}) catch
            return t.answered(i, false, svc_big);
        const deadline = sys.nowMs() + r.opts.service_timeout_ms;
        const ci = calls.add(req.exec_id, req.seq, req.attempt, t.workflow(i), t.step(i), payload, deadline) catch |e| {
            return t.answered(i, false, switch (e) {
                error.Full => svc_full,
                error.TooLarge => svc_big,
            });
        };
        r.publish(.{ .service = .{ .line = calls.line(ci) } });
    }

    /// The result of a request: true when the step must not see it,
    /// because the request goes again after a renewal, or because the
    /// renewal that it needs has no row (the step then gets a limit error).
    fn renewOnResult(r: *Runner, exec_id: u64, seq: u32, res: egress.Result) bool {
        const t = if (r.renewals) |*t| t else return false;
        const status: u32 = switch (res) {
            .ok => |resp| resp.status,
            .err => 0,
        };
        // A request that had its one renewal: the step gets this result,
        // also when the status says "expired" again.
        if (t.count != 0) if (t.find(exec_id, seq)) |i| {
            if (t.entries[i].state != .in_flight) return false;
            const decision = t.onResponse(i, status);
            std.debug.assert(decision == .deliver);
            return false;
        };
        // The one comparison of a response to a request with a valid value.
        if (status < r.min_expiry_status) return false;
        return r.renewAfterResponse(t, exec_id, seq, status);
    }

    /// A response with a status that can mean "the value expired". The
    /// request has no row and the shell has no copy of its args: the core
    /// gives them (`pendingDispatch`). They say which slot the request
    /// used and which statuses count for it.
    fn renewAfterResponse(r: *Runner, t: *renew.Table, exec_id: u64, seq: u32, status: u32) bool {
        std.debug.assert(status >= r.min_expiry_status and t.find(exec_id, seq) == null);
        const mod = r.sh.st.moduleOfExecution(exec_id) orelse return false;
        const s = r.credsFor(mod) orelse return false;
        if (!s.renewable) return false;
        const arena = if (r.in_perform) &r.carry[r.carry_cur] else &r.batch;
        // The args are needed for the names only: the row copies them.
        const mark = arena.begin();
        const row: ?u32, const wanted: bool = blk: {
            defer mark.end();
            const a = r.sh.st.pendingDispatch(exec_id, seq, arena) orelse break :blk .{ null, false };
            const want = renewableOf(a.payload, s) orelse break :blk .{ null, false };
            if (!want.info.matches(status)) break :blk .{ null, false };
            const m = r.sh.st.moduleAt(a.module);
            break :blk .{ t.add(.{ .exec_id = exec_id, .seq = seq, .attempt = a.attempt, .single_use = want.single_use }, r.sh.st.modules[a.module].workflowId(), m.str(m.steps[a.step].name), want.slot, want.info), true };
        };
        if (!wanted) return false;
        const i = row orelse {
            // No row for the renewal that v1 would make. The step does not
            // get the response of the expired value as if the service gave
            // it: it fails with a limit that names the flag, and can run again.
            r.effectError(exec_id, seq, renew.full_text);
            return true;
        };
        switch (t.onResponse(i, status)) {
            // A new row had no renewal, and its status counts.
            .deliver => unreachable,
            .renew => {
                r.askRenewal(t, i);
                return true;
            },
            .renew_detached => {
                r.askRenewal(t, i);
                return false;
            },
        }
    }

    /// A credentials document arrived: a status of one of its slots can
    /// lower the bound of `renewOnResult`.
    fn noteStore(r: *Runner, s: *const creds.Store) void {
        r.min_expiry_status = @min(r.min_expiry_status, s.min_status);
    }

    fn renewalsPending(r: *const Runner) bool {
        return if (r.renewals) |*t| t.pending > 0 else false;
    }

    /// Requests whose renewal has an answer: send them again, or give the
    /// step the failure, as room in the event list allows.
    fn resumeRenewed(r: *Runner, now: i64) void {
        const t = if (r.renewals) |*t| t else return;
        var guard: usize = 0;
        while (guard < t.entries.len and r.events.items.len + r.resultReserve() < r.events.capacity) : (guard += 1) {
            const i = t.nextPending() orelse return;
            const req = t.entries[i].req;
            if (t.entries[i].state == .failed) {
                const msg = r.batch.dupe(t.message(i)) catch @as([]const u8, renew.failed_text); // no room: the general text
                r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = req.exec_id, .seq = req.seq, .payload = msg });
                t.release(i);
                continue;
            }
            t.restart(i);
            // The core has the args: the effect still waits for its result.
            const a = r.sh.st.pendingDispatch(req.exec_id, req.seq, &r.batch) orelse {
                // The execution left memory (a long wait in another branch),
                // or the batch memory has no room for the args.
                r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = req.exec_id, .seq = req.seq, .payload = renew_resend_msg });
                t.release(i);
                continue;
            };
            // A request that fails at once gives its row back in `egressDone`.
            r.egress.start(a.exec_id, a.seq, a.payload, if (a.idempotent) &a.key else null, r.credsFor(a.module), a.attempt, r.workflowKey(a.module), now);
        }
    }

    /// The answer of n8n to the renewal that row `i` leads. n8n sent the new
    /// values (`PUT /_admin/workflows/<id>/credentials`) before the answer.
    fn renewalAnswered(t: *renew.Table, i: u32, answer: admin.Answer) void {
        switch (answer) {
            .ok => t.answered(i, true, ""),
            .err => |raw| {
                var buf: [512]u8 = @splat(0);
                var out: creds.Out = .{ .buf = &buf };
                http.unescape(raw[0..@min(raw.len, buf.len)], &out) catch return t.answered(i, false, "");
                t.answered(i, false, out.written());
            },
        }
    }

    /// The egress client's result. Responses arrive while events are read,
    /// before the batch runs, so they go to batch memory. Errors raised
    /// while actions run go to the carry arena for the next batch.
    fn egressDone(ctx: *anyopaque, exec_id: u64, seq: u32, res: egress.Result) void {
        const r: *Runner = @ptrCast(@alignCast(ctx));
        // A status that means "the token expired": the request goes again
        // after a renewal, and the step does not see this result.
        if (r.renewOnResult(exec_id, seq, res)) return;
        // While events are read, the reserve covers every request in flight,
        // so there is room. While a batch acts, requests that fail at once
        // can outnumber the reserve, and what is added then must leave the
        // reserve free for the next read: those wait in `egress_lost`.
        std.debug.assert(r.in_perform or r.events.items.len < r.events.capacity);
        if (r.in_perform and r.events.items.len + r.resultReserve() >= r.events.capacity) {
            return r.waitForRoom(exec_id, seq, egress_lost_msg);
        }
        const arena = if (r.in_perform) &r.carry[r.carry_cur] else &r.batch;
        switch (res) {
            .err => |msg| {
                const p = arena.dupe(msg) catch @as([]const u8, "http: busy");
                r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = exec_id, .seq = seq, .payload = p });
            },
            .ok => |resp| {
                const res_ = writeResult(arena, resp, r.sh.st.resultReads(exec_id, seq)) catch {
                    r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = exec_id, .seq = seq, .payload = "http: the response does not fit in the batch memory" });
                    return;
                };
                r.events.appendAssumeCapacity(.{ .kind = .effect_ok, .exec_id = exec_id, .seq = seq, .aux = res_.aux, .payload = res_.payload });
            },
        }
    }

    /// Hand results that found no room to the core as retryable errors,
    /// oldest first, as room allows.
    fn drainEgressLost(r: *Runner) void {
        var k: usize = 0;
        // They count as new work: the reserve for requests in flight stays.
        while (k < r.nlost and r.events.items.len + r.resultReserve() < r.events.capacity) : (k += 1) {
            const l = r.egress_lost[k];
            r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = l.exec_id, .seq = l.seq, .payload = l.msg });
        }
        std.mem.copyForwards(EgressLost, r.egress_lost[0 .. r.nlost - k], r.egress_lost[k..r.nlost]);
        r.nlost -= k;
    }

    pub const ResultEvent = struct { payload: []const u8, aux: u32 };

    /// The `effect_ok` of an HTTP response. A response labelled JSON with a
    /// body goes as the head `{"status":N,"headers":{...}}` and then the raw
    /// body, with `core.raw_body_flag`: the core parses the body once and
    /// makes it a string when it does not parse. Any other response goes as
    /// `{"status":N,"headers":{...},"body":"<the text>"}`. Members that the
    /// step's code never reads (`reads`) are not written: headers become
    /// `{}`, and an unread body is left out, as an empty raw body.
    pub fn writeResult(arena: *Arena, resp: egress.Response, reads: core.ResultReads) error{ArenaFull}!ResultEvent {
        var b = arena.builder();
        errdefer b.abandon();
        var nb: [32]u8 = undefined;
        try b.append(std.fmt.bufPrint(&nb, "{{\"status\":{d},\"headers\":", .{resp.status}) catch unreachable);
        if (reads.headers) try http.writeHeadersJson(&b, resp.header_lines) else try b.append("{}");
        if (!reads.body or (resp.json and std.mem.trim(u8, resp.body, " \t\r\n").len > 0)) {
            try b.byte('}');
            const head_len = b.len;
            if (reads.body) try b.append(resp.body);
            return .{ .payload = b.finish(), .aux = core.raw_body_flag | @as(u32, @intCast(head_len)) };
        }
        try b.append(",\"body\":");
        core_lib.json.writeString(&b, resp.body) catch return error.ArenaFull;
        try b.byte('}');
        return .{ .payload = b.finish(), .aux = 0 };
    }

    // ---- stored responses (blob_store.zig, spec 7.1 `responseBinary`) ------------

    /// Make the binary data store when n8n keeps binary data in files: its
    /// storage path is set (`binary_store.storagePath`), and its mode, when
    /// set, is `filesystem`. Without the store, a request with
    /// `responseBinary` fails at its start. The store has no cost for a
    /// shard without it: no memory and no descriptor.
    fn startBlobs(r: *Runner, gpa: std.mem.Allocator, opts: Options) error{OutOfMemory}!void {
        r.blobs = null;
        const root = binary_store.storagePath() orelse return;
        const mode = sys.getenv("N8N_DEFAULT_BINARY_DATA_MODE") orelse "filesystem";
        if (!std.mem.eql(u8, mode, "filesystem")) return;
        // Bodies wait in blocks only for writes on the ring.
        const ring_possible = uring.supported and opts.io != .poll;
        const b = try gpa.create(blob_store.Store);
        b.init(gpa, .{
            .root = root,
            .max_file_bytes = opts.binary_max_file,
            .max_transfers = opts.binary_max_transfers,
            .buffer_bytes = if (ring_possible) opts.binary_buffer else 0,
        }, @backingInt(Kind.ring_file)) catch |e| switch (e) {
            error.OutOfMemory => return error.OutOfMemory,
            error.BadRoot => {
                std.debug.print("shard {d}: the binary data storage path \"{s}\" is not a directory; responses are not stored\n", .{ r.id, root[0..@min(root.len, 200)] });
                return;
            },
        };
        r.blobs = b;
    }

    /// The start of the result of a stored response: `{"status":N,"headers":{...}}`.
    fn writeStoredHead(arena: *Arena, resp: egress.Response, reads: core.ResultReads) error{ArenaFull}![]const u8 {
        var b = arena.builder();
        errdefer b.abandon();
        var nb: [32]u8 = @splat(0);
        // 32 bytes hold this text with any u32.
        try b.append(std.fmt.bufPrint(&nb, "{{\"status\":{d},\"headers\":", .{resp.status}) catch unreachable);
        if (reads.headers) try http.writeHeadersJson(&b, resp.header_lines) else try b.append("{}");
        try b.byte('}');
        return b.finish();
    }

    /// A 2xx response of a request with `responseBinary`: the body goes to
    /// the binary data store, and the step gets its result with the handle
    /// when the file is written (`drainStored`).
    fn egressStored(ctx: *anyopaque, exec_id: u64, seq: u32, h: blob_store.Handle, resp: egress.Response, url_path: []const u8, expected: ?u64) bool {
        const r: *Runner = @ptrCast(@alignCast(ctx));
        const blobs = r.blobs orelse unreachable; // The egress client got the handle from this store.
        // The request goes again after a renewal: there is nothing to store yet.
        if (r.renewOnResult(exec_id, seq, .{ .ok = resp })) {
            blobs.release(h);
            return false;
        }
        const st = &r.sh.st;
        const arena = if (r.in_perform) &r.carry[r.carry_cur] else &r.batch;
        const head = writeStoredHead(arena, resp, st.resultReads(exec_id, seq)) catch {
            blobs.release(h);
            egressDone(ctx, exec_id, seq, .{ .err = "http: the response does not fit in the batch memory" });
            return false;
        };
        // The execution part of the path, as the fallback host writes it: n8n's id
        // for a manual run, else `wfrt-` and the id of the runtime. n8n moves the
        // files of a production run to its own id when it saves the run.
        var eb: [32]u8 = @splat(0);
        var xb: [40]u8 = @splat(0);
        const exec_text = heap.formatExecId(exec_id, &eb);
        // 40 bytes hold the prefix and the 32 bytes of an id.
        const execution = if (exec_id & core.given_id_flag != 0) exec_text else std.fmt.bufPrint(&xb, "wfrt-{s}", .{exec_text}) catch unreachable;
        // The body comes next, in pieces from the socket.
        blobs.begin(h, .{
            .exec_id = exec_id,
            .seq = seq,
            .workflow = if (st.by_exec.get(exec_id)) |slot| st.modules[st.slot_module[slot]].workflowId() else "",
            .execution = execution,
            .head = head,
            .content_disposition = egress.headerValue(resp.header_lines, "content-disposition") orelse "",
            .content_type = egress.headerValue(resp.header_lines, "content-type") orelse "",
            .url_path = url_path,
            .expected = expected,
            .now_ms = r.egress.now_ms,
        });
        return true;
    }

    /// Give the steps the results of the store, oldest first, as room
    /// allows. They count as new work: the reserve for requests in flight
    /// stays. A result without room waits in the store.
    fn deliverStored(r: *Runner) void {
        const blobs = r.blobs orelse return;
        var guard: u32 = 0;
        while (guard < blobs.cfg.max_transfers and r.events.items.len + r.resultReserve() < r.events.capacity) : (guard += 1) {
            const d = blobs.nextDone() orelse return;
            const arena = if (r.in_perform) &r.carry[r.carry_cur] else &r.batch;
            if (arena.dupe(d.payload)) |payload| {
                const kind: core.EventKind = if (d.ok) .effect_ok else .effect_err;
                r.events.appendAssumeCapacity(.{ .kind = kind, .exec_id = d.exec_id, .seq = d.seq, .aux = if (d.ok and d.stored) core.raw_body_flag | d.head_len else 0, .payload = payload });
            } else |_| {
                r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = d.exec_id, .seq = d.seq, .payload = "http: the response does not fit in the batch memory" });
            }
            blobs.take(d);
        }
    }

    /// Once per loop round: transfers over their time fail, and finished
    /// ones give their results.
    fn drainStored(r: *Runner, now: i64) void {
        const blobs = r.blobs orelse return;
        blobs.tick(now);
        r.deliverStored();
    }

    // ---- admin API (spec 9.1) ---------------------------------------------------

    fn adminToken(r: *Runner, idx: u32) u64 {
        return token(.admin, r.admin_conns[idx].gen, idx);
    }

    fn acceptAdmin(r: *Runner) void {
        var guard: u32 = 0;
        while (guard < 1024) : (guard += 1) {
            const fd = sys.acceptOne(r.admin_lfd) orelse return;
            const idx = for (r.admin_conns, 0..) |c, i| {
                if (c.fd < 0) break i;
            } else {
                sys.close(fd);
                continue;
            };
            const cn = &r.admin_conns[idx];
            std.debug.assert(!cn.big and !cn.streaming);
            cn.fd = fd;
            cn.gen +%= 1;
            cn.rlen = 0;
            cn.wlen = 0;
            cn.wsent = 0;
            cn.close_after = false;
            r.poller.addRead(fd, token(.admin, cn.gen, @intCast(idx))) catch r.closeAdmin(@intCast(idx));
        }
    }

    fn closeAdmin(r: *Runner, idx: u32) void {
        const cn = &r.admin_conns[idx];
        if (cn.fd < 0) return;
        r.poller.remove(cn.fd);
        sys.close(cn.fd);
        cn.fd = -1;
        cn.gen +%= 1;
        r.releaseAdminBig(idx);
        sys.poison(cn.rbuf[0..cn.rlen]);
        cn.rlen = 0;
        cn.wlen = 0;
        cn.wsent = 0;
        if (r.stream == idx) {
            r.stream = null;
            // A half-sent line goes again in full to the next client.
            r.queue.restartFront();
            if (r.ob) |*ob| ob.restartFront();
            r.stream_more = false;
        }
        cn.streaming = false;
    }

    fn adminIn(r: *Runner, idx: u32) []u8 {
        const cn = &r.admin_conns[idx];
        return if (cn.big) r.admin_big else cn.rbuf;
    }

    /// Give the large admin buffer back and return its pages to the OS.
    fn releaseAdminBig(r: *Runner, idx: u32) void {
        const cn = &r.admin_conns[idx];
        if (!cn.big) return;
        std.debug.assert(r.admin_big_user == idx);
        sys.poison(r.admin_big[0..cn.rlen]);
        sys.releasePages(r.admin_big);
        cn.big = false;
        r.admin_big_user = null;
    }

    fn readAdmin(r: *Runner, idx: u32) void {
        const cn = &r.admin_conns[idx];
        // Each pass reads, or moves to the large buffer once.
        var guard: u32 = 0;
        while (guard < 1 << 16) : (guard += 1) {
            const buf = r.adminIn(idx);
            if (cn.rlen == buf.len) {
                if (cn.streaming) {
                    cn.rlen = 0;
                    continue;
                }
                if (cn.big) return r.refuseAdmin(idx, 413, "{\"error\":\"request too large\"}");
                if (r.admin_big_user != null) return r.refuseAdmin(idx, 503, "{\"error\":\"another large admin request is being read; try again\"}");
                @memcpy(r.admin_big[0..cn.rlen], cn.rbuf[0..cn.rlen]);
                cn.big = true;
                r.admin_big_user = idx;
                continue;
            }
            switch (sys.readSome(cn.fd, buf[cn.rlen..])) {
                .n => |k| cn.rlen += k,
                .again => break,
                .closed => return r.closeAdmin(idx),
            }
        }
        // The stream client sends nothing more; ignore what it sends.
        if (cn.streaming) {
            cn.rlen = 0;
            return;
        }
        const buf = r.adminIn(idx);
        var off: usize = 0;
        while (!cn.streaming and !cn.close_after) {
            const req = http.parseRequest(buf[off..cn.rlen], max_admin_request) catch {
                r.adminReply(idx, 400, "{\"error\":\"bad request\"}");
                cn.close_after = true;
                off = cn.rlen;
                break;
            } orelse break;
            off += req.consumed;
            if (!req.keep_alive) cn.close_after = true;
            r.handleAdmin(idx, req);
        }
        if (cn.close_after) off = cn.rlen;
        std.mem.copyForwards(u8, buf[0 .. cn.rlen - off], buf[off..cn.rlen]);
        cn.rlen -= off;
        if (cn.rlen == 0) r.releaseAdminBig(idx);
        r.flushAdmin(idx);
    }

    fn refuseAdmin(r: *Runner, idx: u32, status: u32, body: []const u8) void {
        const cn = &r.admin_conns[idx];
        r.adminReply(idx, status, body);
        cn.close_after = true;
        r.flushAdmin(idx);
    }

    /// An allocator over the free part of the batch arena: what it hands
    /// out lives until the batch ends. `keepBatch` keeps it.
    fn batchFba(r: *Runner) std.heap.FixedBufferAllocator {
        return .init(r.batch.buf[r.batch.used..]);
    }

    fn keepBatch(r: *Runner, fba: *const std.heap.FixedBufferAllocator) void {
        std.debug.assert(fba.buffer.ptr == r.batch.buf[r.batch.used..].ptr);
        r.batch.used += fba.end_index;
        r.batch.high_water = @max(r.batch.high_water, r.batch.used);
    }

    const busy_body = "{\"error\":\"the batch memory is full; try again\"}";

    /// Requests that change state become core events: the core replies
    /// through the admin connection token, and the log keeps the event.
    /// Event payloads live in the batch arena until the batch ends.
    fn handleAdmin(r: *Runner, idx: u32, req: http.Request) void {
        if (!admin.authorized(req.head, r.opts.admin_secret)) return r.adminReply(idx, 401, "{\"error\":\"unauthorized\"}");
        if (r.events.items.len + 64 + r.resultReserve() > r.events.capacity) return r.adminReply(idx, 503, "{\"error\":\"busy\"}");
        const conn = r.adminToken(idx);
        var fba = r.batchFba();
        const a = fba.allocator();
        switch (admin.route(req.method, req.target)) {
            .put_workflow => |id| {
                const p = admin.loadPayload(a, id, req.body) catch |e| return r.adminReply(idx, switch (e) {
                    error.OutOfMemory => 503,
                    else => 400,
                }, switch (e) {
                    error.BadModule => "{\"error\":\"module must be base64 .wfm bytes\"}",
                    error.OutOfMemory => busy_body,
                    else => "{\"error\":\"bad workflow body\"}",
                });
                // Time zones of schedule triggers go before the module. Zones
                // the core has already are not read again.
                const bytes = p[std.mem.indexOfScalar(u8, p, '\n').? + 1 ..];
                var zones: std.ArrayList(core.Event) = .empty;
                triggers.zoneEventsNew(a, &zones, bytes, &r.sh.st) catch |e| return r.adminReply(idx, if (e == error.OutOfMemory) 503 else 400, if (e == error.OutOfMemory) busy_body else "{\"error\":\"unknown time zone\"}");
                if (r.events.items.len + zones.items.len + 1 + r.resultReserve() > r.events.capacity) return r.adminReply(idx, 503, "{\"error\":\"busy\"}");
                var flags: ?[]const u8 = null;
                if (http.member(req.body, "credentials")) |raw| {
                    const text = std.mem.trim(u8, raw, " \t\r\n");
                    if (!std.mem.eql(u8, text, "null")) {
                        const store = r.wf_pool.?.parse(text) catch |e| return r.adminReply(idx, 400, switch (e) {
                            error.TooLarge => "{\"error\":\"the credentials of a workflow are larger than 256 KB\"}",
                            error.PoolFull => "{\"error\":\"too many workflows with credentials\"}",
                            else => "{\"error\":\"credentials must be a JSON object\"}",
                        });
                        store.next = r.egress.cfg.credentials;
                        flags = credFlagsPayload(a, id, store.text) catch {
                            r.wf_pool.?.release(store);
                            return r.adminReply(idx, 503, busy_body);
                        };
                        if (!r.setWorkflowCreds(id, store)) {
                            r.wf_pool.?.release(store);
                            return r.adminReply(idx, 503, "{\"error\":\"too many workflows with credentials\"}");
                        }
                    }
                }
                r.keepBatch(&fba);
                for (zones.items) |z| r.events.appendAssumeCapacity(z);
                r.events.appendAssumeCapacity(.{ .kind = .load_workflow, .conn = conn, .payload = p });
                // After the load: the core keeps flags of a loaded workflow only.
                if (flags) |f| r.queueCredFlags(id, f);
            },
            .delete_workflow => |id| {
                r.dropWorkflowCreds(id);
                const p = r.batch.dupe(id) catch return r.adminReply(idx, 503, busy_body);
                r.events.appendAssumeCapacity(.{ .kind = .unload_workflow, .conn = conn, .payload = p });
            },
            .get_static_data => |id| {
                // The shard's copy, `{}` when the workflow has none. n8n reads
                // it after a missed event stream (spec 9.7).
                r.adminReply(idx, 200, r.sh.st.statics.get(id) orelse "{}");
            },
            .put_workflow_credentials => |id| r.putWorkflowCreds(idx, id, req.body),
            .list_workflows => {
                const t = r.batch.begin();
                defer t.end();
                var b = r.batch.builder();
                r.listWorkflows(&b) catch return r.adminReply(idx, 503, busy_body);
                r.adminReply(idx, 200, b.bytes());
            },
            .put_credentials => {
                const store = r.global_pool.?.parse(req.body) catch |e| return r.adminReply(idx, 400, switch (e) {
                    error.TooLarge => "{\"error\":\"the credentials document is larger than 16 MB\"}",
                    else => "{\"error\":\"credentials must be a JSON object\"}",
                });
                const old = r.egress.cfg.credentials;
                r.egress.cfg.credentials = store;
                r.noteStore(store);
                for (r.wf_creds) |*w| if (w.store) |ws| {
                    ws.next = store;
                };
                // Requests copy what they need when they start: nothing
                // holds the old store now.
                if (old) |o| r.global_pool.?.release(o);
                r.adminReply(idx, 200, "{\"ok\":true}");
            },
            .put_variables => {
                // Logged, so a replay starts each execution with the same variables.
                const p = r.batch.dupe(req.body) catch return r.adminReply(idx, 503, busy_body);
                r.events.appendAssumeCapacity(.{ .kind = .set_vars, .conn = conn, .payload = p });
            },
            .start_execution => {
                // New work waits while the outbox is full (spec 9.2).
                if (r.outboxFull()) return r.adminReply(idx, 503, outbox_full_body);
                const m = admin.manualEvent(a, req.body, r.opts.test_clock) catch |e| return r.adminReply(idx, if (e == error.OutOfMemory) 503 else 400, switch (e) {
                    error.BadExecutionId => "{\"error\":\"executionId must be a numeric string\"}",
                    error.ClockDisabled => admin.clock_disabled_body,
                    error.BadClockOffset => admin.clock_range_body,
                    error.OutOfMemory => busy_body,
                    else => "{\"error\":\"bad execution body\"}",
                });
                r.keepBatch(&fba);
                r.events.appendAssumeCapacity(.{ .kind = .manual, .exec_id = m.exec_id, .seq = m.flags, .conn = conn, .payload = m.payload });
            },
            .cancel_execution => |text| {
                const id = core.parseExecId(text) orelse return r.adminReply(idx, 400, "{\"error\":\"bad execution id\"}");
                if (!r.sh.st.knowsExecution(id)) return r.adminReply(idx, 404, "{\"error\":\"unknown execution\"}");
                r.events.appendAssumeCapacity(.{ .kind = .cancel, .exec_id = id });
                r.adminReply(idx, 202, "{\"ok\":true}");
            },
            .events => {
                if (r.stream != null) return r.adminReply(idx, 409, "{\"error\":\"another client reads the events\"}");
                // The replay starts after the seq that the client names, or
                // after the acked seq of this shard (spec 9.2).
                var after = r.ackedSeq();
                if (std.mem.indexOfScalar(u8, req.target, '?')) |q| {
                    after = admin.parseAfter(req.target[q + 1 ..], r.id) catch {
                        return r.adminReply(idx, 400, after_body);
                    } orelse after;
                }
                const cn = &r.admin_conns[idx];
                const head = "HTTP/1.1 200 OK\r\ncontent-type: application/x-ndjson\r\ncache-control: no-cache\r\nconnection: close\r\n\r\n";
                if (cn.wbuf.len - cn.wlen < head.len) return r.adminReply(idx, 503, "{\"error\":\"busy\"}");
                cn.streaming = true;
                r.stream = idx;
                r.stream_more = false;
                if (r.ob) |*ob| ob.startStream(after);
                @memcpy(cn.wbuf[cn.wlen..][0..head.len], head);
                cn.wlen += head.len;
                // Calls that wait go out again to the new client (spec 9.9).
                if (r.svc) |*t| for (t.calls, 0..) |c, i| {
                    if (c.used) r.publish(.{ .service = .{ .line = t.line(i) } });
                };
                r.flushStream();
            },
            .@"resume" => |rs| {
                // The same path as `POST /resume/<id>/<seq>` on the public port.
                // The query keeps `signature`.
                const q = std.mem.indexOfScalar(u8, req.target, '?');
                const p = std.fmt.allocPrint(a, "POST /resume/{s}/{s}{s}\n{{}}\n{s}", .{ rs.id, rs.seq, if (q) |i| req.target[i..] else "", req.body }) catch return r.adminReply(idx, 503, busy_body);
                r.keepBatch(&fba);
                r.events.appendAssumeCapacity(.{ .kind = .http_request, .conn = conn, .payload = p });
            },
            .ack_events => {
                var acks: [admin.max_acks]admin.Ack = undefined;
                const list = admin.parseAcks(a, req.body, &acks) catch {
                    return r.adminReply(idx, 400, ack_body);
                };
                for (list) |ak| {
                    // This shard answers for itself; a seq of another shard is
                    // none of its business.
                    if (ak.shard != r.id) continue;
                    if (r.ob) |*ob| {
                        ob.ack(ak.seq) catch |e| return r.adminReply(idx, switch (e) {
                            error.AckBeyond => 400,
                            else => 500,
                        }, switch (e) {
                            error.AckBeyond => ack_beyond_body,
                            else => "{\"error\":\"the ack file was not written\"}",
                        });
                    } else {
                        // No log dir: the acked seq lives in memory only.
                        if (ak.seq > r.seq_mem) return r.adminReply(idx, 400, ack_beyond_body);
                        r.acked_mem = @max(r.acked_mem, ak.seq);
                    }
                }
                r.adminReply(idx, 204, "");
            },
            .outbox => {
                const t = r.batch.begin();
                defer t.end();
                var b = r.batch.builder();
                r.outboxStatus(&b) catch return r.adminReply(idx, 503, busy_body);
                r.adminReply(idx, 200, b.bytes());
            },
            .answer_service => |text| r.answerService(idx, text, req.body),
            .not_found => r.adminReply(idx, 404, "{\"error\":\"not found\"}"),
        }
    }

    /// `PUT /_admin/workflows/<id>/credentials`: a credentials-only update.
    /// The slots of the body replace those of the workflow's document; the
    /// other slots and the module stay. Requests copy what they need when
    /// they start, so the old store is free at once.
    fn putWorkflowCreds(r: *Runner, idx: u32, id: []const u8, body: []const u8) void {
        const pool = if (r.wf_pool) |*p| p else return r.adminReply(idx, 404, "{\"error\":\"not found\"}");
        if (id.len > core.max_id) return r.adminReply(idx, 404, "{\"error\":\"unknown workflow\"}");
        const known = r.findWorkflowCreds(id);
        if (known == null and r.sh.st.liveWorkflow(id) == null) return r.adminReply(idx, 404, "{\"error\":\"unknown workflow\"}");
        const base: []const u8 = if (known) |w| (if (w.store) |s| s.text else "{}") else "{}";
        const store = pool.parseMerged(base, body) catch |e| return r.adminReply(idx, 400, switch (e) {
            error.TooLarge => "{\"error\":\"the credentials of a workflow are larger than 256 KB\"}",
            error.PoolFull => "{\"error\":\"too many workflows with credentials\"}",
            error.CredentialsNotAnObject => "{\"error\":\"credentials must be a JSON object\"}",
        });
        store.next = r.egress.cfg.credentials;
        var fba = r.batchFba();
        const flags = credFlagsPayload(fba.allocator(), id, store.text) catch {
            pool.release(store);
            return r.adminReply(idx, 503, busy_body);
        };
        if (!r.setWorkflowCreds(id, store)) {
            pool.release(store);
            return r.adminReply(idx, 503, "{\"error\":\"too many workflows with credentials\"}");
        }
        r.keepBatch(&fba);
        r.queueCredFlags(id, flags);
        r.adminReply(idx, 200, "{\"ok\":true}");
    }

    /// The payload of a `credential_flags` event for the credentials
    /// document `text` of a workflow: the id, a newline, the flags. Flags
    /// over the size of the core give `{}` and a message with the id: node
    /// code that reads one then fails with the message of the reference.
    /// The message has no name and no value of a flag.
    fn credFlagsPayload(a: std.mem.Allocator, id: []const u8, text: []const u8) error{OutOfMemory}![]const u8 {
        std.debug.assert(id.len > 0 and id.len <= core.max_id);
        const cred_flags = core_lib.cred_flags;
        const buf = try a.alloc(u8, id.len + 1 + cred_flags.doc_bytes);
        @memcpy(buf[0..id.len], id);
        buf[id.len] = '\n';
        const room = buf[id.len + 1 ..];
        const doc: []const u8 = if (creds.flagsDoc(text, room)) |d| (if (cred_flags.valid(d)) d else "") else |_| "";
        if (doc.len == 0) {
            std.debug.print("workflow {s}: its credential flags do not fit {d} bytes or have a slot name that is not text; its compiled nodes get none\n", .{ id, cred_flags.doc_bytes });
            room[0..2].* = "{}".*;
            return buf[0 .. id.len + 3];
        }
        return buf[0 .. id.len + 1 + doc.len];
    }

    /// Add the `credential_flags` event of a workflow whose credentials
    /// changed. `payload` is in the batch memory. The event is in the log,
    /// so it goes out only when there are flags, or when the core can hold
    /// flags of an older document that must go.
    fn queueCredFlags(r: *Runner, id: []const u8, payload: []const u8) void {
        const w = r.findWorkflowCreds(id) orelse return;
        const some = !std.mem.endsWith(u8, payload, "\n{}");
        if (!some and !w.has_flags and r.sh.st.cred_flags.find(id) == null) return;
        w.has_flags = some;
        // `handleAdmin` keeps room for the events of one request.
        std.debug.assert(r.events.items.len < r.events.capacity);
        r.events.appendAssumeCapacity(.{ .kind = .credential_flags, .payload = payload });
    }

    fn findWorkflowCreds(r: *Runner, id: []const u8) ?*WfCreds {
        for (r.wf_creds) |*w| {
            if (w.store != null and w.id_len == id.len and std.mem.eql(u8, w.id[0..w.id_len], id)) return w;
        }
        return null;
    }

    /// Set the store of a workflow; its old store is freed. False when the
    /// table is full.
    fn setWorkflowCreds(r: *Runner, id: []const u8, store: *creds.Store) bool {
        std.debug.assert(id.len <= core.max_id);
        r.noteStore(store);
        if (r.findWorkflowCreds(id)) |w| {
            r.wf_pool.?.release(w.store.?);
            w.store = store;
            return true;
        }
        for (r.wf_creds) |*w| if (w.store == null) {
            @memcpy(w.id[0..id.len], id);
            w.id_len = @intCast(id.len);
            w.store = store;
            return true;
        };
        return false;
    }

    fn dropWorkflowCreds(r: *Runner, id: []const u8) void {
        const w = r.findWorkflowCreds(id) orelse return;
        r.wf_pool.?.release(w.store.?);
        w.* = .{};
    }

    /// The credentials of the workflow of a module: its own store, which
    /// falls back to the global one, else the global store.
    /// The workflow of a module for `--egress-pool workflow`: its id when
    /// n8n loaded it, else the module (one per file with `--module`).
    fn workflowKey(r: *Runner, mod: u16) u64 {
        const lm = &r.sh.st.modules[mod];
        if (lm.wf_id_len > 0) return std.hash.Wyhash.hash(0, lm.workflowId());
        return mod;
    }

    fn credsFor(r: *Runner, mod: u16) ?*const creds.Store {
        const lm = &r.sh.st.modules[mod];
        if (lm.wf_id_len > 0 and r.wf_creds.len > 0) if (r.findWorkflowCreds(lm.workflowId())) |w| return w.store.?;
        return r.egress.cfg.credentials;
    }

    /// `[{workflowId, versionId, active, routes: ["POST /webhook/x"], schedules}]`
    fn listWorkflows(r: *Runner, b: *core_lib.arena.Builder) error{ArenaFull}!void {
        const st = &r.sh.st;
        try b.byte('[');
        var first = true;
        var nb: [96]u8 = undefined;
        for (st.modules[0..st.nmodules], 0..) |*lm, mi| {
            if (lm.state != .live or lm.wf_id_len == 0) continue;
            if (!first) try b.byte(',');
            first = false;
            try b.append("{\"workflowId\":");
            try jsonStr(b, lm.workflowId());
            try b.append(",\"versionId\":");
            try jsonStr(b, lm.versionId());
            try b.append(std.fmt.bufPrint(&nb, ",\"active\":{},\"executions\":{d},\"routes\":[", .{ lm.active, lm.refs - 1 }) catch unreachable);
            var rf = true;
            for (st.routes[0..st.nroutes]) |*rt| {
                if (rt.removed or rt.module != mi) continue;
                if (!rf) try b.byte(',');
                rf = false;
                var line: [core.max_path + 16]u8 = undefined;
                try jsonStr(b, std.fmt.bufPrint(&line, "{s} {s}", .{ rt.method[0..rt.method_len], rt.path[0..rt.path_len] }) catch unreachable);
            }
            var nsched: u32 = 0;
            for (st.schedules[0..st.nschedules]) |sc| {
                if (sc.module == mi) nsched += 1;
            }
            try b.append(std.fmt.bufPrint(&nb, "],\"schedules\":{d}}}", .{nsched}) catch unreachable);
        }
        try b.byte(']');
    }

    fn jsonStr(b: *core_lib.arena.Builder, s: []const u8) error{ArenaFull}!void {
        core_lib.json.writeString(b, s) catch return error.ArenaFull;
    }

    /// A reply from the core: the connection may have closed since.
    fn adminReplyTo(r: *Runner, idx: u32, gen: u32, status: u32, body: []const u8) void {
        if (idx >= r.admin_conns.len) return;
        const cn = &r.admin_conns[idx];
        if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
        r.adminReply(idx, status, body);
        r.flushAdmin(idx);
    }

    /// Queue a reply in the connection's write buffer. A reply that does
    /// not fit becomes a 500; when even that does not fit, the connection
    /// closes after what is queued.
    fn adminReply(r: *Runner, idx: u32, status: u32, body: []const u8) void {
        const cn = &r.admin_conns[idx];
        const room = cn.wbuf[cn.wlen..];
        const n = http.writeResponse(room, status, body) orelse http.writeResponse(room, 500, "{\"error\":\"the reply is too large\"}") orelse {
            cn.close_after = true;
            return;
        };
        cn.wlen += n;
        std.debug.assert(cn.wlen <= cn.wbuf.len);
    }

    fn flushAdmin(r: *Runner, idx: u32) void {
        const cn = &r.admin_conns[idx];
        if (cn.fd < 0) return;
        while (cn.wsent < cn.wlen) {
            switch (sys.writeSome(cn.fd, cn.wbuf[cn.wsent..cn.wlen])) {
                .n => |k| cn.wsent += k,
                .again => {
                    r.poller.wantWrite(cn.fd, r.adminToken(idx)) catch r.closeAdmin(idx);
                    return;
                },
                .closed => return r.closeAdmin(idx),
            }
        }
        cn.wlen = 0;
        cn.wsent = 0;
        if (cn.streaming) return r.flushStream();
        r.poller.doneWrite(cn.fd, r.adminToken(idx));
        if (cn.close_after) r.closeAdmin(idx);
    }

    // ---- event stream (spec 9.2) ----------------------------------------------

    /// A best-effort line into the ring. A counting pass gives its length,
    /// so nothing is allocated. Its floor is the seq of the durable event
    /// published just before it: the stream sends the line after that event,
    /// so the order of publication holds (spec 9.2).
    fn publish(r: *Runner, ev: admin.Event) void {
        r.publishSeq(ev, null);
    }

    /// The line into the ring. With a `seq` it is a durable event that has
    /// no outbox (no log dir): it carries its seq and is never dropped.
    fn publishSeq(r: *Runner, ev: admin.Event, seq: ?u64) void {
        const now = sys.nowMs();
        var cnt = creds.Out.counter();
        if (seq) |sq| {
            admin.encodeDurable(creds.Out, &cnt, ev, now, r.id, sq) catch unreachable;
        } else {
            admin.encode(&cnt, ev, now) catch unreachable; // Counting has no limit.
        }
        const dst = r.queue.push(cnt.len, ev.droppable() and seq == null, r.dur_seq) orelse return;
        var out: creds.Out = .{ .buf = dst };
        if (seq) |sq| {
            admin.encodeDurable(creds.Out, &out, ev, now, r.id, sq) catch unreachable;
        } else {
            admin.encode(&out, ev, now) catch unreachable; // `dst` has the counted length.
        }
        std.debug.assert(out.len == dst.len);
    }

    /// A durable event: it goes to the outbox with its seq, and the stream
    /// reads it back from there, in seq order. Without an outbox the line is
    /// numbered in memory and kept in the ring.
    fn publishDurable(r: *Runner, ev: admin.Event, sync: outbox.Sync) !void {
        const now = sys.nowMs();
        const ob = if (r.ob) |*ob| ob else {
            r.seq_mem += 1;
            r.dur_seq = r.seq_mem;
            r.publishSeq(ev, r.seq_mem);
            return;
        };
        const seq = ob.nextSeq();
        var cnt = creds.Out.counter();
        admin.encodeDurable(creds.Out, &cnt, ev, now, r.id, seq) catch unreachable;
        if (cnt.len > outbox.max_line_bytes) {
            std.debug.print("shard {d}: a durable event of {d} bytes does not fit the outbox\n", .{ r.id, cnt.len });
            return error.EventTooLarge;
        }
        var rec = try ob.begin(seq, @intCast(cnt.len));
        admin.encodeDurable(outbox.Record, &rec, ev, now, r.id, seq) catch |e| switch (e) {
            error.NoSpace => unreachable, // It is the counted length.
            error.OutboxWrite => return error.OutboxWrite,
        };
        try rec.finish(sync);
        r.dur_seq = seq;
    }

    /// A `step` or `trace` line (spec 9.2). The line of an execution with
    /// data is durable: n8n saves the node data of that execution, so the
    /// line stays in the outbox until n8n acks it. The lines of a watched or
    /// sampled execution without data stay best effort.
    fn publishNodeData(r: *Runner, a: core.Action, ev: admin.Event) !void {
        std.debug.assert(ev == .step or ev == .trace);
        if (!a.data) return r.publish(ev);
        r.publishDurable(ev, syncOf(a.durability)) catch |e| switch (e) {
            // More bytes than one record holds is a limit: the line goes out
            // best effort, so a large result does not stop the execution.
            error.EventTooLarge => r.publish(ev),
            else => return e,
        };
    }

    /// The sync policy of a record: the durability tier of its workflow.
    fn syncOf(d: core.Durability) outbox.Sync {
        return switch (d) {
            .sync => .now,
            .batched => .batch,
            .none => .none,
        };
    }

    /// One action as an event of the stream. A durable event can stop the
    /// shard when the outbox cannot write it: a lost lifecycle event is
    /// worse than a restart.
    fn publishAction(r: *Runner, a: core.Action) !void {
        const st = &r.sh.st;
        var idb: [32]u8 = undefined;
        const exec = core.formatExecId(a.exec_id, &idb);
        switch (a.kind) {
            .started => {
                const lm = &st.modules[a.module];
                try r.publishDurable(.{ .started = .{ .exec = exec, .workflow = lm.workflowId(), .version = lm.versionId(), .manual = a.aux & heap.exec_flag_manual != 0, .trigger = a.payload } }, syncOf(a.durability));
            },
            .status => {
                const m = st.moduleAt(a.module);
                const step = m.str(m.steps[a.step].name);
                const ss: core.StepStatus = @fromBackingInt(a.aux);
                switch (ss) {
                    .waiting => try r.publishDurable(.{ .waiting = .{ .exec = exec, .step = step, .wait_till = @bitCast(a.conn) } }, syncOf(a.durability)),
                    .started => try r.publishNodeData(a, .{ .step = .{ .exec = exec, .step = step, .status = "started", .args = a.payload } }),
                    .completed => try r.publishNodeData(a, .{ .step = .{ .exec = exec, .step = step, .status = "completed", .result = a.payload } }),
                    .failed, .retrying => try r.publishNodeData(a, .{ .step = .{ .exec = exec, .step = step, .status = admin.stepStatusName(ss), .err = if (a.payload.len > 0) a.payload else null } }),
                }
            },
            .trace_items => try r.publishNodeData(a, .{ .trace = .{ .exec = exec, .item = a.payload } }),
            .dispatch => if (a.effect_kind == .approval) {
                const m = st.moduleAt(a.module);
                var url: [128]u8 = undefined;
                var sb: [32]u8 = undefined;
                const sig = core.resumeSignature(st, a.exec_id, &sb);
                const u = std.fmt.bufPrint(&url, "/resume/{s}/{d}{s}{s}", .{ exec, a.seq, if (sig != null) "?signature=" else "", sig orelse "" }) catch return;
                try r.publishDurable(.{ .waiting = .{ .exec = exec, .step = m.str(m.steps[a.step].name), .resume_url = u, .signature = sig } }, syncOf(a.durability));
            },
            .finished => {
                const status: heap.ExecStatus = @fromBackingInt(a.aux);
                // A poll run that found nothing sent no `started` (spec 9.8).
                if (status == .skipped) return;
                try r.publishDurable(.{ .finished = .{ .exec = exec, .status = admin.statusName(status), .result = if (a.payload.len > 0) a.payload else null } }, syncOf(a.durability));
            },
            .attention => {
                const m = st.moduleAt(a.module);
                try r.publishDurable(.{ .finished = .{ .exec = exec, .status = "needs_attention", .step = m.str(m.steps[a.step].name) } }, syncOf(a.durability));
            },
            .static_data => if (a.aux == 0) {
                const nl = std.mem.indexOfScalar(u8, a.payload, '\n') orelse return;
                try r.publishDurable(.{ .static_data = .{ .workflow = a.payload[0..nl], .doc = a.payload[nl + 1 ..] } }, syncOf(a.durability));
            } else try r.publishDurable(.{ .static_data = .{ .workflow = "", .err = a.payload } }, syncOf(a.durability)),
            else => {},
        }
    }

    /// Send lines to the stream client in the order in which they were
    /// published: a durable record goes after the best-effort lines that
    /// came before it, and a best-effort line after the durable records up
    /// to its floor. Each pass writes with one system call per source.
    fn flushStream(r: *Runner) void {
        const idx = r.stream orelse return;
        const cn = &r.admin_conns[idx];
        if (cn.wsent < cn.wlen) return; // The response head is not out yet.
        if (r.ob) |*ob| {
            // The replay of a reconnect goes before the live lines.
            r.queue.noteDropped(sys.nowMs(), r.queue.frontFloor() orelse ob.rd.sent_seq);
        } else {
            r.queue.noteDropped(sys.nowMs(), 0);
        }
        var moved: usize = 0;
        var guard: u32 = 0;
        while (guard < 1 << 20) : (guard += 1) {
            var step: usize = 0;
            // The stored records of the replay, else the durable records that
            // the next best-effort line waits for.
            if (r.ob) |*ob| {
                const replaying = ob.rd.sent_seq < ob.rd.replay_until;
                const upto = if (replaying) std.math.maxInt(u64) else if (r.queue.frontFloor()) |f| f else std.math.maxInt(u64);
                if (upto > ob.rd.sent_seq) switch (ob.flushTo(cn.fd, upto)) {
                    .sent => |k| step += k,
                    .empty => {},
                    .blocked => return r.streamBlocked(idx),
                    .closed => return r.closeAdmin(idx),
                };
                // The best-effort lines whose durable floor the client has. A
                // replay of stored records that is not done goes first.
                if (!replaying) if (r.queue.frontFloor()) |f| {
                    if (f <= ob.rd.sent_seq) switch (r.sendRing(cn.fd, ob.rd.sent_seq)) {
                        .sent => |k| step += k,
                        .empty => {},
                        .blocked => return r.streamBlocked(idx),
                        .closed => return r.closeAdmin(idx),
                    };
                };
            } else if (r.queue.frontFloor() != null) {
                // No outbox: the ring is the whole stream, in order.
                switch (r.sendRing(cn.fd, std.math.maxInt(u64))) {
                    .sent => |k| step += k,
                    .empty => {},
                    .blocked => return r.streamBlocked(idx),
                    .closed => return r.closeAdmin(idx),
                }
            }
            if (step == 0) break;
            moved += step;
        }
        // A slow client makes the outbox cursor fall behind: nothing is lost.
        r.stream_more = moved > 0 and r.streamPending();
        r.poller.doneWrite(cn.fd, r.adminToken(idx));
    }

    /// One write of the best-effort lines whose floor the client has.
    fn sendRing(r: *Runner, fd: c_int, limit: u64) outbox.Step {
        var bufs: [64][]const u8 = undefined;
        const n = r.queue.frontSlicesUpTo(&bufs, limit);
        if (n == 0) return .empty;
        switch (sys.writevSome(fd, bufs[0..n])) {
            .n => |k| {
                if (k == 0) return .empty;
                r.queue.consume(k);
                return .{ .sent = k };
            },
            .again => return .blocked,
            .closed => return .closed,
        }
    }

    /// True when a line of either source still waits for the client.
    fn streamPending(r: *const Runner) bool {
        if (r.queue.bytes > 0 or r.queue.notice_len > 0) return true;
        const ob = if (r.ob) |*o| o else return false;
        return ob.pending();
    }

    /// The socket is full: write interest goes back on, and the loop waits.
    fn streamBlocked(r: *Runner, idx: u32) void {
        r.stream_more = false;
        const cn = &r.admin_conns[idx];
        r.poller.wantWrite(cn.fd, r.adminToken(idx)) catch r.closeAdmin(idx);
    }

    // ---- fallback host ----------------------------------------------------------

    fn sendFallback(r: *Runner, a: core.Action) void {
        r.sendFrame(a, a.payload, false);
    }

    /// One host frame. `send`: the message node of an approval
    /// (`ApprovalCall.node`); its frame id ends in `:send` and carries
    /// `execution`, so the node can put the resume URL in its message.
    /// It never stops the shard: a step that cannot go out fails with a
    /// limit or retryable error. The frames of a batch go out in one write
    /// for each connection after `perform` (`loop`).
    fn sendFrame(r: *Runner, a: core.Action, args: []const u8, send: bool) void {
        const key: FbKey = .{ .exec_id = a.exec_id, .seq = a.seq, .send = send };
        if (r.fb_inflight.count() + r.fb_failq.items.len >= fb_max_inflight) return r.failHost(key, fb_full);
        // Fair admission: a step beyond the total or beyond the share of its
        // workflow waits, and so does a step behind a step of its workflow.
        if (!r.hostHasPlace(a.module) or r.fb_wf_waiting[a.module] > 0) return r.waitFrame(key, a, args, send);
        const ci = r.pickConn(sys.nowMs()) orelse return r.waitFrame(key, a, args, send);
        const c = &r.fb_conns[ci];
        const start = c.wbuf.items.len;
        r.writeFrame(&c.wbuf, a, args, send) catch |err| {
            // Drop the part of the frame that was written.
            c.wbuf.shrinkRetainingCapacity(start);
            return r.failHost(key, switch (err) {
                error.OutOfMemory => fb_wfull,
                error.NameTooLong => fb_name,
            });
        };
        std.debug.assert(c.wbuf.items.len > start + 4);
        var entry: FbEntry = .{ .conn = ci, .module = a.module, .step = a.step, .attempt = a.attempt };
        // A v1 host never needs the copy: a lost connection fails its steps.
        if (r.fb_version != 1) r.journal(&entry, c.wbuf.items[start..]);
        r.fb_inflight.putAssumeCapacity(key, entry);
        r.fbAdmit(a.module);
        c.inflight += 1;
    }

    /// The host steps that the shard keeps in flight: `--fallback-steps-per-worker`
    /// for each connection that it keeps (one for each host worker).
    fn hostCapTotal(r: *const Runner) u32 {
        return @max(1, r.fb_target *| r.opts.fallback_steps_per_worker);
    }

    /// The host steps that one workflow keeps in flight.
    fn hostCapWorkflow(r: *const Runner) u32 {
        const total = r.hostCapTotal();
        if (r.opts.fallback_workflow_steps > 0) return @min(total, r.opts.fallback_workflow_steps);
        return @max(1, total / 4);
    }

    /// True when a step of the workflow in `module` can go to the host now.
    fn hostHasPlace(r: *const Runner, module: u32) bool {
        return r.fb_admitted < r.hostCapTotal() and r.fb_wf_inflight[module] < r.hostCapWorkflow();
    }

    /// A host step takes a place: one of the total and one of its workflow.
    fn fbAdmit(r: *Runner, module: u32) void {
        r.fb_admitted += 1;
        r.fb_wf_inflight[module] += 1;
        r.fb_serve += 1;
        r.fb_wf_last[module] = r.fb_serve;
        gauge(&r.stats.host_inflight, 1);
        std.debug.assert(r.fb_admitted <= fb_max_inflight);
    }

    /// A host step starts to wait in `fb_waitq`.
    fn fbWaits(r: *Runner, module: u32) void {
        if (r.fb_wf_waiting[module] == 0) r.fb_wf_waiters += 1;
        r.fb_wf_waiting[module] += 1;
        r.fb_waiting_n += 1;
        r.fb_wait_dirty = true;
        gauge(&r.stats.host_waiting, 1);
        gauge(&r.stats.host_waited, 1);
        std.debug.assert(r.fb_wf_waiters >= 1 and r.fb_wf_waiters <= r.fb_waiting_n);
    }

    /// A host step leaves its state: it gives its place back, or it stops
    /// to wait. Each change of `FbEntry.conn` between a place and
    /// `fb_waiting`, and each removal from `fb_inflight`, goes through here.
    fn fbLeave(r: *Runner, e: *const FbEntry) void {
        if (e.conn == fb_waiting) {
            std.debug.assert(r.fb_waiting_n > 0 and r.fb_wf_waiting[e.module] > 0);
            r.fb_waiting_n -= 1;
            r.fb_wf_waiting[e.module] -= 1;
            if (r.fb_wf_waiting[e.module] == 0) r.fb_wf_waiters -= 1;
            gauge(&r.stats.host_waiting, -1);
            return;
        }
        std.debug.assert(r.fb_admitted > 0 and r.fb_wf_inflight[e.module] > 0);
        r.fb_admitted -= 1;
        r.fb_wf_inflight[e.module] -= 1;
        r.fb_wait_dirty = true;
        gauge(&r.stats.host_inflight, -1);
    }

    /// Removes a host step from the table, with its place or its wait.
    fn fbRemove(r: *Runner, key: FbKey) void {
        const kv = r.fb_inflight.fetchRemove(key) orelse return;
        r.fbLeave(&kv.value);
    }

    /// A host step failed at a limit of the wait queue.
    fn refuseHost(r: *Runner, key: FbKey, msg: []const u8) void {
        gauge(&r.stats.host_refused, 1);
        r.failHost(key, msg);
    }

    /// The connection for a new step: open, not draining and not running a
    /// step alone, with the fewest steps in flight. Connects when none is open.
    fn pickConn(r: *Runner, now: i64) ?u8 {
        // Without --fallback the shard has no host connections.
        if (r.fb_conns.len == 0) return null;
        std.debug.assert(r.fb_target >= 1 and r.fb_target <= r.fb_conns.len);
        var pass: u32 = 0;
        while (pass < 2) : (pass += 1) {
            var best: ?u8 = null;
            for (r.fb_conns[0..r.fb_target], 0..) |*c, i| {
                if (c.alone or c.reserved or (c.state != .hello and c.state != .ready)) continue;
                // A connection that waits for its hello answer comes last.
                if (best) |b| {
                    const bc = &r.fb_conns[b];
                    const better = if (c.state != bc.state) c.state == .ready else c.inflight < bc.inflight;
                    if (!better) continue;
                }
                best = @intCast(i);
            }
            if (best != null or pass == 1) return best;
            r.connectFallback(now);
        }
        unreachable;
    }

    /// Keeps a copy of a frame for a send again. Without room, even after the
    /// live copies move down, the frame has no copy (`jlen` 0).
    fn journal(r: *Runner, e: *FbEntry, frame: []const u8) void {
        const cap = r.fb_journal[0].len;
        if (frame.len > cap) return;
        if (r.fb_jlen + frame.len > cap) r.compactJournal();
        if (r.fb_jlen + frame.len > cap) return;
        const buf = r.fb_journal[r.fb_jcur];
        @memcpy(buf[r.fb_jlen..][0..frame.len], frame);
        e.joff = @intCast(r.fb_jlen);
        e.jlen = @intCast(frame.len);
        r.fb_jlen += frame.len;
        std.debug.assert(r.fb_jlen <= cap);
    }

    /// Moves the copies of the frames in flight to the other journal buffer,
    /// one after the other. Bounded by the frames in flight.
    fn compactJournal(r: *Runner) void {
        const from = r.fb_journal[r.fb_jcur];
        const to = r.fb_journal[r.fb_jcur ^ 1];
        var len: usize = 0;
        var it = r.fb_inflight.valueIterator();
        while (it.next()) |e| {
            if (e.jlen == 0) continue;
            std.mem.copyForwards(u8, to[len..][0..e.jlen], from[e.joff..][0..e.jlen]);
            e.joff = @intCast(len);
            len += e.jlen;
        }
        r.fb_jcur ^= 1;
        r.fb_jlen = len;
        std.debug.assert(r.fb_jlen <= to.len);
    }

    /// A step that found no usable connection waits for one, up to
    /// `--fallback-wait-ms`. The frame goes into the journal now, and out from
    /// there when a connection is usable.
    fn waitFrame(r: *Runner, key: FbKey, a: core.Action, args: []const u8, send: bool) void {
        // A shard without a host has no journal: nothing can wait.
        if (r.fb_journal[0].len == 0 or r.opts.fallback_wait_ms <= 0) return r.failHost(key, fb_down);
        if (r.fb_waitq.items.len == r.fb_waitq.capacity) return r.refuseHost(key, fb_full);
        if (r.fb_wf_waiting[a.module] >= fb_max_wait_workflow) return r.refuseHost(key, fb_full);
        var entry: FbEntry = .{ .conn = fb_waiting, .module = a.module, .step = a.step, .attempt = a.attempt, .wait_till = sys.nowMs() + r.opts.fallback_wait_ms };
        r.journalFrame(&entry, a, args, send) catch |err| return r.failHost(key, switch (err) {
            error.Full => fb_wfull,
            error.NameTooLong => fb_name,
        });
        r.fb_inflight.putAssumeCapacity(key, entry);
        r.fb_waitq.appendAssumeCapacity(key);
        r.fbWaits(a.module);
    }

    /// Writes a frame that waits into the journal. The copy is the frame that
    /// goes out later, so a frame without room has no copy and fails.
    fn journalFrame(r: *Runner, e: *FbEntry, a: core.Action, args: []const u8, send: bool) error{ Full, NameTooLong }!void {
        const cap = r.fb_journal[0].len;
        if (r.fb_jlen == cap) r.compactJournal();
        var w = std.ArrayList(u8).initBuffer(r.fb_journal[r.fb_jcur][r.fb_jlen..]);
        r.writeFrame(&w, a, args, send) catch |err| return switch (err) {
            error.OutOfMemory => error.Full,
            error.NameTooLong => error.NameTooLong,
        };
        e.joff = @intCast(r.fb_jlen);
        e.jlen = @intCast(w.items.len);
        r.fb_jlen += w.items.len;
        std.debug.assert(r.fb_jlen <= cap);
    }

    /// Sends the steps that wait, as far as places and connections are free.
    /// The workflows take turns: each pass over the queue gives each
    /// workflow an equal part of the free places, in arrival order. With
    /// fewer places than workflows, the workflows that sent a step longest
    /// ago go first. A workflow at its share is passed over, so it delays no
    /// other workflow. The passes and the queue length bound the work.
    fn sendWaiting(r: *Runner) void {
        if (!r.fb_wait_dirty or r.fb_waitq.items.len == 0) return;
        var round: u32 = 0;
        while (round < fb_wait_rounds) : (round += 1) {
            const room = r.hostCapTotal() -| r.fb_admitted;
            if (room == 0) return;
            const turn = r.waitTurn(room);
            switch (r.sendWaitingPass(@max(1, room / @max(1, r.fb_wf_waiters)), turn)) {
                .sent => {},
                // No connection takes steps: try again in the next loop.
                .stopped => return,
                .idle => {
                    r.fb_wait_dirty = false;
                    return;
                },
            }
        }
    }

    const WaitPass = enum { sent, stopped, idle };

    /// The largest `fb_wf_last` of a workflow whose turn it is, for `room`
    /// free places. With a place for each workflow that waits, each has its
    /// turn. Else the `room` workflows with the smallest numbers have it.
    fn waitTurn(r: *Runner, room: u32) u64 {
        std.debug.assert(room >= 1);
        if (room >= r.fb_wf_waiters) return std.math.maxInt(u64);
        r.fb_turn +%= 1;
        var n: usize = 0;
        for (r.fb_waitq.items) |key| {
            const e = r.fb_inflight.getPtr(key) orelse continue;
            const m = e.module;
            if (r.fb_wf_turn[m] == r.fb_turn) continue;
            r.fb_wf_turn[m] = r.fb_turn;
            if (!r.hostHasPlace(m)) continue;
            r.fb_wf_order[n] = r.fb_wf_last[m];
            n += 1;
        }
        std.debug.assert(n <= r.fb_wf_order.len);
        if (n <= room) return std.math.maxInt(u64);
        std.mem.sort(u64, r.fb_wf_order[0..n], {}, std.sort.asc(u64));
        return r.fb_wf_order[room - 1];
    }

    /// One pass over the wait queue. Each workflow whose turn it is
    /// (`fb_wf_last` at most `turn`) sends at most `quota` steps. The steps
    /// that stay keep their order.
    fn sendWaitingPass(r: *Runner, quota: u32, turn: u64) WaitPass {
        std.debug.assert(quota >= 1);
        r.fb_turn +%= 1;
        const now = sys.nowMs();
        var out: usize = 0;
        var sent: u32 = 0;
        var stopped = false;
        for (r.fb_waitq.items) |key| {
            const e = r.fb_inflight.getPtr(key) orelse continue;
            std.debug.assert(e.conn == fb_waiting and e.jlen > 0);
            const m = e.module;
            if (r.fb_wf_turn[m] != r.fb_turn) {
                r.fb_wf_turn[m] = r.fb_turn;
                r.fb_wf_sent[m] = 0;
                // The first look decides: a step that goes out changes the number.
                r.fb_wf_order[m] = r.fb_wf_last[m];
            }
            const goes = !stopped and r.fb_wf_sent[m] < quota and r.fb_wf_order[m] <= turn and r.hostHasPlace(m);
            const conn: ?u8 = if (goes) r.pickConn(now) else null;
            if (conn) |ci| {
                const ok = r.sendWaitingStep(key, e, ci);
                sent += @intFromBool(ok);
                r.fb_wf_sent[m] += @intFromBool(ok);
                continue;
            }
            // The step had its turn and a place, but no connection takes steps.
            stopped = stopped or goes;
            r.fb_waitq.items[out] = key;
            out += 1;
        }
        r.fb_waitq.shrinkRetainingCapacity(out);
        std.debug.assert(r.fb_waitq.items.len >= r.fb_waiting_n);
        if (stopped) return .stopped;
        return if (sent > 0) .sent else .idle;
    }

    /// Puts the frame of a step that waited on connection `ci`. False when
    /// the write buffer has no room: the step fails.
    fn sendWaitingStep(r: *Runner, key: FbKey, e: *FbEntry, ci: u8) bool {
        const c = &r.fb_conns[ci];
        const frame = r.fb_journal[r.fb_jcur][e.joff..][0..e.jlen];
        const start = c.wbuf.items.len;
        c.wbuf.appendSliceBounded(frame) catch {
            c.wbuf.shrinkRetainingCapacity(start);
            r.fbRemove(key);
            r.failHost(key, fb_wfull);
            return false;
        };
        r.fbLeave(e);
        e.conn = ci;
        e.wait_till = 0;
        r.fbAdmit(e.module);
        c.inflight += 1;
        r.flushConnFallback(ci);
        return true;
    }

    /// Fails the steps that waited longer than `--fallback-wait-ms`. The wait
    /// is the same for each, so arrival order is deadline order: the scan
    /// stops at the first step that still has time.
    fn expireWaiting(r: *Runner, now: i64) void {
        var done: usize = 0;
        while (done < r.fb_waitq.items.len) : (done += 1) {
            const key = r.fb_waitq.items[done];
            const e = r.fb_inflight.getPtr(key) orelse continue;
            std.debug.assert(e.conn == fb_waiting);
            if (e.wait_till > now) break;
            // A full failure queue keeps its steps for the next loop.
            if (r.fb_failq.items.len == r.fb_failq.capacity) break;
            r.fbRemove(key);
            gauge(&r.stats.host_refused, 1);
            // With a connection, the step waited for a place, not for the host.
            r.fb_failq.appendAssumeCapacity(.{ .key = key, .msg = if (r.anyConnOpen()) fb_busy else fb_down });
        }
        if (done == 0) return;
        std.mem.copyForwards(FbKey, r.fb_waitq.items[0 .. r.fb_waitq.items.len - done], r.fb_waitq.items[done..]);
        r.fb_waitq.shrinkRetainingCapacity(r.fb_waitq.items.len - done);
    }

    /// The frame into a write buffer, which has a size set at startup.
    fn writeFrame(r: *Runner, w: *std.ArrayList(u8), a: core.Action, args: []const u8, send: bool) error{ OutOfMemory, NameTooLong }!void {
        const m = r.sh.st.moduleAt(a.module);
        const start = w.items.len;
        try w.appendSliceBounded(&.{ 0, 0, 0, 0 });
        try w.printBounded("{{\"id\":\"{d}:{d}{s}\",\"kind\":\"{s}\",\"step\":", .{ a.exec_id, a.seq, if (send) ":send" else "", if (a.effect_kind == .code) "code" else "node" });
        var tmp: [4096]u8 = undefined;
        var ar = Arena.init(&tmp);
        var b = ar.builder();
        core_lib.json.writeString(&b, m.str(m.steps[a.step].name)) catch return error.NameTooLong;
        try w.appendSliceBounded(b.bytes());
        // The host keeps the steps of a workflow that block it apart, by workflow and step name.
        const lm = &r.sh.st.modules[a.module];
        if (lm.wf_id_len > 0) {
            try w.appendSliceBounded(",\"workflowId\":");
            try appendJsonStringBounded(w, lm.workflowId());
        }
        try w.printBounded(",\"key\":\"{s}\",\"args\":", .{&a.key});
        try w.appendSliceBounded(args);
        try r.appendFrameCredential(w, a.module, args);
        if (send) try r.appendExecution(w, a);
        // Every step of a test bed run reads its own start clock in the host (CLOCK-OFFSET);
        // `execution` above carries it only for a send frame.
        const clock = r.sh.st.clockOffsetOf(a.exec_id);
        if (clock != 0) {
            var cb: [40]u8 = undefined;
            try w.appendSliceBounded(std.fmt.bufPrint(&cb, ",\"clockOffsetMs\":{d}", .{clock}) catch unreachable);
        }
        try w.appendBounded('}');
        const len: u32 = @intCast(w.items.len - start - 4);
        std.mem.writeInt(u32, w.items[start..][0..4], len, .little);
    }

    /// Fails one host step without the event queue: `serviceFallback` hands
    /// the failure to the core when the queue has room, so none is lost.
    fn failHost(r: *Runner, key: FbKey, msg: []const u8) void {
        if (r.fb_failq.items.len == r.fb_failq.capacity) {
            // Only when the core has not taken failures for many batches.
            std.debug.print("shard {d}: host failure queue full, step {d}/{d} keeps waiting\n", .{ r.id, key.exec_id, key.seq });
            return;
        }
        r.fb_failq.appendAssumeCapacity(.{ .key = key, .msg = msg });
    }

    /// The frame carries the credentials the step names (spec 9.1), so n8n
    /// writes no credentials file: `credential` is the `{type, data}` of
    /// `args.credential`, and `credentials` maps each slot of
    /// `args.credential`, `args.subNodes[].credential` and
    /// `args.subNodes[].slots[]` to its
    /// `{type, data}`. The workflow's document comes first, then the global.
    fn appendFrameCredential(r: *Runner, w: *std.ArrayList(u8), module: u16, args: []const u8) error{OutOfMemory}!void {
        const store = r.credsFor(module) orelse return;
        var names: [64][]const u8 = undefined;
        var n: usize = 0;
        const main = if (http.member(args, "credential")) |raw| http.plainString(std.mem.trim(u8, raw, " ")) else null;
        if (main) |m| {
            names[0] = m;
            n = 1;
        }
        if (http.member(args, "subNodes")) |raw| if (http.Elements.init(raw)) |els_init| {
            var els = els_init;
            while (els.next()) |el| {
                // `credential` of the sub-node, then `slots[]`: the slots of
                // a workflow embedded in a tool sub-node.
                if (http.member(el, "credential")) |c| addSlotName(&names, &n, c);
                const slots = http.member(el, "slots") orelse continue;
                var it = http.Elements.init(slots) orelse continue;
                while (it.next()) |sl| addSlotName(&names, &n, sl);
            }
        };
        if (main) |m| if (store.rawSlot(m)) |v| {
            try w.appendSliceBounded(",\"credential\":");
            try appendSlotJson(w, v);
        };
        var first = true;
        for (names[0..n]) |name| {
            const v = store.rawSlot(name) orelse continue;
            try w.appendSliceBounded(if (first) ",\"credentials\":{" else ",");
            first = false;
            try appendJsonStringBounded(w, name);
            try w.appendBounded(':');
            try appendSlotJson(w, v);
        }
        if (!first) try w.appendBounded('}');
    }

    /// `,"execution":{id, mode, resumeUrl, resumeFormUrl}`, as ctx.execution()
    /// gives it. A manual run has an id from n8n, so the id tells the mode.
    fn appendExecution(r: *Runner, w: *std.ArrayList(u8), a: core.Action) error{OutOfMemory}!void {
        const lm = &r.sh.st.modules[a.module];
        var idb: [32]u8 = undefined;
        const id = core.formatExecId(a.exec_id, &idb);
        const base = if (lm.resume_len > 0) lm.resume_base[0..lm.resume_len] else "/resume";
        const form = if (lm.form_len > 0) lm.form_base[0..lm.form_len] else "/resume";
        try w.appendSliceBounded(",\"execution\":{\"id\":");
        try appendJsonStringBounded(w, id);
        // A test bed run reads its own start clock in the host too (CLOCK-OFFSET).
        const clock = r.sh.st.clockOffsetOf(a.exec_id);
        if (clock != 0) {
            var cb: [32]u8 = undefined;
            try w.appendSliceBounded(std.fmt.bufPrint(&cb, ",\"clockOffsetMs\":{d}", .{clock}) catch unreachable);
        }
        try w.appendSliceBounded(if (a.exec_id & core.given_id_flag != 0) ",\"mode\":\"test\",\"resumeUrl\":" else ",\"mode\":\"production\",\"resumeUrl\":");
        var ub: [core.max_base + 96]u8 = undefined;
        var sb: [32]u8 = undefined;
        const sig = core.resumeSignature(&r.sh.st, a.exec_id, &sb);
        const q = if (sig != null) "?signature=" else "";
        try appendJsonStringBounded(w, std.fmt.bufPrint(&ub, "{s}/{s}{s}{s}", .{ base, id, q, sig orelse "" }) catch unreachable);
        try w.appendSliceBounded(",\"resumeFormUrl\":");
        try appendJsonStringBounded(w, std.fmt.bufPrint(&ub, "{s}/{s}{s}{s}", .{ form, id, q, sig orelse "" }) catch unreachable);
        // The host writes binary data under workflows/<workflowId>/executions/<id>, as n8n does.
        if (lm.wf_id_len > 0) {
            try w.appendSliceBounded(",\"workflowId\":");
            try appendJsonStringBounded(w, lm.workflowId());
        }
        try w.appendBounded('}');
    }

    fn addSlotName(names: *[64][]const u8, n: *usize, raw: []const u8) void {
        const name = http.plainString(std.mem.trim(u8, raw, " ")) orelse return;
        for (names[0..n.*]) |x| if (std.mem.eql(u8, x, name)) return;
        if (n.* == names.len) return;
        names[n.*] = name;
        n.* += 1;
    }

    /// `{"type":…,"data":…}` of one credentials entry, copied as raw JSON
    /// from the document (no allocation, no re-serialization).
    fn appendSlotJson(w: *std.ArrayList(u8), v: creds.RawSlot) error{OutOfMemory}!void {
        try w.appendSliceBounded("{\"type\":");
        try w.appendSliceBounded(v.type_json);
        try w.appendSliceBounded(",\"data\":");
        try w.appendSliceBounded(v.data_json);
        try w.appendBounded('}');
    }

    fn flushFallback(r: *Runner) void {
        for (0..r.fb_conns.len) |i| r.flushConnFallback(@intCast(i));
    }

    /// Writes what the connection has queued. While the hello waits for its
    /// answer, only the hello goes out: a v2 host hands the connection to a
    /// worker after it, and the worker must read the first step.
    fn flushConnFallback(r: *Runner, ci: u8) void {
        const c = &r.fb_conns[ci];
        if (c.fd < 0) return;
        // Each write takes some bytes, so the buffer bounds the loop.
        while (c.wbuf.items.len > 0) {
            const limit = if (c.state == .hello) c.hello_left else c.wbuf.items.len;
            if (limit == 0) return;
            switch (sys.writeSome(c.fd, c.wbuf.items[0..limit])) {
                .n => |k| {
                    std.mem.copyForwards(u8, c.wbuf.items[0 .. c.wbuf.items.len - k], c.wbuf.items[k..]);
                    c.wbuf.shrinkRetainingCapacity(c.wbuf.items.len - k);
                    if (c.state == .hello) c.hello_left -= k;
                    c.stall_since = 0;
                },
                .again => {
                    if (c.stall_since == 0) c.stall_since = sys.nowMs();
                    r.poller.wantWrite(c.fd, token(.fallback, c.gen, ci)) catch {};
                    return;
                },
                .closed => return r.lostFallback(ci),
            }
        }
    }

    /// Closes a connection. Its buffers are cleared and it connects again
    /// after `delay_ms`. The caller handles the steps in flight on it.
    fn closeFbConn(r: *Runner, ci: u8, delay_ms: i64) void {
        const c = &r.fb_conns[ci];
        if (c.fd >= 0) {
            r.poller.remove(c.fd);
            sys.close(c.fd);
        }
        c.fd = -1;
        c.state = .closed;
        c.rlen = 0;
        c.wbuf.clearRetainingCapacity();
        c.hello_left = 0;
        c.inflight = 0;
        c.alone = false;
        c.reserved = false;
        c.stall_since = 0;
        c.next_connect_ms = sys.nowMs() + delay_ms;
    }

    /// A connection went away (the host or its worker stopped) or stopped
    /// reading. With a v1 host, every step on it fails with a retryable
    /// error: the core then applies the step's retry setting or
    /// `needs_attention`. With a v2 host, the connection belonged to one
    /// worker. When the host reported the stop of that worker
    /// (`worker_lost`), a step alone on it caused the stop and fails, not
    /// retryable. A step alone on a connection that closed without it (the
    /// host or its server process stopped) fails as retryable. Several steps
    /// each go again, alone on an idle connection, so the one that stops its
    /// worker again is found and the others get their real result. After
    /// `worker_lost` with `again` (the host stopped a worker that a step
    /// blocked, and runs that step in its slow lane the next time), each step
    /// goes again once as a new step on any connection (`fb_waitq`); a step
    /// that was lost before follows the rules above.
    fn lostFallback(r: *Runner, ci: u8) void {
        const v2 = r.fb_version == 2;
        const c = &r.fb_conns[ci];
        r.closeFbConn(ci, if (v2) 0 else fb_reconnect_ms);
        r.dropHostServiceCalls(ci);
        if (v2 and c.lost_seen and c.lost_again) r.sendAgain(ci);
        var on_conn: u32 = 0;
        var alone_before = false;
        var it0 = r.fb_inflight.valueIterator();
        while (it0.next()) |e| if (e.conn == ci) {
            on_conn += 1;
            alone_before = alone_before or e.alone;
        };
        const sole = on_conn == 1 or alone_before;
        // Blame only a step that the host says stopped its worker.
        const blame = v2 and sole and c.lost_seen;
        r.fb_scratch.clearRetainingCapacity();
        var it = r.fb_inflight.iterator();
        while (it.next()) |kv| {
            const e = kv.value_ptr;
            if (e.conn != ci) continue;
            if (v2 and !sole and e.jlen > 0 and r.fb_aloneq.items.len < r.fb_aloneq.capacity) {
                e.conn = fb_queued;
                e.alone = true;
                r.fb_aloneq.appendAssumeCapacity(kv.key_ptr.*);
                continue;
            }
            // sendFrame keeps in-flight plus queued failures under the capacity.
            std.debug.assert(r.fb_failq.items.len < r.fb_failq.capacity);
            // The host's reason, when it sent one (`worker_lost`).
            const lost: u8 = if (blame and c.lost_ready) ci else no_lost;
            if (lost != no_lost) c.lost_refs += 1;
            r.fb_failq.appendAssumeCapacity(.{ .key = kv.key_ptr.*, .msg = if (blame) fb_stopped else fb_lost, .lost = lost });
            r.fb_scratch.appendAssumeCapacity(kv.key_ptr.*);
        }
        c.lost_ready = false;
        c.lost_seen = false;
        c.lost_again = false;
        for (r.fb_scratch.items) |k| r.fbRemove(k);
        r.fb_scratch.clearRetainingCapacity();
        std.debug.assert(r.fb_conns[ci].fd < 0 and r.fb_conns[ci].inflight == 0);
        std.debug.print("a fallback host connection closed; {d} step(s) were on it\n", .{on_conn});
    }

    /// The steps of connection `ci` that can go again as new steps wait for a
    /// connection (`fb_waitq`). All of them or none: the queue has a fixed
    /// size, and a step that finds no room follows the rules of `lostFallback`.
    fn sendAgain(r: *Runner, ci: u8) void {
        std.debug.assert(r.fb_waitq.items.len <= r.fb_waitq.capacity);
        // Without a wait, a step cannot wait for a connection (`waitFrame`).
        if (r.opts.fallback_wait_ms <= 0) return;
        var fresh: usize = 0;
        var it0 = r.fb_inflight.valueIterator();
        while (it0.next()) |e| {
            if (e.conn == ci and e.canGoAgain()) fresh += 1;
        }
        if (fresh == 0 or fresh > r.fb_waitq.capacity - r.fb_waitq.items.len) return;
        // The same wait for each step, so arrival order stays deadline order (`expireWaiting`).
        const wait_till = sys.nowMs() + r.opts.fallback_wait_ms;
        var it = r.fb_inflight.iterator();
        while (it.next()) |kv| {
            const e = kv.value_ptr;
            if (e.conn != ci or !e.canGoAgain()) continue;
            r.fbLeave(e);
            e.conn = fb_waiting;
            e.again = true;
            e.wait_till = wait_till;
            // The step runs again: its calls get the same ids.
            e.calls = 0;
            r.fb_waitq.appendAssumeCapacity(kv.key_ptr.*);
            r.fbWaits(e.module);
        }
        std.debug.assert(r.fb_waitq.items.len <= r.fb_waitq.capacity);
    }

    /// Opens the connections that are missing, up to `fb_target`, each
    /// with its hello. When no connection is open and the host does not
    /// answer, the steps that wait to go again alone fail as retryable.
    fn connectFallback(r: *Runner, now: i64) void {
        const path = r.opts.fallback orelse return;
        var failed = false;
        for (r.fb_conns[0..r.fb_target], 0..) |*c, i| {
            if (c.fd >= 0 or now < c.next_connect_ms) continue;
            // A new connection starts with nothing in flight and nothing queued to write.
            std.debug.assert(c.inflight == 0 and c.wbuf.items.len == 0);
            c.next_connect_ms = now + fb_reconnect_ms;
            const fd = sys.connectUnix(path) catch {
                failed = true;
                continue;
            };
            c.gen +%= 1;
            r.poller.addRead(fd, token(.fallback, c.gen, @intCast(i))) catch {
                sys.close(fd);
                continue;
            };
            c.fd = fd;
            c.state = .hello;
            c.hello_since = now;
            c.wbuf.appendSliceAssumeCapacity(fbf.hello_frame);
            c.hello_left = fbf.hello_frame.len;
            r.flushConnFallback(@intCast(i));
            if (i == 0) std.debug.print("connected to the fallback host\n", .{});
        }
        if (failed and !r.anyConnOpen()) r.failAloneQueue();
    }

    fn anyConnOpen(r: *const Runner) bool {
        for (r.fb_conns) |c| if (c.fd >= 0) return true;
        return false;
    }

    /// The host is gone: the steps that wait to go again fail as retryable.
    fn failAloneQueue(r: *Runner) void {
        for (r.fb_aloneq.items) |k| {
            r.fbRemove(k);
            std.debug.assert(r.fb_failq.items.len < r.fb_failq.capacity);
            r.fb_failq.appendAssumeCapacity(.{ .key = k, .msg = fb_lost });
        }
        r.fb_aloneq.clearRetainingCapacity();
    }

    /// Sends the queued steps again, each alone on a connection that has
    /// nothing in flight. The frame is the copy from the journal.
    fn sendAlone(r: *Runner) void {
        if (r.fb_aloneq.items.len == 0) {
            // Nothing waits: a reserved connection takes steps again.
            for (r.fb_conns) |*c| c.reserved = false;
            return;
        }
        var ci: u8 = 0;
        var idle = false;
        while (ci < r.fb_target and r.fb_aloneq.items.len > 0) : (ci += 1) {
            const c = &r.fb_conns[ci];
            if (c.state != .ready or c.inflight > 0 or c.alone) continue;
            idle = true;
            c.reserved = false;
            const key = r.fb_aloneq.orderedRemove(0);
            const e = r.fb_inflight.getPtr(key) orelse continue;
            std.debug.assert(e.conn == fb_queued and e.jlen > 0);
            const frame = r.fb_journal[r.fb_jcur][e.joff..][0..e.jlen];
            c.wbuf.appendSliceBounded(frame) catch {
                r.fbRemove(key);
                r.failHost(key, fb_wfull);
                continue;
            };
            e.conn = ci;
            // The step runs again: its calls get the same ids, so the backend
            // answers a call that it ran already from its record.
            e.calls = 0;
            c.alone = true;
            c.inflight = 1;
            r.flushConnFallback(ci);
        }
        // Under steady load no connection may become idle: reserve the
        // ready one with the fewest steps, so it drains (one at a time).
        if (idle or r.fb_aloneq.items.len == 0) return;
        var best: ?u8 = null;
        for (r.fb_conns[0..r.fb_target], 0..) |*c, i| {
            if (c.reserved) return;
            if (c.state != .ready or c.alone) continue;
            if (best == null or c.inflight < r.fb_conns[best.?].inflight) best = @intCast(i);
        }
        if (best) |b| r.fb_conns[b].reserved = true;
    }

    /// Once per loop: connect again, detect a stalled host, send the steps
    /// that wait to go again, and hand the failures of a lost connection to
    /// the core as room allows.
    fn serviceFallback(r: *Runner, now: i64) void {
        if (r.fb_conns.len == 0) return;
        r.connectFallback(now);
        r.expireWaiting(now);
        for (r.fb_conns, 0..) |*c, i| {
            if (c.fd >= 0 and c.stall_since != 0 and now - c.stall_since > fb_stall_ms) r.lostFallback(@intCast(i));
            if (c.fd >= 0 and c.state == .hello and now - c.hello_since > fb_hello_ms) {
                std.debug.print("the fallback host did not answer the hello in {d} ms; connecting again\n", .{fb_hello_ms});
                r.lostFallback(@intCast(i));
            }
        }
        // Frames held back while the event queue was full.
        for (r.fb_conns, 0..) |c, i| if (c.fd >= 0 and c.rlen >= 4) r.takeFallbackFrames(@intCast(i));
        r.sendWaiting();
        r.sendAlone();
        // Bounded by the queue length; the rest waits for the next loop.
        while (r.fb_failq.items.len > 0 and r.events.items.len + r.resultReserve() < r.events.capacity) {
            const f = r.fb_failq.pop().?;
            r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = f.key.exec_id, .seq = f.key.seq, .payload = r.failMessage(f) });
        }
        std.debug.assert(r.fb_failq.items.len <= r.fb_failq.capacity);
    }

    /// The error of a host failure: the `worker_lost` message of its
    /// connection, copied into the batch memory, or the static text.
    fn failMessage(r: *Runner, f: FbFail) []const u8 {
        if (f.lost == no_lost) return f.msg;
        const c = &r.fb_conns[f.lost];
        std.debug.assert(c.lost_refs > 0 and c.stopped_len > 0);
        c.lost_refs -= 1;
        return r.batch.dupe(c.stopped_msg[0..c.stopped_len]) catch f.msg;
    }

    /// Read what the host sent, then take the frames that the event queue
    /// has room for. The rest stays in the read buffer (back-pressure) and
    /// `serviceFallback` takes it after the next batch.
    fn readFallback(r: *Runner, ci: u8) void {
        const c = &r.fb_conns[ci];
        if (c.fd < 0) return;
        r.flushConnFallback(ci);
        // Each read fills part of the buffer, so its size bounds the loop.
        while (c.fd >= 0 and c.rlen < c.rbuf.len) {
            switch (sys.readSome(c.fd, c.rbuf[c.rlen..])) {
                .n => |k| c.rlen += k,
                .again => break,
                .closed => {
                    // The frames before the close count: results that the
                    // worker wrote before it stopped, and `worker_lost`.
                    r.takeFallbackFrames(ci);
                    if (c.fd >= 0) r.lostFallback(ci);
                    return;
                },
            }
        }
        r.takeFallbackFrames(ci);
    }

    fn takeFallbackFrames(r: *Runner, ci: u8) void {
        const c = &r.fb_conns[ci];
        var off: usize = 0;
        // Each pass takes one whole frame, so the buffer bounds the loop.
        while (c.fd >= 0 and c.rlen - off >= 4) {
            const len = std.mem.readInt(u32, c.rbuf[off..][0..4], .little);
            if (len > c.rbuf.len - 4) {
                // It can never fit: the stream cannot go on.
                std.debug.print("shard {d}: a fallback host frame of {d} bytes is larger than the read buffer\n", .{ r.id, len });
                return r.lostFallback(ci);
            }
            if (c.rlen - off - 4 < len) break;
            if (r.events.items.len + r.resultReserve() >= r.events.capacity) break;
            r.onFallbackFrame(ci, c.rbuf[off + 4 ..][0..len]);
            off += 4 + len;
        }
        // The frame handler can close the connection (goaway), which empties its buffer.
        if (c.fd < 0) return;
        std.mem.copyForwards(u8, c.rbuf[0 .. c.rlen - off], c.rbuf[off..c.rlen]);
        c.rlen -= off;
        std.debug.assert(c.rlen <= c.rbuf.len);
    }

    /// A control frame: the answer to the hello, or `goaway`. Step results
    /// start with `{"id"`, so other frames do not pay for this scan.
    fn onControlFrame(r: *Runner, ci: u8, frame: []const u8) void {
        const c = &r.fb_conns[ci];
        switch (fbf.parse(frame)) {
            .hello => |h| {
                if (c.state != .hello) return;
                c.state = .ready;
                c.hello_left = 0;
                if (r.fb_version != 2) std.debug.print("the fallback host speaks version 2: {d} worker(s)\n", .{h.workers});
                r.fb_version = 2;
                r.fb_target = fbf.connectionsFor(h.workers);
                r.fb_wait_dirty = true;
                // The connection takes steps now, so the steps that wait go first.
                r.sendWaiting();
                r.flushConnFallback(ci);
            },
            .goaway => {
                if (c.state == .ready or c.state == .hello) c.state = .draining;
                if (c.inflight == 0) r.closeFbConn(ci, 0);
            },
            .service => |id| r.hostService(ci, id, frame),
            .worker_lost => |reason| {
                c.lost_seen = true;
                c.lost_again = fbf.lostAgain(frame);
                // The message waits in the connection until its failure is
                // in the event queue; a message still in use stays.
                if (reason.len > 0 and c.lost_refs == 0) {
                    const msg = fbf.stoppedMessage(&c.stopped_msg, reason);
                    c.stopped_len = @intCast(msg.len);
                    c.lost_ready = true;
                }
                // The server process closes the connection next.
                r.lostFallback(ci);
            },
            .none => {},
        }
    }

    fn onFallbackFrame(r: *Runner, ci: u8, frame: []const u8) void {
        std.debug.assert(r.events.items.len < r.events.capacity);
        const c = &r.fb_conns[ci];
        if (!std.mem.startsWith(u8, frame, "{\"id\"")) return r.onControlFrame(ci, frame);
        if (c.state == .hello) {
            // A v1 host answers the hello with an error frame: one connection, as before.
            c.state = .ready;
            c.hello_left = 0;
            r.fb_version = 1;
            r.fb_target = 1;
            // The connection takes steps now, so the steps that wait go first.
            r.sendWaiting();
            r.flushConnFallback(ci);
        }
        const id_raw = http.member(frame, "id") orelse return;
        const id = http.plainString(id_raw) orelse return;
        const colon = std.mem.indexOfScalar(u8, id, ':') orelse return;
        const exec_id = std.fmt.parseInt(u64, id[0..colon], 10) catch return;
        const rest = id[colon + 1 ..];
        const send = std.mem.endsWith(u8, rest, ":send");
        const seq = std.fmt.parseInt(u32, if (send) rest[0 .. rest.len - 5] else rest, 10) catch return;
        // A frame for a step that is not in flight on this connection (late,
        // after a reconnect) changes nothing.
        const key: FbKey = .{ .exec_id = exec_id, .seq = seq, .send = send };
        const entry = r.fb_inflight.get(key) orelse return;
        if (entry.conn != ci) return;
        r.fbRemove(key);
        std.debug.assert(c.inflight > 0);
        c.inflight -= 1;
        if (entry.alone) c.alone = false;
        if (c.inflight == 0 and r.fb_inflight.count() == 0) r.fb_jlen = 0;
        // A draining connection closes after its last step; `frame` points into
        // its read buffer, so that waits until the result is copied.
        defer if (c.state == .draining and c.inflight == 0) r.closeFbConn(ci, 0);
        const ok = if (http.member(frame, "ok")) |v| std.mem.eql(u8, v, "true") else false;
        // The message went out: the approval keeps waiting for its resume.
        if (send and ok) return;
        const payload_src = if (ok) http.member(frame, "result") orelse "null" else blk: {
            const er = http.member(frame, "error") orelse "\"fallback host error\"";
            break :blk http.plainString(er) orelse er;
        };
        // A step that changed the workflow static data sends the document
        // as `staticData`; it follows the result, and `aux` is the result
        // length plus one (spec 9.7).
        const statics: ?[]const u8 = if (ok) if (http.member(frame, "staticData")) |raw| blk: {
            const t = std.mem.trim(u8, raw, " \t\r\n");
            break :blk if (t.len >= 2 and t[0] == '{') t else null;
        } else null else null;
        // A result larger than the batch memory fails its step; it is not lost.
        const p = (if (statics) |sd| r.batch.concat(payload_src, sd) else r.batch.dupe(payload_src)) catch {
            r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = exec_id, .seq = seq, .payload = fb_big });
            return;
        };
        const aux: u32 = if (statics != null) @intCast(payload_src.len + 1) else 0;
        r.events.appendAssumeCapacity(.{ .kind = if (ok) .effect_ok else .effect_err, .exec_id = exec_id, .seq = seq, .aux = aux, .payload = p });
    }

    // ---- service calls (spec 9.9) ------------------------------------------------

    const svc_no_admin = "service: calls need the admin API (--admin-port) (limit)";
    const svc_full = "service: too many calls wait for an answer (--max-service-calls); the step can run again (retryable)";
    const svc_big = "service: the call is larger than --service-call-kb (limit)";
    const svc_timeout = "service: the call timed out (--service-timeout-ms)";

    /// Keep the call and send its event; the admin client answers it.
    /// `{ service: "binaryData", op: "metadata", args: { id } }`: the
    /// `getBinaryMetadata` of n8n for a file of the file system store. The
    /// shard reads the companion file itself (`blob_store.readMetadata`): no
    /// call goes to n8n. True when the call was this one, and it has a
    /// result or will get one from the store.
    fn startBinaryMetadata(r: *Runner, a: core.Action) bool {
        const blobs = r.blobs orelse return false;
        if (!isJson(http.member(a.payload, "service"), "\"binaryData\"") or !isJson(http.member(a.payload, "op"), "\"metadata\"")) return false;
        const args = http.member(a.payload, "args") orelse "{}";
        const id = (if (http.member(args, "id")) |raw| http.plainString(raw) else null) orelse {
            r.effectError(a.exec_id, a.seq, "service: binaryData.metadata needs args.id, the id of a stored file");
            return true;
        };
        blobs.readMetadata(id, a.exec_id, a.seq, sys.nowMs()) catch |e| r.effectError(a.exec_id, a.seq, switch (e) {
            error.Full => "service: too many transfers of the binary data store are in flight (--binary-max-transfers); the step can run again (limit)",
            error.BadId => "service: binaryData.metadata: the id is not an id of the file system store of n8n",
        });
        return true;
    }

    fn startService(r: *Runner, a: core.Action) void {
        if (r.startBinaryMetadata(a)) return;
        const t = if (r.svc) |*t| t else return r.effectError(a.exec_id, a.seq, svc_no_admin);
        const m = r.sh.st.moduleAt(a.module);
        const workflow = r.sh.st.modules[a.module].workflowId();
        const deadline = sys.nowMs() + r.opts.service_timeout_ms;
        const i = t.add(a.exec_id, a.seq, a.attempt, workflow, m.str(m.steps[a.step].name), a.payload, deadline) catch |e| {
            return r.effectError(a.exec_id, a.seq, switch (e) {
                error.Full => svc_full,
                error.TooLarge => svc_big,
            });
        };
        r.publish(.{ .service = .{ .line = t.line(i) } });
    }

    /// `POST /_admin/services/<callId>`: the result or the error of a call.
    fn answerService(r: *Runner, idx: u32, text: []const u8, body: []const u8) void {
        const t = if (r.svc) |*t| t else return r.adminReply(idx, 404, "{\"error\":\"not found\"}");
        const id = admin.parseCallId(text) orelse return r.adminReply(idx, 400, "{\"error\":\"bad call id\"}");
        const i = t.findSub(id.exec_id, id.seq, id.sub) orelse return r.adminReply(idx, 404, "{\"error\":\"no service call waits with this id\"}");
        const answer = admin.parseAnswer(body) catch return r.adminReply(idx, 400, "{\"error\":\"the answer must be {ok:true,result} or {ok:false,error:{message}}\"}");
        if (id.sub > 0) {
            // A call of a host step: the answer goes back on its connection.
            const sent = switch (answer) {
                .ok => |raw| r.hostServiceResult(t.calls[i].conn, id.exec_id, id.seq, id.sub, true, raw),
                .err => |raw| r.hostServiceResult(t.calls[i].conn, id.exec_id, id.seq, id.sub, false, raw),
            };
            if (!sent) return r.adminReply(idx, 503, busy_body);
            t.remove(i);
            return r.adminReply(idx, 200, "{\"ok\":true}");
        }
        // The call of a credential renewal: the requests that wait go again.
        if (r.renewals) |*rt| if (rt.leaderAt(id.exec_id, id.seq)) |li| {
            renewalAnswered(rt, li, answer);
            t.remove(i);
            return r.adminReply(idx, 200, "{\"ok\":true}");
        };
        // `handleAdmin` checked that the event list has room.
        std.debug.assert(r.events.items.len < r.events.capacity);
        switch (answer) {
            .ok => |raw| {
                const p = r.batch.dupe(raw) catch return r.adminReply(idx, 503, busy_body);
                r.events.appendAssumeCapacity(.{ .kind = .effect_ok, .exec_id = id.exec_id, .seq = id.seq, .payload = p });
            },
            .err => |raw| {
                // The decoded message is never longer than its JSON text.
                const buf = r.batch.push(u8, raw.len) catch return r.adminReply(idx, 503, busy_body);
                var out: creds.Out = .{ .buf = buf };
                http.unescape(raw, &out) catch return r.adminReply(idx, 400, "{\"error\":\"the error message is not a valid string\"}");
                r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = id.exec_id, .seq = id.seq, .payload = out.written() });
            },
        }
        t.remove(i);
        r.adminReply(idx, 200, "{\"ok\":true}");
    }

    /// Calls past their deadline fail, as room in the event list allows.
    fn expireServiceCalls(r: *Runner, now: i64) void {
        const t = if (r.svc) |*t| t else return;
        var guard: usize = 0;
        while (guard < t.calls.len and r.events.items.len + r.resultReserve() < r.events.capacity) : (guard += 1) {
            const i = t.expired(now) orelse return;
            const call = t.calls[i];
            if (call.sub > 0) {
                // The host step gets the error; it decides what the step does.
                _ = r.hostServiceResult(call.conn, call.exec_id, call.seq, call.sub, false, "\"" ++ svc_timeout ++ "\"");
            } else if (r.renewalLeader(call.exec_id, call.seq)) |li| {
                if (r.renewals) |*rt| rt.answered(li, false, svc_timeout);
            } else {
                r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = call.exec_id, .seq = call.seq, .payload = svc_timeout });
            }
            t.remove(i);
        }
    }

    /// A service call of a running host step (`fallback_frames.zig`): keep it
    /// in the service table and send its event. A call that cannot be kept
    /// gets its error back at once, so the step does not wait.
    fn hostService(r: *Runner, ci: u8, frame_id: []const u8, frame: []const u8) void {
        const colon = std.mem.indexOfScalar(u8, frame_id, ':') orelse return;
        const exec_id = std.fmt.parseInt(u64, frame_id[0..colon], 10) catch return;
        const seq = std.fmt.parseInt(u32, frame_id[colon + 1 ..], 10) catch return;
        const e = r.fb_inflight.getPtr(.{ .exec_id = exec_id, .seq = seq, .send = false }) orelse return;
        // A late frame of a run that the shell sent again elsewhere changes nothing.
        if (e.conn != ci) return;
        e.calls += 1;
        const sub = e.calls;
        const t = if (r.svc) |*t| t else {
            _ = r.hostServiceResult(ci, exec_id, seq, sub, false, "\"" ++ svc_no_admin ++ "\"");
            return;
        };
        const m = r.sh.st.moduleAt(e.module);
        const workflow = r.sh.st.modules[e.module].workflowId();
        const deadline = sys.nowMs() + r.opts.service_timeout_ms;
        const i = t.addSub(exec_id, seq, sub, ci, e.attempt, workflow, m.str(m.steps[e.step].name), frame, deadline) catch |err| {
            const msg = switch (err) {
                error.Full => "\"" ++ svc_full ++ "\"",
                error.TooLarge => "\"" ++ svc_big ++ "\"",
            };
            _ = r.hostServiceResult(ci, exec_id, seq, sub, false, msg);
            return;
        };
        r.publish(.{ .service = .{ .line = t.line(i) } });
    }

    /// `{"type":"serviceResult",...}` to the host connection `ci`. `raw` is
    /// the JSON of the result, or the JSON string of the error message.
    /// False when the frame does not fit the write buffer; true when the
    /// connection is gone (nobody waits for the answer).
    fn hostServiceResult(r: *Runner, ci: u8, exec_id: u64, seq: u32, sub: u32, ok: bool, raw: []const u8) bool {
        if (ci >= r.fb_conns.len) return true;
        const c = &r.fb_conns[ci];
        if (c.fd < 0) return true;
        const w = &c.wbuf;
        const start = w.items.len;
        fbf.appendServiceResult(w, exec_id, seq, sub, ok, raw) catch {
            w.shrinkRetainingCapacity(start);
            return false;
        };
        r.flushConnFallback(ci);
        return true;
    }

    /// A host connection closed: its calls need no answer. A step that goes
    /// again makes them again.
    fn dropHostServiceCalls(r: *Runner, ci: u8) void {
        const t = if (r.svc) |*t| t else return;
        if (t.count == 0) return;
        for (t.calls, 0..) |c, i| {
            if (c.used and c.sub > 0 and c.conn == ci) t.remove(i);
        }
    }

    /// An execution ended: its calls need no answer.
    fn dropServiceCalls(r: *Runner, exec_id: u64) void {
        const t = if (r.svc) |*t| t else return;
        if (r.renewals) |*rt| rt.dropExec(exec_id);
        if (t.count == 0) return;
        for (t.calls, 0..) |c, i| {
            if (!c.used or c.exec_id != exec_id) continue;
            // A renewal that other executions wait for keeps its call.
            if (c.sub == 0 and r.renewalLeader(c.exec_id, c.seq) != null) continue;
            t.remove(i);
        }
    }

    /// The row of the effect when its service call is a credential renewal.
    fn renewalLeader(r: *const Runner, exec_id: u64, seq: u32) ?u32 {
        return if (r.renewals) |*t| t.leaderAt(exec_id, seq) else null;
    }

    /// Room that inbound requests and host frames leave in the event queue
    /// for HTTP results: one for each outbound request that can be in flight.
    fn resultReserve(r: *const Runner) usize {
        return r.opts.max_egress;
    }

    /// True when the retained durable events are at `--max-outbox-mb`.
    fn outboxFull(r: *const Runner) bool {
        const ob = if (r.ob) |*o| o else return false;
        return ob.full();
    }

    /// The seq up to which n8n handled the events of this shard.
    fn ackedSeq(r: *const Runner) u64 {
        const ob = if (r.ob) |*o| o else return r.acked_mem;
        return ob.ackedSeq();
    }

    /// `GET /_admin/outbox` (spec 9.2).
    fn outboxStatus(r: *const Runner, b: *core_lib.arena.Builder) error{ArenaFull}!void {
        const st: outbox.Status = if (r.ob) |*o| o.status() else .{
            .first = r.seq_mem + 1,
            .last = r.seq_mem,
            .acked = r.acked_mem,
            .bytes = 0,
            .max_bytes = 0,
        };
        var nb: [256]u8 = undefined;
        try b.append(std.fmt.bufPrint(&nb, "{{\"shards\":[{{\"shard\":{d},\"first\":{d},\"last\":{d},\"acked\":{d},\"bytes\":{d},\"maxBytes\":{d}}}]}}", .{ r.id, st.first, st.last, st.acked, st.bytes, st.max_bytes }) catch unreachable);
    }
};

// ---- tests ------------------------------------------------------------------------

test {
    _ = fbf;
}

/// The most connection slots a test shard gives out. `acceptAll` uses a
/// generation counter per slot, so a helper can tell a new connection from
/// an old one in the same slot.
const test_max_conns = 64;

const TestRunner = struct {
    arena: std.heap.ArenaAllocator,
    /// `--fallback`: a path where no host listens, so the tests connect the host by hand.
    fallback: ?[]const u8 = null,
    /// The modules to load into the shard (`--module`).
    modules: []const []const u8 = &.{},
    /// `--fallback-wait-ms`; null keeps the default.
    fallback_wait_ms: ?i64 = null,
    stats: Stats = .{},
    stop: std.atomic.Value(bool) = .init(false),
    r: *Runner = undefined,
    port: u16 = 0,

    /// A shard with small tables on a free port near a base that depends
    /// on the process.
    fn start(t: *TestRunner) !void {
        t.arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        var opts: Options = .{};
        opts.applyEmbedded();
        opts.max_conns = 8;
        opts.slots = 64;
        opts.max_egress = 16;
        opts.egress.max_conns = 16;
        opts.egress.h2_conns = 2;
        opts.egress_big_slots = 1;
        opts.egress_max_body = 1 << 16;
        opts.wbuf = 4096;
        opts.batch_bytes = 1 << 20;
        opts.max_request = 1 << 16;
        opts.request_big_slots = 1;
        opts.snap_bytes = 1 << 20;
        opts.module_bytes = 1 << 20;
        opts.max_modules = 4;
        opts.modules = t.modules;
        opts.fallback = t.fallback;
        if (t.fallback_wait_ms) |ms| opts.fallback_wait_ms = ms;
        var p: u16 = 36000 + @as(u16, @intCast(@mod(std.c.getpid(), 2000)));
        while (p < 39000) : (p += 1) {
            opts.port = p;
            t.r = Runner.init(t.arena.allocator(), 0, opts, &t.stats, &t.stop) catch |e| {
                if (e == error.Bind) continue;
                return e;
            };
            t.port = p;
            return;
        }
        return error.NoPort;
    }

    fn deinit(t: *TestRunner) void {
        t.r.deinit();
        t.arena.deinit();
    }

    /// Accept one client and send it `req`; the index of its connection.
    fn client(t: *TestRunner, req: []const u8) !struct { fd: c_int, idx: u32 } {
        // A non-blocking connect returns before the kernel puts the
        // connection in the accept queue, so the shard may accept it only
        // some polls later. Another connection that is already open must not
        // answer for it: remember the generations per slot, and wait for the
        // slot that changed.
        std.debug.assert(t.r.conns.len <= test_max_conns);
        var before: [test_max_conns]u32 = @splat(0);
        for (t.r.conns, 0..) |c, i| before[i] = c.gen;
        const fd = try sys.connectTcp(.{ 127, 0, 0, 1 }, t.port);
        var tries: u32 = 0;
        while (tries < 1000) : (tries += 1) {
            if (sys.writeSome(fd, req) == .n) break;
            napTest();
        }
        var idx: ?u32 = null;
        tries = 0;
        while (idx == null and tries < 1000) : (tries += 1) {
            t.r.acceptAll();
            for (t.r.conns, 0..) |c, i| if (c.fd >= 0 and c.gen != before[i]) {
                idx = @intCast(i);
            };
            if (idx == null) napTest();
        }
        const i = idx orelse {
            sys.close(fd);
            return error.NoNewConn;
        };
        napTest();
        try t.r.readConn(i);
        return .{ .fd = fd, .idx = i };
    }

    /// The response the client got, after the shard flushed.
    fn response(t: *TestRunner, fd: c_int, buf: []u8) []const u8 {
        t.r.flushConns();
        var n: usize = 0;
        var tries: u32 = 0;
        while (tries < 200) : (tries += 1) {
            switch (sys.readSome(fd, buf[n..])) {
                .n => |k| {
                    n += k;
                    if (std.mem.indexOf(u8, buf[0..n], "\r\n\r\n") != null) break;
                },
                .again, .closed => napTest(),
            }
        }
        return buf[0..n];
    }
};

fn napTest() void {
    var ts: std.c.timespec = .{ .sec = 0, .nsec = 2_000_000 };
    _ = std.c.nanosleep(&ts, null);
}

test "regression: a second client gets its own connection, not the one already open" {
    // The connect is non-blocking, so the kernel may put the connection in
    // the accept queue after the shard's first poll. Then a helper that takes
    // the highest open slot returns the connection that was already open, and
    // the test reads that connection's reply. Under load this failed.
    var t: TestRunner = .{ .arena = undefined };
    try t.start();
    defer t.deinit();
    const a = try t.client("");
    defer sys.close(a.fd);
    const b = try t.client("");
    defer sys.close(b.fd);
    try std.testing.expect(b.idx != a.idx);
}

test "inbound requests leave room for the results of outbound requests" {
    var t: TestRunner = .{ .arena = undefined };
    try t.start();
    defer t.deinit();
    const r = t.r;
    // Fill the queue up to the reserve: a new request is refused with 503.
    const free = r.events.capacity - r.resultReserve() - r.events.items.len;
    for (0..free) |_| r.events.appendAssumeCapacity(.{ .kind = .cancel, .exec_id = 1 });
    const c = try t.client("POST /x HTTP/1.1\r\nhost: a\r\ncontent-length: 0\r\n\r\n");
    defer sys.close(c.fd);
    var buf: [4096]u8 = undefined;
    try std.testing.expect(std.mem.startsWith(u8, t.response(c.fd, &buf), "HTTP/1.1 503"));
    try std.testing.expectEqual(r.events.capacity - r.resultReserve(), r.events.items.len);
    // Every outbound request in flight still finds room for its result.
    for (0..r.resultReserve()) |i| Runner.egressDone(r, i + 1, 0, .{ .err = "http: test" });
    try std.testing.expectEqual(r.events.capacity, r.events.items.len);
    try std.testing.expectEqual(@as(usize, 0), r.nlost);
}

/// `run(t) { return await Call({ url: 'nowhere', credential: 'api', ...extra }) }`,
/// an `http` step. `extra` is one more member of the args, or none.
fn renewModule(gpa: std.mem.Allocator, extra: ?[]const u8, extra_number: f64, extra_true: bool) ![]u8 {
    const Asm = core_lib.asm_.Asm;
    var m: Asm = .{ .gpa = gpa, .meta = "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"w\"}]}" };
    defer m.deinit();
    const call = try m.step("Call", .http);
    m.beginFunc();
    try m.emit(.newobj, 0, 1, 0, 0);
    try m.emitBc(.loads, 2, try m.str("nowhere"));
    try m.emit(.setprop, 0, 1, try m.str("url"), 2);
    try m.emitBc(.loads, 2, try m.str("api"));
    try m.emit(.setprop, 0, 1, try m.str("credential"), 2);
    if (extra) |name| {
        if (extra_true) try m.emit(.loadbool, 1, 2, 0, 0) else try m.emitBc(.loadk, 2, try m.number(extra_number));
        try m.emit(.setprop, 0, 1, try m.str(name), 2);
    }
    try m.emitBc(.loadi, 3, call);
    try m.emit(.@"suspend", @backingInt(core_lib.module.EffectKind.http), 4, 3, 1);
    try m.emit(.ret, 0, 4, 0, 0);
    try m.endFunc("run", 1, 5, 0);
    return m.finish();
}

/// Start a run of module 0 in the core of a test runner. Its request waits
/// for a result; the test gives the results by hand. Returns the effect.
fn startRenewRun(r: *Runner) !struct { exec: u64, seq: u32 } {
    const tk = try r.sh.tick(sys.nowMs(), &.{.{ .kind = .start, .aux = 0, .payload = "{}" }});
    defer r.sh.endBatch();
    for (tk.actions) |a| if (a.kind == .dispatch) return .{ .exec = a.exec_id, .seq = a.seq };
    return error.NoDispatch;
}

/// A test runner with one module, the service calls, the renewal table and
/// the global credentials document `doc`.
fn renewRunner(t: *TestRunner, doc: []const u8, rows: u32) !*Runner {
    try t.start();
    const r = t.r;
    r.svc = try admin.ServiceCalls.init(t.arena.allocator(), 8, 1024);
    r.renewals = try renew.Table.init(t.arena.allocator(), rows, 1024);
    const store = try t.arena.allocator().create(creds.Store);
    store.* = try creds.Store.parse(t.arena.allocator(), doc);
    r.egress.cfg.credentials = store;
    r.noteStore(store);
    return r;
}

fn statusResult(status: u32) egress.Result {
    return .{ .ok = .{ .status = status, .header_lines = "", .body = "", .json = false } };
}

const renew_doc_401 = "{\"api\":{\"data\":{},\"renewal\":{\"status\":[401],\"oauth2\":true,\"statusDefault\":true}}}";

test "a 401 of a renewable credential asks n8n once, then the request goes again once" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try renewModule(mod_arena.allocator(), null, 0, false)};
    var t: TestRunner = .{ .arena = undefined, .modules = &mods };
    const r = try renewRunner(&t, renew_doc_401, 8);
    defer t.deinit();
    const rt = &r.renewals.?;
    const one = try startRenewRun(r);
    const two = try startRenewRun(r);
    // A request with a valid value has no row, and a response that is not
    // "expired" needs none: the step gets it.
    try std.testing.expectEqual(@as(u32, 0), rt.count);
    const other = try startRenewRun(r);
    Runner.egressDone(r, other.exec, other.seq, statusResult(200));
    Runner.egressDone(r, other.exec, other.seq, statusResult(500));
    try std.testing.expectEqual(@as(usize, 2), r.events.items.len);
    try std.testing.expectEqual(@as(u32, 0), rt.count);
    r.events.clearRetainingCapacity();

    Runner.egressDone(r, one.exec, one.seq, statusResult(401));
    Runner.egressDone(r, two.exec, two.seq, statusResult(401));
    // The steps see nothing, and one call serves both requests.
    try std.testing.expectEqual(@as(usize, 0), r.events.items.len);
    try std.testing.expectEqual(@as(u32, 1), r.svc.?.count);
    const call = r.svc.?.find(one.exec, one.seq).?;
    try std.testing.expect(std.mem.indexOf(u8, r.svc.?.line(call), "\"service\":\"credentials\",\"op\":\"renew\",\"args\":{\"credentialId\":\"api\"}") != null);
    Runner.renewalAnswered(rt, rt.leaderAt(one.exec, one.seq).?, .{ .ok = "true" });
    // The resend takes the args from the core. No host: it fails at once,
    // which shows that it was sent.
    r.resumeRenewed(sys.nowMs());
    try std.testing.expectEqual(@as(u64, 2), rt.counters.resent);
    // A second 401 goes to the step: one renewal and one resend only.
    var tries: u32 = 0;
    while (rt.count > 0 and tries < 4) : (tries += 1) {
        if (rt.find(one.exec, one.seq) != null) Runner.egressDone(r, one.exec, one.seq, statusResult(401));
        if (rt.find(two.exec, two.seq) != null) Runner.egressDone(r, two.exec, two.seq, statusResult(401));
    }
    try std.testing.expectEqual(@as(u32, 0), rt.count);
    try std.testing.expectEqual(@as(u64, 1), rt.counters.calls);
    try std.testing.expectEqual(@as(usize, 2), r.events.items.len);
}

test "a renewal that n8n refuses fails the step with the message of n8n" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try renewModule(mod_arena.allocator(), null, 0, false)};
    var t: TestRunner = .{ .arena = undefined, .modules = &mods };
    const r = try renewRunner(&t, "{\"api\":{\"data\":{},\"renewal\":{\"status\":[403]}}}", 8);
    defer t.deinit();
    const rt = &r.renewals.?;
    const one = try startRenewRun(r);
    Runner.egressDone(r, one.exec, one.seq, statusResult(403));
    try std.testing.expectEqual(@as(usize, 0), r.events.items.len);
    Runner.renewalAnswered(rt, rt.leaderAt(one.exec, one.seq).?, .{ .err = "\"Reconnect the \\\"x\\\" credential\"" });
    r.resumeRenewed(sys.nowMs());
    try std.testing.expectEqual(@as(usize, 1), r.events.items.len);
    try std.testing.expect(r.events.items[0].kind == .effect_err);
    try std.testing.expectEqualStrings("Reconnect the \"x\" credential", r.events.items[0].payload);
    try std.testing.expectEqual(@as(u32, 0), rt.count);
    // The execution ended: the call of a renewal that it led is dropped with it.
    Runner.egressDone(r, one.exec, one.seq, statusResult(403));
    try std.testing.expectEqual(@as(u32, 1), rt.count);
    r.dropServiceCalls(one.exec);
    try std.testing.expectEqual(@as(u32, 1), r.svc.?.count);
    r.expireServiceCalls(std.math.maxInt(i64));
    try std.testing.expectEqual(@as(u32, 0), r.svc.?.count);
    try std.testing.expectEqual(@as(u32, 0), rt.count);
}

test "a renewal without a row fails the step with a limit, and the args have no size limit" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try renewModule(mod_arena.allocator(), null, 0, false)};
    var t: TestRunner = .{ .arena = undefined, .modules = &mods };
    const r = try renewRunner(&t, "{\"api\":{\"data\":{},\"renewal\":{\"status\":[401]}},\"b\":{\"data\":{},\"renewal\":{\"status\":[302]}}}", 1);
    defer t.deinit();
    const rt = &r.renewals.?;
    // A status below 400 of a slot of the document lowers the bound.
    try std.testing.expectEqual(@as(u32, 302), r.min_expiry_status);
    const one = try startRenewRun(r);
    const two = try startRenewRun(r);
    Runner.egressDone(r, one.exec, one.seq, statusResult(401));
    try std.testing.expectEqual(@as(u32, 1), rt.count);
    // The table is full: the step does not get the 401 of the expired value.
    Runner.egressDone(r, two.exec, two.seq, statusResult(401));
    try std.testing.expectEqual(@as(usize, 1), r.events.items.len);
    try std.testing.expect(r.events.items[0].kind == .effect_err);
    try std.testing.expectEqualStrings(renew.full_text, r.events.items[0].payload);
    try std.testing.expectEqual(@as(u64, 1), rt.counters.full);
    // A row has room for names only: 1 KB here, whatever the args are.
    try std.testing.expectEqual(@as(usize, 1024), rt.room_bytes);
}

test "the options of the node: skipTokenRefresh, its own status, and a request without the slot values" {
    const Case = struct { extra: ?[]const u8, number: f64 = 0, yes: bool = false, status: u32, renews: bool };
    const cases = [_]Case{
        .{ .extra = null, .status = 401, .renews = true },
        .{ .extra = "skipTokenRefresh", .yes = true, .status = 401, .renews = false },
        .{ .extra = "tokenExpiredStatusCode", .number = 403, .status = 403, .renews = true },
        // The status of the node takes the place of 401.
        .{ .extra = "tokenExpiredStatusCode", .number = 403, .status = 401, .renews = false },
        .{ .extra = null, .status = 403, .renews = false },
    };
    for (cases) |c| {
        var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        defer mod_arena.deinit();
        const mods = [_][]const u8{try renewModule(mod_arena.allocator(), c.extra, c.number, c.yes)};
        var t: TestRunner = .{ .arena = undefined, .modules = &mods };
        const r = try renewRunner(&t, renew_doc_401, 8);
        defer t.deinit();
        const one = try startRenewRun(r);
        Runner.egressDone(r, one.exec, one.seq, statusResult(c.status));
        try std.testing.expectEqual(c.renews, r.renewals.?.count == 1);
        try std.testing.expectEqual(c.renews, r.events.items.len == 0);
    }
    // The credential has statuses of its own: those of the node do not count.
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try renewModule(mod_arena.allocator(), "tokenExpiredStatusCode", 404, false)};
    var t: TestRunner = .{ .arena = undefined, .modules = &mods };
    const r = try renewRunner(&t, "{\"api\":{\"data\":{},\"renewal\":{\"status\":[403],\"oauth2\":true}}}", 8);
    defer t.deinit();
    const one = try startRenewRun(r);
    Runner.egressDone(r, one.exec, one.seq, statusResult(404));
    try std.testing.expectEqual(@as(u32, 0), r.renewals.?.count);
    const two = try startRenewRun(r);
    Runner.egressDone(r, two.exec, two.seq, statusResult(403));
    try std.testing.expectEqual(@as(u32, 1), r.renewals.?.count);
}

test "results raised while a batch acts wait for room, and none is lost" {
    var t: TestRunner = .{ .arena = undefined };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const free = r.events.capacity - r.resultReserve() - r.events.items.len;
    for (0..free) |_| r.events.appendAssumeCapacity(.{ .kind = .cancel, .exec_id = 1 });
    // Requests that fail at once while the batch acts: more than the reserve.
    r.in_perform = true;
    const n = r.resultReserve() * 3;
    for (0..n) |i| Runner.egressDone(r, i + 1, 7, .{ .err = "http: bad url" });
    r.effectError(999, 1, "static error");
    r.in_perform = false;
    try std.testing.expectEqual(n + 1, r.nlost);
    try std.testing.expectEqual(r.events.capacity - r.resultReserve(), r.events.items.len);
    // The batch consumed the queue: the waiting errors go in, in order,
    // and the reserve stays free.
    var delivered: usize = 0;
    var rounds: u32 = 0;
    while (r.nlost > 0 and rounds < 100) : (rounds += 1) {
        r.events.clearRetainingCapacity();
        r.drainEgressLost();
        try std.testing.expect(r.events.items.len + r.resultReserve() <= r.events.capacity);
        for (r.events.items) |ev| {
            try std.testing.expect(ev.kind == .effect_err);
            delivered += 1;
            if (delivered <= n) try std.testing.expectEqual(@as(u64, delivered), ev.exec_id);
        }
    }
    try std.testing.expectEqual(n + 1, delivered);
    try std.testing.expectEqualStrings("static error", r.events.items[r.events.items.len - 1].payload);
}

test "a reply larger than the connection buffer uses a large buffer, else a 500" {
    var t: TestRunner = .{ .arena = undefined };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const c = try t.client("");
    defer sys.close(c.fd);
    var body: [8000]u8 = undefined;
    @memset(&body, 'x');
    // Larger than wbuf (4 KB): it moves to the one large buffer.
    r.replyRaw(c.idx, 200, &body);
    try std.testing.expect(r.conns[c.idx].big != no_big);
    // That buffer is taken: a second connection gets a 500 instead.
    const c2 = try t.client("");
    defer sys.close(c2.fd);
    r.replyRaw(c2.idx, 200, &body);
    var buf: [16384]u8 = undefined;
    try std.testing.expect(std.mem.startsWith(u8, t.response(c2.fd, &buf), "HTTP/1.1 500"));
    const got = t.response(c.fd, &buf);
    try std.testing.expect(std.mem.startsWith(u8, got, "HTTP/1.1 200"));
}

test "a run that failed answers its webhook with the body of n8n, without the reason" {
    var t: TestRunner = .{ .arena = undefined };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.in_perform = true;
    defer r.in_perform = false;
    var buf: [4096]u8 = undefined;

    // The core gives the reason as the payload; the caller of the webhook does not get it.
    const c = try t.client("");
    defer sys.close(c.fd);
    const reason = "{\"name\":\"NodeApiError\",\"message\":\"the reason of the node\",\"httpCode\":\"400\"}";
    r.replyFromCore(c.idx, .{ .kind = .reply, .aux = 500, .payload = reason, .seq = core.reply_failed });
    const failed = t.response(c.fd, &buf);
    try std.testing.expect(std.mem.startsWith(u8, failed, "HTTP/1.1 500"));
    try std.testing.expect(std.mem.endsWith(u8, failed, "{\"message\":\"Error in workflow\"}"));
    try std.testing.expect(std.mem.indexOf(u8, failed, "the reason of the node") == null);

    // A response with status 500 that the workflow made keeps its body.
    const c2 = try t.client("");
    defer sys.close(c2.fd);
    r.replyFromCore(c2.idx, .{ .kind = .reply, .aux = 500, .payload = "{\"mine\":true}" });
    const own = t.response(c2.fd, &buf);
    try std.testing.expect(std.mem.startsWith(u8, own, "HTTP/1.1 500"));
    try std.testing.expect(std.mem.endsWith(u8, own, "{\"mine\":true}"));
}

// ---- fallback host connections ------------------------------------------------------

const no_host = "/nonexistent/wfrt-test-fallback.sock";

/// A host connection on a socket pair in slot `ci`, ready for steps. The
/// test is the host: it uses the other end, which the caller closes.
fn fakeHostConn(r: *Runner, ci: u8) !c_int {
    var fds: [2]c_int = undefined;
    if (std.c.socketpair(std.c.AF.UNIX, std.c.SOCK.STREAM, 0, &fds) != 0) return error.SocketPair;
    sys.setNonBlocking(fds[0]);
    sys.setNonBlocking(fds[1]);
    const c = &r.fb_conns[ci];
    std.debug.assert(c.fd < 0);
    c.fd = fds[0];
    c.gen +%= 1;
    c.state = .ready;
    try r.poller.addRead(fds[0], token(.fallback, c.gen, ci));
    return fds[1];
}

/// A step in flight on connection `ci`, with its frame in the journal.
fn fakeHostStep(r: *Runner, ci: u8, exec_id: u64, seq: u32) void {
    var buf: [64]u8 = undefined;
    const body = std.fmt.bufPrint(buf[4..], "{{\"id\":\"{d}:{d}\",\"kind\":\"code\"}}", .{ exec_id, seq }) catch unreachable;
    std.mem.writeInt(u32, buf[0..4], @intCast(body.len), .little);
    var e: FbEntry = .{ .conn = ci };
    r.journal(&e, buf[0 .. 4 + body.len]);
    std.debug.assert(e.jlen > 0);
    r.fb_inflight.putAssumeCapacity(.{ .exec_id = exec_id, .seq = seq, .send = false }, e);
    r.fbAdmit(0);
    r.fb_conns[ci].inflight += 1;
}

/// A dispatch of step 0 ("Check" of `programs.loop`) of the module in slot 0.
fn fakeAction(exec_id: u64, seq: u32) core.Action {
    return .{ .kind = .dispatch, .effect_kind = .node, .exec_id = exec_id, .seq = seq, .module = 0, .step = 0, .attempt = 0, .payload = "{\"cid\":1,\"i\":0}", .key = @splat('k') };
}

/// The host writes one frame.
fn hostWrite(fd: c_int, body: []const u8) !void {
    var buf: [512]u8 = undefined;
    std.debug.assert(body.len + 4 <= buf.len);
    std.mem.writeInt(u32, buf[0..4], @intCast(body.len), .little);
    @memcpy(buf[4..][0..body.len], body);
    var off: usize = 0;
    var tries: u32 = 0;
    while (off < body.len + 4 and tries < 1000) : (tries += 1) {
        switch (sys.writeSome(fd, buf[off .. body.len + 4])) {
            .n => |k| off += k,
            .again => napTest(),
            .closed => return error.Closed,
        }
    }
    if (off != body.len + 4) return error.WriteTimeout;
}

/// The host reads one frame: its body.
fn hostRead(fd: c_int, buf: []u8) ![]const u8 {
    var n: usize = 0;
    var tries: u32 = 0;
    while (tries < 500) : (tries += 1) {
        if (n >= 4) {
            const len = std.mem.readInt(u32, buf[0..4], .little);
            if (n >= 4 + len) return buf[4..][0..len];
        }
        switch (sys.readSome(fd, buf[n..])) {
            .n => |k| n += k,
            .again => napTest(),
            .closed => return error.Closed,
        }
    }
    return error.ReadTimeout;
}

/// The event of step `exec_id`/`seq` in the event queue.
fn findEvent(r: *const Runner, exec_id: u64, seq: u32) ?core.Event {
    for (r.events.items) |ev| if (ev.exec_id == exec_id and ev.seq == seq) return ev;
    return null;
}

/// The step of a frame body, from its `"id":"<exec>:<seq>"`.
fn frameSeq(body: []const u8) !u32 {
    const id = http.plainString(http.member(body, "id") orelse return error.NoId) orelse return error.NoId;
    const colon = std.mem.indexOfScalar(u8, id, ':') orelse return error.NoId;
    return std.fmt.parseInt(u32, id[colon + 1 ..], 10);
}

/// The whole frames in `bytes`.
fn framesIn(bytes: []const u8) usize {
    var off: usize = 0;
    var n: usize = 0;
    while (off + 4 <= bytes.len) {
        const len = std.mem.readInt(u32, bytes[off..][0..4], .little);
        if (off + 4 + len > bytes.len) break;
        n += 1;
        off += 4 + len;
    }
    return n;
}

test "fallback: the answer to the hello sets the protocol and the connections to keep" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const h0 = try fakeHostConn(r, 0);
    defer sys.close(h0);
    r.fb_conns[0].state = .hello;
    try hostWrite(h0, "{\"hello\":{\"version\":2,\"workers\":3,\"worker\":0}}");
    r.readFallback(0);
    try std.testing.expectEqual(@as(u8, 2), r.fb_version);
    try std.testing.expectEqual(@as(u32, 3), r.fb_target);
    try std.testing.expectEqual(FbState.ready, r.fb_conns[0].state);
    // A v1 host answers the hello with an error frame: one connection.
    const h1 = try fakeHostConn(r, 1);
    defer sys.close(h1);
    r.fb_conns[1].state = .hello;
    try hostWrite(h1, "{\"id\":\"\",\"ok\":false,\"error\":\"Request has no string \\\"id\\\"\"}");
    r.readFallback(1);
    try std.testing.expectEqual(@as(u8, 1), r.fb_version);
    try std.testing.expectEqual(@as(u32, 1), r.fb_target);
}

test "fallback: a step alone on a connection whose worker stopped fails with the host's reason" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 2;
    const h0 = try fakeHostConn(r, 0);
    fakeHostStep(r, 0, 7, 1);
    // The server process writes the reason and closes, before the shard reads.
    try hostWrite(h0, "{\"worker_lost\":{\"reason\":\"it ran out of memory\"}}");
    sys.close(h0);
    r.readFallback(0);
    try std.testing.expect(r.fb_conns[0].fd < 0);
    try std.testing.expectEqual(@as(u32, 0), r.fb_inflight.count());
    try std.testing.expectEqual(@as(usize, 0), r.fb_aloneq.items.len);
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    const ev = findEvent(r, 7, 1) orelse return error.NoEvent;
    try std.testing.expect(ev.kind == .effect_err);
    try std.testing.expectEqualStrings("The step stopped its host worker: it ran out of memory", ev.payload);
    try std.testing.expectEqual(@as(u32, 0), r.fb_conns[0].lost_refs);
    // A reason that the shell cannot keep: the step is still to blame, with the static text.
    const h1 = try fakeHostConn(r, 1);
    fakeHostStep(r, 1, 8, 1);
    try hostWrite(h1, "{\"worker_lost\":{\"reason\":\"a \\\"quoted\\\" reason\"}}");
    sys.close(h1);
    r.readFallback(1);
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    try std.testing.expectEqualStrings(fb_stopped, (findEvent(r, 8, 1) orelse return error.NoEvent).payload);
}

test "fallback: a step alone on a connection that closes without worker_lost fails as retryable" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 1;
    // The whole host stopped, or its server process: nothing says which step caused it.
    const h0 = try fakeHostConn(r, 0);
    fakeHostStep(r, 0, 7, 1);
    sys.close(h0);
    r.readFallback(0);
    try std.testing.expectEqual(@as(usize, 0), r.fb_aloneq.items.len);
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    const ev = findEvent(r, 7, 1) orelse return error.NoEvent;
    try std.testing.expect(ev.kind == .effect_err);
    try std.testing.expectEqualStrings(fb_lost, ev.payload);
    // A `worker_lost` of an earlier connection in the slot does not count for the next one.
    try std.testing.expect(!r.fb_conns[0].lost_seen);
}

test "fallback: a result that comes just before the close counts" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 1;
    const h0 = try fakeHostConn(r, 0);
    fakeHostStep(r, 0, 7, 1);
    fakeHostStep(r, 0, 7, 2);
    try hostWrite(h0, "{\"id\":\"7:1\",\"ok\":true,\"result\":[{\"v\":1}]}");
    sys.close(h0);
    r.events.clearRetainingCapacity();
    r.readFallback(0);
    const ev = findEvent(r, 7, 1) orelse return error.NoEvent;
    try std.testing.expect(ev.kind == .effect_ok);
    // The other step was alone on the connection after it. The host did not
    // say that the worker stopped, so it fails as retryable.
    try std.testing.expectEqual(@as(usize, 1), r.fb_failq.items.len);
    try std.testing.expectEqual(@as(u32, 2), r.fb_failq.items[0].key.seq);
    try std.testing.expectEqualStrings(fb_lost, r.fb_failq.items[0].msg);
}

test "fallback: several steps on a lost connection go again, each alone on an idle connection" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 2;
    const h0 = try fakeHostConn(r, 0);
    const h1 = try fakeHostConn(r, 1);
    fakeHostStep(r, 0, 7, 1);
    fakeHostStep(r, 0, 7, 2);
    try hostWrite(h0, "{\"worker_lost\":{\"reason\":\"it stopped (SIGKILL)\"}}");
    sys.close(h0);
    r.readFallback(0);
    // Nobody knows which step stopped the worker: both wait to go again.
    try std.testing.expectEqual(@as(usize, 2), r.fb_aloneq.items.len);
    try std.testing.expectEqual(@as(usize, 0), r.fb_failq.items.len);
    try std.testing.expectEqual(@as(u32, 0), r.fb_conns[0].lost_refs);
    r.sendAlone();
    try std.testing.expect(r.fb_conns[1].alone);
    try std.testing.expectEqual(@as(usize, 1), r.fb_aloneq.items.len);
    var buf: [512]u8 = undefined;
    const first = try frameSeq(try hostRead(h1, &buf));
    // While it runs alone, the connection takes no new step.
    try std.testing.expectEqual(@as(?u8, null), r.pickConn(sys.nowMs()));
    var ans: [96]u8 = undefined;
    try hostWrite(h1, try std.fmt.bufPrint(&ans, "{{\"id\":\"7:{d}\",\"ok\":true,\"result\":[]}}", .{first}));
    r.events.clearRetainingCapacity();
    r.readFallback(1);
    try std.testing.expect((findEvent(r, 7, first) orelse return error.NoEvent).kind == .effect_ok);
    try std.testing.expect(!r.fb_conns[1].alone);
    // The other one goes next, alone; it stops its worker again: it is the cause.
    r.sendAlone();
    const second = try frameSeq(try hostRead(h1, &buf));
    try std.testing.expect(second != first);
    try hostWrite(h1, "{\"worker_lost\":{\"reason\":\"it ran out of memory\"}}");
    sys.close(h1);
    r.readFallback(1);
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    try std.testing.expectEqualStrings("The step stopped its host worker: it ran out of memory", (findEvent(r, 7, second) orelse return error.NoEvent).payload);
    try std.testing.expectEqual(@as(u32, 0), r.fb_inflight.count());
}

test "fallback: after worker_lost with again, each step goes again once as a new step" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 2;
    const h0 = try fakeHostConn(r, 0);
    const h1 = try fakeHostConn(r, 1);
    defer sys.close(h1);
    // One step alone on the connection: without `again` it is the cause.
    fakeHostStep(r, 0, 7, 1);
    try hostWrite(h0, "{\"worker_lost\":{\"reason\":\"a step blocks it\",\"again\":true}}");
    sys.close(h0);
    r.readFallback(0);
    const key: FbKey = .{ .exec_id = 7, .seq = 1, .send = false };
    try std.testing.expectEqual(@as(usize, 0), r.fb_failq.items.len);
    try std.testing.expectEqual(@as(usize, 0), r.fb_aloneq.items.len);
    try std.testing.expectEqual(@as(usize, 1), r.fb_waitq.items.len);
    try std.testing.expect(r.fb_inflight.get(key).?.again);
    try std.testing.expect(!r.fb_conns[0].lost_again);
    // It goes out as a new step: the connection is not reserved for it.
    r.sendWaiting();
    try std.testing.expectEqual(@as(usize, 0), r.fb_waitq.items.len);
    try std.testing.expectEqual(@as(u8, 1), r.fb_inflight.get(key).?.conn);
    try std.testing.expect(!r.fb_conns[1].alone);
    var buf: [512]u8 = undefined;
    try std.testing.expectEqual(@as(u32, 1), try frameSeq(try hostRead(h1, &buf)));
    // Lost a second time, also with `again`: now it is the cause.
    try hostWrite(h1, "{\"worker_lost\":{\"reason\":\"a step blocks it\",\"again\":true}}");
    r.readFallback(1);
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    try std.testing.expectEqualStrings("The step stopped its host worker: a step blocks it", (findEvent(r, 7, 1) orelse return error.NoEvent).payload);
    try std.testing.expectEqual(@as(u32, 0), r.fb_inflight.count());
}

test "fallback: after goaway a connection takes no new steps and closes after its last one" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 2;
    const h0 = try fakeHostConn(r, 0);
    defer sys.close(h0);
    const h1 = try fakeHostConn(r, 1);
    defer sys.close(h1);
    fakeHostStep(r, 0, 7, 1);
    try hostWrite(h0, "{\"goaway\":{}}");
    r.readFallback(0);
    try std.testing.expectEqual(FbState.draining, r.fb_conns[0].state);
    try std.testing.expect(r.fb_conns[0].fd >= 0);
    try std.testing.expectEqual(@as(?u8, 1), r.pickConn(sys.nowMs()));
    try hostWrite(h0, "{\"id\":\"7:1\",\"ok\":true,\"result\":[]}");
    r.events.clearRetainingCapacity();
    r.readFallback(0);
    try std.testing.expect((findEvent(r, 7, 1) orelse return error.NoEvent).kind == .effect_ok);
    try std.testing.expect(r.fb_conns[0].fd < 0);
}

test "fallback: a service call without the admin API gets its error on the step's connection" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    const h0 = try fakeHostConn(r, 0);
    defer sys.close(h0);
    fakeHostStep(r, 0, 9, 4);
    try hostWrite(h0, "{\"type\":\"service\",\"id\":\"9:4\",\"service\":\"deduplication\",\"op\":\"getProcessedDataCount\",\"args\":{}}");
    r.readFallback(0);
    var buf: [512]u8 = undefined;
    try std.testing.expectEqualStrings("{\"type\":\"serviceResult\",\"id\":\"9:4\",\"n\":1,\"ok\":false,\"error\":\"" ++ Runner.svc_no_admin ++ "\"}", try hostRead(h0, &buf));
    // A call for a step that is not on this connection gets no answer.
    try hostWrite(h0, "{\"type\":\"service\",\"id\":\"9:5\",\"service\":\"deduplication\",\"op\":\"x\",\"args\":{}}");
    r.readFallback(0);
    try std.testing.expectError(error.ReadTimeout, hostRead(h0, &buf));
}

test "writeResult leaves out the members that the step never reads" {
    var buf: [1024]u8 = undefined;
    var arena = Arena.init(&buf);
    const resp: egress.Response = .{ .status = 200, .header_lines = "content-type: application/json\r\nx-a: 1\r\n", .body = "{\"ok\":true}", .json = true };
    const head = "{\"status\":200,\"headers\":{}}";

    const all = try Runner.writeResult(&arena, resp, .{});
    try std.testing.expect(std.mem.indexOf(u8, all.payload, "\"x-a\":\"1\"") != null);
    try std.testing.expect(std.mem.endsWith(u8, all.payload, "}{\"ok\":true}"));

    const no_headers = try Runner.writeResult(&arena, resp, .{ .headers = false });
    try std.testing.expectEqualStrings(head ++ "{\"ok\":true}", no_headers.payload);
    try std.testing.expectEqual(core.raw_body_flag | head.len, no_headers.aux);

    const status_only = try Runner.writeResult(&arena, resp, .{ .headers = false, .body = false });
    try std.testing.expectEqualStrings(head, status_only.payload);
    try std.testing.expectEqual(core.raw_body_flag | head.len, status_only.aux);

    // A body that is not labelled JSON is left out the same way.
    var text = resp;
    text.json = false;
    text.body = "plain text";
    const text_only = try Runner.writeResult(&arena, text, .{ .headers = false, .body = false });
    try std.testing.expectEqualStrings(head, text_only.payload);
    const text_all = try Runner.writeResult(&arena, text, .{});
    try std.testing.expect(std.mem.endsWith(u8, text_all.payload, ",\"body\":\"plain text\"}"));
    try std.testing.expectEqual(@as(u32, 0), text_all.aux);
}

test "fallback: a hello without an answer closes the connection, and steps prefer a ready one" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 2;
    const h0 = try fakeHostConn(r, 0);
    defer sys.close(h0);
    const h1 = try fakeHostConn(r, 1);
    defer sys.close(h1);
    // Connection 0 waits for its hello answer; connection 1 is ready with a step on it.
    r.fb_conns[0].state = .hello;
    r.fb_conns[0].hello_since = sys.nowMs();
    fakeHostStep(r, 1, 7, 1);
    try std.testing.expectEqual(@as(?u8, 1), r.pickConn(sys.nowMs()));
    // No answer for longer than the limit: the connection closes. The step
    // queued behind the hello fails as retryable (no `worker_lost`).
    fakeHostStep(r, 0, 7, 2);
    r.fb_conns[0].hello_since = sys.nowMs() - fb_hello_ms - 1;
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    try std.testing.expect(r.fb_conns[0].fd < 0);
    try std.testing.expectEqualStrings(fb_lost, (findEvent(r, 7, 2) orelse return error.NoEvent).payload);
    try std.testing.expect(r.fb_conns[1].fd >= 0);
}

test "fallback: a step waits while no host connection is open, and goes out when one is ready" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try programs.loop(mod_arena.allocator(), null)};
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host, .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const a = fakeAction(7, 1);
    r.sendFrame(a, a.payload, false);
    // No connection is open: the step waits, its frame is in the journal, and
    // no failure is made. The wait ends at `now + --fallback-wait-ms`.
    try std.testing.expectEqual(FbState.closed, r.fb_conns[0].state);
    try std.testing.expectEqual(@as(usize, 1), r.fb_waitq.items.len);
    try std.testing.expectEqual(@as(usize, 0), r.fb_failq.items.len);
    const key: FbKey = .{ .exec_id = 7, .seq = 1, .send = false };
    const e = r.fb_inflight.get(key) orelse return error.NotInFlight;
    try std.testing.expectEqual(fb_waiting, e.conn);
    try std.testing.expect(e.jlen > 0);
    try std.testing.expect(e.wait_till > sys.nowMs());
    try std.testing.expect(e.wait_till <= sys.nowMs() + r.opts.fallback_wait_ms);
    // A host connects and answers the hello: the step goes out, in arrival order.
    const h0 = try fakeHostConn(r, 0);
    defer sys.close(h0);
    r.fb_conns[0].state = .hello;
    try hostWrite(h0, "{\"hello\":{\"version\":2,\"workers\":1,\"worker\":0}}");
    r.readFallback(0);
    var buf: [512]u8 = undefined;
    const body = try hostRead(h0, &buf);
    try std.testing.expectEqual(@as(u32, 1), try frameSeq(body));
    try std.testing.expectEqual(@as(usize, 0), r.fb_waitq.items.len);
    try std.testing.expectEqual(@as(u8, 0), r.fb_inflight.get(key).?.conn);
    // Its answer completes the step, and nothing failed.
    try hostWrite(h0, "{\"id\":\"7:1\",\"ok\":true,\"result\":[{\"v\":1}]}");
    r.events.clearRetainingCapacity();
    r.readFallback(0);
    r.serviceFallback(sys.nowMs());
    const ev = findEvent(r, 7, 1) orelse return error.NoEvent;
    try std.testing.expect(ev.kind == .effect_ok);
    try std.testing.expectEqual(@as(usize, 0), r.fb_failq.items.len);
    try std.testing.expectEqual(@as(u32, 0), r.fb_inflight.count());
}

test "fallback: a step that waits past --fallback-wait-ms fails as retryable" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try programs.loop(mod_arena.allocator(), null)};
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host, .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const a = fakeAction(7, 1);
    r.sendFrame(a, a.payload, false);
    const key: FbKey = .{ .exec_id = 7, .seq = 1, .send = false };
    try std.testing.expectEqual(@as(usize, 1), r.fb_waitq.items.len);
    // The wait ended before this pass of the loop.
    r.fb_inflight.getPtr(key).?.wait_till = sys.nowMs() - 1;
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    try std.testing.expectEqual(@as(usize, 0), r.fb_waitq.items.len);
    try std.testing.expectEqual(@as(u32, 0), r.fb_inflight.count());
    try std.testing.expectEqualStrings(fb_down, (findEvent(r, 7, 1) orelse return error.NoEvent).payload);
}

test "fallback: a full wait queue fails the next step with the limit error" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try programs.loop(mod_arena.allocator(), null)};
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host, .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    // One workflow gets half of the queue.
    for (0..fb_max_wait_workflow) |i| {
        const a = fakeAction(7 + i, 1);
        r.sendFrame(a, a.payload, false);
    }
    try std.testing.expectEqual(@as(usize, fb_max_wait_workflow), r.fb_waitq.items.len);
    try std.testing.expectEqual(@as(usize, 0), r.fb_failq.items.len);
    const a = fakeAction(99, 1);
    r.sendFrame(a, a.payload, false);
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    try std.testing.expectEqualStrings(fb_full, (findEvent(r, 99, 1) orelse return error.NoEvent).payload);
    // The steps that wait keep their places.
    try std.testing.expectEqual(@as(usize, fb_max_wait_workflow), r.fb_waitq.items.len);
    try std.testing.expectEqual(@as(u64, 1), r.stats.host_refused.load(.monotonic));
}

/// A dispatch of step 0 of the module in slot `module`.
fn fakeActionOf(module: u16, exec_id: u64) core.Action {
    var a = fakeAction(exec_id, 1);
    a.module = module;
    return a;
}

/// The host answers the step of execution `exec_id` on `fd`, and the shell takes the answer.
fn hostAnswers(r: *Runner, fd: c_int, ci: u8, exec_id: u64) !void {
    var ans: [96]u8 = @splat(0);
    try hostWrite(fd, try std.fmt.bufPrint(&ans, "{{\"id\":\"{d}:1\",\"ok\":true,\"result\":[]}}", .{exec_id}));
    r.events.clearRetainingCapacity();
    r.readFallback(ci);
    r.serviceFallback(sys.nowMs());
}

/// The frames that the host reads on a connection, one by one. One read can hold several.
const HostFrames = struct {
    fd: c_int,
    buf: [4096]u8 = @splat(0),
    len: usize = 0,

    /// The execution of the next frame.
    fn nextExec(f: *HostFrames) !u64 {
        var tries: u32 = 0;
        while (tries < 500) : (tries += 1) {
            if (f.len >= 4) {
                const n = std.mem.readInt(u32, f.buf[0..4], .little);
                if (f.len >= 4 + n) {
                    const id = http.plainString(http.member(f.buf[4..][0..n], "id") orelse return error.NoId) orelse return error.NoId;
                    const colon = std.mem.indexOfScalar(u8, id, ':') orelse return error.NoId;
                    const exec = try std.fmt.parseInt(u64, id[0..colon], 10);
                    std.mem.copyForwards(u8, f.buf[0 .. f.len - 4 - n], f.buf[4 + n .. f.len]);
                    f.len -= 4 + n;
                    return exec;
                }
            }
            switch (sys.readSome(f.fd, f.buf[f.len..])) {
                .n => |k| f.len += k,
                .again => napTest(),
                .closed => return error.Closed,
            }
        }
        return error.ReadTimeout;
    }
};

test "fallback: a workflow at its share waits, and the step of another workflow goes out" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    // The modules differ, so each gets its own slot.
    const mods = [_][]const u8{ try programs.loop(mod_arena.allocator(), "{\"durability\":\"none\"}"), try programs.loop(mod_arena.allocator(), "{\"durability\":\"batched\"}") };
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host, .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    // 4 places in total, 1 for each workflow.
    r.opts.fallback_steps_per_worker = 4;
    const h = try fakeHostConn(r, 0);
    defer sys.close(h);
    var frames: HostFrames = .{ .fd = h };
    try std.testing.expectEqual(@as(u32, 1), r.hostCapWorkflow());
    for ([_]u64{ 10, 11, 12 }) |exec| {
        const a = fakeActionOf(0, exec);
        r.sendFrame(a, a.payload, false);
    }
    const other = fakeActionOf(1, 20);
    r.sendFrame(other, other.payload, false);
    r.flushFallback();
    // The first workflow holds its one place; its other steps wait. The second workflow is not delayed.
    try std.testing.expectEqual(@as(u32, 2), r.fb_admitted);
    try std.testing.expectEqual(@as(u32, 1), r.fb_wf_inflight[0]);
    try std.testing.expectEqual(@as(u32, 2), r.fb_wf_waiting[0]);
    try std.testing.expectEqual(@as(u32, 1), r.fb_wf_inflight[1]);
    try std.testing.expectEqual(@as(u64, 10), try frames.nextExec());
    try std.testing.expectEqual(@as(u64, 20), try frames.nextExec());
    // A place of the workflow becomes free: its next step goes out, in arrival order.
    try hostAnswers(r, h, 0, 10);
    try std.testing.expectEqual(@as(u64, 11), try frames.nextExec());
    try hostAnswers(r, h, 0, 11);
    try std.testing.expectEqual(@as(u64, 12), try frames.nextExec());
    try hostAnswers(r, h, 0, 12);
    try hostAnswers(r, h, 0, 20);
    try std.testing.expectEqual(@as(u32, 0), r.fb_admitted);
    try std.testing.expectEqual(@as(u32, 0), r.fb_waiting_n);
    try std.testing.expectEqual(@as(u32, 0), r.fb_wf_waiters);
    try std.testing.expectEqual(@as(u32, 0), r.fb_inflight.count());
    try std.testing.expectEqual(@as(u64, 0), r.stats.host_inflight.load(.monotonic));
    try std.testing.expectEqual(@as(u64, 0), r.stats.host_waiting.load(.monotonic));
    try std.testing.expectEqual(@as(u64, 2), r.stats.host_waited.load(.monotonic));
}

test "fallback: the workflows that wait take turns for a free place" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    // The modules differ, so each gets its own slot.
    const mods = [_][]const u8{ try programs.loop(mod_arena.allocator(), "{\"durability\":\"none\"}"), try programs.loop(mod_arena.allocator(), "{\"durability\":\"batched\"}"), try programs.loop(mod_arena.allocator(), "{\"durability\":\"sync\"}") };
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host, .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    // One place in total.
    r.opts.fallback_steps_per_worker = 1;
    const h = try fakeHostConn(r, 0);
    defer sys.close(h);
    var frames: HostFrames = .{ .fd = h };
    // Workflow 0 has the place and two more steps; then workflows 1 and 2 come.
    const order = [_][2]u64{ .{ 0, 10 }, .{ 0, 11 }, .{ 0, 12 }, .{ 1, 20 }, .{ 2, 30 } };
    for (order) |o| {
        const a = fakeActionOf(@intCast(o[0]), o[1]);
        r.sendFrame(a, a.payload, false);
    }
    r.flushFallback();
    try std.testing.expectEqual(@as(usize, 4), r.fb_waitq.items.len);
    try std.testing.expectEqual(@as(u32, 3), r.fb_wf_waiters);
    // Workflows 1 and 2 did not send yet, so they go before the next steps of workflow 0.
    var last: u64 = try frames.nextExec();
    try std.testing.expectEqual(@as(u64, 10), last);
    for ([_]u64{ 20, 30, 11, 12 }) |want| {
        try hostAnswers(r, h, 0, last);
        last = try frames.nextExec();
        try std.testing.expectEqual(want, last);
        try std.testing.expectEqual(@as(u32, 1), r.fb_admitted);
    }
    try hostAnswers(r, h, 0, last);
    try std.testing.expectEqual(@as(u32, 0), r.fb_inflight.count());
    try std.testing.expectEqual(@as(u32, 0), r.fb_waiting_n);
}

test "fallback: a lost connection gives the places of its steps back" {
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host };
    try t.start();
    defer t.deinit();
    const r = t.r;
    r.fb_version = 2;
    r.fb_target = 1;
    const h0 = try fakeHostConn(r, 0);
    fakeHostStep(r, 0, 7, 1);
    try std.testing.expectEqual(@as(u32, 1), r.fb_admitted);
    try hostWrite(h0, "{\"worker_lost\":{\"reason\":\"it ran out of memory\"}}");
    sys.close(h0);
    r.readFallback(0);
    try std.testing.expectEqual(@as(u32, 0), r.fb_admitted);
    try std.testing.expectEqual(@as(u32, 0), r.fb_wf_inflight[0]);
    try std.testing.expectEqual(@as(u64, 0), r.stats.host_inflight.load(.monotonic));
}

test "fallback: with --fallback-wait-ms 0 a step with no host fails at once" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try programs.loop(mod_arena.allocator(), null)};
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host, .modules = &mods, .fallback_wait_ms = 0 };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const a = fakeAction(7, 1);
    r.sendFrame(a, a.payload, false);
    try std.testing.expectEqual(@as(usize, 0), r.fb_waitq.items.len);
    r.events.clearRetainingCapacity();
    r.serviceFallback(sys.nowMs());
    try std.testing.expectEqualStrings(fb_down, (findEvent(r, 7, 1) orelse return error.NoEvent).payload);
}

test "fallback: the steps that wait go out in arrival order" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const mods = [_][]const u8{try programs.loop(mod_arena.allocator(), null)};
    var t: TestRunner = .{ .arena = undefined, .fallback = no_host, .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    for ([_]u32{ 3, 1, 2 }) |seq| {
        const a = fakeAction(7, seq);
        r.sendFrame(a, a.payload, false);
    }
    try std.testing.expectEqual(@as(usize, 3), r.fb_waitq.items.len);
    const h0 = try fakeHostConn(r, 0);
    defer sys.close(h0);
    r.sendWaiting();
    // The three frames in one read, or in a few: the host reads them in order.
    var buf: [4096]u8 = undefined;
    var n: usize = 0;
    var tries: u32 = 0;
    while (tries < 500 and n < buf.len) : (tries += 1) {
        if (framesIn(buf[0..n]) == 3) break;
        switch (sys.readSome(h0, buf[n..])) {
            .n => |k| n += k,
            .again, .closed => napTest(),
        }
    }
    var off: usize = 0;
    for ([_]u32{ 3, 1, 2 }) |want| {
        try std.testing.expect(off + 4 <= n);
        const len = std.mem.readInt(u32, buf[off..][0..4], .little);
        try std.testing.expect(off + 4 + len <= n);
        try std.testing.expectEqual(want, try frameSeq(buf[off + 4 ..][0..len]));
        off += 4 + len;
    }
    try std.testing.expectEqual(n, off);
    try std.testing.expectEqual(@as(usize, 0), r.fb_waitq.items.len);
}

test "a stored response gives its step a result through the event list" {
    const Env = struct {
        extern "c" fn setenv(name: [*:0]const u8, value: [*:0]const u8, overwrite: c_int) c_int;
        extern "c" fn unsetenv(name: [*:0]const u8) c_int;
    };
    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();
    var root_buf: [256]u8 = undefined;
    const root = try std.fmt.bufPrintSentinel(&root_buf, ".zig-cache/tmp/{s}", .{tmp.sub_path}, 0);
    try std.testing.expectEqual(@as(c_int, 0), Env.setenv("WFRT_BINARY_DATA_STORAGE_PATH", root, 1));
    defer _ = Env.unsetenv("WFRT_BINARY_DATA_STORAGE_PATH");
    var t: TestRunner = .{ .arena = undefined };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const blobs = r.blobs orelse return error.TestExpectedEqual;
    // No execution 5 runs here, so the response has no workflow for its path:
    // the step gets the reason, and the row of the store is free again.
    const before = r.events.items.len;
    const h = try blobs.reserve("{}");
    try std.testing.expect(Runner.egressStored(r, 5, 2, h, .{ .status = 200, .header_lines = "content-type: text/plain\r\n", .body = "", .json = false }, "/a.txt", 2));
    blobs.putBody(h, "hi", sys.nowMs());
    r.drainStored(sys.nowMs());
    try std.testing.expectEqual(before + 1, r.events.items.len);
    const ev = r.events.items[before];
    try std.testing.expectEqual(core.EventKind.effect_err, ev.kind);
    try std.testing.expectEqual(@as(u64, 5), ev.exec_id);
    try std.testing.expect(std.mem.indexOf(u8, ev.payload, "workflow id") != null);
    try std.testing.expect(!blobs.busy() and blobs.nextDone() == null);
    // A result that finds no room waits in the store, then goes out.
    const free = r.events.capacity - r.resultReserve() - r.events.items.len;
    for (0..free) |_| r.events.appendAssumeCapacity(.{ .kind = .cancel, .exec_id = 1 });
    const h2 = try blobs.reserve("{}");
    try std.testing.expect(Runner.egressStored(r, 6, 1, h2, .{ .status = 200, .header_lines = "", .body = "", .json = false }, "/", 0));
    blobs.putBody(h2, "", sys.nowMs());
    r.drainStored(sys.nowMs());
    try std.testing.expect(blobs.nextDone() != null);
    r.events.items.len -= 1;
    r.drainStored(sys.nowMs());
    try std.testing.expect(blobs.nextDone() == null);
    try std.testing.expectEqual(@as(u64, 6), r.events.items[r.events.items.len - 1].exec_id);

    // `getBinaryMetadata`: the service call `binaryData.metadata` reads the companion
    // file in the shard. The result is the JSON of that file, not a response.
    r.events.items.len = before;
    const h3 = try blobs.reserve("{\"fileName\":\"a.txt\"}");
    blobs.put(h3, .{ .exec_id = 7, .seq = 1, .workflow = "wf1", .execution = "wfrt-7", .head = "{}", .content_disposition = "", .content_type = "text/plain", .url_path = "/a.txt", .body = "hello", .now_ms = sys.nowMs() });
    const put = blobs.nextDone() orelse return error.TestExpectedEqual;
    try std.testing.expect(put.ok and put.stored);
    var call_buf: [512]u8 = @splat(0);
    const handle = http.member(put.payload[put.head_len..], "$binary") orelse return error.TestExpectedEqual;
    const call = try std.fmt.bufPrint(&call_buf, "{{\"name\":\"meta\",\"service\":\"binaryData\",\"op\":\"metadata\",\"args\":{{\"id\":{s}}}}}", .{http.member(handle, "id") orelse return error.TestExpectedEqual});
    blobs.take(put);
    r.startService(.{ .kind = .dispatch, .effect_kind = .service, .exec_id = 8, .seq = 4, .module = 0, .step = 0, .attempt = 0, .payload = call });
    r.drainStored(sys.nowMs());
    const meta = r.events.items[r.events.items.len - 1];
    try std.testing.expectEqual(core.EventKind.effect_ok, meta.kind);
    try std.testing.expectEqual(@as(u64, 8), meta.exec_id);
    try std.testing.expectEqual(@as(u32, 0), meta.aux);
    try std.testing.expectEqualStrings("{\"fileName\":\"a.txt\",\"mimeType\":\"text/plain\",\"fileSize\":5}", meta.payload);
    // An id that is not of the file store is an error of the step, at once.
    r.startService(.{ .kind = .dispatch, .effect_kind = .service, .exec_id = 9, .seq = 1, .module = 0, .step = 0, .attempt = 0, .payload = "{\"service\":\"binaryData\",\"op\":\"metadata\",\"args\":{\"id\":\"filesystem-v2:../x\"}}" });
    const bad = r.events.items[r.events.items.len - 1];
    try std.testing.expectEqual(core.EventKind.effect_err, bad.kind);
    try std.testing.expect(std.mem.indexOf(u8, bad.payload, "not an id of the file system store") != null);
    try std.testing.expect(!blobs.busy() and blobs.nextDone() == null);
}

// ---- the `sql` effect through the shard (pg.zig, spec 9.10) ---------------------

const pg_fake = @import("pg_fake.zig");
const kind_pg_fake: u8 = 15;

/// `run(t) { return await Query(t) }`: a `sql` step whose arguments are the trigger.
fn sqlModule(gpa: std.mem.Allocator) ![]u8 {
    const Asm = core_lib.asm_.Asm;
    var m: Asm = .{ .gpa = gpa, .meta = "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"w\"}]}" };
    defer m.deinit();
    const call = try m.step("Query", .sql);
    m.beginFunc();
    try m.emitBc(.loadi, 3, call);
    try m.emit(.@"suspend", @backingInt(core_lib.module.EffectKind.sql), 4, 3, 0);
    try m.emit(.ret, 0, 4, 0, 0);
    try m.endFunc("run", 1, 5, 0);
    return m.finish();
}

/// Run the loop of the shard for the `sql` client and the scripted server
/// until the shard has `want` events for the core.
fn pumpSql(r: *Runner, server: *pg_fake.Server, want: usize) !void {
    var ready: [64]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
    for (0..2000) |_| {
        if (r.events.items.len >= want) return;
        const n = r.poller.wait(&ready, 5);
        for (ready[0..n]) |ev| {
            if (ev.token >> 56 == kind_pg_fake) server.onReady(ev) else try r.onReady(ev);
        }
        r.sql.afterEvents(sys.nowMs());
        r.drainSql();
    }
    return error.NoResult;
}

/// Start a run of module 0 with `args` as its trigger and give its `sql`
/// step to the client, as `perform` does.
fn startSqlRun(r: *Runner, args: []const u8) !u64 {
    const tk = try r.sh.tick(sys.nowMs(), &.{.{ .kind = .start, .aux = 0, .payload = args }});
    defer r.sh.endBatch();
    for (tk.actions) |a| {
        if (a.kind != .dispatch) continue;
        try std.testing.expectEqual(core_lib.module.EffectKind.sql, a.effect_kind);
        try r.dispatch(a);
        return a.exec_id;
    }
    return error.NoDispatch;
}

/// Give the events of the shard to the core; the payload of the `finished`
/// action of `exec`, copied.
fn finishSqlRun(r: *Runner, gpa: std.mem.Allocator, exec: u64) ![]const u8 {
    const tk = try r.sh.tick(sys.nowMs(), r.events.items);
    defer r.sh.endBatch();
    r.events.clearRetainingCapacity();
    for (tk.actions) |a| {
        if (a.kind == .finished and a.exec_id == exec) return gpa.dupe(u8, a.payload);
    }
    return error.NotFinished;
}

test "a sql step goes to the PostgreSQL client, and its result resumes the run" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const gpa = mod_arena.allocator();
    const mods = [_][]const u8{try sqlModule(gpa)};
    var t: TestRunner = .{ .arena = std.heap.ArenaAllocator.init(std.testing.allocator), .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const server = try gpa.create(pg_fake.Server);
    try server.init(gpa, &r.poller, kind_pg_fake);
    defer server.deinit();
    const rules = [_]pg_fake.Rule{
        .{ .text = "select $1::int4 as x", .cols = &.{.{ .name = "x", .oid = 23 }}, .rows = &.{&.{"42"}}, .tag = "SELECT 1" },
        .{ .text = "select boom", .run_fail = .{ .code = "22012", .message = "division by zero" } },
    };
    server.rules = &rules;
    const doc = try std.fmt.allocPrint(gpa, "{{\"db\":{{\"data\":{{\"host\":\"127.0.0.1\",\"port\":{d},\"user\":\"alice\",\"password\":\"p\",\"database\":\"app\"}}}}}}", .{server.port});
    const store = try gpa.create(creds.Store);
    store.* = try creds.Store.parse(gpa, doc);
    r.egress.cfg.credentials = store;

    // The result of the call is the value of the step.
    const one = try startSqlRun(r, "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select $1::int4 as x\",\"values\":[42]}]}");
    try std.testing.expectEqual(@as(usize, 0), r.events.items.len);
    try pumpSql(r, server, 1);
    try std.testing.expectEqual(core.EventKind.effect_ok, r.events.items[0].kind);
    try std.testing.expectEqual(one, r.events.items[0].exec_id);
    try std.testing.expectEqualStrings("{\"results\":[{\"rows\":[{\"x\":42}],\"command\":\"SELECT\",\"rowCount\":1}]}", r.events.items[0].payload);
    const done = try finishSqlRun(r, gpa, one);
    try std.testing.expect(std.mem.indexOf(u8, done, "{\"x\":42}") != null);
    try std.testing.expectEqual(@as(u32, 1), server.count("bind 42"));
    // An error of the database is data of the result, not a failed step.
    const two = try startSqlRun(r, "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select boom\"}]}");
    try pumpSql(r, server, 1);
    try std.testing.expectEqual(core.EventKind.effect_ok, r.events.items[0].kind);
    try std.testing.expect(std.mem.indexOf(u8, r.events.items[0].payload, "\"code\":\"22012\",\"message\":\"division by zero\"") != null);
    _ = try finishSqlRun(r, gpa, two);
    // A call that the client refuses when it starts is an effect error with its text.
    const three = try startSqlRun(r, "{\"credential\":\"nope\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select boom\"}]}");
    try pumpSql(r, server, 1);
    try std.testing.expectEqual(core.EventKind.effect_err, r.events.items[0].kind);
    try std.testing.expectEqual(three, r.events.items[0].exec_id);
    try std.testing.expectEqualStrings("sql: the credential slot of the call is not in the credentials", r.events.items[0].payload);
    try std.testing.expect(!server.failed);
    try std.testing.expectEqual(@as(u64, 1), r.sql.counters.connects);
}

test "sql results wait in the client while the event list has no room, and a call without a slot fails at once" {
    var t: TestRunner = .{ .arena = std.heap.ArenaAllocator.init(std.testing.allocator) };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const slots = r.opts.sql.max_reqs;
    // Calls with bad arguments end at once and hold their slots until the shard takes the results.
    for (0..slots) |i| r.startSql(.{ .kind = .dispatch, .effect_kind = .sql, .exec_id = 9, .seq = std.math.cast(u32, i + 1).?, .module = 0, .step = 0, .attempt = 0, .payload = "{}" });
    try std.testing.expectEqual(@as(usize, 0), r.events.items.len);
    // No slot is free: the next call fails with the limit error, as an event.
    r.startSql(.{ .kind = .dispatch, .effect_kind = .sql, .exec_id = 10, .seq = 1, .module = 0, .step = 0, .attempt = 0, .payload = "{}" });
    try std.testing.expectEqual(@as(usize, 1), r.events.items.len);
    try std.testing.expectEqual(core.EventKind.effect_err, r.events.items[0].kind);
    try std.testing.expectEqual(@as(u64, 10), r.events.items[0].exec_id);
    try std.testing.expect(std.mem.indexOf(u8, r.events.items[0].payload, "--sql-max-requests") != null);
    r.events.clearRetainingCapacity();
    // A full event list takes no result; the results come later, oldest first.
    const free = r.events.capacity - r.resultReserve();
    for (0..free) |_| r.events.appendAssumeCapacity(.{ .kind = .cancel, .exec_id = 1 });
    r.drainSql();
    try std.testing.expectEqual(free, r.events.items.len);
    var next_seq: u32 = 1;
    for (0..slots) |_| {
        if (next_seq > slots) break;
        r.events.clearRetainingCapacity();
        r.drainSql();
        try std.testing.expect(r.events.items.len > 0 and r.events.items.len + r.resultReserve() <= r.events.capacity);
        for (r.events.items) |ev| {
            try std.testing.expectEqual(core.EventKind.effect_err, ev.kind);
            try std.testing.expectEqualStrings("sql: the dialect must be 'postgres'", ev.payload);
            try std.testing.expectEqual(next_seq, ev.seq);
            next_seq += 1;
        }
    }
    try std.testing.expectEqual(slots + 1, next_seq);
    // Every slot is free again.
    try std.testing.expectEqual(@as(?pg.Done, null), r.sql.nextDone());
    r.startSql(.{ .kind = .dispatch, .effect_kind = .sql, .exec_id = 11, .seq = 1, .module = 0, .step = 0, .attempt = 0, .payload = "{}" });
    try std.testing.expectEqual(@as(u64, 1), r.sql.counters.refused);
}

const my_fake = @import("my_fake.zig");

/// Run the loop of the shard for the MySQL client and the scripted server
/// until the shard has `want` events for the core.
fn pumpMysql(r: *Runner, server: *my_fake.Server, want: usize) !void {
    var ready: [64]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
    for (0..2000) |_| {
        if (r.events.items.len >= want) return;
        const n = r.poller.wait(&ready, 5);
        for (ready[0..n]) |ev| {
            if (ev.token >> 56 == kind_pg_fake) server.onReady(ev) else try r.onReady(ev);
        }
        r.mysql.afterEvents(sys.nowMs());
        r.drainSql();
    }
    return error.NoResult;
}

test "a sql step with the dialect mysql goes to the MySQL client, and its result resumes the run" {
    var mod_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer mod_arena.deinit();
    const gpa = mod_arena.allocator();
    const mods = [_][]const u8{try sqlModule(gpa)};
    var t: TestRunner = .{ .arena = std.heap.ArenaAllocator.init(std.testing.allocator), .modules = &mods };
    try t.start();
    defer t.deinit();
    const r = t.r;
    const server = try gpa.create(my_fake.Server);
    try server.init(gpa, &r.poller, kind_pg_fake);
    defer server.deinit();
    const rules = [_]my_fake.Rule{
        .{ .text = "select 42 as x", .cols = &.{.{ .name = "x", .type = 3 }}, .rows = &.{&.{"42"}} },
        .{ .text = "select boom", .fail = .{ .code = 1146, .state = "42S02", .message = "Table 'app.boom' doesn't exist" } },
    };
    server.rules = &rules;
    server.password = "p";
    r.opts.sql_mysql = true;
    const doc = try std.fmt.allocPrint(gpa, "{{\"db\":{{\"data\":{{\"host\":\"127.0.0.1\",\"port\":{d},\"user\":\"alice\",\"password\":\"p\",\"database\":\"app\"}}}}}}", .{server.port});
    const store = try gpa.create(creds.Store);
    store.* = try creds.Store.parse(gpa, doc);
    r.egress.cfg.credentials = store;

    // The result of the call is the value of the step.
    const one = try startSqlRun(r, "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select 42 as x\",\"simple\":true}]}");
    try std.testing.expectEqual(@as(usize, 0), r.events.items.len);
    try pumpMysql(r, server, 1);
    try std.testing.expectEqual(core.EventKind.effect_ok, r.events.items[0].kind);
    try std.testing.expectEqual(one, r.events.items[0].exec_id);
    try std.testing.expectEqualStrings("{\"results\":[{\"sets\":[{\"rows\":[{\"x\":42}],\"command\":\"SELECT\",\"rowCount\":1}]}]}", r.events.items[0].payload);
    const done = try finishSqlRun(r, gpa, one);
    try std.testing.expect(std.mem.indexOf(u8, done, "{\"x\":42}") != null);
    try std.testing.expectEqual(@as(u32, 1), server.count("query select 42 as x"));
    // An error of the database is data of the result, not a failed step.
    const two = try startSqlRun(r, "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select boom\",\"simple\":true}]}");
    try pumpMysql(r, server, 1);
    try std.testing.expectEqual(core.EventKind.effect_ok, r.events.items[0].kind);
    try std.testing.expect(std.mem.indexOf(u8, r.events.items[0].payload, "\"code\":\"ER_NO_SUCH_TABLE\",\"errno\":1146") != null);
    _ = try finishSqlRun(r, gpa, two);
    // A call that the client refuses when it starts is an effect error with its text.
    const three = try startSqlRun(r, "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select 42 as x\"}]}");
    try pumpMysql(r, server, 1);
    try std.testing.expectEqual(core.EventKind.effect_err, r.events.items[0].kind);
    try std.testing.expectEqual(three, r.events.items[0].exec_id);
    try std.testing.expectEqualStrings("sql: a statement for mysql must have simple: true", r.events.items[0].payload);
    try std.testing.expect(!server.failed);
    try std.testing.expectEqual(@as(u64, 1), r.mysql.counters.connects);
    // The PostgreSQL client took none of these calls.
    try std.testing.expectEqual(@as(u64, 0), r.sql.counters.started);
}
