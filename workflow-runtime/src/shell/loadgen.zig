//! Benchmark helpers: a keep-alive HTTP load generator and a stub service
//! that answers after a fixed delay. Both use the same poller as the server.
const std = @import("std");
const sys = @import("sys.zig");

/// Set by main: the only place that names a global allocator.
pub var backing: std.mem.Allocator = undefined;
const http = @import("http.zig");
const http2 = @import("http2.zig");
const hpack = @import("hpack.zig");
const tls = @import("tls.zig");

pub const LoadOptions = struct {
    /// The IPv4 address of the server; another machine in a two-machine benchmark.
    host: [4]u8 = .{ 127, 0, 0, 1 },
    port: u16 = 8080,
    conns: u32 = 64,
    seconds: u32 = 5,
    path: []const u8 = "/w2",
    body_bytes: u32 = 1024,
    threads: u32 = 1,
    /// Requests per second in total; 0 sends as fast as responses return.
    rate: u32 = 0,
    /// Requests each connection keeps in flight (HTTP/1.1 pipelining), so
    /// tens of thousands can be in flight without as many sockets.
    pipeline: u32 = 1,
};

pub const LoadResult = struct {
    ok: u64 = 0,
    /// Every request that did not get a 200 or a 429: `bad_status`, plus
    /// the requests in flight on connections that closed or did not
    /// connect (`closed_conns`), plus responses that did not parse.
    errors: u64 = 0,
    status_429: u64 = 0,
    closed_conns: u64 = 0,
    bad_status: u64 = 0,
    last_bad_status: u32 = 0,
    /// Latency histogram in 10-microsecond buckets up to 1 s.
    hist: [100_000]u32 = @splat(0),
};

const max_pipeline = 256;

const LConn = struct {
    fd: c_int = -1,
    rbuf: [16 << 10]u8 = undefined,
    rlen: usize = 0,
    sent_ns: u64 = 0,
    next_ns: u64 = 0,
    waiting: bool = false,
    connected: bool = false,
    /// Send times of the requests in flight, oldest first (a ring).
    times: [max_pipeline]u64 = undefined,
    t_head: u32 = 0,
    t_len: u32 = 0,

    fn push(cn: *LConn, t: u64) void {
        cn.times[(cn.t_head + cn.t_len) % max_pipeline] = t;
        cn.t_len += 1;
    }

    fn pop(cn: *LConn) u64 {
        if (cn.t_len == 0) return cn.sent_ns;
        const t = cn.times[cn.t_head];
        cn.t_head = (cn.t_head + 1) % max_pipeline;
        cn.t_len -= 1;
        return t;
    }
};

fn loadThread(opts: LoadOptions, nconns: u32, res: *LoadResult, req: []const u8) void {
    loadThreadInner(opts, nconns, res, req) catch |e| std.debug.print("load thread: {s}\n", .{@errorName(e)});
}

fn loadThreadInner(opts: LoadOptions, nconns: u32, res: *LoadResult, req: []const u8) !void {
    var poller = try sys.Poller.init();
    defer poller.deinit();
    const conns = try backing.alloc(LConn, nconns);
    defer backing.free(conns);
    for (conns, 0..) |*cn, i| {
        cn.* = .{};
        cn.fd = try sys.connectTcp(opts.host, opts.port);
        try poller.addRead(cn.fd, i);
        try poller.wantWrite(cn.fd, i | (1 << 40));
    }
    const end = sys.nowNs() + @as(u64, opts.seconds) * 1_000_000_000;
    var ready: [1024]sys.Ready = undefined;
    // Paced mode: each connection sends one request per interval.
    const interval_ns: u64 = if (opts.rate > 0) @as(u64, opts.conns) * 1_000_000_000 / opts.rate else 0;
    while (sys.nowNs() < end) {
        const n = poller.wait(&ready, if (interval_ns > 0) 1 else 50);
        const depth = std.math.clamp(opts.pipeline, 1, max_pipeline);
        if (interval_ns > 0) {
            const t = sys.nowNs();
            for (conns) |*cn| {
                if (!cn.waiting or t < cn.next_ns) continue;
                cn.waiting = false;
                cn.sent_ns = t;
                cn.push(t);
                _ = sys.writeSome(cn.fd, req);
            }
        }
        for (ready[0..n]) |ev| {
            const i: usize = @intCast(ev.token & 0xFFFFFFFF);
            const cn = &conns[i];
            if (cn.fd < 0) continue;
            if (ev.writable and !cn.connected) {
                if (sys.socketError(cn.fd) != 0) {
                    dropConn(&poller, cn, res);
                    continue;
                }
                // Connected: send the first requests.
                cn.connected = true;
                poller.doneWrite(cn.fd, i);
                cn.sent_ns = sys.nowNs();
                var k: u32 = 0;
                while (k < depth) : (k += 1) {
                    cn.push(cn.sent_ns);
                    _ = sys.writeSome(cn.fd, req);
                }
                continue;
            }
            if (!ev.readable) continue;
            switch (sys.readSome(cn.fd, cn.rbuf[cn.rlen..])) {
                .n => |k| cn.rlen += k,
                .again => continue,
                .closed => {
                    dropConn(&poller, cn, res);
                    continue;
                },
            }
            while (true) {
                const resp = (http.parseResponse(cn.rbuf[0..cn.rlen]) catch {
                    res.errors += 1;
                    cn.rlen = 0;
                    break;
                }) orelse break;
                const now = sys.nowNs();
                const sent = cn.pop();
                const us10 = @min((now - sent) / 10_000, res.hist.len - 1);
                res.hist[us10] += 1;
                if (resp.status == 200) res.ok += 1 else if (resp.status == 429) res.status_429 += 1 else {
                    res.errors += 1;
                    res.bad_status += 1;
                    res.last_bad_status = resp.status;
                }
                std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - resp.consumed], cn.rbuf[resp.consumed..cn.rlen]);
                cn.rlen -= resp.consumed;
                if (interval_ns > 0) {
                    cn.next_ns = cn.sent_ns + interval_ns;
                    cn.waiting = true;
                    break;
                }
                cn.sent_ns = now;
                cn.push(now);
                _ = sys.writeSome(cn.fd, req);
            }
        }
    }
    for (conns) |cn| if (cn.fd >= 0) sys.close(cn.fd);
}

/// A connection that closed or did not connect: counted once, with its
/// requests in flight as errors. Before, a closed socket stayed in the
/// level-triggered poller and counted one error on every poll.
fn dropConn(poller: *sys.Poller, cn: *LConn, res: *LoadResult) void {
    std.debug.assert(cn.fd >= 0);
    res.closed_conns += 1;
    res.errors += @max(cn.t_len, 1);
    poller.remove(cn.fd);
    sys.close(cn.fd);
    cn.fd = -1;
    cn.t_len = 0;
}

/// A JSON body of exactly `body.len` bytes: `{"id":"…","pad":"xxxx…"}`, or
/// `{   }` when that does not fit, or spaces below two bytes.
fn fillBody(body: []u8) void {
    const prefix = "{\"id\":\"order-1\",\"pad\":\"";
    if (body.len >= prefix.len + 2) {
        @memcpy(body[0..prefix.len], prefix);
        @memset(body[prefix.len .. body.len - 2], 'x');
        body[body.len - 2] = '"';
        body[body.len - 1] = '}';
    } else if (body.len >= 2) {
        @memset(body, ' ');
        body[0] = '{';
        body[body.len - 1] = '}';
    } else {
        @memset(body, ' ');
    }
}

test "regression: load bodies of any size, also below the padded form (no panic)" {
    var buf: [64]u8 = undefined;
    for (0..buf.len) |n| {
        fillBody(buf[0..n]);
        if (n >= 2) {
            const parsed = try std.json.parseFromSlice(std.json.Value, std.testing.allocator, buf[0..n], .{});
            parsed.deinit();
        }
    }
}

pub fn runLoad(gpa: std.mem.Allocator, out: *std.Io.Writer, opts: LoadOptions) !void {
    const body = try gpa.alloc(u8, opts.body_bytes);
    defer gpa.free(body);
    fillBody(body);
    const req = try std.fmt.allocPrint(gpa, "POST {s} HTTP/1.1\r\nhost: bench\r\ncontent-type: application/json\r\ncontent-length: {d}\r\n\r\n{s}", .{ opts.path, body.len, body });
    defer gpa.free(req);
    const results = try gpa.alloc(LoadResult, opts.threads);
    defer gpa.free(results);
    const threads = try gpa.alloc(std.Thread, opts.threads);
    defer gpa.free(threads);
    for (results) |*r| r.* = .{};
    for (threads, 0..) |*t, i| t.* = try std.Thread.spawn(.{}, loadThread, .{ opts, opts.conns / opts.threads, &results[i], req });
    for (threads) |t| t.join();
    var total: LoadResult = .{};
    for (results) |r| {
        total.ok += r.ok;
        total.errors += r.errors;
        total.status_429 += r.status_429;
        total.closed_conns += r.closed_conns;
        total.bad_status += r.bad_status;
        if (r.last_bad_status != 0) total.last_bad_status = r.last_bad_status;
        for (r.hist, 0..) |h, i| total.hist[i] += h;
    }
    const secs: f64 = @floatFromInt(opts.seconds);
    try out.print("requests ok={d} 429={d} errors={d} rate={d:.0}/s p50={d}us p99={d}us p999={d}us closed_conns={d} bad_status={d} last_bad_status={d}\n", .{
        total.ok,                     total.status_429,              total.errors,                   @as(f64, @floatFromInt(total.ok + total.status_429)) / secs,
        percentile(&total.hist, 0.5), percentile(&total.hist, 0.99), percentile(&total.hist, 0.999), total.closed_conns,
        total.bad_status,             total.last_bad_status,
    });
}

fn percentile(hist: []const u32, p: f64) u64 {
    var n: u64 = 0;
    for (hist) |h| n += h;
    const target: u64 = @intFromFloat(@as(f64, @floatFromInt(n)) * p);
    var acc: u64 = 0;
    for (hist, 0..) |h, i| {
        acc += h;
        if (acc >= target and n > 0) return i * 10;
    }
    return 0;
}

// ---- stub service -----------------------------------------------------------

pub const StubOptions = struct {
    port: u16 = 9090,
    delay_ms: u32 = 0,
    /// With both set, the stub speaks TLS (for W3 over https).
    tls_cert: ?[:0]const u8 = null,
    tls_key: ?[:0]const u8 = null,
    /// Answer HTTP/2: ALPN `h2` over TLS, prior knowledge without TLS (a
    /// connection that starts with the preface). HTTP/1.1 still works.
    h2: bool = false,
    /// SETTINGS_MAX_CONCURRENT_STREAMS of the stub.
    h2_streams: u32 = 256,
};

const stub_body = "{\"ok\":true}";
const stub_resp = "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 11\r\n\r\n" ++ stub_body;

/// The HTTP/2 side of one stub connection. Benchmark code: it allocates
/// from `backing` per connection, which the runtime itself never does.
const StubH2 = struct {
    reader: http2.Reader,
    dec: hpack.Decoder,
    preface_left: u32 = http2.preface.len,
    out: std.ArrayList(u8) = .empty,
    sent: usize = 0,
    /// Streams whose request ended, to answer.
    ended: std.ArrayList(u32) = .empty,
    failed: bool = false,
    pub const Err = error{OutOfMemory};

    fn create(streams: u32) !*StubH2 {
        const h = try backing.create(StubH2);
        h.* = .{
            .reader = http2.Reader.init(try backing.alloc(u8, 64 << 10), http2.default_max_frame),
            .dec = hpack.Decoder.init(try backing.alloc(u8, 4096), try backing.alloc(hpack.Entry, hpack.entriesFor(4096)), try backing.alloc(u8, 16 << 10)),
        };
        var b: [64]u8 = undefined;
        var n: usize = 0;
        try http2.writeSettings(&b, &n, &.{.{ .max_concurrent_streams, streams }});
        try h.out.appendSlice(backing, b[0..n]);
        return h;
    }

    fn destroy(h: *StubH2) void {
        backing.free(h.reader.block);
        backing.free(h.dec.ring);
        backing.free(h.dec.ents);
        backing.free(h.dec.scratch);
        h.out.deinit(backing);
        h.ended.deinit(backing);
        backing.destroy(h);
    }

    fn feed(h: *StubH2, in: []const u8) void {
        var b = in;
        if (h.preface_left > 0) {
            const n = @min(b.len, h.preface_left);
            const at = http2.preface.len - h.preface_left;
            if (!std.mem.eql(u8, b[0..n], http2.preface[at..][0..n])) {
                h.failed = true;
                return;
            }
            h.preface_left -= @intCast(n);
            b = b[n..];
        }
        h.reader.feed(b, h) catch {
            h.failed = true;
        };
    }

    fn respond(h: *StubH2, sid: u32) !void {
        var b: [128]u8 = undefined;
        var n: usize = 9;
        try hpack.encodeField(&b, &n, ":status", "200", false);
        try hpack.encodeField(&b, &n, "content-type", "application/json", false);
        try hpack.encodeField(&b, &n, "content-length", "11", false);
        var len: usize = 0;
        try http2.frameHeaderBlock(&b, &len, sid, n - 9, http2.default_max_frame, false);
        try http2.writeDataHeader(&b, &len, sid, stub_body.len, true);
        @memcpy(b[len..][0..stub_body.len], stub_body);
        len += stub_body.len;
        try h.out.appendSlice(backing, b[0..len]);
    }

    pub fn onDataStart(_: *StubH2, _: u32, _: u32, _: bool) Err!void {}
    pub fn onData(_: *StubH2, _: u32, _: []const u8) Err!void {}
    pub fn onDataEnd(h: *StubH2, sid: u32, end_stream: bool) Err!void {
        if (end_stream) try h.ended.append(backing, sid);
    }
    pub fn onHeaders(h: *StubH2, sid: u32, block: []const u8, end_stream: bool) Err!void {
        var d: Discard = .{};
        h.dec.decode(block, &d) catch {
            h.failed = true;
            return;
        };
        if (end_stream) try h.ended.append(backing, sid);
    }
    pub fn onRst(_: *StubH2, _: u32, _: http2.ErrorCode) Err!void {}
    pub fn onSetting(_: *StubH2, _: u16, _: u32) Err!void {}
    pub fn onSettingsEnd(h: *StubH2, ack: bool) Err!void {
        if (ack) return;
        var b: [16]u8 = undefined;
        var n: usize = 0;
        http2.writeSettingsAck(&b, &n) catch unreachable;
        try h.out.appendSlice(backing, b[0..n]);
    }
    pub fn onPing(h: *StubH2, data: [8]u8, ack: bool) Err!void {
        if (ack) return;
        var b: [32]u8 = undefined;
        var n: usize = 0;
        http2.writePing(&b, &n, data, true) catch unreachable;
        try h.out.appendSlice(backing, b[0..n]);
    }
    pub fn onGoaway(_: *StubH2, _: u32, _: http2.ErrorCode) Err!void {}
    pub fn onWindowUpdate(_: *StubH2, _: u32, _: u32) Err!void {}

    const Discard = struct {
        pub const Err = error{};
        pub fn field(_: *Discard, _: []const u8, _: []const u8) Discard.Err!void {}
    };
};

const StubConn = struct {
    fd: c_int = -1,
    buf: [4096]u8 = undefined,
    len: usize = 0,
    session: ?tls.Session = null,
    shaking: bool = false,
    /// Set once the first bytes (or ALPN) say which protocol it speaks.
    h2: ?*StubH2 = null,
    decided: bool = false,
    gen: u32 = 0,
};

pub fn runStub(o: StubOptions) !void {
    const delay_ms = o.delay_ms;
    var ctx: ?tls.Context = null;
    if (o.tls_cert != null and o.tls_key != null) {
        ctx = try tls.Context.server(o.tls_cert.?, o.tls_key.?);
        if (o.h2) ctx.?.serverAlpnH2();
    }
    var poller = try sys.Poller.init();
    const lfd = try sys.listenTcp(.{ 127, 0, 0, 1 }, o.port, false);
    try poller.addRead(lfd, 0xFFFF_FFFF);
    const max = 65536;
    const conns = try backing.alloc(StubConn, max);
    for (conns) |*c| c.* = .{};
    // Responses wait in a FIFO: every request has the same delay.
    const Due = struct { at: u64, fd: c_int, gen: u32, sid: u32 };
    var queue: std.ArrayList(Due) = .empty;
    var head: usize = 0;
    var ready: [1024]sys.Ready = undefined;
    // Connections with HTTP/2 output to write after this round.
    var dirty: std.ArrayList(c_int) = .empty;
    std.debug.print("stub listening on {d}, delay {d} ms{s}{s}\n", .{ o.port, delay_ms, if (ctx != null) ", TLS" else "", if (o.h2) ", h2" else "" });
    while (true) {
        const n = poller.wait(&ready, if (delay_ms > 0) 1 else 50);
        for (ready[0..n]) |ev| {
            if (ev.token == 0xFFFF_FFFF) {
                while (sys.acceptOne(lfd)) |fd| {
                    const i: usize = @intCast(fd);
                    if (i >= max) {
                        sys.close(fd);
                        continue;
                    }
                    const c = &conns[i];
                    const gen = c.gen +% 1;
                    c.* = .{ .fd = fd, .gen = gen };
                    if (ctx) |cx| {
                        c.session = tls.Session.accept(cx, fd) catch null;
                        c.shaking = true;
                    }
                    try poller.addRead(fd, @intCast(fd));
                }
                continue;
            }
            const fd: c_int = @intCast(ev.token);
            const i: usize = @intCast(fd);
            const c = &conns[i];
            if (c.fd < 0) continue;
            if (c.shaking) {
                switch (c.session.?.handshake()) {
                    .n => {
                        c.shaking = false;
                        if (o.h2 and c.session.?.alpnH2()) {
                            c.h2 = try StubH2.create(o.h2_streams);
                            try dirty.append(backing, fd);
                        }
                        c.decided = true;
                    },
                    .want_read => continue,
                    .want_write => {
                        poller.wantWrite(fd, @intCast(fd)) catch {};
                        continue;
                    },
                    .closed, .failed => {
                        stubClose(c);
                        continue;
                    },
                }
            }
            if (ev.writable and c.h2 != null) try dirty.append(backing, fd);
            var closed = false;
            var guard: u32 = 0;
            while (guard < 64) : (guard += 1) {
                const got: sys.IoResult = if (c.session) |ss| switch (ss.read(c.buf[c.len..])) {
                    .n => |k| .{ .n = k },
                    .want_read, .want_write => .again,
                    .closed, .failed => .closed,
                } else sys.readSome(fd, c.buf[c.len..]);
                switch (got) {
                    .n => |k| c.len += k,
                    .again => break,
                    .closed => {
                        closed = true;
                        break;
                    },
                }
                if (!c.decided and c.len > 0) {
                    // Prior knowledge: the first byte of the preface.
                    c.decided = true;
                    if (o.h2 and c.buf[0] == 'P') {
                        c.h2 = try StubH2.create(o.h2_streams);
                        try dirty.append(backing, fd);
                    }
                }
                if (c.h2) |h| {
                    h.feed(c.buf[0..c.len]);
                    c.len = 0;
                    if (h.failed) {
                        closed = true;
                        break;
                    }
                    for (h.ended.items) |sid| {
                        if (delay_ms == 0) try h.respond(sid) else try queue.append(backing, .{ .at = sys.nowNs() + @as(u64, delay_ms) * 1_000_000, .fd = fd, .gen = c.gen, .sid = sid });
                    }
                    if (h.ended.items.len > 0 and delay_ms == 0) try dirty.append(backing, fd);
                    h.ended.clearRetainingCapacity();
                    continue;
                }
                if (c.session == null or c.len == c.buf.len) break;
            }
            if (closed) {
                stubClose(c);
                continue;
            }
            if (c.h2 != null) continue;
            while (http.parseRequest(c.buf[0..c.len], 4096) catch null) |req| {
                std.mem.copyForwards(u8, c.buf[0 .. c.len - req.consumed], c.buf[req.consumed..c.len]);
                c.len -= req.consumed;
                if (delay_ms == 0) {
                    stubSend(fd, c.session, stub_resp);
                } else {
                    try queue.append(backing, .{ .at = sys.nowNs() + @as(u64, delay_ms) * 1_000_000, .fd = fd, .gen = c.gen, .sid = 0 });
                }
            }
        }
        const now = sys.nowNs();
        while (head < queue.items.len and queue.items[head].at <= now) : (head += 1) {
            const d = queue.items[head];
            const c = &conns[@intCast(d.fd)];
            if (c.fd < 0 or c.gen != d.gen) continue;
            if (c.h2) |h| {
                try h.respond(d.sid);
                try dirty.append(backing, d.fd);
            } else {
                stubSend(d.fd, c.session, stub_resp);
            }
        }
        if (head > 4096 and head == queue.items.len) {
            queue.clearRetainingCapacity();
            head = 0;
        }
        for (dirty.items) |fd| {
            const c = &conns[@intCast(fd)];
            if (c.fd < 0) continue;
            const h = c.h2 orelse continue;
            var guard: u32 = 0;
            while (h.sent < h.out.items.len and guard < 1024) : (guard += 1) {
                const rest = h.out.items[h.sent..];
                const w: sys.IoResult = if (c.session) |ss| switch (ss.write(rest)) {
                    .n => |k| .{ .n = k },
                    .want_read, .want_write => .again,
                    .closed, .failed => .closed,
                } else sys.writeSome(fd, rest);
                switch (w) {
                    .n => |k| h.sent += k,
                    .again => {
                        poller.wantWrite(fd, @intCast(fd)) catch {};
                        break;
                    },
                    .closed => break,
                }
            }
            if (h.sent == h.out.items.len) {
                h.out.clearRetainingCapacity();
                h.sent = 0;
            }
        }
        dirty.clearRetainingCapacity();
    }
}

fn stubSend(fd: c_int, session: ?tls.Session, bytes: []const u8) void {
    if (session) |s| {
        _ = s.write(bytes);
    } else {
        _ = sys.writeSome(fd, bytes);
    }
}

fn stubClose(c: *StubConn) void {
    if (c.session) |s| s.deinit();
    c.session = null;
    c.shaking = false;
    if (c.h2) |h| h.destroy();
    c.h2 = null;
    sys.close(c.fd);
    c.fd = -1;
}

fn acceptAndClose(lfd: c_int, n: u32) void {
    var got: u32 = 0;
    var tries: u32 = 0;
    while (got < n and tries < 2000) : (tries += 1) {
        if (sys.acceptOne(lfd)) |fd| {
            sys.close(fd);
            got += 1;
        } else sys.sleepMs(1);
    }
}

test "regression: a connection that the server closes counts once, with its requests in flight" {
    // A closed socket stayed in the level-triggered poller and counted one
    // error on every poll: a few closed connections showed as 100k errors.
    const lfd = try sys.listenTcp(.{ 127, 0, 0, 1 }, 0, false);
    defer sys.close(lfd);
    var sa: std.c.sockaddr.in = undefined;
    var sl: std.c.socklen_t = @sizeOf(std.c.sockaddr.in);
    try std.testing.expectEqual(@as(c_int, 0), std.c.getsockname(lfd, @ptrCast(&sa), &sl));
    const port = std.mem.bigToNative(u16, sa.port);
    const t = try std.Thread.spawn(.{}, acceptAndClose, .{ lfd, 2 });
    backing = std.testing.allocator;
    const res = try std.testing.allocator.create(LoadResult);
    defer std.testing.allocator.destroy(res);
    res.* = .{};
    try loadThreadInner(.{ .port = port, .seconds = 1, .conns = 2, .pipeline = 4 }, 2, res, "POST / HTTP/1.1\r\ncontent-length: 0\r\n\r\n");
    t.join();
    try std.testing.expectEqual(@as(u64, 2), res.closed_conns);
    try std.testing.expect(res.errors >= 2 and res.errors <= 2 * 4);
    try std.testing.expectEqual(@as(u64, 0), res.ok);
}
