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
const value = @import("value.zig");
const ops = @import("ops.zig");
const module = @import("module.zig");
const interp = @import("interp.zig");
const heap = @import("heap.zig");
const gen = @import("aot_gen.zig");
const Value = value.Value;
const Vm = ops.Vm;
const Op = module.Op;

pub const Fn = *const fn (cx: *Cx) void;

pub const Entry = struct {
    hash: u64,
    nregs: u16,
    code_len: u32,
    run: Fn,
};

/// Sorted by hash.
pub const table: []const Entry = &gen.table;

comptime {
    // The id `module.no_aot` must stay free.
    std.debug.assert(gen.table.len < module.no_aot);
}

/// The state of one run of a compiled function, set by `interp.runFibre`.
pub const Cx = struct {
    vm: *Vm,
    fi: u32,
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
    if (gen.table.len == 0) unreachable else gen.table[id].run(cx);
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
    const res = interp.stepIn(cx.vm, cx.fi, cx.fr, cx.win, op, cx.code[pc], cx.now_ms, cx.limits);
    if (res) |flow| {
        if (flow == .next and cx.vm.charged == 0) return true;
    } else |_| {}
    cx.pending = res;
    return false;
}

/// Number arithmetic and comparison, as in `fastRun`; other operands go
/// through `step`.
pub inline fn numOp(cx: *Cx, comptime op: Op, R: [*]Value, a: u16, b: u16, c: u16, pc: u32) bool {
    const x = R[b];
    const y = R[c];
    if (value.kindOf(x) != .number or value.kindOf(y) != .number) return slowOp(cx, op, pc);
    const p = value.asNum(x);
    const q = value.asNum(y);
    R[a] = switch (op) {
        .add => value.num(p + q),
        .sub => value.num(p - q),
        .mul => value.num(p * q),
        .mod => value.num(interp.jsMod(p, q)),
        .lt => value.boolean(p < q),
        .le => value.boolean(p <= q),
        .gt => value.boolean(p > q),
        .ge => value.boolean(p >= q),
        else => @compileError("not a number operation"),
    };
    return true;
}

pub inline fn getprop(cx: *Cx, R: [*]Value, a: u16, b: u16, key: u16, pc: u32) bool {
    const o = R[b];
    if (value.kindOf(o) != .object) return slowOp(cx, .getprop, pc);
    const off = value.payload(o);
    const vm = cx.vm;
    R[a] = if (vm.objFindValue(off, value.constString(key))) |i| vm.r.objEntries(off)[i * 2 + 1] else value.undef;
    return true;
}

pub inline fn setprop(cx: *Cx, R: [*]Value, a: u16, key: u16, c: u16, pc: u32) bool {
    const o = R[a];
    if (value.kindOf(o) != .object) return slowOp(cx, .setprop, pc);
    // A full region leaves nothing changed; `step` then reports it.
    cx.vm.objSet(value.payload(o), value.constString(key), R[c]) catch return slowOp(cx, .setprop, pc);
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
    if (value.kindOf(R[a]) != .array) return slowOp(cx, .push, pc);
    cx.vm.r.arrPush(value.payload(R[a]), R[b]) catch return slowOp(cx, .push, pc);
    return true;
}

pub inline fn getelem(cx: *Cx, R: [*]Value, a: u16, b: u16, c: u16, pc: u32) bool {
    const arr = R[b];
    const k = R[c];
    if (value.kindOf(arr) != .array or value.kindOf(k) != .number) return slowOp(cx, .getelem, pc);
    const x = value.asNum(k);
    if (!(x >= 0 and x == @trunc(x) and x < 4294967295)) return slowOp(cx, .getelem, pc);
    R[a] = cx.vm.arrGet(arr, @intFromFloat(x));
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
