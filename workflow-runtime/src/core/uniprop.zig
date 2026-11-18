//! Unicode properties of regular expressions: the name of `\p{…}` to a table, and the test
//! of a code point against a table. The tables come from the Node.js that the compiled
//! workflows copy (`uniprop_tables.zig`, made by gen_uniprop.mjs).
//!
//! Both searches are binary searches over a sorted table of a fixed size, so each has a
//! bound of `max_search_steps` steps.
const std = @import("std");
const tables = @import("uniprop_tables.zig");

/// A table of `uniprop_tables.zig`.
pub const TableId = u16;

/// The longest text between `{` and `}` that can be a name.
pub const max_name_len = 96;

/// Steps of one binary search: the tables hold fewer than 2^24 entries.
const max_search_steps = 24;

comptime {
    std.debug.assert(tables.ranges.len < (1 << max_search_steps));
    std.debug.assert(tables.tables.len <= std.math.maxInt(TableId));
    std.debug.assert(tables.sc.len < (1 << max_search_steps));
}

fn findEntry(entries: []const tables.Entry, name: []const u8) ?TableId {
    var lo: usize = 0;
    var hi: usize = entries.len;
    for (0..max_search_steps) |_| {
        if (lo >= hi) return null;
        const mid = lo + (hi - lo) / 2;
        switch (std.mem.order(u8, entries[mid].name, name)) {
            .eq => return entries[mid].table,
            .lt => lo = mid + 1,
            .gt => hi = mid,
        }
    }
    return null;
}

/// The table of the text between `{` and `}` of `\p{…}`, as ECMAScript reads it: a value of
/// General_Category or a binary property, or `name=value` for General_Category (`gc`),
/// Script (`sc`) and Script_Extensions (`scx`). Null for each other text.
pub fn find(text: []const u8) ?TableId {
    std.debug.assert(text.len <= max_name_len);
    const eq = std.mem.indexOfScalar(u8, text, '=') orelse {
        return findEntry(&tables.gc, text) orelse findEntry(&tables.binary, text);
    };
    const name = text[0..eq];
    const value = text[eq + 1 ..];
    if (std.mem.eql(u8, name, "General_Category") or std.mem.eql(u8, name, "gc")) return findEntry(&tables.gc, value);
    if (std.mem.eql(u8, name, "Script") or std.mem.eql(u8, name, "sc")) return findEntry(&tables.sc, value);
    if (std.mem.eql(u8, name, "Script_Extensions") or std.mem.eql(u8, name, "scx")) return findEntry(&tables.scx, value);
    return null;
}

/// True when code point `c` has the property of `table`.
pub fn has(table: TableId, c: u21) bool {
    std.debug.assert(table < tables.tables.len);
    const t = tables.tables[table];
    const rs = tables.ranges[t.start..][0..t.len];
    var lo: usize = 0;
    var hi: usize = rs.len;
    for (0..max_search_steps) |_| {
        if (lo >= hi) return false;
        const mid = lo + (hi - lo) / 2;
        if (c < rs[mid][0]) {
            hi = mid;
        } else if (c > rs[mid][1]) {
            lo = mid + 1;
        } else return true;
    }
    return false;
}

// ---- tests ---------------------------------------------------------------

const max_code_point: u32 = 0x10FFFF;

/// The count and the two hashes of gen_uniprop.mjs for the code points of a table.
const Proof = struct { count: u32, a: u32, b: u32 };

fn proofStep(p: *Proof, cp: u32) void {
    p.count += 1;
    p.a = (p.a ^ cp) *% 0x01000193;
    p.b = ((p.b ^ cp) *% 0x9E3779B1) +% cp;
}

/// The proof of a table from its ranges: each code point of each range, in order.
fn proofOfRanges(table: TableId) Proof {
    var p: Proof = .{ .count = 0, .a = 0x811C9DC5, .b = 0x9747B28C };
    const t = tables.tables[table];
    for (tables.ranges[t.start..][0..t.len]) |r| {
        var cp = r[0];
        while (cp <= r[1]) : (cp += 1) proofStep(&p, cp);
    }
    return p;
}

/// The proof of a table from `has` for every code point.
fn proofOfSearch(table: TableId) Proof {
    var p: Proof = .{ .count = 0, .a = 0x811C9DC5, .b = 0x9747B28C };
    var cp: u32 = 0;
    while (cp <= max_code_point) : (cp += 1) {
        if (has(table, @intCast(cp))) proofStep(&p, cp);
    }
    return p;
}

fn nextField(line: []const u8, at: *usize) []const u8 {
    const rest = line[at.*..];
    const end = std.mem.indexOfScalar(u8, rest, ' ') orelse rest.len;
    at.* += @min(rest.len, end + 1);
    return rest[0..end];
}

test "the tables are sorted ranges that do not touch, inside the code points" {
    for (tables.tables) |t| {
        try std.testing.expect(t.start + t.len <= tables.ranges.len);
        var next: u32 = 0;
        for (tables.ranges[t.start..][0..t.len], 0..) |r, k| {
            try std.testing.expect(r[0] <= r[1] and r[1] <= max_code_point);
            // A range that touches the one before would be one range.
            if (k > 0) try std.testing.expect(r[0] > next);
            next = r[1] + 1;
        }
    }
    inline for (.{ &tables.gc, &tables.binary, &tables.sc, &tables.scx }) |entries| {
        for (entries[1..], 0..) |e, k| try std.testing.expect(std.mem.order(u8, entries[k].name, e.name) == .lt);
        for (entries) |e| try std.testing.expect(e.table < tables.tables.len and e.name.len <= max_name_len);
    }
}

test "each name has the code points that Node.js gives, for every code point" {
    const text = @embedFile("testdata/uniprop_cases.txt");
    const done = try std.testing.allocator.alloc(bool, tables.tables.len);
    defer std.testing.allocator.free(done);
    @memset(done, false);
    var lines = std.mem.splitScalar(u8, text, '\n');
    var names: u32 = 0;
    while (lines.next()) |line| {
        if (line.len == 0) continue;
        var at: usize = 0;
        const kind = nextField(line, &at);
        const name = nextField(line, &at);
        const want: Proof = .{
            .count = try std.fmt.parseInt(u32, nextField(line, &at), 10),
            .a = try std.fmt.parseInt(u32, nextField(line, &at), 10),
            .b = try std.fmt.parseInt(u32, nextField(line, &at), 10),
        };
        var buf: [max_name_len]u8 = @splat(0);
        const lone = std.mem.eql(u8, kind, "gc") or std.mem.eql(u8, kind, "binary");
        const expression = if (lone) name else try std.fmt.bufPrint(&buf, "{s}={s}", .{ kind, name });
        const table = find(expression) orelse {
            std.debug.print("no table for {s}\n", .{expression});
            return error.TestUnexpectedResult;
        };
        // Node.js tested each code point for this name: the ranges must give the same set.
        const got = proofOfRanges(table);
        if (!std.meta.eql(got, want)) {
            std.debug.print("{s}: got {any}, want {any}\n", .{ expression, got, want });
            return error.TestUnexpectedResult;
        }
        done[table] = true;
        names += 1;
    }
    try std.testing.expect(names == tables.gc.len + tables.binary.len + tables.sc.len + tables.scx.len);
    for (done) |d| try std.testing.expect(d);
}

test "the search gives the ranges: every boundary of every table" {
    for (tables.tables, 0..) |t, k| {
        const table: TableId = @intCast(k);
        var after: u32 = 0;
        for (tables.ranges[t.start..][0..t.len]) |r| {
            if (r[0] > after) {
                try std.testing.expect(!has(table, @intCast(after)));
                try std.testing.expect(!has(table, @intCast(r[0] - 1)));
            }
            try std.testing.expect(has(table, @intCast(r[0])));
            try std.testing.expect(has(table, @intCast(r[0] + (r[1] - r[0]) / 2)));
            try std.testing.expect(has(table, @intCast(r[1])));
            after = r[1] + 1;
        }
        if (after <= max_code_point) {
            try std.testing.expect(!has(table, @intCast(after)));
            try std.testing.expect(!has(table, @intCast(max_code_point)));
        }
    }
}

test "the search gives the ranges for every code point: letters, a script, emoji and marks" {
    for ([_][]const u8{ "L", "sc=Han", "Emoji", "scx=Latin", "Mn", "Any", "Cn" }) |name| {
        const table = find(name).?;
        try std.testing.expect(std.meta.eql(proofOfSearch(table), proofOfRanges(table)));
    }
}

test "names are the names of ECMAScript: case, name spaces and aliases" {
    try std.testing.expect(find("L") != null and find("Letter") != null and find("gc=L") != null);
    try std.testing.expect(find("L").? == find("General_Category=Letter").?);
    try std.testing.expect(find("sc=Latn").? == find("Script=Latin").?);
    try std.testing.expect(find("scx=Latn").? == find("Script_Extensions=Latin").?);
    try std.testing.expect(find("Alphabetic").? == find("Alpha").?);
    // A script has no name without `sc=`, a binary property has no value, and case matters.
    for ([_][]const u8{ "Latin", "Latn", "l", "letter", "sc=latin", "Alphabetic=Yes", "gc=Alphabetic", "sc=L", "Block=Basic_Latin", "", "=", "gc=", "InBasicLatin", "Script=", "L=L" }) |bad| {
        try std.testing.expect(find(bad) == null);
    }
}
