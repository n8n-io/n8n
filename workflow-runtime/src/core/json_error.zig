//! The message of V8's `JSON.parse` error for text that does not parse.
//!
//! `JSON.parse` in the runtime decodes with the fast codec (`json.zig`). When
//! the codec reports a syntax error, this module scans the text again and
//! writes the message that V8 gives, so code that reads the message of a
//! caught error sees the same text as in n8n. The scan follows V8's
//! `JsonParser`: the first error, its position and its line and column, all
//! counted in UTF-16 code units, and the context of 10 code units around the
//! unexpected token. `testdata/json_error_cases.json` holds messages that
//! Node.js gave for generated texts (`gen_json_error_cases.mjs`).
//!
//! The scan keeps the open containers on a fixed stack, never recursion. It
//! allocates nothing: the message goes into a buffer of the caller.
const std = @import("std");
const assert = std.debug.assert;

/// The deepest nesting that the scan follows; the codec stops before it.
pub const max_depth = 1024;

/// A buffer of this size holds every message.
pub const max_message = 256;

const Fail = error{Fail};

/// Appends to a fixed buffer; the buffer holds every message (`max_message`).
const Out = struct {
    buf: []u8,
    len: usize = 0,

    fn writeAll(o: *Out, bytes: []const u8) void {
        assert(o.len + bytes.len <= o.buf.len);
        @memcpy(o.buf[o.len..][0..bytes.len], bytes);
        o.len += bytes.len;
    }

    fn written(o: *const Out) []const u8 {
        return o.buf[0..o.len];
    }
};

const Scan = struct {
    src: []const u8,
    i: usize = 0,
    out: []u8,
    msg: []const u8 = "",

    /// The byte length of the character at `k`: a WTF-8 sequence, or 1 for a
    /// byte that starts none (runtime strings never hold such bytes).
    fn charLen(s: *const Scan, k: usize) usize {
        const lead = s.src[k];
        const n: usize = if (lead < 0x80) 1 else if (lead >= 0xC2 and lead < 0xE0) 2 else if (lead >= 0xE0 and lead < 0xF0) 3 else if (lead >= 0xF0 and lead < 0xF5) 4 else 1;
        if (k + n > s.src.len) return 1;
        for (s.src[k + 1 .. k + n]) |c| if (c & 0xC0 != 0x80) return 1;
        return n;
    }

    /// The UTF-16 length of `src[0..end]`.
    fn units(s: *const Scan, end: usize) usize {
        var u: usize = 0;
        var k: usize = 0;
        while (k < end) {
            const n = s.charLen(k);
            u += if (n == 4) 2 else 1;
            k += n;
        }
        return u;
    }

    fn at(s: *Scan, comptime prefix: []const u8, k: usize) Fail {
        var line: usize = 1;
        var last: usize = 0;
        var c: usize = 0;
        while (c < k) : (c += 1) {
            if (s.src[c] == '\r' and c + 1 < k and s.src[c + 1] == '\n') c += 1;
            if (s.src[c] == '\r' or s.src[c] == '\n') {
                line += 1;
                last = c + 1;
            }
        }
        const pos = s.units(k);
        const column = 1 + pos - s.units(last);
        // "... after JSON" names JSON already.
        const infix = if (std.mem.endsWith(u8, prefix, "JSON")) "" else " in JSON";
        s.msg = std.fmt.bufPrint(s.out, "{s}{s} at position {d} (line {d} column {d})", .{ prefix, infix, pos, line, column }) catch unreachable;
        return error.Fail;
    }

    /// Writes UTF-16 code units `a..b` of the text as WTF-8: a cut inside a
    /// pair gives a lone surrogate, as a V8 substring does.
    fn writeUnits(s: *const Scan, w: *Out, a: usize, b: usize) void {
        var u: usize = 0;
        var k: usize = 0;
        while (k < s.src.len and u < b) {
            const len = s.charLen(k);
            const end = k + len;
            if (len == 4) {
                const q = s.src[k..end];
                const cp: u21 = (@as(u21, q[0] & 0x07) << 18) | (@as(u21, q[1] & 0x3F) << 12) | (@as(u21, q[2] & 0x3F) << 6) | (q[3] & 0x3F);
                const v: u21 = if (cp >= 0x10000) cp - 0x10000 else 0;
                if (u >= a and u + 1 < b) {
                    w.writeAll(s.src[k..end]);
                } else {
                    if (u >= a and u < b) writeSurrogate(w, @intCast(0xD800 + (v >> 10)));
                    if (u + 1 >= a and u + 1 < b) writeSurrogate(w, @intCast(0xDC00 + (v & 0x3FF)));
                }
                u += 2;
            } else {
                if (u >= a) w.writeAll(s.src[k..end]);
                u += 1;
            }
            k = end;
        }
    }

    fn writeSurrogate(w: *Out, unit: u16) void {
        const bytes = [3]u8{ @intCast(0xE0 | (unit >> 12)), @intCast(0x80 | ((unit >> 6) & 0x3F)), @intCast(0x80 | (unit & 0x3F)) };
        w.writeAll(&bytes);
    }

    /// V8's message for an unexpected token at byte `k`, or the given message.
    fn unexpected(s: *Scan, k: usize) Fail {
        if (k >= s.src.len) {
            s.msg = "Unexpected end of JSON input";
            return error.Fail;
        }
        const ch = s.src[k];
        if (ch == '"') return s.at("Unexpected string", k);
        if (ch == '-' or (ch >= '0' and ch <= '9')) return s.at("Unexpected number", k);
        var fixed = Out{ .buf = s.out };
        const w = &fixed;
        for ([_][]const u8{ "[object Object]", "undefined", "Infinity", "NaN" }) |special| {
            if (std.mem.eql(u8, s.src, special)) {
                w.writeAll("\"");
                w.writeAll(special);
                w.writeAll("\" is not valid JSON");
                s.msg = w.written();
                return error.Fail;
            }
        }
        const n = s.units(s.src.len);
        const pos = s.units(k);
        w.writeAll("Unexpected token '");
        s.writeUnits(w, pos, pos + 1);
        w.writeAll("', ");
        if (n <= 20) {
            w.writeAll("\"");
            s.writeUnits(w, 0, n);
            w.writeAll("\" is not valid JSON");
        } else if (pos < 10) {
            w.writeAll("\"");
            s.writeUnits(w, 0, pos + 10);
            w.writeAll("\"... is not valid JSON");
        } else if (pos < n - 10) {
            w.writeAll("...\"");
            s.writeUnits(w, pos - 10, pos + 10);
            w.writeAll("\"... is not valid JSON");
        } else {
            w.writeAll("...\"");
            s.writeUnits(w, pos - 10, n);
            w.writeAll("\" is not valid JSON");
        }
        s.msg = w.written();
        return error.Fail;
    }

    fn peek(s: *const Scan) u8 {
        return if (s.i < s.src.len) s.src[s.i] else 0;
    }

    fn ws(s: *Scan) void {
        while (s.i < s.src.len) : (s.i += 1) {
            const c = s.src[s.i];
            if (c != ' ' and c != '\t' and c != '\n' and c != '\r') break;
        }
    }

    fn digit(s: *const Scan, k: usize) bool {
        return k < s.src.len and s.src[k] >= '0' and s.src[k] <= '9';
    }

    fn string(s: *Scan) Fail!void {
        assert(s.src[s.i] == '"');
        s.i += 1;
        while (true) {
            if (s.i >= s.src.len) return s.at("Unterminated string", s.src.len);
            const c = s.src[s.i];
            if (c == '"') {
                s.i += 1;
                return;
            }
            if (c < 0x20) return s.at("Bad control character in string literal", s.i);
            if (c == '\\') {
                s.i += 1;
                if (s.i >= s.src.len) return s.at("Bad escaped character", s.i);
                const e = s.src[s.i];
                if (e == 'u') {
                    var h: usize = 1;
                    while (h <= 4) : (h += 1) {
                        if (s.i + h >= s.src.len or !std.ascii.isHex(s.src[s.i + h])) {
                            return s.at("Bad Unicode escape", s.i + h);
                        }
                    }
                    s.i += 5;
                    continue;
                }
                if (std.mem.indexOfScalar(u8, "\"\\/bfnrt", e) == null) return s.at("Bad escaped character", s.i);
            }
            s.i += 1;
        }
    }

    fn number(s: *Scan) Fail!void {
        if (s.peek() == '-') {
            s.i += 1;
            if (!s.digit(s.i)) return s.at("No number after minus sign", s.i);
        }
        if (s.peek() == '0') {
            s.i += 1;
            if (s.digit(s.i)) return s.unexpected(s.i);
        } else while (s.digit(s.i)) s.i += 1;
        if (s.peek() == '.') {
            s.i += 1;
            if (!s.digit(s.i)) return s.at("Unterminated fractional number", s.i);
            while (s.digit(s.i)) s.i += 1;
        }
        if (s.peek() == 'e' or s.peek() == 'E') {
            s.i += 1;
            if (s.peek() == '+' or s.peek() == '-') s.i += 1;
            if (!s.digit(s.i)) return s.at("Exponent part is missing a number", s.i);
            while (s.digit(s.i)) s.i += 1;
        }
    }

    fn literal(s: *Scan, word: []const u8) Fail!void {
        for (word, 0..) |ch, k| {
            if (s.i + k >= s.src.len) return s.unexpected(s.src.len);
            if (s.src[s.i + k] != ch) return s.unexpected(s.i + k);
        }
        s.i += word.len;
    }

    /// A property name and its colon.
    fn key(s: *Scan, comptime missing: []const u8) Fail!void {
        s.ws();
        if (s.peek() != '"' or s.i >= s.src.len) return s.at(missing, s.i);
        try s.string();
        s.ws();
        if (s.peek() != ':' or s.i >= s.src.len) return s.at("Expected ':' after property name", s.i);
        s.i += 1;
    }

    /// Scans the whole text. True when it parses.
    fn run(s: *Scan) Fail!bool {
        // One bit for each open container: 1 for an object, 0 for an array.
        var open: [max_depth / 8]u8 = undefined;
        var depth: usize = 0;
        // Each turn reads one value; the scan advances every turn.
        var guard: usize = 0;
        while (guard <= s.src.len) : (guard += 1) {
            s.ws();
            const c = s.peek();
            var container = false;
            if (s.i >= s.src.len) return s.unexpected(s.i);
            switch (c) {
                '"' => try s.string(),
                '-', '0'...'9' => try s.number(),
                't' => try s.literal("true"),
                'f' => try s.literal("false"),
                'n' => try s.literal("null"),
                '{', '[' => {
                    s.i += 1;
                    s.ws();
                    const close: u8 = if (c == '{') '}' else ']';
                    if (s.peek() == close and s.i < s.src.len) {
                        s.i += 1;
                    } else {
                        if (depth == max_depth) return false;
                        if (c == '{') {
                            open[depth / 8] |= @as(u8, 1) << @intCast(depth % 8);
                            try s.key("Expected property name or '}'");
                        } else open[depth / 8] &= ~(@as(u8, 1) << @intCast(depth % 8));
                        depth += 1;
                        container = true;
                    }
                },
                else => return s.unexpected(s.i),
            }
            if (container) continue;
            // After a value: a comma goes on to the next value, a bracket closes.
            while (true) {
                if (depth == 0) {
                    s.ws();
                    if (s.i < s.src.len) return s.at("Unexpected non-whitespace character after JSON", s.i);
                    return true;
                }
                const is_obj = open[(depth - 1) / 8] & (@as(u8, 1) << @intCast((depth - 1) % 8)) != 0;
                s.ws();
                if (s.peek() == ',' and s.i < s.src.len) {
                    s.i += 1;
                    if (is_obj) try s.key("Expected double-quoted property name");
                    break;
                }
                if (is_obj) {
                    if (s.peek() != '}' or s.i >= s.src.len) return s.at("Expected ',' or '}' after property value", s.i);
                } else if (s.peek() != ']' or s.i >= s.src.len) return s.at("Expected ',' or ']' after array element", s.i);
                s.i += 1;
                depth -= 1;
            }
        }
        return false;
    }
};

/// V8's message for `src`, written into `out`, or null when the text parses
/// or nests deeper than `max_depth`.
pub fn message(src: []const u8, out: []u8) ?[]const u8 {
    assert(out.len >= max_message);
    var s = Scan{ .src = src, .out = out };
    _ = s.run() catch return s.msg;
    return null;
}

const testing = std.testing;

test "json error messages match Node.js" {
    const cases = @embedFile("testdata/json_error_cases.json");
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const Case = struct { text: []const u8, message: ?[]const u8 };
    const list = try std.json.parseFromSliceLeaky([]Case, arena.allocator(), cases, .{});
    var buf: [max_message]u8 = undefined;
    var bad: usize = 0;
    for (list) |c| {
        const got = message(c.text, &buf);
        const same = if (c.message) |m| (got != null and std.mem.eql(u8, got.?, m)) else got == null;
        if (!same) {
            bad += 1;
            if (bad <= 5) std.debug.print("text {s}: want {?s}, got {?s}\n", .{ c.text, c.message, got });
        }
    }
    try testing.expectEqual(@as(usize, 0), bad);
    try testing.expect(list.len > 1000);
}

test "bytes that start no UTF-8 sequence are one unit each" {
    var buf: [max_message]u8 = undefined;
    // The input of a fuzz crash: a 4-byte lead with too few bytes after it.
    try testing.expectEqualStrings("Unexpected token '\xfc', \"\xfc\xe2\x18\" is not valid JSON", message("\xfc\xe2\x18", &buf).?);
    _ = message("\xf0\x9f", &buf);
    _ = message("\"\xf4\x90\x80\x80\" x", &buf);
}

test "a context cut inside a surrogate pair gives a lone surrogate" {
    var buf: [max_message]u8 = undefined;
    // 9 ASCII characters, then U+1F600: the context ends inside the pair.
    const text = "x23456789\u{1F600}aaaaaaaaaaaaaaaaaaaa";
    const got = message(text, &buf).?;
    try testing.expectEqualStrings("Unexpected token 'x', \"x23456789\xed\xa0\xbd\"... is not valid JSON", got);
}
