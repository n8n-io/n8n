//! `floor <command>`: micro-benchmarks of the irreducible CPU cost of each
//! piece of work a workflow does on one core. See docs/floor.md. Each line of output is one measurement, as
//! `key=value` pairs, so scripts can collect repeats.
const std = @import("std");
const cpu = @import("cpu.zig");
const net = @import("net.zig");
const misc = @import("misc.zig");
const tls = @import("tls.zig");
const corebench = @import("corebench.zig");
const native = @import("native.zig");
const poll = @import("poll.zig");

const usage =
    \\usage: floor <command> [options]
    \\  freq                                   clock of the current core (GHz)
    \\  syscalls                               cheapest system calls, ns each
    \\  net --mode raw|http|tls --conns N [--req B] [--resp B] [--secs S]
    \\      [--clients T] [--idle N] [--cert F --key F] [--release-buffers]
    \\  ipc --frame B --batch K [--rounds R]   Unix socket round trip
    \\  log --path F --tier none|batched|sync|fullsync --rec B --batch K [--batches N]
    \\  timers --n N                           timer heap insert + pop
    \\  churn [--n N]                          new TCP connection and close
    \\  core <name> [--secs S] [--batch K]     wfrt core: see corebench.zig
    \\  native [--secs S]                      hand-written Zig node work
    \\
;

fn arg(args: []const []const u8, name: []const u8) ?[]const u8 {
    for (args, 0..) |a, i| if (std.mem.eql(u8, a, name) and i + 1 < args.len) return args[i + 1];
    return null;
}

fn flag(args: []const []const u8, name: []const u8) bool {
    for (args) |a| if (std.mem.eql(u8, a, name)) return true;
    return false;
}

fn num(comptime T: type, args: []const []const u8, name: []const u8, default: T) T {
    const s = arg(args, name) orelse return default;
    return std.fmt.parseInt(T, s, 10) catch default;
}

pub fn main(init: std.process.Init) !void {
    const gpa = std.heap.page_allocator;
    const io = init.io;
    var arena_state = std.heap.ArenaAllocator.init(gpa);
    defer arena_state.deinit();
    const a = arena_state.allocator();
    const args = try init.minimal.args.toSlice(a);
    var out_buf: [16 * 1024]u8 = undefined;
    var stdout_w: std.Io.File.Writer = .initStreaming(.stdout(), io, &out_buf);
    const out = &stdout_w.interface;
    defer out.flush() catch {};
    if (args.len < 2) return out.writeAll(usage);
    const cmd = args[1];
    const rest = args[2..];
    cpu.preferFastCore();

    if (std.mem.eql(u8, cmd, "freq")) {
        const ghz = cpu.measureGhz(100_000_000);
        return out.print("freq ghz={d:.3}\n", .{ghz});
    }
    if (std.mem.eql(u8, cmd, "syscalls")) {
        const r = try misc.syscalls(num(u32, rest, "--iters", 2_000_000));
        return out.print("syscalls getppid_ns={d:.1} poll_empty_ns={d:.1} unix_rw64_ns_per_call={d:.1} clock_gettime_ns={d:.1}\n", .{ r.getppid_ns, r.poll_empty_ns, r.pipe_rw_64_ns, r.clock_ns });
    }
    if (std.mem.eql(u8, cmd, "net")) {
        const mode = std.meta.stringToEnum(net.Mode, arg(rest, "--mode") orelse "raw") orelse return error.BadMode;
        if (mode == .tls) tls.countAllocations();
        tls.read_ahead = !flag(rest, "--no-read-ahead");
        const fdmax = poll.raiseFdLimit();
        const opts: net.Opts = .{
            .mode = mode,
            .conns = num(u32, rest, "--conns", 64),
            .client_threads = num(u32, rest, "--clients", 2),
            .req_body = num(u32, rest, "--req", 1024),
            .resp_body = num(u32, rest, "--resp", 64),
            .secs = num(u32, rest, "--secs", 3),
            .idle = num(u32, rest, "--idle", 0),
            .cert = if (arg(rest, "--cert")) |s| try a.dupeSentinel(u8, s, 0) else "",
            .key = if (arg(rest, "--key")) |s| try a.dupeSentinel(u8, s, 0) else "",
            .release_buffers = flag(rest, "--release-buffers"),
            .pipeline = num(u32, rest, "--pipeline", 1),
        };
        if (flag(rest, "--inline")) {
            const r = try net.runInline(gpa, opts);
            return out.print("net-inline conns={d} req={d} resp={d} reqs={d} client_write_ns={d:.0} server_read_ns={d:.0} server_write_ns={d:.0} client_read_ns={d:.0} server_side_ns={d:.0} client_side_ns={d:.0} read_retries={d}\n", .{ opts.conns, opts.req_body, opts.resp_body, r.reqs, r.client_write_ns, r.server_read_ns, r.server_write_ns, r.client_read_ns, r.server_read_ns + r.server_write_ns, r.client_write_ns + r.client_read_ns, r.retries });
        }
        const r = try net.run(gpa, opts);
        const reqs: f64 = @floatFromInt(@max(r.reqs, 1));
        const creqs: f64 = @floatFromInt(@max(r.client.done, 1));
        try out.print("net mode={s} pipeline={d} conns={d} idle={d} req={d} resp={d} reqs={d} rate_wall={d:.0} server_ns={d:.0} client_ns={d:.0} server_reads={d:.2} server_writes={d:.2} server_waits={d:.3} events_per_wait={d:.1} client_reads={d:.2} client_writes={d:.2} client_waits={d:.3}", .{
            @tagName(mode),                                 opts.pipeline,                                   opts.conns,                                     opts.idle,                                                                                   opts.req_body,                                   opts.resp_body,                                   r.reqs,                                          r.rate_wall, r.server_ns_per_req, r.client_ns_per_req,
            @as(f64, @floatFromInt(r.server.reads)) / reqs, @as(f64, @floatFromInt(r.server.writes)) / reqs, @as(f64, @floatFromInt(r.server.waits)) / reqs, @as(f64, @floatFromInt(r.server.events)) / @as(f64, @floatFromInt(@max(r.server.waits, 1))), @as(f64, @floatFromInt(r.client.reads)) / creqs, @as(f64, @floatFromInt(r.client.writes)) / creqs, @as(f64, @floatFromInt(r.client.waits)) / creqs,
        });
        try out.print(" server_read_ns={d:.0} server_write_ns={d:.0} server_wait_ns={d:.0} client_read_ns={d:.0} client_write_ns={d:.0} client_wait_ns={d:.0}", .{
            @as(f64, @floatFromInt(r.server.read_ns)) / reqs,  @as(f64, @floatFromInt(r.server.write_ns)) / reqs,  @as(f64, @floatFromInt(r.server.wait_ns)) / reqs,
            @as(f64, @floatFromInt(r.client.read_ns)) / creqs, @as(f64, @floatFromInt(r.client.write_ns)) / creqs, @as(f64, @floatFromInt(r.client.wait_ns)) / creqs,
        });
        if (mode == .tls) try out.print(" hs_client_us={d:.1} hs_server_us={d:.1} tls_client_bytes={d:.0} tls_server_bytes={d:.0} release_buffers={}", .{ r.handshake_client_us, r.handshake_server_us, r.tls_client_bytes, r.tls_server_bytes, opts.release_buffers });
        return out.print(" fd_limit={d}\n", .{fdmax});
    }
    if (std.mem.eql(u8, cmd, "ipc")) {
        const r = try misc.ipc(num(usize, rest, "--frame", 1024), num(usize, rest, "--batch", 1), num(u32, rest, "--rounds", 200_000));
        return out.print("ipc frame={d} batch={d} steps={d} wfrt_ns_per_step={d:.0} host_ns_per_step={d:.0} wall_ns_per_round={d:.0}\n", .{ num(usize, rest, "--frame", 1024), num(usize, rest, "--batch", 1), r.steps, r.a_ns_per_step, r.b_ns_per_step, r.wall_ns_per_round });
    }
    if (std.mem.eql(u8, cmd, "log")) {
        const path = try a.dupeSentinel(u8, arg(rest, "--path") orelse return error.NoPath, 0);
        const tier = std.meta.stringToEnum(misc.Tier, arg(rest, "--tier") orelse "batched") orelse return error.BadTier;
        const r = try misc.logAppend(path, tier, num(usize, rest, "--rec", 1072), num(usize, rest, "--batch", 64), num(u32, rest, "--batches", 2000));
        return out.print("log tier={s} rec={d} batch={d} cpu_ns_per_exec={d:.0} wall_us_per_batch={d:.1}\n", .{ @tagName(tier), r.bytes_per_exec, num(usize, rest, "--batch", 64), r.cpu_ns_per_exec, r.wall_ns_per_batch / 1000 });
    }
    if (std.mem.eql(u8, cmd, "timers")) {
        const n = num(usize, rest, "--n", 10_000);
        const ns = try misc.timerHeap(gpa, n, num(u32, rest, "--ops", 2_000_000));
        return out.print("timers n={d} ns_per_insert_and_pop={d:.1}\n", .{ n, ns });
    }
    if (std.mem.eql(u8, cmd, "churn")) {
        // A new loopback TCP connection and its close, both ends on this
        // thread: connect, accept, close, close.
        const n = num(u32, rest, "--n", 2000);
        const l = try poll.listenLoopback();
        const t = cpu.threadNs();
        for (0..n) |_| {
            const p = try poll.pair(l.fd, l.port);
            _ = std.c.close(p[0]);
            _ = std.c.close(p[1]);
        }
        return out.print("churn tcp_connect_accept_close_ns={d:.0} n={d}\n", .{ @as(f64, @floatFromInt(cpu.threadNs() - t)) / @as(f64, @floatFromInt(n)), n });
    }
    if (std.mem.eql(u8, cmd, "core")) return corebench.main(gpa, out, rest);
    if (std.mem.eql(u8, cmd, "native")) return native.main(gpa, out, rest);
    try out.writeAll(usage);
}

test {
    _ = net;
    _ = native;
}
