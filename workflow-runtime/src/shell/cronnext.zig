//! `wfrt cron-next <cases.json>`: the next slots of cron expressions, for
//! the differential test against the `cron` npm package
//! (`packages/@n8n/workflow-lang/scripts/cron-diff.ts`).
//! Input: `[{ "expr", "tz", "after": ms, "n" }]`. Output: one JSON array of
//! slot arrays; a case whose expression does not parse gives `null`.
const std = @import("std");
const core_lib = @import("core");
const cron = core_lib.cron;
const tz = core_lib.tz;
const triggers = @import("triggers.zig");

pub fn run(gpa: std.mem.Allocator, input: []const u8, out: *std.Io.Writer) !void {
    var arena_state = std.heap.ArenaAllocator.init(gpa);
    defer arena_state.deinit();
    const a = arena_state.allocator();
    const cases = try std.json.parseFromSliceLeaky(std.json.Value, a, input, .{});
    if (cases != .array) return error.BadInput;
    var zones = std.StringHashMap(*tz.Zone).init(a);
    try out.writeAll("[");
    for (cases.array.items, 0..) |c, i| {
        if (i > 0) try out.writeAll(",\n");
        const expr = c.object.get("expr").?.string;
        const name = c.object.get("tz").?.string;
        var after: i64 = c.object.get("after").?.integer;
        const n: usize = @intCast(c.object.get("n").?.integer);
        const spec = cron.parse(expr) catch {
            try out.writeAll("null");
            continue;
        };
        const zone = zones.get(name) orelse blk: {
            const z = try a.create(tz.Zone);
            if (std.mem.eql(u8, name, "UTC")) z.* = tz.utc() else {
                const payload = try triggers.zonePayload(a, name);
                z.* = .{};
                tz.setName(z, name);
                try tz.parseTzif(payload[name.len + 1 ..], z);
            }
            try zones.put(name, z);
            break :blk z;
        };
        try out.writeAll("[");
        var k: usize = 0;
        while (k < n) : (k += 1) {
            const slot = cron.nextSlot(&spec, after, zone) orelse break;
            if (k > 0) try out.writeAll(",");
            try out.print("{d}", .{slot});
            after = slot;
        }
        try out.writeAll("]");
    }
    try out.writeAll("]\n");
}
