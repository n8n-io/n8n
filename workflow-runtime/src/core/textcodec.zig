//! Text codecs of the library (spec section 4.3): `btoa`, `atob`,
//! `encodeURIComponent`, `decodeURIComponent`, `escape` and `unescape`, with
//! the results of JavaScript. Strings are WTF-8: UTF-8 that can hold a lone
//! surrogate as three bytes, as the runtime stores JavaScript strings.
//! UTF-8 text to base64 is `btoa(unescape(encodeURIComponent(s)))`, and the
//! way back is `decodeURIComponent(escape(atob(b)))`: each step is native and
//! linear, so library code needs no loop over characters.
const std = @import("std");
const Builder = @import("arena.zig").Builder;

pub const Error = error{
    /// URIError "URI malformed".
    Malformed,
    /// btoa: a character above U+00FF. atob: not base64.
    InvalidCharacter,
    /// atob: base64 characters whose count leaves one character over.
    NotEncoded,
    ArenaFull,
};

const hex_upper = "0123456789ABCDEF";
const b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// One code point of WTF-8 at `i`: its value and byte length. Bytes that are
/// not WTF-8 (the runtime never makes them) count as U+FFFD.
fn next(s: []const u8, i: usize) struct { cp: u21, n: usize } {
    const n = std.unicode.utf8ByteSequenceLength(s[i]) catch return .{ .cp = 0xFFFD, .n = 1 };
    if (i + n > s.len) return .{ .cp = 0xFFFD, .n = 1 };
    if (n == 1) return .{ .cp = s[i], .n = 1 };
    if (n == 3 and s[i] == 0xED and s[i + 1] >= 0xA0) {
        // A lone surrogate in WTF-8.
        const cp: u21 = (@as(u21, s[i] & 0x0F) << 12) | (@as(u21, s[i + 1] & 0x3F) << 6) | (s[i + 2] & 0x3F);
        return .{ .cp = cp, .n = 3 };
    }
    const cp = std.unicode.utf8Decode(s[i..][0..n]) catch return .{ .cp = 0xFFFD, .n = 1 };
    return .{ .cp = cp, .n = n };
}

fn isSurrogate(cp: u21) bool {
    return cp >= 0xD800 and cp <= 0xDFFF;
}

/// The WTF-8 bytes of one code point (a lone surrogate as three bytes).
fn putCodePoint(b: *Builder, cp: u21) Error!void {
    var buf: [4]u8 = undefined;
    const n: usize = if (cp < 0x80) 1 else if (cp < 0x800) 2 else if (cp < 0x10000) 3 else 4;
    switch (n) {
        1 => buf[0] = @intCast(cp),
        2 => {
            buf[0] = @intCast(0xC0 | (cp >> 6));
            buf[1] = @intCast(0x80 | (cp & 0x3F));
        },
        3 => {
            buf[0] = @intCast(0xE0 | (cp >> 12));
            buf[1] = @intCast(0x80 | ((cp >> 6) & 0x3F));
            buf[2] = @intCast(0x80 | (cp & 0x3F));
        },
        else => {
            buf[0] = @intCast(0xF0 | (cp >> 18));
            buf[1] = @intCast(0x80 | ((cp >> 12) & 0x3F));
            buf[2] = @intCast(0x80 | ((cp >> 6) & 0x3F));
            buf[3] = @intCast(0x80 | (cp & 0x3F));
        },
    }
    try b.append(buf[0..n]);
}

fn percent(b: *Builder, byte: u8) Error!void {
    try b.append(&.{ '%', hex_upper[byte >> 4], hex_upper[byte & 0xF] });
}

fn hexValue(c: u8) ?u8 {
    return switch (c) {
        '0'...'9' => c - '0',
        'a'...'f' => c - 'a' + 10,
        'A'...'F' => c - 'A' + 10,
        else => null,
    };
}

/// `%XX` at `i`, or null.
fn hexByte(s: []const u8, i: usize) ?u8 {
    if (i + 3 > s.len or s[i] != '%') return null;
    const hi = hexValue(s[i + 1]) orelse return null;
    const lo = hexValue(s[i + 2]) orelse return null;
    return hi * 16 + lo;
}

pub fn encodeUriComponent(b: *Builder, s: []const u8) Error!void {
    return encodeKeeping(b, s, "-_.!~*'()");
}

/// JavaScript encodeURI: the reserved URI characters stay too.
pub fn encodeUri(b: *Builder, s: []const u8) Error!void {
    return encodeKeeping(b, s, "-_.!~*'();/?:@&=+$,#");
}

fn encodeKeeping(b: *Builder, s: []const u8, keep: []const u8) Error!void {
    var i: usize = 0;
    while (i < s.len) {
        const c = next(s, i);
        if (isSurrogate(c.cp)) return error.Malformed;
        if (c.n == 1 and (std.ascii.isAlphanumeric(s[i]) or std.mem.indexOfScalar(u8, keep, s[i]) != null)) {
            try b.append(s[i .. i + 1]);
        } else {
            for (s[i .. i + c.n]) |byte| try percent(b, byte);
        }
        i += c.n;
    }
}

pub fn decodeUriComponent(b: *Builder, s: []const u8) Error!void {
    var i: usize = 0;
    while (i < s.len) {
        if (s[i] != '%') {
            try b.append(s[i .. i + 1]);
            i += 1;
            continue;
        }
        const first = hexByte(s, i) orelse return error.Malformed;
        if (first < 0x80) {
            try b.append(&.{first});
            i += 3;
            continue;
        }
        const n: usize = std.unicode.utf8ByteSequenceLength(first) catch return error.Malformed;
        if (n == 1) return error.Malformed;
        var bytes: [4]u8 = undefined;
        bytes[0] = first;
        for (1..n) |k| {
            const byte = hexByte(s, i + 3 * k) orelse return error.Malformed;
            if (byte & 0xC0 != 0x80) return error.Malformed;
            bytes[k] = byte;
        }
        // Overlong forms and surrogates are malformed, as in JavaScript.
        const cp = std.unicode.utf8Decode(bytes[0..n]) catch return error.Malformed;
        if (isSurrogate(cp)) return error.Malformed;
        try b.append(bytes[0..n]);
        i += 3 * n;
    }
}

pub fn escape(b: *Builder, s: []const u8) Error!void {
    const keep = "@*_+-./";
    var i: usize = 0;
    while (i < s.len) {
        const c = next(s, i);
        i += c.n;
        if (c.cp < 0x80 and (std.ascii.isAlphanumeric(@intCast(c.cp)) or std.mem.indexOfScalar(u8, keep, @intCast(c.cp)) != null)) {
            try b.append(&.{@intCast(c.cp)});
        } else if (c.cp < 0x100) {
            try percent(b, @intCast(c.cp));
        } else if (c.cp < 0x10000) {
            try unitEscape(b, @intCast(c.cp));
        } else {
            const v = c.cp - 0x10000;
            try unitEscape(b, @intCast(0xD800 + (v >> 10)));
            try unitEscape(b, @intCast(0xDC00 + (v & 0x3FF)));
        }
    }
}

fn unitEscape(b: *Builder, u: u16) Error!void {
    try b.append(&.{ '%', 'u', hex_upper[u >> 12], hex_upper[(u >> 8) & 0xF], hex_upper[(u >> 4) & 0xF], hex_upper[u & 0xF] });
}

/// UTF-16 units to WTF-8: a high surrogate waits for a low one.
const UnitWriter = struct {
    b: *Builder,
    high: ?u16 = null,

    fn unit(w: *UnitWriter, u: u16) Error!void {
        if (w.high) |h| {
            w.high = null;
            if (u >= 0xDC00 and u <= 0xDFFF) {
                return putCodePoint(w.b, 0x10000 + ((@as(u21, h) - 0xD800) << 10) + (u - 0xDC00));
            }
            try putCodePoint(w.b, h);
        }
        if (u >= 0xD800 and u <= 0xDBFF) {
            w.high = u;
            return;
        }
        try putCodePoint(w.b, u);
    }

    fn codePoint(w: *UnitWriter, cp: u21) Error!void {
        if (cp >= 0x10000) {
            try w.flush();
            return putCodePoint(w.b, cp);
        }
        return w.unit(@intCast(cp));
    }

    fn flush(w: *UnitWriter) Error!void {
        if (w.high) |h| try putCodePoint(w.b, h);
        w.high = null;
    }
};

pub fn unescape(b: *Builder, s: []const u8) Error!void {
    var w: UnitWriter = .{ .b = b };
    var i: usize = 0;
    while (i < s.len) {
        if (s[i] == '%' and i + 6 <= s.len and s[i + 1] == 'u') {
            var u: u16 = 0;
            var ok = true;
            for (s[i + 2 .. i + 6]) |c| {
                const h = hexValue(c) orelse {
                    ok = false;
                    break;
                };
                u = u * 16 + h;
            }
            if (ok) {
                try w.unit(u);
                i += 6;
                continue;
            }
        }
        if (hexByte(s, i)) |byte| {
            try w.unit(byte);
            i += 3;
            continue;
        }
        const c = next(s, i);
        try w.codePoint(c.cp);
        i += c.n;
    }
    try w.flush();
}

/// `Base64.encodeUtf8`: btoa(unescape(encodeURIComponent(s))) in one pass.
/// That composite is the base64 of the bytes of `s`, and throws "URI
/// malformed" for a lone surrogate, as `encodeUriComponent` does.
pub fn base64Utf8(b: *Builder, s: []const u8) Error!void {
    var i: usize = 0;
    while (i < s.len) {
        if (s[i] < 0x80) {
            i += 1;
            continue;
        }
        const c = next(s, i);
        if (isSurrogate(c.cp)) return error.Malformed;
        i += c.n;
    }
    var j: usize = 0;
    while (j + 3 <= s.len) : (j += 3) try put64(b, s[j..][0..3]);
    if (j < s.len) try put64(b, s[j..]);
}

pub fn btoa(b: *Builder, s: []const u8) Error!void {
    var group: [3]u8 = undefined;
    var n: usize = 0;
    var i: usize = 0;
    while (i < s.len) {
        const c = next(s, i);
        if (c.cp > 0xFF) return error.InvalidCharacter;
        group[n] = @intCast(c.cp);
        n += 1;
        i += c.n;
        if (n == 3) {
            try put64(b, group[0..3]);
            n = 0;
        }
    }
    if (n > 0) try put64(b, group[0..n]);
}

fn put64(b: *Builder, g: []const u8) Error!void {
    const x0 = g[0];
    const x1 = if (g.len > 1) g[1] else 0;
    const x2 = if (g.len > 2) g[2] else 0;
    try b.append(&.{
        b64[x0 >> 2],
        b64[((x0 & 3) << 4) | (x1 >> 4)],
        if (g.len > 1) b64[((x1 & 0xF) << 2) | (x2 >> 6)] else '=',
        if (g.len > 2) b64[x2 & 0x3F] else '=',
    });
}

fn b64Value(c: u8) ?u6 {
    return switch (c) {
        'A'...'Z' => @intCast(c - 'A'),
        'a'...'z' => @intCast(c - 'a' + 26),
        '0'...'9' => @intCast(c - '0' + 52),
        '+' => 62,
        '/' => 63,
        else => null,
    };
}

/// The forgiving-base64 decode of the HTML standard: ASCII whitespace is
/// ignored, padding is optional. Each byte becomes the code point of that
/// value (a "binary string").
pub fn atob(b: *Builder, s: []const u8) Error!void {
    // Count the data characters and the padding at the end.
    var data: usize = 0;
    var pad: usize = 0;
    for (s) |c| {
        if (c == ' ' or c == '\t' or c == '\n' or c == '\r' or c == 0x0C) continue;
        if (c == '=') {
            pad += 1;
            continue;
        }
        if (pad > 0) return error.InvalidCharacter;
        if (b64Value(c) == null) return error.InvalidCharacter;
        data += 1;
    }
    if (pad > 2 or (pad > 0 and (data + pad) % 4 != 0)) return error.InvalidCharacter;
    if (data % 4 == 1) return error.NotEncoded;
    var acc: u32 = 0;
    var bits: u5 = 0;
    for (s) |c| {
        const v = b64Value(c) orelse continue;
        acc = (acc << 6) | v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            try putCodePoint(b, @intCast((acc >> bits) & 0xFF));
        }
    }
}

const Arena = @import("arena.zig").Arena;

fn run(f: fn (*Builder, []const u8) Error!void, in: []const u8, buf: []u8) Error![]const u8 {
    var arena = Arena.init(buf);
    var b = arena.builder();
    try f(&b, in);
    return b.bytes();
}

test "codecs give the results of JavaScript" {
    var buf: [256]u8 = undefined;
    const t = std.testing;
    try t.expectEqualStrings("Z3LDvMOfZQ==", try run(btoa, try run(unescape, try run(encodeUriComponent, "grüße", &buf), buf[64..]), buf[128..]));
    try t.expectEqualStrings("SGVsbG8=", try run(btoa, "Hello", &buf));
    try t.expectEqualStrings("Hello", try run(atob, " SGVs\nbG8 ", &buf));
    try t.expectEqualStrings("Hel", try run(atob, "SGVs", &buf));
    try t.expectEqualStrings("He", try run(atob, "SGU", &buf));
    try t.expectError(error.NotEncoded, run(atob, "SGVsb", &buf));
    try t.expectError(error.InvalidCharacter, run(atob, "abc==", &buf));
    try t.expectError(error.InvalidCharacter, run(atob, "SG=Vs", &buf));
    try t.expectError(error.InvalidCharacter, run(btoa, "€", &buf));
    try t.expectEqualStrings("a%20b%26c%C3%BC%F0%9F%98%80-_.!~*'()", try run(encodeUriComponent, "a b&cü😀-_.!~*'()", &buf));
    try t.expectEqualStrings("a b&cü😀", try run(decodeUriComponent, "a%20b%26c%C3%BC%F0%9F%98%80", &buf));
    try t.expectError(error.Malformed, run(decodeUriComponent, "%E0%A4%A", &buf));
    try t.expectError(error.Malformed, run(decodeUriComponent, "%C0%AF", &buf));
    try t.expectError(error.Malformed, run(encodeUriComponent, "\xED\xA0\xBD", &buf));
    try t.expectEqualStrings("a%20%FC%u20AC%uD83D%uDE00@*_+-./", try run(escape, "a ü€😀@*_+-./", &buf));
    try t.expectEqualStrings("a üÿ€😀", try run(unescape, "a%20%FC%FF%u20AC%uD83D%uDE00", &buf));
    try t.expectEqualStrings("%u12", try run(unescape, "%u12", &buf));
}
