//! Work that waits for memory: a bounded queue of entries in arrival order,
//! each with a payload of bytes. The core holds a start, a result or a run
//! here when no region is free for it, and takes it out when one is
//! (back-pressure: a full pool delays work, it does not fail it). The
//! entries and the bytes are reserved at startup. A full queue is a limit.
const std = @import("std");
const reserve = @import("arena.zig").reserve;

pub const AddError = error{
    /// Every entry is in use, or the live payloads fill the bytes.
    Full,
    /// The payload is larger than all the bytes: it can never wait here.
    TooLarge,
};

/// A queue whose entries carry a `Meta` value and a payload.
pub fn Queue(comptime Meta: type) type {
    // An entry says what waits: a queue of nothing has no use.
    std.debug.assert(@sizeOf(Meta) > 0);
    return struct {
        const Self = @This();

        pub const Entry = struct {
            meta: Meta,
            off: u32,
            len: u32,
        };

        /// The entries that wait, oldest first, in `entries[0..n]`.
        entries: []Entry,
        n: u32,
        /// The payloads. Bytes before `used` belong to an entry or are a gap
        /// that an entry left; `compact` closes the gaps.
        bytes: []u8,
        used: u32,
        /// The sum of the payload lengths of the entries.
        live: u32,
        /// The most entries and payload bytes that waited at one time.
        high_n: u32,
        high_bytes: u32,

        pub fn init(gpa: std.mem.Allocator, max_entries: u32, max_bytes: u32) error{OutOfMemory}!Self {
            std.debug.assert(max_entries >= 1);
            return .{
                .entries = try gpa.alloc(Entry, max_entries),
                .n = 0,
                // Reserved, not touched: the pages are used only while work waits.
                .bytes = try reserve(gpa, u8, max_bytes),
                .used = 0,
                .live = 0,
                .high_n = 0,
                .high_bytes = 0,
            };
        }

        /// Add an entry at the end. The payload is the parts in order.
        pub fn add(q: *Self, meta: Meta, parts: []const []const u8) AddError!void {
            std.debug.assert(q.live <= q.used and q.used <= q.bytes.len);
            var len: usize = 0;
            for (parts) |p| len += p.len;
            if (len > q.bytes.len) return error.TooLarge;
            if (q.n == q.entries.len) return error.Full;
            if (len > q.bytes.len - q.live) return error.Full;
            if (len > q.bytes.len - q.used) q.compact();
            std.debug.assert(len <= q.bytes.len - q.used);
            var at: usize = q.used;
            for (parts) |p| {
                @memcpy(q.bytes[at..][0..p.len], p);
                at += p.len;
            }
            q.entries[q.n] = .{ .meta = meta, .off = q.used, .len = @intCast(len) };
            q.n += 1;
            q.used = @intCast(at);
            q.live += @intCast(len);
            q.high_n = @max(q.high_n, q.n);
            q.high_bytes = @max(q.high_bytes, q.live);
        }

        /// The payload of entry `i`. It is valid until the next `add`.
        pub fn payload(q: *const Self, i: u32) []const u8 {
            std.debug.assert(i < q.n);
            const e = q.entries[i];
            return q.bytes[e.off..][0..e.len];
        }

        /// Take entry `i` out. The entries after it keep their order.
        pub fn remove(q: *Self, i: u32) void {
            std.debug.assert(i < q.n and q.live >= q.entries[i].len);
            q.live -= q.entries[i].len;
            std.mem.copyForwards(Entry, q.entries[i .. q.n - 1], q.entries[i + 1 .. q.n]);
            q.n -= 1;
            // An empty queue starts again at the first byte.
            if (q.n == 0) q.used = 0;
            std.debug.assert(q.n > 0 or q.live == 0);
        }

        /// Move the payloads down, in entry order, so that the free bytes are
        /// one block at the end. Entries are in the order of their offsets,
        /// because `add` writes at the end and `remove` keeps the order.
        fn compact(q: *Self) void {
            var at: u32 = 0;
            for (q.entries[0..q.n]) |*e| {
                std.debug.assert(e.off >= at);
                std.mem.copyForwards(u8, q.bytes[at..][0..e.len], q.bytes[e.off..][0..e.len]);
                e.off = at;
                at += e.len;
            }
            std.debug.assert(at == q.live);
            q.used = at;
        }
    };
}

const TestQueue = Queue(u32);

/// True when the entries of `q` are `want`, oldest first.
fn inOrder(q: *const TestQueue, want: []const u32) bool {
    if (want.len != q.n) return false;
    for (want, q.entries[0..q.n]) |w, e| {
        if (w != e.meta) return false;
    }
    return true;
}

test "held queue: entries leave in arrival order and keep their payloads" {
    var q = try TestQueue.init(std.testing.allocator, 4, 64);
    // The queue of a shard lives as long as the shard. A test frees its own.
    defer std.testing.allocator.free(q.entries);
    defer std.testing.allocator.free(q.bytes);
    try q.add(1, &.{"first"});
    try q.add(2, &.{ "sec", "ond" });
    try q.add(3, &.{});
    try std.testing.expect(inOrder(&q, &.{ 1, 2, 3 }));
    try std.testing.expectEqualStrings("first", q.payload(0));
    try std.testing.expectEqualStrings("second", q.payload(1));
    try std.testing.expectEqualStrings("", q.payload(2));
    q.remove(0);
    try std.testing.expect(inOrder(&q, &.{ 2, 3 }));
    try std.testing.expectEqualStrings("second", q.payload(0));
    q.remove(1);
    q.remove(0);
    try std.testing.expectEqual(@as(u32, 0), q.n);
    try std.testing.expectEqual(@as(u32, 0), q.used);
    try std.testing.expectEqual(@as(u32, 3), q.high_n);
    try std.testing.expectEqual(@as(u32, 11), q.high_bytes);
}

test "held queue: the bound on entries and on bytes is a limit, and a release makes room" {
    var q = try TestQueue.init(std.testing.allocator, 3, 16);
    // The queue of a shard lives as long as the shard. A test frees its own.
    defer std.testing.allocator.free(q.entries);
    defer std.testing.allocator.free(q.bytes);
    try std.testing.expectError(error.TooLarge, q.add(9, &.{"this payload has more than 16 bytes"}));
    try q.add(1, &.{"12345678"});
    try q.add(2, &.{"abcdef"});
    // 14 of 16 bytes are live: 3 more do not fit.
    try std.testing.expectError(error.Full, q.add(3, &.{"xyz"}));
    try q.add(3, &.{"xy"});
    // Every entry is in use.
    try std.testing.expectError(error.Full, q.add(4, &.{}));
    q.remove(1);
    try q.add(4, &.{"ABCDEF"});
    try std.testing.expect(inOrder(&q, &.{ 1, 3, 4 }));
    try std.testing.expectEqualStrings("12345678", q.payload(0));
    try std.testing.expectEqualStrings("xy", q.payload(1));
    try std.testing.expectEqualStrings("ABCDEF", q.payload(2));
}

test "held queue: a removal in the middle leaves a gap that the next large payload closes" {
    var q = try TestQueue.init(std.testing.allocator, 8, 32);
    // The queue of a shard lives as long as the shard. A test frees its own.
    defer std.testing.allocator.free(q.entries);
    defer std.testing.allocator.free(q.bytes);
    try q.add(1, &.{"aaaaaaaaaa"});
    try q.add(2, &.{"bbbbbbbbbb"});
    try q.add(3, &.{"cccccccccc"});
    q.remove(1);
    // 20 bytes are live and 30 are used: 12 bytes fit only after the payloads move down.
    try q.add(4, &.{"dddddddddddd"});
    try std.testing.expectEqual(@as(u32, 32), q.used);
    try std.testing.expect(inOrder(&q, &.{ 1, 3, 4 }));
    try std.testing.expectEqualStrings("aaaaaaaaaa", q.payload(0));
    try std.testing.expectEqualStrings("cccccccccc", q.payload(1));
    try std.testing.expectEqualStrings("dddddddddddd", q.payload(2));
}

test "held queue: random adds and removals keep every payload (model check)" {
    var q = try TestQueue.init(std.testing.allocator, 16, 256);
    // The queue of a shard lives as long as the shard. A test frees its own.
    defer std.testing.allocator.free(q.entries);
    defer std.testing.allocator.free(q.bytes);
    var prng = std.Random.DefaultPrng.init(0x4E1D);
    const rnd = prng.random();
    var model: [16]struct { id: u32, len: u8 } = undefined;
    var n: u32 = 0;
    var next: u32 = 1;
    var buf: [64]u8 = undefined;
    for (0..4000) |_| {
        if (n > 0 and rnd.boolean()) {
            const i = rnd.uintLessThan(u32, n);
            q.remove(i);
            std.mem.copyForwards(@TypeOf(model[0]), model[i .. n - 1], model[i + 1 .. n]);
            n -= 1;
        } else {
            const len = rnd.uintLessThan(u8, 64);
            @memset(buf[0..len], @truncate(next));
            if (q.add(next, &.{buf[0..len]})) |_| {
                model[n] = .{ .id = next, .len = len };
                n += 1;
            } else |e| {
                try std.testing.expect(e == error.Full);
                try std.testing.expect(n == 16 or q.live + len > 256);
            }
            next += 1;
        }
        try std.testing.expectEqual(n, q.n);
        for (model[0..n], 0..) |m, i| {
            try std.testing.expectEqual(m.id, q.entries[i].meta);
            const p = q.payload(@intCast(i));
            try std.testing.expectEqual(@as(usize, m.len), p.len);
            for (p) |b| try std.testing.expectEqual(@as(u8, @truncate(m.id)), b);
        }
    }
}
