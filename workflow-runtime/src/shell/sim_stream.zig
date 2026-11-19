//! Deterministic in-memory duplex byte stream for tests: two bounded ring
//! buffers, partial read/write limits per step that simulate TCP
//! fragmentation and EAGAIN, scripted close/reset, and a readiness token
//! queue that matches sys.Ready. No kernel sockets.
//!
//! `SeededPipe` wraps `SimPair` with a seeded PRNG and a simulated clock so
//! a protocol state machine can be driven with reproducible faults: a
//! fragmented read or write, an EAGAIN stall, a half-close, or an abrupt
//! reset, all from one seed.
const std = @import("std");
const sys = @import("sys.zig");
const sql_net = @import("sql_net.zig");

const ring_cap = 4096;

/// One direction of the pair: a ring buffer with configurable step limits.
pub const SimHalf = struct {
    buf: [ring_cap]u8 = @splat(0),
    head: usize = 0,
    tail: usize = 0,
    /// The peer closed its side.
    eof: bool = false,
    /// Max bytes one read can take, or null for unlimited.
    read_limit: ?usize = null,
    /// Max bytes one write can take before returning 0 (again), or null for unlimited.
    write_limit: ?usize = null,

    fn avail(h: *const SimHalf) usize {
        if (h.head >= h.tail) return h.head - h.tail;
        return ring_cap - h.tail + h.head;
    }

    fn space(h: *const SimHalf) usize {
        return ring_cap - h.avail() - 1;
    }

    /// Write bytes into the ring. Returns the count written, which may be 0
    /// when full or when write_limit caps this step.
    pub fn write(h: *SimHalf, src: []const u8) usize {
        if (h.eof) return 0;
        var want = @min(src.len, h.space());
        if (h.write_limit) |lim| want = @min(want, lim);
        if (want == 0) return 0;
        var n: usize = 0;
        while (n < want) : (n += 1) {
            h.buf[h.head] = src[n];
            h.head = if (h.head + 1 == ring_cap) 0 else h.head + 1;
        }
        return n;
    }

    /// Read bytes from the ring. Returns the count read, which may be 0
    /// when empty (again) or when read_limit caps this step.
    pub fn read(h: *SimHalf, dst: []u8) usize {
        var want = @min(dst.len, h.avail());
        if (h.read_limit) |lim| want = @min(want, lim);
        if (want == 0) return 0;
        var n: usize = 0;
        while (n < want) : (n += 1) {
            dst[n] = h.buf[h.tail];
            h.tail = if (h.tail + 1 == ring_cap) 0 else h.tail + 1;
        }
        return n;
    }

    /// Signal that the peer closed this direction.
    pub fn closeWrite(h: *SimHalf) void {
        h.eof = true;
    }

    /// Reset all state.
    pub fn reset(h: *SimHalf) void {
        h.head = 0;
        h.tail = 0;
        h.eof = false;
        h.read_limit = null;
        h.write_limit = null;
    }
};

/// A pair of unidirectional streams: a→b and b→a.
pub const SimPair = struct {
    ab: SimHalf = .{},
    ba: SimHalf = .{},

    pub fn writeAB(p: *SimPair, src: []const u8) usize {
        return p.ab.write(src);
    }

    pub fn writeBA(p: *SimPair, src: []const u8) usize {
        return p.ba.write(src);
    }

    pub fn readAB(p: *SimPair, dst: []u8) usize {
        return p.ab.read(dst);
    }

    pub fn readBA(p: *SimPair, dst: []u8) usize {
        return p.ba.read(dst);
    }

    /// Close the a→b direction: b sees EOF on its next read.
    pub fn closeAB(p: *SimPair) void {
        p.ab.closeWrite();
    }

    /// Close the b→a direction: a sees EOF.
    pub fn closeBA(p: *SimPair) void {
        p.ba.closeWrite();
    }

    /// True when a→b has reached EOF and the buffer is empty.
    pub fn eofAB(p: *const SimPair) bool {
        return p.ab.eof and p.ab.avail() == 0;
    }

    /// True when b→a has reached EOF and the buffer is empty.
    pub fn eofBA(p: *const SimPair) bool {
        return p.ba.eof and p.ba.avail() == 0;
    }

    /// Reset both directions.
    pub fn reset(p: *SimPair) void {
        p.ab.reset();
        p.ba.reset();
    }
};

/// A readiness token that the poller will deliver.
pub const Token = struct {
    token: u64,
    readable: bool,
    writable: bool,
    eof: bool,
};

/// A simulated poller backed by a fixed queue of readiness tokens.
/// Tokens are dequeued in FIFO order; when the queue is empty wait returns
/// nothing (simulating a timeout).
pub const SimPoller = struct {
    queue: [64]Token = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false }),
    len: usize = 0,

    /// Push one readiness token. False when the queue is full.
    pub fn push(p: *SimPoller, tok: Token) bool {
        if (p.len == p.queue.len) return false;
        p.queue[p.len] = tok;
        p.len += 1;
        return true;
    }

    /// Pop the next token, or null when the queue is empty.
    pub fn poll(p: *SimPoller) ?Token {
        if (p.len == 0) return null;
        const tok = p.queue[0];
        std.mem.copyForwards(Token, p.queue[0 .. p.queue.len - 1], p.queue[1..p.len]);
        p.len -= 1;
        return tok;
    }

    /// Gather up to `out.len` tokens, return the count.
    pub fn wait(p: *SimPoller, out: []sys.Ready) usize {
        const n = @min(out.len, p.len);
        for (out[0..n], 0..) |*r, i| {
            const tok = p.queue[i];
            r.* = .{ .token = tok.token, .readable = tok.readable, .writable = tok.writable, .eof = tok.eof };
        }
        if (n > 0) {
            std.mem.copyForwards(Token, p.queue[0 .. p.queue.len - n], p.queue[n..p.len]);
            p.len -= n;
        }
        return n;
    }

    /// Drop every queued token.
    pub fn reset(p: *SimPoller) void {
        p.len = 0;
    }
};

/// Which direction of a `SimPair` a step touches: `ab` is a→b, `ba` is b→a.
pub const Dir = enum { ab, ba };

/// Map a raw half read to the `sql_net.IoStep` shape: a byte count, an
/// EAGAIN stall, or a close. `want_write` never happens without TLS.
pub fn simRead(half: *SimHalf, dst: []u8) sql_net.IoStep {
    const n = half.read(dst);
    if (n > 0) return .{ .n = n };
    if (half.eof) return .closed;
    return .again;
}

/// Map a raw half write to the `sql_net.IoStep` shape.
pub fn simWrite(half: *SimHalf, src: []const u8) sql_net.IoStep {
    const n = half.write(src);
    if (n > 0) return .{ .n = n };
    if (half.eof) return .closed;
    return .again;
}

/// The fault knobs of a `SeededPipe`. A value of 0 turns a knob off.
pub const FaultProfile = struct {
    /// Max bytes one read or write may move in a step; 0 means unlimited.
    frag: usize = 0,
    /// Per-mille chance a step is an EAGAIN stall.
    eagain_per_mille: u32 = 0,
    /// Per-mille chance a step is an abrupt reset.
    reset_per_mille: u32 = 0,
};

/// A `SimPair` driven by a seeded PRNG and a simulated clock. Reads and
/// writes draw from the profile: a fragmented chunk, an EAGAIN stall, or a
/// reset, all reproducible from the seed. A reset sets `rst`; every later
/// step is `.closed` until `reset` clears it.
pub const SeededPipe = struct {
    pair: SimPair = .{},
    rng: std.Random.DefaultPrng,
    now_ms: u64 = 0,
    profile: FaultProfile = .{},
    rst: bool = false,

    pub fn init(seed: u64) SeededPipe {
        return .{ .rng = std.Random.DefaultPrng.init(seed) };
    }

    fn half(p: *SeededPipe, dir: Dir) *SimHalf {
        return switch (dir) {
            .ab => &p.pair.ab,
            .ba => &p.pair.ba,
        };
    }

    /// Advance the simulated clock.
    pub fn tick(p: *SeededPipe, ms: u64) void {
        p.now_ms += ms;
    }

    /// Close one direction: the peer sees EOF after the buffered bytes.
    pub fn close(p: *SeededPipe, dir: Dir) void {
        p.half(dir).closeWrite();
    }

    /// Force an abrupt reset now: every step is `.closed` until `reset`.
    pub fn injectReset(p: *SeededPipe) void {
        p.rst = true;
    }

    /// Clear a reset and both directions: a fresh connection.
    pub fn reset(p: *SeededPipe) void {
        p.pair.reset();
        p.rst = false;
    }

    /// One read step with the profile's faults.
    pub fn read(p: *SeededPipe, dir: Dir, dst: []u8) sql_net.IoStep {
        if (p.rst) return .closed;
        if (p.roll(p.profile.reset_per_mille)) {
            p.rst = true;
            return .closed;
        }
        if (p.roll(p.profile.eagain_per_mille)) return .again;
        return simRead(p.fragmented(dir), dst);
    }

    /// One write step with the profile's faults.
    pub fn write(p: *SeededPipe, dir: Dir, src: []const u8) sql_net.IoStep {
        if (p.rst) return .closed;
        if (p.roll(p.profile.reset_per_mille)) {
            p.rst = true;
            return .closed;
        }
        if (p.roll(p.profile.eagain_per_mille)) return .again;
        return simWrite(p.fragmented(dir), src);
    }

    fn roll(p: *SeededPipe, per_mille: u32) bool {
        if (per_mille == 0) return false;
        return p.rng.random().uintLessThan(u32, 1000) < per_mille;
    }

    /// Set the step limit for this direction from `profile.frag`.
    fn fragmented(p: *SeededPipe, dir: Dir) *SimHalf {
        const h = p.half(dir);
        if (p.profile.frag == 0) {
            h.read_limit = null;
            h.write_limit = null;
            return h;
        }
        const lim = p.rng.random().uintLessThan(usize, p.profile.frag) + 1;
        h.read_limit = lim;
        h.write_limit = lim;
        return h;
    }
};

// ---- tests -----------------------------------------------------------------

const t = std.testing;

test "SimHalf: read and write" {
    var h: SimHalf = .{};
    const n = h.write("hello");
    try t.expectEqual(@as(usize, 5), n);
    try t.expectEqual(@as(usize, 5), h.avail());
    var buf: [16]u8 = @splat(0);
    const m = h.read(&buf);
    try t.expectEqual(@as(usize, 5), m);
    try t.expectEqualStrings("hello", buf[0..5]);
    try t.expectEqual(@as(usize, 0), h.avail());
}

test "SimHalf: partial read with limit" {
    var h: SimHalf = .{};
    h.read_limit = 2;
    _ = h.write("abcdef");
    var buf: [16]u8 = @splat(0);
    try t.expectEqual(@as(usize, 2), h.read(&buf));
    try t.expectEqualStrings("ab", buf[0..2]);
    try t.expectEqual(@as(usize, 2), h.read(&buf));
    try t.expectEqualStrings("cd", buf[0..2]);
}

test "SimHalf: partial write with limit" {
    var h: SimHalf = .{};
    h.write_limit = 2;
    try t.expectEqual(@as(usize, 2), h.write("abcdef"));
    try t.expectEqual(@as(usize, 2), h.avail());
}

test "SimHalf: write to full returns 0" {
    var h: SimHalf = .{};
    // Fill almost to capacity.
    const big: [ring_cap - 1]u8 = @splat('x');
    try t.expectEqual(@as(usize, ring_cap - 1), h.write(&big));
    try t.expectEqual(@as(usize, 0), h.write("!"));
}

test "SimHalf: read empty returns 0, not closed" {
    var h: SimHalf = .{};
    var buf: [4]u8 = @splat(0);
    try t.expectEqual(@as(usize, 0), h.read(&buf));
    try t.expect(!h.eof);
}

test "SimHalf: EOF makes bytes available then returns 0" {
    var h: SimHalf = .{};
    _ = h.write("xx");
    h.closeWrite();
    var buf: [4]u8 = @splat(0);
    try t.expectEqual(@as(usize, 2), h.read(&buf));
    try t.expectEqual(@as(usize, 0), h.read(&buf));
    try t.expect(h.eof and h.avail() == 0);
}

test "SimPair: duplex delivery" {
    var p: SimPair = .{};
    try t.expectEqual(@as(usize, 3), p.writeAB("foo"));
    try t.expectEqual(@as(usize, 3), p.writeBA("bar"));
    var ab: [4]u8 = @splat(0);
    var ba: [4]u8 = @splat(0);
    try t.expectEqual(@as(usize, 3), p.readAB(&ab));
    try t.expectEqualStrings("foo", ab[0..3]);
    try t.expectEqual(@as(usize, 3), p.readBA(&ba));
    try t.expectEqualStrings("bar", ba[0..3]);
}

test "SimPair: peer EOF" {
    var p: SimPair = .{};
    _ = p.writeAB("hi");
    p.closeAB();
    var buf: [4]u8 = @splat(0);
    try t.expectEqual(@as(usize, 2), p.readAB(&buf));
    try t.expect(p.eofAB());
}

test "SimPair: backpressure" {
    var p: SimPair = .{};
    p.ab.write_limit = 3;
    const msg = "hello!";
    // First write takes 3 bytes.
    try t.expectEqual(@as(usize, 3), p.writeAB(msg));
    // Second write: limit is 3 but only 3 left in msg.
    try t.expectEqual(@as(usize, 3), p.writeAB(msg[3..]));
    // Drain and verify.
    var buf: [8]u8 = @splat(0);
    try t.expectEqual(@as(usize, 6), p.readAB(&buf));
    try t.expectEqualStrings("hello!", buf[0..6]);
}

test "SimPoller: push and poll one" {
    var sp: SimPoller = .{};
    try t.expect(sp.push(.{ .token = 42, .readable = true, .writable = false, .eof = false }));
    const tok = sp.poll().?;
    try t.expectEqual(@as(u64, 42), tok.token);
    try t.expect(tok.readable);
    try t.expect(!tok.writable);
    try t.expect(!tok.eof);
    try t.expect(sp.poll() == null);
}

test "SimPoller: wait gathers multiple" {
    var sp: SimPoller = .{};
    try t.expect(sp.push(.{ .token = 1, .readable = true, .writable = false, .eof = false }));
    try t.expect(sp.push(.{ .token = 2, .readable = false, .writable = true, .eof = false }));
    try t.expect(sp.push(.{ .token = 3, .readable = false, .writable = false, .eof = true }));
    var out: [4]sys.Ready = undefined;
    const n = sp.wait(&out);
    try t.expectEqual(@as(usize, 3), n);
    try t.expectEqual(@as(u64, 1), out[0].token);
    try t.expect(out[0].readable);
    try t.expectEqual(@as(u64, 2), out[1].token);
    try t.expect(out[1].writable);
    try t.expectEqual(@as(u64, 3), out[2].token);
    try t.expect(out[2].eof);
    try t.expectEqual(@as(usize, 0), sp.wait(&out));
}

test "SimHalf: wrap-around" {
    var h: SimHalf = .{};
    // Fill the ring to create a wrap scenario.
    const cap: usize = ring_cap;
    var i: usize = 0;
    while (i < cap - 1) : (i += 1) {
        _ = h.write(&[_]u8{@intCast(i & 0xFF)});
    }
    // Drain half.
    var buf: [2048]u8 = @splat(0);
    _ = h.read(buf[0 .. cap / 2]);
    // Write more.
    _ = h.write("wrap");
    // Read the rest.
    const n = h.read(buf[0..]);
    try t.expect(n > 0);
}

test "simRead and simWrite map to IoStep" {
    var h: SimHalf = .{};
    try t.expectEqual(sql_net.IoStep{ .n = 5 }, simWrite(&h, "hello"));
    var buf: [8]u8 = @splat(0);
    try t.expectEqual(sql_net.IoStep{ .n = 5 }, simRead(&h, &buf));
    try t.expectEqual(sql_net.IoStep.again, simRead(&h, &buf));
    h.closeWrite();
    try t.expectEqual(sql_net.IoStep.closed, simRead(&h, &buf));
    try t.expectEqual(sql_net.IoStep.closed, simWrite(&h, "x"));
}

test "SeededPipe: fragmented writes and reads deliver exact bytes" {
    const msg = "the quick brown fox jumps";
    var a = SeededPipe.init(99);
    a.profile = .{ .frag = 4, .eagain_per_mille = 300 };
    // Write the whole message through the faulted pipe, bounded steps.
    var wa: usize = 0;
    var steps: u32 = 0;
    while (wa < msg.len and steps < 10_000) : (steps += 1) {
        const s = a.write(.ab, msg[wa..]);
        switch (s) {
            .n => |n| wa += n,
            .again => {},
            .closed, .want_write => unreachable, // no reset or TLS in this profile
        }
    }
    try t.expectEqual(@as(usize, msg.len), wa);
    // Read it back, fragmented, and compare byte for byte.
    var got: [msg.len]u8 = @splat(0);
    var ra: usize = 0;
    steps = 0;
    while (ra < msg.len and steps < 10_000) : (steps += 1) {
        const s = a.read(.ab, got[ra..]);
        switch (s) {
            .n => |n| ra += n,
            .again => {},
            .closed, .want_write => unreachable, // no reset or TLS in this profile
        }
    }
    try t.expectEqualStrings(msg, &got);
}

test "SeededPipe: same seed replays the same step sequence" {
    const profile = FaultProfile{ .frag = 6, .eagain_per_mille = 250, .reset_per_mille = 40 };
    var a = SeededPipe.init(1234);
    a.profile = profile;
    var b = SeededPipe.init(1234);
    b.profile = profile;
    var i: u32 = 0;
    while (i < 200) : (i += 1) {
        const src = [_]u8{ 1, 2, 3, 4, 5, 6, 7, 8 };
        const sa = a.write(.ba, &src);
        const sb = b.write(.ba, &src);
        try t.expectEqual(sa, sb);
        if (a.rst) {
            a.reset();
            b.reset();
        }
    }
}

test "SeededPipe: abrupt reset closes until reset" {
    var p = SeededPipe.init(5);
    _ = p.write(.ab, "hi");
    p.injectReset();
    var buf: [4]u8 = @splat(0);
    try t.expectEqual(sql_net.IoStep.closed, p.read(.ab, &buf));
    try t.expectEqual(sql_net.IoStep.closed, p.write(.ab, "x"));
    p.reset();
    try t.expectEqual(sql_net.IoStep{ .n = 3 }, p.write(.ab, "abc"));
    try t.expectEqual(sql_net.IoStep{ .n = 3 }, p.read(.ab, &buf));
    try t.expectEqualStrings("abc", buf[0..3]);
}

test "SeededPipe: half-close then EOF after drain" {
    var p = SeededPipe.init(5);
    _ = p.write(.ab, "done");
    p.close(.ab);
    var buf: [8]u8 = @splat(0);
    try t.expectEqual(sql_net.IoStep{ .n = 4 }, p.read(.ab, &buf));
    try t.expectEqual(sql_net.IoStep.closed, p.read(.ab, &buf));
}

// The protocol test file is wired in here so `zig build test-debug` runs it.
test {
    _ = @import("sim_proto_test.zig");
}
