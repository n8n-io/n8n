//! `jsonmix <data-dir> [rounds]`: decode and encode MB/s of the reference
//! and the fast JSON codec, on the files of `bench/floor/gen-json.mjs`.
//! Each figure is CPU time of this thread over many iterations, timed once
//! per loop (no clock call per document). The "mix" line weights the p50,
//! mean, p90 and p99 files equally: the shape of vendor responses.
const std = @import("std");
const core = @import("core");
const cc = std.c;

fn threadNs() u64 {
    var ts: cc.timespec = undefined;
    _ = cc.clock_gettime(cc.CLOCK.THREAD_CPUTIME_ID, &ts);
    return @as(u64, @intCast(ts.sec)) * 1_000_000_000 + @as(u64, @intCast(ts.nsec));
}

fn readFile(gpa: std.mem.Allocator, path: []const u8) ![]u8 {
    const pz = try gpa.dupeSentinel(u8, path, 0);
    defer gpa.free(pz);
    const fd = cc.open(pz, .{ .ACCMODE = .RDONLY }, @as(cc.mode_t, 0));
    if (fd < 0) return error.Open;
    defer _ = cc.close(fd);
    var list: std.ArrayList(u8) = .empty;
    var buf: [64 << 10]u8 = undefined;
    while (true) {
        const n = cc.read(fd, &buf, buf.len);
        if (n <= 0) break;
        try list.appendSlice(gpa, buf[0..@intCast(n)]);
    }
    return list.toOwnedSlice(gpa);
}

const Codec = enum { ref, fast };
const Result = struct { dec_ns: f64, enc_ns: f64 };

fn run(comptime which: Codec, vm: *core.ops.Vm, rbuf: []align(8) u8, text: []const u8, iters: u32) !Result {
    const J = if (which == .ref) core.json_ref else core.json;
    // Decode: the region starts empty for each document.
    var t = threadNs();
    var i: u32 = 0;
    var v: core.value.Value = undefined;
    while (i < iters) : (i += 1) {
        vm.r.* = core.heap.Region.init(rbuf);
        v = J.decode(vm, text) catch return error.Decode;
    }
    const dec = threadNs() - t;
    t = threadNs();
    i = 0;
    while (i < iters) : (i += 1) {
        vm.scratch.reset();
        var b = vm.scratch.builder();
        _ = J.encode(vm, &b, v, "") catch return error.Encode;
        std.mem.doNotOptimizeAway(b.len);
    }
    const enc = threadNs() - t;
    return .{ .dec_ns = @as(f64, @floatFromInt(dec)) / @as(f64, @floatFromInt(iters)), .enc_ns = @as(f64, @floatFromInt(enc)) / @as(f64, @floatFromInt(iters)) };
}

pub fn main(init: std.process.Init) !void {
    const gpa = std.heap.page_allocator;
    const args = try init.minimal.args.toSlice(gpa);
    const dir = if (args.len > 1) args[1] else "../floor/data";
    const rounds: u32 = if (args.len > 2) try std.fmt.parseInt(u32, args[2], 10) else 3;
    // `fast` as a third argument skips the reference (for profiles).
    const only_fast = args.len > 3 and std.mem.eql(u8, args[3], "fast");
    var a: core.asm_.Asm = .{ .gpa = gpa };
    a.beginFunc();
    try a.emit(.ret, 0, 0, 0, 0);
    try a.endFunc("run", 1, 1, 0);
    const glue = try a.finish();
    var natives: [64]u16 = undefined;
    const m = try core.module.load(glue, &natives);
    const rbuf = try gpa.alignedAlloc(u8, .@"8", 16 << 20);
    const sbuf = try gpa.alloc(u8, 16 << 20);
    var region = core.heap.Region.init(rbuf);
    var arena = core.arena.Arena.init(sbuf);
    var vm: core.ops.Vm = .{ .r = &region, .m = &m, .scratch = &arena };
    if (args.len > 1 and std.mem.eql(u8, args[1], "batch")) return batchBench(gpa);
    if (args.len > 1 and std.mem.eql(u8, args[1], "sheets")) {
        const bb = try gpa.alloc(u8, 16 << 20);
        try sheetsBench(&vm, rbuf, bb, 1, 6, 200_000);
        try sheetsBench(&vm, rbuf, bb, 5, 8, 100_000);
        try sheetsBench(&vm, rbuf, bb, 20, 8, 30_000);
        try sheetsBench(&vm, rbuf, bb, 200, 12, 2_000);
        return;
    }
    const files = [_][]const u8{ "p50-360", "mean-760", "p90-1350", "p99-4400", "64k" };
    var mix = [2][2]f64{ .{ 0, 0 }, .{ 0, 0 } };
    var mix_bytes: f64 = 0;
    for (files, 0..) |name, fi| {
        const path = try std.fmt.allocPrint(gpa, "{s}/{s}.json", .{ dir, name });
        const text = try readFile(gpa, path);
        const iters: u32 = @intCast(@max(200, @min(2_000_000, (256 << 20) / text.len)));
        var best = [2]Result{ .{ .dec_ns = 1e18, .enc_ns = 1e18 }, .{ .dec_ns = 1e18, .enc_ns = 1e18 } };
        for (0..rounds) |_| {
            inline for (.{ Codec.ref, Codec.fast }, 0..) |cd, k| {
                if (!(cd == .ref and only_fast)) {
                    const r = try run(cd, &vm, rbuf, text, iters);
                    best[k].dec_ns = @min(best[k].dec_ns, r.dec_ns);
                    best[k].enc_ns = @min(best[k].enc_ns, r.enc_ns);
                }
            }
        }
        const nb: f64 = @floatFromInt(text.len);
        std.debug.print("{s:>9} {d:>6} B  ref dec {d:>8.0} ns {d:>5.0} MB/s enc {d:>8.0} ns {d:>5.0} MB/s | fast dec {d:>8.0} ns {d:>5.0} MB/s enc {d:>8.0} ns {d:>5.0} MB/s | x{d:.2} x{d:.2}\n", .{
            name,                            text.len,
            best[0].dec_ns,                  nb / best[0].dec_ns * 1e3,
            best[0].enc_ns,                  nb / best[0].enc_ns * 1e3,
            best[1].dec_ns,                  nb / best[1].dec_ns * 1e3,
            best[1].enc_ns,                  nb / best[1].enc_ns * 1e3,
            best[0].dec_ns / best[1].dec_ns, best[0].enc_ns / best[1].enc_ns,
        });
        if (fi < 4) {
            for (0..2) |k| {
                mix[k][0] += best[k].dec_ns;
                mix[k][1] += best[k].enc_ns;
            }
            mix_bytes += nb;
        }
    }
    std.debug.print("      mix         ref dec {d:>5.0} MB/s enc {d:>5.0} MB/s | fast dec {d:>5.0} MB/s enc {d:>5.0} MB/s | x{d:.2} x{d:.2}\n", .{
        mix_bytes / mix[0][0] * 1e3, mix_bytes / mix[0][1] * 1e3, mix_bytes / mix[1][0] * 1e3, mix_bytes / mix[1][1] * 1e3, mix[0][0] / mix[1][0], mix[0][1] / mix[1][1],
    });
}

// ---- item batches: Sheets rows to items ----------------------------------------------

/// A Sheets `values` answer: a header row and `rows` rows of `cols` cells.
fn sheetDoc(gpa: std.mem.Allocator, rows: u32, cols: u32) ![]u8 {
    var list: std.ArrayList(u8) = .empty;
    try list.appendSlice(gpa, "{\"range\":\"Sheet1!A1:Z999\",\"majorDimension\":\"ROWS\",\"values\":[[");
    for (0..cols) |c| try list.print(gpa, "{s}\"Column {d}\"", .{ if (c > 0) "," else "", c });
    try list.append(gpa, ']');
    for (0..rows) |r| {
        try list.appendSlice(gpa, ",[");
        for (0..cols) |c| {
            if (c > 0) try list.append(gpa, ',');
            switch (c % 4) {
                0 => try list.print(gpa, "\"rec-{d}\"", .{r}),
                1 => try list.print(gpa, "\"user{d}@example.com\"", .{r}),
                2 => try list.print(gpa, "\"{d}.{d}\"", .{ r * 7, r % 100 }),
                else => try list.appendSlice(gpa, "\"open\""),
            }
        }
        try list.append(gpa, ']');
    }
    try list.appendSlice(gpa, "]}");
    return list.toOwnedSlice(gpa);
}

/// The tree path a native node would take: parse, build one object per row
/// with a key search per cell, stringify.
fn treeRowsToItems(vm: *core.ops.Vm, src: []const u8) !usize {
    const value = core.value;
    const doc = try core.json.decode(vm, src);
    const vals = vm.objGet(value.payload(doc), "values");
    const rows = vm.r.arrItems(value.payload(vals));
    const header = vm.r.arrItems(value.payload(rows[0]));
    const items = try vm.r.newArray(@intCast(rows.len - 1));
    for (rows[1..]) |row| {
        const cells = vm.r.arrItems(value.payload(row));
        const o = try vm.r.newObject(4);
        for (cells, 0..) |cv, c| try vm.objSet(value.payload(o), header[c], cv);
        try vm.r.arrPush(value.payload(items), o);
    }
    var b = vm.scratch.builder();
    _ = try core.json.encode(vm, &b, items, "");
    return b.len;
}

pub fn sheetsBench(vm: *core.ops.Vm, rbuf: []align(8) u8, batch_buf: []u8, rows: u32, cols: u32, iters: u32) !void {
    const gpa = std.heap.page_allocator;
    const src = try sheetDoc(gpa, rows, cols);
    var batch_arena = core.arena.Arena.init(batch_buf);
    var best = [3]f64{ 1e18, 1e18, 1e18 };
    var out_len: [3]usize = undefined;
    for (0..5) |_| {
        var t = threadNs();
        for (0..iters) |_| {
            vm.r.* = core.heap.Region.init(rbuf);
            vm.scratch.reset();
            out_len[0] = try treeRowsToItems(vm, src);
        }
        best[0] = @min(best[0], @as(f64, @floatFromInt(threadNs() - t)) / @as(f64, @floatFromInt(iters)));
        t = threadNs();
        for (0..iters) |_| {
            batch_arena.reset();
            const b = try core.columns.fromSheetValues(&batch_arena, src, .{});
            var ob = batch_arena.builder();
            try core.columns.writeItems(&b, &ob);
            out_len[1] = ob.len;
        }
        best[1] = @min(best[1], @as(f64, @floatFromInt(threadNs() - t)) / @as(f64, @floatFromInt(iters)));
        t = threadNs();
        for (0..iters) |_| {
            vm.r.* = core.heap.Region.init(rbuf);
            vm.scratch.reset();
            batch_arena.reset();
            const b = try core.columns.fromSheetValues(&batch_arena, src, .{});
            const v = try core.columns.materialize(vm, &b);
            var ob = vm.scratch.builder();
            _ = try core.json.encode(vm, &ob, v, "");
            out_len[2] = ob.len;
        }
        best[2] = @min(best[2], @as(f64, @floatFromInt(threadNs() - t)) / @as(f64, @floatFromInt(iters)));
    }
    std.debug.print("sheets {d}x{d} ({d} B in, {d} B out): tree {d:.0} ns | batch to JSON {d:.0} ns (x{d:.1}) | batch, materialize, stringify {d:.0} ns (x{d:.1})\n", .{
        rows, cols, src.len, out_len[0], best[0], best[1], best[0] / best[1], best[2], best[0] / best[2],
    });
    if (out_len[0] != out_len[1] or out_len[0] != out_len[2]) return error.OutputsDiffer;
}

// ---- batching across executions: request building ------------------------------------

pub fn batchBench(gpa: std.mem.Allocator) !void {
    const value = core.value;
    const n_exec = 64;
    var a: core.asm_.Asm = .{ .gpa = gpa };
    const names = [_][]const u8{ "method", "url", "headers", "Authorization", "Content-Type", "qs", "valueInputOption", "body", "values", "json" };
    var ids: [names.len]u16 = undefined;
    for (names, 0..) |nm, i| ids[i] = try a.str(nm);
    a.beginFunc();
    try a.emit(.ret, 0, 0, 0, 0);
    try a.endFunc("run", 1, 1, 0);
    var natives: [64]u16 = undefined;
    const m = try core.module.load(try a.finish(), &natives);
    var k: [names.len]value.Value = undefined;
    for (ids, 0..) |id, i| k[i] = value.constString(id);
    var regions: [n_exec]core.heap.Region = undefined;
    var scratches: [n_exec]core.arena.Arena = undefined;
    var vms: [n_exec]core.ops.Vm = undefined;
    var args: [n_exec]value.Value = undefined;
    for (0..n_exec) |i| {
        regions[i] = core.heap.Region.init(try gpa.alignedAlloc(u8, .@"8", 64 << 10));
        scratches[i] = core.arena.Arena.init(try gpa.alloc(u8, 16 << 10));
        vms[i] = .{ .r = &regions[i], .m = &m, .scratch = &scratches[i] };
        const vm = &vms[i];
        // A Sheets append request, as the library node builds it.
        const h = try vm.r.newObject(2);
        try vm.objSet(value.payload(h), k[3], try vm.newStr("Bearer ya29.a0AfB_byC-example-token-0123456789"));
        try vm.objSet(value.payload(h), k[4], try vm.newStr("application/json"));
        const qs = try vm.r.newObject(1);
        try vm.objSet(value.payload(qs), k[6], try vm.newStr("USER_ENTERED"));
        const row = try vm.r.newArray(4);
        try vm.r.arrPush(value.payload(row), try vm.newStr("rec-1"));
        try vm.r.arrPush(value.payload(row), try vm.newStr("user1@example.com"));
        try vm.r.arrPush(value.payload(row), value.num(12.5));
        try vm.r.arrPush(value.payload(row), value.true_);
        const rows = try vm.r.newArray(1);
        try vm.r.arrPush(value.payload(rows), row);
        const body = try vm.r.newObject(1);
        try vm.objSet(value.payload(body), k[8], rows);
        const o = try vm.r.newObject(6);
        try vm.objSet(value.payload(o), k[0], try vm.newStr("POST"));
        try vm.objSet(value.payload(o), k[1], try vm.newStr("https://sheets.googleapis.com/v4/spreadsheets/1AbC/values/Sheet1!A1:append"));
        try vm.objSet(value.payload(o), k[2], h);
        try vm.objSet(value.payload(o), k[5], qs);
        try vm.objSet(value.payload(o), k[7], body);
        try vm.objSet(value.payload(o), k[9], value.true_);
        args[i] = o;
    }
    const out_mem = try gpa.alloc(u8, 1 << 20);
    var out = core.arena.Arena.init(out_mem);
    var jobs: [n_exec]core.batch.EncodeJob = undefined;
    const rounds = 20_000;
    var best = [2]f64{ 1e18, 1e18 };
    var len_one: usize = 0;
    var len_batch: usize = 0;
    for (0..5) |_| {
        var t = threadNs();
        for (0..rounds) |_| {
            out.reset();
            for (0..n_exec) |i| {
                var b = out.builder();
                _ = try core.json.encode(&vms[i], &b, args[i], "");
                len_one = b.finish().len;
            }
        }
        best[0] = @min(best[0], @as(f64, @floatFromInt(threadNs() - t)) / (rounds * n_exec));
        t = threadNs();
        for (0..rounds) |_| {
            out.reset();
            for (&jobs, 0..) |*j, i| j.* = .{ .owner = .{ .exec_id = i, .gen = 0 }, .vm = &vms[i], .args = args[i] };
            core.batch.encodeRequests(&jobs, &out);
            len_batch = jobs[n_exec - 1].out.len;
        }
        best[1] = @min(best[1], @as(f64, @floatFromInt(threadNs() - t)) / (rounds * n_exec));
    }
    std.debug.print("request build, {d} executions of one step ({d} B each): one by one {d:.0} ns, batched {d:.0} ns per request (x{d:.2})\n", .{ n_exec, len_one, best[0], best[1], best[0] / best[1] });
    if (len_one != len_batch) return error.OutputsDiffer;
}
