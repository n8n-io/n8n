//! Per-execution region heap. Every reference inside a region is a byte
//! offset, so a region can be copied to another buffer, written to disk, and
//! read back with no pointer fix-up.
//!
//! Every object starts with an 8-byte header that holds its kind and total
//! size. Allocation only moves forward. A compacting copy (Cheney) into a
//! new region is the garbage collector, the promotion to a larger size class,
//! and the snapshot writer.
const std = @import("std");
const value = @import("value.zig");
const Value = value.Value;

pub const ObjKind = enum(u8) {
    forwarded = 0,
    string = 1,
    array = 2,
    vals = 3,
    object = 4,
    closure = 5,
    cell = 6,
    exec = 7,
    fibres = 8,
    frames = 9,
    bytes = 10,
    /// The bytes of grown strings (`StrBuf`), shared by their `StrRef`s.
    strbuf = 11,
};

pub const Hdr = extern struct {
    kind: ObjKind,
    _pad: [3]u8 = .{ 0, 0, 0 },
    /// Total size in bytes, header included, 8-aligned. A forwarded object
    /// stores its new offset here.
    size: u32,
};

pub const Str = extern struct {
    hdr: Hdr,
    len: u32,
    utf16_len: u32,
};

/// `Hdr._pad[0]` of a string whose bytes are in a `StrBuf` (a `StrRef`).
pub const str_flag_ref: u8 = 1;

/// A string that is a prefix of a `StrBuf`. Appends to the longest string of
/// a buffer write after it, in the spare capacity, so `s += x` in a loop
/// costs the size of `x`, not of `s`. Strings stay immutable: a buffer only
/// grows past its fill mark, and every `StrRef` keeps its own length.
pub const StrRef = extern struct {
    str: Str,
    data: u32,
    _pad: u32 = 0,
};

pub const StrBuf = extern struct {
    hdr: Hdr,
    /// Bytes in use; the longest `StrRef` of the buffer ends here.
    fill: u32,
    cap: u32,
};

/// Concatenations at least this long go to a `StrBuf`. Shorter ones stay
/// plain strings, so small strings cost no extra header.
pub const strbuf_min: u32 = 64;

pub const Arr = extern struct {
    hdr: Hdr,
    len: u32,
    cap: u32,
    items: u32,
    _pad: u32 = 0,
};

pub const Obj = extern struct {
    hdr: Hdr,
    count: u32,
    cap: u32,
    /// A `vals` block that holds `cap` key/value pairs.
    entries: u32,
    _pad: u32 = 0,
};

pub const Closure = extern struct {
    hdr: Hdr,
    func: u32,
    ncaps: u32,
};

pub const Cell = extern struct {
    hdr: Hdr,
    value: Value,
};

pub const FibreState = enum(u32) { runnable = 0, parked_effect = 1, parked_join = 2, done = 3, failed = 4 };

pub const Fibre = extern struct {
    state: FibreState,
    frames: u32,
    nframes: u32,
    frames_cap: u32,
    regs: u32,
    regs_top: u32,
    regs_cap: u32,
    wait_effect: u32,
    result: Value,
    /// For a fibre parked on JOIN: the array of fibre ids.
    join: Value,
};

pub const Frame = extern struct {
    func: u32,
    pc: u32,
    base: u32,
    ret_reg: u32,
    closure: Value,
};

pub const ExecStatus = enum(u32) {
    ready = 0,
    parked = 1,
    done = 2,
    failed = 3,
    needs_attention = 4,
    limit = 5,
    cancelled = 6,
    /// A poll run that found nothing (spec 9.8): no events, as v1 starts no
    /// execution when `poll` returns null.
    skipped = 7,
};

/// The root object. It is always the first object in a region.
pub const Exec = extern struct {
    hdr: Hdr,
    magic: u32,
    status: ExecStatus,
    exec_id: u64,
    module_hash_prefix: u64,
    prng: u64,
    fuel_used: u64,
    fibres: u32,
    nfibres: u32,
    fibres_cap: u32,
    /// `bytes` block of u32 occurrence counters, one per step.
    occ: u32,
    nsteps: u32,
    next_effect: u32,
    /// Fibre and step of the effect that needs attention.
    attention_fibre: u32,
    attention_step: u32,
    result: Value,
    trigger: Value,
    /// `exec_flag_*` bits. They come from the start event, so a replay
    /// sets the same bits.
    flags: u32,
    _pad: u32,
    /// The workflow variables at the start, as JSON text (a string), or
    /// undefined. ctx.vars() decodes a fresh object from it.
    vars: Value,
    /// The workflow static data at the start (spec 9.7), as JSON text (a
    /// string), or undefined when the workflow has none.
    static_start: Value,
    /// The working copy of the static data: an object
    /// `{ global?, "node:<name>"?... }`, or undefined until a step reads
    /// it. The execution commits it when it ends, if it changed.
    static_doc: Value,
};

/// Execution ids that n8n gives (manual runs) have this bit. Ids that the
/// core makes are below it: `(shard << 48) | counter`.
pub const given_id_flag: u64 = 1 << 62;

/// The resume signature of an execution (spec 9.4): HMAC-SHA256 of the
/// execution id under the shard's secret, the first 16 bytes as hex.
/// The secret comes from the shell's CSPRNG through a logged event, so a
/// replay gives the same signature; the signature itself is never logged.
pub fn resumeSignature(secret: *const [32]u8, exec_id: u64, out: *[32]u8) []const u8 {
    var msg: [8]u8 = undefined;
    std.mem.writeInt(u64, &msg, exec_id, .little);
    var mac: [32]u8 = undefined;
    std.crypto.auth.hmac.sha2.HmacSha256.create(&mac, &msg, secret);
    out.* = std.fmt.bytesToHex(mac[0..16], .lower);
    return out;
}

/// Compare two signatures in time that does not depend on where they differ.
pub fn signatureEql(a: []const u8, b: []const u8) bool {
    if (a.len != b.len) return false;
    var diff: u8 = 0;
    for (a, b) |x, y| diff |= x ^ y;
    return diff == 0;
}

/// The text form of an execution id (spec 9.1): the number n8n gave, or
/// `wfrt-<n>` for an id the core made.
pub fn formatExecId(id: u64, buf: *[32]u8) []const u8 {
    if (id & given_id_flag != 0) return std.fmt.bufPrint(buf, "{d}", .{id & ~given_id_flag}) catch unreachable;
    return std.fmt.bufPrint(buf, "wfrt-{d}", .{id}) catch unreachable;
}

/// ctx.trace calls produce trace actions.
pub const exec_flag_trace: u32 = 1;
/// Started by an operator (n8n manual run), not by a trigger.
pub const exec_flag_manual: u32 = 2;
/// Step events carry args, results and errors.
pub const exec_flag_data: u32 = 4;
/// A poll run (spec 9.8): no `started` and no step events until
/// `ctx.polled(items)` finds items.
pub const exec_flag_quiet: u32 = 8;
/// `ctx.polled` found items: the `started` event goes out before the next event.
pub const exec_flag_announce: u32 = 16;

pub const exec_magic: u32 = 0x45584543;

comptime {
    std.debug.assert(@sizeOf(Hdr) == 8);
    std.debug.assert(@sizeOf(Str) == 16);
    // Snapshots hold regions as memory, so these are formats too.
    std.debug.assert(@sizeOf(StrRef) == 24);
    std.debug.assert(@sizeOf(StrBuf) == 16);
    std.debug.assert(@sizeOf(Arr) == 24);
    std.debug.assert(@sizeOf(Obj) == 24);
    std.debug.assert(@sizeOf(Closure) == 16);
    std.debug.assert(@sizeOf(Cell) == 16);
    std.debug.assert(@sizeOf(Fibre) == 48);
    std.debug.assert(@sizeOf(Frame) == 24);
    std.debug.assert(@sizeOf(Exec) % 8 == 0);
    // Exec is part of each snapshot, which the log keeps.
    std.debug.assert(@sizeOf(Exec) == 128);
    // Every format of the runtime is little-endian and written as memory.
    std.debug.assert(@import("builtin").cpu.arch.endian() == .little);
}

pub const Error = error{RegionFull};

pub const Region = struct {
    buf: []align(8) u8,
    used: u32,

    pub fn init(buf: []align(8) u8) Region {
        std.debug.assert(buf.len >= 64);
        std.debug.assert(buf.len <= std.math.maxInt(u32));
        return .{ .buf = buf, .used = 0 };
    }

    pub fn alloc(r: *Region, kind: ObjKind, size_in: u32) Error!u32 {
        const size = alignUp(size_in);
        std.debug.assert(size >= @sizeOf(Hdr));
        if (@as(u64, r.used) + size > r.buf.len) return error.RegionFull;
        const off = r.used;
        r.used += size;
        const h = r.hdr(off);
        h.* = .{ .kind = kind, .size = size };
        return off;
    }

    pub fn free(r: *const Region) u32 {
        return @intCast(r.buf.len - r.used);
    }

    pub inline fn at(r: *const Region, comptime T: type, off: u32) *T {
        std.debug.assert(off % 8 == 0);
        std.debug.assert(off + @sizeOf(T) <= r.used);
        return @ptrCast(@alignCast(r.buf.ptr + off));
    }

    pub inline fn hdr(r: *const Region, off: u32) *Hdr {
        return @ptrCast(@alignCast(r.buf.ptr + off));
    }

    pub fn exec(r: *const Region) *Exec {
        const e = r.at(Exec, 0);
        std.debug.assert(e.magic == exec_magic);
        return e;
    }

    // ---- strings -------------------------------------------------------

    pub fn newString(r: *Region, bytes: []const u8) Error!Value {
        return r.newStringUnits(bytes, utf16Len(bytes));
    }

    /// `newString` when the caller knows the UTF-16 length (ASCII: the
    /// byte length), which saves a pass over the bytes.
    pub fn newStringUnits(r: *Region, bytes: []const u8, units: u32) Error!Value {
        if (@import("builtin").mode == .debug) std.debug.assert(units == utf16Len(bytes));
        const off = try r.alloc(.string, @intCast(@sizeOf(Str) + bytes.len));
        const s = r.at(Str, off);
        s.len = @intCast(bytes.len);
        s.utf16_len = units;
        @memcpy(r.buf[off + @sizeOf(Str) ..][0..bytes.len], bytes);
        return value.box(.string, off);
    }

    /// Reserve a string of `len` bytes and return its value and writable bytes.
    pub fn newStringUninit(r: *Region, len: u32) Error!struct { v: Value, bytes: []u8 } {
        const off = try r.alloc(.string, @sizeOf(Str) + len);
        const s = r.at(Str, off);
        s.len = len;
        s.utf16_len = 0;
        return .{ .v = value.box(.string, off), .bytes = r.buf[off + @sizeOf(Str) ..][0..len] };
    }

    pub fn finishString(r: *Region, v: Value) void {
        const s = r.at(Str, value.payload(v));
        s.utf16_len = utf16Len(r.strBytes(value.payload(v)));
    }

    pub fn strBytes(r: *const Region, off: u32) []u8 {
        const s = r.at(Str, off);
        if (s.hdr._pad[0] & str_flag_ref != 0) {
            const ref = r.at(StrRef, off);
            std.debug.assert(s.len <= r.at(StrBuf, ref.data).fill);
            return r.buf[ref.data + @sizeOf(StrBuf) ..][0..s.len];
        }
        return r.buf[off + @sizeOf(Str) ..][0..s.len];
    }

    /// The string `a ++ tail`. `a_bytes` are the bytes of `a` (a module
    /// constant has no object in the region). When `a` is the longest
    /// string of a `StrBuf` with room, `tail` goes after it in place;
    /// otherwise a new buffer with twice the room takes both. Allocation
    /// comes first, so a full region leaves every object as it was.
    pub fn appendStr(r: *Region, a: Value, a_bytes: []const u8, a_units: u32, tail: []const u8) Error!Value {
        const total: u32 = @intCast(a_bytes.len + tail.len);
        const units = a_units + utf16Len(tail);
        const p = value.payload(a);
        if (value.kindOf(a) == .string and p < value.const_handle_base) {
            const s = r.at(Str, p);
            if (s.hdr._pad[0] & str_flag_ref != 0) {
                const data = r.at(StrRef, p).data;
                const b = r.at(StrBuf, data);
                if (b.fill == s.len and b.cap - b.fill >= tail.len) {
                    const off = try r.newStrRef(data, total, units);
                    const b2 = r.at(StrBuf, data);
                    @memcpy(r.buf[data + @sizeOf(StrBuf) + b2.fill ..][0..tail.len], tail);
                    b2.fill = total;
                    return value.box(.string, off);
                }
            }
        }
        // A new buffer: twice the length, or what the region has left.
        const want: u64 = @max(@as(u64, total) * 2, strbuf_min * 2);
        const room: u64 = r.free() -| (@sizeOf(StrBuf) + @sizeOf(StrRef) + 16);
        const cap: u32 = @intCast(@max(@as(u64, total), @min(want, room)));
        const data = try r.alloc(.strbuf, @intCast(@sizeOf(StrBuf) + cap));
        const off = r.newStrRef(data, total, units) catch |e| {
            // Give the buffer back: it is the last object.
            r.used = data;
            return e;
        };
        const b = r.at(StrBuf, data);
        b.cap = cap;
        b.fill = total;
        const dst = r.buf[data + @sizeOf(StrBuf) ..];
        @memcpy(dst[0..a_bytes.len], a_bytes);
        @memcpy(dst[a_bytes.len..][0..tail.len], tail);
        return value.box(.string, off);
    }

    fn newStrRef(r: *Region, data: u32, len: u32, units: u32) Error!u32 {
        const off = try r.alloc(.string, @sizeOf(StrRef));
        const ref = r.at(StrRef, off);
        ref.str.hdr._pad[0] = str_flag_ref;
        ref.str.len = len;
        ref.str.utf16_len = units;
        ref.data = data;
        ref._pad = 0;
        return off;
    }

    // ---- value blocks ---------------------------------------------------

    pub fn newVals(r: *Region, n: u32) Error!u32 {
        const off = try r.alloc(.vals, @sizeOf(Hdr) + n * 8);
        const vs = r.valsAt(off, n);
        @memset(vs, value.undef);
        return off;
    }

    /// A frames block of `n` empty frames. Compaction scans every frame of
    /// the block, so unused frames must hold no stale value: a reused region
    /// still has the bytes of an earlier execution.
    pub fn newFrames(r: *Region, n: u32) Error!u32 {
        const off = try r.alloc(.frames, @sizeOf(Hdr) + n * @sizeOf(Frame));
        const p: [*]Frame = @ptrCast(@alignCast(r.buf.ptr + off + @sizeOf(Hdr)));
        @memset(p[0..n], .{ .func = 0, .pc = 0, .base = 0, .ret_reg = 0, .closure = value.undef });
        return off;
    }

    pub fn valsCap(r: *const Region, off: u32) u32 {
        return (r.hdr(off).size - @sizeOf(Hdr)) / 8;
    }

    pub fn valsAt(r: *const Region, off: u32, n: u32) []Value {
        std.debug.assert(r.hdr(off).kind == .vals);
        const p: [*]Value = @ptrCast(@alignCast(r.buf.ptr + off + @sizeOf(Hdr)));
        return p[0..n];
    }

    pub fn newBytes(r: *Region, n: u32) Error!u32 {
        const off = try r.alloc(.bytes, @sizeOf(Hdr) + n);
        @memset(r.buf[off + @sizeOf(Hdr) ..][0..n], 0);
        return off;
    }

    pub fn bytesAt(r: *const Region, off: u32) []u8 {
        const h = r.hdr(off);
        return r.buf[off + @sizeOf(Hdr) ..][0 .. h.size - @sizeOf(Hdr)];
    }

    pub fn u32sAt(r: *const Region, off: u32, n: u32) []u32 {
        const p: [*]u32 = @ptrCast(@alignCast(r.buf.ptr + off + @sizeOf(Hdr)));
        return p[0..n];
    }

    // ---- arrays ---------------------------------------------------------

    pub fn newArray(r: *Region, cap_in: u32) Error!Value {
        const cap = @max(cap_in, 4);
        // Allocate the items first: a failure leaves no half-built array.
        const items = try r.newVals(cap);
        const off = try r.alloc(.array, @sizeOf(Arr));
        r.at(Arr, off).* = .{ .hdr = r.hdr(off).*, .len = 0, .cap = cap, .items = items };
        return value.box(.array, off);
    }

    pub fn arrItems(r: *const Region, off: u32) []Value {
        const a = r.at(Arr, off);
        return r.valsAt(a.items, a.len);
    }

    /// Make room for `extra` more items. Allocates before it mutates.
    pub fn arrReserve(r: *Region, off: u32, extra: u32) Error!void {
        const a = r.at(Arr, off);
        const need = a.len + extra;
        if (need <= a.cap) return;
        const new_cap = @max(need, a.cap * 2);
        const items = try r.newVals(new_cap);
        const a2 = r.at(Arr, off);
        @memcpy(r.valsAt(items, a2.len), r.valsAt(a2.items, a2.len));
        @memset(r.valsAt(a2.items, a2.len), value.undef);
        a2.items = items;
        a2.cap = new_cap;
    }

    pub fn arrPush(r: *Region, off: u32, v: Value) Error!void {
        try r.arrReserve(off, 1);
        const a = r.at(Arr, off);
        r.valsAt(a.items, a.cap)[a.len] = v;
        a.len += 1;
    }

    // ---- objects --------------------------------------------------------

    pub fn newObject(r: *Region, cap_in: u32) Error!Value {
        const cap = @max(cap_in, 4);
        const entries = try r.newVals(cap * 2);
        const off = try r.alloc(.object, @sizeOf(Obj));
        r.at(Obj, off).* = .{ .hdr = r.hdr(off).*, .count = 0, .cap = cap, .entries = entries };
        return value.box(.object, off);
    }

    pub fn objEntries(r: *const Region, off: u32) []Value {
        const o = r.at(Obj, off);
        return r.valsAt(o.entries, o.count * 2);
    }

    pub fn objReserve(r: *Region, off: u32, extra: u32) Error!void {
        const o = r.at(Obj, off);
        const need = o.count + extra;
        if (need <= o.cap) return;
        const new_cap = @max(need, o.cap * 2);
        const entries = try r.newVals(new_cap * 2);
        const o2 = r.at(Obj, off);
        @memcpy(r.valsAt(entries, o2.count * 2), r.valsAt(o2.entries, o2.count * 2));
        o2.entries = entries;
        o2.cap = new_cap;
    }

    pub fn newClosure(r: *Region, func: u32, caps: []const Value) Error!Value {
        const n: u32 = @intCast(caps.len);
        const off = try r.alloc(.closure, @sizeOf(Closure) + n * 8);
        const c = r.at(Closure, off);
        c.func = func;
        c.ncaps = n;
        @memcpy(r.closureCaps(off), caps);
        return value.box(.ref, off);
    }

    pub fn closureCaps(r: *const Region, off: u32) []Value {
        const c = r.at(Closure, off);
        const p: [*]Value = @ptrCast(@alignCast(r.buf.ptr + off + @sizeOf(Closure)));
        return p[0..c.ncaps];
    }

    pub fn newCell(r: *Region, v: Value) Error!Value {
        const off = try r.alloc(.cell, @sizeOf(Cell));
        r.at(Cell, off).value = v;
        return value.box(.ref, off);
    }

    pub fn fibreTable(r: *const Region) []Fibre {
        const e = r.exec();
        const p: [*]Fibre = @ptrCast(@alignCast(r.buf.ptr + e.fibres + @sizeOf(Hdr)));
        return p[0..e.nfibres];
    }

    pub fn framesOf(r: *const Region, f: *const Fibre) []Frame {
        const p: [*]Frame = @ptrCast(@alignCast(r.buf.ptr + f.frames + @sizeOf(Hdr)));
        return p[0..f.nframes];
    }

    pub fn regsOf(r: *const Region, f: *const Fibre) []Value {
        return r.valsAt(f.regs, f.regs_cap);
    }
};

pub inline fn alignUp(n: u32) u32 {
    return (n + 7) & ~@as(u32, 7);
}

pub fn utf16Len(bytes: []const u8) u32 {
    var n: u32 = 0;
    for (bytes) |b| {
        // Count lead bytes; a 4-byte sequence is a surrogate pair.
        if (b & 0xC0 != 0x80) n += 1;
        if (b >= 0xF0) n += 1;
    }
    return n;
}

// ---- compacting copy ------------------------------------------------------

/// Copy everything reachable from the exec root of `src` into `dst`, which
/// must be empty. Returns error.RegionFull when `dst` is too small; `src` is
/// then left with forwarding marks and must be discarded or re-copied from a
/// pristine source. Callers copy from a scratch duplicate when they need to
/// retry. The copy is breadth-first with the destination as its work list,
/// so it needs no recursion and no extra memory.
pub fn compact(src: *Region, dst: *Region) Error!void {
    std.debug.assert(dst.used == 0);
    std.debug.assert(src.hdr(0).kind == .exec);
    _ = try forward(src, dst, 0);
    var scan: u32 = 0;
    while (scan < dst.used) {
        const h = dst.hdr(scan);
        const size = h.size;
        try scanObject(src, dst, scan, h.kind);
        scan += size;
    }
    std.debug.assert(scan == dst.used);
}

fn forward(src: *Region, dst: *Region, off: u32) Error!u32 {
    const h = src.hdr(off);
    if (h.kind == .forwarded) return h.size;
    const size = h.size;
    const kind = h.kind;
    const new_off = try dst.alloc(kind, size);
    @memcpy(dst.buf[new_off..][0..size], src.buf[off..][0..size]);
    h.kind = .forwarded;
    h.size = new_off;
    return new_off;
}

fn forwardValue(src: *Region, dst: *Region, v: Value) Error!Value {
    if (!value.isHeap(v)) return v;
    const new_off = try forward(src, dst, value.payload(v));
    return value.box(value.kindOf(v), new_off);
}

fn forwardVals(src: *Region, dst: *Region, vs: []Value) Error!void {
    for (vs) |*v| v.* = try forwardValue(src, dst, v.*);
}

fn scanObject(src: *Region, dst: *Region, off: u32, kind: ObjKind) Error!void {
    switch (kind) {
        .string => {
            const s = dst.at(Str, off);
            if (s.hdr._pad[0] & str_flag_ref != 0) {
                const data = try forward(src, dst, dst.at(StrRef, off).data);
                dst.at(StrRef, off).data = data;
            }
        },
        .bytes, .strbuf => {},
        .vals => try forwardVals(src, dst, dst.valsAt(off, dst.valsCap(off))),
        .array => {
            const new_items = try forward(src, dst, dst.at(Arr, off).items);
            dst.at(Arr, off).items = new_items;
        },
        .object => {
            const new_entries = try forward(src, dst, dst.at(Obj, off).entries);
            dst.at(Obj, off).entries = new_entries;
        },
        .closure => try forwardVals(src, dst, dst.closureCaps(off)),
        .cell => {
            const v = try forwardValue(src, dst, dst.at(Cell, off).value);
            dst.at(Cell, off).value = v;
        },
        .exec => try scanExec(src, dst, off),
        .fibres => try scanFibres(src, dst, off),
        .frames => {
            const n = (dst.hdr(off).size - @sizeOf(Hdr)) / @sizeOf(Frame);
            const p: [*]Frame = @ptrCast(@alignCast(dst.buf.ptr + off + @sizeOf(Hdr)));
            for (p[0..n]) |*fr| fr.closure = try forwardValue(src, dst, fr.closure);
        },
        .forwarded => unreachable, // The destination never holds forwarding marks.
    }
}

fn scanExec(src: *Region, dst: *Region, off: u32) Error!void {
    std.debug.assert(off == 0);
    const fibres = try forward(src, dst, dst.at(Exec, off).fibres);
    dst.at(Exec, off).fibres = fibres;
    const occ = try forward(src, dst, dst.at(Exec, off).occ);
    dst.at(Exec, off).occ = occ;
    const result = try forwardValue(src, dst, dst.at(Exec, off).result);
    dst.at(Exec, off).result = result;
    const trigger = try forwardValue(src, dst, dst.at(Exec, off).trigger);
    dst.at(Exec, off).trigger = trigger;
    const vars = try forwardValue(src, dst, dst.at(Exec, off).vars);
    dst.at(Exec, off).vars = vars;
    const static_start = try forwardValue(src, dst, dst.at(Exec, off).static_start);
    dst.at(Exec, off).static_start = static_start;
    const static_doc = try forwardValue(src, dst, dst.at(Exec, off).static_doc);
    dst.at(Exec, off).static_doc = static_doc;
}

fn scanFibres(src: *Region, dst: *Region, off: u32) Error!void {
    const n = (dst.hdr(off).size - @sizeOf(Hdr)) / @sizeOf(Fibre);
    var i: u32 = 0;
    while (i < n) : (i += 1) {
        const fp: *Fibre = @ptrCast(@alignCast(dst.buf.ptr + off + @sizeOf(Hdr) + i * @sizeOf(Fibre)));
        if (fp.frames == 0) continue; // An unused slot in the table.
        const frames = try forward(src, dst, fp.frames);
        const regs = try forward(src, dst, fp.regs);
        const result = try forwardValue(src, dst, fp.result);
        const join = try forwardValue(src, dst, fp.join);
        const f2: *Fibre = @ptrCast(@alignCast(dst.buf.ptr + off + @sizeOf(Hdr) + i * @sizeOf(Fibre)));
        f2.frames = frames;
        f2.regs = regs;
        f2.result = result;
        f2.join = join;
    }
}

test "compact keeps sharing and drops garbage" {
    var a_buf: [4096]u8 align(8) = undefined;
    var b_buf: [4096]u8 align(8) = undefined;
    var a = Region.init(&a_buf);
    var b = Region.init(&b_buf);
    const root = try a.alloc(.exec, @sizeOf(Exec));
    const e = a.at(Exec, root);
    e.magic = exec_magic;
    e.fibres = try a.alloc(.fibres, @sizeOf(Hdr) + @sizeOf(Fibre));
    a.at(Fibre, e.fibres + 8).* = std.mem.zeroes(Fibre);
    e.occ = try a.newBytes(8);
    _ = try a.newString("garbage that nobody references");
    const shared = try a.newString("héllo");
    const arr = try a.newArray(2);
    try a.arrPush(value.payload(arr), shared);
    try a.arrPush(value.payload(arr), shared);
    a.exec().result = arr;
    a.exec().trigger = value.undef;
    try compact(&a, &b);
    try std.testing.expect(b.used < a.used);
    const items = b.arrItems(value.payload(b.exec().result));
    try std.testing.expectEqual(items[0], items[1]);
    try std.testing.expectEqualStrings("héllo", b.strBytes(value.payload(items[0])));
    try std.testing.expectEqual(@as(u32, 5), b.at(Str, value.payload(items[0])).utf16_len);
}

test "appendStr grows in place, keeps older strings, and survives compaction" {
    const xs: [70]u8 = @splat('x');
    var a_buf: [16384]u8 align(8) = undefined;
    var b_buf: [16384]u8 align(8) = undefined;
    var a = Region.init(&a_buf);
    var b = Region.init(&b_buf);
    const root = try a.alloc(.exec, @sizeOf(Exec));
    const e = a.at(Exec, root);
    e.magic = exec_magic;
    e.fibres = try a.alloc(.fibres, @sizeOf(Hdr) + @sizeOf(Fibre));
    a.at(Fibre, e.fibres + 8).* = std.mem.zeroes(Fibre);
    e.occ = try a.newBytes(8);
    const start = try a.newString(&xs);
    var s = try a.appendStr(start, a.strBytes(value.payload(start)), 70, "ab");
    const first_buf = a.at(StrRef, value.payload(s)).data;
    const kept = s;
    // Appends to the longest string reuse its buffer.
    s = try a.appendStr(s, a.strBytes(value.payload(s)), 72, "cd");
    try std.testing.expectEqual(first_buf, a.at(StrRef, value.payload(s)).data);
    // An append to an older, shorter string takes a new buffer: `s` keeps its text.
    const fork = try a.appendStr(kept, a.strBytes(value.payload(kept)), 72, "ü");
    try std.testing.expect(a.at(StrRef, value.payload(fork)).data != first_buf);
    try std.testing.expectEqualStrings(xs ++ "abcd", a.strBytes(value.payload(s)));
    try std.testing.expectEqualStrings(xs ++ "ab", a.strBytes(value.payload(kept)));
    try std.testing.expectEqualStrings(xs ++ "abü", a.strBytes(value.payload(fork)));
    try std.testing.expectEqual(@as(u32, 73), a.at(Str, value.payload(fork)).utf16_len);
    const arr = try a.newArray(3);
    try a.arrPush(value.payload(arr), s);
    try a.arrPush(value.payload(arr), kept);
    try a.arrPush(value.payload(arr), fork);
    a.exec().result = arr;
    a.exec().trigger = value.undef;
    a.exec().vars = value.undef;
    a.exec().static_start = value.undef;
    a.exec().static_doc = value.undef;
    try compact(&a, &b);
    const items = b.arrItems(value.payload(b.exec().result));
    try std.testing.expectEqualStrings(xs ++ "abcd", b.strBytes(value.payload(items[0])));
    try std.testing.expectEqualStrings(xs ++ "ab", b.strBytes(value.payload(items[1])));
    try std.testing.expectEqualStrings(xs ++ "abü", b.strBytes(value.payload(items[2])));
    // The two strings of one buffer still share it after the copy.
    try std.testing.expectEqual(b.at(StrRef, value.payload(items[0])).data, b.at(StrRef, value.payload(items[1])).data);
}
