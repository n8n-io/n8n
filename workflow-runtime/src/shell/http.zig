//! HTTP/1.1 heads and bodies, URLs, query strings and chunked decoding.
//! Pure functions over byte slices. Inbound requests use Content-Length
//! only; outbound responses also use chunked and close-delimited bodies.
const std = @import("std");
const core_lib = @import("core");
const Builder = core_lib.arena.Builder;
const Out = @import("creds.zig").Out;

pub const Request = struct {
    method: []const u8,
    target: []const u8,
    body: []const u8,
    keep_alive: bool,
    /// Bytes this request used in the buffer.
    consumed: usize,
    /// The header lines, without the request line.
    head: []const u8 = "",
};

pub const ParseError = error{ BadRequest, TooLarge };

/// Parse one request from the front of `buf`. Null means "need more bytes".
/// One pass: each line end is found with a vector search for '\n' (a CRLF
/// ends a line; a bare LF does not), header names are matched by length
/// first, and the body starts after the empty line that ends the head.
pub fn parseRequest(buf: []const u8, max_body: usize) ParseError!?Request {
    var line_end: usize = 0; // End of the request line (index of its CR).
    var have_line = false;
    var head_end: ?usize = null; // Index of the "\r\n\r\n" that ends the head.
    var content_len: usize = 0;
    var keep_alive = false;
    var conn_close = false;
    var conn_keep = false;
    // A bad header fails the request once the head is complete, as before.
    var bad = false;
    var pos: usize = 0; // Start of the current line.
    var from: usize = 0; // Where to look for the next LF.
    var guard: usize = 0;
    while (guard <= buf.len) : (guard += 1) {
        const lf = std.mem.indexOfScalarPos(u8, buf, from, '\n') orelse break;
        from = lf + 1;
        if (lf == 0 or buf[lf - 1] != '\r') continue; // A bare LF is part of the line.
        const line = buf[pos .. lf - 1];
        const next = lf + 1;
        if (!have_line) {
            have_line = true;
            line_end = lf - 1;
        } else if (line.len == 0) {
            head_end = pos - 2;
            break;
        } else if (!bad) {
            headerField(line, &content_len, &conn_close, &conn_keep) catch {
                bad = true;
            };
        }
        pos = next;
    }
    const he = head_end orelse {
        if (buf.len > 16 << 10) return error.TooLarge;
        return null;
    };
    const line = buf[0..line_end];
    const sp1 = std.mem.indexOfScalar(u8, line, ' ') orelse return error.BadRequest;
    const sp2 = std.mem.lastIndexOfScalar(u8, line, ' ') orelse return error.BadRequest;
    // A method and a target, both not empty (found by fuzzing).
    if (sp1 == 0 or sp2 <= sp1 + 1) return error.BadRequest;
    if (bad) return error.BadRequest;
    keep_alive = line.len >= 8 and std.mem.eql(u8, line[line.len - 8 ..], "HTTP/1.1");
    // As before: a later Connection header wins over an earlier one.
    if (conn_close) keep_alive = false;
    if (conn_keep) keep_alive = true;
    if (content_len > max_body) return error.TooLarge;
    const total = he + 4 + content_len;
    if (buf.len < total) return null;
    const head = buf[0..he];
    return .{
        .method = line[0..sp1],
        .target = line[sp1 + 1 .. sp2],
        .body = buf[he + 4 .. total],
        .keep_alive = keep_alive,
        .consumed = total,
        .head = head[@min(head.len, line_end + 2)..],
    };
}

/// One header line of a request: only Content-Length, Connection and
/// Transfer-Encoding matter, so the name length decides first.
fn headerField(h: []const u8, content_len: *usize, conn_close: *bool, conn_keep: *bool) ParseError!void {
    const colon = std.mem.indexOfScalar(u8, h, ':') orelse return;
    const name = h[0..colon];
    switch (name.len) {
        14 => if (std.ascii.eqlIgnoreCase(name, "content-length")) {
            const val = std.mem.trim(u8, h[colon + 1 ..], " \t");
            content_len.* = std.fmt.parseInt(usize, val, 10) catch return error.BadRequest;
        },
        10 => if (std.ascii.eqlIgnoreCase(name, "connection")) {
            const val = std.mem.trim(u8, h[colon + 1 ..], " \t");
            if (std.ascii.eqlIgnoreCase(val, "close")) {
                conn_close.* = true;
                conn_keep.* = false;
            }
            if (std.ascii.eqlIgnoreCase(val, "keep-alive")) {
                conn_keep.* = true;
                conn_close.* = false;
            }
        },
        17 => if (std.ascii.eqlIgnoreCase(name, "transfer-encoding")) return error.BadRequest,
        else => {},
    }
}

/// The Content-Length of a request head, or null.
pub fn contentLength(head: []const u8) ?usize {
    var it = std.mem.splitSequence(u8, head, "\r\n");
    while (it.next()) |h| {
        const colon = std.mem.indexOfScalar(u8, h, ':') orelse continue;
        if (!std.ascii.eqlIgnoreCase(std.mem.trim(u8, h[0..colon], " \t"), "content-length")) continue;
        return std.fmt.parseInt(usize, std.mem.trim(u8, h[colon + 1 ..], " \t"), 10) catch null;
    }
    return null;
}

pub fn reason(status: u32) []const u8 {
    return switch (status) {
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        204 => "No Content",
        400 => "Bad Request",
        402 => "Payment Required",
        404 => "Not Found",
        409 => "Conflict",
        413 => "Payload Too Large",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        503 => "Service Unavailable",
        else => "Status",
    };
}

/// Write a JSON response into `out`. Returns the bytes used, or null when
/// `out` is too small.
pub fn writeResponse(out: []u8, status: u32, body: []const u8) ?usize {
    return writeResponseTyped(out, status, "application/json", "", body);
}

/// A response with the given content type and extra header lines (each
/// ending in CRLF, checked by `userHeaders`). The type has no CR or LF.
pub fn writeResponseTyped(out: []u8, status: u32, content_type: []const u8, extra: []const u8, body: []const u8) ?usize {
    std.debug.assert(std.mem.indexOfAny(u8, content_type, "\r\n") == null);
    const head = std.fmt.bufPrint(out, "HTTP/1.1 {d} {s}\r\ncontent-type: {s}\r\n{s}content-length: {d}\r\n\r\n", .{ status, reason(status), content_type, extra, body.len }) catch return null;
    if (head.len + body.len > out.len) return null;
    @memcpy(out[head.len..][0..body.len], body);
    return head.len + body.len;
}

pub const UserHeaders = struct {
    /// `name: value\r\n` lines, in the order given.
    lines: []u8,
    /// The content type the user gave, if any. It replaces the default.
    content_type: ?[]u8 = null,
    dropped: u32 = 0,

    pub fn deinit(h: *UserHeaders, gpa: std.mem.Allocator) void {
        gpa.free(h.lines);
        if (h.content_type) |c| gpa.free(c);
    }
};

/// The `headers` of a `ctx.respond` call as response header lines. A name
/// must be an HTTP token; a value is a string, number or boolean with no
/// CR, LF or NUL. `content-length` and `transfer-encoding` are never taken,
/// because the runtime frames the body. Other headers are dropped and
/// counted. `content-type` comes back on its own: it replaces the default.
pub fn userHeaders(gpa: std.mem.Allocator, raw: []const u8) !UserHeaders {
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    var out: UserHeaders = .{ .lines = &.{} };
    var lines: std.ArrayList(u8) = .empty;
    errdefer lines.deinit(gpa);
    const root = std.json.parseFromSliceLeaky(std.json.Value, arena.allocator(), raw, .{ .parse_numbers = false }) catch {
        out.dropped = 1;
        out.lines = try lines.toOwnedSlice(gpa);
        return out;
    };
    if (root != .object) {
        out.dropped = 1;
        out.lines = try lines.toOwnedSlice(gpa);
        return out;
    }
    var it = root.object.iterator();
    while (it.next()) |kv| {
        const name = kv.key_ptr.*;
        const value: ?[]const u8 = switch (kv.value_ptr.*) {
            .string => |v| v,
            .number_string => |v| v,
            .bool => |v| if (v) "true" else "false",
            else => null,
        };
        const ok_name = name.len > 0 and name.len <= 256 and for (name) |c| {
            if (!isTokenChar(c)) break false;
        } else true;
        const v = value orelse {
            out.dropped += 1;
            continue;
        };
        if (!ok_name or v.len > 8192 or std.mem.indexOfAny(u8, v, "\r\n\x00") != null or
            std.ascii.eqlIgnoreCase(name, "content-length") or std.ascii.eqlIgnoreCase(name, "transfer-encoding"))
        {
            out.dropped += 1;
            continue;
        }
        if (std.ascii.eqlIgnoreCase(name, "content-type")) {
            if (out.content_type) |old| gpa.free(old);
            out.content_type = try gpa.dupe(u8, std.mem.trim(u8, v, " \t"));
            continue;
        }
        try lines.print(gpa, "{s}: {s}\r\n", .{ name, std.mem.trim(u8, v, " \t") });
    }
    out.lines = try lines.toOwnedSlice(gpa);
    return out;
}

fn isTokenChar(c: u8) bool {
    return std.ascii.isAlphanumeric(c) or std.mem.indexOfScalar(u8, "!#$%&'*+-.^_`|~", c) != null;
}

test "respond headers" {
    const gpa = std.testing.allocator;
    var h = try userHeaders(gpa, "{\"Cache-Control\":\"no-store\",\"Content-Type\":\"text/html; charset=utf-8\",\"x-n\":5,\"Content-Length\":\"1\",\"transfer-encoding\":\"chunked\",\"x-bad\":\"a\\r\\nset-cookie: x\",\"bad name\":\"v\",\"x-obj\":{}}");
    defer h.deinit(gpa);
    try std.testing.expectEqualStrings("Cache-Control: no-store\r\nx-n: 5\r\n", h.lines);
    try std.testing.expectEqualStrings("text/html; charset=utf-8", h.content_type.?);
    try std.testing.expectEqual(@as(u32, 5), h.dropped);
    var out: [256]u8 = undefined;
    const n = writeResponseTyped(&out, 200, h.content_type.?, h.lines, "<p>").?;
    try std.testing.expectEqualStrings("HTTP/1.1 200 OK\r\ncontent-type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nx-n: 5\r\ncontent-length: 3\r\n\r\n<p>", out[0..n]);
    var bad = try userHeaders(gpa, "[1]");
    defer bad.deinit(gpa);
    try std.testing.expectEqual(@as(u32, 1), bad.dropped);
}

pub const Response = struct {
    status: u32,
    body: []const u8,
    json: bool,
    consumed: usize,
};

/// Parse one response from the front of `buf`. Null means "need more".
pub fn parseResponse(buf: []const u8) ParseError!?Response {
    const head_end = std.mem.indexOf(u8, buf, "\r\n\r\n") orelse return null;
    const head = buf[0..head_end];
    if (!std.mem.startsWith(u8, head, "HTTP/1.")) return error.BadRequest;
    if (head.len < 12) return error.BadRequest;
    const status = std.fmt.parseInt(u32, head[9..12], 10) catch return error.BadRequest;
    var content_len: usize = 0;
    var json = false;
    var it = std.mem.splitSequence(u8, head, "\r\n");
    _ = it.next();
    while (it.next()) |h| {
        const colon = std.mem.indexOfScalar(u8, h, ':') orelse continue;
        const name = h[0..colon];
        const val = std.mem.trim(u8, h[colon + 1 ..], " \t");
        if (std.ascii.eqlIgnoreCase(name, "content-length")) content_len = std.fmt.parseInt(usize, val, 10) catch return error.BadRequest;
        if (std.ascii.eqlIgnoreCase(name, "content-type")) json = std.mem.indexOf(u8, val, "json") != null;
    }
    const total = head_end + 4 + content_len;
    if (buf.len < total) return null;
    return .{ .status = status, .body = buf[head_end + 4 .. total], .json = json, .consumed = total };
}

// ---- reading the args the core sends -----------------------------------

/// Return the raw JSON text of a top-level member of an object, or null.
/// The core writes the args, so this scanner can be small: it skips
/// strings and nesting and does not validate. Other text (host frames,
/// admin bodies) can be malformed: the scanner then gives null or a slice
/// inside `obj`, never a crash. White space around the value is dropped.
pub fn member(obj: []const u8, name: []const u8) ?[]const u8 {
    var i = (std.mem.indexOfScalar(u8, obj, '{') orelse return null) + 1;
    while (i < obj.len) {
        while (i < obj.len and (obj[i] == ',' or isJsonSpace(obj[i]))) i += 1;
        if (i >= obj.len or obj[i] != '"') return null;
        const key_start = i + 1;
        i = stringEnd(obj, i) orelse return null;
        const key = obj[key_start .. i - 1];
        while (i < obj.len and obj[i] != ':') i += 1;
        if (i >= obj.len) return null;
        i += 1;
        while (i < obj.len and isJsonSpace(obj[i])) i += 1;
        const v_start = i;
        i = skipValue(obj, i);
        std.debug.assert(v_start <= i and i <= obj.len);
        if (std.mem.eql(u8, key, name)) return std.mem.trimEnd(u8, obj[v_start..i], " \t\r\n");
    }
    return null;
}

fn isJsonSpace(c: u8) bool {
    return c == ' ' or c == '\t' or c == '\n' or c == '\r';
}

/// The index after the closing quote of the string at `start`, or null
/// when the string does not end.
fn stringEnd(s: []const u8, start: usize) ?usize {
    std.debug.assert(start < s.len and s[start] == '"');
    var i = start + 1;
    while (i < s.len) : (i += 1) {
        if (s[i] == '\\') {
            i += 1;
            continue;
        }
        if (s[i] == '"') return i + 1;
    }
    return null;
}

fn skipString(s: []const u8, start: usize) usize {
    return stringEnd(s, start) orelse s.len;
}

fn skipValue(s: []const u8, start: usize) usize {
    var i = start;
    var depth: usize = 0;
    while (i < s.len) {
        const ch = s[i];
        if (ch == '"') {
            i = skipString(s, i);
            if (depth == 0) return i;
            continue;
        }
        if (ch == '{' or ch == '[') depth += 1;
        if (ch == '}' or ch == ']') {
            if (depth == 0) return i;
            depth -= 1;
            if (depth == 0) return i + 1;
        }
        if (depth == 0 and ch == ',') return i;
        i += 1;
    }
    return @min(i, s.len);
}

/// The contents of a JSON string literal without escapes, else null.
pub fn plainString(raw: []const u8) ?[]const u8 {
    if (raw.len < 2 or raw[0] != '"' or raw[raw.len - 1] != '"') return null;
    const inner = raw[1 .. raw.len - 1];
    if (std.mem.indexOfScalar(u8, inner, '\\') != null) return null;
    return inner;
}

test "parse a keep-alive request" {
    const raw = "POST /orders HTTP/1.1\r\nHost: x\r\nContent-Length: 7\r\n\r\n{\"a\":1}GET";
    const r = (try parseRequest(raw, 1024)).?;
    try std.testing.expectEqualStrings("POST", r.method);
    try std.testing.expectEqualStrings("/orders", r.target);
    try std.testing.expectEqualStrings("{\"a\":1}", r.body);
    try std.testing.expect(r.keep_alive);
    try std.testing.expect((try parseRequest(raw[r.consumed..], 1024)) == null);
}

test "member scanner" {
    const args = "{\"name\":\"Call\",\"method\":\"GET\",\"headers\":{\"a\":\"b,c\"},\"body\":[1,{\"x\":\"}\"}],\"url\":\"http://127.0.0.1:9/x\"}";
    try std.testing.expectEqualStrings("\"GET\"", member(args, "method").?);
    try std.testing.expectEqualStrings("{\"a\":\"b,c\"}", member(args, "headers").?);
    try std.testing.expectEqualStrings("[1,{\"x\":\"}\"}]", member(args, "body").?);
    const u = try parseUrl(plainString(member(args, "url").?).?);
    try std.testing.expectEqual(@as(u16, 9), u.port);
    try std.testing.expectEqualStrings("/x", u.target);
    var it = Members.init(member(args, "headers").?).?;
    const m = it.next().?;
    try std.testing.expectEqualStrings("\"a\"", m.key);
    try std.testing.expectEqualStrings("\"b,c\"", m.value);
    try std.testing.expect(it.next() == null);
    var el = Elements.init("[1, \"a,b\" ,{\"x\":[2]}]").?;
    try std.testing.expectEqualStrings("1", el.next().?);
    try std.testing.expectEqualStrings("\"a,b\"", el.next().?);
    try std.testing.expectEqualStrings("{\"x\":[2]}", el.next().?);
    try std.testing.expect(el.next() == null);
}

// ---- JSON members and elements ---------------------------------------------

fn isWs(c: u8) bool {
    return c == ' ' or c == '\n' or c == '\r' or c == '\t';
}

/// The members of a raw JSON object, in order. Keys stay raw (quoted).
pub const Members = struct {
    s: []const u8,
    i: usize,

    pub const Member = struct { key: []const u8, value: []const u8 };

    /// Null if `raw` is not an object.
    pub fn init(raw: []const u8) ?Members {
        const t = std.mem.trim(u8, raw, " \t\r\n");
        if (t.len < 2 or t[0] != '{' or t[t.len - 1] != '}') return null;
        return .{ .s = t[0 .. t.len - 1], .i = 1 };
    }

    pub fn next(m: *Members) ?Member {
        while (m.i < m.s.len and (isWs(m.s[m.i]) or m.s[m.i] == ',')) m.i += 1;
        if (m.i >= m.s.len or m.s[m.i] != '"') return null;
        const k0 = m.i;
        m.i = skipString(m.s, m.i);
        const key = m.s[k0..m.i];
        while (m.i < m.s.len and m.s[m.i] != ':') m.i += 1;
        if (m.i >= m.s.len) return null;
        m.i += 1;
        while (m.i < m.s.len and isWs(m.s[m.i])) m.i += 1;
        const v0 = m.i;
        m.i = skipValue(m.s, m.i);
        return .{ .key = key, .value = std.mem.trim(u8, m.s[v0..@min(m.i, m.s.len)], " \t\r\n") };
    }
};

/// The elements of a raw JSON array, in order.
pub const Elements = struct {
    s: []const u8,
    i: usize,

    pub fn init(raw: []const u8) ?Elements {
        const t = std.mem.trim(u8, raw, " \t\r\n");
        if (t.len < 2 or t[0] != '[' or t[t.len - 1] != ']') return null;
        return .{ .s = t[0 .. t.len - 1], .i = 1 };
    }

    pub fn next(e: *Elements) ?[]const u8 {
        while (e.i < e.s.len and (isWs(e.s[e.i]) or e.s[e.i] == ',')) e.i += 1;
        if (e.i >= e.s.len) return null;
        const v0 = e.i;
        e.i = skipValue(e.s, e.i);
        // A stray `}` or `]` ends no value: step over it, so the loop moves.
        if (e.i == v0) e.i += 1;
        return std.mem.trim(u8, e.s[v0..@min(e.i, e.s.len)], " \t\r\n");
    }
};

/// Decode a raw JSON string literal (with quotes) into `out`. Lone
/// surrogates become WTF-8, as the core stores them.
pub fn unescape(raw: []const u8, out: *Out) error{ NoSpace, BadString }!void {
    if (raw.len < 2 or raw[0] != '"' or raw[raw.len - 1] != '"') return error.BadString;
    const s = raw[1 .. raw.len - 1];
    var i: usize = 0;
    while (i < s.len) {
        const esc = std.mem.indexOfScalarPos(u8, s, i, '\\') orelse {
            try out.put(s[i..]);
            return;
        };
        try out.put(s[i..esc]);
        if (esc + 1 >= s.len) return error.BadString;
        const c = s[esc + 1];
        i = esc + 2;
        switch (c) {
            '"', '\\', '/' => try out.byte(c),
            'b' => try out.byte(0x08),
            'f' => try out.byte(0x0c),
            'n' => try out.byte('\n'),
            'r' => try out.byte('\r'),
            't' => try out.byte('\t'),
            'u' => {
                if (i + 4 > s.len) return error.BadString;
                var cp: u21 = std.fmt.parseInt(u16, s[i..][0..4], 16) catch return error.BadString;
                i += 4;
                if (cp >= 0xD800 and cp < 0xDC00 and i + 6 <= s.len and s[i] == '\\' and s[i + 1] == 'u') {
                    const lo = std.fmt.parseInt(u16, s[i + 2 ..][0..4], 16) catch return error.BadString;
                    if (lo >= 0xDC00 and lo < 0xE000) {
                        cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
                        i += 6;
                    }
                }
                var enc: [4]u8 = undefined;
                const n = if (cp >= 0xD800 and cp < 0xE000) blk: {
                    // WTF-8 for a lone surrogate.
                    enc[0] = 0xED;
                    enc[1] = @intCast(0x80 | ((cp >> 6) & 0x3F));
                    enc[2] = @intCast(0x80 | (cp & 0x3F));
                    break :blk @as(usize, 3);
                } else std.unicode.utf8Encode(cp, &enc) catch return error.BadString;
                try out.put(enc[0..n]);
            },
            else => return error.BadString,
        }
    }
}

// ---- URLs ---------------------------------------------------------------------

pub const Url = struct {
    https: bool,
    /// Without brackets for IPv6.
    host: []const u8,
    ip6: bool,
    port: u16,
    explicit_port: bool,
    /// Path and query; can be empty or start with '?'. No fragment.
    target: []const u8,
};

pub const UrlError = error{ BadUrl, BadScheme, Userinfo };

pub fn parseUrl(url: []const u8) UrlError!Url {
    var https = false;
    var rest: []const u8 = undefined;
    if (url.len > 8 and std.ascii.eqlIgnoreCase(url[0..8], "https://")) {
        https = true;
        rest = url[8..];
    } else if (url.len > 7 and std.ascii.eqlIgnoreCase(url[0..7], "http://")) {
        rest = url[7..];
    } else if (std.mem.indexOf(u8, url, "://") != null) {
        return error.BadScheme;
    } else return error.BadUrl;
    const auth_end = std.mem.indexOfAny(u8, rest, "/?#") orelse rest.len;
    const auth = rest[0..auth_end];
    if (std.mem.indexOfScalar(u8, auth, '@') != null) return error.Userinfo;
    var host: []const u8 = auth;
    var port_s: ?[]const u8 = null;
    var ip6 = false;
    if (auth.len > 0 and auth[0] == '[') {
        const close = std.mem.indexOfScalar(u8, auth, ']') orelse return error.BadUrl;
        host = auth[1..close];
        ip6 = true;
        if (close + 1 < auth.len) {
            if (auth[close + 1] != ':') return error.BadUrl;
            port_s = auth[close + 2 ..];
        }
    } else if (std.mem.lastIndexOfScalar(u8, auth, ':')) |ci| {
        host = auth[0..ci];
        port_s = auth[ci + 1 ..];
    }
    if (host.len == 0 or host.len > 253) return error.BadUrl;
    for (host) |c| if (c <= ' ' or c >= 0x7f or c == '/' or c == '\\' or c == '%') return error.BadUrl;
    var port: u16 = if (https) 443 else 80;
    var explicit = false;
    if (port_s) |p| if (p.len > 0) {
        port = std.fmt.parseInt(u16, p, 10) catch return error.BadUrl;
        if (port == 0) return error.BadUrl;
        explicit = true;
    };
    var target = rest[auth_end..];
    if (std.mem.indexOfScalar(u8, target, '#')) |h| target = target[0..h];
    return .{ .https = https, .host = host, .ip6 = ip6, .port = port, .explicit_port = explicit, .target = target };
}

/// "http://host:port" as it appears in a URL, the port only if given.
pub fn writeOrigin(out: *Out, u: Url) Out.Error!void {
    try out.put(if (u.https) "https://" else "http://");
    try writeHostHeader(out, u);
}

/// The Host header value: the host, and the port if it is not the default.
pub fn writeHostHeader(out: *Out, u: Url) Out.Error!void {
    if (u.ip6) try out.byte('[');
    try out.put(u.host);
    if (u.ip6) try out.byte(']');
    const default: u16 = if (u.https) 443 else 80;
    if (u.port != default) {
        var b: [8]u8 = undefined;
        try out.put(std.fmt.bufPrint(&b, ":{d}", .{u.port}) catch unreachable);
    }
}

/// The request target: "/" first if the path is empty, and bytes that
/// may not appear in a request line percent-encoded.
pub fn writeTarget(out: *Out, target: []const u8) Out.Error!void {
    if (target.len == 0 or target[0] != '/') try out.byte('/');
    var start: usize = 0;
    for (target, 0..) |c, i| {
        if (c > ' ' and c < 0x7f and c != '"' and c != '<' and c != '>' and c != '`' and c != '{' and c != '}' and c != '|' and c != '\\' and c != '^') continue;
        try out.put(target[start..i]);
        try percent(out, c);
        start = i + 1;
    }
    try out.put(target[start..]);
}

fn percent(out: *Out, c: u8) Out.Error!void {
    const hex = "0123456789ABCDEF";
    try out.put(&[3]u8{ '%', hex[c >> 4], hex[c & 15] });
}

/// encodeURIComponent, as Node.js `querystring.escape` does it.
pub fn writeQueryComponent(out: *Out, s: []const u8) Out.Error!void {
    var start: usize = 0;
    for (s, 0..) |c, i| {
        if (std.ascii.isAlphanumeric(c)) continue;
        switch (c) {
            '-', '_', '.', '!', '~', '*', '\'', '(', ')' => continue,
            else => {},
        }
        try out.put(s[start..i]);
        try percent(out, c);
        start = i + 1;
    }
    try out.put(s[start..]);
}

/// Write the URL a redirect points to. `loc` is the Location header.
pub fn resolveLocation(out: *Out, base: Url, loc: []const u8) Out.Error!void {
    const l = std.mem.trim(u8, loc, " \t");
    if ((l.len > 7 and std.ascii.eqlIgnoreCase(l[0..7], "http://")) or (l.len > 8 and std.ascii.eqlIgnoreCase(l[0..8], "https://"))) {
        return out.put(l);
    }
    if (std.mem.startsWith(u8, l, "//")) {
        try out.put(if (base.https) "https:" else "http:");
        return out.put(l);
    }
    try writeOrigin(out, base);
    if (l.len > 0 and l[0] == '/') return out.put(l);
    // Relative to the directory of the base path.
    const path_end = std.mem.indexOfScalar(u8, base.target, '?') orelse base.target.len;
    const path = base.target[0..path_end];
    const dir_end = if (std.mem.lastIndexOfScalar(u8, path, '/')) |i| i + 1 else 0;
    if (dir_end == 0) try out.byte('/');
    try out.put(path[0..dir_end]);
    try out.put(l);
}

// ---- outbound responses ---------------------------------------------------

pub const Head = struct {
    status: u32,
    /// Bytes of the head, with the blank line.
    len: usize,
    /// The header lines after the status line, separated by CRLF.
    lines: []const u8,
    content_length: ?u64,
    chunked: bool,
    /// The server closes the connection after this response.
    close: bool,
    json: bool,
    location: ?[]const u8,
};

/// Parse a response head from the front of `buf`. Null means "need more".
pub fn parseHead(buf: []const u8) ParseError!?Head {
    const head_end = std.mem.indexOf(u8, buf, "\r\n\r\n") orelse return null;
    const head = buf[0..head_end];
    if (head.len < 12 or !std.mem.startsWith(u8, head, "HTTP/1.")) return error.BadRequest;
    const status = std.fmt.parseInt(u32, head[9..12], 10) catch return error.BadRequest;
    if (status < 100 or status > 999) return error.BadRequest;
    const line_end = std.mem.indexOf(u8, head, "\r\n") orelse head.len;
    var h: Head = .{
        .status = status,
        .len = head_end + 4,
        .lines = if (line_end + 2 <= head.len) head[line_end + 2 ..] else "",
        .content_length = null,
        .chunked = false,
        .close = head[7] == '0',
        .json = false,
        .location = null,
    };
    var ct_seen = false;
    var it = std.mem.splitSequence(u8, h.lines, "\r\n");
    while (it.next()) |line| {
        const colon = std.mem.indexOfScalar(u8, line, ':') orelse continue;
        const name = std.mem.trim(u8, line[0..colon], " \t");
        const val = std.mem.trim(u8, line[colon + 1 ..], " \t");
        if (std.ascii.eqlIgnoreCase(name, "content-length")) {
            const n = std.fmt.parseInt(u64, val, 10) catch return error.BadRequest;
            if (h.content_length != null and h.content_length.? != n) return error.BadRequest;
            h.content_length = n;
        } else if (std.ascii.eqlIgnoreCase(name, "transfer-encoding")) {
            if (containsIgnoreCase(val, "chunked")) h.chunked = true;
        } else if (std.ascii.eqlIgnoreCase(name, "connection")) {
            if (containsIgnoreCase(val, "close")) h.close = true;
            if (containsIgnoreCase(val, "keep-alive")) h.close = false;
        } else if (std.ascii.eqlIgnoreCase(name, "content-type") and !ct_seen) {
            // The first value counts, as in Node.js.
            ct_seen = true;
            h.json = containsIgnoreCase(val, "json");
        } else if (std.ascii.eqlIgnoreCase(name, "location")) {
            h.location = val;
        }
    }
    // Chunked wins over Content-Length (RFC 9112 6.3).
    if (h.chunked) h.content_length = null;
    return h;
}

fn containsIgnoreCase(hay: []const u8, needle: []const u8) bool {
    if (needle.len > hay.len) return false;
    var i: usize = 0;
    while (i + needle.len <= hay.len) : (i += 1) {
        if (std.ascii.eqlIgnoreCase(hay[i..][0..needle.len], needle)) return true;
    }
    return false;
}

/// Node.js drops repeats of these headers and keeps the first value.
const single_headers = [_][]const u8{
    "age",                 "authorization", "content-length", "content-type", "etag",                "expires", "from",        "host",   "if-modified-since",
    "if-unmodified-since", "last-modified", "location",       "max-forwards", "proxy-authorization", "referer", "retry-after", "server", "user-agent",
};

const single_map = blk: {
    var kvs: [single_headers.len]struct { []const u8 } = undefined;
    for (single_headers, 0..) |h, i| kvs[i] = .{h};
    const final = kvs;
    break :blk std.StaticStringMapWithEql(void, std.static_string_map.eqlAsciiIgnoreCase).initComptime(final);
};

fn isSingle(name: []const u8) bool {
    return single_map.has(name);
}

const HeaderLine = struct { name: []const u8, value: []const u8 };

fn headerLine(line: []const u8) ?HeaderLine {
    const colon = std.mem.indexOfScalar(u8, line, ':') orelse return null;
    const name = std.mem.trim(u8, line[0..colon], " \t");
    if (name.len == 0) return null;
    return .{ .name = name, .value = std.mem.trim(u8, line[colon + 1 ..], " \t") };
}

/// The header lines as a JSON object, as Node.js `res.headers` shows
/// them: lower-case names; `set-cookie` is an array; repeats of other
/// headers join with ", ", except the ones Node.js keeps once.
pub fn writeHeadersJson(b: *Builder, lines: []const u8) error{ArenaFull}!void {
    // The table is declared with runtime safety off: safe builds would fill
    // its 8 KB on every response, and it is written before it is read.
    @setRuntimeSafety(false);
    var hs: [max_header_lines]HeaderLine = undefined;
    var done: [max_header_lines]bool = undefined;
    return writeHeadersJsonWith(b, lines, &hs, &done);
}

const max_header_lines = 256;

fn writeHeadersJsonWith(b: *Builder, lines: []const u8, hs: *[max_header_lines]HeaderLine, done: *[max_header_lines]bool) error{ArenaFull}!void {
    // Split the lines once: each byte is looked at once to find CRLF.
    var n: usize = 0;
    var pos: usize = 0;
    var guard: usize = 0;
    while (pos < lines.len and guard <= lines.len) : (guard += 1) {
        const end = std.mem.indexOfScalarPos(u8, lines, pos, '\n') orelse lines.len;
        const line_end = if (end > pos and lines[end - 1] == '\r') end - 1 else end;
        const line = lines[pos..line_end];
        pos = end + 1;
        const h = headerLine(line) orelse continue;
        if (n == max_header_lines) break; // Responses with more header lines lose the rest.
        hs[n] = h;
        done[n] = false;
        n += 1;
    }
    try b.byte('{');
    var first = true;
    for (hs[0..n], 0..) |h, i| {
        if (done[i]) continue;
        if (!first) try b.byte(',');
        first = false;
        try b.byte('"');
        try appendLower(b, h.name);
        try b.append("\":");
        const cookie = std.ascii.eqlIgnoreCase(h.name, "set-cookie");
        const single = isSingle(h.name);
        if (cookie) try b.byte('[');
        try writeJsonStringPart(b, h.value, true, true);
        for (hs[i + 1 .. n], i + 1..) |l, j| {
            if (done[j] or l.name.len != h.name.len or !std.ascii.eqlIgnoreCase(l.name, h.name)) continue;
            done[j] = true;
            if (single) continue;
            if (cookie) {
                try b.byte(',');
                try writeJsonStringPart(b, l.value, true, true);
            } else {
                // Reopen the string: drop the closing quote, add ", ".
                b.len -= 1;
                try b.append(", ");
                try writeJsonStringPart(b, l.value, false, true);
            }
        }
        if (cookie) try b.byte(']');
    }
    try b.byte('}');
}

/// A header name in lower case: one append when it already is (HTTP/2
/// names always are).
fn appendLower(b: *Builder, name: []const u8) error{ArenaFull}!void {
    for (name) |c| {
        if (std.ascii.isUpper(c)) break;
    } else return b.append(name);
    for (name) |c| try b.byte(std.ascii.toLower(c));
}

/// Bytes that go into a JSON string as they are.
fn plainJson(s: []const u8) bool {
    for (s) |c| {
        if (c < 0x20 or c >= 0x7f or c == '"' or c == '\\') return false;
    }
    return true;
}

fn writeJsonStringPart(b: *Builder, s: []const u8, open: bool, close: bool) error{ArenaFull}!void {
    // Most header values need no escape: append them as they are.
    if (plainJson(s)) {
        if (open) try b.byte('"');
        try b.append(s);
        if (close) try b.byte('"');
        return;
    }
    var tmp_arena = core_lib.arena.Arena.init(b.arena.buf[b.start + b.len ..]);
    var tb = tmp_arena.builder();
    core_lib.json.writeString(&tb, s) catch return error.ArenaFull;
    const w = tb.bytes();
    // writeString wrote the quotes; keep or drop them in place.
    const from: usize = if (open) 0 else 1;
    const to: usize = if (close) w.len else w.len - 1;
    std.mem.copyForwards(u8, b.arena.buf[b.start + b.len ..][0 .. to - from], w[from..to]);
    b.len += to - from;
}

/// In-place decoder for a chunked body. Decoded bytes are never longer
/// than the raw bytes, so the payload moves down inside the same buffer.
pub const Chunked = struct {
    state: State = .size,
    remaining: u64 = 0,
    digits: u8 = 0,

    const State = enum { size, ext, size_lf, data, data_cr, data_lf, trailer_start, trailer_line, end_lf, done };

    pub fn done(c: *const Chunked) bool {
        return c.state == .done;
    }

    /// Decode `buf[raw.*..raw_end]`, appending payload at `buf[out.*..]`.
    /// `out.* <= raw.*` holds before and after. Extra bytes after the last
    /// chunk stay unread at `raw.*`.
    pub fn feed(c: *Chunked, buf: []u8, out: *usize, raw: *usize, raw_end: usize) error{BadChunk}!void {
        std.debug.assert(out.* <= raw.* and raw.* <= raw_end and raw_end <= buf.len);
        while (raw.* < raw_end and c.state != .done) {
            if (c.state == .data) {
                const n: usize = @intCast(@min(c.remaining, raw_end - raw.*));
                std.mem.copyForwards(u8, buf[out.*..][0..n], buf[raw.*..][0..n]);
                out.* += n;
                raw.* += n;
                c.remaining -= n;
                if (c.remaining == 0) c.state = .data_cr;
                continue;
            }
            const ch = buf[raw.*];
            raw.* += 1;
            switch (c.state) {
                .size => {
                    if (std.fmt.charToDigit(ch, 16)) |d| {
                        c.digits += 1;
                        if (c.digits > 15) return error.BadChunk;
                        c.remaining = c.remaining * 16 + d;
                    } else |_| switch (ch) {
                        ';', ' ', '\t' => c.state = .ext,
                        '\r' => c.state = .size_lf,
                        '\n' => c.afterSize(),
                        else => return error.BadChunk,
                    }
                    if ((c.state != .size) and c.digits == 0) return error.BadChunk;
                },
                .ext => switch (ch) {
                    '\r' => c.state = .size_lf,
                    '\n' => c.afterSize(),
                    else => {},
                },
                .size_lf => if (ch == '\n') c.afterSize() else return error.BadChunk,
                .data_cr => switch (ch) {
                    '\r' => c.state = .data_lf,
                    '\n' => c.state = .size,
                    else => return error.BadChunk,
                },
                .data_lf => if (ch == '\n') {
                    c.state = .size;
                } else return error.BadChunk,
                .trailer_start => switch (ch) {
                    '\r' => c.state = .end_lf,
                    '\n' => c.state = .done,
                    else => c.state = .trailer_line,
                },
                .trailer_line => if (ch == '\n') {
                    c.state = .trailer_start;
                },
                .end_lf => if (ch == '\n') {
                    c.state = .done;
                } else return error.BadChunk,
                .data, .done => unreachable,
            }
        }
    }

    fn afterSize(c: *Chunked) void {
        c.digits = 0;
        c.state = if (c.remaining == 0) .trailer_start else .data;
    }
};

test "url parsing" {
    const u = try parseUrl("HTTPS://Example.com:8443/a/b?x=1#frag");
    try std.testing.expect(u.https);
    try std.testing.expectEqualStrings("Example.com", u.host);
    try std.testing.expectEqual(@as(u16, 8443), u.port);
    try std.testing.expectEqualStrings("/a/b?x=1", u.target);
    const v = try parseUrl("http://[::1]:9000");
    try std.testing.expect(v.ip6);
    try std.testing.expectEqualStrings("::1", v.host);
    try std.testing.expectEqualStrings("", v.target);
    const w = try parseUrl("http://h?q=1");
    try std.testing.expectEqual(@as(u16, 80), w.port);
    try std.testing.expectEqualStrings("?q=1", w.target);
    try std.testing.expectError(error.BadScheme, parseUrl("ftp://h/x"));
    try std.testing.expectError(error.BadUrl, parseUrl("example.com/x"));
    try std.testing.expectError(error.Userinfo, parseUrl("http://u:p@h/"));
    try std.testing.expectError(error.BadUrl, parseUrl("http://h:99999/"));
    var buf: [128]u8 = undefined;
    var out: Out = .{ .buf = &buf };
    try writeTarget(&out, w.target);
    try std.testing.expectEqualStrings("/?q=1", out.written());
    out = .{ .buf = &buf };
    try writeTarget(&out, "/a b/é");
    try std.testing.expectEqualStrings("/a%20b/%C3%A9", out.written());
    out = .{ .buf = &buf };
    try writeHostHeader(&out, v);
    try std.testing.expectEqualStrings("[::1]:9000", out.written());
}

test "query component encoding" {
    var buf: [128]u8 = undefined;
    var out: Out = .{ .buf = &buf };
    try writeQueryComponent(&out, "a b&c=d/é!*'()~");
    try std.testing.expectEqualStrings("a%20b%26c%3Dd%2F%C3%A9!*'()~", out.written());
}

test "redirect locations" {
    const base = try parseUrl("https://h.io:8443/a/b?x=1");
    var buf: [128]u8 = undefined;
    const cases = [_][2][]const u8{
        .{ "http://o/x", "http://o/x" },
        .{ "//cdn.io/y", "https://cdn.io/y" },
        .{ "/root", "https://h.io:8443/root" },
        .{ "c?z=2", "https://h.io:8443/a/c?z=2" },
    };
    for (cases) |cs| {
        var out: Out = .{ .buf = &buf };
        try resolveLocation(&out, base, cs[0]);
        try std.testing.expectEqualStrings(cs[1], out.written());
    }
}

test "json string unescape" {
    var buf: [64]u8 = undefined;
    var out: Out = .{ .buf = &buf };
    try unescape("\"a\\\"b\\n\\u00e9\\ud83d\\ude00\\/\"", &out);
    try std.testing.expectEqualStrings("a\"b\né\u{1F600}/", out.written());
    out = .{ .buf = &buf };
    try std.testing.expectError(error.BadString, unescape("\"\\x\"", &out));
}

test "response head and headers json" {
    const raw = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nSet-Cookie: a=1\r\nX-A: 1\r\nset-cookie: b=2\r\nx-a: 2\r\nContent-Type: text/plain\r\nTransfer-Encoding: chunked\r\nContent-Length: 5\r\n\r\nrest";
    const h = (try parseHead(raw)).?;
    try std.testing.expectEqual(@as(u32, 200), h.status);
    try std.testing.expect(h.chunked);
    try std.testing.expect(h.content_length == null);
    try std.testing.expect(h.json);
    try std.testing.expect(!h.close);
    try std.testing.expectEqualStrings("rest", raw[h.len..]);
    var mem: [512]u8 = undefined;
    var ar = core_lib.arena.Arena.init(&mem);
    var b = ar.builder();
    try writeHeadersJson(&b, h.lines);
    try std.testing.expectEqualStrings("{\"content-type\":\"application/json\",\"set-cookie\":[\"a=1\",\"b=2\"],\"x-a\":\"1, 2\",\"transfer-encoding\":\"chunked\",\"content-length\":\"5\"}", b.bytes());
    try std.testing.expect((try parseHead("HTTP/1.1 200 OK\r\n")) == null);
    try std.testing.expectError(error.BadRequest, parseHead("SMTP 220\r\n\r\n"));
    const h10 = (try parseHead("HTTP/1.0 301 Moved\r\nLocation: /x\r\n\r\n")).?;
    try std.testing.expect(h10.close);
    try std.testing.expectEqualStrings("/x", h10.location.?);
}

test "chunked decoding in place, in pieces" {
    const raw = "4\r\nWiki\r\n6;ext=1\r\npedia \r\nE\r\nin \r\n\r\nchunks.\r\n0\r\nTrailer: x\r\n\r\nNEXT";
    // Feed the bytes in every split position to check the state machine.
    var split: usize = 0;
    while (split <= raw.len) : (split += 1) {
        var buf: [raw.len]u8 = raw.*;
        var c: Chunked = .{};
        var out: usize = 0;
        var pos: usize = 0;
        try c.feed(&buf, &out, &pos, split);
        try c.feed(&buf, &out, &pos, raw.len);
        try std.testing.expect(c.done());
        try std.testing.expectEqualStrings("Wikipedia in \r\n\r\nchunks.", buf[0..out]);
        try std.testing.expectEqualStrings("NEXT", buf[pos..]);
    }
    var bad: [8]u8 = "zz\r\n\r\n\r\n".*;
    var c: Chunked = .{};
    var o: usize = 0;
    var p: usize = 0;
    try std.testing.expectError(error.BadChunk, c.feed(&bad, &o, &p, bad.len));
}

test "regression: a request line needs a method and a target (fuzz)" {
    try std.testing.expectError(error.BadRequest, parseRequest(" /x HTTP/1.1\r\n\r\n", 1024));
    try std.testing.expectError(error.BadRequest, parseRequest("GET  HTTP/1.1\r\n\r\n", 1024));
    _ = (try parseRequest("GET / HTTP/1.1\r\n\r\n", 1024)).?;
}

test "regression: the scanners stop on malformed JSON (fuzz)" {
    try std.testing.expect(member("{\"a", "a") == null);
    try std.testing.expect(member("{\"a\"", "a") == null);
    try std.testing.expectEqualStrings("true", member("{\"ok\": true }", "ok").?);
    var m = Members.init("{\"a\"}").?;
    try std.testing.expect(m.next() == null);
    var e = Elements.init("[}]").?;
    var n: usize = 0;
    while (e.next()) |_| n += 1;
    try std.testing.expectEqual(@as(usize, 1), n);
}
