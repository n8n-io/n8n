//! The Date subset (spec section 4.5). A Date is a number at run time: the
//! time value in ms since the epoch, or NaN for an invalid date. Workflows
//! run in UTC, so local-time methods equal the UTC methods.
//!
//! The arithmetic follows V8 (src/date/date.cc) and the string parser is a
//! port of the V8 date parser (src/date/dateparser*.{h,cc}), so results are
//! the same as in Node.js with TZ=UTC.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const date_fmt = @import("date_fmt.zig");
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

// ---- re-exports ------------------------------------------------------------

/// The pure date math, formatting, and parsing live in `date_fmt.zig` so that
/// `ops.zig` can import them without importing this file (no import cycle).
/// These re-exports keep the JSON codecs and the tests compiling unchanged.
pub const Format = date_fmt.Format;
pub const max_format_len = date_fmt.max_format_len;
pub const format = date_fmt.format;
pub const parse = date_fmt.parse;
pub const appendFormat = date_fmt.appendFormat;

// ---- library functions ------------------------------------------------------

pub const Op = enum(u8) {
    from_value,
    from_parts,
    utc,
    parse,
    json,
    text,
    zone_offset,
    value,
    of,
    is,
    set,
    get_time,
    to_iso,
    to_json,
    to_string,
    to_utc_string,
    to_date_string,
    to_time_string,
    to_locale_string,
    to_locale_date_string,
    to_locale_time_string,
    get_full_year,
    get_month,
    get_date,
    get_day,
    get_hours,
    get_minutes,
    get_seconds,
    get_milliseconds,
    get_timezone_offset,
    set_time,
    set_milliseconds,
    set_seconds,
    set_minutes,
    set_hours,
    set_date,
    set_month,
    set_full_year,
};

const Entry = struct { name: []const u8, op: Op };

/// CALLN names (spec section 4.3). Local and UTC forms share an op.
pub const names = [_]Entry{
    .{ .name = "Date.fromValue", .op = .from_value },
    .{ .name = "Date.fromParts", .op = .from_parts },
    .{ .name = "Date.UTC", .op = .utc },
    .{ .name = "Date.parse", .op = .parse },
    .{ .name = "Date.json", .op = .json },
    .{ .name = "Date.zoneOffset", .op = .zone_offset },
    .{ .name = "Date.text", .op = .text },
    .{ .name = "Date.prototype.getTime", .op = .get_time },
    .{ .name = "Date.prototype.valueOf", .op = .get_time },
    .{ .name = "Date.prototype.toISOString", .op = .to_iso },
    .{ .name = "Date.prototype.toJSON", .op = .to_json },
    .{ .name = "Date.prototype.toString", .op = .to_string },
    .{ .name = "Date.prototype.toUTCString", .op = .to_utc_string },
    .{ .name = "Date.prototype.toGMTString", .op = .to_utc_string },
    .{ .name = "Date.prototype.toDateString", .op = .to_date_string },
    .{ .name = "Date.prototype.toTimeString", .op = .to_time_string },
    .{ .name = "Date.prototype.toLocaleString", .op = .to_locale_string },
    .{ .name = "Date.prototype.toLocaleDateString", .op = .to_locale_date_string },
    .{ .name = "Date.prototype.toLocaleTimeString", .op = .to_locale_time_string },
    .{ .name = "Date.prototype.getFullYear", .op = .get_full_year },
    .{ .name = "Date.prototype.getUTCFullYear", .op = .get_full_year },
    .{ .name = "Date.prototype.getMonth", .op = .get_month },
    .{ .name = "Date.prototype.getUTCMonth", .op = .get_month },
    .{ .name = "Date.prototype.getDate", .op = .get_date },
    .{ .name = "Date.prototype.getUTCDate", .op = .get_date },
    .{ .name = "Date.prototype.getDay", .op = .get_day },
    .{ .name = "Date.prototype.getUTCDay", .op = .get_day },
    .{ .name = "Date.prototype.getHours", .op = .get_hours },
    .{ .name = "Date.prototype.getUTCHours", .op = .get_hours },
    .{ .name = "Date.prototype.getMinutes", .op = .get_minutes },
    .{ .name = "Date.prototype.getUTCMinutes", .op = .get_minutes },
    .{ .name = "Date.prototype.getSeconds", .op = .get_seconds },
    .{ .name = "Date.prototype.getUTCSeconds", .op = .get_seconds },
    .{ .name = "Date.prototype.getMilliseconds", .op = .get_milliseconds },
    .{ .name = "Date.prototype.getUTCMilliseconds", .op = .get_milliseconds },
    .{ .name = "Date.prototype.getTimezoneOffset", .op = .get_timezone_offset },
    .{ .name = "Date.prototype.setTime", .op = .set_time },
    .{ .name = "Date.prototype.setMilliseconds", .op = .set_milliseconds },
    .{ .name = "Date.prototype.setUTCMilliseconds", .op = .set_milliseconds },
    .{ .name = "Date.prototype.setSeconds", .op = .set_seconds },
    .{ .name = "Date.prototype.setUTCSeconds", .op = .set_seconds },
    .{ .name = "Date.prototype.setMinutes", .op = .set_minutes },
    .{ .name = "Date.prototype.setUTCMinutes", .op = .set_minutes },
    .{ .name = "Date.prototype.setHours", .op = .set_hours },
    .{ .name = "Date.prototype.setUTCHours", .op = .set_hours },
    .{ .name = "Date.prototype.setDate", .op = .set_date },
    .{ .name = "Date.prototype.setUTCDate", .op = .set_date },
    .{ .name = "Date.prototype.setMonth", .op = .set_month },
    .{ .name = "Date.prototype.setUTCMonth", .op = .set_month },
    .{ .name = "Date.prototype.setFullYear", .op = .set_full_year },
    .{ .name = "Date.prototype.setUTCFullYear", .op = .set_full_year },
    .{ .name = "Date.value", .op = .value },
    .{ .name = "Date.of", .op = .of },
    .{ .name = "Date.is", .op = .is },
    .{ .name = "Date.set", .op = .set },
};

pub fn id(name: []const u8) ?u16 {
    for (names, 0..) |e, i| if (std.mem.eql(u8, e.name, name)) return @intCast(i);
    return null;
}

fn arg(args: []const Value, i: usize) Value {
    return if (i < args.len) args[i] else value.undef;
}

/// The time value of a receiver. A Date is a number at run time.
fn thisTime(vm: *Vm, args: []const Value, i: u16) Err!f64 {
    const recv = arg(args, 0);
    return switch (value.kindOf(recv)) {
        .number => value.asNum(recv),
        .undefined, .null => vm.throwMsg(.type_error, "Cannot read properties of {s} (reading '{s}')", .{
            if (value.kindOf(recv) == .null) "null" else "undefined",
            names[i].name["Date.prototype.".len..],
        }),
        else => vm.throwMsg(.type_error, "this is not a Date object.", .{}),
    };
}

fn formatted(vm: *Vm, t: f64, f: date_fmt.Format) Err!Value {
    if (std.math.isNan(t)) return vm.newStr("Invalid Date");
    var buf: [date_fmt.max_format_len]u8 = @splat(0);
    return vm.newStr(date_fmt.format(&buf, t, f));
}

/// Converts the setter arguments (after the receiver) to numbers.
fn setterArgs(vm: *Vm, args: []const Value, out: *[4]f64) Err![]const f64 {
    const n = @min(if (args.len > 0) args.len - 1 else 0, 4);
    var i: usize = 0;
    while (i < @max(n, 1)) : (i += 1) out[i] = try vm.toNumber(arg(args, i + 1));
    return out[0..@max(n, 1)];
}

pub fn call(vm: *Vm, i: u16, args: []const Value) Err!Value {
    std.debug.assert(i < names.len);
    const op = names[i].op;
    if (@backingInt(op) < @backingInt(Op.get_time)) return callStatic(vm, op, args);
    const t = try thisTime(vm, args, i);
    return callMethod(vm, op, t, args);
}

/// The functions that take no receiver.
/// `Date.zoneOffset(zone, t)`: minutes from UTC of an IANA zone at time value
/// `t` (spec section 4.5). The zone must be in the module's META `zones`, so
/// the shell sent its TZif data. An unknown zone throws, as `Intl` does.
fn zoneOffset(vm: *Vm, args: []const Value) Err!Value {
    const name = vm.str(try vm.toStr(arg(args, 0)));
    const t = try vm.toNumber(arg(args, 1));
    if (std.math.isNan(t)) return value.num(std.math.nan(f64));
    if (std.mem.eql(u8, name, "UTC") or std.mem.eql(u8, name, "Etc/UTC")) return value.num(0);
    for (vm.env.zones) |*z| {
        if (!std.mem.eql(u8, z.name(), name)) continue;
        const secs: i64 = @intFromFloat(@floor(t / 1000));
        return value.num(@as(f64, @floatFromInt(z.offsetAt(secs))) / 60);
    }
    // A zone that did not fit is a limit with a clear message, not an unknown zone.
    if (vm.env.zones_full) {
        return vm.throwMsg(.range_error, "Time zone {s} is not loaded: the zone table is full ({d} zones, raise --max-zones)", .{ name, vm.env.zones_cap });
    }
    return vm.throwMsg(.range_error, "Invalid time zone specified: {s}", .{name});
}

fn callStatic(vm: *Vm, op: Op, args: []const Value) Err!Value {
    switch (op) {
        .from_value => return value.num(try fromValue(vm, arg(args, 0))),
        .from_parts, .utc => {
            var n: [7]f64 = @splat(0);
            const count = @min(args.len, 7);
            for (0..count) |k| n[k] = try vm.toNumber(args[k]);
            return value.num(date_fmt.fromParts(n[0..count], op == .utc));
        },
        .parse => return value.num(date_fmt.parse(vm.str(try vm.toStr(arg(args, 0))))),
        .json => {
            const v = arg(args, 0);
            if (value.kindOf(v) != .number) return v;
            const t = value.asNum(v);
            if (std.math.isNan(t)) return value.null_;
            return formatted(vm, t, .iso);
        },
        .text => {
            const v = arg(args, 0);
            if (value.kindOf(v) != .number) return vm.toStr(v);
            return formatted(vm, value.asNum(v), .string);
        },
        .zone_offset => return zoneOffset(vm, args),
        .value => {
            const v = arg(args, 0);
            if (value.kindOf(v) != .number) return v;
            return value.box(.ref, try vm.r.newDate(value.asNum(v)));
        },
        .is => return value.boolean(vm.dateTime(arg(args, 0)) != null),
        .set => {
            // A setter of a Date value: each reference to the value reads the new time.
            const v = arg(args, 0);
            if (vm.dateTime(v) == null) return vm.throwMsg(.type_error, "this is not a Date object.", .{});
            const t = date_fmt.timeClip(try vm.toNumber(arg(args, 1)));
            vm.r.setDateTime(value.payload(v), t);
            return value.num(t);
        },
        .of => {
            const v = arg(args, 0);
            if (vm.dateTime(v)) |t| return value.num(t);
            if (value.isNullish(v)) {
                return vm.throwMsg(.type_error, "Cannot read properties of {s} (reading '{s}')", .{
                    if (value.kindOf(v) == .null) "null" else "undefined",
                    vm.str(try vm.toStr(arg(args, 1))),
                });
            }
            return vm.throwMsg(.type_error, "{s} is not a function", .{vm.str(try vm.toStr(arg(args, 2)))});
        },
        else => unreachable, // `call` routes every Op here; the enum is closed.
    }
}

/// A Date method on the time value `t` of the receiver.
fn callMethod(vm: *Vm, op: Op, t: f64, args: []const Value) Err!Value {
    const nan = std.math.nan(f64);
    switch (op) {
        .get_time => return value.num(t),
        .to_iso => {
            if (std.math.isNan(t)) return vm.throwMsg(.range_error, "Invalid time value", .{});
            return formatted(vm, t, .iso);
        },
        .to_json => return if (std.math.isNan(t)) value.null_ else formatted(vm, t, .iso),
        .to_string => return formatted(vm, t, .string),
        .to_utc_string => return formatted(vm, t, .utc),
        .to_date_string => return formatted(vm, t, .date),
        .to_time_string => return formatted(vm, t, .time),
        .to_locale_string => return formatted(vm, t, .locale),
        .to_locale_date_string => return formatted(vm, t, .locale_date),
        .to_locale_time_string => return formatted(vm, t, .locale_time),
        .get_timezone_offset => return value.num(if (std.math.isNan(t)) nan else 0),
        .get_full_year, .get_month, .get_date, .get_day, .get_hours, .get_minutes, .get_seconds, .get_milliseconds => {
            if (std.math.isNan(t)) return value.num(nan);
            const p = date_fmt.breakDown(t);
            const r = switch (op) {
                .get_full_year => p.year,
                .get_month => p.month,
                .get_date => p.day,
                .get_day => p.weekday,
                .get_hours => p.hour,
                .get_minutes => p.minute,
                .get_seconds => p.second,
                else => p.ms, // the only case left: milliseconds.
            };
            return value.num(@floatFromInt(r));
        },
        else => {}, // a setter: handled below.
    }
    var buf: [4]f64 = @splat(0);
    const a = try setterArgs(vm, args, &buf);
    return value.num(set(op, t, a));
}

/// A setter: the new time value. `a` holds the arguments as numbers; its
/// length is the argument count (at least 1).
pub fn set(op: Op, t: f64, a: []const f64) f64 {
    std.debug.assert(a.len >= 1 and a.len <= 4);
    const nan = std.math.nan(f64);
    const get = struct {
        fn f(xs: []const f64, i: usize, default: f64) f64 {
            return if (i < xs.len) xs[i] else default;
        }
    }.f;
    if (op == .set_time) return date_fmt.timeClip(a[0]);
    if (op == .set_full_year) {
        // An invalid date counts as +0 here.
        const p = date_fmt.breakDown(if (std.math.isNan(t)) 0 else t);
        const day = date_fmt.makeDay(a[0], get(a, 1, @floatFromInt(p.month)), get(a, 2, @floatFromInt(p.day)));
        return date_fmt.timeClip(date_fmt.makeDate(day, @floatFromInt(p.in_day)));
    }
    if (std.math.isNan(t)) return nan;
    const p = date_fmt.breakDown(t);
    const h: f64 = @floatFromInt(p.hour);
    const mi: f64 = @floatFromInt(p.minute);
    const s: f64 = @floatFromInt(p.second);
    const ms: f64 = @floatFromInt(p.ms);
    const days: f64 = @floatFromInt(p.days);
    const in_day: f64 = @floatFromInt(p.in_day);
    const r = switch (op) {
        .set_milliseconds => date_fmt.makeDate(days, date_fmt.makeTime(h, mi, s, a[0])),
        .set_seconds => date_fmt.makeDate(days, date_fmt.makeTime(h, mi, a[0], get(a, 1, ms))),
        .set_minutes => date_fmt.makeDate(days, date_fmt.makeTime(h, a[0], get(a, 1, s), get(a, 2, ms))),
        .set_hours => date_fmt.makeDate(days, date_fmt.makeTime(a[0], get(a, 1, mi), get(a, 2, s), get(a, 3, ms))),
        .set_date => date_fmt.makeDate(date_fmt.makeDay(@floatFromInt(p.year), @floatFromInt(p.month), a[0]), in_day),
        .set_month => date_fmt.makeDate(date_fmt.makeDay(@floatFromInt(p.year), a[0], get(a, 1, @floatFromInt(p.day))), in_day),
        else => unreachable, // the receiver methods cover the getters; only setters reach here.
    };
    return date_fmt.timeClip(r);
}

/// `new Date(value)` with one argument.
fn fromValue(vm: *Vm, v: Value) Err!f64 {
    return switch (value.kindOf(v)) {
        .number => date_fmt.timeClip(value.asNum(v)),
        .string => date_fmt.parse(vm.str(v)),
        .array, .object => date_fmt.parse(vm.str(try vm.toStr(v))),
        // `new Date(d)` of a Date has the time value of `d`.
        .ref => vm.dateTime(v) orelse date_fmt.parse(vm.str(try vm.toStr(v))),
        else => date_fmt.timeClip(try vm.toNumber(v)),
    };
}

// ---- tests ----------------------------------------------------------------

fn testFormat(t: f64, f: date_fmt.Format) []const u8 {
    const S = struct {
        var buf: [date_fmt.max_format_len]u8 = @splat(0);
    };
    return date_fmt.format(&S.buf, t, f);
}

test "formats match V8" {
    try std.testing.expectEqualStrings("1970-01-01T00:00:00.000Z", testFormat(0, .iso));
    try std.testing.expectEqualStrings("1969-12-31T23:59:59.999Z", testFormat(-1, .iso));
    try std.testing.expectEqualStrings("+275760-09-13T00:00:00.000Z", testFormat(8.64e15, .iso));
    try std.testing.expectEqualStrings("-271821-04-20T00:00:00.000Z", testFormat(-8.64e15, .iso));
    try std.testing.expectEqualStrings("Tue Apr 20 -271821", testFormat(-8.64e15, .date));
    try std.testing.expectEqualStrings("Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)", testFormat(0, .string));
    try std.testing.expectEqualStrings("Thu, 01 Jan 1970 00:00:00 GMT", testFormat(0, .utc));
    try std.testing.expectEqualStrings("12/31/1969, 11:59:59 PM", testFormat(-1, .locale));
    try std.testing.expectEqualStrings("4/20/271822", testFormat(-8.64e15, .locale_date));
}

test "parser handles ISO and legacy forms" {
    try std.testing.expectEqual(@as(f64, 0), date_fmt.parse("1970-01-01"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), date_fmt.parse("2020-01-01T00:00:00Z"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), date_fmt.parse("2020-01-01 00:00"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), date_fmt.parse("Wed, 01 Jan 2020 00:00:00 GMT"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), date_fmt.parse("Wed Jan 01 2020 01:00:00 GMT+0100 (CET)"));
    try std.testing.expect(std.math.isNan(date_fmt.parse("2020-13-01")));
    try std.testing.expect(std.math.isNan(date_fmt.parse("hello")));
    try std.testing.expect(std.math.isNan(date_fmt.parse("")));
}

test "setters and parts" {
    try std.testing.expectEqual(@as(f64, 86_400_000), set(.set_date, 0, &.{2}));
    try std.testing.expectEqual(@as(f64, 0), set(.set_full_year, std.math.nan(f64), &.{1970}));
    try std.testing.expect(std.math.isNan(set(.set_hours, std.math.nan(f64), &.{1})));
    try std.testing.expectEqual(@as(f64, 951_782_400_000), date_fmt.fromParts(&.{ 2000, 1, 29 }, false));
    try std.testing.expectEqual(@as(f64, -2_208_988_800_000), date_fmt.fromParts(&.{0}, true));
}
