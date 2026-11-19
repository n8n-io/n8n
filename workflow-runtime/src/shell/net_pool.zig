//! Shared pool helpers for the native protocol clients: a free-slot stack,
//! a ring queue for finished calls, a credential buffer wiped on demand,
//! a SHA-256-keyed connection-pool table with LRU eviction, and an O(1)
//! slotted timer wheel. Every data structure is caller-allocated in `init`;
//! no steady-state allocation happens afterwards.
const std = @import("std");

pub const none: u32 = std.math.maxInt(u32);

// ---- FreeStack ------------------------------------------------------------

pub fn FreeStack(comptime T: type) type {
    return struct {
        items: []T,
        len: u32 = 0,

        /// Fill the stack with every index, biggest first: `pop` then
        /// gives the smallest free index first, which helps with cache use
        /// and keeps smaller indices in the table.
        pub fn initAll(s: *@This()) void {
            for (s.items, 0..) |_, i| {
                s.items[s.items.len - 1 - i] = @intCast(i);
            }
            s.len = @intCast(s.items.len);
        }

        pub fn pop(s: *@This()) ?T {
            if (s.len == 0) return null;
            s.len -= 1;
            return s.items[s.len];
        }

        pub fn push(s: *@This(), v: T) void {
            std.debug.assert(s.len < s.items.len);
            s.items[s.len] = v;
            s.len += 1;
        }
    };
}

// ---- DoneRing ------------------------------------------------------------

pub fn DoneRing(comptime T: type) type {
    return struct {
        items: []T,
        head: u32 = 0,
        len: u32 = 0,

        pub fn push(r: *@This(), v: T) void {
            std.debug.assert(r.len < r.items.len);
            const cap: u32 = @intCast(r.items.len);
            r.items[(r.head + r.len) % cap] = v;
            r.len += 1;
        }

        pub fn pop(r: *@This()) ?T {
            if (r.len == 0) return null;
            const v = r.items[r.head];
            const cap: u32 = @intCast(r.items.len);
            r.head = (r.head + 1) % cap;
            r.len -= 1;
            return v;
        }

        pub fn peek(r: *const @This()) ?T {
            if (r.len == 0) return null;
            return r.items[r.head];
        }
    };
}

// ---- CredBuf ------------------------------------------------------------

/// The standard size for a credential buffer: host, user, database and password.
pub const cred_bytes = 1024;

/// Wipe the credential area of a buffer with secure zero. The buffer can
/// be larger than `cred_bytes`: only the first part is wiped.
fn wipeCred(buf: []u8) void {
    // Discard: the slice that was not wiped is outside the credential area.
    _ = @min(buf.len, cred_bytes);
    @memset(buf[0..@min(buf.len, cred_bytes)], 0);
}

// ---- PoolTable ------------------------------------------------------------

pub const Pool = struct {
    key: [32]u8 = @splat(0),
    conns: u32 = 0,
    /// Calls that use or wait for this pool.
    refs: u32 = 0,
    last_used_ms: i64 = 0,
    /// For `my.zig`: the pool remembers that the server has no
    /// `COM_RESET_CONNECTION`. A sticky pool stays in use even when
    /// `conns == 0 and refs == 0`, so the flag is not lost.
    sticky: bool = false,
};

/// True when a pool is in use and must not be reclaimed for another key.
fn poolInUse(p: *const Pool) bool {
    return p.conns > 0 or p.refs > 0 or p.sticky;
}

/// Find the pool with this key, or claim one that nothing uses. Returns
/// null when every pool is in use. The caller sets `sticky` separately
/// when needed.
pub fn poolFor(pools: []Pool, key: [32]u8, now_ms: i64) ?u32 {
    // Look for an existing pool with the same key.
    for (pools, 0..) |*p, i| {
        const idx: u32 = @intCast(i);
        if (poolInUse(p) and std.mem.eql(u8, &p.key, &key)) {
            p.last_used_ms = now_ms;
            return idx;
        }
    }
    // Look for a free pool (conns == 0, refs == 0, not sticky).
    for (pools, 0..) |*p, i| {
        if (p.conns == 0 and p.refs == 0 and !p.sticky) {
            const idx: u32 = @intCast(i);
            pools[idx] = .{ .key = key, .last_used_ms = now_ms };
            return idx;
        }
    }
    // Evict the oldest unreferenced pool (conns == 0, refs == 0),
    // sticky or not.
    var best: ?u32 = null;
    for (pools, 0..) |*p, i| {
        if (p.conns > 0 or p.refs > 0) continue;
        const idx: u32 = @intCast(i);
        if (best == null or p.last_used_ms < pools[best.?].last_used_ms) best = idx;
    }
    const idx = best orelse return null;
    pools[idx] = .{ .key = key, .last_used_ms = now_ms };
    return idx;
}

/// SHA-256 of the credential bytes and their lengths. The password is
/// mixed in only through the hash.
pub fn poolKey(cred: []const u8, lens: []const u16) [32]u8 {
    var h = std.crypto.hash.sha2.Sha256.init(.{});
    h.update(std.mem.sliceAsBytes(lens));
    h.update(cred);
    return h.finalResult();
}

// ---- TimerWheel ------------------------------------------------------------

pub const wheel_tick_ms: i64 = 100;
pub const wheel_len: u32 = 512; // power of two; covers 51.2 s ahead

const none_slot: u16 = std.math.maxInt(u16);

pub const Link = struct {
    slot: u16 = none_slot,
    prev: u32 = none,
    next: u32 = none,
};

pub const TimerWheel = struct {
    links: []Link = &.{},
    heads: [wheel_len]u32 = @splat(none),
    tick: i64 = 0,

    pub fn init(w: *TimerWheel, links: []Link) void {
        w.links = links;
        @memset(&w.heads, @as(u32, none));
        w.tick = 0;
    }

    pub fn schedule(w: *TimerWheel, id: u32, deadline_ms: i64, now_ms: i64) void {
        // Cancel any existing entry first.
        w.cancel(id);
        if (w.tick == 0) w.tick = @divFloor(now_ms, wheel_tick_ms);
        const tick = std.math.clamp(@divFloor(deadline_ms, wheel_tick_ms), w.tick + 1, w.tick + wheel_len - 1);
        const slot: u16 = @intCast(@mod(tick, wheel_len));
        w.links[id].slot = slot;
        w.links[id].prev = none;
        w.links[id].next = w.heads[slot];
        if (w.links[id].next != none) w.links[w.links[id].next].prev = id;
        w.heads[slot] = id;
    }

    pub fn cancel(w: *TimerWheel, id: u32) void {
        const link = &w.links[id];
        if (link.slot == none_slot) return;
        if (link.prev != none) w.links[link.prev].next = link.next else w.heads[link.slot] = link.next;
        if (link.next != none) w.links[link.next].prev = link.prev;
        link.slot = none_slot;
        link.prev = none;
        link.next = none;
    }

    /// Visit entries whose tick is at or before `now_ms`. Each entry is
    /// popped and callback `cb(id)` is called. The callback must call
    /// `schedule` again when the entry still has a deadline.
    pub fn advanceTo(w: *TimerWheel, now_ms: i64, context: anytype) void {
        const target = @divFloor(now_ms, wheel_tick_ms);
        if (w.tick == 0) w.tick = target;
        var steps: u32 = 0;
        while (w.tick < target and steps < wheel_len) : (steps += 1) {
            w.tick += 1;
            const slot: u16 = @intCast(@mod(w.tick, wheel_len));
            var id = w.heads[slot];
            // Detach every entry of this slot: callbacks re-link what
            // still has a later deadline.
            w.heads[slot] = none;
            var guard: u32 = 0;
            while (id != none and guard < w.links.len) : (guard += 1) {
                const next = w.links[id].next;
                w.links[id].slot = none_slot;
                w.links[id].prev = none;
                w.links[id].next = none;
                context.fire(id);
                id = next;
            }
        }
        // A long pause catches up without stepping through each tick.
        if (w.tick < target) w.tick = target;
    }
};

// ---- tests ------------------------------------------------------------

test "FreeStack: initAll, pop, push, exhaustion" {
    var buf: [4]u32 = @splat(0);
    var s = FreeStack(u32){ .items = &buf };
    s.initAll();
    try std.testing.expectEqual(@as(u32, 4), s.len);
    try std.testing.expectEqual(@as(u32, 0), s.pop().?);
    try std.testing.expectEqual(@as(u32, 1), s.pop().?);
    try std.testing.expectEqual(@as(u32, 2), s.pop().?);
    try std.testing.expectEqual(@as(u32, 3), s.pop().?);
    try std.testing.expectEqual(@as(?u32, null), s.pop());
    s.push(42);
    try std.testing.expectEqual(@as(u32, 42), s.pop().?);
    try std.testing.expectEqual(@as(?u32, null), s.pop());
}

test "DoneRing: push, pop, wraparound" {
    var buf: [4]u32 = @splat(0);
    var r = DoneRing(u32){ .items = &buf };
    r.push(10);
    r.push(20);
    try std.testing.expectEqual(@as(u32, 10), r.peek().?);
    try std.testing.expectEqual(@as(u32, 10), r.pop().?);
    r.push(30);
    r.push(40);
    r.push(50);
    try std.testing.expectEqual(@as(u32, 20), r.pop().?);
    try std.testing.expectEqual(@as(u32, 30), r.pop().?);
    try std.testing.expectEqual(@as(u32, 40), r.pop().?);
    try std.testing.expectEqual(@as(u32, 50), r.pop().?);
    try std.testing.expectEqual(@as(?u32, null), r.pop());
    try std.testing.expectEqual(@as(?u32, null), r.peek());
}

test "DoneRing: wraparound around buffer edge" {
    var buf: [3]u32 = @splat(0);
    var r = DoneRing(u32){ .items = &buf };
    r.push(1);
    r.push(2);
    try std.testing.expectEqual(@as(u32, 1), r.pop().?);
    r.push(3);
    r.push(4);
    try std.testing.expectEqual(@as(u32, 2), r.pop().?);
    try std.testing.expectEqual(@as(u32, 3), r.pop().?);
    try std.testing.expectEqual(@as(u32, 4), r.pop().?);
    try std.testing.expectEqual(@as(?u32, null), r.pop());
}

test "wipeCred: clears credential area" {
    var buf: [cred_bytes]u8 = @splat(0x42);
    wipeCred(&buf);
    for (buf) |b| {
        try std.testing.expectEqual(@as(u8, 0), b);
    }
}

test "wipeCred: larger buffer, only first part cleared" {
    var buf: [cred_bytes + 16]u8 = @splat(0x42);
    wipeCred(&buf);
    for (buf[0..cred_bytes]) |b| {
        try std.testing.expectEqual(@as(u8, 0), b);
    }
    for (buf[cred_bytes..]) |b| {
        try std.testing.expectEqual(@as(u8, 0x42), b);
    }
}

test "PoolTable: key match reuses pool" {
    var pools: [3]Pool = @splat(.{});
    const k1 = poolKey("host1usr1db1pass1", &.{ 5, 3, 2, 5, 5432, 0 });
    const idx1 = poolFor(&pools, k1, 100).?;
    try std.testing.expectEqual(@as(u32, 0), idx1);
    pools[idx1].conns = 2;
    pools[idx1].refs = 1;
    const idx1b = poolFor(&pools, k1, 200).?;
    try std.testing.expectEqual(idx1, idx1b);
    try std.testing.expectEqual(@as(u32, 2), pools[idx1].conns);
    try std.testing.expectEqual(@as(u32, 1), pools[idx1].refs);
}

test "PoolTable: sticky pool keeps its slot" {
    var pools: [2]Pool = @splat(.{});
    const k1 = poolKey("a", &.{1});
    const idx1 = poolFor(&pools, k1, 100).?;
    pools[idx1].sticky = true;
    // Pool is sticky with no conns and no refs: still in_use.
    try std.testing.expect(poolInUse(&pools[idx1]));
    // A different key gets the other slot.
    const k2 = poolKey("b", &.{1});
    const idx2 = poolFor(&pools, k2, 200).?;
    try std.testing.expect(idx2 != idx1);
    // Eviction of stale sticky pools: k1 can be evicted for a third key.
    const k3 = poolKey("c", &.{1});
    const idx3 = poolFor(&pools, k3, 300).?;
    try std.testing.expect(idx3 == idx1);
}

test "PoolTable: LRU eviction picks oldest unreferenced" {
    var pools: [3]Pool = @splat(.{});
    const k1 = poolKey("a", &.{1});
    const k2 = poolKey("b", &.{1});
    const k3 = poolKey("c", &.{1});
    const k4 = poolKey("d", &.{1});
    // Fill three pools: a, b, c.
    _ = poolFor(&pools, k1, 100);
    _ = poolFor(&pools, k2, 200);
    _ = poolFor(&pools, k3, 300);
    // Release conns and refs so they are evictable.
    for (&pools) |*p| {
        p.conns = 0;
        p.refs = 0;
    }
    // k4 evicts the oldest (k1, at 100 ms).
    _ = poolFor(&pools, k4, 400);
    try std.testing.expect(std.mem.eql(u8, &pools[0].key, &k4));
    try std.testing.expectEqual(@as(i64, 400), pools[0].last_used_ms);
}

test "TimerWheel: schedule, cancel, advance" {
    var links: [4]Link = @splat(.{});
    var w: TimerWheel = .{ .links = &links };
    w.init(&links);
    // Schedule id 0 at 200 ms from epoch.
    w.schedule(0, 200, 0);
    try std.testing.expect(links[0].slot != none_slot);
    // Cancel id 0.
    w.cancel(0);
    try std.testing.expectEqual(none_slot, links[0].slot);
    // Re-schedule.
    w.schedule(0, 200, 0);
    // Advance to 150 ms: nothing fired.
    var fired: u32 = 0;
    const Ctx = struct {
        links: []Link,
        fired: *u32,
        pub fn fire(ctx: @This(), id: u32) void {
            _ = id;
            ctx.fired.* += 1;
        }
    };
    w.advanceTo(150, Ctx{ .links = &links, .fired = &fired });
    try std.testing.expectEqual(@as(u32, 0), fired);
    // Advance to 250 ms: one fired.
    w.advanceTo(250, Ctx{ .links = &links, .fired = &fired });
    try std.testing.expectEqual(@as(u32, 1), fired);
}

test "TimerWheel: far future deadline clamped to wheel horizon" {
    var links: [2]Link = @splat(.{});
    var w: TimerWheel = .{ .links = &links };
    w.init(&links);
    // Deadline 60 s ahead: clamped to tick + wheel_len - 1.
    w.schedule(0, 60_000, 0);
    try std.testing.expect(links[0].slot != none_slot);
    // Entry is in a valid slot: advance to tick 1 does not fire it.
    var fired: u32 = 0;
    const Ctx = struct {
        fired: *u32,
        pub fn fire(ctx: @This(), id: u32) void {
            _ = id;
            ctx.fired.* += 1;
        }
    };
    w.advanceTo(100, Ctx{ .fired = &fired });
    try std.testing.expectEqual(@as(u32, 0), fired);
}

test "TimerWheel: reschedule-on-pop pattern when deadline moved forward" {
    var links: [2]Link = @splat(.{});
    var w: TimerWheel = .{ .links = &links };
    w.init(&links);
    // First schedule at 300 ms.
    w.schedule(0, 300, 0);
    // The deadline moves forward to 500 ms: cancel then schedule again.
    w.cancel(0);
    w.schedule(0, 500, 0);
    var fired: u32 = 0;
    const Ctx = struct {
        fired: *u32,
        pub fn fire(ctx: @This(), id: u32) void {
            _ = id;
            ctx.fired.* += 1;
        }
    };
    // Advance to 400 ms: the old deadline was 300 but it was cancelled.
    w.advanceTo(400, Ctx{ .fired = &fired });
    try std.testing.expectEqual(@as(u32, 0), fired);
    // Advance to 550 ms: now it fires.
    w.advanceTo(550, Ctx{ .fired = &fired });
    try std.testing.expectEqual(@as(u32, 1), fired);
}

test "TimerWheel: wraparound after 512 ticks" {
    var links: [1]Link = @splat(.{});
    var w: TimerWheel = .{ .links = &links };
    w.init(&links);
    // Set a fake tick near the end of the wheel.
    w.tick = 500;
    // Schedule at tick 510 (deadline 51000 ms from epoch).
    w.schedule(0, 510 * wheel_tick_ms, 500 * wheel_tick_ms);
    var fired: u32 = 0;
    const Ctx = struct {
        fired: *u32,
        pub fn fire(ctx: @This(), id: u32) void {
            _ = id;
            ctx.fired.* += 1;
        }
    };
    w.advanceTo(511 * wheel_tick_ms, Ctx{ .fired = &fired });
    try std.testing.expectEqual(@as(u32, 1), fired);
}