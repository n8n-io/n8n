//! A 32-bit generation-checked handle for pool rows. The low 16 bits are
//! the row index, the high 16 bits are a generation counter that wraps.
//! Two sentinel values reserve the top two encodings: no row index of
//! 0xFFFF or 0xFFFE is valid.
//!
//! `Tag` is a phantom marker type. Two different pool handle types cannot
//! be accidentally mixed at compile time.
const std = @import("std");

/// A packed generation-checked handle. `Tag` is a phantom marker: two
/// handles with different tags are incompatible.
pub fn Handle(comptime Tag: type) type {
    return enum(u32) {
        /// No row: the zero value of a slot.
        none = std.math.maxInt(u32),
        /// A reserved handle that has no row yet.
        pending = std.math.maxInt(u32) - 1,
        _,

        /// The phantom marker. Two Handle types with different Tags are incompatible.
        pub const Marker = Tag;

        const Self = @This();

        /// Pack a row index and generation into a handle.
        pub fn of(row: u16, gen: u16) Self {
            // The two sentinel values have the rows 0xFFFF and 0xFFFE.
            std.debug.assert(row < std.math.maxInt(u16) - 1);
            return @enumFromInt(@as(u32, gen) << 16 | row);
        }

        /// The row index in the low 16 bits.
        pub fn index(h: Self) u16 {
            return @truncate(@intFromEnum(h));
        }

        /// The generation in the high 16 bits.
        pub fn generation(h: Self) u16 {
            return @truncate(@intFromEnum(h) >> 16);
        }

        /// True when the handle matches a row at the given generation.
        pub fn matches(h: Self, row: u16, gen: u16) bool {
            return h.index() == row and h.generation() == gen;
        }

        /// The next generation, wrapping safely below the sentinel values.
        pub fn nextGen(gen: u16) u16 {
            const n = gen +% 1;
            return if (n >= std.math.maxInt(u16) - 1) 0 else n;
        }
    };
}

const t = std.testing;

test "of index generation round-trip" {
    const H = Handle(struct {});
    for ([_]u16{ 0, 255, 1024, 65533 }) |row| {
        for ([_]u16{ 0, 128, 65533 }) |gen| {
            const h = H.of(row, gen);
            try t.expectEqual(row, h.index());
            try t.expectEqual(gen, h.generation());
        }
    }
}

test "none and pending sentinels" {
    const H = Handle(struct {});
    try t.expectEqual(@as(u32, std.math.maxInt(u32)), @intFromEnum(H.none));
    try t.expectEqual(@as(u32, std.math.maxInt(u32) - 1), @intFromEnum(H.pending));
    try t.expect(H.none.index() >= std.math.maxInt(u16) - 1);
    try t.expect(H.pending.index() >= std.math.maxInt(u16) - 1);
}

test "matches" {
    const H = Handle(struct {});
    const h = H.of(42, 7);
    try t.expect(h.matches(42, 7));
    try t.expect(!h.matches(42, 8));
    try t.expect(!h.matches(41, 7));
    try t.expect(!H.none.matches(42, 7));
}

test "nextGen wraps safely" {
    const H = Handle(struct {});
    try t.expectEqual(@as(u16, 1), H.nextGen(0));
    try t.expectEqual(@as(u16, 100), H.nextGen(99));
    // Wraps below the sentinel values.
    const hi = std.math.maxInt(u16) - 2;
    try t.expectEqual(@as(u16, 0), H.nextGen(hi));
    // Still below sentinels after wrap.
    try t.expect(H.of(0, 0).index() < std.math.maxInt(u16) - 1);
}

test "two tags are incompatible" {
    const A = Handle(struct {});
    const B = Handle(struct {});
    const a = A.of(1, 2);
    const b = B.of(1, 2);
    // Same backing integer, but different types.
    try t.expectEqual(@as(u32, @intFromEnum(a)), @as(u32, @intFromEnum(b)));
    // The marker types differ.
    try t.expect(A.Marker != B.Marker);
}