//! JSON encode and decode between region values and bytes, with the
//! semantics of JSON.stringify and JSON.parse. Text that is not UTF-8
//! decodes as U+FFFD, one for each bad byte, as Node.js decodes it. Both
//! directions use explicit stacks with a fixed depth, never recursion.
//!
//! The codec is in `simd_json.zig` (vector scans, bottom-up building). The
//! scalar codec it replaced is `json_ref.zig`; `json_test.zig` compares the
//! two on fixed documents and under the fuzzer.
const value = @import("../mem/value.zig");
const ops = @import("ops.zig");
const fast = @import("simd_json.zig");
const access = @import("../mem/mem.zig");
const Builder = @import("../mem/arena.zig").Builder;
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

pub const DecodeError = fast.DecodeError;

/// Append JSON.stringify(v) to `b`. Returns false when the result is
/// `undefined` (v is undefined or a function).
pub fn encode(vm: *Vm, b: *Builder, v: Value, indent: []const u8) Err!bool {
    if (!access.enabled) return fast.encode(vm, b, v, indent);
    const start = b.len;
    const wrote = try fast.encode(vm, b, v, indent);
    if (access.enabled) access.wrSlice(vm.r.probe, .json_out, .json_encode, b.bytes()[start..]);
    if (access.enabled) access.scan(vm.r.probe, .json_emit, b.len - start);
    return wrote;
}

pub fn writeString(b: *Builder, s: []const u8) Err!void {
    return fast.writeString(b, s);
}

/// Parse `src` into a region value. A syntax error returns error.Syntax.
pub fn decode(vm: *Vm, src: []const u8) DecodeError!Value {
    if (access.enabled) access.rdSlice(vm.r.probe, .json_in, .json_decode, src);
    if (access.enabled) access.scan(vm.r.probe, .json_scan, src.len);
    return fast.decode(vm, src);
}
