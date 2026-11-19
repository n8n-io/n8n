//! The numeric natives: `Math.*`, `Number`, `parseInt`, `parseFloat`,
//! `isNaN`, `Number.isInteger`, and `Number.isFinite`, plus the number
//! methods (`toFixed`, `toString` with a radix).
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const numfmt = @import("numfmt.zig");
const exactnum = @import("exactnum.zig");
const lib = @import("lib_types.zig");

const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;
const Native = lib.Native;
const Method = lib.Method;

/// True for the natives this file handles, the numeric ones.
fn numericNative(n: Native) bool {
    return switch (n) {
        .math_floor, .math_ceil, .math_round, .math_trunc, .math_abs, .math_min, .math_max, .math_pow, .math_sqrt, .math_sign, .math_log, .math_exp, .number, .parse_int, .parse_float, .is_nan, .number_is_integer, .number_is_finite => true,
        else => false, // the other natives route to their own domain file.
    };
}

pub fn callNative(vm: *Vm, n: Native, args: []const Value) Err!Value {
    std.debug.assert(numericNative(n));
    return switch (n) {
        .math_floor => value.num(@floor(try lib.numArg(vm, args, 0))),
        .math_ceil => value.num(@ceil(try lib.numArg(vm, args, 0))),
        .math_round => value.num(jsRound(try lib.numArg(vm, args, 0))),
        .math_trunc => value.num(@trunc(try lib.numArg(vm, args, 0))),
        .math_abs => value.num(@abs(try lib.numArg(vm, args, 0))),
        .math_sqrt => value.num(@sqrt(try lib.numArg(vm, args, 0))),
        .math_log => value.num(@log(try lib.numArg(vm, args, 0))),
        .math_exp => value.num(@exp(try lib.numArg(vm, args, 0))),
        .math_pow => value.num(jsPow(try lib.numArg(vm, args, 0), try lib.numArg(vm, args, 1))),
        .math_sign => blk: {
            const x = try lib.numArg(vm, args, 0);
            break :blk value.num(if (std.math.isNan(x) or x == 0) x else if (x > 0) 1 else -1);
        },
        .math_min, .math_max => minMax(vm, args, n == .math_max),
        .number => value.num(if (args.len == 0) 0 else try vm.toNumber(args[0])),
        .parse_int => blk: {
            const s = try vm.toStr(lib.arg(args, 0));
            const radix = if (args.len > 1) try vm.toNumber(args[1]) else std.math.nan(f64);
            break :blk value.num(numfmt.parseIntJs(vm.str(s), radix));
        },
        .parse_float => value.num(numfmt.parseFloatPrefix(vm.str(try vm.toStr(lib.arg(args, 0))))),
        .is_nan => value.boolean(std.math.isNan(try lib.numArg(vm, args, 0))),
        .number_is_integer => value.boolean(isNumberWhere(lib.arg(args, 0), isInteger)),
        .number_is_finite => value.boolean(isNumberWhere(lib.arg(args, 0), isFiniteNum)),
        else => unreachable, // numericNative above.
    };
}

fn isNumberWhere(v: Value, pred: fn (f64) bool) bool {
    return value.kindOf(v) == .number and pred(value.asNum(v));
}

fn isInteger(x: f64) bool {
    return std.math.isFinite(x) and @trunc(x) == x;
}

fn isFiniteNum(x: f64) bool {
    return std.math.isFinite(x);
}

fn jsRound(x: f64) f64 {
    if (std.math.isNan(x) or std.math.isInf(x) or @trunc(x) == x) return x;
    const r = @floor(x);
    const out = if (x - r >= 0.5) r + 1 else r;
    if (out == 0 and x < 0) return -0.0;
    return out;
}

fn jsPow(x: f64, y: f64) f64 {
    if (std.math.isNan(y)) return std.math.nan(f64);
    if (y == 0) return 1;
    if ((x == 1 or x == -1) and std.math.isInf(y)) return std.math.nan(f64);
    return std.math.pow(f64, x, y);
}

fn minMax(vm: *Vm, args: []const Value, is_max: bool) Err!Value {
    var acc: f64 = if (is_max) -std.math.inf(f64) else std.math.inf(f64);
    for (args) |a| {
        const x = try vm.toNumber(a);
        if (std.math.isNan(x)) return value.num(x);
        if (is_max) {
            if (x > acc or (x == 0 and acc == 0 and !std.math.signbit(x))) acc = x;
        } else {
            if (x < acc or (x == 0 and acc == 0 and std.math.signbit(x))) acc = x;
        }
    }
    return value.num(acc);
}

pub fn numberMethod(vm: *Vm, m: Method, n: Value, args: []const Value) Err!Value {
    const x = value.asNum(n);
    return switch (m) {
        .to_fixed => blk: {
            const d_f = try vm.toNumber(lib.arg(args, 0));
            const d: usize = if (std.math.isNan(d_f)) 0 else @intFromFloat(@max(0, @min(100, @trunc(d_f))));
            if (@abs(x) >= 1e21 or std.math.isNan(x) or std.math.isInf(x)) break :blk vm.toStr(n);
            var buf: [160]u8 = undefined;
            const s = exactnum.toFixed(&buf, x, @intCast(d)) catch break :blk vm.toStr(n);
            break :blk vm.newStr(s);
        },
        .to_string => blk: {
            const r = lib.arg(args, 0);
            if (value.kindOf(r) == .undefined) break :blk vm.toStr(n);
            // V8: ToIntegerOrInfinity of the radix, so 10.5 is 10 and NaN is 0 (a RangeError).
            const radix = try lib.integerOrInfinity(vm, r);
            if (radix == 10) break :blk vm.toStr(n);
            break :blk radixString(vm, x, radix);
        },
        else => lib.notAFunction(vm, m),
    };
}

fn radixString(vm: *Vm, x: f64, radix_f: f64) Err!Value {
    if (!(radix_f >= 2 and radix_f <= 36)) return vm.throwMsg(.range_error, "toString() radix must be between 2 and 36", .{});
    const radix: u8 = @intFromFloat(radix_f);
    if (std.math.isNan(x) or std.math.isInf(x)) return vm.toStr(value.num(x));
    // Fractions and integers past 2^53: V8's DoubleToRadixCString (its zeros for the low digits).
    if (@trunc(x) != x or @abs(x) > 9007199254740991) {
        var fb: [1200]u8 = undefined;
        return vm.newStr(exactnum.radixFraction(&fb, x, radix));
    }
    var buf: [80]u8 = undefined;
    var i: usize = buf.len;
    var v: u64 = @intFromFloat(@abs(x));
    if (v == 0) return vm.newStr("0");
    while (v > 0) : (v /= radix) {
        i -= 1;
        buf[i] = std.fmt.digitToChar(@intCast(v % radix), .lower);
    }
    if (x < 0) {
        i -= 1;
        buf[i] = '-';
    }
    return vm.newStr(buf[i..]);
}
