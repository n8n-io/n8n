//! The rule of `responseBinary` that decides after the head of the response
//! (spec 7.1): `storeTypes` and `inlineTypes` are lists of texts. The body
//! goes to the binary data store when the content type of the response has
//! one text of `storeTypes` and no text of `inlineTypes`. The test is the
//! `includes` of JavaScript: bytes, with the case of the letters.
//!
//! The caller gives the rule as data, so the runtime knows no node. A
//! request names the same rule each time, so the client keeps each rule
//! once (`Table`): a request holds the index of its rule, not the texts.
//! The table is reserved with the client, and it never frees a rule: a
//! request in flight can hold each index. A full table fails the request at
//! its start with a limit error.
const std = @import("std");
const http = @import("http.zig");
const creds = @import("creds.zig");

/// The most rules of one client. The rules come from the code of modules,
/// not from the data of a run.
pub const max_rules = 8;
/// The most bytes of the JSON of one `responseBinary` member with a rule.
const max_raw = 2048;
/// The most texts in the two lists of one rule.
pub const max_texts = 96;
/// The most bytes of one text.
const max_text = 255;

/// One rule. `packed_texts` holds each text as one length byte and its
/// bytes: the `n_inline` texts of `inlineTypes` first, then the `n_store`
/// texts of `storeTypes`.
pub const Rule = struct {
    hash: u64 = 0,
    raw_len: u16 = 0,
    packed_len: u16 = 0,
    n_inline: u8 = 0,
    n_store: u8 = 0,
    raw: [max_raw]u8 = @splat(0),
    packed_texts: [max_raw]u8 = @splat(0),

    /// True when a response with this content type goes to the store.
    pub fn stores(r: *const Rule, content_type: []const u8) bool {
        std.debug.assert(r.packed_len <= r.packed_texts.len);
        var at: usize = 0;
        for (0..@as(usize, r.n_inline) + r.n_store) |i| {
            const len = r.packed_texts[at];
            const text = r.packed_texts[at + 1 ..][0..len];
            at += 1 + @as(usize, len);
            if (std.mem.indexOf(u8, content_type, text) == null) continue;
            return i >= r.n_inline;
        }
        std.debug.assert(at == r.packed_len);
        return false;
    }

    /// Add the texts of the JSON array `list`. The count of the texts.
    fn addList(r: *Rule, list: []const u8) Table.Error!u8 {
        std.debug.assert(r.packed_len <= r.packed_texts.len);
        var elements = http.Elements.init(list) orelse return error.Invalid;
        var n: u8 = 0;
        for (0..max_texts + 1) |_| {
            const raw = elements.next() orelse return n;
            if (n == max_texts) return error.Invalid;
            const room = r.packed_texts[r.packed_len..];
            if (room.len < 1) return error.Invalid;
            var out: creds.Out = .{ .buf = room[1..@min(room.len, 1 + max_text)] };
            http.unescape(raw, &out) catch |e| switch (e) {
                error.NoSpace, error.BadString => return error.Invalid,
            };
            room[0] = @intCast(out.len);
            r.packed_len += @intCast(1 + out.len);
            n += 1;
        }
        return error.Invalid;
    }
};

/// The rules of one egress client. Owner: `egress.Client`. Lifetime: the
/// client. Capacity: `max_rules`.
pub const Table = struct {
    rules: [max_rules]Rule = @splat(.{}),
    n: u8 = 0,

    pub const Error = error{ Full, Invalid };

    /// True when the JSON of a `responseBinary` member has a rule.
    pub fn has(opts: []const u8) bool {
        std.debug.assert(opts.len == 0 or opts[0] == '{');
        return http.member(opts, "storeTypes") != null;
    }

    /// The index of the rule of `opts`, the JSON of a `responseBinary`
    /// member with `storeTypes`. A new rule takes a row of the table.
    pub fn intern(t: *Table, opts: []const u8) Error!u8 {
        std.debug.assert(t.n <= max_rules);
        if (opts.len > max_raw) return error.Invalid;
        const hash = std.hash.Wyhash.hash(0, opts);
        for (t.rules[0..t.n], 0..) |*r, i| {
            if (r.hash == hash and std.mem.eql(u8, r.raw[0..r.raw_len], opts)) return @intCast(i);
        }
        if (t.n == max_rules) return error.Full;
        const r = &t.rules[t.n];
        r.* = .{ .hash = hash, .raw_len = @intCast(opts.len) };
        @memcpy(r.raw[0..opts.len], opts);
        if (http.member(opts, "inlineTypes")) |list| r.n_inline = try r.addList(list);
        r.n_store = try r.addList(http.member(opts, "storeTypes") orelse return error.Invalid);
        t.n += 1;
        return t.n - 1;
    }
};

/// A rule for the tests.
pub const example =
    \\{"inlineTypes":["application/json"],"storeTypes":["image/","audio/","application/pdf","application/zip"]}
;

test "a rule stores a content type with a text of storeTypes and no text of inlineTypes" {
    const t = std.testing;
    var table: Table = .{};
    const i = try table.intern(example);
    const r = &table.rules[i];
    try t.expectEqual(@as(u8, 1), r.n_inline);
    try t.expectEqual(@as(u8, 4), r.n_store);
    try t.expect(r.stores("image/png"));
    try t.expect(r.stores("application/pdf; charset=binary"));
    try t.expect(!r.stores("application/json; charset=utf-8"));
    try t.expect(!r.stores("text/csv"));
    try t.expect(!r.stores(""));
    // `includes` of JavaScript: the case of the letters counts.
    try t.expect(!r.stores("Image/PNG"));
    // A text of `inlineTypes` wins, where it is in the content type.
    try t.expect(!r.stores("image/png; note=application/json"));
}

test "the table keeps a rule once, and a full table is a limit" {
    const t = std.testing;
    var table: Table = .{};
    try t.expectEqual(@as(u8, 0), try table.intern(example));
    try t.expectEqual(@as(u8, 0), try table.intern(example));
    try t.expectEqual(@as(u8, 1), table.n);
    var buf: [64]u8 = @splat(0);
    for (1..max_rules) |k| {
        const opts = try std.fmt.bufPrint(&buf, "{{\"storeTypes\":[\"type/{d}\"]}}", .{k});
        try t.expectEqual(@as(u8, @intCast(k)), try table.intern(opts));
    }
    try t.expectError(error.Full, table.intern("{\"storeTypes\":[\"more/\"]}"));
    // A rule of the table is still found.
    try t.expectEqual(@as(u8, 0), try table.intern(example));
    try t.expect(table.rules[3].stores("a type/3 b"));
}

test "a rule that is not lists of texts takes no row" {
    const t = std.testing;
    var table: Table = .{};
    try t.expect(Table.has("{\"storeTypes\":[]}"));
    try t.expect(!Table.has("{\"fileName\":\"a\"}"));
    try t.expectError(error.Invalid, table.intern("{\"storeTypes\":\"image/\"}"));
    try t.expectError(error.Invalid, table.intern("{\"storeTypes\":[1]}"));
    try t.expectError(error.Invalid, table.intern("{\"storeTypes\":[\"a\"],\"inlineTypes\":{}}"));
    try t.expectEqual(@as(u8, 0), table.n);
    // An empty list stores nothing. An escape is decoded.
    const i = try table.intern("{\"storeTypes\":[],\"inlineTypes\":[\"a\"]}");
    try t.expect(!table.rules[i].stores("a"));
    const j = try table.intern("{\"storeTypes\":[\"image\\/\"]}");
    try t.expect(table.rules[j].stores("image/gif"));
}
