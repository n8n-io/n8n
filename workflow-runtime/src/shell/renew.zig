//! Credential renewal for outbound requests (workflow-lang
//! `docs/credentials-plan.md`, "Renewal").
//!
//! A request that uses a renewable credential slot keeps a copy of its args
//! here while it is in flight. When the value is about to expire, or the
//! response has a status that means "the token expired", the shard asks n8n
//! for a renewal (a `credentials.renew` service call), and the request goes
//! again once. A request gets at most one renewal and one resend.
//!
//! Requests that wait for the same slot of the same workflow share one call:
//! the first is the leader, the others follow it.
//!
//! The table and the room of each entry are reserved at startup. A full
//! table or args larger than the room mean that the request runs without
//! this protection (a limit that the counters show), never a growth.
const std = @import("std");

/// The most status codes of one slot (`renewal.status`).
pub const max_statuses = 4;
/// The longest step name that the service event carries.
const max_step = 128;
/// The longest workflow id (`core.max_id`).
const max_workflow = 64;
/// The message when n8n gave none that fits.
pub const failed_text = "credentials: n8n did not renew the credential";

/// What the credentials document says about a renewable slot.
pub const Info = struct {
    /// When the value expires, in ms since the epoch; maxInt when unknown.
    expires_at_ms: i64 = std.math.maxInt(i64),
    statuses: [max_statuses]u16 = @splat(0),
    nstatus: u8 = 0,

    /// True when a response with `status` means that the value expired.
    pub fn matches(info: *const Info, status: u32) bool {
        std.debug.assert(info.nstatus <= max_statuses);
        for (info.statuses[0..info.nstatus]) |s| if (s == status) return true;
        return false;
    }
};

pub const State = enum(u8) {
    free,
    /// The request is with the egress client.
    in_flight,
    /// The renewal is with n8n.
    waiting,
    /// The renewal is done: the request goes again.
    ready,
    /// The renewal failed: the step gets the message in the room.
    failed,
};

/// The effect that a request belongs to, and what a resend needs.
pub const Request = struct {
    exec_id: u64,
    seq: u32,
    attempt: u32,
    /// The key of the workflow for the egress pools.
    pool_key: u64,
    idempotent: bool,
    key: [32]u8,
    /// The body can go once only (multipart): n8n v1 renews for such a
    /// request and gives the first response, without a resend.
    single_use: bool,
};

pub const Entry = struct {
    state: State = .free,
    /// The service call of this entry is the renewal that others wait for.
    leader: bool = false,
    /// The one renewal of this request is spent.
    renewed: bool = false,
    /// Nothing starts when the answer comes: the execution ended, or the
    /// step has its response already.
    detached: bool = false,
    req: Request = no_request,
    info: Info = .{},
    /// Bytes of the room in use: the args, then the step name; or the
    /// failure message.
    args_len: u32 = 0,
    step_len: u32 = 0,
    /// The slot name, inside the args.
    slot_at: u32 = 0,
    slot_len: u32 = 0,
    workflow: [max_workflow]u8 = @splat(0),
    workflow_len: u8 = 0,
};

const no_request: Request = .{
    .exec_id = 0,
    .seq = 0,
    .attempt = 0,
    .pool_key = 0,
    .idempotent = false,
    .key = @splat(0),
    .single_use = false,
};

/// What to do with a response.
pub const Decision = enum {
    /// Give the response to the step. The entry is free.
    deliver,
    /// Keep the response from the step: ask for a renewal, then send again.
    renew,
    /// Give the response to the step, and ask for a renewal.
    renew_detached,
};

/// How an entry gets its renewal.
pub const Want = enum {
    /// Send a service call for this entry.
    call,
    /// Another entry asked already for the same slot.
    follow,
};

pub const Counters = struct {
    /// Requests that ran without the protection: the table was full.
    full: u64 = 0,
    /// The same, because the args were larger than the room.
    too_large: u64 = 0,
    /// Service calls for a renewal.
    calls: u64 = 0,
    /// Requests that shared the call of another request.
    shared: u64 = 0,
    /// Requests sent again after a renewal.
    resent: u64 = 0,
};

/// Table of the requests that can still get a renewal. One row for each
/// such request; the shard owns it.
pub const Table = struct {
    gpa: std.mem.Allocator,
    entries: []Entry,
    rooms: []u8,
    room_bytes: usize,
    /// Rows in use.
    count: u32 = 0,
    /// Rows in state `ready` or `failed`.
    pending: u32 = 0,
    counters: Counters = .{},

    pub fn init(gpa: std.mem.Allocator, max: u32, room_bytes: usize) error{OutOfMemory}!Table {
        std.debug.assert(max > 0 and room_bytes >= 1024);
        const entries = try gpa.alloc(Entry, max);
        errdefer gpa.free(entries);
        for (entries) |*e| e.* = .{};
        const rooms = try @import("core").arena.reserve(gpa, u8, @as(usize, max) * room_bytes);
        return .{ .gpa = gpa, .entries = entries, .rooms = rooms, .room_bytes = room_bytes };
    }

    pub fn deinit(t: *Table) void {
        t.gpa.free(t.entries);
        t.gpa.free(t.rooms);
    }

    fn room(t: *const Table, i: u32) []u8 {
        std.debug.assert(i < t.entries.len);
        return t.rooms[@as(usize, i) * t.room_bytes ..][0..t.room_bytes];
    }

    /// The args of the request of row `i`.
    pub fn args(t: *const Table, i: u32) []const u8 {
        const e = &t.entries[i];
        std.debug.assert(e.state != .free and e.state != .failed);
        return t.room(i)[0..e.args_len];
    }

    /// The step name of row `i`, for the service event.
    pub fn step(t: *const Table, i: u32) []const u8 {
        const e = &t.entries[i];
        std.debug.assert(e.state != .free and e.state != .failed);
        return t.room(i)[e.args_len..][0..e.step_len];
    }

    /// The slot name of row `i`.
    pub fn slot(t: *const Table, i: u32) []const u8 {
        const e = &t.entries[i];
        std.debug.assert(e.state != .free and e.state != .failed);
        return t.room(i)[e.slot_at..][0..e.slot_len];
    }

    pub fn workflow(t: *const Table, i: u32) []const u8 {
        const e = &t.entries[i];
        std.debug.assert(e.state != .free);
        return e.workflow[0..e.workflow_len];
    }

    /// The failure message of row `i`.
    pub fn message(t: *const Table, i: u32) []const u8 {
        const e = &t.entries[i];
        std.debug.assert(e.state == .failed);
        return t.room(i)[0..e.args_len];
    }

    /// The row of an effect, or null.
    pub fn find(t: *const Table, exec_id: u64, seq: u32) ?u32 {
        if (t.count == 0) return null;
        for (t.entries, 0..) |*e, i| {
            if (e.state != .free and e.req.exec_id == exec_id and e.req.seq == seq) return @intCast(i);
        }
        return null;
    }

    /// The row of the effect when its service call is a renewal in progress.
    pub fn leaderAt(t: *const Table, exec_id: u64, seq: u32) ?u32 {
        const i = t.find(exec_id, seq) orelse return null;
        const e = &t.entries[i];
        return if (e.state == .waiting and e.leader) i else null;
    }

    /// Keep a request that starts now. `slot_name` must be a part of
    /// `request_args`. Null when the request cannot be kept: it then runs
    /// without a renewal.
    pub fn add(
        t: *Table,
        req: Request,
        workflow_id: []const u8,
        step_name: []const u8,
        request_args: []const u8,
        slot_name: []const u8,
        info: Info,
    ) ?u32 {
        std.debug.assert(workflow_id.len <= max_workflow);
        std.debug.assert(@intFromPtr(slot_name.ptr) >= @intFromPtr(request_args.ptr));
        std.debug.assert(@intFromPtr(slot_name.ptr) + slot_name.len <= @intFromPtr(request_args.ptr) + request_args.len);
        const name = step_name[0..@min(step_name.len, max_step)];
        if (request_args.len + name.len > t.room_bytes) {
            t.counters.too_large += 1;
            return null;
        }
        const i = t.rowFor(req.exec_id, req.seq) orelse {
            t.counters.full += 1;
            return null;
        };
        const e = &t.entries[i];
        const mem = t.room(i);
        @memcpy(mem[0..request_args.len], request_args);
        @memcpy(mem[request_args.len..][0..name.len], name);
        e.* = .{
            .state = .in_flight,
            .req = req,
            .info = info,
            .args_len = @intCast(request_args.len),
            .step_len = @intCast(name.len),
            .slot_at = @intCast(@intFromPtr(slot_name.ptr) - @intFromPtr(request_args.ptr)),
            .slot_len = @intCast(slot_name.len),
            .workflow_len = @intCast(workflow_id.len),
        };
        @memcpy(e.workflow[0..workflow_id.len], workflow_id);
        std.debug.assert(t.count <= t.entries.len);
        return i;
    }

    /// A row for a new request: the row that the effect had (the step runs
    /// again), else a free one. Null when there is none, or when the old row
    /// still leads a renewal.
    fn rowFor(t: *Table, exec_id: u64, seq: u32) ?u32 {
        if (t.find(exec_id, seq)) |old| {
            const e = &t.entries[old];
            if (e.state == .waiting and e.leader) return null;
            if (e.state == .ready or e.state == .failed) t.pending -= 1;
            return old;
        }
        if (t.count == t.entries.len) return null;
        for (t.entries, 0..) |*e, i| if (e.state == .free) {
            t.count += 1;
            return @intCast(i);
        };
        return null;
    }

    /// Row `i` needs its renewal now: before the request starts (the value
    /// is about to expire), or after `onResponse` said so. The row waits.
    pub fn want(t: *Table, i: u32) Want {
        const e = &t.entries[i];
        std.debug.assert(e.state == .in_flight and !e.leader);
        e.state = .waiting;
        e.renewed = true;
        if (t.leaderFor(i) != null) {
            t.counters.shared += 1;
            return .follow;
        }
        e.leader = true;
        t.counters.calls += 1;
        return .call;
    }

    /// The row that leads the renewal of the slot of row `i`, not `i` itself.
    fn leaderFor(t: *const Table, i: u32) ?u32 {
        for (t.entries, 0..) |*e, k| {
            if (k == i or e.state != .waiting or !e.leader) continue;
            if (t.sameSlot(i, @intCast(k))) return @intCast(k);
        }
        return null;
    }

    fn sameSlot(t: *const Table, a: u32, b: u32) bool {
        std.debug.assert(t.entries[a].state != .free and t.entries[b].state != .free);
        return std.mem.eql(u8, t.workflow(a), t.workflow(b)) and std.mem.eql(u8, t.slot(a), t.slot(b));
    }

    /// The response (or the failure, `status` 0) of the request of row `i`.
    pub fn onResponse(t: *Table, i: u32, status: u32) Decision {
        const e = &t.entries[i];
        std.debug.assert(e.state == .in_flight);
        if (e.renewed or status == 0 or !e.info.matches(status)) {
            t.release(i);
            return .deliver;
        }
        if (e.req.single_use) {
            e.detached = true;
            return .renew_detached;
        }
        return .renew;
    }

    /// The answer to the renewal that row `leader` leads: every row that
    /// waits for the same slot goes again, or fails with `msg`.
    pub fn answered(t: *Table, leader: u32, ok: bool, msg: []const u8) void {
        std.debug.assert(t.entries[leader].state == .waiting and t.entries[leader].leader);
        // The followers first: they compare their slot with the leader's.
        for (t.entries, 0..) |*e, k| {
            if (k == leader or e.state != .waiting or e.leader) continue;
            if (t.sameSlot(leader, @intCast(k))) t.settle(@intCast(k), ok, msg);
        }
        t.settle(leader, ok, msg);
        std.debug.assert(t.pending <= t.count);
    }

    fn settle(t: *Table, i: u32, ok: bool, msg: []const u8) void {
        const e = &t.entries[i];
        std.debug.assert(e.state == .waiting);
        e.leader = false;
        if (e.detached) return t.release(i);
        t.pending += 1;
        if (ok) {
            e.state = .ready;
            return;
        }
        const text = if (msg.len == 0) failed_text else msg[0..@min(msg.len, t.room_bytes)];
        @memcpy(t.room(i)[0..text.len], text);
        e.args_len = @intCast(text.len);
        e.step_len = 0;
        e.state = .failed;
    }

    /// The next row in state `ready` or `failed`, or null.
    pub fn nextPending(t: *const Table) ?u32 {
        if (t.pending == 0) return null;
        for (t.entries, 0..) |*e, i| {
            if (e.state == .ready or e.state == .failed) return @intCast(i);
        }
        return null;
    }

    /// Row `i` goes to the egress client again.
    pub fn restart(t: *Table, i: u32) void {
        const e = &t.entries[i];
        std.debug.assert(e.state == .ready and e.renewed and t.pending > 0);
        e.state = .in_flight;
        t.pending -= 1;
        t.counters.resent += 1;
    }

    pub fn release(t: *Table, i: u32) void {
        const e = &t.entries[i];
        std.debug.assert(e.state != .free and t.count > 0);
        if (e.state == .ready or e.state == .failed) t.pending -= 1;
        e.* = .{};
        t.count -= 1;
    }

    /// An execution ended: its requests need nothing more. A row that leads
    /// a renewal stays until the answer comes, for the rows that follow it.
    pub fn dropExec(t: *Table, exec_id: u64) void {
        if (t.count == 0) return;
        for (t.entries, 0..) |*e, i| {
            if (e.state == .free or e.req.exec_id != exec_id) continue;
            if (e.state == .waiting and e.leader) {
                e.detached = true;
            } else {
                t.release(@intCast(i));
            }
        }
        std.debug.assert(t.pending <= t.count);
    }
};

fn testRequest(exec_id: u64, seq: u32) Request {
    return .{ .exec_id = exec_id, .seq = seq, .attempt = 0, .pool_key = 7, .idempotent = false, .key = @splat(0), .single_use = false };
}

const test_args = "{\"url\":\"http://h/\",\"credential\":\"api\"}";
const test_info: Info = .{ .statuses = .{ 401, 403, 0, 0 }, .nstatus = 2 };

fn testAdd(t: *Table, exec_id: u64, seq: u32, workflow_id: []const u8) ?u32 {
    const at = std.mem.indexOf(u8, test_args, "api") orelse return null;
    return t.add(testRequest(exec_id, seq), workflow_id, "Step", test_args, test_args[at..][0..3], test_info);
}

test "a response with an expiry status gets one renewal and one resend" {
    var t = try Table.init(std.testing.allocator, 4, 1024);
    defer t.deinit();
    const i = testAdd(&t, 1, 0, "wf").?;
    try std.testing.expectEqualStrings(test_args, t.args(i));
    try std.testing.expectEqualStrings("api", t.slot(i));
    try std.testing.expectEqualStrings("Step", t.step(i));
    try std.testing.expectEqual(Decision.renew, t.onResponse(i, 403));
    try std.testing.expectEqual(Want.call, t.want(i));
    try std.testing.expectEqual(i, t.leaderAt(1, 0).?);
    t.answered(i, true, "");
    try std.testing.expectEqual(i, t.nextPending().?);
    t.restart(i);
    try std.testing.expect(t.nextPending() == null);
    // The second 401 goes to the step: no loop.
    try std.testing.expectEqual(Decision.deliver, t.onResponse(i, 401));
    try std.testing.expectEqual(@as(u32, 0), t.count);
    try std.testing.expectEqual(@as(u64, 1), t.counters.calls);
    try std.testing.expectEqual(@as(u64, 1), t.counters.resent);
}

test "other statuses and failures go to the step" {
    var t = try Table.init(std.testing.allocator, 4, 1024);
    defer t.deinit();
    try std.testing.expectEqual(Decision.deliver, t.onResponse(testAdd(&t, 1, 0, "wf").?, 200));
    try std.testing.expectEqual(Decision.deliver, t.onResponse(testAdd(&t, 1, 1, "wf").?, 500));
    try std.testing.expectEqual(Decision.deliver, t.onResponse(testAdd(&t, 1, 2, "wf").?, 0));
    try std.testing.expectEqual(@as(u32, 0), t.count);
}

test "requests for the same slot of a workflow share one renewal" {
    var t = try Table.init(std.testing.allocator, 8, 1024);
    defer t.deinit();
    const a = testAdd(&t, 1, 0, "wf").?;
    const b = testAdd(&t, 2, 0, "wf").?;
    const other = testAdd(&t, 3, 0, "wf2").?;
    try std.testing.expectEqual(Want.call, t.want(a));
    try std.testing.expectEqual(Want.follow, t.want(b));
    // Another workflow has its own document: its own call.
    try std.testing.expectEqual(Want.call, t.want(other));
    try std.testing.expect(t.leaderAt(2, 0) == null);
    t.answered(a, true, "");
    try std.testing.expectEqual(@as(u32, 2), t.pending);
    try std.testing.expectEqual(State.ready, t.entries[b].state);
    try std.testing.expectEqual(State.waiting, t.entries[other].state);
    try std.testing.expectEqual(@as(u64, 1), t.counters.shared);
}

test "a failed renewal fails every request that waits for it" {
    var t = try Table.init(std.testing.allocator, 4, 1024);
    defer t.deinit();
    const a = testAdd(&t, 1, 0, "wf").?;
    const b = testAdd(&t, 2, 0, "wf").?;
    _ = t.want(a);
    _ = t.want(b);
    t.answered(a, false, "The grant was revoked");
    try std.testing.expectEqualStrings("The grant was revoked", t.message(a));
    try std.testing.expectEqualStrings("The grant was revoked", t.message(b));
    t.release(a);
    t.release(b);
    try std.testing.expectEqual(@as(u32, 0), t.pending);
    const c = testAdd(&t, 3, 0, "wf").?;
    _ = t.want(c);
    t.answered(c, false, "");
    try std.testing.expectEqualStrings(failed_text, t.message(c));
}

test "a body that goes once gets the renewal and no resend" {
    var t = try Table.init(std.testing.allocator, 4, 1024);
    defer t.deinit();
    var req = testRequest(1, 0);
    req.single_use = true;
    const i = t.add(req, "wf", "Step", test_args, test_args[2..5], test_info).?;
    try std.testing.expectEqual(Decision.renew_detached, t.onResponse(i, 401));
    try std.testing.expectEqual(Want.call, t.want(i));
    t.answered(i, true, "");
    try std.testing.expectEqual(@as(u32, 0), t.count);
    try std.testing.expect(t.nextPending() == null);
}

test "an execution that ends keeps the renewal for its followers" {
    var t = try Table.init(std.testing.allocator, 4, 1024);
    defer t.deinit();
    const a = testAdd(&t, 1, 0, "wf").?;
    const b = testAdd(&t, 2, 0, "wf").?;
    const c = testAdd(&t, 1, 1, "wf").?;
    _ = t.want(a);
    _ = t.want(b);
    t.dropExec(1);
    try std.testing.expectEqual(State.free, t.entries[c].state);
    try std.testing.expectEqual(a, t.leaderAt(1, 0).?);
    t.answered(a, true, "");
    try std.testing.expectEqual(State.free, t.entries[a].state);
    try std.testing.expectEqual(b, t.nextPending().?);
}

test "a full table and large args are limits, not growth" {
    var t = try Table.init(std.testing.allocator, 1, 1024);
    defer t.deinit();
    const big: [1100]u8 = @splat('x');
    try std.testing.expect(t.add(testRequest(1, 0), "wf", "Step", &big, big[0..1], test_info) == null);
    const a = testAdd(&t, 1, 0, "wf").?;
    try std.testing.expect(testAdd(&t, 2, 0, "wf") == null);
    try std.testing.expectEqual(@as(u64, 1), t.counters.too_large);
    try std.testing.expectEqual(@as(u64, 1), t.counters.full);
    // The step runs again: the effect keeps its row.
    try std.testing.expectEqual(a, testAdd(&t, 1, 0, "wf").?);
    try std.testing.expectEqual(@as(u32, 1), t.count);
}
