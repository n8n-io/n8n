//! The log record format: one record per input batch. Recovery replays the
//! records through the same deterministic `core.step`. Pure encode and
//! decode; the shell owns the files.
const std = @import("std");
const core = @import("core.zig");
const Builder = @import("arena.zig").Builder;
const Arena = @import("arena.zig").Arena;

pub const BatchHeader = extern struct {
    magic: u32,
    /// Bytes after this header.
    len: u32,
    crc: u32,
    nevents: u32,
    now_ms: i64,
    batch_seq: u64,
};

pub const EventHeader = extern struct {
    kind: u8,
    _pad: [3]u8 = .{ 0, 0, 0 },
    seq: u32,
    aux: u32,
    plen: u32,
    exec_id: u64,
    conn: u64,
};

/// Version 2 ("LOG2"): the record checksum is XXH3-64 folded to 32 bits, not
/// CRC-32, which cost several percent of the CPU of a shard. A version 1 log
/// stops at its first record.
pub const batch_magic: u32 = 0x32474F4C;

/// The checksum of a record body: torn and corrupt records stop the reader.
pub fn checksum(body: []const u8) u32 {
    const h = std.hash.XxHash3.hash(0, body);
    return @truncate(h ^ (h >> 32));
}

comptime {
    std.debug.assert(@sizeOf(BatchHeader) == 32);
    std.debug.assert(@sizeOf(EventHeader) == 32);
}

fn pad8(n: usize) usize {
    return (n + 7) & ~@as(usize, 7);
}

pub fn encodedSize(events: []const core.Event) usize {
    var n: usize = @sizeOf(BatchHeader);
    for (events) |e| n += @sizeOf(EventHeader) + pad8(e.payload.len);
    return n;
}

/// Encode a batch into `out`, which must hold `encodedSize(events)` bytes.
pub fn encode(out: []u8, batch_seq: u64, now_ms: i64, events: []const core.Event) []u8 {
    const total = encodedSize(events);
    std.debug.assert(out.len >= total);
    var p: usize = @sizeOf(BatchHeader);
    for (events) |e| {
        const eh: EventHeader = .{ .kind = @backingInt(e.kind), .seq = e.seq, .aux = e.aux, .plen = @intCast(e.payload.len), .exec_id = e.exec_id, .conn = e.conn };
        @memcpy(out[p..][0..@sizeOf(EventHeader)], std.mem.asBytes(&eh));
        p += @sizeOf(EventHeader);
        @memcpy(out[p..][0..e.payload.len], e.payload);
        @memset(out[p + e.payload.len .. p + pad8(e.payload.len)], 0);
        p += pad8(e.payload.len);
    }
    std.debug.assert(p == total);
    const body = out[@sizeOf(BatchHeader)..total];
    const h: BatchHeader = .{ .magic = batch_magic, .len = @intCast(body.len), .crc = checksum(body), .nevents = @intCast(events.len), .now_ms = now_ms, .batch_seq = batch_seq };
    @memcpy(out[0..@sizeOf(BatchHeader)], std.mem.asBytes(&h));
    return out[0..total];
}

pub const Batch = struct { header: BatchHeader, body: []const u8 };

/// Iterate batches. Stops at the first torn or corrupt record: everything
/// after it was never acknowledged.
pub const Reader = struct {
    bytes: []const u8,
    pos: usize = 0,

    pub fn next(r: *Reader) ?Batch {
        if (r.pos + @sizeOf(BatchHeader) > r.bytes.len) return null;
        const h = std.mem.bytesToValue(BatchHeader, r.bytes[r.pos..][0..@sizeOf(BatchHeader)]);
        if (h.magic != batch_magic) return null;
        const start = r.pos + @sizeOf(BatchHeader);
        if (start + h.len > r.bytes.len) return null;
        const body = r.bytes[start..][0..h.len];
        if (checksum(body) != h.crc) return null;
        r.pos = start + h.len;
        return .{ .header = h, .body = body };
    }
};

/// Decode a batch's events into `out`. Payloads point into the batch body.
pub fn decodeEvents(b: Batch, out: []core.Event) ![]core.Event {
    if (b.header.nevents > out.len) return error.TooManyEvents;
    var p: usize = 0;
    var i: usize = 0;
    while (i < b.header.nevents) : (i += 1) {
        if (p + @sizeOf(EventHeader) > b.body.len) return error.Corrupt;
        const eh = std.mem.bytesToValue(EventHeader, b.body[p..][0..@sizeOf(EventHeader)]);
        p += @sizeOf(EventHeader);
        if (p + eh.plen > b.body.len) return error.Corrupt;
        out[i] = .{ .kind = std.enums.fromInt(core.EventKind, eh.kind) orelse return error.Corrupt, .seq = eh.seq, .aux = eh.aux, .exec_id = eh.exec_id, .conn = eh.conn, .payload = b.body[p..][0..eh.plen] };
        p += pad8(eh.plen);
    }
    return out[0..b.header.nevents];
}

test "log round trip and torn tail" {
    var buf: [1024]u8 = undefined;
    const evs = [_]core.Event{
        .{ .kind = .start, .aux = 0, .payload = "{\"a\":1}" },
        .{ .kind = .effect_ok, .exec_id = 9, .seq = 2, .payload = "[1,2,3]" },
    };
    const rec = encode(&buf, 1, 1000, &evs);
    var log: [2048]u8 = undefined;
    @memcpy(log[0..rec.len], rec);
    @memcpy(log[rec.len..][0..rec.len], rec);
    // Tear the second record.
    var r: Reader = .{ .bytes = log[0 .. rec.len * 2 - 3] };
    const b1 = r.next().?;
    var out: [4]core.Event = undefined;
    const got = try decodeEvents(b1, &out);
    try std.testing.expectEqual(@as(usize, 2), got.len);
    try std.testing.expectEqualStrings("[1,2,3]", got[1].payload);
    try std.testing.expect(r.next() == null);
}
