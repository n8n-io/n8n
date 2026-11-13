//! One 8-byte word per value. A non-NaN f64 is a number. A boxed value has
//! `0xFFF8 | kind` in the top 16 bits and a 32-bit payload in the low bits.
const std = @import("std");

pub const Value = u64;

pub const Kind = enum(u3) {
    number = 0,
    undefined = 1,
    null = 2,
    boolean = 3,
    string = 4,
    array = 5,
    object = 6,
    /// Closures and cells. The object header tells them apart.
    ref = 7,
};

/// Handles at or above this point name module string constants.
pub const const_handle_base: u32 = 0x8000_0000;

const box_base: u64 = 0xFFF8 << 48;
const canonical_nan: u64 = 0x7FF8_0000_0000_0000;

pub const undef: Value = box(.undefined, 0);
pub const null_: Value = box(.null, 0);
pub const true_: Value = box(.boolean, 1);
pub const false_: Value = box(.boolean, 0);

pub inline fn box(kind: Kind, p: u32) Value {
    std.debug.assert(kind != .number);
    return box_base | (@as(u64, @backingInt(kind)) << 48) | p;
}

pub inline fn kindOf(v: Value) Kind {
    const top = v >> 48;
    if (top <= 0xFFF8) return .number;
    return @fromBackingInt(@intCast(@as(u3, @truncate(top & 0x7))));
}

pub inline fn payload(v: Value) u32 {
    return @truncate(v);
}

pub inline fn num(f: f64) Value {
    if (std.math.isNan(f)) return canonical_nan;
    return @bitCast(f);
}

pub inline fn asNum(v: Value) f64 {
    std.debug.assert(kindOf(v) == .number);
    return @bitCast(v);
}

pub inline fn boolean(b: bool) Value {
    return if (b) true_ else false_;
}

pub inline fn isHeap(v: Value) bool {
    return switch (kindOf(v)) {
        .string, .array, .object, .ref => payload(v) < const_handle_base,
        else => false,
    };
}

pub inline fn constString(index: u32) Value {
    return box(.string, const_handle_base | index);
}

pub inline fn isNullish(v: Value) bool {
    const k = kindOf(v);
    return k == .undefined or k == .null;
}

test "boxing round trips" {
    try std.testing.expectEqual(Kind.number, kindOf(num(1.5)));
    try std.testing.expectEqual(Kind.number, kindOf(num(std.math.nan(f64))));
    try std.testing.expectEqual(Kind.number, kindOf(num(-std.math.inf(f64))));
    try std.testing.expectEqual(Kind.string, kindOf(constString(3)));
    try std.testing.expectEqual(@as(u32, const_handle_base | 3), payload(constString(3)));
    try std.testing.expectEqual(Kind.undefined, kindOf(undef));
    try std.testing.expect(!isHeap(constString(1)));
    try std.testing.expect(isHeap(box(.object, 64)));
    // Negative NaN from arithmetic must stay a number after canonicalising.
    const neg_nan: f64 = @bitCast(@as(u64, 0xFFF8_0000_0000_0001));
    try std.testing.expectEqual(Kind.number, kindOf(num(neg_nan)));
}
