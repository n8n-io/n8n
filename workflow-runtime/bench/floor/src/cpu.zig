//! CPU clocks for the floor benchmarks. Every result is CPU time of one
//! thread (or one process), not a wall-clock rate: macOS cannot pin a
//! thread to a core, and the machine is shared.
const std = @import("std");
const builtin = @import("builtin");
const c = std.c;

pub const is_linux = builtin.os.tag == .linux;

fn tsNs(ts: c.timespec) u64 {
    return @as(u64, @intCast(ts.sec)) * 1_000_000_000 + @as(u64, @intCast(ts.nsec));
}

/// CPU time of the calling thread, in ns.
pub fn threadNs() u64 {
    var ts: c.timespec = undefined;
    _ = c.clock_gettime(c.CLOCK.THREAD_CPUTIME_ID, &ts);
    return tsNs(ts);
}

/// CPU time of the whole process (all threads), in ns.
pub fn processNs() u64 {
    var ts: c.timespec = undefined;
    _ = c.clock_gettime(c.CLOCK.PROCESS_CPUTIME_ID, &ts);
    return tsNs(ts);
}

pub fn monoNs() u64 {
    var ts: c.timespec = undefined;
    _ = c.clock_gettime(c.CLOCK.MONOTONIC, &ts);
    return tsNs(ts);
}

extern "c" fn pthread_set_qos_class_self_np(qos: c_uint, rel: c_int) c_int;

/// Ask macOS for a performance core (QoS user-interactive). A no-op on
/// Linux, where `taskset` pins the process instead.
pub fn preferFastCore() void {
    if (builtin.os.tag == .macos) _ = pthread_set_qos_class_self_np(0x21, 0);
}

/// Linux: pin the calling thread to the CPUs listed in environment
/// variable `name` (for example FLOOR_SERVER_CPUS=7). Unset: no change.
pub fn pinFromEnv(name: [*:0]const u8) void {
    if (!is_linux) return;
    const v = std.mem.span(c.getenv(name) orelse return);
    var set: std.os.linux.cpu_set_t = @splat(0);
    var it = std.mem.splitScalar(u8, v, ',');
    while (it.next()) |part| {
        const n = std.fmt.parseInt(usize, std.mem.trim(u8, part, " "), 10) catch continue;
        set[n / @bitSizeOf(usize)] |= @as(usize, 1) << @intCast(n % @bitSizeOf(usize));
    }
    std.os.linux.sched_setaffinity(0, &set) catch {};
}

pub fn sleepNs(ns: u64) void {
    var ts: c.timespec = .{ .sec = @intCast(ns / 1_000_000_000), .nsec = @intCast(ns % 1_000_000_000) };
    _ = c.nanosleep(&ts, null);
}

/// Clock frequency of the core that runs this thread, in GHz: a chain of
/// dependent integer adds retires one add per cycle on both Apple and x86
/// cores. 32 adds per loop iteration; the loop counter runs in parallel.
pub fn measureGhz(iters: u64) f64 {
    std.debug.assert(iters > 0);
    const t0 = threadNs();
    switch (builtin.cpu.arch) {
        .aarch64 => asm volatile (
            \\ mov x9, %[n]
            \\ mov x10, #0
            \\ 1:
            \\ .rept 32
            \\ add x10, x10, #1
            \\ .endr
            \\ subs x9, x9, #1
            \\ b.ne 1b
            :
            : [n] "r" (iters),
            : .{ .x9 = true, .x10 = true, .nzcv = true }),
        .x86_64 => asm volatile (
            \\ mov %[n], %%rcx
            \\ xor %%r10, %%r10
            \\ 1:
            \\ .rept 32
            \\ add $1, %%r10
            \\ .endr
            \\ dec %%rcx
            \\ jnz 1b
            :
            : [n] "r" (iters),
            : .{ .rcx = true, .r10 = true, .cc = true }),
        else => return 0,
    }
    const ns = threadNs() - t0;
    return @as(f64, @floatFromInt(iters * 32)) / @as(f64, @floatFromInt(ns));
}

/// Median of a small sample (sorts in place).
pub fn median(xs: []f64) f64 {
    std.debug.assert(xs.len > 0);
    std.mem.sort(f64, xs, {}, std.sort.asc(f64));
    return xs[xs.len / 2];
}
