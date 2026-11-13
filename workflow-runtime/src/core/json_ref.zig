//! The reference JSON codec: the scalar codec that `json.zig` replaced,
//! kept unchanged so tests and benchmarks can compare the fast codec with
//! it (`json.zig`, "fuzz json against the reference"). Nothing at run time
//! calls it. Known differences from JSON.parse that the fast codec fixes:
//! `\u` takes the characters `std.fmt.parseInt` takes (`+`, `-`, `_`),
//! and a high surrogate escape followed by an escape that is not a low
//! surrogate is a syntax error.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const numfmt = @import("numfmt.zig");
const ops = @import("ops.zig");
const Builder = @import("arena.zig").Builder;
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

// ---- encode -------------------------------------------------------------

const Frame = struct {
    v: Value,
    i: u32 = 0,
    /// Objects: 0 = array-index keys ascending, 1 = other keys in order.
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
    var stack: [ops.max_depth]Frame = undefined;
    return encodeWith(vm, b, v, indent, &stack);
}

fn encodeWith(vm: *Vm, b: *Builder, v: Value, indent: []const u8, stack: *[ops.max_depth]Frame) Err!bool {
    if (!encodable(v, vm)) return false;
    var sp: usize = 0;
    if (!try writeScalarOrOpen(vm, b, v, stack, &sp)) return true;
    while (sp > 0) {
        const top = &stack[sp - 1];
        const next = if (value.kindOf(top.v) == .array) nextArrayItem(vm, top) else nextObjectEntry(vm, top);
        if (next) |item| {
            if (top.wrote) try b.byte(',');
            top.wrote = true;
            try newline(b, indent, sp);
            if (item.key) |k| {
                try writeString(b, vm.str(k));
                try b.byte(':');
                if (indent.len > 0) try b.byte(' ');
            }
            const child = if (encodable(item.v, vm)) item.v else value.null_;
            for (stack[0..sp]) |f| {
                if (value.isHeap(child) and f.v == child) return vm.throwMsg(.type_error, "Converting circular structure to JSON", .{});
            }
            if (sp == ops.max_depth) return vm.limit(.depth);
            _ = try writeScalarOrOpen(vm, b, child, stack, &sp);
            continue;
        }
        if (top.wrote) try newline(b, indent, sp - 1);
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
    if (indent.len == 0) return;
    try b.byte('\n');
    var n: usize = 0;
    while (n < depth) : (n += 1) try b.append(indent);
}

const Item = struct { key: ?Value, v: Value };

fn nextArrayItem(vm: *Vm, f: *Frame) ?Item {
    const items = vm.r.arrItems(value.payload(f.v));
    if (f.i >= items.len) return null;
    const v = items[f.i];
    f.i += 1;
    return .{ .key = null, .v = v };
}

/// Walk entries in ECMAScript order with no allocation: first the smallest
/// array-index key above the last one, repeatedly; then the other keys.
fn nextObjectEntry(vm: *Vm, f: *Frame) ?Item {
    const es = vm.r.objEntries(value.payload(f.v));
    const n: u32 = @intCast(es.len / 2);
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
        if (ops.arrayIndex(vm.str(es[i * 2])) != null) continue;
        if (!encodable(es[i * 2 + 1], vm)) continue;
        return .{ .key = es[i * 2], .v = es[i * 2 + 1] };
    }
    return null;
}

/// Write a scalar, or open a container and push its frame. Returns true when
/// a frame was pushed.
fn writeScalarOrOpen(vm: *Vm, b: *Builder, v: Value, stack: []Frame, sp: *usize) Err!bool {
    switch (value.kindOf(v)) {
        .number => {
            const f = value.asNum(v);
            if (std.math.isNan(f) or std.math.isInf(f)) {
                try b.append("null");
            } else {
                var nb: [numfmt.max_len]u8 = undefined;
                try b.append(numfmt.format(&nb, f));
            }
        },
        .null, .undefined => try b.append("null"),
        .boolean => try b.append(if (value.payload(v) != 0) "true" else "false"),
        .string => try writeString(b, vm.str(v)),
        .array, .object => {
            try b.byte(if (value.kindOf(v) == .array) '[' else '{');
            stack[sp.*] = .{ .v = v };
            sp.* += 1;
            return true;
        },
        .ref => try b.append("{}"),
    }
    return false;
}

const V16 = @Vector(16, u8);

/// True when none of 16 bytes needs a look in `writeString`: no quote, no
/// backslash, no control character, no 0xED (the lead byte of an encoded
/// lone surrogate).
fn plain16(chunk: V16) bool {
    const quote: V16 = @splat('"');
    const bslash: V16 = @splat('\\');
    const space: V16 = @splat(0x20);
    const ed: V16 = @splat(0xED);
    const hit = (chunk == quote) | (chunk == bslash) | (chunk < space) | (chunk == ed);
    return !@reduce(.Or, hit);
}

/// True when 16 bytes are printable ASCII other than quote and backslash:
/// the fast path of `Parser.string`.
fn ascii16(chunk: V16) bool {
    const quote: V16 = @splat('"');
    const bslash: V16 = @splat('\\');
    const space: V16 = @splat(0x20);
    const high: V16 = @splat(0x80);
    const hit = (chunk == quote) | (chunk == bslash) | (chunk < space) | (chunk >= high);
    return !@reduce(.Or, hit);
}

pub fn writeString(b: *Builder, s: []const u8) Err!void {
    try b.byte('"');
    var start: usize = 0;
    // 16 bytes at a time while none needs escaping: most text needs none.
    var skip: usize = 0;
    while (skip + 16 <= s.len and plain16(s[skip..][0..16].*)) skip += 16;
    for (s[skip..], skip..) |c, i| {
        // A lone surrogate (WTF-8 ED A0..BF xx) prints as \udXXX.
        if (c == 0xED and i + 2 < s.len and s[i + 1] >= 0xA0) {
            try b.append(s[start..i]);
            const u: u21 = (@as(u21, 0xD) << 12) | (@as(u21, s[i + 1] & 0x3F) << 6) | (s[i + 2] & 0x3F);
            var hb: [6]u8 = undefined;
            _ = std.fmt.bufPrint(&hb, "\\u{x:0>4}", .{u}) catch unreachable; // 6 bytes fit "\uXXXX".
            try b.append(&hb);
            start = i + 3;
            continue;
        }
        if (i < start) continue;
        const esc: ?[]const u8 = switch (c) {
            '"' => "\\\"",
            '\\' => "\\\\",
            '\n' => "\\n",
            '\r' => "\\r",
            '\t' => "\\t",
            0x08 => "\\b",
            0x0C => "\\f",
            else => null,
        };
        if (esc == null and c >= 0x20) continue;
        try b.append(s[start..i]);
        if (esc) |e| {
            try b.append(e);
        } else {
            var hb: [6]u8 = undefined;
            _ = std.fmt.bufPrint(&hb, "\\u{x:0>4}", .{c}) catch unreachable; // 6 bytes fit "\u00XX".
            try b.append(&hb);
        }
        start = i + 1;
    }
    try b.append(s[start..]);
    try b.byte('"');
}

// ---- decode -------------------------------------------------------------

pub const DecodeError = Err || error{Syntax};

const DFrame = struct { v: Value, key: Value = value.undef };

/// Parse `src` into a region value. A syntax error throws a SyntaxError
/// inside the VM when `throw_on_error` is set, else returns error.Syntax.
pub fn decode(vm: *Vm, src: []const u8) DecodeError!Value {
    @setRuntimeSafety(false);
    var keys: KeyCache = undefined;
    @memset(&keys.vals, value.undef);
    // Safe builds fill `undefined` memory with 0xAA; for this stack (kilobytes,
    // on every call) the fill cost more than the work. The callee keeps safety.
    var stack: [ops.max_depth]DFrame = undefined;
    return decodeWith(vm, src, &stack, &keys);
}

/// Object keys repeat, in arrays of objects most of all: one string per
/// distinct key (in a small direct-mapped cache), not one per occurrence.
/// Equal keys are then the same value, which `objFindValue` compares first.
const KeyCache = struct { vals: [64]Value };

fn decodeWith(vm: *Vm, src: []const u8, stack: *[ops.max_depth]DFrame, keys: *KeyCache) DecodeError!Value {
    var p: Parser = .{ .s = src, .keys = keys };
    var sp: usize = 0;
    var result: Value = value.undef;
    while (true) {
        p.ws();
        // Inside an object, read the key first.
        if (sp > 0 and value.kindOf(stack[sp - 1].v) == .object) {
            const top = &stack[sp - 1];
            if (p.peek() == '}') {
                p.i += 1;
                const done = top.v;
                sp -= 1;
                if (try finishValue(vm, &p, stack[0..], &sp, done, &result)) return result;
                continue;
            }
            if (p.peek() != '"') return error.Syntax;
            top.key = try p.key(vm);
            p.ws();
            if (p.peek() != ':') return error.Syntax;
            p.i += 1;
            p.ws();
        } else if (sp > 0 and p.peek() == ']') {
            p.i += 1;
            const done = stack[sp - 1].v;
            sp -= 1;
            if (try finishValue(vm, &p, stack[0..], &sp, done, &result)) return result;
            continue;
        }
        const c = p.peek();
        var v: Value = undefined;
        switch (c) {
            '{', '[' => {
                p.i += 1;
                if (sp == ops.max_depth) return vm.limit(.depth);
                const container = if (c == '{') try vm.r.newObject(4) else try vm.r.newArray(4);
                stack[sp] = .{ .v = container };
                sp += 1;
                continue;
            },
            '"' => v = try p.string(vm),
            't' => v = try p.lit("true", value.true_),
            'f' => v = try p.lit("false", value.false_),
            'n' => v = try p.lit("null", value.null_),
            else => v = value.num(try p.number()),
        }
        if (try finishValue(vm, &p, stack[0..], &sp, v, &result)) return result;
    }
}

/// Attach a finished value to its parent and consume a following comma.
/// Returns true when the top-level value is complete.
fn finishValue(vm: *Vm, p: *Parser, stack: []DFrame, sp: *usize, v: Value, result: *Value) DecodeError!bool {
    if (sp.* == 0) {
        p.ws();
        if (p.i != p.s.len) return error.Syntax;
        result.* = v;
        return true;
    }
    const top = &stack[sp.* - 1];
    if (value.kindOf(top.v) == .array) {
        try vm.r.arrPush(value.payload(top.v), v);
    } else {
        try vm.objSet(value.payload(top.v), top.key, v);
        top.key = value.undef;
    }
    p.ws();
    if (p.peek() == ',') {
        p.i += 1;
        p.ws();
        const close: u8 = if (value.kindOf(top.v) == .array) ']' else '}';
        if (p.peek() == close) return error.Syntax;
    } else if (p.peek() != ']' and p.peek() != '}') {
        return error.Syntax;
    }
    return false;
}

const Parser = struct {
    s: []const u8,
    i: usize = 0,
    keys: ?*KeyCache = null,

    /// An object key: plain ASCII keys come from the key cache.
    fn key(p: *Parser, vm: *Vm) DecodeError!Value {
        const cache = p.keys orelse return p.string(vm);
        const start = p.i + 1;
        var j = start;
        while (j < p.s.len) : (j += 1) {
            const c = p.s[j];
            if (c == '"') break;
            if (c == '\\' or c < 0x20 or c >= 0x80) return p.string(vm);
        }
        if (j >= p.s.len) return error.Syntax;
        const bytes = p.s[start..j];
        const slot = std.hash.Wyhash.hash(0, bytes) & (cache.vals.len - 1);
        const hit = cache.vals[slot];
        if (hit != value.undef and std.mem.eql(u8, vm.str(hit), bytes)) {
            p.i = j + 1;
            return hit;
        }
        const v = try vm.r.newStringUnits(bytes, @intCast(bytes.len));
        cache.vals[slot] = v;
        p.i = j + 1;
        return v;
    }

    fn peek(p: *const Parser) u8 {
        return if (p.i < p.s.len) p.s[p.i] else 0;
    }

    fn ws(p: *Parser) void {
        while (p.i < p.s.len) : (p.i += 1) {
            const c = p.s[p.i];
            if (c != ' ' and c != '\t' and c != '\n' and c != '\r') break;
        }
    }

    fn lit(p: *Parser, word: []const u8, v: Value) DecodeError!Value {
        if (!std.mem.startsWith(u8, p.s[p.i..], word)) return error.Syntax;
        p.i += word.len;
        return v;
    }

    fn number(p: *Parser) DecodeError!f64 {
        const start = p.i;
        if (p.peek() == '-') p.i += 1;
        if (p.peek() == '0') {
            p.i += 1;
        } else {
            if (!(p.peek() >= '1' and p.peek() <= '9')) return error.Syntax;
            while (p.peek() >= '0' and p.peek() <= '9') p.i += 1;
        }
        if (p.peek() == '.') {
            p.i += 1;
            if (!(p.peek() >= '0' and p.peek() <= '9')) return error.Syntax;
            while (p.peek() >= '0' and p.peek() <= '9') p.i += 1;
        }
        if (p.peek() == 'e' or p.peek() == 'E') {
            p.i += 1;
            if (p.peek() == '+' or p.peek() == '-') p.i += 1;
            if (!(p.peek() >= '0' and p.peek() <= '9')) return error.Syntax;
            while (p.peek() >= '0' and p.peek() <= '9') p.i += 1;
        }
        return std.fmt.parseFloat(f64, p.s[start..p.i]) catch error.Syntax;
    }

    fn string(p: *Parser, vm: *Vm) DecodeError!Value {
        std.debug.assert(p.peek() == '"');
        p.i += 1;
        const start = p.i;
        // Fast path: no escapes and valid UTF-8, copy the bytes once. Plain
        // ASCII goes 16 bytes at a time.
        while (p.i + 16 <= p.s.len and ascii16(p.s[p.i..][0..16].*)) p.i += 16;
        var ascii = true;
        while (p.i < p.s.len and p.s[p.i] != '"' and p.s[p.i] != '\\') {
            const c = p.s[p.i];
            if (c < 0x20) return error.Syntax;
            if (c < 0x80) {
                p.i += 1;
                continue;
            }
            ascii = false;
            const n = utf8Valid(p.s[p.i..]);
            if (n == 0) break;
            p.i += n;
        }
        if (p.i >= p.s.len) return error.Syntax;
        if (p.s[p.i] == '"') {
            p.i += 1;
            const bytes = p.s[start .. p.i - 1];
            // ASCII: as many UTF-16 units as bytes, no second pass.
            return if (ascii) vm.r.newStringUnits(bytes, @intCast(bytes.len)) else vm.newStr(bytes);
        }
        const t = vm.scratch.begin();
        defer t.end();
        var b = vm.scratch.builder();
        try b.append(p.s[start..p.i]);
        while (true) {
            if (p.i >= p.s.len) return error.Syntax;
            const c = p.s[p.i];
            p.i += 1;
            if (c == '"') break;
            if (c < 0x20) return error.Syntax;
            if (c >= 0x80) {
                // Text that is not UTF-8 becomes U+FFFD, one for each bad
                // byte, as Node.js decodes it. Strings stay valid UTF-8
                // (lone surrogates come only from \u escapes).
                const n = utf8Valid(p.s[p.i - 1 ..]);
                if (n == 0) {
                    try b.append("\u{FFFD}");
                } else {
                    try b.append(p.s[p.i - 1 ..][0..n]);
                    p.i += n - 1;
                }
                continue;
            }
            if (c != '\\') {
                try b.byte(c);
                continue;
            }
            try p.escape(&b);
        }
        return vm.newStr(b.bytes());
    }

    fn escape(p: *Parser, b: *Builder) DecodeError!void {
        const e = p.peek();
        p.i += 1;
        const simple: ?u8 = switch (e) {
            '"' => '"',
            '\\' => '\\',
            '/' => '/',
            'b' => 0x08,
            'f' => 0x0C,
            'n' => '\n',
            'r' => '\r',
            't' => '\t',
            else => null,
        };
        if (simple) |ch| return b.byte(ch);
        if (e != 'u') return error.Syntax;
        var cp: u21 = try p.hex4();
        if (cp >= 0xD800 and cp < 0xDC00 and std.mem.startsWith(u8, p.s[p.i..], "\\u")) {
            p.i += 2;
            const lo = try p.hex4();
            if (lo >= 0xDC00 and lo < 0xE000) {
                cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
            } else {
                return error.Syntax;
            }
        }
        if (cp >= 0xD800 and cp < 0xE000) cp = 0xFFFD; // A lone surrogate has no UTF-8 form.
        var ub: [4]u8 = undefined;
        const n = std.unicode.utf8Encode(cp, &ub) catch return error.Syntax;
        try b.append(ub[0..n]);
    }

    fn hex4(p: *Parser) DecodeError!u21 {
        if (p.i + 4 > p.s.len) return error.Syntax;
        const v = std.fmt.parseInt(u16, p.s[p.i..][0..4], 16) catch return error.Syntax;
        p.i += 4;
        return v;
    }
};

/// The length of the valid UTF-8 sequence at the start of `s`, or 0.
/// Surrogate code points (ED A0..BF xx) are not valid.
fn utf8Valid(s: []const u8) usize {
    const n = std.unicode.utf8ByteSequenceLength(s[0]) catch return 0;
    if (n > s.len) return 0;
    _ = std.unicode.utf8Decode(s[0..n]) catch return 0;
    return n;
}
