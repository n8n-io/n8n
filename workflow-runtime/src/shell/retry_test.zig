//! Criterion 4: retrying a failed step re-sends that one effect, and no
//! completed step is sent again.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const shard_mod = @import("shard.zig");
const programs = @import("programs.zig");

test "operator retry re-dispatches only the failed effect" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, null);
    var sh = try shard_mod.Shard.init(a, .{ .slots = 8, .region_counts = .{ 8, 4, 2, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 8, .max_pending = 64, .max_actions = 256, .max_batch_events = 64, .max_timers = 16 }, null, 1 << 20, 1 << 20);
    _ = try sh.tick(0, &.{ .{ .kind = .load_module, .payload = module }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":3}" } });
    var dispatched: std.ArrayList([]const u8) = .empty;
    var pending: ?core.Action = null;
    var attention: ?core.Action = null;
    var result: ?[]const u8 = null;
    var round: u32 = 0;
    while (round < 20 and result == null) : (round += 1) {
        for (sh.st.emitted()) |act| switch (act.kind) {
            .dispatch => {
                const m = sh.st.moduleAt(act.module);
                try dispatched.append(a, try a.dupe(u8, m.str(m.steps[act.step].name)));
                pending = act;
            },
            .attention => attention = act,
            .finished => result = try a.dupe(u8, act.payload),
            else => {},
        };
        sh.endBatch();
        if (result != null) break;
        if (attention) |at| {
            // The operator retries; this time the service succeeds.
            attention = null;
            pending = null;
            _ = try sh.tick(2, &.{.{ .kind = .operator, .exec_id = at.exec_id, .aux = @backingInt(core.OperatorAction.retry) }});
            continue;
        }
        const p = pending orelse break;
        pending = null;
        const m = sh.st.moduleAt(p.module);
        const fail = std.mem.eql(u8, m.str(m.steps[p.step].name), "Charge") and p.attempt == 0;
        _ = try sh.tick(1, &.{.{ .kind = if (fail) .effect_err else .effect_ok, .exec_id = p.exec_id, .seq = p.seq, .payload = if (fail) "card declined" else "{\"v\":2}" }});
    }
    // Check x3, Charge (failed), Charge (retried): completed checks never again.
    // Regression (found by pool poisoning): the snapshot of the execution
    // that needs attention was in released scratch memory, so its restore
    // failed and the retry never went out.
    try std.testing.expectEqual(@as(usize, 5), dispatched.items.len);
    for (dispatched.items[0..3]) |n| try std.testing.expectEqualStrings("Check", n);
    try std.testing.expectEqualStrings("Charge", dispatched.items[3]);
    try std.testing.expectEqualStrings("Charge", dispatched.items[4]);
    try std.testing.expectEqualStrings("{\"cid\":1,\"acc\":6,\"charge\":2}", result.?);
}

test "regression: a failed step outside a try block sends its failed event before needs_attention (gym)" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, null);
    var sh = try shard_mod.Shard.init(a, .{ .slots = 8, .region_counts = .{ 8, 4, 2, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 8, .max_pending = 64, .max_actions = 256, .max_batch_events = 64, .max_timers = 16, .lifecycle = true }, null, 1 << 20, 1 << 20);
    _ = try sh.tick(0, &.{ .{ .kind = .load_module, .payload = module }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":1}" } });
    var failed_at: ?usize = null;
    var attention_at: ?usize = null;
    var order: usize = 0;
    var round: u32 = 0;
    while (round < 10 and attention_at == null) : (round += 1) {
        var next: ?core.Action = null;
        for (sh.st.emitted()) |act| {
            order += 1;
            switch (act.kind) {
                .dispatch => next = act,
                .status => if (act.aux == @backingInt(core.StepStatus.failed)) {
                    failed_at = order;
                },
                .attention => attention_at = order,
                else => {},
            }
        }
        sh.endBatch();
        const p = next orelse break;
        const m = sh.st.moduleAt(p.module);
        const fail = std.mem.eql(u8, m.str(m.steps[p.step].name), "Charge");
        _ = try sh.tick(1, &.{.{ .kind = if (fail) .effect_err else .effect_ok, .exec_id = p.exec_id, .seq = p.seq, .payload = if (fail) "card declined" else "{\"v\":2}" }});
    }
    try std.testing.expect(attention_at != null);
    try std.testing.expect(failed_at != null);
    try std.testing.expect(failed_at.? < attention_at.?);
}

/// Step `status` actions of one execution of `programs.loop`, with lifecycle on.
fn stepStatuses(sample: u32) !struct { started: u32, failed: u32 } {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.loop(a, null);
    var sh = try shard_mod.Shard.init(a, .{ .slots = 8, .region_counts = .{ 8, 4, 2, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 8, .max_pending = 64, .max_actions = 256, .max_batch_events = 64, .max_timers = 16, .lifecycle = true, .step_event_sample = sample }, null, 1 << 20, 1 << 20);
    _ = try sh.tick(0, &.{ .{ .kind = .load_module, .payload = module }, .{ .kind = .start, .aux = 0, .payload = "{\"cid\":1,\"n\":2}" } });
    var started: u32 = 0;
    var failed: u32 = 0;
    var round: u32 = 0;
    while (round < 20) : (round += 1) {
        var next: ?core.Action = null;
        for (sh.st.emitted()) |act| switch (act.kind) {
            .dispatch => next = act,
            .status => {
                if (act.aux == @backingInt(core.StepStatus.started)) started += 1;
                if (act.aux == @backingInt(core.StepStatus.failed)) failed += 1;
            },
            else => {},
        };
        sh.endBatch();
        const p = next orelse break;
        const m = sh.st.moduleAt(p.module);
        const fail = std.mem.eql(u8, m.str(m.steps[p.step].name), "Charge");
        _ = try sh.tick(1, &.{.{ .kind = if (fail) .effect_err else .effect_ok, .exec_id = p.exec_id, .seq = p.seq, .payload = if (fail) "declined" else "{\"v\":2}" }});
    }
    return .{ .started = started, .failed = failed };
}

test "step events go out only for watched or sampled executions; failures always" {
    const unwatched = try stepStatuses(0);
    try std.testing.expectEqual(@as(u32, 0), unwatched.started);
    try std.testing.expectEqual(@as(u32, 1), unwatched.failed);
    // A sample of 1 in 1 watches every execution.
    const sampled = try stepStatuses(1);
    try std.testing.expect(sampled.started >= 3);
    try std.testing.expectEqual(@as(u32, 1), sampled.failed);
}

test "a full batch defers events and restores to the next batch, not a crash" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const module = try programs.approval(a, null);
    // Eight events in a batch: six approvals that each need a restore do
    // not fit at once.
    var sh = try shard_mod.Shard.init(a, .{ .slots = 16, .region_counts = .{ 16, 4, 2, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 16, .max_pending = 64, .max_actions = 256, .max_batch_events = 8, .max_timers = 16 }, null, 1 << 20, 1 << 20);
    _ = try sh.tick(0, &.{.{ .kind = .load_module, .payload = module }});
    sh.endBatch();
    const n = 6;
    var asks: [n]core.Action = undefined;
    for (0..n) |i| {
        var buf: [32]u8 = undefined;
        _ = try sh.tick(1, &.{.{ .kind = .start, .aux = 0, .payload = try std.fmt.bufPrint(&buf, "{{\"cid\":{d}}}", .{i}) }});
        for (sh.st.emitted()) |act| if (act.kind == .dispatch) {
            asks[i] = act;
        };
        sh.endBatch();
    }
    // Every execution waits for its approval, out of memory.
    try std.testing.expectEqual(@as(u32, n), sh.st.parkedCount());
    var pending: std.ArrayList(core.Event) = .empty;
    for (asks) |ask| try pending.append(a, .{ .kind = .effect_ok, .exec_id = ask.exec_id, .seq = ask.seq, .payload = "{\"approved\":true}" });
    // `tick` (all or nothing) refuses; `tickSome` takes a prefix.
    try std.testing.expectError(error.TooManyEvents, sh.tick(2, pending.items));
    sh.endBatch();
    var ships: std.ArrayList(core.Event) = .empty;
    var finished: usize = 0;
    var batches: u32 = 0;
    var partial = false;
    while ((pending.items.len > 0 or ships.items.len > 0) and batches < 50) : (batches += 1) {
        try pending.appendSlice(a, ships.items);
        ships.clearRetainingCapacity();
        const tk = try sh.tickSome(3, pending.items);
        if (tk.consumed < pending.items.len) partial = true;
        for (tk.actions) |act| switch (act.kind) {
            .dispatch => try ships.append(a, .{ .kind = .effect_ok, .exec_id = act.exec_id, .seq = act.seq, .payload = "{\"v\":1}" }),
            .finished => finished += 1,
            else => {},
        };
        sh.endBatch();
        const rest = try a.dupe(core.Event, pending.items[tk.consumed..]);
        pending.clearRetainingCapacity();
        try pending.appendSlice(a, rest);
    }
    try std.testing.expect(partial);
    try std.testing.expectEqual(@as(usize, n), finished);
    try std.testing.expectEqual(@as(u32, 0), sh.st.parkedCount());
}
