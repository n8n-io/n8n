//! Deterministic protocol-session simulation over `sim_stream`. A request/
//! response state machine is driven through `SeededPipe` with seeded faults,
//! `SimPoller` wakeups, a `TimerWheel` for deadlines and idle timeouts, a
//! `net_pool` keyed pool with LRU eviction and sticky slots, `FreeStack`
//! request slots, `DoneRing` completion order, and generation-checked
//! `Handle`s. Pure in-memory: no sockets, no clock, no threads.
const std = @import("std");
const sys = @import("sys.zig");
const sql_net = @import("sql_net.zig");
const sim_stream = @import("sim_stream.zig");
const net_pool = @import("net_pool.zig");
const handle = @import("handle.zig");

const t = std.testing;
const SeededPipe = sim_stream.SeededPipe;
const SimPoller = sim_stream.SimPoller;
const SimPair = sim_stream.SimPair;
const SimHalf = sim_stream.SimHalf;
const Dir = sim_stream.Dir;
const FaultProfile = sim_stream.FaultProfile;
const Pool = net_pool.Pool;
const TimerWheel = net_pool.TimerWheel;
const Link = net_pool.Link;
const ConnHandle = handle.Handle(struct {});
const no_slot: u16 = std.math.maxInt(u16);

// ---- focused harness tests ------------------------------------------------

test "proto: SimHalf and SimPair pub methods map to IoStep" {
    var half: SimHalf = .{};
    try t.expectEqual(@as(usize, 3), half.write("abc"));
    var buf: [8]u8 = @splat(0);
    try t.expectEqual(sql_net.IoStep{ .n = 3 }, sim_stream.simRead(&half, &buf));
    try t.expectEqual(sql_net.IoStep.again, sim_stream.simRead(&half, &buf));
    half.closeWrite();
    try t.expectEqual(sql_net.IoStep.closed, sim_stream.simRead(&half, &buf));
    half.reset();
    try t.expectEqual(sql_net.IoStep.again, sim_stream.simRead(&half, &buf));
    try t.expectEqual(sql_net.IoStep{ .n = 2 }, sim_stream.simWrite(&half, "hi"));

    var pair: SimPair = .{};
    try t.expectEqual(@as(usize, 1), pair.writeAB("x"));
    try t.expectEqual(@as(usize, 1), pair.writeBA("y"));
    try t.expectEqual(@as(usize, 1), pair.readAB(&buf));
    try t.expectEqual(@as(usize, 1), pair.readBA(&buf));
    pair.closeAB();
    pair.closeBA();
    try t.expect(pair.eofAB());
    try t.expect(pair.eofBA());
    pair.reset();
    try t.expect(!pair.eofAB());
    try t.expect(!pair.eofBA());
}

test "proto: SimPoller push, poll, reset" {
    var sp: SimPoller = .{};
    try t.expect(sp.push(.{ .token = 9, .readable = true, .writable = false, .eof = false }));
    const tok = sp.poll().?;
    try t.expectEqual(@as(u64, 9), tok.token);
    try t.expect(tok.readable);
    try t.expect(sp.push(.{ .token = 1, .readable = false, .writable = false, .eof = false }));
    sp.reset();
    try t.expect(sp.poll() == null);
}

test "proto: SeededPipe clock, half-close, and injectReset" {
    var p = SeededPipe.init(3);
    p.tick(40);
    try t.expectEqual(@as(u64, 40), p.now_ms);
    try t.expectEqual(sql_net.IoStep{ .n = 5 }, p.write(.ab, "hello"));
    p.close(.ab);
    p.injectReset();
    var buf: [8]u8 = @splat(0);
    try t.expectEqual(sql_net.IoStep.closed, p.read(.ab, &buf));
    p.reset();
    try t.expectEqual(sql_net.IoStep{ .n = 2 }, p.write(.ab, "ok"));
    // reset clears the fault but keeps the simulated clock.
    try t.expectEqual(@as(u64, 40), p.now_ms);
}

test "proto: Handle generation, FreeStack, DoneRing" {
    var gen: u16 = 0;
    const h = ConnHandle.of(2, gen);
    try t.expect(h.matches(2, gen));
    gen = ConnHandle.nextGen(gen);
    try t.expect(!h.matches(2, gen));
    // FreeStack gives the smallest index first.
    var buf: [4]u32 = @splat(0);
    var fs = net_pool.FreeStack(u32){ .items = &buf };
    fs.initAll();
    try t.expectEqual(@as(u32, 0), fs.pop().?);
    try t.expectEqual(@as(u32, 1), fs.pop().?);
    fs.push(0);
    try t.expectEqual(@as(u32, 0), fs.pop().?);
    // DoneRing wraps around its buffer edge.
    var db: [3]u32 = @splat(0);
    var dr = net_pool.DoneRing(u32){ .items = &db };
    dr.push(7);
    dr.push(8);
    try t.expectEqual(@as(u32, 7), dr.pop().?);
    dr.push(9);
    dr.push(10);
    try t.expectEqual(@as(u32, 8), dr.pop().?);
    try t.expectEqual(@as(u32, 9), dr.pop().?);
    try t.expectEqual(@as(u32, 10), dr.pop().?);
    try t.expect(dr.pop() == null);
}

test "proto: poolFor evicts a stale sticky pool as LRU" {
    var pools: [3]Pool = @splat(.{});
    const ka = net_pool.poolKey("a", &.{1});
    const kb = net_pool.poolKey("b", &.{1});
    const kc = net_pool.poolKey("c", &.{1});
    const kd = net_pool.poolKey("d", &.{1});
    const ia = net_pool.poolFor(&pools, ka, 100).?;
    pools[ia].refs = 1;
    const ib = net_pool.poolFor(&pools, kb, 200).?;
    pools[ib].refs = 1;
    const ic = net_pool.poolFor(&pools, kc, 300).?;
    try t.expect(ia != ib);
    pools[ic].sticky = true;
    // a and b stay busy; c is sticky but idle.
    pools[ic].conns = 0;
    pools[ic].refs = 0;
    const id4 = net_pool.poolFor(&pools, kd, 400).?;
    try t.expectEqual(ic, id4);
}

test "proto: TimerWheel fires once and leaves no orphan" {
    var links: [2]Link = @splat(.{});
    var w: TimerWheel = .{ .links = &links };
    w.init(&links);
    var fired: u32 = 0;
    const Ctx = struct {
        fired: *u32,
        pub fn fire(ctx: @This(), id: u32) void {
            // The id is not needed here; only the count matters.
            _ = id;
            ctx.fired.* += 1;
        }
    };
    w.schedule(0, 250, 0);
    w.advanceTo(100, Ctx{ .fired = &fired });
    try t.expectEqual(@as(u32, 0), fired);
    w.advanceTo(200, Ctx{ .fired = &fired });
    try t.expectEqual(@as(u32, 1), fired);
    try t.expectEqual(no_slot, links[0].slot);
}

// ---- protocol session simulator -------------------------------------------

const max_pools = 4;
const max_reqs = 8;
const timer_base = max_reqs; // timer ids for pool idle timeouts
const max_timers = max_reqs + max_pools;
const max_frame = 12; // 4-byte header + up to 8-byte payload
const max_jobs = 24; // requests per run
const key_count = 5; // one more key than pools, so LRU eviction happens
const idle_ms: i64 = 400;
const max_retries = 2;
const max_ticks: u32 = 60_000;
const poller_batch = 4;

const ReqPhase = enum { idle, connecting, writing, reading };

const Job = struct {
    id: u32,
    key: u8,
    len: u8,
    deadline_off: i64,
};

const ReqSlot = struct {
    phase: ReqPhase = .idle,
    id: u32 = 0,
    pool: u32 = 0,
    h: ConnHandle = .none,
    frame: [max_frame]u8 = @splat(0),
    flen: usize = 0,
    wpos: usize = 0,
    rbuf: [max_frame]u8 = @splat(0),
    rlen: usize = 0,
    want: usize = 4,
    parsed: bool = false,
    retries: u32 = 0,
    deadline: i64 = 0,
    waiting: bool = false,
};

const SvcSlot = struct {
    rbuf: [max_frame]u8 = @splat(0),
    rlen: usize = 0,
    want: usize = 4,
    parsed: bool = false,
    wbuf: [max_frame]u8 = @splat(0),
    wlen: usize = 0,
    wpos: usize = 0,
};

const Session = struct {
    rng: std.Random.DefaultPrng,
    now_ms: i64 = 0,
    pools: [max_pools]Pool = @splat(.{}),
    pipes: [max_pools]SeededPipe = undefined,
    svc: [max_pools]SvcSlot = @splat(.{}),
    gen: [max_pools]u16 = @splat(0),
    keys: [key_count][32]u8 = undefined,
    jobs: [max_jobs]Job = undefined,
    next_job: usize = 0,
    reqs: [max_reqs]ReqSlot = @splat(.{}),
    free_buf: [max_reqs]u32 = @splat(0),
    free: net_pool.FreeStack(u32) = .{ .items = &.{} },
    done_buf: [max_jobs]u32 = @splat(0),
    done: net_pool.DoneRing(u32) = .{ .items = &.{} },
    links: [max_timers]Link = @splat(.{}),
    wheel: TimerWheel = .{},
    poller: SimPoller = .{},
    issued: u32 = 0,
    completed: u32 = 0,
    timed_out: u32 = 0,
    reset_dropped: u32 = 0,
    corrupt: u32 = 0,
    ticks: u32 = 0,

    fn init(seed: u64) Session {
        var s = Session{ .rng = std.Random.DefaultPrng.init(seed) };
        s.free.items = &s.free_buf;
        s.done.items = &s.done_buf;
        s.wheel.init(&s.links);
        var k: usize = 0;
        while (k < key_count) : (k += 1) {
            const cred = [_]u8{ 'd', 'b', @intCast(k) };
            s.keys[k] = net_pool.poolKey(&cred, &.{3});
        }
        const rnd = s.rng.random();
        const profile = FaultProfile{
            .frag = rnd.uintLessThan(usize, 6) + 1,
            .eagain_per_mille = rnd.uintLessThan(u32, 400),
            .reset_per_mille = rnd.uintLessThan(u32, 80),
        };
        var i: usize = 0;
        while (i < max_pools) : (i += 1) {
            s.pipes[i] = SeededPipe.init(seed ^ (0x5EED0000 +% @as(u64, @intCast(i))));
            s.pipes[i].profile = profile;
        }
        var j: usize = 0;
        while (j < max_jobs) : (j += 1) {
            s.jobs[j] = .{
                .id = @intCast(j),
                .key = rnd.uintLessThan(u8, key_count),
                .len = rnd.uintLessThan(u8, 8) + 1,
                .deadline_off = 100 + @as(i64, rnd.uintLessThan(u32, 1900)),
            };
        }
        // Pool 0 is sticky: its flag survives while idle until LRU eviction.
        s.pools[0].sticky = true;
        s.free.initAll();
        return s;
    }

    fn isDone(s: *const Session) bool {
        const accounted = s.completed + s.timed_out + s.reset_dropped;
        return s.next_job == max_jobs and s.free.len == max_reqs and accounted == max_jobs;
    }

    fn tick(s: *Session) void {
        s.ticks += 1;
        s.now_ms += @as(i64, @intCast(s.rng.random().uintLessThan(u64, 20))) + 1;
        s.drainPoller();
        s.fireTimers();
        s.admit();
        s.serve();
        s.stepClients();
    }

    fn fireTimers(s: *Session) void {
        s.wheel.advanceTo(s.now_ms, TimerCtx{ .s = s });
    }

    fn fireDeadline(s: *Session, slot: u32) void {
        const r = &s.reqs[slot];
        if (r.phase == .idle) return;
        s.timed_out += 1;
        // A dropped mid-flight request leaves a half frame on the wire:
        // close the connection so the next request starts on a fresh one.
        if (r.phase == .writing or r.phase == .reading) {
            const pi = r.pool;
            s.detach(slot);
            if (s.pools[pi].conns > 0) s.resetConnection(pi);
        }
        r.phase = .idle;
        r.waiting = false;
        s.free.push(slot);
    }

    fn fireIdle(s: *Session, pi: u32) void {
        const p = &s.pools[pi];
        if (p.refs > 0 or p.conns == 0) return;
        p.conns = 0;
        s.pipes[pi].reset();
        s.svc[pi] = .{};
    }

    fn admit(s: *Session) void {
        while (s.next_job < max_jobs) {
            const slot = s.free.pop() orelse return;
            s.admitOne(slot, s.next_job);
            s.next_job += 1;
        }
    }

    fn admitOne(s: *Session, slot: u32, job_idx: usize) void {
        const job = s.jobs[job_idx];
        const r = &s.reqs[slot];
        r.* = .{};
        r.phase = .connecting;
        r.id = job.id;
        r.frame[0] = 0xA5;
        r.frame[1] = job.len;
        r.frame[2] = @truncate(job.id);
        r.frame[3] = @truncate(job.id >> 8);
        var i: usize = 0;
        while (i < job.len) : (i += 1) {
            r.frame[4 + i] = @truncate(job.id *% 31 +% @as(u32, @intCast(i)));
        }
        r.flen = 4 + job.len;
        r.want = 4;
        r.deadline = s.now_ms + job.deadline_off;
        s.wheel.schedule(slot, r.deadline, s.now_ms);
        s.issued += 1;
    }

    fn serve(s: *Session) void {
        var pi: u32 = 0;
        while (pi < max_pools) : (pi += 1) {
            if (s.pools[pi].conns == 0) continue;
            s.serveStep(pi);
        }
    }

    fn serveStep(s: *Session, pi: u32) void {
        const svc = &s.svc[pi];
        if (svc.wlen > 0) {
            s.serveWrite(pi, svc);
            return;
        }
        s.serveRead(pi, svc);
    }

    fn serveRead(s: *Session, pi: u32, svc: *SvcSlot) void {
        const step = s.pipes[pi].read(.ab, svc.rbuf[svc.rlen..svc.want]);
        switch (step) {
            .n => |n| {
                svc.rlen += n;
                if (!svc.parsed and svc.rlen == 4) {
                    svc.want = 4 + svc.rbuf[1];
                    svc.parsed = true;
                }
                if (svc.parsed and svc.rlen == svc.want) buildResponse(svc);
            },
            .again => {},
            .closed => s.resetConnection(pi),
            .want_write => unreachable, // no TLS in the sim
        }
    }

    fn serveWrite(s: *Session, pi: u32, svc: *SvcSlot) void {
        const step = s.pipes[pi].write(.ba, svc.wbuf[svc.wpos..svc.wlen]);
        switch (step) {
            .n => |n| {
                svc.wpos += n;
                if (svc.wpos == svc.wlen) {
                    svc.wlen = 0;
                    svc.wpos = 0;
                }
            },
            .again => {},
            .closed => s.resetConnection(pi),
            .want_write => unreachable, // no TLS in the sim
        }
    }

    fn resetConnection(s: *Session, pi: u32) void {
        s.wheel.cancel(timer_base + pi);
        s.pools[pi].conns = 0;
        s.gen[pi] = ConnHandle.nextGen(s.gen[pi]);
        s.pipes[pi].reset();
        s.svc[pi] = .{};
    }

    fn stepClients(s: *Session) void {
        var slot: u32 = 0;
        while (slot < max_reqs) : (slot += 1) {
            const r = &s.reqs[slot];
            if (r.phase == .idle or r.waiting) continue;
            s.stepClient(slot);
        }
    }

    fn stepClient(s: *Session, slot: u32) void {
        const r = &s.reqs[slot];
        if (r.phase == .writing or r.phase == .reading) {
            if (!r.h.matches(@intCast(r.pool), s.gen[r.pool])) {
                s.onReset(slot);
                return;
            }
        }
        switch (r.phase) {
            .connecting => s.connectStep(slot),
            .writing => s.writeStep(slot),
            .reading => s.readStep(slot),
            .idle => {},
        }
    }

    fn connectStep(s: *Session, slot: u32) void {
        const r = &s.reqs[slot];
        const key = s.keys[s.jobs[r.id].key];
        const pi = net_pool.poolFor(&s.pools, key, s.now_ms) orelse return;
        if (s.pools[pi].refs > 0) return; // the pool is busy; wait
        r.pool = pi;
        r.h = ConnHandle.of(@intCast(pi), s.gen[pi]);
        s.pools[pi].refs += 1;
        if (s.pools[pi].conns == 0) {
            s.pools[pi].conns = 1;
            s.pipes[pi].reset();
            s.svc[pi] = .{};
        }
        s.wheel.cancel(timer_base + pi);
        r.phase = .writing;
    }

    fn writeStep(s: *Session, slot: u32) void {
        const r = &s.reqs[slot];
        const step = s.pipes[r.pool].write(.ab, r.frame[r.wpos..r.flen]);
        switch (step) {
            .n => |n| {
                r.wpos += n;
                if (r.wpos == r.flen) r.phase = .reading;
            },
            .again => s.stall(slot, false),
            .closed => s.clientReset(slot),
            .want_write => unreachable, // no TLS in the sim
        }
    }

    fn readStep(s: *Session, slot: u32) void {
        const r = &s.reqs[slot];
        const step = s.pipes[r.pool].read(.ba, r.rbuf[r.rlen..r.want]);
        switch (step) {
            .n => |n| {
                r.rlen += n;
                if (!r.parsed and r.rlen == 4) {
                    r.want = 4 + r.rbuf[1];
                    r.parsed = true;
                }
                if (r.parsed and r.rlen == r.want) s.verifyResponse(slot);
            },
            .again => s.stall(slot, true),
            .closed => s.clientReset(slot),
            .want_write => unreachable, // no TLS in the sim
        }
    }

    fn stall(s: *Session, slot: u32, readable: bool) void {
        s.reqs[slot].waiting = true;
        const tok = @as(u64, slot) | (@as(u64, s.reqs[slot].id) << 32);
        // At most one token per request, so the 64-slot queue never fills.
        _ = s.poller.push(.{ .token = tok, .readable = readable, .writable = !readable, .eof = false });
    }

    fn drainPoller(s: *Session) void {
        var out: [poller_batch]sys.Ready = undefined;
        const n = s.poller.wait(&out);
        for (out[0..n]) |r| {
            const slot: u32 = @intCast(r.token & 0xFFFFFFFF);
            const rid: u32 = @intCast(r.token >> 32);
            if (s.reqs[slot].id == rid) s.reqs[slot].waiting = false;
        }
    }

    fn clientReset(s: *Session, slot: u32) void {
        const pi = s.reqs[slot].pool;
        s.resetConnection(pi);
        s.onReset(slot);
    }

    fn onReset(s: *Session, slot: u32) void {
        const r = &s.reqs[slot];
        r.retries += 1;
        if (r.retries > max_retries) {
            s.reset_dropped += 1;
            s.wheel.cancel(slot);
            s.detach(slot);
            r.phase = .idle;
            r.waiting = false;
            s.free.push(slot);
            return;
        }
        s.detach(slot);
        r.phase = .connecting;
        r.wpos = 0;
        r.rlen = 0;
        r.want = 4;
        r.parsed = false;
        r.waiting = false;
    }

    fn detach(s: *Session, slot: u32) void {
        const pi = s.reqs[slot].pool;
        s.pools[pi].refs -= 1;
        s.reqs[slot].pool = 0;
        s.reqs[slot].h = .none;
        if (s.pools[pi].refs == 0 and s.pools[pi].conns > 0) {
            s.wheel.schedule(timer_base + pi, s.now_ms + idle_ms, s.now_ms);
        }
    }

    fn verifyResponse(s: *Session, slot: u32) void {
        if (!responseOk(&s.reqs[slot])) s.corrupt += 1;
        s.finish(slot);
    }

    fn finish(s: *Session, slot: u32) void {
        const r = &s.reqs[slot];
        s.done.push(r.id);
        s.completed += 1;
        s.wheel.cancel(slot);
        s.detach(slot);
        r.phase = .idle;
        r.waiting = false;
        s.free.push(slot);
    }

    fn closeAll(s: *Session) void {
        var pi: u32 = 0;
        while (pi < max_pools) : (pi += 1) {
            s.wheel.cancel(timer_base + pi);
            s.pools[pi].conns = 0;
            s.pipes[pi].reset();
        }
    }
};

const TimerCtx = struct {
    s: *Session,
    pub fn fire(ctx: TimerCtx, id: u32) void {
        if (id < timer_base) {
            ctx.s.fireDeadline(id);
        } else {
            ctx.s.fireIdle(id - timer_base);
        }
    }
};

fn buildResponse(svc: *SvcSlot) void {
    const len = svc.rbuf[1];
    svc.wbuf[0] = 0x5A;
    svc.wbuf[1] = len;
    svc.wbuf[2] = svc.rbuf[2];
    svc.wbuf[3] = svc.rbuf[3];
    var i: usize = 0;
    while (i < len) : (i += 1) {
        svc.wbuf[4 + i] = svc.rbuf[4 + i] +% 1;
    }
    svc.wlen = 4 + len;
    svc.wpos = 0;
    svc.rlen = 0;
    svc.want = 4;
    svc.parsed = false;
}

fn responseOk(r: *const ReqSlot) bool {
    if (r.rbuf[0] != 0x5A) return false;
    if (r.rbuf[1] != r.frame[1]) return false;
    if (r.rbuf[2] != r.frame[2] or r.rbuf[3] != r.frame[3]) return false;
    var i: usize = 0;
    while (i < r.rbuf[1]) : (i += 1) {
        if (r.rbuf[4 + i] != r.frame[4 + i] +% 1) return false;
    }
    return true;
}

test "proto: session simulator across 200 seeds conserves requests" {
    var seed: u64 = 0;
    while (seed < 200) : (seed += 1) {
        var s = Session.init(seed);
        var guard: u32 = 0;
        while (!s.isDone() and guard < max_ticks) : (guard += 1) s.tick();
        try t.expect(s.isDone());
        s.closeAll();
        // Completion order comes out of the ring; no id is out of range.
        var seen: u32 = 0;
        while (s.done.pop()) |id| {
            try t.expect(id < max_jobs);
            seen += 1;
        }
        try t.expectEqual(s.completed, seen);
        try t.expectEqual(@as(u32, 0), s.corrupt);
        try t.expectEqual(@as(u32, max_jobs), s.issued);
        try t.expectEqual(s.issued, s.completed + s.timed_out + s.reset_dropped);
        try t.expectEqual(@as(u32, max_reqs), s.free.len);
        // No orphaned timers and no leaked pool state.
        var i: usize = 0;
        while (i < max_timers) : (i += 1) {
            try t.expectEqual(no_slot, s.links[i].slot);
        }
        var pi: u32 = 0;
        while (pi < max_pools) : (pi += 1) {
            try t.expectEqual(@as(u32, 0), s.pools[pi].refs);
            try t.expectEqual(@as(u32, 0), s.pools[pi].conns);
        }
    }
}
