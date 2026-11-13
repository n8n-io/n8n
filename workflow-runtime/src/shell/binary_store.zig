//! References to binary data in n8n's filesystem store (spec 8.5).
//!
//! The fallback host keeps binary data as n8n does in its `filesystem` mode:
//! a file `<storage>/workflows/<workflow>/executions/<execution>/binary_data/<file>`
//! and, in the item, an entry `{ id: "filesystem-v2:<file id>", data: "filesystem-v2",
//! mimeType, fileName, ... }`. The runtime passes such an entry on as it is. A
//! consumer that needs the bytes (a binary reply) reads the file here.
//!
//! The storage path is `WFRT_BINARY_DATA_STORAGE_PATH`, else n8n's
//! `N8N_BINARY_DATA_STORAGE_PATH`. Without one, a reference cannot be read.
const std = @import("std");
const sys = @import("sys.zig");

/// The longest binary data id that the runtime reads.
pub const max_id = 512;
/// The longest path of a stored file.
pub const max_path = 1024;
/// The longest segment of a file id.
const max_segment = 128;
/// `workflows/<wf>/executions/<exec>/binary_data/<file>`.
const segment_count = 6;

const prefixes = [_][]const u8{ "filesystem-v2:", "filesystem:" };

pub const ReadError = error{ NoStore, BadId, NotFound, TooLarge, Io, OutOfMemory };

/// The mode names that n8n writes in `data` of a stored entry instead of base64.
pub fn isStoredMarker(data: []const u8) bool {
    return std.mem.eql(u8, data, "filesystem-v2") or std.mem.eql(u8, data, "filesystem");
}

/// The file id of a binary data id, with the path rules of the host's byte
/// store: six segments `workflows/<wf>/executions/<exec>/binary_data/<file>`,
/// each 1 to 128 characters of `[A-Za-z0-9._-]` and not `.` or `..`. Null for
/// any other id, so the path stays inside the storage path.
pub fn fileId(id: []const u8) ?[]const u8 {
    if (id.len == 0 or id.len > max_id) return null;
    const rest = for (prefixes) |p| {
        if (std.mem.startsWith(u8, id, p)) break id[p.len..];
    } else return null;
    var segments: [segment_count][]const u8 = undefined;
    var n: usize = 0;
    var start: usize = 0;
    var i: usize = 0;
    // One pass over the id: the bound is its length.
    while (i <= rest.len) : (i += 1) {
        if (i < rest.len and rest[i] != '/') continue;
        if (n == segment_count) return null;
        const segment = rest[start..i];
        if (!validSegment(segment)) return null;
        segments[n] = segment;
        n += 1;
        start = i + 1;
    }
    if (n != segment_count) return null;
    if (!std.mem.eql(u8, segments[0], "workflows")) return null;
    if (!std.mem.eql(u8, segments[2], "executions")) return null;
    if (!std.mem.eql(u8, segments[4], "binary_data")) return null;
    std.debug.assert(rest.len <= max_id);
    return rest;
}

fn validSegment(segment: []const u8) bool {
    if (segment.len == 0 or segment.len > max_segment) return false;
    if (std.mem.eql(u8, segment, ".") or std.mem.eql(u8, segment, "..")) return false;
    for (segment) |c| {
        const ok = std.ascii.isAlphanumeric(c) or c == '-' or c == '_' or c == '.';
        if (!ok) return false;
    }
    return true;
}

/// The storage path from the environment, or null.
pub fn storagePath() ?[]const u8 {
    const path = sys.getenv("WFRT_BINARY_DATA_STORAGE_PATH") orelse sys.getenv("N8N_BINARY_DATA_STORAGE_PATH") orelse return null;
    if (path.len == 0 or path.len > max_path / 2) return null;
    return path;
}

/// The path of the file of `id`, NUL-terminated, in `buf`.
pub fn filePath(buf: *[max_path + 1]u8, storage: []const u8, id: []const u8) ReadError![:0]const u8 {
    const fid = fileId(id) orelse return error.BadId;
    if (storage.len == 0) return error.NoStore;
    const trimmed = std.mem.trimEnd(u8, storage, "/");
    if (trimmed.len + 1 + fid.len > max_path) return error.BadId;
    const path = std.fmt.bufPrintSentinel(buf, "{s}/{s}", .{ trimmed, fid }, 0) catch return error.BadId;
    std.debug.assert(path.len <= max_path);
    return path;
}

/// Reads the file of `id` into memory from `scratch` (the transient storage of
/// the batch). A file larger than `limit` is `error.TooLarge`.
pub fn read(scratch: std.mem.Allocator, storage: []const u8, id: []const u8, limit: usize) ReadError![]u8 {
    var buf: [max_path + 1]u8 = undefined;
    const path = try filePath(&buf, storage, id);
    const fd = std.c.open(path, .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
    if (fd < 0) return error.NotFound;
    defer _ = std.c.close(fd);
    const end = std.c.lseek(fd, 0, std.c.SEEK.END);
    if (end < 0) return error.Io;
    const size: usize = @intCast(end);
    if (size > limit) return error.TooLarge;
    if (std.c.lseek(fd, 0, std.c.SEEK.SET) != 0) return error.Io;
    const out = try scratch.alloc(u8, size);
    var got: usize = 0;
    // Each read moves forward or ends the loop, so the file size bounds it.
    while (got < size) {
        const n = std.c.read(fd, out[got..].ptr, size - got);
        if (n <= 0) return error.Io;
        got += @intCast(n);
    }
    std.debug.assert(got == size);
    return out;
}

test "fileId accepts n8n's execution ids only" {
    const t = std.testing;
    try t.expectEqualStrings(
        "workflows/wf1/executions/41/binary_data/3f2a-11",
        fileId("filesystem-v2:workflows/wf1/executions/41/binary_data/3f2a-11").?,
    );
    try t.expect(fileId("filesystem:workflows/wf1/executions/temp/binary_data/a.b") != null);
    try t.expect(fileId("s3:workflows/wf1/executions/41/binary_data/x") == null);
    try t.expect(fileId("filesystem-v2:workflows/../executions/41/binary_data/x") == null);
    try t.expect(fileId("filesystem-v2:workflows/wf1/executions/41/binary_data/../x") == null);
    try t.expect(fileId("filesystem-v2:/etc/passwd") == null);
    try t.expect(fileId("filesystem-v2:workflows/wf1/executions/41/binary_data/x/y") == null);
    try t.expect(fileId("filesystem-v2:workflows//executions/41/binary_data/x") == null);
    try t.expect(fileId("filesystem-v2:workflows/wf 1/executions/41/binary_data/x") == null);
}

test "isStoredMarker" {
    try std.testing.expect(isStoredMarker("filesystem-v2"));
    try std.testing.expect(!isStoredMarker("aGk="));
}

test "read gives the bytes of a stored file" {
    const t = std.testing;
    var tmp = t.tmpDir(.{});
    defer tmp.cleanup();
    var root_buf: [256]u8 = undefined;
    const root = try std.fmt.bufPrint(&root_buf, ".zig-cache/tmp/{s}", .{tmp.sub_path});
    const dirs = [_][]const u8{ "workflows", "workflows/wf1", "workflows/wf1/executions", "workflows/wf1/executions/41", "workflows/wf1/executions/41/binary_data" };
    var pb: [max_path + 1]u8 = undefined;
    for (dirs) |d| {
        const dir = try std.fmt.bufPrintSentinel(&pb, "{s}/{s}", .{ root, d }, 0);
        try t.expect(std.c.mkdir(dir, 0o700) == 0);
    }
    const file = try std.fmt.bufPrintSentinel(&pb, "{s}/workflows/wf1/executions/41/binary_data/f1", .{root}, 0);
    const fd = std.c.open(file, .{ .ACCMODE = .WRONLY, .CREAT = true, .TRUNC = true }, @as(std.c.mode_t, 0o600));
    try t.expect(fd >= 0);
    try t.expect(std.c.write(fd, "hello", 5) == 5);
    _ = std.c.close(fd);

    const got = try read(t.allocator, root, "filesystem-v2:workflows/wf1/executions/41/binary_data/f1", 1024);
    defer t.allocator.free(got);
    try t.expectEqualStrings("hello", got);
    try t.expectError(error.TooLarge, read(t.allocator, root, "filesystem-v2:workflows/wf1/executions/41/binary_data/f1", 2));
    try t.expectError(error.NotFound, read(t.allocator, root, "filesystem-v2:workflows/wf1/executions/41/binary_data/f2", 1024));
    try t.expectError(error.BadId, read(t.allocator, root, "filesystem-v2:../x", 1024));
}

/// A seed in the fuzzer's input form: `Smith.slice` reads a 4-byte little-
/// endian length first.
fn fuzzSeed(comptime s: []const u8) *const [4 + s.len]u8 {
    return comptime blk: {
        var out: [4 + s.len]u8 = undefined;
        std.mem.writeInt(u32, out[0..4], s.len, .little);
        @memcpy(out[4..], s);
        const final = out;
        break :blk &final;
    };
}

var fuzz_input: [2 * max_id]u8 = undefined;

/// Any id: `fileId` gives null or six safe segments, and the path stays
/// inside the storage path.
fn fuzzFileId(_: void, smith: *std.testing.Smith) !void {
    const id = fuzz_input[0..smith.slice(&fuzz_input)];
    const fid = fileId(id) orelse return;
    try std.testing.expect(fid.len > 0 and fid[0] != '/');
    var it = std.mem.splitScalar(u8, fid, '/');
    var n: usize = 0;
    while (it.next()) |segment| : (n += 1) {
        try std.testing.expect(n < segment_count);
        try std.testing.expect(validSegment(segment));
    }
    try std.testing.expectEqual(segment_count, n);
    var buf: [max_path + 1]u8 = undefined;
    const path = try filePath(&buf, "/store", id);
    try std.testing.expect(std.mem.startsWith(u8, path, "/store/workflows/"));
}

test "fuzz binary data ids" {
    try std.testing.fuzz({}, fuzzFileId, .{
        .corpus = &.{
            fuzzSeed("filesystem-v2:workflows/wf1/executions/41/binary_data/3f2a-11"),
            fuzzSeed("filesystem:workflows/a/executions/temp/binary_data/b.bin"),
            fuzzSeed("filesystem-v2:workflows/../executions/41/binary_data/x"),
            fuzzSeed("s3:workflows/wf1/executions/41/binary_data/x"),
        },
    });
}
