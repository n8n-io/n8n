//! Floors 1 and 2: one HTTP/1.1 request and response over a kept-alive
//! loopback connection. A server thread answers; client threads keep one
//! request in flight on each connection. Each side's CPU comes from its
//! own thread clock, so the server number is the inbound floor and the
//! client number is the outbound floor.
//!
//! Modes:
//!   raw   one read and one write per request, no parsing (kernel and
//!         poller only);
//!   http  the same, plus a minimal HTTP/1.1 parser and formatter;
//!   tls   http over TLS 1.3 (OpenSSL, AES-128-GCM), read-ahead on.
const std = @import("std");
const c = std.c;
const cpu = @import("cpu.zig");
const poll = @import("poll.zig");
const tls = @import("tls.zig");
const builtin = @import("builtin");
const linux = std.os.linux;

/// `uring` and `uring_ms` are http over io_uring (Linux): one
/// io_uring_enter per loop for every send and recv; `uring_ms` also uses
/// multishot recv into a provided buffer ring.
pub const Mode = enum { raw, http, tls, uring, uring_ms };

pub const Opts = struct {
    mode: Mode = .raw,
    conns: u32 = 64,
    client_threads: u32 = 2,
    req_body: u32 = 1024,
    resp_body: u32 = 64,
    secs: u32 = 3,
    warm_ms: u32 = 500,
    /// Extra connections that stay open and idle, registered in the
    /// server's poller (cost of many idle descriptors).
    idle: u32 = 0,
    cert: [:0]const u8 = "",
    key: [:0]const u8 = "",
    release_buffers: bool = false,
    /// Requests per write on each connection (and responses per write).
    pipeline: u32 = 1,
};

/// Counts, and the thread CPU ns spent inside each kind of call (timed
/// with the thread clock, about 20 ns per reading).
const Counters = struct {
    done: u64 = 0,
    reads: u64 = 0,
    writes: u64 = 0,
    waits: u64 = 0,
    events: u64 = 0,
    read_ns: u64 = 0,
    write_ns: u64 = 0,
    wait_ns: u64 = 0,

    fn sub(a: Counters, b: Counters) Counters {
        var r: Counters = undefined;
        inline for (@typeInfo(Counters).@"struct".field_names) |f| @field(r, f) = @field(a, f) - @field(b, f);
        return r;
    }

    fn add(a: *Counters, b: Counters) void {
        inline for (@typeInfo(Counters).@"struct".field_names) |f| @field(a, f) += @field(b, f);
    }
};

const Side = struct {
    cur: Counters = .{},
    at_start: Counters = .{},
    at_end: Counters = .{},
    cpu_start: u64 = 0,
    cpu_end: u64 = 0,
    seen: u32 = 0,

    /// Returns true when the run is over.
    fn tick(s: *Side) bool {
        const p = phase.load(.acquire);
        if (p == s.seen) return false;
        s.seen = p;
        if (p == 1) {
            s.cpu_start = cpu.threadNs();
            s.at_start = s.cur;
            return false;
        }
        s.cpu_end = cpu.threadNs();
        s.at_end = s.cur;
        return true;
    }

    fn diff(s: *const Side) Counters {
        return s.at_end.sub(s.at_start);
    }
};

var phase = std.atomic.Value(u32).init(0);

const Conn = struct {
    fd: c_int,
    ssl: ?*tls.SSL = null,
    rbuf: []u8,
    rlen: usize = 0,
    wbuf: []u8,
    /// Client: responses still due for the last batch.
    outstanding: u32 = 0,
};

// ---- HTTP/1.1 ---------------------------------------------------------------

/// A complete request at the start of `buf`: its length, or null when more
/// bytes are needed. Reads the request line and every header, as a server
/// must; `content-length` gives the body.
pub fn parseRequest(buf: []const u8, route_hits: *u64) ?usize {
    const head = std.mem.indexOf(u8, buf, "\r\n\r\n") orelse return null;
    const line_end = std.mem.indexOfScalar(u8, buf[0..head], '\r') orelse head;
    const line = buf[0..line_end];
    const sp1 = std.mem.indexOfScalar(u8, line, ' ') orelse return null;
    const sp2 = std.mem.lastIndexOfScalar(u8, line, ' ') orelse return null;
    if (sp2 <= sp1 or !std.mem.eql(u8, line[sp2 + 1 ..], "HTTP/1.1")) return null;
    const hit = std.mem.eql(u8, line[0..sp1], "POST") and std.mem.eql(u8, line[sp1 + 1 .. sp2], "/w2");
    const body_len = headerLength(buf[line_end + 2 .. head]) orelse return null;
    const total = head + 4 + body_len;
    if (buf.len < total) return null;
    if (hit) route_hits.* += 1;
    return total;
}

/// Walk the header lines and return content-length (0 when absent).
fn headerLength(headers: []const u8) ?usize {
    var len: usize = 0;
    var it = std.mem.splitSequence(u8, headers, "\r\n");
    while (it.next()) |h| {
        const colon = std.mem.indexOfScalar(u8, h, ':') orelse continue;
        if (std.ascii.eqlIgnoreCase(h[0..colon], "content-length")) {
            const v = std.mem.trim(u8, h[colon + 1 ..], " ");
            len = std.fmt.parseInt(usize, v, 10) catch return null;
        }
    }
    return len;
}

/// A complete response at the start of `buf`: its length, or null.
pub fn parseResponse(buf: []const u8) ?usize {
    const head = std.mem.indexOf(u8, buf, "\r\n\r\n") orelse return null;
    if (buf.len < 12 or !std.mem.eql(u8, buf[0..9], "HTTP/1.1 ")) return null;
    _ = std.fmt.parseInt(u16, buf[9..12], 10) catch return null;
    const line_end = std.mem.indexOfScalar(u8, buf[0..head], '\r') orelse head;
    const body_len = headerLength(buf[line_end + 2 .. head]) orelse return null;
    const total = head + 4 + body_len;
    return if (buf.len >= total) total else null;
}

fn formatResponse(out: []u8, body: []const u8) usize {
    var w = std.Io.Writer.fixed(out);
    w.print("HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {d}\r\n\r\n", .{body.len}) catch unreachable; // out holds body + 256.
    w.writeAll(body) catch unreachable; // out holds body + 256.
    return w.buffered().len;
}

fn formatRequest(out: []u8, body: []const u8) usize {
    var w = std.Io.Writer.fixed(out);
    w.print("POST /w2 HTTP/1.1\r\nhost: api.example.com\r\nuser-agent: wfrt\r\naccept: application/json\r\nauthorization: Bearer 0123456789abcdef0123456789abcdef\r\ncontent-type: application/json\r\ncontent-length: {d}\r\n\r\n", .{body.len}) catch unreachable; // out holds body + 512.
    w.writeAll(body) catch unreachable; // out holds body + 512.
    return w.buffered().len;
}

fn fillJson(buf: []u8) void {
    std.debug.assert(buf.len >= 16);
    const prefix = "{\"id\":\"rec-1\",\"pad\":\"";
    @memcpy(buf[0..prefix.len], prefix);
    @memset(buf[prefix.len .. buf.len - 2], 'x');
    buf[buf.len - 2] = '"';
    buf[buf.len - 1] = '}';
}

// ---- server -----------------------------------------------------------------

const Shared = struct {
    opts: Opts,
    req_body: []const u8,
    resp_body: []const u8,
    raw_req: []const u8,
    raw_resp: []const u8,
};

fn ioRead(cn: *Conn, cnt: *Counters) poll.Io {
    const t = cpu.threadNs();
    defer cnt.read_ns += cpu.threadNs() - t;
    cnt.reads += 1;
    if (cn.ssl) |s| {
        const r = tls.SSL_read(s, cn.rbuf.ptr + cn.rlen, @intCast(cn.rbuf.len - cn.rlen));
        if (r > 0) return .{ .n = @intCast(r) };
        const e = tls.SSL_get_error(s, r);
        return if (e == tls.want_read or e == tls.want_write) .again else .closed;
    }
    return poll.readSome(cn.fd, cn.rbuf[cn.rlen..]);
}

fn ioWrite(cn: *Conn, buf: []const u8, cnt: *Counters) void {
    const t = cpu.threadNs();
    defer cnt.write_ns += cpu.threadNs() - t;
    if (cn.ssl) |s| {
        cnt.writes += 1;
        var off: usize = 0;
        while (off < buf.len) {
            const r = tls.SSL_write(s, buf.ptr + off, @intCast(buf.len - off));
            if (r > 0) off += @intCast(r);
        }
        return;
    }
    cnt.writes += poll.writeAll(cn.fd, buf);
}

fn serverLoop(sh: *const Shared, conns: []Conn, side: *Side) void {
    cpu.preferFastCore();
    cpu.pinFromEnv("FLOOR_SERVER_CPUS");
    var p = poll.Poller.init() catch return;
    for (conns, 0..) |cn, i| p.addRead(cn.fd, @intCast(i)) catch return;
    var toks: [1024]u32 = undefined;
    var hits: u64 = 0;
    while (true) {
        const tw = cpu.threadNs();
        const n = p.wait(&toks, 10);
        side.cur.wait_ns += cpu.threadNs() - tw;
        side.cur.waits += 1;
        side.cur.events += n;
        if (side.tick()) break;
        for (toks[0..n]) |t| {
            const cn = &conns[t];
            while (true) {
                switch (ioRead(cn, &side.cur)) {
                    .n => |k| cn.rlen += k,
                    .again, .closed => break,
                }
                var wlen: usize = 0;
                var off: usize = 0;
                while (true) {
                    const rest = cn.rbuf[off..cn.rlen];
                    const used = switch (sh.opts.mode) {
                        .raw => if (rest.len >= sh.raw_req.len) sh.raw_req.len else null,
                        .http, .tls, .uring, .uring_ms => parseRequest(rest, &hits),
                    } orelse break;
                    wlen += switch (sh.opts.mode) {
                        .raw => blk: {
                            @memcpy(cn.wbuf[wlen..][0..sh.raw_resp.len], sh.raw_resp);
                            break :blk sh.raw_resp.len;
                        },
                        .http, .tls, .uring, .uring_ms => formatResponse(cn.wbuf[wlen..], sh.resp_body),
                    };
                    side.cur.done += 1;
                    off += used;
                }
                if (off > 0) {
                    std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - off], cn.rbuf[off..cn.rlen]);
                    cn.rlen -= off;
                }
                if (wlen > 0) ioWrite(cn, cn.wbuf[0..wlen], &side.cur);
                // Plain sockets: one read per readiness event. TLS: drain
                // what OpenSSL has buffered (read-ahead), it has no event.
                if (cn.ssl == null or tls.SSL_has_pending(cn.ssl.?) == 0) break;
            }
        }
    }
    std.mem.doNotOptimizeAway(hits);
}

fn clientLoop(sh: *const Shared, conns: []Conn, base: u32, side: *Side) void {
    cpu.preferFastCore();
    cpu.pinFromEnv("FLOOR_CLIENT_CPUS");
    var p = poll.Poller.init() catch return;
    for (conns, 0..) |*cn, i| {
        p.addRead(cn.fd, @intCast(i)) catch return;
        sendRequest(sh, cn, &side.cur);
    }
    _ = base;
    var toks: [1024]u32 = undefined;
    while (true) {
        const tw = cpu.threadNs();
        const n = p.wait(&toks, 10);
        side.cur.wait_ns += cpu.threadNs() - tw;
        side.cur.waits += 1;
        side.cur.events += n;
        if (side.tick()) break;
        for (toks[0..n]) |t| {
            const cn = &conns[t];
            while (true) {
                switch (ioRead(cn, &side.cur)) {
                    .n => |k| cn.rlen += k,
                    .again, .closed => break,
                }
                // Take every whole response; when the batch is complete,
                // send the next batch of `pipeline` requests in one write.
                var off: usize = 0;
                while (true) {
                    const rest = cn.rbuf[off..cn.rlen];
                    const u = switch (sh.opts.mode) {
                        .raw => if (rest.len >= sh.raw_resp.len) sh.raw_resp.len else null,
                        .http, .tls, .uring, .uring_ms => parseResponse(rest),
                    } orelse break;
                    off += u;
                    side.cur.done += 1;
                    cn.outstanding -= 1;
                }
                if (off > 0) {
                    std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - off], cn.rbuf[off..cn.rlen]);
                    cn.rlen -= off;
                }
                if (cn.outstanding == 0) sendRequest(sh, cn, &side.cur);
                if (cn.ssl == null or tls.SSL_has_pending(cn.ssl.?) == 0) break;
            }
        }
    }
}

/// Send the next `pipeline` requests in one write (pipelined HTTP/1.1,
/// a stand-in for many HTTP/2 streams in one write).
fn sendRequest(sh: *const Shared, cn: *Conn, cnt: *Counters) void {
    var n: usize = 0;
    for (0..sh.opts.pipeline) |_| n += switch (sh.opts.mode) {
        .raw => blk: {
            @memcpy(cn.wbuf[n..][0..sh.raw_req.len], sh.raw_req);
            break :blk sh.raw_req.len;
        },
        .http, .tls, .uring, .uring_ms => formatRequest(cn.wbuf[n..], sh.req_body),
    };
    cn.outstanding = sh.opts.pipeline;
    ioWrite(cn, cn.wbuf[0..n], cnt);
}

// ---- io_uring (Linux) ----------------------------------------------------------

const send_bit: u64 = 1 << 40;
const timer_bit: u64 = 1 << 41;

/// Server (`server` true) or client side over io_uring. Each loop makes one
/// io_uring_enter: it submits every queued send and recv and waits for at
/// least one completion. `reads` counts recv completions and `waits`
/// counts io_uring_enter calls; the time inside the call is `wait_ns`.
fn uringLoop(sh: *const Shared, conns: []Conn, side: *Side, server: bool) void {
    if (builtin.os.tag != .linux) return;
    uringInner(sh, conns, side, server) catch |e| std.debug.print("uring: {s}\n", .{@errorName(e)});
}

fn uringInner(sh: *const Shared, conns: []Conn, side: *Side, server: bool) !void {
    cpu.preferFastCore();
    cpu.pinFromEnv(if (server) "FLOOR_SERVER_CPUS" else "FLOOR_CLIENT_CPUS");
    const multishot = sh.opts.mode == .uring_ms;
    var ring = try linux.IoUring.init(4096, linux.IORING_SETUP_SINGLE_ISSUER | linux.IORING_SETUP_DEFER_TASKRUN);
    defer ring.deinit();
    var bg: linux.IoUring.BufferGroup = undefined;
    if (multishot) bg = try linux.IoUring.BufferGroup.init(&ring, std.heap.page_allocator, 1, 16 << 10, 1024);
    for (conns, 0..) |*cn, i| {
        if (multishot) _ = try bg.recv_multishot(i, cn.fd, 0) else _ = try ring.recv(i, cn.fd, .{ .buffer = cn.rbuf[cn.rlen..] }, 0);
        if (!server) {
            const n = formatRequest(cn.wbuf, sh.req_body);
            _ = try ring.send(i | send_bit, cn.fd, cn.wbuf[0..n], 0);
        }
    }
    // A 10 ms timeout keeps the loop turning when no connection moves, so
    // the phase change is always seen.
    const tick_ts: linux.kernel_timespec = .{ .sec = 0, .nsec = 10_000_000 };
    _ = try ring.timeout(timer_bit, &tick_ts, 0, 0);
    var cqes: [1024]linux.io_uring_cqe = undefined;
    var hits: u64 = 0;
    while (true) {
        const tw = cpu.threadNs();
        _ = ring.submit_and_wait(1) catch |e| switch (e) {
            error.SignalInterrupt => 0,
            else => return e,
        };
        const n = try ring.copy_cqes(&cqes, 0);
        side.cur.wait_ns += cpu.threadNs() - tw;
        side.cur.waits += 1;
        side.cur.events += n;
        if (side.tick()) break;
        for (cqes[0..n]) |cqe| {
            if (cqe.user_data & timer_bit != 0) {
                _ = try ring.timeout(timer_bit, &tick_ts, 0, 0);
                continue;
            }
            const i: usize = @intCast(cqe.user_data & 0xFFFF_FFFF);
            const cn = &conns[i];
            if (cqe.user_data & send_bit != 0) {
                side.cur.writes += 1;
                continue;
            }
            if (cqe.res <= 0) {
                // A multishot recv that ended (no buffer left, or an
                // error) is armed again; a plain recv is too.
                if (cqe.flags & linux.IORING_CQE_F_MORE == 0) {
                    if (multishot) _ = try bg.recv_multishot(i, cn.fd, 0) else _ = try ring.recv(i, cn.fd, .{ .buffer = cn.rbuf[cn.rlen..] }, 0);
                }
                continue;
            }
            side.cur.reads += 1;
            if (multishot) {
                const data = try bg.get(cqe);
                @memcpy(cn.rbuf[cn.rlen..][0..data.len], data);
                cn.rlen += data.len;
                try bg.put(cqe);
                if (cqe.flags & linux.IORING_CQE_F_MORE == 0) _ = try bg.recv_multishot(i, cn.fd, 0);
            } else {
                cn.rlen += @intCast(cqe.res);
            }
            var wlen: usize = 0;
            while (true) {
                const used = (if (server) parseRequest(cn.rbuf[0..cn.rlen], &hits) else parseResponse(cn.rbuf[0..cn.rlen])) orelse break;
                side.cur.done += 1;
                std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - used], cn.rbuf[used..cn.rlen]);
                cn.rlen -= used;
                wlen += if (server) formatResponse(cn.wbuf[wlen..], sh.resp_body) else formatRequest(cn.wbuf[wlen..], sh.req_body);
            }
            if (wlen > 0) _ = try ring.send(i | send_bit, cn.fd, cn.wbuf[0..wlen], 0);
            if (!multishot) _ = try ring.recv(i, cn.fd, .{ .buffer = cn.rbuf[cn.rlen..] }, 0);
        }
    }
    std.mem.doNotOptimizeAway(hits);
}

// ---- setup and report ---------------------------------------------------------

pub const Result = struct {
    server_ns_per_req: f64,
    client_ns_per_req: f64,
    reqs: u64,
    rate_wall: f64,
    server: Counters,
    client: Counters,
    handshake_client_us: f64 = 0,
    handshake_server_us: f64 = 0,
    tls_client_bytes: f64 = 0,
    tls_server_bytes: f64 = 0,
};

pub fn run(gpa: std.mem.Allocator, opts: Opts) !Result {
    std.debug.assert(opts.conns > 0 and opts.client_threads > 0);
    phase.store(0, .release);
    const req_body = try gpa.alloc(u8, opts.req_body);
    fillJson(req_body);
    const resp_body = try gpa.alloc(u8, opts.resp_body);
    fillJson(resp_body);
    const raw_req = try gpa.alloc(u8, opts.req_body + 512);
    const raw_resp = try gpa.alloc(u8, opts.resp_body + 256);
    const sh: Shared = .{
        .opts = opts,
        .req_body = req_body,
        .resp_body = resp_body,
        .raw_req = raw_req[0..formatRequest(raw_req, req_body)],
        .raw_resp = raw_resp[0..formatResponse(raw_resp, resp_body)],
    };
    const bufsz = (@max(opts.req_body, opts.resp_body) + 512) * 2 * opts.pipeline + 4096;
    const total = opts.conns + opts.idle;
    const server = try gpa.alloc(Conn, total);
    const client = try gpa.alloc(Conn, total);
    // Several listeners, so idle connections do not run out of ephemeral
    // ports (about 16k per destination port on macOS).
    const nlisten = total / 12_000 + 1;
    const ls = try gpa.alloc(@TypeOf(try poll.listenLoopback()), nlisten);
    for (ls) |*l| l.* = try poll.listenLoopback();
    for (0..total) |i| {
        const l = ls[i % nlisten];
        const fds = try poll.pair(l.fd, l.port);
        const active = i < opts.conns;
        client[i] = .{ .fd = fds[0], .rbuf = if (active) try gpa.alloc(u8, bufsz) else &.{}, .wbuf = if (active) try gpa.alloc(u8, bufsz) else &.{} };
        server[i] = .{ .fd = fds[1], .rbuf = if (active) try gpa.alloc(u8, bufsz) else &.{}, .wbuf = if (active) try gpa.alloc(u8, bufsz) else &.{} };
    }
    var res: Result = undefined;
    res.handshake_client_us = 0;
    res.handshake_server_us = 0;
    res.tls_client_bytes = 0;
    res.tls_server_bytes = 0;
    if (opts.mode == .tls) {
        const cctx = try tls.clientCtx();
        const sctx = try tls.serverCtx(opts.cert.ptr, opts.key.ptr);
        const live0 = .{ tls.live[0].load(.monotonic), tls.live[1].load(.monotonic) };
        var c_ns: u64 = 0;
        var s_ns: u64 = 0;
        for (client[0..opts.conns], server[0..opts.conns]) |*cc, *ss| {
            tls.side = 0;
            cc.ssl = try tls.newConn(cctx, cc.fd, false, opts.release_buffers);
            tls.side = 1;
            ss.ssl = try tls.newConn(sctx, ss.fd, true, opts.release_buffers);
            var cdone = false;
            var sdone = false;
            var spins: u32 = 0;
            while (!(cdone and sdone)) : (spins += 1) {
                if (spins > 1_000_000) return error.Handshake;
                if (!cdone) {
                    tls.side = 0;
                    const t = cpu.threadNs();
                    cdone = tls.SSL_do_handshake(cc.ssl.?) == 1;
                    c_ns += cpu.threadNs() - t;
                }
                if (!sdone) {
                    tls.side = 1;
                    const t = cpu.threadNs();
                    sdone = tls.SSL_do_handshake(ss.ssl.?) == 1;
                    s_ns += cpu.threadNs() - t;
                }
            }
        }
        tls.side = 0;
        const n: f64 = @floatFromInt(opts.conns);
        res.handshake_client_us = @as(f64, @floatFromInt(c_ns)) / n / 1000;
        res.handshake_server_us = @as(f64, @floatFromInt(s_ns)) / n / 1000;
        res.tls_client_bytes = @as(f64, @floatFromInt(tls.live[0].load(.monotonic) - live0[0])) / n;
        res.tls_server_bytes = @as(f64, @floatFromInt(tls.live[1].load(.monotonic) - live0[1])) / n;
    }
    var sside: Side = .{};
    const csides = try gpa.alloc(Side, opts.client_threads);
    for (csides) |*s| s.* = .{};
    const is_uring = opts.mode == .uring or opts.mode == .uring_ms;
    if (is_uring and builtin.os.tag != .linux) return error.UringNeedsLinux;
    const st = if (is_uring) try std.Thread.spawn(.{}, uringLoop, .{ &sh, server, &sside, true }) else try std.Thread.spawn(.{}, serverLoop, .{ &sh, server, &sside });
    // Idle server connections are registered too: they share the poller.
    _ = st;
    const per = opts.conns / opts.client_threads;
    const cts = try gpa.alloc(std.Thread, opts.client_threads);
    for (cts, 0..) |*t, k| {
        const lo = k * per;
        const hi = if (k + 1 == opts.client_threads) opts.conns else lo + per;
        t.* = if (is_uring) try std.Thread.spawn(.{}, uringLoop, .{ &sh, client[lo..hi], &csides[k], false }) else try std.Thread.spawn(.{}, clientLoop, .{ &sh, client[lo..hi], @as(u32, @intCast(lo)), &csides[k] });
    }
    cpu.sleepNs(@as(u64, opts.warm_ms) * 1_000_000);
    const w0 = cpu.monoNs();
    phase.store(1, .release);
    cpu.sleepNs(@as(u64, opts.secs) * 1_000_000_000);
    phase.store(2, .release);
    const wall = cpu.monoNs() - w0;
    for (cts) |t| t.join();
    // The server thread ends on its next wakeup (at most 10 ms).
    cpu.sleepNs(50_000_000);
    if (opts.mode == .tls) {
        // After traffic: the steady per-connection memory, buffers included.
        const n: f64 = @floatFromInt(opts.conns);
        res.tls_client_bytes = @max(res.tls_client_bytes, @as(f64, @floatFromInt(tls.live[0].load(.monotonic))) / n);
    }
    const sd = sside.diff();
    var cd: Counters = .{};
    var c_cpu: u64 = 0;
    for (csides) |*s| {
        cd.add(s.diff());
        c_cpu += s.cpu_end - s.cpu_start;
    }
    res.reqs = sd.done;
    res.server = sd;
    res.client = cd;
    res.server_ns_per_req = @as(f64, @floatFromInt(sside.cpu_end - sside.cpu_start)) / @as(f64, @floatFromInt(@max(sd.done, 1)));
    res.client_ns_per_req = @as(f64, @floatFromInt(c_cpu)) / @as(f64, @floatFromInt(@max(cd.done, 1)));
    res.rate_wall = @as(f64, @floatFromInt(sd.done)) / (@as(f64, @floatFromInt(wall)) / 1e9);
    for (server) |cn| _ = c.close(cn.fd);
    for (client) |cn| _ = c.close(cn.fd);
    return res;
}

test "parse request and response" {
    var hits: u64 = 0;
    const req = "POST /w2 HTTP/1.1\r\nhost: x\r\nContent-Length: 2\r\n\r\n{}";
    try std.testing.expectEqual(@as(?usize, req.len), parseRequest(req, &hits));
    try std.testing.expectEqual(@as(?usize, null), parseRequest(req[0 .. req.len - 1], &hits));
    try std.testing.expectEqual(@as(u64, 1), hits);
    var buf: [512]u8 = undefined;
    const n = formatResponse(&buf, "{\"a\":1}");
    try std.testing.expectEqual(@as(?usize, n), parseResponse(buf[0..n]));
}

// ---- both ends on one thread ----------------------------------------------------

pub const InlineResult = struct { reqs: u64, client_write_ns: f64, server_read_ns: f64, server_write_ns: f64, client_read_ns: f64, retries: u64 };

/// The TCP stack alone: one thread plays client and server on `conns`
/// loopback pairs, so no thread ever sleeps or wakes another. Per request:
/// client write, server read, server write, client read (raw bytes).
pub fn runInline(gpa: std.mem.Allocator, opts: Opts) !InlineResult {
    std.debug.assert(opts.conns > 0);
    cpu.pinFromEnv("FLOOR_SERVER_CPUS");
    const req = try gpa.alloc(u8, opts.req_body + 512);
    const resp = try gpa.alloc(u8, opts.resp_body + 256);
    const body = try gpa.alloc(u8, @max(opts.req_body, opts.resp_body));
    fillJson(body);
    const rq = req[0..formatRequest(req, body[0..opts.req_body])];
    const rs = resp[0..formatResponse(resp, body[0..opts.resp_body])];
    const l = try poll.listenLoopback();
    const pairs = try gpa.alloc([2]c_int, opts.conns);
    for (pairs) |*p| p.* = try poll.pair(l.fd, l.port);
    var buf: [64 << 10]u8 = undefined;
    var ns: [4]u64 = @splat(0);
    var reqs: u64 = 0;
    var retries: u64 = 0;
    const deadline = cpu.monoNs() + @as(u64, opts.secs) * 1_000_000_000;
    while (cpu.monoNs() < deadline) {
        for (pairs) |p| {
            var t = cpu.threadNs();
            _ = poll.writeAll(p[0], rq);
            var t2 = cpu.threadNs();
            ns[0] += t2 - t;
            var got: usize = 0;
            while (got < rq.len) : (retries += 1) switch (poll.readSome(p[1], buf[0 .. rq.len - got])) {
                .n => |k| got += k,
                else => {},
            };
            t = cpu.threadNs();
            ns[1] += t - t2;
            _ = poll.writeAll(p[1], rs);
            t2 = cpu.threadNs();
            ns[2] += t2 - t;
            got = 0;
            while (got < rs.len) : (retries += 1) switch (poll.readSome(p[0], buf[0 .. rs.len - got])) {
                .n => |k| got += k,
                else => {},
            };
            ns[3] += cpu.threadNs() - t2;
            reqs += 1;
        }
    }
    for (pairs) |p| {
        _ = c.close(p[0]);
        _ = c.close(p[1]);
    }
    const n: f64 = @floatFromInt(@max(reqs, 1));
    return .{
        .reqs = reqs,
        .client_write_ns = @as(f64, @floatFromInt(ns[0])) / n,
        .server_read_ns = @as(f64, @floatFromInt(ns[1])) / n,
        .server_write_ns = @as(f64, @floatFromInt(ns[2])) / n,
        .client_read_ns = @as(f64, @floatFromInt(ns[3])) / n,
        .retries = retries - 2 * reqs,
    };
}
