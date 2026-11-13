//! Control frames of the fallback host protocol, version 2.
//!
//! A frame is a u32 little-endian length, then JSON (as step frames). On a
//! new connection the shell sends `{"hello":{"version":2}}` before any step.
//!
//! - A v2 host answers `{"hello":{"version":2,"workers":N,"worker":k}}` and
//!   hands the connection to one worker process. The shell then keeps
//!   `workers` connections (at most `max_conns`), so each worker gets its
//!   steps without a hop through the host's server process.
//! - A v1 host answers the hello with an error frame (`"id":""`). The shell
//!   then uses one connection, as before.
//! - `{"goaway":{}}`: the worker takes no new steps on this connection. It
//!   closes when its steps have ended, and the shell opens a new one.
//! - `{"worker_lost":{"reason":"<text>"}}`: the worker of this connection
//!   stopped. The host's server process writes it, then closes the
//!   connection. A step alone on the connection caused the stop: it fails
//!   with the reason, not retryable. A connection that closes without it
//!   (the whole host or its server process stopped) blames no step: a step
//!   alone on it fails as retryable. Several steps go again, each alone.
//! - `{"type":"service","id":"<step frame id>","service","op","args"}`: a
//!   step that runs asks a service of n8n (spec 9.9). The shell sends the
//!   `service` event with call id `<executionId>:<seq>.<n>` and gives the
//!   answer back on the same connection:
//!   `{"type":"serviceResult","id","n","ok":true,"result"}` or
//!   `{"type":"serviceResult","id","n","ok":false,"error":"<message>"}`.
//!
//! Every other frame is a step result.
const std = @import("std");
const http = @import("http.zig");

/// The hello that the shell sends first on each connection.
pub const hello_frame = "\x17\x00\x00\x00{\"hello\":{\"version\":2}}";

comptime {
    std.debug.assert(hello_frame.len == 4 + 23);
}

/// The most connections to one host, for each shard.
pub const max_conns = 8;

pub const Control = union(enum) {
    /// A step result (or a frame the shell ignores).
    none,
    hello: struct { version: u32, workers: u32 },
    goaway,
    /// A service call of a running step: the frame id of the step.
    service: []const u8,
    /// The worker stopped: the reason, a JSON string without escapes, at
    /// most `max_reason` bytes. Empty when the host sent none that fits.
    worker_lost: []const u8,
};

/// The longest `worker_lost` reason that the shell keeps.
pub const max_reason = 160;

/// The error of a step that was alone on a connection whose worker stopped.
pub const stopped_prefix = "The step stopped its host worker: ";

/// Room for `stopped_prefix` and the longest reason.
pub const max_stopped_msg = stopped_prefix.len + max_reason;

/// The control meaning of a frame from the host. Never fails: anything that
/// is not a well-formed control frame is `.none`.
pub fn parse(frame: []const u8) Control {
    if (http.member(frame, "type")) |raw| {
        const t = http.plainString(std.mem.trim(u8, raw, " \t\r\n")) orelse return .none;
        if (!std.mem.eql(u8, t, "service")) return .none;
        const id = http.plainString(std.mem.trim(u8, http.member(frame, "id") orelse return .none, " \t\r\n")) orelse return .none;
        if (id.len == 0) return .none;
        return .{ .service = id };
    }
    if (http.member(frame, "worker_lost")) |raw| {
        const t = std.mem.trim(u8, raw, " \t\r\n");
        if (t.len < 2 or t[0] != '{') return .none;
        const reason_raw = std.mem.trim(u8, http.member(t, "reason") orelse return .{ .worker_lost = "" }, " \t\r\n");
        const reason = http.plainString(reason_raw) orelse return .{ .worker_lost = "" };
        return .{ .worker_lost = if (reason.len <= max_reason) reason else "" };
    }
    if (http.member(frame, "goaway")) |raw| {
        const t = std.mem.trim(u8, raw, " \t\r\n");
        if (t.len >= 2 and t[0] == '{') return .goaway;
    }
    const raw = http.member(frame, "hello") orelse return .none;
    const t = std.mem.trim(u8, raw, " \t\r\n");
    if (t.len < 2 or t[0] != '{') return .none;
    const version = number(http.member(t, "version")) orelse return .none;
    if (version < 2) return .none;
    const workers = number(http.member(t, "workers")) orelse 0;
    return .{ .hello = .{ .version = version, .workers = workers } };
}

/// The connections to keep for a v2 hello: one per worker, within the limit.
/// `--workers 0` (steps in the host's server process) gets one.
pub fn connectionsFor(workers: u32) u32 {
    const n = std.math.clamp(workers, 1, max_conns);
    std.debug.assert(n >= 1 and n <= max_conns);
    return n;
}

/// The error of a step that stopped its worker, with the host's reason when
/// it sent one. `buf` holds the text.
pub fn stoppedMessage(buf: *[max_stopped_msg]u8, reason: []const u8) []const u8 {
    std.debug.assert(reason.len <= max_reason);
    @memcpy(buf[0..stopped_prefix.len], stopped_prefix);
    @memcpy(buf[stopped_prefix.len..][0..reason.len], reason);
    return buf[0 .. stopped_prefix.len + reason.len];
}

/// `{"type":"serviceResult","id":"<exec>:<seq>","n":<sub>,"ok":…,"result"|"error":<raw>}`
/// as one frame at the end of `w`. `raw` is the JSON of the result, or the
/// JSON string of the error. On an error, `w` keeps a partial frame: the
/// caller drops it.
pub fn appendServiceResult(w: *std.ArrayList(u8), exec_id: u64, seq: u32, sub: u32, ok: bool, raw: []const u8) error{OutOfMemory}!void {
    std.debug.assert(sub >= 1);
    const start = w.items.len;
    try w.appendSliceBounded(&.{ 0, 0, 0, 0 });
    try w.printBounded("{{\"type\":\"serviceResult\",\"id\":\"{d}:{d}\",\"n\":{d},\"ok\":{s},\"{s}\":", .{ exec_id, seq, sub, if (ok) "true" else "false", if (ok) "result" else "error" });
    try w.appendSliceBounded(if (raw.len > 0) raw else "null");
    try w.appendBounded('}');
    const len: u32 = @intCast(w.items.len - start - 4);
    std.mem.writeInt(u32, w.items[start..][0..4], len, .little);
    std.debug.assert(w.items.len == start + 4 + len);
}

fn number(raw: ?[]const u8) ?u32 {
    const t = std.mem.trim(u8, raw orelse return null, " \t\r\n");
    return std.fmt.parseInt(u32, t, 10) catch null;
}

test "control frames" {
    try std.testing.expectEqual(Control.goaway, parse("{\"goaway\":{}}"));
    const h = parse("{\"hello\":{\"version\":2,\"workers\":3,\"worker\":1}}");
    try std.testing.expectEqual(@as(u32, 3), h.hello.workers);
    try std.testing.expectEqual(@as(u32, 2), h.hello.version);
    // The answer of a v1 host to the hello.
    try std.testing.expectEqual(Control.none, parse("{\"id\":\"\",\"ok\":false,\"error\":\"Request has no string \\\"id\\\"\"}"));
    try std.testing.expectEqual(Control.none, parse("{\"id\":\"1:0\",\"ok\":true,\"result\":[{\"hello\":{\"version\":2}}]}"));
    try std.testing.expectEqual(Control.none, parse("{\"hello\":{\"version\":1}}"));
    try std.testing.expectEqual(Control.none, parse("{\"hello\":\"x\"}"));
    try std.testing.expectEqual(@as(u32, 1), connectionsFor(0));
    try std.testing.expectEqual(@as(u32, max_conns), connectionsFor(1000));
    try std.testing.expectEqualStrings("{\"hello\":{\"version\":2}}", hello_frame[4..]);
    const sv = parse("{\"type\":\"service\",\"id\":\"12:3\",\"service\":\"deduplication\",\"op\":\"getProcessedDataCount\",\"args\":{}}");
    try std.testing.expectEqualStrings("12:3", sv.service);
    try std.testing.expectEqual(Control.none, parse("{\"type\":\"other\",\"id\":\"12:3\"}"));
    try std.testing.expectEqual(Control.none, parse("{\"type\":\"service\",\"id\":\"\"}"));
}

test "worker_lost frames" {
    try std.testing.expectEqualStrings("it ran out of memory", parse("{\"worker_lost\":{\"reason\":\"it ran out of memory\"}}").worker_lost);
    // A reason with escapes, or a long one, gives the message without a reason.
    try std.testing.expectEqualStrings("", parse("{\"worker_lost\":{\"reason\":\"a \\\"b\\\"\"}}").worker_lost);
    try std.testing.expectEqualStrings("", parse("{\"worker_lost\":{}}").worker_lost);
    const xs: [max_reason + 1]u8 = @splat('x');
    var long_buf: [max_reason + 64]u8 = undefined;
    const long = try std.fmt.bufPrint(&long_buf, "{{\"worker_lost\":{{\"reason\":\"{s}\"}}}}", .{&xs});
    try std.testing.expectEqualStrings("", parse(long).worker_lost);
    // A reason of exactly `max_reason` bytes is kept.
    const fit = try std.fmt.bufPrint(&long_buf, "{{\"worker_lost\":{{\"reason\":\"{s}\"}}}}", .{xs[0..max_reason]});
    try std.testing.expectEqual(@as(usize, max_reason), parse(fit).worker_lost.len);
    try std.testing.expectEqual(Control.none, parse("{\"worker_lost\":1}"));
    // A step result that contains the word is a step result.
    try std.testing.expectEqual(Control.none, parse("{\"id\":\"1:0\",\"ok\":true,\"result\":[{\"worker_lost\":{}}]}"));
    var buf: [max_stopped_msg]u8 = undefined;
    try std.testing.expectEqualStrings("The step stopped its host worker: it stopped (SIGKILL)", stoppedMessage(&buf, "it stopped (SIGKILL)"));
}

test "service result frames" {
    var mem: [256]u8 = undefined;
    var w: std.ArrayList(u8) = .initBuffer(&mem);
    try appendServiceResult(&w, 12, 3, 1, true, "{\"new\":[1]}");
    try std.testing.expectEqualStrings("{\"type\":\"serviceResult\",\"id\":\"12:3\",\"n\":1,\"ok\":true,\"result\":{\"new\":[1]}}", w.items[4..]);
    try std.testing.expectEqual(@as(u32, @intCast(w.items.len - 4)), std.mem.readInt(u32, w.items[0..4], .little));
    w.clearRetainingCapacity();
    try appendServiceResult(&w, 1, 2, 2, false, "\"boom\"");
    try std.testing.expectEqualStrings("{\"type\":\"serviceResult\",\"id\":\"1:2\",\"n\":2,\"ok\":false,\"error\":\"boom\"}", w.items[4..]);
    // A buffer that is too small is a limit.
    var small: [16]u8 = undefined;
    var ws: std.ArrayList(u8) = .initBuffer(&small);
    try std.testing.expectError(error.OutOfMemory, appendServiceResult(&ws, 1, 2, 1, true, "null"));
}
