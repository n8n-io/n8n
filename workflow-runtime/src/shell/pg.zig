//! The PostgreSQL client of one shard, for the `sql` effect (spec section
//! 9.10): protocol version 3 over TCP or TLS, with clear, MD5 and
//! SCRAM-SHA-256 passwords, on the shard's event loop. It never blocks.
//!
//! A call is a list of statements. Each value is a bind value of the
//! extended query protocol; the client never writes a value into a
//! statement text. A statement is prepared once for each connection and
//! used again by its key (the text and the parameter types).
//!
//! A `simple` statement is a text that the library node made for a form
//! that has no exact bind form. It goes as it is with the simple query
//! protocol, can hold several commands, and is not prepared. Alone, it
//! runs between `BEGIN` and `COMMIT` of the client unless it has a
//! transaction command of its own, so the client can roll it back.
//!
//! Validate, then run: the bind statements of a call are prepared and their
//! result columns are checked before one of them runs. A call that the
//! client cannot do exactly ends with an error whose text has a marker
//! (`(limit: sql-...)`); n8n then runs the node in the fallback host. A
//! marker is given only when the call committed nothing.
//!
//! Limits, all set at start: calls in flight or waiting (`max_reqs`),
//! connections (`max_conns`), connections of one credential and host
//! (`pool_conns`), pools, the size of a call and of a result. A call over
//! a connection limit waits in order; a call over `max_reqs` fails with a
//! limit error. Every buffer is reserved in `init`.
const std = @import("std");
const core_lib = @import("core");
const pgwire = core_lib.pgwire;
const sys = @import("sys.zig");
const tls = @import("tls.zig");
const dns = @import("dns.zig");
const creds = @import("creds.zig");
const http = @import("http.zig");
const pg_call = @import("pg_call.zig");
const sql_net = @import("sql_net.zig");

const none: u32 = std.math.maxInt(u32);
/// Prepared statements that one connection keeps. A call with more
/// different statements runs in the fallback host.
const stmt_slots = 16;
const max_cancels = 4;
/// The bytes of host, user, database and password of one call.
const cred_bytes = 1024;
/// Room for the columns of one result (`pg_call.Desc`).
const desc_bytes = 96 << 10;
const read_passes = 1024;

pub const Config = struct {
    /// Calls in flight or waiting (`--sql-max-requests`).
    max_reqs: u32 = 64,
    /// Open connections of the shard (`--sql-max-conns`).
    max_conns: u32 = 16,
    /// Connections of one credential and host (`--sql-pool-conns`). The
    /// `maxConnections` of the credential can lower it.
    pool_conns: u32 = 4,
    /// Different credentials and hosts in use at once.
    max_pools: u32 = 16,
    /// The JSON of one result (`--sql-max-result-kb`).
    max_result: u32 = 4 << 20,
    /// The arguments of one call (`--sql-max-request-kb`).
    max_request: u32 = 1 << 20,
    max_statements: u32 = 256,
    /// An idle connection closes after this time.
    idle_ms: u32 = 30_000,
    /// Time to connect and log in, when the call sets none.
    connect_ms: u32 = 30_000,
    /// Total time of a call, when the call sets none.
    total_ms: u32 = 300_000,
    /// `--sql-timestamp-zone utc`: n8n runs in UTC, so a timestamp without
    /// a zone has a native form.
    utc: bool = false,
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
    prepared: u64 = 0,
    refused: u64 = 0,
    to_host: u64 = 0,
    timeouts: u64 = 0,
    notices: u64 = 0,
};

const TlsMode = enum(u8) { off, verify, insecure };

/// Why a call ends without a result.
const Abort = enum(u8) { none, max_result, no_form, statement };

const ReqState = enum(u8) { free, queued, resolving, connecting, running, done };

const Req = struct {
    state: ReqState = .free,
    exec_id: u64 = 0,
    seq: u32 = 0,
    pool: u32 = none,
    conn: u32 = none,
    /// The copy of the arguments; `call` points into it.
    args: []u8 = &.{},
    call: pg_call.Call = .{},
    /// For each statement, its prepared statement on the connection.
    slots: []u8 = &.{},
    /// The result JSON, or the text of the error.
    out: []u8 = &.{},
    out_len: usize = 0,
    results: u32 = 0,
    ok: bool = false,
    /// A statement of the call that can have changed the database is
    /// committed: the call cannot run again.
    committed: bool = false,
    cred: [cred_bytes]u8 = @splat(0),
    host_len: u16 = 0,
    user_len: u16 = 0,
    db_len: u16 = 0,
    pass_len: u16 = 0,
    port: u16 = 5432,
    tls: TlsMode = .off,
    pool_max: u32 = 1,
    deadline_ms: i64 = 0,
    connect_deadline_ms: i64 = 0,
    /// The call set `connectTimeoutMs`.
    connect_set: bool = false,
    order: u64 = 0,
    dns_id: u16 = 0,

    fn host(r: *const Req) []const u8 {
        return r.cred[0..r.host_len];
    }

    fn user(r: *const Req) []const u8 {
        return r.cred[r.host_len..][0..r.user_len];
    }

    fn database(r: *const Req) []const u8 {
        return r.cred[r.host_len + r.user_len ..][0..r.db_len];
    }

    fn password(r: *const Req) []const u8 {
        return r.cred[r.host_len + r.user_len + r.db_len ..][0..r.pass_len];
    }
};

const Pool = struct {
    key: [32]u8 = @splat(0),
    conns: u32 = 0,
    /// Calls that use or wait for this pool.
    refs: u32 = 0,
};

const Stmt = struct {
    used: bool = false,
    /// The server has the statement.
    ok: bool = false,
    /// A Parse for it is on the wire.
    parsing: bool = false,
    /// The columns were checked when it was prepared.
    checked: bool = false,
    has_rows: bool = true,
    select: bool = false,
    unsupported: bool = false,
    has_date: bool = false,
    has_time: bool = false,
    has_interval: bool = false,
    /// The bind values that the client declared for it.
    params: u16 = 0,
    /// The last call that used it.
    call: u32 = 0,
    key: [32]u8 = @splat(0),
};

const ConnState = enum(u8) { free, connecting, ssl_wait, handshaking, startup, busy, idle };
const Flight = enum(u8) { none, prepare, run, finish };

const Conn = struct {
    state: ConnState = .free,
    fd: c_int = -1,
    gen: u32 = 0,
    pool: u32 = none,
    req: u32 = none,
    session: ?tls.Session = null,
    write_armed: bool = false,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    /// Bytes of a row larger than the buffer that are still to drop.
    skip: usize = 0,
    wbuf: []u8 = &.{},
    wlen: usize = 0,
    wsent: usize = 0,
    desc: pg_call.Desc = .{ .buf = &.{} },
    cache: [stmt_slots]Stmt = @splat(.{}),
    scram: pgwire.Scram = .{},
    addrs: dns.Addrs = .{ .list = @splat(.{}) },
    addr_i: u8 = 0,
    pid: u32 = 0,
    key: u32 = 0,
    /// The DateStyle of the session is ISO.
    iso: bool = true,
    /// The IntervalStyle of the session is `postgres`.
    interval_pg: bool = true,
    idle_at_ms: i64 = 0,
    calls: u32 = 0,
    flight: Flight = .none,
    preps: [stmt_slots]u8 = @splat(0),
    nprep: u8 = 0,
    prep_at: u8 = 0,
    prep_ok: bool = false,
    /// The server refused to prepare a text that has no bind form (`noBindForm`).
    multi: bool = false,
    stmt_it: ?pg_call.Statements = null,
    seg_from: u32 = 0,
    seg_to: u32 = 0,
    cur: u32 = 0,
    in_tx: bool = false,
    begin_pending: bool = false,
    commit_sent: bool = false,
    /// A statement of the transaction failed: the rest is dropped.
    failed: bool = false,
    /// A statement of the segment gave an error: it changed nothing.
    errored: bool = false,
    abort: Abort = .none,
    entry_at: usize = 0,
    entry_open: bool = false,
    /// The statement that runs now has its entry (its rows and its tag) at `entry_at`.
    entry_done: bool = false,
    rows: u32 = 0,
    /// The session reads a backslash in a plain string as itself.
    std_strings: bool = true,
    /// The segment is one simple statement that runs alone.
    seg_simple: bool = false,
    /// The client put a transaction around that statement.
    wrapped: bool = false,
    /// The simple statement of the next segment runs as it is, without a transaction of the client.
    bare_next: bool = false,
    /// After ROLLBACK, the segment runs again as it is.
    again: bool = false,
    scan: pgwire.TextScan = .{},
    /// The statements of the call, from the first one of the segment.
    seg_it: ?pg_call.Statements = null,
    /// The entry of the simple statement that runs now (`{"sets":[`) is open at `entry_at`.
    sets_open: bool = false,
    sets: u32 = 0,
    /// The command that runs now gave its columns.
    cmd_cols: bool = false,
    /// A command of a simple text gave no columns: it can have an effect.
    no_rows: bool = false,
    /// A command of a simple text ended a transaction: the client cannot roll the text back.
    tx_ended: bool = false,
    /// A simple text of the segment failed.
    text_failed: bool = false,
    /// It failed because a command cannot run in a transaction block.
    no_block: bool = false,
    /// The transaction status of the last ReadyForQuery of a simple text.
    status: u8 = 'I',
};

/// In `Req.slots`: the statement is simple and has no prepared statement.
const simple_slot: u8 = 0xFF;

const Cancel = struct { fd: c_int = -1, pid: u32 = 0, key: u32 = 0, at_ms: i64 = 0 };

/// The names of the prepared statements: `s00` to `s15`.
const names: [stmt_slots][3]u8 = blk: {
    var t: [stmt_slots][3]u8 = @splat(@splat('s'));
    for (&t, 0..) |*n, i| {
        n[1] = '0' + i / 10;
        n[2] = '0' + i % 10;
    }
    break :blk t;
};

const marker_result = " (limit: sql-max-result)";
const marker_form = " (limit: sql-type)";
const marker_statement = " (limit: sql-statement)";
const closed_msg = "sql: the connection to the database closed";

const addrText = sql_net.addrText;
const textOf = sql_net.textOf;
const isOn = sql_net.isOn;
const hasText = sql_net.hasText;

fn ioRead(cn: *const Conn, buf: []u8) sql_net.IoStep {
    return sql_net.ioRead(cn.session, cn.fd, buf);
}

fn ioWrite(cn: *const Conn, buf: []const u8) sql_net.IoStep {
    return sql_net.ioWrite(cn.session, cn.fd, buf);
}

pub const Done = sql_net.Done;

pub const Client = struct {
    cfg: Config,
    poller: *sys.Poller,
    kind_conn: u8,
    tls_verify: tls.Context,
    tls_insecure: tls.Context,
    resolver: *dns.Resolver,
    reqs: []Req,
    rfree: []u32,
    nrfree: u32,
    conns: []Conn,
    cfree: []u32,
    ncfree: u32,
    pools: []Pool,
    /// Finished calls, oldest first: a ring of request indexes.
    done: []u32,
    done_head: u32 = 0,
    ndone: u32 = 0,
    cancels: [max_cancels]Cancel = @splat(.{}),
    /// The text of the statement that is prepared now.
    tmp: []u8,
    oids: []u32,
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
        c.* = .{
            .cfg = cfg,
            .poller = poller,
            .kind_conn = kind_conn,
            .tls_verify = try tls.Context.client(cfg.insecure_tls, cfg.ca_file),
            .tls_insecure = try tls.Context.client(true, null),
            .resolver = try gpa.create(dns.Resolver),
            .reqs = try gpa.alloc(Req, cfg.max_reqs),
            .rfree = try gpa.alloc(u32, cfg.max_reqs),
            .nrfree = cfg.max_reqs,
            .conns = try gpa.alloc(Conn, cfg.max_conns),
            .cfree = try gpa.alloc(u32, cfg.max_conns),
            .ncfree = cfg.max_conns,
            .pools = try gpa.alloc(Pool, cfg.max_pools),
            .done = try gpa.alloc(u32, cfg.max_reqs),
            .tmp = try reserve(gpa, u8, cfg.max_request),
            .oids = try gpa.alloc(u32, pg_call.max_params),
        };
        try c.resolver.init(poller, kind_dns, cfg.dns_servers);
        for (c.reqs, 0..) |*r, i| {
            r.* = .{
                .args = try reserve(gpa, u8, cfg.max_request),
                .slots = try gpa.alloc(u8, cfg.max_statements),
                .out = try reserve(gpa, u8, @as(usize, cfg.max_result) + 256),
            };
            c.rfree[i] = cfg.max_reqs - 1 - std.math.cast(u32, i).?;
        }
        for (c.conns, 0..) |*cn, i| {
            cn.* = .{
                .rbuf = try reserve(gpa, u8, @as(usize, cfg.max_result) + 4096),
                .wbuf = try reserve(gpa, u8, 2 * @as(usize, cfg.max_request) + 128 * @as(usize, cfg.max_statements) + 4096),
                .desc = .{ .buf = try reserve(gpa, u8, desc_bytes) },
            };
            c.cfree[i] = cfg.max_conns - 1 - std.math.cast(u32, i).?;
        }
        for (c.pools) |*p| p.* = .{};
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
        for (&c.cancels) |*k| {
            if (k.fd >= 0) sys.close(k.fd);
            k.fd = -1;
        }
        c.resolver.deinit();
        c.tls_verify.deinit();
        c.tls_insecure.deinit();
    }

    // ---- entry points ---------------------------------------------------------

    /// Start the call of one `sql` effect. `args` is copied. The answer is
    /// null, or the text of an error when no call slot is free: every
    /// other outcome comes through `nextDone`.
    pub fn start(c: *Client, exec_id: u64, seq: u32, args: []const u8, store: ?*const creds.Store, now_ms: i64) ?[]const u8 {
        c.now_ms = now_ms;
        c.counters.started += 1;
        if (c.nrfree == 0) {
            c.counters.refused += 1;
            return "sql: too many calls in flight (--sql-max-requests); the step can run again (limit)";
        }
        c.nrfree -= 1;
        const ri = c.rfree[c.nrfree];
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
    /// an error, or null.
    fn prepareReq(c: *Client, ri: u32, args: []const u8, store: ?*const creds.Store) ?[]const u8 {
        const r = &c.reqs[ri];
        if (args.len > r.args.len) return "sql: the call is larger than --sql-max-request-kb" ++ marker_statement;
        @memcpy(r.args[0..args.len], args);
        if (pg_call.parseCall(r.args[0..args.len], c.cfg.max_statements, &r.call)) |msg| return msg;
        const st = store orelse c.cfg.credentials orelse return "sql: the runtime has no credentials";
        if (loadCredential(r, st, c.cfg.pool_conns)) |msg| return msg;
        const total: i64 = if (r.call.timeout_ms > 0) r.call.timeout_ms else c.cfg.total_ms;
        const connect: i64 = if (r.call.connect_ms > 0) r.call.connect_ms else c.cfg.connect_ms;
        r.deadline_ms = c.now_ms + total;
        r.connect_deadline_ms = c.now_ms + connect;
        r.connect_set = r.call.connect_ms > 0;
        r.pool = c.poolFor(poolKey(r)) orelse return "sql: more database credentials are in use than the runtime has pools; the step can run again (limit)";
        c.pools[r.pool].refs += 1;
        return null;
    }

    /// A readiness event of a connection, or of a cancel socket (an index
    /// after the connections).
    pub fn onConn(c: *Client, idx: u32, gen: u32, ev: sys.Ready, now_ms: i64) void {
        c.now_ms = now_ms;
        if (idx >= c.conns.len) return c.onCancelReady(idx - std.math.cast(u32, c.conns.len).?);
        const cn = &c.conns[idx];
        if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
        // kqueue write interest is one-shot; epoll keeps it until cleared.
        if (ev.writable and !sys.is_linux) cn.write_armed = false;
        switch (cn.state) {
            .free => {},
            .connecting => if (ev.writable or ev.eof) c.onConnected(idx),
            .handshaking => c.doHandshake(idx),
            .ssl_wait, .startup, .busy, .idle => {
                if (ev.writable and cn.wsent < cn.wlen) c.sendPending(idx);
                const same = c.conns[idx].fd >= 0 and (c.conns[idx].gen & 0xFFFFFF) == gen;
                if (same and (ev.readable or ev.eof)) c.readMore(idx);
            },
        }
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
        return c.pump_pending or c.more_pending or c.ndone > 0 or c.resolver.hasDone();
    }

    /// The oldest finished call, or null. Give it back with `release`.
    pub fn nextDone(c: *const Client) ?Done {
        if (c.ndone == 0) return null;
        const ri = c.done[c.done_head];
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .done);
        return .{ .req = ri, .exec_id = r.exec_id, .seq = r.seq, .ok = r.ok, .payload = r.out[0..r.out_len] };
    }

    /// Free the call that `nextDone` gave.
    pub fn release(c: *Client, ri: u32) void {
        std.debug.assert(c.ndone > 0 and c.done[c.done_head] == ri);
        const r = &c.reqs[ri];
        c.done_head = (c.done_head + 1) % std.math.cast(u32, c.done.len).?;
        c.ndone -= 1;
        // The pages of a large result go back to the system.
        if (r.out_len > 64 << 10) sys.releasePages(r.out[0..r.out_len]);
        r.state = .free;
        c.rfree[c.nrfree] = ri;
        c.nrfree += 1;
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
    /// result has `connect`, as the contract of the effect says.
    fn connectFail(c: *Client, ri: u32, message: []const u8, code: []const u8) void {
        const r = &c.reqs[ri];
        var o: pgwire.Out = .{ .buf = r.out };
        writeConnect(&o, message, code) catch {
            o.len = 0;
        };
        r.out_len = o.len;
        r.ok = o.len > 0;
        c.finishReq(ri);
    }

    fn writeConnect(o: *pgwire.Out, message: []const u8, code: []const u8) error{NoSpace}!void {
        try o.put("{\"results\":[],\"connect\":{\"message\":");
        try o.string(message);
        if (code.len > 0) {
            try o.put(",\"code\":");
            try o.string(code);
        }
        try o.put("}}");
    }

    fn finishReq(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state != .free and r.state != .done and c.ndone < c.done.len);
        if (r.state == .queued and r.order != 0) c.queued -= 1;
        if (r.pool != none) c.pools[r.pool].refs -= 1;
        // The password leaves the memory of the call.
        @memset(&r.cred, 0);
        r.pass_len = 0;
        r.order = 0;
        r.state = .done;
        const len = std.math.cast(u32, c.done.len).?;
        c.done[(c.done_head + c.ndone) % len] = ri;
        c.ndone += 1;
        c.pump_pending = true;
    }

    /// The call of `ci` ends and the connection stays open for the next one.
    fn releaseConn(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .busy and cn.req != none and !cn.in_tx);
        c.reqs[cn.req].conn = none;
        cn.req = none;
        cn.state = .idle;
        cn.flight = .none;
        cn.idle_at_ms = c.now_ms;
        cn.stmt_it = null;
    }

    /// Close a connection and end its call: with an error text, or, when
    /// the login did not end yet, with the connect error of node-postgres.
    fn dropConn(c: *Client, ci: u32, comptime fmt: []const u8, args: anytype) void {
        const ri = c.conns[ci].req;
        c.closeConn(ci);
        if (ri == none) return;
        if (c.reqs[ri].state != .running) return c.connectFail(ri, "Connection terminated unexpectedly", "");
        c.failReq(ri, fmt, args);
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
        c.pools[cn.pool].conns -= 1;
        if (cn.rlen > 64 << 10) sys.releasePages(cn.rbuf[0..cn.rlen]);
        const keep: Conn = .{ .gen = cn.gen +% 1, .rbuf = cn.rbuf, .wbuf = cn.wbuf, .desc = .{ .buf = cn.desc.buf } };
        cn.* = keep;
        c.cfree[c.ncfree] = ci;
        c.ncfree += 1;
        c.pump_pending = true;
    }

    // ---- pools and the queue ---------------------------------------------------

    /// The pool with this key, or a pool that nothing uses.
    fn poolFor(c: *Client, key: [32]u8) ?u32 {
        var free: ?u32 = null;
        for (c.pools, 0..) |*p, i| {
            const idx = std.math.cast(u32, i).?;
            const in_use = p.conns > 0 or p.refs > 0;
            if (in_use and std.mem.eql(u8, &p.key, &key)) return idx;
            if (!in_use and free == null) free = idx;
        }
        const idx = free orelse return null;
        c.pools[idx].key = key;
        return idx;
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
        return c.pools[r.pool].conns < r.pool_max and (c.ncfree > 0 or c.oldestIdle() != null);
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
            return c.beginCall(ci);
        }
        if (c.ncfree == 0) c.closeConn(c.oldestIdle() orelse return c.failReq(ri, "sql: no connection is free (limit)", .{}));
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

    // ---- connect, TLS, login ---------------------------------------------------

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
        std.debug.assert(c.ncfree > 0 and r.conn == none);
        c.ncfree -= 1;
        const ci = c.cfree[c.ncfree];
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .free);
        cn.state = .connecting;
        cn.pool = r.pool;
        cn.req = ri;
        c.pools[r.pool].conns += 1;
        r.conn = ci;
        r.state = .connecting;
        if (sys.numericAddr(r.host(), r.port)) |a| {
            cn.addrs.n = 1;
            cn.addrs.list[0] = a;
            return c.connectNext(ci);
        }
        switch (c.resolver.lookup(r.host(), c.now_ms)) {
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
        for (cn.addrs.list[0..cn.addrs.n]) |*a| a.port = c.reqs[cn.req].port;
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
        var buf: [300]u8 = @splat(0);
        // A host name fits the buffer.
        const text = std.fmt.bufPrint(&buf, "getaddrinfo ENOTFOUND {s}", .{c.reqs[ri].host()}) catch "getaddrinfo ENOTFOUND";
        c.closeConn(ci);
        c.connectFail(ri, text, "ENOTFOUND");
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
            c.poller.addRead(fd, c.token(ci)) catch return c.connectError(ci, 0);
            return c.armWrite(ci);
        }
        c.connectError(ci, 0);
    }

    /// The connect to the last address failed with the errno `code` (0: no socket).
    fn connectError(c: *Client, ci: u32, code: c_int) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        const name = if (code == 0) "ECONNREFUSED" else sys.errnoName(code);
        var ab: [64]u8 = @splat(0);
        var mb: [128]u8 = @splat(0);
        const last = cn.addrs.list[@max(cn.addr_i, 1) - 1];
        // The name and the address fit the buffer.
        const text = std.fmt.bufPrint(&mb, "connect {s} {s}", .{ name, addrText(last, &ab) }) catch "connect failed";
        c.closeConn(ci);
        c.connectFail(ri, text, name);
    }

    fn onConnected(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const err = sys.socketError(cn.fd);
        if (err != 0) {
            if (cn.addr_i >= cn.addrs.n) return c.connectError(ci, err);
            c.poller.remove(cn.fd);
            sys.close(cn.fd);
            cn.fd = -1;
            cn.write_armed = false;
            return c.connectNext(ci);
        }
        c.disarmWrite(ci);
        var w: pgwire.Writer = .{ .buf = cn.wbuf };
        if (r.tls == .off) return c.sendStartup(ci);
        // Eight bytes fit the buffer.
        w.sslRequest() catch return c.dropConn(ci, closed_msg, .{});
        cn.wlen = w.len;
        cn.state = .ssl_wait;
        c.sendPending(ci);
    }

    /// The answer to the SSL request: one byte.
    fn onSslAnswer(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.state == .ssl_wait and cn.rlen > 0);
        const answer = cn.rbuf[0];
        // A server that sends more before the handshake is not trusted (CVE-2021-23222).
        if (cn.rlen != 1 or answer != 'S') {
            const ri = cn.req;
            c.closeConn(ci);
            return c.connectFail(ri, "The server does not support SSL connections", "");
        }
        cn.rlen = 0;
        const ctx = if (r.tls == .insecure) c.tls_insecure else c.tls_verify;
        const host = r.host();
        const is_ip = sys.numericAddr(host, 0) != null and !std.mem.eql(u8, host, "localhost");
        cn.session = tls.Session.connect(ctx, cn.fd, host, is_ip, "") catch {
            return c.tlsFailed(ci);
        };
        cn.state = .handshaking;
        c.doHandshake(ci);
    }

    fn doHandshake(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const s = cn.session orelse return c.tlsFailed(ci);
        switch (s.handshake()) {
            .n => c.sendStartup(ci),
            .want_read => {},
            .want_write => c.armWrite(ci),
            .closed, .failed => c.tlsFailed(ci),
        }
    }

    fn tlsFailed(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        var eb: [256]u8 = @splat(0);
        var mb: [320]u8 = @splat(0);
        const why = if (cn.session) |s| s.failure(&eb) else tls.lastError(&eb);
        // A longer reason is cut to the short text.
        const text = std.fmt.bufPrint(&mb, "sql: TLS failed: {s}", .{why}) catch "sql: TLS failed";
        c.closeConn(ci);
        c.connectFail(ri, text, "");
    }

    fn sendStartup(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        var w: pgwire.Writer = .{ .buf = cn.wbuf };
        w.startup(r.user(), r.database()) catch return c.badCredential(ci);
        cn.wlen = w.len;
        cn.wsent = 0;
        cn.state = .startup;
        c.sendPending(ci);
    }

    fn badCredential(c: *Client, ci: u32) void {
        const ri = c.conns[ci].req;
        c.closeConn(ci);
        c.connectFail(ri, "sql: a value of the credential has a byte that the protocol cannot carry", "");
    }

    fn onStartupMsg(c: *Client, ci: u32, m: pgwire.Msg) void {
        const cn = &c.conns[ci];
        switch (m.tag) {
            'R' => c.onAuth(ci, m.body),
            'K' => {
                var rd: pgwire.Reader = .{ .s = m.body };
                // A short message leaves the key at 0: a cancel then does nothing.
                cn.pid = rd.int32() catch 0;
                // The same for the second word.
                cn.key = rd.int32() catch 0;
            },
            'E' => c.loginRefused(ci, m.body),
            'Z' => {
                c.counters.connects += 1;
                cn.state = .busy;
                c.reqs[cn.req].state = .running;
                c.beginCall(ci);
            },
            // Other messages of the login carry nothing that the client needs.
            else => {},
        }
    }

    /// The server refused the login: the result has the fields of its error.
    fn loginRefused(c: *Client, ci: u32, body: []const u8) void {
        const ri = c.conns[ci].req;
        const r = &c.reqs[ri];
        var o: pgwire.Out = .{ .buf = r.out };
        writeRefusal(&o, body) catch {
            o.len = 0;
        };
        c.closeConn(ci);
        r.out_len = o.len;
        r.ok = o.len > 0;
        c.finishReq(ri);
    }

    fn writeRefusal(o: *pgwire.Out, body: []const u8) pg_call.Desc.Error!void {
        try o.put("{\"results\":[],\"connect\":");
        try pg_call.writeError(o, body);
        try o.byte('}');
    }

    fn onAuth(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        var w: pgwire.Writer = .{ .buf = cn.wbuf, .len = cn.wlen };
        const a = pgwire.auth(body) catch return c.dropConn(ci, closed_msg, .{});
        const sent: pgwire.Error!void = switch (a) {
            .ok => {},
            .cleartext => w.password(r.password()),
            .md5 => |salt| blk: {
                var out: [35]u8 = @splat(0);
                pgwire.md5Password(r.user(), r.password(), salt, &out);
                break :blk w.password(&out);
            },
            .sasl => |list| saslFirst(cn, &w, list),
            .sasl_continue => |data| saslFinal(cn, &w, r.password(), data),
            .sasl_final => |data| saslVerify(cn, data),
            .other => error.Malformed,
        };
        sent catch return c.authFailed(ci, a);
        cn.wlen = w.len;
        c.sendPending(ci);
    }

    fn saslVerify(cn: *Conn, data: []const u8) pgwire.Error!void {
        // Every failure of the check ends the login the same way.
        cn.scram.verify(data) catch return error.Malformed;
    }

    fn saslFirst(cn: *Conn, w: *pgwire.Writer, list: []const u8) pgwire.Error!void {
        if (!pgwire.hasMechanism(list, pgwire.Scram.mechanism)) return error.Malformed;
        var random: [pgwire.Scram.nonce_bytes]u8 = @splat(0);
        sys.randomBytes(&random);
        var buf: [33]u8 = @splat(0);
        cn.scram = .{};
        try w.saslInitial(pgwire.Scram.mechanism, cn.scram.first(random, &buf));
    }

    fn saslFinal(cn: *Conn, w: *pgwire.Writer, pass: []const u8, data: []const u8) pgwire.Error!void {
        var buf: [pgwire.Scram.max_final]u8 = @splat(0);
        // Every failure of the exchange ends the login the same way.
        const final = cn.scram.final(pass, data, &buf) catch return error.Malformed;
        try w.saslResponse(final);
    }

    fn authFailed(c: *Client, ci: u32, a: pgwire.Auth) void {
        const ri = c.conns[ci].req;
        c.closeConn(ci);
        const text = switch (a) {
            .sasl_final => "SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match",
            .sasl => "SASL: Only mechanism SCRAM-SHA-256 is currently supported",
            .other => "sql: the server asks for a login method that the native client does not have",
            .ok, .cleartext, .md5, .sasl_continue => "sql: the login exchange with the server failed",
        };
        c.connectFail(ri, text, "");
    }

    // ---- bytes in and out ------------------------------------------------------

    fn sendPending(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        // Each pass writes bytes or ends: the buffer bounds the loop.
        for (0..cn.wbuf.len + 1) |_| {
            if (cn.wsent >= cn.wlen) break;
            switch (ioWrite(cn, cn.wbuf[cn.wsent..cn.wlen])) {
                .n => |n| cn.wsent += n,
                .again, .want_write => return c.armWrite(ci),
                .closed => return c.dropConn(ci, closed_msg, .{}),
            }
        }
        if (cn.wlen > 64 << 10) sys.releasePages(cn.wbuf[0..cn.wlen]);
        cn.wlen = 0;
        cn.wsent = 0;
        c.disarmWrite(ci);
    }

    fn readMore(c: *Client, ci: u32) void {
        const gen = c.conns[ci].gen;
        for (0..read_passes) |_| {
            const cn = &c.conns[ci];
            if (cn.gen != gen or cn.state == .free or cn.state == .handshaking) return;
            if (cn.rlen == cn.rbuf.len) return c.dropConn(ci, closed_msg, .{});
            switch (ioRead(cn, cn.rbuf[cn.rlen..])) {
                .n => |n| c.onBytes(ci, n),
                .again => return,
                .want_write => return c.armWrite(ci),
                .closed => return c.dropConn(ci, closed_msg, .{}),
            }
        }
        // The TLS session can hold more: `afterEvents` reads again.
        c.more_pending = true;
    }

    fn readPending(c: *Client) void {
        c.more_pending = false;
        for (c.conns, 0..) |*cn, i| {
            const s = cn.session orelse continue;
            if (cn.state != .free and cn.state != .handshaking and s.hasPending()) c.readMore(std.math.cast(u32, i).?);
        }
    }

    fn onBytes(c: *Client, ci: u32, n_in: usize) void {
        const cn = &c.conns[ci];
        var n = n_in;
        if (cn.skip > 0) {
            std.debug.assert(cn.rlen == 0);
            const k = @min(cn.skip, n);
            cn.skip -= k;
            std.mem.copyForwards(u8, cn.rbuf[0 .. n - k], cn.rbuf[k..n]);
            n -= k;
        }
        cn.rlen += n;
        if (cn.rlen == 0) return;
        if (cn.state == .ssl_wait) return c.onSslAnswer(ci);
        c.consume(ci);
    }

    /// Handle every whole message in the read buffer.
    fn consume(c: *Client, ci: u32) void {
        const gen = c.conns[ci].gen;
        var off: usize = 0;
        // Each message has five bytes or more: the buffer bounds the loop.
        for (0..c.conns[ci].rbuf.len / 5 + 1) |_| {
            const cn = &c.conns[ci];
            const m = pgwire.next(cn.rbuf[off..cn.rlen], cn.rbuf.len - 5) catch |e| return c.onFrameError(ci, off, e);
            const msg = m orelse break;
            c.handle(ci, msg);
            if (c.conns[ci].gen != gen) return;
            off += msg.size;
        }
        const cn = &c.conns[ci];
        std.debug.assert(off <= cn.rlen);
        std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - off], cn.rbuf[off..cn.rlen]);
        if (cn.rlen > 64 << 10 and cn.rlen - off < 4096) sys.releasePages(cn.rbuf[4096..cn.rlen]);
        cn.rlen -= off;
    }

    /// A row larger than the read buffer is larger than a result can be:
    /// its bytes are dropped and the call ends at the limit.
    fn onFrameError(c: *Client, ci: u32, off: usize, e: pgwire.NextError) void {
        const cn = &c.conns[ci];
        const in_rows = cn.state == .busy and cn.flight == .run and !cn.begin_pending;
        if (e != error.TooLarge or !in_rows or cn.rbuf[off] != 'D') return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
        const size: usize = 1 + @as(usize, std.mem.readInt(u32, cn.rbuf[off + 1 ..][0..4], .big));
        std.debug.assert(size > cn.rlen - off);
        cn.skip = size - (cn.rlen - off);
        cn.rlen = 0;
        if (cn.abort == .none) cn.abort = .max_result;
    }

    fn handle(c: *Client, ci: u32, m: pgwire.Msg) void {
        const cn = &c.conns[ci];
        switch (m.tag) {
            'N', 'A' => {
                c.counters.notices += 1;
                return;
            },
            'S' => return onParameter(cn, m.body),
            // Every other message belongs to the state of the connection.
            else => {},
        }
        switch (cn.state) {
            .startup => c.onStartupMsg(ci, m),
            .busy => switch (cn.flight) {
                .prepare => c.onPrepareMsg(ci, m),
                .run => c.onRunMsg(ci, m),
                .finish => c.onFinishMsg(ci, m),
                .none => c.dropConn(ci, closed_msg, .{}),
            },
            // The server ends an idle session with an error message.
            .idle => c.closeConn(ci),
            .free, .connecting, .ssl_wait, .handshaking => c.dropConn(ci, closed_msg, .{}),
        }
    }

    fn onParameter(cn: *Conn, body: []const u8) void {
        var rd: pgwire.Reader = .{ .s = body };
        // A parameter that cannot be read changes nothing.
        const name = rd.cstr() catch return;
        // The same for its value.
        const value = rd.cstr() catch return;
        if (std.mem.eql(u8, name, "DateStyle")) cn.iso = std.mem.startsWith(u8, value, "ISO");
        if (std.mem.eql(u8, name, "IntervalStyle")) cn.interval_pg = std.mem.eql(u8, value, "postgres");
        if (std.mem.eql(u8, name, "standard_conforming_strings")) cn.std_strings = std.mem.eql(u8, value, "on");
    }

    /// True when the text of a date or of an interval of this session is
    /// not in the style that the client reads.
    fn styleBlocks(cn: *const Conn, has_time: bool, has_interval: bool) bool {
        return (has_time and !cn.iso) or (has_interval and !cn.interval_pg);
    }

    // ---- a call: prepare -------------------------------------------------------

    fn options(c: *const Client, r: *const Req) pgwire.Options {
        return .{ .numbers = r.call.numbers, .legacy_dates = r.call.legacy_dates, .utc = c.cfg.utc };
    }

    fn beginCall(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.state == .busy and r.state == .running and cn.wlen == 0);
        cn.calls +%= 1;
        cn.multi = false;
        cn.abort = .none;
        cn.failed = false;
        cn.in_tx = false;
        cn.stmt_it = pg_call.Statements.init(r.call.statements);
        var o: pgwire.Out = .{ .buf = r.out };
        // The buffer is larger than this text.
        o.put("{\"results\":[") catch return c.endCall(ci, .max_result);
        r.out_len = o.len;
        c.sendPrepare(ci);
    }

    const PrepError = error{ NoSpace, Malformed, TooMany };

    /// Prepare each statement of the call that the connection does not have.
    fn sendPrepare(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        var w: pgwire.Writer = .{ .buf = cn.wbuf };
        var it = pg_call.Statements.init(r.call.statements) orelse return c.endCall(ci, .statement);
        cn.nprep = 0;
        for (0..r.call.count) |i| {
            const st = it.next() orelse return c.endCall(ci, .statement);
            r.slots[i] = simple_slot;
            if (st.simple) continue;
            // The cache of the connection is not as the server has it: the connection closes.
            r.slots[i] = c.prepareOne(cn, &w, st) catch return c.dropConn(ci, "sql: the statements of the call cannot go as prepared statements" ++ marker_statement, .{});
        }
        if (cn.nprep == 0) return c.afterPrepare(ci);
        cn.wlen = w.len;
        cn.flight = .prepare;
        cn.prep_at = 0;
        cn.prep_ok = false;
        c.counters.prepared += cn.nprep;
        c.sendPending(ci);
    }

    fn statementText(c: *Client, raw: []const u8) PrepError![]const u8 {
        var o: creds.Out = .{ .buf = c.tmp };
        http.unescape(raw, &o) catch |e| return if (e == error.NoSpace) error.NoSpace else error.Malformed;
        return o.written();
    }

    fn prepareOne(c: *Client, cn: *Conn, w: *pgwire.Writer, st: pg_call.Statement) PrepError!u8 {
        const text = try c.statementText(st.text);
        const oids = pg_call.paramOids(st.values, c.oids);
        const key = pg_call.statementKey(text, oids);
        for (&cn.cache, 0..) |*e, i| {
            if (!e.used or !std.mem.eql(u8, &e.key, &key)) continue;
            e.call = cn.calls;
            return std.math.cast(u8, i).?;
        }
        const s = claimSlot(cn) orelse return error.TooMany;
        const e = &cn.cache[s];
        if (e.ok) try w.closeStatement(&names[s]);
        const params = std.math.cast(u16, oids.len) orelse return error.Malformed;
        e.* = .{ .used = true, .key = key, .call = cn.calls, .select = pgwire.startsWithSelect(text), .params = params };
        try w.parse(&names[s], text, oids);
        try w.describe('S', &names[s]);
        try w.sync();
        cn.preps[cn.nprep] = s;
        cn.nprep += 1;
        return s;
    }

    /// A slot that is free, else the one that this call does not use and
    /// that was used the longest time ago.
    fn claimSlot(cn: *const Conn) ?u8 {
        var best: ?u8 = null;
        for (&cn.cache, 0..) |*e, i| {
            const idx = std.math.cast(u8, i).?;
            if (!e.used) return idx;
            if (e.call == cn.calls) continue;
            if (best == null or cn.calls -% e.call > cn.calls -% cn.cache[best.?].call) best = idx;
        }
        return best;
    }

    fn onPrepareMsg(c: *Client, ci: u32, m: pgwire.Msg) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.prep_at < cn.nprep);
        const e = &cn.cache[cn.preps[cn.prep_at]];
        switch (m.tag) {
            'T' => {
                // Columns that do not fit the buffer have no native form.
                const info = cn.desc.load(m.body, .{ .utc = c.cfg.utc }, true) catch pg_call.Info{ .unsupported = true };
                e.unsupported = info.unsupported;
                e.has_date = info.has_date;
                e.has_time = info.has_time;
                e.has_interval = info.has_interval;
                e.has_rows = true;
                cn.prep_ok = true;
            },
            'n' => {
                e.has_rows = false;
                cn.prep_ok = true;
            },
            't' => {
                // The text names a parameter that has no value: pg-promise refuses
                // it before the server sees it, so the call has no bind form.
                var rd: pgwire.Reader = .{ .s = m.body };
                const needs = rd.count() catch return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
                cn.multi = cn.multi or needs != e.params;
            },
            'E' => {
                cn.prep_ok = false;
                cn.multi = cn.multi or noBindForm(m.body);
            },
            'Z' => {
                e.ok = cn.prep_ok;
                e.checked = cn.prep_ok;
                cn.prep_ok = false;
                cn.prep_at += 1;
                if (cn.prep_at == cn.nprep) c.afterPrepare(ci);
            },
            // ParseComplete and CloseComplete carry nothing that the client needs.
            else => {},
        }
    }

    /// The statements are prepared: check them, then run the first segment.
    fn afterPrepare(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        cn.flight = .none;
        if (cn.multi) return c.endCall(ci, .statement);
        for (r.slots[0..r.call.count]) |s| {
            // The columns of a simple statement show only when it runs.
            if (s == simple_slot) continue;
            const e = &cn.cache[s];
            const no_form = e.unsupported or (r.call.legacy_dates and e.has_date) or styleBlocks(cn, e.has_time, e.has_interval);
            if (e.ok and no_form) return c.endCall(ci, .no_form);
        }
        c.startSegment(ci, 0);
    }

    // ---- a call: run -----------------------------------------------------------

    /// Send the statements that run together: all of them in one
    /// transaction, or one statement alone.
    fn startSegment(c: *Client, ci: u32, from: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(from < r.call.count and cn.wlen == 0 and !cn.in_tx);
        const alone = r.call.mode == .independently or r.call.count == 1;
        cn.seg_from = from;
        cn.seg_to = if (alone) from + 1 else r.call.count;
        cn.seg_it = cn.stmt_it;
        cn.seg_simple = alone and r.call.mode != .transaction and r.slots[from] == simple_slot;
        const wrap = if (cn.seg_simple) c.wrapsSimple(cn) else wrapsBind(cn, r.slots[from]);
        cn.wrapped = cn.seg_simple and wrap;
        cn.in_tx = r.call.mode == .transaction or !alone or wrap;
        var w: pgwire.Writer = .{ .buf = cn.wbuf };
        c.buildSegment(cn, r, &w) catch {
            cn.in_tx = false;
            for (&cn.cache) |*s| s.parsing = false;
            return c.endCall(ci, .statement);
        };
        cn.wlen = w.len;
        cn.flight = .run;
        cn.cur = from;
        cn.begin_pending = cn.in_tx;
        resetSegment(cn);
        c.sendPending(ci);
    }

    /// The state that the answers of a segment set starts clear.
    fn resetSegment(cn: *Conn) void {
        std.debug.assert(cn.flight == .run);
        cn.failed = false;
        cn.errored = false;
        cn.entry_open = false;
        cn.entry_done = false;
        cn.bare_next = false;
        cn.again = false;
        cn.sets_open = false;
        cn.cmd_cols = false;
        cn.no_rows = false;
        cn.tx_ended = false;
        cn.text_failed = false;
        cn.no_block = false;
        cn.status = 'I';
    }

    /// A statement that gives rows and is no SELECT runs in a transaction,
    /// so that a result without a native form can be rolled back.
    fn wrapsBind(cn: *const Conn, slot: u8) bool {
        if (slot == simple_slot) return false;
        const e = &cn.cache[slot];
        return !e.ok or (e.has_rows and !e.select);
    }

    /// True when the simple statement that runs alone goes between `BEGIN`
    /// and `COMMIT` of the client, so that the client can roll it back.
    /// The server runs a text of several commands as one transaction, so the
    /// effect is the same. A text with a transaction command of its own
    /// runs as it is; a text of `SELECT` commands needs no transaction.
    fn wrapsSimple(c: *Client, cn: *Conn) bool {
        var it = cn.stmt_it orelse return false;
        const st = it.next() orelse return false;
        // A text that cannot be read ends the call in `buildSegment`.
        const text = c.statementText(st.text) catch return false;
        cn.scan = pgwire.scanText(text, !cn.std_strings);
        return !cn.bare_next and !cn.scan.transaction and !cn.scan.all_select;
    }

    fn buildSegment(c: *Client, cn: *Conn, r: *const Req, w: *pgwire.Writer) PrepError!void {
        if (cn.in_tx) try w.query("BEGIN");
        const it = if (cn.stmt_it) |*p| p else return error.Malformed;
        for (cn.seg_from..cn.seg_to) |i| {
            const st = it.next() orelse return error.Malformed;
            const s = r.slots[i];
            if (s == simple_slot) {
                const text = try c.statementText(st.text);
                // In a transaction of the mode, the statements after this one are on
                // the wire before its answer comes. A text that ends the transaction
                // would let them run alone, so the call has no native form.
                if (!cn.seg_simple and pgwire.scanText(text, !cn.std_strings).transaction) return error.Malformed;
                try w.query(text);
                continue;
            }
            const e = &cn.cache[s];
            if (!e.ok and !e.parsing) {
                // It did not prepare before (its table did not exist yet): it is parsed where it runs.
                try w.parse(&names[s], try c.statementText(st.text), pg_call.paramOids(st.values, c.oids));
                e.parsing = true;
            }
            const n = std.math.cast(u16, pg_call.countParams(st.values) orelse return error.Malformed) orelse return error.Malformed;
            var b = try w.bindBegin(&names[s], n);
            try pg_call.writeParams(w, &b, st.values);
            try w.bindEnd(b);
            try w.describe('P', "");
            try w.execute();
            try w.sync();
        }
    }

    fn onRunMsg(c: *Client, ci: u32, m: pgwire.Msg) void {
        const cn = &c.conns[ci];
        if (cn.begin_pending) {
            if (m.tag == 'E') return c.dropConn(ci, "sql: the database refused BEGIN", .{});
            if (m.tag == 'Z') cn.begin_pending = false;
            return;
        }
        if (c.reqs[cn.req].slots[cn.cur] == simple_slot) return c.onSimpleMsg(ci, m);
        const skip = cn.failed or cn.abort != .none;
        switch (m.tag) {
            '1' => cn.cache[c.reqs[cn.req].slots[cn.cur]].ok = true,
            'T' => if (!skip) c.onColumns(ci, m.body),
            'n' => {
                // Known only now for a statement that was parsed where it runs.
                cn.cache[c.reqs[cn.req].slots[cn.cur]].has_rows = false;
                if (!skip) c.openEntry(ci);
            },
            'D' => if (!skip) c.onRow(ci, m.body),
            'C' => if (!skip) c.onComplete(ci, m.body),
            'I' => if (!skip) c.onComplete(ci, "\x00"),
            'E' => if (!skip) c.onStatementError(ci, m.body),
            'Z' => {
                cn.cur += 1;
                cn.entry_open = false;
                cn.entry_done = false;
                if (cn.cur == cn.seg_to) c.segmentDone(ci);
            },
            // BindComplete carries nothing.
            else => {},
        }
    }

    /// The room of the result: the limit is `max_result`; the last bytes
    /// of the buffer are kept for the end of the document.
    fn resultOut(c: *const Client, r: *Req) pgwire.Out {
        return .{ .buf = r.out[0..c.cfg.max_result], .len = r.out_len };
    }

    fn openEntry(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        var o = c.resultOut(r);
        cn.entry_at = r.out_len;
        cn.rows = 0;
        if (r.results > 0) o.byte(',') catch return setAbort(cn, .max_result);
        o.put("{\"rows\":[") catch return setAbort(cn, .max_result);
        r.out_len = o.len;
        cn.entry_open = true;
    }

    fn setAbort(cn: *Conn, a: Abort) void {
        std.debug.assert(a != .none);
        if (cn.abort == .none) cn.abort = a;
    }

    fn onColumns(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const e = &cn.cache[r.slots[cn.cur]];
        const info = cn.desc.load(body, c.options(r), !e.checked) catch |err| {
            if (err == error.Malformed) return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
            return setAbort(cn, .no_form);
        };
        if (info.unsupported or styleBlocks(cn, info.has_time, info.has_interval)) return setAbort(cn, .no_form);
        c.openEntry(ci);
    }

    fn onRow(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (!cn.entry_open) return;
        var o = c.resultOut(r);
        if (cn.rows > 0) o.byte(',') catch return setAbort(cn, .max_result);
        cn.desc.writeRow(&o, body, c.options(r)) catch |err| switch (err) {
            error.NoSpace => return setAbort(cn, .max_result),
            error.Unsupported => return setAbort(cn, .no_form),
            error.Malformed => return c.dropConn(ci, "sql: the database sent a message that is not valid", .{}),
        };
        r.out_len = o.len;
        cn.rows += 1;
    }

    /// The end of the rows of one statement: a command tag, or a zero byte
    /// for a text without a command.
    fn onComplete(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (!cn.entry_open) c.openEntry(ci);
        if (!cn.entry_open) return;
        const tag = pgwire.commandTag(body) catch return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
        var o = c.resultOut(r);
        writeTag(&o, tag) catch return setAbort(cn, .max_result);
        r.out_len = o.len;
        r.results += 1;
        cn.entry_open = false;
        cn.entry_done = true;
    }

    fn writeTag(o: *pgwire.Out, tag: pgwire.Tag) error{NoSpace}!void {
        var nb: [24]u8 = @splat(0);
        try o.put("],\"command\":");
        if (tag.command.len > 0) try o.string(tag.command) else try o.put("null");
        try o.put(",\"rowCount\":");
        const rows = tag.rows orelse return o.put("null}");
        try o.put(std.fmt.bufPrint(&nb, "{d}}}", .{rows}) catch return error.NoSpace);
    }

    /// A statement failed: its entry is the error. In a transaction the
    /// statements after it do not count.
    fn onStatementError(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        // An error after the tag is the failure of the commit of a statement
        // that runs alone (a deferred constraint): the statement failed.
        if (cn.entry_done) c.dropEntry(ci);
        if (cn.entry_open) r.out_len = cn.entry_at;
        cn.entry_open = false;
        var o = c.resultOut(r);
        writeFailure(&o, body, r.results > 0) catch |err| {
            if (err == error.Malformed) return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
            return setAbort(cn, .max_result);
        };
        r.out_len = o.len;
        r.results += 1;
        cn.failed = cn.in_tx;
        cn.errored = true;
    }

    /// Take back the entry of the last statement: its failure takes the place.
    fn dropEntry(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(r.results > 0 and cn.entry_at <= r.out_len and !cn.entry_open);
        r.out_len = cn.entry_at;
        r.results -= 1;
        cn.entry_done = false;
    }

    fn writeFailure(o: *pgwire.Out, body: []const u8, comma: bool) pg_call.Desc.Error!void {
        if (comma) try o.byte(',');
        try o.put("{\"error\":");
        try pg_call.writeError(o, body);
        try o.byte('}');
    }

    // ---- a call: a simple statement ---------------------------------------------

    /// An answer to a simple statement: the server sends the columns, the
    /// rows and the tag of each command of the text, or the error that
    /// ends the text, then one ReadyForQuery.
    fn onSimpleMsg(c: *Client, ci: u32, m: pgwire.Msg) void {
        const cn = &c.conns[ci];
        const skip = cn.failed or cn.abort != .none;
        switch (m.tag) {
            'T' => {
                cn.cmd_cols = true;
                if (!skip) c.onSimpleColumns(ci, m.body);
            },
            'D' => if (!skip) c.onRow(ci, m.body),
            'C' => c.onSimpleComplete(ci, m.body, skip),
            // A text without a command.
            'I' => if (!skip and !cn.sets_open) c.openSets(ci),
            'E' => c.onSimpleError(ci, m.body, skip),
            'G' => c.refuseCopy(ci),
            'Z' => c.onSimpleReady(ci, m.body, skip),
            // The data of `COPY ... TO STDOUT`: node-postgres drops it.
            else => {},
        }
    }

    /// Open the entry of a simple statement: one set for each command.
    fn openSets(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(!cn.sets_open and !cn.entry_open);
        var o = c.resultOut(r);
        cn.entry_at = r.out_len;
        cn.sets = 0;
        if (r.results > 0) o.byte(',') catch return setAbort(cn, .max_result);
        o.put("{\"sets\":[") catch return setAbort(cn, .max_result);
        r.out_len = o.len;
        cn.sets_open = true;
    }

    /// Open the set of the command that runs now.
    fn openSet(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (!cn.sets_open) c.openSets(ci);
        if (!cn.sets_open) return;
        var o = c.resultOut(r);
        cn.rows = 0;
        if (cn.sets > 0) o.byte(',') catch return setAbort(cn, .max_result);
        o.put("{\"rows\":[") catch return setAbort(cn, .max_result);
        r.out_len = o.len;
        cn.entry_open = true;
    }

    /// The columns of one command. The client sees them only now, so a
    /// type without a native form ends the call after commands ran.
    fn onSimpleColumns(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const info = cn.desc.load(body, c.options(r), true) catch |err| {
            if (err == error.Malformed) return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
            return setAbort(cn, .no_form);
        };
        const no_form = info.unsupported or (r.call.legacy_dates and info.has_date) or styleBlocks(cn, info.has_time, info.has_interval);
        if (no_form) return setAbort(cn, .no_form);
        c.openSet(ci);
    }

    /// The tag of one command: its set is complete.
    fn onSimpleComplete(c: *Client, ci: u32, body: []const u8, skip: bool) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const tag = pgwire.commandTag(body) catch return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
        if (endsTransaction(tag.command)) cn.tx_ended = true;
        if (!cn.cmd_cols) cn.no_rows = true;
        cn.cmd_cols = false;
        if (skip) return;
        if (!cn.entry_open) c.openSet(ci);
        if (!cn.entry_open) return;
        var o = c.resultOut(r);
        writeTag(&o, tag) catch return setAbort(cn, .max_result);
        r.out_len = o.len;
        cn.sets += 1;
        cn.entry_open = false;
    }

    /// A command of the text failed: the server drops the rest of the
    /// text, and the entry of the statement is the error.
    fn onSimpleError(c: *Client, ci: u32, body: []const u8, skip: bool) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const code = pg_call.errorField(body, 'C') orelse "";
        cn.text_failed = true;
        cn.no_block = std.mem.eql(u8, code, "25001") or std.mem.eql(u8, code, "2D000");
        if (skip) return;
        if (cn.sets_open) r.out_len = cn.entry_at else cn.entry_at = r.out_len;
        cn.sets_open = false;
        cn.entry_open = false;
        var o = c.resultOut(r);
        writeFailure(&o, body, r.results > 0) catch |err| {
            if (err == error.Malformed) return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
            return setAbort(cn, .max_result);
        };
        r.out_len = o.len;
        r.results += 1;
        cn.failed = cn.in_tx;
        cn.errored = true;
    }

    /// `COPY ... FROM STDIN`: the client has no data, and answers as node-postgres does.
    fn refuseCopy(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        var w: pgwire.Writer = .{ .buf = cn.wbuf, .len = cn.wlen };
        // Without room for the message, the time limit of the call ends the statement.
        w.copyFail("No source stream defined") catch return;
        cn.wlen = w.len;
        c.sendPending(ci);
    }

    /// ReadyForQuery after a simple text: its entry is complete.
    fn onSimpleReady(c: *Client, ci: u32, body: []const u8, skip: bool) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (body.len != 1) return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
        cn.status = body[0];
        // The text ended the transaction of the client.
        if (cn.in_tx and cn.status == 'I') cn.tx_ended = true;
        const made = cn.sets_open or cn.text_failed;
        if (!skip and !made) return c.dropConn(ci, "sql: the database sent a message that is not valid", .{});
        if (!skip and cn.sets_open) {
            var o = c.resultOut(r);
            o.put("]}") catch return setAbort(cn, .max_result);
            r.out_len = o.len;
            r.results += 1;
        }
        cn.sets_open = false;
        cn.entry_open = false;
        cn.cur += 1;
        if (cn.cur == cn.seg_to) c.segmentDone(ci);
    }

    /// True when the simple statement that ran alone can have changed the
    /// database, so that the host cannot run the call again. A text in
    /// the transaction of the client was rolled back at a failure or a
    /// limit. A text that ran as it is counts, unless the server rolled it
    /// back or each of its commands was a `SELECT` that gave rows.
    fn simpleEffect(cn: *const Conn) bool {
        std.debug.assert(cn.seg_simple);
        if (cn.tx_ended) return true;
        if (cn.text_failed or cn.errored) return false;
        if (cn.wrapped) return cn.abort == .none;
        return !cn.scan.all_select or cn.no_rows;
    }

    /// Every statement of the segment has its answer: end the transaction.
    fn segmentDone(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.flight == .run and cn.cur == cn.seg_to);
        for (&cn.cache) |*s| s.parsing = false;
        if (cn.tx_ended) c.reqs[cn.req].committed = true;
        // A simple text that ran as it is left a transaction open: the client ends it.
        const left_open = cn.seg_simple and !cn.in_tx and cn.status != 'I';
        if (!cn.in_tx and !left_open) return c.afterSegment(ci);
        // A command of the text cannot run in the transaction of the client:
        // the transaction is rolled back and the text runs again as it is.
        cn.again = cn.wrapped and cn.no_block and !cn.tx_ended and cn.status != 'I' and cn.abort == .none;
        var w: pgwire.Writer = .{ .buf = cn.wbuf };
        cn.commit_sent = cn.in_tx and !cn.failed and cn.abort == .none;
        // The text fits the buffer.
        w.query(if (cn.commit_sent) "COMMIT" else "ROLLBACK") catch return c.dropConn(ci, closed_msg, .{});
        cn.wlen = w.len;
        cn.flight = .finish;
        c.sendPending(ci);
    }

    fn onFinishMsg(c: *Client, ci: u32, m: pgwire.Msg) void {
        const cn = &c.conns[ci];
        if (m.tag == 'E' and cn.commit_sent) {
            // COMMIT failed (a deferred constraint): the transaction is rolled back.
            cn.in_tx = true;
            // A transaction that the client put around one statement is not a
            // transaction of the mode: the statement failed, as when it runs alone.
            const own = c.reqs[cn.req].call.mode != .transaction and cn.seg_to == cn.seg_from + 1;
            if (own) c.dropEntry(ci);
            c.onStatementError(ci, m.body);
        }
        if (m.tag != 'Z' or c.conns[ci].state != .busy) return;
        cn.in_tx = false;
        if (cn.again) return c.runAgain(ci);
        c.afterSegment(ci);
    }

    /// The simple text failed in the transaction of the client, which is
    /// rolled back now: the text runs again as it is, as the v1 node sends it.
    fn runAgain(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.seg_simple and cn.wrapped and cn.abort == .none and !cn.in_tx);
        c.dropEntry(ci);
        cn.stmt_it = cn.seg_it;
        cn.bare_next = true;
        c.startSegment(ci, cn.seg_from);
    }

    fn afterSegment(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        cn.flight = .none;
        if (cn.abort != .none) {
            if (cn.seg_simple and simpleEffect(cn)) r.committed = true;
            return c.endCall(ci, cn.abort);
        }
        if (cn.seg_to == r.call.count) return c.completeCall(ci);
        // More statements follow only in the mode `independently`: the segment
        // was one statement, and the next one runs also after a failure.
        std.debug.assert(r.call.mode == .independently and cn.seg_to == cn.seg_from + 1);
        r.committed = r.committed or hasEffect(cn, r);
        c.startSegment(ci, cn.seg_to);
    }

    /// True when the statement that ran alone can have changed the
    /// database: it ended without an error, and it is not a SELECT that
    /// gives rows. The host can run a call again while this is false for
    /// each of its statements.
    fn hasEffect(cn: *const Conn, r: *const Req) bool {
        if (cn.seg_simple) return simpleEffect(cn);
        const e = &cn.cache[r.slots[cn.seg_from]];
        return !cn.errored and !(e.select and e.has_rows);
    }

    fn completeCall(c: *Client, ci: u32) void {
        const ri = c.conns[ci].req;
        const r = &c.reqs[ri];
        var o: pgwire.Out = .{ .buf = r.out, .len = r.out_len };
        // The buffer has room for these bytes after `max_result`.
        o.put("]}") catch return c.endCall(ci, .max_result);
        r.out_len = o.len;
        r.ok = true;
        c.releaseConn(ci);
        c.finishReq(ri);
    }

    /// End the call without a result. The connection is in no transaction
    /// and stays open. The text has a marker when the call committed
    /// nothing: n8n then runs the node in the fallback host.
    fn endCall(c: *Client, ci: u32, why: Abort) void {
        const ri = c.conns[ci].req;
        const r = &c.reqs[ri];
        std.debug.assert(why != .none);
        const safe = !r.committed;
        if (safe) c.counters.to_host += 1;
        c.releaseConn(ci);
        switch (why) {
            .max_result => c.failReq(ri, "sql: the result is larger than {d} KB (--sql-max-result-kb){s}", .{ c.cfg.max_result >> 10, if (safe) marker_result else " (limit)" }),
            .no_form => c.failReq(ri, "sql: a column has a type or a value without a native form{s}", .{if (safe) marker_form else " (limit)"}),
            .statement => c.failReq(ri, "sql: a statement cannot go as one prepared statement{s}", .{if (safe) marker_statement else " (limit)"}),
            .none => {},
        }
    }

    // ---- time limits and cancel -------------------------------------------------

    fn scanTimeouts(c: *Client) void {
        for (c.reqs, 0..) |*r, i| {
            const ri = std.math.cast(u32, i).?;
            switch (r.state) {
                .free, .done => {},
                .queued => if (c.now_ms >= r.deadline_ms) c.timedOut(ri),
                .resolving, .connecting => if (c.now_ms >= @min(r.deadline_ms, r.connect_deadline_ms)) c.connectTimedOut(ri),
                .running => if (c.now_ms >= r.deadline_ms) c.timedOut(ri),
            }
        }
        for (c.conns, 0..) |*cn, i| {
            if (cn.state == .idle and c.now_ms - cn.idle_at_ms >= c.cfg.idle_ms) c.closeIdle(std.math.cast(u32, i).?);
        }
        for (&c.cancels) |*k| {
            if (k.fd >= 0 and c.now_ms - k.at_ms >= 5000) c.closeCancel(k);
        }
    }

    fn closeIdle(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        var buf: [8]u8 = @splat(0);
        var w: pgwire.Writer = .{ .buf = &buf };
        // The server also closes the session when the socket closes.
        w.terminate() catch return c.closeConn(ci);
        switch (ioWrite(cn, buf[0..w.len])) {
            // The message is a courtesy: the close follows in every case.
            .n, .again, .want_write, .closed => {},
        }
        c.closeConn(ci);
    }

    fn timedOut(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        c.counters.timeouts += 1;
        const waited = r.state == .queued;
        if (r.conn != none) {
            c.sendCancel(r.conn);
            c.closeConn(r.conn);
        }
        if (waited) return c.failReq(ri, "sql: no connection became free before the time limit of the call (limit)", .{});
        c.failReq(ri, "sql: no result before the time limit of the call; the statement was cancelled", .{});
    }

    fn connectTimedOut(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        c.counters.timeouts += 1;
        const cn = &c.conns[r.conn];
        var ab: [64]u8 = @splat(0);
        var mb: [128]u8 = @splat(0);
        const last = cn.addrs.list[@max(cn.addr_i, 1) - 1];
        // The address fits the buffer.
        const text = if (r.connect_set) "timeout expired" else std.fmt.bufPrint(&mb, "connect ETIMEDOUT {s}", .{addrText(last, &ab)}) catch "connect ETIMEDOUT";
        c.closeConn(r.conn);
        c.connectFail(ri, text, if (r.connect_set) "" else "ETIMEDOUT");
    }

    /// Ask the server to cancel the statement of `ci`, on a socket of its
    /// own. Best effort: without a free cancel socket the close of the
    /// connection ends the statement.
    fn sendCancel(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.state != .busy or cn.addr_i == 0 or cn.pid == 0) return;
        for (&c.cancels, 0..) |*k, i| {
            if (k.fd >= 0) continue;
            // No socket: the close of the connection ends the statement.
            const fd = sys.connectAddr(cn.addrs.list[cn.addr_i - 1]) catch return;
            const idx = std.math.cast(u32, c.conns.len + i).?;
            k.* = .{ .fd = fd, .pid = cn.pid, .key = cn.key, .at_ms = c.now_ms };
            c.poller.watch(fd, sys.makeToken(c.kind_conn, 0, idx), false, true);
            return;
        }
    }

    fn onCancelReady(c: *Client, i: u32) void {
        if (i >= c.cancels.len) return;
        const k = &c.cancels[i];
        if (k.fd < 0) return;
        var buf: [16]u8 = @splat(0);
        var w: pgwire.Writer = .{ .buf = &buf };
        // Sixteen bytes fit the buffer.
        w.cancel(k.pid, k.key) catch return c.closeCancel(k);
        if (sys.socketError(k.fd) == 0) {
            switch (sys.writeSome(k.fd, buf[0..w.len])) {
                // The request is best effort.
                .n, .again, .closed => {},
            }
        }
        c.closeCancel(k);
    }

    fn closeCancel(c: *Client, k: *Cancel) void {
        std.debug.assert(k.fd >= 0);
        c.poller.remove(k.fd);
        sys.close(k.fd);
        k.fd = -1;
    }
};

/// True for the tag of a command that ends a transaction, or that can
/// (`PREPARE TRANSACTION`, `ROLLBACK TO`): after it, the client does not
/// know what a `ROLLBACK` takes back.
fn endsTransaction(command: []const u8) bool {
    return std.mem.eql(u8, command, "COMMIT") or std.mem.eql(u8, command, "ROLLBACK") or std.mem.eql(u8, command, "PREPARE");
}

/// True when the server refuses to prepare a text that runs when
/// pg-promise writes the values into it, as the v1 node does: two
/// commands in one text, a parameter whose type the server cannot
/// find (42P18), a parameter without a value (42P02), or a parameter in
/// a place where only a literal can be.
fn noBindForm(body: []const u8) bool {
    const code = pg_call.errorField(body, 'C') orelse return false;
    const msg = pg_call.errorField(body, 'M') orelse return false;
    if (std.mem.eql(u8, code, "42P18") or std.mem.eql(u8, code, "42P02")) return true;
    if (!std.mem.eql(u8, code, "42601")) return false;
    return std.mem.eql(u8, msg, "cannot insert multiple commands into a prepared statement") or
        std.mem.startsWith(u8, msg, "syntax error at or near \"$");
}

/// Read the connection values of the slot into the call. The answer is
/// the text of an error, or null. The text never has a value of the
/// credential.
fn loadCredential(r: *Req, st: *const creds.Store, pool_conns: u32) ?[]const u8 {
    const slot = st.slot(r.call.credential) orelse return "sql: the credential slot of the call is not in the credentials";
    if (slot.data != .object) return "sql: the credential of the call is not an object";
    const d = slot.data.object;
    if (isOn(d.get("sshTunnel"))) return "sql: the credential uses an SSH tunnel (limit: sql-credential)";
    const ssl = d.get("ssl");
    const ssl_off = ssl == null or std.mem.eql(u8, textOf(ssl) orelse "", "disable");
    r.tls = if (isOn(d.get("allowUnauthorizedCerts"))) .insecure else if (ssl_off) .off else .verify;
    const certs = hasText(d.get("caCertificate")) or hasText(d.get("clientCertificate")) or hasText(d.get("clientPrivateKey"));
    if (r.tls != .off and certs) return "sql: the credential has a CA or client certificate (limit: sql-credential)";
    const parts = [_][]const u8{
        textOf(d.get("host")) orelse "localhost",
        textOf(d.get("user")) orelse "",
        textOf(d.get("database")) orelse "",
        textOf(d.get("password")) orelse "",
    };
    var at: usize = 0;
    for (parts) |p| {
        if (p.len > r.cred.len - at) return "sql: a value of the credential is too long";
        @memcpy(r.cred[at..][0..p.len], p);
        at += p.len;
    }
    r.host_len = std.math.cast(u16, parts[0].len).?;
    r.user_len = std.math.cast(u16, parts[1].len).?;
    r.db_len = std.math.cast(u16, parts[2].len).?;
    r.pass_len = std.math.cast(u16, parts[3].len).?;
    if (r.host_len == 0 or r.host_len > dns.max_host) return "sql: the credential has no host";
    r.port = std.fmt.parseInt(u16, textOf(d.get("port")) orelse "5432", 10) catch return "sql: the port of the credential is not a port number";
    const max = std.fmt.parseInt(u32, textOf(d.get("maxConnections")) orelse "0", 10) catch 0; // not a number: the limit of the runtime
    r.pool_max = if (max > 0) @min(max, pool_conns) else pool_conns;
    return null;
}

/// The key of the pool of a call: every value that makes a connection
/// differ. The password is in it only as a part of the digest.
fn poolKey(r: *const Req) [32]u8 {
    var h = std.crypto.hash.sha2.Sha256.init(.{});
    const lens = [_]u16{ r.host_len, r.user_len, r.db_len, r.pass_len, r.port, @backingInt(r.tls) };
    h.update(std.mem.sliceAsBytes(&lens));
    h.update(r.cred[0 .. @as(usize, r.host_len) + r.user_len + r.db_len + r.pass_len]);
    return h.finalResult();
}

test "sql client: a text without a bind form is recognized by the refusal of the server" {
    try std.testing.expect(noBindForm("SERROR\x00C42601\x00Mcannot insert multiple commands into a prepared statement\x00\x00"));
    try std.testing.expect(noBindForm("SERROR\x00C42601\x00Msyntax error at or near \"$1\"\x00\x00"));
    try std.testing.expect(noBindForm("SERROR\x00C42P18\x00Mcould not determine data type of parameter $1\x00\x00"));
    try std.testing.expect(noBindForm("SERROR\x00C42P02\x00Mthere is no parameter $2\x00\x00"));
    try std.testing.expect(!noBindForm("SERROR\x00C42601\x00Msyntax error at or near \"x\"\x00\x00"));
    try std.testing.expect(!noBindForm("SERROR\x00C42P01\x00Mrelation \"t\" does not exist\x00\x00"));
}
