//! The bytecode interpreter. All execution state lives in the execution's
//! region: the exec root, the fibre table, frames and register stacks. An
//! instruction either completes or fails before it changes any state, so a
//! full region can be grown and the instruction run again.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const ops = @import("ops.zig");
const lib = @import("lib.zig");
const numfmt = @import("numfmt.zig");
const module = @import("module.zig");
const aot = @import("aot.zig");
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;
const Op = module.Op;
const Instr = module.Instr;
const Fibre = heap.Fibre;
const Frame = heap.Frame;

pub const Limits = struct {
    call_depth: u32 = 256,
    fibres: u32 = 64,
    fuel_total: u64 = 50_000_000,
    /// Run the compiled form of a function when the module has one
    /// (`aot.zig`). The results, the region and the fuel are the same.
    aot: bool = true,
};

pub const EffectReq = struct {
    fibre: u32,
    seq: u32,
    kind: module.EffectKind,
    step: u32,
    occurrence: u32,
    args: Value,
};

/// A ctx.trace call of an execution with tracing on. `name` is a string.
pub const TraceReq = struct { name: Value, items: Value };

pub const Outcome = union(enum) {
    effect: EffectReq,
    /// The instruction is complete; call `run` again to continue.
    trace: TraceReq,
    /// No runnable fibre: every live fibre waits on an effect.
    idle,
    done,
    failed,
    fuel_out,
    region_full,
    limit: ops.Vm.LimitReason,
};

/// Build the exec root and fibre 0 for a new execution. The trigger is set
/// separately with `setTrigger`, after it has been decoded into the region.
pub fn initExec(r: *heap.Region, m: *const module.Module, exec_id: u64, seed: u64) heap.Error!void {
    std.debug.assert(r.used == 0);
    const root = try r.alloc(.exec, @sizeOf(heap.Exec));
    std.debug.assert(root == 0);
    const fibres = try r.alloc(.fibres, @sizeOf(heap.Hdr) + 2 * @sizeOf(Fibre));
    const occ = try r.newBytes(@intCast(@max(4, m.steps.len * 4)));
    const f0 = m.funcs[0];
    const frames = try r.newFrames(8);
    const regs_cap: u32 = @max(32, f0.nregs);
    const regs = try r.newVals(regs_cap);
    const e = r.at(heap.Exec, 0);
    e.* = .{
        .hdr = r.hdr(0).*,
        .magic = heap.exec_magic,
        .status = .ready,
        .exec_id = exec_id,
        .module_hash_prefix = std.mem.readInt(u64, m.hash[0..8], .little),
        .prng = seed,
        .fuel_used = 0,
        .fibres = fibres,
        .nfibres = 1,
        .fibres_cap = 2,
        .occ = occ,
        .nsteps = @intCast(m.steps.len),
        .next_effect = 0,
        .attention_fibre = 0,
        .attention_step = 0,
        .result = value.undef,
        .trigger = value.undef,
        .flags = 0,
        ._pad = 0,
        .vars = value.undef,
        .static_start = value.undef,
        .static_doc = value.undef,
    };
    const tab = fibreSlots(r);
    tab[1] = std.mem.zeroes(Fibre);
    tab[0] = .{
        .state = .runnable,
        .frames = frames,
        .nframes = 1,
        .frames_cap = 8,
        .regs = regs,
        .regs_top = f0.nregs,
        .regs_cap = regs_cap,
        .wait_effect = 0,
        .result = value.undef,
        .join = value.undef,
    };
    r.framesOf(&tab[0])[0] = .{ .func = 0, .pc = 0, .base = 0, .ret_reg = 0, .closure = value.undef };
}

pub fn setTrigger(r: *heap.Region, trigger: Value) void {
    r.exec().trigger = trigger;
    const f0 = &fibreSlots(r)[0];
    r.regsOf(f0)[0] = trigger;
}

/// The whole fibre table, including unused capacity.
fn fibreSlots(r: *const heap.Region) []Fibre {
    const e = r.at(heap.Exec, 0);
    const p: [*]Fibre = @ptrCast(@alignCast(r.buf.ptr + e.fibres + @sizeOf(heap.Hdr)));
    return p[0..e.fibres_cap];
}

fn fib(vm: *Vm, fi: u32) *Fibre {
    std.debug.assert(fi < vm.r.exec().nfibres);
    return &fibreSlots(vm.r)[fi];
}

fn topFrame(vm: *Vm, f: *const Fibre) *Frame {
    std.debug.assert(f.nframes > 0);
    return &vm.r.framesOf(f)[f.nframes - 1];
}

fn window(vm: *Vm, f: *const Fibre, fr: *const Frame) []Value {
    const n = vm.m.funcs[fr.func].nregs;
    return vm.r.regsOf(f)[fr.base..][0..n];
}

// ---- scheduling -----------------------------------------------------------

/// Run runnable fibres in index order until something needs the core.
pub fn run(vm: *Vm, now_ms: f64, fuel: *u64, limits: Limits) Outcome {
    while (true) {
        switch (fib(vm, 0).state) {
            .done => return .done,
            .failed => return .failed,
            else => {},
        }
        const fi = pickRunnable(vm) orelse return .idle;
        const out = runFibre(vm, fi, now_ms, fuel, limits);
        switch (out) {
            .fibre_done => {
                if (fi == 0) return if (fib(vm, 0).state == .failed) .failed else .done;
                wakeJoiners(vm);
            },
            .parked => {},
            .outcome => |o| return o,
        }
    }
}

fn pickRunnable(vm: *Vm) ?u32 {
    const n = vm.r.exec().nfibres;
    var i: u32 = 0;
    while (i < n) : (i += 1) if (fib(vm, i).state == .runnable) return i;
    return null;
}

fn wakeJoiners(vm: *Vm) void {
    const n = vm.r.exec().nfibres;
    var i: u32 = 0;
    while (i < n) : (i += 1) {
        const f = fib(vm, i);
        if (f.state == .parked_join) f.state = .runnable;
    }
}

const FibreOut = union(enum) { fibre_done, parked, outcome: Outcome };

fn runFibre(vm: *Vm, fi: u32, now_ms: f64, fuel: *u64, limits: Limits) FibreOut {
    while (true) {
        if (fuel.* == 0) return .{ .outcome = .fuel_out };
        const e = vm.r.exec();
        if (e.fuel_used >= limits.fuel_total) return .{ .outcome = .{ .limit = .fuel } };
        const f = fib(vm, fi);
        const fr = topFrame(vm, f);
        // Simple instructions run in `fastRun` with the frame, its code and
        // its registers in locals. It stops before the first other one,
        // which `step` runs; after it the frame can be another one. A
        // function with a compiled form runs that instead; it can also run
        // the instruction where it stops, and then gives its result here.
        const budget = @min(fuel.*, limits.fuel_total - e.fuel_used);
        var pending: ?Err!Flow = null;
        const done = if (limits.aot and fr.func < vm.m.aot.len and vm.m.aot[fr.func] != module.no_aot) blk: {
            const win = window(vm, f, fr);
            var cx: aot.Cx = .{ .vm = vm, .fi = fi, .fr = fr, .win = win, .R = win.ptr, .code = vm.m.funcCode(fr.func), .budget = budget, .now_ms = now_ms, .limits = limits };
            aot.run(vm.m.aot[fr.func], &cx);
            pending = cx.pending;
            break :blk cx.n;
        } else fastRun(vm, fr, f, budget);
        fuel.* -= done;
        e.fuel_used += done;
        if (done == budget and pending == null) continue;
        const flow = (pending orelse step(vm, fi, vm.m.funcCode(fr.func)[fr.pc], now_ms, limits)) catch |err| switch (err) {
            error.RegionFull => return .{ .outcome = .region_full },
            error.ArenaFull => return .{ .outcome = .{ .limit = .memory } },
            error.Limit => return .{ .outcome = .{ .limit = vm.limit_reason } },
            error.Throw => blk: {
                if (unwind(vm, fi, vm.thrown)) break :blk @as(Flow, .jumped);
                break :blk @as(Flow, .fibre_done);
            },
        };
        fuel.* -= 1;
        vm.r.exec().fuel_used += 1;
        if (vm.charged > 0) {
            fuel.* -= @min(vm.charged, fuel.*);
            vm.r.exec().fuel_used +|= vm.charged;
            vm.charged = 0;
        }
        switch (flow) {
            .next => topFrame(vm, fib(vm, fi)).pc += 1,
            .jumped, .called => {},
            .fibre_done => return .fibre_done,
            .parked => return .parked,
            .effect => |req| return .{ .outcome = .{ .effect = req } },
            .trace => |req| {
                topFrame(vm, fib(vm, fi)).pc += 1;
                return .{ .outcome = .{ .trace = req } };
            },
        }
    }
}

/// Run the instructions that cannot fail, allocate, call or leave the frame,
/// at most `budget` of them, and stop before any other one. Each costs one
/// unit of fuel, as in `step`. Returns how many ran; `fr.pc` is the next one.
fn fastRun(vm: *Vm, fr: *Frame, f: *const Fibre, budget: u64) u64 {
    const code = vm.m.funcCode(fr.func);
    const R = window(vm, f, fr);
    var pc = fr.pc;
    var n: u64 = 0;
    defer fr.pc = pc;
    while (n < budget) : (n += 1) {
        const ins = code[pc];
        const op: Op = @fromBackingInt(@intCast(ins.op));
        switch (op) {
            .nop => {},
            .mov => R[ins.a] = R[ins.b],
            .loadk => R[ins.a] = value.num(vm.m.numbers[ins.bc()]),
            .loads => R[ins.a] = value.constString(ins.bc()),
            .loadi => R[ins.a] = value.num(@floatFromInt(@as(i32, @bitCast(ins.bc())))),
            .loadundef => R[ins.a] = value.undef,
            .loadnull => R[ins.a] = value.null_,
            .loadbool => R[ins.a] = value.boolean(ins.x != 0),
            .add, .sub, .mul, .mod, .lt, .le, .gt, .ge => {
                const x = R[ins.b];
                const y = R[ins.c];
                if (value.kindOf(x) != .number or value.kindOf(y) != .number) return n;
                const a = value.asNum(x);
                const b = value.asNum(y);
                R[ins.a] = switch (op) {
                    .add => value.num(a + b),
                    .sub => value.num(a - b),
                    .mul => value.num(a * b),
                    .mod => value.num(jsMod(a, b)),
                    .lt => value.boolean(a < b),
                    .le => value.boolean(a <= b),
                    .gt => value.boolean(a > b),
                    .ge => value.boolean(a >= b),
                    else => unreachable, // The outer prong lists these only.
                };
            },
            .seq => R[ins.a] = value.boolean(vm.strictEquals(R[ins.b], R[ins.c])),
            .sne => R[ins.a] = value.boolean(!vm.strictEquals(R[ins.b], R[ins.c])),
            .not => R[ins.a] = value.boolean(!vm.truthy(R[ins.b])),
            .isnullish => R[ins.a] = value.boolean(value.isNullish(R[ins.b])),
            .jmp => {
                pc = ins.bc();
                continue;
            },
            .jt, .jf, .jnullish => {
                const v = R[ins.a];
                const taken = switch (op) {
                    .jt => vm.truthy(v),
                    .jf => !vm.truthy(v),
                    .jnullish => value.isNullish(v),
                    else => unreachable, // The outer prong lists these only.
                };
                if (taken) {
                    pc = ins.bc();
                    continue;
                }
            },
            .getprop => {
                const o = R[ins.b];
                if (value.kindOf(o) != .object) return n;
                const off = value.payload(o);
                R[ins.a] = if (vm.objFindValue(off, value.constString(ins.c))) |i| vm.r.objEntries(off)[i * 2 + 1] else value.undef;
            },
            // Allocations: a full region leaves nothing changed, and `step`
            // runs the instruction again and reports it.
            .setprop => {
                const o = R[ins.a];
                if (value.kindOf(o) != .object) return n;
                vm.objSet(value.payload(o), value.constString(ins.b), R[ins.c]) catch return n;
            },
            .newobj => R[ins.a] = vm.r.newObject(4) catch return n,
            .newarr => R[ins.a] = vm.r.newArray(4) catch return n,
            .push => {
                if (value.kindOf(R[ins.a]) != .array) return n;
                vm.r.arrPush(value.payload(R[ins.a]), R[ins.b]) catch return n;
            },
            .getelem => {
                const arr = R[ins.b];
                const k = R[ins.c];
                if (value.kindOf(arr) != .array or value.kindOf(k) != .number) return n;
                const x = value.asNum(k);
                if (!(x >= 0 and x == @trunc(x) and x < 4294967295)) return n;
                R[ins.a] = vm.arrGet(arr, @intFromFloat(x));
            },
            else => return n,
        }
        pc += 1;
    }
    return n;
}

/// A native call costs about one instruction for each 64 units of work:
/// the string and array lengths it reads, and the bytes it writes.
fn chargeNative(vm: *Vm, region_before: u32, inputs: []const Value) void {
    var work: u64 = vm.r.used -| region_before;
    for (inputs) |v| work += switch (value.kindOf(v)) {
        .string => vm.utf16Len(v),
        .array => vm.r.arrItems(value.payload(v)).len,
        else => 0,
    };
    vm.charge(work / 64);
}

pub const Flow = union(enum) { next, jumped, called, fibre_done, parked, effect: EffectReq, trace: TraceReq };

// ---- instructions -----------------------------------------------------------

pub fn step(vm: *Vm, fi: u32, ins: Instr, now_ms: f64, limits: Limits) Err!Flow {
    const f = fib(vm, fi);
    const fr = topFrame(vm, f);
    return stepIn(vm, fi, fr, window(vm, f, fr), null, ins, now_ms, limits);
}

/// The body of `step`, for frame `fr` of fibre `fi` with register window
/// `R`. With a comptime `known` opcode only that instruction's code is
/// compiled: the compiled functions (`aot.zig`) call it that way.
pub inline fn stepIn(vm: *Vm, fi: u32, fr: *Frame, R: []Value, comptime known: ?Op, ins: Instr, now_ms: f64, limits: Limits) Err!Flow {
    const op: Op = known orelse @fromBackingInt(@intCast(ins.op));
    switch (op) {
        .nop => {},
        .loadk => R[ins.a] = value.num(vm.m.numbers[ins.bc()]),
        .loads => R[ins.a] = value.constString(ins.bc()),
        .loadi => R[ins.a] = value.num(@floatFromInt(@as(i32, @bitCast(ins.bc())))),
        .loadundef => R[ins.a] = value.undef,
        .loadnull => R[ins.a] = value.null_,
        .loadbool => R[ins.a] = value.boolean(ins.x != 0),
        .mov => R[ins.a] = R[ins.b],
        .add => R[ins.a] = try vm.add(R[ins.b], R[ins.c]),
        .sub, .mul, .div, .mod, .pow => R[ins.a] = value.num(arith(op, try vm.toNumber(R[ins.b]), try vm.toNumber(R[ins.c]))),
        .band, .bor, .bxor, .shl, .shr, .ushr => R[ins.a] = value.num(bitwise(op, try vm.toNumber(R[ins.b]), try vm.toNumber(R[ins.c]))),
        .neg => R[ins.a] = value.num(-(try vm.toNumber(R[ins.b]))),
        .tonum => R[ins.a] = value.num(try vm.toNumber(R[ins.b])),
        .bnot => R[ins.a] = value.num(@floatFromInt(~numfmt.toInt32(try vm.toNumber(R[ins.b])))),
        .not => R[ins.a] = value.boolean(!vm.truthy(R[ins.b])),
        .typeof => R[ins.a] = try vm.newStr(vm.typeOf(R[ins.b])),
        .tostr => R[ins.a] = try vm.toStr(R[ins.b]),
        .seq => R[ins.a] = value.boolean(vm.strictEquals(R[ins.b], R[ins.c])),
        .sne => R[ins.a] = value.boolean(!vm.strictEquals(R[ins.b], R[ins.c])),
        .lt, .le, .gt, .ge => R[ins.a] = value.boolean(relational(op, try vm.compare(R[ins.b], R[ins.c]))),
        .isnullish => R[ins.a] = value.boolean(value.isNullish(R[ins.b])),
        .jmp => return jumpTo(vm, fi, ins.bc()),
        .jt => if (vm.truthy(R[ins.a])) return jumpTo(vm, fi, ins.bc()),
        .jf => if (!vm.truthy(R[ins.a])) return jumpTo(vm, fi, ins.bc()),
        .jnullish => if (value.isNullish(R[ins.a])) return jumpTo(vm, fi, ins.bc()),
        .newobj => R[ins.a] = try vm.r.newObject(4),
        .newarr => R[ins.a] = try vm.r.newArray(4),
        .getprop => R[ins.a] = if (value.kindOf(R[ins.b]) == .object) blk: {
            const off = value.payload(R[ins.b]);
            const i = vm.objFindValue(off, value.constString(ins.c)) orelse break :blk value.undef;
            break :blk vm.r.objEntries(off)[i * 2 + 1];
        } else try vm.getProp(R[ins.b], vm.m.str(ins.c)),
        .setprop => try setProp(vm, R[ins.a], ins.b, R[ins.c]),
        .getelem => R[ins.a] = try vm.getElem(R[ins.b], R[ins.c]),
        .setelem => try vm.setElem(R[ins.a], R[ins.b], R[ins.c]),
        .delprop => try delProp(vm, R[ins.a], R[ins.b]),
        .hasprop => R[ins.a] = value.boolean(try vm.hasProp(R[ins.b], R[ins.c])),
        .push => try pushTo(vm, R[ins.a], R[ins.b]),
        .spreadarr => try spreadArr(vm, R[ins.a], R[ins.b]),
        .spreadobj => if (value.kindOf(R[ins.a]) == .object) try lib.spreadObject(vm, R[ins.a], R[ins.b]),
        .closure => {
            const ncaps = vm.m.funcs[ins.b].ncaps;
            R[ins.a] = try vm.r.newClosure(ins.b, if (ncaps == 0) &.{} else R[ins.c..][0..ncaps]);
        },
        .getcap => {
            // A frame without a closure has no captures; the verifier makes
            // this impossible, and this keeps a bad module from reading the
            // execution root as one.
            if (value.kindOf(fr.closure) != .ref or vm.r.hdr(value.payload(fr.closure)).kind != .closure) return vm.throwMsg(.type_error, "no captures here", .{});
            const caps = vm.r.closureCaps(value.payload(fr.closure));
            if (ins.b >= caps.len) return vm.throwMsg(.type_error, "no capture {d}", .{ins.b});
            R[ins.a] = caps[ins.b];
        },
        .newcell => R[ins.a] = try vm.r.newCell(R[ins.b]),
        .getcell => R[ins.a] = vm.r.at(heap.Cell, try cellOff(vm, R[ins.b])).value,
        .setcell => vm.r.at(heap.Cell, try cellOff(vm, R[ins.a])).value = R[ins.b],
        .call => return call(vm, fi, ins, limits),
        .callm => {
            const before = vm.r.used;
            R[ins.a] = try lib.callMethod(vm, vm.m.natives[ins.b], R[ins.c], R[ins.c + 1 ..][0..ins.x]);
            chargeNative(vm, before, R[ins.c..][0 .. ins.x + 1]);
        },
        .calln => {
            const before = vm.r.used;
            const args: []const Value = if (ins.x == 0) &.{} else R[ins.c..][0..ins.x];
            R[ins.a] = try lib.callNative(vm, vm.m.natives[ins.b], args);
            chargeNative(vm, before, args);
        },
        .ret => return ret(vm, fi, R[ins.a]),
        .throw => {
            vm.thrown = R[ins.a];
            return error.Throw;
        },
        .newerr => {
            const msg = if (value.kindOf(R[ins.b]) == .undefined) try vm.newStr("") else try vm.toStr(R[ins.b]);
            const kind: ops.ErrKind = if (ins.x <= 2) @fromBackingInt(@intCast(ins.x)) else .@"error";
            R[ins.a] = try vm.makeError(kind, msg);
        },
        .@"suspend" => return suspendOn(vm, fi, ins, R),
        .fork => return fork(vm, fi, ins, limits),
        .join => return join(vm, fi, ins),
        .now => R[ins.a] = value.num(now_ms),
        .random => R[ins.a] = value.num(nextRandom(&vm.r.exec().prng)),
        .exec_info => R[ins.a] = try execInfo(vm),
        .vars => {
            const v = vm.r.exec().vars;
            // A fresh object for each call, as the reference runner gives.
            R[ins.a] = if (value.kindOf(v) == .string) @import("json.zig").decode(vm, vm.str(v)) catch |e| switch (e) {
                error.RegionFull => return error.RegionFull,
                else => try vm.r.newObject(0),
            } else try vm.r.newObject(0);
        },
        .trace => {
            // Without tracing the call costs one instruction.
            if (vm.r.exec().flags & heap.exec_flag_trace == 0) return .next;
            const name = if (value.kindOf(R[ins.a]) == .string) R[ins.a] else try vm.toStr(R[ins.a]);
            return .{ .trace = .{ .name = name, .items = R[ins.b] } };
        },
        _ => unreachable, // The verifier rejects unknown opcodes.
    }
    return .next;
}

/// `{ id, mode, resumeUrl, resumeFormUrl }` (spec 9.5). `mode` is n8n's
/// `$execution.mode`: `test` for a manual run, else `production`.
fn execInfo(vm: *Vm) Err!Value {
    const e = vm.r.exec();
    var idb: [32]u8 = undefined;
    const id = heap.formatExecId(e.exec_id, &idb);
    var ub: [ops.max_url]u8 = undefined;
    var fb: [ops.max_url]u8 = undefined;
    var sb: [32]u8 = undefined;
    const sig = if (vm.env.secret) |k| heap.resumeSignature(k, e.exec_id, &sb) else "";
    const q = if (sig.len > 0) "?signature=" else "";
    const url = std.fmt.bufPrint(&ub, "{s}/{s}{s}{s}", .{ vm.env.resume_base, id, q, sig }) catch return vm.throwMsg(.range_error, "resume URL too long", .{});
    const form = std.fmt.bufPrint(&fb, "{s}/{s}{s}{s}", .{ vm.env.form_base, id, q, sig }) catch return vm.throwMsg(.range_error, "resume URL too long", .{});
    const o = try vm.r.newObject(4);
    try vm.objSet(value.payload(o), try vm.newStr("id"), try vm.newStr(id));
    try vm.objSet(value.payload(o), try vm.newStr("mode"), try vm.newStr(if (e.flags & heap.exec_flag_manual != 0) "test" else "production"));
    try vm.objSet(value.payload(o), try vm.newStr("resumeUrl"), try vm.newStr(url));
    try vm.objSet(value.payload(o), try vm.newStr("resumeFormUrl"), try vm.newStr(form));
    return o;
}

fn jumpTo(vm: *Vm, fi: u32, target: u32) Flow {
    topFrame(vm, fib(vm, fi)).pc = target;
    return .jumped;
}

fn arith(op: Op, x: f64, y: f64) f64 {
    return switch (op) {
        .sub => x - y,
        .mul => x * y,
        .div => x / y,
        .mod => jsMod(x, y),
        .pow => std.math.pow(f64, x, y),
        else => unreachable, // Called only for the arithmetic opcodes.
    };
}

pub fn jsMod(x: f64, y: f64) f64 {
    if (std.math.isNan(x) or std.math.isNan(y) or std.math.isInf(x) or y == 0) return std.math.nan(f64);
    if (std.math.isInf(y) or x == 0) return x;
    // Whole numbers in the safe range: an integer remainder, much cheaper
    // than fmod. The sign follows the dividend; -0 when it is negative.
    const safe = 9007199254740991.0;
    if (@abs(x) <= safe and @abs(y) <= safe and x == @trunc(x) and y == @trunc(y)) {
        const r = @rem(@as(i64, @intFromFloat(x)), @as(i64, @intFromFloat(y)));
        if (r == 0 and x < 0) return -0.0;
        return @floatFromInt(r);
    }
    return @rem(x, y);
}

fn bitwise(op: Op, x: f64, y: f64) f64 {
    const a = numfmt.toInt32(x);
    const b = numfmt.toInt32(y);
    const sh: u5 = @intCast(@as(u32, @bitCast(b)) & 31);
    return switch (op) {
        .band => @floatFromInt(a & b),
        .bor => @floatFromInt(a | b),
        .bxor => @floatFromInt(a ^ b),
        .shl => @floatFromInt(@as(i32, @bitCast(@as(u32, @bitCast(a)) << sh))),
        .shr => @floatFromInt(a >> sh),
        .ushr => @floatFromInt(@as(u32, @bitCast(a)) >> sh),
        else => unreachable, // Called only for the bitwise opcodes.
    };
}

fn relational(op: Op, o: ops.Vm.Order) bool {
    return switch (op) {
        .lt => o == .lt,
        .le => o == .lt or o == .eq,
        .gt => o == .gt,
        .ge => o == .gt or o == .eq,
        else => unreachable, // Called only for the relational opcodes.
    };
}

fn setProp(vm: *Vm, obj: Value, key_idx: u16, v: Value) Err!void {
    switch (value.kindOf(obj)) {
        .object => try vm.objSet(value.payload(obj), value.constString(key_idx), v),
        .array => try vm.setElem(obj, value.constString(key_idx), v),
        .undefined, .null => return vm.throwMsg(.type_error, "Cannot set properties of {s} (setting '{s}')", .{ if (value.kindOf(obj) == .null) "null" else "undefined", vm.m.str(key_idx) }),
        else => {},
    }
}

fn delProp(vm: *Vm, obj: Value, key: Value) Err!void {
    if (value.kindOf(obj) != .object) return;
    const k = try vm.toStr(key);
    vm.objDelete(value.payload(obj), vm.str(k));
}

fn pushTo(vm: *Vm, arr: Value, v: Value) Err!void {
    if (value.kindOf(arr) != .array) return vm.throwMsg(.type_error, "push target is not an array", .{});
    try vm.r.arrPush(value.payload(arr), v);
}

fn spreadArr(vm: *Vm, dst: Value, src: Value) Err!void {
    if (value.kindOf(dst) != .array) return vm.throwMsg(.type_error, "spread target is not an array", .{});
    if (value.kindOf(src) != .array) return vm.throwMsg(.type_error, "value is not iterable", .{});
    const n: u32 = @intCast(vm.r.arrItems(value.payload(src)).len);
    try vm.r.arrReserve(value.payload(dst), n);
    var i: u32 = 0;
    while (i < n) : (i += 1) vm.r.arrPush(value.payload(dst), vm.r.arrItems(value.payload(src))[i]) catch unreachable; // Reserved above.
}

fn cellOff(vm: *Vm, v: Value) Err!u32 {
    if (value.kindOf(v) != .ref or vm.r.hdr(value.payload(v)).kind != .cell) return vm.throwMsg(.type_error, "value is not a cell", .{});
    return value.payload(v);
}

pub fn nextRandom(state: *u64) f64 {
    state.* +%= 0x9E3779B97F4A7C15;
    var z = state.*;
    z = (z ^ (z >> 30)) *% 0xBF58476D1CE4E5B9;
    z = (z ^ (z >> 27)) *% 0x94D049BB133111EB;
    z ^= z >> 31;
    return @as(f64, @floatFromInt(z >> 11)) * (1.0 / 9007199254740992.0);
}

// ---- calls ------------------------------------------------------------------

/// Make room for one more frame and `need` registers. Allocates before it
/// changes the fibre, so a failure leaves the fibre as it was.
fn ensureFrameRoom(vm: *Vm, fi: u32, need_regs: u32) Err!void {
    const f = fib(vm, fi);
    var new_frames: ?u32 = null;
    var new_regs: ?u32 = null;
    const frames_cap = f.frames_cap;
    const regs_cap = f.regs_cap;
    if (f.nframes == frames_cap) {
        new_frames = try vm.r.newFrames(frames_cap * 2);
    }
    if (need_regs > regs_cap) {
        new_regs = try vm.r.newVals(@max(need_regs, regs_cap * 2));
    }
    const f2 = fib(vm, fi);
    if (new_frames) |nf| {
        const dst: [*]Frame = @ptrCast(@alignCast(vm.r.buf.ptr + nf + @sizeOf(heap.Hdr)));
        @memcpy(dst[0..f2.nframes], vm.r.framesOf(f2));
        f2.frames = nf;
        f2.frames_cap = frames_cap * 2;
    }
    if (new_regs) |nr| {
        const cap = vm.r.valsCap(nr);
        @memcpy(vm.r.valsAt(nr, cap)[0..f2.regs_top], vm.r.regsOf(f2)[0..f2.regs_top]);
        f2.regs = nr;
        f2.regs_cap = cap;
    }
}

fn call(vm: *Vm, fi: u32, ins: Instr, limits: Limits) Err!Flow {
    const f = fib(vm, fi);
    const fr = topFrame(vm, f);
    const callee = window(vm, f, fr)[ins.b];
    if (value.kindOf(callee) != .ref or vm.r.hdr(value.payload(callee)).kind != .closure) {
        return vm.throwMsg(.type_error, "value is not a function", .{});
    }
    if (f.nframes >= limits.call_depth) return vm.limit(.depth);
    const func = vm.r.at(heap.Closure, value.payload(callee)).func;
    const fe = vm.m.funcs[func];
    const base = fr.base + vm.m.funcs[fr.func].nregs;
    try ensureFrameRoom(vm, fi, base + fe.nregs);
    const f2 = fib(vm, fi);
    const caller = topFrame(vm, f2).*;
    const regs = vm.r.regsOf(f2);
    const win = regs[base..][0..fe.nregs];
    // Registers above `regs_top` are always undefined: new blocks start so,
    // and `popFrame` clears what it pops. So the callee's window needs no
    // clearing.
    if (@import("builtin").mode == .debug) for (win) |v| std.debug.assert(v == value.undef);
    const nargs = @min(ins.x, fe.nparams);
    @memcpy(win[0..nargs], regs[caller.base + ins.c ..][0..nargs]);
    f2.regs_top = base + fe.nregs;
    vm.r.framesOf(f2).ptr[f2.nframes] = .{ .func = func, .pc = 0, .base = base, .ret_reg = ins.a, .closure = callee };
    f2.nframes += 1;
    return .called;
}

fn popFrame(vm: *Vm, f: *Fibre) void {
    const fr = topFrame(vm, f);
    @memset(vm.r.regsOf(f)[fr.base..f.regs_top], value.undef);
    f.regs_top = fr.base;
    // Compaction scans popped frames too; drop the closure they keep.
    fr.closure = value.undef;
    f.nframes -= 1;
}

fn ret(vm: *Vm, fi: u32, v: Value) Flow {
    const f = fib(vm, fi);
    popFrame(vm, f);
    if (f.nframes == 0) {
        f.state = .done;
        f.result = v;
        if (fi == 0) vm.r.exec().result = v;
        return .fibre_done;
    }
    const caller = topFrame(vm, f);
    const call_ins = vm.m.funcCode(caller.func)[caller.pc];
    std.debug.assert(call_ins.op == @backingInt(Op.call));
    f.regs_top = caller.base + vm.m.funcs[caller.func].nregs;
    window(vm, f, caller)[call_ins.a] = v;
    caller.pc += 1;
    return .jumped;
}

/// Find a handler for `err` in the fibre's frames. Returns false when the
/// fibre has none; the fibre is then marked failed.
pub fn unwind(vm: *Vm, fi: u32, err: Value) bool {
    const f = fib(vm, fi);
    while (f.nframes > 0) {
        const fr = topFrame(vm, f);
        for (vm.m.funcTries(fr.func)) |t| {
            if (fr.pc >= t.start and fr.pc < t.end) {
                window(vm, f, fr)[t.catch_reg] = err;
                fr.pc = t.handler;
                f.state = .runnable;
                return true;
            }
        }
        popFrame(vm, f);
    }
    f.state = .failed;
    f.result = err;
    if (fi == 0) vm.r.exec().result = err;
    return false;
}

/// True when the fibre's current position is inside a try region in any
/// frame, so an effect failure can be thrown at the await.
pub fn inTry(vm: *Vm, fi: u32) bool {
    const f = fib(vm, fi);
    for (vm.r.framesOf(f)) |fr| {
        for (vm.m.funcTries(fr.func)) |t| if (fr.pc >= t.start and fr.pc < t.end) return true;
    }
    return false;
}

// ---- effects and fibres -------------------------------------------------------

fn suspendOn(vm: *Vm, fi: u32, ins: Instr, R: []Value) Err!Flow {
    const step_v = R[ins.b];
    const e = vm.r.exec();
    if (value.kindOf(step_v) != .number) return vm.throwMsg(.type_error, "step index is not a number", .{});
    const sf = value.asNum(step_v);
    if (!(sf >= 0 and sf < @as(f64, @floatFromInt(e.nsteps)))) return vm.throwMsg(.range_error, "step index out of range", .{});
    const s: u32 = @intFromFloat(sf);
    const occ = vm.r.u32sAt(e.occ, e.nsteps);
    const occurrence = occ[s];
    occ[s] += 1;
    const seq = e.next_effect;
    e.next_effect += 1;
    const f = fib(vm, fi);
    f.state = .parked_effect;
    f.wait_effect = seq;
    return .{ .effect = .{ .fibre = fi, .seq = seq, .kind = @fromBackingInt(@intCast(ins.x)), .step = s, .occurrence = occurrence, .args = R[ins.c] } };
}

/// Complete a parked effect. An error is thrown at the await.
pub fn resumeEffect(vm: *Vm, fi: u32, result: Value, is_error: bool) void {
    const f = fib(vm, fi);
    std.debug.assert(f.state == .parked_effect);
    if (is_error) {
        f.state = .runnable;
        if (!unwind(vm, fi, result)) wakeJoiners(vm);
        return;
    }
    const fr = topFrame(vm, f);
    const ins = vm.m.funcCode(fr.func)[fr.pc];
    std.debug.assert(ins.op == @backingInt(Op.@"suspend"));
    window(vm, f, fr)[ins.a] = result;
    fr.pc += 1;
    f.state = .runnable;
}

pub const PendingInfo = struct { seq: u32, kind: module.EffectKind, step: u32, args: Value };

/// The effect a parked fibre waits on, read from its SUSPEND instruction.
pub fn pendingEffect(vm: *Vm, fi: u32) PendingInfo {
    const f = fib(vm, fi);
    std.debug.assert(f.state == .parked_effect);
    const fr = topFrame(vm, f);
    const ins = vm.m.funcCode(fr.func)[fr.pc];
    std.debug.assert(ins.op == @backingInt(Op.@"suspend"));
    const R = window(vm, f, fr);
    return .{ .seq = f.wait_effect, .kind = @fromBackingInt(@intCast(ins.x)), .step = @intFromFloat(value.asNum(R[ins.b])), .args = R[ins.c] };
}

/// Find the fibre parked on effect `seq`.
pub fn fibreForEffect(vm: *Vm, seq: u32) ?u32 {
    const n = vm.r.exec().nfibres;
    var i: u32 = 0;
    while (i < n) : (i += 1) {
        const f = fib(vm, i);
        if (f.state == .parked_effect and f.wait_effect == seq) return i;
    }
    return null;
}

fn fork(vm: *Vm, fi: u32, ins: Instr, limits: Limits) Err!Flow {
    const f = fib(vm, fi);
    const R = window(vm, f, topFrame(vm, f));
    const callee = R[ins.b];
    const arg0 = R[ins.c];
    if (value.kindOf(callee) != .ref or vm.r.hdr(value.payload(callee)).kind != .closure) {
        return vm.throwMsg(.type_error, "value is not a function", .{});
    }
    const e = vm.r.exec();
    if (e.nfibres >= limits.fibres) return vm.limit(.fibres);
    const func = vm.r.at(heap.Closure, value.payload(callee)).func;
    const fe = vm.m.funcs[func];
    // Allocate everything first.
    var new_table: ?u32 = null;
    if (e.nfibres == e.fibres_cap) {
        new_table = try vm.r.alloc(.fibres, @sizeOf(heap.Hdr) + e.fibres_cap * 2 * @sizeOf(Fibre));
    }
    const frames = try vm.r.newFrames(4);
    const regs_cap: u32 = @max(16, fe.nregs);
    const regs = try vm.r.newVals(regs_cap);
    const e2 = vm.r.exec();
    if (new_table) |nt| {
        const dst: [*]Fibre = @ptrCast(@alignCast(vm.r.buf.ptr + nt + @sizeOf(heap.Hdr)));
        @memcpy(dst[0..e2.nfibres], fibreSlots(vm.r)[0..e2.nfibres]);
        @memset(dst[e2.nfibres .. e2.fibres_cap * 2], std.mem.zeroes(Fibre));
        e2.fibres = nt;
        e2.fibres_cap *= 2;
    }
    const id = e2.nfibres;
    const slots = fibreSlots(vm.r);
    slots[id] = .{
        .state = .runnable,
        .frames = frames,
        .nframes = 1,
        .frames_cap = 4,
        .regs = regs,
        .regs_top = fe.nregs,
        .regs_cap = regs_cap,
        .wait_effect = 0,
        .result = value.undef,
        .join = value.undef,
    };
    vm.r.framesOf(&slots[id])[0] = .{ .func = func, .pc = 0, .base = 0, .ret_reg = 0, .closure = callee };
    if (fe.nparams > 0) vm.r.regsOf(&slots[id])[0] = arg0;
    e2.nfibres += 1;
    const fr = topFrame(vm, fib(vm, fi));
    window(vm, fib(vm, fi), fr)[ins.a] = value.num(@floatFromInt(id));
    return .next;
}

/// The fibre that a JOIN list element names, or null.
fn joinId(vm: *Vm, idv: Value) ?u32 {
    if (value.kindOf(idv) != .number) return null;
    const x = value.asNum(idv);
    if (!(x >= 0) or x >= @as(f64, @floatFromInt(vm.r.exec().nfibres)) or @floor(x) != x) return null;
    return @intFromFloat(x);
}

fn join(vm: *Vm, fi: u32, ins: Instr) Err!Flow {
    const f = fib(vm, fi);
    const list = window(vm, f, topFrame(vm, f))[ins.b];
    if (value.kindOf(list) != .array) return vm.throwMsg(.type_error, "join list is not an array", .{});
    const ids = vm.r.arrItems(value.payload(list));
    // The ids come from a register: a bad module can put anything there
    // (found by fuzzing). Each must name another fibre that exists.
    for (ids) |idv| {
        if (joinId(vm, idv) == null or joinId(vm, idv).? == fi) return vm.throwMsg(.type_error, "join of a value that is not a fibre", .{});
    }
    var all_done = true;
    for (ids) |idv| {
        const child = fib(vm, joinId(vm, idv).?);
        if (child.state == .failed) {
            vm.thrown = child.result;
            return error.Throw;
        }
        if (child.state != .done) all_done = false;
    }
    if (!all_done) {
        const f2 = fib(vm, fi);
        f2.state = .parked_join;
        f2.join = list;
        return .parked;
    }
    const out = try vm.r.newArray(@intCast(ids.len));
    const ids2 = vm.r.arrItems(value.payload(list));
    try vm.r.arrReserve(value.payload(out), @intCast(ids2.len));
    for (ids2) |idv| vm.r.arrPush(value.payload(out), fib(vm, joinId(vm, idv).?).result) catch unreachable; // Reserved above; checked above.
    const f3 = fib(vm, fi);
    f3.join = value.undef;
    window(vm, f3, topFrame(vm, f3))[ins.a] = out;
    return .next;
}
