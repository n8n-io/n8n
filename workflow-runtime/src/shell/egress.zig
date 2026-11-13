//! The outbound HTTP client of one shard: HTTP/1.1 and HTTP/2, a
//! connection pool keyed by origin (scheme, host, port) with keep-alive,
//! TLS through `tls.zig`, names through `dns.zig`, Content-Length,
//! chunked and close-delimited bodies, redirects for GET and HEAD, and
//! connect, read and total timeouts.
//!
//! Each origin has its own limits (`Limits`, set by `--egress-origin`
//! rules): connections, requests on the wire, waiting requests, a request
//! rate, and timeouts. Requests over a limit wait in the origin's queue; a
//! full queue fails the request with a limit error. 429 and 503 answers
//! halve the requests that the origin may have on the wire, and successes
//! raise it again (AIMD). A `Retry-After` holds the retries of failed
//! steps (attempt > 0) until it passes. No request is retried here because
//! of its status: that stays the step's own retry setting, as in v1.
//!
//! HTTP/2 (`http2.zig`, `hpack.zig`): an https origin is offered `h2` with
//! ALPN; HTTP/1.1 stays the fallback. Requests to an h2 origin share its
//! connections as streams, up to the server's SETTINGS_MAX_CONCURRENT_STREAMS
//! and `h2_streams`. The response has the same shape as over HTTP/1.1.
//!
//! Every buffer is reserved at start: a request buffer per request slot
//! (an h2 response goes after the request in it), a read and a write
//! buffer per connection, the HTTP/2 state of `h2_conns` connections, and a
//! few large buffers of the maximum body size for bodies that do not fit.
//! Pages of a large buffer go back to the system after use.
//!
//! The client runs inside the shard's event loop and never blocks. Results
//! go to the `Sink` at once; a slice in a result is valid only during the
//! call.
const std = @import("std");
const core_lib = @import("core");
const sys = @import("sys.zig");
const http = @import("http.zig");
const http2 = @import("http2.zig");
const hpack = @import("hpack.zig");
const tls = @import("tls.zig");
const dns = @import("dns.zig");
const gym_mod = @import("gym.zig");
const creds = @import("creds.zig");
const request = @import("request.zig");
const Out = creds.Out;

/// HTTP/2 use for an origin.
pub const H2Mode = enum(u8) {
    /// The client setting (`Config.h2`).
    inherit,
    off,
    /// Offer `h2` with ALPN on https.
    on,
    /// Also speak h2 without TLS to an http:// origin (prior knowledge, RFC 9113 3.3).
    prior,
};

/// Which requests share connections. Every mode keys on the origin
/// (scheme, host, port); TLS settings (trust store, `--insecure-tls`) are
/// the same for all requests of a process, and SNI is the host.
pub const Pool = enum {
    /// Requests of all workflows share connections.
    shared,
    /// Each workflow (the key the shell passes, `--egress-pool workflow`)
    /// has its own connections.
    workflow,
    /// Each credential slot of each credential store has its own
    /// connections; requests without a credential share.
    credential,
};

/// Limits of one origin. 0 means "the client default" in a rule and
/// "no limit of its own" in the defaults.
pub const Limits = struct {
    /// Open connections.
    max_conns: u32 = 0,
    /// Requests on the wire at once.
    max_inflight: u32 = 0,
    /// Requests that wait for a connection, a stream or the rate.
    max_queue: u32 = 0,
    /// Requests per second, with `burst` at once (default: rate / 10, at least 1).
    rate: u32 = 0,
    burst: u32 = 0,
    connect_ms: u32 = 0,
    /// Longest wait for the next byte of a response.
    read_ms: u32 = 0,
    /// Total time of a request without `timeoutMs`.
    total_ms: u32 = 0,
    h2: H2Mode = .inherit,
    /// 1 off, 2 on; 0 the client setting.
    aimd: u8 = 0,

    /// `b` over `a`, field by field, where `b` sets a value.
    fn over(a: Limits, b: Limits) Limits {
        var r = a;
        inline for (@typeInfo(Limits).@"struct".field_names) |name| {
            const v = @field(b, name);
            if (@TypeOf(v) == H2Mode) {
                if (v != .inherit) @field(r, name) = v;
            } else if (v != 0) @field(r, name) = v;
        }
        return r;
    }
};

/// `--egress-origin "<host>[:<port>] key=value ..."` (spaces or commas
/// between the parts). The host is a name,
/// `*.<suffix>` or `*`. Keys: conns, inflight, queue, rate, burst,
/// connect-ms, read-ms, timeout-ms, h2 (on, off, prior), aimd (on, off).
pub const Rule = struct {
    host: []const u8,
    /// `*.<suffix>`: `host` holds `.<suffix>`.
    suffix: bool = false,
    any: bool = false,
    port: u16 = 0,
    limits: Limits = .{},

    pub fn parse(text: []const u8) error{BadRule}!Rule {
        var it = std.mem.tokenizeAny(u8, text, " \t,");
        const target = it.next() orelse return error.BadRule;
        var r: Rule = .{ .host = target };
        if (std.mem.lastIndexOfScalar(u8, target, ':')) |colon| {
            if (std.mem.indexOfScalar(u8, target, ']') == null or colon > std.mem.indexOfScalar(u8, target, ']').?) {
                r.port = std.fmt.parseInt(u16, target[colon + 1 ..], 10) catch return error.BadRule;
                r.host = target[0..colon];
            }
        }
        if (std.mem.eql(u8, r.host, "*")) {
            r.any = true;
        } else if (std.mem.startsWith(u8, r.host, "*.")) {
            r.suffix = true;
            r.host = r.host[1..];
        }
        if (r.host.len == 0 or r.host.len > dns.max_host) return error.BadRule;
        var guard: u32 = 0;
        while (it.next()) |kv| : (guard += 1) {
            if (guard > 32) return error.BadRule;
            const eq = std.mem.indexOfScalar(u8, kv, '=') orelse return error.BadRule;
            const k = kv[0..eq];
            const v = kv[eq + 1 ..];
            const L = &r.limits;
            if (std.mem.eql(u8, k, "h2")) {
                L.h2 = if (std.mem.eql(u8, v, "on")) .on else if (std.mem.eql(u8, v, "off")) .off else if (std.mem.eql(u8, v, "prior")) .prior else return error.BadRule;
                continue;
            }
            if (std.mem.eql(u8, k, "aimd")) {
                L.aimd = if (std.mem.eql(u8, v, "on")) 2 else if (std.mem.eql(u8, v, "off")) 1 else return error.BadRule;
                continue;
            }
            const n = std.fmt.parseInt(u32, v, 10) catch return error.BadRule;
            if (std.mem.eql(u8, k, "conns")) L.max_conns = n else if (std.mem.eql(u8, k, "inflight")) L.max_inflight = n else if (std.mem.eql(u8, k, "queue")) L.max_queue = n else if (std.mem.eql(u8, k, "rate")) L.rate = n else if (std.mem.eql(u8, k, "burst")) L.burst = n else if (std.mem.eql(u8, k, "connect-ms")) L.connect_ms = n else if (std.mem.eql(u8, k, "read-ms")) L.read_ms = n else if (std.mem.eql(u8, k, "timeout-ms")) L.total_ms = n else return error.BadRule;
        }
        return r;
    }

    fn matches(r: *const Rule, host: []const u8, port: u16) bool {
        if (r.port != 0 and r.port != port) return false;
        if (r.any) return true;
        if (r.suffix) return host.len > r.host.len and std.ascii.endsWithIgnoreCase(host, r.host);
        return std.ascii.eqlIgnoreCase(host, r.host);
    }
};

pub const Config = struct {
    max_conns: u32 = 4096,
    /// Requests in flight, waiting ones included.
    max_reqs: u32 = 4096,
    max_origins: u32 = 1024,
    req_buf: u32 = 8 << 10,
    rbuf: u32 = 16 << 10,
    wbuf: u32 = 16 << 10,
    max_body: u32 = 16 << 20,
    big_slots: u32 = 8,
    connect_timeout_ms: i64 = 10_000,
    default_timeout_ms: i64 = 300_000,
    /// 0: no read timeout (v1 has none).
    read_timeout_ms: i64 = 0,
    idle_timeout_ms: i64 = 30_000,
    max_redirects: u8 = 5,
    /// Limits of every origin, and the rules that change them.
    origin: Limits = .{},
    rules: []const Rule = &.{},
    /// Offer `h2` to https origins.
    h2: bool = true,
    /// Connections that can speak HTTP/2 at once (each has its own state).
    h2_conns: u32 = 256,
    /// Our cap of streams on one connection.
    h2_streams: u32 = 256,
    h2_stream_window: u32 = 1 << 20,
    h2_conn_window: u32 = 16 << 20,
    /// The largest response header block (SETTINGS_MAX_HEADER_LIST_SIZE).
    h2_block: u32 = 64 << 10,
    /// SETTINGS_HEADER_TABLE_SIZE (HPACK dynamic table of a response).
    h2_table: u32 = 4096,
    /// The largest single response header field.
    h2_field: u32 = 16 << 10,
    /// The longest `Retry-After` hold.
    retry_after_max_ms: i64 = 60_000,
    /// A request without an answer after this long prints one line with
    /// its state to stderr (0: never). A diagnostic, not a timeout.
    stuck_ms: i64 = 15_000,
    /// Halve an origin's requests on the wire after a 429 or 503.
    aimd: bool = true,
    /// Which requests may share a connection (`--egress-pool`).
    pool: Pool = .shared,
    insecure_tls: bool = false,
    credentials: ?*const creds.Store = null,
    /// `--ca-file`: more trusted CA certificates.
    ca_file: ?[:0]const u8 = null,
    /// `--gym-env`: the ai-gym's name and address rules.
    gym: ?*const gym_mod.Gym = null,
    /// `GYM_DNS` as `host:port`, for c-ares.
    dns_servers: ?[:0]const u8 = null,
};

/// Sizes for a load: `rate` requests per second that each take
/// `latency_ms`, in at most `memory_mb` of reserved egress memory
/// (0: no budget). Little's law gives the requests in flight.
pub const Sizing = struct { max_reqs: u32, max_conns: u32 };

pub fn sizeFor(rate: u32, latency_ms: u32, memory_mb: u32, cfg: Config) Sizing {
    const in_flight: u64 = @max(64, (@as(u64, rate) * latency_ms + 999) / 1000);
    // Headroom for bursts, retries and waiting requests.
    var reqs: u64 = in_flight * 3 / 2;
    // HTTP/1.1 needs one connection per request on the wire.
    var conns: u64 = in_flight * 5 / 4;
    if (memory_mb > 0) {
        const budget = @as(u64, memory_mb) << 20;
        const per_req: u64 = cfg.req_buf + @sizeOf(Req);
        const per_conn: u64 = cfg.rbuf + cfg.wbuf + @sizeOf(Conn);
        reqs = @min(reqs, budget / 2 / per_req);
        conns = @min(conns, budget / 2 / per_conn);
    }
    return .{ .max_reqs = @intCast(@max(16, @min(reqs, 1 << 22))), .max_conns = @intCast(@max(16, @min(conns, 1 << 20))) };
}

pub const Response = struct { status: u32, header_lines: []const u8, body: []const u8, json: bool };
pub const Result = union(enum) { ok: Response, err: []const u8 };

pub const Sink = struct {
    ctx: *anyopaque,
    done: *const fn (ctx: *anyopaque, exec_id: u64, seq: u32, r: Result) void,
};

/// Counters for `--stats` and the tests.
pub const Counters = struct {
    /// Read calls on egress sockets (TLS or plain), and the ones that found
    /// nothing. Reads follow readiness: they grow with traffic, never with
    /// idle connections.
    reads: u64 = 0,
    empty_reads: u64 = 0,
    h1_conns: u64 = 0,
    h2_conns: u64 = 0,
    h2_streams: u64 = 0,
    queue_full: u64 = 0,
    overload: u64 = 0,
    requeued: u64 = 0,
};

const none: u32 = std.math.maxInt(u32);
/// The timer wheel: 4,096 slots of 100 ms (409.6 s). A later time waits
/// in the last slot and is put back when that slot comes round.
const wheel_tick_ms = 100;
const wheel_len = 4096;
/// Room for chunk framing on top of the largest body.
const big_slack = 64 << 10;
const big_release_bytes = 256 << 10;
/// Streams a new h2 connection is expected to take, to decide how many
/// connections to open for a queue.
const h2_assumed_streams = 100;
/// The least time between two AIMD cuts of one origin.
const aimd_cut_gap_ms = 100;

const RState = enum { free, queued, active };

/// Why an HTTP/2 response fails; the message is made when it does, with
/// the same words as over HTTP/1.1.
const RespFail = enum { none, body_limit, body_declared, no_big, window, headers_no_big, no_status, interim_end };

const Req = struct {
    state: RState = .free,
    exec_id: u64 = 0,
    seq: u32 = 0,
    small: []u8,
    big: u32 = none,
    built: request.Built = .{},
    /// The parsed URL (slices into the request buffer), set at build
    /// and at each redirect: a parse per use cost a visible share of W3.
    url: http.Url = undefined,
    origin: u32 = none,
    prev: u32 = none,
    next: u32 = none,
    deadline_ms: i64 = 0,
    timeout_ms: i64 = 0,
    redirects: u8 = 0,
    retried: bool = false,
    /// The step's attempt (0 for the first); a retry waits out `Retry-After`.
    attempt: u32 = 0,
    /// The pool key (0: shared) that is part of the origin key.
    tenant: u64 = 0,
    /// Bumped each time the slot is used: a stream's map entry carries it,
    /// so a frame can never reach a later owner of the same slot.
    gen: u32 = 0,
    /// The timer wheel: the slot it waits in (`none`: not in it), and its
    /// neighbours there.
    w_slot: u32 = none,
    w_prev: u32 = none,
    w_next: u32 = none,
    /// The HTTP/1.1 connection that took it last (valid while that
    /// connection's `req` is this request).
    h1conn: u32 = none,
    started_ms: i64 = 0,
    stuck_reported: bool = false,
    /// In the origin's hold queue.
    held: bool = false,
    /// Counted in the origin's requests on the wire.
    on_wire: bool = false,
    // HTTP/2 stream.
    conn: u32 = none,
    sid: u32 = 0,
    s_prev: u32 = none,
    s_next: u32 = none,
    in_send: bool = false,
    hdrs_sent: bool = false,
    body_sent: u32 = 0,
    send_win: i64 = 0,
    recv_used: u32 = 0,
    wu_pending: u32 = 0,
    headers_done: bool = false,
    got_bytes: bool = false,
    /// The response cannot be taken: fail the stream once its frame is read.
    resp_fail: RespFail = .none,
    resp_big: u32 = none,
    hdr_len: u32 = 0,
    body_len: u32 = 0,
    status: u32 = 0,
    json: bool = false,
    ct_seen: bool = false,
    /// The response's content-length, read while its headers decode.
    clen: ?u64 = null,
    last_io_ms: i64 = 0,
};

const Origin = struct {
    used: bool = false,
    https: bool = false,
    port: u16 = 0,
    hash: u64 = 0,
    tenant: u64 = 0,
    host_len: u8 = 0,
    host: [dns.max_host]u8 = undefined,
    numeric: ?sys.Addr = null,
    /// The Host header and `:authority`: host (lower case, as Node.js's
    /// URL gives it), with the port when it is not the default. Made once,
    /// not on each request.
    auth: [dns.max_host + 8]u8 = undefined,
    auth_len: u16 = 0,
    /// The `:authority` field, HPACK-encoded once.
    auth_hpack: [dns.max_host + 16]u8 = undefined,
    auth_hpack_len: u16 = 0,
    addrs: dns.Addrs = .{},
    addrs_until_ms: i64 = 0,
    resolving: bool = false,
    dns_id: u16 = 0,
    idle: u32 = none,
    q_head: u32 = none,
    q_tail: u32 = none,
    /// Retries held by `Retry-After`.
    h_head: u32 = none,
    h_tail: u32 = none,
    queued: u32 = 0,
    nconns: u32 = 0,
    refs: u32 = 0,
    lim: Limits = .{},
    h2_ok: bool = false,
    /// HTTP/2 known to work (ALPN said h2, or prior knowledge).
    h2_known: bool = false,
    /// ALPN answered for this origin (h2 or not).
    alpn_known: bool = false,
    /// Connections that may speak h2 and have not yet had the server's
    /// SETTINGS (they will take more streams soon).
    h2_opening: u32 = 0,
    /// h2 connections that take new streams; the front has free streams
    /// when any has.
    h2_head: u32 = none,
    h2_tail: u32 = none,
    inflight: u32 = 0,
    /// AIMD: requests the origin may have on the wire; 0 when no 429 or
    /// 503 has cut it.
    aimd_limit: f32 = 0,
    aimd_cut_ms: i64 = 0,
    hold_until_ms: i64 = 0,
    tokens: f64 = 0,
    refill_ms: i64 = 0,
    /// Waiting for the rate or a hold: `pump` again at this time.
    wake_ms: i64 = 0,
    oidx_slot: u32 = none,

    fn hostSlice(o: *const Origin) []const u8 {
        return o.host[0..o.host_len];
    }

    fn authority(o: *const Origin) []const u8 {
        return o.auth[0..o.auth_len];
    }
};

const CState = enum { free, connecting, handshaking, idle, sending, reading, h2 };
const BodyKind = enum { none, length, chunked, close };
const Proto = enum { h1, h2 };

const Conn = struct {
    fd: c_int = -1,
    gen: u32 = 0,
    state: CState = .free,
    proto: Proto = .h1,
    origin: u32 = none,
    session: ?tls.Session = null,
    addrs: dns.Addrs = .{},
    addr_i: u8 = 0,
    port: u16 = 0,
    deadline_ms: i64 = 0,
    req: u32 = none,
    sent_count: u32 = 0,
    reused: bool = false,
    write_armed: bool = false,
    prev_idle: u32 = none,
    next_idle: u32 = none,
    rbuf: []u8,
    rlen: usize = 0,
    wbuf: []u8,
    wlen: usize = 0,
    wsent: usize = 0,
    seg1: []const u8 = &.{},
    seg1_sent: usize = 0,
    last_io_ms: i64 = 0,
    // The response being read.
    head: ?http.Head = null,
    kind: BodyKind = .none,
    body_buf: []u8 = &.{},
    big: u32 = none,
    body_len: usize = 0,
    raw_start: usize = 0,
    raw_end: usize = 0,
    chunked: http.Chunked = .{},
    got_bytes: bool = false,
    /// In `Client.read_list`: TLS may hold decrypted bytes for it.
    read_queued: bool = false,
    /// The HTTP/2 state slot, held from `open` while h2 is possible.
    h2: u32 = none,
    h2_prev: u32 = none,
    h2_next: u32 = none,
    h2_listed: bool = false,
    /// In `Client.flush_list`: h2 frames wait for the end of the round.
    flush_queued: bool = false,
    /// TLS ciphertext: received (`crbuf`) and to send (`cwbuf`), reserved
    /// at startup. OpenSSL reads and writes them through `bio`; only this
    /// file touches the socket.
    crbuf: []u8 = &.{},
    cwbuf: []u8 = &.{},
    bio: tls.BioBuf = .{},
};

/// A TLS record is at most 16 KB of data plus 256 bytes of overhead: each
/// ciphertext buffer holds two.
const tls_buf_bytes = 34 << 10;

/// The HTTP/2 state of one connection.
const H2 = struct {
    reader: http2.Reader,
    dec: hpack.Decoder,
    /// Stream id to request, open addressing; `none` is empty.
    smap: []u32,
    /// The generation of the request at each `smap` slot when its stream
    /// opened: the stream's owner.
    sgen: []u32,
    /// The stream id at each `smap` slot.
    skey: []u32,
    peer: http2.Settings = .{},
    got_settings: bool = false,
    send_win: i64 = http2.default_window,
    /// Bytes received since the last connection WINDOW_UPDATE.
    recv_used: u32 = 0,
    next_sid: u32 = 1,
    open: u32 = 0,
    send_head: u32 = none,
    send_tail: u32 = none,
    preface_sent: bool = false,
    settings_acks: u32 = 0,
    pings: [4][8]u8 = undefined,
    npings: u8 = 0,
    rsts: [32]struct { sid: u32, code: http2.ErrorCode } = undefined,
    nrsts: u8 = 0,
    conn_wu: u32 = 0,
    goaway: bool = false,
    /// A connection error to report after the frame that raised it.
    err: ?http2.ErrorCode = null,
    err_msg: []const u8 = "",
    /// Streams were freed and their origin may take more.
    freed: bool = false,
};

pub const Client = struct {
    cfg: Config,
    sink: Sink,
    poller: *sys.Poller,
    kind_conn: u8,
    tls_ctx: tls.Context,
    resolver: *dns.Resolver,
    conns: []Conn,
    cfree: []u32,
    ncfree: u32,
    reqs: []Req,
    rfree: []u32,
    nrfree: u32,
    origins: []Origin,
    /// Origin index by hash, open addressing; `none` is empty.
    oidx: []u32,
    last_origin: u32 = none,
    h2s: []H2,
    h2free: []u32,
    nh2free: u32,
    big_mem: []u8,
    big_size: usize,
    big_free: []u32,
    nbig_free: u32,
    big_used: []usize,
    /// The authority and path of an h2 request while it is encoded.
    tmp: []u8,
    queued_total: u32 = 0,
    /// Open HTTP/2 streams of all connections.
    h2_open_total: u32 = 0,
    /// Request timers: list heads by slot, and the last tick done.
    wheel: []u32 = &.{},
    wheel_tick: i64 = 0,
    pending_pump: bool = false,
    active: u32 = 0,
    now_ms: i64 = 0,
    last_scan_ms: i64 = 0,
    /// The earliest origin wake (rate or hold).
    wake_ms: i64 = std.math.maxInt(i64),
    counters: Counters = .{},
    /// Connections to read after a send (TLS), in `afterEvents`. A read
    /// there, not inside the send, keeps the path from a completed
    /// response to the next send of the connection free of recursion.
    read_list: []u32 = &.{},
    nread: u32 = 0,
    /// h2 connections with frames to write. They are written once per
    /// loop round, so the streams that a batch starts share one write
    /// (and one TLS record) per connection.
    flush_list: []u32 = &.{},
    nflush: u32 = 0,
    /// The nesting of `doRead` (tests check that it stays at 1).
    read_depth: u32 = 0,
    max_read_depth: u32 = 0,

    /// Reserve every buffer. `c` must not move afterwards.
    pub fn init(c: *Client, gpa: std.mem.Allocator, cfg_in: Config, sink: Sink, poller: *sys.Poller, kind_conn: u8, kind_dns: u8) !void {
        var cfg = cfg_in;
        cfg.h2_conns = @min(cfg.h2_conns, cfg.max_conns);
        cfg.h2_streams = std.math.clamp(cfg.h2_streams, 1, 1 << 16);
        cfg.h2_stream_window = std.math.clamp(cfg.h2_stream_window, http2.default_window, http2.max_window);
        cfg.h2_conn_window = std.math.clamp(cfg.h2_conn_window, http2.default_window, http2.max_window);
        cfg.h2_block = @max(cfg.h2_block, http2.default_max_frame + 64);
        cfg.h2_table = std.math.clamp(cfg.h2_table, 256, 1 << 16);
        cfg.h2_field = @max(cfg.h2_field, 1024);
        var oidx_len: u32 = 4;
        while (oidx_len < cfg.max_origins * 2) oidx_len *= 2;
        c.* = .{
            .cfg = cfg,
            .sink = sink,
            .poller = poller,
            .kind_conn = kind_conn,
            .tls_ctx = try tls.Context.client(cfg.insecure_tls, cfg.ca_file),
            .resolver = try gpa.create(dns.Resolver),
            .conns = try gpa.alloc(Conn, cfg.max_conns),
            .cfree = try gpa.alloc(u32, cfg.max_conns),
            .ncfree = cfg.max_conns,
            .reqs = try gpa.alloc(Req, cfg.max_reqs),
            .rfree = try gpa.alloc(u32, cfg.max_reqs),
            .nrfree = cfg.max_reqs,
            .origins = try gpa.alloc(Origin, cfg.max_origins),
            .oidx = try gpa.alloc(u32, oidx_len),
            .h2s = try gpa.alloc(H2, cfg.h2_conns),
            .h2free = try gpa.alloc(u32, cfg.h2_conns),
            .nh2free = cfg.h2_conns,
            .big_size = @as(usize, cfg.max_body) + big_slack,
            .big_mem = undefined,
            .big_free = try gpa.alloc(u32, cfg.big_slots),
            .nbig_free = cfg.big_slots,
            .big_used = try gpa.alloc(usize, cfg.big_slots),
            .tmp = try gpa.alloc(u8, request.max_url + 512),
            // While the list drains, a connection can be in the part being
            // drained and again in the new part: twice at most.
            .read_list = try gpa.alloc(u32, cfg.max_conns * 2),
            .flush_list = try gpa.alloc(u32, cfg.max_conns),
            .wheel = try gpa.alloc(u32, wheel_len),
        };
        @memset(c.wheel, none);
        try c.resolver.init(poller, kind_dns, cfg.dns_servers);
        c.big_mem = try core_lib.arena.reserve(gpa, u8, c.big_size * cfg.big_slots);
        for (c.conns, 0..) |*cn, i| {
            cn.* = .{ .rbuf = try core_lib.arena.reserve(gpa, u8, cfg.rbuf), .wbuf = try core_lib.arena.reserve(gpa, u8, cfg.wbuf) };
            if (tls.enabled) {
                cn.crbuf = try core_lib.arena.reserve(gpa, u8, tls_buf_bytes);
                cn.cwbuf = try core_lib.arena.reserve(gpa, u8, tls_buf_bytes);
                cn.bio = .{ .in = cn.crbuf, .out = cn.cwbuf };
            }
            c.cfree[i] = @intCast(cfg.max_conns - 1 - i);
        }
        for (c.reqs, 0..) |*r, i| {
            r.* = .{ .small = try core_lib.arena.reserve(gpa, u8, cfg.req_buf) };
            c.rfree[i] = @intCast(cfg.max_reqs - 1 - i);
        }
        for (c.origins) |*o| o.* = .{};
        @memset(c.oidx, none);
        var smap_len: u32 = 4;
        while (smap_len < cfg.h2_streams * 2) smap_len *= 2;
        for (c.h2s, 0..) |*h, i| {
            const ring = try core_lib.arena.reserve(gpa, u8, cfg.h2_table);
            const ents = try gpa.alloc(hpack.Entry, hpack.entriesFor(cfg.h2_table));
            const scratch = try core_lib.arena.reserve(gpa, u8, cfg.h2_field);
            h.* = .{
                .reader = http2.Reader.init(try core_lib.arena.reserve(gpa, u8, cfg.h2_block), http2.default_max_frame),
                .dec = hpack.Decoder.init(ring, ents, scratch),
                .smap = try gpa.alloc(u32, smap_len),
                .sgen = try gpa.alloc(u32, smap_len),
                .skey = try gpa.alloc(u32, smap_len),
            };
            @memset(h.smap, none);
            c.h2free[i] = @intCast(cfg.h2_conns - 1 - i);
        }
        for (c.big_free, 0..) |*b, i| b.* = @intCast(cfg.big_slots - 1 - i);
        @memset(c.big_used, 0);
    }

    /// Close the connections and free what OpenSSL and c-ares hold. The
    /// buffers belong to the shard's memory.
    pub fn deinit(c: *Client) void {
        for (c.conns) |*cn| {
            if (cn.session) |s| s.deinit();
            cn.session = null;
            if (cn.fd >= 0) sys.close(cn.fd);
            cn.fd = -1;
        }
        c.resolver.deinit();
        c.tls_ctx.deinit();
    }

    // ---- entry points ---------------------------------------------------------

    /// Start the request for one `http` effect.
    /// `store`: the workflow's credentials, or null for the global store.
    /// `attempt`: the step's attempt, 0 for the first.
    /// `workflow_key`: an id of the workflow, for `--egress-pool workflow`.
    pub fn start(c: *Client, exec_id: u64, seq: u32, args: []const u8, idem_key: ?[]const u8, store: ?*const creds.Store, attempt: u32, workflow_key: u64, now_ms: i64) void {
        c.now_ms = now_ms;
        const st = store orelse c.cfg.credentials;
        if (c.nrfree == 0) return c.sinkErr(exec_id, seq, "http: too many requests in flight ({d}, --egress-max-requests); the step can run again (limit)", .{c.cfg.max_reqs});
        c.nrfree -= 1;
        const ri = c.rfree[c.nrfree];
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .free);
        r.exec_id = exec_id;
        r.seq = seq;
        r.big = none;
        r.redirects = 0;
        r.retried = false;
        r.origin = none;
        r.attempt = attempt;
        r.gen +%= 1;
        r.tenant = switch (c.cfg.pool) {
            .shared => 0,
            .workflow => workflow_key +% 1,
            .credential => blk: {
                const name = http.member(args, "credential") orelse break :blk 0;
                if (std.mem.eql(u8, name, "null")) break :blk 0;
                break :blk std.hash.Wyhash.hash(@intFromPtr(st), name) | 1;
            },
        };
        r.held = false;
        r.on_wire = false;
        c.resetStream(ri);
        if (!c.build(ri, args, st, idem_key)) return;
        r.state = .active;
        c.active += 1;
        c.parseReqUrl(ri);
        c.route(ri) catch {};
    }

    /// Build the request; false when it failed (and was reported).
    fn build(c: *Client, ri: u32, args: []const u8, st: ?*const creds.Store, idem_key: ?[]const u8) bool {
        // The diagnostic buffer is written before it is read: safe builds
        // would fill it on every request.
        @setRuntimeSafety(false);
        var diag: request.Diag = .{};
        return c.buildWith(ri, args, st, idem_key, &diag);
    }

    fn buildWith(c: *Client, ri: u32, args: []const u8, st: ?*const creds.Store, idem_key: ?[]const u8, diag: *request.Diag) bool {
        const r = &c.reqs[ri];
        r.built = request.build(args, st, idem_key, r.small, diag) catch |e| blk: {
            if (e == error.Invalid) {
                c.failFree(ri, diag.text());
                return false;
            }
            // Too large for the small buffer: build it again in a large one.
            r.big = c.bigAcquire() orelse {
                c.failFree(ri, "http: the request is larger than the small buffer and all large buffers are in use");
                return false;
            };
            break :blk request.build(args, st, idem_key, c.bigSlice(r.big), diag) catch |e2| {
                if (e2 == error.Invalid) c.failFree(ri, diag.text()) else c.failFreeFmt(ri, "http: the request is larger than {d} bytes", .{c.big_size});
                return false;
            };
        };
        return true;
    }

    /// A readiness event for a connection token.
    pub fn onConn(c: *Client, idx: u32, gen: u32, ev: sys.Ready, now_ms: i64) void {
        c.now_ms = now_ms;
        if (idx >= c.conns.len) return;
        const cn = &c.conns[idx];
        if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
        // kqueue write interest is one-shot; epoll keeps it until cleared.
        if (ev.writable and !sys.is_linux) cn.write_armed = false;
        // TLS ciphertext that waited for the socket goes first.
        if (ev.writable and cn.session != null and cn.bio.out_len > 0) {
            if (!c.tlsFlush(idx)) return;
            if (cn.state == .reading or cn.state == .idle) {
                c.disarmWrite(idx);
                if (!ev.readable) return;
            }
        }
        switch (cn.state) {
            .free => {},
            .connecting => c.onConnect(idx),
            .handshaking => c.doHandshake(idx),
            .sending => c.doSend(idx),
            .reading => c.doRead(idx),
            .idle => if (ev.readable or ev.eof) c.idleRead(idx),
            .h2 => {
                if (ev.writable) c.h2Flush(idx);
                if (c.conns[idx].state == .h2 and c.conns[idx].gen & 0xFFFFFF == gen and (ev.readable or ev.eof)) c.doRead(idx);
            },
        }
    }

    pub fn onDns(c: *Client, fd: c_int, ev: sys.Ready) void {
        c.resolver.onReady(fd, ev);
    }

    /// Work after a round of events: finished DNS queries, queued requests
    /// that can go, timeouts. Call once per loop iteration.
    pub fn afterEvents(c: *Client, now_ms: i64) void {
        c.now_ms = now_ms;
        c.resolver.tick(now_ms);
        while (c.resolver.takeDone()) |d| c.onResolved(d);
        // Reads queued by sends. Reads queued while draining wait for the
        // next call, so one call does a bounded amount of work.
        const n = c.nread;
        for (c.read_list[0..n]) |ci| {
            const cn = &c.conns[ci];
            cn.read_queued = false;
            if (cn.fd >= 0 and (cn.state == .reading or cn.state == .h2)) c.doRead(ci);
        }
        std.mem.copyForwards(u32, c.read_list[0 .. c.nread - n], c.read_list[n..c.nread]);
        c.nread -= n;
        if (now_ms >= c.wake_ms) {
            c.wake_ms = std.math.maxInt(i64);
            c.pending_pump = true;
        }
        if (c.pending_pump) {
            c.pending_pump = false;
            for (c.origins, 0..) |*o, i| {
                if (o.used and o.queued > 0 and !o.resolving) c.pump(@intCast(i));
            }
        }
        if (now_ms - c.last_scan_ms >= 100) {
            c.last_scan_ms = now_ms;
            c.scanTimeouts();
        }
        c.flushQueued();
    }

    /// Write the frames that this round queued, one write per connection.
    fn flushQueued(c: *Client) void {
        const n = c.nflush;
        c.nflush = 0;
        for (c.flush_list[0..n]) |ci| {
            c.conns[ci].flush_queued = false;
            if (c.conns[ci].state == .h2) c.h2Flush(ci);
        }
    }

    fn h2Kick(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.flush_queued) return;
        std.debug.assert(c.nflush < c.flush_list.len);
        c.flush_list[c.nflush] = ci;
        c.nflush += 1;
        cn.flush_queued = true;
    }

    /// True when `afterEvents` has work now and the loop must not sleep.
    pub fn hasWork(c: *const Client) bool {
        return c.pending_pump or c.nread > 0 or c.nflush > 0 or c.resolver.hasDone();
    }

    /// The longest the loop may sleep before `afterEvents` has timed work
    /// (a rate or a hold), or null.
    pub fn sleepMs(c: *const Client, now_ms: i64) ?i64 {
        if (c.wake_ms == std.math.maxInt(i64)) return null;
        return @max(0, c.wake_ms - now_ms);
    }

    // ---- requests and origins -------------------------------------------------

    fn reqData(c: *Client, ri: u32) []u8 {
        const r = &c.reqs[ri];
        return if (r.big != none) c.bigSlice(r.big) else r.small;
    }

    fn reqUrl(c: *Client, ri: u32) http.Url {
        return c.reqs[ri].url;
    }

    fn parseReqUrl(c: *Client, ri: u32) void {
        const d = c.reqData(ri);
        // `request.build` and `redirect` checked this URL.
        c.reqs[ri].url = http.parseUrl(d[0..c.reqs[ri].built.url_len]) catch unreachable;
    }

    /// Put a request in the queue of its origin and try to send it.
    fn route(c: *Client, ri: u32) error{Failed}!void {
        const u = c.reqUrl(ri);
        if (u.https and !tls.enabled) {
            c.failReq(ri, "http: https needs TLS, and this build has none (built with -Dnet=false)");
            return error.Failed;
        }
        const oi = c.findOrigin(u, c.reqs[ri].tenant) orelse {
            c.failReq(ri, "http: too many different hosts are in use (--egress-max-origins)");
            return error.Failed;
        };
        const o = &c.origins[oi];
        if (o.lim.max_queue > 0 and o.queued >= o.lim.max_queue) {
            c.counters.queue_full += 1;
            c.reqs[ri].origin = none;
            c.failReqFmt(ri, "http: the queue for {s}:{d} is full ({d} requests wait; queue= in --egress-origin, or --egress-origin-queue); the step can run again (limit)", .{ o.hostSlice()[0..@min(o.host_len, 200)], o.port, o.queued });
            return error.Failed;
        }
        const r = &c.reqs[ri];
        const total: i64 = if (r.built.timeout_ms) |t| t else if (o.lim.total_ms > 0) o.lim.total_ms else c.cfg.default_timeout_ms;
        r.timeout_ms = total;
        r.deadline_ms = c.now_ms + total;
        r.started_ms = c.now_ms;
        r.stuck_reported = false;
        c.enqueue(oi, ri, false);
        // After `enqueue`, which sets the origin and so its read timeout.
        if (c.wheel_tick == 0) c.wheel_tick = @divFloor(c.now_ms, wheel_tick_ms);
        c.wheelInsert(ri, c.nextCheck(ri));
        c.pump(oi);
    }

    fn originHash(https: bool, port: u16, host: []const u8, tenant: u64) u64 {
        var h = std.hash.Wyhash.hash(port ^ tenant, host);
        if (https) h ^= 1;
        return h;
    }

    fn findOrigin(c: *Client, u: http.Url, tenant: u64) ?u32 {
        var lower: [dns.max_host]u8 = undefined;
        std.debug.assert(u.host.len <= lower.len);
        const host = std.ascii.lowerString(lower[0..u.host.len], u.host);
        const h = originHash(u.https, u.port, host, tenant);
        if (c.last_origin != none and c.originIs(c.last_origin, h, u.https, u.port, host, tenant)) return c.last_origin;
        // The index: linear probing from the hash.
        const mask = c.oidx.len - 1;
        var slot: usize = @intCast(h & mask);
        var probes: usize = 0;
        while (probes < c.oidx.len) : (probes += 1) {
            const oi = c.oidx[slot];
            if (oi == none) break;
            if (c.originIs(oi, h, u.https, u.port, host, tenant)) {
                c.last_origin = oi;
                return oi;
            }
            slot = (slot + 1) & mask;
        }
        // A new origin: a free entry, or one with no connection and no request.
        var spare: u32 = none;
        for (c.origins, 0..) |*o, i| {
            if (!o.used) {
                spare = @intCast(i);
                break;
            }
            if (spare == none and o.nconns == 0 and o.refs == 0) spare = @intCast(i);
        }
        if (spare == none) return null;
        const o = &c.origins[spare];
        if (o.used) c.oindexRemove(spare);
        o.* = .{ .used = true, .https = u.https, .port = u.port, .hash = h, .tenant = tenant, .host_len = @intCast(host.len) };
        @memcpy(o.host[0..host.len], host);
        o.numeric = sys.numericAddr(host, u.port);
        var au = u;
        au.host = o.hostSlice();
        var ao: Out = .{ .buf = &o.auth };
        http.writeHostHeader(&ao, au) catch unreachable; // max_host + "[]" + ":65535" fits.
        o.auth_len = @intCast(ao.len);
        var hn: usize = 0;
        hpack.encodeField(&o.auth_hpack, &hn, ":authority", o.auth[0..o.auth_len], false) catch unreachable;
        o.auth_hpack_len = @intCast(hn);
        o.lim = c.limitsFor(host, u.port);
        const mode: H2Mode = if (o.lim.h2 == .inherit) (if (c.cfg.h2) .on else .off) else o.lim.h2;
        o.h2_ok = mode == .prior or (mode == .on and u.https);
        if (mode == .prior and !u.https) {
            o.h2_known = true;
            o.alpn_known = true;
        }
        o.tokens = @floatFromInt(c.burstOf(o));
        o.refill_ms = c.now_ms;
        c.oindexInsert(spare);
        c.last_origin = spare;
        return spare;
    }

    fn limitsFor(c: *Client, host: []const u8, port: u16) Limits {
        for (c.cfg.rules) |*rule| {
            if (rule.matches(host, port)) return c.cfg.origin.over(rule.limits);
        }
        return c.cfg.origin;
    }

    fn burstOf(c: *Client, o: *const Origin) u32 {
        _ = c;
        if (o.lim.burst > 0) return o.lim.burst;
        return @max(1, o.lim.rate / 10);
    }

    fn oindexInsert(c: *Client, oi: u32) void {
        const mask = c.oidx.len - 1;
        var slot: usize = @intCast(c.origins[oi].hash & mask);
        var probes: usize = 0;
        while (probes < c.oidx.len) : (probes += 1) {
            if (c.oidx[slot] == none) {
                c.oidx[slot] = oi;
                c.origins[oi].oidx_slot = @intCast(slot);
                return;
            }
            slot = (slot + 1) & mask;
        }
        unreachable; // The index has twice as many slots as origins.
    }

    /// Backward-shift deletion keeps every probe chain unbroken.
    fn oindexRemove(c: *Client, oi: u32) void {
        const mask = c.oidx.len - 1;
        var hole: usize = c.origins[oi].oidx_slot;
        std.debug.assert(c.oidx[hole] == oi);
        c.oidx[hole] = none;
        c.origins[oi].oidx_slot = none;
        var slot = (hole + 1) & mask;
        var probes: usize = 0;
        while (probes < c.oidx.len) : (probes += 1) {
            const e = c.oidx[slot];
            if (e == none) return;
            const home: usize = @intCast(c.origins[e].hash & mask);
            // Move the entry into the hole when its home is not between
            // the hole and its slot (cyclically).
            const dist_slot = (slot -% home) & mask;
            const dist_hole = (hole -% home) & mask;
            if (dist_hole < dist_slot) {
                c.oidx[hole] = e;
                c.origins[e].oidx_slot = @intCast(hole);
                c.oidx[slot] = none;
                hole = slot;
            }
            slot = (slot + 1) & mask;
        }
    }

    fn originIs(c: *Client, oi: u32, h: u64, https: bool, port: u16, host: []const u8, tenant: u64) bool {
        const o = &c.origins[oi];
        return o.used and o.hash == h and o.tenant == tenant and o.https == https and o.port == port and std.mem.eql(u8, o.hostSlice(), host);
    }

    /// Queue a request at its origin. A retry of a step waits in the hold
    /// queue while a `Retry-After` of the origin runs.
    fn enqueue(c: *Client, oi: u32, ri: u32, front: bool) void {
        const o = &c.origins[oi];
        const r = &c.reqs[ri];
        if (r.origin != oi) {
            if (r.origin != none) c.origins[r.origin].refs -= 1;
            r.origin = oi;
            o.refs += 1;
        }
        c.offWire(ri);
        r.state = .queued;
        r.prev = none;
        r.next = none;
        r.held = r.attempt > 0 and o.hold_until_ms > c.now_ms;
        const head = if (r.held) &o.h_head else &o.q_head;
        const tail = if (r.held) &o.h_tail else &o.q_tail;
        if (head.* == none) {
            head.* = ri;
            tail.* = ri;
        } else if (front) {
            r.next = head.*;
            c.reqs[head.*].prev = ri;
            head.* = ri;
        } else {
            r.prev = tail.*;
            c.reqs[tail.*].next = ri;
            tail.* = ri;
        }
        o.queued += 1;
        c.queued_total += 1;
    }

    fn unqueue(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .queued);
        const o = &c.origins[r.origin];
        const head = if (r.held) &o.h_head else &o.q_head;
        const tail = if (r.held) &o.h_tail else &o.q_tail;
        if (r.prev != none) c.reqs[r.prev].next = r.next else head.* = r.next;
        if (r.next != none) c.reqs[r.next].prev = r.prev else tail.* = r.prev;
        r.prev = none;
        r.next = none;
        r.held = false;
        r.state = .active;
        o.queued -= 1;
        c.queued_total -= 1;
    }

    fn onWire(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        if (r.on_wire) return;
        r.on_wire = true;
        c.origins[r.origin].inflight += 1;
    }

    fn offWire(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        if (!r.on_wire) return;
        r.on_wire = false;
        const o = &c.origins[r.origin];
        std.debug.assert(o.inflight > 0);
        o.inflight -= 1;
        // A slot opened under a limit: others of the origin may go.
        if (o.queued > 0) c.pending_pump = true;
    }

    /// Requests the origin may have on the wire now.
    fn wireLimit(_: *Client, o: *const Origin) u32 {
        var lim: u32 = if (o.lim.max_inflight > 0) o.lim.max_inflight else std.math.maxInt(u32);
        if (o.aimd_limit > 0) lim = @min(lim, @max(1, @as(u32, @intFromFloat(o.aimd_limit))));
        return lim;
    }

    /// Room in the request rate. False sets the origin's wake time.
    fn takeToken(c: *Client, o: *Origin) bool {
        if (o.lim.rate == 0) return true;
        const rate: f64 = @floatFromInt(o.lim.rate);
        const burst: f64 = @floatFromInt(c.burstOf(o));
        if (c.now_ms > o.refill_ms) {
            o.tokens = @min(burst, o.tokens + @as(f64, @floatFromInt(c.now_ms - o.refill_ms)) * rate / 1000.0);
            o.refill_ms = c.now_ms;
        }
        if (o.tokens >= 1) {
            o.tokens -= 1;
            return true;
        }
        const wait: i64 = @intFromFloat(@ceil((1 - o.tokens) * 1000.0 / rate));
        c.wakeAt(o, c.now_ms + @max(1, wait));
        return false;
    }

    fn wakeAt(c: *Client, o: *Origin, at: i64) void {
        o.wake_ms = at;
        c.wake_ms = @min(c.wake_ms, at);
    }

    /// Give queued requests of an origin to h2 streams, idle connections
    /// or new connections, within its limits.
    fn pump(c: *Client, oi: u32) void {
        var guard: u32 = 0;
        while (guard < c.reqs.len) : (guard += 1) {
            const o = &c.origins[oi];
            // Retries released by the end of a hold go first: they are older.
            if (o.h_head != none and c.now_ms >= o.hold_until_ms) c.releaseHeld(oi);
            if (o.h_head != none) c.wakeAt(o, o.hold_until_ms);
            const ri = o.q_head;
            if (ri == none or o.resolving) return;
            if (o.inflight >= c.wireLimit(o)) return;
            // An h2 connection with a free stream.
            if (o.h2_head != none) {
                const ci = o.h2_head;
                if (c.h2Room(ci) > 0) {
                    if (!c.takeToken(o)) return;
                    c.unqueue(ri);
                    c.h2StartStream(ci, ri);
                    continue;
                }
            }
            if (o.idle != none) {
                if (!c.takeToken(o)) return;
                const ci = o.idle;
                c.unlinkIdle(ci);
                c.unqueue(ri);
                c.beginSend(ci, ri);
                continue;
            }
            // While the first connection finds out whether the server
            // speaks h2, the rest wait: an h2 origin needs few connections.
            if (o.h2_ok and !o.alpn_known and o.h2_opening > 0) return;
            if (o.h2_known and o.h2_opening * h2_assumed_streams >= o.queued) return;
            if (o.lim.max_conns > 0 and o.nconns >= o.lim.max_conns) return;
            const addrs = c.addrsFor(oi) orelse return;
            if (!c.takeToken(&c.origins[oi])) return;
            const ci = c.allocConn(oi) orelse return;
            c.unqueue(ri);
            c.open(ci, oi, addrs, ri);
        }
    }

    fn releaseHeld(c: *Client, oi: u32) void {
        var guard: u32 = 0;
        // Move the hold queue to the front of the main queue, in order.
        while (c.origins[oi].h_tail != none and guard < c.reqs.len) : (guard += 1) {
            const ri = c.origins[oi].h_tail;
            c.unqueue(ri);
            c.reqs[ri].attempt = 0;
            c.enqueue(oi, ri, true);
        }
    }

    /// The addresses of an origin, or null while DNS runs or after a
    /// DNS failure (which fails the queued requests).
    fn addrsFor(c: *Client, oi: u32) ?dns.Addrs {
        const o = &c.origins[oi];
        if (o.numeric) |a| {
            var one: dns.Addrs = .{ .n = 1 };
            one.list[0] = a;
            return one;
        }
        if (o.addrs.n > 0 and o.addrs_until_ms > c.now_ms) return o.addrs;
        // A gym name with no gym resolver: GYM_ADDR at once.
        if (c.cfg.gym) |g| if (g.dns.len == 0 and g.matches(o.hostSlice())) return gymAddrs(g, o.hostSlice(), null);
        switch (c.resolver.lookup(o.hostSlice(), c.now_ms)) {
            .hit => |a| return if (c.cfg.gym) |g| gymAddrs(g, o.hostSlice(), a) else a,
            .pending => |id| {
                o.resolving = true;
                o.dns_id = id;
                return null;
            },
            .err => |msg| {
                if (c.cfg.gym) |g| if (g.matches(o.hostSlice())) return gymAddrs(g, o.hostSlice(), null);
                c.failQueue(oi, msg);
                return null;
            },
        }
    }

    /// The gym's answer for a name: GYM_ADDR for a vendor host (a
    /// sidecar's loopback pin stays), else what the resolver said.
    fn gymAddrs(g: *const gym_mod.Gym, host: []const u8, resolved: ?dns.Addrs) dns.Addrs {
        if (!g.matches(host)) return resolved.?;
        const first: ?sys.Addr = if (resolved) |r| (if (r.n > 0) r.list[0] else null) else null;
        var one: dns.Addrs = .{ .n = 1 };
        one.list[0] = g.answer(host, first).?;
        return one;
    }

    fn onResolved(c: *Client, d: dns.Resolver.Done) void {
        for (c.origins, 0..) |*o, i| {
            if (!o.used or !o.resolving or o.dns_id != d.id) continue;
            o.resolving = false;
            var result = d.result;
            if (c.cfg.gym) |g| if (g.matches(o.hostSlice())) {
                result = .{ .hit = gymAddrs(g, o.hostSlice(), if (d.result == .hit) d.result.hit else null) };
            };
            switch (result) {
                .hit => |a| {
                    // Kept briefly so a name with TTL 0 still connects.
                    o.addrs = a;
                    o.addrs_until_ms = c.now_ms + 1000;
                    c.pump(@intCast(i));
                },
                .err => |msg| c.failQueue(@intCast(i), msg),
                .pending => unreachable,
            }
        }
    }

    fn failQueue(c: *Client, oi: u32, dns_msg: []const u8) void {
        c.releaseHeld(oi);
        var guard: u32 = 0;
        while (c.origins[oi].q_head != none and guard < c.reqs.len) : (guard += 1) {
            const ri = c.origins[oi].q_head;
            c.unqueue(ri);
            var b: [384]u8 = undefined;
            const o = &c.origins[oi];
            c.failReq(ri, std.fmt.bufPrint(&b, "http: cannot resolve \"{s}\": {s}", .{ o.hostSlice()[0..@min(o.host_len, 200)], dns_msg }) catch "http: cannot resolve the host");
        }
    }

    // ---- connections ------------------------------------------------------------

    /// A free connection slot. When none is free, close an idle
    /// connection of another origin.
    fn allocConn(c: *Client, oi: u32) ?u32 {
        if (c.ncfree == 0) {
            for (c.origins, 0..) |*o, i| {
                if (i == oi or !o.used or o.idle == none) continue;
                c.closeConn(o.idle);
                break;
            }
        }
        if (c.ncfree == 0) {
            // An HTTP/2 connection of another origin with no stream.
            for (c.conns, 0..) |*cn, i| {
                if (cn.state != .h2 or cn.origin == oi or c.h2s[cn.h2].open > 0) continue;
                c.closeConn(@intCast(i));
                break;
            }
        }
        if (c.ncfree == 0) return null;
        c.ncfree -= 1;
        return c.cfree[c.ncfree];
    }

    fn open(c: *Client, ci: u32, oi: u32, addrs: dns.Addrs, ri: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .free and addrs.n > 0);
        const o = &c.origins[oi];
        cn.origin = oi;
        cn.addrs = addrs;
        cn.addr_i = 0;
        cn.port = o.port;
        cn.req = ri;
        c.reqs[ri].h1conn = ci;
        cn.sent_count = 0;
        cn.session = null;
        cn.proto = .h1;
        cn.h2 = none;
        cn.deadline_ms = c.now_ms + if (o.lim.connect_ms > 0) @as(i64, o.lim.connect_ms) else c.cfg.connect_timeout_ms;
        // Keep an HTTP/2 state for the connection while h2 is possible.
        if (o.h2_ok and c.nh2free > 0) {
            c.nh2free -= 1;
            cn.h2 = c.h2free[c.nh2free];
            o.h2_opening += 1;
        }
        o.nconns += 1;
        c.onWire(ri);
        cn.state = .connecting;
        c.connectNext(ci);
    }

    /// Try the addresses in order; the first that starts connecting wins.
    fn connectNext(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        var last_err: c_int = 0;
        while (cn.addr_i < cn.addrs.n) {
            var a = cn.addrs.list[cn.addr_i];
            a.port = cn.port;
            cn.addr_i += 1;
            // Only the socket address moves; TLS keeps the vendor host name.
            if (c.cfg.gym) |g| a = g.redirect(a);
            const fd = sys.connectAddr(a) catch {
                last_err = std.c._errno().*;
                continue;
            };
            cn.fd = fd;
            cn.gen +%= 1;
            const tok = sys.makeToken(c.kind_conn, cn.gen, ci);
            c.poller.addRead(fd, tok) catch {
                sys.close(fd);
                cn.fd = -1;
                continue;
            };
            c.poller.wantWrite(fd, tok) catch {};
            cn.write_armed = true;
            return;
        }
        c.connFailFmt(ci, "connect to {s} failed: {s}", .{ c.hostPort(ci), if (last_err != 0) sys.errnoText(last_err) else "no address worked" });
    }

    fn onConnect(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const err = sys.socketError(cn.fd);
        if (err != 0) {
            if (cn.addr_i < cn.addrs.n) {
                // Try the next address on a new socket.
                c.poller.remove(cn.fd);
                sys.close(cn.fd);
                cn.fd = -1;
                return c.connectNext(ci);
            }
            return c.connFailFmt(ci, "connect to {s} failed: {s}", .{ c.hostPort(ci), sys.errnoText(err) });
        }
        const o = &c.origins[cn.origin];
        if (o.https) {
            const host = o.hostSlice();
            const is_ip = sys.parseIp6(host) != null or (!std.mem.eql(u8, host, "localhost") and sys.parseIp4(host) != null);
            cn.session = tls.Session.connectBio(c.tls_ctx, &cn.bio, host, is_ip, cn.h2 != none) catch {
                var eb: [256]u8 = undefined;
                return c.connFailFmt(ci, "TLS setup for {s} failed: {s}", .{ c.hostPort(ci), tls.lastError(&eb) });
            };
            cn.state = .handshaking;
            return c.doHandshake(ci);
        }
        c.connected(ci);
    }

    fn doHandshake(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        // Each pass moves bytes or returns: the record count bounds it.
        var guard: u32 = 0;
        while (guard < 64) : (guard += 1) {
            const res = cn.session.?.handshake();
            // Whatever the handshake wrote (ClientHello, Finished) goes out.
            const flushed = c.tlsFlush(ci);
            switch (res) {
                .n => return c.connected(ci),
                .want_read => switch (c.tlsFill(ci)) {
                    .got => continue,
                    .again => return,
                    .closed => continue, // The next call reports the close.
                },
                .want_write => if (!flushed) return,
                .closed => return c.connFailFmt(ci, "TLS handshake with {s} failed: the server closed the connection", .{c.hostPort(ci)}),
                .failed => {
                    var eb: [256]u8 = undefined;
                    return c.connFailFmt(ci, "TLS handshake with {s} failed: {s}", .{ c.hostPort(ci), cn.session.?.failure(&eb) });
                },
            }
        }
    }

    const Fill = enum { got, again, closed };

    /// Read ciphertext from the socket into `crbuf`: one system call, as
    /// much as has arrived and fits.
    fn tlsFill(c: *Client, ci: u32) Fill {
        const cn = &c.conns[ci];
        const room = cn.bio.inRoom();
        // A record never exceeds half the buffer: room always remains.
        std.debug.assert(room.len > 0);
        c.counters.reads += 1;
        switch (sys.readSome(cn.fd, room)) {
            .n => |k| {
                cn.bio.in_end += k;
                return .got;
            },
            .again => {
                c.counters.empty_reads += 1;
                return .again;
            },
            .closed => {
                cn.bio.eof = true;
                return .closed;
            },
        }
    }

    /// Send the ciphertext that waits in `cwbuf`. True when all of it went;
    /// else write readiness is armed and the rest waits.
    fn tlsFlush(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        var guard: u32 = 0;
        while (cn.bio.out_len > 0 and guard < 64) : (guard += 1) {
            switch (sys.writeSome(cn.fd, cn.bio.outPending())) {
                .n => |k| cn.bio.outSent(k),
                .again => {
                    c.armWrite(ci);
                    return false;
                },
                // The read side reports the close.
                .closed => {
                    cn.bio.out_len = 0;
                    return true;
                },
            }
        }
        return cn.bio.out_len == 0;
    }

    fn connected(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        cn.deadline_ms = 0;
        if (cn.session) |sess| sess.setReadAhead();
        c.disarmWrite(ci);
        const o = &c.origins[cn.origin];
        if (cn.h2 != none) {
            const h2 = if (cn.session) |s| s.alpnH2() else o.h2_known;
            if (o.https) o.alpn_known = true;
            if (h2) {
                o.h2_known = true;
                c.counters.h2_conns += 1;
                return c.h2Begin(ci);
            }
            // The server chose HTTP/1.1.
            o.h2_opening -= 1;
            o.h2_ok = false;
            c.h2free[c.nh2free] = cn.h2;
            c.nh2free += 1;
            cn.h2 = none;
            c.pending_pump = true;
        }
        c.counters.h1_conns += 1;
        if (cn.req != none) {
            const ri = cn.req;
            cn.req = none;
            return c.beginSend(ci, ri);
        }
        c.becomeIdle(ci);
    }

    fn armWrite(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.write_armed) return;
        c.poller.wantWrite(cn.fd, sys.makeToken(c.kind_conn, cn.gen, ci)) catch {};
        cn.write_armed = true;
    }

    fn disarmWrite(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (!sys.is_linux or !cn.write_armed) return;
        // Ciphertext still waits for the socket: keep the interest.
        if (cn.bio.out_len > 0) return;
        c.poller.doneWrite(cn.fd, sys.makeToken(c.kind_conn, cn.gen, ci));
        cn.write_armed = false;
    }

    /// Write the request line and Host, then send. Small requests go out
    /// in one write from the connection buffer.
    fn beginSend(c: *Client, ci: u32, ri: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .active);
        c.onWire(ri);
        cn.req = ri;
        c.reqs[ri].h1conn = ci;
        cn.reused = cn.sent_count > 0;
        cn.sent_count += 1;
        cn.head = null;
        cn.rlen = 0;
        cn.got_bytes = false;
        cn.state = .sending;
        const d = c.reqData(ri);
        const u = c.reqUrl(ri);
        var out: Out = .{ .buf = cn.wbuf };
        const rest = d[r.built.url_len..r.built.body_end];
        writeLine(&out, r.built.method(), u, c.origins[r.origin].authority()) catch return c.connFailFmt(ci, "the request line for {s} is too long", .{c.hostPort(ci)});
        if (out.len + rest.len <= cn.wbuf.len) {
            out.put(rest) catch unreachable;
            cn.seg1 = &.{};
        } else {
            cn.seg1 = rest;
        }
        cn.wlen = out.len;
        cn.wsent = 0;
        cn.seg1_sent = 0;
        c.doSend(ci);
    }

    fn writeLine(out: *Out, method: []const u8, u: http.Url, authority: []const u8) Out.Error!void {
        try out.put(method);
        try out.byte(' ');
        try http.writeTarget(out, u.target);
        try out.put(" HTTP/1.1\r\nhost: ");
        try out.put(authority);
        try out.put("\r\n");
    }

    fn doSend(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        var guard: u32 = 0;
        while (guard < 1 << 20) : (guard += 1) {
            // Plain TCP sends the head and a large body in one system call.
            if (cn.session == null and cn.wsent < cn.wlen and cn.seg1_sent < cn.seg1.len) {
                const bufs = [_][]const u8{ cn.wbuf[cn.wsent..cn.wlen], cn.seg1[cn.seg1_sent..] };
                switch (sys.writevSome(cn.fd, &bufs)) {
                    .n => |k| {
                        const head = @min(k, cn.wlen - cn.wsent);
                        cn.wsent += head;
                        cn.seg1_sent += k - head;
                        continue;
                    },
                    .again => return c.armWrite(ci),
                    .closed => return c.lostConn(ci),
                }
            }
            const chunk: []const u8 = if (cn.wsent < cn.wlen) cn.wbuf[cn.wsent..cn.wlen] else if (cn.seg1_sent < cn.seg1.len) cn.seg1[cn.seg1_sent..] else break;
            const res = c.write(ci, chunk);
            switch (res) {
                .n => |k| {
                    if (cn.wsent < cn.wlen) cn.wsent += k else cn.seg1_sent += k;
                },
                .again => return c.armWrite(ci),
                .want_read => return,
                .closed => return c.lostConn(ci),
                .failed => return c.tlsFail(ci),
            }
        }
        c.disarmWrite(ci);
        cn.state = .reading;
        cn.last_io_ms = c.now_ms;
        // A TLS write can take in records that the poller then does not see.
        if (cn.session) |sess| if (sess.hasPending()) c.queueRead(ci);
    }

    const IoRes = union(enum) { n: usize, again, want_read, closed, failed };

    fn write(c: *Client, ci: u32, buf: []const u8) IoRes {
        const cn = &c.conns[ci];
        if (cn.session) |s| {
            var guard: u32 = 0;
            while (guard < 64) : (guard += 1) {
                const res = s.write(buf);
                const flushed = c.tlsFlush(ci);
                switch (res) {
                    // Taken: its ciphertext went out, or waits in `cwbuf`
                    // with write readiness armed.
                    .n => |k| return .{ .n = k },
                    // `cwbuf` is full: wait for the socket.
                    .want_write => if (!flushed) return .again,
                    .want_read => switch (c.tlsFill(ci)) {
                        .got, .closed => continue,
                        .again => return .want_read,
                    },
                    .closed => return .closed,
                    .failed => return .failed,
                }
            }
            return .again;
        }
        return switch (sys.writeSome(cn.fd, buf)) {
            .n => |k| .{ .n = k },
            .again => .again,
            .closed => .closed,
        };
    }

    fn read(c: *Client, ci: u32, buf: []u8) IoRes {
        if (c.conns[ci].session != null) return c.tlsRead(ci, buf);
        const r = c.readRaw(ci, buf);
        c.counters.reads += 1;
        if (r == .want_read) c.counters.empty_reads += 1;
        return r;
    }

    /// Plaintext from a TLS session. The socket is read only when OpenSSL
    /// needs more ciphertext than `crbuf` holds.
    fn tlsRead(c: *Client, ci: u32, buf: []u8) IoRes {
        const s = c.conns[ci].session.?;
        var guard: u32 = 0;
        while (guard < 64) : (guard += 1) {
            const res = s.read(buf);
            // A read can write (a key update, an alert).
            const flushed = c.tlsFlush(ci);
            switch (res) {
                .n => |k| return .{ .n = k },
                .want_read => switch (c.tlsFill(ci)) {
                    .got, .closed => continue,
                    .again => return .want_read,
                },
                .want_write => if (!flushed) return .again,
                .closed => return .closed,
                .failed => return .failed,
            }
        }
        return .want_read;
    }

    /// After a read of `k` bytes into `space`: whether more may wait
    /// without the poller knowing. Plain sockets: only if the read filled
    /// the buffer (the poller is level-triggered and reports the rest). TLS:
    /// only if OpenSSL holds bytes.
    fn mayHaveMore(c: *Client, ci: u32, k: usize, space: usize) bool {
        const cn = &c.conns[ci];
        if (cn.session) |s| return s.hasPending();
        return k == space;
    }

    fn readRaw(c: *Client, ci: u32, buf: []u8) IoRes {
        const cn = &c.conns[ci];
        if (cn.session) |s| return switch (s.read(buf)) {
            .n => |k| .{ .n = k },
            .want_read => .want_read,
            .want_write => .again,
            .closed => .closed,
            .failed => .failed,
        };
        return switch (sys.readSome(cn.fd, buf)) {
            .n => |k| .{ .n = k },
            .again => .want_read,
            .closed => .closed,
        };
    }

    fn queueRead(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.read_queued) return;
        // Each connection is in the list at most once.
        std.debug.assert(c.nread < c.read_list.len);
        c.read_list[c.nread] = ci;
        c.nread += 1;
        cn.read_queued = true;
    }

    fn doRead(c: *Client, ci: u32) void {
        c.read_depth += 1;
        defer c.read_depth -= 1;
        c.max_read_depth = @max(c.max_read_depth, c.read_depth);
        const cn = &c.conns[ci];
        if (cn.state == .h2) return c.h2Read(ci);
        var guard: u32 = 0;
        while (guard < 1 << 20) : (guard += 1) {
            if (cn.state != .reading) return;
            const dst: []u8 = if (cn.head == null) cn.rbuf[cn.rlen..] else cn.body_buf[cn.raw_end..];
            if (dst.len == 0) {
                if (cn.head == null) return c.connFailFmt(ci, "the response head from {s} is larger than {d} bytes", .{ c.hostPort(ci), cn.rbuf.len });
                if (!c.growBody(ci)) return;
                continue;
            }
            switch (c.read(ci, dst)) {
                .n => |k| {
                    cn.got_bytes = true;
                    cn.last_io_ms = c.now_ms;
                    if (cn.head == null) cn.rlen += k else cn.raw_end += k;
                    if (!c.process(ci)) return;
                    // No read that would only say EAGAIN.
                    if (!c.mayHaveMore(ci, k, dst.len)) return;
                },
                .want_read => return,
                .again => return c.armWrite(ci),
                .closed => return c.onEof(ci),
                .failed => return c.tlsFail(ci),
            }
        }
    }

    /// Parse what has arrived. False when the connection is done with
    /// this response (complete or failed).
    fn process(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        if (cn.head == null) {
            var guard: u32 = 0;
            while (guard < 16) : (guard += 1) {
                const h = (http.parseHead(cn.rbuf[0..cn.rlen]) catch {
                    c.connFailFmt(ci, "bad response head from {s}", .{c.hostPort(ci)});
                    return false;
                }) orelse return true;
                if (h.status >= 100 and h.status < 200 and h.status != 101) {
                    // Drop an interim response such as 100 Continue.
                    std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - h.len], cn.rbuf[h.len..cn.rlen]);
                    cn.rlen -= h.len;
                    continue;
                }
                if (!c.startBody(ci, h)) return false;
                break;
            }
            if (cn.head == null) return true;
        }
        return c.advanceBody(ci);
    }

    fn startBody(c: *Client, ci: u32, h: http.Head) bool {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        cn.head = h;
        cn.body_buf = cn.rbuf[h.len..];
        cn.body_len = 0;
        cn.raw_start = 0;
        cn.raw_end = cn.rlen - h.len;
        cn.chunked = .{};
        const head_method = std.mem.eql(u8, r.built.method(), "HEAD");
        cn.kind = if (head_method or h.status == 204 or h.status == 304) .none else if (h.chunked) .chunked else if (h.content_length != null) .length else .close;
        if (cn.kind == .length) {
            const n = h.content_length.?;
            if (n > c.cfg.max_body) {
                c.connFailFmt(ci, "the response body from {s} is {d} bytes; the limit is {d}", .{ c.hostPort(ci), n, c.cfg.max_body });
                return false;
            }
            if (n > cn.body_buf.len and !c.moveToBig(ci)) return false;
        }
        return true;
    }

    /// Decode body bytes. False when the response is complete or failed.
    fn advanceBody(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        switch (cn.kind) {
            .none => {},
            .length => {
                cn.body_len = @min(cn.raw_end, cn.head.?.content_length.?);
                if (cn.raw_end < cn.head.?.content_length.?) return true;
            },
            .chunked => {
                cn.chunked.feed(cn.body_buf, &cn.body_len, &cn.raw_start, cn.raw_end) catch {
                    c.connFailFmt(ci, "bad chunked body from {s}", .{c.hostPort(ci)});
                    return false;
                };
                if (cn.body_len > c.cfg.max_body) {
                    c.connFailFmt(ci, "the response body from {s} is larger than {d} bytes", .{ c.hostPort(ci), c.cfg.max_body });
                    return false;
                }
                if (!cn.chunked.done()) {
                    // Reuse the space of decoded framing.
                    if (cn.raw_start == cn.raw_end) {
                        cn.raw_start = cn.body_len;
                        cn.raw_end = cn.body_len;
                    }
                    return true;
                }
            },
            .close => {
                cn.body_len = cn.raw_end;
                return true;
            },
        }
        c.complete(ci);
        return false;
    }

    /// The body buffer is full: compact, or move to a large buffer.
    fn growBody(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        if (cn.kind == .chunked and cn.raw_start > cn.body_len) {
            const n = cn.raw_end - cn.raw_start;
            std.mem.copyForwards(u8, cn.body_buf[cn.body_len..][0..n], cn.body_buf[cn.raw_start..cn.raw_end]);
            cn.raw_start = cn.body_len;
            cn.raw_end = cn.body_len + n;
            return true;
        }
        if (cn.big == none) return c.moveToBig(ci);
        c.connFailFmt(ci, "the response body from {s} is larger than {d} bytes", .{ c.hostPort(ci), c.cfg.max_body });
        return false;
    }

    fn moveToBig(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        std.debug.assert(cn.big == none);
        const b = c.bigAcquire() orelse {
            c.connFailFmt(ci, "the response from {s} needs a large buffer and all {d} are in use", .{ c.hostPort(ci), c.cfg.big_slots });
            return false;
        };
        const dst = c.bigSlice(b);
        @memcpy(dst[0..cn.raw_end], cn.body_buf[0..cn.raw_end]);
        cn.big = b;
        cn.body_buf = dst;
        return true;
    }

    fn onEof(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.head != null and cn.kind == .close) {
            cn.body_len = cn.raw_end;
            cn.head.?.close = true;
            return c.complete(ci);
        }
        c.lostConn(ci);
    }

    /// The connection closed or reset before the response was complete.
    fn lostConn(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.req != none and cn.reused and !cn.got_bytes) {
            const r = &c.reqs[cn.req];
            if (r.built.retry_safe and !r.retried) {
                // A kept-alive connection that the server had closed: send
                // once more on a new connection.
                r.retried = true;
                const ri = cn.req;
                cn.req = none;
                c.counters.requeued += 1;
                c.enqueue(r.origin, ri, true);
                c.pending_pump = true;
                return c.closeConn(ci);
            }
        }
        c.connFailFmt(ci, "the connection to {s} closed before the response was complete", .{c.hostPort(ci)});
    }

    fn tlsFail(c: *Client, ci: u32) void {
        var eb: [256]u8 = undefined;
        const cn = &c.conns[ci];
        c.connFailFmt(ci, "TLS error with {s}: {s}", .{ c.hostPort(ci), cn.session.?.failure(&eb) });
    }

    fn complete(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const h = cn.head.?;
        const ri = cn.req;
        const r = &c.reqs[ri];
        const extra = cn.kind == .chunked and cn.raw_start < cn.raw_end or cn.kind == .length and cn.raw_end > h.content_length.?;
        const keep = !h.close and cn.kind != .close and !extra;
        c.feedback(r.origin, h.status, h.lines);
        const is_redirect = (h.status == 301 or h.status == 302 or h.status == 303 or h.status == 307 or h.status == 308) and h.location != null and
            (std.mem.eql(u8, r.built.method(), "GET") or std.mem.eql(u8, r.built.method(), "HEAD"));
        if (is_redirect) {
            cn.req = none;
            c.offWire(ri);
            const failed = c.redirect(ri, h.location.?);
            c.finishConn(ci, keep);
            if (!failed) c.pending_pump = true;
            return;
        }
        c.sink.done(c.sink.ctx, r.exec_id, r.seq, .{ .ok = .{ .status = h.status, .header_lines = h.lines, .body = cn.body_buf[0..cn.body_len], .json = h.json } });
        cn.req = none;
        c.freeReq(ri);
        c.finishConn(ci, keep);
    }

    /// 429 and 503 cut the origin's requests on the wire in half and may
    /// hold its retries; other answers raise the limit by one per round.
    fn feedback(c: *Client, oi: u32, status: u32, lines: []const u8) void {
        const o = &c.origins[oi];
        if (status == 429 or status == 503) {
            c.counters.overload += 1;
            const aimd = if (o.lim.aimd != 0) o.lim.aimd == 2 else c.cfg.aimd;
            if (aimd and c.now_ms - o.aimd_cut_ms >= aimd_cut_gap_ms) {
                const base: f32 = @floatFromInt(@max(1, o.inflight));
                o.aimd_limit = @max(1, (if (o.aimd_limit > 0) @min(o.aimd_limit, base) else base) * 0.5);
                o.aimd_cut_ms = c.now_ms;
            }
            if (retryAfterMs(lines, c.now_ms)) |ms| {
                o.hold_until_ms = @max(o.hold_until_ms, c.now_ms + @min(ms, c.cfg.retry_after_max_ms));
            }
            return;
        }
        if (o.aimd_limit > 0) {
            o.aimd_limit += 1 / o.aimd_limit;
            const cap: f32 = @floatFromInt(if (o.lim.max_inflight > 0) o.lim.max_inflight else c.cfg.max_reqs);
            if (o.aimd_limit >= cap) o.aimd_limit = 0;
        }
    }

    /// Point the request at the Location URL and queue it again. True if
    /// the request failed instead.
    fn redirect(c: *Client, ri: u32, location: []const u8) bool {
        const r = &c.reqs[ri];
        if (r.redirects >= c.cfg.max_redirects) {
            c.failReqFmt(ri, "http: more than {d} redirects", .{c.cfg.max_redirects});
            return true;
        }
        r.redirects += 1;
        const old = c.reqUrl(ri);
        var tmp: [request.max_url]u8 = undefined;
        var t: Out = .{ .buf = &tmp };
        http.resolveLocation(&t, old, location) catch {
            c.failReq(ri, "http: the redirect url is too long");
            return true;
        };
        const nu = http.parseUrl(t.written()) catch {
            c.failReq(ri, "http: the redirect url is not valid");
            return true;
        };
        // The response is no longer needed (`location` was copied).
        c.resetStream(ri);
        const same = nu.https == old.https and nu.port == old.port and std.ascii.eqlIgnoreCase(nu.host, old.host);
        const d = c.reqData(ri);
        var hdr_end = r.built.hdr_end;
        if (!same) {
            // As Node.js does: no credentials to another host.
            hdr_end = stripHeaders(d, r.built.url_len, hdr_end);
        }
        const body_len = r.built.body_end - r.built.hdr_end;
        const rest_len = (hdr_end - r.built.url_len) + body_len;
        const new_url_len: u32 = @intCast(t.len);
        if (new_url_len + rest_len > d.len) {
            c.failReq(ri, "http: the redirect url is too long");
            return true;
        }
        // Move the headers and body to follow the new URL.
        if (hdr_end != r.built.hdr_end and body_len > 0) {
            std.mem.copyForwards(u8, d[hdr_end..][0..body_len], d[r.built.hdr_end..r.built.body_end]);
        }
        const src = d[r.built.url_len..][0..rest_len];
        if (new_url_len < r.built.url_len) {
            std.mem.copyForwards(u8, d[new_url_len..][0..rest_len], src);
        } else if (new_url_len > r.built.url_len) {
            std.mem.copyBackwards(u8, d[new_url_len..][0..rest_len], src);
        }
        @memcpy(d[0..new_url_len], t.written());
        r.built.hdr_end = new_url_len + (hdr_end - r.built.url_len);
        r.built.body_end = r.built.hdr_end + body_len;
        r.built.url_len = new_url_len;
        c.parseReqUrl(ri);
        const oi = c.findOrigin(nu, r.tenant) orelse {
            c.failReq(ri, "http: too many different hosts are in use (--egress-max-origins)");
            return true;
        };
        if (nu.https and !tls.enabled) {
            c.failReq(ri, "http: https needs TLS, and this build has none (built with -Dnet=false)");
            return true;
        }
        c.enqueue(oi, ri, false);
        return false;
    }

    /// Remove authorization and cookie lines; return the new header end.
    fn stripHeaders(d: []u8, from: u32, end: u32) u32 {
        var w: usize = from;
        var i: usize = from;
        while (i < end) {
            const nl = std.mem.indexOfPos(u8, d[0..end], i, "\r\n") orelse end - 2;
            const line = d[i .. nl + 2];
            const drop = startsWithIgnoreCase(line, "authorization:") or startsWithIgnoreCase(line, "cookie:") or startsWithIgnoreCase(line, "proxy-authorization:");
            if (!drop) {
                std.mem.copyForwards(u8, d[w..][0..line.len], line);
                w += line.len;
            }
            i = nl + 2;
        }
        return @intCast(w);
    }

    fn startsWithIgnoreCase(s: []const u8, p: []const u8) bool {
        return s.len >= p.len and std.ascii.eqlIgnoreCase(s[0..p.len], p);
    }

    fn finishConn(c: *Client, ci: u32, keep: bool) void {
        const cn = &c.conns[ci];
        if (cn.big != none) {
            c.bigRelease(cn.big, cn.raw_end);
            cn.big = none;
        }
        cn.head = null;
        cn.body_buf = &.{};
        cn.rlen = 0;
        if (keep) c.becomeIdle(ci) else c.closeConn(ci);
    }

    /// Serve the next queued request of the origin, or wait in its idle
    /// list. If other origins wait for a free slot, close instead.
    fn becomeIdle(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const o = &c.origins[cn.origin];
        if (o.q_head != none and o.inflight < c.wireLimit(o) and c.takeToken(o)) {
            const ri = o.q_head;
            c.unqueue(ri);
            return c.beginSend(ci, ri);
        }
        if (c.queued_total > o.queued and c.ncfree == 0) {
            c.closeConn(ci);
            c.pending_pump = true;
            return;
        }
        cn.state = .idle;
        cn.deadline_ms = c.now_ms + c.cfg.idle_timeout_ms;
        cn.prev_idle = none;
        cn.next_idle = o.idle;
        if (o.idle != none) c.conns[o.idle].prev_idle = ci;
        o.idle = ci;
    }

    fn unlinkIdle(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .idle);
        const o = &c.origins[cn.origin];
        if (cn.prev_idle != none) c.conns[cn.prev_idle].next_idle = cn.next_idle else o.idle = cn.next_idle;
        if (cn.next_idle != none) c.conns[cn.next_idle].prev_idle = cn.prev_idle;
        cn.prev_idle = none;
        cn.next_idle = none;
        cn.state = .sending;
    }

    /// Bytes on an idle connection: a close, or TLS session tickets.
    fn idleRead(c: *Client, ci: u32) void {
        var b: [256]u8 = undefined;
        switch (c.read(ci, &b)) {
            .want_read => {},
            .again => c.armWrite(ci),
            else => {
                c.unlinkIdle(ci);
                c.closeConn(ci);
            },
        }
    }

    fn closeConn(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state != .free);
        if (cn.state == .idle) c.unlinkIdle(ci);
        const o = &c.origins[cn.origin];
        if (cn.h2 != none) {
            // Opening lasts until the server's SETTINGS arrive.
            if (cn.state != .h2 or !c.h2s[cn.h2].got_settings) o.h2_opening -= 1;
            if (cn.state == .h2) {
                c.h2DropStreams(ci);
                c.h2Unlist(ci);
            }
            c.h2free[c.nh2free] = cn.h2;
            c.nh2free += 1;
            cn.h2 = none;
        }
        if (cn.session) |s| s.deinit();
        cn.session = null;
        if (cn.fd >= 0) {
            c.poller.remove(cn.fd);
            sys.close(cn.fd);
        }
        cn.fd = -1;
        cn.gen +%= 1;
        cn.write_armed = false;
        sys.poison(cn.rbuf);
        sys.poison(cn.wbuf);
        if (cn.bio.in_end > 0) sys.poison(cn.crbuf[0..cn.bio.in_end]);
        if (cn.bio.out_len > 0) sys.poison(cn.cwbuf[0..cn.bio.out_len]);
        cn.bio.reset();
        if (cn.big != none) {
            c.bigRelease(cn.big, cn.raw_end);
            cn.big = none;
        }
        cn.head = null;
        std.debug.assert(cn.req == none);
        o.nconns -= 1;
        cn.origin = none;
        cn.proto = .h1;
        cn.state = .free;
        c.cfree[c.ncfree] = ci;
        c.ncfree += 1;
        if (c.queued_total > 0) c.pending_pump = true;
    }

    fn connFailFmt(c: *Client, ci: u32, comptime fmt: []const u8, args: anytype) void {
        var b: [512]u8 = undefined;
        const msg = std.fmt.bufPrint(&b, "http: " ++ fmt, args) catch "http: connection failed";
        const cn = &c.conns[ci];
        if (cn.state == .h2) {
            c.h2FailAll(ci, msg);
        } else if (cn.req != none) {
            const ri = cn.req;
            cn.req = none;
            c.failReq(ri, msg);
        }
        c.closeConn(ci);
    }

    fn hostPort(c: *Client, ci: u32) []const u8 {
        const S = struct {
            threadlocal var buf: [280]u8 = undefined;
        };
        const cn = &c.conns[ci];
        const o = &c.origins[cn.origin];
        return std.fmt.bufPrint(&S.buf, "{s}:{d}", .{ o.hostSlice()[0..@min(o.host_len, 200)], o.port }) catch "the server";
    }

    // ---- HTTP/2 ----------------------------------------------------------------

    fn h2Of(c: *Client, ci: u32) *H2 {
        return &c.h2s[c.conns[ci].h2];
    }

    /// Streams the connection can still open.
    fn h2Room(c: *Client, ci: u32) u32 {
        const cn = &c.conns[ci];
        if (cn.state != .h2) return 0;
        const h = c.h2Of(ci);
        if (h.goaway or h.err != null) return 0;
        // Stream ids are 31 bits; a connection near the end takes no more.
        if (h.next_sid > 0x7fff_fff0) return 0;
        // One stream until the server's SETTINGS arrive: a server may
        // answer streams over its limit with PROTOCOL_ERROR, which fails
        // them. Its SETTINGS come with its first bytes, one round trip.
        const peer_cap = if (h.got_settings) h.peer.max_concurrent_streams else 1;
        const cap = @min(peer_cap, c.cfg.h2_streams);
        return if (h.open >= cap) 0 else cap - h.open;
    }

    /// Start HTTP/2 on a connection: the preface, our SETTINGS and the
    /// connection window, then the request that opened it.
    fn h2Begin(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const h = c.h2Of(ci);
        const block = h.reader.block;
        const max_frame = h.reader.max_frame;
        const smap = h.smap;
        const sgen = h.sgen;
        const skey = h.skey;
        const dec = h.dec;
        h.* = .{ .reader = http2.Reader.init(block, max_frame), .dec = dec, .smap = smap, .sgen = sgen, .skey = skey };
        h.dec.reset();
        @memset(h.smap, none);
        cn.proto = .h2;
        cn.state = .h2;
        cn.wlen = 0;
        cn.wsent = 0;
        cn.rlen = 0;
        cn.deadline_ms = 0;
        c.h2List(ci, true);
        if (cn.req != none) {
            const ri = cn.req;
            cn.req = none;
            c.h2StartStream(ci, ri);
        } else {
            c.h2Kick(ci);
        }
        // More queued requests of the origin can share the connection.
        if (c.origins[cn.origin].queued > 0) c.pending_pump = true;
    }

    /// Put a connection in its origin's list of h2 connections: at the
    /// front when it has free streams, else at the back.
    fn h2List(c: *Client, ci: u32, front: bool) void {
        const cn = &c.conns[ci];
        const o = &c.origins[cn.origin];
        if (cn.h2_listed) c.h2Unlist(ci);
        cn.h2_prev = none;
        cn.h2_next = none;
        if (o.h2_head == none) {
            o.h2_head = ci;
            o.h2_tail = ci;
        } else if (front) {
            cn.h2_next = o.h2_head;
            c.conns[o.h2_head].h2_prev = ci;
            o.h2_head = ci;
        } else {
            cn.h2_prev = o.h2_tail;
            c.conns[o.h2_tail].h2_next = ci;
            o.h2_tail = ci;
        }
        cn.h2_listed = true;
    }

    fn h2Unlist(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (!cn.h2_listed) return;
        const o = &c.origins[cn.origin];
        if (cn.h2_prev != none) c.conns[cn.h2_prev].h2_next = cn.h2_next else o.h2_head = cn.h2_next;
        if (cn.h2_next != none) c.conns[cn.h2_next].h2_prev = cn.h2_prev else o.h2_tail = cn.h2_prev;
        cn.h2_prev = none;
        cn.h2_next = none;
        cn.h2_listed = false;
    }

    /// The stream map: open addressing on `sid / 2` with tombstones. Ids
    /// grow by two, so a stream's home slot is free unless a stream from
    /// `smap.len` streams ago is still open: lookups and removals are one
    /// probe. Keys live in `skey`, so a probe touches no request.
    const tomb: u32 = none - 1;

    fn smapFind(c: *Client, h: *const H2, sid: u32) ?u32 {
        const mask = h.smap.len - 1;
        var slot: usize = (sid >> 1) & mask;
        var probes: usize = 0;
        while (probes < h.smap.len) : (probes += 1) {
            const ri = h.smap[slot];
            if (ri == none) return null;
            if (ri != tomb and h.skey[slot] == sid) {
                const r = &c.reqs[ri];
                // A frame reaches only the request that opened the stream.
                std.debug.assert(r.sid == sid and h.sgen[slot] == r.gen and r.state == .active and r.conn != none and c.h2s[c.conns[r.conn].h2].smap.ptr == h.smap.ptr);
                return ri;
            }
            slot = (slot + 1) & mask;
        }
        return null;
    }

    fn smapInsert(c: *Client, h: *H2, ri: u32) void {
        const mask = h.smap.len - 1;
        const sid = c.reqs[ri].sid;
        var slot: usize = (sid >> 1) & mask;
        var probes: usize = 0;
        while (probes < h.smap.len) : (probes += 1) {
            if (h.smap[slot] == none or h.smap[slot] == tomb) {
                h.smap[slot] = ri;
                h.skey[slot] = sid;
                h.sgen[slot] = c.reqs[ri].gen;
                return;
            }
            slot = (slot + 1) & mask;
        }
        unreachable; // The map has twice the slots of the stream cap.
    }

    fn smapRemove(c: *Client, h: *H2, sid: u32) void {
        _ = c;
        const mask = h.smap.len - 1;
        var slot: usize = (sid >> 1) & mask;
        var probes: usize = 0;
        while (probes < h.smap.len) : (probes += 1) {
            const ri = h.smap[slot];
            if (ri == none) return;
            if (ri != tomb and h.skey[slot] == sid) {
                h.smap[slot] = tomb;
                return;
            }
            slot = (slot + 1) & mask;
        }
    }

    /// Clear the HTTP/2 and response state of a request.
    fn resetStream(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        // No byte of a response outlives its stream (safe builds fill
        // it; the large buffer is filled on release).
        if (r.resp_big == none and r.hdr_len + r.body_len > 0) {
            const area = c.respArea(ri);
            sys.poison(area[0..@min(area.len, r.hdr_len + r.body_len)]);
        }
        if (r.resp_big != none) {
            c.bigRelease(r.resp_big, r.hdr_len + r.body_len);
            r.resp_big = none;
        }
        r.conn = none;
        r.sid = 0;
        r.s_prev = none;
        r.s_next = none;
        r.in_send = false;
        r.hdrs_sent = false;
        r.body_sent = 0;
        r.send_win = 0;
        r.recv_used = 0;
        r.wu_pending = 0;
        r.headers_done = false;
        r.got_bytes = false;
        r.resp_fail = .none;
        r.hdr_len = 0;
        r.body_len = 0;
        r.status = 0;
        r.json = false;
        r.ct_seen = false;
        r.clen = null;
    }

    fn h2StartStream(c: *Client, ci: u32, ri: u32) void {
        const cn = &c.conns[ci];
        const h = c.h2Of(ci);
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .active and r.sid == 0 and h.next_sid % 2 == 1);
        c.onWire(ri);
        r.conn = ci;
        r.sid = h.next_sid;
        c.smapInsert(h, ri);
        h.next_sid += 2;
        h.open += 1;
        c.h2_open_total += 1;
        r.send_win = h.peer.initial_window_size;
        r.last_io_ms = c.now_ms;
        c.counters.h2_streams += 1;
        c.h2QueueSend(ci, ri);
        // A full connection goes to the back of the origin's list.
        if (c.h2Room(ci) == 0) c.h2List(ci, false);
        cn.deadline_ms = 0;
        c.h2Kick(ci);
    }

    fn h2QueueSend(c: *Client, ci: u32, ri: u32) void {
        const h = c.h2Of(ci);
        const r = &c.reqs[ri];
        if (r.in_send) return;
        r.in_send = true;
        r.s_next = none;
        r.s_prev = h.send_tail;
        if (h.send_tail != none) c.reqs[h.send_tail].s_next = ri else h.send_head = ri;
        h.send_tail = ri;
    }

    fn h2UnqueueSend(c: *Client, ci: u32, ri: u32) void {
        const h = c.h2Of(ci);
        const r = &c.reqs[ri];
        if (!r.in_send) return;
        if (r.s_prev != none) c.reqs[r.s_prev].s_next = r.s_next else h.send_head = r.s_next;
        if (r.s_next != none) c.reqs[r.s_next].s_prev = r.s_prev else h.send_tail = r.s_prev;
        r.s_prev = none;
        r.s_next = none;
        r.in_send = false;
    }

    /// End a stream's place on its connection (map, send list, count).
    fn h2CloseStream(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        const ci = r.conn;
        std.debug.assert(ci != none);
        const cn = &c.conns[ci];
        const h = c.h2Of(ci);
        c.h2UnqueueSend(ci, ri);
        c.smapRemove(h, r.sid);
        const was_full = c.h2Room(ci) == 0;
        h.open -= 1;
        c.h2_open_total -= 1;
        r.conn = none;
        h.freed = true;
        // No stream left: the map starts clean (no tombstones).
        if (h.open == 0) @memset(h.smap, none);
        if (h.goaway) {
            if (h.open == 0) cn.deadline_ms = c.now_ms; // Closed by the next scan.
            return;
        }
        if (was_full and c.h2Room(ci) > 0) c.h2List(ci, true);
        if (h.open == 0) cn.deadline_ms = c.now_ms + c.cfg.idle_timeout_ms;
    }

    /// Queue RST_STREAM for a stream that we give up (timeout). A stream
    /// whose HEADERS never went out is idle for the server: no RST.
    fn h2Cancel(c: *Client, ri: u32, code: http2.ErrorCode) void {
        const r = &c.reqs[ri];
        const ci = r.conn;
        const h = c.h2Of(ci);
        if (r.hdrs_sent and h.nrsts < h.rsts.len) {
            h.rsts[h.nrsts] = .{ .sid = r.sid, .code = code };
            h.nrsts += 1;
        }
        c.h2CloseStream(ri);
        c.h2Kick(ci);
    }

    /// Fail or requeue every stream of a connection that is going away.
    fn h2FailAll(c: *Client, ci: u32, msg: []const u8) void {
        const h = c.h2Of(ci);
        var i: usize = 0;
        while (i < h.smap.len) : (i += 1) {
            const ri = h.smap[i];
            if (ri == none or ri == tomb) continue;
            const r = &c.reqs[ri];
            c.h2UnqueueSend(ci, ri);
            h.smap[i] = none;
            h.open -= 1;
            c.h2_open_total -= 1;
            r.conn = none;
            if (r.built.retry_safe and !r.got_bytes and !r.retried) {
                r.retried = true;
                c.counters.requeued += 1;
                c.resetStream(ri);
                c.enqueue(r.origin, ri, true);
                c.pending_pump = true;
            } else {
                c.resetStream(ri);
                c.failReq(ri, msg);
            }
        }
        std.debug.assert(h.open == 0);
    }

    /// `closeConn` of an h2 connection whose streams are all gone already
    /// keeps this a no-op; otherwise they fail.
    fn h2DropStreams(c: *Client, ci: u32) void {
        const h = c.h2Of(ci);
        if (h.open > 0) c.h2FailAll(ci, "http: the connection closed before the response was complete");
    }

    /// A connection error: GOAWAY with the code, then close. Streams that
    /// can be sent again go back to the queue.
    fn h2ConnError(c: *Client, ci: u32, code: http2.ErrorCode, what: []const u8) void {
        const cn = &c.conns[ci];
        const h = c.h2Of(ci);
        // GOAWAY only on a frame boundary; the server sees the close anyway.
        if (cn.wsent == cn.wlen) {
            var len: usize = 0;
            var buf: [17]u8 = undefined;
            http2.writeGoaway(&buf, &len, 0, code) catch {};
            _ = c.write(ci, buf[0..len]);
        }
        _ = h;
        c.connFailFmt(ci, "HTTP/2 error with {s}: {s} ({s})", .{ c.hostPort(ci), what, code.text() });
    }

    /// Bytes from an h2 connection, all of them, through the frame reader.
    fn h2Read(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const gen = cn.gen;
        var got = false;
        var guard: u32 = 0;
        while (guard < 1 << 16) : (guard += 1) {
            if (cn.state != .h2 or cn.gen != gen) return;
            switch (c.read(ci, cn.rbuf)) {
                .n => |k| {
                    got = true;
                    cn.last_io_ms = c.now_ms;
                    const h = c.h2Of(ci);
                    var handler: H2Handler = .{ .c = c, .ci = ci };
                    h.reader.feed(cn.rbuf[0..k], &handler) catch |e| {
                        const code: http2.ErrorCode = switch (e) {
                            error.FrameSize => .frame_size,
                            error.Protocol => .protocol,
                            error.HeaderBlockTooLarge => .enhance_your_calm,
                            error.Conn => h.err orelse .protocol,
                        };
                        const what = switch (e) {
                            error.FrameSize => "a frame is larger than allowed",
                            error.Protocol => "the server broke the protocol",
                            error.HeaderBlockTooLarge => "a response header block is larger than --egress-h2 limits",
                            error.Conn => h.err_msg,
                        };
                        return c.h2ConnError(ci, code, what);
                    };
                    if (h.freed) {
                        h.freed = false;
                        if (c.origins[cn.origin].queued > 0) c.pending_pump = true;
                    }
                    // A drained connection after GOAWAY closes.
                    if (h.goaway and h.open == 0) {
                        c.h2Flush(ci);
                        return c.closeConn(ci);
                    }
                    if (!c.mayHaveMore(ci, k, cn.rbuf.len)) break;
                },
                .want_read => break,
                .again => {
                    c.armWrite(ci);
                    break;
                },
                .closed => return c.connFailFmt(ci, "the connection to {s} closed", .{c.hostPort(ci)}),
                .failed => return c.tlsFail(ci),
            }
        }
        // Frames to answer (acks, windows) go out at the end of the round.
        // A read that found nothing queues nothing: no busy loop.
        if (got and cn.state == .h2 and cn.gen == gen) c.h2Kick(ci);
    }

    /// Build frames into the write buffer and send them, until the
    /// socket or the windows stop us.
    fn h2Flush(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.state != .h2) return;
        const h = c.h2Of(ci);
        var wrote = false;
        var guard: u32 = 0;
        while (guard < 1 << 16) : (guard += 1) {
            if (cn.wsent == cn.wlen) {
                cn.wsent = 0;
                cn.wlen = 0;
            }
            c.h2Fill(ci, h);
            if (cn.wsent == cn.wlen) break;
            switch (c.write(ci, cn.wbuf[cn.wsent..cn.wlen])) {
                .n => |k| {
                    cn.wsent += k;
                    wrote = true;
                },
                .again => return c.armWrite(ci),
                .want_read => return,
                .closed => return c.connFailFmt(ci, "the connection to {s} closed", .{c.hostPort(ci)}),
                .failed => return c.tlsFail(ci),
            }
        }
        c.disarmWrite(ci);
        // A TLS write can take in records that the poller then does not
        // see: read once after a write that sent something.
        if (wrote) if (cn.session) |sess| if (sess.hasPending()) c.queueRead(ci);
    }

    /// Add frames to the free end of the write buffer.
    fn h2Fill(c: *Client, ci: u32, h: *H2) void {
        const cn = &c.conns[ci];
        const out = cn.wbuf;
        var len = cn.wlen;
        defer cn.wlen = len;
        if (!h.preface_sent) {
            if (out.len - len < http2.preface.len + 64) return;
            @memcpy(out[len..][0..http2.preface.len], http2.preface);
            len += http2.preface.len;
            http2.writeSettings(out, &len, &.{
                .{ .enable_push, 0 },
                .{ .initial_window_size, c.cfg.h2_stream_window },
                .{ .header_table_size, c.cfg.h2_table },
                .{ .max_header_list_size, @intCast(h.reader.block.len) },
            }) catch unreachable;
            if (c.cfg.h2_conn_window > http2.default_window) http2.writeWindowUpdate(out, &len, 0, c.cfg.h2_conn_window - http2.default_window) catch unreachable;
            h.preface_sent = true;
        }
        while (h.settings_acks > 0) {
            http2.writeSettingsAck(out, &len) catch return;
            h.settings_acks -= 1;
        }
        while (h.npings > 0) {
            http2.writePing(out, &len, h.pings[h.npings - 1], true) catch return;
            h.npings -= 1;
        }
        if (h.conn_wu > 0) {
            http2.writeWindowUpdate(out, &len, 0, h.conn_wu) catch return;
            h.conn_wu = 0;
        }
        while (h.nrsts > 0) {
            const x = h.rsts[h.nrsts - 1];
            http2.writeRst(out, &len, x.sid, x.code) catch return;
            h.nrsts -= 1;
        }
        // Streams in order; a stream that waits for a window leaves the list.
        var ri = h.send_head;
        var guard: u32 = 0;
        while (ri != none and guard < c.cfg.h2_streams + 1) : (guard += 1) {
            const r = &c.reqs[ri];
            const next = r.s_next;
            if (r.wu_pending > 0) {
                http2.writeWindowUpdate(out, &len, r.sid, r.wu_pending) catch return;
                r.wu_pending = 0;
            }
            const d = c.reqData(ri);
            const body = d[r.built.hdr_end..r.built.body_end];
            if (!r.hdrs_sent) {
                const frame_at = len;
                if (out.len - len < http2.frame_header_len + 16) return;
                var blen: usize = len + http2.frame_header_len;
                c.h2EncodeHeaders(ri, out, &blen) catch {
                    len = frame_at;
                    if (frame_at > cn.wsent) return; // After the bytes before it go out.
                    // Never sent: the stream id is skipped, with no RST.
                    c.h2CloseStream(ri);
                    c.resetStream(ri);
                    c.failReq(ri, "http: the request headers are larger than the connection write buffer");
                    ri = next;
                    continue;
                };
                const block_len = blen - len - http2.frame_header_len;
                http2.frameHeaderBlock(out, &len, r.sid, block_len, h.peer.max_frame_size, body.len == 0) catch {
                    len = frame_at;
                    return;
                };
                r.hdrs_sent = true;
                r.last_io_ms = c.now_ms;
            }
            var inner: u32 = 0;
            while (r.body_sent < body.len and inner < 1 << 16) : (inner += 1) {
                const room = out.len - len;
                if (room <= http2.frame_header_len) return;
                const win: i64 = @min(r.send_win, h.send_win);
                if (win <= 0) break;
                const n: u32 = @intCast(@min(@as(i64, @intCast(body.len - r.body_sent)), win, h.peer.max_frame_size, room - http2.frame_header_len));
                const last = r.body_sent + n == body.len;
                http2.writeDataHeader(out, &len, r.sid, n, last) catch return;
                @memcpy(out[len..][0..n], body[r.body_sent..][0..n]);
                len += n;
                r.body_sent += n;
                r.send_win -= n;
                h.send_win -= n;
            }
            // Done with this stream for now: all sent, or blocked on a
            // window (`h2Unblock` puts it back).
            c.h2UnqueueSend(ci, ri);
            ri = next;
        }
    }

    fn h2EncodeHeaders(c: *Client, ri: u32, out: []u8, len: *usize) error{NoSpace}!void {
        const r = &c.reqs[ri];
        const d = c.reqData(ri);
        const u = c.reqUrl(ri);
        var a: Out = .{ .buf = c.tmp };
        http.writeTarget(&a, u.target) catch return error.NoSpace;
        const o = &c.origins[r.origin];
        const path = c.tmp[0..a.len];
        try http2.encodeRequestFast(out, len, r.built.method(), u.https, o.auth_hpack[0..o.auth_hpack_len], path, d[r.built.url_len..r.built.hdr_end]);
    }

    /// Streams that wait for a window go back to the send list.
    fn h2Unblock(c: *Client, ci: u32) void {
        const h = c.h2Of(ci);
        for (h.smap) |ri| {
            if (ri == none or ri == tomb) continue;
            const r = &c.reqs[ri];
            if (r.hdrs_sent and r.body_sent < r.built.body_end - r.built.hdr_end and r.send_win > 0) c.h2QueueSend(ci, ri);
        }
    }

    /// The response area of a stream: after the request in its buffer, or
    /// a large buffer.
    fn respArea(c: *Client, ri: u32) []u8 {
        const r = &c.reqs[ri];
        if (r.resp_big != none) return c.bigSlice(r.resp_big);
        const d = c.reqData(ri);
        const at = std.mem.alignForward(usize, r.built.body_end, 8);
        return if (at >= d.len) d[d.len..] else d[at..];
    }

    /// Room for `more` bytes in the response area, moving it to a large
    /// buffer if needed. False when there is none.
    fn respRoom(c: *Client, ri: u32, more: usize) bool {
        const r = &c.reqs[ri];
        const used = r.hdr_len + r.body_len;
        const area = c.respArea(ri);
        if (area.len - used >= more) return true;
        if (r.resp_big != none) return false;
        const b = c.bigAcquire() orelse return false;
        const dst = c.bigSlice(b);
        @memcpy(dst[0..used], area[0..used]);
        r.resp_big = b;
        return c.big_size - used >= more;
    }

    fn h2Complete(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        const oi = r.origin;
        c.h2CloseStream(ri);
        const area = c.respArea(ri);
        const lines = area[0..r.hdr_len];
        c.feedback(oi, r.status, lines);
        const method = r.built.method();
        const is_redirect = (r.status == 301 or r.status == 302 or r.status == 303 or r.status == 307 or r.status == 308) and
            (std.mem.eql(u8, method, "GET") or std.mem.eql(u8, method, "HEAD"));
        if (is_redirect) if (headerValue(lines, "location")) |loc| {
            c.offWire(ri);
            if (!c.redirect(ri, loc)) c.pending_pump = true;
            return;
        };
        const trimmed = if (std.mem.endsWith(u8, lines, "\r\n")) lines[0 .. lines.len - 2] else lines;
        c.sink.done(c.sink.ctx, r.exec_id, r.seq, .{ .ok = .{ .status = r.status, .header_lines = trimmed, .body = area[r.hdr_len..][0..r.body_len], .json = r.json } });
        c.freeReq(ri);
    }

    fn h2FailResp(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        var b: [400]u8 = undefined;
        const hp = c.hostPort(r.conn);
        const msg = switch (r.resp_fail) {
            .none => unreachable,
            .body_limit => std.fmt.bufPrint(&b, "http: the response body from {s} is larger than {d} bytes", .{ hp, c.cfg.max_body }),
            .body_declared => std.fmt.bufPrint(&b, "http: the response body from {s} is {d} bytes; the limit is {d}", .{ hp, r.body_len, c.cfg.max_body }),
            .no_big => std.fmt.bufPrint(&b, "http: the response from {s} needs a large buffer and all {d} are in use", .{ hp, c.cfg.big_slots }),
            .window => std.fmt.bufPrint(&b, "http: {s} sent more than the HTTP/2 stream window", .{hp}),
            .headers_no_big => std.fmt.bufPrint(&b, "http: the response headers from {s} need a large buffer and all {d} are in use", .{ hp, c.cfg.big_slots }),
            .no_status => std.fmt.bufPrint(&b, "http: bad response head from {s} (no :status)", .{hp}),
            .interim_end => std.fmt.bufPrint(&b, "http: the stream from {s} ended after an interim response", .{hp}),
        } catch "http: the response failed";
        c.h2FailStream(ri, .cancel, msg);
    }

    fn h2FailStream(c: *Client, ri: u32, code: http2.ErrorCode, msg: []const u8) void {
        c.h2Cancel(ri, code);
        c.resetStream(ri);
        c.failReq(ri, msg);
    }

    const H2Handler = struct {
        c: *Client,
        ci: u32,
        pub const Err = error{Conn};

        fn h(self: *H2Handler) *H2 {
            return self.c.h2Of(self.ci);
        }

        fn connErr(self: *H2Handler, code: http2.ErrorCode, msg: []const u8) Err {
            self.h().err = code;
            self.h().err_msg = msg;
            return error.Conn;
        }

        /// The request of a stream that is still ours.
        fn stream(self: *H2Handler, sid: u32) ?u32 {
            if (sid % 2 == 0) return null;
            return self.c.smapFind(self.h(), sid);
        }

        pub fn onDataStart(self: *H2Handler, sid: u32, flow: u32, end_stream: bool) Err!void {
            const c = self.c;
            const hh = self.h();
            hh.recv_used += flow;
            if (hh.recv_used > c.cfg.h2_conn_window) return self.connErr(.flow_control, "the server sent more than the connection window");
            if (hh.recv_used >= c.cfg.h2_conn_window / 2) {
                hh.conn_wu += hh.recv_used;
                hh.recv_used = 0;
            }
            const ri = self.stream(sid) orelse return;
            const r = &c.reqs[ri];
            if (!r.headers_done) return self.connErr(.protocol, "DATA before HEADERS");
            r.recv_used += flow;
            r.last_io_ms = c.now_ms;
            if (r.recv_used > c.cfg.h2_stream_window) {
                r.resp_fail = .window;
                return;
            }
            if (!end_stream and r.recv_used >= c.cfg.h2_stream_window / 2) {
                r.wu_pending += r.recv_used;
                r.recv_used = 0;
                c.h2QueueSend(self.ci, ri);
            }
        }

        pub fn onData(self: *H2Handler, sid: u32, bytes: []const u8) Err!void {
            const c = self.c;
            const ri = self.stream(sid) orelse return;
            const r = &c.reqs[ri];
            if (r.resp_fail != .none) return;
            r.got_bytes = true;
            if (r.body_len + bytes.len > c.cfg.max_body) {
                r.resp_fail = .body_limit;
                return;
            }
            if (!c.respRoom(ri, bytes.len)) {
                r.resp_fail = .no_big;
                return;
            }
            const area = c.respArea(ri);
            @memcpy(area[r.hdr_len + r.body_len ..][0..bytes.len], bytes);
            r.body_len += @intCast(bytes.len);
        }

        pub fn onDataEnd(self: *H2Handler, sid: u32, end_stream: bool) Err!void {
            const c = self.c;
            const ri = self.stream(sid) orelse return;
            const r = &c.reqs[ri];
            if (r.resp_fail != .none) return c.h2FailResp(ri);
            if (end_stream) c.h2Complete(ri);
        }

        pub fn onHeaders(self: *H2Handler, sid: u32, block: []const u8, end_stream: bool) Err!void {
            const c = self.c;
            const hh = self.h();
            const maybe = self.stream(sid);
            if (maybe == null or c.reqs[maybe.?].headers_done) {
                // A stream we gave up, or trailers: decode to keep the
                // table in step, and drop.
                var d: Discard = .{};
                hh.dec.decode(block, &d) catch return self.connErr(.compression, "a response header block does not decode");
                if (maybe) |ri| if (end_stream) {
                    if (c.reqs[ri].resp_fail != .none) return c.h2FailResp(ri);
                    c.h2Complete(ri);
                };
                return;
            }
            const ri = maybe.?;
            const r = &c.reqs[ri];
            r.got_bytes = true;
            r.last_io_ms = c.now_ms;
            var sink: Lines = .{ .c = c, .ri = ri };
            hh.dec.decode(block, &sink) catch return self.connErr(.compression, "a response header block does not decode");
            if (sink.overflow) r.resp_fail = .headers_no_big;
            if (r.status == 0 and r.resp_fail == .none) r.resp_fail = .no_status;
            if (r.resp_fail == .none) if (r.clen) |n| {
                if (n > c.cfg.max_body) {
                    r.resp_fail = .body_declared;
                    r.body_len = @intCast(@min(n, std.math.maxInt(u32)));
                }
            };
            if (r.status >= 100 and r.status < 200 and r.resp_fail == .none) {
                // An interim response: drop it.
                r.hdr_len = 0;
                r.status = 0;
                r.json = false;
                r.ct_seen = false;
                r.clen = null;
                if (end_stream) r.resp_fail = .interim_end;
            } else {
                r.headers_done = true;
            }
            if (r.resp_fail == .body_declared or (end_stream and r.resp_fail != .none)) return c.h2FailResp(ri);
            if (end_stream) c.h2Complete(ri);
        }

        pub fn onRst(self: *H2Handler, sid: u32, code: http2.ErrorCode) Err!void {
            const c = self.c;
            const ri = self.stream(sid) orelse return;
            const r = &c.reqs[ri];
            c.h2CloseStream(ri);
            if (code == .refused_stream or (code == .no_error and !r.got_bytes)) {
                // Not processed (RFC 9113 8.7): safe to send again.
                c.resetStream(ri);
                c.counters.requeued += 1;
                c.enqueue(r.origin, ri, true);
                c.pending_pump = true;
                return;
            }
            c.resetStream(ri);
            var b: [160]u8 = undefined;
            c.failReq(ri, std.fmt.bufPrint(&b, "http: the server reset the stream ({s})", .{code.text()}) catch "http: the server reset the stream");
        }

        pub fn onSetting(self: *H2Handler, id: u16, v: u32) Err!void {
            const c = self.c;
            const hh = self.h();
            switch (@as(http2.SettingId, @fromBackingInt(@intCast(id)))) {
                .header_table_size => hh.peer.header_table_size = v,
                .enable_push => if (v > 1) return self.connErr(.protocol, "SETTINGS_ENABLE_PUSH is not 0 or 1"),
                .max_concurrent_streams => hh.peer.max_concurrent_streams = v,
                .initial_window_size => {
                    if (v > http2.max_window) return self.connErr(.flow_control, "SETTINGS_INITIAL_WINDOW_SIZE is too large");
                    const delta: i64 = @as(i64, v) - hh.peer.initial_window_size;
                    hh.peer.initial_window_size = v;
                    for (hh.smap) |ri| {
                        if (ri == none or ri == tomb) continue;
                        c.reqs[ri].send_win += delta;
                        if (c.reqs[ri].send_win > http2.max_window) return self.connErr(.flow_control, "a stream window is too large");
                    }
                    if (delta > 0) c.h2Unblock(self.ci);
                },
                .max_frame_size => {
                    if (v < http2.default_max_frame or v > http2.max_max_frame) return self.connErr(.protocol, "SETTINGS_MAX_FRAME_SIZE is out of range");
                    hh.peer.max_frame_size = v;
                },
                .max_header_list_size => hh.peer.max_header_list_size = v,
                _ => {},
            }
        }

        pub fn onSettingsEnd(self: *H2Handler, ack: bool) Err!void {
            const hh = self.h();
            if (ack) return;
            hh.settings_acks += 1;
            if (!hh.got_settings) {
                hh.got_settings = true;
                const c = self.c;
                const cn = &c.conns[self.ci];
                c.origins[cn.origin].h2_opening -= 1;
                if (hh.goaway) return;
                // The stream cap is known now.
                if (c.h2Room(self.ci) > 0) c.h2List(self.ci, true) else c.h2List(self.ci, false);
                if (c.origins[cn.origin].queued > 0) c.pending_pump = true;
            }
        }

        pub fn onPing(self: *H2Handler, data: [8]u8, ack: bool) Err!void {
            const hh = self.h();
            if (ack) return;
            if (hh.npings >= hh.pings.len) return self.connErr(.enhance_your_calm, "too many PING frames");
            hh.pings[hh.npings] = data;
            hh.npings += 1;
        }

        pub fn onGoaway(self: *H2Handler, last: u32, code: http2.ErrorCode) Err!void {
            const c = self.c;
            const hh = self.h();
            _ = code;
            hh.goaway = true;
            c.h2Unlist(self.ci);
            // Streams above `last` were not processed: send them again. A
            // removal can shift a later entry into slot i, so i stays.
            var i: usize = 0;
            var guard: usize = 0;
            while (i < hh.smap.len and guard < hh.smap.len * 2) : (guard += 1) {
                const ri = hh.smap[i];
                if (ri == none or ri == tomb or c.reqs[ri].sid <= last) {
                    i += 1;
                    continue;
                }
                const r = &c.reqs[ri];
                c.h2CloseStream(ri);
                c.resetStream(ri);
                c.counters.requeued += 1;
                c.enqueue(r.origin, ri, true);
                c.pending_pump = true;
            }
        }

        pub fn onWindowUpdate(self: *H2Handler, sid: u32, inc: u32) Err!void {
            const c = self.c;
            const hh = self.h();
            if (sid == 0) {
                if (inc == 0) return self.connErr(.protocol, "WINDOW_UPDATE of 0");
                hh.send_win += inc;
                if (hh.send_win > http2.max_window) return self.connErr(.flow_control, "the connection window is too large");
                c.h2Unblock(self.ci);
                return;
            }
            const ri = self.stream(sid) orelse return;
            const r = &c.reqs[ri];
            if (inc == 0) return c.h2FailStream(ri, .protocol, "http: the server sent WINDOW_UPDATE of 0");
            r.send_win += inc;
            if (r.send_win > http2.max_window) return c.h2FailStream(ri, .flow_control, "http: the server made the stream window too large");
            if (r.hdrs_sent and r.body_sent < r.built.body_end - r.built.hdr_end) c.h2QueueSend(self.ci, ri);
        }
    };

    /// Response header fields as HTTP/1.1-style lines, for the same result
    /// shape. `:status` sets the status; other pseudo-headers are dropped.
    const Lines = struct {
        c: *Client,
        ri: u32,
        overflow: bool = false,
        pub const Err = error{};

        pub fn field(s: *Lines, name: []const u8, value: []const u8) Err!void {
            const r = &s.c.reqs[s.ri];
            if (name.len > 0 and name[0] == ':') {
                if (std.mem.eql(u8, name, ":status")) r.status = std.fmt.parseInt(u16, value, 10) catch 0;
                return;
            }
            if (s.overflow) return;
            // HTTP/2 names are lower case (RFC 9113 8.2.1).
            if (name.len == 12 and std.mem.eql(u8, name, "content-type") and !r.ct_seen) {
                r.ct_seen = true;
                r.json = containsIgnoreCase(value, "json");
            } else if (name.len == 14 and std.mem.eql(u8, name, "content-length") and r.clen == null) {
                r.clen = std.fmt.parseInt(u64, value, 10) catch null;
            }
            const need = name.len + value.len + 4;
            if (!s.c.respRoom(s.ri, need)) {
                s.overflow = true;
                return;
            }
            const area = s.c.respArea(s.ri);
            var p: usize = r.hdr_len;
            @memcpy(area[p..][0..name.len], name);
            p += name.len;
            @memcpy(area[p..][0..2], ": ");
            p += 2;
            @memcpy(area[p..][0..value.len], value);
            p += value.len;
            @memcpy(area[p..][0..2], "\r\n");
            r.hdr_len += @intCast(need);
        }
    };

    const Discard = struct {
        pub const Err = error{};
        pub fn field(_: *Discard, _: []const u8, _: []const u8) Err!void {}
    };

    // ---- results ----------------------------------------------------------------

    fn sinkErr(c: *Client, exec_id: u64, seq: u32, comptime fmt: []const u8, args: anytype) void {
        var b: [512]u8 = undefined;
        c.sink.done(c.sink.ctx, exec_id, seq, .{ .err = std.fmt.bufPrint(&b, fmt, args) catch "http: error" });
    }

    fn failReqFmt(c: *Client, ri: u32, comptime fmt: []const u8, args: anytype) void {
        var b: [512]u8 = undefined;
        c.failReq(ri, std.fmt.bufPrint(&b, fmt, args) catch "http: error");
    }

    /// Report an error for a request that is active (not queued) and
    /// release it.
    fn failReq(c: *Client, ri: u32, msg: []const u8) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .active);
        c.sink.done(c.sink.ctx, r.exec_id, r.seq, .{ .err = msg });
        c.freeReq(ri);
    }

    /// Fail a request that never left `start`.
    fn failFree(c: *Client, ri: u32, msg: []const u8) void {
        const r = &c.reqs[ri];
        c.sink.done(c.sink.ctx, r.exec_id, r.seq, .{ .err = msg });
        if (r.big != none) c.bigRelease(r.big, 0);
        r.big = none;
        c.rfree[c.nrfree] = ri;
        c.nrfree += 1;
    }

    fn failFreeFmt(c: *Client, ri: u32, comptime fmt: []const u8, args: anytype) void {
        var b: [256]u8 = undefined;
        c.failFree(ri, std.fmt.bufPrint(&b, fmt, args) catch "http: error");
    }

    fn freeReq(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .active);
        std.debug.assert(r.conn == none);
        if (r.origin != none) {
            c.offWire(ri);
            c.origins[r.origin].refs -= 1;
        }
        r.origin = none;
        c.wheelRemove(ri);
        r.h1conn = none;
        c.resetStream(ri);
        if (r.big != none) c.bigRelease(r.big, r.built.body_end);
        r.big = none;
        r.state = .free;
        c.active -= 1;
        c.rfree[c.nrfree] = ri;
        c.nrfree += 1;
    }

    /// Connect timeouts and idle expiry, by connection (connections are
    /// few with HTTP/2, and each check is a compare); request deadlines and
    /// read timeouts by the timer wheel, which touches only due requests.
    fn scanTimeouts(c: *Client) void {
        const now = c.now_ms;
        c.wheelAdvance(now);
        if (c.ncfree == c.conns.len) return;
        for (c.conns, 0..) |*cn, i| {
            const ci: u32 = @intCast(i);
            switch (cn.state) {
                .free, .sending, .reading => {},
                .idle => if (now >= cn.deadline_ms) c.closeConn(ci),
                .h2 => if (c.h2s[cn.h2].open == 0 and cn.deadline_ms != 0 and now >= cn.deadline_ms) c.closeConn(ci),
                .connecting, .handshaking => if (now >= cn.deadline_ms) {
                    c.connFailFmt(ci, "connect to {s} timed out after {d} ms", .{ c.hostPort(ci), c.connectMs(cn.origin) });
                },
            }
        }
    }

    /// When the request must be looked at next: its deadline, or sooner
    /// for a read timeout while it waits for a response.
    fn nextCheck(c: *Client, ri: u32) i64 {
        const r = &c.reqs[ri];
        const read_ms = if (r.origin != none) c.readMs(r.origin) else c.cfg.read_timeout_ms;
        const stuck_at = if (c.cfg.stuck_ms > 0 and !r.stuck_reported) r.started_ms + c.cfg.stuck_ms else std.math.maxInt(i64);
        if (read_ms <= 0) return @min(r.deadline_ms, stuck_at);
        const last = if (r.conn != none) r.last_io_ms else if (r.h1conn != none and c.conns[r.h1conn].req == ri) c.conns[r.h1conn].last_io_ms else c.now_ms;
        return @min(@min(r.deadline_ms, stuck_at), @max(last, c.now_ms) + read_ms);
    }

    /// One line about a request that has waited `stuck_ms`: where it is
    /// and what it waits for, so a hang can be told from a slow server.
    fn reportStuck(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        r.stuck_reported = true;
        const o = &c.origins[r.origin];
        var cb: [200]u8 = undefined;
        var cs: []const u8 = "none";
        const ci = if (r.conn != none) r.conn else if (r.h1conn != none and c.conns[r.h1conn].req == ri) r.h1conn else none;
        if (ci != none) {
            const cn = &c.conns[ci];
            const pend = if (cn.session) |sess| sess.hasPending() else false;
            cs = if (cn.state == .h2) blk: {
                const h = c.h2Of(ci);
                break :blk std.fmt.bufPrint(&cb, "conn {d} h2 open={d} settings={any} goaway={any} send_win={d} wbuf={d}/{d} tls_pending={any} queued_read={any} flush_queued={any} last_io={d}ms", .{ ci, h.open, h.got_settings, h.goaway, h.send_win, cn.wsent, cn.wlen, pend, cn.read_queued, cn.flush_queued, c.now_ms - cn.last_io_ms }) catch "conn";
            } else std.fmt.bufPrint(&cb, "conn {d} {s} rlen={d} head={any} body={d} tls_pending={any} queued_read={any} write_armed={any} last_io={d}ms", .{ ci, @tagName(cn.state), cn.rlen, cn.head != null, cn.body_len, pend, cn.read_queued, cn.write_armed, c.now_ms - cn.last_io_ms }) catch "conn";
        }
        std.debug.print("egress: request {d}/{d} to {s}:{d} has waited {d} ms: {s} sid={d} hdrs_sent={any} headers_done={any} body={d} attempt={d}; origin inflight={d} queued={d} limit={d} conns={d} h2_opening={d} alpn_known={any} h2_known={any} hold={d}ms; {s}\n", .{
            r.exec_id,                           r.seq,          o.hostSlice()[0..@min(o.host_len, 120)], o.port,       c.now_ms - r.started_ms, @tagName(r.state),
            r.sid,                               r.hdrs_sent,    r.headers_done,                          r.body_len,   r.attempt,               o.inflight,
            o.queued,                            c.wireLimit(o), o.nconns,                                o.h2_opening, o.alpn_known,            o.h2_known,
            @max(0, o.hold_until_ms - c.now_ms), cs,
        });
    }

    fn wheelInsert(c: *Client, ri: u32, at_ms: i64) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.w_slot == none);
        const tick = std.math.clamp(@divFloor(at_ms, wheel_tick_ms), c.wheel_tick + 1, c.wheel_tick + wheel_len - 1);
        const slot: u32 = @intCast(@mod(tick, wheel_len));
        r.w_slot = slot;
        r.w_prev = none;
        r.w_next = c.wheel[slot];
        if (r.w_next != none) c.reqs[r.w_next].w_prev = ri;
        c.wheel[slot] = ri;
    }

    fn wheelRemove(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        if (r.w_slot == none) return;
        if (r.w_prev != none) c.reqs[r.w_prev].w_next = r.w_next else c.wheel[r.w_slot] = r.w_next;
        if (r.w_next != none) c.reqs[r.w_next].w_prev = r.w_prev;
        r.w_slot = none;
        r.w_prev = none;
        r.w_next = none;
    }

    /// Visit the slots from the last tick to now. A long pause visits
    /// each slot once.
    fn wheelAdvance(c: *Client, now: i64) void {
        const target = @divFloor(now, wheel_tick_ms);
        if (c.wheel_tick == 0) c.wheel_tick = target;
        var steps: u32 = 0;
        while (c.wheel_tick < target and steps < wheel_len) : (steps += 1) {
            c.wheel_tick += 1;
            const slot: u32 = @intCast(@mod(c.wheel_tick, wheel_len));
            // Detach the list: checks put requests back in later slots.
            var ri = c.wheel[slot];
            c.wheel[slot] = none;
            var guard: u32 = 0;
            while (ri != none and guard < c.reqs.len) : (guard += 1) {
                const next = c.reqs[ri].w_next;
                const r = &c.reqs[ri];
                r.w_slot = none;
                r.w_prev = none;
                r.w_next = none;
                c.checkReq(ri);
                ri = next;
            }
        }
        if (c.wheel_tick < target) c.wheel_tick = target;
    }

    /// A due request: time it out, or put it back for its next check.
    fn checkReq(c: *Client, ri: u32) void {
        const now = c.now_ms;
        const r = &c.reqs[ri];
        const read_ms = c.readMs(r.origin);
        if (r.state != .free and c.cfg.stuck_ms > 0 and !r.stuck_reported and now - r.started_ms >= c.cfg.stuck_ms and now < r.deadline_ms) c.reportStuck(ri);
        switch (r.state) {
            .free => return,
            .queued => if (now >= r.deadline_ms) {
                c.unqueue(ri);
                return c.failReqFmt(ri, "http: the request timed out after {d} ms", .{r.timeout_ms});
            },
            .active => if (r.conn != none and r.sid != 0) {
                if (now >= r.deadline_ms) {
                    const ci = r.conn;
                    c.h2Cancel(ri, .cancel);
                    var b: [320]u8 = undefined;
                    const msg = std.fmt.bufPrint(&b, "http: the request to {s} timed out after {d} ms", .{ c.hostPort(ci), r.timeout_ms }) catch "http: the request timed out";
                    c.resetStream(ri);
                    return c.failReq(ri, msg);
                }
                if (read_ms > 0 and r.hdrs_sent and now - r.last_io_ms >= read_ms) {
                    c.h2Cancel(ri, .cancel);
                    c.resetStream(ri);
                    return c.failReqFmt(ri, "http: no data for {d} ms (read timeout)", .{read_ms});
                }
            } else if (r.h1conn != none and c.conns[r.h1conn].req == ri) {
                const ci = r.h1conn;
                const cn = &c.conns[ci];
                switch (cn.state) {
                    .connecting, .handshaking => if (now >= r.deadline_ms) {
                        cn.req = none;
                        return c.failReqFmt(ri, "http: the request timed out after {d} ms", .{r.timeout_ms});
                    },
                    .sending, .reading => {
                        if (now >= r.deadline_ms) return c.connFailFmt(ci, "the request to {s} timed out after {d} ms", .{ c.hostPort(ci), r.timeout_ms });
                        if (cn.state == .reading and read_ms > 0 and now - cn.last_io_ms >= read_ms) return c.connFailFmt(ci, "no data from {s} for {d} ms (read timeout)", .{ c.hostPort(ci), read_ms });
                    },
                    else => {},
                }
            },
        }
        c.wheelInsert(ri, c.nextCheck(ri));
    }

    fn connectMs(c: *Client, oi: u32) i64 {
        const o = &c.origins[oi];
        return if (o.lim.connect_ms > 0) o.lim.connect_ms else c.cfg.connect_timeout_ms;
    }

    fn readMs(c: *Client, oi: u32) i64 {
        const o = &c.origins[oi];
        return if (o.lim.read_ms > 0) o.lim.read_ms else c.cfg.read_timeout_ms;
    }

    // ---- large buffers --------------------------------------------------------------

    pub fn bigAcquire(c: *Client) ?u32 {
        if (c.nbig_free == 0) return null;
        c.nbig_free -= 1;
        return c.big_free[c.nbig_free];
    }

    pub fn bigSlice(c: *Client, b: u32) []u8 {
        return c.big_mem[b * c.big_size ..][0..c.big_size];
    }

    pub fn bigRelease(c: *Client, b: u32, used: usize) void {
        std.debug.assert(c.nbig_free < c.big_free.len);
        for (c.big_free[0..c.nbig_free]) |f| std.debug.assert(f != b); // A double release.
        sys.poison(c.bigSlice(b)[0..@min(used, c.big_size)]);
        if (used >= big_release_bytes) sys.releasePages(c.bigSlice(b)[0..@min(used, c.big_size)]);
        c.big_free[c.nbig_free] = b;
        c.nbig_free += 1;
    }
};

fn containsIgnoreCase(hay: []const u8, needle: []const u8) bool {
    if (needle.len > hay.len) return false;
    var i: usize = 0;
    while (i + needle.len <= hay.len) : (i += 1) {
        if (std.ascii.eqlIgnoreCase(hay[i..][0..needle.len], needle)) return true;
    }
    return false;
}

/// The first value of a header in CRLF-separated lines.
pub fn headerValue(lines: []const u8, name: []const u8) ?[]const u8 {
    var it = std.mem.splitSequence(u8, lines, "\r\n");
    while (it.next()) |line| {
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse continue;
        if (std.ascii.eqlIgnoreCase(std.mem.trim(u8, line[0..colon], " \t"), name)) return std.mem.trim(u8, line[colon + 1 ..], " \t");
    }
    return null;
}

/// `Retry-After` in ms from now: delay seconds, or an HTTP date
/// (IMF-fixdate). Null when absent or not understood.
pub fn retryAfterMs(lines: []const u8, now_ms: i64) ?i64 {
    const v = headerValue(lines, "retry-after") orelse return null;
    if (std.fmt.parseInt(u32, v, 10)) |s| return @as(i64, s) * 1000 else |_| {}
    const at = parseHttpDate(v) orelse return null;
    return @max(0, at - now_ms);
}

/// "Sun, 06 Nov 1994 08:49:37 GMT" as ms since the epoch.
pub fn parseHttpDate(s: []const u8) ?i64 {
    if (s.len != 29 or s[3] != ',' or !std.mem.endsWith(u8, s, " GMT")) return null;
    const day = std.fmt.parseInt(u32, s[5..7], 10) catch return null;
    const months = [_][]const u8{ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
    var month: u32 = 0;
    for (months, 1..) |m, i| {
        if (std.mem.eql(u8, s[8..11], m)) month = @intCast(i);
    }
    if (month == 0) return null;
    const year = std.fmt.parseInt(i64, s[12..16], 10) catch return null;
    const hh = std.fmt.parseInt(i64, s[17..19], 10) catch return null;
    const mm = std.fmt.parseInt(i64, s[20..22], 10) catch return null;
    const ss = std.fmt.parseInt(i64, s[23..25], 10) catch return null;
    if (day < 1 or day > 31 or hh > 23 or mm > 59 or ss > 60) return null;
    // Days from civil (Howard Hinnant).
    const y = if (month <= 2) year - 1 else year;
    const era = @divFloor(y, 400);
    const yoe = y - era * 400;
    const mp: i64 = @mod(@as(i64, month) + 9, 12);
    const doy = @divFloor(153 * mp + 2, 5) + @as(i64, day) - 1;
    const doe = yoe * 365 + @divFloor(yoe, 4) - @divFloor(yoe, 100) + doy;
    const days = era * 146097 + doe - 719468;
    return ((days * 24 + hh) * 60 + mm) * 60_000 + ss * 1000;
}

test "egress: Retry-After as seconds and as an HTTP date" {
    try std.testing.expectEqual(@as(?i64, 120_000), retryAfterMs("content-type: x\r\nRetry-After: 120", 0));
    try std.testing.expectEqual(@as(?i64, null), retryAfterMs("content-type: x", 0));
    // 1994-11-06T08:49:37Z
    try std.testing.expectEqual(@as(?i64, 784111777000), parseHttpDate("Sun, 06 Nov 1994 08:49:37 GMT"));
    try std.testing.expectEqual(@as(?i64, 5000), retryAfterMs("retry-after: Sun, 06 Nov 1994 08:49:42 GMT", 784111777000));
    try std.testing.expectEqual(@as(?i64, null), parseHttpDate("Sunday, 06-Nov-94 08:49:37 GMT"));
}

test "egress: origin rules" {
    const r = try Rule.parse("*.example.com:443 conns=8 inflight=64 queue=100 rate=50 burst=5 connect-ms=2000 read-ms=3000 timeout-ms=9000 h2=off aimd=off");
    try std.testing.expect(r.suffix and r.port == 443);
    try std.testing.expect(r.matches("api.example.com", 443));
    try std.testing.expect(!r.matches("example.com", 443));
    try std.testing.expect(!r.matches("api.example.com", 80));
    try std.testing.expectEqual(@as(u32, 64), r.limits.max_inflight);
    try std.testing.expectEqual(H2Mode.off, r.limits.h2);
    const base: Limits = .{ .max_conns = 100, .read_ms = 7 };
    const eff = base.over(r.limits);
    try std.testing.expectEqual(@as(u32, 8), eff.max_conns);
    try std.testing.expectEqual(@as(u32, 3000), eff.read_ms);
    try std.testing.expectEqual(@as(u32, 100), base.over((try Rule.parse("x.io rate=1")).limits).max_conns);
    try std.testing.expect((try Rule.parse("*")).any);
    try std.testing.expectError(error.BadRule, Rule.parse("x.io conns=abc"));
    try std.testing.expectError(error.BadRule, Rule.parse("x.io nope=1"));
}

test "egress: sizing from rate and latency" {
    const s = sizeFor(100_000, 300, 0, .{});
    try std.testing.expectEqual(@as(u32, 45_000), s.max_reqs);
    try std.testing.expectEqual(@as(u32, 37_500), s.max_conns);
    const b = sizeFor(100_000, 300, 64, .{});
    try std.testing.expect(b.max_reqs < 45_000 and b.max_conns < 37_500);
}
