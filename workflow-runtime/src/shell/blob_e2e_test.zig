//! Binary data from end to end, with the egress client, the binary data
//! store and a local HTTP server: a response with `responseBinary` becomes
//! a file of n8n's file system store, and a request sends that stored file.
const std = @import("std");
const sys = @import("sys.zig");
const http = @import("http.zig");
const egress = @import("egress.zig");
const request = @import("request.zig");
const blob_store = @import("blob_store.zig");

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

/// An HTTP/1.1 server for one connection. `GET /files/...` answers with a
/// file and its names; `PUT /upload` keeps the body; any other request gets
/// 404.
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
        var waited: u32 = 0;
        const fd = while (waited < 10_000) : (waited += 1) {
            if (sys.acceptOne(s.lfd)) |fd| break fd;
            if (s.stop.load(.acquire)) return;
            waitFor(s.lfd, false);
        } else return error.NoClient;
        defer sys.close(fd);
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
                var chunk: [4096]u8 = undefined;
                var at: usize = 0;
                while (at < file_bytes) {
                    const n = @min(chunk.len, file_bytes - at);
                    for (chunk[0..n], 0..) |*b, i| b.* = fileByte(at + i);
                    try sendAll(fd, chunk[0..n]);
                    at += n;
                }
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

    fn stored(ctx: *anyopaque, exec_id: u64, seq: u32, h: blob_store.Handle, resp: egress.Response, url_path: []const u8) void {
        const s: *Sink = @ptrCast(@alignCast(ctx));
        s.store.put(h, .{
            .exec_id = exec_id,
            .seq = seq,
            .workflow = "wf-e2e",
            .execution = "wfrt-1",
            .head = "{\"status\":200,\"headers\":{}}",
            .content_disposition = egress.headerValue(resp.header_lines, "content-disposition") orelse "",
            .content_type = egress.headerValue(resp.header_lines, "content-type") orelse "",
            .url_path = url_path,
            .body = resp.body,
            .now_ms = sys.nowMs(),
        });
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
