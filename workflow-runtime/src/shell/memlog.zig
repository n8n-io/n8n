//! In-memory log sink shared by the crash simulation and shell tests.
//! `synced` marks the prefix that survives a simulated crash.
const std = @import("std");
const shard_mod = @import("shard.zig");

pub const MemLog = struct {
    bytes: std.ArrayList(u8) = .empty,
    synced: usize = 0,
    gpa: std.mem.Allocator,

    fn append(ctx: *anyopaque, b: []const u8) anyerror!void {
        const l: *MemLog = @ptrCast(@alignCast(ctx));
        try l.bytes.appendSlice(l.gpa, b);
    }

    fn sync(ctx: *anyopaque) anyerror!void {
        const l: *MemLog = @ptrCast(@alignCast(ctx));
        l.synced = l.bytes.items.len;
    }

    pub fn sink(l: *MemLog) shard_mod.LogSink {
        return .{ .ctx = l, .appendFn = append, .syncFn = sync };
    }

    pub fn crash(l: *MemLog) void {
        l.bytes.shrinkRetainingCapacity(l.synced);
    }
};
