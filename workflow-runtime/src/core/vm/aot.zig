//! Compiled functions: bytecode functions translated ahead of time to Zig
//! (`wfrt aot-gen`, docs/aot-design.md). A compiled function is a `switch` on
//! the program counter with one prong for each instruction, so it can start
//! at any instruction: after a call returns, after an effect, after the
//! region grew. It works on the same state as the interpreter: the frame,
//! the register window in the region, the fuel. Simple instructions run
//! inline, with the same checks as `interp.fastRun`; every other one runs
//! through `interp.step`, the interpreter's own code. The results, the
//! region bytes and the fuel are therefore the same with and without it.
//!
//! A module function uses a compiled function when its canonical hash is in
//! the table. The hash covers everything the compiled code relies on: the
//! register counts, every opcode and operand, and for operands that index a
//! module table (strings, numbers, natives) the content, not the index.
//! Indices are read from the module's own code at run time.
const std = @import("std");
const value = @import("../mem/value.zig");
const ops = @import("../runtime/root.zig").ops;
const module = @import("../mem/bytecode.zig");
const interp = @import("interp.zig");
const heap = @import("../mem/heap.zig");
const Value = value.Value;
const Vm = ops.Vm;
const Op = module.Op;

// The build links the generated table unless `-Daot=false`. The bench
// builds do not add the `aot` option, so they keep the table by default.
const perf_options = @import("perf_options");
const aot_enabled = if (@hasDecl(perf_options, "aot")) perf_options.aot else true;

pub const Fn = *const fn (cx: *Cx) void;

pub const Entry = struct {
    hash: u64,
    nregs: u16,
    code_len: u32,
    run: Fn,
};

/// Sorted by hash. Empty when `-Daot=false`; `find` then gives no ids and
/// the interpreter runs bytecode with the same results and fuel.
pub const table: []const Entry = if (aot_enabled) &@import("aot_gen.zig").table else &.{};

comptime {
    if (aot_enabled) {
        // The id `module.no_aot` must stay free.
        std.debug.assert(@import("aot_gen.zig").table.len < module.no_aot);
    }
}

/// The state of one run of a compiled function, set by `interp.runFibre`.
pub const Cx = struct {
    vm: *Vm,
    fi: u32,
    /// The fibre and its top frame. They are valid until an instruction
    /// gives a flow other than `.next`.
    f: *heap.Fibre,
    fr: *heap.Frame,
    /// The register window of the frame. The region does not move while
    /// the fibre runs, and the window moves only on a call.
    win: []Value,
    R: [*]Value,
    /// The frame's code in the module.
    code: []align(1) const module.Instr,
    /// Instructions this run may complete, as for `fastRun`.
    budget: u64,
    now_ms: f64,
    limits: interp.Limits,
    /// Instructions completed.
    n: u64 = 0,
    /// The result of the instruction at `fr.pc` when the compiled code ran
    /// it through `step` and the interpreter must finish it: an error, a
    /// change of frame or fibre, or a fuel charge.
    pending: ?ops.Err!interp.Flow = null,
};

/// Run compiled function `id`, from `find`.
pub fn run(id: u16, cx: *Cx) void {
    // With an empty table `find` gives no ids.
    if (table.len == 0) unreachable else table[id].run(cx);
}

/// The compiled function for module function `fi`, or `module.no_aot`.
pub fn find(m: *const module.Module, fi: u32) u16 {
    if (table.len == 0) return module.no_aot;
    const fe = m.funcs[fi];
    const h = hashFunc(m, fi);
    var lo: usize = 0;
    var hi: usize = table.len;
    while (lo < hi) {
        const mid = lo + (hi - lo) / 2;
        if (table[mid].hash < h) lo = mid + 1 else hi = mid;
    }
    if (lo == table.len or table[lo].hash != h) return module.no_aot;
    const e = table[lo];
    if (e.nregs != fe.nregs or e.code_len != fe.code_len) return module.no_aot;
    return @intCast(lo);
}

// ---- the canonical hash -------------------------------------------------------

pub fn hashFunc(m: *const module.Module, fi: u32) u64 {
    const fe = m.funcs[fi];
    var h = std.hash.Wyhash.init(0x41_4F_54_31); // "AOT1"
    hashInt(&h, u16, fe.nparams);
    hashInt(&h, u16, fe.nregs);
    hashInt(&h, u16, fe.ncaps);
    hashInt(&h, u32, fe.code_len);
    for (m.funcCode(fi)) |ins| {
        hashInt(&h, u8, ins.op);
        hashInt(&h, u8, ins.x);
        hashInt(&h, u16, ins.a);
        const op: Op = @fromBackingInt(ins.op);
        switch (op) {
            .loads => hashStr(&h, m.str(ins.bc())),
            .loadk => hashInt(&h, u64, @bitCast(m.numbers[ins.bc()])),
            .getprop => {
                hashInt(&h, u16, ins.b);
                hashStr(&h, m.str(ins.c));
            },
            .setprop, .callm, .calln => {
                hashStr(&h, m.str(ins.b));
                hashInt(&h, u16, ins.c);
            },
            // The target function is read from the module's code: only
            // its capture count matters, and `step` reads that too.
            .closure => hashInt(&h, u16, ins.c),
            else => {
                hashInt(&h, u16, ins.b);
                hashInt(&h, u16, ins.c);
            },
        }
    }
    return h.final();
}

fn hashInt(h: *std.hash.Wyhash, comptime T: type, v: T) void {
    var b: [@sizeOf(T)]u8 = undefined;
    std.mem.writeInt(T, &b, v, .little);
    h.update(&b);
}

fn hashStr(h: *std.hash.Wyhash, s: []const u8) void {
    hashInt(h, u32, @intCast(s.len));
    h.update(s);
}

// ---- run-time helpers of the generated code -------------------------------------

/// Run instruction `pc`, opcode `op`, with the interpreter's code
/// (`interp.stepIn`). True when the generated code can go on: the
/// instruction completed in this frame with no fuel charge. Else its result
/// is left in `cx.pending` for `runFibre`.
pub fn slowOp(cx: *Cx, comptime op: Op, pc: u32) bool {
    cx.fr.pc = pc;
    const res = interp.stepIn(cx.vm, cx.fi, cx.f, cx.fr, cx.win, op, cx.code[pc], cx.now_ms, cx.limits);
    if (res) |flow| {
        if (flow == .next and cx.vm.charged == 0) return true;
    } else |_| {}
    cx.pending = res;
    return false;
}

/// Number arithmetic and comparison, as in `fastRun`; other operands go
/// through `step`. The result comes from `interp.numOpValue`.
pub inline fn numOp(cx: *Cx, comptime op: Op, R: [*]Value, a: u16, b: u16, c: u16, pc: u32) bool {
    const x = R[b];
    const y = R[c];
    if (value.kindOf(x) != .number or value.kindOf(y) != .number) return slowOp(cx, op, pc);
    R[a] = interp.numOpValue(op, value.asNum(x), value.asNum(y));
    return true;
}

pub inline fn getprop(cx: *Cx, R: [*]Value, a: u16, b: u16, key: u16, pc: u32) bool {
    R[a] = interp.fastGetProp(cx.vm, R[b], key) orelse return slowOp(cx, .getprop, pc);
    return true;
}

pub inline fn setprop(cx: *Cx, R: [*]Value, a: u16, key: u16, c: u16, pc: u32) bool {
    // A full region leaves nothing changed; `step` then reports it.
    if (!interp.fastSetProp(cx.vm, R[a], key, R[c])) return slowOp(cx, .setprop, pc);
    return true;
}

pub inline fn newobj(cx: *Cx, R: [*]Value, a: u16, pc: u32) bool {
    R[a] = cx.vm.r.newObject(4) catch return slowOp(cx, .newobj, pc);
    return true;
}

pub inline fn newarr(cx: *Cx, R: [*]Value, a: u16, pc: u32) bool {
    R[a] = cx.vm.r.newArray(4) catch return slowOp(cx, .newarr, pc);
    return true;
}

pub inline fn push(cx: *Cx, R: [*]Value, a: u16, b: u16, pc: u32) bool {
    if (!interp.fastPush(cx.vm, R[a], R[b])) return slowOp(cx, .push, pc);
    return true;
}

pub inline fn getelem(cx: *Cx, R: [*]Value, a: u16, b: u16, c: u16, pc: u32) bool {
    R[a] = interp.fastGetElem(cx.vm, R[b], R[c]) orelse return slowOp(cx, .getelem, pc);
    return true;
}

/// `Array.isArray(x)` when it charges no fuel: `chargeNative` charges one
/// unit for each 64 items of an array or UTF-16 units of a string.
pub inline fn isArray(cx: *Cx, R: [*]Value, a: u16, c: u16, pc: u32) bool {
    const x = R[c];
    switch (value.kindOf(x)) {
        .array => {
            if (cx.vm.r.arrItems(value.payload(x)).len >= 64) return slowOp(cx, .calln, pc);
            R[a] = value.true_;
        },
        .string => {
            if (cx.vm.utf16Len(x) >= 64) return slowOp(cx, .calln, pc);
            R[a] = value.false_;
        },
        else => R[a] = value.false_,
    }
    return true;
}

pub inline fn truthy(cx: *Cx, v: Value) bool {
    return cx.vm.truthy(v);
}

pub inline fn strictEquals(cx: *Cx, x: Value, y: Value) bool {
    return cx.vm.strictEquals(x, y);
}
