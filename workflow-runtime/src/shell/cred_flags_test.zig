//! Credential flags and node waits through a shard, with a replay of the
//! log after each: `ctx.credentialFlag` reads the copy that the execution
//! took at its start, and a wait in the code of a node is a timer only.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const Asm = core_lib.asm_.Asm;
const EK = core_lib.module.EffectKind;
const shard_mod = @import("shard.zig");

const MemLog = @import("static_data_test.zig").MemLog;

fn newLog(a: std.mem.Allocator) !*MemLog {
    const log = try a.create(MemLog);
    log.* = .{ .gpa = a };
    return log;
}

fn config() core.Config {
    return .{
        .slots = 8,
        .region_sizes = .{ 16 << 10, 64 << 10, 256 << 10, 1 << 20 },
        .region_counts = .{ 8, 4, 2, 1 },
        .max_parked = 8,
        .max_timers = 64,
        .max_pending = 64,
        .max_actions = 512,
        .max_batch_events = 64,
        .module_bytes = 1 << 20,
        .natives_total = 1 << 16,
        .max_modules = 4,
        .max_routes = 8,
        .max_schedules = 4,
        .max_zones = 2,
        .schedules = false,
        .lifecycle = true,
    };
}

const Out = struct {
    result: ?[]const u8 = null,
    status: u32 = 0,
    exec_id: u64 = 0,
    seq: u32 = 0,
    key: ?[32]u8 = null,
    waiting: bool = false,
    snapshot: bool = false,
    next_timer_ms: ?i64 = null,
};

const Bed = struct {
    a: std.mem.Allocator,
    log: *MemLog,
    sh: shard_mod.Shard,
    now: i64 = 1000,

    fn init(a: std.mem.Allocator) !Bed {
        const log = try newLog(a);
        return .{ .a = a, .log = log, .sh = try shard_mod.Shard.init(a, config(), log.sink(), 2 << 20, 1 << 20) };
    }

    fn tick(b: *Bed, evs: []const core.Event) !Out {
        b.now += 10;
        return tickShard(b.a, &b.sh, b.now, evs);
    }

    fn load(b: *Bed, id: []const u8, wfm: []const u8) !void {
        const header = try std.fmt.allocPrint(b.a, "{{\"workflowId\":\"{s}\",\"active\":false}}\n", .{id});
        _ = try b.tick(&.{.{ .kind = .load_workflow, .conn = 1, .payload = try std.mem.concat(b.a, u8, &.{ header, wfm }) }});
        try std.testing.expect(b.sh.st.liveWorkflow(id) != null);
    }

    fn flags(b: *Bed, id: []const u8, doc: []const u8) !void {
        _ = try b.tick(&.{.{ .kind = .credential_flags, .payload = try std.mem.concat(b.a, u8, &.{ id, "\n", doc }) }});
    }

    fn start(b: *Bed, id: []const u8) !Out {
        return b.tick(&.{.{ .kind = .start, .aux = b.sh.st.liveWorkflow(id).?, .payload = "{}" }});
    }
};

/// One batch of a shard; copies what the tests check out of the batch memory.
fn tickShard(a: std.mem.Allocator, sh: *shard_mod.Shard, now: i64, evs: []const core.Event) !Out {
    const tk = try sh.tick(now, evs);
    var out: Out = .{ .next_timer_ms = tk.out.next_timer_ms };
    for (tk.actions) |act| switch (act.kind) {
        .finished => {
            out.result = try a.dupe(u8, act.payload);
            out.status = act.aux;
        },
        .dispatch => {
            out.exec_id = act.exec_id;
            out.seq = act.seq;
            out.key = act.key;
        },
        .status => if (act.aux == @backingInt(core.StepStatus.waiting)) {
            out.waiting = true;
        },
        .snapshot => out.snapshot = true,
        else => {},
    };
    sh.endBatch();
    return out;
}

/// `run(t) { await Call({}); return { v: ctx.credentialFlag('slot', <name>) } }`.
/// The call comes first, so a test can change the flags while the run waits.
fn flagModule(a: std.mem.Allocator, meta: []const u8, name: []const u8) ![]u8 {
    var m: Asm = .{ .gpa = a, .meta = meta };
    defer m.deinit();
    const call = try m.step("Call", .node);
    m.beginFunc();
    try m.emit(.newobj, 0, 1, 0, 0);
    try m.emitBc(.loadi, 2, call);
    try m.emit(.@"suspend", @backingInt(EK.node), 3, 2, 1);
    try m.emitBc(.loads, 4, try m.str("slot"));
    try m.emitBc(.loads, 5, try m.str(name));
    try m.emit(.calln, 2, 6, try m.str("ctx.credentialFlag"), 4);
    try m.emit(.newobj, 0, 7, 0, 0);
    try m.emit(.setprop, 0, 7, try m.str("v"), 6);
    try m.emit(.ret, 0, 7, 0, 0);
    try m.endFunc("run", 1, 8, 0);
    return m.finish();
}

const flag_meta = "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"w\"}],\"credentialFlags\":[\"f00000001\"]}";
const missing = core_lib.cred_flags.missing_message;

/// Start a run, change nothing, answer its call: the result of the run.
fn runFlag(b: *Bed, id: []const u8) !Out {
    const o = try b.start(id);
    return b.tick(&.{.{ .kind = .effect_ok, .exec_id = o.exec_id, .seq = o.seq, .payload = "{}" }});
}

test "credential flags: a run reads the flags of its start, and a replay reads the same" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const t = std.testing;
    var b = try Bed.init(a);
    try b.load("w", try flagModule(a, flag_meta, "f00000001"));

    // No flags yet: the read throws the message of the reference.
    var o = try runFlag(&b, "w");
    try t.expectEqual(@backingInt(core_lib.heap.ExecStatus.failed), o.status);
    try t.expect(std.mem.indexOf(u8, o.result.?, missing) != null);

    try b.flags("w", "{\"slot\":{\"f00000001\":true},\"other\":{\"f00000001\":false}}");
    o = try runFlag(&b, "w");
    try t.expectEqualStrings("{\"v\":true}", o.result.?);

    // The credential changes while a run waits: the run keeps its copy.
    const waiting = try b.start("w");
    try b.flags("w", "{\"slot\":{\"f00000001\":false}}");
    o = try b.tick(&.{.{ .kind = .effect_ok, .exec_id = waiting.exec_id, .seq = waiting.seq, .payload = "{}" }});
    try t.expectEqualStrings("{\"v\":true}", o.result.?);
    o = try runFlag(&b, "w");
    try t.expectEqualStrings("{\"v\":false}", o.result.?);

    // A document of another form changes nothing and is not in the log.
    const before = b.log.bytes.items.len;
    try b.flags("w", "{\"slot\":{\"f00000001\":\"secret\"}}");
    try b.flags("w", "{\"slot\":{\"token\":true}}");
    try b.flags("unknown", "{\"slot\":{\"f00000001\":true}}");
    try t.expectEqual(before, b.log.bytes.items.len);
    try t.expectEqualStrings("{\"slot\":{\"f00000001\":false}}", b.sh.st.cred_flags.get("w").?);

    // A run that is waiting when the process stops, then the flags go.
    const open = try b.start("w");
    try b.flags("w", "{}");
    try t.expect(b.sh.st.cred_flags.get("w") == null);

    // The replay gives each run the flags that it had: the results are the
    // same, and the open run still reads `false` after the flags went.
    var replay = try shard_mod.Shard.init(a, config(), (try newLog(a)).sink(), 2 << 20, 1 << 20);
    replay.collect_finished = true;
    const stats = try replay.recover(b.log.bytes.items);
    try t.expectEqual(@as(usize, 4), stats.finished.items.len);
    try t.expect(std.mem.indexOf(u8, stats.finished.items[0].payload, missing) != null);
    try t.expectEqualStrings("{\"v\":true}", stats.finished.items[1].payload);
    try t.expectEqualStrings("{\"v\":true}", stats.finished.items[2].payload);
    try t.expectEqualStrings("{\"v\":false}", stats.finished.items[3].payload);
    try t.expect(replay.st.cred_flags.get("w") == null);
    o = try tickShard(a, &replay, b.now + 10, &.{.{ .kind = .effect_ok, .exec_id = open.exec_id, .seq = open.seq, .payload = "{}" }});
    try t.expectEqualStrings("{\"v\":false}", o.result.?);

    // The log has the flags as booleans by name, and an unload removes them.
    try t.expect(std.mem.indexOf(u8, b.log.bytes.items, "\"f00000001\":true") != null);
    try b.flags("w", "{\"slot\":{\"f00000001\":true}}");
    _ = try b.tick(&.{.{ .kind = .unload_workflow, .conn = 1, .payload = "w" }});
    try t.expect(b.sh.st.cred_flags.get("w") == null);
}

test "credential flags: only a name of the module's list, only a boolean" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const t = std.testing;
    var b = try Bed.init(a);
    // The code reads a flag that the list of its module does not have.
    try b.load("other", try flagModule(a, flag_meta, "f00000002"));
    // The name does not have the form of a flag name.
    try b.load("name", try flagModule(a, "{\"credentialFlags\":[\"token\"]}", "token"));
    // The module has no list.
    try b.load("none", try flagModule(a, "{}", "f00000001"));
    const doc = "{\"slot\":{\"f00000001\":true,\"f00000002\":true}}";
    for ([_][]const u8{ "other", "name", "none" }) |id| {
        try b.flags(id, doc);
        const o = try runFlag(&b, id);
        try t.expectEqual(@backingInt(core_lib.heap.ExecStatus.failed), o.status);
        try t.expect(std.mem.indexOf(u8, o.result.?, missing) != null);
    }
}

/// `run(t) { await wait({ duration: <ms> }); return await Call({}) }`. With
/// `in_node` both effects have the step of the node, as a pause in the code
/// of a node has; else the wait has a wait step of its own.
fn pauseThenCall(a: std.mem.Allocator, ms: f64, in_node: bool) ![]u8 {
    var m: Asm = .{ .gpa = a, .meta = "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"w\"}]}" };
    defer m.deinit();
    const call = try m.step("Call", .node);
    const wait = if (in_node) call else try m.step("Wait", .wait);
    m.beginFunc();
    try m.emit(.newobj, 0, 1, 0, 0);
    try m.emitBc(.loadk, 2, try m.number(ms));
    try m.emit(.setprop, 0, 1, try m.str("duration"), 2);
    try m.emitBc(.loadi, 3, wait);
    try m.emit(.@"suspend", @backingInt(EK.wait), 4, 3, 1);
    try m.emit(.newobj, 0, 5, 0, 0);
    try m.emitBc(.loadi, 3, call);
    try m.emit(.@"suspend", @backingInt(EK.node), 6, 3, 5);
    try m.emit(.ret, 0, 6, 0, 0);
    try m.endFunc("run", 1, 7, 0);
    return m.finish();
}

test "a wait in the code of a node is a timer only, and a replay makes the same request" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const t = std.testing;
    // Longer than `evict_wait_ms`: a wait step of the workflow leaves memory.
    const ms: f64 = 5000;

    var steps = try Bed.init(a);
    try steps.load("step", try pauseThenCall(a, ms, false));
    const step = try steps.start("step");
    try t.expect(step.waiting and step.snapshot);

    var b = try Bed.init(a);
    try b.load("node", try pauseThenCall(a, ms, true));
    const node = try b.start("node");
    try t.expect(!node.waiting and !node.snapshot);
    try t.expectEqual(@as(?i64, b.now + 5000), node.next_timer_ms);

    // The process stops during the pause. The log up to here is what a new
    // process has.
    const log = try a.dupe(u8, b.log.bytes.items);

    // Without a stop: the timer ends the pause, and the request goes out.
    b.now += 5000;
    const live = try b.tick(&.{});
    try t.expect(live.key != null);

    // After the replay the pause ends at the same time, and the request has
    // the same sequence number and the same idempotency key: the occurrence
    // of the step counted the pause in both runs.
    var replay = try shard_mod.Shard.init(a, config(), (try newLog(a)).sink(), 2 << 20, 1 << 20);
    _ = try replay.recover(log);
    const early = try tickShard(a, &replay, b.now - 4000, &.{.{ .kind = .recover }});
    try t.expect(early.key == null);
    const again = try tickShard(a, &replay, b.now, &.{});
    try t.expectEqual(live.exec_id, again.exec_id);
    try t.expectEqual(live.seq, again.seq);
    try t.expectEqualSlices(u8, &live.key.?, &again.key.?);
    var first: [32]u8 = undefined;
    core.idempotencyKey(live.exec_id, "Call", 1, &first);
    try t.expectEqualSlices(u8, &first, &live.key.?);
}
