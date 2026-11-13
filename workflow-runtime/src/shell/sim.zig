//! Seeded crash simulation. A deterministic "world" plays the external
//! services: it completes effects after random delays, in random order, and
//! remembers which effects it applied. The harness kills the shard at random
//! points, recovers it from the synced log, and checks that every execution
//! ends with the same result as in a run with no crashes, and that no effect
//! was applied twice.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const shard_mod = @import("shard.zig");
const programs = @import("programs.zig");
const Shard = shard_mod.Shard;

pub const Options = struct {
    executions: u32 = 40,
    crash_per_mille: u32 = 30,
    max_ticks: u32 = 20_000,
    tick_ms: i64 = 100,
    /// Slots of the every-second schedule up to this many ms after the start
    /// are compared with the reference run.
    schedule_window_ms: i64 = 10_000,
    /// Every this many executions, one starts as a manual run of a loaded
    /// workflow (spec 9.1) instead of by module index.
    manual_every: u32 = 3,
};

/// Two versions of the workflow that the simulation loads, replaces and
/// unloads while its executions run. Both run the approval program.
pub const WorkflowVersions = [2][]const u8;

pub const Report = struct {
    crashes: u32 = 0,
    ticks: u32 = 0,
    finished: u32 = 0,
    double_applied: u32 = 0,
    attention: u32 = 0,
    redispatched: u32 = 0,
    /// Schedule slots in the window that finished.
    fires: u32 = 0,
};

/// The in-memory log. `synced` marks what survives a crash.
const MemLog = struct {
    bytes: std.ArrayList(u8) = .empty,
    synced: usize = 0,
    gpa: std.mem.Allocator,

    fn append(ctx: *anyopaque, b: []const u8) anyerror!void {
        const l: *MemLog = @ptrCast(@alignCast(ctx));
        try l.bytes.appendSlice(l.gpa, b);
    }
    fn sync(ctx: *anyopaque) anyerror!void {
        const l: *MemLog = @ptrCast(@alignCast(ctx));
        l.synced = l.bytes.items.len;
    }
    fn sink(l: *MemLog) shard_mod.LogSink {
        return .{ .ctx = l, .appendFn = append, .syncFn = sync };
    }
    fn crash(l: *MemLog) void {
        l.bytes.shrinkRetainingCapacity(l.synced);
    }
};

const Delivery = struct { at: i64, ev: core.Event, durable: bool };

/// External services. Results are a pure function of the request, so a run
/// with crashes must see the same results as one without.
const World = struct {
    gpa: std.mem.Allocator,
    rng: std.Random.DefaultPrng,
    /// Idempotency key -> stored result, for effects the world applied.
    applied: std.StringHashMap([]const u8),
    /// (step name ++ args) -> times applied.
    times: std.StringHashMap(u32),
    inflight: std.ArrayList(Delivery) = .empty,
    approvals_sent: std.StringHashMap(void),

    fn init(gpa: std.mem.Allocator, seed: u64) World {
        return .{
            .gpa = gpa,
            .rng = std.Random.DefaultPrng.init(seed),
            .applied = std.StringHashMap([]const u8).init(gpa),
            .times = std.StringHashMap(u32).init(gpa),
            .approvals_sent = std.StringHashMap(void).init(gpa),
        };
    }

    fn hash(b: []const u8) u64 {
        return std.hash.Wyhash.hash(7, b);
    }

    fn dispatch(w: *World, now: i64, step_name: []const u8, a: core.Action) !void {
        const key = try w.gpa.dupe(u8, &a.key);
        const ident = try std.mem.concat(w.gpa, u8, &.{ step_name, "|", a.payload });
        const h = hash(ident);
        const delay: i64 = @intCast(w.rng.random().uintLessThan(u32, 400));
        if (a.effect_kind == .approval) {
            // A person answers later; the request survives crashes.
            // A repeated request gets the same answer again.
            try w.approvals_sent.put(key, {});
            const body = if (h % 2 == 0) "{\"approved\":true}" else "{\"approved\":false}";
            try w.inflight.append(w.gpa, .{ .at = now + 500 + delay, .ev = .{ .kind = .effect_ok, .exec_id = a.exec_id, .seq = a.seq, .payload = body }, .durable = true });
            return;
        }
        const fail = std.mem.eql(u8, step_name, "Flaky") and h % 3 == 0;
        // A failed call changes nothing, so the service does not record it.
        // An idempotent API returns its stored result for a repeated key.
        const result = if (fail) "" else if (a.idempotent) (w.applied.get(key) orelse try w.apply(key, ident, h)) else try w.apply(key, ident, h);
        try w.inflight.append(w.gpa, .{ .at = now + delay, .ev = .{ .kind = if (fail) .effect_err else .effect_ok, .exec_id = a.exec_id, .seq = a.seq, .payload = if (fail) "flaky failure" else result }, .durable = false });
    }

    fn apply(w: *World, key: []const u8, ident: []const u8, h: u64) ![]const u8 {
        const gop = try w.times.getOrPut(ident);
        if (!gop.found_existing) gop.value_ptr.* = 0;
        gop.value_ptr.* += 1;
        const result = try std.fmt.allocPrint(w.gpa, "{{\"v\":{d}}}", .{h % 1000});
        try w.applied.put(key, result);
        return result;
    }

    /// Deliveries due by `now`, in order. Removes them from flight. Durable
    /// ones (a person's answer) also go to `resend` until they are synced.
    fn due(w: *World, now: i64, out: *std.ArrayList(core.Event), resend: *std.ArrayList(core.Event)) !void {
        var i: usize = 0;
        while (i < w.inflight.items.len) {
            if (w.inflight.items[i].at <= now) {
                try out.append(w.gpa, w.inflight.items[i].ev);
                if (w.inflight.items[i].durable) try resend.append(w.gpa, w.inflight.items[i].ev);
                _ = w.inflight.orderedRemove(i);
            } else i += 1;
        }
    }

    /// A crash loses responses on open connections, not human answers.
    fn crash(w: *World) void {
        var i: usize = 0;
        while (i < w.inflight.items.len) {
            if (!w.inflight.items[i].durable) _ = w.inflight.orderedRemove(i) else i += 1;
        }
    }
};

fn simConfig() core.Config {
    return .{
        .slots = 256,
        .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 },
        .region_counts = .{ 256, 16, 4, 2 },
        .max_parked = 1024,
        .max_timers = 1024,
        .max_pending = 4096,
        .max_actions = 8192,
        .max_batch_events = 2048,
        .module_bytes = 1 << 20,
        .natives_total = 1 << 14,
        .max_modules = 16,
        .max_routes = 4,
    };
}

pub const Outcome = struct {
    results: std.AutoHashMap(u32, []const u8),
    /// Finished schedule executions by slot.
    fired: std.AutoHashMap(i64, []const u8),
    report: Report,
};

/// One simulated run. With `crash_per_mille = 0` it is the reference run.
pub fn runOnce(gpa: std.mem.Allocator, seed: u64, opts: Options, modules: []const []const u8, wf: WorkflowVersions) !Outcome {
    var log: MemLog = .{ .gpa = gpa };
    var world = World.init(gpa, seed);
    var crash_rng = std.Random.DefaultPrng.init(seed ^ 0xC0FFEE);
    const cr = crash_rng.random();
    var report: Report = .{};
    var results = std.AutoHashMap(u32, []const u8).init(gpa);
    var fired = std.AutoHashMap(i64, []const u8).init(gpa);
    const sink: Sink = .{ .results = &results, .fired = &fired };

    var box = try ShardBox.create(gpa, log.sink());
    defer box.destroy();
    var sh = &box.sh;

    // Events to deliver next tick.
    var outbox: std.ArrayList(core.Event) = .empty;
    // Delivered but not yet durable. A client re-sends them after a crash.
    var unacked: std.ArrayList(core.Event) = .empty;
    for (modules) |m| try outbox.append(gpa, .{ .kind = .load_module, .payload = m });
    try outbox.append(gpa, .{ .kind = .load_workflow, .payload = try workflowPayload(gpa, "v1", wf[0]) });
    // The last module is the schedule; webhook-style starts go to the others.
    const nstart: u32 = @intCast(modules.len - 1);
    var c: u32 = 0;
    while (c < opts.executions) : (c += 1) {
        const trig = try std.fmt.allocPrint(gpa, "{{\"cid\":{d},\"n\":3}}", .{c});
        if (opts.manual_every > 0 and c % opts.manual_every == opts.manual_every - 1) {
            // n8n gives the id of a manual run.
            const payload = try std.fmt.allocPrint(gpa, "sim\n\n{s}", .{trig});
            try outbox.append(gpa, .{ .kind = .manual, .exec_id = core.parseExecId(try std.fmt.allocPrint(gpa, "{d}", .{1000 + c})).?, .payload = payload });
            continue;
        }
        try outbox.append(gpa, .{ .kind = .start, .aux = c % nstart, .payload = trig });
    }
    // Workflow changes while executions run: replace, replace back, unload.
    const changes = [_]struct { tick: u32, kind: core.EventKind, payload: []const u8 }{
        .{ .tick = 15, .kind = .load_workflow, .payload = try workflowPayload(gpa, "v2", wf[1]) },
        .{ .tick = 60, .kind = .load_workflow, .payload = try workflowPayload(gpa, "v3", wf[0]) },
        .{ .tick = 150, .kind = .unload_workflow, .payload = "sim" },
    };

    const start_ms: i64 = 1_000_000;
    var now: i64 = start_ms;
    // Run past the window, so slots in it can finish after crashes.
    const run_until = start_ms + opts.schedule_window_ms + 10_000;
    var batch: std.ArrayList(core.Event) = .empty;
    var tick: u32 = 0;
    while (tick < opts.max_ticks and (results.count() < opts.executions or now < run_until)) : (tick += 1) {
        now += opts.tick_ms;
        for (changes) |ch| if (ch.tick == tick) try outbox.append(gpa, .{ .kind = ch.kind, .payload = ch.payload });
        batch.clearRetainingCapacity();
        try batch.appendSlice(gpa, outbox.items);
        var answers: std.ArrayList(core.Event) = .empty;
        try world.due(now, &batch, &answers);

        // Crash point: before the batch reaches the core.
        if (cr.uintLessThan(u32, 1000) < opts.crash_per_mille) {
            try outbox.appendSlice(gpa, answers.items);
            try outbox.insertSlice(gpa, 0, unacked.items);
            unacked.clearRetainingCapacity();
            try crash(gpa, &box, &log, &world, &report, sink, now, &outbox);
            sh = &box.sh;
            continue;
        }
        outbox.clearRetainingCapacity();
        const tk = try sh.tick(now, batch.items);
        // Starts and operator decisions are re-sent by their client until
        // they are durable. Effect results are lost with their connection.
        for (batch.items) |e| switch (e.kind) {
            .start, .load_module, .operator, .load_workflow, .unload_workflow, .manual => try unacked.append(gpa, e),
            else => {},
        };
        try unacked.appendSlice(gpa, answers.items);
        if (tk.synced) unacked.clearRetainingCapacity();
        // Crash point: after the log write, before or while acting.
        const crash_now = cr.uintLessThan(u32, 1000) < opts.crash_per_mille;
        const act_limit = if (crash_now) cr.uintLessThan(usize, tk.actions.len + 1) else tk.actions.len;
        for (tk.actions[0..act_limit]) |a| try perform(gpa, sh, &world, &report, sink, &outbox, now, a);
        sh.endBatch();
        try core.checkInvariants(&sh.st);
        if (crash_now) {
            try outbox.insertSlice(gpa, 0, unacked.items);
            unacked.clearRetainingCapacity();
            try crash(gpa, &box, &log, &world, &report, sink, now, &outbox);
            sh = &box.sh;
        }
    }
    report.ticks = tick;
    report.finished = results.count();
    // The three workflow loads happened and the unload too, crashes or not.
    if (sh.st.next_gen - 1 != modules.len + 3 or sh.st.liveWorkflow("sim") != null) return error.SimWorkflowChangesLost;
    var fit = fired.keyIterator();
    while (fit.next()) |at| {
        if (at.* <= start_ms + opts.schedule_window_ms) report.fires += 1;
    }
    if (opts.crash_per_mille > 0 and results.count() < opts.executions and debug_dump) dumpState(sh, &world);
    var it = world.times.valueIterator();
    while (it.next()) |n| {
        if (n.* > 1) report.double_applied += 1;
    }
    return .{ .results = results, .fired = fired, .report = report };
}

pub var debug_dump = false;

fn workflowPayload(gpa: std.mem.Allocator, version: []const u8, bytes: []const u8) ![]u8 {
    return std.fmt.allocPrint(gpa, "{{\"workflowId\":\"sim\",\"versionId\":\"{s}\",\"active\":true}}\n{s}", .{ version, bytes });
}

fn dumpState(sh: *Shard, world: *World) void {
    const st = &sh.st;
    std.debug.print("-- loaded executions --\n", .{});
    for (st.slot_state, 0..) |ss, slot| {
        if (ss == .free) continue;
        const e = st.regions[slot].exec();
        std.debug.print("exec {d} module {d} status {s} slot_state {s} next_effect {d}\n", .{ e.exec_id, st.slot_module[slot], @tagName(e.status), @tagName(ss), e.next_effect });
        const tab = st.regions[slot].fibreTable();
        for (tab, 0..) |f, i| std.debug.print("   fibre {d} {s} wait {d}\n", .{ i, @tagName(f.state), f.wait_effect });
    }
    var it = st.parked.iterator();
    while (it.next()) |kv| std.debug.print("parked exec {d} attention {} snap {}\n", .{ kv.key_ptr.*, kv.value_ptr.attention, sh.snaps.contains(kv.key_ptr.*) });
    var pit = st.pending.iterator();
    while (pit.next()) |kv| std.debug.print("pending exec {d} seq {d} step {d} kind {s} attempt {d}\n", .{ kv.key_ptr.exec_id, kv.key_ptr.seq, kv.value_ptr.step, @tagName(kv.value_ptr.kind), kv.value_ptr.attempt });
    std.debug.print("timers {d} inflight {d}\n", .{ st.ntimers, world.inflight.items.len });
}

/// Where finished executions go: by cid, or by slot for the schedule.
const Sink = struct {
    results: *std.AutoHashMap(u32, []const u8),
    fired: *std.AutoHashMap(i64, []const u8),

    fn put(k: Sink, gpa: std.mem.Allocator, payload: []const u8) !void {
        if (atOf(payload)) |at| return k.fired.put(at, try gpa.dupe(u8, payload));
        const cid = cidOf(payload) orelse return;
        try k.results.put(cid, try gpa.dupe(u8, payload));
    }
};

fn atOf(payload: []const u8) ?i64 {
    const at = std.mem.indexOf(u8, payload, "\"at\":") orelse return null;
    var end = at + 5;
    while (end < payload.len and payload[end] >= '0' and payload[end] <= '9') end += 1;
    return std.fmt.parseInt(i64, payload[at + 5 .. end], 10) catch null;
}

fn perform(gpa: std.mem.Allocator, sh: *Shard, world: *World, report: *Report, sink: Sink, outbox: *std.ArrayList(core.Event), now: i64, a: core.Action) !void {
    switch (a.kind) {
        .dispatch => {
            const m = sh.st.moduleAt(a.module);
            if (a.attempt > 0) report.redispatched += 1;
            try world.dispatch(now, m.str(m.steps[a.step].name), a);
        },
        .finished => try sink.put(gpa, a.payload),
        .attention => {
            report.attention += 1;
            // The operator checks the service: applied effects are skipped
            // with their recorded result; the others are retried.
            const key = a.key;
            if (world.applied.get(&key)) |stored| {
                try outbox.append(gpa, .{ .kind = .operator, .exec_id = a.exec_id, .aux = @backingInt(core.OperatorAction.skip), .payload = stored });
            } else {
                try outbox.append(gpa, .{ .kind = .operator, .exec_id = a.exec_id, .aux = @backingInt(core.OperatorAction.retry) });
            }
        },
        else => {},
    }
}

fn cidOf(payload: []const u8) ?u32 {
    const at = std.mem.indexOf(u8, payload, "\"cid\":") orelse return null;
    var end = at + 6;
    while (end < payload.len and payload[end] >= '0' and payload[end] <= '9') end += 1;
    return std.fmt.parseInt(u32, payload[at + 6 .. end], 10) catch null;
}

/// A shard with its own memory, so a crash can throw the whole process away.
const ShardBox = struct {
    arena: std.heap.ArenaAllocator,
    sh: Shard,
    gpa: std.mem.Allocator,

    fn create(gpa: std.mem.Allocator, sink: shard_mod.LogSink) !*ShardBox {
        const b = try gpa.create(ShardBox);
        b.gpa = gpa;
        b.arena = std.heap.ArenaAllocator.init(gpa);
        b.sh = try Shard.init(b.arena.allocator(), simConfig(), sink, 2 << 20, 1 << 20);
        return b;
    }

    fn destroy(b: *ShardBox) void {
        b.arena.deinit();
        b.gpa.destroy(b);
    }
};

fn crash(gpa: std.mem.Allocator, box: **ShardBox, log: *MemLog, world: *World, report: *Report, sink: Sink, now: i64, outbox: *std.ArrayList(core.Event)) !void {
    report.crashes += 1;
    log.crash();
    world.crash();
    // The old process and all its memory are gone.
    box.*.destroy();
    box.* = try ShardBox.create(gpa, log.sink());
    const fresh = &box.*.sh;
    fresh.collect_finished = true;
    const stats = try fresh.recover(log.bytes.items);
    for (stats.finished.items) |f| try sink.put(gpa, f.payload);
    const tk = try fresh.resolveInDoubt(now);
    for (tk.actions) |a| {
        if (a.kind == .dispatch) {
            report.redispatched += 1;
            const m = fresh.st.moduleAt(a.module);
            try world.dispatch(now, m.str(m.steps[a.step].name), a);
        } else if (a.kind == .attention) {
            report.attention += 1;
            if (world.applied.get(&a.key)) |stored| {
                try outbox.append(gpa, .{ .kind = .operator, .exec_id = a.exec_id, .aux = @backingInt(core.OperatorAction.skip), .payload = stored });
            } else {
                try outbox.append(gpa, .{ .kind = .operator, .exec_id = a.exec_id, .aux = @backingInt(core.OperatorAction.retry) });
            }
        }
    }
    fresh.endBatch();
}

/// Run `seeds` seeds; each compares a crashing run with its reference run.
pub fn run(gpa: std.mem.Allocator, out: *std.Io.Writer, first_seed: u64, seeds: u64, opts: Options) !u32 {
    var modules: [programs.sim_programs.len + 1][]const u8 = undefined;
    for (programs.sim_programs, 0..) |p, i| modules[i] = try p(gpa, programs.simMeta());
    modules[programs.sim_programs.len] = try programs.everySecond(gpa, programs.schedule_meta);
    // Two versions of one program: the META differs, so the hashes differ.
    const wf: WorkflowVersions = .{ try programs.approval(gpa, "{\"durability\":\"sync\",\"v\":1}"), try programs.approval(gpa, "{\"durability\":\"sync\",\"v\":2}") };
    defer for (wf) |m| gpa.free(m);
    var divergent: u32 = 0;
    var total_crashes: u64 = 0;
    var total_fires: u64 = 0;
    var seed = first_seed;
    while (seed < first_seed + seeds) : (seed += 1) {
        var arena = std.heap.ArenaAllocator.init(gpa);
        defer arena.deinit();
        const a = arena.allocator();
        debug_dump = seeds == 1;
        var ref_opts = opts;
        ref_opts.crash_per_mille = 0;
        const ref = try runOnce(a, seed, ref_opts, &modules, wf);
        const got = try runOnce(a, seed, opts, &modules, wf);
        total_crashes += got.report.crashes;
        total_fires += got.report.fires;
        const why = compare(ref, got, opts.executions, 1_000_000 + opts.schedule_window_ms);
        if (why) |reason| {
            divergent += 1;
            var cid: u32 = 0;
            while (cid < opts.executions) : (cid += 1) {
                if (!got.results.contains(cid)) try out.print("  unfinished cid {d} (program {d})\n", .{ cid, cid % programs.sim_programs.len });
            }
            try out.print("seed {d}: DIVERGED ({s}) crashes={d} ref_finished={d} finished={d} double={d}\n", .{ seed, reason, got.report.crashes, ref.report.finished, got.report.finished, got.report.double_applied });
        }
    }
    try out.print("simulation: {d} seeds, {d} crashes, {d} schedule fires, {d} divergent\n", .{ seeds, total_crashes, total_fires, divergent });
    for (modules) |m| gpa.free(m);
    return divergent;
}

fn compare(ref: Outcome, got: Outcome, n: u32, window_end: i64) ?[]const u8 {
    if (ref.report.finished != n) return "reference run did not finish";
    if (got.report.finished != n) return "not all executions finished";
    if (got.report.double_applied != 0 or ref.report.double_applied != 0) return "an effect was applied twice";
    var it = ref.results.iterator();
    while (it.next()) |kv| {
        const other = got.results.get(kv.key_ptr.*) orelse return "missing result";
        if (!std.mem.eql(u8, other, kv.value_ptr.*)) return "different result";
    }
    // Every slot in the window fires once in both runs, with the same result.
    if (ref.report.fires == 0) return "the schedule never fired";
    if (got.report.fires != ref.report.fires) return "a schedule slot was lost or added";
    var fit = ref.fired.iterator();
    while (fit.next()) |kv| {
        if (kv.key_ptr.* > window_end) continue;
        const other = got.fired.get(kv.key_ptr.*) orelse return "a schedule slot was lost";
        if (!std.mem.eql(u8, other, kv.value_ptr.*)) return "different schedule result";
    }
    return null;
}
