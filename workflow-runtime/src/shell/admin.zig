//! The admin API of `wfrt serve` (spec 9.1 and 9.2): request routing,
//! bearer auth, the bodies of admin requests as core events, the event
//! stream encoder and its bounded queue. Pure functions and data; the
//! server does the I/O.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const heap = core_lib.heap;
const http = @import("http.zig");
const Out = @import("creds.zig").Out;

pub const Route = union(enum) {
    put_workflow: []const u8,
    delete_workflow: []const u8,
    /// `GET /_admin/workflows/<id>/static-data` (spec 9.7).
    get_static_data: []const u8,
    list_workflows,
    put_credentials,
    put_variables,
    start_execution,
    cancel_execution: []const u8,
    events,
    @"resume": struct { id: []const u8, seq: []const u8 },
    /// `POST /_admin/services/<callId>`: the answer to a service call (spec 9.9).
    answer_service: []const u8,
    not_found,
};

/// Map a request to an admin operation. Ids in paths are plain segments.
pub fn route(method: []const u8, target: []const u8) Route {
    const q = std.mem.indexOfScalar(u8, target, '?');
    const path = target[0 .. q orelse target.len];
    const prefix = "/_admin/";
    if (!std.mem.startsWith(u8, path, prefix)) return .not_found;
    var it = std.mem.splitScalar(u8, path[prefix.len..], '/');
    const a = it.next() orelse "";
    const b = it.next();
    const c = it.next();
    if (it.next() != null) return .not_found;
    const eq = std.mem.eql;
    if (eq(u8, a, "workflows")) {
        if (b == null or b.?.len == 0) return if (eq(u8, method, "GET") and c == null) .list_workflows else .not_found;
        if (c) |sub| return if (eq(u8, sub, "static-data") and eq(u8, method, "GET")) .{ .get_static_data = b.? } else .not_found;
        if (eq(u8, method, "PUT")) return .{ .put_workflow = b.? };
        if (eq(u8, method, "DELETE")) return .{ .delete_workflow = b.? };
        return .not_found;
    }
    if (eq(u8, a, "credentials") and b == null and eq(u8, method, "PUT")) return .put_credentials;
    if (eq(u8, a, "variables") and b == null and eq(u8, method, "PUT")) return .put_variables;
    if (eq(u8, a, "executions")) {
        if (b == null and eq(u8, method, "POST")) return .start_execution;
        if (b != null and b.?.len > 0 and c == null and eq(u8, method, "DELETE")) return .{ .cancel_execution = b.? };
        return .not_found;
    }
    if (eq(u8, a, "events") and b == null and eq(u8, method, "GET")) return .events;
    // Without a seq: the resume token of ctx.execution().
    if (eq(u8, a, "resume") and b != null and b.?.len > 0 and eq(u8, method, "POST")) return .{ .@"resume" = .{ .id = b.?, .seq = c orelse "" } };
    if (eq(u8, a, "services") and b != null and b.?.len > 0 and c == null and eq(u8, method, "POST")) return .{ .answer_service = b.? };
    return .not_found;
}

/// True when the head has `authorization: Bearer <secret>`. The compare
/// takes the same time for each secret of a given length.
pub fn authorized(head: []const u8, secret: []const u8) bool {
    const value = headerValue(head, "authorization") orelse return false;
    const scheme = "Bearer ";
    if (value.len != scheme.len + secret.len or !std.ascii.startsWithIgnoreCase(value, scheme)) return false;
    var diff: u8 = 0;
    for (value[scheme.len..], secret) |x, y| diff |= x ^ y;
    return diff == 0 and secret.len > 0;
}

pub fn headerValue(head: []const u8, name: []const u8) ?[]const u8 {
    var it = std.mem.splitSequence(u8, head, "\r\n");
    while (it.next()) |line| {
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse continue;
        if (std.ascii.eqlIgnoreCase(std.mem.trim(u8, line[0..colon], " \t"), name)) return std.mem.trim(u8, line[colon + 1 ..], " \t");
    }
    return null;
}

pub const BodyError = error{ BadBody, BadModule, BadExecutionId, BadClockOffset, ClockDisabled, OutOfMemory };

/// The error of `POST /_admin/executions` with `clockOffsetMs` when `wfrt
/// serve` runs without `--test-clock` (CLOCK-OFFSET).
pub const clock_disabled_body = "{\"error\":\"clockOffsetMs needs wfrt serve --test-clock\"}";
/// The error when the offset is not an integer of at most 10 years in ms.
pub const clock_range_body = "{\"error\":\"clockOffsetMs must be an integer of at most 10 years in ms\"}";

/// `PUT /_admin/workflows/<id>`: the load_workflow payload, a JSON header
/// line, a newline, then the module bytes.
pub fn loadPayload(gpa: std.mem.Allocator, workflow_id: []const u8, body: []const u8) BodyError![]u8 {
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const root = std.json.parseFromSliceLeaky(std.json.Value, arena.allocator(), body, .{}) catch return error.BadBody;
    if (root != .object) return error.BadBody;
    const o = root.object;
    const version = strField(o, "versionId") orelse "";
    const prefix = strField(o, "webhookPrefix") orelse "/webhook";
    const resume_base = strField(o, "resumeUrlBase") orelse "/resume";
    const form_base = strField(o, "resumeFormUrlBase") orelse resume_base;
    if (resume_base.len > core.max_base or form_base.len > core.max_base) return error.BadBody;
    const b64 = strField(o, "module") orelse return error.BadModule;
    if (workflow_id.len == 0 or workflow_id.len > core.max_id or version.len > core.max_id or prefix.len > 64) return error.BadBody;
    const dec = std.base64.standard.Decoder;
    const n = dec.calcSizeForSlice(b64) catch return error.BadModule;
    var out: std.ArrayList(u8) = .empty;
    errdefer out.deinit(gpa);
    try out.appendSlice(gpa, "{\"workflowId\":");
    try appendJsonString(gpa, &out, workflow_id);
    try out.appendSlice(gpa, ",\"versionId\":");
    try appendJsonString(gpa, &out, version);
    try out.print(gpa, ",\"active\":{},\"saveData\":{},\"webhookPrefix\":", .{ boolField(o, "active"), boolField(o, "saveData") });
    try appendJsonString(gpa, &out, prefix);
    try out.appendSlice(gpa, ",\"resumeUrlBase\":");
    try appendJsonString(gpa, &out, resume_base);
    try out.appendSlice(gpa, ",\"resumeFormUrlBase\":");
    try appendJsonString(gpa, &out, form_base);
    // n8n's copy of the workflow static data (spec 9.7), on the header line.
    if (http.member(body, "staticData")) |raw| {
        const t = std.mem.trim(u8, raw, " \t\r\n");
        if (t.len == 0 or (t[0] != '{' and !std.mem.eql(u8, t, "null"))) return error.BadBody;
        try out.appendSlice(gpa, ",\"staticData\":");
        try appendMinified(gpa, &out, t);
    }
    try out.appendSlice(gpa, "}\n");
    const start = out.items.len;
    try out.appendNTimes(gpa, 0, n);
    dec.decode(out.items[start..], b64) catch return error.BadModule;
    return out.toOwnedSlice(gpa);
}

pub const Manual = struct { exec_id: u64, flags: u32, payload: []u8, clock_offset_ms: i64 = 0 };

/// `POST /_admin/executions`: the manual event. n8n execution ids are
/// numeric strings; a JSON number is accepted too. `test_clock` allows the
/// `clockOffsetMs` field, which only a test bed sets (CLOCK-OFFSET).
pub fn manualEvent(gpa: std.mem.Allocator, body: []const u8, test_clock: bool) BodyError!Manual {
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const root = std.json.parseFromSliceLeaky(std.json.Value, arena.allocator(), body, .{ .parse_numbers = false }) catch return error.BadBody;
    if (root != .object) return error.BadBody;
    const o = root.object;
    const wf = strField(o, "workflowId") orelse return error.BadBody;
    const version = strField(o, "versionId") orelse "";
    const id_text = switch (o.get("executionId") orelse return error.BadExecutionId) {
        .string => |t| t,
        .number_string => |t| t,
        else => return error.BadExecutionId,
    };
    const exec_id = core.parseExecId(id_text) orelse return error.BadExecutionId;
    if (exec_id & core.given_id_flag == 0) return error.BadExecutionId;
    if (std.mem.indexOfScalar(u8, wf, '\n') != null or std.mem.indexOfScalar(u8, version, '\n') != null) return error.BadBody;
    // A test bed can move the clock of this execution (CLOCK-OFFSET).
    var clock_offset_ms: i64 = 0;
    if (o.get("clockOffsetMs")) |v| {
        if (!test_clock) return error.ClockDisabled;
        // The body parses with `parse_numbers = false`, so the digits are
        // text: a float has a point or an exponent and fails the parse.
        clock_offset_ms = switch (v) {
            .number_string => |text| std.fmt.parseInt(i64, text, 10) catch return error.BadClockOffset,
            .integer => |n| n,
            else => return error.BadClockOffset,
        };
        if (clock_offset_ms > core.max_clock_offset_ms or clock_offset_ms < -core.max_clock_offset_ms) return error.BadClockOffset;
    }
    // Keep the trigger text as n8n sent it: numbers keep their digits.
    const trigger = if (http.member(body, "trigger")) |raw| std.mem.trim(u8, raw, " \t\r\n") else "null";
    var out: std.ArrayList(u8) = .empty;
    errdefer out.deinit(gpa);
    // The offset goes first, on its own line: the trigger can hold newlines,
    // so it must stay last (CLOCK-OFFSET).
    if (clock_offset_ms != 0) try out.print(gpa, "{s}{d}\n", .{ core.clock_offset_prefix, clock_offset_ms });
    try out.print(gpa, "{s}\n{s}\n{s}", .{ wf, version, if (trigger.len == 0) "null" else trigger });
    return .{ .exec_id = exec_id, .flags = if (boolField(o, "trace")) heap.exec_flag_trace else 0, .payload = try out.toOwnedSlice(gpa), .clock_offset_ms = clock_offset_ms };
}

/// JSON without the white space between tokens, so it fits on one line.
/// The text is valid JSON already (the body parsed).
fn appendMinified(gpa: std.mem.Allocator, out: *std.ArrayList(u8), text: []const u8) error{OutOfMemory}!void {
    var in_str = false;
    var esc = false;
    for (text) |c| {
        if (in_str) {
            try out.append(gpa, c);
            if (esc) {
                esc = false;
            } else if (c == '\\') {
                esc = true;
            } else if (c == '"') in_str = false;
            continue;
        }
        switch (c) {
            ' ', '\t', '\r', '\n' => {},
            '"' => {
                in_str = true;
                try out.append(gpa, c);
            },
            else => try out.append(gpa, c),
        }
    }
}

fn strField(o: std.json.ObjectMap, name: []const u8) ?[]const u8 {
    const v = o.get(name) orelse return null;
    return if (v == .string) v.string else null;
}

fn boolField(o: std.json.ObjectMap, name: []const u8) bool {
    const v = o.get(name) orelse return false;
    return v == .bool and v.bool;
}

// ---- events (spec 9.2) ----------------------------------------------------------

pub const Event = union(enum) {
    started: struct { exec: []const u8, workflow: []const u8, version: []const u8, manual: bool, trigger: []const u8 },
    step: struct { exec: []const u8, step: []const u8, status: []const u8, args: ?[]const u8 = null, result: ?[]const u8 = null, err: ?[]const u8 = null },
    /// `item` is the core's `{"step":..,"items":..}` object.
    trace: struct { exec: []const u8, item: []const u8 },
    waiting: struct { exec: []const u8, step: []const u8, resume_url: ?[]const u8 = null, signature: ?[]const u8 = null, wait_till: ?i64 = null },
    finished: struct { exec: []const u8, status: []const u8, result: ?[]const u8 = null, step: ?[]const u8 = null },
    /// The static data of a workflow changed (spec 9.7), or, with `err`, a
    /// change was not kept.
    static_data: struct { workflow: []const u8, doc: ?[]const u8 = null, err: ?[]const u8 = null },
    dropped: struct { count: u64 },
    /// A service call (spec 9.9): `line` is the event without its `at`
    /// member and closing brace (`ServiceCalls.line`).
    service: struct { line: []const u8 },

    /// `step` and `trace` events may be dropped when the queue is full.
    pub fn droppable(e: Event) bool {
        return e == .step or e == .trace;
    }
};

/// One event as one line of JSON, with its newline. With a counting `Out`
/// it gives the length of the line before it is written.
pub fn encode(out: *Out, ev: Event, at: i64) Out.Error!void {
    switch (ev) {
        .started => |e| {
            try out.put("{\"type\":\"started\",\"executionId\":");
            try writeJsonString(out, e.exec);
            try out.put(",\"workflowId\":");
            try writeJsonString(out, e.workflow);
            try out.put(",\"versionId\":");
            try writeJsonString(out, e.version);
            try out.put(if (e.manual) ",\"mode\":\"manual\",\"trigger\":" else ",\"mode\":\"trigger\",\"trigger\":");
            try out.put(if (e.trigger.len == 0) "null" else e.trigger);
        },
        .step => |e| {
            try out.put("{\"type\":\"step\",\"executionId\":");
            try writeJsonString(out, e.exec);
            try out.put(",\"step\":");
            try writeJsonString(out, e.step);
            try out.put(",\"status\":");
            try writeJsonString(out, e.status);
            if (e.args) |v| try member(out, "args", v);
            if (e.result) |v| try member(out, "result", v);
            if (e.err) |v| {
                try out.put(",\"error\":");
                try writeJsonString(out, v);
            }
        },
        .trace => |e| {
            try out.put("{\"type\":\"trace\",\"executionId\":");
            try writeJsonString(out, e.exec);
            std.debug.assert(e.item.len >= 2 and e.item[0] == '{');
            try out.byte(',');
            try out.put(e.item[1 .. e.item.len - 1]);
        },
        .waiting => |e| {
            try out.put("{\"type\":\"waiting\",\"executionId\":");
            try writeJsonString(out, e.exec);
            try out.put(",\"step\":");
            try writeJsonString(out, e.step);
            if (e.resume_url) |u| {
                try out.put(",\"resumeUrl\":");
                try writeJsonString(out, u);
            }
            if (e.signature) |sg| {
                try out.put(",\"signature\":");
                try writeJsonString(out, sg);
            }
            if (e.wait_till) |t| try printOut(out, ",\"waitTill\":{d}", .{t});
        },
        .finished => |e| {
            try out.put("{\"type\":\"finished\",\"executionId\":");
            try writeJsonString(out, e.exec);
            try out.put(",\"status\":");
            try writeJsonString(out, e.status);
            if (e.result) |v| try member(out, "result", v);
            if (e.step) |s| {
                try out.put(",\"step\":");
                try writeJsonString(out, s);
            }
        },
        .static_data => |e| if (e.err) |msg| {
            try out.put("{\"type\":\"staticDataRejected\",\"message\":");
            try writeJsonString(out, msg);
        } else {
            try out.put("{\"type\":\"staticData\",\"workflowId\":");
            try writeJsonString(out, e.workflow);
            try member(out, "staticData", e.doc orelse "{}");
        },
        .dropped => |e| try printOut(out, "{{\"type\":\"dropped\",\"count\":{d}", .{e.count}),
        .service => |e| {
            std.debug.assert(e.line.len >= 2 and e.line[0] == '{');
            try out.put(e.line);
        },
    }
    try printOut(out, ",\"at\":{d}}}\n", .{at});
}

/// Formatted text of at most 64 bytes.
fn printOut(out: *Out, comptime fmt: []const u8, args: anytype) Out.Error!void {
    var b: [64]u8 = undefined;
    try out.put(std.fmt.bufPrint(&b, fmt, args) catch unreachable);
}

/// A member whose value is JSON text from the core. Empty text is left out.
fn member(out: *Out, name: []const u8, v: []const u8) Out.Error!void {
    if (v.len == 0) return;
    try out.put(",\"");
    try out.put(name);
    try out.put("\":");
    try out.put(v);
}

/// A JSON string as ECMAScript `JSON.stringify` writes it.
pub fn writeJsonString(out: *Out, s: []const u8) Out.Error!void {
    try out.byte('"');
    var start: usize = 0;
    for (s, 0..) |c, i| {
        const rep: []const u8 = switch (c) {
            '"' => "\\\"",
            '\\' => "\\\\",
            '\n' => "\\n",
            '\r' => "\\r",
            '\t' => "\\t",
            0x08 => "\\b",
            0x0C => "\\f",
            0...0x07, 0x0B, 0x0E...0x1F => "",
            else => continue,
        };
        try out.put(s[start..i]);
        if (rep.len > 0) try out.put(rep) else try printOut(out, "\\u{x:0>4}", .{c});
        start = i + 1;
    }
    try out.put(s[start..]);
    try out.byte('"');
}

/// A JSON string as ECMAScript `JSON.stringify` writes it, for growing
/// buffers (the host frames).
pub fn appendJsonString(gpa: std.mem.Allocator, out: *std.ArrayList(u8), s: []const u8) !void {
    try out.append(gpa, '"');
    for (s) |c| {
        switch (c) {
            '"' => try out.appendSlice(gpa, "\\\""),
            '\\' => try out.appendSlice(gpa, "\\\\"),
            '\n' => try out.appendSlice(gpa, "\\n"),
            '\r' => try out.appendSlice(gpa, "\\r"),
            '\t' => try out.appendSlice(gpa, "\\t"),
            0x08 => try out.appendSlice(gpa, "\\b"),
            0x0C => try out.appendSlice(gpa, "\\f"),
            0...0x07, 0x0B, 0x0E...0x1F => try out.print(gpa, "\\u{x:0>4}", .{c}),
            else => try out.append(gpa, c),
        }
    }
    try out.append(gpa, '"');
}

/// Name of a finished status (spec 9.2).
pub fn statusName(st: heap.ExecStatus) []const u8 {
    return switch (st) {
        .done => "ok",
        .failed => "error",
        .limit => "limit",
        .needs_attention => "needs_attention",
        .cancelled => "cancelled",
        .skipped => "skipped",
        .ready, .parked => "error",
    };
}

pub fn stepStatusName(st: core.StepStatus) []const u8 {
    return switch (st) {
        .started => "started",
        .completed => "completed",
        .failed => "failed",
        .waiting => "waiting",
        .retrying => "retrying",
    };
}

/// Lines of the event stream that wait for the client. It is bounded: when
/// it is full, the oldest `step` and `trace` lines go first. `started` and
/// `finished` lines go only when the queue holds `hard_bytes` of them.
///
/// The lines live in a byte ring and their entries in an entry ring, both
/// reserved at startup. A line is contiguous: one that does not fit at the
/// end of the ring starts again at offset 0. When the ring has no room,
/// the oldest lines go, and a line larger than the ring is dropped.
pub const Queue = struct {
    gpa: std.mem.Allocator,
    buf: []u8,
    entries: []Entry,
    /// Entry indices; they only grow. `head` is the oldest entry that
    /// holds bytes, `tail` the next one.
    head: u64 = 0,
    tail: u64 = 0,
    /// Entries before this index are not droppable or are gone already.
    scan: u64 = 0,
    /// Bytes of the front line that the client has.
    front_sent: usize = 0,
    bytes: usize = 0,
    live: usize = 0,
    max_bytes: usize,
    max_entries: usize,
    hard_bytes: usize,
    /// Lines dropped since the start.
    dropped: u64 = 0,
    /// Lines dropped that the client was not told about.
    unreported: u64 = 0,
    /// A `dropped` line that goes before the front line.
    notice: [96]u8 = undefined,
    notice_len: usize = 0,
    notice_sent: usize = 0,

    const Entry = struct { off: usize, len: u32, droppable: bool, gone: bool };

    /// Reserve the rings: `hard_bytes` (4 x `max_bytes`) of lines and
    /// 4 x `max_entries` entries. Pages are touched on use.
    pub fn init(gpa: std.mem.Allocator, max_bytes: usize, max_entries: usize) !Queue {
        std.debug.assert(max_bytes > 0 and max_entries > 0);
        const hard = max_bytes * 4;
        return .{
            .gpa = gpa,
            .buf = try core_lib.arena.reserve(gpa, u8, hard),
            .entries = try core_lib.arena.reserve(gpa, Entry, max_entries * 4),
            .max_bytes = max_bytes,
            .max_entries = max_entries,
            .hard_bytes = hard,
        };
    }

    pub fn deinit(q: *Queue) void {
        q.gpa.free(q.buf);
        q.gpa.free(q.entries);
    }

    fn at(q: *Queue, i: u64) *Entry {
        return &q.entries[@intCast(i % q.entries.len)];
    }

    /// Room for a line of `len` bytes: a new entry whose bytes the caller
    /// writes now, before any other call. Null when the line is dropped.
    pub fn push(q: *Queue, len: usize, droppable: bool) ?[]u8 {
        std.debug.assert(q.tail - q.head <= q.entries.len);
        if (len == 0 or len > q.buf.len or len > std.math.maxInt(u32)) return q.dropNew();
        q.bytes += len;
        q.live += 1;
        var guard: usize = 0;
        while ((q.bytes > q.max_bytes or q.live > q.max_entries) and guard <= q.entries.len) : (guard += 1) {
            if (q.dropOldest(true)) continue;
            if (q.bytes <= q.hard_bytes and q.live <= q.max_entries * 4) break;
            if (!q.dropOldest(false)) break;
        }
        // Physical room: drop from the head until the line fits.
        const off = while (true) {
            q.reclaim();
            if (q.tail - q.head < q.entries.len) if (q.room(len)) |o| break o;
            if (!q.dropHead()) {
                q.bytes -= len;
                q.live -= 1;
                return q.dropNew();
            }
        };
        q.at(q.tail).* = .{ .off = off, .len = @intCast(len), .droppable = droppable, .gone = false };
        q.tail += 1;
        std.debug.assert(q.tail - q.head <= q.entries.len and q.bytes <= q.buf.len);
        return q.buf[off..][0..len];
    }

    fn dropNew(q: *Queue) ?[]u8 {
        q.dropped += 1;
        q.unreported += 1;
        return null;
    }

    /// Where `len` contiguous bytes fit, if they do.
    fn room(q: *Queue, len: usize) ?usize {
        if (q.head == q.tail) return 0;
        const first = q.at(q.head).off;
        const last = q.at(q.tail - 1);
        const end = last.off + last.len;
        if (last.off >= first) {
            // Not wrapped: free at the end, then before the first line.
            if (q.buf.len - end >= len) return end;
            if (first >= len) return 0;
            return null;
        }
        return if (first - end >= len) end else null;
    }

    /// Advance `head` past lines that are gone.
    fn reclaim(q: *Queue) void {
        while (q.head < q.tail and q.at(q.head).gone) q.head += 1;
        if (q.scan < q.head) q.scan = q.head;
    }

    /// Drop the oldest line that is not being sent. False if there is none.
    fn dropHead(q: *Queue) bool {
        q.reclaim();
        if (q.head == q.tail or q.front_sent > 0) return false;
        q.goneAt(q.head);
        q.reclaim();
        return true;
    }

    fn goneAt(q: *Queue, i: u64) void {
        const e = q.at(i);
        std.debug.assert(!e.gone);
        e.gone = true;
        q.bytes -= e.len;
        q.live -= 1;
        q.dropped += 1;
        q.unreported += 1;
    }

    fn dropOldest(q: *Queue, only_droppable: bool) bool {
        // The front line may be half sent; it stays. The new line (the
        // last entry slot, not yet written) is never a candidate.
        const first = q.head + @intFromBool(q.front_sent > 0);
        var i = if (only_droppable) @max(q.scan, first) else first;
        while (i < q.tail) : (i += 1) {
            const e = q.at(i);
            if (e.gone or (only_droppable and !e.droppable)) continue;
            q.goneAt(i);
            if (only_droppable) q.scan = i + 1;
            return true;
        }
        if (only_droppable) q.scan = i;
        return false;
    }

    /// Put a `dropped` line before the front line, if lines were dropped
    /// and the front line is not half sent.
    pub fn noteDropped(q: *Queue, at_ms: i64) void {
        if (q.unreported == 0 or q.front_sent > 0 or q.notice_len > 0) return;
        var out: Out = .{ .buf = &q.notice };
        encode(&out, .{ .dropped = .{ .count = q.unreported } }, at_ms) catch return;
        q.notice_len = out.len;
        q.notice_sent = 0;
        q.unreported = 0;
    }

    /// The bytes that wait, oldest first, as up to `out.len` slices.
    pub fn frontSlices(q: *Queue, out: [][]const u8) usize {
        q.reclaim();
        var n: usize = 0;
        if (q.notice_len > 0 and n < out.len) {
            out[n] = q.notice[q.notice_sent..q.notice_len];
            n += 1;
        }
        var i = q.head;
        var skip = q.front_sent;
        while (i < q.tail and n < out.len) : (i += 1) {
            const e = q.at(i);
            if (e.gone) continue;
            out[n] = q.buf[e.off + skip ..][0 .. e.len - skip];
            skip = 0;
            n += 1;
        }
        return n;
    }

    /// The bytes of the front line that are not sent yet.
    pub fn front(q: *Queue) ?[]const u8 {
        var one: [1][]const u8 = undefined;
        return if (q.frontSlices(&one) == 1) one[0] else null;
    }

    /// The client took `n` bytes from the front.
    pub fn consume(q: *Queue, n_in: usize) void {
        var n = n_in;
        if (q.notice_len > 0) {
            const k = @min(n, q.notice_len - q.notice_sent);
            q.notice_sent += k;
            n -= k;
            if (q.notice_sent < q.notice_len) return;
            q.notice_len = 0;
            q.notice_sent = 0;
        }
        while (n > 0) {
            q.reclaim();
            std.debug.assert(q.head < q.tail);
            const e = q.at(q.head);
            const k = @min(n, e.len - q.front_sent);
            q.front_sent += k;
            n -= k;
            if (q.front_sent < e.len) return;
            e.gone = true;
            q.bytes -= e.len;
            q.live -= 1;
            q.front_sent = 0;
            q.reclaim();
        }
    }

    /// The connection went: a half-sent line goes again in full.
    pub fn restartFront(q: *Queue) void {
        q.front_sent = 0;
        q.notice_sent = 0;
    }
};

test "admin routes" {
    const t = std.testing;
    try t.expectEqualStrings("wf1", route("PUT", "/_admin/workflows/wf1").put_workflow);
    try t.expectEqualStrings("wf1", route("DELETE", "/_admin/workflows/wf1").delete_workflow);
    try t.expect(route("GET", "/_admin/workflows") == .list_workflows);
    try t.expect(route("PUT", "/_admin/credentials") == .put_credentials);
    try t.expect(route("POST", "/_admin/executions") == .start_execution);
    try t.expectEqualStrings("42", route("DELETE", "/_admin/executions/42").cancel_execution);
    try t.expect(route("GET", "/_admin/events?x=1") == .events);
    const r = route("POST", "/_admin/resume/wfrt-7/3").@"resume";
    try t.expectEqualStrings("wfrt-7", r.id);
    try t.expectEqualStrings("3", r.seq);
    try t.expect(route("GET", "/_admin/workflows/wf1") == .not_found);
    try t.expect(route("PUT", "/_admin/workflows/a/b") == .not_found);
    try t.expect(route("POST", "/webhook/x") == .not_found);
    try t.expect(route("GET", "/_admin/") == .not_found);
    try t.expectEqualStrings("", route("POST", "/_admin/resume/12").@"resume".seq);
    try t.expect(route("PUT", "/_admin/variables") == .put_variables);
}

test "bearer auth" {
    const head = "Host: x\r\nAuthorization: Bearer s3cret\r\nContent-Length: 0";
    try std.testing.expect(authorized(head, "s3cret"));
    try std.testing.expect(!authorized(head, "s3cres"));
    try std.testing.expect(!authorized(head, "s3cre"));
    try std.testing.expect(!authorized("Host: x", "s3cret"));
    try std.testing.expect(!authorized("authorization: Bearer ", ""));
}

test "load payload" {
    const gpa = std.testing.allocator;
    const body = "{\"versionId\":\"v2\",\"module\":\"TjhXTQ==\",\"active\":true,\"webhookPrefix\":\"/webhook\"}";
    const p = try loadPayload(gpa, "wf\"1", body);
    defer gpa.free(p);
    try std.testing.expectEqualStrings("{\"workflowId\":\"wf\\\"1\",\"versionId\":\"v2\",\"active\":true,\"saveData\":false,\"webhookPrefix\":\"/webhook\",\"resumeUrlBase\":\"/resume\",\"resumeFormUrlBase\":\"/resume\"}\nN8WM", p);
    try std.testing.expectError(error.BadModule, loadPayload(gpa, "wf", "{\"module\":\"%%%\"}"));
    try std.testing.expectError(error.BadBody, loadPayload(gpa, "wf", "[1]"));
}

test "manual event" {
    const gpa = std.testing.allocator;
    const m = try manualEvent(gpa, "{\"workflowId\":\"wf1\",\"executionId\":\"1234\",\"trigger\": {\"n\":1.50},\"trace\":true}", true);
    defer gpa.free(m.payload);
    try std.testing.expectEqual(@as(u64, 1234) | core.given_id_flag, m.exec_id);
    try std.testing.expectEqual(heap.exec_flag_trace, m.flags);
    try std.testing.expectEqual(@as(i64, 0), m.clock_offset_ms);
    try std.testing.expectEqualStrings("wf1\n\n{\"n\":1.50}", m.payload);
    const n = try manualEvent(gpa, "{\"workflowId\":\"wf1\",\"versionId\":\"v1\",\"executionId\":77}", true);
    defer gpa.free(n.payload);
    try std.testing.expectEqualStrings("wf1\nv1\nnull", n.payload);
    try std.testing.expectError(error.BadExecutionId, manualEvent(gpa, "{\"workflowId\":\"wf1\",\"executionId\":\"wfrt-3\"}", true));
    try std.testing.expectError(error.BadExecutionId, manualEvent(gpa, "{\"workflowId\":\"wf1\",\"executionId\":\"abc\"}", true));
}

/// The body of `POST /_admin/executions` with a clock offset (CLOCK-OFFSET).
fn clockBody(comptime offset: []const u8) []const u8 {
    return std.fmt.comptimePrint("{{\"workflowId\":\"wf1\",\"executionId\":\"77\",\"clockOffsetMs\":{s}}}", .{offset});
}

test "manual event: the clock offset of a test run" {
    const gpa = std.testing.allocator;
    // No field: the payload keeps its time. That is the body of the gym and
    // of the fixture runner, and the offset line is absent.
    {
        const m = try manualEvent(gpa, clockBody("0"), true);
        defer gpa.free(m.payload);
        try std.testing.expectEqual(@as(i64, 0), m.clock_offset_ms);
        try std.testing.expectEqualStrings("wf1\n\nnull", m.payload);
    }
    // A negative and a positive offset go on the first line of the payload.
    {
        const m = try manualEvent(gpa, clockBody("-86400000"), true);
        defer gpa.free(m.payload);
        try std.testing.expectEqual(@as(i64, -86_400_000), m.clock_offset_ms);
        try std.testing.expectEqualStrings("clock:-86400000\nwf1\n\nnull", m.payload);
    }
    {
        const m = try manualEvent(gpa, clockBody("1500"), true);
        defer gpa.free(m.payload);
        try std.testing.expectEqual(@as(i64, 1500), m.clock_offset_ms);
        try std.testing.expectEqualStrings("clock:1500\nwf1\n\nnull", m.payload);
    }
    // Without `--test-clock` the field is refused, also when it is 0.
    try std.testing.expectError(error.ClockDisabled, manualEvent(gpa, clockBody("0"), false));
    try std.testing.expectError(error.ClockDisabled, manualEvent(gpa, clockBody("-86400000"), false));
    // Only an integer: a float, an exponent, a string and null are not.
    inline for ([_][]const u8{ "1.5", "1e6", "\"-86400000\"", "null", "true" }) |bad| {
        try std.testing.expectError(error.BadClockOffset, manualEvent(gpa, clockBody(bad), true));
    }
    // At most 10 years in ms, in each direction.
    const max = clockBody("315360000000");
    const m = try manualEvent(gpa, max, true);
    defer gpa.free(m.payload);
    try std.testing.expectEqual(@as(i64, 315_360_000_000), m.clock_offset_ms);
    inline for ([_][]const u8{ "315360000001", "-315360000001", "99999999999999999999" }) |bad| {
        try std.testing.expectError(error.BadClockOffset, manualEvent(gpa, clockBody(bad), true));
    }
}

test "execution ids" {
    var buf: [32]u8 = undefined;
    const given = core.parseExecId("1234").?;
    try std.testing.expectEqualStrings("1234", core.formatExecId(given, &buf));
    try std.testing.expectEqualStrings("wfrt-9", core.formatExecId(9, &buf));
    try std.testing.expectEqual(@as(u64, 9), core.parseExecId("wfrt-9").?);
    try std.testing.expect(core.parseExecId("-1") == null);
    try std.testing.expect(core.parseExecId("") == null);
    try std.testing.expect(core.parseExecId("wfrt-0") == null);
    try std.testing.expect(core.parseExecId("9999999999999999999") == null);
}

test "event encoder" {
    const gpa = std.testing.allocator;
    var mem: [2048]u8 = undefined;
    var out: Out = .{ .buf = &mem };
    const evs = [_]Event{
        .{ .started = .{ .exec = "12", .workflow = "wf", .version = "v1", .manual = true, .trigger = "{\"a\":1}" } },
        .{ .step = .{ .exec = "12", .step = "Get \"x\"\n", .status = "failed", .err = "boom\u{1}" } },
        .{ .step = .{ .exec = "12", .step = "S", .status = "completed", .result = "[1]", .args = "" } },
        .{ .trace = .{ .exec = "12", .item = "{\"step\":\"IF\",\"items\":[]}" } },
        .{ .waiting = .{ .exec = "wfrt-3", .step = "Approve", .resume_url = "/resume/wfrt-3/0?signature=ab", .signature = "ab" } },
        .{ .waiting = .{ .exec = "wfrt-3", .step = "Wait", .wait_till = 99 } },
        .{ .finished = .{ .exec = "12", .status = "ok", .result = "{\"r\":true}" } },
        .{ .finished = .{ .exec = "12", .status = "needs_attention", .step = "S" } },
        .{ .dropped = .{ .count = 3 } },
    };
    const ats = [_]i64{ 5, 6, 6, 7, 8, 8, 9, 9, 10 };
    for (evs, ats) |e, t| {
        // The counting pass gives the same length as the write.
        var cnt = Out.counter();
        try encode(&cnt, e, t);
        const before = out.len;
        try encode(&out, e, t);
        try std.testing.expectEqual(cnt.len, out.len - before);
    }
    const want =
        \\{"type":"started","executionId":"12","workflowId":"wf","versionId":"v1","mode":"manual","trigger":{"a":1},"at":5}
        \\{"type":"step","executionId":"12","step":"Get \"x\"\n","status":"failed","error":"boom\u0001","at":6}
        \\{"type":"step","executionId":"12","step":"S","status":"completed","result":[1],"at":6}
        \\{"type":"trace","executionId":"12","step":"IF","items":[],"at":7}
        \\{"type":"waiting","executionId":"wfrt-3","step":"Approve","resumeUrl":"/resume/wfrt-3/0?signature=ab","signature":"ab","at":8}
        \\{"type":"waiting","executionId":"wfrt-3","step":"Wait","waitTill":99,"at":8}
        \\{"type":"finished","executionId":"12","status":"ok","result":{"r":true},"at":9}
        \\{"type":"finished","executionId":"12","status":"needs_attention","step":"S","at":9}
        \\{"type":"dropped","count":3,"at":10}
        \\
    ;
    try std.testing.expectEqualStrings(want, out.written());
    // Each line is valid JSON.
    var lines = std.mem.splitScalar(u8, out.written(), '\n');
    while (lines.next()) |l| {
        if (l.len == 0) continue;
        try std.testing.expect(try std.json.validate(gpa, l));
    }
    // A full buffer is an error, not a partial line that counts as written.
    var small: [8]u8 = undefined;
    var o2: Out = .{ .buf = &small };
    try std.testing.expectError(error.NoSpace, encode(&o2, evs[0], 1));
}

fn pushLine(q: *Queue, line: []const u8, droppable: bool) void {
    const dst = q.push(line.len, droppable) orelse return;
    @memcpy(dst, line);
}

test "queue drops step and trace lines first" {
    const gpa = std.testing.allocator;
    var q = try Queue.init(gpa, 30, 1000);
    defer q.deinit();
    pushLine(&q, "started-1\n", false); // 10 bytes
    pushLine(&q, "step----1\n", true);
    pushLine(&q, "step----2\n", true);
    pushLine(&q, "finished1\n", false); // over: drops step 1
    try std.testing.expectEqual(@as(u64, 1), q.dropped);
    pushLine(&q, "finished2\n", false); // drops step 2
    try std.testing.expectEqual(@as(u64, 2), q.dropped);
    // Only started/finished remain: the queue grows up to the hard bound.
    pushLine(&q, "started-2\n", false);
    try std.testing.expectEqual(@as(u64, 2), q.dropped);
    try std.testing.expectEqualStrings("started-1\n", q.front().?);
    q.consume(4);
    try std.testing.expectEqualStrings("ted-1\n", q.front().?);
    q.consume(6);
    try std.testing.expectEqualStrings("finished1\n", q.front().?);
    q.noteDropped(7);
    try std.testing.expectEqualStrings("{\"type\":\"dropped\",\"count\":2,\"at\":7}\n", q.front().?);
    // One consume can span the notice and the lines after it.
    var sl: [8][]const u8 = undefined;
    try std.testing.expectEqual(@as(usize, 4), q.frontSlices(&sl));
    q.consume(q.notice_len + 3);
    try std.testing.expectEqualStrings("ished1\n", q.front().?);
    var n: usize = 0;
    while (q.front()) |l| : (n += 1) q.consume(l.len);
    try std.testing.expectEqual(@as(usize, 3), n);
    try std.testing.expectEqual(@as(usize, 0), q.bytes);
}

test "queue hard bound drops the oldest line" {
    const gpa = std.testing.allocator;
    var q = try Queue.init(gpa, 10, 1000);
    defer q.deinit();
    var i: usize = 0;
    while (i < 10) : (i += 1) pushLine(&q, "finished\n", false);
    // hard_bytes is 40: four lines of 9 bytes stay.
    try std.testing.expect(q.bytes <= 40);
    try std.testing.expectEqual(@as(u64, 6), q.dropped);
}

test "queue ring wraps and never grows" {
    const gpa = std.testing.allocator;
    var q = try Queue.init(gpa, 64, 8);
    defer q.deinit();
    var prng = std.Random.DefaultPrng.init(7);
    const rnd = prng.random();
    var line: [100]u8 = undefined;
    var sent: u64 = 0;
    var i: usize = 0;
    while (i < 20_000) : (i += 1) {
        const len = 1 + rnd.uintLessThan(usize, 90);
        @memset(line[0..len], 'a' + @as(u8, @intCast(i % 26)));
        line[len - 1] = '\n';
        pushLine(&q, line[0..len], rnd.boolean());
        // Each line that waits is intact: one letter, then a newline.
        var sl: [64][]const u8 = undefined;
        const n = q.frontSlices(&sl);
        for (sl[0..n], 0..) |s, k| {
            if (k == 0 and q.front_sent > 0) continue;
            try std.testing.expect(s[s.len - 1] == '\n');
            for (s[0 .. s.len - 1]) |c| try std.testing.expectEqual(s[0], c);
        }
        if (rnd.uintLessThan(u8, 3) == 0) if (q.front()) |f| {
            const k = 1 + rnd.uintLessThan(usize, f.len);
            q.consume(k);
            sent += k;
        };
        try std.testing.expect(q.bytes <= q.hard_bytes and q.live <= q.max_entries * 4);
    }
    try std.testing.expect(q.dropped > 0 and sent > 0);
}

// ---- service calls (spec 9.9) -----------------------------------------------------

/// The text of a call id: `<executionId>:<seq>`.
pub fn formatCallId(exec_id: u64, seq: u32, buf: *[48]u8) []const u8 {
    return formatSubCallId(exec_id, seq, 0, buf);
}

/// `<executionId>:<seq>.<sub>`: call `sub` (from 1) of a fallback host step;
/// `sub` 0 is the `service` effect itself, `<executionId>:<seq>`.
pub fn formatSubCallId(exec_id: u64, seq: u32, sub: u32, buf: *[48]u8) []const u8 {
    var idb: [32]u8 = undefined;
    const exec = core.formatExecId(exec_id, &idb);
    if (sub == 0) return std.fmt.bufPrint(buf, "{s}:{d}", .{ exec, seq }) catch unreachable;
    return std.fmt.bufPrint(buf, "{s}:{d}.{d}", .{ exec, seq, sub }) catch unreachable;
}

pub const CallId = struct { exec_id: u64, seq: u32, sub: u32 = 0 };

/// Parse `<executionId>:<seq>`; null when it is not one. The colon can be
/// percent-encoded (`%3A`), as clients encode a path segment.
pub fn parseCallId(text: []const u8) ?CallId {
    var sep_len: usize = 1;
    var colon = std.mem.lastIndexOfScalar(u8, text, ':');
    if (colon == null) {
        colon = std.mem.lastIndexOf(u8, text, "%3A") orelse std.mem.lastIndexOf(u8, text, "%3a");
        sep_len = 3;
    }
    const at = colon orelse return null;
    const exec_id = core.parseExecId(text[0..at]) orelse return null;
    const rest = text[at + sep_len ..];
    const dot = std.mem.indexOfScalar(u8, rest, '.');
    const digits = if (dot) |d| rest[0..d] else rest;
    if (digits.len == 0 or digits[0] == '+' or digits[0] == '-') return null;
    const seq = std.fmt.parseInt(u32, digits, 10) catch return null;
    var sub: u32 = 0;
    if (dot) |d| {
        const s = rest[d + 1 ..];
        if (s.len == 0 or s[0] == '+' or s[0] == '-') return null;
        sub = std.fmt.parseInt(u32, s, 10) catch return null;
        if (sub == 0) return null;
    }
    return .{ .exec_id = exec_id, .seq = seq, .sub = sub };
}

/// The body of `POST /_admin/services/<callId>`: `result` is the raw JSON of
/// the result (`null` when it is missing), `message` the raw JSON string of
/// the error message.
pub const Answer = union(enum) {
    ok: []const u8,
    err: []const u8,
};

pub const AnswerError = error{BadAnswer};

/// `{"ok":true,"result":<value>}` or `{"ok":false,"error":{"message":"..."}}`.
/// It reads members without copying; the core decodes the result.
pub fn parseAnswer(body: []const u8) AnswerError!Answer {
    const trimmed = std.mem.trim(u8, body, " \t\r\n");
    if (trimmed.len < 2 or trimmed[0] != '{' or trimmed[trimmed.len - 1] != '}') return error.BadAnswer;
    const ok = http.member(trimmed, "ok") orelse return error.BadAnswer;
    if (std.mem.eql(u8, ok, "true")) {
        const result = http.member(trimmed, "result") orelse "null";
        if (result.len == 0) return error.BadAnswer;
        return .{ .ok = result };
    }
    if (!std.mem.eql(u8, ok, "false")) return error.BadAnswer;
    const e = http.member(trimmed, "error") orelse return error.BadAnswer;
    if (e.len < 2 or e[0] != '{') return error.BadAnswer;
    const msg = http.member(e, "message") orelse return error.BadAnswer;
    if (msg.len < 2 or msg[0] != '"' or msg[msg.len - 1] != '"') return error.BadAnswer;
    return .{ .err = msg };
}

/// Service calls that wait for an answer: a fixed table and, for each entry,
/// a fixed room for its event line (both reserved at startup). A full table
/// or a line larger than the room is a limit for the step, never a growth.
pub const ServiceCalls = struct {
    gpa: std.mem.Allocator,
    calls: []Call,
    lines: []u8,
    line_bytes: usize,
    count: u32 = 0,
    /// The earliest deadline of the calls, or maxInt when there are none.
    next_deadline: i64 = std.math.maxInt(i64),

    pub const Call = struct {
        used: bool = false,
        exec_id: u64 = 0,
        seq: u32 = 0,
        /// 0: a `service` effect. From 1: call `sub` of a fallback host step,
        /// which waits on host connection `conn` (spec 9.9).
        sub: u32 = 0,
        conn: u8 = 0,
        deadline_ms: i64 = 0,
        len: u32 = 0,
    };

    pub const AddError = error{ Full, TooLarge };

    pub fn init(gpa: std.mem.Allocator, max_calls: u32, line_bytes: usize) !ServiceCalls {
        std.debug.assert(max_calls > 0 and line_bytes >= 256);
        const calls = try gpa.alloc(Call, max_calls);
        for (calls) |*c| c.* = .{};
        return .{ .gpa = gpa, .calls = calls, .lines = try core_lib.arena.reserve(gpa, u8, max_calls * line_bytes), .line_bytes = line_bytes };
    }

    pub fn deinit(t: *ServiceCalls) void {
        t.gpa.free(t.calls);
        t.gpa.free(t.lines);
    }

    fn room(t: *ServiceCalls, i: usize) []u8 {
        return t.lines[i * t.line_bytes ..][0..t.line_bytes];
    }

    /// The event line of entry `i` (`Event.service`).
    pub fn line(t: *ServiceCalls, i: usize) []const u8 {
        std.debug.assert(t.calls[i].used);
        return t.room(i)[0..t.calls[i].len];
    }

    pub fn find(t: *const ServiceCalls, exec_id: u64, seq: u32) ?usize {
        return t.findSub(exec_id, seq, 0);
    }

    pub fn findSub(t: *const ServiceCalls, exec_id: u64, seq: u32, sub: u32) ?usize {
        if (t.count == 0) return null;
        for (t.calls, 0..) |c, i| {
            if (c.used and c.exec_id == exec_id and c.seq == seq and c.sub == sub) return i;
        }
        return null;
    }

    /// A new call with the args of the `service` effect (`payload`). A call
    /// that waits already (sent again after a restart) keeps its entry.
    /// `attempt` counts the retries of the step: the backend dedupes by
    /// `callId` and `attempt`.
    pub fn add(t: *ServiceCalls, exec_id: u64, seq: u32, attempt: u32, workflow: []const u8, step: []const u8, payload: []const u8, deadline_ms: i64) AddError!usize {
        return t.addSub(exec_id, seq, 0, 0, attempt, workflow, step, payload, deadline_ms);
    }

    /// A call with a `sub` number: from 1, a call that a fallback host step
    /// makes while it runs on connection `conn`. `payload` has `service`,
    /// `op` and `args`.
    pub fn addSub(t: *ServiceCalls, exec_id: u64, seq: u32, sub: u32, conn: u8, attempt: u32, workflow: []const u8, step: []const u8, payload: []const u8, deadline_ms: i64) AddError!usize {
        if (t.findSub(exec_id, seq, sub)) |i| return i;
        if (t.count == t.calls.len) return error.Full;
        const i = for (t.calls, 0..) |c, k| {
            if (!c.used) break k;
        } else unreachable;
        var out: Out = .{ .buf = t.room(i) };
        writeLine(&out, exec_id, seq, sub, attempt, workflow, step, payload) catch return error.TooLarge;
        t.calls[i] = .{ .used = true, .exec_id = exec_id, .seq = seq, .sub = sub, .conn = conn, .deadline_ms = deadline_ms, .len = @intCast(out.len) };
        t.count += 1;
        t.next_deadline = @min(t.next_deadline, deadline_ms);
        std.debug.assert(t.count <= t.calls.len);
        return i;
    }

    pub fn remove(t: *ServiceCalls, i: usize) void {
        std.debug.assert(t.calls[i].used and t.count > 0);
        t.calls[i] = .{};
        t.count -= 1;
        if (t.count == 0) t.next_deadline = std.math.maxInt(i64);
    }

    /// The next call whose deadline passed, or null. The caller removes it.
    pub fn expired(t: *ServiceCalls, now_ms: i64) ?usize {
        if (now_ms < t.next_deadline) return null;
        var next: i64 = std.math.maxInt(i64);
        var found: ?usize = null;
        for (t.calls, 0..) |c, i| {
            if (!c.used) continue;
            if (found == null and c.deadline_ms <= now_ms) {
                found = i;
                continue;
            }
            next = @min(next, c.deadline_ms);
        }
        t.next_deadline = next;
        return found;
    }

    fn writeLine(out: *Out, exec_id: u64, seq: u32, sub: u32, attempt: u32, workflow: []const u8, step: []const u8, payload: []const u8) Out.Error!void {
        var idb: [32]u8 = undefined;
        var cb: [48]u8 = undefined;
        try out.put("{\"type\":\"service\",\"executionId\":");
        try writeJsonString(out, core.formatExecId(exec_id, &idb));
        try out.put(",\"workflowId\":");
        try writeJsonString(out, workflow);
        try out.put(",\"step\":");
        try writeJsonString(out, step);
        try out.put(",\"callId\":");
        try writeJsonString(out, formatSubCallId(exec_id, seq, sub, &cb));
        try printOut(out, ",\"attempt\":{d}", .{attempt});
        // The core wrote the args: their members are JSON values.
        try member(out, "service", http.member(payload, "service") orelse "null");
        try member(out, "op", http.member(payload, "op") orelse "null");
        try member(out, "args", http.member(payload, "args") orelse "{}");
    }
};

test "service call ids" {
    var b: [48]u8 = undefined;
    const id = formatCallId(core.parseExecId("42").?, 7, &b);
    try std.testing.expectEqualStrings("42:7", id);
    const c = parseCallId(id).?;
    try std.testing.expectEqual(@as(u32, 7), c.seq);
    try std.testing.expect(parseCallId("wfrt-3:0") != null);
    try std.testing.expectEqual(@as(u32, 7), parseCallId("42%3A7").?.seq);
    try std.testing.expectEqual(@as(u32, 7), parseCallId("wfrt-4%3a7").?.seq);
    // Call 2 of a fallback host step.
    const sub = parseCallId("42%3A7.2").?;
    try std.testing.expectEqual(@as(u32, 7), sub.seq);
    try std.testing.expectEqual(@as(u32, 2), sub.sub);
    try std.testing.expectEqualStrings("42:7.2", formatSubCallId(core.parseExecId("42").?, 7, 2, &b));
    try std.testing.expect(parseCallId("42:7.") == null);
    try std.testing.expect(parseCallId("42:7.0") == null);
    try std.testing.expect(parseCallId("42:7.-1") == null);
    try std.testing.expect(parseCallId("42") == null);
    try std.testing.expect(parseCallId("42:-1") == null);
    try std.testing.expect(parseCallId(":1") == null);
}

test "service answers" {
    try std.testing.expectEqualStrings("[1,2]", (try parseAnswer("{\"ok\":true,\"result\":[1,2]}")).ok);
    try std.testing.expectEqualStrings("null", (try parseAnswer("{\"ok\":true}")).ok);
    try std.testing.expectEqualStrings("\"no \\\"t\\\"\"", (try parseAnswer("{\"ok\":false,\"error\":{\"message\":\"no \\\"t\\\"\",\"description\":\"d\"}}")).err);
    try std.testing.expectError(error.BadAnswer, parseAnswer("{\"ok\":false}"));
    try std.testing.expectError(error.BadAnswer, parseAnswer("{\"ok\":1}"));
    try std.testing.expectError(error.BadAnswer, parseAnswer("[]"));
}

test "service call table: limits, deadlines and lines" {
    const gpa = std.testing.allocator;
    var t = try ServiceCalls.init(gpa, 2, 256);
    defer t.deinit();
    const p = "{\"service\":\"dataTable\",\"op\":\"getColumns\",\"args\":{\"dataTableId\":\"T\"}}";
    const a = try t.add(1, 0, 0, "wf", "Table", p, 100);
    // The same call again keeps its entry.
    try std.testing.expectEqual(a, try t.add(1, 0, 0, "wf", "Table", p, 100));
    _ = try t.add(1, 1, 0, "wf", "Table", p, 50);
    try std.testing.expectError(error.Full, t.add(1, 2, 0, "wf", "Table", p, 10));
    try std.testing.expectEqualStrings("{\"type\":\"service\",\"executionId\":\"wfrt-1\",\"workflowId\":\"wf\",\"step\":\"Table\",\"callId\":\"wfrt-1:0\",\"attempt\":0,\"service\":\"dataTable\",\"op\":\"getColumns\",\"args\":{\"dataTableId\":\"T\"}", t.line(a));
    try std.testing.expect(t.expired(49) == null);
    const e = t.expired(60).?;
    try std.testing.expectEqual(@as(u32, 1), t.calls[e].seq);
    t.remove(e);
    try std.testing.expect(t.expired(60) == null);
    try std.testing.expectEqual(@as(i64, 100), t.next_deadline);
    var big: [400]u8 = undefined;
    @memset(&big, 'x');
    big[0] = '{';
    try std.testing.expectError(error.TooLarge, t.add(2, 0, 0, "wf", &big, p, 10));
    var out_buf: [512]u8 = undefined;
    var out: Out = .{ .buf = &out_buf };
    try encode(&out, .{ .service = .{ .line = t.line(a) } }, 5);
    try std.testing.expect(std.mem.endsWith(u8, out.written(), ",\"at\":5}\n"));
}
