//! The durable event outbox through a shard and its admin port (spec 9.2):
//! the seq of each lifecycle event, the replay with `after=`, the ack, the
//! limit that refuses new work, a restart that keeps the events, and the
//! modes of the files in the log dir.
//!
//! Each test starts a real shard on its own ports and talks to it over
//! sockets, as n8n does.
const std = @import("std");
const core_lib = @import("core");
const server = @import("server.zig");
const sys = @import("sys.zig");
const programs = @import("programs.zig");

const secret = "outbox-test-secret-0123456789";

const Asm = core_lib.asm_.Asm;
const EK = core_lib.module.EffectKind;

/// `suspend kind, dst, step, args`.
fn effect(a: *Asm, kind: EK, step: u16, dst: u16, args: u16, tmp: u16) !void {
    try a.emitBc(.loadi, tmp, step);
    try a.emit(.@"suspend", @backingInt(kind), dst, tmp, args);
}

/// A workflow with `ctx.trace` and an explicit `ctx.respond` step: a manual
/// run with `trace: true` publishes `started`, `trace`, two `step` lines and
/// `finished`, in that order.
fn tracedProgram(gpa: std.mem.Allocator) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = "{\"durability\":\"batched\"}" };
    defer a.deinit();
    const step = try a.step("Respond", .respond);
    a.beginFunc();
    try a.emitBc(.loads, 1, try a.str("Node"));
    try a.emit(.newobj, 0, 2, 0, 0);
    try a.emit(.trace, 0, 1, 2, 0);
    try a.emit(.newobj, 0, 4, 0, 0);
    try a.emitBc(.loadi, 5, 200);
    try a.emit(.setprop, 0, 4, try a.str("status"), 5);
    try effect(&a, .respond, step, 6, 4, 7);
    try a.emit(.newobj, 0, 8, 0, 0);
    try a.emitBc(.loadi, 5, 1);
    try a.emit(.setprop, 0, 8, try a.str("ok"), 5);
    try a.emit(.ret, 0, 8, 0, 0);
    try a.endFunc("run", 1, 9, 0);
    return a.finish();
}

/// A webhook workflow with an explicit `ctx.respond` step, so its step lines
/// go out when the execution has data, and the webhook is answered at once.
fn respondProgram(gpa: std.mem.Allocator) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = "{\"durability\":\"batched\",\"triggers\":[{\"kind\":\"webhook\",\"path\":\"hook\",\"method\":\"POST\"}]}" };
    defer a.deinit();
    const step = try a.step("Respond", .respond);
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("body"));
    try a.emit(.getprop, 0, 2, 1, try a.str("id"));
    try a.emit(.newobj, 0, 3, 0, 0);
    try a.emit(.setprop, 0, 3, try a.str("id"), 2);
    try a.emit(.newobj, 0, 4, 0, 0);
    try a.emitBc(.loadi, 5, 200);
    try a.emit(.setprop, 0, 4, try a.str("status"), 5);
    try a.emit(.setprop, 0, 4, try a.str("body"), 3);
    try effect(&a, .respond, step, 6, 4, 7);
    try a.emit(.newobj, 0, 8, 0, 0);
    try a.emitBc(.loadi, 5, 1);
    try a.emit(.setprop, 0, 8, try a.str("ok"), 5);
    try a.emit(.ret, 0, 8, 0, 0);
    try a.endFunc("run", 1, 9, 0);
    return a.finish();
}
const meta = "{\"durability\":\"batched\"}";
/// One webhook route for the module that a test starts with.
const hook_routes = [_]server.RouteArg{.{ .module = 0, .method = "POST", .path = "/hook" }};

/// One shard, its log dir, and the two ports it listens on.
const Bed = struct {
    a: std.mem.Allocator,
    tmp: std.testing.TmpDir,
    dir: [:0]const u8,
    stop: std.atomic.Value(bool) = .init(false),
    stats: server.Stats = .{},
    r: ?*server.Runner = null,
    thread: ?std.Thread = null,
    public: u16 = 0,
    admin: u16 = 0,
    /// Bytes of the outbox: small in tests that reach the limit.
    outbox_bytes: u64 = 1 << 20,
    /// Bytes of the stream ring: small in the test that drops lines.
    queue_bytes: usize = 1 << 20,
    /// `--step-events-sample`: step lines of executions without data.
    step_sample: u32 = 0,
    /// The path of the webhook route.
    hook_path: []const u8 = "/hook",
    /// The stream client that this test opened.
    stream: ?Conn = null,

    fn init(a: std.mem.Allocator) !Bed {
        var tmp = std.testing.tmpDir(.{});
        var buf: [512]u8 = undefined;
        const n = try tmp.dir.realPath(std.testing.io, &buf);
        // A dir of wfrt's own: the shard makes it 0700.
        var pb: [512]u8 = undefined;
        const dir = try std.fmt.bufPrintSentinel(&pb, "{s}/log", .{buf[0..n]}, 0);
        const owned = try a.allocSentinel(u8, dir.len, 0);
        @memcpy(owned, dir);
        return .{ .a = a, .tmp = tmp, .dir = owned };
    }

    fn deinit(b: *Bed) void {
        b.closeStream();
        b.stopNow();
        b.tmp.cleanup();
    }

    fn closeStream(b: *Bed) void {
        if (b.stream) |*c| c.close();
        b.stream = null;
    }

    fn stopNow(b: *Bed) void {
        if (b.thread) |t| {
            b.stop.store(true, .release);
            t.join();
            b.thread = null;
        }
        if (b.r) |r| {
            r.deinit();
            b.r = null;
        }
        b.stop.store(false, .release);
    }

    /// Start one shard with the admin API, on a free port pair.
    fn serve(b: *Bed, modules: []const []const u8) !void {
        var p: u16 = 40000 + @as(u16, @intCast(@mod(std.c.getpid(), 1000)));
        var tries: u32 = 0;
        while (tries < 500) : (tries += 1) {
            p += 2;
            var opts: server.Options = .{};
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
            opts.max_outbox_mb = 1;
            opts.step_event_sample = b.step_sample;
            opts.event_queue_bytes = b.queue_bytes;
            opts.port = p;
            opts.admin_port = p + 1;
            opts.admin_secret = secret;
            opts.log_dir = b.dir;
            opts.modules = modules;
            opts.routes = &hook_routes;
            b.r = server.Runner.init(b.a, 0, opts, &b.stats, &b.stop) catch |e| {
                if (e == error.Bind) continue;
                return e;
            };
            b.public = p;
            b.admin = p + 1;
            // The test sets the size that it checks; `--max-outbox-mb` is
            // in whole megabytes.
            if (b.r.?.ob) |*ob| ob.max_bytes = b.outbox_bytes;
            b.thread = try std.Thread.spawn(.{}, server.Runner.run, .{b.r.?});
            return;
        }
        return error.NoPort;
    }

    /// A webhook request on the public port.
    fn webhook(b: *Bed, body: []const u8) !Reply {
        return request(b.a, b.public, "POST", b.hook_path, "", body);
    }

    /// Load the module as workflow `id` with `saveData` as given, so its
    /// step events carry data and become durable (spec 9.2). Identical bytes
    /// share the module index of `--module`, so the route of the test still
    /// points at it.
    fn loadWorkflow(b: *Bed, id: []const u8, wfm: []const u8, save_data: bool) !Reply {
        const enc = std.base64.standard.Encoder;
        const b64 = try b.a.alloc(u8, enc.calcSize(wfm.len));
        _ = enc.encode(b64, wfm);
        const body = try std.fmt.allocPrint(b.a, "{{\"versionId\":\"1\",\"module\":\"{s}\",\"active\":true,\"saveData\":{s},\"webhookPrefix\":\"/w\"}}", .{ b64, if (save_data) "true" else "false" });
        const target = try std.fmt.allocPrint(b.a, "/_admin/workflows/{s}", .{id});
        return request(b.a, b.admin, "PUT", target, secret, body);
    }

    /// A webhook whose execution parks on an approval: no reply comes.
    fn webhookNoReply(b: *Bed, body: []const u8) !void {
        const c = try Conn.open(b.public);
        defer c.close();
        var buf: std.ArrayList(u8) = .empty;
        defer buf.deinit(b.a);
        try buf.print(b.a, "POST /hook HTTP/1.1\r\nhost: a\r\nconnection: close\r\ncontent-length: {d}\r\n\r\n", .{body.len});
        try buf.appendSlice(b.a, body);
        try c.send(buf.items);
    }

    /// Wait until the outbox holds `seq`, or 5 s pass.
    fn waitSeq(b: *Bed, seq: u64) !void {
        var waited: u32 = 0;
        while (b.lastSeq() < seq) {
            if (waited >= 5_000) return error.Timeout;
            nap(1);
            waited += 1;
        }
    }

    /// A request on the public port.
    fn publicCall(b: *Bed, method: []const u8, target: []const u8, body: []const u8) !Reply {
        return request(b.a, b.public, method, target, "", body);
    }

    /// A request on the admin port.
    fn adminCall(b: *Bed, method: []const u8, target: []const u8, body: []const u8) !Reply {
        return request(b.a, b.admin, method, target, secret, body);
    }

    fn lastSeq(b: *Bed) u64 {
        return if (b.r.?.ob) |*ob| ob.status().last else 0;
    }

    /// Open the event stream and take the lines that follow, up to `want`
    /// lines or a deadline of 5 s.
    fn openStream(b: *Bed, after: ?u64, want: usize) ![]const u8 {
        try b.streamFirst(after, null, 5_000);
        return b.readStream(want, 5_000);
    }

    /// Connect the stream client before the events happen: its lines then
    /// arrive as the shard publishes them. With `rcvbuf` its receive buffer
    /// is small, so the socket fills and the shard's write returns EAGAIN
    /// part way through the stream.
    fn streamFirst(b: *Bed, after: ?u64, rcvbuf: ?c_int, ms: u32) !void {
        b.closeStream();
        var tail: [64]u8 = undefined;
        const query = if (after) |n| try std.fmt.bufPrint(&tail, "?after=0:{d}", .{n}) else "";
        var head: [256]u8 = undefined;
        const req = try std.fmt.bufPrint(&head, "GET /_admin/events{s} HTTP/1.1\r\nhost: a\r\nauthorization: Bearer {s}\r\n\r\n", .{ query, secret });
        b.stream = if (rcvbuf) |rb| try Conn.openSlow(b.admin, rb) else try Conn.open(b.admin);
        try b.stream.?.send(req);
        // The response head goes first.
        var head_buf: [1024]u8 = undefined;
        const resp = try b.stream.?.readUntil("\r\n\r\n", &head_buf, ms);
        if (!std.mem.startsWith(u8, resp, "HTTP/1.1 200")) {
            std.debug.print("stream head: {s}\n", .{resp});
            return error.NotStreaming;
        }
    }

    /// The lines that wait, up to `want` of them or a deadline of `ms`.
    fn readStream(b: *Bed, want: usize, ms: u32) ![]const u8 {
        try b.stream.?.readLines(b.a, want, ms);
        return b.stream.?.lines(b.a);
    }
};

/// A reply: its status and its body.
const Reply = struct { status: u16, body: []const u8 };

/// One HTTP request; the reply is read by its content-length, because a
/// reply that the core makes comes after the request is read.
fn request(a: std.mem.Allocator, port: u16, method: []const u8, target: []const u8, auth: []const u8, body: []const u8) !Reply {
    var c = try Conn.open(port);
    defer c.close();
    var buf: std.ArrayList(u8) = .empty;
    defer buf.deinit(a);
    if (auth.len > 0) {
        try buf.print(a, "{s} {s} HTTP/1.1\r\nhost: a\r\nauthorization: Bearer {s}\r\ncontent-length: {d}\r\n\r\n", .{ method, target, auth, body.len });
    } else {
        try buf.print(a, "{s} {s} HTTP/1.1\r\nhost: a\r\ncontent-length: {d}\r\n\r\n", .{ method, target, body.len });
    }
    try buf.appendSlice(a, body);
    try c.send(buf.items);
    var head_buf: [1024]u8 = undefined;
    const raw = try c.readUntil("\r\n\r\n", &head_buf, 10_000);
    const status = std.fmt.parseInt(u16, raw[9..12], 10) catch return error.BadReply;
    const len = contentLength(raw) orelse return error.BadReply;
    const out = try a.alloc(u8, len);
    try c.readBody(out, 10_000);
    return .{ .status = status, .body = out };
}

fn contentLength(head: []const u8) ?usize {
    var it = std.mem.splitSequence(u8, head, "\r\n");
    while (it.next()) |line| {
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse continue;
        if (std.ascii.eqlIgnoreCase(std.mem.trim(u8, line[0..colon], " "), "content-length")) {
            return std.fmt.parseInt(usize, std.mem.trim(u8, line[colon + 1 ..], " "), 10) catch null;
        }
    }
    return null;
}

/// One connection to a socket of a test shard.
const Conn = struct {
    fd: c_int,
    buf: [64 << 10]u8 = undefined,
    len: usize = 0,
    /// The lines that the test asked for.
    got: std.ArrayList(u8) = .empty,

    fn open(port: u16) !Conn {
        return .{ .fd = try sys.connectTcp(.{ 127, 0, 0, 1 }, port) };
    }

    /// A client whose receive buffer is small, so the shard's socket fills
    /// and its write returns EAGAIN part way through the stream.
    fn openSlow(port: u16, rcvbuf: c_int) !Conn {
        const fd = std.c.socket(std.c.AF.INET, std.c.SOCK.STREAM, 0);
        if (fd < 0) return error.Socket;
        _ = std.c.setsockopt(fd, std.c.SOL.SOCKET, std.c.SO.RCVBUF, &rcvbuf, @sizeOf(c_int));
        sys.setNonBlocking(fd);
        var sa = std.mem.zeroes(std.c.sockaddr.in);
        sa.family = std.c.AF.INET;
        sa.port = std.mem.nativeToBig(u16, port);
        sa.addr = @bitCast(@as([4]u8, .{ 127, 0, 0, 1 }));
        if (std.c.connect(fd, @ptrCast(&sa), @sizeOf(std.c.sockaddr.in)) != 0) {
            if (std.c.errno(@as(c_int, -1)) != .INPROGRESS) {
                _ = std.c.close(fd);
                return error.Connect;
            }
        }
        return .{ .fd = fd };
    }

    fn close(c: Conn) void {
        sys.close(c.fd);
    }

    /// A non-blocking connect returns before the connection is up, so a
    /// write can fail with ENOTCONN or EAGAIN and succeed a moment later.
    fn send(c: Conn, bytes: []const u8) !void {
        var off: usize = 0;
        var guard: u32 = 0;
        while (off < bytes.len and guard < 10_000) : (guard += 1) {
            switch (sys.writeSome(c.fd, bytes[off..])) {
                .n => |k| off += k,
                .again, .closed => nap(1),
            }
        }
        if (off != bytes.len) return error.Send;
    }

    /// Read until `marker` (or the end of the connection when it is null),
    /// copy what was read into `out`, and keep the bytes after the marker.
    fn readUntil(c: *Conn, marker: ?[]const u8, out: []u8, ms: u32) ![]const u8 {
        var waited: u32 = 0;
        while (true) {
            if (c.len > 0) {
                if (marker) |m| {
                    if (std.mem.indexOf(u8, c.buf[0..c.len], m)) |at| {
                        const n = at + m.len;
                        if (n > out.len) return error.TooLong;
                        @memcpy(out[0..n], c.buf[0..n]);
                        take(c, n);
                        return out[0..n];
                    }
                } else {
                    const n = c.len;
                    @memcpy(out[0..n], c.buf[0..n]);
                    c.len = 0;
                    return out[0..n];
                }
            }
            if (c.len == c.buf.len) return error.TooLong;
            switch (sys.readSome(c.fd, c.buf[c.len..])) {
                .n => |k| c.len += k,
                .again => {
                    if (waited >= ms) return error.Timeout;
                    nap(1);
                    waited += 1;
                },
                .closed => return c.buf[0..c.len],
            }
        }
    }

    fn take(c: *Conn, n: usize) void {
        std.mem.copyForwards(u8, c.buf[0 .. c.len - n], c.buf[n..c.len]);
        c.len -= n;
    }

    /// Read exactly `out.len` bytes.
    fn readBody(c: *Conn, out: []u8, ms: u32) !void {
        var got: usize = 0;
        var waited: u32 = 0;
        while (got < out.len) {
            if (c.len > 0) {
                const k = @min(c.len, out.len - got);
                @memcpy(out[got..][0..k], c.buf[0..k]);
                take(c, k);
                got += k;
                continue;
            }
            switch (sys.readSome(c.fd, c.buf[c.len..])) {
                .n => |k| c.len += k,
                .again => {
                    if (waited >= ms) return error.Timeout;
                    nap(1);
                    waited += 1;
                },
                .closed => return error.Closed,
            }
        }
    }

    /// Read `want` lines into `got`. A deadline ends it early.
    fn readLines(c: *Conn, a: std.mem.Allocator, want: usize, ms: u32) !void {
        var waited: u32 = 0;
        var have: usize = std.mem.count(u8, c.got.items, "\n");
        while (have < want) {
            if (std.mem.indexOfScalar(u8, c.buf[0..c.len], '\n')) |at| {
                try c.got.appendSlice(a, c.buf[0 .. at + 1]);
                take(c, at + 1);
                have += 1;
                waited = 0;
                continue;
            }
            if (c.len == c.buf.len) return error.TooLong;
            switch (sys.readSome(c.fd, c.buf[c.len..])) {
                .n => |k| c.len += k,
                .again => {
                    if (waited >= ms) return; // A deadline: the lines so far.
                    nap(1);
                    waited += 1;
                },
                .closed => return,
            }
        }
    }

    fn lines(c: *Conn, a: std.mem.Allocator) ![]const u8 {
        return a.dupe(u8, c.got.items);
    }
};

fn nap(ms: u32) void {
    var ts: std.c.timespec = .{ .sec = 0, .nsec = @as(i64, ms) * 1_000_000 };
    _ = std.c.nanosleep(&ts, null);
}

// ---- tests ------------------------------------------------------------------------

/// The `"type"` and `"status"` of a stream line, for an order check.
fn kindOf(line: []const u8) []const u8 {
    const at = std.mem.indexOf(u8, line, "\"type\":\"") orelse return "";
    const rest = line[at + "\"type\":\"".len ..];
    return rest[0 .. std.mem.indexOfScalar(u8, rest, '"') orelse 0];
}

fn statusOf(line: []const u8) []const u8 {
    const at = std.mem.indexOf(u8, line, "\"status\":\"") orelse return "";
    const rest = line[at + "\"status\":\"".len ..];
    return rest[0 .. std.mem.indexOfScalar(u8, rest, '"') orelse 0];
}

fn execOf(line: []const u8) []const u8 {
    const at = std.mem.indexOf(u8, line, "\"executionId\":\"") orelse return "";
    const rest = line[at + "\"executionId\":\"".len ..];
    return rest[0 .. std.mem.indexOfScalar(u8, rest, '"') orelse 0];
}

test "outbox: the live stream keeps the order in which the events were published" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    const wfm = try tracedProgram(a);
    try bed.serve(&.{});
    try std.testing.expectEqual(@as(u16, 200), (try bed.loadWorkflow("w1", wfm, true)).status);
    // The client connects first: it then sees the lines as they are made.
    try bed.streamFirst(null, null, 5_000);
    // One manual run with tracing: started, trace, step started, step
    // completed, finished.
    const run = try bed.adminCall("POST", "/_admin/executions", "{\"workflowId\":\"w1\",\"executionId\":\"77\",\"trigger\":{},\"trace\":true}");
    try std.testing.expectEqual(@as(u16, 202), run.status);
    const text = try bed.readStream(5, 5_000);
    var types: [8][]const u8 = undefined;
    var statuses: [8][]const u8 = undefined;
    var n: usize = 0;
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |line| {
        if (line.len == 0 or n == types.len) continue;
        types[n] = kindOf(line);
        statuses[n] = statusOf(line);
        n += 1;
    }
    const t = std.testing;
    try t.expectEqual(@as(usize, 5), n);
    try t.expectEqualStrings("started", types[0]);
    try t.expectEqualStrings("trace", types[1]);
    try t.expectEqualStrings("step", types[2]);
    try t.expectEqualStrings("started", statuses[2]);
    try t.expectEqualStrings("step", types[3]);
    try t.expectEqualStrings("completed", statuses[3]);
    try t.expectEqualStrings("finished", types[4]);
}

test "outbox: a step and a trace line of an execution with data stay until the ack" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    // A ring of one small line: a best-effort step or trace line would soon
    // drop, and these must not drop at all.
    bed.queue_bytes = 64;
    const wfm = try tracedProgram(a);
    try bed.serve(&.{});
    try std.testing.expectEqual(@as(u16, 200), (try bed.loadWorkflow("w1", wfm, true)).status);
    // `saveData` and `trace: true`: the execution has the data flag.
    const run = try bed.adminCall("POST", "/_admin/executions", "{\"workflowId\":\"w1\",\"executionId\":\"77\",\"trigger\":{},\"trace\":true}");
    try std.testing.expectEqual(@as(u16, 202), run.status);
    // started, trace, step started, step completed, finished: five records.
    try std.testing.expectEqual(@as(u64, 5), bed.lastSeq());
    const text = try bed.openStream(0, 5);
    const t = std.testing;
    var types: [8][]const u8 = undefined;
    var seqs: [8]u64 = undefined;
    var n: usize = 0;
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |line| {
        if (line.len == 0 or n == types.len) continue;
        types[n] = kindOf(line);
        const at = std.mem.indexOf(u8, line, "\"seq\":") orelse return error.NoSeq;
        seqs[n] = std.fmt.parseInt(u64, digitsAt(line, at + 6), 10) catch return error.NoSeq;
        n += 1;
    }
    try t.expectEqual(@as(usize, 5), n);
    try t.expectEqualStrings("started", types[0]);
    try t.expectEqualStrings("trace", types[1]);
    try t.expectEqualStrings("step", types[2]);
    try t.expectEqualStrings("step", types[3]);
    try t.expectEqualStrings("finished", types[4]);
    for (seqs[0..n], 0..) |sq, i| try t.expectEqual(@as(u64, @intCast(i + 1)), sq);
    // Nothing dropped: no line of this execution was in the ring.
    try t.expectEqual(@as(usize, 0), std.mem.count(u8, text, "\"type\":\"dropped\""));
    // A restart before the ack sends every one of the five again.
    bed.stopNow();
    try bed.serve(&.{wfm});
    const again = try bed.openStream(0, 5);
    try t.expectEqual(@as(usize, 5), std.mem.count(u8, again, "\"seq\":"));
    const trace_at = std.mem.indexOf(u8, again, "\"type\":\"trace\"") orelse return error.NoTrace;
    const finish_at = std.mem.indexOf(u8, again, "\"type\":\"finished\"") orelse return error.NoFinish;
    try t.expect(trace_at < finish_at);
}

test "outbox: saveData makes the step lines durable without trace" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    bed.queue_bytes = 64;
    const wfm = try respondProgram(a);
    try bed.serve(&.{});
    try std.testing.expectEqual(@as(u16, 200), (try bed.loadWorkflow("w1", wfm, true)).status);
    bed.hook_path = "/w/hook";
    try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{\"id\":7}")).status);
    // started, step started, step completed, finished: four records, also
    // without `trace`.
    try std.testing.expectEqual(@as(u64, 4), bed.lastSeq());
    const text = try bed.openStream(0, 4);
    const t = std.testing;
    var types: [8][]const u8 = undefined;
    var seq: u64 = 0;
    var n: usize = 0;
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |line| {
        if (line.len == 0 or n == types.len) continue;
        types[n] = kindOf(line);
        const at = std.mem.indexOf(u8, line, "\"seq\":") orelse return error.NoSeq;
        seq += 1;
        try t.expectEqual(seq, std.fmt.parseInt(u64, digitsAt(line, at + 6), 10) catch 0);
        n += 1;
    }
    try t.expectEqual(@as(usize, 4), n);
    try t.expectEqualStrings("started", types[0]);
    try t.expectEqualStrings("step", types[1]);
    try t.expectEqualStrings("step", types[2]);
    try t.expectEqualStrings("finished", types[3]);
    // The step lines carry the node data, as n8n saves it.
    try t.expect(std.mem.indexOf(u8, text, "\"args\":") != null);
    try t.expect(std.mem.indexOf(u8, text, "\"result\":") != null);
}

test "outbox: without saveData the step lines of the sample are best effort" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    // A ring that holds a few step lines only: the later ones drop.
    bed.queue_bytes = 64;
    // The sample makes the step lines of an execution without data go out.
    bed.step_sample = 1;
    const wfm = try respondProgram(a);
    try bed.serve(&.{});
    try std.testing.expectEqual(@as(u16, 200), (try bed.loadWorkflow("w1", wfm, false)).status);
    bed.hook_path = "/w/hook";
    try bed.streamFirst(null, null, 5_000);
    var i: u32 = 0;
    while (i < 3) : (i += 1) try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{\"id\":7}")).status);
    // Only started and finished are durable for each run.
    try std.testing.expectEqual(@as(u64, 6), bed.lastSeq());
    const text = try bed.readStream(1000, 500);
    const t = std.testing;
    var seq: u64 = 0;
    var durable: u32 = 0;
    var steps: u32 = 0;
    var dropped: u32 = 0;
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |line| {
        if (line.len == 0) continue;
        if (std.mem.eql(u8, kindOf(line), "dropped")) {
            dropped += 1;
            continue;
        }
        const at = std.mem.indexOf(u8, line, "\"seq\":") orelse {
            // A step line of an execution without data: no seq.
            try t.expectEqualStrings("step", kindOf(line));
            steps += 1;
            continue;
        };
        seq += 1;
        try t.expectEqual(seq, std.fmt.parseInt(u64, digitsAt(line, at + 6), 10) catch 0);
        durable += 1;
    }
    try t.expectEqual(@as(u32, 6), durable);
    // Some of the step lines were kept, and some dropped.
    try t.expect(steps > 0);
    try t.expect(dropped >= 1);
}

test "outbox: a slow client still gets the lines in publication order" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    const runs: u32 = 24;
    const wfm = try respondProgram(a);
    // The 40 KB trigger lines of the runs must fit the outbox.
    bed.outbox_bytes = 8 << 20;
    try bed.serve(&.{});
    try std.testing.expectEqual(@as(u16, 200), (try bed.loadWorkflow("w1", wfm, true)).status);
    bed.hook_path = "/w/hook";
    // A client with a 1 KB receive buffer that reads nothing yet, and runs
    // whose `started` lines are 40 KB each: the shard's write fills the socket
    // and returns EAGAIN part way through the stream.
    try bed.streamFirst(0, 1024, 5_000);
    const pad = try a.alloc(u8, 40 << 10);
    @memset(pad, 'p');
    const body = try std.fmt.allocPrint(a, "{{\"id\":7,\"pad\":\"{s}\"}}", .{pad});
    var i: u32 = 0;
    while (i < runs) : (i += 1) try std.testing.expectEqual(@as(u16, 200), (try bed.webhook(body)).status);
    // `saveData`: started, step started, step completed and finished, each
    // one durable (spec 9.2).
    try std.testing.expectEqual(@as(u64, 4 * runs), bed.lastSeq());
    const text = try bed.readStream(4 * runs, 10_000);
    const t = std.testing;
    // For each execution: started, then its step lines, then finished.
    var it = std.mem.splitScalar(u8, text, '\n');
    var saw_started: u32 = 0;
    var saw_finished: u32 = 0;
    var open: [64][]const u8 = @splat("");
    while (it.next()) |line| {
        if (line.len == 0) continue;
        const kind = kindOf(line);
        const exec = execOf(line);
        if (std.mem.eql(u8, kind, "started")) {
            saw_started += 1;
            for (&open) |*o| if (o.len == 0) {
                o.* = exec;
                break;
            };
            continue;
        }
        if (std.mem.eql(u8, kind, "finished")) {
            saw_finished += 1;
            // The run is over: no line of it may come later.
            var still: usize = 0;
            for (open) |o| {
                if (o.len > 0 and !std.mem.eql(u8, o, exec)) {
                    open[still] = o;
                    still += 1;
                }
            }
            @memset(open[still..], "");
            continue;
        }
        // A step line: its execution must not be finished yet. The workflow
        // has `saveData`, so the line is durable and carries its seq.
        try t.expect(std.mem.eql(u8, kind, "step"));
        try t.expect(std.mem.indexOf(u8, line, "\"seq\":") != null);
        var open_run = false;
        for (open) |o| {
            if (o.len > 0 and std.mem.eql(u8, o, exec)) open_run = true;
        }
        try t.expect(open_run);
    }
    try t.expectEqual(runs, saw_started);
    try t.expectEqual(runs, saw_finished);
}

test "outbox: a dropped best-effort line does not hold back the durable lines after it" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    // A ring that holds a few step lines only: the later ones drop.
    bed.queue_bytes = 64;
    // No `saveData`, so the step lines of the sample are best effort.
    bed.step_sample = 1;
    const runs: u32 = 12;
    const wfm = try respondProgram(a);
    try bed.serve(&.{});
    try std.testing.expectEqual(@as(u16, 200), (try bed.loadWorkflow("w1", wfm, false)).status);
    bed.hook_path = "/w/hook";
    try bed.streamFirst(null, null, 5_000);
    var i: u32 = 0;
    while (i < runs) : (i += 1) try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{\"id\":7}")).status);
    try std.testing.expectEqual(@as(u64, 2 * runs), bed.lastSeq());
    // Read until the stream goes quiet: the ring keeps only a few lines, so
    // the count of lines is not known in advance.
    const text = try bed.readStream(1000, 500);
    const t = std.testing;
    // Every durable line is there, in seq order.
    var seq: u64 = 0;
    var durable: u32 = 0;
    var steps: u32 = 0;
    var dropped: u32 = 0;
    var finished: [64][]const u8 = @splat("");
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |line| {
        if (line.len == 0) continue;
        const kind = kindOf(line);
        if (std.mem.eql(u8, kind, "dropped")) {
            dropped += 1;
            continue;
        }
        if (std.mem.indexOf(u8, line, "\"seq\":")) |at| {
            seq += 1;
            try t.expectEqual(seq, std.fmt.parseInt(u64, digitsAt(line, at + 6), 10) catch 0);
            durable += 1;
            if (std.mem.eql(u8, kind, "finished")) {
                for (&finished) |*f| if (f.len == 0) {
                    f.* = execOf(line);
                    break;
                };
            }
            continue;
        }
        // A step line: none may come after the finished line of its run.
        try t.expect(std.mem.eql(u8, kind, "step"));
        steps += 1;
        for (finished) |f| try t.expect(f.len == 0 or !std.mem.eql(u8, f, execOf(line)));
    }
    try t.expectEqual(2 * runs, durable);
    try t.expect(dropped >= 1);
    // Some step lines dropped, and the durable lines of the runs went out
    // regardless, in order.
    try t.expect(steps > 0 and steps < 2 * runs);
}

test "outbox: a slow stream client gets every durable line, and only best-effort lines drop" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    // A ring of a few lines: the step lines of the runs drop quickly, and
    // the durable lines must not.
    bed.queue_bytes = 1024;
    const wfm = try respondProgram(a);
    // The workflow has no `saveData`: the outbox holds only started and
    // finished, and the step lines of the sample are best effort.
    bed.step_sample = 1;
    try bed.serve(&.{});
    try std.testing.expectEqual(@as(u16, 200), (try bed.loadWorkflow("w1", wfm, false)).status);
    bed.hook_path = "/w/hook";
    // No client reads the stream while the runs go, so the step lines of
    // these runs fill the small ring.
    var i: u32 = 0;
    while (i < 10) : (i += 1) try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{\"id\":7}")).status);
    const last = bed.lastSeq();
    try std.testing.expectEqual(@as(u64, 20), last);
    // The durable lines, then the best-effort ones that the ring kept.
    const text = try bed.openStream(0, 30);
    const t = std.testing;
    // Every durable line is there, in seq order, with the fields of the
    // stream (spec 9.2).
    var seq: u64 = 0;
    var durable: u32 = 0;
    var dropped: u32 = 0;
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |line| {
        if (line.len == 0) continue;
        const at = std.mem.indexOf(u8, line, "\"seq\":") orelse {
            if (std.mem.indexOf(u8, line, "\"type\":\"dropped\"") != null) dropped += 1;
            continue;
        };
        seq += 1;
        const n = std.fmt.parseInt(u64, digitsAt(line, at + 6), 10) catch 0;
        try t.expectEqual(seq, n);
        try t.expect(std.mem.indexOf(u8, line, "\"shard\":0,") != null);
        durable += 1;
    }
    try t.expectEqual(@as(u32, 20), durable);
    // A step line that did survive comes after the durable ones.
    try t.expect(std.mem.indexOf(u8, text, "\"type\":\"step\"") != null);
    // Only best-effort lines (step, trace) were dropped, and the notice
    // says how many.
    try t.expect(dropped >= 1);
}

test "outbox: after replays the stored durable events" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    try bed.serve(&.{try programs.webhookReply(a, meta, .none)});
    var i: u32 = 0;
    while (i < 2) : (i += 1) try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{\"id\":1}")).status);
    // Every stored event comes back with its seq.
    const all = try bed.openStream(0, 4);
    try std.testing.expectEqual(@as(usize, 4), std.mem.count(u8, all, "\"seq\":"));
    try std.testing.expect(std.mem.indexOf(u8, all, "\"seq\":3,") != null);
    // After seq 2: only the last two, in seq order.
    const rest = try bed.openStream(2, 2);
    try std.testing.expectEqual(@as(usize, 2), std.mem.count(u8, rest, "\"seq\":"));
    try std.testing.expect(std.mem.indexOf(u8, rest, "\"seq\":1,") == null);
    try std.testing.expect(std.mem.indexOf(u8, rest, "\"seq\":2,") == null);
    const first = std.mem.indexOf(u8, rest, "\"seq\":3,") orelse return error.NoSeq;
    const second = std.mem.indexOf(u8, rest, "\"seq\":4,") orelse return error.NoSeq;
    try std.testing.expect(first < second);
    // A malformed query is a 400 (the stream is free again).
    bed.closeStream();
    try std.testing.expectEqual(@as(u16, 400), (try bed.adminCall("GET", "/_admin/events?after=x", "")).status);
}

test "outbox: an ack beyond the last event is 400, and an ack deletes segments" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    // Small segments: an ack can delete them.
    bed.outbox_bytes = 1 << 20;
    try bed.serve(&.{try programs.webhookReply(a, meta, .none)});
    try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{}")).status);
    const last = bed.lastSeq();
    try std.testing.expectEqual(@as(u64, 2), last);
    // Beyond the last written seq.
    const beyond = try bed.adminCall("POST", "/_admin/events/ack", "{\"acks\":[{\"shard\":0,\"seq\":99}]}");
    try std.testing.expectEqual(@as(u16, 400), beyond.status);
    try std.testing.expectEqualStrings("{\"error\":\"ack beyond the last event\"}", beyond.body);
    // A body that is not a list of acks.
    try std.testing.expectEqual(@as(u16, 400), (try bed.adminCall("POST", "/_admin/events/ack", "{\"acks\":[1]}")).status);
    // The status route names the seqs of the shard.
    const st = try bed.adminCall("GET", "/_admin/outbox", "");
    try std.testing.expectEqual(@as(u16, 200), st.status);
    try std.testing.expect(std.mem.indexOf(u8, st.body, "\"first\":1,") != null);
    try std.testing.expect(std.mem.indexOf(u8, st.body, "\"last\":2,") != null);
    try std.testing.expect(std.mem.indexOf(u8, st.body, "\"acked\":0,") != null);
    // The ack of the last event stores it and deletes the whole outbox.
    try std.testing.expectEqual(@as(u16, 204), (try bed.adminCall("POST", "/_admin/events/ack", "{\"acks\":[{\"shard\":0,\"seq\":2}]}")).status);
    const after = try bed.adminCall("GET", "/_admin/outbox", "");
    try std.testing.expect(std.mem.indexOf(u8, after.body, "\"acked\":2,") != null);
    try std.testing.expect(std.mem.indexOf(u8, after.body, "\"bytes\":0,") != null);
    try std.testing.expect(std.mem.indexOf(u8, after.body, "\"first\":3,") != null);
    // A lower seq changes nothing.
    try std.testing.expectEqual(@as(u16, 204), (try bed.adminCall("POST", "/_admin/events/ack", "{\"acks\":[{\"shard\":0,\"seq\":1}]}")).status);
    try std.testing.expect(std.mem.indexOf(u8, (try bed.adminCall("GET", "/_admin/outbox", "")).body, "\"acked\":2,") != null);
}

test "outbox: a full outbox refuses a webhook and a manual run, and a resume still works" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    // The webhook of this workflow parks on an approval.
    const wfm = try programs.approval(a, meta);
    bed.outbox_bytes = 4096;
    try bed.serve(&.{wfm});
    // This run waits for a person: its webhook gets no answer.
    try bed.webhookNoReply("{}");
    try bed.waitSeq(2);
    // The waiting event names the resume URL of the approval.
    const text = try bed.openStream(0, 2);
    try std.testing.expect(std.mem.indexOf(u8, text, "\"type\":\"waiting\"") != null);
    const at = std.mem.indexOf(u8, text, "\"resumeUrl\":\"") orelse return error.NoResumeUrl;
    const rest = text[at + "\"resumeUrl\":\"".len ..];
    const url = rest[0..std.mem.indexOfScalar(u8, rest, '"').?];
    // Fill the outbox: the stored bytes reach the limit, so new work waits.
    if (bed.r.?.ob) |*ob| ob.max_bytes = ob.status().bytes;
    const refused = try bed.webhook("{\"id\":1}");
    try std.testing.expectEqual(@as(u16, 503), refused.status);
    try std.testing.expectEqualStrings("{\"error\":\"the event outbox is full\"}", refused.body);
    const manual = try bed.adminCall("POST", "/_admin/executions", "{\"workflowId\":\"w\",\"executionId\":\"77\",\"trigger\":{}}");
    try std.testing.expectEqual(@as(u16, 503), manual.status);
    try std.testing.expectEqualStrings("{\"error\":\"the event outbox is full\"}", manual.body);
    // A resume still goes on: the events of a running execution do too.
    const resumed = try bed.publicCall("POST", url, "{\"approved\":false}");
    try std.testing.expect(resumed.status >= 200 and resumed.status < 300);
    try bed.waitSeq(3);
    // The shard is over its limit, and the finished event is still kept.
    try std.testing.expect(bed.r.?.ob.?.full());
    const lines = try bed.openStream(2, 1);
    try std.testing.expect(std.mem.indexOf(u8, lines, "\"type\":\"finished\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, lines, "\"seq\":3,") != null);
}

test "outbox: a restart sends the unacked events again, with their seq" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    const wfm = try programs.webhookReply(a, meta, .none);
    try bed.serve(&.{wfm});
    try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{\"id\":1}")).status);
    // n8n handled the first event only.
    try std.testing.expectEqual(@as(u16, 204), (try bed.adminCall("POST", "/_admin/events/ack", "{\"acks\":[{\"shard\":0,\"seq\":1}]}")).status);
    // The shard stops and starts again on the same log dir.
    bed.stopNow();
    try bed.serve(&.{wfm});
    try std.testing.expectEqual(@as(u64, 2), bed.lastSeq());
    try std.testing.expect(std.mem.indexOf(u8, (try bed.adminCall("GET", "/_admin/outbox", "")).body, "\"acked\":1,") != null);
    // The client asks after the seq that it handled: the rest comes again.
    const text = try bed.openStream(1, 1);
    try std.testing.expect(std.mem.indexOf(u8, text, "\"seq\":2,") != null);
    try std.testing.expect(std.mem.indexOf(u8, text, "\"type\":\"finished\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, text, "\"seq\":1,") == null);
    // The seq goes on after a restart.
    try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{\"id\":2}")).status);
    try std.testing.expect(bed.lastSeq() > 2);
}

test "outbox: the log dir is 0700 and every file in it is 0600" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    defer bed.deinit();
    bed.outbox_bytes = 512;
    try bed.serve(&.{try programs.webhookReply(a, meta, .none)});
    try std.testing.expectEqual(@as(u16, 200), (try bed.webhook("{}")).status);
    try std.testing.expectEqual(@as(c_uint, 0o700), try modeOf(bed.dir));
    var log_buf: [512]u8 = undefined;
    const log = try std.fmt.bufPrint(&log_buf, "{s}/shard-0.log", .{bed.dir});
    try std.testing.expectEqual(@as(c_uint, 0o600), try modeOf(log));
    const entries = try listDir(a, bed.dir);
    var segs: u32 = 0;
    for (entries) |name| {
        if (std.mem.startsWith(u8, name, "outbox-0-") and std.mem.endsWith(u8, name, ".seg")) segs += 1;
        var pb: [512]u8 = undefined;
        const p = try std.fmt.bufPrint(&pb, "{s}/{s}", .{ bed.dir, name });
        try std.testing.expectEqual(@as(c_uint, 0o600), try modeOf(p));
    }
    try std.testing.expect(segs >= 1);
}

/// The permission bits of a file or dir.
fn modeOf(path: []const u8) !c_uint {
    var b: [512]u8 = undefined;
    @memcpy(b[0..path.len], path);
    b[path.len] = 0;
    const z = b[0..path.len :0];
    return sys.fileMode(z);
}

/// The names in a dir, `.` and `..` left out.
fn listDir(a: std.mem.Allocator, dir: []const u8) ![]const []const u8 {
    var b: [512]u8 = undefined;
    @memcpy(b[0..dir.len], dir);
    b[dir.len] = 0;
    const d = std.c.opendir(b[0..dir.len :0]) orelse return error.OpenDir;
    defer _ = std.c.closedir(d);
    var names: std.ArrayList([]const u8) = .empty;
    while (std.c.readdir(d)) |ent| {
        const name = std.mem.sliceTo(&ent.name, 0);
        if (std.mem.eql(u8, name, ".") or std.mem.eql(u8, name, "..")) continue;
        try names.append(a, try a.dupe(u8, name));
    }
    return names.toOwnedSlice(a);
}

/// The decimal digits at a position, as text.
fn digitsAt(line: []const u8, at: usize) []const u8 {
    var end = at;
    while (end < line.len and std.ascii.isDigit(line[end])) end += 1;
    return line[at..end];
}
