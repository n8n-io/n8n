//! HPACK (RFC 7541): header compression for HTTP/2.
//!
//! The decoder keeps the dynamic table in two fixed buffers that the
//! caller reserves at startup: a byte ring for names and values and a ring
//! of entries. It never allocates. A decoded field goes to a callback as
//! two slices of a scratch buffer, valid only during the call.
//!
//! The encoder is stateless: it never adds to the peer's dynamic table, so
//! it needs no table of its own. It uses static table names where it can,
//! and Huffman coding when that is shorter.
const std = @import("std");

pub const Error = error{
    /// The block breaks RFC 7541: a connection error COMPRESSION_ERROR.
    Compression,
    /// A field is larger than the scratch buffer (a limit of this
    /// decoder). Also a connection error, as the table is out of step.
    FieldTooLarge,
};

pub const static_table = [_]struct { name: []const u8, value: []const u8 }{
    .{ .name = ":authority", .value = "" },
    .{ .name = ":method", .value = "GET" },
    .{ .name = ":method", .value = "POST" },
    .{ .name = ":path", .value = "/" },
    .{ .name = ":path", .value = "/index.html" },
    .{ .name = ":scheme", .value = "http" },
    .{ .name = ":scheme", .value = "https" },
    .{ .name = ":status", .value = "200" },
    .{ .name = ":status", .value = "204" },
    .{ .name = ":status", .value = "206" },
    .{ .name = ":status", .value = "304" },
    .{ .name = ":status", .value = "400" },
    .{ .name = ":status", .value = "404" },
    .{ .name = ":status", .value = "500" },
    .{ .name = "accept-charset", .value = "" },
    .{ .name = "accept-encoding", .value = "gzip, deflate" },
    .{ .name = "accept-language", .value = "" },
    .{ .name = "accept-ranges", .value = "" },
    .{ .name = "accept", .value = "" },
    .{ .name = "access-control-allow-origin", .value = "" },
    .{ .name = "age", .value = "" },
    .{ .name = "allow", .value = "" },
    .{ .name = "authorization", .value = "" },
    .{ .name = "cache-control", .value = "" },
    .{ .name = "content-disposition", .value = "" },
    .{ .name = "content-encoding", .value = "" },
    .{ .name = "content-language", .value = "" },
    .{ .name = "content-length", .value = "" },
    .{ .name = "content-location", .value = "" },
    .{ .name = "content-range", .value = "" },
    .{ .name = "content-type", .value = "" },
    .{ .name = "cookie", .value = "" },
    .{ .name = "date", .value = "" },
    .{ .name = "etag", .value = "" },
    .{ .name = "expect", .value = "" },
    .{ .name = "expires", .value = "" },
    .{ .name = "from", .value = "" },
    .{ .name = "host", .value = "" },
    .{ .name = "if-match", .value = "" },
    .{ .name = "if-modified-since", .value = "" },
    .{ .name = "if-none-match", .value = "" },
    .{ .name = "if-range", .value = "" },
    .{ .name = "if-unmodified-since", .value = "" },
    .{ .name = "last-modified", .value = "" },
    .{ .name = "link", .value = "" },
    .{ .name = "location", .value = "" },
    .{ .name = "max-forwards", .value = "" },
    .{ .name = "proxy-authenticate", .value = "" },
    .{ .name = "proxy-authorization", .value = "" },
    .{ .name = "range", .value = "" },
    .{ .name = "referer", .value = "" },
    .{ .name = "refresh", .value = "" },
    .{ .name = "retry-after", .value = "" },
    .{ .name = "server", .value = "" },
    .{ .name = "set-cookie", .value = "" },
    .{ .name = "strict-transport-security", .value = "" },
    .{ .name = "transfer-encoding", .value = "" },
    .{ .name = "user-agent", .value = "" },
    .{ .name = "vary", .value = "" },
    .{ .name = "via", .value = "" },
    .{ .name = "www-authenticate", .value = "" },
};

comptime {
    std.debug.assert(static_table.len == 61);
}

/// The size of an entry for the table size limit (RFC 7541 4.1).
pub const entry_overhead = 32;

// ---- integers and strings -------------------------------------------------------

/// Decode an integer with an N-bit prefix at `buf[pos.*]`. Values above
/// 2^28 are refused: no field or table size here comes near that.
pub fn decodeInt(buf: []const u8, pos: *usize, prefix_bits: u4) Error!u32 {
    std.debug.assert(prefix_bits >= 1 and prefix_bits <= 8);
    if (pos.* >= buf.len) return error.Compression;
    const max_prefix: u32 = (@as(u32, 1) << @intCast(prefix_bits)) - 1;
    var v: u32 = buf[pos.*] & max_prefix;
    pos.* += 1;
    if (v < max_prefix) return v;
    var shift: u5 = 0;
    // At most four continuation bytes: 7 * 4 = 28 bits.
    var i: u32 = 0;
    while (i < 4) : (i += 1) {
        if (pos.* >= buf.len) return error.Compression;
        const b = buf[pos.*];
        pos.* += 1;
        v += @as(u32, b & 0x7f) << shift;
        if (b & 0x80 == 0) return v;
        shift += 7;
    }
    return error.Compression;
}

/// Write an integer with an N-bit prefix; `first` holds the bits above
/// the prefix.
pub fn encodeInt(out: []u8, len: *usize, first: u8, prefix_bits: u4, value: u32) error{NoSpace}!void {
    std.debug.assert(prefix_bits >= 1 and prefix_bits <= 8);
    const max_prefix: u32 = (@as(u32, 1) << @intCast(prefix_bits)) - 1;
    if (value < max_prefix) {
        try putByte(out, len, first | @as(u8, @intCast(value)));
        return;
    }
    try putByte(out, len, first | @as(u8, @intCast(max_prefix)));
    var v = value - max_prefix;
    var i: u32 = 0;
    while (v >= 128 and i < 5) : (i += 1) {
        try putByte(out, len, @as(u8, @intCast(v & 0x7f)) | 0x80);
        v >>= 7;
    }
    try putByte(out, len, @intCast(v));
}

fn putByte(out: []u8, len: *usize, b: u8) error{NoSpace}!void {
    if (len.* >= out.len) return error.NoSpace;
    out[len.*] = b;
    len.* += 1;
}

fn putBytes(out: []u8, len: *usize, bytes: []const u8) error{NoSpace}!void {
    if (out.len - len.* < bytes.len) return error.NoSpace;
    @memcpy(out[len.*..][0..bytes.len], bytes);
    len.* += bytes.len;
}

// ---- Huffman code (RFC 7541 Appendix B) ---------------------------------------

const huff_codes = [256]u32{
    0x1ff8,    0x7fffd8,  0xfffffe2,  0xfffffe3, 0xfffffe4, 0xfffffe5,  0xfffffe6,  0xfffffe7,
    0xfffffe8, 0xffffea,  0x3ffffffc, 0xfffffe9, 0xfffffea, 0x3ffffffd, 0xfffffeb,  0xfffffec,
    0xfffffed, 0xfffffee, 0xfffffef,  0xffffff0, 0xffffff1, 0xffffff2,  0x3ffffffe, 0xffffff3,
    0xffffff4, 0xffffff5, 0xffffff6,  0xffffff7, 0xffffff8, 0xffffff9,  0xffffffa,  0xffffffb,
    0x14,      0x3f8,     0x3f9,      0xffa,     0x1ff9,    0x15,       0xf8,       0x7fa,
    0x3fa,     0x3fb,     0xf9,       0x7fb,     0xfa,      0x16,       0x17,       0x18,
    0x0,       0x1,       0x2,        0x19,      0x1a,      0x1b,       0x1c,       0x1d,
    0x1e,      0x1f,      0x5c,       0xfb,      0x7ffc,    0x20,       0xffb,      0x3fc,
    0x1ffa,    0x21,      0x5d,       0x5e,      0x5f,      0x60,       0x61,       0x62,
    0x63,      0x64,      0x65,       0x66,      0x67,      0x68,       0x69,       0x6a,
    0x6b,      0x6c,      0x6d,       0x6e,      0x6f,      0x70,       0x71,       0x72,
    0xfc,      0x73,      0xfd,       0x1ffb,    0x7fff0,   0x1ffc,     0x3ffc,     0x22,
    0x7ffd,    0x3,       0x23,       0x4,       0x24,      0x5,        0x25,       0x26,
    0x27,      0x6,       0x74,       0x75,      0x28,      0x29,       0x2a,       0x7,
    0x2b,      0x76,      0x2c,       0x8,       0x9,       0x2d,       0x77,       0x78,
    0x79,      0x7a,      0x7b,       0x7ffe,    0x7fc,     0x3ffd,     0x1ffd,     0xffffffc,
    0xfffe6,   0x3fffd2,  0xfffe7,    0xfffe8,   0x3fffd3,  0x3fffd4,   0x3fffd5,   0x7fffd9,
    0x3fffd6,  0x7fffda,  0x7fffdb,   0x7fffdc,  0x7fffdd,  0x7fffde,   0xffffeb,   0x7fffdf,
    0xffffec,  0xffffed,  0x3fffd7,   0x7fffe0,  0xffffee,  0x7fffe1,   0x7fffe2,   0x7fffe3,
    0x7fffe4,  0x1fffdc,  0x3fffd8,   0x7fffe5,  0x3fffd9,  0x7fffe6,   0x7fffe7,   0xffffef,
    0x3fffda,  0x1fffdd,  0xfffe9,    0x3fffdb,  0x3fffdc,  0x7fffe8,   0x7fffe9,   0x1fffde,
    0x7fffea,  0x3fffdd,  0x3fffde,   0xfffff0,  0x1fffdf,  0x3fffdf,   0x7fffeb,   0x7fffec,
    0x1fffe0,  0x1fffe1,  0x3fffe0,   0x1fffe2,  0x7fffed,  0x3fffe1,   0x7fffee,   0x7fffef,
    0xfffea,   0x3fffe2,  0x3fffe3,   0x3fffe4,  0x7ffff0,  0x3fffe5,   0x3fffe6,   0x7ffff1,
    0x3ffffe0, 0x3ffffe1, 0xfffeb,    0x7fff1,   0x3fffe7,  0x7ffff2,   0x3fffe8,   0x1ffffec,
    0x3ffffe2, 0x3ffffe3, 0x3ffffe4,  0x7ffffde, 0x7ffffdf, 0x3ffffe5,  0xfffff1,   0x1ffffed,
    0x7fff2,   0x1fffe3,  0x3ffffe6,  0x7ffffe0, 0x7ffffe1, 0x3ffffe7,  0x7ffffe2,  0xfffff2,
    0x1fffe4,  0x1fffe5,  0x3ffffe8,  0x3ffffe9, 0xffffffd, 0x7ffffe3,  0x7ffffe4,  0x7ffffe5,
    0xfffec,   0xfffff3,  0xfffed,    0x1fffe6,  0x3fffe9,  0x1fffe7,   0x1fffe8,   0x7ffff3,
    0x3fffea,  0x3fffeb,  0x1ffffee,  0x1ffffef, 0xfffff4,  0xfffff5,   0x3ffffea,  0x7ffff4,
    0x3ffffeb, 0x7ffffe6, 0x3ffffec,  0x3ffffed, 0x7ffffe7, 0x7ffffe8,  0x7ffffe9,  0x7ffffea,
    0x7ffffeb, 0xffffffe, 0x7ffffec,  0x7ffffed, 0x7ffffee, 0x7ffffef,  0x7fffff0,  0x3ffffee,
};

const huff_lens = [256]u8{
    13, 23, 28, 28, 28, 28, 28, 28, 28, 24, 30, 28, 28, 30, 28, 28,
    28, 28, 28, 28, 28, 28, 30, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    6,  10, 10, 12, 13, 6,  8,  11, 10, 10, 8,  11, 8,  6,  6,  6,
    5,  5,  5,  6,  6,  6,  6,  6,  6,  6,  7,  8,  15, 6,  12, 10,
    13, 6,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,  7,
    7,  7,  7,  7,  7,  7,  7,  7,  8,  7,  8,  13, 19, 13, 14, 6,
    15, 5,  6,  5,  6,  5,  6,  6,  6,  5,  7,  7,  6,  6,  6,  5,
    6,  7,  6,  5,  5,  6,  7,  7,  7,  7,  7,  15, 11, 14, 13, 28,
    20, 22, 20, 20, 22, 22, 22, 23, 22, 23, 23, 23, 23, 23, 24, 23,
    24, 24, 22, 23, 24, 23, 23, 23, 23, 21, 22, 23, 22, 23, 23, 24,
    22, 21, 20, 22, 22, 23, 23, 21, 23, 22, 22, 24, 21, 22, 23, 23,
    21, 21, 22, 21, 23, 22, 23, 23, 20, 22, 22, 22, 23, 22, 22, 23,
    26, 26, 20, 19, 22, 23, 22, 25, 26, 26, 26, 27, 27, 26, 24, 25,
    19, 21, 26, 27, 27, 26, 27, 24, 21, 21, 26, 26, 28, 27, 27, 27,
    20, 24, 20, 21, 22, 21, 21, 23, 22, 22, 25, 25, 24, 24, 26, 23,
    26, 27, 26, 26, 27, 27, 27, 27, 27, 28, 27, 27, 27, 27, 27, 26,
};

/// End of string: 30 one bits, the last code in canonical order.
const eos_sym: u16 = 256;
const max_code_len = 30;

/// The code is canonical (codes of one length are consecutive and come
/// after all shorter codes), so a decode needs only, for each length, the
/// first code, the count, and the symbols in code order. A table of the
/// first 8 bits resolves the common symbols (5 to 8 bits) at once.
const Huff = struct {
    /// Symbols ordered by (length, symbol); EOS last.
    sorted: [257]u16,
    first: [max_code_len + 1]u32,
    count: [max_code_len + 1]u32,
    offset: [max_code_len + 1]u32,
    /// By the top 8 bits: the symbol and its length, or length 0 when the
    /// code is longer than 8 bits.
    top: [256]struct { sym: u8, len: u8 },
};

const huff: Huff = blk: {
    @setEvalBranchQuota(200_000);
    var h: Huff = undefined;
    @memset(&h.count, 0);
    @memset(&h.first, 0);
    @memset(&h.offset, 0);
    for (huff_lens) |l| h.count[l] += 1;
    h.count[max_code_len] += 1; // EOS
    var k: u32 = 0;
    for (1..max_code_len + 1) |l| {
        h.offset[l] = k;
        for (0..256) |s| {
            if (huff_lens[s] == l) {
                h.sorted[k] = s;
                k += 1;
            }
        }
        if (l == max_code_len) {
            h.sorted[k] = eos_sym;
            k += 1;
        }
    }
    var code: u32 = 0;
    for (1..max_code_len + 1) |l| {
        h.first[l] = code;
        code = (code + h.count[l]) << 1;
    }
    for (&h.top) |*t| t.* = .{ .sym = 0, .len = 0 };
    for (0..256) |s| {
        const l = huff_lens[s];
        // The canonical order gives the same codes as the RFC table.
        if (h.first[l] + (blk2: {
            var idx: u32 = 0;
            for (h.offset[l]..h.offset[l] + h.count[l]) |j| {
                if (h.sorted[j] == s) break :blk2 idx;
                idx += 1;
            }
            unreachable;
        }) != huff_codes[s]) @compileError("HPACK Huffman table is not canonical");
        if (l <= 8) {
            const base = huff_codes[s] << (8 - l);
            for (0..(@as(u32, 1) << (8 - l))) |j| h.top[base + j] = .{ .sym = s, .len = l };
        }
    }
    break :blk h;
};

/// Decode Huffman bytes into `out`. Returns the decoded length.
pub fn huffmanDecode(in: []const u8, out: []u8) Error![]u8 {
    var acc: u64 = 0;
    var nbits: u32 = 0;
    var ip: usize = 0;
    var op: usize = 0;
    // Each pass emits one symbol of 5 or more bits, or ends.
    var guard: usize = 0;
    const max_passes = in.len * 2 + 2;
    while (guard < max_passes) : (guard += 1) {
        while (nbits <= 56 and ip < in.len) {
            acc = (acc << 8) | in[ip];
            ip += 1;
            nbits += 8;
        }
        if (nbits == 0) break;
        // The next 30 bits, left-aligned; missing bits read as ones (the
        // EOS prefix), so a short tail cannot match a code.
        const v: u32 = if (nbits >= max_code_len)
            @intCast((acc >> @intCast(nbits - max_code_len)) & 0x3fffffff)
        else
            @intCast(((acc << @intCast(max_code_len - nbits)) | ((@as(u64, 1) << @intCast(max_code_len - nbits)) - 1)) & 0x3fffffff);
        var sym: u16 = undefined;
        var len: u32 = 0;
        const t = huff.top[v >> 22];
        if (t.len != 0) {
            sym = t.sym;
            len = t.len;
        } else {
            var l: u32 = 9;
            while (l <= max_code_len) : (l += 1) {
                const c = v >> @intCast(max_code_len - l);
                if (c >= huff.first[l] and c - huff.first[l] < huff.count[l]) {
                    sym = huff.sorted[huff.offset[l] + c - huff.first[l]];
                    len = l;
                    break;
                }
            }
            if (len == 0) return error.Compression;
        }
        if (len > nbits) {
            // Only padding is left: fewer than 8 bits, all ones.
            if (nbits > 7) return error.Compression;
            const mask = (@as(u64, 1) << @intCast(nbits)) - 1;
            if (acc & mask != mask) return error.Compression;
            break;
        }
        if (sym == eos_sym) return error.Compression;
        if (op >= out.len) return error.FieldTooLarge;
        out[op] = @intCast(sym);
        op += 1;
        nbits -= len;
        acc &= (@as(u64, 1) << @intCast(nbits)) - 1;
    }
    std.debug.assert(op <= out.len);
    return out[0..op];
}

/// The Huffman-coded length of `s` in bytes.
pub fn huffmanLen(s: []const u8) usize {
    var bits: usize = 0;
    for (s) |c| bits += huff_lens[c];
    return (bits + 7) / 8;
}

pub fn huffmanEncode(s: []const u8, out: []u8, len: *usize) error{NoSpace}!void {
    var acc: u64 = 0;
    var nbits: u32 = 0;
    for (s) |c| {
        acc = (acc << @intCast(huff_lens[c])) | huff_codes[c];
        nbits += huff_lens[c];
        while (nbits >= 8) {
            nbits -= 8;
            try putByte(out, len, @truncate(acc >> @intCast(nbits)));
        }
        acc &= (@as(u64, 1) << @intCast(nbits)) - 1;
    }
    if (nbits > 0) {
        // Pad with the most significant bits of EOS (ones).
        const pad: u8 = @intCast((@as(u32, 1) << @intCast(8 - nbits)) - 1);
        try putByte(out, len, @as(u8, @truncate(acc << @intCast(8 - nbits))) | pad);
    }
}

// ---- decoder ----------------------------------------------------------------------

pub const Entry = struct { off: u32, nlen: u32, vlen: u32 };

/// Buffers of a decoder, sized for a table limit of `table_bytes` and
/// fields of up to `field_bytes` (name and value together).
pub fn entriesFor(table_bytes: u32) u32 {
    return table_bytes / entry_overhead + 1;
}

pub const Decoder = struct {
    /// Names and values of the entries, oldest first, wrapping.
    ring: []u8,
    ents: []Entry,
    /// The decoded field: name then value.
    scratch: []u8,
    /// The ring slot of the oldest entry.
    oldest: u32 = 0,
    count: u32 = 0,
    /// Where the next entry's bytes go in `ring`.
    wpos: u32 = 0,
    /// Table size as RFC 7541 4.1 counts it.
    size: u32 = 0,
    /// The size the encoder last set, at most `limit`.
    max_size: u32,
    /// SETTINGS_HEADER_TABLE_SIZE that we sent.
    limit: u32,

    pub fn init(ring: []u8, ents: []Entry, scratch: []u8) Decoder {
        std.debug.assert(ents.len >= entriesFor(@intCast(ring.len)));
        std.debug.assert(scratch.len >= 64);
        return .{ .ring = ring, .ents = ents, .scratch = scratch, .max_size = @intCast(ring.len), .limit = @intCast(ring.len) };
    }

    pub fn reset(d: *Decoder) void {
        d.oldest = 0;
        d.count = 0;
        d.wpos = 0;
        d.size = 0;
        d.max_size = d.limit;
    }

    /// Decode one complete header block. `sink.field(name, value)` gets
    /// each field in order.
    pub fn decode(d: *Decoder, block: []const u8, sink: anytype) (Error || std.meta.Child(@TypeOf(sink)).Err)!void {
        var pos: usize = 0;
        var fields: u32 = 0;
        // Every representation takes at least one byte.
        var guard: usize = 0;
        while (pos < block.len and guard <= block.len) : (guard += 1) {
            const b = block[pos];
            if (b & 0x80 != 0) {
                // Indexed field.
                const idx = try decodeInt(block, &pos, 7);
                const f = try d.lookup(idx, true);
                try sink.field(f.name, f.value);
                fields += 1;
            } else if (b & 0xc0 == 0x40) {
                const f = try d.literal(block, &pos, 6);
                try sink.field(f.name, f.value);
                fields += 1;
                d.insert(f.name, f.value);
            } else if (b & 0xe0 == 0x20) {
                // Dynamic table size update: only before the first field.
                if (fields > 0) return error.Compression;
                const n = try decodeInt(block, &pos, 5);
                if (n > d.limit) return error.Compression;
                d.max_size = n;
                d.evictTo(n);
            } else {
                // Without indexing (0000) or never indexed (0001).
                const f = try d.literal(block, &pos, 4);
                try sink.field(f.name, f.value);
                fields += 1;
            }
        }
        std.debug.assert(d.size <= d.max_size);
    }

    const Field = struct { name: []const u8, value: []const u8 };

    /// A field by index (1-based; static then dynamic). With `copy_value`
    /// the value comes too; else only the name.
    fn lookup(d: *Decoder, idx: u32, copy_value: bool) Error!Field {
        if (idx == 0) return error.Compression;
        if (idx <= static_table.len) {
            const s = static_table[idx - 1];
            return .{ .name = s.name, .value = if (copy_value) s.value else "" };
        }
        const di = idx - static_table.len - 1;
        if (di >= d.count) return error.Compression;
        const e = d.ents[(d.oldest + d.count - 1 - di) % d.ents.len];
        const need = e.nlen + (if (copy_value) e.vlen else 0);
        if (need > d.scratch.len) return error.FieldTooLarge;
        d.ringRead(e.off, d.scratch[0..e.nlen]);
        if (copy_value) d.ringRead(@intCast((e.off + e.nlen) % d.ring.len), d.scratch[e.nlen..][0..e.vlen]);
        return .{ .name = d.scratch[0..e.nlen], .value = if (copy_value) d.scratch[e.nlen..][0..e.vlen] else "" };
    }

    fn literal(d: *Decoder, block: []const u8, pos: *usize, prefix: u4) Error!Field {
        const idx = try decodeInt(block, pos, prefix);
        var name: []const u8 = undefined;
        if (idx == 0) {
            name = try readString(block, pos, d.scratch);
        } else {
            name = (try d.lookup(idx, false)).name;
        }
        // The value goes after the name in scratch; a static name stays
        // where it is.
        const name_in_scratch = name.len > 0 and name.ptr == d.scratch.ptr;
        const vstart = if (name_in_scratch) name.len else 0;
        const value = try readString(block, pos, d.scratch[vstart..]);
        return .{ .name = name, .value = value };
    }

    fn readString(block: []const u8, pos: *usize, out: []u8) Error![]const u8 {
        if (pos.* >= block.len) return error.Compression;
        const huffman = block[pos.*] & 0x80 != 0;
        const n = try decodeInt(block, pos, 7);
        if (n > block.len - pos.*) return error.Compression;
        const raw = block[pos.*..][0..n];
        pos.* += n;
        if (huffman) return huffmanDecode(raw, out);
        if (n > out.len) return error.FieldTooLarge;
        @memcpy(out[0..n], raw);
        return out[0..n];
    }

    fn ringRead(d: *const Decoder, off: u32, dst: []u8) void {
        const first = @min(dst.len, d.ring.len - off);
        @memcpy(dst[0..first], d.ring[off..][0..first]);
        @memcpy(dst[first..], d.ring[0 .. dst.len - first]);
    }

    fn ringWrite(d: *Decoder, src: []const u8) void {
        const first = @min(src.len, d.ring.len - d.wpos);
        @memcpy(d.ring[d.wpos..][0..first], src[0..first]);
        @memcpy(d.ring[0 .. src.len - first], src[first..]);
        d.wpos = @intCast((d.wpos + src.len) % d.ring.len);
    }

    fn evictTo(d: *Decoder, max: u32) void {
        var guard: u32 = 0;
        while (d.size > max and d.count > 0 and guard < d.ents.len) : (guard += 1) {
            const e = d.ents[d.oldest];
            d.size -= e.nlen + e.vlen + entry_overhead;
            d.oldest = @intCast((d.oldest + 1) % d.ents.len);
            d.count -= 1;
        }
        if (d.count == 0) d.wpos = 0;
        std.debug.assert(d.size <= max);
    }

    /// Add an entry (RFC 7541 4.4). `name` and `value` are in scratch or
    /// static memory, never in the ring, so eviction cannot clobber them.
    fn insert(d: *Decoder, name: []const u8, value: []const u8) void {
        const esz: u64 = @as(u64, name.len) + value.len + entry_overhead;
        if (esz > d.max_size) {
            d.evictTo(0);
            return;
        }
        d.evictTo(d.max_size - @as(u32, @intCast(esz)));
        std.debug.assert(d.count < d.ents.len);
        const slot = (d.oldest + d.count) % d.ents.len;
        d.ents[slot] = .{ .off = d.wpos, .nlen = @intCast(name.len), .vlen = @intCast(value.len) };
        d.ringWrite(name);
        d.ringWrite(value);
        d.count += 1;
        d.size += @intCast(esz);
        std.debug.assert(d.size <= d.max_size);
    }
};

// ---- encoder ----------------------------------------------------------------------

/// The static index of each name (its first entry), and of each name and
/// value pair with a value. Built at compile time: a request encodes a few
/// fields, and a linear scan with string compares showed in profiles.
const name_index = blk: {
    @setEvalBranchQuota(100_000);
    var kvs: [static_table.len]struct { []const u8, u32 } = undefined;
    var n: usize = 0;
    for (static_table, 0..) |e, i| {
        var seen = false;
        for (kvs[0..n]) |kv| {
            if (std.mem.eql(u8, kv[0], e.name)) seen = true;
        }
        if (seen) continue;
        kvs[n] = .{ e.name, @intCast(i + 1) };
        n += 1;
    }
    const final = kvs[0..n].*;
    break :blk std.StaticStringMap(u32).initComptime(final);
};

const pair_index = blk: {
    @setEvalBranchQuota(100_000);
    var kvs: [static_table.len]struct { []const u8, u32 } = undefined;
    var n: usize = 0;
    for (static_table, 0..) |e, i| {
        if (e.value.len == 0) continue;
        kvs[n] = .{ e.name ++ "\x00" ++ e.value, @intCast(i + 1) };
        n += 1;
    }
    const final = kvs[0..n].*;
    break :blk std.StaticStringMap(u32).initComptime(final);
};

/// The static index of a name, or 0.
pub fn staticNameIndex(name: []const u8) u32 {
    return name_index.get(name) orelse 0;
}

/// The static index of a name and value pair, or 0. Only `:method`,
/// `:path`, `:scheme`, `:status` and `accept-encoding` have pairs.
pub fn staticPairIndex(name: []const u8, value: []const u8) u32 {
    if (name.len == 0 or (name[0] != ':' and !std.mem.eql(u8, name, "accept-encoding"))) return 0;
    var b: [32]u8 = undefined;
    if (name.len + 1 + value.len > b.len) return 0;
    @memcpy(b[0..name.len], name);
    b[name.len] = 0;
    @memcpy(b[name.len + 1 ..][0..value.len], value);
    return pair_index.get(b[0 .. name.len + 1 + value.len]) orelse 0;
}

/// A raw string literal. Huffman coding would save about a fifth of the
/// bytes, but CPU, not bytes, is the bound of the client: it is not used.
fn encodeString(out: []u8, len: *usize, s: []const u8) error{NoSpace}!void {
    try encodeInt(out, len, 0, 7, @intCast(s.len));
    try putBytes(out, len, s);
}

/// One field, never added to the peer's table. `name` must be lower
/// case. `sensitive` uses the never-indexed form (credentials, cookies).
pub fn encodeField(out: []u8, len: *usize, name: []const u8, value: []const u8, sensitive: bool) error{NoSpace}!void {
    if (!sensitive) {
        const pair = staticPairIndex(name, value);
        if (pair != 0) return encodeInt(out, len, 0x80, 7, pair);
    }
    const first: u8 = if (sensitive) 0x10 else 0x00;
    const ni = staticNameIndex(name);
    if (ni != 0) {
        try encodeInt(out, len, first, 4, ni);
    } else {
        try encodeInt(out, len, first, 4, 0);
        try encodeString(out, len, name);
    }
    try encodeString(out, len, value);
}

// ---- tests ------------------------------------------------------------------------

const Collect = struct {
    buf: [4096]u8 = undefined,
    len: usize = 0,
    const Err = error{};

    fn field(c: *Collect, name: []const u8, value: []const u8) Err!void {
        const w = std.fmt.bufPrint(c.buf[c.len..], "[{s}: {s}]", .{ name, value }) catch unreachable;
        c.len += w.len;
    }

    fn text(c: *const Collect) []const u8 {
        return c.buf[0..c.len];
    }
};

fn hexBytes(comptime hex: []const u8) [hexLen(hex)]u8 {
    var out: [hexLen(hex)]u8 = undefined;
    var n: usize = 0;
    var i: usize = 0;
    while (i < hex.len) {
        if (hex[i] == ' ') {
            i += 1;
            continue;
        }
        out[n] = std.fmt.parseInt(u8, hex[i .. i + 2], 16) catch unreachable;
        n += 1;
        i += 2;
    }
    return out;
}

fn hexLen(comptime hex: []const u8) usize {
    var n: usize = 0;
    for (hex) |c| {
        if (c != ' ') n += 1;
    }
    return n / 2;
}

const TestDecoder = struct {
    ring: [4096]u8 = undefined,
    ents: [entriesFor(4096)]Entry = undefined,
    scratch: [1024]u8 = undefined,
    d: Decoder = undefined,

    fn init(t: *TestDecoder, limit: u32) void {
        t.d = Decoder.init(t.ring[0..limit], t.ents[0..entriesFor(limit)], &t.scratch);
    }
};

fn expectBlocks(limit: u32, comptime blocks: []const []const u8, want: []const []const u8, sizes: []const u32) !void {
    var t: TestDecoder = .{};
    t.init(limit);
    inline for (blocks, 0..) |hex, i| {
        var c: Collect = .{};
        const raw = hexBytes(hex);
        try t.d.decode(&raw, &c);
        try std.testing.expectEqualStrings(want[i], c.text());
        try std.testing.expectEqual(sizes[i], t.d.size);
    }
}

test "hpack: RFC 7541 C.2 field representations" {
    try expectBlocks(4096, &.{"400a 6375 7374 6f6d 2d6b 6579 0d63 7573 746f 6d2d 6865 6164 6572"}, &.{"[custom-key: custom-header]"}, &.{55});
    try expectBlocks(4096, &.{"040c 2f73 616d 706c 652f 7061 7468"}, &.{"[:path: /sample/path]"}, &.{0});
    try expectBlocks(4096, &.{"1008 7061 7373 776f 7264 0673 6563 7265 74"}, &.{"[password: secret]"}, &.{0});
    try expectBlocks(4096, &.{"82"}, &.{"[:method: GET]"}, &.{0});
}

const c3_want = [_][]const u8{
    "[:method: GET][:scheme: http][:path: /][:authority: www.example.com]",
    "[:method: GET][:scheme: http][:path: /][:authority: www.example.com][cache-control: no-cache]",
    "[:method: GET][:scheme: https][:path: /index.html][:authority: www.example.com][custom-key: custom-value]",
};

test "hpack: RFC 7541 C.3 requests without Huffman" {
    try expectBlocks(4096, &.{
        "8286 8441 0f77 7777 2e65 7861 6d70 6c65 2e63 6f6d",
        "8286 84be 5808 6e6f 2d63 6163 6865",
        "8287 85bf 400a 6375 7374 6f6d 2d6b 6579 0c63 7573 746f 6d2d 7661 6c75 65",
    }, &c3_want, &.{ 57, 110, 164 });
}

test "hpack: RFC 7541 C.4 requests with Huffman" {
    try expectBlocks(4096, &.{
        "8286 8441 8cf1 e3c2 e5f2 3a6b a0ab 90f4 ff",
        "8286 84be 5886 a8eb 1064 9cbf",
        "8287 85bf 4088 25a8 49e9 5ba9 7d7f 8925 a849 e95b b8e8 b4bf",
    }, &c3_want, &.{ 57, 110, 164 });
}

const c5_want = [_][]const u8{
    "[:status: 302][cache-control: private][date: Mon, 21 Oct 2013 20:13:21 GMT][location: https://www.example.com]",
    "[:status: 307][cache-control: private][date: Mon, 21 Oct 2013 20:13:21 GMT][location: https://www.example.com]",
    "[:status: 200][cache-control: private][date: Mon, 21 Oct 2013 20:13:22 GMT][location: https://www.example.com][content-encoding: gzip][set-cookie: foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1]",
};

test "hpack: RFC 7541 C.5 responses without Huffman (eviction, table size 256)" {
    try expectBlocks(256, &.{
        "4803 3330 3258 0770 7269 7661 7465 611d 4d6f 6e2c 2032 3120 4f63 7420 3230 3133 2032 303a 3133 3a32 3120 474d 546e 1768 7474 7073 3a2f 2f77 7777 2e65 7861 6d70 6c65 2e63 6f6d",
        "4803 3330 37c1 c0bf",
        "88c1 611d 4d6f 6e2c 2032 3120 4f63 7420 3230 3133 2032 303a 3133 3a32 3220 474d 54c0 5a04 677a 6970 7738 666f 6f3d 4153 444a 4b48 514b 425a 584f 5157 454f 5049 5541 5851 5745 4f49 553b 206d 6178 2d61 6765 3d33 3630 303b 2076 6572 7369 6f6e 3d31",
    }, &c5_want, &.{ 222, 222, 215 });
}

test "hpack: RFC 7541 C.6 responses with Huffman (eviction, table size 256)" {
    try expectBlocks(256, &.{
        "4882 6402 5885 aec3 771a 4b61 96d0 7abe 9410 54d4 44a8 2005 9504 0b81 66e0 82a6 2d1b ff6e 919d 29ad 1718 63c7 8f0b 97c8 e9ae 82ae 43d3",
        "4883 640e ffc1 c0bf",
        "88c1 6196 d07a be94 1054 d444 a820 0595 040b 8166 e084 a62d 1bff c05a 839b d9ab 77ad 94e7 821d d7f2 e6c7 b335 dfdf cd5b 3960 d5af 2708 7f36 72c1 ab27 0fb5 291f 9587 3160 65c0 03ed 4ee5 b106 3d50 07",
    }, &c5_want, &.{ 222, 222, 215 });
}

test "hpack: RFC 7541 C.1 integers" {
    var buf: [8]u8 = undefined;
    var n: usize = 0;
    try encodeInt(&buf, &n, 0, 5, 10);
    try std.testing.expectEqualSlices(u8, &.{0x0a}, buf[0..n]);
    n = 0;
    try encodeInt(&buf, &n, 0, 5, 1337);
    try std.testing.expectEqualSlices(u8, &.{ 0x1f, 0x9a, 0x0a }, buf[0..n]);
    n = 0;
    try encodeInt(&buf, &n, 0, 8, 42);
    try std.testing.expectEqualSlices(u8, &.{0x2a}, buf[0..n]);
    var pos: usize = 0;
    try std.testing.expectEqual(@as(u32, 1337), try decodeInt(&.{ 0x1f, 0x9a, 0x0a }, &pos, 5));
    pos = 0;
    try std.testing.expectError(error.Compression, decodeInt(&.{ 0x1f, 0xff, 0xff, 0xff, 0xff, 0x01 }, &pos, 5));
}

test "hpack: Huffman round trip of every byte and the RFC strings" {
    var src: [256]u8 = undefined;
    for (&src, 0..) |*c, i| c.* = @intCast(i);
    var enc: [1024]u8 = undefined;
    var n: usize = 0;
    try huffmanEncode(&src, &enc, &n);
    try std.testing.expectEqual(huffmanLen(&src), n);
    var dec: [256]u8 = undefined;
    try std.testing.expectEqualSlices(u8, &src, try huffmanDecode(enc[0..n], &dec));
    n = 0;
    try huffmanEncode("www.example.com", &enc, &n);
    try std.testing.expectEqualSlices(u8, &hexBytes("f1e3 c2e5 f23a 6ba0 ab90 f4ff"), enc[0..n]);
    n = 0;
    try huffmanEncode("custom-value", &enc, &n);
    try std.testing.expectEqualSlices(u8, &hexBytes("25a8 49e9 5bb8 e8b4 bf"), enc[0..n]);
}

test "hpack: bad Huffman padding and EOS are refused" {
    var out: [16]u8 = undefined;
    // 'a' (00011) then 8 one bits of padding: too long.
    try std.testing.expectError(error.Compression, huffmanDecode(&.{ 0x1f, 0xff }, &out));
    // 'a' then padding with a zero bit.
    try std.testing.expectError(error.Compression, huffmanDecode(&.{0x1e}, &out));
    // EOS in full.
    try std.testing.expectError(error.Compression, huffmanDecode(&.{ 0xff, 0xff, 0xff, 0xff }, &out));
    try std.testing.expectEqualStrings("a", try huffmanDecode(&.{0x1f}, &out));
}

test "hpack: encoded fields decode to the same fields" {
    var buf: [512]u8 = undefined;
    var n: usize = 0;
    try encodeField(&buf, &n, ":method", "GET", false);
    try encodeField(&buf, &n, ":path", "/a/b?c=1", false);
    try encodeField(&buf, &n, "authorization", "Bearer x", true);
    try encodeField(&buf, &n, "x-custom", "Value 1", false);
    try std.testing.expectEqual(@as(u8, 0x82), buf[0]);
    var t: TestDecoder = .{};
    t.init(4096);
    var c: Collect = .{};
    try t.d.decode(buf[0..n], &c);
    try std.testing.expectEqualStrings("[:method: GET][:path: /a/b?c=1][authorization: Bearer x][x-custom: Value 1]", c.text());
    try std.testing.expectEqual(@as(u32, 0), t.d.count);
}

test "hpack: a size update above the limit, a bad index and a late size update are errors" {
    var t: TestDecoder = .{};
    t.init(256);
    var c: Collect = .{};
    try std.testing.expectError(error.Compression, t.d.decode(&.{ 0x3f, 0xe1, 0x1f }, &c));
    try std.testing.expectError(error.Compression, t.d.decode(&.{0xbe}, &c));
    try std.testing.expectError(error.Compression, t.d.decode(&.{0x80}, &c));
    try std.testing.expectError(error.Compression, t.d.decode(&.{ 0x82, 0x20 }, &c));
    try t.d.decode(&.{ 0x20, 0x82 }, &c);
    try std.testing.expectEqual(@as(u32, 0), t.d.max_size);
}

test "hpack: entries wrap around the ring and keep their bytes" {
    var t: TestDecoder = .{};
    t.init(128);
    var buf: [128]u8 = undefined;
    var round: u32 = 0;
    while (round < 50) : (round += 1) {
        var n: usize = 0;
        var nb: [8]u8 = undefined;
        var vb: [24]u8 = undefined;
        const name = std.fmt.bufPrint(&nb, "n{d}", .{round}) catch unreachable;
        const value = std.fmt.bufPrint(&vb, "value-{d}-{d}", .{ round, round * 7 }) catch unreachable;
        // Literal with incremental indexing, new name.
        try encodeInt(&buf, &n, 0x40, 6, 0);
        try encodeInt(&buf, &n, 0, 7, @intCast(name.len));
        @memcpy(buf[n..][0..name.len], name);
        n += name.len;
        try encodeInt(&buf, &n, 0, 7, @intCast(value.len));
        @memcpy(buf[n..][0..value.len], value);
        n += value.len;
        // Then the new entry by index (62).
        buf[n] = 0x80 | 62;
        n += 1;
        var c: Collect = .{};
        try t.d.decode(buf[0..n], &c);
        var wb: [128]u8 = undefined;
        const want = std.fmt.bufPrint(&wb, "[{s}: {s}][{s}: {s}]", .{ name, value, name, value }) catch unreachable;
        try std.testing.expectEqualStrings(want, c.text());
        try std.testing.expect(t.d.size <= 128);
    }
}
