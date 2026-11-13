//! Schedule triggers in the core: registration from META, due slots, the
//! once-per-slot rule and catch-up after downtime.
const std = @import("std");
const core = @import("core.zig");
const Asm = @import("asm.zig").Asm;
const Arena = @import("arena.zig").Arena;
const tz = @import("tz.zig");

const testing = std.testing;

/// `run(trigger) { return trigger }`.
fn echoModule(gpa: std.mem.Allocator, meta: []const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    a.beginFunc();
    try a.emit(.ret, 0, 0, 0, 0);
    try a.endFunc("run", 1, 1, 0);
    return a.finish();
}

const Harness = struct {
    st: core.State,
    scratch: Arena,

    fn init(a: std.mem.Allocator) !Harness {
        const cfg: core.Config = .{ .slots = 8, .region_counts = .{ 8, 2, 1, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 16, .max_timers = 16, .max_pending = 16, .max_actions = 64, .max_batch_events = 16, .module_bytes = 1 << 16, .natives_total = 1 << 10, .max_modules = 2, .max_routes = 2, .max_schedules = 4, .max_zones = 4 };
        return .{ .st = try core.State.init(a, cfg), .scratch = Arena.init(try a.alloc(u8, 1 << 20)) };
    }

    /// One shell tick: due schedules join the batch.
    fn tick(h: *Harness, now: i64, events: []const core.Event) ![]const core.Action {
        var evs: [16]core.Event = undefined;
        @memcpy(evs[0..events.len], events);
        const n = core.dueSchedules(&h.st, now, evs[events.len..]);
        h.scratch.reset();
        _ = try core.step(&h.st, now, evs[0 .. events.len + n], &h.scratch);
        return h.st.emitted();
    }

    fn finished(actions: []const core.Action, out: [][]const u8) usize {
        var n: usize = 0;
        for (actions) |a| if (a.kind == .finished) {
            out[n] = a.payload;
            n += 1;
        };
        return n;
    }
};

test "schedule fires once per slot and catches up once" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const mod = try echoModule(a, "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"x\"},{\"kind\":\"schedule\",\"cron\":\"*/10 * * * * *\",\"timezone\":\"UTC\"}]}");
    var h = try Harness.init(a);
    const t0: i64 = 1_800_000_000_000; // A multiple of 10 s.
    _ = try h.tick(t0 + 1, &.{.{ .kind = .load_module, .payload = mod }});
    try testing.expectEqual(@as(u32, 1), h.st.nschedules);
    try testing.expectEqual(@as(u16, 1), h.st.schedules[0].index);
    try testing.expectEqual(t0 + 10_000, h.st.schedules[0].next_at.?);

    var out: [4][]const u8 = undefined;
    try testing.expectEqual(@as(usize, 0), Harness.finished(try h.tick(t0 + 9_999, &.{}), &out));
    try testing.expectEqual(@as(usize, 1), Harness.finished(try h.tick(t0 + 10_050, &.{}), &out));
    try testing.expectEqualStrings("{\"scheduledAt\":1800000010000}", out[0]);
    // The same slot again (a client retry, a replayed event) changes nothing.
    const again: core.Event = .{ .kind = .schedule, .aux = 0, .seq = 1, .conn = @bitCast(t0 + 10_000) };
    try testing.expectEqual(@as(usize, 0), Harness.finished(try h.tick(t0 + 10_100, &.{again}), &out));
    try testing.expectEqual(core.LogMode.skip, h.st.log_modes[0]);
    // Downtime over five slots: one fire, for the latest missed slot.
    try testing.expectEqual(@as(usize, 1), Harness.finished(try h.tick(t0 + 65_000, &.{}), &out));
    try testing.expectEqualStrings("{\"scheduledAt\":1800000060000}", out[0]);
    try testing.expectEqual(t0 + 70_000, h.st.schedules[0].next_at.?);
    const o = try core.step(&h.st, t0 + 65_001, &.{}, &h.scratch);
    try testing.expectEqual(@as(?i64, t0 + 70_000), o.next_timer_ms);
}

test "schedule waits for its zone and replays the same fires" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const mod = try echoModule(a, "{\"triggers\":[{\"kind\":\"schedule\",\"every\":{\"unit\":\"days\",\"value\":1,\"atHour\":2,\"atMinute\":30},\"timezone\":\"America/New_York\"}]}");
    var zone_ev = try a.alloc(u8, "America/New_York\n".len + tz.test_new_york.len);
    @memcpy(zone_ev[0.."America/New_York\n".len], "America/New_York\n");
    @memcpy(zone_ev["America/New_York\n".len..], tz.test_new_york);
    // 2026-03-07 12:00 UTC. The next 02:30 does not exist (spring forward);
    // the npm package fires at 03:00 EDT, 2026-03-08 07:00 UTC.
    const t0: i64 = 1772884800000;
    var log: [8]struct { now: i64, ev: core.Event } = undefined;
    var nlog: usize = 0;
    var h = try Harness.init(a);
    _ = try h.tick(t0, &.{.{ .kind = .load_module, .payload = mod }});
    try testing.expect(h.st.schedules[0].next_at == null);
    _ = try h.tick(t0 + 1, &.{.{ .kind = .timezone, .payload = zone_ev }});
    try testing.expectEqual(@as(i64, 1772953200000), h.st.schedules[0].next_at.?);
    var due: [2]core.Event = undefined;
    const now = 1772953200000 + 500;
    try testing.expectEqual(@as(usize, 1), core.dueSchedules(&h.st, now, &due));
    log[nlog] = .{ .now = now, .ev = due[0] };
    nlog += 1;
    _ = try h.tick(now, &.{});
    const exec_after = h.st.next_exec;

    // A second core fed the same inputs reaches the same state.
    var r = try Harness.init(a);
    _ = try r.tick(t0, &.{.{ .kind = .load_module, .payload = mod }});
    _ = try r.tick(t0 + 1, &.{.{ .kind = .timezone, .payload = zone_ev }});
    r.scratch.reset();
    _ = try core.step(&r.st, log[0].now, &.{log[0].ev}, &r.scratch);
    try testing.expectEqual(exec_after, r.st.next_exec);
    try testing.expectEqual(h.st.schedules[0].next_at, r.st.schedules[0].next_at);
    try testing.expectEqual(@as(i64, 1773037800000), r.st.schedules[0].next_at.?);
}

test "a none-tier fire logged as a reserve moves the schedule" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const mod = try echoModule(a, "{\"durability\":\"none\",\"triggers\":[{\"kind\":\"schedule\",\"cron\":\"* * * * * *\"}]}");
    var h = try Harness.init(a);
    const t0: i64 = 1_800_000_000_000;
    _ = try h.tick(t0, &.{.{ .kind = .load_module, .payload = mod }});
    _ = try h.tick(t0 + 1000, &.{});
    try testing.expectEqual(core.LogMode.reserve, h.st.log_modes[0]);
    // Replay: the reserve event moves the schedule and the id, runs nothing.
    var r = try Harness.init(a);
    _ = try r.tick(t0, &.{.{ .kind = .load_module, .payload = mod }});
    r.scratch.reset();
    _ = try core.step(&r.st, t0 + 1000, &.{.{ .kind = .schedule, .aux = core.start_reserve_flag | r.st.modules[0].gen, .seq = 0, .conn = @bitCast(t0 + 1000) }}, &r.scratch);
    try testing.expectEqual(h.st.next_exec, r.st.next_exec);
    try testing.expectEqual(@as(u32, 0), r.st.liveExecutions());
    try testing.expectEqual(h.st.schedules[0].next_at, r.st.schedules[0].next_at);
}

/// A state with room for `max_zones` zones and 40 zones sent to it (the
/// Berlin TZif data under 40 names).
fn fortyZones(a: std.mem.Allocator, max_zones: u32) !core.State {
    const cfg: core.Config = .{ .slots = 4, .region_counts = .{ 4, 1, 1, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 4, .max_timers = 4, .max_pending = 4, .max_actions = 64, .max_batch_events = 64, .module_bytes = 1 << 14, .natives_total = 1 << 10, .max_modules = 1, .max_routes = 1, .max_schedules = 1, .max_zones = max_zones };
    var st = try core.State.init(a, cfg);
    const tzif = @embedFile("testdata/Europe_Berlin.tzif");
    var evs: [40]core.Event = undefined;
    for (&evs, 0..) |*e, i| {
        e.* = .{ .kind = .timezone, .payload = try std.fmt.allocPrint(a, "Test/Zone{d}\n{s}", .{ i, tzif }) };
    }
    var scratch = Arena.init(try a.alloc(u8, 1 << 20));
    _ = try core.step(&st, 1000, &evs, &scratch);
    return st;
}

fn offsetOf(a: std.mem.Allocator, st: *core.State, zone: []const u8) ![]const u8 {
    const ops = @import("ops.zig");
    const lib = @import("lib.zig");
    const value = @import("value.zig");
    var region_buf: [64 << 10]u8 align(8) = undefined;
    var region = @import("heap.zig").Region.init(&region_buf);
    var scratch = Arena.init(try a.alloc(u8, 1 << 16));
    var vm: ops.Vm = .{ .r = &region, .m = undefined, .scratch = &scratch, .env = .{
        .zones = st.zones[0..st.nzones],
        .zones_full = st.zones_full,
        .zones_cap = @intCast(st.zones.len),
    } };
    const id = lib.nativeId("Date.zoneOffset").?;
    const v = lib.callNative(&vm, id, &.{ try vm.newStr(zone), value.num(1_700_000_000_000) }) catch |e| {
        if (e != error.Throw) return e;
        const msg = vm.objGet(value.payload(vm.thrown), "message");
        return try a.dupe(u8, vm.str(msg));
    };
    return try std.fmt.allocPrint(a, "{d}", .{value.asNum(v)});
}

test "regression: more than 32 time zones load, and a full table says so (replays)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    // The default table holds the whole IANA database.
    var big = try fortyZones(a, (core.Config{}).max_zones);
    try testing.expect(core.hasZone(&big, "Test/Zone39"));
    try testing.expect(!big.zones_full);
    try testing.expectEqualStrings("60", try offsetOf(a, &big, "Test/Zone39"));
    try testing.expectEqualStrings("Invalid time zone specified: Nowhere/Else", try offsetOf(a, &big, "Nowhere/Else"));
    // A small table fills: zones after it are a named limit, not silently missing.
    var small = try fortyZones(a, 8);
    // UTC takes the first entry.
    try testing.expect(core.hasZone(&small, "Test/Zone6"));
    try testing.expect(!core.hasZone(&small, "Test/Zone7"));
    try testing.expect(small.zones_full);
    try testing.expectEqualStrings("Time zone Test/Zone7 is not loaded: the zone table is full (8 zones, raise --max-zones)", try offsetOf(a, &small, "Test/Zone7"));
}
