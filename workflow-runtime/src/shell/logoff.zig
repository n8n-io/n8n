//! Log offload (docs/log-offload.md): the shard thread queues each log
//! record in a ring of bytes, and a writer thread on another core appends
//! the bytes to the log and syncs it. The shard holds the outputs that must
//! wait for a sync in a queue, and releases them in order when the writer
//! says how far the log is durable. A position is a count of log bytes
//! since the start: the position of a record is the position of its end.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const sys = @import("sys.zig");

const Atomic = std.atomic.Value;

/// Where the writer puts the bytes: the same two calls as the blocking path.
pub const Sink = struct {
    ctx: *anyopaque,
    appendFn: *const fn (ctx: *anyopaque, bytes: []const u8) anyerror!void,
    syncFn: *const fn (ctx: *anyopaque) anyerror!void,

    pub fn append(l: Sink, bytes: []const u8) !void {
        return l.appendFn(l.ctx, bytes);
    }
    pub fn sync(l: Sink) !void {
        return l.syncFn(l.ctx);
    }
};

pub const Error = error{ LogWrite, LogSync, LogStalled };

/// What a batch needs before its outputs leave.
pub const SyncNeed = enum {
    /// Nothing waits.
    no,
    /// The outputs of its `sync`-tier actions wait for its record.
    tier,
    /// Every output waits: a schedule fire or a block of `none`-tier ids.
    all,
};

/// A ring of bytes with one producer and one consumer. `head` and `tail`
/// count bytes since the start; the producer writes only `head` and the
/// consumer only `tail`, each on its own cache line.
pub const Ring = struct {
    buf: []u8,
    head: Atomic(u64) align(std.atomic.cache_line) = .init(0),
    tail: Atomic(u64) align(std.atomic.cache_line) = .init(0),

    /// `bytes` is a power of two.
    pub fn init(gpa: std.mem.Allocator, bytes: usize) error{OutOfMemory}!Ring {
        std.debug.assert(bytes >= 64 and std.math.isPowerOfTwo(bytes));
        return .{ .buf = try core_lib.arena.reserve(gpa, u8, bytes) };
    }

    pub fn used(r: *const Ring) usize {
        const n = r.head.load(.acquire) - r.tail.load(.acquire);
        std.debug.assert(n <= r.buf.len);
        return @intCast(n);
    }

    /// Producer: `n` free bytes in one piece at the head, or null. The
    /// record is encoded there: no copy from a second buffer.
    pub fn reserve(r: *Ring, n: usize) ?[]u8 {
        const h = r.head.load(.monotonic);
        const off: usize = @intCast(h & (r.buf.len - 1));
        if (n > r.buf.len - (h - r.tail.load(.acquire))) return null;
        if (off + n > r.buf.len) return null;
        return r.buf[off..][0..n];
    }

    /// Producer: the `n` bytes at the head are a part of the stream now.
    pub fn commit(r: *Ring, n: usize) void {
        const h = r.head.load(.monotonic);
        std.debug.assert(n <= r.buf.len - (h - r.tail.load(.acquire)));
        r.head.store(h + n, .release);
    }

    /// Producer: copy as many bytes of `bytes` as fit. Returns the count.
    pub fn push(r: *Ring, bytes: []const u8) usize {
        const h = r.head.load(.monotonic);
        const free: usize = @intCast(r.buf.len - (h - r.tail.load(.acquire)));
        const n = @min(bytes.len, free);
        const off: usize = @intCast(h & (r.buf.len - 1));
        const first = @min(n, r.buf.len - off);
        @memcpy(r.buf[off..][0..first], bytes[0..first]);
        @memcpy(r.buf[0 .. n - first], bytes[first..n]);
        r.head.store(h + n, .release);
        return n;
    }

    /// Consumer: the queued bytes in stream order, in at most two parts.
    pub fn peek(r: *const Ring) [2][]const u8 {
        const t = r.tail.load(.monotonic);
        const n: usize = @intCast(r.head.load(.acquire) - t);
        std.debug.assert(n <= r.buf.len);
        const off: usize = @intCast(t & (r.buf.len - 1));
        const first = @min(n, r.buf.len - off);
        return .{ r.buf[off..][0..first], r.buf[0 .. n - first] };
    }

    /// Consumer: the first `n` queued bytes are free again.
    pub fn take(r: *Ring, n: usize) void {
        const t = r.tail.load(.monotonic);
        std.debug.assert(n <= r.head.load(.acquire) - t);
        r.tail.store(t + n, .release);
    }
};

/// One held output: the action, a copy of its payload, and the position
/// that must be durable before it leaves.
pub const Held = struct {
    pos: u64,
    since_ns: u64,
    /// The position of the payload copy in the byte queue.
    start: u64,
    a: core.Action,
};

/// The held outputs of a shard, oldest first. Only the shard thread uses
/// it. Positions never go down from the head to the tail of the queue, so
/// a release looks only at the oldest entry: there is no scan.
pub const Hold = struct {
    items: []Held,
    bytes: []u8,
    head: u64 = 0,
    tail: u64 = 0,
    b_head: u64 = 0,
    b_tail: u64 = 0,
    /// The position of the newest entry.
    last_pos: u64 = 0,

    /// `max_items` and `bytes` are powers of two.
    pub fn init(gpa: std.mem.Allocator, max_items: usize, bytes: usize) error{OutOfMemory}!Hold {
        std.debug.assert(std.math.isPowerOfTwo(max_items) and std.math.isPowerOfTwo(bytes));
        return .{ .items = try core_lib.arena.reserve(gpa, Held, max_items), .bytes = try core_lib.arena.reserve(gpa, u8, bytes) };
    }

    pub fn len(h: *const Hold) usize {
        return @intCast(h.head - h.tail);
    }

    /// Copy the action and its payload to the end of the queue. False when
    /// the queue has no room: a limit, the caller waits for the writer.
    pub fn push(h: *Hold, pos: u64, since_ns: u64, a: core.Action) bool {
        std.debug.assert(pos >= h.last_pos or h.len() == 0);
        if (h.len() == h.items.len) return false;
        var start = h.b_head;
        const off: usize = @intCast(start & (h.bytes.len - 1));
        // A payload is in one piece: skip the end of the buffer.
        if (off + a.payload.len > h.bytes.len) start += h.bytes.len - off;
        if (start + a.payload.len - h.b_tail > h.bytes.len) return false;
        const dst = h.bytes[@intCast(start & (h.bytes.len - 1))..][0..a.payload.len];
        @memcpy(dst, a.payload);
        const slot = &h.items[@intCast(h.head & (h.items.len - 1))];
        slot.* = .{ .pos = pos, .since_ns = since_ns, .start = start, .a = a };
        slot.a.payload = dst;
        h.b_head = start + a.payload.len;
        h.head += 1;
        h.last_pos = pos;
        return true;
    }

    /// The oldest entry, or null.
    pub fn front(h: *const Hold) ?*const Held {
        if (h.head == h.tail) return null;
        return &h.items[@intCast(h.tail & (h.items.len - 1))];
    }

    pub fn pop(h: *Hold) void {
        std.debug.assert(h.head > h.tail);
        h.tail += 1;
        h.b_tail = if (h.front()) |f| f.start else h.b_head;
        std.debug.assert(h.b_tail <= h.b_head);
    }
};

/// What the shard thread does with one action of a batch.
pub const Route = enum {
    /// Perform it now.
    pass,
    /// It is in the hold queue.
    held,
    /// The hold queue has no room: call `waitRoom`, release, and ask again.
    full,
};

/// Counts of the shard thread.
pub const Counters = struct {
    records: u64 = 0,
    bytes: u64 = 0,
    /// Records encoded in the ring, with no copy from the batch buffer.
    in_place: u64 = 0,
    sync_requests: u64 = 0,
    held: u64 = 0,
    released: u64 = 0,
    ring_full_waits: u64 = 0,
    hold_full_waits: u64 = 0,
    /// Wake-ups sent to a writer that slept: one system call each.
    wakes: u64 = 0,
    /// Wake-ups of the writer that the shard thread read.
    sleeps: u64 = 0,
};

/// The bound of a wait for the writer: this many waits of `wait_ms`.
const max_waits: u32 = 3000;
const wait_ms: i32 = 10;
/// How many times the writer looks for work before it sleeps.
const idle_spins: u32 = 20_000;

pub const Offload = struct {
    ring: Ring,
    hold: Hold,
    sink: Sink,
    /// The shard wants a sync that covers this position.
    want_sync: Atomic(u64) = .init(0),
    /// The log is durable up to this position. Only the writer writes it.
    synced: Atomic(u64) = .init(0),
    writer_idle: Atomic(bool) = .init(false),
    exec_waiting: Atomic(bool) = .init(false),
    stop: Atomic(bool) = .init(false),
    failed: Atomic(bool) = .init(false),
    /// Counts of the writer.
    appends: Atomic(u64) = .init(0),
    syncs: Atomic(u64) = .init(0),
    /// Times the writer slept and a wake-up of the shard ended the sleep.
    writer_wakeups: Atomic(u64) = .init(0),
    /// Wake-ups that found the pipe full: the reader had one already.
    dropped_wakes: Atomic(u64) = .init(0),
    /// A writer thread runs. Without one (tests, the simulation) the shard
    /// thread does the writer's work when it must wait: the blocking path.
    threaded: bool = false,
    to_writer: ?sys.Wake = null,
    to_exec: ?sys.Wake = null,
    // The fields below belong to the shard thread.
    /// The position of the last batch whose need was `all`.
    floor: u64 = 0,
    batch_pos: u64 = 0,
    batch_need: SyncNeed = .no,
    /// The value of `synced` at the last `poll`.
    synced_seen: u64 = 0,
    /// The longest time that an output waited in the hold queue.
    longest_hold_ns: u64 = 0,
    counters: Counters = .{},

    /// The ring and the hold queue walk through all their memory, so they
    /// are small enough to stay in the cache of the core. A record or a
    /// burst that is larger waits for the writer (a limit).
    pub const Sizes = struct { ring_bytes: usize = 1 << 20, hold_items: usize = 1 << 12, hold_bytes: usize = 1 << 20 };

    pub fn init(gpa: std.mem.Allocator, sink: Sink, sizes: Sizes) error{OutOfMemory}!Offload {
        return .{ .ring = try Ring.init(gpa, sizes.ring_bytes), .hold = try Hold.init(gpa, sizes.hold_items, sizes.hold_bytes), .sink = sink };
    }

    // ---- the shard thread: records -------------------------------------------

    /// The position of the end of the last queued record.
    pub fn position(o: *const Offload) u64 {
        return o.ring.head.load(.monotonic);
    }

    /// Room for a record of `n` bytes in one piece, or null: then encode
    /// it elsewhere and call `append`.
    pub fn reserve(o: *Offload, n: usize) ?[]u8 {
        return o.ring.reserve(n);
    }

    pub fn commit(o: *Offload, n: usize) void {
        o.ring.commit(n);
        o.counters.in_place += 1;
        o.queued(n);
    }

    /// Queue a record. A full ring is a limit: the shard waits for the
    /// writer, as it waits for the write on the blocking path.
    pub fn append(o: *Offload, rec: []const u8) Error!void {
        var off: usize = 0;
        for (0..max_waits) |_| {
            off += o.ring.push(rec[off..]);
            if (off == rec.len) return o.queued(rec.len);
            o.counters.ring_full_waits += 1;
            if (!o.threaded) {
                try o.drain();
                continue;
            }
            o.exec_waiting.store(true, .seq_cst);
            o.kick();
            if (o.ring.used() == o.ring.buf.len) o.sleepExec();
            if (o.failed.load(.acquire)) return error.LogWrite;
        }
        return error.LogStalled;
    }

    fn queued(o: *Offload, n: usize) void {
        o.counters.records += 1;
        o.counters.bytes += n;
        // The writer starts before the ring is full.
        if (o.threaded and o.ring.used() >= o.ring.buf.len / 2) o.kick();
    }

    /// The record of a batch is queued (a batch can have none). Call it
    /// once for each batch, before the outputs of the batch are routed.
    pub fn endRecord(o: *Offload, need: SyncNeed) void {
        o.batch_pos = o.position();
        o.batch_need = need;
        std.debug.assert(o.batch_pos >= o.floor);
        if (need == .no) return;
        if (need == .all) o.floor = o.batch_pos;
        o.requestSync();
    }

    /// Ask for a sync of every queued byte. It does not wait.
    pub fn requestSync(o: *Offload) void {
        const pos = o.position();
        if (pos <= o.synced_seen) return;
        if (o.want_sync.load(.monotonic) < pos) {
            o.want_sync.store(pos, .seq_cst);
            o.counters.sync_requests += 1;
        }
        o.kick();
    }

    fn kick(o: *Offload) void {
        if (!o.threaded) return;
        if (!o.writer_idle.swap(false, .seq_cst)) return;
        if (o.to_writer) |k| o.counters.wakes += @intFromBool(k.notify());
    }

    fn sleepExec(o: *Offload) void {
        if (o.to_exec) |k| o.counters.sleeps += @min(k.wait(wait_ms), 1);
    }

    // ---- the shard thread: outputs -------------------------------------------

    /// Read how far the log is durable. An error of the writer stops the
    /// shard, as an error of the write does on the blocking path.
    pub fn poll(o: *Offload) Error!void {
        if (o.failed.load(.acquire)) return error.LogWrite;
        const now = o.synced.load(.acquire);
        std.debug.assert(now >= o.synced_seen);
        o.synced_seen = now;
    }

    /// True when `route` can hold an action of this batch: the caller
    /// then reads the clock once for the batch.
    pub fn mayHold(o: *const Offload) bool {
        return o.batch_need != .no or o.floor > o.synced_seen or o.hold.len() > 0;
    }

    /// Decide for one action of the batch, in the order of the batch.
    /// An action waits for the record of its batch when the batch needs a
    /// sync for it, and for the floor. While an older output waits, a newer
    /// one waits behind it: outputs leave in the order of the blocking path.
    pub fn route(o: *Offload, a: core.Action, now_ns: u64) Route {
        var pos: u64 = if (o.floor > o.synced_seen) o.floor else 0;
        if (o.batch_need == .all or (o.batch_need == .tier and a.durability == .sync)) pos = o.batch_pos;
        if (pos <= o.synced_seen) pos = 0;
        if (pos == 0 and o.hold.len() == 0) return .pass;
        if (!o.hold.push(@max(pos, o.hold.last_pos), now_ns, a)) return .full;
        o.counters.held += 1;
        return .held;
    }

    /// The oldest held output when its position is durable, else null.
    /// Perform it, then call `pop`.
    pub fn ready(o: *const Offload) ?*const Held {
        const f = o.hold.front() orelse return null;
        return if (f.pos <= o.synced_seen) f else null;
    }

    pub fn pop(o: *Offload, now_ns: u64) void {
        const f = o.hold.front() orelse return;
        std.debug.assert(f.pos <= o.synced_seen);
        o.longest_hold_ns = @max(o.longest_hold_ns, now_ns -| f.since_ns);
        o.counters.released += 1;
        o.hold.pop();
    }

    /// The hold queue was full for `a`: wait until an entry can leave, or,
    /// when the queue is empty and `a` alone is too large, until `a` can
    /// pass.
    pub fn waitRoom(o: *Offload) Error!void {
        o.counters.hold_full_waits += 1;
        const pos = if (o.hold.front()) |f| f.pos else @max(o.batch_pos, o.floor);
        return o.waitSynced(pos);
    }

    /// Block until the log is durable up to `pos`.
    fn waitSynced(o: *Offload, pos: u64) Error!void {
        std.debug.assert(pos <= o.position());
        for (0..max_waits) |_| {
            try o.poll();
            if (o.synced_seen >= pos) return;
            o.requestSync();
            if (!o.threaded) {
                if (!try o.step()) return error.LogStalled;
                continue;
            }
            o.exec_waiting.store(true, .seq_cst);
            if (o.synced.load(.seq_cst) < pos) o.sleepExec();
        }
        return error.LogStalled;
    }

    /// Before the shard thread sleeps with held outputs: ask the writer
    /// for a wake-up. True when the log moved on in the meantime: do not
    /// sleep.
    pub fn armWake(o: *Offload) bool {
        std.debug.assert(o.hold.len() > 0);
        o.exec_waiting.store(true, .seq_cst);
        return o.synced.load(.seq_cst) > o.synced_seen or o.failed.load(.acquire);
    }

    // ---- the writer -------------------------------------------------------------

    /// Hand every queued byte to the sink. It does not sync.
    pub fn drain(o: *Offload) Error!void {
        const parts = o.ring.peek();
        for (parts) |p| {
            if (p.len == 0) continue;
            o.sink.append(p) catch return error.LogWrite;
            o.ring.take(p.len);
            bump(&o.appends, 1);
        }
    }

    fn hasWork(o: *const Offload) bool {
        return o.want_sync.load(.seq_cst) > o.synced.load(.monotonic) or o.ring.used() >= o.ring.buf.len / 2;
    }

    /// One pass of the writer: write when a sync is wanted or the ring is
    /// half full, then sync once for every record written (group commit).
    /// True when it did work.
    pub fn step(o: *Offload) Error!bool {
        // The request first, then the bytes: the bytes cover the request.
        const sync_due = o.want_sync.load(.seq_cst) > o.synced.load(.monotonic);
        if (!sync_due and o.ring.used() < o.ring.buf.len / 2) return false;
        try o.drain();
        if (sync_due) {
            const written = o.ring.tail.load(.monotonic);
            o.sink.sync() catch return error.LogSync;
            std.debug.assert(written >= o.synced.load(.monotonic));
            o.synced.store(written, .seq_cst);
            bump(&o.syncs, 1);
        }
        o.wakeExec();
        return true;
    }

    fn wakeExec(o: *Offload) void {
        if (!o.exec_waiting.swap(false, .seq_cst)) return;
        if (o.to_exec) |k| bump(&o.dropped_wakes, @intFromBool(!k.notify()));
    }

    /// A count that only the writer changes.
    fn bump(v: *Atomic(u64), by: u64) void {
        v.store(v.load(.monotonic) + by, .monotonic);
    }

    /// The writer thread. It sleeps when it has no work, and the shard
    /// wakes it for a sync request or a ring that is half full.
    pub fn run(o: *Offload) void {
        std.debug.assert(o.threaded and o.to_writer != null);
        while (!o.stop.load(.acquire)) {
            const worked = o.step() catch return o.fail();
            if (worked) continue;
            // Under load the next request comes soon: look for it for a
            // short time before the sleep, so the shard pays no wake-up.
            var spins: u32 = 0;
            while (spins < idle_spins and !o.hasWork()) : (spins += 1) std.atomic.spinLoopHint();
            if (spins < idle_spins) continue;
            o.writer_idle.store(true, .seq_cst);
            if (!o.hasWork() and !o.stop.load(.acquire)) {
                if (o.to_writer) |k| bump(&o.writer_wakeups, @min(k.wait(50), 1));
            }
            o.writer_idle.store(false, .seq_cst);
        }
        // A clean stop: every queued record is written and synced.
        o.want_sync.store(o.ring.head.load(.acquire), .seq_cst);
        const done = o.step() catch return o.fail();
        std.debug.assert(done or o.ring.used() == 0);
    }

    fn fail(o: *Offload) void {
        o.failed.store(true, .release);
        o.exec_waiting.store(true, .seq_cst);
        o.wakeExec();
    }

    /// Stop the writer thread: it writes and syncs what is queued.
    pub fn requestStop(o: *Offload) void {
        o.stop.store(true, .release);
        if (o.to_writer) |k| o.counters.wakes += @intFromBool(k.notify());
    }
};

// ---- tests ------------------------------------------------------------------------

fn pattern(i: u64) u8 {
    return @truncate(i *% 131 +% (i >> 8));
}

test "ring: bytes come out in the order they went in, across the wrap" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    var r = try Ring.init(arena.allocator(), 256);
    var prng = std.Random.DefaultPrng.init(11);
    const rnd = prng.random();
    var in: u64 = 0;
    var out: u64 = 0;
    var tmp: [200]u8 = @splat(0);
    var in_place: u32 = 0;
    for (0..20_000) |_| {
        const n = 1 + rnd.uintLessThan(usize, tmp.len);
        if (rnd.boolean()) {
            // A record in one piece, or the copy path when it does not fit so.
            if (r.reserve(n)) |dst| {
                for (dst, 0..) |*b, k| b.* = pattern(in + k);
                r.commit(n);
                in += n;
                in_place += 1;
            } else {
                for (tmp[0..n], 0..) |*b, k| b.* = pattern(in + k);
                in += r.push(tmp[0..n]);
            }
        } else {
            const parts = r.peek();
            const take = @min(n, parts[0].len + parts[1].len);
            for (0..take) |k| {
                const b = if (k < parts[0].len) parts[0][k] else parts[1][k - parts[0].len];
                try std.testing.expectEqual(pattern(out + k), b);
            }
            r.take(take);
            out += take;
        }
        try std.testing.expectEqual(in - out, @as(u64, r.used()));
        try std.testing.expect(r.used() <= r.buf.len);
    }
    try std.testing.expect(in_place > 100 and in > 100 * r.buf.len);
}

test "ring: a full ring takes nothing and a reserve never passes the tail" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    var r = try Ring.init(arena.allocator(), 64);
    const fill: [64]u8 = @splat(7);
    try std.testing.expectEqual(@as(usize, 64), r.push(&fill));
    try std.testing.expectEqual(@as(usize, 0), r.push("x"));
    try std.testing.expect(r.reserve(1) == null);
    r.take(10);
    // Ten bytes are free, at the start of the buffer.
    try std.testing.expect(r.reserve(11) == null);
    try std.testing.expectEqual(@as(usize, 10), r.reserve(10).?.len);
    try std.testing.expectEqual(@as(usize, 10), r.push(&fill));
    try std.testing.expectEqual(@as(usize, 64), r.used());
}

const RingPeer = struct {
    r: *Ring,
    total: u64,
    bad: u64 = 0,

    fn consume(p: *RingPeer) void {
        var out: u64 = 0;
        var spins: u64 = 0;
        while (out < p.total and spins < 2_000_000_000) : (spins += 1) {
            const parts = p.r.peek();
            for (parts) |part| {
                for (part) |b| {
                    if (b != pattern(out)) p.bad += 1;
                    out += 1;
                }
                p.r.take(part.len);
            }
        }
        if (out != p.total) p.bad += 1;
    }
};

test "ring: one producer thread and one consumer thread lose no byte" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    var r = try Ring.init(arena.allocator(), 1024);
    var peer: RingPeer = .{ .r = &r, .total = 4 << 20 };
    const th = try std.Thread.spawn(.{}, RingPeer.consume, .{&peer});
    var in: u64 = 0;
    var chunk: [300]u8 = @splat(0);
    var spins: u64 = 0;
    while (in < peer.total and spins < 2_000_000_000) : (spins += 1) {
        const n: usize = @intCast(@min(1 + in % chunk.len, peer.total - in));
        for (chunk[0..n], 0..) |*b, k| b.* = pattern(in + k);
        in += r.push(chunk[0..n]);
    }
    th.join();
    try std.testing.expectEqual(peer.total, in);
    try std.testing.expectEqual(@as(u64, 0), peer.bad);
}

test "hold: outputs leave oldest first with their payloads, and a full queue refuses" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    var h = try Hold.init(arena.allocator(), 8, 256);
    var prng = std.Random.DefaultPrng.init(5);
    const rnd = prng.random();
    var buf: [100]u8 = @splat(0);
    var pushed: u64 = 0;
    var popped: u64 = 0;
    var refused: u32 = 0;
    var lens: [8]usize = @splat(0);
    for (0..20_000) |_| {
        if (rnd.boolean()) {
            const n = rnd.uintLessThan(usize, buf.len);
            @memset(buf[0..n], @truncate(pushed));
            if (h.push(pushed, 0, .{ .kind = .reply, .exec_id = pushed, .payload = buf[0..n] })) {
                lens[@intCast(pushed % 8)] = n;
                pushed += 1;
            } else refused += 1;
        } else if (h.front()) |f| {
            // The oldest entry, with the bytes that went in.
            try std.testing.expectEqual(popped, f.a.exec_id);
            try std.testing.expectEqual(popped, f.pos);
            try std.testing.expectEqual(lens[@intCast(popped % 8)], f.a.payload.len);
            for (f.a.payload) |b| try std.testing.expectEqual(@as(u8, @truncate(popped)), b);
            h.pop();
            popped += 1;
        }
        try std.testing.expect(h.len() <= 8 and h.b_head - h.b_tail <= h.bytes.len);
    }
    try std.testing.expect(refused > 0 and popped > 1000);
    // A payload larger than the buffer never fits: the caller waits and passes it.
    const big: [300]u8 = @splat(1);
    try std.testing.expect(!h.push(pushed, 0, .{ .kind = .reply, .payload = &big }));
}
