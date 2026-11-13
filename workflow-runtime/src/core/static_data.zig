//! Workflow static data (spec 9.7): one JSON document for each workflow,
//! `{ "global": {...}, "node:<name>": {...} }`, as n8n keeps it in the
//! workflow's `staticData`. The table has a fixed number of entries, each
//! with a fixed byte capacity, reserved at startup; a full table or a
//! document over the capacity is a limit, with an error that names the
//! flag that raises it.
const std = @import("std");
const reserveMem = @import("arena.zig").reserve;

/// Longest workflow id (as `core.max_id`).
pub const max_id: usize = 64;

pub const SetError = error{ TableFull, TooLarge };

pub const Table = struct {
    /// The documents: entry `i` owns `buf[i * cap ..][0..cap]`.
    buf: []u8,
    cap: u32,
    ids: [][max_id]u8,
    id_lens: []u8,
    lens: []u32,
    used: []bool,
    count: u32 = 0,

    pub fn init(gpa: std.mem.Allocator, n: u32, cap: u32) !Table {
        std.debug.assert(n >= 1 and cap >= 2);
        const t: Table = .{
            // Reserved, not touched: an entry's pages become resident when
            // a document is written there.
            .buf = try reserveMem(gpa, u8, @as(usize, n) * cap),
            .cap = cap,
            .ids = try gpa.alloc([max_id]u8, n),
            .id_lens = try gpa.alloc(u8, n),
            .lens = try gpa.alloc(u32, n),
            .used = try gpa.alloc(bool, n),
        };
        @memset(t.used, false);
        @memset(t.lens, 0);
        @memset(t.id_lens, 0);
        return t;
    }

    pub fn entries(t: *const Table) u32 {
        return @intCast(t.used.len);
    }

    pub fn find(t: *const Table, id: []const u8) ?u32 {
        if (t.count == 0) return null;
        for (t.used, 0..) |u, i| {
            if (u and std.mem.eql(u8, t.ids[i][0..t.id_lens[i]], id)) return @intCast(i);
        }
        return null;
    }

    /// The document of a workflow, or null when it has none.
    pub fn get(t: *const Table, id: []const u8) ?[]const u8 {
        const i = t.find(id) orelse return null;
        return t.buf[@as(usize, i) * t.cap ..][0..t.lens[i]];
    }

    /// Replace the document of a workflow; the last writer wins.
    pub fn set(t: *Table, id: []const u8, doc: []const u8) SetError!void {
        std.debug.assert(id.len > 0 and id.len <= max_id);
        if (doc.len > t.cap) return error.TooLarge;
        const i = t.find(id) orelse blk: {
            const free = std.mem.indexOfScalar(bool, t.used, false) orelse return error.TableFull;
            t.used[free] = true;
            @memcpy(t.ids[free][0..id.len], id);
            t.id_lens[free] = @intCast(id.len);
            t.count += 1;
            break :blk @as(u32, @intCast(free));
        };
        @memcpy(t.buf[@as(usize, i) * t.cap ..][0..doc.len], doc);
        t.lens[i] = @intCast(doc.len);
        std.debug.assert(t.count <= t.used.len);
    }

    pub fn remove(t: *Table, id: []const u8) void {
        const i = t.find(id) orelse return;
        t.used[i] = false;
        t.lens[i] = 0;
        t.count -= 1;
    }
};

/// True for a document that holds nothing: `{}`, with white space or not.
pub fn isEmpty(doc: []const u8) bool {
    const t = std.mem.trim(u8, doc, " \t\r\n");
    if (t.len < 2 or t[0] != '{' or t[t.len - 1] != '}') return false;
    return std.mem.trim(u8, t[1 .. t.len - 1], " \t\r\n").len == 0;
}

test "static data table: set, replace, remove, limits" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    var t = try Table.init(arena.allocator(), 2, 16);
    try std.testing.expect(t.get("a") == null);
    try t.set("a", "{\"global\":{}}");
    try std.testing.expectEqualStrings("{\"global\":{}}", t.get("a").?);
    try t.set("a", "{}");
    try std.testing.expectEqualStrings("{}", t.get("a").?);
    try t.set("b", "{\"x\":1}");
    try std.testing.expectError(error.TableFull, t.set("c", "{}"));
    try std.testing.expectError(error.TooLarge, t.set("a", "{\"0123456789\":12}"));
    // A failed set keeps the old document.
    try std.testing.expectEqualStrings("{}", t.get("a").?);
    t.remove("a");
    try std.testing.expect(t.get("a") == null);
    try t.set("c", "{}");
    try std.testing.expectEqual(@as(u32, 2), t.count);
    try std.testing.expect(isEmpty(" { } "));
    try std.testing.expect(!isEmpty("{\"a\":1}"));
}
