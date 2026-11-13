//! String.prototype.normalize: the Unicode normalization forms NFC, NFD, NFKC
//! and NFKD, as V8 gives them.
//!
//! `normalize_tables.zig` holds the full decompositions, the combining class
//! ranks and the composition pairs, generated from Node.js by
//! `gen_normalize.mjs`. Hangul syllables decompose and compose by the
//! algorithm of the Unicode standard. Bytes that are not UTF-8 (lone
//! surrogates) pass through as they are and act as starters, as in V8.
//!
//! The code points go into one array in the arena, sized by a first pass,
//! then the canonical order and the composition change that array in place.
//! All loops are bounded by the length of the text; nothing recurses.
const std = @import("std");
const tables = @import("normalize_tables.zig");
const Arena = @import("arena.zig").Arena;
const assert = std.debug.assert;

pub const Form = enum { nfc, nfd, nfkc, nfkd };

/// A raw byte that is not part of a UTF-8 sequence, kept as a value above Unicode.
const raw_base: u32 = 0x110000;

const s_base: u32 = 0xAC00;
const l_base: u32 = 0x1100;
const v_base: u32 = 0x1161;
const t_base: u32 = 0x11A7;
const l_count: u32 = 19;
const v_count: u32 = 21;
const t_count: u32 = 28;
const n_count: u32 = v_count * t_count;
const s_count: u32 = l_count * n_count;

/// The form of a `normalize` argument, or null for a form that V8 rejects.
pub fn formOf(name: []const u8) ?Form {
    if (std.mem.eql(u8, name, "NFC")) return .nfc;
    if (std.mem.eql(u8, name, "NFD")) return .nfd;
    if (std.mem.eql(u8, name, "NFKC")) return .nfkc;
    if (std.mem.eql(u8, name, "NFKD")) return .nfkd;
    return null;
}

fn find(comptime T: type, list: []const T, cp: u32) ?*const T {
    var lo: usize = 0;
    var hi: usize = list.len;
    // Binary search: at most 32 halvings.
    while (lo < hi) {
        const mid = lo + (hi - lo) / 2;
        if (list[mid].cp == cp) return &list[mid];
        if (list[mid].cp < cp) lo = mid + 1 else hi = mid;
    }
    return null;
}

fn class(cp: u32) u8 {
    if (cp >= raw_base) return 0;
    return if (find(tables.Class, &tables.classes, cp)) |c| c.class else 0;
}

/// The full decomposition of `cp`, or null when it decomposes to itself.
fn decomposition(cp: u32, compat: bool) ?[]const u21 {
    if (cp >= raw_base) return null;
    if (compat) {
        if (find(tables.Decomp, &tables.compat, cp)) |d| return tables.pool[d.start..][0..d.len];
    }
    if (find(tables.Decomp, &tables.canonical, cp)) |d| return tables.pool[d.start..][0..d.len];
    return null;
}

fn compose(a: u32, b: u32) ?u32 {
    // Hangul: L + V, then LV + T.
    if (a >= l_base and a < l_base + l_count and b >= v_base and b < v_base + v_count) {
        return s_base + ((a - l_base) * v_count + (b - v_base)) * t_count;
    }
    if (a >= s_base and a < s_base + s_count and (a - s_base) % t_count == 0 and b > t_base and b < t_base + t_count) {
        return a + (b - t_base);
    }
    var lo: usize = 0;
    var hi: usize = tables.pairs.len;
    while (lo < hi) {
        const mid = lo + (hi - lo) / 2;
        const p = tables.pairs[mid];
        if (p.a == a and p.b == b) return p.c;
        if (p.a < a or (p.a == a and p.b < b)) lo = mid + 1 else hi = mid;
    }
    return null;
}

const Decoded = struct { cp: u32, len: usize };

fn decodeAt(bytes: []const u8, i: usize) Decoded {
    const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch return .{ .cp = raw_base + bytes[i], .len = 1 };
    if (i + n > bytes.len) return .{ .cp = raw_base + bytes[i], .len = 1 };
    const cp = std.unicode.utf8Decode(bytes[i..][0..n]) catch return .{ .cp = raw_base + bytes[i], .len = 1 };
    return .{ .cp = cp, .len = n };
}

/// Writes the full decomposition of `cp` at `out[n]` and moves `n` past it.
fn decompose(cp: u32, compat: bool, out: []u32, n: *usize) void {
    if (cp >= s_base and cp < s_base + s_count) {
        const s = cp - s_base;
        out[n.*] = l_base + s / n_count;
        out[n.* + 1] = v_base + (s % n_count) / t_count;
        n.* += 2;
        if (s % t_count != 0) {
            out[n.*] = t_base + s % t_count;
            n.* += 1;
        }
        return;
    }
    if (decomposition(cp, compat)) |d| {
        for (d, 0..) |x, k| out[n.* + k] = x;
        n.* += d.len;
        return;
    }
    out[n.*] = cp;
    n.* += 1;
}

fn decomposedLen(cp: u32, compat: bool) usize {
    if (cp >= s_base and cp < s_base + s_count) return if ((cp - s_base) % t_count == 0) 2 else 3;
    return if (decomposition(cp, compat)) |d| d.len else 1;
}

/// The normal form of `bytes`, in the arena.
pub fn normalize(arena: *Arena, bytes: []const u8, form: Form) Arena.Error![]const u8 {
    const compat = form == .nfkc or form == .nfkd;
    // Pass 1: the number of code points after decomposition.
    var total: usize = 0;
    var i: usize = 0;
    while (i < bytes.len) {
        const d = decodeAt(bytes, i);
        total += decomposedLen(d.cp, compat);
        i += d.len;
    }
    const cps = try arena.push(u32, total);
    // Pass 2: decompose.
    var n: usize = 0;
    i = 0;
    while (i < bytes.len) {
        const d = decodeAt(bytes, i);
        decompose(d.cp, compat, cps, &n);
        i += d.len;
    }
    assert(n == total);
    // Canonical order: a stable insertion sort of each run of non-starters by class.
    var k: usize = 1;
    while (k < n) : (k += 1) {
        const c = class(cps[k]);
        if (c == 0) continue;
        var j = k;
        while (j > 0) {
            const p = class(cps[j - 1]);
            if (p == 0 or p <= c) break;
            std.mem.swap(u32, &cps[j - 1], &cps[j]);
            j -= 1;
        }
    }
    // Composition: each code point composes with the last starter unless blocked.
    if (form == .nfc or form == .nfkc) {
        var out: usize = 0;
        var starter: ?usize = null;
        var last_class: u8 = 0;
        for (cps[0..n]) |cp| {
            const c = class(cp);
            if (starter) |s| {
                const blocked = out > s + 1 and (last_class == 0 or last_class >= c);
                if (!blocked) {
                    if (compose(cps[s], cp)) |composite| {
                        cps[s] = composite;
                        continue;
                    }
                }
            }
            if (c == 0) starter = out;
            last_class = c;
            cps[out] = cp;
            out += 1;
        }
        n = out;
    }
    // UTF-8 out.
    var size: usize = 0;
    for (cps[0..n]) |cp| size += if (cp >= raw_base) 1 else std.unicode.utf8CodepointSequenceLength(@intCast(cp)) catch unreachable;
    const text = try arena.push(u8, size);
    var at: usize = 0;
    for (cps[0..n]) |cp| {
        if (cp >= raw_base) {
            text[at] = @intCast(cp - raw_base);
            at += 1;
        } else at += std.unicode.utf8Encode(@intCast(cp), text[at..]) catch unreachable;
    }
    assert(at == size);
    return text;
}

const testing = std.testing;

fn parseHex(list: *std.ArrayList(u8), gpa: std.mem.Allocator, field: []const u8) !void {
    var it = std.mem.tokenizeScalar(u8, field, ' ');
    while (it.next()) |h| {
        const cp = try std.fmt.parseInt(u21, h, 16);
        var enc: [4]u8 = undefined;
        const len = try std.unicode.utf8Encode(cp, &enc);
        try list.appendSlice(gpa, enc[0..len]);
    }
}

test "normalizes as Node.js does" {
    const gpa = testing.allocator;
    const text = @embedFile("testdata/normalize_cases.txt");
    const buf = try gpa.alloc(u8, 1 << 20);
    defer gpa.free(buf);
    var arena = Arena.init(buf);
    var lines = std.mem.tokenizeScalar(u8, text, '\n');
    var count: usize = 0;
    var fields: [5]std.ArrayList(u8) = .{ .empty, .empty, .empty, .empty, .empty };
    defer for (&fields) |*f| f.deinit(gpa);
    while (lines.next()) |line| {
        var cols = std.mem.splitScalar(u8, line, '\t');
        for (&fields) |*f| {
            f.clearRetainingCapacity();
            try parseHex(f, gpa, cols.next() orelse return error.BadCase);
        }
        for ([_]Form{ .nfc, .nfd, .nfkc, .nfkd }, 1..) |form, col| {
            const t = arena.begin();
            defer t.end();
            const got = try normalize(&arena, fields[0].items, form);
            try testing.expectEqualSlices(u8, fields[col].items, got);
        }
        count += 1;
    }
    try testing.expect(count > 1000);
}

test "lone surrogates and bad bytes pass through" {
    var buf: [256]u8 = undefined;
    var arena = Arena.init(&buf);
    const text = "e\xed\xa0\xbd\xcc\x81\xff";
    // The lone surrogate is a starter: the accent after it does not reach the e.
    try testing.expectEqualSlices(u8, text, try normalize(&arena, text, .nfc));
    try testing.expectEqualSlices(u8, "\xc3\xa9", try normalize(&arena, "e\xcc\x81", .nfc));
}
