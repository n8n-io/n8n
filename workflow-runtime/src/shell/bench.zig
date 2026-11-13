//! In-process benchmarks (W1) and the operation-count check.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const shard_mod = @import("shard.zig");
const programs = @import("programs.zig");
const sys = @import("sys.zig");

/// Set by main: the only place that names a global allocator.
pub var backing: std.mem.Allocator = undefined;

pub const W1Options = struct { seconds: u32 = 3, batch: u32 = 256, threads: u32 = 1 };

const W1Result = struct { execs: u64 = 0, instructions: u64 = 0, batches: u64 = 0, ns: u64 = 0 };

fn trigger1k(buf: []u8) []const u8 {
    var w = std.Io.Writer.fixed(buf);
    w.writeAll("{\"order\":{\"id\":\"A-1001\",\"items\":[") catch unreachable; // buf is large enough.
    var i: u32 = 0;
    while (i < 12) : (i += 1) {
        if (i > 0) w.writeAll(",") catch unreachable; // buf is large enough.
        w.print("{{\"sku\":\"SKU-{d:0>4}\",\"qty\":{d},\"price\":{d}.5,\"note\":\"standard item\"}}", .{ i, i % 3 + 1, i * 7 }) catch unreachable; // buf is large enough.
    }
    w.writeAll("],\"customer\":{\"name\":\"Ada Lovelace\",\"email\":\"ada@example.com\",\"tier\":\"gold\"}}}") catch unreachable; // buf is large enough.
    return w.buffered();
}

fn w1Thread(opts: W1Options, module: []const u8, res: *W1Result) void {
    w1Inner(opts, module, res) catch |e| std.debug.print("w1: {s}\n", .{@errorName(e)});
}

fn w1Inner(opts: W1Options, module: []const u8, res: *W1Result) !void {
    var arena = std.heap.ArenaAllocator.init(backing);
    defer arena.deinit();
    const a = arena.allocator();
    var sh = try shard_mod.Shard.init(a, .{ .slots = opts.batch * 2, .region_sizes = .{ 16 << 10, 64 << 10, 1 << 20, 16 << 20 }, .region_counts = .{ opts.batch * 2, 64, 4, 1 }, .max_batch_events = opts.batch + 8, .max_actions = opts.batch * 4 + 64 }, null, 16 << 20, 1 << 20);
    var tb: [2048]u8 = undefined;
    const trig = trigger1k(&tb);
    const load = [_]core.Event{.{ .kind = .load_module, .payload = module }};
    _ = try sh.tick(0, &load);
    sh.endBatch();
    const evs = try a.alloc(core.Event, opts.batch);
    for (evs) |*e| e.* = .{ .kind = .start, .aux = 0, .payload = trig };
    const start = sys.nowNs();
    const end = start + @as(u64, opts.seconds) * 1_000_000_000;
    var now: i64 = 1;
    while (sys.nowNs() < end) {
        _ = try sh.tick(now, evs);
        sh.endBatch();
        now += 1;
    }
    res.ns = sys.nowNs() - start;
    res.execs = sh.st.counters.finished_ok;
    if (sh.st.counters.finished_failed > 0) std.debug.print("w1: {d} executions failed\n", .{sh.st.counters.finished_failed});
    res.instructions = sh.st.counters.instructions;
    res.batches = sh.counters.batches;
}

pub fn runW1(gpa: std.mem.Allocator, out: *std.Io.Writer, opts: W1Options) !void {
    const module = try programs.glue(gpa, "{\"durability\":\"none\"}");
    defer gpa.free(module);
    const res = try gpa.alloc(W1Result, opts.threads);
    defer gpa.free(res);
    const ths = try gpa.alloc(std.Thread, opts.threads);
    defer gpa.free(ths);
    for (res) |*r| r.* = .{};
    for (ths, 0..) |*t, i| t.* = try std.Thread.spawn(.{}, w1Thread, .{ opts, module, &res[i] });
    for (ths) |t| t.join();
    var total: u64 = 0;
    var instr: u64 = 0;
    var secs: f64 = 0;
    for (res) |r| {
        total += r.execs;
        instr += r.instructions;
        secs = @max(secs, @as(f64, @floatFromInt(r.ns)) / 1e9);
    }
    const rate = @as(f64, @floatFromInt(total)) / secs;
    try out.print("W1 glue: threads={d} batch={d} executions={d} rate={d:.0}/s per_core={d:.0}/s instructions_per_exec={d}\n", .{
        opts.threads, opts.batch, total, rate, rate / @as(f64, @floatFromInt(opts.threads)), if (total > 0) instr / total else 0,
    });
}

const CountingLog = struct {
    appends: u64 = 0,
    syncs: u64 = 0,
    bytes: u64 = 0,
    fn append(ctx: *anyopaque, b: []const u8) anyerror!void {
        const l: *CountingLog = @ptrCast(@alignCast(ctx));
        l.appends += 1;
        l.bytes += b.len;
    }
    fn sync(ctx: *anyopaque) anyerror!void {
        const l: *CountingLog = @ptrCast(@alignCast(ctx));
        l.syncs += 1;
    }
};

/// Fixed costs are paid once per batch: a batch of 1 and a batch of 1,000
/// executions make the same number of log appends and syncs.
pub fn runCounts(gpa: std.mem.Allocator, out: *std.Io.Writer) !bool {
    const module = try programs.webhookReply(gpa, "{\"durability\":\"sync\"}", .http);
    defer gpa.free(module);
    var ok = true;
    var per_batch: [2][2]u64 = undefined;
    for ([_]u32{ 1, 1000 }, 0..) |n, k| {
        var arena = std.heap.ArenaAllocator.init(gpa);
        defer arena.deinit();
        const a = arena.allocator();
        var log: CountingLog = .{};
        var sh = try shard_mod.Shard.init(a, .{ .slots = 2048, .region_counts = .{ 2048, 16, 4, 1 }, .max_batch_events = 2048, .max_actions = 8192 }, .{ .ctx = &log, .appendFn = CountingLog.append, .syncFn = CountingLog.sync }, 16 << 20, 16 << 20);
        _ = try sh.tick(0, &.{.{ .kind = .load_module, .payload = module }});
        sh.endBatch();
        const a0 = log.appends;
        const s0 = log.syncs;
        const evs = try a.alloc(core.Event, n);
        for (evs) |*e| e.* = .{ .kind = .start, .aux = 0, .payload = "{\"body\":{\"id\":1}}" };
        const tk = try sh.tick(1, evs);
        var dispatches: u64 = 0;
        for (tk.actions) |act| if (act.kind == .dispatch) {
            dispatches += 1;
        };
        sh.endBatch();
        per_batch[k] = .{ log.appends - a0, log.syncs - s0 };
        try out.print("batch of {d}: log appends={d} syncs={d} dispatch actions={d} log bytes={d} ({d} per execution)\n", .{ n, log.appends - a0, log.syncs - s0, dispatches, log.bytes, log.bytes / n });
    }
    if (per_batch[0][0] != per_batch[1][0] or per_batch[0][1] != per_batch[1][1]) ok = false;
    try out.print("operation counts {s}\n", .{if (ok) "equal: PASS" else "differ: FAIL"});
    return ok;
}

/// W5: park many executions on an approval, then resume them all. Reports
/// snapshot bytes and memory per parked execution and resume throughput.
pub fn runW5(gpa: std.mem.Allocator, out: *std.Io.Writer, n: u32) !void {
    _ = gpa;
    var arena = std.heap.ArenaAllocator.init(backing);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.approval(a, "{\"durability\":\"none\"}");
    const batch: u32 = 4096;
    var sh = try shard_mod.Shard.init(a, .{
        .slots = batch * 2,
        .region_counts = .{ batch * 2, 64, 4, 1 },
        .max_parked = n + 1024,
        .max_pending = n + 1024,
        .max_batch_events = batch * 2 + 8,
        .max_actions = batch * 8,
    }, null, 64 << 20, 1 << 20);
    _ = try sh.tick(0, &.{.{ .kind = .load_module, .payload = module }});
    sh.endBatch();
    const evs = try a.alloc(core.Event, batch * 2);
    const ids = try a.alloc(u64, n);
    const seqs = try a.alloc(u32, n);
    var started: u32 = 0;
    var snap_bytes: u64 = 0;
    var parked_seen: u32 = 0;
    const t0 = sys.nowNs();
    while (started < n) {
        const k = @min(batch, n - started);
        for (evs[0..k], 0..) |*e, i| e.* = .{ .kind = .start, .aux = 0, .payload = try std.fmt.allocPrint(a, "{{\"cid\":{d}}}", .{started + i}) };
        const tk = try sh.tick(1, evs[0..k]);
        for (tk.actions) |act| switch (act.kind) {
            .dispatch => {
                ids[parked_seen] = act.exec_id;
                seqs[parked_seen] = act.seq;
                parked_seen += 1;
            },
            .snapshot => snap_bytes += act.payload.len,
            else => {},
        };
        sh.endBatch();
        started += k;
    }
    const t1 = sys.nowNs();
    const live = sh.st.liveExecutions();
    const parked = sh.st.parkedCount();
    // Resume: one answer per execution. The shard restores each snapshot
    // in the same batch that receives the answer.
    var done: u32 = 0;
    var i: u32 = 0;
    const t2 = sys.nowNs();
    while (i < parked_seen) {
        const k = @min(batch, parked_seen - i);
        for (evs[0..k], 0..) |*e, j| e.* = .{ .kind = .effect_ok, .exec_id = ids[i + j], .seq = seqs[i + j], .payload = "{\"approved\":false}" };
        const tk = try sh.tick(2, evs[0..k]);
        for (tk.actions) |act| if (act.kind == .finished) {
            done += 1;
        };
        sh.endBatch();
        i += k;
    }
    const t3 = sys.nowNs();
    const index_bytes = (sh.st.parked.capacity() * (@sizeOf(u64) + @sizeOf(core.Parked) + 1)) / @max(1, n);
    try out.print("W5: parked={d} live_in_memory={d} snapshot_bytes_per_exec={d} index_bytes_per_exec~{d} park_rate={d:.0}/s resumed={d} resume_rate={d:.0}/s\n", .{
        parked,                                                                live, snap_bytes / @max(1, parked_seen),                                        index_bytes,
        @as(f64, @floatFromInt(n)) / (@as(f64, @floatFromInt(t1 - t0)) / 1e9), done, @as(f64, @floatFromInt(done)) / (@as(f64, @floatFromInt(t3 - t2)) / 1e9),
    });
}

/// W6: a loop of 100 effects per execution, answered at once. Measures the
/// cost of one suspend, dispatch and resume round trip in the core.
pub fn runW6(out: *std.Io.Writer, execs: u32) !void {
    var arena = std.heap.ArenaAllocator.init(backing);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, "{\"durability\":\"none\"}");
    var sh = try shard_mod.Shard.init(a, .{ .slots = execs * 2, .region_sizes = .{ 16 << 10, 64 << 10, 1 << 20, 16 << 20 }, .region_counts = .{ execs * 2, 256, 4, 1 }, .max_pending = execs * 4, .max_batch_events = execs * 2 + 8, .max_actions = execs * 8 }, null, 64 << 20, 1 << 20);
    _ = try sh.tick(0, &.{.{ .kind = .load_module, .payload = module }});
    sh.endBatch();
    var evs: std.ArrayList(core.Event) = .empty;
    for (0..execs) |i| try evs.append(a, .{ .kind = .start, .aux = 0, .payload = try std.fmt.allocPrint(a, "{{\"cid\":{d},\"n\":100}}", .{i}) });
    var effects: u64 = 0;
    var finished: u64 = 0;
    const t0 = sys.nowNs();
    var next: std.ArrayList(core.Event) = .empty;
    while (finished < execs) {
        const tk = try sh.tick(1, evs.items);
        next.clearRetainingCapacity();
        for (tk.actions) |act| switch (act.kind) {
            .dispatch => {
                effects += 1;
                try next.append(a, .{ .kind = .effect_ok, .exec_id = act.exec_id, .seq = act.seq, .payload = "{\"v\":1}" });
            },
            .finished => finished += 1,
            else => {},
        };
        sh.endBatch();
        std.mem.swap(std.ArrayList(core.Event), &evs, &next);
    }
    const secs = @as(f64, @floatFromInt(sys.nowNs() - t0)) / 1e9;
    if (sh.st.counters.finished_failed > 0) try out.print("W6: {d} executions failed\n", .{sh.st.counters.finished_failed});
    try out.print("W6 loop of 100 effects: executions={d} effects={d} effect_round_trips={d:.0}/s executions={d:.0}/s batches={d}\n", .{ execs, effects, @as(f64, @floatFromInt(effects)) / secs, @as(f64, @floatFromInt(execs)) / secs, sh.counters.batches });
}
