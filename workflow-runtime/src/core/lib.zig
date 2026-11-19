//! The fixed standard library: functions called with CALLN and methods
//! called with CALLM. Names resolve to ids once, when a module is verified.
//!
//! To add a native intrinsic:
//! 1. Add a tag to `Native` (or `Method`) and a name to `native_names`
//!    (or `method_names`).
//! 2. Implement the handler in its domain file: `lib_math.zig`,
//!    `lib_string.zig`, `lib_array.zig`, `lib_object.zig`, or `lib_ctx.zig`.
//! 3. Wire one arm in `callNative` (or `callMethod`).
const std = @import("std");
const value = @import("value.zig");
const date = @import("date.zig");
const ops = @import("ops.zig");
const unicase = @import("unicase.zig");

const lib_types = @import("lib_types.zig");
const lib_math = @import("lib_math.zig");
const lib_string = @import("lib_string.zig");
const lib_array = @import("lib_array.zig");
const lib_object = @import("lib_object.zig");
const lib_ctx = @import("lib_ctx.zig");

const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

pub const Native = lib_types.Native;
pub const Method = lib_types.Method;
const native_names = lib_types.native_names;
const method_names = lib_types.method_names;
const date_base = lib_types.date_base;

pub fn nativeId(name: []const u8) ?u16 {
    for (native_names, 0..) |n, i| if (std.mem.eql(u8, n, name)) return @intCast(i);
    if (date.id(name)) |i| return date_base + i;
    return null;
}

pub fn methodId(name: []const u8) ?u16 {
    for (method_names, 0..) |n, i| if (std.mem.eql(u8, n, name)) return @intCast(i);
    return null;
}

pub const methodName = lib_types.methodName;
pub const arg = lib_types.arg;
pub const numArg = lib_types.numArg;

// ---- natives --------------------------------------------------------------

pub fn callNative(vm: *Vm, id: u16, args: []const Value) Err!Value {
    if (id >= date_base) return date.call(vm, id - date_base, args);
    const n: Native = @fromBackingInt(@intCast(id));
    return switch (n) {
        .math_floor, .math_ceil, .math_round, .math_trunc, .math_abs, .math_min, .math_max, .math_pow, .math_sqrt, .math_sign, .math_log, .math_exp, .number, .parse_int, .parse_float, .is_nan, .number_is_integer, .number_is_finite => lib_math.callNative(vm, n, args),
        .json_stringify, .json_parse, .object_keys, .object_values, .object_entries, .object_assign => lib_object.callNative(vm, n, args),
        .array_is_array => value.boolean(value.kindOf(arg(args, 0)) == .array),
        .string => if (args.len == 0) vm.newStr("") else vm.toStr(args[0]),
        .boolean => value.boolean(vm.truthy(arg(args, 0))),
        .regexp_exec, .btoa, .atob, .encode_uri_component, .decode_uri_component, .escape, .unescape, .encode_uri, .base64_encode_utf8, .xml_parse, .xml_snippet, .xml_content, .static_data, .polled, .ascii_is, .ascii_is_printable, .credential_flag => lib_ctx.callNative(vm, n, args),
    };
}

// ---- methods --------------------------------------------------------------

pub fn callMethod(vm: *Vm, id: u16, recv: Value, args: []const Value) Err!Value {
    const m: Method = @fromBackingInt(@intCast(id));
    return switch (value.kindOf(recv)) {
        .string => lib_string.stringMethod(vm, m, recv, args),
        .array => lib_array.arrayMethod(vm, m, recv, args),
        .number => lib_math.numberMethod(vm, m, recv, args),
        .undefined, .null => vm.throwMsg(.type_error, "Cannot read properties of {s} (reading '{s}')", .{ if (value.kindOf(recv) == .null) "null" else "undefined", methodName(id) }),
        else => vm.throwMsg(.type_error, "value.{s} is not a function", .{methodName(id)}),
    };
}

/// `Object.assign(target, src)` for one source, in key order (the
/// implementation lives in `lib_object.zig`; this keeps `lib.spreadObject`
/// the name that `interp.zig` calls).
pub const spreadObject = lib_object.spreadObject;
pub const notAFunction = lib_types.notAFunction;
pub const integerOrInfinity = lib_types.integerOrInfinity;

test {
    _ = date;
}

fn testCase(buf: []u8, input: []const u8, upper: bool) ![]const u8 {
    var a = @import("arena.zig").Arena.init(buf);
    var b = a.builder();
    try lib_string.caseMap(&b, input, upper);
    return b.finish();
}

test "unitByte: UTF-16 positions, inside a surrogate pair, past the end" {
    const t = "a\u{1F600}bc";
    try std.testing.expectEqual(lib_string.UnitByte{ .byte = 0, .inside = false }, lib_string.unitByte(t, 0));
    try std.testing.expectEqual(lib_string.UnitByte{ .byte = 1, .inside = false }, lib_string.unitByte(t, 1));
    try std.testing.expectEqual(lib_string.UnitByte{ .byte = 1, .inside = true }, lib_string.unitByte(t, 2));
    try std.testing.expectEqual(lib_string.UnitByte{ .byte = 5, .inside = false }, lib_string.unitByte(t, 3));
    try std.testing.expectEqual(lib_string.UnitByte{ .byte = 7, .inside = false }, lib_string.unitByte(t, 99));
}

test "case mapping matches Node for each code point" {
    var sums = [2]std.hash.Fnv1a_64{ .init(), .init() };
    var cp: u21 = 0;
    while (cp <= 0x10FFFF) : (cp += 1) {
        if (cp >= 0xD800 and cp <= 0xDFFF) continue;
        var enc: [4]u8 = undefined;
        const n = try std.unicode.utf8Encode(cp, &enc);
        for (&sums, [2]bool{ true, false }) |*h, upper| {
            var out: [16]u8 = undefined;
            const got = try testCase(&out, enc[0..n], upper);
            h.update(got);
            h.update(&.{0});
        }
    }
    try std.testing.expectEqual(unicase.test_sum_upper, sums[0].final());
    try std.testing.expectEqual(unicase.test_sum_lower, sums[1].final());
}

test "canonicalize matches Node for each code unit" {
    var h = std.hash.Fnv1a_64.init();
    var inv: [unicase.max_inverse]u16 = undefined;
    var ch: u32 = 0;
    while (ch <= 0xFFFF) : (ch += 1) {
        const c: u16 = @intCast(ch);
        const cc = unicase.canonicalize(c);
        var text: [8]u8 = undefined;
        h.update(std.fmt.bufPrint(&text, "{d}", .{cc}) catch unreachable);
        h.update(&.{0});
        const members = unicase.canonicalizeInverse(cc, &inv);
        try std.testing.expect(std.mem.indexOfScalar(u16, members, c) != null);
    }
    try std.testing.expectEqual(unicase.test_sum_canonicalize, h.final());
}

test "case mapping of strings matches Node" {
    var lines = std.mem.tokenizeScalar(u8, @embedFile("testdata/unicase_cases.txt"), '\n');
    var buf: [512]u8 = undefined;
    while (lines.next()) |line| {
        var cols = std.mem.splitScalar(u8, line, '\t');
        const input = cols.next().?;
        const upper = cols.next().?;
        const lower = cols.next().?;
        try std.testing.expectEqualStrings(upper, try testCase(&buf, input, true));
        try std.testing.expectEqualStrings(lower, try testCase(&buf, input, false));
    }
    // Bytes that are not valid UTF-8 (a lone surrogate) pass through.
    try std.testing.expectEqualStrings("A\xED\xA0\x80\xCE\xA3", try testCase(&buf, "a\xED\xA0\x80\xCF\x83", true));
}
