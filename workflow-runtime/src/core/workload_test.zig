//! Tests of the workload class table (`workload.zig`).
const std = @import("std");
const workload = @import("sched/workload.zig");
const Classes = workload.Classes;
const Gate = workload.Gate;
const single = workload.single;
const idHash = workload.idHash;

const testing = std.testing;

fn three() !Classes {
    var t = single;
    try t.setNames("critical,default,background");
    try t.set(.shards, "critical=2,default=4,background=1");
    try t.check();
    return t;
}

test "names, the default class and bad lists" {
    var t = single;
    try testing.expectEqualStrings("default", t.name(0));
    try testing.expect(!t.grouped());
    try t.setNames("critical, default ,background");
    try testing.expectEqual(@as(u8, 3), t.count);
    try testing.expectEqual(@as(u8, 1), t.default);
    try testing.expectEqual(@as(u8, 2), t.classOf("background"));
    try testing.expectEqual(@as(u8, 1), t.classOf(null));
    try testing.expectEqual(@as(u8, 1), t.classOf("no-such-class"));
    try testing.expectError(error.DuplicateName, t.setNames("a,a"));
    try testing.expectError(error.BadName, t.setNames("a,,b"));
    try testing.expectError(error.BadName, t.setNames("a name"));
    try testing.expectError(error.TooManyClasses, t.setNames("a,b,c,d,e,f,g,h,i"));
    try testing.expectError(error.UnknownClass, t.set(.slots, "bulk=4"));
    try testing.expectError(error.BadNumber, t.set(.slots, "critical"));
    // A failed list leaves the table as it was.
    try testing.expectEqual(@as(u8, 3), t.count);
    try t.setNames("fast,slow");
    try testing.expectEqual(@as(u8, 0), t.default);
    try t.set(.shards, "slow=1");
    try testing.expectError(error.DefaultHasNoShard, t.check());
}

test "a workflow of one class never lands on a shard of another" {
    const t = try three();
    try testing.expectEqual(@as(u32, 7), t.totalShards());
    var seen: [7]u32 = @splat(0);
    var buf: [24]u8 = @splat(0);
    for (0..3000) |i| {
        const id = try std.fmt.bufPrint(&buf, "wf-{d}", .{i});
        const c: u8 = @intCast(i % 3);
        const shard = t.shardFor(c, idHash(id));
        try testing.expectEqual(c, t.classOfShard(shard).?);
        // The shard accepts its own class and refuses each other class.
        for (0..3) |other| {
            const want: Gate = if (other == c) .ok else .elsewhere;
            try testing.expectEqual(want, t.gate(shard, @intCast(other), 0));
        }
        seen[shard] += 1;
    }
    // Each shard of each group gets work: 2 + 4 + 1.
    for (seen) |n| try testing.expect(n > 0);
    try testing.expectEqual(@as(u32, 1000), seen[0] + seen[1]);
    try testing.expectEqual(@as(u32, 1000), seen[6]);
}

test "a class without shards runs in the group of the default class" {
    var t = single;
    try t.setNames("critical,default,background");
    try t.set(.shards, "critical=1,default=2");
    try t.check();
    const shard = t.shardFor(2, idHash("wf"));
    try testing.expectEqual(@as(u8, 1), t.classOfShard(shard).?);
    try testing.expectEqual(Gate.ok, t.gate(shard, 2, 0));
    try testing.expectEqual(Gate.elsewhere, t.gate(0, 2, 0));
    // A process for one class: `--class-serve`.
    try t.serveOnly("critical");
    try t.check();
    try testing.expectEqual(Gate.ok, t.gate(0, 0, 0));
    try testing.expectEqual(Gate.elsewhere, t.gate(0, 1, 0));
    try testing.expectError(error.UnknownClass, t.serveOnly("bulk"));
}

test "the slot limit of a class refuses that class only" {
    var t = single;
    try t.setNames("critical,default,background");
    try t.set(.slots, "background=2");
    try testing.expectEqual(Gate.ok, t.gate(0, 2, 1));
    try testing.expectEqual(Gate.busy, t.gate(0, 2, 2));
    try testing.expectEqual(Gate.ok, t.gate(0, 0, 1 << 20));
    try testing.expectEqual(Gate.ok, t.gate(0, 1, 1 << 20));
}

test "a class change sends new executions to the new group" {
    const t = try three();
    const h = idHash("orders");
    const before = t.shardFor(t.classOf("critical"), h);
    const after = t.shardFor(t.classOf("background"), h);
    try testing.expect(before < 2);
    try testing.expectEqual(@as(u16, 6), after);
    // The same class and id give the same shard each time.
    try testing.expectEqual(before, t.shardFor(0, h));
}
