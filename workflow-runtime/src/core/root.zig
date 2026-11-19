//! The deterministic core. It never touches I/O, clocks, threads or
//! unseeded randomness. CI rejects I/O and thread imports in this folder.
//!
//! Ordered into six subsystems: `mem -> text -> runtime -> stdlib -> vm -> sched`.
//! Each subsystem imports only subsystems before it, enforced by `tools/lint.zig`.
const mem_sub = @import("mem/root.zig");
const text_sub = @import("text/root.zig");
const runtime_sub = @import("runtime/root.zig");
const stdlib_sub = @import("stdlib/root.zig");
const vm_sub = @import("vm/root.zig");
const sched_sub = @import("sched/root.zig");

pub const value = mem_sub.value;
pub const heap = mem_sub.heap;
pub const arena = mem_sub.arena;
pub const mem = mem_sub.mem;
pub const perf = mem_sub.perf;
pub const numfmt = text_sub.numfmt;
pub const module = vm_sub.module;
pub const ops = runtime_sub.ops;
pub const json = runtime_sub.json;
/// The scalar codec that `json` replaced: the reference of tests and benchmarks.
pub const json_ref = runtime_sub.json_ref;
pub const columns = runtime_sub.columns;
pub const batch = runtime_sub.batch;
pub const lib = stdlib_sub.lib;
pub const interp = vm_sub.interp;
pub const aot = vm_sub.aot;
pub const exec_index = sched_sub.exec_index;
pub const held = sched_sub.held;
pub const asm_ = vm_sub.asm_;
pub const core = sched_sub.core;
pub const exactnum = text_sub.exactnum;
pub const logfmt = sched_sub.logfmt;
pub const cron = text_sub.cron;
pub const workload = sched_sub.workload;
pub const tz = text_sub.tz;
pub const multipart = runtime_sub.multipart;
pub const regex = text_sub.regex;
pub const json_error = text_sub.json_error;
pub const normalize = text_sub.normalize;
pub const collate = text_sub.collate;
pub const binary_names = text_sub.binary_names;
pub const mime_tables = text_sub.mime_tables;
pub const cred_flags = text_sub.cred_flags;
// Wire codecs now live in src/wire/. Shell consumers import them directly
// as @import("wire").<name>; core consumers use the forwarding wrapper in
// src/core/text/numfmt.zig or import @import("wire") directly when needed.

test {
    @import("std").testing.refAllDecls(@This());
    _ = @import("json_test.zig");
    _ = @import("batch_test.zig");
    _ = @import("columns_test.zig");
    _ = @import("interp_test.zig");
    _ = @import("schedule_test.zig");
    _ = @import("workflow_test.zig");
    _ = @import("workload_test.zig");
    _ = @import("held_test.zig");
    _ = runtime_sub.multipart;
    _ = @import("fuzz_test.zig");
    _ = text_sub.textcodec;
    _ = sched_sub.static_data;
    _ = text_sub.cred_flags;
}
