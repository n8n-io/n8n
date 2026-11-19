//! Steps that wait for a row of a bounded table or for a large buffer: an
//! outbound request (`--egress-max-requests`, `--egress-big-slots`), a
//! service call (`--max-service-calls`), a credential renewal
//! (`--max-renewals`), a SQL call (`--sql-max-requests`) or an SMTP call
//! (`--smtp-max-requests`). A step that finds its table full waits here, in
//! arrival order, and starts when a row is free (back-pressure: a full table
//! delays a step, it does not fail it). The shell keeps no copy of the args
//! of the step: the core gives them again (`State.pendingDispatch`).
//! The queues are reserved at startup. A full queue is a limit.
const std = @import("std");

/// What a step waits for.
pub const Kind = enum(u8) {
    /// A row of the table of outbound requests.
    http_row,
    /// A large buffer for the body of an outbound request.
    http_big,
    /// A row of the table of service calls.
    service,
    /// A row of the table of credential renewals. `Step.aux` is the status
    /// of the response that asked for the renewal.
    renewal,
    /// A row of a SQL client of the `sql` effect.
    sql,
    /// A row of the SMTP client of the `smtp` effect.
    smtp,
};

/// The count of kinds: `smtp` is the last one.
pub const kinds = 6;

comptime {
    std.debug.assert(@backingInt(Kind.smtp) == kinds - 1);
}

pub const Step = struct {
    exec_id: u64,
    seq: u32,
    aux: u32 = 0,
};

/// One first-in first-out queue for each kind, each of the same capacity.
pub const Queues = struct {
    /// `kinds` rings of `cap` steps, one after the other.
    steps: []Step,
    cap: u32,
    head: [kinds]u32 = @splat(0),
    len: [kinds]u32 = @splat(0),
    /// Steps that began to wait, steps that found the queue full, and the
    /// most that waited at one time, for each kind.
    waited: [kinds]u64 = @splat(0),
    refused: [kinds]u64 = @splat(0),
    high: [kinds]u32 = @splat(0),

    pub fn init(gpa: std.mem.Allocator, cap: u32) error{OutOfMemory}!Queues {
        std.debug.assert(cap >= 1);
        return .{ .steps = try gpa.alloc(Step, @as(usize, cap) * kinds), .cap = cap };
    }

    pub fn deinit(q: *Queues, gpa: std.mem.Allocator) void {
        gpa.free(q.steps);
        q.steps = &.{};
        q.cap = 0;
    }

    fn ring(q: *Queues, kind: Kind) []Step {
        return q.steps[@as(usize, @backingInt(kind)) * q.cap ..][0..q.cap];
    }

    /// Add a step at the end of the queue of `kind`. False when the queue
    /// is full: the caller fails the step at the limit.
    pub fn push(q: *Queues, kind: Kind, step: Step) bool {
        const k = @backingInt(kind);
        std.debug.assert(q.len[k] <= q.cap);
        if (q.len[k] == q.cap) {
            q.refused[k] += 1;
            return false;
        }
        q.ring(kind)[(q.head[k] + q.len[k]) % q.cap] = step;
        q.len[k] += 1;
        q.waited[k] += 1;
        q.high[k] = @max(q.high[k], q.len[k]);
        return true;
    }

    /// Take the oldest step of `kind`, or null when none waits.
    pub fn pop(q: *Queues, kind: Kind) ?Step {
        const k = @backingInt(kind);
        if (q.len[k] == 0) return null;
        const step = q.ring(kind)[q.head[k]];
        q.head[k] = (q.head[k] + 1) % q.cap;
        q.len[k] -= 1;
        return step;
    }

    /// Put a step back at the front: it was taken and its table is full again.
    pub fn unpop(q: *Queues, kind: Kind, step: Step) void {
        const k = @backingInt(kind);
        std.debug.assert(q.len[k] < q.cap);
        q.head[k] = (q.head[k] + q.cap - 1) % q.cap;
        q.ring(kind)[q.head[k]] = step;
        q.len[k] += 1;
    }

    pub fn waiting(q: *const Queues, kind: Kind) u32 {
        return q.len[@backingInt(kind)];
    }

    pub fn total(q: *const Queues) u32 {
        var n: u32 = 0;
        for (q.len) |l| n += l;
        return n;
    }
};

test "step wait: steps leave in arrival order, each kind in its own queue" {
    var q = try Queues.init(std.testing.allocator, 4);
    defer q.deinit(std.testing.allocator);
    try std.testing.expect(q.pop(.service) == null);
    try std.testing.expect(q.push(.service, .{ .exec_id = 1, .seq = 0 }));
    try std.testing.expect(q.push(.http_row, .{ .exec_id = 7, .seq = 3 }));
    try std.testing.expect(q.push(.service, .{ .exec_id = 2, .seq = 5, .aux = 401 }));
    try std.testing.expectEqual(@as(u32, 2), q.waiting(.service));
    try std.testing.expectEqual(@as(u32, 1), q.waiting(.http_row));
    try std.testing.expectEqual(@as(u32, 3), q.total());
    try std.testing.expectEqual(@as(u64, 1), q.pop(.service).?.exec_id);
    const second = q.pop(.service).?;
    try std.testing.expectEqual(@as(u64, 2), second.exec_id);
    try std.testing.expectEqual(@as(u32, 401), second.aux);
    try std.testing.expect(q.pop(.service) == null);
    try std.testing.expectEqual(@as(u64, 7), q.pop(.http_row).?.exec_id);
    try std.testing.expectEqual(@as(u32, 0), q.total());
}

test "step wait: a full queue refuses a step, and a release makes room (the bound)" {
    var q = try Queues.init(std.testing.allocator, 2);
    defer q.deinit(std.testing.allocator);
    try std.testing.expect(q.push(.http_big, .{ .exec_id = 1, .seq = 0 }));
    try std.testing.expect(q.push(.http_big, .{ .exec_id = 2, .seq = 0 }));
    try std.testing.expect(!q.push(.http_big, .{ .exec_id = 3, .seq = 0 }));
    try std.testing.expectEqual(@as(u64, 1), q.refused[@backingInt(Kind.http_big)]);
    // Another kind has its own room.
    try std.testing.expect(q.push(.renewal, .{ .exec_id = 9, .seq = 0 }));
    try std.testing.expectEqual(@as(u64, 1), q.pop(.http_big).?.exec_id);
    try std.testing.expect(q.push(.http_big, .{ .exec_id = 3, .seq = 0 }));
    try std.testing.expectEqual(@as(u64, 2), q.pop(.http_big).?.exec_id);
    try std.testing.expectEqual(@as(u64, 3), q.pop(.http_big).?.exec_id);
    try std.testing.expectEqual(@as(u32, 2), q.high[@backingInt(Kind.http_big)]);
    try std.testing.expectEqual(@as(u64, 3), q.waited[@backingInt(Kind.http_big)]);
}

test "step wait: a step that goes back keeps its place at the front, around the end of the ring" {
    var q = try Queues.init(std.testing.allocator, 3);
    defer q.deinit(std.testing.allocator);
    var next: u64 = 1;
    var want: u64 = 1;
    // Many rounds, so the head passes the end of the ring.
    for (0..50) |_| {
        while (q.waiting(.service) < 3) : (next += 1) try std.testing.expect(q.push(.service, .{ .exec_id = next, .seq = 0 }));
        const s = q.pop(.service).?;
        try std.testing.expectEqual(want, s.exec_id);
        // Its table is full again: the step waits on, first in the queue.
        q.unpop(.service, s);
        try std.testing.expectEqual(want, q.pop(.service).?.exec_id);
        want += 1;
    }
}
