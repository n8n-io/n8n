//! The memory of one shard: an arena reserved at startup, and a count of
//! the allocations made after startup. Once the shard is ready, its memory
//! must not grow (docs/zig-standards.md): every buffer comes from a pool
//! sized at startup, and a full pool is a limit. `wfrt serve` prints the
//! counts when it stops, and ci.sh fails when they are not zero.
const std = @import("std");

pub const Guard = struct {
    arena: std.heap.ArenaAllocator,
    /// Set when `Runner.init` returns.
    ready: bool = false,
    /// The arena capacity when the shard became ready.
    ready_capacity: usize = 0,
    /// Allocations, resizes that grow and remaps after startup.
    late_allocs: u64 = 0,
    late_bytes: u64 = 0,
    /// Print where the first late allocations come from (Debug builds).
    trace: bool = true,

    pub fn init(backing: std.mem.Allocator) Guard {
        return .{ .arena = std.heap.ArenaAllocator.init(backing) };
    }

    pub fn deinit(g: *Guard) void {
        g.arena.deinit();
    }

    pub fn allocator(g: *Guard) std.mem.Allocator {
        return .{ .ptr = g, .vtable = &vtable };
    }

    pub fn markReady(g: *Guard) void {
        std.debug.assert(!g.ready);
        g.ready = true;
        g.ready_capacity = g.arena.queryCapacity();
        g.late_allocs = 0;
        g.late_bytes = 0;
    }

    /// True when the shard allocated nothing after startup.
    pub fn steady(g: *Guard) bool {
        std.debug.assert(g.ready);
        return g.late_allocs == 0 and g.arena.queryCapacity() == g.ready_capacity;
    }

    fn note(g: *Guard, n: usize) void {
        if (!g.ready) return;
        g.late_allocs += 1;
        g.late_bytes += n;
        // Debug builds name the place at once, so a regression is easy to find.
        if (g.trace and @import("builtin").mode == .debug and g.late_allocs <= 4) {
            std.debug.print("shard memory: an allocation of {d} bytes after startup\n", .{n});
            std.debug.dumpCurrentStackTrace(.{});
        }
    }

    const vtable: std.mem.Allocator.VTable = .{ .alloc = alloc, .resize = resize, .remap = remap, .free = free };

    fn alloc(ctx: *anyopaque, n: usize, a: std.mem.Alignment, ra: usize) ?[*]u8 {
        const g: *Guard = @ptrCast(@alignCast(ctx));
        g.note(n);
        return g.arena.allocator().rawAlloc(n, a, ra);
    }

    fn resize(ctx: *anyopaque, m: []u8, a: std.mem.Alignment, n: usize, ra: usize) bool {
        const g: *Guard = @ptrCast(@alignCast(ctx));
        if (n > m.len) g.note(n - m.len);
        return g.arena.allocator().rawResize(m, a, n, ra);
    }

    fn remap(ctx: *anyopaque, m: []u8, a: std.mem.Alignment, n: usize, ra: usize) ?[*]u8 {
        const g: *Guard = @ptrCast(@alignCast(ctx));
        if (n > m.len) g.note(n - m.len);
        return g.arena.allocator().rawRemap(m, a, n, ra);
    }

    fn free(ctx: *anyopaque, m: []u8, a: std.mem.Alignment, ra: usize) void {
        const g: *Guard = @ptrCast(@alignCast(ctx));
        g.arena.allocator().rawFree(m, a, ra);
    }
};

test "growth guard counts allocations after startup" {
    var g = Guard.init(std.testing.allocator);
    defer g.deinit();
    g.trace = false;
    const a = g.allocator();
    _ = try a.alloc(u8, 100);
    g.markReady();
    try std.testing.expect(g.steady());
    // Freeing is not growth.
    var list: std.ArrayList(u8) = .empty;
    try std.testing.expect(g.steady());
    try list.append(a, 1);
    try std.testing.expect(!g.steady());
    try std.testing.expectEqual(@as(u64, 1), g.late_allocs);
}
