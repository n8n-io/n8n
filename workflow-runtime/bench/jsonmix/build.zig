//! JSON codec benchmark: the fast codec (`src/core/json.zig`) against the
//! reference (`src/core/json_ref.zig`) on the payload sizes of the real mix.
//!   zig build -Drelease=true && ./zig-out/bin/jsonmix ../floor/data
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    // wfrt ships ReleaseSafe; measure the codec the same way.
    const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .ReleaseSafe });
    const core = b.createModule(.{ .root_source_file = b.path("../../src/core/root.zig"), .target = target, .optimize = optimize });
    const mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
        .imports = &.{.{ .name = "core", .module = core }},
    });
    b.installArtifact(b.addExecutable(.{ .name = "jsonmix", .root_module = mod }));
}
