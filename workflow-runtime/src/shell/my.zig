//! The MySQL client of one shard, for the `sql` effect with the dialect
//! `mysql` (spec section 9.10): the client/server protocol over TCP or
//! TLS, with the login methods `mysql_native_password` and
//! `caching_sha2_password`, on the shard's event loop. It never blocks.
//!
//! A call is a list of statements. Each statement is a text that the
//! library node made, as the v1 node sends it through mysql2: it goes as
//! it is with `COM_QUERY` (the text protocol), and can hold several
//! commands. The client never changes a text and has no bind values.
//!
//! The statements of a call run on one connection, one after the other:
//! the answer of a statement is read before the next one is sent. The mode
//! `transaction` puts `START TRANSACTION` and `COMMIT` around them.
//!
//! A call that the client cannot do exactly ends with an error whose text
//! has a marker (`(limit: sql-...)`); n8n then runs the node in the
//! fallback host. A marker is given only when the call committed nothing:
//! see `Req.committed`.
//!
//! Limits, all set at start: calls in flight or waiting (`max_reqs`),
//! connections (`max_conns`), connections of one credential and host
//! (`pool_conns`), pools, the size of a call and of a result. A call over
//! a connection limit waits in order; a call over `max_reqs` fails with a
//! limit error. Every buffer is reserved in `init`.
const std = @import("std");
const core_lib = @import("core");
const mywire = core_lib.mywire;
const sys = @import("sys.zig");
const tls = @import("tls.zig");
const dns = @import("dns.zig");
const creds = @import("creds.zig");
const http = @import("http.zig");
const my_call = @import("my_call.zig");
const sql_net = @import("sql_net.zig");
const net_pool = @import("net_pool.zig");

const none: u32 = std.math.maxInt(u32);
/// Connections that only send `KILL QUERY` for a call over its time limit.
const max_kills = 4;
/// The bytes of host, user, database and password of one call.
const cred_bytes = 1024;
/// Room for the columns of one result set (`my_call.Desc`).
const desc_bytes = 96 << 10;
const read_passes = 1024;
/// `SERVER_SESSION_STATE_CHANGED`: a statement changed the default database
/// or a tracked variable of the session.
const status_state_changed: u16 = 0x4000;

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
    /// An idle connection closes after this time.
    idle_ms: u32 = 30_000,
    /// Time to connect and log in, when the call sets none (the default of mysql2).
    connect_ms: u32 = 10_000,
    /// Total time of a call, when the call sets none.
    total_ms: u32 = 300_000,
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
    kills: u64 = 0,
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
    port: u16 = 3306,
    tls: bool = false,

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
    call: my_call.Call = .{},
    /// The result JSON, or the text of the error.
    out: []u8 = &.{},
    out_len: usize = 0,
    results: u32 = 0,
    ok: bool = false,
    /// A command that can have changed the database, or the session, has
    /// completed: the host cannot run the call again, so a limit gives no
    /// marker. Outside a transaction of the mode: an OK packet, or a result
    /// set of a text that does not only read. In a transaction of the mode:
    /// an answer whose status shows that the transaction ended (a command
    /// with an implicit commit).
    committed: bool = false,
    cred: Cred = .{},
    deadline_ms: i64 = 0,
    connect_deadline_ms: i64 = 0,
    order: u64 = 0,
    dns_id: u16 = 0,
    /// The groups of the statements that failed (`independently`).
    failed_groups: []u32 = &.{},
    nfailed: u32 = 0,
};

const Pool = net_pool.Pool;

const Kill = struct {
    used: bool = false,
    cred: Cred = .{},
    thread_id: u32 = 0,
    at_ms: i64 = 0,
};

const ConnState = enum(u8) { free, connecting, greeting, handshaking, auth, busy, idle };
/// The answer that a busy connection waits for.
const Phase = enum(u8) { none, reset, begin, run, commit, rollback, kill };
/// The packet that comes next in the answer to a statement.
const Step = enum(u8) { head, columns, columns_end, rows, infile };

const Conn = struct {
    state: ConnState = .free,
    fd: c_int = -1,
    gen: u32 = 0,
    pool: u32 = none,
    req: u32 = none,
    /// The connection only sends `KILL QUERY`: its slot in `kills`.
    kill: u32 = none,
    session: ?tls.Session = null,
    write_armed: bool = false,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    /// Bytes of a packet larger than the buffer that are still to drop.
    skip: usize = 0,
    /// The next packet continues a value of 16 MB or more: it is dropped.
    cont: bool = false,
    wbuf: []u8 = &.{},
    wlen: usize = 0,
    wsent: usize = 0,
    desc: my_call.Desc = .{ .buf = &.{} },
    addrs: dns.Addrs = .{ .list = @splat(.{}) },
    addr_i: u8 = 0,
    /// The id of the session on the server, for `KILL QUERY`.
    thread_id: u32 = 0,
    caps: u32 = 0,
    /// The sequence number of the last packet of the server.
    seq: u8 = 0,
    nonce: [mywire.nonce_bytes]u8 = @splat(0),
    plugin: mywire.Plugin = .other,
    /// The client asked for the RSA key of the server.
    key_wanted: bool = false,
    idle_at_ms: i64 = 0,
    /// A call ran on the session: the next call resets it first.
    used: bool = false,
    /// A statement changed the default database or a tracked variable: the
    /// connection closes after the call.
    dirty: bool = false,
    phase: Phase = .none,
    step: Step = .head,
    cols_left: u32 = 0,
    it: ?my_call.Statements = null,
    cur: u32 = 0,
    group: ?u32 = null,
    /// Each command of the text that runs now only reads.
    reads: bool = false,
    /// The transaction of the mode is open.
    in_tx: bool = false,
    /// The last status word of the server.
    status: u16 = 0,
    abort: Abort = .none,
    /// The entry of the statement that runs now starts here in the result.
    entry_at: usize = 0,
    sets: u32 = 0,
    rows: u32 = 0,
    /// The entry of the statement is an error: its sets are dropped.
    failed: bool = false,
};

const marker_result = " (limit: sql-max-result)";
const marker_form = " (limit: sql-type)";
const closed_msg = "sql: the connection to the database closed";
const invalid_msg = "sql: the database sent a packet that is not valid";
const lost_msg = "Connection lost: The server closed the connection.";

pub const Done = sql_net.Done;

pub const Client = struct {
    cfg: Config,
    poller: *sys.Poller,
    kind_conn: u8,
    tls_ctx: tls.Context,
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
    kills: [max_kills]Kill = @splat(.{}),
    /// The text of the statement that is sent now.
    tmp: []u8,
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
            .tls_ctx = try tls.Context.client(cfg.insecure_tls, cfg.ca_file),
            .resolver = try gpa.create(dns.Resolver),
            .reqs = try gpa.alloc(Req, cfg.max_reqs),
            .rfree = .{ .items = try gpa.alloc(u32, cfg.max_reqs) },
            .conns = try gpa.alloc(Conn, cfg.max_conns),
            .cfree = .{ .items = try gpa.alloc(u32, cfg.max_conns) },
            .pools = try gpa.alloc(Pool, cfg.max_pools),
            .done_ring = .{ .items = try gpa.alloc(u32, cfg.max_reqs) },
            .wheel_links = try gpa.alloc(net_pool.Link, cfg.max_reqs + cfg.max_conns + max_kills),
            .wheel = .{},
            .tmp = try reserve(gpa, u8, cfg.max_request),
        };
        try c.resolver.init(poller, kind_dns, cfg.dns_servers);
        // Discard: loop index not needed here.
        for (c.reqs, 0..) |*r, i| {
            _ = i;
            r.* = .{
                .args = try reserve(gpa, u8, cfg.max_request),
                .out = try reserve(gpa, u8, @as(usize, cfg.max_result) + 256),
                .failed_groups = try gpa.alloc(u32, cfg.max_statements),
            };
        }
        c.rfree.initAll();
        c.nrfree = c.rfree.len;
        // Discard: loop index not needed here.
        for (c.conns, 0..) |*cn, i| {
            _ = i;
            cn.* = .{
                .rbuf = try reserve(gpa, u8, @as(usize, cfg.max_result) + 4096),
                .wbuf = try reserve(gpa, u8, @as(usize, cfg.max_request) + 4096),
                .desc = .{ .buf = try reserve(gpa, u8, desc_bytes) },
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
        r.nfailed = 0;
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
        if (args.len > r.args.len) return "sql: the call is larger than --sql-max-request-kb (limit)";
        @memcpy(r.args[0..args.len], args);
        if (my_call.parseCall(r.args[0..args.len], c.cfg.max_statements, &r.call)) |msg| return msg;
        const st = store orelse c.cfg.credentials orelse return "sql: the runtime has no credentials";
        if (loadCredential(r, st)) |msg| return msg;
        const total: i64 = if (r.call.timeout_ms > 0) r.call.timeout_ms else c.cfg.total_ms;
        const connect: i64 = if (r.call.connect_ms > 0) r.call.connect_ms else c.cfg.connect_ms;
        r.deadline_ms = c.now_ms + total;
        r.connect_deadline_ms = c.now_ms + connect;
        r.pool = c.poolFor(poolKey(&r.cred)) orelse return "sql: more database credentials are in use than the runtime has pools; the step can run again (limit)";
        c.wheel.schedule(ri, @min(r.deadline_ms, r.connect_deadline_ms), c.now_ms);
        c.pools[r.pool].refs += 1;
        return null;
    }

    /// A readiness event of a connection.
    pub fn onConn(c: *Client, idx: u32, gen: u32, ev: sys.Ready, now_ms: i64) void {
        c.now_ms = now_ms;
        if (idx >= c.conns.len) return;
        const cn = &c.conns[idx];
        if (cn.fd < 0 or (cn.gen & 0xFFFFFF) != gen) return;
        // kqueue write interest is one-shot; epoll keeps it until cleared.
        if (ev.writable and !sys.is_linux) cn.write_armed = false;
        switch (cn.state) {
            .free => {},
            .connecting => if (ev.writable or ev.eof) c.onConnected(idx),
            .handshaking => c.doHandshake(idx),
            .greeting, .auth, .busy, .idle => {
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
    /// result has `connect`, with the message and the code of mysql2.
    fn connectFail(c: *Client, ri: u32, message: []const u8, code: []const u8) void {
        const r = &c.reqs[ri];
        var o: mywire.Out = .{ .buf = r.out };
        writeConnect(&o, message, code) catch {
            o.len = 0;
        };
        r.out_len = o.len;
        r.ok = o.len > 0;
        c.finishReq(ri);
    }

    fn writeConnect(o: *mywire.Out, message: []const u8, code: []const u8) error{NoSpace}!void {
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

    /// The call of `ci` ends. The connection stays open for the next call
    /// when the next call can make the session new again.
    fn releaseConn(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .busy and cn.req != none);
        const open_tx = cn.status & mywire.status.in_trans != 0;
        if (cn.dirty or open_tx or c.pools[cn.pool].sticky or cn.wlen != 0) return c.quitConn(ci);
        c.reqs[cn.req].conn = none;
        cn.req = none;
        cn.state = .idle;
        cn.phase = .none;
        cn.idle_at_ms = c.now_ms;
        cn.it = null;
        c.scheduleConnIdle(ci);
    }

    /// Close a connection and end its call: with an error text, or, when
    /// the login did not end yet, with the connect error of mysql2.
    fn dropConn(c: *Client, ci: u32, comptime text: []const u8) void {
        const ri = c.conns[ci].req;
        c.closeConn(ci);
        if (ri == none) return;
        if (c.reqs[ri].state != .running) return c.connectFail(ri, lost_msg, "PROTOCOL_CONNECTION_LOST");
        c.failReq(ri, text, .{});
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

    /// Say goodbye, then close. The server also ends the session when the socket closes.
    fn quitConn(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        var buf: [8]u8 = @splat(0);
        var w: mywire.Writer = .{ .buf = &buf };
        // Five bytes fit the buffer.
        w.quit() catch return c.closeConn(ci);
        switch (sql_net.ioWrite(cn.session, cn.fd, buf[0..w.len])) {
            // The message is a courtesy: the close follows in every case.
            .n, .again, .want_write, .closed => {},
        }
        c.closeConn(ci);
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
        if (cn.kill != none) {
            c.kills[cn.kill].cred.wipe();
            c.kills[cn.kill].used = false;
        }
        const nri = cn.req;
        if (cn.rlen > 64 << 10) sys.releasePages(cn.rbuf[0..cn.rlen]);
        const keep: Conn = .{ .gen = cn.gen +% 1, .rbuf = cn.rbuf, .wbuf = cn.wbuf, .desc = .{ .buf = cn.desc.buf } };
        cn.* = keep;
        if (nri != none) c.wheel.cancel(nri);
        c.wheel.cancel(@as(u32, @intCast(c.reqs.len)) + ci);
        c.cfree.push(ci);
        c.ncfree = c.cfree.len;
        c.pump_pending = true;
    }

    // ---- pools and the queue ---------------------------------------------------

    /// The pool with this key, or a pool that nothing uses. A pool keeps
    /// what it knows of its server while no other key takes its place.
    fn poolFor(c: *Client, key: [32]u8) ?u32 {
        const idx = net_pool.poolFor(c.pools, key, c.now_ms) orelse return null;
        // Preserve sticky state when reusing an existing pool.
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

    /// The connection values of the call, or of the `KILL QUERY`, of a connection.
    fn credOf(c: *const Client, cn: *const Conn) *const Cred {
        std.debug.assert((cn.req != none) != (cn.kill != none));
        return if (cn.req != none) &c.reqs[cn.req].cred else &c.kills[cn.kill].cred;
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
        var buf: [300]u8 = @splat(0);
        // A host name fits the buffer.
        const text = std.fmt.bufPrint(&buf, "getaddrinfo ENOTFOUND {s}", .{c.credOf(&c.conns[ci]).host()}) catch "getaddrinfo ENOTFOUND";
        c.connectEnd(ci, text, "ENOTFOUND");
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
        const name = if (code == 0) "ECONNREFUSED" else sys.errnoName(code);
        var ab: [64]u8 = @splat(0);
        var mb: [128]u8 = @splat(0);
        const last = cn.addrs.list[@max(cn.addr_i, 1) - 1];
        // The name and the address fit the buffer.
        const text = std.fmt.bufPrint(&mb, "connect {s} {s}", .{ name, sql_net.addrText(last, &ab) }) catch "connect failed";
        c.connectEnd(ci, text, name);
    }

    /// The TCP connection is open: the server sends its handshake first.
    fn onConnected(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
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
        cn.state = .greeting;
    }

    /// The handshake of the server: answer with the login, after TLS when
    /// the credential asks for it.
    fn onGreeting(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const k = c.credOf(cn);
        if (body.len > 0 and body[0] == 0xFF) return c.loginRefused(ci, body);
        const h = mywire.handshake(body) catch return c.dropConn(ci, invalid_msg);
        cn.thread_id = h.thread_id;
        cn.nonce = h.nonce;
        cn.plugin = mywire.pluginOf(h.plugin);
        cn.status = h.status;
        cn.caps = (mywire.client_caps & h.caps) | mywire.needed_caps | mywire.cap.plugin_auth_lenenc | mywire.cap.multi_statements | mywire.cap.multi_results;
        if (k.db_len > 0) cn.caps |= mywire.cap.connect_with_db;
        if (!k.tls) return c.sendLogin(ci);
        if (h.caps & mywire.cap.ssl == 0) return c.connectEnd(ci, "Server does not support secure connection", "HANDSHAKE_NO_SSL_SUPPORT");
        cn.caps |= mywire.cap.ssl;
        var w: mywire.Writer = .{ .buf = cn.wbuf };
        // The request fits the buffer.
        w.sslRequest(cn.seq +% 1, cn.caps) catch return c.dropConn(ci, closed_msg);
        cn.seq +%= 1;
        // The 36 bytes go out at once on a new socket: the TLS handshake comes next on the wire.
        switch (sql_net.ioWrite(null, cn.fd, cn.wbuf[0..w.len])) {
            .n => |n| if (n != w.len) return c.dropConn(ci, closed_msg),
            .again, .want_write, .closed => return c.dropConn(ci, closed_msg),
        }
        const host = k.host();
        const is_ip = sys.numericAddr(host, 0) != null and !std.mem.eql(u8, host, "localhost");
        cn.session = tls.Session.connect(c.tls_ctx, cn.fd, host, is_ip, "") catch return c.tlsFailed(ci);
        cn.state = .handshaking;
        c.doHandshake(ci);
    }

    fn doHandshake(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const s = cn.session orelse return c.tlsFailed(ci);
        switch (s.handshake()) {
            .n => c.sendLogin(ci),
            .want_read => {},
            .want_write => c.armWrite(ci),
            .closed, .failed => c.tlsFailed(ci),
        }
    }

    /// The text of a TLS failure is the one of OpenSSL, not of Node.js:
    /// the fallback host gives the error of the v1 node.
    fn tlsFailed(c: *Client, ci: u32) void {
        c.credentialEnd(ci, "sql: the TLS handshake with the database failed");
    }

    fn sendLogin(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const k = c.credOf(cn);
        // The server changes to its own method when the client does not have the one that it named.
        if (cn.plugin == .other) cn.plugin = .native;
        const name = if (cn.plugin == .native) mywire.native_name else mywire.caching_name;
        var answer: [32]u8 = @splat(0);
        const auth = mywire.scramble(cn.plugin, k.password(), cn.nonce, &answer);
        var w: mywire.Writer = .{ .buf = cn.wbuf };
        w.login(cn.seq +% 1, cn.caps, k.user(), auth, k.database(), name) catch return c.connectEnd(ci, "sql: a value of the credential has a byte that the protocol cannot carry", "");
        cn.wlen = w.len;
        cn.wsent = 0;
        cn.state = .auth;
        c.sendPending(ci);
    }

    /// The server refused the login: the result has the fields of its error.
    fn loginRefused(c: *Client, ci: u32, body: []const u8) void {
        const ri = c.conns[ci].req;
        if (ri == none) return c.closeConn(ci);
        const r = &c.reqs[ri];
        var o: mywire.Out = .{ .buf = r.out };
        writeRefusal(&o, body) catch {
            o.len = 0;
        };
        c.closeConn(ci);
        r.out_len = o.len;
        r.ok = o.len > 0;
        if (o.len == 0) return c.failReq(ri, "{s}", .{invalid_msg});
        c.finishReq(ri);
    }

    fn writeRefusal(o: *mywire.Out, body: []const u8) mywire.Error!void {
        const e = try mywire.errPacket(body);
        try o.put("{\"results\":[],\"connect\":");
        try mywire.writeErr(o, e);
        try o.byte('}');
    }

    fn tracks(cn: *const Conn) bool {
        return cn.caps & mywire.cap.session_track != 0;
    }

    /// A packet of the login exchange.
    fn onAuthPacket(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const reply = mywire.loginReply(body, tracks(cn)) catch return c.dropConn(ci, invalid_msg);
        switch (reply) {
            .ok => |ok| c.loginDone(ci, ok.status),
            .err => c.loginRefused(ci, body),
            .switch_plugin => |s| {
                cn.plugin = mywire.pluginOf(s.plugin);
                cn.nonce = s.nonce;
                cn.key_wanted = false;
                if (cn.plugin == .other) return c.credentialEnd(ci, "sql: the server asks for a login method that the native client does not have");
                var answer: [32]u8 = @splat(0);
                c.sendAuth(ci, mywire.scramble(cn.plugin, c.credOf(cn).password(), cn.nonce, &answer));
            },
            .more => |data| c.onAuthData(ci, data),
        }
    }

    /// Data of `caching_sha2_password`: the fast login is done (3), the
    /// server wants the full login (4), or this is its RSA key.
    fn onAuthData(c: *Client, ci: u32, data: []const u8) void {
        const cn = &c.conns[ci];
        const pass = c.credOf(cn).password();
        if (cn.plugin != .caching_sha2) return c.dropConn(ci, invalid_msg);
        var buf: [cred_bytes + 1]u8 = @splat(0);
        defer @memset(&buf, 0);
        if (cn.key_wanted) {
            var sealed: [1024]u8 = @splat(0);
            const masked = mywire.maskPassword(pass, cn.nonce, &buf);
            const text = tls.rsaOaepEncrypt(data, masked, &sealed) orelse return c.credentialEnd(ci, "sql: the RSA key of the server cannot encrypt the password");
            cn.key_wanted = false;
            return c.sendAuth(ci, text);
        }
        if (data.len != 1 or (data[0] != 3 and data[0] != 4)) return c.dropConn(ci, invalid_msg);
        // 3: the OK packet follows.
        if (data[0] == 3) return;
        if (cn.session == null) {
            cn.key_wanted = true;
            return c.sendAuth(ci, &.{0x02});
        }
        // Over TLS the password goes as it is, with its zero byte.
        @memcpy(buf[0..pass.len], pass);
        c.sendAuth(ci, buf[0 .. pass.len + 1]);
    }

    fn sendAuth(c: *Client, ci: u32, data: []const u8) void {
        const cn = &c.conns[ci];
        var w: mywire.Writer = .{ .buf = cn.wbuf, .len = cn.wlen };
        w.packet(cn.seq +% 1, &.{data}) catch return c.dropConn(ci, closed_msg);
        cn.wlen = w.len;
        c.sendPending(ci);
    }

    fn loginDone(c: *Client, ci: u32, status: u16) void {
        const cn = &c.conns[ci];
        c.counters.connects += 1;
        cn.status = status;
        cn.state = .busy;
        if (cn.kill != none) return c.sendKill(ci);
        c.reqs[cn.req].state = .running;
        c.wheel.schedule(cn.req, c.reqs[cn.req].deadline_ms, c.now_ms);
        c.beginCall(ci);
    }

    // ---- bytes in and out ------------------------------------------------------

    fn sendPending(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        // Each pass writes bytes or ends: the buffer bounds the loop.
        for (0..cn.wbuf.len + 1) |_| {
            if (cn.wsent >= cn.wlen) break;
            switch (sql_net.ioWrite(cn.session, cn.fd, cn.wbuf[cn.wsent..cn.wlen])) {
                .n => |n| cn.wsent += n,
                .again, .want_write => return c.armWrite(ci),
                .closed => return c.dropConn(ci, closed_msg),
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
            if (cn.rlen == cn.rbuf.len) return c.dropConn(ci, closed_msg);
            switch (sql_net.ioRead(cn.session, cn.fd, cn.rbuf[cn.rlen..])) {
                .n => |n| c.onBytes(ci, n),
                .again => return,
                .want_write => return c.armWrite(ci),
                .closed => return c.dropConn(ci, closed_msg),
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
        if (cn.rlen > 0) c.consume(ci);
    }

    /// Handle every whole packet in the read buffer.
    fn consume(c: *Client, ci: u32) void {
        const gen = c.conns[ci].gen;
        var off: usize = 0;
        // Each packet has four bytes or more: the buffer bounds the loop.
        for (0..c.conns[ci].rbuf.len / 4 + 1) |_| {
            const cn = &c.conns[ci];
            const p = mywire.next(cn.rbuf[off..cn.rlen], cn.rbuf.len - 4) catch return c.onLargePacket(ci, off);
            const packet = p orelse break;
            cn.seq = packet.seq;
            c.handle(ci, packet);
            if (c.conns[ci].gen != gen) return;
            off += packet.size;
        }
        const cn = &c.conns[ci];
        std.debug.assert(off <= cn.rlen);
        std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - off], cn.rbuf[off..cn.rlen]);
        if (cn.rlen > 64 << 10 and cn.rlen - off < 4096) sys.releasePages(cn.rbuf[4096..cn.rlen]);
        cn.rlen -= off;
    }

    /// A row larger than the read buffer is larger than a result can be:
    /// its bytes are dropped and the call ends at the limit.
    fn onLargePacket(c: *Client, ci: u32, off: usize) void {
        const cn = &c.conns[ci];
        const in_rows = cn.state == .busy and cn.phase == .run and cn.step == .rows;
        if (!in_rows) return c.dropConn(ci, invalid_msg);
        const len: usize = std.mem.readInt(u24, cn.rbuf[off..][0..3], .little);
        std.debug.assert(len + 4 > cn.rlen - off);
        cn.skip = len + 4 - (cn.rlen - off);
        cn.rlen = 0;
        // A packet that is full continues in the next one.
        if (!cn.cont) setAbort(cn, .max_result);
        cn.cont = len == mywire.max_packet;
    }

    fn handle(c: *Client, ci: u32, p: mywire.Packet) void {
        const cn = &c.conns[ci];
        switch (cn.state) {
            .greeting => c.onGreeting(ci, p.body),
            .auth => c.onAuthPacket(ci, p.body),
            .busy => c.onBusyPacket(ci, p),
            // The server ends an idle session with an error packet.
            .idle => c.closeConn(ci),
            .free, .connecting, .handshaking => c.dropConn(ci, invalid_msg),
        }
    }

    fn onBusyPacket(c: *Client, ci: u32, p: mywire.Packet) void {
        const cn = &c.conns[ci];
        if (p.body.len == 0) return c.dropConn(ci, invalid_msg);
        const is_err = p.body[0] == 0xFF;
        switch (cn.phase) {
            .run => c.onRunPacket(ci, p),
            .reset => if (is_err) c.resetRefused(ci) else c.startCall(ci),
            .begin => c.onBeginAnswer(ci, p.body),
            .commit => {
                if (is_err) c.addError(ci, p.body) else c.noteOk(ci, p.body);
                if (c.conns[ci].state == .busy) c.completeCall(ci);
            },
            .rollback => {
                if (!is_err) c.noteOk(ci, p.body);
                if (c.conns[ci].state == .busy) c.afterRollback(ci);
            },
            .kill => c.closeConn(ci),
            .none => c.dropConn(ci, invalid_msg),
        }
    }

    // ---- a call ----------------------------------------------------------------

    /// The room of the result: the limit is `max_result`; the last bytes
    /// of the buffer are kept for the end of the document.
    fn resultOut(c: *const Client, r: *Req) mywire.Out {
        return .{ .buf = r.out[0..c.cfg.max_result], .len = r.out_len };
    }

    fn setAbort(cn: *Conn, a: Abort) void {
        std.debug.assert(a != .none);
        if (cn.abort == .none) cn.abort = a;
    }

    fn beginCall(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.state == .busy and r.state == .running and cn.wlen == 0);
        cn.abort = .none;
        cn.in_tx = false;
        cn.dirty = false;
        cn.cont = false;
        cn.cur = 0;
        cn.it = my_call.Statements.init(r.call.statements);
        @memcpy(r.out[0..12], "{\"results\":[");
        r.out_len = 12;
        if (!cn.used) return c.startCall(ci);
        // The session of an earlier call becomes new: no variable, temporary
        // table or open transaction of that call stays.
        var w: mywire.Writer = .{ .buf = cn.wbuf };
        w.packet(0, &.{&.{0x1f}}) catch return c.dropConn(ci, closed_msg);
        cn.wlen = w.len;
        cn.phase = .reset;
        c.sendPending(ci);
    }

    /// The server has no `COM_RESET_CONNECTION`: the call takes a new
    /// connection, and no connection of the pool takes a second call.
    fn resetRefused(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        const pool = cn.pool;
        c.pools[pool].sticky = true;
        c.closeConn(ci);
        for (c.conns, 0..) |*other, i| {
            if (other.state == .idle and other.pool == pool) c.closeConn(std.math.cast(u32, i).?);
        }
        c.reqs[ri].state = .queued;
        c.run(ri);
    }

    fn startCall(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        cn.used = true;
        if (c.reqs[cn.req].call.mode == .transaction) return c.sendText(ci, "START TRANSACTION", .begin);
        c.nextStatement(ci);
    }

    /// Send a statement of the client itself.
    fn sendText(c: *Client, ci: u32, text: []const u8, phase: Phase) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .busy and cn.wlen == 0);
        var w: mywire.Writer = .{ .buf = cn.wbuf };
        // The text fits the buffer.
        w.query(text) catch return c.dropConn(ci, closed_msg);
        cn.wlen = w.len;
        cn.phase = phase;
        c.sendPending(ci);
    }

    fn onBeginAnswer(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        if (body[0] == 0xFF) {
            // The failure is the only entry of the result.
            c.addError(ci, body);
            if (c.conns[ci].state == .busy) c.completeCall(ci);
            return;
        }
        c.noteOk(ci, body);
        if (c.conns[ci].state != .busy) return;
        cn.in_tx = true;
        c.nextStatement(ci);
    }

    /// Read the status of an OK packet that answers a statement of the client.
    fn noteOk(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const ok = mywire.okPacket(body, tracks(cn)) catch return c.dropConn(ci, invalid_msg);
        cn.status = ok.status;
    }

    /// Add `{"error":...}` of an ERR packet as one more entry of the result.
    fn addError(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const e = mywire.errPacket(body) catch return c.dropConn(ci, invalid_msg);
        var o = c.resultOut(r);
        writeFailure(&o, e, r.results > 0) catch return setAbort(cn, .max_result);
        r.out_len = o.len;
        r.results += 1;
    }

    fn writeFailure(o: *mywire.Out, e: mywire.Err, comma: bool) error{NoSpace}!void {
        if (comma) try o.byte(',');
        try o.put("{\"error\":");
        try mywire.writeErr(o, e);
        try o.byte('}');
    }

    fn groupFailed(r: *const Req, group: ?u32) bool {
        const g = group orelse return false;
        return std.mem.indexOfScalar(u32, r.failed_groups[0..r.nfailed], g) != null;
    }

    /// Send the next statement that runs, or end the call after the last one.
    fn nextStatement(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        // Each pass takes one statement.
        for (0..r.call.count + 1) |_| {
            if (cn.abort != .none) return c.limitReached(ci);
            if (cn.cur == r.call.count) return c.afterStatements(ci);
            const it = if (cn.it) |*p| p else return c.dropConn(ci, closed_msg);
            const st = it.next() orelse return c.dropConn(ci, closed_msg);
            cn.group = st.group;
            if (r.call.mode != .independently or !groupFailed(r, st.group)) return c.sendStatement(ci, st);
            // An earlier statement of the group failed: this one does not run.
            var o = c.resultOut(r);
            writeSkipped(&o, r.results > 0) catch {
                setAbort(cn, .max_result);
                continue;
            };
            r.out_len = o.len;
            r.results += 1;
            cn.cur += 1;
        }
    }

    fn writeSkipped(o: *mywire.Out, comma: bool) error{NoSpace}!void {
        if (comma) try o.byte(',');
        try o.put("{\"skipped\":true}");
    }

    fn sendStatement(c: *Client, ci: u32, st: my_call.Statement) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.wlen == 0 and cn.abort == .none);
        var text: creds.Out = .{ .buf = c.tmp };
        http.unescape(st.text, &text) catch return c.failCall(ci, "sql: the text of a statement is not a valid string");
        cn.reads = mywire.onlyReads(text.written(), cn.status & mywire.status.no_backslash == 0);
        var w: mywire.Writer = .{ .buf = cn.wbuf };
        w.query(text.written()) catch return c.failCall(ci, "sql: the text of a statement is larger than --sql-max-request-kb (limit)");
        var o = c.resultOut(r);
        openEntry(&o, r.results > 0) catch {
            // No room for the entry: the statement is not sent.
            setAbort(cn, .max_result);
            return c.limitReached(ci);
        };
        cn.entry_at = r.out_len;
        r.out_len = o.len;
        cn.wlen = w.len;
        cn.phase = .run;
        cn.step = .head;
        cn.sets = 0;
        cn.failed = false;
        c.sendPending(ci);
    }

    fn openEntry(o: *mywire.Out, comma: bool) error{NoSpace}!void {
        if (comma) try o.byte(',');
        try o.put("{\"sets\":[");
    }

    /// True when the answers of the statement that runs now go nowhere:
    /// its entry is an error, or the call is at a limit.
    fn skips(cn: *const Conn) bool {
        return cn.failed or cn.abort != .none;
    }

    /// A packet of the answer to a statement of the call.
    fn onRunPacket(c: *Client, ci: u32, p: mywire.Packet) void {
        const cn = &c.conns[ci];
        if (cn.cont) {
            cn.cont = p.more;
            return;
        }
        switch (cn.step) {
            .head => c.onHead(ci, p),
            .columns => {
                cn.desc.add(p.body, c.reqs[cn.req].call.options) catch |e| {
                    if (e == error.Malformed) return c.dropConn(ci, invalid_msg);
                    cn.desc.unsupported = true;
                };
                cn.cols_left -= 1;
                if (cn.cols_left == 0) cn.step = .columns_end;
            },
            .columns_end => {
                if (!mywire.isEof(p)) return c.dropConn(ci, invalid_msg);
                cn.desc.finish();
                cn.step = .rows;
                if (cn.desc.unsupported) setAbort(cn, .no_form);
                c.openSet(ci);
            },
            .rows => c.onRowPacket(ci, p),
            // The answer to the empty packet of the client.
            .infile => c.onHead(ci, p),
        }
    }

    /// The first packet of one result of the statement.
    fn onHead(c: *Client, ci: u32, p: mywire.Packet) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const head = mywire.resultHead(p.body, tracks(cn)) catch return c.dropConn(ci, invalid_msg);
        switch (head) {
            .ok => |ok| c.onOk(ci, ok),
            .err => |e| c.onStatementError(ci, e),
            .columns => |n| {
                if (cn.step == .infile) return c.dropConn(ci, invalid_msg);
                // A text that does not only read can have changed the database before these rows.
                if (!cn.in_tx and !cn.reads) r.committed = true;
                cn.cols_left = n;
                cn.desc.reset();
                cn.step = .columns;
            },
            .infile => |name| c.onInfile(ci, name),
        }
    }

    /// An OK packet: one result of the statement.
    fn onOk(c: *Client, ci: u32, ok: mywire.Ok) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (!cn.in_tx) r.committed = true;
        if (ok.status & status_state_changed != 0) cn.dirty = true;
        if (!skips(cn)) {
            var o = c.resultOut(r);
            writeOkSet(&o, ok, cn.sets > 0, r.call.options.big_strings) catch {
                // The result is over its limit: the call ends there.
                setAbort(cn, .max_result);
            };
            if (cn.abort == .none) r.out_len = o.len;
            cn.sets += 1;
        }
        c.afterResult(ci, ok.status);
    }

    fn writeOkSet(o: *mywire.Out, ok: mywire.Ok, comma: bool, big_strings: bool) error{NoSpace}!void {
        if (comma) try o.byte(',');
        try mywire.writeOk(o, ok, big_strings);
    }

    /// One result of the statement is complete: another one follows, or
    /// the statement is done.
    fn afterResult(c: *Client, ci: u32, status: u16) void {
        const cn = &c.conns[ci];
        cn.status = status;
        // A command with an implicit commit ended the transaction of the mode.
        if (cn.in_tx and status & mywire.status.in_trans == 0) c.reqs[cn.req].committed = true;
        if (status & mywire.status.more_results != 0) {
            cn.step = .head;
            return;
        }
        c.statementDone(ci);
    }

    /// A command of the text failed: the server drops the rest of the
    /// text. The entry of the statement is the error, as in mysql2.
    fn onStatementError(c: *Client, ci: u32, e: mywire.Err) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (!skips(cn)) {
            r.out_len = cn.entry_at;
            var o = c.resultOut(r);
            writeFailure(&o, e, r.results > 0) catch {
                // The result is over its limit: the call ends there.
                setAbort(cn, .max_result);
            };
            if (cn.abort == .none) r.out_len = o.len;
        }
        cn.failed = true;
        c.statementDone(ci);
    }

    /// `LOAD DATA LOCAL INFILE`: the client has no file. It sends an empty
    /// packet, and the entry of the statement is the error of mysql2.
    fn onInfile(c: *Client, ci: u32, name: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (cn.step == .infile) return c.dropConn(ci, invalid_msg);
        if (!skips(cn)) {
            r.out_len = cn.entry_at;
            var o = c.resultOut(r);
            writeInfile(&o, name, r.results > 0) catch {
                // The result is over its limit: the call ends there.
                setAbort(cn, .max_result);
            };
            if (cn.abort == .none) r.out_len = o.len;
        }
        cn.failed = true;
        cn.step = .infile;
        var w: mywire.Writer = .{ .buf = cn.wbuf, .len = cn.wlen };
        w.packet(cn.seq +% 1, &.{}) catch return c.dropConn(ci, closed_msg);
        cn.wlen = w.len;
        c.sendPending(ci);
    }

    fn writeInfile(o: *mywire.Out, name: []const u8, comma: bool) error{NoSpace}!void {
        if (comma) try o.byte(',');
        try o.put("{\"error\":{\"message\":\"As a result of LOCAL INFILE command server wants to read ");
        // The name goes inside the JSON string: without its quotes.
        const at = o.len;
        try o.string(name);
        std.mem.copyForwards(u8, o.buf[at .. o.len - 2], o.buf[at + 1 .. o.len - 1]);
        o.len -= 2;
        try o.put(" file, but as of v2.0 you must provide streamFactory option returning ReadStream.\"}}");
    }

    /// Open the set of a result set: its rows come next.
    fn openSet(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        cn.rows = 0;
        if (skips(cn)) return;
        var o = c.resultOut(r);
        if (cn.sets > 0) o.byte(',') catch return setAbort(cn, .max_result);
        o.put("{\"rows\":[") catch return setAbort(cn, .max_result);
        r.out_len = o.len;
    }

    /// A packet after the columns of a result set: a row, the end, or an error.
    fn onRowPacket(c: *Client, ci: u32, p: mywire.Packet) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        if (p.more) {
            // A value of 16 MB or more: the rest of the row is dropped.
            setAbort(cn, .max_result);
            cn.cont = true;
            return;
        }
        if (p.body[0] == 0xFF) {
            const e = mywire.errPacket(p.body) catch return c.dropConn(ci, invalid_msg);
            return c.onStatementError(ci, e);
        }
        if (mywire.isEof(p)) return c.closeSet(ci, p.body);
        if (skips(cn)) return;
        var o = c.resultOut(r);
        if (cn.rows > 0) o.byte(',') catch return setAbort(cn, .max_result);
        cn.desc.writeRow(&o, p.body, r.call.options) catch |err| switch (err) {
            error.NoSpace => return setAbort(cn, .max_result),
            error.Unsupported => return setAbort(cn, .no_form),
            error.Malformed => return c.dropConn(ci, invalid_msg),
        };
        r.out_len = o.len;
        cn.rows += 1;
    }

    /// The EOF packet after the rows: the set is complete.
    fn closeSet(c: *Client, ci: u32, body: []const u8) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        const status = mywire.eofStatus(body) catch return c.dropConn(ci, invalid_msg);
        if (!skips(cn)) {
            var o = c.resultOut(r);
            var nb: [48]u8 = @splat(0);
            // The count has ten digits at most: the text fits.
            const tail = std.fmt.bufPrint(&nb, "],\"command\":\"SELECT\",\"rowCount\":{d}}}", .{cn.rows}) catch "";
            o.put(tail) catch {
                // The result is over its limit: the call ends there.
                setAbort(cn, .max_result);
            };
            if (cn.abort == .none) r.out_len = o.len;
            cn.sets += 1;
        }
        c.afterResult(ci, status);
    }

    /// The server has answered the whole text of the statement.
    fn statementDone(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const r = &c.reqs[cn.req];
        std.debug.assert(cn.phase == .run);
        if (cn.abort != .none) return c.limitReached(ci);
        if (!cn.failed) {
            // The buffer has room for these bytes after `max_result`.
            @memcpy(r.out[r.out_len..][0..2], "]}");
            r.out_len += 2;
        }
        r.results += 1;
        cn.cur += 1;
        if (!cn.failed) return c.nextStatement(ci);
        switch (r.call.mode) {
            // The result ends with the first failure.
            .single => c.completeCall(ci),
            .transaction => c.sendText(ci, "ROLLBACK", .rollback),
            .independently => {
                if (cn.group) |g| {
                    r.failed_groups[r.nfailed] = g;
                    r.nfailed += 1;
                }
                c.nextStatement(ci);
            },
        }
    }

    fn afterStatements(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        if (cn.in_tx) return c.sendText(ci, "COMMIT", .commit);
        c.completeCall(ci);
    }

    /// The call is at a limit: the transaction of the mode is rolled back,
    /// then the call ends without a result.
    fn limitReached(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        std.debug.assert(cn.abort != .none);
        if (cn.in_tx and cn.status & mywire.status.in_trans != 0) return c.sendText(ci, "ROLLBACK", .rollback);
        c.endCall(ci);
    }

    fn afterRollback(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        cn.in_tx = false;
        if (cn.abort != .none) return c.endCall(ci);
        c.completeCall(ci);
    }

    fn completeCall(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        const ri = cn.req;
        const r = &c.reqs[ri];
        if (cn.abort != .none) return c.endCall(ci);
        // The buffer has room for these bytes after `max_result`.
        @memcpy(r.out[r.out_len..][0..2], "]}");
        r.out_len += 2;
        r.ok = true;
        c.releaseConn(ci);
        c.finishReq(ri);
    }

    /// End the call without a result, at a limit. The text has a marker
    /// when the call committed nothing: n8n then runs the node in the
    /// fallback host.
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

    /// End the call with a plain error. The connection closes: the server
    /// then rolls back what is open.
    fn failCall(c: *Client, ci: u32, comptime text: []const u8) void {
        const ri = c.conns[ci].req;
        c.quitConn(ci);
        c.failReq(ri, text, .{});
    }

    // ---- time limits and KILL QUERY ---------------------------------------------

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
        if (c.cfg.idle_ms == 0) {
            for (c.conns, 0..) |*cn, i| {
                if (cn.state == .idle) c.quitConn(std.math.cast(u32, i).?);
            }
        }
        // Kill conns are few: scan them linearly.
        for (c.conns, 0..) |*cn, i| {
            const ci = std.math.cast(u32, i).?;
            if (cn.state != .free and cn.kill != none and c.now_ms - c.kills[cn.kill].at_ms >= 5000) c.closeConn(ci);
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
            c.quitConn(ci);
        } else if (cn.state == .idle) {
            c.scheduleConnIdle(ci);
        }
    }

    fn timedOut(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        c.counters.timeouts += 1;
        const waited = r.state == .queued;
        if (r.conn != none) {
            const ci = r.conn;
            const kill = c.prepareKill(ci);
            c.closeConn(ci);
            if (kill) |k| c.openKill(k);
        }
        if (waited) return c.failReq(ri, "sql: no connection became free before the time limit of the call (limit)", .{});
        c.failReq(ri, "sql: no result before the time limit of the call; the statement was cancelled", .{});
    }

    fn connectTimedOut(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        c.counters.timeouts += 1;
        c.closeConn(r.conn);
        c.connectFail(ri, "connect ETIMEDOUT", "ETIMEDOUT");
    }

    const KillPlan = struct { slot: u32, addr: sys.Addr };

    /// Keep what a `KILL QUERY` for the statement of `ci` needs: the
    /// credential of the call, the id of the session and the address.
    /// Best effort: without a free slot the close of the connection is all
    /// that the server sees.
    fn prepareKill(c: *Client, ci: u32) ?KillPlan {
        const cn = &c.conns[ci];
        if (cn.state != .busy or cn.req == none or cn.addr_i == 0) return null;
        for (&c.kills, 0..) |*k, i| {
            if (k.used) continue;
            k.* = .{ .used = true, .cred = c.reqs[cn.req].cred, .thread_id = cn.thread_id, .at_ms = c.now_ms };
            return .{ .slot = std.math.cast(u32, i).?, .addr = cn.addrs.list[cn.addr_i - 1] };
        }
        return null;
    }

    /// Open a connection that logs in and sends `KILL QUERY`.
    fn openKill(c: *Client, plan: KillPlan) void {
        std.debug.assert(c.cfree.len > 0 and c.kills[plan.slot].used);
        const ci = c.cfree.pop().?;
        c.ncfree = c.cfree.len;
        const cn = &c.conns[ci];
        std.debug.assert(cn.state == .free);
        cn.state = .connecting;
        cn.kill = plan.slot;
        cn.addrs.n = 1;
        cn.addrs.list[0] = plan.addr;
        cn.addr_i = 0;
        c.counters.kills += 1;
        c.connectNext(ci);
    }

    fn sendKill(c: *Client, ci: u32) void {
        const cn = &c.conns[ci];
        var buf: [32]u8 = @splat(0);
        // The id has ten digits at most.
        const text = std.fmt.bufPrint(&buf, "KILL QUERY {d}", .{c.kills[cn.kill].thread_id}) catch return c.closeConn(ci);
        c.sendText(ci, text, .kill);
    }
};

/// Read the connection values of the slot into the call. The answer is
/// the text of an error, or null. The text never has a value of the
/// credential.
fn loadCredential(r: *Req, st: *const creds.Store) ?[]const u8 {
    const slot = st.slot(r.call.credential) orelse return "sql: the credential slot of the call is not in the credentials";
    if (slot.data != .object) return "sql: the credential of the call is not an object";
    const d = slot.data.object;
    const textOf = sql_net.textOf;
    if (sql_net.isOn(d.get("sshTunnel"))) return "sql: the credential uses an SSH tunnel (limit: sql-credential)";
    r.cred = .{ .tls = sql_net.isOn(d.get("ssl")) };
    const certs = sql_net.hasText(d.get("caCertificate")) or sql_net.hasText(d.get("clientCertificate")) or sql_net.hasText(d.get("clientPrivateKey"));
    if (r.cred.tls and certs) return "sql: the credential has a CA or client certificate (limit: sql-credential)";
    const host = textOf(d.get("host")) orelse "";
    const parts = [_][]const u8{
        if (host.len > 0) host else "localhost",
        textOf(d.get("user")) orelse "",
        textOf(d.get("database")) orelse "",
        textOf(d.get("password")) orelse "",
    };
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
    if (r.cred.host_len > dns.max_host) return "sql: the host of the credential is too long";
    const port = textOf(d.get("port")) orelse "";
    r.cred.port = std.fmt.parseInt(u16, if (port.len > 0) port else "3306", 10) catch return "sql: the port of the credential is not a port number";
    return null;
}

/// The key of the pool of a call: every value that makes a connection
/// differ. The password is in it only as a part of the digest.
fn poolKey(k: *const Cred) [32]u8 {
    return net_pool.poolKey(k.buf[0 .. @as(usize, k.host_len) + k.user_len + k.db_len + k.pass_len], &.{ k.host_len, k.user_len, k.db_len, k.pass_len, k.port, @intFromBool(k.tls) });
}
