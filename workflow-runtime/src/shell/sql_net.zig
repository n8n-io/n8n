//! What the database clients of the `sql` effect share (`pg.zig`,
//! `my.zig`): bytes in and out of a socket or a TLS session, the text of
//! an address as Node.js writes it, and the values of a credential.
const std = @import("std");
const sys = @import("sys.zig");
const tls = @import("tls.zig");
const creds = @import("creds.zig");

/// One finished call: the result JSON (`ok`) or the text of the error.
/// `payload` is valid until the client's `release`.
pub const Done = struct { req: u32, exec_id: u64, seq: u32, ok: bool, payload: []const u8 };

pub const IoStep = union(enum) { n: usize, again, want_write, closed };

/// Read from the TLS session, or from the socket when there is none.
pub fn ioRead(session: ?tls.Session, fd: c_int, buf: []u8) IoStep {
    const s = session orelse return switch (sys.readSome(fd, buf)) {
        .n => |n| .{ .n = n },
        .again => .again,
        .closed => .closed,
    };
    return switch (s.read(buf)) {
        .n => |n| .{ .n = n },
        .want_read => .again,
        .want_write => .want_write,
        .closed, .failed => .closed,
    };
}

/// Write to the TLS session, or to the socket when there is none.
pub fn ioWrite(session: ?tls.Session, fd: c_int, buf: []const u8) IoStep {
    const s = session orelse return switch (sys.writeSome(fd, buf)) {
        .n => |n| .{ .n = n },
        .again => .again,
        .closed => .closed,
    };
    return switch (s.write(buf)) {
        .n => |n| .{ .n = n },
        .want_read, .want_write => .want_write,
        .closed, .failed => .closed,
    };
}

/// `ip:port` as Node.js writes it in a connect error.
pub fn addrText(a: sys.Addr, buf: []u8) []const u8 {
    // A buffer of 64 bytes holds every address; a smaller one gives no text.
    if (!a.v6) return std.fmt.bufPrint(buf, "{d}.{d}.{d}.{d}:{d}", .{ a.ip[0], a.ip[1], a.ip[2], a.ip[3], a.port }) catch "";
    var o: creds.Out = .{ .buf = buf };
    writeIp6(&o, a.ip) catch return "";
    var pb: [8]u8 = @splat(0);
    // A port has five digits at most.
    const port = std.fmt.bufPrint(&pb, ":{d}", .{a.port}) catch "";
    o.put(port) catch return "";
    return o.written();
}

/// An IPv6 address in the short form (RFC 5952): the longest run of two
/// or more zero groups becomes `::`.
fn writeIp6(o: *creds.Out, ip: [16]u8) creds.Out.Error!void {
    var groups: [8]u16 = @splat(0);
    for (&groups, 0..) |*g, i| g.* = std.mem.readInt(u16, ip[i * 2 ..][0..2], .big);
    var best_at: usize = 8;
    var best_len: usize = 1;
    var i: usize = 0;
    while (i < 8) : (i += 1) {
        var j = i;
        while (j < 8 and groups[j] == 0) j += 1;
        if (j - i > best_len) {
            best_at = i;
            best_len = j - i;
        }
        i = @max(i, j);
    }
    i = 0;
    while (i < 8) : (i += 1) {
        if (i == best_at) {
            try o.put("::");
            i += best_len - 1;
            continue;
        }
        var gb: [5]u8 = @splat(0);
        if (i > 0 and i != best_at + best_len) try o.byte(':');
        // A group has four hex digits at most.
        const group = std.fmt.bufPrint(&gb, "{x}", .{groups[i]}) catch "";
        try o.put(group);
    }
}

/// The text of a credential value: a string, or a number as it is written.
pub fn textOf(v: ?std.json.Value) ?[]const u8 {
    const x = v orelse return null;
    return switch (x) {
        .string => |s| s,
        .number_string => |s| s,
        // A value of another kind is no text.
        else => null,
    };
}

pub fn isOn(v: ?std.json.Value) bool {
    const x = v orelse return false;
    return x == .bool and x.bool;
}

pub fn hasText(v: ?std.json.Value) bool {
    const t = textOf(v) orelse return false;
    return t.len > 0;
}

test "sql client: addresses as Node.js writes them" {
    var buf: [64]u8 = @splat(0);
    try std.testing.expectEqualStrings("127.0.0.1:5432", addrText(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 5432), &buf));
    var one: [16]u8 = @splat(0);
    one[15] = 1;
    try std.testing.expectEqualStrings("::1:5432", addrText(.{ .v6 = true, .ip = one, .port = 5432 }, &buf));
    var mid: [16]u8 = @splat(0);
    mid[0] = 0x20;
    mid[1] = 0x01;
    mid[15] = 0x10;
    mid[7] = 0x05;
    try std.testing.expectEqualStrings("2001:0:0:5::10:1", addrText(.{ .v6 = true, .ip = mid, .port = 1 }, &buf));
}
