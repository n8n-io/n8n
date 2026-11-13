//! Floor 4 (wfrt today): the CPU of the deterministic core, measured in
//! process with no sockets, through the same `Shard.tick` that `serve`
//! uses. Effects are answered at once with canned responses.
//!
//!   core w1                       glue only (hand-assembled), per op
//!   core w2                       webhook in, reply out (core part only)
//!   core module --wfm F --trigger F [--resp F]
//!                                 a compiled workflow; --resp is a JSON
//!                                 array, the k-th effect of an execution
//!                                 gets element k mod len
//!   core json --file F            wfrt's JSON codec: decode and encode
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const heap = core_lib.heap;
const shard_mod = @import("shard");
const programs = @import("programs");
const cpu = @import("cpu.zig");

fn arg(args: []const []const u8, name: []const u8) ?[]const u8 {
    for (args, 0..) |a, i| if (std.mem.eql(u8, a, name) and i + 1 < args.len) return args[i + 1];
    return null;
}

fn num(comptime T: type, args: []const []const u8, name: []const u8, default: T) T {
    const s = arg(args, name) orelse return default;
    return std.fmt.parseInt(T, s, 10) catch default;
}

fn readFile(gpa: std.mem.Allocator, path: []const u8) ![]u8 {
    const pz = try gpa.dupeSentinel(u8, path, 0);
    defer gpa.free(pz);
    const fd = std.c.open(pz, .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
    if (fd < 0) return error.Open;
    defer _ = std.c.close(fd);
    var list: std.ArrayList(u8) = .empty;
    var buf: [64 << 10]u8 = undefined;
    while (true) {
        const n = std.c.read(fd, &buf, buf.len);
        if (n <= 0) break;
        try list.appendSlice(gpa, buf[0..@intCast(n)]);
    }
    return list.toOwnedSlice(gpa);
}

/// Split a JSON array's text into its elements' texts.
fn splitArray(gpa: std.mem.Allocator, text: []const u8) ![]const []const u8 {
    var out: std.ArrayList([]const u8) = .empty;
    var it = core_lib.module.ArrayIter.init(text);
    while (it.next()) |el| try out.append(gpa, el);
    return out.toOwnedSlice(gpa);
}

const Stats = struct {
    execs: u64 = 0,
    failed: u64 = 0,
    cpu_ns: u64 = 0,
    instructions: u64 = 0,
    dispatches: u64 = 0,
    dispatch_bytes: u64 = 0,
    reply_bytes: u64 = 0,
    finish_bytes: u64 = 0,
    batches: u64 = 0,
    /// Executions seen waiting on their first effect, by region class.
    wait_class: [4]u64 = @splat(0),
    wait_used: u64 = 0,
    wait_seen: u64 = 0,
};

const RunOpts = struct { batch: u32, secs: u32, trigger: []const u8, resps: []const []const u8, reply: bool };

fn runModule(gpa: std.mem.Allocator, module: []const u8, o: RunOpts) !Stats {
    std.debug.assert(o.batch > 0);
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const a = arena.allocator();
    var sh = try shard_mod.Shard.init(a, .{
        .slots = o.batch * 2,
        .region_sizes = .{ 4 << 10, 64 << 10, 1 << 20, 32 << 20 },
        .region_counts = .{ o.batch * 2, 256, 16, 2 },
        .max_pending = o.batch * 8,
        .max_batch_events = o.batch * 4 + 8,
        .max_actions = o.batch * 32 + 64,
    }, null, 64 << 20, 1 << 20);
    _ = try sh.tick(0, &.{.{ .kind = .load_module, .payload = module }});
    sh.endBatch();
    var occ = std.AutoHashMap(u64, u32).init(a);
    try occ.ensureTotalCapacity(o.batch * 4);
    var evs: std.ArrayList(core.Event) = .empty;
    var next: std.ArrayList(core.Event) = .empty;
    try evs.ensureTotalCapacity(a, o.batch * 4);
    try next.ensureTotalCapacity(a, o.batch * 4);
    var s: Stats = .{};
    var now: i64 = 1;
    const instr0 = sh.st.counters.instructions;
    const deadline = cpu.monoNs() + @as(u64, o.secs) * 1_000_000_000;
    var warm = true;
    var t0: u64 = 0;
    var rounds: u32 = 0;
    while (true) : (rounds += 1) {
        // The first rounds warm caches and are not counted.
        if (warm and rounds == 3) {
            warm = false;
            s = .{};
            t0 = cpu.threadNs();
        }
        if (!warm and cpu.monoNs() > deadline) break;
        evs.clearRetainingCapacity();
        for (0..o.batch) |k| evs.appendAssumeCapacity(.{ .kind = .start, .aux = 0, .conn = if (o.reply) k + 1 else 0, .payload = o.trigger });
        var live: u64 = o.batch;
        var first = true;
        while (live > 0) {
            const tk = try sh.tick(now, evs.items);
            now += 1;
            s.batches += 1;
            next.clearRetainingCapacity();
            for (tk.actions) |act| switch (act.kind) {
                .dispatch => {
                    s.dispatches += 1;
                    s.dispatch_bytes += act.payload.len;
                    const gop = occ.getOrPutAssumeCapacity(act.exec_id);
                    if (!gop.found_existing) gop.value_ptr.* = 0;
                    const resp = if (o.resps.len == 0) "{\"status\":200,\"headers\":{},\"body\":{\"ok\":true}}" else o.resps[gop.value_ptr.* % o.resps.len];
                    gop.value_ptr.* += 1;
                    try next.append(a, .{ .kind = .effect_ok, .exec_id = act.exec_id, .seq = act.seq, .payload = resp });
                },
                .reply => s.reply_bytes += act.payload.len,
                .finished => {
                    live -= 1;
                    s.execs += 1;
                    s.finish_bytes += act.payload.len;
                    if (act.aux != @backingInt(heap.ExecStatus.done)) s.failed += 1;
                    _ = occ.remove(act.exec_id);
                },
                else => {},
            };
            if (first and !warm) {
                // Every execution of the batch now waits on its first
                // effect (or has finished): record its region.
                for (sh.st.slot_state, 0..) |st, i| {
                    if (st == .free) continue;
                    s.wait_class[sh.st.slot_class[i]] += 1;
                    s.wait_used += sh.st.regions[i].used;
                    s.wait_seen += 1;
                }
            }
            first = false;
            sh.endBatch();
            if (next.items.len == 0 and live > 0 and !tk.out.has_ready) return error.Stuck;
            std.mem.swap(std.ArrayList(core.Event), &evs, &next);
        }
    }
    s.cpu_ns = cpu.threadNs() - t0;
    s.instructions = sh.st.counters.instructions - instr0;
    return s;
}

fn report(out: *std.Io.Writer, name: []const u8, s: Stats) !void {
    const n: f64 = @floatFromInt(@max(s.execs, 1));
    try out.print("core {s} execs={d} failed={d} ns_per_exec={d:.0} instr_per_exec={d:.0} ns_per_instr={d:.2} dispatch_per_exec={d:.2} dispatch_bytes_per_exec={d:.0} reply_bytes={d:.0} result_bytes={d:.0} batches_per_exec={d:.3}", .{
        name,                                        s.execs,                                       s.failed,
        @as(f64, @floatFromInt(s.cpu_ns)) / n,       @as(f64, @floatFromInt(s.instructions)) / n,   @as(f64, @floatFromInt(s.cpu_ns)) / @as(f64, @floatFromInt(@max(s.instructions, 1))),
        @as(f64, @floatFromInt(s.dispatches)) / n,   @as(f64, @floatFromInt(s.dispatch_bytes)) / n, @as(f64, @floatFromInt(s.reply_bytes)) / n,
        @as(f64, @floatFromInt(s.finish_bytes)) / n, @as(f64, @floatFromInt(s.batches)) / n,
    });
    if (s.wait_seen > 0) {
        try out.print(" wait_regions_4k={d} 64k={d} 1m={d} 32m={d} wait_used_bytes={d:.0}", .{ s.wait_class[0], s.wait_class[1], s.wait_class[2], s.wait_class[3], @as(f64, @floatFromInt(s.wait_used)) / @as(f64, @floatFromInt(s.wait_seen)) });
    }
    try out.writeAll("\n");
}

fn jsonBench(gpa: std.mem.Allocator, out: *std.Io.Writer, path: []const u8, iters_in: u32) !void {
    const text = try readFile(gpa, path);
    defer gpa.free(text);
    const glue = try programs.glue(gpa, null);
    defer gpa.free(glue);
    var natives: [4096]u16 = undefined;
    const m = try core_lib.module.load(glue, &natives);
    const rbuf = try gpa.alignedAlloc(u8, .@"8", 64 << 20);
    defer gpa.free(rbuf);
    const sbuf = try gpa.alloc(u8, 64 << 20);
    defer gpa.free(sbuf);
    var region = heap.Region.init(rbuf);
    var arena = core_lib.arena.Arena.init(sbuf);
    var vm: core_lib.ops.Vm = .{ .r = &region, .m = &m, .scratch = &arena };
    // Enough iterations for about 1 GB of input, at least 20.
    const iters: u32 = if (iters_in > 0) iters_in else @intCast(@max(20, @min(2_000_000, (1 << 30) / @max(text.len, 1))));
    var dec_ns: u64 = 0;
    var enc_ns: u64 = 0;
    var out_len: usize = 0;
    for (0..iters) |_| {
        region = heap.Region.init(rbuf);
        arena.reset();
        var t = cpu.threadNs();
        const v = core_lib.json.decode(&vm, text) catch return error.Decode;
        dec_ns += cpu.threadNs() - t;
        var b = arena.builder();
        t = cpu.threadNs();
        _ = core_lib.json.encode(&vm, &b, v, "") catch return error.Encode;
        enc_ns += cpu.threadNs() - t;
        out_len = b.bytes().len;
    }
    const nb: f64 = @floatFromInt(text.len * iters);
    try out.print("core json file={s} bytes={d} out_bytes={d} decode_ns={d:.0} encode_ns={d:.0} decode_mb_s={d:.0} encode_mb_s={d:.0} region_bytes={d}\n", .{
        std.fs.path.basename(path),                                                               text.len,                                                         out_len,
        @as(f64, @floatFromInt(dec_ns)) / @as(f64, @floatFromInt(iters)),                         @as(f64, @floatFromInt(enc_ns)) / @as(f64, @floatFromInt(iters)), nb / (@as(f64, @floatFromInt(dec_ns)) / 1e9) / 1e6,
        @as(f64, @floatFromInt(out_len * iters)) / (@as(f64, @floatFromInt(enc_ns)) / 1e9) / 1e6, region.used,
    });
}

pub fn main(gpa: std.mem.Allocator, out: *std.Io.Writer, args: []const []const u8) !void {
    if (args.len < 1) return out.writeAll("core w1|w2|module|json\n");
    const what = args[0];
    const rest = args[1..];
    const batch = num(u32, rest, "--batch", 256);
    const secs = num(u32, rest, "--secs", 3);
    if (std.mem.eql(u8, what, "w1")) {
        const m = try programs.glue(gpa, "{\"durability\":\"none\"}");
        var tb: [2048]u8 = undefined;
        const s = try runModule(gpa, m, .{ .batch = batch, .secs = secs, .trigger = trigger1k(&tb), .resps = &.{}, .reply = false });
        return report(out, "w1", s);
    }
    if (std.mem.eql(u8, what, "w2")) {
        const m = try programs.webhookReply(gpa, "{\"durability\":\"none\"}", .none);
        const s = try runModule(gpa, m, .{ .batch = batch, .secs = secs, .trigger = "{\"body\":{\"id\":\"order-1\"}}", .resps = &.{}, .reply = true });
        return report(out, "w2", s);
    }
    if (std.mem.eql(u8, what, "w3")) {
        const m = try programs.webhookReply(gpa, "{\"durability\":\"none\"}", .http);
        const s = try runModule(gpa, m, .{ .batch = batch, .secs = secs, .trigger = "{\"body\":{\"id\":\"order-1\"}}", .resps = &.{}, .reply = true });
        return report(out, "w3", s);
    }
    if (std.mem.eql(u8, what, "module")) {
        const m = try readFile(gpa, arg(rest, "--wfm") orelse return error.NoModule);
        const trig = try readFile(gpa, arg(rest, "--trigger") orelse return error.NoTrigger);
        const resps: []const []const u8 = if (arg(rest, "--resp")) |p| try splitArray(gpa, try readFile(gpa, p)) else &.{};
        const s = try runModule(gpa, m, .{ .batch = batch, .secs = secs, .trigger = std.mem.trim(u8, trig, " \n"), .resps = resps, .reply = true });
        return report(out, std.fs.path.basename(arg(rest, "--wfm").?), s);
    }
    if (std.mem.eql(u8, what, "json")) return jsonBench(gpa, out, arg(rest, "--file") orelse return error.NoFile, num(u32, rest, "--iters", 0));
    try out.writeAll("core w1|w2|w3|module|json\n");
}

/// The W1 trigger of `wfrt bench-w1`: an order with 12 items, about 1 KB.
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
