const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .ReleaseSafe });
    // Outbound TLS and DNS use OpenSSL 3 and c-ares. `-Dnet=false` builds
    // without them, for example to cross-compile; https and DNS names then
    // fail with a clear effect error.
    const net = b.option(bool, "net", "Link OpenSSL and c-ares for TLS and DNS (default true)") orelse true;
    const build_options = b.addOptions();
    build_options.addOption(bool, "net", net);
    // Sanitizers, for the Linux checks in bench/linux-sanitizers.sh.
    const tsan = b.option(bool, "tsan", "Build with the thread sanitizer") orelse false;
    const sanitize_c = b.option(bool, "sanitize-c", "Full UBSan checks for C code compiled with the modules") orelse false;
    // Frame pointers for call graphs (`perf record -g` without DWARF unwinding).
    const frame_pointers = b.option(bool, "frame-pointers", "Keep frame pointers in all code (default false)") orelse false;
    const omit_fp: ?bool = if (frame_pointers) false else null;

    const core = b.createModule(.{
        .root_source_file = b.path("src/core/root.zig"),
        .target = target,
        .optimize = optimize,
        .omit_frame_pointer = omit_fp,
    });

    const exe_mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
        .omit_frame_pointer = omit_fp,
        .imports = &.{.{ .name = "core", .module = core }},
    });
    exe_mod.addOptions("build_options", build_options);
    if (net) linkNet(b, exe_mod, target);
    sanitize(exe_mod, tsan, sanitize_c);
    sanitize(core, tsan, sanitize_c);
    const exe = b.addExecutable(.{ .name = "wfrt", .root_module = exe_mod });
    b.installArtifact(exe);

    const check = b.step("check", "Compile without producing a binary");
    check.dependOn(&b.addExecutable(.{ .name = "wfrt-check", .root_module = exe_mod }).step);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    run_cmd.addPassthruArgs();
    b.step("run", "Run wfrt").dependOn(&run_cmd.step);

    // Tests in Debug and in the safe release mode.
    const test_debug = b.step("test-debug", "Unit tests, Debug");
    const test_safe = b.step("test-safe", "Unit tests, ReleaseSafe");
    inline for (.{ .{ test_debug, std.builtin.OptimizeMode.Debug }, .{ test_safe, std.builtin.OptimizeMode.ReleaseSafe } }) |pair| {
        const core_t = b.createModule(.{ .root_source_file = b.path("src/core/root.zig"), .target = target, .optimize = pair[1] });
        const shell_t = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = pair[1],
            .link_libc = true,
            .imports = &.{.{ .name = "core", .module = core_t }},
        });
        shell_t.addOptions("build_options", build_options);
        if (net) linkNet(b, shell_t, target);
        sanitize(core_t, tsan, sanitize_c);
        sanitize(shell_t, tsan, sanitize_c);
        const ct = b.addTest(.{ .root_module = core_t, .name = "core-test" });
        const st = b.addTest(.{ .root_module = shell_t, .name = "shell-test" });
        pair[0].dependOn(&b.addRunArtifact(ct).step);
        pair[0].dependOn(&b.addRunArtifact(st).step);
        // The test binaries, installed for Valgrind and for ci.sh, which runs
        // them directly so that a crash names its test (bench/run-tests.sh).
        if (pair[1] == std.builtin.OptimizeMode.Debug) {
            const install_tests = b.step("install-tests", "Install the Debug test binaries to zig-out/bin");
            install_tests.dependOn(&b.addInstallArtifact(ct, .{}).step);
            install_tests.dependOn(&b.addInstallArtifact(st, .{}).step);
        } else {
            const install_safe = b.step("install-tests-safe", "Install the ReleaseSafe test binaries to zig-out/bin/safe");
            const dir: std.Build.Step.InstallArtifact.Options = .{ .dest_dir = .{ .override = .{ .custom = "bin/safe" } } };
            install_safe.dependOn(&b.addInstallArtifact(ct, dir).step);
            install_safe.dependOn(&b.addInstallArtifact(st, dir).step);
        }
    }
    const test_all = b.step("test", "Unit tests in Debug and ReleaseSafe");
    test_all.dependOn(test_debug);
    test_all.dependOn(test_safe);

    // Seeded simulation with crashes and recovery.
    const sim_run = b.addRunArtifact(exe);
    sim_run.addArg("sim");
    sim_run.addPassthruArgs();
    b.step("sim", "Seeded crash simulation").dependOn(&sim_run.step);

    // Operation counts: the cost of a batch of 1 equals a batch of 1,000.
    const counts_run = b.addRunArtifact(exe);
    counts_run.addArg("bench-counts");
    b.step("bench-counts", "Operation-count checks").dependOn(&counts_run.step);

    // Fuzz targets: tests whose names contain "fuzz", in the core and the
    // shell. `zig build fuzz` runs their seed inputs once; `zig build fuzz
    // --fuzz=200K` fuzzes for that many iterations; `--fuzz` runs for ever.
    const fuzz_step = b.step("fuzz", "Fuzz targets (use --fuzz or --fuzz=N)");
    // The fuzzer runs one test of a binary for ever, so a long run names
    // one target: -Dfuzz-filter="fuzz json".
    const fuzz_filter = b.option([]const u8, "fuzz-filter", "Fuzz only tests whose names contain this (default: fuzz)") orelse "fuzz";
    const fuzz_core = b.addTest(.{ .root_module = core, .filters = &.{fuzz_filter} });
    const fuzz_shell_mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
        .imports = &.{.{ .name = "core", .module = core }},
    });
    fuzz_shell_mod.addOptions("build_options", build_options);
    if (net) linkNet(b, fuzz_shell_mod, target);
    const fuzz_shell = b.addTest(.{ .root_module = fuzz_shell_mod, .filters = &.{fuzz_filter} });
    fuzz_step.dependOn(&b.addRunArtifact(fuzz_core).step);
    fuzz_step.dependOn(&b.addRunArtifact(fuzz_shell).step);
}

fn sanitize(m: *std.Build.Module, tsan: bool, sanitize_c: bool) void {
    if (tsan) m.sanitize_thread = true;
    if (sanitize_c) m.sanitize_c = .full;
}

/// Link OpenSSL 3 and c-ares. On macOS they come from Homebrew; on Linux
/// from the distribution packages (libssl-dev, libc-ares-dev).
fn linkNet(b: *std.Build, m: *std.Build.Module, target: std.Build.ResolvedTarget) void {
    // On macOS, pkg-config can point at a newer Homebrew OpenSSL; name the
    // openssl@3 directory and skip pkg-config.
    const mac = target.result.os.tag == .macos;
    if (mac) {
        const prefix = b.graph.environ_map.get("HOMEBREW_PREFIX") orelse "/opt/homebrew";
        m.addLibraryPath(.{ .cwd_relative = b.fmt("{s}/opt/openssl@3/lib", .{prefix}) });
        m.addLibraryPath(.{ .cwd_relative = b.fmt("{s}/opt/c-ares/lib", .{prefix}) });
    }
    const pc: std.Build.Module.SystemLib.UsePkgConfig = if (mac) .no else .yes;
    m.linkSystemLibrary("ssl", .{ .use_pkg_config = pc });
    m.linkSystemLibrary("crypto", .{ .use_pkg_config = pc });
    m.linkSystemLibrary("cares", .{ .use_pkg_config = pc });
}
