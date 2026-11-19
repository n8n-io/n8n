//! Shared runtime limits and constants used across layers.
//! This module imports nothing, so it can be used by every other layer.

pub const Limits = struct {
    /// Maximum call depth per fibre before the execution stops with a limit.
    call_depth: u32 = 256,
    /// Maximum number of fibres in one execution.
    fibres: u32 = 64,
    /// Maximum fuel (instruction count) per execution.
    fuel_total: u64 = 50_000_000,
    /// Run the compiled form of a function when the module has one
    /// (`aot.zig`). The results, the region and the fuel are the same.
    aot: bool = true,
};

test {
    @import("std").testing.refAllDecls(@This());
}