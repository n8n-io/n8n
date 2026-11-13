//! Floors that need no network stack: system-call costs, the host IPC
//! round trip over a Unix socket, the log append at each durability tier,
//! and the timer heap.
const std = @import("std");
const builtin = @import("builtin");
const c = std.c;
const cpu = @import("cpu.zig");
const poll = @import("poll.zig");

// ---- system calls -------------------------------------------------------------

pub const Syscalls = struct { getppid_ns: f64, poll_empty_ns: f64, pipe_rw_64_ns: f64, clock_ns: f64 };

/// The cheapest system calls, in CPU ns per call (one thread).
pub fn syscalls(iters: u32) !Syscalls {
    std.debug.assert(iters > 0);
    var r: Syscalls = undefined;
    const n: f64 = @floatFromInt(iters);
    var t = cpu.threadNs();
    for (0..iters) |_| std.mem.doNotOptimizeAway(c.getppid());
    r.getppid_ns = @as(f64, @floatFromInt(cpu.threadNs() - t)) / n;

    var p = try poll.Poller.init();
    var toks: [16]u32 = undefined;
    t = cpu.threadNs();
    for (0..iters) |_| std.mem.doNotOptimizeAway(p.wait(&toks, 0));
    r.poll_empty_ns = @as(f64, @floatFromInt(cpu.threadNs() - t)) / n;

    var sv: [2]c_int = undefined;
    if (c.socketpair(c.AF.UNIX, c.SOCK.STREAM, 0, &sv) != 0) return error.SocketPair;
    var buf: [64]u8 = @splat('x');
    t = cpu.threadNs();
    for (0..iters) |_| {
        _ = c.write(sv[0], &buf, buf.len);
        _ = c.read(sv[1], &buf, buf.len);
    }
    r.pipe_rw_64_ns = @as(f64, @floatFromInt(cpu.threadNs() - t)) / n / 2;
    _ = c.close(sv[0]);
    _ = c.close(sv[1]);

    t = cpu.threadNs();
    var acc: u64 = 0;
    for (0..iters) |_| acc +%= cpu.monoNs();
    std.mem.doNotOptimizeAway(acc);
    r.clock_ns = @as(f64, @floatFromInt(cpu.threadNs() - t)) / n;
    return r;
}

// ---- host IPC round trip --------------------------------------------------------

pub const IpcResult = struct { a_ns_per_step: f64, b_ns_per_step: f64, wall_ns_per_round: f64, steps: u64 };

var ipc_phase = std.atomic.Value(u32).init(0);

fn ipcHost(fd: c_int, frame: usize, out: *u64) void {
    cpu.preferFastCore();
    cpu.pinFromEnv("FLOOR_CLIENT_CPUS");
    var p = poll.Poller.init() catch return;
    p.addRead(fd, 0) catch return;
    var buf: [1 << 20]u8 = undefined;
    var toks: [4]u32 = undefined;
    var pending: usize = 0;
    const t0 = cpu.threadNs();
    while (ipc_phase.load(.acquire) == 0) {
        if (p.wait(&toks, 10) == 0) continue;
        switch (poll.readSome(fd, buf[pending..])) {
            .n => |k| pending += k,
            .again => continue,
            .closed => break,
        }
        // Answer every whole frame in one write, as a host worker would.
        const whole = pending / frame * frame;
        if (whole == 0) continue;
        _ = poll.writeAll(fd, buf[0..whole]);
        std.mem.copyForwards(u8, buf[0 .. pending - whole], buf[whole..pending]);
        pending -= whole;
    }
    out.* = cpu.threadNs() - t0;
}

/// wfrt side: write `batch` frames of `frame` bytes in one write, wait,
/// read the replies; repeat `rounds` times. The host side echoes.
pub fn ipc(frame: usize, batch: usize, rounds: u32) !IpcResult {
    std.debug.assert(frame > 0 and batch > 0 and frame * batch <= 1 << 19);
    ipc_phase.store(0, .release);
    var sv: [2]c_int = undefined;
    if (c.socketpair(c.AF.UNIX, c.SOCK.STREAM, 0, &sv) != 0) return error.SocketPair;
    // Room for a whole batch each way, so neither side blocks mid-write.
    for (sv) |fd| {
        const sz: c_int = 1 << 20;
        _ = c.setsockopt(fd, c.SOL.SOCKET, c.SO.SNDBUF, &sz, @sizeOf(c_int));
        _ = c.setsockopt(fd, c.SOL.SOCKET, c.SO.RCVBUF, &sz, @sizeOf(c_int));
        poll.setNonBlocking(fd);
    }
    var host_ns: u64 = 0;
    const th = try std.Thread.spawn(.{}, ipcHost, .{ sv[1], frame, &host_ns });
    cpu.preferFastCore();
    cpu.pinFromEnv("FLOOR_SERVER_CPUS");
    var p = try poll.Poller.init();
    try p.addRead(sv[0], 0);
    var out: [1 << 19]u8 = @splat('f');
    var in: [1 << 19]u8 = undefined;
    var toks: [4]u32 = undefined;
    const want = frame * batch;
    const t0 = cpu.threadNs();
    const w0 = cpu.monoNs();
    for (0..rounds) |_| {
        _ = poll.writeAll(sv[0], out[0..want]);
        var got: usize = 0;
        while (got < want) {
            if (p.wait(&toks, 100) == 0) continue;
            switch (poll.readSome(sv[0], in[got..want])) {
                .n => |k| got += k,
                .again => {},
                .closed => return error.Closed,
            }
        }
    }
    const a_ns = cpu.threadNs() - t0;
    const wall = cpu.monoNs() - w0;
    ipc_phase.store(1, .release);
    th.join();
    _ = c.close(sv[0]);
    _ = c.close(sv[1]);
    const steps: f64 = @floatFromInt(@as(u64, rounds) * batch);
    return .{
        .a_ns_per_step = @as(f64, @floatFromInt(a_ns)) / steps,
        .b_ns_per_step = @as(f64, @floatFromInt(host_ns)) / steps,
        .wall_ns_per_round = @as(f64, @floatFromInt(wall)) / @as(f64, @floatFromInt(rounds)),
        .steps = @as(u64, rounds) * batch,
    };
}

// ---- log append ---------------------------------------------------------------

pub const Tier = enum { none, batched, sync, fullsync };
pub const LogResult = struct { cpu_ns_per_exec: f64, wall_ns_per_batch: f64, bytes_per_exec: usize };

extern "c" fn fsync(fd: c_int) c_int;

/// Append `batch` records of `rec` bytes per batch, once per batch, for
/// `batches` batches. `none` writes the 32-byte id reservations only (as
/// wfrt's `none` tier does). `sync` adds fsync per batch; `fullsync` adds
/// F_FULLFSYNC on macOS (a flush of the drive cache).
pub fn logAppend(path: [*:0]const u8, tier: Tier, rec: usize, batch: usize, batches: u32) !LogResult {
    std.debug.assert(batch > 0 and rec > 0);
    const fd = c.open(path, .{ .ACCMODE = .WRONLY, .CREAT = true, .TRUNC = true, .APPEND = true }, @as(c.mode_t, 0o600));
    if (fd < 0) return error.Open;
    defer _ = c.close(fd);
    const per = if (tier == .none) 32 else rec;
    const buf = try std.heap.page_allocator.alloc(u8, per * batch);
    defer std.heap.page_allocator.free(buf);
    var src: [64 << 10]u8 = @splat('r');
    const t0 = cpu.threadNs();
    const w0 = cpu.monoNs();
    for (0..batches) |_| {
        // Frame each record: a length header, then the body (as wfrt's log).
        var off: usize = 0;
        for (0..batch) |_| {
            std.mem.writeInt(u32, buf[off..][0..4], @intCast(per), .little);
            @memcpy(buf[off + 4 ..][0 .. per - 4], src[0 .. per - 4]);
            off += per;
        }
        _ = poll.writeAll(fd, buf[0..off]);
        switch (tier) {
            .none, .batched => {},
            .sync => _ = fsync(fd),
            .fullsync => if (builtin.os.tag == .macos) {
                _ = c.fcntl(fd, 51, @as(c_int, 0)); // F_FULLFSYNC
            } else {
                _ = fsync(fd);
            },
        }
    }
    const execs: f64 = @floatFromInt(@as(u64, batches) * batch);
    return .{
        .cpu_ns_per_exec = @as(f64, @floatFromInt(cpu.threadNs() - t0)) / execs,
        .wall_ns_per_batch = @as(f64, @floatFromInt(cpu.monoNs() - w0)) / @as(f64, @floatFromInt(batches)),
        .bytes_per_exec = per,
    };
}

// ---- timer heap ---------------------------------------------------------------

/// CPU ns of one insert plus one pop-min in a binary heap of `n` timers.
pub fn timerHeap(gpa: std.mem.Allocator, n: usize, ops: u32) !f64 {
    const Q = std.PriorityQueue(u64, void, struct {
        fn lt(_: void, a: u64, b: u64) std.math.Order {
            return std.math.order(a, b);
        }
    }.lt);
    var q: Q = .empty;
    defer q.deinit(gpa);
    try q.ensureTotalCapacity(gpa, n + 1);
    var rng = std.Random.DefaultPrng.init(42);
    const r = rng.random();
    for (0..n) |_| try q.push(gpa, r.int(u32));
    var now: u64 = 0;
    const t0 = cpu.threadNs();
    for (0..ops) |_| {
        now += 1;
        try q.push(gpa, now + r.intRangeAtMost(u64, 0, 1 << 32));
        std.mem.doNotOptimizeAway(q.pop());
    }
    return @as(f64, @floatFromInt(cpu.threadNs() - t0)) / @as(f64, @floatFromInt(ops));
}
