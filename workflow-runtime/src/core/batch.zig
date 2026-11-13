//! Node-level batching across executions: the first slice
//! (docs/batching-design.md). The core gathers the effect requests and
//! effect results of one core batch, groups them by module and step, and
//! runs the JSON work of a group in one pass:
//!
//! - `encodeRequests`: the request descriptions (effect args) of every job,
//!   each into its own span of one output buffer. Keys that are module
//!   constants (every key a library node writes) are escaped once per group
//!   and copied after that.
//! - `decodeResults`: each result into its own execution's region.
//!
//! Isolation is the first rule. Each job carries its owner (execution id
//! and slot generation); outputs go back by owner, with assertions; the
//! shared key cache holds only module constants of the group's one module
//! (no execution data), and it is cleared between groups.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const fast = @import("simd_json.zig");
const arena_mod = @import("arena.zig");
const module = @import("module.zig");
const Arena = arena_mod.Arena;
const Builder = arena_mod.Builder;
const Value = value.Value;
const Vm = ops.Vm;
const assert = std.debug.assert;

/// Who a job belongs to. A result goes only to the job with this owner.
pub const Owner = struct {
    exec_id: u64,
    /// The generation of the execution's slot: a slot reused by another
    /// execution in the same batch has another generation.
    gen: u32,

    pub fn eql(a: Owner, b: Owner) bool {
        return a.exec_id == b.exec_id and a.gen == b.gen;
    }
};

pub const EncodeJob = struct {
    owner: Owner,
    vm: *Vm,
    /// The request description (effect args).
    args: Value,
    /// Set by `encodeRequests`: the JSON text, in the output arena, and the
    /// owner it was written for.
    out: []const u8 = &.{},
    out_owner: Owner = .{ .exec_id = 0, .gen = 0 },
    ok: bool = false,
};

/// Constant keys escaped once: module string index → JSON text (`"k":`)
/// in `text`. Direct-mapped; a miss writes the key and stores it.
const KeyText = struct {
    m: ?*const module.Module = null,
    idx: [128]u32,
    span: [128][2]u32,
    text: [8 << 10]u8,
    used: u32 = 0,

    fn clear(k: *KeyText, m: *const module.Module) void {
        k.m = m;
        k.used = 0;
        @memset(&k.idx, std.math.maxInt(u32));
    }
};

/// Encode the args of each job as JSON into `out`. Jobs must be grouped by
/// module (the core sorts its ready list by module already); the key cache
/// starts empty at each change of module. A job that does not fit gets
/// `ok = false` and the caller encodes it alone.
pub fn encodeRequests(jobs: []EncodeJob, out: *Arena) void {
    @setRuntimeSafety(false); // Only for the 0xAA fill of `keys`, kilobytes.
    var keys: KeyText = undefined;
    keys.m = null;
    var stack: [ops.max_depth]Frame = undefined;
    for (jobs) |*j| {
        if (keys.m != j.vm.m) keys.clear(j.vm.m);
        var b = out.builder();
        if (encodeOne(j.vm, &b, j.args, &keys, &stack)) {
            j.out = b.finish();
            j.out_owner = j.owner;
            j.ok = true;
        } else |_| {
            b.abandon();
            j.ok = false;
        }
    }
    // Scatter check: each output belongs to its own job.
    for (jobs) |*j| assert(!j.ok or j.out_owner.eql(j.owner));
}

const Frame = struct { v: Value, i: u32 = 0, wrote: bool = false };

/// JSON.stringify of `v` for request descriptions: objects whose keys are
/// not array indices, arrays and scalars. Anything else (index keys,
/// closures, cycles, depth) returns error.Unsupported and goes the usual way.
fn encodeOne(vm: *Vm, b: *Builder, v: Value, keys: *KeyText, stack: *[ops.max_depth]Frame) !void {
    var sp: usize = 0;
    if (try scalarOrOpen(vm, b, v, stack, &sp)) {} else return;
    while (sp > 0) {
        const top = &stack[sp - 1];
        const is_arr = value.kindOf(top.v) == .array;
        var key: ?Value = null;
        var child: ?Value = null;
        if (is_arr) {
            const items = vm.r.arrItems(value.payload(top.v));
            if (top.i < items.len) {
                child = items[top.i];
                top.i += 1;
            }
        } else {
            const es = vm.r.objEntries(value.payload(top.v));
            while (top.i * 2 < es.len) {
                const i = top.i;
                top.i += 1;
                if (value.kindOf(es[i * 2 + 1]) == .undefined) continue;
                key = es[i * 2];
                child = es[i * 2 + 1];
                break;
            }
        }
        const c = child orelse {
            try b.byte(if (is_arr) ']' else '}');
            sp -= 1;
            continue;
        };
        if (top.wrote) try b.byte(',');
        top.wrote = true;
        if (key) |k| try writeKey(vm, b, k, keys);
        const cv = if (value.kindOf(c) == .undefined and is_arr) value.null_ else c;
        if (value.isHeap(cv)) for (stack[0..sp]) |f| if (f.v == cv) return error.Unsupported;
        if (sp == ops.max_depth) return error.Unsupported;
        _ = try scalarOrOpen(vm, b, cv, stack, &sp);
    }
}

fn writeKey(vm: *Vm, b: *Builder, k: Value, keys: *KeyText) !void {
    const p = value.payload(k);
    const ks = vm.str(k);
    if (ks.len > 0 and ks[0] -% '0' < 10 and ops.arrayIndex(ks) != null) return error.Unsupported;
    if (p < value.const_handle_base) {
        try fast.writeString(b, ks);
        return b.byte(':');
    }
    const idx = p - value.const_handle_base;
    const slot = idx & (keys.idx.len - 1);
    if (keys.idx[slot] == idx) {
        const s = keys.span[slot];
        return b.append(keys.text[s[0]..][0..s[1]]);
    }
    const at = b.len;
    try fast.writeString(b, ks);
    try b.byte(':');
    const t = b.bytes()[at..];
    if (keys.used + t.len <= keys.text.len) {
        @memcpy(keys.text[keys.used..][0..t.len], t);
        keys.idx[slot] = idx;
        keys.span[slot] = .{ keys.used, @intCast(t.len) };
        keys.used += @intCast(t.len);
    }
}

/// Returns true when a container was opened.
fn scalarOrOpen(vm: *Vm, b: *Builder, v: Value, stack: []Frame, sp: *usize) !bool {
    switch (value.kindOf(v)) {
        .number => {
            const f = value.asNum(v);
            if (!std.math.isFinite(f)) return error.Unsupported;
            var nb: [32]u8 = undefined;
            try b.append(fast.formatNumber(&nb, f));
        },
        .null => try b.append("null"),
        .boolean => try b.append(if (value.payload(v) != 0) "true" else "false"),
        .string => try fast.writeString(b, vm.str(v)),
        .array, .object => {
            try b.byte(if (value.kindOf(v) == .array) '[' else '{');
            stack[sp.*] = .{ .v = v };
            sp.* += 1;
            return true;
        },
        .undefined, .ref => return error.Unsupported,
    }
    return false;
}

pub const DecodeJob = struct {
    owner: Owner,
    vm: *Vm,
    payload: []const u8,
    result: fast.DecodeError!Value = error.Syntax,
    /// The owner the result was decoded for, checked on scatter.
    result_owner: Owner = .{ .exec_id = 0, .gen = 0 },
};

/// Decode each job's result into its own execution's region. Scratch use
/// (escaped strings) begins and ends inside each job, so nothing of one
/// job is visible to the next.
pub fn decodeResults(jobs: []DecodeJob) void {
    for (jobs) |*j| {
        const used = j.vm.scratch.used;
        j.result = fast.decode(j.vm, j.payload);
        j.result_owner = j.owner;
        assert(j.vm.scratch.used == used);
    }
    for (jobs) |*j| assert(j.result_owner.eql(j.owner));
}

// ---- tests ---------------------------------------------------------------------------

const heap = @import("heap.zig");
const json = @import("json.zig");
const Asm = @import("asm.zig").Asm;

/// Executions with their own regions on one module whose constants are the
/// keys of a request description.
const Execs = struct {
    const n = 16;
    var regions: [n][16 << 10]u8 align(8) = undefined;
    var scratch_mem: [n][8 << 10]u8 = undefined;
    var out_mem: [64 << 10]u8 = undefined;
    var natives: [8]u16 = undefined;

    m: module.Module,
    bytes: []u8,
    r: [n]heap.Region,
    s: [n]Arena,
    vm: [n]Vm,
    k: [5]Value,

    fn init(e: *Execs, gpa: std.mem.Allocator) !void {
        var a: Asm = .{ .gpa = gpa };
        defer a.deinit();
        const names = [_][]const u8{ "method", "url", "headers", "body", "token" };
        var ids: [5]u16 = undefined;
        for (names, 0..) |nm, i| ids[i] = try a.str(nm);
        a.beginFunc();
        try a.emit(.ret, 0, 0, 0, 0);
        try a.endFunc("run", 1, 1, 0);
        e.bytes = try a.finish();
        e.m = try module.load(e.bytes, &natives);
        for (ids, 0..) |id, i| e.k[i] = value.constString(id);
        for (0..n) |i| {
            e.r[i] = heap.Region.init(&regions[i]);
            e.s[i] = Arena.init(&scratch_mem[i]);
            e.vm[i] = .{ .r = &e.r[i], .m = &e.m, .scratch = &e.s[i] };
        }
    }

    /// A request description with a token unique to execution `i`.
    fn request(e: *Execs, i: usize) !Value {
        const vm = &e.vm[i];
        var tb: [64]u8 = undefined;
        const tok = try std.fmt.bufPrint(&tb, "tok-{d}-\"\\{d}", .{ i, i * 7919 });
        const o = try vm.r.newObject(5);
        const h = try vm.r.newObject(1);
        try vm.objSet(value.payload(h), e.k[4], try vm.newStr(tok));
        try vm.objSet(value.payload(o), e.k[0], try vm.newStr("POST"));
        try vm.objSet(value.payload(o), e.k[1], try vm.newStr("https://api.example.com/v1/rows"));
        try vm.objSet(value.payload(o), e.k[2], h);
        try vm.objSet(value.payload(o), e.k[3], value.num(@floatFromInt(i)));
        return o;
    }
};

test "batch: every request and result reaches its own execution" {
    const gpa = std.testing.allocator;
    var e: Execs = undefined;
    try e.init(gpa);
    defer gpa.free(e.bytes);
    var out = Arena.init(&Execs.out_mem);
    var jobs: [Execs.n]EncodeJob = undefined;
    for (&jobs, 0..) |*j, i| j.* = .{ .owner = .{ .exec_id = 1000 + i, .gen = @intCast(i % 3) }, .vm = &e.vm[i], .args = try e.request(i) };
    encodeRequests(&jobs, &out);
    for (jobs, 0..) |j, i| {
        try std.testing.expect(j.ok);
        // The batch writes what JSON.stringify writes, alone.
        var b = e.s[i].builder();
        _ = try json.encode(&e.vm[i], &b, j.args, "");
        try std.testing.expectEqualStrings(b.bytes(), j.out);
        b.abandon();
        // Its own token, and no other execution's.
        var tb: [64]u8 = undefined;
        const tok = try std.fmt.bufPrint(&tb, "tok-{d}-\\\"\\\\{d}\"", .{ i, i * 7919 });
        try std.testing.expect(std.mem.indexOf(u8, j.out, tok) != null);
        for (0..Execs.n) |other| {
            if (other == i) continue;
            const ot = try std.fmt.bufPrint(&tb, "tok-{d}-", .{other});
            try std.testing.expect(std.mem.indexOf(u8, j.out, ot) == null);
        }
    }
    // Results: each execution decodes its own token into its own region.
    var payloads: [Execs.n][96]u8 = undefined;
    var djobs: [Execs.n]DecodeJob = undefined;
    for (&djobs, 0..) |*j, i| {
        const p = try std.fmt.bufPrint(&payloads[i], "{{\"status\":200,\"body\":{{\"id\":\"res-{d}\",\"n\":{d}}}}}", .{ i, i });
        j.* = .{ .owner = jobs[i].owner, .vm = &e.vm[i], .payload = p };
    }
    decodeResults(&djobs);
    for (djobs, 0..) |j, i| {
        const v = try j.result;
        const body = e.vm[i].objGet(value.payload(v), "body");
        var tb: [16]u8 = undefined;
        try std.testing.expectEqualStrings(try std.fmt.bufPrint(&tb, "res-{d}", .{i}), e.vm[i].str(e.vm[i].objGet(value.payload(body), "id")));
        // The value lives in this execution's region.
        try std.testing.expect(value.payload(v) < e.r[i].used);
    }
}

test "batch: a value it does not take is left to the caller" {
    const gpa = std.testing.allocator;
    var e: Execs = undefined;
    try e.init(gpa);
    defer gpa.free(e.bytes);
    var out = Arena.init(&Execs.out_mem);
    const vm = &e.vm[0];
    const o = try vm.r.newObject(2);
    try vm.objSet(value.payload(o), try vm.newStr("1"), value.num(1));
    var jobs = [_]EncodeJob{
        .{ .owner = .{ .exec_id = 1, .gen = 0 }, .vm = vm, .args = o },
        .{ .owner = .{ .exec_id = 2, .gen = 0 }, .vm = &e.vm[1], .args = try e.request(1) },
    };
    encodeRequests(&jobs, &out);
    try std.testing.expect(!jobs[0].ok);
    try std.testing.expect(jobs[1].ok);
}
