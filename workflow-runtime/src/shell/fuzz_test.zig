//! Fuzz targets of the shell and of whole-core behaviour (`zig build fuzz
//! --fuzz`). Without --fuzz, each target runs its seeds once as a unit
//! test. Each target checks its own invariants, not only "no crash".
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const module = core_lib.module;
const logfmt = core_lib.logfmt;
const Arena = core_lib.arena.Arena;
const http = @import("http.zig");
const admin = @import("admin.zig");
const creds = @import("creds.zig");
const request = @import("request.zig");
const programs = @import("programs.zig");
const shard_mod = @import("shard.zig");
const Smith = std.testing.Smith;

var input_buf: [64 << 10]u8 = undefined;
var dump_count: u32 = 0;
var work_buf: [256 << 10]u8 = undefined;

/// A seed in the fuzzer's input form: `Smith.slice` reads a 4-byte little-
/// endian length first.
fn seed(comptime s: []const u8) *const [4 + s.len]u8 {
    return comptime blk: {
        var out: [4 + s.len]u8 = undefined;
        std.mem.writeInt(u32, out[0..4], s.len, .little);
        @memcpy(out[4..], s);
        const final = out;
        break :blk &final;
    };
}

// ---- module verifier and interpreter ---------------------------------------------

/// Seeds: the hand-assembled programs and the corpus modules on disk.
fn moduleSeeds(gpa: std.mem.Allocator) ![]const []const u8 {
    var list: std.ArrayList([]const u8) = .empty;
    for (programs.sim_programs) |p| try list.append(gpa, try p(gpa, programs.simMeta()));
    try list.append(gpa, try programs.everySecond(gpa, programs.schedule_meta));
    try list.append(gpa, try programs.webhookReply(gpa, null, .http));
    const names = [_][]const u8{ "01-order-approval", "02-loops", "07-promise-all-list", "09-closures", "14-json", "16-sort", "20-array-methods", "21-dates", "23-trace", "24-execution-vars" };
    for (names) |n| {
        var path: [256]u8 = undefined;
        const p = std.fmt.bufPrintSentinel(&path, "../packages/@n8n/workflow-lang/corpus/{s}/module.wfm", .{n}, 0) catch continue;
        const bytes = readFile(gpa, p) catch continue;
        try list.append(gpa, bytes);
    }
    // In the fuzzer's input form: a 4-byte length, then the bytes.
    for (list.items) |*m| {
        const framed = try gpa.alloc(u8, 4 + m.len);
        std.mem.writeInt(u32, framed[0..4], @intCast(m.len), .little);
        @memcpy(framed[4..], m.*);
        m.* = framed;
    }
    // Inputs that crashed before, already in the fuzzer's input form.
    const crashes = [_][]const u8{ "module-fibre-index.bin", "module-root-poisoned.bin" };
    for (crashes) |c| {
        var path: [256]u8 = undefined;
        const p = std.fmt.bufPrintSentinel(&path, "bench/fuzz-crashes/{s}", .{c}, 0) catch continue;
        try list.append(gpa, readFile(gpa, p) catch continue);
    }
    return list.toOwnedSlice(gpa);
}

fn readFile(gpa: std.mem.Allocator, path: [*:0]const u8) ![]u8 {
    const fd = std.c.open(path, .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
    if (fd < 0) return error.NotFound;
    defer _ = std.c.close(fd);
    var out: std.ArrayList(u8) = .empty;
    errdefer out.deinit(gpa);
    var buf: [1 << 14]u8 = undefined;
    while (true) {
        const n = std.c.read(fd, &buf, buf.len);
        if (n <= 0) break;
        try out.appendSlice(gpa, buf[0..@intCast(n)]);
    }
    return out.toOwnedSlice(gpa);
}

/// Small limits, so one input runs in about a millisecond.
fn smallConfig() core.Config {
    return .{
        .slots = 4,
        .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 },
        .region_counts = .{ 4, 4, 2, 1 },
        .max_parked = 8,
        .max_timers = 64,
        .max_pending = 64,
        .max_actions = 512,
        .max_batch_events = 64,
        .module_bytes = 1 << 20,
        .natives_total = 1 << 16,
        .max_modules = 4,
        .max_routes = 8,
        .max_schedules = 4,
        .max_zones = 2,
        .schedules = false,
        .lifecycle = true,
        .fuel_per_exec_batch = 20_000,
        .limits = .{ .fuel_total = 200_000, .call_depth = 64, .fibres = 16 },
    };
}

/// Load a module and run it to the end, answering every effect. A module
/// that verifies must never crash the core or break its invariants.
fn runModule(gpa: std.mem.Allocator, bytes: []const u8, err_every: u8) !void {
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    var st = try core.State.init(a, smallConfig());
    // Reserved memory is not written at start: fill it, so a read of memory
    // that no allocation wrote gives the same poison in every run (found a
    // bug that only showed in long fuzz runs, with recycled memory).
    for (st.pools) |p| @memset(p, 0xAA);
    var scratch = Arena.init(try a.alloc(u8, 2 << 20));
    var events: std.ArrayList(core.Event) = .empty;
    try events.append(a, .{ .kind = .load_module, .payload = bytes });
    try events.append(a, .{ .kind = .start, .aux = 0, .seq = core_lib.heap.exec_flag_trace, .payload = "{\"a\":[1,2,{\"b\":\"x\"}],\"n\":3}" });
    var snaps = std.AutoHashMap(u64, []u8).init(a);
    var now: i64 = 1_000;
    var batches: u32 = 0;
    var answered: u32 = 0;
    while (batches < 64) : (batches += 1) {
        scratch.reset();
        const out = try core.step(&st, now, events.items, &scratch);
        events.clearRetainingCapacity();
        try core.checkInvariants(&st);
        for (st.emitted()) |act| if (act.kind == .snapshot) try snaps.put(act.exec_id, try a.dupe(u8, act.payload));
        var next: std.ArrayList(core.Event) = .empty;
        for (st.emitted()) |act| switch (act.kind) {
            .dispatch => {
                if (snaps.get(act.exec_id)) |s| try next.append(a, .{ .kind = .restore, .exec_id = act.exec_id, .payload = s });
                answered += 1;
                const fail = err_every > 0 and answered % err_every == 0;
                try next.append(a, .{ .kind = if (fail) .effect_err else .effect_ok, .exec_id = act.exec_id, .seq = act.seq, .payload = if (fail) "boom" else "{\"status\":200,\"body\":[1]}" });
            },
            .wake => if (snaps.get(act.exec_id)) |s| try next.append(a, .{ .kind = .restore, .exec_id = act.exec_id, .payload = s }),
            .attention => try next.append(a, .{ .kind = .operator, .exec_id = act.exec_id, .aux = @backingInt(core.OperatorAction.skip), .payload = "null" }),
            else => {},
        };
        // Restores first, as the shard orders them.
        for (next.items) |e| if (e.kind == .restore) try events.append(a, e);
        for (next.items) |e| if (e.kind != .restore) try events.append(a, e);
        if (events.items.len == 0 and !out.has_ready) {
            const t = out.next_timer_ms orelse break;
            now = @max(now + 1, t);
        }
    }
}

fn fuzzModule(seeds: []const []const u8, smith: *Smith) !void {
    _ = seeds;
    const len = smith.slice(&input_buf);
    if (len < 48) return;
    const bytes = input_buf[0..len];
    // Fix the header hash, so mutations reach the verifier.
    std.crypto.hash.sha2.Sha256.hash(bytes[48..], bytes[16..48], .{});
    var natives: [1 << 15]u16 = undefined;
    _ = module.load(bytes, &natives) catch return;
    // WFRT_FUZZ_DUMP=<file>: write each module that loads, so after a crash
    // the file holds the module that crashed.
    // `<file>.<pid>.<n>`: the last 16 inputs of each fuzzer process, with
    // the error rate as the last byte, in the seed form.
    const err_every = smith.value(u8) % 4;
    if (std.c.getenv("WFRT_FUZZ_DUMP")) |base| {
        var pbuf: [512]u8 = undefined;
        const path = std.fmt.bufPrintSentinel(&pbuf, "{s}.{d}.{d}", .{ std.mem.span(base), std.c.getpid(), dump_count % 16 }, 0) catch return;
        dump_count += 1;
        const fd = std.c.open(path, .{ .ACCMODE = .WRONLY, .CREAT = true, .TRUNC = true }, @as(std.c.mode_t, 0o644));
        if (fd >= 0) {
            var prefix: [4]u8 = undefined;
            std.mem.writeInt(u32, &prefix, @intCast(bytes.len), .little);
            _ = std.c.write(fd, &prefix, 4);
            _ = std.c.write(fd, bytes.ptr, bytes.len);
            _ = std.c.write(fd, &[_]u8{err_every}, 1);
            _ = std.c.close(fd);
        }
    }
    try runModule(std.testing.allocator, bytes, err_every);
}

test "fuzz module verifier and interpreter" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const seeds = try moduleSeeds(arena.allocator());
    try std.testing.fuzz(seeds, fuzzModule, .{ .corpus = seeds });
}

// ---- HTTP -------------------------------------------------------------------------

fn fuzzHttpParsers(_: void, smith: *Smith) !void {
    const buf = input_buf[0..smith.slice(&input_buf)];
    const max = smith.valueRangeAtMost(u32, 0, 1 << 20);
    if (http.parseRequest(buf, max) catch null) |r| {
        if (r.consumed > buf.len) return error.ConsumedTooMuch;
        try within(buf, r.method);
        try within(buf, r.target);
        try within(buf, r.body);
        try within(buf, r.head);
        if (r.body.len > max) return error.BodyOverLimit;
        if (r.method.len == 0) return error.EmptyMethod;
    }
    // The one-pass parser gives what the former parser gave.
    const now = http.parseRequest(buf, max);
    const ref = parseRequestRef(buf, max);
    if (ref) |rr| {
        if (rr) |want| {
            const got = (try now) orelse return error.ParserDiffers;
            if (!std.mem.eql(u8, got.method, want.method) or !std.mem.eql(u8, got.target, want.target) or
                !std.mem.eql(u8, got.body, want.body) or !std.mem.eql(u8, got.head, want.head) or
                got.keep_alive != want.keep_alive or got.consumed != want.consumed) return error.ParserDiffers;
        } else if ((try now) != null) return error.ParserDiffers;
    } else |e| {
        if (now) |_| return error.ParserDiffers else |e2| if (e != e2) return error.ParserDiffers;
    }
    if (http.parseResponse(buf) catch null) |r| {
        if (r.consumed > buf.len) return error.ConsumedTooMuch;
        if (r.status > 999) return error.BadStatus;
    }
    if (http.contentLength(buf)) |n| _ = n;
}

/// The request parser before the one-pass version: the reference.
fn parseRequestRef(buf: []const u8, max_body: usize) http.ParseError!?http.Request {
    const head_end = std.mem.indexOf(u8, buf, "\r\n\r\n") orelse {
        if (buf.len > 16 << 10) return error.TooLarge;
        return null;
    };
    const head = buf[0..head_end];
    const line_end = std.mem.indexOf(u8, head, "\r\n") orelse head.len;
    const line = head[0..line_end];
    const sp1 = std.mem.indexOfScalar(u8, line, ' ') orelse return error.BadRequest;
    const sp2 = std.mem.lastIndexOfScalar(u8, line, ' ') orelse return error.BadRequest;
    if (sp1 == 0 or sp2 <= sp1 + 1) return error.BadRequest;
    var content_len: usize = 0;
    var keep_alive = std.mem.endsWith(u8, line, "HTTP/1.1");
    var it = std.mem.splitSequence(u8, head[@min(head.len, line_end + 2)..], "\r\n");
    while (it.next()) |h| {
        const colon = std.mem.indexOfScalar(u8, h, ':') orelse continue;
        const name = h[0..colon];
        const val = std.mem.trim(u8, h[colon + 1 ..], " \t");
        if (std.ascii.eqlIgnoreCase(name, "content-length")) {
            content_len = std.fmt.parseInt(usize, val, 10) catch return error.BadRequest;
        } else if (std.ascii.eqlIgnoreCase(name, "connection")) {
            if (std.ascii.eqlIgnoreCase(val, "close")) keep_alive = false;
            if (std.ascii.eqlIgnoreCase(val, "keep-alive")) keep_alive = true;
        } else if (std.ascii.eqlIgnoreCase(name, "transfer-encoding")) {
            return error.BadRequest;
        }
    }
    if (content_len > max_body) return error.TooLarge;
    const total = head_end + 4 + content_len;
    if (buf.len < total) return null;
    return .{ .method = line[0..sp1], .target = line[sp1 + 1 .. sp2], .body = buf[head_end + 4 .. total], .keep_alive = keep_alive, .consumed = total, .head = head[@min(head.len, line_end + 2)..] };
}

fn within(outer: []const u8, inner: []const u8) !void {
    if (inner.len == 0) return;
    const o = @intFromPtr(outer.ptr);
    const i = @intFromPtr(inner.ptr);
    if (i < o or i + inner.len > o + outer.len) return error.SliceOutside;
}

test "fuzz http request and response parsers" {
    try std.testing.fuzz({}, fuzzHttpParsers, .{
        .corpus = &.{
            seed("POST /x?a=1 HTTP/1.1\r\nHost: h\r\nContent-Length: 3\r\n\r\nabcGET / HTTP/1.0\r\n\r\n"),
            seed("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nContent-Type: application/json\r\n\r\n{}"),
            seed("HTTP/1.1 301 Moved\r\nTransfer-Encoding: chunked\r\nLocation: /y\r\n\r\n0\r\n\r\n"),
            // Regression: a request line with no method (found by fuzzing).
            seed(" /x HTTP/1.1\r\n\r\n"),
        },
    });
}

/// Chunk a random body, then decode it with the input split at each
/// position: the result is the body, whatever the split.
fn fuzzChunked(_: void, smith: *Smith) !void {
    var body: [512]u8 = undefined;
    const blen = smith.valueRangeAtMost(u16, 0, body.len);
    smith.bytes(body[0..blen]);
    var enc_buf: [4096]u8 = undefined;
    var w = std.Io.Writer.fixed(&enc_buf);
    var off: usize = 0;
    while (off < blen) {
        const n = @min(blen - off, smith.valueRangeAtMost(u16, 1, 64));
        w.print("{x}", .{n}) catch return;
        if (smith.value(bool)) w.writeAll(";ext=1") catch return;
        w.writeAll("\r\n") catch return;
        w.writeAll(body[off..][0..n]) catch return;
        w.writeAll("\r\n") catch return;
        off += n;
    }
    w.writeAll("0\r\n") catch return;
    if (smith.value(bool)) w.writeAll("X-Trailer: 1\r\n") catch return;
    w.writeAll("\r\n") catch return;
    const enc = w.buffered();
    var split: usize = 0;
    while (split <= enc.len) : (split += 1) {
        var buf: [4096]u8 = undefined;
        @memcpy(buf[0..enc.len], enc);
        var c: http.Chunked = .{};
        var out: usize = 0;
        var raw: usize = 0;
        try c.feed(&buf, &out, &raw, split);
        try c.feed(&buf, &out, &raw, enc.len);
        if (!c.done()) return error.ChunkedNotDone;
        if (raw != enc.len) return error.ChunkedLeftBytes;
        try std.testing.expectEqualSlices(u8, body[0..blen], buf[0..out]);
    }
}

test "fuzz chunked split positions" {
    try std.testing.fuzz({}, fuzzChunked, .{});
}

/// Random bytes: the decoder never writes past what it read.
fn fuzzChunkedRaw(_: void, smith: *Smith) !void {
    const len = smith.slice(&input_buf);
    var c: http.Chunked = .{};
    var out: usize = 0;
    var raw: usize = 0;
    c.feed(input_buf[0..len], &out, &raw, len) catch return;
    if (out > raw or raw > len) return error.ChunkedIndexes;
}

test "fuzz chunked decoder on random bytes" {
    try std.testing.fuzz({}, fuzzChunkedRaw, .{ .corpus = &.{seed("5\r\nhello\r\nfffffffffffffff\r\n")} });
}

// ---- URL and query ----------------------------------------------------------------

fn fuzzUrlQuery(_: void, smith: *Smith) !void {
    var ubuf: [512]u8 = undefined;
    const url = ubuf[0..smith.slice(&ubuf)];
    if (http.parseUrl(url)) |u| {
        if (u.host.len == 0) return error.EmptyHost;
        if (u.port == 0) return error.ZeroPort;
        if (u.target.len > 0 and u.target[0] != '/' and u.target[0] != '?') return error.BadTarget;
        try within(url, u.host);
    } else |_| {}
    // The query encoder writes only unreserved bytes and %XX; decoding gives
    // the input back.
    var raw: [256]u8 = undefined;
    const s = raw[0..smith.slice(&raw)];
    var out_buf: [1024]u8 = undefined;
    var out: creds.Out = .{ .buf = &out_buf };
    try http.writeQueryComponent(&out, s);
    const enc = out_buf[0..out.len];
    for (enc) |c| {
        if (!(std.ascii.isAlphanumeric(c) or std.mem.indexOfScalar(u8, "-_.!~*'()%", c) != null)) return error.QueryByteNotEncoded;
    }
    var dec: [256]u8 = undefined;
    try std.testing.expectEqualSlices(u8, s, core_lib.multipart.decode(enc, false, &dec));
}

test "fuzz url parser and query encoder" {
    try std.testing.fuzz({}, fuzzUrlQuery, .{ .corpus = &.{ seed("https://[::1]:8443/a?b=1#f"), seed("http://user@h/"), seed("http://h:0/") } });
}

// ---- log reader and recovery ------------------------------------------------------

const MemLog = struct {
    bytes: std.ArrayList(u8) = .empty,
    gpa: std.mem.Allocator,
    fn append(ctx: *anyopaque, b: []const u8) anyerror!void {
        const l: *MemLog = @ptrCast(@alignCast(ctx));
        try l.bytes.appendSlice(l.gpa, b);
    }
    fn sync(_: *anyopaque) anyerror!void {}
    fn sink(l: *MemLog) shard_mod.LogSink {
        return .{ .ctx = l, .appendFn = append, .syncFn = sync };
    }
};

fn shardConfig() core.Config {
    var c = smallConfig();
    c.slots = 16;
    c.region_counts = .{ 16, 4, 2, 1 };
    c.max_parked = 32;
    c.max_modules = 8;
    c.schedules = true;
    c.lifecycle = false;
    return c;
}

/// A log from a short run: modules, workflows, starts, effects, waits.
var base_log: ?[]u8 = null;
var base_log_mem: [1 << 20]u8 = undefined;

/// `keep` holds the result for later inputs; `gpa` is for the work.
fn baseLog(gpa: std.mem.Allocator, keep: std.mem.Allocator) ![]u8 {
    if (base_log) |b| return b;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    var log: MemLog = .{ .gpa = a };
    var sh = try shard_mod.Shard.init(a, shardConfig(), log.sink(), 2 << 20, 1 << 20);
    const appr = try programs.approval(a, programs.simMeta());
    const loop = try programs.loop(a, programs.simMeta());
    const wf = try std.fmt.allocPrint(a, "{{\"workflowId\":\"w\",\"active\":true}}\n{s}", .{appr});
    const key: [32]u8 = @splat(3);
    _ = try sh.tick(1000, &.{ .{ .kind = .secret, .payload = &key }, .{ .kind = .load_module, .payload = loop }, .{ .kind = .load_workflow, .payload = wf } });
    sh.endBatch();
    var now: i64 = 1000;
    var i: u32 = 0;
    while (i < 12) : (i += 1) {
        now += 10;
        var evs: [4]core.Event = undefined;
        var n: usize = 0;
        const trig = try std.fmt.allocPrint(a, "{{\"cid\":{d},\"n\":2}}", .{i});
        evs[n] = if (i % 2 == 0) .{ .kind = .start, .aux = 0, .payload = trig } else .{ .kind = .manual, .exec_id = core.parseExecId(try std.fmt.allocPrint(a, "{d}", .{100 + i})).?, .payload = try std.fmt.allocPrint(a, "w\n\n{s}", .{trig}) };
        n += 1;
        const tk = try sh.tick(now, evs[0..n]);
        var answers: std.ArrayList(core.Event) = .empty;
        for (tk.actions) |act| if (act.kind == .dispatch and act.effect_kind != .approval) {
            try answers.append(a, .{ .kind = .effect_ok, .exec_id = act.exec_id, .seq = act.seq, .payload = "{\"v\":1}" });
        };
        sh.endBatch();
        if (answers.items.len > 0) {
            _ = try sh.tick(now + 1, answers.items);
            sh.endBatch();
        }
    }
    base_log = try keep.dupe(u8, log.bytes.items);
    return base_log.?;
}

/// Truncated, bit-flipped and reordered logs: the reader gives a prefix of
/// whole records, and recovery either works (the invariants hold) or fails
/// cleanly with an error.
fn fuzzLog(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    // The base log is made once and kept for every input.
    var fba = std.heap.FixedBufferAllocator.init(&base_log_mem);
    const base = try baseLog(gpa, fba.allocator());
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    const bytes = try a.dupe(u8, base);
    var len = bytes.len;
    const mode = smith.valueRangeAtMost(u8, 0, 3);
    switch (mode) {
        0 => len = smith.index(bytes.len + 1),
        1 => {
            var k = smith.valueRangeAtMost(u8, 1, 8);
            while (k > 0) : (k -= 1) bytes[smith.index(bytes.len)] ^= @as(u8, 1) << @intCast(smith.value(u3));
        },
        2 => {
            // Swap two records.
            var starts: [256]usize = undefined;
            var n: usize = 0;
            var r: logfmt.Reader = .{ .bytes = base };
            while (r.next()) |_| : (n += 1) {
                if (n == starts.len) break;
                starts[n] = r.pos;
            }
            if (n < 3) return;
            const x = smith.index(n - 1);
            const ys = if (x == 0) 0 else starts[x - 1];
            const ye = starts[x];
            const ze = starts[x + 1];
            var tmp = try a.alloc(u8, ze - ys);
            @memcpy(tmp[0 .. ze - ye], base[ye..ze]);
            @memcpy(tmp[ze - ye ..], base[ys..ye]);
            @memcpy(bytes[ys..ze], tmp);
        },
        else => {
            // Random bytes after a valid prefix.
            const cut = smith.index(bytes.len + 1);
            smith.bytes(bytes[cut..]);
        },
    }
    const log_bytes = bytes[0..len];
    // The reader: whole records only, ending where it stopped.
    var r: logfmt.Reader = .{ .bytes = log_bytes };
    var evbuf: [64]core.Event = undefined;
    while (r.next()) |b| {
        _ = logfmt.decodeEvents(b, &evbuf) catch {};
    }
    if (r.pos > len) return error.ReaderPastEnd;
    if (mode == 0) {
        // A truncated log keeps every whole record before the cut.
        var full: logfmt.Reader = .{ .bytes = base };
        var whole: usize = 0;
        while (full.next()) |_| {
            if (full.pos <= len) whole = full.pos;
        }
        if (r.pos != whole) return error.TruncatedPrefixLost;
    }
    // Recovery.
    var sh = try shard_mod.Shard.init(a, shardConfig(), null, 2 << 20, 1 << 20);
    _ = sh.recover(log_bytes) catch return;
    try core.checkInvariants(&sh.st);
    _ = sh.resolveInDoubt(5000) catch return;
    sh.endBatch();
    try core.checkInvariants(&sh.st);
}

test "fuzz log reader and recovery" {
    try std.testing.fuzz({}, fuzzLog, .{});
}

// ---- admin request bodies ---------------------------------------------------------

fn fuzzAdmin(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    // The body first, so a seed is just the body.
    const body = input_buf[0..smith.slice(&input_buf)];
    var tbuf: [128]u8 = undefined;
    const target = tbuf[0..smith.slice(&tbuf)];
    const methods = [_][]const u8{ "GET", "PUT", "POST", "DELETE", "PATCH" };
    switch (admin.route(methods[smith.index(methods.len)], target)) {
        .put_workflow, .delete_workflow, .cancel_execution => |id| try within(target, id),
        else => {},
    }
    if (admin.loadPayload(gpa, "wf", body)) |p| {
        defer gpa.free(p);
        const nl = std.mem.indexOfScalar(u8, p, '\n') orelse return error.NoHeaderLine;
        // The header line is JSON that names the workflow.
        const parsed = std.json.parseFromSlice(std.json.Value, gpa, p[0..nl], .{}) catch return error.HeaderNotJson;
        defer parsed.deinit();
        if (!std.mem.eql(u8, parsed.value.object.get("workflowId").?.string, "wf")) return error.WrongWorkflowId;
    } else |_| {}
    if (admin.manualEvent(gpa, body)) |m| {
        defer gpa.free(m.payload);
        if (m.exec_id & core.given_id_flag == 0) return error.ManualIdNotGiven;
        if (std.mem.count(u8, m.payload, "\n") < 2) return error.ManualPayloadShape;
    } else |_| {}
    var head_buf: [256]u8 = undefined;
    const head = head_buf[0..smith.slice(&head_buf)];
    if (admin.authorized(head, "s3cret-s3cret-s3cret") and std.mem.indexOf(u8, head, "s3cret-s3cret-s3cret") == null) return error.AuthWithoutSecret;
    if (admin.authorized(head, "")) return error.AuthWithEmptySecret;
}

/// Service answers (spec 9.9): the parser never reads outside the body, and an
/// accepted message is a JSON string that decodes into its own length.
fn fuzzServiceAnswer(_: void, smith: *Smith) !void {
    const body = input_buf[0..smith.slice(&input_buf)];
    if (admin.parseAnswer(body)) |ans| switch (ans) {
        .ok => |raw| {
            try within(body, raw);
            if (raw.len == 0) return error.EmptyResult;
        },
        .err => |raw| {
            try within(body, raw);
            if (raw.len < 2 or raw[0] != '"') return error.MessageNotString;
            var buf: [input_buf.len]u8 = undefined;
            var out: @import("creds.zig").Out = .{ .buf = buf[0..raw.len] };
            http.unescape(raw, &out) catch |e| switch (e) {
                error.NoSpace => return error.MessageGrew,
                error.BadString => {},
            };
        },
    } else |_| {}
    var ib: [64]u8 = undefined;
    const id = ib[0..smith.slice(&ib)];
    if (admin.parseCallId(id)) |c| {
        var b: [48]u8 = undefined;
        const again = admin.parseCallId(admin.formatCallId(c.exec_id, c.seq, &b)) orelse return error.CallIdRoundTrip;
        if (again.exec_id != c.exec_id or again.seq != c.seq) return error.CallIdRoundTrip;
    }
}

test "fuzz service answers" {
    try std.testing.fuzz({}, fuzzServiceAnswer, .{ .corpus = &.{
        seed("{\"ok\":true,\"result\":{\"count\":1,\"data\":[{\"id\":1}]}}"),
        seed("{\"ok\":false,\"error\":{\"message\":\"unknown column \\u0022x\\u0022\",\"description\":\"d\"}}"),
    } });
}

test "fuzz admin request bodies" {
    try std.testing.fuzz({}, fuzzAdmin, .{ .corpus = &.{
        seed("{\"versionId\":\"v\",\"module\":\"TjhXTQ==\",\"active\":true}"),
        seed("{\"workflowId\":\"w\",\"executionId\":\"12\",\"trigger\":{\"a\":1},\"trace\":true}"),
    } });
}

// ---- credential templates ---------------------------------------------------------

/// Credential values never reach error text, and never split a header line.
fn fuzzCredentials(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    // The template first, so a seed is just the template.
    var tmpl_buf: [256]u8 = undefined;
    const tmpl = tmpl_buf[0..smith.slice(&tmpl_buf)];
    if (std.mem.indexOf(u8, tmpl, "SECRET-") != null) return;
    // A marked secret, so error text that holds it is a real leak.
    var secret_buf: [48]u8 = undefined;
    @memcpy(secret_buf[0..7], "SECRET-");
    const slen = smith.valueRangeAtMost(u8, 8, 48);
    smith.bytes(secret_buf[7..slen]);
    const secret = secret_buf[0..slen];
    var doc: std.ArrayList(u8) = .empty;
    try doc.appendSlice(a, "{\"api\":{\"type\":\"t\",\"data\":{\"token\":");
    try admin.appendJsonString(a, &doc, secret);
    try doc.appendSlice(a, ",\"n\":7},\"inject\":{\"headers\":{\"authorization\":\"Bearer {{$credentials.token}}\"},\"qs\":{\"k\":\"{{$credentials.token}}\"}}}}");
    const store = creds.Store.parse(a, doc.items) catch return;
    var args: std.ArrayList(u8) = .empty;
    try args.appendSlice(a, "{\"url\":");
    var url_text: std.ArrayList(u8) = .empty;
    try url_text.print(a, "http://h/{s}", .{tmpl});
    try admin.appendJsonString(a, &args, url_text.items);
    try args.appendSlice(a, ",\"headers\":{\"x\":");
    try admin.appendJsonString(a, &args, tmpl);
    try args.appendSlice(a, "},\"credential\":\"api\"}");
    var diag: request.Diag = .{};
    const b = request.build(args.items, &store, null, &work_buf, &diag) catch {
        if (std.mem.indexOf(u8, diag.text(), "SECRET-") != null) {
            std.debug.print("secret in error text: {s}\n", .{diag.text()});
            return error.SecretInErrorText;
        }
        return;
    };
    // Header lines: "name: value" each, no line breaks inside values.
    const headers = work_buf[b.url_len..b.hdr_end];
    var it = std.mem.splitSequence(u8, headers, "\r\n");
    while (it.next()) |line| {
        if (line.len == 0) continue;
        if (std.mem.indexOfAny(u8, line, "\r\n") != null) return error.HeaderLineSplit;
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse return error.HeaderWithoutColon;
        for (line[0..colon]) |c| if (c <= ' ' or c >= 0x7f) return error.BadHeaderName;
    }
}

test "fuzz credential templates" {
    try std.testing.fuzz({}, fuzzCredentials, .{ .corpus = &.{ seed("{{$credentials.token}}"), seed("a{{$credentials.n}}b{{$credentials.missing}}"), seed("{{$credentials.") } });
}

// ---- the core as a state machine -------------------------------------------------

/// Random event sequences through a shard with a log: starts, manual runs,
/// effect results, resumes, operator decisions, cancels, workflow loads and
/// unloads, time, and crashes with recovery. After each batch the
/// invariants hold, every pending row belongs to a live or parked
/// execution, and every parked execution has a snapshot. At the end a fresh
/// shard that replays the log reaches the same state.
fn fuzzStateMachine(mods: *const [3][]const u8, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    var log: MemLog = .{ .gpa = a };
    var sh = try a.create(shard_mod.Shard);
    sh.* = try shard_mod.Shard.init(a, shardConfig(), log.sink(), 2 << 20, 1 << 20);
    var now: i64 = 1_000;
    // Dispatches that wait for an answer.
    var open: std.ArrayList(core.Action) = .empty;
    const key: [32]u8 = @splat(5);
    var first = [_]core.Event{ .{ .kind = .secret, .payload = &key }, .{ .kind = .load_module, .payload = mods[0] } };
    _ = try sh.tick(now, &first);
    sh.endBatch();
    var steps: u32 = 0;
    var given: u64 = 1;
    while (steps < 40 and !smith.eos()) : (steps += 1) {
        var evs: [4]core.Event = undefined;
        var n: usize = 0;
        now += smith.valueRangeAtMost(i64, 0, 3000);
        switch (smith.valueRangeAtMost(u8, 0, 9)) {
            0, 1 => evs[0] = .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":2}" },
            2 => {
                given += 1;
                var idb: [24]u8 = undefined;
                evs[0] = .{ .kind = .manual, .exec_id = core.parseExecId(std.fmt.bufPrint(&idb, "{d}", .{given}) catch unreachable).?, .payload = "w\n\n{\"cid\":2}" };
            },
            3, 4 => {
                if (open.items.len == 0) continue;
                const i = smith.index(open.items.len);
                const d = open.swapRemove(i);
                const ok = smith.value(bool);
                evs[0] = .{ .kind = if (ok) .effect_ok else .effect_err, .exec_id = d.exec_id, .seq = d.seq, .payload = if (ok) "{\"approved\":true,\"v\":2}" else "failed" };
            },
            5 => {
                const which = smith.index(2) + 1;
                const p = try std.fmt.allocPrint(a, "{{\"workflowId\":\"w\",\"versionId\":\"{d}\",\"active\":{}}}\n{s}", .{ which, smith.value(bool), mods[which] });
                evs[0] = .{ .kind = .load_workflow, .payload = p };
            },
            6 => evs[0] = .{ .kind = .unload_workflow, .payload = "w" },
            7 => evs[0] = .{ .kind = .operator, .exec_id = smith.valueRangeAtMost(u64, 1, 6), .aux = smith.valueRangeAtMost(u32, 0, 2), .payload = "null" },
            8 => evs[0] = .{ .kind = .cancel, .exec_id = smith.valueRangeAtMost(u64, 1, 6) },
            else => {
                // Crash: lose the actions in flight, recover from the log.
                const fresh = try a.create(shard_mod.Shard);
                fresh.* = try shard_mod.Shard.init(a, shardConfig(), log.sink(), 2 << 20, 1 << 20);
                _ = try fresh.recover(log.bytes.items);
                fresh.replaying = false;
                const tk = try fresh.resolveInDoubt(now);
                open.clearRetainingCapacity();
                for (tk.actions) |act| if (act.kind == .dispatch) try open.append(a, act);
                fresh.endBatch();
                sh = fresh;
                try check(sh);
                continue;
            },
        }
        n = 1;
        const tk = try sh.tick(now, evs[0..n]);
        for (tk.actions) |act| if (act.kind == .dispatch) try open.append(a, act);
        sh.endBatch();
        try check(sh);
        // Runnable work and due timers: as the server loop does.
        var guard: u32 = 0;
        while ((tk.out.has_ready or sh.wakes.items.len > 0) and guard < 20) : (guard += 1) {
            const more = try sh.tick(now, &.{});
            for (more.actions) |act| if (act.kind == .dispatch) try open.append(a, act);
            sh.endBatch();
            try check(sh);
            if (!more.out.has_ready and sh.wakes.items.len == 0) break;
        }
    }
    // A logged final batch, then the same quiet ticks in both shards.
    const end = now + 86_400_000;
    _ = try sh.tick(end, &.{.{ .kind = .set_vars, .payload = "{}" }});
    sh.endBatch();
    try settle(sh, end);
    const replay = try a.create(shard_mod.Shard);
    replay.* = try shard_mod.Shard.init(a, shardConfig(), null, 2 << 20, 1 << 20);
    _ = try replay.recover(log.bytes.items);
    try settle(replay, end);
    try sameState(&sh.st, &replay.st);
}

fn settle(sh: *shard_mod.Shard, now: i64) !void {
    var i: u32 = 0;
    while (i < 50) : (i += 1) {
        const tk = try sh.tick(now, &.{});
        sh.endBatch();
        if (!tk.out.has_ready and sh.wakes.items.len == 0) return;
    }
}

fn check(sh: *shard_mod.Shard) !void {
    try core.checkInvariants(&sh.st);
    // Every pending row belongs to a live or parked execution.
    var it = sh.st.pending.keyIterator();
    while (it.next()) |k| if (!sh.st.knowsExecution(k.exec_id)) return error.PendingWithoutExecution;
    // Every parked execution can be restored.
    var pit = sh.st.parked.keyIterator();
    while (pit.next()) |id| if (!sh.snaps.contains(id.*)) return error.ParkedWithoutSnapshot;
}

fn sameState(x: *const core.State, y: *const core.State) !void {
    try std.testing.expectEqual(x.next_exec, y.next_exec);
    try std.testing.expectEqual(x.liveExecutions(), y.liveExecutions());
    try std.testing.expectEqual(x.parkedCount(), y.parkedCount());
    try std.testing.expectEqual(x.pending.count(), y.pending.count());
    var it = x.parked.keyIterator();
    while (it.next()) |id| if (y.parked.get(id.*) == null) return error.ReplayLostParked;
    var bit = x.by_exec.keyIterator();
    while (bit.next()) |id| if (y.by_exec.get(id.*) == null) return error.ReplayLostLive;
    for (x.modules[0..x.nmodules], 0..) |lm, i| {
        if (lm.state == .empty) continue;
        // Module indices may differ after reclamation; the workflow and its
        // version must not.
        if (lm.state == .live and lm.wf_id_len > 0) {
            const j = y.liveWorkflow(lm.workflowId()) orelse return error.ReplayLostWorkflow;
            try std.testing.expectEqualStrings(lm.versionId(), y.modules[j].versionId());
            try std.testing.expectEqual(lm.refs, y.modules[j].refs);
        }
        _ = i;
    }
    if (y.liveWorkflow("w") != null and x.liveWorkflow("w") == null) return error.ReplayHasExtraWorkflow;
}

test "fuzz core state machine" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const mods = try a.create([3][]const u8);
    mods.* = .{
        try programs.loop(a, programs.simMeta()),
        try programs.approval(a, "{\"durability\":\"sync\",\"v\":1}"),
        try programs.waitThen(a, "{\"durability\":\"batched\",\"v\":2}"),
    };
    try std.testing.fuzz(@as(*const [3][]const u8, mods), fuzzStateMachine, .{ .corpus = &.{ "\x00\x02\x03\x04\x05\x09\x03\x06\x09", "\x05\x05\x02\x02\x09\x03\x03\x03\x07\x08" } });
}

// ---- respond headers and the member scanner -----------------------------------------

/// Header lines from `ctx.respond` never split a line or frame the body,
/// and the scanner that finds members stays inside its input.
fn fuzzRespondHeaders(_: void, smith: *Smith) !void {
    const raw = input_buf[0..smith.slice(&input_buf)];
    var mem: [64 << 10]u8 = undefined;
    var fba = std.heap.FixedBufferAllocator.init(&mem);
    const h = http.userHeaders(fba.allocator(), raw) catch return;
    var it = std.mem.splitSequence(u8, h.lines, "\r\n");
    while (it.next()) |line| {
        if (line.len == 0) continue;
        if (std.mem.indexOfAny(u8, line, "\r\n\x00") != null) return error.HeaderLineBreak;
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse return error.HeaderWithoutColon;
        const name = line[0..colon];
        if (std.ascii.eqlIgnoreCase(name, "content-length") or std.ascii.eqlIgnoreCase(name, "transfer-encoding")) return error.FramingHeader;
    }
    if (h.content_type) |ct| if (std.mem.indexOfAny(u8, ct, "\r\n") != null) return error.ContentTypeLineBreak;
    const names = [_][]const u8{ "id", "ok", "result", "error", "body", "headers" };
    for (names) |n| if (http.member(raw, n)) |v| try within(raw, v);
    // The iterators end, and stay inside their input.
    if (http.Members.init(raw)) |m0| {
        var m = m0;
        var k: usize = 0;
        while (m.next()) |mm| : (k += 1) {
            if (k > raw.len) return error.MembersDoNotEnd;
            try within(raw, mm.key);
            try within(raw, mm.value);
        }
    }
    if (http.Elements.init(raw)) |e0| {
        var e = e0;
        var k: usize = 0;
        while (e.next()) |el| : (k += 1) {
            if (k > raw.len) return error.ElementsDoNotEnd;
            try within(raw, el);
        }
    }
}

test "fuzz respond headers and member scanner" {
    try std.testing.fuzz({}, fuzzRespondHeaders, .{ .corpus = &.{
        seed("{\"x-a\":\"1\",\"content-type\":\"text/html\",\"set-cookie\":\"a=b\"}"),
        seed("{\"bad name\":\"v\",\"x\":\"a\\r\\nb\",\"content-length\":\"9\"}"),
        seed("{\"id\":\"1:0\",\"ok\":true,\"result\":{\"v\":1}}"),
        seed("[}]"),
        seed("{\"a\"}"),
    } });
}

// ---- fallback host control frames ------------------------------------------------

const fbf = @import("fallback_frames.zig");

/// Any frame from the host: `parse` never fails, a hello gives a version of
/// 2 or more and a connection count within the limit, a `worker_lost`
/// reason fits its buffer and makes a message, and a hello that the fuzzer
/// builds from two numbers parses back to them.
fn fuzzFallbackControl(_: void, smith: *Smith) !void {
    const n = smith.slice(&input_buf);
    const frame = input_buf[0..n];
    switch (fbf.parse(frame)) {
        .hello => |h| {
            if (h.version < 2) return error.HelloVersion;
            const conns = fbf.connectionsFor(h.workers);
            if (conns < 1 or conns > fbf.max_conns) return error.HelloConnections;
        },
        .service => |id| if (id.len == 0) return error.ServiceWithoutId,
        .worker_lost => |reason| {
            if (reason.len > fbf.max_reason) return error.ReasonTooLong;
            var msg: [fbf.max_stopped_msg]u8 = undefined;
            const text = fbf.stoppedMessage(&msg, reason);
            if (!std.mem.startsWith(u8, text, fbf.stopped_prefix) or !std.mem.endsWith(u8, text, reason)) return error.StoppedMessage;
        },
        .goaway, .none => {},
    }
    const version = smith.value(u16) | 2;
    const workers = smith.value(u16);
    var buf: [128]u8 = undefined;
    const built = std.fmt.bufPrint(&buf, "{{\"hello\":{{\"version\":{d},\"workers\":{d},\"worker\":0}}}}", .{ version, workers }) catch unreachable;
    switch (fbf.parse(built)) {
        .hello => |h| if (h.version != version or h.workers != workers) return error.HelloRoundTrip,
        else => return error.HelloNotParsed,
    }
}

test "fuzz fallback host control frames" {
    try std.testing.fuzz({}, fuzzFallbackControl, .{ .corpus = &.{
        seed("{\"hello\":{\"version\":2,\"workers\":2,\"worker\":0}}"),
        seed("{\"goaway\":{}}"),
        seed("{\"id\":\"\",\"ok\":false,\"error\":\"Request has no string \\\"id\\\"\"}"),
        seed("{\"hello\":{\"version\":99999999999}}"),
        seed("{\"hello\":{}}"),
        seed("{\"type\":\"service\",\"id\":\"3:1\",\"service\":\"deduplication\",\"op\":\"getProcessedDataCount\",\"args\":{}}"),
        seed("{\"type\":\"service\",\"id\":3}"),
        seed("{\"worker_lost\":{\"reason\":\"it ran out of memory\"}}"),
        seed("{\"worker_lost\":{\"reason\":\"a \\\"quoted\\\" reason\"}}"),
        seed("{\"worker_lost\":{}}"),
        seed("{\"worker_lost\":\"x\"}"),
    } });
}

var service_out_buf: [(256 << 10) + 256]u8 = undefined;

/// A service result for any ids, any message and any room: either a limit,
/// or one whole frame whose length is right, whose id, `n` and `ok` read
/// back, and that the shell never takes for a control frame.
fn fuzzServiceResult(_: void, smith: *Smith) !void {
    const n = smith.slice(&input_buf);
    const exec_id = smith.value(u64);
    const seq = smith.value(u32);
    const sub = smith.value(u32) | 1;
    const ok = smith.value(u8) & 1 == 1;
    const room = smith.value(u16);
    // The message is a JSON string, as the admin answer carries it.
    var ar = Arena.init(&work_buf);
    var b = ar.builder();
    core_lib.json.writeString(&b, input_buf[0..n]) catch return;
    const raw = b.bytes();
    var w: std.ArrayList(u8) = .initBuffer(service_out_buf[0..@min(service_out_buf.len, @as(usize, room) * 8)]);
    fbf.appendServiceResult(&w, exec_id, seq, sub, ok, raw) catch return;
    const len = std.mem.readInt(u32, w.items[0..4], .little);
    if (len != w.items.len - 4) return error.FrameLength;
    const body = w.items[4..];
    if (fbf.parse(body) != .none) return error.ReadAsControl;
    var idb: [48]u8 = undefined;
    const want_id = std.fmt.bufPrint(&idb, "{d}:{d}", .{ exec_id, seq }) catch unreachable;
    const id = http.plainString(http.member(body, "id") orelse return error.NoId) orelse return error.IdNotPlain;
    if (!std.mem.eql(u8, id, want_id)) return error.IdRoundTrip;
    const got_n = std.fmt.parseInt(u32, http.member(body, "n") orelse return error.NoN, 10) catch return error.BadN;
    if (got_n != sub) return error.NRoundTrip;
    const got_ok = std.mem.eql(u8, http.member(body, "ok") orelse return error.NoOk, "true");
    if (got_ok != ok) return error.OkRoundTrip;
    const value = http.member(body, if (ok) "result" else "error") orelse return error.NoValue;
    if (!std.mem.eql(u8, value, raw)) return error.ValueRoundTrip;
}

test "fuzz fallback host service results" {
    try std.testing.fuzz({}, fuzzServiceResult, .{ .corpus = &.{
        seed("{\"new\":[1],\"processed\":[]}"),
        seed("service: the call timed out (--service-timeout-ms)"),
        seed("\"quoted\" \\ \u{0}\n"),
        seed(""),
    } });
}

// ---- HTTP/2 frames and HPACK -------------------------------------------------------

const http2 = @import("http2.zig");
const hpack = @import("hpack.zig");

/// What the frame reader reports, as text, and checks of its own
/// promises: content of a DATA frame never exceeds its flow-controlled
/// length; a header block never exceeds the reader's buffer.
const FrameLog = struct {
    buf: [8192]u8 = undefined,
    len: usize = 0,
    data_left: u32 = 0,
    in_data: bool = false,
    /// The content of the DATA frame so far (it can come in pieces).
    data_hash: std.hash.Wyhash = .init(0),
    broken: ?[]const u8 = null,
    pub const Err = error{};

    fn put(l: *FrameLog, comptime fmt: []const u8, args: anytype) void {
        const w = std.fmt.bufPrint(l.buf[l.len..], fmt, args) catch return;
        l.len += w.len;
    }
    pub fn onDataStart(l: *FrameLog, s: u32, n: u32, e: bool) Err!void {
        if (s == 0) l.broken = "DATA on stream 0";
        l.in_data = true;
        l.data_left = n;
        l.data_hash = .init(0);
        l.put("D{d}:{d}:{any};", .{ s, n, e });
    }
    pub fn onData(l: *FrameLog, s: u32, b: []const u8) Err!void {
        if (!l.in_data or b.len > l.data_left or b.len == 0) l.broken = "DATA content beyond the frame";
        l.data_left -|= @intCast(b.len);
        l.data_hash.update(b);
        _ = s;
    }
    pub fn onDataEnd(l: *FrameLog, s: u32, e: bool) Err!void {
        l.in_data = false;
        l.put("E{d}:{x}:{any};", .{ s, l.data_hash.final(), e });
    }
    pub fn onHeaders(l: *FrameLog, s: u32, block: []const u8, e: bool) Err!void {
        if (s == 0) l.broken = "HEADERS on stream 0";
        l.put("H{d}:{x}:{any};", .{ s, std.hash.Wyhash.hash(0, block), e });
    }
    pub fn onRst(l: *FrameLog, s: u32, c: http2.ErrorCode) Err!void {
        l.put("R{d}:{d};", .{ s, @backingInt(c) });
    }
    pub fn onSetting(l: *FrameLog, id: u16, v: u32) Err!void {
        l.put("S{d}={d};", .{ id, v });
    }
    pub fn onSettingsEnd(l: *FrameLog, ack: bool) Err!void {
        l.put("S{any};", .{ack});
    }
    pub fn onPing(l: *FrameLog, d: [8]u8, ack: bool) Err!void {
        l.put("P{x}{any};", .{ std.mem.readInt(u64, &d, .little), ack });
    }
    pub fn onGoaway(l: *FrameLog, last: u32, c: http2.ErrorCode) Err!void {
        l.put("G{d}:{d};", .{ last, @backingInt(c) });
    }
    pub fn onWindowUpdate(l: *FrameLog, s: u32, inc: u32) Err!void {
        l.put("W{d}+{d};", .{ s, inc });
    }
};

/// Random bytes through the frame reader, whole and split at a random
/// point: the same reports and the same error either way.
fn fuzzHttp2Frames(_: void, smith: *Smith) !void {
    const len = smith.slice(&input_buf);
    const in = input_buf[0..len];
    var block_a: [4096]u8 = undefined;
    var block_b: [4096]u8 = undefined;
    var a = http2.Reader.init(&block_a, http2.default_max_frame);
    var b = http2.Reader.init(&block_b, http2.default_max_frame);
    var la: FrameLog = .{};
    var lb: FrameLog = .{};
    const ra = a.feed(in, &la);
    const split = if (len == 0) 0 else smith.valueRangeAtMost(u32, 0, @intCast(len));
    const rb = blk: {
        b.feed(in[0..split], &lb) catch |e| break :blk e;
        break :blk b.feed(in[split..], &lb);
    };
    if (la.broken != null) return error.ReaderBroken;
    if (lb.broken != null) return error.ReaderBroken;
    if (ra) |_| {
        _ = try rb;
        try std.testing.expectEqualStrings(la.buf[0..la.len], lb.buf[0..lb.len]);
    } else |ea| {
        if (rb) |_| return error.SplitChangedResult else |eb| if (ea != eb) return error.SplitChangedError;
    }
}

fn frameSeed(comptime frames: []const struct { ty: u8, flags: u8, stream: u32, payload: []const u8 }) []const u8 {
    comptime var out: []const u8 = "";
    inline for (frames) |f| {
        const h = [_]u8{ 0, @intCast(f.payload.len >> 8), @intCast(f.payload.len & 0xff), f.ty, f.flags, @intCast(f.stream >> 24), @intCast((f.stream >> 16) & 0xff), @intCast((f.stream >> 8) & 0xff), @intCast(f.stream & 0xff) };
        out = out ++ &h ++ f.payload;
    }
    return out;
}

test "fuzz http2 frame reader" {
    try std.testing.fuzz({}, fuzzHttp2Frames, .{
        .corpus = &.{
            seed(frameSeed(&.{
                .{ .ty = 4, .flags = 0, .stream = 0, .payload = &.{ 0, 3, 0, 0, 0, 100 } },
                .{ .ty = 1, .flags = 0x8 | 0x20, .stream = 1, .payload = &.{ 1, 0, 0, 0, 0, 16, 0x88, 0 } },
                .{ .ty = 9, .flags = 4, .stream = 1, .payload = &.{0x5f} },
                .{ .ty = 0, .flags = 0x8, .stream = 1, .payload = &.{ 2, 'h', 'i', 0, 0 } },
                .{ .ty = 0, .flags = 1, .stream = 1, .payload = "end" },
                .{ .ty = 8, .flags = 0, .stream = 0, .payload = &.{ 0, 0, 1, 0 } },
                .{ .ty = 6, .flags = 0, .stream = 0, .payload = "pingping" },
                .{ .ty = 3, .flags = 0, .stream = 3, .payload = &.{ 0, 0, 0, 8 } },
                .{ .ty = 7, .flags = 0, .stream = 0, .payload = &.{ 0, 0, 0, 1, 0, 0, 0, 0, 'x' } },
            })),
            seed(frameSeed(&.{.{ .ty = 1, .flags = 0, .stream = 1, .payload = &.{0x82} }})),
        },
    });
}

const FieldLog = struct {
    buf: [8192]u8 = undefined,
    len: usize = 0,
    pub const Err = error{};
    pub fn field(l: *FieldLog, name: []const u8, value: []const u8) Err!void {
        const w = std.fmt.bufPrint(l.buf[l.len..], "{s}\x00{s}\x00", .{ name, value }) catch return;
        l.len += w.len;
    }
};

/// Random header blocks through a decoder with a small table: the table
/// stays within its size, and a valid block decodes the same after a
/// table round trip. Then random fields through the encoder decode back
/// to themselves, and random bytes through Huffman and back.
fn fuzzHpack(_: void, smith: *Smith) !void {
    var ring: [256]u8 = undefined;
    var ents: [hpack.entriesFor(256)]hpack.Entry = undefined;
    var scratch: [512]u8 = undefined;
    var d = hpack.Decoder.init(&ring, &ents, &scratch);
    var blocks: u32 = 0;
    while (blocks < 4) : (blocks += 1) {
        var bbuf: [1024]u8 = undefined;
        const block = bbuf[0..smith.slice(&bbuf)];
        var log: FieldLog = .{};
        d.decode(block, &log) catch {
            d.reset();
            continue;
        };
        if (d.size > d.max_size or d.count > ents.len) return error.TableOverflow;
    }
    // Encoder round trip.
    var names: [4][32]u8 = undefined;
    var values: [4][96]u8 = undefined;
    var nl: [4]usize = undefined;
    var vl: [4]usize = undefined;
    var enc: [4096]u8 = undefined;
    var n: usize = 0;
    var want: FieldLog = .{};
    for (0..4) |i| {
        nl[i] = smith.slice(&names[i]);
        if (nl[i] == 0) nl[i] = 1;
        for (names[i][0..nl[i]]) |*c| c.* = 'a' + c.* % 26;
        vl[i] = smith.slice(&values[i]);
        try hpack.encodeField(&enc, &n, names[i][0..nl[i]], values[i][0..vl[i]], smith.value(bool));
        try want.field(names[i][0..nl[i]], values[i][0..vl[i]]);
    }
    var got: FieldLog = .{};
    d.reset();
    try d.decode(enc[0..n], &got);
    try std.testing.expectEqualStrings(want.buf[0..want.len], got.buf[0..got.len]);
    var raw: [256]u8 = undefined;
    const s = raw[0..smith.slice(&raw)];
    var hb: [1024]u8 = undefined;
    var hn: usize = 0;
    try hpack.huffmanEncode(s, &hb, &hn);
    var back: [256]u8 = undefined;
    try std.testing.expectEqualSlices(u8, s, try hpack.huffmanDecode(hb[0..hn], &back));
}

test "fuzz hpack decoder" {
    try std.testing.fuzz({}, fuzzHpack, .{
        .corpus = &.{
            seed("\x82\x86\x84\x41\x0f\x77\x77\x77\x2e\x65\x78\x61\x6d\x70\x6c\x65\x2e\x63\x6f\x6d"),
            seed("\x48\x82\x64\x02\x58\x85\xae\xc3\x77\x1a\x4b\x61\x96\xd0\x7a\xbe\x94\x10\x54\xd4\x44\xa8\x20\x05\x95\x04\x0b\x81\x66\xe0\x82\xa6\x2d\x1b\xff"),
            seed("\x3f\xe1\x1f\x82"),
        },
    });
}

// ---- qs in brackets form -------------------------------------------------------------

/// Random `qs` objects (leaves, arrays, objects, arrays of objects, empty
/// containers, odd keys and values). The generator writes the JSON and the
/// qs library's output side by side; `request.build` must write the same.
fn fuzzQsBrackets(_: void, smith: *Smith) !void {
    var json_buf: [8192]u8 = undefined;
    var want_buf: [32768]u8 = undefined;
    var j = std.Io.Writer.fixed(&json_buf);
    var w = std.Io.Writer.fixed(&want_buf);
    const alphabet = "ab z[]%&=é~*!\"\\";
    j.writeAll("{\"url\":\"https://x.io/p\",\"qsFormat\":\"brackets\",\"qs\":{") catch return;
    var first_pair = true;
    const n_top = smith.valueRangeAtMost(u8, 0, 6);
    var key: [8]u8 = undefined;
    for (0..n_top) |ti| {
        const klen = smith.valueRangeAtMost(u8, 1, 4);
        for (key[0..klen], 0..) |*c, i| c.* = if (i == 0) 'k' else alphabet[smith.valueRangeAtMost(u8, 0, 11)];
        // Keys must be unique in one object: add the index.
        var kb: [16]u8 = undefined;
        const k = std.fmt.bufPrint(&kb, "{s}{d}", .{ key[0..klen], ti }) catch return;
        if (ti > 0) j.writeAll(",") catch return;
        jsonStr(&j, k) catch return;
        j.writeAll(":") catch return;
        const kind = smith.valueRangeAtMost(u8, 0, 4);
        switch (kind) {
            0 => try leaf(smith, &j, &w, k, &first_pair),
            1, 3 => {
                j.writeAll("[") catch return;
                const n = smith.valueRangeAtMost(u8, 0, 3);
                for (0..n) |i| {
                    if (i > 0) j.writeAll(",") catch return;
                    var pb: [48]u8 = undefined;
                    const p = std.fmt.bufPrint(&pb, "{s}[{d}]", .{ k, i }) catch return;
                    if (kind == 3) {
                        j.writeAll("{") catch return;
                        const m = smith.valueRangeAtMost(u8, 0, 2);
                        for (0..m) |mi| {
                            if (mi > 0) j.writeAll(",") catch return;
                            var qb: [64]u8 = undefined;
                            const name = if (mi == 0) "f" else "g h";
                            const q = std.fmt.bufPrint(&qb, "{s}[{s}]", .{ p, name }) catch return;
                            jsonStr(&j, name) catch return;
                            j.writeAll(":") catch return;
                            try leaf(smith, &j, &w, q, &first_pair);
                        }
                        j.writeAll("}") catch return;
                    } else try leaf(smith, &j, &w, p, &first_pair);
                }
                j.writeAll("]") catch return;
            },
            else => {
                j.writeAll("{") catch return;
                const m = smith.valueRangeAtMost(u8, 0, 3);
                for (0..m) |mi| {
                    if (mi > 0) j.writeAll(",") catch return;
                    var nb: [8]u8 = undefined;
                    const name = std.fmt.bufPrint(&nb, "m{d}", .{mi}) catch return;
                    var qb: [64]u8 = undefined;
                    const q = std.fmt.bufPrint(&qb, "{s}[{s}]", .{ k, name }) catch return;
                    jsonStr(&j, name) catch return;
                    j.writeAll(":") catch return;
                    try leaf(smith, &j, &w, q, &first_pair);
                }
                j.writeAll("}") catch return;
            },
        }
    }
    j.writeAll("}}") catch return;
    var out: [65536]u8 = undefined;
    var diag: request.Diag = .{};
    const b = request.build(j.buffered(), null, null, &out, &diag) catch |e| {
        if (e == error.NoSpace) return;
        std.debug.print("qs fuzz: {s}\n", .{diag.text()});
        return error.QsBuildFailed;
    };
    const url = out[0..b.url_len];
    const got = if (std.mem.indexOfScalar(u8, url, '?')) |i| url[i + 1 ..] else "";
    try std.testing.expectEqualStrings(w.buffered(), got);
}

/// A random leaf: its JSON, and the qs pair it gives.
fn leaf(smith: *Smith, j: *std.Io.Writer, w: *std.Io.Writer, key: []const u8, first: *bool) !void {
    const vals = [_][2][]const u8{
        .{ "\"v\"", "v" },            .{ "\"a b&c=d\"", "a%20b%26c%3Dd" }, .{ "\"~*()!'\"", "~%2A%28%29%21%27" },
        .{ "\"\\u00e9\"", "%C3%A9" }, .{ "12", "12" },                     .{ "-1.5", "-1.5" },
        .{ "true", "true" },          .{ "false", "false" },               .{ "null", "" },
        .{ "\"\"", "" },
    };
    const v = vals[smith.valueRangeAtMost(u8, 0, vals.len - 1)];
    j.writeAll(v[0]) catch return error.Full;
    if (!first.*) w.writeAll("&") catch return error.Full;
    first.* = false;
    qsEnc(w, key) catch return error.Full;
    w.writeAll("=") catch return error.Full;
    w.writeAll(v[1]) catch return error.Full;
}

fn qsEnc(w: *std.Io.Writer, s: []const u8) !void {
    for (s) |c| {
        if (std.ascii.isAlphanumeric(c) or c == '-' or c == '.' or c == '_' or c == '~') try w.writeByte(c) else try w.print("%{X:0>2}", .{c});
    }
}

fn jsonStr(j: *std.Io.Writer, s: []const u8) !void {
    try j.writeByte('"');
    for (s) |c| switch (c) {
        '"' => try j.writeAll("\\\""),
        '\\' => try j.writeAll("\\\\"),
        else => try j.writeByte(c),
    };
    try j.writeByte('"');
}

test "fuzz qs brackets form" {
    try std.testing.fuzz({}, fuzzQsBrackets, .{});
}
