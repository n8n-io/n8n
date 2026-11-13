//! The fixed standard library: functions called with CALLN and methods
//! called with CALLM. Names resolve to ids once, when a module is verified.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const numfmt = @import("numfmt.zig");
const ops = @import("ops.zig");
const json = @import("json.zig");
const json_error = @import("json_error.zig");
const exactnum = @import("exactnum.zig");
const date = @import("date.zig");
const unicase = @import("unicase.zig");
const unorm = @import("normalize.zig");
const collate = @import("collate.zig");
const regex = @import("regex.zig");
const textcodec = @import("textcodec.zig");
const xml = @import("xml.zig");
const xmlrss = @import("xmlrss.zig");
const Builder = @import("arena.zig").Builder;
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

pub const Native = enum(u16) {
    math_floor,
    math_ceil,
    math_round,
    math_trunc,
    math_abs,
    math_min,
    math_max,
    math_pow,
    math_sqrt,
    math_sign,
    math_log,
    math_exp,
    json_stringify,
    json_parse,
    object_keys,
    object_values,
    object_entries,
    object_assign,
    array_is_array,
    number,
    string,
    boolean,
    parse_int,
    parse_float,
    is_nan,
    number_is_integer,
    number_is_finite,
    regexp_exec,
    btoa,
    atob,
    encode_uri_component,
    decode_uri_component,
    escape,
    unescape,
    xml_parse,
    xml_snippet,
    xml_content,
    static_data,
    polled,
    encode_uri,
    ascii_is,
    ascii_is_printable,
    base64_encode_utf8,
};

const native_names = [_][]const u8{
    "Math.floor",         "Math.ceil",          "Math.round",        "Math.trunc",    "Math.abs",
    "Math.min",           "Math.max",           "Math.pow",          "Math.sqrt",     "Math.sign",
    "Math.log",           "Math.exp",           "JSON.stringify",    "JSON.parse",    "Object.keys",
    "Object.values",      "Object.entries",     "Object.assign",     "Array.isArray", "Number",
    "String",             "Boolean",            "parseInt",          "parseFloat",    "isNaN",
    "Number.isInteger",   "Number.isFinite",    "RegExp.exec",       "btoa",          "atob",
    "encodeURIComponent", "decodeURIComponent", "escape",            "unescape",      "XML.parse",
    "XML.snippet",        "XML.content",        "ctx.staticData",    "ctx.polled",    "encodeURI",
    "Ascii.is",           "Ascii.isPrintable",  "Base64.encodeUtf8",
};

pub const Method = enum(u16) {
    to_upper_case,
    to_lower_case,
    trim,
    trim_start,
    trim_end,
    starts_with,
    ends_with,
    includes,
    index_of,
    slice,
    substring,
    split,
    replace,
    replace_all,
    pad_start,
    pad_end,
    repeat,
    char_at,
    char_code_at,
    concat,
    at,
    push,
    pop,
    shift,
    unshift,
    join,
    reverse,
    sort,
    flat,
    to_fixed,
    to_string,
    normalize,
    locale_compare,
};

const method_names = [_][]const u8{
    "toUpperCase", "toLowerCase", "trim",     "trimStart", "trimEnd",       "startsWith", "endsWith",
    "includes",    "indexOf",     "slice",    "substring", "split",         "replace",    "replaceAll",
    "padStart",    "padEnd",      "repeat",   "charAt",    "charCodeAt",    "concat",     "at",
    "push",        "pop",         "shift",    "unshift",   "join",          "reverse",    "sort",
    "flat",        "toFixed",     "toString", "normalize", "localeCompare",
};

comptime {
    std.debug.assert(native_names.len == std.enums.values(Native).len);
    std.debug.assert(method_names.len == std.enums.values(Method).len);
}

/// Date functions take the ids from `date_base` on (spec section 4.5).
const date_base: u16 = 0x100;

comptime {
    std.debug.assert(native_names.len < date_base);
}

pub fn nativeId(name: []const u8) ?u16 {
    for (native_names, 0..) |n, i| if (std.mem.eql(u8, n, name)) return @intCast(i);
    if (date.id(name)) |i| return date_base + i;
    return null;
}

pub fn methodId(name: []const u8) ?u16 {
    for (method_names, 0..) |n, i| if (std.mem.eql(u8, n, name)) return @intCast(i);
    return null;
}

pub fn methodName(id: u16) []const u8 {
    return method_names[id];
}

fn arg(args: []const Value, i: usize) Value {
    return if (i < args.len) args[i] else value.undef;
}

fn numArg(vm: *Vm, args: []const Value, i: usize) Err!f64 {
    return vm.toNumber(arg(args, i));
}

// ---- natives --------------------------------------------------------------

pub fn callNative(vm: *Vm, id: u16, args: []const Value) Err!Value {
    if (id >= date_base) return date.call(vm, id - date_base, args);
    const n: Native = @fromBackingInt(@intCast(id));
    return switch (n) {
        .math_floor => value.num(@floor(try numArg(vm, args, 0))),
        .math_ceil => value.num(@ceil(try numArg(vm, args, 0))),
        .math_round => value.num(jsRound(try numArg(vm, args, 0))),
        .math_trunc => value.num(@trunc(try numArg(vm, args, 0))),
        .math_abs => value.num(@abs(try numArg(vm, args, 0))),
        .math_sqrt => value.num(@sqrt(try numArg(vm, args, 0))),
        .math_log => value.num(@log(try numArg(vm, args, 0))),
        .math_exp => value.num(@exp(try numArg(vm, args, 0))),
        .math_pow => value.num(jsPow(try numArg(vm, args, 0), try numArg(vm, args, 1))),
        .math_sign => blk: {
            const x = try numArg(vm, args, 0);
            break :blk value.num(if (std.math.isNan(x) or x == 0) x else if (x > 0) 1 else -1);
        },
        .math_min, .math_max => minMax(vm, args, n == .math_max),
        .json_stringify => jsonStringify(vm, args),
        .json_parse => jsonParse(vm, arg(args, 0)),
        .object_keys, .object_values, .object_entries => objectIter(vm, arg(args, 0), n),
        .object_assign => objectAssign(vm, args),
        .array_is_array => value.boolean(value.kindOf(arg(args, 0)) == .array),
        .number => value.num(if (args.len == 0) 0 else try vm.toNumber(args[0])),
        .string => if (args.len == 0) vm.newStr("") else vm.toStr(args[0]),
        .boolean => value.boolean(vm.truthy(arg(args, 0))),
        .parse_int => blk: {
            const s = try vm.toStr(arg(args, 0));
            const radix = if (args.len > 1) try vm.toNumber(args[1]) else std.math.nan(f64);
            break :blk value.num(numfmt.parseIntJs(vm.str(s), radix));
        },
        .parse_float => value.num(numfmt.parseFloatPrefix(vm.str(try vm.toStr(arg(args, 0))))),
        .is_nan => value.boolean(std.math.isNan(try numArg(vm, args, 0))),
        .number_is_integer => value.boolean(isNumberWhere(arg(args, 0), struct {
            fn f(x: f64) bool {
                return std.math.isFinite(x) and @trunc(x) == x;
            }
        }.f)),
        .number_is_finite => value.boolean(isNumberWhere(arg(args, 0), struct {
            fn f(x: f64) bool {
                return std.math.isFinite(x);
            }
        }.f)),
        .regexp_exec => regexExec(vm, args),
        .btoa => codec(vm, args, textcodec.btoa),
        .atob => codec(vm, args, textcodec.atob),
        .encode_uri_component => codec(vm, args, textcodec.encodeUriComponent),
        .decode_uri_component => codec(vm, args, textcodec.decodeUriComponent),
        .escape => codec(vm, args, textcodec.escape),
        .unescape => codec(vm, args, textcodec.unescape),
        .xml_parse => xmlParse(vm, arg(args, 0)),
        .xml_snippet => xmlrss.snippet(vm, vm.str(try vm.toStr(arg(args, 0)))),
        .xml_content => xmlrss.content(vm, arg(args, 0)),
        .static_data => staticData(vm, arg(args, 0), arg(args, 1)),
        .polled => polled(vm, arg(args, 0)),
        .encode_uri => codec(vm, args, textcodec.encodeUri),
        .ascii_is => textRange(vm, arg(args, 0), 0x00, 0x7f),
        .ascii_is_printable => textRange(vm, arg(args, 0), 0x20, 0x7e),
        .base64_encode_utf8 => codec(vm, args, textcodec.base64Utf8),
    };
}

/// `XML.parse(text)`: the xml2js value, or an Error with the message of sax.
/// ctx.staticData(type, node): the object of `$getWorkflowStaticData`
/// (spec 9.7). `global`, or `node` with the node name. Changes to the
/// object are the execution's; it commits them when it ends.
fn staticData(vm: *Vm, kind: Value, node: Value) Err!Value {
    const k = try vm.toStr(kind);
    var key_buf: [5 + 256]u8 = undefined;
    const key: []const u8 = if (std.mem.eql(u8, vm.str(k), "global")) "global" else if (std.mem.eql(u8, vm.str(k), "node")) blk: {
        if (value.kindOf(node) != .string or vm.str(node).len == 0) return vm.throwMsg(.@"error", "The node name is missing for static data of type \"node\"", .{});
        const name = vm.str(node);
        if (name.len > 256) return vm.throwMsg(.@"error", "The node name is too long", .{});
        @memcpy(key_buf[0..5], "node:");
        @memcpy(key_buf[5..][0..name.len], name);
        break :blk key_buf[0 .. 5 + name.len];
    } else return vm.throwMsg(.@"error", "Unknown context type. Only `global` and `node` are supported.", .{});
    const e = vm.r.exec();
    if (e.static_doc == value.undef) {
        const start = e.static_start;
        const doc = if (value.kindOf(start) == .string) json.decode(vm, vm.str(start)) catch |err| switch (err) {
            error.RegionFull => return error.RegionFull,
            else => try vm.r.newObject(0),
        } else try vm.r.newObject(0);
        // An allocation can move nothing: regions grow between instructions only.
        vm.r.exec().static_doc = if (value.kindOf(doc) == .object) doc else try vm.r.newObject(0);
    }
    const doc = vm.r.exec().static_doc;
    const cur = vm.objGet(value.payload(doc), key);
    if (value.kindOf(cur) == .object) return cur;
    const fresh = try vm.r.newObject(0);
    const kv = try vm.newStr(key);
    try vm.objSet(value.payload(vm.r.exec().static_doc), kv, fresh);
    return fresh;
}

/// ctx.polled(items) (spec 9.8): true when a poll found items. A quiet poll
/// run then becomes a run like any other: its `started` event, with the items
/// as the trigger, goes out before its next event. With no items the run stays
/// quiet; when it ends, the core skips it.
fn polled(vm: *Vm, items: Value) Err!Value {
    const found = value.kindOf(items) == .array and vm.r.arrItems(value.payload(items)).len > 0;
    if (!found) return value.false_;
    const e = vm.r.exec();
    if (e.flags & heap.exec_flag_quiet != 0) {
        e.flags = (e.flags & ~heap.exec_flag_quiet) | heap.exec_flag_announce;
        e.trigger = items;
    }
    return value.true_;
}

/// Ascii.is and Ascii.isPrintable: true when every character of the
/// text is in [lo, hi]. Library nodes call them in place of loops over
/// `charCodeAt`. In UTF-8, a byte below 0x80 is a whole character, so a
/// check of the bytes is a check of the characters.
fn textRange(vm: *Vm, v: Value, lo: u8, hi: u8) Err!Value {
    const s = try vm.toStr(v);
    const bytes = vm.str(s);
    vm.charge(bytes.len / 64);
    for (bytes) |c| {
        if (c < lo or c > hi) return value.false_;
    }
    return value.true_;
}

fn xmlParse(vm: *Vm, text: Value) Err!Value {
    const s = try vm.toStr(text);
    var fail: xml.Failure = .{};
    // The parse reads each byte a fixed number of times.
    vm.charge(vm.str(s).len / 4);
    return xml.parse(vm, vm.str(s), &fail) catch |e| switch (e) {
        error.XmlSyntax => {
            var buf: [400]u8 = undefined;
            const msg = xml.message(&fail, &buf);
            return vm.throwMsg(.@"error", "{s}", .{msg});
        },
        else => |other| other,
    };
}

/// A text codec over the string of the first argument (`textcodec.zig`).
fn codec(vm: *Vm, args: []const Value, f: fn (*Builder, []const u8) textcodec.Error!void) Err!Value {
    const s = try vm.toStr(arg(args, 0));
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    f(&b, vm.str(s)) catch |e| return switch (e) {
        error.ArenaFull => error.ArenaFull,
        error.Malformed => vm.throwMsg(.uri_error, "URI malformed", .{}),
        error.InvalidCharacter => vm.throwMsg(.invalid_character_error, "Invalid character", .{}),
        error.NotEncoded => vm.throwMsg(.invalid_character_error, "The string to be decoded is not correctly encoded.", .{}),
    };
    // A linear pass over the text: one unit of fuel for each 16 bytes.
    vm.charge((vm.str(s).len + b.len) / 16);
    return vm.newStr(b.bytes());
}

/// `RegExp.exec(source, flags, input, lastIndex)` (spec section 4.6): null, or
/// an array of UTF-16 positions `[start, end, group 1 start, group 1 end, ...]`
/// with -1 for a group that did not take part.
fn regexExec(vm: *Vm, args: []const Value) Err!Value {
    const source = try vm.toStr(arg(args, 0));
    const flags = try vm.toStr(arg(args, 1));
    const input = try vm.toStr(arg(args, 2));
    const last = @trunc(try numArg(vm, args, 3));
    const t = vm.scratch.begin();
    defer t.end();
    const re = regex.compile(vm.scratch, vm.str(source), vm.str(flags)) catch |e| return regexError(vm, e, vm.str(source));
    const units = try regex.toUtf16(vm.scratch, vm.str(input));
    if (!(last >= 0 and last <= @as(f64, @floatFromInt(units.len)))) return value.null_;
    var steps: u64 = 0;
    const found = regex.exec(vm.scratch, re, units, @intFromFloat(last), &steps) catch |e| return regexError(vm, e, vm.str(source));
    // The steps of the matcher count as fuel, a little below one instruction each.
    vm.charge(steps / 16);
    const caps = found orelse return value.null_;
    const out = try vm.r.newArray(@intCast(caps.len));
    for (caps) |c| try vm.r.arrPush(value.payload(out), value.num(@floatFromInt(c)));
    return out;
}

fn regexError(vm: *Vm, e: regex.Error, source: []const u8) Err {
    return switch (e) {
        error.Syntax => vm.throwMsg(.syntax_error, "Invalid regular expression: /{s}/", .{source}),
        error.TooLarge => vm.throwMsg(.syntax_error, "Regular expression too large: /{s}/", .{source}),
        error.StepLimit => vm.limit(.fuel),
        error.ArenaFull => error.ArenaFull,
    };
}

fn isNumberWhere(v: Value, pred: fn (f64) bool) bool {
    return value.kindOf(v) == .number and pred(value.asNum(v));
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

fn jsonStringify(vm: *Vm, args: []const Value) Err!Value {
    const spaces = "          ";
    var indent: []const u8 = "";
    const ind = arg(args, 2);
    if (value.kindOf(ind) == .number) indent = spaces[0..@intFromFloat(@max(0, @min(10, @trunc(value.asNum(ind)))))];
    if (value.kindOf(ind) == .string) {
        const t = vm.str(ind);
        indent = t[0..@min(10, t.len)];
    }
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    if (!try json.encode(vm, &b, arg(args, 0), indent)) return value.undef;
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
    if (k == .array) return arrayIter(vm, v_in, which);
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
            else => try pair(vm, es[ei * 2], es[ei * 2 + 1]),
        };
        try vm.r.arrPush(value.payload(out), item);
    }
    return out;
}

fn arrayIter(vm: *Vm, v: Value, which: Native) Err!Value {
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

fn pair(vm: *Vm, a: Value, b: Value) Err!Value {
    const p = try vm.r.newArray(2);
    try vm.r.arrPush(value.payload(p), a);
    try vm.r.arrPush(value.payload(p), b);
    return p;
}

fn objectAssign(vm: *Vm, args: []const Value) Err!Value {
    const target = arg(args, 0);
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

// ---- methods --------------------------------------------------------------

pub fn callMethod(vm: *Vm, id: u16, recv: Value, args: []const Value) Err!Value {
    const m: Method = @fromBackingInt(@intCast(id));
    return switch (value.kindOf(recv)) {
        .string => stringMethod(vm, m, recv, args),
        .array => arrayMethod(vm, m, recv, args),
        .number => numberMethod(vm, m, recv, args),
        .undefined, .null => vm.throwMsg(.type_error, "Cannot read properties of {s} (reading '{s}')", .{ if (value.kindOf(recv) == .null) "null" else "undefined", methodName(id) }),
        else => vm.throwMsg(.type_error, "value.{s} is not a function", .{methodName(id)}),
    };
}

fn notAFunction(vm: *Vm, m: Method) Err {
    return vm.throwMsg(.type_error, "value.{s} is not a function", .{methodName(@backingInt(m))});
}

/// ToIntegerOrInfinity: NaN (and so undefined) is 0, other values truncate.
fn integerOrInfinity(vm: *Vm, v: Value) Err!f64 {
    const f = @trunc(try vm.toNumber(v));
    return if (std.math.isNan(f)) 0 else f;
}

/// True when the position is below 0 after ToIntegerOrInfinity (out of range for charAt).
fn negativeIndex(vm: *Vm, v: Value) Err!bool {
    if (value.kindOf(v) == .undefined) return false;
    return try integerOrInfinity(vm, v) < 0;
}

const UnitByte = struct { byte: usize, inside: bool };

/// The byte offset of UTF-16 unit `unit` (clamped to the text), and whether the unit is
/// the second half of a surrogate pair (then `byte` is the start of that pair).
fn unitByte(bytes: []const u8, unit: u32) UnitByte {
    var u: u32 = 0;
    var i: usize = 0;
    // Each pass moves past one code point, so the byte length bounds the loop.
    while (i < bytes.len and u < unit) {
        const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch 1;
        if (n == 4 and u + 1 == unit and i + 4 <= bytes.len) return .{ .byte = i, .inside = true };
        u += if (n == 4) 2 else 1;
        i += n;
    }
    const at = @min(i, bytes.len);
    std.debug.assert(at <= bytes.len);
    return .{ .byte = at, .inside = false };
}

/// Clamp a relative index as String/Array slice does.
fn relIndex(vm: *Vm, v: Value, len: u32, default: u32) Err!u32 {
    if (value.kindOf(v) == .undefined) return default;
    const f = @trunc(try vm.toNumber(v));
    if (std.math.isNan(f)) return 0;
    const lf: f64 = @floatFromInt(len);
    const r = if (f < 0) @max(0, lf + f) else @min(f, lf);
    return @intFromFloat(r);
}

fn stringMethod(vm: *Vm, m: Method, s: Value, args: []const Value) Err!Value {
    const bytes = vm.str(s);
    return switch (m) {
        .to_upper_case, .to_lower_case => changeCase(vm, bytes, m == .to_upper_case),
        .trim => vm.newStr(numfmt.trimJs(bytes)),
        .locale_compare => blk: {
            // The CLDR root collation; the compiler allows only the call without locales or options.
            const other = try vm.toStr(arg(args, 0));
            break :blk value.num(@floatFromInt(try collate.compare(vm.scratch, bytes, vm.str(other))));
        },
        .normalize => blk: {
            const f = arg(args, 0);
            const name = if (value.kindOf(f) == .undefined) "NFC" else vm.str(try vm.toStr(f));
            const form = unorm.formOf(name) orelse
                return vm.throwMsg(.range_error, "The normalization form should be one of NFC, NFD, NFKC, NFKD.", .{});
            const t = vm.scratch.begin();
            defer t.end();
            break :blk vm.newStr(try unorm.normalize(vm.scratch, vm.str(s), form));
        },
        .trim_start => vm.newStr(bytes[startTrim(bytes)..]),
        .trim_end => vm.newStr(bytes[0..endTrim(bytes)]),
        .starts_with => blk: {
            const needle = vm.str(try vm.toStr(arg(args, 0)));
            const at = unitByte(vm.str(s), try clampIndex(vm, arg(args, 1), vm.utf16Len(s), 0));
            if (needle.len == 0) break :blk value.true_;
            // A text cannot start in the middle of a surrogate pair.
            if (at.inside) break :blk value.false_;
            break :blk value.boolean(std.mem.startsWith(u8, vm.str(s)[at.byte..], needle));
        },
        .ends_with => blk: {
            const needle = vm.str(try vm.toStr(arg(args, 0)));
            const len = vm.utf16Len(s);
            const at = unitByte(vm.str(s), try clampIndex(vm, arg(args, 1), len, len));
            if (needle.len == 0) break :blk value.true_;
            if (at.inside) break :blk value.false_;
            break :blk value.boolean(std.mem.endsWith(u8, vm.str(s)[0..at.byte], needle));
        },
        .includes => blk: {
            const needle = vm.str(try vm.toStr(arg(args, 0)));
            const at = unitByte(vm.str(s), try clampIndex(vm, arg(args, 1), vm.utf16Len(s), 0));
            if (needle.len == 0) break :blk value.true_;
            // A match cannot start in the middle of a pair: look from the end of the pair.
            const from = if (at.inside) at.byte + 4 else at.byte;
            break :blk value.boolean(std.mem.indexOfPos(u8, vm.str(s), from, needle) != null);
        },
        .index_of => blk: {
            const needle = vm.str(try vm.toStr(arg(args, 0)));
            // V8 clamps the position to 0..length; a negative position is 0.
            const from_units = try clampIndex(vm, arg(args, 1), vm.utf16Len(s), 0);
            if (needle.len == 0) break :blk value.num(@floatFromInt(from_units));
            const at = unitByte(vm.str(s), from_units);
            const from = if (at.inside) at.byte + 4 else at.byte;
            const pos = std.mem.indexOfPos(u8, vm.str(s), from, needle) orelse break :blk value.num(-1);
            break :blk value.num(@floatFromInt(ops.byteToUtf16(vm.str(s), pos)));
        },
        .slice => blk: {
            const len = vm.utf16Len(s);
            const a = try relIndex(vm, arg(args, 0), len, 0);
            const b = try relIndex(vm, arg(args, 1), len, len);
            break :blk substr(vm, s, a, @max(a, b));
        },
        .substring => blk: {
            const len = vm.utf16Len(s);
            const a = try clampIndex(vm, arg(args, 0), len, 0);
            const b = try clampIndex(vm, arg(args, 1), len, len);
            break :blk substr(vm, s, @min(a, b), @max(a, b));
        },
        .char_at => blk: {
            // A negative position is out of range (V8: ToIntegerOrInfinity, then the range check).
            if (try negativeIndex(vm, arg(args, 0))) break :blk vm.newStr("");
            const i = try clampIndex(vm, arg(args, 0), std.math.maxInt(u32), 0);
            const c = try vm.charAt(s, i);
            break :blk if (c == value.undef) vm.newStr("") else c;
        },
        .at => blk: {
            const len = vm.utf16Len(s);
            const f = try integerOrInfinity(vm, arg(args, 0));
            const idx = if (f < 0) @as(f64, @floatFromInt(len)) + f else f;
            if (!(idx >= 0 and idx < @as(f64, @floatFromInt(len)))) break :blk value.undef;
            break :blk vm.charAt(s, @intFromFloat(idx));
        },
        .char_code_at => charCodeAt(vm, s, args),
        .split => split(vm, s, args),
        .replace, .replace_all => replace(vm, s, args, m == .replace_all),
        .pad_start, .pad_end => pad(vm, s, args, m == .pad_start),
        .repeat => repeat(vm, bytes, try vm.toNumber(arg(args, 0))),
        .concat => blk: {
            const t = vm.scratch.begin();
            defer t.end();
            var b = vm.scratch.builder();
            try b.append(bytes);
            for (args) |a| try vm.appendString(&b, a);
            break :blk vm.newStr(b.bytes());
        },
        .to_string => s,
        else => notAFunction(vm, m),
    };
}

fn clampIndex(vm: *Vm, v: Value, len: u32, default: u32) Err!u32 {
    if (value.kindOf(v) == .undefined) return default;
    const f = @trunc(try vm.toNumber(v));
    if (std.math.isNan(f) or f < 0) return 0;
    return @intFromFloat(@min(f, @as(f64, @floatFromInt(len))));
}

fn substr(vm: *Vm, s: Value, a: u32, b: u32) Err!Value {
    return vm.sliceUtf16(s, a, b);
}

fn startTrim(s: []const u8) usize {
    const t = numfmt.trimJs(s);
    return if (t.len == 0) s.len else @intFromPtr(t.ptr) - @intFromPtr(s.ptr);
}

fn endTrim(s: []const u8) usize {
    const t = numfmt.trimJs(s);
    return if (t.len == 0) 0 else @intFromPtr(t.ptr) - @intFromPtr(s.ptr) + t.len;
}

/// String.prototype.toUpperCase / toLowerCase: the full Unicode mappings of
/// `unicase.zig`, with the Final_Sigma rule. Bytes that are not valid UTF-8
/// (lone surrogates) pass through unchanged.
fn changeCase(vm: *Vm, bytes: []const u8, upper: bool) Err!Value {
    for (bytes) |c| {
        if (c >= 0x80) break;
    } else {
        const out = try vm.r.newStringUninit(@intCast(bytes.len));
        for (bytes, 0..) |c, i| out.bytes[i] = if (upper) std.ascii.toUpper(c) else std.ascii.toLower(c);
        vm.r.finishString(out.v);
        return out.v;
    }
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    try caseMap(&b, bytes, upper);
    return vm.newStr(b.finish());
}

const Decoded = struct { cp: u21, len: u3 };

fn decodeAt(bytes: []const u8, i: usize) ?Decoded {
    const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch return null;
    if (i + n > bytes.len) return null;
    const cp = std.unicode.utf8Decode(bytes[i..][0..n]) catch return null;
    return .{ .cp = cp, .len = n };
}

/// Appends the case mapping of `bytes` to `b`.
fn caseMap(b: *Builder, bytes: []const u8, upper: bool) Err!void {
    var i: usize = 0;
    while (i < bytes.len) {
        const d = decodeAt(bytes, i) orelse {
            try b.byte(bytes[i]);
            i += 1;
            continue;
        };
        const m = if (upper)
            unicase.toUpper(d.cp)
        else if (d.cp == 0x3A3 and isFinalSigma(bytes, i, i + d.len))
            unicase.Mapped{ .len = 1, .cps = .{ 0x3C2, 0, 0 } }
        else
            unicase.toLower(d.cp);
        for (m.slice()) |cp| {
            var enc: [4]u8 = undefined;
            const n = std.unicode.utf8Encode(cp, &enc) catch unreachable;
            try b.append(enc[0..n]);
        }
        i += d.len;
    }
}

/// The Final_Sigma condition of SpecialCasing, as ICU checks it: a cased
/// letter before the sigma and none after it, skipping case-ignorable ones.
fn isFinalSigma(bytes: []const u8, start: usize, end: usize) bool {
    var j = start;
    const before = while (j > 0) {
        var k = j - 1;
        while (k > 0 and j - k < 4 and bytes[k] & 0xC0 == 0x80) k -= 1;
        const d = decodeAt(bytes, k) orelse break false;
        if (k + d.len != j) break false;
        j = k;
        if (unicase.isCaseIgnorable(d.cp)) continue;
        break unicase.isCased(d.cp);
    } else false;
    if (!before) return false;
    j = end;
    while (j < bytes.len) {
        const d = decodeAt(bytes, j) orelse return true;
        j += d.len;
        if (unicase.isCaseIgnorable(d.cp)) continue;
        return !unicase.isCased(d.cp);
    }
    return true;
}

fn charCodeAt(vm: *Vm, s: Value, args: []const Value) Err!Value {
    if (try negativeIndex(vm, arg(args, 0))) return value.num(std.math.nan(f64));
    const i = try clampIndex(vm, arg(args, 0), std.math.maxInt(u32), 0);
    const bytes = vm.str(s);
    // ASCII: a UTF-16 unit is a byte, so no scan from the start (a loop over
    // `charCodeAt(i)` would be quadratic).
    if (vm.utf16Len(s) == bytes.len) {
        return if (i < bytes.len) value.num(@floatFromInt(bytes[i])) else value.num(std.math.nan(f64));
    }
    var unit: u32 = 0;
    var p: usize = 0;
    // Go on from the last position found in this string when it is not past `i`.
    const key = value.payload(s);
    if (vm.unit_cache.p == key and vm.unit_cache.unit <= i) {
        unit = vm.unit_cache.unit;
        p = vm.unit_cache.byte;
        std.debug.assert(p <= bytes.len);
    }
    // Each pass moves past one code point, so the byte length bounds the loop.
    while (p < bytes.len) {
        const n = std.unicode.utf8ByteSequenceLength(bytes[p]) catch 1;
        const cp: u21 = if (n == 1) bytes[p] else std.unicode.utf8Decode(bytes[p..][0..n]) catch 0xFFFD;
        if (unit == i or (n == 4 and unit + 1 == i)) {
            vm.unit_cache = .{ .p = key, .unit = unit, .byte = @intCast(p) };
        }
        if (n == 4) {
            if (unit == i) return value.num(@floatFromInt(0xD800 + ((cp - 0x10000) >> 10)));
            if (unit + 1 == i) return value.num(@floatFromInt(0xDC00 + ((cp - 0x10000) & 0x3FF)));
            unit += 2;
        } else {
            if (unit == i) return value.num(@floatFromInt(cp));
            unit += 1;
        }
        p += n;
    }
    return value.num(std.math.nan(f64));
}

fn split(vm: *Vm, s: Value, args: []const Value) Err!Value {
    const sep_v = arg(args, 0);
    const out = try vm.r.newArray(4);
    const out_off = value.payload(out);
    const lim: u32 = if (value.kindOf(arg(args, 1)) == .undefined) std.math.maxInt(u32) else numfmt.toUint32(try vm.toNumber(arg(args, 1)));
    if (lim == 0) return out;
    if (value.kindOf(sep_v) == .undefined) {
        try vm.r.arrPush(out_off, s);
        return out;
    }
    const sep = try vm.toStr(sep_v);
    if (vm.str(sep).len == 0) {
        var i: u32 = 0;
        const len = vm.utf16Len(s);
        while (i < len and vm.r.at(heap.Arr, out_off).len < lim) : (i += 1) {
            const c = try vm.charAt(s, i);
            try vm.r.arrPush(out_off, c);
        }
        return out;
    }
    var start: usize = 0;
    while (vm.r.at(heap.Arr, out_off).len < lim) {
        const bytes = vm.str(s);
        const pos = std.mem.indexOfPos(u8, bytes, start, vm.str(sep)) orelse {
            const piece = try vm.newStr(vm.str(s)[start..]);
            try vm.r.arrPush(out_off, piece);
            break;
        };
        const piece = try vm.newStr(bytes[start..pos]);
        try vm.r.arrPush(out_off, piece);
        start = pos + vm.str(sep).len;
    }
    return out;
}

fn replace(vm: *Vm, s: Value, args: []const Value, all: bool) Err!Value {
    const pat = try vm.toStr(arg(args, 0));
    const rep = try vm.toStr(arg(args, 1));
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    const bytes = vm.str(s);
    const p = vm.str(pat);
    var start: usize = 0;
    while (true) {
        const pos = std.mem.indexOfPos(u8, bytes, start, p) orelse break;
        try b.append(bytes[start..pos]);
        try appendReplacement(&b, vm.str(rep), bytes, pos, p.len);
        start = pos + p.len;
        if (!all) break;
        if (p.len == 0) {
            if (start >= bytes.len) break;
            try b.byte(bytes[start]);
            start += 1;
        }
    }
    try b.append(bytes[start..]);
    return vm.newStr(b.bytes());
}

/// Expand $$, $&, $` and $' in a replacement string.
fn appendReplacement(b: *@import("arena.zig").Builder, rep: []const u8, subject: []const u8, pos: usize, len: usize) Err!void {
    var i: usize = 0;
    while (i < rep.len) : (i += 1) {
        if (rep[i] != '$' or i + 1 >= rep.len) {
            try b.byte(rep[i]);
            continue;
        }
        switch (rep[i + 1]) {
            '$' => try b.byte('$'),
            '&' => try b.append(subject[pos..][0..len]),
            '`' => try b.append(subject[0..pos]),
            '\'' => try b.append(subject[pos + len ..]),
            else => {
                try b.byte('$');
                continue;
            },
        }
        i += 1;
    }
}

fn pad(vm: *Vm, s: Value, args: []const Value, at_start: bool) Err!Value {
    const target_f = try vm.toNumber(arg(args, 0));
    const len = vm.utf16Len(s);
    if (!(target_f > @as(f64, @floatFromInt(len)))) return s;
    if (target_f > 1_000_000) return vm.limit(.memory);
    const filler = if (value.kindOf(arg(args, 1)) == .undefined) " " else vm.str(try vm.toStr(args[1]));
    if (filler.len == 0) return s;
    const need: usize = @as(usize, @intFromFloat(target_f)) - len;
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    if (!at_start) try b.append(vm.str(s));
    var units: usize = 0;
    var i: usize = 0;
    // Filler is treated as ASCII-like units; multi-byte fillers count bytes.
    while (units < need) : (units += 1) {
        try b.byte(filler[i]);
        i = (i + 1) % filler.len;
    }
    if (at_start) try b.append(vm.str(s));
    return vm.newStr(b.bytes());
}

fn repeat(vm: *Vm, bytes: []const u8, count_f: f64) Err!Value {
    if (std.math.isNan(count_f) or count_f < 0 or std.math.isInf(count_f)) return vm.throwMsg(.range_error, "Invalid count value: {d}", .{count_f});
    const count: usize = @intFromFloat(@trunc(count_f));
    if (count * bytes.len > 1_000_000) return vm.limit(.memory);
    const out = try vm.r.newStringUninit(@intCast(count * bytes.len));
    var i: usize = 0;
    while (i < count) : (i += 1) @memcpy(out.bytes[i * bytes.len ..][0..bytes.len], bytes);
    vm.r.finishString(out.v);
    return out.v;
}

fn arrayMethod(vm: *Vm, m: Method, a: Value, args: []const Value) Err!Value {
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
            const s = try relIndex(vm, arg(args, 0), len, 0);
            const e = @max(s, try relIndex(vm, arg(args, 1), len, len));
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
            const sep: []const u8 = if (value.kindOf(arg(args, 0)) == .undefined) "," else vm.str(try vm.toStr(args[0]));
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
            const from = try relIndex(vm, arg(args, 1), @intCast(items.len), 0);
            for (items[from..]) |item| if (vm.sameValueZero(item, arg(args, 0))) break :blk value.true_;
            break :blk value.false_;
        },
        .index_of => blk: {
            const items = vm.r.arrItems(off);
            const from = try relIndex(vm, arg(args, 1), @intCast(items.len), 0);
            for (items[from..], from..) |item, i| if (vm.strictEquals(item, arg(args, 0))) break :blk value.num(@floatFromInt(i));
            break :blk value.num(-1);
        },
        .reverse => blk: {
            std.mem.reverse(Value, vm.r.arrItems(off));
            break :blk a;
        },
        .at => blk: {
            const len: f64 = @floatFromInt(vm.r.at(heap.Arr, off).len);
            const f = try integerOrInfinity(vm, arg(args, 0));
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
        else => notAFunction(vm, m),
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

fn numberMethod(vm: *Vm, m: Method, n: Value, args: []const Value) Err!Value {
    const x = value.asNum(n);
    return switch (m) {
        .to_fixed => blk: {
            const d_f = try vm.toNumber(arg(args, 0));
            const d: usize = if (std.math.isNan(d_f)) 0 else @intFromFloat(@max(0, @min(100, @trunc(d_f))));
            if (@abs(x) >= 1e21 or std.math.isNan(x) or std.math.isInf(x)) break :blk vm.toStr(n);
            var buf: [160]u8 = undefined;
            const s = exactnum.toFixed(&buf, x, @intCast(d)) catch break :blk vm.toStr(n);
            break :blk vm.newStr(s);
        },
        .to_string => blk: {
            const r = arg(args, 0);
            if (value.kindOf(r) == .undefined) break :blk vm.toStr(n);
            // V8: ToIntegerOrInfinity of the radix, so 10.5 is 10 and NaN is 0 (a RangeError).
            const radix = try integerOrInfinity(vm, r);
            if (radix == 10) break :blk vm.toStr(n);
            break :blk radixString(vm, x, radix);
        },
        else => notAFunction(vm, m),
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

test {
    _ = date;
}

fn testCase(buf: []u8, input: []const u8, upper: bool) ![]const u8 {
    var a = @import("arena.zig").Arena.init(buf);
    var b = a.builder();
    try caseMap(&b, input, upper);
    return b.finish();
}

test "unitByte: UTF-16 positions, inside a surrogate pair, past the end" {
    const t = "a\u{1F600}bc";
    try std.testing.expectEqual(UnitByte{ .byte = 0, .inside = false }, unitByte(t, 0));
    try std.testing.expectEqual(UnitByte{ .byte = 1, .inside = false }, unitByte(t, 1));
    try std.testing.expectEqual(UnitByte{ .byte = 1, .inside = true }, unitByte(t, 2));
    try std.testing.expectEqual(UnitByte{ .byte = 5, .inside = false }, unitByte(t, 3));
    try std.testing.expectEqual(UnitByte{ .byte = 7, .inside = false }, unitByte(t, 99));
}

test "case mapping matches Node for each code point" {
    var sums = [2]std.hash.Fnv1a_64{ .init(), .init() };
    var cp: u21 = 0;
    while (cp <= 0x10FFFF) : (cp += 1) {
        if (cp >= 0xD800 and cp <= 0xDFFF) continue;
        var enc: [4]u8 = undefined;
        const n = try std.unicode.utf8Encode(cp, &enc);
        for (&sums, [2]bool{ true, false }) |*h, upper| {
            var out: [16]u8 = undefined;
            const got = try testCase(&out, enc[0..n], upper);
            h.update(got);
            h.update(&.{0});
        }
    }
    try std.testing.expectEqual(unicase.test_sum_upper, sums[0].final());
    try std.testing.expectEqual(unicase.test_sum_lower, sums[1].final());
}

test "canonicalize matches Node for each code unit" {
    var h = std.hash.Fnv1a_64.init();
    var inv: [unicase.max_inverse]u16 = undefined;
    var ch: u32 = 0;
    while (ch <= 0xFFFF) : (ch += 1) {
        const c: u16 = @intCast(ch);
        const cc = unicase.canonicalize(c);
        var text: [8]u8 = undefined;
        h.update(std.fmt.bufPrint(&text, "{d}", .{cc}) catch unreachable);
        h.update(&.{0});
        const members = unicase.canonicalizeInverse(cc, &inv);
        try std.testing.expect(std.mem.indexOfScalar(u16, members, c) != null);
    }
    try std.testing.expectEqual(unicase.test_sum_canonicalize, h.final());
}

test "case mapping of strings matches Node" {
    var lines = std.mem.tokenizeScalar(u8, @embedFile("testdata/unicase_cases.txt"), '\n');
    var buf: [512]u8 = undefined;
    while (lines.next()) |line| {
        var cols = std.mem.splitScalar(u8, line, '\t');
        const input = cols.next().?;
        const upper = cols.next().?;
        const lower = cols.next().?;
        try std.testing.expectEqualStrings(upper, try testCase(&buf, input, true));
        try std.testing.expectEqualStrings(lower, try testCase(&buf, input, false));
    }
    // Bytes that are not valid UTF-8 (a lone surrogate) pass through.
    try std.testing.expectEqualStrings("A\xED\xA0\x80\xCE\xA3", try testCase(&buf, "a\xED\xA0\x80\xCF\x83", true));
}
