//! The Microsoft SQL Server client of one shard, for the `sql` effect with
//! the dialect `mssql` (spec section 9.10): TDS 7.2 to 7.4 over TCP, as
//! tedious 20 speaks it for `mssql` 12 and the v1 node, on the shard's
//! event loop. It never blocks. The codec is `core/tdswire.zig`.
//!
//! A connection: PRELOGIN; when the server wants encryption, the TLS
//! handshake inside PRELOGIN packets, and after it TLS for the whole
//! stream; LOGIN7 with SQL authentication; then the SQL batch of `set`
//! statements that tedious sends.
//!
//! A call is a list of statements. Each one is the RPC `sp_executesql`
//! with bind values, as `request.query` of `mssql` sends it. The
//! statements run on one connection, one after the other, each alone: the
//! v1 node has no transaction.
//!
//! A call that the client cannot do exactly ends with an error whose text
//! has a marker (`(limit: sql-...)`); n8n then runs the node in the
//! fallback host. The checks that need no server run before the connection
//! opens (`ms_call.parseCall`, `checkRequests`, `loadCredential`). A reply
//! without a native form can only come from a statement that reads, and no
//! statement that writes ran before it: see `ms_call.checkStatements`.
//!
//! Limits, all set at start: calls in flight or waiting (`max_reqs`),
//! connections (`max_conns`), connections of one credential and host
//! (`pool_conns`), pools, the size of a call and of a result. A call over
//! a connection limit waits in order; a call over `max_reqs` fails with a
//! limit error. Every buffer is reserved in `init`.
const std = @import("std");
const core_lib = @import("core");
const tds = core_lib.tdswire;
const sys = @import("sys.zig");
const tls = @import("tls.zig");
const dns = @import("dns.zig");
const creds = @import("creds.zig");
const http = @import("http.zig");
const ms_call = @import("ms_call.zig");
const sql_net = @import("sql_net.zig");
const net_pool = @import("net_pool.zig");

const none: u32 = std.math.maxInt(u32);
/// The bytes of server, user, database and password of one call.
const cred_bytes = 1024;
/// The columns of one result set. A set with more runs in the fallback host.
const max_columns = 512;
/// TLS records of one connection that wait for OpenSSL or for the socket.
const cipher_bytes = 32 << 10;
const read_passes = 1024;
/// The message kind of ATTENTION: it cancels the request that runs.
const kind_attention: u8 = 0x06;
/// The RESETCONNECTION bit of a packet header: the session becomes new.
const status_reset: u8 = 0x08;
/// The DONE token, and its status bit that confirms an ATTENTION.
const token_done: u8 = 0xFD;
const done_attention: u16 = 0x20;
const done_bytes = 13;

pub const Config = struct {
    /// Calls in flight or waiting (`--sql-max-requests`).
    max_reqs: u32 = 64,
    /// Open connections of the shard (`--sql-max-conns`).
    max_conns: u32 = 16,
    /// Connections of one credential and host (`--sql-pool-conns`).
    pool_conns: u32 = 4,
    /// Different credentials and hosts in use at once.
    max_pools: u32 = 16,
    /// The JSON of one result (`--sql-max-result-kb`).
    max_result: u32 = 4 << 20,
    /// The arguments of one call (`--sql-max-request-kb`).
    max_request: u32 = 1 << 20,
    max_statements: u32 = 256,
    /// An idle connection closes after this time (the pool of `mssql`: 30 s).
    idle_ms: u32 = 30_000,
    /// Total time of a call.
    total_ms: u32 = 300_000,
    /// Time for the server to confirm an ATTENTION (`cancelTimeout` of tedious).
    cancel_ms: u32 = 5000,
    insecure_tls: bool = false,
    ca_file: ?[:0]const u8 = null,
    dns_servers: ?[:0]const u8 = null,
    credentials: ?*const creds.Store = null,
};

const Counters = struct {
    started: u64 = 0,
    connects: u64 = 0,
    reused: u64 = 0,
    waited: u64 = 0,
    refused: u64 = 0,
    to_host: u64 = 0,
    timeouts: u64 = 0,
};

/// Why a call ends without a result.
const Abort = enum(u8) { none, max_result, no_form };

const ReqState = enum(u8) { free, queued, resolving, connecting, running, done };

/// The connection values of one call. The password is in `buf` until the
/// call ends.
const Cred = struct {
    buf: [cred_bytes]u8 = @splat(0),
    host_len: u16 = 0,
    user_len: u16 = 0,
    db_len: u16 = 0,
    pass_len: u16 = 0,
    port: u16 = 1433,
    /// `encrypt` of tedious (`tls` of the credential).
    tls: bool = true,
    /// `trustServerCertificate` (`allowUnauthorizedCerts` of the credential).
    trust: bool = false,
    version: tds.Version = .v7_4,
    /// `connectTimeout` and `requestTimeout` of the credential.
    connect_ms: u32 = 15_000,
    request_ms: u32 = 15_000,

    fn host(k: *const Cred) []const u8 {
        return k.buf[0..k.host_len];
    }

    fn user(k: *const Cred) []const u8 {
        return k.buf[k.host_len..][0..k.user_len];
    }

    fn database(k: *const Cred) []const u8 {
        return k.buf[k.host_len + k.user_len ..][0..k.db_len];
    }

    fn password(k: *const Cred) []const u8 {
        return k.buf[k.host_len + k.user_len + k.db_len ..][0..k.pass_len];
    }

    /// The password leaves the memory.
    fn wipe(k: *Cred) void {
        @memset(&k.buf, 0);
        k.pass_len = 0;
    }
};

const Req = struct {
    state: ReqState = .free,
    exec_id: u64 = 0,
    seq: u32 = 0,
    pool: u32 = none,
    conn: u32 = none,
    /// The copy of the arguments; `call` points into it.
    args: []u8 = &.{},
    call: ms_call.Call = .{},
    /// The result JSON, or the text of the error.
    out: []u8 = &.{},
    out_len: usize = 0,
    results: u32 = 0,
    ok: bool = false,
    /// A statement that writes was sent: the host cannot run the call
    /// again, so a limit gives no marker.
    committed: bool = false,
    cred: Cred = .{},
    deadline_ms: i64 = 0,
    connect_deadline_ms: i64 = 0,
    order: u64 = 0,
    dns_id: u16 = 0,
};

const Pool = net_pool.Pool;

const ConnState = enum(u8) { free, connecting, prelogin, tls, login, setup, busy, idle };
/// The answer that a busy connection waits for.
const Phase = enum(u8) { none, reset, run, cancel };

const Conn = struct {
    state: ConnState = .free,
    fd: c_int = -1,
    gen: u32 = 0,
    pool: u32 = none,
    req: u32 = none,
    session: ?tls.Session = null,
    /// The TLS records of the session, in and out.
    bio: tls.BioBuf = .{},
    /// The TLS handshake is complete.
    secure: bool = false,
    /// The whole stream is TLS: the records go on the socket as they are.
    raw: bool = false,
    write_armed: bool = false,
    /// `[0..mlen)`: the message that arrives, without packet headers.
    /// `[pstart..rlen)`: packets that are not read yet.
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    mlen: usize = 0,
    pstart: usize = 0,
    /// The message is larger than the buffer: its bytes are dropped.
    over: bool = false,
    wbuf: []u8 = &.{},
    wlen: usize = 0,
    wsent: usize = 0,
    cols: []tds.Column = &.{},
    addrs: dns.Addrs = .{ .list = @splat(.{}) },
    addr_i: u8 = 0,
    idle_at_ms: i64 = 0,
    /// A call ran on the session: the next call resets it first.
    used: bool = false,
    /// The packet size of the server.
    packet: u32 = tds.packet_size,
    collation: [tds.collation_bytes]u8 = @splat(0),
    phase: Phase = .none,
    it: ?ms_call.Statements = null,
    cur: u32 = 0,
    /// The statement that runs now only reads.
    reads: bool = false,
    abort: Abort = .none,
    /// The time limit of the statement that runs now, or 0.
    statement_deadline_ms: i64 = 0,
    cancel_deadline_ms: i64 = 0,
};

const marker_result = " (limit: sql-max-result)";
const marker_form = " (limit: sql-type)";
const closed_msg = "sql: the connection to the database closed";
const invalid_msg = "sql: the database sent a packet that is not valid";

pub const Done = sql_net.Done;

const BuildError = error{ NoSpace, BadParam, TooMany, BadString, Malformed, Unsupported };

pub const Client = struct {
    cfg: Config,
    poller: *sys.Poller,
    kind_conn: u8,
    tls_ctx: tls.Context,
    /// For a credential with `trustServerCertificate`.
    tls_trusting: tls.Context,
    resolver: *dns.Resolver,
    reqs: []Req,
    rfree: net_pool.FreeStack(u32),
    nrfree: u32 = 0,
    conns: []Conn,
    cfree: net_pool.FreeStack(u32),
    ncfree: u32 = 0,
    pools: []Pool,
    /// Finished calls, oldest first: a ring of request indexes.
    done_ring: net_pool.DoneRing(u32),
    /// O(1) timer wheel: one link per req, one per conn.
    wheel_links: []net_pool.Link,
    wheel: net_pool.TimerWheel,
    /// The text and the string values of the statement that is built now.
    tmp: []u8,
    /// The payload of the message that is built now.
    build: []u8,
    params: []tds.Param,
    /// The name of this machine, for LOGIN7.
    host_buf: [256]u8 = @splat(0),
    host_len: usize = 0,
    order: u64 = 0,
    queued: u32 = 0,
    /// A connection or a slot became free: waiting calls can go.
    pump_pending: bool = false,
    /// Connections whose TLS session holds bytes that no event will show.
    more_pending: bool = false,
    now_ms: i64 = 0,
    last_scan_ms: i64 = 0,
    counters: Counters = .{},

    /// Reserve every buffer. `c` must not move afterwards.
    pub fn init(c: *Client, gpa: std.mem.Allocator, cfg: Config, poller: *sys.Poller, kind_conn: u8, kind_dns: u8) !void {
        std.debug.assert(cfg.max_reqs > 0 and cfg.max_conns > 0 and cfg.max_pools > 0 and cfg.pool_conns > 0);
        const reserve = core_lib.arena.reserve;
        // A text in UTF-16 has two bytes for each byte of ASCII.
        const build_bytes = @as(usize, cfg.max_request) * 2 + (256 << 10);
        c.* = .{
            .cfg = cfg,
            .poller = poller,
            .kind_conn = kind_conn,
            .tls_ctx = try tls.Context.client(cfg.insecure_tls, cfg.ca_file),
            .tls_trusting = try tls.Context.client(true, null),
            .resolver = try gpa.create(dns.Resolver),
            .reqs = try gpa.alloc(Req, cfg.max_reqs),
            .rfree = .{ .items = try gpa.alloc(u32, cfg.max_reqs) },
            .nrfree = cfg.max_reqs,
            .conns = try gpa.alloc(Conn, cfg.max_conns),
            .cfree = .{ .items = try gpa.alloc(u32, cfg.max_conns) },
            .ncfree = cfg.max_conns,
            .pools = try gpa.alloc(Pool, cfg.max_pools),
            .done_ring = .{ .items = try gpa.alloc(u32, cfg.max_reqs) },
            .wheel_links = try gpa.alloc(net_pool.Link, cfg.max_reqs + cfg.max_conns),
            .wheel = .{},
            .tmp = try reserve(gpa, u8, cfg.max_request),
            .build = try reserve(gpa, u8, build_bytes),
            .params = try gpa.alloc(tds.Param, ms_call.max_params),
        };
        c.host_len = sys.hostName(&c.host_buf).len;
        try c.resolver.init(poller, kind_dns, cfg.dns_servers);
        // Discard: loop index not needed here.
        for (c.reqs, 0..) |*r, i| {
            _ = i;
            r.* = .{
                .args = try reserve(gpa, u8, cfg.max_request),
                .out = try reserve(gpa, u8, @as(usize, cfg.max_result) + 256),
            };
        }
        c.rfree.initAll();
        c.nrfree = c.rfree.len;
        // Discard: loop index not needed here.
        for (c.conns, 0..) |*cn, i| {
            _ = i;
            cn.* = .{
                .rbuf = try reserve(gpa, u8, @as(usize, cfg.max_result) + (128 << 10)),
                // The packet headers add 8 bytes for each 504 bytes at least.
                .wbuf = try reserve(gpa, u8, build_bytes + build_bytes / 32 + 8192),
                .cols = try gpa.alloc(tds.Column, max_columns),
                .bio = .{ .in = try gpa.alloc(u8, cipher_bytes), .out = try gpa.alloc(u8, cipher_bytes) },
            };
        }
        c.cfree.initAll();
        c.ncfree = c.cfree.len;
        for (c.pools) |*p| p.* = .{};
        c.wheel.init(c.wheel_links);
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
        c.tls_trusting.deinit();
    }

    // ---- entry points ---------------------------------------------------------

    /// Start the call of one `sql` effect. `args` is copied. The answer is
    /// null, or the text of an error when no call slot is free: every
    /// other outcome comes through `nextDone`.
    pub fn start(c: *Client, exec_id: u64, seq: u32, args: []const u8, store: ?*const creds.Store, now_ms: i64) ?[]const u8 {
        c.now_ms = now_ms;
        c.counters.started += 1;
        const ri = c.rfree.pop() orelse {
            c.counters.refused += 1;
            return "sql: too many calls in flight (--sql-max-requests); the step can run again (limit)";
        };
        c.nrfree = c.rfree.len;
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .free);
        r.state = .queued;
        r.exec_id = exec_id;
        r.seq = seq;
        r.pool = none;
        r.conn = none;
        r.out_len = 0;
        r.results = 0;
        r.ok = false;
        r.committed = false;
        if (c.prepareReq(ri, args, store)) |msg| {
            c.failReq(ri, "{s}", .{msg});
            return null;
        }
        c.admit(ri);
        return null;
    }

    /// Check the call and read its credential. The answer is the text of
    /// an error, or null. Nothing is sent before every check passed.
    fn prepareReq(c: *Client, ri: u32, args: []const u8, store: ?*const creds.Store) ?[]const u8 {
        const r = &c.reqs[ri];
        if (args.len > r.args.len) return "sql: the call is larger than --sql-max-request-kb" ++ ms_call.statement_marker;
        @memcpy(r.args[0..args.len], args);
        if (ms_call.parseCall(r.args[0..args.len], c.cfg.max_statements, &r.call, c.tmp)) |msg| return msg;
        if (c.checkRequests(r)) |msg| return msg;
        const st = store orelse c.cfg.credentials orelse return "sql: the runtime has no credentials";
        if (loadCredential(r, st)) |msg| return msg;
        r.deadline_ms = c.now_ms + c.cfg.total_ms;
        r.connect_deadline_ms = c.now_ms + r.cred.connect_ms;
        r.pool = c.poolFor(poolKey(&r.cred)) orelse return "sql: more database credentials are in use than the runtime has pools; the step can run again (limit)";
        c.pools[r.pool].refs += 1;
        c.wheel.schedule(ri, @min(r.deadline_ms, r.connect_deadline_ms), c.now_ms);
        return null;
    }

    /// Build the request of each statement once, without a connection: a
    /// value that `mssql` refuses or changes shows here, before a
    /// statement is sent.
    fn checkRequests(c: *Client, r: *const Req) ?[]const u8 {
        var it = ms_call.Statements.init(r.call.statements) orelse return "sql: statements must be an array";
        for (0..r.call.count) |_| {
            const st = it.next() orelse break;
            // Only the check counts here: the request is built again when it is sent.
            _ = c.buildRequest(st, @splat(0)) catch |e| return switch (e) {
                error.BadParam => "sql: a bind value for mssql has a name, and a value that is a string, a number, a boolean or null",
                error.BadString => "sql: the text of a statement is not a valid string",
                error.TooMany => "sql: a statement has more than 2100 bind values" ++ ms_call.statement_marker,
                error.NoSpace => "sql: a statement is larger than --sql-max-request-kb" ++ ms_call.statement_marker,
                error.Malformed => "sql: a statement has a text or a name that the native client cannot send" ++ ms_call.statement_marker,
                error.Unsupported => "sql: a bind value has no exact native form" ++ ms_call.statement_marker,
            };
        }
        return null;
    }

    /// The payload of `sp_executesql` for one statement, in `c.build`.
    fn buildRequest(c: *Client, st: ms_call.Statement, collation: [tds.collation_bytes]u8) BuildError![]const u8 {
        var text: creds.Out = .{ .buf = c.tmp };
        try http.unescape(st.text, &text);
        var values: creds.Out = .{ .buf = c.tmp[text.len..] };
        const params = try ms_call.readParams(st.params, &values, c.params);
        var o: tds.Out = .{ .buf = c.build };
        try tds.executeSql(&o, text.written(), params, collation);
        std.debug.assert(o.len > 0);
        return c.build[0..o.len];
    }

    /// A readiness event of a connection.
    pub fn onConn(c: *Client, idx: u32, gen: u32, ev: sys.Ready, now_ms: i64) void {
        c.now_ms = now_ms;
        if (idx >= c.conns.len) return;
        const cn = &c.conns[idx];
        if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
        // kqueue write interest is one-shot; epoll keeps it until cleared.
        if (ev.writable and !sys.is_linux) cn.write_armed = false;
        if (cn.state == .free) return;
        if (cn.state == .connecting) {
            if (ev.writable or ev.eof) c.onConnected(idx);
            return;
        }
        if (ev.writable and (cn.wsent < cn.wlen or cn.bio.out_len > 0)) c.sendPending(idx);
        if (c.gone(idx, gen)) return;
        if (cn.state == .tls and ev.writable) c.doHandshake(idx);
        if (c.gone(idx, gen)) return;
        if (ev.readable or ev.eof) c.readMore(idx);
    }

    /// True when the connection of the event closed.
    fn gone(c: *const Client, ci: u32, gen: u32) bool {
        const cn = &c.conns[ci];
        return cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen;
    }

    pub fn onDns(c: *Client, fd: c_int, ev: sys.Ready) void {
        c.resolver.onReady(fd, ev);
    }

    /// Work after a round of events: finished name lookups, waiting calls
    /// that can go, time limits. Call once per loop iteration.
    pub fn afterEvents(c: *Client, now_ms: i64) void {
        c.now_ms = now_ms;
        c.resolver.tick(now_ms);
        // Each lookup that ends frees its query: the query table bounds the loop.
        for (0..dns.max_queries + 1) |_| {
            const d = c.resolver.takeDone() orelse break;
            c.onResolved(d);
        }
        if (c.more_pending) c.readPending();
        if (c.pump_pending) {
            c.pump_pending = false;
            c.advanceQueue();
        }
        if (now_ms - c.last_scan_ms >= 100) {
            c.last_scan_ms = now_ms;
            c.scanTimeouts();
        }
    }

    /// True when `afterEvents` or `nextDone` has work now and the loop
    /// must not sleep.
    pub fn hasWork(c: *const Client) bool {
        return c.pump_pending or c.more_pending or c.done_ring.len > 0 or c.resolver.hasDone();
    }

    /// The oldest finished call, or null. Give it back with `release`.
    pub fn nextDone(c: *const Client) ?Done {
        const ri = c.done_ring.peek() orelse return null;
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .done);
        return .{ .req = ri, .exec_id = r.exec_id, .seq = r.seq, .ok = r.ok, .payload = r.out[0..r.out_len] };
    }

    /// Free the call that `nextDone` gave.
    pub fn release(c: *Client, ri: u32) void {
        std.debug.assert(c.done_ring.peek().? == ri);
        const r = &c.reqs[ri];
        // Discard: the popped value is the same ri we are releasing.
        _ = c.done_ring.pop();
        // The pages of a large result go back to the system.
        if (r.out_len > 64 << 10) sys.releasePages(r.out[0..r.out_len]);
        r.state = .free;
        c.rfree.push(ri);
        c.nrfree = c.rfree.len;
    }

    // ---- calls: the end --------------------------------------------------------

    /// End a call with an error text. The call holds no connection.
    fn failReq(c: *Client, ri: u32, comptime fmt: []const u8, args: anytype) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state != .free and r.state != .done and r.conn == none);
        // A text that does not fit the result buffer: a short one takes its place.
        const text = std.fmt.bufPrint(r.out, fmt, args) catch "sql: error";
        if (text.ptr != r.out.ptr) @memcpy(r.out[0..text.len], text);
        r.out_len = text.len;
        r.ok = false;
        c.finishReq(ri);
    }

    /// End a call whose connection failed before the login ended: the
    /// result has `connect`, with the message and the code of tedious.
    fn connectFail(c: *Client, ri: u32, message: []const u8, code: []const u8) void {
        const r = &c.reqs[ri];
        var o: tds.Out = .{ .buf = r.out };
        writeConnect(&o, message, code) catch {
            o.len = 0;
        };
        r.out_len = o.len;
        r.ok = o.len > 0;
        c.finishReq(ri);
    }

    fn writeConnect(o: *tds.Out, message: []const u8, code: []const u8) error{NoSpace}!void {
        try o.put("{\"results\":[],\"connect\":{\"message\":");
        try o.string(message);
        try o.put(",\"code\":");
        try o.string(code);
        try o.put("}}");
    }

    fn finishReq(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state != .free and r.state != .done and c.done_ring.len < c.done_ring.items.len);
        if (r.state == .queued and r.order != 0) c.queued -= 1;
        if (r.pool != none) c.pools[r.pool].refs -= 1;
        c.wheel.cancel(ri);
        r.cred.wipe();
        r.order = 0;
        r.state = .done;
        c.done_ring.push(ri);
        c.pump_pending = true;
    }

    /// The call of `ci` ends. The connection stays open for the next call.
    fn releaseConn(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .busy and cn.req != none);
        if (cn.wlen != 0) return c.closeConn(ci);
        c.reqs[cn.req].conn = none;
        cn.req = none;
        cn.state = .idle;
        cn.phase = .none;
        cn.idle_at_ms = c.now_ms;
        cn.it = null;
        c.scheduleConnIdle(ci);
    }

    /// Close a connection and end its call: with an error text, or, when
    /// the login did not end yet, with the connect error of tedious.
    fn dropConn(c: *Client, ci: u32, comptime text: []const u8) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        const early = cn.state == .connecting or cn.state == .tls;
        var buf: [400]u8 = @splat(0);
        var message: []const u8 = "Connection lost - socket hang up";
        // A server name fits the buffer.
        if (early and ri != none) message = c.connectText(&buf, ri, " - socket hang up");
        c.closeConn(ci);
        if (ri == none) return;
        if (c.reqs[ri].state != .running) return c.connectFail(ri, message, "ESOCKET");
        c.failReq(ri, text, .{});
    }

    /// "Failed to connect to server:port" of tedious, with `tail`.
    fn connectText(c: *const Client, buf: []u8, ri: u32, tail: []const u8) []const u8 {
        const k = &c.reqs[ri].cred;
        // A text that does not fit the buffer: a short one takes its place.
        return std.fmt.bufPrint(buf, "Failed to connect to {s}:{d}{s}", .{ k.host(), k.port, tail }) catch "Failed to connect";
    }

    /// Close a connection whose login failed, and end its call with the
    /// connect error.
    fn connectEnd(c: *Client, ci: u32, message: []const u8, code: []const u8) void {
        const ri = c.conns[ci].req;
        c.closeConn(ci);
        if (ri != none) c.connectFail(ri, message, code);
    }

    /// Close a connection that cannot log in as the v1 node does, and end
    /// its call with the marker: the workflow stays in the fallback host.
    fn credentialEnd(c: *Client, ci: u32, comptime text: []const u8) void {
        const ri = c.conns[ci].req;
        c.closeConn(ci);
        if (ri != none) c.failReq(ri, text ++ " (limit: sql-credential)", .{});
    }

    fn closeConn(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state != .free);
        if (cn.session) |s| s.deinit();
        if (cn.fd >= 0) {
            c.poller.remove(cn.fd);
            sys.close(cn.fd);
        }
        if (cn.req != none) c.reqs[cn.req].conn = none;
        if (cn.pool != none) c.pools[cn.pool].conns -= 1;
        const nri = cn.req;
        if (cn.rlen > 64 << 10) sys.releasePages(cn.rbuf[0..cn.rlen]);
        // The bytes of a login do not stay in the buffer.
        @memset(cn.wbuf[0..@min(cn.wlen, 4096)], 0);
        const keep: Conn = .{
            .gen = cn.gen +% 1,
            .rbuf = cn.rbuf,
            .wbuf = cn.wbuf,
            .cols = cn.cols,
            .bio = .{ .in = cn.bio.in, .out = cn.bio.out },
        };
        cn.* = keep;
        if (nri != none) c.wheel.cancel(nri);
        c.wheel.cancel(@as(u32, @intCast(c.reqs.len)) + ci);
        c.cfree.push(ci);
        c.ncfree = c.cfree.len;
        c.pump_pending = true;
    }

    // ---- pools and the queue ---------------------------------------------------

    /// The pool with this key, or a pool that nothing uses.
    fn poolFor(c: *Client, key: [32]u8) ?u32 {
        return net_pool.poolFor(c.pools, key, c.now_ms);
    }

    fn idleConn(c: *const Client, pool: u32) ?u32 {
        for (c.conns, 0..) |*cn, i| {
            if (cn.state == .idle and cn.pool == pool) return std.math.cast(u32, i);
        }
        return null;
    }

    /// The connection that is idle for the longest time, in any pool.
    fn oldestIdle(c: *const Client) ?u32 {
        var best: ?u32 = null;
        for (c.conns, 0..) |*cn, i| {
            if (cn.state != .idle) continue;
            if (best == null or cn.idle_at_ms < c.conns[best.?].idle_at_ms) best = std.math.cast(u32, i);
        }
        return best;
    }

    /// True when a call of `ri`'s pool can go now.
    fn canRun(c: *const Client, ri: u32) bool {
        const r = &c.reqs[ri];
        if (c.idleConn(r.pool) != null) return true;
        return c.pools[r.pool].conns < c.cfg.pool_conns and (c.cfree.len > 0 or c.oldestIdle() != null);
    }

    /// Give the call a connection, or let it wait in order.
    fn admit(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .queued and r.order == 0);
        // A call that came first goes first.
        if (c.queued == 0 and c.canRun(ri)) return c.run(ri);
        c.order += 1;
        r.order = c.order;
        c.queued += 1;
        c.counters.waited += 1;
    }

    fn run(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .queued and r.order == 0);
        if (c.idleConn(r.pool)) |ci| {
            c.counters.reused += 1;
            const cn = &c.conns[ci];
            cn.req = ri;
            cn.state = .busy;
            r.conn = ci;
            r.state = .running;
            // Cancel: this conn is no longer idle.
            c.wheel.cancel(@as(u32, @intCast(c.reqs.len)) + ci);
            c.wheel.schedule(ri, r.deadline_ms, c.now_ms);
            return c.beginCall(ci);
        }
        if (c.cfree.len == 0) c.closeConn(c.oldestIdle() orelse return c.failReq(ri, "sql: no connection is free (limit)", .{}));
        c.open(ri);
    }

    /// Start waiting calls, oldest first, while one can go.
    fn advanceQueue(c: *Client) void {
        // Each pass starts one call: the calls bound the loop.
        for (0..c.reqs.len) |_| {
            if (c.queued == 0) return;
            var best: ?u32 = null;
            for (c.reqs, 0..) |*r, i| {
                const idx = std.math.cast(u32, i).?;
                if (r.state != .queued or r.order == 0 or !c.canRun(idx)) continue;
                if (best == null or r.order < c.reqs[best.?].order) best = idx;
            }
            const ri = best orelse return;
            c.reqs[ri].order = 0;
            c.queued -= 1;
            c.run(ri);
        }
    }

    // ---- connect, PRELOGIN, TLS, LOGIN7 ----------------------------------------

    fn token(c: *const Client, ci: u32) u64 {
        return sys.makeToken(c.kind_conn, c.conns[ci].gen, ci);
    }

    fn armWrite(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.write_armed) return;
        // Without the interest the write would wait for ever: the call's time limit ends it.
        c.poller.wantWrite(cn.fd, c.token(ci)) catch return;
        cn.write_armed = true;
    }

    fn disarmWrite(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (!sys.is_linux or !cn.write_armed) return;
        c.poller.doneWrite(cn.fd, c.token(ci));
        cn.write_armed = false;
    }

    /// Take a connection slot for the call and find the address of the host.
    fn open(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(c.cfree.len > 0 and r.conn == none);
        const ci = c.cfree.pop().?;
        c.ncfree = c.cfree.len;
        c.wheel.schedule(ri, @min(r.deadline_ms, r.connect_deadline_ms), c.now_ms);
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .free);
        cn.state = .connecting;
        cn.pool = r.pool;
        cn.req = ri;
        c.pools[r.pool].conns += 1;
        r.conn = ci;
        r.state = .connecting;
        if (sys.numericAddr(r.cred.host(), r.cred.port)) |a| {
            cn.addrs.n = 1;
            cn.addrs.list[0] = a;
            return c.connectNext(ci);
        }
        switch (c.resolver.lookup(r.cred.host(), c.now_ms)) {
            .hit => |a| c.onAddrs(ci, a),
            .pending => |id| {
                r.state = .resolving;
                r.dns_id = id;
            },
            .err => c.hostNotFound(ci),
        }
    }

    fn onAddrs(c: *Client, ci: u32, addrs: dns.Addrs) void {
        const cn = &c.conns[ci];
        cn.addrs = addrs;
        for (cn.addrs.list[0..cn.addrs.n]) |*a| a.port = c.reqs[cn.req].cred.port;
        cn.addr_i = 0;
        c.connectNext(ci);
    }

    fn onResolved(c: *Client, d: dns.Resolver.Done) void {
        for (c.reqs) |*r| {
            if (r.state != .resolving or r.dns_id != d.id) continue;
            r.state = .connecting;
            switch (d.result) {
                .hit => |a| c.onAddrs(r.conn, a),
                .pending, .err => c.hostNotFound(r.conn),
            }
        }
    }

    fn hostNotFound(c: *Client, ci: u32) void {
        const ri = c.conns[ci].req;
        var tail_buf: [300]u8 = @splat(0);
        var buf: [700]u8 = @splat(0);
        // A host name fits the buffers.
        const tail = std.fmt.bufPrint(&tail_buf, " - getaddrinfo ENOTFOUND {s}", .{c.reqs[ri].cred.host()}) catch " - getaddrinfo ENOTFOUND";
        c.connectEnd(ci, c.connectText(&buf, ri, tail), "ESOCKET");
    }

    /// Connect to the next address of the host, or end the call when none is left.
    fn connectNext(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .connecting and cn.fd < 0);
        // Each pass takes one address.
        for (0..dns.max_addrs) |_| {
            if (cn.addr_i >= cn.addrs.n) break;
            const addr = cn.addrs.list[cn.addr_i];
            cn.addr_i += 1;
            // This address has no route: the next one is tried.
            const fd = sys.connectAddr(addr) catch continue;
            cn.fd = fd;
            c.poller.addRead(fd, c.token(ci)) catch return c.connectError(ci);
            return c.armWrite(ci);
        }
        c.connectError(ci);
    }

    /// No address of the host took the connection: the error of tedious
    /// after it tried each address in sequence.
    fn connectError(c: *Client, ci: u32) void {
        var buf: [400]u8 = @splat(0);
        c.connectEnd(ci, c.connectText(&buf, c.conns[ci].req, " - Could not connect (sequence)"), "ESOCKET");
    }

    /// The TCP connection is open: the client sends PRELOGIN.
    fn onConnected(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const err = sys.socketError(cn.fd);
        if (err != 0) {
            if (cn.addr_i >= cn.addrs.n) return c.connectError(ci);
            c.poller.remove(cn.fd);
            sys.close(cn.fd);
            cn.fd = -1;
            cn.write_armed = false;
            return c.connectNext(ci);
        }
        c.disarmWrite(ci);
        var trace: [tds.trace_bytes]u8 = @splat(0);
        sys.randomBytes(&trace);
        var o: tds.Out = .{ .buf = c.build };
        // The message fits the buffer.
        tds.prelogin(&o, c.reqs[cn.req].cred.tls, &trace) catch return c.dropConn(ci, closed_msg);
        cn.state = .prelogin;
        c.sendMessage(ci, tds.kind.prelogin, c.build[0..o.len], 0);
    }

    /// The PRELOGIN answer of the server says whether the session is encrypted.
    fn onPrelogin(c: *Client, ci: u32, msg: []const u8) void {
        const cn = &c.conns[ci];
        const k = &c.reqs[cn.req].cred;
        const mode = tds.preloginEncryption(msg) catch return c.dropConn(ci, invalid_msg);
        const wanted = mode == tds.encryption.on or mode == tds.encryption.required;
        if (!wanted) return c.sendLogin(ci);
        if (!k.tls) return c.connectEnd(ci, "Server requires encryption, set 'encrypt' config option to true.", "EENCRYPT");
        const host = k.host();
        const is_ip = sys.numericAddr(host, 0) != null and !std.mem.eql(u8, host, "localhost");
        const ctx = if (k.trust) c.tls_trusting else c.tls_ctx;
        cn.session = tls.Session.connectBioPlain(ctx, &cn.bio, host, is_ip) catch return c.tlsFailed(ci);
        cn.state = .tls;
        c.doHandshake(ci);
    }

    /// Advance the TLS handshake. Until it is complete, the records of the
    /// client go to the server as PRELOGIN messages.
    fn doHandshake(c: *Client, ci: u32) void {
        const gen = c.conns[ci].gen;
        // A pass that fills the record buffer needs one more pass.
        for (0..4) |_| {
            const cn = &c.conns[ci];
            const s = cn.session orelse return c.tlsFailed(ci);
            var full = false;
            if (!cn.secure) switch (s.handshake()) {
                .n => cn.secure = true,
                .want_read => {},
                .want_write => full = true,
                .closed, .failed => return c.tlsFailed(ci),
            };
            // The earlier records are not on the socket yet: a write event comes.
            if (cn.wlen != 0) return;
            if (cn.bio.out_len > 0) {
                const records = cn.bio.outPending();
                c.sendMessage(ci, tds.kind.prelogin, records, 0);
                if (c.conns[ci].gen != gen) return;
                cn.bio.outSent(records.len);
                if (cn.wlen != 0) return;
            }
            if (cn.secure) {
                // The server sends nothing more before the login.
                if (cn.pstart != cn.rlen) return c.tlsFailed(ci);
                cn.raw = true;
                return c.sendLogin(ci);
            }
            if (!full) return;
        }
    }

    /// The text of a TLS failure is the one of OpenSSL, not of Node.js:
    /// the fallback host gives the error of the v1 node.
    fn tlsFailed(c: *Client, ci: u32) void {
        c.credentialEnd(ci, "sql: the TLS handshake with the database failed");
    }

    fn sendLogin(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const k = &c.reqs[cn.req].cred;
        var o: tds.Out = .{ .buf = c.build };
        const login: tds.Login = .{
            .version = k.version,
            .pid = sys.processId(),
            .zone = 0,
            .host = c.host_buf[0..c.host_len],
            .user = k.user(),
            .password = k.password(),
            .server = k.host(),
            .database = k.database(),
        };
        tds.login7(&o, login) catch return c.credentialEnd(ci, "sql: a value of the credential has a byte that the protocol cannot carry");
        cn.state = .login;
        c.sendMessage(ci, tds.kind.login7, c.build[0..o.len], 0);
        @memset(c.build[0..o.len], 0);
    }

    /// The reply to LOGIN7.
    fn onLoginReply(c: *Client, ci: u32, msg: []const u8) void {
        const cn = &c.conns[ci];
        const reply = tds.loginReply(msg) catch |e| return switch (e) {
            error.Unsupported => c.credentialEnd(ci, "sql: the login reply of the server has no native form"),
            error.Malformed, error.NoSpace => c.dropConn(ci, invalid_msg),
        };
        if (reply.routed) return c.credentialEnd(ci, "sql: the server sends the client to another server");
        if (!reply.ok and reply.err.len == 0) return c.dropConn(ci, invalid_msg);
        if (!reply.ok) return c.loginRefused(ci, reply.err);
        cn.collation = reply.collation;
        if (reply.packet_size != 0) {
            if (reply.packet_size < 512 or reply.packet_size > 32767) return c.dropConn(ci, invalid_msg);
            cn.packet = reply.packet_size;
        }
        cn.state = .setup;
        c.sendSetup(ci, false);
    }

    /// The server refused the login: the result has its message.
    fn loginRefused(c: *Client, ci: u32, err: []const u8) void {
        const ri = c.conns[ci].req;
        const r = &c.reqs[ri];
        var o: tds.Out = .{ .buf = r.out };
        writeRefusal(&o, err) catch {
            o.len = 0;
        };
        c.closeConn(ci);
        if (o.len == 0) return c.failReq(ri, "{s}", .{invalid_msg});
        r.out_len = o.len;
        r.ok = true;
        c.finishReq(ri);
    }

    fn writeRefusal(o: *tds.Out, err: []const u8) tds.Error!void {
        try o.put("{\"results\":[],\"connect\":{\"message\":");
        try tds.writeErrorMessage(o, err);
        try o.put(",\"code\":\"ELOGIN\"}}");
    }

    /// Send the `set` statements of tedious. With `reset`, the server
    /// first makes the session new: no variable, temporary table or open
    /// transaction of an earlier call stays.
    fn sendSetup(c: *Client, ci: u32, reset: bool) void {
        var o: tds.Out = .{ .buf = c.build };
        // The text fits the buffer.
        tds.sqlBatch(&o, tds.initial_sql) catch return c.dropConn(ci, closed_msg);
        c.sendMessage(ci, tds.kind.sql_batch, c.build[0..o.len], if (reset) status_reset else 0);
    }

    /// The reply to the `set` statements.
    fn onSetupReply(c: *Client, ci: u32, msg: []const u8) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        const reply = tds.loginReply(msg) catch return c.dropConn(ci, invalid_msg);
        if (reply.err.len > 0 and cn.state == .setup) return c.dropConn(ci, invalid_msg);
        if (reply.err.len > 0) {
            // The server did not make the session new: the call takes a new connection.
            c.closeConn(ci);
            c.reqs[ri].state = .queued;
            return c.run(ri);
        }
        if (!std.mem.allEqual(u8, &reply.collation, 0)) cn.collation = reply.collation;
        if (cn.state == .busy) return c.startCall(ci);
        c.counters.connects += 1;
        cn.state = .busy;
        c.reqs[ri].state = .running;
        c.wheel.schedule(ri, c.reqs[ri].deadline_ms, c.now_ms);
        c.beginCall(ci);
    }

    // ---- bytes in and out ------------------------------------------------------

    /// Put one message in the write buffer, in packets, and send it.
    /// `status` is added to the status byte of the first packet.
    fn sendMessage(c: *Client, ci: u32, message_kind: u8, payload: []const u8, status: u8) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.wlen == 0 and cn.wsent == 0);
        var o: tds.Out = .{ .buf = cn.wbuf };
        // The write buffer has room for the largest payload with its headers.
        tds.frame(&o, message_kind, payload, cn.packet) catch return c.dropConn(ci, closed_msg);
        cn.wbuf[1] |= status;
        cn.wlen = o.len;
        c.sendPending(ci);
    }

    /// Send the TLS records that wait. True when none is left.
    fn flushCipher(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        // Each pass sends bytes or ends.
        for (0..cipher_bytes + 1) |_| {
            const records = cn.bio.outPending();
            if (records.len == 0) return true;
            switch (sql_net.ioWrite(null, cn.fd, records)) {
                .n => |n| cn.bio.outSent(n),
                .again, .want_write => {
                    c.armWrite(ci);
                    return false;
                },
                .closed => {
                    c.dropConn(ci, closed_msg);
                    return false;
                },
            }
        }
        return cn.bio.out_len == 0;
    }

    /// One step of the write buffer through TLS. False when the write
    /// must wait or the connection closed.
    fn writeSecure(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        if (!c.flushCipher(ci)) return false;
        if (cn.wsent >= cn.wlen) return true;
        const s = cn.session orelse {
            c.dropConn(ci, closed_msg);
            return false;
        };
        switch (s.write(cn.wbuf[cn.wsent..cn.wlen])) {
            .n => |n| cn.wsent += n,
            // The record buffer is full: the next step empties it.
            .want_write => {},
            .want_read => return false,
            .closed, .failed => {
                c.dropConn(ci, closed_msg);
                return false;
            },
        }
        return true;
    }

    fn sendPending(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const gen = cn.gen;
        // Each pass writes bytes or ends: the buffer bounds the loop.
        for (0..cn.wbuf.len + 2) |_| {
            if (cn.raw) {
                if (!c.writeSecure(ci)) return;
                if (cn.wsent >= cn.wlen and cn.bio.out_len == 0) break;
                continue;
            }
            if (cn.wsent >= cn.wlen) break;
            switch (sql_net.ioWrite(null, cn.fd, cn.wbuf[cn.wsent..cn.wlen])) {
                .n => |n| cn.wsent += n,
                .again, .want_write => return c.armWrite(ci),
                .closed => return c.dropConn(ci, closed_msg),
            }
        }
        if (cn.gen != gen or cn.wsent < cn.wlen) return;
        // The bytes of a login do not stay in the buffer.
        if (cn.state == .login) @memset(cn.wbuf[0..cn.wlen], 0);
        if (cn.wlen > 64 << 10) sys.releasePages(cn.wbuf[0..cn.wlen]);
        cn.wlen = 0;
        cn.wsent = 0;
        c.disarmWrite(ci);
    }

    fn readMore(c: *Client, ci: u32) void {
        const gen = c.conns[ci].gen;
        for (0..read_passes) |_| {
            const cn = &c.conns[ci];
            if (cn.gen != gen or cn.state == .free or cn.state == .connecting) return;
            if (!c.makeRoom(ci)) return;
            const more = if (cn.raw) c.readSecure(ci) else c.readPlain(ci);
            if (!more) return;
        }
        // The TLS session can hold more: `afterEvents` reads again.
        c.more_pending = true;
    }

    fn readPending(c: *Client) void {
        c.more_pending = false;
        for (c.conns, 0..) |*cn, i| {
            const s = cn.session orelse continue;
            if (cn.raw and s.hasPending()) c.readMore(std.math.cast(u32, i).?);
        }
    }

    /// Room for one read, after the message and the packets that wait.
    /// False when the connection closed.
    fn makeRoom(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        std.debug.assert(cn.mlen <= cn.pstart and cn.pstart <= cn.rlen);
        if (cn.rlen < cn.rbuf.len) return true;
        const in_reply = cn.state == .busy and (cn.phase == .run or cn.phase == .cancel);
        if (cn.pstart == cn.mlen and !in_reply) {
            c.dropConn(ci, invalid_msg);
            return false;
        }
        if (cn.pstart == cn.mlen) {
            // The reply is larger than a result can be: its bytes are dropped.
            cn.over = true;
            cn.mlen = 0;
            if (cn.abort == .none) cn.abort = .max_result;
        }
        const tail = cn.rlen - cn.pstart;
        std.mem.copyForwards(u8, cn.rbuf[cn.mlen..][0..tail], cn.rbuf[cn.pstart..cn.rlen]);
        cn.pstart = cn.mlen;
        cn.rlen = cn.mlen + tail;
        if (cn.rlen < cn.rbuf.len) return true;
        c.dropConn(ci, invalid_msg);
        return false;
    }

    /// Read from the socket. True when more can be there.
    fn readPlain(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        switch (sql_net.ioRead(null, cn.fd, cn.rbuf[cn.rlen..])) {
            .n => |n| {
                c.onBytes(ci, n);
                return true;
            },
            .again, .want_write => return false,
            .closed => {
                c.dropConn(ci, closed_msg);
                return false;
            },
        }
    }

    /// Move TLS records from the socket to the session, and read what the
    /// session has. True when more can be there.
    fn readSecure(c: *Client, ci: u32) bool {
        const cn = &c.conns[ci];
        const s = cn.session orelse {
            c.dropConn(ci, closed_msg);
            return false;
        };
        var got = false;
        const room = cn.bio.inRoom();
        if (room.len > 0) switch (sql_net.ioRead(null, cn.fd, room)) {
            .n => |n| {
                cn.bio.in_end += n;
                got = true;
            },
            .again, .want_write => {},
            .closed => cn.bio.eof = true,
        };
        switch (s.read(cn.rbuf[cn.rlen..])) {
            .n => |n| {
                c.onBytes(ci, n);
                return true;
            },
            .want_read => return got,
            .want_write => return c.flushCipher(ci) and got,
            .closed, .failed => {
                c.dropConn(ci, closed_msg);
                return false;
            },
        }
    }

    fn onBytes(c: *Client, ci: u32, n: usize) void {
        const cn = &c.conns[ci];
        std.debug.assert(n <= cn.rbuf.len - cn.rlen);
        cn.rlen += n;
        c.consume(ci);
    }

    /// Handle every whole packet in the read buffer.
    fn consume(c: *Client, ci: u32) void {
        const gen = c.conns[ci].gen;
        // Each packet has eight bytes or more: the buffer bounds the loop.
        for (0..c.conns[ci].rbuf.len / tds.header_len + 1) |_| {
            const cn = &c.conns[ci];
            const next = tds.next(cn.rbuf[cn.pstart..cn.rlen]) catch return c.dropConn(ci, invalid_msg);
            const p = next orelse break;
            cn.pstart += p.size;
            if (cn.state == .tls) {
                if (!c.onRecords(ci, p.body)) return;
                continue;
            }
            // Of a reply that is over the limit, only the last packet stays.
            if (cn.over) cn.mlen = 0;
            std.mem.copyForwards(u8, cn.rbuf[cn.mlen..][0..p.body.len], p.body);
            cn.mlen += p.body.len;
            if (!p.last) continue;
            c.onMessage(ci);
            if (c.conns[ci].gen != gen) return;
            cn.mlen = 0;
            cn.over = false;
        }
        const cn = &c.conns[ci];
        std.debug.assert(cn.mlen <= cn.pstart and cn.pstart <= cn.rlen);
        if (cn.pstart == cn.rlen) {
            cn.pstart = cn.mlen;
            cn.rlen = cn.mlen;
        }
    }

    /// TLS records of the server, inside a packet, during the handshake.
    /// False when the connection closed.
    fn onRecords(c: *Client, ci: u32, body: []const u8) bool {
        const cn = &c.conns[ci];
        const gen = cn.gen;
        const room = cn.bio.inRoom();
        if (body.len > room.len) {
            c.tlsFailed(ci);
            return false;
        }
        @memcpy(room[0..body.len], body);
        cn.bio.in_end += body.len;
        c.doHandshake(ci);
        return c.conns[ci].gen == gen;
    }

    /// A whole message of the server is in `rbuf[0..mlen]`.
    fn onMessage(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const msg = cn.rbuf[0..cn.mlen];
        switch (cn.state) {
            .prelogin => c.onPrelogin(ci, msg),
            .login => c.onLoginReply(ci, msg),
            .setup => c.onSetupReply(ci, msg),
            .busy => switch (cn.phase) {
                .run => c.onReply(ci, msg),
                .cancel => c.onCancelReply(ci, msg),
                .reset => c.onSetupReply(ci, msg),
                .none => c.dropConn(ci, invalid_msg),
            },
            // The server ends an idle session with a message.
            .idle => c.closeConn(ci),
            .free, .connecting, .tls => c.dropConn(ci, invalid_msg),
        }
    }

    // ---- a call ----------------------------------------------------------------

    /// The room of the result: the limit is `max_result`; the last bytes
    /// of the buffer are kept for the end of the document.
    fn resultOut(c: *const Client, r: *Req) tds.Out {
        return .{ .buf = r.out[0..c.cfg.max_result], .len = r.out_len };
    }

    fn beginCall(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.state == .busy and r.state == .running and cn.wlen == 0);
        cn.abort = .none;
        cn.cur = 0;
        cn.it = ms_call.Statements.init(r.call.statements);
        @memcpy(r.out[0..12], "{\"results\":[");
        r.out_len = 12;
        if (!cn.used) return c.startCall(ci);
        cn.phase = .reset;
        c.sendSetup(ci, true);
    }

    fn startCall(c: *Client, ci: u32) void {
        c.conns[ci].used = true;
        c.nextStatement(ci);
    }

    /// Send the next statement, or end the call after the last one.
    fn nextStatement(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.state == .busy and cn.wlen == 0);
        if (cn.abort != .none) return c.endCall(ci);
        if (cn.cur == r.call.count) return c.completeCall(ci);
        const it = if (cn.it) |*p| p else return c.failCall(ci, closed_msg);
        const st = it.next() orelse return c.failCall(ci, closed_msg);
        // `checkRequests` built the same request before the call started.
        const payload = c.buildRequest(st, cn.collation) catch return c.failCall(ci, "sql: a statement cannot be sent (limit)");
        var text: creds.Out = .{ .buf = c.tmp };
        // The same text was decoded for the request.
        http.unescape(st.text, &text) catch return c.failCall(ci, closed_msg);
        cn.reads = ms_call.classOf(text.written()) == .reads;
        if (!cn.reads) r.committed = true;
        cn.phase = .run;
        const limit = r.cred.request_ms;
        cn.statement_deadline_ms = if (limit > 0) c.now_ms + limit else 0;
        c.sendMessage(ci, tds.kind.rpc, payload, 0);
    }

    /// The whole reply to a statement: one more entry of the result.
    fn onReply(c: *Client, ci: u32, msg: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (cn.abort != .none) return c.endCall(ci);
        var o = c.resultOut(r);
        const failed = writeEntry(&o, msg, cn.cols, r.results > 0) catch |e| {
            switch (e) {
                error.NoSpace => cn.abort = .max_result,
                error.Unsupported => cn.abort = .no_form,
                error.Malformed => return c.dropConn(ci, invalid_msg),
            }
            return c.endCall(ci);
        };
        r.out_len = o.len;
        c.statementDone(ci, failed);
    }

    /// Write the entry of a reply. True when the reply has an error.
    fn writeEntry(o: *tds.Out, msg: []const u8, cols: []tds.Column, comma: bool) tds.ReplyError!bool {
        if (comma) try o.byte(',');
        try tds.writeReply(o, msg, cols);
        return !std.mem.endsWith(u8, o.buf[0..o.len], "\"errors\":[]}");
    }

    fn statementDone(c: *Client, ci: u32, failed: bool) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.state == .busy);
        r.results += 1;
        cn.cur += 1;
        cn.phase = .none;
        cn.statement_deadline_ms = 0;
        // The result ends with the first failure.
        if (failed and r.call.mode == .single) return c.completeCall(ci);
        c.nextStatement(ci);
    }

    /// A message after ATTENTION: the reply that was on its way, or the
    /// DONE token that confirms the cancel.
    fn onCancelReply(c: *Client, ci: u32, msg: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (msg.len < done_bytes or msg[msg.len - done_bytes] != token_done) return;
        const status = std.mem.readInt(u16, msg[msg.len - done_bytes + 1 ..][0..2], .little);
        if (status & done_attention == 0) return;
        if (cn.abort != .none) return c.endCall(ci);
        var o = c.resultOut(r);
        writeTimeout(&o, r.cred.request_ms, r.results > 0) catch {
            cn.abort = .max_result;
            return c.endCall(ci);
        };
        r.out_len = o.len;
        c.statementDone(ci, true);
    }

    /// The entry of a statement that the client cancelled at its time
    /// limit. The library node makes the error of tedious from it.
    fn writeTimeout(o: *tds.Out, ms: u32, comma: bool) error{NoSpace}!void {
        var buf: [32]u8 = @splat(0);
        if (comma) try o.byte(',');
        // The number has ten digits at most.
        try o.put(std.fmt.bufPrint(&buf, "{{\"timeout\":{d}}}", .{ms}) catch "");
    }

    fn completeCall(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        const r = &c.reqs[ri];
        std.debug.assert(cn.abort == .none);
        // The buffer has room for these bytes after `max_result`.
        @memcpy(r.out[r.out_len..][0..2], "]}");
        r.out_len += 2;
        r.ok = true;
        c.releaseConn(ci);
        c.finishReq(ri);
    }

    /// End the call without a result, at a limit. The text has a marker
    /// when no statement that writes was sent: n8n then runs the node in
    /// the fallback host.
    fn endCall(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        const r = &c.reqs[ri];
        const why = cn.abort;
        std.debug.assert(why != .none);
        const safe = !r.committed;
        if (safe) c.counters.to_host += 1;
        c.releaseConn(ci);
        switch (why) {
            .max_result => c.failReq(ri, "sql: the result is larger than {d} KB (--sql-max-result-kb){s}", .{ c.cfg.max_result >> 10, if (safe) marker_result else " (limit)" }),
            .no_form => c.failReq(ri, "sql: a column has a type or a value without a native form{s}", .{if (safe) marker_form else " (limit)"}),
            .none => {},
        }
    }

    /// End the call with a plain error. The connection closes.
    fn failCall(c: *Client, ci: u32, comptime text: []const u8) void {
        const ri = c.conns[ci].req;
        c.closeConn(ci);
        c.failReq(ri, text, .{});
    }

    // ---- time limits and ATTENTION ---------------------------------------------

    fn scanTimeouts(c: *Client) void {
        const Ctx = struct {
            c: *Client,
            pub fn fire(ctx: @This(), id: u32) void {
                if (id < ctx.c.reqs.len) return ctx.c.checkReq(id);
                const ci = id - @as(u32, @intCast(ctx.c.reqs.len));
                if (ci < ctx.c.conns.len) ctx.c.checkConnIdle(ci);
            }
        };
        c.wheel.advanceTo(c.now_ms, Ctx{ .c = c });
        // Statement deadlines and cancel deadlines are per-conn: scan linearly.
        for (c.conns, 0..) |*cn, i| {
            const ci = std.math.cast(u32, i).?;
            if (cn.state != .busy) continue;
            const limit = cn.statement_deadline_ms;
            if (cn.phase == .run and limit > 0 and c.now_ms >= limit) c.requestTimedOut(ci);
            if (cn.state == .busy and cn.phase == .cancel and c.now_ms >= cn.cancel_deadline_ms) {
                c.failCall(ci, "sql: the server did not cancel the statement at its time limit; the connection closed");
            }
        }
    }

    fn scheduleConnIdle(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const id = @as(u32, @intCast(c.reqs.len)) + ci;
        if (cn.state == .idle) {
            c.wheel.schedule(id, cn.idle_at_ms + @as(i64, c.cfg.idle_ms), c.now_ms);
        } else {
            c.wheel.cancel(id);
        }
    }

    fn checkReq(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        switch (r.state) {
            .free, .done => {},
            .queued, .running => if (c.now_ms >= r.deadline_ms) return c.timedOut(ri) else c.wheel.schedule(ri, r.deadline_ms, c.now_ms),
            .resolving, .connecting => if (c.now_ms >= @min(r.deadline_ms, r.connect_deadline_ms)) return c.connectTimedOut(ri) else c.wheel.schedule(ri, @min(r.deadline_ms, r.connect_deadline_ms), c.now_ms),
        }
    }

    fn checkConnIdle(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.state == .idle and c.now_ms - cn.idle_at_ms >= c.cfg.idle_ms) {
            c.closeConn(ci);
        } else if (cn.state == .idle) {
            c.scheduleConnIdle(ci);
        }
    }

    /// The statement is over `requestTimeout` of the credential: the
    /// client sends ATTENTION, as tedious does, and waits for the server
    /// to confirm it. The connection stays in use.
    fn requestTimedOut(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .busy and cn.phase == .run);
        c.counters.timeouts += 1;
        // The request is not on the socket yet: nothing can cancel it.
        if (cn.wlen != 0) return c.failCall(ci, "sql: no result before the time limit of the statement; the connection closed");
        cn.phase = .cancel;
        cn.statement_deadline_ms = 0;
        cn.cancel_deadline_ms = c.now_ms + c.cfg.cancel_ms;
        c.sendMessage(ci, kind_attention, "", 0);
    }

    fn timedOut(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        c.counters.timeouts += 1;
        const waited = r.state == .queued;
        if (r.conn != none) c.closeConn(r.conn);
        if (waited) return c.failReq(ri, "sql: no connection became free before the time limit of the call (limit)", .{});
        c.failReq(ri, "sql: no result before the time limit of the call; the connection closed", .{});
    }

    fn connectTimedOut(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        c.counters.timeouts += 1;
        var tail_buf: [32]u8 = @splat(0);
        var buf: [400]u8 = @splat(0);
        // The number has ten digits at most.
        const tail = std.fmt.bufPrint(&tail_buf, " in {d}ms", .{r.cred.connect_ms}) catch "";
        const text = c.connectText(&buf, ri, tail);
        c.closeConn(r.conn);
        c.connectFail(ri, text, "ETIMEOUT");
    }
};

const credential_marker = " (limit: sql-credential)";

/// A time limit of the credential, in milliseconds. Null: not a whole number.
fn timeOf(v: ?std.json.Value, default: u32) ?u32 {
    const x = v orelse return default;
    if (x == .null) return default;
    const text = sql_net.textOf(x) orelse return null;
    if (text.len == 0) return default;
    return std.fmt.parseInt(u32, text, 10) catch null; // the caller reports it
}

/// A switch of the credential. Null: not a boolean.
fn switchOf(v: ?std.json.Value, default: bool) ?bool {
    const x = v orelse return default;
    return if (x == .bool) x.bool else null;
}

fn versionOf(v: ?std.json.Value) ?tds.Version {
    const text = sql_net.textOf(v orelse return .v7_4) orelse return null;
    const names = [_]struct { []const u8, tds.Version }{
        .{ "7_4", .v7_4 }, .{ "7_3_B", .v7_3_b }, .{ "7_3_A", .v7_3_a }, .{ "7_2", .v7_2 },
    };
    for (names) |n| {
        if (std.mem.eql(u8, text, n[0])) return n[1];
    }
    return null;
}

/// Read the connection values of the slot into the call, with the
/// defaults of the credential type where a value is absent. The answer is
/// the text of an error, or null. The text never has a value of the
/// credential. A credential that tedious would use in a way that the
/// client does not have gives the marker, before a connection opens.
fn loadCredential(r: *Req, st: *const creds.Store) ?[]const u8 {
    const slot = st.slot(r.call.credential) orelse return "sql: the credential slot of the call is not in the credentials";
    if (slot.data != .object) return "sql: the credential of the call is not an object";
    const d = slot.data.object;
    const textOf = sql_net.textOf;
    if (sql_net.hasText(d.get("domain"))) return "sql: the credential has a domain (NTLM login)" ++ credential_marker;
    r.cred = .{
        .tls = switchOf(d.get("tls"), true) orelse return "sql: tls of the credential is not a boolean" ++ credential_marker,
        .trust = switchOf(d.get("allowUnauthorizedCerts"), false) orelse return "sql: allowUnauthorizedCerts of the credential is not a boolean" ++ credential_marker,
        .version = versionOf(d.get("tdsVersion")) orelse return "sql: the TDS version of the credential has no native client" ++ credential_marker,
        .connect_ms = timeOf(d.get("connectTimeout"), 15_000) orelse return "sql: connectTimeout of the credential is not a whole number" ++ credential_marker,
        .request_ms = timeOf(d.get("requestTimeout"), 15_000) orelse return "sql: requestTimeout of the credential is not a whole number" ++ credential_marker,
    };
    if (r.cred.connect_ms == 0) return "sql: connectTimeout of the credential is 0" ++ credential_marker;
    const host = textOf(d.get("server")) orelse "";
    const parts = [_][]const u8{
        if (host.len > 0) host else "localhost",
        textOf(d.get("user")) orelse "sa",
        textOf(d.get("database")) orelse "master",
        textOf(d.get("password")) orelse "",
    };
    // A named instance needs the browser service of the server.
    if (std.mem.indexOfScalar(u8, parts[0], '\\') != null) return "sql: the server of the credential names an instance" ++ credential_marker;
    var at: usize = 0;
    for (parts) |p| {
        if (p.len > r.cred.buf.len - at) return "sql: a value of the credential is too long";
        @memcpy(r.cred.buf[at..][0..p.len], p);
        at += p.len;
    }
    r.cred.host_len = std.math.cast(u16, parts[0].len).?;
    r.cred.user_len = std.math.cast(u16, parts[1].len).?;
    r.cred.db_len = std.math.cast(u16, parts[2].len).?;
    r.cred.pass_len = std.math.cast(u16, parts[3].len).?;
    if (r.cred.host_len > dns.max_host) return "sql: the server of the credential is too long";
    const port = textOf(d.get("port")) orelse "";
    r.cred.port = std.fmt.parseInt(u16, if (port.len > 0) port else "1433", 10) catch return "sql: the port of the credential is not a port number" ++ credential_marker;
    return null;
}

/// The key of the pool of a call: every value that makes a connection
/// differ. The password is in it only as a part of the digest.
fn poolKey(k: *const Cred) [32]u8 {
    return net_pool.poolKey(k.buf[0 .. @as(usize, k.host_len) + k.user_len + k.db_len + k.pass_len], &.{ k.host_len, k.user_len, k.db_len, k.pass_len, k.port, @intFromBool(k.tls), @intFromBool(k.trust) });
}
