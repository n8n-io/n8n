//! The floor benchmarks (docs/floor.md). They read the engine's core and
//! shard code as modules; they change nothing in `src/`.
//!   zig build -Drelease=true   # bench/floor/zig-out/bin/floor
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .fast });
    // wfrt ships ReleaseSafe; measure the engine the same way by default.
    const engine_opt = b.option(std.builtin.Optimize, "engine-optimize", "Mode of the wfrt core and shard (default safe, as wfrt ships)") orelse .safe;

    const core = b.createModule(.{ .root_source_file = b.path("../../src/core/root.zig"), .target = target, .optimize = engine_opt });
    const shard = b.createModule(.{ .root_source_file = b.path("../../src/shell/shard.zig"), .target = target, .optimize = engine_opt, .imports = &.{.{ .name = "core", .module = core }} });
    const programs = b.createModule(.{ .root_source_file = b.path("../../src/shell/programs.zig"), .target = target, .optimize = engine_opt, .imports = &.{.{ .name = "core", .module = core }} });

    const mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
        .imports = &.{
            .{ .name = "core", .module = core },
            .{ .name = "shard", .module = shard },
            .{ .name = "programs", .module = programs },
        },
    });
    const mac = target.result.os.tag == .macos;
    if (mac) {
        const prefix = b.graph.environ_map.get("HOMEBREW_PREFIX") orelse "/opt/homebrew";
        mod.addLibraryPath(.{ .cwd_relative = b.fmt("{s}/opt/openssl@3/lib", .{prefix}) });
    }
    const pc: std.Build.Module.SystemLib.UsePkgConfig = if (mac) .no else .yes;
    mod.linkSystemLibrary("ssl", .{ .use_pkg_config = pc });
    mod.linkSystemLibrary("crypto", .{ .use_pkg_config = pc });
    const exe = b.addExecutable(.{ .name = "floor", .root_module = mod });
    b.installArtifact(exe);

    const t = b.addTest(.{ .root_module = mod });
    b.step("test", "Unit tests of the floor benchmarks").dependOn(&b.addRunArtifact(t).step);
}
