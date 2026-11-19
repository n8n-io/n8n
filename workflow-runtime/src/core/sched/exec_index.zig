//! Execution id → slot: an open-addressing table with Robin Hood linear
//! probing and backward-shift deletion, so removals leave no tombstones.
//! Execution ids of a shard come from counters, so the ids of live
//! executions sit close together in the table: lookups touch few cache
//! lines, where a hash map scatters them. Those ids also form one long run
//! of full entries. Robin Hood order keeps each entry at most as far from
//! its home as the entries before it, so a removal stops at the first entry
//! that is at its home, and a miss stops at the first entry that is closer
//! to its home than the probe. Plain linear probing scans to the end of the
//! run on every removal. The table has a fixed size, reserved at startup,
//! of at least twice the slot count, so it is at most half full.
const std = @import("std");

pub fn ExecIndex(comptime V: type) type {
    return struct {
        const Self = @This();
        /// 0 marks an empty entry: no execution has id 0.
        keys: []u64 = &.{},
        vals: []V = &.{},
        n: u32 = 0,
        /// Entries visited by puts and removes: the tests bound it.
        probes: u64 = 0,

        pub const empty: Self = .{};

        /// Reserve room for `cap` entries. Called once, at startup.
        pub fn ensureTotalCapacity(t: *Self, gpa: std.mem.Allocator, cap: u32) !void {
            std.debug.assert(t.keys.len == 0);
            const size = try std.math.ceilPowerOfTwo(usize, @max(16, @as(usize, cap) * 2));
            t.keys = try gpa.alloc(u64, size);
            t.vals = try gpa.alloc(V, size);
            @memset(t.keys, 0);
        }

        pub fn deinit(t: *Self, gpa: std.mem.Allocator) void {
            gpa.free(t.keys);
            gpa.free(t.vals);
            t.* = .{};
        }

        fn home(t: *const Self, id: u64) usize {
            // The counter is in the low bits; fold the shard and flag bits in.
            return @intCast((id ^ (id >> 40)) & (t.keys.len - 1));
        }

        /// How far the entry at `i` is from its home.
        fn dist(t: *const Self, k: u64, i: usize) usize {
            return (i -% t.home(k)) & (t.keys.len - 1);
        }

        fn find(t: *const Self, id: u64, probes: *u64) ?usize {
            std.debug.assert(id != 0);
            if (t.keys.len == 0) return null;
            const mask = t.keys.len - 1;
            var i = t.home(id);
            var d: usize = 0;
            while (d < t.keys.len) : (d += 1) {
                probes.* += 1;
                const k = t.keys[i];
                if (k == id) return i;
                // Robin Hood order: `id` would sit before an entry that is
                // closer to its home than `id` is at this point.
                if (k == 0 or t.dist(k, i) < d) return null;
                i = (i + 1) & mask;
            }
            return null;
        }

        pub fn get(t: *const Self, id: u64) ?V {
            var probes: u64 = 0;
            const i = t.find(id, &probes) orelse return null;
            return t.vals[i];
        }

        pub fn count(t: *const Self) u32 {
            return t.n;
        }

        /// Insert or replace. The table never fills: it holds at most half
        /// its size, as `ensureTotalCapacity` sized it.
        pub fn putAssumeCapacity(t: *Self, id: u64, v: V) void {
            std.debug.assert(id != 0);
            if (t.find(id, &t.probes)) |i| {
                t.vals[i] = v;
                return;
            }
            std.debug.assert(t.n < t.keys.len / 2);
            const mask = t.keys.len - 1;
            var cur_k = id;
            var cur_v = v;
            var i = t.home(id);
            var d: usize = 0;
            var probes: usize = 0;
            while (probes < t.keys.len) : (probes += 1) {
                t.probes += 1;
                const k = t.keys[i];
                if (k == 0) {
                    t.keys[i] = cur_k;
                    t.vals[i] = cur_v;
                    t.n += 1;
                    return;
                }
                const dk = t.dist(k, i);
                if (dk < d) {
                    // Take the place of the entry that is closer to home,
                    // and carry it on.
                    const vk = t.vals[i];
                    t.keys[i] = cur_k;
                    t.vals[i] = cur_v;
                    cur_k = k;
                    cur_v = vk;
                    d = dk;
                }
                i = (i + 1) & mask;
                d += 1;
            }
            unreachable; // At most half full.
        }

        /// Remove `id`. Later entries of the probe run that are away from
        /// their home move back by one, so no tombstone stays.
        pub fn remove(t: *Self, id: u64) bool {
            var gap = t.find(id, &t.probes) orelse return false;
            const mask = t.keys.len - 1;
            var probes: usize = 0;
            while (probes < t.keys.len) : (probes += 1) {
                t.probes += 1;
                const j = (gap + 1) & mask;
                const k = t.keys[j];
                if (k == 0 or t.dist(k, j) == 0) break;
                t.keys[gap] = k;
                t.vals[gap] = t.vals[j];
                gap = j;
            }
            t.keys[gap] = 0;
            t.n -= 1;
            return true;
        }

        /// No tombstones: nothing to do. Kept for the callers of the hash map.
        pub fn rehash(_: *Self, _: anytype) void {}

        pub const KeyIterator = struct {
            t: *const Self,
            i: usize = 0,

            pub fn next(it: *KeyIterator) ?*const u64 {
                while (it.i < it.t.keys.len) {
                    const i = it.i;
                    it.i += 1;
                    if (it.t.keys[i] != 0) return &it.t.keys[i];
                }
                return null;
            }
        };

        pub fn keyIterator(t: *const Self) KeyIterator {
            return .{ .t = t };
        }
    };
}

test "ExecIndex agrees with a hash map under random puts and removes" {
    const gpa = std.testing.allocator;
    var t: ExecIndex(u32) = .empty;
    defer t.deinit(gpa);
    try t.ensureTotalCapacity(gpa, 64);
    var ref: std.AutoHashMapUnmanaged(u64, u32) = .empty;
    defer ref.deinit(gpa);
    var prng = std.Random.DefaultPrng.init(42);
    const r = prng.random();
    var next: u64 = 1;
    var live: [64]u64 = undefined;
    var nlive: usize = 0;
    var step: u32 = 0;
    while (step < 20_000) : (step += 1) {
        if (nlive < 64 and (nlive == 0 or r.boolean())) {
            // Mostly sequential ids, as the core gives them, with a shard prefix.
            const id = (@as(u64, 3) << 48) | next;
            next += 1 + r.uintLessThan(u64, 3);
            t.putAssumeCapacity(id, step);
            try ref.put(gpa, id, step);
            live[nlive] = id;
            nlive += 1;
        } else {
            const k = r.uintLessThan(usize, nlive);
            const id = live[k];
            try std.testing.expect(t.remove(id));
            try std.testing.expect(ref.remove(id));
            live[k] = live[nlive - 1];
            nlive -= 1;
        }
        try std.testing.expectEqual(ref.count(), t.count());
        if (step % 97 == 0) {
            var it = ref.iterator();
            while (it.next()) |e| try std.testing.expectEqual(e.value_ptr.*, t.get(e.key_ptr.*).?);
            try std.testing.expectEqual(@as(?u32, null), t.get((@as(u64, 3) << 48) | (next + 7)));
        }
    }
}

test "ExecIndex removes from a long run of sequential ids in a few probes" {
    // Regression: with plain linear probing, live sequential ids form one
    // run of full entries, and each removal scanned to the end of the run.
    const gpa = std.testing.allocator;
    var t: ExecIndex(u32) = .empty;
    defer t.deinit(gpa);
    const live = 60_000;
    try t.ensureTotalCapacity(gpa, live);
    const base: u64 = (@as(u64, 1) << 48) | 1;
    var i: u64 = 0;
    while (i < live) : (i += 1) t.putAssumeCapacity(base + i, @intCast(i));
    // Oldest first, as executions finish, while new ones start: the run
    // slides along the table and wraps around it.
    const rounds = 100_000;
    t.probes = 0;
    var r: u64 = 0;
    while (r < rounds) : (r += 1) {
        try std.testing.expect(t.remove(base + r));
        t.putAssumeCapacity(base + live + r, @intCast(r));
    }
    try std.testing.expectEqual(@as(u32, live), t.count());
    // Each round is two operations: at most 4 probes each on average.
    try std.testing.expect(t.probes <= rounds * 2 * 4);
    // A miss in the middle of the run stops at once.
    var miss_probes: u64 = 0;
    try std.testing.expectEqual(@as(?usize, null), t.find(base + 1, &miss_probes));
    try std.testing.expect(miss_probes <= 2);
    try std.testing.expectEqual(@as(?u32, rounds - 1), t.get(base + live + rounds - 1));
}

test "ExecIndex keeps Robin Hood order when homes collide" {
    // Ids that share low bits collide on their home and wrap at the end.
    const gpa = std.testing.allocator;
    var t: ExecIndex(u32) = .empty;
    defer t.deinit(gpa);
    try t.ensureTotalCapacity(gpa, 8); // 16 entries
    const ids = [_]u64{ 15, 31, 47, 1, 14, 30, 2 };
    for (ids, 0..) |id, k| t.putAssumeCapacity(id, @intCast(k));
    for (ids, 0..) |id, k| try std.testing.expectEqual(@as(?u32, @intCast(k)), t.get(id));
    try std.testing.expect(t.remove(31));
    try std.testing.expect(t.remove(14));
    try std.testing.expectEqual(@as(?u32, null), t.get(31));
    for ([_]u64{ 15, 47, 1, 30, 2 }) |id| try std.testing.expect(t.get(id) != null);
    try std.testing.expect(!t.remove(31));
    try std.testing.expectEqual(@as(u32, 5), t.count());
}
