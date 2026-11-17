//! Workload classes (docs/workload-classes.md): a small fixed set of names
//! from configuration. A workflow has one class. A class can have its own
//! shards (a shard group), and its own limits in each shard. This file is
//! the table and its pure functions: names, groups, the shard of a
//! workflow, and the decision for a new execution. It keeps no state of a
//! shard; the counters of a shard are in `core.State`.
const std = @import("std");

/// The most classes of a table.
pub const max_classes: u8 = 8;
/// The most bytes of a class name.
pub const max_name: usize = 16;
/// The class of a workflow without a class, when the table has this name.
/// A table without it uses its first class.
const default_name = "default";

pub const SetError = error{ TooManyClasses, BadName, DuplicateName, UnknownClass, BadNumber, DefaultHasNoShard };

/// The numbers that `set` reads for each class.
pub const Field = enum { shards, slots, host_steps };

/// The decision for a new execution of a class in one shard.
pub const Gate = enum {
    /// The execution starts.
    ok,
    /// The class is at its limit in this shard: 503 for this class only.
    busy,
    /// Another shard group serves the class: the router made an error.
    elsewhere,
};

/// The counters of one class in one shard.
pub const Counters = struct {
    /// Executions of the class that hold a slot now.
    in_flight: u32 = 0,
    /// Executions of the class that started.
    started: u64 = 0,
    /// Webhooks and manual runs refused at the limit of the class.
    refused: u64 = 0,
    /// Starts refused because another shard group serves the class.
    misrouted: u64 = 0,
    /// Schedule fires that waited for a slot of the class.
    deferred: u64 = 0,
};

/// The class table of a process. A value type with fixed arrays: every
/// shard holds a copy from startup, and nothing changes it later.
pub const Classes = struct {
    names: [max_classes][max_name]u8 = @splat(@splat(0)),
    name_len: [max_classes]u8 = @splat(0),
    count: u8 = 0,
    /// The class of a workflow that has none or an unknown one.
    default: u8 = 0,
    /// The shards of each class. All 0: no groups, each shard serves all.
    shards: [max_classes]u16 = @splat(0),
    /// The executions of a class that hold a slot in one shard. 0: no limit.
    slots: [max_classes]u32 = @splat(0),
    /// The host steps of a class in flight in one shard. 0: no limit.
    host_steps: [max_classes]u32 = @splat(0),
    /// `--class-serve`: this process holds the shards of one class only.
    only: ?u8 = null,

    /// Replaces the names: a list such as `critical,default,background`.
    pub fn setNames(t: *Classes, list: []const u8) SetError!void {
        var next: Classes = .{};
        var it = std.mem.splitScalar(u8, list, ',');
        while (it.next()) |raw| {
            const nm = std.mem.trim(u8, raw, " ");
            if (!validName(nm)) return error.BadName;
            if (next.find(nm) != null) return error.DuplicateName;
            if (next.count == max_classes) return error.TooManyClasses;
            @memcpy(next.names[next.count][0..nm.len], nm);
            next.name_len[next.count] = @intCast(nm.len);
            next.count += 1;
        }
        next.default = next.find(default_name) orelse 0;
        std.debug.assert(next.count >= 1 and next.default < next.count);
        t.* = next;
    }

    /// Sets one number for some classes: a list such as `critical=2,default=4`.
    pub fn set(t: *Classes, field: Field, list: []const u8) SetError!void {
        std.debug.assert(t.count >= 1 and t.count <= max_classes);
        var it = std.mem.splitScalar(u8, list, ',');
        while (it.next()) |raw| {
            const pair = std.mem.trim(u8, raw, " ");
            const eq = std.mem.indexOfScalar(u8, pair, '=') orelse return error.BadNumber;
            const c = t.find(pair[0..eq]) orelse return error.UnknownClass;
            const n = number(pair[eq + 1 ..]) orelse return error.BadNumber;
            switch (field) {
                .shards => t.shards[c] = std.math.cast(u16, n) orelse return error.BadNumber,
                .slots => t.slots[c] = n,
                .host_steps => t.host_steps[c] = n,
            }
        }
    }

    /// `--class-serve NAME`.
    pub fn serveOnly(t: *Classes, nm: []const u8) SetError!void {
        t.only = t.find(nm) orelse return error.UnknownClass;
    }

    /// The table is usable: with groups, the default class has a shard, so
    /// each class has a group.
    pub fn check(t: *const Classes) SetError!void {
        if (t.grouped() and t.shards[t.default] == 0) return error.DefaultHasNoShard;
        if (t.only) |c| if (t.groupOf(c) != c) return error.DefaultHasNoShard;
    }

    pub fn name(t: *const Classes, c: u8) []const u8 {
        std.debug.assert(c < t.count);
        return t.names[c][0..t.name_len[c]];
    }

    pub fn find(t: *const Classes, nm: []const u8) ?u8 {
        for (0..t.count) |i| {
            if (std.mem.eql(u8, t.names[i][0..t.name_len[i]], nm)) return @intCast(i);
        }
        return null;
    }

    /// The class of a workflow from the name in its load call.
    pub fn classOf(t: *const Classes, nm: ?[]const u8) u8 {
        return t.find(nm orelse return t.default) orelse t.default;
    }

    /// True when a class has its own shards.
    pub fn grouped(t: *const Classes) bool {
        for (t.shards[0..t.count]) |n| {
            if (n != 0) return true;
        }
        return false;
    }

    /// The shards of all groups.
    pub fn totalShards(t: *const Classes) u32 {
        var n: u32 = 0;
        for (t.shards[0..t.count]) |k| n += k;
        return n;
    }

    /// The class whose shards run class `c`: `c`, or the default class when
    /// `c` has no shards.
    fn groupOf(t: *const Classes, c: u8) u8 {
        std.debug.assert(c < t.count);
        return if (t.shards[c] != 0) c else t.default;
    }

    /// The first shard of the group of class `c`. Groups are consecutive
    /// ranges of shard ids, in the order of the class names.
    fn firstShard(t: *const Classes, c: u8) u16 {
        std.debug.assert(c < t.count);
        var n: u16 = 0;
        for (t.shards[0..c]) |k| n += k;
        return n;
    }

    /// The class of the group that holds shard `shard`. Null without groups.
    pub fn classOfShard(t: *const Classes, shard: u16) ?u8 {
        var end: u32 = 0;
        for (t.shards[0..t.count], 0..) |k, c| {
            end += k;
            if (shard < end) return @intCast(c);
        }
        return null;
    }

    /// The shard for a new execution of a workflow of class `c`. `hash` is
    /// `idHash` of the workflow id. Call it only with groups.
    pub fn shardFor(t: *const Classes, c: u8, hash: u64) u16 {
        const g = t.groupOf(c);
        std.debug.assert(t.shards[g] != 0);
        return t.firstShard(g) + @as(u16, @intCast(hash % t.shards[g]));
    }

    /// The class that shard `shard` of this process serves. Null: all.
    pub fn served(t: *const Classes, shard: u16) ?u8 {
        if (t.only) |c| return c;
        return t.classOfShard(shard);
    }

    /// The decision for a new execution of class `c` in shard `shard`,
    /// where `in_flight` executions of the class hold a slot.
    pub fn gate(t: *const Classes, shard: u16, c: u8, in_flight: u32) Gate {
        std.debug.assert(c < t.count);
        if (t.served(shard)) |mine| {
            if (t.groupOf(c) != mine) return .elsewhere;
        }
        if (t.slots[c] != 0 and in_flight >= t.slots[c]) return .busy;
        return .ok;
    }
};

/// The table of a runtime without classes: one class, no groups, no limits.
pub const single: Classes = blk: {
    var t: Classes = .{};
    @memcpy(t.names[0][0..default_name.len], default_name);
    t.name_len[0] = default_name.len;
    t.count = 1;
    break :blk t;
};

fn validName(nm: []const u8) bool {
    if (nm.len == 0 or nm.len > max_name) return false;
    for (nm) |ch| {
        const letter = (ch >= 'a' and ch <= 'z') or (ch >= 'A' and ch <= 'Z');
        if (!letter and !(ch >= '0' and ch <= '9') and ch != '-' and ch != '_') return false;
    }
    return true;
}

/// A decimal number of at most 9 digits.
fn number(text: []const u8) ?u32 {
    if (text.len == 0 or text.len > 9) return null;
    var n: u32 = 0;
    for (text) |ch| {
        if (ch < '0' or ch > '9') return null;
        n = n * 10 + (ch - '0');
    }
    return n;
}

/// The hash that puts a workflow in a shard of its group (FNV-1a, 64 bit).
/// A router outside the runtime computes the same number.
pub fn idHash(workflow_id: []const u8) u64 {
    var h: u64 = 0xcbf29ce484222325;
    for (workflow_id) |b| h = (h ^ b) *% 0x100000001b3;
    return h;
}
