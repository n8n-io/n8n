//! Differential runner: drive the core with a fixture (spec section 6) and
//! produce the same JSON document as the Node.js reference runner.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const module = core_lib.module;
const json_enc = core_lib.json;
const Arena = core_lib.arena.Arena;
const triggers = @import("triggers.zig");

pub const Result = struct { output: []u8, batches: u32 };

const Fixture = struct {
    trigger: []const u8,
    now: i64,
    seed: u64,
    effects: ?std.json.ObjectMap,
    /// Run with tracing on; the output lists the ctx.trace calls.
    trace: bool,
    /// `execution` (spec 6): mode, id and resume URL bases. Null when absent.
    execution: ?std.json.ObjectMap,
    /// `vars` as JSON text, or null.
    vars: ?[]const u8,
    /// `staticData`: the workflow static data at the start (spec 9.7), as
    /// JSON text, or null. With it, the output has the document at the end.
    static_data: ?[]const u8 = null,
};

fn stringify(gpa: std.mem.Allocator, v: std.json.Value) ![]u8 {
    return std.json.Stringify.valueAlloc(gpa, v, .{});
}

fn parseFixture(gpa: std.mem.Allocator, root: std.json.Value) !Fixture {
    if (root != .object) return error.BadFixture;
    const obj = root.object;
    const trigger = if (obj.get("trigger")) |t| try stringify(gpa, t) else "null";
    const now: i64 = if (obj.get("now")) |n| switch (n) {
        .integer => |i| i,
        .float => |f| @intFromFloat(f),
        else => 0,
    } else 0;
    const seed: u64 = if (obj.get("seed")) |n| switch (n) {
        .integer => |i| @bitCast(i),
        .string, .number_string => |t| std.fmt.parseInt(u64, t, 10) catch 0,
        else => 0,
    } else 0;
    const effects = if (obj.get("effects")) |e| (if (e == .object) e.object else null) else null;
    const trace = if (obj.get("trace")) |t| t == .bool and t.bool else false;
    const execution = if (obj.get("execution")) |e| (if (e == .object) e.object else null) else null;
    const vars = if (obj.get("vars")) |v| try stringify(gpa, v) else null;
    const static_data = if (obj.get("staticData")) |v| (if (v == .object) try stringify(gpa, v) else return error.BadFixture) else null;
    return .{ .trigger = trigger, .now = now, .seed = seed, .effects = effects, .trace = trace, .execution = execution, .vars = vars, .static_data = static_data };
}

/// Look up the fixture result for a step occurrence: `{ ok, json }`.
fn fixtureResult(gpa: std.mem.Allocator, fx: Fixture, step_name: []const u8, occ: u32) !struct { ok: bool, bytes: []const u8 } {
    const effects = fx.effects orelse return .{ .ok = true, .bytes = "null" };
    const list = effects.get(step_name) orelse return .{ .ok = true, .bytes = "null" };
    if (list != .array or list.array.items.len == 0) return .{ .ok = true, .bytes = "null" };
    const item = list.array.items[occ % list.array.items.len];
    if (item == .object) {
        if (item.object.get("$error")) |m| {
            return .{ .ok = false, .bytes = if (m == .string) m.string else try stringify(gpa, m) };
        }
    }
    return .{ .ok = true, .bytes = try stringify(gpa, item) };
}

pub fn run(gpa: std.mem.Allocator, module_bytes: []const u8, fixture_text: []const u8) !Result {
    var arena_state = std.heap.ArenaAllocator.init(gpa);
    defer arena_state.deinit();
    const a = arena_state.allocator();
    const parsed = try std.json.parseFromSliceLeaky(std.json.Value, a, fixture_text, .{});
    const fx = try parseFixture(a, parsed);

    const cfg: core.Config = .{
        .slots = 8,
        .region_counts = .{ 8, 8, 4, 2 },
        .max_parked = 64,
        .max_timers = 256,
        .max_pending = 256,
        .max_actions = 1024,
        .max_routes = 4,
        .module_bytes = 4 << 20,
        .natives_total = 1 << 16,
        .max_modules = 4,
        .trace_effects = true,
        .immediate_retries = true,
        .exact_seed = fx.seed,
        // The fixture gives the trigger value; slots never fire here.
        .schedules = false,
    };
    var st = try core.State.init(a, cfg);
    const scratch_buf = try a.alloc(u8, 32 << 20);
    var scratch = Arena.init(scratch_buf);

    var events: std.ArrayList(core.Event) = .empty;
    // The time zones of the module come first, as the server sends them.
    try triggers.zoneEvents(a, &events, module_bytes);
    const flags: u32 = if (fx.trace) core_lib.heap.exec_flag_trace else 0;
    if (fx.execution == null and fx.vars == null and fx.static_data == null) {
        try events.append(a, .{ .kind = .load_module, .payload = module_bytes });
        try events.append(a, .{ .kind = .start, .aux = 0, .seq = flags, .payload = fx.trigger });
    } else {
        // As n8n loads it: the URL bases and variables reach ctx.execution()
        // and ctx.vars() through the same events.
        const ex = fx.execution;
        const str = struct {
            fn get(o: ?std.json.ObjectMap, k: []const u8) ?[]const u8 {
                const v = (o orelse return null).get(k) orelse return null;
                return if (v == .string) v.string else null;
            }
        }.get;
        const base = str(ex, "resumeUrlBase") orelse "/resume";
        const form = str(ex, "resumeFormUrlBase") orelse base;
        const header = try std.fmt.allocPrint(a, "{{\"workflowId\":\"fixture\",\"active\":false,\"resumeUrlBase\":\"{s}\",\"resumeFormUrlBase\":\"{s}\"{s}{s}}}\n", .{ base, form, if (fx.static_data != null) ",\"staticData\":" else "", fx.static_data orelse "" });
        try events.append(a, .{ .kind = .load_workflow, .payload = try std.mem.concat(a, u8, &.{ header, module_bytes }) });
        if (fx.vars) |v| try events.append(a, .{ .kind = .set_vars, .payload = v });
        if (std.mem.eql(u8, str(ex, "mode") orelse "production", "test")) {
            const id = core.parseExecId(str(ex, "id") orelse "1") orelse return error.BadFixture;
            try events.append(a, .{ .kind = .manual, .exec_id = id, .seq = flags, .payload = try std.mem.concat(a, u8, &.{ "fixture\n\n", fx.trigger }) });
        } else {
            try events.append(a, .{ .kind = .start, .aux = 0, .seq = flags, .payload = fx.trigger });
        }
    }

    var out: std.ArrayList(u8) = .empty;
    var effects_json: std.ArrayList(u8) = .empty;
    var neffects: u32 = 0;
    var trace_json: std.ArrayList(u8) = .empty;
    var occ = std.StringHashMap(u32).init(a);
    var snapshots = std.AutoHashMap(u64, []u8).init(a);
    var status: []const u8 = "stuck";
    var static_out: ?[]const u8 = fx.static_data;
    var result: ?[]const u8 = null;
    var now = fx.now;
    var batches: u32 = 0;
    var done = false;

    while (!done and batches < 100_000) : (batches += 1) {
        const o = try core.step(&st, now, events.items, &scratch);
        events.clearRetainingCapacity();
        var next: std.ArrayList(core.Event) = .empty;
        // Snapshots first: a result in this batch may target an execution
        // that the same batch evicted.
        for (st.emitted()) |act| if (act.kind == .snapshot) try snapshots.put(act.exec_id, try a.dupe(u8, act.payload));
        for (st.emitted()) |act| {
            const m = if (act.kind == .static_data or act.kind == .reserve_none) undefined else st.moduleAt(act.module);
            switch (act.kind) {
                .trace => {
                    if (neffects > 0) try effects_json.append(a, ',');
                    neffects += 1;
                    try effects_json.appendSlice(a, "{\"step\":");
                    try writeJsonString(a, &effects_json, m.str(m.steps[act.step].name));
                    try effects_json.appendSlice(a, ",\"kind\":\"");
                    try effects_json.appendSlice(a, module.effect_kind_names[@backingInt(act.effect_kind)]);
                    try effects_json.appendSlice(a, "\"");
                    if (act.payload.len > 0) {
                        try effects_json.appendSlice(a, ",\"args\":");
                        try effects_json.appendSlice(a, act.payload);
                    }
                    try effects_json.append(a, '}');
                },
                .dispatch => {
                    const name = m.str(m.steps[act.step].name);
                    const gop = try occ.getOrPut(name);
                    if (!gop.found_existing) gop.value_ptr.* = 0;
                    const r = try fixtureResult(a, fx, name, gop.value_ptr.*);
                    gop.value_ptr.* += 1;
                    if (snapshots.get(act.exec_id)) |snap| try next.append(a, .{ .kind = .restore, .exec_id = act.exec_id, .payload = snap });
                    try next.append(a, .{ .kind = if (r.ok) .effect_ok else .effect_err, .exec_id = act.exec_id, .seq = act.seq, .payload = try a.dupe(u8, r.bytes) });
                },
                .snapshot => {},
                .wake => if (snapshots.get(act.exec_id)) |snap| {
                    try next.append(a, .{ .kind = .restore, .exec_id = act.exec_id, .payload = snap });
                },
                .finished => {
                    status = switch (@as(core_lib.heap.ExecStatus, @fromBackingInt(@intCast(act.aux)))) {
                        .done => "ok",
                        .failed => "error",
                        .limit => "limit",
                        .cancelled => "cancelled",
                        .skipped => "skipped",
                        else => "error",
                    };
                    result = if (act.payload.len == 0) null else try a.dupe(u8, act.payload);
                    done = true;
                },
                .attention => {
                    status = "needs_attention";
                    var rb: std.ArrayList(u8) = .empty;
                    try rb.appendSlice(a, "{\"step\":");
                    try writeJsonString(a, &rb, m.str(m.steps[act.step].name));
                    try rb.append(a, '}');
                    result = rb.items;
                    done = true;
                },
                .trace_items => {
                    if (trace_json.items.len > 0) try trace_json.append(a, ',');
                    try trace_json.appendSlice(a, act.payload);
                },
                .reserve_none => {},
                .static_data => if (act.aux == 0) {
                    const nl = std.mem.indexOfScalar(u8, act.payload, '\n') orelse continue;
                    static_out = try a.dupe(u8, act.payload[nl + 1 ..]);
                },
                .reply, .drop_snapshot, .status, .started => {},
            }
        }
        scratch.reset();
        // Snapshots must be restored before effects for the same execution.
        for (next.items) |ev| {
            if (ev.kind == .restore) {
                try events.append(a, ev);
                _ = snapshots.remove(ev.exec_id);
            }
        }
        for (next.items) |ev| if (ev.kind != .restore) try events.append(a, ev);
        try core.checkInvariants(&st);
        if (done) break;
        if (events.items.len == 0 and !o.has_ready) {
            const t = o.next_timer_ms orelse break;
            now = @max(now, t);
        }
    }

    try out.appendSlice(gpa, "{\"status\":\"");
    try out.appendSlice(gpa, status);
    try out.append(gpa, '"');
    if (result) |r| {
        try out.appendSlice(gpa, ",\"result\":");
        try out.appendSlice(gpa, r);
    }
    try out.appendSlice(gpa, ",\"effects\":[");
    try out.appendSlice(gpa, effects_json.items);
    try out.append(gpa, ']');
    if (static_out) |sd| {
        try out.appendSlice(gpa, ",\"staticData\":");
        try out.appendSlice(gpa, sd);
    }
    if (fx.trace) {
        try out.appendSlice(gpa, ",\"trace\":[");
        try out.appendSlice(gpa, trace_json.items);
        try out.append(gpa, ']');
    }
    try out.append(gpa, '}');
    return .{ .output = try out.toOwnedSlice(gpa), .batches = batches };
}

/// Re-print JSON text in one canonical form, so formatting does not matter.
pub fn canonical(gpa: std.mem.Allocator, text: []const u8) ![]u8 {
    return canonicalParsed(gpa, text) catch minify(gpa, text);
}

/// Drop whitespace outside strings. Used when std.json rejects the text,
/// for example a lone surrogate escape.
fn minify(gpa: std.mem.Allocator, text: []const u8) ![]u8 {
    var out: std.ArrayList(u8) = .empty;
    var in_str = false;
    var esc = false;
    for (text) |c| {
        if (in_str) {
            try out.append(gpa, c);
            if (esc) esc = false else if (c == '\\') esc = true else if (c == '"') in_str = false;
            continue;
        }
        if (c == ' ' or c == '\n' or c == '\r' or c == '\t') continue;
        if (c == '"') in_str = true;
        try out.append(gpa, c);
    }
    return out.toOwnedSlice(gpa);
}

fn canonicalParsed(gpa: std.mem.Allocator, text: []const u8) ![]u8 {
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const v = try std.json.parseFromSliceLeaky(std.json.Value, arena.allocator(), text, .{});
    return std.json.Stringify.valueAlloc(gpa, v, .{});
}

fn writeJsonString(a: std.mem.Allocator, out: *std.ArrayList(u8), s: []const u8) !void {
    var buf: [4096]u8 = undefined;
    var ar = Arena.init(&buf);
    var b = ar.builder();
    json_enc.writeString(&b, s) catch return error.NameTooLong;
    try out.appendSlice(a, b.bytes());
}

/// `wfrt bench-node`: run the fixture's execution `n` times, one after the
/// other, in one core with the server's settings: no effect traces, no
/// invariant checks, results from a table built once. The caller measures
/// the process (bench/perf/node-cpu.sh); the cost per execution is the
/// difference between two values of `n`. Returns the executions that ended
/// "ok".
pub fn bench(gpa: std.mem.Allocator, module_bytes: []const u8, fixture_text: []const u8, n: u32) !u32 {
    var arena_state = std.heap.ArenaAllocator.init(gpa);
    defer arena_state.deinit();
    const a = arena_state.allocator();
    const parsed = try std.json.parseFromSliceLeaky(std.json.Value, a, fixture_text, .{});
    const fx = try parseFixture(a, parsed);
    const cfg: core.Config = .{
        .slots = 8,
        .region_counts = .{ 8, 8, 4, 2 },
        .max_parked = 64,
        .max_timers = 256,
        .max_pending = 256,
        .max_actions = 1024,
        .max_routes = 4,
        .module_bytes = 4 << 20,
        .natives_total = 1 << 16,
        .max_modules = 4,
        .immediate_retries = true,
        .exact_seed = fx.seed,
        .schedules = false,
    };
    var st = try core.State.init(a, cfg);
    const scratch_buf = try a.alloc(u8, 32 << 20);
    var scratch = Arena.init(scratch_buf);
    // The answers of each step, in order, built once.
    var answers = std.StringHashMap([]const struct { ok: bool, bytes: []const u8 }).init(a);
    if (fx.effects) |effects| {
        var it = effects.iterator();
        while (it.next()) |kv| {
            const len = if (kv.value_ptr.* == .array) kv.value_ptr.array.items.len else 0;
            const list = try a.alloc(@typeInfo(@TypeOf(answers.get("").?)).pointer.child, len);
            for (list, 0..) |*ans, k| {
                const r = try fixtureResult(a, fx, kv.key_ptr.*, @intCast(k));
                ans.* = .{ .ok = r.ok, .bytes = r.bytes };
            }
            try answers.put(kv.key_ptr.*, list);
        }
    }
    var events: std.ArrayList(core.Event) = .empty;
    try triggers.zoneEvents(a, &events, module_bytes);
    try events.append(a, .{ .kind = .load_module, .payload = module_bytes });
    var occ = std.StringHashMap(u32).init(a);
    var snapshots = std.AutoHashMap(u64, []u8).init(a);
    var next: std.ArrayList(core.Event) = .empty;
    var ok: u32 = 0;
    var i: u32 = 0;
    while (i < n) : (i += 1) {
        occ.clearRetainingCapacity();
        try events.append(a, .{ .kind = .start, .aux = 0, .seq = 0, .payload = fx.trigger });
        var done = false;
        var batches: u32 = 0;
        while (!done and batches < 100_000) : (batches += 1) {
            _ = try core.step(&st, fx.now, events.items, &scratch);
            events.clearRetainingCapacity();
            next.clearRetainingCapacity();
            for (st.emitted()) |act| if (act.kind == .snapshot) try snapshots.put(act.exec_id, try a.dupe(u8, act.payload));
            for (st.emitted()) |act| switch (act.kind) {
                .dispatch => {
                    const m = st.moduleAt(act.module);
                    const name = m.str(m.steps[act.step].name);
                    const gop = try occ.getOrPut(name);
                    if (!gop.found_existing) gop.value_ptr.* = 0;
                    const list = answers.get(name) orelse &.{};
                    const ans: @TypeOf(list[0]) = if (list.len == 0) .{ .ok = true, .bytes = "null" } else list[gop.value_ptr.* % list.len];
                    gop.value_ptr.* += 1;
                    if (snapshots.get(act.exec_id)) |snap| try next.append(a, .{ .kind = .restore, .exec_id = act.exec_id, .payload = snap });
                    try next.append(a, .{ .kind = if (ans.ok) .effect_ok else .effect_err, .exec_id = act.exec_id, .seq = act.seq, .payload = ans.bytes });
                },
                .wake => if (snapshots.get(act.exec_id)) |snap| {
                    try next.append(a, .{ .kind = .restore, .exec_id = act.exec_id, .payload = snap });
                },
                .finished => {
                    if (@as(core_lib.heap.ExecStatus, @fromBackingInt(@intCast(act.aux))) == .done) ok += 1;
                    done = true;
                },
                .attention => done = true,
                else => {},
            };
            scratch.reset();
            for (next.items) |ev| if (ev.kind == .restore) {
                try events.append(a, ev);
                _ = snapshots.remove(ev.exec_id);
            };
            for (next.items) |ev| if (ev.kind != .restore) try events.append(a, ev);
        }
    }
    return ok;
}
