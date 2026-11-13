//! ECMAScript Number::toString(10) and StringToNumber.
const std = @import("std");
const float = std.fmt.float;

pub const max_len = 32;

/// Write the ECMAScript string form of `x` into `buf` and return it.
pub fn format(buf: *[max_len]u8, x: f64) []const u8 {
    if (std.math.isNan(x)) return copy(buf, "NaN");
    if (std.math.isInf(x)) return copy(buf, if (x > 0) "Infinity" else "-Infinity");
    if (x == 0) return copy(buf, "0");

    const d = float.binaryToDecimal(u64, @bitCast(x), 52, 11, false, &float.Backend64_TablesFull);
    var digits_buf: [20]u8 = undefined;
    var mant = d.mantissa;
    var k: usize = 0;
    while (mant > 0) : (mant /= 10) {
        digits_buf[k] = '0' + @as(u8, @intCast(mant % 10));
        k += 1;
    }
    std.mem.reverse(u8, digits_buf[0..k]);
    // Strip trailing zeros: they belong in the exponent.
    var exp: i32 = d.exponent;
    while (k > 1 and digits_buf[k - 1] == '0') {
        k -= 1;
        exp += 1;
    }
    const digits = digits_buf[0..k];
    const n: i32 = exp + @as(i32, @intCast(k));
    var w: Writer = .{ .buf = buf };
    if (x < 0) w.put('-');
    const ki: i32 = @intCast(k);
    if (ki <= n and n <= 21) {
        w.all(digits);
        var z = n - ki;
        while (z > 0) : (z -= 1) w.put('0');
    } else if (0 < n and n <= 21) {
        const nu: usize = @intCast(n);
        w.all(digits[0..nu]);
        w.put('.');
        w.all(digits[nu..]);
    } else if (-6 < n and n <= 0) {
        w.all("0.");
        var z = -n;
        while (z > 0) : (z -= 1) w.put('0');
        w.all(digits);
    } else {
        w.put(digits[0]);
        if (k > 1) {
            w.put('.');
            w.all(digits[1..]);
        }
        w.put('e');
        const e = n - 1;
        w.put(if (e < 0) '-' else '+');
        var eb: [8]u8 = undefined;
        const es = std.fmt.bufPrint(&eb, "{d}", .{@abs(e)}) catch unreachable; // 8 bytes hold any i32 exponent of a double.
        w.all(es);
    }
    return buf[0..w.len];
}

const Writer = struct {
    buf: *[max_len]u8,
    len: usize = 0,
    fn put(w: *Writer, c: u8) void {
        w.buf[w.len] = c;
        w.len += 1;
    }
    fn all(w: *Writer, s: []const u8) void {
        @memcpy(w.buf[w.len..][0..s.len], s);
        w.len += s.len;
    }
};

fn copy(buf: *[max_len]u8, s: []const u8) []const u8 {
    @memcpy(buf[0..s.len], s);
    return buf[0..s.len];
}

fn isJsSpace(c: u8) bool {
    return c == ' ' or c == '\t' or c == '\n' or c == '\r' or c == 0x0B or c == 0x0C;
}

pub fn trimJs(s: []const u8) []const u8 {
    var a: usize = 0;
    var b: usize = s.len;
    while (a < b and isJsSpace(s[a])) a += 1;
    while (b > a and isJsSpace(s[b - 1])) b -= 1;
    return s[a..b];
}

/// ECMAScript StringToNumber.
pub fn parse(s_in: []const u8) f64 {
    const s = trimJs(s_in);
    if (s.len == 0) return 0;
    if (s.len > 2 and s[0] == '0' and (s[1] == 'x' or s[1] == 'X' or s[1] == 'o' or s[1] == 'O' or s[1] == 'b' or s[1] == 'B')) {
        const radix: u8 = switch (s[1]) {
            'x', 'X' => 16,
            'o', 'O' => 8,
            else => 2,
        };
        var acc: f64 = 0;
        for (s[2..]) |c| {
            const dv = std.fmt.charToDigit(c, radix) catch return std.math.nan(f64);
            acc = acc * @as(f64, @floatFromInt(radix)) + @as(f64, @floatFromInt(dv));
        }
        return acc;
    }
    const body = if (s[0] == '+' or s[0] == '-') s[1..] else s;
    if (std.mem.eql(u8, body, "Infinity")) return if (s[0] == '-') -std.math.inf(f64) else std.math.inf(f64);
    for (body) |c| {
        const ok = (c >= '0' and c <= '9') or c == '.' or c == 'e' or c == 'E' or c == '+' or c == '-';
        if (!ok) return std.math.nan(f64);
    }
    if (body.len == 0 or std.mem.eql(u8, body, ".")) return std.math.nan(f64);
    return std.fmt.parseFloat(f64, s) catch std.math.nan(f64);
}

/// parseFloat: the longest valid decimal prefix after leading whitespace.
pub fn parseFloatPrefix(s_in: []const u8) f64 {
    const s = trimJs(s_in);
    var i: usize = 0;
    if (i < s.len and (s[i] == '+' or s[i] == '-')) i += 1;
    if (std.mem.startsWith(u8, s[i..], "Infinity")) return if (s.len > 0 and s[0] == '-') -std.math.inf(f64) else std.math.inf(f64);
    var best: usize = 0;
    var seen_digit = false;
    var seen_dot = false;
    while (i < s.len) : (i += 1) {
        const c = s[i];
        if (c >= '0' and c <= '9') {
            seen_digit = true;
            best = i + 1;
        } else if (c == '.' and !seen_dot) {
            seen_dot = true;
        } else break;
    }
    if (!seen_digit) return std.math.nan(f64);
    // Optional exponent.
    if (i < s.len and (s[i] == 'e' or s[i] == 'E')) {
        var j = i + 1;
        if (j < s.len and (s[j] == '+' or s[j] == '-')) j += 1;
        const start = j;
        while (j < s.len and s[j] >= '0' and s[j] <= '9') j += 1;
        if (j > start) best = j;
    }
    return std.fmt.parseFloat(f64, s[0..best]) catch std.math.nan(f64);
}

/// parseInt(s, radix).
pub fn parseIntJs(s_in: []const u8, radix_in: f64) f64 {
    var s = trimJs(s_in);
    var neg = false;
    if (s.len > 0 and (s[0] == '+' or s[0] == '-')) {
        neg = s[0] == '-';
        s = s[1..];
    }
    // ECMAScript: R = ToInt32(radix); 0 means 10 (or 16 for "0x"); outside 2..36 gives NaN.
    const r32 = toInt32(radix_in);
    if (r32 != 0 and (r32 < 2 or r32 > 36)) return std.math.nan(f64);
    var radix: u8 = if (r32 == 0) 10 else @intCast(r32);
    std.debug.assert(radix >= 2 and radix <= 36);
    if ((radix == 16 or r32 == 0) and s.len >= 2 and s[0] == '0' and (s[1] == 'x' or s[1] == 'X')) {
        radix = 16;
        s = s[2..];
    }
    var acc: f64 = 0;
    var any = false;
    for (s) |c| {
        const dv = std.fmt.charToDigit(c, radix) catch break;
        acc = acc * @as(f64, @floatFromInt(radix)) + @as(f64, @floatFromInt(dv));
        any = true;
    }
    if (!any) return std.math.nan(f64);
    return if (neg) -acc else acc;
}

/// ToInt32.
pub fn toInt32(x: f64) i32 {
    if (std.math.isNan(x) or std.math.isInf(x)) return 0;
    const t = @trunc(x);
    const m = @mod(t, 4294967296.0);
    const u: u32 = @intFromFloat(m);
    return @bitCast(u);
}

pub fn toUint32(x: f64) u32 {
    return @bitCast(toInt32(x));
}

fn expectFmt(expected: []const u8, x: f64) !void {
    var b: [max_len]u8 = undefined;
    try std.testing.expectEqualStrings(expected, format(&b, x));
}

test "number formatting matches ECMAScript" {
    try expectFmt("0", -0.0);
    try expectFmt("1", 1);
    try expectFmt("-1.5", -1.5);
    var tenth: f64 = 0.1;
    _ = &tenth;
    try expectFmt("0.30000000000000004", tenth + 0.2);
    try expectFmt("1e+21", 1e21);
    try expectFmt("100000000000000000000", 1e20);
    try expectFmt("1e-7", 1e-7);
    try expectFmt("0.000001", 1e-6);
    try expectFmt("123.456", 123.456);
    try expectFmt("5e-324", 5e-324);
    try expectFmt("1.7976931348623157e+308", std.math.floatMax(f64));
    try expectFmt("NaN", std.math.nan(f64));
    try expectFmt("-Infinity", -std.math.inf(f64));
    try expectFmt("1.5e+300", 1.5e300);
}

test "string to number" {
    try std.testing.expectEqual(@as(f64, 0), parse("  "));
    try std.testing.expectEqual(@as(f64, 255), parse("0xff"));
    try std.testing.expect(std.math.isNan(parse("12px")));
    try std.testing.expectEqual(@as(f64, 12), parseFloatPrefix("12px"));
    try std.testing.expectEqual(@as(f64, -42), parseIntJs("  -42.9abc", std.math.nan(f64)));
    try std.testing.expectEqual(@as(i32, -1), toInt32(4294967295));
}

test "parseInt radix as V8: ToInt32, 0 is 10, outside 2..36 is NaN" {
    try std.testing.expect(std.math.isNan(parseIntJs("10", 37)));
    try std.testing.expect(std.math.isNan(parseIntJs("10", 1)));
    try std.testing.expect(std.math.isNan(parseIntJs("10", -1)));
    try std.testing.expectEqual(@as(f64, 3), parseIntJs("10", 3.9));
    try std.testing.expectEqual(@as(f64, 10), parseIntJs("10", 0));
    try std.testing.expectEqual(@as(f64, 31), parseIntJs("0x1f", 0));
    try std.testing.expectEqual(@as(f64, 31), parseIntJs("0x1f", 16));
    try std.testing.expectEqual(@as(f64, 0), parseIntJs("0x1f", 10));
    // 4294967306 is 10 after ToInt32.
    try std.testing.expectEqual(@as(f64, 10), parseIntJs("10", 4294967306));
}
