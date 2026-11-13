//! Floor 4 (lower bound): the same node work written by hand in Zig, as an
//! ahead-of-time compiled node would run it. No interpreter, no tagged
//! values: items are slices of fields, requests are formatted bytes and
//! responses are scanned once.
//!
//!   Set     copy an item and add two computed fields (as the glue
//!           benchmark's Set: total = amount * 1.19, label = "Order <id>-<n>")
//!   IF      test amount > 10 and status != "x" on each item
//!   Sheets  append one row (the four calls of the v1 node and of the
//!           library node): format the four requests, scan the four
//!           responses, give the item back
const std = @import("std");
const cpu = @import("cpu.zig");

const Val = union(enum) { num: f64, str: []const u8 };
const Field = struct { key: []const u8, val: Val };
const Item = []const Field;

/// A bump arena that is reset after each execution, as a region is.
const Bump = struct {
    buf: []u8,
    used: usize = 0,
    fn alloc(b: *Bump, comptime T: type, n: usize) []T {
        const al = @alignOf(T);
        const start = std.mem.alignForward(usize, b.used, al);
        b.used = start + n * @sizeOf(T);
        std.debug.assert(b.used <= b.buf.len);
        return @as([*]T, @ptrCast(@alignCast(b.buf.ptr + start)))[0..n];
    }
};

fn get(it: Item, key: []const u8) ?Val {
    for (it) |f| if (std.mem.eql(u8, f.key, key)) return f.val;
    return null;
}

fn setNode(b: *Bump, items: []const Item) []Item {
    const out = b.alloc(Item, items.len);
    for (items, 0..) |it, i| {
        const f = b.alloc(Field, it.len + 2);
        @memcpy(f[0..it.len], it);
        const amount = if (get(it, "amount")) |v| v.num else 0;
        f[it.len] = .{ .key = "total", .val = .{ .num = amount * 1.19 } };
        const label = b.alloc(u8, 64);
        const id = if (get(it, "id")) |v| v.str else "";
        const n = if (get(it, "n")) |v| v.num else 0;
        const s = std.fmt.bufPrint(label, "Order {s}-{d}", .{ id, n }) catch label[0..0];
        f[it.len + 1] = .{ .key = "label", .val = .{ .str = s } };
        out[i] = f;
    }
    return out;
}

fn ifNode(b: *Bump, items: []const Item) struct { t: []Item, f: []Item } {
    const t = b.alloc(Item, items.len);
    const f = b.alloc(Item, items.len);
    var nt: usize = 0;
    var nf: usize = 0;
    for (items) |it| {
        const amount = if (get(it, "amount")) |v| v.num else 0;
        const status = if (get(it, "status")) |v| v.str else "";
        if (amount > 10 and !std.mem.eql(u8, status, "x")) {
            t[nt] = it;
            nt += 1;
        } else {
            f[nf] = it;
            nf += 1;
        }
    }
    return .{ .t = t[0..nt], .f = f[0..nf] };
}

// ---- Google Sheets append ----------------------------------------------------

/// The text of the string after `"key":` at or after `from`, or null.
fn scanString(s: []const u8, from: usize, key: []const u8) ?struct { v: []const u8, end: usize } {
    var i = from;
    while (std.mem.indexOfPos(u8, s, i, key)) |k| {
        var j = k + key.len;
        if (j < s.len and s[j] == '"' and k > 0 and s[k - 1] == '"') {
            j += 1;
            while (j < s.len and (s[j] == ' ' or s[j] == ':')) j += 1;
            if (j < s.len and s[j] == '"') {
                const e = std.mem.indexOfScalarPos(u8, s, j + 1, '"') orelse return null;
                return .{ .v = s[j + 1 .. e], .end = e + 1 };
            }
        }
        i = k + key.len;
    }
    return null;
}

/// The strings of the first inner array of `"values":[[...]]`.
fn headerRow(s: []const u8, out: [][]const u8) usize {
    const v = std.mem.indexOf(u8, s, "\"values\"") orelse return 0;
    const open = std.mem.indexOfPos(u8, s, v, "[[") orelse return 0;
    const close = std.mem.indexOfScalarPos(u8, s, open + 2, ']') orelse return 0;
    var n: usize = 0;
    var i = open + 2;
    while (i < close and n < out.len) {
        const q = std.mem.indexOfScalarPos(u8, s, i, '"') orelse break;
        if (q >= close) break;
        const e = std.mem.indexOfScalarPos(u8, s, q + 1, '"') orelse break;
        out[n] = s[q + 1 .. e];
        n += 1;
        i = e + 1;
    }
    return n;
}

fn writeJsonVal(w: *std.Io.Writer, v: Val) !void {
    switch (v) {
        .num => |x| try w.print("{d}", .{x}),
        .str => |s| {
            try w.writeByte('"');
            for (s) |ch| switch (ch) {
                '"', '\\' => {
                    try w.writeByte('\\');
                    try w.writeByte(ch);
                },
                else => try w.writeByte(ch),
            };
            try w.writeByte('"');
        },
    }
}

const Responses = struct { meta: []const u8, data: []const u8, dim: []const u8, write: []const u8 };

/// One append: four requests out, four responses in. Returns the bytes
/// written, so the work cannot be removed.
fn sheetsAppend(wbuf: []u8, item: Item, doc: []const u8, sheet_id: []const u8, r: Responses) !usize {
    var w = std.Io.Writer.fixed(wbuf);
    const base = "https://sheets.googleapis.com/v4/spreadsheets/";
    const hdr = "authorization: Bearer ya29.a0AfH6SMBx0123456789abcdef\r\naccept: application/json\r\n";
    // 1. The sheet list, to find the title of the sheet id.
    try w.print("GET {s}{s}?fields=sheets.properties HTTP/1.1\r\n{s}\r\n", .{ base, doc, hdr });
    var title: []const u8 = "";
    var pos: usize = 0;
    while (std.mem.indexOfPos(u8, r.meta, pos, "\"sheetId\"")) |k| {
        const colon = std.mem.indexOfScalarPos(u8, r.meta, k, ':') orelse break;
        var j = colon + 1;
        while (r.meta[j] == ' ') j += 1;
        const e = std.mem.indexOfAnyPos(u8, r.meta, j, ",}") orelse break;
        if (std.mem.eql(u8, r.meta[j..e], sheet_id)) {
            if (scanString(r.meta, e, "title")) |t| title = t.v;
            break;
        }
        pos = e;
    }
    // 2. The sheet data, for the header row.
    try w.print("GET {s}{s}/values/{s}!A:Z HTTP/1.1\r\n{s}\r\n", .{ base, doc, title, hdr });
    var cols: [64][]const u8 = undefined;
    const ncols = headerRow(r.data, &cols);
    // 3. One more row.
    var body_buf: [4096]u8 = undefined;
    var bw = std.Io.Writer.fixed(&body_buf);
    try bw.print("{{\"requests\":[{{\"appendDimension\":{{\"sheetId\":{s},\"dimension\":\"ROWS\",\"length\":1}}}}]}}", .{sheet_id});
    try w.print("POST {s}{s}:batchUpdate HTTP/1.1\r\n{s}content-length: {d}\r\n\r\n{s}", .{ base, doc, hdr, bw.buffered().len, bw.buffered() });
    if (r.dim.len == 0) return error.Response;
    // 4. The row, in column order.
    bw = std.Io.Writer.fixed(&body_buf);
    try bw.print("{{\"range\":\"{s}!A2\",\"values\":[[", .{title});
    for (cols[0..ncols], 0..) |col, i| {
        if (i > 0) try bw.writeByte(',');
        if (get(item, col)) |v| try writeJsonVal(&bw, v) else try bw.writeAll("\"\"");
    }
    try bw.writeAll("]]}");
    try w.print("PUT {s}{s}/values/{s}!A2?valueInputOption=RAW HTTP/1.1\r\n{s}content-length: {d}\r\n\r\n{s}", .{ base, doc, title, hdr, bw.buffered().len, bw.buffered() });
    if (scanString(r.write, 0, "updatedRange") == null and std.mem.indexOf(u8, r.write, "updatedRows") == null) return error.Response;
    return w.buffered().len;
}

pub fn main(gpa: std.mem.Allocator, out: *std.Io.Writer, args: []const []const u8) !void {
    _ = args;
    const buf = try gpa.alloc(u8, 1 << 20);
    defer gpa.free(buf);
    var b: Bump = .{ .buf = buf };
    const item: Item = &.{
        .{ .key = "id", .val = .{ .str = "A-1001" } },
        .{ .key = "n", .val = .{ .num = 1 } },
        .{ .key = "amount", .val = .{ .num = 25 } },
        .{ .key = "status", .val = .{ .str = "open" } },
        .{ .key = "email", .val = .{ .str = "user1@example.com" } },
        .{ .key = "Name", .val = .{ .str = "Cy" } },
        .{ .key = "Count", .val = .{ .num = 7 } },
    };
    const items = [_]Item{item};
    const iters: u32 = 5_000_000;

    var t = cpu.threadNs();
    var sink: usize = 0;
    for (0..iters) |_| {
        b.used = 0;
        sink +%= setNode(&b, &items).len;
    }
    const set_ns = @as(f64, @floatFromInt(cpu.threadNs() - t)) / iters;

    t = cpu.threadNs();
    for (0..iters) |_| {
        b.used = 0;
        sink +%= ifNode(&b, &items).t.len;
    }
    const if_ns = @as(f64, @floatFromInt(cpu.threadNs() - t)) / iters;

    const r: Responses = .{
        .meta = "{\"sheets\":[{\"properties\":{\"sheetId\":0,\"title\":\"Sheet1\",\"index\":0,\"sheetType\":\"GRID\",\"gridProperties\":{\"rowCount\":1000,\"columnCount\":26}}},{\"properties\":{\"sheetId\":123,\"title\":\"Sales Q1\",\"index\":1,\"sheetType\":\"GRID\",\"gridProperties\":{\"rowCount\":1000,\"columnCount\":26}}}]}",
        .data = "{\"range\":\"'Sales Q1'!A1:Z1000\",\"majorDimension\":\"ROWS\",\"values\":[[\"Name\",\"Count\",\"Tags\",\"Other\"],[\"Ada\",\"3\"]]}",
        .dim = "{\"spreadsheetId\":\"1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789\",\"replies\":[{}]}",
        .write = "{\"spreadsheetId\":\"1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789\",\"updatedRange\":\"'Sales Q1'!A2:D2\",\"updatedRows\":1,\"updatedColumns\":4,\"updatedCells\":4}",
    };
    var wbuf: [16 << 10]u8 = undefined;
    const sheet_iters: u32 = 2_000_000;
    t = cpu.threadNs();
    var req_bytes: usize = 0;
    for (0..sheet_iters) |_| req_bytes = try sheetsAppend(&wbuf, item, "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789", "123", r);
    const sheets_ns = @as(f64, @floatFromInt(cpu.threadNs() - t)) / sheet_iters;
    std.mem.doNotOptimizeAway(sink);
    try out.print("native set_ns={d:.1} if_ns={d:.1} sheets_append_ns={d:.0} sheets_request_bytes={d} sheets_response_bytes={d}\n", .{ set_ns, if_ns, sheets_ns, req_bytes, r.meta.len + r.data.len + r.dim.len + r.write.len });
}

test "sheets append scans the header and the title" {
    var wbuf: [8192]u8 = undefined;
    const item: Item = &.{.{ .key = "Name", .val = .{ .str = "Cy" } }};
    const n = try sheetsAppend(&wbuf, item, "doc", "123", .{
        .meta = "{\"sheets\":[{\"properties\":{\"sheetId\":123,\"title\":\"Sales\"}}]}",
        .data = "{\"values\":[[\"Name\",\"Count\"]]}",
        .dim = "{}",
        .write = "{\"updatedRows\":1}",
    });
    try std.testing.expect(std.mem.indexOf(u8, wbuf[0..n], "[[\"Cy\",\"\"]]") != null);
    try std.testing.expect(std.mem.indexOf(u8, wbuf[0..n], "values/Sales!A2") != null);
}
