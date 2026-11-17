//! Tests of the work that waits for a slot or a region in the core
//! (`State.held`, `serveHeld`): a full pool delays a start or a result, it
//! does not fail it. `held.zig` has the tests of the queue itself.
const std = @import("std");
const core = @import("core.zig");
const heap = @import("heap.zig");
const Asm = @import("asm.zig").Asm;
const Arena = @import("arena.zig").Arena;
const EffectKind = @import("module.zig").EffectKind;

const testing = std.testing;

/// `run(t) { return await Call(t) }`: the execution keeps its trigger and
/// waits in memory for the result of its one step.
fn callModule(gpa: std.mem.Allocator) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = "{}" };
    defer a.deinit();
    const call = try a.step("Call", .node);
    a.beginFunc();
    try a.emitBc(.loadi, 3, call);
    try a.emit(.@"suspend", @backingInt(EffectKind.node), 2, 3, 0);
    try a.emit(.ret, 0, 2, 0, 0);
    try a.endFunc("run", 1, 4, 0);
    return a.finish();
}

/// One region of each class above the first: the fourth large execution waits.
const Bed = struct {
    st: core.State,
    scratch: Arena,
    gpa: std.mem.Allocator,
    now: i64 = 1_000,

    fn init(a: std.mem.Allocator, held_entries: u32, held_bytes: u32) !Bed {
        const cfg: core.Config = .{
            .slots = 8,
            .region_counts = .{ 8, 1, 1, 1 },
            .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 },
            .held_entries = held_entries,
            .held_bytes = held_bytes,
            .max_parked = 16,
            .max_timers = 16,
            .max_pending = 16,
            .max_actions = 64,
            .max_batch_events = 16,
            .module_bytes = 1 << 14,
            .natives_total = 1 << 10,
            .max_modules = 2,
            .max_routes = 2,
            .max_schedules = 2,
            .max_zones = 2,
        };
        var b: Bed = .{ .st = try core.State.init(a, cfg), .scratch = Arena.init(try a.alloc(u8, 8 << 20)), .gpa = a };
        _ = try b.tick(&.{.{ .kind = .load_module, .payload = try callModule(a) }});
        return b;
    }

    fn tick(b: *Bed, events: []const core.Event) ![]const core.Action {
        b.now += 10;
        b.scratch.reset();
        _ = try core.step(&b.st, b.now, events, &b.scratch);
        try core.checkInvariants(&b.st);
        return b.st.emitted();
    }

    /// A trigger of about `bytes` bytes: `{"pad":"xxx..."}`.
    fn trigger(b: *Bed, bytes: usize) ![]const u8 {
        const t = try b.gpa.alloc(u8, bytes);
        @memset(t, 'x');
        const head = "{\"pad\":\"";
        @memcpy(t[0..head.len], head);
        @memcpy(t[bytes - 2 ..], "\"}");
        return t;
    }

    /// Start an execution whose reply goes to `conn`. The id of the
    /// execution that began to run in this batch, or null when it waits.
    fn start(b: *Bed, conn: u64, bytes: usize) !?u64 {
        const acts = try b.tick(&.{.{ .kind = .start, .aux = 0, .conn = conn, .payload = try b.trigger(bytes) }});
        return dispatched(acts);
    }
};

/// The execution of the one step that this batch sent, or null.
fn dispatched(acts: []const core.Action) ?u64 {
    var id: ?u64 = null;
    for (acts) |a| {
        if (a.kind != .dispatch) continue;
        std.debug.assert(id == null);
        id = a.exec_id;
    }
    return id;
}

fn replyTo(acts: []const core.Action, conn: u64) ?core.Action {
    for (acts) |a| if (a.kind == .reply and a.conn == conn) return a;
    return null;
}

fn ok(id: u64, payload: []const u8) core.Event {
    return .{ .kind = .effect_ok, .exec_id = id, .seq = 0, .payload = payload };
}

test "held: a start that finds no region waits, and runs in arrival order when one is free" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var b = try Bed.init(arena.allocator(), 8, 1 << 20);
    // Three executions with a 10 KB trigger take the three larger regions.
    const first = (try b.start(1, 10_000)).?;
    const second = (try b.start(2, 10_000)).?;
    const third = (try b.start(3, 10_000)).?;
    try testing.expectEqual(@as(u32, 3), b.st.liveExecutions());
    // The next three find none: they wait. No reply, no failure.
    for ([_]u64{ 4, 5, 6 }) |conn| {
        const acts = try b.tick(&.{.{ .kind = .start, .aux = 0, .conn = conn, .payload = try b.trigger(10_000) }});
        try testing.expectEqual(@as(usize, 0), acts.len);
    }
    try testing.expectEqual(@as(u32, 3), b.st.limits().held_starts);
    try testing.expectEqual(@as(u64, 3), b.st.counters.start_waits);
    try testing.expectEqual(@as(u32, 3), b.st.liveExecutions());
    // While a start waits, the shell reads no new start (back-pressure).
    try testing.expect(!b.st.startRoom(100, 0));

    // The second execution ends: its region goes to the oldest start that waits.
    var acts = try b.tick(&.{ok(second, "{\"v\":2}")});
    try testing.expectEqual(@as(u32, 200), replyTo(acts, 2).?.aux);
    try testing.expectEqual(@as(u32, 2), b.st.limits().held_starts);
    // The start runs in the next batch.
    const fourth = dispatched(try b.tick(&.{})).?;
    try testing.expect(fourth != first and fourth != third);

    // Two regions go back in one batch: the two starts that wait run, oldest first.
    acts = try b.tick(&.{ ok(first, "{\"v\":1}"), ok(third, "{\"v\":3}") });
    try testing.expectEqual(@as(u32, 0), b.st.limits().held_starts);
    try testing.expect(b.st.startRoom(100, 0));
    acts = try b.tick(&.{});
    var ids: [2]u64 = undefined;
    var n: usize = 0;
    for (acts) |a| {
        if (a.kind != .dispatch) continue;
        ids[n] = a.exec_id;
        n += 1;
    }
    try testing.expectEqual(@as(usize, 2), n);
    // Ids come in arrival order: the fifth start has the smaller one.
    try testing.expect(fourth < ids[0] and ids[0] < ids[1]);
    // Each one answers on its own connection.
    acts = try b.tick(&.{ ok(fourth, "{\"v\":4}"), ok(ids[0], "{\"v\":5}"), ok(ids[1], "{\"v\":6}") });
    for ([_]u64{ 4, 5, 6 }) |conn| try testing.expectEqual(@as(u32, 200), replyTo(acts, conn).?.aux);
    try testing.expectEqual(@as(u32, 0), b.st.liveExecutions());
    try testing.expectEqual(@as(u64, 0), b.st.counters.limit_finished);
}

test "held: a full queue of waiting starts answers 503 and gives the id back (the bound)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    // Room for two entries.
    var b = try Bed.init(arena.allocator(), 2, 1 << 20);
    var last: u64 = 0;
    for ([_]u64{ 1, 2, 3 }) |conn| last = (try b.start(conn, 10_000)).?;
    try testing.expect((try b.start(4, 10_000)) == null);
    try testing.expect((try b.start(5, 10_000)) == null);
    const acts = try b.tick(&.{.{ .kind = .start, .aux = 0, .conn = 6, .payload = try b.trigger(10_000) }});
    try testing.expectEqual(@as(u32, 503), replyTo(acts, 6).?.aux);
    try testing.expectEqual(@as(u64, 1), b.st.counters.held_refused);
    try testing.expectEqual(@as(u32, 2), b.st.limits().held_starts);
    // The refused start left no id behind: the two that wait have the next two.
    _ = try b.tick(&.{ok(last, "1")});
    const next = dispatched(try b.tick(&.{})).?;
    try testing.expectEqual(last + 1, next);
}

test "held: a payload larger than the bytes of the queue cannot wait" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var b = try Bed.init(arena.allocator(), 8, 4096);
    for ([_]u64{ 1, 2, 3 }) |conn| _ = (try b.start(conn, 10_000)).?;
    const acts = try b.tick(&.{.{ .kind = .start, .aux = 0, .conn = 4, .payload = try b.trigger(10_000) }});
    try testing.expectEqual(@as(u32, 503), replyTo(acts, 4).?.aux);
    try testing.expectEqual(@as(u32, 0), b.st.limits().held_starts);
}

test "held: a trigger that fits no region is refused with 413, with every region free" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var b = try Bed.init(arena.allocator(), 8, 1 << 20);
    // Larger than the largest region (1 MB): it can never run.
    const acts = try b.tick(&.{.{ .kind = .start, .aux = 0, .conn = 1, .payload = try b.trigger(2 << 20) }});
    try testing.expectEqual(@as(u32, 413), replyTo(acts, 1).?.aux);
    try testing.expectEqual(@as(u64, 1), b.st.counters.too_large);
    try testing.expectEqual(@as(u32, 0), b.st.limits().held);
    try testing.expectEqual(@as(u32, 0), b.st.liveExecutions());
}

test "held: a result that finds no larger region waits, and the execution goes on when one is free" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var b = try Bed.init(arena.allocator(), 8, 1 << 20);
    var large: [3]u64 = undefined;
    for (&large, 1..) |*id, conn| id.* = (try b.start(conn, 10_000)).?;
    // A small execution has a region of the first class (4 KB).
    const small = (try b.start(9, 100)).?;
    // Its result has 20 KB: it needs a larger region, and none is free.
    const result = try b.trigger(20_000);
    var acts = try b.tick(&.{ok(small, result)});
    try testing.expect(replyTo(acts, 9) == null);
    try testing.expectEqual(@as(u64, 1), b.st.counters.result_waits);
    try testing.expectEqual(@as(u32, 1), b.st.limits().held);
    try testing.expectEqual(@as(u32, 20_000), b.st.limits().held_bytes);
    try testing.expectEqual(@as(u64, 0), b.st.counters.limit_finished);
    // A batch without a release changes nothing.
    acts = try b.tick(&.{});
    try testing.expectEqual(@as(u32, 1), b.st.limits().held);
    // A large execution ends: the small one moves to its region and gets the result.
    acts = try b.tick(&.{ok(large[0], "1")});
    try testing.expectEqual(@as(u32, 0), b.st.limits().held);
    try testing.expectEqual(@as(u32, 0), b.st.limits().held_bytes);
    if (replyTo(acts, 9) == null) acts = try b.tick(&.{});
    const reply = replyTo(acts, 9).?;
    try testing.expectEqual(@as(u32, 200), reply.aux);
    try testing.expectEqualStrings(result, reply.payload);
    try testing.expectEqual(@as(u64, 0), b.st.counters.limit_finished);
}

test "held: a start of a module that needs a larger region waits for one, and does not start in a smaller region" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var b = try Bed.init(arena.allocator(), 8, 1 << 20);
    // The first execution ends with a result of 20 KB: the module needs the second class.
    const first = (try b.start(1, 100)).?;
    var acts = try b.tick(&.{ok(first, try b.trigger(20_000))});
    if (replyTo(acts, 1) == null) acts = try b.tick(&.{});
    try testing.expectEqual(@as(u32, 200), replyTo(acts, 1).?.aux);
    // The next three starts take the three larger regions, also with a small trigger.
    var ids: [3]u64 = undefined;
    for (&ids, 2..) |*id, conn| id.* = (try b.start(conn, 100)).?;
    try testing.expectEqual([4]u32{ 0, 1, 1, 1 }, b.st.limits().regions_used);
    // The fourth waits, with free regions of the first class: its result
    // would find no region, and it would wait then with its work in flight.
    try testing.expect((try b.start(5, 100)) == null);
    try testing.expectEqual(@as(u32, 1), b.st.limits().held_starts);
    try testing.expectEqual(@as(u64, 0), b.st.counters.result_waits);
    // An execution ends: the start that waits runs.
    acts = try b.tick(&.{ok(ids[0], "1")});
    try testing.expectEqual(@as(u32, 0), b.st.limits().held_starts);
    try testing.expect(dispatched(try b.tick(&.{})) != null);
    try testing.expectEqual(@as(u64, 0), b.st.counters.limit_finished);
}

test "held: an execution that ends takes its waiting result out of the queue (release)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var b = try Bed.init(arena.allocator(), 8, 1 << 20);
    for ([_]u64{ 1, 2, 3 }) |conn| _ = (try b.start(conn, 10_000)).?;
    const small = (try b.start(9, 100)).?;
    _ = try b.tick(&.{ok(small, try b.trigger(20_000))});
    try testing.expectEqual(@as(u32, 1), b.st.limits().held);
    _ = try b.tick(&.{.{ .kind = .cancel, .exec_id = small }});
    try testing.expectEqual(@as(u32, 0), b.st.limits().held);
    try testing.expectEqual(@as(u32, 0), b.st.limits().held_bytes);
    try testing.expectEqual(@as(u32, 3), b.st.liveExecutions());
}

test "held: a result waits when the queue has room, and ends the execution at the limit when it is full" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    // Room for one entry.
    var b = try Bed.init(arena.allocator(), 1, 1 << 20);
    for ([_]u64{ 1, 2, 3 }) |conn| _ = (try b.start(conn, 10_000)).?;
    const one = (try b.start(8, 100)).?;
    const two = (try b.start(9, 100)).?;
    _ = try b.tick(&.{ok(one, try b.trigger(20_000))});
    try testing.expectEqual(@as(u32, 1), b.st.limits().held);
    const acts = try b.tick(&.{ok(two, try b.trigger(20_000))});
    try testing.expectEqual(@as(u32, 500), replyTo(acts, 9).?.aux);
    try testing.expectEqual(@as(u64, 1), b.st.counters.held_refused);
    try testing.expectEqual(@as(u64, 1), b.st.counters.limit_finished);
}
