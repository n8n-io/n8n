//! Tests and fuzz checks for `columns.zig`.
const std = @import("std");
const value = @import("mem/value.zig");
const heap = @import("mem/heap.zig");
const ops = @import("runtime/ops.zig");
const fast = @import("runtime/simd_json.zig");
const json = @import("runtime/json.zig");
const arena_mod = @import("mem/arena.zig");
const module = @import("vm/module.zig");
const Asm = @import("vm/asm.zig").Asm;
const columns = @import("runtime/columns.zig");
const Arena = arena_mod.Arena;
const Builder = arena_mod.Builder;
const Value = value.Value;
const Vm = ops.Vm;
const Options = columns.Options;
const max_cols = columns.max_cols;
const fromSheetValues = columns.fromSheetValues;
const writeItems = columns.writeItems;
const materialize = columns.materialize;
const Smith = std.testing.Smith;

const T = struct {
    var region_mem: [1 << 20]u8 align(8) = undefined;
    var scratch_mem: [2 << 20]u8 = undefined;
    var batch_mem: [1 << 20]u8 = undefined;
    var natives: [8]u16 = @splat(0);

    m: module.Module,
    bytes: []u8,
    region: heap.Region,
    scratch: Arena,
    batch: Arena,
    vm: Vm,

    fn init(t: *T, gpa: std.mem.Allocator) !void {
        var a: Asm = .{ .gpa = gpa };
        defer a.deinit();
        a.beginFunc();
        try a.emit(.ret, 0, 0, 0, 0);
        try a.endFunc("run", 1, 1, 0);
        t.bytes = try a.finish();
        t.m = try module.load(t.bytes, &natives);
        t.region = heap.Region.init(&region_mem);
        t.scratch = Arena.init(&scratch_mem);
        t.batch = Arena.init(&batch_mem);
        t.vm = .{ .r = &t.region, .m = &t.m, .scratch = &t.scratch };
    }
};

/// The tree path: JSON.parse, then `structureArrayDataByColumn` of the v1
/// node on region values, then JSON.stringify.
fn treeItems(vm: *Vm, src: []const u8, opts: Options, out: *Builder) !void {
    const doc = try json.decode(vm, src);
    if (value.kindOf(doc) != .object) return error.Shape;
    const vals = vm.objGet(value.payload(doc), "values");
    const rows_in: []const Value = if (value.kindOf(vals) == .array) vm.r.arrItems(value.payload(vals)) else &.{};
    var data: [4096][]const Value = undefined;
    var with_num: [4096]Value = undefined;
    var nnum: usize = 0;
    for (rows_in, 0..) |row, i| {
        if (value.kindOf(row) != .array) return error.Shape;
        const cells = vm.r.arrItems(value.payload(row));
        if (opts.row_number) {
            // [i + 1, ...row]
            const start = nnum;
            with_num[nnum] = value.num(@floatFromInt(i + 1));
            nnum += 1;
            for (cells) |c| {
                with_num[nnum] = c;
                nnum += 1;
            }
            data[i] = with_num[start..nnum];
        } else data[i] = cells;
    }
    const n = rows_in.len;
    const items = try vm.r.newArray(4);
    const key_row = opts.header_row;
    if (key_row < n and opts.first_data_row >= key_row) {
        var longest: usize = 0;
        for (data[0..n]) |row| longest = @max(longest, row.len);
        var keys: [max_cols]Value = @splat(0);
        for (0..longest) |c| {
            const h: Value = if (opts.row_number and c == 0) try vm.newStr("row_number") else if (c < data[key_row].len) data[key_row][c] else value.undef;
            keys[c] = if (vm.truthy(h)) switch (value.kindOf(h)) {
                .string => h,
                .number => blk: {
                    var nb: [32]u8 = @splat(0);
                    break :blk try vm.newStr(fast.formatNumber(&nb, value.asNum(h)));
                },
                .boolean => try vm.newStr("true"),
                else => return error.Shape, // The batch takes scalar cells only.
            } else blk: {
                var nb: [24]u8 = @splat(0);
                break :blk try vm.newStr(try std.fmt.bufPrint(&nb, "col_{d}", .{c}));
            };
        }
        var r = opts.first_data_row;
        while (r < n) : (r += 1) {
            const o = try vm.r.newObject(4);
            for (data[r], 0..) |cv, c| {
                const v = if (value.isNullish(cv)) try vm.newStr("") else cv;
                try vm.objSet(value.payload(o), keys[c], v);
            }
            if (vm.r.objEntries(value.payload(o)).len > 0) try vm.r.arrPush(value.payload(items), o);
        }
    }
    _ = try json.encode(vm, out, items, ""); // the bool return is not needed.
}

fn checkSheet(t: *T, src: []const u8, opts: Options) !void {
    t.region = heap.Region.init(&T.region_mem);
    t.scratch.reset();
    t.batch.reset();
    var want_b = t.scratch.builder();
    treeItems(&t.vm, src, opts, &want_b) catch |e| {
        want_b.abandon();
        // Text the tree path rejects: the batch rejects it too, or falls back.
        _ = fromSheetValues(&t.batch, src, opts) catch return;
        if (e == error.Shape) return;
        std.debug.print("tree path failed ({s}), batch read: {s}\n", .{ @errorName(e), src });
        return error.BatchAcceptsMore;
    };
    const want = want_b.finish();
    const b = fromSheetValues(&t.batch, src, opts) catch |e| switch (e) {
        error.Shape, error.TooWide => return,
        else => { // any other error is unexpected; print and continue.
            std.debug.print("batch failed ({s}) on {s}\n", .{ @errorName(e), src });
            return e;
        },
    };
    var got = t.batch.builder();
    try writeItems(&b, &got);
    if (!std.mem.eql(u8, want, got.bytes())) {
        std.debug.print("items differ for {s}:\ntree  {s}\nbatch {s}\n", .{ src, want, got.bytes() });
        return error.ItemsDiffer;
    }
    _ = got.finish(); // the returned bytes are not needed.
    const v = try materialize(&t.vm, &b);
    var mat = t.scratch.builder();
    _ = try json.encode(&t.vm, &mat, v, ""); // the bool return is not needed.
    if (!std.mem.eql(u8, want, mat.bytes())) {
        std.debug.print("materialized items differ for {s}:\ntree {s}\nmat  {s}\n", .{ src, want, mat.bytes() });
        return error.MaterializeDiffers;
    }
}

test "columns: sheet values to items, as the v1 node maps them" {
    const gpa = std.testing.allocator;
    var t: T = undefined;
    try t.init(gpa);
    defer gpa.free(t.bytes);
    const docs = [_][]const u8{
        "{\"range\":\"Sheet1!A1:D3\",\"majorDimension\":\"ROWS\",\"values\":[[\"Name\",\"Email\",\"Amount\"],[\"Ada\",\"ada@example.com\",\"12.5\"],[\"Bob\",\"b@x\"]]}",
        "{\"values\":[[\"a\",\"\",\"a\",2,true,false,null],[1,2,3,4,5,6,7,8],[],[\"x\\n\\u00e9\",\"\xc3\xa9\",\"\xff\",null,\"q\\\"\"]]}",
        "{\"values\":[[\"10\",\"2\",\"b\",\"1\"],[\"v10\",\"v2\",\"vb\",\"v1\"]],\"values\":[[\"k\"],[\"last\"]]}",
        "{\"range\":\"A1\"}",
        "{\"values\":[]}",
        "{\"values\":[[\"only header\"]]}",
        "{\"values\":[[\"a\"],[{\"x\":1}]]}",
        // Regression (fuzz): a header cell with escapes.
        "{\"values\":[[\"k\\u00e9\",\"\\n\",\"k\xc3\xa9\"],[1,2,3]]}",
        "{\"val\\u0075es\":[[\"a\"],[\"b\"]]}",
        "{\"values\":[[\"a\"],[1.50,-0,1e21,0.1]] , \"x\":{\"y\":[1,{\"z\":\"]\"}]}}",
        "{\"values\":[[\"a\",\"b\"],[\"1\"",
        "[[\"a\"]]",
    };
    for (docs) |d| {
        try checkSheet(&t, d, .{});
        try checkSheet(&t, d, .{ .row_number = true });
        try checkSheet(&t, d, .{ .header_row = 1, .first_data_row = 2 });
    }
}

fn fuzzSheet(_: void, smith: *Smith) !void {
    const gpa = std.testing.allocator;
    var t: T = undefined;
    try t.init(gpa);
    defer gpa.free(t.bytes);
    var buf: [16 << 10]u8 = undefined;
    var n: usize = 0;
    const put = struct {
        fn f(bf: []u8, at: *usize, s: []const u8) void {
            if (at.* + s.len > bf.len) return;
            @memcpy(bf[at.*..][0..s.len], s);
            at.* += s.len;
        }
    }.f;
    const cells = [_][]const u8{ "\"Name\"", "\"\"", "\"1\"", "\"0\"", "\"10\"", "\"a\\\"b\"", "\"\\u00e9\\n\"", "\"\xc3\xa9t\xc3\xa9\"", "\"\xed\xa0\x80\"", "\"\\ud800\"", "\"col_1\"", "0", "1", "-0", "12.50", "1e21", "true", "false", "null", "\"Name\"", "\"x\"" };
    put(&buf, &n, "{\"range\":\"A1:Z9\",\"values\":[");
    const rows = smith.index(12);
    for (0..rows) |r| {
        if (r > 0) put(&buf, &n, ",");
        put(&buf, &n, "[");
        const ncell = smith.index(9);
        for (0..ncell) |c| {
            if (c > 0) put(&buf, &n, if (smith.index(8) == 0) " , " else ",");
            put(&buf, &n, cells[smith.index(cells.len)]);
        }
        put(&buf, &n, "]");
    }
    put(&buf, &n, "]}");
    const opts: Options = .{
        .row_number = smith.value(bool),
        .header_row = @intCast(smith.index(3)),
        .first_data_row = @intCast(smith.index(4)),
    };
    try checkSheet(&t, buf[0..n], opts);
}

test "fuzz columns sheet values against the tree path" {
    try std.testing.fuzz({}, fuzzSheet, .{});
}
