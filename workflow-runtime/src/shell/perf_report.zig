//! `wfrt perf-model`: run a fixture with the recorder of the performance
//! model (docs/perf-model.md) and print its counters, as text or as JSON.
//! Numbers are for one execution: the mean of the executions after the
//! first one, with one decimal. The first execution is the cold one.
const std = @import("std");
const core_lib = @import("core");
const perf = core_lib.perf;
const mem = core_lib.mem;
const module = core_lib.module;
const fixture = @import("fixture.zig");
const Writer = std.Io.Writer;
const Counts = perf.Counts;

pub const Options = struct {
    n: u32 = 100,
    json: bool = false,
    /// Print only the line of the regression gate, with this case name.
    gate: ?[]const u8 = null,
    /// The CPU that the model stands for. Never the CPU of this machine.
    profile: perf.Profile = perf.zen2_epyc_7b12,
    /// Entries of the sets of lines and pages of one execution.
    ws_lines: u32 = 1 << 18,
    ws_pages: u32 = 1 << 14,
};

/// What the report reads: the counts of the steady executions and their number.
const View = struct {
    c: Counts,
    div: u64,
    first: Counts,
    execs: u32,
    m: module.Module,
    name: []const u8,
    o: Options,
    lines_max: u32,
    pages_max: u32,

    /// Ten times the mean of `x` for one execution.
    fn per(v: *const View, x: u64) u64 {
        return (x * 10 + v.div / 2) / v.div;
    }

    /// Ten times the mean cycles of `x` hundredths of a cycle.
    fn cyc(v: *const View, x: u64) u64 {
        return (x + v.div * 5) / (v.div * 10);
    }

    fn totalCycles(v: *const View) u64 {
        return v.c.total(.cause);
    }
};

pub fn run(gpa: std.mem.Allocator, out: *Writer, mod: []const u8, fx: []const u8, name: []const u8, o: Options) !void {
    if (!mem.enabled) {
        try out.writeAll("perf-model: this binary has no recorder. Build with: zig build -Drelease=true -Dperf-model=true\n");
        return error.NoRecorder;
    }
    std.debug.assert(o.n >= 1);
    const c = o.profile.cache;
    const rec = try gpa.create(perf.Recorder);
    defer gpa.destroy(rec);
    rec.* = perf.Recorder.init(&o.profile, .{
        .tlb = try gpa.alloc(u64, o.profile.tlbWords()),
        .l1_tags = try gpa.alloc(u64, c.entries(c.l1)),
        .l1_ages = try gpa.alloc(u64, c.entries(c.l1)),
        .l2_tags = try gpa.alloc(u64, c.entries(c.l2)),
        .l2_ages = try gpa.alloc(u64, c.entries(c.l2)),
        .l3_tags = try gpa.alloc(u64, c.entries(c.l3)),
        .l3_ages = try gpa.alloc(u64, c.entries(c.l3)),
        .ws_lines = try gpa.alloc(u64, o.ws_lines),
        .ws_pages = try gpa.alloc(u64, o.ws_pages),
    });
    const ok = try fixture.benchShard(gpa, mod, fx, o.n, .{ .probe = if (mem.enabled) rec else {} });
    if (ok != o.n) std.debug.print("perf-model: {d} of {d} executions ended ok\n", .{ ok, o.n });
    const natives = try gpa.alloc(u16, 1 << 16);
    const steady = o.n > 1;
    const v: View = .{
        .c = if (steady) rec.sum.minus(&rec.first) else rec.first,
        .div = if (steady) o.n - 1 else 1,
        .first = rec.first,
        .execs = rec.execs,
        .m = try module.load(mod, natives),
        .name = name,
        .o = o,
        .lines_max = rec.ws_lines_max,
        .pages_max = rec.ws_pages_max,
    };
    std.debug.assert(rec.execs == o.n);
    if (o.gate) |case| return writeGate(out, &v, case);
    if (o.json) try writeJson(out, &v) else try writeText(out, &v);
}

// ---- rows ---------------------------------------------------------------------

const Row = struct { key: u32, weight: u64 };
const max_rows = 512;

/// The indices of a counter group with a count above zero, largest `weight` first.
fn ranked(rows: *[max_rows]Row, c: *const Counts, comptime count: perf.Field, comptime weight: perf.Field) []Row {
    var n: usize = 0;
    for (0..perf.lenOf(count)) |i| {
        if (c.get(count, i) == 0 and c.get(weight, i) == 0) continue;
        rows[n] = .{ .key = @intCast(i), .weight = c.get(weight, i) };
        n += 1;
    }
    std.mem.sort(Row, rows[0..n], {}, struct {
        fn less(_: void, a: Row, b: Row) bool {
            return a.weight > b.weight or (a.weight == b.weight and a.key < b.key);
        }
    }.less);
    return rows[0..n];
}

fn opName(op: u8) []const u8 {
    if (op == perf.op_start) return "(before the first)";
    return std.enums.tagName(module.Op, @fromBackingInt(op)) orelse "?";
}

fn nativeName(v: *const View, i: u32) []const u8 {
    if (i + 1 >= perf.n_natives or i >= v.m.strCount()) return "(others)";
    return v.m.str(i);
}

// ---- candidates ----------------------------------------------------------------

const Candidate = struct { saving: u64, layer: []const u8, text: []const u8 };
const max_candidates = 18;

fn misc(c: *const Counts, m: perf.Misc) u64 {
    return c.get(.misc, @backingInt(m));
}

fn loopElems(c: *const Counts, l: perf.Loop) u64 {
    return c.get(.loop_elems, @backingInt(l));
}

fn ops(c: *const Counts, comptime f: perf.Field, list: []const module.Op) u64 {
    var sum: u64 = 0;
    for (list) |op| sum += c.get(f, @backingInt(op));
    return sum;
}

fn cause(c: *const Counts, list: []const perf.Cause) u64 {
    var sum: u64 = 0;
    for (list) |x| sum += c.get(.cause, @backingInt(x));
    return sum;
}

/// The changes that the counts point at, each with the cycles it can save
/// at most (hundredths, summed over the steady executions), largest first.
fn candidates(buf: *[max_candidates]Candidate, v: *const View) []Candidate {
    const c = &v.c;
    const k = v.o.profile.costs;
    const lookups = ops(c, .instr, &.{ .getprop, .setprop }) + ops(c, .bails, &.{ .getprop, .setprop });
    const probes = loopElems(c, .key_probe);
    const utf = perf.loopCost(.utf16_len);
    const fill_vals = (c.get(.alloc_bytes, @backingInt(perf.Structure.obj_entries)) + c.get(.alloc_bytes, @backingInt(perf.Structure.arr_items))) / 8;
    const list = [max_candidates]Candidate{
        .{ .saving = c.total(.bails) * (52 * k.instr + 3 * k.load_l1), .layer = "interpreter", .text = "run in the fast loop the instructions that it gives to the slow path (bails)" },
        .{ .saving = ops(c, .op_cycles, &.{.mov}), .layer = "bytecode compiler", .text = "remove register copies (mov): write results to their final register" },
        .{ .saving = (probes -| lookups) * perf.loopCost(.key_probe).scalar + loopElems(c, .key_bytes) * perf.loopCost(.key_bytes).vector, .layer = "data layout", .text = "find a property in one probe: object shapes with a slot cache at the instruction" },
        .{ .saving = loopElems(c, .utf16_len) * (utf.scalar - utf.vector), .layer = "runtime", .text = "UTF-16 length: a vector loop, or an ASCII flag from the JSON scan" },
        .{ .saving = fill_vals * perf.loopCost(.value_fill).vector + c.get(.site_cycles, @backingInt(perf.Site.json_build)), .layer = "runtime", .text = "do not fill value blocks that the next step overwrites (JSON build, object and array capacity)" },
        .{ .saving = misc(c, .dep_loads) * (k.load_l1_dep - k.load_l1), .layer = "data layout", .text = "fewer dependent loads: entries and short strings beside their header" },
        .{ .saving = cause(c, &.{ .load_l2, .load_l3, .load_mem, .store_miss }), .layer = "data layout", .text = "cache misses: keep one execution in fewer lines (see the structure table)" },
        .{ .saving = cause(c, &.{.mispredict}), .layer = "interpreter", .text = "branch misses of dispatch and jumps: superinstructions for common pairs" },
        .{ .saving = perf.loopCycles(.json_scan, loopElems(c, .json_scan)) + perf.loopCycles(.json_emit, loopElems(c, .json_emit)), .layer = "converter", .text = "JSON: decode only the fields that the workflow reads; encode fixed text from a template" },
        .{ .saving = ops(c, .instr, &.{ .calln, .callm }) * 100 * k.instr, .layer = "bytecode compiler", .text = "native calls: one direct opcode for each hot native (no argument window, no id table)" },
        .{ .saving = ops(c, .op_cycles, &.{.call}) * 2, .layer = "bytecode compiler", .text = "calls of bytecode functions (call and its return): inline small functions" },
        .{ .saving = c.get(.site_lines, @as(usize, @backingInt(perf.Site.exec_at)) * 4) * (k.load_l1 + 3 * k.instr), .layer = "interpreter", .text = "the execution root is read many times for each instruction: keep fuel, fibre count and flags in locals" },
        .{ .saving = perf.loopCycles(.byte_fill, loopElems(c, .byte_fill)) + c.get(.site_cycles, @backingInt(perf.Site.core_copy)) + c.get(.site_cycles, @backingInt(perf.Site.shell_buf)), .layer = "runtime", .text = "copies and fills of the core and the shell: the fill of released regions and scratch in a safe build, the log record" },
        .{ .saving = cause(c, &.{.syscall}), .layer = "shell", .text = "system calls: share the log write and the sends of a batch among its executions" },
        .{ .saving = c.get(.site_cycles, @backingInt(perf.Site.interp_frame)), .layer = "interpreter", .text = "the slow path reads the fibre and the frame again for each instruction: keep them in locals" },
        .{ .saving = ops(c, .op_cycles, &.{ .loadk, .loads, .loadi, .loadundef, .loadnull, .loadbool }), .layer = "bytecode compiler", .text = "constant loads: operands that name a constant directly" },
        .{ .saving = c.get(.site_cycles, @backingInt(perf.Site.const_str)) + c.get(.site_cycles, @backingInt(perf.Site.str_bytes)), .layer = "data layout", .text = "string bytes read for compares and copies: interned strings compare by handle" },
        .{ .saving = (misc(c, .tlb_l1_miss) - misc(c, .tlb_walk) -| (misc(c, .huge_l1_miss) - misc(c, .huge_walk))) * k.tlb_l1_miss + (misc(c, .tlb_walk) -| misc(c, .huge_walk)) * k.tlb_walk, .layer = "shell", .text = "TLB: map the arena with 2 MiB pages (huge pages)" },
    };
    buf.* = list;
    std.mem.sort(Candidate, buf, {}, struct {
        fn less(_: void, a: Candidate, b: Candidate) bool {
            return a.saving > b.saving;
        }
    }.less);
    var n: usize = 0;
    for (buf) |x| {
        if (x.saving > 0 and n < 10) n += 1;
    }
    return buf[0..n];
}

// ---- text ----------------------------------------------------------------------

/// `x10` is ten times the number: print it with one decimal, right-aligned.
fn dec(out: *Writer, x10: u64, width: usize) !void {
    var buf: [32]u8 = @splat(' ');
    const text = std.fmt.bufPrint(&buf, "{d}.{d}", .{ x10 / 10, x10 % 10 }) catch unreachable; // 22 bytes at most.
    try out.splatByteAll(' ', width -| text.len);
    try out.writeAll(text);
}

fn percent(out: *Writer, part: u64, whole: u64) !void {
    try dec(out, if (whole == 0) 0 else (part * 1000 + whole / 2) / whole, 7);
    try out.writeAll("%");
}

fn writeText(out: *Writer, v: *const View) !void {
    const p = &v.o.profile;
    const c = p.cache;
    const f = p.features;
    try out.print("perf-model: {s}, {d} executions; numbers for one execution (mean of the {d} after the first)\n", .{ v.name, v.execs, v.div });
    try out.print("CPU profile {s}: {d} MHz, vectors {d} bit, AVX2 {}, AVX-512 {}, BMI2 {} (fast PDEP/PEXT {})\n", .{ p.name, p.clock_mhz, p.vector_bits, f.avx2, f.avx512, f.bmi2, f.fast_pdep_pext });
    try out.print("caches: L1d {d} KiB {d}-way, L2 {d} KiB {d}-way, L3 {d} KiB {d}-way, line {d}, next-line prefetch {s}\n", .{ c.l1.bytes >> 10, c.l1.ways, c.l2.bytes >> 10, c.l2.ways, c.l3.bytes >> 10, c.l3.ways, c.line_bytes, if (c.next_line_prefetch) "on" else "off" });
    try out.print("TLB: {d} entries, then {d} entries {d}-way; pages {d} B (in the cycles) and {d} KiB (counted)\n\n", .{ p.tlb.l1_entries, p.tlb.l2_entries, p.tlb.l2_ways, p.tlb.small_page, p.tlb.huge_page >> 10 });
    try textSummary(out, v);
    try textTlb(out, v);
    try textCauses(out, v);
    try textPhases(out, v);
    try textOps(out, v);
    try textNatives(out, v);
    try textStructures(out, v);
    try textSites(out, v);
    try textLoops(out, v);
    try textCandidates(out, v);
}

const Totals = struct { instr: u64, reads: u64, writes: u64, read_bytes: u64, write_bytes: u64, lines: u64, pages: u64, cycles: u64, dep: u64, branch_miss: u64 };

fn totalsOf(c: *const Counts) Totals {
    return .{
        .instr = c.total(.instr),
        .reads = c.total(.reads),
        .writes = c.total(.writes),
        .read_bytes = c.total(.read_bytes),
        .write_bytes = c.total(.write_bytes),
        .lines = misc(c, .ws_lines),
        .pages = misc(c, .ws_pages),
        .cycles = c.total(.cause),
        .dep = misc(c, .dep_loads),
        .branch_miss = misc(c, .dispatch_miss) + misc(c, .branch_miss),
    };
}

fn textSummary(out: *Writer, v: *const View) !void {
    const s = totalsOf(&v.c);
    const f = totalsOf(&v.first);
    try out.writeAll("SUMMARY                          steady        first\n");
    const rows = [_]struct { []const u8, u64, u64 }{
        .{ "bytecode instructions", s.instr, f.instr },       .{ "memory reads", s.reads, f.reads },
        .{ "memory writes", s.writes, f.writes },             .{ "bytes read", s.read_bytes, f.read_bytes },
        .{ "bytes written", s.write_bytes, f.write_bytes },   .{ "dependent loads", s.dep, f.dep },
        .{ "branch misses (model)", s.branch_miss, f.branch_miss }, .{ "working set, lines", s.lines, f.lines },
        .{ "working set, pages", s.pages, f.pages },
    };
    for (rows) |r| {
        try out.print("{s:<26}", .{r[0]});
        try dec(out, v.per(r[1]), 13);
        try dec(out, r[2] * 10, 13);
        try out.writeAll("\n");
    }
    try out.print("{s:<26}", .{"modelled cycles"});
    try dec(out, v.cyc(s.cycles), 13);
    try dec(out, f.cycles / 10, 13);
    const budget = v.o.profile.budgetCycles();
    try out.print("\nBUDGET {d} cycles (10 us at {d} MHz): modelled ", .{ budget, v.o.profile.clock_mhz });
    try dec(out, v.cyc(s.cycles), 1);
    try out.writeAll(" cycles =");
    try percent(out, v.cyc(s.cycles), budget * 10);
    try out.writeAll(" of the budget, ");
    try dec(out, v.cyc(s.cycles) * 1000 / v.o.profile.clock_mhz, 1);
    try out.print(" ns\nworking set maximum: {d} lines, {d} pages\n\n", .{ v.lines_max, v.pages_max });
}

fn textTlb(out: *Writer, v: *const View) !void {
    const k = v.o.profile.costs;
    try out.writeAll("TLB                      first-level misses        walks       cycles\n");
    const rows = [_]struct { []const u8, u64, u64 }{
        .{ "4 KiB pages", misc(&v.c, .tlb_l1_miss), misc(&v.c, .tlb_walk) },
        .{ "2 MiB pages", misc(&v.c, .huge_l1_miss), misc(&v.c, .huge_walk) },
    };
    for (rows) |r| {
        try out.print("{s:<26}", .{r[0]});
        try dec(out, v.per(r[1]), 17);
        try dec(out, v.per(r[2]), 13);
        try dec(out, v.cyc((r[1] - r[2]) * k.tlb_l1_miss + r[2] * k.tlb_walk), 13);
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
}

fn textCauses(out: *Writer, v: *const View) !void {
    try out.writeAll("CYCLES BY CAUSE                  cycles    share\n");
    for (std.enums.values(perf.Cause)) |x| {
        const n = v.c.get(.cause, @backingInt(x));
        try out.print("{s:<26}", .{@tagName(x)});
        try dec(out, v.cyc(n), 13);
        try percent(out, n, v.totalCycles());
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
}

fn textOps(out: *Writer, v: *const View) !void {
    var rows: [max_rows]Row = @splat(.{ .key = 0, .weight = 0 });
    try header(out, "INSTRUCTIONS BY OPCODE", 26, &.{ "count", "bails", "cycles", "share" }, 13);
    for (ranked(&rows, &v.c, .instr, .op_cycles)) |r| {
        try out.print("{s:<26}", .{opName(@intCast(r.key))});
        try dec(out, v.per(v.c.get(.instr, r.key)), 13);
        try dec(out, v.per(v.c.get(.bails, r.key)), 13);
        try dec(out, v.cyc(r.weight), 13);
        try out.splatByteAll(' ', 5);
        try percent(out, r.weight, v.totalCycles());
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
}

fn textNatives(out: *Writer, v: *const View) !void {
    var rows: [max_rows]Row = @splat(.{ .key = 0, .weight = 0 });
    const list = ranked(&rows, &v.c, .native_calls, .native_cycles);
    if (list.len == 0) return;
    try out.writeAll("NATIVE CALLS                      calls   mem cycles\n");
    for (list[0..@min(list.len, 20)]) |r| {
        try out.print("{s:<26}", .{nativeName(v, r.key)});
        try dec(out, v.per(v.c.get(.native_calls, r.key)), 13);
        try dec(out, v.cyc(r.weight), 13);
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
}

/// A header line: the first column, then each name right-aligned in `width`.
fn header(out: *Writer, first: []const u8, first_width: usize, names: []const []const u8, width: usize) !void {
    try out.writeAll(first);
    try out.splatByteAll(' ', first_width -| first.len);
    for (names) |name| {
        try out.splatByteAll(' ', width -| name.len);
        try out.writeAll(name);
    }
    try out.writeAll("\n");
}

const structure_cols = [_][]const u8{ "reads", "writes", "rd bytes", "wr bytes", "L1", "L2", "L3", "mem", "lines", "allocs", "al bytes", "cycles" };
const col_width = 12;

fn textStructures(out: *Writer, v: *const View) !void {
    try header(out, "MEMORY BY STRUCTURE", 20, &structure_cols, col_width);
    for (std.enums.values(perf.Structure)) |st| {
        const i: usize = @backingInt(st);
        if (v.c.get(.reads, i) + v.c.get(.writes, i) + v.c.get(.allocs, i) == 0) continue;
        try out.print("{s:<20}", .{@tagName(st)});
        const cols = [_]u64{ v.c.get(.reads, i), v.c.get(.writes, i), v.c.get(.read_bytes, i), v.c.get(.write_bytes, i), v.c.get(.lines, i * 4), v.c.get(.lines, i * 4 + 1), v.c.get(.lines, i * 4 + 2), v.c.get(.lines, i * 4 + 3), v.c.get(.ws_st, i), v.c.get(.allocs, i), v.c.get(.alloc_bytes, i) };
        for (cols) |x| try dec(out, v.per(x), col_width);
        try dec(out, v.cyc(v.c.get(.st_cycles, i)), col_width);
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
}

fn textSites(out: *Writer, v: *const View) !void {
    try header(out, "MEMORY BY SITE", 20, &.{ "L1", "L2", "L3", "mem", "cycles" }, col_width);
    for (std.enums.values(perf.Site)) |site| {
        const i: usize = @backingInt(site);
        const cols = [_]u64{ v.c.get(.site_lines, i * 4), v.c.get(.site_lines, i * 4 + 1), v.c.get(.site_lines, i * 4 + 2), v.c.get(.site_lines, i * 4 + 3) };
        if (cols[0] + cols[1] + cols[2] + cols[3] == 0) continue;
        try out.print("{s:<20}", .{@tagName(site)});
        for (cols) |x| try dec(out, v.per(x), col_width);
        try dec(out, v.cyc(v.c.get(.site_cycles, i)), col_width);
        try out.print("  {s}{s}\n", .{ if (perf.dependent(site)) "dependent" else "direct", if (perf.ranged(site)) ", range" else "" });
    }
    try out.writeAll("\n");
}

/// The work of the core and the shell outside the interpreter, and the system calls.
fn textPhases(out: *Writer, v: *const View) !void {
    try header(out, "PHASES OUTSIDE THE INTERPRETER", 32, &.{ "count", "cycles", "share" }, col_width);
    for (std.enums.values(perf.Phase)) |ph| {
        const i: usize = @backingInt(ph);
        if (v.c.get(.phase_count, i) == 0) continue;
        try out.print("{s:<32}", .{@tagName(ph)});
        try dec(out, v.per(v.c.get(.phase_count, i)), col_width);
        try dec(out, v.cyc(v.c.get(.phase_cycles, i)), col_width);
        try out.splatByteAll(' ', col_width - 8);
        try percent(out, v.c.get(.phase_cycles, i), v.totalCycles());
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
    try header(out, "SYSTEM CALLS (model, a batch of one)", 36, &.{"count"}, col_width);
    for (std.enums.values(perf.Syscall)) |sc| {
        try out.print("{s:<36}", .{@tagName(sc)});
        try dec(out, v.per(v.c.get(.syscalls, @backingInt(sc))), col_width);
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
}

/// One line for the regression gate: counts that do not depend on the cost table.
fn writeGate(out: *Writer, v: *const View, name: []const u8) !void {
    const t = totalsOf(&v.c);
    try out.print("{s}", .{name});
    for ([_]u64{ t.instr, t.reads, t.writes, t.dep, t.lines }) |x| try dec(out, v.per(x), 12);
    try out.writeAll("\n");
}

fn textLoops(out: *Writer, v: *const View) !void {
    try out.writeAll("LOOPS OVER BYTES AND VALUES     calls     elements  form       cycles  vector saves\n");
    for (std.enums.values(perf.Loop)) |l| {
        const i: usize = @backingInt(l);
        const elems = v.c.get(.loop_elems, i);
        if (elems == 0) continue;
        const lc = perf.loopCost(l);
        try out.print("{s:<24}", .{@tagName(l)});
        try dec(out, v.per(v.c.get(.loop_calls, i)), 11);
        try dec(out, v.per(elems), 13);
        try out.print("  {s:<6}", .{if (lc.is_vector) "vector" else "scalar"});
        try dec(out, v.cyc(perf.loopCycles(l, elems)), 11);
        try dec(out, v.cyc(if (lc.is_vector) 0 else elems * (lc.scalar - lc.vector)), 14);
        try out.writeAll("\n");
    }
    try out.writeAll("\n");
}

fn textCandidates(out: *Writer, v: *const View) !void {
    var buf: [max_candidates]Candidate = @splat(.{ .saving = 0, .layer = "", .text = "" });
    try out.writeAll("TOP CANDIDATES (most cycles that each can save; they overlap)\n");
    for (candidates(&buf, v), 1..) |x, rank| {
        try out.print("{d:>2}.", .{rank});
        try dec(out, v.cyc(x.saving), 10);
        try percent(out, x.saving, v.totalCycles());
        try out.print("  [{s}] {s}\n", .{ x.layer, x.text });
    }
}

// ---- JSON ----------------------------------------------------------------------

fn jdec(out: *Writer, key: []const u8, x10: u64, last: bool) !void {
    try out.print("\"{s}\":{d}.{d}{s}", .{ key, x10 / 10, x10 % 10, if (last) "" else "," });
}

fn jsonTotals(out: *Writer, key: []const u8, t: Totals, v: *const View, div_first: bool) !void {
    const one: View = if (div_first) .{ .c = v.first, .div = 1, .first = v.first, .execs = 1, .m = v.m, .name = v.name, .o = v.o, .lines_max = 0, .pages_max = 0 } else v.*;
    try out.print("\"{s}\":{{", .{key});
    try jdec(out, "instructions", one.per(t.instr), false);
    try jdec(out, "reads", one.per(t.reads), false);
    try jdec(out, "writes", one.per(t.writes), false);
    try jdec(out, "read_bytes", one.per(t.read_bytes), false);
    try jdec(out, "write_bytes", one.per(t.write_bytes), false);
    try jdec(out, "dependent_loads", one.per(t.dep), false);
    try jdec(out, "branch_misses", one.per(t.branch_miss), false);
    try jdec(out, "ws_lines", one.per(t.lines), false);
    try jdec(out, "ws_pages", one.per(t.pages), false);
    try jdec(out, "cycles", one.cyc(t.cycles), true);
    try out.writeAll("},");
}

fn writeJson(out: *Writer, v: *const View) !void {
    const c = v.o.profile.cache;
    try out.print("{{\"module\":\"{s}\",\"executions\":{d},\"profile\":\"{s}\",\"clock_mhz\":{d},\"budget_cycles\":{d},", .{ v.name, v.execs, v.o.profile.name, v.o.profile.clock_mhz, v.o.profile.budgetCycles() });
    try out.writeAll("\"tlb\":{");
    try jdec(out, "small_l1_miss", v.per(misc(&v.c, .tlb_l1_miss)), false);
    try jdec(out, "small_walk", v.per(misc(&v.c, .tlb_walk)), false);
    try jdec(out, "huge_l1_miss", v.per(misc(&v.c, .huge_l1_miss)), false);
    try jdec(out, "huge_walk", v.per(misc(&v.c, .huge_walk)), true);
    try out.writeAll("},");
    try out.print("\"cache\":{{\"line\":{d},\"l1\":[{d},{d}],\"l2\":[{d},{d}],\"l3\":[{d},{d}],\"prefetch\":{}}},", .{ c.line_bytes, c.l1.bytes, c.l1.ways, c.l2.bytes, c.l2.ways, c.l3.bytes, c.l3.ways, c.next_line_prefetch });
    try jsonTotals(out, "steady", totalsOf(&v.c), v, false);
    try jsonTotals(out, "first", totalsOf(&v.first), v, true);
    try out.writeAll("\"phases\":{");
    for (std.enums.values(perf.Phase), 0..) |ph, i| try jdec(out, @tagName(ph), v.cyc(v.c.get(.phase_cycles, @backingInt(ph))), i + 1 == std.enums.values(perf.Phase).len);
    try out.writeAll("},\"syscalls\":{");
    for (std.enums.values(perf.Syscall), 0..) |sc, i| try jdec(out, @tagName(sc), v.per(v.c.get(.syscalls, @backingInt(sc))), i + 1 == std.enums.values(perf.Syscall).len);
    try out.writeAll("},\"causes\":{");
    for (std.enums.values(perf.Cause), 0..) |x, i| try jdec(out, @tagName(x), v.cyc(v.c.get(.cause, @backingInt(x))), i + 1 == perf.n_causes);
    try out.writeAll("},\"ops\":[");
    var rows: [max_rows]Row = @splat(.{ .key = 0, .weight = 0 });
    for (ranked(&rows, &v.c, .instr, .op_cycles), 0..) |r, i| {
        try out.print("{s}{{\"op\":\"{s}\",", .{ if (i == 0) "" else ",", opName(@intCast(r.key)) });
        try jdec(out, "count", v.per(v.c.get(.instr, r.key)), false);
        try jdec(out, "bails", v.per(v.c.get(.bails, r.key)), false);
        try jdec(out, "cycles", v.cyc(r.weight), true);
        try out.writeAll("}");
    }
    try out.writeAll("],\"natives\":[");
    for (ranked(&rows, &v.c, .native_calls, .native_cycles), 0..) |r, i| {
        try out.print("{s}{{\"name\":\"{s}\",", .{ if (i == 0) "" else ",", nativeName(v, r.key) });
        try jdec(out, "calls", v.per(v.c.get(.native_calls, r.key)), false);
        try jdec(out, "mem_cycles", v.cyc(r.weight), true);
        try out.writeAll("}");
    }
    try out.writeAll("],");
    try jsonMemory(out, v);
    try jsonAdvice(out, v);
}

fn jsonMemory(out: *Writer, v: *const View) !void {
    const names = [_][]const u8{ "reads", "writes", "read_bytes", "write_bytes", "l1", "l2", "l3", "mem", "lines", "allocs", "alloc_bytes" };
    try out.writeAll("\"structures\":[");
    var first = true;
    for (std.enums.values(perf.Structure)) |st| {
        const i: usize = @backingInt(st);
        if (v.c.get(.reads, i) + v.c.get(.writes, i) + v.c.get(.allocs, i) == 0) continue;
        try out.print("{s}{{\"structure\":\"{s}\",", .{ if (first) "" else ",", @tagName(st) });
        first = false;
        const cols = [_]u64{ v.c.get(.reads, i), v.c.get(.writes, i), v.c.get(.read_bytes, i), v.c.get(.write_bytes, i), v.c.get(.lines, i * 4), v.c.get(.lines, i * 4 + 1), v.c.get(.lines, i * 4 + 2), v.c.get(.lines, i * 4 + 3), v.c.get(.ws_st, i), v.c.get(.allocs, i), v.c.get(.alloc_bytes, i) };
        for (cols, names) |x, name| try jdec(out, name, v.per(x), false);
        try jdec(out, "cycles", v.cyc(v.c.get(.st_cycles, i)), true);
        try out.writeAll("}");
    }
    try out.writeAll("],\"sites\":[");
    first = true;
    for (std.enums.values(perf.Site)) |site| {
        const i: usize = @backingInt(site);
        const cols = [_]u64{ v.c.get(.site_lines, i * 4), v.c.get(.site_lines, i * 4 + 1), v.c.get(.site_lines, i * 4 + 2), v.c.get(.site_lines, i * 4 + 3) };
        if (cols[0] + cols[1] + cols[2] + cols[3] == 0) continue;
        try out.print("{s}{{\"site\":\"{s}\",\"dependent\":{},\"range\":{},", .{ if (first) "" else ",", @tagName(site), perf.dependent(site), perf.ranged(site) });
        first = false;
        for (cols, names[4..8]) |x, name| try jdec(out, name, v.per(x), false);
        try jdec(out, "cycles", v.cyc(v.c.get(.site_cycles, i)), true);
        try out.writeAll("}");
    }
    try out.writeAll("],");
}

fn jsonAdvice(out: *Writer, v: *const View) !void {
    try out.writeAll("\"loops\":[");
    var first = true;
    for (std.enums.values(perf.Loop)) |l| {
        const i: usize = @backingInt(l);
        const elems = v.c.get(.loop_elems, i);
        if (elems == 0) continue;
        const lc = perf.loopCost(l);
        try out.print("{s}{{\"loop\":\"{s}\",\"vector\":{},", .{ if (first) "" else ",", @tagName(l), lc.is_vector });
        first = false;
        try jdec(out, "calls", v.per(v.c.get(.loop_calls, i)), false);
        try jdec(out, "elements", v.per(elems), false);
        try jdec(out, "cycles", v.cyc(perf.loopCycles(l, elems)), false);
        try jdec(out, "vector_saves", v.cyc(if (lc.is_vector) 0 else elems * (lc.scalar - lc.vector)), true);
        try out.writeAll("}");
    }
    try out.writeAll("],\"candidates\":[");
    var buf: [max_candidates]Candidate = @splat(.{ .saving = 0, .layer = "", .text = "" });
    for (candidates(&buf, v), 0..) |x, i| {
        try out.print("{s}{{\"layer\":\"{s}\",\"change\":\"{s}\",", .{ if (i == 0) "" else ",", x.layer, x.text });
        try jdec(out, "saving_cycles", v.cyc(x.saving), true);
        try out.writeAll("}");
    }
    try out.writeAll("]}\n");
}
