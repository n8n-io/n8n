//! Module loader and verifier. A module is checked once at load. After that
//! the interpreter trusts every operand, so it has no failure paths except
//! limits and workflow-level exceptions.
const std = @import("std");
const bytecode = @import("../mem/bytecode.zig");
const lib = @import("../stdlib/root.zig").lib;
const aot = @import("aot.zig");
const simd_json = @import("../runtime/root.zig").simd_json;
const cred_flags = @import("../text/root.zig").cred_flags;

pub const magic = bytecode.magic;
pub const format_version = bytecode.format_version;
pub const Header = bytecode.Header;
pub const SectionEntry = bytecode.SectionEntry;
pub const FuncEntry = bytecode.FuncEntry;
pub const TryEntry = bytecode.TryEntry;
pub const StepEntry = bytecode.StepEntry;
pub const Instr = bytecode.Instr;
pub const Op = bytecode.Op;
pub const EffectKind = bytecode.EffectKind;
pub const effect_kind_names = bytecode.effect_kind_names;
pub const Error = bytecode.Error;
pub const Module = bytecode.Module;

fn readAt(comptime T: type, bytes: []const u8, off: usize) Error!T {
    if (off + @sizeOf(T) > bytes.len) return error.Truncated;
    return std.mem.bytesToValue(T, bytes[off..][0..@sizeOf(T)]);
}

fn sliceAt(comptime T: type, bytes: []const u8, off: usize, n: usize) Error![]align(1) const T {
    if (off + n * @sizeOf(T) > bytes.len) return error.Truncated;
    const p: [*]align(1) const T = @ptrCast(bytes.ptr + off);
    return p[0..n];
}

pub const no_aot = bytecode.no_aot;
pub const step_flag_result_headers_unread = bytecode.step_flag_result_headers_unread;
pub const step_flag_result_body_unread = bytecode.step_flag_result_body_unread;

/// Parse and verify. `natives_buf` must hold at least one u16 per string.
/// With one more u16 per function, the module also gets its compiled
/// functions (`aot.zig`).
pub fn load(bytes: []const u8, natives_buf: []u16) Error!Module {
    const h = try readAt(Header, bytes, 0);
    if (h.magic != magic) return error.BadMagic;
    if (h.version != format_version) return error.BadVersion;
    var digest: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(bytes[@sizeOf(Header)..], &digest, .{});
    if (!std.mem.eql(u8, &digest, &h.hash)) return error.BadHash;
    if (h.section_count > 64) return error.BadSection;

    var m: Module = .{
        .bytes = bytes,
        .hash = h.hash,
        .flags = h.flags,
        .str_offsets = &.{},
        .str_bytes = &.{},
        .numbers = &.{},
        .funcs = &.{},
        .code = &.{},
        .tries = &.{},
        .steps = &.{},
        .suspends = &.{},
        .paths = &.{},
        .meta = 0xFFFF_FFFF,
        .natives = &.{},
    };
    var seen: u32 = 0;
    var i: u32 = 0;
    while (i < h.section_count) : (i += 1) {
        const se = try readAt(SectionEntry, bytes, @sizeOf(Header) + i * @sizeOf(SectionEntry));
        if (@as(u64, se.offset) + se.length > bytes.len) return error.Truncated;
        const sec = bytes[se.offset..][0..se.length];
        try loadSection(&m, se.id, sec);
        if (se.id < 32) seen |= @as(u32, 1) << @intCast(se.id);
    }
    const required: u32 = (1 << 1) | (1 << 3) | (1 << 4);
    if (seen & required != required) return error.MissingSection;
    if (natives_buf.len < m.strCount()) return error.TooLarge;
    m.natives = natives_buf[0..m.strCount()];
    try verify(&m);
    if (jsonGet(m.metaJson(), "credentialFlags")) |list| {
        if (cred_flags.validList(list)) m.flag_names = list;
    }
    if (natives_buf.len >= m.strCount() + m.funcs.len) {
        const ids = natives_buf[m.strCount()..][0..m.funcs.len];
        for (ids, 0..) |*id, fi| id.* = aot.find(&m, @intCast(fi));
        m.aot = ids;
        const used = m.strCount() + m.funcs.len;
        // Keys: at most half full. The u16 entries name strings below 0xFFFF.
        const size = std.math.ceilPowerOfTwo(usize, @max(8, m.strCount() * 2)) catch 0;
        if (size > 0 and m.strCount() < 0xFFFF and natives_buf.len >= used + size) {
            m.keys = buildKeys(&m, natives_buf[used..][0..size], &m.strs_unique);
        }
    }
    return m;
}

fn loadSection(m: *Module, id: u32, sec: []const u8) Error!void {
    switch (id) {
        1 => {
            const n = try readAt(u32, sec, 0);
            m.str_offsets = try sliceAt(u32, sec, 4, n + 1);
            const area = 4 + (n + 1) * 4;
            if (area > sec.len) return error.Truncated;
            m.str_bytes = sec[area..];
            var j: u32 = 0;
            while (j < n) : (j += 1) {
                if (m.str_offsets[j] > m.str_offsets[j + 1]) return error.BadSection;
            }
            if (m.str_offsets[n] > m.str_bytes.len) return error.Truncated;
        },
        2 => m.numbers = try sliceAt(f64, sec, 8, try readAt(u32, sec, 0)),
        3 => m.funcs = try sliceAt(FuncEntry, sec, 8, try readAt(u32, sec, 0)),
        4 => m.code = try sliceAt(Instr, sec, 8, try readAt(u32, sec, 0)),
        5 => m.tries = try sliceAt(TryEntry, sec, 8, try readAt(u32, sec, 0)),
        6 => m.steps = try sliceAt(StepEntry, sec, 8, try readAt(u32, sec, 0)),
        7 => m.suspends = sec,
        8 => m.paths = try sliceAt(u32, sec, 4, try readAt(u32, sec, 0)),
        9 => m.meta = try readAt(u32, sec, 0),
        else => {},
    }
}

fn verify(m: *Module) Error!void {
    @memset(m.natives, 0xFFFF);
    if (m.funcs.len == 0) return error.MissingSection;
    if (m.meta != 0xFFFF_FFFF and m.meta >= m.strCount()) return error.BadOperand;
    for (m.steps) |s| {
        if (s.id >= m.strCount() or s.name >= m.strCount()) return error.BadOperand;
        if (s.node_type != 0xFFFF_FFFF and s.node_type >= m.strCount()) return error.BadOperand;
    }
    for (m.paths) |p| if (p >= m.strCount()) return error.BadOperand;
    for (m.funcs, 0..) |f, fi| {
        if (f.name >= m.strCount()) return error.BadOperand;
        if (@as(u64, f.code_start) + f.code_len > m.code.len) return error.BadOperand;
        if (@as(u64, f.try_start) + f.try_count > m.tries.len) return error.BadOperand;
        if (f.nparams > f.nregs or f.code_len == 0) return error.BadOperand;
        // `run` starts with no closure, so it cannot have captures (found by
        // fuzzing: GETCAP then read the execution root as a closure).
        if (fi == 0 and f.ncaps != 0) return error.BadOperand;
        for (m.funcTries(@intCast(fi))) |t| {
            if (t.start > t.end or t.end > f.code_len or t.handler >= f.code_len) return error.BadJump;
            if (t.catch_reg >= f.nregs) return error.BadOperand;
        }
        for (m.funcCode(@intCast(fi))) |ins| try verifyInstr(m, f, ins);
    }
}

fn reg(f: FuncEntry, r: u16) Error!void {
    if (r >= f.nregs) return error.BadOperand;
}

fn strIdx(m: *const Module, s: u32) Error!void {
    if (s >= m.strCount()) return error.BadOperand;
}

fn verifyInstr(m: *Module, f: FuncEntry, ins: Instr) Error!void {
    const op: Op = @fromBackingInt(@intCast(ins.op));
    switch (op) {
        .nop => {},
        .loadk => {
            try reg(f, ins.a);
            if (ins.bc() >= m.numbers.len) return error.BadOperand;
        },
        .loads => {
            try reg(f, ins.a);
            try strIdx(m, ins.bc());
        },
        .loadi, .loadundef, .loadnull, .loadbool, .newobj, .newarr, .now, .random, .ret, .throw, .exec_info, .vars => try reg(f, ins.a),
        .mov, .neg, .tonum, .bnot, .not, .typeof, .tostr, .isnullish, .newcell, .getcell, .setcell, .push, .spreadarr, .spreadobj, .newerr, .trace => {
            try reg(f, ins.a);
            try reg(f, ins.b);
        },
        .add, .sub, .mul, .div, .mod, .pow, .band, .bor, .bxor, .shl, .shr, .ushr, .seq, .sne, .lt, .le, .gt, .ge, .getelem, .setelem, .hasprop, .fork, .join => {
            try reg(f, ins.a);
            try reg(f, ins.b);
            if (op != .join) try reg(f, ins.c);
        },
        .delprop => {
            try reg(f, ins.a);
            try reg(f, ins.b);
        },
        .jmp, .jt, .jf, .jnullish => {
            if (op != .jmp) try reg(f, ins.a);
            if (ins.bc() >= f.code_len) return error.BadJump;
        },
        .getprop => {
            try reg(f, ins.a);
            try reg(f, ins.b);
            try strIdx(m, ins.c);
        },
        .setprop => {
            try reg(f, ins.a);
            try strIdx(m, ins.b);
            try reg(f, ins.c);
        },
        .closure => {
            try reg(f, ins.a);
            if (ins.b >= m.funcs.len) return error.BadOperand;
            const ncaps = m.funcs[ins.b].ncaps;
            if (ncaps > 0 and @as(u32, ins.c) + ncaps > f.nregs) return error.BadOperand;
        },
        .getcap => {
            try reg(f, ins.a);
            if (ins.b >= f.ncaps) return error.BadOperand;
        },
        .call => {
            try reg(f, ins.a);
            try reg(f, ins.b);
            if (ins.x > 0 and @as(u32, ins.c) + ins.x > f.nregs) return error.BadOperand;
        },
        .callm => {
            try reg(f, ins.a);
            try strIdx(m, ins.b);
            if (@as(u32, ins.c) + ins.x + 1 > f.nregs) return error.BadOperand;
            const id = lib.methodId(m.str(ins.b)) orelse return error.UnknownMethod;
            m.natives[ins.b] = id;
        },
        .calln => {
            try reg(f, ins.a);
            try strIdx(m, ins.b);
            if (ins.x > 0 and @as(u32, ins.c) + ins.x > f.nregs) return error.BadOperand;
            const id = lib.nativeId(m.str(ins.b)) orelse return error.UnknownNative;
            m.natives[ins.b] = id;
        },
        .@"suspend" => {
            try reg(f, ins.a);
            try reg(f, ins.b);
            try reg(f, ins.c);
            if (ins.x > @backingInt(EffectKind.smtp)) return error.BadOperand;
        },
        _ => return error.UnknownOpcode,
    }
}

// ---- META triggers ----------------------------------------------------------------
//
// META is one JSON document (spec 3.2). The core reads only its `triggers`
// array, with a small scanner that does not allocate.

fn skipWs(s: []const u8, start_i: usize) usize {
    var i = start_i;
    while (i < s.len and (s[i] == ' ' or s[i] == '\n' or s[i] == '\r' or s[i] == '\t')) i += 1;
    return i;
}

/// The index after the JSON value that starts at `start_i`, or null when the
/// text is not valid. Nesting uses a counter, not recursion.
pub fn jsonSkipValue(s: []const u8, start_i: usize) ?usize {
    var i = skipWs(s, start_i);
    if (i >= s.len) return null;
    var depth: u32 = 0;
    while (i < s.len) {
        const c = s[i];
        if (c == '"') {
            i += 1;
            while (i < s.len and s[i] != '"') : (i += 1) {
                if (s[i] == '\\') i += 1;
            }
            if (i >= s.len) return null;
            i += 1;
        } else if (c == '{' or c == '[') {
            depth += 1;
            i += 1;
        } else if (c == '}' or c == ']') {
            if (depth == 0) return null;
            depth -= 1;
            i += 1;
        } else if (depth > 0) {
            i += 1;
        } else {
            // A scalar at the top level ends at a delimiter.
            while (i < s.len and s[i] != ',' and s[i] != '}' and s[i] != ']' and s[i] != ' ' and s[i] != '\n') i += 1;
            return i;
        }
        if (depth == 0) return i;
    }
    return null;
}

/// The raw text of member `key` of the JSON object `obj`, or null.
pub fn jsonGet(obj: []const u8, key: []const u8) ?[]const u8 {
    var i = skipWs(obj, 0);
    if (i >= obj.len or obj[i] != '{') return null;
    i += 1;
    var guard: usize = 0;
    while (guard < obj.len) : (guard += 1) {
        i = skipWs(obj, i);
        if (i >= obj.len or obj[i] == '}') return null;
        if (obj[i] == ',') {
            i += 1;
            continue;
        }
        const kend = jsonSkipValue(obj, i) orelse return null;
        const k = obj[i..kend];
        i = skipWs(obj, kend);
        if (i >= obj.len or obj[i] != ':') return null;
        const vstart = skipWs(obj, i + 1);
        const vend = jsonSkipValue(obj, vstart) orelse return null;
        if (k.len >= 2 and std.mem.eql(u8, k[1 .. k.len - 1], key)) return obj[vstart..vend];
        i = vend;
    }
    return null;
}

/// Fill `table` (`Module.keys`). `unique` is true when no string repeats.
fn buildKeys(m: *const Module, table: []u16, unique: *bool) []const u16 {
    @memset(table, 0);
    unique.* = true;
    const mask = table.len - 1;
    var i: u32 = 0;
    while (i < m.strCount()) : (i += 1) {
        const s = m.str(i);
        var slot = simd_json.hashKey(s) & mask;
        var probes: usize = 0;
        while (probes < table.len) : (probes += 1) {
            const e = table[slot];
            if (e == 0) {
                table[slot] = @intCast(i + 1);
                break;
            }
            // A repeated string keeps its first index.
            if (std.mem.eql(u8, m.str(e - 1), s)) {
                unique.* = false;
                break;
            }
            slot = (slot + 1) & @as(u32, @intCast(mask));
        }
    }
    return table;
}

/// The raw values of two members of a JSON object, in one pass: the first
/// member with each key, as `jsonGet` finds it.
pub fn jsonGet2(obj: []const u8, key_a: []const u8, key_b: []const u8) [2]?[]const u8 {
    var out: [2]?[]const u8 = .{ null, null };
    var i = skipWs(obj, 0);
    if (i >= obj.len or obj[i] != '{') return out;
    i += 1;
    var guard: usize = 0;
    while (guard < obj.len) : (guard += 1) {
        i = skipWs(obj, i);
        if (i >= obj.len or obj[i] == '}') return out;
        if (obj[i] == ',') {
            i += 1;
            continue;
        }
        const kend = jsonSkipValue(obj, i) orelse return out;
        const k = obj[i..kend];
        i = skipWs(obj, kend);
        if (i >= obj.len or obj[i] != ':') return out;
        const vstart = skipWs(obj, i + 1);
        const vend = jsonSkipValue(obj, vstart) orelse return out;
        if (k.len >= 2) {
            const name = k[1 .. k.len - 1];
            if (out[0] == null and std.mem.eql(u8, name, key_a)) out[0] = obj[vstart..vend];
            if (out[1] == null and std.mem.eql(u8, name, key_b)) out[1] = obj[vstart..vend];
            if (out[0] != null and out[1] != null) return out;
        }
        i = vend;
    }
    return out;
}

/// A JSON string without escapes, without its quotes. Null otherwise.
pub fn jsonStr(raw: ?[]const u8) ?[]const u8 {
    const r = raw orelse return null;
    if (r.len < 2 or r[0] != '"' or r[r.len - 1] != '"') return null;
    const inner = r[1 .. r.len - 1];
    if (std.mem.indexOfScalar(u8, inner, '\\') != null) return null;
    return inner;
}

pub fn jsonInt(raw: ?[]const u8) ?i64 {
    return std.fmt.parseInt(i64, raw orelse return null, 10) catch null;
}

/// Iterates the elements of a JSON array.
pub const ArrayIter = struct {
    s: []const u8,
    i: usize,

    pub fn init(arr: ?[]const u8) ArrayIter {
        const s = arr orelse return .{ .s = "", .i = 0 };
        const i = skipWs(s, 0);
        if (i >= s.len or s[i] != '[') return .{ .s = "", .i = 0 };
        return .{ .s = s, .i = i + 1 };
    }

    pub fn next(it: *ArrayIter) ?[]const u8 {
        it.i = skipWs(it.s, it.i);
        if (it.i < it.s.len and it.s[it.i] == ',') it.i = skipWs(it.s, it.i + 1);
        if (it.i >= it.s.len or it.s[it.i] == ']') return null;
        const start = it.i;
        const end = jsonSkipValue(it.s, start) orelse return null;
        it.i = end;
        return it.s[start..end];
    }
};

/// The triggers of a module's META, one JSON object each.
pub fn triggers(meta_json: []const u8) ArrayIter {
    return ArrayIter.init(jsonGet(meta_json, "triggers"));
}

/// META of unverified module bytes, for the shell before it loads the
/// module. Every read is bounds-checked.
pub fn metaOf(bytes: []const u8) ?[]const u8 {
    const h = readAt(Header, bytes, 0) catch return null;
    if (h.magic != magic or h.section_count > 64) return null;
    var strings: ?[]const u8 = null;
    var meta: ?u32 = null;
    var i: u32 = 0;
    while (i < h.section_count) : (i += 1) {
        const se = readAt(SectionEntry, bytes, @sizeOf(Header) + i * @sizeOf(SectionEntry)) catch return null;
        if (@as(u64, se.offset) + se.length > bytes.len) return null;
        const sec = bytes[se.offset..][0..se.length];
        if (se.id == 1) strings = sec;
        if (se.id == 9) meta = readAt(u32, sec, 0) catch return null;
    }
    const sec = strings orelse return null;
    const idx = meta orelse return null;
    const n = readAt(u32, sec, 0) catch return null;
    if (idx >= n) return null;
    const offs = sliceAt(u32, sec, 4, n + 1) catch return null;
    const area = 4 + (@as(usize, n) + 1) * 4;
    if (area > sec.len) return null;
    const str_bytes = sec[area..];
    if (offs[idx] > offs[idx + 1] or offs[idx + 1] > str_bytes.len) return null;
    return str_bytes[offs[idx]..offs[idx + 1]];
}

test "meta triggers scanner" {
    const meta = "{\"compilerVersion\":\"0.1.0\",\"triggers\":[{\"kind\":\"webhook\",\"path\":\"orders\"},{\"kind\":\"schedule\",\"every\":{\"unit\":\"hours\",\"value\":2,\"onWeekdays\":[1,2]},\"timezone\":\"Europe/Berlin\"}],\"durability\":\"full\"}";
    var it = triggers(meta);
    const a = it.next().?;
    try std.testing.expectEqualStrings("webhook", jsonStr(jsonGet(a, "kind")).?);
    try std.testing.expectEqualStrings("orders", jsonStr(jsonGet(a, "path")).?);
    const b = it.next().?;
    const every = jsonGet(b, "every").?;
    try std.testing.expectEqual(@as(i64, 2), jsonInt(jsonGet(every, "value")).?);
    var days = ArrayIter.init(jsonGet(every, "onWeekdays"));
    try std.testing.expectEqual(@as(i64, 1), jsonInt(days.next()).?);
    try std.testing.expectEqual(@as(i64, 2), jsonInt(days.next()).?);
    try std.testing.expect(days.next() == null);
    try std.testing.expectEqualStrings("Europe/Berlin", jsonStr(jsonGet(b, "timezone")).?);
    try std.testing.expect(it.next() == null);
    try std.testing.expect(jsonGet("{\"a\":\"x\\\"}\"}", "b") == null);
    var none = triggers("{}");
    try std.testing.expect(none.next() == null);
}

test "jsonGet2 finds two members in one pass, as jsonGet does" {
    const cases = [_][]const u8{
        "{\"host\":\"a\",\"content-type\":\"text/plain\",\"content-disposition\":\"inline\"}",
        "{\"content-disposition\":\"x\",\"content-type\":[1,{\"a\":2}]}",
        "{\"content-type\":\"a\",\"content-type\":\"b\"}",
        "{}",
        "not json",
        "{\"other\":{\"content-type\":\"nested\"}}",
    };
    for (cases) |c| {
        const got = jsonGet2(c, "content-type", "content-disposition");
        const want_a = jsonGet(c, "content-type");
        const want_b = jsonGet(c, "content-disposition");
        try std.testing.expectEqualDeep(want_a, got[0]);
        try std.testing.expectEqualDeep(want_b, got[1]);
    }
}
