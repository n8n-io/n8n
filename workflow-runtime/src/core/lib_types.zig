//! Shared native/method enums, name tables, and small argument helpers for the
//! fixed standard library. Lives below `lib_*.zig` so the domain files do not
//! cycle back through `lib.zig`.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");

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
    credential_flag,
};

pub const native_names = [_][]const u8{
    "Math.floor",         "Math.ceil",          "Math.round",        "Math.trunc",         "Math.abs",
    "Math.min",           "Math.max",           "Math.pow",          "Math.sqrt",          "Math.sign",
    "Math.log",           "Math.exp",           "JSON.stringify",    "JSON.parse",         "Object.keys",
    "Object.values",      "Object.entries",     "Object.assign",     "Array.isArray",      "Number",
    "String",             "Boolean",            "parseInt",          "parseFloat",         "isNaN",
    "Number.isInteger",   "Number.isFinite",    "RegExp.exec",       "btoa",               "atob",
    "encodeURIComponent", "decodeURIComponent", "escape",            "unescape",           "XML.parse",
    "XML.snippet",        "XML.content",        "ctx.staticData",    "ctx.polled",         "encodeURI",
    "Ascii.is",           "Ascii.isPrintable",  "Base64.encodeUtf8", "ctx.credentialFlag",
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

pub const method_names = [_][]const u8{
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
pub const date_base: u16 = 0x100;

comptime {
    std.debug.assert(native_names.len < date_base);
}

pub fn methodName(id: u16) []const u8 {
    return method_names[id];
}

pub fn arg(args: []const Value, i: usize) Value {
    return if (i < args.len) args[i] else value.undef;
}

pub fn numArg(vm: *Vm, args: []const Value, i: usize) Err!f64 {
    return vm.toNumber(arg(args, i));
}

pub fn notAFunction(vm: *Vm, m: Method) Err {
    return vm.throwMsg(.type_error, "value.{s} is not a function", .{methodName(@backingInt(m))});
}

/// ToIntegerOrInfinity: NaN (and so undefined) is 0, other values truncate.
pub fn integerOrInfinity(vm: *Vm, v: Value) Err!f64 {
    const f = @trunc(try vm.toNumber(v));
    return if (std.math.isNan(f)) 0 else f;
}
