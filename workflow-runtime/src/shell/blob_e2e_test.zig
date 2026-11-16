//! Binary data from end to end, with the egress client, the binary data
//! store and a local HTTP server: a response with `responseBinary` becomes
//! a file of n8n's file system store, and a request sends that stored file.
const std = @import("std");
const sys = @import("sys.zig");
const http = @import("http.zig");
const egress = @import("egress.zig");
const request = @import("request.zig");
const blob_store = @import("blob_store.zig");
const binary_store = @import("binary_store.zig");

const kind_conn: u8 = 3;
const kind_dns: u8 = 5;
const kind_file: u8 = 12;
const file_bytes = 150_000;

fn fileByte(i: usize) u8 {
    return @intCast((i * 7 + i / 251) % 256);
}

/// Wait until `fd` can be read (or written), at most 50 ms.
fn waitFor(fd: c_int, write: bool) void {
    var fds = [_]std.c.pollfd{.{ .fd = fd, .events = if (write) std.c.POLL.OUT else std.c.POLL.IN, .revents = 0 }};
    _ = std.c.poll(&fds, 1, 50);
}

/// An HTTP/1.1 server, one connection at a time. `GET /files/...` answers
/// with a file and its names; `GET /chunked/...` sends the same file in
/// chunks; `GET /close/...` ends the file with the connection; `GET /cut/...`
/// closes the connection after a third of the file; `PUT /upload` keeps the
/// body; any other request gets 404.
const Server = struct {
    lfd: c_int,
    stop: std.atomic.Value(bool) = .init(false),
    failed: bool = false,
    upload: []u8,
    upload_len: usize = 0,
    upload_type: [64]u8 = @splat(0),
    buf: []u8,

    fn run(s: *Server) void {
        s.serve() catch {
            s.failed = true;
        };
    }

    fn sendAll(fd: c_int, bytes: []const u8) !void {
        var at: usize = 0;
        var tries: u32 = 0;
        while (at < bytes.len and tries < 100_000) : (tries += 1) switch (sys.writeSome(fd, bytes[at..])) {
            .n => |k| at += k,
            .again => waitFor(fd, true),
            .closed => return error.Closed,
        };
        if (at < bytes.len) return error.Stalled;
    }

    /// Read until `buf` holds `want` bytes; null: read one request head.
    fn fill(s: *Server, fd: c_int, have: *usize, want: ?usize) !void {
        var tries: u32 = 0;
        while (tries < 10_000) : (tries += 1) {
            if (want) |w| {
                if (have.* >= w) return;
            } else if (std.mem.indexOf(u8, s.buf[0..have.*], "\r\n\r\n") != null) return;
            switch (sys.readSome(fd, s.buf[have.*..])) {
                .n => |k| have.* += k,
                .again => {
                    if (s.stop.load(.acquire)) return error.Stopped;
                    waitFor(fd, false);
                },
                .closed => return error.Closed,
            }
        }
        return error.Stalled;
    }

    fn serve(s: *Server) !void {
        var conns: u32 = 0;
        while (conns < 8) : (conns += 1) {
            var waited: u32 = 0;
            const fd = while (waited < 10_000) : (waited += 1) {
                if (sys.acceptOne(s.lfd)) |fd| break fd;
                if (s.stop.load(.acquire)) return;
                waitFor(s.lfd, false);
            } else return error.NoClient;
            defer sys.close(fd);
            sys.setNonBlocking(fd);
            try s.serveConn(fd);
        }
    }

    /// The bytes of the file from `from` to `to`, each piece as a chunk when `chunked`.
    fn sendFile(fd: c_int, from: usize, to: usize, chunked: bool) !void {
        var piece: [4096]u8 = undefined;
        var at: usize = from;
        // A size that is not the size of a buffer of the client.
        const step = if (chunked) 3001 else piece.len;
        while (at < to) {
            const n = @min(step, to - at);
            for (piece[0..n], 0..) |*b, i| b.* = fileByte(at + i);
            var hb: [16]u8 = undefined;
            if (chunked) try sendAll(fd, try std.fmt.bufPrint(&hb, "{x}\r\n", .{n}));
            try sendAll(fd, piece[0..n]);
            if (chunked) try sendAll(fd, "\r\n");
            at += n;
        }
        if (chunked) try sendAll(fd, "0\r\n\r\n");
    }

    fn serveConn(s: *Server, fd: c_int) !void {
        var requests: u32 = 0;
        while (requests < 8) : (requests += 1) {
            var have: usize = 0;
            s.fill(fd, &have, null) catch |e| switch (e) {
                // The client is done with the connection.
                error.Stopped, error.Closed => return,
                else => return e,
            };
            const head_end = (std.mem.indexOf(u8, s.buf[0..have], "\r\n\r\n") orelse return error.NoHead) + 4;
            const head = s.buf[0..head_end];
            const length = if (egress.headerValue(head, "content-length")) |v| try std.fmt.parseInt(usize, v, 10) else 0;
            try s.fill(fd, &have, head_end + length);
            if (std.mem.startsWith(u8, head, "GET /files/")) {
                try sendAll(fd, std.fmt.comptimePrint("HTTP/1.1 200 OK\r\nContent-Type: Application/PDF; q=1\r\nContent-Disposition: attachment; filename=\"q3%20report.pdf\"\r\nContent-Length: {d}\r\n\r\n", .{file_bytes}));
                try sendFile(fd, 0, file_bytes, false);
            } else if (std.mem.startsWith(u8, head, "GET /chunked/")) {
                try sendAll(fd, "HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nTransfer-Encoding: chunked\r\n\r\n");
                try sendFile(fd, 0, file_bytes, true);
            } else if (std.mem.startsWith(u8, head, "GET /close/")) {
                try sendAll(fd, "HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nConnection: close\r\n\r\n");
                try sendFile(fd, 0, file_bytes, false);
                return;
            } else if (std.mem.startsWith(u8, head, "GET /cut/")) {
                try sendAll(fd, std.fmt.comptimePrint("HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: {d}\r\n\r\n", .{file_bytes}));
                try sendFile(fd, 0, file_bytes / 3, false);
                return;
            } else if (std.mem.startsWith(u8, head, "PUT /upload ")) {
                const kind = egress.headerValue(head, "content-type") orelse "";
                @memcpy(s.upload_type[0..kind.len], kind);
                @memcpy(s.upload[0..length], s.buf[head_end..][0..length]);
                s.upload_len = length;
                try sendAll(fd, "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 11\r\n\r\n{\"ok\":true}");
            } else {
                try sendAll(fd, "HTTP/1.1 404 Not Found\r\ncontent-type: text/plain\r\ncontent-length: 4\r\n\r\nnope");
            }
        }
    }
};

/// The sink of the egress client: plain results are kept, and a response
/// to store goes to the store, as the shard does (`server.zig` `egressStored`).
const Sink = struct {
    store: *blob_store.Store,
    results: u32 = 0,
    status: u32 = 0,
    body: [64]u8 = @splat(0),
    body_len: usize = 0,
    err: [256]u8 = @splat(0),
    err_len: usize = 0,

    fn done(ctx: *anyopaque, _: u64, _: u32, r: egress.Result) void {
        const s: *Sink = @ptrCast(@alignCast(ctx));
        s.results += 1;
        switch (r) {
            .ok => |resp| {
                s.status = resp.status;
                s.body_len = @min(resp.body.len, s.body.len);
                @memcpy(s.body[0..s.body_len], resp.body[0..s.body_len]);
            },
            .err => |msg| {
                s.status = 0;
                s.err_len = @min(msg.len, s.err.len);
                @memcpy(s.err[0..s.err_len], msg[0..s.err_len]);
            },
        }
    }

    fn stored(ctx: *anyopaque, exec_id: u64, seq: u32, h: blob_store.Handle, resp: egress.Response, url_path: []const u8, expected: ?u64, whole: bool) bool {
        const s: *Sink = @ptrCast(@alignCast(ctx));
        // The body is never in the response: it comes to the store in pieces.
        std.debug.assert(resp.body.len == 0 and !whole);
        s.store.begin(h, .{
            .exec_id = exec_id,
            .seq = seq,
            .workflow = "wf-e2e",
            .execution = "wfrt-1",
            .head = "{\"status\":200,\"headers\":{}}",
            .content_disposition = egress.headerValue(resp.header_lines, "content-disposition") orelse "",
            .content_type = egress.headerValue(resp.header_lines, "content-type") orelse "",
            .url_path = url_path,
            .expected = expected,
            .now_ms = sys.nowMs(),
        });
        return true;
    }
};

const Env = struct {
    extern "c" fn setenv(name: [*:0]const u8, value: [*:0]const u8, overwrite: c_int) c_int;
    extern "c" fn unsetenv(name: [*:0]const u8) c_int;
};

const Loop = struct {
    poller: *sys.Poller,
    client: *egress.Client,
    sink: *Sink,
    store: *blob_store.Store,
    /// The file operations of the store wait until this loop runs them, as
    /// completions of a ring do. One operation of each transfer per round.
    held: bool = false,
    held_ran: u32 = 0,

    /// Run the client until the sink has `results` results and the store has
    /// a result or is idle.
    fn until(l: *Loop, results: u32, want_stored: bool) !void {
        var ready: [64]sys.Ready = undefined;
        const deadline = sys.nowMs() + 20_000;
        while (sys.nowMs() < deadline) {
            if (l.sink.results >= results and (!want_stored or l.store.nextDone() != null)) return;
            const k = l.poller.wait(&ready, 5);
            for (ready[0..k]) |ev| {
                const kind: u8 = @intCast(ev.token >> 56);
                const idx: u32 = @truncate(ev.token);
                const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
                if (kind == kind_conn) l.client.onConn(idx, gen, ev, sys.nowMs()) else l.client.onDns(@intCast(idx), ev);
            }
            if (l.held) l.held_ran += l.store.runHeldOps();
            l.client.afterEvents(sys.nowMs());
        }
        return error.Timeout;
    }
};

fn text(payload: []const u8, key: []const u8) []const u8 {
    const body = http.member(payload, "$binary") orelse "";
    return http.plainString(http.member(body, key) orelse "") orelse "";
}

test "a response becomes a stored file of n8n, and a request sends a stored file" {
    const t = std.testing;
    var arena = std.heap.ArenaAllocator.init(t.allocator);
    defer arena.deinit();
    const a = arena.allocator();

    var tmp = t.tmpDir(.{});
    defer tmp.cleanup();
    var root_buf: [256]u8 = undefined;
    const root = try std.fmt.bufPrintSentinel(&root_buf, ".zig-cache/tmp/{s}", .{tmp.sub_path}, 0);
    // The upload reads the stored file through this path (`binary_store.zig`).
    try t.expectEqual(@as(c_int, 0), Env.setenv("WFRT_BINARY_DATA_STORAGE_PATH", root, 1));
    defer _ = Env.unsetenv("WFRT_BINARY_DATA_STORAGE_PATH");

    var port: u16 = 0;
    var lfd: c_int = -1;
    var p: u16 = 39000 + @as(u16, @intCast(@mod(std.c.getpid(), 2000)));
    while (p < 42000) : (p += 1) {
        lfd = sys.listenTcp(.{ 127, 0, 0, 1 }, p, false) catch continue;
        port = p;
        break;
    }
    try t.expect(lfd >= 0);
    defer sys.close(lfd);
    var server: Server = .{ .lfd = lfd, .upload = try a.alloc(u8, file_bytes), .buf = try a.alloc(u8, file_bytes + 4096) };
    const th = try std.Thread.spawn(.{}, Server.run, .{&server});
    defer th.join();
    defer server.stop.store(true, .release);

    const store = try a.create(blob_store.Store);
    try store.init(a, .{ .root = root, .max_transfers = 2, .buffer_bytes = 0 }, kind_file);
    defer store.deinit();
    var poller = try sys.Poller.init();
    defer poller.deinit();
    var sink: Sink = .{ .store = store };
    const client = try a.create(egress.Client);
    try client.init(a, .{ .max_conns = 2, .max_reqs = 4, .big_slots = 2, .max_body = 1 << 20, .blobs = store }, .{ .ctx = &sink, .done = Sink.done, .stored = Sink.stored }, &poller, kind_conn, kind_dns);
    defer client.deinit();
    var loop: Loop = .{ .poller = &poller, .client = client, .sink = &sink, .store = store };

    // Download: the body goes to the store, and the result is a handle.
    var args_buf: [512]u8 = undefined;
    var args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"http://127.0.0.1:{d}/files/q3?token=1\",\"method\":\"GET\",\"responseBinary\":{{}}}}", .{port});
    client.start(1, 0, args, null, null, 0, 0, sys.nowMs());
    try loop.until(0, true);
    const d = store.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(d.ok);
    const result = d.payload[d.head_len..];
    try t.expectEqualStrings("q3 report.pdf", text(result, "fileName"));
    try t.expectEqualStrings("application/pdf", text(result, "mimeType"));
    try t.expectEqualStrings("pdf", text(result, "fileExtension"));
    try t.expectEqualStrings("150 kB", text(result, "fileSize"));
    try t.expect(std.mem.endsWith(u8, result, ",\"bytes\":150000}}"));
    var id_buf: [256]u8 = undefined;
    const id = try std.fmt.bufPrint(&id_buf, "{s}", .{text(result, "id")});
    try t.expect(std.mem.startsWith(u8, id, "filesystem-v2:workflows/wf-e2e/executions/wfrt-1/binary_data/"));
    store.take(d);
    try t.expectEqual(@as(u32, 0), sink.results);

    // Upload: the stored file is the body of a request.
    args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"http://127.0.0.1:{d}/upload\",\"method\":\"PUT\",\"body\":{{\"$binary\":{{\"data\":\"filesystem-v2\",\"id\":\"{s}\",\"mimeType\":\"application/pdf\"}}}}}}", .{ port, id });
    client.start(2, 0, args, null, null, 0, 0, sys.nowMs());
    try loop.until(1, false);
    try t.expectEqualStrings("", sink.err[0..sink.err_len]);
    try t.expectEqual(@as(u32, 200), sink.status);
    try t.expectEqual(@as(usize, file_bytes), server.upload_len);
    for (server.upload[0..server.upload_len], 0..) |b, i| if (b != fileByte(i)) return error.StoredBytesDiffer;
    try t.expectEqualStrings("application/pdf", std.mem.sliceTo(&server.upload_type, 0));

    // Another status keeps its body, and the row of the store is free again.
    args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"http://127.0.0.1:{d}/missing\",\"method\":\"GET\",\"responseBinary\":{{\"fileName\":\"x\"}}}}", .{port});
    client.start(3, 0, args, null, null, 0, 0, sys.nowMs());
    try loop.until(2, false);
    try t.expectEqual(@as(u32, 404), sink.status);
    try t.expectEqualStrings("nope", sink.body[0..sink.body_len]);
    try t.expect(store.nextDone() == null and !store.busy());
    try t.expectEqual(@as(u64, 1), store.counters.stored);
    try t.expect(!server.failed);
}

/// The parts of a download test: a server, a store with `block_bytes` blocks
/// of 4096 bytes whose operations wait (0: the store runs them at once), and
/// a client whose largest response body is smaller than the file.
const Rig = struct {
    arena: std.heap.ArenaAllocator,
    tmp: std.testing.TmpDir,
    root_buf: [256]u8 = @splat(0),
    root_len: usize = 0,
    lfd: c_int = -1,
    port: u16 = 0,
    server: Server = undefined,
    thread: std.Thread = undefined,
    store: *blob_store.Store = undefined,
    poller: sys.Poller = undefined,
    sink: Sink = undefined,
    client: *egress.Client = undefined,
    ops: [2]?sys.FileOp = @splat(null),
    loop: Loop = undefined,

    fn start(g: *Rig, blocks: u32) !void {
        const a = g.arena.allocator();
        const root = try std.fmt.bufPrint(&g.root_buf, ".zig-cache/tmp/{s}", .{g.tmp.sub_path});
        g.root_len = root.len;
        var p: u16 = 42000 + @as(u16, @intCast(@mod(std.c.getpid(), 2000)));
        while (p < 45000) : (p += 1) {
            g.lfd = sys.listenTcp(.{ 127, 0, 0, 1 }, p, false) catch continue;
            g.port = p;
            break;
        }
        try std.testing.expect(g.lfd >= 0);
        g.server = .{ .lfd = g.lfd, .upload = &.{}, .buf = try a.alloc(u8, 8192) };
        g.thread = try std.Thread.spawn(.{}, Server.run, .{&g.server});
        g.store = try a.create(blob_store.Store);
        try g.store.init(a, .{ .root = root, .max_transfers = 2, .block_bytes = 4096, .buffer_bytes = 4096 * @as(u64, blocks) }, kind_file);
        if (blocks > 0) g.store.holdOps(&g.ops);
        g.poller = try sys.Poller.init();
        g.sink = .{ .store = g.store };
        g.client = try a.create(egress.Client);
        // The file has 150,000 bytes: more than a response body can have here.
        try g.client.init(a, .{ .max_conns = 2, .max_reqs = 4, .big_slots = 1, .max_body = 32 << 10, .blobs = g.store }, .{ .ctx = &g.sink, .done = Sink.done, .stored = Sink.stored }, &g.poller, kind_conn, kind_dns);
        g.loop = .{ .poller = &g.poller, .client = g.client, .sink = &g.sink, .store = g.store, .held = blocks > 0 };
    }

    fn stop(g: *Rig) void {
        g.client.deinit();
        g.poller.deinit();
        g.store.deinit();
        g.server.stop.store(true, .release);
        g.thread.join();
        sys.close(g.lfd);
        g.tmp.cleanup();
        g.arena.deinit();
    }

    /// Request `path` with `responseBinary` and wait for the result of the store.
    fn download(g: *Rig, exec_id: u64, path: []const u8) !blob_store.Done {
        var args_buf: [256]u8 = undefined;
        const args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"http://127.0.0.1:{d}{s}\",\"responseBinary\":{{}}}}", .{ g.port, path });
        g.client.start(exec_id, 0, args, null, null, 0, 0, sys.nowMs());
        try g.loop.until(0, true);
        return g.store.nextDone() orelse error.TestExpectedEqual;
    }

    /// The stored file of the result `d` has the bytes of the file of the server.
    fn expectFile(g: *Rig, d: blob_store.Done) !void {
        try std.testing.expect(d.ok);
        const result = d.payload[d.head_len..];
        try std.testing.expect(std.mem.endsWith(u8, result, ",\"bytes\":150000}}"));
        const bytes = try binary_store.read(g.arena.allocator(), g.root_buf[0..g.root_len], text(result, "id"), file_bytes);
        try std.testing.expectEqual(@as(usize, file_bytes), bytes.len);
        for (bytes, 0..) |b, i| if (b != fileByte(i)) return error.StoredBytesDiffer;
    }
};

test "a response larger than the body limit goes to its file in pieces: a length, chunks, and the end of the connection" {
    var g: Rig = .{ .arena = std.heap.ArenaAllocator.init(std.testing.allocator), .tmp = std.testing.tmpDir(.{}) };
    try g.start(0);
    defer g.stop();
    for ([_][]const u8{ "/files/a", "/chunked/b.png", "/close/c.png" }, 1..) |path, n| {
        const d = try g.download(n, path);
        try g.expectFile(d);
        g.store.take(d);
        try std.testing.expect(!g.store.busy());
    }
    try std.testing.expectEqual(@as(u64, 3), g.store.counters.stored);
    // No result came through the sink, and no large buffer held a body.
    try std.testing.expectEqual(@as(u32, 0), g.sink.results);
    try std.testing.expectEqual(@as(u32, 4), g.client.nrfree);

    // The connection ends in the middle of the body: the step gets the reason from the
    // store, once, and the part of the file is removed.
    const cut = try g.download(4, "/cut/d.png");
    try std.testing.expect(!cut.ok);
    try std.testing.expect(std.mem.indexOf(u8, cut.payload, "closed before the response was complete") != null);
    g.store.take(cut);
    try std.testing.expect(!g.store.busy() and g.store.nextDone() == null);
    try std.testing.expectEqual(@as(u32, 0), g.sink.results);
    try std.testing.expectEqual(@as(u64, 1), g.store.counters.failed);
    try std.testing.expect(!g.server.failed);
}

test "a store without a free block stops the read of the socket, and the response goes on when a block is free" {
    var g: Rig = .{ .arena = std.heap.ArenaAllocator.init(std.testing.allocator), .tmp = std.testing.tmpDir(.{}) };
    // Two blocks of 4096 bytes hold the body while its writes wait: far less than the file.
    try g.start(2);
    defer g.stop();
    for ([_][]const u8{ "/files/a", "/chunked/b.png", "/close/c.png" }, 1..) |path, n| {
        const d = try g.download(n, path);
        try g.expectFile(d);
        g.store.take(d);
    }
    try std.testing.expect(g.client.counters.stored_pauses > 0 and g.loop.held_ran > 100);
    try std.testing.expectEqual(@as(u32, 0), g.client.npaused);
    try std.testing.expectEqual(@as(u32, 0), g.sink.results);
    try std.testing.expect(!g.server.failed);
}

test "responseBinary without a binary data store fails the request at its start" {
    const t = std.testing;
    var arena = std.heap.ArenaAllocator.init(t.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var tmp = t.tmpDir(.{});
    defer tmp.cleanup();
    var root_buf: [256]u8 = undefined;
    const root = try std.fmt.bufPrint(&root_buf, ".zig-cache/tmp/{s}", .{tmp.sub_path});
    const store = try a.create(blob_store.Store);
    try store.init(a, .{ .root = root, .max_transfers = 1, .buffer_bytes = 0 }, kind_file);
    defer store.deinit();
    var poller = try sys.Poller.init();
    defer poller.deinit();
    var sink: Sink = .{ .store = store };
    const client = try a.create(egress.Client);
    try client.init(a, .{ .max_conns = 2, .max_reqs = 4, .big_slots = 1, .max_body = 1 << 16 }, .{ .ctx = &sink, .done = Sink.done }, &poller, kind_conn, kind_dns);
    defer client.deinit();

    client.start(1, 0, "{\"url\":\"http://127.0.0.1:9/x\",\"responseBinary\":{}}", null, null, 0, 0, sys.nowMs());
    try t.expectEqual(@as(u32, 1), sink.results);
    try t.expect(std.mem.indexOf(u8, sink.err[0..sink.err_len], "responseBinary needs the binary data store") != null);
    // `null` asks for nothing: the request is a plain request.
    var diag: request.Diag = .{};
    var buf: [512]u8 = undefined;
    try t.expect(!(try request.build("{\"url\":\"http://x.io/\",\"responseBinary\":null}", null, null, &buf, &diag)).stores);
    try t.expect((try request.build("{\"url\":\"http://x.io/\",\"responseBinary\":{\"fileName\":\"a\"}}", null, null, &buf, &diag)).stores);
    try t.expectEqual(@as(u32, 4), client.nrfree);
}
