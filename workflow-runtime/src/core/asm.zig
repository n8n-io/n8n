//! A small module writer for tests. It emits the same format as the
//! TypeScript compiler, so runtime tests do not depend on the compiler.
const std = @import("std");
const module = @import("module.zig");
const Op = module.Op;

pub const Asm = struct {
    gpa: std.mem.Allocator,
    strings: std.ArrayList([]const u8) = .empty,
    numbers: std.ArrayList(f64) = .empty,
    funcs: std.ArrayList(module.FuncEntry) = .empty,
    code: std.ArrayList(module.Instr) = .empty,
    tries: std.ArrayList(module.TryEntry) = .empty,
    steps: std.ArrayList(module.StepEntry) = .empty,
    meta: ?[]const u8 = null,
    cur_start: u32 = 0,
    cur_try_start: u32 = 0,

    pub fn deinit(a: *Asm) void {
        a.strings.deinit(a.gpa);
        a.numbers.deinit(a.gpa);
        a.funcs.deinit(a.gpa);
        a.code.deinit(a.gpa);
        a.tries.deinit(a.gpa);
        a.steps.deinit(a.gpa);
    }

    pub fn str(a: *Asm, s: []const u8) !u16 {
        for (a.strings.items, 0..) |x, i| if (std.mem.eql(u8, x, s)) return @intCast(i);
        try a.strings.append(a.gpa, s);
        return @intCast(a.strings.items.len - 1);
    }

    pub fn number(a: *Asm, f: f64) !u16 {
        try a.numbers.append(a.gpa, f);
        return @intCast(a.numbers.items.len - 1);
    }

    pub fn step(a: *Asm, name: []const u8, kind: module.EffectKind) !u16 {
        const n = try a.str(name);
        try a.steps.append(a.gpa, .{ .id = n, .name = n, .node_type = 0xFFFF_FFFF, .kind = @backingInt(kind), .idempotent = 0, .retry_max = 0, .flags = 0, .retry_delay_ms = 0, .src_start = 0, .src_end = 0, ._pad2 = 0 });
        return @intCast(a.steps.items.len - 1);
    }

    pub fn beginFunc(a: *Asm) void {
        a.cur_start = @intCast(a.code.items.len);
        a.cur_try_start = @intCast(a.tries.items.len);
    }

    pub fn pc(a: *const Asm) u32 {
        return @as(u32, @intCast(a.code.items.len)) - a.cur_start;
    }

    pub fn endFunc(a: *Asm, name: []const u8, nparams: u16, nregs: u16, ncaps: u16) !void {
        const n = try a.str(name);
        try a.funcs.append(a.gpa, .{
            .name = n,
            .nparams = nparams,
            .nregs = nregs,
            .ncaps = ncaps,
            .flags = 0,
            .code_start = a.cur_start,
            .code_len = @as(u32, @intCast(a.code.items.len)) - a.cur_start,
            .try_start = a.cur_try_start,
            .try_count = @as(u32, @intCast(a.tries.items.len)) - a.cur_try_start,
            ._pad = 0,
        });
    }

    pub fn emit(a: *Asm, op: Op, x: u8, ra: u16, rb: u16, rc: u16) !void {
        try a.code.append(a.gpa, .{ .op = @backingInt(op), .x = x, .a = ra, .b = rb, .c = rc });
    }

    pub fn emitBc(a: *Asm, op: Op, ra: u16, bc: u32) !void {
        try a.emit(op, 0, ra, @truncate(bc), @truncate(bc >> 16));
    }

    pub fn patchBc(a: *Asm, at_pc: u32, bc: u32) void {
        const ins = &a.code.items[a.cur_start + at_pc];
        ins.b = @truncate(bc);
        ins.c = @truncate(bc >> 16);
    }

    pub fn addTry(a: *Asm, start: u32, end: u32, handler: u32, catch_reg: u16) !void {
        try a.tries.append(a.gpa, .{ .start = start, .end = end, .handler = handler, .catch_reg = catch_reg, ._pad = 0 });
    }

    /// Write the module. The caller owns the returned bytes.
    pub fn finish(a: *Asm) ![]u8 {
        var out: std.ArrayList(u8) = .empty;
        errdefer out.deinit(a.gpa);
        const meta_idx: ?u16 = if (a.meta) |m| try a.str(m) else null;
        const nsec: u32 = if (meta_idx != null) 8 else 7;
        try out.appendNTimes(a.gpa, 0, @sizeOf(module.Header) + nsec * @sizeOf(module.SectionEntry));
        var table: [8]module.SectionEntry = undefined;

        table[0] = try a.section(&out, 1);
        try put(a.gpa, &out, u32, @intCast(a.strings.items.len));
        var off: u32 = 0;
        try put(a.gpa, &out, u32, 0);
        for (a.strings.items) |s| {
            off += @intCast(s.len);
            try put(a.gpa, &out, u32, off);
        }
        for (a.strings.items) |s| try out.appendSlice(a.gpa, s);
        table[0].length = @as(u32, @intCast(out.items.len)) - table[0].offset;

        table[1] = try a.arraySection(&out, 2, f64, a.numbers.items);
        table[2] = try a.arraySection(&out, 3, module.FuncEntry, a.funcs.items);
        table[3] = try a.arraySection(&out, 4, module.Instr, a.code.items);
        table[4] = try a.arraySection(&out, 5, module.TryEntry, a.tries.items);
        table[5] = try a.arraySection(&out, 6, module.StepEntry, a.steps.items);
        table[6] = try a.section(&out, 8);
        try put(a.gpa, &out, u32, 0);
        table[6].length = 4;
        if (meta_idx) |mi| {
            table[7] = try a.section(&out, 9);
            try put(a.gpa, &out, u32, mi);
            table[7].length = 4;
        }

        const h: module.Header = .{ .magic = module.magic, .version = module.format_version, .flags = 1, .section_count = nsec, .reserved = 0, .hash = undefined };
        @memcpy(out.items[0..@sizeOf(module.Header)], std.mem.asBytes(&h));
        @memcpy(out.items[@sizeOf(module.Header)..][0 .. nsec * @sizeOf(module.SectionEntry)], std.mem.sliceAsBytes(table[0..nsec]));
        var digest: [32]u8 = undefined;
        std.crypto.hash.sha2.Sha256.hash(out.items[@sizeOf(module.Header)..], &digest, .{});
        @memcpy(out.items[16..48], &digest);
        return out.toOwnedSlice(a.gpa);
    }

    fn section(a: *Asm, out: *std.ArrayList(u8), id: u32) !module.SectionEntry {
        while (out.items.len % 8 != 0) try out.append(a.gpa, 0);
        return .{ .id = id, .offset = @intCast(out.items.len), .length = 0 };
    }

    fn arraySection(a: *Asm, out: *std.ArrayList(u8), id: u32, comptime T: type, items: []const T) !module.SectionEntry {
        var se = try a.section(out, id);
        try put(a.gpa, out, u32, @intCast(items.len));
        try put(a.gpa, out, u32, 0);
        try out.appendSlice(a.gpa, std.mem.sliceAsBytes(items));
        se.length = @as(u32, @intCast(out.items.len)) - se.offset;
        return se;
    }
};

fn put(gpa: std.mem.Allocator, out: *std.ArrayList(u8), comptime T: type, v: T) !void {
    var b: [@sizeOf(T)]u8 = undefined;
    std.mem.writeInt(T, &b, v, .little);
    try out.appendSlice(gpa, &b);
}
