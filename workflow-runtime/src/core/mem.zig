//! The memory access layer of the performance model (docs/perf-model.md).
//! The core states each read and write of its data structures through these
//! functions. In the normal build they are empty and `Probe` has no size, so
//! the generated code is the plain load or store. With `-Dperf-model=true`
//! each call gives the access to the recorder (`perf.zig`).
const std = @import("std");
const perf = @import("perf.zig");
const module = @import("bytecode.zig");
const addressOf = @import("arena.zig").addressOf;

pub const enabled: bool = @import("perf_options").perf_model;

pub const Structure = perf.Structure;
const Site = perf.Site;
const Loop = perf.Loop;

/// The handle of the recorder. A region carries it, so each function that
/// has a region can state its accesses. It is `void` in the normal build.
pub const Probe = if (enabled) ?*perf.Recorder else void;

pub const none: Probe = if (enabled) null else {};

/// A function that gives the bytes of a string does not know how many of
/// them its caller reads (a length test reads none, a compare all). The
/// recorder takes one cache line: more would make an append loop quadratic.
pub const bytes_seen: usize = 64;

comptime {
    // The normal build pays nothing for the layer.
    if (!enabled) std.debug.assert(@sizeOf(Probe) == 0);
}

/// A read of `len` bytes at `ptr`.
pub inline fn rd(p: Probe, st: Structure, site: Site, ptr: anytype, len: usize) void {
    if (enabled) if (p) |rec| rec.access(st, site, .read, addressOf(ptr), len);
}

/// A write of `len` bytes at `ptr`.
pub inline fn wr(p: Probe, st: Structure, site: Site, ptr: anytype, len: usize) void {
    if (enabled) if (p) |rec| rec.access(st, site, .write, addressOf(ptr), len);
}

/// A read of the items of `slice`.
pub inline fn rdSlice(p: Probe, st: Structure, site: Site, slice: anytype) void {
    if (enabled) rd(p, st, site, slice.ptr, slice.len * @sizeOf(@TypeOf(slice[0])));
}

/// A write of the items of `slice`.
pub inline fn wrSlice(p: Probe, st: Structure, site: Site, slice: anytype) void {
    if (enabled) wr(p, st, site, slice.ptr, slice.len * @sizeOf(@TypeOf(slice[0])));
}

/// A read of a header of `size` bytes at `ptr`: one load reaches its first
/// word, and its other words are in the same lines.
pub inline fn rdHeader(p: Probe, st: Structure, site: Site, ptr: anytype, size: usize) void {
    if (enabled) if (p) |rec| {
        rec.access(st, site, .read, addressOf(ptr), 8);
        rec.access(st, .region_span, .read, addressOf(ptr) + 8, size - 8);
    };
}

/// One key of an object, read in a search for a property.
pub inline fn probeKey(p: Probe, site: Site, key: anytype) void {
    if (enabled) {
        scan(p, .key_probe, 1);
        rd(p, .obj_entries, site, key, 8);
    }
}

/// The values of `slice`, written by a copy.
pub inline fn wrValues(p: Probe, st: Structure, site: Site, slice: anytype) void {
    if (enabled) {
        wrSlice(p, st, site, slice);
        scan(p, .value_copy, slice.len);
    }
}

/// The value at `ptr`, as a recorded read.
pub inline fn load(p: Probe, st: Structure, site: Site, ptr: anytype) @TypeOf(ptr.*) {
    if (enabled) rd(p, st, site, ptr, @sizeOf(@TypeOf(ptr.*)));
    return ptr.*;
}

/// Set the value at `ptr`, as a recorded write.
pub inline fn store(p: Probe, st: Structure, site: Site, ptr: anytype, v: @TypeOf(ptr.*)) void {
    if (enabled) wr(p, st, site, ptr, @sizeOf(@TypeOf(ptr.*)));
    ptr.* = v;
}

/// The interpreter starts instruction `ins`, which is at `code`; the
/// registers of its frame start at `regs`.
pub inline fn instr(p: Probe, m: *const module.Module, ins: module.Instr, code: anytype, regs: anytype) void {
    if (enabled) if (p) |rec| rec.instr(ins, addressOf(code), addressOf(regs), addressOf(m.numbers.ptr));
}

/// The fast loop gave the last instruction to the slow path, which runs it again.
pub inline fn bail(p: Probe) void {
    if (enabled) if (p) |rec| rec.bail();
}

/// The core or the shell starts a phase of its work outside the interpreter.
pub inline fn phase(p: Probe, ph: perf.Phase) void {
    if (enabled) if (p) |rec| rec.phase(ph);
}

/// The shell makes one system call.
pub inline fn syscall(p: Probe, kind: perf.Syscall) void {
    if (enabled) if (p) |rec| rec.syscall(kind);
}

/// A new object of `size` bytes.
pub inline fn alloc(p: Probe, st: Structure, size: usize) void {
    if (enabled) if (p) |rec| rec.alloc(st, size);
}

/// A loop over `elems` elements (bytes or values) of kind `loop`.
pub inline fn scan(p: Probe, loop: Loop, elems: usize) void {
    if (enabled) if (p) |rec| rec.scan(loop, elems);
}

test "the layer has no size and no effect in the normal build" {
    if (enabled) return error.SkipZigTest;
    try std.testing.expectEqual(@as(usize, 0), @sizeOf(Probe));
    var x: u64 = 7;
    store(none, .registers, .interp_reg, &x, load(none, .registers, .interp_reg, &x) + 1);
    try std.testing.expectEqual(@as(u64, 8), x);
}
