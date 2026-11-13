//! Fuzz targets of the core (`zig build fuzz --fuzz`). Without --fuzz, each
//! target runs its seed inputs once, as a unit test. Each target checks its
//! own invariants, not only that nothing crashes.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const ops = @import("ops.zig");
const json = @import("json.zig");
const module = @import("module.zig");
const multipart = @import("multipart.zig");
const tz = @import("tz.zig");
const cron = @import("cron.zig");
const core = @import("core.zig");
const Asm = @import("asm.zig").Asm;
const Arena = @import("arena.zig").Arena;
const Smith = std.testing.Smith;

// Fuzz targets run one input at a time; static buffers keep the stack small.
var region_buf: [1 << 20]u8 align(8) = undefined;
var scratch_buf: [4 << 20]u8 = undefined;
var input_buf: [64 << 10]u8 = undefined;
var natives: [64]u16 = undefined;

/// A seed in the fuzzer's input form: `Smith.slice` reads a 4-byte little-
/// endian length first.
fn seed(comptime s: []const u8) *const [4 + s.len]u8 {
    return comptime blk: {
        var out: [4 + s.len]u8 = undefined;
        std.mem.writeInt(u32, out[0..4], s.len, .little);
        @memcpy(out[4..], s);
        const final = out;
        break :blk &final;
    };
}

/// A VM with an empty module, for the JSON codec.
const JsonVm = struct {
    region: heap.Region,
    scratch: Arena,
    m: module.Module,
    vm: ops.Vm,
    bytes: []u8,

    fn init(j: *JsonVm, gpa: std.mem.Allocator) !void {
        var a: Asm = .{ .gpa = gpa };
        defer a.deinit();
        a.beginFunc();
        try a.emit(.ret, 0, 0, 0, 0);
        try a.endFunc("run", 1, 1, 0);
        j.bytes = try a.finish();
        j.m = try module.load(j.bytes, &natives);
        j.region = heap.Region.init(&region_buf);
        j.scratch = Arena.init(&scratch_buf);
        j.vm = .{ .r = &j.region, .m = &j.m, .scratch = &j.scratch };
    }

    fn encode(j: *JsonVm, v: value.Value) ![]const u8 {
        var b = j.scratch.builder();
        if (!try json.encode(&j.vm, &b, v, "")) try b.append("undefined");
        return b.finish();
    }
};

fn fuzzJson(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    const input = input_buf[0..smith.slice(&input_buf)];
    var j: JsonVm = undefined;
    try j.init(gpa);
    defer gpa.free(j.bytes);
    const v = json.decode(&j.vm, input) catch |e| {
        // Text that std.json accepts must decode, unless it is too large or
        // too deep for the limits, or holds a lone surrogate escape.
        const valid = std.json.validate(gpa, input) catch false;
        if (valid and e == error.Syntax) {
            std.debug.print("std.json accepts, core rejects: {s}\n", .{input});
            return error.DecoderRejectsValidJson;
        }
        return;
    };
    // decode(encode(x)) gives the same text again.
    const t1 = try j.encode(v);
    const v2 = json.decode(&j.vm, t1) catch |e| {
        if (e == error.RegionFull) return;
        std.debug.print("re-decode failed: {s}\n", .{t1});
        return error.EncoderOutputNotDecodable;
    };
    const t2 = try j.encode(v2);
    if (!std.mem.eql(u8, t1, t2)) {
        std.debug.print("round trip differs:\n{s}\n{s}\n", .{ t1, t2 });
        return error.RoundTripDiffers;
    }
    // The encoder writes JSON; a lone surrogate escape is the only form
    // that std.json does not take.
    if (std.mem.indexOf(u8, t1, "\\ud") == null and !std.mem.eql(u8, t1, "undefined")) {
        if (!(std.json.validate(gpa, t1) catch false)) {
            std.debug.print("encoder wrote invalid JSON: {s}\n", .{t1});
            return error.EncoderWroteInvalidJson;
        }
    }
}

test "fuzz json decode and encode" {
    try std.testing.fuzz({}, fuzzJson, .{
        .corpus = &.{
            seed("{\"a\":[1,2.5,-0,1e21,\"x\\u00e9\\n\"],\"b\":{\"c\":null,\"d\":true}}"),
            seed("[\"\\ud83d\\ude00\",\"\\ud800\",1e400,-1e-7]"),
            seed("{\"1\":1,\"0\":0,\"b\":2,\"a\":3}"),
            seed("  \"\\\"\\\\\\/\\b\\f\\n\\r\\t\"  "),
            // Regression: a string that is not UTF-8 (found by fuzzing).
            seed("\"[\xd9\""),
        },
    });
}

// ---- multipart --------------------------------------------------------------------

fn fuzzMultipartRaw(_: void, smith: *Smith) !void {
    var bbuf: [72]u8 = undefined;
    const boundary = bbuf[0..smith.slice(bbuf[0..70])];
    const body = input_buf[0..smith.slice(&input_buf)];
    var it = multipart.Iterator.init(body, boundary) catch return;
    var guard: usize = 0;
    while (it.next() catch return) |p| : (guard += 1) {
        // Every slice of a part points into the body.
        try within(body, p.name);
        try within(body, p.data);
        if (p.filename) |f| try within(body, f);
        if (p.content_type) |c| try within(body, c);
        if (guard > body.len) return error.MultipartLoops;
    }
}

fn within(outer: []const u8, inner: []const u8) !void {
    if (inner.len == 0) return;
    const o = @intFromPtr(outer.ptr);
    const i = @intFromPtr(inner.ptr);
    if (i < o or i + inner.len > o + outer.len) return error.SliceOutsideBody;
}

/// Build a body from parts, parse it, and get the same parts back.
fn fuzzMultipartRoundTrip(_: void, smith: *Smith) !void {
    var body: [16 << 10]u8 = undefined;
    var n: usize = 0;
    var bbuf: [40]u8 = undefined;
    const blen = smith.valueRangeAtMost(u8, 1, 40);
    for (bbuf[0..blen]) |*c| c.* = alnum(smith.value(u8));
    const boundary = bbuf[0..blen];
    const Want = struct { name: [16]u8, name_len: u8, file: bool, data: [256]u8, data_len: u16 };
    var want: [6]Want = undefined;
    const nparts = smith.valueRangeAtMost(u8, 0, 6);
    // A plain buffer writer: the core does no I/O.
    var w: Out = .{ .buf = &body };
    w.print("preamble\r\n", .{}) catch unreachable;
    for (want[0..nparts]) |*p| {
        p.name_len = smith.valueRangeAtMost(u8, 1, 16);
        for (p.name[0..p.name_len]) |*c| c.* = alnum(smith.value(u8));
        p.file = smith.value(bool);
        p.data_len = smith.valueRangeAtMost(u16, 0, 256);
        smith.bytes(p.data[0..p.data_len]);
        // Data that holds the delimiter cannot be framed; skip the input.
        var delim: [44]u8 = undefined;
        const d = std.fmt.bufPrint(&delim, "\r\n--{s}", .{boundary}) catch unreachable;
        if (std.mem.indexOf(u8, p.data[0..p.data_len], d[2..]) != null) return;
        w.print("--{s}\r\nContent-Disposition: form-data; name=\"{s}\"{s}\r\n\r\n", .{ boundary, p.name[0..p.name_len], if (p.file) "; filename=\"f.bin\"" else "" }) catch return;
        w.writeAll(p.data[0..p.data_len]) catch return;
        w.writeAll("\r\n") catch return;
    }
    w.print("--{s}--\r\n", .{boundary}) catch return;
    n = w.len;
    var it = try multipart.Iterator.init(body[0..n], boundary);
    for (want[0..nparts]) |p| {
        const got = (try it.next()) orelse return error.PartMissing;
        try std.testing.expectEqualStrings(p.name[0..p.name_len], got.name);
        try std.testing.expectEqual(p.file, got.filename != null);
        try std.testing.expectEqualSlices(u8, p.data[0..p.data_len], got.data);
    }
    try std.testing.expect((try it.next()) == null);
}

const Out = struct {
    buf: []u8,
    len: usize = 0,
    fn writeAll(o: *Out, b: []const u8) error{NoSpace}!void {
        if (o.len + b.len > o.buf.len) return error.NoSpace;
        @memcpy(o.buf[o.len..][0..b.len], b);
        o.len += b.len;
    }
    fn print(o: *Out, comptime fmt: []const u8, args: anytype) error{NoSpace}!void {
        const t = std.fmt.bufPrint(o.buf[o.len..], fmt, args) catch return error.NoSpace;
        o.len += t.len;
    }
};

fn alnum(x: u8) u8 {
    const set = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return set[x % set.len];
}

test "fuzz multipart parser" {
    try std.testing.fuzz({}, fuzzMultipartRaw, .{ .corpus = &.{
        seed("B") ++ seed("--B\r\nContent-Disposition: form-data; name=\"a\"\r\n\r\nx\r\n--B--\r\n"),
    } });
}

test "fuzz multipart round trip" {
    try std.testing.fuzz({}, fuzzMultipartRoundTrip, .{});
}

/// writeBody never fails for a body that is not multipart, and its output
/// is a JSON object member list.
fn fuzzWebhookBody(_: void, smith: *Smith) !void {
    var ct_buf: [64]u8 = undefined;
    const types = [_][]const u8{ "application/json", "application/x-www-form-urlencoded", "text/plain", "image/png", "", "multipart/form-data; boundary=B" };
    // The body first, so a seed is just the body.
    const body = input_buf[0..smith.slice(&input_buf)];
    const ct = types[smith.index(types.len)];
    _ = &ct_buf;
    var a = Arena.init(&scratch_buf);
    var b = a.builder();
    b.append("{\"x\":1") catch unreachable;
    multipart.writeBody(&b, if (ct.len == 0) null else ct, null, body, .{ .raw_body = smith.value(bool), .binary_data = smith.value(bool) }) catch |e| switch (e) {
        error.BadMultipart => if (std.mem.startsWith(u8, ct, "multipart")) return else return error.BadMultipartForOtherType,
        error.ArenaFull => return,
    };
    b.byte('}') catch return;
    const out = b.finish();
    // A JSON body is copied as it is; every other form is valid JSON.
    const json_body = std.mem.eql(u8, ct, "application/json") or ct.len == 0;
    if (!json_body and !(std.json.validate(std.testing.allocator, out) catch false)) {
        std.debug.print("invalid trigger JSON: {s}\n", .{out});
        return error.InvalidTriggerJson;
    }
}

test "fuzz webhook body" {
    try std.testing.fuzz({}, fuzzWebhookBody, .{ .corpus = &.{ seed("a=1&b=%zz&c=+"), seed("--B\r\nContent-Disposition: form-data; name=\"f\"; filename=\"x\"\r\n\r\n\x00\xff\r\n--B--") } });
}

// ---- manual event payload ----------------------------------------------------------

fn fuzzManual(_: void, smith: *Smith) !void {
    const payload = input_buf[0..smith.slice(&input_buf)];
    const m = core.manualPayload(payload) orelse return;
    // An accepted payload has a bounded offset, its rest is a slice of the
    // input, and a payload with the line lost it.
    if (m.clock_offset_ms > core.max_clock_offset_ms or m.clock_offset_ms < -core.max_clock_offset_ms) return error.ClockOutOfRange;
    if (m.rest.len > payload.len) return error.RestOutsideInput;
    if (std.mem.startsWith(u8, payload, core.clock_offset_prefix) and m.rest.len > 0) {
        const nl = std.mem.indexOfScalar(u8, payload, '\n').?;
        if (m.rest.ptr != payload.ptr + nl + 1) return error.LineNotRemoved;
    }
}

test "fuzz manual payload" {
    try std.testing.fuzz({}, fuzzManual, .{ .corpus = &.{
        seed("wf\nv1\nnull"),
        seed("clock:-86400000\nwf\nv1\nnull"),
        seed("clock:315360000000\nwf\n\n{}"),
        seed("clock:315360000001\nwf\n\n{}"),
        seed("clock:one\nwf\n\n{}"),
        seed("clock:"),
        seed("clock:1.5\n\n\n"),
    } });
}

// ---- TZif and cron ------------------------------------------------------------------

var zone: tz.Zone = .{};

fn fuzzTzif(_: void, smith: *Smith) !void {
    const input = input_buf[0..smith.slice(&input_buf)];
    zone = .{};
    tz.parseTzif(input, &zone) catch return;
    var k: usize = 0;
    while (k < 8) : (k += 1) {
        const t = smith.valueRangeAtMost(i64, -4_000_000_000_000, 8_000_000_000_000);
        _ = zone.offsetAt(t);
        if (zone.nextTransition(t)) |tr| if (tr.at <= t) return error.NextTransitionNotAfter;
        if (zone.prevTransition(t)) |tr| if (tr.at > t) return error.PrevTransitionAfter;
    }
}

test "fuzz tzif parser" {
    try std.testing.fuzz({}, fuzzTzif, .{ .corpus = &.{
        seed(@embedFile("testdata/Europe_Berlin.tzif")),
        seed(@embedFile("testdata/Australia_Lord_Howe.tzif")),
        seed(@embedFile("testdata/America_New_York.tzif")),
    } });
}

fn fuzzCron(_: void, smith: *Smith) !void {
    var text_buf: [96]u8 = undefined;
    const text = text_buf[0..smith.slice(&text_buf)];
    const spec = cron.parse(text) catch return;
    const zones = [_][]const u8{ @embedFile("testdata/Europe_Berlin.tzif"), @embedFile("testdata/Australia_Lord_Howe.tzif") };
    zone = .{};
    if (smith.value(bool)) zone = tz.utc() else try tz.parseTzif(zones[smith.index(zones.len)], &zone);
    const after = smith.valueRangeAtMost(i64, 0, 4_000_000_000_000);
    const next = cron.nextSlot(&spec, after, &zone) orelse return;
    if (next <= after) return error.SlotNotAfter;
    if (@mod(next, 1000) != 0) return error.SlotNotWholeSecond;
    // The latest slot up to a later time is at or after the first slot.
    const later = next + smith.valueRangeAtMost(i64, 0, 400 * 86_400_000);
    if (cron.latestSlot(&spec, next, later, &zone) < next) return error.LatestBeforeFirst;
}

test "fuzz cron parser and slots" {
    try std.testing.fuzz({}, fuzzCron, .{ .corpus = &.{ seed("0 9 * * mon-fri"), seed("*/15 * * * *"), seed("0 30 2 * * *"), seed("@weekly"), seed("0 0 29 2 *") } });
}

// ---- regular expressions -----------------------------------------------------------

const regex = @import("regex.zig");

/// Any pattern either fails to compile or matches within the input: each
/// group is unset or a range inside it, and a match ends at or after its start.
/// Regression seed: an empty pattern with `u` from inside a surrogate pair.
fn fuzzRegex(_: void, smith: *Smith) !void {
    var pbuf: [256]u8 = undefined;
    var fbuf: [8]u8 = undefined;
    var ibuf: [128]u8 = undefined;
    const pattern = pbuf[0..smith.slice(&pbuf)];
    const flags = fbuf[0..smith.slice(&fbuf)];
    const text = ibuf[0..smith.slice(&ibuf)];
    var arena = Arena.init(&scratch_buf);
    const re = regex.compile(&arena, pattern, flags) catch return;
    const input = try regex.toUtf16(&arena, text);
    var last: u32 = 0;
    // A global search: each match starts at or after the one before.
    var rounds: usize = 0;
    while (rounds < 8 and last <= input.len) : (rounds += 1) {
        var steps: u64 = 0;
        const found = regex.exec(&arena, re, input, last, &steps) catch |e| switch (e) {
            error.StepLimit => return,
            else => return e,
        };
        const caps = found orelse return;
        errdefer std.debug.print("regex fuzz: pattern {x} flags {s} input {x} last {d} caps {any}\n", .{ pattern, flags, text, last, caps });
        try std.testing.expect(caps.len == 2 * (re.groups + 1));
        // In the Unicode mode a start inside a surrogate pair moves back one unit, as in V8.
        try std.testing.expect(caps[0] + 1 >= last and caps[0] <= caps[1] and caps[1] <= input.len);
        var g: usize = 2;
        while (g < caps.len) : (g += 2) {
            if (caps[g] < 0) {
                try std.testing.expect(caps[g + 1] < 0);
                continue;
            }
            try std.testing.expect(caps[g] <= caps[g + 1] and caps[g + 1] <= input.len);
        }
        last = @as(u32, @intCast(caps[1])) + @intFromBool(caps[1] == caps[0]);
    }
}

test "fuzz regex compile and exec" {
    try std.testing.fuzz({}, fuzzRegex, .{
        .corpus = &.{
            seed("(a|b)*c") ++ seed("g") ++ seed("aabbc abc"),
            seed("^(?:(\\d+)-)?(?<w>\\w+)\\k<w>$") ++ seed("") ++ seed("12-abab"),
            seed("(?=(a+))a*b\\1") ++ seed("i") ++ seed("AAAB"),
            seed("[^\\s\\d]{2,3}?|x(?!y)") ++ seed("m") ++ seed("xy\nab c"),
            seed("😀.\\u{1F600}") ++ seed("u") ++ seed("😀x😀"),
            seed("") ++ seed("u") ++ seed("\xd7\xab\xf3\x4d\x56\xa8\xf2\x5d"),
            // A past crash: a group name that is not a name, then groups up to a later `>`.
            seed("(?<wR/(\\d+)-(?<w>\\w+)\\k<w>") ++ seed("i") ++ seed("ab"),
        },
    });
}

// ---- JSON.parse error messages ------------------------------------------------------

const json_error = @import("json_error.zig");

fn fuzzJsonError(_: void, smith: *Smith) !void {
    var tbuf: [256]u8 = undefined;
    const text = tbuf[0..smith.slice(&tbuf)];
    var buf: [json_error.max_message]u8 = undefined;
    const msg = json_error.message(text, &buf) orelse return;
    try std.testing.expect(msg.len > 0 and msg.len <= json_error.max_message);
    // The scan stops at the first error: the same text gives the same message.
    var again: [json_error.max_message]u8 = undefined;
    try std.testing.expectEqualStrings(msg, json_error.message(text, &again).?);
}

test "fuzz json error messages" {
    try std.testing.fuzz({}, fuzzJsonError, .{
        .corpus = &.{
            seed("{\"a\":1,}"),
            seed("[1, 2 3]"),
            seed("\"a\\u12\" x"),
            seed("x23456789\xf0\x9f\x98\x80aaaaaaaaaaaaaaaaaaaa"),
            seed("{\"aaaaaaaaaaaaaaaaaaaa\": x}"),
            // A 4-byte lead with too few bytes after it (a past crash).
            seed("\xfc\xe2\x18"),
        },
    });
}

// ---- String.prototype.normalize ----------------------------------------------------

const unorm = @import("normalize.zig");

var norm_buf: [1 << 16]u8 = undefined;

fn fuzzNormalize(_: void, smith: *Smith) !void {
    var tbuf: [128]u8 = undefined;
    const text = tbuf[0..smith.slice(&tbuf)];
    var arena = Arena.init(&norm_buf);
    for ([_]unorm.Form{ .nfc, .nfd, .nfkc, .nfkd }) |form| {
        const once = try unorm.normalize(&arena, text, form);
        // A normal form is stable: normalizing it again changes nothing.
        try std.testing.expectEqualSlices(u8, once, try unorm.normalize(&arena, once, form));
    }
    // NFC of the NFD is the NFC.
    const nfd = try unorm.normalize(&arena, text, .nfd);
    try std.testing.expectEqualSlices(u8, try unorm.normalize(&arena, text, .nfc), try unorm.normalize(&arena, nfd, .nfc));
}

test "fuzz normalize" {
    try std.testing.fuzz({}, fuzzNormalize, .{ .corpus = &.{
        seed("e\xcc\x81\xcc\xa3a\xcc\x88"),
        seed("\xea\xb0\x80\xe1\x86\xa8\xe1\x84\x80\xe1\x85\xa1"),
        seed("\xef\xac\x81\xe2\x91\xa0\xc3\x85"),
        seed("\xed\xa0\xbd\xcc\x81\xff"),
    } });
}

// ---- String.prototype.localeCompare ------------------------------------------------

const collate = @import("collate.zig");

var collate_buf: [1 << 18]u8 = undefined;

fn fuzzCollate(_: void, smith: *Smith) !void {
    var abuf: [64]u8 = undefined;
    var bbuf: [64]u8 = undefined;
    const a = abuf[0..smith.slice(&abuf)];
    const b = bbuf[0..smith.slice(&bbuf)];
    var arena = Arena.init(&collate_buf);
    const ab = try collate.compare(&arena, a, b);
    // The order is antisymmetric and a text equals itself.
    try std.testing.expectEqual(-ab, try collate.compare(&arena, b, a));
    try std.testing.expectEqual(@as(i8, 0), try collate.compare(&arena, a, a));
}

test "fuzz collation" {
    try std.testing.fuzz({}, fuzzCollate, .{ .corpus = &.{
        seed("co-op") ++ seed("coop"),
        seed("r\xc3\xa9sum\xc3\xa9") ++ seed("resume"),
        seed("\xe6\x97\xa5\xe6\x9c\xac") ++ seed("\xe4\xb8\xad\xe6\x96\x87"),
        seed("\xe0\xb9\x80\xe0\xb8\x81") ++ seed("\xe0\xb8\x81"),
        seed("a\xcc\xa3\xcc\x82") ++ seed("a\xcc\x82\xcc\xa3"),
    } });
}

// ---- dates and POSIX time zone rules ----------------------------------------------

const date = @import("date.zig");

fn fuzzDate(_: void, smith: *Smith) !void {
    var text_buf: [80]u8 = undefined;
    const text = text_buf[0..smith.slice(&text_buf)];
    const t = date.parse(text);
    if (std.math.isNan(t)) return;
    // A parsed time is a whole number of milliseconds in the ECMAScript range.
    if (@abs(t) > 8.64e15 or @trunc(t) != t) return error.DateOutOfRange;
    // Its ISO form parses back to the same time.
    var buf: [date.max_format_len]u8 = undefined;
    const iso = date.format(&buf, t, .iso);
    if (date.parse(iso) != t) return error.IsoRoundTrip;
}

test "fuzz date parser" {
    try std.testing.fuzz({}, fuzzDate, .{ .corpus = &.{
        seed("2024-02-29T12:00:00.000Z"),
        seed("Tue Mar 05 2024 10:00:00 GMT+0100"),
        seed("March 7, 2024 (CET) 10:00 pm"),
        seed("2024-13-01"),
        seed("12/31/1999 23:59:59"),
    } });
}

fn fuzzPosix(_: void, smith: *Smith) !void {
    var text_buf: [64]u8 = undefined;
    const text = text_buf[0..smith.slice(&text_buf)];
    const rule = tz.parsePosix(text) catch return;
    // A rule gives an offset of less than a day at any time.
    var z: tz.Zone = .{};
    z.rule = rule;
    var i: u32 = 0;
    while (i < 16) : (i += 1) {
        const t = smith.valueRangeAtMost(i64, -4_000_000_000, 8_000_000_000);
        const off = z.offsetAt(t);
        if (off <= -86_400 or off >= 86_400) return error.OffsetOutOfRange;
    }
}

test "fuzz posix time zone rules" {
    try std.testing.fuzz({}, fuzzPosix, .{ .corpus = &.{ seed("CET-1CEST,M3.5.0,M10.5.0/3"), seed("EST5EDT,M3.2.0,M11.1.0"), seed("<+1030>-10:30<+11>-11,M10.1.0,M4.1.0"), seed("UTC0") } });
}

// ---- XML and text codecs ---------------------------------------------------------

const xml = @import("xml.zig");
const xmlrss = @import("xmlrss.zig");
const textcodec = @import("textcodec.zig");

/// XML.parse: a value or a message, never a crash; a result encodes as JSON
/// (no cycles, no bad strings); the helpers of rss-parser take any text, and
/// `XML.content` takes each parsed value.
fn fuzzXml(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    const input = input_buf[0..smith.slice(&input_buf)];
    var j: JsonVm = undefined;
    try j.init(gpa);
    defer gpa.free(j.bytes);
    var fail: xml.Failure = .{};
    const v = xml.parse(&j.vm, input, &fail) catch |e| switch (e) {
        error.XmlSyntax => {
            var buf: [400]u8 = undefined;
            const msg = xml.message(&fail, &buf);
            if (msg.len == 0) return error.EmptyMessage;
            return;
        },
        error.RegionFull, error.ArenaFull, error.Limit, error.Throw => return,
    };
    _ = try j.encode(v);
    _ = xmlrss.snippet(&j.vm, input) catch |e| switch (e) {
        error.RegionFull, error.ArenaFull => {},
        else => return e,
    };
    // Every element value of the result renders.
    if (value.kindOf(v) == .object) {
        for (j.vm.r.objEntries(value.payload(v))) |x| {
            // Any error of the render is a limit or a thrown message, not a crash.
            _ = xmlrss.content(&j.vm, x) catch {};
        }
    }
}

test "fuzz XML parse, snippet and content" {
    try std.testing.fuzz({}, fuzzXml, .{
        .corpus = &.{
            seed("<?xml version=\"1.0\"?><rss version=\"2.0\"><channel><item><title>a &amp; b</title><description><![CDATA[<p>x</p>]]></description></item></channel></rss>"),
            seed("<a x=\"1\" x=\"2\">t<b/>u<c>v</c><!-- c --></a>"),
            seed("<!DOCTYPE a [<!ENTITY e \"x\">]><a>&#x1F600;&nbsp;&bogus</a>"),
            seed("\xEF\xBB\xBF <a><b><c><d></d></c></b></a> trailing"),
            seed("<a>&#99999999;</a>"),
            seed("<p>Hello <br/>&notit; &#150;</p>\r<li\rx>y"),
        },
    });
}

/// The text codecs: inverse pairs give the input back.
fn fuzzCodecs(_: void, smith: *Smith) !void {
    const input = input_buf[0..smith.slice(&input_buf)];
    var arena = Arena.init(&scratch_buf);
    // btoa ∘ atob, when atob accepts the input.
    var b1 = arena.builder();
    if (textcodec.atob(&b1, input)) |_| {
        const bin = b1.finish();
        var b2 = arena.builder();
        try textcodec.btoa(&b2, bin);
        const again = b2.finish();
        var b3 = arena.builder();
        try textcodec.atob(&b3, again);
        if (!std.mem.eql(u8, b3.bytes(), bin)) return error.Base64RoundTrip;
    } else |_| {}
    arena.reset();
    // decodeURIComponent ∘ encodeURIComponent on valid UTF-8 without lone surrogates.
    if (std.unicode.utf8ValidateSlice(input)) {
        var e1 = arena.builder();
        try textcodec.encodeUriComponent(&e1, input);
        const enc = e1.finish();
        var d1 = arena.builder();
        try textcodec.decodeUriComponent(&d1, enc);
        if (!std.mem.eql(u8, d1.bytes(), input)) return error.UriRoundTrip;
        arena.reset();
        var s1 = arena.builder();
        try textcodec.escape(&s1, input);
        const esc = s1.finish();
        var un = arena.builder();
        try textcodec.unescape(&un, esc);
        if (!std.mem.eql(u8, un.bytes(), input)) return error.EscapeRoundTrip;
    }
}

test "fuzz text codecs" {
    try std.testing.fuzz({}, fuzzCodecs, .{
        .corpus = &.{ seed("SGVsbG8="), seed("grüße 😀 &=?"), seed("%u20AC%FC") },
    });
}
