//! Cron expressions and the next-slot function for schedule triggers.
//!
//! The parser follows the `cron` npm package (v4.4.0) that n8n's Schedule
//! Trigger uses: 5 or 6 fields, presets, three-letter names, `*`, ranges,
//! steps and lists. It rejects `?` and `L`, as that package does.
//!
//! `nextSlot` is pure. It matches the package's results, also at DST changes
//! (see the spec, section "Schedule triggers"):
//! * A local time in a spring-forward gap fires once, at the end of the gap.
//!   In zones where January is daylight time (southern hemisphere), it fires
//!   at the local time shifted by the gap, as the package does.
//! * A local time that occurs twice fires on its first pass. The second pass
//!   fires only when the hour field allows both that hour and the next one
//!   (for example `*/15 * * * *` or `0 * * * *`), so sub-hourly schedules
//!   keep their rhythm in absolute time.
const std = @import("std");
const tz = @import("tz.zig");

pub const Unit = enum(u8) { none, seconds, minutes, hours, days, weeks, months };

pub const Spec = struct {
    sec: u64 = 0,
    min: u64 = 0,
    hour: u32 = 0,
    /// Bits 1..31.
    dom: u32 = 0,
    /// Bits 1..12.
    mon: u16 = 0,
    /// Bits 0..6, 0 = Sunday.
    dow: u8 = 0,
    /// An extra filter for `every` intervals that do not divide their parent
    /// unit (for example every 7 minutes): the local unit index since the
    /// epoch must be a multiple of `rec_n`.
    rec_unit: Unit = .none,
    rec_n: u32 = 1,

    fn domRestricted(s: *const Spec) bool {
        return @popCount(s.dom) != 31;
    }
    fn dowRestricted(s: *const Spec) bool {
        return @popCount(s.dow) != 7;
    }
};

pub const ParseError = error{ BadCron, BadEvery };

const Field = enum { second, minute, hour, dom, month, dow };
const lows = [_]u32{ 0, 0, 0, 1, 1, 0 };
const highs = [_]u32{ 59, 59, 23, 31, 12, 7 };

const presets = [_][2][]const u8{
    .{ "@yearly", "0 0 0 1 1 *" },
    .{ "@monthly", "0 0 0 1 * *" },
    .{ "@weekly", "0 0 0 * * 0" },
    .{ "@daily", "0 0 0 * * *" },
    .{ "@hourly", "0 0 * * * *" },
    .{ "@minutely", "0 * * * * *" },
    .{ "@secondly", "* * * * * *" },
    .{ "@weekdays", "0 0 0 * * 1-5" },
    .{ "@weekends", "0 0 0 * * 0,6" },
};

const aliases = [_][]const u8{ "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "sun", "mon", "tue", "wed", "thu", "fri", "sat" };

fn aliasValue(word: []const u8) ?u32 {
    for (aliases, 0..) |a, i| {
        if (std.mem.eql(u8, a, word)) return if (i < 12) @intCast(i + 1) else @intCast(i - 12);
    }
    return null;
}

/// Lower-case the expression, expand a preset, and replace names with
/// numbers, as the npm package does. Letters run in groups of up to three.
fn normalise(text: []const u8, out: []u8) ParseError![]const u8 {
    var lower: [256]u8 = undefined;
    if (text.len > lower.len) return error.BadCron;
    for (text, 0..) |ch, i| lower[i] = std.ascii.toLower(ch);
    var src: []const u8 = std.mem.trim(u8, lower[0..text.len], " \t\r\n");
    for (presets) |p| if (std.mem.eql(u8, src, p[0])) {
        src = p[1];
    };
    var n: usize = 0;
    var i: usize = 0;
    while (i < src.len) {
        if (std.ascii.isAlphabetic(src[i])) {
            var j = i;
            while (j < src.len and j - i < 3 and std.ascii.isAlphabetic(src[j])) j += 1;
            const v = aliasValue(src[i..j]) orelse return error.BadCron;
            const w = std.fmt.bufPrint(out[n..], "{d}", .{v}) catch return error.BadCron;
            n += w.len;
            i = j;
            continue;
        }
        if (n == out.len) return error.BadCron;
        out[n] = src[i];
        n += 1;
        i += 1;
    }
    return out[0..n];
}

fn parseNum(s: []const u8) ParseError!u32 {
    if (s.len == 0 or s.len > 4) return error.BadCron;
    var v: u32 = 0;
    for (s) |ch| {
        if (!std.ascii.isDigit(ch)) return error.BadCron;
        v = v * 10 + (ch - '0');
    }
    return v;
}

/// One field: a comma list of `*`, `N`, `N-M`, `N/S`, `N-M/S`, `*/S`.
fn parseField(text: []const u8, f: Field) ParseError!u64 {
    const lo = lows[@backingInt(f)];
    const hi = highs[@backingInt(f)];
    var bits: u64 = 0;
    var it = std.mem.splitScalar(u8, text, ',');
    while (it.next()) |item0| {
        if (item0.len == 0) return error.BadCron;
        if (std.mem.indexOfScalar(u8, item0, '*')) |w| if (w != 0) return error.BadCron;
        var lower: u32 = undefined;
        var upper: ?u32 = null;
        var step: u32 = 1;
        var has_step = false;
        var item = item0;
        if (std.mem.indexOfScalar(u8, item, '/')) |sl| {
            step = try parseNum(item[sl + 1 ..]);
            has_step = true;
            item = item[0..sl];
        }
        if (std.mem.eql(u8, item, "*")) {
            lower = lo;
            upper = hi;
        } else if (std.mem.indexOfScalar(u8, item, '-')) |dash| {
            lower = try parseNum(item[0..dash]);
            upper = try parseNum(item[dash + 1 ..]);
        } else lower = try parseNum(item);
        if (step == 0) return error.BadCron;
        if (upper) |u| if (lower > u) return error.BadCron;
        if (lower < lo or lower > hi) return error.BadCron;
        if (upper) |u| if (u > hi) return error.BadCron;
        const top: u32 = upper orelse if (has_step) hi else lower;
        var p = lower;
        while (p <= top) : (p += step) bits |= @as(u64, 1) << @intCast(p);
    }
    if (f == .dow and bits & (1 << 7) != 0) {
        // 7 is Sunday too.
        bits = (bits & 0x7F) | 1;
    }
    return bits;
}

pub fn parse(text: []const u8) ParseError!Spec {
    var buf: [512]u8 = undefined;
    const src = try normalise(text, &buf);
    var fields: [6][]const u8 = undefined;
    var nf: usize = 0;
    var it = std.mem.tokenizeAny(u8, src, " \t\r\n");
    while (it.next()) |tok| {
        if (nf == 6) return error.BadCron;
        fields[nf] = tok;
        nf += 1;
    }
    if (nf < 5) return error.BadCron;
    // Five fields: seconds is 0.
    const off: usize = 6 - nf;
    var s: Spec = .{};
    s.sec = if (off == 1) 1 else try parseField(fields[0], .second);
    s.min = try parseField(fields[1 - off], .minute);
    s.hour = @intCast(try parseField(fields[2 - off], .hour));
    s.dom = @intCast(try parseField(fields[3 - off], .dom));
    s.mon = @intCast(try parseField(fields[4 - off], .month));
    s.dow = @intCast(try parseField(fields[5 - off], .dow));
    return s;
}

pub const Every = struct {
    unit: Unit,
    value: u32,
    at_hour: ?u32 = null,
    at_minute: ?u32 = null,
    /// Bits 0..6. Zero means not given.
    weekdays: u8 = 0,
    weekdays_given: bool = false,
    day_of_month: ?u32 = null,
};

fn stepBits(lo: u32, hi: u32, step: u32) u64 {
    var b: u64 = 0;
    var p = lo;
    while (p <= hi) : (p += step) b |= @as(u64, 1) << @intCast(p);
    return b;
}

/// Map an n8n Schedule Trigger interval onto a spec, as n8n's
/// `toCronExpression` and `recurrenceCheck` do. n8n fills a missing second,
/// minute, hour or day with a stable pseudo-random value; this uses 0, the
/// given minute and hour (default 0) and the given day (default 1).
pub fn fromEvery(e: Every) ParseError!Spec {
    const v = e.value;
    var s: Spec = .{ .sec = 1, .min = stepBits(0, 59, 1), .hour = @intCast(stepBits(0, 23, 1)), .dom = @intCast(stepBits(1, 31, 1)), .mon = @intCast(stepBits(1, 12, 1)), .dow = 0x7F };
    if (e.at_hour) |h| if (h > 23) return error.BadEvery;
    if (e.at_minute) |m| if (m > 59) return error.BadEvery;
    const at_min: u64 = @as(u64, 1) << @intCast(e.at_minute orelse 0);
    const at_hour: u32 = @as(u32, 1) << @intCast(e.at_hour orelse 0);
    switch (e.unit) {
        .none => return error.BadEvery,
        .seconds => {
            if (v < 1 or v > 59) return error.BadEvery;
            s.sec = stepBits(0, 59, v);
        },
        .minutes => {
            if (v < 1 or v > 59) return error.BadEvery;
            if (60 % v == 0) s.min = stepBits(0, 59, v) else s.rec_unit = .minutes;
        },
        .hours => {
            if (v < 1 or v > 23) return error.BadEvery;
            s.min = at_min;
            if (24 % v == 0) s.hour = @intCast(stepBits(0, 23, v)) else s.rec_unit = .hours;
        },
        .days => {
            if (v < 1 or v > 31) return error.BadEvery;
            s.min = at_min;
            s.hour = at_hour;
            if (v != 1) s.rec_unit = .days;
        },
        .weeks => {
            if (v < 1) return error.BadEvery;
            s.min = at_min;
            s.hour = at_hour;
            // n8n's default is Sunday; an empty list means every day.
            s.dow = if (!e.weekdays_given) 1 else if (e.weekdays == 0) 0x7F else e.weekdays;
            if (v != 1) s.rec_unit = .weeks;
        },
        .months => {
            if (v < 1) return error.BadEvery;
            const d = e.day_of_month orelse 1;
            if (d < 1 or d > 31) return error.BadEvery;
            s.min = at_min;
            s.hour = at_hour;
            s.dom = @as(u32, 1) << @intCast(d);
            if (12 % v == 0) s.mon = @intCast(stepBits(1, 12, v)) else s.rec_unit = .months;
        },
    }
    if (s.rec_unit != .none) s.rec_n = v;
    return s;
}

// ---- matching on local wall time ---------------------------------------------

/// Wall time is local time written as if it were UTC, in seconds.
const Wall = struct {
    days: i64,
    y: i64,
    m: u32,
    d: u32,
    h: u32,
    mi: u32,
    s: u32,

    fn of(w: i64) Wall {
        const days = @divFloor(w, 86400);
        const sod: u32 = @intCast(w - days * 86400);
        const c = tz.civilFromDays(days);
        return .{ .days = days, .y = c.y, .m = c.m, .d = c.d, .h = sod / 3600, .mi = (sod / 60) % 60, .s = sod % 60 };
    }
};

fn recOk(s: *const Spec, unit: Unit, index: i64) bool {
    if (s.rec_unit != unit) return true;
    return @mod(index, @as(i64, s.rec_n)) == 0;
}

fn monthOk(s: *const Spec, y: i64, m: u32) bool {
    return s.mon & (@as(u16, 1) << @intCast(m)) != 0 and recOk(s, .months, y * 12 + m - 1);
}

fn dayOk(s: *const Spec, days: i64, d: u32) bool {
    const wd = tz.weekday(days);
    const dom_hit = s.dom & (@as(u32, 1) << @intCast(d)) != 0;
    const dow_hit = s.dow & (@as(u8, 1) << @intCast(wd)) != 0;
    const dom_r = s.domRestricted();
    const dow_r = s.dowRestricted();
    // Vixie cron: when both fields are restricted, either one matches.
    const hit = if (dom_r and dow_r) dom_hit or dow_hit else if (dom_r) dom_hit else if (dow_r) dow_hit else true;
    return hit and recOk(s, .days, days) and recOk(s, .weeks, @divFloor(days + 4, 7));
}

fn hourOk(s: *const Spec, days: i64, h: u32) bool {
    return s.hour & (@as(u32, 1) << @intCast(h)) != 0 and recOk(s, .hours, days * 24 + h);
}

fn minuteOk(s: *const Spec, days: i64, h: u32, mi: u32) bool {
    return s.min & (@as(u64, 1) << @intCast(mi)) != 0 and recOk(s, .minutes, days * 1440 + h * 60 + mi);
}

/// The first matching wall time in `[from, limit)`, or null.
fn findWall(s: *const Spec, from: i64, limit: i64) ?i64 {
    var w = from;
    var guard: u32 = 0;
    // Each pass moves to the next month, day, hour, minute or second that
    // can match, so eight years need far fewer passes than this bound.
    while (guard < 2_000_000) : (guard += 1) {
        if (w >= limit) return null;
        const t = Wall.of(w);
        if (!monthOk(s, t.y, t.m)) {
            const ny = if (t.m == 12) t.y + 1 else t.y;
            const nm: u32 = if (t.m == 12) 1 else t.m + 1;
            w = tz.daysFromCivil(ny, nm, 1) * 86400;
            continue;
        }
        if (!dayOk(s, t.days, t.d)) {
            w = (t.days + 1) * 86400;
            continue;
        }
        const day0 = t.days * 86400;
        if (!hourOk(s, t.days, t.h)) {
            w = day0 + @as(i64, t.h + 1) * 3600;
            continue;
        }
        if (!minuteOk(s, t.days, t.h, t.mi)) {
            w = day0 + @as(i64, t.h) * 3600 + @as(i64, t.mi + 1) * 60;
            continue;
        }
        const rest = s.sec >> @intCast(t.s);
        if (rest == 0) {
            w = day0 + @as(i64, t.h) * 3600 + @as(i64, t.mi + 1) * 60;
            continue;
        }
        return w + @ctz(rest);
    }
    std.debug.assert(false);
    return null;
}

/// Search horizon, as in the npm package: about eight years.
pub const horizon_s: i64 = 8 * 366 * 86400;

/// The first slot strictly after `after_ms`, in ms since the epoch, or null
/// when the spec has no slot in the next eight years.
pub fn nextSlot(s: *const Spec, after_ms: i64, zone: *const tz.Zone) ?i64 {
    std.debug.assert(zone.n <= tz.max_transitions);
    const first = @divFloor(after_ms, 1000) + 1;
    const end = first + horizon_s;
    // When the search starts in the second pass of a repeated hour, the npm
    // package keeps walking local time there, so later matches in that
    // pass fire.
    const start_second_end = secondPassEnd(zone, first - 1);
    var t = first;
    var segments: u32 = 0;
    // One pass per offset change: about two per year.
    while (t < end and segments < 1024) : (segments += 1) {
        const off = zone.offsetAt(t);
        const next = zone.nextTransition(t);
        const seg_end = if (next) |n| @min(n.at, end) else end;
        const second_end = secondPassEnd(zone, t);
        var w = t + off;
        while (findWall(s, w, seg_end + off)) |found| {
            const inst = found - off;
            if (inst < second_end and inst >= start_second_end and !secondPassFires(s, found)) {
                // Skip the rest of the repeated local time.
                w = second_end + off;
                continue;
            }
            std.debug.assert(inst * 1000 > after_ms);
            return inst * 1000;
        }
        if (next) |n| if (n.at < end and n.after > n.before) {
            if (findWall(s, n.at + n.before, n.at + n.after)) |w0| return gapSlot(zone, n, w0) * 1000;
        };
        t = seg_end;
    }
    return null;
}

/// Instants in `[p.at, end)` after a backward change repeat local times
/// that already occurred. Returns that end, or `t` when `t` is not in it.
fn secondPassEnd(zone: *const tz.Zone, t: i64) i64 {
    const p = zone.prevTransition(t) orelse return t;
    if (p.before <= p.after) return t;
    return @max(t, p.at + (p.before - p.after));
}

/// The npm package reaches the second pass of hour h through a match in
/// the hour after it, which can be on the next day.
fn secondPassFires(s: *const Spec, wall: i64) bool {
    const t = Wall.of(wall);
    const n = Wall.of(wall + 3600);
    if (!hourOk(s, t.days, t.h) or !hourOk(s, n.days, n.h)) return false;
    return n.days == t.days or (monthOk(s, n.y, n.m) and dayOk(s, n.days, n.d));
}

/// Where a match `w0` inside a spring-forward gap fires. The npm package
/// walks back to the change when the offset differs from January's, and
/// otherwise keeps the time shifted by the gap.
fn gapSlot(zone: *const tz.Zone, n: tz.Transition, w0: i64) i64 {
    const shifted = w0 - n.before;
    const y = tz.civilFromDays(@divFloor(w0, 86400)).y;
    const jan = tz.daysFromCivil(y, 1, 1) * 86400;
    if (zone.offsetAt(jan - zone.offsetAt(jan)) == n.after) return shifted;
    // It walks back in whole minutes, so the seconds of the match stay.
    return shifted - @divFloor(shifted - n.at, 60) * 60;
}

/// The latest slot in `[from_ms, now_ms]`, for catch-up after downtime.
/// `from_ms` must be a slot at or before `now_ms`.
pub fn latestSlot(s: *const Spec, from_ms: i64, now_ms: i64, zone: *const tz.Zone) i64 {
    std.debug.assert(from_ms <= now_ms);
    var best = from_ms;
    // Look back over growing windows, so a long outage does not walk every
    // missed slot one by one.
    const windows = [_]i64{ 1, 60, 3600, 86400, 32 * 86400, 400 * 86400 };
    for (windows) |win_s| {
        const start = now_ms - win_s * 1000;
        if (start < best) break;
        if (nextSlot(s, start - 1, zone)) |c| if (c <= now_ms) {
            best = c;
            break;
        };
    }
    var steps: u32 = 0;
    while (steps < 100_000) : (steps += 1) {
        const n = nextSlot(s, best, zone) orelse break;
        if (n > now_ms) break;
        best = n;
    }
    return best;
}

// ---- tests -----------------------------------------------------------------------

const testing = std.testing;

fn ms(y: i64, m: u32, d: u32, h: i64, mi: i64, sec: i64) i64 {
    return (tz.daysFromCivil(y, m, d) * 86400 + h * 3600 + mi * 60 + sec) * 1000;
}

fn expectSlots(expr: []const u8, zone: *const tz.Zone, after: i64, want: []const i64) !void {
    const s = try parse(expr);
    var t = after;
    for (want) |w| {
        const got = nextSlot(&s, t, zone) orelse return error.NoSlot;
        if (got != w) {
            std.debug.print("{s}: want {d} got {d} (diff {d} s)\n", .{ expr, w, got, @divTrunc(got - w, 1000) });
            return error.WrongSlot;
        }
        t = got;
    }
}

test "parse: fields, ranges, steps, lists, names" {
    const a = try parse("*/15 9-17 * * mon-fri");
    try testing.expectEqual(@as(u64, 1), a.sec);
    try testing.expectEqual(@as(u64, (1 << 0) | (1 << 15) | (1 << 30) | (1 << 45)), a.min);
    try testing.expectEqual(@as(u32, 0x3FE00), a.hour);
    try testing.expectEqual(@as(u8, 0b0111110), a.dow);
    const b = try parse("30 5/20 1,3,5 1-31/10 JAN,Jul *");
    try testing.expectEqual(@as(u64, 1 << 30), b.sec);
    try testing.expectEqual(@as(u64, (1 << 5) | (1 << 25) | (1 << 45)), b.min);
    try testing.expectEqual(@as(u32, (1 << 1) | (1 << 11) | (1 << 21) | (1 << 31)), b.dom);
    try testing.expectEqual(@as(u16, (1 << 1) | (1 << 7)), b.mon);
    // 7 is Sunday; `0-7` is every day.
    try testing.expectEqual(@as(u8, 1), (try parse("0 0 * * 7")).dow);
    try testing.expectEqual(@as(u8, 0x7F), (try parse("0 0 * * 0-7")).dow);
    try testing.expectEqual(@as(u8, 0b1010101), (try parse("0 0 * * */2")).dow);
    const p = try parse("@weekdays");
    try testing.expectEqual(@as(u8, 0b0111110), p.dow);
    try testing.expectEqual(@as(u64, 1), (try parse("@hourly")).min);
    for ([_][]const u8{ "0 0 ? * *", "0 0 L * *", "* * * *", "* * * * * * *", "60 * * * *", "* 24 * * *", "* * 0 * *", "* * * 13 *", "* * * * 8", "*/0 * * * *", "5-1 * * * *", "1* * * * *", "* * * * mon-xyz", "", "a b c d e" }) |bad| {
        if (parse(bad)) |_| {
            std.debug.print("accepted: {s}\n", .{bad});
            return error.Accepted;
        } else |_| {}
    }
}

test "every: n8n interval mapping" {
    const sec = try fromEvery(.{ .unit = .seconds, .value = 10 });
    try testing.expectEqual(stepBits(0, 59, 10), sec.sec);
    const m7 = try fromEvery(.{ .unit = .minutes, .value = 7 });
    try testing.expectEqual(Unit.minutes, m7.rec_unit);
    const h6 = try fromEvery(.{ .unit = .hours, .value = 6, .at_minute = 15 });
    try testing.expectEqual(@as(u64, 1 << 15), h6.min);
    try testing.expectEqual(@as(u32, (1 << 0) | (1 << 6) | (1 << 12) | (1 << 18)), h6.hour);
    const wk = try fromEvery(.{ .unit = .weeks, .value = 2, .at_hour = 9, .weekdays = 0b10, .weekdays_given = true });
    try testing.expectEqual(@as(u8, 0b10), wk.dow);
    try testing.expectEqual(Unit.weeks, wk.rec_unit);
    try testing.expectError(error.BadEvery, fromEvery(.{ .unit = .seconds, .value = 60 }));
    try testing.expectError(error.BadEvery, fromEvery(.{ .unit = .hours, .value = 24 }));
    try testing.expectError(error.BadEvery, fromEvery(.{ .unit = .days, .value = 1, .at_hour = 24 }));

    const z = tz.utc();
    // Every 7 minutes: minute index since the epoch is a multiple of 7.
    var t = ms(2026, 1, 1, 0, 0, 0);
    var i: u32 = 0;
    while (i < 20) : (i += 1) {
        const n = nextSlot(&m7, t, &z).?;
        try testing.expectEqual(@as(i64, 0), @mod(@divFloor(n, 60_000), 7));
        if (i > 0) try testing.expectEqual(@as(i64, 7 * 60_000), n - t);
        t = n;
    }
    // Every 2 weeks on Monday 09:00.
    t = ms(2026, 1, 1, 0, 0, 0);
    const a = nextSlot(&wk, t, &z).?;
    const b = nextSlot(&wk, a, &z).?;
    try testing.expectEqual(@as(i64, 14 * 86400 * 1000), b - a);
    try testing.expectEqual(@as(u32, 1), tz.weekday(@divFloor(a, 86_400_000)));
    // Every 3 months on day 15.
    const mo = try fromEvery(.{ .unit = .months, .value = 3, .day_of_month = 15, .at_hour = 8 });
    try testing.expectEqual(ms(2026, 4, 15, 8, 0, 0), nextSlot(&mo, ms(2026, 1, 20, 0, 0, 0), &z).?);
}

test "next slot in UTC" {
    const z = tz.utc();
    try expectSlots("*/15 * * * * *", &z, ms(2026, 5, 1, 10, 0, 7) + 500, &.{ ms(2026, 5, 1, 10, 0, 15), ms(2026, 5, 1, 10, 0, 30) });
    try expectSlots("0 9 * * 1-5", &z, ms(2026, 5, 1, 9, 0, 0), &.{ ms(2026, 5, 4, 9, 0, 0), ms(2026, 5, 5, 9, 0, 0) });
    // Both day fields restricted: either matches (Friday the 1st, Friday 8th, 13th).
    try expectSlots("0 0 13 * 5", &z, ms(2026, 5, 1, 0, 0, 0), &.{ ms(2026, 5, 8, 0, 0, 0), ms(2026, 5, 13, 0, 0, 0), ms(2026, 5, 15, 0, 0, 0) });
    try expectSlots("0 0 29 2 *", &z, ms(2026, 1, 1, 0, 0, 0), &.{ ms(2028, 2, 29, 0, 0, 0), ms(2032, 2, 29, 0, 0, 0) });
    try expectSlots("0 0 31 * *", &z, ms(2026, 1, 31, 0, 0, 0), &.{ms(2026, 3, 31, 0, 0, 0)});
    // A whole slot is never returned for the same second as `after`.
    try expectSlots("* * * * * *", &z, ms(2026, 5, 1, 10, 0, 0), &.{ms(2026, 5, 1, 10, 0, 1)});
    const never = try parse("0 0 30 2 *");
    try testing.expect(nextSlot(&never, ms(2026, 1, 1, 0, 0, 0), &z) == null);
}

test "next slot across DST in America/New_York" {
    const ny = try tz.testZone(tz.test_new_york, "America/New_York");
    // Values from the `cron` npm package 4.4.0.
    try expectSlots("30 2 * * *", &ny, ms(2026, 3, 7, 17, 0, 0), &.{ 1772953200000, 1773037800000, 1773124200000 });
    try expectSlots("*/15 * * * *", &ny, ms(2026, 3, 8, 6, 30, 0), &.{ 1772952300000, 1772953200000, 1772954100000, 1772955000000 });
    try expectSlots("*/15 * * * *", &ny, ms(2026, 11, 1, 4, 30, 0), &.{ 1793508300000, 1793509200000, 1793510100000, 1793511000000, 1793511900000, 1793512800000, 1793513700000, 1793514600000, 1793515500000, 1793516400000, 1793517300000, 1793518200000 });
    try expectSlots("30 1 * * *", &ny, ms(2026, 10, 31, 16, 0, 0), &.{ 1793511000000, 1793601000000, 1793687400000 });
    try expectSlots("0 * * * *", &ny, ms(2026, 11, 1, 4, 0, 0), &.{ 1793509200000, 1793512800000, 1793516400000, 1793520000000 });
}

test "next slot across DST in Europe/Berlin and Australia" {
    const be = try tz.testZone(tz.test_berlin, "Europe/Berlin");
    try expectSlots("30 2 * * *", &be, ms(2026, 3, 28, 11, 0, 0), &.{ 1774746000000, 1774830600000, 1774917000000 });
    try expectSlots("30 2 * * *", &be, ms(2026, 10, 24, 10, 0, 0), &.{ 1792888200000, 1792978200000, 1793064600000 });
    try expectSlots("*/20 2 * * *", &be, ms(2026, 10, 24, 23, 0, 0), &.{ 1792886400000, 1792887600000, 1792888800000, 1792976400000, 1792977600000 });
    const syd = try tz.testZone(tz.test_sydney, "Australia/Sydney");
    try expectSlots("30 2 * * *", &syd, ms(2026, 10, 3, 2, 0, 0), &.{ 1791045000000, 1791127800000, 1791214200000 });
    const lh = try tz.testZone(@embedFile("testdata/Australia_Lord_Howe.tzif"), "Australia/Lord_Howe");
    try expectSlots("*/30 * * * *", &lh, ms(2026, 10, 3, 14, 30, 0), &.{ 1791039600000, 1791041400000, 1791043200000, 1791045000000, 1791046800000 });
}

test "latest slot for catch-up" {
    const z = tz.utc();
    const s = try parse("* * * * * *");
    const from = ms(2026, 1, 1, 0, 0, 1);
    try testing.expectEqual(ms(2026, 1, 3, 5, 0, 0), latestSlot(&s, from, ms(2026, 1, 3, 5, 0, 0) + 400, &z));
    const d = try parse("0 0 1 * *");
    try testing.expectEqual(ms(2027, 3, 1, 0, 0, 0), latestSlot(&d, ms(2026, 2, 1, 0, 0, 0), ms(2027, 3, 20, 0, 0, 0), &z));
}
