//! The string methods: case mapping, indexing by UTF-16 unit, `split`,
//! `replace`, `pad`, `repeat`, and the rest of `stringMethod`.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const numfmt = @import("numfmt.zig");
const collate = @import("collate.zig");
const unorm = @import("normalize.zig");
const unicase = @import("unicase.zig");
const heap = @import("heap.zig");
const Builder = @import("arena.zig").Builder;
const lib = @import("lib_types.zig");

const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;
const Method = lib.Method;

/// True when the position is below 0 after ToIntegerOrInfinity (out of range for charAt).
fn negativeIndex(vm: *Vm, v: Value) Err!bool {
    if (value.kindOf(v) == .undefined) return false;
    return try lib.integerOrInfinity(vm, v) < 0;
}

pub const UnitByte = struct { byte: usize, inside: bool };

/// The byte offset of UTF-16 unit `unit` (clamped to the text), and whether the unit is
/// the second half of a surrogate pair (then `byte` is the start of that pair).
pub fn unitByte(bytes: []const u8, unit: u32) UnitByte {
    var u: u32 = 0;
    var i: usize = 0;
    // Each pass moves past one code point, so the byte length bounds the loop.
    while (i < bytes.len and u < unit) {
        const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch 1;
        if (n == 4 and u + 1 == unit and i + 4 <= bytes.len) return .{ .byte = i, .inside = true };
        u += if (n == 4) 2 else 1;
        i += n;
    }
    const at = @min(i, bytes.len);
    std.debug.assert(at <= bytes.len);
    return .{ .byte = at, .inside = false };
}

/// Clamp a relative index as String/Array slice does.
pub fn relIndex(vm: *Vm, v: Value, len: u32, default: u32) Err!u32 {
    if (value.kindOf(v) == .undefined) return default;
    const f = @trunc(try vm.toNumber(v));
    if (std.math.isNan(f)) return 0;
    const lf: f64 = @floatFromInt(len);
    const r = if (f < 0) @max(0, lf + f) else @min(f, lf);
    return @intFromFloat(r);
}

pub fn stringMethod(vm: *Vm, m: Method, s: Value, args: []const Value) Err!Value {
    const bytes = vm.str(s);
    return switch (m) {
        .to_upper_case, .to_lower_case => changeCase(vm, bytes, m == .to_upper_case),
        .trim => vm.newStr(numfmt.trimJs(bytes)),
        .locale_compare => blk: {
            // The CLDR root collation; the compiler allows only the call without locales or options.
            const other = try vm.toStr(lib.arg(args, 0));
            break :blk value.num(@floatFromInt(try collate.compare(vm.scratch, bytes, vm.str(other))));
        },
        .normalize => blk: {
            const f = lib.arg(args, 0);
            const name = if (value.kindOf(f) == .undefined) "NFC" else vm.str(try vm.toStr(f));
            const form = unorm.formOf(name) orelse
                return vm.throwMsg(.range_error, "The normalization form should be one of NFC, NFD, NFKC, NFKD.", .{});
            const t = vm.scratch.begin();
            defer t.end();
            break :blk vm.newStr(try unorm.normalize(vm.scratch, vm.str(s), form));
        },
        .trim_start => vm.newStr(bytes[startTrim(bytes)..]),
        .trim_end => vm.newStr(bytes[0..endTrim(bytes)]),
        .starts_with => blk: {
            const needle = vm.str(try vm.toStr(lib.arg(args, 0)));
            const at = unitByte(vm.str(s), try clampIndex(vm, lib.arg(args, 1), vm.utf16Len(s), 0));
            if (needle.len == 0) break :blk value.true_;
            // A text cannot start in the middle of a surrogate pair.
            if (at.inside) break :blk value.false_;
            break :blk value.boolean(std.mem.startsWith(u8, vm.str(s)[at.byte..], needle));
        },
        .ends_with => blk: {
            const needle = vm.str(try vm.toStr(lib.arg(args, 0)));
            const len = vm.utf16Len(s);
            const at = unitByte(vm.str(s), try clampIndex(vm, lib.arg(args, 1), len, len));
            if (needle.len == 0) break :blk value.true_;
            if (at.inside) break :blk value.false_;
            break :blk value.boolean(std.mem.endsWith(u8, vm.str(s)[0..at.byte], needle));
        },
        .includes => blk: {
            const needle = vm.str(try vm.toStr(lib.arg(args, 0)));
            const at = unitByte(vm.str(s), try clampIndex(vm, lib.arg(args, 1), vm.utf16Len(s), 0));
            if (needle.len == 0) break :blk value.true_;
            // A match cannot start in the middle of a pair: look from the end of the pair.
            const from = if (at.inside) at.byte + 4 else at.byte;
            break :blk value.boolean(std.mem.indexOfPos(u8, vm.str(s), from, needle) != null);
        },
        .index_of => blk: {
            const needle = vm.str(try vm.toStr(lib.arg(args, 0)));
            // V8 clamps the position to 0..length; a negative position is 0.
            const from_units = try clampIndex(vm, lib.arg(args, 1), vm.utf16Len(s), 0);
            if (needle.len == 0) break :blk value.num(@floatFromInt(from_units));
            const at = unitByte(vm.str(s), from_units);
            const from = if (at.inside) at.byte + 4 else at.byte;
            const pos = std.mem.indexOfPos(u8, vm.str(s), from, needle) orelse break :blk value.num(-1);
            break :blk value.num(@floatFromInt(ops.byteToUtf16(vm.str(s), pos)));
        },
        .slice => blk: {
            const len = vm.utf16Len(s);
            const a = try relIndex(vm, lib.arg(args, 0), len, 0);
            const b = try relIndex(vm, lib.arg(args, 1), len, len);
            break :blk substr(vm, s, a, @max(a, b));
        },
        .substring => blk: {
            const len = vm.utf16Len(s);
            const a = try clampIndex(vm, lib.arg(args, 0), len, 0);
            const b = try clampIndex(vm, lib.arg(args, 1), len, len);
            break :blk substr(vm, s, @min(a, b), @max(a, b));
        },
        .char_at => blk: {
            // A negative position is out of range (V8: ToIntegerOrInfinity, then the range check).
            if (try negativeIndex(vm, lib.arg(args, 0))) break :blk vm.newStr("");
            const i = try clampIndex(vm, lib.arg(args, 0), std.math.maxInt(u32), 0);
            const c = try vm.charAt(s, i);
            break :blk if (c == value.undef) vm.newStr("") else c;
        },
        .at => blk: {
            const len = vm.utf16Len(s);
            const f = try lib.integerOrInfinity(vm, lib.arg(args, 0));
            const idx = if (f < 0) @as(f64, @floatFromInt(len)) + f else f;
            if (!(idx >= 0 and idx < @as(f64, @floatFromInt(len)))) break :blk value.undef;
            break :blk vm.charAt(s, @intFromFloat(idx));
        },
        .char_code_at => charCodeAt(vm, s, args),
        .split => split(vm, s, args),
        .replace, .replace_all => replace(vm, s, args, m == .replace_all),
        .pad_start, .pad_end => pad(vm, s, args, m == .pad_start),
        .repeat => repeat(vm, bytes, try vm.toNumber(lib.arg(args, 0))),
        .concat => blk: {
            const t = vm.scratch.begin();
            defer t.end();
            var b = vm.scratch.builder();
            try b.append(bytes);
            for (args) |a| try vm.appendString(&b, a);
            break :blk vm.newStr(b.bytes());
        },
        .to_string => s,
        else => lib.notAFunction(vm, m),
    };
}

fn clampIndex(vm: *Vm, v: Value, len: u32, default: u32) Err!u32 {
    if (value.kindOf(v) == .undefined) return default;
    const f = @trunc(try vm.toNumber(v));
    if (std.math.isNan(f) or f < 0) return 0;
    return @intFromFloat(@min(f, @as(f64, @floatFromInt(len))));
}

fn substr(vm: *Vm, s: Value, a: u32, b: u32) Err!Value {
    return vm.sliceUtf16(s, a, b);
}

fn startTrim(s: []const u8) usize {
    const t = numfmt.trimJs(s);
    return if (t.len == 0) s.len else @intFromPtr(t.ptr) - @intFromPtr(s.ptr);
}

fn endTrim(s: []const u8) usize {
    const t = numfmt.trimJs(s);
    return if (t.len == 0) 0 else @intFromPtr(t.ptr) - @intFromPtr(s.ptr) + t.len;
}

/// String.prototype.toUpperCase / toLowerCase: the full Unicode mappings of
/// `unicase.zig`, with the Final_Sigma rule. Bytes that are not valid UTF-8
/// (lone surrogates) pass through unchanged.
fn changeCase(vm: *Vm, bytes: []const u8, upper: bool) Err!Value {
    for (bytes) |c| {
        if (c >= 0x80) break;
    } else {
        const out = try vm.r.newStringUninit(@intCast(bytes.len));
        for (bytes, 0..) |c, i| out.bytes[i] = if (upper) std.ascii.toUpper(c) else std.ascii.toLower(c);
        vm.r.finishString(out.v);
        return out.v;
    }
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    try caseMap(&b, bytes, upper);
    return vm.newStr(b.finish());
}

const Decoded = struct { cp: u21, len: u3 };

fn decodeAt(bytes: []const u8, i: usize) ?Decoded {
    const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch return null;
    if (i + n > bytes.len) return null;
    const cp = std.unicode.utf8Decode(bytes[i..][0..n]) catch return null;
    return .{ .cp = cp, .len = n };
}

/// Appends the case mapping of `bytes` to `b`.
pub fn caseMap(b: *Builder, bytes: []const u8, upper: bool) Err!void {
    var i: usize = 0;
    while (i < bytes.len) {
        const d = decodeAt(bytes, i) orelse {
            try b.byte(bytes[i]);
            i += 1;
            continue;
        };
        const m = if (upper)
            unicase.toUpper(d.cp)
        else if (d.cp == 0x3A3 and isFinalSigma(bytes, i, i + d.len))
            unicase.Mapped{ .len = 1, .cps = .{ 0x3C2, 0, 0 } }
        else
            unicase.toLower(d.cp);
        for (m.slice()) |cp| {
            var enc: [4]u8 = undefined;
            const n = std.unicode.utf8Encode(cp, &enc) catch unreachable;
            try b.append(enc[0..n]);
        }
        i += d.len;
    }
}

/// The Final_Sigma condition of SpecialCasing, as ICU checks it: a cased
/// letter before the sigma and none after it, skipping case-ignorable ones.
fn isFinalSigma(bytes: []const u8, start: usize, end: usize) bool {
    var j = start;
    const before = while (j > 0) {
        var k = j - 1;
        while (k > 0 and j - k < 4 and bytes[k] & 0xC0 == 0x80) k -= 1;
        const d = decodeAt(bytes, k) orelse break false;
        if (k + d.len != j) break false;
        j = k;
        if (unicase.isCaseIgnorable(d.cp)) continue;
        break unicase.isCased(d.cp);
    } else false;
    if (!before) return false;
    j = end;
    while (j < bytes.len) {
        const d = decodeAt(bytes, j) orelse return true;
        j += d.len;
        if (unicase.isCaseIgnorable(d.cp)) continue;
        return !unicase.isCased(d.cp);
    }
    return true;
}

fn charCodeAt(vm: *Vm, s: Value, args: []const Value) Err!Value {
    if (try negativeIndex(vm, lib.arg(args, 0))) return value.num(std.math.nan(f64));
    const i = try clampIndex(vm, lib.arg(args, 0), std.math.maxInt(u32), 0);
    const bytes = vm.str(s);
    // ASCII: a UTF-16 unit is a byte, so no scan from the start (a loop over
    // `charCodeAt(i)` would be quadratic).
    if (vm.utf16Len(s) == bytes.len) {
        return if (i < bytes.len) value.num(@floatFromInt(bytes[i])) else value.num(std.math.nan(f64));
    }
    var unit: u32 = 0;
    var p: usize = 0;
    // Go on from the last position found in this string when it is not past `i`.
    const key = value.payload(s);
    if (vm.unit_cache.p == key and vm.unit_cache.unit <= i) {
        unit = vm.unit_cache.unit;
        p = vm.unit_cache.byte;
        std.debug.assert(p <= bytes.len);
    }
    // Each pass moves past one code point, so the byte length bounds the loop.
    while (p < bytes.len) {
        const n = std.unicode.utf8ByteSequenceLength(bytes[p]) catch 1;
        const cp: u21 = if (n == 1) bytes[p] else std.unicode.utf8Decode(bytes[p..][0..n]) catch 0xFFFD;
        if (unit == i or (n == 4 and unit + 1 == i)) {
            vm.unit_cache = .{ .p = key, .unit = unit, .byte = @intCast(p) };
        }
        if (n == 4) {
            if (unit == i) return value.num(@floatFromInt(0xD800 + ((cp - 0x10000) >> 10)));
            if (unit + 1 == i) return value.num(@floatFromInt(0xDC00 + ((cp - 0x10000) & 0x3FF)));
            unit += 2;
        } else {
            if (unit == i) return value.num(@floatFromInt(cp));
            unit += 1;
        }
        p += n;
    }
    return value.num(std.math.nan(f64));
}

fn split(vm: *Vm, s: Value, args: []const Value) Err!Value {
    const sep_v = lib.arg(args, 0);
    const out = try vm.r.newArray(4);
    const out_off = value.payload(out);
    const lim: u32 = if (value.kindOf(lib.arg(args, 1)) == .undefined) std.math.maxInt(u32) else numfmt.toUint32(try vm.toNumber(lib.arg(args, 1)));
    if (lim == 0) return out;
    if (value.kindOf(sep_v) == .undefined) {
        try vm.r.arrPush(out_off, s);
        return out;
    }
    const sep = try vm.toStr(sep_v);
    if (vm.str(sep).len == 0) {
        var i: u32 = 0;
        const len = vm.utf16Len(s);
        while (i < len and vm.r.at(heap.Arr, out_off).len < lim) : (i += 1) {
            const c = try vm.charAt(s, i);
            try vm.r.arrPush(out_off, c);
        }
        return out;
    }
    var start: usize = 0;
    while (vm.r.at(heap.Arr, out_off).len < lim) {
        const bytes = vm.str(s);
        const pos = std.mem.indexOfPos(u8, bytes, start, vm.str(sep)) orelse {
            const piece = try vm.newStr(vm.str(s)[start..]);
            try vm.r.arrPush(out_off, piece);
            break;
        };
        const piece = try vm.newStr(bytes[start..pos]);
        try vm.r.arrPush(out_off, piece);
        start = pos + vm.str(sep).len;
    }
    return out;
}

fn replace(vm: *Vm, s: Value, args: []const Value, all: bool) Err!Value {
    const pat = try vm.toStr(lib.arg(args, 0));
    const rep = try vm.toStr(lib.arg(args, 1));
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    const bytes = vm.str(s);
    const p = vm.str(pat);
    var start: usize = 0;
    while (true) {
        const pos = std.mem.indexOfPos(u8, bytes, start, p) orelse break;
        try b.append(bytes[start..pos]);
        try appendReplacement(&b, vm.str(rep), bytes, pos, p.len);
        start = pos + p.len;
        if (!all) break;
        if (p.len == 0) {
            if (start >= bytes.len) break;
            try b.byte(bytes[start]);
            start += 1;
        }
    }
    try b.append(bytes[start..]);
    return vm.newStr(b.bytes());
}

/// Expand $$, $&, $` and $' in a replacement string.
fn appendReplacement(b: *Builder, rep: []const u8, subject: []const u8, pos: usize, len: usize) Err!void {
    var i: usize = 0;
    while (i < rep.len) : (i += 1) {
        if (rep[i] != '$' or i + 1 >= rep.len) {
            try b.byte(rep[i]);
            continue;
        }
        switch (rep[i + 1]) {
            '$' => try b.byte('$'),
            '&' => try b.append(subject[pos..][0..len]),
            '`' => try b.append(subject[0..pos]),
            '\'' => try b.append(subject[pos + len ..]),
            else => {
                try b.byte('$');
                continue;
            },
        }
        i += 1;
    }
}

fn pad(vm: *Vm, s: Value, args: []const Value, at_start: bool) Err!Value {
    const target_f = try vm.toNumber(lib.arg(args, 0));
    const len = vm.utf16Len(s);
    if (!(target_f > @as(f64, @floatFromInt(len)))) return s;
    if (target_f > 1_000_000) return vm.limit(.memory);
    const filler = if (value.kindOf(lib.arg(args, 1)) == .undefined) " " else vm.str(try vm.toStr(args[1]));
    if (filler.len == 0) return s;
    const need: usize = @as(usize, @intFromFloat(target_f)) - len;
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    if (!at_start) try b.append(vm.str(s));
    var units: usize = 0;
    var i: usize = 0;
    // Filler is treated as ASCII-like units; multi-byte fillers count bytes.
    while (units < need) : (units += 1) {
        try b.byte(filler[i]);
        i = (i + 1) % filler.len;
    }
    if (at_start) try b.append(vm.str(s));
    return vm.newStr(b.bytes());
}

fn repeat(vm: *Vm, bytes: []const u8, count_f: f64) Err!Value {
    if (std.math.isNan(count_f) or count_f < 0 or std.math.isInf(count_f)) return vm.throwMsg(.range_error, "Invalid count value: {d}", .{count_f});
    const count: usize = @intFromFloat(@trunc(count_f));
    if (count * bytes.len > 1_000_000) return vm.limit(.memory);
    const out = try vm.r.newStringUninit(@intCast(count * bytes.len));
    var i: usize = 0;
    while (i < count) : (i += 1) @memcpy(out.bytes[i * bytes.len ..][0..bytes.len], bytes);
    vm.r.finishString(out.v);
    return out.v;
}
