//! Workflow static data (spec 9.7) through a shard: n8n's copy at load,
//! changes kept for production runs that end `ok` or `error`, none for
//! manual runs, host steps that read and change it, the limits, and a
//! replay of the log that ends with the same table.
//!
//! The workflow is `testdata/static-data.ts`, compiled to
//! `testdata/static-data.wfm` (`node src/cli.ts compile` in workflow-lang).
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const shard_mod = @import("shard.zig");

const wfm = @embedFile("testdata/static-data.wfm");

const MemLog = struct {
    bytes: std.ArrayList(u8) = .empty,
    gpa: std.mem.Allocator,
    fn append(ctx: *anyopaque, b: []const u8) anyerror!void {
        const l: *MemLog = @ptrCast(@alignCast(ctx));
        try l.bytes.appendSlice(l.gpa, b);
    }
    fn sync(_: *anyopaque) anyerror!void {}
    fn sink(l: *MemLog) shard_mod.LogSink {
        return .{ .ctx = l, .appendFn = append, .syncFn = sync };
    }
};

fn config() core.Config {
    return .{
        .slots = 8,
        .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 },
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
        .max_static_data = 2,
        .static_data_bytes = 128,
    };
}

/// One shard and its log; runs report their result and the actions they emitted.
const Bed = struct {
    a: std.mem.Allocator,
    log: *MemLog,
    sh: shard_mod.Shard,
    now: i64 = 1000,

    fn init(a: std.mem.Allocator) !Bed {
        const log = try a.create(MemLog);
        log.* = .{ .gpa = a };
        return .{ .a = a, .log = log, .sh = try shard_mod.Shard.init(a, config(), log.sink(), 2 << 20, 1 << 20) };
    }

    /// One batch; copies what the test checks out of the batch memory.
    fn tick(b: *Bed, evs: []const core.Event) !Out {
        b.now += 10;
        const tk = try b.sh.tick(b.now, evs);
        var out: Out = .{};
        for (tk.actions) |act| switch (act.kind) {
            .reply => out.reply = act.aux,
            .finished => out.result = try b.a.dupe(u8, act.payload),
            .dispatch => {
                out.dispatch = try b.a.dupe(u8, act.payload);
                out.exec_id = act.exec_id;
                out.seq = act.seq;
            },
            .static_data => if (act.aux == 0) {
                out.saved = try b.a.dupe(u8, act.payload);
            } else {
                out.rejected = try b.a.dupe(u8, act.payload);
            },
            else => {},
        };
        b.sh.endBatch();
        return out;
    }

    fn load(b: *Bed, id: []const u8, static_json: ?[]const u8) !Out {
        const header = if (static_json) |d|
            try std.fmt.allocPrint(b.a, "{{\"workflowId\":\"{s}\",\"active\":false,\"staticData\":{s}}}\n", .{ id, d })
        else
            try std.fmt.allocPrint(b.a, "{{\"workflowId\":\"{s}\",\"active\":false}}\n", .{id});
        return b.tick(&.{.{ .kind = .load_workflow, .conn = 1, .payload = try std.mem.concat(b.a, u8, &.{ header, wfm }) }});
    }

    fn run(b: *Bed, id: []const u8, body: []const u8) !Out {
        const mod = b.sh.st.liveWorkflow(id).?;
        const trigger = try std.fmt.allocPrint(b.a, "{{\"body\":{s}}}", .{body});
        return b.tick(&.{.{ .kind = .start, .aux = mod, .payload = trigger }});
    }

    fn manual(b: *Bed, id: []const u8, exec: []const u8) !Out {
        const payload = try std.fmt.allocPrint(b.a, "{s}\n\n{{\"body\":{{}}}}", .{id});
        return b.tick(&.{.{ .kind = .manual, .exec_id = core.parseExecId(exec).?, .payload = payload }});
    }

    fn table(b: *const Bed, id: []const u8) []const u8 {
        return b.sh.st.statics.get(id) orelse "";
    }
};

const Out = struct {
    reply: ?u32 = null,
    result: ?[]const u8 = null,
    dispatch: ?[]const u8 = null,
    exec_id: u64 = 0,
    seq: u32 = 0,
    saved: ?[]const u8 = null,
    rejected: ?[]const u8 = null,
};

test "static data: n8n's copy at load, kept for production runs, not for manual runs, and replayed" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    const t = std.testing;

    // n8n sends its copy with the workflow.
    try t.expectEqual(@as(?u32, 200), (try bed.load("w", "{\"global\":{\"count\":10}}")).reply);
    try t.expectEqualStrings("{\"global\":{\"count\":10}}", bed.table("w"));

    // A production run changes it; the change goes out for n8n and the log.
    var o = try bed.run("w", "{}");
    try t.expectEqualStrings("{\"count\":11}", o.result.?);
    try t.expectEqualStrings("w\n{\"global\":{\"count\":11}}", o.saved.?);
    o = try bed.run("w", "{}");
    try t.expectEqualStrings("{\"count\":12}", o.result.?);

    // A manual run sees it but does not keep its change, as in n8n.
    o = try bed.manual("w", "501");
    try t.expectEqualStrings("{\"count\":13}", o.result.?);
    try t.expect(o.saved == null);
    try t.expectEqualStrings("{\"global\":{\"count\":12}}", bed.table("w"));

    // A run that fails keeps its change, as in n8n.
    o = try bed.run("w", "{\"fail\":true}");
    try t.expect(o.saved != null);
    try t.expectEqualStrings("{\"global\":{\"count\":13}}", bed.table("w"));

    // A host step gets the working copy and gives back a changed document.
    o = try bed.run("w", "{\"host\":true}");
    try t.expect(std.mem.indexOf(u8, o.dispatch.?, "\"staticData\":true,") != null);
    try t.expect(std.mem.endsWith(u8, o.dispatch.?, ",\"$staticData\":{\"global\":{\"count\":14}}}"));
    const result = "[]";
    const doc = "{\"global\":{\"count\":14,\"fromHost\":\"yes\"}}";
    o = try bed.tick(&.{.{ .kind = .effect_ok, .exec_id = o.exec_id, .seq = o.seq, .aux = result.len + 1, .payload = result ++ doc }});
    try t.expectEqualStrings("{\"count\":14,\"fromHost\":\"yes\"}", o.result.?);
    try t.expectEqualStrings(doc, bed.table("w"));

    // A reload without static data keeps the shard's; `{}` from n8n clears it.
    _ = try bed.load("w", null);
    try t.expectEqualStrings(doc, bed.table("w"));

    // A replay of the log ends with the same table.
    var replay = try shard_mod.Shard.init(a, config(), null, 2 << 20, 1 << 20);
    _ = try replay.recover(bed.log.bytes.items);
    try t.expectEqualStrings(doc, replay.st.statics.get("w").?);

    _ = try bed.load("w", "{}");
    try t.expect(bed.sh.st.statics.get("w") == null);
}

test "static data: limits name their flags" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var bed = try Bed.init(a);
    const t = std.testing;

    // A document over the capacity (128 bytes in this config) is refused at load.
    const pad: [120]u8 = @splat('x');
    const big = try std.fmt.allocPrint(a, "{{\"global\":{{\"pad\":\"{s}\"}}}}", .{&pad});
    try t.expectEqual(@as(?u32, 413), (try bed.load("w", big)).reply);

    // The table holds two workflows; a third with static data is refused.
    _ = try bed.load("w1", "{\"global\":{}}");
    _ = try bed.load("w2", "{\"global\":{}}");
    try t.expectEqual(@as(?u32, 507), (try bed.load("w3", "{\"global\":{}}")).reply);

    // A run of a workflow without an entry, when the table is full: the run
    // ends as it would, and the change is not kept, with a message.
    _ = try bed.load("w3", null);
    const o = try bed.run("w3", "{}");
    try t.expectEqualStrings("{\"count\":1}", o.result.?);
    try t.expect(std.mem.indexOf(u8, o.rejected.?, "raise --max-static-data") != null);
    try t.expect(bed.sh.st.statics.get("w3") == null);
}
