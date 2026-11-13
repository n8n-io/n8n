//! `wfrt aot-gen <out.zig> <module.wfm>...`: write the compiled functions
//! (`core/aot.zig`) for the library code in the given modules. Every
//! function but the workflow's own `run` (function 0) is compiled, once for
//! each canonical hash. The modules come from
//! `packages/@n8n/workflow-lang/scripts/aot-modules.ts`.
const std = @import("std");
const core = @import("core");
const module = core.module;
const aot = core.aot;
const Op = module.Op;

const Found = struct { hash: u64, nregs: u16, code_len: u32, mod: usize, fi: u32 };

fn lessByHash(_: void, a: Found, b: Found) bool {
    return a.hash < b.hash;
}

pub fn run(gpa: std.mem.Allocator, io: std.Io, out_path: []const u8, paths: []const []const u8) !void {
    const cwd = std.Io.Dir.cwd();
    var mods: std.ArrayList(module.Module) = .empty;
    defer mods.deinit(gpa);
    var bufs: std.ArrayList([]const u8) = .empty;
    defer {
        for (bufs.items) |b| gpa.free(b);
        bufs.deinit(gpa);
    }
    var nat: std.ArrayList([]u16) = .empty;
    defer {
        for (nat.items) |b| gpa.free(b);
        nat.deinit(gpa);
    }
    for (paths) |p| {
        const bytes = try cwd.readFileAlloc(io, p, gpa, .limited(64 << 20));
        try bufs.append(gpa, bytes);
        const natives = try gpa.alloc(u16, bytes.len / 4 + 1);
        try nat.append(gpa, natives);
        const m = module.load(bytes, natives) catch |e| {
            std.log.err("{s}: {s}", .{ p, @errorName(e) });
            return e;
        };
        try mods.append(gpa, m);
    }
    var found: std.ArrayList(Found) = .empty;
    defer found.deinit(gpa);
    var seen: std.AutoHashMapUnmanaged(u64, void) = .empty;
    defer seen.deinit(gpa);
    var total: usize = 0;
    for (mods.items, 0..) |*m, mi| {
        var fi: u32 = 1;
        while (fi < m.funcs.len) : (fi += 1) {
            const h = aot.hashFunc(m, fi);
            const g = try seen.getOrPut(gpa, h);
            if (g.found_existing) continue;
            try found.append(gpa, .{ .hash = h, .nregs = m.funcs[fi].nregs, .code_len = m.funcs[fi].code_len, .mod = mi, .fi = fi });
            total += m.funcs[fi].code_len;
        }
    }
    std.mem.sort(Found, found.items, {}, lessByHash);
    var w: std.Io.Writer.Allocating = .init(gpa);
    defer w.deinit();
    try w.writer.writeAll(file_header);
    var name_buf: [32]u8 = undefined;
    for (found.items) |f| {
        const ident = try std.fmt.bufPrint(&name_buf, "f_{x:0>16}", .{f.hash});
        try emit(&w.writer, &mods.items[f.mod], f.fi, ident);
    }
    try w.writer.writeAll("pub const table = [_]aot.Entry{\n");
    for (found.items) |f| {
        try w.writer.print("    .{{ .hash = 0x{x:0>16}, .nregs = {d}, .code_len = {d}, .run = &f_{x:0>16} }},\n", .{ f.hash, f.nregs, f.code_len, f.hash });
    }
    try w.writer.writeAll("};\n");
    try cwd.writeFile(io, .{ .sub_path = out_path, .data = w.written() });
    std.log.info("{d} functions, {d} instructions", .{ found.items.len, total });
}

/// Write the compiled form of module function `fi` as `fn <ident>(cx: *aot.Cx) void`.
pub fn emit(w: *std.Io.Writer, m: *const module.Module, fi: u32, ident: []const u8) std.Io.Writer.Error!void {
    const fe = m.funcs[fi];
    const code = m.funcCode(fi);
    try w.print("/// {s}\nfn {s}(cx: *aot.Cx) void {{\n", .{ m.str(fe.name), ident });
    try w.print("    @setEvalBranchQuota({d});\n", .{1000 + 4 * code.len});
    try w.print("    std.debug.assert(cx.vm.m.funcs[cx.fr.func].nregs == {d});\n", .{fe.nregs});
    try w.writeAll(if (usesRegs(code)) "    const R = cx.R;\n" else "");
    // The counter stays in `cx`: as a local it needs a value merge at each
    // prong, and LLVM then dispatches each `continue` through the jump
    // table in large functions (measured: +45% cycles on Sheets).
    try w.writeAll("    const pc = sw: switch (cx.fr.pc) {\n");
    for (code, 0..) |ins, i| {
        const pc: u32 = @intCast(i);
        try w.print("        {d} => {{\n            if (cx.n == cx.budget) break :sw {d};\n", .{ pc, pc });
        try emitBody(w, m, ins, pc);
        try w.writeAll("        },\n");
    }
    try w.writeAll("        else => |p| break :sw p,\n    };\n    cx.fr.pc = pc;\n}\n\n");
}

/// True when the generated code reads registers itself.
fn usesRegs(code: []align(1) const module.Instr) bool {
    for (code) |ins| switch (@as(Op, @fromBackingInt(ins.op))) {
        .nop, .jmp => {},
        .mov, .loadk, .loads, .loadi, .loadundef, .loadnull, .loadbool, .add, .sub, .mul, .mod, .lt, .le, .gt, .ge => return true,
        .seq, .sne, .not, .isnullish, .jt, .jf, .jnullish, .getprop, .setprop, .newobj, .newarr, .push, .getelem, .calln => return true,
        else => {},
    };
    return false;
}

fn emitBody(w: *std.Io.Writer, m: *const module.Module, ins: module.Instr, pc: u32) std.Io.Writer.Error!void {
    const op: Op = @fromBackingInt(ins.op);
    const next = pc + 1;
    const ind = "            ";
    switch (op) {
        .nop => {},
        .mov => try w.print(ind ++ "R[{d}] = R[{d}];\n", .{ ins.a, ins.b }),
        .loadk => try w.print(ind ++ "R[{d}] = value.num(cx.vm.m.numbers[cx.code[{d}].bc()]);\n", .{ ins.a, pc }),
        .loads => try w.print(ind ++ "R[{d}] = value.constString(cx.code[{d}].bc());\n", .{ ins.a, pc }),
        .loadi => try w.print(ind ++ "R[{d}] = value.num({d}.0);\n", .{ ins.a, @as(i32, @bitCast(ins.bc())) }),
        .loadundef => try w.print(ind ++ "R[{d}] = value.undef;\n", .{ins.a}),
        .loadnull => try w.print(ind ++ "R[{d}] = value.null_;\n", .{ins.a}),
        .loadbool => try w.print(ind ++ "R[{d}] = value.{s};\n", .{ ins.a, if (ins.x != 0) "true_" else "false_" }),
        .add, .sub, .mul, .mod, .lt, .le, .gt, .ge => try w.print(ind ++ "if (!aot.numOp(cx, .{s}, R, {d}, {d}, {d}, {d})) break :sw {d};\n", .{ @tagName(op), ins.a, ins.b, ins.c, pc, pc }),
        .seq => try w.print(ind ++ "R[{d}] = value.boolean(aot.strictEquals(cx, R[{d}], R[{d}]));\n", .{ ins.a, ins.b, ins.c }),
        .sne => try w.print(ind ++ "R[{d}] = value.boolean(!aot.strictEquals(cx, R[{d}], R[{d}]));\n", .{ ins.a, ins.b, ins.c }),
        .not => try w.print(ind ++ "R[{d}] = value.boolean(!aot.truthy(cx, R[{d}]));\n", .{ ins.a, ins.b }),
        .isnullish => try w.print(ind ++ "R[{d}] = value.boolean(value.isNullish(R[{d}]));\n", .{ ins.a, ins.b }),
        .jmp => return w.print(ind ++ "cx.n += 1;\n" ++ ind ++ "continue :sw {d};\n", .{ins.bc()}),
        .jt, .jf, .jnullish => {
            const cond = switch (op) {
                .jt => "aot.truthy(cx, R[",
                .jf => "!aot.truthy(cx, R[",
                else => "value.isNullish(R[",
            };
            try w.print(ind ++ "cx.n += 1;\n" ++ ind ++ "if ({s}{d}])", .{ cond, ins.a });
            return w.print(") continue :sw {d};\n" ++ ind ++ "continue :sw {d};\n", .{ ins.bc(), next });
        },
        .getprop => try w.print(ind ++ "if (!aot.getprop(cx, R, {d}, {d}, cx.code[{d}].c, {d})) break :sw {d};\n", .{ ins.a, ins.b, pc, pc, pc }),
        .setprop => try w.print(ind ++ "if (!aot.setprop(cx, R, {d}, cx.code[{d}].b, {d}, {d})) break :sw {d};\n", .{ ins.a, pc, ins.c, pc, pc }),
        .newobj => try w.print(ind ++ "if (!aot.newobj(cx, R, {d}, {d})) break :sw {d};\n", .{ ins.a, pc, pc }),
        .newarr => try w.print(ind ++ "if (!aot.newarr(cx, R, {d}, {d})) break :sw {d};\n", .{ ins.a, pc, pc }),
        .push => try w.print(ind ++ "if (!aot.push(cx, R, {d}, {d}, {d})) break :sw {d};\n", .{ ins.a, ins.b, pc, pc }),
        .getelem => try w.print(ind ++ "if (!aot.getelem(cx, R, {d}, {d}, {d}, {d})) break :sw {d};\n", .{ ins.a, ins.b, ins.c, pc, pc }),
        .calln => if (ins.x == 1 and std.mem.eql(u8, m.str(ins.b), "Array.isArray"))
            try w.print(ind ++ "if (!aot.isArray(cx, R, {d}, {d}, {d})) break :sw {d};\n", .{ ins.a, ins.c, pc, pc })
        else
            try w.print(ind ++ "if (!aot.slowOp(cx, .calln, {d})) break :sw {d};\n", .{ pc, pc }),
        else => try w.print(ind ++ "if (!aot.slowOp(cx, .{s}, {d})) break :sw {d};\n", .{ opName(op), pc, pc }),
    }
    try w.print(ind ++ "cx.n += 1;\n" ++ ind ++ "continue :sw {d};\n", .{next});
}

/// The start of a generated table file.
pub const file_header =
    \\//! Generated by `wfrt aot-gen` (src/shell/aotgen.zig). Do not edit.
    \\const std = @import("std");
    \\const aot = @import("aot.zig");
    \\const value = @import("value.zig");
    \\
    \\
;

/// The opcode as a Zig enum literal name.
fn opName(op: Op) []const u8 {
    return switch (op) {
        .@"suspend" => "@\"suspend\"",
        else => @tagName(op),
    };
}

/// `wfrt aot-check <module.wfm>...`: the library functions of the modules
/// that this binary has no compiled form for. A node source that changed
/// after the last `aot-gen` runs in the interpreter: correct, but slower.
/// Returns the number missing.
pub fn check(gpa: std.mem.Allocator, io: std.Io, out: *std.Io.Writer, paths: []const []const u8) !u32 {
    const cwd = std.Io.Dir.cwd();
    var missing: u32 = 0;
    var total: u32 = 0;
    var seen: std.AutoHashMapUnmanaged(u64, void) = .empty;
    defer seen.deinit(gpa);
    for (paths) |p| {
        const bytes = try cwd.readFileAlloc(io, p, gpa, .limited(64 << 20));
        defer gpa.free(bytes);
        const natives = try gpa.alloc(u16, bytes.len / 4 + 1);
        defer gpa.free(natives);
        const m = try module.load(bytes, natives);
        if (m.aot.len != m.funcs.len) return error.NoRoom;
        var fi: u32 = 1;
        while (fi < m.funcs.len) : (fi += 1) {
            const g = try seen.getOrPut(gpa, aot.hashFunc(&m, fi));
            if (g.found_existing) continue;
            total += 1;
            if (m.aot[fi] != module.no_aot) continue;
            missing += 1;
            try out.print("not compiled: {s} ({s})\n", .{ m.str(m.funcs[fi].name), p });
        }
    }
    try out.print("{d} of {d} library functions compiled\n", .{ total - missing, total });
    return missing;
}
