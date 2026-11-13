//! The platform shell: the only code that touches files, sockets, clocks
//! and threads. `wfrt <command>`.
const std = @import("std");
const core_lib = @import("core");
const fixture = @import("shell/fixture.zig");
const sim = @import("shell/sim.zig");
const server = @import("shell/server.zig");
const loadgen = @import("shell/loadgen.zig");
const bench = @import("shell/bench.zig");
const programs = @import("shell/programs.zig");
const creds = @import("shell/creds.zig");
const cronnext = @import("shell/cronnext.zig");
const growth = @import("shell/growth.zig");
const egress = @import("shell/egress.zig");
const sys = @import("shell/sys.zig");
const aotgen = @import("shell/aotgen.zig");

const usage =
    \\usage: wfrt <command> [args]
    \\  run <module.wfm> <fixture.json>   run one fixture, print the result JSON
    \\  corpus <dir>                      run every corpus/<case> and compare with expected.json
    \\  sim [--seeds N] [--first S] [--execs E] [--crash PER_MILLE]
    \\  serve --port P [--shards N] [--log-dir D] [--fallback SOCK] [--stats]
    \\        [--credentials FILE] [--egress-max-body-mb M] [--egress-big-slots K] [--insecure-tls]
    \\        [--admin-port P --admin-secret-env VAR] [--event-queue-mb M] [--test-clock]
    \\        [--profile embedded] [--max-conns N] [--max-request-mb M] [--request-big-slots K]
    \\        [--step-events-sample N] [--max-zones N] [--max-static-data N] [--static-data-kb K] [--max-service-calls N] [--service-call-kb K] [--service-timeout-ms MS] [--max-modules N] [--max-routes N] [--max-schedules N] [--module-store-mb M] [--ca-file CA.pem] [--gym-env]
    \\        [--slots N] [--target-rate R --vendor-latency-ms L [--memory-mb M]]
    \\        [--egress-max-requests N] [--egress-max-conns N] [--egress-max-origins N]
    \\        [--egress-origin-conns N] [--egress-origin-inflight N] [--egress-origin-queue N] [--egress-origin-rate R] [--egress-origin-burst B]
    \\        [--egress-connect-timeout-ms T] [--egress-read-timeout-ms T] [--egress-timeout-ms T] [--egress-retry-after-max-ms T] [--egress-stuck-ms T]
    \\        [--egress-h2 on|off] [--egress-h2-conns N] [--egress-h2-streams N] [--egress-aimd on|off] [--egress-pool shared|workflow|credential] [--io poll|uring|auto] [--ring-buffers N]
    \\        [--egress-origin "<host>[:port] conns=N inflight=N queue=N rate=R burst=B connect-ms=T read-ms=T timeout-ms=T h2=on|off|prior aimd=on|off"]...
    \\        (--module FILE.wfm --route "POST /path" [--rate R --burst B --concurrency C])...
    \\  load [--host IPv4] --port P [--conns C] [--seconds S] [--path /p] [--body BYTES] [--threads T] [--pipeline K]
    \\  stub --port P [--delay-ms D] [--tls-cert CERT.pem --tls-key KEY.pem] [--h2] [--h2-streams N]
    \\  bench-w1 [--seconds S] [--batch B] [--threads T]
    \\  bench-w5 [N]                      park N executions on an approval, then resume them
    \\  bench-counts
    \\  asm <glue|w2|w3|w4> <out.wfm> [durability]   write a hand-assembled benchmark module
    \\  cron-next <cases.json>           next slots of cron expressions (differential test)
    \\  aot-gen <out.zig> <module.wfm>... write the compiled functions of the library code in the modules
    \\  bench-node <module.wfm> <fixture.json> N   run the fixture N times in one core (CPU per execution)
    \\  aot-check <module.wfm>...        list the library functions that have no compiled form
    \\
;

pub fn main(init: std.process.Init) !void {
    const gpa = init.gpa;
    const io = init.io;
    const args = try init.minimal.args.toSlice(init.arena.allocator());
    var out_buf: [64 * 1024]u8 = undefined;
    var stdout_w: std.Io.File.Writer = .init(.stdout(), io, &out_buf);
    const out = &stdout_w.interface;
    defer out.flush() catch {};
    if (args.len < 2) {
        try out.writeAll(usage);
        return;
    }
    const cmd = args[1];
    bench.backing = std.heap.page_allocator;
    loadgen.backing = std.heap.page_allocator;
    const cwd = std.Io.Dir.cwd();
    if (std.mem.eql(u8, cmd, "run") and args.len >= 4) {
        const mod = try cwd.readFileAlloc(io, args[2], gpa, .limited(64 << 20));
        defer gpa.free(mod);
        const fx = try cwd.readFileAlloc(io, args[3], gpa, .limited(64 << 20));
        defer gpa.free(fx);
        const r = try fixture.run(gpa, mod, fx);
        defer gpa.free(r.output);
        try out.writeAll(r.output);
        try out.writeAll("\n");
        return;
    }
    if (std.mem.eql(u8, cmd, "cron-next") and args.len >= 3) {
        const input = try cwd.readFileAlloc(io, args[2], gpa, .limited(64 << 20));
        defer gpa.free(input);
        return cronnext.run(gpa, input, out);
    }
    if (std.mem.eql(u8, cmd, "corpus") and args.len >= 3) {
        const failed = try runCorpus(gpa, io, out, args[2]);
        try out.flush();
        if (failed > 0) std.process.exit(1);
        return;
    }
    if (std.mem.eql(u8, cmd, "sim")) {
        var opts: sim.Options = .{};
        var seeds: u64 = 100;
        var first: u64 = 1;
        var i: usize = 2;
        while (i + 1 < args.len) : (i += 2) {
            const v = try std.fmt.parseInt(u64, args[i + 1], 10);
            if (std.mem.eql(u8, args[i], "--seeds")) seeds = v;
            if (std.mem.eql(u8, args[i], "--first")) first = v;
            if (std.mem.eql(u8, args[i], "--execs")) opts.executions = @intCast(v);
            if (std.mem.eql(u8, args[i], "--crash")) opts.crash_per_mille = @intCast(v);
        }
        const bad = try sim.run(gpa, out, first, seeds, opts);
        try out.flush();
        if (bad > 0) std.process.exit(1);
        return;
    }
    if (std.mem.eql(u8, cmd, "serve")) return serve(gpa, io, args[2..]);
    if (std.mem.eql(u8, cmd, "load")) {
        var o: loadgen.LoadOptions = .{};
        var i: usize = 2;
        while (i + 1 < args.len) : (i += 2) {
            const k = args[i];
            const v = args[i + 1];
            if (std.mem.eql(u8, k, "--host")) o.host = sys.parseIp4(v) orelse return error.InvalidHost;
            if (std.mem.eql(u8, k, "--port")) o.port = try std.fmt.parseInt(u16, v, 10);
            if (std.mem.eql(u8, k, "--conns")) o.conns = try std.fmt.parseInt(u32, v, 10);
            if (std.mem.eql(u8, k, "--seconds")) o.seconds = try std.fmt.parseInt(u32, v, 10);
            if (std.mem.eql(u8, k, "--path")) o.path = v;
            if (std.mem.eql(u8, k, "--body")) o.body_bytes = try std.fmt.parseInt(u32, v, 10);
            if (std.mem.eql(u8, k, "--threads")) o.threads = try std.fmt.parseInt(u32, v, 10);
            if (std.mem.eql(u8, k, "--rate")) o.rate = try std.fmt.parseInt(u32, v, 10);
            if (std.mem.eql(u8, k, "--pipeline")) o.pipeline = try std.fmt.parseInt(u32, v, 10);
        }
        return loadgen.runLoad(gpa, out, o);
    }
    if (std.mem.eql(u8, cmd, "stub")) {
        var so: loadgen.StubOptions = .{};
        var i: usize = 2;
        while (i < args.len) : (i += 2) {
            if (std.mem.eql(u8, args[i], "--h2")) {
                so.h2 = true;
                i -= 1;
                continue;
            }
            if (i + 1 >= args.len) break;
            if (std.mem.eql(u8, args[i], "--h2-streams")) so.h2_streams = try std.fmt.parseInt(u32, args[i + 1], 10);
            if (std.mem.eql(u8, args[i], "--port")) so.port = try std.fmt.parseInt(u16, args[i + 1], 10);
            if (std.mem.eql(u8, args[i], "--delay-ms")) so.delay_ms = try std.fmt.parseInt(u32, args[i + 1], 10);
            if (std.mem.eql(u8, args[i], "--tls-cert")) so.tls_cert = args[i + 1];
            if (std.mem.eql(u8, args[i], "--tls-key")) so.tls_key = args[i + 1];
        }
        return loadgen.runStub(so);
    }
    if (std.mem.eql(u8, cmd, "bench-w1")) {
        var o: bench.W1Options = .{};
        var i: usize = 2;
        while (i + 1 < args.len) : (i += 2) {
            const v = try std.fmt.parseInt(u32, args[i + 1], 10);
            if (std.mem.eql(u8, args[i], "--seconds")) o.seconds = v;
            if (std.mem.eql(u8, args[i], "--batch")) o.batch = v;
            if (std.mem.eql(u8, args[i], "--threads")) o.threads = v;
        }
        return bench.runW1(gpa, out, o);
    }
    if (std.mem.eql(u8, cmd, "bench-w5")) {
        const n: u32 = if (args.len >= 3) try std.fmt.parseInt(u32, args[2], 10) else 100_000;
        return bench.runW5(gpa, out, n);
    }
    if (std.mem.eql(u8, cmd, "bench-w6")) return bench.runW6(out, 2000);
    if (std.mem.eql(u8, cmd, "bench-counts")) {
        const ok = try bench.runCounts(gpa, out);
        try out.flush();
        if (!ok) std.process.exit(1);
        return;
    }
    if (std.mem.eql(u8, cmd, "aot-gen") and args.len >= 4) return aotgen.run(gpa, io, args[2], args[3..]);
    if (std.mem.eql(u8, cmd, "aot-check") and args.len >= 3) {
        const missing = try aotgen.check(gpa, io, out, args[2..]);
        try out.flush();
        if (missing > 0) std.process.exit(1);
        return;
    }
    if (std.mem.eql(u8, cmd, "bench-node") and args.len >= 5) {
        const mod = try cwd.readFileAlloc(io, args[2], gpa, .limited(64 << 20));
        defer gpa.free(mod);
        const fx = try cwd.readFileAlloc(io, args[3], gpa, .limited(64 << 20));
        defer gpa.free(fx);
        const n = try std.fmt.parseInt(u32, args[4], 10);
        const ok = try fixture.bench(gpa, mod, fx, n);
        try out.print("{d} of {d} ok\n", .{ ok, n });
        return;
    }
    if (std.mem.eql(u8, cmd, "asm") and args.len >= 4) {
        const dur = if (args.len >= 5) args[4] else "batched";
        // The webhook programs read only `body.id` of the trigger: what the
        // compiler would prove for them (`triggerHeaders`).
        const reply_prog = std.mem.eql(u8, args[2], "w2") or std.mem.eql(u8, args[2], "w3") or std.mem.eql(u8, args[2], "w4");
        const meta = try std.fmt.allocPrint(gpa, "{{\"durability\":\"{s}\"{s}}}", .{ dur, if (reply_prog) ",\"triggerHeaders\":false" else "" });
        defer gpa.free(meta);
        // `approval` waits for a person (evicted); `every-second` has a
        // schedule trigger in Europe/Berlin. ci.sh uses both.
        const bytes = if (std.mem.eql(u8, args[2], "glue")) try programs.glue(gpa, meta) else if (std.mem.eql(u8, args[2], "approval")) try programs.approval(gpa, meta) else if (std.mem.eql(u8, args[2], "every-second")) try programs.everySecond(gpa, "{\"durability\":\"batched\",\"triggers\":[{\"kind\":\"schedule\",\"cron\":\"* * * * * *\",\"timezone\":\"Europe/Berlin\"}]}") else try programs.webhookReply(gpa, meta, if (std.mem.eql(u8, args[2], "w3")) .http else if (std.mem.eql(u8, args[2], "w4")) .fallback_code else .none);
        defer gpa.free(bytes);
        try cwd.writeFile(io, .{ .sub_path = args[3], .data = bytes });
        return;
    }
    try out.writeAll(usage);
}

fn serve(process_gpa: std.mem.Allocator, io: std.Io, args: []const [:0]const u8) !void {
    // Everything `serve` keeps for its life lives in this arena, so a clean
    // shutdown frees it at once and a Debug build reports any leak.
    var serve_arena = std.heap.ArenaAllocator.init(process_gpa);
    defer serve_arena.deinit();
    const gpa = serve_arena.allocator();
    var opts: server.Options = .{};
    var modules: std.ArrayList([]const u8) = .empty;
    var routes: std.ArrayList(server.RouteArg) = .empty;
    var current_module: u32 = 0;
    var rules: std.ArrayList(egress.Rule) = .empty;
    // Sizing from a load (`--target-rate`); explicit flags win over it.
    var target_rate: u32 = 0;
    var vendor_latency_ms: u32 = 300;
    var memory_mb: u32 = 0;
    var explicit: struct { reqs: bool = false, econns: bool = false, slots: bool = false, conns: bool = false } = .{};
    var i: usize = 0;
    while (i < args.len) : (i += 1) {
        const k = args[i];
        if (std.mem.eql(u8, k, "--log-fires")) {
            opts.log_fires = true;
            continue;
        }
        if (std.mem.eql(u8, k, "--test-clock")) {
            // A test bed sets the start clock of each run (CLOCK-OFFSET).
            opts.test_clock = true;
            continue;
        }
        if (std.mem.eql(u8, k, "--stats")) {
            opts.stats = true;
            continue;
        }
        if (std.mem.eql(u8, k, "--gym-env")) {
            // GYM_ADDR, GYM_HOSTS, GYM_DNS, GYM_PORT_MAP (shell/gym.zig).
            const g = try gpa.create(@import("shell/gym.zig").Gym);
            g.* = @import("shell/gym.zig").Gym.fromEnv(envValue) catch |e| {
                std.debug.print("--gym-env: {s} (GYM_ADDR must be an IPv4 address)\n", .{@errorName(e)});
                std.process.exit(2);
            };
            opts.gym = g;
            if (g.dns.len > 0) opts.gym_dns = try gpa.dupeSentinel(u8, g.dns, 0);
            std.debug.print("gym: {d} host pattern(s), {d} mapped port(s), resolver {s}\n", .{ g.npatterns, g.nports, if (g.dns.len > 0) g.dns else "system" });
            continue;
        }
        if (std.mem.eql(u8, k, "--insecure-tls")) {
            std.debug.print("warning: --insecure-tls skips TLS certificate checks; use it only in tests\n", .{});
            opts.insecure_tls = true;
            continue;
        }
        if (i + 1 >= args.len) break;
        const v = args[i + 1];
        i += 1;
        if (std.mem.eql(u8, k, "--port")) opts.port = try std.fmt.parseInt(u16, v, 10);
        if (std.mem.eql(u8, k, "--shards")) opts.shards = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--log-dir")) opts.log_dir = v;
        if (std.mem.eql(u8, k, "--fallback")) opts.fallback = v;
        if (std.mem.eql(u8, k, "--rbuf-kb")) opts.rbuf = 1024 * try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-max-body-mb")) opts.egress_max_body = (try std.fmt.parseInt(u32, v, 10)) << 20;
        if (std.mem.eql(u8, k, "--egress-big-slots")) opts.egress_big_slots = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--admin-port")) opts.admin_port = try std.fmt.parseInt(u16, v, 10);
        // A profile sets several sizes; flags after it override them.
        if (std.mem.eql(u8, k, "--profile")) {
            if (!std.mem.eql(u8, v, "embedded")) {
                std.debug.print("unknown --profile {s}; the only profile is embedded\n", .{v});
                std.process.exit(2);
            }
            opts.applyEmbedded();
        }
        if (std.mem.eql(u8, k, "--max-conns")) {
            opts.max_conns = try std.fmt.parseInt(u32, v, 10);
            explicit.conns = true;
        }
        if (std.mem.eql(u8, k, "--slots")) {
            opts.slots = @max(8, try std.fmt.parseInt(u32, v, 10));
            explicit.slots = true;
        }
        if (std.mem.eql(u8, k, "--target-rate")) target_rate = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--vendor-latency-ms")) vendor_latency_ms = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--memory-mb")) memory_mb = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-max-requests")) {
            opts.max_egress = @max(1, try std.fmt.parseInt(u32, v, 10));
            explicit.reqs = true;
        }
        if (std.mem.eql(u8, k, "--egress-max-conns")) {
            opts.egress.max_conns = @max(1, try std.fmt.parseInt(u32, v, 10));
            explicit.econns = true;
        }
        if (std.mem.eql(u8, k, "--egress-max-origins")) opts.egress.max_origins = @max(1, try std.fmt.parseInt(u32, v, 10));
        if (std.mem.eql(u8, k, "--egress-origin-conns")) opts.egress.origin.max_conns = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-origin-inflight")) opts.egress.origin.max_inflight = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-origin-queue")) opts.egress.origin.max_queue = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-origin-rate")) opts.egress.origin.rate = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-origin-burst")) opts.egress.origin.burst = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-connect-timeout-ms")) opts.egress.connect_timeout_ms = @max(1, try std.fmt.parseInt(u32, v, 10));
        if (std.mem.eql(u8, k, "--egress-read-timeout-ms")) opts.egress.read_timeout_ms = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-timeout-ms")) opts.egress.default_timeout_ms = @max(1, try std.fmt.parseInt(u32, v, 10));
        if (std.mem.eql(u8, k, "--egress-stuck-ms")) opts.egress.stuck_ms = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-retry-after-max-ms")) opts.egress.retry_after_max_ms = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-h2-conns")) opts.egress.h2_conns = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--egress-h2-streams")) opts.egress.h2_streams = @max(1, try std.fmt.parseInt(u32, v, 10));
        if (std.mem.eql(u8, k, "--egress-h2") or std.mem.eql(u8, k, "--egress-aimd")) {
            const on = std.mem.eql(u8, v, "on");
            if (!on and !std.mem.eql(u8, v, "off")) {
                std.debug.print("{s} takes on or off\n", .{k});
                std.process.exit(2);
            }
            if (std.mem.eql(u8, k, "--egress-h2")) opts.egress.h2 = on else opts.egress.aimd = on;
        }
        if (std.mem.eql(u8, k, "--io")) {
            opts.io = std.meta.stringToEnum(server.IoMode, v) orelse {
                std.debug.print("--io takes poll, uring or auto\n", .{});
                std.process.exit(2);
            };
        }
        if (std.mem.eql(u8, k, "--ring-buffers")) {
            opts.ring_buffers = std.fmt.parseInt(u16, v, 10) catch 0;
            if (!std.math.isPowerOfTwo(opts.ring_buffers)) {
                std.debug.print("--ring-buffers takes a power of two up to 32768\n", .{});
                std.process.exit(2);
            }
        }
        if (std.mem.eql(u8, k, "--egress-pool")) {
            opts.egress.pool = std.meta.stringToEnum(egress.Pool, v) orelse {
                std.debug.print("--egress-pool takes shared, workflow or credential\n", .{});
                std.process.exit(2);
            };
        }
        if (std.mem.eql(u8, k, "--egress-origin")) {
            const rule = egress.Rule.parse(v) catch {
                std.debug.print("--egress-origin \"{s}\" is not valid: <host>[:port] then key=value (conns, inflight, queue, rate, burst, connect-ms, read-ms, timeout-ms, h2, aimd)\n", .{v});
                std.process.exit(2);
            };
            try rules.append(gpa, rule);
        }
        if (std.mem.eql(u8, k, "--ca-file")) opts.ca_file = v;
        if (std.mem.eql(u8, k, "--max-zones")) opts.max_zones = @max(1, try std.fmt.parseInt(u16, v, 10));
        if (std.mem.eql(u8, k, "--max-static-data")) opts.max_static_data = @max(1, try std.fmt.parseInt(u32, v, 10));
        if (std.mem.eql(u8, k, "--static-data-kb")) opts.static_data_kb = std.math.clamp(try std.fmt.parseInt(u32, v, 10), 1, 16 << 10);
        if (std.mem.eql(u8, k, "--max-service-calls")) opts.max_service_calls = std.math.clamp(try std.fmt.parseInt(u32, v, 10), 1, 1 << 16);
        if (std.mem.eql(u8, k, "--service-call-kb")) opts.service_call_kb = std.math.clamp(try std.fmt.parseInt(u32, v, 10), 1, 64 << 10);
        if (std.mem.eql(u8, k, "--service-timeout-ms")) opts.service_timeout_ms = std.math.clamp(try std.fmt.parseInt(i64, v, 10), 1, 24 * 3600 * 1000);
        if (std.mem.eql(u8, k, "--step-events-sample")) opts.step_event_sample = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--max-modules")) opts.max_modules = try std.fmt.parseInt(u16, v, 10);
        if (std.mem.eql(u8, k, "--max-routes")) opts.max_routes = @max(1, try std.fmt.parseInt(u32, v, 10));
        if (std.mem.eql(u8, k, "--max-schedules")) opts.max_schedules = @max(1, try std.fmt.parseInt(u32, v, 10));
        if (std.mem.eql(u8, k, "--module-store-mb")) opts.module_bytes = @as(u32, try std.fmt.parseInt(u12, v, 10)) << 20;
        if (std.mem.eql(u8, k, "--max-request-mb")) opts.max_request = @as(usize, try std.fmt.parseInt(u32, v, 10)) << 20;
        if (std.mem.eql(u8, k, "--request-big-slots")) opts.request_big_slots = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--snap-mb")) opts.snap_bytes = @as(u64, try std.fmt.parseInt(u32, v, 10)) << 20;
        if (std.mem.eql(u8, k, "--event-queue-mb")) opts.event_queue_bytes = @as(usize, try std.fmt.parseInt(u32, v, 10)) << 20;
        if (std.mem.eql(u8, k, "--admin-secret-env")) {
            // The secret comes from the environment, never from argv.
            const secret = @import("shell/sys.zig").getenv(v) orelse {
                std.debug.print("the environment variable {s} is not set\n", .{v});
                std.process.exit(2);
            };
            opts.admin_secret = secret;
        }
        if (std.mem.eql(u8, k, "--credentials")) {
            // Read once and kept for the life of the process. The contents
            // are secrets: errors name the file only.
            const text = std.Io.Dir.cwd().readFileAlloc(io, v, gpa, .limited(16 << 20)) catch |e| {
                std.debug.print("cannot read the credentials file {s}: {s}\n", .{ v, @errorName(e) });
                std.process.exit(2);
            };
            const store = try gpa.create(creds.Store);
            store.* = creds.Store.parse(gpa, text) catch |e| {
                std.debug.print("the credentials file {s} is not a JSON object: {s}\n", .{ v, @errorName(e) });
                std.process.exit(2);
            };
            opts.credentials = store;
        }
        if (std.mem.eql(u8, k, "--module")) {
            // The core loads a module once per hash, so identical files share
            // one index.
            const bytes = try std.Io.Dir.cwd().readFileAlloc(io, v, gpa, .limited(64 << 20));
            current_module = for (modules.items, 0..) |m, mi| {
                if (std.mem.eql(u8, m, bytes)) break @intCast(mi);
            } else blk: {
                try modules.append(gpa, bytes);
                break :blk @intCast(modules.items.len - 1);
            };
        }
        if (std.mem.eql(u8, k, "--route")) {
            const sp = std.mem.indexOfScalar(u8, v, ' ') orelse return error.BadRoute;
            try routes.append(gpa, .{ .module = current_module, .method = v[0..sp], .path = v[sp + 1 ..] });
        }
        if (std.mem.eql(u8, k, "--rate")) routes.items[routes.items.len - 1].rate = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--burst")) routes.items[routes.items.len - 1].burst = try std.fmt.parseInt(u32, v, 10);
        if (std.mem.eql(u8, k, "--concurrency")) routes.items[routes.items.len - 1].concurrency = try std.fmt.parseInt(u32, v, 10);
    }
    opts.modules = modules.items;
    opts.routes = routes.items;
    opts.egress.rules = rules.items;
    if (target_rate > 0) {
        // Little's law: executions in flight = rate x latency.
        const s = egress.sizeFor(target_rate, vendor_latency_ms, memory_mb, opts.egress);
        const in_flight: u32 = @intCast(@max(64, (@as(u64, target_rate) * vendor_latency_ms + 999) / 1000));
        if (!explicit.reqs) opts.max_egress = s.max_reqs;
        if (!explicit.econns) opts.egress.max_conns = s.max_conns;
        if (!explicit.slots) opts.slots = @max(opts.slots, in_flight + in_flight / 4);
        if (!explicit.conns) opts.max_conns = @max(opts.max_conns, @min(in_flight + in_flight / 4, 1 << 20));
        std.debug.print("sizing for {d}/s at {d} ms: {d} in flight; --slots {d} --max-conns {d} --egress-max-requests {d} --egress-max-conns {d}\n", .{ target_rate, vendor_latency_ms, in_flight, opts.slots, opts.max_conns, opts.max_egress, opts.egress.max_conns });
    }
    if (opts.admin_port != null) {
        if (opts.admin_secret.len < 16) {
            std.debug.print("--admin-port needs --admin-secret-env with a secret of 16 or more bytes\n", .{});
            std.process.exit(2);
        }
        // Admin events and the event stream live in one shard.
        if (opts.shards != 1) {
            std.debug.print("--admin-port needs --shards 1\n", .{});
            std.process.exit(2);
        }
    }
    @import("shell/sys.zig").ignoreSigpipe();
    @import("shell/sys.zig").handleShutdownSignals();
    var stop = std.atomic.Value(bool).init(false);
    const stats = try gpa.alloc(server.Stats, opts.shards);
    for (stats) |*st| st.* = .{};
    const threads = try gpa.alloc(std.Thread, opts.shards);
    const arenas = try gpa.alloc(growth.Guard, opts.shards);
    const runners = try gpa.alloc(*server.Runner, opts.shards);
    // Debug builds back the shards with the process allocator, so its leak
    // check covers them; other builds map pages directly.
    const backing = if (@import("builtin").mode == .debug) process_gpa else std.heap.page_allocator;
    var sid: u32 = 0;
    while (sid < opts.shards) : (sid += 1) {
        // Each shard gets its own memory, reserved at startup.
        arenas[sid] = growth.Guard.init(backing);
        runners[sid] = try server.Runner.init(arenas[sid].allocator(), sid, opts, &stats[sid], &stop);
        arenas[sid].markReady();
        threads[sid] = try std.Thread.spawn(.{}, server.Runner.run, .{runners[sid]});
    }
    defer for (arenas) |*a| a.deinit();
    std.debug.print("wfrt serving on :{d} with {d} shard(s), {d} route(s)\n", .{ opts.port, opts.shards, routes.items.len });
    if (opts.admin_port) |p| std.debug.print("wfrt admin on 127.0.0.1:{d}\n", .{p});
    var last: u64 = 0;
    var last_t = @import("shell/sys.zig").nowNs();
    var ticks: u32 = 0;
    while (!@import("shell/sys.zig").shutdown_requested.load(.acquire)) : (ticks += 1) {
        @import("shell/sys.zig").sleepMs(100);
        if (!opts.stats or ticks % 10 != 9) continue;
        var req: u64 = 0;
        var batches: u64 = 0;
        var log_bytes: u64 = 0;
        var writes: u64 = 0;
        for (stats) |*st| {
            req += st.requests.load(.monotonic);
            batches += st.batches.load(.monotonic);
            log_bytes += st.log_bytes.load(.monotonic);
            writes += st.syscalls_write.load(.monotonic);
        }
        const now = @import("shell/sys.zig").nowNs();
        const dt = @as(f64, @floatFromInt(now - last_t)) / 1e9;
        std.debug.print("req/s={d:.0} total={d} batches={d} log_bytes={d} writes={d}\n", .{ @as(f64, @floatFromInt(req - last)) / dt, req, batches, log_bytes, writes });
        last = req;
        last_t = now;
    }
    std.debug.print("wfrt stopping\n", .{});
    stop.store(true, .release);
    for (threads) |t| t.join();
    for (runners) |r| r.deinit();
    // ci.sh reads these lines: a shard's memory must not grow after startup.
    for (arenas, 0..) |*a, s| {
        std.debug.print("shard {d} memory: {d} allocation(s), {d} bytes after startup; arena {d} -> {d} bytes\n", .{ s, a.late_allocs, a.late_bytes, a.ready_capacity, a.arena.queryCapacity() });
    }
}

/// An environment variable, for `--gym-env`. The process keeps it.
fn envValue(name: []const u8) ?[]const u8 {
    return @import("shell/sys.zig").getenv(name);
}

fn runCorpus(gpa: std.mem.Allocator, io: std.Io, out: *std.Io.Writer, dir_path: []const u8) !u32 {
    var dir = try std.Io.Dir.cwd().openDir(io, dir_path, .{ .iterate = true });
    defer dir.close(io);
    var names: std.ArrayList([]u8) = .empty;
    defer {
        for (names.items) |n| gpa.free(n);
        names.deinit(gpa);
    }
    var it = dir.iterate();
    while (try it.next(io)) |e| {
        if (e.kind != .directory) continue;
        try names.append(gpa, try gpa.dupe(u8, e.name));
    }
    std.mem.sort([]u8, names.items, {}, struct {
        fn less(_: void, x: []u8, y: []u8) bool {
            return std.mem.lessThan(u8, x, y);
        }
    }.less);
    var failed: u32 = 0;
    for (names.items) |name| {
        var sub = try dir.openDir(io, name, .{});
        defer sub.close(io);
        const mod = sub.readFileAlloc(io, "module.wfm", gpa, .limited(64 << 20)) catch continue;
        defer gpa.free(mod);
        const fx = try sub.readFileAlloc(io, "fixture.json", gpa, .limited(64 << 20));
        defer gpa.free(fx);
        const expected = try sub.readFileAlloc(io, "expected.json", gpa, .limited(64 << 20));
        defer gpa.free(expected);
        const r = fixture.run(gpa, mod, fx) catch |err| {
            failed += 1;
            try out.print("FAIL {s}: {s}\n", .{ name, @errorName(err) });
            continue;
        };
        defer gpa.free(r.output);
        const want = try fixture.canonical(gpa, expected);
        defer gpa.free(want);
        const got = fixture.canonical(gpa, r.output) catch try gpa.dupe(u8, r.output);
        defer gpa.free(got);
        if (std.mem.eql(u8, got, want)) {
            try out.print("ok   {s}\n", .{name});
        } else {
            failed += 1;
            try out.print("FAIL {s}\n  want {s}\n  got  {s}\n", .{ name, want, got });
        }
    }
    try out.print("{d} of {d} passed\n", .{ names.items.len - failed, names.items.len });
    return failed;
}

test {
    _ = @import("shell/http.zig");
    _ = @import("shell/creds.zig");
    _ = @import("shell/request.zig");
    _ = @import("shell/egress.zig");
    _ = @import("shell/retry_test.zig");
    _ = @import("shell/admin.zig");
    _ = @import("shell/gym.zig");
    _ = @import("shell/growth.zig");
    _ = @import("shell/egress_test.zig");
    _ = @import("shell/server.zig");
    _ = @import("shell/uring.zig");
    _ = @import("shell/fuzz_test.zig");
    _ = @import("shell/loadgen.zig");
    _ = @import("shell/static_data_test.zig");
    _ = @import("shell/binary_store.zig");
}
