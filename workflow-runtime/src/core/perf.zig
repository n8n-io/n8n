//! The performance model (docs/perf-model.md): a recorder for the accesses
//! that the core states through `mem.zig`, a model of the data caches, and
//! a table of costs. It is pure: the shell gives it its memory and prints
//! its counters (`wfrt perf-model`). Cycles are in hundredths.
const std = @import("std");
const module = @import("bytecode.zig");
const Op = module.Op;

/// The data structure that an access belongs to.
pub const Structure = enum(u8) {
    exec_root,
    fibre_table,
    frames,
    registers,
    obj_header,
    obj_entries,
    arr_header,
    arr_items,
    str_header,
    str_bytes,
    closure_cell,
    bytes_block,
    module_code,
    const_numbers,
    const_strings,
    json_in,
    json_out,
    /// The step-lived arena of a batch.
    scratch,
    /// The columns of the execution slots, the free list and the ready list.
    slot_table,
    /// The maps from an execution id to its slot and to its pending effects.
    exec_index,
    module_table,
    /// The free lists of the region pools, and the bytes of a released region.
    region_pool,
    /// The input events of a batch.
    event_buf,
    action_buf,
    /// The log record of a batch in the shell.
    log_buf,
    snapshot,
};

/// The place in the core that makes an access.
pub const Site = enum(u8) {
    interp_fetch,
    interp_reg,
    interp_const,
    interp_frame,
    region_alloc,
    region_at,
    /// The bytes of a header after its first word: no cost of their own.
    region_span,
    /// The root of an execution, at the start of its region.
    exec_at,
    vals_at,
    /// A pass over the items of an array or the entries of an object.
    vals_walk,
    vals_fill,
    str_bytes,
    str_new,
    str_append,
    obj_find,
    /// An entry of an object with its entries beside it, at a known index:
    /// the address comes from the object value, not from a load.
    obj_slot,
    obj_set,
    obj_grow,
    arr_push,
    arr_grow,
    const_str,
    json_decode,
    /// The decoder copies the items of an array or an object into the region.
    json_build,
    json_encode,
    /// One element of a table of the core, by its index.
    core_row,
    /// A lookup in a hash map of the core.
    core_map,
    core_emit,
    /// A copy or a fill in the core: scratch copies, snapshots, released regions.
    core_copy,
    /// A buffer of the shell: batch events, the log record, the scratch reset.
    shell_buf,
};

/// A loop over bytes or values.
pub const Loop = enum(u8) { utf16_len, key_probe, key_bytes, str_eql, json_scan, json_emit, value_fill, value_copy, byte_copy, byte_fill };

/// What the core does outside the interpreter. Accesses and cycles outside
/// an instruction belong to the phase.
pub const Phase = enum(u8) { interp, batch, start, run, effect_out, effect_result, finish, snapshot, other_event, shell_batch };

/// The system calls that the shell makes for a batch.
pub const Syscall = enum(u8) { log_write, log_sync, reply_send, effect_send, effect_recv };

pub const Cause = enum(u8) { compute, load_l1, load_l1_dep, load_l2, load_l3, load_mem, store, store_miss, tlb, mispredict, loops, syscall };

pub const Misc = enum(u8) {
    dispatch_miss,
    branch,
    branch_miss,
    ws_lines,
    ws_pages,
    ws_overflow,
    prefetches,
    dep_loads,
    /// Page uses that miss the first TLB, and those that also miss the second
    /// (a page walk), with small pages and with huge pages.
    tlb_l1_miss,
    tlb_walk,
    huge_l1_miss,
    huge_walk,
};

const n_structures = std.enums.values(Structure).len;
const n_sites = std.enums.values(Site).len;
const n_loops = std.enums.values(Loop).len;
pub const n_causes = std.enums.values(Cause).len;
const n_phases = std.enums.values(Phase).len;
const n_ops = 256;
/// Accesses before the first instruction of an execution have this opcode.
pub const op_start: u8 = 255;
/// Native calls by the index of their name in the module; the last entry
/// takes the names past it.
pub const n_natives = 512;
pub const levels = 4;

/// One group of counters. Each group is a range of `Counts.v`.
pub const Field = enum(u8) {
    instr,
    bails,
    op_cycles,
    native_calls,
    native_cycles,
    reads,
    writes,
    read_bytes,
    write_bytes,
    lines,
    st_cycles,
    ws_st,
    site_lines,
    site_cycles,
    allocs,
    alloc_bytes,
    loop_calls,
    loop_elems,
    cause,
    phase_count,
    phase_cycles,
    syscalls,
    misc,
};

const field_len = [_]u32{
    n_ops,                 n_ops,      n_ops,        n_natives,           n_natives, n_structures, n_structures, n_structures,
    n_structures,          n_structures * levels, n_structures, n_structures, n_sites * levels, n_sites, n_structures, n_structures,
    n_loops,               n_loops,    n_causes,     n_phases, n_phases, std.enums.values(Syscall).len,
    std.enums.values(Misc).len,
};

pub fn lenOf(comptime f: Field) u32 {
    return field_len[@backingInt(f)];
}

const field_base: [field_len.len]u32 = blk: {
    var out: [field_len.len]u32 = @splat(0);
    var sum: u32 = 0;
    for (field_len, 0..) |n, i| {
        out[i] = sum;
        sum += n;
    }
    break :blk out;
};

fn baseOf(comptime f: Field) u32 {
    return field_base[@backingInt(f)];
}

const n_counters = baseOf(.misc) + lenOf(.misc);

comptime {
    std.debug.assert(field_len.len == std.enums.values(Field).len);
}

/// The counts of one execution, or the sum of several.
pub const Counts = struct {
    v: [n_counters]u64 = @splat(0),

    inline fn bump(c: *Counts, comptime f: Field, i: usize, n: u64) void {
        std.debug.assert(i < lenOf(f));
        c.v[baseOf(f) + i] += n;
    }

    inline fn drop(c: *Counts, comptime f: Field, i: usize, n: u64) void {
        std.debug.assert(i < lenOf(f));
        c.v[baseOf(f) + i] -= n;
    }

    inline fn set(c: *Counts, comptime f: Field, i: usize, n: u64) void {
        std.debug.assert(i < lenOf(f));
        c.v[baseOf(f) + i] = n;
    }

    pub inline fn get(c: *const Counts, comptime f: Field, i: usize) u64 {
        std.debug.assert(i < lenOf(f));
        return c.v[baseOf(f) + i];
    }

    pub fn total(c: *const Counts, comptime f: Field) u64 {
        var sum: u64 = 0;
        for (c.v[baseOf(f)..][0..lenOf(f)]) |x| sum += x;
        return sum;
    }

    pub fn add(c: *Counts, other: *const Counts) void {
        for (&c.v, other.v) |*x, y| x.* += y;
    }

    /// `c - other`, for the executions after the first.
    pub fn minus(c: *const Counts, other: *const Counts) Counts {
        var out: Counts = .{};
        for (&out.v, c.v, other.v) |*x, a, b| x.* = a - b;
        return out;
    }
};

// ---- the cost table -----------------------------------------------------------

/// Costs in hundredths of a cycle. docs/perf-model.md gives the source of
/// each number of a profile.
pub const Costs = struct {
    /// One native instruction of compute, with its loads in the first cache.
    instr: u32,
    /// A load whose address does not come from another load: it overlaps.
    load_l1: u32,
    /// A load whose address comes from a load: the latency is on the path.
    load_l1_dep: u32,
    load_l2: u32,
    load_l3: u32,
    load_mem: u32,
    store: u32,
    mispredict: u32,
    /// A page that is in the second TLB only, and a page walk.
    tlb_l1_miss: u32,
    tlb_walk: u32,
    /// One system call of the shell, without the work of the kernel.
    syscall: u32,
};

/// The data TLBs: a first level for all page sizes and a second level.
pub const TlbConfig = struct { l1_entries: u32, l2_entries: u32, l2_ways: u32, small_page: u32, huge_page: u32 };

pub const Features = struct { avx2: bool, avx512: bool, bmi2: bool, fast_pdep_pext: bool };

/// One CPU as data: the caches, the TLBs, the costs and the vector width.
/// The model never reads the CPU of the machine that it runs on.
pub const Profile = struct {
    name: []const u8,
    clock_mhz: u32,
    cache: CacheConfig,
    tlb: TlbConfig,
    costs: Costs,
    vector_bits: u32,
    features: Features,

    /// The cycles of 10 microseconds: 100,000 workflows each second on one core.
    pub fn budgetCycles(p: *const Profile) u64 {
        return @as(u64, p.clock_mhz) * 10;
    }

    /// The words that `Storage.tlb` needs.
    pub fn tlbWords(p: *const Profile) usize {
        return 4 * @as(usize, p.tlb.l1_entries + p.tlb.l2_entries);
    }
};

/// AMD EPYC 7B12 (family 17h model 31h, Zen 2), one thread of one core,
/// as the benchmark machine reports it.
pub const zen2_epyc_7b12: Profile = .{
    .name = "zen2-epyc-7b12",
    .clock_mhz = 2250,
    .cache = .{
        .line_bytes = 64,
        .l1 = .{ .bytes = 32 << 10, .ways = 8 },
        .l2 = .{ .bytes = 512 << 10, .ways = 8 },
        .l3 = .{ .bytes = 16 << 20, .ways = 16 },
        .next_line_prefetch = true,
    },
    .tlb = .{ .l1_entries = 64, .l2_entries = 2048, .l2_ways = 16, .small_page = 4096, .huge_page = 2 << 20 },
    .costs = .{
        .instr = 35,
        .load_l1 = 50,
        .load_l1_dep = 400,
        .load_l2 = 1200,
        .load_l3 = 3900,
        .load_mem = 18800,
        .store = 100,
        .mispredict = 1800,
        .tlb_l1_miss = 700,
        .tlb_walk = 5500,
        .syscall = 150000,
    },
    .vector_bits = 256,
    .features = .{ .avx2 = true, .avx512 = false, .bmi2 = true, .fast_pdep_pext = false },
};

const profiles = [_]Profile{zen2_epyc_7b12};

pub fn profileNamed(name: []const u8) ?Profile {
    for (profiles) |p| if (std.mem.eql(u8, p.name, name)) return p;
    return null;
}

/// True when the address of an access at `site` comes from a load.
pub fn dependent(site: Site) bool {
    return switch (site) {
        .interp_fetch, .interp_reg, .interp_const, .region_alloc, .exec_at, .vals_fill, .str_new, .str_append, .json_decode, .json_build, .json_encode, .core_row, .core_emit, .core_copy, .shell_buf, .obj_slot => false,
        .interp_frame, .region_at, .region_span, .vals_at, .vals_walk, .str_bytes, .obj_find, .obj_set, .obj_grow, .arr_push, .arr_grow, .const_str, .core_map => true,
    };
}

/// True when an access at `site` is a pass over a range. A loop cost covers
/// its bytes; the model then adds only the misses.
pub fn ranged(site: Site) bool {
    return switch (site) {
        .region_span, .vals_walk, .vals_fill, .str_bytes, .str_new, .str_append, .obj_grow, .arr_grow, .const_str, .json_decode, .json_build, .json_encode, .core_copy, .shell_buf => true,
        .interp_fetch, .interp_reg, .interp_const, .interp_frame, .region_alloc, .region_at, .exec_at, .vals_at, .obj_find, .obj_set, .arr_push, .core_row, .core_map, .core_emit, .obj_slot => false,
    };
}

pub const LoopCost = struct { scalar: u32, vector: u32, is_vector: bool };

/// Hundredths of a cycle for each element of a loop: as scalar code, as
/// vector code, and which of the two the core has now.
pub fn loopCost(loop: Loop) LoopCost {
    return switch (loop) {
        .utf16_len => .{ .scalar = 100, .vector = 6, .is_vector = false },
        .key_probe => .{ .scalar = 300, .vector = 40, .is_vector = false },
        .key_bytes => .{ .scalar = 50, .vector = 6, .is_vector = true },
        .str_eql => .{ .scalar = 50, .vector = 6, .is_vector = true },
        .json_scan => .{ .scalar = 300, .vector = 60, .is_vector = true },
        .json_emit => .{ .scalar = 150, .vector = 30, .is_vector = true },
        .value_fill => .{ .scalar = 50, .vector = 13, .is_vector = true },
        .value_copy => .{ .scalar = 100, .vector = 25, .is_vector = true },
        .byte_copy => .{ .scalar = 50, .vector = 4, .is_vector = true },
        .byte_fill => .{ .scalar = 50, .vector = 3, .is_vector = true },
    };
}

pub fn loopCycles(loop: Loop, elems: u64) u64 {
    const lc = loopCost(loop);
    return elems * if (lc.is_vector) lc.vector else lc.scalar;
}

/// An estimate of the native instructions of one phase of the core, without
/// its loops and without the interpreter. A placeholder: the validation
/// plan replaces it with the counts of cachegrind for each function.
fn phaseWork(phase: Phase) u32 {
    return switch (phase) {
        .interp => 0,
        .batch => 400,
        .start => 1500,
        .run => 300,
        .effect_out => 900,
        .effect_result => 1200,
        .finish => 1200,
        .snapshot => 800,
        .other_event => 500,
        .shell_batch => 600,
    };
}

/// The registers that an instruction reads and writes.
pub const Shape = struct { ra: bool = false, rb: bool = false, rc: bool = false, wa: bool = false, args: Args = .none, branch: bool = false };
pub const Args = enum(u8) { none, x, x_and_receiver };

fn shapeOf(op: Op) Shape {
    return switch (op) {
        .nop, .jmp => .{},
        .loadk, .loads, .loadi, .loadundef, .loadnull, .loadbool, .newobj, .newarr, .getcap, .now, .random, .exec_info, .vars => .{ .wa = true },
        .mov, .neg, .tonum, .bnot, .not, .typeof, .tostr, .isnullish, .getprop, .newcell, .getcell, .newerr, .join => .{ .rb = true, .wa = true },
        .add, .sub, .mul, .div, .mod, .pow, .band, .bor, .bxor, .shl, .shr, .ushr, .seq, .sne, .lt, .le, .gt, .ge, .getelem, .hasprop, .fork => .{ .rb = true, .rc = true, .wa = true },
        .jt, .jf, .jnullish => .{ .ra = true, .branch = true },
        .ret, .throw => .{ .ra = true },
        .setprop => .{ .ra = true, .rc = true },
        .setelem => .{ .ra = true, .rb = true, .rc = true },
        .delprop, .push, .spreadarr, .spreadobj, .setcell, .trace => .{ .ra = true, .rb = true },
        .closure => .{ .rc = true, .wa = true },
        .call => .{ .rb = true, .args = .x },
        .calln => .{ .wa = true, .args = .x },
        .callm => .{ .wa = true, .args = .x_and_receiver },
        .@"suspend" => .{ .rb = true, .rc = true },
        _ => .{},
    };
}

/// An estimate of the native instructions of one bytecode instruction:
/// fetch, dispatch and the body, without loops over bytes or values and
/// without the body of a native function. From a reading of the code; the
/// validation plan replaces it with counts from callgrind.
fn opWork(op: Op) u32 {
    return switch (op) {
        .nop, .jmp => 8,
        .loadk, .loads, .loadi, .loadundef, .loadnull, .loadbool, .mov, .isnullish => 12,
        .add, .sub, .mul, .mod, .lt, .le, .gt, .ge, .not, .jt, .jf, .jnullish => 22,
        .seq, .sne => 26,
        .div, .pow, .band, .bor, .bxor, .shl, .shr, .ushr, .neg, .tonum, .bnot => 70,
        .getprop, .getelem, .push => 34,
        .setprop => 46,
        .newobj, .newarr => 64,
        .typeof, .tostr, .setelem, .delprop, .hasprop, .spreadarr, .spreadobj, .getcap, .newcell, .getcell, .setcell, .now, .random, .trace => 80,
        .closure, .newerr, .throw, .join, .exec_info, .vars => 120,
        .call, .ret => 130,
        .calln, .callm => 150,
        .@"suspend", .fork => 220,
        _ => 0,
    };
}

// ---- the cache model ------------------------------------------------------------

pub const Geometry = struct { bytes: u32, ways: u32 };

/// The data caches of one core.
pub const CacheConfig = struct {
    line_bytes: u32,
    l1: Geometry,
    l2: Geometry,
    l3: Geometry,
    /// A miss on line X also loads line X+1, and the first use of a line
    /// loaded this way loads the next one.
    next_line_prefetch: bool,

    pub fn entries(cfg: CacheConfig, g: Geometry) usize {
        std.debug.assert(std.math.isPowerOfTwo(cfg.line_bytes) and g.ways > 0);
        std.debug.assert(g.bytes >= cfg.line_bytes * g.ways);
        return g.bytes / cfg.line_bytes;
    }
};

const prefetched_bit: u64 = 1 << 63;

/// One level: `sets` sets of `ways` lines, least recently used out first.
/// Owner: perf. Lifetime: one run. Capacity: `CacheConfig.entries`.
// lint: table
const Level = struct {
    /// Line number plus one, with `prefetched_bit`; 0 when empty.
    tags: []u64,
    /// The clock value of the last use.
    ages: []u64,
    sets: u32,
    ways: u32,
    clock: u64 = 0,

    fn init(tags: []u64, ages: []u64, ways: u32) Level {
        std.debug.assert(tags.len == ages.len and tags.len % ways == 0 and tags.len > 0);
        @memset(tags, 0);
        @memset(ages, 0);
        return .{ .tags = tags, .ages = ages, .sets = @intCast(tags.len / ways), .ways = ways };
    }

    fn slot(l: *const Level, line: u64) ?usize {
        const first: usize = @intCast((line % l.sets) * l.ways);
        for (l.tags[first..][0..l.ways], first..) |t, i| if (t & ~prefetched_bit == line + 1) return i;
        return null;
    }

    /// True when the level holds the line; the line is then the newest.
    fn use(l: *Level, line: u64) bool {
        const i = l.slot(line) orelse return false;
        l.clock += 1;
        l.ages[i] = l.clock;
        return true;
    }

    /// Put the line in, in place of the oldest line of its set.
    fn insert(l: *Level, line: u64, flag: u64) void {
        std.debug.assert(l.slot(line) == null);
        const first: usize = @intCast((line % l.sets) * l.ways);
        var oldest = first;
        for (l.ages[first..][0..l.ways], first..) |a, i| if (a < l.ages[oldest]) {
            oldest = i;
        };
        l.clock += 1;
        l.tags[oldest] = (line + 1) | flag;
        l.ages[oldest] = l.clock;
    }
};

pub const Cache = struct {
    l1: Level,
    l2: Level,
    l3: Level,
    prefetch: bool,
    prefetches: u64 = 0,

    /// Use one line. The result is the level that had it: 0, 1, 2, or 3 for memory.
    fn touch(c: *Cache, line: u64) u2 {
        if (c.l1.slot(line)) |i| {
            const was_prefetched = c.l1.tags[i] & prefetched_bit != 0;
            c.l1.tags[i] &= ~prefetched_bit;
            const hit = c.l1.use(line);
            std.debug.assert(hit);
            if (was_prefetched) c.prefetchLine(line + 1);
            return 0;
        }
        const level: u2 = if (c.l2.use(line)) 1 else if (c.l3.use(line)) 2 else 3;
        if (level == 3) c.l3.insert(line, 0);
        if (level >= 2) c.l2.insert(line, 0);
        c.l1.insert(line, 0);
        c.prefetchLine(line + 1);
        return level;
    }

    fn prefetchLine(c: *Cache, line: u64) void {
        if (!c.prefetch or c.l1.slot(line) != null) return;
        c.prefetches += 1;
        if (!c.l2.use(line)) {
            if (!c.l3.use(line)) c.l3.insert(line, 0);
            c.l2.insert(line, 0);
        }
        c.l1.insert(line, prefetched_bit);
    }
};

/// The data TLBs for one page size.
const Tlb = struct {
    l1: Level,
    l2: Level,
    shift: u6,

    /// Use the page of `page`. The result: 0 for the first level, 1 for the
    /// second level, 2 for a page walk.
    fn touch(t: *Tlb, page: u64) u2 {
        if (t.l1.use(page)) return 0;
        const level: u2 = if (t.l2.use(page)) 1 else 2;
        if (level == 2) t.l2.insert(page, 0);
        t.l1.insert(page, 0);
        return level;
    }
};

// ---- the recorder ---------------------------------------------------------------

/// The memory of a recorder. The shell allocates it at startup.
pub const Storage = struct {
    l1_tags: []u64,
    l1_ages: []u64,
    l2_tags: []u64,
    l2_ages: []u64,
    l3_tags: []u64,
    l3_ages: []u64,
    /// The lines and pages of the current execution; each length is a power of two.
    ws_lines: []u64,
    ws_pages: []u64,
    /// `Profile.tlbWords` words for the TLBs of both page sizes.
    tlb: []u64,
};

pub const Access = enum(u8) { read, write };

const predictor_size = 4096;

pub const Recorder = struct {
    cache: Cache,
    tlb_small: Tlb,
    tlb_huge: Tlb,
    costs: Costs,
    line_shift: u6,
    page_shift: u6,
    ws_lines: []u64,
    ws_pages: []u64,
    ws_line_count: u32 = 0,
    ws_page_count: u32 = 0,
    /// The current execution, the first one, and the sum of all.
    cur: Counts = .{},
    first: Counts = .{},
    sum: Counts = .{},
    execs: u32 = 0,
    ws_lines_max: u32 = 0,
    ws_pages_max: u32 = 0,
    cur_op: u8 = op_start,
    cur_native: u16 = n_natives,
    cur_phase: Phase = .batch,
    prev_op: u8 = op_start,
    prev2_op: u8 = op_start,
    prev_addr: usize = 0,
    prev_branch: bool = false,
    /// The opcode that followed each pair of opcodes the last time.
    dispatch: [predictor_size]u8 = @splat(0),
    /// A two-bit counter for each conditional jump.
    branches: [predictor_size]u8 = @splat(1),

    pub fn init(p: *const Profile, s: Storage) Recorder {
        const cfg = p.cache;
        const t = p.tlb;
        std.debug.assert(std.math.isPowerOfTwo(s.ws_lines.len) and std.math.isPowerOfTwo(s.ws_pages.len));
        std.debug.assert(std.math.isPowerOfTwo(t.small_page) and t.small_page >= cfg.line_bytes and std.math.isPowerOfTwo(t.huge_page));
        std.debug.assert(s.tlb.len == p.tlbWords());
        @memset(s.ws_lines, 0);
        @memset(s.ws_pages, 0);
        const n1 = t.l1_entries;
        const n2 = t.l2_entries;
        const small = s.tlb[0 .. 2 * (n1 + n2)];
        const huge = s.tlb[2 * (n1 + n2) ..];
        return .{
            // The first level is fully associative: one set.
            .tlb_small = .{ .l1 = Level.init(small[0..n1], small[n1..][0..n1], n1), .l2 = Level.init(small[2 * n1 ..][0..n2], small[2 * n1 + n2 ..], t.l2_ways), .shift = @intCast(std.math.log2_int(u32, t.small_page)) },
            .tlb_huge = .{ .l1 = Level.init(huge[0..n1], huge[n1..][0..n1], n1), .l2 = Level.init(huge[2 * n1 ..][0..n2], huge[2 * n1 + n2 ..], t.l2_ways), .shift = @intCast(std.math.log2_int(u32, t.huge_page)) },
            .cache = .{
                .l1 = Level.init(s.l1_tags, s.l1_ages, cfg.l1.ways),
                .l2 = Level.init(s.l2_tags, s.l2_ages, cfg.l2.ways),
                .l3 = Level.init(s.l3_tags, s.l3_ages, cfg.l3.ways),
                .prefetch = cfg.next_line_prefetch,
            },
            .costs = p.costs,
            .line_shift = @intCast(std.math.log2_int(u32, cfg.line_bytes)),
            .page_shift = @intCast(std.math.log2_int(u32, t.small_page)),
            .ws_lines = s.ws_lines,
            .ws_pages = s.ws_pages,
        };
    }

    /// End the current execution: add its counts to the sums.
    pub fn endExec(rec: *Recorder) void {
        rec.cur.set(.misc, @backingInt(Misc.ws_lines), rec.ws_line_count);
        rec.cur.set(.misc, @backingInt(Misc.ws_pages), rec.ws_page_count);
        rec.cur.set(.misc, @backingInt(Misc.prefetches), rec.cache.prefetches);
        rec.cache.prefetches = 0;
        rec.ws_lines_max = @max(rec.ws_lines_max, rec.ws_line_count);
        rec.ws_pages_max = @max(rec.ws_pages_max, rec.ws_page_count);
        if (rec.execs == 0) rec.first = rec.cur;
        rec.sum.add(&rec.cur);
        rec.execs += 1;
        rec.cur = .{};
        @memset(rec.ws_lines, 0);
        @memset(rec.ws_pages, 0);
        rec.ws_line_count = 0;
        rec.ws_page_count = 0;
        rec.cur_op = op_start;
        rec.cur_native = n_natives;
        rec.cur_phase = .batch;
    }

    /// The core or the shell starts a phase.
    pub fn phase(rec: *Recorder, ph: Phase) void {
        const work = @as(u64, phaseWork(ph)) * rec.costs.instr;
        rec.cur_phase = ph;
        rec.cur_native = n_natives;
        rec.cur.bump(.phase_count, @backingInt(ph), 1);
        rec.cur.bump(.phase_cycles, @backingInt(ph), work);
        rec.cur.bump(.cause, @backingInt(Cause.compute), work);
    }

    pub fn syscall(rec: *Recorder, kind: Syscall) void {
        rec.cur.bump(.syscalls, @backingInt(kind), 1);
        rec.cur.bump(.cause, @backingInt(Cause.syscall), rec.costs.syscall);
    }

    pub fn access(rec: *Recorder, st: Structure, site: Site, kind: Access, addr: usize, len: usize) void {
        if (len == 0) return;
        std.debug.assert(addr +% len > addr);
        const c = &rec.cur;
        const si = @backingInt(st);
        switch (kind) {
            // The rest of a header is part of the read of its first word.
            .read => {
                if (site != .region_span) c.bump(.reads, si, 1);
                c.bump(.read_bytes, si, len);
            },
            .write => {
                c.bump(.writes, si, 1);
                c.bump(.write_bytes, si, len);
            },
        }
        const last = (addr + len - 1) >> rec.line_shift;
        var line = addr >> rec.line_shift;
        while (line <= last) : (line += 1) rec.touchLine(st, site, kind, line);
        const last_page = (addr + len - 1) >> rec.page_shift;
        var page = addr >> rec.page_shift;
        while (page <= last_page) : (page += 1) {
            if (noteSet(rec.ws_pages, &rec.ws_page_count, page + 1) == .full) c.bump(.misc, @backingInt(Misc.ws_overflow), 1);
            rec.touchPage(page);
        }
    }

    /// The TLBs for one small page. The cycles are those of small pages; the
    /// huge-page TLB only counts, so a report can compare the two.
    fn touchPage(rec: *Recorder, page: u64) void {
        const c = &rec.cur;
        const small = rec.tlb_small.touch(page);
        const huge = rec.tlb_huge.touch(page >> (rec.tlb_huge.shift - rec.tlb_small.shift));
        if (small >= 1) c.bump(.misc, @backingInt(Misc.tlb_l1_miss), 1);
        if (small == 2) c.bump(.misc, @backingInt(Misc.tlb_walk), 1);
        if (huge >= 1) c.bump(.misc, @backingInt(Misc.huge_l1_miss), 1);
        if (huge == 2) c.bump(.misc, @backingInt(Misc.huge_walk), 1);
        const cost: u64 = switch (small) {
            0 => 0,
            1 => rec.costs.tlb_l1_miss,
            2 => rec.costs.tlb_walk,
            3 => unreachable, // `Tlb.touch` gives 0, 1 or 2.
        };
        c.bump(.cause, @backingInt(Cause.tlb), cost);
        rec.charge(cost);
    }

    fn touchLine(rec: *Recorder, st: Structure, site: Site, kind: Access, line: u64) void {
        const c = &rec.cur;
        const si: usize = @backingInt(st);
        const level = rec.cache.touch(line);
        std.debug.assert(si < n_structures and @backingInt(site) < n_sites);
        c.bump(.lines, si * levels + level, 1);
        c.bump(.site_lines, @as(usize, @backingInt(site)) * levels + level, 1);
        switch (noteSet(rec.ws_lines, &rec.ws_line_count, line + 1)) {
            .new => c.bump(.ws_st, si, 1),
            .full => c.bump(.misc, @backingInt(Misc.ws_overflow), 1),
            .seen => {},
        }
        const dep = dependent(site);
        if (dep and kind == .read and !ranged(site)) c.bump(.misc, @backingInt(Misc.dep_loads), 1);
        const miss_cost: u64 = switch (level) {
            0 => 0,
            1 => rec.costs.load_l2,
            2 => rec.costs.load_l3,
            3 => rec.costs.load_mem,
        };
        const hit_cost: u64 = if (ranged(site)) 0 else if (kind == .write) rec.costs.store else if (dep) rec.costs.load_l1_dep else rec.costs.load_l1;
        const cause: Cause = if (kind == .write) (if (level == 0) .store else .store_miss) else switch (level) {
            0 => if (dep) .load_l1_dep else .load_l1,
            1 => .load_l2,
            2 => .load_l3,
            3 => .load_mem,
        };
        // A miss on a store also pays the store.
        const cost = if (level == 0) hit_cost else miss_cost + if (kind == .write and !ranged(site)) rec.costs.store else 0;
        c.bump(.cause, @backingInt(cause), cost);
        c.bump(.st_cycles, si, cost);
        c.bump(.site_cycles, @backingInt(site), cost);
        rec.charge(cost);
    }

    fn charge(rec: *Recorder, cost: u64) void {
        if (rec.cur_phase != .interp) return rec.cur.bump(.phase_cycles, @backingInt(rec.cur_phase), cost);
        rec.cur.bump(.op_cycles, rec.cur_op, cost);
        if (rec.cur_native < n_natives) rec.cur.bump(.native_cycles, rec.cur_native, cost);
    }

    /// `numbers_addr`: the number constants of the module.
    pub fn instr(rec: *Recorder, ins: module.Instr, code_addr: usize, regs_addr: usize, numbers_addr: usize) void {
        std.debug.assert(code_addr != 0 and regs_addr % 8 == 0);
        const c = &rec.cur;
        const op: Op = @fromBackingInt(ins.op);
        const sh = shapeOf(op);
        rec.predict(ins.op, code_addr, sh.branch);
        rec.cur_op = ins.op;
        rec.cur_phase = .interp;
        rec.cur_native = n_natives;
        c.bump(.instr, ins.op, 1);
        c.bump(.op_cycles, ins.op, @as(u64, opWork(op)) * rec.costs.instr);
        c.bump(.cause, @backingInt(Cause.compute), @as(u64, opWork(op)) * rec.costs.instr);
        rec.access(.module_code, .interp_fetch, .read, code_addr, @sizeOf(module.Instr));
        if (sh.ra) rec.access(.registers, .interp_reg, .read, regs_addr + 8 * @as(usize, ins.a), 8);
        if (sh.rb) rec.access(.registers, .interp_reg, .read, regs_addr + 8 * @as(usize, ins.b), 8);
        if (sh.rc) rec.access(.registers, .interp_reg, .read, regs_addr + 8 * @as(usize, ins.c), 8);
        const nargs: usize = switch (sh.args) {
            .none => 0,
            .x => ins.x,
            .x_and_receiver => @as(usize, ins.x) + 1,
        };
        rec.access(.registers, .interp_reg, .read, regs_addr + 8 * @as(usize, ins.c), 8 * nargs);
        if (sh.wa) rec.access(.registers, .interp_reg, .write, regs_addr + 8 * @as(usize, ins.a), 8);
        if (op == .loadk) rec.access(.const_numbers, .interp_const, .read, numbers_addr + 8 * @as(usize, ins.bc()), 8);
        if (op == .calln or op == .callm) {
            rec.cur_native = @min(ins.b, n_natives - 1);
            c.bump(.native_calls, rec.cur_native, 1);
        }
    }

    /// The dispatch jump and the conditional jump of the last instruction.
    fn predict(rec: *Recorder, op: u8, code_addr: usize, is_branch: bool) void {
        const c = &rec.cur;
        const key = (@as(usize, rec.prev_op) * 31 + @as(usize, rec.prev2_op) * 7) % predictor_size;
        std.debug.assert(rec.dispatch.len == predictor_size and rec.branches.len == predictor_size);
        if (rec.dispatch[key] != op) {
            c.bump(.misc, @backingInt(Misc.dispatch_miss), 1);
            rec.mispredict();
        }
        rec.dispatch[key] = op;
        if (rec.prev_branch) {
            const taken = code_addr != rec.prev_addr + @sizeOf(module.Instr);
            const counter = &rec.branches[(rec.prev_addr / @sizeOf(module.Instr)) % predictor_size];
            c.bump(.misc, @backingInt(Misc.branch), 1);
            if ((counter.* >= 2) != taken) {
                c.bump(.misc, @backingInt(Misc.branch_miss), 1);
                rec.mispredict();
            }
            counter.* = if (taken) @min(counter.* + 1, 3) else counter.* -| 1;
        }
        rec.prev2_op = rec.prev_op;
        rec.prev_op = op;
        rec.prev_addr = code_addr;
        rec.prev_branch = is_branch;
    }

    fn mispredict(rec: *Recorder) void {
        rec.cur.bump(.cause, @backingInt(Cause.mispredict), rec.costs.mispredict);
        rec.charge(rec.costs.mispredict);
    }

    /// The fast loop gave its last instruction to the slow path: the slow
    /// path counts it again, so take the first count back.
    pub fn bail(rec: *Recorder) void {
        std.debug.assert(rec.cur.get(.instr, rec.cur_op) > 0);
        const work = @as(u64, opWork(@fromBackingInt(rec.cur_op))) * rec.costs.instr;
        rec.cur.drop(.instr, rec.cur_op, 1);
        rec.cur.bump(.bails, rec.cur_op, 1);
        // The fetch and the checks of the first try stay: 12 instructions.
        const back = work -| 12 * rec.costs.instr;
        rec.cur.drop(.op_cycles, rec.cur_op, back);
        rec.cur.drop(.cause, @backingInt(Cause.compute), back);
    }

    pub fn alloc(rec: *Recorder, st: Structure, size: usize) void {
        rec.cur.bump(.allocs, @backingInt(st), 1);
        rec.cur.bump(.alloc_bytes, @backingInt(st), size);
    }

    pub fn scan(rec: *Recorder, loop: Loop, elems: usize) void {
        const cost = loopCycles(loop, elems);
        rec.cur.bump(.loop_calls, @backingInt(loop), 1);
        rec.cur.bump(.loop_elems, @backingInt(loop), elems);
        rec.cur.bump(.cause, @backingInt(Cause.loops), cost);
        rec.charge(cost);
    }
};

const Noted = enum { new, seen, full };

/// Add `key` (never 0) to an open-address set that is at most three quarters full.
fn noteSet(set: []u64, count: *u32, key: u64) Noted {
    std.debug.assert(key != 0 and std.math.isPowerOfTwo(set.len));
    const mask = set.len - 1;
    var i: usize = @intCast((key *% 0x9E3779B97F4A7C15) >> 20 & mask);
    for (0..set.len) |_| {
        if (set[i] == key) return .seen;
        if (set[i] == 0) {
            if (@as(usize, count.*) * 4 >= set.len * 3) return .full;
            set[i] = key;
            count.* += 1;
            return .new;
        }
        i = (i + 1) & mask;
    }
    return .full;
}

// ---- tests ----------------------------------------------------------------------

const test_words = 136 + 24;

/// A recorder with small caches: L1 2 sets of 2 lines, L2 4 sets of 2, L3 8 sets of 2.
/// The TLBs: 2 entries, then 4 entries in 2 sets of 2.
fn testRecorder(w: *[test_words]u64, prefetch: bool) Recorder {
    var p = zen2_epyc_7b12;
    p.cache = .{ .line_bytes = 64, .l1 = .{ .bytes = 256, .ways = 2 }, .l2 = .{ .bytes = 512, .ways = 2 }, .l3 = .{ .bytes = 1024, .ways = 2 }, .next_line_prefetch = prefetch };
    p.tlb = .{ .l1_entries = 2, .l2_entries = 4, .l2_ways = 2, .small_page = 4096, .huge_page = 2 << 20 };
    return Recorder.init(&p, .{
        .tlb = w[136..],
        .l1_tags = w[0..4],
        .l1_ages = w[4..8],
        .l2_tags = w[8..16],
        .l2_ages = w[16..24],
        .l3_tags = w[24..40],
        .l3_ages = w[40..56],
        .ws_lines = w[56..120],
        .ws_pages = w[120..136],
    });
}

test "cache model: a hand-computed trace through three levels" {
    var words: [test_words]u64 = @splat(0);
    var rec = testRecorder(&words, false);
    const c = &rec.cache;
    // Lines 0, 2 and 4 share set 0 of L1 (2 sets). In L2 (4 sets) line 2 is alone in set 2.
    try std.testing.expectEqual(@as(u2, 3), c.touch(0)); // cold: memory
    try std.testing.expectEqual(@as(u2, 3), c.touch(2)); // cold: memory
    try std.testing.expectEqual(@as(u2, 0), c.touch(0)); // L1 holds {0, 2}
    try std.testing.expectEqual(@as(u2, 3), c.touch(4)); // cold; L1 drops 2, the oldest
    try std.testing.expectEqual(@as(u2, 1), c.touch(2)); // L2 has it; L1 drops 0
    try std.testing.expectEqual(@as(u2, 1), c.touch(0)); // L2 set 0 holds {0, 4}; L1 drops 4
    try std.testing.expectEqual(@as(u2, 0), c.touch(2));
    try std.testing.expectEqual(@as(u2, 3), c.touch(8));
    try std.testing.expectEqual(@as(u2, 3), c.touch(12));
    // 8 and 12 are cold. In L2 set 0 they push out 4 and then 0; L3 still has both.
    try std.testing.expectEqual(@as(u2, 2), c.touch(4));
    try std.testing.expectEqual(@as(u2, 2), c.touch(0));
}

test "cache model: the next-line prefetcher follows a stream" {
    var words: [test_words]u64 = @splat(0);
    var rec = testRecorder(&words, true);
    const c = &rec.cache;
    try std.testing.expectEqual(@as(u2, 3), c.touch(10)); // miss; line 11 comes with it
    try std.testing.expectEqual(@as(u2, 0), c.touch(11)); // first use of a prefetched line: 12 comes
    try std.testing.expectEqual(@as(u2, 0), c.touch(12));
    try std.testing.expectEqual(@as(u2, 0), c.touch(13));
    try std.testing.expectEqual(@as(u64, 4), c.prefetches);
    // A line far away is a miss again.
    try std.testing.expectEqual(@as(u2, 3), c.touch(40));
}

test "recorder: counts by structure, lines of an access, and the working set" {
    var words: [test_words]u64 = @splat(0);
    var rec = testRecorder(&words, false);
    const r = &rec;
    // 16 bytes that start 8 bytes before a line end: two lines, one page.
    r.access(.registers, .interp_reg, .read, 0x1000 + 56, 16);
    r.access(.registers, .interp_reg, .write, 0x1000 + 56, 8);
    r.access(.str_bytes, .str_bytes, .read, 0x3000, 1);
    const reg = @backingInt(Structure.registers);
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.reads, reg));
    try std.testing.expectEqual(@as(u64, 16), r.cur.get(.read_bytes, reg));
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.writes, reg));
    try std.testing.expectEqual(@as(u64, 2), r.cur.get(.lines, reg * levels + 3)); // two cold lines
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.lines, reg * levels + 0)); // the write hits
    try std.testing.expectEqual(@as(u64, 2), r.cur.get(.ws_st, reg));
    // Costs: two loads from memory, one store, one ranged read from memory.
    try std.testing.expectEqual(@as(u64, 3 * 18800), r.cur.get(.cause, @backingInt(Cause.load_mem)));
    try std.testing.expectEqual(@as(u64, 100), r.cur.get(.cause, @backingInt(Cause.store)));
    r.endExec();
    try std.testing.expectEqual(@as(u32, 3), r.ws_lines_max);
    try std.testing.expectEqual(@as(u32, 2), r.ws_pages_max);
    try std.testing.expectEqual(@as(u64, 3), r.sum.get(.misc, @backingInt(Misc.ws_lines)));
    try std.testing.expectEqual(@as(u64, 0), r.cur.total(.reads));
}

test "recorder: an instruction reads its code and registers, and a bail is not counted twice" {
    var words: [test_words]u64 = @splat(0);
    var rec = testRecorder(&words, false);
    const r = &rec;
    const add: module.Instr = .{ .op = @backingInt(Op.add), .x = 0, .a = 2, .b = 0, .c = 1 };
    r.instr(add, 0x8000, 0x9000, 0xA000);
    const reg = @backingInt(Structure.registers);
    try std.testing.expectEqual(@as(u64, 2), r.cur.get(.reads, reg));
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.writes, reg));
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.reads, @backingInt(Structure.module_code)));
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.instr, add.op));
    r.bail();
    r.instr(add, 0x8000, 0x9000, 0xA000);
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.instr, add.op));
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.bails, add.op));
    // Each new pair of earlier opcodes is a dispatch miss.
    try std.testing.expectEqual(@as(u64, 2), r.cur.get(.misc, @backingInt(Misc.dispatch_miss)));
}

test "TLB model: a hand-computed trace with small and huge pages" {
    var words: [test_words]u64 = @splat(0);
    var rec = testRecorder(&words, false);
    const r = &rec;
    // Pages 1, 2, 3, then 1 again: the first level holds 2 pages, the second 4.
    for ([_]usize{ 0x1000, 0x2000, 0x3000, 0x1000 }) |addr| r.access(.registers, .interp_reg, .read, addr, 8);
    // Three walks; page 1 left the first level and comes back from the second.
    try std.testing.expectEqual(@as(u64, 3), r.cur.get(.misc, @backingInt(Misc.tlb_walk)));
    try std.testing.expectEqual(@as(u64, 4), r.cur.get(.misc, @backingInt(Misc.tlb_l1_miss)));
    try std.testing.expectEqual(@as(u64, 3 * 5500 + 700), r.cur.get(.cause, @backingInt(Cause.tlb)));
    // One huge page holds all four: one walk, then hits.
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.misc, @backingInt(Misc.huge_walk)));
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.misc, @backingInt(Misc.huge_l1_miss)));
}

test "recorder: a phase takes the accesses outside the interpreter, and system calls are a cause of their own" {
    var words: [test_words]u64 = @splat(0);
    var rec = testRecorder(&words, false);
    const r = &rec;
    r.phase(.start);
    r.access(.slot_table, .core_row, .write, 0x5000, 8);
    r.syscall(.log_write);
    const start = @backingInt(Phase.start);
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.phase_count, start));
    // The work of the phase, one page walk and one store that misses to memory.
    try std.testing.expectEqual(@as(u64, 1500 * 35 + 5500 + 18800 + 100), r.cur.get(.phase_cycles, start));
    try std.testing.expectEqual(@as(u64, 0), r.cur.total(.op_cycles));
    try std.testing.expectEqual(@as(u64, 1), r.cur.get(.syscalls, @backingInt(Syscall.log_write)));
    try std.testing.expectEqual(@as(u64, 150000), r.cur.get(.cause, @backingInt(Cause.syscall)));
    // An instruction ends the phase.
    r.instr(.{ .op = @backingInt(Op.nop), .x = 0, .a = 0, .b = 0, .c = 0 }, 0x8000, 0x9000, 0xA000);
    try std.testing.expect(r.cur.get(.op_cycles, @backingInt(Op.nop)) > 0);
}
