//! The fast JSON codec behind `json.zig`.
//!
//! Decode runs in two stages. Stage 1 classifies 64 bytes at a time with
//! vector compares into bit masks: the quotes that no backslash escapes,
//! the bytes inside strings (a prefix XOR of the quote mask), the
//! structural characters outside strings, and the first byte of each
//! number or literal. Stage 2 takes the set bits in order and builds the
//! values straight into the region. It builds bottom-up: the members of an
//! open container wait on a fixed value stack, and the container is
//! allocated once, at its close, at its final size. No index array is kept:
//! stage 2 asks stage 1 for the next block when the bits run out.
//!
//! Encode scans strings 16 bytes at a time for the bytes that need an
//! escape and copies the runs between them in one move. It writes integers
//! and short decimals without the shortest-digits search.
//!
//! The results are the same as those of the reference codec
//! (`json_ref.zig`), except where the reference differs from JSON.parse
//! (see its header). `json.zig` fuzzes both directions against it.
const std = @import("std");
const builtin = @import("builtin");
const value = @import("value.zig");
const heap = @import("heap.zig");
const numfmt = @import("numfmt.zig");
const ops = @import("ops.zig");
const Builder = @import("arena.zig").Builder;
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;
const assert = std.debug.assert;

pub const DecodeError = Err || error{Syntax};

/// Bounds checks stay in Debug (unit tests and seeds); the hot loops below
/// were checked by the differential fuzz target in Debug.
const checked = builtin.mode == .debug;

// ---- stage 1: classify 64-byte blocks --------------------------------------------

const V64 = @Vector(64, u8);
const V16 = @Vector(16, u8);

inline fn sp64(c: u8) V64 {
    return @splat(c);
}

inline fn eq64(v: V64, c: u8) u64 {
    return @bitCast(v == @as(V64, @splat(c)));
}

/// Bit i is the XOR of bits 0..i: 1 from an opening quote up to the byte
/// before its closing quote.
inline fn prefixXor(x0: u64) u64 {
    var x = x0;
    x ^= x << 1;
    x ^= x << 2;
    x ^= x << 4;
    x ^= x << 8;
    x ^= x << 16;
    x ^= x << 32;
    return x;
}

/// Bytes that are part of a number or a literal (or an error): not
/// whitespace, not a structural character, not a quote.
pub fn isOther(c: u8) bool {
    return switch (c) {
        ' ', '\t', '\n', '\r', '{', '}', '[', ']', ':', ',', '"' => false,
        else => true,
    };
}

pub const Scanner = struct {
    src: []const u8,
    /// The offset of the block whose bits are in `bits`.
    base: usize = 0,
    /// The offset of the next block to classify.
    next_block: usize = 0,
    /// Structural positions of the current block not yet taken.
    bits: u64 = 0,
    /// All ones when the last block ended inside a string.
    in_string: u64 = 0,
    /// 1 when the last byte of the last block was an unescaped backslash.
    escape_next: u64 = 0,
    /// 1 when the last byte of the last block was part of a scalar.
    scalar_prev: u64 = 0,

    /// The position of the next structural byte: a structural character
    /// outside strings, a quote that opens or closes a string, or the first
    /// byte of a number or literal.
    pub inline fn next(s: *Scanner) ?u32 {
        while (s.bits == 0) {
            if (s.next_block >= s.src.len) return null;
            s.classify();
        }
        const i = s.base + @ctz(s.bits);
        s.bits &= s.bits - 1;
        return @intCast(i);
    }

    fn classify(s: *Scanner) void {
        @setRuntimeSafety(checked);
        const start = s.next_block;
        assert(start < s.src.len);
        var v: V64 = undefined;
        if (start + 64 <= s.src.len) {
            v = s.src[start..][0..64].*;
        } else {
            // The last block: spaces after the end change no mask.
            var pad: [64]u8 = @splat(' ');
            @memcpy(pad[0 .. s.src.len - start], s.src[start..]);
            v = pad;
        }
        s.base = start;
        s.next_block = start + 64;
        const escaped = s.escapes(eq64(v, '\\'));
        const quotes = eq64(v, '"') & ~escaped;
        const inside = prefixXor(quotes) ^ s.in_string;
        s.in_string = @bitCast(@as(i64, @bitCast(inside)) >> 63);
        // `[` and `{` differ only in bit 5, as do `]` and `}`.
        const lower = v | @as(V64, @splat(0x20));
        // OR the compares as vectors: each move to a bit mask costs more
        // than a compare on targets without a mask instruction.
        const op: u64 = @bitCast((lower == sp64('{')) | (lower == sp64('}')) | (v == sp64(':')) | (v == sp64(',')));
        const ws: u64 = @bitCast((v == sp64(' ')) | (v == sp64('\t')) | (v == sp64('\n')) | (v == sp64('\r')));
        const outside = ~(inside | quotes);
        const scalar = outside & ~(op | ws);
        const scalar_start = scalar & ~((scalar << 1) | s.scalar_prev);
        s.scalar_prev = scalar >> 63;
        s.bits = (op & outside) | quotes | scalar_start;
    }

    /// The bytes that an unescaped backslash escapes. Backslashes are rare,
    /// so this walks them one at a time: at most 32 per block.
    fn escapes(s: *Scanner, bs_in: u64) u64 {
        if (bs_in == 0 and s.escape_next == 0) return 0;
        var bs = bs_in;
        var esc: u64 = 0;
        if (s.escape_next != 0) {
            // The first byte is escaped; a backslash there escapes nothing.
            esc = 1;
            bs &= ~@as(u64, 1);
        }
        s.escape_next = 0;
        var n: u32 = 0;
        while (bs != 0) : (n += 1) {
            assert(n < 32);
            const i: u6 = @intCast(@ctz(bs));
            if (i == 63) {
                s.escape_next = 1;
                break;
            }
            const after: u6 = i + 1;
            esc |= @as(u64, 1) << after;
            // Bits 0..after are done: the escaped byte is taken.
            bs &= ~((@as(u64, 2) << after) -% 1);
        }
        return esc;
    }
};

// ---- stage 2: build values ---------------------------------------------------------

/// Members of open containers wait here until their container closes. A
/// container with more members goes to the region in parts (`flush`).
const stack_cap = 1024;

const Frame = struct {
    /// The region container, once a flush made it; else undefined.
    container: Value,
    /// The first value-stack slot of this container's members.
    base: u32,
    /// Where the value of the current object member goes: a value-stack
    /// slot, or an entry index of `container` when `tgt_region`.
    tgt: u32 = 0,
    is_obj: bool,
    tgt_region: bool = false,
    /// One bit for each key hash seen (low 6 bits): a key whose bit is
    /// clear is new, with no search.
    bloom: u64 = 0,
};

/// Object keys repeat, in arrays of objects most of all: one string per
/// distinct key (a small direct-mapped cache), not one per occurrence.
/// Equal keys are then the same value, which `objFindValue` compares first.
const KeyCache = struct {
    vals: [64]Value,
    hashes: [64]u32,
    /// Where the key's bytes are in the source, to compare without the region.
    offs: [64]u32,
    lens: [64]u32,
};

const Decoder = struct {
    vm: *Vm,
    src: []const u8,
    sc: Scanner,
    frames: *[ops.max_depth]Frame,
    sp: u32 = 0,
    vals: *[stack_cap]Value,
    /// Key hashes, at the key's slot of `vals`.
    hashes: *[stack_cap]u32,
    top: u32 = 0,
    keys: *KeyCache,

    const State = enum { value, key, after };

    fn run(d: *Decoder) DecodeError!Value {
        const src = d.src;
        var pos: u32 = d.sc.next() orelse return error.Syntax;
        var v: Value = value.undef;
        state: switch (State.value) {
            .value => switch (src[pos]) {
                '{', '[' => {
                    const is_obj = src[pos] == '{';
                    try d.open(is_obj);
                    pos = d.sc.next() orelse return error.Syntax;
                    if (src[pos] == @as(u8, if (is_obj) '}' else ']')) {
                        v = try d.close();
                        continue :state .after;
                    }
                    continue :state if (is_obj) .key else .value;
                },
                '"' => {
                    v = try d.string(pos);
                    continue :state .after;
                },
                't' => {
                    v = try d.literal(pos, "true", value.true_);
                    continue :state .after;
                },
                'f' => {
                    v = try d.literal(pos, "false", value.false_);
                    continue :state .after;
                },
                'n' => {
                    v = try d.literal(pos, "null", value.null_);
                    continue :state .after;
                },
                else => {
                    v = value.num(try numberAt(d.src, pos));
                    continue :state .after;
                },
            },
            .key => {
                if (src[pos] != '"') return error.Syntax;
                try d.key(pos);
                const colon = d.sc.next() orelse return error.Syntax;
                if (src[colon] != ':') return error.Syntax;
                pos = d.sc.next() orelse return error.Syntax;
                continue :state .value;
            },
            .after => {
                if (d.sp == 0) {
                    if (d.sc.next() != null) return error.Syntax;
                    assert(d.top == 0);
                    return v;
                }
                try d.add(v);
                const t = d.sc.next() orelse return error.Syntax;
                const is_obj = d.frames[d.sp - 1].is_obj;
                if (src[t] == ',') {
                    pos = d.sc.next() orelse return error.Syntax;
                    continue :state if (is_obj) .key else .value;
                }
                if (src[t] == @as(u8, if (is_obj) '}' else ']')) {
                    v = try d.close();
                    continue :state .after;
                }
                return error.Syntax;
            },
        }
    }

    fn open(d: *Decoder, is_obj: bool) DecodeError!void {
        if (d.sp == ops.max_depth) return d.vm.limit(.depth);
        d.frames[d.sp] = .{ .container = value.undef, .base = d.top, .is_obj = is_obj };
        d.sp += 1;
    }

    /// Close the top container and return it.
    fn close(d: *Decoder) DecodeError!Value {
        assert(d.sp > 0);
        const f = &d.frames[d.sp - 1];
        const items = d.vals[f.base..d.top];
        const v = if (f.container == value.undef) try d.build(f.is_obj, items) else blk: {
            try d.append(f.container, f.is_obj, items);
            break :blk f.container;
        };
        d.top = f.base;
        d.sp -= 1;
        return v;
    }

    /// A new container holding `items` (key, value pairs for an object).
    fn build(d: *Decoder, is_obj: bool, items: []const Value) DecodeError!Value {
        const r = d.vm.r;
        if (is_obj) {
            assert(items.len % 2 == 0);
            const n: u32 = @intCast(items.len / 2);
            const o = try r.newObject(n);
            const obj = r.at(heap.Obj, value.payload(o));
            @memcpy(r.valsAt(obj.entries, n * 2), items);
            obj.count = n;
            return o;
        }
        const n: u32 = @intCast(items.len);
        const a = try r.newArray(n);
        const arr = r.at(heap.Arr, value.payload(a));
        @memcpy(r.valsAt(arr.items, n), items);
        arr.len = n;
        return a;
    }

    fn append(d: *Decoder, c: Value, is_obj: bool, items: []const Value) DecodeError!void {
        const r = d.vm.r;
        const off = value.payload(c);
        if (is_obj) {
            const n: u32 = @intCast(items.len / 2);
            try r.objReserve(off, n);
            const o = r.at(heap.Obj, off);
            @memcpy(r.valsAt(o.entries, (o.count + n) * 2)[o.count * 2 ..], items);
            o.count += n;
            return;
        }
        const n: u32 = @intCast(items.len);
        try r.arrReserve(off, n);
        const a = r.at(heap.Arr, off);
        @memcpy(r.valsAt(a.items, a.len + n)[a.len..], items);
        a.len += n;
    }

    /// The value stack is full: move the members of every open container
    /// into its region container. The stack is then empty.
    fn flush(d: *Decoder) DecodeError!void {
        var i: u32 = 0;
        while (i < d.sp) : (i += 1) {
            const f = &d.frames[i];
            const end = if (i + 1 < d.sp) d.frames[i + 1].base else d.top;
            assert(f.base <= end);
            const items = d.vals[f.base..end];
            if (items.len == 0) continue;
            var before: u32 = 0;
            if (f.container == value.undef) {
                f.container = try d.build(f.is_obj, items);
            } else {
                const r = d.vm.r;
                before = if (f.is_obj) r.at(heap.Obj, value.payload(f.container)).count else 0;
                try d.append(f.container, f.is_obj, items);
            }
            if (f.is_obj and !f.tgt_region and f.tgt >= f.base and f.tgt < end) {
                f.tgt_region = true;
                f.tgt = before + (f.tgt - f.base) / 2;
            }
        }
        for (d.frames[0..d.sp]) |*f| f.base = 0;
        d.top = 0;
    }

    /// Add a finished value to the top container.
    fn add(d: *Decoder, v: Value) DecodeError!void {
        const f = &d.frames[d.sp - 1];
        if (f.is_obj) {
            if (f.tgt_region) {
                d.vm.r.objEntries(value.payload(f.container))[f.tgt * 2 + 1] = v;
            } else {
                assert(f.tgt < d.top);
                d.vals[f.tgt] = v;
            }
            return;
        }
        if (d.top == stack_cap) try d.flush();
        d.vals[d.top] = v;
        d.top += 1;
    }

    /// An object key: find where its value goes. A repeated key keeps its
    /// first place and takes the last value, as JSON.parse does.
    fn member(d: *Decoder, k: Value, h: u32) DecodeError!void {
        if (d.top + 2 > stack_cap) try d.flush();
        const f = &d.frames[d.sp - 1];
        assert(f.is_obj);
        const bit = @as(u64, 1) << @intCast(h & 63);
        const seen = f.bloom & bit != 0;
        f.bloom |= bit;
        var i = if (seen) f.base else d.top;
        while (i < d.top) : (i += 2) {
            if (d.hashes[i] != h) continue;
            if (d.vals[i] == k or std.mem.eql(u8, d.vm.str(d.vals[i]), d.vm.str(k))) {
                f.tgt_region = false;
                f.tgt = i + 1;
                return;
            }
        }
        if (seen and f.container != value.undef) {
            if (d.vm.objFindValue(value.payload(f.container), k)) |idx| {
                f.tgt_region = true;
                f.tgt = idx;
                return;
            }
        }
        d.vals[d.top] = k;
        d.hashes[d.top] = h;
        d.vals[d.top + 1] = value.undef;
        f.tgt_region = false;
        f.tgt = d.top + 1;
        d.top += 2;
    }

    fn key(d: *Decoder, open_q: u32) DecodeError!void {
        const close_q = d.sc.next() orelse return error.Syntax;
        assert(d.src[close_q] == '"');
        const start = open_q + 1;
        const j: u32 = @intCast(findSpecial(d.src, start, close_q));
        if (j < close_q) {
            const k = try d.stringSlow(start, close_q, j);
            return d.member(k, hashKey(d.vm.str(k)));
        }
        const bytes = d.src[start..close_q];
        const h = hashKey(bytes);
        const slot = (h >> 8) & (d.keys.vals.len - 1);
        const hit = d.keys.vals[slot];
        if (hit != value.undef and d.keys.hashes[slot] == h and d.keys.lens[slot] == bytes.len) {
            if (srcEql(d.src, d.keys.offs[slot], start, bytes.len)) return d.member(hit, h);
        }
        // A key that is a module string is that constant: no copy, and a
        // property read of it matches by identity.
        const k = if (d.vm.m.internKey(bytes, h)) |si| value.constString(si) else try newStrFrom(d.vm.r, d.src, start, @intCast(bytes.len), @intCast(bytes.len));
        d.keys.vals[slot] = k;
        d.keys.hashes[slot] = h;
        d.keys.offs[slot] = start;
        d.keys.lens[slot] = @intCast(bytes.len);
        return d.member(k, h);
    }

    fn string(d: *Decoder, open_q: u32) DecodeError!Value {
        const close_q = d.sc.next() orelse return error.Syntax;
        assert(d.src[close_q] == '"');
        const start = open_q + 1;
        const j: u32 = @intCast(findSpecial(d.src, start, close_q));
        // Plain ASCII: as many UTF-16 units as bytes, one copy.
        if (j == close_q) return newStrFrom(d.vm.r, d.src, start, close_q - start, close_q - start);
        return d.stringSlow(start, close_q, j);
    }

    /// A string with a byte at `j` that is not plain ASCII.
    fn stringSlow(d: *Decoder, start: u32, end: u32, j: u32) DecodeError!Value {
        @setRuntimeSafety(checked);
        const src = d.src;
        // Valid UTF-8 and no escapes: one copy, counting UTF-16 units.
        var units: u32 = j - start;
        var i: u32 = j;
        while (i < end) {
            const c = src[i];
            if (c >= 0x80) {
                const n = seqLen(src[i..end]);
                if (n == 0) return d.stringEscaped(start, end);
                units += if (n == 4) 2 else 1;
                i += n;
                continue;
            }
            if (c == '\\') return d.stringEscaped(start, end);
            if (c < 0x20) return error.Syntax;
            const k: u32 = @intCast(findSpecial(src, i, end));
            units += k - i;
            i = k;
        }
        return newStrFrom(d.vm.r, src, start, end - start, units);
    }

    /// A string with escapes or bytes that are not UTF-8. Each byte that
    /// does not start a valid UTF-8 sequence becomes U+FFFD, as Node.js
    /// decodes it, so strings stay valid UTF-8. Without such bytes the
    /// result is no longer than the source, so it is written in place in a
    /// region string of the source length, which then shrinks to fit.
    fn stringEscaped(d: *Decoder, start: u32, end: u32) DecodeError!Value {
        const r = d.vm.r;
        const len = end - start;
        const off = try r.alloc(.string, @sizeOf(heap.Str) + len);
        var direct: Direct = .{ .out = r.buf[off + @sizeOf(heap.Str) ..][0..len] };
        if (unescape(Direct, &direct, d.src, start, end)) |units| {
            // The string is the last object: give back the bytes not used.
            const size = heap.alignUp(@sizeOf(heap.Str) + direct.len);
            r.hdr(off).size = size;
            r.used = off + size;
            const st = r.at(heap.Str, off);
            st.len = direct.len;
            st.utf16_len = units;
            return value.box(.string, off);
        } else |e| {
            r.used = off;
            if (e != error.Grows) return @errorCast(e);
        }
        const t = d.vm.scratch.begin();
        defer t.end();
        var b = d.vm.scratch.builder();
        const units = try unescape(Builder, &b, d.src, start, end);
        return d.vm.r.newStringUnits(b.bytes(), units);
    }

    fn literal(d: *Decoder, pos: u32, comptime word: []const u8, v: Value) DecodeError!Value {
        if (d.src.len - pos < word.len or !std.mem.eql(u8, d.src[pos..][0..word.len], word)) return error.Syntax;
        if (!d.endsAt(pos + word.len)) return error.Syntax;
        return v;
    }

    /// True when the scalar that ends before `e` is whole: what follows is
    /// the end, whitespace, a structural character or a quote.
    fn endsAt(d: *const Decoder, e: usize) bool {
        return e >= d.src.len or !isOther(d.src[e]);
    }

    /// A JSON number. Up to 19 digits and an exponent within ±22 of an exact
    /// mantissa of 53 bits convert with one rounding (Clinger's fast path);
    /// others go to `std.fmt.parseFloat`.
    fn numberAt(s: []const u8, pos: u32) error{Syntax}!f64 {
        @setRuntimeSafety(checked);
        var i: usize = pos;
        const neg = s[i] == '-';
        if (neg) i += 1;
        var m: u64 = 0;
        var nd: u32 = 0;
        var frac: i32 = 0;
        if (i < s.len and s[i] == '0') {
            i += 1;
        } else {
            if (!(i < s.len and isDigit(s[i]))) return error.Syntax;
            while (i < s.len and isDigit(s[i])) : (i += 1) {
                if (nd < 19) m = m * 10 + (s[i] - '0');
                nd += 1;
            }
        }
        if (i < s.len and s[i] == '.') {
            i += 1;
            if (!(i < s.len and isDigit(s[i]))) return error.Syntax;
            while (i < s.len and isDigit(s[i])) : (i += 1) {
                if (nd < 19) {
                    m = m * 10 + (s[i] - '0');
                    frac += 1;
                }
                nd += 1;
            }
        }
        var e10: i32 = 0;
        if (i < s.len and (s[i] | 0x20) == 'e') {
            i += 1;
            var eneg = false;
            if (i < s.len and (s[i] == '+' or s[i] == '-')) {
                eneg = s[i] == '-';
                i += 1;
            }
            if (!(i < s.len and isDigit(s[i]))) return error.Syntax;
            var ev: i32 = 0;
            while (i < s.len and isDigit(s[i])) : (i += 1) {
                if (ev < 100_000) ev = ev * 10 + (s[i] - '0');
            }
            e10 = if (eneg) -ev else ev;
        }
        if (!(i >= s.len or !isOther(s[i]))) return error.Syntax;
        if (nd <= 19 and m <= (1 << 53)) {
            const e = e10 - frac;
            const fm: f64 = @floatFromInt(m);
            const f: ?f64 = if (e == 0) fm else if (e > 0 and e <= 22) fm * pow10[@intCast(e)] else if (e < 0 and e >= -22) fm / pow10[@intCast(-e)] else null;
            if (f) |x| return if (neg) -x else x;
        }
        return std.fmt.parseFloat(f64, s[pos..i]) catch error.Syntax;
    }
};

/// A region string of `src[start..][0..len]`, the same object as
/// `Region.newStringUnits` makes. Short strings copy in 16-byte moves, which
/// may read past the string inside `src` and write past it into the free
/// part of the region; a library `memcpy` call costs more than the copy.
fn newStrFrom(r: *heap.Region, src: []const u8, start: usize, len: u32, units: u32) Err!Value {
    @setRuntimeSafety(checked);
    if (builtin.mode == .debug) assert(units == heap.utf16Len(src[start..][0..len]));
    const off = try r.alloc(.string, @sizeOf(heap.Str) + len);
    const st = r.at(heap.Str, off);
    st.len = len;
    st.utf16_len = units;
    const dst: usize = off + @sizeOf(heap.Str);
    const span = (@as(usize, len) + 15) & ~@as(usize, 15);
    if (len <= 64 and start + span <= src.len and dst + span <= r.buf.len) {
        var k: usize = 0;
        while (k < span) : (k += 16) r.buf[dst + k ..][0..16].* = src[start + k ..][0..16].*;
    } else {
        @memcpy(r.buf[dst..][0..len], src[start..][0..len]);
    }
    return value.box(.string, off);
}

/// `src[a..][0..len] == src[b..][0..len]`; up to 16 bytes in one compare
/// when both 16-byte loads stay inside `src`.
inline fn srcEql(src: []const u8, a: usize, b: usize, len: usize) bool {
    if (len <= 16 and @max(a, b) + 16 <= src.len) {
        const x: V16 = src[a..][0..16].*;
        const y: V16 = src[b..][0..16].*;
        const diff: u16 = @bitCast(x != y);
        const live = if (len == 16) 0xFFFF else (@as(u16, 1) << @intCast(len)) - 1;
        return diff & live == 0;
    }
    return std.mem.eql(u8, src[a..][0..len], src[b..][0..len]);
}

/// A sink for `unescape` that writes into a fixed slice and refuses to grow
/// past the source length (U+FFFD for a bad byte is longer than the byte).
const Direct = struct {
    out: []u8,
    len: u32 = 0,

    fn append(w: *Direct, bytes: []const u8) error{Grows}!void {
        if (w.len + bytes.len > w.out.len) return error.Grows;
        @memcpy(w.out[w.len..][0..bytes.len], bytes);
        w.len += @intCast(bytes.len);
    }
    fn byte(w: *Direct, c: u8) error{Grows}!void {
        if (w.len + 1 > w.out.len) return error.Grows;
        w.out[w.len] = c;
        w.len += 1;
    }
};

/// Decode the string body `src[start..end]` into `sink` and return its
/// UTF-16 length.
pub fn unescape(comptime Sink: type, sink: *Sink, src: []const u8, start: u32, end: u32) !u32 {
    @setRuntimeSafety(checked);
    var units: u32 = 0;
    var i: usize = start;
    while (i < end) {
        const k = findSpecial(src, i, end);
        try sink.append(src[i..k]);
        units += @intCast(k - i);
        i = k;
        if (i == end) break;
        const c = src[i];
        if (c >= 0x80) {
            const n = seqLen(src[i..end]);
            if (n == 0) {
                if (Sink == Direct) return error.Grows;
                try sink.append("\u{FFFD}");
                units += 1;
                i += 1;
            } else {
                try sink.append(src[i..][0..n]);
                units += if (n == 4) 2 else 1;
                i += n;
            }
            continue;
        }
        if (c < 0x20) return error.Syntax;
        assert(c == '\\');
        // Stage 1 found the closing quote unescaped, so a backslash here
        // has its escaped byte before `end`.
        if (i + 1 >= end) return error.Syntax;
        const e = src[i + 1];
        i += 2;
        const simple: u8 = switch (e) {
            '"' => '"',
            '\\' => '\\',
            '/' => '/',
            'b' => 0x08,
            'f' => 0x0C,
            'n' => '\n',
            'r' => '\r',
            't' => '\t',
            'u' => 0,
            else => return error.Syntax,
        };
        if (e != 'u') {
            try sink.byte(simple);
            units += 1;
            continue;
        }
        var cp: u21 = hex4(src, i, end) orelse return error.Syntax;
        i += 4;
        if (cp >= 0xD800 and cp < 0xDC00 and i + 6 <= end and src[i] == '\\' and src[i + 1] == 'u') {
            // A low surrogate escape completes the pair; any other escape
            // leaves a lone surrogate, as JSON.parse does.
            if (hex4(src, i + 2, end)) |lo| {
                if (lo >= 0xDC00 and lo < 0xE000) {
                    cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
                    i += 6;
                }
            }
        }
        if (cp >= 0xD800 and cp < 0xE000) cp = 0xFFFD; // A lone surrogate has no UTF-8 form.
        var ub: [4]u8 = undefined;
        const n = std.unicode.utf8Encode(cp, &ub) catch unreachable; // cp is a scalar value.
        try sink.append(ub[0..n]);
        units += if (cp >= 0x10000) 2 else 1;
    }
    return units;
}

fn isDigit(c: u8) bool {
    return c -% '0' < 10;
}

const pow10 = blk: {
    var t: [23]f64 = undefined;
    var p: f64 = 1;
    for (&t) |*x| {
        x.* = p;
        p *= 10;
    }
    break :blk t;
};

fn hexVal(c: u8) ?u21 {
    return switch (c) {
        '0'...'9' => c - '0',
        'a'...'f' => c - 'a' + 10,
        'A'...'F' => c - 'A' + 10,
        else => null,
    };
}

/// Four hex digits at `i`, before `end`, as JSON.parse reads them.
fn hex4(s: []const u8, i: usize, end: usize) ?u21 {
    if (i + 4 > end) return null;
    var v: u21 = 0;
    for (s[i..][0..4]) |c| v = v * 16 + (hexVal(c) orelse return null);
    return v;
}

/// True for the bytes that end the plain-ASCII run of a string: a
/// backslash, a control character, or a byte of 0x80 or more.
inline fn special16(c: V16) u16 {
    const bs = c == @as(V16, @splat('\\'));
    // Below 0x20 or at 0x80 and above, in one compare.
    const out = (c -% @as(V16, @splat(0x20))) >= @as(V16, @splat(0x60));
    return @bitCast(bs | out);
}

fn isSpecial(c: u8) bool {
    return c == '\\' or c -% 0x20 >= 0x60;
}

/// The first byte in `s[i..end]` that `special16` marks, or `end`. It may
/// read up to 15 bytes past `end`, never past `s`.
pub fn findSpecial(s: []const u8, i_in: usize, end: usize) usize {
    @setRuntimeSafety(checked);
    assert(i_in <= end and end <= s.len);
    var i = i_in;
    while (i < end and i + 16 <= s.len) : (i += 16) {
        const m = special16(s[i..][0..16].*);
        if (m != 0) return @min(i + @ctz(m), end);
    }
    while (i < end) : (i += 1) {
        if (isSpecial(s[i])) return i;
    }
    return end;
}

/// The length of the valid UTF-8 sequence at the start of `s`, or 0. The
/// same rules as `std.unicode.utf8Decode`: no overlong forms, no surrogate
/// code points (ED A0..BF), nothing above U+10FFFF.
pub fn seqLen(s: []const u8) u32 {
    @setRuntimeSafety(checked);
    assert(s.len > 0);
    const c = s[0];
    if (c < 0x80) return 1;
    if (c < 0xC2) return 0;
    if (c < 0xE0) return if (s.len >= 2 and cont(s[1])) 2 else 0;
    if (c < 0xF0) {
        if (s.len < 3 or !cont(s[1]) or !cont(s[2])) return 0;
        if (c == 0xE0 and s[1] < 0xA0) return 0;
        if (c == 0xED and s[1] >= 0xA0) return 0;
        return 3;
    }
    if (c < 0xF5) {
        if (s.len < 4 or !cont(s[1]) or !cont(s[2]) or !cont(s[3])) return 0;
        if (c == 0xF0 and s[1] < 0x90) return 0;
        if (c == 0xF4 and s[1] >= 0x90) return 0;
        return 4;
    }
    return 0;
}

inline fn cont(c: u8) bool {
    return c & 0xC0 == 0x80;
}

/// A cheap hash of a key: two overlapping words for keys up to 16 bytes.
/// `module.zig` indexes the module's strings with it (`internKey`).
pub fn hashKey(s: []const u8) u32 {
    const len = s.len;
    var a: u64 = 0;
    var b: u64 = 0;
    if (len > 16) return @truncate(std.hash.Wyhash.hash(0, s));
    if (len >= 8) {
        a = std.mem.readInt(u64, s[0..8], .little);
        b = std.mem.readInt(u64, s[len - 8 ..][0..8], .little);
    } else if (len >= 4) {
        a = std.mem.readInt(u32, s[0..4], .little);
        b = std.mem.readInt(u32, s[len - 4 ..][0..4], .little);
    } else if (len > 0) {
        a = (@as(u64, s[0]) << 16) | (@as(u64, s[len / 2]) << 8) | s[len - 1];
    }
    const m = @as(u128, a ^ 0x9E3779B97F4A7C15) * @as(u128, b ^ 0xD6E8FEB86659FD93 ^ len);
    return @truncate((m >> 64) ^ m);
}

/// Parse `src` into a region value.
pub fn decode(vm: *Vm, src: []const u8) DecodeError!Value {
    // Safe builds fill `undefined` memory with 0xAA; these stacks are
    // kilobytes and the decode of a small document takes less time than
    // that fill. Stage 2 keeps its own checks.
    @setRuntimeSafety(false);
    if (src.len > std.math.maxInt(u32)) return error.Syntax;
    var keys: KeyCache = undefined;
    @memset(&keys.vals, value.undef);
    var frames: [ops.max_depth]Frame = undefined;
    var vals: [stack_cap]Value = undefined;
    var hashes: [stack_cap]u32 = undefined;
    var d: Decoder = .{ .vm = vm, .src = src, .sc = .{ .src = src }, .frames = &frames, .vals = &vals, .hashes = &hashes, .keys = &keys };
    return d.run();
}

/// A JSON number at `s[pos]`, whole up to the next structural byte.
pub const parseNumber = Decoder.numberAt;

// ---- encode -------------------------------------------------------------------------

const EFrame = struct {
    v: Value,
    i: u32 = 0,
    /// Objects: 0 = array-index keys ascending, 1 = other keys in order,
    /// 2 = no array-index keys, all keys in order.
    phase: u8 = 0,
    last_index: i64 = -1,
    wrote: bool = false,
};

/// Append JSON.stringify(v) to `b`. Returns false when the result is
/// `undefined` (v is undefined or a function).
pub fn encode(vm: *Vm, b: *Builder, v: Value, indent: []const u8) Err!bool {
    @setRuntimeSafety(false);
    // Safe builds fill `undefined` memory with 0xAA; for this stack (kilobytes,
    // on every call) the fill cost more than the work. The callee keeps safety.
    var stack: [ops.max_depth]EFrame = undefined;
    return encodeWith(vm, b, v, indent, &stack);
}

fn encodeWith(vm: *Vm, b: *Builder, v: Value, indent: []const u8, stack: *[ops.max_depth]EFrame) Err!bool {
    if (!encodable(v, vm)) return false;
    var sp: usize = 0;
    if (!try writeScalarOrOpen(vm, b, v, stack, &sp)) return true;
    while (sp > 0) {
        const top = &stack[sp - 1];
        const next = if (value.kindOf(top.v) == .array) nextArrayItem(vm, top) else nextObjectEntry(vm, top);
        if (next) |item| {
            if (top.wrote) try b.byte(',');
            top.wrote = true;
            if (indent.len > 0) try newline(b, indent, sp);
            if (item.key) |k| {
                try writeString(b, strOf(vm, k));
                try b.byte(':');
                if (indent.len > 0) try b.byte(' ');
            }
            const child = if (encodable(item.v, vm)) item.v else value.null_;
            if (value.isHeap(child)) {
                for (stack[0..sp]) |f| {
                    if (f.v == child) return vm.throwMsg(.type_error, "Converting circular structure to JSON", .{});
                }
            }
            if (sp == ops.max_depth) return vm.limit(.depth);
            _ = try writeScalarOrOpen(vm, b, child, stack, &sp);
            continue;
        }
        if (top.wrote and indent.len > 0) try newline(b, indent, sp - 1);
        try b.byte(if (value.kindOf(top.v) == .array) ']' else '}');
        sp -= 1;
    }
    return true;
}

fn encodable(v: Value, vm: *Vm) bool {
    return switch (value.kindOf(v)) {
        .undefined => false,
        .ref => vm.r.hdr(value.payload(v)).kind != .closure,
        else => true,
    };
}

fn newline(b: *Builder, indent: []const u8, depth: usize) Err!void {
    try b.byte('\n');
    var n: usize = 0;
    while (n < depth) : (n += 1) try b.append(indent);
}

const Item = struct { key: ?Value, v: Value };

fn nextArrayItem(vm: *Vm, f: *EFrame) ?Item {
    const items = vm.r.arrItems(value.payload(f.v));
    if (f.i >= items.len) return null;
    const v = items[f.i];
    f.i += 1;
    return .{ .key = null, .v = v };
}

/// `Vm.str`, inlined: the encoder reads every key and string through it.
inline fn strOf(vm: *const Vm, v: Value) []const u8 {
    const p = value.payload(v);
    if (p >= value.const_handle_base) return vm.m.str(p - value.const_handle_base);
    const st = vm.r.at(heap.Str, p);
    if (st.hdr._pad[0] & heap.str_flag_ref != 0) return vm.r.strBytes(p);
    return vm.r.buf[p + @sizeOf(heap.Str) ..][0..st.len];
}

fn isIndexKey(vm: *Vm, k: Value) bool {
    const ks = strOf(vm, k);
    return ks.len > 0 and isDigit(ks[0]) and ops.arrayIndex(ks) != null;
}

/// Walk entries in ECMAScript order with no allocation: first the smallest
/// array-index key above the last one, repeatedly; then the other keys.
/// An object without array-index keys (phase 2) goes in order in one pass.
fn nextObjectEntry(vm: *Vm, f: *EFrame) ?Item {
    const es = vm.r.objEntries(value.payload(f.v));
    const n: u32 = @intCast(es.len / 2);
    if (f.phase == 2) {
        while (f.i < n) {
            const i = f.i;
            f.i += 1;
            if (!encodable(es[i * 2 + 1], vm)) continue;
            return .{ .key = es[i * 2], .v = es[i * 2 + 1] };
        }
        return null;
    }
    while (f.phase == 0) {
        var best: ?u32 = null;
        var best_idx: i64 = std.math.maxInt(i64);
        var i: u32 = 0;
        while (i < n) : (i += 1) {
            const ai = ops.arrayIndex(vm.str(es[i * 2])) orelse continue;
            if (ai > f.last_index and ai < best_idx) {
                best = i;
                best_idx = ai;
            }
        }
        const bi = best orelse {
            f.phase = 1;
            break;
        };
        f.last_index = best_idx;
        if (!encodable(es[bi * 2 + 1], vm)) continue;
        return .{ .key = es[bi * 2], .v = es[bi * 2 + 1] };
    }
    while (f.i < n) {
        const i = f.i;
        f.i += 1;
        if (isIndexKey(vm, es[i * 2])) continue;
        if (!encodable(es[i * 2 + 1], vm)) continue;
        return .{ .key = es[i * 2], .v = es[i * 2 + 1] };
    }
    return null;
}

/// Write a scalar, or open a container and push its frame. Returns true when
/// a frame was pushed.
fn writeScalarOrOpen(vm: *Vm, b: *Builder, v: Value, stack: []EFrame, sp: *usize) Err!bool {
    switch (value.kindOf(v)) {
        .number => {
            const f = value.asNum(v);
            if (std.math.isNan(f) or std.math.isInf(f)) {
                try b.append("null");
            } else {
                var nb: [numfmt.max_len]u8 = undefined;
                try b.append(formatNumber(&nb, f));
            }
        },
        .null, .undefined => try b.append("null"),
        .boolean => try b.append(if (value.payload(v) != 0) "true" else "false"),
        .string => try writeString(b, strOf(vm, v)),
        .array => {
            try b.byte('[');
            stack[sp.*] = .{ .v = v };
            sp.* += 1;
            return true;
        },
        .object => {
            try b.byte('{');
            var phase: u8 = 2;
            const es = vm.r.objEntries(value.payload(v));
            var i: usize = 0;
            while (i < es.len) : (i += 2) {
                if (isIndexKey(vm, es[i])) {
                    phase = 0;
                    break;
                }
            }
            stack[sp.*] = .{ .v = v, .phase = phase };
            sp.* += 1;
            return true;
        },
        .ref => try b.append("{}"),
    }
    return false;
}

// ---- strings ------------------------------------------------------------------------

/// True for the bytes that `writeString` looks at: a quote, a backslash, a
/// control character, or 0xED (the lead byte of an encoded lone surrogate).
inline fn escape16(c: V16) ?u16 {
    const hit = (c == @as(V16, @splat('"'))) | (c == @as(V16, @splat('\\'))) |
        (c < @as(V16, @splat(0x20))) | (c == @as(V16, @splat(0xED)));
    if (!@reduce(.Or, hit)) return null;
    const m: u16 = @bitCast(hit);
    return m;
}

const escape_class = blk: {
    var t: [256]bool = @splat(false);
    for (0..0x20) |c| t[c] = true;
    t['"'] = true;
    t['\\'] = true;
    t[0xED] = true;
    break :blk t;
};

/// The first byte of `s[i..]` that `escape16` marks, or `s.len`.
fn findEscape(s: []const u8, i_in: usize) usize {
    @setRuntimeSafety(checked);
    var i = i_in;
    while (i + 16 <= s.len) : (i += 16) {
        if (escape16(s[i..][0..16].*)) |m| return i + @ctz(m);
    }
    if (i < s.len and s.len >= 16) {
        // The last 16 bytes, less those already seen.
        const base = s.len - 16;
        const m = (escape16(s[base..][0..16].*) orelse return s.len) >> @intCast(i - base);
        return if (m != 0) i + @ctz(m) else s.len;
    }
    while (i < s.len) : (i += 1) {
        if (escape_class[s[i]]) return i;
    }
    return s.len;
}

/// The escape of the byte or sequence at `s[i]` (which `findEscape` found),
/// written to `out`. Returns the bytes written and the input taken.
inline fn escapeAt(s: []const u8, i: usize, out: []u8) struct { w: usize, r: usize } {
    @setRuntimeSafety(checked);
    const hex = "0123456789abcdef";
    const c = s[i];
    // A lone surrogate (WTF-8 ED A0..BF xx) prints as \udXXX.
    if (c == 0xED) {
        if (i + 2 < s.len and s[i + 1] >= 0xA0) {
            const u: u16 = (0xD << 12) | (@as(u16, s[i + 1] & 0x3F) << 6) | (s[i + 2] & 0x3F);
            out[0..6].* = .{ '\\', 'u', hex[u >> 12], hex[(u >> 8) & 0xF], hex[(u >> 4) & 0xF], hex[u & 0xF] };
            return .{ .w = 6, .r = 3 };
        }
        out[0] = c;
        return .{ .w = 1, .r = 1 };
    }
    const e: u8 = switch (c) {
        '"' => '"',
        '\\' => '\\',
        '\n' => 'n',
        '\r' => 'r',
        '\t' => 't',
        0x08 => 'b',
        0x0C => 'f',
        else => 0,
    };
    if (e != 0) {
        out[0..2].* = .{ '\\', e };
        return .{ .w = 2, .r = 1 };
    }
    assert(c < 0x20);
    out[0..6].* = .{ '\\', 'u', '0', '0', hex[c >> 4], hex[c & 0xF] };
    return .{ .w = 6, .r = 1 };
}

/// The length of `writeString(s)`, quotes included.
fn escapedLen(s: []const u8) usize {
    var scratch: [6]u8 = undefined;
    var n: usize = 2;
    var i: usize = 0;
    while (i < s.len) {
        const k = findEscape(s, i);
        n += k - i;
        i = k;
        if (i == s.len) break;
        const e = escapeAt(s, i, &scratch);
        n += e.w;
        i += e.r;
    }
    return n;
}

/// Write `s` as a JSON string. A byte sequence that is not UTF-8 passes
/// through, except that a lone surrogate in WTF-8 prints as `\udXXX`.
pub fn writeString(b: *Builder, s: []const u8) error{ArenaFull}!void {
    @setRuntimeSafety(checked);
    const buf = b.arena.buf;
    const at = b.start + b.len;
    const room = buf.len -| at;
    // At most 6 bytes for each input byte; count exactly only when that
    // could not fit.
    if (s.len * 6 + 2 > room and escapedLen(s) > room) return error.ArenaFull;
    const out = buf[at..];
    out[0] = '"';
    var o: usize = 1;
    var i: usize = 0;
    // With 16 bytes to spare, plain chunks are stored whole before the
    // scan; the bytes past the first escape are written over after.
    if (s.len * 6 + 2 + 16 <= room) {
        // A short string: one 16-byte load when it stays inside the page
        // (it may read past the string, never into an unmapped page).
        if (s.len < 16 and (@intFromPtr(s.ptr) & 4095) <= 4096 - 16) {
            const chunk: V16 = @as(*const [16]u8, @ptrCast(s.ptr)).*;
            const live = (@as(u16, 1) << @intCast(s.len)) -% 1;
            const m = if (escape16(chunk)) |e| e & live else 0;
            if (m == 0) {
                out[1..][0..16].* = chunk;
                out[1 + s.len] = '"';
                b.len += s.len + 2;
                return;
            }
        }
        while (i + 16 <= s.len) {
            const chunk: V16 = s[i..][0..16].*;
            out[o..][0..16].* = chunk;
            if (escape16(chunk)) |m| {
                const k = @ctz(m);
                o += k;
                i += k;
                const e = escapeAt(s, i, out[o..]);
                o += e.w;
                i += e.r;
            } else {
                o += 16;
                i += 16;
            }
        }
        while (i < s.len) {
            const ch = s[i];
            if (escape_class[ch]) {
                const e = escapeAt(s, i, out[o..]);
                o += e.w;
                i += e.r;
            } else {
                out[o] = ch;
                o += 1;
                i += 1;
            }
        }
    }
    while (i < s.len) {
        const k = findEscape(s, i);
        @memcpy(out[o..][0 .. k - i], s[i..k]);
        o += k - i;
        i = k;
        if (i == s.len) break;
        const e = escapeAt(s, i, out[o..]);
        o += e.w;
        i += e.r;
    }
    out[o] = '"';
    b.len += o + 1;
    assert(b.start + b.len <= buf.len);
}

// ---- numbers ------------------------------------------------------------------------

const two53: f64 = 9007199254740992.0;

const digit_pairs = blk: {
    var t: [200]u8 = undefined;
    for (0..100) |i| {
        t[i * 2] = '0' + i / 10;
        t[i * 2 + 1] = '0' + i % 10;
    }
    break :blk t;
};

/// The decimal digits of `n`, written at the end of `tmp`; returns them.
fn digits(tmp: *[20]u8, n_in: u64) []const u8 {
    var n = n_in;
    var p: usize = tmp.len;
    while (n >= 100) {
        const r: usize = @intCast(n % 100);
        n /= 100;
        p -= 2;
        tmp[p..][0..2].* = digit_pairs[r * 2 ..][0..2].*;
    }
    if (n >= 10) {
        const r: usize = @intCast(n);
        p -= 2;
        tmp[p..][0..2].* = digit_pairs[r * 2 ..][0..2].*;
    } else {
        p -= 1;
        tmp[p] = '0' + @as(u8, @intCast(n));
    }
    return tmp[p..];
}

/// The ECMAScript Number::toString(10) of `x`, the same bytes as
/// `numfmt.format`. Integers below 2^53 and decimals with up to 9 fraction
/// digits that read back exactly skip the shortest-digits search.
pub fn formatNumber(buf: *[numfmt.max_len]u8, x: f64) []const u8 {
    const ax = @abs(x);
    if (ax < two53) {
        var tmp: [20]u8 = undefined;
        var len: usize = 0;
        if (x < 0) {
            buf[0] = '-';
            len = 1;
        }
        if (ax == @trunc(ax)) {
            const ds = digits(&tmp, @intFromFloat(ax));
            @memcpy(buf[len..][0..ds.len], ds);
            return buf[0 .. len + ds.len];
        }
        if (ax >= 1e-6) {
            if (shortDecimal(ax)) |sd| {
                const ds = digits(&tmp, sd.m);
                // The value is 0.ds × 10^n.
                const n: i32 = @as(i32, @intCast(ds.len)) - @as(i32, @intCast(sd.k));
                if (n > 0) {
                    const nu: usize = @intCast(n);
                    @memcpy(buf[len..][0..nu], ds[0..nu]);
                    buf[len + nu] = '.';
                    @memcpy(buf[len + nu + 1 ..][0 .. ds.len - nu], ds[nu..]);
                    return buf[0 .. len + ds.len + 1];
                }
                assert(n > -6);
                const z: usize = @intCast(-n);
                buf[len..][0..2].* = "0.".*;
                @memset(buf[len + 2 ..][0..z], '0');
                @memcpy(buf[len + 2 + z ..][0..ds.len], ds);
                return buf[0 .. len + 2 + z + ds.len];
            }
        }
    }
    return numfmt.format(buf, x);
}

/// `ax` as m × 10^-k with the fewest fraction digits k (1 to 9), when that
/// decimal reads back as `ax` and no other decimal with k digits does: the
/// shortest form, as the shortest-digits search would give it.
fn shortDecimal(ax: f64) ?struct { m: u64, k: u32 } {
    assert(ax >= 1e-6 and ax < two53);
    // The spacing of doubles at ax: 2^(exponent - 52).
    const be: u64 = @as(u64, @bitCast(ax)) >> 52;
    const ulp: f64 = @bitCast((be - 52) << 52);
    var k: u32 = 1;
    while (k <= 9) : (k += 1) {
        const p = pow10[k];
        // Two decimals of k digits fit in one spacing: not unique.
        if (ulp * p >= 1) return null;
        // Rounded: ax * p may land next to the integer; the read-back
        // check below decides.
        const m = @round(ax * p);
        if (m >= two53) return null;
        if (m / p != ax) continue;
        var mi: u64 = @intFromFloat(m);
        var kk = k;
        while (mi % 10 == 0) {
            mi /= 10;
            kk -= 1;
        }
        assert(kk > 0);
        return .{ .m = mi, .k = kk };
    }
    return null;
}
