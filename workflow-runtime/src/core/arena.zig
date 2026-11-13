//! Transient storage. It only moves forward and resets in one step at the
//! end of each batch.
const std = @import("std");

pub const Arena = struct {
    buf: []u8,
    used: usize = 0,
    high_water: usize = 0,

    pub const Error = error{ArenaFull};

    pub fn init(buf: []u8) Arena {
        return .{ .buf = buf };
    }

    pub fn push(a: *Arena, comptime T: type, n: usize) Error![]T {
        // Align the address, not the offset: a buffer need not start aligned.
        const base = @intFromPtr(a.buf.ptr);
        const start = std.mem.alignForward(usize, base + a.used, @alignOf(T)) - base;
        const end = start + @sizeOf(T) * n;
        if (end > a.buf.len) return error.ArenaFull;
        a.used = end;
        a.high_water = @max(a.high_water, end);
        const bytes = a.buf[start..end];
        return @as([*]T, @ptrCast(@alignCast(bytes.ptr)))[0..n];
    }

    pub fn dupe(a: *Arena, bytes: []const u8) Error![]u8 {
        const out = try a.push(u8, bytes.len);
        @memcpy(out, bytes);
        return out;
    }

    /// Two slices, one after the other, in one allocation.
    pub fn concat(a: *Arena, x: []const u8, y: []const u8) Error![]u8 {
        const out = try a.push(u8, x.len + y.len);
        @memcpy(out[0..x.len], x);
        @memcpy(out[x.len..], y);
        return out;
    }

    pub fn begin(a: *Arena) Temp {
        return .{ .arena = a, .used = a.used };
    }

    /// Safe builds fill the released bytes with 0xAA, so a slice kept past
    /// its batch reads poison, not plausible data.
    pub fn reset(a: *Arena) void {
        if (std.debug.runtime_safety) @memset(a.buf[0..a.used], 0xAA);
        a.used = 0;
    }

    /// Start a byte string that grows at the top of the arena. Nothing else
    /// may allocate from the arena until `finish` is called.
    pub fn builder(a: *Arena) Builder {
        return .{ .arena = a, .start = a.used, .len = 0 };
    }

    pub const Temp = struct {
        arena: *Arena,
        used: usize,

        pub fn end(t: Temp) void {
            std.debug.assert(t.arena.used >= t.used);
            if (std.debug.runtime_safety) @memset(t.arena.buf[t.used..t.arena.used], 0xAA);
            t.arena.used = t.used;
        }
    };
};

pub const Builder = struct {
    arena: *Arena,
    start: usize,
    len: usize,

    pub fn append(b: *Builder, data: []const u8) Arena.Error!void {
        if (b.start + b.len + data.len > b.arena.buf.len) return error.ArenaFull;
        @memcpy(b.arena.buf[b.start + b.len ..][0..data.len], data);
        b.len += data.len;
    }

    pub fn byte(b: *Builder, c: u8) Arena.Error!void {
        if (b.start + b.len + 1 > b.arena.buf.len) return error.ArenaFull;
        b.arena.buf[b.start + b.len] = c;
        b.len += 1;
    }

    pub fn bytes(b: *const Builder) []u8 {
        return b.arena.buf[b.start..][0..b.len];
    }

    /// Keep the bytes in the arena and return them.
    pub fn finish(b: *Builder) []u8 {
        b.arena.used = b.start + b.len;
        b.arena.high_water = @max(b.arena.high_water, b.arena.used);
        return b.bytes();
    }

    /// Drop the bytes.
    pub fn abandon(b: *Builder) void {
        b.arena.used = b.start;
    }
};

/// Like `gpa.alloc`, but it does not write the memory. In safe builds
/// `alloc` fills new memory with 0xAA, which makes each page of a large
/// buffer resident at once; this keeps pages untouched until first use.
/// The contents are undefined. Free the slice with `gpa.free` as usual.
pub fn reserve(gpa: std.mem.Allocator, comptime T: type, n: usize) error{OutOfMemory}![]T {
    if (n == 0) return &.{};
    const p = gpa.rawAlloc(n * @sizeOf(T), .of(T), @returnAddress()) orelse return error.OutOfMemory;
    const items: [*]T = @ptrCast(@alignCast(p));
    return items[0..n];
}
