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
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

const ms_per_day: f64 = 86_400_000;
const max_time: f64 = 8.64e15;

// ---- time values --------------------------------------------------------

/// ECMAScript TimeClip.
pub fn timeClip(t: f64) f64 {
    if (!(t >= -max_time and t <= max_time)) return std.math.nan(f64);
    return @trunc(t) + 0.0; // + 0.0 turns -0 into +0.
}

/// Days from 1970-01-01 to the civil date (proleptic Gregorian).
fn daysFromCivil(y_in: i64, m: i64, d: i64) i64 {
    std.debug.assert(m >= 1 and m <= 12);
    const y = if (m <= 2) y_in - 1 else y_in;
    const era = @divFloor(y, 400);
    const yoe = y - era * 400;
    const mp = if (m > 2) m - 3 else m + 9;
    const doy = @divFloor(153 * mp + 2, 5) + d - 1;
    const doe = yoe * 365 + @divFloor(yoe, 4) - @divFloor(yoe, 100) + doy;
    return era * 146_097 + doe - 719_468;
}

const Civil = struct { year: i64, month: i64, day: i64 };

/// The civil date of a day number. `month` is 0-based, as in JavaScript.
fn civilFromDays(z_in: i64) Civil {
    const z = z_in + 719_468;
    const era = @divFloor(z, 146_097);
    const doe = z - era * 146_097;
    const yoe = @divFloor(doe - @divFloor(doe, 1460) + @divFloor(doe, 36_524) - @divFloor(doe, 146_096), 365);
    const doy = doe - (365 * yoe + @divFloor(yoe, 4) - @divFloor(yoe, 100));
    const mp = @divFloor(5 * doy + 2, 153);
    const d = doy - @divFloor(153 * mp + 2, 5) + 1;
    const m = if (mp < 10) mp + 3 else mp - 9;
    const y = yoe + era * 400 + @as(i64, if (m <= 2) 1 else 0);
    return .{ .year = y, .month = m - 1, .day = d };
}

/// V8 MakeDay, with its range checks on year and month.
pub fn makeDay(year: f64, month: f64, date: f64) f64 {
    if (!(year >= -1_000_000 and year <= 1_000_000)) return std.math.nan(f64);
    if (!(month >= -10_000_000 and month <= 10_000_000)) return std.math.nan(f64);
    if (!std.math.isFinite(date)) return std.math.nan(f64);
    var y: i64 = @intFromFloat(@trunc(year));
    var m: i64 = @intFromFloat(@trunc(month));
    y += @divTrunc(m, 12);
    m = @rem(m, 12);
    if (m < 0) {
        m += 12;
        y -= 1;
    }
    const first: f64 = @floatFromInt(daysFromCivil(y, m + 1, 1));
    return (first - 1) + @trunc(date);
}

pub fn makeTime(h: f64, m: f64, s: f64, ms: f64) f64 {
    if (!std.math.isFinite(h) or !std.math.isFinite(m) or !std.math.isFinite(s) or !std.math.isFinite(ms))
        return std.math.nan(f64);
    return @trunc(h) * 3_600_000 + @trunc(m) * 60_000 + @trunc(s) * 1000 + @trunc(ms);
}

pub fn makeDate(day: f64, time: f64) f64 {
    if (!std.math.isFinite(day) or !std.math.isFinite(time)) return std.math.nan(f64);
    return time + day * ms_per_day;
}

/// The parts of a valid time value.
pub const Parts = struct {
    year: i64,
    month: i64,
    day: i64,
    weekday: i64,
    hour: i64,
    minute: i64,
    second: i64,
    ms: i64,
    /// Days since the epoch, and ms within the day.
    days: i64,
    in_day: i64,
};

pub fn breakDown(t: f64) Parts {
    std.debug.assert(!std.math.isNan(t));
    const ms: i64 = @intFromFloat(t);
    const days = @divFloor(ms, 86_400_000);
    const in_day = ms - days * 86_400_000;
    const c = civilFromDays(days);
    return .{
        .year = c.year,
        .month = c.month,
        .day = c.day,
        .weekday = @mod(days + 4, 7),
        .hour = @divFloor(in_day, 3_600_000),
        .minute = @mod(@divFloor(in_day, 60_000), 60),
        .second = @mod(@divFloor(in_day, 1000), 60),
        .ms = @mod(in_day, 1000),
        .days = days,
        .in_day = in_day,
    };
}

/// Year 0..99 means 1900..1999 in `new Date(y, m, ...)` and `Date.UTC`.
fn fullYear(year: f64) f64 {
    if (std.math.isNan(year)) return year;
    const y = @trunc(year);
    return if (y >= 0 and y <= 99) 1900 + y else year;
}

/// `new Date(y, m, d?, h?, mi?, s?, ms?)` and `Date.UTC(...)` from the
/// numbers in `n`. `n.len` is the argument count.
pub fn fromParts(n: []const f64, utc_defaults: bool) f64 {
    const nan = std.math.nan(f64);
    const get = struct {
        fn f(xs: []const f64, i: usize, default: f64) f64 {
            return if (i < xs.len) xs[i] else default;
        }
    }.f;
    const year = fullYear(get(n, 0, nan));
    const month = get(n, 1, if (utc_defaults) 0 else nan);
    const day = makeDay(year, month, get(n, 2, 1));
    const time = makeTime(get(n, 3, 0), get(n, 4, 0), get(n, 5, 0), get(n, 6, 0));
    return timeClip(makeDate(day, time));
}

// ---- formatting -----------------------------------------------------------

const week_days = [_][]const u8{ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
const months = [_][]const u8{ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };

pub const Format = enum { iso, string, utc, date, time, locale, locale_date, locale_time };

pub const max_format_len = 80;

const Writer = struct {
    buf: *[max_format_len]u8,
    len: usize = 0,

    fn put(w: *Writer, s: []const u8) void {
        @memcpy(w.buf[w.len..][0..s.len], s);
        w.len += s.len;
    }

    /// Writes `n` (n >= 0) with at least `width` digits.
    fn num(w: *Writer, n: i64, width: usize) void {
        std.debug.assert(n >= 0);
        var tmp: [20]u8 = undefined;
        var i: usize = tmp.len;
        var x: u64 = @intCast(n);
        while (true) {
            i -= 1;
            tmp[i] = @intCast('0' + x % 10);
            x /= 10;
            if (x == 0) break;
        }
        var digits = tmp.len - i;
        while (digits < width) : (digits += 1) w.put("0");
        w.put(tmp[i..]);
    }

    /// The year as V8 prints it in toString: "%04d", or "%05d" when negative.
    fn year(w: *Writer, y: i64) void {
        if (y < 0) {
            w.put("-");
            w.num(-y, 4);
        } else w.num(y, 4);
    }

    fn hms(w: *Writer, p: Parts) void {
        w.num(p.hour, 2);
        w.put(":");
        w.num(p.minute, 2);
        w.put(":");
        w.num(p.second, 2);
    }

    /// ISO 8601 with a six-digit signed year outside 0..9999.
    fn iso(w: *Writer, p: Parts) void {
        if (p.year >= 0 and p.year <= 9999) {
            w.num(p.year, 4);
        } else {
            w.put(if (p.year < 0) "-" else "+");
            w.num(if (p.year < 0) -p.year else p.year, 6);
        }
        w.put("-");
        w.num(p.month + 1, 2);
        w.put("-");
        w.num(p.day, 2);
        w.put("T");
        w.hms(p);
        w.put(".");
        w.num(p.ms, 3);
        w.put("Z");
    }

    /// en-US date: M/D/Y, with era years (1 BC is year 1).
    fn usDate(w: *Writer, p: Parts) void {
        w.num(p.month + 1, 1);
        w.put("/");
        w.num(p.day, 1);
        w.put("/");
        w.num(if (p.year <= 0) 1 - p.year else p.year, 1);
    }

    /// en-US time: h:mm:ss AM.
    fn usTime(w: *Writer, p: Parts) void {
        const h12 = @mod(p.hour, 12);
        w.num(if (h12 == 0) 12 else h12, 1);
        w.put(":");
        w.num(p.minute, 2);
        w.put(":");
        w.num(p.second, 2);
        w.put(if (p.hour < 12) " AM" else " PM");
    }
};

const zone = " GMT+0000 (Coordinated Universal Time)";

/// Formats a valid time value. The caller handles NaN.
pub fn format(buf: *[max_format_len]u8, t: f64, f: Format) []const u8 {
    std.debug.assert(!std.math.isNan(t));
    const p = breakDown(t);
    var w: Writer = .{ .buf = buf };
    switch (f) {
        .iso => w.iso(p),
        .string, .date => {
            w.put(week_days[@intCast(p.weekday)]);
            w.put(" ");
            w.put(months[@intCast(p.month)]);
            w.put(" ");
            w.num(p.day, 2);
            w.put(" ");
            w.year(p.year);
            if (f == .string) {
                w.put(" ");
                w.hms(p);
                w.put(zone);
            }
        },
        .time => {
            w.hms(p);
            w.put(zone);
        },
        .utc => {
            w.put(week_days[@intCast(p.weekday)]);
            w.put(", ");
            w.num(p.day, 2);
            w.put(" ");
            w.put(months[@intCast(p.month)]);
            w.put(" ");
            w.year(p.year);
            w.put(" ");
            w.hms(p);
            w.put(" GMT");
        },
        .locale => {
            w.usDate(p);
            w.put(", ");
            w.usTime(p);
        },
        .locale_date => w.usDate(p),
        .locale_time => w.usTime(p),
    }
    return buf[0..w.len];
}

// ---- parsing (port of the V8 date parser) ---------------------------------

const none: i32 = std.math.maxInt(i32);
const max_significant_digits = 9;

fn between(x: i32, lo: i32, hi: i32) bool {
    // V8 compares as unsigned, so x < lo is false.
    const d: u32 = @bitCast(x -% lo);
    const r: u32 = @bitCast(hi -% lo);
    return d <= r;
}

/// ECMAScript WhiteSpace (not LineTerminator), as V8 IsWhiteSpace.
fn isWhiteSpace(c: u32) bool {
    return switch (c) {
        0x09, 0x0B, 0x0C, 0x20, 0xA0, 0xFEFF, 0x1680, 0x2000...0x200A, 0x202F, 0x205F, 0x3000 => true,
        else => false,
    };
}

fn isWhiteSpaceOrLineTerminator(c: u32) bool {
    return isWhiteSpace(c) or c == 0x0A or c == 0x0D or c == 0x2028 or c == 0x2029;
}

/// Reads code points of WTF-8 text. A NUL ends the input, as in V8.
const Reader = struct {
    s: []const u8,
    at: usize = 0,
    ch: u32 = 0,
    /// Count of characters read, as V8 InputReader::position.
    index: i32 = 0,

    fn init(s: []const u8) Reader {
        var r: Reader = .{ .s = s };
        r.next();
        return r;
    }

    fn next(r: *Reader) void {
        r.index += 1;
        if (r.at >= r.s.len) {
            r.ch = 0;
            return;
        }
        const b0 = r.s[r.at];
        const len: usize = if (b0 < 0x80) 1 else if (b0 < 0xE0) 2 else if (b0 < 0xF0) 3 else 4;
        if (r.at + len > r.s.len) {
            r.ch = 0xFFFD;
            r.at = r.s.len;
            return;
        }
        var c: u32 = switch (len) {
            1 => b0,
            2 => b0 & 0x1F,
            3 => b0 & 0x0F,
            else => b0 & 0x07,
        };
        var i: usize = 1;
        while (i < len) : (i += 1) c = (c << 6) | (r.s[r.at + i] & 0x3F);
        r.ch = c;
        r.at += len;
    }

    fn isEnd(r: *const Reader) bool {
        return r.ch == 0;
    }

    fn isDigit(r: *const Reader) bool {
        return r.ch >= '0' and r.ch <= '9';
    }

    fn skip(r: *Reader, c: u32) bool {
        if (r.ch != c) return false;
        r.next();
        return true;
    }

    fn readNumber(r: *Reader) i32 {
        var n: i32 = 0;
        var i: usize = 0;
        while (r.ch == '0') r.next();
        while (r.isDigit()) {
            if (i < max_significant_digits) n = n * 10 + @as(i32, @intCast(r.ch - '0'));
            i += 1;
            r.next();
        }
        return n;
    }

    fn readWord(r: *Reader, prefix: *[3]u32) i32 {
        var len: i32 = 0;
        while (r.ch >= 'A' and !isWhiteSpace(r.ch)) {
            if (len < 3) prefix[@intCast(len)] = r.ch | 0x20;
            r.next();
            len += 1;
        }
        var i: usize = @intCast(@min(len, 3));
        while (i < 3) : (i += 1) prefix[i] = 0;
        return len;
    }

    fn skipParentheses(r: *Reader) bool {
        if (r.ch != '(') return false;
        var balance: i32 = 0;
        while (true) {
            if (r.ch == ')') balance -= 1 else if (r.ch == '(') balance += 1;
            r.next();
            if (!(balance > 0 and r.ch != 0)) break;
        }
        return true;
    }
};

const KeywordType = enum { invalid, month_name, time_zone_name, time_separator, am_pm };

const Keyword = struct { prefix: [3]u8, kind: KeywordType, value: i32 };

const keywords = [_]Keyword{
    .{ .prefix = "jan".*, .kind = .month_name, .value = 1 },
    .{ .prefix = "feb".*, .kind = .month_name, .value = 2 },
    .{ .prefix = "mar".*, .kind = .month_name, .value = 3 },
    .{ .prefix = "apr".*, .kind = .month_name, .value = 4 },
    .{ .prefix = "may".*, .kind = .month_name, .value = 5 },
    .{ .prefix = "jun".*, .kind = .month_name, .value = 6 },
    .{ .prefix = "jul".*, .kind = .month_name, .value = 7 },
    .{ .prefix = "aug".*, .kind = .month_name, .value = 8 },
    .{ .prefix = "sep".*, .kind = .month_name, .value = 9 },
    .{ .prefix = "oct".*, .kind = .month_name, .value = 10 },
    .{ .prefix = "nov".*, .kind = .month_name, .value = 11 },
    .{ .prefix = "dec".*, .kind = .month_name, .value = 12 },
    .{ .prefix = .{ 'a', 'm', 0 }, .kind = .am_pm, .value = 0 },
    .{ .prefix = .{ 'p', 'm', 0 }, .kind = .am_pm, .value = 12 },
    .{ .prefix = .{ 'u', 't', 0 }, .kind = .time_zone_name, .value = 0 },
    .{ .prefix = "utc".*, .kind = .time_zone_name, .value = 0 },
    .{ .prefix = .{ 'z', 0, 0 }, .kind = .time_zone_name, .value = 0 },
    .{ .prefix = "gmt".*, .kind = .time_zone_name, .value = 0 },
    .{ .prefix = "cdt".*, .kind = .time_zone_name, .value = -5 },
    .{ .prefix = "cst".*, .kind = .time_zone_name, .value = -6 },
    .{ .prefix = "edt".*, .kind = .time_zone_name, .value = -4 },
    .{ .prefix = "est".*, .kind = .time_zone_name, .value = -5 },
    .{ .prefix = "mdt".*, .kind = .time_zone_name, .value = -6 },
    .{ .prefix = "mst".*, .kind = .time_zone_name, .value = -7 },
    .{ .prefix = "pdt".*, .kind = .time_zone_name, .value = -7 },
    .{ .prefix = "pst".*, .kind = .time_zone_name, .value = -8 },
    .{ .prefix = .{ 't', 0, 0 }, .kind = .time_separator, .value = 0 },
};

fn lookupKeyword(pre: [3]u32, len: i32) ?Keyword {
    for (keywords) |k| {
        const same = pre[0] == k.prefix[0] and pre[1] == k.prefix[1] and pre[2] == k.prefix[2];
        if (same and (len <= 3 or k.kind == .month_name)) return k;
    }
    return null;
}

const Tag = enum { invalid, unknown, white_space, number, symbol, end, keyword };

const Token = struct {
    tag: Tag,
    length: i32 = 0,
    value: i32 = -1,
    kind: KeywordType = .invalid,

    fn isNumber(t: Token) bool {
        return t.tag == .number;
    }
    fn isSymbol(t: Token, c: u8) bool {
        return t.tag == .symbol and t.value == c;
    }
    fn isFixedNumber(t: Token, len: i32) bool {
        return t.tag == .number and t.length == len;
    }
    fn isSign(t: Token) bool {
        return t.isSymbol('-') or t.isSymbol('+');
    }
    fn sign(t: Token) i32 {
        return 44 - t.value;
    }
    fn isKeywordType(t: Token, k: KeywordType) bool {
        return t.tag == .keyword and t.kind == k;
    }
    fn isKeywordZ(t: Token) bool {
        return t.isKeywordType(.time_zone_name) and t.length == 1 and t.value == 0;
    }
};

const Tokenizer = struct {
    in: Reader,
    peeked: Token,

    fn init(s: []const u8) Tokenizer {
        var t: Tokenizer = .{ .in = Reader.init(s), .peeked = undefined };
        t.peeked = t.scan();
        return t;
    }

    fn next(t: *Tokenizer) Token {
        const r = t.peeked;
        t.peeked = t.scan();
        return r;
    }

    fn peek(t: *const Tokenizer) Token {
        return t.peeked;
    }

    fn skipSymbol(t: *Tokenizer, c: u8) bool {
        if (!t.peeked.isSymbol(c)) return false;
        t.peeked = t.scan();
        return true;
    }

    fn scan(t: *Tokenizer) Token {
        const in = &t.in;
        const pre_pos = in.index;
        if (in.isEnd()) return .{ .tag = .end };
        if (in.isDigit()) {
            const n = in.readNumber();
            return .{ .tag = .number, .value = n, .length = in.index - pre_pos };
        }
        for (":-+.)") |c| {
            if (in.skip(c)) return .{ .tag = .symbol, .value = c, .length = 1 };
        }
        if (in.ch >= 'A' and !isWhiteSpace(in.ch)) {
            var pre: [3]u32 = undefined;
            const len = in.readWord(&pre);
            const k = lookupKeyword(pre, len) orelse return .{ .tag = .keyword, .kind = .invalid, .value = 0, .length = len };
            return .{ .tag = .keyword, .kind = k.kind, .value = k.value, .length = len };
        }
        if (isWhiteSpaceOrLineTerminator(in.ch)) {
            in.next();
            return .{ .tag = .white_space, .length = in.index - pre_pos };
        }
        if (in.skipParentheses()) return .{ .tag = .unknown, .length = 1 };
        in.next();
        return .{ .tag = .unknown, .length = 1 };
    }
};

const TimeZone = struct {
    sign: i32 = none,
    hour: i32 = none,
    minute: i32 = none,

    fn set(z: *TimeZone, offset_hours: i32) void {
        z.sign = if (offset_hours < 0) -1 else 1;
        z.hour = offset_hours * z.sign;
        z.minute = 0;
    }
    fn isExpecting(z: *const TimeZone, n: i32) bool {
        return z.hour != none and z.minute == none and between(n, 0, 59);
    }
    fn isUtc(z: *const TimeZone) bool {
        return z.hour == 0 and z.minute == 0;
    }
    fn isEmpty(z: *const TimeZone) bool {
        return z.hour == none;
    }
    /// The offset in seconds, or NaN when no zone was given. Null on failure.
    fn write(z: *TimeZone) ?f64 {
        if (z.sign == none) return std.math.nan(f64);
        if (z.hour == none) z.hour = 0;
        if (z.minute == none) z.minute = 0;
        // V8 computes in u32 and can wrap.
        const total: u32 = @as(u32, @bitCast(z.hour)) *% 3600 +% @as(u32, @bitCast(z.minute)) *% 60;
        if (total > std.math.maxInt(i32)) return null; // Smi::kMaxValue in Node (no pointer compression).
        const s: i32 = @intCast(total);
        return @floatFromInt(if (z.sign < 0) -s else s);
    }
};

const TimeParts = struct {
    comp: [4]i32 = .{ 0, 0, 0, 0 },
    index: usize = 0,
    hour_offset: i32 = none,

    fn isEmpty(t: *const TimeParts) bool {
        return t.index == 0;
    }
    fn isExpecting(t: *const TimeParts, n: i32) bool {
        return (t.index == 1 and between(n, 0, 59)) or (t.index == 2 and between(n, 0, 59)) or
            (t.index == 3 and between(n, 0, 999));
    }
    fn add(t: *TimeParts, n: i32) bool {
        if (t.index >= 4) return false;
        t.comp[t.index] = n;
        t.index += 1;
        return true;
    }
    fn addFinal(t: *TimeParts, n: i32) bool {
        if (!t.add(n)) return false;
        while (t.index < 4) : (t.index += 1) t.comp[t.index] = 0;
        return true;
    }
    fn write(t: *TimeParts, out: *[8]f64) bool {
        while (t.index < 4) : (t.index += 1) t.comp[t.index] = 0;
        var hour = t.comp[0];
        const minute = t.comp[1];
        const second = t.comp[2];
        const ms = t.comp[3];
        if (t.hour_offset != none) {
            if (!between(hour, 0, 12)) return false;
            hour = @rem(hour, 12);
            hour += t.hour_offset;
        }
        if (!between(hour, 0, 23) or !between(minute, 0, 59) or !between(second, 0, 59) or !between(ms, 0, 999)) {
            if (hour != 24 or minute != 0 or second != 0 or ms != 0) return false;
        }
        out[3] = @floatFromInt(hour);
        out[4] = @floatFromInt(minute);
        out[5] = @floatFromInt(second);
        out[6] = @floatFromInt(ms);
        return true;
    }
};

const DayParts = struct {
    comp: [3]i32 = .{ 0, 0, 0 },
    index: usize = 0,
    named_month: i32 = none,
    is_iso: bool = false,

    fn isEmpty(d: *const DayParts) bool {
        return d.index == 0;
    }
    fn add(d: *DayParts, n: i32) bool {
        if (d.index >= 3) return false;
        d.comp[d.index] = n;
        d.index += 1;
        return true;
    }
    fn write(d: *DayParts, out: *[8]f64) bool {
        if (d.index < 1) return false;
        while (d.index < 3) : (d.index += 1) d.comp[d.index] = 1;
        var year: i32 = 0;
        var month: i32 = none;
        var day: i32 = none;
        if (d.named_month == none) {
            if (d.is_iso or (d.index == 3 and !between(d.comp[0], 1, 31))) {
                year = d.comp[0];
                month = d.comp[1];
                day = d.comp[2];
            } else {
                month = d.comp[0];
                day = d.comp[1];
                if (d.index == 3) year = d.comp[2];
            }
        } else {
            month = d.named_month;
            if (d.index == 1) {
                day = d.comp[0];
            } else if (!between(d.comp[0], 1, 31)) {
                year = d.comp[0];
                day = d.comp[1];
            } else {
                day = d.comp[0];
                year = d.comp[1];
            }
        }
        if (!d.is_iso) {
            if (between(year, 0, 49)) year += 2000 else if (between(year, 50, 99)) year += 1900;
        }
        if (!between(month, 1, 12) or !between(day, 1, 31)) return false;
        out[0] = @floatFromInt(year);
        out[1] = @floatFromInt(month - 1);
        out[2] = @floatFromInt(day);
        return true;
    }
};

fn readMilliseconds(t: Token) i32 {
    var number = t.value;
    var length = t.length;
    if (length < 3) {
        if (length == 1) number *= 100 else if (length == 2) number *= 10;
    } else if (length > 3) {
        if (length > max_significant_digits) length = max_significant_digits;
        var factor: i32 = 1;
        while (true) {
            factor *= 10;
            length -= 1;
            if (length <= 3) break;
        }
        number = @divTrunc(number, factor);
    }
    return number;
}

/// The state of one parse: V8's DayComposer, TimeComposer and TimeZoneComposer.
const Parser = struct {
    s: Tokenizer,
    day: DayParts = .{},
    time: TimeParts = .{},
    tz: TimeZone = .{},
    has_read_number: bool = false,

    const invalid: Token = .{ .tag = .invalid };

    /// V8 ParseES5DateTime. Returns the first token that it did not handle.
    fn iso(p: *Parser) Token {
        const s = &p.s;
        std.debug.assert(p.day.isEmpty() and p.time.isEmpty() and p.tz.isEmpty());
        if (s.peek().isSign()) {
            const sign_token = s.next();
            if (!s.peek().isFixedNumber(6)) return sign_token;
            const sign = sign_token.sign();
            const year = s.next().value;
            if (sign < 0 and year == 0) return sign_token;
            _ = p.day.add(sign * year);
        } else if (s.peek().isFixedNumber(4)) {
            _ = p.day.add(s.next().value);
        } else {
            return s.next();
        }
        if (s.skipSymbol('-')) {
            if (!s.peek().isFixedNumber(2) or !between(s.peek().value, 1, 12)) return s.next();
            _ = p.day.add(s.next().value);
            if (s.skipSymbol('-')) {
                if (!s.peek().isFixedNumber(2) or !between(s.peek().value, 1, 31)) return s.next();
                _ = p.day.add(s.next().value);
            }
        }
        if (!s.peek().isKeywordType(.time_separator)) {
            if (s.peek().tag != .end) return s.next();
        } else {
            _ = s.next();
            if (!p.isoTime()) return invalid;
        }
        if (p.tz.isEmpty() and p.time.isEmpty()) p.tz.set(0);
        p.day.is_iso = true;
        return .{ .tag = .end };
    }

    /// The part of an ISO string after `T`. False when the string is invalid.
    fn isoTime(p: *Parser) bool {
        const s = &p.s;
        if (!s.peek().isFixedNumber(2) or !between(s.peek().value, 0, 24)) return false;
        const hour_is_24 = s.peek().value == 24;
        _ = p.time.add(s.next().value);
        if (!s.skipSymbol(':')) return false;
        if (!s.peek().isFixedNumber(2) or !between(s.peek().value, 0, 59) or (hour_is_24 and s.peek().value > 0))
            return false;
        _ = p.time.add(s.next().value);
        if (s.skipSymbol(':')) {
            if (!s.peek().isFixedNumber(2) or !between(s.peek().value, 0, 59) or (hour_is_24 and s.peek().value > 0))
                return false;
            _ = p.time.add(s.next().value);
            if (s.skipSymbol('.')) {
                if (!s.peek().isNumber() or (hour_is_24 and s.peek().value > 0)) return false;
                _ = p.time.add(readMilliseconds(s.next()));
            }
        }
        if (s.peek().isKeywordZ()) {
            _ = s.next();
            p.tz.set(0);
        } else if (s.peek().isSign()) {
            p.tz.sign = if (s.next().value == '+') 1 else -1;
            if (s.peek().isFixedNumber(4)) {
                const hm = s.next().value;
                const hour = @divTrunc(hm, 100);
                const min = @rem(hm, 100);
                if (!between(hour, 0, 23) or !between(min, 0, 59)) return false;
                p.tz.hour = hour;
                p.tz.minute = min;
            } else {
                if (!s.peek().isFixedNumber(2) or !between(s.peek().value, 0, 23)) return false;
                p.tz.hour = s.next().value;
                if (!s.skipSymbol(':')) return false;
                if (!s.peek().isFixedNumber(2) or !between(s.peek().value, 0, 59)) return false;
                p.tz.minute = s.next().value;
            }
        }
        return s.peek().tag == .end;
    }

    /// A number in the legacy parser. False when the string is invalid.
    fn number(p: *Parser, n: i32) bool {
        const s = &p.s;
        p.has_read_number = true;
        if (s.skipSymbol(':')) {
            if (s.skipSymbol(':')) {
                if (!p.time.isEmpty()) return false;
                _ = p.time.add(n);
                _ = p.time.add(0);
            } else {
                if (!p.time.add(n)) return false;
                if (s.peek().isSymbol('.')) _ = s.next();
            }
            return true;
        }
        // V8 skips a dot here even when the time does not expect `n`.
        const dot = s.skipSymbol('.');
        if (dot and p.time.isExpecting(n)) {
            _ = p.time.add(n);
            if (!s.peek().isNumber()) return false;
            const ms = readMilliseconds(s.next());
            if (ms < 0) return false;
            _ = p.time.addFinal(ms);
        } else if (p.tz.isExpecting(n)) {
            p.tz.minute = n;
        } else if (p.time.isExpecting(n)) {
            _ = p.time.addFinal(n);
            const next = s.peek();
            if (next.tag != .end and next.tag != .white_space and !next.isKeywordZ() and !next.isSign()) return false;
        } else {
            if (!p.day.add(n)) return false;
            _ = s.skipSymbol('-');
        }
        return true;
    }

    /// A word in the legacy parser. False when the string is invalid.
    fn keyword(p: *Parser, token: Token) bool {
        if (token.kind == .am_pm and !p.time.isEmpty()) {
            p.time.hour_offset = token.value;
        } else if (token.kind == .month_name) {
            p.day.named_month = token.value;
            _ = p.s.skipSymbol('-');
        } else if (token.kind == .time_zone_name and p.has_read_number) {
            p.tz.set(token.value);
        } else {
            // Garbage words are invalid after a number, or right before one.
            if (p.has_read_number) return false;
            if (p.s.peek().isNumber()) return false;
        }
        return true;
    }

    /// A UTC offset after UTC or a time, such as GMT+0100. False when invalid.
    fn offset(p: *Parser, token: Token) bool {
        const s = &p.s;
        p.tz.sign = if (token.sign() < 0) -1 else 1;
        var n: i32 = 0;
        var length: i32 = 0;
        if (s.peek().isNumber()) {
            const nt = s.next();
            length = nt.length;
            n = nt.value;
        }
        p.has_read_number = true;
        if (s.peek().isSymbol(':')) {
            p.tz.hour = n;
            p.tz.minute = none;
        } else if (length == 2 or length == 1) {
            p.tz.hour = n;
            p.tz.minute = 0;
        } else if (length == 4 or length == 3) {
            p.tz.hour = @divTrunc(n, 100);
            p.tz.minute = @rem(n, 100);
        } else {
            return false;
        }
        return true;
    }
};

/// V8 DateParser::Parse. Fills year, month (0-based), day, hour, minute,
/// second, ms and the UTC offset in seconds (NaN when absent).
fn parseFields(text: []const u8, out: *[8]f64) bool {
    var p: Parser = .{ .s = Tokenizer.init(text) };
    const first = p.iso();
    if (first.tag == .invalid) return false;
    p.has_read_number = !p.day.isEmpty();
    var token = first;
    // Each turn consumes at least one character, so the input bounds the loop.
    while (token.tag != .end) : (token = p.s.next()) {
        const ok = if (token.isNumber())
            p.number(token.value)
        else if (token.tag == .keyword)
            p.keyword(token)
        else if (token.isSign() and (p.tz.isUtc() or !p.time.isEmpty()))
            p.offset(token)
        else
            !((token.isSign() or token.isSymbol(')')) and p.has_read_number);
        if (!ok) return false;
    }
    if (!p.day.write(out) or !p.time.write(out)) return false;
    out[7] = p.tz.write() orelse return false;
    return true;
}

/// `Date.parse(text)`: the time value, or NaN.
pub fn parse(text: []const u8) f64 {
    var out: [8]f64 = undefined;
    if (!parseFields(text, &out)) return std.math.nan(f64);
    const day = makeDay(out[0], out[1], out[2]);
    const time = makeTime(out[3], out[4], out[5], out[6]);
    var date = makeDate(day, time);
    if (std.math.isNan(out[7])) {
        // Local time is UTC. V8 checks the range before the zone conversion.
        const bound = max_time + 30 * ms_per_day;
        if (!(date >= -bound and date <= bound)) return std.math.nan(f64);
    } else {
        date -= out[7] * 1000;
    }
    return timeClip(date);
}

// ---- library functions ------------------------------------------------------

pub const Op = enum(u8) {
    from_value,
    from_parts,
    utc,
    parse,
    json,
    text,
    zone_offset,
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

fn formatted(vm: *Vm, t: f64, f: Format) Err!Value {
    if (std.math.isNan(t)) return vm.newStr("Invalid Date");
    var buf: [max_format_len]u8 = undefined;
    return vm.newStr(format(&buf, t, f));
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
            var n: [7]f64 = undefined;
            const count = @min(args.len, 7);
            for (0..count) |k| n[k] = try vm.toNumber(args[k]);
            return value.num(fromParts(n[0..count], op == .utc));
        },
        .parse => return value.num(parse(vm.str(try vm.toStr(arg(args, 0))))),
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
        else => unreachable,
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
            const p = breakDown(t);
            const r = switch (op) {
                .get_full_year => p.year,
                .get_month => p.month,
                .get_date => p.day,
                .get_day => p.weekday,
                .get_hours => p.hour,
                .get_minutes => p.minute,
                .get_seconds => p.second,
                else => p.ms,
            };
            return value.num(@floatFromInt(r));
        },
        else => {},
    }
    var buf: [4]f64 = undefined;
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
    if (op == .set_time) return timeClip(a[0]);
    if (op == .set_full_year) {
        // An invalid date counts as +0 here.
        const p = breakDown(if (std.math.isNan(t)) 0 else t);
        const day = makeDay(a[0], get(a, 1, @floatFromInt(p.month)), get(a, 2, @floatFromInt(p.day)));
        return timeClip(makeDate(day, @floatFromInt(p.in_day)));
    }
    if (std.math.isNan(t)) return nan;
    const p = breakDown(t);
    const h: f64 = @floatFromInt(p.hour);
    const mi: f64 = @floatFromInt(p.minute);
    const s: f64 = @floatFromInt(p.second);
    const ms: f64 = @floatFromInt(p.ms);
    const days: f64 = @floatFromInt(p.days);
    const in_day: f64 = @floatFromInt(p.in_day);
    const r = switch (op) {
        .set_milliseconds => makeDate(days, makeTime(h, mi, s, a[0])),
        .set_seconds => makeDate(days, makeTime(h, mi, a[0], get(a, 1, ms))),
        .set_minutes => makeDate(days, makeTime(h, a[0], get(a, 1, s), get(a, 2, ms))),
        .set_hours => makeDate(days, makeTime(a[0], get(a, 1, mi), get(a, 2, s), get(a, 3, ms))),
        .set_date => makeDate(makeDay(@floatFromInt(p.year), @floatFromInt(p.month), a[0]), in_day),
        .set_month => makeDate(makeDay(@floatFromInt(p.year), a[0], get(a, 1, @floatFromInt(p.day))), in_day),
        else => unreachable,
    };
    return timeClip(r);
}

/// `new Date(value)` with one argument.
fn fromValue(vm: *Vm, v: Value) Err!f64 {
    return switch (value.kindOf(v)) {
        .number => timeClip(value.asNum(v)),
        .string => parse(vm.str(v)),
        .array, .object, .ref => parse(vm.str(try vm.toStr(v))),
        else => timeClip(try vm.toNumber(v)),
    };
}

// ---- tests ----------------------------------------------------------------

fn testFormat(t: f64, f: Format) []const u8 {
    const S = struct {
        var buf: [max_format_len]u8 = undefined;
    };
    return format(&S.buf, t, f);
}

test "civil dates round-trip over a wide range" {
    var d: i64 = -100_000_000;
    while (d <= 100_000_000) : (d += 9973) {
        const c = civilFromDays(d);
        try std.testing.expectEqual(d, daysFromCivil(c.year, c.month + 1, c.day));
    }
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
    try std.testing.expectEqual(@as(f64, 0), parse("1970-01-01"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), parse("2020-01-01T00:00:00Z"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), parse("2020-01-01 00:00"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), parse("Wed, 01 Jan 2020 00:00:00 GMT"));
    try std.testing.expectEqual(@as(f64, 1_577_836_800_000), parse("Wed Jan 01 2020 01:00:00 GMT+0100 (CET)"));
    try std.testing.expect(std.math.isNan(parse("2020-13-01")));
    try std.testing.expect(std.math.isNan(parse("hello")));
    try std.testing.expect(std.math.isNan(parse("")));
}

test "setters and parts" {
    try std.testing.expectEqual(@as(f64, 86_400_000), set(.set_date, 0, &.{2}));
    try std.testing.expectEqual(@as(f64, 0), set(.set_full_year, std.math.nan(f64), &.{1970}));
    try std.testing.expect(std.math.isNan(set(.set_hours, std.math.nan(f64), &.{1})));
    try std.testing.expectEqual(@as(f64, 951_782_400_000), fromParts(&.{ 2000, 1, 29 }, false));
    try std.testing.expectEqual(@as(f64, -2_208_988_800_000), fromParts(&.{0}, true));
}
