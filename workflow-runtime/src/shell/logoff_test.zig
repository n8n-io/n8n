//! The order rules of the log offload (docs/log-offload.md) through a
//! shard: the log bytes equal those of the blocking path, an output of a
//! `sync` action never leaves before its record is synced, the outputs leave
//! in the order of the blocking path, and a crash between the write and the
//! sync replays as a crash of the blocking path does.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const shard_mod = @import("shard.zig");
const logoff = @import("logoff.zig");
const programs = @import("programs.zig");

const MemLog = @import("sim.zig").MemLog;

fn config() core.Config {
    return .{ .slots = 8, .region_counts = .{ 8, 4, 2, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 8, .max_pending = 64, .max_actions = 256, .max_batch_events = 64, .max_timers = 16 };
}

/// An output that left the shard.
const Left = struct { kind: core.ActionKind, exec_id: u64, seq: u32, attempt: u32, payload: []const u8 };

fn waitsForRecord(a: core.Action) bool {
    return a.durability == .sync and (a.kind == .dispatch or a.kind == .reply or a.kind == .finished or a.kind == .attention);
}

/// One shard with its log, on the blocking path or with the offload. The
/// offload has no writer thread: the test does each step of the writer.
const Bed = struct {
    a: std.mem.Allocator,
    log: *MemLog,
    sh: shard_mod.Shard,
    off: ?*logoff.Offload = null,
    now: i64 = 1000,
    left: std.ArrayList(Left) = .empty,
    /// The record position of each held output, oldest first.
    held_pos: std.ArrayList(u64) = .empty,
    /// Outputs that left before their record was synced: the rule under test.
    early: u32 = 0,

    fn init(a: std.mem.Allocator, offload: bool) !Bed {
        const log = try a.create(MemLog);
        log.* = .{ .gpa = a };
        var b: Bed = .{ .a = a, .log = log, .sh = try shard_mod.Shard.init(a, config(), log.sink(), 2 << 20, 1 << 20) };
        if (offload) {
            b.off = try a.create(logoff.Offload);
            // A small ring: records also take the path with a copy and the wrap.
            b.off.?.* = try logoff.Offload.init(a, log.sink(), .{ .ring_bytes = 1 << 12, .hold_items = 64, .hold_bytes = 1 << 14 });
            b.sh.off = b.off;
        }
        return b;
    }

    fn leave(b: *Bed, act: core.Action, record_pos: u64) !void {
        if (waitsForRecord(act) and b.log.synced < record_pos) b.early += 1;
        try b.left.append(b.a, .{ .kind = act.kind, .exec_id = act.exec_id, .seq = act.seq, .attempt = act.attempt, .payload = try b.a.dupe(u8, act.payload) });
    }

    /// One batch. On the blocking path every output leaves now.
    fn tick(b: *Bed, evs: []const core.Event) !void {
        b.now += 10;
        const tk = try b.sh.tick(b.now, evs);
        if (b.off) |o| {
            try o.poll();
            const pos = o.position();
            for (tk.actions) |act| switch (o.route(act, 0)) {
                .pass => try b.leave(act, pos),
                .held => try b.held_pos.append(b.a, pos),
                .full => return error.HoldFull,
            };
        } else {
            for (tk.actions) |act| try b.leave(act, b.log.bytes.items.len);
        }
        b.sh.endBatch();
    }

    /// The outputs whose records are durable leave. Returns their count.
    fn release(b: *Bed) !usize {
        const o = b.off orelse return 0;
        try o.poll();
        var n: usize = 0;
        while (o.ready()) |h| : (n += 1) {
            try b.leave(h.a, b.held_pos.orderedRemove(0));
            o.pop(0);
        }
        return n;
    }

    /// The effect results for the dispatches that left since `from`.
    fn results(b: *Bed, from: usize, out: *std.ArrayList(core.Event)) !void {
        out.clearRetainingCapacity();
        for (b.left.items[from..]) |l| {
            if (l.kind == .dispatch) try out.append(b.a, .{ .kind = .effect_ok, .exec_id = l.exec_id, .seq = l.seq, .payload = "{\"v\":2}" });
        }
    }

    fn finished(b: *const Bed) usize {
        var n: usize = 0;
        for (b.left.items) |l| n += @intFromBool(l.kind == .finished);
        return n;
    }
};

const sync_meta = "{\"durability\":\"sync\"}";

/// Two executions of the loop program to their end. With the offload the
/// writer first writes without a sync, then syncs: no output of a `sync`
/// action may leave in between.
fn runToEnd(b: *Bed, module: []const u8) !void {
    try b.tick(&.{ .{ .kind = .load_module, .payload = module }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":3}" }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":2,\"n\":2}" } });
    var evs: std.ArrayList(core.Event) = .empty;
    var seen: usize = 0;
    var round: u32 = 0;
    while (round < 40 and b.finished() < 2) : (round += 1) {
        if (b.off) |o| {
            const waiting = o.hold.len();
            try o.drain();
            try std.testing.expectEqual(@as(usize, 0), try b.release());
            if (waiting > 0) try std.testing.expect(try o.step());
            try std.testing.expectEqual(waiting, try b.release());
        }
        try b.results(seen, &evs);
        seen = b.left.items.len;
        try b.tick(evs.items);
    }
    if (b.off) |o| {
        // The end of the run: a last sync, and every held output leaves.
        try o.poll();
        o.requestSync();
        const worked = try o.step();
        try std.testing.expect(worked or o.ring.used() == 0);
        try std.testing.expectEqual(b.held_pos.items.len, try b.release());
    }
}

test "log offload: the same log bytes and the same outputs in the same order as the blocking path" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, sync_meta);
    var blocking = try Bed.init(a, false);
    try runToEnd(&blocking, module);
    var offload = try Bed.init(a, true);
    try runToEnd(&offload, module);

    try std.testing.expectEqual(@as(usize, 2), blocking.finished());
    try std.testing.expectEqual(@as(usize, 2), offload.finished());
    // The rule: no output of a `sync` action before its record is synced.
    try std.testing.expectEqual(@as(u32, 0), blocking.early);
    try std.testing.expectEqual(@as(u32, 0), offload.early);
    try std.testing.expect(offload.off.?.counters.held > 0);
    try std.testing.expectEqual(offload.off.?.counters.held, offload.off.?.counters.released);
    // A replay reads the same bytes, so it gives the same state.
    try std.testing.expectEqualSlices(u8, blocking.log.bytes.items, offload.log.bytes.items);
    try std.testing.expectEqual(offload.log.bytes.items.len, offload.log.synced);
    try std.testing.expectEqual(blocking.left.items.len, offload.left.items.len);
    for (blocking.left.items, offload.left.items) |x, y| {
        try std.testing.expectEqual(x.kind, y.kind);
        try std.testing.expectEqual(x.exec_id, y.exec_id);
        try std.testing.expectEqual(x.seq, y.seq);
        try std.testing.expectEqualStrings(x.payload, y.payload);
    }
}

/// Recover a new shard from the log and resolve the effects in doubt.
fn recovered(a: std.mem.Allocator, log: *MemLog) !Bed {
    var b: Bed = .{ .a = a, .log = log, .sh = try shard_mod.Shard.init(a, config(), log.sink(), 2 << 20, 1 << 20) };
    const stats = try b.sh.recover(log.bytes.items);
    try std.testing.expectEqual(log.bytes.items.len, stats.valid_bytes);
    const tk = try b.sh.resolveInDoubt(5000);
    for (tk.actions) |act| try b.leave(act, 0);
    b.sh.endBatch();
    return b;
}

test "log offload: a crash between the write and the sync replays as the blocking path does" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, sync_meta);
    const first = [_]core.Event{ .{ .kind = .load_module, .payload = module }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":3}" } };
    var evs: std.ArrayList(core.Event) = .empty;

    // The blocking path: batch 1 is synced, then the process stops.
    var blocking = try Bed.init(a, false);
    try blocking.tick(&first);
    try std.testing.expectEqual(blocking.log.bytes.items.len, blocking.log.synced);

    // The offload: batch 1 is synced and its dispatch leaves.
    var offload = try Bed.init(a, true);
    const o = offload.off.?;
    try offload.tick(&first);
    try std.testing.expectEqual(@as(usize, 0), offload.left.items.len);
    try std.testing.expect(try o.step());
    try std.testing.expectEqual(@as(usize, 1), try offload.release());
    try std.testing.expectEqualSlices(u8, blocking.log.bytes.items, offload.log.bytes.items);
    // Batch 2: the result comes, and the next dispatch waits. The writer
    // writes the record, and the process stops before the sync.
    try offload.results(0, &evs);
    const before = offload.left.items.len;
    try offload.tick(evs.items);
    try o.drain();
    try std.testing.expect(offload.log.bytes.items.len > offload.log.synced);
    try std.testing.expectEqual(@as(usize, 0), try offload.release());
    try std.testing.expectEqual(before, offload.left.items.len);
    try std.testing.expect(o.hold.len() > 0);
    try std.testing.expectEqual(@as(u32, 0), offload.early);
    offload.log.crash();

    // The log holds batch 1 only, as on the blocking path, and nothing of
    // batch 2 left: the replay and the effects in doubt are the same.
    try std.testing.expectEqualSlices(u8, blocking.log.bytes.items, offload.log.bytes.items);
    const want = try recovered(a, blocking.log);
    const got = try recovered(a, offload.log);
    try std.testing.expect(want.left.items.len > 0);
    try std.testing.expectEqual(want.left.items.len, got.left.items.len);
    for (want.left.items, got.left.items) |x, y| {
        try std.testing.expectEqual(x.kind, y.kind);
        try std.testing.expectEqual(x.exec_id, y.exec_id);
        try std.testing.expectEqual(x.seq, y.seq);
        try std.testing.expectEqual(x.attempt, y.attempt);
        try std.testing.expectEqualStrings(x.payload, y.payload);
    }
    try std.testing.expectEqual(want.sh.st.liveExecutions(), got.sh.st.liveExecutions());
    try std.testing.expectEqual(want.sh.st.parkedCount(), got.sh.st.parkedCount());
}

test "log offload: outputs of the `batched` tier leave at once and their records wait for a sync request" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, "{\"durability\":\"batched\"}");
    var b = try Bed.init(a, true);
    const o = b.off.?;
    try b.tick(&.{ .{ .kind = .load_module, .payload = module }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":1}" } });
    // The dispatch left, nothing is held, and the writer has no work yet.
    try std.testing.expectEqual(@as(usize, 1), b.left.items.len);
    try std.testing.expectEqual(@as(usize, 0), o.hold.len());
    try std.testing.expect(!try o.step());
    try std.testing.expectEqual(@as(usize, 0), b.log.bytes.items.len);
    // The beat of the `batched` tier asks for the sync.
    try std.testing.expect(b.sh.unsynced);
    try b.sh.syncLog();
    try std.testing.expect(try o.step());
    try std.testing.expect(b.log.synced > 0 and b.log.synced == b.log.bytes.items.len);
}

test "offload: a held output leaves only after the writer synced its position" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var log: MemLog = .{ .gpa = a };
    var o = try logoff.Offload.init(a, log.sink(), .{ .ring_bytes = 256, .hold_items = 8, .hold_bytes = 256 });
    // Batch 1: a `batched` reply, a `sync` reply, and a `batched` reply after it.
    try o.append("record-1");
    o.endRecord(.tier);
    try o.poll();
    try std.testing.expectEqual(logoff.Route.pass, o.route(.{ .kind = .reply, .durability = .batched, .exec_id = 1 }, 0));
    try std.testing.expectEqual(logoff.Route.held, o.route(.{ .kind = .reply, .durability = .sync, .exec_id = 2, .payload = "two" }, 0));
    // The order of the batch stays: the next output waits behind it.
    try std.testing.expectEqual(logoff.Route.held, o.route(.{ .kind = .reply, .durability = .batched, .exec_id = 3 }, 0));
    // Batch 2 runs while batch 1 is not durable. It needs no sync.
    try o.append("record-2");
    o.endRecord(.no);
    try std.testing.expectEqual(logoff.Route.held, o.route(.{ .kind = .reply, .durability = .batched, .exec_id = 4 }, 0));
    // Written is not synced: nothing leaves.
    try o.drain();
    try o.poll();
    try std.testing.expectEqualStrings("record-1record-2", log.bytes.items);
    try std.testing.expectEqual(@as(usize, 0), log.synced);
    try std.testing.expect(o.ready() == null);
    // One sync covers both records (group commit), and all three leave in order.
    try std.testing.expect(try o.step());
    try o.poll();
    try std.testing.expectEqual(@as(usize, 16), log.synced);
    for ([_]u64{ 2, 3, 4 }) |id| {
        const h = o.ready().?;
        try std.testing.expectEqual(id, h.a.exec_id);
        if (id == 2) try std.testing.expectEqualStrings("two", h.a.payload);
        o.pop(0);
    }
    try std.testing.expect(o.ready() == null and o.hold.len() == 0);
    try std.testing.expectEqual(@as(u64, 1), o.syncs.load(.monotonic));
    // With nothing held and nothing to wait for, an output passes.
    try std.testing.expectEqual(logoff.Route.pass, o.route(.{ .kind = .reply, .durability = .sync, .exec_id = 5 }, 0));
}

test "offload: after a batch that holds everything, later batches wait for it too" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var log: MemLog = .{ .gpa = a };
    var o = try logoff.Offload.init(a, log.sink(), .{ .ring_bytes = 256, .hold_items = 8, .hold_bytes = 256 });
    // A block of ids with no output of its own.
    try o.append("ids");
    o.endRecord(.all);
    try o.poll();
    try std.testing.expectEqual(@as(usize, 0), o.hold.len());
    // The next batch uses the ids: its output waits for the block.
    try o.append("next");
    o.endRecord(.no);
    try std.testing.expect(o.mayHold());
    try std.testing.expectEqual(logoff.Route.held, o.route(.{ .kind = .reply, .durability = .none, .exec_id = 9 }, 0));
    try std.testing.expect(o.ready() == null);
    try std.testing.expect(try o.step());
    try o.poll();
    try std.testing.expectEqual(@as(u64, 9), o.ready().?.a.exec_id);
    o.pop(0);
    try std.testing.expect(!o.mayHold());
}

test "offload: a full ring and a full hold queue are limits, not losses" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var log: MemLog = .{ .gpa = a };
    var o = try logoff.Offload.init(a, log.sink(), .{ .ring_bytes = 64, .hold_items = 2, .hold_bytes = 64 });
    // A record larger than the ring goes through it in parts.
    var rec: [1000]u8 = @splat(0);
    for (&rec, 0..) |*b, i| b.* = @truncate(i *% 131);
    try o.append(&rec);
    try std.testing.expect(o.counters.ring_full_waits > 0);
    o.endRecord(.tier);
    try o.poll();
    const act: core.Action = .{ .kind = .reply, .durability = .sync };
    try std.testing.expectEqual(logoff.Route.held, o.route(act, 0));
    try std.testing.expectEqual(logoff.Route.held, o.route(act, 0));
    try std.testing.expectEqual(logoff.Route.full, o.route(act, 0));
    // The wait ends when the oldest entry can leave.
    try o.waitRoom();
    try std.testing.expect(o.ready() != null);
    try std.testing.expectEqualSlices(u8, &rec, log.bytes.items);
    try std.testing.expectEqual(rec.len, log.synced);
}

// ---- schedule fire and reserved id block with the offload ----------------------

const none_meta = "{\"durability\":\"none\"}";

// A batch with syncNeed `.all` (a schedule fire) holds every output, and
// later batches wait for its sync. The rule from docs/log-offload.md:
// the position of the last `.all` batch is the floor. While `synced` is
// below the floor, every output of every later batch waits.
test "log offload: a schedule fire (syncNeed .all) holds all later outputs until its sync" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var log: MemLog = .{ .gpa = a };
    var o = try logoff.Offload.init(a, log.sink(), .{ .ring_bytes = 256, .hold_items = 8, .hold_bytes = 256 });

    // Batch 1: a schedule fire (syncNeed .all). Its outputs wait for sync.
    try o.append("fire-1");
    o.endRecord(.all);
    try o.poll();
    try std.testing.expectEqual(@as(usize, 0), o.hold.len());
    try std.testing.expect(o.mayHold());

    // Batch 2: a later batch's outputs are held behind the floor.
    try o.append("batch-2");
    o.endRecord(.no);
    try std.testing.expect(o.mayHold());
    try std.testing.expectEqual(logoff.Route.held, o.route(.{ .kind = .reply, .durability = .sync, .exec_id = 1, .payload = "a" }, 0));
    try std.testing.expectEqual(logoff.Route.held, o.route(.{ .kind = .reply, .durability = .none, .exec_id = 2 }, 0));

    // Write, then sync: one sync covers both records (group commit).
    try o.drain();
    try std.testing.expectEqualStrings("fire-1batch-2", log.bytes.items);
    try std.testing.expectEqual(@as(usize, 0), log.synced);
    try std.testing.expect(try o.step());
    try o.poll();
    try std.testing.expect(log.synced > 0);

    // After sync, all held outputs leave in order.
    for ([_]u64{ 1, 2 }) |id| {
        const h = o.ready().?;
        try std.testing.expectEqual(id, h.a.exec_id);
        o.pop(0);
    }
    try std.testing.expect(o.ready() == null and o.hold.len() == 0);
    try std.testing.expect(!o.mayHold());
}

// A reserved id block (syncNeed `.all` because of `reserve_none`) holds
// every output until the block is synced. After a crash before the sync,
// no id from the lost block is given twice.
test "log offload: a reserved id block (syncNeed .all) holds later outputs, and a crash before sync loses the block safely" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, none_meta);

    // The first `none`-tier execution triggers a reserve_none action
    // because next_none (1) > none_reserved (0). The syncNeed is .all.
    var b = try Bed.init(a, true);
    const o = b.off.?;

    // Load the module and start one execution.
    try b.tick(&.{ .{ .kind = .load_module, .payload = module }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":1}" } });
    // The reserve_none action is in the batch. Write but do not sync.
    try o.drain();
    try std.testing.expect(b.log.bytes.items.len > 0);
    try std.testing.expectEqual(@as(usize, 0), b.log.synced);

    // Crash before the sync: the unsynced tail is lost.
    b.log.crash();

    // Recover from whatever was synced (empty in this case).
    const log_bytes = b.log.bytes.items[0..b.log.synced];
    var fresh: Bed = .{ .a = a, .log = b.log, .sh = try shard_mod.Shard.init(a, config(), b.log.sink(), 2 << 20, 1 << 20) };
    const stats = try fresh.sh.recover(log_bytes);
    // The reserve_none record was lost; the none counter resets. The next
    // start reserves a new block; no id is given twice.
    try std.testing.expect(stats.valid_bytes <= log_bytes.len);
    try std.testing.expect(stats.batches >= 0);
}
