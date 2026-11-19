//! Tests for `batch.zig` (batched request encoding and result decoding).
const std = @import("std");
const value = @import("mem/value.zig");
const heap = @import("mem/heap.zig");
const ops = @import("runtime/ops.zig");
const json = @import("runtime/json.zig");
const arena_mod = @import("mem/arena.zig");
const module = @import("vm/module.zig");
const Asm = @import("vm/asm.zig").Asm;
const batch = @import("runtime/batch.zig");
const Arena = arena_mod.Arena;
const Value = value.Value;
const Vm = ops.Vm;
const EncodeJob = batch.EncodeJob;
const DecodeJob = batch.DecodeJob;
const encodeRequests = batch.encodeRequests;
const decodeResults = batch.decodeResults;

/// Executions with their own regions on one module whose constants are the
/// keys of a request description.
const Execs = struct {
    const n = 16;
    var regions: [n][16 << 10]u8 align(8) = undefined;
    var scratch_mem: [n][8 << 10]u8 = undefined;
    var out_mem: [64 << 10]u8 = undefined;
    var natives: [8]u16 = @splat(0);

    m: module.Module,
    bytes: []u8,
    r: [n]heap.Region,
    s: [n]Arena,
    vm: [n]Vm,
    k: [5]Value,

    fn init(e: *Execs, gpa: std.mem.Allocator) !void {
        var a: Asm = .{ .gpa = gpa };
        defer a.deinit();
        const names = [_][]const u8{ "method", "url", "headers", "body", "token" };
        var ids: [5]u16 = @splat(0);
        for (names, 0..) |nm, i| ids[i] = try a.str(nm);
        a.beginFunc();
        try a.emit(.ret, 0, 0, 0, 0);
        try a.endFunc("run", 1, 1, 0);
        e.bytes = try a.finish();
        e.m = try module.load(e.bytes, &natives);
        for (ids, 0..) |id, i| e.k[i] = value.constString(id);
        for (0..n) |i| {
            e.r[i] = heap.Region.init(&regions[i]);
            e.s[i] = Arena.init(&scratch_mem[i]);
            e.vm[i] = .{ .r = &e.r[i], .m = &e.m, .scratch = &e.s[i] };
        }
    }

    /// A request description with a token unique to execution `i`.
    fn request(e: *Execs, i: usize) !Value {
        const vm = &e.vm[i];
        var tb: [64]u8 = @splat(0);
        const tok = try std.fmt.bufPrint(&tb, "tok-{d}-\"\\{d}", .{ i, i * 7919 });
        const o = try vm.r.newObject(5);
        const h = try vm.r.newObject(1);
        try vm.objSet(value.payload(h), e.k[4], try vm.newStr(tok));
        try vm.objSet(value.payload(o), e.k[0], try vm.newStr("POST"));
        try vm.objSet(value.payload(o), e.k[1], try vm.newStr("https://api.example.com/v1/rows"));
        try vm.objSet(value.payload(o), e.k[2], h);
        try vm.objSet(value.payload(o), e.k[3], value.num(@floatFromInt(i)));
        return o;
    }
};

test "batch: every request and result reaches its own execution" {
    const gpa = std.testing.allocator;
    var e: Execs = undefined;
    try e.init(gpa);
    defer gpa.free(e.bytes);
    var out = Arena.init(&Execs.out_mem);
    var jobs: [Execs.n]EncodeJob = undefined;
    for (&jobs, 0..) |*j, i| j.* = .{ .owner = .{ .exec_id = 1000 + i, .gen = @intCast(i % 3) }, .vm = &e.vm[i], .args = try e.request(i) };
    encodeRequests(&jobs, &out);
    for (jobs, 0..) |j, i| {
        try std.testing.expect(j.ok);
        // The batch writes what JSON.stringify writes, alone.
        var b = e.s[i].builder();
        _ = try json.encode(&e.vm[i], &b, j.args, "");
        try std.testing.expectEqualStrings(b.bytes(), j.out);
        b.abandon();
        // Its own token, and no other execution's.
        var tb: [64]u8 = @splat(0);
        const tok = try std.fmt.bufPrint(&tb, "tok-{d}-\\\"\\\\{d}\"", .{ i, i * 7919 });
        try std.testing.expect(std.mem.indexOf(u8, j.out, tok) != null);
        for (0..Execs.n) |other| {
            if (other == i) continue;
            const ot = try std.fmt.bufPrint(&tb, "tok-{d}-", .{other});
            try std.testing.expect(std.mem.indexOf(u8, j.out, ot) == null);
        }
    }
    // Results: each execution decodes its own token into its own region.
    var payloads: [Execs.n][96]u8 = undefined;
    var djobs: [Execs.n]DecodeJob = undefined;
    for (&djobs, 0..) |*j, i| {
        const p = try std.fmt.bufPrint(&payloads[i], "{{\"status\":200,\"body\":{{\"id\":\"res-{d}\",\"n\":{d}}}}}", .{ i, i });
        j.* = .{ .owner = jobs[i].owner, .vm = &e.vm[i], .payload = p };
    }
    decodeResults(&djobs);
    for (djobs, 0..) |j, i| {
        const v = try j.result;
        const body = e.vm[i].objGet(value.payload(v), "body");
        var tb: [16]u8 = undefined;
        try std.testing.expectEqualStrings(try std.fmt.bufPrint(&tb, "res-{d}", .{i}), e.vm[i].str(e.vm[i].objGet(value.payload(body), "id")));
        // The value lives in this execution's region.
        try std.testing.expect(value.payload(v) < e.r[i].used);
    }
}

test "batch: a value it does not take is left to the caller" {
    const gpa = std.testing.allocator;
    var e: Execs = undefined;
    try e.init(gpa);
    defer gpa.free(e.bytes);
    var out = Arena.init(&Execs.out_mem);
    const vm = &e.vm[0];
    const o = try vm.r.newObject(2);
    try vm.objSet(value.payload(o), try vm.newStr("1"), value.num(1));
    var jobs = [_]EncodeJob{
        .{ .owner = .{ .exec_id = 1, .gen = 0 }, .vm = vm, .args = o },
        .{ .owner = .{ .exec_id = 2, .gen = 0 }, .vm = &e.vm[1], .args = try e.request(1) },
    };
    encodeRequests(&jobs, &out);
    try std.testing.expect(!jobs[0].ok);
    try std.testing.expect(jobs[1].ok);
}
