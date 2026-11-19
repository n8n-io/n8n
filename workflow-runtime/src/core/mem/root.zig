//! Memory, value, bytecode layout, and performance-model foundation for the
//! deterministic core. Other core subsystems may import these files directly.
pub const arena = @import("arena.zig");
pub const checksum = @import("checksum.zig");
pub const value = @import("value.zig");
pub const bytecode = @import("bytecode.zig");
pub const perf = @import("perf.zig");
pub const mem = @import("mem.zig");
pub const heap = @import("heap.zig");
