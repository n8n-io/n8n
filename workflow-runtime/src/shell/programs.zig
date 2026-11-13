//! Hand-assembled workflows for the simulation and the benchmarks. They do
//! not need the TypeScript compiler, so the runtime can be tested alone.
const std = @import("std");
const core_lib = @import("core");
const Asm = core_lib.asm_.Asm;
const EK = core_lib.module.EffectKind;

const sync_meta = "{\"durability\":\"sync\"}";

/// `obj = { cid: R1, <key>: R[val] }` into register `dst`.
fn objWithCid(a: *Asm, dst: u16, key: ?[]const u8, val: u16) !void {
    try a.emit(.newobj, 0, dst, 0, 0);
    try a.emit(.setprop, 0, dst, try a.str("cid"), 1);
    if (key) |k| try a.emit(.setprop, 0, dst, try a.str(k), val);
}

fn effect(a: *Asm, kind: EK, step_idx: u16, dst: u16, args: u16, tmp: u16) !void {
    try a.emitBc(.loadi, tmp, step_idx);
    try a.emit(.@"suspend", @backingInt(kind), dst, tmp, args);
}

/// for i < n: acc += (await Check({cid, i})).v; then Charge({cid, acc}).
pub fn loop(gpa: std.mem.Allocator, meta: ?[]const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const check = try a.step("Check", .node);
    a.steps.items[check].idempotent = 1;
    const charge = try a.step("Charge", .node);
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("cid"));
    try a.emit(.getprop, 0, 2, 0, try a.str("n"));
    try a.emitBc(.loadi, 3, 0);
    try a.emitBc(.loadi, 4, 0);
    const top = a.pc();
    try a.emit(.lt, 0, 5, 4, 2);
    const jf = a.pc();
    try a.emitBc(.jf, 5, 0);
    try objWithCid(&a, 6, "i", 4);
    try effect(&a, .node, check, 8, 6, 7);
    try a.emit(.getprop, 0, 9, 8, try a.str("v"));
    try a.emit(.add, 0, 3, 3, 9);
    try a.emitBc(.loadi, 10, 1);
    try a.emit(.add, 0, 4, 4, 10);
    try a.emitBc(.jmp, 0, top);
    a.patchBc(jf, a.pc());
    try objWithCid(&a, 6, "acc", 3);
    try effect(&a, .node, charge, 8, 6, 7);
    try objWithCid(&a, 11, "acc", 3);
    try a.emit(.getprop, 0, 9, 8, try a.str("v"));
    try a.emit(.setprop, 0, 11, try a.str("charge"), 9);
    try a.emit(.ret, 0, 11, 0, 0);
    try a.endFunc("run", 1, 12, 0);
    return a.finish();
}

/// Promise.all over two branches of one step.
pub fn fork(gpa: std.mem.Allocator, meta: ?[]const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const branch = try a.step("Branch", .node);
    a.steps.items[branch].idempotent = 1;
    // Function 0 must be run; branch is function 1. Emit run first.
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("cid"));
    try a.emit(.closure, 0, 2, 1, 0);
    try a.emitBc(.loadi, 3, 1);
    try objWithCid(&a, 4, "b", 3);
    try a.emit(.fork, 0, 5, 2, 4);
    try a.emitBc(.loadi, 3, 2);
    try objWithCid(&a, 6, "b", 3);
    try a.emit(.fork, 0, 7, 2, 6);
    try a.emit(.newarr, 0, 8, 0, 0);
    try a.emit(.push, 0, 8, 5, 0);
    try a.emit(.push, 0, 8, 7, 0);
    try a.emit(.join, 0, 9, 8, 0);
    try objWithCid(&a, 10, "branches", 9);
    try a.emit(.ret, 0, 10, 0, 0);
    try a.endFunc("run", 1, 11, 0);
    a.beginFunc();
    try effect(&a, .node, branch, 2, 0, 1);
    try a.emit(.getprop, 0, 3, 2, try a.str("v"));
    try a.emit(.ret, 0, 3, 0, 0);
    try a.endFunc("branch", 1, 4, 0);
    return a.finish();
}

/// An approval, then Ship when approved.
pub fn approval(gpa: std.mem.Allocator, meta: ?[]const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const ask = try a.step("Ask", .approval);
    const ship = try a.step("Ship", .node);
    a.steps.items[ship].idempotent = 1;
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("cid"));
    try objWithCid(&a, 2, null, 0);
    try effect(&a, .approval, ask, 3, 2, 4);
    try a.emit(.getprop, 0, 5, 3, try a.str("approved"));
    const jf = a.pc();
    try a.emitBc(.jf, 5, 0);
    try effect(&a, .node, ship, 6, 2, 4);
    a.patchBc(jf, a.pc());
    try objWithCid(&a, 7, "approved", 5);
    try a.emit(.ret, 0, 7, 0, 0);
    try a.endFunc("run", 1, 8, 0);
    return a.finish();
}

/// A long wait (evicted), then a non-idempotent effect.
pub fn waitThen(gpa: std.mem.Allocator, meta: ?[]const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const sleep = try a.step("Sleep", .wait);
    const after = try a.step("After", .node);
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("cid"));
    try a.emit(.newobj, 0, 2, 0, 0);
    try a.emitBc(.loadk, 3, try a.number(5000));
    try a.emit(.setprop, 0, 2, try a.str("duration"), 3);
    try effect(&a, .wait, sleep, 4, 2, 5);
    try objWithCid(&a, 2, null, 0);
    try effect(&a, .node, after, 6, 2, 5);
    try a.emit(.getprop, 0, 7, 6, try a.str("v"));
    try objWithCid(&a, 8, "after", 7);
    try a.emit(.ret, 0, 8, 0, 0);
    try a.endFunc("run", 1, 9, 0);
    return a.finish();
}

/// try { Flaky } catch { Fallback }.
pub fn tryCatch(gpa: std.mem.Allocator, meta: ?[]const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const flaky = try a.step("Flaky", .node);
    const fallback = try a.step("Fallback", .node);
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("cid"));
    try objWithCid(&a, 2, null, 0);
    const t0 = a.pc();
    try effect(&a, .node, flaky, 3, 2, 4);
    try a.emit(.getprop, 0, 5, 3, try a.str("v"));
    try objWithCid(&a, 6, "flaky", 5);
    try a.emit(.ret, 0, 6, 0, 0);
    const handler = a.pc();
    try a.addTry(t0, handler, handler, 7);
    try effect(&a, .node, fallback, 3, 2, 4);
    try a.emit(.getprop, 0, 5, 3, try a.str("v"));
    try objWithCid(&a, 6, "fallback", 5);
    try a.emit(.ret, 0, 6, 0, 0);
    try a.endFunc("run", 1, 8, 0);
    return a.finish();
}

/// W1 glue: five blocks of pure computation over a ~1 KB trigger, no I/O.
pub fn glue(gpa: std.mem.Allocator, meta: ?[]const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    a.beginFunc();
    // 1: read fields.
    try a.emit(.getprop, 0, 1, 0, try a.str("order"));
    try a.emit(.getprop, 0, 2, 1, try a.str("id"));
    try a.emit(.getprop, 0, 3, 1, try a.str("items"));
    // 2: sum quantity * price over items.
    try a.emitBc(.loadi, 4, 0);
    try a.emitBc(.loadi, 5, 0);
    try a.emit(.getprop, 0, 6, 3, try a.str("length"));
    const top = a.pc();
    try a.emit(.lt, 0, 7, 5, 6);
    const jf = a.pc();
    try a.emitBc(.jf, 7, 0);
    try a.emit(.getelem, 0, 8, 3, 5);
    try a.emit(.getprop, 0, 9, 8, try a.str("qty"));
    try a.emit(.getprop, 0, 10, 8, try a.str("price"));
    try a.emit(.mul, 0, 9, 9, 10);
    try a.emit(.add, 0, 4, 4, 9);
    try a.emitBc(.loadi, 10, 1);
    try a.emit(.add, 0, 5, 5, 10);
    try a.emitBc(.jmp, 0, top);
    a.patchBc(jf, a.pc());
    // 3: classify.
    try a.emitBc(.loadi, 11, 100);
    try a.emit(.gt, 0, 12, 4, 11);
    // 4: build a label with a string method.
    try a.emitBc(.loads, 13, try a.str("order-"));
    try a.emit(.add, 0, 13, 13, 2);
    try a.emit(.callm, 0, 14, try a.str("toUpperCase"), 13);
    // 5: build the result.
    try a.emit(.newobj, 0, 15, 0, 0);
    try a.emit(.setprop, 0, 15, try a.str("label"), 14);
    try a.emit(.setprop, 0, 15, try a.str("total"), 4);
    try a.emit(.setprop, 0, 15, try a.str("large"), 12);
    try a.emit(.ret, 0, 15, 0, 0);
    try a.endFunc("run", 1, 16, 0);
    return a.finish();
}

pub const Upstream = enum { none, http, fallback_code };

/// W2 / W3 / W4: reply with the trigger body's id, after one upstream call.
/// W3 calls the stub over native HTTP; W4 makes the call a code step that
/// runs in the Node.js fallback host.
pub fn webhookReply(gpa: std.mem.Allocator, meta: ?[]const u8, upstream: Upstream) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const call = try a.step("Call", if (upstream == .fallback_code) .code else .http);
    a.steps.items[call].idempotent = 1;
    // The program reads only `status` of the result and `body.id` of the
    // trigger: what the compiler proves for it.
    if (upstream == .http) a.steps.items[call].flags = core_lib.module.step_flag_result_headers_unread | core_lib.module.step_flag_result_body_unread;
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("body"));
    try a.emit(.getprop, 0, 2, 1, try a.str("id"));
    try a.emit(.newobj, 0, 3, 0, 0);
    try a.emit(.setprop, 0, 3, try a.str("id"), 2);
    switch (upstream) {
        .none => {},
        .http => {
            try a.emit(.newobj, 0, 4, 0, 0);
            try a.emitBc(.loads, 5, try a.str("GET"));
            try a.emit(.setprop, 0, 4, try a.str("method"), 5);
            try a.emitBc(.loads, 5, try a.str("http://127.0.0.1:19090/stub"));
            try a.emit(.setprop, 0, 4, try a.str("url"), 5);
            try effect(&a, .http, call, 6, 4, 7);
            try a.emit(.getprop, 0, 8, 6, try a.str("status"));
            try a.emit(.setprop, 0, 3, try a.str("upstream"), 8);
        },
        .fallback_code => {
            try a.emit(.newobj, 0, 4, 0, 0);
            try a.emitBc(.loads, 5, try a.str("Call"));
            try a.emit(.setprop, 0, 4, try a.str("name"), 5);
            try a.emitBc(.loads, 5, try a.str("return [{ status: 200 }]"));
            try a.emit(.setprop, 0, 4, try a.str("code"), 5);
            try effect(&a, .code, call, 6, 4, 7);
            try a.emitBc(.loadi, 9, 0);
            try a.emit(.getelem, 0, 8, 6, 9);
            try a.emit(.getprop, 0, 8, 8, try a.str("status"));
            try a.emit(.setprop, 0, 3, try a.str("upstream"), 8);
        },
    }
    try a.emit(.setprop, 0, 3, try a.str("ok"), 2);
    try a.emit(.ret, 0, 3, 0, 0);
    try a.endFunc("run", 1, 10, 0);
    return a.finish();
}

/// A schedule trigger that fires every second: one non-idempotent Tick per
/// slot, so a slot that fires twice shows up as an effect applied twice.
pub fn everySecond(gpa: std.mem.Allocator, meta: ?[]const u8) ![]u8 {
    var a: Asm = .{ .gpa = gpa, .meta = meta };
    defer a.deinit();
    const tick = try a.step("Tick", .node);
    a.beginFunc();
    try a.emit(.getprop, 0, 1, 0, try a.str("scheduledAt"));
    try a.emit(.newobj, 0, 2, 0, 0);
    try a.emit(.setprop, 0, 2, try a.str("at"), 1);
    try effect(&a, .node, tick, 3, 2, 4);
    try a.emit(.getprop, 0, 5, 3, try a.str("v"));
    try a.emit(.setprop, 0, 2, try a.str("tick"), 5);
    try a.emit(.ret, 0, 2, 0, 0);
    try a.endFunc("run", 1, 6, 0);
    return a.finish();
}

pub const schedule_meta = "{\"durability\":\"sync\",\"triggers\":[{\"kind\":\"schedule\",\"cron\":\"* * * * * *\",\"timezone\":\"UTC\"}]}";

pub const sim_programs = [_]*const fn (std.mem.Allocator, ?[]const u8) anyerror![]u8{ loop, fork, approval, waitThen, tryCatch };

pub fn simMeta() []const u8 {
    return sync_meta;
}
