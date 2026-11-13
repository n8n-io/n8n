//! JavaScript value semantics over a region heap: conversion, equality,
//! comparison, property access and errors. The interpreter, the library and
//! the JSON codec share these.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const numfmt = @import("numfmt.zig");
const Arena = @import("arena.zig").Arena;
const Builder = @import("arena.zig").Builder;
const Module = @import("module.zig").Module;
const tz = @import("tz.zig");
const Value = value.Value;

pub const Err = error{ RegionFull, Throw, ArenaFull, Limit };
/// Longest URL that ctx.execution() builds.
pub const max_url: usize = 256;

/// NEWERR makes the first three. The library also throws SyntaxError (regular expressions).
pub const ErrKind = enum(u8) { @"error" = 0, type_error = 1, range_error = 2, syntax_error = 3, uri_error = 4, invalid_character_error = 5 };
const err_names = [_][]const u8{ "Error", "TypeError", "RangeError", "SyntaxError", "URIError", "InvalidCharacterError" };

/// Bound on nesting for iterative walks (ToString of arrays, JSON).
pub const max_depth = 128;

pub const Vm = struct {
    r: *heap.Region,
    m: *const Module,
    scratch: *Arena,
    thrown: Value = value.undef,
    limit_reason: LimitReason = .none,
    /// Fuel that native code charged during the current instruction. The
    /// interpreter takes it from the batch slice and the execution total,
    /// so a loop of native calls yields like a loop of instructions.
    charged: u64 = 0,
    /// What ctx.execution() needs from the loaded workflow.
    env: Env = .{},
    /// The last UTF-16 position that `charCodeAt` found in a non-ASCII
    /// string: a loop over `charCodeAt(i)` then scans forward from it, not
    /// from the start. Strings do not change or move while a Vm lives (the
    /// core makes a new Vm after it grows or compacts a region).
    unit_cache: UnitCache = .{},
    /// The UTF-16 length of the last module constant asked for. A Vm runs one
    /// module, so the constant's handle names the string.
    len_cache: struct { p: u32 = std.math.maxInt(u32), units: u32 = 0 } = .{},

    pub const UnitCache = struct {
        /// The string's payload; none when empty.
        p: u32 = std.math.maxInt(u32),
        /// A code point that starts at UTF-16 unit `unit` and byte `byte`.
        unit: u32 = 0,
        byte: u32 = 0,
    };

    pub const Env = struct {
        resume_base: []const u8 = "/resume",
        form_base: []const u8 = "/resume",
        /// The shard's resume secret; null in fixture runs.
        secret: ?*const [32]u8 = null,
        /// The time zones that the shell sent (`Date.zoneOffset`).
        zones: []const tz.Zone = &.{},
        /// A zone did not fit in the table of `zones_cap` zones.
        zones_full: bool = false,
        zones_cap: u32 = 0,
    };

    pub const LimitReason = enum { none, fuel, memory, depth, fibres };

    pub fn charge(vm: *Vm, n: u64) void {
        vm.charged +|= n;
    }

    // ---- strings -------------------------------------------------------

    /// The byte length of a string value, without its bytes.
    pub fn strLen(vm: *const Vm, v: Value) usize {
        const p = value.payload(v);
        if (p >= value.const_handle_base) return vm.m.str(p - value.const_handle_base).len;
        return vm.r.at(heap.Str, p).len;
    }

    pub fn str(vm: *const Vm, v: Value) []const u8 {
        std.debug.assert(value.kindOf(v) == .string);
        const p = value.payload(v);
        if (p >= value.const_handle_base) return vm.m.str(p - value.const_handle_base);
        return vm.r.strBytes(p);
    }

    pub fn utf16Len(vm: *Vm, v: Value) u32 {
        const p = value.payload(v);
        if (p < value.const_handle_base) return vm.r.at(heap.Str, p).utf16_len;
        // A module constant has no header: count once, then keep the count
        // for the next `.length` of the same constant (a loop condition).
        if (vm.len_cache.p == p) return vm.len_cache.units;
        const units = heap.utf16Len(vm.str(v));
        vm.len_cache = .{ .p = p, .units = units };
        return units;
    }

    pub fn newStr(vm: *Vm, bytes: []const u8) Err!Value {
        return vm.r.newString(bytes);
    }

    // ---- errors ---------------------------------------------------------

    pub fn makeError(vm: *Vm, kind: ErrKind, msg: Value) Err!Value {
        const o = try vm.r.newObject(2);
        const name = try vm.newStr(err_names[@backingInt(kind)]);
        try vm.objSet(value.payload(o), try vm.newStr("name"), name);
        try vm.objSet(value.payload(o), try vm.newStr("message"), msg);
        return o;
    }

    pub fn throwMsg(vm: *Vm, kind: ErrKind, comptime fmt: []const u8, args: anytype) Err {
        var buf: [256]u8 = undefined;
        const msg_bytes = std.fmt.bufPrint(&buf, fmt, args) catch buf[0..];
        const msg = try vm.newStr(msg_bytes);
        vm.thrown = try vm.makeError(kind, msg);
        return error.Throw;
    }

    pub fn limit(vm: *Vm, reason: LimitReason) Err {
        vm.limit_reason = reason;
        return error.Limit;
    }

    // ---- conversions ----------------------------------------------------

    pub fn truthy(vm: *const Vm, v: Value) bool {
        return switch (value.kindOf(v)) {
            .number => blk: {
                const f = value.asNum(v);
                break :blk !(f == 0 or std.math.isNan(f));
            },
            .undefined, .null => false,
            .boolean => value.payload(v) != 0,
            .string => vm.str(v).len != 0,
            else => true,
        };
    }

    pub fn typeOf(vm: *const Vm, v: Value) []const u8 {
        return switch (value.kindOf(v)) {
            .number => "number",
            .undefined => "undefined",
            .null, .array, .object => "object",
            .boolean => "boolean",
            .string => "string",
            .ref => if (vm.r.hdr(value.payload(v)).kind == .closure) "function" else "object",
        };
    }

    pub fn toNumber(vm: *Vm, v: Value) Err!f64 {
        return switch (value.kindOf(v)) {
            .number => value.asNum(v),
            .undefined => std.math.nan(f64),
            .null => 0,
            .boolean => @floatFromInt(value.payload(v)),
            .string => numfmt.parse(vm.str(v)),
            .array => blk: {
                const t = vm.scratch.begin();
                defer t.end();
                var b = vm.scratch.builder();
                try vm.appendString(&b, v);
                break :blk numfmt.parse(b.bytes());
            },
            .object, .ref => std.math.nan(f64),
        };
    }

    /// Append ToString(v) to `b`. Arrays are joined with commas without
    /// recursion: nested arrays use an explicit stack.
    pub fn appendString(vm: *Vm, b: *Builder, v: Value) Err!void {
        if (value.kindOf(v) != .array) return vm.appendScalarString(b, v);
        var stack: [max_depth]struct { off: u32, i: u32 } = undefined;
        var sp: usize = 1;
        stack[0] = .{ .off = value.payload(v), .i = 0 };
        while (sp > 0) {
            const top = &stack[sp - 1];
            const items = vm.r.arrItems(top.off);
            if (top.i >= items.len) {
                sp -= 1;
                continue;
            }
            if (top.i > 0) try b.byte(',');
            const item = items[top.i];
            top.i += 1;
            if (value.kindOf(item) == .array) {
                if (sp == max_depth) return vm.limit(.depth);
                stack[sp] = .{ .off = value.payload(item), .i = 0 };
                sp += 1;
            } else if (!value.isNullish(item)) {
                try vm.appendScalarString(b, item);
            }
        }
    }

    fn appendScalarString(vm: *Vm, b: *Builder, v: Value) Err!void {
        switch (value.kindOf(v)) {
            .number => {
                var nb: [numfmt.max_len]u8 = undefined;
                try b.append(numfmt.format(&nb, value.asNum(v)));
            },
            .undefined => try b.append("undefined"),
            .null => try b.append("null"),
            .boolean => try b.append(if (value.payload(v) != 0) "true" else "false"),
            .string => try b.append(vm.str(v)),
            .object => try b.append("[object Object]"),
            .ref => try b.append("function () { [native code] }"),
            .array => unreachable, // appendString handles arrays.
        }
    }

    pub fn toStr(vm: *Vm, v: Value) Err!Value {
        if (value.kindOf(v) == .string) return v;
        const t = vm.scratch.begin();
        defer t.end();
        var b = vm.scratch.builder();
        try vm.appendString(&b, v);
        return vm.newStr(b.bytes());
    }

    // ---- equality and comparison ---------------------------------------

    pub fn strictEquals(vm: *const Vm, a: Value, b: Value) bool {
        const ka = value.kindOf(a);
        if (ka != value.kindOf(b)) return false;
        return switch (ka) {
            .number => value.asNum(a) == value.asNum(b),
            .string => a == b or (vm.strLen(a) == vm.strLen(b) and std.mem.eql(u8, vm.str(a), vm.str(b))),
            else => a == b,
        };
    }

    /// SameValueZero, used by `includes`.
    pub fn sameValueZero(vm: *const Vm, a: Value, b: Value) bool {
        if (value.kindOf(a) == .number and value.kindOf(b) == .number) {
            const x = value.asNum(a);
            const y = value.asNum(b);
            if (std.math.isNan(x) and std.math.isNan(y)) return true;
        }
        return vm.strictEquals(a, b);
    }

    pub const Order = enum { lt, eq, gt, unordered };

    pub fn compare(vm: *Vm, a: Value, b: Value) Err!Order {
        const sa = try vm.toPrimitiveForCompare(a);
        const sb = try vm.toPrimitiveForCompare(b);
        if (value.kindOf(sa) == .string and value.kindOf(sb) == .string) {
            return switch (compareUtf16(vm.str(sa), vm.str(sb))) {
                .lt => .lt,
                .eq => .eq,
                .gt => .gt,
            };
        }
        const x = try vm.toNumber(sa);
        const y = try vm.toNumber(sb);
        if (std.math.isNan(x) or std.math.isNan(y)) return .unordered;
        if (x < y) return .lt;
        if (x > y) return .gt;
        return .eq;
    }

    fn toPrimitiveForCompare(vm: *Vm, v: Value) Err!Value {
        return switch (value.kindOf(v)) {
            .array, .object, .ref => vm.toStr(v),
            else => v,
        };
    }

    // ---- arithmetic -----------------------------------------------------

    pub fn add(vm: *Vm, a: Value, b: Value) Err!Value {
        const ka = value.kindOf(a);
        const kb = value.kindOf(b);
        if (ka == .number and kb == .number) return value.num(value.asNum(a) + value.asNum(b));
        const pa_str = ka == .string or ka == .array or ka == .object or ka == .ref;
        const pb_str = kb == .string or kb == .array or kb == .object or kb == .ref;
        if (ka == .string) {
            // `s + x`: a long result grows a string buffer, so `s += x` in a
            // loop is linear (heap.Region.appendStr).
            const t = vm.scratch.begin();
            defer t.end();
            var bld = vm.scratch.builder();
            try vm.appendString(&bld, b);
            // Keep the tail: the second builder below starts after it.
            const tail = bld.finish();
            const a_bytes = vm.str(a);
            if (a_bytes.len + tail.len >= heap.strbuf_min) {
                return vm.r.appendStr(a, a_bytes, vm.utf16Len(a), tail);
            }
            var both = vm.scratch.builder();
            try both.append(a_bytes);
            try both.append(tail);
            return vm.newStr(both.bytes());
        }
        if (pa_str or pb_str) {
            const t = vm.scratch.begin();
            defer t.end();
            var bld = vm.scratch.builder();
            try vm.appendString(&bld, a);
            try vm.appendString(&bld, b);
            return vm.newStr(bld.bytes());
        }
        return value.num(try vm.toNumber(a) + try vm.toNumber(b));
    }

    // ---- objects ----------------------------------------------------------

    pub fn objFind(vm: *const Vm, off: u32, key: []const u8) ?u32 {
        const es = vm.r.objEntries(off);
        var i: u32 = 0;
        while (i < es.len) : (i += 2) {
            if (std.mem.eql(u8, vm.str(es[i]), key)) return i / 2;
        }
        return null;
    }

    /// `objFind` for a key value: the same value (a module constant set and
    /// read by the program) matches without a look at the bytes.
    pub fn objFindValue(vm: *const Vm, off: u32, key: Value) ?u32 {
        const es = vm.r.objEntries(off);
        const bytes = vm.str(key);
        var i: u32 = 0;
        while (i < es.len) : (i += 2) {
            if (es[i] == key) return i / 2;
            // The length is in the header: most keys differ there.
            if (vm.strLen(es[i]) != bytes.len) continue;
            if (std.mem.eql(u8, vm.str(es[i]), bytes)) return i / 2;
        }
        return null;
    }

    pub fn objGet(vm: *const Vm, off: u32, key: []const u8) Value {
        const i = vm.objFind(off, key) orelse return value.undef;
        return vm.r.objEntries(off)[i * 2 + 1];
    }

    /// Set a property. `key` must be a string value.
    pub fn objSet(vm: *Vm, off: u32, key: Value, v: Value) Err!void {
        std.debug.assert(value.kindOf(key) == .string);
        if (vm.objFindValue(off, key)) |i| {
            vm.r.objEntries(off)[i * 2 + 1] = v;
            return;
        }
        try vm.r.objReserve(off, 1);
        const o = vm.r.at(heap.Obj, off);
        const es = vm.r.valsAt(o.entries, o.cap * 2);
        es[o.count * 2] = key;
        es[o.count * 2 + 1] = v;
        o.count += 1;
    }

    pub fn objDelete(vm: *Vm, off: u32, key: []const u8) void {
        const i = vm.objFind(off, key) orelse return;
        const o = vm.r.at(heap.Obj, off);
        const es = vm.r.valsAt(o.entries, o.cap * 2);
        std.mem.copyForwards(Value, es[i * 2 .. o.count * 2 - 2], es[i * 2 + 2 .. o.count * 2]);
        es[o.count * 2 - 2] = value.undef;
        es[o.count * 2 - 1] = value.undef;
        o.count -= 1;
    }

    /// Entry indices in ECMAScript key order: array-index keys ascending,
    /// then the others in insertion order. Returned slice is in scratch.
    pub fn orderedKeys(vm: *Vm, off: u32) Err![]u32 {
        const es = vm.r.objEntries(off);
        const n: u32 = @intCast(es.len / 2);
        const out = try vm.scratch.push(u32, n);
        var nidx: u32 = 0;
        var i: u32 = 0;
        while (i < n) : (i += 1) {
            if (arrayIndex(vm.str(es[i * 2])) != null) {
                out[nidx] = i;
                nidx += 1;
            }
        }
        if (nidx == 0) {
            for (out, 0..) |*o, j| o.* = @intCast(j);
            return out;
        }
        const Ctx = struct {
            vm: *Vm,
            es: []Value,
            fn less(c: @This(), x: u32, y: u32) bool {
                return arrayIndex(c.vm.str(c.es[x * 2])).? < arrayIndex(c.vm.str(c.es[y * 2])).?;
            }
        };
        std.sort.insertion(u32, out[0..nidx], Ctx{ .vm = vm, .es = es }, Ctx.less);
        var w = nidx;
        i = 0;
        while (i < n) : (i += 1) {
            if (arrayIndex(vm.str(es[i * 2])) == null) {
                out[w] = i;
                w += 1;
            }
        }
        return out;
    }

    // ---- property access --------------------------------------------------

    pub fn getProp(vm: *Vm, obj: Value, key: []const u8) Err!Value {
        switch (value.kindOf(obj)) {
            .object => return vm.objGet(value.payload(obj), key),
            .array => {
                if (std.mem.eql(u8, key, "length")) return value.num(@floatFromInt(vm.r.at(heap.Arr, value.payload(obj)).len));
                const idx = arrayIndex(key) orelse return value.undef;
                return vm.arrGet(obj, idx);
            },
            .string => {
                if (std.mem.eql(u8, key, "length")) return value.num(@floatFromInt(vm.utf16Len(obj)));
                const idx = arrayIndex(key) orelse return value.undef;
                return vm.charAt(obj, idx);
            },
            .undefined, .null => return vm.throwMsg(.type_error, "Cannot read properties of {s} (reading '{s}')", .{ if (value.kindOf(obj) == .null) "null" else "undefined", key }),
            else => return value.undef,
        }
    }

    pub fn getElem(vm: *Vm, obj: Value, key: Value) Err!Value {
        if (value.kindOf(key) == .number) {
            const f = value.asNum(key);
            const k = value.kindOf(obj);
            if ((k == .array or k == .string) and f >= 0 and f == @trunc(f) and f < 4294967295) {
                const idx: u32 = @intFromFloat(f);
                return if (k == .array) vm.arrGet(obj, idx) else vm.charAt(obj, idx);
            }
        }
        const t = vm.scratch.begin();
        defer t.end();
        var b = vm.scratch.builder();
        try vm.appendString(&b, key);
        return vm.getProp(obj, b.finish());
    }

    pub fn arrGet(vm: *const Vm, arr: Value, idx: u32) Value {
        const items = vm.r.arrItems(value.payload(arr));
        if (idx >= items.len) return value.undef;
        return items[idx];
    }

    pub fn charAt(vm: *Vm, s: Value, idx: u32) Err!Value {
        if (idx >= vm.utf16Len(s)) return value.undef;
        return vm.sliceUtf16(s, idx, idx + 1);
    }

    /// The UTF-16 units [a, b) as a new string. A surrogate pair cut by
    /// either end leaves a lone surrogate, stored as WTF-8 (3 bytes), as
    /// JavaScript keeps it.
    pub fn sliceUtf16(vm: *Vm, s: Value, a: u32, b: u32) Err!Value {
        if (a >= b) return vm.newStr("");
        const bytes = vm.str(s);
        // ASCII: units are bytes, so slice without a scan from the start.
        if (vm.utf16Len(s) == bytes.len) {
            const lo = @min(a, bytes.len);
            return vm.newStr(bytes[lo..@min(b, bytes.len)]);
        }
        var buf: [8]u8 = undefined;
        var pre: []const u8 = &.{};
        var post: []const u8 = &.{};
        var start_unit = a;
        var end_unit = b;
        if (pairAt(bytes, a)) |cp| if (cp.second) {
            pre = encodeSurrogate(buf[0..3], cp.low);
            start_unit = a + 1;
        };
        if (pairAt(bytes, b)) |cp| if (cp.second) {
            post = encodeSurrogate(buf[3..6], cp.high);
            end_unit = b - 1;
        };
        const r = utf16Range(bytes, start_unit, @max(start_unit, end_unit));
        if (pre.len == 0 and post.len == 0) return vm.newStr(bytes[r[0]..r[1]]);
        const out = try vm.r.newStringUninit(@intCast(pre.len + (r[1] - r[0]) + post.len));
        @memcpy(out.bytes[0..pre.len], pre);
        @memcpy(out.bytes[pre.len..][0 .. r[1] - r[0]], vm.str(s)[r[0]..r[1]]);
        @memcpy(out.bytes[out.bytes.len - post.len ..], post);
        vm.r.finishString(out.v);
        return out.v;
    }

    pub fn setElem(vm: *Vm, obj: Value, key: Value, v: Value) Err!void {
        const k = value.kindOf(obj);
        if (k == .array) {
            const idx: ?u32 = switch (value.kindOf(key)) {
                .number => blk: {
                    const f = value.asNum(key);
                    break :blk if (f >= 0 and f == @trunc(f) and f < 4294967295) @as(u32, @intFromFloat(f)) else null;
                },
                .string => arrayIndex(vm.str(key)),
                else => null,
            };
            if (idx) |i| return vm.arrSet(value.payload(obj), i, v);
            if (value.kindOf(key) == .string and std.mem.eql(u8, vm.str(key), "length")) {
                return vm.arrSetLength(value.payload(obj), try vm.toNumber(v));
            }
            return; // Named properties on arrays are not part of the subset.
        }
        if (k == .undefined or k == .null) {
            const t = vm.scratch.begin();
            defer t.end();
            var b = vm.scratch.builder();
            try vm.appendString(&b, key);
            return vm.throwMsg(.type_error, "Cannot set properties of {s} (setting '{s}')", .{ if (k == .null) "null" else "undefined", b.finish() });
        }
        if (k != .object) return;
        const ks = try vm.toStr(key);
        try vm.objSet(value.payload(obj), ks, v);
    }

    pub fn arrSet(vm: *Vm, off: u32, idx: u32, v: Value) Err!void {
        const len = vm.r.at(heap.Arr, off).len;
        if (idx >= len) {
            if (idx - len > 1_000_000) return vm.limit(.memory);
            try vm.r.arrReserve(off, idx + 1 - len);
            const a = vm.r.at(heap.Arr, off);
            a.len = idx + 1;
        }
        vm.r.arrItems(off)[idx] = v;
    }

    fn arrSetLength(vm: *Vm, off: u32, f: f64) Err!void {
        if (!(f >= 0 and f == @trunc(f) and f < 4294967295)) return vm.throwMsg(.range_error, "Invalid array length", .{});
        const n: u32 = @intFromFloat(f);
        const a = vm.r.at(heap.Arr, off);
        if (n > a.len) return vm.arrSet(off, n - 1, value.undef);
        const items = vm.r.valsAt(a.items, a.cap);
        @memset(items[n..a.len], value.undef);
        a.len = n;
    }

    pub fn hasProp(vm: *Vm, obj: Value, key: Value) Err!bool {
        const t = vm.scratch.begin();
        defer t.end();
        var b = vm.scratch.builder();
        try vm.appendString(&b, key);
        const ks = b.finish();
        return switch (value.kindOf(obj)) {
            .object => vm.objFind(value.payload(obj), ks) != null,
            .array => std.mem.eql(u8, ks, "length") or (if (arrayIndex(ks)) |i| i < vm.r.at(heap.Arr, value.payload(obj)).len else false),
            else => vm.throwMsg(.type_error, "Cannot use 'in' operator to search for '{s}'", .{ks}),
        };
    }
};

/// The array index named by a canonical numeric key, or null.
pub fn arrayIndex(key: []const u8) ?u32 {
    if (key.len == 0 or key.len > 10) return null;
    if (key.len > 1 and key[0] == '0') return null;
    var n: u64 = 0;
    for (key) |c| {
        if (c < '0' or c > '9') return null;
        n = n * 10 + (c - '0');
    }
    if (n >= 4294967295) return null;
    return @intCast(n);
}

/// Byte range of UTF-16 code units [from, to) in UTF-8 `bytes`. Indices are
/// clamped. A surrogate pair counts as two units and is kept whole.
pub fn utf16Range(bytes: []const u8, from: u32, to: u32) [2]usize {
    var unit: u32 = 0;
    var i: usize = 0;
    var start: ?usize = null;
    while (i < bytes.len) {
        if (start == null and unit >= from) start = i;
        if (unit >= to) break;
        const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch 1;
        unit += if (n == 4) 2 else 1;
        i += n;
    }
    const s = start orelse bytes.len;
    return .{ s, @max(s, @min(i, bytes.len)) };
}

const PairHit = struct { second: bool, high: u21, low: u21 };

/// When unit `idx` is the second half of a surrogate pair, return the pair.
fn pairAt(bytes: []const u8, idx: u32) ?PairHit {
    var unit: u32 = 0;
    var i: usize = 0;
    while (i < bytes.len and unit <= idx) {
        const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch 1;
        if (n == 4 and unit + 1 == idx and i + 4 <= bytes.len) {
            const cp = std.unicode.utf8Decode(bytes[i..][0..4]) catch return null;
            return .{ .second = true, .high = @intCast(0xD800 + ((cp - 0x10000) >> 10)), .low = @intCast(0xDC00 + ((cp - 0x10000) & 0x3FF)) };
        }
        unit += if (n == 4) 2 else 1;
        i += n;
    }
    return null;
}

/// WTF-8 form of a lone surrogate.
pub fn encodeSurrogate(out: []u8, u: u21) []const u8 {
    out[0] = 0xED;
    out[1] = @intCast(0x80 | ((u >> 6) & 0x3F));
    out[2] = @intCast(0x80 | (u & 0x3F));
    return out[0..3];
}

/// UTF-16 index of a byte offset.
pub fn byteToUtf16(bytes: []const u8, byte_off: usize) u32 {
    var unit: u32 = 0;
    var i: usize = 0;
    while (i < byte_off and i < bytes.len) {
        const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch 1;
        unit += if (n == 4) 2 else 1;
        i += n;
    }
    return unit;
}

/// Compare by UTF-16 code units, as ECMAScript does.
pub fn compareUtf16(a: []const u8, b: []const u8) std.math.Order {
    var i: usize = 0;
    var j: usize = 0;
    while (i < a.len and j < b.len) {
        const ua = firstUnit(a, &i);
        const ub = firstUnit(b, &j);
        if (ua != ub) return std.math.order(ua, ub);
    }
    if (i < a.len) return .gt;
    if (j < b.len) return .lt;
    return .eq;
}

/// Decode one code point and return its first UTF-16 unit. A supplementary
/// code point returns its high surrogate; its low surrogate is compared too.
fn firstUnit(s: []const u8, i: *usize) u32 {
    const n = std.unicode.utf8ByteSequenceLength(s[i.*]) catch 1;
    const cp: u32 = if (n == 1 or i.* + n > s.len) s[i.*] else std.unicode.utf8Decode(s[i.*..][0..n]) catch s[i.*];
    i.* += n;
    // Key = first unit in the high half, second unit (if any) in the low half.
    if (cp < 0x10000) return cp << 16;
    const hi = 0xD800 + ((cp - 0x10000) >> 10);
    const lo = 0xDC00 + ((cp - 0x10000) & 0x3FF);
    return (hi << 16) | lo;
}

test "utf16 ranges" {
    const s = "aé😀b";
    try std.testing.expectEqual(@as(u32, 5), heap.utf16Len(s));
    const r = utf16Range(s, 2, 4);
    try std.testing.expectEqualStrings("😀", s[r[0]..r[1]]);
    try std.testing.expectEqual(@as(?u32, 7), arrayIndex("7"));
    try std.testing.expectEqual(@as(?u32, null), arrayIndex("07"));
}
