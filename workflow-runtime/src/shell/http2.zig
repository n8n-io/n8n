//! HTTP/2 framing (RFC 9113): the frame header, an incremental frame
//! reader, frame writers, and the request header block. The egress client
//! (`egress.zig`) owns streams, windows and connections; this file holds
//! the parts that do not depend on them, so the fuzzer can drive the
//! reader on its own.
//!
//! The reader takes bytes in any split. It streams DATA payloads to the
//! handler as they arrive, so a frame never has to fit the socket buffer.
//! HEADERS and CONTINUATION payloads collect in a buffer reserved at
//! startup, which bounds the header block. It never allocates and never
//! recurses.
const std = @import("std");
const hpack = @import("hpack.zig");

pub const preface = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
pub const frame_header_len = 9;
pub const default_window: u32 = 65535;
pub const max_window: u32 = 0x7fffffff;
pub const default_max_frame: u32 = 16384;
pub const max_max_frame: u32 = (1 << 24) - 1;

pub const FrameType = enum(u8) {
    data = 0,
    headers = 1,
    priority = 2,
    rst_stream = 3,
    settings = 4,
    push_promise = 5,
    ping = 6,
    goaway = 7,
    window_update = 8,
    continuation = 9,
    _,
};

pub const flag_end_stream: u8 = 0x1;
pub const flag_ack: u8 = 0x1;
pub const flag_end_headers: u8 = 0x4;
pub const flag_padded: u8 = 0x8;
pub const flag_priority: u8 = 0x20;

pub const ErrorCode = enum(u32) {
    no_error = 0,
    protocol = 1,
    internal = 2,
    flow_control = 3,
    settings_timeout = 4,
    stream_closed = 5,
    frame_size = 6,
    refused_stream = 7,
    cancel = 8,
    compression = 9,
    connect = 10,
    enhance_your_calm = 11,
    inadequate_security = 12,
    http_1_1_required = 13,
    _,

    pub fn text(c: ErrorCode) []const u8 {
        return switch (c) {
            .no_error => "NO_ERROR",
            .protocol => "PROTOCOL_ERROR",
            .internal => "INTERNAL_ERROR",
            .flow_control => "FLOW_CONTROL_ERROR",
            .settings_timeout => "SETTINGS_TIMEOUT",
            .stream_closed => "STREAM_CLOSED",
            .frame_size => "FRAME_SIZE_ERROR",
            .refused_stream => "REFUSED_STREAM",
            .cancel => "CANCEL",
            .compression => "COMPRESSION_ERROR",
            .connect => "CONNECT_ERROR",
            .enhance_your_calm => "ENHANCE_YOUR_CALM",
            .inadequate_security => "INADEQUATE_SECURITY",
            .http_1_1_required => "HTTP_1_1_REQUIRED",
            _ => "unknown error code",
        };
    }
};

pub const SettingId = enum(u16) {
    header_table_size = 1,
    enable_push = 2,
    max_concurrent_streams = 3,
    initial_window_size = 4,
    max_frame_size = 5,
    max_header_list_size = 6,
    _,
};

/// The settings of the peer (RFC 9113 6.5.2 defaults).
pub const Settings = struct {
    header_table_size: u32 = 4096,
    max_concurrent_streams: u32 = std.math.maxInt(u32),
    initial_window_size: u32 = default_window,
    max_frame_size: u32 = default_max_frame,
    max_header_list_size: u32 = std.math.maxInt(u32),
};

/// A frame header on the wire: 24-bit length, type, flags, a reserved
/// bit and a 31-bit stream id, big-endian (9 bytes; not a Zig struct,
/// because the 24-bit length has no aligned layout).
pub const FrameHeader = struct {
    len: u32,
    type: FrameType,
    flags: u8,
    stream: u32,

    pub fn parse(b: *const [frame_header_len]u8) FrameHeader {
        return .{
            .len = (@as(u32, b[0]) << 16) | (@as(u32, b[1]) << 8) | b[2],
            .type = @fromBackingInt(@intCast(b[3])),
            .flags = b[4],
            .stream = std.mem.readInt(u32, b[5..9], .big) & 0x7fffffff,
        };
    }

    pub fn write(h: FrameHeader, b: *[frame_header_len]u8) void {
        std.debug.assert(h.len <= max_max_frame and h.stream <= 0x7fffffff);
        b[0] = @intCast(h.len >> 16);
        b[1] = @intCast((h.len >> 8) & 0xff);
        b[2] = @intCast(h.len & 0xff);
        b[3] = @backingInt(h.type);
        b[4] = h.flags;
        std.mem.writeInt(u32, b[5..9], h.stream, .big);
    }
};

pub const ReadError = error{
    /// A connection error PROTOCOL_ERROR.
    Protocol,
    /// A connection error FRAME_SIZE_ERROR.
    FrameSize,
    /// A header block larger than the reader's buffer (our limit, sent
    /// as SETTINGS_MAX_HEADER_LIST_SIZE): the connection cannot go on.
    HeaderBlockTooLarge,
};

/// Incremental frame reader. `feed` takes any bytes and calls the
/// handler (a pointer to a struct) with:
///   onDataStart(stream, flow_len, end_stream)  flow-controlled length, at frame start
///   onData(stream, bytes)                      content, in one or more pieces
///   onDataEnd(stream, end_stream)
///   onHeaders(stream, block, end_stream)       a whole header block
///   onRst(stream, code)
///   onSetting(id, value)                       each entry of a SETTINGS frame
///   onSettingsEnd(ack)
///   onPing(data, ack)
///   onGoaway(last_stream, code)
///   onWindowUpdate(stream, increment)
/// Handler errors stop the feed and come back to the caller.
pub const Reader = struct {
    /// Our SETTINGS_MAX_FRAME_SIZE.
    max_frame: u32 = default_max_frame,
    /// HEADERS and CONTINUATION payloads; bounds the header block.
    block: []u8,
    hdr: [frame_header_len]u8 = undefined,
    hdr_have: u8 = 0,
    cur: FrameHeader = undefined,
    in_frame: bool = false,
    /// Payload bytes of `cur` taken so far.
    got: u32 = 0,
    /// DATA: the pad length (read from the first byte when PADDED).
    pad: u32 = 0,
    pad_known: bool = false,
    /// Small fixed payloads: RST, PING, GOAWAY head, WINDOW_UPDATE, a
    /// SETTINGS entry.
    ctl: [8]u8 = undefined,
    ctl_have: u8 = 0,
    /// The header block collected so far, and the payload start of the
    /// current HEADERS or CONTINUATION frame in `block`.
    block_len: u32 = 0,
    frame_start: u32 = 0,
    /// Non-zero while a header block waits for CONTINUATION.
    cont_stream: u32 = 0,
    block_end_stream: bool = false,

    pub fn init(block: []u8, max_frame: u32) Reader {
        std.debug.assert(max_frame >= default_max_frame and max_frame <= max_max_frame);
        return .{ .block = block, .max_frame = max_frame };
    }

    pub fn reset(r: *Reader) void {
        r.* = .{ .block = r.block, .max_frame = r.max_frame };
    }

    /// Consume all of `in`.
    pub fn feed(r: *Reader, in: []const u8, h: anytype) (ReadError || std.meta.Child(@TypeOf(h)).Err)!void {
        var pos: usize = 0;
        // Each pass takes at least one byte or ends a frame of length 0.
        var guard: usize = 0;
        const max_passes = in.len * 2 + 4;
        while (guard < max_passes) : (guard += 1) {
            if (!r.in_frame) {
                if (pos == in.len) return;
                const take = @min(frame_header_len - r.hdr_have, in.len - pos);
                @memcpy(r.hdr[r.hdr_have..][0..take], in[pos..][0..take]);
                r.hdr_have += @intCast(take);
                pos += take;
                if (r.hdr_have < frame_header_len) return;
                r.hdr_have = 0;
                r.cur = FrameHeader.parse(&r.hdr);
                try r.begin(h);
                r.in_frame = true;
                r.got = 0;
            }
            const left = r.cur.len - r.got;
            const take: u32 = @intCast(@min(left, in.len - pos));
            if (take > 0) {
                try r.payload(in[pos..][0..take], h);
                pos += take;
                r.got += take;
            }
            if (r.got == r.cur.len) {
                r.in_frame = false;
                try r.end(h);
                continue;
            }
            if (pos == in.len) return;
        }
        std.debug.assert(pos == in.len);
    }

    /// Checks that need only the frame header.
    fn begin(r: *Reader, h: anytype) (ReadError || std.meta.Child(@TypeOf(h)).Err)!void {
        const f = r.cur;
        if (f.len > r.max_frame) return error.FrameSize;
        if (r.cont_stream != 0 and (f.type != .continuation or f.stream != r.cont_stream)) return error.Protocol;
        r.ctl_have = 0;
        r.pad = 0;
        r.pad_known = false;
        switch (f.type) {
            .data => {
                if (f.stream == 0) return error.Protocol;
                if (f.flags & flag_padded != 0 and f.len == 0) return error.Protocol;
                try h.onDataStart(f.stream, f.len, f.flags & flag_end_stream != 0);
            },
            .headers => {
                if (f.stream == 0) return error.Protocol;
                r.block_len = 0;
                r.block_end_stream = f.flags & flag_end_stream != 0;
                try r.startBlockFrame();
            },
            .continuation => {
                if (r.cont_stream == 0) return error.Protocol;
                try r.startBlockFrame();
            },
            .priority => {
                if (f.stream == 0) return error.Protocol;
                if (f.len != 5) return error.FrameSize;
            },
            .rst_stream => {
                if (f.stream == 0) return error.Protocol;
                if (f.len != 4) return error.FrameSize;
            },
            .settings => {
                if (f.stream != 0) return error.Protocol;
                if (f.flags & flag_ack != 0 and f.len != 0) return error.FrameSize;
                if (f.len % 6 != 0) return error.FrameSize;
            },
            // We send SETTINGS_ENABLE_PUSH 0.
            .push_promise => return error.Protocol,
            .ping => {
                if (f.stream != 0) return error.Protocol;
                if (f.len != 8) return error.FrameSize;
            },
            .goaway => {
                if (f.stream != 0) return error.Protocol;
                if (f.len < 8) return error.FrameSize;
            },
            .window_update => if (f.len != 4) return error.FrameSize,
            _ => {},
        }
    }

    fn startBlockFrame(r: *Reader) ReadError!void {
        if (r.cur.len > r.block.len - r.block_len) return error.HeaderBlockTooLarge;
        r.frame_start = r.block_len;
    }

    fn payload(r: *Reader, bytes: []const u8, h: anytype) (ReadError || std.meta.Child(@TypeOf(h)).Err)!void {
        const f = r.cur;
        switch (f.type) {
            .data => {
                var b = bytes;
                var at = r.got;
                if (f.flags & flag_padded != 0 and !r.pad_known) {
                    r.pad = b[0];
                    r.pad_known = true;
                    if (r.pad >= f.len) return error.Protocol;
                    b = b[1..];
                    at += 1;
                }
                // Content is the bytes before the padding.
                const content_end = f.len - r.pad;
                if (at < content_end and b.len > 0) {
                    const n = @min(b.len, content_end - at);
                    try h.onData(f.stream, b[0..n]);
                }
            },
            .headers, .continuation => {
                @memcpy(r.block[r.block_len..][0..bytes.len], bytes);
                r.block_len += @intCast(bytes.len);
            },
            .rst_stream, .ping, .window_update, .goaway, .settings => {
                // GOAWAY keeps its first 8 bytes; SETTINGS one entry at a time.
                for (bytes) |c| {
                    if (f.type == .goaway and r.ctl_have >= 8) break;
                    r.ctl[r.ctl_have] = c;
                    r.ctl_have += 1;
                    if (f.type == .settings and r.ctl_have == 6) {
                        r.ctl_have = 0;
                        try h.onSetting(std.mem.readInt(u16, r.ctl[0..2], .big), std.mem.readInt(u32, r.ctl[2..6], .big));
                    }
                }
            },
            else => {},
        }
    }

    fn end(r: *Reader, h: anytype) (ReadError || std.meta.Child(@TypeOf(h)).Err)!void {
        const f = r.cur;
        switch (f.type) {
            .data => try h.onDataEnd(f.stream, f.flags & flag_end_stream != 0),
            .headers, .continuation => {
                // Drop padding and priority from this frame's payload.
                var start = r.frame_start;
                var stop = r.block_len;
                if (f.type == .headers) {
                    if (f.flags & flag_padded != 0) {
                        if (stop == start) return error.Protocol;
                        const pad = r.block[start];
                        start += 1;
                        if (pad > stop - start) return error.Protocol;
                        stop -= pad;
                    }
                    if (f.flags & flag_priority != 0) {
                        if (stop - start < 5) return error.Protocol;
                        start += 5;
                    }
                }
                const n = stop - start;
                std.mem.copyForwards(u8, r.block[r.frame_start..][0..n], r.block[start..stop]);
                r.block_len = r.frame_start + n;
                if (f.flags & flag_end_headers != 0) {
                    r.cont_stream = 0;
                    const len = r.block_len;
                    r.block_len = 0;
                    try h.onHeaders(f.stream, r.block[0..len], r.block_end_stream);
                } else {
                    r.cont_stream = f.stream;
                }
            },
            .rst_stream => try h.onRst(f.stream, @fromBackingInt(@intCast(std.mem.readInt(u32, r.ctl[0..4], .big)))),
            .settings => try h.onSettingsEnd(f.flags & flag_ack != 0),
            .ping => try h.onPing(r.ctl, f.flags & flag_ack != 0),
            .goaway => try h.onGoaway(std.mem.readInt(u32, r.ctl[0..4], .big) & 0x7fffffff, @fromBackingInt(@intCast(std.mem.readInt(u32, r.ctl[4..8], .big)))),
            .window_update => try h.onWindowUpdate(f.stream, std.mem.readInt(u32, r.ctl[0..4], .big) & 0x7fffffff),
            else => {},
        }
    }
};

// ---- writers ------------------------------------------------------------------------

pub const WriteError = error{NoSpace};

fn header(out: []u8, len: *usize, h: FrameHeader) WriteError!void {
    if (out.len - len.* < frame_header_len + h.len) return error.NoSpace;
    h.write(out[len.*..][0..frame_header_len]);
    len.* += frame_header_len;
}

pub fn writeSettings(out: []u8, len: *usize, entries: []const struct { SettingId, u32 }) WriteError!void {
    try header(out, len, .{ .len = @intCast(entries.len * 6), .type = .settings, .flags = 0, .stream = 0 });
    for (entries) |e| {
        std.mem.writeInt(u16, out[len.*..][0..2], @backingInt(e[0]), .big);
        std.mem.writeInt(u32, out[len.* + 2 ..][0..4], e[1], .big);
        len.* += 6;
    }
}

pub fn writeSettingsAck(out: []u8, len: *usize) WriteError!void {
    try header(out, len, .{ .len = 0, .type = .settings, .flags = flag_ack, .stream = 0 });
}

pub fn writeWindowUpdate(out: []u8, len: *usize, stream: u32, inc: u32) WriteError!void {
    std.debug.assert(inc > 0 and inc <= max_window);
    try header(out, len, .{ .len = 4, .type = .window_update, .flags = 0, .stream = stream });
    std.mem.writeInt(u32, out[len.*..][0..4], inc, .big);
    len.* += 4;
}

pub fn writePing(out: []u8, len: *usize, data: [8]u8, ack: bool) WriteError!void {
    try header(out, len, .{ .len = 8, .type = .ping, .flags = if (ack) flag_ack else 0, .stream = 0 });
    @memcpy(out[len.*..][0..8], &data);
    len.* += 8;
}

pub fn writeRst(out: []u8, len: *usize, stream: u32, code: ErrorCode) WriteError!void {
    std.debug.assert(stream != 0);
    try header(out, len, .{ .len = 4, .type = .rst_stream, .flags = 0, .stream = stream });
    std.mem.writeInt(u32, out[len.*..][0..4], @backingInt(code), .big);
    len.* += 4;
}

pub fn writeGoaway(out: []u8, len: *usize, last_stream: u32, code: ErrorCode) WriteError!void {
    try header(out, len, .{ .len = 8, .type = .goaway, .flags = 0, .stream = 0 });
    std.mem.writeInt(u32, out[len.*..][0..4], last_stream, .big);
    std.mem.writeInt(u32, out[len.* + 4 ..][0..4], @backingInt(code), .big);
    len.* += 8;
}

/// The header of a DATA frame; the caller writes `n` payload bytes next.
pub fn writeDataHeader(out: []u8, len: *usize, stream: u32, n: u32, end_stream: bool) WriteError!void {
    std.debug.assert(stream != 0);
    // `header` checks room for the payload too.
    try header(out, len, .{ .len = n, .type = .data, .flags = if (end_stream) flag_end_stream else 0, .stream = stream });
}

/// HEADERS (and CONTINUATION frames when the block is longer than
/// `max_frame`) for a header block that the caller encoded at
/// `out[len.* + 9 ..][0..block_len]`. The frames are built in place.
pub fn frameHeaderBlock(out: []u8, len: *usize, stream: u32, block_len: usize, max_frame: u32, end_stream: bool) WriteError!void {
    std.debug.assert(stream != 0 and max_frame >= default_max_frame);
    const nframes = if (block_len == 0) 1 else (block_len + max_frame - 1) / max_frame;
    const total = block_len + nframes * frame_header_len;
    if (out.len - len.* < total) return error.NoSpace;
    const base = len.*;
    // Move each piece after the first to its place, last first, so the
    // moves never overwrite bytes still to move.
    var k: usize = nframes;
    var moves: usize = 0;
    while (k > 1 and moves < nframes) : (moves += 1) {
        k -= 1;
        const src = base + frame_header_len + k * max_frame;
        const n = @min(max_frame, block_len - k * max_frame);
        const dst = base + (k + 1) * frame_header_len + k * max_frame;
        std.mem.copyBackwards(u8, out[dst..][0..n], out[src..][0..n]);
        (FrameHeader{ .len = @intCast(n), .type = .continuation, .flags = if (k == nframes - 1) flag_end_headers else 0, .stream = stream })
            .write(out[dst - frame_header_len ..][0..frame_header_len]);
    }
    const first_n = @min(block_len, max_frame);
    var flags: u8 = if (end_stream) flag_end_stream else 0;
    if (nframes == 1) flags |= flag_end_headers;
    (FrameHeader{ .len = @intCast(first_n), .type = .headers, .flags = flags, .stream = stream }).write(out[base..][0..frame_header_len]);
    len.* = base + total;
}

/// Headers that HTTP/2 forbids or that the pseudo-headers replace
/// (RFC 9113 8.2.2).
fn dropped(name: []const u8) bool {
    const names = [_][]const u8{ "connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "host" };
    for (names) |n| if (std.ascii.eqlIgnoreCase(n, name)) return true;
    return false;
}

/// Headers that never carry a secret. Every other header goes out as a
/// never-indexed literal (RFC 7541 7.1.3): credential headers, cookies, API
/// keys and any header a credential template filled. The encoder never adds
/// to the server's dynamic table at all, so no request can learn another's
/// header from compression; never-indexed also tells proxies not to index.
fn plain(name: []const u8) bool {
    const names = [_][]const u8{ "accept", "accept-encoding", "accept-language", "content-type", "content-length", "user-agent", "idempotency-key", "te" };
    for (names) |n| if (std.mem.eql(u8, n, name)) return true;
    return false;
}

/// The HPACK block of a request. `lines` holds HTTP/1.1 header lines
/// ("Name: value\r\n" ... ending with the blank line), as `request.zig`
/// builds them. Names go to lower case.
pub fn encodeRequest(out: []u8, len: *usize, method: []const u8, https: bool, authority: []const u8, path: []const u8, lines: []const u8) WriteError!void {
    var ab: [600]u8 = undefined;
    var an: usize = 0;
    try hpack.encodeField(&ab, &an, ":authority", authority, false);
    return encodeRequestFast(out, len, method, https, ab[0..an], path, lines);
}

/// `encodeRequest` with the `:authority` field already encoded (the
/// client keeps it per origin). The pseudo-headers take their static
/// table entries directly: GET, POST, http, https and "/" are one byte.
pub fn encodeRequestFast(out: []u8, len: *usize, method: []const u8, https: bool, authority_field: []const u8, path: []const u8, lines: []const u8) WriteError!void {
    if (std.mem.eql(u8, method, "GET")) {
        try putByte(out, len, 0x82);
    } else if (std.mem.eql(u8, method, "POST")) {
        try putByte(out, len, 0x83);
    } else try hpack.encodeField(out, len, ":method", method, false);
    try putByte(out, len, if (https) 0x87 else 0x86);
    if (out.len - len.* < authority_field.len) return error.NoSpace;
    @memcpy(out[len.*..][0..authority_field.len], authority_field);
    len.* += authority_field.len;
    if (path.len == 1 and path[0] == '/') {
        try putByte(out, len, 0x84);
    } else {
        // Literal without indexing, name :path (static 4), raw value.
        try putByte(out, len, 0x04);
        try hpack.encodeInt(out, len, 0, 7, @intCast(path.len));
        if (out.len - len.* < path.len) return error.NoSpace;
        @memcpy(out[len.*..][0..path.len], path);
        len.* += path.len;
    }
    // One pass over the lines: find each CRLF once.
    var pos: usize = 0;
    var guard: usize = 0;
    while (pos < lines.len and guard <= lines.len) : (guard += 1) {
        const end = std.mem.indexOfPos(u8, lines, pos, "\r\n") orelse lines.len;
        const line = lines[pos..end];
        pos = end + 2;
        if (line.len == 0) continue;
        // The lines that every request has, encoded at compile time.
        if (constLine(line)) |enc| {
            if (out.len - len.* < enc.len) return error.NoSpace;
            @memcpy(out[len.*..][0..enc.len], enc);
            len.* += enc.len;
            continue;
        }
        try encodeLine(out, len, line);
    }
}

fn putByte(out: []u8, len: *usize, b: u8) WriteError!void {
    if (len.* >= out.len) return error.NoSpace;
    out[len.*] = b;
    len.* += 1;
}

/// The header lines that `request.zig` adds to every request.
const const_lines = [_][]const u8{
    "user-agent: n8n-wfrt",
    "accept: application/json,text/*;q=0.9,*/*;q=0.8",
    "accept-encoding: identity",
};

const const_encoded = blk: {
    @setEvalBranchQuota(200_000);
    var encs: [const_lines.len][]const u8 = undefined;
    for (const_lines, 0..) |l, i| {
        const colon = std.mem.indexOfScalar(u8, l, ':').?;
        var buf: [128]u8 = undefined;
        var n: usize = 0;
        hpack.encodeField(&buf, &n, l[0..colon], l[colon + 2 ..], !plain(l[0..colon])) catch unreachable;
        const final = buf[0..n].*;
        encs[i] = &final;
    }
    break :blk encs;
};

fn constLine(line: []const u8) ?[]const u8 {
    inline for (const_lines, 0..) |l, i| {
        if (line.len == l.len and std.mem.eql(u8, line, l)) return const_encoded[i];
    }
    return null;
}

fn encodeLine(out: []u8, len: *usize, line: []const u8) WriteError!void {
    const colon = std.mem.indexOfScalar(u8, line, ':') orelse return;
    const raw_name = std.mem.trim(u8, line[0..colon], " \t");
    if (raw_name.len == 0 or raw_name.len > 256 or dropped(raw_name)) return;
    const value = std.mem.trim(u8, line[colon + 1 ..], " \t");
    // Names are usually lower case already: no copy then.
    var lower = true;
    for (raw_name) |c| {
        if (std.ascii.isUpper(c)) lower = false;
    }
    if (lower) return encodeNamed(out, len, raw_name, value);
    return encodeLowered(out, len, raw_name, value);
}

fn encodeLowered(out: []u8, len: *usize, raw_name: []const u8, value: []const u8) WriteError!void {
    // Safe builds would fill the buffer on every call; it is written before use.
    @setRuntimeSafety(false);
    var nb: [256]u8 = undefined;
    return encodeNamed(out, len, std.ascii.lowerString(nb[0..raw_name.len], raw_name), value);
}

fn encodeNamed(out: []u8, len: *usize, name: []const u8, value: []const u8) WriteError!void {
    // TE is allowed only as "trailers".
    if (std.mem.eql(u8, name, "te") and !std.ascii.eqlIgnoreCase(value, "trailers")) return;
    try hpack.encodeField(out, len, name, value, !plain(name));
}

// ---- tests ------------------------------------------------------------------------

/// Records what the reader reports, as text.
const Rec = struct {
    buf: [4096]u8 = undefined,
    len: usize = 0,
    pub const Err = error{};

    fn put(r: *Rec, comptime fmt: []const u8, args: anytype) void {
        const w = std.fmt.bufPrint(r.buf[r.len..], fmt, args) catch return;
        r.len += w.len;
    }
    pub fn onDataStart(r: *Rec, s: u32, n: u32, end_stream: bool) Err!void {
        r.put("D{d}:{d}{s}[", .{ s, n, if (end_stream) "E" else "" });
    }
    pub fn onData(r: *Rec, s: u32, b: []const u8) Err!void {
        _ = s;
        r.put("{s}", .{b});
    }
    pub fn onDataEnd(r: *Rec, s: u32, end_stream: bool) Err!void {
        _ = s;
        _ = end_stream;
        r.put("]", .{});
    }
    pub fn onHeaders(r: *Rec, s: u32, block: []const u8, end_stream: bool) Err!void {
        r.put("H{d}:{d}{s}", .{ s, block.len, if (end_stream) "E" else "" });
    }
    pub fn onRst(r: *Rec, s: u32, c: ErrorCode) Err!void {
        r.put("R{d}:{s}", .{ s, c.text() });
    }
    pub fn onSetting(r: *Rec, id: u16, v: u32) Err!void {
        r.put("S{d}={d}", .{ id, v });
    }
    pub fn onSettingsEnd(r: *Rec, ack: bool) Err!void {
        r.put("S{s}", .{if (ack) "A" else "."});
    }
    pub fn onPing(r: *Rec, d: [8]u8, ack: bool) Err!void {
        r.put("P{d}{s}", .{ d[7], if (ack) "A" else "" });
    }
    pub fn onGoaway(r: *Rec, last: u32, c: ErrorCode) Err!void {
        r.put("G{d}:{s}", .{ last, c.text() });
    }
    pub fn onWindowUpdate(r: *Rec, s: u32, inc: u32) Err!void {
        r.put("W{d}+{d}", .{ s, inc });
    }
};

fn frame(out: []u8, len: *usize, ty: FrameType, flags: u8, stream: u32, payload: []const u8) void {
    (FrameHeader{ .len = @intCast(payload.len), .type = ty, .flags = flags, .stream = stream }).write(out[len.*..][0..9]);
    @memcpy(out[len.* + 9 ..][0..payload.len], payload);
    len.* += 9 + payload.len;
}

fn sampleStream(buf: []u8) usize {
    var n: usize = 0;
    frame(buf, &n, .settings, 0, 0, &.{ 0, 3, 0, 0, 0, 100, 0, 4, 0, 1, 0, 0 });
    frame(buf, &n, .settings, flag_ack, 0, &.{});
    frame(buf, &n, .headers, flag_padded | flag_priority, 1, &.{ 2, 0, 0, 0, 0, 16, 0x88, 0xaa, 0, 0 });
    frame(buf, &n, .continuation, flag_end_headers, 1, &.{0x8c});
    frame(buf, &n, .data, flag_padded, 1, &.{ 3, 'h', 'e', 'l', 'l', 'o', 0, 0, 0 });
    frame(buf, &n, .data, flag_end_stream, 1, " world");
    frame(buf, &n, .window_update, 0, 0, &.{ 0, 1, 0, 0 });
    frame(buf, &n, .ping, 0, 0, &.{ 0, 0, 0, 0, 0, 0, 0, 7 });
    frame(buf, &n, .rst_stream, 0, 3, &.{ 0, 0, 0, 7 });
    frame(buf, &n, @fromBackingInt(@intCast(0xfa)), 0, 0, "unknown frames are ignored");
    frame(buf, &n, .goaway, 0, 0, &.{ 0, 0, 0, 5, 0, 0, 0, 0, 'd', 'b', 'g' });
    return n;
}

const sample_want = "S3=100S4=65536S.SAH1:3D1:9[hello]D1:6E[ world]W0+65536P7R3:REFUSED_STREAMG5:NO_ERROR";

test "http2: the reader reports frames the same for every split of the input" {
    var buf: [512]u8 = undefined;
    const n = sampleStream(&buf);
    var block: [64]u8 = undefined;
    var split: usize = 0;
    while (split <= n) : (split += 1) {
        var r = Reader.init(&block, default_max_frame);
        var rec: Rec = .{};
        try r.feed(buf[0..split], &rec);
        try r.feed(buf[split..n], &rec);
        try std.testing.expectEqualStrings(sample_want, rec.buf[0..rec.len]);
    }
    // One byte at a time.
    var r = Reader.init(&block, default_max_frame);
    var rec: Rec = .{};
    for (buf[0..n]) |c| try r.feed(&.{c}, &rec);
    try std.testing.expectEqualStrings(sample_want, rec.buf[0..rec.len]);
}

test "http2: protocol errors" {
    var block: [64]u8 = undefined;
    const cases = [_]struct { ty: FrameType, flags: u8, stream: u32, payload: []const u8, err: ReadError }{
        .{ .ty = .data, .flags = 0, .stream = 0, .payload = "x", .err = error.Protocol },
        .{ .ty = .settings, .flags = 0, .stream = 1, .payload = "", .err = error.Protocol },
        .{ .ty = .settings, .flags = 0, .stream = 0, .payload = "abc", .err = error.FrameSize },
        .{ .ty = .settings, .flags = flag_ack, .stream = 0, .payload = "abcdef", .err = error.FrameSize },
        .{ .ty = .ping, .flags = 0, .stream = 0, .payload = "short", .err = error.FrameSize },
        .{ .ty = .push_promise, .flags = 0, .stream = 1, .payload = "abcd", .err = error.Protocol },
        .{ .ty = .continuation, .flags = 0, .stream = 1, .payload = "", .err = error.Protocol },
        .{ .ty = .data, .flags = flag_padded, .stream = 1, .payload = &.{ 4, 'a', 'b', 'c' }, .err = error.Protocol },
        .{ .ty = .headers, .flags = flag_padded | flag_end_headers, .stream = 1, .payload = &.{ 9, 0x82 }, .err = error.Protocol },
        .{ .ty = .headers, .flags = flag_end_headers, .stream = 1, .payload = &@as([65]u8, @splat(0x82)), .err = error.HeaderBlockTooLarge },
        .{ .ty = .goaway, .flags = 0, .stream = 0, .payload = "1234", .err = error.FrameSize },
        .{ .ty = .window_update, .flags = 0, .stream = 0, .payload = "123", .err = error.FrameSize },
    };
    for (cases) |c| {
        var buf: [128]u8 = undefined;
        var n: usize = 0;
        frame(&buf, &n, c.ty, c.flags, c.stream, c.payload);
        var r = Reader.init(&block, default_max_frame);
        var rec: Rec = .{};
        try std.testing.expectError(c.err, r.feed(buf[0..n], &rec));
    }
    // A frame other than CONTINUATION inside a header block.
    var buf: [64]u8 = undefined;
    var n: usize = 0;
    frame(&buf, &n, .headers, 0, 1, &.{0x82});
    frame(&buf, &n, .ping, 0, 0, &.{ 0, 0, 0, 0, 0, 0, 0, 0 });
    var r = Reader.init(&block, default_max_frame);
    var rec: Rec = .{};
    try std.testing.expectError(error.Protocol, r.feed(buf[0..n], &rec));
    // Larger than SETTINGS_MAX_FRAME_SIZE.
    var hb: [9]u8 = undefined;
    (FrameHeader{ .len = default_max_frame + 1, .type = .data, .flags = 0, .stream = 1 }).write(&hb);
    r = Reader.init(&block, default_max_frame);
    try std.testing.expectError(error.FrameSize, r.feed(&hb, &rec));
}

test "http2: a header block split into CONTINUATION frames and read back" {
    var out: [100_000]u8 = undefined;
    var len: usize = 3;
    const block_len: usize = 40_000;
    for (0..block_len) |i| out[len + 9 + i] = @intCast(i % 251);
    try frameHeaderBlock(&out, &len, 5, block_len, default_max_frame, true);
    try std.testing.expectEqual(@as(usize, 3 + block_len + 3 * 9), len);
    var block: [block_len]u8 = undefined;
    var r = Reader.init(&block, default_max_frame);
    const Got = struct {
        n: usize = 0,
        ok: bool = true,
        es: bool = false,
        pub const Err = error{};
        pub fn onDataStart(_: *@This(), _: u32, _: u32, _: bool) Err!void {}
        pub fn onData(_: *@This(), _: u32, _: []const u8) Err!void {}
        pub fn onDataEnd(_: *@This(), _: u32, _: bool) Err!void {}
        pub fn onHeaders(g: *@This(), s: u32, b: []const u8, es: bool) Err!void {
            g.n = b.len;
            g.es = es and s == 5;
            for (b, 0..) |c, i| if (c != i % 251) {
                g.ok = false;
            };
        }
        pub fn onRst(_: *@This(), _: u32, _: ErrorCode) Err!void {}
        pub fn onSetting(_: *@This(), _: u16, _: u32) Err!void {}
        pub fn onSettingsEnd(_: *@This(), _: bool) Err!void {}
        pub fn onPing(_: *@This(), _: [8]u8, _: bool) Err!void {}
        pub fn onGoaway(_: *@This(), _: u32, _: ErrorCode) Err!void {}
        pub fn onWindowUpdate(_: *@This(), _: u32, _: u32) Err!void {}
    };
    var g: Got = .{};
    try r.feed(out[3..len], &g);
    try std.testing.expectEqual(block_len, g.n);
    try std.testing.expect(g.ok and g.es);
}

test "http2: request headers drop connection headers and keep the rest in lower case" {
    var out: [512]u8 = undefined;
    var len: usize = 0;
    try encodeRequest(&out, &len, "POST", true, "api.example.com", "/v1/x?a=1", "Content-Type: application/json\r\nConnection: keep-alive\r\nAuthorization: Bearer t\r\nTE: gzip\r\nX-Id: 7\r\n\r\n");
    // Authorization (static name 23) is a never-indexed literal: 0001 1111, then 23 - 15.
    try std.testing.expect(std.mem.indexOf(u8, out[0..len], &.{ 0x1f, 0x08 }) != null);
    // X-Id (a new name) too: 0001 0000, then the name.
    try std.testing.expect(std.mem.indexOf(u8, out[0..len], &.{0x10}) != null);
    var ring: [4096]u8 = undefined;
    var ents: [hpack.entriesFor(4096)]hpack.Entry = undefined;
    var scratch: [256]u8 = undefined;
    var d = hpack.Decoder.init(&ring, &ents, &scratch);
    const C = struct {
        buf: [512]u8 = undefined,
        n: usize = 0,
        pub const Err = error{};
        pub fn field(c: *@This(), name: []const u8, value: []const u8) Err!void {
            const w = std.fmt.bufPrint(c.buf[c.n..], "{s}={s};", .{ name, value }) catch unreachable;
            c.n += w.len;
        }
    };
    var c: C = .{};
    try d.decode(out[0..len], &c);
    try std.testing.expectEqualStrings(":method=POST;:scheme=https;:authority=api.example.com;:path=/v1/x?a=1;content-type=application/json;authorization=Bearer t;x-id=7;", c.buf[0..c.n]);
}
