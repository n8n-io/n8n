//! JSON encode and decode between region values and bytes, with the
//! semantics of JSON.stringify and JSON.parse. Text that is not UTF-8
//! decodes as U+FFFD, one for each bad byte, as Node.js decodes it. Both
//! directions use explicit stacks with a fixed depth, never recursion.
//!
//! The codec is in `simd_json.zig` (vector scans, bottom-up building). The
//! scalar codec it replaced is `json_ref.zig`; the tests below compare the
//! two on fixed documents and under the fuzzer.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const fast = @import("simd_json.zig");
const Builder = @import("arena.zig").Builder;
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

pub const DecodeError = fast.DecodeError;

/// Append JSON.stringify(v) to `b`. Returns false when the result is
/// `undefined` (v is undefined or a function).
pub fn encode(vm: *Vm, b: *Builder, v: Value, indent: []const u8) Err!bool {
    return fast.encode(vm, b, v, indent);
}

pub fn writeString(b: *Builder, s: []const u8) Err!void {
    return fast.writeString(b, s);
}

/// Parse `src` into a region value. A syntax error returns error.Syntax.
pub fn decode(vm: *Vm, src: []const u8) DecodeError!Value {
    return fast.decode(vm, src);
}

// ---- tests: the fast codec against the reference -------------------------------------

const heap = @import("heap.zig");
const module = @import("module.zig");
const ref = @import("json_ref.zig");
const numfmt = @import("numfmt.zig");
const Arena = @import("arena.zig").Arena;
const Asm = @import("asm.zig").Asm;
const Smith = std.testing.Smith;

/// Two VMs on one empty module: one decodes with the reference codec, one
/// with the fast codec. Static buffers keep the test stack small.
const Pair = struct {
    var region_a: [1 << 20]u8 align(8) = undefined;
    var region_b: [1 << 20]u8 align(8) = undefined;
    var scratch_a: [2 << 20]u8 = undefined;
    var scratch_b: [2 << 20]u8 = undefined;
    var natives: [8]u16 = undefined;

    m: module.Module,
    bytes: []u8,
    ra: heap.Region,
    rb: heap.Region,
    sa: Arena,
    sb: Arena,
    va: Vm,
    vb: Vm,

    fn init(p: *Pair, gpa: std.mem.Allocator) !void {
        var a: Asm = .{ .gpa = gpa };
        defer a.deinit();
        a.beginFunc();
        try a.emit(.ret, 0, 0, 0, 0);
        try a.endFunc("run", 1, 1, 0);
        p.bytes = try a.finish();
        p.m = try module.load(p.bytes, &natives);
        p.ra = heap.Region.init(&region_a);
        p.rb = heap.Region.init(&region_b);
        p.sa = Arena.init(&scratch_a);
        p.sb = Arena.init(&scratch_b);
        p.va = .{ .r = &p.ra, .m = &p.m, .scratch = &p.sa };
        p.vb = .{ .r = &p.rb, .m = &p.m, .scratch = &p.sb };
    }

    fn deinit(p: *Pair, gpa: std.mem.Allocator) void {
        gpa.free(p.bytes);
    }

    fn reset(p: *Pair) void {
        p.ra = heap.Region.init(&region_a);
        p.rb = heap.Region.init(&region_b);
        p.sa.reset();
        p.sb.reset();
    }
};

/// The reference treats some `\u` escapes differently from JSON.parse (see
/// `json_ref.zig`). True when `src` may hold one, so the outcomes may differ.
fn refQuirk(src: []const u8) bool {
    var i: usize = 0;
    while (std.mem.indexOfPos(u8, src, i, "\\u")) |at| : (i = at + 1) {
        const h = src[at + 2 ..];
        if (h.len < 4) return true;
        for (h[0..4]) |c| if (!std.ascii.isHex(c)) return true;
        const cp = std.fmt.parseInt(u16, h[0..4], 16) catch return true;
        if (cp >= 0xD800 and cp < 0xDC00 and std.mem.startsWith(u8, h[4..], "\\u")) return true;
    }
    return false;
}

/// Decode `src` with both codecs and check they agree: both fail with the
/// same error, or both succeed and all four encodings are the same bytes.
fn checkSame(p: *Pair, src: []const u8) !void {
    p.reset();
    const a = ref.decode(&p.va, src);
    const b = fast.decode(&p.vb, src);
    const a_v = a catch |ea| {
        const b_v = b catch |eb| {
            if (ea == eb or ea == error.RegionFull or eb == error.RegionFull) return;
            std.debug.print("errors differ on {x}: ref {s}, fast {s}\n", .{ src, @errorName(ea), @errorName(eb) });
            return error.ErrorsDiffer;
        };
        _ = b_v;
        if (ea == error.RegionFull or ea == error.ArenaFull or refQuirk(src)) return;
        std.debug.print("ref rejects ({s}), fast accepts: {x}\n", .{ @errorName(ea), src });
        return error.FastAcceptsMore;
    };
    const b_v = b catch |eb| {
        if (eb == error.RegionFull or eb == error.ArenaFull or refQuirk(src)) return;
        std.debug.print("fast rejects ({s}), ref accepts: {x}\n", .{ @errorName(eb), src });
        return error.FastRejects;
    };
    var outs: [4][]const u8 = undefined;
    var ba = p.sa.builder();
    if (!try ref.encode(&p.va, &ba, a_v, "")) try ba.append("undefined");
    outs[0] = ba.finish();
    var bb = p.sb.builder();
    if (!try fast.encode(&p.vb, &bb, b_v, "")) try bb.append("undefined");
    outs[1] = bb.finish();
    // Each encoder on the other's value: the trees are the same.
    var bc = p.sa.builder();
    if (!try fast.encode(&p.va, &bc, a_v, "")) try bc.append("undefined");
    outs[2] = bc.finish();
    var bd = p.sb.builder();
    if (!try ref.encode(&p.vb, &bd, b_v, "")) try bd.append("undefined");
    outs[3] = bd.finish();
    for (outs[1..]) |o| {
        if (!std.mem.eql(u8, outs[0], o)) {
            std.debug.print("encodings differ for {x}:\n{s}\n{s}\n{s}\n{s}\n", .{ src, outs[0], outs[1], outs[2], outs[3] });
            return error.EncodingsDiffer;
        }
    }
    // Indented output takes the same path through the frames.
    var be = p.sa.builder();
    _ = try ref.encode(&p.va, &be, a_v, "  ");
    const ind_a = be.finish();
    var bf = p.sb.builder();
    _ = try fast.encode(&p.vb, &bf, b_v, "  ");
    if (!std.mem.eql(u8, ind_a, bf.finish())) return error.IndentedEncodingsDiffer;
    // Fast decode uses no more region than the reference.
    if (p.rb.used > p.ra.used) {
        std.debug.print("fast used {d} region bytes, ref {d}: {s}\n", .{ p.rb.used, p.ra.used, src });
        return error.FastUsesMoreRegion;
    }
}

/// A writer over a fixed buffer for building test documents (the core
/// does no I/O).
const Out = struct {
    buf: []u8,
    len: usize = 0,

    fn init(buf: []u8) Out {
        return .{ .buf = buf };
    }
    fn writeAll(o: *Out, s: []const u8) error{Full}!void {
        if (o.len + s.len > o.buf.len) return error.Full;
        @memcpy(o.buf[o.len..][0..s.len], s);
        o.len += s.len;
    }
    fn writeByte(o: *Out, c: u8) error{Full}!void {
        return o.writeAll(&.{c});
    }
    fn print(o: *Out, comptime fmt: []const u8, args: anytype) error{Full}!void {
        const got = std.fmt.bufPrint(o.buf[o.len..], fmt, args) catch return error.Full;
        o.len += got.len;
    }
    fn buffered(o: *const Out) []const u8 {
        return o.buf[0..o.len];
    }
};

const fixed_docs = [_][]const u8{
    "{\"kind\":\"list\",\"nextPageToken\":null,\"resultSizeEstimate\":1,\"items\":[{\"id\":\"rec_gjdgxs\",\"createdTime\":\"2023-11-14T22:13:20.000Z\",\"fields\":{\"Name\":\"done 0\",\"Email\":\"user0@example.com\",\"Amount\":519.82,\"Count\":45,\"Done\":true,\"Tags\":[\"open\",\"open\"],\"Notes\":\"Line one \\\"quoted\\\"\\nline two user \xc3\xa9t\xc3\xa9\"}}]}",
    "{\"a\":[1,2.5,-0,1e21,\"x\\u00e9\\n\"],\"b\":{\"c\":null,\"d\":true}}",
    "[\"\\ud83d\\ude00\",\"\\ud800\",1e400,-1e-7]",
    "{\"1\":1,\"0\":0,\"b\":2,\"a\":3,\"b\":4}",
    "  \"\\\"\\\\\\/\\b\\f\\n\\r\\t\"  ",
    "\"[\xd9\"",
    "[\"\xd9\",\"a\xe2\x82\\n\",\"\xed\xa0\x80\",\"\xc3\xa9\"]",
    "[0.1,0.30000000000000004,123456789012345678,1.5e-10,5e-324,1.7976931348623157e308,-12.000,0.000001,1e-7,100,1e21,1e20]",
    "[true,false,null,[],{},[[]],{\"\":{}}]",
    "{\"a\" : [ 1 , 2 ] , \"b\" :\t\"x\" }\n",
    "[1,]",
    "{\"a\":1,}",
    "[01]",
    "[1 2]",
    "truex",
    "[\"\x01\"]",
    "\"abc",
    "{\"a\"}",
    "[-]",
    "[1.]",
    "[1e]",
    "[.5]",
    "\"\\x\"",
    "",
    "   ",
    "[\"\\u12\"]",
    "\"\\\\\\\"\\\\\"",
    "{\"emoji \xf0\x9f\x98\x80\":\"\xf0\x9f\x98\x80\",\"bad \xf4\x90\x80\x80\":\"\xc0\xaf\"}",
};

test "json: the fast codec agrees with the reference on fixed documents" {
    const gpa = std.testing.allocator;
    var p: Pair = undefined;
    try p.init(gpa);
    defer p.deinit(gpa);
    for (fixed_docs) |doc| try checkSame(&p, doc);
    // Blocks of 64 bytes: strings, escapes and numbers across each boundary.
    var buf: [400]u8 = undefined;
    for (0..130) |pad| {
        var w = Out.init(&buf);
        try w.writeAll("[");
        for (0..pad) |_| try w.writeAll(" ");
        try w.writeAll("\"ab\\\\\\\"c\\\\\",12345.25,\"x\\ny\",{\"k\":true}]");
        try checkSame(&p, w.buffered());
    }
}

test "json: large containers move to the region in parts" {
    const gpa = std.testing.allocator;
    var p: Pair = undefined;
    try p.init(gpa);
    defer p.deinit(gpa);
    const S = struct {
        var buf: [256 << 10]u8 = undefined;
    };
    var w = Out.init(&S.buf);
    try w.writeAll("{\"rows\":[");
    for (0..1500) |i| {
        if (i > 0) try w.writeAll(",");
        try w.print("{{\"id\":{d},\"k{d}\":[{d},\"v\"],\"id\":{d}}}", .{ i, i % 7, i, i + 1 });
    }
    try w.writeAll("],\"tail\":{");
    for (0..1200) |i| {
        if (i > 0) try w.writeAll(",");
        try w.print("\"k{d}\":{d}", .{ i % 900, i });
    }
    try w.writeAll("}}");
    try checkSame(&p, w.buffered());
}

test "regression: bytes that are not UTF-8 decode as U+FFFD (fuzz)" {
    const gpa = std.testing.allocator;
    var p: Pair = undefined;
    try p.init(gpa);
    defer p.deinit(gpa);
    const v = try decode(&p.vb, "[\"\xd9\",\"a\xe2\x82\\n\",\"\xed\xa0\x80\",\"\xc3\xa9\"]");
    var b = p.sb.builder();
    _ = try encode(&p.vb, &b, v, "");
    try std.testing.expectEqualStrings("[\"\u{FFFD}\",\"a\u{FFFD}\u{FFFD}\\n\",\"\u{FFFD}\u{FFFD}\u{FFFD}\",\"\u{e9}\"]", b.bytes());
}

test "json: escapes that the reference read differently follow JSON.parse" {
    const gpa = std.testing.allocator;
    var p: Pair = undefined;
    try p.init(gpa);
    defer p.deinit(gpa);
    // A high surrogate before another escape stays a lone surrogate (U+FFFD).
    const v = try decode(&p.vb, "\"\\ud800\\u0041\"");
    try std.testing.expectEqualStrings("\u{FFFD}A", p.vb.str(v));
    // `\u` takes four hex digits, nothing else.
    for ([_][]const u8{ "\"\\u+12a\"", "\"\\u-000\"", "\"\\u1_23\"" }) |s| {
        try std.testing.expectError(error.Syntax, decode(&p.vb, s));
    }
}

test "json: writeString takes any bytes" {
    var mem: [256]u8 = undefined;
    var arena = Arena.init(&mem);
    var b = arena.builder();
    // The reference stopped on overlapping surrogate leads (a slice that
    // ends before it starts); this goes on after the first.
    try writeString(&b, "\xed\xed\xa0\x80");
    try std.testing.expectEqualStrings("\"\\udb60\x80\"", b.bytes());
    // Exactly full, then one byte too many.
    var small: [8]u8 = undefined;
    var a2 = Arena.init(&small);
    var b2 = a2.builder();
    try writeString(&b2, "a\"b\n");
    try std.testing.expectEqualStrings("\"a\\\"b\\n\"", b2.bytes());
    try std.testing.expectError(error.ArenaFull, writeString(&b2, ""));
}

fn fuzzAgainstRef(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    var input_buf: [16 << 10]u8 = undefined;
    const input = input_buf[0..smith.slice(&input_buf)];
    var p: Pair = undefined;
    try p.init(gpa);
    defer p.deinit(gpa);
    try checkSame(&p, input);
}

/// A JSON-like document from the fuzzer's choices: mostly valid, with the
/// shapes that matter (escapes, UTF-8 and bad bytes, numbers, repeated keys,
/// whitespace, containers larger than the value stack).
fn generate(smith: *Smith, out: *Out) !void {
    const pieces = [_][]const u8{ "\\n", "\\\"", "\\\\", "\\u00e9", "\\ud83d\\ude00", "\\ud800", "\xc3\xa9", "\xf0\x9f\x98\x80", "\xed\xa0\x80", "\xff", "a", "key", " ", "\\/", "\x7f" };
    const numbers = [_][]const u8{ "0", "-0", "1", "-12", "519.82", "0.1", "1e21", "1E-7", "123456789012345678901", "9007199254740993", "2.5e+3", "0.000123", "1e400", "-1e-400", "4.35", "100.10" };
    var depth: u32 = 0;
    var open: [32]u8 = undefined;
    var first = true;
    var steps: u32 = 0;
    while (steps < 400) : (steps += 1) {
        if (smith.eosWeightedSimple(15, 1) and depth == 0 and !first) break;
        const in_obj = depth > 0 and open[depth - 1] == '{';
        if (!first) {
            if (depth == 0) break;
            const c = smith.index(8);
            if (c == 0) {
                depth -= 1;
                try out.writeByte(if (open[depth] == '{') '}' else ']');
                continue;
            }
            try out.writeAll(if (smith.index(20) == 0) " , " else ",");
        }
        first = false;
        if (in_obj) {
            try out.writeByte('"');
            const nk = smith.index(3);
            for (0..nk) |_| try out.writeAll(pieces[smith.index(pieces.len)]);
            try out.writeAll("\":");
        }
        switch (smith.index(7)) {
            0 => if (depth < open.len) {
                const brace = smith.value(bool);
                open[depth] = if (brace) '{' else '[';
                depth += 1;
                try out.writeByte(open[depth - 1]);
                first = true;
                // A long array, to fill the value stack.
                if (!brace and smith.index(16) == 0) {
                    for (0..1100) |i| try out.print("{d},", .{i});
                    try out.writeAll("0");
                    first = false;
                }
            } else try out.writeAll("null"),
            1, 2 => {
                try out.writeByte('"');
                const n = smith.index(6);
                for (0..n) |_| try out.writeAll(pieces[smith.index(pieces.len)]);
                try out.writeByte('"');
            },
            3, 4 => try out.writeAll(numbers[smith.index(numbers.len)]),
            5 => try out.writeAll(([_][]const u8{ "true", "false", "null" })[smith.index(3)]),
            else => {
                var nb: [numfmt.max_len]u8 = undefined;
                const bits = smith.value(u64);
                const f: f64 = @bitCast(bits);
                try out.writeAll(if (std.math.isFinite(f)) numfmt.format(&nb, f) else "1");
            },
        }
    }
    while (depth > 0) {
        depth -= 1;
        try out.writeByte(if (open[depth] == '{') '}' else ']');
    }
}

fn fuzzGenerated(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    var buf: [64 << 10]u8 = undefined;
    var w = Out.init(&buf);
    generate(smith, &w) catch {}; // A full buffer cuts the document: still a test input.
    var p: Pair = undefined;
    try p.init(gpa);
    defer p.deinit(gpa);
    try checkSame(&p, w.buffered());
}

fn fuzzNumbers(_: void, smith: *Smith) !void {
    var k: usize = 0;
    while (k < 16) : (k += 1) {
        // Any double, and decimals with a few fraction digits.
        const f: f64 = if (smith.value(bool)) @bitCast(smith.value(u64)) else blk: {
            const m: f64 = @floatFromInt(smith.valueRangeAtMost(u64, 0, 1 << 53));
            const e = smith.valueRangeAtMost(u32, 0, 22);
            const x = m / std.math.pow(f64, 10, @floatFromInt(e));
            break :blk if (smith.value(bool)) -x else x;
        };
        if (!std.math.isFinite(f)) continue;
        var a: [numfmt.max_len]u8 = undefined;
        var b: [numfmt.max_len]u8 = undefined;
        const want = numfmt.format(&a, f);
        const got = fast.formatNumber(&b, f);
        if (!std.mem.eql(u8, want, got)) {
            std.debug.print("number {x}: numfmt {s}, fast {s}\n", .{ @as(u64, @bitCast(f)), want, got });
            return error.NumberFormatDiffers;
        }
        // And the text decodes to the same double both ways.
        const gpa = std.testing.allocator;
        var p: Pair = undefined;
        try p.init(gpa);
        defer p.deinit(gpa);
        try checkSame(&p, want);
    }
}

fn fuzzWriteString(_: void, smith: *Smith) !void {
    // Valid WTF-8 (strings in a region): code points, lone surrogates included.
    var s: [512]u8 = undefined;
    var n: usize = 0;
    while (n + 4 <= s.len and !smith.eosWeightedSimple(30, 1)) {
        const cp: u21 = switch (smith.index(4)) {
            0 => smith.valueRangeAtMost(u21, 0, 0x7F),
            1 => smith.valueRangeAtMost(u21, 0, 0x20),
            2 => smith.valueRangeAtMost(u21, 0xD800, 0xDFFF),
            else => smith.valueRangeAtMost(u21, 0x80, 0x10FFFF),
        };
        if (cp >= 0xD800 and cp < 0xE000) {
            s[n..][0..3].* = .{ 0xED, @intCast(0x80 | ((cp >> 6) & 0x3F)), @intCast(0x80 | (cp & 0x3F)) };
            n += 3;
        } else n += std.unicode.utf8Encode(cp, s[n..][0..4]) catch unreachable; // cp is a scalar value.
    }
    var ma: [4096]u8 = undefined;
    var mb: [4096]u8 = undefined;
    var aa = Arena.init(&ma);
    var ab = Arena.init(&mb);
    var ba = aa.builder();
    var bb = ab.builder();
    try ref.writeString(&ba, s[0..n]);
    try fast.writeString(&bb, s[0..n]);
    if (!std.mem.eql(u8, ba.bytes(), bb.bytes())) {
        std.debug.print("writeString differs for {x}:\n{s}\n{s}\n", .{ s[0..n], ba.bytes(), bb.bytes() });
        return error.WriteStringDiffers;
    }
}

fn seed(comptime s: []const u8) *const [4 + s.len]u8 {
    return comptime blk: {
        var out: [4 + s.len]u8 = undefined;
        std.mem.writeInt(u32, out[0..4], s.len, .little);
        @memcpy(out[4..], s);
        const final = out;
        break :blk &final;
    };
}

test "fuzz json against the reference" {
    try std.testing.fuzz({}, fuzzAgainstRef, .{ .corpus = &.{
        seed(fixed_docs[0]),
        seed(fixed_docs[1]),
        seed(fixed_docs[2]),
        seed(fixed_docs[3]),
        seed(fixed_docs[7]),
        seed(fixed_docs[27]),
    } });
}

test "fuzz json generated documents against the reference" {
    try std.testing.fuzz({}, fuzzGenerated, .{});
}

test "fuzz json number formatting against numfmt" {
    try std.testing.fuzz({}, fuzzNumbers, .{});
}

test "fuzz json writeString against the reference" {
    try std.testing.fuzz({}, fuzzWriteString, .{});
}
