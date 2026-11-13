//! Workflows in the core (spec 9.1): load, replace and unload, routes with
//! n8n path rules, module references and reuse, manual runs and the
//! trace action.
const std = @import("std");
const core = @import("core.zig");
const heap = @import("heap.zig");
const Asm = @import("asm.zig").Asm;
const Arena = @import("arena.zig").Arena;

const testing = std.testing;

/// `run(t) { trace('T', t); x = await approval(t); return { v: <tag>, x } }`.
/// With `wait` false it returns at once.
fn module(gpa: std.mem.Allocator, meta: []const u8, tag: f64, wait: bool) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const ask = try a.step("Ask", .approval);
    a.beginFunc();
    try a.emitBc(.loads, 1, try a.str("T"));
    try a.emit(.trace, 0, 1, 0, 0);
    try a.emitBc(.loadundef, 2, 0);
    if (wait) {
        try a.emitBc(.loadi, 3, ask);
        try a.emit(.@"suspend", @backingInt(@import("module.zig").EffectKind.approval), 2, 3, 0);
    }
    try a.emit(.newobj, 0, 4, 0, 0);
    try a.emitBc(.loadk, 5, try a.number(tag));
    try a.emit(.setprop, 0, 4, try a.str("v"), 5);
    try a.emit(.setprop, 0, 4, try a.str("x"), 2);
    try a.emit(.ret, 0, 4, 0, 0);
    try a.endFunc("run", 1, 6, 0);
    return a.finish();
}

const Harness = struct {
    st: core.State,
    scratch: Arena,
    gpa: std.mem.Allocator,
    now: i64 = 1_000,

    fn init(a: std.mem.Allocator) !Harness {
        const cfg: core.Config = .{ .slots = 8, .region_counts = .{ 8, 2, 1, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 16, .max_timers = 16, .max_pending = 16, .max_actions = 64, .max_batch_events = 16, .module_bytes = 1 << 14, .natives_total = 1 << 10, .max_modules = 4, .max_routes = 8, .max_schedules = 4, .max_zones = 2, .lifecycle = true };
        return .{ .st = try core.State.init(a, cfg), .scratch = Arena.init(try a.alloc(u8, 1 << 20)), .gpa = a };
    }

    fn tick(h: *Harness, events: []const core.Event) ![]const core.Action {
        h.now += 10;
        h.scratch.reset();
        _ = try core.step(&h.st, h.now, events, &h.scratch);
        return h.st.emitted();
    }

    fn load(h: *Harness, id: []const u8, version: []const u8, active: bool, bytes: []const u8) !u32 {
        const p = try std.fmt.allocPrint(h.gpa, "{{\"workflowId\":\"{s}\",\"versionId\":\"{s}\",\"active\":{},\"webhookPrefix\":\"/webhook\"}}\n{s}", .{ id, version, active, bytes });
        return replyStatus(try h.tick(&.{.{ .kind = .load_workflow, .conn = 7, .payload = p }}));
    }

    fn request(h: *Harness, method: []const u8, target: []const u8) ![]const core.Action {
        const p = try std.fmt.allocPrint(h.gpa, "{s} {s}\n{{\"x-a\":\"1\"}}\n{{\"q\":1}}", .{ method, target });
        return h.tick(&.{.{ .kind = .http_request, .conn = 9, .payload = p }});
    }
};

fn replyStatus(actions: []const core.Action) u32 {
    for (actions) |a| if (a.kind == .reply) return a.aux;
    return 0;
}

fn find(actions: []const core.Action, kind: core.ActionKind) ?core.Action {
    for (actions) |a| if (a.kind == kind) return a;
    return null;
}

const webhook_meta = "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"/orders/:id/\",\"method\":\"POST\",\"webhookId\":\"u1\"},{\"kind\":\"webhook\",\"path\":\"ping\"}]}";

test "load, replace and unload keep running executions on their version" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    const v1 = try module(a, webhook_meta, 1, true);
    const v2 = try module(a, webhook_meta, 2, false);

    try testing.expectEqual(@as(u32, 200), try h.load("wf", "v1", true, v1));
    // A dynamic path with a webhook id gets `<id>/<path>`, as in n8n.
    const acts = try h.request("POST", "/webhook/u1/orders/42?a=b%20c&d=+");
    const started = find(acts, .started).?;
    try testing.expectEqualStrings("{\"method\":\"POST\",\"path\":\"/webhook/u1/orders/42\",\"headers\":{\"x-a\":\"1\"},\"params\":{\"id\":\"42\"},\"query\":{\"a\":\"b c\",\"d\":\" \"},\"body\":{\"q\":1}}", started.payload);
    // No trace action without the trace flag.
    try testing.expect(find(acts, .trace_items) == null);
    const parked = started.exec_id;
    // The approval evicts the execution; the shell keeps the snapshot.
    const snap = try a.dupe(u8, find(acts, .snapshot).?.payload);
    try testing.expectEqual(@as(u32, 2), h.st.modules[0].refs);

    // Version 2 replaces version 1; the parked execution keeps version 1.
    try testing.expectEqual(@as(u32, 200), try h.load("wf", "v2", true, v2));
    try testing.expectEqual(core.ModState.retired, h.st.modules[0].state);
    try testing.expectEqual(@as(u16, 1), h.st.liveWorkflow("wf").?);
    const r2 = try h.request("POST", "/webhook/u1/orders/7/");
    const fin2 = find(r2, .finished).?;
    try testing.expectEqualStrings("{\"v\":2}", fin2.payload);

    // Unload: the routes go; the old execution still finishes on version 1.
    _ = try h.tick(&.{.{ .kind = .unload_workflow, .conn = 7, .payload = "wf" }});
    try testing.expectEqual(@as(u32, 404), replyStatus(try h.request("POST", "/webhook/ping")));
    const done = try h.tick(&.{ .{ .kind = .restore, .exec_id = parked, .payload = snap }, .{ .kind = .effect_ok, .exec_id = parked, .seq = 0, .payload = "true" } });
    try testing.expectEqualStrings("{\"v\":1,\"x\":true}", find(done, .finished).?.payload);
    try testing.expectEqual(@as(u32, 0), h.st.modules[0].refs);

    // In a later batch the memory and index of both modules come back.
    _ = try h.tick(&.{});
    try testing.expectEqual(@as(u32, 200), try h.load("wf2", "x", false, v2));
    try testing.expectEqual(@as(u16, 0), h.st.liveWorkflow("wf2").?);
    try testing.expectEqual(@as(u32, 2), h.st.nmodules);
    try testing.expectEqual(@as(u32, 400), try h.load("nope", "x", false, "bad"));
}

test "n8n webhook path rules" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    const m1 = try module(a, "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"user/:id/posts\",\"method\":\"GET\"}]}", 1, false);
    const m2 = try module(a, "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\":a/:b/:c\",\"method\":\"GET\"}]}", 2, false);
    const m3 = try module(a, "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"user/me/posts\",\"method\":\"GET\"}]}", 3, false);
    try testing.expectEqual(@as(u32, 200), try h.load("a", "1", true, m1));
    try testing.expectEqual(@as(u32, 200), try h.load("b", "1", true, m2));
    try testing.expectEqual(@as(u32, 200), try h.load("c", "1", true, m3));
    // The static path wins, then the most static segments, then all-parameter.
    try testing.expectEqualStrings("{\"v\":3}", find(try h.request("GET", "/webhook/user/me/posts"), .finished).?.payload);
    try testing.expectEqualStrings("{\"v\":1}", find(try h.request("GET", "/webhook/user/5/posts"), .finished).?.payload);
    try testing.expectEqualStrings("{\"v\":2}", find(try h.request("GET", "/webhook/x/5/y"), .finished).?.payload);
    try testing.expectEqual(@as(u32, 404), replyStatus(try h.request("GET", "/webhook/x/5")));
    try testing.expectEqual(@as(u32, 404), replyStatus(try h.request("POST", "/webhook/user/5/posts")));
    // Another active workflow cannot take the same method and path.
    try testing.expectEqual(@as(u32, 409), try h.load("d", "1", true, m3));
    // The same module again changes only the settings: deactivate.
    try testing.expectEqual(@as(u32, 200), try h.load("c", "2", false, m3));
    try testing.expectEqualStrings("2", h.st.modules[h.st.liveWorkflow("c").?].versionId());
    try testing.expectEqualStrings("{\"v\":1}", find(try h.request("GET", "/webhook/user/me/posts"), .finished).?.payload);
}

test "manual run with a given id and trace" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    try testing.expectEqual(@as(u32, 200), try h.load("wf", "v1", false, try module(a, "{}", 1, false)));
    const id = core.parseExecId("1234").?;
    const acts = try h.tick(&.{.{ .kind = .manual, .exec_id = id, .seq = heap.exec_flag_trace, .conn = 3, .payload = "wf\nv1\n{\"k\":[1]}" }});
    try testing.expectEqual(@as(u32, 202), replyStatus(acts));
    const st = find(acts, .started).?;
    try testing.expectEqual(id, st.exec_id);
    try testing.expect(st.aux & heap.exec_flag_manual != 0);
    try testing.expectEqualStrings("{\"step\":\"T\",\"items\":{\"k\":[1]}}", find(acts, .trace_items).?.payload);
    try testing.expectEqualStrings("{\"v\":1}", find(acts, .finished).?.payload);
    // A wrong version, an unknown workflow and an id the core made fail.
    try testing.expectEqual(@as(u32, 409), replyStatus(try h.tick(&.{.{ .kind = .manual, .exec_id = id, .conn = 3, .payload = "wf\nv0\nnull" }})));
    try testing.expectEqual(@as(u32, 404), replyStatus(try h.tick(&.{.{ .kind = .manual, .exec_id = id, .conn = 3, .payload = "zz\n\nnull" }})));
    try testing.expectEqual(@as(u32, 400), replyStatus(try h.tick(&.{.{ .kind = .manual, .exec_id = 5, .conn = 3, .payload = "wf\n\nnull" }})));
    try testing.expectEqual(core.LogMode.skip, h.st.log_modes[0]);
}

test "module store compacts when full" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    // Each load replaces the last one: the store (16 KB) holds few modules,
    // so later loads reuse the memory of retired ones.
    var i: u32 = 0;
    while (i < 40) : (i += 1) {
        const m = try module(a, "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"p\"}]}", @floatFromInt(i), false);
        try testing.expectEqual(@as(u32, 200), try h.load("wf", "v", true, m));
        const r = try h.request("POST", "/webhook/p");
        var want: [32]u8 = undefined;
        try testing.expectEqualStrings(try std.fmt.bufPrint(&want, "{{\"v\":{d}}}", .{i}), find(r, .finished).?.payload);
    }
    try testing.expect(h.st.nmodules <= 4);
}

test "a resume needs the signature of its execution" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    const key: [32]u8 = @splat(7);
    _ = try h.tick(&.{.{ .kind = .secret, .payload = &key }});
    // A second secret does not replace the first.
    const other: [32]u8 = @splat(9);
    _ = try h.tick(&.{.{ .kind = .secret, .payload = &other }});
    try testing.expectEqual(core.LogMode.skip, h.st.log_modes[0]);
    try testing.expectEqual(@as(u32, 200), try h.load("wf", "v1", false, try module(a, "{}", 1, true)));
    const id = core.parseExecId("77").?;
    const acts = try h.tick(&.{.{ .kind = .manual, .exec_id = id, .conn = 3, .payload = "wf\n\nnull" }});
    const snap = try a.dupe(u8, find(acts, .snapshot).?.payload);
    var sb: [32]u8 = undefined;
    const sig = core.resumeSignature(&h.st, id, &sb).?;
    try testing.expectEqual(@as(usize, 32), sig.len);
    const bad = "POST /resume/77/0?signature=00000000000000000000000000000000\n{}\n{\"approved\":true}";
    try testing.expectEqual(@as(u32, 403), replyStatus(try h.tick(&.{.{ .kind = .http_request, .conn = 9, .payload = bad }})));
    try testing.expectEqual(@as(u32, 403), replyStatus(try h.tick(&.{.{ .kind = .http_request, .conn = 9, .payload = "POST /resume/77\n{}\n{}" }})));
    const good = try std.fmt.allocPrint(a, "POST /resume/77?signature={s}\n{{}}\n{{\"approved\":true}}", .{sig});
    const done = try h.tick(&.{ .{ .kind = .restore, .exec_id = id, .payload = snap }, .{ .kind = .http_request, .conn = 9, .payload = good } });
    try testing.expectEqual(@as(u32, 202), replyStatus(done));
    try testing.expectEqualStrings("{\"v\":1,\"x\":{\"approved\":true}}", find(done, .finished).?.payload);
}

test "regression: an execution finished later in the batch does not run (fuzz)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    // A module that does an effect (not an approval: it stays loaded).
    var asm_: Asm = .{ .gpa = a };
    const st = try asm_.step("Call", .node);
    asm_.beginFunc();
    try asm_.emitBc(.loadi, 1, st);
    try asm_.emit(.@"suspend", @backingInt(@import("module.zig").EffectKind.node), 2, 1, 0);
    try asm_.emit(.ret, 0, 2, 0, 0);
    try asm_.endFunc("run", 1, 3, 0);
    const bytes = try asm_.finish();
    const acts = try h.tick(&.{ .{ .kind = .load_module, .payload = bytes }, .{ .kind = .start, .aux = 0, .payload = "{}" } });
    const d = find(acts, .dispatch).?;
    // The result makes it ready; the cancel in the same batch finishes it.
    const out = try h.tick(&.{ .{ .kind = .effect_ok, .exec_id = d.exec_id, .seq = d.seq, .payload = "1" }, .{ .kind = .cancel, .exec_id = d.exec_id } });
    try testing.expectEqual(@as(u32, @backingInt(heap.ExecStatus.cancelled)), find(out, .finished).?.aux);
    try core.checkInvariants(&h.st);
    try testing.expectEqual(@as(u32, 0), h.st.liveExecutions());
    // The slot is free once: the next two starts take two different slots.
    _ = try h.tick(&.{ .{ .kind = .start, .aux = 0, .payload = "{}" }, .{ .kind = .start, .aux = 0, .payload = "{}" } });
    try core.checkInvariants(&h.st);
    try testing.expectEqual(@as(u32, 2), h.st.liveExecutions());
}

test "regression: full parked and pending tables do not stop the shard (load test)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const cfg: core.Config = .{ .slots = 8, .region_counts = .{ 8, 2, 1, 1 }, .region_sizes = .{ 4 << 10, 64 << 10, 256 << 10, 1 << 20 }, .max_parked = 2, .max_timers = 16, .max_pending = 3, .max_actions = 128, .max_batch_events = 16, .module_bytes = 1 << 14, .natives_total = 1 << 10, .max_modules = 2, .max_routes = 2, .max_schedules = 2, .max_zones = 2 };
    var h: Harness = .{ .st = try core.State.init(a, cfg), .scratch = Arena.init(try a.alloc(u8, 1 << 20)), .gpa = a };
    const m = try module(a, "{}", 1, true);
    _ = try h.tick(&.{.{ .kind = .load_module, .payload = m }});
    // Six approvals: two park, one more waits in memory, the rest end
    // with `limit` because the pending table is full.
    var evs: [6]core.Event = @splat(.{ .kind = .start, .aux = 0, .payload = "{}" });
    const acts = try h.tick(&evs);
    try core.checkInvariants(&h.st);
    try testing.expectEqual(@as(u32, 2), h.st.parkedCount());
    var limits: u32 = 0;
    for (acts) |act| {
        if (act.kind == .finished and act.aux == @backingInt(heap.ExecStatus.limit)) limits += 1;
    }
    try testing.expectEqual(@as(u32, 3), limits);
    try testing.expectEqual(@as(u32, 1), h.st.liveExecutions());
}

test "regression: a full module table says why and frees when parked executions end (gym)" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    const waits = try module(a, "{}", 1, true);
    var ids: [4]u64 = undefined;
    var snaps: [4][]const u8 = undefined;
    // Four workflows, each with one parked execution, then unloaded: the
    // parked executions keep all four modules of the table.
    for (0..4) |i| {
        const id = try std.fmt.allocPrint(a, "wf{d}", .{i});
        try testing.expectEqual(@as(u32, 200), try h.load(id, "v1", false, waits));
        ids[i] = core.parseExecId(try std.fmt.allocPrint(a, "{d}", .{500 + i})).?;
        const p = try std.fmt.allocPrint(a, "{s}\nv1\nnull", .{id});
        const acts = try h.tick(&.{.{ .kind = .manual, .exec_id = ids[i], .conn = 3, .payload = p }});
        try testing.expectEqual(@as(u32, 202), replyStatus(acts));
        // The approval evicts the execution; the shell keeps the snapshot.
        snaps[i] = try a.dupe(u8, find(acts, .snapshot).?.payload);
        _ = try h.tick(&.{.{ .kind = .unload_workflow, .conn = 7, .payload = id }});
    }
    const p = try std.fmt.allocPrint(a, "{{\"workflowId\":\"new\",\"versionId\":\"v1\",\"active\":false,\"webhookPrefix\":\"/webhook\"}}\n{s}", .{waits});
    const full = find(try h.tick(&.{.{ .kind = .load_workflow, .conn = 7, .payload = p }}), .reply).?;
    try testing.expectEqual(@as(u32, 507), full.aux);
    try testing.expect(std.mem.indexOf(u8, full.payload, "--max-modules") != null);
    // Ending one parked execution frees its module in the next batch.
    _ = try h.tick(&.{ .{ .kind = .restore, .exec_id = ids[0], .payload = snaps[0] }, .{ .kind = .cancel, .exec_id = ids[0] } });
    _ = try h.tick(&.{});
    try testing.expectEqual(@as(u32, 200), try h.load("new", "v1", false, waits));
}

/// `run(t) { await wait({ duration: <ms> }); r = await Call({}); return { v: r.v } }`.
/// A retry wait of n8n (`<node> (retry)`) compiles to the same wait step.
fn waitThenCall(gpa: std.mem.Allocator, ms: f64) ![]u8 {
    const EK = @import("module.zig").EffectKind;
    var a: Asm = .{ .gpa = gpa, .meta = "{\"triggers\":[{\"kind\":\"webhook\",\"path\":\"w\"}]}" };
    defer a.deinit();
    const sleep = try a.step("Call (retry)", .wait);
    const call = try a.step("Call", .node);
    a.beginFunc();
    try a.emit(.newobj, 0, 1, 0, 0);
    try a.emitBc(.loadk, 2, try a.number(ms));
    try a.emit(.setprop, 0, 1, try a.str("duration"), 2);
    try a.emitBc(.loadi, 3, sleep);
    try a.emit(.@"suspend", @backingInt(EK.wait), 4, 3, 1);
    try a.emit(.newobj, 0, 5, 0, 0);
    try a.emitBc(.loadi, 3, call);
    try a.emit(.@"suspend", @backingInt(EK.node), 6, 3, 5);
    // A result of `null` throws here: the run ends with an error.
    try a.emit(.getprop, 0, 7, 6, try a.str("v"));
    try a.emit(.newobj, 0, 8, 0, 0);
    try a.emit(.setprop, 0, 8, try a.str("v"), 7);
    try a.emit(.ret, 0, 8, 0, 0);
    try a.endFunc("run", 1, 9, 0);
    return a.finish();
}

const WaitEnd = enum { ok, err, attention };

/// A webhook run that waits `ms`, then ends as `end`. Returns the reply,
/// which must go to the request's own connection (9).
fn webhookAfterWait(ms: f64, end: WaitEnd) !core.Action {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    try testing.expectEqual(@as(u32, 200), try h.load("wf", "v1", true, try waitThenCall(a, ms)));
    const acts = try h.request("POST", "/webhook/w");
    try testing.expect(find(acts, .reply) == null);
    const id = find(acts, .started).?.exec_id;
    const evicted = ms >= @as(f64, @floatFromInt(h.st.cfg.evict_wait_ms));
    const snap: ?[]const u8 = if (find(acts, .snapshot)) |s| try a.dupe(u8, s.payload) else null;
    try testing.expectEqual(evicted, snap != null);

    // The timer comes due. An evicted run asks for its snapshot first.
    h.now += @intFromFloat(ms);
    var woke = try h.tick(&.{});
    if (snap) |sp| {
        try testing.expectEqual(id, find(woke, .wake).?.exec_id);
        woke = try h.tick(&.{.{ .kind = .restore, .exec_id = id, .payload = sp }});
    }
    const call = find(woke, .dispatch).?;
    const done = switch (end) {
        .ok => try h.tick(&.{.{ .kind = .effect_ok, .exec_id = id, .seq = call.seq, .payload = "{\"v\":7}" }}),
        .err => try h.tick(&.{.{ .kind = .effect_ok, .exec_id = id, .seq = call.seq, .payload = "null" }}),
        .attention => try h.tick(&.{.{ .kind = .effect_err, .exec_id = id, .seq = call.seq, .payload = "down" }}),
    };
    const r = find(done, .reply) orelse return error.NoReply;
    return .{ .kind = r.kind, .conn = r.conn, .aux = r.aux, .payload = try testing.allocator.dupe(u8, r.payload) };
}

test "regression: a webhook run answers on its connection after a wait (ok, error, needs_attention; evicted or not)" {
    // Load test: runs that waited (retry waits of 1 s and more) finished,
    // but their webhook never got an answer: the restore of an evicted run
    // dropped the connection.
    for ([_]f64{ 200, 1000, 3000 }) |ms| {
        for ([_]WaitEnd{ .ok, .err, .attention }) |end| {
            const r = try webhookAfterWait(ms, end);
            defer testing.allocator.free(r.payload);
            try testing.expectEqual(@as(u64, 9), r.conn);
            switch (end) {
                .ok => {
                    try testing.expectEqual(@as(u32, 200), r.aux);
                    try testing.expectEqualStrings("{\"v\":7}", r.payload);
                },
                .err => try testing.expectEqual(@as(u32, 500), r.aux),
                .attention => {
                    try testing.expectEqual(@as(u32, 500), r.aux);
                    try testing.expectEqualStrings("{\"status\":\"needs_attention\"}", r.payload);
                },
            }
        }
    }
}

test "regression: after a recovery, runs from before it do not answer a connection" {
    // A connection token of the old process can match a new connection.
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var h = try Harness.init(a);
    try testing.expectEqual(@as(u32, 200), try h.load("wf", "v1", true, try waitThenCall(a, 5000)));
    const live = find(try h.request("POST", "/webhook/w"), .started).?.exec_id;
    const acts = try h.request("POST", "/webhook/w");
    _ = live;
    const parked = find(acts, .started).?.exec_id;
    const snap = try a.dupe(u8, find(acts, .snapshot).?.payload);
    _ = try h.tick(&.{.{ .kind = .recover }});
    h.now += 5000;
    _ = try h.tick(&.{});
    const woke = try h.tick(&.{.{ .kind = .restore, .exec_id = parked, .payload = snap }});
    var done = try h.tick(&.{.{ .kind = .effect_ok, .exec_id = parked, .seq = find(woke, .dispatch).?.seq, .payload = "{\"v\":1}" }});
    try testing.expect(find(done, .finished) != null);
    try testing.expect(find(done, .reply) == null);
    done = try h.tick(&.{});
    try testing.expect(find(done, .reply) == null);
}
