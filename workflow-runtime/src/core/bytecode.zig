//! Bytecode module layout: the header, section table, instruction words,
//! opcodes, effect kinds, and the loaded `Module` view. Pure data and
//! accessors; verification and loading live in `module.zig`.
const std = @import("std");

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
pub const EffectKind = enum(u8) { node = 0, http = 1, code = 2, wait = 3, approval = 4, respond = 5, service = 6, sql = 7, smtp = 8, _ };

pub const effect_kind_names = [_][]const u8{ "node", "http", "code", "wait", "approval", "respond", "service", "sql", "smtp" };

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

pub const no_aot: u16 = 0xFFFF;

/// The code never reads `headers` of the step's HTTP results (the compiler
/// proves it): the core gives `{}` and does not decode them.
pub const step_flag_result_headers_unread: u8 = 1;
/// The code never reads `body` of the step's HTTP results (the compiler
/// proves it): the core does not decode the body, and the result value has
/// no `body` member.
pub const step_flag_result_body_unread: u8 = 2;

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
    /// The names of the credential flags that the code can read: the
    /// `credentialFlags` list of META as written, or empty when META has no
    /// such list or the list has another form (`cred_flags.validList`).
    flag_names: []const u8 = "",
    /// No two strings of the module have the same bytes, so two string
    /// constants are equal only when their indices are. False when the
    /// loader had no room for `keys`.
    strs_unique: bool = false,

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
