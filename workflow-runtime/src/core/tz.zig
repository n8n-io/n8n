//! Time zones for schedule triggers. The core has no file access: the shell
//! reads a TZif file (RFC 8536) and passes its bytes in an event. This file
//! parses those bytes into a fixed-size table of offset changes, plus the
//! POSIX rule of the footer for times after the table. All functions are
//! pure and bounded.
const std = @import("std");

/// Offset changes kept per zone. A fat TZif file has about 240 for
/// America/New_York; older ones are dropped first.
pub const max_transitions = 400;
pub const max_name = 64;

pub const Transition = struct {
    /// Seconds since the epoch, UTC.
    at: i64,
    /// UTC offset in seconds before and after `at`.
    before: i32,
    after: i32,
};

const DateKind = enum(u8) { month_week_day, julian_no_leap, julian_zero };

const DateRule = struct {
    kind: DateKind = .month_week_day,
    month: u8 = 0,
    week: u8 = 0,
    weekday: u8 = 0,
    day: u16 = 0,
    /// Local time of day of the change, in seconds. Can be negative or
    /// above 24 hours in TZif version 3.
    time: i32 = 7200,
};

/// The POSIX TZ rule of a TZif footer, such as `EST5EDT,M3.2.0,M11.1.0`.
pub const Rule = struct {
    std_off: i32,
    dst_off: i32,
    has_dst: bool,
    start: DateRule,
    end: DateRule,
};

pub const Zone = struct {
    name_buf: [max_name]u8 = undefined,
    name_len: u8 = 0,
    n: u16 = 0,
    at: [max_transitions]i64 = undefined,
    off: [max_transitions]i32 = undefined,
    initial_off: i32 = 0,
    rule: ?Rule = null,

    pub fn name(z: *const Zone) []const u8 {
        return z.name_buf[0..z.name_len];
    }

    /// UTC offset in seconds at instant `t` (seconds).
    pub fn offsetAt(z: *const Zone, t: i64) i32 {
        if (z.n == 0) {
            if (z.rule) |r| return ruleOffset(r, t);
            return z.initial_off;
        }
        if (t < z.at[0]) return z.initial_off;
        const last = z.n - 1;
        if (t >= z.at[last]) {
            if (z.rule) |r| return ruleOffset(r, t);
            return z.off[last];
        }
        return z.off[z.indexAtOrBefore(t)];
    }

    /// The last table entry at or before `t`. Requires `t >= at[0]`.
    fn indexAtOrBefore(z: *const Zone, t: i64) usize {
        std.debug.assert(z.n > 0 and t >= z.at[0]);
        var lo: usize = 0;
        var hi: usize = z.n;
        while (hi - lo > 1) {
            const mid = lo + (hi - lo) / 2;
            if (z.at[mid] <= t) lo = mid else hi = mid;
        }
        return lo;
    }

    fn tableTransition(z: *const Zone, i: usize) Transition {
        return .{ .at = z.at[i], .before = if (i == 0) z.initial_off else z.off[i - 1], .after = z.off[i] };
    }

    /// The first offset change strictly after `t`, or null.
    pub fn nextTransition(z: *const Zone, t: i64) ?Transition {
        if (z.n > 0 and t < z.at[z.n - 1]) {
            if (t < z.at[0]) return z.tableTransition(0);
            return z.tableTransition(z.indexAtOrBefore(t) + 1);
        }
        const r = z.rule orelse return null;
        const from = if (z.n > 0) @max(t, z.at[z.n - 1]) else t;
        return ruleNext(r, from);
    }

    /// The last offset change at or before `t`, or null.
    pub fn prevTransition(z: *const Zone, t: i64) ?Transition {
        if (z.rule) |r| {
            const floor_t: i64 = if (z.n > 0) z.at[z.n - 1] else std.math.minInt(i64);
            if (t > floor_t) {
                if (rulePrev(r, t)) |p| if (p.at > floor_t) return p;
            }
        }
        if (z.n == 0 or t < z.at[0]) return null;
        return z.tableTransition(z.indexAtOrBefore(t));
    }
};

pub fn setName(z: *Zone, nm: []const u8) void {
    std.debug.assert(nm.len <= max_name);
    @memcpy(z.name_buf[0..nm.len], nm);
    z.name_len = @intCast(nm.len);
}

/// A zone with offset 0 and no changes.
pub fn utc() Zone {
    var z: Zone = .{};
    setName(&z, "UTC");
    return z;
}

// ---- civil calendar (proleptic Gregorian, days since 1970-01-01) ---------------

pub fn daysFromCivil(y0: i64, m: u32, d: u32) i64 {
    std.debug.assert(m >= 1 and m <= 12 and d >= 1 and d <= 31);
    const y = if (m <= 2) y0 - 1 else y0;
    const era = @divFloor(y, 400);
    const yoe: i64 = y - era * 400;
    const mp: i64 = if (m > 2) m - 3 else m + 9;
    const doy = @divFloor(153 * mp + 2, 5) + d - 1;
    const doe = yoe * 365 + @divFloor(yoe, 4) - @divFloor(yoe, 100) + doy;
    return era * 146097 + doe - 719468;
}

pub const Civil = struct { y: i64, m: u32, d: u32 };

pub fn civilFromDays(z0: i64) Civil {
    const z = z0 + 719468;
    const era = @divFloor(z, 146097);
    const doe = z - era * 146097;
    const yoe = @divFloor(doe - @divFloor(doe, 1460) + @divFloor(doe, 36524) - @divFloor(doe, 146096), 365);
    const doy = doe - (365 * yoe + @divFloor(yoe, 4) - @divFloor(yoe, 100));
    const mp = @divFloor(5 * doy + 2, 153);
    const d: u32 = @intCast(doy - @divFloor(153 * mp + 2, 5) + 1);
    const m: u32 = @intCast(if (mp < 10) mp + 3 else mp - 9);
    return .{ .y = yoe + era * 400 + @as(i64, if (m <= 2) 1 else 0), .m = m, .d = d };
}

/// 0 = Sunday. 1970-01-01 was a Thursday.
pub fn weekday(days: i64) u32 {
    return @intCast(@mod(days + 4, 7));
}

pub fn isLeap(y: i64) bool {
    return @mod(y, 4) == 0 and (@mod(y, 100) != 0 or @mod(y, 400) == 0);
}

pub fn monthDays(y: i64, m: u32) u32 {
    const t = [_]u32{ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
    if (m == 2 and isLeap(y)) return 29;
    return t[m - 1];
}

// ---- POSIX rules ---------------------------------------------------------------

/// The local day (days since the epoch) of a rule date in year `y`.
fn ruleDay(dr: DateRule, y: i64) i64 {
    switch (dr.kind) {
        .julian_no_leap => {
            // Day 1..365; February 29 is never counted.
            const base = daysFromCivil(y, 1, 1) + dr.day - 1;
            return if (isLeap(y) and dr.day >= 60) base + 1 else base;
        },
        .julian_zero => return daysFromCivil(y, 1, 1) + dr.day,
        .month_week_day => {
            const first = daysFromCivil(y, dr.month, 1);
            var day = first + @as(i64, @intCast((dr.weekday + 7 - weekday(first)) % 7));
            day += @as(i64, dr.week - 1) * 7;
            const last = first + monthDays(y, dr.month) - 1;
            // Week 5 means the last such weekday of the month.
            while (day > last) day -= 7;
            return day;
        },
    }
}

/// UTC instants of the rule's two changes in year `y`.
fn ruleYear(r: Rule, y: i64) [2]Transition {
    const start = ruleDay(r.start, y) * 86400 + r.start.time - r.std_off;
    const end = ruleDay(r.end, y) * 86400 + r.end.time - r.dst_off;
    return .{
        .{ .at = start, .before = r.std_off, .after = r.dst_off },
        .{ .at = end, .before = r.dst_off, .after = r.std_off },
    };
}

fn ruleOffset(r: Rule, t: i64) i32 {
    if (!r.has_dst) return r.std_off;
    // The latest change at or before t decides the offset.
    const p = rulePrev(r, t) orelse return r.std_off;
    return p.after;
}

fn yearOf(r: Rule, t: i64) i64 {
    return civilFromDays(@divFloor(t + r.std_off, 86400)).y;
}

fn ruleNext(r: Rule, t: i64) ?Transition {
    if (!r.has_dst or r.std_off == r.dst_off) return null;
    const y = yearOf(r, t);
    var best: ?Transition = null;
    var yy = y - 1;
    while (yy <= y + 1) : (yy += 1) {
        for (ruleYear(r, yy)) |c| {
            if (c.at > t and (best == null or c.at < best.?.at)) best = c;
        }
    }
    return best;
}

fn rulePrev(r: Rule, t: i64) ?Transition {
    if (!r.has_dst or r.std_off == r.dst_off) return null;
    const y = yearOf(r, t);
    var best: ?Transition = null;
    var yy = y - 1;
    while (yy <= y + 1) : (yy += 1) {
        for (ruleYear(r, yy)) |c| {
            if (c.at <= t and (best == null or c.at > best.?.at)) best = c;
        }
    }
    return best;
}

const PosixReader = struct {
    s: []const u8,
    i: usize = 0,

    fn peek(p: *const PosixReader) u8 {
        return if (p.i < p.s.len) p.s[p.i] else 0;
    }

    fn name(p: *PosixReader) Error!void {
        if (p.peek() == '<') {
            while (p.i < p.s.len and p.s[p.i] != '>') p.i += 1;
            if (p.peek() != '>') return error.BadRule;
            p.i += 1;
            return;
        }
        const start = p.i;
        while (p.i < p.s.len and std.ascii.isAlphabetic(p.s[p.i])) p.i += 1;
        if (p.i - start < 3) return error.BadRule;
    }

    fn number(p: *PosixReader, max: i64) Error!i64 {
        const start = p.i;
        var v: i64 = 0;
        while (p.i < p.s.len and std.ascii.isDigit(p.s[p.i]) and p.i - start < 4) : (p.i += 1) v = v * 10 + (p.s[p.i] - '0');
        if (p.i == start or v > max) return error.BadRule;
        return v;
    }

    /// `[+-]hh[:mm[:ss]]` in seconds.
    fn hms(p: *PosixReader, max_hours: i64) Error!i64 {
        var sign: i64 = 1;
        if (p.peek() == '+' or p.peek() == '-') {
            if (p.peek() == '-') sign = -1;
            p.i += 1;
        }
        var v = (try p.number(max_hours)) * 3600;
        if (p.peek() == ':') {
            p.i += 1;
            v += (try p.number(59)) * 60;
            if (p.peek() == ':') {
                p.i += 1;
                v += try p.number(59);
            }
        }
        return sign * v;
    }

    fn date(p: *PosixReader) Error!DateRule {
        var dr: DateRule = .{};
        if (p.peek() == 'M') {
            p.i += 1;
            dr.month = @intCast(try p.number(12));
            if (p.peek() != '.') return error.BadRule;
            p.i += 1;
            dr.week = @intCast(try p.number(5));
            if (p.peek() != '.') return error.BadRule;
            p.i += 1;
            dr.weekday = @intCast(try p.number(6));
            if (dr.month == 0 or dr.week == 0) return error.BadRule;
        } else if (p.peek() == 'J') {
            p.i += 1;
            dr.kind = .julian_no_leap;
            dr.day = @intCast(try p.number(365));
            if (dr.day == 0) return error.BadRule;
        } else {
            dr.kind = .julian_zero;
            dr.day = @intCast(try p.number(365));
        }
        if (p.peek() == '/') {
            p.i += 1;
            dr.time = @intCast(try p.hms(167));
        }
        return dr;
    }
};

/// Parse a POSIX TZ string. Offsets in the string count west of UTC; the
/// result counts east, as TZif does.
pub fn parsePosix(s: []const u8) Error!Rule {
    var p: PosixReader = .{ .s = s };
    try p.name();
    const std_off: i32 = @intCast(-(try p.hms(24)));
    var r: Rule = .{ .std_off = std_off, .dst_off = std_off, .has_dst = false, .start = .{}, .end = .{} };
    if (p.i == s.len) return r;
    try p.name();
    r.has_dst = true;
    r.dst_off = std_off + 3600;
    if (p.peek() != ',' and p.i < s.len) r.dst_off = @intCast(-(try p.hms(24)));
    if (p.peek() != ',') return error.BadRule;
    p.i += 1;
    r.start = try p.date();
    if (p.peek() != ',') return error.BadRule;
    p.i += 1;
    r.end = try p.date();
    if (p.i != s.len) return error.BadRule;
    return r;
}

// ---- TZif ----------------------------------------------------------------------

pub const Error = error{ BadTzif, BadRule };

const Counts = struct { isut: u32, isstd: u32, leap: u32, time: u32, typ: u32, char: u32 };

fn readCounts(b: []const u8, at: usize) Error!Counts {
    if (at + 44 > b.len or !std.mem.eql(u8, b[at..][0..4], "TZif")) return error.BadTzif;
    const c = b[at + 20 ..][0..24];
    return .{
        .isut = std.mem.readInt(u32, c[0..4], .big),
        .isstd = std.mem.readInt(u32, c[4..8], .big),
        .leap = std.mem.readInt(u32, c[8..12], .big),
        .time = std.mem.readInt(u32, c[12..16], .big),
        .typ = std.mem.readInt(u32, c[16..20], .big),
        .char = std.mem.readInt(u32, c[20..24], .big),
    };
}

fn blockLen(c: Counts, tsize: usize) usize {
    return c.time * tsize + c.time + c.typ * 6 + c.char + c.leap * (tsize + 4) + c.isstd + c.isut;
}

/// Parse TZif bytes into `z`. The name is set by the caller.
pub fn parseTzif(b: []const u8, z: *Zone) Error!void {
    const c1 = try readCounts(b, 0);
    if (c1.typ == 0 or c1.typ > 256) return error.BadTzif;
    const v1_end = 44 + blockLen(c1, 4);
    if (v1_end > b.len) return error.BadTzif;
    var c = c1;
    var data: usize = 44;
    var tsize: usize = 4;
    if (b[4] >= '2') {
        // Version 2 and later repeat the data with 64-bit times.
        c = try readCounts(b, v1_end);
        data = v1_end + 44;
        tsize = 8;
        if (c.typ == 0 or c.typ > 256) return error.BadTzif;
    }
    const end = data + blockLen(c, tsize);
    if (end > b.len) return error.BadTzif;
    const times = b[data..][0 .. c.time * tsize];
    const idx = b[data + c.time * tsize ..][0..c.time];
    const types = b[data + c.time * tsize + c.time ..][0 .. c.typ * 6];

    // RFC 8536: before the first transition, local time type 0 applies.
    z.initial_off = std.mem.readInt(i32, types[0..4], .big);
    z.n = 0;
    var prev = z.initial_off;
    var i: usize = 0;
    while (i < c.time) : (i += 1) {
        const t: i64 = if (tsize == 8) std.mem.readInt(i64, times[i * 8 ..][0..8], .big) else std.mem.readInt(i32, times[i * 4 ..][0..4], .big);
        if (idx[i] >= c.typ) return error.BadTzif;
        const off = std.mem.readInt(i32, types[@as(usize, idx[i]) * 6 ..][0..4], .big);
        // A change of name or DST flag alone does not move the clock.
        if (off == prev) continue;
        if (z.n > 0 and t <= z.at[z.n - 1]) return error.BadTzif;
        if (z.n == max_transitions) {
            // Keep the newest entries: schedules look forward.
            z.initial_off = z.off[0];
            std.mem.copyForwards(i64, z.at[0 .. max_transitions - 1], z.at[1..max_transitions]);
            std.mem.copyForwards(i32, z.off[0 .. max_transitions - 1], z.off[1..max_transitions]);
            z.n -= 1;
        }
        z.at[z.n] = t;
        z.off[z.n] = off;
        z.n += 1;
        prev = off;
    }
    // The kept transitions are in order and within the table.
    std.debug.assert(z.n <= max_transitions);
    if (z.n > 1) std.debug.assert(z.at[z.n - 2] < z.at[z.n - 1]);
    z.rule = null;
    if (tsize == 8 and end < b.len and b[end] == '\n') {
        const rest = b[end + 1 ..];
        const nl = std.mem.indexOfScalar(u8, rest, '\n') orelse return error.BadTzif;
        if (nl > 0) z.rule = try parsePosix(rest[0..nl]);
    }
}

// ---- tests -----------------------------------------------------------------------

const testing = std.testing;
pub const test_new_york = @embedFile("testdata/America_New_York.tzif");
pub const test_berlin = @embedFile("testdata/Europe_Berlin.tzif");
pub const test_sydney = @embedFile("testdata/Australia_Sydney.tzif");

pub fn testZone(bytes: []const u8, nm: []const u8) !Zone {
    var z: Zone = .{};
    setName(&z, nm);
    try parseTzif(bytes, &z);
    return z;
}

test "civil calendar round trip" {
    try testing.expectEqual(@as(i64, 0), daysFromCivil(1970, 1, 1));
    try testing.expectEqual(@as(u32, 4), weekday(0));
    var d: i64 = -800_000;
    while (d < 800_000) : (d += 997) {
        const c = civilFromDays(d);
        try testing.expectEqual(d, daysFromCivil(c.y, c.m, c.d));
    }
    try testing.expectEqual(@as(u32, 29), monthDays(2028, 2));
    try testing.expectEqual(@as(u32, 28), monthDays(2100, 2));
}

test "posix rules" {
    const ny = try parsePosix("EST5EDT,M3.2.0,M11.1.0");
    try testing.expectEqual(@as(i32, -5 * 3600), ny.std_off);
    try testing.expectEqual(@as(i32, -4 * 3600), ny.dst_off);
    // 2040-03-11 07:00 UTC: DST starts. 2040-11-04 06:00 UTC: it ends.
    const s = daysFromCivil(2040, 3, 11) * 86400 + 7 * 3600;
    try testing.expectEqual(@as(i32, -5 * 3600), ruleOffset(ny, s - 1));
    try testing.expectEqual(@as(i32, -4 * 3600), ruleOffset(ny, s));
    const e = daysFromCivil(2040, 11, 4) * 86400 + 6 * 3600;
    try testing.expectEqual(@as(i32, -4 * 3600), ruleOffset(ny, e - 1));
    try testing.expectEqual(@as(i32, -5 * 3600), ruleOffset(ny, e));
    const lh = try parsePosix("<+1030>-10:30<+11>-11,M10.1.0,M4.1.0");
    try testing.expectEqual(@as(i32, 37800), lh.std_off);
    try testing.expectEqual(@as(i32, 39600), lh.dst_off);
    const fixed = try parsePosix("<-03>3");
    try testing.expect(!fixed.has_dst);
    try testing.expectEqual(@as(i32, -3 * 3600), fixed.std_off);
    const dublin = try parsePosix("IST-1GMT0,M10.5.0,M3.5.0/1");
    try testing.expectEqual(@as(i32, 3600), dublin.std_off);
    try testing.expectEqual(@as(i32, 0), dublin.dst_off);
    // January in Dublin is GMT: the "DST" part of a negative DST rule.
    try testing.expectEqual(@as(i32, 0), ruleOffset(dublin, daysFromCivil(2045, 1, 15) * 86400));
    try testing.expectEqual(@as(i32, 3600), ruleOffset(dublin, daysFromCivil(2045, 7, 15) * 86400));
    try testing.expectError(error.BadRule, parsePosix("X5"));
}

test "tzif zones: offsets and transitions" {
    const ny = try testZone(test_new_york, "America/New_York");
    // 2026-03-08 07:00 UTC: 02:00 EST becomes 03:00 EDT.
    const spring = daysFromCivil(2026, 3, 8) * 86400 + 7 * 3600;
    try testing.expectEqual(@as(i32, -18000), ny.offsetAt(spring - 1));
    try testing.expectEqual(@as(i32, -14400), ny.offsetAt(spring));
    const nt = ny.nextTransition(spring - 3600).?;
    try testing.expectEqual(spring, nt.at);
    try testing.expectEqual(@as(i32, -18000), nt.before);
    try testing.expectEqual(@as(i32, -14400), nt.after);
    try testing.expectEqual(spring, ny.prevTransition(spring + 10).?.at);
    // After the table (2037), the footer rule applies.
    const far = daysFromCivil(2060, 7, 1) * 86400;
    try testing.expectEqual(@as(i32, -14400), ny.offsetAt(far));
    const far_next = ny.nextTransition(far).?;
    try testing.expectEqual(daysFromCivil(2060, 11, 7) * 86400 + 6 * 3600, far_next.at);

    const berlin = try testZone(test_berlin, "Europe/Berlin");
    // 2026-10-25 01:00 UTC: 03:00 CEST becomes 02:00 CET.
    const fall = daysFromCivil(2026, 10, 25) * 86400 + 3600;
    try testing.expectEqual(@as(i32, 7200), berlin.offsetAt(fall - 1));
    try testing.expectEqual(@as(i32, 3600), berlin.offsetAt(fall));

    const syd = try testZone(test_sydney, "Australia/Sydney");
    try testing.expectEqual(@as(i32, 39600), syd.offsetAt(daysFromCivil(2026, 1, 1) * 86400));
    try testing.expectEqual(@as(i32, 36000), syd.offsetAt(daysFromCivil(2026, 7, 1) * 86400));
    try testing.expectError(error.BadTzif, testZone("TZif2 short", "x"));
}
