//! Number formatting that needs the exact binary value of a double:
//! Number.prototype.toFixed and toString with a radix.
const std = @import("std");
const Managed = std.math.big.int.Managed;

/// ECMAScript toFixed for finite |x| < 1e21 and digits <= 100. The result
/// is the integer n closest to x * 10^digits (ties to the larger n).
pub fn toFixed(out: []u8, x: f64, digits: u32) ![]const u8 {
    std.debug.assert(std.math.isFinite(x) and @abs(x) < 1e21 and digits <= 100);
    var mem: [16 << 10]u8 = undefined;
    var fba = std.heap.FixedBufferAllocator.init(&mem);
    const gpa = fba.allocator();
    const bits: u64 = @bitCast(@abs(x));
    const biased: i32 = @intCast((bits >> 52) & 0x7FF);
    const frac = bits & ((@as(u64, 1) << 52) - 1);
    const mant: u64 = if (biased == 0) frac else frac | (@as(u64, 1) << 52);
    const exp2: i32 = if (biased == 0) -1074 else biased - 1075;

    var n = try Managed.initSet(gpa, mant);
    var ten = try Managed.initSet(gpa, 10);
    var p10 = try Managed.init(gpa);
    try p10.pow(&ten, digits);
    try n.mul(&n, &p10);
    if (exp2 >= 0) {
        try n.shiftLeft(&n, @intCast(exp2));
    } else {
        var den = try Managed.initSet(gpa, 1);
        try den.shiftLeft(&den, @intCast(-exp2));
        var q = try Managed.init(gpa);
        var r = try Managed.init(gpa);
        try q.divFloor(&r, &n, &den);
        try r.shiftLeft(&r, 1);
        if (r.order(den) != .lt) try q.addScalar(&q, 1);
        n = q;
    }
    const ds = try n.toString(gpa, 10, .lower);
    var w: usize = 0;
    if (x < 0) {
        out[w] = '-';
        w += 1;
    }
    // Pad so there is at least one digit before the point.
    const need = digits + 1;
    var pad: usize = if (ds.len < need) need - ds.len else 0;
    const total = pad + ds.len;
    const int_len = total - digits;
    var i: usize = 0;
    while (i < total) : (i += 1) {
        if (i == int_len) {
            out[w] = '.';
            w += 1;
        }
        if (pad > 0) {
            out[w] = '0';
            pad -= 1;
        } else {
            out[w] = ds[i - (total - ds.len)];
        }
        w += 1;
    }
    return out[0..w];
}

/// toString(radix) for a finite non-integer, as repeated multiplication of
/// the fraction. It is exact for radix 2, 4, 8, 16 and 32. For other radixes
/// it stops after 52 digits, which can differ from V8 in the last digits.
/// `x.toString(radix)` for a number that is not an integer: a port of V8's
/// DoubleToRadixCString (src/numbers/conversions.cc). It writes the shortest
/// digits that read back to `x`. `out` holds at least 1100 bytes.
pub fn radixFraction(out: []u8, x: f64, radix: u8) []const u8 {
    std.debug.assert(radix >= 2 and radix <= 36 and std.math.isFinite(x));
    std.debug.assert(out.len >= 1100);
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    var buffer: [2200]u8 = undefined;
    const half = buffer.len / 2;
    var integer_cursor: usize = half;
    var fraction_cursor: usize = half;
    const negative = x < 0;
    const value = @abs(x);
    var integer = @floor(value);
    var fraction = value - integer;
    const rf: f64 = @floatFromInt(radix);
    var delta = 0.5 * (std.math.nextAfter(f64, value, std.math.inf(f64)) - value);
    delta = @max(std.math.nextAfter(f64, 0.0, 1.0), delta);
    if (fraction >= delta) {
        buffer[fraction_cursor] = '.';
        fraction_cursor += 1;
        // Each digit scales delta by the radix, so the loop ends; the buffer bounds it too.
        while (fraction_cursor < buffer.len - 1) {
            fraction *= rf;
            delta *= rf;
            const digit: usize = @intFromFloat(fraction);
            buffer[fraction_cursor] = chars[digit];
            fraction_cursor += 1;
            fraction -= @floatFromInt(digit);
            if (fraction > 0.5 or (fraction == 0.5 and (digit & 1) == 1)) {
                if (fraction + delta > 1) {
                    // Round up, and carry into the integer part when every digit overflows.
                    while (true) {
                        fraction_cursor -= 1;
                        if (fraction_cursor == half) {
                            integer += 1;
                            break;
                        }
                        const c = buffer[fraction_cursor];
                        const d: usize = if (c > '9') c - 'a' + 10 else c - '0';
                        if (d + 1 < radix) {
                            buffer[fraction_cursor] = chars[d + 1];
                            fraction_cursor += 1;
                            break;
                        }
                    }
                    break;
                }
            }
            if (!(fraction >= delta)) break;
        }
    }
    // Digits that a double cannot hold become zeros (V8: while exponent > 0).
    while (integer / rf >= 9007199254740992.0 and integer_cursor > 1) {
        integer /= rf;
        integer_cursor -= 1;
        buffer[integer_cursor] = '0';
    }
    while (integer_cursor > 1) {
        const remainder = @mod(integer, rf);
        integer_cursor -= 1;
        buffer[integer_cursor] = chars[@intFromFloat(remainder)];
        integer = (integer - remainder) / rf;
        if (!(integer > 0)) break;
    }
    if (negative) {
        integer_cursor -= 1;
        buffer[integer_cursor] = '-';
    }
    const len = fraction_cursor - integer_cursor;
    @memcpy(out[0..len], buffer[integer_cursor..fraction_cursor]);
    return out[0..len];
}

test "radix fractions are V8's shortest digits" {
    var b: [1200]u8 = undefined;
    try std.testing.expectEqualStrings("0.4fzzzxjylrx", radixFraction(&b, 0.123456789, 36));
    try std.testing.expectEqualStrings("0.1", radixFraction(&b, 0.5, 2));
    try std.testing.expectEqualStrings("-ff.8", radixFraction(&b, -255.5, 16));
    try std.testing.expectEqualStrings("0.0001100110011001100110011001100110011001100110011001101", radixFraction(&b, 0.1, 2));
    try std.testing.expectEqualStrings("3.243f6a8885a3", radixFraction(&b, std.math.pi, 16));
    // [value, radix, Node.js text], from a seeded generator in Node.js.
    const text = @embedFile("testdata/radix_cases.json");
    const parsed = try std.json.parseFromSlice([]const std.json.Value, std.testing.allocator, text, .{});
    defer parsed.deinit();
    for (parsed.value) |c| {
        const row = c.array.items;
        const v: f64 = switch (row[0]) {
            .float => |f| f,
            .integer => |i| @floatFromInt(i),
            else => unreachable,
        };
        if (@trunc(v) == v) continue;
        try std.testing.expectEqualStrings(row[2].string, radixFraction(&b, v, @intCast(row[1].integer)));
    }
}

test "toFixed rounds the exact value" {
    var b: [256]u8 = undefined;
    try std.testing.expectEqualStrings("1.00", try toFixed(&b, 1.005, 2));
    try std.testing.expectEqualStrings("1.4", try toFixed(&b, 1.45, 1));
    try std.testing.expectEqualStrings("123.45600", try toFixed(&b, 123.456, 5));
    try std.testing.expectEqualStrings("-2", try toFixed(&b, -1.5, 0));
    try std.testing.expectEqualStrings("0.00", try toFixed(&b, 0.0001, 2));
    try std.testing.expectEqualStrings("3", try toFixed(&b, 2.5, 0));
    var r: [1200]u8 = undefined;
    try std.testing.expectEqualStrings("0.1", radixFraction(&r, 0.5, 2));
}
