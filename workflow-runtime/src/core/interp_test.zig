const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const ops = @import("ops.zig");
const json = @import("json.zig");
const interp = @import("interp.zig");
const module = @import("module.zig");
const Asm = @import("asm.zig").Asm;
const Arena = @import("arena.zig").Arena;

const Harness = struct {
    region_buf: [64 * 1024]u8 align(8) = undefined,
    scratch_buf: [64 * 1024]u8 = undefined,
    natives: [256]u16 = undefined,
    region: heap.Region = undefined,
    scratch: Arena = undefined,
    m: module.Module = undefined,
    vm: ops.Vm = undefined,

    fn init(h: *Harness, bytes: []const u8, trigger: []const u8) !void {
        h.m = try module.load(bytes, &h.natives);
        h.region = heap.Region.init(&h.region_buf);
        h.scratch = Arena.init(&h.scratch_buf);
        h.vm = .{ .r = &h.region, .m = &h.m, .scratch = &h.scratch };
        try interp.initExec(&h.region, &h.m, 1, 7);
        interp.setTrigger(&h.region, try json.decode(&h.vm, trigger));
    }

    fn encode(h: *Harness, v: value.Value) ![]const u8 {
        var b = h.scratch.builder();
        _ = try json.encode(&h.vm, &b, v, "");
        return b.finish();
    }
};

test "loop, suspend and resume" {
    var a: Asm = .{ .gpa = std.testing.allocator };
    defer a.deinit();
    const s_n = try a.str("n");
    const s_acc = try a.str("acc");
    const s_v = try a.str("v");
    const step0 = try a.step("Check", .node);
    a.beginFunc();
    try a.emit(.getprop, 0, 2, 0, s_n);
    try a.emitBc(.loadi, 3, 0);
    try a.emitBc(.loadi, 4, 0);
    const loop = a.pc();
    try a.emit(.lt, 0, 5, 4, 2);
    const jf_at = a.pc();
    try a.emitBc(.jf, 5, 0);
    try a.emit(.add, 0, 3, 3, 4);
    try a.emitBc(.loadi, 6, 1);
    try a.emit(.add, 0, 4, 4, 6);
    try a.emitBc(.jmp, 0, loop);
    a.patchBc(jf_at, a.pc());
    try a.emitBc(.loadi, 7, step0);
    try a.emit(.newobj, 0, 8, 0, 0);
    try a.emit(.setprop, 0, 8, s_acc, 3);
    try a.emit(.@"suspend", @backingInt(module.EffectKind.node), 9, 7, 8);
    try a.emit(.getprop, 0, 10, 9, s_v);
    try a.emit(.ret, 0, 10, 0, 0);
    try a.endFunc("run", 1, 11, 0);
    const bytes = try a.finish();
    defer std.testing.allocator.free(bytes);

    var h: Harness = .{};
    try h.init(bytes, "{\"n\":5}");
    var fuel: u64 = 10_000;
    const out = interp.run(&h.vm, 0, &fuel, .{});
    try std.testing.expect(out == .effect);
    try std.testing.expectEqualStrings("{\"acc\":10}", try h.encode(out.effect.args));
    const res = try json.decode(&h.vm, "{\"v\":42}");
    interp.resumeEffect(&h.vm, out.effect.fibre, res, false);
    const out2 = interp.run(&h.vm, 0, &fuel, .{});
    try std.testing.expect(out2 == .done);
    try std.testing.expectEqualStrings("42", try h.encode(h.region.exec().result));
}

test "try/catch around a failing effect, and fork/join" {
    var a: Asm = .{ .gpa = std.testing.allocator };
    defer a.deinit();
    const s_msg = try a.str("message");
    const step0 = try a.step("A", .node);
    // func 1: (x) => suspend(A, x)
    a.beginFunc();
    try a.emitBc(.loadi, 1, step0);
    try a.emit(.@"suspend", 0, 2, 1, 0);
    try a.emit(.ret, 0, 2, 0, 0);
    try a.endFunc("branch", 1, 3, 0);
    const f1_start = a.code.items.len;
    _ = f1_start;
    // func 0 is appended after func 1 in code but must be index 0: build run second, then swap.
    a.beginFunc();
    try a.emit(.closure, 0, 1, 1, 0);
    try a.emitBc(.loadi, 2, 1);
    try a.emit(.fork, 0, 3, 1, 2);
    try a.emitBc(.loadi, 2, 2);
    try a.emit(.fork, 0, 4, 1, 2);
    try a.emit(.newarr, 0, 5, 0, 0);
    try a.emit(.push, 0, 5, 3, 0);
    try a.emit(.push, 0, 5, 4, 0);
    const try_start = a.pc();
    try a.emit(.join, 0, 6, 5, 0);
    try a.emit(.ret, 0, 6, 0, 0);
    const handler = a.pc();
    try a.emit(.getprop, 0, 8, 7, s_msg);
    try a.emit(.ret, 0, 8, 0, 0);
    try a.addTry(try_start, handler, handler, 7);
    try a.endFunc("run", 1, 9, 0);
    std.mem.swap(module.FuncEntry, &a.funcs.items[0], &a.funcs.items[1]);
    // The closure op refers to function index 1, which is now "branch".
    const bytes = try a.finish();
    defer std.testing.allocator.free(bytes);

    var h: Harness = .{};
    try h.init(bytes, "{}");
    var fuel: u64 = 10_000;
    const e1 = interp.run(&h.vm, 0, &fuel, .{});
    try std.testing.expect(e1 == .effect);
    try std.testing.expectEqual(@as(u32, 1), e1.effect.fibre);
    const e2 = interp.run(&h.vm, 0, &fuel, .{});
    try std.testing.expect(e2 == .effect);
    try std.testing.expectEqual(@as(u32, 2), e2.effect.fibre);
    try std.testing.expectEqual(@as(u32, 1), e2.effect.occurrence);
    try std.testing.expect(interp.run(&h.vm, 0, &fuel, .{}) == .idle);
    // Branch 2 fails; the join throws into the try in run.
    const err = try h.vm.makeError(.@"error", try h.vm.newStr("boom"));
    try std.testing.expect(!interp.inTry(&h.vm, 2));
    interp.resumeEffect(&h.vm, 2, err, true);
    const out = interp.run(&h.vm, 0, &fuel, .{});
    try std.testing.expect(out == .done);
    try std.testing.expectEqualStrings("\"boom\"", try h.encode(h.region.exec().result));
}

test "regression: run cannot have captures (fuzz)" {
    var a: Asm = .{ .gpa = std.testing.allocator };
    defer a.deinit();
    a.beginFunc();
    try a.emit(.getcap, 0, 1, 0, 0);
    try a.emit(.ret, 0, 1, 0, 0);
    try a.endFunc("run", 1, 2, 1);
    const bytes = try a.finish();
    defer std.testing.allocator.free(bytes);
    var natives: [16]u16 = undefined;
    try std.testing.expectError(error.BadOperand, module.load(bytes, &natives));
}

test "regression: JOIN takes only ids of other fibres (fuzz)" {
    const lists = [_][]const u8{ "[99]", "[\"x\"]", "[0]", "[-1]", "[0.5]" };
    for (lists) |list| {
        var a: Asm = .{ .gpa = std.testing.allocator };
        defer a.deinit();
        a.beginFunc();
        // R1 = trigger.l; join R1; return the joined values.
        try a.emit(.getprop, 0, 1, 0, try a.str("l"));
        try a.emit(.join, 0, 2, 1, 0);
        try a.emit(.ret, 0, 2, 0, 0);
        try a.endFunc("run", 1, 3, 0);
        const bytes = try a.finish();
        defer std.testing.allocator.free(bytes);
        var h: Harness = .{};
        var trig: [32]u8 = undefined;
        try h.init(bytes, try std.fmt.bufPrint(&trig, "{{\"l\":{s}}}", .{list}));
        var fuel: u64 = 10_000;
        // A TypeError the workflow can catch, not a crash or a wait for ever.
        try std.testing.expect(interp.run(&h.vm, 0, &fuel, .{}) == .failed);
        try std.testing.expectEqualStrings("{\"name\":\"TypeError\",\"message\":\"join of a value that is not a fibre\"}", try h.encode(h.region.exec().result));
    }
}

test "native calls take fuel in proportion to their work" {
    var a: Asm = .{ .gpa = std.testing.allocator };
    defer a.deinit();
    const step0 = try a.step("After", .node);
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("s"));
    try a.emit(.getprop, 0, 2, 0, try a.str("q"));
    try a.emitBc(.loadi, 3, 0);
    try a.emitBc(.loadi, 4, 100);
    const loop = a.pc();
    try a.emit(.lt, 0, 5, 3, 4);
    const jf_at = a.pc();
    try a.emitBc(.jf, 5, 0);
    // s.indexOf(q): reads the whole string each time.
    try a.emit(.callm, 1, 8, try a.str("indexOf"), 1);
    try a.emitBc(.loadi, 6, 1);
    try a.emit(.add, 0, 3, 3, 6);
    try a.emitBc(.jmp, 0, loop);
    a.patchBc(jf_at, a.pc());
    try a.emitBc(.loadi, 7, step0);
    try a.emit(.newobj, 0, 9, 0, 0);
    try a.emit(.@"suspend", @backingInt(module.EffectKind.node), 10, 7, 9);
    try a.emit(.ret, 0, 10, 0, 0);
    try a.endFunc("run", 1, 11, 0);
    const bytes = try a.finish();
    defer std.testing.allocator.free(bytes);

    var trigger: [16 * 1024 + 32]u8 = undefined;
    const prefix = "{\"q\":\"zz\",\"s\":\"";
    @memcpy(trigger[0..prefix.len], prefix);
    @memset(trigger[prefix.len..][0 .. 16 * 1024], 'a');
    @memcpy(trigger[prefix.len + 16 * 1024 ..][0..2], "\"}");
    var h: Harness = .{};
    try h.init(bytes, trigger[0 .. prefix.len + 16 * 1024 + 2]);
    // 100 calls of about 5 instructions fit in 1,000 instructions, but each
    // call reads 16 K units, which costs 256 fuel: the slice runs out.
    var slices: u32 = 0;
    const out = while (slices < 1000) : (slices += 1) {
        var fuel: u64 = 1000;
        const o = interp.run(&h.vm, 0, &fuel, .{});
        if (o != .fuel_out) break o;
    } else unreachable;
    try std.testing.expect(out == .effect);
    try std.testing.expect(slices >= 25);
    try std.testing.expect(h.region.exec().fuel_used >= 100 * 256);
}
