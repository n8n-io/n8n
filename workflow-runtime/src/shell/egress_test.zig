//! Tests of the egress client against a local TLS server.
const std = @import("std");
const sys = @import("sys.zig");
const tls = @import("tls.zig");
const egress = @import("egress.zig");

const cert_pem = @embedFile("testdata/tls-test-cert.pem");
const key_pem = @embedFile("testdata/tls-test-key.pem");

const kind_conn: u8 = 3;
const kind_dns: u8 = 5;

/// A TLS server for one connection: after the handshake it sends `n`
/// responses at once, before it reads any request, then reads until the
/// client closes or `stop` is set.
const Server = struct {
    lfd: c_int,
    n: u32,
    ctx: tls.Context,
    stop: std.atomic.Value(bool) = .init(false),
    failed: bool = false,

    fn nap() void {
        var ts: std.c.timespec = .{ .sec = 0, .nsec = 1_000_000 };
        _ = std.c.nanosleep(&ts, null);
    }

    fn run(s: *Server) void {
        s.serve() catch {
            s.failed = true;
        };
    }

    fn serve(s: *Server) !void {
        var waited: u32 = 0;
        const fd = while (waited < 10_000) : (waited += 1) {
            if (sys.acceptOne(s.lfd)) |fd| break fd;
            if (s.stop.load(.acquire)) return;
            nap();
        } else return error.NoClient;
        defer sys.close(fd);
        const sess = try tls.Session.accept(s.ctx, fd);
        defer sess.deinit();
        var tries: u32 = 0;
        while (tries < 10_000) : (tries += 1) {
            switch (sess.handshake()) {
                .n => break,
                .want_read, .want_write => nap(),
                else => return error.Handshake,
            }
        }
        // One TLS record for each response: a client read returns exactly
        // one response, and the next one is already decrypted and waiting.
        const one = "HTTP/1.1 200 OK\r\ncontent-length: 2\r\ncontent-type: text/plain\r\n\r\nok";
        var left = s.n;
        while (left > 0) {
            switch (sess.write(one)) {
                .n => |w| {
                    if (w != one.len) return error.ShortWrite;
                    left -= 1;
                },
                .want_read, .want_write => {
                    // Drain requests so the client can keep sending.
                    var sink: [4096]u8 = undefined;
                    _ = sess.read(&sink);
                    nap();
                },
                else => return error.Write,
            }
        }
        var sink: [16384]u8 = undefined;
        while (!s.stop.load(.acquire)) {
            switch (sess.read(&sink)) {
                .n => {},
                .want_read, .want_write => nap(),
                else => return,
            }
        }
    }
};

const Results = struct {
    ok: u32 = 0,
    err: u32 = 0,

    fn done(ctx: *anyopaque, exec_id: u64, seq: u32, r: egress.Result) void {
        _ = exec_id;
        _ = seq;
        const self: *Results = @ptrCast(@alignCast(ctx));
        switch (r) {
            .ok => |resp| {
                if (resp.status == 200 and std.mem.eql(u8, resp.body, "ok")) self.ok += 1 else self.err += 1;
            },
            .err => |msg| {
                std.debug.print("egress error: {s}\n", .{msg});
                self.err += 1;
            },
        }
    }
};

fn writeFile(dir: []const u8, name: []const u8, data: []const u8, buf: *[512]u8) ![*:0]const u8 {
    const path = try std.fmt.bufPrintSentinel(buf, "{s}/{s}", .{ dir, name }, 0);
    const fd = std.c.open(path, .{ .ACCMODE = .WRONLY, .CREAT = true, .TRUNC = true }, @as(std.c.mode_t, 0o600));
    if (fd < 0) return error.Open;
    defer _ = std.c.close(fd);
    if (std.c.write(fd, data.ptr, data.len) != data.len) return error.Write;
    return path.ptr;
}

test "regression: pipelined TLS responses are read without recursion" {
    if (!tls.enabled) return error.SkipZigTest;
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();

    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();
    var dir_buf: [256]u8 = undefined;
    const dir = try std.fmt.bufPrint(&dir_buf, ".zig-cache/tmp/{s}", .{tmp.sub_path});
    var cb: [512]u8 = undefined;
    var kb: [512]u8 = undefined;
    const cert = try writeFile(dir, "cert.pem", cert_pem, &cb);
    const key = try writeFile(dir, "key.pem", key_pem, &kb);

    // A free port near a base that depends on the process.
    var port: u16 = 0;
    var lfd: c_int = -1;
    var p: u16 = 31000 + @as(u16, @intCast(@mod(std.c.getpid(), 2000)));
    while (p < 34000) : (p += 1) {
        lfd = sys.listenTcp(.{ 127, 0, 0, 1 }, p, false) catch continue;
        port = p;
        break;
    }
    try std.testing.expect(lfd >= 0);
    defer sys.close(lfd);

    const n: u32 = 400;
    var server: Server = .{ .lfd = lfd, .n = n, .ctx = try tls.Context.server(cert, key) };
    defer server.ctx.deinit();
    const th = try std.Thread.spawn(.{}, Server.run, .{&server});
    defer th.join();
    defer server.stop.store(true, .release);

    var poller = try sys.Poller.init();
    defer poller.deinit();
    var results: Results = .{};
    const client = try a.create(egress.Client);
    // One connection: every request waits for the one before it, so the
    // responses the server sent ahead are read one after another.
    try client.init(a, .{ .max_conns = 1, .max_reqs = n + 1, .big_slots = 1, .max_body = 1 << 16, .insecure_tls = true }, .{ .ctx = &results, .done = Results.done }, &poller, kind_conn, kind_dns);
    var args_buf: [128]u8 = undefined;
    const args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"https://127.0.0.1:{d}/x\",\"method\":\"GET\"}}", .{port});
    for (0..n) |i| client.start(i + 1, 0, args, null, null, 0, 0, sys.nowMs());

    var ready: [64]sys.Ready = undefined;
    const deadline = sys.nowMs() + 20_000;
    while (results.ok + results.err < n and sys.nowMs() < deadline) {
        const k = poller.wait(&ready, 5);
        for (ready[0..k]) |ev| {
            const kind: u8 = @intCast(ev.token >> 56);
            const idx: u32 = @truncate(ev.token);
            const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
            if (kind == kind_conn) client.onConn(idx, gen, ev, sys.nowMs()) else client.onDns(@intCast(idx), ev);
        }
        client.afterEvents(sys.nowMs());
    }
    try std.testing.expect(!server.failed);
    try std.testing.expectEqual(n, results.ok);
    try std.testing.expectEqual(@as(u32, 0), results.err);
    // Each read starts from the event loop, never from inside another read.
    try std.testing.expectEqual(@as(u32, 1), client.max_read_depth);
}

/// A plain HTTP server for one request: it reads the head and the body,
/// checks the body, and answers 200 "ok" (or 400).
const PlainServer = struct {
    lfd: c_int,
    want_len: usize,
    stop: std.atomic.Value(bool) = .init(false),
    got_len: usize = 0,
    body_ok: bool = false,

    fn run(s: *PlainServer) void {
        s.serve() catch {};
    }

    fn serve(s: *PlainServer) !void {
        var waited: u32 = 0;
        const fd = while (waited < 10_000) : (waited += 1) {
            if (sys.acceptOne(s.lfd)) |fd| break fd;
            if (s.stop.load(.acquire)) return;
            Server.nap();
        } else return error.NoClient;
        defer sys.close(fd);
        var buf: [256 << 10]u8 = undefined;
        var n: usize = 0;
        var tries: u32 = 0;
        while (tries < 20_000 and !s.stop.load(.acquire)) : (tries += 1) {
            switch (sys.readSome(fd, buf[n..])) {
                .n => |k| n += k,
                .again => Server.nap(),
                .closed => return,
            }
            const end = std.mem.indexOf(u8, buf[0..n], "\r\n\r\n") orelse continue;
            if (n - end - 4 < s.want_len) continue;
            const body = buf[end + 4 .. n];
            s.got_len = body.len;
            s.body_ok = body.len == s.want_len and std.mem.indexOfNone(u8, body, "a") == null;
            const resp = if (s.body_ok) "HTTP/1.1 200 OK\r\ncontent-length: 2\r\n\r\nok" else "HTTP/1.1 400 Bad\r\ncontent-length: 2\r\n\r\nno";
            _ = sys.writeSome(fd, resp);
            break;
        }
        while (!s.stop.load(.acquire)) Server.nap();
    }
};

test "a request body larger than the connection buffer goes out whole (head and body in one write)" {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    var port: u16 = 0;
    var lfd: c_int = -1;
    var p: u16 = 34000 + @as(u16, @intCast(@mod(std.c.getpid(), 2000)));
    while (p < 37000) : (p += 1) {
        lfd = sys.listenTcp(.{ 127, 0, 0, 1 }, p, false) catch continue;
        port = p;
        break;
    }
    try std.testing.expect(lfd >= 0);
    defer sys.close(lfd);
    const body_len = 100_000;
    var server: PlainServer = .{ .lfd = lfd, .want_len = body_len };
    const th = try std.Thread.spawn(.{}, PlainServer.run, .{&server});
    defer th.join();
    defer server.stop.store(true, .release);

    var poller = try sys.Poller.init();
    defer poller.deinit();
    var results: Results = .{};
    const client = try a.create(egress.Client);
    try client.init(a, .{ .max_conns = 1, .max_reqs = 2, .big_slots = 1, .max_body = 1 << 18 }, .{ .ctx = &results, .done = Results.done }, &poller, kind_conn, kind_dns);
    const filler = try a.alloc(u8, body_len);
    @memset(filler, 'a');
    const args = try std.fmt.allocPrint(a, "{{\"url\":\"http://127.0.0.1:{d}/x\",\"method\":\"POST\",\"body\":\"{s}\"}}", .{ port, filler });
    client.start(1, 0, args, null, null, 0, 0, sys.nowMs());
    var ready: [64]sys.Ready = undefined;
    const deadline = sys.nowMs() + 20_000;
    while (results.ok + results.err < 1 and sys.nowMs() < deadline) {
        const k = poller.wait(&ready, 5);
        for (ready[0..k]) |ev| {
            const idx: u32 = @truncate(ev.token);
            const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
            if (@as(u8, @intCast(ev.token >> 56)) == kind_conn) client.onConn(idx, gen, ev, sys.nowMs()) else client.onDns(@intCast(idx), ev);
        }
        client.afterEvents(sys.nowMs());
    }
    try std.testing.expectEqual(@as(usize, body_len), server.got_len);
    try std.testing.expect(server.body_ok);
    try std.testing.expectEqual(@as(u32, 1), results.ok);
    client.deinit();
}

// ---- HTTP/2 and origin limits -------------------------------------------------------

const http2 = @import("http2.zig");
const hpack = @import("hpack.zig");

fn freePort(base: u16) !struct { port: u16, lfd: c_int } {
    var p: u16 = base + @as(u16, @intCast(@mod(std.c.getpid(), 2000)));
    const end = p + 3000;
    while (p < end) : (p += 1) {
        const lfd = sys.listenTcp(.{ 127, 0, 0, 1 }, p, false) catch continue;
        return .{ .port = p, .lfd = lfd };
    }
    return error.NoPort;
}

/// Drive a client until `want` results arrived or 20 s passed.
fn drive(client: *egress.Client, poller: *sys.Poller, results: anytype, want: u32) void {
    var ready: [64]sys.Ready = undefined;
    const deadline = sys.nowMs() + 20_000;
    while (results.ok + results.err < want and sys.nowMs() < deadline) {
        const k = poller.wait(&ready, 2);
        for (ready[0..k]) |ev| {
            const idx: u32 = @truncate(ev.token);
            const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
            if (@as(u8, @intCast(ev.token >> 56)) == kind_conn) client.onConn(idx, gen, ev, sys.nowMs()) else client.onDns(@intCast(idx), ev);
        }
        client.afterEvents(sys.nowMs());
    }
}

/// An h2c server (prior knowledge) for one connection. It allows 2
/// streams at once, answers each request with its path as the body
/// (`/big` with 200 000 bytes, sent as the client's windows allow), and
/// records the most streams it saw open at once.
const H2Server = struct {
    lfd: c_int,
    stop: std.atomic.Value(bool) = .init(false),
    failed: ?[]const u8 = null,
    answered: u32 = 0,
    max_open: u32 = 0,
    refused: u32 = 0,
    streams: u32 = 2,
    seed: u64 = 0,
    conn: Conn = undefined,
    list_mem: [16 << 10]u8 = undefined,
    block: [64 << 10]u8 = undefined,
    ring: [4096]u8 = undefined,
    ents: [hpack.entriesFor(4096)]hpack.Entry = undefined,
    scratch: [8192]u8 = undefined,

    const big_len = 200_000;
    /// A small answer echoes the request path: a token unique to the request.
    const Pending = struct { sid: u32, body_len: u32, sent: u32 = 0, headers_sent: bool = false, window: i64, path: [32]u8 = undefined };

    const Conn = struct {
        fd: c_int,
        reader: http2.Reader,
        dec: hpack.Decoder,
        open: std.ArrayList(Pending) = .empty,
        out: [1 << 16]u8 = undefined,
        out_len: usize = 0,
        conn_window: i64 = http2.default_window,
        client_initial: i64 = http2.default_window,
        acks: u32 = 0,
        pending_paths: [64]struct { sid: u32, big: bool } = undefined,
        npaths: u32 = 0,
        gpa: std.mem.Allocator,
        refused: u32 = 0,
        limit: u32 = 2,
        /// With a seed: streams refused at random and answered in random order.
        rng: ?std.Random.DefaultPrng = null,
        rst_out: [16]u8 = undefined,
        pub const Err = error{OutOfMemory};

        pub fn onDataStart(_: *Conn, _: u32, _: u32, _: bool) Err!void {}
        pub fn onData(_: *Conn, _: u32, _: []const u8) Err!void {}
        pub fn onDataEnd(_: *Conn, _: u32, _: bool) Err!void {}
        pub fn onHeaders(cn: *Conn, sid: u32, block: []const u8, end_stream: bool) Err!void {
            const Path = struct {
                big: bool = false,
                buf: [32]u8 = undefined,
                len: usize = 0,
                pub const Err = error{};
                pub fn field(p: *@This(), name: []const u8, value: []const u8) @This().Err!void {
                    if (!std.mem.eql(u8, name, ":path")) return;
                    if (std.mem.eql(u8, value, "/big")) p.big = true;
                    p.len = @min(value.len, p.buf.len);
                    @memcpy(p.buf[0..p.len], value[0..p.len]);
                }
            };
            var p: Path = .{};
            cn.dec.decode(block, &p) catch return error.OutOfMemory;
            std.debug.assert(end_stream);
            // Over the limit: refused, as servers do; the client sends it again.
            const unlucky = if (cn.rng) |*r| r.random().uintLessThan(u32, 8) == 0 else false;
            if (cn.open.items.len >= cn.limit or unlucky) {
                cn.refused += 1;
                var rl: usize = 0;
                http2.writeRst(&cn.rst_out, &rl, sid, .refused_stream) catch unreachable;
                H2Server.writeAll(cn.fd, cn.rst_out[0..rl]) catch {};
                return;
            }
            var pend: Pending = .{ .sid = sid, .body_len = if (p.big) big_len else @intCast(p.len), .window = cn.client_initial };
            @memcpy(pend.path[0..p.len], p.buf[0..p.len]);
            try cn.open.append(cn.gpa, pend);
        }
        pub fn onRst(_: *Conn, _: u32, _: http2.ErrorCode) Err!void {}
        pub fn onSetting(cn: *Conn, id: u16, v: u32) Err!void {
            if (id == 4) {
                const delta = @as(i64, v) - cn.client_initial;
                cn.client_initial = v;
                for (cn.open.items) |*p| p.window += delta;
            }
        }
        pub fn onSettingsEnd(cn: *Conn, ack: bool) Err!void {
            if (!ack) cn.acks += 1;
        }
        pub fn onPing(_: *Conn, _: [8]u8, _: bool) Err!void {}
        pub fn onGoaway(_: *Conn, _: u32, _: http2.ErrorCode) Err!void {}
        pub fn onWindowUpdate(cn: *Conn, sid: u32, inc: u32) Err!void {
            if (sid == 0) {
                cn.conn_window += inc;
                return;
            }
            for (cn.open.items) |*p| if (p.sid == sid) {
                p.window += inc;
            };
        }
    };

    fn run(s: *H2Server) void {
        s.serve() catch |e| {
            s.failed = @errorName(e);
        };
    }

    fn writeAll(fd: c_int, bytes: []const u8) !void {
        var off: usize = 0;
        var tries: u32 = 0;
        while (off < bytes.len and tries < 100_000) : (tries += 1) {
            switch (sys.writeSome(fd, bytes[off..])) {
                .n => |k| off += k,
                .again => Server.nap(),
                .closed => return error.Closed,
            }
        }
    }

    fn serve(s: *H2Server) !void {
        var waited: u32 = 0;
        const fd = while (waited < 10_000) : (waited += 1) {
            if (sys.acceptOne(s.lfd)) |fd| break fd;
            if (s.stop.load(.acquire)) return;
            Server.nap();
        } else return error.NoClient;
        defer sys.close(fd);
        // The connection state lives in the server struct (it is large for a
        // thread stack); the stream list grows in a fixed buffer.
        var fba = std.heap.FixedBufferAllocator.init(&s.list_mem);
        const gpa = fba.allocator();
        const cn = &s.conn;
        cn.* = .{ .fd = fd, .reader = http2.Reader.init(&s.block, http2.default_max_frame), .dec = hpack.Decoder.init(&s.ring, &s.ents, &s.scratch), .gpa = gpa };
        defer cn.open.deinit(gpa);
        // Our SETTINGS: 2 streams at once.
        var len: usize = 0;
        cn.limit = s.streams;
        if (s.seed != 0) cn.rng = std.Random.DefaultPrng.init(s.seed);
        try http2.writeSettings(&cn.out, &len, &.{.{ .max_concurrent_streams, s.streams }});
        try writeAll(fd, cn.out[0..len]);
        var pre: [24]u8 = undefined;
        var got: usize = 0;
        var tries: u32 = 0;
        while (got < pre.len and tries < 10_000) : (tries += 1) {
            switch (sys.readSome(fd, pre[got..])) {
                .n => |k| got += k,
                .again => Server.nap(),
                .closed => return error.Closed,
            }
        }
        if (!std.mem.eql(u8, &pre, http2.preface)) return error.BadPreface;
        var buf: [16384]u8 = undefined;
        while (!s.stop.load(.acquire)) {
            switch (sys.readSome(fd, &buf)) {
                .n => |k| try cn.reader.feed(buf[0..k], cn),
                .again => {},
                .closed => return,
            }
            s.max_open = @max(s.max_open, @as(u32, @intCast(cn.open.items.len)));
            if (cn.open.items.len > cn.limit) return error.TooManyStreams;
            s.refused = cn.refused;
            // Answers, as the windows allow.
            len = 0;
            while (cn.acks > 0) : (cn.acks -= 1) try http2.writeSettingsAck(&cn.out, &len);
            var i: usize = 0;
            while (i < cn.open.items.len) {
                // Random order: a stream can wait while later ones go.
                if (cn.rng) |*r| if (r.random().boolean()) {
                    i += 1;
                    continue;
                };
                const p = &cn.open.items[i];
                if (!p.headers_sent) {
                    if (cn.out.len - len < 256) break;
                    var hl: usize = len + 9;
                    try hpack.encodeField(&cn.out, &hl, ":status", "200", false);
                    try hpack.encodeField(&cn.out, &hl, "content-type", "text/plain", false);
                    try http2.frameHeaderBlock(&cn.out, &len, p.sid, hl - len - 9, http2.default_max_frame, false);
                    p.headers_sent = true;
                }
                while (p.sent < p.body_len and cn.out.len - len > 9 + 1024) {
                    const n: u32 = @intCast(@min(@as(i64, p.body_len - p.sent), p.window, cn.conn_window, 16384, @as(i64, @intCast(cn.out.len - len - 9))));
                    if (n == 0) break;
                    const last = p.sent + n == p.body_len;
                    try http2.writeDataHeader(&cn.out, &len, p.sid, n, last);
                    if (p.body_len == big_len) @memset(cn.out[len..][0..n], 'z') else @memcpy(cn.out[len..][0..n], p.path[p.sent..][0..n]);
                    len += n;
                    p.sent += n;
                    p.window -= n;
                    cn.conn_window -= n;
                }
                if (p.sent == p.body_len) {
                    s.answered += 1;
                    _ = cn.open.orderedRemove(i);
                    continue;
                }
                i += 1;
            }
            if (len > 0) try writeAll(fd, cn.out[0..len]) else Server.nap();
        }
    }
};

const BodyResults = struct {
    ok: u32 = 0,
    err: u32 = 0,
    big: u32 = 0,
    last_err: [256]u8 = undefined,
    last_err_len: usize = 0,

    fn done(ctx: *anyopaque, exec_id: u64, seq: u32, r: egress.Result) void {
        _ = seq;
        const self: *BodyResults = @ptrCast(@alignCast(ctx));
        var tb: [32]u8 = undefined;
        // Each request's token comes back to that request only.
        const token = std.fmt.bufPrint(&tb, "/t{d}", .{exec_id}) catch unreachable;
        switch (r) {
            .ok => |resp| {
                if (resp.status == 200 and std.mem.eql(u8, resp.body, token)) {
                    self.ok += 1;
                } else if (resp.status == 200 and resp.body.len == H2Server.big_len and std.mem.indexOfNone(u8, resp.body, "z") == null) {
                    self.ok += 1;
                    self.big += 1;
                } else self.err += 1;
            },
            .err => |msg| {
                self.err += 1;
                self.last_err_len = @min(msg.len, self.last_err.len);
                @memcpy(self.last_err[0..self.last_err_len], msg[0..self.last_err_len]);
            },
        }
    }
};

test "h2: streams share one connection within the server's stream limit, windows move a large body, and each answer reaches its own request" {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    const fp = try freePort(37000);
    defer sys.close(fp.lfd);
    var server: H2Server = .{ .lfd = fp.lfd };
    const th = try std.Thread.spawn(.{}, H2Server.run, .{&server});
    defer th.join();
    defer server.stop.store(true, .release);

    var poller = try sys.Poller.init();
    defer poller.deinit();
    var results: BodyResults = .{};
    const client = try a.create(egress.Client);
    var rule_buf: [64]u8 = undefined;
    const rule = try egress.Rule.parse(try std.fmt.bufPrint(&rule_buf, "127.0.0.1:{d} h2=prior conns=1", .{fp.port}));
    try client.init(a, .{ .max_conns = 4, .max_reqs = 32, .big_slots = 2, .max_body = 1 << 20, .h2_conns = 2, .h2_stream_window = 65535, .h2_conn_window = 65535, .rules = &.{rule} }, .{ .ctx = &results, .done = BodyResults.done }, &poller, kind_conn, kind_dns);
    defer client.deinit();
    var args_buf: [128]u8 = undefined;
    const n: u32 = 30;
    for (0..n) |i| {
        var pb: [16]u8 = undefined;
        const path = if (i % 10 == 0) "big" else try std.fmt.bufPrint(&pb, "t{d}", .{i + 1});
        const args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"http://127.0.0.1:{d}/{s}\",\"method\":\"GET\"}}", .{ fp.port, path });
        client.start(i + 1, 0, args, null, null, 0, 0, sys.nowMs());
    }
    drive(client, &poller, &results, n);
    if (server.failed) |f| std.debug.print("h2 server: {s}\n", .{f});
    if (results.last_err_len > 0) std.debug.print("egress error: {s}\n", .{results.last_err[0..results.last_err_len]});
    try std.testing.expect(server.failed == null);
    try std.testing.expectEqual(n, results.ok);
    try std.testing.expectEqual(@as(u32, 3), results.big);
    // One connection (conns=1), never more than 2 streams open on it.
    try std.testing.expectEqual(@as(u64, 1), client.counters.h2_conns);
    try std.testing.expectEqual(@as(u32, 2), server.max_open);
    // The client keeps to the limit once it knows it.
    try std.testing.expectEqual(@as(u32, 0), server.refused);
    // Idle: no reads at all on the h2 connection.
    const r0 = client.counters.reads;
    const until = sys.nowMs() + 300;
    var ready: [64]sys.Ready = undefined;
    while (sys.nowMs() < until) {
        const k = poller.wait(&ready, 2);
        for (ready[0..k]) |ev| client.onConn(@truncate(ev.token), @truncate((ev.token >> 32) & 0xFFFFFF), ev, sys.nowMs());
        client.afterEvents(sys.nowMs());
    }
    try std.testing.expectEqual(r0, client.counters.reads);
}

/// An HTTP/1.1 server for keep-alive connections that answers every
/// request with `resp` after `delay_ms`.
const StatusServer = struct {
    lfd: c_int,
    resp: []const u8,
    delay_ms: u32 = 0,
    stop: std.atomic.Value(bool) = .init(false),
    requests: std.atomic.Value(u32) = .init(0),

    fn run(s: *StatusServer) void {
        var fds: [16]c_int = @splat(-1);
        var bufs: [16][4096]u8 = undefined;
        var lens: [16]usize = @splat(0);
        while (!s.stop.load(.acquire)) {
            if (sys.acceptOne(s.lfd)) |fd| {
                for (&fds) |*f| if (f.* < 0) {
                    f.* = fd;
                    break;
                };
            }
            for (&fds, 0..) |*f, i| {
                if (f.* < 0) continue;
                switch (sys.readSome(f.*, bufs[i][lens[i]..])) {
                    .n => |k| lens[i] += k,
                    .again => {},
                    .closed => {
                        sys.close(f.*);
                        f.* = -1;
                        lens[i] = 0;
                        continue;
                    },
                }
                while (std.mem.indexOf(u8, bufs[i][0..lens[i]], "\r\n\r\n")) |e| {
                    const used = e + 4;
                    std.mem.copyForwards(u8, bufs[i][0 .. lens[i] - used], bufs[i][used..lens[i]]);
                    lens[i] -= used;
                    _ = s.requests.fetchAdd(1, .monotonic);
                    if (s.delay_ms > 0) sys.sleepMs(s.delay_ms);
                    _ = sys.writeSome(f.*, s.resp);
                }
            }
            Server.nap();
        }
        for (fds) |f| if (f >= 0) sys.close(f);
    }
};

const StatusResults = struct {
    ok: u32 = 0,
    err: u32 = 0,
    s429: u32 = 0,
    queue_full: u32 = 0,

    fn done(ctx: *anyopaque, exec_id: u64, seq: u32, r: egress.Result) void {
        _ = exec_id;
        _ = seq;
        const self: *StatusResults = @ptrCast(@alignCast(ctx));
        switch (r) {
            .ok => |resp| {
                self.ok += 1;
                if (resp.status == 429) self.s429 += 1;
            },
            .err => |msg| {
                self.err += 1;
                if (std.mem.indexOf(u8, msg, "is full") != null) self.queue_full += 1;
            },
        }
    }
};

test "origin limits: in-flight cap and a full queue fail with a limit error; 429 cuts the limit (AIMD) and Retry-After holds retries only" {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    const fp = try freePort(40000);
    defer sys.close(fp.lfd);
    var server: StatusServer = .{ .lfd = fp.lfd, .resp = "HTTP/1.1 429 Too Many Requests\r\ncontent-length: 2\r\nretry-after: 1\r\n\r\nno", .delay_ms = 20 };
    const th = try std.Thread.spawn(.{}, StatusServer.run, .{&server});
    defer th.join();
    defer server.stop.store(true, .release);

    var poller = try sys.Poller.init();
    defer poller.deinit();
    var results: StatusResults = .{};
    const client = try a.create(egress.Client);
    var rule_buf: [64]u8 = undefined;
    const rule = try egress.Rule.parse(try std.fmt.bufPrint(&rule_buf, "127.0.0.1:{d} inflight=2 queue=3", .{fp.port}));
    try client.init(a, .{ .max_conns = 8, .max_reqs = 16, .big_slots = 1, .max_body = 1 << 16, .rules = &.{rule} }, .{ .ctx = &results, .done = StatusResults.done }, &poller, kind_conn, kind_dns);
    defer client.deinit();
    var args_buf: [128]u8 = undefined;
    const args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"http://127.0.0.1:{d}/x\",\"method\":\"GET\"}}", .{fp.port});
    // 2 go on the wire, 3 wait, the 6th finds the queue full.
    for (0..6) |i| client.start(i + 1, 0, args, null, null, 0, 0, sys.nowMs());
    try std.testing.expectEqual(@as(u32, 1), results.queue_full);
    const oi = client.last_origin;
    try std.testing.expectEqual(@as(u32, 2), client.origins[oi].inflight);
    try std.testing.expectEqual(@as(u32, 3), client.origins[oi].queued);
    drive(client, &poller, &results, 6);
    // Every 429 is a result for the step; none was sent again.
    try std.testing.expectEqual(@as(u32, 5), results.s429);
    try std.testing.expectEqual(@as(u32, 5), server.requests.load(.monotonic));
    // The 429s cut the origin to one request on the wire, and set a hold.
    try std.testing.expectEqual(@as(f32, 1), client.origins[oi].aimd_limit);
    try std.testing.expect(client.origins[oi].hold_until_ms > sys.nowMs() + 500);
    // A retry of a step (attempt 1) waits for the hold; a first attempt does not.
    const t0 = sys.nowMs();
    client.start(10, 0, args, null, null, 1, 0, t0);
    client.start(11, 0, args, null, null, 0, 0, t0);
    try std.testing.expect(client.origins[oi].h_head != egress_none);
    drive(client, &poller, &results, 8);
    try std.testing.expectEqual(@as(u32, 7), results.s429);
    try std.testing.expect(sys.nowMs() - t0 >= 700);
}

const egress_none: u32 = std.math.maxInt(u32);

/// A TLS server for up to 32 keep-alive connections that answers each
/// request at once with 200 "ok".
const TlsMultiServer = struct {
    lfd: c_int,
    ctx: tls.Context,
    stop: std.atomic.Value(bool) = .init(false),
    accepted: std.atomic.Value(u32) = .init(0),

    const Slot = struct { fd: c_int = -1, s: ?tls.Session = null, shaking: bool = false, buf: [4096]u8 = undefined, len: usize = 0 };

    fn run(srv: *TlsMultiServer) void {
        var slots: [32]Slot = @splat(.{});
        defer for (&slots) |*sl| {
            if (sl.s) |x| x.deinit();
            if (sl.fd >= 0) sys.close(sl.fd);
        };
        const resp = "HTTP/1.1 200 OK\r\ncontent-length: 2\r\ncontent-type: text/plain\r\n\r\nok";
        while (!srv.stop.load(.acquire)) {
            if (sys.acceptOne(srv.lfd)) |fd| {
                for (&slots) |*sl| if (sl.fd < 0) {
                    sl.* = .{ .fd = fd, .s = tls.Session.accept(srv.ctx, fd) catch null, .shaking = true };
                    _ = srv.accepted.fetchAdd(1, .monotonic);
                    break;
                };
            }
            for (&slots) |*sl| {
                if (sl.fd < 0 or sl.s == null) continue;
                if (sl.shaking) {
                    switch (sl.s.?.handshake()) {
                        .n => sl.shaking = false,
                        .want_read, .want_write => {},
                        else => {
                            sl.s.?.deinit();
                            sl.s = null;
                            sys.close(sl.fd);
                            sl.fd = -1;
                        },
                    }
                    continue;
                }
                switch (sl.s.?.read(sl.buf[sl.len..])) {
                    .n => |k| sl.len += k,
                    else => {},
                }
                while (std.mem.indexOf(u8, sl.buf[0..sl.len], "\r\n\r\n")) |e| {
                    std.mem.copyForwards(u8, sl.buf[0 .. sl.len - e - 4], sl.buf[e + 4 .. sl.len]);
                    sl.len -= e + 4;
                    _ = sl.s.?.write(resp);
                }
            }
            Server.nap();
        }
    }
};

test "regression: egress reads follow readiness; idle connections cost no reads" {
    if (!tls.enabled) return error.SkipZigTest;
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();
    var dir_buf: [256]u8 = undefined;
    const dir = try std.fmt.bufPrint(&dir_buf, ".zig-cache/tmp/{s}", .{tmp.sub_path});
    var cb: [512]u8 = undefined;
    var kb: [512]u8 = undefined;
    const cert = try writeFile(dir, "cert.pem", cert_pem, &cb);
    const key = try writeFile(dir, "key.pem", key_pem, &kb);
    const fp = try freePort(43000);
    defer sys.close(fp.lfd);
    var server: TlsMultiServer = .{ .lfd = fp.lfd, .ctx = try tls.Context.server(cert, key) };
    defer server.ctx.deinit();
    const th = try std.Thread.spawn(.{}, TlsMultiServer.run, .{&server});
    defer th.join();
    defer server.stop.store(true, .release);

    var poller = try sys.Poller.init();
    defer poller.deinit();
    var results: Results = .{};
    const client = try a.create(egress.Client);
    try client.init(a, .{ .max_conns = 32, .max_reqs = 64, .big_slots = 1, .max_body = 1 << 16, .insecure_tls = true }, .{ .ctx = &results, .done = Results.done }, &poller, kind_conn, kind_dns);
    defer client.deinit();
    var args_buf: [128]u8 = undefined;
    const args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"https://127.0.0.1:{d}/x\",\"method\":\"GET\"}}", .{fp.port});
    // 20 at once: 20 connections, then idle.
    const idle_n: u32 = 20;
    for (0..idle_n) |i| client.start(i + 1, 0, args, null, null, 0, 0, sys.nowMs());
    drive(client, &poller, &results, idle_n);
    try std.testing.expectEqual(idle_n, results.ok);
    try std.testing.expect(server.accepted.load(.monotonic) >= 10);
    // An idle loop reads nothing.
    const r0 = client.counters.reads;
    const until = sys.nowMs() + 300;
    var ready: [64]sys.Ready = undefined;
    while (sys.nowMs() < until) {
        const k = poller.wait(&ready, 2);
        for (ready[0..k]) |ev| client.onConn(@truncate(ev.token), @truncate((ev.token >> 32) & 0xFFFFFF), ev, sys.nowMs());
        client.afterEvents(sys.nowMs());
    }
    // (A TLS session ticket can arrive on an idle connection: one read each at most.)
    try std.testing.expect(client.counters.reads - r0 <= idle_n);
    // 100 requests one after another use one connection; the idle ones are
    // not read.
    const r1 = client.counters.reads;
    for (0..100) |i| {
        client.start(1000 + i, 0, args, null, null, 0, 0, sys.nowMs());
        drive(client, &poller, &results, idle_n + 1 + @as(u32, @intCast(i)));
    }
    try std.testing.expectEqual(idle_n + 100, results.ok);
    const per_req = @as(f64, @floatFromInt(client.counters.reads - r1)) / 100.0;
    if (per_req > 1.2) std.debug.print("reads per request: {d:.2} (empty {d})\n", .{ per_req, client.counters.empty_reads });
    try std.testing.expect(per_req <= 1.2);
}

test "h2 sim: many requests interleaved on one connection, answered in random order with random refusals, each get their own answer" {
    const gpa = std.testing.allocator;
    var seed: u64 = 1;
    while (seed <= 4) : (seed += 1) {
        var arena = std.heap.ArenaAllocator.init(gpa);
        defer arena.deinit();
        const a = arena.allocator();
        const fp = try freePort(46000);
        defer sys.close(fp.lfd);
        const server = try a.create(H2Server);
        server.* = .{ .lfd = fp.lfd, .streams = 8, .seed = seed };
        const th = try std.Thread.spawn(.{}, H2Server.run, .{server});
        defer th.join();
        defer server.stop.store(true, .release);
        var poller = try sys.Poller.init();
        defer poller.deinit();
        var results: BodyResults = .{};
        const client = try a.create(egress.Client);
        var rule_buf: [64]u8 = undefined;
        const rule = try egress.Rule.parse(try std.fmt.bufPrint(&rule_buf, "127.0.0.1:{d} h2=prior conns=1", .{fp.port}));
        try client.init(a, .{ .max_conns = 4, .max_reqs = 256, .big_slots = 2, .max_body = 1 << 20, .h2_conns = 2, .rules = &.{rule} }, .{ .ctx = &results, .done = BodyResults.done }, &poller, kind_conn, kind_dns);
        defer client.deinit();
        var args_buf: [128]u8 = undefined;
        const n: u32 = 150;
        for (0..n) |i| {
            var pb: [16]u8 = undefined;
            const path = try std.fmt.bufPrint(&pb, "t{d}", .{i + 1});
            const args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"http://127.0.0.1:{d}/{s}\",\"method\":\"GET\"}}", .{ fp.port, path });
            client.start(i + 1, 0, args, null, null, 0, 0, sys.nowMs());
        }
        drive(client, &poller, &results, n);
        if (server.failed) |f| std.debug.print("seed {d}: h2 server: {s}\n", .{ seed, f });
        // Every token came back to its own request (BodyResults checks it).
        try std.testing.expectEqual(n, results.ok);
        try std.testing.expectEqual(@as(u32, 0), results.err);
        try std.testing.expect(server.refused > 0);
    }
}
