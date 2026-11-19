//! Deterministic in-memory duplex byte stream for tests: two bounded ring
//! buffers, partial read/write limits per step that simulate TCP
//! fragmentation and EAGAIN, scripted close/reset, and a readiness token
//! queue that matches sys.Ready. No kernel sockets.
const std = @import("std");
const sys = @import("sys.zig");

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
    fn write(h: *SimHalf, src: []const u8) usize {
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
    fn read(h: *SimHalf, dst: []u8) usize {
        var want = @min(dst.len, h.avail());
        if (h.read_limit) |lim| want = @min(want, lim);
        if (want == 0) return if (h.avail() > 0) 0 else if (h.eof) 0 else 0;
        var n: usize = 0;
        while (n < want) : (n += 1) {
            dst[n] = h.buf[h.tail];
            h.tail = if (h.tail + 1 == ring_cap) 0 else h.tail + 1;
        }
        return n;
    }

    /// Signal that the peer closed this direction.
    fn closeWrite(h: *SimHalf) void {
        h.eof = true;
    }

    /// Reset all state.
    fn reset(h: *SimHalf) void {
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

    fn writeAB(p: *SimPair, src: []const u8) usize {
        return p.ab.write(src);
    }

    fn writeBA(p: *SimPair, src: []const u8) usize {
        return p.ba.write(src);
    }

    fn readAB(p: *SimPair, dst: []u8) usize {
        return p.ab.read(dst);
    }

    fn readBA(p: *SimPair, dst: []u8) usize {
        return p.ba.read(dst);
    }

    /// Close the a→b direction: b sees EOF on its next read.
    fn closeAB(p: *SimPair) void {
        p.ab.closeWrite();
    }

    /// Close the b→a direction: a sees EOF.
    fn closeBA(p: *SimPair) void {
        p.ba.closeWrite();
    }

    /// True when a→b has reached EOF and the buffer is empty.
    fn eofAB(p: *const SimPair) bool {
        return p.ab.eof and p.ab.avail() == 0;
    }

    /// True when b→a has reached EOF and the buffer is empty.
    fn eofBA(p: *const SimPair) bool {
        return p.ba.eof and p.ba.avail() == 0;
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
    fn push(p: *SimPoller, tok: Token) bool {
        if (p.len == p.queue.len) return false;
        p.queue[p.len] = tok;
        p.len += 1;
        return true;
    }

    /// Pop the next token, or null when the queue is empty.
    fn poll(p: *SimPoller) ?Token {
        if (p.len == 0) return null;
        const tok = p.queue[0];
        std.mem.copyForwards(Token, p.queue[0 .. p.queue.len - 1], p.queue[1..p.len]);
        p.len -= 1;
        return tok;
    }

    /// Gather up to `out.len` tokens, return the count.
    fn wait(p: *SimPoller, out: []sys.Ready) usize {
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