//! Module loader and verifier. A module is checked once at load. After that
//! the interpreter trusts every operand, so it has no failure paths except
//! limits and workflow-level exceptions.
const std = @import("std");
const lib = @import("lib.zig");
const aot = @import("aot.zig");
const simd_json = @import("simd_json.zig");

pub const magic: u32 = 0x4D57384E;
pub const format_version: u16 = 1;

pub const Header = extern struct {
    magic: u32,
    version: u16,
    flags: u16,
    section_count: u32,
    reserved: u32,
    hash: [32]u8,
};

pub const SectionEntry = extern struct { id: u32, offset: u32, length: u32 };

pub const FuncEntry = extern struct {
    name: u32,
    nparams: u16,
    nregs: u16,
    ncaps: u16,
    flags: u16,
    code_start: u32,
    code_len: u32,
    try_start: u32,
    try_count: u32,
    _pad: u32,
};

pub const TryEntry = extern struct { start: u32, end: u32, handler: u32, catch_reg: u16, _pad: u16 };

pub const StepEntry = extern struct {
    id: u32,
    name: u32,
    node_type: u32,
    kind: u8,
    idempotent: u8,
    retry_max: u8,
    /// `step_flag_*` bits; 0 in modules from before they existed.
    flags: u8,
    retry_delay_ms: u32,
    src_start: u32,
    src_end: u32,
    _pad2: u32,
};

pub const Instr = extern struct {
    op: u8,
    x: u8,
    a: u16,
    b: u16,
    c: u16,

    pub inline fn bc(i: Instr) u32 {
        return @as(u32, i.b) | (@as(u32, i.c) << 16);
    }
};

comptime {
    std.debug.assert(@sizeOf(Header) == 48);
    std.debug.assert(@sizeOf(SectionEntry) == 12);
    std.debug.assert(@sizeOf(FuncEntry) == 32);
    std.debug.assert(@sizeOf(TryEntry) == 16);
    std.debug.assert(@sizeOf(StepEntry) == 32);
    std.debug.assert(@sizeOf(Instr) == 8);
}

pub const Op = enum(u8) {
    nop = 0,
    loadk = 1,
    loads = 2,
    loadi = 3,
    loadundef = 4,
    loadnull = 5,
    loadbool = 6,
    mov = 7,
    add = 8,
    sub = 9,
    mul = 10,
    div = 11,
    mod = 12,
    pow = 13,
    band = 14,
    bor = 15,
    bxor = 16,
    shl = 17,
    shr = 18,
    ushr = 19,
    neg = 20,
    tonum = 21,
    bnot = 22,
    not = 23,
    typeof = 24,
    tostr = 25,
    seq = 26,
    sne = 27,
    lt = 28,
    le = 29,
    gt = 30,
    ge = 31,
    isnullish = 32,
    jmp = 33,
    jt = 34,
    jf = 35,
    jnullish = 36,
    newobj = 40,
    newarr = 41,
    getprop = 42,
    setprop = 43,
    getelem = 44,
    setelem = 45,
    delprop = 46,
    hasprop = 47,
    push = 48,
    spreadarr = 49,
    spreadobj = 50,
    closure = 55,
    getcap = 56,
    newcell = 57,
    getcell = 58,
    setcell = 59,
    call = 60,
    callm = 61,
    calln = 62,
    ret = 63,
    throw = 64,
    newerr = 65,
    @"suspend" = 70,
    fork = 71,
    join = 72,
    now = 73,
    random = 74,
    /// ctx.trace(name R[a], items R[b]). Glue: no suspend, no log record.
    trace = 75,
    /// R[a] = ctx.execution(): { id, mode, resumeUrl, resumeFormUrl }.
    exec_info = 76,
    /// R[a] = ctx.vars(): the variables captured at start.
    vars = 77,
    _,
};

/// `service` (spec 9.9): a call of an n8n service that the admin client answers.
pub const EffectKind = enum(u8) { node = 0, http = 1, code = 2, wait = 3, approval = 4, respond = 5, service = 6, _ };

pub const effect_kind_names = [_][]const u8{ "node", "http", "code", "wait", "approval", "respond", "service" };

pub const Error = error{
    BadMagic,
    BadVersion,
    BadHash,
    Truncated,
    BadSection,
    MissingSection,
    BadOperand,
    BadJump,
    UnknownOpcode,
    UnknownNative,
    UnknownMethod,
    TooLarge,
};

/// A loaded module. All slices point into the module bytes, which the caller
/// keeps alive for the module's lifetime. `natives` maps a string index to a
/// library id and is the only memory the loader writes.
pub const Module = struct {
    bytes: []const u8,
    hash: [32]u8,
    flags: u16,
    str_offsets: []align(1) const u32,
    str_bytes: []const u8,
    numbers: []align(1) const f64,
    funcs: []align(1) const FuncEntry,
    code: []align(1) const Instr,
    tries: []align(1) const TryEntry,
    steps: []align(1) const StepEntry,
    suspends: []const u8,
    paths: []align(1) const u32,
    meta: u32,
    /// For each string index: the native function or method id, or 0xFFFF.
    natives: []u16,
    /// For each function: its index in the compiled table (`aot.zig`), or
    /// `no_aot`. Empty when the loader had no room for it.
    aot: []const u16 = &.{},
    /// An open-addressing table of the module's strings by
    /// `simd_json.hashKey`: string index plus one, or 0. Its length is a power
    /// of two. Empty when the loader had no room for it.
    keys: []const u16 = &.{},

    /// The index of the module string equal to `bytes`, whose hash is `h`.
    pub fn internKey(m: *const Module, bytes: []const u8, h: u32) ?u32 {
        if (m.keys.len == 0) return null;
        const mask = m.keys.len - 1;
        var slot = h & mask;
        var probes: usize = 0;
        while (probes < m.keys.len) : (probes += 1) {
            const e = m.keys[slot];
            if (e == 0) return null;
            const s = m.str(e - 1);
            if (s.len == bytes.len and std.mem.eql(u8, s, bytes)) return e - 1;
            slot = (slot + 1) & mask;
        }
        return null;
    }

    pub fn str(m: *const Module, i: u32) []const u8 {
        std.debug.assert(i + 1 < m.str_offsets.len);
        return m.str_bytes[m.str_offsets[i]..m.str_offsets[i + 1]];
    }

    pub fn strCount(m: *const Module) u32 {
        return @intCast(m.str_offsets.len - 1);
    }

    pub fn funcCode(m: *const Module, f: u32) []align(1) const Instr {
        const fe = m.funcs[f];
        return m.code[fe.code_start..][0..fe.code_len];
    }

    pub fn funcTries(m: *const Module, f: u32) []align(1) const TryEntry {
        const fe = m.funcs[f];
        return m.tries[fe.try_start..][0..fe.try_count];
    }

    pub fn native(m: *const Module) bool {
        return m.flags & 1 != 0;
    }

    pub fn metaJson(m: *const Module) []const u8 {
        if (m.meta == 0xFFFF_FFFF) return "{}";
        return m.str(m.meta);
    }
};

fn readAt(comptime T: type, bytes: []const u8, off: usize) Error!T {
    if (off + @sizeOf(T) > bytes.len) return error.Truncated;
    return std.mem.bytesToValue(T, bytes[off..][0..@sizeOf(T)]);
}

fn sliceAt(comptime T: type, bytes: []const u8, off: usize, n: usize) Error![]align(1) const T {
    if (off + n * @sizeOf(T) > bytes.len) return error.Truncated;
    const p: [*]align(1) const T = @ptrCast(bytes.ptr + off);
    return p[0..n];
}

pub const no_aot: u16 = 0xFFFF;

/// The code never reads `headers` of the step's HTTP results (the compiler
/// proves it): the core gives `{}` and does not decode them.
pub const step_flag_result_headers_unread: u8 = 1;
/// The code never reads `body` of the step's HTTP results (the compiler
/// proves it): the core does not decode the body, and the result value has
/// no `body` member.
pub const step_flag_result_body_unread: u8 = 2;

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
    if (natives_buf.len >= m.strCount() + m.funcs.len) {
        const ids = natives_buf[m.strCount()..][0..m.funcs.len];
        for (ids, 0..) |*id, fi| id.* = aot.find(&m, @intCast(fi));
        m.aot = ids;
        const used = m.strCount() + m.funcs.len;
        // Keys: at most half full. The u16 entries name strings below 0xFFFF.
        const size = std.math.ceilPowerOfTwo(usize, @max(8, m.strCount() * 2)) catch 0;
        if (size > 0 and m.strCount() < 0xFFFF and natives_buf.len >= used + size) {
            m.keys = buildKeys(&m, natives_buf[used..][0..size]);
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
            if (ins.x > @backingInt(EffectKind.service)) return error.BadOperand;
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

fn buildKeys(m: *const Module, table: []u16) []const u16 {
    @memset(table, 0);
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
            if (std.mem.eql(u8, m.str(e - 1), s)) break;
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
