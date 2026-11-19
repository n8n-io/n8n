//! The object natives: `JSON.stringify`, `JSON.parse`,
//! `Object.keys/values/entries`, `Object.assign`, and `spreadObject`.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const json = @import("json.zig");
const json_error = @import("json_error.zig");
const lib = @import("lib.zig");
const lib_array = @import("lib_array.zig");

const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;
const Native = lib.Native;

pub fn callNative(vm: *Vm, n: Native, args: []const Value) Err!Value {
    return switch (n) {
        .json_stringify => jsonStringify(vm, args),
        .json_parse => jsonParse(vm, lib.arg(args, 0)),
        .object_keys, .object_values, .object_entries => objectIter(vm, lib.arg(args, 0), n),
        .object_assign => objectAssign(vm, args),
        else => unreachable, // lib.zig routes only the object natives here.
    };
}

fn jsonStringify(vm: *Vm, args: []const Value) Err!Value {
    const spaces = "          ";
    var indent: []const u8 = "";
    const ind = lib.arg(args, 2);
    if (value.kindOf(ind) == .number) indent = spaces[0..@intFromFloat(@max(0, @min(10, @trunc(value.asNum(ind)))))];
    if (value.kindOf(ind) == .string) {
        const t = vm.str(ind);
        indent = t[0..@min(10, t.len)];
    }
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    if (!try json.encode(vm, &b, lib.arg(args, 0), indent)) return value.undef;
    return vm.newStr(b.bytes());
}

fn jsonParse(vm: *Vm, s: Value) Err!Value {
    const sv = try vm.toStr(s);
    const text = vm.str(sv);
    return json.decode(vm, text) catch |e| switch (e) {
        error.Syntax => {
            // The message that V8 gives, for code that reads a caught error.
            var buf: [json_error.max_message]u8 = undefined;
            const msg = json_error.message(text, &buf) orelse "Unexpected token in JSON";
            return vm.throwMsg(.syntax_error, "{s}", .{msg});
        },
        else => |other| other,
    };
}

fn objectIter(vm: *Vm, v_in: Value, which: Native) Err!Value {
    const k = value.kindOf(v_in);
    if (k == .undefined or k == .null) return vm.throwMsg(.type_error, "Cannot convert undefined or null to object", .{});
    if (k == .array) return lib_array.arrayIter(vm, v_in, which);
    var v = v_in;
    if (k == .string) {
        // A string has its UTF-16 units under index keys, as in JavaScript.
        v = try vm.r.newObject(4);
        try spreadObject(vm, v, v_in);
    } else if (k != .object) return vm.r.newArray(0);
    std.debug.assert(value.kindOf(v) == .object);
    const off = value.payload(v);
    const t = vm.scratch.begin();
    defer t.end();
    const order = try vm.orderedKeys(off);
    const out = try vm.r.newArray(@intCast(order.len));
    for (order) |ei| {
        const es = vm.r.objEntries(off);
        const item = switch (which) {
            .object_keys => es[ei * 2],
            .object_values => es[ei * 2 + 1],
            else => try lib_array.pair(vm, es[ei * 2], es[ei * 2 + 1]),
        };
        try vm.r.arrPush(value.payload(out), item);
    }
    return out;
}

fn objectAssign(vm: *Vm, args: []const Value) Err!Value {
    const target = lib.arg(args, 0);
    if (value.kindOf(target) != .object) return vm.throwMsg(.type_error, "Cannot convert undefined or null to object", .{});
    for (args[1..]) |src| try spreadObject(vm, target, src);
    return target;
}

/// `Object.assign(target, src)` for one source, in key order.
pub fn spreadObject(vm: *Vm, target: Value, src: Value) Err!void {
    switch (value.kindOf(src)) {
        .object => {
            const off = value.payload(src);
            const t = vm.scratch.begin();
            defer t.end();
            const order = try vm.orderedKeys(off);
            for (order) |ei| {
                const es = vm.r.objEntries(off);
                try vm.objSet(value.payload(target), es[ei * 2], es[ei * 2 + 1]);
            }
        },
        .array => {
            const n: u32 = @intCast(vm.r.arrItems(value.payload(src)).len);
            var i: u32 = 0;
            while (i < n) : (i += 1) {
                var nb: [16]u8 = undefined;
                const key = try vm.newStr(std.fmt.bufPrint(&nb, "{d}", .{i}) catch unreachable); // 16 bytes hold any u32.
                try vm.objSet(value.payload(target), key, vm.r.arrItems(value.payload(src))[i]);
            }
        },
        // A string spreads its UTF-16 units under index keys, as in JavaScript.
        .string => {
            const n = vm.utf16Len(src);
            var i: u32 = 0;
            while (i < n) : (i += 1) {
                var nb: [16]u8 = undefined;
                const key = try vm.newStr(std.fmt.bufPrint(&nb, "{d}", .{i}) catch unreachable); // 16 bytes hold any u32.
                try vm.objSet(value.payload(target), key, try vm.charAt(src, i));
            }
        },
        else => {},
    }
}
