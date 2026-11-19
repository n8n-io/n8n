//! The array methods and the array helpers of `Object.keys/values/entries`.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const heap = @import("heap.zig");
const lib = @import("lib_types.zig");
const lib_string = @import("lib_string.zig");

const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;
const Native = lib.Native;
const Method = lib.Method;

/// `Object.keys/values/entries` for an array receiver: index keys as text.
pub fn arrayIter(vm: *Vm, v: Value, which: Native) Err!Value {
    const n: u32 = @intCast(vm.r.arrItems(value.payload(v)).len);
    const out = try vm.r.newArray(n);
    var i: u32 = 0;
    while (i < n) : (i += 1) {
        var nb: [16]u8 = undefined;
        const key = try vm.newStr(std.fmt.bufPrint(&nb, "{d}", .{i}) catch unreachable); // 16 bytes hold any u32.
        const item = switch (which) {
            .object_keys => key,
            .object_values => vm.r.arrItems(value.payload(v))[i],
            else => try pair(vm, key, vm.r.arrItems(value.payload(v))[i]),
        };
        try vm.r.arrPush(value.payload(out), item);
    }
    return out;
}

pub fn pair(vm: *Vm, a: Value, b: Value) Err!Value {
    const p = try vm.r.newArray(2);
    try vm.r.arrPush(value.payload(p), a);
    try vm.r.arrPush(value.payload(p), b);
    return p;
}

pub fn arrayMethod(vm: *Vm, m: Method, a: Value, args: []const Value) Err!Value {
    const off = value.payload(a);
    return switch (m) {
        .push => blk: {
            try vm.r.arrReserve(off, @intCast(args.len));
            for (args) |v| try vm.r.arrPush(off, v);
            break :blk value.num(@floatFromInt(vm.r.at(heap.Arr, off).len));
        },
        .pop => blk: {
            const arr = vm.r.at(heap.Arr, off);
            if (arr.len == 0) break :blk value.undef;
            const items = vm.r.valsAt(arr.items, arr.cap);
            const v = items[arr.len - 1];
            items[arr.len - 1] = value.undef;
            arr.len -= 1;
            break :blk v;
        },
        .shift => blk: {
            const arr = vm.r.at(heap.Arr, off);
            if (arr.len == 0) break :blk value.undef;
            const items = vm.r.valsAt(arr.items, arr.cap);
            const v = items[0];
            std.mem.copyForwards(Value, items[0 .. arr.len - 1], items[1..arr.len]);
            items[arr.len - 1] = value.undef;
            arr.len -= 1;
            break :blk v;
        },
        .unshift => blk: {
            const n: u32 = @intCast(args.len);
            try vm.r.arrReserve(off, n);
            const arr = vm.r.at(heap.Arr, off);
            const items = vm.r.valsAt(arr.items, arr.cap);
            std.mem.copyBackwards(Value, items[n .. arr.len + n], items[0..arr.len]);
            @memcpy(items[0..n], args);
            arr.len += n;
            break :blk value.num(@floatFromInt(arr.len));
        },
        .slice => blk: {
            const len: u32 = vm.r.at(heap.Arr, off).len;
            const s = try lib_string.relIndex(vm, lib.arg(args, 0), len, 0);
            const e = @max(s, try lib_string.relIndex(vm, lib.arg(args, 1), len, len));
            const out = try vm.r.newArray(e - s);
            try vm.r.arrReserve(value.payload(out), e - s);
            const out_arr = vm.r.at(heap.Arr, value.payload(out));
            @memcpy(vm.r.valsAt(out_arr.items, out_arr.cap)[0 .. e - s], vm.r.arrItems(off)[s..e]);
            out_arr.len = e - s;
            break :blk out;
        },
        .concat => blk: {
            const out = try vm.r.newArray(vm.r.at(heap.Arr, off).len);
            try appendAll(vm, value.payload(out), a);
            for (args) |v| {
                if (value.kindOf(v) == .array) try appendAll(vm, value.payload(out), v) else try vm.r.arrPush(value.payload(out), v);
            }
            break :blk out;
        },
        .join => blk: {
            const sep: []const u8 = if (value.kindOf(lib.arg(args, 0)) == .undefined) "," else vm.str(try vm.toStr(args[0]));
            const t = vm.scratch.begin();
            defer t.end();
            var b = vm.scratch.builder();
            for (vm.r.arrItems(off), 0..) |item, i| {
                if (i > 0) try b.append(sep);
                if (!value.isNullish(item)) try vm.appendString(&b, item);
            }
            break :blk vm.newStr(b.bytes());
        },
        .includes => blk: {
            // fromIndex: a negative index counts from the end (V8, Array.prototype.includes).
            const items = vm.r.arrItems(off);
            const from = try lib_string.relIndex(vm, lib.arg(args, 1), @intCast(items.len), 0);
            for (items[from..]) |item| if (vm.sameValueZero(item, lib.arg(args, 0))) break :blk value.true_;
            break :blk value.false_;
        },
        .index_of => blk: {
            const items = vm.r.arrItems(off);
            const from = try lib_string.relIndex(vm, lib.arg(args, 1), @intCast(items.len), 0);
            for (items[from..], from..) |item, i| if (vm.strictEquals(item, lib.arg(args, 0))) break :blk value.num(@floatFromInt(i));
            break :blk value.num(-1);
        },
        .reverse => blk: {
            std.mem.reverse(Value, vm.r.arrItems(off));
            break :blk a;
        },
        .at => blk: {
            const len: f64 = @floatFromInt(vm.r.at(heap.Arr, off).len);
            const f = try lib.integerOrInfinity(vm, lib.arg(args, 0));
            const idx = if (f < 0) len + f else f;
            if (!(idx >= 0 and idx < len)) break :blk value.undef;
            break :blk vm.r.arrItems(off)[@intFromFloat(idx)];
        },
        .flat => blk: {
            const out = try vm.r.newArray(vm.r.at(heap.Arr, off).len);
            const n: u32 = @intCast(vm.r.arrItems(off).len);
            var i: u32 = 0;
            while (i < n) : (i += 1) {
                const item = vm.r.arrItems(off)[i];
                if (value.kindOf(item) == .array) try appendAll(vm, value.payload(out), item) else try vm.r.arrPush(value.payload(out), item);
            }
            break :blk out;
        },
        .sort => sortDefault(vm, a),
        .to_string => vm.toStr(a),
        else => lib.notAFunction(vm, m),
    };
}

fn appendAll(vm: *Vm, dst: u32, src: Value) Err!void {
    const n: u32 = @intCast(vm.r.arrItems(value.payload(src)).len);
    try vm.r.arrReserve(dst, n);
    var i: u32 = 0;
    while (i < n) : (i += 1) try vm.r.arrPush(dst, vm.r.arrItems(value.payload(src))[i]);
}

/// Default sort: undefined last, others by ToString in UTF-16 order. Stable.
fn sortDefault(vm: *Vm, a: Value) Err!Value {
    const off = value.payload(a);
    const n = vm.r.arrItems(off).len;
    // n log n comparisons of strings.
    vm.charge(@as(u64, n) * (std.math.log2_int_ceil(usize, @max(n, 2))) / 4);
    const t = vm.scratch.begin();
    defer t.end();
    const keys = try vm.scratch.push([]const u8, n);
    const perm = try vm.scratch.push(u32, n);
    const saved = try vm.scratch.push(Value, n);
    for (0..n) |i| {
        var b = vm.scratch.builder();
        const item = vm.r.arrItems(off)[i];
        if (value.kindOf(item) != .undefined) try vm.appendString(&b, item);
        keys[i] = b.finish();
        perm[i] = @intCast(i);
        saved[i] = item;
    }
    const Ctx = struct {
        keys: [][]const u8,
        saved: []Value,
        fn less(c: @This(), x: u32, y: u32) bool {
            const ux = value.kindOf(c.saved[x]) == .undefined;
            const uy = value.kindOf(c.saved[y]) == .undefined;
            if (ux or uy) return !ux and uy;
            return ops.compareUtf16(c.keys[x], c.keys[y]) == .lt;
        }
    };
    std.sort.block(u32, perm, Ctx{ .keys = keys, .saved = saved }, Ctx.less);
    const items = vm.r.arrItems(off);
    for (perm, 0..) |p, i| items[i] = saved[p];
    return a;
}
