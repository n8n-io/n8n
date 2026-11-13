//! One shard's pipeline: gather events, run the core once, write the batch
//! to the log, sync when a tier needs it, then hand the actions to the I/O
//! layer. The simulation and the server both drive a shard through this.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const logfmt = core_lib.logfmt;
const Arena = core_lib.arena.Arena;
const sys = @import("sys.zig");

/// Where log bytes go. The server writes files; the simulation keeps bytes
/// in memory and can drop the unsynced tail to model a crash.
pub const LogSink = struct {
    ctx: *anyopaque,
    appendFn: *const fn (ctx: *anyopaque, bytes: []const u8) anyerror!void,
    syncFn: *const fn (ctx: *anyopaque) anyerror!void,

    pub fn append(l: LogSink, bytes: []const u8) !void {
        return l.appendFn(l.ctx, bytes);
    }
    pub fn sync(l: LogSink) !void {
        return l.syncFn(l.ctx);
    }
};

/// Snapshots of evicted executions, in one buffer reserved at startup.
/// The core keeps the bytes of parked snapshots (each rounded up to 8)
/// under `snap_bytes`, so after a compaction a new snapshot always fits.
/// Derived state: a replay of the log rebuilds it.
pub const SnapStore = struct {
    buf: []u8,
    /// Next free byte. Bytes below it are live or holes.
    tail: usize = 0,
    /// Bytes of live snapshots, rounded up to 8.
    live: usize = 0,
    index: std.AutoHashMapUnmanaged(u64, Loc) = .empty,
    max: u32,
    removals: u32 = 0,
    /// Scratch of compaction: the ids in buffer order.
    order: []u64,

    const Loc = struct { off: usize, len: u32 };

    pub fn init(gpa: std.mem.Allocator, bytes: u64, max: u32) !SnapStore {
        var st: SnapStore = .{ .buf = try core_lib.arena.reserve(gpa, u8, @intCast(bytes)), .max = max, .order = try core_lib.arena.reserve(gpa, u64, max) };
        try st.index.ensureTotalCapacity(gpa, max);
        return st;
    }

    pub fn get(st: *const SnapStore, id: u64) ?[]u8 {
        const l = st.index.get(id) orelse return null;
        return st.buf[l.off..][0..l.len];
    }

    pub fn contains(st: *const SnapStore, id: u64) bool {
        return st.index.contains(id);
    }

    pub fn count(st: *const SnapStore) u32 {
        return st.index.count();
    }

    pub fn put(st: *SnapStore, id: u64, bytes: []const u8) void {
        st.remove(id);
        const foot: usize = @intCast(core.snapFootprint(bytes.len));
        // The core checked the budget and the count.
        std.debug.assert(st.live + foot <= st.buf.len and st.index.count() < st.max);
        if (st.tail + foot > st.buf.len) st.compact();
        std.debug.assert(st.tail + foot <= st.buf.len);
        @memcpy(st.buf[st.tail..][0..bytes.len], bytes);
        st.index.putAssumeCapacity(id, .{ .off = st.tail, .len = @intCast(bytes.len) });
        st.tail += foot;
        st.live += foot;
        std.debug.assert(st.live <= st.tail);
    }

    pub fn remove(st: *SnapStore, id: u64) void {
        const kv = st.index.fetchRemove(id) orelse return;
        st.live -= @intCast(core.snapFootprint(kv.value.len));
        st.removals += 1;
        if (st.index.count() == 0) {
            sys.releasePages(st.buf[0..st.tail]);
            st.tail = 0;
        }
        // Tombstones make lookups slow: rebuild the table now and then.
        if (st.removals > st.max / 4) {
            st.index.rehash(std.hash_map.AutoContext(u64){});
            st.removals = 0;
        }
    }

    /// Move the live snapshots to the start of the buffer, in order.
    fn compact(st: *SnapStore) void {
        var n: usize = 0;
        var it = st.index.iterator();
        while (it.next()) |kv| : (n += 1) st.order[n] = kv.key_ptr.*;
        const Ctx = struct {
            index: *const std.AutoHashMapUnmanaged(u64, Loc),
            fn less(c: @This(), a: u64, b: u64) bool {
                return c.index.get(a).?.off < c.index.get(b).?.off;
            }
        };
        // Heap sort: no recursion and no extra memory.
        std.sort.heap(u64, st.order[0..n], Ctx{ .index = &st.index }, Ctx.less);
        var w: usize = 0;
        for (st.order[0..n]) |id| {
            const l = st.index.getPtr(id).?;
            std.debug.assert(l.off >= w);
            std.mem.copyForwards(u8, st.buf[w..][0..l.len], st.buf[l.off..][0..l.len]);
            l.off = w;
            w += @intCast(core.snapFootprint(l.len));
        }
        std.debug.assert(w == st.live);
        sys.releasePages(st.buf[w..st.tail]);
        st.tail = w;
    }
};

pub const Tick = struct {
    actions: []const core.Action,
    out: core.Output,
    /// The input batch is durable: it was synced in this tick.
    synced: bool,
    log_bytes: usize,
    /// The input events this batch took: a prefix. The rest wait for the
    /// next batch (see `tickSome`).
    consumed: usize = 0,
};

pub const Counters = struct {
    batches: u64 = 0,
    log_bytes: u64 = 0,
    log_appends: u64 = 0,
    syncs: u64 = 0,
    events: u64 = 0,
    actions: u64 = 0,
};

pub const Shard = struct {
    gpa: std.mem.Allocator,
    st: core.State,
    scratch: Arena,
    log: ?LogSink,
    log_buf: []u8,
    log_events: []core.Event,
    batch_events: std.ArrayList(core.Event),
    batch_seq: u64 = 0,
    /// Snapshots of evicted executions, by execution id.
    snaps: SnapStore,
    wakes: std.ArrayList(u64),
    unsynced: bool = false,
    replaying: bool = false,
    /// Print one line per schedule fire, for manual runs.
    log_fires: bool = false,
    /// `recover` keeps the executions that finished in the log (the
    /// simulation compares them).
    collect_finished: bool = false,
    counters: Counters = .{},

    pub fn init(gpa: std.mem.Allocator, cfg: core.Config, log: ?LogSink, scratch_bytes: usize, log_buf_bytes: usize) !Shard {
        var sh: Shard = .{
            .gpa = gpa,
            .st = try core.State.init(gpa, cfg),
            .scratch = Arena.init(try core_lib.arena.reserve(gpa, u8, scratch_bytes)),
            .log = log,
            .log_buf = try core_lib.arena.reserve(gpa, u8, log_buf_bytes),
            // Inputs, plus one logged static data change per slot (spec 9.7) and one
            // block of `none`-tier ids.
            .log_events = try core_lib.arena.reserve(gpa, core.Event, @as(usize, cfg.max_batch_events) + cfg.slots + 1),
            .batch_events = .empty,
            .snaps = try SnapStore.init(gpa, cfg.snap_bytes, cfg.max_parked),
            .wakes = .empty,
        };
        try sh.batch_events.ensureTotalCapacity(gpa, cfg.max_batch_events);
        try sh.wakes.ensureTotalCapacity(gpa, 1024);
        return sh;
    }

    /// True when events for this execution need its snapshot restored first.
    fn evicted(sh: *const Shard, exec_id: u64) bool {
        return exec_id != 0 and sh.st.by_exec.get(exec_id) == null and sh.snaps.contains(exec_id);
    }

    /// Run one batch. The returned actions and their payloads are valid
    /// until `endBatch`.
    /// Run one batch of all `events`. Callers that cannot keep events for
    /// the next batch use this; the server uses `tickSome`.
    pub fn tick(sh: *Shard, now_ms: i64, events: []const core.Event) !Tick {
        // Refuse before anything runs, so the caller still has every event.
        if (sh.prefixThatFits(events) < events.len) return error.TooManyEvents;
        const tk = try sh.tickSome(now_ms, events);
        std.debug.assert(tk.consumed == events.len);
        return tk;
    }

    fn batchCap(sh: *const Shard) usize {
        // The core logs at most this many events in a batch (the list may
        // have more capacity than asked for).
        return @min(sh.batch_events.capacity, sh.st.cfg.max_batch_events);
    }

    /// How many of `events` the next batch takes, after the restores of
    /// woken executions: each event needs its own slot and up to two
    /// restores (its execution, and the one a resume URL names).
    fn prefixThatFits(sh: *const Shard, events: []const core.Event) usize {
        const cap = sh.batchCap();
        var room = cap - @min(sh.wakes.items.len, cap);
        var n: usize = 0;
        while (n < events.len) : (n += 1) {
            const need = 1 + @as(usize, @intFromBool(sh.evicted(events[n].exec_id))) + @as(usize, @intFromBool(events[n].kind == .http_request));
            if (need > room) break;
            room -= need;
        }
        return n;
    }

    /// Run one batch of a prefix of `events`: as many as fit in the batch
    /// with the restores they need. A full batch is a limit: the caller
    /// keeps `events[consumed..]` for the next batch, and woken executions
    /// whose restores do not fit stay in `wakes`.
    pub fn tickSome(sh: *Shard, now_ms: i64, events: []const core.Event) !Tick {
        std.debug.assert(!sh.replaying);
        // The scratch of the last batch was released.
        std.debug.assert(sh.scratch.used == 0);
        const cap = sh.batchCap();
        const n = sh.prefixThatFits(events);
        sh.batch_events.clearRetainingCapacity();
        // Restores first: for woken timers and for events that target an
        // evicted execution. Wakes that do not fit wait.
        var kept: usize = 0;
        for (sh.wakes.items) |id| {
            if (sh.batch_events.items.len < cap) {
                sh.addRestore(id);
            } else {
                sh.wakes.items[kept] = id;
                kept += 1;
            }
        }
        sh.wakes.shrinkRetainingCapacity(kept);
        // The prefix of events whose restores fit too.
        for (events[0..n]) |ev| {
            if (sh.evicted(ev.exec_id)) sh.addRestore(ev.exec_id);
            if (ev.kind == .http_request) sh.restoreForResumeRoute(ev.payload);
        }
        for (events[0..n]) |ev| sh.batch_events.appendAssumeCapacity(ev);
        std.debug.assert(sh.batch_events.items.len <= cap);
        // Due schedule slots become input events of this batch, so the log
        // records each fire and a replay repeats it.
        const free = cap - sh.batch_events.items.len;
        const nsched = core.dueSchedules(&sh.st, now_ms, sh.batch_events.unusedCapacitySlice()[0..@min(free, 64)]);
        sh.batch_events.items.len += nsched;
        const evs = sh.batch_events.items;
        if (sh.log_fires) for (evs[evs.len - nsched ..]) |ev| {
            std.debug.print("schedule: module {d} trigger {d} slot {d}\n", .{ ev.aux, ev.seq, @as(i64, @bitCast(ev.conn)) });
        };

        const out = try core.step(&sh.st, now_ms, evs, &sh.scratch);
        sh.batch_seq += 1;
        sh.counters.batches += 1;
        sh.counters.events += evs.len;

        var log_bytes: usize = 0;
        var synced = false;
        if (sh.log != null and !sh.replaying) {
            log_bytes = try sh.writeLog(now_ms, evs);
            if (log_bytes > 0) sh.unsynced = true;
            if (sh.needsSync()) {
                try sh.syncLog();
                synced = true;
            }
        }
        // A restored execution no longer needs its snapshot. Its bytes left
        // the core's budget in this batch, so they go before new snapshots.
        for (evs) |ev| {
            if (ev.kind == .restore and sh.st.by_exec.get(ev.exec_id) != null) sh.dropSnap(ev.exec_id);
        }
        for (sh.st.emitted()) |a| {
            switch (a.kind) {
                .snapshot => sh.putSnap(a.exec_id, a.payload),
                .wake => if (sh.wakes.items.len < sh.wakes.capacity) sh.wakes.appendAssumeCapacity(a.exec_id),
                .finished => sh.dropSnap(a.exec_id),
                else => {},
            }
        }
        sh.counters.actions += sh.st.nactions;
        // Snapshots and parked executions agree.
        std.debug.assert(sh.snaps.live <= sh.snaps.buf.len and sh.snaps.count() <= sh.st.parkedCount() + sh.st.liveExecutions());
        return .{ .actions = sh.st.emitted(), .out = out, .synced = synced or sh.log == null, .log_bytes = log_bytes, .consumed = n };
    }

    /// The caller made room for it.
    fn addRestore(sh: *Shard, id: u64) void {
        const snap = sh.snaps.get(id) orelse return;
        for (sh.batch_events.items) |e| if (e.kind == .restore and e.exec_id == id) return;
        std.debug.assert(sh.batch_events.items.len < sh.batch_events.capacity);
        sh.batch_events.appendAssumeCapacity(.{ .kind = .restore, .exec_id = id, .payload = snap });
    }

    /// `POST /resume/<id>/<seq>` names an execution inside the payload.
    fn restoreForResumeRoute(sh: *Shard, payload: []const u8) void {
        const req = core.splitRequest(payload) orelse return;
        if (!std.mem.startsWith(u8, req.target, "/resume/")) return;
        const tail = req.target["/resume/".len..];
        const end = std.mem.indexOfAny(u8, tail, "/?") orelse tail.len;
        const id = core.parseExecId(tail[0..end]) orelse return;
        if (sh.evicted(id)) sh.addRestore(id);
    }

    fn needsSync(sh: *const Shard) bool {
        // A schedule fire is durable before any of its effects go out:
        // after a crash the slot neither fires twice nor is lost.
        for (sh.batch_events.items, 0..) |ev, i| {
            if (ev.kind == .schedule and sh.st.log_modes[i] != .skip) return true;
        }
        for (sh.st.emitted()) |a| {
            if (a.durability == .sync and (a.kind == .dispatch or a.kind == .reply or a.kind == .finished or a.kind == .attention)) return true;
            // A block of `none`-tier ids is durable before any of its ids go out.
            if (a.kind == .reserve_none) return true;
        }
        return false;
    }

    fn writeLog(sh: *Shard, now_ms: i64, evs: []const core.Event) !usize {
        var n: usize = 0;
        for (evs, 0..) |ev, i| {
            const mode = sh.st.log_modes[i];
            var e = ev;
            switch (mode) {
                .full => {},
                .header_only => e.payload = &.{},
                .reserve => e = if (ev.kind == .schedule)
                    .{ .kind = .schedule, .aux = ev.aux | core.start_reserve_flag, .seq = ev.seq, .conn = ev.conn }
                else
                    .{ .kind = .start, .aux = core.start_reserve_flag, .exec_id = ev.exec_id },
                .skip => continue,
            }
            sh.log_events[n] = e;
            n += 1;
        }
        // Static data changes of this batch: a replay applies them at the
        // end of the batch, as the core did (spec 9.7).
        for (sh.st.emitted()) |a| {
            const logged: ?core.Event = switch (a.kind) {
                .static_data => if (a.aux == 0) .{ .kind = .static_data, .payload = a.payload } else null,
                .reserve_none => .{ .kind = .reserve_none, .conn = a.conn },
                else => null,
            };
            const e = logged orelse continue;
            std.debug.assert(n < sh.log_events.len);
            sh.log_events[n] = e;
            n += 1;
        }
        if (n == 0) return 0;
        const size = logfmt.encodedSize(sh.log_events[0..n]);
        if (size > sh.log_buf.len) return error.BatchTooLarge;
        const rec = logfmt.encode(sh.log_buf, sh.batch_seq, now_ms, sh.log_events[0..n]);
        std.debug.assert(rec.len == size);
        try sh.log.?.append(rec);
        sh.counters.log_bytes += rec.len;
        sh.counters.log_appends += 1;
        return rec.len;
    }

    pub fn syncLog(sh: *Shard) !void {
        if (!sh.unsynced) return;
        try sh.log.?.sync();
        sh.counters.syncs += 1;
        sh.unsynced = false;
    }

    pub fn endBatch(sh: *Shard) void {
        sh.scratch.reset();
    }

    fn putSnap(sh: *Shard, id: u64, bytes: []const u8) void {
        sh.snaps.put(id, bytes);
    }

    fn dropSnap(sh: *Shard, id: u64) void {
        sh.snaps.remove(id);
    }

    /// Rebuild state from log bytes, then resolve effects in doubt. Actions
    /// produced during replay are dropped, except the snapshot store.
    pub fn recover(sh: *Shard, log_bytes: []const u8) !RecoverStats {
        sh.replaying = true;
        sh.st.replaying = true;
        defer {
            sh.replaying = false;
            sh.st.replaying = false;
        }
        var r: logfmt.Reader = .{ .bytes = log_bytes };
        var stats: RecoverStats = .{};
        // No log is written while replaying: its event buffer is free.
        const evbuf = sh.log_events;
        while (r.next()) |b| {
            const evs = try logfmt.decodeEvents(b, evbuf);
            // A restore is logged without its snapshot: fill it from the
            // snapshots this replay has produced.
            for (evs) |*e| {
                if (e.kind == .restore) e.payload = sh.snaps.get(e.exec_id) orelse &.{};
            }
            sh.wakes.clearRetainingCapacity();
            try sh.tickReplay(b.header.now_ms, evs, &stats);
            sh.endBatch();
            sh.batch_seq = b.header.batch_seq;
            stats.batches += 1;
        }
        stats.valid_bytes = r.pos;
        return stats;
    }

    fn tickReplay(sh: *Shard, now_ms: i64, evs: []const core.Event, stats: *RecoverStats) !void {
        _ = try core.step(&sh.st, now_ms, evs, &sh.scratch);
        for (evs) |ev| {
            if (ev.kind == .restore and sh.st.by_exec.get(ev.exec_id) != null) sh.dropSnap(ev.exec_id);
        }
        for (sh.st.emitted()) |a| {
            switch (a.kind) {
                .snapshot => sh.putSnap(a.exec_id, a.payload),
                .finished => {
                    sh.dropSnap(a.exec_id);
                    // Only the simulation keeps them: the server must not
                    // hold memory in proportion to the log.
                    if (sh.collect_finished) try stats.finished.append(sh.gpa, .{ .exec_id = a.exec_id, .status = a.aux, .payload = try sh.gpa.dupe(u8, a.payload) });
                },
                else => {},
            }
        }
    }

    /// After `recover`: one logged batch that resolves effects in doubt.
    pub fn resolveInDoubt(sh: *Shard, now_ms: i64) !Tick {
        const ev = [_]core.Event{.{ .kind = .recover }};
        return sh.tick(now_ms, &ev);
    }
};

pub const Finished = struct { exec_id: u64, status: u32, payload: []u8 };

pub const RecoverStats = struct {
    batches: u64 = 0,
    valid_bytes: usize = 0,
    /// Executions that finished in the replayed log. History writes are
    /// idempotent by execution id, so the shell writes them again: the
    /// original write may not have happened before the crash.
    finished: std.ArrayList(Finished) = .empty,
};

test "snapshot store compacts and never grows" {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    var st = try SnapStore.init(arena.allocator(), 4096, 64);
    var prng = std.Random.DefaultPrng.init(3);
    const rnd = prng.random();
    // A model of what the core allows: the live bytes stay in the budget.
    var lens: [64]u32 = @splat(0);
    var buf: [700]u8 = undefined;
    var i: u32 = 0;
    while (i < 20_000) : (i += 1) {
        const id = rnd.uintLessThan(u64, 64) + 1;
        if (st.contains(id) and rnd.boolean()) {
            st.remove(id);
            lens[id - 1] = 0;
            continue;
        }
        const len = 1 + rnd.uintLessThan(u32, buf.len);
        const old: usize = if (st.contains(id)) core.snapFootprint(lens[id - 1]) else 0;
        if (st.live - old + core.snapFootprint(len) > st.buf.len) continue;
        @memset(buf[0..len], @truncate(id *% 31 +% len));
        st.put(id, buf[0..len]);
        lens[id - 1] = len;
        // Every snapshot reads back intact.
        for (lens, 0..) |l, k| {
            if (l == 0) continue;
            const got = st.get(k + 1).?;
            try std.testing.expectEqual(l, got.len);
            for (got) |c| try std.testing.expectEqual(@as(u8, @truncate((k + 1) *% 31 +% l)), c);
        }
    }
    try std.testing.expect(st.tail <= st.buf.len);
}
