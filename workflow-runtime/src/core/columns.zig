//! Columnar item batches for item shapes that are known before the data:
//! rows of cells under a header row (Google Sheets `values`, CSV-like
//! vendor answers), turned into n8n items with one key per column.
//!
//! The tree form of such items is one region object per row, one key
//! string per cell and a key search per assignment. A batch keeps the cells
//! as a struct of arrays (kind, reference, length) in scratch, one entry
//! per cell, and the keys once per column. The keys are resolved once per
//! batch: which columns share a key, the ECMAScript key order, and the JSON
//! text of each key. Strings without escapes stay where they are in the
//! source and are copied out as they are.
//!
//! Three ways out:
//! - `writeItems`: the items as JSON (an effect body, a node's output, a
//!   step event), with no region value at all;
//! - `materialize`: region trees, only when user code needs them;
//! - the cells, for native code that reads a column.
//!
//! The results are those of n8n's `structureArrayDataByColumn` (the Sheets
//! node, `packages/@n8n/workflow-lang/src/nodes/google-sheets.ts`) followed
//! by JSON.stringify: the tests compare both with a tree-building
//! reference, and a fuzz target does the same on generated sheets.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const ops = @import("ops.zig");
const fast = @import("simd_json.zig");
const arena_mod = @import("arena.zig");
const Arena = arena_mod.Arena;
const Builder = arena_mod.Builder;
const Value = value.Value;
const Vm = ops.Vm;
const assert = std.debug.assert;

pub const Error = error{
    /// The document is not rows of scalar cells: use the tree path.
    Shape,
    Syntax,
    ArenaFull,
    /// More columns than `max_cols`.
    TooWide,
};

pub const max_cols = 256;

pub const Kind = enum(u8) {
    /// A string whose JSON text is `src[ref..][0..len]`, with no escapes and
    /// valid UTF-8: it is written out as it is.
    raw,
    /// A string decoded into the batch text: `text[ref..][0..len]`.
    text,
    /// A number: `nums[ref]`.
    number,
    true_,
    false_,
    /// A JSON null cell. In an item it becomes "" (`cell ?? ''`).
    null_,
};

pub const Options = struct {
    /// The row of keys and the first row of items, as indices into the rows
    /// (with the row-number column, the sheet's own rows).
    header_row: u32 = 0,
    first_data_row: u32 = 1,
    /// Put a `row_number` column first: the row's 1-based index, and
    /// `row_number` as the header (the Sheets node's `prepareSheetData`).
    row_number: bool = false,
};

pub const Batch = struct {
    src: []const u8,
    opts: Options,
    nrows: u32 = 0,
    ncells: u32 = 0,
    // Cells, row by row: struct of arrays.
    kind: []Kind,
    ref: []u32,
    len: []u32,
    nums: []f64,
    nnums: u32 = 0,
    /// The first cell of each row, and the cell count of each row.
    row_start: []u32,
    row_len: []u32,
    /// Bytes of decoded strings and of keys, from `text_start` in the arena.
    text: []const u8 = &.{},
    // Per column, after `resolve`: key slot; per slot: key bytes in `text`
    // and its JSON text (`"key":`); slots in the order items print them.
    ncols: u32 = 0,
    // Slices of `max_cols` entries in the arena (no fill on each batch).
    col_slot: []u16,
    nslots: u32 = 0,
    slot_key: [][2]u32,
    slot_json: [][2]u32,
    slot_last_col: []u16,
    order: []u16,

    pub fn cellCount(b: *const Batch) u32 {
        return b.ncells;
    }

    /// The string bytes of a string cell (raw or decoded).
    pub fn cellBytes(b: *const Batch, i: u32) []const u8 {
        return switch (b.kind[i]) {
            .raw => b.src[b.ref[i]..][0..b.len[i]],
            .text => b.text[b.ref[i]..][0..b.len[i]],
            else => unreachable, // Callers check the kind first.
        };
    }

    /// The cell of row `r` and column `c` (`c` below the row's length).
    pub fn cell(b: *const Batch, r: u32, c: u32) u32 {
        assert(r < b.nrows and c < b.row_len[r]);
        return b.row_start[r] + c;
    }
};

/// Read a Sheets `values` answer (`{"range":..,"values":[[..],..]}`) into a
/// batch. Every allocation comes from `arena` and lasts until its reset.
pub fn fromSheetValues(arena: *Arena, src: []const u8, opts: Options) Error!Batch {
    // Each cell needs a byte and a comma; one more of each for safety.
    const cap: u32 = @intCast(src.len / 2 + 2);
    const rows_cap: u32 = @intCast(src.len / 2 + 2);
    var b: Batch = .{
        .src = src,
        .opts = opts,
        .kind = try arena.push(Kind, cap),
        .ref = try arena.push(u32, cap),
        .len = try arena.push(u32, cap),
        .nums = try arena.push(f64, cap),
        .row_start = try arena.push(u32, rows_cap),
        .row_len = try arena.push(u32, rows_cap),
        .col_slot = try arena.push(u16, max_cols),
        .slot_key = try arena.push([2]u32, max_cols),
        .slot_json = try arena.push([2]u32, max_cols),
        .slot_last_col = try arena.push(u16, max_cols),
        .order = try arena.push(u16, max_cols),
    };
    var tb = arena.builder();
    errdefer tb.abandon();
    var sc: fast.Scanner = .{ .src = src };
    var p = sc.next() orelse return error.Syntax;
    if (src[p] != '{') return error.Shape;
    var first = true;
    while (true) {
        p = sc.next() orelse return error.Syntax;
        if (first and src[p] == '}') break;
        first = false;
        if (src[p] != '"') return error.Syntax;
        const close = sc.next() orelse return error.Syntax;
        const key = src[p + 1 .. close];
        // An escaped key could still read "values": leave it to the tree path.
        if (std.mem.indexOfScalar(u8, key, '\\') != null) return error.Shape;
        const colon = sc.next() orelse return error.Syntax;
        if (src[colon] != ':') return error.Syntax;
        const v = sc.next() orelse return error.Syntax;
        if (std.mem.eql(u8, key, "values")) {
            // A repeated key: the last one counts, as in JSON.parse.
            b.nrows = 0;
            b.ncells = 0;
            b.nnums = 0;
            tb.len = 0;
            try readRows(&b, &sc, v, &tb);
        } else try skipValue(&sc, src, v);
        const sep = sc.next() orelse return error.Syntax;
        if (src[sep] == '}') break;
        if (src[sep] != ',') return error.Syntax;
    }
    if (sc.next() != null) return error.Syntax;
    try resolve(&b, &tb);
    b.text = tb.finish();
    return b;
}

/// Skip one value whose first structural byte is at `p`.
fn skipValue(sc: *fast.Scanner, src: []const u8, p_in: u32) Error!void {
    var p = p_in;
    var depth: u32 = 0;
    var n: usize = 0;
    while (n <= src.len) : (n += 1) {
        switch (src[p]) {
            '{', '[' => depth += 1,
            '}', ']' => {
                if (depth == 0) return error.Syntax;
                depth -= 1;
            },
            '"' => {
                const close = sc.next() orelse return error.Syntax;
                assert(src[close] == '"');
            },
            ',', ':' => if (depth == 0) return error.Syntax,
            else => {},
        }
        if (depth == 0) return;
        p = sc.next() orelse return error.Syntax;
    }
    unreachable; // Each round takes a structural byte.
}

fn readRows(b: *Batch, sc: *fast.Scanner, p_in: u32, tb: *Builder) Error!void {
    const src = b.src;
    if (src[p_in] != '[') return error.Shape;
    var p = sc.next() orelse return error.Syntax;
    if (src[p] == ']') return;
    while (true) {
        if (src[p] != '[') return error.Shape;
        if (b.nrows == b.row_start.len) return error.ArenaFull;
        const r = b.nrows;
        b.nrows += 1;
        b.row_start[r] = b.ncells;
        b.row_len[r] = 0;
        if (b.opts.row_number) {
            try addNumber(b, @floatFromInt(r + 1));
            b.row_len[r] += 1;
        }
        p = sc.next() orelse return error.Syntax;
        if (src[p] != ']') {
            while (true) {
                try readCell(b, sc, p, tb);
                b.row_len[r] += 1;
                const sep = sc.next() orelse return error.Syntax;
                if (src[sep] == ']') break;
                if (src[sep] != ',') return error.Syntax;
                p = sc.next() orelse return error.Syntax;
            }
        }
        const sep = sc.next() orelse return error.Syntax;
        if (src[sep] == ']') return;
        if (src[sep] != ',') return error.Syntax;
        p = sc.next() orelse return error.Syntax;
    }
}

fn addCell(b: *Batch, k: Kind, ref: u32, len: u32) Error!void {
    if (b.ncells == b.kind.len) return error.ArenaFull;
    b.kind[b.ncells] = k;
    b.ref[b.ncells] = ref;
    b.len[b.ncells] = len;
    b.ncells += 1;
}

fn addNumber(b: *Batch, f: f64) Error!void {
    if (b.nnums == b.nums.len) return error.ArenaFull;
    b.nums[b.nnums] = f;
    try addCell(b, .number, b.nnums, 0);
    b.nnums += 1;
}

fn readCell(b: *Batch, sc: *fast.Scanner, p: u32, tb: *Builder) Error!void {
    const src = b.src;
    switch (src[p]) {
        '"' => {
            const close = sc.next() orelse return error.Syntax;
            const start = p + 1;
            const j = fast.findSpecial(src, start, close);
            if (j == close) return addCell(b, .raw, start, close - start);
            // Valid UTF-8 without escapes stays raw too.
            if (rawUtf8(src, @intCast(j), close)) return addCell(b, .raw, start, close - start);
            const at: u32 = @intCast(tb.len);
            _ = fast.unescape(Builder, tb, src, start, close) catch |e| switch (e) {
                error.ArenaFull => return error.ArenaFull,
                else => return error.Syntax,
            };
            return addCell(b, .text, at, @intCast(tb.len - at));
        },
        't', 'f', 'n' => {
            const words = [_][]const u8{ "true", "false", "null" };
            const kinds = [_]Kind{ .true_, .false_, .null_ };
            const w: usize = switch (src[p]) {
                't' => 0,
                'f' => 1,
                else => 2,
            };
            const word = words[w];
            if (src.len - p < word.len or !std.mem.eql(u8, src[p..][0..word.len], word)) return error.Syntax;
            if (p + word.len < src.len and fast.isOther(src[p + word.len])) return error.Syntax;
            return addCell(b, kinds[w], 0, 0);
        },
        '{', '[' => return error.Shape,
        else => return addNumber(b, try fast.parseNumber(src, p)),
    }
}

/// True when `src[j..end]` has no backslash or control byte and is valid
/// UTF-8 (the bytes before `j` are plain ASCII).
fn rawUtf8(src: []const u8, j_in: u32, end: u32) bool {
    var j = j_in;
    while (j < end) {
        const c = src[j];
        if (c >= 0x80) {
            const n = fast.seqLen(src[j..end]);
            if (n == 0) return false;
            j += n;
            continue;
        }
        if (c == '\\' or c < 0x20) return false;
        j = @intCast(fast.findSpecial(src, j, end));
    }
    return true;
}

/// Keys: one per column of the longest row (`col_<n>` for a falsy header
/// cell), columns with equal keys share a slot, and the slots go in
/// ECMAScript order (array-index keys ascending, then the others).
fn resolve(b: *Batch, tb: *Builder) Error!void {
    var longest: u32 = 0;
    for (b.row_len[0..b.nrows]) |n| longest = @max(longest, n);
    if (longest > max_cols) return error.TooWide;
    b.ncols = longest;
    b.nslots = 0;
    const has_header = b.opts.header_row < b.nrows;
    var c: u32 = 0;
    while (c < longest) : (c += 1) {
        const at: u32 = @intCast(tb.len);
        const hdr_len = if (has_header) b.row_len[b.opts.header_row] else 0;
        var named = false;
        if (c < hdr_len) {
            const i = b.cell(b.opts.header_row, c);
            if (b.opts.row_number and c == 0 and b.opts.header_row < b.nrows) {
                try tb.append("row_number");
                named = true;
            } else switch (b.kind[i]) {
                // `b.text` is set when the builder finishes: read decoded
                // header bytes from the builder.
                .raw => if (b.len[i] > 0) {
                    try tb.append(b.src[b.ref[i]..][0..b.len[i]]);
                    named = true;
                },
                .text => if (b.len[i] > 0) {
                    try tb.append(tb.bytes()[b.ref[i]..][0..b.len[i]]);
                    named = true;
                },
                .number => if (b.nums[b.ref[i]] != 0 and !std.math.isNan(b.nums[b.ref[i]])) {
                    var nb: [32]u8 = undefined;
                    try tb.append(fast.formatNumber(&nb, b.nums[b.ref[i]]));
                    named = true;
                },
                .true_ => {
                    try tb.append("true");
                    named = true;
                },
                .false_, .null_ => {},
            }
        }
        if (!named) {
            var nb: [24]u8 = undefined;
            try tb.append(std.fmt.bufPrint(&nb, "col_{d}", .{c}) catch unreachable); // 24 bytes hold any u32.
        }
        const key = tb.bytes()[at..];
        // The same key as an earlier column: share its slot.
        var slot: u16 = @intCast(b.nslots);
        for (0..b.nslots) |s| {
            const k = b.slot_key[s];
            if (std.mem.eql(u8, tb.bytes()[k[0]..][0..k[1]], key)) {
                slot = @intCast(s);
                break;
            }
        }
        if (slot == b.nslots) {
            b.slot_key[slot] = .{ at, @intCast(key.len) };
            b.nslots += 1;
            const jat: u32 = @intCast(tb.len);
            try fast.writeString(tb, tb.bytes()[at..][0..key.len]);
            try tb.byte(':');
            b.slot_json[slot] = .{ jat, @intCast(tb.len - jat) };
        } else {
            tb.len = at; // The key bytes are not needed twice.
        }
        b.col_slot[c] = slot;
        b.slot_last_col[slot] = @intCast(c);
    }
    // The print order: array-index keys ascending, then insertion order.
    var n: u32 = 0;
    var last: i64 = -1;
    while (true) {
        var best: ?u16 = null;
        var best_idx: i64 = std.math.maxInt(i64);
        for (0..b.nslots) |s| {
            const k = b.slot_key[s];
            const ai = ops.arrayIndex(tb.bytes()[k[0]..][0..k[1]]) orelse continue;
            if (ai > last and ai < best_idx) {
                best = @intCast(s);
                best_idx = ai;
            }
        }
        const bi = best orelse break;
        b.order[n] = bi;
        n += 1;
        last = best_idx;
    }
    for (0..b.nslots) |s| {
        const k = b.slot_key[s];
        if (ops.arrayIndex(tb.bytes()[k[0]..][0..k[1]]) != null) continue;
        b.order[n] = @intCast(s);
        n += 1;
    }
    assert(n == b.nslots);
}

/// The column that gives slot `s` its value in a row of `row_len` cells:
/// the last column with that key, as later assignments win.
fn valueCol(b: *const Batch, s: u16, row_len: u32) ?u32 {
    const last = b.slot_last_col[s];
    if (last < row_len) return last;
    var c: u32 = @min(row_len, b.ncols);
    while (c > 0) {
        c -= 1;
        if (b.col_slot[c] == s) return c;
    }
    return null;
}

/// The items as a JSON array, as JSON.stringify writes them.
pub fn writeItems(b: *const Batch, out: *Builder) Error!void {
    try out.byte('[');
    var wrote = false;
    var r = b.opts.first_data_row;
    while (r < b.nrows) : (r += 1) {
        const rl = b.row_len[r];
        if (rl == 0) continue; // An item with no keys is dropped.
        if (b.opts.header_row >= b.nrows or b.opts.first_data_row < b.opts.header_row) break;
        if (wrote) try out.byte(',');
        wrote = true;
        try out.byte('{');
        var first = true;
        for (b.order[0..b.nslots]) |s| {
            const c = valueCol(b, s, rl) orelse continue;
            if (!first) try out.byte(',');
            first = false;
            const kj = b.slot_json[s];
            try out.append(b.text[kj[0]..][0..kj[1]]);
            try writeCell(b, b.row_start[r] + c, out);
        }
        try out.byte('}');
    }
    try out.byte(']');
}

fn writeCell(b: *const Batch, i: u32, out: *Builder) Error!void {
    switch (b.kind[i]) {
        .raw => {
            try out.byte('"');
            try out.append(b.src[b.ref[i]..][0..b.len[i]]);
            try out.byte('"');
        },
        .text => try fast.writeString(out, b.text[b.ref[i]..][0..b.len[i]]),
        .number => {
            const f = b.nums[b.ref[i]];
            if (!std.math.isFinite(f)) return out.append("null");
            var nb: [32]u8 = undefined;
            try out.append(fast.formatNumber(&nb, f));
        },
        .true_ => try out.append("true"),
        .false_ => try out.append("false"),
        .null_ => try out.append("\"\""),
    }
}

/// The items as region values: an array of objects. Each key is one
/// string for the whole batch, and each object is allocated at its size.
pub fn materialize(vm: *Vm, b: *const Batch) ops.Err!Value {
    const r = vm.r;
    var keys: [max_cols]Value = undefined;
    for (0..b.nslots) |s| {
        const k = b.slot_key[s];
        keys[s] = try vm.newStr(b.text[k[0]..][0..k[1]]);
    }
    var n_items: u32 = 0;
    const valid = b.opts.header_row < b.nrows and b.opts.first_data_row >= b.opts.header_row;
    if (valid) {
        var r_i = b.opts.first_data_row;
        while (r_i < b.nrows) : (r_i += 1) n_items += @intFromBool(b.row_len[r_i] > 0);
    }
    const arr = try r.newArray(n_items);
    if (!valid) return arr;
    var row = b.opts.first_data_row;
    while (row < b.nrows) : (row += 1) {
        const rl = b.row_len[row];
        if (rl == 0) continue;
        var nkeys: u32 = 0;
        for (b.order[0..b.nslots]) |s| nkeys += @intFromBool(valueCol(b, s, rl) != null);
        const o = try r.newObject(nkeys);
        const off = value.payload(o);
        for (b.order[0..b.nslots]) |s| {
            const c = valueCol(b, s, rl) orelse continue;
            const v = try cellValue(vm, b, b.row_start[row] + c);
            const obj = r.at(heap.Obj, off);
            const es = r.valsAt(obj.entries, obj.cap * 2);
            es[obj.count * 2] = keys[s];
            es[obj.count * 2 + 1] = v;
            obj.count += 1;
        }
        try r.arrPush(value.payload(arr), o);
    }
    return arr;
}

fn cellValue(vm: *Vm, b: *const Batch, i: u32) ops.Err!Value {
    return switch (b.kind[i]) {
        .raw, .text => vm.newStr(b.cellBytes(i)),
        .number => value.num(b.nums[b.ref[i]]),
        .true_ => value.true_,
        .false_ => value.false_,
        .null_ => vm.newStr(""),
    };
}

// ---- tests ------------------------------------------------------------------------------

const json = @import("json.zig");
const module = @import("module.zig");
const Asm = @import("asm.zig").Asm;
const Smith = std.testing.Smith;

const T = struct {
    var region_mem: [1 << 20]u8 align(8) = undefined;
    var scratch_mem: [2 << 20]u8 = undefined;
    var batch_mem: [1 << 20]u8 = undefined;
    var natives: [8]u16 = undefined;

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
        var keys: [max_cols]Value = undefined;
        for (0..longest) |c| {
            const h: Value = if (opts.row_number and c == 0) try vm.newStr("row_number") else if (c < data[key_row].len) data[key_row][c] else value.undef;
            keys[c] = if (vm.truthy(h)) switch (value.kindOf(h)) {
                .string => h,
                .number => blk: {
                    var nb: [32]u8 = undefined;
                    break :blk try vm.newStr(fast.formatNumber(&nb, value.asNum(h)));
                },
                .boolean => try vm.newStr("true"),
                else => return error.Shape, // The batch takes scalar cells only.
            } else blk: {
                var nb: [24]u8 = undefined;
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
    _ = try json.encode(vm, out, items, "");
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
        else => {
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
    _ = got.finish();
    const v = try materialize(&t.vm, &b);
    var mat = t.scratch.builder();
    _ = try json.encode(&t.vm, &mat, v, "");
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
