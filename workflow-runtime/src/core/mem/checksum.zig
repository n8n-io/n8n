//! XXH3-64 folded to 32 bits: the checksum of a log record body. Pure, so
//! both `logfmt.zig` and the core can import it without a cycle.
const std = @import("std");

/// The checksum of a record body: torn and corrupt records stop the reader.
pub fn checksum(body: []const u8) u32 {
    const h = std.hash.XxHash3.hash(0, body);
    return @truncate(h ^ (h >> 32));
}
