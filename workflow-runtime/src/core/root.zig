//! The deterministic core. It never touches I/O, clocks, threads or
//! unseeded randomness. CI rejects I/O and thread imports in this folder.
pub const value = @import("value.zig");
pub const heap = @import("heap.zig");
pub const arena = @import("arena.zig");
pub const numfmt = @import("numfmt.zig");
pub const module = @import("module.zig");
pub const ops = @import("ops.zig");
pub const json = @import("json.zig");
/// The scalar codec that `json` replaced: the reference of tests and benchmarks.
pub const json_ref = @import("json_ref.zig");
pub const columns = @import("columns.zig");
pub const batch = @import("batch.zig");
pub const lib = @import("lib.zig");
pub const interp = @import("interp.zig");
pub const aot = @import("aot.zig");
pub const exec_index = @import("exec_index.zig");
pub const asm_ = @import("asm.zig");
pub const core = @import("core.zig");
pub const exactnum = @import("exactnum.zig");
pub const logfmt = @import("logfmt.zig");
pub const cron = @import("cron.zig");
pub const tz = @import("tz.zig");
pub const multipart = @import("multipart.zig");
pub const regex = @import("regex.zig");
pub const json_error = @import("json_error.zig");
pub const normalize = @import("normalize.zig");
pub const collate = @import("collate.zig");

test {
    @import("std").testing.refAllDecls(@This());
    _ = @import("interp_test.zig");
    _ = @import("schedule_test.zig");
    _ = @import("workflow_test.zig");
    _ = @import("multipart.zig");
    _ = @import("fuzz_test.zig");
    _ = @import("textcodec.zig");
    _ = @import("static_data.zig");
}
