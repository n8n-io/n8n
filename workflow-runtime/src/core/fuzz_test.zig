//! Fuzz targets of the core (`zig build fuzz --fuzz`). Without --fuzz, each
//! target runs its seed inputs once, as a unit test. Each target checks its
//! own invariants, not only that nothing crashes.
const std = @import("std");
const value = @import("mem/value.zig");
const heap = @import("mem/heap.zig");
const ops = @import("runtime/ops.zig");
const json = @import("runtime/json.zig");
const module = @import("vm/module.zig");
const multipart = @import("runtime/multipart.zig");
const tz = @import("text/tz.zig");
const cron = @import("text/cron.zig");
const core = @import("sched/core.zig");
const Asm = @import("vm/asm.zig").Asm;
const Arena = @import("mem/arena.zig").Arena;
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

// ---- credential flags ---------------------------------------------------------------

fn fuzzCredFlags(_: void, smith: *Smith) !void {
    const cred_flags = @import("text/cred_flags.zig");
    const doc = input_buf[0..smith.slice(&input_buf)];
    const found = cred_flags.scan(doc, "slot", "f00000001");
    if (found == .invalid) {
        if (cred_flags.valid(doc)) return error.FormDependsOnTheQuestion;
        return;
    }
    // A document of the one form is one JSON value, and the general JSON
    // reader finds the same flag.
    if (module.jsonSkipValue(doc, 0) != doc.len) return error.NotOneJsonValue;
    const raw: ?[]const u8 = if (module.jsonGet(doc, "slot")) |of_slot| module.jsonGet(of_slot, "f00000001") else null;
    const same = switch (found) {
        .yes => raw != null and std.mem.eql(u8, raw.?, "true"),
        .no => raw != null and std.mem.eql(u8, raw.?, "false"),
        .absent => raw == null,
        .invalid => unreachable, // Returned above.
    };
    if (!same) return error.ReadersDisagree;
}

test "fuzz credential flags document" {
    try std.testing.fuzz({}, fuzzCredFlags, .{ .corpus = &.{
        seed("{}"),
        seed("{\"slot\":{\"f00000001\":true}}"),
        seed("{\"a\":{},\"slot\":{\"f00000002\":true,\"f00000001\":false},\"slot\":{\"f00000001\":true}}"),
        seed("{\"slot\":{\"f00000001\":\"true\"}}"),
        seed("{\"sl\\\"ot\":{\"f00000001\":true}}"),
        seed("{\"slot\":{\"f00000001\":true,\"f00000001\":false}}"),
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

const regex = @import("text/regex.zig");

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
            seed("[\\p{L}\\P{sc=Han}]+\\p{Emoji}|\\P{gc=Nd}") ++ seed("u") ++ seed("aé漢😀1"),
            seed("") ++ seed("u") ++ seed("\xd7\xab\xf3\x4d\x56\xa8\xf2\x5d"),
            // A past crash: a group name that is not a name, then groups up to a later `>`.
            seed("(?<wR/(\\d+)-(?<w>\\w+)\\k<w>") ++ seed("i") ++ seed("ab"),
        },
    });
}

// ---- JSON.parse error messages ------------------------------------------------------

const json_error = @import("text/json_error.zig");

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

const unorm = @import("text/normalize.zig");

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

const collate = @import("text/collate.zig");

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

const date = @import("stdlib/date.zig");

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

const xml = @import("runtime/xml.zig");
const xmlrss = @import("runtime/xmlrss.zig");
const textcodec = @import("text/textcodec.zig");

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

// ---- PostgreSQL wire protocol (pgwire.zig) ----------------------------------------

const pgwire = @import("wire").pgwire;

/// Every slice that a decoder gives points into the message body.
fn pgwireBody(m: pgwire.Msg) !void {
    switch (m.tag) {
        'E', 'N' => {
            var f = pgwire.Fields.init(m.body);
            for (0..m.body.len + 1) |_| {
                const field = (f.next() catch return) orelse return;
                try within(m.body, field.text);
            }
            return error.PgwireFieldsLoop;
        },
        'T' => {
            var cols = pgwire.Columns.init(m.body) catch return;
            for (0..m.body.len + 1) |_| {
                const col = (cols.next() catch return) orelse return;
                try within(m.body, col.name);
            }
            return error.PgwireColumnsLoop;
        },
        'D' => {
            var vals = pgwire.Values.init(m.body) catch return;
            for (0..m.body.len + 1) |_| {
                const v = (vals.next() catch return) orelse return;
                if (v.text) |t| try within(m.body, t);
            }
            return error.PgwireValuesLoop;
        },
        'C' => {
            const tag = pgwire.commandTag(m.body) catch return;
            try within(m.body, tag.command);
        },
        'R' => switch (pgwire.auth(m.body) catch return) {
            .sasl, .sasl_continue, .sasl_final => |data| try within(m.body, data),
            .ok, .cleartext, .md5, .other => {},
        },
        else => {},
    }
}

fn fuzzPgwire(_: void, smith: *Smith) !void {
    const bytes = input_buf[0..smith.slice(&input_buf)];
    var off: usize = 0;
    for (0..bytes.len + 1) |_| {
        const m = (pgwire.next(bytes[off..], 1 << 12) catch return) orelse return;
        if (m.size < 5 or m.size > bytes.len - off or m.body.len > 1 << 12) return error.PgwireBadFrame;
        try within(bytes, m.body);
        try pgwireBody(m);
        off += m.size;
    }
    return error.PgwireFramesLoop;
}

test "fuzz pgwire backend messages" {
    try std.testing.fuzz({}, fuzzPgwire, .{
        .corpus = &.{
            seed("C\x00\x00\x00\x0dSELECT 1\x00Z\x00\x00\x00\x05I"),
            seed("T\x00\x00\x00\x1b\x00\x01id\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x17\x00\x04\xff\xff\xff\xff\x00\x00D\x00\x00\x00\x0b\x00\x01\x00\x00\x00\x017"),
            seed("E\x00\x00\x00\x18SERROR\x00C42601\x00Mbad\x00\x00"),
            seed("R\x00\x00\x00\x17\x00\x00\x00\x0aSCRAM-SHA-256\x00\x00"),
            seed("D\x00\x00\x00\x0a\x00\x02\xff\xff\xff\xff"),
        },
    });
}

/// A column value of any class and any text gives JSON that fits the
/// buffer, or an error: never a crash, and never bytes after the limit.
fn fuzzPgwireValue(_: void, smith: *Smith) !void {
    var tbuf: [96]u8 = @splat(0);
    const text = tbuf[0..smith.slice(&tbuf)];
    const class: pgwire.Class = smith.value(pgwire.Class);
    const opt: pgwire.Options = .{ .numbers = smith.value(bool) };
    var obuf: [160]u8 = @splat(0xEE);
    var o: pgwire.Out = .{ .buf = obuf[0..128] };
    pgwire.writeValue(&o, class, text, opt) catch return;
    if (o.len == 0 or o.len > 128) return error.PgwireValueLength;
    for (obuf[128..]) |b| if (b != 0xEE) return error.PgwireValueOverrun;
    // An array is one JSON array; an interval, a point and a circle are one object.
    const ends: [2]u8 = switch (class) {
        .array_bool, .array_int, .array_float, .array_text, .array_json, .array_timestamp, .array_interval, .array_point, .array_legacy_date, .array_bytea => "[]".*,
        .interval, .point, .circle => "{}".*,
        .boolean, .int, .int8, .float, .numeric, .json, .bytea, .timestamp, .text, .legacy_date, .unsupported => .{ obuf[0], obuf[o.len - 1] },
    };
    if (obuf[0] != ends[0] or obuf[o.len - 1] != ends[1]) return error.PgwireValueShape;
    // A text column is one JSON string: no raw quote or control byte inside.
    if (class != .text) return;
    for (obuf[1 .. o.len - 1], 1..) |b, i| {
        if (b < 0x20 or (b == '"' and obuf[i - 1] != '\\')) return error.PgwireBadString;
    }
}

test "fuzz pgwire column values" {
    try std.testing.fuzz({}, fuzzPgwireValue, .{
        .corpus = &.{
            seed("2024-01-02 03:04:05.123456+05:30"),
            seed("\\x00ff"),
            seed("{\"a\":[1,\"}\"]}"),
            seed("-9223372036854775808"),
            seed("a\"b\\c\n"),
            seed("{1,NULL,\"a b\",\"q\\\"uote\",{2,3}}"),
            seed("[0:1]={{1.5,NaN},{t,f}}"),
            seed("{\"2024-01-02 03:04:05+00\",infinity,\"(1,2)\",\"1 day 02:00:00\"}"),
            seed("-1 years -2 mons +3 days -04:05:06.789"),
            seed("<(1.5,-2e+20),Infinity>"),
        },
    });
}

/// The scan of a simple text ends for any bytes. A text of SELECT
/// commands has no transaction word, and a transaction word at the start
/// of the text is always seen.
fn fuzzPgwireScan(_: void, smith: *Smith) !void {
    var tbuf: [136]u8 = @splat(0);
    const head = "commit;";
    @memcpy(tbuf[0..head.len], head);
    const len = smith.slice(tbuf[head.len..]);
    const backslash = smith.value(bool);
    const scan = pgwire.scanText(tbuf[head.len..][0..len], backslash);
    if (scan.all_select and scan.transaction) return error.PgwireScanBoth;
    const with_head = pgwire.scanText(tbuf[0 .. head.len + len], backslash);
    if (!with_head.transaction or with_head.all_select) return error.PgwireScanMissed;
}

test "fuzz pgwire simple text scan" {
    try std.testing.fuzz({}, fuzzPgwireScan, .{
        .corpus = &.{
            seed("insert into t values ('a;b'); select $q$ ; $q$; end"),
            seed("select E'a\\'' /* x /* y */ */ -- c\n; \"n;\"\"m\" ; lock table t"),
            seed("$a$ $ $1 'x"),
        },
    });
}

/// A server-first message of any bytes ends the SCRAM exchange with a
/// message or an error.
fn fuzzPgwireScram(_: void, smith: *Smith) !void {
    var sbuf: [300]u8 = @splat(0);
    const server_first = sbuf[0..smith.slice(&sbuf)];
    var s: pgwire.Scram = .{};
    var first: [33]u8 = @splat(0);
    if (s.first(@splat(9), &first).len != 33) return error.PgwireScramFirst;
    var out: [pgwire.Scram.max_final]u8 = @splat(0);
    const final = s.final("pw", server_first, &out) catch return;
    if (!std.mem.startsWith(u8, final, "c=biws,r=")) return error.PgwireScramFinal;
}

test "fuzz pgwire scram server-first" {
    try std.testing.fuzz({}, fuzzPgwireScram, .{
        .corpus = &.{ seed("r=CQkJCQkJCQkJCQkJCQkJCQkJx,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=2"), seed("r=,s=,i=0"), seed("i=99999999999,r=CQkJ") },
    });
}

// ---- MySQL protocol (mywire.zig) --------------------------------------------------

const mywire = @import("wire").mywire;

/// Read the body of one packet with each reader of the codec. A slice
/// that a reader gives lies inside the body.
fn mywireBody(body: []const u8, track: bool) !void {
    if (mywire.handshake(body)) |h| {
        try within(body, h.version);
        try within(body, h.plugin);
    } else |_| {}
    if (mywire.loginReply(body, track)) |reply| switch (reply) {
        .ok => |ok| try within(body, ok.info),
        .err => |e| try within(body, e.message),
        .switch_plugin => |s| try within(body, s.plugin),
        .more => |data| try within(body, data),
    } else |_| {}
    if (mywire.resultHead(body, track)) |head| switch (head) {
        .ok => |ok| try within(body, ok.info),
        .err => |e| {
            if (e.state.len != 0 and e.state.len != 5) return error.MywireState;
            try within(body, e.message);
        },
        .columns => |n| if (n == 0) return error.MywireNoColumns,
        .infile => |name| try within(body, name),
    } else |_| {}
    if (mywire.column(body)) |col| try within(body, col.name) else |_| {}
    if (mywire.eofStatus(body)) |st| {
        if (body.len < 5 or st != std.mem.readInt(u16, body[3..5], .little)) return error.MywireEof;
    } else |_| {}
    var vals = mywire.Values.init(body);
    for (0..body.len + 1) |_| {
        const v = (vals.next() catch return) orelse return;
        if (v.text) |t| try within(body, t);
    }
    return error.MywireValuesLoop;
}

/// Packets of any bytes are framed inside the buffer, and each body is
/// read without a crash.
fn fuzzMywire(_: void, smith: *Smith) !void {
    var buf: [512]u8 = @splat(0);
    const bytes = buf[0..smith.slice(&buf)];
    const track = smith.value(bool);
    var off: usize = 0;
    for (0..bytes.len / 4 + 1) |_| {
        const p = (mywire.next(bytes[off..], 1 << 8) catch return) orelse return;
        if (p.size != p.body.len + 4 or p.size > bytes.len - off) return error.MywireSize;
        try within(bytes, p.body);
        try mywireBody(p.body, track);
        off += p.size;
    }
    return error.MywireFramesLoop;
}

test "fuzz mywire server packets" {
    try std.testing.fuzz({}, fuzzMywire, .{
        .corpus = &.{
            seed("\x07\x00\x00\x01\x00\x01\x02\x02\x00\x00\x00"),
            seed("\x0a\x00\x00\x01\xff\x28\x04#42000bad"),
            seed("\x01\x00\x00\x01\x02\x05\x00\x00\x04\xfe\x00\x00\x02\x00"),
            seed("\x19\x00\x00\x02\x03def\x01a\x01t\x01t\x02id\x02id\x0c\x3f\x00\x0b\x00\x00\x00\x03\x03\x42\x00\x00\x00"),
            seed("\x04\x00\x00\x03\x0242\xfb"),
            seed("\x18\x00\x00\x02\xfemysql_native_password\x00ABCDEFGHIJKLMNOPQRST\x00"),
        },
    });
}

/// A column value of any class and any bytes gives JSON that fits the
/// buffer, or an error: never a crash, and never bytes after the limit.
fn fuzzMywireValue(_: void, smith: *Smith) !void {
    var tbuf: [96]u8 = @splat(0);
    const text = tbuf[0..smith.slice(&tbuf)];
    const class: mywire.Class = smith.value(mywire.Class);
    const opt: mywire.Options = .{ .big_strings = smith.value(bool), .decimal_numbers = smith.value(bool) };
    var obuf: [640]u8 = @splat(0xEE);
    var o: mywire.Out = .{ .buf = obuf[0..600] };
    mywire.writeValue(&o, class, text, opt) catch return;
    if (o.len == 0 or o.len > 600) return error.MywireValueLength;
    for (obuf[600..]) |b| if (b != 0xEE) return error.MywireValueOverrun;
    const out = obuf[0..o.len];
    switch (class) {
        // One JSON string: no raw quote or control byte inside.
        .ascii, .text => {
            if (out[0] != '"' or out[out.len - 1] != '"') return error.MywireValueShape;
            for (out[1 .. out.len - 1], 1..) |b, i| {
                if (b < 0x20 or (b == '"' and out[i - 1] != '\\')) return error.MywireBadString;
            }
        },
        .buffer => if (out[0] != '{' or out[out.len - 1] != '}') return error.MywireValueShape,
        // A number, or the text of a large number: no byte that ends the document around it.
        .int, .big, .float => for (out) |b| {
            if (std.mem.indexOfScalar(u8, "0123456789-+.e\"nul", b) == null) return error.MywireNumber;
        },
        .json => for (out) |b| if (b < 0x20) return error.MywireJsonControl,
        .null_only, .unsupported => return error.MywireNoValue,
    }
}

test "fuzz mywire column values" {
    try std.testing.fuzz({}, fuzzMywireValue, .{
        .corpus = &.{
            seed("-9223372036854775808"),
            seed("0.30000000000000004"),
            seed("{\"a\": [1, 2.50, 12345678901234567890], \"b\": \"x\\\"y\"}"),
            seed("a\"b\\c\n\xff"),
            seed("2024-02-29 13:14:15.123456"),
            seed("1e400"),
        },
    });
}

/// The scan of a text ends for any bytes. A text that starts with a
/// command that writes is never a text of reads.
fn fuzzMywireScan(_: void, smith: *Smith) !void {
    var tbuf: [136]u8 = @splat(0);
    const head = "insert;";
    @memcpy(tbuf[0..head.len], head);
    const len = smith.slice(tbuf[head.len..]);
    const backslash = smith.value(bool);
    if (mywire.onlyReads(tbuf[0 .. head.len + len], backslash)) return error.MywireScanMissed;
    const alone = mywire.onlyReads(tbuf[head.len..][0..len], backslash);
    if (alone and len == 0) return error.MywireScanEmpty;
}

test "fuzz mywire text scan" {
    try std.testing.fuzz({}, fuzzMywireScan, .{
        .corpus = &.{
            seed("select 'a;b'; show tables; -- x\n desc `t;`"),
            seed("select \"a\\\"\" /* x */ # c\n; update t set a = 1"),
            seed("/*! select 1 */ 'x"),
        },
    });
}

// ---- TDS protocol (tdswire.zig) ---------------------------------------------------

const tdswire = @import("wire").tdswire;

/// Any bytes as the reply to a request and to a login: JSON inside the
/// buffer or an error that leaves nothing, never a crash.
fn tdswireReplies(bytes: []const u8) !void {
    var obuf: [2100]u8 = @splat(0xEE);
    var o: tdswire.Out = .{ .buf = obuf[0..2048] };
    var cols: [8]tdswire.Column = @splat(.{});
    if (tdswire.writeReply(&o, bytes, &cols)) |_| {
        const out = obuf[0..o.len];
        if (!std.mem.startsWith(u8, out, "{\"sets\":[") or !std.mem.endsWith(u8, out, "]}")) return error.TdsReplyShape;
        for (out) |b| if (b < 0x20) return error.TdsReplyControlByte;
    } else |_| {
        if (o.len != 0) return error.TdsReplyLeft;
    }
    const login: tdswire.LoginReply = tdswire.loginReply(bytes) catch .{};
    try within(bytes, login.err);
    o.len = 0;
    if (tdswire.writeErrorMessage(&o, login.err)) |_| {
        if (obuf[0] != '"' or obuf[o.len - 1] != '"') return error.TdsMessageShape;
    } else |_| {}
    if (tdswire.preloginEncryption(bytes)) |mode| {
        if ((mode == tdswire.encryption.on or mode == tdswire.encryption.not_supported) and bytes.len < 6) return error.TdsPrelogin;
    } else |_| {}
    for (obuf[2048..]) |b| if (b != 0xEE) return error.TdsOverrun;
}

/// Any bytes as the text of each request: the bytes of a message in whole
/// packets, or an error that leaves nothing.
fn tdswireRequests(bytes: []const u8, number: f64) !void {
    var obuf: [8192]u8 = @splat(0);
    var o: tdswire.Out = .{ .buf = &obuf };
    const collation: [tdswire.collation_bytes]u8 = @splat(0);
    const params = [_]tdswire.Param{
        .{ .name = "p1", .value = .{ .string = bytes } },
        .{ .name = "p2", .value = .{ .number = number } },
    };
    const login: tdswire.Login = .{
        .version = .v7_4,
        .pid = 1,
        .zone = 0,
        .host = bytes,
        .user = bytes,
        .password = bytes,
        .server = bytes,
        .database = bytes,
    };
    const trace: [tdswire.trace_bytes]u8 = @splat(7);
    const batch = if (tdswire.sqlBatch(&o, bytes)) |_| true else |_| false;
    if (std.unicode.utf8ValidateSlice(bytes) and !batch) return error.TdsTextRefused;
    const before = o.len;
    if (tdswire.executeSql(&o, bytes, &params, collation)) |_| {} else |_| {
        if (o.len != before) return error.TdsRequestLeft;
    }
    if (tdswire.login7(&o, login)) |_| {} else |_| {
        if (batch) return error.TdsLoginRefused;
    }
    try tdswire.prelogin(&o, bytes.len % 2 == 0, &trace);
    try tdswire.sqlBatch(&o, tdswire.initial_sql);
    var framed: [8192 + 64 * tdswire.header_len]u8 = @splat(0);
    var f: tdswire.Out = .{ .buf = &framed };
    try tdswire.frame(&f, if (batch) tdswire.kind.sql_batch else tdswire.kind.rpc, obuf[0..o.len], 512);
    var off: usize = 0;
    var body: usize = 0;
    for (0..f.len / tdswire.header_len + 1) |_| {
        const p = (try tdswire.next(framed[off..f.len])) orelse break;
        if (p.size != p.body.len + tdswire.header_len or p.size > 512) return error.TdsPacketSize;
        if (p.last != (off + p.size == f.len)) return error.TdsLastPacket;
        if (!std.mem.eql(u8, p.body, obuf[body..][0..p.body.len])) return error.TdsPacketBody;
        body += p.body.len;
        off += p.size;
    }
    if (body != o.len or off != f.len) return error.TdsFrames;
    if (tdswire.packet_size < 512) return error.TdsPacketLimit;
}

fn fuzzTdswire(_: void, smith: *Smith) !void {
    var buf: [512]u8 = @splat(0);
    const bytes = buf[0..smith.slice(&buf)];
    try tdswireReplies(bytes);
    try tdswireRequests(bytes, @bitCast(smith.value(u64)));
}

test "fuzz tdswire replies and requests" {
    try std.testing.fuzz({}, fuzzTdswire, .{
        .corpus = &.{
            seed("\x81\x01\x00\x00\x00\x00\x00\x09\x00\x30\x01v\x00\xd1\x07\xff\x11\x00\xc1\x00\x01\x00\x00\x00\x00\x00\x00\x00"),
            seed("\x81\x01\x00\x00\x00\x00\x00\x09\x00\xe7\xff\xff\x09\x04\xd0\x00\x34\x01v\x00\xd1\xfe\xff\xff\xff\xff\xff\xff\xff" ++
                "\x02\x00\x00\x00a\x00\x00\x00\x00\x00\xff\x10\x00\xc1\x00\x01\x00\x00\x00\x00\x00\x00\x00"),
            seed("\xaa\x14\x00\x18\x48\x00\x00\x01\x0e\x02\x00n\x00o\x00\x01s\x00\x00\x01\x00\x00\x00\xfd\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"),
            seed("\xe3\x08\x00\x07\x05\x09\x04\xd0\x00\x34\x00\xad\x10\x00\x01\x74\x00\x00\x04\x03S\x00Q\x00L\x00\x0f\x00\x07\xd0"),
            seed("\x00\x00\x0b\x00\x06\x01\x00\x11\x00\x01\xff\x0f\x00\x07\xd0\x00\x00\x03"),
            seed("select @p1 \xc3\xa9 \xf0\x9f\x98\x80"),
        },
    });
}

/// The message builder takes any bytes in its fields. A message that it
/// gives ends with a line break, and each address of the envelope has `@`.
fn fuzzMail(_: void, smith: *Smith) !void {
    const mail = @import("wire").mail;
    const raw = input_buf[0..smith.slice(&input_buf)];
    var parts: [11][]const u8 = @splat("");
    var it = std.mem.splitScalar(u8, raw, 0xff);
    for (&parts) |*p| p.* = it.next() orelse "";
    const files = [_]mail.Attachment{
        .{ .filename = parts[8], .cid = parts[9], .content = parts[10] },
        .{ .filename = "a.png", .cid = "c", .content = parts[10] },
    };
    var rcpts: [8]mail.Rcpt = @splat(.{ .addr = "" });
    var notes: [1024]u8 = @splat(0);
    const fields: mail.Fields = .{
        .from = parts[0],
        .to = parts[1],
        .cc = parts[2],
        .bcc = parts[3],
        .reply_to = parts[4],
        .subject = parts[5],
        .text = parts[6],
        .html = parts[7],
        .attachments = files[0..smith.valueRangeAtMost(u8, 0, 2)],
    };
    const out = scratch_buf[0 .. 1 << 20];
    const work: mail.Work = .{ .out = out, .scratch = scratch_buf[1 << 20 ..][0..mail.scratch_min], .notes = &notes, .rcpts = &rcpts };
    const built = mail.build(fields, .{ .boundary = @splat(7), .id = @splat(9), .now_ms = 86_400_000 }, work) catch |err| {
        try std.testing.expect(err == error.HostOnly or err == error.NoSpace);
        return;
    };
    try std.testing.expect(std.mem.endsWith(u8, built.message, "\n"));
    try std.testing.expect(std.mem.startsWith(u8, built.message_id, "<") and std.mem.endsWith(u8, built.message_id, ">"));
    try std.testing.expect(built.from.len == 0 or std.mem.indexOfScalar(u8, built.from, '@') != null);
    try std.testing.expect(built.rcpts <= rcpts.len);
    for (rcpts[0..built.rcpts]) |r| try std.testing.expect(std.mem.indexOfScalar(u8, r.addr, '@') != null);
    // The headers end with a blank line.
    try std.testing.expect(std.mem.indexOf(u8, built.message, "\r\n\r\n") != null);
}

test "fuzz mail builder" {
    try std.testing.fuzz({}, fuzzMail, .{ .corpus = &.{
        seed("a@example.com\xffBob <b@example.com>, \"C, D\" <c@example.com>\xff\xff\xff\xffHi \xc3\xa9\xffline one\nline two =\xff<p>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>\xffreport.pdf\xff\xffdata"),
        seed("J\xc3\xb6 <a@b.example>\xffa@b.example\xff\xff\xff\xff\"q\"\xff\xff\xe6\xbc\xa2\xe5\xad\x97 =\t \r\n.\xffimg.png\xffcid\xff\x00\x01"),
    } });
}
